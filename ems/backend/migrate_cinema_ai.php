<?php
/**
 * Migration & Seeder for Cinema AI Architecture (Aurora Cinemas EMS)
 * Creates Cinema DB tables + AI Tables + Seeds realistic data
 */

$host = '127.0.0.1';
$port = '3306';
$dbname = 'aurora_ems';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
    echo "=== CONNECTED TO MYSQL aurora_ems ===\n";
} catch (Exception $e) {
    die("Connection failed: " . $e->getMessage());
}

// 1. TẠO CÁC BẢNG DỮ LIỆU RẠP CHIẾU PHIM (CINEMA DB)
$tablesSql = "
-- 1. movies
CREATE TABLE IF NOT EXISTS `movies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `original_title` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `genre` VARCHAR(100) NULL,
  `duration` INT NOT NULL DEFAULT 120,
  `age_rating` VARCHAR(10) DEFAULT 'P',
  `release_date` DATE NULL,
  `director` VARCHAR(150) NULL,
  `cast` TEXT NULL,
  `language` VARCHAR(50) DEFAULT 'Tiếng Việt / Phụ đề',
  `country` VARCHAR(50) DEFAULT 'Việt Nam',
  `poster_url` VARCHAR(500) NULL,
  `status` VARCHAR(20) DEFAULT 'now_showing',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'Standard 2D',
  `capacity` INT NOT NULL DEFAULT 100,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. seats
CREATE TABLE IF NOT EXISTS `seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `row` VARCHAR(5) NOT NULL,
  `number` INT NOT NULL,
  `seat_type` VARCHAR(20) DEFAULT 'standard',
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`room_id`),
  UNIQUE KEY `uniq_room_row_num` (`room_id`, `row`, `number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. showtimes
CREATE TABLE IF NOT EXISTS `showtimes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `movie_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `start_at` DATETIME NOT NULL,
  `end_at` DATETIME NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 95000,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`movie_id`),
  INDEX (`room_id`),
  INDEX (`start_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. bookings
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `showtime_id` INT NOT NULL,
  `booking_code` VARCHAR(50) NOT NULL UNIQUE,
  `customer_name` VARCHAR(150) NULL,
  `customer_phone` VARCHAR(30) NULL,
  `status` VARCHAR(20) DEFAULT 'confirmed',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`booking_code`),
  INDEX (`showtime_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. booking_seats
CREATE TABLE IF NOT EXISTS `booking_seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `seat_id` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 95000,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`booking_id`),
  INDEX (`seat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ai_conversations
CREATE TABLE IF NOT EXISTS `ai_conversations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ai_messages
CREATE TABLE IF NOT EXISTS `ai_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` INT NOT NULL,
  `role` ENUM('user', 'assistant', 'tool', 'system') NOT NULL,
  `tool_name` VARCHAR(100) NULL,
  `content` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. ai_tool_logs
CREATE TABLE IF NOT EXISTS `ai_tool_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `conversation_id` INT NULL,
  `tool_name` VARCHAR(100) NOT NULL,
  `arguments` JSON NULL,
  `result` JSON NULL,
  `status` ENUM('success', 'error', 'denied') DEFAULT 'success',
  `execution_time_ms` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`tool_name`),
  INDEX (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. ai_documents (RAG)
CREATE TABLE IF NOT EXISTS `ai_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) NOT NULL, -- POS, TMS, EMS, NGHIEP-VU, QUY-DINH
  `file_path` VARCHAR(500) NULL,
  `version` VARCHAR(20) DEFAULT '1.0',
  `status` VARCHAR(20) DEFAULT 'active',
  `content_summary` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. ai_document_chunks (RAG Knowledge Chunks)
CREATE TABLE IF NOT EXISTS `ai_document_chunks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `document_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. ai_feedback
CREATE TABLE IF NOT EXISTS `ai_feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_id` INT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `rating` INT DEFAULT 5,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

$pdo->exec($tablesSql);
echo "[1/4] Created Cinema DB + AI Tables successfully.\n";

