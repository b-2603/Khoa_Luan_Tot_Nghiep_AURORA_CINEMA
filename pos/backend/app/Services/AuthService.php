<?php

namespace App\Services;

use App\Models\PosUser;
use mysqli;
use RuntimeException;

class AuthService
{
    public function __construct(private readonly mysqli $connection)
    {
    }

    public function login(string $username, string $password): array
    {
        $username = trim($username);
        $password = trim($password);

        if ($username === '' || $password === '') {
            throw new RuntimeException('Tên đăng nhập và mật khẩu không được để trống.');
        }

        $statement = $this->connection->prepare('SELECT id, username, password_hash, full_name, role, status FROM pos_users WHERE username = ? LIMIT 1');
        if (!$statement) {
            throw new RuntimeException('Không thể chuẩn bị truy vấn đăng nhập.');
        }

        $statement->bind_param('s', $username);
        $statement->execute();
        $result = $statement->get_result();
        $user = $result->fetch_assoc();

        if (!$user) {
            throw new RuntimeException('Tên đăng nhập không tồn tại.');
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new RuntimeException('Mật khẩu không chính xác.');
        }

        if (($user['status'] ?? 'active') !== 'active') {
            throw new RuntimeException('Tài khoản đang bị khóa.');
        }

        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'status' => $user['status'],
        ];
    }

    public function getUserById(int $id): ?array
    {
        $statement = $this->connection->prepare('SELECT id, username, full_name, role, status FROM pos_users WHERE id = ? LIMIT 1');
        if (!$statement) {
            return null;
        }

        $statement->bind_param('i', $id);
        $statement->execute();
        $result = $statement->get_result();
        $user = $result->fetch_assoc();

        if (!$user) {
            return null;
        }

        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'status' => $user['status'],
        ];
    }

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_DEFAULT);
    }
}
