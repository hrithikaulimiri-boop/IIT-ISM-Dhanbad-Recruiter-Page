<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Declaration;
use App\Models\Eligibility;
use App\Models\JobProfile;
use App\Models\JobStage;
use App\Models\RecruitmentCycle;
use App\Models\Salary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $user = auth('api')->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }
        $query = JobProfile::with(['salary', 'eligibility', 'declaration', 'company']);
        
        if ($user->role === 'recruiter') {
            $query->where('company_id', $user->company_id);
        }

        // Filter by job_type (JNF/INF)
        if ($request->has('job_type')) {
            $query->where('job_type', $request->get('job_type'));
        }

        // Filter by status if provided (e.g., 'submitted' vs 'draft')
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 200);

        return response()->json($query->paginate($perPage));
    }

    public function show($id)
    {
        $user = auth('api')->user();
        $job = JobProfile::with(['salary', 'eligibility', 'declaration', 'stages', 'duplicates'])->findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($job);
    }

    public function store(Request $request)
    {
        $user = auth('api')->user();
        
        // Inject company_id for recruiters before validation
        if ($user->role === 'recruiter') {
            $request->merge(['company_id' => $user->company_id]);
        }

        $isDraft = $request->get('status') === 'draft' || $request->get('status') === 'pending';
        
        $rules = [
            'job_id' => 'nullable|exists:job_profile,job_id',
            'company_id' => 'required|exists:company,company_id',
            'cycle_id' => $isDraft ? 'nullable|exists:recruitment_cycle,cycle_id' : 'required|exists:recruitment_cycle,cycle_id',
            'job_type' => 'required|in:INF,JNF',
            'profile_name' => $isDraft ? 'nullable|string|max:255' : 'required|string|max:255',
            'job_designation' => 'nullable|string|max:255',
            'description' => $isDraft ? 'nullable|string' : 'required|string',
            'location' => ($isDraft || $request->work_mode === 'online') ? 'nullable|string|max:255' : 'required|string|max:255',
            'work_mode' => $isDraft ? 'nullable|in:online,offline,hybrid' : 'required|in:online,offline,hybrid',
            'offline_job_location' => (!$isDraft && $request->work_mode === 'offline') ? 'required|string|max:500' : 'nullable|string|max:500',
            'expected_hires' => 'nullable|string',
            'required_skills' => 'nullable|array',
            'job_categories' => $isDraft ? 'nullable|array' : 'required|array|min:1',
            'training_period' => 'nullable|string',
            'bond' => 'nullable|string',
            'registration_link' => 'nullable|string',
            'joining_month' => 'nullable|string',
            'onboarding_procedure' => 'nullable|string',
            'additional_info' => 'nullable|string|max:1000',
            'status' => 'required|in:draft,pending,submitted',
            'last_completed_step' => 'required|integer|min:0|max:4',
            'has_psychometric_test' => 'nullable|boolean',
            'has_medical_test' => 'nullable|boolean',
            'other_screening_details' => 'nullable|string',
            
            // Salary
            'salary.currency' => $isDraft ? 'nullable|string|max:10' : 'required|string|max:10',
            'salary.different_structure_per_programme' => 'nullable|boolean',
            'salary.salaries_json' => 'nullable|array',
            'salary.additional_components' => 'nullable|array',
            'salary.stipend' => $isDraft ? 'nullable|numeric' : 'required_if:job_type,INF|nullable|numeric|min:0',
            'salary.internship_duration' => $isDraft ? 'nullable|string' : 'required_if:job_type,INF|nullable|string',
            
            // Eligibility
            'eligibility.global_min_cgpa' => 'nullable|numeric|min:0|max:10',
            'eligibility.global_max_backlogs' => 'nullable|integer|min:0',
            'eligibility.high_school_percentage' => 'nullable|numeric|min:0|max:100',
            'eligibility.gender_filter' => 'nullable|in:All,Male,Female,Others',
            'eligibility.disciplines_json' => $isDraft ? 'nullable|array' : 'required|array|min:1',
            
            // Declaration
            'declaration.agreed' => $isDraft ? 'nullable|boolean' : 'required|accepted',
            'declaration.aipc_guidelines' => $isDraft ? 'nullable|array' : 'required|array',
            'declaration.authorised_signatory_name' => $isDraft ? 'nullable|string' : 'required|string',
            'declaration.authorised_signatory_designation' => $isDraft ? 'nullable|string' : 'required|string',
            'declaration.authorised_signatory_date' => $isDraft ? 'nullable|date' : 'required|date',
            'declaration.typed_signature' => $isDraft ? 'nullable|string' : 'required|string',
            'declaration.rti_nirf_consent' => 'nullable|boolean',
            
            // Stages
            'stages' => $isDraft ? 'nullable|array' : 'required|array|min:1',
            'stages.*.stage_id' => 'required|exists:hiring_stage,stage_id',
            'stages.*.sequence' => 'required|integer|min:1',
            'stages.*.duration' => 'nullable|string',
            'stages.*.selection_mode' => 'nullable|string',
            'stages.*.test_type' => 'nullable|string',
            'stages.*.interview_mode' => 'nullable|string',
            'stages.*.infrastructure_requirements' => 'nullable|string',
        ];

        $data = $request->validate($rules);

        if (!$isDraft) {
            $this->assertDisciplinesMatchCourses($data['eligibility']['disciplines_json']);
            $this->assertAipcGuidelinesComplete($data['declaration']['aipc_guidelines'] ?? [], $data['job_type']);
        }

        if ($user->role === 'recruiter') {
            $data['company_id'] = $user->company_id;
        }

        $payload = DB::transaction(function () use ($data, $user, $isDraft) {
            $jobId = $data['job_id'] ?? null;
            
            // For drafts, if cycle_id is missing, pick the first active one
            $cycleId = $data['cycle_id'] ?? null;
            if (!$cycleId) {
                $cycleId = RecruitmentCycle::where('is_active', true)->first()?->cycle_id 
                         ?? RecruitmentCycle::first()?->cycle_id;
            }

            $jobData = [
                'company_id' => $data['company_id'],
                'cycle_id' => $cycleId,
                'job_type' => $data['job_type'],
                'status' => $data['status'],
                'last_completed_step' => $data['last_completed_step'],
                'profile_name' => $data['profile_name'] ?? 'Untitled Profile',
                'job_designation' => $data['job_designation'] ?? null,
                'place_of_posting' => $data['place_of_posting'] ?? null,
                'description' => $data['description'] ?? '',
                'location' => $data['location'] ?? '',
                'work_mode' => $data['work_mode'] ?? 'offline',
                'offline_job_location' => ($data['work_mode'] ?? 'offline') === 'offline' ? ($data['offline_job_location'] ?? null) : null,
                'expected_hires' => $data['expected_hires'] ?? null,
                'min_hires' => $data['min_hires'] ?? null,
                'required_skills' => $data['required_skills'] ?? [],
                'training_period' => $data['training_period'] ?? null,
                'bond' => $data['bond'] ?? null,
                'registration_link' => $data['registration_link'] ?? null,
                'joining_month' => $data['joining_month'] ?? null,
                'onboarding_procedure' => $data['onboarding_procedure'] ?? null,
                'additional_info' => $data['additional_info'] ?? null,
                'additional_info_1000' => $data['additional_info_1000'] ?? null,
                'job_categories' => $data['job_categories'] ?? [],
                'has_psychometric_test' => $data['has_psychometric_test'] ?? false,
                'has_medical_test' => $data['has_medical_test'] ?? false,
                'other_screening_details' => $data['other_screening_details'] ?? null,
                'parent_job_id' => $data['parent_job_id'] ?? null,
            ];

            if ($jobId) {
                $job = JobProfile::findOrFail($jobId);
                
                // Extra ownership check for recruiters
                if ($user->role === 'recruiter' && (int)$job->company_id !== (int)$user->company_id) {
                    throw new \Exception("Forbidden", 403);
                }
                
                $job->update($jobData);
            } else {
                $job = JobProfile::create($jobData);
            }

            // Update Salary
            if (isset($data['salary'])) {
                Salary::updateOrCreate(['job_id' => $job->job_id], [
                    'currency' => data_get($data, 'salary.currency', 'INR'),
                    'different_structure_per_programme' => data_get($data, 'salary.different_structure_per_programme', false),
                    'stipend' => data_get($data, 'salary.stipend'),
                    'internship_duration' => data_get($data, 'salary.internship_duration'),
                    'salaries_json' => data_get($data, 'salary.salaries_json', []),
                    'additional_components' => data_get($data, 'salary.additional_components', []),
                    'ctc_lpa' => data_get($data, 'salary.ctc_lpa')
                ]);
            }

            // Update Eligibility
            if (isset($data['eligibility'])) {
                Eligibility::updateOrCreate(['job_id' => $job->job_id], [
                    'global_min_cgpa' => data_get($data, 'eligibility.global_min_cgpa'),
                    'global_max_backlogs' => data_get($data, 'eligibility.global_max_backlogs'),
                    'global_allow_backlogs' => data_get($data, 'eligibility.global_allow_backlogs', true),
                    'high_school_percentage' => data_get($data, 'eligibility.high_school_percentage'),
                    'gender_filter' => data_get($data, 'eligibility.gender_filter', 'All'),
                    'disciplines_json' => data_get($data, 'eligibility.disciplines_json', [])
                ]);
            }

            // Update Declaration
            if (isset($data['declaration'])) {
                Declaration::updateOrCreate(['job_id' => $job->job_id], [
                    'agreed' => data_get($data, 'declaration.agreed', false),
                    'agreed_at' => data_get($data, 'declaration.agreed') ? now() : null,
                    'agreed_by_user_id' => $user->id,
                    'authorised_signatory_name' => data_get($data, 'declaration.authorised_signatory_name'),
                    'authorised_signatory_designation' => data_get($data, 'declaration.authorised_signatory_designation'),
                    'authorised_signatory_date' => data_get($data, 'declaration.authorised_signatory_date'),
                    'typed_signature' => data_get($data, 'declaration.typed_signature'),
                    'rti_nirf_consent' => data_get($data, 'declaration.rti_nirf_consent', false),
                    'declaration_text' => data_get($data, 'declaration.declaration_text'),
                    'aipc_guidelines' => data_get($data, 'declaration.aipc_guidelines', []),
                ]);
            }

            // Update Stages
            if (isset($data['stages'])) {
                JobStage::where('job_id', $job->job_id)->delete();
                foreach ($data['stages'] as $stage) {
                    JobStage::create([
                        'job_id' => $job->job_id,
                        'stage_id' => $stage['stage_id'],
                        'sequence' => $stage['sequence'],
                        'duration' => $stage['duration'] ?? null,
                        'selection_mode' => $stage['selection_mode'] ?? null,
                        'test_type' => $stage['test_type'] ?? null,
                        'interview_mode' => $stage['interview_mode'] ?? null,
                        'infrastructure_requirements' => $stage['infrastructure_requirements'] ?? null,
                        'start_time' => $stage['start_time'] ?? null,
                        'end_time' => $stage['end_time'] ?? null,
                    ]);
                }
            }

            return $job;
        });

        if ($data['status'] === 'submitted') {
            $payload->load('company');
            try {
                Mail::raw("A new {$payload->job_type} application has been submitted by {$payload->company->name}.\n\nJob Profile: {$payload->profile_name}\nLocation: {$payload->location}\n\nPlease login to the admin portal to review and approve/reject the application.", function ($msg) use ($payload) {
                    $msg->to(env('ADMIN_EMAIL', 'admin@example.com'))
                        ->from('no-reply@campus.local', 'Campus Recruitment System')
                        ->subject("New {$payload->job_type} Application: {$payload->profile_name}");
                });
            } catch (\Throwable $e) {
                Log::warning('Job submission admin mail failed: '.$e->getMessage());
            }
        }

        return response()->json($payload->load(['salary', 'eligibility', 'declaration', 'stages', 'company']), ($data['job_id'] ?? null) ? 200 : 201);
    }

    private function assertDisciplinesMatchCourses(array $rows): void
    {
        $map = config('course_disciplines');
        $errors = [];
        foreach ($rows as $i => $row) {
            $course = $row['course'] ?? '';
            $discipline = $row['discipline'] ?? '';
            $allowed = $map[$course] ?? [];
            if ($allowed === [] || !in_array($discipline, $allowed, true)) {
                $errors["eligibility.disciplines_json.$i.discipline"] = ['Discipline is not valid for the selected course.'];
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function assertAipcGuidelinesComplete(array $submitted, string $jobType): void
    {
        $keys = array_keys(config('aipc.guideline_keys'));
        $errors = [];
        foreach ($keys as $k) {
            // final_confirmation is JNF only
            if ($k === 'final_confirmation' && $jobType !== 'JNF') {
                continue;
            }

            $v = $submitted[$k] ?? null;
            if ($v !== true && $v !== 1 && $v !== '1') {
                $errors["declaration.aipc_guidelines.$k"] = ['This AIPC guideline must be acknowledged.'];
            }
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    public function update(Request $request, $id)
    {
        $user = auth('api')->user();
        $job = JobProfile::findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        
        // Instead of a simple update, we should probably use the store logic
        // but for now, let's just make it consistent with auth
        $request->merge(['job_id' => $id]);
        return $this->store($request);
    }

    public function destroy($id)
    {
        $user = auth('api')->user();
        $job = JobProfile::findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $job->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function sync($id)
    {
        $user = auth('api')->user();
        $parent = JobProfile::with(['salary', 'eligibility', 'declaration', 'stages'])->findOrFail($id);

        if ($user->role === 'recruiter' && (int) $parent->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $duplicates = JobProfile::where('parent_job_id', $id)->get();

        return DB::transaction(function () use ($parent, $duplicates, $user) {
            foreach ($duplicates as $duplicate) {
                // Update basic fields but keep the duplicate's own status and profile name
                $duplicate->update([
                    'job_designation' => $parent->job_designation,
                    'place_of_posting' => $parent->place_of_posting,
                    'description' => $parent->description,
                    'location' => $parent->location,
                    'work_mode' => $parent->work_mode,
                    'offline_job_location' => $parent->offline_job_location,
                    'expected_hires' => $parent->expected_hires,
                    'min_hires' => $parent->min_hires,
                    'required_skills' => $parent->required_skills,
                    'training_period' => $parent->training_period,
                    'bond' => $parent->bond,
                    'registration_link' => $parent->registration_link,
                    'joining_month' => $parent->joining_month,
                    'onboarding_procedure' => $parent->onboarding_procedure,
                    'additional_info' => $parent->additional_info,
                    'additional_info_1000' => $parent->additional_info_1000,
                    'job_categories' => $parent->job_categories,
                    'has_psychometric_test' => $parent->has_psychometric_test,
                    'has_medical_test' => $parent->has_medical_test,
                    'other_screening_details' => $parent->other_screening_details,
                ]);

                // Sync Salary
                if ($parent->salary) {
                    Salary::updateOrCreate(['job_id' => $duplicate->job_id], [
                        'currency' => $parent->salary->currency,
                        'stipend' => $parent->salary->stipend,
                        'internship_duration' => $parent->salary->internship_duration,
                        'different_structure_per_programme' => $parent->salary->different_structure_per_programme,
                        'salaries_json' => $parent->salary->salaries_json,
                        'additional_components' => $parent->salary->additional_components,
                        'ctc_lpa' => $parent->salary->ctc_lpa,
                    ]);
                }

                // Sync Eligibility
                if ($parent->eligibility) {
                    Eligibility::updateOrCreate(['job_id' => $duplicate->job_id], [
                        'global_min_cgpa' => $parent->eligibility->global_min_cgpa,
                        'global_max_backlogs' => $parent->eligibility->global_max_backlogs,
                        'global_allow_backlogs' => $parent->eligibility->global_allow_backlogs,
                        'high_school_percentage' => $parent->eligibility->high_school_percentage,
                        'gender_filter' => $parent->eligibility->gender_filter,
                        'disciplines_json' => $parent->eligibility->disciplines_json,
                    ]);
                }

                // Sync Declaration
                if ($parent->declaration) {
                    Declaration::updateOrCreate(['job_id' => $duplicate->job_id], [
                        'agreed' => $parent->declaration->agreed,
                        'agreed_at' => $parent->declaration->agreed_at,
                        'agreed_by_user_id' => $user->id,
                        'authorised_signatory_name' => $parent->declaration->authorised_signatory_name,
                        'authorised_signatory_designation' => $parent->declaration->authorised_signatory_designation,
                        'authorised_signatory_date' => $parent->declaration->authorised_signatory_date,
                        'typed_signature' => $parent->declaration->typed_signature,
                        'rti_nirf_consent' => $parent->declaration->rti_nirf_consent,
                        'declaration_text' => $parent->declaration->declaration_text,
                        'aipc_guidelines' => $parent->declaration->aipc_guidelines,
                    ]);
                }

                // Sync Stages (Delete existing stages of duplicate and replicate parent stages)
                $duplicate->stages()->delete();
                foreach ($parent->stages as $stage) {
                    $newStage = $stage->replicate();
                    $newStage->job_id = $duplicate->job_id;
                    $newStage->save();
                }
            }

            return response()->json(['message' => 'Changes synced to ' . $duplicates->count() . ' duplicates.']);
        });
    }

    public function duplicate($id)
    {
        $user = auth('api')->user();
        $original = JobProfile::with(['salary', 'eligibility', 'declaration', 'stages'])->findOrFail($id);

        if ($user->role === 'recruiter' && (int) $original->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return DB::transaction(function () use ($original) {
            $clone = $original->replicate();
            
            // Set the parent_job_id to track relationship
            $clone->parent_job_id = $original->job_id;
            
            // Generate a unique profile name
            $baseName = $original->profile_name;
            $count = JobProfile::where('parent_job_id', $original->job_id)->count();
            $clone->profile_name = $baseName . ' Profile ' . ($count + 1);
            
            // Reset status to draft for the duplicated profile
            $clone->status = 'draft';
            $clone->last_completed_step = 0;
            $clone->save();

            // Duplicate Salary
            if ($original->salary) {
                $newSalary = $original->salary->replicate();
                $newSalary->job_id = $clone->job_id;
                $newSalary->save();
            }

            // Duplicate Eligibility
            if ($original->eligibility) {
                $newEligibility = $original->eligibility->replicate();
                $newEligibility->job_id = $clone->job_id;
                $newEligibility->save();
            }

            // Duplicate Declaration
            if ($original->declaration) {
                $newDeclaration = $original->declaration->replicate();
                $newDeclaration->job_id = $clone->job_id;
                $newDeclaration->save();
            }

            // Duplicate Stages
            foreach ($original->stages as $stage) {
                $newStage = $stage->replicate();
                $newStage->job_id = $clone->job_id;
                $newStage->save();
            }

            return response()->json($clone->load(['salary', 'eligibility', 'declaration', 'stages']));
        });
    }
}
