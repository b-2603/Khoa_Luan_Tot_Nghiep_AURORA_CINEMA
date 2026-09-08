<?php

// Compatibility endpoint for WAMP installations that still run an old PHP version.
// It reads the same aurora_db used by the Laravel API and does not contain seed data.

// session_start() MUST be called before any output (including headers).
// Keep the API usable from the Vite dev server and Apache production host.
if (session_id() === '') {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], array('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'), true) ? $_SERVER['HTTP_ORIGIN'] : 'http://localhost:3000'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function aurora_response($payload, $status) {
    if (function_exists('http_response_code')) {
        http_response_code($status);
    } else {
        $messages = array(200 => 'OK', 201 => 'Created', 204 => 'No Content', 404 => 'Not Found', 409 => 'Conflict', 500 => 'Internal Server Error');
        header('HTTP/1.1 '.$status.' '.(isset($messages[$status]) ? $messages[$status] : 'Error'));
    }
    echo json_encode($payload);
    exit;
}

function aurora_method($method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) aurora_response(array('message' => 'Method Not Allowed'), 405);
}

function aurora_body() {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    return is_array($body) ? $body : array();
}

function aurora_user_id() {
    return isset($_SESSION['aurora_user_id']) ? (int) $_SESSION['aurora_user_id'] : 0;
}

function aurora_require_user() {
    $id = aurora_user_id();
    if (!$id) aurora_response(array('message' => 'Vui lòng đăng nhập.'), 401);
    return $id;
}

function aurora_valid_date($value) {
    if (!is_string($value) || !preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $value)) return false;
    $parts = explode('-', $value);
    return checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0]);
}

function aurora_db() {
    $db = new mysqli('127.0.0.1', 'root', '', 'aurora_db', 3306);
    if ($db->connect_errno) aurora_response(array('message' => 'Không thể kết nối MySQL aurora_db.'), 500);
    // The WAMP MySQL server uses the legacy utf8 database charset.
    $db->set_charset('utf8');
    return $db;
}

function aurora_route() {
    $path = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
    if (!$path && isset($_SERVER['REQUEST_URI'])) {
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $marker = strpos($path, 'api.php');
        $path = $marker === false ? '' : substr($path, $marker + 7);
    }
    return trim($path, '/');
}

$db = aurora_db();
$parts = explode('/', aurora_route());
$resource = isset($parts[0]) && $parts[0] !== '' ? $parts[0] : (isset($_GET['action']) ? $_GET['action'] : '');

if ($resource === 'health') {
    $db->query('SELECT 1');
    aurora_response(array('status' => 'ok', 'service' => 'aurora-customer-api', 'database' => $db->errno ? 'error' : 'ok'), 200);
}

if ($resource === 'movies') {
    $status = isset($_GET['status']) ? strtoupper(trim((string)$_GET['status'])) : '';
    $allowedStatuses = array('COMING_SOON', 'NOW_SHOWING', 'SPECIAL_SHOWING', 'ENDED');
    $sql = 'SELECT id, title, description, duration_minutes, age_rating, format, poster_url, trailer_url, status, release_date FROM movies';
    if (in_array($status, $allowedStatuses, true)) $sql .= " WHERE status = '" . $db->real_escape_string($status) . "'";
    $sql .= ' ORDER BY release_date IS NULL, release_date, title';
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $movies = array();
    while ($row = $result->fetch_assoc()) {
        $movies[] = array('id' => (int) $row['id'], 'title' => $row['title'], 'description' => $row['description'],
            'durationMinutes' => (int) $row['duration_minutes'], 'ageRating' => $row['age_rating'], 'format' => $row['format'],
            'posterUrl' => $row['poster_url'], 'trailerUrl' => $row['trailer_url'], 'status' => $row['status'], 'releaseDate' => $row['release_date']);
    }
    aurora_response(array('movies' => $movies), 200);
}

