# AURORA CINEMA

Hệ thống chuyển đổi số cho rạp chiếu phim Aurora, bao gồm các module:

- Customer: giao diện khách hàng
- EMS: Employee Management System
- TMS: Ticket Management System
- POS: Point of Sale

## Cấu trúc dự án

```text
AURORA CINEMA/
├─ customer/
│  ├─ backend/
│  └─ frontend/
├─ ems/
├─ tms/
├─ pos/
└─ README.md
```

## 🚀 Khởi chạy toàn bộ hệ thống (Chỉ 1 lần)

### Cách 1: Double-click chuột (Nhanh nhất)
- Nhấn đúp chuột vào file **`start-all.bat`** tại thư mục gốc dự án.
- Để tắt toàn bộ hệ thống cùng lúc, chỉ cần nhấn đúp chuột vào **`stop-all.bat`**.

### Cách 2: Dùng lệnh Terminal / VS Code
Tại thư mục gốc `AURORA CINEMA`:
```bash
npm start
# hoặc
npm run dev
```
Để dừng tất cả các cổng:
```bash
npm run stop
```

### Cách 3: Dùng PowerShell
```powershell
.\start-all.ps1
```

---

## Chạy từng module riêng lẻ

### Customer frontend
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\customer\frontend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### EMS
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\ems\frontend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### TMS
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\tms\frontend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### POS
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\pos\frontend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

## Port mặc định

- Customer Frontend: 3000
- POS: 5174
- TMS: 5175
- EMS: 5176

## Tài khoản đăng nhập môi trường phát triển

> Các mật khẩu bên dưới là tài khoản mẫu nội bộ cho môi trường local. Cần đổi
> mật khẩu trước khi triển khai ngoài môi trường phát triển.

### TMS — Theater Management System

| Vai trò | Tên đăng nhập | Mật khẩu | Rạp phụ trách |
|---|---|---|---|
| Admin Tổng | `admin_tong` | `8888` | Toàn hệ thống |
| Admin Rạp | `admin_rap` | `8888` | Aurora Q1 — 10 phòng, 932 ghế |
| Admin Rạp | `admin_rap_q7` | `8888` | Aurora Q7 — 8 phòng, 636 ghế |
| Admin Rạp | `admin_rap_landmark81` | `8888` | Aurora Landmark 81 — 10 phòng, 978 ghế |
| Admin Rạp | `admin_rap_thuduc` | `8888` | Aurora Thủ Đức — 8 phòng, 604 ghế |
| Admin Rạp | `admin_rap_tanbinh` | `8888` | Aurora Tân Bình — 7 phòng, 464 ghế |
| Giám sát ca | `supervisor` | `8888` | Theo quyền được phân công |
| Kế toán | `accounting` | `8888` | Toàn hệ thống theo quyền kế toán |

Admin Rạp được gán cố định bằng `theater_id` trong bảng `users` của
`aurora_db`; API chỉ cho phép xem và thao tác phòng chiếu, suất chiếu và phân
bổ phim thuộc rạp đó.

### POS — Point of Sale

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Thu ngân / quản trị demo | `0328754062` | `8888` |
| Quản trị demo | `admin` | `admin123` |

### EMS — Employee Management System (Hệ Thống Quản Lý Nhân Sự & Đào Tạo)

> **Cơ chế đăng nhập nội bộ:**
> - **Tên đăng nhập:** Mã nhân viên chính là **Số điện thoại (SĐT)** của nhân sự.
> - **Mật khẩu khởi tạo mặc định:** `8888` (có thể đổi mật khẩu sau khi đăng nhập trong trang Hồ Sơ).
> - **Quy định cấp phát:** Tài khoản nhân viên do Quản lý Nhân sự tạo; Tài khoản quản lý do Admin tổng cấp.

| Vai trò / Bộ phận | Họ và Tên | Mã NV (Số Điện Thoại) | Mật khẩu mặc định | Ghi chú quyền hạn |
|---|---|---|---|---|
| **Quản lý Nhân sự & Đào tạo** | Phạm Thu Hương | `0988888888` | `8888` | Toàn quyền quản trị nhân sự, duyệt ca, xếp lịch AI, tạo khóa học & đề thi |
| **Nhân viên Vé & CSKH** | Nguyễn Văn Minh | `0901234567` | `8888` | Chấm công Face ID, xem ca làm, đăng ký ca, học tập & thi định kỳ |
| **Nhân viên Bắp nước Popcorn** | Trần Thị Mai | `0912345678` | `8888` | Chấm công Face ID, xem ca làm, đăng ký ca, học tập & thi định kỳ |
| **Nhân viên Kỹ thuật Chiếu phim** | Lê Hoàng Nam | `0923456789` | `8888` | Chấm công Face ID, xem ca làm, đăng ký ca, học tập & thi định kỳ |
| **Nhân viên Phục vụ** | Nguyễn Trần Thái Bảo | `0395852972` | `8888` | Tài khoản nhân sự hoạt động tại rạp |

### Customer — Website khách hàng

Khách hàng tự tạo tài khoản tại màn hình **Đăng ký** bằng email và mật khẩu
của mình. Không có mật khẩu mẫu cố định để tránh dùng chung tài khoản khách
hàng trong dữ liệu `aurora_db`.

## Mục tiêu phát triển

- Customer: đặt vé, xem phim, thông tin thành viên
- EMS: quản lý nhân sự, ca làm, đào tạo
- TMS: quản lý suất chiếu và đặt vé
- POS: thanh toán và bán hàng tại quầy
