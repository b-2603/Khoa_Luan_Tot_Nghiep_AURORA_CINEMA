<?php

// Aurora customer assistant. This file is loaded by public/api.php and keeps
// all assistant state in aurora_db. No external AI key or seed catalogue is
// required: recommendations are built from the live movie/showtime tables.

function aurora_ai_log_db_failure($context, $db) {
    if (!function_exists('error_log')) return;
    $errno = isset($db->errno) ? (int)$db->errno : 0;
    error_log('[Aurora assistant] '.$context.' failed (database errno '.$errno.').');
}

function aurora_ai_text_length($value) {
    $value = (string)$value;
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function aurora_ai_json_for_storage($value, $maxBytes) {
    $json = json_encode($value);
    if (!is_string($json) || strlen($json) > (int)$maxBytes) return false;
    return $json;
}

function aurora_ai_database_encoding($db) {
    static $encoding = null;
    if ($encoding !== null) return $encoding;
    $supportsUtf8mb4 = false;
    $result = $db->query("SHOW CHARACTER SET LIKE 'utf8mb4'");
    if ($result) {
        $supportsUtf8mb4 = $result->num_rows > 0;
        $result->free();
    }
    $encoding = $supportsUtf8mb4
        ? array('charset'=>'utf8mb4','collation'=>'utf8mb4_unicode_ci')
        : array('charset'=>'utf8','collation'=>'utf8_unicode_ci');
    return $encoding;
}

function aurora_ai_ensure_utf8mb4_table($db, $table) {
    if (!preg_match('/^[a-z0-9_]+$/', $table)) return false;
    $encoding = aurora_ai_database_encoding($db);
    $safeTable = $db->real_escape_string($table);
    $status = $db->query("SELECT TABLE_COLLATION AS Collation FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{$safeTable}' LIMIT 1");
    if (!$status || !($row = $status->fetch_assoc())) return false;
    $collation = isset($row['Collation']) ? strtolower((string)$row['Collation']) : '';
    if ($collation === strtolower($encoding['collation'])) return true;
    return (bool)$db->query("ALTER TABLE `{$table}` CONVERT TO CHARACTER SET {$encoding['charset']} COLLATE {$encoding['collation']}");
}

function aurora_ai_ensure_client_message_schema($db) {
    $columns = $db->query("SHOW COLUMNS FROM customer_ai_messages LIKE 'client_message_id'");
    if (!$columns) return false;
    if (!$columns->num_rows && !$db->query("ALTER TABLE customer_ai_messages ADD COLUMN client_message_id VARCHAR(80) NULL AFTER conversation_id")) return false;

    $indexes = $db->query('SHOW INDEX FROM customer_ai_messages');
    if (!$indexes) return false;
    $hasIndex = false;
    while ($index = $indexes->fetch_assoc()) {
        if (isset($index['Key_name']) && $index['Key_name'] === 'uq_ai_message_client') { $hasIndex = true; break; }
    }
    if (!$hasIndex && !$db->query('ALTER TABLE customer_ai_messages ADD UNIQUE KEY uq_ai_message_client (conversation_id,sender,client_message_id)')) return false;
    return true;
}

function aurora_ai_ensure_schema($db) {
    $encoding = aurora_ai_database_encoding($db);$charset=$encoding['charset'];$collation=$encoding['collation'];
    if (method_exists($db, 'set_charset')) $db->set_charset($charset);
    $queries = array(
        "CREATE TABLE IF NOT EXISTS customer_ai_profiles (
            user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
            onboarding_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
            preferred_genres VARCHAR(255) NULL,
            first_seen_at DATETIME NOT NULL,
            last_seen_at DATETIME NOT NULL,
            onboarding_completed_at DATETIME NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_ai_profile_onboarding (onboarding_status, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}",
        "CREATE TABLE IF NOT EXISTS customer_ai_conversations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            conversation_key VARCHAR(64) NOT NULL,
            session_key VARCHAR(128) NOT NULL,
            user_id BIGINT UNSIGNED NULL,
            language VARCHAR(5) NOT NULL DEFAULT 'vi',
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            last_message_at DATETIME NULL,
            UNIQUE KEY uq_ai_conversation_key (conversation_key),
            KEY idx_ai_conversation_user (user_id, updated_at),
            KEY idx_ai_conversation_session (session_key, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}",
        "CREATE TABLE IF NOT EXISTS customer_ai_messages (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            conversation_id BIGINT UNSIGNED NOT NULL,
            client_message_id VARCHAR(80) NULL,
            sender VARCHAR(20) NOT NULL,
            message_text TEXT NOT NULL,
            intent VARCHAR(50) NULL,
            metadata_json TEXT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE KEY uq_ai_message_client (conversation_id, sender, client_message_id),
            KEY idx_ai_message_conversation (conversation_id, id),
            KEY idx_ai_message_intent (intent, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}",
        "CREATE TABLE IF NOT EXISTS customer_ai_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            session_key VARCHAR(128) NOT NULL,
            user_id BIGINT UNSIGNED NULL,
            event_type VARCHAR(40) NOT NULL,
            step_key VARCHAR(60) NULL,
            metadata_json TEXT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_ai_event_user (user_id, created_at),
            KEY idx_ai_event_type (event_type, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}"
    );
    foreach ($queries as $query) if (!$db->query($query)) return false;
    if (!aurora_ai_ensure_client_message_schema($db)) return false;
    $tables = array('customer_ai_profiles','customer_ai_conversations','customer_ai_messages','customer_ai_events');
    foreach ($tables as $table) if (!aurora_ai_ensure_utf8mb4_table($db, $table)) return false;
    return true;
}

function aurora_mascot_ensure_schema($db) {
    $encoding = aurora_ai_database_encoding($db);$charset=$encoding['charset'];$collation=$encoding['collation'];
    if (method_exists($db, 'set_charset')) $db->set_charset($charset);
    $queries = array(
        "CREATE TABLE IF NOT EXISTS mascot_3d_config (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            config_key VARCHAR(60) NOT NULL,
            config_value TEXT NOT NULL,
            label VARCHAR(120) NOT NULL,
            updated_by BIGINT UNSIGNED NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uq_mascot_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}",
        "CREATE TABLE IF NOT EXISTS mascot_3d_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            session_key VARCHAR(128) NOT NULL,
            user_id BIGINT UNSIGNED NULL,
            event_type VARCHAR(50) NOT NULL,
            expression VARCHAR(30) NULL,
            pose VARCHAR(30) NULL,
            page_context VARCHAR(80) NULL,
            metadata_json TEXT NULL,
            ip_hash CHAR(64) NULL,
            created_at DATETIME NOT NULL,
            KEY idx_mascot_event_user (user_id, created_at),
            KEY idx_mascot_event_type (event_type, created_at),
            KEY idx_mascot_event_session (session_key, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}",
        "CREATE TABLE IF NOT EXISTS mascot_3d_daily_stats (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            stat_date DATE NOT NULL,
            total_interactions INT UNSIGNED NOT NULL DEFAULT 0,
            unique_users INT UNSIGNED NOT NULL DEFAULT 0,
            chat_opens INT UNSIGNED NOT NULL DEFAULT 0,
            most_popular_expression VARCHAR(30) NULL,
            most_popular_pose VARCHAR(30) NULL,
            avg_session_duration_sec DECIMAL(8,2) NULL,
            computed_at DATETIME NOT NULL,
            UNIQUE KEY uq_mascot_stat_date (stat_date)
        ) ENGINE=InnoDB DEFAULT CHARSET={$charset} COLLATE={$collation}"
    );
    foreach ($queries as $query) if (!$db->query($query)) return false;
    $tables = array('mascot_3d_config','mascot_3d_events','mascot_3d_daily_stats');
    foreach ($tables as $table) if (!aurora_ai_ensure_utf8mb4_table($db, $table)) return false;
    $now=$db->real_escape_string(aurora_vietnam_now());
    $seed="INSERT IGNORE INTO mascot_3d_config(config_key,config_value,label,updated_at) VALUES
        ('body_color','#F7D25E','Màu thân vàng Aurora','{$now}'),
        ('accent_color','#0F1B3D','Màu xanh navy nhận diện','{$now}'),
        ('cheek_color','#FFB8C6','Màu má hồng','{$now}'),
        ('eye_color','#1A1A3A','Màu mắt','{$now}'),
        ('scarf_color','#0F1B3D','Màu khăn choàng phim','{$now}'),
        ('film_color','#2C3E6A','Màu cuộn phim','{$now}'),
        ('mascot_name','Aurora','Tên linh vật','{$now}'),
        ('mascot_slogan','Cùng bạn tận hưởng mọi khoảnh khắc điện ảnh!','Slogan linh vật','{$now}'),
        ('idle_animation','float','Chuyển động khi nghỉ','{$now}'),
        ('enable_shadow','1','Hiển thị bóng đổ','{$now}'),
        ('enable_particles','1','Hiển thị hạt sáng','{$now}'),
        ('scale_factor','1.0','Tỷ lệ kích thước','{$now}'),
        ('ambient_light','0.6','Cường độ ánh sáng','{$now}'),
        ('point_light_x','5','Vị trí X đèn điểm','{$now}'),
        ('point_light_y','10','Vị trí Y đèn điểm','{$now}'),
        ('point_light_z','8','Vị trí Z đèn điểm','{$now}'),
        ('engine','AURORA_CINEMATIC_RIG_V3','Bộ máy chuyển động','{$now}'),
        ('engine_version','3.0.0','Phiên bản bộ máy','{$now}'),
        ('asset_root','/assets/aurora-assistant','Thư mục tài nguyên','{$now}'),
        ('asset_version','3','Phiên bản tài nguyên','{$now}'),
        ('config_schema_version','2','Phiên bản cấu hình','{$now}')";
    return (bool)$db->query($seed);
}

