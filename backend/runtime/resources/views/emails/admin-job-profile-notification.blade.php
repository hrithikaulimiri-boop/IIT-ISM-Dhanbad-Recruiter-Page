<!DOCTYPE html>
<html>
<head>
    <title>New Job Profile Submitted</title>
</head>
<body>
    <h2>New {{ $job->job_type }} Submission Received</h2>
    <p>A new <strong>{{ $job->job_type }}</strong> profile has been submitted for approval by <strong>{{ $job->company->name }}</strong>.</p>
    <p><strong>Submission Details:</strong></p>
    <ul>
        <li><strong>Company:</strong> {{ $job->company->name }}</li>
        <li><strong>Profile Name:</strong> {{ $job->profile_name }}</li>
        <li><strong>Job Designation:</strong> {{ $job->job_designation }}</li>
        <li><strong>Location:</strong> {{ $job->location }}</li>
        <li><strong>Submitted On:</strong> {{ $job->updated_at->format('F j, Y, g:i a') }}</li>
    </ul>
    <p>Please log in to the admin portal to review and approve/reject the application.</p>
    <br>
    <p>Best Regards,</p>
    <p>Campus Recruitment System</p>
</body>
</html>
