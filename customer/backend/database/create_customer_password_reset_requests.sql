USE `aurora_db`;

CREATE TABLE IF NOT EXISTS `customer_password_reset_requests` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `selector` CHAR(40) NOT NULL,
  `lookup_hash` CHAR(64) NOT NULL,
  `code_hash` CHAR(64) NOT NULL,
  `reset_token_hash` CHAR(64) NULL,
  `status` ENUM('pending','verified','used','expired','locked') NOT NULL DEFAULT 'pending',
  `attempts_remaining` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `delivery_status` ENUM('development','sent','failed','not_applicable') NOT NULL DEFAULT 'not_applicable',
  `ip_address_hash` CHAR(64) NOT NULL,
  `user_agent` VARCHAR(255) NULL,
  `expires_at` DATETIME NOT NULL,
  `verified_until` DATETIME NULL,
  `requested_at` DATETIME NOT NULL,
  `verified_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  UNIQUE KEY `uq_password_reset_selector` (`selector`),
  KEY `idx_password_reset_lookup` (`lookup_hash`, `requested_at`),
  KEY `idx_password_reset_user` (`user_id`, `status`, `requested_at`),
  KEY `idx_password_reset_ip` (`ip_address_hash`, `requested_at`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET @has_password_changed_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='aurora_db' AND TABLE_NAME='users' AND COLUMN_NAME='password_changed_at'
);
SET @password_changed_sql := IF(
  @has_password_changed_at=0,
  'ALTER TABLE `users` ADD COLUMN `password_changed_at` DATETIME NULL',
  'SELECT 1'
);
PREPARE password_changed_stmt FROM @password_changed_sql;
EXECUTE password_changed_stmt;
DEALLOCATE PREPARE password_changed_stmt;
