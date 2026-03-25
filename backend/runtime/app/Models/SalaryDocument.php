<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryDocument extends Model
{
    protected $table = 'salary_document';
    protected $fillable = ['salary_id', 'file_name', 'file_path', 'mime_type', 'size'];
}
