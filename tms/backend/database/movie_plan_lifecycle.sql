-- Aurora Cinema - vòng đời kế hoạch phim
-- Không xóa dữ liệu lịch sử; chỉ khóa kế hoạch hết hạn khỏi luồng lập lịch mới.

UPDATE movie_allocations
SET status = 'expired'
WHERE allocated_end_date < CURDATE()
  AND status IN ('pending', 'confirmed', 'deploying');

UPDATE movie_plans
SET status = 'completed', updated_at = NOW()
WHERE expected_end_date < CURDATE()
  AND status IN ('published', 'in_progress');

CREATE INDEX idx_movie_allocations_lifecycle
    ON movie_allocations (theater_id, allocated_end_date, status);

CREATE INDEX idx_movie_plans_lifecycle
    ON movie_plans (expected_end_date, status);
