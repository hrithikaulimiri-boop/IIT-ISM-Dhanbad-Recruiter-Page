<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Declaration;
use App\Models\Eligibility;
use App\Models\JobApplication;
use App\Models\JobProfile;
use App\Models\JobStage;
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
        $user = Auth::user();
        $query = JobProfile::with(['salary', 'eligibility', 'declaration', 'company']);
        
        if ($user->role === 'recruiter') {
            $query->where('company_id', $user->company_id);
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
        $user = Auth::user();
        $job = JobProfile::with(['salary', 'eligibility', 'declaration', 'company.contacts', 'stages'])->findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($job);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $isDraft = $request->get('status') === 'draft' || $request->get('status') === 'pending';
        
        $rules = [
            'job_id' => 'nullable|exists:job_profile,job_id',
            'company_id' => 'required|exists:company,company_id',
            'cycle_id' => 'required|exists:recruitment_cycle,cycle_id',
            'job_type' => 'required|in:INF,JNF',
            'profile_name' => $isDraft ? 'nullable|string|max:255' : 'required|string|max:255',
            'description' => $isDraft ? 'nullable|string' : 'required|string',
            'location' => $isDraft ? 'nullable|string|max:255' : 'required|string|max:255',
            'work_mode' => 'required|in:online,offline',
            'offline_job_location' => 'required_if:work_mode,offline|nullable|string|max:500',
            'job_categories' => $isDraft ? 'nullable|array' : 'required|array|min:1',
            'training_period' => 'nullable|string',
            'bond' => 'nullable|string',
            'registration_link' => 'nullable|url',
            'joining_month' => 'nullable|string',
            'onboarding_procedure' => 'nullable|string',
            'status' => 'required|in:draft,pending,submitted',
            'last_completed_step' => 'required|integer|min:0|max:4',
            
            // Salary
            'salary.currency' => 'required|string|max:10',
            'salary.ctc_lpa' => $isDraft ? 'nullable|numeric' : 'required_if:job_type,JNF|nullable|numeric|min:0',
            'salary.stipend' => $isDraft ? 'nullable|numeric' : 'required_if:job_type,INF|nullable|numeric|min:0',
            'salary.internship_duration' => $isDraft ? 'nullable|string' : 'required_if:job_type,INF|nullable|string',
            
            // Eligibility
            'eligibility.disciplines_json' => $isDraft ? 'nullable|array' : 'required|array|min:1',
            
            // Declaration
            'declaration.agreed' => $isDraft ? 'nullable|boolean' : 'required|accepted',
            'declaration.aipc_guidelines' => $isDraft ? 'nullable|array' : 'required|array',
            
            // Stages
            'stages' => $isDraft ? 'nullable|array' : 'required|array|min:1',
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
            
            $jobData = [
                'company_id' => $data['company_id'],
                'cycle_id' => $data['cycle_id'],
                'job_type' => $data['job_type'],
                'status' => $data['status'],
                'last_completed_step' => $data['last_completed_step'],
                'profile_name' => $data['profile_name'] ?? 'Untitled Profile',
                'description' => $data['description'] ?? '',
                'location' => $data['location'] ?? '',
                'work_mode' => $data['work_mode'],
                'offline_job_location' => $data['work_mode'] === 'offline' ? ($data['offline_job_location'] ?? null) : null,
                'training_period' => $data['training_period'] ?? null,
                'bond' => $data['bond'] ?? null,
                'registration_link' => $data['registration_link'] ?? null,
                'joining_month' => $data['joining_month'] ?? null,
                'onboarding_procedure' => $data['onboarding_procedure'] ?? null,
                'job_categories' => $data['job_categories'] ?? [],
            ];

            if ($jobId) {
                $job = JobProfile::findOrFail($jobId);
                $job->update($jobData);
            } else {
                $job = JobProfile::create($jobData);
            }

            // Update Salary
            Salary::updateOrCreate(['job_id' => $job->job_id], $data['salary']);

            // Update Eligibility
            Eligibility::updateOrCreate(['job_id' => $job->job_id], [
                'disciplines_json' => $data['eligibility']['disciplines_json'] ?? []
            ]);

            // Update Declaration
            if (isset($data['declaration'])) {
                Declaration::updateOrCreate(['job_id' => $job->job_id], [
                    'agreed' => $data['declaration']['agreed'] ?? false,
                    'agreed_at' => ($data['declaration']['agreed'] ?? false) ? now() : null,
                    'agreed_by_user_id' => $user->id,
                    'declaration_text' => $data['declaration']['declaration_text'] ?? null,
                    'aipc_guidelines_json' => $data['declaration']['aipc_guidelines'] ?? [],
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
                    ]);
                }
            }

            // Final submission logic
            if ($data['status'] === 'submitted') {
                JobApplication::updateOrCreate(
                    ['job_id' => $job->job_id, 'candidate_email' => $user->email],
                    [
                        'candidate_name' => $user->name,
                        'status' => 'in progress',
                        'application_date' => now(),
                        'is_draft' => false,
                    ]
                );
            }

            return $job;
        });

        if ($data['status'] === 'submitted') {
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

        return response()->json($payload, $data['job_id'] ? 200 : 201);
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
        $user = auth()->user();
        $job = JobProfile::findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $job->update($request->all());
        return response()->json($job);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $job = JobProfile::findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        $job->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
