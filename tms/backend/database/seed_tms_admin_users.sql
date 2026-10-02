USE `aurora_db`;

-- Tài khoản quản trị dành cho môi trường phát triển TMS.
-- Mật khẩu ban đầu: 8888. Cần đổi sau lần đăng nhập đầu tiên trên môi trường triển khai.
INSERT INTO `users` (`username`, `full_name`, `email`, `phone`, `id_number`, `birthday`, `gender`, `city`, `district`, `address`, `password_hash`, `role`, `status`, `last_login`, `membership_level`, `points`, `theater_id`, `created_at`, `updated_at`) VALUES
('admin_tong', 'Nguyễn Trần Thái Bảo', 'admin.tong@aurora.local', '0328754062', 'TMS-SA-001', '1995-01-01', 'other', 'TP. Hồ Chí Minh', 'Quận 1', 'Aurora Cinema', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'super_admin', 'active', '1970-01-01 00:00:00', 'PLATINUM', 0, 1, NOW(), NOW()),
('admin_rap', 'Lê Hoàng Nam', 'admin.rap@aurora.local', '0901234567', 'TMS-CA-001', '1992-01-01', 'male', 'TP. Hồ Chí Minh', 'Quận 1', 'Aurora Cinema', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'cinema_admin', 'active', '1970-01-01 00:00:00', 'STANDARD', 0, 1, NOW(), NOW()),
('supervisor', 'Trần Thị Mai', 'supervisor@aurora.local', '0912345678', 'TMS-SV-001', '1994-01-01', 'female', 'TP. Hồ Chí Minh', 'Quận 1', 'Aurora Cinema', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'supervisor', 'active', '1970-01-01 00:00:00', 'STANDARD', 0, 1, NOW(), NOW()),
('accounting', 'Phạm Minh Trang', 'accounting@aurora.local', '0923456789', 'TMS-AC-001', '1993-01-01', 'female', 'TP. Hồ Chí Minh', 'Quận 1', 'Aurora Cinema', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'accounting', 'active', '1970-01-01 00:00:00', 'STANDARD', 0, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `phone` = VALUES(`phone`), `password_hash` = VALUES(`password_hash`), `role` = VALUES(`role`), `status` = 'active', `updated_at` = NOW();
