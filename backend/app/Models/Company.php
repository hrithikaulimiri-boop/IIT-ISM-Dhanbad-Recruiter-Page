<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $primaryKey = 'company_id';

    protected $fillable = [
        'name', 'website', 'postal_address', 'employee_count', 'sector',
        'logo_path', 'allow_nirf_sharing'
    ];
}
