<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Declaration extends Model
{
    protected $table = 'declaration';

    protected $fillable = [
        'job_id', 'agreed', 'agreed_at', 'agreed_by_user_id', 
        'aipc_guidelines', 'authorised_signatory_name', 
        'authorised_signatory_designation', 'authorised_signatory_date',
        'typed_signature', 'rti_nirf_consent', 'declaration_text'
    ];

    protected $casts = [
        'aipc_guidelines' => 'array',
        'agreed' => 'boolean',
        'rti_nirf_consent' => 'boolean',
    ];
}
