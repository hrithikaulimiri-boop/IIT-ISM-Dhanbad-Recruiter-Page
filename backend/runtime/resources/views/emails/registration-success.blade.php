<!DOCTYPE html>
<html>
<head>
    <title>Registration Successful</title>
</head>
<body style="font-family: sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #00796b;">Registration Successful!</h2>
        <p>Dear {{ $user->name }},</p>
        <p>Congratulations! Your recruiter account for <strong>{{ $company->name }}</strong> has been successfully registered with the IIT-ISM Dhanbad Recruiter Portal.</p>
        <p>You can now log in to your dashboard to post job/internship notifications and manage applications.</p>
        <div style="margin: 20px 0; text-align: center;">
            <a href="{{ config('app.url') }}/login" style="background-color: #00796b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Portal</a>
        </div>
        <p>If you have any questions, please feel free to contact the placement cell.</p>
        <p>Regards,<br>IIT-ISM Placement Cell</p>
    </div>
</body>
</html>
