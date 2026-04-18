<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlumniMentorship extends Model
{
    protected $table = 'alumni_mentorship';
    protected $fillable = [
        'email',
        'name',
        'phone_number',
        'year_of_completion',
        'degree',
        'discipline',
        'current_job',
        'areas_of_interest',
        'linkedin_profile',
        'general_comments',
        'status',
        'edit_count'
    ];
}
