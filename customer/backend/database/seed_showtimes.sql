USE `aurora_db`;

-- Idempotent schedule data: existing showtimes are kept intact.
-- Every theater has a different timetable for each currently available movie.
-- Run after seed_movies.sql, seed_theaters.sql and seed_seats.sql.
INSERT INTO `showtimes` (`movie_id`, `screen_id`, `starts_at`, `ends_at`, `ticket_price`, `status`)
SELECT
  m.id,
  (SELECT MIN(s.id) FROM screens s WHERE s.theater_id = t.id),
  DATE_ADD(CONCAT(day_list.show_date, ' 09:00:00'), INTERVAL (MOD((m.id * 71) + (t.id * 37) + (slot.slot_no * 167), 620)) MINUTE),
  DATE_ADD(
    DATE_ADD(CONCAT(day_list.show_date, ' 09:00:00'), INTERVAL (MOD((m.id * 71) + (t.id * 37) + (slot.slot_no * 167), 620)) MINUTE),
    INTERVAL m.duration_minutes MINUTE
  ),
  85000 + (t.id * 5000) + (slot.slot_no * 10000) + IF(m.format LIKE '%IMAX%' OR m.format LIKE '%4DX%', 25000, 0),
  'OPEN'
FROM movies m
CROSS JOIN theaters t
CROSS JOIN (SELECT '2026-09-04' AS show_date UNION ALL SELECT '2026-09-05' UNION ALL SELECT '2026-09-06' UNION ALL SELECT '2026-09-07' UNION ALL SELECT '2026-09-08' UNION ALL SELECT '2026-09-09' UNION ALL SELECT '2026-09-10') day_list
CROSS JOIN (SELECT 0 AS slot_no UNION ALL SELECT 1 UNION ALL SELECT 2) slot
WHERE m.status IN ('NOW_SHOWING', 'SPECIAL_SHOWING')
  AND EXISTS (SELECT 1 FROM screens s2 WHERE s2.theater_id = t.id)
  AND NOT EXISTS (
    SELECT 1 FROM showtimes existing
    WHERE existing.movie_id = m.id
      AND DATE(existing.starts_at) = day_list.show_date
      AND existing.screen_id = (SELECT MIN(s4.id) FROM screens s4 WHERE s4.theater_id = t.id)
      AND TIME(existing.starts_at) = TIME(DATE_ADD(CONCAT(day_list.show_date, ' 09:00:00'), INTERVAL (MOD((m.id * 71) + (t.id * 37) + (slot.slot_no * 167), 620)) MINUTE))
  );
