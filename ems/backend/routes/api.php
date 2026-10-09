<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\CertificateController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\AttendanceController;

/*
|--------------------------------------------------------------------------
| EMS Aurora Cinemas RESTful API Routes (Sơ đồ Use Case UML)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Real Auth & Registration (UC01, UC02)
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Google OAuth Routes
    Route::get('/auth/google', [AuthController::class, 'googleRedirect']);
    Route::get('/auth/google/callback', [AuthController::class, 'googleCallback']);

    // Facebook OAuth Routes
    Route::get('/auth/facebook', [AuthController::class, 'facebookRedirect']);
    Route::get('/auth/facebook/callback', [AuthController::class, 'facebookCallback']);

    // Staff Management (UC03, UC04)
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::get('/employees/{id}', [EmployeeController::class, 'show']);

    // Courses & Training (UC05)
    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/courses/{id}', [CourseController::class, 'show']);

    // Monthly Quizzes & AI Quiz Creator (UC06, UC08)
    Route::get('/quizzes', [QuizController::class, 'index']);
    Route::get('/quizzes/{id}', [QuizController::class, 'show']);
    Route::post('/quizzes/{id}/attempt', [QuizController::class, 'submitAttempt']);
    Route::post('/quizzes/generate-ai', [QuizController::class, 'generateAiQuiz']); // OpenAI API integration

    // Digital Certificates (UC07)
    Route::get('/certificates', [CertificateController::class, 'index']);

    // Shift Scheduling & AI Auto Scheduler (UC09, UC10, UC11)
    Route::post('/shifts/register', [ShiftController::class, 'registerShiftPreference']);
    Route::get('/shifts/my-schedule', [ShiftController::class, 'getMySchedule']);
    Route::get('/shifts/manager-schedule', [ShiftController::class, 'getManagerSchedule']);
    Route::post('/shifts/auto-schedule-ai', [ShiftController::class, 'autoScheduleWithAi']);

    // Timekeeping & Attendance Exceptions (UC12, UC13)
    Route::get('/attendances', [AttendanceController::class, 'index']);
    Route::get('/attendance-exceptions', [AttendanceController::class, 'exceptions']);
    Route::post('/attendance-exceptions/{id}/action', [AttendanceController::class, 'handleExceptionAction']);
});
