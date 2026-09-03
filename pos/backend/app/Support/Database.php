<?php

namespace App\Support;

use mysqli;
use RuntimeException;

class Database
{
    public static function connect(): mysqli
    {
        $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
        $port = (int) ($_ENV['DB_PORT'] ?? 3306);
        $database = $_ENV['DB_DATABASE'] ?? 'aurora_pos';
        $username = $_ENV['DB_USERNAME'] ?? 'root';
        $password = $_ENV['DB_PASSWORD'] ?? '';

        $connection = new mysqli($host, $username, $password, $database, $port);

        if ($connection->connect_error) {
            throw new RuntimeException('Không thể kết nối MySQL: ' . $connection->connect_error);
        }

        $connection->set_charset('utf8mb4');

        return $connection;
    }
}
