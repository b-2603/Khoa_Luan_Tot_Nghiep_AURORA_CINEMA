-- ========================================================
-- Database Schema cho hệ thống AURORA CINEMA - TMS
-- THEATER MANAGEMENT SYSTEM (Quản lý rạp chiếu phim)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `aurora_tms`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `aurora_tms`;

-- 1. Bảng tài khoản quản trị TMS (Quản lý rạp, Giám sát, Kỹ thuật viên)
CREATE TABLE IF NOT EXISTS `tms_users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `role` ENUM('director', 'manager', 'supervisor', 'technician') NOT NULL DEFAULT 'manager',
  `status` ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active',
  `last_login` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng quản lý phòng chiếu (Screens / Auditoriums)
CREATE TABLE IF NOT EXISTS `tms_screens` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `screen_code` VARCHAR(30) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `screen_type` ENUM('IMAX', '3D_DOLBY_ATMOS', '4DX', 'VIP_STARIUM', 'STANDARD') NOT NULL DEFAULT 'STANDARD',
  `total_seats` INT UNSIGNED NOT NULL DEFAULT 120,
  `projector_status` ENUM('online', 'standby', 'maintenance', 'error') NOT NULL DEFAULT 'online',
  `sound_system_status` ENUM('online', 'standby', 'error') NOT NULL DEFAULT 'online',
  `hvac_temperature` DECIMAL(4, 1) NOT NULL DEFAULT 22.5,
  `lamp_hours` INT UNSIGNED NOT NULL DEFAULT 1420,
  `status` ENUM('active', 'paused', 'cleaning', 'closed') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng quản lý phim (Movies)
CREATE TABLE IF NOT EXISTS `tms_movies` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `duration_minutes` INT UNSIGNED NOT NULL,
  `age_rating` VARCHAR(10) NOT NULL DEFAULT 'T16',
  `format` VARCHAR(50) NOT NULL DEFAULT '2D Digital / 3D',
  `status` ENUM('now_showing', 'coming_soon', 'ended') NOT NULL DEFAULT 'now_showing',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng quản lý suất chiếu (Schedules / Showtimes)
CREATE TABLE IF NOT EXISTS `tms_schedules` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `screen_id` BIGINT UNSIGNED NOT NULL,
  `movie_id` BIGINT UNSIGNED NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `show_date` DATE NOT NULL,
  `booked_seats` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_seats` INT UNSIGNED NOT NULL DEFAULT 120,
  `status` ENUM('scheduled', 'running', 'finished', 'cancelled') NOT NULL DEFAULT 'scheduled',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`screen_id`) REFERENCES `tms_screens`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`movie_id`) REFERENCES `tms_movies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng quản lý nhân sự ca trực & chấm công (Staff & Attendance)
CREATE TABLE IF NOT EXISTS `tms_staff_shifts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `staff_name` VARCHAR(120) NOT NULL,
  `position` VARCHAR(80) NOT NULL,
  `shift_name` VARCHAR(50) NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('on_duty', 'checked_in', 'checked_out', 'absent') NOT NULL DEFAULT 'on_duty',
  `check_in_at` DATETIME NULL,
  `check_out_at` DATETIME NULL,
  `work_date` DATE NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng báo cáo doanh thu theo thời gian thực (Revenue Logs)
CREATE TABLE IF NOT EXISTS `tms_revenue_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `log_date` DATE NOT NULL,
  `ticket_sales` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `concession_sales` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_revenue` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_tickets` INT UNSIGNED NOT NULL DEFAULT 0,
  `occupancy_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- DỮ LIỆU KHỞI TẠO BAN ĐẦU (SEED DATA)
-- ========================================================

-- 1. Tài khoản quản lý TMS: 0328754062 & admin, mật khẩu: 8888
-- Hash Bcrypt an toàn của mật khẩu '8888': $2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2
INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES 
(
  '0328754062',
  '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2',
  'Nguyễn Trần Thái Bảo',
  '0328754062',
  'director',
  'active'
),
(
  'admin',
  '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2',
  'Nguyễn Trần Thái Bảo',
  '0328754062',
  'manager',
  'active'
)
ON DUPLICATE KEY UPDATE 
  `password_hash` = VALUES(`password_hash`),
  `full_name` = VALUES(`full_name`),
  `status` = 'active';

