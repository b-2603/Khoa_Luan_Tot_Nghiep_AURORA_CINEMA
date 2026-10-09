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
- GET action=address_provinces
- GET action=address_districts&province_code=82
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
- POST action=password_reset_request (identifier)
- POST action=password_reset_verify (requestId, code)
- POST action=password_reset_complete (requestId, resetToken, password, confirmPassword)
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
5. Facebook luôn dùng OAuth thật, không còn tài khoản mẫu hoặc form giả lập. Tạo
   một Meta App có Facebook Login, bật Client OAuth Login và Web OAuth Login, rồi
   khai báo chính xác callback sau trong **Valid OAuth Redirect URIs**:
   `http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=facebook`.
   Lưu App ID/App Secret vào `oauth_facebook_client_id` và
   `oauth_facebook_client_secret` trong `aurora_db.system_configs` hoặc các biến
   `FACEBOOK_CLIENT_ID`/`FACEBOOK_CLIENT_SECRET` trong `.env`. Nếu Meta App đang ở
   Development mode, tài khoản Facebook thật phải được thêm vào Roles/Testers;
   muốn phục vụ mọi tài khoản thì chuyển app sang Live và hoàn tất các yêu cầu Meta.
6. Khi đăng nhập Google/Facebook thành công:
   - Hồ sơ khách hàng được ghi vào bảng `users` (`role='customer'`, `status='active'`, thẻ `STANDARD`, điểm 0).
   - Quan hệ định danh OAuth được lưu vào bảng `oauth_accounts`.
   - Nhật ký kỹ thuật của phiên đăng nhập được lưu vào bảng `oauth_login_attempts`.
   - Phiên đăng nhập session (`$_SESSION['aurora_user_id']`) được kích hoạt an toàn.
   - Riêng Facebook, backend xác minh access token qua `debug_token`, kiểm tra App ID
     và User ID trước khi chấp nhận hồ sơ; access token không được lưu vào database.

Customer:

- GET action=profile
- POST action=profile_update
- POST action=profile_avatar (multipart field `avatar`, JPG/PNG, tối đa 5 MB)
- POST action=profile_avatar_delete
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
10. create_customer_avatar_uploads.sql (lịch sử và metadata ảnh đại diện trong aurora_db)
11. create_administrative_catalog.sql (tùy chọn với database cũ; API cũng tự tạo và nạp danh mục nếu bảng chưa có)
12. migrate_membership_card_numbers.sql (chuyển mã thành viên cũ sang mã số 19 chữ số và đổi cột sang BIGINT UNSIGNED)
13. fix_customer_profile_utf8.sql (bắt buộc với database WAMP cũ dùng latin1; sửa charset và phục hồi địa chỉ tiếng Việt)
14. create_customer_password_reset_requests.sql (mã xác minh, giới hạn thử và nhật ký khôi phục mật khẩu)

## Khôi phục mật khẩu

- Mã xác minh gồm 6 chữ số, hết hạn sau 10 phút, tối đa 5 lần nhập và chỉ dùng một lần.
- Backend luôn trả thông báo trung tính để không tiết lộ email/số điện thoại có tồn tại.
- Mã và reset token chỉ được lưu dạng HMAC-SHA256 trong `customer_password_reset_requests`.
- Mỗi tài khoản chỉ được yêu cầu tối đa 3 mã trong 15 phút; địa chỉ IP cũng được giới hạn.
- Ở `APP_ENV=local`, WAMP chưa có SMTP nên API trả `developmentCode` để kiểm thử đầy đủ. Ở production mã không bao giờ được trả về JSON và được gửi bằng cấu hình mail của máy chủ.
- Mật khẩu mới được băm bcrypt và phải có 8–72 ký tự, gồm chữ hoa, chữ thường và số.

## Danh mục tỉnh/thành và quận/huyện

- Hai bảng `administrative_provinces` và `administrative_districts` là nguồn dữ liệu duy nhất cho form địa chỉ.
- File `vietnam_provinces_districts_v2.4.1.json` chứa 63 tỉnh/thành và 696 quận/huyện; API tự nạp file này vào `aurora_db` theo cách idempotent khi bảng chưa đủ dữ liệu.
- `profile_update` chuẩn hóa tên tỉnh và kiểm tra quận/huyện phải thuộc đúng tỉnh trước khi ghi vào bảng `users`.
- Dữ liệu nền lấy từ bản v2.4.1 của dự án MIT `thanglequoc/vietnamese-provinces-database`, phù hợp mô hình tỉnh/thành → quận/huyện của giao diện hiện tại.

seed_showtimes.sql là script bổ sung an toàn: không truncate dữ liệu lịch chiếu,
giữ dữ liệu hiện có và chỉ thêm các suất còn thiếu theo từng rạp, phim và ngày.
