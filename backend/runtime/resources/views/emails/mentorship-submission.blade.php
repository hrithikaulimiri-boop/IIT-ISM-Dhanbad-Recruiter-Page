<!DOCTYPE html>
<html>
<head>
    <title>Mentorship Application Submitted</title>
</head>
<body>
    <h2>Hello {{ $application->name }},</h2>
    <p>Thank you for expressing interest in the Alumni Mentorship Program at IIT (ISM) Dhanbad.</p>
    <p>We have successfully received your mentorship application with the following details:</p>
    <ul>
        <li><strong>Email:</strong> {{ $application->email }}</li>
        <li><strong>Degree:</strong> {{ $application->degree }}</li>
        <li><strong>Discipline:</strong> {{ $application->discipline }}</li>
        <li><strong>Current Job:</strong> {{ $application->current_job }}</li>
    </ul>
    <p>Your application is currently under review by the Career Development Centre (CDC). You will receive an update once the review process is complete.</p>
    <p>Thank you for your willingness to give back to the student community.</p>
    <br>
    <p>Best Regards,</p>
    <p>Career Development Centre (CDC)<br>IIT (ISM) Dhanbad</p>
</body>
</html>
