<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

/**
 * MANAGEMENT TOOLS - chỉ dành cho Quản lý (RBAC được kiểm tra trong PermissionManager)
 * get_revenue | get_occupancy | get_top_movies | generate_daily_report
 */
trait DateRangeTrait
{
    protected function range(string $p): array
    {
        $p = strtolower(trim($p));
        $today = date('Y-m-d');
        if ($p === 'yesterday') {
            $d = date('Y-m-d', strtotime('-1 day'));
            return [$d, $d, 'Hôm qua (' . date('d/m/Y', strtotime($d)) . ')'];
        }
        if ($p === 'week') {
            return [date('Y-m-d', strtotime('-6 days')), $today, '7 ngày gần nhất'];
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $p)) {
            return [$p, $p, date('d/m/Y', strtotime($p))];
        }
        return [$today, $today, 'Hôm nay (' . date('d/m/Y') . ')'];
    }
}

class RevenueTool implements AITool
{
    use DateRangeTrait;

    public function name(): string { return 'get_revenue'; }

    public function description(): string
    {
        return 'Doanh thu vé + combo bắp nước + hoàn tiền theo hôm nay / hôm qua / 7 ngày / một ngày cụ thể. CHỈ QUẢN LÝ.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'period' => ['type' => 'string', 'description' => 'today | yesterday | week | YYYY-MM-DD'],
            ],
            'additionalProperties' => false,
        ];
    }

    public function dayStats(PDO $pdo, string $d): array
    {
        $hasShow = $pdo->prepare("SELECT COUNT(*) FROM showtimes WHERE DATE(start_at)=?");
        $hasShow->execute([$d]);
        $hasShow = (int)$hasShow->fetchColumn() > 0;

        if ($hasShow) {
            $q = $pdo->prepare("SELECT COALESCE(SUM(b.total_amount),0) amt, COUNT(DISTINCT b.id) bk FROM bookings b JOIN showtimes s ON s.id=b.showtime_id WHERE DATE(s.start_at)=? AND b.status IN ('confirmed','paid')");
            $q->execute([$d]);
            $r = $q->fetch(PDO::FETCH_ASSOC);
            $s = $pdo->prepare("SELECT COUNT(*) FROM booking_seats bs JOIN bookings b ON b.id=bs.booking_id JOIN showtimes s ON s.id=b.showtime_id WHERE DATE(s.start_at)=? AND b.status IN ('confirmed','paid')");
            $s->execute([$d]);
            $tickets = (int)$s->fetchColumn();
            $ticketRevenue = (float)$r['amt'];
            $bookings = (int)$r['bk'];
        } else {
            $q = $pdo->prepare("SELECT COALESCE(SUM(amount),0) amt, COALESCE(SUM(quantity),0) qty, COUNT(*) c FROM pos_transactions WHERE type='ticket' AND status='success' AND DATE(created_at)=?");
            $q->execute([$d]);
            $r = $q->fetch(PDO::FETCH_ASSOC);
            $ticketRevenue = (float)$r['amt'];
            $tickets = (int)$r['qty'];
            $bookings = (int)$r['c'];
        }

        $c = $pdo->prepare("SELECT COALESCE(SUM(amount),0) amt, COALESCE(SUM(quantity),0) qty FROM pos_transactions WHERE type='combo' AND status='success' AND DATE(created_at)=?");
        $c->execute([$d]);
        $combo = $c->fetch(PDO::FETCH_ASSOC);

        $rf = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM pos_transactions WHERE type='refund' AND DATE(created_at)=?");
        $rf->execute([$d]);
        $refund = (float)$rf->fetchColumn();

        return [
            'date' => $d,
            'tickets_sold' => $tickets,
            'bookings' => $bookings,
            'ticket_revenue' => $ticketRevenue,
            'combo_revenue' => (float)$combo['amt'],
            'combo_qty' => (int)$combo['qty'],
            'refunds' => $refund,
            'net_revenue' => $ticketRevenue + (float)$combo['amt'] - $refund,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        [$from, $to, $label] = $this->range($arguments['period'] ?? 'today');

        $days = [];
        $total = ['tickets_sold' => 0, 'ticket_revenue' => 0, 'combo_revenue' => 0, 'combo_qty' => 0, 'refunds' => 0, 'net_revenue' => 0];
        for ($t = strtotime($from); $t <= strtotime($to); $t += 86400) {
            $day = $this->dayStats($pdo, date('Y-m-d', $t));
            $days[] = $day;
            foreach ($total as $k => $_) $total[$k] += $day[$k];
        }

        return ['label' => $label, 'from' => $from, 'to' => $to, 'total' => $total, 'by_day' => $days];
    }
}

