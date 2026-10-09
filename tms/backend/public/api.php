<?php
date_default_timezone_set('Asia/Ho_Chi_Minh');

// Keep the TMS server-side session across page reloads for eight hours.
// This project also supports legacy WAMP/PHP installations where
// session_status() and the array cookie API are not available.
$sessionActive = function_exists('session_status') ? session_status() === 2 : isset($_SESSION);
if (!$sessionActive) {
    $isHttps = !empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off';
    // Use a new cookie name to isolate the corrected TMS session from the
    // legacy cookie that may still point at a different account in browsers.
    session_name('aurora_tms_session_v2');
    if (version_compare(PHP_VERSION, '7.3.0', '>=')) {
        session_set_cookie_params(array('lifetime' => 28800, 'path' => '/', 'secure' => $isHttps, 'httponly' => true, 'samesite' => 'Lax'));
    } else {
        ini_set('session.cookie_httponly', '1');
        session_set_cookie_params(28800, '/', '', $isHttps, true);
    }
    ini_set('session.gc_maxlifetime', '28800');
    session_start();
}
// The old name is never read again. Expire its root-scoped copy so it cannot
// participate in any later request to the TMS API.
setcookie('aurora_tms_session', '', time() - 3600, '/');
header('Content-Type: application/json; charset=utf-8');

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed = array(
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000',
    'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:3000'
);

if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
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
    else if ($status === 409) header('HTTP/1.1 409 Conflict');
    else if ($status === 422) header('HTTP/1.1 422 Unprocessable Entity');
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

// Movie codes are system-generated at import time. The random suffix avoids
// sequence collisions while the database lookup guarantees uniqueness in
// aurora_db before the record is inserted.
function generateImportedMovieCode($db) {
    $year = date('Y');
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $code = 'AUR-' . $year . '-' . strtoupper(substr(sha1(uniqid((string)mt_rand(), true)), 0, 7));
        $escaped = $db->real_escape_string($code);
        $exists = $db->query("SELECT id FROM movies WHERE movie_code = '{$escaped}' LIMIT 1");
        if (!$exists || !$exists->num_rows) return $code;
    }
    return 'AUR-' . $year . '-' . strtoupper(uniqid());
}

function requireAdmin() {
    global $db;
    if (empty($_SESSION['tms_user']['id'])) {
        jsonResponse(array('success' => false, 'message' => 'Vui lòng đăng nhập tài khoản quản trị TMS.'), 401);
    }

    $userId = (int)$_SESSION['tms_user']['id'];
    $result = $db->query("SELECT id, username, full_name, phone, theater_id, role, status FROM users WHERE id = {$userId} LIMIT 1");
    if (!$result) {
        jsonResponse(array('success' => false, 'message' => 'Không thể xác minh trạng thái tài khoản trong aurora_db: ' . $db->error), 500);
    }
    $user = $result->fetch_assoc();
    if (!$user || $user['status'] !== 'active') {
        unset($_SESSION['tms_user']);
        clearTmsIdentity();
        jsonResponse(array('success' => false, 'message' => 'Tài khoản TMS đã bị khóa hoặc ngưng hoạt động. Vui lòng liên hệ quản trị viên.'), 401);
    }

    $user['role'] = AdminController::normalizeRole($user['role']);
    $_SESSION['tms_user'] = $user;
    return $user;
}

// PHP 5.2/WAMP sends a second Set-Cookie when the session id is regenerated.
// That races the original cookie in browsers, so keep the same id on legacy
// PHP after clearing its data. Newer PHP versions still get session fixation
// protection through regeneration.
function regenerateTmsSession() {
    if (version_compare(PHP_VERSION, '5.3.0', '>=')) {
        session_regenerate_id(true);
    }
}

