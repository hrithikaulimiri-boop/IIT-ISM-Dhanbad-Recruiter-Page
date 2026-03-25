<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobDocument extends Model
{
    protected $table = 'job_document';
    protected $fillable = ['job_id', 'file_name', 'file_path', 'mime_type', 'size'];
}
