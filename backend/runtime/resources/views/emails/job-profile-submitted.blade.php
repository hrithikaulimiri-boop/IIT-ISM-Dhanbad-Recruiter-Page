<!DOCTYPE html>
<html>
<head>
    <title>Submission Received</title>
</head>
<body>
    <h2>Hello {{ $job->company->name }},</h2>
    <p>Thank you for submitting the <strong>{{ $job->job_type }}</strong> form for the profile <strong>{{ $job->profile_name }}</strong>.</p>
    <p>We have successfully received your submission. It is currently under review by the Career Development Centre (CDC) at IIT (ISM) Dhanbad.</p>
    <p><strong>Submission Details:</strong></p>
    <ul>
        <li><strong>Job Type:</strong> {{ $job->job_type }}</li>
        <li><strong>Profile Name:</strong> {{ $job->profile_name }}</li>
        <li><strong>Job Designation:</strong> {{ $job->job_designation }}</li>
        <li><strong>Submitted On:</strong> {{ $job->updated_at->format('F j, Y, g:i a') }}</li>
    </ul>
    <p>You will receive another notification once your application is approved or rejected.</p>
    <br>
    <p>Best Regards,</p>
    <p>Career Development Centre (CDC)<br>IIT (ISM) Dhanbad</p>
</body>
</html>
