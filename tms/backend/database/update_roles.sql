-- ========================================================
-- Cập nhật cấu trúc bảng & Dữ liệu đồng bộ cho AURORA CINEMA TMS
-- Áp dụng duy nhất trên MySQL database aurora_db (phpMyAdmin)
-- ========================================================

USE `aurora_db`;

-- 1. Cập nhật bảng tms_users hỗ trợ 4 vai trò
ALTER TABLE `tms_users` MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'cinema_admin';

-- Tạo / cập nhật các tài khoản mẫu cho 4 vai trò (Mật khẩu: 8888)
INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('admin_tong', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Nguyễn Trần Thái Bảo (Admin Tổng)', '0328754062', 'super_admin', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'super_admin', `status` = 'active';

UPDATE `tms_users` SET `role` = 'super_admin' WHERE `username` = '0328754062';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('admin_rap', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Lê Hoàng Nam (Quản Lý Rạp)', '0901234567', 'cinema_admin', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'cinema_admin', `status` = 'active';

UPDATE `tms_users` SET `role` = 'cinema_admin' WHERE `username` = 'admin';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('supervisor', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Trần Thị Mai (Giám Sát Ca Trực)', '0912345678', 'supervisor', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'supervisor', `status` = 'active';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('accounting', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Phạm Minh Trang (Kế Toán Trưởng)', '0923456789', 'accounting', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'accounting', `status` = 'active';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('ketoan', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Phạm Minh Trang (Kế Toán)', '0923456789', 'accounting', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'accounting', `status` = 'active';

-- 2. Bảng Hoàn vé tms_refunds
CREATE TABLE IF NOT EXISTS `tms_refunds` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `transaction_code` VARCHAR(50) NOT NULL,
    `customer_name` VARCHAR(120) NOT NULL DEFAULT '',
    `customer_phone` VARCHAR(20) NOT NULL DEFAULT '',
    `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `reason` VARCHAR(255) NOT NULL DEFAULT '',
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
    `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    `requested_by` VARCHAR(100) NULL DEFAULT 'Quầy vé POS',
    `approved_by` VARCHAR(100) NULL,
    `requested_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `processed_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 3. Bảng Thiết bị POS tms_pos_devices
CREATE TABLE IF NOT EXISTS `tms_pos_devices` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `device_code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `screen_name` VARCHAR(100) NOT NULL DEFAULT 'Quầy Vé 01',
    `ip_address` VARCHAR(50) NOT NULL DEFAULT '192.168.1.10',
    `mac_address` VARCHAR(50) NOT NULL DEFAULT '',
    `status` ENUM('active', 'pending_approval', 'inactive', 'maintenance') NOT NULL DEFAULT 'pending_approval',
    `approved_by` VARCHAR(100) NULL,
    `last_active` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 4. Bảng Chính sách giá vé tms_pricing_policies
CREATE TABLE IF NOT EXISTS `tms_pricing_policies` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ticket_type` VARCHAR(100) NOT NULL,
    `base_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `weekend_surcharge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `holiday_surcharge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `imax_surcharge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `updated_by` VARCHAR(100) NULL,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 5. Bảng Nhật ký Audit Log tms_audit_logs
CREATE TABLE IF NOT EXISTS `tms_audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(60) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(50) NULL DEFAULT '127.0.0.1',
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 6. Bảng Cấu hình hệ thống tms_system_configs
CREATE TABLE IF NOT EXISTS `tms_system_configs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(100) NOT NULL UNIQUE,
    `config_value` TEXT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ========================================================
-- Các lệnh đồng bộ bổ sung trong cùng database aurora_db
-- ========================================================
USE `aurora_db`;

ALTER TABLE `tms_users` MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'cinema_admin';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('admin_tong', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Nguyễn Trần Thái Bảo (Admin Tổng)', '0328754062', 'super_admin', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'super_admin', `status` = 'active';

UPDATE `tms_users` SET `role` = 'super_admin' WHERE `username` = '0328754062';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('admin_rap', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Lê Hoàng Nam (Quản Lý Rạp)', '0901234567', 'cinema_admin', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'cinema_admin', `status` = 'active';

UPDATE `tms_users` SET `role` = 'cinema_admin' WHERE `username` = 'admin';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('supervisor', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Trần Thị Mai (Giám Sát Ca Trực)', '0912345678', 'supervisor', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'supervisor', `status` = 'active';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('accounting', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Phạm Minh Trang (Kế Toán Trưởng)', '0923456789', 'accounting', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'accounting', `status` = 'active';

INSERT INTO `tms_users` (`username`, `password_hash`, `full_name`, `phone`, `role`, `status`)
VALUES ('ketoan', '$2y$12$wZ3cvdry6kOqHV6vdTllB.B9qrFsJLdIZKjofc02GnNletKab1/G2', 'Phạm Minh Trang (Kế Toán)', '0923456789', 'accounting', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`), `role` = 'accounting', `status` = 'active';

CREATE TABLE IF NOT EXISTS `tms_refunds` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `transaction_code` VARCHAR(50) NOT NULL,
    `customer_name` VARCHAR(120) NOT NULL DEFAULT '',
    `customer_phone` VARCHAR(20) NOT NULL DEFAULT '',
    `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `reason` VARCHAR(255) NOT NULL DEFAULT '',
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
    `status` ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    `requested_by` VARCHAR(100) NULL DEFAULT 'Quầy vé POS',
    `approved_by` VARCHAR(100) NULL,
    `requested_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `processed_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tms_pos_devices` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `device_code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `screen_name` VARCHAR(100) NOT NULL DEFAULT 'Quầy Vé 01',
    `ip_address` VARCHAR(50) NOT NULL DEFAULT '192.168.1.10',
    `mac_address` VARCHAR(50) NOT NULL DEFAULT '',
    `status` ENUM('active', 'pending_approval', 'inactive', 'maintenance') NOT NULL DEFAULT 'pending_approval',
    `approved_by` VARCHAR(100) NULL,
    `last_active` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tms_pricing_policies` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ticket_type` VARCHAR(100) NOT NULL,
    `base_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `weekend_surcharge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `holiday_surcharge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `imax_surcharge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `updated_by` VARCHAR(100) NULL,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tms_audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(60) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `details` TEXT NULL,
    `ip_address` VARCHAR(50) NULL DEFAULT '127.0.0.1',
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tms_system_configs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `config_key` VARCHAR(100) NOT NULL UNIQUE,
    `config_value` TEXT NULL,
    `description` VARCHAR(255) NULL,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ========================================================
-- KẾ HOẠCH PHIM THEO THÁNG & PHÂN BỔ PHIM CHO RẠP (USE CASE 6 & 7)
-- ========================================================
CREATE TABLE IF NOT EXISTS `tms_movie_plans` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `plan_name` VARCHAR(150) NOT NULL,
    `plan_month` TINYINT UNSIGNED NOT NULL,
    `plan_year` SMALLINT UNSIGNED NOT NULL,
    `movie_id` BIGINT UNSIGNED NOT NULL,
    `movie_title` VARCHAR(200) NOT NULL,
    `format` VARCHAR(100) NOT NULL DEFAULT '2D Digital',
    `expected_start_date` DATE NOT NULL,
    `expected_end_date` DATE NOT NULL,
    `target_revenue` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    `target_screenings_per_day` INT UNSIGNED NOT NULL DEFAULT 5,
    `priority_level` ENUM('blockbuster', 'high', 'medium', 'low') NOT NULL DEFAULT 'high',
    `status` ENUM('draft', 'approved', 'in_progress', 'completed') NOT NULL DEFAULT 'approved',
    `note` TEXT NULL,
    `created_by` VARCHAR(100) NOT NULL DEFAULT 'admin_tong',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `tms_movie_allocations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `plan_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `movie_id` BIGINT UNSIGNED NOT NULL,
    `movie_title` VARCHAR(200) NOT NULL,
    `theater_id` INT UNSIGNED NOT NULL,
    `theater_name` VARCHAR(150) NOT NULL,
    `min_screenings_per_day` INT UNSIGNED NOT NULL DEFAULT 4,
    `preferred_screen_types` VARCHAR(100) NOT NULL DEFAULT 'Standard / IMAX',
    `allocated_start_date` DATE NOT NULL,
    `allocated_end_date` DATE NOT NULL,
    `status` ENUM('pending', 'confirmed', 'deploying', 'completed') NOT NULL DEFAULT 'pending',
    `confirmed_by` VARCHAR(100) NULL,
    `confirmed_at` DATETIME NULL,
    `note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Bổ sung metadata quản trị và trạng thái đầy đủ cho kế hoạch phim.
ALTER TABLE `tms_movie_plans`
    ADD COLUMN IF NOT EXISTS `plan_code` VARCHAR(40) NULL AFTER `id`,
    ADD COLUMN IF NOT EXISTS `approved_by` VARCHAR(100) NULL AFTER `created_by`,
    ADD COLUMN IF NOT EXISTS `approved_at` DATETIME NULL AFTER `approved_by`,
    ADD COLUMN IF NOT EXISTS `updated_by` VARCHAR(100) NULL AFTER `approved_at`,
    ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NULL AFTER `updated_by`;

UPDATE `tms_movie_plans`
SET `status` = CASE
    WHEN `status` = 'pending_approval' THEN 'draft'
    WHEN `status` = 'approved' THEN 'published'
    ELSE `status`
END
WHERE `status` IN ('pending_approval', 'approved');

ALTER TABLE `tms_movie_plans`
    MODIFY COLUMN `status` ENUM('draft', 'published', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'draft';
