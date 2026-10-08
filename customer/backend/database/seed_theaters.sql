-- ========================================================
-- DỮ LIỆU CỤM RẠP VÀ PHÒNG CHIẾU - AURORA CINEMA
-- ========================================================

USE `aurora_db`;

ALTER TABLE `theaters` CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE `screens` CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `booking_seats`;
TRUNCATE TABLE `bookings`;
TRUNCATE TABLE `showtimes`;
TRUNCATE TABLE `seats`;
TRUNCATE TABLE `screens`;
TRUNCATE TABLE `theaters`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Thêm danh sách Cụm Rạp (Theaters)
INSERT INTO `theaters` (`id`, `name`, `address`, `city`, `created_at`) VALUES
(1, 'Aurora Q1', 'Tầng 3, Vincom Center Đồng Khởi, 72 Lê Thánh Tôn, Bến Nghé, Quận 1', 'TP. Hồ Chí Minh', NOW()),
(2, 'Aurora Q7', 'Tầng 4, SC VivoCity, 1058 Nguyễn Văn Linh, Tân Phong, Quận 7', 'TP. Hồ Chí Minh', NOW()),
(3, 'Aurora Landmark 81', 'Tầng B1, Vincom Landmark 81, 208 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh', 'TP. Hồ Chí Minh', NOW()),
(4, 'Aurora Thủ Đức', 'Tầng 6, TTTM GigaMall, 240-242 Phạm Văn Đồng, Hiệp Bình Chánh, TP. Thủ Đức', 'TP. Hồ Chí Minh', NOW()),
(5, 'Aurora Tân Bình', 'Tầng 5, Menas Mall Saigon Airport, 60A Trường Sơn, Phường 2, Tân Bình', 'TP. Hồ Chí Minh', NOW()),
(6, 'Aurora Hà Nội', 'Tầng 6, Vincom Center Bà Triệu, 191 Bà Triệu, Lê Đại Hành, Hai Bà Trưng', 'Hà Nội', NOW()),
(7, 'Aurora Đà Nẵng', 'Tầng 3, Indochina Riverside, 74 Bạch Đằng, Hải Châu 1, Hải Châu', 'Đà Nẵng', NOW());

-- 2. Thêm Phòng Chiếu (Screens) cho từng cụm rạp
INSERT INTO `screens` (`theater_id`, `name`, `total_seats`) VALUES
-- Aurora Q1 (Flagship)
(1, 'Phòng 01 - Laser IMAX', 280),
(1, 'Phòng 02 - Dolby Atmos 3D', 180),
(1, 'Phòng 03 - VIP Starium Sofa', 64),
(1, 'Phòng 04 - 4DX Dynamic', 110),
(1, 'Phòng 05 - Tiêu chuẩn Digital', 140),
(1, 'Phòng 06 - Tiêu chuẩn Digital', 140),

-- Aurora Q7
(2, 'Phòng 01 - Dolby Atmos 4K', 200),
(2, 'Phòng 02 - 4DX Experience', 120),
(2, 'Phòng 03 - VIP Gold Class', 50),
(2, 'Phòng 04 - Tiêu chuẩn Digital', 150),
(2, 'Phòng 05 - Tiêu chuẩn Digital', 150),

-- Aurora Landmark 81
(3, 'Phòng 01 - IMAX 3D Laser Grand', 300),
(3, 'Phòng 02 - Dolby Atmos Premium', 220),
(3, 'Phòng 03 - VIP Starium Suite', 70),
(3, 'Phòng 04 - ScreenX 270 độ', 160),
(3, 'Phòng 05 - Tiêu chuẩn Digital', 160),

-- Aurora Thủ Đức
(4, 'Phòng 01 - Dolby Atmos 4K', 180),
(4, 'Phòng 02 - 3D Digital Surround', 150),
(4, 'Phòng 03 - VIP Gold Class', 60),
(4, 'Phòng 04 - Tiêu chuẩn Digital', 130),

-- Aurora Tân Bình
(5, 'Phòng 01 - Dolby Atmos Surround', 170),
(5, 'Phòng 02 - 3D Digital', 140),
(5, 'Phòng 03 - VIP Starium', 50),
(5, 'Phòng 04 - Tiêu chuẩn Digital', 120),

-- Aurora Hà Nội
(6, 'Phòng 01 - IMAX Laser Ultimate', 260),
(6, 'Phòng 02 - Dolby Atmos 4K', 190),
(6, 'Phòng 03 - VIP Gold Class', 60),
(6, 'Phòng 04 - Tiêu chuẩn Digital', 150),
(6, 'Phòng 05 - Tiêu chuẩn Digital', 150),

-- Aurora Đà Nẵng
(7, 'Phòng 01 - Dolby Atmos 4K', 200),
(7, 'Phòng 02 - VIP Starium Sofa', 55),
(7, 'Phòng 03 - 3D Digital', 140),
(7, 'Phòng 04 - Tiêu chuẩn Digital', 130);
