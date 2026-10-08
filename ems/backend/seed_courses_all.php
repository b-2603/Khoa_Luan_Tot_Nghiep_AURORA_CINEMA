<?php
// d:/EMS_AURORA/backend/seed_courses_all.php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=aurora_ems;charset=utf8mb4', 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
]);

$courses = [
    [1, 'Nghiệp Vụ Quầy Concession: Rang Bắp Chuẩn Vị & Vận Hành Máy Nước Post-Mix', 'Nắm vững toàn diện 30 quy chuẩn quầy bắp nước: Công thức nổ bắp nấm Gourmet 32oz, nhiệt độ tủ giữ ấm 60-65°C, áp suất CO2 95-110 PSI, khử trùng vòi Sanitizer 15 phút và an toàn thực phẩm FIFO.', 'Bắp Nước & Quầy Concession', 45, 0, 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=700&auto=format&fit=crop&q=80', 85, 78],
    [2, 'Kỹ Năng Vận Hành Quầy Vé Box Office, Đặt Chỗ POS & Xử Lý Sự Cố Suất Chiếu', 'Thành thạo phần mềm bán vé POS Aurora dưới 45 giây, quy định phân loại nhãn phim P, K, T13, T16, T18 theo Luật Điện Ảnh 2022, quy trình kiểm quỹ và xử lý sự cố suất chiếu.', 'Vé & Chăm sóc Khách hàng', 40, 0, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&auto=format&fit=crop&q=80', 92, 84],
    [3, 'Quy Trình Chuẩn Phục Vụ Khách Hàng AURORA Standard: Soát Vé Usher, Điều Phối & Bản Quyền', 'Quy chuẩn đón tiếp khán giả 15-20 phút trước suất chiếu, soi đèn pin chúc sàn an toàn, chống quay lén bản quyền (Camcording), dọn dẹp Turnaround 10-15 phút và xử lý Lost & Found.', 'Soát Vé & Trật Tự Sảnh', 45, 0, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80', 110, 104],
    [4, 'An Toàn Phòng Cháy Chữa Cháy, Cứu Nạn Cứu Hộ & Sơ Tán Khán Giả Trong Bóng Tối', 'Bật sáng House Lights Full khi chuông báo cháy reo, cấm dùng thang máy, quy tắc sử dụng bình chữa cháy P.A.S.S, cấp cứu ngạt khói và hồi sinh tim phổi CPR tỷ lệ 30:2.', 'An Toàn & Khẩn Cấp', 50, 0, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=700&auto=format&fit=crop&q=80', 130, 122],
    [5, 'Nghệ Thuật Phục Vụ 5 Sao "Aurora Hospitality Standard" & Xử Lý Khách Hàng Khó Tính', 'Quy tắc chào đón 3 giây, ngôn ngữ hình thể thanh lịch, mô hình xử lý khiếu nại L.A.S.T (Listen - Apologize - Solve - Thank), thẩm quyền Service Recovery và văn hóa tôn trọng khách hàng.', 'Nghiệp vụ Dịch vụ', 45, 0, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80', 125, 118],
    [6, 'Kỹ Thuật Vận Hành Phòng Máy Chiếu Laser 4K, IMAX & Hệ Thống Âm Thanh Dolby Atmos', 'Nắm vững định dạng gói phim DCP DCI, nạp chứng thư khóa bản quyền KDM, khởi động buồng laser Chiller 18-22°C trước 30-45 phút, cân chỉnh âm thanh Dolby Atmos chuẩn 85 dBC SPL.', 'Kỹ Thuật Chiếu Phim', 60, 0, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80', 40, 36],
    [7, 'CTKM Siêu Bão Mùa Hè 2026: Combo Popcorn X2, Voucher F&B & Khách Hàng VIP', 'Chính sách ưu đãi Vé 1K Student (T2-T5 trước 17:00), Combo Popcorn X2 miễn phí đổi vị Caramel/Phô mai, 4 hạng thẻ thành viên Aurora Club và quy trình thanh toán quét mã voucher POS.', 'Chương Trình Khuyến Mãi (CTKM)', 30, 1, 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=700&auto=format&fit=crop&q=80', 95, 90],
    [8, 'Giám Sát Ca Trực Cinema Supervisor & Kiểm Soát Thất Thoát, An Toàn Vệ Sinh HACCP', 'Trách nhiệm Duty Manager: Bảng kiểm tra mở/đóng ca (Opening/Closing Checklist), tiêu chuẩn vệ sinh HACCP, kho mát 0-4°C, kho đông -18°C, lưu mẫu thực phẩm 24h, đối soát két tiền mặt và biên bản sự cố 2h.', 'Quản Lý & Vận Hành', 60, 0, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&auto=format&fit=crop&q=80', 50, 46],
];

$stmt = $pdo->prepare("INSERT INTO courses (id, title, description, category, duration_minutes, is_ctkm, thumbnail, enrolled_count, completed_count, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), category = VALUES(category), duration_minutes = VALUES(duration_minutes), is_ctkm = VALUES(is_ctkm), thumbnail = VALUES(thumbnail), enrolled_count = VALUES(enrolled_count), completed_count = VALUES(completed_count), updated_at = NOW()");

foreach ($courses as $c) {
    $stmt->execute($c);
}

// Update quizzes foreign keys to match course ids 1..8
for ($i = 1; $i <= 8; $i++) {
    $pdo->prepare("UPDATE quizzes SET course_id = ? WHERE id = ?")->execute([$i, $i]);
}

echo "Courses and Quizzes synchronized 1-to-1 in MySQL!\n";
$cnt = $pdo->query("SELECT count(*) FROM courses")->fetchColumn();
echo "Total courses in DB: $cnt\n";
