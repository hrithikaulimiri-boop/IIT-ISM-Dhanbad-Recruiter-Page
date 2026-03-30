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
            if (!Schema::hasColumn('company', 'street')) {
                $table->string('street')->nullable()->after('name');
            }
            if (!Schema::hasColumn('company', 'city')) {
                $table->string('city')->nullable()->after('street');
            }
            if (!Schema::hasColumn('company', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('company', 'country')) {
                $table->string('country')->nullable()->after('state');
            }
            if (!Schema::hasColumn('company', 'pincode')) {
                $table->string('pincode')->nullable()->after('country');
            }
            if (!Schema::hasColumn('company', 'phone')) {
                $table->string('phone')->nullable()->after('pincode');
            }
            if (!Schema::hasColumn('company', 'landline')) {
                $table->string('landline')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('company', 'established_year')) {
                $table->integer('established_year')->nullable()->after('landline');
            }
            if (!Schema::hasColumn('company', 'social_media')) {
                $table->string('social_media')->nullable()->after('website');
            }
            if (!Schema::hasColumn('company', 'annual_turnover')) {
                $table->string('annual_turnover')->nullable()->after('established_year');
            }
            if (!Schema::hasColumn('company', 'sectors')) {
                $table->json('sectors')->nullable()->after('sector');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn([
                'street', 'city', 'state', 'country', 'pincode', 
                'phone', 'landline', 'established_year', 'social_media', 
                'annual_turnover', 'sectors'
            ]);
        });
    }
};
