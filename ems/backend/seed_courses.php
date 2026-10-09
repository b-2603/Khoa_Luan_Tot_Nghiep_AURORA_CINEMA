<?php
$pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=aurora_ems;charset=utf8mb4', 'root', '');
$pdo->exec("INSERT IGNORE INTO courses (id, title, description, category, duration_minutes, is_ctkm, thumbnail, enrolled_count, completed_count) VALUES
(4, 'Nghiệp Vụ Quầy Concession: Rang Bắp Chuẩn Vị & Vận Hành Máy Nước Post-Mix', 'Quy trình công nghệ nổ bắp hạt ngô Mỹ, bí quyết phối trộn Caramel/Phô mai giòn tan 12 giờ, vệ sinh an toàn thực phẩm ISO 22000.', 'Bắp Nước & Quầy Concession', 45, 0, 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=700&auto=format&fit=crop&q=80', 38, 32),
(5, 'Nghệ Thuật Phục Vụ 5 Sao Aurora Hospitality Standard & Xử Lý Khách Hàng Khó Tính', 'Bộ tiêu chuẩn giao tiếp tác phong thương hiệu Aurora: Nụ cười đón chào, ngôn ngữ hình thể thanh lịch, phương pháp LAST xoa dịu khiếu nại.', 'Nghiệp vụ Dịch vụ', 45, 0, 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80', 60, 55),
(6, 'Kỹ Năng Vận Hành Quầy Vé Box Office, Đặt Chỗ POS & Xử Lý Sự Cố Suất Chiếu', 'Làm chủ phần mềm bán vé POS Cinema, quy trình phân loại độ tuổi phim C13/C16/C18 theo luật điện ảnh, xử lý đổi vé/hoàn vé khẩn cấp.', 'Vé & Chăm sóc Khách hàng', 40, 0, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&auto=format&fit=crop&q=80', 45, 39);
");
echo "Total courses in DB: " . $pdo->query("SELECT count(*) FROM courses")->fetchColumn() . "\n";
