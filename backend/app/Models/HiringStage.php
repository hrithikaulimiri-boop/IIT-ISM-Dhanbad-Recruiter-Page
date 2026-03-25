<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HiringStage extends Model
{
    protected $table = 'hiring_stage';
    protected $primaryKey = 'stage_id';
    protected $fillable = ['name'];
}
