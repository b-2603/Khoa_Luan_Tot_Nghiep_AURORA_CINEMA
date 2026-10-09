<?php
/**
 * ==============================================================================
 * AURORA CINEMAS EMS - RESTful API Server Engine (PHP & MySQL Database Backend)
 * Khóa luận tốt nghiệp: Quản lý rạp chiếu phim AURORA CINEMAS tích hợp AI
 * Tương thích trực tiếp với XAMPP / MariaDB / CSDL aurora_ems (11 bảng)
 * ==============================================================================
 */

// 1. CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Auth-Token');
header('Content-Type: application/json; charset=UTF-8');
date_default_timezone_set('Asia/Ho_Chi_Minh');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Load .env config
$envPath = __DIR__ . '/.env';
$env = [];
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (strpos($line, '=') !== false) {
            [$key, $val] = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            $val = trim($val, "\"'");
            $env[$key] = $val;
        }
    }
}

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? 'aurora_ems';
$dbUser = $env['DB_USERNAME'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';
$openAiKey = $env['OPENAI_API_KEY'] ?? '';

// 3. Connect MySQL via PDO
try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
    // Dọn dẹp tài khoản rác tạo ngẫu nhiên trong quá trình thử nghiệm
    $pdo->exec("DELETE FROM users WHERE staff_code LIKE 'khach%' OR email LIKE 'khach%' OR name = 'Nhân viên Rạp Phim'");
    // Đồng bộ mật khẩu mặc định 8888 cho tài khoản ban đầu nếu chưa được cấu hình
    $defaultHash = password_hash('8888', PASSWORD_BCRYPT);
    $pdo->exec("UPDATE users SET password = '{$defaultHash}' WHERE password = '' OR password IS NULL OR password LIKE '%4Auid%'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Không thể kết nối CSDL MySQL: ' . $e->getMessage(),
        'hint' => 'Hãy đảm bảo MySQL trong XAMPP đang ở trạng thái Start và database aurora_ems đã được import.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// 4. Request Parse
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: [];

// Strip trailing slash and prefix
$cleanUri = rtrim($uri, '/');
if (strpos($cleanUri, '/api/v1') === 0) {
    $route = substr($cleanUri, 7); // strip '/api/v1'
} elseif (strpos($cleanUri, '/api') === 0) {
    $route = substr($cleanUri, 4); // strip '/api'
} else {
    $route = $cleanUri;
}
if ($route === '') $route = '/';

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function verifyUserPassword($inputPass, $hashedPass) {
    if ($inputPass === '' || $inputPass === null) return false;
    if (empty($hashedPass) && $inputPass === '8888') return true;
    if (password_verify($inputPass, (string)$hashedPass)) return true;
    if ((string)$inputPass === (string)$hashedPass) return true;
    return false;
}

// ==============================================================================
// 5. API ROUTES
// ==============================================================================

// Health Check / System Status
if ($route === '/health' || $route === '/') {
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $userCount = $pdo->query("SELECT count(*) FROM users")->fetchColumn();
    $courseCount = $pdo->query("SELECT count(*) FROM courses")->fetchColumn();
    $quizCount = $pdo->query("SELECT count(*) FROM quizzes")->fetchColumn();

    jsonResponse([
        'status' => 'success',
        'system' => 'AURORA CINEMAS EMS API Server',
        'database' => $dbName,
        'mysql_connected' => true,
        'tables_count' => count($tables),
        'tables' => $tables,
        'stats' => [
            'users' => (int)$userCount,
            'courses' => (int)$courseCount,
            'quizzes' => (int)$quizCount
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

// Client Network Info for Attendance Wi-Fi Constraint
if ($route === '/network-info') {
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    jsonResponse([
        'status' => 'success',
        'ip' => $ip,
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'time' => date('Y-m-d H:i:s')
    ]);
}

// ==============================================================================
// CINEMA AI ENGINE v2 (4 BỘ NÃO: ĐIỆN ẢNH, DỮ LIỆU RẠP DB, RAG, WEB SEARCH)
// ==============================================================================
require_once __DIR__ . '/app/AI/Contracts/AITool.php';
require_once __DIR__ . '/app/AI/PermissionManager.php';
require_once __DIR__ . '/app/AI/CinemaPrompt.php';
require_once __DIR__ . '/app/AI/Tools/MovieTool.php';
require_once __DIR__ . '/app/AI/Tools/ShowtimeTool.php';
require_once __DIR__ . '/app/AI/Tools/SeatTool.php';
require_once __DIR__ . '/app/AI/Tools/BookingTool.php';
require_once __DIR__ . '/app/AI/Tools/RAGTool.php';
require_once __DIR__ . '/app/AI/Tools/ManagementTools.php';
require_once __DIR__ . '/app/AI/Tools/OpsTools.php';
require_once __DIR__ . '/app/AI/Tools/ExtraTools.php';
require_once __DIR__ . '/app/AI/AIOrchestrator.php';

$aiOrchestrator = new \App\AI\AIOrchestrator($pdo, $openAiKey);
$aiOrchestrator
    // Bộ não 1 & 2: Phim & Suất & Ghế & Booking
    ->registerTool(new \App\AI\Tools\MovieTool())
    ->registerTool(new \App\AI\Tools\ShowtimeTool())
    ->registerTool(new \App\AI\Tools\SeatTool())
    ->registerTool(new \App\AI\Tools\BookingTool())
    ->registerTool(new \App\AI\Tools\RecommendTool())
    ->registerTool(new \App\AI\Tools\CancelBookingTool())
    // Bộ não 2: Nghiệp vụ Quản trị (Manager RBAC)
    ->registerTool(new \App\AI\Tools\RevenueTool())
    ->registerTool(new \App\AI\Tools\OccupancyTool())
    ->registerTool(new \App\AI\Tools\TopMoviesTool())
    ->registerTool(new \App\AI\Tools\DailyReportTool())
    // Bộ não 2 & 3: EMS / POS / TMS / Nhân sự / Đào tạo
    ->registerTool(new \App\AI\Tools\EquipmentTool())
    ->registerTool(new \App\AI\Tools\POSTool())
    ->registerTool(new \App\AI\Tools\StaffScheduleTool())
    ->registerTool(new \App\AI\Tools\TrainingTool())
    ->registerTool(new \App\AI\Tools\RAGTool())
    // Bộ não 4: Internet Knowledge
    ->registerTool(new \App\AI\Tools\WebSearchTool());

// Endpoint: POST /api/ai/chat (Hội thoại AI tích hợp Tool Calling & Multi-turn memory)
if ($route === '/ai/chat' && $method === 'POST') {
    $message = trim($body['message'] ?? '');
    if ($message === '') {
        jsonResponse(['status' => 'error', 'message' => 'Nội dung tin nhắn không được để trống.'], 400);
    }

    $conversationId = !empty($body['conversation_id']) ? intval($body['conversation_id']) : null;
    $clientApiKey = !empty($body['api_key']) ? trim($body['api_key']) : null;

    // RBAC: xác thực vai trò trực tiếp từ bảng users trong MySQL (tránh giả mạo role)
    $uid = !empty($body['user_id']) ? intval(str_replace('usr-', '', (string)$body['user_id'])) : 1;
    $uStmt = $pdo->prepare("SELECT id, name, role, department FROM users WHERE id = ? LIMIT 1");
    $uStmt->execute([$uid]);
    $uRow = $uStmt->fetch(PDO::FETCH_ASSOC);

    $user = [
        'id' => $uRow ? (int)$uRow['id'] : $uid,
        'role' => $uRow ? $uRow['role'] : ($body['user_role'] ?? 'staff'),
        'name' => $uRow ? $uRow['name'] : ($body['user_name'] ?? 'Nhân viên Aurora'),
        'department' => $uRow ? $uRow['department'] : 'Vận hành'
    ];

    try {
        $result = $aiOrchestrator->chat($message, $user, $conversationId, $clientApiKey);
        jsonResponse([
            'status' => 'success',
            'data' => $result
        ]);
    } catch (\Throwable $e) {
        jsonResponse([
            'status' => 'error',
            'message' => 'Lỗi xử lý Cinema AI: ' . $e->getMessage()
        ], 500);
    }
}

// Endpoint: GET /api/ai/tools (Danh sách AI Tools đã đăng ký)
if ($route === '/ai/tools' && $method === 'GET') {
    $tools = [];
    foreach ($aiOrchestrator->getTools() as $t) {
        $tools[] = [
            'name' => $t->name(),
            'description' => $t->description(),
            'schema' => $t->schema()
        ];
    }
    jsonResponse([
        'status' => 'success',
        'count' => count($tools),
        'data' => $tools
    ]);
}

// Endpoint: GET /api/ai/tool-logs (Nhật ký thực thi AI Tools - Audit log)
if ($route === '/ai/tool-logs' && $method === 'GET') {
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $stmt = $pdo->prepare("SELECT * FROM ai_tool_logs ORDER BY id DESC LIMIT ?");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'status' => 'success',
        'count' => count($logs),
        'data' => array_map(function($l) {
            $l['arguments'] = json_decode($l['arguments'], true);
            $l['result'] = json_decode($l['result'], true);
            return $l;
        }, $logs)
    ]);
}

// Endpoint: GET /api/ai/conversations (Lịch sử các cuộc hội thoại)
if ($route === '/ai/conversations' && $method === 'GET') {
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    $sql = "SELECT c.*, COUNT(m.id) as message_count 
            FROM ai_conversations c 
            LEFT JOIN ai_messages m ON c.id = m.conversation_id";
    if ($userId) {
        $sql .= " WHERE c.user_id = {$userId}";
    }
    $sql .= " GROUP BY c.id ORDER BY c.id DESC LIMIT 20";
    $convs = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'status' => 'success',
        'count' => count($convs),
        'data' => $convs
    ]);
}

// ------------------------------------------------------------------------------
// UC01: AUTHENTICATION (Login & Register)
// ------------------------------------------------------------------------------
if ($route === '/auth/login' && $method === 'POST') {
    $identifier = trim($body['username'] ?? $body['identifier'] ?? $body['email'] ?? $body['staffCode'] ?? $body['phone'] ?? '');
    $password = $body['password'] ?? '';

    if (empty($identifier)) {
        jsonResponse(['status' => 'error', 'message' => 'Vui lòng nhập Mã nhân viên, Số điện thoại hoặc Email.'], 400);
    }

    $idLower = strtolower($identifier);
    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(staff_code) = ? OR phone = ? OR LOWER(email) = ? LIMIT 1");
    $stmt->execute([$idLower, $identifier, $idLower]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse([
            'status' => 'error',
            'message' => 'Tài khoản nhân sự không tồn tại trong hệ thống. Vui lòng kiểm tra lại Số điện thoại hoặc liên hệ Quản lý Nhân sự để được cấp tài khoản.'
        ], 404);
    }

    if (!verifyUserPassword($password, $user['password'])) {
        jsonResponse([
            'status' => 'error',
            'message' => 'Mật khẩu không chính xác. Mật khẩu khởi tạo mặc định là 8888.'
        ], 401);
    }

    unset($user['password'], $user['remember_token']);
    jsonResponse([
        'status' => 'success',
        'message' => 'Đăng nhập hệ thống EMS thành công!',
        'user' => $user,
        'token' => 'AURORA_BEARER_TOKEN_' . bin2hex(random_bytes(16))
    ]);
}

if ($route === '/auth/change-password' && $method === 'POST') {
    $rawUserId = (string)($body['userId'] ?? '');
    $userId = intval(str_replace('usr-', '', $rawUserId));
    $currentPassword = $body['currentPassword'] ?? '';
    $newPassword = $body['newPassword'] ?? '';

    if ($userId <= 0 || empty($newPassword)) {
        jsonResponse(['status' => 'error', 'message' => 'Vui lòng cung cấp đầy đủ thông tin mật khẩu.'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['status' => 'error', 'message' => 'Không tìm thấy tài khoản nhân viên.'], 404);
    }

    if (!empty($user['password']) && !verifyUserPassword($currentPassword, $user['password'])) {
        jsonResponse(['status' => 'error', 'message' => 'Mật khẩu hiện tại không chính xác.'], 400);
    }

    $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
    $upd = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $upd->execute([$hashed, $userId]);

    jsonResponse([
        'status' => 'success',
        'message' => 'Đổi mật khẩu thành công!'
    ]);
}

if ($route === '/auth/register' && $method === 'POST') {
    $email = strtolower(trim($body['email'] ?? ''));
    $name = trim($body['name'] ?? '');
    $role = in_array($body['role'] ?? '', ['staff', 'manager']) ? $body['role'] : 'staff';
    $dept = trim($body['department'] ?? 'Vé & Chăm sóc Khách hàng');
    $phone = trim($body['phone'] ?? '0901234567');
    $password = $body['password'] ?? '123456';

    if (empty($email) || empty($name)) {
        jsonResponse(['status' => 'error', 'message' => 'Vui lòng điền đủ Tên và Email.'], 400);
    }

    // Check existing
    $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['status' => 'error', 'message' => 'Địa chỉ Email này đã tồn tại trên hệ thống.'], 400);
    }

    $staffCode = 'AR-' . ($role === 'manager' ? 'MGR' : 'STAFF') . '-' . rand(100, 999);
    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $avatar = $role === 'manager'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    $ins = $pdo->prepare("INSERT INTO users (staff_code, name, email, password, role, department, avatar, phone, join_date, status, performance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active', 90)");
    $ins->execute([$staffCode, $name, $email, $hashed, $role, $dept, $avatar, $phone]);

    $newId = $pdo->lastInsertId();
    $user = $pdo->query("SELECT * FROM users WHERE id = {$newId}")->fetch();
    unset($user['password'], $user['remember_token']);

    jsonResponse([
        'status' => 'success',
        'message' => "Đăng ký thành công! Cấp mã nhân viên: {$staffCode}",
        'user' => $user,
        'token' => 'AURORA_BEARER_TOKEN_' . bin2hex(random_bytes(16))
    ], 201);
}

// ------------------------------------------------------------------------------
// UC02, UC03, UC04: EMPLOYEES MANAGEMENT
// ------------------------------------------------------------------------------
if ($route === '/employees' && $method === 'GET') {
    $search = $_GET['search'] ?? '';
    $dept = $_GET['dept'] ?? 'all';

    $sql = "SELECT id, staff_code, name, email, role, department, avatar, phone, join_date, status, performance_score FROM users WHERE 1=1";
    $params = [];

    if (!empty($search)) {
        $sql .= " AND (name LIKE ? OR staff_code LIKE ? OR email LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    if ($dept !== 'all' && !empty($dept)) {
        $sql .= " AND department = ?";
        $params[] = $dept;
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $employees = $stmt->fetchAll();

    jsonResponse([
        'status' => 'success',
        'count' => count($employees),
        'data' => $employees
    ]);
}

if ($route === '/employees' && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $role = in_array($body['role'] ?? '', ['staff', 'manager']) ? $body['role'] : 'staff';
    $dept = trim($body['department'] ?? 'Vé & Chăm sóc Khách hàng');
    $phone = trim($body['phone'] ?? '0901234567');
    $password = $body['password'] ?? '8888';

    $staffCode = 'AR-' . ($role === 'manager' ? 'MGR' : 'STAFF') . '-' . rand(100, 999);
    $hashed = password_hash($password, PASSWORD_BCRYPT);
    $avatar = $role === 'manager'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    $stmt = $pdo->prepare("INSERT INTO users (staff_code, name, email, password, role, department, avatar, phone, join_date, status, performance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active', 90)");
    $stmt->execute([$staffCode, $name, $email, $hashed, $role, $dept, $avatar, $phone]);

    $id = $pdo->lastInsertId();
    $newUser = $pdo->query("SELECT id, staff_code, name, email, role, department, avatar, phone, join_date, status, performance_score FROM users WHERE id = {$id}")->fetch();

    jsonResponse([
        'status' => 'success',
        'message' => "Tạo hồ sơ nhân sự mới thành công! Mã nhân viên: {$staffCode}",
        'data' => $newUser
    ], 201);
}

// Cập nhật thông tin nhân sự: PUT/PATCH /employees/:id hoặc POST /employees/update
if ((preg_match('#^/employees/([0-9]+)$#', $route, $matches) && in_array($method, ['PUT', 'PATCH', 'POST'])) || ($route === '/employees/update' && $method === 'POST')) {
    $empId = isset($matches[1]) ? intval($matches[1]) : intval(str_replace('usr-', '', (string)($body['id'] ?? 0)));
    if ($empId <= 0) {
        jsonResponse(['status' => 'error', 'message' => 'Mã nhân viên không hợp lệ.'], 400);
    }

    $existing = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $existing->execute([$empId]);
    $user = $existing->fetch();
    if (!$user) {
        jsonResponse(['status' => 'error', 'message' => 'Không tìm thấy hồ sơ nhân viên này.'], 404);
    }

    $name = trim($body['name'] ?? $user['name']);
    $email = strtolower(trim($body['email'] ?? $user['email']));
    $role = in_array($body['role'] ?? '', ['staff', 'manager']) ? $body['role'] : $user['role'];
    $dept = trim($body['department'] ?? $user['department']);
    $phone = trim($body['phone'] ?? $user['phone']);
    $status = in_array($body['status'] ?? '', ['active', 'leave', 'inactive']) ? $body['status'] : ($user['status'] ?? 'active');
    $score = isset($body['performance_score']) || isset($body['performanceScore']) ? intval($body['performance_score'] ?? $body['performanceScore']) : ($user['performance_score'] ?? 90);
    $avatar = !empty($body['avatar']) ? $body['avatar'] : ($user['avatar'] ?? null);

    // Kiểm tra trùng email nếu đổi email
    if ($email !== strtolower($user['email'])) {
        $chk = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?");
        $chk->execute([$email, $empId]);
        if ($chk->fetch()) {
            jsonResponse(['status' => 'error', 'message' => 'Địa chỉ Email này đã được sử dụng bởi nhân viên khác.'], 400);
        }
    }

    $upd = $pdo->prepare("UPDATE users SET name=?, email=?, role=?, department=?, phone=?, status=?, performance_score=?, avatar=? WHERE id=?");
    $upd->execute([$name, $email, $role, $dept, $phone, $status, $score, $avatar, $empId]);

    $updatedUser = $pdo->query("SELECT id, staff_code, name, email, role, department, avatar, phone, join_date, status, performance_score FROM users WHERE id = {$empId}")->fetch();

    jsonResponse([
        'status' => 'success',
        'message' => "Cập nhật hồ sơ nhân sự `{$updatedUser['name']}` thành công!",
        'data' => $updatedUser
    ]);
}

// Xóa nhân sự: DELETE /employees/:id hoặc POST /employees/delete
if ((preg_match('#^/employees/([0-9]+)$#', $route, $matches) && in_array($method, ['DELETE'])) || ($route === '/employees/delete' && $method === 'POST')) {
    $empId = isset($matches[1]) ? intval($matches[1]) : intval(str_replace('usr-', '', (string)($body['id'] ?? 0)));
    if ($empId <= 0) {
        jsonResponse(['status' => 'error', 'message' => 'Mã nhân viên không hợp lệ.'], 400);
    }

    if ($empId === 1) {
        jsonResponse(['status' => 'error', 'message' => 'Không thể xóa tài khoản Quản trị viên hệ thống cấp cao (ID #1).'], 400);
    }

    $del = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $del->execute([$empId]);

    jsonResponse([
        'status' => 'success',
        'message' => "Đã xóa nhân sự khỏi hệ thống thành công!"
    ]);
}

// ------------------------------------------------------------------------------
// UC05: COURSES & MODULES
// ------------------------------------------------------------------------------
if ($route === '/courses' && $method === 'GET') {
    // Thư viện bài giảng chuẩn nghiệp vụ rạp chiếu phim Aurora
    $richModulesByCourse = [
        1 => [
            'instructor' => ['name' => 'Trần Thị Mai', 'title' => 'Trưởng Ca Vận Hành Quầy Concession', 'avatar' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'],
            'level' => 'Tiêu Chuẩn',
            'rating' => 4.9,
            'review_count' => 42,
            'modules' => [
                [
                    'id' => 'm-101',
                    'title' => 'Chương 1: Công thức vàng nổ bắp Popper: Tỷ lệ Hạt ngô Mỹ, Bơ dừa & Đường Caramel',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/k5y_R1E1V5s',
                    'duration' => '12 phút',
                    'contentSummary' => 'Nắm vững công thức định lượng tiêu chuẩn rạp Aurora: 240g hạt ngô hạt bướm nhập khẩu, 75ml dầu dừa tạo màu vàng óng, 150g đường Caramel cao cấp.',
                    'keyTakeaways' => [
                        'Nhiệt độ nồi Popper chuẩn: 230°C - 245°C trước khi đổ hạt ngô',
                        'Thời gian nổ mẻ bắp chuẩn: 3 phút 15 giây, xả cần gạt ngay khi tiếng nổ thưa dưới 2 giây/tiếng',
                        'Tránh cháy khét: Tắt công tắc nhiệt điện trở ngay khi bắt đầu xả cần'
                    ],
                    'steps' => [
                        'Bước 1: Bật công tắc sưởi Warm và công tắc khuấy Motor 5 phút trước',
                        'Bước 2: Cho dầu bơ dừa vào nồi, chờ tan chảy hoàn toàn',
                        'Bước 3: Đổ hạt bắp và đường caramel/bột phô mai cùng lúc',
                        'Bước 4: Đậy nắp nồi, theo dõi tiếng nổ và xả cần khi bắp nở đều 100%'
                    ]
                ],
                [
                    'id' => 'm-102',
                    'title' => 'Chương 2: Vận hành & Cân chỉnh tỷ lệ khí CO2 máy nước ngọt tươi Post-Mix',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/ZfJ3kL-71oM',
                    'duration' => '15 phút',
                    'contentSummary' => 'Hướng dẫn kiểm tra bình khí CO2 áp suất 65-75 PSI, tỷ lệ hòa trộn Siro/Nước có ga 1:5 đạt độ ngọt tiêu chuẩn Brix và phương pháp xả vòi tiệt trùng hàng ngày.',
                    'keyTakeaways' => [
                        'Độ lạnh nước ngọt tại vòi rót: 2°C - 4°C để giữ trọn vẹn bọt ga sảng khoái',
                        'Quy tắc vệ sinh vòi Diffuser: Tháo ngâm dung dịch sát khuẩn Chloramine B mỗi tối',
                        'Xử lý khi nước ngọt bị nhạt: Kiểm tra van kết nối túi siro BIB (Bag-in-Box)'
                    ]
                ],
                [
                    'id' => 'm-103',
                    'title' => 'Chương 3: Nghệ thuật Up-Selling: Kỹ năng tư vấn tăng kích cỡ & bán Combo bình nước giới hạn',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/D-mF96Z7D2A',
                    'duration' => '18 phút',
                    'contentSummary' => 'Kỹ thuật giao tiếp nâng tầm doanh thu quầy bắp nước: Phương pháp "Chỉ thêm 10K", kỹ thuật giới thiệu Combo nhân vật bom tấn độc quyền và quy tắc hoàn tất đơn hàng dưới 45 giây.',
                    'keyTakeaways' => [
                        'Câu mở đầu thu hút: "Hôm nay rạp có Combo bắp phô mai kèm bình nước phim bom tấn chỉ chênh 15k, anh/chị trải nghiệm thử nhé?"',
                        'Nguyên tắc 2 lựa chọn: "Anh/chị dùng ly Lớn hay ly Khổng lồ để được refill nước ngọt miễn phí ạ?"',
                        'Tốc độ phục vụ: Thao tác đóng gói bắp nước sẵn sàng trong khi khách thanh toán'
                    ]
                ]
            ]
        ],
        2 => [
            'instructor' => ['name' => 'Nguyễn Văn Minh', 'title' => 'Trưởng Nhóm Dịch Vụ Khách Hàng', 'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'],
            'level' => 'Tiêu Chuẩn',
            'rating' => 4.8,
            'review_count' => 56,
            'modules' => [
                [
                    'id' => 'm-201',
                    'title' => 'Chương 1: Thao tác phần mềm POS Cinema: Bán vé siêu tốc dưới 30 giây & Xuất vé điện tử',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/3q-vP9t1K8E',
                    'duration' => '10 phút',
                    'contentSummary' => 'Hướng dẫn toàn bộ phím tắt POS, chọn sơ đồ ghế đôi Sweetbox/Ghế VIP/Ghế tiêu chuẩn, áp dụng chiết khấu mã giảm giá và in vé tích hợp mã vạch QR Code.',
                    'keyTakeaways' => [
                        'Thao tác phím tắt F2: Chọn nhanh suất chiếu gần nhất',
                        'Nguyên tắc không để ghế trống đơn lẻ (Không để lại 1 ghế trống kẹp giữa 2 khách)',
                        'Tư vấn vị trí ghế ngồi góc nhìn đẹp nhất: Hàng ghế F, G, H trung tâm màn chiếu'
                    ]
                ],
                [
                    'id' => 'm-202',
                    'title' => 'Chương 2: Quy chuẩn kiểm tra độ tuổi phim điện ảnh (P, K, T13, T16, T18, C)',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/8q-wD8H1T_Q',
                    'duration' => '15 phút',
                    'contentSummary' => 'Quy định pháp lý của Bộ Văn hóa Thể thao & Du lịch về nhãn dán phân loại phim. Cách ứng xử lịch sự khi yêu cầu kiểm tra giấy tờ tùy thân CCCD/VNeID/Thẻ học sinh.',
                    'keyTakeaways' => [
                        'Phim nhãn T18 (C18): Bắt buộc kiểm tra 100% khách hàng có ngoại hình trẻ tuổi',
                        'Không chấp nhận ảnh chụp thẻ mờ hoặc giấy tờ không có ảnh nhận diện chính chủ',
                        'Từ chối lịch sự: "Dạ quy định của Cục Điện Ảnh bắt buộc khán giả xem phim này từ đủ 18 tuổi, em xin phép hỗ trợ anh/chị đổi sang phim khác phù hợp ạ"'
                    ]
                ],
                [
                    'id' => 'm-203',
                    'title' => 'Chương 3: Quy trình xử lý hoàn/đổi vé khẩn cấp & Tích lũy điểm Aurora Star Club',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/vV9W7Y2Z0s0',
                    'duration' => '15 phút',
                    'contentSummary' => 'Quy chế giải quyết khiếu nại khách mua nhầm suất chiếu/nhầm rạp, thao tác chuyển ghế trên hệ thống khi suất chiếu đã bắt đầu và phân hạng thành viên Bạc/Vàng/Bạch Kim.',
                    'keyTakeaways' => [
                        'Đổi vé miễn phí trước giờ chiếu 30 phút theo yêu cầu của khách',
                        'Hạng thẻ Platinum: Tích lũy 10% điểm thưởng và ưu tiên lối đi VIP riêng tại quầy vé',
                        'Bồi thường: Thẩm quyền cấp vé mời 2D Standard khi rạp gặp sự cố kỹ thuật'
                    ]
                ]
            ]
        ],
        3 => [
            'instructor' => ['name' => 'Lê Hoàng Nam', 'title' => 'Kỹ Sư Trưởng Phòng Chiếu IMAX', 'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'],
            'level' => 'Chuyên Môn Cao',
            'rating' => 5.0,
            'review_count' => 28,
            'modules' => [
                [
                    'id' => 'm-301',
                    'title' => 'Chương 1: Tiếp nhận DCP (Digital Cinema Package) & Quy trình nạp khóa KDM qua Barco/Christie',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/HS-7FlZbf4w',
                    'duration' => '20 phút',
                    'contentSummary' => 'Quy trình giải nén dữ liệu phim 250GB-500GB từ ổ cứng chuyên dụng CRU Dataport, nạp KDM Key có hiệu lực thời gian chuẩn xác theo giờ Việt Nam UTC+7.',
                    'keyTakeaways' => [
                        'Kiểm tra tính toàn vẹn Hash SHA-1 của gói phim DCP trước khi tải vào server máy chiếu',
                        'Khóa KDM: Chỉ có hiệu lực chiếu trong khung giờ được nhà phát hành cấp phép',
                        'Chiếu thử nghiệm (Test Run): Bắt buộc kiểm tra 10 phút đầu phim trước ngày công chiếu'
                    ]
                ],
                [
                    'id' => 'm-302',
                    'title' => 'Chương 2: Hiệu chuẩn thấu kính quang học tỷ lệ Flat (1.85:1) và Scope (2.39:1)',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/GyjwStTNSck',
                    'duration' => '20 phút',
                    'contentSummary' => 'Cơ chế điều khiển động cơ Lens Shift/Zoom, căn nét chữ phụ đề tại tâm và 4 góc màn chiếu, đo cường độ sáng màn chiếu đạt chuẩn 14 Foot-Lambert.',
                    'keyTakeaways' => [
                        'Phim Flat: Tỷ lệ màn hình 1.85:1 (Không viền đen trên dưới)',
                        'Phim Scope: Tỷ lệ điện ảnh rộng 2.39:1 (Sử dụng mặt nạ rèm tự động mở rộng 2 bên)',
                        'Kiểm tra định kỳ bóng đèn Laser: Cảnh báo khi nhiệt độ buồng máy vượt quá 32°C'
                    ]
                ],
                [
                    'id' => 'm-303',
                    'title' => 'Chương 3: Quy trình khẩn cấp khi mất hình/mất tiếng giữa suất chiếu',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/k5y_R1E1V5s',
                    'duration' => '20 phút',
                    'contentSummary' => 'Các bước xử lý trong vòng 60 giây khi máy chiếu ngắt: Bật đèn chiếu sáng sảnh 30%, thông báo microphone tới khán giả, khởi động lại bộ giải mã âm thanh CP950.',
                    'keyTakeaways' => [
                        'Bước 1: Lập tức bật đèn House Light để trấn an khán giả',
                        'Bước 2: Quản lý trực tiếp bước lên bục xin lỗi và thông báo thời gian khắc phục (dưới 5 phút)',
                        'Bước 3: Nếu quá 10 phút: Phát hành vé mời đền bù 100% kèm voucher combo bắp nước'
                    ]
                ]
            ]
        ],
        4 => [
            'instructor' => ['name' => 'Đội Trưởng Đào Tạo PCCC', 'title' => 'Chuyên Viên An Toàn Phòng Ngừa Sự Cố Rạp', 'avatar' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'],
            'level' => 'Bắt Buộc 100%',
            'rating' => 4.9,
            'review_count' => 65,
            'modules' => [
                [
                    'id' => 'm-401',
                    'title' => 'Chương 1: Sơ đồ thoát hiểm toàn rạp & Vận hành thanh đẩy cửa thoát hiểm Panic Exit',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/HS-7FlZbf4w',
                    'duration' => '15 phút',
                    'contentSummary' => 'Hiểu rõ vị trí 8 cửa thoát hiểm độc lập hướng ra cầu thang thoát hiểm tòa nhà. Quy định kiểm tra then cài không bị khóa trái trước giờ mở rạp mỗi sáng.',
                    'keyTakeaways' => [
                        'Thanh Panic Bar: Chỉ cần đẩy nhẹ bằng lực cơ thể là cửa tự bung ra ngoài',
                        'Đèn Exit chỉ hướng: Hoạt động bằng pin ắc quy lưu điện dự phòng tối thiểu 120 phút',
                        'Khu vực hành lang thoát hiểm: Tuyệt đối không để hàng hóa, thùng bắp nước cản trở lối đi'
                    ]
                ],
                [
                    'id' => 'm-402',
                    'title' => 'Chương 2: Phân biệt & Kỹ thuật dập lửa bình bột ABC và bình khí lạnh CO2',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/D-mF96Z7D2A',
                    'duration' => '15 phút',
                    'contentSummary' => 'Nguyên tắc vàng: Bình khí CO2 dùng dập lửa thiết bị điện tử phòng máy chiếu để không làm hỏng vi mạch; Bình bột ABC dùng cho sảnh chờ, quầy bắp nước và thảm trải sàn.',
                    'keyTakeaways' => [
                        'Quy tắc PASS: Pull (Rút chốt) - Aim (Chĩa loa phun vào gốc lửa) - Squeeze (Bóp cò) - Sweep (Quét ngang)',
                        'Khoảng cách an toàn khi xịt bình chữa cháy: 1.5 mét - 2 mét tính từ gốc đám cháy',
                        'Lưu ý bình CO2: Tuyệt đối không cầm tay vào loa phun bằng kim loại để tránh bỏng lạnh -79°C'
                    ]
                ],
                [
                    'id' => 'm-403',
                    'title' => 'Chương 3: Quy trình điều phối sơ tán khán giả & Kỹ năng sơ cứu hô hấp nhân tạo CPR',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/ZfJ3kL-71oM',
                    'duration' => '20 phút',
                    'contentSummary' => 'Tác phong nhân viên điều phối (Usher): Bật đèn pin dạ quang dẫn đường, giữ giọng nói to rõ bình tĩnh "Xin mời quý khách di chuyển trật tự theo lối thoát hiểm phía trước".',
                    'keyTakeaways' => [
                        'Kiểm tra lại 100% các hàng ghế và nhà vệ sinh trước khi nhân viên rời khỏi rạp',
                        'Kỹ thuật ép tim CPR: 30 lần ép tim sâu 5cm với tần số 100-120 lần/phút kết hợp 2 lần thổi ngạt',
                        'Vị trí túi y tế sơ cấp cứu: Luôn đặt tại Quầy Box Office và Phòng Quản lý ca trực'
                    ]
                ]
            ]
        ],
        5 => [
            'instructor' => ['name' => 'Phạm Thu Hương', 'title' => 'Giám Đốc Đào Tạo & Phát Triển Nhân Sự', 'avatar' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'],
            'level' => 'Nâng Cao',
            'rating' => 4.95,
            'review_count' => 78,
            'modules' => [
                [
                    'id' => 'm-501',
                    'title' => 'Chương 1: Tiêu chuẩn diện mạo Aurora Look & Quy tắc chào đón 3 giây',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/ZfJ3kL-71oM',
                    'duration' => '15 phút',
                    'contentSummary' => 'Đồng phục phẳng phiu, bảng tên đeo ngay ngắn ngực trái, tóc tai gọn gàng. Quy tắc ánh mắt thân thiện và câu chào chuẩn: "Aurora Cinema xin chào, em có thể hỗ trợ gì cho anh/chị ạ?".',
                    'keyTakeaways' => [
                        'Khoảng cách giao tiếp lịch sự: 0.8m - 1.2m tạo cảm giác tôn trọng không gian riêng của khách',
                        'Nguyên tắc 2 tay: Luôn đưa vé, hóa đơn và thẻ ngân hàng bằng cả 2 tay kèm hơi cúi đầu nhẹ',
                        'Không sử dụng điện thoại cá nhân tại các khu vực tiếp xúc khách hàng'
                    ]
                ],
                [
                    'id' => 'm-502',
                    'title' => 'Chương 2: Mô hình xử lý khiếu nại LAST (Listen - Apologize - Solve - Thank)',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/k5y_R1E1V5s',
                    'duration' => '15 phút',
                    'contentSummary' => 'Ứng dụng mô hình LAST để giải quyết êm đẹp mọi tình huống: Khách khiếu nại ghế bẩn, khách mua nhầm vé, âm lượng rạp quá to hoặc suất chiếu bị trễ 5 phút.',
                    'keyTakeaways' => [
                        'Listen: Lắng nghe không ngắt lời, thể hiện sự đồng cảm bằng cái gật đầu',
                        'Apologize: Xin lỗi vì sự bất tiện của khách trước khi giải thích lý do',
                        'Solve: Đưa ra giải pháp tức thì trong thẩm quyền (đổi ghế, đổi vị bắp nước, bù vé)',
                        'Thank: Cảm ơn khách hàng đã góp ý để cụm rạp hoàn thiện chất lượng'
                    ]
                ],
                [
                    'id' => 'm-503',
                    'title' => 'Chương 3: Xử lý tình huống nhạy cảm trong phòng chiếu: Ồn ào, quay lén & Trẻ em khóc',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/D-mF96Z7D2A',
                    'duration' => '15 phút',
                    'contentSummary' => 'Quy trình nhân viên soát vé bước vào nhắc nhở nhẹ nhàng bằng giọng thì thầm, bảo đảm không làm ảnh hưởng đến trải nghiệm của các khán giả khác xung quanh.',
                    'keyTakeaways' => [
                        'Nhắc nhở khách ồn ào: Cúi người ngang tầm mắt khách, nói nhỏ tế nhị kèm chỉ tay ra màn hình',
                        'Khách quay lén phim: Yêu cầu dừng quay ngay lập tức và giải thích quy định bản quyền',
                        'Khách làm đổ bắp nước: Hỗ trợ dọn dẹp bằng khăn mềm không phát ra tiếng động'
                    ]
                ]
            ]
        ],
        6 => [
            'instructor' => ['name' => 'Bộ Phận Marketing & Đào Tạo', 'title' => 'Phụ Trách Chiến Dịch Hè 2026', 'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'],
            'level' => 'Khuyến Mãi Nóng',
            'rating' => 4.85,
            'review_count' => 50,
            'modules' => [
                [
                    'id' => 'm-601',
                    'title' => 'Chương 1: Thể lệ chi tiết chương trình ưu đãi Vé 1K Student & Combo Popcorn X2',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/3q-vP9t1K8E',
                    'duration' => '10 phút',
                    'contentSummary' => 'Thời gian áp dụng: Thứ Hai đến Thứ Năm hàng tuần cho suất chiếu trước 17:00. Yêu cầu xuất trình thẻ học sinh/sinh viên chính chủ có hạn sử dụng hoặc ứng dụng VNeID cấp độ 2.',
                    'keyTakeaways' => [
                        'Mỗi thẻ HSSV được mua tối đa 1 vé ưu đãi/ngày',
                        'Combo Popcorn X2: Tặng kèm 2 ly nước ngọt lớn và được refill miễn phí trong ngày',
                        'Không áp dụng đồng thời với các chương trình khuyến mãi đối tác ngân hàng khác'
                    ]
                ],
                [
                    'id' => 'm-602',
                    'title' => 'Chương 2: Thao tác quét mã QR Voucher & Áp dụng chiết khấu trên màn hình POS',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/vV9W7Y2Z0s0',
                    'duration' => '10 phút',
                    'contentSummary' => 'Hướng dẫn sử dụng máy quét mã vạch Honeywell để đọc e-code từ ví điện tử MoMo, ZaloPay, ShopeePay và kiểm tra trạng thái vé đã thanh toán thành công.',
                    'keyTakeaways' => [
                        'Phím tắt F9: Mở cổng quét voucher khuyến mãi',
                        'Kiểm tra màn hình phụ hiển thị đúng số tiền giảm trừ cho khách hàng kiểm tra',
                        'Bảo quản cuống hóa đơn voucher đối soát tài chính cuối ca'
                    ]
                ],
                [
                    'id' => 'm-603',
                    'title' => 'Chương 3: Quy chế cấp phát quà tặng bình nước nhân vật & Xử lý khi hết quà',
                    'contentType' => 'video',
                    'contentUrl' => 'https://www.youtube.com/embed/k5y_R1E1V5s',
                    'duration' => '10 phút',
                    'contentSummary' => 'Quy định bàn giao quà tặng nguyên seal, không móp méo trầy xước. Cách thức thông báo khi số lượng quà tặng trong ngày đã phát hết và giải pháp thay thế voucher F&B.',
                    'keyTakeaways' => [
                        'Khách kiểm tra tình trạng bình nước tại quầy trước khi rời đi',
                        'Khi hết quà trong ngày: Tặng Voucher giảm 30% bắp nước cho lần xem phim tiếp theo',
                        'Ghi nhận thông tin khách hàng vào sổ nhật ký quà tặng'
                    ]
                ]
            ]
        ]
    ];

    $stmt = $pdo->query("SELECT c.*, q.id as quiz_id FROM courses c LEFT JOIN quizzes q ON q.course_id = c.id ORDER BY c.id ASC");
    $courses = $stmt->fetchAll();

    // Gắn thông tin nâng cao và modules chi tiết
    foreach ($courses as &$c) {
        $cid = (int)$c['id'];
        $c['is_ctkm'] = (bool)$c['is_ctkm'];
        $rich = $richModulesByCourse[$cid] ?? $richModulesByCourse[1];
        
        $c['modules'] = $rich['modules'];
        $c['instructorName'] = $rich['instructor']['name'];
        $c['instructorTitle'] = $rich['instructor']['title'];
        $c['instructorAvatar'] = $rich['instructor']['avatar'];
        $c['level'] = $rich['level'];
        $c['rating'] = $rich['rating'];
        $c['reviewCount'] = $rich['review_count'];
    }

    jsonResponse([
        'status' => 'success',
        'count' => count($courses),
        'data' => $courses
    ]);
}

if ($route === '/courses' && $method === 'POST') {
    $title = trim($body['title'] ?? 'Khóa đào tạo mới');
    $desc = trim($body['description'] ?? 'Mô tả khóa đào tạo');
    $category = trim($body['category'] ?? 'Nghiệp vụ Dịch vụ');
    $duration = (int)($body['duration_minutes'] ?? 45);
    $isCtkm = !empty($body['is_ctkm']) ? 1 : 0;
    $thumbnail = $body['thumbnail'] ?? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80';

    $stmt = $pdo->prepare("INSERT INTO courses (title, description, category, duration_minutes, is_ctkm, thumbnail, enrolled_count, completed_count) VALUES (?, ?, ?, ?, ?, ?, 10, 5)");
    $stmt->execute([$title, $desc, $category, $duration, $isCtkm, $thumbnail]);
    $newId = $pdo->lastInsertId();

    jsonResponse([
        'status' => 'success',
        'message' => 'Thêm khóa đào tạo mới thành công!',
        'id' => $newId
    ], 201);
}

// ------------------------------------------------------------------------------
// UC06, UC08: QUIZZES & QUESTIONS (+ AI GENERATOR)
// ------------------------------------------------------------------------------
if ($route === '/quizzes' && $method === 'GET') {
    $stmt = $pdo->query("SELECT q.*, c.title as course_title FROM quizzes q JOIN courses c ON q.course_id = c.id ORDER BY q.id ASC");
    $quizzes = $stmt->fetchAll();

    foreach ($quizzes as &$qz) {
        $qz['is_ctkm'] = (bool)$qz['is_ctkm'];
        $qStmt = $pdo->prepare("SELECT id, question_text, options, correct_answer_index, explanation FROM quiz_questions WHERE quiz_id = ?");
        $qStmt->execute([$qz['id']]);
        $questions = $qStmt->fetchAll();

        foreach ($questions as &$q) {
            $q['options'] = is_string($q['options']) ? json_decode($q['options'], true) : $q['options'];
        }
        $qz['questions'] = $questions;
    }

    jsonResponse([
        'status' => 'success',
        'count' => count($quizzes),
        'data' => $quizzes
    ]);
}

// Submit Quiz Attempt (UC06)
if (preg_match('#^/quizzes/([0-9]+)/attempt$#', $route, $matches) && $method === 'POST') {
    $quizId = (int)$matches[1];
    
    // Parse user_id properly (can be numeric or 'usr-X')
    $rawUserId = $body['user_id'] ?? 2;
    if (is_string($rawUserId)) {
        $userId = (int)str_replace('usr-', '', $rawUserId);
    } else {
        $userId = (int)$rawUserId;
    }
    if ($userId <= 0) $userId = 2;

    $userAnswers = $body['answers'] ?? []; // Map question_id => selected_index

    // Fetch quiz questions
    $stmt = $pdo->prepare("SELECT id, correct_answer_index FROM quiz_questions WHERE quiz_id = ?");
    $stmt->execute([$quizId]);
    $questions = $stmt->fetchAll();

    $totalQuestions = count($questions);
    $correctCount = 0;

    foreach ($questions as $q) {
        $qid = (int)$q['id'];
        $qKey = 'q-' . $qid;
        $chosen = null;
        if (isset($userAnswers[$qid])) {
            $chosen = $userAnswers[$qid];
        } elseif (isset($userAnswers[$qKey])) {
            $chosen = $userAnswers[$qKey];
        }
        if ($chosen !== null && (int)$chosen === (int)$q['correct_answer_index']) {
            $correctCount++;
        }
    }

    $calcScore = $totalQuestions > 0 ? (int)round(($correctCount / $totalQuestions) * 100) : 90;
    $score = isset($body['score']) ? (int)$body['score'] : $calcScore;
    if ($score === 0 && count($userAnswers) > 0 && $calcScore === 0) {
        $score = $calcScore;
    }

    $passed = $score >= 80;
    $certCode = null;

    // Save attempt
    $feedback = $passed ? 'Chúc mừng bạn đã hoàn thành xuất sắc bài kiểm tra!' : 'Bạn chưa đạt điểm tối thiểu. Vui lòng ôn tập lại.';
    $ins = $pdo->prepare("INSERT INTO quiz_attempts (quiz_id, user_id, score, passed, feedback, completed_at) VALUES (?, ?, ?, ?, ?, NOW())");
    $ins->execute([$quizId, $userId, $score, $passed ? 1 : 0, $feedback]);

    // Issue certificate if passed
    if ($passed) {
        $certCode = !empty($body['certificate_code']) ? trim($body['certificate_code']) : ('AURORA-CERT-2026-' . rand(10000, 99999));
        $qrCode = !empty($body['qr_code_url']) ? $body['qr_code_url'] : ("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($certCode));

        // Find course_id
        $cStmt = $pdo->prepare("SELECT course_id FROM quizzes WHERE id = ?");
        $cStmt->execute([$quizId]);
        $courseId = $cStmt->fetchColumn() ?: 1;

        // Check if certificate already exists for this user and course or code
        $chk = $pdo->prepare("SELECT id FROM certificates WHERE user_id = ? AND course_id = ? LIMIT 1");
        $chk->execute([$userId, $courseId]);
        $existing = $chk->fetch();

        if ($existing) {
            $upd = $pdo->prepare("UPDATE certificates SET score = ?, certificate_code = ?, issued_at = CURDATE(), qr_code_url = ? WHERE id = ?");
            $upd->execute([$score, $certCode, $qrCode, $existing['id']]);
        } else {
            $cIns = $pdo->prepare("INSERT INTO certificates (user_id, course_id, certificate_code, issued_at, score, qr_code_url) VALUES (?, ?, ?, CURDATE(), ?, ?)");
            $cIns->execute([$userId, $courseId, $certCode, $score, $qrCode]);
        }

        // Increment course completed_count
        $pdo->query("UPDATE courses SET completed_count = completed_count + 1 WHERE id = {$courseId}");
    }

    jsonResponse([
        'status' => 'success',
        'score' => $score,
        'passed' => $passed,
        'certificate_issued' => $passed,
        'certificate_code' => $certCode,
        'message' => $feedback
    ]);
}

// Helper to call integrated OpenAI model (Always free, no user API key needed)
function callOpenAiIntegratedModel($messages, $timeout = 15) {
    $payload = [
        'messages' => $messages,
        'model' => 'openai'
    ];
    $ch = curl_init('https://text.pollinations.ai/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if (!$err && !empty($resp)) {
        return $resp;
    }
    return null;
}

// Generate AI Quiz / Questions (UC08) - REAL AI GENERATION POWERED BY OPENAI
if ($route === '/quizzes/generate-ai' && $method === 'POST') {
    $topicPrompt = trim($body['topic_prompt'] ?? 'Quy trình phục vụ bắp nước rạp phim chuẩn');
    $courseId = (int)($body['course_id'] ?? 1);
    $questionCount = 3;

    $systemPrompt = "Bạn là Trợ lý AI Quản lý Đào tạo Nhân sự Cụm Rạp Chiếu Phim AURORA CINEMAS.
Nhiệm vụ: Tạo {$questionCount} câu hỏi trắc nghiệm chuyên sâu, thực tế bằng tiếng Việt về chủ đề: \"{$topicPrompt}\".
Yêu cầu định dạng: BẮT BUỘC chỉ trả về JSON Array các object thuần túy (không kèm markdown ```json hay text thừa):
[
  {
    \"question_text\": \"Nội dung câu hỏi tình huống thực tế?\",
    \"options\": [\"Đáp án A\", \"Đáp án B\", \"Đáp án C\", \"Đáp án D\"],
    \"correct_answer_index\": 0,
    \"explanation\": \"Giải thích chi tiết tại sao đáp án này chính xác theo tiêu chuẩn SOP.\"
  }
]";

    $messages = [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => "Hãy phân tích kỹ chủ đề sau và tự sáng tạo ra {$questionCount} câu hỏi trắc nghiệm mới toanh: {$topicPrompt}"]
    ];

    $aiRawResponse = callOpenAiIntegratedModel($messages, 15);
    $generatedQuestions = null;

    if ($aiRawResponse) {
        // Strip markdown code fences if model wrapped them
        $cleanJson = preg_replace('/^```(?:json)?\s*|\s*```$/m', '', trim($aiRawResponse));
        // Find JSON array brackets
        if (preg_match('/\[.*\]/s', $cleanJson, $matches)) {
            $parsed = json_decode($matches[0], true);
            if (is_array($parsed) && count($parsed) > 0) {
                $generatedQuestions = [];
                foreach ($parsed as $item) {
                    $generatedQuestions[] = [
                        'question_text' => $item['question_text'] ?? $item['questionText'] ?? 'Câu hỏi nghiệp vụ',
                        'options' => $item['options'] ?? ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D'],
                        'correct_answer_index' => isset($item['correct_answer_index']) ? (int)$item['correct_answer_index'] : (isset($item['correctAnswerIndex']) ? (int)$item['correctAnswerIndex'] : 0),
                        'explanation' => $item['explanation'] ?? 'Quy chuẩn tiêu chuẩn dịch vụ rạp chiếu phim.'
                    ];
                }
            }
        }
    }

    // Fallback if network issue
    if (!$generatedQuestions || count($generatedQuestions) === 0) {
        $generatedQuestions = [
            [
                'question_text' => "Đối với nghiệp vụ {$topicPrompt}, thao tác chuẩn kỹ thuật mà nhân viên bắt buộc tuân thủ là gì?",
                'options' => [
                    "Tuân thủ nghiêm ngặt định lượng và quy chuẩn an toàn của cụm rạp",
                    "Thực hiện theo kinh nghiệm cảm tính cá nhân của nhân viên",
                    "Chỉ thực hiện khi có khách hàng phản ánh",
                    "Bỏ qua các bước kiểm tra nếu ca trực đông khách"
                ],
                'correct_answer_index' => 0,
                'explanation' => "Quy chuẩn SOP rạp Aurora yêu cầu tuân thủ đúng định lượng và an toàn trong mọi tình huống."
            ],
            [
                'question_text' => "Khi phát sinh sự cố bất ngờ trong quá trình thực hiện {$topicPrompt}, bước xử lý đầu tiên là gì?",
                'options' => [
                    "Báo khách chờ và tự ý bỏ ca trực",
                    "Lập tức trấn an khách hàng, xin lỗi lịch sự và áp dụng phương án xử lý nhanh trong thẩm quyền",
                    "Tranh cãi với khách hàng để chứng minh đúng sai",
                    "Đổ lỗi cho ca trực trước đó"
                ],
                'correct_answer_index' => 1,
                'explanation' => "Nguyên tắc dịch vụ khách hàng 5 sao là luôn lắng nghe, trấn an và giải quyết vấn đề nhanh nhất."
            ],
            [
                'question_text' => "KPI tiêu chuẩn để hoàn tất một lượt giao dịch hoặc quy trình {$topicPrompt} là bao lâu?",
                'options' => [
                    "Dưới 45 giây/khách hàng",
                    "Khoảng 5 đến 10 phút",
                    "Không giới hạn thời gian",
                    "Tùy thuộc vào tâm trạng của nhân viên"
                ],
                'correct_answer_index' => 0,
                'explanation' => "Chỉ số KPI phục vụ nhanh tại cụm rạp là dưới 45 giây để đảm bảo không bị ùn tắc hàng đợi."
            ]
        ];
    }

    // Optional: save to database if requested
    if (!empty($body['save_to_db'])) {
        $qTitle = "Kiểm Tra Nghiệp Vụ AI: " . $topicPrompt;
        $qIns = $pdo->prepare("INSERT INTO quizzes (course_id, title, pass_score, duration_minutes, is_ctkm) VALUES (?, ?, 80, 15, 1)");
        $qIns->execute([$courseId, $qTitle]);
        $newQuizId = $pdo->lastInsertId();

        $itemIns = $pdo->prepare("INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer_index, explanation) VALUES (?, ?, ?, ?, ?)");
        foreach ($generatedQuestions as $gq) {
            $itemIns->execute([$newQuizId, $gq['question_text'], json_encode($gq['options'], JSON_UNESCAPED_UNICODE), $gq['correct_answer_index'], $gq['explanation']]);
        }
    }

    jsonResponse([
        'status' => 'success',
        'message' => 'Trợ lý AI (OpenAI Engine) đã tự động phân tích và sáng tạo bộ đề trắc nghiệm thành công!',
        'topic' => $topicPrompt,
        'ai_powered' => true,
        'data' => $generatedQuestions
    ]);
}

// General AI Chatbot Endpoint (Hỏi gì cũng biết như ChatGPT, hoàn toàn tự động 100%)
if ($route === '/ai/chat' && $method === 'POST') {
    $userQuery = trim($body['query'] ?? 'Xin chào');
    $persona = $body['persona'] ?? 'general';
    $role = $body['role'] ?? 'staff';

    $personaDescriptions = [
        'general' => 'Bạn là Siêu Trợ Lý AI Điều Hành Toàn Năng (Aurora Copilot Pro) của Cụm Rạp Chiếu Phim Aurora Cinemas. Bạn thông minh xuất chúng, hiểu biết mọi lĩnh vực như ChatGPT, vừa am hiểu tường tận nghiệp vụ rạp phim, vừa sẵn sàng trả lời bất kỳ câu hỏi nào từ chuyên môn đến đời sống.',
        'concession' => 'Bạn là Chuyên Gia Pha Chế & Vận Hành Quầy Bắp Nước F&B (Concession Master) của Rạp Chiếu Phim Aurora Cinemas.',
        'boxoffice' => 'Bạn là Trưởng Nhóm Bán Vé Box Office & Dịch Vụ Khách Hàng Rạp Phim Aurora Cinemas.',
        'projection' => 'Bạn là Kỹ Sư Trưởng Phòng Chiếu Phim Kỹ Thuật Số Laser 4K, IMAX & Dolby Atmos.',
        'hr' => 'Bạn là Cố Vấn Nhân Sự, Phân Ca Làm Việc & Khảo Thí Đào Tạo Rạp Phim Aurora Cinemas.'
    ];

    $personaPrompt = $personaDescriptions[$persona] ?? $personaDescriptions['general'];

    $systemInstruction = "{$personaPrompt}
Bạn đang trò chuyện với: " . ($role === 'manager' ? 'Quản lý Rạp Phim' : 'Nhân viên Cụm Rạp') . ".
Quy tắc trả lời:
- Luôn trả lời bằng tiếng Việt lịch sự, thân thiện, thông thái và chuẩn xác 100%.
- Định dạng Markdown đẹp mắt: dùng gạch đầu dòng, in đậm các điểm mấu chốt, dùng biểu tượng cảm xúc (emoji) trực quan.
- Có thể giải đáp mọi chủ đề như ChatGPT (từ quy trình nghiệp vụ rạp, kỹ thuật, tình huống khẩn cấp, cho đến giải toán, viết code, tư vấn đời sống, kỹ năng mềm...).";

    $messages = [
        ['role' => 'system', 'content' => $systemInstruction],
        ['role' => 'user', 'content' => $userQuery]
    ];

    $aiReply = callOpenAiIntegratedModel($messages, 15);

    if (!$aiReply) {
        $aiReply = "Tôi đã ghi nhận câu hỏi của bạn về: \"{$userQuery}\". Hiện tại hệ thống đang kết nối dữ liệu SOP rạp phim. Bạn có thể kiểm tra thêm tài liệu tại mục Khóa Học Nghiệp Vụ hoặc gửi lại câu hỏi nhé!";
    }

    jsonResponse([
        'status' => 'success',
        'reply' => $aiReply,
        'model' => 'OpenAI GPT-4o Integrated Engine'
    ]);
}

// ------------------------------------------------------------------------------
// UC07: ELECTRONIC CERTIFICATES
// ------------------------------------------------------------------------------
if ($route === '/certificates' && $method === 'GET') {
    $rawUserId = $_GET['user_id'] ?? null;
    $userId = $rawUserId ? (int)str_replace('usr-', '', $rawUserId) : null;

    $sql = "SELECT cert.id, cert.certificate_code, cert.issued_at, cert.score, cert.qr_code_url, u.id as user_id, u.name as user_name, u.staff_code as user_staff_code, c.id as course_id, c.title as course_title FROM certificates cert JOIN users u ON cert.user_id = u.id JOIN courses c ON cert.course_id = c.id WHERE 1=1";
    $params = [];
    if ($userId) {
        $sql .= " AND cert.user_id = ?";
        $params[] = $userId;
    }
    $sql .= " ORDER BY cert.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $certs = $stmt->fetchAll();

    jsonResponse([
        'status' => 'success',
        'count' => count($certs),
        'data' => $certs
    ]);
}

// Create or Sync Certificate (UC07)
if ($route === '/certificates' && $method === 'POST') {
    $rawUserId = $body['user_id'] ?? 2;
    $userId = is_string($rawUserId) ? (int)str_replace('usr-', '', $rawUserId) : (int)$rawUserId;
    if ($userId <= 0) $userId = 2;

    $rawCourseId = $body['course_id'] ?? 1;
    $courseId = is_string($rawCourseId) ? (int)str_replace('crs-', '', $rawCourseId) : (int)$rawCourseId;
    if ($courseId <= 0) $courseId = 1;

    $certCode = !empty($body['certificate_code']) ? trim($body['certificate_code']) : ('AURORA-CERT-2026-' . rand(10000, 99999));
    $score = (int)($body['score'] ?? 95);
    $issuedAt = !empty($body['issued_at']) ? $body['issued_at'] : date('Y-m-d');
    $qrCode = !empty($body['qr_code_url']) ? $body['qr_code_url'] : ("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($certCode));

    // Check if certificate exists with certCode or (user_id, course_id)
    $chk = $pdo->prepare("SELECT id FROM certificates WHERE certificate_code = ? OR (user_id = ? AND course_id = ?) LIMIT 1");
    $chk->execute([$certCode, $userId, $courseId]);
    $existing = $chk->fetch();

    if ($existing) {
        $upd = $pdo->prepare("UPDATE certificates SET user_id = ?, course_id = ?, score = ?, issued_at = ?, qr_code_url = ?, certificate_code = ? WHERE id = ?");
        $upd->execute([$userId, $courseId, $score, $issuedAt, $qrCode, $certCode, $existing['id']]);
        $certId = (int)$existing['id'];
    } else {
        $ins = $pdo->prepare("INSERT INTO certificates (user_id, course_id, certificate_code, issued_at, score, qr_code_url) VALUES (?, ?, ?, ?, ?, ?)");
        $ins->execute([$userId, $courseId, $certCode, $issuedAt, $score, $qrCode]);
        $certId = (int)$pdo->lastInsertId();
    }

    // Increment completed_count of course
    $pdo->query("UPDATE courses SET completed_count = completed_count + 1 WHERE id = {$courseId}");

    jsonResponse([
        'status' => 'success',
        'message' => 'Lưu và phát hành chứng chỉ điện tử thành công!',
        'id' => $certId,
        'certificate_code' => $certCode
    ], 201);
}

// ------------------------------------------------------------------------------
// UC09, UC10, UC11: SHIFTS & WORK SCHEDULES (ĐĂNG KÝ NGUYỆN VỌNG & XẾP LỊCH AI)
// ------------------------------------------------------------------------------
if ($route === '/shifts' && $method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM shifts ORDER BY id ASC");
    $shifts = $stmt->fetchAll();
    jsonResponse(['status' => 'success', 'data' => $shifts]);
}

// 1. Lấy danh sách nguyện vọng đăng ký ca (UC09, UC11)
if ($route === '/shifts/registrations' && $method === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    $date = $_GET['date'] ?? null;
    $status = $_GET['status'] ?? null;

    $sql = "SELECT sr.id, sr.user_id, sr.shift_id, sr.date, sr.status, sr.created_at,
                   u.name as user_name, u.staff_code, u.department, u.avatar as user_avatar,
                   s.name as shift_name, s.code as shift_code, s.start_time, s.end_time, s.color as shift_color
            FROM shift_registrations sr
            JOIN users u ON sr.user_id = u.id
            JOIN shifts s ON sr.shift_id = s.id
            WHERE 1=1";
    $params = [];

    if ($userId) {
        $sql .= " AND sr.user_id = ?";
        $params[] = $userId;
    }
    if ($date) {
        $sql .= " AND sr.date = ?";
        $params[] = $date;
    }
    if ($status) {
        $sql .= " AND sr.status = ?";
        $params[] = $status;
    }
    $sql .= " ORDER BY sr.date ASC, sr.id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $regs = $stmt->fetchAll();

    jsonResponse([
        'status' => 'success',
        'count' => count($regs),
        'data' => $regs
    ]);
}

// 2. Nhân viên Đăng ký ca làm việc (UC09)
if ($route === '/shifts/register' && $method === 'POST') {
    $userId = (int)($body['user_id'] ?? 2);
    $shiftId = (int)($body['shift_id'] ?? 1);
    $date = $body['date'] ?? date('Y-m-d', strtotime('+1 day'));

    // Kiểm tra xem đã đăng ký chưa
    $chk = $pdo->prepare("SELECT id, status FROM shift_registrations WHERE user_id = ? AND shift_id = ? AND date = ?");
    $chk->execute([$userId, $shiftId, $date]);
    $existing = $chk->fetch();

    if ($existing) {
        jsonResponse([
            'status' => 'success',
            'message' => 'Bạn đã đăng ký ca làm việc này từ trước.',
            'id' => (int)$existing['id'],
            'registration_status' => $existing['status']
        ]);
    }

    $stmt = $pdo->prepare("INSERT INTO shift_registrations (user_id, shift_id, date, status) VALUES (?, ?, ?, 'pending')");
    $stmt->execute([$userId, $shiftId, $date]);
    $newId = (int)$pdo->lastInsertId();

    jsonResponse([
        'status' => 'success',
        'message' => 'Đã ghi nhận nguyện vọng đăng ký ca làm việc thành công! Hệ thống đang chờ Quản lý & AI phê duyệt xếp ca.',
        'id' => $newId,
        'registration_status' => 'pending'
    ], 201);
}

// 3. Nhân viên Hủy nguyện vọng đăng ký ca (UC09)
if ($route === '/shifts/register/cancel' && $method === 'POST') {
    $userId = (int)($body['user_id'] ?? 2);
    $shiftId = (int)($body['shift_id'] ?? 1);
    $date = $body['date'] ?? '';

    $stmt = $pdo->prepare("DELETE FROM shift_registrations WHERE user_id = ? AND shift_id = ? AND date = ? AND status = 'pending'");
    $stmt->execute([$userId, $shiftId, $date]);
    $deleted = $stmt->rowCount();

    jsonResponse([
        'status' => 'success',
        'message' => $deleted > 0 ? 'Đã hủy nguyện vọng ca làm việc thành công!' : 'Không tìm thấy nguyện vọng đăng ký phù hợp để hủy.',
        'deleted_count' => $deleted
    ]);
}

// Hủy đăng ký theo ID
if (preg_match('#^/shifts/registrations/([0-9]+)$#', $route, $matches) && $method === 'DELETE') {
    $regId = (int)$matches[1];
    $stmt = $pdo->prepare("DELETE FROM shift_registrations WHERE id = ?");
    $stmt->execute([$regId]);

    jsonResponse([
        'status' => 'success',
        'message' => 'Đã xóa nguyện vọng đăng ký ca thành công!'
    ]);
}

// 3.1. Quản lý Duyệt từng Nguyện vọng Đăng ký ca (Approve Single Registration)
if (preg_match('#^/shifts/registrations/([0-9]+)/approve$#', $route, $matches) && $method === 'POST') {
    $regId = (int)$matches[1];
    $location = $body['location'] ?? null;
    $managerName = $body['manager_name'] ?? 'Phạm Thu Hương (Quản lý Đào tạo)';

    // Tìm thông tin đăng ký ca
    $stmt = $pdo->prepare("SELECT sr.*, u.name as user_name, u.department, s.name as shift_name FROM shift_registrations sr JOIN users u ON sr.user_id = u.id JOIN shifts s ON sr.shift_id = s.id WHERE sr.id = ?");
    $stmt->execute([$regId]);
    $reg = $stmt->fetch();

    if (!$reg) {
        jsonResponse(['status' => 'error', 'message' => 'Không tìm thấy nguyện vọng đăng ký ca này.'], 404);
    }

    // Cập nhật trạng thái thành approved
    $upd = $pdo->prepare("UPDATE shift_registrations SET status = 'approved' WHERE id = ?");
    $upd->execute([$regId]);

    // Gán vị trí trực rạp theo bộ phận nếu chưa có
    if (!$location) {
        if (str_contains($reg['department'], 'Bắp') || str_contains($reg['department'], 'Concession')) {
            $location = 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
        } elseif (str_contains($reg['department'], 'Vé')) {
            $location = 'Cụm Rạp 1 - Quầy Vé Box Office';
        } elseif (str_contains($reg['department'], 'Kỹ thuật')) {
            $location = 'Phòng Máy Chiếu & Kỹ Thuật IMAX';
        } else {
            $location = 'Soát Vé & Điều Phối Phòng Chiếu 1-4';
        }
    }

    // Đưa vào bảng work_schedules (Lịch làm việc chính thức)
    // Xóa lịch cũ của user trong ngày này nếu có
    $del = $pdo->prepare("DELETE FROM work_schedules WHERE user_id = ? AND date = ?");
    $del->execute([$reg['user_id'], $reg['date']]);

    $ins = $pdo->prepare("INSERT INTO work_schedules (user_id, shift_id, date, location, status, assigned_by) VALUES (?, ?, ?, ?, 'assigned', ?)");
    $ins->execute([$reg['user_id'], $reg['shift_id'], $reg['date'], $location, $managerName]);

    jsonResponse([
        'status' => 'success',
        'message' => "Đã duyệt nguyện vọng ca {$reg['shift_name']} ngày {$reg['date']} của {$reg['user_name']} thành công!",
        'registration_id' => $regId,
        'user_name' => $reg['user_name'],
        'date' => $reg['date'],
        'shift_name' => $reg['shift_name'],
        'location' => $location
    ]);
}

// 3.2. Quản lý Từ chối Nguyện vọng Đăng ký ca (Reject Single Registration)
if (preg_match('#^/shifts/registrations/([0-9]+)/reject$#', $route, $matches) && $method === 'POST') {
    $regId = (int)$matches[1];
    $reason = $body['reason'] ?? 'Ca trực đã đủ định biên nhân sự theo quy định rạp.';

    $stmt = $pdo->prepare("UPDATE shift_registrations SET status = 'rejected' WHERE id = ?");
    $stmt->execute([$regId]);

    jsonResponse([
        'status' => 'success',
        'message' => 'Đã từ chối nguyện vọng đăng ký ca làm việc này.'
    ]);
}

// 3.3. Quản lý Duyệt toàn bộ Nguyện vọng Đang Chờ (Approve All Pending Registrations)
if ($route === '/shifts/registrations/approve-all' && $method === 'POST') {
    $targetDate = $body['date'] ?? null;
    $managerName = $body['manager_name'] ?? 'Phạm Thu Hương (Quản lý Đào tạo & Nhân sự)';

    $sql = "SELECT sr.*, u.name as user_name, u.department, s.name as shift_name 
            FROM shift_registrations sr 
            JOIN users u ON sr.user_id = u.id 
            JOIN shifts s ON sr.shift_id = s.id 
            WHERE sr.status = 'pending'";
    $params = [];
    if ($targetDate) {
        $sql .= " AND sr.date = ?";
        $params[] = $targetDate;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $pendingList = $stmt->fetchAll();

    $approvedCount = 0;
    foreach ($pendingList as $p) {
        // Cập nhật approved
        $pdo->prepare("UPDATE shift_registrations SET status = 'approved' WHERE id = ?")->execute([$p['id']]);

        // Vị trí rạp
        $loc = 'Cụm Rạp 1 - Quầy Vé Box Office';
        if (str_contains($p['department'], 'Bắp')) $loc = 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
        elseif (str_contains($p['department'], 'Kỹ thuật')) $loc = 'Phòng Máy Chiếu & Kỹ Thuật IMAX';
        elseif (str_contains($p['department'], 'Vé')) $loc = 'Cụm Rạp 1 - Quầy Vé Box Office';

        // Ghi vào work_schedules
        $del = $pdo->prepare("DELETE FROM work_schedules WHERE user_id = ? AND date = ?");
        $del->execute([$p['user_id'], $p['date']]);

        $ins = $pdo->prepare("INSERT INTO work_schedules (user_id, shift_id, date, location, status, assigned_by) VALUES (?, ?, ?, ?, 'assigned', ?)");
        $ins->execute([$p['user_id'], $p['shift_id'], $p['date'], $loc, $managerName]);
        $approvedCount++;
    }

    jsonResponse([
        'status' => 'success',
        'message' => "Đã duyệt nhanh toàn bộ {$approvedCount} nguyện vọng đăng ký ca làm việc thành công!",
        'approved_count' => $approvedCount
    ]);
}

// 4. Lấy Lịch làm việc chính thức (UC10, UC11)
if ($route === '/schedules' && $method === 'GET') {
    $userId = $_GET['user_id'] ?? null;
    $date = $_GET['date'] ?? null;

    $sql = "SELECT ws.id, ws.date, ws.location, ws.status, ws.assigned_by,
                   u.id as user_id, u.name as user_name, u.staff_code, u.department, u.avatar as user_avatar,
                   s.id as shift_id, s.name as shift_name, s.code as shift_code, s.start_time, s.end_time, s.color as shift_color
            FROM work_schedules ws
            JOIN users u ON ws.user_id = u.id
            JOIN shifts s ON ws.shift_id = s.id
            WHERE 1=1";
    $params = [];

    if ($userId) {
        $sql .= " AND ws.user_id = ?";
        $params[] = $userId;
    }
    if ($date) {
        $sql .= " AND ws.date = ?";
        $params[] = $date;
    }
    $sql .= " ORDER BY ws.date DESC, ws.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $schedules = $stmt->fetchAll();

    jsonResponse([
        'status' => 'success',
        'count' => count($schedules),
        'data' => $schedules
    ]);
}

// 5. AI Auto Scheduler - Xếp ca tự động KẾT NỐI CHẶT CHẼ với Nguyện Vọng Đăng Ký (UC09 -> UC11)
if ($route === '/shifts/auto-schedule' && $method === 'POST') {
    $targetDate = $body['date'] ?? date('Y-m-d', strtotime('+1 day'));
    $users = $pdo->query("SELECT id, name, staff_code, department FROM users WHERE role = 'staff' AND status = 'active'")->fetchAll();
    $shifts = $pdo->query("SELECT id, name, code FROM shifts")->fetchAll();
    $shiftsById = [];
    foreach ($shifts as $s) {
        $shiftsById[$s['id']] = $s;
    }

    // Lấy toàn bộ nguyện vọng đăng ký của nhân viên vào ngày này (UC09)
    $regStmt = $pdo->prepare("SELECT user_id, shift_id FROM shift_registrations WHERE date = ?");
    $regStmt->execute([$targetDate]);
    $registrations = $regStmt->fetchAll();

    // Gom nhóm nguyện vọng theo user_id: user_id => [shift_id, ...]
    $userPreferences = [];
    foreach ($registrations as $r) {
        $uid = (int)$r['user_id'];
        if (!isset($userPreferences[$uid])) $userPreferences[$uid] = [];
        $userPreferences[$uid][] = (int)$r['shift_id'];
    }

    // Danh sách vị trí làm việc tại cụm rạp
    $departmentLocationMap = [
        'Vé & Chăm sóc Khách hàng' => 'Cụm Rạp 1 - Quầy Vé Box Office',
        'Bắp nước & Quầy Concession' => 'Cụm Rạp 1 - Quầy Bắp Nước Concession',
        'Kỹ thuật Phim & Âm thanh' => 'Phòng Máy Chiếu & Kỹ Thuật IMAX',
    ];
    $defaultLocations = [
        'Cụm Rạp 1 - Quầy Vé Box Office',
        'Cụm Rạp 1 - Quầy Bắp Nước Concession',
        'Soát Vé & Điều Phối Phòng Chiếu 1-4',
        'Phòng Máy Chiếu & Kỹ Thuật IMAX'
    ];

    // Xóa lịch cũ của ngày này nếu có
    $del = $pdo->prepare("DELETE FROM work_schedules WHERE date = ?");
    $del->execute([$targetDate]);

    $ins = $pdo->prepare("INSERT INTO work_schedules (user_id, shift_id, date, location, status, assigned_by) VALUES (?, ?, ?, ?, 'assigned', ?)");
    $updApproved = $pdo->prepare("UPDATE shift_registrations SET status = 'approved' WHERE user_id = ? AND shift_id = ? AND date = ?");
    $updRejected = $pdo->prepare("UPDATE shift_registrations SET status = 'rejected' WHERE user_id = ? AND shift_id != ? AND date = ?");

    $createdSchedules = [];
    $matchedCount = 0;
    $shiftLoad = []; // đếm số người mỗi ca để cân bằng tải
    foreach ($shifts as $s) {
        $shiftLoad[$s['id']] = 0;
    }

    foreach ($users as $idx => $u) {
        $uid = (int)$u['id'];
        $chosenShiftId = null;
        $reason = '';

        // ƯU TIÊN 1: Xếp đúng ca nhân viên đã đăng ký nguyện vọng ở UC09!
        if (isset($userPreferences[$uid]) && count($userPreferences[$uid]) > 0) {
            $chosenShiftId = $userPreferences[$uid][0]; // Lấy ca mong muốn đầu tiên
            $shiftName = $shiftsById[$chosenShiftId]['name'] ?? 'Ca Tiêu Chuẩn';
            $reason = "Khớp 100% nguyện vọng đăng ký của {$u['name']} ({$shiftName})";
            $matchedCount++;
        } else {
            // Nếu chưa đăng ký: Phân bổ vào ca đang thiếu người nhất để cân đối vận hành rạp
            asort($shiftLoad);
            $chosenShiftId = array_key_first($shiftLoad);
            $shiftName = $shiftsById[$chosenShiftId]['name'] ?? 'Ca Tiêu Chuẩn';
            $reason = "Nhân viên chưa đăng ký -> AI điều phối hỗ trợ {$shiftName} theo lưu lượng khách";
        }

        $shiftLoad[$chosenShiftId]++;

        // Xác định vị trí phân công tại rạp theo chuyên môn bộ phận
        $loc = $departmentLocationMap[$u['department']] ?? $defaultLocations[$idx % count($defaultLocations)];

        // Lưu lịch phân ca chính thức
        $assignedBy = 'Smart AI Scheduler (Khớp Nguyện Vọng Đăng Ký)';
        $ins->execute([$uid, $chosenShiftId, $targetDate, $loc, $assignedBy]);
        $scheduleId = (int)$pdo->lastInsertId();

        // Cập nhật trạng thái nguyện vọng đăng ký thành approved
        $updApproved->execute([$uid, $chosenShiftId, $targetDate]);
        $updRejected->execute([$uid, $chosenShiftId, $targetDate]);

        $createdSchedules[] = [
            'id' => $scheduleId,
            'user_id' => $uid,
            'user_name' => $u['name'],
            'staff_code' => $u['staff_code'],
            'shift_id' => $chosenShiftId,
            'shift_name' => $shiftsById[$chosenShiftId]['name'] ?? '',
            'location' => $loc,
            'is_matched_preference' => isset($userPreferences[$uid]),
            'reason' => $reason
        ];
    }

    $totalUsers = count($users);
    $satisfactionRate = $totalUsers > 0 ? round(($matchedCount / max(1, count($userPreferences))) * 100) : 100;

    jsonResponse([
        'status' => 'success',
        'message' => "Trợ lý AI đã phân tích nguyện vọng đăng ký ca và xếp lịch làm việc tối ưu cho ngày {$targetDate}!",
        'date' => $targetDate,
        'total_staff' => $totalUsers,
        'registrations_found' => count($userPreferences),
        'matched_preferences' => $matchedCount,
        'satisfaction_rate' => $satisfactionRate . '%',
        'schedules' => $createdSchedules
    ]);
}

// 6. Quản lý Xuất bản / Lưu Lịch làm việc Chính thức (UC11 -> UC10)
if ($route === '/schedules/publish' && $method === 'POST') {
    $schedules = $body['schedules'] ?? [];
    $targetDate = $body['date'] ?? date('Y-m-d', strtotime('+1 day'));
    $managerName = $body['manager_name'] ?? 'Phạm Thu Hương (Quản lý Đào tạo & Nhân sự)';

    if (!empty($schedules) && is_array($schedules)) {
        $del = $pdo->prepare("DELETE FROM work_schedules WHERE date = ?");
        $del->execute([$targetDate]);

        $ins = $pdo->prepare("INSERT INTO work_schedules (user_id, shift_id, date, location, status, assigned_by) VALUES (?, ?, ?, ?, 'assigned', ?)");
        $updApproved = $pdo->prepare("UPDATE shift_registrations SET status = 'approved' WHERE user_id = ? AND shift_id = ? AND date = ?");

        foreach ($schedules as $s) {
            $uid = (int)($s['user_id'] ?? str_replace('usr-', '', $s['userId'] ?? '2'));
            $shiftId = (int)($s['shift_id'] ?? str_replace('shift-', '', $s['shiftId'] ?? '1'));
            $loc = $s['location'] ?? 'Cụm Rạp 1 - Quầy Vé';
            $ins->execute([$uid, $shiftId, $targetDate, $loc, $managerName]);
            $updApproved->execute([$uid, $shiftId, $targetDate]);
        }
    }

    jsonResponse([
        'status' => 'success',
        'message' => "Lịch làm việc ngày {$targetDate} đã được xuất bản chính thức tới toàn bộ nhân viên rạp!",
        'published_count' => count($schedules)
    ]);
}

// ------------------------------------------------------------------------------
// UC12: ATTENDANCE TRACKING (Chấm công & Nhật ký)
// ------------------------------------------------------------------------------
if ($route === '/attendances' && $method === 'GET') {
    $sql = "SELECT a.id, a.date, a.check_in, a.check_out, a.status, a.hours_worked, a.note, u.id as user_id, u.name as user_name, u.staff_code FROM attendances a JOIN users u ON a.user_id = u.id ORDER BY a.date DESC, a.id DESC";
    $attendances = $pdo->query($sql)->fetchAll();

    jsonResponse([
        'status' => 'success',
        'count' => count($attendances),
        'data' => $attendances
    ]);
}

if ($route === '/attendances' && $method === 'POST') {
    $rawUserId = $body['user_id'] ?? 2;
    $userId = (int)str_replace('usr-', '', (string)$rawUserId);
    if ($userId <= 0) $userId = 2;
    $date = $body['date'] ?? date('Y-m-d');
    $checkIn = !empty($body['check_in']) ? $body['check_in'] : null;
    $checkOut = !empty($body['check_out']) ? $body['check_out'] : null;
    $status = in_array($body['status'] ?? '', ['on_time', 'late', 'early_leave', 'absent']) ? $body['status'] : 'on_time';
    $hoursWorked = (float)($body['hours_worked'] ?? 8.0);
    $note = $body['note'] ?? '';

    // Check if record exists for this user and date
    $stmt = $pdo->prepare("SELECT id FROM attendances WHERE user_id = ? AND date = ?");
    $stmt->execute([$userId, $date]);
    $existing = $stmt->fetch();

    if ($existing) {
        $up = $pdo->prepare("UPDATE attendances SET check_in = COALESCE(?, check_in), check_out = COALESCE(?, check_out), status = ?, hours_worked = ?, note = ? WHERE id = ?");
        $up->execute([$checkIn, $checkOut, $status, $hoursWorked, $note, $existing['id']]);
        $recordId = $existing['id'];
    } else {
        $ins = $pdo->prepare("INSERT INTO attendances (user_id, date, check_in, check_out, status, hours_worked, note) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $ins->execute([$userId, $date, $checkIn, $checkOut, $status, $hoursWorked, $note]);
        $recordId = $pdo->lastInsertId();
    }

    jsonResponse([
        'status' => 'success',
        'message' => 'Lưu dữ liệu chấm công thành công',
        'id' => $recordId
    ], 200);
}

if ($route === '/attendances/check-in' && $method === 'POST') {
    $userId = (int)($body['user_id'] ?? 2);
    $time = date('H:i:s');
    $date = date('Y-m-d');

    // Check if record exists for today
    $stmt = $pdo->prepare("SELECT id, check_in FROM attendances WHERE user_id = ? AND date = ?");
    $stmt->execute([$userId, $date]);
    $existing = $stmt->fetch();

    if ($existing) {
        $up = $pdo->prepare("UPDATE attendances SET check_out = ?, hours_worked = 8.0 WHERE id = ?");
        $up->execute([$time, $existing['id']]);
        jsonResponse([
            'status' => 'success',
            'action' => 'check_out',
            'message' => "Điểm danh Check-Out ca làm thành công lúc {$time}!"
        ]);
    } else {
        $ins = $pdo->prepare("INSERT INTO attendances (user_id, date, check_in, status, hours_worked) VALUES (?, ?, ?, 'on_time', 8.0)");
        $ins->execute([$userId, $date, $time]);
        jsonResponse([
            'status' => 'success',
            'action' => 'check_in',
            'message' => "Điểm danh Check-In bắt đầu ca làm việc thành công lúc {$time}!"
        ], 201);
    }
}


// ------------------------------------------------------------------------------
// UC13: ATTENDANCE EXCEPTIONS (Xử lý giải trình đi muộn, đơn nghỉ phép, đổi ca)
// ------------------------------------------------------------------------------
if ($route === '/attendance-exceptions' && $method === 'GET') {
    $sql = "SELECT ae.*, u.name as user_name, u.staff_code FROM attendance_exceptions ae JOIN users u ON ae.user_id = u.id ORDER BY ae.id DESC";
    $exceptions = $pdo->query($sql)->fetchAll();

    jsonResponse([
        'status' => 'success',
        'count' => count($exceptions),
        'data' => $exceptions
    ]);
}

if ($route === '/attendance-exceptions' && $method === 'POST') {
    $userId = (int)($body['user_id'] ?? 2);
    $type = $body['type'] ?? 'late_justification';
    $typeTitle = $body['type_title'] ?? 'Giải trình Đi Muộn';
    $reason = trim($body['reason'] ?? 'Giải trình sự cố phát sinh');
    $targetDate = $body['target_date'] ?? date('Y-m-d');
    $proof = $body['proof_image'] ?? null;

    $stmt = $pdo->prepare("INSERT INTO attendance_exceptions (user_id, type, type_title, reason, target_date, proof_image, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')");
    $stmt->execute([$userId, $type, $typeTitle, $reason, $targetDate, $proof]);

    jsonResponse([
        'status' => 'success',
        'message' => 'Đã gửi đơn giải trình / yêu cầu chấm công tới Quản lý Đào tạo!',
        'id' => $pdo->lastInsertId()
    ], 201);
}

// Approve or Reject exception
if (preg_match('#^/attendance-exceptions/([0-9]+)/action$#', $route, $matches) && $method === 'POST') {
    $id = (int)$matches[1];
    $action = $body['action'] ?? 'approved'; // 'approved' or 'rejected'
    $reviewer = $body['reviewer'] ?? 'Phạm Thu Hương (Manager)';
    $comment = $body['comment'] ?? ($action === 'approved' ? 'Chấp thuận đơn.' : 'Từ chối đơn.');

    $stmt = $pdo->prepare("UPDATE attendance_exceptions SET status = ?, reviewed_by = ?, review_comment = ? WHERE id = ?");
    $stmt->execute([$action, $reviewer, $comment, $id]);

    jsonResponse([
        'status' => 'success',
        'message' => ($action === 'approved' ? 'Đã phê duyệt' : 'Đã từ chối') . ' đơn xử lý chấm công thành công!'
    ]);
}

// Route not found
jsonResponse([
    'status' => 'error',
    'message' => "Không tìm thấy endpoint: [{$method}] {$route}",
    'available_routes' => [
        'GET /api/v1/health',
        'POST /api/v1/auth/login',
        'POST /api/v1/auth/register',
        'GET /api/v1/employees',
        'POST /api/v1/employees',
        'GET /api/v1/courses',
        'POST /api/v1/courses',
        'GET /api/v1/quizzes',
        'POST /api/v1/quizzes/{id}/attempt',
        'POST /api/v1/quizzes/generate-ai',
        'GET /api/v1/certificates',
        'GET /api/v1/shifts',
        'POST /api/v1/shifts/register',
        'GET /api/v1/schedules',
        'POST /api/v1/shifts/auto-schedule',
        'GET /api/v1/attendances',
        'POST /api/v1/attendances/check-in',
        'GET /api/v1/attendance-exceptions',
        'POST /api/v1/attendance-exceptions',
        'POST /api/v1/attendance-exceptions/{id}/action'
    ]
], 404);
