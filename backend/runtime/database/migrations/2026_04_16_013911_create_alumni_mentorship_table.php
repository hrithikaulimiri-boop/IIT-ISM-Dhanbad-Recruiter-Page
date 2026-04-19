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
        Schema::create('alumni_mentorship', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('phone_number')->nullable();
            $table->string('year_of_completion')->nullable();
            $table->string('degree')->nullable();
            $table->string('discipline')->nullable();
            $table->string('current_job')->nullable();
            $table->text('areas_of_interest')->nullable();
            $table->string('linkedin_profile')->nullable();
            $table->text('general_comments')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alumni_mentorship');
    }
};