function aurora_mascot_config_payload($db) {
    $config=array();
    $rows=$db->query('SELECT config_key,config_value FROM mascot_3d_config ORDER BY id');
    if($rows)while($row=$rows->fetch_assoc())$config[$row['config_key']]=$row['config_value'];
    // Stable public metadata is additive; existing flat snake_case config keys remain unchanged.
    if(!isset($config['engine']))$config['engine']='AURORA_CINEMATIC_RIG_V3';
    if(!isset($config['engine_version']))$config['engine_version']='3.0.0';
    if(!isset($config['asset_root']))$config['asset_root']='/assets/aurora-assistant';
    if(!isset($config['asset_version']))$config['asset_version']='3';
    if(!isset($config['config_schema_version']))$config['config_schema_version']='2';
    return $config;
}

function aurora_mascot_require_admin($db) {
    $sessionUser=isset($_SESSION['tms_user'])&&is_array($_SESSION['tms_user'])?$_SESSION['tms_user']:array();
    $userId=isset($sessionUser['id'])?(int)$sessionUser['id']:aurora_user_id();
    if($userId<1)aurora_response(array('message'=>'Vui lòng đăng nhập tài khoản quản trị TMS.'),401);
    $row=$db->query('SELECT id,role,status FROM users WHERE id='.(int)$userId.' LIMIT 1');
    $user=$row?$row->fetch_assoc():null;
    if(!$user||$user['status']!=='active'||!in_array($user['role'],array('super_admin','admin'),true))aurora_response(array('message'=>'Chỉ Admin Tổng được truy cập chức năng quản trị linh vật.'),403);
    return (int)$user['id'];
}

function aurora_mascot_clean_enum($value, $allowed, $maxLength) {
    $value = strtolower(trim((string)$value));
    if ($value === '') return '';
    if (aurora_ai_text_length($value) > (int)$maxLength || !in_array($value, $allowed, true)) return false;
    return $value;
}

function aurora_mascot_clean_context($value, $maxLength) {
    $value = trim((string)$value);
    if ($value === '') return '';
    if (aurora_ai_text_length($value) > (int)$maxLength) return false;
    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._:\/\-]*$/', $value)) return false;
    return $value;
}

function aurora_mascot_payload_is_valid($body) {
    return is_array($body) && aurora_ai_json_for_storage($body, 4096) !== false;
}

function aurora_mascot_take_event_rate_slot() {
    $now = time();
    $windowSeconds = 60;
    $limit = 60;
    $state = isset($_SESSION['aurora_mascot_event_rate']) && is_array($_SESSION['aurora_mascot_event_rate'])
        ? $_SESSION['aurora_mascot_event_rate'] : array();
    $startedAt = isset($state['started_at']) ? (int)$state['started_at'] : 0;
    $count = isset($state['count']) ? (int)$state['count'] : 0;
    if ($startedAt <= 0 || ($now - $startedAt) >= $windowSeconds || ($now - $startedAt) < 0) {
        $startedAt = $now;
        $count = 0;
    }
    if ($count >= $limit) return false;
    $_SESSION['aurora_mascot_event_rate'] = array('started_at'=>$startedAt,'count'=>$count+1);
    return true;
}

