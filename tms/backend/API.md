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
| `marketing_manager` | Lập kế hoạch phim, chiến dịch, CTKM, voucher, nội dung và báo cáo Marketing |

Session được đối chiếu lại với bảng `users` trong `aurora_db` ở mỗi request cần đăng nhập. Chỉ tài khoản có `status = 'active'` mới đăng nhập và tiếp tục sử dụng TMS được. Tài khoản có trạng thái `locked` hoặc `inactive` bị từ chối đăng nhập; nếu đang đăng nhập khi bị khóa/ngừng hoạt động thì phiên và cookie nhận diện bị vô hiệu hóa ở request tiếp theo. Sửa hồ sơ không gửi trường `status` sẽ giữ nguyên trạng thái hiện tại của tài khoản.

Thời gian TMS dùng múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+07:00); các mốc đăng nhập bất thường như `1970-01-01` hoặc ở tương lai không được hiển thị như thời gian đăng nhập hợp lệ. Danh sách tài khoản hiển thị lần đăng nhập cuối theo định dạng `HH:mm:ss DD/MM/YYYY`.

## Endpoint

- `GET ?action=dashboard&date=YYYY-MM-DD` — KPI vận hành từ `orders`, `bookings`, `booking_seats`, `showtimes`, `screens` và `staff_shifts`; Admin Rạp/Giám sát chỉ nhận dữ liệu thuộc `theater_id` được gán trong `aurora_db`.
- `GET ?action=cinema-schedule-board&date=YYYY-MM-DD` — sơ đồ phòng và suất chiếu theo thời gian, kèm tổng ghế, công suất, đơn đã thanh toán và doanh thu của rạp đang phụ trách.
- `GET ?action=revenue` — doanh thu thực tế theo ngày từ booking/order đã thanh toán.
- `GET ?action=report&from=YYYY-MM-DD&to=YYYY-MM-DD` — tổng hợp doanh thu, kênh và phương thức thanh toán.
- `GET ?action=transactions`, `GET ?action=refunds`, `POST|PUT ?action=refunds` — giao dịch và hoàn tiền.
- `GET ?action=seats&screen_id={id}` — sơ đồ ghế.
- `GET ?action=roles` — ma trận phân quyền.
- `GET|POST|PUT ?action=schedules` — lịch chiếu dùng `aurora_db.showtimes` làm nguồn dữ liệu. Database lưu `OPEN`, `CLOSED`, `CANCELLED`; API trả `scheduled`, `running`, `finished`, `cancelled`, trong đó `running` và `finished` được xác định theo `starts_at`, `ends_at` thay vì cho người dùng đặt thủ công.
  - Frontend hiển thị ngày theo `DD/MM/YYYY`, còn API nhận và lưu `show_date` theo ISO `YYYY-MM-DD` để ghép chính xác vào `starts_at`/`ends_at`.
  - Suất mới mặc định ngày kế tiếp theo giờ Việt Nam; backend kiểm tra ngày lịch thực, thời gian tương lai, phân bổ phim và xung đột phòng trước khi ghi.
- `GET ?action=users&account_type=internal` — tài khoản vận hành TMS; chỉ trả về `super_admin`, `cinema_admin`, `supervisor`, `accounting`.
- `GET ?action=users&account_type=customer` — hồ sơ customer, hạng thành viên, điểm, số lượt đặt vé, tổng chi tiêu và OAuth; chỉ Admin Tổng được truy cập.
- `POST|PUT ?action=users` — tạo/cập nhật tài khoản nội bộ. API từ chối tạo hoặc chuyển đổi sang vai trò `customer`.
- `POST|PUT ?action=customer-account-status` — khóa, ngừng hoặc mở lại quyền truy cập customer; ghi thay đổi vào `users` và nhật ký `tms_user_activity_logs` trong `aurora_db`.
- `DELETE ?action=users&id={id}` — xóa tài khoản nội bộ; API không cho phép xóa customer qua nghiệp vụ này.
- `GET|POST|PUT|DELETE ?action=pos-staff` — quản lý nhân viên POS trong `aurora_db.pos_users`. Mã nhân viên, tên đăng nhập và số điện thoại cùng lấy từ một số điện thoại; mật khẩu khởi tạo mặc định `88888888` nếu không nhập.
- `GET ?action=pos-staff-detail&id={id}` — hồ sơ và hoạt động của nhân viên POS.
- `GET|POST|PUT ?action=pos-work-schedules` — lập ca với quầy và các khu vực nghiệp vụ được chọn cho từng ca.
- `GET|POST|PUT ?action=pos-sessions` — cấp/mở, tạm dừng, tiếp tục hoặc kết phiên. Quầy và quyền thao tác được lưu theo phiên trong `pos_shifts`, không gắn cố định với tài khoản nhân viên.

