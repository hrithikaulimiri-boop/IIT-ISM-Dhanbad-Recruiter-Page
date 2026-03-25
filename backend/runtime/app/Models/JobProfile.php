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
        'company_id', 'cycle_id', 'job_type', 'profile_name', 'description',
        'location', 'work_mode', 'offline_job_location',
        'training_period', 'bond', 'registration_link', 'joining_month',
        'onboarding_procedure'
    ];

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
