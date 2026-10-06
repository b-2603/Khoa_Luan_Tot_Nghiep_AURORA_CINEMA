# Customer Backend

Backend phục vụ phân hệ Khách hàng (Customer Web) của Aurora Cinema.

## Công nghệ & Môi trường
- Laravel PHP 11, chạy trên Apache/WAMP
- MySQL `aurora_db`

## Cấu trúc thư mục

```text
backend/
├─ database/
│  ├─ schema.sql          # Khởi tạo cấu trúc MySQL cho customer
│  ├─ seed_movies.sql     # Dữ liệu phim mẫu cho aurora_db
│  └─ seed_theaters.sql   # Dữ liệu rạp + phòng chiếu cho aurora_db
│  └─ seed_showtimes.sql  # Dữ liệu suất chiếu cho từng phim và từng rạp
├─ app/Http/Controllers/
│  └─ CustomerController.php
├─ routes/api.php         # API customer
├─ public/index.php       # Laravel entrypoint
└─ README.md
```

## Nguồn dữ liệu
- Chỉ dùng MySQL `aurora_db`
- Không ghi dữ liệu sang database khác
- Không dùng script ghi dữ liệu ở `public/`

Import dữ liệu theo đúng thứ tự: `schema.sql`, `seed_theaters.sql`, `seed_movies.sql`, `seed_showtimes.sql`, sau đó `seed_seats.sql`. Database cũ cần chạy thêm `alter_booking_seats.sql` và `upgrade_customer_promotions.sql` một lần.

## Cấu hình kết nối MySQL
- Host: `127.0.0.1`
- Port: `3306`
- Database: `aurora_db`
- Username: `root`
- Password: `(để trống)`

## API đang dùng

Các endpoint chạy qua public/api.php?action=... trên WAMP và tương thích với
các route Laravel trong routes/api.php.

Public:

- GET action=health
- GET action=movies&status=NOW_SHOWING
- GET action=movie&id=1
- GET action=theaters
- GET action=showtimes&theater_id=1&movie_id=1&date=2026-09-04
- GET action=showtime_seats&showtime_id=1
- GET action=promotions
- GET action=promotion_detail&id=1

Authentication:

- POST action=register (fullName, email, password)
- POST action=login (email, password)
- GET action=oauth_start&provider=google|facebook
- GET action=oauth_status
- GET action=oauth_callback&provider=google|facebook
- GET action=me
- POST action=logout

## Cấu hình đăng nhập Google/Facebook

1. Cấu hình Google được lưu trong bảng `system_configs` của MySQL `aurora_db`
   hoặc trong file `backend/.env` (biến môi trường có giá trị ưu tiên hơn):
   - `oauth_google_client_id`, `oauth_google_client_secret`, `oauth_google_redirect_uri`
   - `oauth_facebook_client_id`, `oauth_facebook_client_secret`, `oauth_facebook_redirect_uri`
2. Tạo OAuth 2.0 Client ID loại **Web application** trong Google Cloud Console.
   Thêm chính xác `GOOGLE_REDIRECT_URI` vào **Authorized redirect URIs** của client,
   cấu hình màn hình consent và thêm tài khoản Google thật của bạn vào danh sách
   test users nếu ứng dụng đang ở chế độ Testing.
3. Điền Client ID, Client Secret và Redirect URI vào `backend/.env` (không commit
   file `.env`) hoặc lưu các giá trị tương ứng vào `aurora_db.system_configs`.
   Chạy `database/seed_oauth_configs.sql` để khởi tạo các khóa cấu hình nếu cần.
4. Google luôn xác thực trực tiếp bằng OAuth 2.0 Authorization Code + PKCE và xác
   minh email trả về từ Google. Không có tài khoản mẫu, form email giả hay sandbox
   cho Google; nút Google bị vô hiệu hóa cho đến khi Client ID và Client Secret thật
   được cấu hình. Thiếu cấu hình sẽ trả lỗi thay vì đăng nhập giả.
   Trên Windows, nếu PHP cURL cũ không xác minh được chuỗi chứng chỉ TLS của Google,
   backend chỉ chuyển sang `curl.exe` của Windows khi gặp lỗi xác minh chứng chỉ;
   `proc_open` phải được bật và xác minh HTTPS của `curl.exe` không bị tắt. Client
   Secret và token được gửi qua stdin, không đưa vào command line.
5. Facebook hiện vẫn dùng chế độ mô phỏng khi chưa cấu hình Meta OAuth; cài đặt này
   không được áp dụng cho Google.
6. Khi đăng nhập Google thành công:
   - Hồ sơ khách hàng được ghi vào bảng `users` (`role='customer'`, `status='active'`, thẻ `STANDARD`, điểm 0).
   - Quan hệ định danh OAuth được lưu vào bảng `oauth_accounts`.
   - Nhật ký kỹ thuật của phiên đăng nhập được lưu vào bảng `oauth_login_attempts`.
   - Phiên đăng nhập session (`$_SESSION['aurora_user_id']`) được kích hoạt an toàn.

Customer:

- GET action=profile
- POST action=profile_update
- POST action=change_password
- POST action=bookings (showtimeId, seatIds[])
- GET action=booking_history
- POST action=apply_voucher (code, total)

Đặt vé được xử lý trong transaction và khóa suất chiếu/ghế khi kiểm tra,
tránh hai khách đặt trùng ghế. API không trả về password hash.

## Khởi tạo database

Chạy theo thứ tự:

1. schema.sql
2. alter_users_profile.sql (chỉ cần với database cũ)
3. add_oauth_accounts.sql
4. seed_theaters.sql
5. seed_movies.sql
6. seed_seats.sql
7. alter_booking_seats.sql (chỉ cần với database cũ)
8. seed_showtimes.sql
9. upgrade_customer_promotions.sql (database cũ; bổ sung metadata và dữ liệu cho trang Ưu đãi)

seed_showtimes.sql là script bổ sung an toàn: không truncate dữ liệu lịch chiếu,
giữ dữ liệu hiện có và chỉ thêm các suất còn thiếu theo từng rạp, phim và ngày.
