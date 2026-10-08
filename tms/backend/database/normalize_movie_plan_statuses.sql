-- Chuẩn hóa luồng kế hoạch do Admin Tổng ban hành:
-- Nháp -> Đã ban hành -> Đang triển khai -> Hoàn tất / Hủy.
-- Các trạng thái duyệt cũ không còn dùng vì không có cấp duyệt cao hơn Admin Tổng.

UPDATE movie_plans
SET status = CASE
    WHEN status = 'pending_approval' THEN 'draft'
    WHEN status = 'approved' THEN 'published'
    ELSE status
END,
updated_at = NOW()
WHERE status IN ('pending_approval', 'approved');
