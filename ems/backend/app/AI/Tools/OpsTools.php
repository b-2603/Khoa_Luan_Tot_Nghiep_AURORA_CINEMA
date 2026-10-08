<?php

namespace App\AI\Tools;

use App\AI\Contracts\AITool;
use PDO;

/**
 * OPS TOOLS: EMS (thiết bị/sự cố/TMS phòng chiếu), POS (giao dịch), Nhân sự (ca làm), Đào tạo
 */
class EquipmentTool implements AITool
{
    public function name(): string { return 'get_equipment_status'; }

    public function description(): string
    {
        return 'EMS/TMS: kiểm tra thiết bị (máy chiếu, âm thanh, điều hòa), sự cố đang mở, lịch bảo trì và nguy cơ ảnh hưởng suất chiếu của một phòng (P01..P05) hoặc toàn cụm rạp.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'room' => ['type' => 'string', 'description' => 'Tên phòng, ví dụ P03. Bỏ trống = toàn rạp'],
                'only_issues' => ['type' => 'boolean', 'description' => 'true = chỉ trả thiết bị có vấn đề'],
            ],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $room = strtoupper(trim($arguments['room'] ?? ''));
        $onlyIssues = !empty($arguments['only_issues']);

        $sql = "SELECT e.id, e.code, e.name, e.category, e.status, e.last_maintenance, e.next_maintenance, r.name room
                FROM equipment e LEFT JOIN rooms r ON r.id=e.room_id WHERE 1=1";
        $params = [];
        if ($room !== '') { $sql .= " AND r.name = ?"; $params[] = $room; }
        if ($onlyIssues) $sql .= " AND e.status <> 'operational'";
        $sql .= " ORDER BY r.name, e.category";
        $st = $pdo->prepare($sql);
        $st->execute($params);
        $equipment = $st->fetchAll(PDO::FETCH_ASSOC);

        if ($room !== '' && !$equipment && !$onlyIssues) {
            return ['found' => false, 'message' => "Không tìm thấy phòng/thiết bị '{$room}'."];
        }

        $items = [];
        foreach ($equipment as $e) {
            $i = $pdo->prepare("SELECT severity, description, status, DATE_FORMAT(reported_at,'%H:%i %d/%m') reported FROM equipment_incidents WHERE equipment_id=? AND status<>'resolved'");
            $i->execute([$e['id']]);
            $items[] = [
                'code' => $e['code'], 'name' => $e['name'], 'room' => $e['room'], 'category' => $e['category'],
                'status' => $e['status'], 'last_maintenance' => $e['last_maintenance'], 'next_maintenance' => $e['next_maintenance'],
                'maintenance_due_soon' => $e['next_maintenance'] && strtotime($e['next_maintenance']) <= strtotime('+7 days'),
                'open_incidents' => $i->fetchAll(PDO::FETCH_ASSOC),
            ];
        }

        $result = [
            'found' => true,
            'room' => $room ?: 'Toàn cụm rạp',
            'total' => count($items),
            'issues' => count(array_filter($items, fn($x) => $x['status'] !== 'operational')),
            'equipment' => $items,
        ];

        if ($room !== '') {
            $s = $pdo->prepare("SELECT TIME_FORMAT(s.start_at,'%H:%i') t, m.title FROM showtimes s JOIN movies m ON m.id=s.movie_id JOIN rooms r ON r.id=s.room_id WHERE r.name=? AND DATE(s.start_at)=CURDATE() ORDER BY s.start_at");
            $s->execute([$room]);
            $result['showtimes_today'] = $s->fetchAll(PDO::FETCH_ASSOC);
            $bad = array_values(array_filter($items, fn($x) => in_array($x['status'], ['fault', 'maintenance'])));
            $result['show_risk'] = $bad
                ? 'CÓ NGUY CƠ ảnh hưởng suất chiếu: ' . implode(', ', array_map(fn($x) => $x['name'] . ' (' . $x['status'] . ')', $bad))
                : 'Thiết bị phòng hoạt động bình thường, không phát hiện nguy cơ ảnh hưởng suất chiếu.';
        }
        return $result;
    }
}

class POSTool implements AITool
{
    public function name(): string { return 'get_pos_transaction'; }

    public function description(): string
    {
        return 'POS: tra cứu giao dịch theo mã (ví dụ POS125) và chẩn đoán lỗi; không có mã thì liệt kê giao dịch lỗi/đang treo hôm nay.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['code' => ['type' => 'string', 'description' => 'Mã giao dịch POS, ví dụ POS125']],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $code = strtoupper(trim($arguments['code'] ?? ''));

        if ($code === '') {
            $q = $pdo->query("SELECT code, type, item_name, amount, payment_method, status, error_message, DATE_FORMAT(created_at,'%H:%i') t FROM pos_transactions WHERE status IN ('failed','pending') AND DATE(created_at)=CURDATE() ORDER BY created_at DESC");
            return ['mode' => 'problem_list', 'transactions' => $q->fetchAll(PDO::FETCH_ASSOC)];
        }

        $q = $pdo->prepare("SELECT p.*, u.name staff_name, DATE_FORMAT(p.created_at,'%H:%i %d/%m/%Y') t FROM pos_transactions p LEFT JOIN users u ON u.id=p.staff_id WHERE p.code=? LIMIT 1");
        $q->execute([$code]);
        $tx = $q->fetch(PDO::FETCH_ASSOC);
        if (!$tx) return ['found' => false, 'message' => "Không tìm thấy giao dịch {$code}."];

        $advice = match ($tx['status']) {
            'failed' => 'Không bấm thanh toán lại lần 2. Mở tab Tra cứu giao dịch, kiểm tra mã tham chiếu với ngân hàng. Nếu tiền đã trừ của khách → xác nhận thành công thủ công; nếu chưa trừ → thanh toán lại.',
            'pending' => 'Giao dịch đang chờ cổng thanh toán. Đợi tối đa 2 phút rồi đối soát lại; không in vé khi chưa success.',
            'refunded' => 'Giao dịch đã hoàn tiền, không xử lý thêm.',
            default => 'Giao dịch thành công, không cần xử lý.',
        };

        return [
            'found' => true,
            'code' => $tx['code'], 'type' => $tx['type'], 'item' => $tx['item_name'], 'quantity' => (int)$tx['quantity'],
            'amount' => (float)$tx['amount'], 'payment_method' => $tx['payment_method'], 'status' => $tx['status'],
            'error_message' => $tx['error_message'], 'staff' => $tx['staff_name'], 'time' => $tx['t'], 'advice' => $advice,
        ];
    }
}

