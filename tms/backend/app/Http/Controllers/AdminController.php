<?php

class AdminController
{
    private $db;
    private $resources = array(
        'movies' => array('table' => 'tms_movies', 'search' => array('title', 'format'), 'fields' => array('title', 'duration_minutes', 'age_rating', 'format', 'status')),
        'screens' => array('table' => 'tms_screens', 'search' => array('screen_code', 'name'), 'fields' => array('screen_code', 'name', 'screen_type', 'total_seats', 'projector_status', 'sound_system_status', 'hvac_temperature', 'lamp_hours', 'status')),
        'schedules' => array('table' => 'tms_schedules', 'search' => array(), 'fields' => array('screen_id', 'movie_id', 'start_time', 'end_time', 'show_date', 'booked_seats', 'total_seats', 'status')),
        'staff' => array('table' => 'tms_staff_shifts', 'search' => array('staff_name', 'position'), 'fields' => array('staff_name', 'position', 'shift_name', 'start_time', 'end_time', 'status', 'work_date')),
        'ticket-types' => array('table' => 'tms_ticket_types', 'search' => array('name', 'code'), 'fields' => array('name', 'code', 'price', 'description', 'status')),
        'products' => array('table' => 'tms_products', 'search' => array('name', 'sku'), 'fields' => array('name', 'sku', 'category', 'price', 'stock_quantity', 'status')),
        'vouchers' => array('table' => 'tms_vouchers', 'search' => array('name', 'code'), 'fields' => array('code', 'name', 'discount_type', 'discount_value', 'starts_at', 'ends_at', 'usage_limit', 'status')),
        'customers' => array('table' => 'tms_customers', 'search' => array('full_name', 'phone', 'email'), 'fields' => array('full_name', 'phone', 'email', 'membership_level', 'points')),
    );

    public function __construct($db) { $this->db = $db; }

    public function dashboard()
    {
        $today = $this->db->query("SELECT * FROM tms_revenue_logs WHERE log_date = CURDATE() ORDER BY id DESC LIMIT 1");
        $revenue = $today ? $today->fetch_assoc() : null;
        $revenue = $revenue ?: array('total_revenue' => 0, 'ticket_sales' => 0, 'concession_sales' => 0, 'total_tickets' => 0, 'occupancy_rate' => 0);
        $data = array(
            'date' => date('Y-m-d'), 'revenue' => $this->numberFields($revenue, array('total_revenue', 'ticket_sales', 'concession_sales', 'occupancy_rate')),
            'active_screens' => $this->scalar("SELECT COUNT(*) FROM tms_screens WHERE status = 'active'"),
            'showtimes' => $this->scalar("SELECT COUNT(*) FROM tms_schedules WHERE show_date = CURDATE() AND status <> 'cancelled'"),
            'booked_seats' => $this->scalar("SELECT COALESCE(SUM(booked_seats), 0) FROM tms_schedules WHERE show_date = CURDATE()"),
            'staff_on_duty' => $this->scalar("SELECT COUNT(*) FROM tms_staff_shifts WHERE work_date = CURDATE() AND status IN ('on_duty','checked_in')"),
            'pending_refunds' => $this->scalar("SELECT COUNT(*) FROM tms_refunds WHERE status = 'pending'"),
            'revenue_7_days' => $this->rows("SELECT log_date date, ticket_sales, concession_sales, total_revenue, total_tickets, occupancy_rate FROM tms_revenue_logs WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ORDER BY log_date"),
            'top_movies' => $this->rows("SELECT m.id, m.title, COALESCE(SUM(s.booked_seats), 0) booked_seats, COUNT(s.id) showtimes FROM tms_movies m LEFT JOIN tms_schedules s ON s.movie_id = m.id GROUP BY m.id, m.title ORDER BY booked_seats DESC LIMIT 5"),
        );
        jsonResponse(array('success' => true, 'data' => $data));
    }

