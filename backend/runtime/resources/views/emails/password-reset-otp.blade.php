<!DOCTYPE html>
<html>
<head>
    <title>Password Reset OTP</title>
</head>
<body style="font-family: sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #00796b;">IIT-ISM Dhanbad Recruiter Portal</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password. Please use the following 6-digit OTP to proceed:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 20px; background-color: #f5f5f5; text-align: center; border-radius: 5px; margin: 20px 0;">
            {{ $otp }}
        </div>
        <p>This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        <p>Regards,<br>IIT-ISM Placement Cell</p>
    </div>
</body>
</html>
