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
        Schema::table('job_profile', function (Blueprint $table) {
            if (!Schema::hasColumn('job_profile', 'place_of_posting')) {
                $table->string('place_of_posting')->nullable()->after('job_designation');
            }
            if (!Schema::hasColumn('job_profile', 'min_hires')) {
                $table->string('min_hires')->nullable()->after('expected_hires');
            }
            if (!Schema::hasColumn('job_profile', 'additional_info_1000')) {
                $table->text('additional_info_1000')->nullable()->after('additional_info');
            }
            if (!Schema::hasColumn('job_profile', 'parent_job_id')) {
                $table->foreignId('parent_job_id')->nullable()->after('last_completed_step')->constrained('job_profile', 'job_id')->nullOnDelete();
            }
        });

        Schema::table('salary', function (Blueprint $table) {
            if (!Schema::hasColumn('salary', 'ctc_lpa')) {
                $table->decimal('ctc_lpa', 10, 2)->nullable()->after('additional_components');
            }
        });

        Schema::table('eligibility', function (Blueprint $table) {
            if (!Schema::hasColumn('eligibility', 'global_allow_backlogs')) {
                $table->boolean('global_allow_backlogs')->default(true)->after('global_max_backlogs');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_profile', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_job_id');
            $table->dropColumn(['place_of_posting', 'min_hires', 'additional_info_1000']);
        });

        Schema::table('salary', function (Blueprint $table) {
            $table->dropColumn('ctc_lpa');
        });

        Schema::table('eligibility', function (Blueprint $table) {
            $table->dropColumn('global_allow_backlogs');
        });
    }
};
