<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // On MySQL, we need raw SQL to update the enum safely
        DB::statement("ALTER TABLE job_profile MODIFY COLUMN status ENUM('draft', 'pending', 'submitted', 'approved', 'rejected') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only keep the original values
        DB::statement("ALTER TABLE job_profile MODIFY COLUMN status ENUM('draft', 'pending', 'submitted') DEFAULT 'draft'");
    }
};
