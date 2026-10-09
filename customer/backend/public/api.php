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
        KEY idx_schedule_event_showtime (showtime_id),
        CONSTRAINT fk_customer_schedule_events_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE SET NULL
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
        KEY idx_theater_schedule_user (user_id, created_at),
        CONSTRAINT fk_customer_theater_schedule_events_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE SET NULL
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
        KEY idx_theater_detail_user (user_id, created_at),
        CONSTRAINT fk_customer_theater_detail_events_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE SET NULL
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

// Administrative units used by the customer profile are database-backed.
// Importing is idempotent and only happens when the tables are empty.
function aurora_ensure_administrative_catalog($db) {
    $provinceTable = $db->query("CREATE TABLE IF NOT EXISTS administrative_provinces (
        code CHAR(2) NOT NULL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        code_name VARCHAR(100) NOT NULL,
        dataset_version VARCHAR(30) NOT NULL,
        sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        UNIQUE KEY uq_administrative_province_name (name),
        KEY idx_administrative_province_active (is_active, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    if (!$provinceTable) return false;

    $districtTable = $db->query("CREATE TABLE IF NOT EXISTS administrative_districts (
        code CHAR(3) NOT NULL PRIMARY KEY,
        province_code CHAR(2) NOT NULL,
        name VARCHAR(120) NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        code_name VARCHAR(120) NOT NULL,
        dataset_version VARCHAR(30) NOT NULL,
        sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        UNIQUE KEY uq_administrative_district_name (province_code, full_name),
        KEY idx_administrative_district_province (province_code, is_active, sort_order),
        CONSTRAINT fk_administrative_district_province FOREIGN KEY (province_code)
            REFERENCES administrative_provinces(code) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    if (!$districtTable) return false;

    $countResult = $db->query('SELECT (SELECT COUNT(*) FROM administrative_provinces) AS province_total, (SELECT COUNT(*) FROM administrative_districts) AS district_total');
    $countRow = $countResult ? $countResult->fetch_assoc() : false;
    if ($countRow && (int)$countRow['province_total'] >= 63 && (int)$countRow['district_total'] >= 696) return true;

    $catalogPath = dirname(dirname(__FILE__)).DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'vietnam_provinces_districts_v2.4.1.json';
    if (!is_file($catalogPath)) return false;
    $catalog = json_decode(file_get_contents($catalogPath), true);
    if (!is_array($catalog) || count($catalog) < 63) return false;

    $provinceSql = "INSERT INTO administrative_provinces
        (code,name,full_name,code_name,dataset_version,sort_order,is_active,updated_at)
        VALUES (?,?,?,?,?,?,1,NOW())
        ON DUPLICATE KEY UPDATE name=VALUES(name),full_name=VALUES(full_name),code_name=VALUES(code_name),
            dataset_version=VALUES(dataset_version),sort_order=VALUES(sort_order),is_active=1,updated_at=NOW()";
    $districtSql = "INSERT INTO administrative_districts
        (code,province_code,name,full_name,code_name,dataset_version,sort_order,is_active,updated_at)
        VALUES (?,?,?,?,?,?,?,1,NOW())
        ON DUPLICATE KEY UPDATE province_code=VALUES(province_code),name=VALUES(name),full_name=VALUES(full_name),
            code_name=VALUES(code_name),dataset_version=VALUES(dataset_version),sort_order=VALUES(sort_order),is_active=1,updated_at=NOW()";
    $provinceStmt = $db->prepare($provinceSql);
    $districtStmt = $db->prepare($districtSql);
    if (!$provinceStmt || !$districtStmt) return false;

    $datasetVersion = 'VN-63-v2.4.1';
    $provinceCode = $provinceName = $provinceFullName = $provinceCodeName = '';
    $provinceOrder = 0;
    $districtCode = $districtProvinceCode = $districtName = $districtFullName = $districtCodeName = '';
    $districtOrder = 0;
    $provinceStmt->bind_param('sssssi', $provinceCode, $provinceName, $provinceFullName, $provinceCodeName, $datasetVersion, $provinceOrder);
    $districtStmt->bind_param('ssssssi', $districtCode, $districtProvinceCode, $districtName, $districtFullName, $districtCodeName, $datasetVersion, $districtOrder);

    $db->autocommit(false);
    foreach ($catalog as $province) {
        $provinceCode = isset($province['code']) ? (string)$province['code'] : '';
        $provinceName = isset($province['name']) ? (string)$province['name'] : '';
        $provinceFullName = isset($province['fullName']) ? (string)$province['fullName'] : $provinceName;
        $provinceCodeName = isset($province['codeName']) ? (string)$province['codeName'] : '';
        $provinceOrder = isset($province['sortOrder']) ? (int)$province['sortOrder'] : 0;
        if ($provinceCode === '' || $provinceName === '' || !$provinceStmt->execute()) {
            $db->rollback(); $db->autocommit(true); $provinceStmt->close(); $districtStmt->close(); return false;
        }
        $districtProvinceCode = $provinceCode;
        $districts = isset($province['districts']) && is_array($province['districts']) ? $province['districts'] : array();
        foreach ($districts as $district) {
            $districtCode = isset($district['code']) ? (string)$district['code'] : '';
            $districtName = isset($district['name']) ? (string)$district['name'] : '';
            $districtFullName = isset($district['fullName']) ? (string)$district['fullName'] : $districtName;
            $districtCodeName = isset($district['codeName']) ? (string)$district['codeName'] : '';
            $districtOrder = isset($district['sortOrder']) ? (int)$district['sortOrder'] : 0;
            if ($districtCode === '' || $districtName === '' || !$districtStmt->execute()) {
                $db->rollback(); $db->autocommit(true); $provinceStmt->close(); $districtStmt->close(); return false;
            }
        }
    }
    $provinceStmt->close();
    $districtStmt->close();
    $db->commit();
    $db->autocommit(true);
    return true;
}

function aurora_canonical_province($db, $city) {
    $candidate = trim((string)$city);
    if ($candidate === 'TP. Hồ Chí Minh') $candidate = 'Hồ Chí Minh';
    if ($candidate === 'Thừa Thiên Huế') $candidate = 'Huế';
    $stmt = $db->prepare('SELECT code,name FROM administrative_provinces WHERE is_active=1 AND (name=? OR full_name=?) LIMIT 1');
    if (!$stmt) return false;
    $stmt->bind_param('ss', $candidate, $candidate);
    $stmt->execute();
    $code = $name = null;
    $stmt->bind_result($code, $name);
    $found = $stmt->fetch();
    $stmt->close();
    if ($found) return array('code'=>(string)$code, 'name'=>(string)$name);

    // Gracefully recover values previously damaged by latin1 columns, such
    // as "Ti?n Giang", without accepting arbitrary free text.
    if (strpos($candidate, '?') !== false) {
        if (strpos($candidate, 'TP. ') === 0) $candidate = substr($candidate, 4);
        $pattern = str_replace('?', '_', $candidate);
        $fallback = $db->prepare('SELECT code,name FROM administrative_provinces WHERE is_active=1 AND (name LIKE ? OR full_name LIKE ?) ORDER BY code LIMIT 2');
        if (!$fallback) return false;
        $fallback->bind_param('ss', $pattern, $pattern);
        $fallback->execute();
        $fallbackCode = $fallbackName = null; $matches = array();
        $fallback->bind_result($fallbackCode, $fallbackName);
        while ($fallback->fetch()) $matches[] = array('code'=>(string)$fallbackCode, 'name'=>(string)$fallbackName);
        $fallback->close();
        if (count($matches) === 1) return $matches[0];
    }
    return false;
}

function aurora_canonical_district($db, $provinceCode, $district) {
    $candidate = trim((string)$district);
    $stmt = $db->prepare('SELECT full_name FROM administrative_districts WHERE province_code=? AND is_active=1 AND (full_name=? OR name=?) LIMIT 1');
    if (!$stmt) return false;
    $stmt->bind_param('sss', $provinceCode, $candidate, $candidate);
    $stmt->execute();
    $fullName = null;
    $stmt->bind_result($fullName);
    $found = $stmt->fetch();
    $stmt->close();
    if ($found) return (string)$fullName;
    if (strpos($candidate, '?') !== false) {
        $pattern = str_replace('?', '_', $candidate);
        $fallback = $db->prepare('SELECT full_name FROM administrative_districts WHERE province_code=? AND is_active=1 AND (full_name LIKE ? OR name LIKE ?) ORDER BY code LIMIT 2');
        if (!$fallback) return false;
        $fallback->bind_param('sss', $provinceCode, $pattern, $pattern);
        $fallback->execute();
        $fallbackName = null; $matches = array();
        $fallback->bind_result($fallbackName);
        while ($fallback->fetch()) $matches[] = (string)$fallbackName;
        $fallback->close();
        if (count($matches) === 1) return $matches[0];
    }
    return false;
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
        voucher_code VARCHAR(40) NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
        amount_received DECIMAL(12,2) NOT NULL DEFAULT 0,
        change_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
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

function aurora_ensure_online_payments($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        method VARCHAR(20) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        reference_code VARCHAR(80) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL,
        INDEX idx_payments_order (order_id),
        UNIQUE KEY uq_payments_reference (reference_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_ensure_order_voucher_column($db) {
    $column = $db->query("SHOW COLUMNS FROM orders LIKE 'voucher_code'");
    if ($column && $column->num_rows > 0) return true;
    return (bool)$db->query("ALTER TABLE orders ADD COLUMN voucher_code VARCHAR(40) NULL AFTER discount_amount");
}

function aurora_promotion_payload($row) {
    $limit = (int)$row['usage_limit'];
    $used = (int)$row['used_count'];
    return array(
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'code' => $row['code'],
        'description' => $row['short_description'],
        'details' => $row['details'],
        'terms' => $row['terms_text'],
        'category' => $row['category'],
        'audience' => $row['audience'],
        'badge' => $row['badge_text'],
        'themeColor' => $row['theme_color'],
        'imageUrl' => $row['image_url'],
        'discountType' => $row['discount_type'],
        'discountValue' => (float)$row['discount_value'],
        'minOrderAmount' => (float)$row['min_order_amount'],
        'maxDiscount' => (float)$row['max_discount'],
        'startsAt' => $row['starts_at'],
        'endsAt' => $row['ends_at'],
        'usageLimit' => $limit,
        'usedCount' => $used,
        'remainingUses' => $limit > 0 ? max(0, $limit - $used) : null,
        'isFeatured' => (bool)$row['is_featured']
    );
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

if ($resource === 'address_provinces') {
    aurora_method('GET');
    if (!aurora_ensure_administrative_catalog($db)) aurora_response(array('message'=>'Không thể chuẩn bị danh mục tỉnh/thành trong aurora_db.'), 500);
    $result = $db->query('SELECT code,name,full_name FROM administrative_provinces WHERE is_active=1 ORDER BY sort_order,name');
    if (!$result) aurora_response(array('message'=>'Không thể tải danh mục tỉnh/thành.'), 500);
    $provinces = array();
    while ($row = $result->fetch_assoc()) {
        $aliases = array();
        if ($row['name'] === 'Hồ Chí Minh') $aliases[] = 'TP. Hồ Chí Minh';
        if ($row['name'] === 'Huế') $aliases[] = 'Thừa Thiên Huế';
        $provinces[] = array('code'=>$row['code'], 'name'=>$row['name'], 'fullName'=>$row['full_name'], 'aliases'=>$aliases);
    }
    aurora_response(array('provinces'=>$provinces, 'source'=>'aurora_db', 'datasetVersion'=>'VN-63-v2.4.1'), 200);
}

if ($resource === 'address_districts') {
    aurora_method('GET');
    if (!aurora_ensure_administrative_catalog($db)) aurora_response(array('message'=>'Không thể chuẩn bị danh mục quận/huyện trong aurora_db.'), 500);
    $provinceCode = isset($_GET['province_code']) ? trim((string)$_GET['province_code']) : '';
    if (!preg_match('/^\d{2}$/', $provinceCode)) aurora_response(array('message'=>'Mã tỉnh/thành không hợp lệ.'), 422);
    $provinceCodeEsc = $db->real_escape_string($provinceCode);
    $provinceResult = $db->query("SELECT code FROM administrative_provinces WHERE code='{$provinceCodeEsc}' AND is_active=1 LIMIT 1");
    if (!$provinceResult || !$provinceResult->num_rows) aurora_response(array('message'=>'Không tìm thấy tỉnh/thành đã chọn.'), 404);
    $stmt = $db->prepare('SELECT code,full_name FROM administrative_districts WHERE province_code=? AND is_active=1 ORDER BY sort_order,full_name');
    if (!$stmt) aurora_response(array('message'=>'Không thể tải danh mục quận/huyện.'), 500);
    $stmt->bind_param('s', $provinceCode);
    $stmt->execute();
    $code = $fullName = null;
    $stmt->bind_result($code, $fullName);
    $districts = array();
    while ($stmt->fetch()) $districts[] = array('code'=>(string)$code, 'name'=>(string)$fullName);
    $stmt->close();
    aurora_response(array('provinceCode'=>$provinceCode, 'districts'=>$districts, 'source'=>'aurora_db'), 200);
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
        $entity = $db->query("SELECT id FROM vouchers WHERE id={$entityId} AND status='active' AND starts_at <= NOW() AND ends_at >= NOW() AND (usage_limit=0 OR used_count < usage_limit) LIMIT 1");
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

// Customer offer catalogue backed by the same aurora_db.vouchers records used
// at checkout and by TMS. Only usable campaigns are exposed publicly.
if ($resource === 'promotions' || $resource === 'promotion_detail') {
    if (!aurora_ensure_vouchers($db)) aurora_response(array('message' => 'Không thể đọc danh mục ưu đãi.'), 500);
    $detailId = $resource === 'promotion_detail' && isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($resource === 'promotion_detail' && $detailId < 1) aurora_response(array('message' => 'Ưu đãi không hợp lệ.'), 422);
    $detailWhere = $detailId > 0 ? ' AND id=' . $detailId : '';
    $sql = "SELECT id, name, code, short_description, details, terms_text, category, audience,
                   badge_text, theme_color, image_url, discount_type, discount_value,
                   min_order_amount, max_discount, starts_at, ends_at, usage_limit,
                   used_count, is_featured
            FROM vouchers
            WHERE status='active' AND starts_at <= NOW() AND ends_at >= NOW()
              AND (usage_limit=0 OR used_count < usage_limit)" . $detailWhere . "
            ORDER BY is_featured DESC, sort_order ASC, ends_at ASC, id DESC";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $promotions = array();
    while ($row = $result->fetch_assoc()) $promotions[] = aurora_promotion_payload($row);
    if ($resource === 'promotion_detail') {
        if (!count($promotions)) aurora_response(array('message' => 'Ưu đãi không tồn tại hoặc đã hết hiệu lực.'), 404);
        aurora_response(array('promotion' => $promotions[0]), 200);
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
        KEY idx_seat_hold_session (session_key, showtime_id),
        CONSTRAINT fk_seat_holds_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function aurora_ensure_showtime_seat_locks($db) {
    return $db->query("CREATE TABLE IF NOT EXISTS tms_showtime_seat_locks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        showtime_id BIGINT UNSIGNED NOT NULL,
        seat_id BIGINT UNSIGNED NOT NULL,
        reason VARCHAR(255) NOT NULL DEFAULT '',
        locked_by VARCHAR(120) NOT NULL,
        locked_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_tms_showtime_seat_lock (showtime_id, seat_id),
        KEY idx_tms_showtime_seat_lock_seat (seat_id),
        CONSTRAINT fk_tms_seat_lock_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE,
        CONSTRAINT fk_tms_seat_lock_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
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

// A membership card is a durable record in aurora_db, not a number assembled
// in the browser. It is created lazily for existing customers.
function aurora_ensure_membership_card_schema($db) {
    $created = $db->query("CREATE TABLE IF NOT EXISTS customer_membership_cards (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        card_number BIGINT UNSIGNED NOT NULL,
        activated_at DATETIME NOT NULL,
        expires_at DATE NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_membership_card_user (user_id),
        UNIQUE KEY uq_membership_card_number (card_number)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    if (!$created) return false;

    // Older installations stored values such as AUR26100000016EB3E2. Convert
    // every existing card to a stable 19-digit number before enforcing a
    // numeric database column. Format: YYMM + 13-digit user id + 2 checksums.
    $columnResult = $db->query("SHOW COLUMNS FROM customer_membership_cards LIKE 'card_number'");
    $column = $columnResult ? $columnResult->fetch_assoc() : false;
    $columnType = $column && isset($column['Type']) ? strtolower((string)$column['Type']) : '';
    if (strpos($columnType, 'bigint') !== 0) {
        $numberSql = "CONCAT(DATE_FORMAT(activated_at,'%y%m'),LPAD(user_id,13,'0'),LPAD(MOD(CRC32(CONCAT('aurora-member-',DATE_FORMAT(activated_at,'%y%m'),LPAD(user_id,13,'0'))),100),2,'0'))";
        if (!$db->query("UPDATE customer_membership_cards SET card_number={$numberSql}, updated_at=NOW()")) return false;
        if (!$db->query('ALTER TABLE customer_membership_cards MODIFY card_number BIGINT UNSIGNED NOT NULL')) return false;
    }
    return true;
}

function aurora_numeric_membership_number($userId) {
    $userPart = str_pad((string)(int)$userId, 13, '0', STR_PAD_LEFT);
    if (strlen($userPart) > 13) $userPart = substr($userPart, -13);
    $base = date('ym').$userPart;
    $crc = sprintf('%u', crc32('aurora-member-'.$base));
    return $base.str_pad(substr($crc, -2), 2, '0', STR_PAD_LEFT);
}

function aurora_membership_card_for_user($db, $userId) {
    $userId = (int)$userId;
    if (!aurora_ensure_membership_card_schema($db)) return null;
    $existing = $db->query("SELECT card_number, activated_at, expires_at FROM customer_membership_cards WHERE user_id={$userId} LIMIT 1");
    if ($existing && ($card = $existing->fetch_assoc())) return $card;
    $number = aurora_numeric_membership_number($userId);
    $safeNumber = $db->real_escape_string($number);
    $inserted = $db->query("INSERT IGNORE INTO customer_membership_cards (user_id, card_number, activated_at, expires_at, created_at, updated_at) VALUES ({$userId}, '{$safeNumber}', NOW(), DATE_ADD(CURDATE(), INTERVAL 5 YEAR), NOW(), NOW())");
    if ($inserted !== false) {
        $created = $db->query("SELECT card_number, activated_at, expires_at FROM customer_membership_cards WHERE user_id={$userId} LIMIT 1");
        if ($created && ($card = $created->fetch_assoc())) return $card;
    }
    return null;
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
    if (!aurora_ensure_seat_holds($db) || !aurora_ensure_showtime_seat_locks($db)) aurora_response(array('message'=>'Không thể tải trạng thái ghế.'), 500);
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
                    WHERE h.showtime_id=st.id AND h.expires_at > '{$visibilityNow}') AS held_seats,
                   (SELECT COUNT(DISTINCT sl.seat_id) FROM tms_showtime_seat_locks sl
                    WHERE sl.showtime_id=st.id) AS locked_seats
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
        $row['held_seats']=(int)$row['held_seats']; $row['locked_seats']=(int)$row['locked_seats']; $row['ticket_price']=(float)$row['ticket_price'];
        $row['seats_left']=max(0,$row['total_seats']-$row['booked_seats']-$row['held_seats']-$row['locked_seats']);
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
    if (!aurora_ensure_seat_holds($db) || !aurora_ensure_showtime_seat_locks($db)) aurora_response(array('message' => 'Không thể khởi tạo trạng thái ghế.'), 500);
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
            CASE WHEN EXISTS (SELECT 1 FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE bs.seat_id=seats.id AND b.showtime_id=".(int)$showtimeId." AND b.status NOT IN ('CANCELLED','EXPIRED')) OR EXISTS (SELECT 1 FROM seat_holds h WHERE h.showtime_id=".(int)$showtimeId." AND h.seat_id=seats.id AND h.expires_at > '".$nowEsc."' AND h.session_key <> '".$sessionEsc."') OR EXISTS (SELECT 1 FROM tms_showtime_seat_locks sl WHERE sl.showtime_id=".(int)$showtimeId." AND sl.seat_id=seats.id) THEN 0 ELSE 1 END AS is_available,
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
    if (!aurora_ensure_seat_holds($db) || !aurora_ensure_showtime_seat_locks($db)) aurora_response(array('message' => 'Không thể khởi tạo trạng thái ghế.'), 500);
    aurora_cleanup_seat_holds($db); $now = aurora_vietnam_now(); $nowEsc = $db->real_escape_string($now); $sessionEsc = $db->real_escape_string(session_id());
    $validIds = array(); foreach ($seatIds as $seatId) if ($seatId > 0) $validIds[] = $seatId; $seatIds = $validIds;
    $expiresAt = date('Y-m-d H:i:s', strtotime($now.' +10 minutes')); $userId = isset($_SESSION['aurora_user_id']) ? (int)$_SESSION['aurora_user_id'] : 0;
    $db->autocommit(false);
    try {
        // Lock the parent showtime inside the same transaction. A concurrent
        // TMS deletion must now finish either before or after this hold, so a
        // stale customer request can never recreate an orphan seat_holds row.
        $showtime = $db->query("SELECT screen_id FROM showtimes WHERE id={$showtimeId} AND status='OPEN' AND starts_at > '{$nowEsc}' FOR UPDATE");
        if (!$showtime || !($showtimeRow = $showtime->fetch_assoc())) throw new Exception('Suất chiếu đã bắt đầu hoặc không còn mở bán.');
        $db->query("DELETE FROM seat_holds WHERE showtime_id={$showtimeId} AND session_key='{$sessionEsc}'");
        if (count($seatIds)) {
            $idSql = implode(',', $seatIds); $valid=$db->query("SELECT id FROM seats WHERE screen_id=".(int)$showtimeRow['screen_id']." AND id IN ({$idSql})");
            if (!$valid || $valid->num_rows !== count($seatIds)) throw new Exception('Ghế không thuộc phòng chiếu này.');
            $conflict=$db->query("SELECT seat_id FROM seat_holds WHERE showtime_id={$showtimeId} AND seat_id IN ({$idSql}) AND expires_at > '{$nowEsc}' AND session_key <> '{$sessionEsc}' LIMIT 1");
            if ($conflict && $conflict->num_rows) throw new Exception('Một ghế vừa được khách khác giữ. Vui lòng chọn ghế khác.');
            $booked=$db->query("SELECT bs.seat_id FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id={$showtimeId} AND bs.seat_id IN ({$idSql}) AND b.status NOT IN ('CANCELLED','EXPIRED') LIMIT 1");
            if ($booked && $booked->num_rows) throw new Exception('Một ghế vừa được đặt. Vui lòng chọn ghế khác.');
            $locked=$db->query("SELECT seat_id FROM tms_showtime_seat_locks WHERE showtime_id={$showtimeId} AND seat_id IN ({$idSql}) LIMIT 1");
            if ($locked && $locked->num_rows) throw new Exception('Một hoặc nhiều ghế đã được rạp khóa cho suất chiếu này.');
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
    $bytes = function_exists('openssl_random_pseudo_bytes') ? openssl_random_pseudo_bytes(22) : false;
    for ($i = 0; $i < 22; $i++) {
        $salt .= $chars[$bytes !== false ? (ord($bytes[$i]) % 64) : mt_rand(0, 63)];
    }
    return crypt($password, '$2y$10$' . $salt);
}

function aurora_password_verify($password, $hash) {
    return crypt($password, $hash) === $hash;
}

function aurora_ensure_password_reset_schema($db) {
    $created = $db->query("CREATE TABLE IF NOT EXISTS customer_password_reset_requests (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        selector CHAR(40) NOT NULL,
        lookup_hash CHAR(64) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        reset_token_hash CHAR(64) NULL,
        status ENUM('pending','verified','used','expired','locked') NOT NULL DEFAULT 'pending',
        attempts_remaining TINYINT UNSIGNED NOT NULL DEFAULT 5,
        delivery_status ENUM('development','sent','failed','not_applicable') NOT NULL DEFAULT 'not_applicable',
        ip_address_hash CHAR(64) NOT NULL,
        user_agent VARCHAR(255) NULL,
        expires_at DATETIME NOT NULL,
        verified_until DATETIME NULL,
        requested_at DATETIME NOT NULL,
        verified_at DATETIME NULL,
        completed_at DATETIME NULL,
        UNIQUE KEY uq_password_reset_selector (selector),
        KEY idx_password_reset_lookup (lookup_hash, requested_at),
        KEY idx_password_reset_user (user_id, status, requested_at),
        KEY idx_password_reset_ip (ip_address_hash, requested_at),
        CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
    if (!$created) return false;
    $column = $db->query("SHOW COLUMNS FROM users LIKE 'password_changed_at'");
    if ((!$column || !$column->num_rows) && !$db->query('ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL')) return false;
    return true;
}

function aurora_password_reset_hash($value, $selector) {
    $pepper = aurora_env('APP_KEY', 'aurora-cinema-password-reset');
    return hash_hmac('sha256', (string)$selector.'|'.(string)$value, $pepper);
}

function aurora_password_reset_code() {
    if (function_exists('openssl_random_pseudo_bytes')) {
        $bytes = openssl_random_pseudo_bytes(4);
        if ($bytes !== false) {
            $parts = unpack('Nvalue', $bytes);
            return str_pad((string)($parts['value'] % 1000000), 6, '0', STR_PAD_LEFT);
        }
    }
    return str_pad((string)mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
}

function aurora_password_reset_send_email($email, $name, $code, $isConfirmation) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return false;
    $from = aurora_env('MAIL_FROM_ADDRESS', 'no-reply@auroracinema.local');
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) $from = 'no-reply@auroracinema.local';
    $headers = "From: Aurora Cinema <".$from.">\r\n";
    $headers .= "Reply-To: ".$from."\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    if ($isConfirmation) {
        $subject = 'Aurora Cinema - Mat khau da duoc thay doi';
        $message = "Xin chao ".$name.",\r\n\r\nMat khau Aurora cua ban vua duoc thay doi thanh cong.\r\nNeu ban khong thuc hien thao tac nay, vui long lien he Aurora Cinema ngay.\r\n\r\nAurora Cinema";
    } else {
        $subject = 'Aurora Cinema - Ma xac minh dat lai mat khau';
        $message = "Xin chao ".$name.",\r\n\r\nMa xac minh dat lai mat khau cua ban la: ".$code."\r\nMa co hieu luc trong 10 phut va chi duoc su dung mot lan.\r\nNeu ban khong yeu cau, hay bo qua email nay.\r\n\r\nAurora Cinema";
    }
    return @mail($email, $subject, wordwrap($message, 70, "\r\n"), $headers);
}

function aurora_ensure_profile_schema($db) {
    static $ready = null;
    if ($ready !== null) return $ready;

    $schemaResult = $db->query("SELECT DEFAULT_CHARACTER_SET_NAME AS charset_name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='aurora_db' LIMIT 1");
    $schemaRow = $schemaResult ? $schemaResult->fetch_assoc() : false;
    if (!$schemaRow || strtolower((string)$schemaRow['charset_name']) !== 'utf8') {
        if (!$db->query('ALTER DATABASE aurora_db CHARACTER SET utf8 COLLATE utf8_general_ci')) { $ready = false; return false; }
    }
    $tableStatus = $db->query("SHOW TABLE STATUS LIKE 'users'");
    $tableRow = $tableStatus ? $tableStatus->fetch_assoc() : false;
    $collation = $tableRow && isset($tableRow['Collation']) ? strtolower((string)$tableRow['Collation']) : '';
    if (strpos($collation, 'utf8') !== 0 && !$db->query('ALTER TABLE users CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci')) {
        $ready = false; return false;
    }

    $definitions = array(
        'phone' => 'VARCHAR(20) NULL',
        'id_number' => 'VARCHAR(30) NULL',
        'birthday' => 'DATE NULL',
        'gender' => "ENUM('male','female','other') NULL",
        'city' => 'VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL',
        'district' => 'VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL',
        'address' => 'VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL',
        'avatar_url' => 'VARCHAR(500) CHARACTER SET utf8 COLLATE utf8_general_ci NULL'
    );
    foreach ($definitions as $columnName => $definition) {
        $column = $db->query("SHOW COLUMNS FROM users LIKE '".$db->real_escape_string($columnName)."'");
        if ((!$column || !$column->num_rows) && !$db->query("ALTER TABLE users ADD COLUMN {$columnName} {$definition}")) {
            $ready = false; return false;
        }
    }

    $cityColumn = $db->query("SHOW FULL COLUMNS FROM users LIKE 'city'");
    $cityRow = $cityColumn ? $cityColumn->fetch_assoc() : false;
    $birthdayColumn = $db->query("SHOW COLUMNS FROM users LIKE 'birthday'");
    $birthdayRow = $birthdayColumn ? $birthdayColumn->fetch_assoc() : false;
    if (!$cityRow || strpos(strtolower((string)$cityRow['Collation']), 'utf8') !== 0 || strtoupper((string)$cityRow['Null']) !== 'YES' || !$birthdayRow || strtoupper((string)$birthdayRow['Null']) !== 'YES') {
        $normalized = $db->query("ALTER TABLE users
            MODIFY full_name VARCHAR(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
            MODIFY phone VARCHAR(20) NULL,
            MODIFY id_number VARCHAR(30) NULL,
            MODIFY birthday DATE NULL,
            MODIFY gender ENUM('male','female','other') NULL,
            MODIFY city VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
            MODIFY district VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
            MODIFY address VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
            MODIFY avatar_url VARCHAR(500) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
            MODIFY updated_at DATETIME NULL");
        if (!$normalized) { $ready = false; return false; }
    }

    // Recover values damaged by the legacy latin1 columns from aurora_db's
    // authoritative administrative catalogue. These statements are safe to
    // run repeatedly and do not invent location names.
    if (aurora_ensure_administrative_catalog($db)) {
        $db->query("UPDATE users u INNER JOIN administrative_provinces p ON p.code='79' SET u.city=p.name WHERE u.city LIKE 'TP. H? Ch%'");
        $db->query("UPDATE users u INNER JOIN administrative_provinces p ON p.code='82' SET u.city=p.name WHERE u.city='Ti?n Giang'");
        $db->query("UPDATE users u INNER JOIN administrative_districts d ON d.code='760' SET u.district=d.full_name WHERE u.district='Qu?n 1'");
        $db->query("UPDATE users u INNER JOIN administrative_districts d ON d.code_name='cho_gao' SET u.district=d.full_name WHERE u.district='Huy?n Ch? G?o'");
    }
    $ready = true;
    return true;
}

function aurora_public_asset_url($value) {
    $url = trim((string)$value);
    if ($url === '' || preg_match('#^(https?:)?//#i', $url) || preg_match('#^(data|blob):#i', $url)) return $url;

    $https = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    $scheme = $https ? 'https' : 'http';
    $host = isset($_SERVER['HTTP_HOST']) ? trim((string)$_SERVER['HTTP_HOST']) : 'localhost';
    if ($host === '' || !preg_match('/^[A-Za-z0-9.\-:\[\]]+$/', $host)) $host = 'localhost';
    return $scheme.'://'.$host.'/'.ltrim($url, '/');
}

function aurora_profile_for_user($db, $id) {
    if (!aurora_ensure_profile_schema($db)) return null;
    $stmt = $db->prepare('SELECT id,full_name,email,phone,id_number,birthday,gender,city,district,address,avatar_url,membership_level,points,created_at FROM users WHERE id=? LIMIT 1');
    if (!$stmt) return null;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $uid = $fullName = $email = $phone = $idNumber = $birthday = $gender = $city = $district = $address = $avatarUrl = $membershipLevel = $points = $createdAt = null;
    $stmt->bind_result($uid,$fullName,$email,$phone,$idNumber,$birthday,$gender,$city,$district,$address,$avatarUrl,$membershipLevel,$points,$createdAt);
    $found = $stmt->fetch();
    $stmt->close();
    if (!$found) return null;
    return array(
        'id'=>(int)$uid, 'fullName'=>$fullName, 'email'=>$email, 'phone'=>$phone,
        'idNumber'=>$idNumber, 'birthday'=>$birthday, 'gender'=>$gender, 'city'=>$city,
        'district'=>$district, 'address'=>$address, 'avatarUrl'=>aurora_public_asset_url($avatarUrl),
        'membershipLevel'=>$membershipLevel, 'points'=>(int)$points, 'createdAt'=>$createdAt
    );
}

function aurora_public_user($db, $id) {
    aurora_ensure_profile_schema($db);
    $stmt = $db->prepare('SELECT id, full_name, email, membership_level, points, avatar_url FROM users WHERE id = ?');
    if (!$stmt) return null;
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $uid = null; $fullName = null; $email = null; $membershipLevel = null; $points = null; $avatarUrl = null;
    $stmt->bind_result($uid, $fullName, $email, $membershipLevel, $points, $avatarUrl);
    $found = $stmt->fetch();
    $stmt->close();
    if (!$found) return null;
    return array(
        'id'              => (int) $uid,
        'fullName'        => $fullName,
        'email'           => $email,
        'membershipLevel' => $membershipLevel,
        'points'          => (int) $points,
        'avatarUrl'       => aurora_public_asset_url($avatarUrl),
    );
}

// Avatar URLs are profile data stored in aurora_db; the image file itself is
// kept outside the database in a public, user-scoped upload directory.
function aurora_ensure_profile_avatar_schema($db) {
    return aurora_ensure_profile_schema($db);
}

function aurora_ensure_avatar_upload_schema($db) {
    $created = $db->query("CREATE TABLE IF NOT EXISTS customer_avatar_uploads (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        avatar_url VARCHAR(500) NOT NULL,
        storage_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(50) NOT NULL,
        byte_size INT UNSIGNED NOT NULL,
        image_width INT UNSIGNED NOT NULL,
        image_height INT UNSIGNED NOT NULL,
        source_width INT UNSIGNED NULL,
        source_height INT UNSIGNED NULL,
        crop_offset_x DECIMAL(7,4) NULL,
        crop_offset_y DECIMAL(7,4) NULL,
        crop_zoom DECIMAL(7,4) NULL,
        crop_output_size INT UNSIGNED NULL,
        status ENUM('ACTIVE','REPLACED','DELETED') NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME NOT NULL,
        deleted_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_customer_avatar_user_status (user_id, status),
        CONSTRAINT fk_customer_avatar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
    if (!$created) return false;
    $definitions = array(
        'source_width' => 'INT UNSIGNED NULL',
        'source_height' => 'INT UNSIGNED NULL',
        'crop_offset_x' => 'DECIMAL(7,4) NULL',
        'crop_offset_y' => 'DECIMAL(7,4) NULL',
        'crop_zoom' => 'DECIMAL(7,4) NULL',
        'crop_output_size' => 'INT UNSIGNED NULL'
    );
    foreach ($definitions as $columnName => $definition) {
        $column = $db->query("SHOW COLUMNS FROM customer_avatar_uploads LIKE '".$db->real_escape_string($columnName)."'");
        if ((!$column || !$column->num_rows) && !$db->query("ALTER TABLE customer_avatar_uploads ADD COLUMN {$columnName} {$definition}")) return false;
    }
    return true;
}

function aurora_avatar_upload_error($code) {
    if ($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE) return 'Ảnh vượt quá giới hạn 5 MB.';
    if ($code === UPLOAD_ERR_PARTIAL) return 'Ảnh chỉ được tải lên một phần. Vui lòng thử lại.';
    if ($code === UPLOAD_ERR_NO_FILE) return 'Vui lòng chọn một ảnh đại diện.';
    if ($code === UPLOAD_ERR_NO_TMP_DIR) return 'Máy chủ thiếu thư mục tạm để nhận ảnh.';
    if ($code === UPLOAD_ERR_CANT_WRITE) return 'Máy chủ không thể ghi tệp ảnh.';
    if (defined('UPLOAD_ERR_EXTENSION') && $code === UPLOAD_ERR_EXTENSION) return 'Tải ảnh bị chặn bởi cấu hình PHP.';
    return 'Tải ảnh lên không thành công. Vui lòng thử lại.';
}

function aurora_avatar_storage_path($avatarUrl, $directory) {
    $path = parse_url((string)$avatarUrl, PHP_URL_PATH);
    if (!$path || !preg_match('/\/uploads\/avatars\/(avatar_[0-9]+_[A-Za-z0-9]+\.(jpg|png))$/i', $path, $matches)) return '';
    return $directory.DIRECTORY_SEPARATOR.$matches[1];
}

// ── OAuth helpers (Google/Facebook) ──────────────────────────────────────────

function aurora_env($name, $defaultValue) {
    static $fileValues = null;
    $environmentValue = getenv($name);
    if ($environmentValue !== false && $environmentValue !== '') return $environmentValue;

    if ($fileValues === null) {
        $environmentFile = dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . '.env';
        $fileValues = is_file($environmentFile) ? parse_ini_file($environmentFile, false) : array();
        if (!is_array($fileValues)) $fileValues = array();
    }
    return isset($fileValues[$name]) && $fileValues[$name] !== '' ? $fileValues[$name] : $defaultValue;
}

function aurora_get_system_config($db, $key, $fallback) {
    static $configCache = null;
    $envKey = $key === 'oauth_sandbox_enabled'
        ? 'OAUTH_SANDBOX_ENABLED'
        : strtoupper(str_replace('oauth_', '', $key));
    $environmentValue = aurora_env($envKey, '');
    if ($environmentValue !== '') return $environmentValue;

    if ($configCache === null) {
        $configCache = array();
        if ($db instanceof mysqli) {
            $res = $db->query("SELECT config_key, config_value FROM system_configs");
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $configCache[$row['config_key']] = $row['config_value'];
                }
                $res->free();
            }
        }
    }
    if (isset($configCache[$key]) && $configCache[$key] !== '') {
        return $configCache[$key];
    }
    return $fallback;
}

function aurora_oauth_config($provider, $db = null) {
    if ($db === null) {
        global $db;
    }
    $provider = strtolower((string) $provider);
    if ($provider === 'google') {
        $clientId = trim((string) ($db ? aurora_get_system_config($db, 'oauth_google_client_id', '') : aurora_env('GOOGLE_CLIENT_ID', '')));
        $clientSecret = trim((string) ($db ? aurora_get_system_config($db, 'oauth_google_client_secret', '') : aurora_env('GOOGLE_CLIENT_SECRET', '')));
        $redirectUri = trim((string) ($db ? aurora_get_system_config($db, 'oauth_google_redirect_uri', '') : aurora_env('GOOGLE_REDIRECT_URI', '')));
        if ($redirectUri === '') {
            $redirectUri = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=google';
        }
        $isLive = ($clientId !== '' && $clientSecret !== '');

        return array(
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'is_live' => $isLive,
            'is_sandbox' => false,
            'configured' => $isLive,
            'authorization_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url' => 'https://oauth2.googleapis.com/token',
            'profile_url' => 'https://openidconnect.googleapis.com/v1/userinfo',
        );
    }
    if ($provider === 'facebook') {
        $clientId = trim((string) ($db ? aurora_get_system_config($db, 'oauth_facebook_client_id', '') : aurora_env('FACEBOOK_CLIENT_ID', '')));
        $clientSecret = trim((string) ($db ? aurora_get_system_config($db, 'oauth_facebook_client_secret', '') : aurora_env('FACEBOOK_CLIENT_SECRET', '')));
        $redirectUri = trim((string) ($db ? aurora_get_system_config($db, 'oauth_facebook_redirect_uri', '') : aurora_env('FACEBOOK_REDIRECT_URI', '')));
        if ($redirectUri === '') {
            $redirectUri = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=facebook';
        }
        $configuredVersion = $db
            ? aurora_get_system_config($db, 'oauth_facebook_graph_version', aurora_env('FACEBOOK_GRAPH_VERSION', 'v25.0'))
            : aurora_env('FACEBOOK_GRAPH_VERSION', 'v25.0');
        $version = preg_match('/^v[0-9]+\.[0-9]+$/', (string) $configuredVersion) ? (string) $configuredVersion : 'v25.0';
        // Meta App IDs are numeric. Requiring a non-trivial secret prevents demo values
        // from accidentally enabling a fake or unusable Facebook login flow.
        $isLive = (bool) preg_match('/^[0-9]{6,30}$/', $clientId) && strlen($clientSecret) >= 16;

        return array(
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'graph_version' => $version,
            'is_live' => $isLive,
            'is_sandbox' => false,
            'configured' => $isLive,
            'authorization_url' => 'https://www.facebook.com/' . $version . '/dialog/oauth',
            'token_url' => 'https://graph.facebook.com/' . $version . '/oauth/access_token',
            'profile_url' => 'https://graph.facebook.com/' . $version . '/me',
            'debug_token_url' => 'https://graph.facebook.com/' . $version . '/debug_token',
        );
    }
    return null;
}

function aurora_oauth_random_token() {
    if (function_exists('openssl_random_pseudo_bytes')) {
        $bytes = openssl_random_pseudo_bytes(32);
        if ($bytes !== false) return bin2hex($bytes);
    }
    return sha1(uniqid(mt_rand(), true)) . sha1(uniqid(mt_rand(), true));
}

function aurora_oauth_base64url($value) {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function aurora_oauth_safe_equals($known, $provided) {
    if (function_exists('hash_equals')) return hash_equals((string) $known, (string) $provided);
    $known = (string) $known; $provided = (string) $provided;
    if (strlen($known) !== strlen($provided)) return false;
    $result = 0;
    for ($i = 0; $i < strlen($known); $i++) $result |= ord($known[$i]) ^ ord($provided[$i]);
    return $result === 0;
}

function aurora_oauth_windows_curl_config_line($name, $value) {
    $value = (string) $value;
    if (preg_match('/[\x00-\x1F\x7F]/', $value)) return false;
    $value = str_replace(array('\\', '"'), array('\\\\', '\\"'), $value);
    return $name . ' = "' . $value . '"' . "\n";
}

function aurora_oauth_windows_curl_request($url, $method, $headers, $requestBody) {
    if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
        return array('ok' => false, 'message' => 'Không có phương thức kết nối HTTPS an toàn thay thế trên máy chủ này.');
    }
    if (!function_exists('proc_open') || strpos((string) ini_get('disable_functions'), 'proc_open') !== false) {
        return array('ok' => false, 'message' => 'PHP không cho phép khởi chạy Windows curl.exe để xác minh TLS.');
    }

    $systemRoot = getenv('SystemRoot');
    if ($systemRoot === false) $systemRoot = getenv('WINDIR');
    $systemRoot = str_replace('\\', '/', (string) $systemRoot);
    if (!preg_match('/^[A-Za-z]:\/[A-Za-z0-9_.\/-]+$/', $systemRoot)) {
        return array('ok' => false, 'message' => 'Không xác định được đường dẫn Windows curl.exe an toàn.');
    }
    $curlBinary = rtrim($systemRoot, '/') . '/System32/curl.exe';
    if (!is_file($curlBinary)) {
        return array('ok' => false, 'message' => 'Không tìm thấy Windows curl.exe để xác minh TLS.');
    }

    $config = aurora_oauth_windows_curl_config_line('url', $url);
    if ($config === false) return array('ok' => false, 'message' => 'Yêu cầu OAuth chứa dữ liệu không hợp lệ.');
    if ($method === 'POST') {
        $config .= "request = \"POST\"\n";
        $configLine = aurora_oauth_windows_curl_config_line('data', $requestBody);
        if ($configLine === false) return array('ok' => false, 'message' => 'Yêu cầu OAuth chứa dữ liệu không hợp lệ.');
        $config .= $configLine;
    }
    foreach ($headers as $header) {
        $configLine = aurora_oauth_windows_curl_config_line('header', $header);
        if ($configLine === false) return array('ok' => false, 'message' => 'Yêu cầu OAuth chứa header không hợp lệ.');
        $config .= $configLine;
    }
    $config .= "connect-timeout = 10\nmax-time = 20\n";

    $command = $curlBinary . ' --config - --silent --show-error --write-out __AURORA_HTTP_STATUS__%{http_code}';
    $pipes = array();
    $process = @proc_open($command, array(
        0 => array('pipe', 'r'),
        1 => array('pipe', 'w'),
        2 => array('pipe', 'w'),
    ), $pipes);
    if (!is_resource($process)) {
        return array('ok' => false, 'message' => 'Không thể khởi chạy Windows curl.exe để kết nối OAuth.');
    }

    fwrite($pipes[0], $config);
    fclose($pipes[0]);
    $output = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $errorOutput = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    if (!preg_match('/__AURORA_HTTP_STATUS__(\d{3})$/', $output, $matches)) {
        $detail = trim((string) $errorOutput);
        if ($detail !== '') $detail = ': ' . substr($detail, 0, 300);
        return array('ok' => false, 'message' => 'Windows curl.exe không thể kết nối an toàn tới máy chủ OAuth' . $detail);
    }

    $body = substr($output, 0, -strlen($matches[0]));
    if ($exitCode !== 0) {
        $detail = trim((string) $errorOutput);
        if ($detail !== '') $detail = ': ' . substr($detail, 0, 300);
        return array('ok' => false, 'message' => 'Windows curl.exe không thể kết nối an toàn tới máy chủ OAuth' . $detail);
    }
    return array('ok' => true, 'body' => $body, 'status' => (int) $matches[1]);
}

function aurora_oauth_http($url, $method, $fields, $accessToken) {
    if (!function_exists('curl_init')) return array('ok' => false, 'message' => 'PHP cURL chưa được bật trên máy chủ.');
    $curl = curl_init();
    $headers = array('Accept: application/json');
    $requestBody = '';
    if ($accessToken !== '') $headers[] = 'Authorization: Bearer ' . $accessToken;
    if ($method === 'POST') {
        $requestBody = http_build_query($fields, '', '&');
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $requestBody);
        $headers[] = 'Content-Type: application/x-www-form-urlencoded';
    } elseif (count($fields)) {
        $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($fields, '', '&');
    }
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($curl, CURLOPT_TIMEOUT, 20);
    curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, true);
    $body = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlErrno = curl_errno($curl);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($body === false && $curlErrno === 60 && strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        $fallback = aurora_oauth_windows_curl_request($url, $method, $headers, $requestBody);
        if (!$fallback['ok']) return array('ok' => false, 'message' => $fallback['message']);
        $body = $fallback['body'];
        $status = $fallback['status'];
    }
    if ($body === false) return array('ok' => false, 'message' => 'Không thể kết nối máy chủ OAuth: ' . $curlError);
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) return array('ok' => false, 'message' => 'Máy chủ OAuth trả về dữ liệu không hợp lệ.');
    if ($status < 200 || $status >= 300) {
        $providerMessage = isset($decoded['error_description']) ? $decoded['error_description']
            : (isset($decoded['error']['message']) ? $decoded['error']['message'] : 'Yêu cầu OAuth bị từ chối.');
        return array('ok' => false, 'data' => $decoded, 'message' => $providerMessage);
    }
    return array('ok' => true, 'data' => $decoded);
}

function aurora_verify_facebook_access_token($config, $accessToken) {
    $appAccessToken = $config['client_id'] . '|' . $config['client_secret'];
    $result = aurora_oauth_http($config['debug_token_url'], 'GET', array(
        'input_token' => $accessToken,
        'access_token' => $appAccessToken,
    ), '');
    if (!$result['ok'] || empty($result['data']['data']) || !is_array($result['data']['data'])) {
        return array('ok' => false, 'message' => 'Facebook không thể xác minh access token.');
    }
    $tokenData = $result['data']['data'];
    $tokenAppId = isset($tokenData['app_id']) ? (string) $tokenData['app_id'] : '';
    $tokenUserId = isset($tokenData['user_id']) ? (string) $tokenData['user_id'] : '';
    if (empty($tokenData['is_valid']) || !aurora_oauth_safe_equals((string) $config['client_id'], $tokenAppId) || $tokenUserId === '') {
        return array('ok' => false, 'message' => 'Access token Facebook không hợp lệ hoặc không thuộc Meta App Aurora.');
    }
    if (isset($tokenData['expires_at']) && (int) $tokenData['expires_at'] > 0 && (int) $tokenData['expires_at'] <= time()) {
        return array('ok' => false, 'message' => 'Access token Facebook đã hết hạn.');
    }
    return array('ok' => true, 'user_id' => $tokenUserId);
}

function aurora_ensure_oauth_schema($db) {
    $accountsCreated = $db->query("CREATE TABLE IF NOT EXISTS oauth_accounts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        provider ENUM('google','facebook') NOT NULL,
        provider_user_id VARCHAR(191) NOT NULL,
        provider_email VARCHAR(180) NULL,
        provider_name VARCHAR(120) NULL,
        avatar_url VARCHAR(500) NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT NULL,
        last_login_at TIMESTAMP NULL DEFAULT NULL,
        UNIQUE KEY uq_oauth_provider_identity (provider, provider_user_id),
        UNIQUE KEY uq_oauth_user_provider (user_id, provider),
        KEY idx_oauth_provider_email (provider_email),
        CONSTRAINT fk_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
    if (!$accountsCreated) return false;
    return $db->query("CREATE TABLE IF NOT EXISTS oauth_login_attempts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        provider ENUM('google','facebook') NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        provider_user_id VARCHAR(191) NULL,
        state_hash CHAR(64) NOT NULL,
        status ENUM('started','succeeded','failed') NOT NULL DEFAULT 'started',
        error_code VARCHAR(60) NULL,
        error_message VARCHAR(255) NULL,
        ip_address_hash CHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        created_at DATETIME NOT NULL,
        completed_at DATETIME NULL,
        KEY idx_oauth_attempt_provider_status (provider, status, created_at),
        KEY idx_oauth_attempt_user (user_id, created_at),
        CONSTRAINT fk_oauth_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
}

function aurora_oauth_attempt_start($db, $provider, $state) {
    if (!aurora_ensure_oauth_schema($db)) return 0;
    $stateHash = hash('sha256', (string) $state);
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $ipHash = $ip === '' ? '' : hash('sha256', $ip . '|' . aurora_env('OAUTH_AUDIT_SALT', 'aurora-cinema'));
    $agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 255) : '';
    $createdAt = date('Y-m-d H:i:s');
    $stmt = $db->prepare("INSERT INTO oauth_login_attempts (provider,state_hash,status,ip_address_hash,user_agent,created_at) VALUES (?,?,'started',?,?,?)");
    if (!$stmt) return 0;
    $stmt->bind_param('sssss', $provider, $stateHash, $ipHash, $agent, $createdAt);
    $ok = $stmt->execute();
    $id = $ok ? (int) $stmt->insert_id : 0;
    $stmt->close();
    return $id;
}

function aurora_oauth_attempt_finish($db, $attemptId, $status, $userId, $providerUserId, $errorCode, $message) {
    $attemptId = (int) $attemptId;
    if ($attemptId <= 0) return;
    $completedAt = date('Y-m-d H:i:s');
    $providerUserId = substr((string) $providerUserId, 0, 191);
    $errorCode = substr((string) $errorCode, 0, 60);
    $message = substr((string) $message, 0, 255);
    $userId = (int) $userId;
    $stmt = $db->prepare('UPDATE oauth_login_attempts SET status=?, user_id=NULLIF(?,0), provider_user_id=NULLIF(?,\'\'), error_code=NULLIF(?,\'\'), error_message=NULLIF(?,\'\'), completed_at=? WHERE id=?');
    if (!$stmt) return;
    $stmt->bind_param('sissssi', $status, $userId, $providerUserId, $errorCode, $message, $completedAt, $attemptId);
    $stmt->execute();
    $stmt->close();
}

function aurora_oauth_finish_url($status, $provider, $message) {
    $frontend = rtrim(aurora_env('CUSTOMER_FRONTEND_URL', 'http://localhost:3000'), '/');
    $query = array('oauth' => $status, 'provider' => $provider);
    if ($message !== '') $query['message'] = $message;
    return $frontend . '/?' . http_build_query($query, '', '&');
}

function aurora_oauth_redirect_error($provider, $message) {
    header('Location: ' . aurora_oauth_finish_url('error', $provider, $message), true, 302);
    exit;
}

function aurora_oauth_unique_username($db, $provider, $providerId) {
    $base = strtolower($provider) . '_' . preg_replace('/[^a-zA-Z0-9]/', '', (string) $providerId);
    $base = substr($base, 0, 50);
    if ($base === strtolower($provider) . '_') $base .= substr(sha1((string) $providerId), 0, 12);
    $candidate = $base;
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
        if (!$stmt) throw new Exception('Không thể kiểm tra tên tài khoản khách hàng.');
        $stmt->bind_param('s', $candidate);
        $stmt->execute();
        $existing = null; $stmt->bind_result($existing); $found = $stmt->fetch(); $stmt->close();
        if (!$found) return $candidate;
        $candidate = substr($base, 0, 50) . '_' . substr(sha1($providerId . '|' . $attempt), 0, 8);
    }
    throw new Exception('Không thể tạo tên tài khoản Aurora duy nhất.');
}

function aurora_oauth_login_user($db, $provider, $profile) {
    if (!aurora_ensure_oauth_schema($db)) throw new Exception('Không thể khởi tạo bảng liên kết OAuth trong aurora_db.');
    $providerId = trim((string) $profile['id']);
    $email = strtolower(trim((string) $profile['email']));
    $name = trim((string) $profile['name']);
    $avatar = trim((string) $profile['avatar']);
    if ($providerId === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Tài khoản mạng xã hội chưa cung cấp email hợp lệ cho Aurora.');
    }
    if ($name === '') {
        $emailParts = explode('@', $email, 2);
        $name = $emailParts[0];
    }
    $name = substr($name, 0, 120);
    $avatar = substr($avatar, 0, 500);
    $now = date('Y-m-d H:i:s');

    $db->autocommit(false);
    try {
        $userId = 0;
        $stmt = $db->prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1 FOR UPDATE');
        if (!$stmt) throw new Exception('Không thể truy vấn tài khoản OAuth.');
        $stmt->bind_param('ss', $provider, $providerId);
        $stmt->execute();
        $linkedUserId = null;
        $stmt->bind_result($linkedUserId);
        if ($stmt->fetch()) $userId = (int) $linkedUserId;
        $stmt->close();

        if (!$userId) {
            $stmt = $db->prepare('SELECT id, role, status FROM users WHERE email = ? LIMIT 1 FOR UPDATE');
            if (!$stmt) throw new Exception('Không thể kiểm tra email tài khoản.');
            $stmt->bind_param('s', $email);
            $stmt->execute();
            $existingUserId = null; $existingRole = null; $existingStatus = null;
            $stmt->bind_result($existingUserId, $existingRole, $existingStatus);
            if ($stmt->fetch()) {
                if ((string) $existingRole !== 'customer') throw new Exception('Email này đang thuộc tài khoản nội bộ và không thể dùng tại cổng khách hàng.');
                if ((string) $existingStatus !== 'active') throw new Exception('Tài khoản Aurora đang bị khóa hoặc ngừng hoạt động.');
                $userId = (int) $existingUserId;
            }
            $stmt->close();
        }

        if ($userId) {
            $stmt = $db->prepare('SELECT role, status FROM users WHERE id = ? LIMIT 1 FOR UPDATE');
            if (!$stmt) throw new Exception('Không thể kiểm tra trạng thái tài khoản Aurora.');
            $stmt->bind_param('i', $userId);
            $stmt->execute();
            $linkedRole = null; $linkedStatus = null;
            $stmt->bind_result($linkedRole, $linkedStatus);
            $foundLinkedUser = $stmt->fetch();
            $stmt->close();
            if (!$foundLinkedUser || (string) $linkedRole !== 'customer') throw new Exception('Liên kết OAuth không thuộc tài khoản khách hàng hợp lệ.');
            if ((string) $linkedStatus !== 'active') throw new Exception('Tài khoản Aurora đang bị khóa hoặc ngừng hoạt động.');
        }

        if ($userId) {
            $stmt = $db->prepare('SELECT provider_user_id FROM oauth_accounts WHERE user_id = ? AND provider = ? LIMIT 1 FOR UPDATE');
            if (!$stmt) throw new Exception('Không thể kiểm tra liên kết OAuth hiện tại.');
            $stmt->bind_param('is', $userId, $provider);
            $stmt->execute();
            $currentProviderId = null;
            $stmt->bind_result($currentProviderId);
            $hasProviderLink = $stmt->fetch();
            $stmt->close();
            if ($hasProviderLink && (string) $currentProviderId !== $providerId) {
                throw new Exception('Tài khoản Aurora này đã liên kết với một tài khoản ' . ucfirst($provider) . ' khác.');
            }
        }

        if (!$userId) {
            $unusablePassword = aurora_password_hash(aurora_oauth_random_token());
            $username = aurora_oauth_unique_username($db, $provider, $providerId);
            $stmt = $db->prepare("INSERT INTO users (username,full_name,email,phone,id_number,birthday,gender,city,district,address,password_hash,role,status,last_login,membership_level,points,theater_id,created_at,updated_at)
                VALUES (?, ?, ?, '', '', '1970-01-01', 'other', '', '', '', ?, 'customer', 'active', ?, 'STANDARD', 0, 1, ?, ?)");
            if (!$stmt) throw new Exception('Không thể chuẩn bị tạo tài khoản Aurora.');
            $stmt->bind_param('sssssss', $username, $name, $email, $unusablePassword, $now, $now, $now);
            if (!$stmt->execute()) {
                $insertMessage = $stmt->error;
                $stmt->close();
                throw new Exception('Không thể tạo tài khoản Aurora: ' . $insertMessage);
            }
            $userId = (int) $stmt->insert_id;
            $stmt->close();
        }

        $stmt = $db->prepare("UPDATE users SET last_login=?, updated_at=? WHERE id=? AND role='customer' AND status='active'");
        if (!$stmt) throw new Exception('Không thể cập nhật phiên đăng nhập khách hàng.');
        $stmt->bind_param('ssi', $now, $now, $userId);
        if (!$stmt->execute() || $stmt->affected_rows < 0) {
            $stmt->close();
            throw new Exception('Không thể cập nhật phiên đăng nhập khách hàng.');
        }
        $stmt->close();

        $stmt = $db->prepare("INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email, provider_name, avatar_url, created_at, updated_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE provider_email=VALUES(provider_email), provider_name=VALUES(provider_name), avatar_url=VALUES(avatar_url), updated_at=VALUES(updated_at), last_login_at=VALUES(last_login_at)");
        if (!$stmt) throw new Exception('Không thể chuẩn bị lưu liên kết OAuth.');
        $stmt->bind_param('issssssss', $userId, $provider, $providerId, $email, $name, $avatar, $now, $now, $now);
        if (!$stmt->execute()) {
            $linkMessage = $stmt->error;
            $stmt->close();
            throw new Exception('Không thể lưu liên kết OAuth: ' . $linkMessage);
        }
        $stmt->close();
        $db->commit();
        $db->autocommit(true);
        return $userId;
    } catch (Exception $exception) {
        $db->rollback();
        $db->autocommit(true);
        throw $exception;
    }
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

// ── /oauth_status ────────────────────────────────────────────────────────────
if ($resource === 'oauth_status') {
    aurora_method('GET');
    $providers = array();
    foreach (array('google', 'facebook') as $providerName) {
        $providerConfig = aurora_oauth_config($providerName, $db);
        $providers[$providerName] = array(
            'configured' => !empty($providerConfig['configured']),
            'mode' => !empty($providerConfig['is_live']) ? 'live' : (!empty($providerConfig['is_sandbox']) ? 'sandbox' : 'unconfigured'),
        );
    }
    aurora_response(array('providers' => $providers), 200);
}

// ── /oauth_configs (GET / POST) ──────────────────────────────────────────────
if ($resource === 'oauth_configs') {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $configs = array();
        $res = $db->query("SELECT config_key, config_value, description FROM system_configs WHERE config_key LIKE 'oauth_%'");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $val = $row['config_value'];
                if (strpos($row['config_key'], 'secret') !== false && strlen($val) > 4) {
                    $val = substr($val, 0, 4) . '••••••••';
                }
                $configs[$row['config_key']] = array('value' => $val, 'description' => $row['description']);
            }
            $res->free();
        }
        aurora_response(array('configs' => $configs), 200);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = aurora_body();
        $allowed = array(
            'oauth_google_client_id', 'oauth_google_client_secret', 'oauth_google_redirect_uri',
            'oauth_facebook_client_id', 'oauth_facebook_client_secret', 'oauth_facebook_redirect_uri',
            'oauth_facebook_graph_version',
            'oauth_sandbox_enabled'
        );
        $stmt = $db->prepare("INSERT INTO system_configs (config_key, config_value, description, updated_at) VALUES (?, ?, '', NOW()) ON DUPLICATE KEY UPDATE config_value=VALUES(config_value), updated_at=NOW()");
        if (!$stmt) aurora_response(array('message' => 'Không thể chuẩn bị lưu cấu hình: ' . $db->error), 500);
        foreach ($allowed as $k) {
            if (isset($body[$k])) {
                $v = trim((string) $body[$k]);
                $stmt->bind_param('ss', $k, $v);
                $stmt->execute();
            }
        }
        $stmt->close();
        aurora_response(array('message' => 'Cập nhật cấu hình OAuth thành công.'), 200);
    }
    aurora_response(array('message' => 'Method Not Allowed'), 405);
}

// ── /oauth_start ─────────────────────────────────────────────────────────────
if ($resource === 'oauth_start') {
    aurora_method('GET');
    $provider = isset($_GET['provider']) ? strtolower(trim((string) $_GET['provider'])) : '';
    $config = aurora_oauth_config($provider, $db);
    if (!$config) aurora_response(array('message' => 'Nhà cung cấp đăng nhập không hợp lệ.'), 422);
    if (empty($config['configured'])) {
        aurora_response(array('message' => 'Đăng nhập ' . ucfirst($provider) . ' chưa được cấu hình trên máy chủ.'), 503);
    }

    if (!aurora_ensure_oauth_schema($db)) aurora_response(array('message' => 'Không thể khởi tạo dữ liệu OAuth trong aurora_db.'), 500);
    $state = aurora_oauth_random_token();
    $attemptId = aurora_oauth_attempt_start($db, $provider, $state);
    if ($attemptId <= 0) aurora_response(array('message' => 'Không thể ghi nhận phiên đăng nhập OAuth trong aurora_db.'), 500);
    $pending = array(
        'state' => $state,
        'created_at' => time(),
        'attempt_id' => $attemptId,
        'is_sandbox' => false,
        'intent' => isset($_GET['intent']) && $_GET['intent'] === 'register' ? 'register' : 'login',
    );

    if ($provider === 'google') {
            $pending['code_verifier'] = aurora_oauth_random_token();
            $parameters = array(
                'client_id' => $config['client_id'],
                'redirect_uri' => $config['redirect_uri'],
                'response_type' => 'code',
                'scope' => 'openid email profile',
                'state' => $state,
                'code_challenge' => aurora_oauth_base64url(hash('sha256', $pending['code_verifier'], true)),
                'code_challenge_method' => 'S256',
                'prompt' => 'select_account',
            );
    } else {
            $parameters = array(
                'client_id' => $config['client_id'],
                'redirect_uri' => $config['redirect_uri'],
                'response_type' => 'code',
                'scope' => 'email,public_profile',
                'state' => $state,
                'return_scopes' => 'true',
            );
    }
    $_SESSION['aurora_oauth_' . $provider] = $pending;
    aurora_response(array('provider' => $provider, 'authorizationUrl' => $config['authorization_url'] . '?' . http_build_query($parameters, '', '&')), 200);
}

// ── /oauth_consent ───────────────────────────────────────────────────────────
if ($resource === 'oauth_consent') {
    aurora_method('GET');
    $provider = isset($_GET['provider']) ? strtolower(trim((string) $_GET['provider'])) : '';
    if (in_array($provider, array('google', 'facebook'), true)) {
        aurora_oauth_redirect_error($provider, 'Aurora chỉ chấp nhận tài khoản ' . ucfirst($provider) . ' thật qua OAuth. Chế độ đăng nhập giả lập đã bị vô hiệu hóa.');
    }
    if ($provider !== 'facebook') {
        aurora_oauth_redirect_error('', 'Nhà cung cấp OAuth không hợp lệ.');
    }
    $state = isset($_GET['state']) ? (string) $_GET['state'] : '';
    $sessionKey = 'aurora_oauth_' . $provider;
    $pending = isset($_SESSION[$sessionKey]) && is_array($_SESSION[$sessionKey]) ? $_SESSION[$sessionKey] : null;
    if (!$pending || !aurora_oauth_safe_equals($pending['state'], $state) || time() - (int)$pending['created_at'] > 600) {
        aurora_oauth_redirect_error($provider, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
    }

    $isGoogle = ($provider === 'google');
    $providerName = $isGoogle ? 'Google' : 'Facebook';
    $primaryColor = $isGoogle ? '#ea4335' : '#1877f2';

    // Mock accounts available for one-click testing
    $mockAccounts = $isGoogle ? array(
        array('name' => 'Nguyễn Văn An', 'email' => 'nguyenvanan.customer@gmail.com', 'initials' => 'NA', 'badge' => 'Khách hàng Thân thiết', 'color' => '#4285f4'),
        array('name' => 'Trần Thị Bảo', 'email' => 'tranthibao.customer@gmail.com', 'initials' => 'TB', 'badge' => 'Thành viên Mới', 'color' => '#34a853'),
        array('name' => 'Thái Hùng', 'email' => 'thaihung.cinema@gmail.com', 'initials' => 'TH', 'badge' => 'Thành viên VIP', 'color' => '#fbbc05')
    ) : array(
        array('name' => 'Nguyễn Văn An', 'email' => 'nguyenvanan.fb@facebook.com', 'initials' => 'NA', 'badge' => 'Tài khoản Facebook', 'color' => '#1877f2'),
        array('name' => 'Lê Minh Thảo', 'email' => 'leminhthao.fb@facebook.com', 'initials' => 'LT', 'badge' => 'Tài khoản Facebook', 'color' => '#0284c7'),
        array('name' => 'Phạm Quỳnh Nga', 'email' => 'quynhnga.fb@facebook.com', 'initials' => 'QN', 'badge' => 'Tài khoản Facebook', 'color' => '#2563eb')
    );

    header('Content-Type: text/html; charset=utf-8');
    ?>
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Đăng nhập với <?php echo htmlspecialchars($providerName); ?> - Aurora Cinema</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: radial-gradient(circle at 50% 0%, #172554 0%, #090d16 65%, #020617 100%);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .auth-card {
      width: 100%;
      max-width: 460px;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 32px 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 40px rgba(59, 130, 246, 0.15);
      backdrop-filter: blur(20px);
    }
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.8px;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .provider-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
    }
    .page-title {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .page-desc {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 22px;
    }
    .notice-box {
      background: rgba(30, 58, 138, 0.25);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 12px;
      color: #93c5fd;
      line-height: 1.45;
      margin-bottom: 20px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .section-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .account-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 22px;
    }
    .account-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px 14px;
      text-align: left;
      cursor: pointer;
      color: inherit;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .account-btn:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.22);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #ffffff;
      flex-shrink: 0;
    }
    .acc-info { flex: 1; min-width: 0; }
    .acc-name {
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .acc-email {
      font-size: 12px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .acc-badge {
      font-size: 11px;
      font-weight: 600;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      padding: 2px 8px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .custom-divider {
      position: relative;
      text-align: center;
      margin: 20px 0 16px;
    }
    .custom-divider::before {
      content: '';
      position: absolute;
      left: 0; top: 50%; right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
    }
    .custom-divider span {
      position: relative;
      background: #0f172a;
      padding: 0 12px;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    .form-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 13px;
      color: #ffffff;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: #3b82f6;
    }
    .submit-btn {
      width: 100%;
      padding: 10px 16px;
      background: <?php echo $isGoogle ? '#ea4335' : '#1877f2'; ?>;
      border: none;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      margin-top: 6px;
      transition: opacity 0.2s;
    }
    .submit-btn:hover { opacity: 0.92; }
    .cancel-link {
      display: block;
      text-align: center;
      margin-top: 18px;
      font-size: 12.5px;
      color: #64748b;
      text-decoration: none;
      transition: color 0.2s;
    }
    .cancel-link:hover { color: #94a3b8; }
    .footer-note {
      text-align: center;
      margin-top: 20px;
      font-size: 11px;
      color: #475569;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="auth-card">
    <div class="brand-header">
      <span class="brand-title">AURORA CINEMA</span>
      <span class="provider-pill">
        <?php if ($isGoogle): ?>
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
        <?php else: ?>
          <svg width="14" height="14" fill="#1877f2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        <?php endif; ?>
        <?php echo htmlspecialchars($providerName); ?> OAuth
      </span>
    </div>

    <div class="page-title">
      Đăng nhập với <?php echo htmlspecialchars($providerName); ?>
    </div>
    <div class="page-desc">
      Chọn một tài khoản để đăng nhập vào Aurora Cinema. Thông tin sẽ được liên kết và đồng bộ trực tiếp vào cơ sở dữ liệu <strong>aurora_db</strong>.
    </div>

    <div class="notice-box">
      <span>ℹ️</span>
      <span>Hệ thống tự động đồng bộ hồ sơ khách hàng, cấp hạng Standard và quản lý điểm thưởng trong cơ sở dữ liệu MySQL aurora_db.</span>
    </div>

    <div class="section-label">Chọn tài khoản nhanh</div>
    <div class="account-list">
      <?php foreach ($mockAccounts as $acc): ?>
        <form method="POST" action="api.php?action=oauth_consent_confirm">
          <input type="hidden" name="provider" value="<?php echo htmlspecialchars($provider); ?>">
          <input type="hidden" name="state" value="<?php echo htmlspecialchars($state); ?>">
          <input type="hidden" name="name" value="<?php echo htmlspecialchars($acc['name']); ?>">
          <input type="hidden" name="email" value="<?php echo htmlspecialchars($acc['email']); ?>">
          <button type="submit" class="account-btn">
            <div class="avatar" style="background: <?php echo htmlspecialchars($acc['color']); ?>;">
              <?php echo htmlspecialchars($acc['initials']); ?>
            </div>
            <div class="acc-info">
              <div class="acc-name"><?php echo htmlspecialchars($acc['name']); ?></div>
              <div class="acc-email"><?php echo htmlspecialchars($acc['email']); ?></div>
            </div>
            <span class="acc-badge"><?php echo htmlspecialchars($acc['badge']); ?></span>
          </button>
        </form>
      <?php endforeach; ?>
    </div>

    <div class="custom-divider">
      <span>Hoặc sử dụng tài khoản khác</span>
    </div>

    <form method="POST" action="api.php?action=oauth_consent_confirm">
      <input type="hidden" name="provider" value="<?php echo htmlspecialchars($provider); ?>">
      <input type="hidden" name="state" value="<?php echo htmlspecialchars($state); ?>">
      <div class="form-group">
        <label class="form-label" for="custom-name">Họ và tên</label>
        <input class="form-input" id="custom-name" name="name" type="text" placeholder="Nguyễn Hoàng Long" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="custom-email">Địa chỉ Email</label>
        <input class="form-input" id="custom-email" name="email" type="email" placeholder="<?php echo $isGoogle ? 'hoanglong.aurora@gmail.com' : 'hoanglong.aurora@facebook.com'; ?>" required>
      </div>
      <button type="submit" class="submit-btn">Đăng nhập tài khoản này</button>
    </form>

    <a href="<?php echo htmlspecialchars(aurora_oauth_finish_url('error', $provider, 'Bạn đã hủy đăng nhập ' . $providerName . '.')); ?>" class="cancel-link">
      Hủy bỏ và quay lại Aurora Cinema
    </a>

    <div class="footer-note">
      Aurora Cinema Auth • Dữ liệu ghi nhận vào MySQL aurora_db: users, oauth_accounts & oauth_login_attempts.
    </div>
  </div>
</body>
</html>
    <?php
    exit;
}

// ── /oauth_consent_confirm ───────────────────────────────────────────────────
if ($resource === 'oauth_consent_confirm') {
    aurora_method('POST');
    $provider = isset($_POST['provider']) ? strtolower(trim((string) $_POST['provider'])) : '';
    if (in_array($provider, array('google', 'facebook'), true)) {
        aurora_oauth_redirect_error($provider, 'Không chấp nhận hồ sơ ' . ucfirst($provider) . ' giả lập. Vui lòng xác thực bằng tài khoản thật.');
    }
    $state = isset($_POST['state']) ? (string) $_POST['state'] : '';
    $name = isset($_POST['name']) ? trim((string) $_POST['name']) : '';
    $email = isset($_POST['email']) ? strtolower(trim((string) $_POST['email'])) : '';

    if (!in_array($provider, array('google', 'facebook'), true)) {
        aurora_oauth_redirect_error('', 'Nhà cung cấp OAuth không hợp lệ.');
    }
    $sessionKey = 'aurora_oauth_' . $provider;
    $pending = isset($_SESSION[$sessionKey]) && is_array($_SESSION[$sessionKey]) ? $_SESSION[$sessionKey] : null;
    if (!$pending || !aurora_oauth_safe_equals($pending['state'], $state) || time() - (int)$pending['created_at'] > 600) {
        aurora_oauth_redirect_error($provider, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
    }

    if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        aurora_oauth_redirect_error($provider, 'Thông tin tài khoản không hợp lệ.');
    }

    // Generate mock code and save identity into session
    $code = 'mock_code_' . aurora_oauth_random_token();
    $mockId = 'mock_' . $provider . '_' . substr(md5($email), 0, 14);
    $mockAvatar = 'https://ui-avatars.com/api/?name=' . urlencode($name) . '&background=0D8ABC&color=fff';
    $_SESSION['aurora_oauth_code_' . $code] = array(
        'id' => $mockId,
        'email' => $email,
        'name' => $name,
        'avatar' => $mockAvatar,
        'state' => $state,
    );

    // Redirect to oauth_callback
    $callbackUrl = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?' . http_build_query(array(
        'action' => 'oauth_callback',
        'provider' => $provider,
        'code' => $code,
        'state' => $state,
    ), '', '&');
    header('Location: ' . $callbackUrl, true, 302);
    exit;
}

// ── /oauth_callback ──────────────────────────────────────────────────────────
if ($resource === 'oauth_callback') {
    aurora_method('GET');
    $provider = isset($_GET['provider']) ? strtolower(trim((string) $_GET['provider'])) : '';
    $config = aurora_oauth_config($provider, $db);
    if (!$config) aurora_oauth_redirect_error('', 'Nhà cung cấp đăng nhập không hợp lệ.');

    $sessionKey = 'aurora_oauth_' . $provider;
    $pending = isset($_SESSION[$sessionKey]) && is_array($_SESSION[$sessionKey]) ? $_SESSION[$sessionKey] : null;
    unset($_SESSION[$sessionKey]);
    $attemptId = $pending && isset($pending['attempt_id']) ? (int) $pending['attempt_id'] : 0;
    if (empty($config['configured'])) {
        aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'provider_not_configured', 'Nhà cung cấp OAuth chưa được cấu hình.');
        aurora_oauth_redirect_error($provider, 'Đăng nhập ' . ucfirst($provider) . ' chưa được cấu hình trên máy chủ.');
    }
    if (isset($_GET['error'])) {
        $providerError = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $_GET['error']);
        $providerError = $providerError !== '' ? substr($providerError, 0, 60) : 'oauth_rejected';
        $providerDescription = isset($_GET['error_description'])
            ? trim(preg_replace('/[\x00-\x1F\x7F]/', ' ', strip_tags((string) $_GET['error_description'])))
            : '';
        $isDenied = $providerError === 'access_denied' || (isset($_GET['error_code']) && (string) $_GET['error_code'] === '200');
        $auditMessage = $providerDescription !== '' ? substr($providerDescription, 0, 220) : 'Nhà cung cấp OAuth từ chối yêu cầu.';
        aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', $providerError, $auditMessage);
        aurora_oauth_redirect_error($provider, $isDenied
            ? 'Bạn đã hủy hoặc chưa cấp quyền đăng nhập cho Aurora.'
            : ucfirst($provider) . ' từ chối yêu cầu xác thực. Vui lòng kiểm tra cấu hình OAuth và thử lại.');
    }
    $state = isset($_GET['state']) ? (string) $_GET['state'] : '';
    $code = isset($_GET['code']) ? (string) $_GET['code'] : '';
    if (!$pending || $state === '' || !aurora_oauth_safe_equals($pending['state'], $state) || time() - (int) $pending['created_at'] > 600) {
        aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'invalid_state', 'Phiên OAuth không hợp lệ hoặc đã hết hạn.');
        aurora_oauth_redirect_error($provider, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.');
    }
    if ($code === '') {
        aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'missing_code', 'Nhà cung cấp không trả về mã xác thực.');
        aurora_oauth_redirect_error($provider, 'Nhà cung cấp không trả về mã xác thực.');
    }

    $isSandboxAttempt = !empty($pending['is_sandbox']);
    if ($provider === 'google' && $isSandboxAttempt) {
        aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'sandbox_google_rejected', 'Google đăng nhập giả lập không được phép.');
        aurora_oauth_redirect_error($provider, 'Không chấp nhận phiên Google giả lập. Vui lòng bắt đầu lại bằng tài khoản Google thật.');
    }
    if ($isSandboxAttempt) {
        $codeKey = 'aurora_oauth_code_' . $code;
        $mockProfileData = isset($_SESSION[$codeKey]) && is_array($_SESSION[$codeKey]) ? $_SESSION[$codeKey] : null;
        unset($_SESSION[$codeKey]);
        if (!$mockProfileData || empty($mockProfileData['email'])) {
            aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'invalid_mock_code', 'Mã xác thực thử nghiệm không hợp lệ.');
            aurora_oauth_redirect_error($provider, 'Mã xác thực thử nghiệm không hợp lệ hoặc đã hết hạn.');
        }
        $providerProfile = array(
            'id' => $mockProfileData['id'],
            'email' => $mockProfileData['email'],
            'name' => $mockProfileData['name'],
            'avatar' => $mockProfileData['avatar'],
        );
    } else {
        $tokenFields = array(
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'redirect_uri' => $config['redirect_uri'],
            'code' => $code,
            'grant_type' => 'authorization_code',
        );
        if ($provider === 'google' && !empty($pending['code_verifier'])) $tokenFields['code_verifier'] = $pending['code_verifier'];
        $tokenResult = aurora_oauth_http($config['token_url'], $provider === 'facebook' ? 'GET' : 'POST', $tokenFields, '');
        if (!$tokenResult['ok'] || empty($tokenResult['data']['access_token'])) {
            $rawTokenError = isset($tokenResult['data']['error']) ? $tokenResult['data']['error'] : null;
            $tokenErrorCode = is_array($rawTokenError) && isset($rawTokenError['code'])
                ? 'facebook_' . preg_replace('/[^0-9]/', '', (string) $rawTokenError['code'])
                : (is_string($rawTokenError) && preg_match('/^[a-zA-Z0-9_-]{1,60}$/', $rawTokenError) ? $rawTokenError : 'token_exchange_failed');
            $tokenErrorDetail = is_array($rawTokenError) && !empty($rawTokenError['message'])
                ? (string) $rawTokenError['message']
                : (!empty($tokenResult['data']['error_description'])
                    ? (string)$tokenResult['data']['error_description']
                    : (!empty($tokenResult['message']) ? (string)$tokenResult['message'] : ''));
            $tokenErrorDetail = trim(preg_replace('/[\x00-\x1F\x7F]/', ' ', strip_tags($tokenErrorDetail)));
            $tokenErrorDetail = substr($tokenErrorDetail, 0, 180);

            if ($provider === 'google' && strpos($tokenErrorDetail, 'PHP cURL chưa được bật') !== false) {
                $userMessage = 'Apache PHP chưa bật extension cURL nên không thể kết nối máy chủ Google. Hãy bật extension=curl trong php.ini đang dùng bởi Apache rồi khởi động lại Apache.';
            } elseif ($provider === 'google' && $tokenErrorCode === 'invalid_client') {
                $userMessage = 'Google từ chối OAuth Client (invalid_client). Hãy kiểm tra Client ID/Secret trong customer/backend/.env có cùng thuộc OAuth client đang bật hay không.';
            } elseif ($provider === 'google' && $tokenErrorCode === 'invalid_grant') {
                $userMessage = 'Mã đăng nhập Google không còn hợp lệ (invalid_grant). Hãy bắt đầu đăng nhập mới; nếu vẫn lỗi, kiểm tra redirect URI và tạo lại Client Secret của đúng OAuth client.';
            } elseif ($provider === 'google' && $tokenErrorCode === 'unauthorized_client') {
                $userMessage = 'OAuth Client chưa được Google cho phép dùng luồng này (unauthorized_client). Hãy xác nhận Client ID thuộc loại Web application và cấu hình Google Auth Platform.';
            } elseif ($provider === 'facebook') {
                $userMessage = 'Facebook không cấp quyền đăng nhập (' . $tokenErrorCode . '). Kiểm tra App ID, App Secret và Valid OAuth Redirect URI trong Meta for Developers.';
            } else {
                $userMessage = 'Google không cấp access token (' . $tokenErrorCode . ').';
            }

            $auditMessage = $tokenErrorDetail !== '' ? $tokenErrorDetail : $userMessage;
            aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', $tokenErrorCode, $auditMessage);
            aurora_oauth_redirect_error($provider, $userMessage);
        }
        $accessToken = (string) $tokenResult['data']['access_token'];

        $verifiedFacebookUserId = '';
        if ($provider === 'facebook') {
            $verification = aurora_verify_facebook_access_token($config, $accessToken);
            if (!$verification['ok']) {
                aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'invalid_facebook_token', $verification['message']);
                aurora_oauth_redirect_error($provider, 'Phiên xác thực Facebook không hợp lệ. Vui lòng đăng nhập lại.');
            }
            $verifiedFacebookUserId = (string) $verification['user_id'];
        }

        if ($provider === 'google') {
            $profileResult = aurora_oauth_http($config['profile_url'], 'GET', array(), $accessToken);
        } else {
            $profileResult = aurora_oauth_http($config['profile_url'], 'GET', array(
                'fields' => 'id,name,email,picture.type(large)',
                'access_token' => $accessToken,
                'appsecret_proof' => hash_hmac('sha256', $accessToken, $config['client_secret']),
            ), '');
        }
        if (!$profileResult['ok']) {
            aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'profile_request_failed', 'Không thể lấy hồ sơ tài khoản từ nhà cung cấp.');
            aurora_oauth_redirect_error($provider, 'Không thể lấy thông tin tài khoản từ nhà cung cấp. Vui lòng thử lại.');
        }
        $data = $profileResult['data'];
        if ($provider === 'facebook') {
            $facebookProfileId = isset($data['id']) ? (string) $data['id'] : '';
            if ($facebookProfileId === '' || !aurora_oauth_safe_equals($verifiedFacebookUserId, $facebookProfileId)) {
                aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, $facebookProfileId, 'facebook_identity_mismatch', 'Facebook profile không khớp với access token đã xác minh.');
                aurora_oauth_redirect_error($provider, 'Không thể xác minh danh tính Facebook. Vui lòng đăng nhập lại.');
            }
            if (empty($data['email']) || !filter_var((string) $data['email'], FILTER_VALIDATE_EMAIL)) {
                aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, $facebookProfileId, 'facebook_email_missing', 'Facebook không cung cấp email cho tài khoản này.');
                aurora_oauth_redirect_error($provider, 'Facebook chưa cung cấp email cho Aurora. Hãy dùng tài khoản Facebook có email đã xác minh và cấp quyền email.');
            }
        }
        if ($provider === 'google' && empty($data['email_verified'])) {
            aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, isset($data['sub']) ? $data['sub'] : '', 'email_unverified', 'Email Google chưa được xác minh.');
            aurora_oauth_redirect_error($provider, 'Email Google chưa được xác minh.');
        }
        $avatar = '';
        if ($provider === 'google' && isset($data['picture'])) $avatar = (string) $data['picture'];
        if ($provider === 'facebook' && isset($data['picture']['data']['url'])) $avatar = (string) $data['picture']['data']['url'];

        $providerProfile = array(
            'id' => isset($data['sub']) ? $data['sub'] : (isset($data['id']) ? $data['id'] : ''),
            'email' => isset($data['email']) ? $data['email'] : '',
            'name' => isset($data['name']) ? $data['name'] : '',
            'avatar' => $avatar,
        );
    }

    try {
        $userId = aurora_oauth_login_user($db, $provider, $providerProfile);
        session_regenerate_id(true);
        $_SESSION['aurora_user_id'] = $userId;
        aurora_oauth_attempt_finish($db, $attemptId, 'succeeded', $userId, $providerProfile['id'], '', '');
        header('Location: ' . aurora_oauth_finish_url('success', $provider, ''), true, 302);
        exit;
    } catch (Exception $exception) {
        aurora_oauth_attempt_finish($db, $attemptId, 'failed', 0, '', 'account_link_failed', $exception->getMessage());
        aurora_oauth_redirect_error($provider, $exception->getMessage());
    }
}

// ── /password_reset_request ──────────────────────────────────────────────────
if ($resource === 'password_reset_request') {
    aurora_method('POST');
    if (!aurora_ensure_password_reset_schema($db)) aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu khôi phục mật khẩu trong aurora_db.'), 500);
    $body = aurora_body();
    $identifier = isset($body['identifier']) ? strtolower(trim((string)$body['identifier'])) : '';
    if ($identifier === '' || strlen($identifier) > 180) aurora_response(array('message'=>'Vui lòng nhập email hoặc số điện thoại hợp lệ.'), 422);

    $now = aurora_vietnam_now();
    $expiresAt = date('Y-m-d H:i:s', strtotime($now.' +10 minutes'));
    $windowStart = date('Y-m-d H:i:s', strtotime($now.' -15 minutes'));
    $pepper = aurora_env('APP_KEY', 'aurora-cinema-password-reset');
    $lookupHash = hash_hmac('sha256', $identifier, $pepper);
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '';
    $ipHash = hash_hmac('sha256', $ip, $pepper);
    $agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 255) : '';

    $stmt = $db->prepare('SELECT COUNT(*) FROM customer_password_reset_requests WHERE lookup_hash=? AND requested_at>=?');
    $stmt->bind_param('ss', $lookupHash, $windowStart); $stmt->execute();
    $lookupCount = 0; $stmt->bind_result($lookupCount); $stmt->fetch(); $stmt->close();
    $stmt = $db->prepare('SELECT COUNT(*) FROM customer_password_reset_requests WHERE ip_address_hash=? AND requested_at>=?');
    $stmt->bind_param('ss', $ipHash, $windowStart); $stmt->execute();
    $ipCount = 0; $stmt->bind_result($ipCount); $stmt->fetch(); $stmt->close();
    if ((int)$lookupCount >= 3 || (int)$ipCount >= 12) {
        aurora_response(array('message'=>'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau 15 phút.'), 429);
    }

    $userId = 0; $accountName = 'Quý khách'; $accountEmail = '';
    if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
        $stmt = $db->prepare("SELECT id,full_name,email FROM users WHERE email=? AND role='customer' AND status='active' LIMIT 1");
        $stmt->bind_param('s', $identifier);
    } else {
        $phone = preg_replace('/[\s\.\-\(\)]/', '', $identifier);
        $stmt = $db->prepare("SELECT id,full_name,email FROM users WHERE phone=? AND role='customer' AND status='active' LIMIT 1");
        $stmt->bind_param('s', $phone);
    }
    $stmt->execute();
    $foundId = null; $foundName = null; $foundEmail = null;
    $stmt->bind_result($foundId, $foundName, $foundEmail);
    if ($stmt->fetch() && filter_var((string)$foundEmail, FILTER_VALIDATE_EMAIL)) {
        $userId = (int)$foundId;
        $accountName = trim((string)$foundName) !== '' ? (string)$foundName : 'Quý khách';
        $accountEmail = strtolower((string)$foundEmail);
    }
    $stmt->close();

    $selector = substr(aurora_oauth_random_token(), 0, 40);
    $code = aurora_password_reset_code();
    $codeHash = aurora_password_reset_hash($code, $selector);
    $db->query("UPDATE customer_password_reset_requests SET status='expired' WHERE status IN ('pending','verified') AND expires_at<'".$db->real_escape_string($now)."'");
    $stmt = $db->prepare("INSERT INTO customer_password_reset_requests (user_id,selector,lookup_hash,code_hash,status,attempts_remaining,delivery_status,ip_address_hash,user_agent,expires_at,requested_at) VALUES (NULLIF(?,0),?,?,?,'pending',5,'not_applicable',?,?,?,?)");
    $stmt->bind_param('isssssss', $userId, $selector, $lookupHash, $codeHash, $ipHash, $agent, $expiresAt, $now);
    if (!$stmt->execute()) { $stmt->close(); aurora_response(array('message'=>'Không thể tạo yêu cầu khôi phục mật khẩu.'), 500); }
    $requestId = (int)$stmt->insert_id; $stmt->close();

    $environment = strtolower((string)aurora_env('APP_ENV', 'production'));
    $deliveryStatus = 'not_applicable';
    if ($userId > 0) {
        if ($environment === 'local' || $environment === 'development') {
            $deliveryStatus = 'development';
        } else {
            $deliveryStatus = aurora_password_reset_send_email($accountEmail, $accountName, $code, false) ? 'sent' : 'failed';
        }
    }
    $stmt = $db->prepare('UPDATE customer_password_reset_requests SET delivery_status=? WHERE id=?');
    $stmt->bind_param('si', $deliveryStatus, $requestId); $stmt->execute(); $stmt->close();

    $response = array(
        'message'=>'Nếu thông tin khớp với tài khoản Aurora, mã xác minh đã được gửi và có hiệu lực trong 10 phút.',
        'requestId'=>$selector,
        'expiresIn'=>600,
        'delivery'=>$environment === 'local' || $environment === 'development' ? 'development' : 'email'
    );
    // WAMP local has no SMTP server. Expose a test code only in local mode so
    // the complete flow remains testable; production never returns the code.
    if ($environment === 'local' || $environment === 'development') $response['developmentCode'] = $code;
    aurora_response($response, 200);
}