if ($resource === 'movie') {
    $movieId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $stmt = $db->prepare('SELECT id, title, description, duration_minutes, age_rating, format, poster_url, trailer_url, status, release_date FROM movies WHERE id = ?');
    $stmt->bind_param('i', $movieId); $stmt->execute();
    $stmt->bind_result($id, $title, $description, $duration, $rating, $format, $poster, $trailer, $status, $releaseDate);
    if (!$stmt->fetch()) { $stmt->close(); aurora_response(array('message' => 'Không tìm thấy phim.'), 404); }
    $stmt->close();
    aurora_response(array('movie' => array('id'=>(int)$id, 'title'=>$title, 'description'=>$description, 'durationMinutes'=>(int)$duration, 'ageRating'=>$rating, 'format'=>$format, 'posterUrl'=>$poster, 'trailerUrl'=>$trailer, 'status'=>$status, 'releaseDate'=>$releaseDate)), 200);
}

if ($resource === 'theaters') {
    $result = $db->query('SELECT id, name, address, city FROM theaters ORDER BY name');
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $theaters = array();
    while ($row = $result->fetch_assoc()) {
        $theaters[] = array('id' => (int) $row['id'], 'name' => $row['name'], 'address' => $row['address'], 'city' => $row['city'], 'screens' => array());
    }
    $screens = $db->query('SELECT id, theater_id, name, total_seats FROM screens ORDER BY name');
    if ($screens) while ($screen = $screens->fetch_assoc()) {
        foreach ($theaters as &$theater) if ($theater['id'] === (int) $screen['theater_id']) $theater['screens'][] = array('id' => (int) $screen['id'], 'name' => $screen['name'], 'total_seats' => (int) $screen['total_seats']);
        unset($theater);
    }
    aurora_response(array('theaters' => $theaters), 200);
}

if ($resource === 'showtimes') {
    $theaterId = isset($_GET['theater_id']) ? (int) $_GET['theater_id'] : 0;
    $date = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
    if ($date !== '' && !aurora_valid_date($date)) aurora_response(array('message' => 'Ngày chiếu không hợp lệ.'), 422);
    $movieId = isset($_GET['movie_id']) ? (int)$_GET['movie_id'] : 0;
    $where = $theaterId ? ' AND s.theater_id = '.$theaterId : '';
    if ($date !== '') $where .= " AND DATE(st.starts_at) = '".$db->real_escape_string($date)."'";
    if ($movieId > 0) $where .= ' AND st.movie_id = '.$movieId;
    $sql = "SELECT st.id, st.movie_id, s.theater_id, st.screen_id, s.name AS screen_name, m.title AS movie_title, st.starts_at, st.ends_at, st.ticket_price, st.status FROM showtimes st INNER JOIN screens s ON s.id = st.screen_id INNER JOIN movies m ON m.id = st.movie_id WHERE st.status = 'OPEN'".$where." ORDER BY st.starts_at";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $showtimes = array();
    while ($row = $result->fetch_assoc()) { $row['id'] = (int) $row['id']; $row['movie_id'] = (int) $row['movie_id']; $row['theater_id'] = (int) $row['theater_id']; $row['screen_id'] = (int) $row['screen_id']; $showtimes[] = $row; }
    aurora_response(array('showtimes' => $showtimes), 200);
}