class OccupancyTool implements AITool
{
    public function name(): string { return 'get_occupancy'; }

    public function description(): string
    {
        return 'Tỷ lệ lấp đầy các suất chiếu trong ngày: theo từng suất, theo khung giờ (sáng/chiều/tối), suất vắng nhất và đông nhất.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'date' => ['type' => 'string', 'description' => 'YYYY-MM-DD, mặc định hôm nay'],
            ],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $date = !empty($arguments['date']) ? $arguments['date'] : date('Y-m-d');

        $q = $pdo->prepare("
            SELECT s.id, TIME_FORMAT(s.start_at,'%H:%i') t, HOUR(s.start_at) h, m.title, r.name room,
              (SELECT COUNT(*) FROM seats WHERE room_id=s.room_id AND status='active') cap,
              (SELECT COUNT(*) FROM booking_seats bs JOIN bookings b ON b.id=bs.booking_id
                 WHERE b.showtime_id=s.id AND b.status IN ('confirmed','paid','pending')) sold
            FROM showtimes s JOIN movies m ON m.id=s.movie_id JOIN rooms r ON r.id=s.room_id
            WHERE DATE(s.start_at)=? AND s.status='active' ORDER BY s.start_at");
        $q->execute([$date]);
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);

        $list = [];
        $bands = ['sang' => [0, 0], 'chieu' => [0, 0], 'toi' => [0, 0]];
        $capAll = 0; $soldAll = 0;
        foreach ($rows as $r) {
            $cap = (int)$r['cap']; $sold = (int)$r['sold'];
            $rate = $cap > 0 ? round($sold / $cap * 100, 1) : 0;
            $h = (int)$r['h'];
            $band = $h < 13 ? 'sang' : ($h < 17 ? 'chieu' : 'toi');
            $bands[$band][0] += $sold; $bands[$band][1] += $cap;
            $capAll += $cap; $soldAll += $sold;
            $list[] = ['showtime_id' => (int)$r['id'], 'time' => $r['t'], 'movie' => $r['title'], 'room' => $r['room'],
                       'sold' => $sold, 'capacity' => $cap, 'rate' => $rate, 'band' => $band];
        }
        $bandRates = [];
        foreach ($bands as $k => $v) $bandRates[$k] = $v[1] > 0 ? round($v[0] / $v[1] * 100, 1) : null;

        $sorted = $list;
        usort($sorted, fn($a, $b) => $a['rate'] <=> $b['rate']);

        return [
            'date' => $date,
            'overall_rate' => $capAll > 0 ? round($soldAll / $capAll * 100, 1) : 0,
            'seats_sold' => $soldAll,
            'seats_capacity' => $capAll,
            'band_rates' => $bandRates,
            'lowest' => array_slice($sorted, 0, 3),
            'highest' => array_slice(array_reverse($sorted), 0, 3),
            'showtimes' => $list,
        ];
    }
}

class TopMoviesTool implements AITool
{
    use DateRangeTrait;

    public function name(): string { return 'get_top_movies'; }

    public function description(): string
    {
        return 'Xếp hạng phim theo doanh thu vé và số vé bán ra (hôm nay / tuần). CHỈ QUẢN LÝ.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'period' => ['type' => 'string', 'description' => 'today | yesterday | week'],
                'limit' => ['type' => 'integer', 'description' => 'Số phim, mặc định 5'],
            ],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        [$from, $to, $label] = $this->range($arguments['period'] ?? 'today');
        $limit = max(1, min(10, (int)($arguments['limit'] ?? 5)));

        $q = $pdo->prepare("
            SELECT m.id, m.title, m.age_rating, COUNT(bs.id) tickets, COALESCE(SUM(bs.price),0) revenue
            FROM booking_seats bs JOIN bookings b ON b.id=bs.booking_id
            JOIN showtimes s ON s.id=b.showtime_id JOIN movies m ON m.id=s.movie_id
            WHERE DATE(s.start_at) BETWEEN ? AND ? AND b.status IN ('confirmed','paid')
            GROUP BY m.id ORDER BY revenue DESC LIMIT $limit");
        $q->execute([$from, $to]);
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);

        return [
            'label' => $label,
            'movies' => array_map(fn($r) => [
                'movie_id' => (int)$r['id'], 'title' => $r['title'], 'age_rating' => $r['age_rating'],
                'tickets' => (int)$r['tickets'], 'revenue' => (float)$r['revenue'],
            ], $rows),
        ];
    }
}

