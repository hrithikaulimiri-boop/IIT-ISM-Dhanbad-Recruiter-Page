<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Eligibility extends Model
{
    protected $table = 'eligibility';

    protected $fillable = [
        'job_id', 'global_min_cgpa', 'global_max_backlogs', 'global_allow_backlogs',
        'high_school_percentage', 'gender_filter', 'disciplines_json'
    ];

    protected $casts = [
        'disciplines_json' => 'array',
        'global_allow_backlogs' => 'boolean',
    ];
}
