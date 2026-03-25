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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = JobProfile::with(['salary', 'eligibility', 'declaration', 'company']);
        if ($user->role === 'recruiter') {
            $query->where('company_id', $user->company_id);
        }
        $perPage = min(max((int) $request->get('per_page', 15), 1), 200);

        return response()->json($query->paginate($perPage));
    }

    public function show($id)
    {
        $user = auth()->user();
        $job = JobProfile::with(['salary', 'eligibility', 'declaration', 'company.contacts'])->findOrFail($id);
        if ($user->role === 'recruiter' && (int) $job->company_id !== (int) $user->company_id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($job);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $data = $request->validate([
            'company_id' => 'required|exists:company,company_id',
            'cycle_id' => 'required|exists:recruitment_cycle,cycle_id',
            'job_type' => 'required|in:INF,JNF',
            'profile_name' => 'required|string|max:255',
            'description' => 'required|string|max:3000',
            'location' => 'required|string|max:255',
            'work_mode' => 'required|in:online,offline',
            'offline_job_location' => 'required_if:work_mode,offline|nullable|string|max:500',
            'annual_turnover' => 'required|string|max:255',
            'training_period' => 'nullable|string',
            'bond' => 'nullable|string',
            'registration_link' => 'nullable|url',
            'joining_month' => 'nullable|string',
            'onboarding_procedure' => 'nullable|string',
            'salary.currency' => 'required|string|max:10',
            'salary.ctc_lpa' => 'required_if:job_type,JNF|nullable|numeric|min:0',
            'salary.stipend' => 'required_if:job_type,INF|nullable|numeric|min:0',
            'salary.internship_duration' => 'required_if:job_type,INF|nullable|string',
            'salary.fixed_component' => 'nullable|numeric|min:0',
            'salary.joining_bonus' => 'nullable|numeric|min:0',
            'salary.retention_bonus' => 'nullable|numeric|min:0',
            'salary.variable_component' => 'nullable|numeric|min:0',
            'salary.esops' => 'nullable|numeric|min:0',
            'salary.stocks_options' => 'nullable|numeric|min:0',
            'eligibility.min_cgpa' => 'nullable|numeric|min:0|max:10',
            'eligibility.gender' => 'nullable|in:All,Male,Female,Others',
            'eligibility.slp_requirement' => 'nullable|string',
            'eligibility.disciplines_json' => 'required|array|min:1',
            'eligibility.disciplines_json.*.discipline' => 'required|string|max:255',
            'eligibility.disciplines_json.*.course' => 'required|string|max:255',
            'eligibility.disciplines_json.*.min_cgpa' => 'required|numeric|min:0|max:10',
            'eligibility.disciplines_json.*.min_hires' => 'required|integer|min:1',
            'eligibility.disciplines_json.*.criteria' => 'nullable|string|max:1000',
            'declaration.agreed' => 'required|accepted',
            'declaration.declaration_text' => 'nullable|string',
            'declaration.aipc_guidelines' => 'required|array',
            'stages' => 'required|array|min:1',
            'stages.*.stage_id' => 'required_with:stages|exists:hiring_stage,stage_id',
            'stages.*.sequence' => 'required_with:stages|integer|min:1',
            'stages.*.duration' => 'nullable|string',
            'stages.*.start_time' => 'nullable|date',
            'stages.*.end_time' => 'nullable|date|after_or_equal:stages.*.start_time',
        ]);

        $this->assertDisciplinesMatchCourses($data['eligibility']['disciplines_json']);
        $this->assertAipcGuidelinesComplete($data['declaration']['aipc_guidelines'] ?? [], $data['job_type']);

        if ($user->role === 'recruiter') {
            $data['company_id'] = $user->company_id;
        }

        $payload = DB::transaction(function () use ($data) {
            $company = Company::findOrFail($data['company_id']);
            $company->annual_turnover = $data['annual_turnover'];
            $company->save();

            $job = JobProfile::create([
                'company_id' => $data['company_id'],
                'cycle_id' => $data['cycle_id'],
                'job_type' => $data['job_type'],
                'profile_name' => $data['profile_name'],
                'description' => $data['description'],
                'location' => $data['location'],
                'work_mode' => $data['work_mode'],
                'offline_job_location' => $data['work_mode'] === 'offline' ? ($data['offline_job_location'] ?? null) : null,
                'training_period' => $data['training_period'] ?? null,
                'bond' => $data['bond'] ?? null,
                'registration_link' => $data['registration_link'] ?? null,
                'joining_month' => $data['joining_month'] ?? null,
                'onboarding_procedure' => $data['onboarding_procedure'] ?? null,
            ]);

            Salary::create(array_merge($data['salary'], ['job_id' => $job->job_id]));
            Eligibility::create(array_merge($data['eligibility'] ?? [], ['job_id' => $job->job_id]));
            Declaration::create([
                'job_id' => $job->job_id,
                'agreed' => true,
                'agreed_at' => now(),
                'agreed_by_user_id' => auth()->id(),
                'declaration_text' => $data['declaration']['declaration_text'] ?? null,
                'aipc_guidelines_json' => $data['declaration']['aipc_guidelines'],
            ]);

            foreach (($data['stages'] ?? []) as $stage) {
                JobStage::create([
                    'job_id' => $job->job_id,
                    'stage_id' => $stage['stage_id'],
                    'sequence' => $stage['sequence'],
                    'duration' => $stage['duration'] ?? null,
                    'start_time' => $stage['start_time'] ?? null,
                    'end_time' => $stage['end_time'] ?? null,
                ]);
            }

            // Create a JobApplication automatically for the recruiter
            JobApplication::create([
                'job_id' => $job->job_id,
                'candidate_name' => auth()->user()->name,
                'candidate_email' => auth()->user()->email,
                'status' => 'in progress',
                'application_date' => now(),
                'is_draft' => false,
            ]);

            return $job;
        });

        try {
            Mail::raw("A new {$payload->job_type} application has been submitted by {$payload->company->name}.\n\nJob Profile: {$payload->profile_name}\nLocation: {$payload->location}\n\nPlease login to the admin portal to review and approve/reject the application.", function ($msg) use ($payload) {
                $msg->to(env('ADMIN_EMAIL', 'admin@example.com'))
                    ->from('no-reply@campus.local', 'Campus Recruitment System')
                    ->subject("New {$payload->job_type} Application: {$payload->profile_name}");
            });
        } catch (\Throwable $e) {
            Log::warning('Job submission admin mail failed: '.$e->getMessage());
        }

        return response()->json($payload, 201);
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