// ── /password_reset_verify ───────────────────────────────────────────────────
if ($resource === 'password_reset_verify') {
    aurora_method('POST');
    if (!aurora_ensure_password_reset_schema($db)) aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu khôi phục mật khẩu.'), 500);
    $body = aurora_body();
    $selector = isset($body['requestId']) ? strtolower(trim((string)$body['requestId'])) : '';
    $code = isset($body['code']) ? trim((string)$body['code']) : '';
    if (!preg_match('/^[a-f0-9]{40}$/', $selector) || !preg_match('/^[0-9]{6}$/', $code)) aurora_response(array('message'=>'Mã xác minh không hợp lệ hoặc đã hết hạn.'), 422);

    $now = aurora_vietnam_now();
    $db->autocommit(false);
    $stmt = $db->prepare('SELECT id,user_id,code_hash,status,attempts_remaining,expires_at FROM customer_password_reset_requests WHERE selector=? LIMIT 1 FOR UPDATE');
    $stmt->bind_param('s', $selector); $stmt->execute();
    $rowId = null; $userId = null; $storedHash = null; $status = null; $attempts = null; $expiresAt = null;
    $stmt->bind_result($rowId, $userId, $storedHash, $status, $attempts, $expiresAt);
    $found = $stmt->fetch(); $stmt->close();
    $valid = $found && $status === 'pending' && (int)$attempts > 0 && strtotime($expiresAt) >= strtotime($now)
        && aurora_oauth_safe_equals((string)$storedHash, aurora_password_reset_hash($code, $selector)) && (int)$userId > 0;
    if (!$valid) {
        if ($found) {
            $remaining = max(0, (int)$attempts - 1);
            $nextStatus = strtotime($expiresAt) < strtotime($now) ? 'expired' : ($remaining <= 0 ? 'locked' : (string)$status);
            $stmt = $db->prepare('UPDATE customer_password_reset_requests SET attempts_remaining=?,status=? WHERE id=?');
            $stmt->bind_param('isi', $remaining, $nextStatus, $rowId); $stmt->execute(); $stmt->close();
        }
        $db->commit(); $db->autocommit(true);
        aurora_response(array('message'=>'Mã xác minh không đúng, đã hết hạn hoặc đã được sử dụng.'), 422);
    }

    $resetToken = aurora_oauth_random_token();
    $resetTokenHash = aurora_password_reset_hash($resetToken, $selector);
    $verifiedUntil = date('Y-m-d H:i:s', strtotime($now.' +10 minutes'));
    $stmt = $db->prepare("UPDATE customer_password_reset_requests SET status='verified',reset_token_hash=?,verified_until=?,verified_at=? WHERE id=?");
    $stmt->bind_param('sssi', $resetTokenHash, $verifiedUntil, $now, $rowId);
    $ok = $stmt->execute(); $stmt->close();
    if (!$ok) { $db->rollback(); $db->autocommit(true); aurora_response(array('message'=>'Không thể xác minh yêu cầu đặt lại mật khẩu.'), 500); }
    $db->commit(); $db->autocommit(true);
    aurora_response(array('message'=>'Xác minh thành công. Bạn có thể tạo mật khẩu mới.', 'resetToken'=>$resetToken, 'expiresIn'=>600), 200);
}