function passwordMatches($password, $hash) {
    $legacyPrefix = 'sha256:aurora-tms-local-2026:';
    if (strpos($hash, $legacyPrefix) === 0) {
        $expected = substr($hash, strlen($legacyPrefix));
        return hash('sha256', 'aurora-tms-local-2026:' . $password) === $expected;
    }
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
if (!$db->query("SET time_zone = '+07:00'")) {
    jsonResponse(array('success' => false, 'message' => 'Không thể đặt múi giờ Việt Nam cho kết nối aurora_db: ' . $db->error), 500);
}

// Scope every cinema operator to one cinema.  This migration is intentionally
// here (before session restoration) so both a fresh login and an existing
// signed session receive the same theater_id from aurora_db.
$userTheaterColumn = $db->query("SHOW COLUMNS FROM users LIKE 'theater_id'");
if (!$userTheaterColumn || $userTheaterColumn->num_rows === 0) {
    $db->query("ALTER TABLE users ADD COLUMN theater_id BIGINT UNSIGNED NULL");
}

// PHP 5.2 on WAMP can occasionally reuse an old session id. Keep a separate,
// signed TMS identity cookie so a reload always restores the account that most
// recently completed a TMS login. The cookie only contains an id and expiry;
// the active account is always re-read from aurora_db.
$tmsIdentitySecret = 'aurora-tms-identity-v1-9a3c71e5f2b4d8c6';
function setTmsIdentity($user) {
    global $tmsIdentitySecret;
    $id = isset($user['id']) ? (int)$user['id'] : 0;
    if ($id <= 0) return;
    $expires = time() + 28800;
    $payload = $id . '.' . $expires;
    $signature = hash_hmac('sha256', $payload, $tmsIdentitySecret);
    setcookie('aurora_tms_identity', $payload . '.' . $signature, $expires, '/', '', !empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off', true);
}
function clearTmsIdentity() {
    setcookie('aurora_tms_identity', '', time() - 3600, '/');
}
function restoreTmsIdentity() {
    global $db, $tmsIdentitySecret;
    if (empty($_COOKIE['aurora_tms_identity'])) return;
    $parts = explode('.', $_COOKIE['aurora_tms_identity']);
    if (count($parts) !== 3 || !ctype_digit($parts[0]) || !ctype_digit($parts[1])) return;
    $payload = $parts[0] . '.' . $parts[1];
    $expected = hash_hmac('sha256', $payload, $tmsIdentitySecret);
    if ($parts[2] !== $expected || (int)$parts[1] < time()) { clearTmsIdentity(); return; }
    $userId = (int)$parts[0];
    $result = $db->query("SELECT id, username, full_name, phone, theater_id, role, status FROM users WHERE id = {$userId} AND status = 'active' LIMIT 1");
    if (!$result || !($user = $result->fetch_assoc())) { clearTmsIdentity(); return; }
    // The signed identity is intentionally authoritative over a stale PHP
    // session. It is only issued after a successful credential check.
    $_SESSION['tms_user'] = $user;
}
restoreTmsIdentity();

require_once dirname(__FILE__) . '/../app/Http/Controllers/AdminController.php';
require_once dirname(__FILE__) . '/../app/Http/Controllers/RevenueController.php';
require_once dirname(__FILE__) . '/../app/Http/Controllers/MarketingController.php';
$controller = new AdminController($db);
$revenueController = new RevenueController($db);
$marketingController = new MarketingController($db);
$action = isset($_GET['action']) ? $_GET['action'] : 'health';

// Pricing is a dedicated, audited matrix rather than a generic CRUD list.
// Every consumer (TMS/POS/customer website) can therefore read the same
// day-type and time-slot price from aurora_db.
if ($action === 'ticket-pricing-policies') {
    if ($requestMethod === 'GET') $controller->ticketPricingPolicies();
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') $controller->saveTicketPricingPolicy();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 405);
}

if ($action === 'pos-staff') {
    $controller->posStaff();
}

if ($action === 'pos-counter-roles') {
    if ($requestMethod === 'GET') $controller->posCounterRoles();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 405);
}

if ($action === 'pos-counters') {
    if ($requestMethod === 'GET') $controller->posCounters();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 405);
}

if ($action === 'pos-staff-detail') {
    if ($requestMethod === 'GET') $controller->posStaffDetail();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 405);
}

if ($action === 'pos-sessions') {
    $controller->posSessions();
}

if ($action === 'pos-session-report') {
    $controller->posSessionReport();
}

if ($action === 'pos-work-schedules') {
    $controller->posWorkSchedules();
}

