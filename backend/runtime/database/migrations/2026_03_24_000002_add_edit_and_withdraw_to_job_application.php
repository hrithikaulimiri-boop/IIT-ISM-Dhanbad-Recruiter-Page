<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('job_application', function (Blueprint $table) {
            $table->unsignedTinyInteger('edit_count')->default(0)->after('status');
            $table->boolean('is_withdrawn')->default(false)->after('edit_count');
        });
    }

    public function down(): void
    {
        Schema::table('job_application', function (Blueprint $table) {
            $table->dropColumn(['edit_count', 'is_withdrawn']);
        });
    }
};
