<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$directory = dirname(__FILE__);
$config = require $directory . '/../config/app.php';
$database = $config['db'];
$connection = @new mysqli(
    $database['host'],
    $database['username'],
    $database['password'],
    $database['database'],
    (int) $database['port']
);

if ($connection->connect_errno) {
    fwrite(STDERR, "Không thể kết nối aurora_db: {$connection->connect_error}\n");
    exit(1);
}

$connection->set_charset('utf8');
$sql = file_get_contents($directory . '/product_planning.sql');
if ($sql === false || !$connection->multi_query($sql)) {
    fwrite(STDERR, "Không thể chạy migration danh mục hàng hóa: {$connection->error}\n");
    exit(1);
}

do {
    if ($result = $connection->store_result()) {
        $result->free();
    }
    if (!$connection->more_results()) {
        break;
    }
    if (!$connection->next_result()) {
        fwrite(STDERR, "Migration dừng do lỗi SQL: {$connection->error}\n");
        exit(1);
    }
} while (true);

$summary = array();
foreach (array('products', 'product_categories', 'product_units', 'product_plans', 'product_plan_items', 'product_plan_theaters', 'theater_product_inventory', 'product_inventory_movements') as $table) {
    $result = $connection->query("SELECT COUNT(*) total FROM `{$table}`");
    if (!$result) {
        fwrite(STDERR, "Không thể xác minh bảng {$table}: {$connection->error}\n");
        exit(1);
    }
    $row = $result->fetch_assoc();
    $summary[$table] = (int) $row['total'];
    $result->free();
}

$payload = array(
    'success' => true,
    'database' => $database['database'],
    'tables' => $summary,
);
$jsonOptions = 0;
if (defined('JSON_UNESCAPED_UNICODE')) $jsonOptions |= JSON_UNESCAPED_UNICODE;
if (defined('JSON_PRETTY_PRINT')) $jsonOptions |= JSON_PRETTY_PRINT;
echo ($jsonOptions ? json_encode($payload, $jsonOptions) : json_encode($payload)) . PHP_EOL;
