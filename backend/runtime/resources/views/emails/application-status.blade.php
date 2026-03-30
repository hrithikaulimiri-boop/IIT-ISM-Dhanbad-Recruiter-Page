<!DOCTYPE html>
<html>
<head>
    <title>Application Status Updated</title>
</head>
<body style="font-family: sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #00796b;">Application Status Update</h2>
        <p>Hello {{ $application->candidate_name ?? 'Candidate' }},</p>
        
        <p>
            This is to inform you that the status of your application for the profile 
            <strong>{{ optional($application->job)->profile_name ?? 'N/A' }}</strong> 
            @if($application->job && $application->job->company)
                at <strong>{{ $application->job->company->name }}</strong>
            @endif
            has been updated.
        </p>

        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
            @if(($status ?? '') === 'selected')
                <span style="font-size: 18px; font-weight: bold; color: #2e7d32;">
                    Status: APPROVED / SELECTED
                </span>
            @else
                <span style="font-size: 18px; font-weight: bold; color: #d32f2f;">
                    Status: REJECTED
                </span>
            @endif
        </div>

        <p>Please log in to the portal for further details.</p>
        
        <div style="margin: 20px 0; text-align: center;">
            <a href="{{ url('/login') }}" style="background-color: #00796b; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
        </div>
        
        <p>Regards,<br>IIT-ISM Placement Cell</p>
    </div>
</body>
</html>
