<?php

namespace App\AI;

use App\AI\Contracts\AITool;
use PDO;
use Throwable;

/**
 * AI ORCHESTRATOR v2
 *  - Memory: lưu hội thoại + bộ nhớ thực thể (phim / suất / phòng / booking đang nói tới)
 *  - RBAC: vai trò lấy từ DB, tool bị chặn nếu vượt quyền, ghi log 'denied'
 *  - Tool loop (OpenAI function calling, tối đa 5 vòng) + Autonomous Engine khi offline
 *  - Hành động nguy hiểm (hủy vé) phải qua 2 bước: chuẩn bị -> người dùng xác nhận -> thực thi + audit log
 */
class AIOrchestrator
{
    /** @var AITool[] */
    protected array $tools = [];
    protected PDO $pdo;
    protected string $defaultApiKey;
    protected array $ctx = [];
    protected array $trace = [];
    protected ?array $movies = null;

    public function __construct(PDO $pdo, string $defaultApiKey = '')
    {
        $this->pdo = $pdo;
        $this->defaultApiKey = $defaultApiKey;
    }

    public function registerTool(AITool $tool): self
    {
        $this->tools[$tool->name()] = $tool;
        return $this;
    }

    public function getTools(): array { return $this->tools; }

    // =====================================================================
    // CHAT
    // =====================================================================
    public function chat(string $message, array $user = [], ?int $conversationId = null, ?string $clientApiKey = null): array
    {
        $user['id'] = (int)($user['id'] ?? 0);
        $user['role'] = in_array($user['role'] ?? '', ['customer', 'staff', 'manager'], true) ? $user['role'] : 'staff';
        $apiKey = !empty($clientApiKey) ? $clientApiKey : $this->defaultApiKey;
        $this->trace = [];

        if ($conversationId) {
            $s = $this->pdo->prepare("SELECT id, context FROM ai_conversations WHERE id=?");
            $s->execute([$conversationId]);
            $row = $s->fetch(PDO::FETCH_ASSOC);
            if (!$row) $conversationId = null; else $this->ctx = json_decode($row['context'] ?? '[]', true) ?: [];
        }
        if (!$conversationId) {
            $this->ctx = [];
            $ins = $this->pdo->prepare("INSERT INTO ai_conversations (user_id, title) VALUES (?, ?)");
            $ins->execute([$user['id'] ?: null, mb_substr($message, 0, 80)]);
            $conversationId = (int)$this->pdo->lastInsertId();
        }
        $user['conversation_id'] = $conversationId;

        $this->pdo->prepare("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, 'user', ?)")->execute([$conversationId, $message]);

        $text = null;
        $source = 'aurora-smart-orchestrator';

        // 1) Xác nhận / từ chối hành động đang chờ
        $text = $this->handleConfirmation($message, $user, $conversationId);
        if ($text !== null) $source = 'confirmation-gate';

        // 2) LLM (nếu có key) -> fallback engine nội bộ
        if ($text === null && $apiKey !== '') {
            try {
                $text = $this->runWithOpenAI($message, $user, $apiKey, $conversationId);
                if ($text !== '' && $text !== null) $source = 'openai-tool-calling'; else $text = null;
            } catch (Throwable $e) {
                $text = null;
                $this->trace = [];
            }
        }
        if ($text === null) {
            $text = $this->engine($message, $user, $conversationId);
        }

        $this->pdo->prepare("INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)")->execute([$conversationId, $text]);
        $this->pdo->prepare("UPDATE ai_conversations SET context=? WHERE id=?")->execute([json_encode($this->ctx, JSON_UNESCAPED_UNICODE), $conversationId]);

        return [
            'conversation_id' => $conversationId,
            'message' => $text,
            'tool_calls' => $this->trace,
            'tools_used' => array_values(array_unique(array_column($this->trace, 'tool'))),
            'tools_count' => count($this->trace),
            'context' => $this->ctx,
            'role' => $user['role'],
            'source' => $source,
            'timestamp' => date('H:i d/m/Y'),
        ];
    }

    // =====================================================================
    // TOOL EXECUTION (RBAC + AUDIT LOG)
    // =====================================================================
    public function runTool(string $name, array $args, array $user, int $cid): array
    {
        $start = microtime(true);
        $status = 'success';
        if (!isset($this->tools[$name])) {
            $res = ['error' => true, 'message' => "Tool {$name} không tồn tại."];
            $status = 'error';
        } elseif (!PermissionManager::can($user['role'], $name)) {
            $res = ['error' => true, 'denied' => true, 'message' => PermissionManager::denyMessage($name)];
            $status = 'denied';
        } else {
            try {
                $res = $this->tools[$name]->execute($args, $user, $this->pdo);
            } catch (Throwable $e) {
                $res = ['error' => true, 'message' => 'Lỗi thực thi tool: ' . $e->getMessage()];
                $status = 'error';
            }
        }
        $ms = (int)((microtime(true) - $start) * 1000);
        $this->log($user['id'], $cid, $name, $args, $res, $status, $ms);
        $this->trace[] = ['tool' => $name, 'arguments' => $args, 'status' => $status, 'execution_time_ms' => $ms, 'result' => $res];
        if ($status === 'success') $this->remember($name, $args, $res);
        return $res;
    }

    protected function log(int $uid, int $cid, string $tool, array $args, array $res, string $status, int $ms): void
    {
        try {
            $this->pdo->prepare("INSERT INTO ai_tool_logs (user_id, conversation_id, tool_name, arguments, result, status, execution_time_ms) VALUES (?,?,?,?,?,?,?)")
                ->execute([$uid ?: null, $cid, $tool, json_encode($args, JSON_UNESCAPED_UNICODE), json_encode($res, JSON_UNESCAPED_UNICODE), $status, $ms]);
        } catch (Throwable $e) { /* log lỗi không được làm hỏng luồng chính */ }
    }

    /** Ghi nhớ thực thể để hiểu "phim đó", "suất đó", "ghế đó" ở các câu sau */
    protected function remember(string $tool, array $args, array $res): void
    {
        switch ($tool) {
            case 'search_movies':
                if (($res['count'] ?? 0) === 1) $this->setMovie($res['movies'][0]['id'], $res['movies'][0]['title']);
                break;
            case 'get_showtimes':
                if (!empty($res['movie_id']) && !empty($res['showtimes'])) $this->setMovie($res['movie_id'], $res['showtimes'][0]['movie_title']);
                if (($res['count'] ?? 0) === 1) $this->setShowtime($res['showtimes'][0]);
                break;
            case 'get_available_seats':
                if (!empty($res['showtime_id'])) {
                    $this->ctx['showtime_id'] = $res['showtime_id'];
                    $this->ctx['movie_title'] = $res['movie'];
                    $this->ctx['room'] = $res['room'];
                    $this->ctx['showtime_time'] = substr($res['start_time'], 0, 5);
                }
                break;
            case 'get_booking':
                if (!empty($res['found'])) $this->ctx['booking_code'] = $res['booking_code'];
                break;
            case 'cancel_booking':
                if (!empty($args['booking_code'])) $this->ctx['booking_code'] = $args['booking_code'];
                break;
        }
    }