function aurora_mascot_log_event($db,$userId,$eventType,$expression,$pose,$pageContext,$metadata) {
    $session=$db->real_escape_string(aurora_ai_session_key());
    $type=$db->real_escape_string(aurora_ai_clean_text(strtoupper($eventType),50));
    $expression=$db->real_escape_string(aurora_ai_clean_text($expression,30));
    $pose=$db->real_escape_string(aurora_ai_clean_text($pose,30));
    $page=$db->real_escape_string(aurora_ai_clean_text($pageContext,80));
    $jsonValue=aurora_ai_json_for_storage($metadata,4096);
    if($jsonValue===false)return false;
    $json=$db->real_escape_string($jsonValue);
    $ip=isset($_SERVER['REMOTE_ADDR'])?(string)$_SERVER['REMOTE_ADDR']:'';
    $ipHash=$db->real_escape_string(hash('sha256','aurora-mascot|'.$ip));
    $now=$db->real_escape_string(aurora_vietnam_now());
    return $db->query("INSERT INTO mascot_3d_events(session_key,user_id,event_type,expression,pose,page_context,metadata_json,ip_hash,created_at) VALUES('{$session}',".($userId>0?(int)$userId:'NULL').",'{$type}','{$expression}','{$pose}','{$page}','{$json}','{$ipHash}','{$now}')");
}

function aurora_ai_session_key() {
    $id = session_id();
    return $id !== '' ? substr($id, 0, 128) : 'guest';
}

function aurora_ai_clean_text($value, $maxLength) {
    $value = trim((string)$value);
    if (function_exists('mb_substr')) return mb_substr($value, 0, $maxLength, 'UTF-8');
    return substr($value, 0, $maxLength);
}

function aurora_ai_lower($value) {
    return function_exists('mb_strtolower') ? mb_strtolower((string)$value, 'UTF-8') : strtolower((string)$value);
}

function aurora_ai_has_any($text, $needles) {
    foreach ($needles as $needle) if (strpos($text, $needle) !== false) return true;
    return false;
}

function aurora_ai_detect($message) {
    $text = aurora_ai_lower($message);
    $genres = array(
        'Hành động' => array('hành động','hanh dong','action','siêu anh hùng','sieu anh hung'),
        'Kinh dị' => array('kinh dị','kinh di','horror','ma ','rùng rợn','rung ron'),
        'Hoạt hình' => array('hoạt hình','hoat hinh','animation','anime','thiếu nhi','thieu nhi'),
        'Hài' => array('phim hài','phim hai','comedy','vui nhộn','vui nhon'),
        'Tình cảm' => array('tình cảm','tinh cam','romance','lãng mạn','lang man'),
        'Gia đình' => array('gia đình','gia dinh','family'),
        'Khoa học viễn tưởng' => array('viễn tưởng','vien tuong','sci-fi','khoa học','khoa hoc')
    );
    $genre = '';
    foreach ($genres as $name => $keywords) if (aurora_ai_has_any($text, $keywords)) { $genre = $name; break; }
    if (aurora_ai_has_any($text, array('xin chào','xin chao','hello','hi ','chào bạn','chao ban'))) return array('intent'=>'GREETING','genre'=>$genre);
    if (aurora_ai_has_any($text, array('suất chiếu','suat chieu','lịch chiếu','lich chieu','showtime','mấy giờ','may gio'))) return array('intent'=>'SHOWTIME','genre'=>$genre);
    if (aurora_ai_has_any($text, array('giá vé','gia ve','ticket price','bao nhiêu tiền','bao nhieu tien'))) return array('intent'=>'TICKET_PRICE','genre'=>$genre);
    if (aurora_ai_has_any($text, array('ghế','ghe','seat','vị trí đẹp','vi tri dep'))) return array('intent'=>'SEAT','genre'=>$genre);
    if (aurora_ai_has_any($text, array('đặt vé','dat ve','booking','thanh toán','thanh toan'))) return array('intent'=>'BOOKING','genre'=>$genre);
    if (aurora_ai_has_any($text, array('ưu đãi','uu dai','khuyến mãi','khuyen mai','voucher','promotion'))) return array('intent'=>'PROMOTION','genre'=>$genre);
    if (aurora_ai_has_any($text, array('thành viên','thanh vien','điểm','diem','membership','tích điểm','tich diem'))) return array('intent'=>'MEMBERSHIP','genre'=>$genre);
    if ($genre !== '' || aurora_ai_has_any($text, array('phim gì','phim gi','gợi ý phim','goi y phim','tư vấn phim','tu van phim','recommend','xem gì','xem gi'))) return array('intent'=>'MOVIE_RECOMMENDATION','genre'=>$genre);
    if (aurora_ai_has_any($text, array('hỗ trợ','ho tro','liên hệ','lien he','khiếu nại','khieu nai'))) return array('intent'=>'SUPPORT','genre'=>$genre);
    return array('intent'=>'FALLBACK','genre'=>$genre);
}

function aurora_ai_movie_payload($row) {
    return array(
        'id'=>(int)$row['id'], 'title'=>$row['title'], 'description'=>$row['description'],
        'durationMinutes'=>(int)$row['duration_minutes'], 'ageRating'=>aurora_age_rating($row['age_rating']),
        'format'=>$row['format'], 'genre'=>$row['genre'], 'posterUrl'=>$row['poster_url'],
        'status'=>strtoupper(trim((string)$row['status'])), 'releaseDate'=>$row['release_date'],
        'isHot'=>(bool)$row['is_hot'], 'upcomingShowtimeCount'=>(int)$row['upcoming_showtime_count'],
        'nextShowtime'=>$row['next_showtime'],
        'minTicketPrice'=>$row['min_ticket_price'] !== null ? (float)$row['min_ticket_price'] : null,
        'theaterCount'=>(int)$row['theater_count']
    );
}

function aurora_ai_recommendations($db, $genre, $userId) {
    if ($genre === '' && $userId > 0) {
        $history = $db->query("SELECT m.genre,COUNT(*) AS total FROM bookings b INNER JOIN showtimes st ON st.id=b.showtime_id INNER JOIN movies m ON m.id=st.movie_id WHERE b.user_id=".(int)$userId." AND b.status IN ('PAID','CONFIRMED','COMPLETED') AND m.genre IS NOT NULL AND m.genre<>'' GROUP BY m.genre ORDER BY total DESC LIMIT 1");
        if ($history && ($historyRow=$history->fetch_assoc())) $genre = $historyRow['genre'];
    }
    $now = $db->real_escape_string(aurora_vietnam_now());
    $where = "UPPER(m.status) IN ('NOW_SHOWING','SPECIAL_SHOWING','COMING_SOON')";
    if ($genre !== '') $where .= " AND LOWER(m.genre) LIKE '%".$db->real_escape_string(aurora_ai_lower($genre))."%'";
    $sql = "SELECT m.id,m.title,m.description,m.duration_minutes,m.age_rating,m.format,m.genre,m.poster_url,m.status,m.release_date,m.is_hot,
        (SELECT COUNT(*) FROM showtimes st WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at>'{$now}') AS upcoming_showtime_count,
        (SELECT MIN(st.starts_at) FROM showtimes st WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at>'{$now}') AS next_showtime,
        (SELECT MIN(st.ticket_price) FROM showtimes st WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at>'{$now}') AS min_ticket_price,
        (SELECT COUNT(DISTINCT s.theater_id) FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id WHERE st.movie_id=m.id AND st.status='OPEN' AND st.starts_at>'{$now}') AS theater_count
        FROM movies m WHERE {$where} ORDER BY (upcoming_showtime_count>0) DESC,m.is_hot DESC,m.release_date DESC,m.id DESC LIMIT 3";
    $result = $db->query($sql);
    // If a requested genre has no current movie, still offer the best live titles.
    if ((!$result || !$result->num_rows) && $genre !== '') return aurora_ai_recommendations($db, '', $userId);
    $items = array();
    if ($result) while ($row=$result->fetch_assoc()) $items[] = aurora_ai_movie_payload($row);
    return $items;
}

