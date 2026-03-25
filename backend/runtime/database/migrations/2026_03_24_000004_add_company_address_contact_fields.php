<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->string('street')->nullable()->after('postal_address');
            $table->string('city')->nullable()->after('street');
            $table->string('country')->nullable()->after('city');
            $table->string('pincode')->nullable()->after('country');
            $table->string('phone')->nullable()->after('pincode');
            $table->string('landline')->nullable()->after('phone');
        });
    }

    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn(['street', 'city', 'country', 'pincode', 'phone', 'landline']);
        });
    }
};
