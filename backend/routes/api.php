<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\StageController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\RecruitmentCycleController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DashboardController;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::middleware('auth:api')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:api'])->group(function () {
    Route::apiResource('companies', CompanyController::class);
    Route::apiResource('jobs', JobController::class);
    Route::apiResource('stages', StageController::class);
    Route::apiResource('applications', ApplicationController::class);
    Route::post('/applications/{id}/move-next-stage', [ApplicationController::class, 'moveToNextStage']);
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
});
