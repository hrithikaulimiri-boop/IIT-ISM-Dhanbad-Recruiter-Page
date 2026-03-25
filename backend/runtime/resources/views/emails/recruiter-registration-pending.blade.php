<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recruiter Registration Pending</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
    <h2>New recruiter registration pending approval</h2>
    <p>A recruiter has submitted a registration request.</p>
    <p><strong>Name:</strong> {{ $user->name }}</p>
    <p><strong>Email:</strong> {{ $user->email }}</p>
    <p><strong>Company ID:</strong> {{ $user->company_id ?? 'N/A' }}</p>
    <p><strong>Portal Type:</strong> {{ $user->portal_type ?? 'N/A' }}</p>
    <p>Please review and approve this recruiter from the admin panel.</p>
</body>
</html>