// Accept media in small pieces so WAMP's upload_max_filesize never rejects a
// large trailer before PHP can handle it. The final file is validated again
// after all pieces are assembled.
if ($action === 'movie-media-chunk') {
    if ($requestMethod !== 'POST') jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 400);
    $user = requireAdmin();
    $role = AdminController::normalizeRole($user['role']);
    if (!in_array($role, array('super_admin', 'cinema_admin'), true)) jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền tải media phim lên.'), 403);

    $kind = isset($_POST['kind']) ? $_POST['kind'] : '';
    $allowedMimeTypes = array(
        'poster' => array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'),
        'banner' => array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'),
        'trailer' => array('video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov')
    );
    $uploadId = isset($_POST['upload_id']) ? (string)$_POST['upload_id'] : '';
    $chunkIndex = isset($_POST['chunk_index']) ? (int)$_POST['chunk_index'] : -1;
    $chunkTotal = isset($_POST['chunk_total']) ? (int)$_POST['chunk_total'] : 0;
    $declaredSize = isset($_POST['file_size']) ? (int)$_POST['file_size'] : 0;
    if (!isset($allowedMimeTypes[$kind]) || !preg_match('/^[a-zA-Z0-9_-]{16,80}$/', $uploadId) || $chunkIndex < 0 || $chunkIndex >= $chunkTotal || $chunkTotal < 1 || $chunkTotal > 300 || $declaredSize < 1 || !isset($_FILES['chunk'])) jsonResponse(array('success' => false, 'message' => 'Dữ liệu tải tệp không hợp lệ.'), 400);

    $chunk = $_FILES['chunk'];
    if ($chunk['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($chunk['tmp_name'])) jsonResponse(array('success' => false, 'message' => 'Không thể nhận một phần của tệp. Vui lòng thử lại.'), 400);
    $maxBytes = $kind === 'trailer' ? 250 * 1024 * 1024 : 15 * 1024 * 1024;
    if ($declaredSize > $maxBytes) jsonResponse(array('success' => false, 'message' => 'Dung lượng tệp vượt quá giới hạn cho phép.'), 400);

    $baseDirectory = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'movies';
    $tempDirectory = $baseDirectory . DIRECTORY_SEPARATOR . '.chunks' . DIRECTORY_SEPARATOR . $uploadId;
    if (!is_dir($tempDirectory) && !mkdir($tempDirectory, 0755, true) && !is_dir($tempDirectory)) jsonResponse(array('success' => false, 'message' => 'Không thể chuẩn bị bộ nhớ tải tệp.'), 500);
    if (!move_uploaded_file($chunk['tmp_name'], $tempDirectory . DIRECTORY_SEPARATOR . $chunkIndex . '.part')) jsonResponse(array('success' => false, 'message' => 'Không thể lưu một phần của tệp.'), 500);
    if ($chunkIndex < $chunkTotal - 1) jsonResponse(array('success' => true, 'data' => array('complete' => false)));

    $assembledPath = $tempDirectory . DIRECTORY_SEPARATOR . 'assembled';
    $assembled = @fopen($assembledPath, 'wb');
    if (!$assembled) jsonResponse(array('success' => false, 'message' => 'Không thể ghép các phần của tệp.'), 500);
    for ($i = 0; $i < $chunkTotal; $i++) {
        $partPath = $tempDirectory . DIRECTORY_SEPARATOR . $i . '.part';
        if (!is_file($partPath)) { fclose($assembled); jsonResponse(array('success' => false, 'message' => 'Thiếu một phần của tệp. Vui lòng tải lại.'), 400); }
        $part = @fopen($partPath, 'rb');
        if (!$part) { fclose($assembled); jsonResponse(array('success' => false, 'message' => 'Không thể đọc một phần của tệp.'), 500); }
        stream_copy_to_stream($part, $assembled); fclose($part);
    }
    fclose($assembled);
    if ((int)filesize($assembledPath) !== $declaredSize) jsonResponse(array('success' => false, 'message' => 'Tệp tải lên không đầy đủ. Vui lòng thử lại.'), 400);
    $mimeInfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
    $mimeType = $mimeInfo ? finfo_file($mimeInfo, $assembledPath) : '';
    if ($mimeInfo) finfo_close($mimeInfo);
    // Older WAMP installations may report application/octet-stream for a
    // perfectly valid image after chunk assembly. Inspect image content first
    // and fall back to the original allowed extension only when necessary.
    if (($kind === 'poster' || $kind === 'banner') && function_exists('getimagesize')) {
        $imageInfo = @getimagesize($assembledPath);
        if (is_array($imageInfo) && !empty($imageInfo['mime'])) $mimeType = $imageInfo['mime'];
    }
    if (!isset($allowedMimeTypes[$kind][$mimeType])) {
        $originalExtension = strtolower(pathinfo(isset($chunk['name']) ? $chunk['name'] : '', PATHINFO_EXTENSION));
        $extensionMimeTypes = array('jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'mp4' => 'video/mp4', 'webm' => 'video/webm', 'mov' => 'video/quicktime');
        if (isset($extensionMimeTypes[$originalExtension]) && isset($allowedMimeTypes[$kind][$extensionMimeTypes[$originalExtension]])) $mimeType = $extensionMimeTypes[$originalExtension];
    }
    if (!isset($allowedMimeTypes[$kind][$mimeType])) jsonResponse(array('success' => false, 'message' => $kind === 'trailer' ? 'Trailer phải là MP4, WebM hoặc MOV.' : 'Ảnh phải là JPG, PNG hoặc WebP.'), 400);
    $extension = $allowedMimeTypes[$kind][$mimeType];
    $fileName = 'movie-' . $kind . '-' . sha1(uniqid((string)mt_rand(), true)) . '.' . $extension;
    $targetPath = $baseDirectory . DIRECTORY_SEPARATOR . $fileName;
    if (!rename($assembledPath, $targetPath)) jsonResponse(array('success' => false, 'message' => 'Không thể lưu tệp vào thư viện media.'), 500);
    $chunkFiles = glob($tempDirectory . DIRECTORY_SEPARATOR . '*.part');
    if (!is_array($chunkFiles)) $chunkFiles = array();
    foreach ($chunkFiles as $partPath) @unlink($partPath);
    @rmdir($tempDirectory);
    $publicDirectory = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
    $host = isset($_SERVER['HTTP_HOST']) && preg_match('/^[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/', $_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $scheme = !empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off' ? 'https' : 'http';
    jsonResponse(array('success' => true, 'data' => array('complete' => true, 'url' => $scheme . '://' . $host . rtrim($publicDirectory, '/') . '/uploads/movies/' . rawurlencode($fileName), 'name' => $fileName)), 201);
}

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
    $mimeType = '';
    if (function_exists('finfo_open')) {
        $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = $fileInfo ? finfo_file($fileInfo, $file['tmp_name']) : '';
        if ($fileInfo) finfo_close($fileInfo);
    }
    if ($mimeType === '' && function_exists('mime_content_type')) {
        $mimeType = mime_content_type($file['tmp_name']);
    }
    if ($mimeType === '' && !empty($file['type'])) {
        $mimeType = strtolower((string)$file['type']);
    }
    if ($mimeType === '' && !empty($file['name'])) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $extensionMap = array(
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mov' => 'video/quicktime'
        );
        $mimeType = isset($extensionMap[$ext]) ? $extensionMap[$ext] : '';
    }
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
        'roles_supported' => array('super_admin', 'cinema_admin', 'supervisor', 'accounting', 'marketing_manager'),
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

    $user = null;
    $stmt = $db->prepare('SELECT id, username, password_hash, full_name, phone, theater_id, role, status FROM users WHERE username = ? LIMIT 1');
    if (!$stmt) jsonResponse(array('success' => false, 'message' => 'Không thể chuẩn bị truy vấn đăng nhập trong aurora_db: ' . $db->error), 500);
    $stmt->bind_param('s', $username);
    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        jsonResponse(array('success' => false, 'message' => 'Không thể tra cứu tài khoản trong aurora_db: ' . $error), 500);
    }
    // get_result() requires mysqlnd, which is not bundled with the PHP 5.2
    // version used by the project's WAMP stack. Bind the selected columns
    // directly so login works on both the legacy runtime and modern PHP.
    $stmt->store_result();
    $id = $dbUsername = $passwordHash = $fullName = $phone = $theaterId = $role = $status = null;
    $stmt->bind_result($id, $dbUsername, $passwordHash, $fullName, $phone, $theaterId, $role, $status);
    if ($stmt->fetch()) {
        $user = array(
            'id' => $id,
            'username' => $dbUsername,
            'password_hash' => $passwordHash,
            'full_name' => $fullName,
            'phone' => $phone,
            'theater_id' => $theaterId,
            'role' => $role,
            'status' => $status
        );
    }
    $stmt->close();

    // Phone numbers can be shared by legacy staff records. Use the password
    // to disambiguate them, but only continue when exactly one account
    // matches. This keeps the documented phone-number login working without
    // ever selecting another account merely because it is active.
    if (!$user) {
        $stmt = $db->prepare('SELECT id, username, password_hash, full_name, phone, theater_id, role, status FROM users WHERE phone = ? ORDER BY id DESC');
        if (!$stmt) jsonResponse(array('success' => false, 'message' => 'Không thể chuẩn bị tra cứu số điện thoại trong aurora_db: ' . $db->error), 500);
        $stmt->bind_param('s', $username);
        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            jsonResponse(array('success' => false, 'message' => 'Không thể tra cứu số điện thoại trong aurora_db: ' . $error), 500);
        }
        $stmt->store_result();
        $id = $dbUsername = $passwordHash = $fullName = $phone = $theaterId = $role = $status = null;
        $stmt->bind_result($id, $dbUsername, $passwordHash, $fullName, $phone, $theaterId, $role, $status);
        $matchedUsers = array();
        while ($stmt->fetch()) {
            $candidate = array(
                'id' => $id,
                'username' => $dbUsername,
                'password_hash' => $passwordHash,
                'full_name' => $fullName,
                'phone' => $phone,
                'theater_id' => $theaterId,
                'role' => $role,
                'status' => $status
            );
            if (passwordMatches($password, $passwordHash)) $matchedUsers[] = $candidate;
        }
        $stmt->close();
        if (count($matchedUsers) > 1) {
            jsonResponse(array('success' => false, 'message' => 'Thông tin đăng nhập khớp với nhiều tài khoản. Vui lòng dùng tên tài khoản TMS.'), 400);
        }
        if (count($matchedUsers) === 1) $user = $matchedUsers[0];
    }

    if ($user) {
        if (!passwordMatches($password, $user['password_hash'])) {
            jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'), 401);
        }

        if ($user['status'] !== 'active') {
            jsonResponse(array('success' => false, 'message' => 'Tài khoản nhân sự TMS đang bị khóa hoặc ngưng hoạt động.'), 403);
        }

        $user['theater_name'] = '';
        $signedInTheaterId = isset($user['theater_id']) ? (int)$user['theater_id'] : 0;
        if ($signedInTheaterId > 0) {
            $theaterResult = $db->query('SELECT name FROM theaters WHERE id=' . $signedInTheaterId . ' LIMIT 1');
            if ($theaterResult && ($theaterRow = $theaterResult->fetch_row())) {
                $user['theater_name'] = $theaterRow[0];
            }
            if ($theaterResult) $theaterResult->free();
        }

        if (!$db->query('UPDATE users SET last_login = NOW() WHERE id = ' . (int)$user['id'])) {
            jsonResponse(array('success' => false, 'message' => 'Không thể ghi nhận lần đăng nhập trong aurora_db: ' . $db->error), 500);
        }
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

        $_SESSION = array();
        regenerateTmsSession();
        $_SESSION['tms_user'] = $user;
        setTmsIdentity($user);
        jsonResponse(array(
            'success' => true,
            'message' => 'Đăng nhập thành công với vai trò ' . $user['role_info']['name'],
            'data' => array('user' => $user)
        ));
    }

    // Every authenticated TMS account must exist in aurora_db. Creating a
    // temporary fallback user here used to leave the browser with no durable
    // server identity, allowing an old account session to reappear on F5.
    jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'), 401);
}

