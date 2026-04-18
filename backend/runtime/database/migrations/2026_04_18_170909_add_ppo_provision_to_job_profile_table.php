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
            $table->string('ppo_provision')->nullable()->after('additional_info');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_profile', function (Blueprint $table) {
            $table->dropColumn('ppo_provision');
        });
    }
};
