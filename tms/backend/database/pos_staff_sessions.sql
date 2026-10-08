-- Quản lý nhân viên bán hàng và phiên quầy trên aurora_db.
USE aurora_db;

ALTER TABLE pos_users ADD COLUMN employee_code VARCHAR(30) NULL;
ALTER TABLE pos_users ADD COLUMN issued_by_tms_user_id BIGINT UNSIGNED NULL;
ALTER TABLE pos_users ADD COLUMN issued_by_name VARCHAR(120) NULL;
ALTER TABLE pos_users ADD COLUMN updated_by_tms_user_id BIGINT UNSIGNED NULL;
ALTER TABLE pos_users ADD COLUMN updated_by_name VARCHAR(120) NULL;
CREATE UNIQUE INDEX uq_pos_users_theater_employee ON pos_users (theater_id, employee_code);

ALTER TABLE pos_shifts ADD COLUMN expected_cash DECIMAL(12,2) NULL;
ALTER TABLE pos_shifts ADD COLUMN cash_difference DECIMAL(12,2) NULL;
ALTER TABLE pos_shifts ADD COLUMN sales_areas VARCHAR(255) NOT NULL DEFAULT 'box_office';
ALTER TABLE pos_shifts ADD COLUMN close_note TEXT NULL;
ALTER TABLE pos_shifts ADD COLUMN closed_by VARCHAR(120) NULL;
ALTER TABLE pos_shifts ADD COLUMN work_schedule_id BIGINT UNSIGNED NULL;

ALTER TABLE orders ADD COLUMN pos_shift_id BIGINT UNSIGNED NULL;
CREATE INDEX idx_orders_pos_shift ON orders (pos_shift_id);

CREATE TABLE IF NOT EXISTS pos_work_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS pos_management_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  theater_id BIGINT UNSIGNED NOT NULL,
  pos_user_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_name VARCHAR(120) NOT NULL,
  action_name VARCHAR(50) NOT NULL,
  detail VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_pos_management_theater_created (theater_id, created_at),
  KEY idx_pos_management_user_created (pos_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- API TMS/POS tự kiểm tra từng cột trước khi nâng cấp, nên không cần chạy
-- thủ công file này trên hệ thống đang hoạt động.