// 2. SEED PHIM (MOVIES)
$movieCount = $pdo->query("SELECT COUNT(*) FROM movies")->fetchColumn();
if ($movieCount == 0) {
    $movies = [
        [
            'title' => 'Avatar: Dòng Chảy Của Nước',
            'original_title' => 'Avatar: The Way of Water',
            'description' => 'Hơn một thập kỷ sau sự kiện của phần phim đầu tiên, Jake Sully và Neytiri đã xây dựng gia đình tại Pandora nhưng mối đe dọa từ người Trái Đất quay trở lại.',
            'genre' => 'Khoa học viễn tưởng, Hành động, Phiêu lưu',
            'duration' => 192,
            'age_rating' => 'T13',
            'release_date' => '2022-12-16',
            'director' => 'James Cameron',
            'cast' => 'Sam Worthington, Zoe Saldana, Sigourney Weaver, Stephen Lang',
            'language' => 'Tiếng Anh - Phụ đề & Lồng tiếng',
            'country' => 'Mỹ',
            'poster_url' => 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
            'status' => 'now_showing'
        ],
        [
            'title' => 'Mai',
            'original_title' => 'Mai',
            'description' => 'Câu chuyện cảm động về cuộc đời của Mai - một người phụ nữ làm nghề massage trị liệu và tình yêu đầy trắc trở với chàng nhạc công Dương.',
            'genre' => 'Tâm lý, Tình cảm',
            'duration' => 131,
            'age_rating' => 'T18',
            'release_date' => '2024-02-10',
            'director' => 'Trấn Thành',
            'cast' => 'Phương Anh Đào, Tuấn Trần, Trấn Thành, Hồng Đào',
            'language' => 'Tiếng Việt',
            'country' => 'Việt Nam',
            'poster_url' => 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
            'status' => 'now_showing'
        ],
        [
            'title' => 'Dune: Hành Tinh Cát - Phần 2',
            'original_title' => 'Dune: Part Two',
            'description' => 'Paul Atreides hợp lực cùng Chani và tộc Fremen để trả thù những kẻ đã hủy hoại gia tộc mình, đồng thời đối mặt với số phận vũ trụ.',
            'genre' => 'Khoa học viễn tưởng, Sử thi, Hành động',
            'duration' => 166,
            'age_rating' => 'T16',
            'release_date' => '2024-03-01',
            'director' => 'Denis Villeneuve',
            'cast' => 'Timothée Chalamet, Zendaya, Rebecca Ferguson, Javier Bardem',
            'language' => 'Tiếng Anh - Phụ đề Việt',
            'country' => 'Mỹ',
            'poster_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500',
            'status' => 'now_showing'
        ],
        [
            'title' => 'Hố Đen Tử Thần',
            'original_title' => 'Interstellar',
            'description' => 'Trong tương lai Trái Đất bị tàn phá, một nhóm phi hành gia du hành qua lỗ sâu gần Sao Thổ để tìm kiếm hành tinh mới cho nhân loại.',
            'genre' => 'Khoa học viễn tưởng, Phiêu lưu, Kịch tính',
            'duration' => 169,
            'age_rating' => 'T13',
            'release_date' => '2014-11-07',
            'director' => 'Christopher Nolan',
            'cast' => 'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Michael Caine',
            'language' => 'Tiếng Anh - Phụ đề Việt (Bản IMAX Remaster)',
            'country' => 'Mỹ',
            'poster_url' => 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500',
            'status' => 'now_showing'
        ],
        [
            'title' => 'Deadpool & Wolverine',
            'original_title' => 'Deadpool & Wolverine',
            'description' => 'Wade Wilson bị lôi kéo vào nhiệm vụ giải cứu đa vũ trụ và buộc phải đồng hành cùng dị nhân Wolverine cộc cằn.',
            'genre' => 'Hành động, Siêu anh hùng, Hài hước',
            'duration' => 128,
            'age_rating' => 'T18',
            'release_date' => '2024-07-26',
            'director' => 'Shawn Levy',
            'cast' => 'Ryan Reynolds, Hugh Jackman, Emma Corrin, Matthew Macfadyen',
            'language' => 'Tiếng Anh - Phụ đề Việt',
            'country' => 'Mỹ',
            'poster_url' => 'https://images.unsplash.com/photo-1578836537282-3171d77f8632?w=500',
            'status' => 'now_showing'
        ],
        [
            'title' => 'Quật Mộ Trùng Ma',
            'original_title' => 'Exhuma',
            'description' => 'Hai pháp sư, một chuyên gia phong thủy và một người làm nghề mai táng dính vào lời nguyền kinh hoàng khi khai quật một ngôi mộ bí ẩn.',
            'genre' => 'Kinh dị, Bí ẩn, Huyền bí',
            'duration' => 134,
            'age_rating' => 'T16',
            'release_date' => '2024-03-15',
            'director' => 'Jang Jae-hyun',
            'cast' => 'Choi Min-sik, Kim Go-eun, Yoo Hae-jin, Lee Do-hyun',
            'language' => 'Tiếng Hàn - Phụ đề Việt',
            'country' => 'Hàn Quốc',
            'poster_url' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
            'status' => 'now_showing'
        ]
    ];

    $stmt = $pdo->prepare("INSERT INTO movies (title, original_title, description, genre, duration, age_rating, release_date, director, cast, language, country, poster_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    foreach ($movies as $m) {
        $stmt->execute([
            $m['title'], $m['original_title'], $m['description'], $m['genre'],
            $m['duration'], $m['age_rating'], $m['release_date'], $m['director'],
            $m['cast'], $m['language'], $m['country'], $m['poster_url'], $m['status']
        ]);
    }
    echo "[2/4] Seeded " . count($movies) . " movies.\n";
}

