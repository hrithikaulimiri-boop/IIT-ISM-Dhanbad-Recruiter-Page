<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobProfile;
use App\Models\JobStage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = auth('api')->user();
        $portalType = $request->query('portal_type'); // 'JNF' or 'INF'

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // IF RECRUITER: Return their own JNF/INF submissions as "applications"
        if ($user->role === 'recruiter') {
            $query = JobProfile::with('company')->where('company_id', $user->company_id);
            
            if ($portalType) {
                $query->where('job_type', $portalType);
            }

            if ($request->filled('status')) {
                $statusMap = ['in progress' => 'submitted', 'selected' => 'approved', 'rejected' => 'rejected'];
                $status = $statusMap[$request->status] ?? $request->status;
                $query->where('status', $status);
            }

            $rows = $query->paginate($request->query('per_page', 200));
            $rows->through(function ($job) {
                return [
                    'id' => (int)$job->job_id,
                    'job_id' => (int)$job->job_id,
                    'profile_name' => $job->profile_name,
                    'company_name' => $job->company?->name,
                    'status' => $job->status, // Use raw status: draft, pending, submitted, approved, rejected
                    'last_completed_step' => $job->last_completed_step,
                    'is_editable' => !in_array($job->status, ['approved', 'rejected']),
                    'is_withdrawn' => $job->status === 'draft',
                    'created_at' => $job->updated_at ? $job->updated_at->toIso8601String() : null,
                ];
            });
            return response()->json($rows);
        }

        // IF ADMIN: Default to showing company submissions for approval
        if ($user && $user->role === 'admin' && ($portalType || !$request->filled('job_id'))) {
            $query = JobProfile::with('company');
            
            if ($portalType) {
                $query->where('job_type', $portalType);
            }

            if ($request->filled('status')) {
                $statusMap = [
                    'in progress' => 'submitted', // Admin "Pending Approval" view
                    'selected' => 'approved', 
                    'rejected' => 'rejected'
                ];
                $status = $statusMap[$request->status] ?? $request->status;
                $query->where('status', $status);
            } else {
                // By default, admins ONLY see submitted, approved, or rejected forms.
                // They never see 'draft' or 'pending' (partially filled) forms.
                $query->whereIn('status', ['submitted', 'approved', 'rejected']);
            }

            $rows = $query->paginate($request->query('per_page', 200));
            $rows->through(function ($job) {
                return [
                    'id' => (int)$job->job_id,
                    'job_id' => (int)$job->job_id,
                    'profile_name' => $job->profile_name,
                    'company_name' => $job->company?->name,
                    'status' => $job->status, // Use raw status: draft, pending, submitted, approved, rejected
                    'last_completed_step' => $job->last_completed_step,
                    'is_editable' => !in_array($job->status, ['approved', 'rejected']),
                    'is_withdrawn' => $job->status === 'draft',
                    'created_at' => $job->updated_at ? $job->updated_at->toIso8601String() : null,
                ];
            });
            return response()->json($rows);
        }

        // DEFAULT: Candidate Applications (Student Applications)
        $query = JobApplication::with(['job.company']);
        
        if ($request->filled('job_id')) {
            $query->where('job_id', $request->job_id);
        }
        
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $rows = $query->paginate($request->query('per_page', 200));
        $rows->through(function ($app) {
            $stages = JobStage::where('job_id', $app->job_id)->orderBy('sequence')->get();
            $totalStages = $stages->count();
            $currentSequence = 0;
            if ($app->current_stage_id) {
                $current = $stages->firstWhere('id', $app->current_stage_id);
                $currentSequence = $current?->sequence ?? 0;
            }

            $progress = 0;
            if ($app->status === 'selected') {
                $progress = 100;
            } elseif ($app->status === 'rejected') {
                $progress = max(10, (int) round(($currentSequence / max($totalStages, 1)) * 100));
            } elseif ($totalStages > 0) {
                $progress = (int) round(($currentSequence / $totalStages) * 100);
            }

            return [
                'id' => $app->id,
                'job_id' => $app->job_id,
                'profile_name' => $app->job?->profile_name,
                'company_name' => $app->job?->company?->name,
                'status' => $app->status,
                'is_withdrawn' => false, // Student applications don't have withdrawal logic in schema yet
                'is_editable' => false,  // Student applications are submitted immediately
                'created_at' => ($app->application_date ?: $app->updated_at) ? ($app->application_date ?: $app->updated_at)->toIso8601String() : null,
                'total_stages' => $totalStages,
                'current_sequence' => $currentSequence,
                'progress_percent' => $progress,
            ];
        });

        return response()->json($rows);
    }

    public function update(Request $request, $id)
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        // Check if we are updating a JobProfile (Admin approval or Recruiter edit)
        // If the ID exists in job_profile but not in job_application, or if portal_type is sent
        $isJob = $request->has('portal_type') || !JobApplication::where('id', $id)->exists();

        if ($isJob) {
            $job = JobProfile::findOrFail($id);
            if ($user->role === 'recruiter' && (int)$job->company_id !== (int)$user->company_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $data = $request->validate([
                'status' => 'nullable|in:submitted,pending,draft,rejected,selected',
                'profile_name' => 'nullable|string'
            ]);

            if (isset($data['status']) && $data['status'] === 'selected') {
                $data['status'] = 'approved';
            }

            $job->update($data);
            return response()->json($job);
        }

        // Updating a candidate application
        $application = JobApplication::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }

        $application->update($request->validate([
            'current_stage_id' => 'nullable|exists:job_stage,id',
            'status' => 'nullable|in:selected,rejected,in progress'
        ]));
        return response()->json($application);
    }

    public function withdraw($id)
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $job = JobProfile::find($id);
        if ($job) {
            if ($user->role === 'recruiter' && (int)$job->company_id !== (int)$user->company_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            // Allow withdrawing only if it's submitted or pending
            if (!in_array($job->status, ['submitted', 'pending'])) {
                return response()->json(['message' => 'Only submitted or pending profiles can be withdrawn.'], 400);
            }
            $job->status = 'draft';
            $job->save();
            return response()->json(['message' => 'Submission withdrawn.']);
        }

        $app = JobApplication::find($id);
        if ($app) {
            $app->status = 'rejected'; // Or some other status to indicate withdrawal
            $app->is_withdrawn = true;
            $app->save();
            return response()->json(['message' => 'Application withdrawn.']);
        }

        return response()->json(['message' => 'Not found'], 404);
    }

    public function show($id)
    {
        $user = auth('api')->user();
        $app = JobApplication::find($id);
        if ($app) {
            return response()->json($app);
        }
        $job = JobProfile::findOrFail($id);
        return response()->json($job);
    }

    public function submit(Request $request, $id)
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $application = JobApplication::findOrFail($id);
        
        // Ownership check
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }

        $application->update(['is_draft' => false, 'status' => 'in progress']);
        return response()->json(['message' => 'Application submitted successfully.']);
    }

    public function moveToNextStage(Request $request, $id)
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        if ($user->role !== 'admin' && $user->role !== 'recruiter') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $application = JobApplication::findOrFail($id);
        
        // Ownership check for recruiter
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }

        $stages = JobStage::where('job_id', $application->job_id)->orderBy('sequence')->get();
        $currentStage = $stages->firstWhere('id', $application->current_stage_id);
        $nextStage = $stages->where('sequence', '>', $currentStage?->sequence ?? 0)->first();

        if ($nextStage) {
            $application->update(['current_stage_id' => $nextStage->id]);
            return response()->json(['message' => 'Moved to next stage: ' . $nextStage->stage_id]);
        }

        return response()->json(['message' => 'No more stages left.'], 400);
    }

    public function export(Request $request)
    {
        return response()->json(['message' => 'Export feature coming soon.'], 501);
    }

    public function destroy($id)
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $application = JobApplication::find($id);
        if ($application) {
            if ($user->role === 'recruiter') {
                $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
                if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
            }
            $application->delete();
            return response()->json(null, 204);
        }

        $job = JobProfile::find($id);
        if ($job) {
            if ($user->role === 'recruiter' && (int)$job->company_id !== (int)$user->company_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            // Only allow deleting draft or pending jobs
            if (!in_array($job->status, ['draft', 'pending'])) {
                return response()->json(['message' => 'Only draft or pending profiles can be deleted.'], 400);
            }
            $job->delete();
            return response()->json(null, 204);
        }

        return response()->json(['message' => 'Not found'], 404);
    }
}
