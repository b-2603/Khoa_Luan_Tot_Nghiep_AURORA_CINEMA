<?php
// seed_screens_and_seats.php
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(300);

$db = new mysqli('127.0.0.1', 'root', '', 'aurora_db');
if ($db->connect_error) {
    die("Connect error: " . $db->connect_error);
}
$db->set_charset('utf8');

echo "Starting cinema screens and seats migration...\n";

// Disable foreign keys temporarily
$db->query("SET FOREIGN_KEY_CHECKS = 0");

// 1. Definition of 7 theaters and their 7 to 10 screens
// Theater IDs:
// 1: Aurora Q1 (10 screens)
// 2: Aurora Q7 (8 screens)
// 3: Aurora Landmark 81 (10 screens)
// 4: Aurora Thủ Đức (8 screens)
// 5: Aurora Tân Bình (7 screens)
// 6: Aurora Hà Nội (9 screens)
// 7: Aurora Đà Nẵng (8 screens)

$theaterScreens = array(
    1 => array( // Aurora Q1 - 10 phòng
        array('name' => 'Phòng 01 - Laser IMAX Grand', 'rows' => 12, 'cols' => 18, 'couple_cols' => 8), // 11x18 + 8 couple = 206
        array('name' => 'Phòng 02 - Dolby Atmos 3D', 'rows' => 10, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 03 - VIP Starium Sofa', 'rows' => 5, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 04 - 4DX Dynamic Motion', 'rows' => 8, 'cols' => 12, 'couple_cols' => 6),
        array('name' => 'Phòng 05 - ScreenX 270 độ Panorama', 'rows' => 9, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 06 - Tiêu chuẩn Digital 1', 'rows' => 8, 'cols' => 12, 'couple_cols' => 6),
        array('name' => 'Phòng 07 - Tiêu chuẩn Digital 2', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 08 - Cine & Forêt Eco', 'rows' => 6, 'cols' => 10, 'couple_cols' => 4),
        array('name' => 'Phòng 09 - Cine Suite President VIP', 'rows' => 4, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 10 - Digital Premium Studio', 'rows' => 9, 'cols' => 12, 'couple_cols' => 6),
    ),
    2 => array( // Aurora Q7 - 8 phòng
        array('name' => 'Phòng 01 - Dolby Atmos 4K Master', 'rows' => 10, 'cols' => 16, 'couple_cols' => 6),
        array('name' => 'Phòng 02 - 4DX Ultimate Experience', 'rows' => 8, 'cols' => 12, 'couple_cols' => 6),
        array('name' => 'Phòng 03 - VIP Gold Class Lounge', 'rows' => 5, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 04 - Tiêu chuẩn Digital 1', 'rows' => 8, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 05 - Tiêu chuẩn Digital 2', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 06 - Cine Suite VIP', 'rows' => 4, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 07 - 3D Digital Surround', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 08 - Standard Hall Digital', 'rows' => 7, 'cols' => 10, 'couple_cols' => 4),
    ),
    3 => array( // Aurora Landmark 81 - 10 phòng
        array('name' => 'Phòng 01 - IMAX 3D Laser Grand Mega', 'rows' => 13, 'cols' => 18, 'couple_cols' => 8),
        array('name' => 'Phòng 02 - Dolby Atmos Premium Cinema', 'rows' => 11, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 03 - VIP Starium Luxury Suite', 'rows' => 6, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 04 - ScreenX 270 độ Ultra', 'rows' => 9, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 05 - Tiêu chuẩn Digital 1', 'rows' => 8, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 06 - Tiêu chuẩn Digital 2', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 07 - Cine & Suite VIP', 'rows' => 4, 'cols' => 10, 'couple_cols' => 4),
        array('name' => 'Phòng 08 - 4DX Dynamic Extreme', 'rows' => 8, 'cols' => 12, 'couple_cols' => 6),
        array('name' => 'Phòng 09 - Cine & Forêt Relax', 'rows' => 6, 'cols' => 10, 'couple_cols' => 4),
        array('name' => 'Phòng 10 - Standard Hall Cine', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
    ),
    4 => array( // Aurora Thủ Đức - 8 phòng
        array('name' => 'Phòng 01 - Dolby Atmos 4K Ultra', 'rows' => 10, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 02 - 3D Digital Surround Pro', 'rows' => 8, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 03 - VIP Gold Class Premium', 'rows' => 5, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 04 - Tiêu chuẩn Digital 1', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 05 - Tiêu chuẩn Digital 2', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 06 - 4DX Experience Motion', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 07 - Cine Suite VIP', 'rows' => 4, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 08 - Standard Cinema Hall', 'rows' => 6, 'cols' => 12, 'couple_cols' => 4),
    ),
    5 => array( // Aurora Tân Bình - 7 phòng
        array('name' => 'Phòng 01 - Dolby Atmos Surround Sound', 'rows' => 9, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 02 - 3D Digital Theatre', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 03 - VIP Starium Sofa Cinema', 'rows' => 5, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 04 - Tiêu chuẩn Digital 1', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 05 - Tiêu chuẩn Digital 2', 'rows' => 7, 'cols' => 10, 'couple_cols' => 4),
        array('name' => 'Phòng 06 - Cine Suite VIP', 'rows' => 4, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 07 - Standard Digital Hall', 'rows' => 6, 'cols' => 10, 'couple_cols' => 4),
    ),
    6 => array( // Aurora Hà Nội - 9 phòng
        array('name' => 'Phòng 01 - IMAX Laser Ultimate 3D', 'rows' => 12, 'cols' => 16, 'couple_cols' => 8),
        array('name' => 'Phòng 02 - Dolby Atmos 4K Studio', 'rows' => 10, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 03 - VIP Gold Class Deluxe', 'rows' => 5, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 04 - Tiêu chuẩn Digital 1', 'rows' => 8, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 05 - Tiêu chuẩn Digital 2', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 06 - ScreenX 270 độ Cinema', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 07 - 4DX Dynamic Master', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 08 - Cine Suite VIP Luxury', 'rows' => 4, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 09 - Standard Cinema Hall', 'rows' => 7, 'cols' => 10, 'couple_cols' => 4),
    ),
    7 => array( // Aurora Đà Nẵng - 8 phòng
        array('name' => 'Phòng 01 - Dolby Atmos 4K Seaside', 'rows' => 10, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 02 - VIP Starium Sofa Deluxe', 'rows' => 5, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 03 - 3D Digital Panorama', 'rows' => 8, 'cols' => 14, 'couple_cols' => 6),
        array('name' => 'Phòng 04 - Tiêu chuẩn Digital 1', 'rows' => 8, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 05 - Tiêu chuẩn Digital 2', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 06 - 4DX Dynamic Experience', 'rows' => 7, 'cols' => 12, 'couple_cols' => 4),
        array('name' => 'Phòng 07 - Cine Suite VIP', 'rows' => 4, 'cols' => 8, 'couple_cols' => 4),
        array('name' => 'Phòng 08 - Standard Cinema Hall', 'rows' => 6, 'cols' => 10, 'couple_cols' => 4),
    ),
);

// Clear existing tables
$db->query("TRUNCATE TABLE `booking_seats`");
$db->query("TRUNCATE TABLE `bookings`");
$db->query("TRUNCATE TABLE `seats`");
$db->query("TRUNCATE TABLE `showtimes`");
$db->query("TRUNCATE TABLE `screens`");

$rowLetters = array('A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R');

$screenIdCounter = 1;
$totalSeatsCount = 0;
$screenIdMap = array();

// Insert screens and their seats
foreach ($theaterScreens as $theaterId => $screens) {
    foreach ($screens as $s) {
        $screenName = $db->real_escape_string($s['name']);
        $numRows = $s['rows'];
        $cols = $s['cols'];
        $coupleCols = isset($s['couple_cols']) ? $s['couple_cols'] : 4;

        // Calculate seats
        $roomSeats = array();
        for ($r = 0; $r < $numRows; $r++) {
            $rowLetter = $rowLetters[$r];
            $isLastRow = ($r === $numRows - 1);

            if ($isLastRow) {
                // COUPLE seats row
                for ($c = 1; $c <= $coupleCols; $c++) {
                    $roomSeats[] = array(
                        'row' => $rowLetter,
                        'num' => $c,
                        'type' => 'COUPLE'
                    );
                }
            } else {
                // Standard or VIP
                // First 2-3 rows are STANDARD
                // Rows 3 to numRows-2 are VIP
                $type = ($r < 3) ? 'STANDARD' : 'VIP';
                for ($c = 1; $c <= $cols; $c++) {
                    $roomSeats[] = array(
                        'row' => $rowLetter,
                        'num' => $c,
                        'type' => $type
                    );
                }
            }
        }

        $totalRoomSeats = count($roomSeats);

        // Insert screen
        $sqlScreen = "INSERT INTO `screens` (`id`, `theater_id`, `name`, `total_seats`) VALUES ($screenIdCounter, $theaterId, '$screenName', $totalRoomSeats)";
        if (!$db->query($sqlScreen)) {
            die("Error inserting screen: " . $db->error);
        }

        // Insert seats in batches of 50
        $seatChunks = array_chunk($roomSeats, 50);
        foreach ($seatChunks as $chunk) {
            $valParts = array();
            foreach ($chunk as $st) {
                $rLet = $st['row'];
                $nNum = (int)$st['num'];
                $sType = $st['type'];
                $valParts[] = "($screenIdCounter, '$rLet', $nNum, '$sType')";
            }
            $sqlSeats = "INSERT INTO `seats` (`screen_id`, `seat_row`, `seat_number`, `seat_type`) VALUES " . implode(',', $valParts);
            if (!$db->query($sqlSeats)) {
                die("Error inserting seats: " . $db->error);
            }
        }

        $totalSeatsCount += $totalRoomSeats;
        $screenIdMap[] = array('id' => $screenIdCounter, 'theater_id' => $theaterId, 'name' => $screenName);
        $screenIdCounter++;
    }
}

echo "Created " . ($screenIdCounter - 1) . " screens with $totalSeatsCount total seats in database!\n";

// 2. Generate Showtimes for all movies across the screens
// Get all movie IDs
$resMovies = $db->query("SELECT id, title, duration_minutes FROM movies WHERE status != 'COMING_SOON' LIMIT 15");
$movies = array();
while ($m = $resMovies->fetch_assoc()) {
    $movies[] = $m;
}

if (count($movies) === 0) {
    // Fallback if no movies
    $resMovies = $db->query("SELECT id, title, duration_minutes FROM movies LIMIT 15");
    while ($m = $resMovies->fetch_assoc()) {
        $movies[] = $m;
    }
}

$timeSlots = array('09:00', '11:45', '14:30', '16:22', '17:15', '19:45', '21:30');
$dates = array();
$baseDate = date('Y-m-d');
for ($d = 0; $d < 7; $d++) {
    $dates[] = date('Y-m-d', strtotime("+$d days"));
}

$showtimeValues = array();
$showtimeCount = 0;

// Distribute showtimes across all 60 screens
foreach ($screenIdMap as $scIdx => $sc) {
    $screenId = $sc['id'];
    
    // Assign 2 movies per screen per day
    foreach ($dates as $dayIdx => $dateStr) {
        $assignedMovie1 = $movies[($scIdx + $dayIdx) % count($movies)];
        $assignedMovie2 = $movies[($scIdx + $dayIdx + 3) % count($movies)];

        $slotsForToday = array('09:30', '13:15', '16:22', '19:30');
        foreach ($slotsForToday as $slotIdx => $slotTime) {
            $m = ($slotIdx % 2 === 0) ? $assignedMovie1 : $assignedMovie2;
            $startsAt = "$dateStr $slotTime:00";
            $dur = (int)$m['duration_minutes'];
            if ($dur < 60) $dur = 110;
            $endsAt = date('Y-m-d H:i:s', strtotime("$startsAt + $dur minutes"));
            
            // Base price based on screen type
            $price = 110000;
            if (strpos($sc['name'], 'IMAX') !== false) $price = 145000;
            else if (strpos($sc['name'], 'Dolby Atmos') !== false) $price = 130000;
            else if (strpos($sc['name'], 'VIP') !== false || strpos($sc['name'], 'Suite') !== false) $price = 150000;
            else if (strpos($sc['name'], '4DX') !== false) $price = 140000;
            else if (strpos($sc['name'], 'ScreenX') !== false) $price = 135000;
            else $price = 105000;

            $mId = (int)$m['id'];
            $showtimeValues[] = "($mId, $screenId, '$startsAt', '$endsAt', $price, 'OPEN')";
            $showtimeCount++;

            if (count($showtimeValues) >= 100) {
                $sqlSt = "INSERT INTO `showtimes` (`movie_id`, `screen_id`, `starts_at`, `ends_at`, `ticket_price`, `status`) VALUES " . implode(',', $showtimeValues);
                if (!$db->query($sqlSt)) {
                    die("Error inserting showtimes: " . $db->error);
                }
                $showtimeValues = array();
            }
        }
    }
}

if (count($showtimeValues) > 0) {
    $sqlSt = "INSERT INTO `showtimes` (`movie_id`, `screen_id`, `starts_at`, `ends_at`, `ticket_price`, `status`) VALUES " . implode(',', $showtimeValues);
    $db->query($sqlSt);
}

// Re-enable foreign keys
$db->query("SET FOREIGN_KEY_CHECKS = 1");

echo "Inserted $showtimeCount showtimes successfully!\n";
echo "MIGRATION COMPLETE!\n";