// 3. SEED ROOMS & SEATS
$roomCount = $pdo->query("SELECT COUNT(*) FROM rooms")->fetchColumn();
if ($roomCount == 0) {
    $rooms = [
        ['P01', 'Phòng Chiếu 1 (Standard 2D)', 90],
        ['P02', 'Phòng Chiếu 2 (VIP Premiere)', 45],
        ['P03', 'Phòng Chiếu 3 (IMAX Laser Dual 4K)', 120],
        ['P04', 'Phòng Chiếu 4 (4DX Motion & Effects)', 60],
        ['P05', 'Phòng Chiếu 5 (Dolby Atmos Cinema)', 105]
    ];
    $stmtRoom = $pdo->prepare("INSERT INTO rooms (name, type, capacity, status) VALUES (?, ?, ?, 'active')");
    $stmtSeat = $pdo->prepare("INSERT INTO seats (room_id, row, number, seat_type, status) VALUES (?, ?, ?, ?, 'active')");

    foreach ($rooms as $r) {
        $stmtRoom->execute([$r[0], $r[1], $r[2]]);
        $roomId = $pdo->lastInsertId();

        // Tạo ma trận ghế
        $rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        $cols = intval($r[2] / count($rows));
        foreach ($rows as $rowLetter) {
            for ($col = 1; $col <= $cols; $col++) {
                $type = 'standard';
                if (in_array($rowLetter, ['E', 'F'])) $type = 'vip';
                if ($rowLetter === 'G') $type = 'couple';
                $stmtSeat->execute([$roomId, $rowLetter, $col, $type]);
            }
        }
    }
    echo "[3/4] Seeded 5 rooms with realistic seating matrices.\n";
}

