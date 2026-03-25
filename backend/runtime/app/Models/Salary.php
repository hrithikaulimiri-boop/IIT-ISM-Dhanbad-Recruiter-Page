<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salary extends Model
{
    protected $table = 'salary';
    protected $primaryKey = 'salary_id';
    protected $fillable = [
        'job_id', 'ctc_lpa', 'fixed_component', 'joining_bonus',
        'retention_bonus', 'variable_component', 'esops', 'stocks_options',
        'stipend', 'internship_duration', 'currency'
    ];
}
