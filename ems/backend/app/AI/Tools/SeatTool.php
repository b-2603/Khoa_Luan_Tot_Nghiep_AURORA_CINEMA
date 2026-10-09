<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

class SeatTool implements AITool
{
    public function name(): string
    {
        return 'get_available_seats';
    }

    public function description(): string
    {
        return 'Kiểm tra sơ đồ ghế và số lượng ghế còn trống thực tế của một suất chiếu cụ thể.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'showtime_id' => [
                    'type' => 'integer',
                    'description' => 'ID suất chiếu (lấy từ kết quả của get_showtimes)'
                ],
                'check_seats' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                    'description' => 'Danh sách mã ghế cần kiểm tra cụ thể, ví dụ ["C10","C11"]'
                ],
            ],
            'required' => ['showtime_id'],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) {
            return ['error' => true, 'message' => 'Không có kết nối CSDL MySQL.'];
        }

        $showtimeId = intval($arguments['showtime_id'] ?? 0);
        if (!$showtimeId) {
            return ['error' => true, 'message' => 'Cần cung cấp showtime_id hợp lệ.'];
        }

        // Lấy thông tin suất chiếu
        $stmtSt = $pdo->prepare("
            SELECT s.id, s.room_id, s.start_at, s.price,
                   m.title AS movie_title, r.name AS room_name, r.type AS room_type, r.capacity
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            WHERE s.id = ?
        ");
        $stmtSt->execute([$showtimeId]);
        $showtime = $stmtSt->fetch(PDO::FETCH_ASSOC);

        if (!$showtime) {
            return ['error' => true, 'message' => "Không tìm thấy suất chiếu ID #{$showtimeId}."];
        }

        $roomId = (int)$showtime['room_id'];

        // Lấy danh sách ID ghế đã được đặt trong các booking confirmed/paid
        $stmtBooked = $pdo->prepare("
            SELECT bs.seat_id
            FROM booking_seats bs
            JOIN bookings b ON bs.booking_id = b.id
            WHERE b.showtime_id = ? AND b.status IN ('confirmed', 'paid', 'pending')
        ");
        $stmtBooked->execute([$showtimeId]);
        $bookedSeatIds = $stmtBooked->fetchAll(PDO::FETCH_COLUMN);

        // Lấy toàn bộ ghế của phòng
        $stmtSeats = $pdo->prepare("
            SELECT id, row, number, seat_type, status
            FROM seats
            WHERE room_id = ? AND status = 'active'
            ORDER BY row ASC, number ASC
        ");
        $stmtSeats->execute([$roomId]);
        $allSeats = $stmtSeats->fetchAll(PDO::FETCH_ASSOC);

        $availableSeats = [];
        $occupiedCount = 0;
        foreach ($allSeats as $s) {
            $isBooked = in_array($s['id'], $bookedSeatIds);
            if ($isBooked) {
                $occupiedCount++;
            } else {
                $availableSeats[] = [
                    'code' => $s['row'] . $s['number'],
                    'row' => $s['row'],
                    'number' => (int)$s['number'],
                    'type' => $s['seat_type'],
                ];
            }
        }

        $totalCapacity = count($allSeats);
        $availableCount = count($availableSeats);
        $occupancyRate = $totalCapacity > 0 ? round(($occupiedCount / $totalCapacity) * 100, 1) : 0;

        // Gợi ý ghế VIP trung tâm đẹp nhất (hàng D, E, F ghế 5-10)
        $bestRecommendations = [];
        foreach ($availableSeats as $s) {
            if (in_array($s['row'], ['C', 'D', 'E', 'F']) && $s['number'] >= 6 && $s['number'] <= 12) {
                $bestRecommendations[] = $s['code'];
                if (count($bestRecommendations) >= 6) break;
            }
        }

        $seatCheck = [];
        foreach (($arguments['check_seats'] ?? []) as $code) {
            $code = strtoupper(trim($code));
            $found = null;
            foreach ($allSeats as $s) {
                if ($s['row'] . $s['number'] === $code) { $found = $s; break; }
            }
            $seatCheck[] = [
                'code' => $code,
                'exists' => $found !== null,
                'type' => $found['seat_type'] ?? '-',
                'available' => $found !== null && !in_array($found['id'], $bookedSeatIds),
            ];
        }

        return [
            'seat_check' => $seatCheck,
            'showtime_id' => $showtimeId,
            'movie' => $showtime['movie_title'],
            'room' => $showtime['room_name'],
            'room_type' => $showtime['room_type'],
            'start_time' => date('H:i d/m/Y', strtotime($showtime['start_at'])),
            'total_seats' => $totalCapacity,
            'occupied_seats' => $occupiedCount,
            'available_count' => $availableCount,
            'occupancy_rate' => "{$occupancyRate}%",
            'recommended_center_seats' => $bestRecommendations,
            'available_seats_sample' => array_slice(array_column($availableSeats, 'code'), 0, 20),
        ];
    }
}
