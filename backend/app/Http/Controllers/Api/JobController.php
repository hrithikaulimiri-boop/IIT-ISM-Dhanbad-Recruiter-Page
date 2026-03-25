<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Declaration;
use App\Models\Eligibility;
use App\Models\JobProfile;
use App\Models\JobStage;
use App\Models\Salary;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class JobController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $query = JobProfile::with(['salary', 'eligibility', 'declaration']);
        if ($user->role === 'recruiter') {
            $query->where('company_id', $user->company_id);
        }
        return response()->json($query->paginate());
    }

    public function show($id)
    {
        $user = auth()->user();
        $job = JobProfile::with(['salary', 'eligibility', 'declaration'])->findOrFail($id);
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
            'profile_name' => 'required|string',
            'description' => 'required|string',
            'location' => 'required|string',
            'training_period' => 'nullable|string',
            'bond' => 'nullable|string',
            'registration_link' => 'nullable|url',
            'joining_month' => 'nullable|string',
            'onboarding_procedure' => 'nullable|string',
            'num_employees' => 'nullable|string',
            'sector' => 'nullable|string',
            'salary.ctc_lpa' => 'required_if:job_type,JNF|nullable|numeric|min:0',
            'salary.stipend' => 'required_if:job_type,INF|nullable|string',
            'salary.internship_duration' => 'nullable|string',
            'salary.fixed_component' => 'nullable|numeric|min:0',
            'salary.joining_bonus' => 'nullable|numeric|min:0',
            'salary.retention_bonus' => 'nullable|numeric|min:0',
            'salary.variable_component' => 'nullable|numeric|min:0',
            'salary.esops' => 'nullable|numeric|min:0',
            'salary.stocks_options' => 'nullable|numeric|min:0',
            'eligibility.min_cgpa' => 'nullable|numeric|min:0|max:10',
            'eligibility.gender' => 'nullable|in:All,Male,Female,Others',
            'eligibility.slp_requirement' => 'nullable|string',
            'eligibility.disciplines_json' => 'nullable|array',
            'declaration.agreed' => 'required|boolean',
            'declaration.declaration_text' => 'nullable|string',
            'stages' => 'nullable|array',
            'stages.*.stage_id' => 'required_with:stages|exists:hiring_stage,stage_id',
            'stages.*.sequence' => 'required_with:stages|integer|min:1',
            'stages.*.duration' => 'nullable|string',
            'stages.*.start_time' => 'nullable|date',
            'stages.*.end_time' => 'nullable|date|after_or_equal:stages.*.start_time',
        ]);

        if ($user->role === 'recruiter') {
            $data['company_id'] = $user->company_id;
        }

        $payload = DB::transaction(function () use ($data) {
            $job = JobProfile::create([
                'company_id' => $data['company_id'],
                'cycle_id' => $data['cycle_id'],
                'job_type' => $data['job_type'],
                'profile_name' => $data['profile_name'],
                'description' => $data['description'],
                'location' => $data['location'],
                'training_period' => $data['training_period'] ?? null,
                'bond' => $data['bond'] ?? null,
                'registration_link' => $data['registration_link'] ?? null,
                'joining_month' => $data['joining_month'] ?? null,
                'onboarding_procedure' => $data['onboarding_procedure'] ?? null,
                'num_employees' => $data['num_employees'] ?? null,
                'sector' => $data['sector'] ?? null,
            ]);

            Salary::create(array_merge($data['salary'], ['job_id' => $job->job_id]));
            Eligibility::create(array_merge($data['eligibility'] ?? [], ['job_id' => $job->job_id]));
            Declaration::create([
                'job_id' => $job->job_id,
                'agreed' => $data['declaration']['agreed'],
                'agreed_at' => $data['declaration']['agreed'] ? now() : null,
                'agreed_by_user_id' => auth()->id(),
                'declaration_text' => $data['declaration']['declaration_text'] ?? null,
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

            return $job;
        });

        Mail::raw("Job profile {$payload->profile_name} created.", function ($msg) {
            $msg->to(env('ADMIN_EMAIL', 'admin@example.com'))->subject('Job Creation Confirmation');
        });

        return response()->json($payload, 201);
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
