<?php

namespace App\Http\Controllers\Api;

use App\Models\AlumniMentorship;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\MentorshipSubmissionMail;
use App\Mail\AdminMentorshipNotificationMail;

class AlumniMentorshipController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => AlumniMentorship::orderBy('created_at', 'desc')->get()
        ]);
    }

    public function store(Request $request)
    {
        $isDraft = $request->get('status') === 'draft';
        
        $rules = [
            'email' => 'required|email',
            'name' => $isDraft ? 'nullable|string' : 'required|string|max:255',
            'phone_number' => $isDraft ? 'nullable|string' : 'required|string|max:20',
            'year_of_completion' => $isDraft ? 'nullable|string' : 'required|string|max:4',
            'degree' => $isDraft ? 'nullable|string' : 'required|string',
            'discipline' => $isDraft ? 'nullable|string' : 'required|string',
            'current_job' => $isDraft ? 'nullable|string' : 'required|string',
            'areas_of_interest' => $isDraft ? 'nullable|string' : 'required|string',
            'linkedin_profile' => 'nullable|url',
            'general_comments' => 'nullable|string',
            'status' => 'required|in:draft,submitted,approved,rejected'
        ];

        $validated = $request->validate($rules);

        // Check the current status before updating
        $oldStatus = AlumniMentorship::where('email', $validated['email'])->value('status');

        // Check if we are updating an existing draft by email
        $application = AlumniMentorship::updateOrCreate(
            ['email' => $validated['email']],
            $validated
        );

        // Only send emails if transitioning to 'submitted' from anything else (usually 'draft' or new)
        if ($application->status === 'submitted' && $oldStatus !== 'submitted') {
            try {
                // Notify the Alumnus
                Mail::to($application->email)->send(new MentorshipSubmissionMail($application));
                
                // Notify Admins
                $adminEmails = User::where('role', 'admin')->pluck('email')->toArray();
                if (!empty($adminEmails)) {
                    Mail::to($adminEmails)->send(new AdminMentorshipNotificationMail($application));
                } else {
                    // Fallback to ADMIN_EMAIL if no admin users in DB
                    $adminEmail = env('ADMIN_EMAIL');
                    if ($adminEmail) {
                        Mail::to($adminEmail)->send(new AdminMentorshipNotificationMail($application));
                    }
                }
            } catch (\Exception $e) {
                Log::error("Failed to send alumni mentorship submission emails: " . $e->getMessage());
            }
        }

        return response()->json([
            'message' => $application->status === 'draft' ? 'Draft saved successfully!' : 'Application submitted successfully!',
            'data' => $application
        ], 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $application = AlumniMentorship::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected'
        ]);

        $application->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Application status updated successfully!',
            'data' => $application
        ]);
    }

    public function getByEmail($email)
    {
        $application = AlumniMentorship::where('email', $email)->first();
        if (!$application) {
            return response()->json(['message' => 'No application found'], 404);
        }
        return response()->json(['data' => $application]);
    }
}
