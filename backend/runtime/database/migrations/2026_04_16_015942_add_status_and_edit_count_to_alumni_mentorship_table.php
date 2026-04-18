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
            $table->string('status')->default('draft'); // draft, submitted, approved, rejected
            $table->integer('edit_count')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('alumni_mentorship', function (Blueprint $table) {
            $table->dropColumn(['status', 'edit_count']);
        });
    }
};