    protected function setMovie(int $id, string $title): void
    {
        if (($this->ctx['movie_id'] ?? null) !== $id) { unset($this->ctx['showtime_id'], $this->ctx['showtime_time'], $this->ctx['room']); }
        $this->ctx['movie_id'] = $id;
        $this->ctx['movie_title'] = $title;
    }

    protected function setShowtime(array $s): void
    {
        $this->ctx['showtime_id'] = $s['id'];
        $this->ctx['showtime_time'] = $s['start_time'];
        $this->ctx['room'] = $s['room'];
        $this->ctx['price'] = $s['price'];
    }

    // =====================================================================
    // CONFIRMATION GATE (hành động nguy hiểm)
    // =====================================================================
    protected function handleConfirmation(string $msg, array $user, int $cid): ?string
    {
        $lower = trim(mb_strtolower($msg));
        if (mb_strlen($lower) > 40) return null;
        $yes = (bool)preg_match('/^(xác nhận|xac nhan|đồng ý|dong y|ok|oke|yes|chắc chắn|duyệt|tiến hành)/u', $lower);
        $no = (bool)preg_match('/^(hủy bỏ|huỷ bỏ|không|thôi|no\b|bỏ qua|dừng|đừng)/u', $lower);
        if (!$yes && !$no) return null;

        $s = $this->pdo->prepare("SELECT * FROM ai_pending_actions WHERE conversation_id=? AND status='pending' ORDER BY id DESC LIMIT 1");
        $s->execute([$cid]);
        $p = $s->fetch(PDO::FETCH_ASSOC);
        if (!$p) return null;

        if (strtotime($p['expires_at']) < time()) {
            $this->pdo->prepare("UPDATE ai_pending_actions SET status='expired' WHERE id=?")->execute([$p['id']]);
            return "⏱️ Yêu cầu **{$p['summary']}** đã hết hạn xác nhận (5 phút). Vui lòng yêu cầu lại nếu vẫn muốn thực hiện.";
        }
        if ((int)$p['user_id'] !== $user['id']) {
            return "🔒 Hành động này do người dùng khác khởi tạo, bạn không thể xác nhận.";
        }
        if ($no) {
            $this->pdo->prepare("UPDATE ai_pending_actions SET status='cancelled' WHERE id=?")->execute([$p['id']]);
            $this->log($user['id'], $cid, $p['action'] . ':cancelled', json_decode($p['payload'], true) ?: [], ['summary' => $p['summary']], 'success', 0);
            return "✅ Đã **hủy bỏ** yêu cầu: {$p['summary']}. Không có dữ liệu nào bị thay đổi.";
        }

        // yes -> thực thi
        $payload = json_decode($p['payload'], true) ?: [];
        if ($p['action'] === 'cancel_booking') {
            try {
                $this->pdo->beginTransaction();
                $chk = $this->pdo->prepare("SELECT status FROM bookings WHERE id=? FOR UPDATE");
                $chk->execute([$payload['booking_id']]);
                if ($chk->fetchColumn() === 'cancelled') {
                    $this->pdo->rollBack();
                    return "ℹ️ Booking **{$payload['booking_code']}** đã được hủy trước đó.";
                }
                $this->pdo->prepare("UPDATE bookings SET status='cancelled' WHERE id=?")->execute([$payload['booking_id']]);
                $this->pdo->prepare("INSERT INTO pos_transactions (code, type, item_name, quantity, amount, payment_method, status, staff_id) VALUES (?, 'refund', ?, 1, ?, 'refund', 'success', ?)")
                    ->execute(['RF' . date('ymdHis') . rand(10, 99), 'Hoàn vé ' . $payload['booking_code'], $payload['amount'], $user['id'] ?: null]);
                $this->pdo->prepare("UPDATE ai_pending_actions SET status='confirmed' WHERE id=?")->execute([$p['id']]);
                $this->pdo->commit();
            } catch (Throwable $e) {
                if ($this->pdo->inTransaction()) $this->pdo->rollBack();
                return "❌ Không thể hủy booking: " . $e->getMessage();
            }
            $this->log($user['id'], $cid, 'cancel_booking:executed', $payload, ['summary' => $p['summary'], 'executed_by_role' => $user['role']], 'success', 0);
            return "✅ **ĐÃ HỦY BOOKING `{$payload['booking_code']}`**\n\n• Ghế của suất chiếu đã được **nhả lại** cho khách khác.\n• Đã tạo giao dịch hoàn tiền **" . $this->money($payload['amount']) . "** trên POS.\n• Hành động được ghi vào **Audit Log** (người thực hiện: {$user['role']} #{$user['id']}).\n\n💡 Hãy báo khách thời gian hoàn tiền theo phương thức thanh toán ban đầu.";
        }
        return "Không hỗ trợ hành động '{$p['action']}'.";
    }

