-- Bản nháp chưa được phép tạo/hiển thị phân bổ cho Admin Rạp.
-- Dọn các phân bổ sinh ra bởi phiên bản cũ trước khi áp dụng quy tắc này.

DELETE ma
FROM movie_allocations ma
INNER JOIN movie_plans mp ON mp.id = ma.plan_id
WHERE mp.status = 'draft';
