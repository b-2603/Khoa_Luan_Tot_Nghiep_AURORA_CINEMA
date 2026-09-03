<?php

header('Content-Type: application/json; charset=utf-8');

$host = '127.0.0.1';
$port = 3306;
$username = 'root';
$password = '';

$moviesData = array(
    // ========================================================
    // 1. PHIM ĐANG CHIẾU (NOW_SHOWING)
    // ========================================================
    array(
        'id' => 1,
        'title' => 'Avatar: Dòng Chảy Của Nước',
        'description' => 'Hành trình vượt biển sâu bảo vệ gia đình Sully trước hiểm họa sinh tồn tàn khốc của người Trái Đất.',
        'duration_minutes' => 192,
        'age_rating' => 'T13',
        'format' => '3D IMAX / HFR 48fps',
        'poster_url' => 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=d9MyW72ELq0',
        'status' => 'NOW_SHOWING',
        'release_date' => '2026-05-15'
    ),
    array(
        'id' => 2,
        'title' => 'Dune: Hành Tinh Cát - Phần Hai',
        'description' => 'Paul Atreides trỗi dậy trên sa mạc Arrakis, lãnh đạo người Fremen chống lại ách thống trị tàn bạo.',
        'duration_minutes' => 166,
        'age_rating' => 'T16',
        'format' => 'Dolby Atmos 4K / IMAX',
        'poster_url' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=Way9Dexny3w',
        'status' => 'NOW_SHOWING',
        'release_date' => '2026-06-01'
    ),
    array(
        'id' => 3,
        'title' => 'Oppenheimer',
        'description' => 'Bộ phim tiểu sử lịch sử mãn nhãn về J. Robert Oppenheimer và dự án Manhattan chế tạo bom nguyên tử.',
        'duration_minutes' => 180,
        'age_rating' => 'T18',
        'format' => '2D IMAX 70mm',
        'poster_url' => 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=uYPbbksJxIg',
        'status' => 'NOW_SHOWING',
        'release_date' => '2026-06-10'
    ),
    array(
        'id' => 4,
        'title' => 'Mai (Trấn Thành Film)',
        'description' => 'Câu chuyện cảm động sâu sắc về tình yêu, sự hy sinh và những vết thương quá khứ của người phụ nữ.',
        'duration_minutes' => 131,
        'age_rating' => 'T18',
        'format' => '2D Digital',
        'poster_url' => 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=mai_trailer',
        'status' => 'NOW_SHOWING',
        'release_date' => '2026-06-15'
    ),
    array(
        'id' => 5,
        'title' => 'Godzilla x Kong: Đế Chế Mới',
        'description' => 'Hai quái thú huyền thoại bắt tay đối đầu với Skar King và mối hiểm họa hủy diệt Trái Đất Rỗng.',
        'duration_minutes' => 115,
        'age_rating' => 'T13',
        'format' => '3D / 4DX Dynamic',
        'poster_url' => 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=godzilla',
        'status' => 'NOW_SHOWING',
        'release_date' => '2026-06-20'
    ),
    array(
        'id' => 6,
        'title' => 'Quý Tử Vượt Giàu',
        'description' => 'Hài kịch gia đình ấm áp kể về chàng công tử học cách tự lập và tìm lại giá trị thực của cuộc sống.',
        'duration_minutes' => 110,
        'age_rating' => 'T13',
        'format' => '2D Digital',
        'poster_url' => 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=quytu',
        'status' => 'NOW_SHOWING',
        'release_date' => '2026-06-25'
    ),

    // ========================================================
    // 2. PHIM SẮP CHIẾU (COMING_SOON)
    // ========================================================
    array(
        'id' => 7,
        'title' => 'Deadpool & Wolverine',
        'description' => 'Bộ đôi siêu anh hùng lầy lội tái xuất trong hành trình giải cứu đa vũ trụ Marvel đầy tiếng cười và bạo lực.',
        'duration_minutes' => 128,
        'age_rating' => 'T18',
        'format' => 'IMAX 3D / 2D Digital',
        'poster_url' => 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=deadpool',
        'status' => 'COMING_SOON',
        'release_date' => '2026-08-15'
    ),
    array(
        'id' => 8,
        'title' => 'Inside Out 2 (Những Mảnh Ghép Cảm Xúc 2)',
        'description' => 'Tuổi dậy thì của Riley đón chào Cảm Xúc Lo Âu và nhóm bạn mới, khuấy đảo Tổng Hành Dinh tâm trí.',
        'duration_minutes' => 96,
        'age_rating' => 'P',
        'format' => '2D Lồng tiếng / Phụ đề 3D',
        'poster_url' => 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=insideout2',
        'status' => 'COMING_SOON',
        'release_date' => '2026-08-20'
    ),
    array(
        'id' => 9,
        'title' => 'Joker: Folie à Deux (Điên Có Đôi)',
        'description' => 'Arthur Fleck hội ngộ Harley Quinn trong bức tranh tâm lý nhạc kịch đen tối đầy ám ảnh tại Arkham.',
        'duration_minutes' => 138,
        'age_rating' => 'T18',
        'format' => 'IMAX 70mm / Dolby Atmos',
        'poster_url' => 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=joker2',
        'status' => 'COMING_SOON',
        'release_date' => '2026-09-02'
    ),
    array(
        'id' => 10,
        'title' => 'Kraven: Thợ Săn Thủ Lĩnh',
        'description' => 'Nguồn gốc của một trong những phản diện nguy hiểm bậc nhất Spider-Man với bản năng săn mồi siêu đẳng.',
        'duration_minutes' => 125,
        'age_rating' => 'T18',
        'format' => '2D Digital / 4DX',
        'poster_url' => 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=kraven',
        'status' => 'COMING_SOON',
        'release_date' => '2026-09-15'
    ),
    array(
        'id' => 11,
        'title' => 'Venom: Kèo Cuối (The Last Dance)',
        'description' => 'Eddie Brock và Venom đối mặt với cuộc truy đuổi của cả hai thế giới trong chương cuối cùng của cuộc đời.',
        'duration_minutes' => 118,
        'age_rating' => 'T16',
        'format' => 'IMAX 3D / 2D Digital',
        'poster_url' => 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=venom3',
        'status' => 'COMING_SOON',
        'release_date' => '2026-10-05'
    ),
    array(
        'id' => 12,
        'title' => 'Moana 2 (Hành Trình Của Moana 2)',
        'description' => 'Moana và Maui tái hợp trong chuyến hải trình vượt ngàn trùng dương đến những vùng biển xa xôi chưa ai đặt chân tới.',
        'duration_minutes' => 100,
        'age_rating' => 'P',
        'format' => '2D Lồng tiếng / 3D',
        'poster_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=moana2',
        'status' => 'COMING_SOON',
        'release_date' => '2026-11-20'
    ),

    // ========================================================
    // 3. SUẤT CHIẾU ĐẶC BIỆT (SPECIAL_SHOWING)
    // ========================================================
    array(
        'id' => 13,
        'title' => 'Kung Fu Panda 4 (Suất Chiếu Sớm)',
        'description' => 'Suất chiếu sớm độc quyền cuối tuần dành riêng cho khán giả nhí và gia đình trước ngày công chiếu chính thức.',
        'duration_minutes' => 94,
        'age_rating' => 'P',
        'format' => '2D Lồng tiếng / 3D',
        'poster_url' => 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=panda4',
        'status' => 'SPECIAL_SHOWING',
        'release_date' => '2026-06-30'
    ),
    array(
        'id' => 14,
        'title' => 'Lật Mặt 7: Một Điều Ước (Sneak Show)',
        'description' => 'Suất chiếu đặc biệt Sneak Show xúc động với phần giao lưu trực tiếp cùng đạo diễn Lý Hải và dàn diễn viên.',
        'duration_minutes' => 138,
        'age_rating' => 'K',
        'format' => '2D Digital VIP',
        'poster_url' => 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=latmat7',
        'status' => 'SPECIAL_SHOWING',
        'release_date' => '2026-07-02'
    ),
    array(
        'id' => 15,
        'title' => 'Chiikawa: Bí Mật Đảo Nước (Fan Screening)',
        'description' => 'Suất chiếu đặc biệt kèm quà tặng độc quyền mô hình Chiikawa giới hạn chỉ có tại Aurora Cinema.',
        'duration_minutes' => 85,
        'age_rating' => 'K',
        'format' => '2D Digital Lồng tiếng',
        'poster_url' => 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=chiikawa',
        'status' => 'SPECIAL_SHOWING',
        'release_date' => '2026-07-08'
    ),
    array(
        'id' => 16,
        'title' => 'Quái Vật 4DX Huyền Thoại (Midnight Show)',
        'description' => 'Suất chiếu lúc nửa đêm trải nghiệm trọn vẹn sức mạnh rung chấn 4DX Dynamic và âm thanh vòm Dolby.',
        'duration_minutes' => 105,
        'age_rating' => '4DX',
        'format' => '4DX 3D Dynamic',
        'poster_url' => 'https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=quai_vat_4dx',
        'status' => 'SPECIAL_SHOWING',
        'release_date' => '2026-07-14'
    ),
    array(
        'id' => 17,
        'title' => 'Interstellar: Hố Tử Thần (Kỷ Niệm 10 Năm)',
        'description' => 'Siêu phẩm khoa học viễn tưởng của Christopher Nolan tái xuất trên màn chiếu Laser IMAX khổng lồ.',
        'duration_minutes' => 169,
        'age_rating' => 'T13',
        'format' => 'IMAX Laser 70mm',
        'poster_url' => 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=interstellar',
        'status' => 'SPECIAL_SHOWING',
        'release_date' => '2026-07-20'
    ),
    array(
        'id' => 18,
        'title' => 'Titanic Remastered 4K 3D (Suất Chiếu VIP)',
        'description' => 'Bản phục chế 4K 3D đỉnh cao của kiệt tác Titanic trên ghế Sofa VIP Starium phục vụ rượu vang và bắp cao cấp.',
        'duration_minutes' => 195,
        'age_rating' => 'T16',
        'format' => 'VIP 3D HFR 4K',
        'poster_url' => 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&auto=format&fit=crop&q=80',
        'trailer_url' => 'https://www.youtube.com/watch?v=titanic',
        'status' => 'SPECIAL_SHOWING',
        'release_date' => '2026-07-25'
    )
);