    // =====================================================================
    // OPENAI TOOL-CALLING LOOP
    // =====================================================================
    protected function runWithOpenAI(string $message, array $user, string $apiKey, int $cid): ?string
    {
        $allowed = PermissionManager::allowedTools($user['role']);
        $defs = [];
        foreach ($this->tools as $t) {
            if (!in_array($t->name(), $allowed, true)) continue;
            $defs[] = ['type' => 'function', 'function' => ['name' => $t->name(), 'description' => $t->description(), 'parameters' => $t->schema()]];
        }

        $h = $this->pdo->prepare("SELECT role, content FROM (SELECT id, role, content FROM ai_messages WHERE conversation_id=? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 8) x ORDER BY id");
        $h->execute([$cid]);
        $messages = [['role' => 'system', 'content' => CinemaPrompt::system($user['role'], $this->ctx)]];
        foreach ($h->fetchAll(PDO::FETCH_ASSOC) as $m) $messages[] = ['role' => $m['role'], 'content' => $m['content']];

        for ($loop = 0; $loop < 5; $loop++) {
            $payload = ['model' => 'gpt-4o-mini', 'messages' => $messages, 'temperature' => 0.3];
            if ($defs) { $payload['tools'] = $defs; $payload['tool_choice'] = 'auto'; }

            $ch = curl_init('https://api.openai.com/v1/chat/completions');
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $apiKey],
                CURLOPT_POSTFIELDS => json_encode($payload)]);
            $res = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($code !== 200 || !$res) throw new \Exception("OpenAI HTTP {$code}");

            $msg = json_decode($res, true)['choices'][0]['message'] ?? null;
            if (!$msg) return null;
            if (empty($msg['tool_calls'])) return $msg['content'] ?? null;

            $messages[] = $msg;
            foreach ($msg['tool_calls'] as $tc) {
                $args = json_decode($tc['function']['arguments'], true) ?: [];
                $result = $this->runTool($tc['function']['name'], $args, $user, $cid);
                $messages[] = ['role' => 'tool', 'tool_call_id' => $tc['id'], 'content' => json_encode($result, JSON_UNESCAPED_UNICODE)];
            }
        }
        return null;
    }

    // =====================================================================
    // AUTONOMOUS ENGINE (offline) - router ý định + dùng bộ nhớ ngữ cảnh
    // =====================================================================
    protected function engine(string $msg, array $user, int $cid): string
    {
        $lower = mb_strtolower(trim($msg));
        $role = $user['role'];

        // ---- 0. Chào hỏi & Giao tiếp tự nhiên ----
        if (preg_match('/^(xin chào|chào bạn|chào ad|chào em|chào anh|chào chị|chào|hello|hi|hey|alo)\b/iu', $lower) || preg_match('/^(bạn là ai|bạn tên là gì|bạn tên gì|giới thiệu về bạn|bạn làm được gì)/iu', $lower)) {
            return $this->renderGreeting($role, $user['name'] ?? '');
        }
        if (preg_match('/^(cảm ơn|cam on|cám ơn|thanks|thank you|ok cảm ơn|tuyệt vời|oke cảm ơn)\b/iu', $lower)) {
            return "Dạ không có gì ạ! Rất vui được hỗ trợ bạn. Chúc bạn có những phút giây thật tuyệt vời tại **Aurora Cinemas**! 🍿🎬 Nếu cần hỗ trợ thêm thông tin nào khác, bạn cứ nhắn mình nhé!";
        }
        if (preg_match('/^(tạm biệt|bye|goodbye|hẹn gặp lại)\b/iu', $lower)) {
            return "Tạm biệt bạn! Chúc bạn một ngày tràn đầy năng lượng và niềm vui! Hẹn gặp lại bạn tại **Aurora Cinemas**! ✨";
        }

        // ---- thực thể ----
        $movie = $this->detectMovie($msg);
        if ($movie) $this->setMovie((int)$movie['id'], $movie['title']);
        $time = $this->detectTime($lower);
        $seatCodes = $this->detectSeats($msg);
        $date = $this->detectDate($lower);
        $period = preg_match('/hôm qua/u', $lower) ? 'yesterday' : (preg_match('/tuần|7 ngày/u', $lower) ? 'week' : 'today');

        // ---- 1. Bảng giá vé chung (Khi hỏi giá vé mà không chọn ghế/suất cụ thể) ----
        $asksGeneralPrice = preg_match('/(bảng giá|giá vé|vé bao nhiêu|giá xem phim|bao nhiêu một vé|mức giá|giá một vé|bao nhiêu tiền một vé|giá vé rạp)/iu', $lower);
        if ($asksGeneralPrice && empty($seatCodes) && empty($time) && !preg_match('/(phim đó|phim này|suất đó|ghế đó)/iu', $lower) && empty($movie)) {
            return $this->renderPriceTable();
        }

        // ---- 2. Menu Bắp Nước Concession F&B ----
        if (preg_match('/(bắp|popcorn|nước ngọt|combo|f&b|post-mix|bắp rang|bắp phô mai|bắp caramel|nước suối)/iu', $lower) && !preg_match('/(quy trình|công thức|vệ sinh|kỹ thuật|sự cố|hỏng)/iu', $lower)) {
            return $this->renderConcessionMenu();
        }

        // ---- 3. Mã định danh & Hủy vé / Tra cứu vé ----
        if (preg_match('/\b(BK[A-Z0-9\-]+|GEN-\d+-\d+)\b/i', $msg, $m)) {
            $code = strtoupper($m[1]);
            if (preg_match('/(hủy|huỷ|cancel)/u', $lower)) {
                return $this->renderCancel($this->runTool('cancel_booking', ['booking_code' => $code, 'reason' => 'Yêu cầu qua Cinema AI'], $user, $cid));
            }
            return $this->renderBooking($this->runTool('get_booking', ['booking_code' => $code], $user, $cid));
        }
        if (preg_match('/(hủy|huỷ)\s*(booking|vé|đơn)/u', $lower) && !empty($this->ctx['booking_code'])) {
            return $this->renderCancel($this->runTool('cancel_booking', ['booking_code' => $this->ctx['booking_code']], $user, $cid));
        }
        if (preg_match('/\bPOS\s?-?(\d+)\b/i', $msg, $m)) {
            return $this->renderPos($this->runTool('get_pos_transaction', ['code' => 'POS' . $m[1]], $user, $cid));
        }
        if (preg_match('/(giao dịch|thanh toán).*(lỗi|treo|pending|thất bại)|pos.*(lỗi|treo)/u', $lower)) {
            return $this->renderPos($this->runTool('get_pos_transaction', [], $user, $cid));
        }

        // ---- 4. Quản trị & Vận hành (Manager) ----
        if (preg_match('/(tình hình|báo cáo|tổng quan|tổng kết|vận hành).*(rạp|hôm nay|ngày|ca)|báo cáo/u', $lower)) {
            return $this->renderReport($this->runTool('generate_daily_report', [], $user, $cid));
        }
        if (preg_match('/(phim nào|top phim|phim).*(bán chạy|doanh thu cao|nhiều vé|hot nhất)|bán chạy nhất|doanh thu cao nhất/u', $lower)) {
            return $this->renderTop($this->runTool('get_top_movies', ['period' => $period], $user, $cid));
        }
        if (preg_match('/doanh thu|doanh số|bán được bao nhiêu|thu được bao nhiêu|combo bán/u', $lower)) {
            return $this->renderRevenue($this->runTool('get_revenue', ['period' => $period], $user, $cid));
        }
        if (preg_match('/lấp đầy|công suất|suất nào (vắng|đông|ế)|tỷ lệ ghế|vắng khách/u', $lower)) {
            return $this->renderOccupancy($this->runTool('get_occupancy', [], $user, $cid));
        }

        // ---- 5. EMS / TMS (Phòng chiếu & Thiết bị kỹ thuật) ----
        $room = preg_match('/\bP0?([1-5])\b/i', $msg, $rm) ? 'P0' . $rm[1] : '';
        $asksHow = preg_match('/(xử lý|quy trình|cách|làm sao|phải làm gì|hướng dẫn)/u', $lower);
        if ((preg_match('/(thiết bị|máy chiếu|âm thanh|điều hòa|máy lạnh|bảo trì|bảo dưỡng|chưa bắt đầu|không chiếu|sự cố)/u', $lower) || ($room && preg_match('/(lỗi|hỏng|hư|chưa|không)/u', $lower))) && !($asksHow && !$room)) {
            $args = [];
            if ($room) $args['room'] = $room;
            if (preg_match('/(lỗi|hỏng|hư|sự cố|đang)/u', $lower) && !$room) $args['only_issues'] = true;
            return $this->renderEquipment($this->runTool('get_equipment_status', $args, $user, $cid));
        }

        // ---- 6. Nhân sự & Đào tạo ----
        if (preg_match('/(lịch làm|ca làm|ca trực|ai trực|phân ca|lịch trực|tôi làm ca)/u', $lower)) {
            $args = ['date' => $date];
            if (preg_match('/(nhân viên|bạn|anh|chị)\s+([A-ZÀ-Ỹ][\p{L}]+(?:\s+[A-ZÀ-Ỹ][\p{L}]+)*)/u', $msg, $nm)) $args['staff_name'] = $nm[2];
            return $this->renderSchedule($this->runTool('get_staff_schedule', $args, $user, $cid));
        }
        if (preg_match('/(chứng chỉ|đào tạo|khóa học|bài thi|bài kiểm tra|điểm thi|học xong)/u', $lower)) {
            return $this->renderTraining($this->runTool('get_training_progress', [], $user, $cid));
        }

        // ---- 7. Ghế / Giá vé suất / Chọn ghế (dùng bộ nhớ ngữ cảnh) ----
        $wantsSeat = preg_match('/(ghế|chỗ ngồi|còn chỗ|trống)/u', $lower);
        $wantsPrice = preg_match('/(giá|bao nhiêu tiền|tốn bao nhiêu|mất bao nhiêu)/u', $lower);
        $wantsPick = preg_match('/(chọn|đặt|giữ|lấy)\s+(ghế|giúp|cho)/u', $lower) || ($seatCodes && preg_match('/(chọn|đặt|giữ|lấy)/u', $lower));

        if ($wantsSeat || $wantsPrice || $wantsPick) {
            $st = $this->resolveShowtime($time, $lower);
            if (isset($st['ask'])) return $st['ask'];

            $args = ['showtime_id' => $st['id']];
            if ($seatCodes) $args['check_seats'] = $seatCodes;
            $r = $this->runTool('get_available_seats', $args, $user, $cid);
            if (!empty($r['error'])) return "⚠️ " . $r['message'];
            $this->ctx['price'] = $st['price'];
            return $this->renderSeats($r, $st, $seatCodes, (bool)$wantsPrice, (bool)$wantsPick);
        }

        // ---- 8. Suất chiếu & Lịch chiếu ----
        if (preg_match('/(suất|lịch chiếu|mấy giờ|chiếu lúc|giờ chiếu|khung giờ)/u', $lower) || ($movie && preg_match('/(hôm nay|ngày mai|tối mai|chiếu)/u', $lower))) {
            $args = ['date' => $date];
            $asksAll = preg_match('/(tất cả|các phim|những phim|toàn bộ|tổng quan|hôm nay chiếu gì|lịch chiếu hôm nay|lịch chiếu ngày mai)/u', $lower);
            if (!$asksAll) {
                if ($movie) {
                    $args['movie_id'] = (int)$movie['id'];
                } elseif (preg_match('/(phim đó|phim này|phim nãy|phim vừa nói)/u', $lower) && !empty($this->ctx['movie_id'])) {
                    $args['movie_id'] = $this->ctx['movie_id'];
                }
            }
            $r = $this->runTool('get_showtimes', $args, $user, $cid);
            return $this->renderShowtimes($r);
        }

        // ---- 9. Gợi ý phim ----
        if (preg_match('/(gợi ý|nên xem|đề xuất|giống|tương tự|thích .* xem|xem gì|phim nào hay|phim gì hay)/u', $lower)) {
            $args = [];
            if ($movie) $args['movie_title'] = $movie['title'];
            elseif (preg_match('/(thích|giống)\s+([\p{L}0-9: ]{3,40}?)(?:\s+(thì|nên|nhé|không|\?)|$|\?)/u', $msg, $mm)) $args['movie_title'] = trim($mm[2]);
            foreach (['kinh dị' => 'kinh dị', 'hành động' => 'hành động', 'tình cảm' => 'tình cảm', 'tâm lý' => 'tâm lý', 'viễn tưởng' => 'viễn tưởng', 'hài' => 'hài'] as $k => $g) {
                if (mb_strpos($lower, $k) !== false) { $args['genre'] = $g; break; }
            }
            return $this->renderRecommend($this->runTool('recommend_movies', $args, $user, $cid), $args);
        }

        // ---- 10. Thông tin phim trong DB (đạo diễn, diễn viên...) ----
        if ($movie) {
            $r = $this->runTool('search_movies', ['query' => $movie['title']], $user, $cid);
            return $this->renderMovies($r);
        }

        // ---- 11. SOP / Quy trình nghiệp vụ (RAG) ----
        if (preg_match('/(đổi vé|hoàn vé|hoàn tiền|quy trình|quy định|nội quy|sop|last|khiếu nại|độ tuổi|phân loại|cccd|vneid|kdm|xử lý|thế nào|làm sao|hướng dẫn|pos|tms|ems)/u', $lower)) {
            $r = $this->runTool('search_knowledge_base', ['query' => $msg], $user, $cid);
            if (($r['count'] ?? 0) > 0) return $this->renderKnowledge($r);
        }

        // ---- 12. Tra cứu Internet (Bộ não 4) ----
        if (preg_match('/(bao nhiêu tuổi|sinh năm|tiểu sử|là ai|oscar|giải thưởng|mới nhất|phim mới|tin tức|đánh giá|imdb|review|diễn viên|đạo diễn|doanh thu phòng vé|sắp chiếu)/u', $lower)) {
            $q = trim(preg_replace('/(bao nhiêu tuổi|hiện nay|hiện|là ai|mới nhất|cho tôi biết|tìm hiểu|thông tin về|thông tin|\?|đánh giá|tiểu sử|review)/u', ' ', $msg));
            $q = trim(preg_replace('/\s+/', ' ', $q));
            return $this->renderWeb($this->runTool('search_web', ['query' => $q !== '' ? $q : $msg], $user, $cid), $q);
        }

        // ---- 13. Tìm kiếm phim / Fallback thông minh ----
        $r = $this->runTool('search_movies', ['query' => $msg], $user, $cid);
        if (($r['count'] ?? 0) > 0 && preg_match('/(phim|xem|tìm|chiếu)/u', $lower)) return $this->renderMovies($r);
        return $this->help($role);
    }

    // =====================================================================
    // ENTITY HELPERS
    // =====================================================================
    protected function allMovies(): array
    {
        if ($this->movies === null) $this->movies = $this->pdo->query("SELECT id, title, original_title FROM movies")->fetchAll(PDO::FETCH_ASSOC);
        return $this->movies;
    }

    protected function detectMovie(string $msg): ?array
    {
        // Loại bỏ các từ chỉ thời gian mang nghĩa "ngày mai", "sáng mai", "mai chiếu", v.v. để không bị nhận diện nhầm thành phim "Mai"
        $clean = preg_replace('/(\bngày mai\b|\bsáng mai\b|\bchiều mai\b|\btối mai\b|\bmai sau\b|\bhôm mai\b|\bmai mốt\b|\bmai\s+(có|chiếu|rạp|mở|em|tôi|anh|mình|làm|đi|về|xem))\b/iu', ' ', $msg);
        $best = null; $bestLen = 0;
        foreach ($this->allMovies() as $m) {
            $aliases = [];
            foreach ([$m['title'], $m['original_title']] as $t) {
                if (!$t) continue;
                $aliases[] = $t;
                if (str_contains($t, ':')) $aliases[] = trim(explode(':', $t)[0]);
            }
            $first = explode(' ', (string)$m['original_title'])[0] ?? '';
            if (mb_strlen($first) >= 6) $aliases[] = $first;
            foreach (array_unique($aliases) as $a) {
                if (mb_strlen($a) < 3) continue;

                // Quy tắc an toàn đặc biệt cho phim ngắn như "Mai": chỉ khớp nếu người dùng nói rõ tên phim
                if (mb_strtolower($a) === 'mai') {
                    if (!preg_match('/(phim\s+mai|xem\s+mai|vé\s+mai|\bmai\s*\([0-9]{4}\)|mai\s+của\s+trấn\s+thành)/iu', $msg)) {
                        continue;
                    }
                }

                if (preg_match('/(?<![\p{L}\p{N}])' . preg_quote($a, '/') . '(?![\p{L}\p{N}])/iu', $clean) && mb_strlen($a) > $bestLen) {
                    $best = $m; $bestLen = mb_strlen($a);
                }
            }
        }
        return $best;
    }

    protected function detectTime(string $lower): ?string
    {
        if (preg_match('/(?<!\d)([01]?\d|2[0-3])\s*(?::|h|giờ)\s*([0-5]\d)?(?!\d)/u', $lower, $m)) {
            return sprintf('%02d:%02d', $m[1], $m[2] ?? 0);
        }
        return null;
    }

    protected function detectSeats(string $msg): array
    {
        preg_match_all('/\b([A-G])\s?(\d{1,2})\b/', $msg, $m, PREG_SET_ORDER);
        $out = [];
        foreach ($m as $x) $out[] = strtoupper($x[1]) . intval($x[2]);
        return array_values(array_unique($out));
    }

    protected function detectDate(string $lower): string
    {
        if (preg_match('/(\bngày mai\b|\bsáng mai\b|\bchiều mai\b|\btối mai\b|\bmai sau\b|\bhôm sau\b|\bmai\b)/u', $lower)) return date('Y-m-d', strtotime('+1 day'));
        if (preg_match('/(\bhôm qua\b|\bhôm trc\b|\bhôm trước\b)/u', $lower)) return date('Y-m-d', strtotime('-1 day'));
        if (preg_match('/(\d{4}-\d{2}-\d{2})/', $lower, $m)) return $m[1];
        if (preg_match('/(\d{1,2})\/(\d{1,2})/', $lower, $m)) return date('Y') . sprintf('-%02d-%02d', $m[2], $m[1]);
        return date('Y-m-d');
    }

    /** Xác định suất chiếu đang nói tới từ giờ + phim trong bộ nhớ. Trả về row hoặc ['ask'=>...] */
    protected function resolveShowtime(?string $time, string $lower): array
    {
        $movieId = $this->ctx['movie_id'] ?? null;
        $band = preg_match('/tối/u', $lower) ? 'evening' : null;

        if ($time === null && $band === 'evening') $time = null;

        if ($time || $band) {
            $sql = "SELECT s.id, s.price, TIME_FORMAT(s.start_at,'%H:%i') t, r.name room, m.title, m.id mid FROM showtimes s JOIN rooms r ON r.id=s.room_id JOIN movies m ON m.id=s.movie_id WHERE DATE(s.start_at)=CURDATE() AND s.status='active'";
            $p = [];
            if ($movieId) { $sql .= " AND s.movie_id=?"; $p[] = $movieId; }
            if ($time) { $sql .= " AND TIME_FORMAT(s.start_at,'%H:%i')=?"; $p[] = $time; }
            elseif ($band) { $sql .= " AND HOUR(s.start_at)>=19"; }
            $sql .= " ORDER BY s.start_at";
            $q = $this->pdo->prepare($sql); $q->execute($p);
            $rows = $q->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) === 1 || ($rows && $movieId)) {
                $r = $rows[0];
                $this->setMovie((int)$r['mid'], $r['title']);
                $this->setShowtime(['id' => (int)$r['id'], 'start_time' => $r['t'], 'room' => $r['room'], 'price' => (float)$r['price']]);
                return ['id' => (int)$r['id'], 'price' => (float)$r['price'], 'time' => $r['t'], 'room' => $r['room'], 'movie' => $r['title']];
            }
            if (count($rows) > 1) {
                $l = array_map(fn($r) => "• **{$r['t']}** – {$r['title']} ({$r['room']})", $rows);
                return ['ask' => "Có nhiều phim chiếu lúc **" . ($time ?: 'tối') . "**, bạn muốn xem suất nào?\n\n" . implode("\n", $l) . "\n\n💡 Hãy nêu tên phim, ví dụ: *\"Suất " . ($time ?: '19:30') . " của {$rows[0]['title']} còn ghế không?\"*"];
            }
            return ['ask' => "Không có suất chiếu " . ($time ? "lúc **{$time}**" : 'buổi tối') . ($movieId ? " của **{$this->ctx['movie_title']}**" : '') . " hôm nay. Bạn có thể hỏi *\"Lịch chiếu hôm nay\"* để xem các giờ hiện có."];
        }

        if (!empty($this->ctx['showtime_id'])) {
            $q = $this->pdo->prepare("SELECT s.id, s.price, TIME_FORMAT(s.start_at,'%H:%i') t, r.name room, m.title FROM showtimes s JOIN rooms r ON r.id=s.room_id JOIN movies m ON m.id=s.movie_id WHERE s.id=?");
            $q->execute([$this->ctx['showtime_id']]);
            if ($r = $q->fetch(PDO::FETCH_ASSOC)) return ['id' => (int)$r['id'], 'price' => (float)$r['price'], 'time' => $r['t'], 'room' => $r['room'], 'movie' => $r['title']];
        }
        if ($movieId) {
            return ['ask' => "Bạn muốn kiểm tra **suất nào** của **{$this->ctx['movie_title']}**? Hãy hỏi *\"{$this->ctx['movie_title']} hôm nay có suất nào?\"* hoặc nêu giờ cụ thể, ví dụ *\"suất 19:30\"*."];
        }
        return ['ask' => "Bạn muốn kiểm tra ghế của **phim nào**, **suất mấy giờ**? Ví dụ: *\"Avatar suất 19:30 còn ghế không?\"*"];
    }

    // =====================================================================
    // RENDERERS
    // =====================================================================
    protected function money($n): string { return number_format((float)$n, 0, ',', '.') . 'đ'; }

    protected function denied(array $r): ?string
    {
        return !empty($r['denied']) ? "🔒 **Từ chối truy cập (RBAC)**\n\n" . $r['message'] . "\n\n*Yêu cầu này đã được ghi vào nhật ký bảo mật (Audit Log).*" : null;
    }

    protected function renderGreeting(string $role, string $name = ''): string
    {
        $greetingName = $name ? " **{$name}**" : '';
        $roleTitle = match($role) {
            'manager' => 'Quản lý Cụm Rạp (Manager)',
            'staff' => 'Nhân viên Cụm Rạp (Staff)',
            default => 'Quý khách hàng'
        };
        return "👋 **Xin chào{$greetingName}!** Tôi là **Cinema AI** – Trợ lý điều hành thông minh của **AURORA CINEMAS** 🎬.\n\n"
             . "Vai trò hiện tại của bạn: **{$roleTitle}**.\n\n"
             . "💡 **Bạn có thể hỏi tôi bất kỳ nội dung nào:**\n"
             . "• 🎬 **Lịch chiếu & Suất:** *\"Hôm nay rạp chiếu những phim gì?\"*, *\"Avatar suất 19:30 còn ghế không?\"*\n"
             . "• 💵 **Giá vé & Combo:** *\"Giá vé bao nhiêu?\"*, *\"Menu bắp nước và combo hiện có?\"*\n"
             . "• 🎫 **Tra cứu vé & POS:** *\"Kiểm tra mã đặt vé BK20261006001\"*, *\"Giao dịch POS lỗi\"*\n"
             . "• 📚 **Quy trình & SOP:** *\"Quy trình đổi trả vé?\"*, *\"Quy định độ tuổi C18 kiểm tra thế nào?\"*\n"
             . ($role === 'manager' ? "• 📊 **Vận hành Quản lý:** *\"Báo cáo doanh thu hôm nay\"*, *\"Top phim bán chạy\"*, *\"Tỷ lệ lấp đầy phòng chiếu\"*\n" : "• 🗓️ **Ca làm việc:** *\"Lịch làm việc của tôi ngày mai\"*, *\"Tiến độ bài thi và chứng chỉ\"*\n");
    }

    protected function renderPriceTable(): string
    {
        return "🎟️ **BẢNG GIÁ VÉ NIÊM YẾT – CỤM RẠP AURORA CINEMAS**\n\n"
             . "• **Ghế Tiêu chuẩn (Standard 2D):** **95.000đ** *(Thứ 2 - Thứ 5)* | **105.000đ** *(Cuối tuần & Ngày lễ)*\n"
             . "• **Ghế VIP (Tầm nhìn trung tâm):** **115.000đ** / vé\n"
             . "• **Ghế Đôi Sweetbox (Dành cho 2 người):** **230.000đ** / cặp (tặng kèm bắp)\n"
             . "• **Ưu đãi Học sinh / Sinh viên / U22:** **65.000đ** / vé *(Xuất trình thẻ HSSV/VNeID)*\n"
             . "• **Phòng chiếu đặc biệt:**\n"
             . "   - Phòng Chiếu Laser 4K Dolby Atmos: **+20.000đ** / vé\n"
             . "   - Phòng Chiếu IMAX Laser: **145.000đ - 165.000đ** / vé\n\n"
             . "💡 *Bạn muốn xem suất chiếu hoặc kiểm tra ghế trống của phim nào? Hãy nhắn tên phim và khung giờ nhé!*";
    }

    protected function renderConcessionMenu(): string
    {
        return "🍿 **MENU BẮP NƯỚC & COMBO F&B – AURORA CONCESSION**\n\n"
             . "1. **Combo Solo (1 người):** 1 Bắp Rang Bơ (Size M) + 1 Nước Ngọt Tươi (Size L) → **85.000đ**\n"
             . "2. **Combo Couple (2 người):** 1 Bắp Rang Bơ (Size L) + 2 Nước Ngọt Tươi (Size L) → **119.000đ**\n"
             . "3. **Combo Family / Bom Tấn:** 2 Bắp Lớn + 3 Nước Ngọt + 1 Snack Khoai Tây → **169.000đ**\n\n"
             . "🍿 **Hương vị bắp:** Bắp Truyền Thống, Bắp Caramel Thượng Hạng (+15.000đ), Bắp Phô Mai Cheddar (+15.000đ).\n"
             . "🥤 **Nước giải khát Post-Mix:** Coca-Cola, Sprite, Fanta, Dasani (Refill miễn phí trong ngày với thẻ VIP).\n\n"
             . "💡 *Bạn có thể đặt trực tiếp tại Quầy Bắp Nước hoặc chọn thêm khi mua vé trên POS/Ứng dụng.*";
    }

    protected function renderBooking(array $r): string
    {
        if ($d = $this->denied($r)) return $d;
        if (empty($r['found'])) return "❌ " . ($r['message'] ?? 'Không tìm thấy booking.');
        return "🎫 **TRA CỨU ĐẶT VÉ**\n\n• **Mã:** `{$r['booking_code']}`\n• **Khách:** {$r['customer_name']} ({$r['customer_phone']})\n• **Trạng thái:** **{$r['status']}**\n• **Phim:** **{$r['movie']}** [{$r['age_rating']}]\n• **Phòng:** {$r['room']} ({$r['room_type']})\n• **Suất:** {$r['showtime']}\n• **Ghế ({$r['seat_count']}):** " . implode(', ', $r['seats']) . "\n• **Tổng tiền:** **{$r['total_amount']}**\n\n💡 Muốn hủy vé này, hãy nói: *\"Hủy booking {$r['booking_code']}\"* – tôi sẽ hỏi xác nhận trước khi thực hiện.";
    }

    protected function renderCancel(array $r): string
    {
        if ($d = $this->denied($r)) return $d;
        if (empty($r['found'])) return "❌ " . $r['message'];
        if (!empty($r['blocked'])) return "⛔ " . $r['message'];
        $w = $r['warning'] ? "\n⚠️ {$r['warning']}\n" : '';
        return "⚠️ **XÁC NHẬN HÀNH ĐỘNG QUAN TRỌNG**\n\nTôi sắp thực hiện: **{$r['summary']}**.\n{$w}\nHành động này sẽ **nhả ghế** và **tạo giao dịch hoàn tiền**, được ghi Audit Log.\n\n👉 Trả lời **\"xác nhận\"** để tiến hành, hoặc **\"hủy bỏ\"** để dừng. *(Hết hạn sau {$r['expires_in_minutes']} phút)*";
    }

    protected function renderPos(array $r): string
    {
        if ($d = $this->denied($r)) return $d;
        if (($r['mode'] ?? '') === 'problem_list') {
            if (!$r['transactions']) return "✅ Hôm nay không có giao dịch POS lỗi hoặc đang treo.";
            $o = "💳 **GIAO DỊCH POS LỖI / ĐANG TREO HÔM NAY**\n\n";
            foreach ($r['transactions'] as $t) $o .= "• `{$t['code']}` lúc {$t['t']} – {$t['item_name']} – **{$this->money($t['amount'])}** – *{$t['status']}*" . ($t['error_message'] ? " → {$t['error_message']}" : '') . "\n";
            return $o . "\n💡 Hỏi chi tiết từng mã, ví dụ: *\"Giao dịch POS125 bị lỗi gì?\"*";
        }
        if (empty($r['found'])) return "❌ " . $r['message'];
        $o = "💳 **GIAO DỊCH `{$r['code']}`**\n\n• **Loại:** {$r['type']} – {$r['item']} (x{$r['quantity']})\n• **Số tiền:** **{$this->money($r['amount'])}** ({$r['payment_method']})\n• **Trạng thái:** **{$r['status']}**\n• **Thời gian:** {$r['time']}" . ($r['staff'] ? " – NV: {$r['staff']}" : '') . "\n";
        if ($r['error_message']) $o .= "• **Lỗi:** {$r['error_message']}\n";
        return $o . "\n🛠️ **Hướng xử lý:** {$r['advice']}";
    }

    protected function renderReport(array $r): string
    {
        if ($d = $this->denied($r)) return $d;
        $t = $r['revenue'];
        $o = "📊 **BÁO CÁO VẬN HÀNH HÔM NAY ({$r['date']})**\n\n";
        $o .= "💰 **Doanh thu ròng:** **{$this->money($t['net_revenue'])}**\n   • Vé: {$this->money($t['ticket_revenue'])} ({$t['tickets_sold']} vé)\n   • Combo: {$this->money($t['combo_revenue'])} ({$t['combo_qty']} suất)\n   • Hoàn tiền: {$this->money($t['refunds'])}\n\n";
        $b = $r['occupancy']['bands'];
        $o .= "💺 **Tỷ lệ lấp đầy:** **{$r['occupancy']['overall']}%** (Sáng " . ($b['sang'] ?? '–') . "% · Chiều " . ($b['chieu'] ?? '–') . "% · Tối " . ($b['toi'] ?? '–') . "%)\n\n";
        if ($r['top_movies']) {
            $o .= "🏆 **Top phim:**\n";
            foreach ($r['top_movies'] as $i => $m) $o .= "   " . ($i + 1) . ". {$m['title']} – {$m['tickets']} vé – {$this->money($m['revenue'])}\n";
            $o .= "\n";
        }
        $o .= "🛠️ **Sự cố thiết bị đang mở:** " . count($r['incidents']) . " • 💳 **POS lỗi/treo:** {$r['pos_issues']}\n";
        foreach (array_slice($r['incidents'], 0, 3) as $i) $o .= "   • [{$i['severity']}] {$i['name']}: {$i['description']}\n";
        if ($r['insights']) {
            $o .= "\n🧠 **PHÂN TÍCH & ĐỀ XUẤT CỦA AI:**\n";
            foreach ($r['insights'] as $x) $o .= "   ➤ {$x}\n";
        }
        return $o;
    }

    protected function renderRevenue(array $r): string
    {
        if ($d = $this->denied($r)) return $d;
        $t = $r['total'];
        $o = "💰 **DOANH THU – {$r['label']}**\n\n• **Doanh thu ròng:** **{$this->money($t['net_revenue'])}**\n• Vé: {$this->money($t['ticket_revenue'])} ({$t['tickets_sold']} vé)\n• Combo bắp nước: {$this->money($t['combo_revenue'])} ({$t['combo_qty']} suất)\n• Hoàn tiền: {$this->money($t['refunds'])}\n";
        if (count($r['by_day']) > 1) {
            $o .= "\n📅 **Theo ngày:**\n";
            foreach ($r['by_day'] as $d2) $o .= "   • " . date('d/m', strtotime($d2['date'])) . ": **{$this->money($d2['net_revenue'])}**\n";
        }
        return $o;
    }

    protected function renderTop(array $r): string
    {
        if ($d = $this->denied($r)) return $d;
        if (empty($r['movies'])) return "Chưa có dữ liệu bán vé cho {$r['label']}.";
        $o = "🏆 **TOP PHIM – {$r['label']}**\n\n";
        foreach ($r['movies'] as $i => $m) $o .= ($i + 1) . ". **{$m['title']}** [{$m['age_rating']}] – {$m['tickets']} vé – **{$this->money($m['revenue'])}**\n";
        return $o . "\n💡 Gợi ý: ưu tiên thêm suất giờ vàng cho phim đứng đầu.";
    }

    protected function renderOccupancy(array $r): string
    {
        $b = $r['band_rates'];
        $o = "💺 **TỶ LỆ LẤP ĐẦY ({$r['date']})**\n\n• **Tổng:** **{$r['overall_rate']}%** ({$r['seats_sold']}/{$r['seats_capacity']} ghế)\n• Sáng: " . ($b['sang'] ?? '–') . "% · Chiều: " . ($b['chieu'] ?? '–') . "% · Tối: " . ($b['toi'] ?? '–') . "%\n\n📉 **Suất vắng nhất:**\n";
        foreach ($r['lowest'] as $s) $o .= "   • {$s['time']} – {$s['movie']} ({$s['room']}): **{$s['rate']}%**\n";
        $o .= "\n📈 **Suất đông nhất:**\n";
        foreach ($r['highest'] as $s) $o .= "   • {$s['time']} – {$s['movie']} ({$s['room']}): **{$s['rate']}%**\n";
        return $o;
    }

    protected function renderEquipment(array $r): string
    {
        if (empty($r['found'])) return "❌ " . $r['message'];
        $icon = ['operational' => '🟢', 'warning' => '🟡', 'fault' => '🔴', 'maintenance' => '🟠'];
        $o = "🛠️ **TÌNH TRẠNG THIẾT BỊ – {$r['room']}** ({$r['issues']}/{$r['total']} thiết bị có vấn đề)\n\n";
        foreach ($r['equipment'] as $e) {
            $o .= "{$icon[$e['status']]} **{$e['name']}** – *{$e['status']}*" . ($e['maintenance_due_soon'] ? " ⏰ bảo trì tới hạn {$e['next_maintenance']}" : '') . "\n";
            foreach ($e['open_incidents'] as $i) $o .= "     ↳ [{$i['severity']}] {$i['description']} (báo {$i['reported']}, {$i['status']})\n";
        }
        if (!empty($r['show_risk'])) {
            $o .= "\n🎯 **Kết luận TMS:** {$r['show_risk']}";
            if (!empty($r['showtimes_today'])) $o .= "\n   Suất hôm nay của phòng: " . implode(', ', array_map(fn($s) => "{$s['t']} {$s['title']}", $r['showtimes_today']));
        }
        return $o;
    }

    protected function renderSchedule(array $r): string
    {
        $o = "🗓️ **LỊCH PHÂN CA {$r['date']}** ({$r['scope']})\n\n";
        if (!$r['schedules']) return $o . "Chưa có lịch phân ca nào cho ngày này." . ($r['pending_registrations'] ? "\n📝 Có **{$r['pending_registrations']}** đăng ký nguyện vọng đang chờ duyệt." : '');
        foreach ($r['schedules'] as $s) $o .= "• **{$s['st']}–{$s['et']}** {$s['shift']} • {$s['name']} ({$s['department']}) → *{$s['location']}* [{$s['status']}]\n";
        if ($r['pending_registrations']) $o .= "\n📝 Có **{$r['pending_registrations']}** đăng ký nguyện vọng đang chờ duyệt.";
        return $o;
    }

    protected function renderTraining(array $r): string
    {
        if (isset($r['staff'])) {
            $o = "🎓 **TIẾN ĐỘ ĐÀO TẠO TOÀN BỘ NHÂN VIÊN**\n\n";
            foreach ($r['staff'] as $s) $o .= "• **{$s['name']}**: {$s['certs']} chứng chỉ · {$s['attempts']} lượt thi · điểm TB " . ($s['avg_score'] ?? '–') . "\n";
            return $o;
        }
        if (empty($r['found'])) return "❌ " . $r['message'];
        $o = "🎓 **TIẾN ĐỘ ĐÀO TẠO**\n\n🏆 **Chứng chỉ ({$this->cnt($r['certificates'])}/{$r['total_quizzes']} bài):**\n";
        foreach ($r['certificates'] as $c) $o .= "   • {$c['title']} – {$c['score']} điểm ({$c['issued_at']})\n";
        if (!$r['certificates']) $o .= "   Chưa có chứng chỉ nào.\n";
        $o .= "\n📝 **Lượt thi gần đây:**\n";
        foreach ($r['recent_attempts'] as $a) $o .= "   • {$a['title']}: {$a['score']} điểm – " . ($a['passed'] ? '✅ Đạt' : '❌ Chưa đạt') . " ({$a['d']})\n";
        if (!$r['recent_attempts']) $o .= "   Chưa có lượt thi nào.\n";
        return $o;
    }

    protected function cnt($a): int { return is_array($a) ? count($a) : 0; }

    protected function renderSeats(array $r, array $st, array $seatCodes, bool $price, bool $pick): string
    {
        $o = "💺 **SƠ ĐỒ GHẾ – {$r['movie']} lúc {$st['time']} ({$r['room']})**\n\n• **Còn trống:** **{$r['available_count']}/{$r['total_seats']}** ghế (lấp đầy {$r['occupancy_rate']})\n";
        if (!empty($r['recommended_center_seats'])) $o .= "• **Ghế trung tâm đẹp:** " . implode(', ', $r['recommended_center_seats']) . "\n";
        if ($seatCodes && !empty($r['seat_check'])) {
            $o .= "\n🔎 **Kiểm tra ghế bạn chọn:**\n";
            foreach ($r['seat_check'] as $c) {
                $o .= "   • **{$c['code']}** ({$c['type']}): " . ($c['available'] ? '✅ còn trống' : ($c['exists'] ? '❌ đã có người đặt' : '⚠️ không tồn tại trong phòng')) . "\n";
            }
        }
        if ($price) {
            $o .= "\n💵 **Giá vé suất này:** **{$this->money($st['price'])}/ghế**";
            if ($seatCodes && !empty($r['seat_check'])) $o .= " → " . count($r['seat_check']) . " ghế = **" . $this->money($st['price'] * count($r['seat_check'])) . "**";
            $o .= "\n";
        }
        if ($pick) $o .= "\n📌 *Hiện AI chỉ **kiểm tra** ghế (V1 chưa tự tạo booking để đảm bảo an toàn). Vui lòng hoàn tất đặt vé tại quầy POS hoặc ứng dụng.*";
        return $o;
    }

    protected function renderShowtimes(array $r): string
    {
        if (empty($r['count'])) {
            return "Chưa có suất chiếu nào " . ($r['date'] === date('Y-m-d') ? 'hôm nay' : 'ngày ' . date('d/m/Y', strtotime($r['date'])) . ' (lịch chưa được công bố)') . " cho yêu cầu này.";
        }
        $o = "🎬 **LỊCH CHIẾU " . ($r['date'] === date('Y-m-d') ? 'HÔM NAY' : date('d/m/Y', strtotime($r['date']))) . "**\n\n";
        foreach ($r['showtimes'] as $s) $o .= "• **{$s['start_time']}–{$s['end_time']}** | {$s['movie_title']} [{$s['age_rating']}] | {$s['room']} ({$s['room_type']}) | **{$this->money($s['price'])}**\n";
        return $o . "\n💡 Hỏi tiếp: *\"Suất 19:30 còn ghế không?\"* – tôi sẽ nhớ phim bạn đang quan tâm.";
    }

    protected function renderMovies(array $r): string
    {
        $o = "🎥 **THÔNG TIN PHIM**\n\n";
        foreach ($r['movies'] as $m) {
            $o .= "🎬 **{$m['title']}**" . ($m['original_title'] ? " ({$m['original_title']})" : '') . "\n• {$m['genre']} | {$m['duration']} phút | **{$m['age_rating']}**\n• Đạo diễn: {$m['director']} | {$m['country']}\n• Diễn viên: " . ($m['cast'] ?? '—') . "\n• {$m['description']}\n\n";
        }
        return $o . "💡 Hỏi tiếp: *\"Phim này hôm nay có suất nào?\"*";
    }

    protected function renderRecommend(array $r, array $args): string
    {
        if (empty($r['recommendations'])) return "Hiện chưa tìm được phim phù hợp" . (!empty($args['movie_title']) ? " với **{$args['movie_title']}**" : '') . " trong danh sách đang chiếu.";
        $head = $r['based_on'] ? "Nếu bạn thích **{$r['based_on']}**" : ($r['requested_genre'] ? "Phim thể loại **{$r['requested_genre']}**" : 'Phim đang chiếu');
        $o = "🍿 **GỢI Ý PHIM** – {$head}:\n\n";
        foreach ($r['recommendations'] as $i => $m) $o .= ($i + 1) . ". **{$m['title']}** [{$m['age_rating']}] – {$m['genre']} ({$m['duration']} phút)\n   ↳ *{$m['reason']}*\n";
        return $o . "\n💡 Muốn xem suất chiếu? Hãy hỏi *\"{$r['recommendations'][0]['title']} hôm nay có suất nào?\"*";
    }

    protected function renderKnowledge(array $r): string
    {
        $o = "📚 **QUY TRÌNH NỘI BỘ (RAG – tài liệu Aurora)**\n\n";
        foreach ($r['results'] as $x) $o .= "📘 *{$x['document']}* `{$x['category']}`\n👉 {$x['sop_text']}\n\n";
        return $o;
    }

    protected function renderWeb(array $r, string $q): string
    {
        if (empty($r['found'])) return "🌐 " . $r['message'] . "\n\nTôi chỉ có thể xác nhận thông tin có trong hệ thống rạp; với dữ liệu Internet bạn thử lại khi có kết nối nhé.";
        return "🌐 **TRA CỨU INTERNET** – {$r['title']}\n\n{$r['summary']}\n\n🔗 Nguồn: {$r['source']}" . (!empty($r['url']) ? " – {$r['url']}" : '') . "\n\n*{$r['note']}*";
    }

    protected function help(string $role): string
    {
        $o = "Xin chào! Tôi là **Cinema AI** của **AURORA CINEMAS** 🎬. Bạn đang đăng nhập với quyền **{$role}**. Tôi có thể:\n\n"
           . "🎬 **Phim:** thông tin, gợi ý (*\"Thích Interstellar nên xem gì?\"*), tra cứu Internet (*\"Christopher Nolan là ai?\"*)\n"
           . "🕒 **Suất & ghế:** *\"Avatar hôm nay có suất nào?\"* → *\"Suất 19:30 còn ghế không?\"* → *\"Chọn C10, giá bao nhiêu?\"* (tôi nhớ ngữ cảnh!)\n"
           . "🎫 **Vé & POS:** *\"Kiểm tra BK20261006001\"*, *\"Giao dịch POS125 bị lỗi gì?\"*, *\"Hủy booking …\"* (có xác nhận)\n"
           . "🛠️ **EMS/TMS:** *\"Phòng P03 có thiết bị nào lỗi?\"*, *\"Vì sao suất phòng P04 chưa chiếu?\"*\n"
           . "📚 **Quy trình SOP:** đổi/hoàn vé, xử lý sự cố, mô hình LAST…\n"
           . "🗓️ **Nhân sự & đào tạo:** lịch ca, chứng chỉ, kết quả thi\n";
        if ($role === 'manager') $o .= "📊 **Quản lý:** *\"Tình hình rạp hôm nay?\"*, doanh thu, top phim, suất vắng khách\n";
        return $o;
    }
}
