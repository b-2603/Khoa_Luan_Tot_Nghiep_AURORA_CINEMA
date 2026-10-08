<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for AURORA CINEMAS EMS Database.
     */
    public function up(): void
    {
        // 1. Users Table (Staff & Managers)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('staff_code')->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->enum('role', ['staff', 'manager'])->default('staff');
            $table->string('department');
            $table->string('avatar')->nullable();
            $table->string('phone')->nullable();
            $table->date('join_date');
            $table->enum('status', ['active', 'leave', 'inactive'])->default('active');
            $table->integer('performance_score')->default(90);
            $table->timestamps();
        });

        // 2. Courses Table (UC05)
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->string('category');
            $table->integer('duration_minutes')->default(45);
            $table->boolean('is_ctkm')->default(false);
            $table->string('thumbnail')->nullable();
            $table->integer('enrolled_count')->default(0);
            $table->integer('completed_count')->default(0);
            $table->timestamps();
        });

        // 3. Quizzes Table (UC06, UC08)
        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
            $table->string('title');
            $table->integer('pass_score')->default(80);
            $table->integer('duration_minutes')->default(15);
            $table->boolean('is_ctkm')->default(false);
            $table->timestamps();
        });

        // 4. Quiz Questions Table (UC06, UC08 + AI)
        Schema::create('quiz_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('quizzes')->onDelete('cascade');
            $table->text('question_text');
            $table->json('options');
            $table->integer('correct_answer_index');
            $table->text('explanation')->nullable();
            $table->timestamps();
        });

        // 5. Quiz Attempts Table (UC06)
        Schema::create('quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained('quizzes')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('score');
            $table->boolean('passed');
            $table->text('feedback')->nullable();
            $table->timestamp('completed_at');
            $table->timestamps();
        });

        // 6. Certificates Table (UC07)
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('course_id')->constrained('courses')->onDelete('cascade');
            $table->string('certificate_code')->unique();
            $table->date('issued_at');
            $table->integer('score');
            $table->string('qr_code_url')->nullable();
            $table->timestamps();
        });

        // 7. Shifts Table
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 10);
            $table->time('start_time');
            $table->time('end_time');
            $table->string('color', 20)->default('#06b6d4');
            $table->timestamps();
        });

        // 8. Shift Registrations Table (UC09)
        Schema::create('shift_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('shift_id')->constrained('shifts')->onDelete('cascade');
            $table->date('date');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamps();
        });

        // 9. Work Schedules Table (UC10, UC11 + AI)
        Schema::create('work_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('shift_id')->constrained('shifts')->onDelete('cascade');
            $table->date('date');
            $table->string('location');
            $table->enum('status', ['assigned', 'completed', 'swapped'])->default('assigned');
            $table->string('assigned_by');
            $table->timestamps();
        });

        // 10. Attendances Table (UC12)
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->enum('status', ['on_time', 'late', 'early_leave', 'absent'])->default('on_time');
            $table->decimal('hours_worked', 4, 1)->default(8.0);
            $table->text('note')->nullable();
            $table->timestamps();
        });

        // 11. Attendance Exceptions Table (UC13)
        Schema::create('attendance_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['late_justification', 'leave_request', 'shift_swap']);
            $table->string('type_title');
            $table->text('reason');
            $table->date('target_date');
            $table->string('proof_image')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('reviewed_by')->nullable();
            $table->text('review_comment')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_exceptions');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('work_schedules');
        Schema::dropIfExists('shift_registrations');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('certificates');
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('quiz_questions');
        Schema::dropIfExists('quizzes');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('users');
    }
};
