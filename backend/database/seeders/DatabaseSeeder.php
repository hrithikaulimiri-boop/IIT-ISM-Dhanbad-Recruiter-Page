<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\HiringStage;
use App\Models\RecruitmentCycle;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::firstOrCreate(['name' => 'Demo Technologies Pvt Ltd'], [
            'website' => 'https://example.com',
            'sector' => 'Technology',
        ]);

        User::firstOrCreate(['email' => 'admin@campus.local'], [
            'name' => 'Placement Admin',
            'password' => Hash::make('Admin@12345'),
            'role' => 'admin',
            'is_approved' => true,
            'company_id' => $company->company_id,
            'portal_type' => 'JNF',
        ]);

        RecruitmentCycle::firstOrCreate(['name' => 'Placement 2026'], [
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_active' => true,
        ]);

        foreach ([
            'Pre-Placement Talk',
            'Resume Shortlisting',
            'Online/Written Test',
            'Group Discussion',
            'Any Other Round',
            'Personal/Technical Interview',
        ] as $stage) {
            HiringStage::firstOrCreate(['name' => $stage]);
        }
    }
}