if ($resource === 'showtime_seats') {
    $showtimeId = isset($_GET['showtime_id']) ? (int)$_GET['showtime_id'] : 0;
    if ($showtimeId < 1) aurora_response(array('message' => 'Suất chiếu không hợp lệ.'), 422);
    $stmt = $db->prepare("SELECT screen_id FROM showtimes WHERE id = ? AND status = 'OPEN'");
    $stmt->bind_param('i', $showtimeId); $stmt->execute(); $screenId = null; $stmt->bind_result($screenId);
    if (!$stmt->fetch()) { $stmt->close(); aurora_response(array('message' => 'Suất chiếu không tồn tại hoặc đã đóng.'), 404); }
    $stmt->close();
    $sql = "SELECT seats.id, seats.seat_row, seats.seat_number, seats.seat_type,
            CASE WHEN COUNT(b.id) > 0 THEN 0 ELSE 1 END AS is_available
            FROM seats
            LEFT JOIN booking_seats bs ON bs.seat_id = seats.id
            LEFT JOIN bookings b ON b.id = bs.booking_id AND b.showtime_id = ".(int)$showtimeId." AND b.status NOT IN ('CANCELLED','EXPIRED')
            WHERE seats.screen_id = ".(int)$screenId."
            GROUP BY seats.id, seats.seat_row, seats.seat_number, seats.seat_type
            ORDER BY seats.seat_row, seats.seat_number";
    $stmt = $db->query($sql);
    if (!$stmt) aurora_response(array('message' => 'Không thể tải sơ đồ ghế.'), 500);
    $seats = array();
    while ($seat = $stmt->fetch_assoc()) $seats[] = array('id'=>(int)$seat['id'], 'seat_row'=>$seat['seat_row'], 'seat_number'=>(int)$seat['seat_number'], 'seat_type'=>$seat['seat_type'], 'is_available'=>(int)$seat['is_available']);
    $stmt->free(); aurora_response(array('showtime_id'=>$showtimeId, 'seats'=>$seats), 200);
}

// ── Session helpers ───────────────────────────────────────────────────────────

// PHP 5.2 compatible password hashing (bcrypt via crypt())
function aurora_password_hash($password) {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./';
    $salt = '';
    for ($i = 0; $i < 22; $i++) {
        $salt .= $chars[mt_rand(0, 63)];
    }
    return crypt($password, '$2y$10$' . $salt);
}

function aurora_password_verify($password, $hash) {
    return crypt($password, $hash) === $hash;
}

function aurora_public_user($db, $id) {
    $stmt = $db->prepare('SELECT id, full_name, email, membership_level, points FROM users WHERE id = ?');
    if (!$stmt) return null;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $uid = null; $fullName = null; $email = null; $membershipLevel = null; $points = null;
    $stmt->bind_result($uid, $fullName, $email, $membershipLevel, $points);
    $found = $stmt->fetch();
    $stmt->close();
    if (!$found) return null;
    return array(
        'id'              => (int) $uid,
        'fullName'        => $fullName,
        'email'           => $email,
        'membershipLevel' => $membershipLevel,
        'points'          => (int) $points,
    );
}

// ── /me ───────────────────────────────────────────────────────────────────────
if ($resource === 'me') {
    $userId = isset($_SESSION['aurora_user_id']) ? (int) $_SESSION['aurora_user_id'] : null;
    aurora_response(array('user' => $userId ? aurora_public_user($db, $userId) : null), 200);
}

// ── /logout ───────────────────────────────────────────────────────────────────
if ($resource === 'logout') {
    $_SESSION = array();
    session_destroy();
    aurora_response(array('user' => null), 200);
}

