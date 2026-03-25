<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactPerson extends Model
{
    protected $table = 'contact_person';
    protected $fillable = [
        'company_id', 'name', 'designation', 'email', 'mobile_no', 'is_primary'
    ];
}
