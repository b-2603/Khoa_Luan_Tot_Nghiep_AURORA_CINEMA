# POS Backend

Backend được dựng theo cấu trúc Laravel-style nhưng tối giản, dễ hiểu và phù hợp với mô hình WAMP + React + MySQL.

## Cấu trúc

```text
pos/backend/
├─ app/
│  ├─ Http/
│  │  └─ Controllers/
│  │     └─ Api/
│  │        └─ V1/
│  │           ├─ AuthController.php
│  │           └─ HealthController.php
│  ├─ Models/
│  │  └─ PosUser.php
│  ├─ Services/
│  │  └─ AuthService.php
│  └─ Support/
│     └─ Database.php
├─ config/
│  └─ app.php
├─ database/
│  └─ schema.sql
├─ public/
│  └─ api.php
├─ routes/
│  └─ api.php
├─ .env.example
└─ README.md
```

## Mục đích

- Xử lý đăng nhập POS
- Cung cấp API cho frontend React
- Tách biệt logic nghiệp vụ và controller
- Dễ mở rộng cho quản lý hóa đơn, nhân viên, hàng hóa

## Database mặc định

Sử dụng MySQL với DB name là `aurora_pos`.

### Ví dụ `.env`

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aurora_pos
DB_USERNAME=root
DB_PASSWORD=
```

## API gốc

- `GET ?action=health`
- `POST ?action=login`
- `GET ?action=me`
- `POST ?action=logout`

## Bước chạy

1. Tạo database `aurora_pos` trong MySQL.
2. Chạy SQL trong `database/schema.sql`.
3. Truy cập frontend POS và đăng nhập bằng tài khoản demo.

## Tài khoản demo

- Username: `admin`
- Password: `admin123`