// 4. SEED SHOWTIMES & BOOKINGS
$showtimeCount = $pdo->query("SELECT COUNT(*) FROM showtimes")->fetchColumn();
if ($showtimeCount == 0) {
    $movieIds = $pdo->query("SELECT id FROM movies")->fetchAll(PDO::FETCH_COLUMN);
    $roomIds = $pdo->query("SELECT id FROM rooms")->fetchAll(PDO::FETCH_COLUMN);

    $today = date('Y-m-d');
    $times = ['10:00:00', '13:30:00', '16:45:00', '19:30:00', '21:50:00'];
    $prices = [85000, 95000, 110000, 120000, 140000];

    $stmtSt = $pdo->prepare("INSERT INTO showtimes (movie_id, room_id, start_at, end_at, price, status) VALUES (?, ?, ?, ?, ?, 'active')");
    
    $createdShowtimeIds = [];
    foreach ($movieIds as $mIdx => $mId) {
        foreach ($times as $tIdx => $t) {
            $roomId = $roomIds[($mIdx + $tIdx) % count($roomIds)];
            $startAt = "{$today} {$t}";
            $endAt = date('Y-m-d H:i:s', strtotime($startAt) + (130 * 60));
            $price = $prices[$tIdx % count($prices)];
            $stmtSt->execute([$mId, $roomId, $startAt, $endAt, $price]);
            $createdShowtimeIds[] = $pdo->lastInsertId();
        }
    }

    // Seed sample bookings
    $stmtBk = $pdo->prepare("INSERT INTO bookings (user_id, showtime_id, booking_code, customer_name, customer_phone, status, total_amount) VALUES (?, ?, ?, ?, ?, 'confirmed', ?)");
    $stmtBkSeat = $pdo->prepare("INSERT INTO booking_seats (booking_id, seat_id, price) VALUES (?, ?, ?)");

    $sampleBookings = [
        ['BK20261006001', 'Nguyễn Minh Tuấn', '0912345678', 220000, ['C10', 'C11']],
        ['BK20261006002', 'Lê Phương Thảo', '0988776655', 240000, ['D8', 'D9']],
        ['BK-AVATAR-999', 'Trần Hữu Nam', '0903112233', 140000, ['F6']]
    ];

    foreach ($sampleBookings as $idx => $sb) {
        $stId = $createdShowtimeIds[$idx % count($createdShowtimeIds)];
        $stmtBk->execute([1, $stId, $sb[0], $sb[1], $sb[2], $sb[3]]);
        $bkId = $pdo->lastInsertId();

        // Lấy phòng của suất này
        $roomId = $pdo->query("SELECT room_id FROM showtimes WHERE id = {$stId}")->fetchColumn();
        foreach ($sb[4] as $code) {
            $row = substr($code, 0, 1);
            $num = intval(substr($code, 1));
            $seatId = $pdo->query("SELECT id FROM seats WHERE room_id = {$roomId} AND row = '{$row}' AND number = {$num} LIMIT 1")->fetchColumn();
            if ($seatId) {
                $stmtBkSeat->execute([$bkId, $seatId, $sb[3] / count($sb[4])]);
            }
        }
    }
    echo "[4/4] Seeded " . count($createdShowtimeIds) . " showtimes and sample bookings.\n";
}

