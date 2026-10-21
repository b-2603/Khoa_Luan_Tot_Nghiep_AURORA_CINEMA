<?php
// POS still runs on the supplied PHP 5.2 WAMP stack. Keep this entrypoint
// backwards-compatible while enforcing a database-backed employee session.
if (session_id() === '') {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    session_start();
}
header('Content-Type: application/json; charset=utf-8');

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed = array(
    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:3000',
    'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://127.0.0.1:3000'
);

if (in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

$requestMethod = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
if ($requestMethod === 'OPTIONS') {
    header('HTTP/1.1 204 No Content');
    exit;
}

function jsonResponse($payload, $status = 200) {
    if ($status === 204) header('HTTP/1.1 204 No Content');
    else if ($status === 400) header('HTTP/1.1 400 Bad Request');
    else if ($status === 401) header('HTTP/1.1 401 Unauthorized');
    else if ($status === 403) header('HTTP/1.1 403 Forbidden');
    else if ($status === 404) header('HTTP/1.1 404 Not Found');
    else if ($status === 500) header('HTTP/1.1 500 Internal Server Error');
    else header('HTTP/1.1 ' . $status . ' OK');
    echo json_encode($payload);
    exit;
}

function requestJson() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : (!empty($_POST) ? $_POST : array());
}

function passwordMatches($password, $hash) {
    $legacyPrefix = 'sha256:aurora-pos-local-2026:';
    if (strpos($hash, $legacyPrefix) === 0) {
        $expected = substr($hash, strlen($legacyPrefix));
        return hash('sha256', 'aurora-pos-local-2026:' . $password) === $expected;
    }
    if (function_exists('password_verify')) {
        return password_verify($password, $hash);
    }
    return crypt($password, $hash) === $hash;
}

function findPosUser($db, $username) {
    $stmt = $db->prepare("SELECT pu.id,pu.username,pu.password_hash,pu.full_name,pu.role,pu.status,pu.theater_id,pu.counter_code,pu.counter_role_code,COALESCE(cr.name,'Box Ticket'),COALESCE(cr.can_sell_tickets,1),COALESCE(cr.can_sell_concessions,1),COALESCE(cr.can_redeem_online_booking,0),COALESCE(cr.can_sell_merchandise,0) FROM pos_users pu LEFT JOIN pos_counter_roles cr ON cr.code=pu.counter_role_code WHERE pu.username=? LIMIT 1");
    if (!$stmt) return null;
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $id = null; $foundUsername = null; $passwordHash = null; $fullName = null; $role = null; $status = null; $assignedTheaterId = 1; $counterCode = 'AURORA BOX 02';
    $counterRoleCode=null;$counterRoleName=null;$canTickets=0;$canConcessions=0;$canRedeem=0;$canMerchandise=0;
    $stmt->bind_result($id, $foundUsername, $passwordHash, $fullName, $role, $status, $assignedTheaterId, $counterCode,$counterRoleCode,$counterRoleName,$canTickets,$canConcessions,$canRedeem,$canMerchandise);
    $found = $stmt->fetch();
    $stmt->close();
    if (!$found) return null;
    if (!$assignedTheaterId) $assignedTheaterId = 1;
    return array('id'=>(int)$id,'username'=>$foundUsername,'password_hash'=>$passwordHash,'full_name'=>$fullName,'role'=>$role,'status'=>$status,'theater_id'=>$assignedTheaterId,'counter_code'=>$counterCode,'counter_role_code'=>$counterRoleCode,'counter_role_name'=>$counterRoleName,'capabilities'=>array('sell_tickets'=>(int)$canTickets===1,'sell_concessions'=>(int)$canConcessions===1,'redeem_online_booking'=>(int)$canRedeem===1,'sell_merchandise'=>(int)$canMerchandise===1));
}


function getPosTheater($db, $theaterId) {
    $stmt = $db->prepare('SELECT id, name, address, city FROM theaters WHERE id = ? LIMIT 1');
    if (!$stmt) return null;
    $stmt->bind_param('i', $theaterId); $stmt->execute();
    $id = null; $name = null; $address = null; $city = null; $stmt->bind_result($id, $name, $address, $city);
    $found = $stmt->fetch(); $stmt->close();
    return $found ? array('id' => (int)$id, 'name' => $name, 'address' => $address, 'city' => $city) : null;
}

function posUser() {
    return isset($_SESSION['pos_user']) ? $_SESSION['pos_user'] : null;
}

function posCapabilitiesForAreas($salesAreas) {
    if (!is_array($salesAreas)) $salesAreas = explode(',', (string)$salesAreas);
    $areas = array();
    foreach ($salesAreas as $area) {
        $area = trim((string)$area);
        if ($area === 'box_office') $area = 'box_ticket';
        if (in_array($area, array('box_ticket','concession','merchandise'), true) && !in_array($area,$areas,true)) $areas[]=$area;
    }
    return array(
        'sell_tickets' => in_array('box_ticket', $areas, true),
        'sell_concessions' => in_array('concession', $areas, true),
        'redeem_online_booking' => in_array('box_ticket', $areas, true),
        'sell_merchandise' => in_array('merchandise', $areas, true)
    );
}

function posAreaLabel($salesAreas) {
    if (!is_array($salesAreas)) $salesAreas = explode(',', (string)$salesAreas);
    $labels = array('box_office'=>'Box Ticket','box_ticket'=>'Box Ticket','concession'=>'Concession','merchandise'=>'Merchandise');
    $selected = array();
    foreach ($salesAreas as $area) {
        $area = trim($area);
        if (isset($labels[$area])) $selected[] = $labels[$area];
    }
    return $selected ? implode(', ', $selected) : 'Không có khu vực được cấp';
}

function requirePosUser() {
    global $db;
    if (empty($_SESSION['pos_user'])) {
        jsonResponse(array('success' => false, 'message' => 'Phiên đăng nhập quầy đã hết hạn.'), 401);
    }
    $user = $_SESSION['pos_user'];
    $shift = $user['role'] !== 'admin' && isset($db) ? posAuthorizedShift($db, (int)$user['id']) : null;
    if ($user['role'] !== 'admin' && !$shift) {
        unset($_SESSION['pos_shift_id']);
        unset($_SESSION['pos_user']);
        jsonResponse(array(
            'success' => false,
            'code' => 'SHIFT_AUTHORIZATION_REQUIRED',
            'message' => 'Phiên làm việc đã kết thúc hoặc chưa được cấp lại. Vui lòng liên hệ Admin Rạp hoặc Supervisor để mở phiên mới.'
        ), 403);
    }
    if ($user['role'] !== 'admin') {
        $user['capabilities'] = posCapabilitiesForAreas($shift['sales_areas']);
        $user['counter_role_name'] = posAreaLabel($shift['sales_areas']);
        $_SESSION['pos_user'] = $user;
    }
    return $user;
}

function requirePosCapability($capability) {
    $user=requirePosUser();
    if (empty($user['capabilities'][$capability]) && $user['role']!=='admin') jsonResponse(array('success'=>false,'message'=>'Phiên hiện tại không được cấp khu vực nghiệp vụ cần thiết.'),403);
    return $user;
}

