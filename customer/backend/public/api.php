<?php

// Compatibility endpoint for WAMP installations that still run an old PHP version.
// It reads the same aurora_db used by the Laravel API and does not contain seed data.
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:3000');
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

if ($resource === 'movies') {
    $result = $db->query('SELECT id, title, description, duration_minutes, age_rating, format, poster_url, trailer_url, status, release_date FROM movies ORDER BY release_date');
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $movies = array();
    while ($row = $result->fetch_assoc()) {
        $movies[] = array('id' => (int) $row['id'], 'title' => $row['title'], 'description' => $row['description'],
            'durationMinutes' => (int) $row['duration_minutes'], 'ageRating' => $row['age_rating'], 'format' => $row['format'],
            'posterUrl' => $row['poster_url'], 'trailerUrl' => $row['trailer_url'], 'status' => $row['status'], 'releaseDate' => $row['release_date']);
    }
    aurora_response(array('movies' => $movies), 200);
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
    $date = isset($_GET['date']) ? $db->real_escape_string($_GET['date']) : '';
    $where = $theaterId ? ' AND s.theater_id = '.$theaterId : '';
    if ($date !== '') $where .= " AND DATE(st.starts_at) = '".$date."'";
    $sql = "SELECT st.id, st.movie_id, s.theater_id, st.screen_id, s.name AS screen_name, m.title AS movie_title, st.starts_at, st.ends_at, st.ticket_price, st.status FROM showtimes st INNER JOIN screens s ON s.id = st.screen_id INNER JOIN movies m ON m.id = st.movie_id WHERE st.status = 'OPEN'".$where." ORDER BY st.starts_at";
    $result = $db->query($sql);
    if (!$result) aurora_response(array('message' => $db->error), 500);
    $showtimes = array();
    while ($row = $result->fetch_assoc()) { $row['id'] = (int) $row['id']; $row['movie_id'] = (int) $row['movie_id']; $row['theater_id'] = (int) $row['theater_id']; $row['screen_id'] = (int) $row['screen_id']; $showtimes[] = $row; }
    aurora_response(array('showtimes' => $showtimes), 200);
}

if ($resource === 'me') aurora_response(array('user' => null), 200);
if ($resource === 'logout') aurora_response(array('user' => null), 200);
aurora_response(array('message' => 'API không tồn tại.'), 404);
