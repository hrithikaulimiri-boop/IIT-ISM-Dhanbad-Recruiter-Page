<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->string('annual_turnover')->nullable()->after('sector');
        });

        Schema::table('contact_person', function (Blueprint $table) {
            $table->string('employer_company_name')->nullable()->after('company_id');
        });

        Schema::table('job_profile', function (Blueprint $table) {
            $table->string('work_mode', 20)->default('offline')->after('location');
            $table->string('offline_job_location')->nullable()->after('work_mode');
        });

        Schema::table('declaration', function (Blueprint $table) {
            $table->json('aipc_guidelines_json')->nullable()->after('declaration_text');
        });

        Schema::table('job_application', function (Blueprint $table) {
            $table->boolean('is_draft')->default(false)->after('status');
            $table->json('draft_payload')->nullable()->after('is_draft');
        });
    }

    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn('annual_turnover');
        });
        Schema::table('contact_person', function (Blueprint $table) {
            $table->dropColumn('employer_company_name');
        });
        Schema::table('job_profile', function (Blueprint $table) {
            $table->dropColumn(['work_mode', 'offline_job_location']);
        });
        Schema::table('declaration', function (Blueprint $table) {
            $table->dropColumn('aipc_guidelines_json');
        });
        Schema::table('job_application', function (Blueprint $table) {
            $table->dropColumn(['is_draft', 'draft_payload']);
        });
    }
};
