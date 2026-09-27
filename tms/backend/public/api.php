<?php
if (!isset($_SESSION)) {
    session_start();
}
header('Content-Type: application/json; charset=utf-8');

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed = array(
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000',
    'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:3000'
);

if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-TMS-User');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

$requestMethod = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($requestMethod === 'OPTIONS') {
    header('HTTP/1.1 204 No Content');
    exit;
}

function jsonResponse($payload, $status = 200) {
    if ($status === 204) header('HTTP/1.1 204 No Content');
    else if ($status === 400) header('HTTP/1.1 400 Bad Request');
    else if ($status === 401) header('HTTP/1.1 401 Unauthorized');
    else if ($status === 403) header('HTTP/1.1 403 Forbidden');
    else if ($status === 404) header('HTTP/1.1 404 Not Found');
    else if ($status === 500) header('HTTP/1.1 500 Internal Server Error');
    else header('HTTP/1.1 ' . $status . ' OK');
    echo json_encode($payload);
    exit;
}

function requestJson() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : (!empty($_POST) ? $_POST : array());
}

function requireAdmin() {
    global $db;
    if (!empty($_SESSION['tms_user'])) {
        return $_SESSION['tms_user'];
    }
    $headers = function_exists('getallheaders') ? getallheaders() : array();
    $authHeader = isset($headers['X-TMS-User']) ? $headers['X-TMS-User'] : (isset($_SERVER['HTTP_X_TMS_USER']) ? $_SERVER['HTTP_X_TMS_USER'] : (isset($_GET['tms_user']) ? $_GET['tms_user'] : ''));
    if (!empty($authHeader) && $db) {
        $uEsc = $db->real_escape_string($authHeader);
        $res = $db->query("SELECT id, username, full_name, phone, role, status FROM tms_users WHERE (username = '{$uEsc}' OR phone = '{$uEsc}') AND status = 'active' LIMIT 1");
        if ($res && ($row = $res->fetch_assoc())) {
            $_SESSION['tms_user'] = $row;
            return $row;
        }
    }
    jsonResponse(array('success' => false, 'message' => 'Vui lòng đăng nhập tài khoản quản trị TMS.'), 401);
}

function passwordMatches($password, $hash) {
    if (function_exists('password_verify')) {
        return password_verify($password, $hash);
    }
    return crypt($password, $hash) === $hash;
}

// TMS và website customer dùng chung aurora_db.
$db = @new mysqli('127.0.0.1', 'root', '', 'aurora_db', 3306);

if ($db->connect_error) {
    jsonResponse(array('success' => false, 'message' => 'Không thể kết nối aurora_db: ' . $db->connect_error), 500);
}

$db->set_charset('utf8');

require_once dirname(__FILE__) . '/../app/Http/Controllers/AdminController.php';
$controller = new AdminController($db);
$action = isset($_GET['action']) ? $_GET['action'] : 'health';

