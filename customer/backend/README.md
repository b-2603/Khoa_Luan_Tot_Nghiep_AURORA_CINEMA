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

Import dữ liệu theo đúng thứ tự: `schema.sql`, `seed_theaters.sql`, `seed_movies.sql`, `seed_showtimes.sql`, sau đó `seed_seats.sql`. Database cũ cần chạy thêm `alter_booking_seats.sql` một lần.

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

Authentication:

- POST action=register (fullName, email, password)
- POST action=login (email, password)
- GET action=me
- POST action=logout

Customer:

- GET action=profile
- POST action=profile_update
- POST action=change_password
- POST action=bookings (showtimeId, seatIds[])
- GET action=booking_history

Đặt vé được xử lý trong transaction và khóa suất chiếu/ghế khi kiểm tra,
tránh hai khách đặt trùng ghế. API không trả về password hash.

## Khởi tạo database

Chạy theo thứ tự:

1. schema.sql
2. alter_users_profile.sql (chỉ cần với database cũ)
3. seed_theaters.sql
4. seed_movies.sql
5. seed_seats.sql
6. alter_booking_seats.sql (chỉ cần với database cũ)
7. seed_showtimes.sql

seed_showtimes.sql là script bổ sung an toàn: không truncate dữ liệu lịch chiếu,
giữ dữ liệu hiện có và chỉ thêm các suất còn thiếu theo từng rạp, phim và ngày.
