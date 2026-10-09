USE `aurora_db`;

-- Actor mới dùng chung bảng users của toàn hệ thống.
-- role hiện tại là VARCHAR(30); nếu một bản cài đặt cũ dùng ENUM thì chạy dòng
-- ALTER tương ứng trước khi tạo tài khoản Marketing Manager.
-- ALTER TABLE users MODIFY role ENUM('customer','super_admin','cinema_admin','supervisor','accounting','marketing_manager') NOT NULL DEFAULT 'customer';

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  objective VARCHAR(255) NULL,
  channel VARCHAR(80) NOT NULL DEFAULT 'Đa kênh',
  budget DECIMAL(14,2) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('draft','planned','running','paused','completed') NOT NULL DEFAULT 'draft',
  owner_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_marketing_campaign_status (status,start_date,end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_promotions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  promotion_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  discount_type ENUM('percent','amount','gift') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  approval_status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
  status ENUM('inactive','active','expired') NOT NULL DEFAULT 'inactive',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_vouchers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  voucher_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  discount_type ENUM('percent','amount') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INT UNSIGNED NOT NULL DEFAULT 0,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('draft','active','paused','expired') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_contents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content_type ENUM('banner','featured_movie','news') NOT NULL DEFAULT 'banner',
  placement VARCHAR(100) NOT NULL DEFAULT 'Trang chủ',
  summary TEXT NULL,
  media_url VARCHAR(500) NULL,
  publish_at DATETIME NULL,
  status ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  channel ENUM('email','push','sms','in_app') NOT NULL DEFAULT 'in_app',
  audience VARCHAR(160) NOT NULL DEFAULT 'Tất cả khách hàng',
  message TEXT NULL,
  scheduled_at DATETIME NULL,
  sent_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('draft','scheduled','sent','cancelled') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_customer_segments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description VARCHAR(255) NULL,
  criteria_json TEXT NULL,
  estimated_size INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
