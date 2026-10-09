<?php

class MarketingController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    private function rows($sql)
    {
        $result = $this->db->query($sql);
        if (!$result) jsonResponse(array('success' => false, 'message' => 'Không thể đọc dữ liệu Marketing từ aurora_db: ' . $this->db->error), 500);
        $rows = array();
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        $result->free();
        return $rows;
    }

    private function scalar($sql)
    {
        $result = $this->db->query($sql);
        if (!$result) return 0;
        $row = $result->fetch_row();
        $result->free();
        return isset($row[0]) ? $row[0] : 0;
    }

    private function actor($write)
    {
        $user = requireAdmin();
        $role = AdminController::normalizeRole($user['role']);
        if (!in_array($role, array('super_admin', 'marketing_manager'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chức năng này chỉ dành cho Quản lý Marketing hoặc Admin Tổng.'), 403);
        }
        if ($write && $role === 'super_admin' && isset($_GET['read_only'])) {
            jsonResponse(array('success' => false, 'message' => 'Phiên xem của Admin Tổng không cho phép thay đổi dữ liệu.'), 403);
        }
        return $user;
    }

    public function ensureSchema()
    {
        $queries = array(
            "CREATE TABLE IF NOT EXISTS marketing_campaigns (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                campaign_code VARCHAR(40) NOT NULL UNIQUE,
                name VARCHAR(180) NOT NULL,
                objective VARCHAR(255) NULL,
                channel VARCHAR(80) NOT NULL DEFAULT 'Đa kênh',
                budget DECIMAL(14,2) NOT NULL DEFAULT 0,
                start_date DATE NULL,
                end_date DATE NULL,
                status ENUM('draft','planned','running','paused','completed') NOT NULL DEFAULT 'draft',
                owner_id BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_marketing_campaign_status (status, start_date, end_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_promotions (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                promotion_code VARCHAR(40) NOT NULL UNIQUE,
                name VARCHAR(180) NOT NULL,
                discount_type ENUM('percent','amount','gift') NOT NULL DEFAULT 'percent',
                discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
                start_date DATE NULL,
                end_date DATE NULL,
                approval_status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
                status ENUM('inactive','active','expired') NOT NULL DEFAULT 'inactive',
                created_by BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_marketing_promotion_status (status, approval_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_vouchers (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                voucher_code VARCHAR(40) NOT NULL UNIQUE,
                name VARCHAR(180) NOT NULL,
                discount_type ENUM('percent','amount') NOT NULL DEFAULT 'percent',
                discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
                quantity INT UNSIGNED NOT NULL DEFAULT 0,
                used_count INT UNSIGNED NOT NULL DEFAULT 0,
                start_date DATE NULL,
                end_date DATE NULL,
                status ENUM('draft','active','paused','expired') NOT NULL DEFAULT 'draft',
                created_by BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_marketing_voucher_status (status, end_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_contents (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                content_type ENUM('banner','featured_movie','news') NOT NULL DEFAULT 'banner',
                placement VARCHAR(100) NOT NULL DEFAULT 'Trang chủ',
                summary TEXT NULL,
                media_url VARCHAR(500) NULL,
                publish_at DATETIME NULL,
                status ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
                created_by BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_marketing_content_status (status, publish_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_notifications (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                channel ENUM('email','push','sms','in_app') NOT NULL DEFAULT 'in_app',
                audience VARCHAR(160) NOT NULL DEFAULT 'Tất cả khách hàng',
                message TEXT NULL,
                scheduled_at DATETIME NULL,
                sent_count INT UNSIGNED NOT NULL DEFAULT 0,
                status ENUM('draft','scheduled','sent','cancelled') NOT NULL DEFAULT 'draft',
                created_by BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_marketing_notification_status (status, scheduled_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_customer_segments (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(180) NOT NULL,
                description VARCHAR(255) NULL,
                criteria_json TEXT NULL,
                estimated_size INT UNSIGNED NOT NULL DEFAULT 0,
                status ENUM('active','inactive') NOT NULL DEFAULT 'active',
                created_by BIGINT UNSIGNED NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_marketing_segment_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
        );
        foreach ($queries as $query) {
            if (!$this->db->query($query)) jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu Marketing trong aurora_db: ' . $this->db->error), 500);
        }
        $this->seedStarterData();
    }

    private function seedStarterData()
    {
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_campaigns') === 0) {
            $this->db->query("INSERT INTO marketing_campaigns (campaign_code,name,objective,channel,budget,start_date,end_date,status,created_at) VALUES
                ('MKT-AUTUMN','Mùa phim cuối năm','Tăng nhận diện và lượng vé đặt trực tuyến','Facebook, Website',120000000,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 45 DAY),'planned',NOW()),
                ('MKT-MEMBER','Aurora Member Week','Tăng tỷ lệ khách hàng quay lại','Email, Push',45000000,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 14 DAY),'running',NOW())");
        }
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_promotions') === 0) {
            $this->db->query("INSERT INTO marketing_promotions (promotion_code,name,discount_type,discount_value,start_date,end_date,approval_status,status,created_at) VALUES
                ('CTKM-WEEKEND','Cuối tuần rực rỡ','percent',10,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 30 DAY),'pending','inactive',NOW())");
        }
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_vouchers') === 0) {
            $this->db->query("INSERT INTO marketing_vouchers (voucher_code,name,discount_type,discount_value,quantity,used_count,start_date,end_date,status,created_at) VALUES
                ('AURORA10','Giảm 10% vé xem phim','percent',10,1000,128,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 60 DAY),'active',NOW())");
        }
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_contents') === 0) {
            $this->db->query("INSERT INTO marketing_contents (title,content_type,placement,summary,publish_at,status,created_at) VALUES
                ('Phim nổi bật tuần này','featured_movie','Trang chủ','Khối phim nổi bật trên website Aurora Cinema',NOW(),'published',NOW()),
                ('Banner thành viên Aurora','banner','Hero trang chủ','Banner giới thiệu quyền lợi thành viên',DATE_ADD(NOW(), INTERVAL 2 DAY),'scheduled',NOW())");
        }
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_customer_segments') === 0) {
            $customerCount = (int)$this->scalar("SELECT COUNT(*) FROM users WHERE role='customer'");
            $this->db->query("INSERT INTO marketing_customer_segments (name,description,criteria_json,estimated_size,status,created_at) VALUES
                ('Khách hàng thành viên','Toàn bộ tài khoản khách hàng đang hoạt động','{\"status\":\"active\"}'," . $customerCount . ",'active',NOW()),
                ('Khách hàng thân thiết','Khách hàng hạng Gold và Platinum','{\"membership\":[\"GOLD\",\"PLATINUM\"]}',0,'active',NOW())");
        }
    }

    public function handle($resource)
    {
        global $requestMethod;
        $this->actor($requestMethod !== 'GET');
        $this->ensureSchema();
        if ($resource === 'dashboard') return $this->dashboard();
        if ($resource === 'reports') return $this->reports();
        if ($resource === 'account') return $this->account();

        $definitions = $this->resourceDefinitions();
        if (!isset($definitions[$resource])) jsonResponse(array('success' => false, 'message' => 'Phân hệ Marketing không tồn tại.'), 404);
        if ($requestMethod === 'GET') return $this->listResource($definitions[$resource]);
        if ($requestMethod === 'POST' || $requestMethod === 'PUT') return $this->saveResource($definitions[$resource]);
        if ($requestMethod === 'DELETE') return $this->deleteResource($definitions[$resource]);
        jsonResponse(array('success' => false, 'message' => 'Phương thức không được hỗ trợ.'), 405);
    }

    private function resourceDefinitions()
    {
        return array(
            'campaigns' => array('table'=>'marketing_campaigns','code'=>'campaign_code','required'=>'name','fields'=>array('campaign_code','name','objective','channel','budget','start_date','end_date','status')),
            'promotions' => array('table'=>'marketing_promotions','code'=>'promotion_code','required'=>'name','fields'=>array('promotion_code','name','discount_type','discount_value','start_date','end_date','approval_status','status')),
            'vouchers' => array('table'=>'marketing_vouchers','code'=>'voucher_code','required'=>'name','fields'=>array('voucher_code','name','discount_type','discount_value','quantity','start_date','end_date','status')),
            'contents' => array('table'=>'marketing_contents','code'=>'','required'=>'title','fields'=>array('title','content_type','placement','summary','media_url','publish_at','status')),
            'notifications' => array('table'=>'marketing_notifications','code'=>'','required'=>'title','fields'=>array('title','channel','audience','message','scheduled_at','status')),
            'segments' => array('table'=>'marketing_customer_segments','code'=>'','required'=>'name','fields'=>array('name','description','criteria_json','estimated_size','status'))
        );
    }

    private function listResource($definition)
    {
        $where = array('1=1');
        if (!empty($_GET['status'])) {
            $status = $this->db->real_escape_string(trim((string)$_GET['status']));
            $where[] = "status='{$status}'";
        }
        if (!empty($_GET['q'])) {
            $q = $this->db->real_escape_string(trim((string)$_GET['q']));
            $where[] = "(" . $definition['required'] . " LIKE '%{$q}%')";
        }
        $rows = $this->rows('SELECT * FROM ' . $definition['table'] . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC');
        jsonResponse(array('success'=>true,'data'=>$rows));
    }

    private function saveResource($definition)
    {
        $input = requestJson();
        $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
        $required = isset($input[$definition['required']]) ? trim((string)$input[$definition['required']]) : '';
        if ($required === '') jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập đầy đủ tên hoặc tiêu đề.'), 422);

        $values = array();
        foreach ($definition['fields'] as $field) {
            $value = isset($input[$field]) ? trim((string)$input[$field]) : '';
            if ($definition['code'] === $field && $value === '') $value = 'MKT-' . strtoupper(substr(sha1(uniqid((string)mt_rand(), true)), 0, 8));
            $values[$field] = $value;
        }
        $actorId = !empty($_SESSION['tms_user']['id']) ? (int)$_SESSION['tms_user']['id'] : 0;
        if ($id > 0) {
            $sets = array();
            foreach ($values as $field => $value) $sets[] = "`{$field}`='" . $this->db->real_escape_string($value) . "'";
            $sql = 'UPDATE ' . $definition['table'] . ' SET ' . implode(',', $sets) . ', updated_at=NOW() WHERE id=' . $id;
            if (!$this->db->query($sql)) jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật dữ liệu Marketing: '.$this->db->error), 400);
            jsonResponse(array('success'=>true,'message'=>'Đã cập nhật dữ liệu Marketing trong aurora_db.','data'=>array('id'=>$id)));
        }
        $columns = array(); $escaped = array();
        foreach ($values as $field => $value) { $columns[] = "`{$field}`"; $escaped[] = "'" . $this->db->real_escape_string($value) . "'"; }
        $ownerColumn = $definition['table'] === 'marketing_campaigns' ? 'owner_id' : 'created_by';
        $columns[] = $ownerColumn; $escaped[] = (string)$actorId;
        $sql = 'INSERT INTO ' . $definition['table'] . ' (' . implode(',', $columns) . ',created_at) VALUES (' . implode(',', $escaped) . ',NOW())';
        if (!$this->db->query($sql)) jsonResponse(array('success'=>false,'message'=>'Không thể tạo dữ liệu Marketing: '.$this->db->error), 400);
        jsonResponse(array('success'=>true,'message'=>'Đã tạo dữ liệu Marketing trong aurora_db.','data'=>array('id'=>(int)$this->db->insert_id)), 201);
    }

    private function deleteResource($definition)
    {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id <= 0) jsonResponse(array('success'=>false,'message'=>'Mã dữ liệu không hợp lệ.'), 422);
        if (!$this->db->query('DELETE FROM ' . $definition['table'] . ' WHERE id=' . $id . ' LIMIT 1')) jsonResponse(array('success'=>false,'message'=>'Không thể xóa dữ liệu Marketing: '.$this->db->error), 400);
        jsonResponse(array('success'=>true,'message'=>'Đã xóa dữ liệu Marketing khỏi aurora_db.'));
    }

    private function account()
    {
        global $requestMethod;
        $user = requireAdmin();
        $id = (int)$user['id'];
        if ($requestMethod === 'GET') {
            $data = $this->rows("SELECT id,username,full_name,email,phone,role,status,last_login,created_at FROM users WHERE id={$id} LIMIT 1");
            jsonResponse(array('success'=>true,'data'=>isset($data[0])?$data[0]:null));
        }
        $input = requestJson();
        $fullName = isset($input['full_name']) ? trim((string)$input['full_name']) : '';
        $email = isset($input['email']) ? trim((string)$input['email']) : '';
        $phone = isset($input['phone']) ? trim((string)$input['phone']) : '';
        if ($fullName === '' || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL))) jsonResponse(array('success'=>false,'message'=>'Thông tin tài khoản không hợp lệ.'),422);
        $sql = "UPDATE users SET full_name='".$this->db->real_escape_string($fullName)."',email='".$this->db->real_escape_string($email)."',phone='".$this->db->real_escape_string($phone)."',updated_at=NOW() WHERE id={$id}";
        if (!$this->db->query($sql)) jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật tài khoản: '.$this->db->error),500);
        $_SESSION['tms_user']['full_name'] = $fullName;
        $_SESSION['tms_user']['phone'] = $phone;
        jsonResponse(array('success'=>true,'message'=>'Đã cập nhật tài khoản Marketing Manager.'));
    }

    private function dashboard()
    {
        $data = array(
            'campaigns_total'=>(int)$this->scalar('SELECT COUNT(*) FROM marketing_campaigns'),
            'campaigns_running'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='running'"),
            'budget_total'=>(float)$this->scalar('SELECT COALESCE(SUM(budget),0) FROM marketing_campaigns'),
            'promotions_pending'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions WHERE approval_status='pending'"),
            'active_vouchers'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_vouchers WHERE status='active'"),
            'voucher_redemptions'=>(int)$this->scalar('SELECT COALESCE(SUM(used_count),0) FROM marketing_vouchers'),
            'published_contents'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_contents WHERE status='published'"),
            'scheduled_notifications'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_notifications WHERE status='scheduled'"),
            'customer_segments'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_customer_segments WHERE status='active'"),
            'customers_total'=>(int)$this->scalar("SELECT COUNT(*) FROM users WHERE role='customer'"),
            'recent_campaigns'=>$this->rows('SELECT * FROM marketing_campaigns ORDER BY id DESC LIMIT 5'),
            'upcoming_contents'=>$this->rows("SELECT * FROM marketing_contents WHERE status IN ('scheduled','published') ORDER BY publish_at DESC LIMIT 5")
        );
        jsonResponse(array('success'=>true,'data'=>$data));
    }

    private function reports()
    {
        $monthly = $this->rows("SELECT DATE_FORMAT(created_at,'%Y-%m') month, COUNT(*) campaign_count, COALESCE(SUM(budget),0) budget FROM marketing_campaigns GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY month DESC LIMIT 6");
        $channels = $this->rows("SELECT channel,COUNT(*) total,COALESCE(SUM(budget),0) budget FROM marketing_campaigns GROUP BY channel ORDER BY total DESC");
        jsonResponse(array('success'=>true,'data'=>array(
            'monthly'=>$monthly,
            'channels'=>$channels,
            'campaigns_completed'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='completed'"),
            'notifications_sent'=>(int)$this->scalar("SELECT COALESCE(SUM(sent_count),0) FROM marketing_notifications"),
            'voucher_usage'=>(int)$this->scalar('SELECT COALESCE(SUM(used_count),0) FROM marketing_vouchers'),
            'total_budget'=>(float)$this->scalar('SELECT COALESCE(SUM(budget),0) FROM marketing_campaigns')
        )));
    }
}
