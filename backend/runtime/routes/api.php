<?php

use App\Http\Controllers\Api\DocumentParserController;
use App\Http\Controllers\Api\AlumniMentorshipController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\StageController;
use App\Http\Controllers\Api\HiringStageController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\RecruitmentCycleController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DashboardController;

Route::get('/test', function () {
    return response()->json(['message' => 'API is reachable']);
});

Route::prefix('auth')->group(function () {
    Route::post('/register-request', [AuthController::class, 'registerRequest']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::post('/alumni-mentorship', [AlumniMentorshipController::class, 'store']);
Route::get('/alumni-mentorship/resume/{email}', [AlumniMentorshipController::class, 'getByEmail']);

Route::middleware(['auth:api'])->group(function () {
    Route::get('/alumni-mentorship', [AlumniMentorshipController::class, 'index']);
    Route::put('/alumni-mentorship/{id}/status', [AlumniMentorshipController::class, 'updateStatus']);
    Route::get('/auth-check', function () {
        Log::info('Auth check called. Token: ' . request()->bearerToken());
        Log::info('Guard user: ' . (auth('api')->user() ? auth('api')->user()->id : 'none'));
        return response()->json([
            'authenticated' => auth('api')->check(),
            'user' => auth('api')->user(),
            'token' => request()->bearerToken(),
            'headers' => request()->headers->all()
        ]);
    });
    
    Route::apiResource('companies', CompanyController::class);
    Route::apiResource('jobs', JobController::class);
    Route::post('/jobs/{id}/duplicate', [JobController::class, 'duplicate']);
    Route::get('/jobs/{id}/sync-targets', [JobController::class, 'syncTargets']);
    Route::post('/jobs/{id}/sync', [JobController::class, 'sync']);
    Route::apiResource('stages', StageController::class);
    Route::get('/hiring-stages', [HiringStageController::class, 'index']);
    Route::apiResource('applications', ApplicationController::class);
    Route::post('/applications/{id}/move-next-stage', [ApplicationController::class, 'moveToNextStage']);
    Route::post('/applications/{id}/withdraw', [ApplicationController::class, 'withdraw']);
    Route::post('/applications/{id}/submit', [ApplicationController::class, 'submit']);
    Route::apiResource('cycles', RecruitmentCycleController::class);

    Route::post('/documents/company/{company}', [DocumentController::class, 'uploadCompanyDocument']);
    Route::post('/documents/job/{job}', [DocumentController::class, 'uploadJobDocument']);
    Route::post('/documents/salary/{salary}', [DocumentController::class, 'uploadSalaryDocument']);
    Route::get('/documents/company/{company}', [DocumentController::class, 'listCompanyDocuments']);
    Route::get('/documents/job/{job}', [DocumentController::class, 'listJobDocuments']);
    Route::get('/documents/salary/{salary}', [DocumentController::class, 'listSalaryDocuments']);
    Route::delete('/documents/company/{id}', [DocumentController::class, 'deleteCompanyDocument']);
    Route::delete('/documents/job/{id}', [DocumentController::class, 'deleteJobDocument']);
    Route::delete('/documents/salary/{id}', [DocumentController::class, 'deleteSalaryDocument']);

    Route::get('/dashboard/analytics', [DashboardController::class, 'analytics']);
    Route::get('/reports/applications/export', [ApplicationController::class, 'export']);
    Route::post('/documents/parse', [DocumentParserController::class, 'parse']);
});
