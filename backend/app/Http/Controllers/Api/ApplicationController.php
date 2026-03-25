<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use App\Models\JobProfile;
use App\Models\JobStage;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = JobApplication::query();
        if ($request->filled('job_id')) $query->where('job_id', $request->job_id);
        if ($request->filled('status')) $query->where('status', $request->status);

        if ($user->role === 'recruiter') {
            $jobIds = JobProfile::where('company_id', $user->company_id)->pluck('job_id');
            $query->whereIn('job_id', $jobIds);
        }

        $rows = $query->paginate();
        $rows->getCollection()->transform(function ($app) {
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

            $app->total_stages = $totalStages;
            $app->current_sequence = $currentSequence;
            $app->progress_percent = $progress;
            return $app;
        });

        return response()->json($rows);
    }

    public function show($id)
    {
        $user = auth()->user();
        $app = JobApplication::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $app->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($app);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $data = $request->validate([
            'job_id' => 'required|exists:job_profile,job_id',
            'candidate_name' => 'required|string',
            'candidate_email' => 'required|email',
            'current_stage_id' => 'nullable|exists:job_stage,id',
            'status' => 'required|in:selected,rejected,in progress',
            'application_date' => 'nullable|date',
        ]);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $data['job_id'])->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(JobApplication::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $user = auth()->user();
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

    public function moveToNextStage($id)
    {
        $user = auth()->user();
        $application = JobApplication::findOrFail($id);

        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $application->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
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
                $nextStage = $stages->first(fn($s) => $s->sequence > $current->sequence);
            }
        }

        if (!$nextStage) {
            $application->status = 'selected';
            $application->save();
            return response()->json([
                'message' => 'Application reached final stage and is marked selected',
                'data' => $application
            ]);
        }

        $application->current_stage_id = $nextStage->id;
        $application->status = 'in progress';
        $application->save();

        return response()->json([
            'message' => 'Application moved to next stage',
            'data' => $application
        ]);
    }

    public function destroy($id)
    {
        $user = auth()->user();
        $app = JobApplication::findOrFail($id);
        if ($user->role === 'recruiter') {
            $owns = JobProfile::where('job_id', $app->job_id)->where('company_id', $user->company_id)->exists();
            if (!$owns) return response()->json(['message' => 'Forbidden'], 403);
        }
        $app->delete();
        return response()->json(['message' => 'Deleted']);
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
            public function __construct($rows) { $this->rows = $rows; }
            public function array(): array { return $this->rows; }
        }, 'applications.xlsx');
    }
}
