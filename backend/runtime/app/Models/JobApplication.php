<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    protected $table = 'job_application';

    protected $fillable = [
        'job_id', 'candidate_name', 'candidate_email', 'current_stage_id',
        'status', 'application_date', 'updated_at', 'edit_count', 'is_withdrawn',
        'is_draft', 'draft_payload',
    ];

    protected $casts = [
        'is_draft' => 'boolean',
        'draft_payload' => 'array',
        'is_withdrawn' => 'boolean',
    ];

    const UPDATED_AT = 'updated_at';
    const CREATED_AT = null;

    public function job(): BelongsTo
    {
        return $this->belongsTo(JobProfile::class, 'job_id', 'job_id');
    }
}
