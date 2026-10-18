# HỆ THỐNG QUẢN LÝ NHÂN SỰ & ĐÀO TẠO AURORA CINEMAS (AURORA CINEMA EMS INTEGRATED WITH SMART AI)

> **Đề tài Khóa Luận Tốt Nghiệp**: *"Quản lý rạp chiếu phim AURORA CINEMAS tích hợp AI Thông minh"*
> **Phân hệ**: **EMS (Employee Management & Training System - Hệ thống QL nhân sự & đào tạo)**

---

## 🚀 Cấu Trúc Dự Án (Tech Stack)

```
EMS_AURORA/
├── frontend/                  # ReactJS + TypeScript + Vite + Modern UI + Recharts
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar, OpenAiKeyModal, AiAssistantModal
│   │   ├── pages/             # 13 Use Case Pages (Auth, Profile, Courses, Quizzes, Certificates, Shifts, Attendance, AI)
│   │   ├── services/          # mockData.ts, storage.ts, openai.ts (GPT-4o integration)
│   │   ├── types/             # TypeScript Definitions
│   │   ├── App.tsx
│   │   └── index.css          # Aurora Cinema Custom Theme
│   ├── package.json
│   └── tsconfig.json
│
└── backend/                   # Laravel PHP RESTful API + MySQL Database Engine
    ├── app/
    │   ├── Http/Controllers/Api/   # AuthController, EmployeeController, CourseController, QuizController, ShiftController, AttendanceController
    │   └── Services/OpenAIService.php  # OpenAI GPT API caller in PHP
    ├── database/
    │   └── migrations/        # 2026_09_17_000001_create_ems_tables.php (11 MySQL Tables)
    ├── routes/
    │   └── api.php            # RESTful API Endpoints
    └── .env.example
```

---

## 📌 Bảng Ánh Xạ 13 Use Cases Từ Sơ Đồ UML Sang Mã Nguồn

| Stt | Tên Use Case UML | Actor chính | Chức năng & Giao diện ứng dụng | File mã nguồn Frontend & Backend |
| :---: | :--- | :---: | :--- | :--- |
| **UC01** | **Đăng nhập vào tài khoản EMS** | Staff / Manager | Chuyển đổi vai trò 1-click & Form đăng nhập phân quyền | `src/components/Navbar.tsx`, `AuthController.php` |
| **UC02** | **Xem hồ sơ nhân viên** | Staff | Xem thông tin cá nhân, chức vụ, bộ phận, KPI & chứng chỉ | `src/pages/ProfilePage.tsx` |
| **UC03** | **Tra cứu hồ sơ danh sách nhân viên** | Manager | Tìm kiếm, lọc theo bộ phận & xem chi tiết hồ sơ nhân sự | `src/pages/EmployeesPage.tsx`, `EmployeeController.php` |
| **UC04** | **Tạo tài khoản nhân viên** | Manager | Cấp mã nhân sự (AR-STAFF-...), gán vai trò & mật khẩu | `src/pages/CreateEmployeePage.tsx`, `EmployeeController.php` |
| **UC05** | **Học các khóa học** | Staff | Xem bài giảng slide/video nghiệp vụ rạp & CTKM | `src/pages/CoursesPage.tsx`, `CourseController.php` |
| **UC06** | **Làm kiểm tra đánh giá hàng tháng** | Staff | Thi trắc nghiệm có đồng hồ đếm ngược, chấm điểm & tự cấp chứng chỉ | `src/pages/QuizzesPage.tsx`, `QuizController.php` |
| **UC07** | **Xem các chứng chỉ đã đạt được** | Staff / Manager | Kho chứng chỉ điện tử, xem & in chứng chỉ kèm QR Code | `src/pages/CertificatesPage.tsx`, `CertificateController.php` |
| **UC08** | **Tạo bài kiểm tra / khóa học CTKM (+ AI)** | Manager | Trợ lý OpenAI tự động tạo câu hỏi trắc nghiệm từ chủ đề | `src/pages/ManagerQuizCreatorPage.tsx`, `OpenAIService.php` |
| **UC09** | **Đăng ký lịch làm việc** | Staff | Chọn nguyện vọng ca làm việc (Sáng/Chiều/Tối) tuần tới | `src/pages/StaffShiftRegisterPage.tsx`, `ShiftController.php` |
| **UC10** | **Xem lịch làm việc** | Staff | Xem lịch phân ca chính thức & vị trí trực (Quầy vé/Popcorn/Hall) | `src/pages/StaffShiftViewPage.tsx`, `ShiftController.php` |
| **UC11** | **Set lịch làm việc cho nhân viên (+ AI)** | Manager | AI tự động cân đối ca làm theo giờ cao điểm phim bom tấn | `src/pages/ManagerShiftSchedulerPage.tsx`, `OpenAIService.php` |
| **UC12** | **Quản lý chấm công** | Manager | Nhật ký check-in/out, theo dõi đi muộn & tính giờ làm | `src/pages/AttendancePage.tsx`, `AttendanceController.php` |
| **UC13** | **Xử lý các trường hợp chấm công** | Manager | Phê duyệt đơn giải trình đi muộn, đơn xin nghỉ phép & đổi ca | `src/pages/AttendanceExceptionsPage.tsx`, `AttendanceController.php` |