// ── /register ─────────────────────────────────────────────────────────────────
if ($resource === 'register') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        aurora_response(array('message' => 'Method Not Allowed'), 405);
    }
    $body     = json_decode(file_get_contents('php://input'), true);
    $fullName = isset($body['fullName']) ? trim((string) $body['fullName']) : '';
    $email    = isset($body['email'])    ? strtolower(trim((string) $body['email'])) : '';
    $password = isset($body['password']) ? (string) $body['password'] : '';

    if ($fullName === '' || $email === '' || $password === '') {
        aurora_response(array('message' => 'Vui lòng nhập đầy đủ thông tin bắt buộc.'), 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        aurora_response(array('message' => 'Email không đúng định dạng.'), 422);
    }
    if (strlen($password) < 6) {
        aurora_response(array('message' => 'Mật khẩu cần ít nhất 6 ký tự.'), 422);
    }

    // Check duplicate email (PHP 5.2 compatible: bind_result + fetch)
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $existId = null;
    $stmt->bind_result($existId);
    $exists = $stmt->fetch();
    $stmt->close();
    if ($exists) {
        aurora_response(array('message' => 'Email đã được sử dụng.'), 422);
    }

    $hash = aurora_password_hash($password);
    $now  = date('Y-m-d H:i:s');
    $stmt = $db->prepare('INSERT INTO users (full_name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('sssss', $fullName, $email, $hash, $now, $now);
    if (!$stmt->execute()) {
        $stmt->close();
        aurora_response(array('message' => 'Không thể tạo tài khoản: ' . $db->error), 500);
    }
    $newId = (int) $stmt->insert_id;
    $stmt->close();

    session_regenerate_id(true);
    $_SESSION['aurora_user_id'] = $newId;
    aurora_response(array('user' => aurora_public_user($db, $newId)), 201);
}

// ── /login ────────────────────────────────────────────────────────────────────
if ($resource === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        aurora_response(array('message' => 'Method Not Allowed'), 405);
    }
    $body     = json_decode(file_get_contents('php://input'), true);
    $email    = isset($body['email'])    ? strtolower(trim((string) $body['email'])) : '';
    $password = isset($body['password']) ? (string) $body['password'] : '';

    if ($email === '' || $password === '') {
        aurora_response(array('message' => 'Vui lòng nhập email và mật khẩu.'), 422);
    }

    // PHP 5.2 compatible: bind_result + fetch
    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE email = ?');
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $rowId = null; $rowHash = null;
    $stmt->bind_result($rowId, $rowHash);
    $found = $stmt->fetch();
    $stmt->close();

    if (!$found || !aurora_password_verify($password, $rowHash)) {
        aurora_response(array('message' => 'Email hoặc mật khẩu không đúng.'), 401);
    }

    $userId = (int) $rowId;
    session_regenerate_id(true);
    $_SESSION['aurora_user_id'] = $userId;
    aurora_response(array('user' => aurora_public_user($db, $userId)), 200);
}

