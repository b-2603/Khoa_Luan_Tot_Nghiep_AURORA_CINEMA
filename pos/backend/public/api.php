<?php

require_once __DIR__ . '/../app/Support/Database.php';
require_once __DIR__ . '/../app/Models/PosUser.php';
require_once __DIR__ . '/../app/Services/AuthService.php';
require_once __DIR__ . '/../app/Http/Controllers/Api/V1/HealthController.php';
require_once __DIR__ . '/../app/Http/Controllers/Api/V1/AuthController.php';

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Services\AuthService;
use App\Support\Database;

session_start();

$config = require __DIR__ . '/../config/app.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $config['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function requestJson(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $connection = Database::connect();
    $authService = new AuthService($connection);
    $healthController = new HealthController($authService);
    $authController = new AuthController($authService);
    $routes = require __DIR__ . '/../routes/api.php';

    $action = $_GET['action'] ?? 'health';
    if (!isset($routes[$action])) {
        jsonResponse(['success' => false, 'message' => 'Route không tồn tại.'], 404);
    }

    [$controller, $method] = $routes[$action];
    $instance = $controller === HealthController::class ? $healthController : $authController;
    $instance->$method();
} catch (Throwable $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Lỗi máy chủ: ' . $e->getMessage(),
    ], 500);
}