function aurora_ai_reply($db, $message, $language, $userId) {
    $detected = aurora_ai_detect($message); $intent=$detected['intent']; $genre=$detected['genre'];
    $vi = $language !== 'en'; $recommendations=array(); $actions=array(); $pose='advisor'; $motion='point';
    if ($intent === 'GREETING') {
        $pose='wave'; $motion='wave';
        $reply=$vi?'Xin chào! Mình là Aurora. Mình có thể chọn phim theo sở thích, tìm suất chiếu, kiểm tra giá vé và hướng dẫn đặt ghế cho bạn.':'Hello! I am Aurora. I can recommend movies, find showtimes, check ticket prices and guide your booking.';
    } elseif ($intent === 'MOVIE_RECOMMENDATION') {
        $pose='intro'; $motion='clap';
        $recommendations=aurora_ai_recommendations($db,$genre,$userId);
        $reply=$recommendations?($vi?($genre!==''?'Mình đã chọn các phim '.$genre.' đáng xem nhất và còn suất chiếu trên hệ thống Aurora:':'Dựa trên phim đang chiếu và lịch chiếu thực tế, đây là những lựa chọn nổi bật cho bạn:'):'Based on Aurora’s live catalogue and showtimes, these are my top picks for you:'):($vi?'Hiện chưa có phim phù hợp đang mở bán. Bạn có thể mở danh sách phim để xem các tựa sắp chiếu.':'There are no matching movies on sale right now. Open the movie catalogue to see upcoming titles.');
        $actions[]=array('type'=>'OPEN_MOVIES','label'=>$vi?'Xem tất cả phim':'Browse all movies');
    } elseif ($intent === 'SHOWTIME') {
        $pose='notify'; $motion='announce';
        $recommendations=aurora_ai_recommendations($db,$genre,$userId);
        $reply=$recommendations?($vi?'Mình đã kiểm tra lịch chiếu đang mở bán. Chọn một phim bên dưới hoặc mở lịch theo rạp để xem giờ chiếu chính xác.':'I checked the showtimes currently on sale. Pick a movie below or open the cinema schedule for exact times.'):($vi?'Hiện chưa có suất chiếu nào đang mở bán. Bạn hãy mở lịch chiếu để kiểm tra lại theo ngày và rạp.':'There are no showtimes on sale right now. Open the schedule to check another date or cinema.');
        $actions[]=array('type'=>'OPEN_SCHEDULE','label'=>$vi?'Mở lịch chiếu':'Open showtimes');
    } elseif ($intent === 'TICKET_PRICE') {
        $pose='advisor'; $motion='point';
        $now=$db->real_escape_string(aurora_vietnam_now()); $price=$db->query("SELECT MIN(ticket_price) min_price,MAX(ticket_price) max_price FROM showtimes WHERE status='OPEN' AND starts_at>'{$now}'"); $min=0;$max=0;
        if($price&&($row=$price->fetch_assoc())){$min=(float)$row['min_price'];$max=(float)$row['max_price'];}
        $range=$min>0?number_format($min,0,',','.').'đ'.($max>$min?' - '.number_format($max,0,',','.').'đ':''):'';
        $reply=$vi?($range!==''?'Giá suất chiếu đang mở bán hiện từ '.$range.'. Giá cuối cùng phụ thuộc loại ghế, định dạng phim và khung giờ.':'Hiện chưa có suất mở bán để tổng hợp giá. Bạn có thể xem chính sách giá theo từng loại ghế và khung giờ.') : ($range!==''?'Current showtime prices range from '.$range.'. Final prices depend on seat type, format and session time.':'There are no on-sale sessions to summarize yet. You can still view pricing policies by seat type and time.');
        $actions[]=array('type'=>'OPEN_PRICES','label'=>$vi?'Xem bảng giá':'View ticket prices');
    } elseif ($intent === 'SEAT') {
        $pose='thinking'; $motion='think';
        $reply=$vi?'Ghế giữa phòng, cách màn hình khoảng hai phần ba chiều dài thường cho góc nhìn và âm thanh cân bằng nhất. Khi đặt vé, sơ đồ sẽ hiển thị ghế thường, VIP, ghế đôi và ghế đã bán theo màu.':'Seats near the horizontal center, about two-thirds back, usually provide the most balanced view and sound.';
        $actions[]=array('type'=>'OPEN_MOVIES','label'=>$vi?'Chọn phim và ghế':'Choose movie & seats');
    } elseif ($intent === 'BOOKING') {
        $pose='intro'; $motion='clap';
        $reply=$vi?'Bạn chọn Phim → suất chiếu → ghế → ưu đãi → phương thức thanh toán. Vé điện tử sẽ xuất hiện trong tài khoản sau khi thanh toán thành công.':'Choose Movie → showtime → seats → offer → payment. Your e-ticket appears in your account after successful payment.';
        $actions[]=array('type'=>'OPEN_MOVIES','label'=>$vi?'Đặt vé ngay':'Book now');
    } elseif ($intent === 'PROMOTION') {
        $pose='notify'; $motion='announce';
        $now=$db->real_escape_string(aurora_vietnam_now());$offer=$db->query("SELECT code,name,discount_type,discount_value FROM vouchers WHERE status='active' AND starts_at<='{$now}' AND ends_at>='{$now}' AND (usage_limit=0 OR used_count<usage_limit) ORDER BY is_featured DESC,sort_order ASC,id DESC LIMIT 1");
        $featured=$offer?$offer->fetch_assoc():null;
        if($featured){$value=$featured['discount_type']==='percent'?number_format((float)$featured['discount_value'],0,',','.').'%':number_format((float)$featured['discount_value'],0,',','.').'đ';$reply=$vi?'Ưu đãi nổi bật hiện tại là “'.$featured['name'].'” (mã '.$featured['code'].', giảm '.$value.'). Bạn có thể xem điều kiện và áp dụng ở bước thanh toán.':'A featured offer is “'.$featured['name'].'” (code '.$featured['code'].', '.$value.' off). View its terms and apply it at checkout.';}else{$reply=$vi?'Hiện chưa có voucher nào còn hiệu lực. Bạn có thể mở trang Ưu đãi để theo dõi chương trình mới.':'There are no active vouchers right now. Open Offers to watch for new promotions.';}
        $actions[]=array('type'=>'OPEN_OFFERS','label'=>$vi?'Xem ưu đãi':'View offers');
    } elseif ($intent === 'MEMBERSHIP') {
        $pose='thanks'; $motion='heart';
        $reply=$vi?'Thành viên Aurora được tích điểm từ đơn vé đã thanh toán, theo dõi hạng thẻ và đổi quyền lợi trong trang tài khoản.':'Aurora members earn points from paid bookings and can track tier benefits in their account.';
        $actions[]=array('type'=>'OPEN_MEMBERSHIP','label'=>$vi?'Quyền lợi thành viên':'Membership benefits');
    } elseif ($intent === 'SUPPORT') {
        $pose='advisor'; $motion='point';
        $reply=$vi?'Mình có thể giải đáp nhanh tại đây. Với giao dịch cần kiểm tra, hãy mở Trung tâm hỗ trợ để gửi yêu cầu kèm thông tin đơn vé.':'I can answer quick questions here. For transaction checks, open Support and submit your booking details.';
        $actions[]=array('type'=>'OPEN_SUPPORT','label'=>$vi?'Mở trung tâm hỗ trợ':'Open support');
    } else {
        $pose='thinking'; $motion='think';
        $reply=$vi?'Mình chưa chắc đã hiểu đúng. Bạn có thể hỏi theo kiểu “gợi ý phim hành động”, “lịch chiếu hôm nay”, “giá vé” hoặc “cách đặt ghế”.':'I may not have understood. Try “recommend an action movie”, “showtimes today”, “ticket prices” or “how to book seats”.';
    }
    return array('reply'=>$reply,'intent'=>$intent,'pose'=>$pose,'motion'=>$motion,'recommendations'=>$recommendations,'actions'=>$actions);
}