---

## 🔐 Danh Sách Tài Khoản Đăng Nhập Nội Bộ (EMS Accounts)

> **Cơ chế xác thực phân quyền nội bộ:**
> - **Tên đăng nhập:** Mã nhân viên chính là **Số điện thoại (SĐT)** của nhân sự.
> - **Mật khẩu ban đầu mặc định:** `8888` (có thể tự đổi mật khẩu mới trong mục *Hồ Sơ* sau khi đăng nhập).
> - **Quy định cấp phát:**
>   - Tài khoản **Nhân viên (Staff)**: Do **Quản lý Nhân sự (Manager)** khởi tạo trong mục *"Tạo Tài Khoản Nhân Viên"*.
>   - Tài khoản **Quản lý (Manager)**: Do **Admin tổng** cấp phát và phân quyền.

| Vai trò hệ thống | Họ và Tên | Mã NV / Số Điện Thoại | Mật khẩu mặc định | Bộ phận trực thuộc & Quyền hạn |
|---|---|---|---|---|
| **Quản lý Đào tạo & Nhân sự (Manager)** | **Phạm Thu Hương** | `0988888888` | `8888` | Quản trị nhân sự toàn diện, duyệt ca & xếp lịch AI, tạo khóa học/đề thi, chấm công |
| **Nhân viên Rạp (Staff)** | **Nguyễn Văn Minh** | `0901234567` | `8888` | Vé & CSKH • Điểm danh Face ID, xem ca làm, đăng ký ca, học tập & thi định kỳ |
| **Nhân viên Rạp (Staff)** | **Trần Thị Mai** | `0912345678` | `8888` | Bắp nước & Concession • Điểm danh Face ID, xem ca làm, đăng ký ca, học tập & thi |
| **Nhân viên Rạp (Staff)** | **Lê Hoàng Nam** | `0923456789` | `8888` | Kỹ thuật Phim & Âm thanh • Điểm danh Face ID, xem ca làm, đăng ký ca, học tập |
| **Nhân viên Rạp (Staff)** | **Nguyễn Trần Thái Bảo** | `0395852972` | `8888` | Nhân sự vận hành tại cụm rạp |

---

## ⚡ Hướng Dẫn Khởi Chạy Ứng Dụng (Fullstack 1 Lệnh Duy Nhất)

### 👉 Khởi chạy trọn gói (Frontend + Backend + Database):
Chỉ cần mở Terminal tại thư mục `frontend` và chạy:
```bash
cd d:\EMS_AURORA\frontend
npm run dev
```
*(Lệnh này tự động kiểm tra MySQL 3306, tự động bật Backend PHP API Server tại `http://localhost:8000`, và bật Frontend Vite tại `http://localhost:5173`).*

👉 Hoặc nếu đang đứng ở thư mục gốc `d:\EMS_AURORA`, bạn cũng có thể chạy:
```bash
npm run dev
```

👉 **Truy cập ứng dụng:**
* Giao diện Web: `http://localhost:5173`
* Backend API: `http://localhost:8000`

---

## 🤖 Cấu Hình OpenAI API Key
1. Nhấn vào nút **OpenAI API** trên thanh tiêu đề `Navbar` của giao diện Web.
2. Nhập API Key dạng `sk-...` để gọi trực tiếp mô hình **GPT-4o-mini Live**.
3. Nếu **không nhập Key**, hệ thống sẽ tự động sử dụng **Smart Offline AI Engine** bảo đảm bài báo cáo luôn diễn ra mượt mà không gặp sự cố mất kết nối mạng.
