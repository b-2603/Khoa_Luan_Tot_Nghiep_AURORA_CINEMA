-- Mỗi Admin Rạp chỉ phụ trách duy nhất một rạp (users.theater_id).
-- Mật khẩu khởi tạo cho các tài khoản bên dưới: 8888

UPDATE users
SET theater_id = 1, role = 'cinema_admin', status = 'active', updated_at = NOW()
WHERE username = 'admin_rap';

INSERT INTO users
    (username, password_hash, full_name, email, phone, id_number, role, status, theater_id, membership_level, points, created_at, updated_at)
VALUES
    ('admin_rap_q7', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'Admin Aurora Q7', 'admin.q7@aurora.local', '0901234568', 'TMS-CA-002', 'cinema_admin', 'active', 2, 'STANDARD', 0, NOW(), NOW()),
    ('admin_rap_landmark81', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'Admin Aurora Landmark 81', 'admin.landmark81@aurora.local', '0901234569', 'TMS-CA-003', 'cinema_admin', 'active', 3, 'STANDARD', 0, NOW(), NOW()),
    ('admin_rap_thuduc', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'Admin Aurora Thu Duc', 'admin.thuduc@aurora.local', '0901234570', 'TMS-CA-004', 'cinema_admin', 'active', 4, 'STANDARD', 0, NOW(), NOW()),
    ('admin_rap_tanbinh', 'sha256:aurora-tms-local-2026:20139c9d59732a9ff650bc6dc030dbdd3eee135ffae7ac6303a4d34c340b8f8e', 'Admin Aurora Tan Binh', 'admin.tanbinh@aurora.local', '0901234571', 'TMS-CA-005', 'cinema_admin', 'active', 5, 'STANDARD', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash), full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone),
    id_number = VALUES(id_number), role = 'cinema_admin', status = 'active', theater_id = VALUES(theater_id), updated_at = NOW();
