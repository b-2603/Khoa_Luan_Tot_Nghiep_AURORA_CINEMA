USE aurora_db;

-- Tài khoản mạng xã hội được tách khỏi users để một khách hàng có thể liên kết
-- cả Google và Facebook. Access/refresh token không được lưu trong database.
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('google', 'facebook') NOT NULL,
  provider_user_id VARCHAR(191) NOT NULL,
  provider_email VARCHAR(180) NULL,
  provider_name VARCHAR(120) NULL,
  avatar_url VARCHAR(500) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_oauth_provider_identity (provider, provider_user_id),
  UNIQUE KEY uq_oauth_user_provider (user_id, provider),
  KEY idx_oauth_provider_email (provider_email),
  CONSTRAINT fk_oauth_accounts_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Nhật ký kỹ thuật của từng lần bắt đầu/kết thúc OAuth. Chỉ lưu trạng thái,
-- định danh đã băm và lỗi an toàn; tuyệt đối không lưu access/refresh token.
CREATE TABLE IF NOT EXISTS oauth_login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  provider ENUM('google', 'facebook') NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  provider_user_id VARCHAR(191) NULL,
  state_hash CHAR(64) NOT NULL,
  status ENUM('started', 'succeeded', 'failed') NOT NULL DEFAULT 'started',
  error_code VARCHAR(60) NULL,
  error_message VARCHAR(255) NULL,
  ip_address_hash CHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  completed_at DATETIME NULL,
  KEY idx_oauth_attempt_provider_status (provider, status, created_at),
  KEY idx_oauth_attempt_user (user_id, created_at),
  CONSTRAINT fk_oauth_attempt_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
