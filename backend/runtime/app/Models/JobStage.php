<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobStage extends Model
{
    protected $table = 'job_stage';

    protected $fillable = [
        'job_id', 'stage_id', 'sequence', 'duration', 'start_time', 'end_time',
        'selection_mode', 'test_type', 'interview_mode', 'infrastructure_requirements'
    ];
}
