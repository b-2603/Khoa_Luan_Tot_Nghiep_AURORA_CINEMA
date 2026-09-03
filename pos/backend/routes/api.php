<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;

return [
    'health' => [HealthController::class, 'index'],
    'login' => [AuthController::class, 'login'],
    'logout' => [AuthController::class, 'logout'],
    'me' => [AuthController::class, 'me'],
    'dashboard' => [AuthController::class, 'dashboard'],
];
