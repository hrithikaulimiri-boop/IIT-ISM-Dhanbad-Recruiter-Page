<!DOCTYPE html>
<html>
<head>
    <title>New Mentorship Application Received</title>
</head>
<body>
    <h2>New Mentorship Application Received</h2>
    <p>A new application for the Alumni Mentorship Program has been submitted by an alumnus.</p>
    <p><strong>Details:</strong></p>
    <ul>
        <li><strong>Name:</strong> {{ $application->name }}</li>
        <li><strong>Email:</strong> {{ $application->email }}</li>
        <li><strong>Degree:</strong> {{ $application->degree }}</li>
        <li><strong>Discipline:</strong> {{ $application->discipline }}</li>
        <li><strong>Current Job:</strong> {{ $application->current_job }}</li>
        <li><strong>Year of Completion:</strong> {{ $application->year_of_completion }}</li>
    </ul>
    <p>Please log in to the admin portal to review the application.</p>
    <br>
    <p>Best Regards,</p>
    <p>Placement Portal System</p>
</body>
</html>
