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
use App\Models\User;
use App\Mail\JobProfileSubmittedMail;
use App\Mail\AdminJobProfileNotificationMail;
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
        $paginator = $query->paginate($perPage);

        $paginator->getCollection()->transform(function ($job) use ($user) {
            $job->is_editable = $this->calculateIsEditable($job, $user);
            return $job;
        });

        return response()->json($paginator);
    }

    public function show($id)
    {
        $user = auth('api')->user();
        $job = JobProfile::with(['salary', 'eligibility', 'declaration', 'stages', 'duplicates', 'company.contacts'])->findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $job->is_editable = $this->calculateIsEditable($job, $user);
        return response()->json($job);
    }

    private function calculateIsEditable($job, $user)
    {
        if (in_array($job->status, ['selected', 'rejected', 'approved'])) {
            return false;
        }

        if ($user->role === 'admin') {
            return !$job->admin_edited && in_array($job->status, ['submitted', 'pending', 'in progress']);
        }

        if ($user->role === 'recruiter') {
            return in_array($job->status, ['draft', 'pending']);
        }

        return false;
    }

    public function store(Request $request)
    {
        $user = auth('api')->user();
        
        // Inject company_id for recruiters before validation
        if ($user->role === 'recruiter') {
            $request->merge(['company_id' => $user->company_id]);
        }

        $isDraft = $request->get('status') === 'draft' || $request->get('status') === 'pending';
        
        // Clean numeric fields for drafts
        if ($isDraft) {
            if ($request->has('salary.stipend') && $request->input('salary.stipend') === "") {
                $request->merge(['salary' => array_merge($request->input('salary', []), ['stipend' => null])]);
            }
            if ($request->has('salary.ctc_lpa') && $request->input('salary.ctc_lpa') === "") {
                $request->merge(['salary' => array_merge($request->input('salary', []), ['ctc_lpa' => null])]);
            }
            if ($request->has('eligibility.global_min_cgpa') && $request->input('eligibility.global_min_cgpa') === "") {
                $request->merge(['eligibility' => array_merge($request->input('eligibility', []), ['global_min_cgpa' => null])]);
            }
        }

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
            'salary.ctc_lpa' => 'nullable|numeric|min:0',
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
            'stages.*.stage_id' => 'required', // Relaxed to allow custom stage IDs if not in hiring_stage table
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
            $this->assertEligibilityComplete($data['eligibility']['disciplines_json']);
            $this->assertAipcGuidelinesComplete($data['declaration']['aipc_guidelines'] ?? [], $data['job_type']);
        }

        if ($user->role === 'recruiter') {
            $data['company_id'] = $user->company_id;
        }

        $jobId = $data['job_id'] ?? null;
        $oldStatus = $jobId ? JobProfile::where('job_id', $jobId)->value('status') : null;

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
                
                // If admin is editing a submitted/pending job, mark as admin_edited
                if ($user->role === 'admin' && in_array($job->status, ['submitted', 'pending', 'in progress'])) {
                    $jobData['admin_edited'] = true;
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

        if ($data['status'] === 'submitted' && $oldStatus !== 'submitted' && $user->role === 'recruiter') {
            $payload->load('company');
            try {
                // Notify Recruiter
                Mail::to($user->email)->send(new JobProfileSubmittedMail($payload));
                
                // Notify Admins
                $adminEmails = User::where('role', 'admin')->pluck('email')->toArray();
                if (!empty($adminEmails)) {
                    Mail::to($adminEmails)->send(new AdminJobProfileNotificationMail($payload));
                } else {
                    $adminEmail = env('ADMIN_EMAIL', 'admin@example.com');
                    Mail::to($adminEmail)->send(new AdminJobProfileNotificationMail($payload));
                }
            } catch (\Throwable $e) {
                Log::warning('Job submission notification mails failed: '.$e->getMessage());
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

    private function assertEligibilityComplete(array $disciplines): void
    {
        $selectedDisciplines = array_filter($disciplines, fn($d) => !empty($d['selected']));
        
        if (empty($selectedDisciplines)) {
            throw ValidationException::withMessages([
                'eligibility.disciplines_json' => ['At least one discipline must be selected for eligibility.']
            ]);
        }

        $errors = [];
        foreach ($selectedDisciplines as $i => $row) {
            if (!isset($row['min_cgpa']) || $row['min_cgpa'] === '' || $row['min_cgpa'] === null) {
                $discipline = $row['discipline'] ?? "Row $i";
                $errors["eligibility.disciplines_json.$i.min_cgpa"] = ["CGPA/CPI is required for selected discipline: $discipline"];
            }
        }

        if (!empty($errors)) {
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
        $user = Auth::guard('api')->user();
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
        $user = Auth::guard('api')->user();
        $job = JobProfile::findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $job->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function syncTargets($id)
    {
        $user = auth('api')->user();
        $current = JobProfile::findOrFail($id);

        if ($user->role === 'recruiter' && (int) $current->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // If current is child, parent is current->parent_job_id.
        // If current is parent, parent is current->job_id.
        $parentId = $current->parent_job_id ?: $current->job_id;
        $parent = JobProfile::findOrFail($parentId);

        // Targets are the parent (if current is not parent) and all children (except current)
        $targets = JobProfile::where('parent_job_id', $parentId)
            ->orWhere('job_id', $parentId)
            ->get()
            ->filter(fn($j) => $j->job_id !== (int)$id)
            ->map(fn($j) => [
                'id' => $j->job_id,
                'name' => $j->profile_name . ($j->job_id === $parentId ? ' (Original)' : '')
            ])
            ->values();

        return response()->json(['targets' => $targets]);
    }

    public function sync(Request $request, $id)
    {
        $user = auth('api')->user();
        $source = JobProfile::with(['salary', 'eligibility', 'declaration', 'stages'])->findOrFail($id);

        if ($user->role === 'recruiter' && (int) $source->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $targetIds = $request->input('target_job_ids', []);
        if (empty($targetIds)) {
            // Default: sync to all duplicates if source is parent
            if (!$source->parent_job_id) {
                $targetIds = JobProfile::where('parent_job_id', $id)->pluck('job_id')->toArray();
            } else {
                return response()->json(['message' => 'No sync targets selected.'], 400);
            }
        }

        $targets = JobProfile::whereIn('job_id', $targetIds)->get();

        return DB::transaction(function () use ($source, $targets, $user) {
            foreach ($targets as $target) {
                // Update basic fields but keep the target's own status and profile name
                $target->update([
                    'job_designation' => $source->job_designation,
                    'place_of_posting' => $source->place_of_posting,
                    'description' => $source->description,
                    'location' => $source->location,
                    'work_mode' => $source->work_mode,
                    'offline_job_location' => $source->offline_job_location,
                    'expected_hires' => $source->expected_hires,
                    'min_hires' => $source->min_hires,
                    'required_skills' => $source->required_skills,
                    'training_period' => $source->training_period,
                    'bond' => $source->bond,
                    'registration_link' => $source->registration_link,
                    'joining_month' => $source->joining_month,
                    'onboarding_procedure' => $source->onboarding_procedure,
                    'additional_info' => $source->additional_info,
                    'additional_info_1000' => $source->additional_info_1000,
                    'job_categories' => $source->job_categories,
                    'has_psychometric_test' => $source->has_psychometric_test,
                    'has_medical_test' => $source->has_medical_test,
                    'other_screening_details' => $source->other_screening_details,
                ]);

                // Sync Salary
                if ($source->salary) {
                    Salary::updateOrCreate(['job_id' => $target->job_id], [
                        'currency' => $source->salary->currency,
                        'stipend' => $source->salary->stipend,
                        'internship_duration' => $source->salary->internship_duration,
                        'different_structure_per_programme' => $source->salary->different_structure_per_programme,
                        'salaries_json' => $source->salary->salaries_json,
                        'additional_components' => $source->salary->additional_components,
                        'ctc_lpa' => $source->salary->ctc_lpa,
                    ]);
                }

                // Sync Eligibility
                if ($source->eligibility) {
                    Eligibility::updateOrCreate(['job_id' => $target->job_id], [
                        'global_min_cgpa' => $source->eligibility->global_min_cgpa,
                        'global_max_backlogs' => $source->eligibility->global_max_backlogs,
                        'global_allow_backlogs' => $source->eligibility->global_allow_backlogs,
                        'high_school_percentage' => $source->eligibility->high_school_percentage,
                        'gender_filter' => $source->eligibility->gender_filter,
                        'disciplines_json' => $source->eligibility->disciplines_json,
                    ]);
                }

                // Sync Declaration
                if ($source->declaration) {
                    Declaration::updateOrCreate(['job_id' => $target->job_id], [
                        'agreed' => $source->declaration->agreed,
                        'agreed_at' => $source->declaration->agreed_at,
                        'agreed_by_user_id' => $user->id,
                        'authorised_signatory_name' => $source->declaration->authorised_signatory_name,
                        'authorised_signatory_designation' => $source->declaration->authorised_signatory_designation,
                        'authorised_signatory_date' => $source->declaration->authorised_signatory_date,
                        'typed_signature' => $source->declaration->typed_signature,
                        'rti_nirf_consent' => $source->declaration->rti_nirf_consent,
                        'declaration_text' => $source->declaration->declaration_text,
                        'aipc_guidelines' => $source->declaration->aipc_guidelines,
                    ]);
                }

                // Sync Stages
                $target->stages()->delete();
                foreach ($source->stages as $stage) {
                    $newStage = $stage->replicate();
                    $newStage->job_id = $target->job_id;
                    $newStage->save();
                }
            }

            return response()->json(['message' => 'Changes synced successfully to ' . $targets->count() . ' profiles.']);
        });
    }

    public function duplicate($id)
    {
        $user = Auth::guard('api')->user();
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
