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
        return response()->json([
            'total_jobs' => JobProfile::count(),
            'active_applications' => JobApplication::where('status', 'in progress')->count(),
            'recruitment_cycles' => RecruitmentCycle::count(),
            'status_breakdown' => [
                'selected' => JobApplication::where('status', 'selected')->count(),
                'rejected' => JobApplication::where('status', 'rejected')->count(),
                'in_progress' => JobApplication::where('status', 'in progress')->count(),
            ],
        ]);
    }
}
