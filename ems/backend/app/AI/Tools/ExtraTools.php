<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

/**
 * EXTRA TOOLS: recommend_movies | search_web (Bộ não 4) | cancel_booking (hành động cần xác nhận)
 */
class RecommendTool implements AITool
{
    public function name(): string { return 'recommend_movies'; }

    public function description(): string
    {
        return 'Gợi ý phim đang chiếu tại rạp dựa trên một phim khách thích (cùng thể loại, cùng đạo diễn) hoặc theo thể loại.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'movie_title' => ['type' => 'string', 'description' => 'Phim khách đã thích, ví dụ Interstellar'],
                'genre' => ['type' => 'string', 'description' => 'Thể loại mong muốn, ví dụ kinh dị, hành động, tình cảm'],
            ],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $title = trim($arguments['movie_title'] ?? '');
        $genre = mb_strtolower(trim($arguments['genre'] ?? ''));

        $all = $pdo->query("SELECT id, title, original_title, genre, director, country, age_rating, duration, description FROM movies WHERE status='now_showing'")->fetchAll(PDO::FETCH_ASSOC);

        $base = null;
        if ($title !== '') {
            foreach ($all as $m) {
                if (mb_stripos($m['title'], $title) !== false || mb_stripos((string)$m['original_title'], $title) !== false) { $base = $m; break; }
            }
        }
        $baseGenres = $base ? array_map(fn($g) => mb_strtolower(trim($g)), explode(',', $base['genre'])) : [];

        $scored = [];
        foreach ($all as $m) {
            if ($base && $m['id'] == $base['id']) continue;
            $mg = array_map(fn($g) => mb_strtolower(trim($g)), explode(',', $m['genre']));
            $score = 0; $why = [];
            if ($baseGenres) {
                $shared = array_intersect($baseGenres, $mg);
                if ($shared) { $score += count($shared) * 2; $why[] = 'cùng thể loại: ' . implode(', ', $shared); }
                if ($base['director'] === $m['director']) { $score += 3; $why[] = 'cùng đạo diễn'; }
                if ($base['country'] === $m['country']) { $score += 0.5; }
            }
            if ($genre !== '') {
                foreach ($mg as $g) if (mb_stripos($g, $genre) !== false) { $score += 3; $why[] = "thuộc thể loại {$genre}"; break; }
            }
            if ($score > 0 || (!$baseGenres && $genre === '')) $scored[] = ['score' => $score, 'movie' => $m, 'why' => $why];
        }
        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

        return [
            'based_on' => $base ? $base['title'] : null,
            'requested_genre' => $genre ?: null,
            'recommendations' => array_map(fn($s) => [
                'movie_id' => (int)$s['movie']['id'], 'title' => $s['movie']['title'], 'genre' => $s['movie']['genre'],
                'director' => $s['movie']['director'], 'age_rating' => $s['movie']['age_rating'],
                'duration' => (int)$s['movie']['duration'], 'reason' => $s['why'] ? implode('; ', $s['why']) : 'đang được chiếu tại rạp',
            ], array_slice($scored, 0, 4)),
        ];
    }
}

class WebSearchTool implements AITool
{
    public function name(): string { return 'search_web'; }

    public function description(): string
    {
        return 'Tra cứu thông tin bên ngoài hệ thống rạp (diễn viên, đạo diễn, giải thưởng, phim mới, kiến thức điện ảnh) qua Wikipedia. Dùng khi dữ liệu không nằm trong CSDL rạp.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['query' => ['type' => 'string', 'description' => 'Từ khóa tìm kiếm, ví dụ "Christopher Nolan"']],
            'required' => ['query'],
            'additionalProperties' => false,
        ];
    }

    private function get(string $url): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_USERAGENT => 'AuroraCinemaAI/2.0 (education project)', CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_FOLLOWLOCATION => true,
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code !== 200 || !$res) return null;
        return json_decode($res, true);
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        $query = trim($arguments['query'] ?? '');
        if ($query === '') return ['error' => true, 'message' => 'Thiếu từ khóa tìm kiếm.'];

        foreach (['vi', 'en'] as $lang) {
            $s = $this->get("https://{$lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=" . urlencode($query) . "&srlimit=1&format=json");
            $hit = $s['query']['search'][0]['title'] ?? null;
            if (!$hit) continue;
            $sum = $this->get("https://{$lang}.wikipedia.org/api/rest_v1/page/summary/" . rawurlencode(str_replace(' ', '_', $hit)));
            if ($sum && !empty($sum['extract'])) {
                return [
                    'found' => true, 'source' => "Wikipedia ({$lang})", 'title' => $sum['title'] ?? $hit,
                    'summary' => $sum['extract'], 'url' => $sum['content_urls']['desktop']['page'] ?? null,
                    'note' => 'Thông tin từ Internet, độ ưu tiên thấp hơn dữ liệu nội bộ của rạp.',
                ];
            }
        }
        return ['found' => false, 'message' => "Không tra cứu được '{$query}' trên Internet (có thể mất kết nối hoặc không có kết quả)."];
    }
}