try {
    $conn = @mysqli_connect($host, $username, $password, '', $port);
    if (!$conn) {
        throw new Exception('Không thể kết nối MySQL: ' . mysqli_connect_error());
    }

    mysqli_query($conn, "SET NAMES utf8");

    // 1. Cập nhật aurora_db
    mysqli_query($conn, "CREATE DATABASE IF NOT EXISTS `aurora_db` CHARACTER SET utf8 COLLATE utf8_unicode_ci");
    mysqli_select_db($conn, 'aurora_db');

    mysqli_query($conn, "
        CREATE TABLE IF NOT EXISTS `movies` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `title` VARCHAR(180) NOT NULL,
            `description` TEXT NULL,
            `duration_minutes` SMALLINT UNSIGNED NOT NULL,
            `age_rating` VARCHAR(10) NOT NULL DEFAULT 'P',
            `format` VARCHAR(50) NOT NULL DEFAULT '2D Digital',
            `poster_url` VARCHAR(500) NULL,
            `trailer_url` VARCHAR(500) NULL,
            `status` VARCHAR(40) NOT NULL DEFAULT 'NOW_SHOWING',
            `release_date` DATE NULL,
            `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
    ");

    // Chuyển toàn bộ bảng sang utf8_unicode_ci chuẩn tiếng Việt
    @mysqli_query($conn, "ALTER TABLE `movies` CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci");
    @mysqli_query($conn, "ALTER TABLE `movies` MODIFY COLUMN `title` VARCHAR(180) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL");
    @mysqli_query($conn, "ALTER TABLE `movies` MODIFY COLUMN `description` TEXT CHARACTER SET utf8 COLLATE utf8_unicode_ci NULL");
    @mysqli_query($conn, "ALTER TABLE `movies` MODIFY COLUMN `format` VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '2D Digital'");
    @mysqli_query($conn, "ALTER TABLE `movies` MODIFY COLUMN `status` VARCHAR(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT 'NOW_SHOWING'");
    @mysqli_query($conn, "TRUNCATE TABLE `movies`");

    $countAuroraDb = 0;
    foreach ($moviesData as $m) {
        $cleanTitle = mysqli_real_escape_string($conn, $m['title']);
        $cleanDesc = mysqli_real_escape_string($conn, $m['description']);
        $cleanFormat = mysqli_real_escape_string($conn, $m['format']);
        $cleanPoster = mysqli_real_escape_string($conn, $m['poster_url']);
        $cleanTrailer = mysqli_real_escape_string($conn, $m['trailer_url']);

        $sql = "
            INSERT INTO `movies` (`id`, `title`, `description`, `duration_minutes`, `age_rating`, `format`, `poster_url`, `trailer_url`, `status`, `release_date`)
            VALUES ({$m['id']}, '{$cleanTitle}', '{$cleanDesc}', {$m['duration_minutes']}, '{$m['age_rating']}', '{$cleanFormat}', '{$cleanPoster}', '{$cleanTrailer}', '{$m['status']}', '{$m['release_date']}');
        ";
        if (mysqli_query($conn, $sql)) {
            $countAuroraDb++;
        }
    }

    // 2. Cập nhật aurora_tms
    mysqli_query($conn, "CREATE DATABASE IF NOT EXISTS `aurora_tms` CHARACTER SET utf8 COLLATE utf8_unicode_ci");
    mysqli_select_db($conn, 'aurora_tms');

    @mysqli_query($conn, "ALTER TABLE `tms_movies` CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci");
    @mysqli_query($conn, "ALTER TABLE `tms_movies` MODIFY COLUMN `title` VARCHAR(200) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL");
    @mysqli_query($conn, "ALTER TABLE `tms_movies` MODIFY COLUMN `format` VARCHAR(50) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT '2D Digital / 3D'");
    @mysqli_query($conn, "ALTER TABLE `tms_movies` MODIFY COLUMN `status` VARCHAR(40) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL DEFAULT 'now_showing'");
    @mysqli_query($conn, "TRUNCATE TABLE `tms_movies`");

    $countAuroraTms = 0;
    foreach ($moviesData as $m) {
        $cleanTitle = mysqli_real_escape_string($conn, $m['title']);
        $cleanFormat = mysqli_real_escape_string($conn, $m['format']);
        $tmsStatus = strtolower($m['status']);

        $sql = "
            INSERT INTO `tms_movies` (`id`, `title`, `duration_minutes`, `age_rating`, `format`, `status`)
            VALUES ({$m['id']}, '{$cleanTitle}', {$m['duration_minutes']}, '{$m['age_rating']}', '{$cleanFormat}', '{$tmsStatus}')
            ON DUPLICATE KEY UPDATE 
                `title` = VALUES(`title`),
                `duration_minutes` = VALUES(`duration_minutes`),
                `age_rating` = VALUES(`age_rating`),
                `format` = VALUES(`format`),
                `status` = VALUES(`status`);
        ";
        if (mysqli_query($conn, $sql)) {
            $countAuroraTms++;
        }
    }

    $summaryList = array();
    foreach ($moviesData as $item) {
        $summaryList[] = array(
            'id' => $item['id'],
            'title' => $item['title'],
            'age_rating' => $item['age_rating'],
            'format' => $item['format'],
            'status' => $item['status']
        );
    }

    echo json_encode(array(
        'success' => true,
        'message' => 'Đã ghi thành công 18 phim phân loại thành 3 mục vào MySQL Database!',
        'total' => count($moviesData),
        'by_category' => array(
            'phim_dang_chieu_now_showing' => 6,
            'phim_sap_chieu_coming_soon' => 6,
            'suat_chieu_dac_biet_special_showing' => 6
        ),
        'movies' => $summaryList
    ));

} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'message' => 'Lỗi: ' . $e->getMessage()
    ));
}
