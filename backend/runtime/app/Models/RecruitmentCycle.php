<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecruitmentCycle extends Model
{
    protected $table = 'recruitment_cycle';
    protected $primaryKey = 'cycle_id';
    protected $fillable = ['name', 'start_date', 'end_date', 'is_active'];
}
