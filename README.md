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

## Chạy từng module

### Customer frontend
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\customer\frontend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### EMS
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\ems"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### TMS
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\tms"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

### POS
```powershell
cd "D:\HỌC TẬP CỦA BẢO\wamp\www\AURORA CINEMA\pos"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
npm run dev
```

## Port mặc định

- Customer Frontend: 3000
- EMS: 3001
- TMS: 3002
- POS: 3003

## Mục tiêu phát triển

- Customer: đặt vé, xem phim, thông tin thành viên
- EMS: quản lý nhân sự, ca làm, đào tạo
- TMS: quản lý suất chiếu và đặt vé
- POS: thanh toán và bán hàng tại quầy
