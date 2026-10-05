<?php
// POS still runs on the supplied PHP 5.2 WAMP stack. Keep this entrypoint
// backwards-compatible while enforcing a database-backed employee session.
if (session_id() === '') {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
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
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
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

function passwordMatches($password, $hash) {
    $legacyPrefix = 'sha256:aurora-pos-local-2026:';
    if (strpos($hash, $legacyPrefix) === 0) {
        $expected = substr($hash, strlen($legacyPrefix));
        return hash('sha256', 'aurora-pos-local-2026:' . $password) === $expected;
    }
    if (function_exists('password_verify')) {
        return password_verify($password, $hash);
    }
    return crypt($password, $hash) === $hash;
}

function findPosUser($db, $username) {
    $stmt = $db->prepare('SELECT id, username, password_hash, full_name, role, status, theater_id, counter_code FROM pos_users WHERE username = ? LIMIT 1');
    if (!$stmt) return null;
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $id = null; $foundUsername = null; $passwordHash = null; $fullName = null; $role = null; $status = null; $assignedTheaterId = 1; $counterCode = 'AURORA BOX 02';
    $stmt->bind_result($id, $foundUsername, $passwordHash, $fullName, $role, $status, $assignedTheaterId, $counterCode);
    $found = $stmt->fetch();
    $stmt->close();
    if (!$found) return null;
    if (!$assignedTheaterId) $assignedTheaterId = 1;
    return array('id' => (int)$id, 'username' => $foundUsername, 'password_hash' => $passwordHash, 'full_name' => $fullName, 'role' => $role, 'status' => $status, 'theater_id' => $assignedTheaterId, 'counter_code' => $counterCode);
}


function getPosTheater($db, $theaterId) {
    $stmt = $db->prepare('SELECT id, name, address, city FROM theaters WHERE id = ? LIMIT 1');
    if (!$stmt) return null;
    $stmt->bind_param('i', $theaterId); $stmt->execute();
    $id = null; $name = null; $address = null; $city = null; $stmt->bind_result($id, $name, $address, $city);
    $found = $stmt->fetch(); $stmt->close();
    return $found ? array('id' => (int)$id, 'name' => $name, 'address' => $address, 'city' => $city) : null;
}

function posUser() {
    return isset($_SESSION['pos_user']) ? $_SESSION['pos_user'] : null;
}

function requirePosUser() {
    if (empty($_SESSION['pos_user'])) {
        jsonResponse(array('success' => false, 'message' => 'Phiên đăng nhập quầy đã hết hạn.'), 401);
    }
    return $_SESSION['pos_user'];
}

function ensurePosSalesTables($db) {
    // Schema is deployed centrally; POS must never create a divergent local schema.
    foreach (array('products', 'orders', 'order_items', 'payments') as $table) {
        if (!$db->query("SELECT 1 FROM `{$table}` LIMIT 1")) return false;
    }
    return true;

    $queries = array(
        "CREATE TABLE IF NOT EXISTS products (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL, sku VARCHAR(50) NOT NULL UNIQUE,
            category VARCHAR(80) NOT NULL DEFAULT 'Concession', price DECIMAL(12,2) NOT NULL DEFAULT 0,
            stock_quantity INT UNSIGNED NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
        "CREATE TABLE IF NOT EXISTS orders (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_id BIGINT UNSIGNED NULL,
            cashier_id INT UNSIGNED NOT NULL,
            order_code VARCHAR(30) NOT NULL UNIQUE,
            subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            payment_method ENUM('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
            amount_received DECIMAL(12,2) NOT NULL DEFAULT 0,
            change_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            status ENUM('PAID','CANCELLED') NOT NULL DEFAULT 'PAID',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_orders_created (created_at),
            INDEX idx_orders_cashier (cashier_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
        "CREATE TABLE IF NOT EXISTS order_items (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id BIGINT UNSIGNED NOT NULL,
            item_type ENUM('TICKET','COMBO') NOT NULL,
            item_code VARCHAR(60) NOT NULL,
            item_name VARCHAR(180) NOT NULL,
            quantity INT UNSIGNED NOT NULL,
            unit_price DECIMAL(12,2) NOT NULL,
            seat_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            INDEX idx_order_items_order (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
        "CREATE TABLE IF NOT EXISTS payments (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id BIGINT UNSIGNED NOT NULL,
            method ENUM('CASH','CARD','TRANSFER') NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            reference_code VARCHAR(80) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
    );
    foreach ($queries as $query) {
        if (!$db->query($query)) return false;
    }
    return true;
}

function posComboCatalog($db) {
    $catalog = array();
    $result = $db->query("SELECT sku, name, price FROM products WHERE status='active' AND stock_quantity > 0 ORDER BY name");
    if (!$result) return $catalog;
    while ($row = $result->fetch_assoc()) {
        $catalog[$row['sku']] = array('name' => $row['name'], 'price' => (float)$row['price']);
    }
    return $catalog;
}

function posHasBookingShowtimeColumn($db) {
    $result = $db->query("SHOW COLUMNS FROM booking_seats LIKE 'showtime_id'");
    return $result && $result->num_rows > 0;
}

function posTableColumnExists($db, $table, $column) {
    $safeTable = $db->real_escape_string($table); $safeColumn = $db->real_escape_string($column);
    $result = $db->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");
    return $result && $result->num_rows > 0;
}

function ensurePosAuthenticationSchema($db) {
    $queries = array(
        "CREATE TABLE IF NOT EXISTS pos_users (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(60) NOT NULL, password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(120) NOT NULL, phone VARCHAR(20) NULL,
            role ENUM('cashier','supervisor','admin') NOT NULL DEFAULT 'cashier',
            status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
            theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
            counter_code VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02',
            last_login_at DATETIME NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL DEFAULT NULL, UNIQUE KEY uq_pos_users_username (username),
            KEY idx_pos_users_theater (theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_login_events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NULL,
            username VARCHAR(60) NOT NULL, event_type VARCHAR(30) NOT NULL,
            is_success TINYINT(1) NOT NULL DEFAULT 0, ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_pos_login_user_created (user_id, created_at),
            KEY idx_pos_login_username_created (username, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_shifts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
            theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1, cinema_name VARCHAR(120) NOT NULL,
            counter VARCHAR(60) NOT NULL, initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
            cash_at_close DECIMAL(12,2) NULL, status ENUM('active','paused','closed') NOT NULL DEFAULT 'active',
            opened_at DATETIME NOT NULL, closed_at DATETIME NULL, notes TEXT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL DEFAULT NULL,
            KEY idx_pos_shifts_user_status (user_id, status), KEY idx_pos_shifts_theater (theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
    );
    foreach ($queries as $query) if (!$db->query($query)) return false;
    // Support an older POS database that was initialized before branch/counter fields existed.
    if (!posTableColumnExists($db, 'pos_users', 'theater_id') && !$db->query('ALTER TABLE pos_users ADD theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'counter_code') && !$db->query("ALTER TABLE pos_users ADD counter_code VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02'")) return false;
    if (!posTableColumnExists($db, 'pos_users', 'last_login_at') && !$db->query('ALTER TABLE pos_users ADD last_login_at DATETIME NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'theater_id') && !$db->query('ALTER TABLE pos_shifts ADD theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1')) return false;

    $cashierHash = 'sha256:aurora-pos-local-2026:' . hash('sha256', 'aurora-pos-local-2026:8888');
    $adminHash = 'sha256:aurora-pos-local-2026:' . hash('sha256', 'aurora-pos-local-2026:admin123');
    $now = date('Y-m-d H:i:s');
    $seed = $db->prepare("INSERT INTO pos_users (username,password_hash,full_name,phone,role,status,theater_id,counter_code,updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)
        ON DUPLICATE KEY UPDATE username=VALUES(username)");
    if (!$seed) return false;
    $username = '0328754062'; $name = 'Nguyễn Trần Thái Bảo'; $phone = '0328754062'; $role = 'cashier'; $counter = 'AURORA BOX 02';
    $seed->bind_param('sssssss', $username, $cashierHash, $name, $phone, $role, $counter, $now); if (!$seed->execute()) { $seed->close(); return false; }
    $username = 'admin'; $name = 'Quản lý ca trực Aurora'; $phone = '0328754000'; $role = 'admin'; $counter = 'AURORA BOX 01';
    $seed->bind_param('sssssss', $username, $adminHash, $name, $phone, $role, $counter, $now); $ok = $seed->execute(); $seed->close();
    return $ok;
}

function posLogAuthEvent($db, $userId, $username, $eventType, $isSuccess) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? substr((string)$_SERVER['REMOTE_ADDR'], 0, 45) : '';
    $agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 255) : '';
    $stmt = $db->prepare('INSERT INTO pos_login_events (user_id,username,event_type,is_success,ip_address,user_agent) VALUES (?, ?, ?, ?, ?, ?)');
    if (!$stmt) return;
    $successValue = $isSuccess ? 1 : 0; $nullableUser = $userId ? $userId : null;
    $stmt->bind_param('ississ', $nullableUser, $username, $eventType, $successValue, $ip, $agent); $stmt->execute(); $stmt->close();
}

function posCurrentShift($db, $userId) {
    $stmt = $db->prepare("SELECT id, cinema_name, counter, initial_cash, status, opened_at FROM pos_shifts WHERE user_id = ? AND status IN ('active','paused') ORDER BY id DESC LIMIT 1");
    if (!$stmt) return null;
    $stmt->bind_param('i', $userId); $stmt->execute();
    $id = null; $cinema = null; $counter = null; $initial = null; $status = null; $opened = null;
    $stmt->bind_result($id, $cinema, $counter, $initial, $status, $opened); $found = $stmt->fetch(); $stmt->close();
    return $found ? array('id'=>(int)$id, 'cinema_name'=>$cinema, 'counter'=>$counter, 'initial_cash'=>(float)$initial, 'status'=>$status, 'opened_at'=>$opened) : null;
}

function posOpenShift($db, $user, $theater) {
    $existing = posCurrentShift($db, (int)$user['id']);
    if ($existing) {
        if ($existing['status'] === 'paused') {
            $now = date('Y-m-d H:i:s'); $resume = $db->prepare("UPDATE pos_shifts SET status='active', updated_at=? WHERE id=?");
            if (!$resume) return null;
            $resume->bind_param('si', $now, $existing['id']); $ok = $resume->execute(); $resume->close();
            if (!$ok) return null;
            $existing['status'] = 'active';
        }
        return $existing;
    }
    $now = date('Y-m-d H:i:s'); $initialCash = 500000.00; $counter = $user['counter_code']; $cinema = $theater['name']; $theaterId = (int)$theater['id']; $userId = (int)$user['id'];
    $stmt = $db->prepare("INSERT INTO pos_shifts (user_id,theater_id,cinema_name,counter,initial_cash,status,opened_at,created_at,updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)");
    if (!$stmt) return null;
    $stmt->bind_param('iissdsss', $userId, $theaterId, $cinema, $counter, $initialCash, $now, $now, $now);
    if (!$stmt->execute()) { $stmt->close(); return null; }
    $id = (int)$stmt->insert_id; $stmt->close();
    return array('id'=>$id, 'cinema_name'=>$cinema, 'counter'=>$counter, 'initial_cash'=>$initialCash, 'status'=>'active', 'opened_at'=>$now);
}

// POS, TMS và customer dùng chung aurora_db.
$db = @new mysqli('127.0.0.1', 'root', '', 'aurora_db', 3306);

if ($db->connect_error) {
    jsonResponse(array('success' => false, 'message' => 'Không thể kết nối aurora_db: ' . $db->connect_error), 500);
}

$db->set_charset('utf8');
if (!ensurePosAuthenticationSchema($db)) {
    jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu xác thực POS trong aurora_db.'), 500);
}
$action = isset($_GET['action']) ? $_GET['action'] : 'health';

if ($action === 'health') {
    jsonResponse(array(
        'success' => true,
        'service' => 'aurora-pos-api',
        'database' => 'connected',
        'timestamp' => date('c')
    ));
}

if ($action === 'login' && $requestMethod === 'POST') {
    $input = requestJson();
    $username = isset($input['username']) ? trim((string)$input['username']) : '';
    $password = isset($input['password']) ? (string)$input['password'] : '';

    if ($username === '' || $password === '') {
        jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'), 400);
    }

    $user = findPosUser($db, $username);

    if (!$user || !passwordMatches($password, $user['password_hash'])) {
        posLogAuthEvent($db, 0, $username, 'LOGIN_FAILED', false);
        jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'), 401);
    }

    if (isset($user['status']) && $user['status'] !== 'active') {
        posLogAuthEvent($db, (int)$user['id'], $username, 'LOGIN_DENIED', false);
        jsonResponse(array('success' => false, 'message' => 'Tài khoản nhân viên đang bị tạm khóa.'), 403);
    }

    $theater = getPosTheater($db, isset($user['theater_id']) ? (int)$user['theater_id'] : 1);
    if (!$theater) jsonResponse(array('success' => false, 'message' => 'Nhân viên chưa được phân rạp hợp lệ.'), 403);
    $user['theater_id'] = $theater['id'];
    $user['theater_name'] = $theater['name'];
    $user['theater_address'] = $theater['address'];
    $shift = posOpenShift($db, $user, $theater);
    if (!$shift) jsonResponse(array('success' => false, 'message' => 'Không thể mở phiên làm việc tại quầy.'), 500);
    unset($user['password_hash']);
    session_regenerate_id(true);
    $_SESSION['pos_user'] = $user;
    $_SESSION['pos_shift_id'] = $shift['id'];
    posLogAuthEvent($db, (int)$user['id'], $username, 'LOGIN_SUCCESS', true);
    $lastLogin = date('Y-m-d H:i:s');
    $stmt = $db->prepare('UPDATE pos_users SET last_login_at = ?, updated_at = ? WHERE id = ?');
    if ($stmt) { $stmt->bind_param('ssi', $lastLogin, $lastLogin, $user['id']); $stmt->execute(); $stmt->close(); }

    $sessionData = array(
        'cinema_name' => $theater['name'],
        'cinema_address' => $theater['address'],
        'theater_id' => $theater['id'],
        'staff_name' => $user['full_name'],
        'work_date' => date('d/m/Y'),
        'shift_id' => $shift['id'],
        'shift_time' => date('H:i', strtotime($shift['opened_at'])) . ' - 23:59',
        'counter' => $shift['counter'],
        'initial_cash' => $shift['initial_cash'],
        'status' => 'Đang hoạt động'
    );

    jsonResponse(array(
        'success' => true,
        'message' => 'Đăng nhập thành công.',
        'data' => array(
            'user' => $user,
            'session' => $sessionData
        )
    ));
}

if ($action === 'logout') {
    $user = isset($_SESSION['pos_user']) ? $_SESSION['pos_user'] : null;
    if ($user) posLogAuthEvent($db, (int)$user['id'], $user['username'], 'LOGOUT', true);
    $shiftId = isset($_SESSION['pos_shift_id']) ? (int)$_SESSION['pos_shift_id'] : 0;
    if ($user && $shiftId > 0) {
        $now = date('Y-m-d H:i:s'); $pause = $db->prepare("UPDATE pos_shifts SET status='paused', updated_at=? WHERE id=? AND user_id=? AND status='active'");
        if ($pause) { $userId = (int)$user['id']; $pause->bind_param('sii', $now, $shiftId, $userId); $pause->execute(); $pause->close(); }
    }
    unset($_SESSION['pos_user']);
    unset($_SESSION['pos_shift_id']);
    if (session_id()) {
        session_destroy();
    }
    jsonResponse(array('success' => true, 'message' => 'Đã đăng xuất thành công.'));
}

if ($action === 'me') {
    if (empty($_SESSION['pos_user'])) {
        jsonResponse(array('success' => false, 'message' => 'Chưa đăng nhập.'), 401);
    }
    jsonResponse(array('success' => true, 'data' => $_SESSION['pos_user']));
}

if ($action === 'dashboard') {
    $user = requirePosUser();
    $theater = getPosTheater($db, isset($user['theater_id']) ? (int)$user['theater_id'] : 1);
    $shift = posCurrentShift($db, (int)$user['id']);
    if (!$theater || !$shift) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phiên làm việc đang hoạt động.'), 409);

    jsonResponse(array(
        'success' => true,
        'data' => array(
            'user' => $user,
            'shift' => array(
                'cinema_name' => $theater ? $theater['name'] : 'Aurora Q1',
                'cinema_address' => $theater ? $theater['address'] : '',
                'theater_id' => $theater ? $theater['id'] : 1,
                'staff_name' => $user['full_name'],
                'work_date' => date('d/m/Y'),
                'shift_id' => $shift['id'],
                'shift_time' => date('H:i', strtotime($shift['opened_at'])) . ' - 23:59',
                'counter' => $shift['counter'],
                'initial_cash' => $shift['initial_cash'],
                'status' => $shift['status'] === 'paused' ? 'Tạm nghỉ' : 'Đang hoạt động'
            )
        )
    ));
}

if ($action === 'close_shift' && $requestMethod === 'POST') {
    $user = requirePosUser();
    $shiftId = isset($_SESSION['pos_shift_id']) ? (int)$_SESSION['pos_shift_id'] : 0;
    if ($shiftId < 1) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phiên làm việc cần đóng.'), 409);
    $input = requestJson(); $cashAtClose = isset($input['cash_at_close']) ? (float)$input['cash_at_close'] : 0;
    if ($cashAtClose < 0) jsonResponse(array('success' => false, 'message' => 'Tiền mặt kết ca không hợp lệ.'), 422);
    $now = date('Y-m-d H:i:s');
    $stmt = $db->prepare("UPDATE pos_shifts SET status='closed', cash_at_close=?, closed_at=?, updated_at=? WHERE id=? AND user_id=? AND status IN ('active','paused')");
    if (!$stmt) jsonResponse(array('success' => false, 'message' => 'Không thể đóng ca.'), 500);
    $userId = (int)$user['id']; $stmt->bind_param('dssii', $cashAtClose, $now, $now, $shiftId, $userId); $stmt->execute(); $affected = $stmt->affected_rows; $stmt->close();
    if ($affected < 1) jsonResponse(array('success' => false, 'message' => 'Ca làm việc đã được đóng hoặc không thuộc tài khoản hiện tại.'), 409);
    posLogAuthEvent($db, $userId, $user['username'], 'SHIFT_CLOSED', true);
    unset($_SESSION['pos_shift_id']);
    jsonResponse(array('success' => true, 'message' => 'Đã đóng ca và ghi nhận tiền mặt kết ca.', 'data' => array('shift_id' => $shiftId, 'cash_at_close' => $cashAtClose, 'closed_at' => $now)));
}

if ($action === 'sales_catalog' && $requestMethod === 'GET') {
    $posUser = requirePosUser();
    $theaterId = isset($posUser['theater_id']) ? (int)$posUser['theater_id'] : 1;
    if (!ensurePosSalesTables($db)) {
        jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu bán hàng.'), 500);
    }

    $requestedDate = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
    if ($requestedDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
        jsonResponse(array('success' => false, 'message' => 'Ngày chiếu không hợp lệ.'), 422);
    }

    $datesResult = $db->query("SELECT DISTINCT DATE(st.starts_at) AS show_date FROM showtimes st INNER JOIN screens s ON s.id = st.screen_id WHERE st.status = 'OPEN' AND st.starts_at >= NOW() AND s.theater_id = {$theaterId} ORDER BY show_date LIMIT 14");
    $dates = array();
    if ($datesResult) while ($dateRow = $datesResult->fetch_assoc()) $dates[] = $dateRow['show_date'];
    if ($requestedDate === '' && count($dates) > 0) $requestedDate = $dates[0];

    $showtimes = array();
    if ($requestedDate !== '') {
        $safeDate = $db->real_escape_string($requestedDate);
        $sql = "SELECT st.id, st.movie_id, st.screen_id, st.starts_at, st.ends_at, st.ticket_price,
                       m.title AS movie_title, m.age_rating, m.format, s.name AS screen_name,
                       t.name AS theater_name
                FROM showtimes st
                INNER JOIN movies m ON m.id = st.movie_id
                INNER JOIN screens s ON s.id = st.screen_id
                INNER JOIN theaters t ON t.id = s.theater_id
                WHERE st.status = 'OPEN' AND DATE(st.starts_at) = '{$safeDate}' AND s.theater_id = {$theaterId}
                ORDER BY st.starts_at";
        $result = $db->query($sql);
        if (!$result) jsonResponse(array('success' => false, 'message' => 'Không thể tải suất chiếu.'), 500);
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['movie_id'] = (int)$row['movie_id'];
            $row['screen_id'] = (int)$row['screen_id'];
            $row['ticket_price'] = (float)$row['ticket_price'];
            $showtimes[] = $row;
        }
    }

    $combos = array();
    foreach (posComboCatalog($db) as $code => $combo) $combos[] = array('code' => $code, 'name' => $combo['name'], 'price' => $combo['price']);
    $theater = getPosTheater($db, $theaterId);
    jsonResponse(array('success' => true, 'data' => array('theater' => $theater, 'dates' => $dates, 'selected_date' => $requestedDate, 'showtimes' => $showtimes, 'combos' => $combos)));
}

if ($action === 'sales_seats' && $requestMethod === 'GET') {
    $posUser = requirePosUser();
    $theaterId = isset($posUser['theater_id']) ? (int)$posUser['theater_id'] : 1;
    $showtimeId = isset($_GET['showtime_id']) ? (int)$_GET['showtime_id'] : 0;
    if ($showtimeId < 1) jsonResponse(array('success' => false, 'message' => 'Suất chiếu không hợp lệ.'), 422);
    $stmt = $db->prepare("SELECT st.screen_id FROM showtimes st INNER JOIN screens sc ON sc.id = st.screen_id WHERE st.id = ? AND st.status = 'OPEN' AND sc.theater_id = {$theaterId} LIMIT 1");
    if (!$stmt) jsonResponse(array('success' => false, 'message' => 'Không thể tải suất chiếu.'), 500);
    $stmt->bind_param('i', $showtimeId); $stmt->execute(); $screenId = null; $stmt->bind_result($screenId);
    if (!$stmt->fetch()) { $stmt->close(); jsonResponse(array('success' => false, 'message' => 'Suất chiếu không tồn tại hoặc đã đóng.'), 404); }
    $stmt->close();
    $sql = "SELECT s.id, s.seat_row, s.seat_number, s.seat_type,
                   CASE WHEN COUNT(b.id) > 0 THEN 0 ELSE 1 END AS is_available
            FROM seats s
            LEFT JOIN booking_seats bs ON bs.seat_id = s.id
            LEFT JOIN bookings b ON b.id = bs.booking_id AND b.showtime_id = {$showtimeId} AND b.status NOT IN ('CANCELLED','EXPIRED')
            WHERE s.screen_id = {$screenId}
            GROUP BY s.id, s.seat_row, s.seat_number, s.seat_type
            ORDER BY s.seat_row, s.seat_number";
    $result = $db->query($sql);
    if (!$result) jsonResponse(array('success' => false, 'message' => 'Không thể tải sơ đồ ghế.'), 500);
    $seats = array();
    while ($seat = $result->fetch_assoc()) $seats[] = array('id' => (int)$seat['id'], 'row' => $seat['seat_row'], 'number' => (int)$seat['seat_number'], 'type' => $seat['seat_type'], 'available' => (int)$seat['is_available'] === 1);
    jsonResponse(array('success' => true, 'data' => array('showtime_id' => $showtimeId, 'seats' => $seats)));
}

if ($action === 'sales_order' && $requestMethod === 'POST') {
    $posUser = requirePosUser();
    $theaterId = isset($posUser['theater_id']) ? (int)$posUser['theater_id'] : 1;
    if (!ensurePosSalesTables($db)) jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu bán hàng.'), 500);
    $input = requestJson();
    $showtimeId = isset($input['showtime_id']) ? (int)$input['showtime_id'] : 0;
    $seatIds = isset($input['seat_ids']) && is_array($input['seat_ids']) ? array_values(array_unique(array_map('intval', $input['seat_ids']))) : array();
    $validRequestedSeats = array();
    foreach ($seatIds as $requestedSeatId) if ($requestedSeatId > 0) $validRequestedSeats[] = $requestedSeatId;
    $seatIds = $validRequestedSeats;
    $paymentMethod = isset($input['payment_method']) ? strtoupper(trim((string)$input['payment_method'])) : 'CASH';
    $amountReceived = isset($input['amount_received']) ? (float)$input['amount_received'] : 0;
    $combosInput = isset($input['combos']) && is_array($input['combos']) ? $input['combos'] : array();
    if ($showtimeId < 1 || count($seatIds) < 1 || count($seatIds) > 12) jsonResponse(array('success' => false, 'message' => 'Vui lòng chọn suất chiếu và từ 1 đến 12 ghế.'), 422);
    if (!in_array($paymentMethod, array('CASH', 'CARD', 'TRANSFER'), true)) jsonResponse(array('success' => false, 'message' => 'Phương thức thanh toán không hợp lệ.'), 422);

    $catalog = posComboCatalog($db); $combos = array();
    foreach ($combosInput as $item) {
        $code = is_array($item) && isset($item['code']) ? (string)$item['code'] : '';
        $quantity = is_array($item) && isset($item['quantity']) ? (int)$item['quantity'] : 0;
        if ($quantity > 0 && $quantity <= 10 && isset($catalog[$code])) $combos[$code] = min(10, (isset($combos[$code]) ? $combos[$code] : 0) + $quantity);
    }

    $db->autocommit(false);
    try {
        $stmt = $db->prepare("SELECT st.screen_id, st.ticket_price, st.status, st.starts_at FROM showtimes st INNER JOIN screens sc ON sc.id = st.screen_id WHERE st.id = ? AND sc.theater_id = {$theaterId} FOR UPDATE");
        if (!$stmt) throw new Exception('Không thể kiểm tra suất chiếu.');
        $stmt->bind_param('i', $showtimeId); $stmt->execute(); $screenId = null; $ticketPrice = null; $status = null; $startsAt = null;
        $found = $stmt->bind_result($screenId, $ticketPrice, $status, $startsAt) && $stmt->fetch(); $stmt->close();
        if (!$found || $status !== 'OPEN') throw new Exception('Suất chiếu không tồn tại hoặc đã đóng.');
        if (strtotime($startsAt) < time()) throw new Exception('Suất chiếu đã bắt đầu, không thể bán vé.');

        $seatSql = 'SELECT id, seat_row, seat_number, seat_type FROM seats WHERE screen_id = ? AND id IN (' . implode(',', array_fill(0, count($seatIds), '?')) . ') FOR UPDATE';
        $seatParams = array_merge(array($screenId), $seatIds); $types = str_repeat('i', count($seatParams));
        $stmt = $db->prepare($seatSql); $refs = array($types); foreach ($seatParams as $key => $value) $refs[] = &$seatParams[$key]; call_user_func_array(array($stmt, 'bind_param'), $refs); $stmt->execute();
        $validSeats = array(); $seatInfo = array(); $stmt->bind_result($seatId, $seatRow, $seatNumber, $seatType);
        while ($stmt->fetch()) { $validSeats[] = (int)$seatId; $seatInfo[(int)$seatId] = array('label' => $seatRow . $seatNumber, 'type' => $seatType); }
        $stmt->close(); sort($validSeats); $expectedSeats = $seatIds; sort($expectedSeats);
        if ($validSeats !== $expectedSeats) throw new Exception('Ghế đã chọn không thuộc phòng chiếu này.');

        $takenSql = "SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id = bs.booking_id WHERE b.showtime_id = ? AND bs.seat_id IN (" . implode(',', array_fill(0, count($seatIds), '?')) . ") AND b.status NOT IN ('CANCELLED','EXPIRED')";
        $stmt = $db->prepare($takenSql); $takenParams = array_merge(array($showtimeId), $seatIds); $takenTypes = str_repeat('i', count($takenParams)); $refs = array($takenTypes); foreach ($takenParams as $key => $value) $refs[] = &$takenParams[$key]; call_user_func_array(array($stmt, 'bind_param'), $refs); $stmt->execute(); $taken = 0; $stmt->bind_result($taken); $stmt->fetch(); $stmt->close();
        if ((int)$taken > 0) throw new Exception('Một hoặc nhiều ghế vừa được bán bởi quầy khác.');

        $ticketTotal = 0; $items = array();
        foreach ($seatIds as $seatId) {
            $seat = $seatInfo[$seatId]; $price = (float)$ticketPrice;
            if ($seat['type'] === 'VIP') $price += 20000; else if ($seat['type'] === 'COUPLE') $price *= 2;
            $ticketTotal += $price; $items[] = array('type' => 'TICKET', 'code' => 'SEAT-' . $seatId, 'name' => 'Vé ' . $seat['label'] . ' (' . $seat['type'] . ')', 'quantity' => 1, 'price' => $price, 'seat_id' => $seatId);
        }
        $comboTotal = 0;
        foreach ($combos as $code => $quantity) { $comboTotal += $catalog[$code]['price'] * $quantity; $items[] = array('type' => 'COMBO', 'code' => $code, 'name' => $catalog[$code]['name'], 'quantity' => $quantity, 'price' => $catalog[$code]['price'], 'seat_id' => null); }
        $total = $ticketTotal + $comboTotal;
        if ($paymentMethod !== 'CASH') $amountReceived = $total;
        if ($amountReceived < $total) throw new Exception('Số tiền khách đưa chưa đủ.');
        $change = $amountReceived - $total;

        $userResult = $db->query('SELECT id FROM users ORDER BY id LIMIT 1'); $userRow = $userResult ? $userResult->fetch_assoc() : null; $customerId = $userRow ? (int)$userRow['id'] : 0;
        if ($customerId < 1) throw new Exception('Chưa có tài khoản khách hàng hệ thống để ghi nhận booking.');
        $code = 'POS-' . strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 10)); $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare("INSERT INTO bookings (user_id, showtime_id, booking_code, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PAID', ?, ?)"); $stmt->bind_param('iisdss', $customerId, $showtimeId, $code, $total, $now, $now); if (!$stmt->execute()) throw new Exception('Không thể tạo booking.'); $bookingId = (int)$stmt->insert_id; $stmt->close();
        $hasShowtimeColumn = posHasBookingShowtimeColumn($db);
        if ($hasShowtimeColumn) $seatStmt = $db->prepare('INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price) VALUES (?, ?, ?, ?)'); else $seatStmt = $db->prepare('INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (?, ?, ?)');
        foreach ($seatIds as $seatId) { $price = 0 + $ticketPrice; if ($seatInfo[$seatId]['type'] === 'VIP') $price += 20000; else if ($seatInfo[$seatId]['type'] === 'COUPLE') $price *= 2; if ($hasShowtimeColumn) { $seatStmt->bind_param('iiid', $bookingId, $showtimeId, $seatId, $price); } else { $seatStmt->bind_param('iid', $bookingId, $seatId, $price); } if (!$seatStmt->execute()) throw new Exception('Không thể giữ ghế.'); }
        $seatStmt->close();

        $cashier = posUser(); $cashierId = (int)$cashier['id']; $stmt = $db->prepare("INSERT INTO orders (booking_id, customer_id, cashier_id, order_code, channel, subtotal, discount_amount, total_amount, payment_method, amount_received, change_amount, status) VALUES (?, ?, ?, ?, 'POS', ?, 0, ?, ?, ?, ?, 'PAID')"); $stmt->bind_param('iiisddsdd', $bookingId, $customerId, $cashierId, $code, $total, $total, $paymentMethod, $amountReceived, $change); if (!$stmt->execute()) throw new Exception('Không thể lưu đơn hàng.'); $orderId = (int)$stmt->insert_id; $stmt->close();
        $itemStmt = $db->prepare('INSERT INTO order_items (order_id, item_type, item_code, item_name, quantity, unit_price, seat_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($items as $item) { $itemStmt->bind_param('isssidi', $orderId, $item['type'], $item['code'], $item['name'], $item['quantity'], $item['price'], $item['seat_id']); if (!$itemStmt->execute()) throw new Exception('Không thể lưu chi tiết đơn hàng.'); }
        $itemStmt->close(); $reference = $code; $stmt = $db->prepare('INSERT INTO payments (order_id, method, amount, reference_code) VALUES (?, ?, ?, ?)'); $stmt->bind_param('isds', $orderId, $paymentMethod, $total, $reference); if (!$stmt->execute()) throw new Exception('Không thể lưu thanh toán.'); $stmt->close();
        $db->commit(); $db->autocommit(true);
        jsonResponse(array('success' => true, 'data' => array('order_id' => $orderId, 'booking_id' => $bookingId, 'code' => $code, 'total' => $total, 'amount_received' => $amountReceived, 'change' => $change, 'payment_method' => $paymentMethod, 'items' => $items)), 201);
    } catch (Exception $exception) { $db->rollback(); $db->autocommit(true); $errorMessage = $exception->getMessage(); if (!$errorMessage) $errorMessage = 'Không thể hoàn tất giao dịch.'; jsonResponse(array('success' => false, 'message' => $errorMessage), 409); }
}

jsonResponse(array('success' => false, 'message' => "Route '{$action}' không tồn tại."), 404);
