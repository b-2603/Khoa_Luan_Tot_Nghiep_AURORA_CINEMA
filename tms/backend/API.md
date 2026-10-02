# Aurora Cinema TMS API

Base URL: `/tms/backend/public/api.php`

TMS dùng chung `aurora_db` với customer và POS. API chạy trên PHP/MySQLi để tương thích WAMP PHP 5.2, nhưng mọi truy cập quản trị đều dùng phiên PHP ở máy chủ.

## Xác thực

- `POST ?action=login` — body JSON: `{ "username": "admin_tong", "password": "..." }`
- `GET ?action=me` — trả về người dùng của phiên hiện tại.
- `POST ?action=logout` — hủy phiên hiện tại.
- `GET ?action=health` — kiểm tra dịch vụ, không yêu cầu đăng nhập.

Frontend phải luôn gửi cookie (`credentials: 'include'`). API không chấp nhận header hoặc query string để mạo danh người dùng.

Các tài khoản local được seed bởi `database/seed_tms_admin_users.sql`; mật khẩu khởi tạo là `8888` và phải thay đổi trước khi triển khai thực tế.

## Phân quyền

| Vai trò | Phạm vi |
| --- | --- |
| `super_admin` | Quản trị hệ thống, tài khoản, phim, cấu hình và báo cáo toàn chuỗi |
| `cinema_admin` | Điều hành cụm rạp, lịch chiếu, nhân sự và vận hành |
| `supervisor` | Theo dõi ca trực, phòng chiếu và nghiệp vụ cần giám sát |
| `accounting` | Đối soát, giá vé, giao dịch và hoàn tiền |

Session được đối chiếu lại với bảng `users` ở mỗi request; tài khoản bị khóa hoặc đổi quyền sẽ mất hiệu lực ngay.

## Endpoint

- `GET ?action=dashboard` — KPI và vận hành.
- `GET ?action=revenue` — doanh thu thực tế theo ngày từ booking/order đã thanh toán.
- `GET ?action=report&from=YYYY-MM-DD&to=YYYY-MM-DD` — tổng hợp doanh thu, kênh và phương thức thanh toán.
- `GET ?action=transactions`, `GET ?action=refunds`, `POST|PUT ?action=refunds` — giao dịch và hoàn tiền.
- `GET ?action=seats&screen_id={id}` — sơ đồ ghế.
- `GET ?action=roles` — ma trận phân quyền.

Các resource `movies`, `screens`, `schedules`, `staff`, `ticket-types`, `products`, `vouchers`, `customers`, `theaters`, `promotions`, `movie-plans`, `movie-allocations` hỗ trợ `GET`; resource được cấp quyền hỗ trợ thêm `POST`, `PUT`, `DELETE` theo nghiệp vụ.

## Quy ước phản hồi

Mọi phản hồi đều có dạng:

```json
{ "success": true, "data": {} }
```

Lỗi trả về `{ "success": false, "message": "..." }` cùng HTTP status phù hợp (`400`, `401`, `403`, `404`, `409`, `422`, `500`).
