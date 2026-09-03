<?php

class Database
{
    private static $connection = null;

    public static function connect()
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $config = require __DIR__ . '/../../config/app.php';
        $dbConfig = $config['db'];

        $host = isset($_ENV['DB_HOST']) ? $_ENV['DB_HOST'] : $dbConfig['host'];
        $port = isset($_ENV['DB_PORT']) ? (int) $_ENV['DB_PORT'] : $dbConfig['port'];
        $database = isset($_ENV['DB_DATABASE']) ? $_ENV['DB_DATABASE'] : $dbConfig['database'];
        $username = isset($_ENV['DB_USERNAME']) ? $_ENV['DB_USERNAME'] : $dbConfig['username'];
        $password = isset($_ENV['DB_PASSWORD']) ? $_ENV['DB_PASSWORD'] : $dbConfig['password'];

        $mysqli = @new mysqli($host, $username, $password, $database, $port);

        if ($mysqli->connect_error) {
            // Thử kết nối tạo database nếu database chưa tồn tại
            $rootConn = @new mysqli($host, $username, $password, '', $port);
            if (!$rootConn->connect_error) {
                $rootConn->query("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $rootConn->close();
                $mysqli = @new mysqli($host, $username, $password, $database, $port);
            }
        }

        if ($mysqli->connect_error) {
            throw new Exception('Không thể kết nối MySQL TMS: ' . $mysqli->connect_error);
        }

        $mysqli->set_charset('utf8mb4');
        self::$connection = $mysqli;

        return self::$connection;
    }
}