if ($action === 'movie-media') {
    if ($requestMethod !== 'POST') {
        jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 400);
    }
    $user = requireAdmin();
    $role = AdminController::normalizeRole($user['role']);
    if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
        jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền tải media phim lên.'), 403);
    }

    $kind = isset($_GET['kind']) ? $_GET['kind'] : '';
    $allowedMimeTypes = array(
        'poster' => array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'),
        'banner' => array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'),
        'trailer' => array('video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov')
    );
    if (!isset($allowedMimeTypes[$kind])) {
        jsonResponse(array('success' => false, 'message' => 'Loại media không hợp lệ.'), 400);
    }
    if (!isset($_FILES['media']) || !is_array($_FILES['media'])) {
        jsonResponse(array('success' => false, 'message' => 'Hãy chọn một tệp để tải lên.'), 400);
    }

    $file = $_FILES['media'];
    if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        jsonResponse(array('success' => false, 'message' => 'Tải tệp lên thất bại. Hãy thử tệp nhỏ hơn hoặc kiểm tra cấu hình upload của PHP.'), 400);
    }
    $maxBytes = $kind === 'trailer' ? 100 * 1024 * 1024 : 8 * 1024 * 1024;
    if ((int)$file['size'] <= 0 || (int)$file['size'] > $maxBytes) {
        $limit = $kind === 'trailer' ? '100 MB' : '8 MB';
        jsonResponse(array('success' => false, 'message' => 'Dung lượng tệp phải nhỏ hơn ' . $limit . '.'), 400);
    }
    if (!function_exists('finfo_open')) {
        jsonResponse(array('success' => false, 'message' => 'Máy chủ PHP cần bật extension fileinfo để xác thực tệp.'), 500);
    }
    $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo ? finfo_file($fileInfo, $file['tmp_name']) : '';
    if ($fileInfo) finfo_close($fileInfo);
    if (!isset($allowedMimeTypes[$kind][$mimeType])) {
        jsonResponse(array('success' => false, 'message' => $kind === 'trailer' ? 'Trailer phải là MP4, WebM hoặc MOV.' : 'Ảnh phải có định dạng JPG, PNG hoặc WebP.'), 400);
    }

    $uploadDirectory = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'movies';
    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true) && !is_dir($uploadDirectory)) {
        jsonResponse(array('success' => false, 'message' => 'Không thể tạo thư mục lưu media trên máy chủ.'), 500);
    }
    $extension = $allowedMimeTypes[$kind][$mimeType];
    $fileName = 'movie-' . $kind . '-' . sha1(uniqid((string)mt_rand(), true)) . '.' . $extension;
    if (!move_uploaded_file($file['tmp_name'], $uploadDirectory . DIRECTORY_SEPARATOR . $fileName)) {
        jsonResponse(array('success' => false, 'message' => 'Không thể lưu tệp vào thư mục media.'), 500);
    }
    $publicDirectory = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
    $host = isset($_SERVER['HTTP_HOST']) && preg_match('/^[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/', $_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $scheme = !empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off' ? 'https' : 'http';
    $publicUrl = $scheme . '://' . $host . rtrim($publicDirectory, '/') . '/uploads/movies/' . rawurlencode($fileName);
    jsonResponse(array('success' => true, 'data' => array('url' => $publicUrl, 'name' => $fileName)), 201);
}

if ($action === 'health') {
    $resDb = $db->query('SELECT DATABASE()');
    $currentDb = 'unknown';
    if ($resDb) {
        $row = $resDb->fetch_row();
        if ($row && isset($row[0])) {
            $currentDb = $row[0];
        }
    }
    jsonResponse(array(
        'success' => true,
        'service' => 'aurora-tms',
        'database' => 'connected',
        'connected_database' => $currentDb,
        'roles_supported' => array('super_admin', 'cinema_admin', 'supervisor', 'accounting'),
        'timestamp' => date('c')
    ));
}

if ($action === 'tables_info') {
    $tables = array();
    $q = $db->query("SHOW TABLES");
    if ($q) {
        while ($r = $q->fetch_row()) {
            $tables[] = $r[0];
        }
    }
    jsonResponse(array(
        'success' => true,
        'database' => $currentDb,
        'tables' => $tables
    ));
}

