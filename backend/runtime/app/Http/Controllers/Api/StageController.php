<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobProfile;
use App\Models\JobStage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StageController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::guard('api')->user();
        $query = JobStage::query();

        if ($request->filled('job_id')) $query->where('job_id', $request->job_id);

        if ($user->role === 'recruiter') {
            $jobIds = JobProfile::where('company_id', $user->company_id)->pluck('job_id');
            $query->whereIn('job_id', $jobIds);
        }

        return response()->json($query->orderBy('sequence')->paginate());
    }

    public function show($id)
    {
        $user = Auth::guard('api')->user();
        $stage = JobStage::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $stage->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($stage);
    }

    public function store(Request $request)
    {
        $user = Auth::guard('api')->user();
        $data = $request->validate([
            'job_id' => 'required|exists:job_profile,job_id',
            'stage_id' => 'required|exists:hiring_stage,stage_id',
            'sequence' => 'required|integer|min:1',
            'duration' => 'nullable|string',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
        ]);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $data['job_id'])->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(JobStage::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::guard('api')->user();
        $stage = JobStage::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $stage->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }
        $stage->update($request->all());
        return response()->json($stage);
    }

    public function destroy($id)
    {
        $user = Auth::guard('api')->user();
        $stage = JobStage::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $stage->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }
        $stage->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