    public function listResource($resource)
    {
        if (!isset($this->resources[$resource])) { jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404); }
        $cfg = $this->resources[$resource]; $where = array('1=1'); $params = array(); $types = '';
        if (!empty($_GET['q']) && !empty($cfg['search'])) { $parts = array(); foreach ($cfg['search'] as $field) { $parts[] = "`{$field}` LIKE ?"; $params[] = '%' . $_GET['q'] . '%'; $types .= 's'; } $where[] = '(' . implode(' OR ', $parts) . ')'; }
        if (!empty($_GET['status'])) { $where[] = '`status` = ?'; $params[] = $_GET['status']; $types .= 's'; }
        if ($resource === 'schedules' && !empty($_GET['date'])) { $where[] = '`show_date` = ?'; $params[] = $_GET['date']; $types .= 's'; }
        $select = '*';
        if ($resource === 'schedules') { $select = 's.*, m.title movie_title, sc.name screen_name'; }
        $sql = "SELECT {$select} FROM {$cfg['table']}" . ($resource === 'schedules' ? ' s JOIN tms_movies m ON m.id=s.movie_id JOIN tms_screens sc ON sc.id=s.screen_id' : '') . ' WHERE ' . implode(' AND ', $where) . ($resource === 'schedules' ? ' ORDER BY s.id DESC' : ' ORDER BY id DESC');
        $rows = $this->preparedRows($sql, $types, $params); jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function save($resource)
    {
        if (!isset($this->resources[$resource])) { jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404); }
        requireAdmin(); $input = requestJson(); $cfg = $this->resources[$resource]; $id = isset($_GET['id']) ? (int)$_GET['id'] : (int)($input['id'] ?? 0); $values = array();
        foreach ($cfg['fields'] as $field) { if (array_key_exists($field, $input)) { $values[$field] = $input[$field]; } }
        if (!$values) { jsonResponse(array('success' => false, 'message' => 'Không có dữ liệu hợp lệ.'), 400); }
        if ($id > 0) { $sets = array(); $params = array(); $types = ''; foreach ($values as $field => $value) { $sets[] = "`{$field}` = ?"; $params[] = $value; $types .= 's'; } $params[] = $id; $types .= 'i'; $this->execute("UPDATE {$cfg['table']} SET " . implode(',', $sets) . ' WHERE id = ?', $types, $params); $message = 'Cập nhật thành công.'; } else { $fields = array_keys($values); $marks = implode(',', array_fill(0, count($fields), '?')); $params = array_values($values); $this->execute("INSERT INTO {$cfg['table']} (`" . implode('`,`', $fields) . "`) VALUES ({$marks})", str_repeat('s', count($params)), $params); $id = $this->db->insert_id; $message = 'Tạo mới thành công.'; }
        jsonResponse(array('success' => true, 'message' => $message, 'data' => array('id' => $id)), $id && !isset($input['id']) ? 201 : 200);
    }

    public function delete($resource)
    { if (!isset($this->resources[$resource])) { jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404); } requireAdmin(); $id = (int)($_GET['id'] ?? 0); if (!$id) { jsonResponse(array('success' => false, 'message' => 'Thiếu id.'), 400); } $this->execute("DELETE FROM {$this->resources[$resource]['table']} WHERE id = ?", 'i', array($id)); jsonResponse(array('success' => true, 'message' => 'Đã xóa dữ liệu.')); }

    public function transactions() { $rows = $this->rows("SELECT t.*, c.full_name customer_name, c.phone customer_phone FROM tms_transactions t LEFT JOIN tms_customers c ON c.id=t.customer_id ORDER BY t.id DESC LIMIT 100"); jsonResponse(array('success' => true, 'data' => $rows)); }
    public function createTransaction() { requireAdmin(); $input = requestJson(); $code = trim((string)($input['transaction_code'] ?? ('TXN-' . date('ymdHis') . rand(10, 99)))); $customer = isset($input['customer_id']) && $input['customer_id'] !== '' ? (int)$input['customer_id'] : null; $channel = $input['channel'] ?? 'pos'; $amount = (float)($input['amount'] ?? 0); $method = $input['payment_method'] ?? 'cash'; if ($amount < 0 || !in_array($channel, array('pos','website','ota'), true)) { jsonResponse(array('success' => false, 'message' => 'Dữ liệu giao dịch không hợp lệ.'), 400); } $stmt = $this->db->prepare('INSERT INTO tms_transactions (transaction_code,customer_id,channel,amount,payment_method,status) VALUES (?,?,?,?,?,?)'); $status = 'paid'; $stmt->bind_param('sisdss', $code, $customer, $channel, $amount, $method, $status); if (!$stmt->execute()) { jsonResponse(array('success' => false, 'message' => $stmt->error), 500); } jsonResponse(array('success' => true, 'message' => 'Đã tạo giao dịch.', 'data' => array('id' => $this->db->insert_id, 'transaction_code' => $code)), 201); }
    public function refunds() { $rows = $this->rows("SELECT r.*, t.transaction_code, t.payment_method, c.full_name customer_name FROM tms_refunds r JOIN tms_transactions t ON t.id=r.transaction_id LEFT JOIN tms_customers c ON c.id=t.customer_id ORDER BY r.id DESC LIMIT 100"); jsonResponse(array('success' => true, 'data' => $rows)); }
    public function updateRefund() { requireAdmin(); $input = requestJson(); $id = (int)($_GET['id'] ?? ($input['id'] ?? 0)); $status = $input['status'] ?? ''; if (!$id || !in_array($status, array('approved','rejected','completed'), true)) { jsonResponse(array('success' => false, 'message' => 'Dữ liệu hoàn tiền không hợp lệ.'), 400); } $this->execute("UPDATE tms_refunds SET status=?, processed_at=NOW() WHERE id=?", 'si', array($status, $id)); if ($status === 'completed') { $this->db->query("UPDATE tms_transactions t JOIN tms_refunds r ON r.transaction_id=t.id SET t.status='refunded' WHERE r.id=" . $id); } jsonResponse(array('success' => true, 'message' => 'Đã cập nhật yêu cầu hoàn tiền.')); }
    public function seats() { $screen = (int)($_GET['screen_id'] ?? 0); if (!$screen) { jsonResponse(array('success' => false, 'message' => 'Thiếu screen_id.'), 400); } $rows = $this->rows('SELECT * FROM tms_seats WHERE screen_id=' . $screen . ' ORDER BY seat_code'); jsonResponse(array('success' => true, 'data' => $rows)); }
    public function report() { $from = $_GET['from'] ?? date('Y-m-d', strtotime('-6 days')); $to = $_GET['to'] ?? date('Y-m-d'); $from = $this->db->real_escape_string($from); $to = $this->db->real_escape_string($to); $daily = $this->rows("SELECT * FROM tms_revenue_logs WHERE log_date BETWEEN '{$from}' AND '{$to}' ORDER BY log_date"); $summary = $this->rows("SELECT COALESCE(SUM(total_revenue),0) total_revenue, COALESCE(SUM(ticket_sales),0) ticket_sales, COALESCE(SUM(concession_sales),0) concession_sales, COALESCE(SUM(total_tickets),0) total_tickets, COALESCE(AVG(occupancy_rate),0) occupancy_rate FROM tms_revenue_logs WHERE log_date BETWEEN '{$from}' AND '{$to}'"); jsonResponse(array('success' => true, 'data' => array('from' => $from, 'to' => $to, 'summary' => $summary[0] ?? array(), 'daily' => $daily))); }

    private function scalar($sql) { $result = $this->db->query($sql); $row = $result ? $result->fetch_row() : array(0); return (int)($row[0] ?? 0); }
    private function rows($sql) { $result = $this->db->query($sql); $rows = array(); if ($result) { while ($row = $result->fetch_assoc()) { $rows[] = $row; } } return $rows; }
    private function numberFields($row, $fields) { foreach ($fields as $field) { if (isset($row[$field])) { $row[$field] = (float)$row[$field]; } } return $row; }
    private function preparedRows($sql, $types, $params) { $stmt = $this->prepare($sql, $types, $params); $stmt->execute(); $result = $stmt->get_result(); $rows = array(); while ($row = $result->fetch_assoc()) { $rows[] = $row; } return $rows; }
    private function execute($sql, $types, $params) { $stmt = $this->prepare($sql, $types, $params); if (!$stmt->execute()) { jsonResponse(array('success' => false, 'message' => $stmt->error), 500); } }
    private function prepare($sql, $types, $params) { $stmt = $this->db->prepare($sql); if (!$stmt) { jsonResponse(array('success' => false, 'message' => $this->db->error), 500); } if ($types !== '') { $refs = array($types); foreach ($params as $key => $value) { $refs[] = &$params[$key]; } call_user_func_array(array($stmt, 'bind_param'), $refs); } return $stmt; }
}
