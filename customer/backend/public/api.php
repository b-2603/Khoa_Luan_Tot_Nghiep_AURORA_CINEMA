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
// Danh mục phim được TMS cập nhật thường xuyên; không để trình duyệt/proxy trả
// về danh sách cũ sau khi Admin Tổng vừa thêm hoặc sửa phim.
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
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

function aurora_json_list($value) {
    $decoded = json_decode((string)$value, true);
    return is_array($decoded) ? array_values($decoded) : array();
}

// All customer schedule views use Vietnam local time and a fixed seven-day
// window: today plus the next six calendar days.
function aurora_schedule_dates() {
    // Apache in the supplied WAMP stack runs PHP 5.2, so use DateTime rather
    // than DateTimeImmutable here.
    $today = new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
    $today->setTime(0, 0, 0);
    $dates = array();
    for ($offset = 0; $offset < 7; $offset++) {
        $date = clone $today;
        if ($offset > 0) $date->modify('+'.$offset.' days');
        $dates[] = $date->format('Y-m-d');
    }
    return $dates;
}

// Use one authoritative clock for customer showtime visibility. The server
// compares database timestamps against Vietnam time, never the browser clock.
function aurora_vietnam_now() {
    $now = new DateTime('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
    return $now->format('Y-m-d H:i:s');
}

// Search interactions are retained in aurora_db for reporting without
// attaching personal data to guests. A session identifier is sufficient for
// deduplication and becomes traceable to the member after they sign in.
function aurora_ensure_search_log_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS movie_search_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        movie_id BIGINT UNSIGNED NULL,
        search_query VARCHAR(120) NOT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_movie_search_created (created_at),
        KEY idx_movie_search_movie (movie_id),
        KEY idx_movie_search_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

// Customer home interactions are persisted for product analytics.  The table
// stores only the active session/member id and an allow-listed interaction;
// arbitrary browser payloads are never written directly to SQL.
function aurora_ensure_home_event_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS customer_home_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        event_type VARCHAR(30) NOT NULL,
        entity_type VARCHAR(30) NOT NULL DEFAULT '',
        entity_id BIGINT UNSIGNED NULL,
        metadata_json TEXT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_home_event_created (created_at),
        KEY idx_home_event_user (user_id, created_at),
        KEY idx_home_event_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_ensure_movie_catalog_event_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS customer_movie_catalog_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        movie_id BIGINT UNSIGNED NULL,
        event_type VARCHAR(30) NOT NULL,
        status_filter VARCHAR(30) NOT NULL DEFAULT '',
        genre_filter VARCHAR(100) NOT NULL DEFAULT '',
        search_query VARCHAR(120) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        KEY idx_catalog_event_created (created_at),
        KEY idx_catalog_event_movie (movie_id, created_at),
        KEY idx_catalog_event_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

// Seat prices are configuration data in aurora_db, not frontend constants.
// The base price always belongs to the selected showtime; these rules express
// how each physical seat category is priced from that base.
function aurora_ensure_seat_price_rules($db) {
    $created = $db->query("CREATE TABLE IF NOT EXISTS seat_price_rules (
        seat_type VARCHAR(20) NOT NULL PRIMARY KEY,
        calculation_type VARCHAR(20) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL,
        CHECK (calculation_type IN ('MULTIPLIER','SURCHARGE','FIXED'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    if (!$created) return false;
    $now = $db->real_escape_string(aurora_vietnam_now());
    // INSERT IGNORE preserves any price configured by theater management.
    return $db->query("INSERT IGNORE INTO seat_price_rules (seat_type,calculation_type,amount,is_active,updated_at) VALUES
        ('STANDARD','MULTIPLIER',1,1,'{$now}'),
        ('VIP','SURCHARGE',20000,1,'{$now}'),
        ('COUPLE','MULTIPLIER',2,1,'{$now}')");
}

function aurora_seat_price_rules($db) {
    if (!aurora_ensure_seat_price_rules($db)) return false;
    $rules = array(); $result = $db->query("SELECT seat_type, calculation_type, amount FROM seat_price_rules WHERE is_active=1");
    if (!$result) return false;
    while ($row = $result->fetch_assoc()) $rules[strtoupper($row['seat_type'])] = array('calculation_type'=>$row['calculation_type'], 'amount'=>(float)$row['amount']);
    return $rules;
}

function aurora_calculate_seat_price($seatType, $basePrice, $rules) {
    $type = strtoupper((string)$seatType); if ($type === 'DOUBLE') $type = 'COUPLE';
    $base = (float)$basePrice;
    $rule = isset($rules[$type]) ? $rules[$type] : (isset($rules['STANDARD']) ? $rules['STANDARD'] : array('calculation_type'=>'MULTIPLIER','amount'=>1));
    if ($rule['calculation_type'] === 'SURCHARGE') return $base + (float)$rule['amount'];
    if ($rule['calculation_type'] === 'FIXED') return (float)$rule['amount'];
    return $base * (float)$rule['amount'];
}

function aurora_public_seat_pricing($basePrice, $rules) {
    return array(
        'STANDARD'=>aurora_calculate_seat_price('STANDARD', $basePrice, $rules),
        'VIP'=>aurora_calculate_seat_price('VIP', $basePrice, $rules),
        'COUPLE'=>aurora_calculate_seat_price('COUPLE', $basePrice, $rules)
    );
}

// Resolve the sell price from Aurora DB's audited ticket-price matrix. A
// showtime-specific snapshot wins so a later policy edit cannot rewrite the
// price of a showtime that TMS already published. Legacy/seed showtimes use
// the active matrix row for their date and start time instead.
function aurora_showtime_seat_pricing($db, $showtimeId, $startsAt, $fallbackBase, $rules) {
    $ticketPrices = array();
    $showtimeId = (int)$showtimeId;

    $snapshot = $db->query("SELECT tt.code, stt.price
        FROM tms_showtime_ticket_types stt
        INNER JOIN ticket_types tt ON tt.id=stt.ticket_type_id
        WHERE stt.showtime_id={$showtimeId}
          AND tt.code IN ('TICKET_REGULAR','TICKET_COUPLE')");
    if ($snapshot) {
        while ($row = $snapshot->fetch_assoc()) $ticketPrices[$row['code']] = (float)$row['price'];
        $snapshot->free();
    }

    $showDate = substr((string)$startsAt, 0, 10);
    $hour = (int)substr((string)$startsAt, 11, 2);
    $timeSlot = $hour < 12 ? 'morning' : ($hour < 18 ? 'standard' : 'evening');
    $dayInfo = aurora_pricing_day_info($db, $showDate);
    $dayTypeEsc = $db->real_escape_string($dayInfo['dayType']);
    $timeSlotEsc = $db->real_escape_string($timeSlot);
    $matrix = $db->query("SELECT tt.code, pm.price
        FROM ticket_types tt
        INNER JOIN tms_ticket_price_matrix pm ON pm.ticket_type_id=tt.id
        WHERE tt.status='active' AND tt.pricing_enabled=1 AND pm.is_active=1
          AND pm.day_type='{$dayTypeEsc}' AND pm.time_slot='{$timeSlotEsc}'
          AND tt.code IN ('TICKET_REGULAR','TICKET_COUPLE')");
    if ($matrix) {
        while ($row = $matrix->fetch_assoc()) {
            if (!isset($ticketPrices[$row['code']])) $ticketPrices[$row['code']] = (float)$row['price'];
        }
        $matrix->free();
    }

    $standard = isset($ticketPrices['TICKET_REGULAR']) ? $ticketPrices['TICKET_REGULAR'] : (float)$fallbackBase;
    return array(
        'STANDARD'=>$standard,
        'VIP'=>aurora_calculate_seat_price('VIP', $standard, $rules),
        'COUPLE'=>isset($ticketPrices['TICKET_COUPLE']) ? $ticketPrices['TICKET_COUPLE'] : aurora_calculate_seat_price('COUPLE', $standard, $rules)
    );
}

function aurora_resolved_seat_price($seatType, $pricing) {
    $type = strtoupper((string)$seatType); if ($type === 'DOUBLE') $type = 'COUPLE';
    return isset($pricing[$type]) ? (float)$pricing[$type] : (float)$pricing['STANDARD'];
}

function aurora_ensure_ticket_price_view_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS customer_ticket_price_views (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        selected_date DATE NOT NULL,
        day_type VARCHAR(20) NOT NULL,
        viewed_at DATETIME NOT NULL,
        KEY idx_price_view_date (viewed_at),
        KEY idx_price_view_user (user_id),
        KEY idx_price_selected_date (selected_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_ensure_customer_schedule_events($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS customer_schedule_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        movie_id BIGINT UNSIGNED NOT NULL,
        theater_id BIGINT UNSIGNED NULL,
        showtime_id BIGINT UNSIGNED NULL,
        selected_date DATE NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_schedule_event_created (created_at),
        KEY idx_schedule_event_movie (movie_id, selected_date),
        KEY idx_schedule_event_theater (theater_id),
        KEY idx_schedule_event_showtime (showtime_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_record_schedule_event($db, $movieId, $theaterId, $showtimeId, $selectedDate, $eventType) {
    if (!aurora_ensure_customer_schedule_events($db)) return false;
    $sessionEsc = $db->real_escape_string(session_id());
    $userId = isset($_SESSION['aurora_user_id']) ? (int)$_SESSION['aurora_user_id'] : 0;
    $userSql = $userId > 0 ? (string)$userId : 'NULL';
    $theaterSql = (int)$theaterId > 0 ? (string)(int)$theaterId : 'NULL';
    $showtimeSql = (int)$showtimeId > 0 ? (string)(int)$showtimeId : 'NULL';
    $dateEsc = $db->real_escape_string($selectedDate); $eventEsc = $db->real_escape_string($eventType);
    $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    // Auto-refreshing availability must not inflate customer analytics.
    if ($eventType === 'VIEW_SCHEDULE') {
        $recentEsc = $db->real_escape_string(date('Y-m-d H:i:s', strtotime($nowEsc.' -10 minutes')));
        $recent = $db->query("SELECT id FROM customer_schedule_events WHERE session_key='{$sessionEsc}' AND movie_id=".(int)$movieId." AND selected_date='{$dateEsc}' AND event_type='VIEW_SCHEDULE' AND created_at >= '{$recentEsc}' LIMIT 1");
        if ($recent && $recent->num_rows) return true;
    }
    return $db->query("INSERT INTO customer_schedule_events (session_key,user_id,movie_id,theater_id,showtime_id,selected_date,event_type,created_at) VALUES ('{$sessionEsc}',{$userSql},".(int)$movieId.",{$theaterSql},{$showtimeSql},'{$dateEsc}','{$eventEsc}','{$nowEsc}')");
}

function aurora_ensure_theater_schedule_event_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS customer_theater_schedule_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        theater_id BIGINT UNSIGNED NOT NULL,
        showtime_id BIGINT UNSIGNED NULL,
        selected_date DATE NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_theater_schedule_created (created_at),
        KEY idx_theater_schedule_theater (theater_id, selected_date),
        KEY idx_theater_schedule_showtime (showtime_id),
        KEY idx_theater_schedule_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_ensure_theater_detail_event_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS customer_theater_detail_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        theater_id BIGINT UNSIGNED NOT NULL,
        showtime_id BIGINT UNSIGNED NULL,
        selected_date DATE NOT NULL,
        event_type VARCHAR(30) NOT NULL,
        created_at DATETIME NOT NULL,
        KEY idx_theater_detail_created (created_at),
        KEY idx_theater_detail_theater (theater_id, selected_date),
        KEY idx_theater_detail_showtime (showtime_id),
        KEY idx_theater_detail_user (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_pricing_day_info($db, $date) {
    $dateEsc = $db->real_escape_string($date);
    $holidayName = '';
    $holiday = $db->query("SELECT holiday_name FROM tms_holiday_dates WHERE holiday_date='{$dateEsc}' AND is_active=1 LIMIT 1");
    if ($holiday && ($row = $holiday->fetch_assoc())) $holidayName = $row['holiday_name'];
    $weekdayNumber = (int)date('N', strtotime($date));
    $dayType = $holidayName !== '' ? 'holiday' : ($weekdayNumber >= 6 ? 'weekend' : 'weekday');
    return array('dayType'=>$dayType, 'holidayName'=>$holidayName, 'isHoliday'=>$holidayName !== '');
}

// The database stores the classification code only. Older records may contain
// a descriptive string (for example "T13 - Từ 13 tuổi"), so normalize it at
// the API boundary before it reaches every customer screen.
function aurora_age_rating($value) {
    $rating = strtoupper(trim((string)$value));
    if (preg_match('/T(?:13|16|18)/', $rating, $matches)) return $matches[0];
    if (strpos($rating, 'K') === 0) return 'K';
    if (strpos($rating, 'P') === 0) return 'P';
    return 'P';
}

function aurora_db() {
    $db = new mysqli('127.0.0.1', 'root', '', 'aurora_db', 3306);
    if ($db->connect_errno) aurora_response(array('message' => 'Không thể kết nối MySQL aurora_db.'), 500);
    // The WAMP MySQL server uses the legacy utf8 database charset.
    $db->set_charset('utf8');
    return $db;
}

function aurora_ensure_sales_orders($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_code VARCHAR(30) NOT NULL UNIQUE,
        channel VARCHAR(10) NOT NULL,
        booking_id BIGINT UNSIGNED NULL,
        customer_id BIGINT UNSIGNED NULL,
        cashier_id INT UNSIGNED NOT NULL DEFAULT 0,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
        status VARCHAR(20) NOT NULL DEFAULT 'PAID',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orders_channel (channel),
        INDEX idx_orders_created (created_at),
        INDEX idx_orders_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_concession_catalog($db) {
    $catalog = array();
    $result = $db->query("SELECT sku, name, price, category FROM products WHERE status='active' AND stock_quantity > 0 ORDER BY name");
    if ($result) while ($row = $result->fetch_assoc()) {
        $catalog[$row['sku']] = array('name' => $row['name'], 'price' => (float)$row['price'], 'description' => $row['category']);
    }
    return $catalog;
}

function aurora_ensure_vouchers($db) {
    return $db->query('SELECT 1 FROM vouchers LIMIT 1') !== false;
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
    $catalogNow = $db->real_escape_string(aurora_vietnam_now());
    $sql = "SELECT m.id, m.title, m.description, m.duration_minutes, m.age_rating, m.format,
                   m.genre, m.poster_url, m.banner_url, m.trailer_url, m.status, m.release_date, m.is_hot,
                   (SELECT COUNT(*) FROM showtimes st WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at > '{$catalogNow}') AS upcoming_showtime_count,
                   (SELECT MIN(st.starts_at) FROM showtimes st WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at > '{$catalogNow}') AS next_showtime,
                   (SELECT MIN(st.ticket_price) FROM showtimes st WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at > '{$catalogNow}') AS min_ticket_price,
                   (SELECT COUNT(DISTINCT s.theater_id) FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at > '{$catalogNow}') AS theater_count
            FROM movies m";
    if (in_array($status, $allowedStatuses, true)) $sql .= " WHERE UPPER(m.status) = '" . $db->real_escape_string($status) . "'";
    $sql .= ' ORDER BY m.is_hot DESC, m.release_date IS NULL, m.release_date, m.title';
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $movies = array();
    while ($row = $result->fetch_assoc()) {
        $movies[] = array(
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'durationMinutes' => (int) $row['duration_minutes'],
            'ageRating' => aurora_age_rating($row['age_rating']),
            'format' => $row['format'],
            'genre' => isset($row['genre']) ? $row['genre'] : '',
            'posterUrl' => $row['poster_url'],
            'bannerUrl' => $row['banner_url'],
            'trailerUrl' => $row['trailer_url'],
            // TMS dùng mã lowercase, các màn hình Customer dùng UPPERCASE.
            // Chuẩn hóa ở API để cả dữ liệu cũ và phim mới đều xuất hiện đúng tab.
            'status' => strtoupper(trim((string)$row['status'])),
            'releaseDate' => $row['release_date'],
            'isHot' => isset($row['is_hot']) ? (bool)$row['is_hot'] : true,
            'upcomingShowtimeCount' => (int)$row['upcoming_showtime_count'],
            'nextShowtime' => $row['next_showtime'],
            'minTicketPrice' => $row['min_ticket_price'] !== null ? (float)$row['min_ticket_price'] : null,
            'theaterCount' => (int)$row['theater_count']
        );
    }
    aurora_response(array('serverTime'=>$catalogNow, 'movies' => $movies), 200);
}

// Deliberate catalogue interactions are persisted for customer analytics.
if ($resource === 'movie_catalog_event') {
    aurora_method('POST'); $body=aurora_body();
    $eventType=isset($body['eventType']) ? strtoupper(trim((string)$body['eventType'])) : '';
    $movieId=isset($body['movieId']) ? (int)$body['movieId'] : 0;
    $statusFilter=isset($body['statusFilter']) ? strtoupper(trim((string)$body['statusFilter'])) : '';
    $genreFilter=isset($body['genreFilter']) ? trim((string)$body['genreFilter']) : '';
    $searchQuery=isset($body['searchQuery']) ? trim((string)$body['searchQuery']) : '';
    $allowedEvents=array('CHANGE_TAB','FILTER_GENRE','SEARCH','VIEW_MOVIE','PLAY_TRAILER','START_BOOKING');
    $allowedStatuses=array('','COMING_SOON','NOW_SHOWING','SPECIAL_SHOWING');
    if (!in_array($eventType,$allowedEvents,true) || !in_array($statusFilter,$allowedStatuses,true)) aurora_response(array('message'=>'Sự kiện danh mục phim không hợp lệ.'),422);
    if (strlen($genreFilter)>100) $genreFilter=substr($genreFilter,0,100);
    if (strlen($searchQuery)>120) $searchQuery=substr($searchQuery,0,120);
    if (in_array($eventType,array('VIEW_MOVIE','PLAY_TRAILER','START_BOOKING'),true)) {
        if ($movieId < 1) aurora_response(array('message'=>'Phim không hợp lệ.'),422);
        $movie=$db->query("SELECT id FROM movies WHERE id={$movieId} LIMIT 1");
        if (!$movie || !$movie->num_rows) aurora_response(array('message'=>'Phim không tồn tại.'),404);
    }
    if ($eventType === 'SEARCH' && strlen($searchQuery)<2) aurora_response(array('message'=>'Từ khóa tìm kiếm quá ngắn.'),422);
    if (!aurora_ensure_movie_catalog_event_schema($db)) aurora_response(array('message'=>'Không thể khởi tạo nhật ký danh mục phim.'),500);
    $sessionEsc=$db->real_escape_string(session_id()); $userId=aurora_user_id();
    $userSql=$userId>0?(string)$userId:'NULL'; $movieSql=$movieId>0?(string)$movieId:'NULL';
    $eventEsc=$db->real_escape_string($eventType); $statusEsc=$db->real_escape_string($statusFilter);
    $genreEsc=$db->real_escape_string($genreFilter); $searchEsc=$db->real_escape_string($searchQuery);
    $nowEsc=$db->real_escape_string(aurora_vietnam_now());
    if (!$db->query("INSERT INTO customer_movie_catalog_events (session_key,user_id,movie_id,event_type,status_filter,genre_filter,search_query,created_at) VALUES ('{$sessionEsc}',{$userSql},{$movieSql},'{$eventEsc}','{$statusEsc}','{$genreEsc}','{$searchEsc}','{$nowEsc}')")) aurora_response(array('message'=>'Không thể ghi nhận thao tác danh mục phim.'),500);
    aurora_response(array('recorded'=>true,'id'=>(int)$db->insert_id),201);
}

// ── /ticket_prices (GET) ────────────────────────────────────────────────────
// Public ticket prices come from the same TMS price matrix used by operations.
// Each view is recorded for customer-demand reporting in aurora_db.
if ($resource === 'ticket_prices') {
    $scheduleDates = aurora_schedule_dates();
    $selectedDate = isset($_GET['date']) ? trim((string)$_GET['date']) : $scheduleDates[0];
    if (!aurora_valid_date($selectedDate) || !in_array($selectedDate, $scheduleDates, true)) {
        aurora_response(array('message'=>'Ngày xem giá phải nằm trong 7 ngày hiện tại.'), 422);
    }
    $dayInfo = aurora_pricing_day_info($db, $selectedDate);
    $dayTypeEsc = $db->real_escape_string($dayInfo['dayType']);
    $sql = "SELECT tt.id, tt.name, tt.code, tt.description, tt.price AS base_price,
                   pm.time_slot, pm.price
            FROM ticket_types tt
            INNER JOIN tms_ticket_price_matrix pm ON pm.ticket_type_id=tt.id
            WHERE tt.status='active' AND tt.pricing_enabled=1 AND pm.is_active=1
              AND pm.day_type='{$dayTypeEsc}'
              AND tt.code IN ('TICKET_REGULAR','TICKET_CHILD','TICKET_STUDENT','TICKET_COUPLE')
            ORDER BY FIELD(tt.code,'TICKET_REGULAR','TICKET_CHILD','TICKET_STUDENT','TICKET_COUPLE'),
                     FIELD(pm.time_slot,'morning','standard','evening')";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message'=>'Không thể tải bảng giá: '.$db->error), 500);
    $ticketTypes = array(); $ticketOrder = array();
    while ($row = $result->fetch_assoc()) {
        $id = (int)$row['id'];
        if (!isset($ticketTypes[$id])) {
            $ticketTypes[$id] = array('id'=>$id, 'name'=>$row['name'], 'code'=>$row['code'], 'description'=>$row['description'], 'basePrice'=>(float)$row['base_price'], 'prices'=>array());
            $ticketOrder[] = $id;
        }
        $ticketTypes[$id]['prices'][$row['time_slot']] = (float)$row['price'];
    }
    $publicTickets = array(); foreach ($ticketOrder as $ticketId) $publicTickets[] = $ticketTypes[$ticketId];
    $dates = array();
    foreach ($scheduleDates as $dateValue) {
        $info = aurora_pricing_day_info($db, $dateValue);
        $dates[] = array('date'=>$dateValue, 'dayType'=>$info['dayType'], 'isHoliday'=>$info['isHoliday'], 'holidayName'=>$info['holidayName']);
    }
    if (!aurora_ensure_ticket_price_view_schema($db)) aurora_response(array('message'=>'Không thể khởi tạo thống kê bảng giá.'), 500);
    $sessionEsc = $db->real_escape_string(session_id()); $dateEsc = $db->real_escape_string($selectedDate);
    $userId = isset($_SESSION['aurora_user_id']) ? (int)$_SESSION['aurora_user_id'] : 0;
    $userSql = $userId > 0 ? (string)$userId : 'NULL'; $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    $db->query("INSERT INTO customer_ticket_price_views (session_key,user_id,selected_date,day_type,viewed_at) VALUES ('{$sessionEsc}',{$userSql},'{$dateEsc}','{$dayTypeEsc}','{$nowEsc}')");
    aurora_response(array(
        'selectedDate'=>$selectedDate, 'dayType'=>$dayInfo['dayType'], 'isHoliday'=>$dayInfo['isHoliday'],
        'holidayName'=>$dayInfo['holidayName'], 'dates'=>$dates, 'ticketTypes'=>$publicTickets,
        'timeSlots'=>array(
            array('key'=>'morning','start'=>'Trước 12:00'),
            array('key'=>'standard','start'=>'12:00 – trước 18:00'),
            array('key'=>'evening','start'=>'Từ 18:00')
        ),
        'updatedAt'=>$nowEsc
    ), 200);
}

// ── /movie_search (GET) ─────────────────────────────────────────────────────
// Suggestions are read directly from aurora_db. The showtime fields let the
// customer immediately see whether a currently bookable session exists.
if ($resource === 'movie_search') {
    $query = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
    if (strlen($query) < 2) aurora_response(array('movies' => array()), 200);
    if (strlen($query) > 120) $query = substr($query, 0, 120);
    $queryEsc = $db->real_escape_string($query);
    $like = "%{$queryEsc}%";
    $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    $sql = "SELECT m.id, m.title, m.description, m.duration_minutes, m.age_rating, m.format, m.genre,
                   m.poster_url, m.banner_url, m.trailer_url, m.status, m.release_date, m.is_hot,
                   COUNT(st.id) AS upcoming_showtime_count, MIN(st.starts_at) AS next_showtime
            FROM movies m
            LEFT JOIN showtimes st ON st.movie_id=m.id AND st.status='OPEN' AND st.starts_at > '{$nowEsc}'
            WHERE m.title LIKE '{$like}' OR m.genre LIKE '{$like}' OR m.description LIKE '{$like}'
            GROUP BY m.id, m.title, m.description, m.duration_minutes, m.age_rating, m.format, m.genre,
                     m.poster_url, m.banner_url, m.trailer_url, m.status, m.release_date, m.is_hot
            ORDER BY (m.title = '{$queryEsc}') DESC, upcoming_showtime_count DESC,
                     m.is_hot DESC, m.release_date DESC, m.title ASC
            LIMIT 8";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => 'Không thể tìm kiếm phim: '.$db->error), 500);
    $movies = array();
    while ($row = $result->fetch_assoc()) {
        $movies[] = array(
            'id'=>(int)$row['id'], 'title'=>$row['title'], 'description'=>$row['description'],
            'durationMinutes'=>(int)$row['duration_minutes'], 'ageRating'=>aurora_age_rating($row['age_rating']),
            'format'=>$row['format'], 'genre'=>$row['genre'], 'posterUrl'=>$row['poster_url'],
            'bannerUrl'=>$row['banner_url'], 'trailerUrl'=>$row['trailer_url'],
            'status'=>strtoupper(trim((string)$row['status'])), 'releaseDate'=>$row['release_date'],
            'isHot'=>(bool)$row['is_hot'], 'upcomingShowtimeCount'=>(int)$row['upcoming_showtime_count'],
            'nextShowtime'=>$row['next_showtime']
        );
    }
    aurora_response(array('movies'=>$movies), 200);
}

// ── /movie_search_event (POST) ──────────────────────────────────────────────
// Only the intentional action of opening a result is logged; typing in the
// suggestion field does not create noisy database rows.
if ($resource === 'movie_search_event') {
    aurora_method('POST');
    $body = aurora_body();
    $movieId = isset($body['movieId']) ? (int)$body['movieId'] : 0;
    $query = isset($body['query']) ? trim((string)$body['query']) : '';
    if ($movieId < 1 || $query === '') aurora_response(array('message'=>'Dữ liệu tìm kiếm không hợp lệ.'), 422);
    if (strlen($query) > 120) $query = substr($query, 0, 120);
    if (!aurora_ensure_search_log_schema($db)) aurora_response(array('message'=>'Không thể khởi tạo nhật ký tìm kiếm.'), 500);
    $sessionEsc = $db->real_escape_string(session_id()); $queryEsc = $db->real_escape_string($query);
    $userId = isset($_SESSION['aurora_user_id']) ? (int)$_SESSION['aurora_user_id'] : 0;
    $movie = $db->query("SELECT id FROM movies WHERE id={$movieId} LIMIT 1");
    if (!$movie || !$movie->num_rows) aurora_response(array('message'=>'Phim không tồn tại.'), 404);
    $userSql = $userId > 0 ? (string)$userId : 'NULL'; $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    if (!$db->query("INSERT INTO movie_search_logs (session_key,user_id,movie_id,search_query,created_at) VALUES ('{$sessionEsc}',{$userSql},{$movieId},'{$queryEsc}','{$nowEsc}')")) aurora_response(array('message'=>'Không thể ghi nhận lượt tìm kiếm.'), 500);
    aurora_response(array('recorded'=>true), 201);
}

// ── /home_event (POST) ─────────────────────────────────────────────────────
// Records deliberate actions from the redesigned customer home page.
if ($resource === 'home_event') {
    aurora_method('POST');
    $body = aurora_body();
    $eventType = isset($body['eventType']) ? strtoupper(trim((string)$body['eventType'])) : '';
    $entityType = isset($body['entityType']) ? strtolower(trim((string)$body['entityType'])) : '';
    $entityId = isset($body['entityId']) ? (int)$body['entityId'] : 0;
    $metadata = isset($body['metadata']) && is_array($body['metadata']) ? $body['metadata'] : array();
    $allowedEvents = array('QUICK_SEARCH', 'SELECT_SHOWTIME', 'VIEW_PROMOTION');
    $allowedEntities = array('', 'theater', 'showtime', 'promotion');
    if (!in_array($eventType, $allowedEvents, true) || !in_array($entityType, $allowedEntities, true)) {
        aurora_response(array('message'=>'Sự kiện trang chủ không hợp lệ.'), 422);
    }
    if (($eventType === 'SELECT_SHOWTIME' || $eventType === 'VIEW_PROMOTION') && $entityId < 1) {
        aurora_response(array('message'=>'Đối tượng sự kiện không hợp lệ.'), 422);
    }
    if ($entityType === 'theater' && $entityId > 0) {
        $entity = $db->query("SELECT id FROM theaters WHERE id={$entityId} LIMIT 1");
        if (!$entity || !$entity->num_rows) aurora_response(array('message'=>'Cụm rạp không tồn tại.'), 404);
    } elseif ($entityType === 'showtime' && $entityId > 0) {
        $nowEntityEsc = $db->real_escape_string(aurora_vietnam_now());
        $entity = $db->query("SELECT id FROM showtimes WHERE id={$entityId} AND status='OPEN' AND starts_at > '{$nowEntityEsc}' LIMIT 1");
        if (!$entity || !$entity->num_rows) aurora_response(array('message'=>'Suất chiếu không còn khả dụng.'), 409);
    } elseif ($entityType === 'promotion' && $entityId > 0) {
        $entity = $db->query("SELECT id FROM promotions WHERE id={$entityId} AND status='ACTIVE' AND starts_at <= NOW() AND ends_at >= NOW() LIMIT 1");
        if (!$entity || !$entity->num_rows) aurora_response(array('message'=>'Ưu đãi không còn hiệu lực.'), 409);
    }
    if (!aurora_ensure_home_event_schema($db)) aurora_response(array('message'=>'Không thể khởi tạo nhật ký trang chủ.'), 500);
    $sessionEsc = $db->real_escape_string(session_id());
    $userId = aurora_user_id();
    $userSql = $userId > 0 ? (string)$userId : 'NULL';
    $entitySql = $entityId > 0 ? (string)$entityId : 'NULL';
    $eventEsc = $db->real_escape_string($eventType);
    $entityEsc = $db->real_escape_string($entityType);
    $metadataJson = json_encode($metadata);
    if ($metadataJson === false || strlen($metadataJson) > 2000) $metadataJson = '{}';
    $metadataEsc = $db->real_escape_string($metadataJson);
    $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    $inserted = $db->query("INSERT INTO customer_home_events (session_key,user_id,event_type,entity_type,entity_id,metadata_json,created_at) VALUES ('{$sessionEsc}',{$userSql},'{$eventEsc}','{$entityEsc}',{$entitySql},'{$metadataEsc}','{$nowEsc}')");
    if (!$inserted) aurora_response(array('message'=>'Không thể ghi nhận thao tác trang chủ.'), 500);
    aurora_response(array('recorded'=>true, 'id'=>(int)$db->insert_id), 201);
}

// Promotions shown on the customer home-page banner. Only currently valid
// campaigns are exposed, so expired or disabled promotions never rotate here.
if ($resource === 'promotions') {
    $sql = "SELECT id, name, code, description, discount_percent, discount_amount, starts_at, ends_at
            FROM promotions
            WHERE status = 'ACTIVE' AND starts_at <= NOW() AND ends_at >= NOW()
            ORDER BY ends_at ASC, id DESC";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $promotions = array();
    while ($row = $result->fetch_assoc()) {
        $promotions[] = array(
            'id' => (int)$row['id'], 'name' => $row['name'], 'code' => $row['code'],
            'description' => $row['description'], 'discountPercent' => $row['discount_percent'],
            'discountAmount' => $row['discount_amount'], 'startsAt' => $row['starts_at'], 'endsAt' => $row['ends_at']
        );
    }
    aurora_response(array('promotions' => $promotions), 200);
}

if ($resource === 'concessions') {
    $items = array();
    foreach (aurora_concession_catalog($db) as $sku => $item) $items[] = array('id' => $sku, 'name' => $item['name'], 'price' => $item['price'], 'description' => $item['description']);
    aurora_response(array('concessions' => $items), 200);
}

if ($resource === 'movie') {
    $movieId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $stmt = $db->prepare('SELECT id, title, description, duration_minutes, age_rating, format, genre, poster_url, trailer_url, status, release_date, is_hot FROM movies WHERE id = ?');
    $stmt->bind_param('i', $movieId); $stmt->execute();
    $stmt->bind_result($id, $title, $description, $duration, $rating, $format, $genre, $poster, $trailer, $status, $releaseDate, $isHot);
    if (!$stmt->fetch()) { $stmt->close(); aurora_response(array('message' => 'Không tìm thấy phim.'), 404); }
    $stmt->close();
    aurora_response(array('movie' => array(
        'id' => (int)$id,
        'title' => $title,
        'description' => $description,
        'durationMinutes' => (int)$duration,
        'ageRating' => aurora_age_rating($rating),
        'format' => $format,
        'genre' => $genre,
        'posterUrl' => $poster,
        'trailerUrl' => $trailer,
        'status' => strtoupper(trim((string)$status)),
        'releaseDate' => $releaseDate,
        'isHot' => (bool)$isHot
    )), 200);
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

// Detailed, theatre-specific content for the customer "Rạp" page.
// All operational figures below are read directly from aurora_db.  The selected
// date is intentionally returned as part of the payload so the client never has
// to infer availability from decorative/sample data.
if ($resource === 'theater_detail') {
    $theaterId = isset($_GET['theater_id']) ? (int) $_GET['theater_id'] : 0;
    if ($theaterId < 1) aurora_response(array('message' => 'Rạp không hợp lệ.'), 422);
    $requestedDate = isset($_GET['date']) ? trim((string) $_GET['date']) : '';
    if ($requestedDate !== '' && !aurora_valid_date($requestedDate)) aurora_response(array('message' => 'Ngày xem lịch không hợp lệ.'), 422);

    $sql = "SELECT t.id, t.name, t.address, t.city,
        p.hero_image_url, p.short_description, p.short_description_en,
        p.description, p.description_en, p.highlights_json, p.highlights_en_json,
        p.facilities_json, p.facilities_en_json, p.opening_hours, p.contact_phone, p.map_url,
        COUNT(s.id) AS screen_count, COALESCE(SUM(s.total_seats), 0) AS total_seats
        FROM theaters t
        LEFT JOIN theater_profiles p ON p.theater_id = t.id
        LEFT JOIN screens s ON s.theater_id = t.id
        WHERE t.id = ".(int)$theaterId." GROUP BY t.id";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => 'Không thể tải thông tin rạp: '.$db->error), 500);
    $row = $result->fetch_assoc();
    $result->free();
    if (!$row) aurora_response(array('message' => 'Không tìm thấy rạp.'), 404);

    $availableDates = aurora_schedule_dates();
    $scheduleDate = $requestedDate !== '' && in_array($requestedDate, $availableDates, true) ? $requestedDate : $availableDates[0];
    $dateEscaped = $db->real_escape_string($scheduleDate);

    // Room operations are calculated from the live schedule and reservations
    // in aurora_db for the selected date; no capacity or availability is
    // inferred in the browser.
    $roomsSql = "SELECT s.id, s.name, s.total_seats,
        COUNT(DISTINCT st.id) AS showtime_count,
        COUNT(DISTINCT bs.id) AS booked_seats,
        MIN(st.starts_at) AS first_showtime,
        MAX(st.ends_at) AS last_showtime,
        MAX(CASE WHEN st.id IS NOT NULL AND st.starts_at <= NOW() AND st.ends_at > NOW() THEN 1 ELSE 0 END) AS is_running
        FROM screens s
        LEFT JOIN showtimes st ON st.screen_id = s.id AND st.status = 'OPEN' AND DATE(st.starts_at) = '".$dateEscaped."'
        LEFT JOIN bookings b ON b.showtime_id = st.id AND b.status IN ('PENDING', 'PAID')
        LEFT JOIN booking_seats bs ON bs.booking_id = b.id
        WHERE s.theater_id = ".(int)$theaterId.
        " GROUP BY s.id, s.name, s.total_seats ORDER BY s.name";
    $roomsResult = $db->query($roomsSql);
    if (!$roomsResult) aurora_response(array('message' => 'Không thể tải phòng chiếu: '.$db->error), 500);
    $rooms = array(); $activeRooms = 0; $totalRoomShowtimes = 0; $totalBookedSeats = 0; $totalScheduledCapacity = 0;
    while ($room = $roomsResult->fetch_assoc()) {
        $room['id'] = (int)$room['id']; $room['total_seats'] = (int)$room['total_seats'];
        $room['showtime_count'] = (int)$room['showtime_count']; $room['booked_seats'] = (int)$room['booked_seats'];
        $room['is_running'] = (int)$room['is_running'];
        $room['scheduled_capacity'] = $room['total_seats'] * $room['showtime_count'];
        $room['occupancy_percent'] = $room['scheduled_capacity'] > 0 ? min(100, (int)round($room['booked_seats'] * 100 / $room['scheduled_capacity'])) : 0;
        $room['operation_status'] = $room['showtime_count'] < 1 ? 'UNSCHEDULED' : ($room['is_running'] ? 'RUNNING' : 'SCHEDULED');
        if ($room['showtime_count'] > 0) $activeRooms++;
        $totalRoomShowtimes += $room['showtime_count'];
        $totalBookedSeats += $room['booked_seats'];
        $totalScheduledCapacity += $room['scheduled_capacity'];
        $rooms[] = $room;
    }
    $roomsResult->free();

    if (!aurora_ensure_seat_holds($db)) aurora_response(array('message'=>'Không thể tải trạng thái giữ ghế.'),500);
    aurora_cleanup_seat_holds($db);
    $visibilityNow = $db->real_escape_string(aurora_vietnam_now());
    $showtimesSql = "SELECT st.id, st.movie_id, s.id AS screen_id, s.name AS screen_name, s.total_seats,
        m.title AS movie_title, m.poster_url, m.duration_minutes, m.age_rating, m.format,
        st.starts_at, st.ends_at, st.ticket_price, COUNT(DISTINCT bs.id) AS booked_seats,
        (SELECT COUNT(DISTINCT h.seat_id) FROM seat_holds h WHERE h.showtime_id=st.id AND h.expires_at > '".$visibilityNow."') AS held_seats
        FROM showtimes st
        INNER JOIN screens s ON s.id = st.screen_id
        INNER JOIN movies m ON m.id = st.movie_id
        LEFT JOIN bookings b ON b.showtime_id = st.id AND b.status IN ('PENDING','PAID')
        LEFT JOIN booking_seats bs ON bs.booking_id = b.id
        WHERE s.theater_id = ".(int)$theaterId." AND st.status = 'OPEN' AND DATE(st.starts_at) = '".$dateEscaped."' AND st.starts_at > '".$visibilityNow."'
        GROUP BY st.id, st.movie_id, s.id, s.name, s.total_seats, m.title, m.poster_url, m.duration_minutes, m.age_rating, m.format, st.starts_at, st.ends_at, st.ticket_price
        ORDER BY st.starts_at LIMIT 18";
    $showtimesResult = $db->query($showtimesSql);
    if (!$showtimesResult) aurora_response(array('message' => 'Không thể tải suất chiếu: '.$db->error), 500);
    $showtimes = array();
    while ($showtime = $showtimesResult->fetch_assoc()) {
        $showtime['id'] = (int)$showtime['id']; $showtime['movie_id'] = (int)$showtime['movie_id'];
        $showtime['screen_id'] = (int)$showtime['screen_id']; $showtime['total_seats'] = (int)$showtime['total_seats'];
        $showtime['duration_minutes'] = (int)$showtime['duration_minutes']; $showtime['booked_seats'] = (int)$showtime['booked_seats'];
        $showtime['held_seats'] = (int)$showtime['held_seats']; $showtime['ticket_price'] = (float)$showtime['ticket_price'];
        $showtime['seats_left'] = max(0,$showtime['total_seats']-$showtime['booked_seats']-$showtime['held_seats']);
        $showtime['availability'] = $showtime['seats_left'] < 1 ? 'SOLD_OUT' : ($showtime['seats_left'] <= 10 ? 'LIMITED' : 'AVAILABLE');
        $showtimes[] = $showtime;
    }
    $showtimesResult->free();

    aurora_response(array('theater' => array(
        'id' => (int)$row['id'], 'name' => $row['name'], 'address' => $row['address'], 'city' => $row['city'],
        'heroImageUrl' => $row['hero_image_url'], 'shortDescription' => $row['short_description'],
        'shortDescriptionEn' => $row['short_description_en'], 'description' => $row['description'],
        'descriptionEn' => $row['description_en'], 'highlights' => aurora_json_list($row['highlights_json']),
        'highlightsEn' => aurora_json_list($row['highlights_en_json']), 'facilities' => aurora_json_list($row['facilities_json']),
        'facilitiesEn' => aurora_json_list($row['facilities_en_json']), 'openingHours' => $row['opening_hours'],
        'contactPhone' => $row['contact_phone'], 'mapUrl' => $row['map_url'],
        'screenCount' => (int)$row['screen_count'], 'totalSeats' => (int)$row['total_seats'],
        'scheduleDate' => $scheduleDate, 'availableDates' => $availableDates,
        'serverTime' => $visibilityNow,
        'operation' => array(
            'showtimeCount'=>$totalRoomShowtimes, 'activeRoomCount'=>$activeRooms,
            'bookedSeats'=>$totalBookedSeats, 'scheduledCapacity'=>$totalScheduledCapacity,
            'occupancyPercent'=>$totalScheduledCapacity > 0 ? min(100,(int)round($totalBookedSeats*100/$totalScheduledCapacity)) : 0,
            'nextShowtime'=>count($showtimes) ? $showtimes[0]['starts_at'] : null
        ),
        'rooms' => $rooms, 'showtimes' => $showtimes,
    )), 200);
}

if ($resource === 'theater_detail_event') {
    aurora_method('POST'); $body=aurora_body();
    $eventType=isset($body['eventType']) ? strtoupper(trim((string)$body['eventType'])) : '';
    $theaterId=isset($body['theaterId']) ? (int)$body['theaterId'] : 0;
    $showtimeId=isset($body['showtimeId']) ? (int)$body['showtimeId'] : 0;
    $selectedDate=isset($body['selectedDate']) ? trim((string)$body['selectedDate']) : '';
    $allowedEvents=array('SELECT_THEATER','SELECT_DATE','VIEW_SCHEDULE','OPEN_DIRECTIONS','SELECT_SHOWTIME');
    if (!in_array($eventType,$allowedEvents,true) || $theaterId<1 || !aurora_valid_date($selectedDate) || !in_array($selectedDate,aurora_schedule_dates(),true)) {
        aurora_response(array('message'=>'Dữ liệu thao tác trang rạp không hợp lệ.'),422);
    }
    $theater=$db->query("SELECT id FROM theaters WHERE id={$theaterId} LIMIT 1");
    if (!$theater || !$theater->num_rows) aurora_response(array('message'=>'Cụm rạp không tồn tại.'),404);
    if ($eventType==='SELECT_SHOWTIME') {
        $dateEsc=$db->real_escape_string($selectedDate); $nowEsc=$db->real_escape_string(aurora_vietnam_now());
        $showtime=$db->query("SELECT st.id FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id WHERE st.id={$showtimeId} AND s.theater_id={$theaterId} AND DATE(st.starts_at)='{$dateEsc}' AND st.status='OPEN' AND st.starts_at > '{$nowEsc}' LIMIT 1");
        if (!$showtime || !$showtime->num_rows) aurora_response(array('message'=>'Suất chiếu không còn khả dụng.'),409);
    }
    if (!aurora_ensure_theater_detail_event_schema($db)) aurora_response(array('message'=>'Không thể khởi tạo nhật ký trang rạp.'),500);
    $sessionEsc=$db->real_escape_string(session_id()); $userId=aurora_user_id();
    $userSql=$userId>0?(string)$userId:'NULL'; $showtimeSql=$showtimeId>0?(string)$showtimeId:'NULL';
    $eventEsc=$db->real_escape_string($eventType); $dateEsc=$db->real_escape_string($selectedDate);
    $nowEsc=$db->real_escape_string(aurora_vietnam_now());
    if (!$db->query("INSERT INTO customer_theater_detail_events (session_key,user_id,theater_id,showtime_id,selected_date,event_type,created_at) VALUES ('{$sessionEsc}',{$userSql},{$theaterId},{$showtimeSql},'{$dateEsc}','{$eventEsc}','{$nowEsc}')")) aurora_response(array('message'=>'Không thể ghi nhận thao tác trang rạp.'),500);
    aurora_response(array('recorded'=>true,'id'=>(int)$db->insert_id),201);
}

function aurora_ensure_seat_holds($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS seat_holds (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        showtime_id BIGINT UNSIGNED NOT NULL,
        seat_id BIGINT UNSIGNED NOT NULL,
        session_key VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_seat_hold (showtime_id, seat_id),
        KEY idx_seat_hold_expiry (expires_at),
        KEY idx_seat_hold_session (session_key, showtime_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_cleanup_seat_holds($db) {
    $db->query("DELETE FROM seat_holds WHERE expires_at <= '".$db->real_escape_string(aurora_vietnam_now())."'");
}

// Loyalty data is owned by aurora_db.  The ledger makes every point balance
// auditable and prevents a booking from receiving points more than once.
function aurora_ensure_loyalty_schema($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS loyalty_point_transactions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        booking_id BIGINT UNSIGNED NULL,
        points_change INT NOT NULL,
        balance_after INT UNSIGNED NOT NULL,
        transaction_type VARCHAR(30) NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL,
        UNIQUE KEY uq_loyalty_booking (booking_id),
        KEY idx_loyalty_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_membership_level($points) {
    $points = (int)$points;
    if ($points >= 5000) return 'PLATINUM';
    if ($points >= 2000) return 'GOLD';
    if ($points >= 500) return 'SILVER';
    return 'STANDARD';
}

function aurora_award_booking_points($db, $userId, $bookingId, $amount) {
    $earned = max(0, (int)floor(((float)$amount) / 1000));
    if ($earned < 1) return 0;
    $userId = (int)$userId; $bookingId = (int)$bookingId;
    $existing = $db->query("SELECT id FROM loyalty_point_transactions WHERE booking_id={$bookingId} LIMIT 1");
    if ($existing && $existing->num_rows) return 0;
    $current = $db->query("SELECT points FROM users WHERE id={$userId} FOR UPDATE");
    if (!$current || !($row = $current->fetch_assoc())) throw new Exception('Không tìm thấy tài khoản thành viên để cộng điểm.');
    $newBalance = (int)$row['points'] + $earned;
    $level = aurora_membership_level($newBalance);
    if (!$db->query("UPDATE users SET points={$newBalance}, membership_level='{$level}', updated_at=NOW() WHERE id={$userId}")) throw new Exception('Không thể cập nhật điểm thành viên.');
    $description = $db->real_escape_string('Tích điểm từ đơn đặt vé #' . $bookingId);
    if (!$db->query("INSERT INTO loyalty_point_transactions (user_id, booking_id, points_change, balance_after, transaction_type, description, created_at) VALUES ({$userId}, {$bookingId}, {$earned}, {$newBalance}, 'BOOKING_EARN', '{$description}', NOW())")) throw new Exception('Không thể ghi nhận lịch sử điểm.');
    return $earned;
}

if ($resource === 'showtime_dates') {
    $theaterId = isset($_GET['theater_id']) ? (int) $_GET['theater_id'] : 0;
    $where = $theaterId > 0 ? ' AND s.theater_id = '.$theaterId : '';
    $scheduleDates = aurora_schedule_dates();
    $sql = "SELECT DISTINCT DATE(st.starts_at) AS show_date FROM showtimes st INNER JOIN screens s ON s.id = st.screen_id WHERE st.status = 'OPEN'".$where." AND DATE(st.starts_at) BETWEEN '".$scheduleDates[0]."' AND '".$scheduleDates[6]."' ORDER BY show_date";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $dates = array();
    while ($row = $result->fetch_assoc()) $dates[] = $row['show_date'];
    aurora_response(array('dates' => $dates), 200);
}

if ($resource === 'showtimes') {
    $theaterId = isset($_GET['theater_id']) ? (int) $_GET['theater_id'] : 0;
    $date = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
    if ($date !== '' && !aurora_valid_date($date)) aurora_response(array('message' => 'Ngày chiếu không hợp lệ.'), 422);
    $movieId = isset($_GET['movie_id']) ? (int)$_GET['movie_id'] : 0;
    $where = $theaterId ? ' AND s.theater_id = '.$theaterId : '';
    if ($date !== '') $where .= " AND DATE(st.starts_at) = '".$db->real_escape_string($date)."'";
    if ($movieId > 0) $where .= ' AND st.movie_id = '.$movieId;
    if (!aurora_ensure_seat_holds($db)) aurora_response(array('message'=>'Không thể tải trạng thái ghế.'), 500);
    aurora_cleanup_seat_holds($db);
    $visibilityNow = $db->real_escape_string(aurora_vietnam_now());
    // Past or already-started shows are never bookable or visible here.
    $where .= " AND st.starts_at > '".$visibilityNow."'";
    $sql = "SELECT st.id, st.movie_id, s.theater_id, st.screen_id, s.name AS screen_name,
                   s.total_seats, m.title AS movie_title, st.starts_at, st.ends_at,
                   st.ticket_price, st.status,
                   (SELECT COUNT(DISTINCT bs.seat_id) FROM booking_seats bs
                    INNER JOIN bookings b ON b.id=bs.booking_id
                    WHERE b.showtime_id=st.id AND b.status NOT IN ('CANCELLED','EXPIRED')) AS booked_seats,
                   (SELECT COUNT(DISTINCT h.seat_id) FROM seat_holds h
                    WHERE h.showtime_id=st.id AND h.expires_at > '{$visibilityNow}') AS held_seats
            FROM showtimes st
            INNER JOIN screens s ON s.id = st.screen_id
            INNER JOIN movies m ON m.id = st.movie_id
            WHERE st.status = 'OPEN'".$where." ORDER BY st.starts_at";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $showtimes = array();
    while ($row = $result->fetch_assoc()) {
        $row['id']=(int)$row['id']; $row['movie_id']=(int)$row['movie_id'];
        $row['theater_id']=(int)$row['theater_id']; $row['screen_id']=(int)$row['screen_id'];
        $row['total_seats']=(int)$row['total_seats']; $row['booked_seats']=(int)$row['booked_seats'];
        $row['held_seats']=(int)$row['held_seats']; $row['ticket_price']=(float)$row['ticket_price'];
        $row['seats_left']=max(0,$row['total_seats']-$row['booked_seats']-$row['held_seats']);
        $row['availability']=$row['seats_left'] < 1 ? 'SOLD_OUT' : ($row['seats_left'] <= 10 ? 'LIMITED' : 'AVAILABLE');
        $showtimes[]=$row;
    }
    aurora_response(array('serverTime'=>$visibilityNow, 'showtimes'=>$showtimes), 200);
}

// Records deliberate selections on the customer schedule page in aurora_db.
if ($resource === 'theater_schedule_event') {
    aurora_method('POST');
    $body=aurora_body();
    $eventType=isset($body['eventType']) ? strtoupper(trim((string)$body['eventType'])) : '';
    $theaterId=isset($body['theaterId']) ? (int)$body['theaterId'] : 0;
    $showtimeId=isset($body['showtimeId']) ? (int)$body['showtimeId'] : 0;
    $selectedDate=isset($body['selectedDate']) ? trim((string)$body['selectedDate']) : '';
    $allowedEvents=array('SELECT_THEATER','SELECT_DATE','SELECT_SHOWTIME');
    if (!in_array($eventType,$allowedEvents,true) || $theaterId < 1 || !aurora_valid_date($selectedDate) || !in_array($selectedDate,aurora_schedule_dates(),true)) {
        aurora_response(array('message'=>'Dữ liệu thao tác lịch chiếu không hợp lệ.'),422);
    }
    $theater=$db->query("SELECT id FROM theaters WHERE id={$theaterId} LIMIT 1");
    if (!$theater || !$theater->num_rows) aurora_response(array('message'=>'Cụm rạp không tồn tại.'),404);
    if ($eventType === 'SELECT_SHOWTIME') {
        $nowEsc=$db->real_escape_string(aurora_vietnam_now());
        $dateEsc=$db->real_escape_string($selectedDate);
        $showtime=$db->query("SELECT st.id FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id WHERE st.id={$showtimeId} AND s.theater_id={$theaterId} AND DATE(st.starts_at)='{$dateEsc}' AND st.status='OPEN' AND st.starts_at > '{$nowEsc}' LIMIT 1");
        if (!$showtime || !$showtime->num_rows) aurora_response(array('message'=>'Suất chiếu không còn khả dụng.'),409);
    }
    if (!aurora_ensure_theater_schedule_event_schema($db)) aurora_response(array('message'=>'Không thể khởi tạo nhật ký lịch chiếu.'),500);
    $sessionEsc=$db->real_escape_string(session_id()); $userId=aurora_user_id();
    $userSql=$userId > 0 ? (string)$userId : 'NULL'; $showtimeSql=$showtimeId > 0 ? (string)$showtimeId : 'NULL';
    $dateEsc=$db->real_escape_string($selectedDate); $eventEsc=$db->real_escape_string($eventType);
    $nowEsc=$db->real_escape_string(aurora_vietnam_now());
    if (!$db->query("INSERT INTO customer_theater_schedule_events (session_key,user_id,theater_id,showtime_id,selected_date,event_type,created_at) VALUES ('{$sessionEsc}',{$userSql},{$theaterId},{$showtimeSql},'{$dateEsc}','{$eventEsc}','{$nowEsc}')")) aurora_response(array('message'=>'Không thể ghi nhận thao tác lịch chiếu.'),500);
    aurora_response(array('recorded'=>true,'id'=>(int)$db->insert_id),201);
}

if ($resource === 'showtime_seats') {
    $showtimeId = isset($_GET['showtime_id']) ? (int)$_GET['showtime_id'] : 0;
    if ($showtimeId < 1) aurora_response(array('message' => 'Suất chiếu không hợp lệ.'), 422);
    if (!aurora_ensure_seat_holds($db)) aurora_response(array('message' => 'Không thể khởi tạo phiên giữ ghế.'), 500);
    $seatPriceRules = aurora_seat_price_rules($db);
    if ($seatPriceRules === false) aurora_response(array('message' => 'Không thể tải cấu hình giá ghế.'), 500);
    aurora_cleanup_seat_holds($db);
    $now = aurora_vietnam_now();
    $stmt = $db->prepare("SELECT screen_id, ticket_price, starts_at FROM showtimes WHERE id = ? AND status = 'OPEN' AND starts_at > ?");
    $stmt->bind_param('is', $showtimeId, $now); $stmt->execute(); $screenId = null; $ticketPrice = 0; $startsAt = null; $stmt->bind_result($screenId, $ticketPrice, $startsAt);
    if (!$stmt->fetch()) { $stmt->close(); aurora_response(array('message' => 'Suất chiếu đã bắt đầu hoặc không còn mở bán.'), 404); }
    $stmt->close();
    $seatPricing = aurora_showtime_seat_pricing($db, $showtimeId, $startsAt, $ticketPrice, $seatPriceRules);
    $nowEsc = $db->real_escape_string($now); $sessionEsc = $db->real_escape_string(session_id());
    $sql = "SELECT seats.id, seats.seat_row, seats.seat_number, seats.seat_type,
            CASE WHEN EXISTS (SELECT 1 FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE bs.seat_id=seats.id AND b.showtime_id=".(int)$showtimeId." AND b.status NOT IN ('CANCELLED','EXPIRED')) OR EXISTS (SELECT 1 FROM seat_holds h WHERE h.showtime_id=".(int)$showtimeId." AND h.seat_id=seats.id AND h.expires_at > '".$nowEsc."' AND h.session_key <> '".$sessionEsc."') THEN 0 ELSE 1 END AS is_available,
            CASE WHEN EXISTS (SELECT 1 FROM seat_holds h WHERE h.showtime_id=".(int)$showtimeId." AND h.seat_id=seats.id AND h.expires_at > '".$nowEsc."' AND h.session_key = '".$sessionEsc."') THEN 1 ELSE 0 END AS held_by_you
            FROM seats
            WHERE seats.screen_id = ".(int)$screenId."
            GROUP BY seats.id, seats.seat_row, seats.seat_number, seats.seat_type
            ORDER BY seats.seat_row, seats.seat_number";
    $stmt = $db->query($sql);
    if (!$stmt) aurora_response(array('message' => 'Không thể tải sơ đồ ghế.'), 500);
    $seats = array();
    while ($seat = $stmt->fetch_assoc()) $seats[] = array('id'=>(int)$seat['id'], 'seat_row'=>$seat['seat_row'], 'seat_number'=>(int)$seat['seat_number'], 'seat_type'=>$seat['seat_type'], 'price'=>aurora_resolved_seat_price($seat['seat_type'], $seatPricing), 'is_available'=>(int)$seat['is_available'], 'held_by_you'=>(int)$seat['held_by_you']);
    $stmt->free(); aurora_response(array('showtime_id'=>$showtimeId, 'hold_seconds'=>600, 'pricing'=>$seatPricing, 'pricing_source'=>'aurora_db', 'seats'=>$seats), 200);
}

if ($resource === 'seat_hold') {
    aurora_method('POST');
    $body = aurora_body(); $showtimeId = isset($body['showtimeId']) ? (int)$body['showtimeId'] : 0;
    $seatIds = isset($body['seatIds']) && is_array($body['seatIds']) ? array_values(array_unique(array_map('intval', $body['seatIds']))) : array();
    if ($showtimeId < 1 || count($seatIds) > 12) aurora_response(array('message' => 'Dữ liệu giữ ghế không hợp lệ.'), 422);
    if (!aurora_ensure_seat_holds($db)) aurora_response(array('message' => 'Không thể khởi tạo phiên giữ ghế.'), 500);
    aurora_cleanup_seat_holds($db); $now = aurora_vietnam_now(); $nowEsc = $db->real_escape_string($now); $sessionEsc = $db->real_escape_string(session_id());
    $showtime = $db->query("SELECT screen_id FROM showtimes WHERE id={$showtimeId} AND status='OPEN' AND starts_at > '{$nowEsc}'");
    if (!$showtime || !($showtimeRow = $showtime->fetch_assoc())) aurora_response(array('message' => 'Suất chiếu đã bắt đầu hoặc không còn mở bán.'), 409);
    $validIds = array(); foreach ($seatIds as $seatId) if ($seatId > 0) $validIds[] = $seatId; $seatIds = $validIds;
    $expiresAt = date('Y-m-d H:i:s', strtotime($now.' +10 minutes')); $userId = isset($_SESSION['aurora_user_id']) ? (int)$_SESSION['aurora_user_id'] : 0;
    $db->autocommit(false);
    try {
        $db->query("DELETE FROM seat_holds WHERE showtime_id={$showtimeId} AND session_key='{$sessionEsc}'");
        if (count($seatIds)) {
            $idSql = implode(',', $seatIds); $valid=$db->query("SELECT id FROM seats WHERE screen_id=".(int)$showtimeRow['screen_id']." AND id IN ({$idSql})");
            if (!$valid || $valid->num_rows !== count($seatIds)) throw new Exception('Ghế không thuộc phòng chiếu này.');
            $conflict=$db->query("SELECT seat_id FROM seat_holds WHERE showtime_id={$showtimeId} AND seat_id IN ({$idSql}) AND expires_at > '{$nowEsc}' AND session_key <> '{$sessionEsc}' LIMIT 1");
            if ($conflict && $conflict->num_rows) throw new Exception('Một ghế vừa được khách khác giữ. Vui lòng chọn ghế khác.');
            $booked=$db->query("SELECT bs.seat_id FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id={$showtimeId} AND bs.seat_id IN ({$idSql}) AND b.status NOT IN ('CANCELLED','EXPIRED') LIMIT 1");
            if ($booked && $booked->num_rows) throw new Exception('Một ghế vừa được đặt. Vui lòng chọn ghế khác.');
            foreach ($seatIds as $seatId) if (!$db->query("INSERT INTO seat_holds (showtime_id,seat_id,session_key,user_id,expires_at,created_at,updated_at) VALUES ({$showtimeId},{$seatId},'{$sessionEsc}',".($userId ? $userId : 'NULL').",'{$expiresAt}','{$nowEsc}','{$nowEsc}')")) throw new Exception('Không thể giữ ghế đã chọn.');
        }
        $db->commit(); $db->autocommit(true); aurora_response(array('seat_ids'=>$seatIds,'expires_at'=>$expiresAt,'hold_seconds'=>600),200);
    } catch (Exception $exception) { $db->rollback(); $db->autocommit(true); aurora_response(array('message'=>$exception->getMessage()),409); }
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

// ── /loyalty (GET) ────────────────────────────────────────────────────────────
if ($resource === 'loyalty') {
    $userId = aurora_require_user();
    if (!aurora_ensure_loyalty_schema($db)) aurora_response(array('message' => 'Không thể khởi tạo sổ điểm Aurora.'), 500);
    $history = array();
    $result = $db->query("SELECT id, booking_id, points_change, balance_after, transaction_type, description, created_at FROM loyalty_point_transactions WHERE user_id=".(int)$userId." ORDER BY id DESC LIMIT 30");
    if (!$result) aurora_response(array('message' => 'Không thể tải lịch sử điểm.'), 500);
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id']; $row['booking_id'] = $row['booking_id'] !== null ? (int)$row['booking_id'] : null;
        $row['points_change'] = (int)$row['points_change']; $row['balance_after'] = (int)$row['balance_after'];
        $history[] = $row;
    }
    aurora_response(array('member' => aurora_public_user($db, $userId), 'history' => $history), 200);
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
    $paymentMethod = isset($body['paymentMethod']) ? strtoupper(trim((string)$body['paymentMethod'])) : 'ONLINE';
    $seatIds = isset($body['seatIds']) && is_array($body['seatIds']) ? array_values(array_unique(array_map('intval', $body['seatIds']))) : array();
    $concessionCatalog = aurora_concession_catalog($db);
    $combos = array();
    if (isset($body['combos']) && is_array($body['combos'])) {
        foreach ($body['combos'] as $item) {
            $id = is_array($item) && isset($item['id']) ? (string)$item['id'] : '';
            $quantity = is_array($item) && isset($item['quantity']) ? (int)$item['quantity'] : 0;
            if (isset($concessionCatalog[$id]) && $quantity > 0 && $quantity <= 10) {
                $combos[$id] = min(10, (isset($combos[$id]) ? $combos[$id] : 0) + $quantity);
            }
        }
    }
    $validSeatIds = array();
    foreach ($seatIds as $seatIdValue) if ($seatIdValue > 0) $validSeatIds[] = $seatIdValue;
    $seatIds = $validSeatIds;
    if ($showtimeId < 1 || count($seatIds) < 1 || count($seatIds) > 12) {
        aurora_response(array('message' => 'Vui lòng chọn suất chiếu và từ 1 đến 12 ghế.'), 422);
    }

    // Tạo bảng món kèm tự động để tương thích với database Aurora đã cài sẵn.
    if (!$db->query("CREATE TABLE IF NOT EXISTS booking_concessions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, booking_id BIGINT UNSIGNED NOT NULL, item_code VARCHAR(50) NOT NULL, item_name VARCHAR(160) NOT NULL, quantity INT UNSIGNED NOT NULL, unit_price DECIMAL(10,2) NOT NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_booking_concessions_booking (booking_id), FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE) ENGINE=InnoDB")) {
        aurora_response(array('message' => 'Không thể khởi tạo dữ liệu combo.'), 500);
    }
    if (!aurora_ensure_sales_orders($db)) {
        aurora_response(array('message' => 'Không thể khởi tạo bảng đơn hàng tổng.'), 500);
    }
    if (!aurora_ensure_loyalty_schema($db)) {
        aurora_response(array('message' => 'Không thể khởi tạo sổ điểm Aurora.'), 500);
    }
    $seatPriceRules = aurora_seat_price_rules($db);
    if ($seatPriceRules === false) aurora_response(array('message' => 'Không thể tải cấu hình giá ghế.'), 500);

    $db->autocommit(false);
    try {
        $stmt = $db->prepare("SELECT st.screen_id, st.ticket_price, st.status, st.starts_at FROM showtimes st WHERE st.id = ? FOR UPDATE");
        $stmt->bind_param('i', $showtimeId); $stmt->execute();
        $screenId = null; $ticketPrice = null; $showtimeStatus = null; $startsAt = null; $found = $stmt->bind_result($screenId, $ticketPrice, $showtimeStatus, $startsAt) && $stmt->fetch(); $stmt->close();
        if (!$found || $showtimeStatus !== 'OPEN') throw new Exception('Suất chiếu không tồn tại hoặc đã đóng.');
        if (strtotime($startsAt) < time()) throw new Exception('Suất chiếu đã bắt đầu, không thể đặt vé.');
        $seatPricing = aurora_showtime_seat_pricing($db, $showtimeId, $startsAt, $ticketPrice, $seatPriceRules);

        $seatSql = 'SELECT id, seat_type FROM seats WHERE screen_id = ? AND id IN (' . implode(',', array_fill(0, count($seatIds), '?')) . ') FOR UPDATE';
        $seatTypes = str_repeat('i', count($seatIds) + 1);
        $seatParams = array_merge(array($screenId), $seatIds);
        $stmt = $db->prepare($seatSql);
        $refs = array($seatTypes); foreach ($seatParams as $key => $value) $refs[] = &$seatParams[$key];
        call_user_func_array(array($stmt, 'bind_param'), $refs);
        $stmt->execute(); $stmt->bind_result($seatId, $seatType); $validSeats = array(); $seatTypeMap = array();
        while ($stmt->fetch()) {
            $validSeats[] = (int)$seatId;
            $seatTypeMap[(int)$seatId] = $seatType;
        }
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
        $total = 0;
        foreach ($seatIds as $sId) {
            $st = isset($seatTypeMap[$sId]) ? $seatTypeMap[$sId] : 'STANDARD';
            $p = aurora_resolved_seat_price($st, $seatPricing);
            $total += $p;
        }
        foreach ($combos as $comboId => $quantity) {
            $total += $concessionCatalog[$comboId]['price'] * $quantity;
        }
        $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare("INSERT INTO bookings (user_id, showtime_id, booking_code, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PAID', ?, ?)");
        $stmt->bind_param('iisdss', $userId, $showtimeId, $code, $total, $now, $now); $stmt->execute(); $bookingId = (int)$stmt->insert_id; $stmt->close();
        $stmt = $db->prepare('INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price) VALUES (?, ?, ?, ?)');
        if ($stmt) {
            foreach ($seatIds as $sId) {
                $st = isset($seatTypeMap[$sId]) ? $seatTypeMap[$sId] : 'STANDARD';
                $p = aurora_resolved_seat_price($st, $seatPricing);
                $stmt->bind_param('iiid', $bookingId, $showtimeId, $sId, $p);
                $stmt->execute();
            }
        } else {
            $stmt = $db->prepare('INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (?, ?, ?)');
            foreach ($seatIds as $sId) {
                $st = isset($seatTypeMap[$sId]) ? $seatTypeMap[$sId] : 'STANDARD';
                $p = aurora_resolved_seat_price($st, $seatPricing);
                $stmt->bind_param('iid', $bookingId, $sId, $p);
                $stmt->execute();
            }
        }
        $stmt->close();
        if (count($combos) > 0) {
            $stmt = $db->prepare('INSERT INTO booking_concessions (booking_id, item_code, item_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)');
            if (!$stmt) throw new Exception('Không thể lưu combo bắp nước.');
            foreach ($combos as $comboId => $quantity) {
                $comboName = $concessionCatalog[$comboId]['name'];
                $comboPrice = $concessionCatalog[$comboId]['price'];
                $stmt->bind_param('issid', $bookingId, $comboId, $comboName, $quantity, $comboPrice);
                if (!$stmt->execute()) throw new Exception('Không thể lưu combo bắp nước.');
            }
            $stmt->close();
        }
        $stmt = $db->prepare("INSERT INTO orders (order_code, channel, booking_id, customer_id, subtotal, total_amount, payment_method, amount_received, change_amount, status) VALUES (?, 'ONLINE', ?, ?, ?, ?, ?, ?, 0, 'PAID')");
        if (!$stmt) throw new Exception('Không thể lưu đơn hàng tổng.');
        $stmt->bind_param('siiddsd', $code, $bookingId, $userId, $total, $total, $paymentMethod, $total);
        if (!$stmt->execute()) throw new Exception('Không thể lưu đơn hàng tổng.');
        $stmt->close();
        // The seats are now durable bookings; remove this browser session's
        // temporary holds before committing the same transaction.
        if (aurora_ensure_seat_holds($db)) {
            $holdIds = implode(',', $seatIds);
            $db->query("DELETE FROM seat_holds WHERE showtime_id=".(int)$showtimeId." AND seat_id IN ({$holdIds}) AND session_key='".$db->real_escape_string(session_id())."'");
        }
        $pointsEarned = aurora_award_booking_points($db, $userId, $bookingId, $total);
        $db->commit();
        $db->autocommit(true);
        aurora_response(array('booking' => array('id'=>$bookingId, 'code'=>$code, 'showtimeId'=>$showtimeId, 'seatIds'=>$seatIds, 'combos'=>$combos, 'totalAmount'=>$total, 'status'=>'PAID', 'pointsEarned'=>$pointsEarned), 'member' => aurora_public_user($db, $userId)), 201);
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

// ── /movie_schedule (GET) ───────────────────────────────────────────────────
// Customer-facing schedule with real-time seat availability for one movie.
if ($resource === 'movie_schedule') {
    $movieId = isset($_GET['movie_id']) ? (int)$_GET['movie_id'] : 0;
    if ($movieId < 1) aurora_response(array('message'=>'Phim không hợp lệ.'), 422);
    $movieCheck = $db->query("SELECT id FROM movies WHERE id={$movieId} LIMIT 1");
    if (!$movieCheck || !$movieCheck->num_rows) aurora_response(array('message'=>'Không tìm thấy phim.'), 404);
    $scheduleDates = aurora_schedule_dates();
    $date = isset($_GET['date']) ? trim((string)$_GET['date']) : $scheduleDates[0];
    if (!aurora_valid_date($date) || !in_array($date, $scheduleDates, true)) aurora_response(array('message'=>'Ngày chiếu phải nằm trong 7 ngày hiện tại.'), 422);
    if (!aurora_ensure_seat_holds($db)) aurora_response(array('message'=>'Không thể tải trạng thái ghế.'), 500);
    aurora_cleanup_seat_holds($db);
    $dateEsc = $db->real_escape_string($date); $nowEsc = $db->real_escape_string(aurora_vietnam_now());

    $theaterSql = "SELECT t.id, t.name, t.address, t.city, COUNT(DISTINCT st.id) AS showtime_count, MIN(st.starts_at) AS first_showtime
                   FROM theaters t
                   LEFT JOIN screens s ON s.theater_id=t.id
                   LEFT JOIN showtimes st ON st.screen_id=s.id AND st.movie_id={$movieId} AND st.status='OPEN'
                        AND DATE(st.starts_at)='{$dateEsc}' AND st.starts_at > '{$nowEsc}'
                   GROUP BY t.id, t.name, t.address, t.city
                   ORDER BY showtime_count DESC, t.name";
    $theaterResult = $db->query($theaterSql);
    if (!$theaterResult) aurora_response(array('message'=>'Không thể tải danh sách rạp: '.$db->error), 500);
    $theaters = array();
    while ($row = $theaterResult->fetch_assoc()) $theaters[] = array('id'=>(int)$row['id'], 'name'=>$row['name'], 'address'=>$row['address'], 'city'=>$row['city'], 'showtimeCount'=>(int)$row['showtime_count'], 'firstShowtime'=>$row['first_showtime']);

    $sql = "SELECT st.id, st.screen_id, s.name AS screen_name, s.total_seats,
                   t.id AS theater_id, t.name AS theater_name, t.address AS theater_address, t.city,
                   st.starts_at, st.ends_at, st.ticket_price, st.status,
                   (SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id
                    WHERE b.showtime_id=st.id AND b.status NOT IN ('CANCELLED','EXPIRED')) AS booked_seats,
                   (SELECT COUNT(*) FROM seat_holds h WHERE h.showtime_id=st.id AND h.expires_at > '{$nowEsc}') AS held_seats
            FROM showtimes st
            INNER JOIN screens s ON s.id=st.screen_id
            INNER JOIN theaters t ON t.id=s.theater_id
            WHERE st.movie_id={$movieId} AND st.status='OPEN' AND DATE(st.starts_at)='{$dateEsc}' AND st.starts_at > '{$nowEsc}'
            ORDER BY st.starts_at, t.name";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message'=>'Không thể tải lịch chiếu: '.$db->error), 500);
    $showtimes = array();
    while ($row = $result->fetch_assoc()) {
        $capacity=(int)$row['total_seats']; $occupied=(int)$row['booked_seats']+(int)$row['held_seats']; $left=max(0,$capacity-$occupied);
        $percent=$capacity > 0 ? min(100,(int)round(($occupied/$capacity)*100)) : 0;
        $showtimes[] = array(
            'id'=>(int)$row['id'], 'screen_id'=>(int)$row['screen_id'], 'screen_name'=>$row['screen_name'],
            'total_seats'=>$capacity, 'seats_left'=>$left, 'occupancy_percent'=>$percent,
            'availability'=>$left <= 0 ? 'SOLD_OUT' : ($left <= 10 ? 'LIMITED' : 'AVAILABLE'),
            'theater_id'=>(int)$row['theater_id'], 'theater_name'=>$row['theater_name'],
            'theater_address'=>$row['theater_address'], 'city'=>$row['city'],
            'starts_at'=>$row['starts_at'], 'ends_at'=>$row['ends_at'], 'ticket_price'=>(float)$row['ticket_price'], 'status'=>$row['status']
        );
    }
    if (!aurora_record_schedule_event($db,$movieId,0,0,$date,'VIEW_SCHEDULE')) aurora_response(array('message'=>'Không thể ghi nhận lượt xem lịch chiếu.'), 500);
    $dates=array(); foreach ($scheduleDates as $dateValue) $dates[]=array('date'=>$dateValue);
    aurora_response(array('movieId'=>$movieId,'selectedDate'=>$date,'serverTime'=>$nowEsc,'dates'=>$dates,'theaters'=>$theaters,'showtimes'=>$showtimes),200);
}

// ── /schedule_event (POST) ──────────────────────────────────────────────────
if ($resource === 'schedule_event') {
    aurora_method('POST'); $body=aurora_body();
    $movieId=isset($body['movieId'])?(int)$body['movieId']:0; $theaterId=isset($body['theaterId'])?(int)$body['theaterId']:0;
    $showtimeId=isset($body['showtimeId'])?(int)$body['showtimeId']:0; $date=isset($body['date'])?trim((string)$body['date']):'';
    $eventType=isset($body['eventType'])?strtoupper(trim((string)$body['eventType'])):'';
    if ($movieId<1 || $theaterId<1 || !aurora_valid_date($date) || !in_array($date,aurora_schedule_dates(),true) || !in_array($eventType,array('SELECT_THEATER','SELECT_SHOWTIME'),true)) aurora_response(array('message'=>'Dữ liệu sự kiện lịch chiếu không hợp lệ.'),422);
    $dateEsc=$db->real_escape_string($date);
    $theaterCheck=$db->query("SELECT id FROM theaters WHERE id={$theaterId} LIMIT 1");
    if (!$theaterCheck || !$theaterCheck->num_rows) aurora_response(array('message'=>'Cụm rạp không tồn tại.'),404);
    if ($eventType==='SELECT_SHOWTIME') {
        $nowEsc=$db->real_escape_string(aurora_vietnam_now());
        $check=$db->query("SELECT st.id FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id WHERE st.id={$showtimeId} AND st.movie_id={$movieId} AND s.theater_id={$theaterId} AND DATE(st.starts_at)='{$dateEsc}' AND st.status='OPEN' AND st.starts_at > '{$nowEsc}' LIMIT 1");
        if (!$check || !$check->num_rows) aurora_response(array('message'=>'Suất chiếu không còn khả dụng.'),409);
    }
    if (!aurora_record_schedule_event($db,$movieId,$theaterId,$showtimeId,$date,$eventType)) aurora_response(array('message'=>'Không thể ghi nhận thao tác.'),500);
    aurora_response(array('recorded'=>true),201);
}

// ── /movie_showtimes (GET) ────────────────────────────────────────────────────
// Trả về tất cả suất chiếu của 1 phim, nhóm theo ngày và rạp
// Params: movie_id (bắt buộc), date (yyyy-mm-dd, tuỳ chọn)
if ($resource === 'movie_showtimes') {
    $movieId = isset($_GET['movie_id']) ? (int)$_GET['movie_id'] : 0;
    if ($movieId < 1) aurora_response(array('message' => 'movie_id không hợp lệ.'), 422);

    $date = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
    if ($date !== '' && !aurora_valid_date($date)) aurora_response(array('message' => 'Ngày không hợp lệ.'), 422);

    $dateWhere = $date !== '' ? " AND DATE(st.starts_at) = '" . $db->real_escape_string($date) . "'" : '';
    $visibilityNow = $db->real_escape_string(aurora_vietnam_now());

    // Only expose upcoming records according to the authoritative Vietnam
    // timestamp. This policy is shared with the cinema schedule API.
    $daysResult = $db->query(
        "SELECT DISTINCT DATE(st.starts_at) AS show_date FROM showtimes st
         WHERE st.movie_id = " . (int)$movieId . " AND st.status = 'OPEN'
           AND st.starts_at > '" . $visibilityNow . "'
         ORDER BY show_date LIMIT 14"
    );
    $availableDates = array();
    if ($daysResult) while ($r = $daysResult->fetch_assoc()) $availableDates[] = $r['show_date'];

    $sql = "SELECT st.id, st.screen_id, s.name AS screen_name, s.total_seats,
                   t.id AS theater_id, t.name AS theater_name, t.address AS theater_address, t.city,
                   st.starts_at, st.ends_at, st.ticket_price, st.status,
                   DATE(st.starts_at) AS show_date,
                   (SELECT COUNT(*) FROM booking_seats bs2
                    INNER JOIN bookings b2 ON b2.id = bs2.booking_id
                    WHERE b2.showtime_id = st.id AND b2.status NOT IN ('CANCELLED','EXPIRED')) AS seats_taken
            FROM showtimes st
            INNER JOIN screens s ON s.id = st.screen_id
            INNER JOIN theaters t ON t.id = s.theater_id
            WHERE st.movie_id = " . (int)$movieId . " AND st.status = 'OPEN'
              AND st.starts_at > '" . $visibilityNow . "'" . $dateWhere . "
            ORDER BY st.starts_at";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);

    $showtimes = array();
    while ($row = $result->fetch_assoc()) {
        $seatsTaken = (int)$row['seats_taken'];
        $totalSeats = (int)$row['total_seats'];
        $seatsLeft  = max(0, $totalSeats - $seatsTaken);
        $showtimes[] = array(
            'id'             => (int)$row['id'],
            'screen_id'      => (int)$row['screen_id'],
            'screen_name'    => $row['screen_name'],
            'total_seats'    => $totalSeats,
            'seats_left'     => $seatsLeft,
            'theater_id'     => (int)$row['theater_id'],
            'theater_name'   => $row['theater_name'],
            'theater_address'=> $row['theater_address'],
            'city'           => $row['city'],
            'starts_at'      => $row['starts_at'],
            'ends_at'        => $row['ends_at'],
            'ticket_price'   => (float)$row['ticket_price'],
            'status'         => $row['status'],
            'show_date'      => $row['show_date'],
        );
    }
    aurora_response(array(
        'movie_id'        => $movieId,
        'available_dates' => $availableDates,
        'showtimes'       => $showtimes,
    ), 200);
}

// ── /showtime_detail (GET) ────────────────────────────────────────────────────
// Chi tiết đầy đủ 1 suất chiếu: phim + rạp + phòng + ghế
if ($resource === 'showtime_detail') {
    $showtimeId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($showtimeId < 1) aurora_response(array('message' => 'showtime id không hợp lệ.'), 422);

    $stmt = $db->prepare(
        "SELECT st.id, st.movie_id, st.screen_id, st.starts_at, st.ends_at, st.ticket_price, st.status,
                m.title, m.age_rating, m.format, m.genre, m.poster_url, m.duration_minutes,
                s.name AS screen_name, s.total_seats,
                t.id AS theater_id, t.name AS theater_name, t.address, t.city
         FROM showtimes st
         INNER JOIN movies m ON m.id = st.movie_id
         INNER JOIN screens s ON s.id = st.screen_id
         INNER JOIN theaters t ON t.id = s.theater_id
         WHERE st.id = ?"
    );
    if (!$stmt) aurora_response(array('message' => 'Lỗi truy vấn.'), 500);
    $stmt->bind_param('i', $showtimeId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) aurora_response(array('message' => 'Suất chiếu không tồn tại.'), 404);

    // Đếm ghế còn lại
    $takenStmt = $db->prepare(
        "SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id
         WHERE b.showtime_id=? AND b.status NOT IN ('CANCELLED','EXPIRED')"
    );
    $takenStmt->bind_param('i', $showtimeId);
    $takenStmt->execute();
    $taken = 0; $takenStmt->bind_result($taken); $takenStmt->fetch(); $takenStmt->close();

    aurora_response(array('showtime' => array(
        'id'             => (int)$row['id'],
        'movie_id'       => (int)$row['movie_id'],
        'screen_id'      => (int)$row['screen_id'],
        'starts_at'      => $row['starts_at'],
        'ends_at'        => $row['ends_at'],
        'ticket_price'   => (float)$row['ticket_price'],
        'status'         => $row['status'],
        'movie_title'    => $row['title'],
        'age_rating'     => $row['age_rating'],
        'format'         => $row['format'],
        'genre'          => $row['genre'],
        'poster_url'     => $row['poster_url'],
        'duration_minutes'=> (int)$row['duration_minutes'],
        'screen_name'    => $row['screen_name'],
        'total_seats'    => (int)$row['total_seats'],
        'seats_taken'    => (int)$taken,
        'seats_left'     => max(0, (int)$row['total_seats'] - (int)$taken),
        'theater_id'     => (int)$row['theater_id'],
        'theater_name'   => $row['theater_name'],
        'theater_address'=> $row['address'],
        'city'           => $row['city'],
    )), 200);
}

// ── /apply_voucher (POST) ─────────────────────────────────────────────────────
// Kiểm tra và áp dụng mã voucher – hiện tại là stub trả về giảm giá cố định
// Trong production sẽ tra bảng vouchers
if ($resource === 'apply_voucher') {
    aurora_method('POST');
    aurora_require_user();
    $body = aurora_body();
    $code = isset($body['code']) ? strtoupper(trim((string)$body['code'])) : '';
    $total = isset($body['total']) ? (float)$body['total'] : 0;
    if ($code === '') aurora_response(array('message' => 'Vui lòng nhập mã voucher.'), 422);

    if (!aurora_ensure_vouchers($db)) aurora_response(array('message' => 'Không thể đọc danh mục voucher.'), 500);
    $stmt = $db->prepare("SELECT name, discount_type, discount_value FROM vouchers WHERE code=? AND status='active' AND starts_at <= NOW() AND ends_at >= NOW() AND (usage_limit=0 OR used_count < usage_limit) LIMIT 1");
    $stmt->bind_param('s', $code); $stmt->execute(); $stmt->bind_result($voucherName, $voucherType, $voucherValue);
    $foundVoucher = $stmt->fetch(); $stmt->close();
    if (!$foundVoucher) {
        aurora_response(array('message' => 'Mã voucher không hợp lệ hoặc đã hết hạn.'), 404);
    }
    $discount = 0;
    if ($voucherType === 'percent') {
        $discount = $total * (float)$voucherValue / 100;
    } else {
        $discount = min((float)$voucherValue, $total);
    }
    $discount = round($discount);

    aurora_response(array(
        'valid'    => true,
        'code'     => $code,
        'desc'     => $voucherName,
        'discount' => $discount,
        'final'    => max(0, $total - $discount),
    ), 200);
}

// ── /booking_detail (GET) ─────────────────────────────────────────────────────
// Chi tiết đầy đủ 1 booking (dùng sau khi đặt thành công)
if ($resource === 'booking_detail') {
    $userId    = aurora_require_user();
    $bookingId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($bookingId < 1) aurora_response(array('message' => 'booking id không hợp lệ.'), 422);

    $sql = "SELECT b.id, b.booking_code, b.total_amount, b.status, b.created_at,
                   st.starts_at, st.ends_at, st.ticket_price,
                   m.title AS movie_title, m.poster_url, m.age_rating, m.format, m.duration_minutes,
                   s.name AS screen_name,
                   t.name AS theater_name, t.address AS theater_address, t.city,
                   GROUP_CONCAT(CONCAT(se.seat_row, se.seat_number, '(', se.seat_type, ')') ORDER BY se.seat_row, se.seat_number SEPARATOR '|') AS seats_raw,
                   GROUP_CONCAT(CONCAT(se.seat_row, se.seat_number) ORDER BY se.seat_row, se.seat_number SEPARATOR ', ') AS seats_display
            FROM bookings b
            INNER JOIN showtimes st ON st.id = b.showtime_id
            INNER JOIN movies m ON m.id = st.movie_id
            INNER JOIN screens s ON s.id = st.screen_id
            INNER JOIN theaters t ON t.id = s.theater_id
            LEFT JOIN booking_seats bs ON bs.booking_id = b.id
            LEFT JOIN seats se ON se.id = bs.seat_id
            WHERE b.id = ? AND b.user_id = ?
            GROUP BY b.id";
    $stmt = $db->prepare($sql);
    if (!$stmt) aurora_response(array('message' => 'Lỗi truy vấn.'), 500);
    $stmt->bind_param('ii', $bookingId, $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) aurora_response(array('message' => 'Không tìm thấy đơn đặt vé.'), 404);

    // Parse seats list
    $seatsArr = array();
    if ($row['seats_raw']) {
        foreach (explode('|', $row['seats_raw']) as $seatStr) {
            if (preg_match('/^([A-Z]+)(\d+)\((\w+)\)$/', $seatStr, $m)) {
                $seatsArr[] = array('label' => $m[1].$m[2], 'row' => $m[1], 'number' => (int)$m[2], 'type' => $m[3]);
            }
        }
    }

    aurora_response(array('booking' => array(
        'id'              => (int)$row['id'],
        'code'            => $row['booking_code'],
        'status'          => $row['status'],
        'total_amount'    => (float)$row['total_amount'],
        'created_at'      => $row['created_at'],
        'ticket_price'    => (float)$row['ticket_price'],
        'movie_title'     => $row['movie_title'],
        'poster_url'      => $row['poster_url'],
        'age_rating'      => $row['age_rating'],
        'format'          => $row['format'],
        'duration_minutes'=> (int)$row['duration_minutes'],
        'starts_at'       => $row['starts_at'],
        'ends_at'         => $row['ends_at'],
        'screen_name'     => $row['screen_name'],
        'theater_name'    => $row['theater_name'],
        'theater_address' => $row['theater_address'],
        'city'            => $row['city'],
        'seats'           => $seatsArr,
        'seats_display'   => $row['seats_display'],
    )), 200);
}

aurora_response(array('message' => 'API không tồn tại.'), 404);