function aurora_ai_profile($db, $userId) {
    if ($userId <= 0) return null;
    $now=aurora_vietnam_now(); $result=$db->query('SELECT onboarding_status,onboarding_step,preferred_genres FROM customer_ai_profiles WHERE user_id='.(int)$userId.' LIMIT 1');
    if (!$result || !$result->num_rows) {
        // A missing profile means this customer has not seen the assistant tour yet.
        // This remains deterministic without relying on a deployment-date cutoff.
        $status='PENDING';
        $nowEsc=$db->real_escape_string($now); $db->query("INSERT INTO customer_ai_profiles(user_id,onboarding_status,onboarding_step,first_seen_at,last_seen_at,updated_at) VALUES(".(int)$userId.",'{$status}',0,'{$nowEsc}','{$nowEsc}','{$nowEsc}')");
        return array('status'=>$status,'step'=>0,'preferredGenres'=>'');
    }
    $row=$result->fetch_assoc(); $nowEsc=$db->real_escape_string($now); $db->query("UPDATE customer_ai_profiles SET last_seen_at='{$nowEsc}',updated_at='{$nowEsc}' WHERE user_id=".(int)$userId);
    return array('status'=>$row['onboarding_status'],'step'=>(int)$row['onboarding_step'],'preferredGenres'=>$row['preferred_genres']);
}

function aurora_ai_conversation($db, $userId, $language, $createIfMissing) {
    $session=$db->real_escape_string(aurora_ai_session_key()); $where=$userId>0?'user_id='.(int)$userId:"session_key='{$session}'";
    $result=$db->query("SELECT id,conversation_key FROM customer_ai_conversations WHERE {$where} AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1");
    if ($result && ($row=$result->fetch_assoc())) {
        if($userId>0)$db->query("UPDATE customer_ai_conversations SET session_key='{$session}',language='".$db->real_escape_string($language)."' WHERE id=".(int)$row['id']);
        return array('id'=>(int)$row['id'],'key'=>$row['conversation_key']);
    }
    // Preserve questions asked before login by attaching the active guest
    // conversation to the customer as soon as authentication succeeds.
    if ($userId > 0) {
        $guest=$db->query("SELECT id,conversation_key FROM customer_ai_conversations WHERE session_key='{$session}' AND user_id IS NULL AND status='ACTIVE' ORDER BY updated_at DESC LIMIT 1");
        if($guest&&($guestRow=$guest->fetch_assoc())){$id=(int)$guestRow['id'];$db->query("UPDATE customer_ai_conversations SET user_id=".(int)$userId.",language='".$db->real_escape_string($language)."' WHERE id={$id}");return array('id'=>$id,'key'=>$guestRow['conversation_key']);}
    }
    if (!$createIfMissing) return array('id'=>0,'key'=>'');
    $key='AIA'.strtoupper(substr(sha1(aurora_ai_session_key().microtime(true).mt_rand()),0,20)); $now=$db->real_escape_string(aurora_vietnam_now()); $lang=$db->real_escape_string($language);
    if(!$db->query("INSERT INTO customer_ai_conversations(conversation_key,session_key,user_id,language,status,created_at,updated_at) VALUES('".$db->real_escape_string($key)."','{$session}',".($userId>0?(int)$userId:'NULL').",'{$lang}','ACTIVE','{$now}','{$now}')"))return false;
    return array('id'=>(int)$db->insert_id,'key'=>$key);
}

function aurora_ai_log_event($db,$userId,$eventType,$stepKey,$metadata) {
    $jsonValue=aurora_ai_json_for_storage($metadata,4096);
    if($jsonValue===false)return false;
    $session=$db->real_escape_string(aurora_ai_session_key());$type=$db->real_escape_string(aurora_ai_clean_text($eventType,40));$step=$db->real_escape_string(aurora_ai_clean_text($stepKey,60));$json=$db->real_escape_string($jsonValue);$now=$db->real_escape_string(aurora_vietnam_now());
    return (bool)$db->query("INSERT INTO customer_ai_events(session_key,user_id,event_type,step_key,metadata_json,created_at) VALUES('{$session}',".($userId>0?(int)$userId:'NULL').",'{$type}','{$step}','{$json}','{$now}')");
}