if ($action === 'logout') {
    unset($_SESSION['tms_user']);
    if (session_id()) {
        session_destroy();
    }
    setcookie(session_name(), '', time() - 3600, '/');
    clearTmsIdentity();
    jsonResponse(array('success' => true, 'message' => 'Đã đăng xuất thành công khỏi TMS.'));
}

if ($action === 'me') {
    $user = requireAdmin();
    $roleDefs = AdminController::getRoleDefinitions();
    $user['role_info'] = isset($roleDefs[$user['role']]) ? $roleDefs[$user['role']] : null;
    jsonResponse(array('success' => true, 'data' => $user));
}

if ($action === 'roles') {
    requireAdmin();
    jsonResponse(array('success' => true, 'roles' => array_values(AdminController::getRoleDefinitions())));
}

if (strpos($action, 'marketing-') === 0) {
    $marketingController->handle(substr($action, strlen('marketing-')));
}

if ($action === 'permissions') {
    requireAdmin();
    if ($requestMethod === 'GET') $controller->permissionMatrix();
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') $controller->savePermissionMatrix();
    jsonResponse(array('success'=>false, 'message'=>'Phương thức không được hỗ trợ cho ma trận phân quyền.'), 405);
}

if ($action === 'users') {
    if ($requestMethod === 'GET') {
        $controller->listUsers();
    }
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        if (isset($_GET['delete']) || (isset($_GET['action_type']) && $_GET['action_type'] === 'delete')) {
            $controller->deleteUser();
        }
        $controller->saveUser();
    }
    if ($requestMethod === 'DELETE') {
        $controller->deleteUser();
    }
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho users.'), 405);
}

