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
            $table->string('name');
            $table->string('phone_number');
            $table->string('year_of_completion');
            $table->string('degree');
            $table->string('discipline');
            $table->string('current_job');
            $table->text('areas_of_interest');
            $table->string('linkedin_profile');
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