// ── /bookings (POST) ─────────────────────────────────────────────────────────
if ($resource === 'bookings') {
    aurora_method('POST');
    $userId = aurora_require_user();
    $body = aurora_body();
    $showtimeId = isset($body['showtimeId']) ? (int)$body['showtimeId'] : 0;
    $seatIds = isset($body['seatIds']) && is_array($body['seatIds']) ? array_values(array_unique(array_map('intval', $body['seatIds']))) : array();
    $validSeatIds = array();
    foreach ($seatIds as $seatIdValue) if ($seatIdValue > 0) $validSeatIds[] = $seatIdValue;
    $seatIds = $validSeatIds;
    if ($showtimeId < 1 || count($seatIds) < 1 || count($seatIds) > 12) {
        aurora_response(array('message' => 'Vui lòng chọn suất chiếu và từ 1 đến 12 ghế.'), 422);
    }

    $db->autocommit(false);
    try {
        $stmt = $db->prepare("SELECT st.screen_id, st.ticket_price, st.status, st.starts_at FROM showtimes st WHERE st.id = ? FOR UPDATE");
        $stmt->bind_param('i', $showtimeId); $stmt->execute();
        $screenId = null; $ticketPrice = null; $showtimeStatus = null; $startsAt = null; $found = $stmt->bind_result($screenId, $ticketPrice, $showtimeStatus, $startsAt) && $stmt->fetch(); $stmt->close();
        if (!$found || $showtimeStatus !== 'OPEN') throw new Exception('Suất chiếu không tồn tại hoặc đã đóng.');
        if (strtotime($startsAt) < time()) throw new Exception('Suất chiếu đã bắt đầu, không thể đặt vé.');

        $seatSql = 'SELECT id, seat_type FROM seats WHERE screen_id = ? AND id IN (' . implode(',', array_fill(0, count($seatIds), '?')) . ') FOR UPDATE';
        $seatTypes = str_repeat('i', count($seatIds) + 1);
        $seatParams = array_merge(array($screenId), $seatIds);
        $stmt = $db->prepare($seatSql);
        $refs = array($seatTypes); foreach ($seatParams as $key => $value) $refs[] = &$seatParams[$key];
        call_user_func_array(array($stmt, 'bind_param'), $refs);
        $stmt->execute(); $stmt->bind_result($seatId, $seatType); $validSeats = array();
        while ($stmt->fetch()) $validSeats[] = (int)$seatId;
        $stmt->close();
        sort($validSeats); $expectedSeats = $seatIds; sort($expectedSeats);
        if ($validSeats !== $expectedSeats) throw new Exception('Ghế đã chọn không thuộc phòng chiếu này.');

        $takenSql = "SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id = bs.booking_id WHERE b.showtime_id = ? AND bs.seat_id IN (" . implode(',', array_fill(0, count($seatIds), '?')) . ") AND b.status NOT IN ('CANCELLED','EXPIRED')";
        $stmt = $db->prepare($takenSql);
        $refs = array(str_repeat('i', count($seatIds) + 1), $showtimeId); foreach ($seatIds as $key => $value) $refs[] = &$seatIds[$key];
        call_user_func_array(array($stmt, 'bind_param'), $refs);
        $stmt->execute(); $taken = 0; $stmt->bind_result($taken); $stmt->fetch(); $stmt->close();
        if ((int)$taken > 0) throw new Exception('Một hoặc nhiều ghế vừa được đặt bởi khách khác.');

        $code = 'AUR-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 10));
        $total = (float)$ticketPrice * count($seatIds); $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare("INSERT INTO bookings (user_id, showtime_id, booking_code, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PENDING', ?, ?)");
        $stmt->bind_param('iisdss', $userId, $showtimeId, $code, $total, $now, $now); $stmt->execute(); $bookingId = (int)$stmt->insert_id; $stmt->close();
        $stmt = $db->prepare('INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price) VALUES (?, ?, ?, ?)');
        if ($stmt) {
            foreach ($seatIds as $seatId) { $price = (float)$ticketPrice; $stmt->bind_param('iiid', $bookingId, $showtimeId, $seatId, $price); $stmt->execute(); }
        } else {
            $stmt = $db->prepare('INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (?, ?, ?)');
            foreach ($seatIds as $seatId) { $price = (float)$ticketPrice; $stmt->bind_param('iid', $bookingId, $seatId, $price); $stmt->execute(); }
        }
        $stmt->close(); $db->commit();
        $db->autocommit(true);
        aurora_response(array('booking' => array('id'=>$bookingId, 'code'=>$code, 'showtimeId'=>$showtimeId, 'seatIds'=>$seatIds, 'totalAmount'=>$total, 'status'=>'PENDING')), 201);
    } catch (Exception $exception) {
        $db->rollback();
        $db->autocommit(true);
        $message = $exception->getMessage();
        if (!$message) $message = 'Không thể tạo đặt vé.';
        aurora_response(array('message' => $message), 409);
    }
}