if ($action === 'customer-account-status') {
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') $controller->updateCustomerStatus();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho trạng thái customer.'), 405);
}

if ($action === 'dashboard') {
    requireAdmin();
    $controller->requireRbacPermission('dashboard', false);
    $controller->dashboard();
}

if ($action === 'cinema-schedule-board') {
    if ($requestMethod === 'GET') $controller->cinemaScheduleBoard();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho bảng điều phối lịch chiếu.'), 405);
}

if ($action === 'schedule-movies') {
    if ($requestMethod === 'GET') $controller->scheduleMovies();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho danh sách phim lập lịch.'), 405);
}

if ($action === 'schedule-theaters') {
    if ($requestMethod === 'GET') $controller->scheduleTheaters();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho danh sách rạp lập lịch.'), 405);
}

if ($action === 'schedule-availability') {
    if ($requestMethod === 'POST') {
        requireAdmin();
        $controller->requireRbacPermission('schedules', true);
        $controller->scheduleAvailability();
    }
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho kiểm tra khung giờ trống.'), 405);
}

if ($action === 'movie-plan-detail') {
    if ($requestMethod === 'GET') $controller->moviePlanDetail();
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') $controller->updateMoviePlanTask();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho chi tiết kế hoạch.'), 405);
}

