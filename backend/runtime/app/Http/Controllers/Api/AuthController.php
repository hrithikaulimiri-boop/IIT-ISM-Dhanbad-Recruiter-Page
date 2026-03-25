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
use Tymon\JWTAuth\Facades\JWTAuth;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request)
    {
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
            'country' => 'required|string|max:100',
            'pincode' => 'required|string|max:20',
            'postal_address' => 'required|string|max:500',
            'phone' => 'required|string|max:20',
            'landline' => 'nullable|string|max:20',
            'company_website' => 'required|url|max:255',
            'company_social_media' => 'nullable|string|max:255',
            'company_established_year' => 'required|integer|min:1800|max:2100',
            'contact_hr.name' => 'required|string|max:255',
            'contact_hr.designation' => 'required|string|max:255',
            'contact_hr.email' => 'required|email|max:255',
            'contact_hr.phone' => 'required|string|max:20',
            'contact_hr.company_name' => 'nullable|string|max:255',
            'contact_2.name' => 'required|string|max:255',
            'contact_2.designation' => 'required|string|max:255',
            'contact_2.email' => 'required|email|max:255',
            'contact_2.phone' => 'required|string|max:20',
            'contact_2.company_name' => 'nullable|string|max:255',
            'contact_3.name' => 'nullable|string|max:255',
            'contact_3.designation' => 'required_with:contact_3.name|nullable|string|max:255',
            'contact_3.email' => 'required_with:contact_3.name|nullable|email|max:255',
            'contact_3.phone' => 'required_with:contact_3.name|nullable|string|max:20',
            'contact_3.company_name' => 'nullable|string|max:255',
        ]);

        if (!$this->designationLooksLikeHeadOfHr($data['contact_hr']['designation'])) {
            return response()->json([
                'message' => 'The HR contact must be designated as Head of HR (or equivalent, e.g. Chief Human Resources Officer).',
                'errors' => ['contact_hr.designation' => ['Must be a Head of HR role.']],
            ], 422);
        }

        $existingCompany = Company::where('name', $data['company_name'])->first();
        if ($existingCompany && User::where('company_id', $existingCompany->company_id)->where('role', 'recruiter')->exists()) {
            return response()->json([
                'message' => 'A recruiter account is already registered for this company. Only one account is allowed per company.',
            ], 422);
        }

        $company = Company::firstOrCreate(
            ['name' => $data['company_name']],
            [
                'street' => $data['street'],
                'city' => $data['city'],
                'country' => $data['country'],
                'pincode' => $data['pincode'],
                'postal_address' => $data['postal_address'],
                'phone' => $data['phone'],
                'landline' => $data['landline'] ?? null,
                'website' => $data['company_website'],
                'social_media' => $data['company_social_media'] ?? null,
                'established_year' => $data['company_established_year'],
            ]
        );

        if (!$company->wasRecentlyCreated) {
            $company->street = $data['street'];
            $company->city = $data['city'];
            $company->country = $data['country'];
            $company->pincode = $data['pincode'];
            $company->postal_address = $data['postal_address'];
            $company->phone = $data['phone'];
            $company->landline = $data['landline'] ?? null;
            $company->website = $data['company_website'];
            $company->social_media = $data['company_social_media'] ?? null;
            $company->established_year = $data['company_established_year'];
            $company->save();
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'recruiter',
            'company_id' => $company->company_id,
            'is_approved' => true,
        ]);

        $this->syncRegistrationContacts($company->company_id, $data['company_name'], $data);

        try {
            Mail::raw(
                "A new recruiter account was created.\n\nName: {$user->name}\nEmail: {$user->email}\nCompany: {$company->name}\nStreet: {$company->street}\nCity: {$company->city}\nCountry: {$company->country}\nPincode: {$company->pincode}\nPostal Address: {$company->postal_address}\nPhone: {$company->phone}\nLandline: {$company->landline}\nWebsite: {$company->website}\nSocial: {$company->social_media}\nEstablished Year: {$company->established_year}",
                function ($msg) {
                    $msg->to(env('ADMIN_EMAIL', 'admin@example.com'))
                        ->from('no-reply@campus.local', 'Campus Recruitment System')
                        ->subject('New Recruiter Account Created');
                }
            );
        } catch (Throwable $e) {
            Log::warning('Registration admin mail failed: '.$e->getMessage());
        }

        return response()->json(['message' => 'Registration completed successfully.'], 201);
    }

    private function designationLooksLikeHeadOfHr(string $designation): bool
    {
        $d = mb_strtolower($designation);
        $hasHr = str_contains($d, 'hr') || str_contains($d, 'human resource');
        $hasHeadRole = (bool) preg_match('/\b(head|chief|director|vp|vice president|manager)\b/', $d);

        return $hasHr && $hasHeadRole;
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
                'employer_company_name' => $row['company_name'] ?? $defaultEmployerName,
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

        if (!$token = JWTAuth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'data' => [
                'token' => $token,
                'user' => auth()->user(),
            ]
        ]);
    }

    public function me()
    {
        return response()->json(['data' => auth()->user()]);
    }

    public function logout()
    {
        JWTAuth::invalidate(JWTAuth::getToken());
        return response()->json(['message' => 'Logged out']);
    }

}
