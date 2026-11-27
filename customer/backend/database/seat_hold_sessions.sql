SET NAMES utf8;
USE `aurora_db`;

-- Một phiên chọn ghế chỉ có một mốc hết hạn. Thay đổi danh sách ghế không
-- được gia hạn lại đồng hồ 10 phút.
CREATE TABLE IF NOT EXISTS seat_hold_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  showtime_id BIGINT UNSIGNED NOT NULL,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_seat_hold_session (showtime_id, session_key),
  KEY idx_seat_hold_session_expiry (expires_at),
  CONSTRAINT fk_seat_hold_session_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