if ($action === 'movie-plan-action') {
    if ($requestMethod === 'POST') $controller->executeMoviePlanAction();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho thao tác triển khai.'), 405);
}

if ($action === 'movie-plan-screen-preparation') {
    if ($requestMethod === 'GET' || $requestMethod === 'POST') $controller->moviePlanScreenPreparation();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho chuẩn bị phòng chiếu.'), 405);
}

if ($action === 'revenue') {
    $revenueController->index();
}

if ($action === 'transactions') {
    requireAdmin();
    $controller->requireRbacPermission('transactions_refunds', $requestMethod !== 'GET');
    if ($requestMethod === 'POST') {
        $controller->createTransaction();
    }
    $controller->transactions();
}

if ($action === 'refunds') {
    requireAdmin();
    $controller->requireRbacPermission('transactions_refunds', $requestMethod !== 'GET');
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') {
        $controller->updateRefund();
    }
    $controller->refunds();
}

if ($action === 'seats') {
    $controller->seats();
}

if ($action === 'screen-seat-map') {
    if ($requestMethod === 'GET') $controller->screenSeatMap();
    if ($requestMethod === 'POST' || $requestMethod === 'PUT') $controller->updateShowtimeSeatLocks();
    jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ cho sơ đồ ghế.'), 405);
}

if ($action === 'cinema-system-overview' && $requestMethod === 'GET') {
    $controller->cinemaSystemOverview();
}

if ($action === 'report' || $action === 'reports') {
    requireAdmin();
    $controller->requireRbacPermission('reports', false);
    $controller->report();
}

