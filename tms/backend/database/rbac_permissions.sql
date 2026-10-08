-- Aurora Cinema TMS: chính sách phân quyền RBAC có thể quản trị
-- Chạy trên database aurora_db khi cần cài đặt thủ công. API cũng tự tạo
-- bảng ở lần mở trang Ma trận phân quyền đầu tiên.
USE `aurora_db`;

CREATE TABLE IF NOT EXISTS `tms_rbac_permissions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `module_key` VARCHAR(80) NOT NULL,
  `module_name` VARCHAR(160) NOT NULL,
  `role_code` VARCHAR(40) NOT NULL,
  `access_level` ENUM('full','manage','view','none') NOT NULL DEFAULT 'none',
  `permission_note` VARCHAR(255) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `updated_by` BIGINT UNSIGNED NULL,
  `updated_at` DATETIME NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_tms_rbac_module_role` (`module_key`, `role_code`),
  KEY `idx_tms_rbac_role` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
