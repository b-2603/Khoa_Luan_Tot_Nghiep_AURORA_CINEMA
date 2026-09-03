<?php

session_start();

$allowedOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (preg_match('/^http:\/\/localhost:(3000|3001)$/', $allowedOrigin)) {
    header("Access-Control-Allow-Origin: {$allowedOrigin}");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($payload, $status = 200)
{
    $statusMessages = array(
        200 => 'OK',
        201 => 'Created',
        204 => 'No Content',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        405 => 'Method Not Allowed',
        409 => 'Conflict',
        422 => 'Unprocessable Entity',
        500 => 'Internal Server Error',
    );
    header('HTTP/1.1 ' . $status . ' ' . (isset($statusMessages[$status]) ? $statusMessages[$status] : 'Error'));
    echo json_encode($payload);
    exit;
}

function requestBody()
{
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : array();
}

function publicUser($user)
{
    return array(
        'id' => (int) $user['id'],
        'fullName' => $user['full_name'],
        'email' => $user['email'],
        'membershipLevel' => $user['membership_level'],
        'points' => (int) $user['points'],
    );
}

function makePasswordHash($password)
{
    if (function_exists('password_hash')) {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    $salt = substr(str_replace('+', '.', base64_encode(sha1(uniqid('', true), true))), 0, 22);
    return crypt($password, '$2y$10$' . $salt);
}

function verifyPassword($password, $hash)
{
    if (function_exists('password_verify')) {
        return password_verify($password, $hash);
    }

    return crypt($password, $hash) === $hash;
}

$connection = new mysqli('127.0.0.1', 'root', '', 'aurora_db', 3306);
if ($connection->connect_error) {
    respond(array('message' => 'Không thể kết nối aurora_db: ' . $connection->connect_error), 500);
}
$connection->set_charset('utf8');

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'oauth_start') {
    $provider = isset($_GET['provider']) ? $_GET['provider'] : '';
    $clientId = $provider === 'google' ? getenv('AURORA_GOOGLE_CLIENT_ID') : getenv('AURORA_FACEBOOK_APP_ID');
    $redirectUri = getenv('AURORA_OAUTH_REDIRECT_URI');
    $frontendUrl = getenv('AURORA_FRONTEND_URL');

    if (!$clientId || !$redirectUri || !$frontendUrl || !in_array($provider, array('google', 'facebook'))) {
        respond(array('message' => 'Đăng nhập mạng xã hội chưa được cấu hình. Hãy khai báo Client ID và Redirect URI trong backend.'), 503);
    }

    $_SESSION['oauth_state'] = sha1(uniqid('', true));
    $_SESSION['oauth_provider'] = $provider;
    if ($provider === 'google') {
        $query = http_build_query(array(
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $_SESSION['oauth_state'],
            'access_type' => 'online',
        ));
        respond(array('url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . $query));
    }

    $query = http_build_query(array(
        'client_id' => $clientId,
        'redirect_uri' => $redirectUri,
        'response_type' => 'code',
        'scope' => 'email,public_profile',
        'state' => $_SESSION['oauth_state'],
    ));
    respond(array('url' => 'https://www.facebook.com/v18.0/dialog/oauth?' . $query));
}

if ($action === 'me') {
    if (!isset($_SESSION['user_id'])) {
        respond(array('user' => null));
    }

    $statement = $connection->prepare('SELECT id, full_name, email, membership_level, points FROM users WHERE id = ?');
    $statement->bind_param('i', $_SESSION['user_id']);
    $statement->execute();
    $statement->bind_result($id, $fullName, $userEmail, $membershipLevel, $points);
    $user = $statement->fetch() ? array(
        'id' => $id,
        'full_name' => $fullName,
        'email' => $userEmail,
        'membership_level' => $membershipLevel,
        'points' => $points,
    ) : null;
    respond(array('user' => $user ? publicUser($user) : null));
}

if ($action === 'movies') {
    $statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
    $sql = 'SELECT id, title, description, duration_minutes, age_rating, format, poster_url, trailer_url, status, release_date FROM movies';
    if ($statusFilter !== '') {
        $cleanStatus = mysqli_real_escape_string($connection, $statusFilter);
        $sql .= " WHERE status = '{$cleanStatus}'";
    }
    $sql .= ' ORDER BY id ASC';
    $result = $connection->query($sql);
    $movies = array();
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $movies[] = array(
                'id' => (int) $row['id'],
                'title' => $row['title'],
                'description' => $row['description'],
                'durationMinutes' => (int) $row['duration_minutes'],
                'ageRating' => $row['age_rating'],
                'format' => $row['format'],
                'posterUrl' => $row['poster_url'],
                'trailerUrl' => $row['trailer_url'],
                'status' => $row['status'],
                'releaseDate' => $row['release_date'],
            );
        }
    }
    respond(array('movies' => $movies));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(array('message' => 'Phương thức không được hỗ trợ.'), 405);
}

$body = requestBody();
$email = strtolower(trim((string) (isset($body['email']) ? $body['email'] : '')));
$password = (string) (isset($body['password']) ? $body['password'] : '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
    respond(array('message' => 'Email hoặc mật khẩu không hợp lệ.'), 422);
}

if ($action === 'register') {
    $fullName = trim((string) (isset($body['fullName']) ? $body['fullName'] : ''));
    if ($fullName === '' || strlen($password) < 6) {
        respond(array('message' => 'Họ tên không được để trống và mật khẩu cần ít nhất 6 ký tự.'), 422);
    }

    $check = $connection->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->bind_param('s', $email);
    $check->execute();
    $check->bind_result($existingId);
    if ($check->fetch()) {
        respond(array('message' => 'Email này đã được đăng ký.'), 409);
    }

    $passwordHash = makePasswordHash($password);
    $statement = $connection->prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
    $statement->bind_param('sss', $fullName, $email, $passwordHash);
    if (!$statement->execute()) {
        respond(array('message' => 'Không thể tạo tài khoản.'), 500);
    }
    $_SESSION['user_id'] = $statement->insert_id;

    $user = array(
        'id' => $statement->insert_id,
        'full_name' => $fullName,
        'email' => $email,
        'membership_level' => 'STANDARD',
        'points' => 0,
    );
    respond(array('user' => publicUser($user)), 201);
}

if ($action === 'login') {
    $statement = $connection->prepare('SELECT id, full_name, email, password_hash, membership_level, points FROM users WHERE email = ? LIMIT 1');
    $statement->bind_param('s', $email);
    $statement->execute();
    $statement->bind_result($id, $fullName, $userEmail, $passwordHash, $membershipLevel, $points);
    $user = $statement->fetch() ? array(
        'id' => $id,
        'full_name' => $fullName,
        'email' => $userEmail,
        'password_hash' => $passwordHash,
        'membership_level' => $membershipLevel,
        'points' => $points,
    ) : null;

    if (!$user || !verifyPassword($password, $user['password_hash'])) {
        respond(array('message' => 'Email hoặc mật khẩu không chính xác.'), 401);
    }

    $_SESSION['user_id'] = (int) $user['id'];
    respond(array('user' => publicUser($user)));
}

respond(array('message' => 'Tác vụ không hợp lệ.'), 400);
