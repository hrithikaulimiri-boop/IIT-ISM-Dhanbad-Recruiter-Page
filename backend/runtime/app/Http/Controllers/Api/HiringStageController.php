<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HiringStage;

class HiringStageController extends Controller
{
    public function index()
    {
        return response()->json(['data' => HiringStage::orderBy('stage_id')->get()]);
    }
}
