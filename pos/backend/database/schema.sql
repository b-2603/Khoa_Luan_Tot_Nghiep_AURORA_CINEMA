-- Aurora POS schema (all data belongs to the shared aurora_db database).
USE aurora_db;

CREATE TABLE IF NOT EXISTS pos_counter_roles (
  code VARCHAR(30) PRIMARY KEY, name VARCHAR(80) NOT NULL, description VARCHAR(255) NOT NULL,
  can_sell_tickets TINYINT(1) NOT NULL DEFAULT 0, can_sell_concessions TINYINT(1) NOT NULL DEFAULT 0,
  can_redeem_online_booking TINYINT(1) NOT NULL DEFAULT 0, can_sell_merchandise TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0, updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NULL,
  employee_code VARCHAR(30) NULL,
  role ENUM('cashier','supervisor','admin') NOT NULL DEFAULT 'cashier',
  counter_role_code VARCHAR(30) NOT NULL DEFAULT 'box_ticket',
  status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
  theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  counter_code VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02',
  last_login_at DATETIME NULL,
  issued_by_tms_user_id BIGINT UNSIGNED NULL,
  issued_by_name VARCHAR(120) NULL,
  updated_by_tms_user_id BIGINT UNSIGNED NULL,
  updated_by_name VARCHAR(120) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uq_pos_users_username (username),
  UNIQUE KEY uq_pos_users_theater_employee (theater_id, employee_code),
  KEY idx_pos_users_theater (theater_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_shifts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  theater_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
  cinema_name VARCHAR(120) NOT NULL,
  counter VARCHAR(60) NOT NULL,
  initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  cash_at_close DECIMAL(12,2) NULL,
  expected_cash DECIMAL(12,2) NULL,
  cash_difference DECIMAL(12,2) NULL,
  sales_areas VARCHAR(255) NOT NULL DEFAULT 'box_office',
  status ENUM('active','paused','closed') NOT NULL DEFAULT 'active',
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  notes TEXT NULL,
  close_note TEXT NULL,
  closed_by VARCHAR(120) NULL,
  authorized_by_tms_user_id BIGINT UNSIGNED NULL,
  authorized_by_name VARCHAR(120) NULL,
  authorized_by_role VARCHAR(30) NULL,
  work_schedule_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL,
  KEY idx_pos_shifts_user_status (user_id, status),
  KEY idx_pos_shifts_theater (theater_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_work_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  theater_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sales_areas VARCHAR(255) NOT NULL,
  counter VARCHAR(60) NOT NULL,
  initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('scheduled','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  linked_shift_id BIGINT UNSIGNED NULL,
  notes VARCHAR(1000) NULL,
  created_by_tms_user_id BIGINT UNSIGNED NULL,
  created_by_name VARCHAR(120) NOT NULL,
  updated_by_tms_user_id BIGINT UNSIGNED NULL,
  updated_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_pos_work_assignment (theater_id,user_id,work_date,start_time),
  KEY idx_pos_work_date_status (theater_id,work_date,status),
  KEY idx_pos_work_counter (theater_id,counter,work_date)
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

-- Demo personnel. Change these initial credentials before production use.
INSERT INTO pos_users (username, password_hash, full_name, phone, role, status, theater_id, counter_code, updated_at)
VALUES
  ('0328754062', 'sha256:aurora-pos-local-2026:656c6be16cea56dda370ca4ceb71f8a0020454de65a69d1259598aac257116a2', 'Nguyễn Trần Thái Bảo', '0328754062', 'cashier', 'active', 1, 'AURORA BOX 02', NOW()),
  ('admin', 'sha256:aurora-pos-local-2026:93c0b2d7afeca1d4d6d06c1608a11e04eaadadc5734dd0f3ce6501c2abab558c', 'Quản lý ca trực Aurora', '0328754000', 'admin', 'active', 1, 'AURORA BOX 01', NOW())
ON DUPLICATE KEY UPDATE
  username = VALUES(username);
