<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Eligibility extends Model
{
    protected $table = 'eligibility';

    protected $fillable = [
        'job_id', 'min_cgpa', 'gender', 'slp_requirement', 'disciplines_json'
    ];

    protected $casts = [
        'disciplines_json' => 'array'
    ];
}
