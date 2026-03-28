<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('company', function (Blueprint $table) {
            $table->id('company_id');
            $table->string('name');
            $table->string('website')->nullable();
            $table->text('postal_address')->nullable();
            $table->integer('employee_count')->nullable();
            $table->string('sector')->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('allow_nirf_sharing')->default(false);
            $table->timestamps();
        });

        Schema::create('contact_person', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('company', 'company_id')->cascadeOnDelete();
            $table->string('name');
            $table->string('designation');
            $table->string('email');
            $table->string('mobile_no');
            $table->boolean('is_primary')->default(true);
            $table->timestamps();
        });

        Schema::create('recruitment_cycle', function (Blueprint $table) {
            $table->id('cycle_id');
            $table->string('name');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('job_profile', function (Blueprint $table) {
            $table->id('job_id');
            $table->foreignId('company_id')->constrained('company', 'company_id')->cascadeOnDelete();
            $table->foreignId('cycle_id')->constrained('recruitment_cycle', 'cycle_id');
            $table->enum('job_type', ['INF', 'JNF']);
            $table->string('profile_name');
            $table->text('description');
            $table->string('location');
            $table->string('training_period')->nullable();
            $table->string('bond')->nullable();
            $table->string('registration_link')->nullable();
            $table->string('joining_month')->nullable();
            $table->text('onboarding_procedure')->nullable();
            $table->timestamps();
        });

        Schema::create('hiring_stage', function (Blueprint $table) {
            $table->id('stage_id');
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create('job_stage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('job_profile', 'job_id')->cascadeOnDelete();
            $table->foreignId('stage_id')->constrained('hiring_stage', 'stage_id');
            $table->unsignedInteger('sequence');
            $table->string('duration')->nullable();
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            $table->timestamps();
        });

        Schema::create('job_application', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('job_profile', 'job_id')->cascadeOnDelete();
            $table->string('candidate_name');
            $table->string('candidate_email');
            $table->foreignId('current_stage_id')->nullable()->constrained('job_stage');
            $table->enum('status', ['selected', 'rejected', 'in progress'])->default('in progress');
            $table->timestamp('application_date')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('salary', function (Blueprint $table) {
            $table->id('salary_id');
            $table->foreignId('job_id')->constrained('job_profile', 'job_id')->cascadeOnDelete();
            $table->decimal('ctc_lpa', 10, 2);
            $table->decimal('fixed_component', 10, 2)->nullable();
            $table->decimal('joining_bonus', 10, 2)->nullable();
            $table->decimal('retention_bonus', 10, 2)->nullable();
            $table->decimal('variable_component', 10, 2)->nullable();
            $table->decimal('esops', 10, 2)->nullable();
            $table->decimal('stocks_options', 10, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('eligibility', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('job_profile', 'job_id')->cascadeOnDelete();
            $table->decimal('min_cgpa', 3, 2)->nullable();
            $table->enum('gender', ['All', 'Male', 'Female', 'Others'])->default('All');
            $table->text('slp_requirement')->nullable();
            $table->json('disciplines_json')->nullable();
            $table->timestamps();
        });

        Schema::create('job_document', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('job_profile', 'job_id')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        Schema::create('company_document', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('company', 'company_id')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        Schema::create('salary_document', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_id')->constrained('salary')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        Schema::create('declaration', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('job_profile', 'job_id')->cascadeOnDelete();
            $table->boolean('agreed')->default(false);
            $table->timestamp('agreed_at')->nullable();
            $table->unsignedBigInteger('agreed_by_user_id')->nullable();
            $table->longText('declaration_text')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['admin', 'recruiter'])->default('recruiter');
            $table->foreignId('company_id')->nullable()->constrained('company', 'company_id')->nullOnDelete();
            $table->boolean('is_approved')->default(false);
            $table->enum('portal_type', ['INF', 'JNF'])->default('JNF');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('declaration');
        Schema::dropIfExists('salary_document');
        Schema::dropIfExists('company_document');
        Schema::dropIfExists('job_document');
        Schema::dropIfExists('eligibility');
        Schema::dropIfExists('salary');
        Schema::dropIfExists('job_application');
        Schema::dropIfExists('job_stage');
        Schema::dropIfExists('hiring_stage');
        Schema::dropIfExists('job_profile');
        Schema::dropIfExists('recruitment_cycle');
        Schema::dropIfExists('contact_person');
        Schema::dropIfExists('company');
    }
};
