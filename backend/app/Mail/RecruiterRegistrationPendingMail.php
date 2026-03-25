<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RecruiterRegistrationPendingMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function build()
    {
        return $this->from(env('MAIL_FROM_ADDRESS', 'no-reply@itism.ac.in'), 'IIT ISM Dhanbad Placement Cell')
            ->subject('New Recruiter Registration Pending Approval')
            ->html("<p>New recruiter registered: {$this->user->name} ({$this->user->email})</p>");
    }
}
