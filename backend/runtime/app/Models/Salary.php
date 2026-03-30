<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salary extends Model
{
    protected $table = 'salary';
    protected $primaryKey = 'salary_id';
    protected $fillable = [
        'job_id', 'currency', 'stipend', 'internship_duration', 
        'different_structure_per_programme', 'salaries_json', 
        'additional_components', 'ctc_lpa'
    ];

    protected $casts = [
        'different_structure_per_programme' => 'boolean',
        'salaries_json' => 'array',
        'additional_components' => 'array',
    ];
}
