<?php

class AuthController
{
    private $db;

    public function __construct($database)
    {
        $this->db = $database;
    }

    private function verifyPassword($password, $storedHash)
    {
        if ($storedHash === '') return false;
        if (function_exists('password_verify') && password_verify($password, $storedHash)) return true;
        if (strpos($storedHash, 'sha256:') === 0) {
            $parts = explode(':', $storedHash, 3);
            if (count($parts) === 3 && hash('sha256', $parts[1] . ':' . $password) === $parts[2]) return true;
        }
        // PHP 5.2 installations use crypt() for passwords created from the
        // account dialog; newer installations transparently use bcrypt above.
        if (strpos($storedHash, '$2') !== 0 && crypt($password, $storedHash) === $storedHash) return true;
        return false;
    }

    private function ensureTheaterScopeSchema()
    {
        $column = $this->db->query("SHOW COLUMNS FROM tms_users LIKE 'theater_id'");
        if (!$column || $column->num_rows === 0) {
            $this->db->query("ALTER TABLE tms_users ADD COLUMN theater_id BIGINT UNSIGNED NULL AFTER phone");
        }
    }

    public function login()
    {
        $this->ensureTheaterScopeSchema();
        $input = requestJson();
        $username = isset($input['username']) ? trim($input['username']) : '';
        $password = isset($input['password']) ? trim($input['password']) : '';

        if ($username === '' || $password === '') {
            jsonResponse(array(
                'success' => false,
                'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'
            ), 400);
        }

        // users là nguồn định danh duy nhất của TMS. Điều này bảo đảm tài khoản
        // được Admin Tổng tạo (bao gồm Marketing) đăng nhập được ngay và id
        // trong session luôn trùng với id mà requireAdmin() xác minh.
        $stmt = $this->db->prepare("SELECT u.id, u.username, u.password_hash, u.full_name, u.phone, u.email, u.role, u.status, u.theater_id, t.name AS theater_name FROM users u LEFT JOIN theaters t ON t.id=u.theater_id WHERE u.username = ? AND u.role <> 'customer' LIMIT 1");
        if (!$stmt) {
            jsonResponse(array(
                'success' => false,
                'message' => 'Lỗi chuẩn bị truy vấn cơ sở dữ liệu: ' . $this->db->error
            ), 500);
        }

        $stmt->bind_param('s', $username);
        $stmt->execute();
        $res = $stmt->get_result();
        $user = $res ? $res->fetch_assoc() : null;

        if (!$user) {
            jsonResponse(array(
                'success' => false,
                'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'
            ), 401);
        }

        // Kiểm tra mật khẩu (hỗ trợ password_verify hoặc fallback an toàn)
        $passwordValid = $this->verifyPassword($password, $user['password_hash']);

        if (!$passwordValid) {
            jsonResponse(array(
                'success' => false,
                'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'
            ), 401);
        }

        if ($user['status'] !== 'active') {
            jsonResponse(array(
                'success' => false,
                'message' => 'Tài khoản nhân sự TMS đang bị tạm khóa.'
            ), 403);
        }

        // Cập nhật last_login trong database
        $this->db->query("UPDATE users SET last_login = NOW() WHERE id = " . (int)$user['id']);

        $userData = array(
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'phone' => $user['phone'],
            'email' => isset($user['email']) ? $user['email'] : '',
            'role' => $user['role'],
            'theater_id' => !empty($user['theater_id']) ? (int)$user['theater_id'] : 0,
            'theater_name' => !empty($user['theater_name']) ? $user['theater_name'] : '',
            'system' => 'TMS - Theater Management System',
            'cinema' => 'AURORA CINEMA'
        );

        $_SESSION['tms_user'] = $userData;

        jsonResponse(array(
            'success' => true,
            'message' => 'Đăng nhập hệ thống TMS thành công.',
            'data' => array(
                'user' => $userData,
                'token' => 'tms_' . md5($user['username'] . time())
            )
        ));
    }

    public function logout()
    {
        unset($_SESSION['tms_user']);
        session_destroy();

        jsonResponse(array(
            'success' => true,
            'message' => 'Đã đăng xuất khỏi hệ thống TMS an toàn.'
        ));
    }

    public function me()
    {
        $user = isset($_SESSION['tms_user']) ? $_SESSION['tms_user'] : null;
        if (!$user) {
            jsonResponse(array(
                'success' => false,
                'message' => 'Chưa đăng nhập.'
            ), 401);
        }

        jsonResponse(array(
            'success' => true,
            'data' => $user
        ));
    }

    public function sso()
    {
        // SSO giả lập tự động với tài khoản Quản lý
        $stmt = $this->db->query("SELECT id, username, full_name, phone, role, status FROM tms_users WHERE username = '0328754062' OR username = 'admin' LIMIT 1");
        $user = $stmt ? $stmt->fetch_assoc() : array(
            'id' => 1,
            'username' => '0328754062',
            'full_name' => 'Nguyễn Trần Thái Bảo',
            'role' => 'director',
        );

        $userData = array(
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'system' => 'TMS SSO Gateway',
            'cinema' => 'AURORA CINEMA'
        );

        $_SESSION['tms_user'] = $userData;

        jsonResponse(array(
            'success' => true,
            'message' => 'Đăng nhập SSO thành công.',
            'data' => array(
                'user' => $userData
            )
        ));
    }
}