if ($action === 'movies-import' && $requestMethod === 'POST') {
    $user = requireAdmin();
    if (AdminController::normalizeRole($user['role']) !== 'super_admin') jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng được nhập danh sách phim.'), 403);
    $input = requestJson(); $rows = isset($input['movies']) && is_array($input['movies']) ? $input['movies'] : array();
    if (!$rows || count($rows) > 150) jsonResponse(array('success' => false, 'message' => 'File phải có từ 1 đến 150 dòng phim.'), 400);
    $mode = isset($input['mode']) ? $input['mode'] : 'validate'; $errors = array(); $titles = array(); $validRows = array();
    $requiredFields = array('title'=>'Tên phim','original_title'=>'Tên phim gốc','genre'=>'Thể loại','duration_minutes'=>'Thời lượng','age_rating'=>'Độ tuổi','director'=>'Đạo diễn','cast'=>'Diễn viên','writer'=>'Biên kịch','producer'=>'Nhà sản xuất','production_country'=>'Quốc gia sản xuất','production_year'=>'Năm sản xuất','description'=>'Tóm tắt phim','plot_details'=>'Nội dung chi tiết','original_language'=>'Ngôn ngữ gốc','localization_versions'=>'Phiên bản phát hành','format'=>'Định dạng','release_date'=>'Ngày khởi chiếu','expected_end_date'=>'Ngày kết thúc dự kiến','distributor'=>'Nhà phát hành','poster_url'=>'Poster URL','banner_url'=>'Banner URL','trailer_url'=>'Trailer URL','status'=>'Trạng thái');
    foreach ($rows as $index => $row) {
        $line = $index + 2; $errorCount = count($errors); $title = trim(isset($row['title']) ? $row['title'] : ''); $duration = isset($row['duration_minutes']) ? (int)$row['duration_minutes'] : 0;
        foreach ($requiredFields as $field => $label) { $value = isset($row[$field]) ? trim((string)$row[$field]) : ''; if ($value === '' || ($field === 'production_year' && (int)$value <= 0)) $errors[] = array('row'=>$line,'field'=>$field,'message'=>'Thiếu dữ liệu: '.$label.'.'); }
        if ($duration < 1 || $duration > 600) $errors[] = array('row'=>$line,'field'=>'duration_minutes','message'=>'Thời lượng phải từ 1 đến 600 phút.');
        $year = isset($row['production_year']) ? (int)$row['production_year'] : 0; if ($year && ($year < 1888 || $year > 2100)) $errors[] = array('row'=>$line,'field'=>'production_year','message'=>'Năm sản xuất phải trong khoảng 1888–2100.');
        $normalizedTitle = strtolower($title); if ($title !== '' && isset($titles[$normalizedTitle])) $errors[] = array('row'=>$line,'field'=>'title','message'=>'Trùng tên phim với dòng '.$titles[$normalizedTitle].'.'); $titles[$normalizedTitle] = $line;
        if ($title !== '') { $exists = $db->prepare('SELECT id FROM movies WHERE title=? LIMIT 1'); $exists->bind_param('s', $title); $exists->execute(); $exists->store_result(); if ($exists->num_rows) $errors[] = array('row'=>$line,'field'=>'title','message'=>'Phim này đã có trong kho hệ thống.'); $exists->close(); }
        $release = trim(isset($row['release_date']) ? $row['release_date'] : ''); $end = trim(isset($row['expected_end_date']) ? $row['expected_end_date'] : '');
        if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $release)) $errors[] = array('row'=>$line,'field'=>'release_date','message'=>'Ngày khởi chiếu phải có dạng YYYY-MM-DD.');
        if (!preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $end)) $errors[] = array('row'=>$line,'field'=>'expected_end_date','message'=>'Ngày kết thúc phải có dạng YYYY-MM-DD.');
        if (preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $release) && preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $end) && $end < $release) $errors[] = array('row'=>$line,'field'=>'expected_end_date','message'=>'Ngày kết thúc không được trước ngày khởi chiếu.');
        $status = strtoupper(trim(isset($row['status']) ? $row['status'] : '')); if (!in_array($status, array('COMING_SOON','NOW_SHOWING','SPECIAL_SHOWING','ENDED'))) $errors[] = array('row'=>$line,'field'=>'status','message'=>'Trạng thái phải là COMING_SOON, NOW_SHOWING, SPECIAL_SHOWING hoặc ENDED.');
        if ($errorCount === count($errors)) $validRows[] = $row;
    }
    if ($mode !== 'import' || count($errors)) jsonResponse(array('success' => true, 'message' => count($errors) ? 'File có lỗi cần chỉnh sửa.' : 'File hợp lệ, sẵn sàng tạo phim.', 'data' => array('valid' => !count($errors), 'total' => count($rows), 'valid_count' => count($validRows), 'errors' => $errors)));
    // Revalidation above and this transaction make the import all-or-nothing:
    // a concurrent duplicate or database error can never leave a partial list.
    if (!$db->query('START TRANSACTION')) jsonResponse(array('success' => false, 'message' => 'Không thể bắt đầu phiên nhập dữ liệu.'), 500);
    $added = 0;
    $stmt = $db->prepare("INSERT INTO movies (movie_code,title,original_title,genre,duration_minutes,age_rating,director,cast,writer,producer,production_country,production_year,description,plot_details,original_language,localization_versions,format,release_date,expected_end_date,distributor,poster_url,banner_url,trailer_url,status,is_hot,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,NOW(),NOW())");
    if (!$stmt) { $db->query('ROLLBACK'); jsonResponse(array('success' => false, 'message' => 'Không thể chuẩn bị nhập phim: '.$db->error), 500); }
    try {
        foreach ($validRows as $row) {
            $movieCode=generateImportedMovieCode($db); $title=trim($row['title']); $originalTitle=trim($row['original_title']); $genre=trim($row['genre']); $duration=(int)$row['duration_minutes']; $age=trim($row['age_rating']); $director=trim($row['director']); $cast=trim($row['cast']); $writer=trim($row['writer']); $producer=trim($row['producer']); $country=trim($row['production_country']); $year=(int)$row['production_year']; $description=trim($row['description']); $plot=trim($row['plot_details']); $language=trim($row['original_language']); $localization=trim($row['localization_versions']); $format=trim($row['format']); $release=trim($row['release_date']); $end=trim($row['expected_end_date']); $distributor=trim($row['distributor']); $poster=trim($row['poster_url']); $banner=trim($row['banner_url']); $trailer=trim($row['trailer_url']); $status=strtolower(trim($row['status']));
            $stmt->bind_param('ssssissssssissssssssssss', $movieCode,$title,$originalTitle,$genre,$duration,$age,$director,$cast,$writer,$producer,$country,$year,$description,$plot,$language,$localization,$format,$release,$end,$distributor,$poster,$banner,$trailer,$status);
            if (!$stmt->execute()) throw new Exception($stmt->errno === 1062 ? 'Mã phim hoặc tên phim đã tồn tại. Hãy kiểm tra lại tệp.' : $stmt->error);
            $added++;
        }
        $stmt->close();
        if (!$db->query('COMMIT')) throw new Exception('Không thể hoàn tất việc ghi dữ liệu vào aurora_db.');
    } catch (Exception $e) {
        if ($stmt) $stmt->close();
        $db->query('ROLLBACK');
        jsonResponse(array('success' => false, 'message' => 'Chưa có phim nào được tạo: '.$e->getMessage()), 400);
    }
    jsonResponse(array('success' => true, 'message' => 'Đã tạo thành công '.$added.' phim vào kho hệ thống.', 'data' => array('added' => $added)));
}

$resources = array('movies', 'screens', 'schedules', 'staff', 'ticket-types', 'products', 'vouchers', 'customers', 'theaters', 'promotions', 'audit-logs', 'system-configs', 'transactions', 'refunds', 'movie-plans', 'movie-allocations');
if (in_array($action, $resources, true)) {
    $rbacResourceKeys = array(
        'movies'=>'movies', 'screens'=>'screens', 'schedules'=>'schedules', 'staff'=>'staff',
        'ticket-types'=>'ticket_types', 'products'=>'products', 'vouchers'=>'vouchers',
        'promotions'=>'vouchers', 'customers'=>'customers', 'transactions'=>'transactions_refunds',
        'refunds'=>'transactions_refunds', 'system-configs'=>'settings', 'audit-logs'=>'settings'
    );
    if (isset($rbacResourceKeys[$action])) {
        requireAdmin();
        $controller->requireRbacPermission($rbacResourceKeys[$action], $requestMethod !== 'GET');
    }
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