// 5. SEED RAG KNOWLEDGE DOCUMENTS (BỘ NÃO 3)
$docCount = $pdo->query("SELECT COUNT(*) FROM ai_documents")->fetchColumn();
if ($docCount == 0) {
    $docs = [
        [
            'name' => 'Quy trình đổi vé và hoàn tiền tại quầy POS',
            'category' => 'NGHIEP-VU',
            'summary' => 'Quy định đổi vé trước 60 phút trước giờ chiếu, hoàn voucher khi có sự cố kỹ thuật phòng chiếu.',
            'chunks' => [
                'Theo quy định Aurora Cinemas, khách hàng được đổi sang suất chiếu khác hoặc phim khác cùng giá vé trước ít nhất 60 phút so với giờ in trên vé. Vé đã qua giờ chiếu không hỗ trợ đổi hoặc hoàn.',
                'Trường hợp suất chiếu bị gián đoạn do sự cố kỹ thuật (mất điện, lỗi máy chiếu, sự cố âm thanh trên 15 phút), nhân viên quầy vé có thẩm quyền hoàn tiền 100% hoặc cấp 01 Vé Xem Phim Miễn Phí (Complimentary Voucher) có thời hạn 30 ngày.',
                'Đối với vé mua qua ứng dụng/online, khách hàng chỉ có thể hủy/đổi trên app trước 120 phút. Nếu đổi tại rạp, nhân viên đối chiếu mã OTP hoặc mã QR booking trên app.'
            ]
        ],
        [
            'name' => 'Sổ tay vận hành hệ thống bán vé POS & Quầy Concession',
            'category' => 'POS',
            'summary' => 'Hướng dẫn thao tác POS, quét barcode vé, in hóa đơn GTGT và xử lý lỗi treo giao diện.',
            'chunks' => [
                'Khi POS báo lỗi Giao dịch treo (#POS125 hoặc lỗi Timeout ngân hàng): Tuyệt đối không bấm thanh toán lại lần 2. Nhân viên chuyển sang tab Tra cứu giao dịch, kiểm tra mã tham chiếu POS Bank. Nếu tiền đã trừ khỏi tài khoản khách, bấm Xác nhận thành công thủ công.',
                'Quy trình phục vụ Concession 45 giây: Chào khách bằng nụ cười -> Xác nhận đơn bắp nước -> Up-sell combo VIP (chỉ thêm 19k nâng size bắp Lên Lớn) -> Quét thẻ thành viên -> Thanh toán -> Trao khay bắp nước bằng 2 tay kèm khăn giấy.'
            ]
        ],
        [
            'name' => 'Quy trình xử lý sự cố hệ thống quản lý rạp TMS & Máy chiếu',
            'category' => 'TMS',
            'summary' => 'Xử lý lỗi KDM hết hạn, mất tín hiệu máy chiếu Christie/Barco và lỗi đồng bộ âm thanh Atmos.',
            'chunks' => [
                'Khi phòng chiếu chưa bắt đầu đúng giờ: Kiểm tra thứ tự: 1. Khóa bản quyền KDM (Key Delivery Message) đã nạp hợp lệ chưa. 2. Trạng thái bóng đèn Laser / Xenon trên máy chiếu. 3. Bản phim DCP đã ingest 100% vào server phụ chưa.',
                'Nếu tín hiệu hình ảnh bị đen (Black Screen) lúc 00:00: Kỹ thuật viên chuyển sang nguồn dự phòng Channel 2 trên máy chiếu, khởi động lại bộ giải mã IMB trong 90 giây và thông báo Trưởng ca để phát loa xin lỗi khán giả.'
            ]
        ],
        [
            'name' => 'Nội quy và tiêu chuẩn 5 sao Aurora Hospitality',
            'category' => 'QUY-DINH',
            'summary' => 'Quy tắc tác phong nhân viên, trang phục, chào khách và xử lý tình huống LAST.',
            'chunks' => [
                'Mô hình LAST khi xử lý khiếu nại khách hàng: L (Listen - Lắng nghe chân thành), A (Apologize - Xin lỗi vì trải nghiệm chưa trọn vẹn), S (Solve - Đưa ra giải pháp tức thì: đổi ghế, tặng bắp nước, bù vé), T (Thank - Cảm ơn khách đã góp ý để rạp cải thiện).',
                'Phân loại độ tuổi phim theo Luật Điện Ảnh: P (Mọi lứa tuổi), K (Dưới 13 tuổi có phụ huynh đi kèm), T13 (Từ 13 tuổi trở lên), T16 (Từ 16 tuổi trở lên), T18 (Từ 18 tuổi trở lên), C (Cấm phổ biến). Nhân viên soát vé bắt buộc kiểm tra CCCD khi nghi vấn khách dưới tuổi quy định.'
            ]
        ]
    ];

    $stmtDoc = $pdo->prepare("INSERT INTO ai_documents (name, category, content_summary, status) VALUES (?, ?, ?, 'active')");
    $stmtChunk = $pdo->prepare("INSERT INTO ai_document_chunks (document_id, content, metadata) VALUES (?, ?, ?)");

    foreach ($docs as $d) {
        $stmtDoc->execute([$d['name'], $d['category'], $d['summary']]);
        $docId = $pdo->lastInsertId();
        foreach ($d['chunks'] as $c) {
            $stmtChunk->execute([$docId, $c, json_encode(['category' => $d['category']])]);
        }
    }
    echo "[5/5] Seeded RAG Documents and Chunks for POS, TMS, EMS, and Cinema SOP.\n";
}

echo "=== MIGRATION & SEEDING COMPLETED SUCCESSFULLY ===\n";
