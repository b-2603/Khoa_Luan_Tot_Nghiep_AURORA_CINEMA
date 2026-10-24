<?php

class AuditLogController
{
    private $db;

    public function __construct($database)
    {
        $this->db = $database;
    }

    private function scalar($sql)
    {
        $result = $this->db->query($sql);
        if (!$result) return null;
        $row = $result->fetch_row();
        return $row ? $row[0] : null;
    }

    private function rows($sql)
    {
        $result = $this->db->query($sql);
        if (!$result) return false;
        $rows = array();
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        return $rows;
    }

    private function validDate($value)
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) && strtotime($value) !== false;
    }

    private function inferModule($action)
    {
        $action = strtoupper((string)$action);
        if (strpos($action, 'LOGIN') !== false || strpos($action, 'LOGOUT') !== false || strpos($action, 'RBAC') !== false || strpos($action, 'USER') !== false) return 'security';
        if (strpos($action, 'SHOWTIME') !== false || strpos($action, 'SCHEDULE') !== false) return 'schedules';
        if (strpos($action, 'MOVIE') !== false || strpos($action, 'ALLOCATION') !== false) return 'movies';
        if (strpos($action, 'TRANSACTION') !== false || strpos($action, 'REFUND') !== false || strpos($action, 'PAYMENT') !== false) return 'finance';
        if (strpos($action, 'PRODUCT') !== false || strpos($action, 'CATALOG') !== false || strpos($action, 'POS') !== false) return 'operations';
        return 'system';
    }

    public function index()
    {
        $user = requireAdmin();
        if (AdminController::normalizeRole($user['role']) !== 'super_admin') {
            jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được phép tra cứu nhật ký hệ thống.'), 403);
        }
        if (!ensureTmsAuditLogSchema($this->db)) {
            jsonResponse(array('success'=>false,'message'=>'Không thể khởi tạo cấu trúc Audit Log trong aurora_db: '.$this->db->error), 500);
        }

        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(10, min(250, (int)$_GET['per_page'])) : 20;
        $where = array('1=1');
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
        $action = isset($_GET['event_action']) ? trim((string)$_GET['event_action']) : '';
        $role = isset($_GET['role']) ? trim((string)$_GET['role']) : '';
        $module = isset($_GET['module']) ? trim((string)$_GET['module']) : '';
        $severity = isset($_GET['severity']) ? trim((string)$_GET['severity']) : '';
        $dateFrom = isset($_GET['date_from']) ? trim((string)$_GET['date_from']) : '';
        $dateTo = isset($_GET['date_to']) ? trim((string)$_GET['date_to']) : '';

        if ($dateFrom !== '' && !$this->validDate($dateFrom)) jsonResponse(array('success'=>false,'message'=>'Ngày bắt đầu không hợp lệ.'), 422);
        if ($dateTo !== '' && !$this->validDate($dateTo)) jsonResponse(array('success'=>false,'message'=>'Ngày kết thúc không hợp lệ.'), 422);
        if ($dateFrom !== '' && $dateTo !== '' && $dateFrom > $dateTo) jsonResponse(array('success'=>false,'message'=>'Ngày bắt đầu không được sau ngày kết thúc.'), 422);

        if ($q !== '') {
            $qEsc = $this->db->real_escape_string(substr($q, 0, 120));
            $where[] = "(al.username LIKE '%{$qEsc}%' OR al.action LIKE '%{$qEsc}%' OR al.details LIKE '%{$qEsc}%' OR al.entity_id LIKE '%{$qEsc}%' OR al.ip_address LIKE '%{$qEsc}%')";
        }
        if ($action !== '') $where[] = "al.action='".$this->db->real_escape_string(substr($action, 0, 80))."'";
        if ($role !== '') $where[] = "COALESCE(NULLIF(al.role,''),NULLIF(u.role,''),'system')='".$this->db->real_escape_string(substr($role, 0, 40))."'";
        if ($module !== '') $where[] = "al.module='".$this->db->real_escape_string(substr($module, 0, 60))."'";
        if ($severity !== '' && in_array($severity, array('info','success','warning','error'), true)) $where[] = "al.severity='".$this->db->real_escape_string($severity)."'";
        if ($dateFrom !== '') $where[] = "al.created_at>='".$this->db->real_escape_string($dateFrom)." 00:00:00'";
        if ($dateTo !== '') $where[] = "al.created_at<DATE_ADD('".$this->db->real_escape_string($dateTo)." 00:00:00', INTERVAL 1 DAY)";
        $whereSql = implode(' AND ', $where);
        $join = ' FROM audit_logs al LEFT JOIN users u ON u.username=al.username ';

        $total = (int)$this->scalar('SELECT COUNT(DISTINCT al.id)'.$join.' WHERE '.$whereSql);
        $pages = max(1, (int)ceil($total / $perPage));
        if ($page > $pages) $page = $pages;
        $offset = ($page - 1) * $perPage;
        $rows = $this->rows("SELECT al.*,COALESCE(NULLIF(al.role,''),NULLIF(u.role,''),'system') resolved_role,
            COALESCE(NULLIF(u.full_name,''),al.username) actor_name
            {$join} WHERE {$whereSql} GROUP BY al.id ORDER BY al.created_at DESC,al.id DESC LIMIT {$offset},{$perPage}");
        if ($rows === false) jsonResponse(array('success'=>false,'message'=>'Không thể đọc Audit Log từ aurora_db: '.$this->db->error), 500);

        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['user_id'] = $row['user_id'] === null ? null : (int)$row['user_id'];
            $row['status_code'] = $row['status_code'] === null ? null : (int)$row['status_code'];
            $row['role'] = $row['resolved_role']; unset($row['resolved_role']);
            if (empty($row['module'])) $row['module'] = $this->inferModule($row['action']);
            $decoded = !empty($row['metadata_json']) ? json_decode($row['metadata_json'], true) : null;
            $row['metadata'] = is_array($decoded) ? $decoded : null;
            unset($row['metadata_json']);
            $row['verified'] = !empty($row['event_hash']);
        }
        unset($row);

        $today = (int)$this->scalar('SELECT COUNT(*) FROM audit_logs WHERE created_at>=CURDATE()');
        $last24h = (int)$this->scalar("SELECT COUNT(*) FROM audit_logs WHERE created_at>=DATE_SUB(NOW(),INTERVAL 24 HOUR)");
        $failed = (int)$this->scalar("SELECT COUNT(*) FROM audit_logs WHERE severity='error' OR status_code>=400 OR action LIKE '%FAILED%'");
        $uniqueUsers = (int)$this->scalar("SELECT COUNT(DISTINCT username) FROM audit_logs WHERE username<>''");
        $actions = $this->rows("SELECT action,COUNT(*) total FROM audit_logs GROUP BY action ORDER BY total DESC,action ASC LIMIT 100");
        $roles = $this->rows("SELECT COALESCE(NULLIF(al.role,''),NULLIF(u.role,''),'system') value,COUNT(DISTINCT al.id) total {$join} GROUP BY value ORDER BY total DESC");
        $modules = $this->rows("SELECT module value,COUNT(*) total FROM audit_logs WHERE module IS NOT NULL AND module<>'' GROUP BY module ORDER BY total DESC");

        jsonResponse(array(
            'success'=>true,
            'data'=>$rows,
            'summary'=>array('total'=>(int)$this->scalar('SELECT COUNT(*) FROM audit_logs'),'today'=>$today,'last_24h'=>$last24h,'failed'=>$failed,'unique_users'=>$uniqueUsers),
            'meta'=>array('page'=>$page,'per_page'=>$perPage,'total'=>$total,'total_pages'=>$pages),
            'filters'=>array('actions'=>$actions === false ? array() : $actions,'roles'=>$roles === false ? array() : $roles,'modules'=>$modules === false ? array() : $modules)
        ));
    }
}
