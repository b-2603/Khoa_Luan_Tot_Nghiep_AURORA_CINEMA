-- ==============================================================================
-- Cấu hình OAuth Google & Facebook và Sandbox Mode cho Aurora Cinema
-- Cơ sở dữ liệu: aurora_db
-- ==============================================================================

USE `aurora_db`;

-- Đảm bảo bảng system_configs tồn tại
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL UNIQUE,
  `config_value` TEXT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Khởi tạo cấu hình OAuth trong database aurora_db
INSERT INTO `system_configs` (`config_key`, `config_value`, `description`, `updated_at`)
VALUES
  ('oauth_google_client_id', '', 'Google OAuth 2.0 Web Client ID từ Google Cloud Console', NOW()),
  ('oauth_google_client_secret', '', 'Google OAuth 2.0 Client Secret từ Google Cloud Console', NOW()),
  ('oauth_google_redirect_uri', 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=google', 'Google OAuth 2.0 Redirect URI', NOW()),
  ('oauth_facebook_client_id', '', 'Meta App ID cho Facebook Login từ Meta for Developers', NOW()),
  ('oauth_facebook_client_secret', '', 'Meta App Secret cho Facebook Login', NOW()),
  ('oauth_facebook_redirect_uri', 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=facebook', 'Facebook Login Redirect URI', NOW()),
  ('oauth_sandbox_enabled', '1', 'Chế độ mô phỏng Facebook khi chưa có cấu hình thật; Google luôn yêu cầu OAuth 2.0 thật', NOW())
ON DUPLICATE KEY UPDATE
  `updated_at` = NOW();