// ── /profile (GET) ────────────────────────────────────────────────────────────
if ($resource === 'profile') {
    $userId = isset($_SESSION['aurora_user_id']) ? (int) $_SESSION['aurora_user_id'] : null;
    if (!$userId) aurora_response(array('message' => 'Vui lòng đăng nhập.'), 401);

    $stmt = $db->prepare('SELECT id, full_name, email, phone, id_number, birthday, gender, city, district, address, membership_level, points, created_at FROM users WHERE id = ?');
    if (!$stmt) {
        // Columns might not exist yet — fall back to basic fields
        $stmt2 = $db->prepare('SELECT id, full_name, email, membership_level, points, created_at FROM users WHERE id = ?');
        $stmt2->bind_param('i', $userId);
        $stmt2->execute();
        $uid = null; $fullName = null; $email = null; $ml = null; $pts = null; $ca = null;
        $stmt2->bind_result($uid, $fullName, $email, $ml, $pts, $ca);
        $stmt2->fetch();
        $stmt2->close();
        aurora_response(array('profile' => array(
            'id' => (int)$uid, 'fullName' => $fullName, 'email' => $email,
            'phone' => null, 'idNumber' => null, 'birthday' => null,
            'gender' => null, 'city' => null, 'district' => null, 'address' => null,
            'membershipLevel' => $ml, 'points' => (int)$pts, 'createdAt' => $ca,
        )), 200);
    }
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $uid = null; $fullName = null; $email = null; $phone = null; $idNumber = null;
    $birthday = null; $gender = null; $city = null; $district = null; $address = null;
    $membershipLevel = null; $points = null; $createdAt = null;
    $stmt->bind_result($uid, $fullName, $email, $phone, $idNumber, $birthday, $gender, $city, $district, $address, $membershipLevel, $points, $createdAt);
    $found = $stmt->fetch();
    $stmt->close();
    if (!$found) aurora_response(array('message' => 'Tài khoản không tồn tại.'), 404);

    aurora_response(array('profile' => array(
        'id' => (int) $uid, 'fullName' => $fullName, 'email' => $email,
        'phone' => $phone, 'idNumber' => $idNumber, 'birthday' => $birthday,
        'gender' => $gender, 'city' => $city, 'district' => $district,
        'address' => $address, 'membershipLevel' => $membershipLevel,
        'points' => (int) $points, 'createdAt' => $createdAt,
    )), 200);
}

// ── /profile_update (POST) ────────────────────────────────────────────────────
if ($resource === 'profile_update') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') aurora_response(array('message' => 'Method Not Allowed'), 405);
    $userId = isset($_SESSION['aurora_user_id']) ? (int) $_SESSION['aurora_user_id'] : null;
    if (!$userId) aurora_response(array('message' => 'Vui lòng đăng nhập.'), 401);

    $body     = json_decode(file_get_contents('php://input'), true);
    $fullName = isset($body['fullName']) ? trim((string) $body['fullName']) : '';
    $phone    = isset($body['phone'])    ? trim((string) $body['phone'])    : '';
    $idNumber = isset($body['idNumber']) ? trim((string) $body['idNumber']) : '';
    $birthday = isset($body['birthday']) ? trim((string) $body['birthday']) : '';
    $gender   = isset($body['gender'])   ? trim((string) $body['gender'])   : '';
    $city     = isset($body['city'])     ? trim((string) $body['city'])     : '';
    $district = isset($body['district']) ? trim((string) $body['district']) : '';
    $address  = isset($body['address'])  ? trim((string) $body['address'])  : '';

    if ($fullName === '') aurora_response(array('message' => 'Họ tên không được để trống.'), 422);
    if ($gender !== '' && !in_array($gender, array('male', 'female', 'other'))) $gender = '';

    $now         = date('Y-m-d H:i:s');
    $genderVal   = $gender   !== '' ? $gender   : null;
    $birthdayVal = $birthday !== '' ? $birthday : null;
    $phoneVal    = $phone    !== '' ? $phone    : null;
    $idNumberVal = $idNumber !== '' ? $idNumber : null;
    $cityVal     = $city     !== '' ? $city     : null;
    $districtVal = $district !== '' ? $district : null;
    $addressVal  = $address  !== '' ? $address  : null;

    // Try to update extended fields; fall back to name only if columns missing
    $stmt = $db->prepare('UPDATE users SET full_name=?, phone=?, id_number=?, birthday=?, gender=?, city=?, district=?, address=?, updated_at=? WHERE id=?');
    if (!$stmt) {
        $stmt2 = $db->prepare('UPDATE users SET full_name=?, updated_at=? WHERE id=?');
        $stmt2->bind_param('ssi', $fullName, $now, $userId);
        $stmt2->execute();
        $stmt2->close();
        aurora_response(array('message' => 'Cập nhật thành công.', 'user' => aurora_public_user($db, $userId)), 200);
    }
    $stmt->bind_param('sssssssssi', $fullName, $phoneVal, $idNumberVal, $birthdayVal, $genderVal, $cityVal, $districtVal, $addressVal, $now, $userId);
    if (!$stmt->execute()) {
        $stmt->close();
        aurora_response(array('message' => 'Không thể cập nhật: ' . $db->error), 500);
    }
    $stmt->close();
    aurora_response(array('message' => 'Cập nhật thành công.', 'user' => aurora_public_user($db, $userId)), 200);
}

