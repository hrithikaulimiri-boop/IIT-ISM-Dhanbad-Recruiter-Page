<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecruitmentCycle;
use Illuminate\Http\Request;

class RecruitmentCycleController extends Controller
{
    public function index() { return response()->json(RecruitmentCycle::paginate()); }
    public function show($id) { return response()->json(RecruitmentCycle::findOrFail($id)); }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);
        return response()->json(RecruitmentCycle::create($data), 201);
    }

    public function update(Request $request, $id)
    {
        $cycle = RecruitmentCycle::findOrFail($id);
        $cycle->update($request->all());
        return response()->json($cycle);
    }

    public function destroy($id)
    {
        RecruitmentCycle::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
