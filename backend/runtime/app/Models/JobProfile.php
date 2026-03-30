<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JobProfile extends Model
{
    protected $table = 'job_profile';
    protected $primaryKey = 'job_id';

    protected $fillable = [
        'company_id', 'cycle_id', 'job_type', 'profile_name', 'job_designation', 
        'place_of_posting', 'description', 'location', 'work_mode', 
        'offline_job_location', 'expected_hires', 'min_hires', 'required_skills',
        'training_period', 'bond', 'registration_link', 'joining_month',
        'onboarding_procedure', 'additional_info', 'additional_info_1000', 
        'job_categories', 'status', 'last_completed_step',
        'has_psychometric_test', 'has_medical_test', 'other_screening_details',
        'parent_job_id'
    ];

    protected $casts = [
        'job_categories' => 'array',
        'required_skills' => 'array',
        'has_psychometric_test' => 'boolean',
        'has_medical_test' => 'boolean',
        'last_completed_step' => 'integer',
        'parent_job_id' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(JobProfile::class, 'parent_job_id', 'job_id');
    }

    public function duplicates(): HasMany
    {
        return $this->hasMany(JobProfile::class, 'parent_job_id', 'job_id');
    }

    public function stages(): HasMany
    {
        return $this->hasMany(JobStage::class, 'job_id', 'job_id');
    }

    public function salary(): HasOne
    {
        return $this->hasOne(Salary::class, 'job_id', 'job_id');
    }

    public function eligibility(): HasOne
    {
        return $this->hasOne(Eligibility::class, 'job_id', 'job_id');
    }

    public function declaration(): HasOne
    {
        return $this->hasOne(Declaration::class, 'job_id', 'job_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id', 'company_id');
    }
}