// ── /password_reset_complete ─────────────────────────────────────────────────
if ($resource === 'password_reset_complete') {
    aurora_method('POST');
    if (!aurora_ensure_password_reset_schema($db)) aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu khôi phục mật khẩu.'), 500);
    $body = aurora_body();
    $selector = isset($body['requestId']) ? strtolower(trim((string)$body['requestId'])) : '';
    $resetToken = isset($body['resetToken']) ? trim((string)$body['resetToken']) : '';
    $newPassword = isset($body['password']) ? (string)$body['password'] : '';
    $confirmPassword = isset($body['confirmPassword']) ? (string)$body['confirmPassword'] : '';
    if (!preg_match('/^[a-f0-9]{40}$/', $selector) || strlen($resetToken) < 40) aurora_response(array('message'=>'Phiên đặt lại mật khẩu không hợp lệ.'), 422);
    if ($newPassword !== $confirmPassword) aurora_response(array('message'=>'Mật khẩu xác nhận không khớp.'), 422);
    if (strlen($newPassword) < 8 || strlen($newPassword) > 72 || !preg_match('/[A-Z]/', $newPassword) || !preg_match('/[a-z]/', $newPassword) || !preg_match('/[0-9]/', $newPassword)) {
        aurora_response(array('message'=>'Mật khẩu mới cần 8–72 ký tự, gồm chữ hoa, chữ thường và số.'), 422);
    }

    $now = aurora_vietnam_now();
    $db->autocommit(false);
    $stmt = $db->prepare("SELECT r.id,r.user_id,r.reset_token_hash,r.status,r.verified_until,u.password_hash,u.full_name,u.email FROM customer_password_reset_requests r INNER JOIN users u ON u.id=r.user_id WHERE r.selector=? AND u.role='customer' AND u.status='active' LIMIT 1 FOR UPDATE");
    $stmt->bind_param('s', $selector); $stmt->execute();
    $rowId = null; $userId = null; $storedTokenHash = null; $status = null; $verifiedUntil = null; $oldPasswordHash = null; $accountName = null; $accountEmail = null;
    $stmt->bind_result($rowId, $userId, $storedTokenHash, $status, $verifiedUntil, $oldPasswordHash, $accountName, $accountEmail);
    $found = $stmt->fetch(); $stmt->close();
    $valid = $found && $status === 'verified' && strtotime($verifiedUntil) >= strtotime($now)
        && aurora_oauth_safe_equals((string)$storedTokenHash, aurora_password_reset_hash($resetToken, $selector));
    if (!$valid) { $db->rollback(); $db->autocommit(true); aurora_response(array('message'=>'Phiên đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.'), 422); }
    if (aurora_password_verify($newPassword, $oldPasswordHash)) { $db->rollback(); $db->autocommit(true); aurora_response(array('message'=>'Mật khẩu mới phải khác mật khẩu hiện tại.'), 422); }

    $newHash = aurora_password_hash($newPassword);
    $stmt = $db->prepare('UPDATE users SET password_hash=?,password_changed_at=?,updated_at=? WHERE id=?');
    $stmt->bind_param('sssi', $newHash, $now, $now, $userId);
    $savedUser = $stmt->execute(); $stmt->close();
    $stmt = $db->prepare("UPDATE customer_password_reset_requests SET status='used',completed_at=? WHERE id=?");
    $stmt->bind_param('si', $now, $rowId); $savedRequest = $stmt->execute(); $stmt->close();
    $stmt = $db->prepare("UPDATE customer_password_reset_requests SET status='expired' WHERE user_id=? AND id<>? AND status IN ('pending','verified')");
    $stmt->bind_param('ii', $userId, $rowId); $invalidated = $stmt->execute(); $stmt->close();
    if (!$savedUser || !$savedRequest || !$invalidated) { $db->rollback(); $db->autocommit(true); aurora_response(array('message'=>'Không thể cập nhật mật khẩu trong aurora_db.'), 500); }
    $db->commit(); $db->autocommit(true);
    if (isset($_SESSION['aurora_user_id']) && (int)$_SESSION['aurora_user_id'] === (int)$userId) unset($_SESSION['aurora_user_id']);
    if (strtolower((string)aurora_env('APP_ENV', 'production')) === 'production') aurora_password_reset_send_email($accountEmail, $accountName, '', true);
    aurora_response(array('message'=>'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.'), 200);
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
    if (strlen($password) < 8 || strlen($password) > 72 || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        aurora_response(array('message' => 'Mật khẩu cần 8–72 ký tự, gồm chữ hoa, chữ thường và số.'), 422);
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
    $paymentMethod = isset($body['paymentMethod']) ? strtoupper(trim((string)$body['paymentMethod'])) : 'QR_VNPAY';
    $allowedOnlinePaymentMethods = array('QR_VNPAY', 'QR_MOMO', 'QR_ZALOPAY');
    if (!in_array($paymentMethod, $allowedOnlinePaymentMethods, true)) {
        aurora_response(array('message' => 'Phương thức thanh toán không được hỗ trợ. Vui lòng chọn VNPay QR, MoMo hoặc ZaloPay.'), 422);
    }
    $voucherCode = isset($body['voucherCode']) ? strtoupper(trim((string)$body['voucherCode'])) : '';
    if (strlen($voucherCode) > 40) aurora_response(array('message' => 'Mã ưu đãi không hợp lệ.'), 422);
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
    if (!aurora_ensure_online_payments($db)) {
        aurora_response(array('message' => 'Không thể chuẩn bị dữ liệu giao dịch thanh toán.'), 500);
    }
    if (!aurora_ensure_order_voucher_column($db)) {
        aurora_response(array('message' => 'Không thể chuẩn bị dữ liệu ưu đãi cho đơn hàng.'), 500);
    }
    if (!aurora_ensure_loyalty_schema($db)) {
        aurora_response(array('message' => 'Không thể khởi tạo sổ điểm Aurora.'), 500);
    }
    if (!aurora_ensure_showtime_seat_locks($db)) {
        aurora_response(array('message' => 'Không thể kiểm tra trạng thái khóa ghế.'), 500);
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
        $lockedSql = "SELECT COUNT(*) FROM tms_showtime_seat_locks WHERE showtime_id = ? AND seat_id IN (" . implode(',', array_fill(0, count($seatIds), '?')) . ")";
        $stmt = $db->prepare($lockedSql);
        $refs = array(str_repeat('i', count($seatIds) + 1), $showtimeId); foreach ($seatIds as $key => $value) $refs[] = &$seatIds[$key];
        call_user_func_array(array($stmt, 'bind_param'), $refs);
        $stmt->execute(); $locked = 0; $stmt->bind_result($locked); $stmt->fetch(); $stmt->close();
        if ((int)$locked > 0) throw new Exception('Một hoặc nhiều ghế đã được rạp khóa cho suất chiếu này.');

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
        $subtotal = $total;
        $discount = 0;
        if ($voucherCode !== '') {
            $stmt = $db->prepare("SELECT name, discount_type, discount_value, min_order_amount, max_discount FROM vouchers WHERE code=? AND status='active' AND starts_at <= NOW() AND ends_at >= NOW() AND (usage_limit=0 OR used_count < usage_limit) LIMIT 1 FOR UPDATE");
            if (!$stmt) throw new Exception('Không thể kiểm tra mã ưu đãi.');
            $stmt->bind_param('s', $voucherCode); $stmt->execute();
            $voucherName = $voucherType = $voucherValue = $minimumOrder = $maximumDiscount = null;
            $stmt->bind_result($voucherName, $voucherType, $voucherValue, $minimumOrder, $maximumDiscount);
            $foundVoucher = $stmt->fetch(); $stmt->close();
            if (!$foundVoucher) throw new Exception('Mã ưu đãi không hợp lệ, đã hết hạn hoặc hết lượt sử dụng.');
            if ($subtotal < (float)$minimumOrder) throw new Exception('Đơn hàng chưa đạt giá trị tối thiểu của mã ưu đãi.');
            $discount = $voucherType === 'percent' ? $subtotal * (float)$voucherValue / 100 : min((float)$voucherValue, $subtotal);
            if ((float)$maximumDiscount > 0) $discount = min($discount, (float)$maximumDiscount);
            $discount = round($discount);
            $total = max(0, $subtotal - $discount);
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
        $stmt = $db->prepare("INSERT INTO orders (order_code, channel, booking_id, customer_id, subtotal, discount_amount, voucher_code, total_amount, payment_method, amount_received, change_amount, status) VALUES (?, 'ONLINE', ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, 0, 'PAID')");
        if (!$stmt) throw new Exception('Không thể lưu đơn hàng tổng.');
        $stmt->bind_param('siiddsdsd', $code, $bookingId, $userId, $subtotal, $discount, $voucherCode, $total, $paymentMethod, $total);
        if (!$stmt->execute()) throw new Exception('Không thể lưu đơn hàng tổng.');
        $orderId = (int)$stmt->insert_id;
        $stmt->close();
        $paymentReference = 'AURPAY-' . date('ymd') . '-' . strtoupper(substr(md5($code . $paymentMethod . microtime(true)), 0, 10));
        $stmt = $db->prepare('INSERT INTO payments (order_id, method, amount, reference_code, created_at) VALUES (?, ?, ?, ?, ?)');
        if (!$stmt) throw new Exception('Không thể tạo giao dịch thanh toán.');
        $stmt->bind_param('isdss', $orderId, $paymentMethod, $total, $paymentReference, $now);
        if (!$stmt->execute()) throw new Exception('Không thể ghi nhận giao dịch thanh toán.');
        $paymentId = (int)$stmt->insert_id;
        $stmt->close();
        if ($voucherCode !== '') {
            $voucherEsc = $db->real_escape_string($voucherCode);
            if (!$db->query("UPDATE vouchers SET used_count=used_count+1, updated_at=NOW() WHERE code='{$voucherEsc}' AND (usage_limit=0 OR used_count < usage_limit)")) throw new Exception('Không thể ghi nhận lượt sử dụng ưu đãi.');
            if ($db->affected_rows !== 1) throw new Exception('Mã ưu đãi vừa hết lượt sử dụng. Vui lòng chọn mã khác.');
        }
        // The seats are now durable bookings; remove this browser session's
        // temporary holds before committing the same transaction.
        if (aurora_ensure_seat_holds($db)) {
            $holdIds = implode(',', $seatIds);
            $db->query("DELETE FROM seat_holds WHERE showtime_id=".(int)$showtimeId." AND seat_id IN ({$holdIds}) AND session_key='".$db->real_escape_string(session_id())."'");
        }
        $pointsEarned = aurora_award_booking_points($db, $userId, $bookingId, $total);
        $db->commit();
        $db->autocommit(true);
        aurora_response(array('booking' => array('id'=>$bookingId, 'code'=>$code, 'showtimeId'=>$showtimeId, 'seatIds'=>$seatIds, 'combos'=>$combos, 'subtotal'=>$subtotal, 'discountAmount'=>$discount, 'voucherCode'=>$voucherCode, 'totalAmount'=>$total, 'status'=>'PAID', 'pointsEarned'=>$pointsEarned, 'payment'=>array('id'=>$paymentId,'method'=>$paymentMethod,'referenceCode'=>$paymentReference,'amount'=>$total,'status'=>'PAID','paidAt'=>$now)), 'member' => aurora_public_user($db, $userId)), 201);
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
    $userId = aurora_require_user();
    $profile = aurora_profile_for_user($db, $userId);
    if (!$profile) aurora_response(array('message'=>'Không thể tải hồ sơ từ aurora_db.'), 500);
    aurora_response(array('profile'=>$profile), 200);
}

// ── /membership_card (GET) ─────────────────────────────────────────────────
// Provides source-of-truth card information from aurora_db.
if ($resource === 'membership_card') {
    aurora_method('GET');
    $userId = aurora_require_user();
    $card = aurora_membership_card_for_user($db, $userId);
    if (!$card) aurora_response(array('message' => 'Không thể cấp thẻ thành viên trong aurora_db.'), 500);

    $userResult = $db->query("SELECT membership_level, points FROM users WHERE id=".(int)$userId." LIMIT 1");
    if (!$userResult || !($user = $userResult->fetch_assoc())) aurora_response(array('message' => 'Tài khoản không tồn tại.'), 404);
    $totalSpent = 0.0;
    $ordersTable = $db->query("SHOW TABLES LIKE 'orders'");
    if ($ordersTable && $ordersTable->num_rows) {
        $spentResult = $db->query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE customer_id=".(int)$userId." AND status='PAID'");
        if ($spentResult && ($spent = $spentResult->fetch_assoc())) $totalSpent = (float)$spent['total'];
    }
    $earned = 0; $used = 0;
    if (aurora_ensure_loyalty_schema($db)) {
        $pointsResult = $db->query("SELECT COALESCE(SUM(CASE WHEN points_change > 0 THEN points_change ELSE 0 END),0) AS earned, COALESCE(SUM(CASE WHEN points_change < 0 THEN -points_change ELSE 0 END),0) AS used FROM loyalty_point_transactions WHERE user_id=".(int)$userId);
        if ($pointsResult && ($pointRow = $pointsResult->fetch_assoc())) { $earned = (int)$pointRow['earned']; $used = (int)$pointRow['used']; }
    }
    $available = max(0, (int)$user['points']);
    $earned = max($earned, $available + $used); // supports customers created before the ledger
    $level = $user['membership_level'] ? $user['membership_level'] : aurora_membership_level($available);
    $thresholds = array('STANDARD'=>500, 'SILVER'=>2000, 'GOLD'=>5000);
    $nextNames = array('STANDARD'=>'SILVER', 'SILVER'=>'GOLD', 'GOLD'=>'PLATINUM');
    $nextThreshold = isset($thresholds[$level]) ? $thresholds[$level] : null;
    aurora_response(array('card' => array(
        'cardNumber' => $card['card_number'], 'status' => 'ACTIVE', 'membershipLevel' => $level,
        'activatedAt' => $card['activated_at'], 'expiresAt' => $card['expires_at'], 'totalSpent' => $totalSpent,
        'pointsAccumulated' => $earned, 'pointsUsed' => $used, 'pointsAvailable' => $available,
        'pointsExpiring' => 0, 'nextLevel' => isset($nextNames[$level]) ? $nextNames[$level] : null,
        'nextThreshold' => $nextThreshold, 'pointsToNextLevel' => $nextThreshold === null ? 0 : max(0, $nextThreshold - $available),
        'expiryNote' => 'Điểm chưa có lịch hết hạn.'
    )), 200);
}

// ── /profile_avatar (POST multipart/form-data) ───────────────────────────────
if ($resource === 'profile_avatar') {
    aurora_method('POST');
    $userId = aurora_require_user();
    if (!aurora_ensure_profile_avatar_schema($db) || !aurora_ensure_avatar_upload_schema($db)) aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu ảnh đại diện trong aurora_db.'), 500);
    if (!isset($_FILES['avatar']) || !is_array($_FILES['avatar'])) {
        $contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
        aurora_response(array('message'=>$contentLength > 5 * 1024 * 1024 ? 'Ảnh vượt quá giới hạn 5 MB.' : 'Vui lòng chọn một ảnh đại diện.'), 422);
    }
    $file = $_FILES['avatar'];
    if ((int)$file['error'] !== UPLOAD_ERR_OK) aurora_response(array('message'=>aurora_avatar_upload_error((int)$file['error'])), 422);
    if ((int)$file['size'] < 1 || (int)$file['size'] > 5 * 1024 * 1024) aurora_response(array('message'=>'Ảnh đại diện phải nhỏ hơn hoặc bằng 5 MB.'), 422);
    $image = @getimagesize($file['tmp_name']);
    $mime = $image && isset($image['mime']) ? $image['mime'] : '';
    $extensions = array('image/jpeg'=>'jpg', 'image/png'=>'png');
    if (!isset($extensions[$mime])) aurora_response(array('message'=>'Chỉ hỗ trợ ảnh JPG hoặc PNG hợp lệ.'), 422);
    if ((int)$image[0] < 80 || (int)$image[1] < 80 || (int)$image[0] > 6000 || (int)$image[1] > 6000) aurora_response(array('message'=>'Ảnh cần có kích thước từ 80×80 đến 6000×6000 px.'), 422);
    $directory = dirname(__FILE__).DIRECTORY_SEPARATOR.'uploads'.DIRECTORY_SEPARATOR.'avatars';
    if (!is_dir($directory) && !@mkdir($directory, 0755, true)) aurora_response(array('message'=>'Không thể tạo thư mục lưu ảnh.'), 500);
    if (!is_writable($directory)) aurora_response(array('message'=>'Thư mục ảnh đại diện không có quyền ghi.'), 500);
    $filename = 'avatar_'.$userId.'_'.substr(sha1(uniqid((string)$userId, true).mt_rand()), 0, 24).'.'.$extensions[$mime];
    $destination = $directory.DIRECTORY_SEPARATOR.$filename;
    if (!move_uploaded_file($file['tmp_name'], $destination)) aurora_response(array('message'=>'Không thể lưu ảnh đại diện trên máy chủ.'), 500);
    $scriptPath = isset($_SERVER['SCRIPT_NAME']) ? dirname($_SERVER['SCRIPT_NAME']) : '/AURORA%20CINEMA/customer/backend/public';
    $scriptPath = str_replace(' ', '%20', str_replace('\\', '/', $scriptPath));
    $avatarUrl = rtrim($scriptPath, '/').'/uploads/avatars/'.rawurlencode($filename);
    $oldUrl = '';
    $old = $db->query('SELECT avatar_url FROM users WHERE id='.(int)$userId.' LIMIT 1');
    if ($old && ($oldRow = $old->fetch_assoc())) $oldUrl = isset($oldRow['avatar_url']) ? (string)$oldRow['avatar_url'] : '';
    $urlEsc = $db->real_escape_string($avatarUrl); $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    $sourceName = isset($_POST['source_name']) ? (string)$_POST['source_name'] : (string)$file['name'];
    $sourceWidth = isset($_POST['source_width']) ? max(0, min(20000, (int)$_POST['source_width'])) : (int)$image[0];
    $sourceHeight = isset($_POST['source_height']) ? max(0, min(20000, (int)$_POST['source_height'])) : (int)$image[1];
    $cropOffsetX = isset($_POST['crop_offset_x']) ? max(-1, min(1, (float)$_POST['crop_offset_x'])) : 0;
    $cropOffsetY = isset($_POST['crop_offset_y']) ? max(-1, min(1, (float)$_POST['crop_offset_y'])) : 0;
    $cropZoom = isset($_POST['crop_zoom']) ? max(1, min(3, (float)$_POST['crop_zoom'])) : 1;
    $cropOutputSize = isset($_POST['crop_output_size']) ? max(80, min(2000, (int)$_POST['crop_output_size'])) : (int)$image[0];
    $storageEsc = $db->real_escape_string($filename); $originalEsc = $db->real_escape_string(substr(basename($sourceName), 0, 255)); $mimeEsc = $db->real_escape_string($mime);
    $db->autocommit(false);
    $saved = $db->query("UPDATE users SET avatar_url='{$urlEsc}', updated_at='{$nowEsc}' WHERE id=".(int)$userId)
        && $db->query("UPDATE customer_avatar_uploads SET status='REPLACED', deleted_at='{$nowEsc}' WHERE user_id=".(int)$userId." AND status='ACTIVE'")
        && $db->query("INSERT INTO customer_avatar_uploads (user_id,avatar_url,storage_name,original_name,mime_type,byte_size,image_width,image_height,source_width,source_height,crop_offset_x,crop_offset_y,crop_zoom,crop_output_size,status,created_at) VALUES (".(int)$userId.",'{$urlEsc}','{$storageEsc}','{$originalEsc}','{$mimeEsc}',".(int)$file['size'].",".(int)$image[0].",".(int)$image[1].",{$sourceWidth},{$sourceHeight},{$cropOffsetX},{$cropOffsetY},{$cropZoom},{$cropOutputSize},'ACTIVE','{$nowEsc}')");
    if (!$saved) { $db->rollback(); $db->autocommit(true); @unlink($destination); aurora_response(array('message'=>'Không thể lưu thông tin ảnh trong aurora_db.'), 500); }
    $db->commit(); $db->autocommit(true);
    $oldPath = aurora_avatar_storage_path($oldUrl, $directory);
    if ($oldPath !== '' && is_file($oldPath) && $oldPath !== $destination) @unlink($oldPath);
    aurora_response(array('message'=>'Đã cập nhật ảnh đại diện.', 'avatarUrl'=>aurora_public_asset_url($avatarUrl), 'user'=>aurora_public_user($db, $userId)), 200);
}

if ($resource === 'profile_avatar_delete') {
    aurora_method('POST');
    $userId = aurora_require_user();
    if (!aurora_ensure_profile_avatar_schema($db) || !aurora_ensure_avatar_upload_schema($db)) aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu ảnh đại diện trong aurora_db.'), 500);
    $oldUrl = '';
    $old = $db->query('SELECT avatar_url FROM users WHERE id='.(int)$userId.' LIMIT 1');
    if ($old && ($oldRow = $old->fetch_assoc())) $oldUrl = isset($oldRow['avatar_url']) ? (string)$oldRow['avatar_url'] : '';
    $nowEsc = $db->real_escape_string(aurora_vietnam_now());
    $db->autocommit(false);
    $deleted = $db->query("UPDATE users SET avatar_url=NULL, updated_at='{$nowEsc}' WHERE id=".(int)$userId)
        && $db->query("UPDATE customer_avatar_uploads SET status='DELETED', deleted_at='{$nowEsc}' WHERE user_id=".(int)$userId." AND status='ACTIVE'");
    if (!$deleted) { $db->rollback(); $db->autocommit(true); aurora_response(array('message'=>'Không thể xóa ảnh trong aurora_db.'), 500); }
    $db->commit(); $db->autocommit(true);
    $directory = dirname(__FILE__).DIRECTORY_SEPARATOR.'uploads'.DIRECTORY_SEPARATOR.'avatars';
    $oldPath = aurora_avatar_storage_path($oldUrl, $directory);
    if ($oldPath !== '' && is_file($oldPath)) @unlink($oldPath);
    aurora_response(array('message'=>'Đã xóa ảnh đại diện.', 'avatarUrl'=>null, 'user'=>aurora_public_user($db, $userId)), 200);
}

// ── /profile_update (POST) ────────────────────────────────────────────────────
if ($resource === 'profile_update') {
    aurora_method('POST');
    $userId = aurora_require_user();
    if (!aurora_ensure_profile_schema($db)) aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu hồ sơ trong aurora_db.'), 500);

    $body     = aurora_body();
    $fullName = isset($body['fullName']) ? trim((string) $body['fullName']) : '';
    $phone    = isset($body['phone'])    ? trim((string) $body['phone'])    : '';
    $idNumber = isset($body['idNumber']) ? trim((string) $body['idNumber']) : '';
    $birthday = isset($body['birthday']) ? trim((string) $body['birthday']) : '';
    $gender   = isset($body['gender'])   ? trim((string) $body['gender'])   : '';
    $city     = isset($body['city'])     ? trim((string) $body['city'])     : '';
    $district = isset($body['district']) ? trim((string) $body['district']) : '';
    $address  = isset($body['address'])  ? trim((string) $body['address'])  : '';

    $fullNameLength = function_exists('mb_strlen') ? mb_strlen($fullName, 'UTF-8') : strlen($fullName);
    $addressLength = function_exists('mb_strlen') ? mb_strlen($address, 'UTF-8') : strlen($address);
    if ($fullNameLength < 2 || $fullNameLength > 120) aurora_response(array('message'=>'Họ và tên phải có từ 2 đến 120 ký tự.'), 422);
    $normalizedPhone = preg_replace('/[\s\.\-\(\)]/', '', $phone);
    if ($normalizedPhone !== '' && !preg_match('/^(0[0-9]{9,10}|\+84[0-9]{9,10})$/', $normalizedPhone)) aurora_response(array('message'=>'Số điện thoại không đúng định dạng Việt Nam.'), 422);
    if ($idNumber !== '' && !preg_match('/^[A-Za-z0-9]{6,20}$/', $idNumber)) aurora_response(array('message'=>'CMND, CCCD hoặc hộ chiếu phải có từ 6 đến 20 ký tự chữ và số.'), 422);
    if ($birthday !== '' && (!aurora_valid_date($birthday) || $birthday < '1900-01-01' || $birthday > date('Y-m-d'))) aurora_response(array('message'=>'Ngày sinh không hợp lệ.'), 422);
    if ($gender !== '' && !in_array($gender, array('male', 'female', 'other'), true)) aurora_response(array('message'=>'Giới tính không hợp lệ.'), 422);
    if ($addressLength > 255) aurora_response(array('message'=>'Địa chỉ cụ thể không được vượt quá 255 ký tự.'), 422);
    $phone = $normalizedPhone;
    if (!aurora_ensure_administrative_catalog($db)) aurora_response(array('message'=>'Không thể kiểm tra dữ liệu địa chỉ trong aurora_db.'), 500);
    if ($city === '' && $district !== '') aurora_response(array('message'=>'Vui lòng chọn tỉnh/thành trước khi chọn quận/huyện.'), 422);
    if ($city !== '') {
        $canonicalProvince = aurora_canonical_province($db, $city);
        if (!$canonicalProvince) aurora_response(array('message'=>'Tỉnh/thành đã chọn không hợp lệ.'), 422);
        $city = $canonicalProvince['name'];
        if ($district !== '') {
            $canonicalDistrict = aurora_canonical_district($db, $canonicalProvince['code'], $district);
            if ($canonicalDistrict === false) aurora_response(array('message'=>'Quận/huyện không thuộc tỉnh/thành đã chọn.'), 422);
            $district = $canonicalDistrict;
        }
    }

    $now         = aurora_vietnam_now();
    $genderVal   = $gender   !== '' ? $gender   : null;
    $birthdayVal = $birthday !== '' ? $birthday : null;
    $phoneVal    = $phone    !== '' ? $phone    : null;
    $idNumberVal = $idNumber !== '' ? $idNumber : null;
    $cityVal     = $city     !== '' ? $city     : null;
    $districtVal = $district !== '' ? $district : null;
    $addressVal  = $address  !== '' ? $address  : null;

    $stmt = $db->prepare('UPDATE users SET full_name=?, phone=?, id_number=?, birthday=?, gender=?, city=?, district=?, address=?, updated_at=? WHERE id=?');
    if (!$stmt) aurora_response(array('message'=>'Không thể chuẩn bị thao tác cập nhật hồ sơ.'), 500);
    $db->autocommit(false);
    $stmt->bind_param('sssssssssi', $fullName, $phoneVal, $idNumberVal, $birthdayVal, $genderVal, $cityVal, $districtVal, $addressVal, $now, $userId);
    if (!$stmt->execute()) {
        $dbError = $db->error;
        $stmt->close();
        $db->rollback(); $db->autocommit(true);
        error_log('Aurora profile update failed for user '.$userId.': '.$dbError);
        aurora_response(array('message'=>'Không thể cập nhật hồ sơ trong aurora_db.'), 500);
    }
    $stmt->close();
    $db->commit(); $db->autocommit(true);
    $profile = aurora_profile_for_user($db, $userId);
    if (!$profile) aurora_response(array('message'=>'Đã lưu nhưng không thể tải lại hồ sơ.'), 500);
    aurora_response(array('message'=>'Cập nhật thông tin thành công.', 'profile'=>$profile, 'user'=>aurora_public_user($db, $userId)), 200);
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
    $selectedShowtimeId = isset($_GET['selected_showtime_id']) ? (int)$_GET['selected_showtime_id'] : 0;
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
    $selectedShowtime = null;
    while ($row = $result->fetch_assoc()) {
        $seatsTaken = (int)$row['seats_taken'];
        $totalSeats = (int)$row['total_seats'];
        $seatsLeft  = max(0, $totalSeats - $seatsTaken);
        $showtimeItem = array(
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
        $showtimes[] = $showtimeItem;
        if ($selectedShowtimeId > 0 && (int)$row['id'] === $selectedShowtimeId) $selectedShowtime = $showtimeItem;
    }
    aurora_response(array(
        'movie_id'        => $movieId,
        'server_time'     => $visibilityNow,
        'available_dates' => $availableDates,
        'showtimes'       => $showtimes,
        'selected_showtime'=> $selectedShowtime,
        'selected_showtime_available' => $selectedShowtimeId < 1 ? null : $selectedShowtime !== null,
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
    if (!$stmt->execute()) { $stmt->close(); aurora_response(array('message' => 'Không thể tải chi tiết suất chiếu.'), 500); }
    $stmt->store_result();
    $showtimeDbId=$movieDbId=$screenDbId=$durationMinutes=$totalSeats=$theaterDbId=null;
    $startsAt=$endsAt=$ticketPrice=$showtimeStatus=$movieTitle=$ageRating=$movieFormat=$movieGenre=$posterUrl=$screenName=$theaterName=$theaterAddress=$theaterCity=null;
    $stmt->bind_result($showtimeDbId,$movieDbId,$screenDbId,$startsAt,$endsAt,$ticketPrice,$showtimeStatus,$movieTitle,$ageRating,$movieFormat,$movieGenre,$posterUrl,$durationMinutes,$screenName,$totalSeats,$theaterDbId,$theaterName,$theaterAddress,$theaterCity);
    $row=null;
    if($stmt->fetch())$row=array('id'=>$showtimeDbId,'movie_id'=>$movieDbId,'screen_id'=>$screenDbId,'starts_at'=>$startsAt,'ends_at'=>$endsAt,'ticket_price'=>$ticketPrice,'status'=>$showtimeStatus,'title'=>$movieTitle,'age_rating'=>$ageRating,'format'=>$movieFormat,'genre'=>$movieGenre,'poster_url'=>$posterUrl,'duration_minutes'=>$durationMinutes,'screen_name'=>$screenName,'total_seats'=>$totalSeats,'theater_id'=>$theaterDbId,'theater_name'=>$theaterName,'address'=>$theaterAddress,'city'=>$theaterCity);
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
// Validate a voucher against the same conditions displayed on the offer page.
if ($resource === 'apply_voucher') {
    aurora_method('POST');
    aurora_require_user();
    $body = aurora_body();
    $code = isset($body['code']) ? strtoupper(trim((string)$body['code'])) : '';
    $total = isset($body['total']) ? (float)$body['total'] : 0;
    if ($code === '') aurora_response(array('message' => 'Vui lòng nhập mã voucher.'), 422);

    if (!aurora_ensure_vouchers($db)) aurora_response(array('message' => 'Không thể đọc danh mục voucher.'), 500);
    $stmt = $db->prepare("SELECT name, discount_type, discount_value, min_order_amount, max_discount FROM vouchers WHERE code=? AND status='active' AND starts_at <= NOW() AND ends_at >= NOW() AND (usage_limit=0 OR used_count < usage_limit) LIMIT 1");
    $stmt->bind_param('s', $code); $stmt->execute(); $stmt->bind_result($voucherName, $voucherType, $voucherValue, $minimumOrder, $maximumDiscount);
    $foundVoucher = $stmt->fetch(); $stmt->close();
    if (!$foundVoucher) {
        aurora_response(array('message' => 'Mã voucher không hợp lệ hoặc đã hết hạn.'), 404);
    }
    if ($total < (float)$minimumOrder) {
        aurora_response(array('message' => 'Đơn hàng cần đạt tối thiểu ' . number_format((float)$minimumOrder, 0, ',', '.') . 'đ để sử dụng mã này.'), 422);
    }
    $discount = 0;
    if ($voucherType === 'percent') {
        $discount = $total * (float)$voucherValue / 100;
    } else {
        $discount = min((float)$voucherValue, $total);
    }
    if ((float)$maximumDiscount > 0) $discount = min($discount, (float)$maximumDiscount);
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
    if(!$stmt->execute()){$stmt->close();aurora_response(array('message'=>'Không thể tải chi tiết đơn đặt vé.'),500);}
    $stmt->store_result();
    $bookingDbId=$totalAmount=$ticketPrice=$durationMinutes=null;
    $bookingCode=$bookingStatus=$bookingCreatedAt=$startsAt=$endsAt=$movieTitle=$posterUrl=$ageRating=$movieFormat=$screenName=$theaterName=$theaterAddress=$theaterCity=$seatsRaw=$seatsDisplay=null;
    $stmt->bind_result($bookingDbId,$bookingCode,$totalAmount,$bookingStatus,$bookingCreatedAt,$startsAt,$endsAt,$ticketPrice,$movieTitle,$posterUrl,$ageRating,$movieFormat,$durationMinutes,$screenName,$theaterName,$theaterAddress,$theaterCity,$seatsRaw,$seatsDisplay);
    $row=null;
    if($stmt->fetch())$row=array('id'=>$bookingDbId,'booking_code'=>$bookingCode,'total_amount'=>$totalAmount,'status'=>$bookingStatus,'created_at'=>$bookingCreatedAt,'starts_at'=>$startsAt,'ends_at'=>$endsAt,'ticket_price'=>$ticketPrice,'movie_title'=>$movieTitle,'poster_url'=>$posterUrl,'age_rating'=>$ageRating,'format'=>$movieFormat,'duration_minutes'=>$durationMinutes,'screen_name'=>$screenName,'theater_name'=>$theaterName,'theater_address'=>$theaterAddress,'city'=>$theaterCity,'seats_raw'=>$seatsRaw,'seats_display'=>$seatsDisplay);
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
