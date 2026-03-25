<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyDocument extends Model
{
    protected $table = 'company_document';
    protected $fillable = ['company_id', 'file_name', 'file_path', 'mime_type', 'size'];
}
