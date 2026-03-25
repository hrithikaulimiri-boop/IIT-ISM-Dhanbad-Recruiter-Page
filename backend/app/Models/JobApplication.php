<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $table = 'job_application';

    protected $fillable = [
        'job_id', 'candidate_name', 'candidate_email', 'current_stage_id',
        'status', 'application_date', 'updated_at'
    ];

    const UPDATED_AT = 'updated_at';
    const CREATED_AT = null;
}
