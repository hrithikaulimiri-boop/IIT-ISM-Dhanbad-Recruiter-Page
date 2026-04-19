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
        Schema::table('alumni_mentorship', function (Blueprint $table) {
            $table->string('name')->nullable()->change();
            $table->string('phone_number')->nullable()->change();
            $table->string('year_of_completion')->nullable()->change();
            $table->string('degree')->nullable()->change();
            $table->string('discipline')->nullable()->change();
            $table->string('current_job')->nullable()->change();
            $table->text('areas_of_interest')->nullable()->change();
            $table->string('linkedin_profile')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('alumni_mentorship', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->string('phone_number')->nullable(false)->change();
            $table->string('year_of_completion')->nullable(false)->change();
            $table->string('degree')->nullable(false)->change();
            $table->string('discipline')->nullable(false)->change();
            $table->string('current_job')->nullable(false)->change();
            $table->text('areas_of_interest')->nullable(false)->change();
            $table->string('linkedin_profile')->nullable(false)->change();
        });
    }
};
