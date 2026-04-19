<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobProfile;
use App\Models\JobStage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;
use App\Mail\ApplicationStatusUpdatedMail;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = auth('api')->user();
        $portalType = $request->query('portal') ?: $request->query('portal_type'); // 'JNF' or 'INF'

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
                    'job_type' => $job->job_type,
                    'profile_name' => $job->profile_name,
                    'company_name' => $job->company?->name,
                    'status' => $job->status, // Use raw status: draft, pending, submitted, approved, rejected
                    'last_completed_step' => $job->last_completed_step,
                    'is_editable' => !in_array($job->status, ['approved', 'rejected']),
                    'is_withdrawn' => $job->status === 'draft',
                    'admin_edited' => (bool)$job->admin_edited,
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
                    'job_type' => $job->job_type,
                    'profile_name' => $job->profile_name,
                    'company_name' => $job->company?->name,
                    'status' => $job->status, // Use raw status: draft, pending, submitted, approved, rejected
                    'last_completed_step' => $job->last_completed_step,
                    'is_editable' => !in_array($job->status, ['approved', 'rejected']),
                    'is_withdrawn' => $job->status === 'draft',
                    'admin_edited' => (bool)$job->admin_edited,
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
                'job_type' => $app->job?->job_type,
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
        $user = Auth::guard('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        // If the ID is clearly meant for a job profile (or we're in admin approval mode)
        $isJob = $request->input('is_job', false) || $request->has('portal_type');
        
        // If not explicitly set, try to guess: admins usually update job profiles from the submissions list
        if (!$isJob && $user->role === 'admin' && !JobApplication::where('id', $id)->exists()) {
            $isJob = true;
        }

        if ($isJob) {
            $job = JobProfile::find($id);
            
            // If not found in job_profile, maybe it WAS a student application after all
            if (!$job && !$request->has('is_job')) {
                return $this->updateApplication($request, $id, $user);
            }

            if (!$job) {
                return response()->json(['message' => 'Job profile not found'], 404);
            }
            
            if ($user->role === 'recruiter' && (int)$job->company_id !== (int)$user->company_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            
            $data = $request->validate([
                'status' => 'nullable|in:submitted,pending,draft,rejected,selected,approved',
                'profile_name' => 'nullable|string'
            ]);

            if ($user->role === 'admin' && isset($data['profile_name']) && $data['profile_name'] !== $job->profile_name) {
                if ($job->admin_edited) {
                    return response()->json(['message' => 'Admin can only edit this profile once.'], 403);
                }
                $data['admin_edited'] = true;
            }

            if (isset($data['status']) && $data['status'] === 'selected') {
                $data['status'] = 'approved';
            }

            $oldStatus = $job->status;
            $job->update($data);

            if (isset($data['status']) && $data['status'] === 'approved' && $oldStatus !== 'approved') {
                $job->load('company');
                // Send approval email to recruiter
                $recruiterEmails = User::where('company_id', $job->company_id)->where('role', 'recruiter')->pluck('email')->toArray();
                if (!empty($recruiterEmails)) {
                    try {
                        Mail::raw("Your {$job->job_type} application for profile '{$job->profile_name}' has been APPROVED by the placement admin.\n\nStudents can now see and apply to this job profile.", function ($msg) use ($job, $recruiterEmails) {
                            $msg->to($recruiterEmails)
                                ->from('no-reply@campus.local', 'Campus Recruitment System')
                                ->subject("JNF Approved: {$job->profile_name}");
                        });
                    } catch (\Throwable $e) {
                        Log::warning('Job approval mail failed: '.$e->getMessage());
                    }
                }
            }

            if (isset($data['status']) && $data['status'] === 'rejected' && $oldStatus !== 'rejected') {
                $job->load('company');
                // Send rejection email to recruiter
                $recruiterEmails = User::where('company_id', $job->company_id)->where('role', 'recruiter')->pluck('email')->toArray();
                if (!empty($recruiterEmails)) {
                    try {
                        Mail::raw("Your {$job->job_type} application for profile '{$job->profile_name}' has been REJECTED by the placement admin.\n\nPlease review the details and contact the placement cell if you have any questions.", function ($msg) use ($job, $recruiterEmails) {
                            $msg->to($recruiterEmails)
                                ->from('no-reply@campus.local', 'Campus Recruitment System')
                                ->subject("JNF Rejected: {$job->profile_name}");
                        });
                    } catch (\Throwable $e) {
                        Log::warning('Job rejection mail failed: '.$e->getMessage());
                    }
                }
            }

            return response()->json($job);
        }

        return $this->updateApplication($request, $id, $user);
    }

    private function updateApplication(Request $request, $id, $user)
    {
        $application = JobApplication::with(['job.company'])->find($id);
        if (!$application) {
            return response()->json(['message' => 'Application not found'], 404);
        }
        
        // Ownership check for recruiters
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }

        $application->update($request->validate([
            'current_stage_id' => 'nullable|integer',
            'status' => 'nullable|in:selected,rejected,in progress'
        ]));

        if ($request->has('status') && in_array($request->status, ['selected', 'rejected'])) {
            try {
                if ($application->candidate_email) {
                    Mail::to($application->candidate_email)->send(new ApplicationStatusUpdatedMail($application, $request->status));
                }
            } catch (\Exception $e) {
                Log::error("Failed to send application status email: " . $e->getMessage());
            }
        }

        return response()->json($application);
    }

    public function withdraw(Request $request, $id)
    {
        $user = Auth::guard('api')->user();
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
            return response()->json(['message' => 'Submission withdrawn.', 'job' => $job]);
        }

        $app = JobApplication::find($id);
        if ($app) {
            if ($user->role === 'recruiter') {
                $owns = JobProfile::where('job_id', $app->job_id)->where('company_id', $user->company_id)->exists();
                if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
            }
            $app->status = 'rejected'; 
            $app->save();
            return response()->json(['message' => 'Application withdrawn.', 'application' => $app]);
        }

        return response()->json(['message' => 'Not found'], 404);
    }

    public function show($id)
    {
        $user = Auth::guard('api')->user();
        $app = JobApplication::find($id);
        if ($app) {
            return response()->json($app);
        }
        $job = JobProfile::find($id);
        if ($job) {
            return response()->json($job);
        }
        return response()->json(['message' => 'Not found'], 404);
    }

    public function submit(Request $request, $id)
    {
        $user = Auth::guard('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $job = JobProfile::find($id);
        if ($job) {
            if ($user->role === 'recruiter' && (int)$job->company_id !== (int)$user->company_id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            $job->status = 'submitted';
            $job->save();
            return response()->json(['message' => 'Submitted for approval', 'job' => $job]);
        }

        $application = JobApplication::find($id);
        if ($application) {
            if ($user->role === 'recruiter') {
                $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
                if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
            }
            $application->update(['status' => 'in progress']);
            return response()->json(['message' => 'Application submitted successfully.']);
        }

        return response()->json(['message' => 'Not found'], 404);
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
        $user = Auth::guard('api')->user();
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
