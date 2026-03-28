<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $table = 'company';
    protected $primaryKey = 'company_id';

    protected $fillable = [
        'name', 'website', 'postal_address', 'employee_count', 'sector',
        'logo_path', 'allow_nirf_sharing', 'established_year', 'social_media',
        'street', 'city', 'state', 'country', 'pincode', 'phone', 'landline',
        'annual_turnover', 'num_employees', 'sectors'
    ];

    protected $casts = [
        'sectors' => 'array',
        'allow_nirf_sharing' => 'boolean',
    ];

    public function contacts(): HasMany
    {
        return $this->hasMany(ContactPerson::class, 'company_id', 'company_id');
    }
}