-- 2. Dữ liệu phòng chiếu mẫu (Aurora Cinema)
INSERT INTO `tms_screens` (`screen_code`, `name`, `screen_type`, `total_seats`, `projector_status`, `sound_system_status`, `hvac_temperature`, `lamp_hours`, `status`)
VALUES
('SCREEN_01', 'Phòng 01 - Laser IMAX', 'IMAX', 280, 'online', 'online', 22.0, 850, 'active'),
('SCREEN_02', 'Phòng 02 - Dolby Atmos 3D', '3D_DOLBY_ATMOS', 180, 'online', 'online', 22.5, 1240, 'active'),
('SCREEN_03', 'Phòng 03 - VIP Starium Sofa', 'VIP_STARIUM', 64, 'online', 'online', 21.8, 620, 'active'),
('SCREEN_04', 'Phòng 04 - 4DX Dynamic', '4DX', 110, 'online', 'online', 22.0, 930, 'active'),
('SCREEN_05', 'Phòng 05 - Tiêu chuẩn Digital', 'STANDARD', 140, 'online', 'online', 23.0, 1500, 'active'),
('SCREEN_06', 'Phòng 06 - Tiêu chuẩn Digital', 'STANDARD', 140, 'standby', 'online', 23.5, 1720, 'active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Dữ liệu phim mẫu
INSERT INTO `tms_movies` (`id`, `title`, `duration_minutes`, `age_rating`, `format`, `status`)
VALUES
(1, 'Avatar: Dòng Chảy Của Nước', 192, 'T13', '3D IMAX / HFR', 'now_showing'),
(2, 'Oppenheimer', 180, 'T18', '2D IMAX 70mm', 'now_showing'),
(3, 'Dune: Hành Tinh Cát - Phần 2', 166, 'T16', 'Dolby Atmos 4K', 'now_showing'),
(4, 'Mai (Trấn Thành Film)', 131, 'T18', '2D Digital', 'now_showing'),
(5, 'Godzilla x Kong: Đế Chế Mới', 115, 'T13', '3D / 4DX', 'now_showing')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- 4. Suất chiếu hôm nay
INSERT INTO `tms_schedules` (`screen_id`, `movie_id`, `start_time`, `end_time`, `show_date`, `booked_seats`, `total_seats`, `status`)
VALUES
(1, 1, '09:30:00', '12:45:00', CURDATE(), 245, 280, 'running'),
(1, 1, '13:30:00', '16:45:00', CURDATE(), 210, 280, 'scheduled'),
(2, 2, '10:00:00', '13:00:00', CURDATE(), 165, 180, 'running'),
(2, 3, '14:00:00', '16:46:00', CURDATE(), 140, 180, 'scheduled'),
(3, 4, '11:15:00', '13:30:00', CURDATE(), 58, 64, 'running'),
(4, 5, '10:30:00', '12:30:00', CURDATE(), 92, 110, 'running')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 5. Nhân sự ca trực rạp hôm nay
INSERT INTO `tms_staff_shifts` (`staff_name`, `position`, `shift_name`, `start_time`, `end_time`, `status`, `check_in_at`, `work_date`)
VALUES
('Nguyễn Trần Thái Bảo', 'Giám đốc Rạp / Điều hành', 'Ca Hành Chính', '08:00:00', '17:30:00', 'on_duty', NOW(), CURDATE()),
('Trần Văn Hưng', 'Kỹ thuật viên phòng chiếu', 'Ca Sáng', '08:30:00', '16:30:00', 'on_duty', NOW(), CURDATE()),
('Lê Thị Kim Ngân', 'Trưởng ca kiểm soát vé', 'Ca Sáng', '08:30:00', '16:30:00', 'on_duty', NOW(), CURDATE()),
('Phạm Hoàng Nam', 'Kỹ thuật viên âm thanh ánh sáng', 'Ca Sáng', '09:00:00', '17:00:00', 'on_duty', NOW(), CURDATE()),
('Đặng Minh Khoa', 'Nhân viên vận hành 4DX', 'Ca Chiều', '15:00:00', '23:00:00', 'checked_in', NULL, CURDATE())
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- 6. Doanh thu hôm nay
INSERT INTO `tms_revenue_logs` (`log_date`, `ticket_sales`, `concession_sales`, `total_revenue`, `total_tickets`, `occupancy_rate`)
VALUES
(CURDATE(), 185600000.00, 52400000.00, 238000000.00, 1820, 84.50)
ON DUPLICATE KEY UPDATE `total_revenue` = VALUES(`total_revenue`);
