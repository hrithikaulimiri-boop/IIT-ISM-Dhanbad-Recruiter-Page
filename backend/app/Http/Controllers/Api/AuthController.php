<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RecruiterRegistrationPendingMail;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tymon\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'company_name' => 'required|string|max:255',
            'portal_type' => 'required|in:INF,JNF',
        ]);

        $company = Company::firstOrCreate(['name' => $data['company_name']]);

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'recruiter',
            'company_id' => $company->company_id,
            'portal_type' => $data['portal_type'],
            'is_approved' => true,
        ]);

        Mail::to(env('ADMIN_EMAIL', 'admin@example.com'))->send(new RecruiterRegistrationPendingMail(
            User::where('email', $data['email'])->first()
        ));

        return response()->json(['message' => 'Registration successful.'], 201);
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
