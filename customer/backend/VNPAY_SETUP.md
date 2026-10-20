# Cấu hình VNPAY Production cho Aurora Cinema

Aurora sử dụng VNPAY Payment Gateway API `2.1.0`. Vé chỉ được phát hành sau khi
backend nhận IPN hợp lệ từ VNPAY; Return URL chỉ đưa khách hàng về trang kết quả.

## 1. Cấu hình bí mật

Khai báo trong `customer/backend/.env` bằng thông tin Production do VNPAY cấp:

```env
VNPAY_MODE=production
VNPAY_TMN_CODE="YOUR_PRODUCTION_TMN_CODE"
VNPAY_HASH_SECRET="YOUR_PRODUCTION_HASH_SECRET"
VNPAY_PAYMENT_URL="https://pay.vnpay.vn/vpcpay.html"
VNPAY_RETURN_URL="https://your-domain/customer/backend/public/api.php?action=vnpay_return"
VNPAY_IPN_URL="https://your-domain/customer/backend/public/api.php?action=vnpay_ipn"
CUSTOMER_FRONTEND_URL="https://your-domain"
```

Không lưu `VNPAY_HASH_SECRET` trong database hoặc frontend. Sau khi thay `.env`,
khởi động lại dịch vụ PHP/Apache để tiến trình đọc cấu hình mới.

## 2. Đăng ký callback

Đăng ký chính xác `VNPAY_IPN_URL` trong Merchant Admin. URL này phải truy cập
được công khai qua HTTPS; không dùng `localhost` cho Production.

## 3. Database

Chạy migration nếu triển khai trên database mới:

```sql
SOURCE customer/backend/database/vnpay_payment_gateway.sql;
```

- `online_payment_transactions`: trạng thái và thông tin đối soát giao dịch.
- `online_payment_callback_logs`: nhật ký Return/IPN, IP nguồn, kết quả kiểm tra
  chữ ký và payload phục vụ tra soát.
- `payments`: chứng từ thanh toán chỉ được tạo khi IPN thành công.

## 4. Kiểm tra trước khi mở bán

1. `GET api.php?action=vnpay_config` phải trả về `enabled: true` và
   `mode: production`.
2. Thanh toán một đơn giá trị nhỏ bằng tài khoản thật.
3. Xác nhận giao dịch có trạng thái `PAID`, có `ipn_received_at`, và có đúng một
   chứng từ trong `payments`.
4. Gửi lại cùng IPN để xác nhận hệ thống không phát hành vé hoặc cộng điểm hai lần.

Tài liệu chính thức:

- https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- https://sandbox.vnpayment.vn/apis/docs/faqs/
