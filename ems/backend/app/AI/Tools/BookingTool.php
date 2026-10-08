<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

class BookingTool implements AITool
{
    public function name(): string
    {
        return 'get_booking';
    }

    public function description(): string
    {
        return 'Tra cứu thông tin đặt vé, trạng thái thanh toán, suất chiếu và danh sách ghế bằng mã booking code (Ví dụ: BK20261006001).';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'booking_code' => [
                    'type' => 'string',
                    'description' => 'Mã đặt vé khách hàng cung cấp (Ví dụ: BK20261006001, BK20261006002)'
                ],
            ],
            'required' => ['booking_code'],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) {
            return ['error' => true, 'message' => 'Không có kết nối CSDL MySQL.'];
        }

        $code = trim($arguments['booking_code'] ?? '');
        if ($code === '') {
            return ['error' => true, 'message' => 'Vui lòng cung cấp mã booking code.'];
        }

        $stmt = $pdo->prepare("
            SELECT b.id, b.user_id, b.booking_code, b.customer_name, b.customer_phone,
                   b.status, b.total_amount, b.created_at,
                   s.start_at, s.end_at,
                   m.title AS movie_title, m.age_rating,
                   r.name AS room_name, r.type AS room_type
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.id
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            WHERE b.booking_code = ?
            LIMIT 1
        ");
        $stmt->execute([$code]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$booking) {
            return [
                'found' => false,
                'message' => "Không tìm thấy mã đặt vé '{$code}' trong hệ thống Aurora Cinemas. Vui lòng kiểm tra lại ký tự hoặc số điện thoại."
            ];
        }

        // Kiểm tra quyền: Nhân viên / Quản lý được xem toàn bộ. Khách hàng chỉ xem của mình.
        $userRole = $user['role'] ?? 'staff';
        $currentUserId = $user['id'] ?? null;
        if (!in_array($userRole, ['admin', 'manager', 'staff']) && $currentUserId && $booking['user_id'] != $currentUserId) {
            return [
                'error' => true,
                'denied' => true,
                'message' => 'Bạn không có quyền truy cập thông tin booking của khách hàng khác.'
            ];
        }

        // Lấy danh sách ghế đã chọn
        $stmtSeats = $pdo->prepare("
            SELECT s.row, s.number, s.seat_type, bs.price
            FROM booking_seats bs
            JOIN seats s ON bs.seat_id = s.id
            WHERE bs.booking_id = ?
            ORDER BY s.row ASC, s.number ASC
        ");
        $stmtSeats->execute([$booking['id']]);
        $seats = $stmtSeats->fetchAll(PDO::FETCH_ASSOC);

        $seatLabels = array_map(function ($s) {
            return $s['row'] . $s['number'] . " (" . ucfirst($s['seat_type']) . ")";
        }, $seats);

        return [
            'found' => true,
            'booking_code' => $booking['booking_code'],
            'customer_name' => $booking['customer_name'] ?? 'Khách xem phim Aurora',
            'customer_phone' => $booking['customer_phone'] ?? 'Chưa cập nhật',
            'status' => $booking['status'] === 'confirmed' ? 'Đã thanh toán & Xác nhận' : $booking['status'],
            'movie' => $booking['movie_title'],
            'age_rating' => $booking['age_rating'],
            'room' => $booking['room_name'],
            'room_type' => $booking['room_type'],
            'showtime' => date('H:i - d/m/Y', strtotime($booking['start_at'])),
            'seat_count' => count($seats),
            'seats' => $seatLabels,
            'total_amount' => number_format($booking['total_amount'], 0, ',', '.') . ' VNĐ',
            'created_at' => date('H:i d/m/Y', strtotime($booking['created_at'])),
        ];
    }
}
