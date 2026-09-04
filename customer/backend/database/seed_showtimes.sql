USE `aurora_db`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `showtimes`;
SET FOREIGN_KEY_CHECKS = 1;

-- Tao mot suat cho tung phim tai tung cum rap.
-- Moi cap movie/theater co thoi gian rieng, bat dau tu ngay demo 04/09/2026.
INSERT INTO `showtimes` (`movie_id`, `screen_id`, `starts_at`, `ends_at`, `ticket_price`, `status`)
SELECT
  m.id,
  (SELECT MIN(s.id) FROM screens s WHERE s.theater_id = t.id),
  DATE_ADD('2026-09-04 08:00:00', INTERVAL (MOD((m.id - 1) * 83, 660) + (t.id - 1) * 17) MINUTE),
  DATE_ADD(
    DATE_ADD('2026-09-04 08:00:00', INTERVAL (MOD((m.id - 1) * 83, 660) + (t.id - 1) * 17) MINUTE),
    INTERVAL m.duration_minutes MINUTE
  ),
  95000 + (t.id * 5000) + IF(m.format LIKE '%IMAX%' OR m.format LIKE '%4DX%', 25000, 0),
  'OPEN'
FROM movies m
CROSS JOIN theaters t
WHERE EXISTS (SELECT 1 FROM screens s2 WHERE s2.theater_id = t.id);