### Quy trình kế hoạch phim Marketing

- `GET ?action=marketing-movies` — Danh sách phim dùng chung tương ứng với màn “Danh sách phim” của Admin Tổng. Phim `draft` không được trả trong danh sách; phản hồi `meta.approved_candidates` chỉ chứa phim thuộc kế hoạch của Marketing đã được Admin Tổng duyệt.
- `PUT ?action=marketing-movies&operation=publish-approved` — body `{ "id": plan_id }`. Thêm phim đã duyệt vào danh sách và chuyển trạng thái phim từ `draft` sang `coming_soon`. Backend từ chối nếu kế hoạch chưa duyệt, không thuộc Marketing hiện tại hoặc phim đã được công bố.
- `GET ?action=marketing-movie-plans` — danh sách, KPI trạng thái, kho phim, danh sách rạp và lịch sử phê duyệt.
- `POST ?action=marketing-movie-plans` — Marketing tạo bản nháp qua quy trình 5 bước. Có thể chọn phim trong kho bằng `movie_id`, hoặc gửi `movie_mode: "new"` cùng `movie_profile` để tạo hồ sơ phim nháp. Kế hoạch hỗ trợ thời gian, lý do đề xuất, số vé/doanh thu mục tiêu, suất chiếu, rạp, chiến dịch, ngân sách Marketing, đề xuất khuyến mãi, quyền phát hành và trạng thái phân loại.
  - `movie_profile.genre` nhận mảng tối đa 8 thể loại, ví dụ `["Hành động", "Khoa học viễn tưởng"]`. Backend loại bỏ giá trị rỗng/trùng và lưu dạng chuỗi phân cách bằng dấu phẩy trong cột `aurora_db.movies.genre` hiện có. `GET marketing-movie-plans` trả `meta.genres` được tổng hợp từ dữ liệu phim trong database để frontend dựng bộ chọn nhiều lựa chọn.
- `PUT ?action=marketing-movie-plans&id={id}` — cập nhật kế hoạch ở trạng thái `draft` hoặc `revision_requested`.
- `PUT ?action=marketing-movie-plans&id={id}&operation=submit` — gửi kế hoạch đến Admin Tổng.
- `PUT ?action=marketing-movie-plans&id={id}&operation=withdraw` — thu hồi kế hoạch đang chờ duyệt.
- `PUT ?action=marketing-movie-plans&id={id}&operation=publish-movie` — sau khi được duyệt, Marketing đưa phim vào Danh sách phim (`coming_soon`).
- `DELETE ?action=marketing-movie-plans&id={id}` — xóa bản nháp hoặc kế hoạch đang được yêu cầu sửa.
- `GET ?action=marketing-plan-approvals` — Admin Tổng xem hàng đợi phê duyệt.
- `PUT ?action=marketing-plan-approvals` — Admin Tổng duyệt hoặc trả sửa. Body hỗ trợ phản hồi theo hạng mục: `{ "id": 1, "decision": "revision_requested", "note": "Ý kiến chung", "review_items": [{ "section_key": "revenue", "field_label": "Mục tiêu doanh thu", "comment": "Cần bổ sung căn cứ" }] }`.

Khi được duyệt, kế hoạch chuyển sang `published` và tạo bản ghi `movie_allocations` cho từng rạp đề xuất để Admin Rạp lên lịch chiếu. Các phản hồi được lưu trong `marketing_movie_plan_review_items`; khi Marketing gửi lại, phản hồi đang mở chuyển thành `resolved`. Mọi lần tạo, cập nhật, gửi, thu hồi, duyệt và công bố phim được ghi trong `marketing_movie_plan_history` của `aurora_db`.

Hồ sơ phim do Marketing tạo được lưu trong `movies` với `status = 'draft'` và `marketing_owner_id`. Phim chỉ chuyển sang `coming_soon` khi kế hoạch đã được Admin Tổng duyệt và Marketing thực hiện thao tác `publish-movie`.

Các resource `movies`, `screens`, `schedules`, `staff`, `ticket-types`, `products`, `vouchers`, `customers`, `theaters`, `promotions`, `movie-plans`, `movie-allocations` hỗ trợ `GET`; resource được cấp quyền hỗ trợ thêm `POST`, `PUT`, `DELETE` theo nghiệp vụ.

## Quy ước phản hồi

Mọi phản hồi đều có dạng:

```json
{ "success": true, "data": {} }
```

Lỗi trả về `{ "success": false, "message": "..." }` cùng HTTP status phù hợp (`400`, `401`, `403`, `404`, `409`, `422`, `500`).