function aurora_ai_message_payload($row) {
    $meta=json_decode(isset($row['metadata_json'])?(string)$row['metadata_json']:'',true);
    if(!is_array($meta))$meta=array();
    return array(
        'id'=>(int)$row['id'],
        'sender'=>$row['sender'],
        'text'=>$row['message_text'],
        'intent'=>isset($row['intent'])?$row['intent']:null,
        'pose'=>isset($meta['pose'])?$meta['pose']:'advisor',
        'motion'=>isset($meta['motion'])?$meta['motion']:'point',
        'recommendations'=>isset($meta['recommendations'])&&is_array($meta['recommendations'])?$meta['recommendations']:array(),
        'actions'=>isset($meta['actions'])&&is_array($meta['actions'])?$meta['actions']:array(),
        'clientMessageId'=>isset($row['client_message_id'])&&$row['client_message_id']!==''?$row['client_message_id']:null,
        'createdAt'=>$row['created_at']
    );
}

function aurora_ai_find_client_message($db,$conversationId,$clientMessageId,$sender) {
    if($clientMessageId==='')return null;
    $client=$db->real_escape_string($clientMessageId);$senderSafe=$db->real_escape_string($sender);
    $result=$db->query("SELECT id,sender,message_text,intent,metadata_json,client_message_id,created_at FROM customer_ai_messages WHERE conversation_id=".(int)$conversationId." AND sender='{$senderSafe}' AND client_message_id='{$client}' ORDER BY id DESC LIMIT 1");
    return $result&&($row=$result->fetch_assoc())?$row:null;
}

