<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ContactPerson;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Auth;
use Tymon\JWTAuth\Facades\JWTAuth;
use Throwable;

use App\Mail\RegisterOtpMail;
use App\Mail\RegistrationSuccessfulMail;
use App\Mail\PasswordResetOtpMail;
use App\Mail\RecruiterRegistrationPendingMail;
use Illuminate\Support\Facades\Cache;

class AuthController extends Controller
{
    public function registerRequest(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users,email',
        ]);

        $email = strtolower($data['email']);
        $otp = rand(100000, 999999);
        Cache::put('otp_'.$email, $otp, now()->addMinutes(10));

        try {
            Mail::to($email)->send(new RegisterOtpMail($otp));
            Log::info("OTP for {$email}: $otp");
        } catch (Throwable $e) {
            Log::error("Failed to send OTP: " . $e->getMessage());
            return response()->json(['message' => 'Failed to send OTP. Please check your email configuration.'], 500);
        }

        return response()->json(['message' => 'OTP sent successfully.']);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
            'registration_data' => 'required|array',
        ]);

        $email = strtolower($data['email']);
        $cacheKey = 'otp_'.$email;
        $storedOtp = Cache::get($cacheKey);

        Log::info("Verifying OTP for email: {$email}");
        Log::info("Cache key: {$cacheKey}");
        Log::info("Stored OTP: " . ($storedOtp ?? 'NULL'));
        Log::info("Provided OTP: {$data['otp']}");

        if (!$storedOtp || $data['otp'] !== (string)$storedOtp) {
            return response()->json(['message' => 'Wrong OTP entered. Please try again.'], 422);
        }

        $response = $this->register($request->merge($data['registration_data']));

        if ($response->getStatusCode() === 201) {
            Cache::forget($cacheKey);
        } else {
            Log::error("Registration failed during OTP verification for {$email}: " . json_encode($response->getData()));
        }

        return $response;
    }

    public function resendOtp(Request $request)
    {
        return $this->registerRequest($request);
    }

    public function register(Request $request)
    {
        Log::info("Registering user: " . $request->input('email'));
        try {
            $request->merge([
                'landline' => filled($request->input('landline')) ? $request->input('landline') : null,
                'company_social_media' => filled($request->input('company_social_media')) ? $request->input('company_social_media') : null,
            ]);

            $data = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:8',
                'company_name' => 'required|string|max:255',
                'street' => 'required|string|max:255',
                'city' => 'required|string|max:100',
                'state' => 'required|string|max:100',
                'country' => 'required|string|max:100',
                'pincode' => 'required|string|max:20',
                'postal_address' => 'required|string|max:500',
                'phone' => 'required|string|max:20',
                'landline' => 'nullable|string|max:20',
                'company_website' => 'required|url|max:255',
                'company_social_media' => 'nullable|string|max:255',
                'company_established_year' => 'required|integer|min:1800|max:2100',
                'company_turnover' => 'required|string|max:255',
                'num_employees' => 'required|integer|min:1',
                'company_sectors' => 'required|array|min:1',
                'contact_hr.name' => 'required|string|max:255',
                'contact_hr.designation' => 'required|string|max:255',
                'contact_hr.email' => 'required|email|max:255',
                'contact_hr.phone' => 'required|string|max:20',
                'contact_2.name' => 'required|string|max:255',
                'contact_2.designation' => 'required|string|max:255',
                'contact_2.email' => 'required|email|max:255',
                'contact_2.phone' => 'required|string|max:20',
                'contact_3.name' => 'nullable|string|max:255',
                'contact_3.designation' => 'required_with:contact_3.name|nullable|string|max:255',
                'contact_3.email' => 'required_with:contact_3.name|nullable|email|max:255',
                'contact_3.phone' => 'required_with:contact_3.name|nullable|string|max:20',
            ]);

            if (!$this->designationLooksLikeTalentAcquisition($data['contact_hr']['designation'])) {
                Log::warning("Designation check failed for: " . $data['contact_hr']['designation']);
                return response()->json([
                    'message' => 'The lead contact must be designated as Head of Talent Acquisition (or equivalent).',
                    'errors' => ['contact_hr.designation' => ['Must be a Talent Acquisition lead role.']],
                ], 422);
            }

            $existingCompany = Company::where('name', $data['company_name'])->first();
            if ($existingCompany && User::where('company_id', $existingCompany->company_id)->where('role', 'recruiter')->exists()) {
                Log::warning("Company already registered: " . $data['company_name']);
                return response()->json([
                    'message' => 'A recruiter account is already registered for this company. Only one account is allowed per company.',
                ], 422);
            }

            $company = Company::firstOrCreate(
                ['name' => $data['company_name']],
                [
                    'street' => $data['street'],
                    'city' => $data['city'],
                    'state' => $data['state'],
                    'country' => $data['country'],
                    'pincode' => $data['pincode'],
                    'postal_address' => $data['postal_address'],
                    'phone' => $data['phone'],
                    'landline' => $data['landline'] ?? null,
                    'website' => $data['company_website'],
                    'social_media' => $data['company_social_media'] ?? null,
                    'established_year' => $data['company_established_year'],
                    'annual_turnover' => $data['company_turnover'],
                    'employee_count' => $data['num_employees'],
                    'sectors' => $data['company_sectors'],
                ]
            );

            if (!$company->wasRecentlyCreated) {
                $company->update([
                    'street' => $data['street'],
                    'city' => $data['city'],
                    'state' => $data['state'],
                    'country' => $data['country'],
                    'pincode' => $data['pincode'],
                    'postal_address' => $data['postal_address'],
                    'phone' => $data['phone'],
                    'landline' => $data['landline'] ?? null,
                    'website' => $data['company_website'],
                    'social_media' => $data['company_social_media'] ?? null,
                    'established_year' => $data['company_established_year'],
                    'annual_turnover' => $data['company_turnover'],
                    'employee_count' => $data['num_employees'],
                    'sectors' => $data['company_sectors'],
                ]);
            }

            $data['email'] = strtolower($data['email']);

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'recruiter',
                'company_id' => $company->company_id,
                'is_approved' => false,
            ]);

            $this->syncRegistrationContacts($company->company_id, $data['company_name'], $data);

            Log::info("User created successfully: " . $user->email);

            try {
                Mail::to($user->email)->send(new RegistrationSuccessfulMail($user, $company));
                
                // Notify Admin(s)
                $adminEmails = User::where('role', 'admin')->pluck('email')->toArray();
                if (!empty($adminEmails)) {
                    Mail::to($adminEmails)->send(new RecruiterRegistrationPendingMail($user));
                } else {
                    $adminEmail = env('ADMIN_EMAIL', 'admin@example.com');
                    Mail::to($adminEmail)->send(new RecruiterRegistrationPendingMail($user));
                }
            } catch (Throwable $e) {
                Log::warning('Registration notification mails failed: '.$e->getMessage());
            }

            return response()->json(['message' => 'Registration completed successfully.'], 201);
        } catch (Throwable $e) {
            Log::error("Registration error: " . $e->getMessage());
            return response()->json(['message' => 'Registration failed: ' . $e->getMessage()], 500);
        }
    }

    private function designationLooksLikeTalentAcquisition(string $designation): bool
    {
        $d = mb_strtolower($designation);
        $hasTa = str_contains($d, 'talent') || str_contains($d, 'acquisition') || str_contains($d, 'hr') || str_contains($d, 'human resource') || str_contains($d, 'recruitment');
        $hasHeadRole = (bool) preg_match('/\b(head|chief|director|vp|vice president|manager|lead|recruiter|specialist|officer|executive)\b/', $d);

        return $hasTa && $hasHeadRole;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function syncRegistrationContacts(int $companyId, string $defaultEmployerName, array $data): void
    {
        ContactPerson::where('company_id', $companyId)->delete();

        $rows = [
            array_merge($data['contact_hr'], ['is_primary' => true]),
            array_merge($data['contact_2'], ['is_primary' => false]),
        ];
        if (!empty($data['contact_3']['name']) || !empty($data['contact_3']['email'])) {
            $rows[] = array_merge($data['contact_3'], ['is_primary' => false]);
        }

        foreach ($rows as $row) {
            if (empty($row['name']) && empty($row['email'])) {
                continue;
            }
            ContactPerson::create([
                'company_id' => $companyId,
                'employer_company_name' => $defaultEmployerName,
                'name' => $row['name'] ?? '',
                'designation' => $row['designation'] ?? '',
                'email' => $row['email'] ?? '',
                'mobile_no' => $row['phone'] ?? '',
                'is_primary' => (bool) ($row['is_primary'] ?? false),
            ]);
        }
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $credentials['email'] = strtolower($credentials['email']);
        Log::info("Login attempt for: " . $credentials['email']);

        if (!$token = Auth::guard('api')->attempt($credentials)) {
            Log::warning("Login failed for: " . $credentials['email']);
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = Auth::guard('api')->user();

        if ($user->role === 'recruiter' && !$user->is_approved) {
            Auth::guard('api')->logout();
            return response()->json(['message' => 'Your account is pending approval by the placement admin.'], 403);
        }

        Log::info("Login successful for user: {$user->email}");
        Log::info("Generated token: " . substr($token, 0, 20) . "...");

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => $user,
                'debug' => [
                    'guard' => 'api',
                    'auth_check' => Auth::guard('api')->check(),
                    'user_id' => Auth::guard('api')->id(),
                ]
            ]
        ]);
    }

    public function me()
    {
        return response()->json(['data' => Auth::guard('api')->user()]);
    }

    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());
        return response()->json(['message' => 'Logged out']);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $otp = rand(100000, 999999);
        Cache::put('password_reset_otp_'.$data['email'], $otp, now()->addMinutes(10));

        try {
            Mail::to($data['email'])->send(new PasswordResetOtpMail($otp));
            Log::info("Password reset OTP for {$data['email']}: $otp");
        } catch (Throwable $e) {
            Log::error("Failed to send password reset OTP: " . $e->getMessage());
            return response()->json(['message' => 'Failed to send OTP. Please check your email configuration.'], 500);
        }

        return response()->json(['message' => 'OTP sent successfully.']);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $storedOtp = Cache::get('password_reset_otp_'.$data['email']);
        if (!$storedOtp || $data['otp'] !== (string)$storedOtp) {
            return response()->json(['message' => 'Wrong OTP entered. Please try again.'], 422);
        }

        $user = User::where('email', $data['email'])->first();
        $user->password = Hash::make($data['password']);
        $user->save();

        Cache::forget('password_reset_otp_'.$data['email']);

        return response()->json(['message' => 'Password reset successfully.']);
    }
}