/**
 * cancel_booking KHÔNG hủy ngay. Tool chỉ tạo "pending action"; hành động thật chỉ chạy
 * khi người dùng xác nhận trong câu chat kế tiếp (Orchestrator::confirmPending).
 */
class CancelBookingTool implements AITool
{
    public function name(): string { return 'cancel_booking'; }

    public function description(): string
    {
        return 'Yêu cầu HỦY booking và hoàn tiền. Tool này chỉ chuẩn bị và hỏi xác nhận; việc hủy chỉ xảy ra sau khi người dùng xác nhận.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'booking_code' => ['type' => 'string', 'description' => 'Mã booking cần hủy'],
                'reason' => ['type' => 'string', 'description' => 'Lý do hủy'],
            ],
            'required' => ['booking_code'],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $code = trim($arguments['booking_code'] ?? '');
        $reason = trim($arguments['reason'] ?? 'Khách yêu cầu hủy');

        $q = $pdo->prepare("SELECT b.id, b.booking_code, b.status, b.total_amount, b.customer_name, s.start_at, m.title,
                                   TIMESTAMPDIFF(MINUTE, NOW(), s.start_at) mins
                            FROM bookings b JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id WHERE b.booking_code=? LIMIT 1");
        $q->execute([$code]);
        $b = $q->fetch(PDO::FETCH_ASSOC);

        if (!$b) return ['found' => false, 'message' => "Không tìm thấy booking '{$code}'."];
        if ($b['status'] === 'cancelled') return ['found' => true, 'blocked' => true, 'message' => "Booking {$code} đã được hủy trước đó."];

        $isManager = ($user['role'] ?? 'staff') === 'manager';
        $mins = (int)$b['mins'];
        $lateWarning = null;
        if ($mins < 60) {
            if (!$isManager) {
                return [
                    'found' => true, 'blocked' => true,
                    'message' => "Theo SOP, vé chỉ được hủy/đổi trước giờ chiếu tối thiểu 60 phút. Booking {$code} còn " . max($mins, 0) . " phút nên nhân viên không được tự hủy. Cần Trưởng ca/Quản lý duyệt (trường hợp sự cố kỹ thuật được hoàn 100% hoặc cấp voucher).",
                ];
            }
            $lateWarning = 'Booking đã sát/quá giờ chiếu (<60 phút). Bạn đang dùng quyền Quản lý để duyệt ngoại lệ.';
        }

        $token = bin2hex(random_bytes(8));
        $summary = "Hủy booking {$code} ({$b['title']}, " . date('H:i d/m', strtotime($b['start_at'])) . ") và hoàn " . number_format($b['total_amount'], 0, ',', '.') . " VNĐ cho {$b['customer_name']}";
        $ins = $pdo->prepare("INSERT INTO ai_pending_actions (token, conversation_id, user_id, action, payload, summary, expires_at) VALUES (?,?,?,?,?,?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))");
        $ins->execute([$token, $user['conversation_id'] ?? null, $user['id'] ?? null, 'cancel_booking',
                       json_encode(['booking_id' => (int)$b['id'], 'booking_code' => $code, 'amount' => (float)$b['total_amount'], 'reason' => $reason], JSON_UNESCAPED_UNICODE),
                       $summary]);

        return [
            'found' => true, 'requires_confirmation' => true, 'token' => $token, 'summary' => $summary,
            'refund_amount' => (float)$b['total_amount'], 'warning' => $lateWarning, 'expires_in_minutes' => 5,
        ];
    }
}
