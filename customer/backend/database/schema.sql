CREATE DATABASE IF NOT EXISTS aurora_db
  CHARACTER SET utf8
  COLLATE utf8_unicode_ci;

USE aurora_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  id_number VARCHAR(30) NULL,
  birthday DATE NULL,
  gender ENUM('male','female','other') NULL,
  city VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  address VARCHAR(255) NULL,
  avatar_url VARCHAR(500) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'customer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  membership_level ENUM('STANDARD', 'SILVER', 'GOLD', 'PLATINUM') NOT NULL DEFAULT 'STANDARD',
  points INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS customer_avatar_uploads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  avatar_url VARCHAR(500) NOT NULL,
  storage_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  image_width INT UNSIGNED NOT NULL,
  image_height INT UNSIGNED NOT NULL,
  source_width INT UNSIGNED NULL,
  source_height INT UNSIGNED NULL,
  crop_offset_x DECIMAL(7,4) NULL,
  crop_offset_y DECIMAL(7,4) NULL,
  crop_zoom DECIMAL(7,4) NULL,
  crop_output_size INT UNSIGNED NULL,
  status ENUM('ACTIVE','REPLACED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_customer_avatar_user_status (user_id, status),
  CONSTRAINT fk_customer_avatar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

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
  CONSTRAINT fk_oauth_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
  CONSTRAINT fk_oauth_attempt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS theaters (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Ho Chi Minh City',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movies (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  age_rating VARCHAR(10) NOT NULL DEFAULT 'P',
  format VARCHAR(50) NOT NULL DEFAULT '2D Digital',
  poster_url VARCHAR(500) NULL,
  trailer_url VARCHAR(500) NULL,
  status ENUM('COMING_SOON', 'NOW_SHOWING', 'SPECIAL_SHOWING', 'ENDED') NOT NULL DEFAULT 'COMING_SOON',
  release_date DATE NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS screens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  theater_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(80) NOT NULL,
  total_seats SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (theater_id) REFERENCES theaters(id) ON DELETE CASCADE,
  UNIQUE KEY unique_screen_name (theater_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seats (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  screen_id BIGINT UNSIGNED NOT NULL,
  seat_row CHAR(2) NOT NULL,
  seat_number SMALLINT UNSIGNED NOT NULL,
  seat_type ENUM('STANDARD', 'VIP', 'COUPLE') NOT NULL DEFAULT 'STANDARD',
  FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seat_position (screen_id, seat_row, seat_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS showtimes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  movie_id BIGINT UNSIGNED NOT NULL,
  screen_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  ticket_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('OPEN', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
  INDEX idx_showtimes_start (starts_at),
  INDEX idx_showtimes_movie_date (movie_id, starts_at),
  INDEX idx_showtimes_screen_date (screen_id, starts_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  showtime_id BIGINT UNSIGNED NOT NULL,
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'PAID', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (showtime_id) REFERENCES showtimes(id),
  INDEX idx_booking_seats_booking (booking_id)
) ENGINE=InnoDB;

-- Nội dung hiển thị cho trang giới thiệu từng cụm rạp customer.
CREATE TABLE IF NOT EXISTS theater_profiles (
  theater_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  hero_image_url VARCHAR(500) NULL,
  short_description TEXT NULL,
  short_description_en TEXT NULL,
  description TEXT NULL,
  description_en TEXT NULL,
  highlights_json TEXT NULL,
  highlights_en_json TEXT NULL,
  facilities_json TEXT NULL,
  facilities_en_json TEXT NULL,
  opening_hours VARCHAR(120) NULL,
  contact_phone VARCHAR(30) NULL,
  map_url VARCHAR(500) NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_theater_profiles_theater FOREIGN KEY (theater_id) REFERENCES theaters(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_seats (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  showtime_id BIGINT UNSIGNED NOT NULL,
  seat_id BIGINT UNSIGNED NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE,
  FOREIGN KEY (seat_id) REFERENCES seats(id),
  UNIQUE KEY unique_booked_seat (showtime_id, seat_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_concessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  item_name VARCHAR(160) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_booking_concessions_booking (booking_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promotions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  code VARCHAR(40) NOT NULL UNIQUE,
  description TEXT NULL,
  discount_percent DECIMAL(5,2) NULL,
  discount_amount DECIMAL(10,2) NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NOT NULL UNIQUE,
  channel VARCHAR(10) NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  customer_id BIGINT UNSIGNED NULL,
  cashier_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  voucher_code VARCHAR(40) NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
  amount_received DECIMAL(12,2) NOT NULL DEFAULT 0,
  change_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  INDEX idx_orders_channel (channel),
  INDEX idx_orders_created (created_at),
  INDEX idx_orders_customer (customer_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  method VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference_code VARCHAR(80) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  INDEX idx_payments_order (order_id),
  UNIQUE KEY uq_payments_reference (reference_code)
) ENGINE=InnoDB;

-- Nội dung trang Ưu đãi dùng chung với nghiệp vụ voucher trong TMS/POS.
CREATE TABLE IF NOT EXISTS vouchers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  short_description VARCHAR(255) NULL,
  details TEXT NULL,
  terms_text TEXT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'ticket',
  audience VARCHAR(30) NOT NULL DEFAULT 'all',
  badge_text VARCHAR(60) NULL,
  theme_color VARCHAR(20) NOT NULL DEFAULT '#D99A1B',
  image_url VARCHAR(500) NULL,
  discount_type ENUM('percent','amount') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_order_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  usage_limit INT UNSIGNED NOT NULL DEFAULT 0,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_vouchers_customer (status, starts_at, ends_at, sort_order)
) ENGINE=InnoDB;

-- Danh mục địa chỉ cho hồ sơ khách hàng. Dữ liệu được nạp tự động từ
-- vietnam_provinces_districts_v2.4.1.json khi API được gọi lần đầu.
CREATE TABLE IF NOT EXISTS administrative_provinces (
  code CHAR(2) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  code_name VARCHAR(100) NOT NULL,
  dataset_version VARCHAR(30) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_administrative_province_name (name),
  KEY idx_administrative_province_active (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS administrative_districts (
  code CHAR(3) NOT NULL PRIMARY KEY,
  province_code CHAR(2) NOT NULL,
  name VARCHAR(120) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  code_name VARCHAR(120) NOT NULL,
  dataset_version VARCHAR(30) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_administrative_district_name (province_code, full_name),
  KEY idx_administrative_district_province (province_code, is_active, sort_order),
  CONSTRAINT fk_administrative_district_province FOREIGN KEY (province_code)
    REFERENCES administrative_provinces(code) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_membership_cards (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  card_number BIGINT UNSIGNED NOT NULL,
  activated_at DATETIME NOT NULL,
  expires_at DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_membership_card_user (user_id),
  UNIQUE KEY uq_membership_card_number (card_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_membership_tiers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tier_code VARCHAR(20) NOT NULL UNIQUE,
  tier_name VARCHAR(60) NOT NULL,
  min_points INT UNSIGNED NOT NULL DEFAULT 0,
  theme_color VARCHAR(20) NOT NULL,
  benefits_json TEXT NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_support_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(30) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  icon_name VARCHAR(40) NOT NULL DEFAULT 'help',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_support_faqs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(30) NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer_text TEXT NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_support_faq_category (category_code,is_active,sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customer_support_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(24) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL,
  session_key VARCHAR(128) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL DEFAULT '',
  category_code VARCHAR(30) NOT NULL,
  subject VARCHAR(180) NOT NULL,
  message_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_support_ticket_user (user_id,created_at),
  KEY idx_support_ticket_status (status,created_at)
) ENGINE=InnoDB;

-- Aurora AI assistant: chat history and guided onboarding are persisted in aurora_db.
CREATE TABLE IF NOT EXISTS customer_ai_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  onboarding_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
  preferred_genres VARCHAR(255) NULL,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  onboarding_completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_ai_profile_onboarding (onboarding_status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ai_conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_key VARCHAR(64) NOT NULL,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'vi',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_message_at DATETIME NULL,
  UNIQUE KEY uq_ai_conversation_key (conversation_key),
  KEY idx_ai_conversation_user (user_id, updated_at),
  KEY idx_ai_conversation_session (session_key, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ai_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  client_message_id VARCHAR(80) NULL,
  sender VARCHAR(20) NOT NULL,
  message_text TEXT NOT NULL,
  intent VARCHAR(50) NULL,
  metadata_json TEXT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_ai_message_client (conversation_id, sender, client_message_id),
  KEY idx_ai_message_conversation (conversation_id, id),
  KEY idx_ai_message_intent (intent, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ai_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(40) NOT NULL,
  step_key VARCHAR(60) NULL,
  metadata_json TEXT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_ai_event_user (user_id, created_at),
  KEY idx_ai_event_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Aurora cinematic mascot configuration and privacy-safe interaction telemetry.
CREATE TABLE IF NOT EXISTS mascot_3d_config (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(60) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  label VARCHAR(120) NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mascot_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT IGNORE INTO mascot_3d_config (config_key, config_value, label) VALUES
('body_color','#F7D25E','Màu hiệu ứng vàng Aurora'),
('accent_color','#0F1B3D','Màu hiệu ứng xanh navy'),
('cheek_color','#FFB8C6','Màu hiệu ứng má hồng'),
('eye_color','#1A1A3A','Màu hiệu ứng mắt'),
('scarf_color','#0F1B3D','Màu hiệu ứng khăn'),
('film_color','#2C3E6A','Màu hiệu ứng dải phim'),
('mascot_name','Aurora','Tên linh vật'),
('mascot_slogan','Cùng bạn tận hưởng mọi khoảnh khắc điện ảnh!','Slogan linh vật'),
('idle_animation','float','Chuyển động nghỉ'),
('enable_shadow','1','Hiển thị bóng đổ'),
('enable_particles','1','Hiển thị hạt sáng'),
('scale_factor','1.0','Tỷ lệ kích thước'),
('ambient_light','0.6','Độ sáng hiển thị'),
('engine','AURORA_CINEMATIC_RIG_V3','Bộ máy chuyển động'),
('engine_version','3.0.0','Phiên bản bộ máy'),
('asset_root','/assets/aurora-assistant','Thư mục tài nguyên'),
('asset_version','3','Phiên bản tài nguyên'),
('config_schema_version','2','Phiên bản cấu hình');

CREATE TABLE IF NOT EXISTS mascot_3d_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(50) NOT NULL,
  expression VARCHAR(30) NULL,
  pose VARCHAR(30) NULL,
  page_context VARCHAR(80) NULL,
  metadata_json TEXT NULL,
  ip_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mascot_event_user (user_id, created_at),
  KEY idx_mascot_event_type (event_type, created_at),
  KEY idx_mascot_event_session (session_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS mascot_3d_daily_stats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  stat_date DATE NOT NULL,
  total_interactions INT UNSIGNED NOT NULL DEFAULT 0,
  unique_users INT UNSIGNED NOT NULL DEFAULT 0,
  chat_opens INT UNSIGNED NOT NULL DEFAULT 0,
  most_popular_expression VARCHAR(30) NULL,
  most_popular_pose VARCHAR(30) NULL,
  avg_session_duration_sec DECIMAL(8,2) NULL,
  computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mascot_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE OR REPLACE VIEW mascot_3d_stats_summary AS
SELECT
  COUNT(*) AS total_events_all_time,
  COUNT(DISTINCT COALESCE(CAST(user_id AS CHAR), CONCAT('guest:', session_key))) AS unique_users_all_time,
  SUM(CASE WHEN event_type = 'OPEN_CHAT' THEN 1 ELSE 0 END) AS total_chat_opens,
  SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS events_last_7d,
  SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS events_today
FROM mascot_3d_events;