class DailyReportTool implements AITool
{
    public function name(): string { return 'generate_daily_report'; }

    public function description(): string
    {
        return 'Báo cáo vận hành tổng hợp trong ngày: doanh thu, vé, lấp đầy, phim bán chạy, combo, thiết bị, giao dịch POS lỗi + phân tích và đề xuất hành động. CHỈ QUẢN LÝ.';
    }

    public function schema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass(), 'additionalProperties' => false];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];

        $rev = (new RevenueTool())->execute(['period' => 'today'], $user, $pdo);
        $yRev = (new RevenueTool())->execute(['period' => 'yesterday'], $user, $pdo);
        $occ = (new OccupancyTool())->execute([], $user, $pdo);
        $top = (new TopMoviesTool())->execute(['period' => 'today', 'limit' => 3], $user, $pdo);

        $inc = $pdo->query("SELECT i.severity, i.description, i.status, e.code, e.name FROM equipment_incidents i JOIN equipment e ON e.id=i.equipment_id WHERE i.status<>'resolved' ORDER BY FIELD(i.severity,'critical','high','medium','low')")->fetchAll(PDO::FETCH_ASSOC);
        $posFail = (int)$pdo->query("SELECT COUNT(*) FROM pos_transactions WHERE status IN ('failed','pending') AND DATE(created_at)=CURDATE()")->fetchColumn();

        $t = $rev['total'];
        $insights = [];

        // 1. So sánh khung giờ
        $b = $occ['band_rates'];
        if ($b['chieu'] !== null && $b['toi'] !== null && $b['toi'] - $b['chieu'] >= 15) {
            $gap = round($b['toi'] - $b['chieu'], 1);
            $insights[] = "Tỷ lệ lấp đầy khung 13h–17h chỉ {$b['chieu']}%, thấp hơn buổi tối ({$b['toi']}%) tới {$gap} điểm %. Cân nhắc giảm suất chiều, dồn thêm suất tối cho phim bán chạy hoặc tung combo/giá ưu đãi giờ thấp điểm.";
        }
        // 2. Suất vắng
        $low = array_filter($occ['lowest'], fn($x) => $x['rate'] < 25);
        if ($low) {
            $names = array_map(fn($x) => "{$x['time']} {$x['movie']} ({$x['room']}, {$x['rate']}%)", $low);
            $insights[] = 'Các suất lấp đầy dưới 25%: ' . implode('; ', $names) . '. Có thể gộp suất hoặc chuyển sang phòng nhỏ hơn.';
        }
        // 3. Phim top
        if (!empty($top['movies'])) {
            $m = $top['movies'][0];
            $insights[] = "Phim dẫn đầu: {$m['title']} với {$m['tickets']} vé. Nên ưu tiên thêm suất giờ vàng 19h–22h cho phim này.";
        }
        // 4. Combo attach rate
        if ($t['tickets_sold'] > 0) {
            $attach = round($t['combo_qty'] / $t['tickets_sold'] * 100, 1);
            if ($attach < 40) {
                $insights[] = "Tỷ lệ combo/vé mới đạt {$attach}%. Nhắc đội Concession áp dụng up-sell 45 giây (nâng size chỉ +19.000đ) để kéo doanh thu F&B.";
            }
        }
        // 5. So với hôm qua
        $yNet = $yRev['total']['net_revenue'] ?? 0;
        if ($yNet > 0) {
            $diff = round(($t['net_revenue'] - $yNet) / $yNet * 100, 1);
            $insights[] = "Doanh thu so với hôm qua: " . ($diff >= 0 ? '+' : '') . "{$diff}%.";
        }
        // 6. Thiết bị
        $serious = array_filter($inc, fn($i) => in_array($i['severity'], ['high', 'critical']));
        if ($serious) {
            $insights[] = 'Có ' . count($serious) . ' sự cố thiết bị mức cao đang xử lý (ví dụ: ' . reset($serious)['name'] . '). Cần theo dõi tiến độ để không ảnh hưởng suất chiếu.';
        }
        if ($posFail > 0) {
            $insights[] = "Có {$posFail} giao dịch POS lỗi/đang treo hôm nay. Đối soát với cổng thanh toán trước khi chốt ca.";
        }

        return [
            'date' => date('d/m/Y'),
            'revenue' => $t,
            'occupancy' => ['overall' => $occ['overall_rate'], 'bands' => $occ['band_rates'], 'lowest' => $occ['lowest']],
            'top_movies' => $top['movies'],
            'incidents' => $inc,
            'pos_issues' => $posFail,
            'insights' => $insights,
        ];
    }
}
