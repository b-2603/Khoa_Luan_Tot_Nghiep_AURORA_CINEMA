<?php
header('Content-Type: application/json; charset=utf-8');

$host = '127.0.0.1';
$port = 3306;
$username = 'root';
$password = '';

$mysqli = @new mysqli($host, $username, $password, 'aurora_db', $port);
if ($mysqli->connect_error) {
    echo json_encode(array(
        'success' => false,
        'message' => 'Không thể kết nối aurora_db: ' . $mysqli->connect_error
    ));
    exit;
}

$mysqli->set_charset('utf8');

$phone = '0328754062';
$passwordHash = '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2';
$fullName = 'Nguyễn Trần Thái Bảo';

// Tài khoản POS dùng chung bảng users với TMS và website.
$updateSql = "UPDATE `users` SET `username` = '{$phone}', `password_hash` = '{$passwordHash}', `full_name` = '{$fullName}', `role` = 'cashier', `status` = 'active' WHERE `id` = 1 OR `username` = 'admin' OR `username` = '0328754062'";
$mysqli->query($updateSql);

// Kiểm tra lại sau khi cập nhật
$result = $mysqli->query("SELECT id, username, password_hash, full_name, role, status, created_at FROM `users` WHERE `username` = '{$phone}' LIMIT 1");
$user = $result ? $result->fetch_assoc() : null;

echo json_encode(array(
    'success' => true,
    'message' => 'Đã cập nhật trực tiếp vào MySQL Database aurora_db thành công!',
    'updated_user' => $user
));