function aurora_ai_handle($db, $resource) {
    $assistantResources=array('ai_assistant','ai_onboarding','ai_mascot_event');
    $mascotResources=array('mascot_config','mascot_event','mascot_stats');
    if (!in_array($resource,$assistantResources,true) && !in_array($resource,$mascotResources,true)) return;
    $verifiedAdminId=0;
    if($resource==='mascot_stats'||($resource==='mascot_config'&&$_SERVER['REQUEST_METHOD']==='POST'))$verifiedAdminId=aurora_mascot_require_admin($db);
    if (!aurora_ai_ensure_schema($db)) { aurora_ai_log_db_failure('assistant schema preparation',$db); aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu trợ lý lúc này.'),500); }
    if (!aurora_mascot_ensure_schema($db)) { aurora_ai_log_db_failure('mascot schema preparation',$db); aurora_response(array('message'=>'Không thể chuẩn bị dữ liệu linh vật lúc này.'),500); }
    $userId=aurora_user_id(); $language=isset($_GET['language'])&&$_GET['language']==='en'?'en':'vi';
    if ($resource === 'mascot_config') {
        if($_SERVER['REQUEST_METHOD']==='GET')aurora_response(aurora_mascot_config_payload($db),200);
        aurora_method('POST');$adminId=$verifiedAdminId;$body=aurora_body();
        $allowed=array('body_color','accent_color','cheek_color','eye_color','scarf_color','film_color','mascot_name','mascot_slogan','idle_animation','enable_shadow','enable_particles','scale_factor','ambient_light','point_light_x','point_light_y','point_light_z');
        $colorKeys=array('body_color','accent_color','cheek_color','eye_color','scarf_color','film_color');
        $updated=array();$now=$db->real_escape_string(aurora_vietnam_now());
        foreach($allowed as $key){
            if(!array_key_exists($key,$body))continue;
            $value=aurora_ai_clean_text($body[$key],$key==='mascot_slogan'?180:80);
            if(in_array($key,$colorKeys,true)&&!preg_match('/^#[0-9A-Fa-f]{6}$/',$value))aurora_response(array('message'=>'Mã màu '.$key.' không hợp lệ.'),422);
            if(in_array($key,array('enable_shadow','enable_particles'),true))$value=($value==='1'||$value==='true')?'1':'0';
            if($key==='idle_animation'&&!in_array($value,array('float','bounce','sway'),true))aurora_response(array('message'=>'Kiểu chuyển động nghỉ không hợp lệ.'),422);
            if($key==='scale_factor')$value=(string)max(.75,min(1.35,(float)$value));
            if($key==='ambient_light')$value=(string)max(.2,min(1.2,(float)$value));
            if(in_array($key,array('point_light_x','point_light_y','point_light_z'),true))$value=(string)max(-50,min(50,(float)$value));
            if(($key==='mascot_name'||$key==='mascot_slogan')&&$value==='')aurora_response(array('message'=>'Tên và slogan linh vật không được để trống.'),422);
            $safeKey=$db->real_escape_string($key);$safeValue=$db->real_escape_string($value);
            if(!$db->query("UPDATE mascot_3d_config SET config_value='{$safeValue}',updated_by={$adminId},updated_at='{$now}' WHERE config_key='{$safeKey}'")){aurora_ai_log_db_failure('mascot config update',$db);aurora_response(array('message'=>'Không thể lưu cấu hình linh vật lúc này.'),500);}
            $updated[]=$key;
        }
        aurora_response(array('success'=>true,'updated'=>$updated,'config'=>aurora_mascot_config_payload($db),'source'=>'aurora_db'),200);
    }
    if ($resource === 'mascot_stats') {
        aurora_method('GET');
        $result=$db->query("SELECT COUNT(*) total_events_all_time,COUNT(DISTINCT COALESCE(CAST(user_id AS CHAR),CONCAT('guest:',session_key))) unique_users_all_time,SUM(CASE WHEN event_type='OPEN_CHAT' THEN 1 ELSE 0 END) total_chat_opens,SUM(CASE WHEN created_at>=DATE_SUB(NOW(),INTERVAL 7 DAY) THEN 1 ELSE 0 END) events_last_7d,SUM(CASE WHEN created_at>=DATE_SUB(NOW(),INTERVAL 1 DAY) THEN 1 ELSE 0 END) events_today FROM mascot_3d_events");
        if(!$result){aurora_ai_log_db_failure('mascot statistics query',$db);aurora_response(array('message'=>'Không thể tải thống kê linh vật lúc này.'),500);}
        $stats=$result->fetch_assoc();foreach($stats as $key=>$value)$stats[$key]=(int)$value;$stats['source']='aurora_db';aurora_response($stats,200);
    }
    if ($resource === 'mascot_event') {
        aurora_method('POST');$body=aurora_body();$eventType=isset($body['eventType'])?strtoupper(trim((string)$body['eventType'])):'';
        if(!aurora_mascot_payload_is_valid($body))aurora_response(array('message'=>'Dữ liệu sự kiện linh vật vượt quá giới hạn cho phép.'),422);
        $allowedEvents=array('CLICK','HOVER','EXPRESSION_CHANGE','POSE_CHANGE','OPEN_CHAT','CLOSE_CHAT','RUN_ACTION','OPEN_MOVIE','POSE_VIEW','IDLE_TIMEOUT');
        if(!in_array($eventType,$allowedEvents,true))aurora_response(array('message'=>'Sự kiện linh vật không hợp lệ.'),422);
        $allowedExpressions=array('happy','excited','curious','wink','love','surprised','focused','thinking','sad','announce');
        $allowedPoses=array('idle','wave','point','clap','think','heart','announce','bow','jump','spin','advisor','thinking','intro','notify','thanks');
        $expression=aurora_mascot_clean_enum(isset($body['expression'])?$body['expression']:'',$allowedExpressions,30);
        $pose=aurora_mascot_clean_enum(isset($body['pose'])?$body['pose']:'',$allowedPoses,30);
        $page=aurora_mascot_clean_context(isset($body['pageContext'])?$body['pageContext']:(isset($body['page'])?$body['page']:''),80);
        if($expression===false||$pose===false||$page===false)aurora_response(array('message'=>'Biểu cảm, tư thế hoặc ngữ cảnh trang không hợp lệ.'),422);
        if(!aurora_mascot_take_event_rate_slot()){header('Retry-After: 60');aurora_response(array('message'=>'Bạn đang gửi quá nhiều sự kiện linh vật. Vui lòng thử lại sau.'),429);}
        $body['eventType']=$eventType;$body['expression']=$expression;$body['pose']=$pose;$body['pageContext']=$page;
        if(!aurora_mascot_log_event($db,$userId,$eventType,$expression,$pose,$page,$body)){aurora_ai_log_db_failure('mascot event insert',$db);aurora_response(array('message'=>'Không thể lưu sự kiện linh vật lúc này.'),500);}
        aurora_response(array('success'=>true,'source'=>'aurora_db'),200);
    }
    if ($resource === 'ai_mascot_event') {
        aurora_method('POST'); $body=aurora_body();
        if(!aurora_mascot_payload_is_valid($body))aurora_response(array('message'=>'Dữ liệu sự kiện linh vật vượt quá giới hạn cho phép.'),422);
        $eventType=isset($body['eventType'])?strtoupper(trim((string)$body['eventType'])):'';
        $allowed=array('OPEN_CHAT','CLOSE_CHAT','RUN_ACTION','OPEN_MOVIE','POSE_VIEW');
        if(!in_array($eventType,$allowed,true))aurora_response(array('message'=>'Sự kiện linh vật không hợp lệ.'),422);
        $allowedExpressions=array('happy','excited','curious','wink','love','surprised','focused','thinking','sad','announce');
        $allowedPoses=array('idle','wave','point','clap','think','heart','announce','bow','jump','spin','advisor','thinking','intro','notify','thanks');
        $pose=aurora_mascot_clean_enum(isset($body['pose'])?$body['pose']:'',$allowedPoses,30);
        $expression=aurora_mascot_clean_enum(isset($body['expression'])?$body['expression']:'',$allowedExpressions,30);
        $trigger=aurora_mascot_clean_context(isset($body['trigger'])?$body['trigger']:'',60);
        $engine=aurora_mascot_clean_context(isset($body['engine'])?$body['engine']:'AURORA_CINEMATIC_RIG_V3',40);
        if($pose===false||$expression===false||$trigger===false||$engine===false)aurora_response(array('message'=>'Dữ liệu chuyển động linh vật không hợp lệ.'),422);
        if(!aurora_mascot_take_event_rate_slot()){header('Retry-After: 60');aurora_response(array('message'=>'Bạn đang gửi quá nhiều sự kiện linh vật. Vui lòng thử lại sau.'),429);}
        if(!aurora_ai_log_event($db,$userId,'MASCOT_'.$eventType,$pose,array('trigger'=>$trigger,'expression'=>$expression,'engine'=>$engine))){aurora_ai_log_db_failure('assistant mascot event insert',$db);aurora_response(array('message'=>'Không thể lưu sự kiện linh vật lúc này.'),500);}
        if(!aurora_mascot_log_event($db,$userId,$eventType,$expression,$pose,$trigger,array('engine'=>$engine))){aurora_ai_log_db_failure('mascot event mirror insert',$db);aurora_response(array('message'=>'Không thể lưu sự kiện linh vật lúc này.'),500);}
        aurora_response(array('ok'=>true,'source'=>'aurora_db'),200);
    }
    if ($resource === 'ai_onboarding') {
        aurora_method('POST'); $userId=aurora_require_customer($db,'Vui lòng đăng nhập để lưu tiến trình hướng dẫn.'); $body=aurora_body();
        if(!aurora_mascot_payload_is_valid($body))aurora_response(array('message'=>'Dữ liệu hướng dẫn vượt quá giới hạn cho phép.'),422);
        $operation=isset($body['operation'])?strtoupper(trim((string)$body['operation'])):'STEP';
        if(!in_array($operation,array('STEP','COMPLETE','SKIP'),true))aurora_response(array('message'=>'Thao tác hướng dẫn không hợp lệ.'),422);
        $step=isset($body['step'])?max(0,min(10,(int)$body['step'])):0;$stepKey=aurora_mascot_clean_context(isset($body['stepKey'])?$body['stepKey']:'',60);
        if($stepKey===false)aurora_response(array('message'=>'Mã bước hướng dẫn không hợp lệ.'),422);
        $profile=aurora_ai_profile($db,$userId); $now=$db->real_escape_string(aurora_vietnam_now());
        if($operation==='COMPLETE'||$operation==='SKIP'){$status=$operation==='COMPLETE'?'COMPLETED':'SKIPPED';$saved=$db->query("UPDATE customer_ai_profiles SET onboarding_status='{$status}',onboarding_step={$step},onboarding_completed_at='{$now}',updated_at='{$now}' WHERE user_id=".(int)$userId);}else{$saved=$db->query("UPDATE customer_ai_profiles SET onboarding_step={$step},updated_at='{$now}' WHERE user_id=".(int)$userId);}
        if(!$saved||!aurora_ai_log_event($db,$userId,'ONBOARDING_'.$operation,$stepKey,array('step'=>$step))){aurora_ai_log_db_failure('assistant onboarding update',$db);aurora_response(array('message'=>'Không thể lưu tiến trình hướng dẫn lúc này.'),500);}
        aurora_response(array('ok'=>true,'status'=>isset($status)?$status:$profile['status'],'step'=>$step),200);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') aurora_response(array('message'=>'Method Not Allowed'),405);
    $profile=aurora_ai_profile($db,$userId); $conversation=aurora_ai_conversation($db,$userId,$language,$_SERVER['REQUEST_METHOD']==='POST');
    if(!is_array($conversation)||($_SERVER['REQUEST_METHOD']==='POST'&&empty($conversation['id']))){aurora_ai_log_db_failure('assistant conversation preparation',$db);aurora_response(array('message'=>'Không thể chuẩn bị cuộc hội thoại lúc này.'),500);}
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $messages=array();$rows=null;if((int)$conversation['id']>0)$rows=$db->query('SELECT id,sender,message_text,intent,metadata_json,client_message_id,created_at FROM customer_ai_messages WHERE conversation_id='.(int)$conversation['id'].' ORDER BY id DESC LIMIT 30');
        if((int)$conversation['id']>0&&!$rows){aurora_ai_log_db_failure('assistant history query',$db);aurora_response(array('message'=>'Không thể tải lịch sử trợ lý lúc này.'),500);}
        if($rows)while($row=$rows->fetch_assoc())$messages[]=aurora_ai_message_payload($row);
        $messages=array_reverse($messages);
        aurora_response(array('conversationKey'=>$conversation['key'],'messages'=>$messages,'onboardingRequired'=>$profile!==null&&$profile['status']==='PENDING','onboardingStep'=>$profile!==null?(int)$profile['step']:0,'suggestions'=>$language==='en'?array('Recommend a movie','Showtimes today','Ticket prices','Member offers'):array('Tư vấn phim phù hợp','Lịch chiếu hôm nay','Giá vé hiện tại','Ưu đãi thành viên'),'source'=>'aurora_db'),200);
    }
    $body=aurora_body(); if(isset($body['language'])&&$body['language']==='en')$language='en'; $message=isset($body['message'])?aurora_ai_clean_text($body['message'],600):'';
    if($message==='')aurora_response(array('message'=>'Vui lòng nhập câu hỏi.'),422);
    $clientMessageId='';
    if(isset($body['clientMessageId'])&&trim((string)$body['clientMessageId'])!==''){
        $clientMessageId=trim((string)$body['clientMessageId']);
        if(aurora_ai_text_length($clientMessageId)>80||!preg_match('/^[A-Za-z0-9][A-Za-z0-9._:\-]{0,79}$/',$clientMessageId))aurora_response(array('message'=>'clientMessageId không hợp lệ.'),422);
    }
    if($clientMessageId!==''){
        $existingUserMessage=aurora_ai_find_client_message($db,$conversation['id'],$clientMessageId,'USER');
        if($existingUserMessage&&$existingUserMessage['message_text']!==$message)aurora_response(array('message'=>'clientMessageId đã được dùng cho một nội dung khác.'),409);
        $existingAssistantMessage=aurora_ai_find_client_message($db,$conversation['id'],$clientMessageId,'ASSISTANT');
        if($existingAssistantMessage)aurora_response(array('conversationKey'=>$conversation['key'],'message'=>aurora_ai_message_payload($existingAssistantMessage),'source'=>'aurora_db','idempotent'=>true),200);
        if($existingUserMessage)aurora_response(array('message'=>'Yêu cầu với clientMessageId này đang được xử lý. Vui lòng thử lại.'),409);
    }
    $hourAgo=$db->real_escape_string(date('Y-m-d H:i:s',strtotime(aurora_vietnam_now())-3600));
    $rate=$db->query('SELECT COUNT(*) total FROM customer_ai_messages WHERE conversation_id='.(int)$conversation['id']." AND sender='USER' AND created_at>='{$hourAgo}'");
    if(!$rate){aurora_ai_log_db_failure('assistant rate-limit query',$db);aurora_response(array('message'=>'Không thể xử lý câu hỏi lúc này.'),500);}
    $rateRow=$rate->fetch_assoc();if($rateRow&&(int)$rateRow['total']>=40)aurora_response(array('message'=>'Bạn đã gửi nhiều câu hỏi. Vui lòng thử lại sau ít phút.'),429);

    $answer=aurora_ai_reply($db,$message,$language,$userId);
    $metadataValue=aurora_ai_json_for_storage(array('pose'=>$answer['pose'],'motion'=>$answer['motion'],'recommendations'=>$answer['recommendations'],'actions'=>$answer['actions']),60000);
    if($metadataValue===false)aurora_response(array('message'=>'Không thể chuẩn bị phản hồi trợ lý lúc này.'),500);
    $nowValue=aurora_vietnam_now();$now=$db->real_escape_string($nowValue);$text=$db->real_escape_string($message);
    $reply=$db->real_escape_string(aurora_ai_clean_text($answer['reply'],2000));$intent=$db->real_escape_string($answer['intent']);$metadata=$db->real_escape_string($metadataValue);$languageSafe=$db->real_escape_string($language);
    $clientSql=$clientMessageId!==''?"'".$db->real_escape_string($clientMessageId)."'":'NULL';
    if(!$db->autocommit(false)){aurora_ai_log_db_failure('assistant transaction start',$db);aurora_response(array('message'=>'Không thể lưu cuộc hội thoại lúc này.'),500);}
    try {
        if(!$db->query("INSERT INTO customer_ai_messages(conversation_id,client_message_id,sender,message_text,created_at) VALUES(".(int)$conversation['id'].",{$clientSql},'USER','{$text}','{$now}')"))throw new Exception('USER_MESSAGE_INSERT_FAILED');
        if(!$db->query("INSERT INTO customer_ai_messages(conversation_id,client_message_id,sender,message_text,intent,metadata_json,created_at) VALUES(".(int)$conversation['id'].",{$clientSql},'ASSISTANT','{$reply}','{$intent}','{$metadata}','{$now}')"))throw new Exception('ASSISTANT_MESSAGE_INSERT_FAILED');
        $messageId=(int)$db->insert_id;
        if(!$db->query("UPDATE customer_ai_conversations SET language='{$languageSafe}',updated_at='{$now}',last_message_at='{$now}' WHERE id=".(int)$conversation['id']))throw new Exception('CONVERSATION_UPDATE_FAILED');
        if(!$db->commit())throw new Exception('CONVERSATION_COMMIT_FAILED');
        $db->autocommit(true);
    } catch (Exception $exception) {
        aurora_ai_log_db_failure('assistant conversation transaction',$db);
        $db->rollback();$db->autocommit(true);
        if($clientMessageId!==''){
            $existingAssistantMessage=aurora_ai_find_client_message($db,$conversation['id'],$clientMessageId,'ASSISTANT');
            if($existingAssistantMessage)aurora_response(array('conversationKey'=>$conversation['key'],'message'=>aurora_ai_message_payload($existingAssistantMessage),'source'=>'aurora_db','idempotent'=>true),200);
        }
        aurora_response(array('message'=>'Không thể lưu cuộc hội thoại lúc này.'),500);
    }
    $messageRow=array('id'=>$messageId,'sender'=>'ASSISTANT','message_text'=>$answer['reply'],'intent'=>$answer['intent'],'metadata_json'=>$metadataValue,'client_message_id'=>$clientMessageId,'created_at'=>$nowValue);
    aurora_response(array('conversationKey'=>$conversation['key'],'message'=>aurora_ai_message_payload($messageRow),'source'=>'aurora_db','idempotent'=>false),200);
}
