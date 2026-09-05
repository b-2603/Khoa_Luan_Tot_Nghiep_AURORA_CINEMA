# Aurora Cinema TMS API

Base URL: `/tms/backend/public/api.php`

## Xác thực

- `POST ?action=login` với JSON `{ "username": "admin", "password": "8888" }`
- `GET ?action=me`
- `GET ?action=logout`

Các request `POST`, `PUT`, `DELETE` quản trị yêu cầu session đăng nhập. Frontend phải gửi cookie session với `credentials: 'include'`.

## Dashboard và báo cáo

- `GET ?action=dashboard`: KPI, doanh thu 7 ngày, top phim, phòng, suất chiếu.
- `GET ?action=report&from=2026-06-01&to=2026-06-07`: tổng hợp và chi tiết doanh thu.
- `GET ?action=transactions`: danh sách giao dịch.
- `GET ?action=refunds`: danh sách yêu cầu hoàn tiền.
- `PUT ?action=refunds&id=1` với `{ "status": "approved" | "rejected" | "completed" }`.

## CRUD tài nguyên

Các resource `movies`, `screens`, `schedules`, `staff`, `ticket-types`, `products`, `vouchers`, `customers` hỗ trợ:

- `GET ?action=<resource>&q=keyword&status=active`
- `POST ?action=<resource>` để tạo mới.
- `PUT ?action=<resource>&id=1` để cập nhật.
- `DELETE ?action=<resource>&id=1` để xóa.

Riêng `schedules` nhận thêm `date=YYYY-MM-DD`; `GET ?action=seats&screen_id=1` trả sơ đồ ghế của phòng.

## Cài đặt database

Chạy `backend/database/schema.sql` trên MySQL database `aurora_tms` trước khi gọi các API CRUD. File schema bao gồm các bảng cũ và bảng mới cho giá vé, hàng hóa, voucher, khách hàng, giao dịch, hoàn tiền và ghế.
