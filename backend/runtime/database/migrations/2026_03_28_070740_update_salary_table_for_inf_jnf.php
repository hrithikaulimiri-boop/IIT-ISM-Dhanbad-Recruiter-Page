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
        Schema::table('salary', function (Blueprint $table) {
            $table->decimal('ctc_lpa', 10, 2)->nullable()->change();
            if (!Schema::hasColumn('salary', 'currency')) {
                $table->string('currency', 10)->default('INR')->after('job_id');
            }
            if (!Schema::hasColumn('salary', 'stipend')) {
                $table->string('stipend')->nullable()->after('stocks_options');
            }
            if (!Schema::hasColumn('salary', 'internship_duration')) {
                $table->string('internship_duration')->nullable()->after('stipend');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salary', function (Blueprint $table) {
            $table->decimal('ctc_lpa', 10, 2)->nullable(false)->change();
            $table->dropColumn(['currency', 'stipend', 'internship_duration']);
        });
    }
};
