<?php

use App\Http\Controllers\CustomerController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function (): void {
    Route::get('/me', [CustomerController::class, 'me']);
    Route::get('/movies', [CustomerController::class, 'movies']);
    Route::get('/movies/{movie}', [CustomerController::class, 'movieDetail']);
    Route::get('/theaters', [CustomerController::class, 'theaters']);
    Route::get('/showtimes', [CustomerController::class, 'showtimes']);
    Route::get('/showtimes/{showtime}/seats', [CustomerController::class, 'seats']);
    Route::post('/bookings', [CustomerController::class, 'createBooking']);
    Route::get('/oauth/start', [CustomerController::class, 'oauthStart']);
    Route::post('/register', [CustomerController::class, 'register']);
    Route::post('/login', [CustomerController::class, 'login']);
    Route::post('/logout', [CustomerController::class, 'logout']);
    Route::options('/{any}', fn () => response('', 204))->where('any', '.*');
});
