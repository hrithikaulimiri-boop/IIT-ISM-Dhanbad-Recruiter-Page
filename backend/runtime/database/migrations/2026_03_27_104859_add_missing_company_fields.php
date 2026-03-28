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
            if (!Schema::hasColumn('company', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('company', 'established_year')) {
                $table->integer('established_year')->nullable()->after('postal_address');
            }
            if (!Schema::hasColumn('company', 'social_media')) {
                $table->string('social_media')->nullable()->after('website');
            }
        });
    }

    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn(['state', 'established_year', 'social_media']);
        });
    }
};
