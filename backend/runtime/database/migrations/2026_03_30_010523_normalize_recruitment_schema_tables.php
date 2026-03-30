<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('salary', function (Blueprint $table) {
            if (!Schema::hasColumn('salary', 'different_structure_per_programme')) {
                $table->boolean('different_structure_per_programme')->default(false)->after('internship_duration');
            }
            if (!Schema::hasColumn('salary', 'additional_components')) {
                $table->json('additional_components')->nullable()->after('salaries_json');
            }
        });

        Schema::table('eligibility', function (Blueprint $table) {
            if (!Schema::hasColumn('eligibility', 'global_min_cgpa')) {
                $table->string('global_min_cgpa')->nullable()->after('job_id');
            }
            if (!Schema::hasColumn('eligibility', 'global_max_backlogs')) {
                $table->string('global_max_backlogs')->nullable()->after('global_min_cgpa');
            }
            if (!Schema::hasColumn('eligibility', 'high_school_percentage')) {
                $table->string('high_school_percentage')->nullable()->after('global_allow_backlogs');
            }
            if (!Schema::hasColumn('eligibility', 'gender_filter')) {
                $table->string('gender_filter')->default('All')->after('high_school_percentage');
            }
        });

        Schema::table('declaration', function (Blueprint $table) {
            if (!Schema::hasColumn('declaration', 'authorised_signatory_name')) {
                $table->string('authorised_signatory_name')->nullable()->after('agreed_by_user_id');
            }
            if (!Schema::hasColumn('declaration', 'authorised_signatory_designation')) {
                $table->string('authorised_signatory_designation')->nullable()->after('authorised_signatory_name');
            }
            if (!Schema::hasColumn('declaration', 'authorised_signatory_date')) {
                $table->date('authorised_signatory_date')->nullable()->after('authorised_signatory_designation');
            }
            if (!Schema::hasColumn('declaration', 'typed_signature')) {
                $table->string('typed_signature')->nullable()->after('authorised_signatory_date');
            }
            if (!Schema::hasColumn('declaration', 'rti_nirf_consent')) {
                $table->boolean('rti_nirf_consent')->default(false)->after('typed_signature');
            }
            if (!Schema::hasColumn('declaration', 'aipc_guidelines')) {
                $table->json('aipc_guidelines')->nullable()->after('rti_nirf_consent');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary', function (Blueprint $table) {
            $table->dropColumn(['different_structure_per_programme', 'additional_components']);
        });

        Schema::table('eligibility', function (Blueprint $table) {
            $table->dropColumn(['global_min_cgpa', 'global_max_backlogs', 'high_school_percentage', 'gender_filter']);
        });

        Schema::table('declaration', function (Blueprint $table) {
            $table->dropColumn([
                'authorised_signatory_name', 'authorised_signatory_designation', 
                'authorised_signatory_date', 'typed_signature', 'rti_nirf_consent', 'aipc_guidelines'
            ]);
        });
    }
};