// ── /change_password (POST) ───────────────────────────────────────────────────
if ($resource === 'change_password') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') aurora_response(array('message' => 'Method Not Allowed'), 405);
    $userId = isset($_SESSION['aurora_user_id']) ? (int) $_SESSION['aurora_user_id'] : null;
    if (!$userId) aurora_response(array('message' => 'Vui lòng đăng nhập.'), 401);

    $body        = json_decode(file_get_contents('php://input'), true);
    $currentPass = isset($body['currentPassword']) ? (string) $body['currentPassword'] : '';
    $newPass     = isset($body['newPassword'])     ? (string) $body['newPassword']     : '';

    if ($currentPass === '' || $newPass === '') aurora_response(array('message' => 'Vui lòng nhập đầy đủ mật khẩu.'), 422);
    if (strlen($newPass) < 6) aurora_response(array('message' => 'Mật khẩu mới cần ít nhất 6 ký tự.'), 422);

    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $hash = null;
    $stmt->bind_result($hash);
    $stmt->fetch();
    $stmt->close();

    if (!aurora_password_verify($currentPass, $hash)) {
        aurora_response(array('message' => 'Mật khẩu hiện tại không đúng.'), 401);
    }

    $newHash = aurora_password_hash($newPass);
    $now = date('Y-m-d H:i:s');
    $stmt = $db->prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?');
    $stmt->bind_param('ssi', $newHash, $now, $userId);
    $stmt->execute();
    $stmt->close();
    aurora_response(array('message' => 'Đổi mật khẩu thành công.'), 200);
}

// ── /booking_history (GET) ───────────────────────────────────────────────────
if ($resource === 'booking_history') {
    $userId = isset($_SESSION['aurora_user_id']) ? (int) $_SESSION['aurora_user_id'] : null;
    if (!$userId) aurora_response(array('message' => 'Vui lòng đăng nhập.'), 401);

    $sql = "SELECT b.id, b.booking_code, b.total_amount, b.status, st.starts_at,
                   m.title, t.name, sc.name,
                   GROUP_CONCAT(CONCAT(se.seat_row, se.seat_number) ORDER BY se.seat_row, se.seat_number SEPARATOR ', ') AS seats
            FROM bookings b
            INNER JOIN showtimes st ON st.id = b.showtime_id
            INNER JOIN movies m ON m.id = st.movie_id
            INNER JOIN screens sc ON sc.id = st.screen_id
            INNER JOIN theaters t ON t.id = sc.theater_id
            LEFT JOIN booking_seats bs ON bs.booking_id = b.id
            LEFT JOIN seats se ON se.id = bs.seat_id
            WHERE b.user_id = ?
            GROUP BY b.id, b.booking_code, b.total_amount, b.status, st.starts_at, m.title, t.name, sc.name
            ORDER BY st.starts_at DESC";
    $stmt = $db->prepare($sql);
    if (!$stmt) aurora_response(array('message' => 'Không thể tải lịch sử đặt vé.'), 500);
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stmt->bind_result($id, $code, $totalAmount, $status, $startsAt, $movieTitle, $theaterName, $screenName, $seats);
    $bookings = array();
    while ($stmt->fetch()) {
        $bookings[] = array(
            'id' => (int)$id, 'code' => $code, 'totalAmount' => (float)$totalAmount,
            'status' => $status, 'startsAt' => $startsAt, 'movieTitle' => $movieTitle,
            'theaterName' => $theaterName, 'screenName' => $screenName, 'seats' => $seats
        );
    }
    $stmt->close();
    aurora_response(array('bookings' => $bookings), 200);
}

aurora_response(array('message' => 'API không tồn tại.'), 404);
