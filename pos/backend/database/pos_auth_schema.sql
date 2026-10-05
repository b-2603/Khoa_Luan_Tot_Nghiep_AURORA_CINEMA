USE aurora_db;

-- Nguồn tài khoản vận hành POS. Tách với users khách hàng để quyền tại quầy
-- không bị lẫn với tài khoản thành viên Aurora.
CREATE TABLE IF NOT EXISTS pos_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NULL,
  role ENUM('cashier','supervisor','admin') NOT NULL DEFAULT 'cashier',
  status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
  theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  counter_code VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uq_pos_users_username (username),
  KEY idx_pos_users_theater (theater_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_login_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  username VARCHAR(60) NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  is_success TINYINT(1) NOT NULL DEFAULT 0,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pos_login_user_created (user_id, created_at),
  KEY idx_pos_login_username_created (username, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Mật khẩu mẫu: cashier = 8888, admin = admin123. Môi trường thật cần đổi
-- trong trang quản trị; hash có tiền tố để backend PHP 5.2 tương thích.
INSERT INTO pos_users (username, password_hash, full_name, phone, role, status, theater_id, counter_code, updated_at)
VALUES
  ('0328754062', 'sha256:aurora-pos-local-2026:656c6be16cea56dda370ca4ceb71f8a0020454de65a69d1259598aac257116a2', 'Nguyễn Trần Thái Bảo', '0328754062', 'cashier', 'active', 1, 'AURORA BOX 02', NOW()),
  ('admin', 'sha256:aurora-pos-local-2026:93c0b2d7afeca1d4d6d06c1608a11e04eaadadc5734dd0f3ce6501c2abab558c', 'Quản lý ca trực Aurora', '0328754000', 'admin', 'active', 1, 'AURORA BOX 01', NOW())
ON DUPLICATE KEY UPDATE
  username = VALUES(username);
