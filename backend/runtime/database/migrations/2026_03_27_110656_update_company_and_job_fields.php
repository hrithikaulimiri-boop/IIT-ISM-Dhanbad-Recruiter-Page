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
        Schema::table('company', function (Blueprint $table) {
            $table->json('sectors')->nullable()->after('sector');
        });

        Schema::table('job_profile', function (Blueprint $table) {
            $table->string('num_employees')->nullable()->after('onboarding_procedure');
            $table->json('job_categories')->nullable()->after('num_employees');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn('sectors');
        });

        Schema::table('job_profile', function (Blueprint $table) {
            $table->dropColumn(['num_employees', 'job_categories']);
        });
    }
};
