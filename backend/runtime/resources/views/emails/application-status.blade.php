<!DOCTYPE html>
<html>
<head>
    <title>Application Status Updated</title>
</head>
<body style="font-family: sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #00796b;">Application Status Update</h2>
        <p>Hello,</p>
        <p>This is to inform you that the status of your application for the profile <strong>{{ $application->jobProfile->profile_name }}</strong> has been updated.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
            <span style="font-size: 18px; font-weight: bold; color: {{ $status === 'selected' ? '#2e7d32' : '#d32f2f' }};">
                Status: {{ $status === 'selected' ? 'APPROVED' : 'REJECTED' }}
            </span>
        </div>
        <p>Please log in to the portal for further details.</p>
        <div style="margin: 20px 0; text-align: center;">
            <a href="{{ config('app.url') }}/login" style="background-color: #00796b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
        </div>
        <p>Regards,<br>IIT-ISM Placement Cell</p>
    </div>
</body>
</html>
