<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->unsignedSmallInteger('established_year')->nullable()->after('website');
            $table->string('social_media')->nullable()->after('sector');
        });
    }

    public function down(): void
    {
        Schema::table('company', function (Blueprint $table) {
            $table->dropColumn(['established_year', 'social_media']);
        });
    }
};
