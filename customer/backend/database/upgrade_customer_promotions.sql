USE `aurora_db`;
SET NAMES utf8;

ALTER TABLE `vouchers`
  ADD COLUMN `short_description` VARCHAR(255) NULL AFTER `name`,
  ADD COLUMN `details` TEXT NULL AFTER `short_description`,
  ADD COLUMN `terms_text` TEXT NULL AFTER `details`,
  ADD COLUMN `category` VARCHAR(30) NOT NULL DEFAULT 'ticket' AFTER `terms_text`,
  ADD COLUMN `audience` VARCHAR(30) NOT NULL DEFAULT 'all' AFTER `category`,
  ADD COLUMN `badge_text` VARCHAR(60) NULL AFTER `audience`,
  ADD COLUMN `theme_color` VARCHAR(20) NOT NULL DEFAULT '#D99A1B' AFTER `badge_text`,
  ADD COLUMN `image_url` VARCHAR(500) NULL AFTER `theme_color`,
  ADD COLUMN `min_order_amount` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `discount_value`,
  ADD COLUMN `max_discount` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `min_order_amount`,
  ADD COLUMN `is_featured` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`,
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `is_featured`;

ALTER TABLE `orders`
  ADD COLUMN `voucher_code` VARCHAR(40) NULL AFTER `discount_amount`;

INSERT INTO `vouchers`
(`code`, `name`, `short_description`, `details`, `terms_text`, `category`, `audience`, `badge_text`, `theme_color`, `image_url`, `discount_type`, `discount_value`, `min_order_amount`, `max_discount`, `starts_at`, `ends_at`, `usage_limit`, `used_count`, `status`, `is_featured`, `sort_order`, `created_at`, `updated_at`) VALUES
('AURORA20', 'Thứ Tư rực rỡ - Giảm 20%', 'Đặt vé giữa tuần, tận hưởng giá mềm hơn cho mọi hành trình điện ảnh.', 'Giảm 20% tổng giá trị vé khi đặt trực tuyến tại Aurora Cinema. Ưu đãi lý tưởng cho buổi hẹn giữa tuần cùng bạn bè và gia đình.', 'Áp dụng cho đơn vé từ 100.000đ. Mức giảm tối đa 60.000đ. Không áp dụng đồng thời với ưu đãi khác. Số lượng mã có hạn.', 'ticket', 'all', 'ƯU ĐÃI NỔI BẬT', '#D89718', '', 'percent', 20, 100000, 60000, '2026-10-01 00:00:00', '2026-12-31 23:59:59', 1000, 0, 'active', 1, 10, NOW(), NOW()),
('STUDENT40', 'Đồng giá vé học sinh - sinh viên', 'Vé 2D chỉ từ 40.000đ dành cho thế hệ trẻ yêu điện ảnh.', 'Giảm trực tiếp 40.000đ cho đơn vé hợp lệ. Thành viên có thể sử dụng mã tại bước thanh toán và xuất trình thẻ học sinh, sinh viên khi nhận vé.', 'Áp dụng cho khách hàng học sinh, sinh viên có giấy tờ hợp lệ. Đơn tối thiểu 80.000đ. Không áp dụng ngày lễ và suất đặc biệt.', 'member', 'student', 'HỌC SINH · SINH VIÊN', '#E04F87', '', 'amount', 40000, 80000, 40000, '2026-10-01 00:00:00', '2026-12-20 23:59:59', 600, 0, 'active', 1, 20, NOW(), NOW()),
('COMBO25', 'Combo đôi - Trọn vị phim hay', 'Giảm 25% combo bắp lớn và hai nước khi đặt cùng vé xem phim.', 'Tận hưởng combo bắp nước tiết kiệm dành cho hai người. Nhập mã khi thanh toán đơn có cả vé và sản phẩm F&B.', 'Áp dụng cho đơn từ 200.000đ có sản phẩm F&B. Giảm tối đa 75.000đ. Mỗi tài khoản dùng một lần trong thời gian chương trình.', 'combo', 'all', 'COMBO BÁN CHẠY', '#2B8D78', '', 'percent', 25, 200000, 75000, '2026-10-05 00:00:00', '2026-11-30 23:59:59', 800, 0, 'active', 1, 30, NOW(), NOW()),
('MEMBER50', 'Đặc quyền thành viên Aurora', 'Nhận ngay 50.000đ cho lần đặt vé tiếp theo của thành viên.', 'Quà tặng tri ân dành cho thành viên Aurora đã đăng nhập. Mã được áp dụng trực tiếp tại bước thanh toán trực tuyến.', 'Chỉ áp dụng cho tài khoản thành viên. Đơn tối thiểu 180.000đ. Không quy đổi thành tiền mặt và không cộng dồn ưu đãi.', 'member', 'member', 'AURORA REWARDS', '#6E56CF', '', 'amount', 50000, 180000, 50000, '2026-10-01 00:00:00', '2026-12-31 23:59:59', 500, 0, 'active', 0, 40, NOW(), NOW()),
('IMAX15', 'Đắm chìm IMAX - Giảm 15%', 'Nâng cấp trải nghiệm màn ảnh lớn với mức giá hấp dẫn hơn.', 'Giảm 15% cho đơn vé có suất chiếu định dạng IMAX tại các cụm rạp Aurora hỗ trợ.', 'Áp dụng cho đơn từ 250.000đ. Mức giảm tối đa 80.000đ. Không áp dụng cùng voucher khác.', 'experience', 'all', 'IMAX EXPERIENCE', '#2475B9', '', 'percent', 15, 250000, 80000, '2026-10-10 00:00:00', '2026-12-15 23:59:59', 400, 0, 'active', 0, 50, NOW(), NOW()),
('FAMILY60', 'Cuối tuần gia đình - Giảm 60K', 'Thêm niềm vui cho cả nhà với ưu đãi đặt vé nhóm cuối tuần.', 'Giảm 60.000đ cho đơn vé gia đình hoặc nhóm bạn có giá trị từ 300.000đ.', 'Áp dụng cho đơn từ 300.000đ. Mỗi tài khoản được sử dụng tối đa một lần. Số lượng có hạn.', 'ticket', 'family', 'CUỐI TUẦN VUI VẺ', '#C65C3B', '', 'amount', 60000, 300000, 60000, '2026-10-01 00:00:00', '2026-11-30 23:59:59', 350, 0, 'active', 0, 60, NOW(), NOW());
