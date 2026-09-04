USE `aurora_db`;

-- Chạy một lần trên database đã tồn tại trước khi bật chức năng đặt vé.
ALTER TABLE `booking_seats`
  ADD COLUMN `showtime_id` BIGINT UNSIGNED NULL AFTER `booking_id`;

UPDATE `booking_seats` bs
INNER JOIN `bookings` b ON b.id = bs.booking_id
SET bs.showtime_id = b.showtime_id
WHERE bs.showtime_id IS NULL;

ALTER TABLE `booking_seats`
  MODIFY `showtime_id` BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT `fk_booking_seats_showtime` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE CASCADE,
  DROP INDEX `unique_booked_seat`,
  ADD UNIQUE KEY `unique_booked_seat` (`showtime_id`, `seat_id`);
