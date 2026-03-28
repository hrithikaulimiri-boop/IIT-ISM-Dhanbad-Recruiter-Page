<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobProfile;
use App\Models\JobStage;
use App\Mail\ApplicationStatusUpdatedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Maatwebsite\Excel\Facades\Excel;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        Log::info("Application list requested by user: {$user->id}, role: {$user->role}, company_id: {$user->company_id}");
        $query = JobApplication::query();
        
        if ($request->filled('job_id')) {
            $query->where('job_id', $request->job_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->filled('portal_type')) {
            $portalType = $request->portal_type;
            $query->whereHas('job', function ($q) use ($portalType) {
                $q->where('job_type', $portalType);
            });
        }

        if ($user->role === 'recruiter') {
            $jobIds = JobProfile::where('company_id', $user->company_id)->pluck('job_id');
            $query->whereIn('job_id', $jobIds);
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 200);
        $rows = $query->paginate($perPage);
        
        // Debug: Log the count of applications found
        Log::info('Applications found: ' . $rows->total());
        
        $rows->getCollection()->transform(function ($app) {
            // Manually load relationships to avoid eager loading issues
            $job = JobProfile::with('company')->find($app->job_id);
            $app->setRelation('job', $job);

            $stages = JobStage::where('job_id', $app->job_id)->orderBy('sequence')->get();
            $totalStages = $stages->count();
            $currentSequence = 0;
            if ($app->current_stage_id) {
                $current = $stages->firstWhere('id', $app->current_stage_id);
                $currentSequence = $current?->sequence ?? 0;
            }

            $progress = 0;
            if ($app->is_draft) {
                $progress = 0;
            } elseif ($app->status === 'selected') {
                $progress = 100;
            } elseif ($app->status === 'rejected') {
                $progress = max(10, (int) round(($currentSequence / max($totalStages, 1)) * 100));
            } elseif ($totalStages > 0) {
                $progress = (int) round(($currentSequence / $totalStages) * 100);
            }

            $app->total_stages = $totalStages;
            $app->current_sequence = $currentSequence;
            $app->progress_percent = $progress;
            $app->created_at = $app->application_date ?? $app->updated_at;
            $app->job_type = $job?->job_type;
            $app->profile_name = $job?->profile_name;
            $app->job_location = $job?->location;
            $app->work_mode = $job?->work_mode;
            $app->offline_job_location = $job?->offline_job_location;
            $app->company_name = $job?->company?->name;
            $app->annual_turnover = $job?->company?->annual_turnover;
            $app->company_location = $job?->company 
                ? collect([$job->company->street, $job->company->city, $job->company->country, $job->company->pincode])->filter()->join(', ')
                : null;
            $app->year_of_establishment = $job?->company?->established_year;
            $draft = (bool) $app->is_draft;
            $app->is_editable = $draft
                || (((int) ($app->edit_count ?? 0) < 1) && !$app->is_withdrawn);
            $app->can_delete = $draft || !$app->is_withdrawn;

            return $app;
        });

        return response()->json($rows);
    }

    public function show($id)
    {
        $user = auth()->user();
        $app = JobApplication::with(['job.company.contacts'])->findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $app->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        return response()->json($app);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $isDraft = $request->boolean('is_draft', false);

        $rules = [
            'job_id' => 'required|exists:job_profile,job_id',
            'current_stage_id' => 'nullable|exists:job_stage,id',
            'application_date' => 'nullable|date',
            'draft_payload' => 'nullable|array',
        ];
        if ($isDraft) {
            $rules['candidate_name'] = 'nullable|string|max:255';
            $rules['candidate_email'] = 'nullable|string|max:255';
            $rules['status'] = 'nullable|in:selected,rejected,in progress';
        } else {
            $rules['candidate_name'] = 'required|string|max:255';
            $rules['candidate_email'] = 'required|email|max:255';
            $rules['status'] = 'required|in:selected,rejected,in progress';
        }

        $data = $request->validate($rules);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $data['job_id'])->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        if ($isDraft) {
            $data['is_draft'] = true;
            $name = trim((string) ($data['candidate_name'] ?? ''));
            $email = trim((string) ($data['candidate_email'] ?? ''));
            $data['candidate_name'] = $name !== '' ? $name : '(Draft)';
            $data['candidate_email'] = $email !== '' ? $email : 'draft@pending.local';
            $data['status'] = $data['status'] ?? 'in progress';
        } else {
            $data['is_draft'] = false;
        }

        return response()->json(JobApplication::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
        $application = JobApplication::findOrFail($id);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        if ($application->is_draft) {
            $data = $request->validate([
                'current_stage_id' => 'nullable|exists:job_stage,id',
                'status' => 'nullable|in:selected,rejected,in progress',
                'candidate_name' => 'nullable|string|max:255',
                'candidate_email' => 'nullable|string|max:255',
                'draft_payload' => 'nullable|array',
            ]);
            if (array_key_exists('candidate_name', $data)) {
                $n = trim((string) $data['candidate_name']);
                $data['candidate_name'] = $n !== '' ? $n : '(Draft)';
            }
            if (array_key_exists('candidate_email', $data)) {
                $e = trim((string) $data['candidate_email']);
                $data['candidate_email'] = $e !== '' ? $e : 'draft@pending.local';
            }
            $application->update($data);

            return response()->json($application);
        }

        $data = $request->validate([
            'current_stage_id' => 'nullable|exists:job_stage,id',
            'status' => 'nullable|in:selected,rejected,in progress',
            'candidate_name' => 'nullable|string',
            'candidate_email' => 'nullable|email',
        ]);

        $isProfileEdit = array_key_exists('candidate_name', $data) || array_key_exists('candidate_email', $data);
        if ($isProfileEdit) {
            if ((int) ($application->edit_count ?? 0) >= 1) {
                return response()->json(['message' => 'Application details can only be edited once.'], 422);
            }
            if ($application->is_withdrawn) {
                return response()->json(['message' => 'Withdrawn applications cannot be edited.'], 422);
            }
            $data['edit_count'] = ((int) ($application->edit_count ?? 0)) + 1;
        }

        $oldStatus = $application->status;
        $application->update($data);

        if ($oldStatus !== $application->status && in_array($application->status, ['selected', 'rejected'])) {
            try {
                Mail::to($application->candidate_email)->send(new ApplicationStatusUpdatedMail($application, $application->status));
            } catch (\Throwable $e) {
                Log::warning('Application status mail failed: '.$e->getMessage());
            }
        }

        return response()->json($application);
    }

    public function submit(Request $request, $id)
    {
        $user = auth()->user();
        $application = JobApplication::findOrFail($id);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        if (!$application->is_draft) {
            return response()->json(['message' => 'This application is already submitted.'], 422);
        }

        $data = $request->validate([
            'candidate_name' => 'required|string|max:255',
            'candidate_email' => 'required|email|max:255',
        ]);

        $application->update([
            'is_draft' => false,
            'candidate_name' => $data['candidate_name'],
            'candidate_email' => $data['candidate_email'],
            'edit_count' => 0,
            'draft_payload' => null,
            'application_date' => now(),
        ]);

        return response()->json($application);
    }

    public function moveToNextStage($id)
    {
        $user = auth()->user();
        $application = JobApplication::findOrFail($id);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

        if ($application->is_draft) {
            return response()->json(['message' => 'Submit the application before moving stages.'], 422);
        }

        $stages = JobStage::where('job_id', $application->job_id)->orderBy('sequence')->get();

        if ($stages->isEmpty()) {
            return response()->json(['message' => 'No configured stages for this job'], 422);
        }

        $nextStage = null;
        if (!$application->current_stage_id) {
            $nextStage = $stages->first();
        } else {
            $current = $stages->firstWhere('id', $application->current_stage_id);
            if (!$current) {
                $nextStage = $stages->first();
            } else {
                $nextStage = $stages->first(fn ($s) => $s->sequence > $current->sequence);
            }
        }

        if (!$nextStage) {
            $application->status = 'selected';
            $application->save();

            return response()->json([
                'message' => 'Application reached final stage and is marked selected',
                'data' => $application,
            ]);
        }

        $application->current_stage_id = $nextStage->id;
        $application->status = 'in progress';
        $application->save();

        return response()->json([
            'message' => 'Application moved to next stage',
            'data' => $application,
        ]);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $app = JobApplication::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $app->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }
        $app->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function withdraw($id)
    {
        $user = auth()->user();
        $application = JobApplication::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }
        if ($application->is_withdrawn) {
            return response()->json(['message' => 'Application already withdrawn.'], 422);
        }

        $application->is_withdrawn = true;
        $application->status = 'rejected';
        $application->save();

        return response()->json(['message' => 'Application withdrawn successfully.', 'data' => $application]);
    }

    public function export()
    {
        $user = auth()->user();
        $query = JobApplication::query();
        if ($user->role === 'recruiter') {
            $jobIds = JobProfile::where('company_id', $user->company_id)->pluck('job_id');
            $query->whereIn('job_id', $jobIds);
        }

        $rows = $query->get()->toArray();

        return Excel::download(new class($rows) implements \Maatwebsite\Excel\Concerns\FromArray {
            private $rows;

            public function __construct($rows)
            {
                $this->rows = $rows;
            }

            public function array(): array
            {
                return $this->rows;
            }
        }, 'applications.xlsx');
    }
}
