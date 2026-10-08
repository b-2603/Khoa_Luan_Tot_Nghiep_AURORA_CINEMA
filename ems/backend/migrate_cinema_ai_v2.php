<?php
/**
 * Cinema AI v2 - Mở rộng: EMS (thiết bị/sự cố), POS (giao dịch), TMS (trạng thái chiếu),
 * Pending Actions (xác nhận hành động nguy hiểm), Conversation Context (bộ nhớ thực thể)
 * + Seed dữ liệu bán vé / doanh thu để AI có thể phân tích.
 */
$pdo = new PDO("mysql:host=127.0.0.1;port=3306;dbname=aurora_ems;charset=utf8mb4", 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
echo "=== CONNECTED ===\n";

$pdo->exec("
CREATE TABLE IF NOT EXISTS `equipment` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `status` ENUM('operational','warning','fault','maintenance') DEFAULT 'operational',
  `last_maintenance` DATE NULL,
  `next_maintenance` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `equipment_incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `equipment_id` INT NOT NULL,
  `severity` ENUM('low','medium','high','critical') DEFAULT 'medium',
  `description` TEXT NOT NULL,
  `status` ENUM('open','in_progress','resolved') DEFAULT 'open',
  `reported_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME NULL,
  INDEX (`equipment_id`), INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pos_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(30) NOT NULL UNIQUE,
  `type` ENUM('ticket','combo','refund') NOT NULL,
  `item_name` VARCHAR(150) NULL,
  `quantity` INT DEFAULT 1,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` VARCHAR(30) DEFAULT 'cash',
  `status` ENUM('success','pending','failed','refunded') DEFAULT 'success',
  `error_message` VARCHAR(255) NULL,
  `staff_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX (`created_at`), INDEX (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_pending_actions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `token` VARCHAR(40) NOT NULL UNIQUE,
  `conversation_id` INT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(80) NOT NULL,
  `payload` JSON NULL,
  `summary` VARCHAR(500) NULL,
  `status` ENUM('pending','confirmed','cancelled','expired') DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  INDEX (`conversation_id`), INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// ALTER ai_conversations: thêm context (bộ nhớ thực thể)
$col = $pdo->query("SHOW COLUMNS FROM ai_conversations LIKE 'context'")->fetch();
if (!$col) {
    $pdo->exec("ALTER TABLE ai_conversations ADD COLUMN `context` JSON NULL AFTER `title`");
    echo "[+] Added ai_conversations.context\n";
}
echo "[1/4] Tables ready.\n";

// ---- SEED EQUIPMENT ----
if ($pdo->query("SELECT COUNT(*) FROM equipment")->fetchColumn() == 0) {
    $rooms = $pdo->query("SELECT id, name FROM rooms ORDER BY id")->fetchAll();
    $stmt = $pdo->prepare("INSERT INTO equipment (room_id, code, name, category, status, last_maintenance, next_maintenance) VALUES (?,?,?,?,?,?,?)");
    $eqStatus = [
        'P01' => ['operational', 'operational', 'operational'],
        'P02' => ['operational', 'warning', 'operational'],
        'P03' => ['operational', 'operational', 'fault'],
        'P04' => ['maintenance', 'operational', 'operational'],
        'P05' => ['operational', 'operational', 'operational'],
    ];
    foreach ($rooms as $r) {
        $n = $r['name'];
        $st = $eqStatus[$n] ?? ['operational','operational','operational'];
        $stmt->execute([$r['id'], "PRJ-$n", "Máy chiếu Laser Barco/Christie ($n)", 'projector', $st[0], date('Y-m-d', strtotime('-40 days')), date('Y-m-d', strtotime('+20 days'))]);
        $stmt->execute([$r['id'], "SND-$n", "Hệ thống âm thanh Dolby ($n)", 'audio', $st[1], date('Y-m-d', strtotime('-25 days')), date('Y-m-d', strtotime('+35 days'))]);
        $stmt->execute([$r['id'], "AC-$n", "Điều hòa trung tâm ($n)", 'hvac', $st[2], date('Y-m-d', strtotime('-60 days')), date('Y-m-d', strtotime('+5 days'))]);
    }
    $eq = $pdo->query("SELECT id, code FROM equipment")->fetchAll(PDO::FETCH_KEY_PAIR);
    $ids = array_flip($eq);
    $inc = $pdo->prepare("INSERT INTO equipment_incidents (equipment_id, severity, description, status, reported_at) VALUES (?,?,?,?,?)");
    $inc->execute([$ids['SND-P02'], 'low', 'Loa surround bên trái rè nhẹ ở dải tần thấp, cần cân chỉnh lại fader.', 'open', date('Y-m-d 09:15:00')]);
    $inc->execute([$ids['AC-P03'], 'high', 'Máy lạnh phòng IMAX P03 không đạt nhiệt độ 22°C, phòng nóng 28°C ảnh hưởng khách.', 'in_progress', date('Y-m-d 11:40:00')]);
    $inc->execute([$ids['PRJ-P04'], 'medium', 'Bảo trì định kỳ thay bóng Laser phòng 4DX, tạm ngưng suất chiếu.', 'in_progress', date('Y-m-d 08:00:00')]);
    echo "[2/4] Seeded equipment + incidents.\n";
}

// ---- SEED BOOKINGS HÔM NAY (để phân tích lấp đầy / doanh thu) ----
$todayBookings = $pdo->query("SELECT COUNT(*) FROM bookings WHERE DATE(created_at)=CURDATE() AND booking_code LIKE 'GEN-%'")->fetchColumn();
if ($todayBookings == 0) {
    mt_srand(2026);
    $showtimes = $pdo->query("SELECT s.id, s.room_id, s.price, s.start_at FROM showtimes s WHERE DATE(s.start_at)=CURDATE() AND s.status='active'")->fetchAll();
    $insB = $pdo->prepare("INSERT INTO bookings (user_id, showtime_id, booking_code, customer_name, customer_phone, status, total_amount, created_at) VALUES (NULL,?,?,?,?,'confirmed',?,?)");
    $insS = $pdo->prepare("INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (?,?,?)");
    $names = ['Nguyễn An','Trần Bình','Lê Châu','Phạm Dũng','Hoàng Em','Vũ Phúc','Đặng Giang','Bùi Hà','Đỗ Khoa','Ngô Lan'];
    $seq = 1;
    foreach ($showtimes as $st) {
        $hour = (int)date('H', strtotime($st['start_at']));
        // Giờ vàng tối đông hơn, giờ chiều vắng hơn
        $fill = $hour >= 19 ? mt_rand(55, 85) : ($hour >= 16 ? mt_rand(35, 55) : ($hour >= 13 ? mt_rand(10, 25) : mt_rand(15, 30)));
        $seatIds = $pdo->query("SELECT id FROM seats WHERE room_id={$st['room_id']} AND status='active'")->fetchAll(PDO::FETCH_COLUMN);
        $taken = $pdo->query("SELECT bs.seat_id FROM booking_seats bs JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id={$st['id']}")->fetchAll(PDO::FETCH_COLUMN);
        $free = array_values(array_diff($seatIds, $taken));
        shuffle($free);
        $target = (int)round(count($seatIds) * $fill / 100) - count($taken);
        $pos = 0;
        while ($target > 0 && $pos < count($free)) {
            $n = min(mt_rand(1, 4), $target, count($free) - $pos);
            $code = sprintf('GEN-%d-%04d', $st['id'], $seq++);
            $createdTs = min(time(), strtotime($st['start_at']) - mt_rand(3600, 6 * 3600));
            $insB->execute([$st['id'], $code, $names[array_rand($names)], '09' . mt_rand(10000000, 99999999), $st['price'] * $n, date('Y-m-d H:i:s', max($createdTs, strtotime('today')))]);
            $bid = $pdo->lastInsertId();
            for ($i = 0; $i < $n; $i++) $insS->execute([$bid, $free[$pos++], $st['price']]);
            $target -= $n;
        }
    }
    echo "[3/4] Seeded today's bookings for analytics.\n";
}

// ---- SEED POS TRANSACTIONS (7 ngày) ----
if ($pdo->query("SELECT COUNT(*) FROM pos_transactions")->fetchColumn() == 0) {
    mt_srand(77);
    $ins = $pdo->prepare("INSERT INTO pos_transactions (code, type, item_name, quantity, amount, payment_method, status, error_message, staff_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    $combos = [['Combo Solo (1 bắp + 1 nước)', 79000], ['Combo Couple (1 bắp lớn + 2 nước)', 119000], ['Combo Family (2 bắp + 4 nước)', 219000], ['Bắp Caramel Lớn', 69000], ['Nước Coca 32oz', 39000]];
    $n = 1000;
    for ($d = 6; $d >= 0; $d--) {
        $day = date('Y-m-d', strtotime("-$d days"));
        $count = mt_rand(25, 45);
        for ($i = 0; $i < $count; $i++) {
            $h = mt_rand(9, 22); $m = mt_rand(0, 59);
            $ts = sprintf('%s %02d:%02d:00', $day, $h, $m);
            if (mt_rand(1, 100) <= 45) {
                $c = $combos[array_rand($combos)]; $q = mt_rand(1, 3);
                $ins->execute(['POS' . $n++, 'combo', $c[0], $q, $c[1] * $q, ['cash','card','momo'][mt_rand(0,2)], 'success', null, mt_rand(2, 4), $ts]);
            } else {
                $q = mt_rand(1, 4);
                $ins->execute(['POS' . $n++, 'ticket', 'Vé xem phim', $q, 95000 * $q, ['cash','card','momo'][mt_rand(0,2)], 'success', null, 2, $ts]);
            }
        }
    }
    // Giao dịch lỗi mẫu
    $ins->execute(['POS125', 'ticket', 'Vé xem phim Avatar', 2, 190000, 'card', 'failed', 'Timeout ngân hàng: Không nhận được phản hồi từ cổng thanh toán sau 30s', 2, date('Y-m-d 10:42:00')]);
    $ins->execute(['POS126', 'combo', 'Combo Couple', 1, 119000, 'momo', 'pending', 'Chờ xác nhận từ ví MoMo', 3, date('Y-m-d 12:10:00')]);
    echo "[4/4] Seeded POS transactions.\n";
}
echo "=== v2 DONE ===\n";
