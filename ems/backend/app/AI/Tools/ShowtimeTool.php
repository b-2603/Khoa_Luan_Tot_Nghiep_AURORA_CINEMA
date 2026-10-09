<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

class ShowtimeTool implements AITool
{
    public function name(): string
    {
        return 'get_showtimes';
    }

    public function description(): string
    {
        return 'Lấy danh sách các suất chiếu của một phim hoặc tất cả các phim theo ngày (định dạng YYYY-MM-DD).';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'movie_id' => [
                    'type' => 'integer',
                    'description' => 'ID phim (nếu đã biết từ search_movies)'
                ],
                'movie_title' => [
                    'type' => 'string',
                    'description' => 'Tên phim cần xem suất chiếu (Ví dụ: Avatar, Mai, Dune)'
                ],
                'date' => [
                    'type' => 'string',
                    'description' => 'Ngày cần xem suất chiếu, định dạng YYYY-MM-DD (Ví dụ: ' . date('Y-m-d') . ')'
                ],
            ],
            'required' => ['date'],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) {
            return ['error' => true, 'message' => 'Không có kết nối CSDL MySQL.'];
        }

        $date = !empty($arguments['date']) ? $arguments['date'] : date('Y-m-d');
        $movieId = !empty($arguments['movie_id']) ? intval($arguments['movie_id']) : null;
        $movieTitle = trim($arguments['movie_title'] ?? '');

        // Nếu có movie_title mà chưa có movie_id, tìm movie_id
        if (!$movieId && $movieTitle !== '') {
            $stmM = $pdo->prepare("SELECT id, title FROM movies WHERE title LIKE ? OR original_title LIKE ? LIMIT 1");
            $stmM->execute(["%{$movieTitle}%", "%{$movieTitle}%"]);
            $m = $stmM->fetch(PDO::FETCH_ASSOC);
            if ($m) {
                $movieId = $m['id'];
            }
        }

        $sql = "
            SELECT s.id, s.movie_id, m.title AS movie_title, m.age_rating,
                   s.room_id, r.name AS room_name, r.type AS room_type,
                   s.start_at, s.end_at, s.price, s.status
            FROM showtimes s
            JOIN movies m ON s.movie_id = m.id
            JOIN rooms r ON s.room_id = r.id
            WHERE DATE(s.start_at) = ? AND s.status = 'active'
        ";
        $params = [$date];

        if ($movieId) {
            $sql .= " AND s.movie_id = ?";
            $params[] = $movieId;
        }

        $sql .= " ORDER BY s.start_at ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $showtimes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'date' => $date,
            'movie_id' => $movieId,
            'count' => count($showtimes),
            'showtimes' => array_map(function ($s) {
                return [
                    'id' => (int)$s['id'],
                    'movie_title' => $s['movie_title'],
                    'age_rating' => $s['age_rating'],
                    'room' => $s['room_name'],
                    'room_type' => $s['room_type'],
                    'start_time' => date('H:i', strtotime($s['start_at'])),
                    'end_time' => date('H:i', strtotime($s['end_at'])),
                    'start_at' => $s['start_at'],
                    'price' => (float)$s['price'],
                ];
            }, $showtimes),
        ];
    }
}
