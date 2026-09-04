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

## Cấu hình kết nối MySQL
- Host: `127.0.0.1`
- Port: `3306`
- Database: `aurora_db`
- Username: `root`
- Password: `(để trống)`

## API đang dùng
- `GET /public/api/me`
- `GET /public/api/movies`
- `GET /public/api/theaters`
- `POST /public/api/logout`
- `POST /public/api/register`
- `POST /public/api/login`
