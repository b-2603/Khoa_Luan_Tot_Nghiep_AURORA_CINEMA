-- ============================================================
-- AURORA CINEMA – Mascot 3D System Database Migration
-- Database: aurora_db
-- Mô tả: Lưu trữ cấu hình, sự kiện và thống kê linh vật 3D
-- ============================================================
USE aurora_db;

-- Bảng cấu hình linh vật 3D (admin có thể tuỳ chỉnh)
CREATE TABLE IF NOT EXISTS mascot_3d_config (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(60) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  label VARCHAR(120) NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mascot_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Seed dữ liệu cấu hình mặc định
INSERT IGNORE INTO mascot_3d_config (config_key, config_value, label) VALUES
('body_color',       '#F7D25E', 'Màu thân chính (vàng ngôi sao)'),
('accent_color',     '#0F1B3D', 'Màu nhấn (xanh navy)'),
('cheek_color',      '#FFB8C6', 'Màu má hồng'),
('eye_color',        '#1A1A3A', 'Màu mắt'),
('scarf_color',      '#0F1B3D', 'Màu khăn choàng'),
('film_color',       '#2C3E6A', 'Màu cuộn phim'),
('mascot_name',      'Aurora',  'Tên linh vật'),
('mascot_slogan',    'Cùng bạn tận hưởng mọi khoảnh khắc điện ảnh!', 'Slogan hiển thị'),
('idle_animation',   'float',   'Animation khi không hoạt động (float/bounce/sway)'),
('enable_shadow',    '1',       'Hiển thị bóng đổ'),
('enable_particles', '1',       'Hiển thị hiệu ứng hạt'),
('scale_factor',     '1.0',     'Tỷ lệ kích thước linh vật'),
('ambient_light',    '0.6',     'Cường độ ánh sáng môi trường'),
('point_light_x',    '5',       'Vị trí X đèn điểm'),
('point_light_y',    '10',      'Vị trí Y đèn điểm'),
('point_light_z',    '8',       'Vị trí Z đèn điểm'),
('engine',           'AURORA_CINEMATIC_RIG_V3', 'Bộ máy chuyển động'),
('engine_version',   '3.0.0',     'Phiên bản bộ máy'),
('asset_root',       '/assets/aurora-assistant', 'Thư mục tài nguyên'),
('asset_version',    '3',         'Phiên bản tài nguyên'),
('config_schema_version', '2',    'Phiên bản cấu hình');

-- Bảng ghi nhận sự kiện tương tác với linh vật (phân tích hành vi người dùng)
CREATE TABLE IF NOT EXISTS mascot_3d_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(50) NOT NULL COMMENT 'CLICK, HOVER, EXPRESSION_CHANGE, POSE_CHANGE, OPEN_CHAT, CLOSE_CHAT, RUN_ACTION, OPEN_MOVIE, POSE_VIEW, IDLE_TIMEOUT',
  expression VARCHAR(30) NULL,
  pose VARCHAR(30) NULL,
  page_context VARCHAR(80) NULL,
  metadata_json TEXT NULL,
  ip_hash CHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mascot_event_user (user_id, created_at),
  KEY idx_mascot_event_type (event_type, created_at),
  KEY idx_mascot_event_session (session_key, created_at),
  CONSTRAINT fk_mascot_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Bảng thống kê tổng hợp theo ngày (cho dashboard admin)
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

-- Đồng bộ database cũ với runtime PHP; có thể chạy lặp lại an toàn.
ALTER TABLE mascot_3d_config CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE mascot_3d_events CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE mascot_3d_daily_stats CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;

-- View tổng hợp nhanh cho admin dashboard
CREATE OR REPLACE VIEW mascot_3d_stats_summary AS
SELECT
  COUNT(*)                                          AS total_events_all_time,
  COUNT(DISTINCT COALESCE(CAST(user_id AS CHAR), CONCAT('guest:', session_key))) AS unique_users_all_time,
  SUM(CASE WHEN event_type = 'OPEN_CHAT' THEN 1 ELSE 0 END) AS total_chat_opens,
  SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS events_last_7d,
  SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS events_today
FROM mascot_3d_events;
