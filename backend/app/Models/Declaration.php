<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Declaration extends Model
{
    protected $table = 'declaration';
    protected $fillable = ['job_id', 'agreed', 'agreed_at', 'agreed_by_user_id', 'declaration_text'];
}