class StaffScheduleTool implements AITool
{
    public function name(): string { return 'get_staff_schedule'; }

    public function description(): string
    {
        return 'Nhân sự: lịch phân ca, vị trí trực, tình hình chấm công theo ngày. Nhân viên chỉ xem được lịch của chính mình.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'date' => ['type' => 'string', 'description' => 'YYYY-MM-DD, mặc định hôm nay'],
                'staff_name' => ['type' => 'string', 'description' => 'Tên nhân viên (chỉ Quản lý mới tra người khác)'],
            ],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $date = !empty($arguments['date']) ? $arguments['date'] : date('Y-m-d');
        $name = trim($arguments['staff_name'] ?? '');
        $isManager = ($user['role'] ?? 'staff') === 'manager';

        $sql = "SELECT u.id uid, u.name, u.department, sh.name shift, TIME_FORMAT(sh.start_time,'%H:%i') st, TIME_FORMAT(sh.end_time,'%H:%i') et, w.location, w.status
                FROM work_schedules w JOIN users u ON u.id=w.user_id JOIN shifts sh ON sh.id=w.shift_id WHERE w.date=?";
        $params = [$date];
        if (!$isManager) {
            $sql .= " AND u.id=?"; $params[] = (int)($user['id'] ?? 0);
        } elseif ($name !== '') {
            $sql .= " AND u.name LIKE ?"; $params[] = "%{$name}%";
        }
        $sql .= " ORDER BY sh.start_time, u.name";
        $q = $pdo->prepare($sql);
        $q->execute($params);
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);

        $pending = 0;
        if ($isManager) {
            $p = $pdo->prepare("SELECT COUNT(*) FROM shift_registrations WHERE status='pending' AND date>=?");
            $p->execute([date('Y-m-d')]);
            $pending = (int)$p->fetchColumn();
        }

        return [
            'date' => $date,
            'scope' => $isManager ? 'toàn bộ nhân sự' : 'chỉ lịch của bạn',
            'count' => count($rows),
            'schedules' => $rows,
            'pending_registrations' => $pending,
        ];
    }
}

class TrainingTool implements AITool
{
    public function name(): string { return 'get_training_progress'; }

    public function description(): string
    {
        return 'Đào tạo: chứng chỉ đã đạt, kết quả các bài kiểm tra nghiệp vụ, bài chưa đạt. Nhân viên xem của mình; Quản lý xem toàn bộ hoặc theo tên.';
    }

    public function schema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['staff_name' => ['type' => 'string', 'description' => 'Tên nhân viên (chỉ Quản lý)']],
            'additionalProperties' => false,
        ];
    }

    public function execute(array $arguments, ?array $user = null, ?PDO $pdo = null): array
    {
        if (!$pdo) return ['error' => true, 'message' => 'Không có kết nối CSDL.'];
        $isManager = ($user['role'] ?? 'staff') === 'manager';
        $name = trim($arguments['staff_name'] ?? '');

        if ($isManager && $name === '') {
            $rows = $pdo->query("SELECT u.name, COUNT(DISTINCT c.id) certs, COUNT(DISTINCT a.id) attempts, ROUND(AVG(a.score),1) avg_score
                                 FROM users u LEFT JOIN certificates c ON c.user_id=u.id LEFT JOIN quiz_attempts a ON a.user_id=u.id
                                 WHERE u.role='staff' GROUP BY u.id ORDER BY certs DESC")->fetchAll(PDO::FETCH_ASSOC);
            return ['scope' => 'toàn bộ nhân viên', 'staff' => $rows];
        }

        $uid = (int)($user['id'] ?? 0);
        if ($isManager) {
            $f = $pdo->prepare("SELECT id FROM users WHERE name LIKE ? LIMIT 1");
            $f->execute(["%{$name}%"]);
            $uid = (int)$f->fetchColumn();
            if (!$uid) return ['found' => false, 'message' => "Không tìm thấy nhân viên '{$name}'."];
        }

        $c = $pdo->prepare("SELECT co.title, c.score, c.issued_at, c.certificate_code FROM certificates c JOIN courses co ON co.id=c.course_id WHERE c.user_id=? ORDER BY c.issued_at DESC");
        $c->execute([$uid]);
        $a = $pdo->prepare("SELECT q.title, a.score, a.passed, DATE_FORMAT(a.completed_at,'%d/%m/%Y') d FROM quiz_attempts a JOIN quizzes q ON q.id=a.quiz_id WHERE a.user_id=? ORDER BY a.completed_at DESC LIMIT 10");
        $a->execute([$uid]);
        $total = (int)$pdo->query("SELECT COUNT(*) FROM quizzes")->fetchColumn();

        return [
            'found' => true,
            'certificates' => $c->fetchAll(PDO::FETCH_ASSOC),
            'recent_attempts' => $a->fetchAll(PDO::FETCH_ASSOC),
            'total_quizzes' => $total,
        ];
    }
}
