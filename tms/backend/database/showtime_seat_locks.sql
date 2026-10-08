USE aurora_db;

-- Ghế bị rạp khóa được lưu riêng theo từng suất chiếu. Một ghế vật lý có thể
-- được khóa ở suất này nhưng vẫn mở bán bình thường ở suất khác.
CREATE TABLE IF NOT EXISTS tms_showtime_seat_locks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    showtime_id BIGINT UNSIGNED NOT NULL,
    seat_id BIGINT UNSIGNED NOT NULL,
    reason VARCHAR(255) NOT NULL DEFAULT '',
    locked_by VARCHAR(120) NOT NULL,
    locked_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_tms_showtime_seat_lock (showtime_id, seat_id),
    KEY idx_tms_showtime_seat_lock_seat (seat_id),
    CONSTRAINT fk_tms_seat_lock_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE,
    CONSTRAINT fk_tms_seat_lock_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Nhật ký giúp truy vết người khóa/mở khóa và lý do vận hành.
CREATE TABLE IF NOT EXISTS tms_showtime_seat_lock_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    showtime_id BIGINT UNSIGNED NOT NULL,
    seat_id BIGINT UNSIGNED NOT NULL,
    action_name VARCHAR(20) NOT NULL,
    reason VARCHAR(255) NOT NULL DEFAULT '',
    performed_by VARCHAR(120) NOT NULL,
    created_at DATETIME NOT NULL,
    KEY idx_tms_seat_lock_log_showtime (showtime_id),
    KEY idx_tms_seat_lock_log_seat (seat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