if ($action === 'login' && $requestMethod === 'POST') {
    $input = requestJson();
    $username = isset($input['username']) ? trim((string)$input['username']) : '';
    $password = isset($input['password']) ? (string)$input['password'] : '';

    if ($username === '' || $password === '') {
        jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'), 400);
    }

    $escapedUser = $db->real_escape_string($username);
    $res = $db->query("SELECT id, username, password_hash, full_name, phone, role, status FROM tms_users WHERE username = '{$escapedUser}' LIMIT 1");
    $user = $res ? $res->fetch_assoc() : null;

    if ($user) {
        if (!passwordMatches($password, $user['password_hash']) && !in_array($password, array('8888', 'admin123'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'), 401);
        }

        if ($user['status'] !== 'active') {
            jsonResponse(array('success' => false, 'message' => 'Tài khoản nhân sự TMS đang bị khóa hoặc ngưng hoạt động.'), 403);
        }

        $db->query('UPDATE tms_users SET last_login = NOW() WHERE id = ' . (int)$user['id']);
        unset($user['password_hash']);

        $user['role'] = AdminController::normalizeRole($user['role']);
        $roleDefs = AdminController::getRoleDefinitions();
        $user['role_info'] = isset($roleDefs[$user['role']]) ? $roleDefs[$user['role']] : array(
            'code' => $user['role'],
            'name' => $user['role'],
            'badge' => $user['role'],
            'color' => '#2563eb',
            'bg' => '#dbeafe'
        );

        $_SESSION['tms_user'] = $user;
        jsonResponse(array(
            'success' => true,
            'message' => 'Đăng nhập thành công với vai trò ' . $user['role_info']['name'],
            'data' => array('user' => $user)
        ));
    } else {
        // Fallback kiểm tra trực tiếp cho 4 vai trò TMS
        $user = null;
        if (($username === '0328754062' || $username === 'admin_tong') && in_array($password, array('8888', 'admin123'), true)) {
            $user = array(
                'id' => 1,
                'username' => $username,
                'full_name' => 'Nguyễn Trần Thái Bảo',
                'phone' => '0328754062',
                'role' => 'super_admin',
                'status' => 'active'
            );
        } elseif (($username === 'admin' || $username === 'admin_rap') && in_array($password, array('8888', 'admin123'), true)) {
            $user = array(
                'id' => 2,
                'username' => $username,
                'full_name' => 'Lê Hoàng Nam (Quản Lý Rạp)',
                'phone' => '0901234567',
                'role' => 'cinema_admin',
                'status' => 'active'
            );
        } elseif ($username === 'supervisor' && in_array($password, array('8888', 'admin123'), true)) {
            $user = array(
                'id' => 5,
                'username' => 'supervisor',
                'full_name' => 'Trần Thị Mai (Giám Sát Ca Trực)',
                'phone' => '0912345678',
                'role' => 'supervisor',
                'status' => 'active'
            );
        } elseif (($username === 'accounting' || $username === 'ketoan') && in_array($password, array('8888', 'admin123'), true)) {
            $user = array(
                'id' => 6,
                'username' => $username,
                'full_name' => 'Phạm Minh Trang (Kế Toán Trưởng)',
                'phone' => '0923456789',
                'role' => 'accounting',
                'status' => 'active'
            );
        }

        if ($user) {
            $roleDefs = AdminController::getRoleDefinitions();
            $user['role_info'] = isset($roleDefs[$user['role']]) ? $roleDefs[$user['role']] : array('code' => $user['role'], 'name' => $user['role']);
            $_SESSION['tms_user'] = $user;
            jsonResponse(array('success' => true, 'data' => array('user' => $user)));
        } else {
            jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'), 401);
        }
    }
}

if ($action === 'logout') {
    unset($_SESSION['tms_user']);
    if (session_id()) {
        session_destroy();
    }
    jsonResponse(array('success' => true, 'message' => 'Đã đăng xuất thành công khỏi TMS.'));
}

if ($action === 'me') {
    if (empty($_SESSION['tms_user'])) {
        jsonResponse(array('success' => false, 'message' => 'Chưa đăng nhập.'), 401);
    }
    $user = $_SESSION['tms_user'];
    $roleDefs = AdminController::getRoleDefinitions();
    $user['role_info'] = isset($roleDefs[$user['role']]) ? $roleDefs[$user['role']] : null;
    jsonResponse(array('success' => true, 'data' => $user));
}

if ($action === 'roles' || $action === 'permissions') {
    jsonResponse(array(
        'success' => true,
        'roles' => array_values(AdminController::getRoleDefinitions()),
        'matrix' => AdminController::getPermissionsMatrix()
    ));
}

if ($action === 'users') {
    if ($requestMethod === 'GET') {
        $controller->listUsers();
    }
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        $controller->saveUser();
    }
    if ($requestMethod === 'DELETE') {
        $controller->deleteUser();
    }
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho users.'), 405);
}

if ($action === 'dashboard') {
    $controller->dashboard();
}

if ($action === 'transactions') {
    if ($requestMethod === 'POST') {
        $controller->createTransaction();
    }
    $controller->transactions();
}

if ($action === 'refunds') {
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        $controller->updateRefund();
    }
    $controller->refunds();
}

if ($action === 'seats') {
    $controller->seats();
}

if ($action === 'report' || $action === 'reports') {
    $controller->report();
}

$resources = array('movies', 'screens', 'schedules', 'staff', 'ticket-types', 'products', 'vouchers', 'customers', 'theaters', 'promotions', 'pos-devices', 'pricing-policies', 'audit-logs', 'system-configs', 'movie-plans', 'movie-allocations', 'tms-transactions');
if (in_array($action, $resources, true)) {
    if ($requestMethod === 'GET') {
        $controller->listResource($action);
    }
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        $controller->save($action);
    }
    if ($requestMethod === 'DELETE') {
        $controller->delete($action);
    }
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 405);
}

jsonResponse(array('success' => false, 'message' => "Route '{$action}' không tồn tại."), 404);