function ensurePosSalesTables($db) {
    // Schema is deployed centrally; POS must never create a divergent local schema.
    foreach (array('products', 'orders', 'order_items', 'payments') as $table) {
        if (!$db->query("SELECT 1 FROM `{$table}` LIMIT 1")) return false;
    }
    $inventoryQueries=array(
        "CREATE TABLE IF NOT EXISTS theater_product_inventory (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,theater_id BIGINT UNSIGNED NOT NULL,product_id BIGINT UNSIGNED NOT NULL,stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,reorder_level INT UNSIGNED NOT NULL DEFAULT 10,last_plan_id BIGINT UNSIGNED NULL,updated_at DATETIME NOT NULL,UNIQUE KEY uq_theater_product_inventory(theater_id,product_id),KEY idx_theater_inventory_stock(theater_id,stock_quantity)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS product_inventory_movements (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,theater_id BIGINT UNSIGNED NOT NULL,product_id BIGINT UNSIGNED NOT NULL,order_id BIGINT UNSIGNED NULL,plan_id BIGINT UNSIGNED NULL,movement_type VARCHAR(30) NOT NULL,quantity INT NOT NULL,stock_before INT UNSIGNED NOT NULL,stock_after INT UNSIGNED NOT NULL,reference_code VARCHAR(80) NULL,performed_by BIGINT UNSIGNED NULL,performed_by_name VARCHAR(120) NULL,created_at DATETIME NOT NULL,KEY idx_inventory_movement_theater(theater_id,created_at),KEY idx_inventory_movement_product(product_id,created_at),KEY idx_inventory_movement_order(order_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
    );
    foreach($inventoryQueries as $query)if(!$db->query($query))return false;
    // A single POS cart can contain tickets, concessions and merchandise.
    $itemTypeColumn=$db->query("SHOW COLUMNS FROM order_items LIKE 'item_type'");
    $itemTypeDefinition=$itemTypeColumn?$itemTypeColumn->fetch_assoc():null;
    if(!$itemTypeDefinition)return false;
    if(stripos((string)$itemTypeDefinition['Type'],'MERCHANDISE')===false&&!$db->query("ALTER TABLE order_items MODIFY item_type ENUM('TICKET','COMBO','MERCHANDISE') NOT NULL"))return false;
    return true;

    $queries = array(
        "CREATE TABLE IF NOT EXISTS products (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL, sku VARCHAR(50) NOT NULL UNIQUE,
            category VARCHAR(80) NOT NULL DEFAULT 'Concession', price DECIMAL(12,2) NOT NULL DEFAULT 0,
            stock_quantity INT UNSIGNED NOT NULL DEFAULT 0, status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
        "CREATE TABLE IF NOT EXISTS orders (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            booking_id BIGINT UNSIGNED NULL,
            cashier_id INT UNSIGNED NOT NULL,
            order_code VARCHAR(30) NOT NULL UNIQUE,
            subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
            discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            payment_method ENUM('CASH','CARD','TRANSFER') NOT NULL DEFAULT 'CASH',
            amount_received DECIMAL(12,2) NOT NULL DEFAULT 0,
            change_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
            status ENUM('PAID','CANCELLED') NOT NULL DEFAULT 'PAID',
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_orders_created (created_at),
            INDEX idx_orders_cashier (cashier_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
        "CREATE TABLE IF NOT EXISTS order_items (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id BIGINT UNSIGNED NOT NULL,
            item_type ENUM('TICKET','COMBO') NOT NULL,
            item_code VARCHAR(60) NOT NULL,
            item_name VARCHAR(180) NOT NULL,
            quantity INT UNSIGNED NOT NULL,
            unit_price DECIMAL(12,2) NOT NULL,
            seat_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            INDEX idx_order_items_order (order_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
        "CREATE TABLE IF NOT EXISTS payments (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id BIGINT UNSIGNED NOT NULL,
            method ENUM('CASH','CARD','TRANSFER') NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            reference_code VARCHAR(80) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8",
    );
    foreach ($queries as $query) {
        if (!$db->query($query)) return false;
    }
    return true;
}

function posComboCatalog($db, $user = null, $theaterId = 0, $salesArea = '') {
    $catalog = array();
    $salesArea=trim((string)$salesArea);
    $isAdmin=$user&&$user['role']==='admin';
    $canConcession=!$user||$isAdmin||!empty($user['capabilities']['sell_concessions']);
    $canMerchandise=!$user||$isAdmin||!empty($user['capabilities']['sell_merchandise']);
    $canSellProducts=$salesArea==='concession'?$canConcession:($salesArea==='merchandise'?$canMerchandise:($canConcession||$canMerchandise));
    if (!$canSellProducts) return $catalog;
    $theaterId=(int)$theaterId;if($theaterId<1&&$user&&isset($user['theater_id']))$theaterId=(int)$user['theater_id'];if($theaterId<1)$theaterId=1;
    foreach(array('customer_price','pos_price','member_price') as $priceColumn){$check=$db->query("SHOW COLUMNS FROM products LIKE '{$priceColumn}'");if(!$check||$check->num_rows<1){if(!$db->query("ALTER TABLE products ADD COLUMN `{$priceColumn}` DECIMAL(12,2) NOT NULL DEFAULT 0"))return $catalog;}}
    $db->query("UPDATE products SET customer_price=price+10000,pos_price=price+10000,member_price=price WHERE customer_price<=0 OR pos_price<=0 OR member_price<=0");
    $merchandiseCondition="(LOWER(p.category) LIKE '%merchandise%' OR LOWER(p.category) LIKE '%souvenir%' OR LOWER(p.category) LIKE '%special%' OR LOWER(p.category) LIKE '%limited%' OR LOWER(p.category) LIKE '%quà%' OR LOWER(p.category) LIKE '%lưu niệm%')";
    $areaCondition='1=1';
    if($salesArea==='merchandise')$areaCondition=$merchandiseCondition;
    elseif($salesArea==='concession')$areaCondition='NOT '.$merchandiseCondition;
    elseif($canConcession&&!$canMerchandise)$areaCondition='NOT '.$merchandiseCondition;
    elseif($canMerchandise&&!$canConcession)$areaCondition=$merchandiseCondition;
    $result = $db->query("SELECT p.id,p.sku,p.name,p.description,p.unit,p.image_url,COALESCE(NULLIF(p.pos_price,0),p.price+10000) price,COALESCE(NULLIF(p.member_price,0),p.price) member_price,p.category,inv.stock_quantity,inv.reorder_level FROM products p INNER JOIN theater_product_inventory inv ON inv.product_id=p.id AND inv.theater_id={$theaterId} WHERE p.status='active' AND inv.stock_quantity>0 AND {$areaCondition} ORDER BY p.category,p.name");
    if (!$result) return $catalog;
    while ($row = $result->fetch_assoc()) {
        $catalog[$row['sku']] = array('id'=>(int)$row['id'],'code'=>$row['sku'],'name'=>$row['name'],'description'=>$row['description'],'unit'=>$row['unit'],'image_url'=>$row['image_url'],'price'=>(float)$row['price'],'member_price'=>(float)$row['member_price'],'category'=>$row['category'],'sales_area'=>$salesArea,'stock_quantity'=>(int)$row['stock_quantity'],'reorder_level'=>(int)$row['reorder_level']);
    }
    return $catalog;
}

function posDeductProductInventory($db,$theaterId,$catalog,$quantities,$orderId,$orderCode,$user) {
    $theaterId=(int)$theaterId;$orderId=(int)$orderId;$actor=(int)$user['id'];$actorName=$db->real_escape_string($user['full_name']);$reference=$db->real_escape_string($orderCode);$productIds=array();
    foreach($quantities as $sku=>$quantity){
        if(!isset($catalog[$sku])||(int)$quantity<1)continue;$product=$catalog[$sku];$productId=(int)$product['id'];$quantity=(int)$quantity;
        $locked=$db->query("SELECT stock_quantity FROM theater_product_inventory WHERE theater_id={$theaterId} AND product_id={$productId} FOR UPDATE");$row=$locked?$locked->fetch_assoc():null;$before=$row?(int)$row['stock_quantity']:0;
        if($before<$quantity)throw new Exception('Sản phẩm '.$product['name'].' chỉ còn '.$before.' '.$product['unit'].'.');$after=$before-$quantity;
        if(!$db->query("UPDATE theater_product_inventory SET stock_quantity={$after},updated_at=NOW() WHERE theater_id={$theaterId} AND product_id={$productId}"))throw new Exception('Không thể cập nhật tồn kho '.$product['name'].'.');
        if(!$db->query("INSERT INTO product_inventory_movements(theater_id,product_id,order_id,movement_type,quantity,stock_before,stock_after,reference_code,performed_by,performed_by_name,created_at) VALUES({$theaterId},{$productId},{$orderId},'POS_SALE',-{$quantity},{$before},{$after},'{$reference}',{$actor},'{$actorName}',NOW())"))throw new Exception('Không thể ghi lịch sử xuất kho '.$product['name'].'.');
        $productIds[]=$productId;
    }
    if($productIds&&!$db->query("UPDATE products p SET p.stock_quantity=(SELECT COALESCE(SUM(inv.stock_quantity),0) FROM theater_product_inventory inv WHERE inv.product_id=p.id) WHERE p.id IN (".implode(',',array_unique($productIds)).")"))throw new Exception('Không thể đồng bộ tổng tồn kho.');
}

function posMembershipCustomer($db, $customerId) {
    $customerId=(int)$customerId;if($customerId<1)return null;
    $result=$db->query("SELECT u.id,u.full_name,u.email,u.phone,COALESCE(c.card_number,'') card_number FROM users u LEFT JOIN customer_membership_cards c ON c.user_id=u.id WHERE u.id={$customerId} AND u.role='customer' AND u.status='active' LIMIT 1");
    return $result?$result->fetch_assoc():null;
}

function posHasBookingShowtimeColumn($db) {
    $result = $db->query("SHOW COLUMNS FROM booking_seats LIKE 'showtime_id'");
    return $result && $result->num_rows > 0;
}

function posEnsureSeatHolds($db) {
    $holdsReady=$db->query("CREATE TABLE IF NOT EXISTS seat_holds (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,showtime_id BIGINT UNSIGNED NOT NULL,seat_id BIGINT UNSIGNED NOT NULL,session_key VARCHAR(128) NOT NULL,user_id BIGINT UNSIGNED NULL,expires_at DATETIME NOT NULL,created_at DATETIME NOT NULL,updated_at DATETIME NOT NULL,UNIQUE KEY uq_seat_hold(showtime_id,seat_id),KEY idx_seat_hold_expiry(expires_at),KEY idx_seat_hold_session(session_key,showtime_id),CONSTRAINT fk_seat_holds_showtime FOREIGN KEY(showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    if(!$holdsReady)return false;
    return $db->query("CREATE TABLE IF NOT EXISTS seat_hold_sessions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,showtime_id BIGINT UNSIGNED NOT NULL,session_key VARCHAR(128) NOT NULL,user_id BIGINT UNSIGNED NULL,expires_at DATETIME NOT NULL,created_at DATETIME NOT NULL,updated_at DATETIME NOT NULL,UNIQUE KEY uq_seat_hold_session(showtime_id,session_key),KEY idx_seat_hold_session_expiry(expires_at),CONSTRAINT fk_seat_hold_session_showtime FOREIGN KEY(showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8");
}

function posCleanupSeatHolds($db) {
    $now=$db->real_escape_string(date('Y-m-d H:i:s'));
    $db->query("DELETE FROM seat_holds WHERE expires_at<='{$now}'");
    $db->query("DELETE FROM seat_hold_sessions WHERE expires_at<='{$now}'");
}

function posScalar($db,$sql) {
    $result=$db->query($sql);if(!$result)return null;$row=$result->fetch_row();return $row?$row[0]:null;
}

function posShowtimeTicketOptions($db, $showtimeId, $fallbackPrice) {
    $showtimeId = (int)$showtimeId; $options = array();
    $result = $db->query("SELECT tt.id,tt.code,tt.name,tt.description,tst.price FROM tms_showtime_ticket_types tst INNER JOIN ticket_types tt ON tt.id=tst.ticket_type_id WHERE tst.showtime_id={$showtimeId} AND tt.status='active' ORDER BY CASE tt.code WHEN 'TICKET_REGULAR' THEN 0 WHEN 'TICKET_CHILD' THEN 1 WHEN 'TICKET_STUDENT' THEN 2 WHEN 'TICKET_COUPLE' THEN 8 ELSE 5 END,tt.id");
    if ($result) while ($row = $result->fetch_assoc()) $options[] = array('id'=>(int)$row['id'],'code'=>$row['code'],'name'=>$row['name'],'description'=>$row['description'],'price'=>(float)$row['price']);
    if (!$options && (float)$fallbackPrice >= 0) $options[] = array('id'=>0,'code'=>'TICKET_REGULAR','name'=>'Vé thường','description'=>'Giá vé của suất chiếu','price'=>(float)$fallbackPrice);
    return $options;
}

function posDefaultTicketOption($options) {
    foreach ($options as $option) if ($option['code'] === 'TICKET_REGULAR') return $option;
    foreach ($options as $option) if ($option['code'] !== 'TICKET_COUPLE' && (float)$option['price'] > 0) return $option;
    return count($options) ? $options[0] : array('id'=>0,'code'=>'TICKET_REGULAR','name'=>'Vé thường','price'=>0);
}

function posTableColumnExists($db, $table, $column) {
    $safeTable = $db->real_escape_string($table); $safeColumn = $db->real_escape_string($column);
    $result = $db->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");
    return $result && $result->num_rows > 0;
}

function ensurePosAuthenticationSchema($db) {
    $queries = array(
        "CREATE TABLE IF NOT EXISTS pos_counter_roles (code VARCHAR(30) NOT NULL PRIMARY KEY,name VARCHAR(80) NOT NULL,description VARCHAR(255) NOT NULL,can_sell_tickets TINYINT(1) NOT NULL DEFAULT 0,can_sell_concessions TINYINT(1) NOT NULL DEFAULT 0,can_redeem_online_booking TINYINT(1) NOT NULL DEFAULT 0,can_sell_merchandise TINYINT(1) NOT NULL DEFAULT 0,is_active TINYINT(1) NOT NULL DEFAULT 1,sort_order INT NOT NULL DEFAULT 0,updated_at DATETIME NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_users (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(60) NOT NULL, password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(120) NOT NULL, phone VARCHAR(20) NULL,
            role ENUM('cashier','supervisor','admin') NOT NULL DEFAULT 'cashier',
            counter_role_code VARCHAR(30) NOT NULL DEFAULT 'box_ticket',
            status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
            theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
            counter_code VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02',
            last_login_at DATETIME NULL, issued_by_tms_user_id BIGINT UNSIGNED NULL,
            issued_by_name VARCHAR(120) NULL, updated_by_tms_user_id BIGINT UNSIGNED NULL,
            updated_by_name VARCHAR(120) NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL DEFAULT NULL, UNIQUE KEY uq_pos_users_username (username),
            KEY idx_pos_users_theater (theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_login_events (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NULL,
            username VARCHAR(60) NOT NULL, event_type VARCHAR(30) NOT NULL,
            is_success TINYINT(1) NOT NULL DEFAULT 0, ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_pos_login_user_created (user_id, created_at),
            KEY idx_pos_login_username_created (username, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_shifts (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
            theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1, cinema_name VARCHAR(120) NOT NULL,
            counter VARCHAR(60) NOT NULL, sales_areas VARCHAR(255) NOT NULL DEFAULT 'box_ticket',
            initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
            cash_at_close DECIMAL(12,2) NULL, status ENUM('active','paused','closed') NOT NULL DEFAULT 'active',
            opened_at DATETIME NOT NULL, closed_at DATETIME NULL, notes TEXT NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NULL DEFAULT NULL,
            KEY idx_pos_shifts_user_status (user_id, status), KEY idx_pos_shifts_theater (theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_booking_redemptions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,booking_id BIGINT UNSIGNED NOT NULL,theater_id BIGINT UNSIGNED NOT NULL,pos_user_id BIGINT UNSIGNED NOT NULL,pos_shift_id BIGINT UNSIGNED NULL,redeemed_at DATETIME NOT NULL,note VARCHAR(255) NULL,UNIQUE KEY uq_pos_booking_redemption (booking_id),KEY idx_pos_redemption_theater_date (theater_id,redeemed_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
        "CREATE TABLE IF NOT EXISTS pos_work_schedules (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, theater_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL, work_date DATE NOT NULL, start_time TIME NOT NULL,
            end_time TIME NOT NULL, sales_areas VARCHAR(255) NOT NULL, counter VARCHAR(60) NOT NULL,
            initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
            status ENUM('scheduled','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
            linked_shift_id BIGINT UNSIGNED NULL, notes VARCHAR(1000) NULL,
            created_by_tms_user_id BIGINT UNSIGNED NULL, created_by_name VARCHAR(120) NOT NULL,
            updated_by_tms_user_id BIGINT UNSIGNED NULL, updated_by_name VARCHAR(120) NULL,
            created_at DATETIME NOT NULL, updated_at DATETIME NULL,
            UNIQUE KEY uq_pos_work_assignment (theater_id,user_id,work_date,start_time),
            KEY idx_pos_work_date_status (theater_id,work_date,status),
            KEY idx_pos_work_counter (theater_id,counter,work_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
    );
    foreach ($queries as $query) if (!$db->query($query)) return false;
    if (!$db->query("INSERT INTO pos_counter_roles (code,name,description,can_sell_tickets,can_sell_concessions,can_redeem_online_booking,can_sell_merchandise,is_active,sort_order,updated_at) VALUES ('box_ticket','Box Ticket','Bán vé tại quầy, chọn ghế và đổi vé online',1,0,1,0,1,10,NOW()),('concession','Concession','Bán bắp nước, thức ăn và combo',0,1,0,0,1,20,NOW()),('merchandise','Merchandise','Bán quà lưu niệm và sản phẩm phim',0,0,0,1,1,30,NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),can_sell_tickets=VALUES(can_sell_tickets),can_sell_concessions=VALUES(can_sell_concessions),can_redeem_online_booking=VALUES(can_redeem_online_booking),can_sell_merchandise=VALUES(can_sell_merchandise),is_active=VALUES(is_active),sort_order=VALUES(sort_order),updated_at=NOW()")) return false;
    // Support an older POS database that was initialized before branch/counter fields existed.
    if (!posTableColumnExists($db, 'pos_users', 'theater_id') && !$db->query('ALTER TABLE pos_users ADD theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'counter_code') && !$db->query("ALTER TABLE pos_users ADD counter_code VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02'")) return false;
    if (!posTableColumnExists($db, 'pos_users', 'counter_role_code') && !$db->query("ALTER TABLE pos_users ADD counter_role_code VARCHAR(30) NOT NULL DEFAULT 'box_ticket'")) return false;
    if (!posTableColumnExists($db, 'pos_users', 'last_login_at') && !$db->query('ALTER TABLE pos_users ADD last_login_at DATETIME NULL')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'employee_code') && !$db->query('ALTER TABLE pos_users ADD employee_code VARCHAR(30) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'issued_by_tms_user_id') && !$db->query('ALTER TABLE pos_users ADD issued_by_tms_user_id BIGINT UNSIGNED NULL')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'issued_by_name') && !$db->query('ALTER TABLE pos_users ADD issued_by_name VARCHAR(120) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'updated_by_tms_user_id') && !$db->query('ALTER TABLE pos_users ADD updated_by_tms_user_id BIGINT UNSIGNED NULL')) return false;
    if (!posTableColumnExists($db, 'pos_users', 'updated_by_name') && !$db->query('ALTER TABLE pos_users ADD updated_by_name VARCHAR(120) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'theater_id') && !$db->query('ALTER TABLE pos_shifts ADD theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'sales_areas') && !$db->query("ALTER TABLE pos_shifts ADD sales_areas VARCHAR(255) NOT NULL DEFAULT 'box_ticket'")) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'expected_cash') && !$db->query('ALTER TABLE pos_shifts ADD expected_cash DECIMAL(12,2) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'cash_difference') && !$db->query('ALTER TABLE pos_shifts ADD cash_difference DECIMAL(12,2) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'close_note') && !$db->query('ALTER TABLE pos_shifts ADD close_note TEXT NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'closed_by') && !$db->query('ALTER TABLE pos_shifts ADD closed_by VARCHAR(120) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'authorized_by_tms_user_id') && !$db->query('ALTER TABLE pos_shifts ADD authorized_by_tms_user_id BIGINT UNSIGNED NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'authorized_by_name') && !$db->query('ALTER TABLE pos_shifts ADD authorized_by_name VARCHAR(120) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'authorized_by_role') && !$db->query('ALTER TABLE pos_shifts ADD authorized_by_role VARCHAR(30) NULL')) return false;
    if (!posTableColumnExists($db, 'pos_shifts', 'work_schedule_id') && !$db->query('ALTER TABLE pos_shifts ADD work_schedule_id BIGINT UNSIGNED NULL')) return false;
    if (posTableColumnExists($db, 'orders', 'id') && !posTableColumnExists($db, 'orders', 'pos_shift_id') && !$db->query('ALTER TABLE orders ADD pos_shift_id BIGINT UNSIGNED NULL')) return false;
    $db->query("UPDATE pos_shifts SET sales_areas=REPLACE(sales_areas,'box_office','box_ticket') WHERE sales_areas LIKE '%box_office%'");
    $db->query("ALTER TABLE pos_shifts MODIFY sales_areas VARCHAR(255) NOT NULL DEFAULT 'box_ticket'");
    $db->query("UPDATE pos_work_schedules SET sales_areas=REPLACE(sales_areas,'box_office','box_ticket') WHERE sales_areas LIKE '%box_office%'");

    $cashierHash = 'sha256:aurora-pos-local-2026:' . hash('sha256', 'aurora-pos-local-2026:8888');
    $adminHash = 'sha256:aurora-pos-local-2026:' . hash('sha256', 'aurora-pos-local-2026:admin123');
    $now = date('Y-m-d H:i:s');
    $seed = $db->prepare("INSERT INTO pos_users (username,password_hash,full_name,phone,role,status,theater_id,counter_code,updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)
        ON DUPLICATE KEY UPDATE username=VALUES(username)");
    if (!$seed) return false;
    $username = '0328754062'; $name = 'Nguyễn Trần Thái Bảo'; $phone = '0328754062'; $role = 'cashier'; $counter = 'AURORA BOX 02';
    $seed->bind_param('sssssss', $username, $cashierHash, $name, $phone, $role, $counter, $now); if (!$seed->execute()) { $seed->close(); return false; }
    $username = 'admin'; $name = 'Quản lý ca trực Aurora'; $phone = '0328754000'; $role = 'admin'; $counter = 'AURORA BOX 01';
    $seed->bind_param('sssssss', $username, $adminHash, $name, $phone, $role, $counter, $now); $ok = $seed->execute(); $seed->close();
    return $ok;
}

function posLogAuthEvent($db, $userId, $username, $eventType, $isSuccess) {
    $ip = isset($_SERVER['REMOTE_ADDR']) ? substr((string)$_SERVER['REMOTE_ADDR'], 0, 45) : '';
    $agent = isset($_SERVER['HTTP_USER_AGENT']) ? substr((string)$_SERVER['HTTP_USER_AGENT'], 0, 255) : '';
    $stmt = $db->prepare('INSERT INTO pos_login_events (user_id,username,event_type,is_success,ip_address,user_agent) VALUES (?, ?, ?, ?, ?, ?)');
    if (!$stmt) return;
    $successValue = $isSuccess ? 1 : 0; $nullableUser = $userId ? $userId : null;
    $stmt->bind_param('ississ', $nullableUser, $username, $eventType, $successValue, $ip, $agent); $stmt->execute(); $stmt->close();
}

/**
 * Bridges sessions created before TMS persisted the approver metadata.
 *
 * TMS already regards these active sessions as open (and therefore marks the
 * cashier as working), but POS used to reject them because no approver was
 * stored.  Reconcile only live legacy records once, preserving their counter,
 * cashier, opening cash and timestamps.  New sessions are always written by
 * TMS with the real approver details.
 */
function posReconcileLegacyAuthorizedShifts($db) {
    $sql = "UPDATE pos_shifts
        SET authorized_by_name = CASE
                WHEN authorized_by_name IS NULL OR TRIM(authorized_by_name) = ''
                THEN 'Aurora TMS - đồng bộ phiên cũ'
                ELSE authorized_by_name END,
            authorized_by_role = CASE
                WHEN authorized_by_role IS NULL
                    OR TRIM(authorized_by_role) = ''
                    OR authorized_by_role NOT IN ('super_admin','cinema_admin','supervisor')
                THEN 'cinema_admin'
                ELSE authorized_by_role END,
            sales_areas = CASE
                WHEN sales_areas IS NULL OR TRIM(sales_areas) = '' THEN 'box_ticket'
                ELSE sales_areas END,
            updated_at = NOW()
        WHERE status IN ('active','paused')
          AND (
              authorized_by_name IS NULL OR TRIM(authorized_by_name) = ''
              OR authorized_by_role IS NULL OR TRIM(authorized_by_role) = ''
              OR authorized_by_role NOT IN ('super_admin','cinema_admin','supervisor')
          )";
    return $db->query($sql) !== false;
}

function posCurrentShift($db, $userId) {
    $stmt = $db->prepare("SELECT id, cinema_name, counter, initial_cash, status, opened_at FROM pos_shifts WHERE user_id = ? AND status IN ('active','paused') ORDER BY id DESC LIMIT 1");
    if (!$stmt) return null;
    $stmt->bind_param('i', $userId); $stmt->execute();
    $id = null; $cinema = null; $counter = null; $initial = null; $status = null; $opened = null;
    $stmt->bind_result($id, $cinema, $counter, $initial, $status, $opened); $found = $stmt->fetch(); $stmt->close();
    return $found ? array('id'=>(int)$id, 'cinema_name'=>$cinema, 'counter'=>$counter, 'initial_cash'=>(float)$initial, 'status'=>$status, 'opened_at'=>$opened) : null;
}

function posAuthorizedShift($db, $userId) {
    // TMS records the authorizer's role and display name for an auditable
    // business record. Older valid sessions may not have a numeric TMS user
    // id, so requiring that nullable column made TMS and POS disagree about
    // the same active session. Accept either persisted authorizer identity,
    // but always require a privileged TMS role.
    $stmt=$db->prepare("SELECT id,cinema_name,counter,initial_cash,status,opened_at,sales_areas FROM pos_shifts WHERE user_id=? AND status IN ('active','paused') AND authorized_by_role IN ('super_admin','cinema_admin','supervisor') AND (authorized_by_tms_user_id IS NOT NULL OR (authorized_by_name IS NOT NULL AND TRIM(authorized_by_name)<>'')) ORDER BY id DESC LIMIT 1");
    if(!$stmt)return null;$stmt->bind_param('i',$userId);$stmt->execute();
    $id=null;$cinema=null;$counter=null;$initial=null;$status=null;$opened=null;$salesAreas=null;$stmt->bind_result($id,$cinema,$counter,$initial,$status,$opened,$salesAreas);$found=$stmt->fetch();$stmt->close();
    return $found?array('id'=>(int)$id,'cinema_name'=>$cinema,'counter'=>$counter,'initial_cash'=>(float)$initial,'status'=>$status,'opened_at'=>$opened,'sales_areas'=>$salesAreas):null;
}

function posOpenShift($db, $user, $theater) {
    $existing = $user['role']==='admin' ? posCurrentShift($db,(int)$user['id']) : posAuthorizedShift($db,(int)$user['id']);
    if ($existing) {
        if ($existing['status'] === 'paused') {
            $now = date('Y-m-d H:i:s'); $resume = $db->prepare("UPDATE pos_shifts SET status='active', updated_at=? WHERE id=?");
            if (!$resume) return null;
            $resume->bind_param('si', $now, $existing['id']); $ok = $resume->execute(); $resume->close();
            if (!$ok) return null;
            $existing['status'] = 'active';
        }
        return $existing;
    }
    // Tài khoản bán hàng không được tự tạo phiên khi đăng nhập.
    // Phiên phải được Admin Rạp/Supervisor cùng rạp cấp trước trong TMS.
    if ($user['role'] !== 'admin') return null;
    $now = date('Y-m-d H:i:s'); $initialCash = 500000.00; $counter = $user['counter_code']; $cinema = $theater['name']; $theaterId = (int)$theater['id']; $userId = (int)$user['id'];
    $stmt = $db->prepare("INSERT INTO pos_shifts (user_id,theater_id,cinema_name,counter,initial_cash,status,opened_at,created_at,updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)");
    if (!$stmt) return null;
    $stmt->bind_param('iissdsss', $userId, $theaterId, $cinema, $counter, $initialCash, $now, $now, $now);
    if (!$stmt->execute()) { $stmt->close(); return null; }
    $id = (int)$stmt->insert_id; $stmt->close();
    return array('id'=>$id, 'cinema_name'=>$cinema, 'counter'=>$counter, 'initial_cash'=>$initialCash, 'status'=>'active', 'opened_at'=>$now);
}

// POS, TMS và customer dùng chung aurora_db.
$db = @new mysqli('127.0.0.1', 'root', '', 'aurora_db', 3306);

if ($db->connect_error) {
    jsonResponse(array('success' => false, 'message' => 'Không thể kết nối aurora_db: ' . $db->connect_error), 500);
}

$db->set_charset('utf8');
if (!ensurePosAuthenticationSchema($db) || !posReconcileLegacyAuthorizedShifts($db)) {
    jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu xác thực POS trong aurora_db.'), 500);
}
$action = isset($_GET['action']) ? $_GET['action'] : 'health';

if ($action === 'health') {
    jsonResponse(array(
        'success' => true,
        'service' => 'aurora-pos-api',
        'database' => 'connected',
        'timestamp' => date('c')
    ));
}

if ($action === 'login' && $requestMethod === 'POST') {
    $input = requestJson();
    $username = isset($input['username']) ? trim((string)$input['username']) : '';
    $password = isset($input['password']) ? (string)$input['password'] : '';

    if ($username === '' || $password === '') {
        jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'), 400);
    }

    $user = findPosUser($db, $username);

    if (!$user || !passwordMatches($password, $user['password_hash'])) {
        posLogAuthEvent($db, 0, $username, 'LOGIN_FAILED', false);
        jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không chính xác.'), 401);
    }

    if (isset($user['status']) && $user['status'] !== 'active') {
        posLogAuthEvent($db, (int)$user['id'], $username, 'LOGIN_DENIED', false);
        jsonResponse(array('success' => false, 'message' => 'Tài khoản nhân viên đang bị tạm khóa.'), 403);
    }

    $theater = getPosTheater($db, isset($user['theater_id']) ? (int)$user['theater_id'] : 1);
    if (!$theater) jsonResponse(array('success' => false, 'message' => 'Nhân viên chưa được phân rạp hợp lệ.'), 403);
    $user['theater_id'] = $theater['id'];
    $user['theater_name'] = $theater['name'];
    $user['theater_address'] = $theater['address'];
    $shift = posOpenShift($db, $user, $theater);
    if (!$shift) {
        posLogAuthEvent($db, (int)$user['id'], $username, 'LOGIN_DENIED_NO_SHIFT', false);
        jsonResponse(array('success'=>false,'message'=>'Tài khoản chưa có phiên bán hàng được cấp. Vui lòng liên hệ Admin Rạp hoặc Supervisor để mở lại phiên.'),403);
    }
    if ($user['role'] !== 'admin') {
        $user['capabilities'] = posCapabilitiesForAreas($shift['sales_areas']);
        $user['counter_role_name'] = posAreaLabel($shift['sales_areas']);
    }
    unset($user['password_hash']);
    session_regenerate_id(true);
    $_SESSION['pos_user'] = $user;
    $_SESSION['pos_shift_id'] = $shift['id'];
    posLogAuthEvent($db, (int)$user['id'], $username, 'LOGIN_SUCCESS', true);
    $lastLogin = date('Y-m-d H:i:s');
    $stmt = $db->prepare('UPDATE pos_users SET last_login_at = ?, updated_at = ? WHERE id = ?');
    if ($stmt) { $stmt->bind_param('ssi', $lastLogin, $lastLogin, $user['id']); $stmt->execute(); $stmt->close(); }

    $sessionData = array(
        'cinema_name' => $theater['name'],
        'cinema_address' => $theater['address'],
        'theater_id' => $theater['id'],
        'staff_name' => $user['full_name'],
        'work_date' => date('d/m/Y'),
        'shift_id' => $shift['id'],
        'shift_time' => date('H:i', strtotime($shift['opened_at'])) . ' - 23:59',
        'counter' => $shift['counter'],
        'initial_cash' => $shift['initial_cash'],
        'status' => 'Đang hoạt động'
    );

    jsonResponse(array(
        'success' => true,
        'message' => 'Đăng nhập thành công.',
        'data' => array(
            'user' => $user,
            'session' => $sessionData
        )
    ));
}

if ($action === 'logout') {
    $user = isset($_SESSION['pos_user']) ? $_SESSION['pos_user'] : null;
    if ($user) posLogAuthEvent($db, (int)$user['id'], $user['username'], 'LOGOUT', true);
    $shiftId = isset($_SESSION['pos_shift_id']) ? (int)$_SESSION['pos_shift_id'] : 0;
    if ($user && $shiftId > 0) {
        $now = date('Y-m-d H:i:s'); $pause = $db->prepare("UPDATE pos_shifts SET status='paused', updated_at=? WHERE id=? AND user_id=? AND status='active'");
        if ($pause) { $userId = (int)$user['id']; $pause->bind_param('sii', $now, $shiftId, $userId); $pause->execute(); $pause->close(); }
    }
    unset($_SESSION['pos_user']);
    unset($_SESSION['pos_shift_id']);
    if (session_id()) {
        session_destroy();
    }
    jsonResponse(array('success' => true, 'message' => 'Đã đăng xuất thành công.'));
}

if ($action === 'me') {
    if (empty($_SESSION['pos_user'])) {
        jsonResponse(array('success' => false, 'message' => 'Chưa đăng nhập.'), 401);
    }
    jsonResponse(array('success' => true, 'data' => $_SESSION['pos_user']));
}

if ($action === 'dashboard') {
    $user = requirePosUser();
    $theater = getPosTheater($db, isset($user['theater_id']) ? (int)$user['theater_id'] : 1);
    $shift = posCurrentShift($db, (int)$user['id']);
    if (!$theater || !$shift) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phiên làm việc đang hoạt động.'), 409);

    jsonResponse(array(
        'success' => true,
        'data' => array(
            'user' => $user,
            'shift' => array(
                'cinema_name' => $theater ? $theater['name'] : 'Aurora Q1',
                'cinema_address' => $theater ? $theater['address'] : '',
                'theater_id' => $theater ? $theater['id'] : 1,
                'staff_name' => $user['full_name'],
                'work_date' => date('d/m/Y'),
                'shift_id' => $shift['id'],
                'shift_time' => date('H:i', strtotime($shift['opened_at'])) . ' - 23:59',
                'counter' => $shift['counter'],
                'initial_cash' => $shift['initial_cash'],
                'status' => $shift['status'] === 'paused' ? 'Tạm nghỉ' : 'Đang hoạt động'
            )
        )
    ));
}

if ($action === 'close_shift' && $requestMethod === 'POST') {
    $user = requirePosUser();
    $shiftId = isset($_SESSION['pos_shift_id']) ? (int)$_SESSION['pos_shift_id'] : 0;
    if ($shiftId < 1) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phiên làm việc cần đóng.'), 409);
    $input = requestJson(); $cashAtClose = isset($input['cash_at_close']) ? (float)$input['cash_at_close'] : 0;
    if ($cashAtClose < 0) jsonResponse(array('success' => false, 'message' => 'Tiền mặt kết ca không hợp lệ.'), 422);
    $now = date('Y-m-d H:i:s');
    $closedBy='POS: '.$user['full_name'];
    $stmt = $db->prepare("UPDATE pos_shifts SET status='closed',cash_at_close=?,closed_at=?,closed_by=?,close_note='Nhân viên chủ động kết phiên tại POS',updated_at=? WHERE id=? AND user_id=? AND status IN ('active','paused')");
    if (!$stmt) jsonResponse(array('success' => false, 'message' => 'Không thể đóng ca.'), 500);
    $userId = (int)$user['id']; $stmt->bind_param('dsssii', $cashAtClose, $now, $closedBy, $now, $shiftId, $userId); $stmt->execute(); $affected = $stmt->affected_rows; $stmt->close();
    if ($affected < 1) jsonResponse(array('success' => false, 'message' => 'Ca làm việc đã được đóng hoặc không thuộc tài khoản hiện tại.'), 409);
    $db->query("UPDATE pos_work_schedules SET status='completed',updated_at=NOW() WHERE linked_shift_id={$shiftId}");
    posLogAuthEvent($db, $userId, $user['username'], 'SHIFT_CLOSED', true);
    unset($_SESSION['pos_shift_id']);
    unset($_SESSION['pos_user']);
    jsonResponse(array('success' => true, 'message' => 'Đã đóng ca và ghi nhận tiền mặt kết ca.', 'data' => array('shift_id' => $shiftId, 'cash_at_close' => $cashAtClose, 'closed_at' => $now)));
}

if ($action === 'sales_catalog' && $requestMethod === 'GET') {
    $posUser = requirePosUser();
    $salesArea=isset($_GET['area'])?trim((string)$_GET['area']):'box_ticket';
    if(!in_array($salesArea,array('box_ticket','concession','merchandise'),true))jsonResponse(array('success'=>false,'message'=>'Khu vực bán hàng không hợp lệ.'),422);
    $areaCapability=array('box_ticket'=>'sell_tickets','concession'=>'sell_concessions','merchandise'=>'sell_merchandise');
    if($posUser['role']!=='admin'&&empty($posUser['capabilities'][$areaCapability[$salesArea]]))jsonResponse(array('success'=>false,'message'=>'Phiên hiện tại chưa được Admin Rạp cấp quyền '.$salesArea.'.'),403);
    $theaterId = isset($posUser['theater_id']) ? (int)$posUser['theater_id'] : 1;
    if (!ensurePosSalesTables($db)) {
        jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu bán hàng.'), 500);
    }

    $requestedDate = isset($_GET['date']) ? trim((string)$_GET['date']) : '';
    if ($requestedDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
        jsonResponse(array('success' => false, 'message' => 'Ngày chiếu không hợp lệ.'), 422);
    }

    $canSellTickets=!empty($posUser['capabilities']['sell_tickets']) || $posUser['role']==='admin';
    $datesResult = $canSellTickets ? $db->query("SELECT DISTINCT DATE(st.starts_at) AS show_date FROM showtimes st INNER JOIN screens s ON s.id = st.screen_id WHERE st.status = 'OPEN' AND st.starts_at >= NOW() AND s.theater_id = {$theaterId} ORDER BY show_date LIMIT 14") : false;
    $dates = array();
    if ($datesResult) while ($dateRow = $datesResult->fetch_assoc()) $dates[] = $dateRow['show_date'];
    if ($requestedDate === '' && count($dates) > 0) $requestedDate = $dates[0];

    $showtimes = array();
    if ($requestedDate !== '') {
        $safeDate = $db->real_escape_string($requestedDate);
        $sql = "SELECT st.id, st.movie_id, st.screen_id, st.starts_at, st.ends_at, st.ticket_price,
                       m.title AS movie_title, m.age_rating, m.format, s.name AS screen_name,
                       t.name AS theater_name,
                       (SELECT COUNT(*) FROM seats seat_count WHERE seat_count.screen_id=st.screen_id) AS total_seats,
                       (SELECT COUNT(*) FROM booking_seats bs_count INNER JOIN bookings b_count ON b_count.id=bs_count.booking_id WHERE b_count.showtime_id=st.id AND b_count.status NOT IN ('CANCELLED','EXPIRED')) AS booked_seats
                FROM showtimes st
                INNER JOIN movies m ON m.id = st.movie_id
                INNER JOIN screens s ON s.id = st.screen_id
                INNER JOIN theaters t ON t.id = s.theater_id
                WHERE st.status = 'OPEN' AND st.starts_at >= NOW() AND DATE(st.starts_at) = '{$safeDate}' AND s.theater_id = {$theaterId}
                ORDER BY st.starts_at";
        $result = $db->query($sql);
        if (!$result) jsonResponse(array('success' => false, 'message' => 'Không thể tải suất chiếu.'), 500);
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['movie_id'] = (int)$row['movie_id'];
            $row['screen_id'] = (int)$row['screen_id'];
            $row['total_seats'] = (int)$row['total_seats'];
            $row['booked_seats'] = (int)$row['booked_seats'];
            $row['available_seats'] = max(0, $row['total_seats'] - $row['booked_seats']);
            $row['ticket_options'] = posShowtimeTicketOptions($db, $row['id'], $row['ticket_price']);
            $defaultTicket = posDefaultTicketOption($row['ticket_options']);
            $row['default_ticket_type_id'] = (int)$defaultTicket['id'];
            $row['ticket_price'] = (float)$defaultTicket['price'];
            $showtimes[] = $row;
        }
    }

    // Build a movie-first catalog from the same showtime rows. This keeps the
    // POS workflow deterministic: movie -> today's showtimes -> seat map.
    $movieMap = array();
    foreach ($showtimes as $showtime) {
        $movieId = (int)$showtime['movie_id'];
        if (!isset($movieMap[$movieId])) {
            $movieMap[$movieId] = array(
                'id' => $movieId,
                'title' => $showtime['movie_title'],
                'age_rating' => $showtime['age_rating'],
                'format' => $showtime['format'],
                'showtime_count' => 0,
                'first_showtime' => $showtime['starts_at'],
                'last_showtime' => $showtime['starts_at'],
                'available_seats' => 0,
            );
        }
        $movieMap[$movieId]['showtime_count']++;
        $movieMap[$movieId]['last_showtime'] = $showtime['starts_at'];
        $movieMap[$movieId]['available_seats'] += (int)$showtime['available_seats'];
    }
    $movies = array_values($movieMap);

    $combos = array();
    if ($salesArea === 'box_ticket') {
        $addOnCatalog = array_merge(posComboCatalog($db,$posUser,$theaterId,'concession'),posComboCatalog($db,$posUser,$theaterId,'merchandise'));
        foreach ($addOnCatalog as $code => $combo) $combos[] = $combo;
    } else {
        foreach (posComboCatalog($db,$posUser,$theaterId,$salesArea) as $code => $combo) $combos[] = $combo;
    }
    $theater = getPosTheater($db, $theaterId);
    jsonResponse(array('success'=>true,'data'=>array('theater'=>$theater,'dates'=>$dates,'selected_date'=>$requestedDate,'movies'=>$movies,'showtimes'=>$showtimes,'combos'=>$combos,'products'=>$combos,'counter_role'=>array('code'=>$posUser['counter_role_code'],'name'=>$posUser['counter_role_name']),'capabilities'=>$posUser['capabilities'])));
}

if ($action === 'member_lookup' && $requestMethod === 'GET') {
    requirePosUser();
    $query=isset($_GET['q'])?trim((string)$_GET['q']):'';
    if(strlen($query)<3)jsonResponse(array('success'=>false,'message'=>'Nhập ít nhất 3 ký tự của SĐT, email hoặc mã thẻ.'),422);
    $safe=$db->real_escape_string($query);
    $sql="SELECT u.id,u.full_name,u.email,u.phone,COALESCE(c.card_number,'') card_number FROM users u LEFT JOIN customer_membership_cards c ON c.user_id=u.id WHERE u.role='customer' AND u.status='active' AND (u.phone LIKE '%{$safe}%' OR u.email LIKE '%{$safe}%' OR c.card_number LIKE '%{$safe}%') ORDER BY u.id DESC LIMIT 8";
    $result=$db->query($sql);$members=array();
    if($result)while($row=$result->fetch_assoc()){$row['id']=(int)$row['id'];$members[]=$row;}
    jsonResponse(array('success'=>true,'data'=>$members));
}

if ($action === 'sales_seat_hold' && $requestMethod === 'POST') {
    $posUser=requirePosCapability('sell_tickets');$theaterId=(int)$posUser['theater_id'];$input=requestJson();
    $showtimeId=isset($input['showtime_id'])?(int)$input['showtime_id']:0;$seatIds=isset($input['seat_ids'])&&is_array($input['seat_ids'])?array_values(array_unique(array_map('intval',$input['seat_ids']))):array();$valid=array();foreach($seatIds as $seatId)if($seatId>0)$valid[]=$seatId;$seatIds=$valid;
    if($showtimeId<1||count($seatIds)>12)jsonResponse(array('success'=>false,'message'=>'Dữ liệu giữ ghế không hợp lệ.'),422);
    if(!posEnsureSeatHolds($db))jsonResponse(array('success'=>false,'message'=>'Không thể khởi tạo dữ liệu giữ ghế trong aurora_db.'),500);
    posCleanupSeatHolds($db);$now=date('Y-m-d H:i:s');$nowEsc=$db->real_escape_string($now);$sessionEsc=$db->real_escape_string(session_id());$expiresAt=date('Y-m-d H:i:s',strtotime($now.' +10 minutes'));$userId=(int)$posUser['id'];
    $showtime=$db->query("SELECT st.screen_id FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id WHERE st.id={$showtimeId} AND st.status='OPEN' AND st.starts_at>NOW() AND sc.theater_id={$theaterId} LIMIT 1");$showtimeRow=$showtime?$showtime->fetch_assoc():null;if(!$showtimeRow)jsonResponse(array('success'=>false,'message'=>'Suất chiếu không còn mở bán.'),409);$screenId=(int)$showtimeRow['screen_id'];
    $db->autocommit(false);
    try {
        if(!$db->query("INSERT INTO seat_hold_sessions(showtime_id,session_key,user_id,expires_at,created_at,updated_at) VALUES({$showtimeId},'{$sessionEsc}',NULL,'{$expiresAt}','{$nowEsc}','{$nowEsc}') ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at),updated_at=VALUES(updated_at)"))throw new Exception('Không thể tạo phiên giữ ghế.');
        if(!$db->query("DELETE FROM seat_holds WHERE showtime_id={$showtimeId} AND session_key='{$sessionEsc}'"))throw new Exception('Không thể cập nhật ghế giữ.');
        if($seatIds){
            $idSql=implode(',',$seatIds);$validCount=(int)posScalar($db,"SELECT COUNT(*) FROM seats WHERE screen_id={$screenId} AND id IN ({$idSql})");if($validCount!==count($seatIds))throw new Exception('Ghế đã chọn không thuộc phòng chiếu này.');
            $sold=(int)posScalar($db,"SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id={$showtimeId} AND bs.seat_id IN ({$idSql}) AND b.status NOT IN ('CANCELLED','EXPIRED')");if($sold>0)throw new Exception('Một hoặc nhiều ghế vừa được bán.');
            $locked=(int)posScalar($db,"SELECT COUNT(*) FROM tms_showtime_seat_locks WHERE showtime_id={$showtimeId} AND seat_id IN ({$idSql})");if($locked>0)throw new Exception('Một hoặc nhiều ghế đang bị rạp khóa.');
            $conflict=(int)posScalar($db,"SELECT COUNT(*) FROM seat_holds WHERE showtime_id={$showtimeId} AND seat_id IN ({$idSql}) AND expires_at>'{$nowEsc}' AND session_key<>'{$sessionEsc}'");if($conflict>0)throw new Exception('Một hoặc nhiều ghế vừa được quầy khác giữ.');
            foreach($seatIds as $seatId)if(!$db->query("INSERT INTO seat_holds(showtime_id,seat_id,session_key,user_id,expires_at,created_at,updated_at) VALUES({$showtimeId},{$seatId},'{$sessionEsc}',NULL,'{$expiresAt}','{$nowEsc}','{$nowEsc}')"))throw new Exception('Không thể giữ ghế đã chọn.');
        }
        $db->commit();$db->autocommit(true);jsonResponse(array('success'=>true,'message'=>$seatIds?'Đã giữ ghế trong 10 phút.':'Đã giải phóng ghế.','data'=>array('showtime_id'=>$showtimeId,'seat_ids'=>$seatIds,'expires_at'=>$expiresAt,'hold_seconds'=>600)));
    } catch(Exception $e){$db->rollback();$db->autocommit(true);jsonResponse(array('success'=>false,'message'=>$e->getMessage()),409);}
}

if ($action === 'sales_seats' && $requestMethod === 'GET') {
    $posUser = requirePosCapability('sell_tickets');
    $theaterId = isset($posUser['theater_id']) ? (int)$posUser['theater_id'] : 1;
    $showtimeId = isset($_GET['showtime_id']) ? (int)$_GET['showtime_id'] : 0;
    if ($showtimeId < 1) jsonResponse(array('success' => false, 'message' => 'Suất chiếu không hợp lệ.'), 422);
    $stmt = $db->prepare("SELECT st.screen_id FROM showtimes st INNER JOIN screens sc ON sc.id = st.screen_id WHERE st.id = ? AND st.status = 'OPEN' AND sc.theater_id = {$theaterId} LIMIT 1");
    if (!$stmt) jsonResponse(array('success' => false, 'message' => 'Không thể tải suất chiếu.'), 500);
    $stmt->bind_param('i', $showtimeId); $stmt->execute(); $screenId = null; $stmt->bind_result($screenId);
    if (!$stmt->fetch()) { $stmt->close(); jsonResponse(array('success' => false, 'message' => 'Suất chiếu không tồn tại hoặc đã đóng.'), 404); }
    $stmt->close();
    $nowEsc = $db->real_escape_string(date('Y-m-d H:i:s'));$sessionEsc=$db->real_escape_string(session_id());
    $hasSeatHolds=posEnsureSeatHolds($db);if($hasSeatHolds)posCleanupSeatHolds($db);
    $hasSeatLocksResult = $db->query("SHOW TABLES LIKE 'tms_showtime_seat_locks'"); $hasSeatLocks = $hasSeatLocksResult && $hasSeatLocksResult->num_rows > 0;
    $holdCondition = $hasSeatHolds ? " OR EXISTS (SELECT 1 FROM seat_holds h WHERE h.showtime_id={$showtimeId} AND h.seat_id=s.id AND h.expires_at>'{$nowEsc}' AND h.session_key<>'{$sessionEsc}')" : '';
    $lockCondition = $hasSeatLocks ? " OR EXISTS (SELECT 1 FROM tms_showtime_seat_locks sl WHERE sl.showtime_id={$showtimeId} AND sl.seat_id=s.id)" : '';
    $sql = "SELECT s.id, s.seat_row, s.seat_number, s.seat_type,
                   CASE WHEN EXISTS (SELECT 1 FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE bs.seat_id=s.id AND b.showtime_id={$showtimeId} AND b.status NOT IN ('CANCELLED','EXPIRED')){$holdCondition}{$lockCondition} THEN 0 ELSE 1 END AS is_available
            FROM seats s
            WHERE s.screen_id = {$screenId}
            ORDER BY s.seat_row, s.seat_number";
    $result = $db->query($sql);
    if (!$result) jsonResponse(array('success' => false, 'message' => 'Không thể tải sơ đồ ghế.'), 500);
    $seats = array(); $layoutRows = array(); $layoutColumns = 0;
    while ($seat = $result->fetch_assoc()) {
        $seatType = strtoupper((string)$seat['seat_type']); if ($seatType === 'DOUBLE') $seatType = 'COUPLE';
        $seatNumber = (int)$seat['seat_number']; $available = (int)$seat['is_available'] === 1; $seatSpan = $seatType === 'COUPLE' ? 2 : 1;
        $layoutColumns = max($layoutColumns, $seatNumber * $seatSpan);
        if (!isset($layoutRows[$seat['seat_row']])) $layoutRows[$seat['seat_row']] = array('row'=>$seat['seat_row'],'seat_count'=>0,'seat_type'=>$seatType);
        $layoutRows[$seat['seat_row']]['seat_count']++;
        $seats[] = array('id'=>(int)$seat['id'],'row'=>$seat['seat_row'],'number'=>$seatNumber,'type'=>$seatType,'available'=>$available,'seat_row'=>$seat['seat_row'],'seat_number'=>$seatNumber,'seat_type'=>$seatType,'is_available'=>$available?1:0);
    }
    if ($layoutColumns < 1) $layoutColumns = 12;
    $layout = array('version'=>1,'columns'=>$layoutColumns,'aisle_after'=>(int)floor($layoutColumns/2),'rows'=>array_values($layoutRows));
    $showtimeResult=$db->query("SELECT ticket_price FROM showtimes WHERE id={$showtimeId} LIMIT 1");$showtimeRow=$showtimeResult?$showtimeResult->fetch_assoc():array('ticket_price'=>0);
    $ticketOptions=posShowtimeTicketOptions($db,$showtimeId,$showtimeRow['ticket_price']);$defaultTicket=posDefaultTicketOption($ticketOptions);
    jsonResponse(array('success' => true, 'data' => array('showtime_id' => $showtimeId, 'layout'=>$layout,'seats' => $seats,'ticket_options'=>$ticketOptions,'default_ticket_type_id'=>(int)$defaultTicket['id'],'pricing_source'=>'tms_showtime_ticket_types','price_is_final'=>true)));
}

if ($action === 'online_booking_lookup' && $requestMethod === 'GET') {
    $posUser=requirePosCapability('redeem_online_booking');
    $code=isset($_GET['code'])?strtoupper(trim((string)$_GET['code'])):'';
    if (!preg_match('/^[A-Z0-9-]{5,30}$/',$code)) jsonResponse(array('success'=>false,'message'=>'Mã đặt vé không hợp lệ.'),422);
    $safe=$db->real_escape_string($code);$theaterId=(int)$posUser['theater_id'];
    $sql="SELECT b.id,b.booking_code,b.total_amount,b.status,b.created_at,st.starts_at,m.title movie_title,sc.name screen_name,t.name theater_name,u.full_name customer_name,u.phone customer_phone,GROUP_CONCAT(CONCAT(s.seat_row,s.seat_number) ORDER BY s.seat_row,s.seat_number SEPARATOR ', ') seats,(SELECT pr.redeemed_at FROM pos_booking_redemptions pr WHERE pr.booking_id=b.id LIMIT 1) redeemed_at FROM bookings b INNER JOIN showtimes st ON st.id=b.showtime_id INNER JOIN movies m ON m.id=st.movie_id INNER JOIN screens sc ON sc.id=st.screen_id INNER JOIN theaters t ON t.id=sc.theater_id LEFT JOIN users u ON u.id=b.user_id LEFT JOIN booking_seats bs ON bs.booking_id=b.id LEFT JOIN seats s ON s.id=bs.seat_id WHERE b.booking_code='{$safe}' AND sc.theater_id={$theaterId} GROUP BY b.id LIMIT 1";
    $row=$db->query($sql);$booking=$row?$row->fetch_assoc():null;
    if(!$booking)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy vé online tại rạp này.'),404);
    $booking['id']=(int)$booking['id'];$booking['total_amount']=(float)$booking['total_amount'];$booking['can_redeem']=$booking['status']==='PAID'&&empty($booking['redeemed_at']);
    jsonResponse(array('success'=>true,'data'=>$booking));
}

if ($action === 'online_booking_redeem' && $requestMethod === 'POST') {
    $posUser=requirePosCapability('redeem_online_booking');$shift=posCurrentShift($db,(int)$posUser['id']);
    if(!$shift||$shift['status']!=='active')jsonResponse(array('success'=>false,'message'=>'Cần mở phiên bán hàng trước khi đổi vé.'),409);
    $input=requestJson();$code=isset($input['code'])?strtoupper(trim((string)$input['code'])):'';$note=isset($input['note'])?trim((string)$input['note']):'';
    $safe=$db->real_escape_string($code);$theaterId=(int)$posUser['theater_id'];
    $result=$db->query("SELECT b.id,b.status FROM bookings b INNER JOIN showtimes st ON st.id=b.showtime_id INNER JOIN screens sc ON sc.id=st.screen_id WHERE b.booking_code='{$safe}' AND sc.theater_id={$theaterId} LIMIT 1");$booking=$result?$result->fetch_assoc():null;
    if(!$booking)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy vé online tại rạp này.'),404);
    if($booking['status']!=='PAID')jsonResponse(array('success'=>false,'message'=>'Chỉ vé đã thanh toán mới được đổi tại quầy.'),409);
    $bookingId=(int)$booking['id'];$userId=(int)$posUser['id'];$shiftId=(int)$shift['id'];$noteEsc=$db->real_escape_string(substr($note,0,255));
    if(!$db->query("INSERT INTO pos_booking_redemptions (booking_id,theater_id,pos_user_id,pos_shift_id,redeemed_at,note) VALUES ({$bookingId},{$theaterId},{$userId},{$shiftId},NOW(),'{$noteEsc}')")){
        if($db->errno===1062)jsonResponse(array('success'=>false,'message'=>'Vé này đã được đổi trước đó.'),409);
        jsonResponse(array('success'=>false,'message'=>'Không thể ghi nhận đổi vé.'),500);
    }
    jsonResponse(array('success'=>true,'message'=>'Đã xác nhận vé online và ghi nhận trong aurora_db.','data'=>array('booking_id'=>$bookingId,'redeemed_at'=>date('Y-m-d H:i:s'))));
}

if ($action === 'product_order' && $requestMethod === 'POST') {
    $input=requestJson();$salesArea=isset($input['sales_area'])?trim((string)$input['sales_area']):'concession';
    if(!in_array($salesArea,array('concession','merchandise'),true))jsonResponse(array('success'=>false,'message'=>'Nhóm nghiệp vụ bán hàng không hợp lệ.'),422);
    $posUser=requirePosUser();$isAdmin=$posUser['role']==='admin';$canConcession=$isAdmin||!empty($posUser['capabilities']['sell_concessions']);$canMerchandise=$isAdmin||!empty($posUser['capabilities']['sell_merchandise']);
    if(!$canConcession&&!$canMerchandise)jsonResponse(array('success'=>false,'message'=>'Phiên hiện tại không được cấp quyền bán sản phẩm.'),403);
    $shift=posCurrentShift($db,(int)$posUser['id']);if(!$shift||$shift['status']!=='active')jsonResponse(array('success'=>false,'message'=>'Phiên bán hàng chưa hoạt động.'),409);
    $theaterId=(int)$posUser['theater_id'];if(!ensurePosSalesTables($db))jsonResponse(array('success'=>false,'message'=>'Không thể khởi tạo dữ liệu tồn kho POS.'),500);
    $itemsInput=isset($input['items'])&&is_array($input['items'])?$input['items']:array();$method=isset($input['payment_method'])?strtoupper((string)$input['payment_method']):'CASH';$received=isset($input['amount_received'])?(float)$input['amount_received']:0;$member=posMembershipCustomer($db,isset($input['customer_id'])?(int)$input['customer_id']:0);$isMember=$member!==null;
    if(!in_array($method,array('CASH','CARD','TRANSFER'),true))jsonResponse(array('success'=>false,'message'=>'Phương thức thanh toán không hợp lệ.'),422);
    $catalog=array_merge($canConcession?posComboCatalog($db,$posUser,$theaterId,'concession'):array(),$canMerchandise?posComboCatalog($db,$posUser,$theaterId,'merchandise'):array());$items=array();$subtotal=0;$total=0;
    foreach($itemsInput as $requested){$code=is_array($requested)&&isset($requested['code'])?(string)$requested['code']:'';$quantity=is_array($requested)&&isset($requested['quantity'])?(int)$requested['quantity']:0;if($quantity<1)continue;if($quantity>20)jsonResponse(array('success'=>false,'message'=>'Số lượng mỗi sản phẩm không được vượt quá 20.'),422);if(!isset($catalog[$code]))jsonResponse(array('success'=>false,'message'=>'Sản phẩm không tồn tại, đã hết hàng hoặc không thuộc quyền bán của phiên này.'),422);$items[$code]=min(20,(isset($items[$code])?$items[$code]:0)+$quantity);}
    if(!$items)jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn ít nhất một sản phẩm.'),422);
    foreach($items as $itemCode=>$quantity){$subtotal+=$catalog[$itemCode]['price']*$quantity;$total+=($isMember?$catalog[$itemCode]['member_price']:$catalog[$itemCode]['price'])*$quantity;}$discount=$subtotal-$total;if($method!=='CASH')$received=$total;if($received<$total)jsonResponse(array('success'=>false,'message'=>'Số tiền khách đưa chưa đủ.'),422);$change=$received-$total;
    $db->autocommit(false);try{$code='POS-'.strtoupper(substr(md5(uniqid((string)mt_rand(),true)),0,10));$cashierId=(int)$posUser['id'];$shiftId=(int)$shift['id'];$customerId=$isMember?(int)$member['id']:0;
      $stmt=$db->prepare("INSERT INTO orders (booking_id,customer_id,cashier_id,pos_shift_id,order_code,channel,subtotal,discount_amount,total_amount,payment_method,amount_received,change_amount,status,created_at,updated_at) VALUES (0,?,?,?,?, 'POS',?,?,?,?,?,?, 'PAID',NOW(),NOW())");$stmt->bind_param('iiisdddsdd',$customerId,$cashierId,$shiftId,$code,$subtotal,$discount,$total,$method,$received,$change);if(!$stmt->execute())throw new Exception('Không thể lưu đơn hàng: '.$stmt->error);$orderId=(int)$stmt->insert_id;$stmt->close();
      posDeductProductInventory($db,$theaterId,$catalog,$items,$orderId,$code,$posUser);
       $itemStmt=$db->prepare("INSERT INTO order_items (order_id,item_type,item_code,item_name,quantity,unit_price,seat_id,created_at) VALUES (?,?,?,?,?,?,0,NOW())");$receiptItems=array();
       foreach($items as $sku=>$quantity){$product=$catalog[$sku];$itemType=$product['sales_area']==='merchandise'?'MERCHANDISE':'COMBO';$unitPrice=$isMember?$product['member_price']:$product['price'];$itemStmt->bind_param('isssid',$orderId,$itemType,$sku,$product['name'],$quantity,$unitPrice);if(!$itemStmt->execute())throw new Exception('Không thể lưu sản phẩm.');$receiptItems[]=array('type'=>$itemType,'code'=>$sku,'name'=>$product['name'],'quantity'=>$quantity,'unit'=>$product['unit'],'unit_price'=>$unitPrice,'line_total'=>$unitPrice*$quantity);}$itemStmt->close();
      $pay=$db->prepare('INSERT INTO payments (order_id,method,amount,reference_code,created_at) VALUES (?,?,?,?,NOW())');$pay->bind_param('isds',$orderId,$method,$total,$code);if(!$pay->execute())throw new Exception('Không thể lưu thanh toán.');$pay->close();$db->commit();$db->autocommit(true);$theater=getPosTheater($db,$theaterId);jsonResponse(array('success'=>true,'message'=>'Thanh toán thành công và đã trừ tồn kho tại rạp.','data'=>array('order_id'=>$orderId,'code'=>$code,'subtotal'=>$subtotal,'discount'=>$discount,'total'=>$total,'member'=>$member,'amount_received'=>$received,'change'=>$change,'payment_method'=>$method,'items'=>$receiptItems,'cashier_name'=>$posUser['full_name'],'counter'=>$shift['counter'],'theater_name'=>$theater?$theater['name']:'Aurora Cinema','created_at'=>date('Y-m-d H:i:s'))),201);
    }catch(Exception $e){$db->rollback();$db->autocommit(true);jsonResponse(array('success'=>false,'message'=>$e->getMessage()),409);}
}

if ($action === 'sales_order' && $requestMethod === 'POST') {
    $posUser = requirePosCapability('sell_tickets');
    $theaterId = isset($posUser['theater_id']) ? (int)$posUser['theater_id'] : 1;
    if (!ensurePosSalesTables($db)) jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu bán hàng.'), 500);
    $activeShift = posCurrentShift($db, (int)$posUser['id']);
    if (!$activeShift || $activeShift['status'] !== 'active') jsonResponse(array('success' => false, 'message' => 'Phiên bán hàng đã tạm dừng hoặc kết thúc. Vui lòng liên hệ Admin Rạp trước khi tiếp tục bán.'), 409);
    $_SESSION['pos_shift_id'] = (int)$activeShift['id'];
    $input = requestJson();
    $showtimeId = isset($input['showtime_id']) ? (int)$input['showtime_id'] : 0;
    $seatIds = isset($input['seat_ids']) && is_array($input['seat_ids']) ? array_values(array_unique(array_map('intval', $input['seat_ids']))) : array();
    $validRequestedSeats = array();
    foreach ($seatIds as $requestedSeatId) if ($requestedSeatId > 0) $validRequestedSeats[] = $requestedSeatId;
    $seatIds = $validRequestedSeats;
    $paymentMethod = isset($input['payment_method']) ? strtoupper(trim((string)$input['payment_method'])) : 'CASH';
    $amountReceived = isset($input['amount_received']) ? (float)$input['amount_received'] : 0;
    $combosInput = isset($input['combos']) && is_array($input['combos']) ? $input['combos'] : array();
    $ticketsInput = isset($input['tickets']) && is_array($input['tickets']) ? $input['tickets'] : array(); $requestedTicketTypes=array();
    foreach($ticketsInput as $ticketInput) if(is_array($ticketInput)&&isset($ticketInput['seat_id']))$requestedTicketTypes[(int)$ticketInput['seat_id']]=isset($ticketInput['ticket_type_id'])?(int)$ticketInput['ticket_type_id']:0;
    $member=posMembershipCustomer($db,isset($input['customer_id'])?(int)$input['customer_id']:0);$isMember=$member!==null;
    if ($showtimeId < 1 || count($seatIds) < 1 || count($seatIds) > 12) jsonResponse(array('success' => false, 'message' => 'Vui lòng chọn suất chiếu và từ 1 đến 12 ghế.'), 422);
    if (!in_array($paymentMethod, array('CASH', 'CARD', 'TRANSFER'), true)) jsonResponse(array('success' => false, 'message' => 'Phương thức thanh toán không hợp lệ.'), 422);
    if(!posEnsureSeatHolds($db))jsonResponse(array('success'=>false,'message'=>'Không thể chuẩn bị dữ liệu giữ ghế trong aurora_db.'),500);

    $catalog = array_merge(posComboCatalog($db,$posUser,$theaterId,'concession'),posComboCatalog($db,$posUser,$theaterId,'merchandise')); $combos = array();
    foreach ($combosInput as $item) {
        $code = is_array($item) && isset($item['code']) ? (string)$item['code'] : '';
        $quantity = is_array($item) && isset($item['quantity']) ? (int)$item['quantity'] : 0;
        if ($quantity > 0 && $quantity <= 10 && isset($catalog[$code])) $combos[$code] = min(10, (isset($combos[$code]) ? $combos[$code] : 0) + $quantity);
    }

    $db->autocommit(false);
    try {
        $stmt = $db->prepare("SELECT st.screen_id, st.ticket_price, st.status, st.starts_at FROM showtimes st INNER JOIN screens sc ON sc.id = st.screen_id WHERE st.id = ? AND sc.theater_id = {$theaterId} FOR UPDATE");
        if (!$stmt) throw new Exception('Không thể kiểm tra suất chiếu.');
        $stmt->bind_param('i', $showtimeId); $stmt->execute(); $screenId = null; $ticketPrice = null; $status = null; $startsAt = null;
        $found = $stmt->bind_result($screenId, $ticketPrice, $status, $startsAt) && $stmt->fetch(); $stmt->close();
        if (!$found || $status !== 'OPEN') throw new Exception('Suất chiếu không tồn tại hoặc đã đóng.');
        if (strtotime($startsAt) < time()) throw new Exception('Suất chiếu đã bắt đầu, không thể bán vé.');

        $seatSql = 'SELECT id, seat_row, seat_number, seat_type FROM seats WHERE screen_id = ? AND id IN (' . implode(',', array_fill(0, count($seatIds), '?')) . ') FOR UPDATE';
        $seatParams = array_merge(array($screenId), $seatIds); $types = str_repeat('i', count($seatParams));
        $stmt = $db->prepare($seatSql); $refs = array($types); foreach ($seatParams as $key => $value) $refs[] = &$seatParams[$key]; call_user_func_array(array($stmt, 'bind_param'), $refs); $stmt->execute();
        $validSeats = array(); $seatInfo = array(); $stmt->bind_result($seatId, $seatRow, $seatNumber, $seatType);
        while ($stmt->fetch()) { $validSeats[] = (int)$seatId; $seatInfo[(int)$seatId] = array('label' => $seatRow . $seatNumber, 'type' => $seatType); }
        $stmt->close(); sort($validSeats); $expectedSeats = $seatIds; sort($expectedSeats);
        if ($validSeats !== $expectedSeats) throw new Exception('Ghế đã chọn không thuộc phòng chiếu này.');

        $takenSql = "SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id = bs.booking_id WHERE b.showtime_id = ? AND bs.seat_id IN (" . implode(',', array_fill(0, count($seatIds), '?')) . ") AND b.status NOT IN ('CANCELLED','EXPIRED')";
        $stmt = $db->prepare($takenSql); $takenParams = array_merge(array($showtimeId), $seatIds); $takenTypes = str_repeat('i', count($takenParams)); $refs = array($takenTypes); foreach ($takenParams as $key => $value) $refs[] = &$takenParams[$key]; call_user_func_array(array($stmt, 'bind_param'), $refs); $stmt->execute(); $taken = 0; $stmt->bind_result($taken); $stmt->fetch(); $stmt->close();
        if ((int)$taken > 0) throw new Exception('Một hoặc nhiều ghế vừa được bán bởi quầy khác.');
        posCleanupSeatHolds($db);$holdSessionEsc=$db->real_escape_string(session_id());$holdNowEsc=$db->real_escape_string(date('Y-m-d H:i:s'));$holdIds=implode(',',$seatIds);
        $otherHolds=(int)posScalar($db,"SELECT COUNT(*) FROM seat_holds WHERE showtime_id={$showtimeId} AND seat_id IN ({$holdIds}) AND expires_at>'{$holdNowEsc}' AND session_key<>'{$holdSessionEsc}'");if($otherHolds>0)throw new Exception('Một hoặc nhiều ghế đang được quầy khác giữ.');
        $ownHolds=(int)posScalar($db,"SELECT COUNT(*) FROM seat_holds WHERE showtime_id={$showtimeId} AND seat_id IN ({$holdIds}) AND expires_at>'{$holdNowEsc}' AND session_key='{$holdSessionEsc}'");if($ownHolds!==count($seatIds))throw new Exception('Thời gian giữ ghế đã hết. Vui lòng chọn lại ghế.');

        $ticketOptions=posShowtimeTicketOptions($db,$showtimeId,$ticketPrice);$defaultTicket=posDefaultTicketOption($ticketOptions);$ticketOptionMap=array();$coupleTicket=null;
        foreach($ticketOptions as $ticketOption){$ticketOptionMap[(int)$ticketOption['id']]=$ticketOption;if($ticketOption['code']==='TICKET_COUPLE')$coupleTicket=$ticketOption;}
        $seatPrices=array();$ticketTotal = 0; $items = array();
        foreach ($seatIds as $seatId) {
            $seat = $seatInfo[$seatId];$requestedTypeId=isset($requestedTicketTypes[$seatId])?(int)$requestedTicketTypes[$seatId]:(int)$defaultTicket['id'];
            if($seat['type']==='COUPLE'&&$coupleTicket!==null)$ticketOption=$coupleTicket;else{$ticketOption=isset($ticketOptionMap[$requestedTypeId])?$ticketOptionMap[$requestedTypeId]:null;if(!$ticketOption||$ticketOption['code']==='TICKET_COUPLE')throw new Exception('Loại vé của ghế '.$seat['label'].' không hợp lệ.');}
            // The showtime ticket row is the immutable price snapshot published by TMS.
            // Never apply a second seat surcharge here; the backend is the final authority for checkout.
            $price=(float)$ticketOption['price'];$seatPrices[$seatId]=$price;
            $ticketTotal += $price; $items[] = array('type' => 'TICKET', 'code' => $ticketOption['code'].'-'.$seatId, 'name' => $ticketOption['name'].' · Ghế '.$seat['label'].' ('.$seat['type'].')', 'quantity' => 1, 'price' => $price,'unit_price'=>$price,'line_total'=>$price, 'seat_id' => $seatId);
        }
        $comboSubtotal = 0; $comboTotal = 0;
        foreach ($combos as $code => $quantity) { $unitPrice=$isMember?$catalog[$code]['member_price']:$catalog[$code]['price'];$comboSubtotal += $catalog[$code]['price'] * $quantity;$comboTotal += $unitPrice * $quantity; $items[] = array('type' => $catalog[$code]['sales_area']==='merchandise'?'MERCHANDISE':'COMBO', 'code' => $code, 'name' => $catalog[$code]['name'], 'quantity' => $quantity, 'price' => $unitPrice, 'seat_id' => null); }
        $total = $ticketTotal + $comboTotal;
        $subtotal = $ticketTotal + $comboSubtotal; $discount=$subtotal-$total;
        if ($paymentMethod !== 'CASH') $amountReceived = $total;
        if ($amountReceived < $total) throw new Exception('Số tiền khách đưa chưa đủ.');
        $change = $amountReceived - $total;

        if($isMember){$customerId=(int)$member['id'];}else{$userResult = $db->query("SELECT id FROM users WHERE role='customer' AND status='active' ORDER BY id LIMIT 1"); $userRow = $userResult ? $userResult->fetch_assoc() : null; $customerId = $userRow ? (int)$userRow['id'] : 0;}
        if ($customerId < 1) throw new Exception('Chưa có tài khoản khách hàng hệ thống để ghi nhận booking.');
        $code = 'POS-' . strtoupper(substr(md5(uniqid((string)mt_rand(), true)), 0, 10)); $now = date('Y-m-d H:i:s');
        $stmt = $db->prepare("INSERT INTO bookings (user_id, showtime_id, booking_code, total_amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'PAID', ?, ?)"); $stmt->bind_param('iisdss', $customerId, $showtimeId, $code, $total, $now, $now); if (!$stmt->execute()) throw new Exception('Không thể tạo booking.'); $bookingId = (int)$stmt->insert_id; $stmt->close();
        $hasShowtimeColumn = posHasBookingShowtimeColumn($db);
        if ($hasShowtimeColumn) $seatStmt = $db->prepare('INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price) VALUES (?, ?, ?, ?)'); else $seatStmt = $db->prepare('INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (?, ?, ?)');
        foreach ($seatIds as $seatId) { $price = $seatPrices[$seatId]; if ($hasShowtimeColumn) { $seatStmt->bind_param('iiid', $bookingId, $showtimeId, $seatId, $price); } else { $seatStmt->bind_param('iid', $bookingId, $seatId, $price); } if (!$seatStmt->execute()) throw new Exception('Không thể giữ ghế.'); }
        $seatStmt->close();

        $cashier = posUser(); $cashierId = (int)$cashier['id']; $posShiftId = isset($_SESSION['pos_shift_id']) ? (int)$_SESSION['pos_shift_id'] : 0; $stmt = $db->prepare("INSERT INTO orders (booking_id, customer_id, cashier_id, pos_shift_id, order_code, channel, subtotal, discount_amount, total_amount, payment_method, amount_received, change_amount, status,created_at,updated_at) VALUES (?, ?, ?, ?, ?, 'POS', ?, ?, ?, ?, ?, ?, 'PAID',NOW(),NOW())"); $stmt->bind_param('iiiisdddsdd', $bookingId, $customerId, $cashierId, $posShiftId, $code, $subtotal, $discount, $total, $paymentMethod, $amountReceived, $change); if (!$stmt->execute()) throw new Exception('Không thể lưu đơn hàng.'); $orderId = (int)$stmt->insert_id; $stmt->close();
        if($combos)posDeductProductInventory($db,$theaterId,$catalog,$combos,$orderId,$code,$posUser);
        $itemStmt = $db->prepare('INSERT INTO order_items (order_id, item_type, item_code, item_name, quantity, unit_price, seat_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?,NOW())');
        foreach ($items as $item) { $itemSeatId=$item['seat_id']===null?0:(int)$item['seat_id'];$itemStmt->bind_param('isssidi', $orderId, $item['type'], $item['code'], $item['name'], $item['quantity'], $item['price'], $itemSeatId); if (!$itemStmt->execute()) throw new Exception('Không thể lưu chi tiết đơn hàng.'); }
        $itemStmt->close(); $reference = $code; $stmt = $db->prepare('INSERT INTO payments (order_id, method, amount, reference_code,created_at) VALUES (?, ?, ?, ?,NOW())'); $stmt->bind_param('isds', $orderId, $paymentMethod, $total, $reference); if (!$stmt->execute()) throw new Exception('Không thể lưu thanh toán.'); $stmt->close();
        if(!$db->query("DELETE FROM seat_holds WHERE showtime_id={$showtimeId} AND session_key='{$holdSessionEsc}'"))throw new Exception('Không thể giải phóng ghế sau thanh toán.');
        $db->commit(); $db->autocommit(true);
        $theater=getPosTheater($db,$theaterId);
        $receiptItems=array();foreach($items as $item)$receiptItems[]=array('type'=>$item['type'],'code'=>$item['code'],'name'=>$item['name'],'quantity'=>$item['quantity'],'unit_price'=>$item['price'],'line_total'=>$item['price']*$item['quantity']);
        jsonResponse(array('success' => true, 'message'=>'Thanh toán thành công, ghế và giao dịch đã được ghi nhận trong aurora_db.','data' => array('order_id' => $orderId, 'booking_id' => $bookingId, 'code' => $code, 'subtotal'=>$subtotal,'discount'=>$discount,'total' => $total,'member'=>$member, 'amount_received' => $amountReceived, 'change' => $change, 'payment_method' => $paymentMethod, 'items' => $receiptItems,'cashier_name'=>$posUser['full_name'],'counter'=>$activeShift['counter'],'theater_name'=>$theater?$theater['name']:'Aurora Cinema','created_at'=>$now)), 201);
    } catch (Exception $exception) { $db->rollback(); $db->autocommit(true); $errorMessage = $exception->getMessage(); if (!$errorMessage) $errorMessage = 'Không thể hoàn tất giao dịch.'; jsonResponse(array('success' => false, 'message' => $errorMessage), 409); }
}

jsonResponse(array('success' => false, 'message' => "Route '{$action}' không tồn tại."), 404);
