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
        $timezone = isset($config['timezone']) ? $config['timezone'] : 'Asia/Ho_Chi_Minh';
        if (!date_default_timezone_set($timezone)) {
            throw new Exception('Múi giờ TMS không hợp lệ: ' . $timezone);
        }
        $dbTimezone = isset($config['db_timezone']) ? $config['db_timezone'] : '+07:00';
        if (!preg_match('/^[+-](?:0\d|1[0-4]):[0-5]\d$/', $dbTimezone)) {
            throw new Exception('Múi giờ MySQL TMS không hợp lệ.');
        }

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
                $rootConn->query("CREATE DATABASE IF NOT EXISTS `{$database}` CHARACTER SET utf8 COLLATE utf8_unicode_ci");
                $rootConn->close();
                $mysqli = @new mysqli($host, $username, $password, $database, $port);
            }
        }

        if ($mysqli->connect_error) {
            throw new Exception('Không thể kết nối MySQL TMS: ' . $mysqli->connect_error);
        }

        $mysqli->set_charset('utf8');
        if (!$mysqli->query("SET time_zone = '" . $dbTimezone . "'")) {
            throw new Exception('Không thể đặt múi giờ MySQL cho TMS: ' . $mysqli->error);
        }
        self::$connection = $mysqli;

        return self::$connection;
    }
}
