<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobProfile;
use App\Models\RecruitmentCycle;

class DashboardController extends Controller
{
    public function analytics()
    {
        $user = auth('api')->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $jobQuery = JobProfile::query();
        $appQuery = JobApplication::query();

        if ($user->role === 'recruiter') {
            $jobQuery->where('company_id', $user->company_id);
            $appQuery->whereHas('job', function ($q) use ($user) {
                $q->where('company_id', $user->company_id);
            });
        }

        return response()->json([
            'total_jobs' => $jobQuery->count(),
            'active_applications' => (clone $appQuery)->where('status', 'in progress')->count(),
            'recruitment_cycles' => RecruitmentCycle::count(), // Cycles are global for now
            'status_breakdown' => [
                'selected' => (clone $appQuery)->where('status', 'selected')->count(),
                'rejected' => (clone $appQuery)->where('status', 'rejected')->count(),
                'in_progress' => (clone $appQuery)->where('status', 'in progress')->count(),
            ],
        ]);
    }
}
