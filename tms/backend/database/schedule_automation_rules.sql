-- Aurora Cinema TMS - quy tắc tự động xếp giờ chiếu
-- Chạy trên database aurora_db.

USE `aurora_db`;

CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL UNIQUE,
  `config_value` TEXT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO `system_configs` (`config_key`, `config_value`, `description`, `updated_at`)
VALUES
('schedule_same_screen_gap_minutes', '15', 'Khoảng đệm sau khi phim kết thúc nếu xếp tiếp cùng phòng', NOW()),
('schedule_cross_screen_stagger_minutes', '5', 'Độ lệch giờ bắt đầu giữa các phòng trong cùng đợt tạo lịch', NOW()),
('schedule_operating_start_time', '09:00', 'Giờ bắt đầu vận hành mặc định của lịch chiếu', NOW())
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
