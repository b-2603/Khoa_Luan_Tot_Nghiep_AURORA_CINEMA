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
        if (!$result) jsonResponse(array('success' => false, 'message' => 'Không thể đọc dữ liệu Marketing từ aurora_db: ' . $this->db->error), 500);
        $row = $result->fetch_row();
        $result->free();
        return isset($row[0]) ? $row[0] : 0;
    }

    private function genreOptions()
    {
        $options=array('Hành động','Phiêu lưu','Hoạt hình','Hài hước','Tâm lý','Tình cảm','Khoa học viễn tưởng','Kinh dị','Giật gân','Bí ẩn','Tội phạm','Gia đình','Âm nhạc','Tài liệu','Võ thuật','Thể thao','Lịch sử','Chiến tranh');
        $rows=$this->rows("SELECT genre FROM movies WHERE genre IS NOT NULL AND TRIM(genre)<>''");
        foreach($rows as $row){$parts=explode(',',(string)$row['genre']);foreach($parts as $part){$genre=trim($part);if($genre!==''&&!in_array($genre,$options,true))$options[]=$genre;}}
        natcasesort($options);
        return array_values($options);
    }

    private function columnExists($table, $column)
    {
        $tableEsc = $this->db->real_escape_string($table);
        $columnEsc = $this->db->real_escape_string($column);
        return (int)$this->scalar("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{$tableEsc}' AND COLUMN_NAME='{$columnEsc}'") > 0;
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS movie_countries (
                id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                iso_code CHAR(2) NOT NULL UNIQUE,
                name_vi VARCHAR(100) NOT NULL UNIQUE,
                name_en VARCHAR(100) NOT NULL,
                sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
                status ENUM('active','inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_movie_country_status (status,sort_order,name_vi)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_movie_plan_history (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                plan_id BIGINT UNSIGNED NOT NULL,
                action_name VARCHAR(40) NOT NULL,
                from_status VARCHAR(30) NULL,
                to_status VARCHAR(30) NOT NULL,
                actor_id BIGINT UNSIGNED NULL,
                actor_name VARCHAR(120) NOT NULL,
                actor_role VARCHAR(40) NOT NULL,
                note TEXT NULL,
                created_at DATETIME NOT NULL,
                KEY idx_mkt_plan_history (plan_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_movie_plan_review_items (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                plan_id BIGINT UNSIGNED NOT NULL,
                review_round INT UNSIGNED NOT NULL DEFAULT 1,
                section_key VARCHAR(40) NOT NULL,
                section_label VARCHAR(120) NOT NULL DEFAULT '',
                field_key VARCHAR(60) NOT NULL DEFAULT '',
                field_label VARCHAR(120) NOT NULL,
                current_value TEXT NULL,
                comment TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                created_by BIGINT UNSIGNED NULL,
                created_by_name VARCHAR(120) NOT NULL,
                created_at DATETIME NOT NULL,
                resolved_at DATETIME NULL,
                KEY idx_mkt_plan_review (plan_id,review_round,status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
        );
        foreach ($queries as $query) {
            if (!$this->db->query($query)) jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu Marketing trong aurora_db: ' . $this->db->error), 500);
        }
        $planColumns = array(
            'marketing_owner_id' => 'BIGINT UNSIGNED NULL',
            'approval_status' => "VARCHAR(30) NOT NULL DEFAULT 'draft'",
            'submitted_by' => 'VARCHAR(120) NULL',
            'submitted_at' => 'DATETIME NULL',
            'reviewed_by' => 'VARCHAR(120) NULL',
            'reviewed_at' => 'DATETIME NULL',
            'approval_note' => 'TEXT NULL',
            'recommendation_reason' => 'TEXT NULL',
            'target_tickets' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'campaign_name' => 'VARCHAR(200) NULL',
            'marketing_budget' => 'DECIMAL(14,2) NOT NULL DEFAULT 0',
            'promotion_proposed' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'release_rights_status' => "VARCHAR(30) NOT NULL DEFAULT 'pending_verification'",
            'content_classification_status' => "VARCHAR(30) NOT NULL DEFAULT 'pending_review'"
        );
        foreach ($planColumns as $column => $definition) {
            if (!$this->columnExists('movie_plans', $column) && !$this->db->query("ALTER TABLE movie_plans ADD COLUMN `{$column}` {$definition}")) {
                jsonResponse(array('success'=>false,'message'=>'Không thể nâng cấp quy trình duyệt kế hoạch phim: '.$this->db->error),500);
            }
        }
        $reviewColumns = array(
            'section_label' => "VARCHAR(120) NOT NULL DEFAULT ''",
            'field_key' => "VARCHAR(60) NOT NULL DEFAULT ''",
            'current_value' => 'TEXT NULL'
        );
        foreach ($reviewColumns as $column => $definition) {
            if (!$this->columnExists('marketing_movie_plan_review_items', $column) && !$this->db->query("ALTER TABLE marketing_movie_plan_review_items ADD COLUMN `{$column}` {$definition}")) {
                jsonResponse(array('success'=>false,'message'=>'Không thể nâng cấp dữ liệu phản hồi phê duyệt: '.$this->db->error),500);
            }
        }
        if (!$this->columnExists('movies', 'marketing_owner_id') && !$this->db->query("ALTER TABLE movies ADD COLUMN marketing_owner_id BIGINT UNSIGNED NULL")) {
            jsonResponse(array('success'=>false,'message'=>'Không thể bổ sung quyền sở hữu hồ sơ phim Marketing: '.$this->db->error),500);
        }
        // Kế hoạch cũ của Admin Tổng được xem là đã duyệt; kế hoạch Marketing
        // luôn có marketing_owner_id và đi qua quy trình mới bên dưới.
        $this->db->query("UPDATE movie_plans SET approval_status=CASE WHEN status='draft' THEN 'draft' ELSE 'approved' END WHERE marketing_owner_id IS NULL");
        $this->seedStarterData();
    }

    private function seedStarterData()
    {
        $this->db->query("INSERT IGNORE INTO movie_countries (iso_code,name_vi,name_en,sort_order,status) VALUES
            ('VN','Việt Nam','Vietnam',1,'active'),('US','Hoa Kỳ','United States',2,'active'),
            ('KR','Hàn Quốc','South Korea',3,'active'),('JP','Nhật Bản','Japan',4,'active'),
            ('CN','Trung Quốc','China',5,'active'),('TH','Thái Lan','Thailand',6,'active'),
            ('HK','Hong Kong','Hong Kong',7,'active'),('GB','Anh','United Kingdom',8,'active'),
            ('FR','Pháp','France',9,'active'),('DE','Đức','Germany',10,'active'),
            ('CA','Canada','Canada',11,'active'),('AU','Úc','Australia',12,'active'),
            ('IN','Ấn Độ','India',13,'active'),('ES','Tây Ban Nha','Spain',14,'active'),
            ('IT','Ý','Italy',15,'active'),('SG','Singapore','Singapore',16,'active'),
            ('TW','Đài Loan','Taiwan',17,'active'),('ID','Indonesia','Indonesia',18,'active'),
            ('MY','Malaysia','Malaysia',19,'active'),('PH','Philippines','Philippines',20,'active')");
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
        if ($resource === 'movies') return $this->movieCatalog();
        if ($resource === 'movie-plans') return $this->moviePlans();
        if ($resource === 'plan-approvals') return $this->planApprovals();

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
        $role = !empty($_SESSION['tms_user']['role']) ? AdminController::normalizeRole($_SESSION['tms_user']['role']) : '';
        if ($role === 'marketing_manager' && isset($input['approval_status']) && !in_array($input['approval_status'], array('draft','pending'), true)) {
            jsonResponse(array('success'=>false,'message'=>'Marketing chỉ được lưu nháp hoặc gửi chờ duyệt; quyết định phê duyệt thuộc Admin Tổng.'), 403);
        }
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
        $_SESSION['tms_user']['email'] = $email;
        jsonResponse(array('success'=>true,'message'=>'Đã cập nhật tài khoản Marketing Manager.'));
    }

    private function movieCatalog()
    {
        global $requestMethod;
        $user=requireAdmin();
        if ($requestMethod !== 'GET') {
            $operation=isset($_GET['operation'])?trim((string)$_GET['operation']):'';
            if(($requestMethod==='POST'||$requestMethod==='PUT')&&$operation==='publish-approved')return $this->publishApprovedMovie();
            if($requestMethod==='PUT'&&$operation==='update')return $this->updateCatalogMovie();
            jsonResponse(array('success'=>false,'message'=>'Marketing được chỉnh sửa phim đã có; phim mới chỉ được thêm thông qua kế hoạch đã được Admin Tổng duyệt.'),405);
        }
        $where = "status<>'draft'";
        if (!empty($_GET['q'])) {
            $q = $this->db->real_escape_string(trim((string)$_GET['q']));
            $where .= " AND (title LIKE '%{$q}%' OR original_title LIKE '%{$q}%' OR movie_code LIKE '%{$q}%')";
        }
        if(!empty($_GET['status'])&&in_array($_GET['status'],array('coming_soon','now_showing','special_showing','ended','archived'),true))$where.=" AND status='".$this->db->real_escape_string($_GET['status'])."'";
        $data = $this->rows("SELECT id,movie_code,title,original_title,genre,duration_minutes,age_rating,director,cast,writer,producer,production_country,production_year,description,plot_details,original_language,localization_versions,format,release_date,expected_end_date,distributor,poster_url,banner_url,trailer_url,status,updated_at FROM movies WHERE {$where} ORDER BY CASE status WHEN 'now_showing' THEN 0 WHEN 'special_showing' THEN 1 WHEN 'coming_soon' THEN 2 ELSE 3 END,release_date DESC,id DESC");
        $ownerId=(int)$user['id'];
        $candidates=$this->rows("SELECT mp.id AS plan_id,mp.plan_code,mp.plan_name,mp.approved_at,mp.target_revenue,mp.target_tickets,mp.planned_theater_ids,m.id AS movie_id,m.movie_code,m.title,m.original_title,m.genre,m.duration_minutes,m.age_rating,m.format,m.release_date,m.poster_url FROM movie_plans mp INNER JOIN movies m ON m.id=mp.movie_id WHERE mp.marketing_owner_id={$ownerId} AND mp.approval_status='approved' AND m.status='draft' ORDER BY mp.approved_at DESC,mp.id DESC");
        jsonResponse(array('success'=>true,'data'=>$data,'meta'=>array('summary'=>array(
            'total'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status<>'draft'"),
            'now_showing'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status='now_showing'"),
            'coming_soon'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status='coming_soon'"),
            'special_showing'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status='special_showing'"),
            'eligible'=>count($candidates)
        ),'approved_candidates'=>$candidates,'genres'=>$this->genreOptions(),'countries'=>$this->rows("SELECT id,iso_code,name_vi,name_en FROM movie_countries WHERE status='active' ORDER BY sort_order,name_vi"))));
    }

    private function updateCatalogMovie()
    {
        $user=requireAdmin();
        if(AdminController::normalizeRole($user['role'])!=='marketing_manager')jsonResponse(array('success'=>false,'message'=>'Thao tác này chỉ dành cho bộ phận Marketing.'),403);
        $input=requestJson();
        $id=isset($_GET['id'])?(int)$_GET['id']:(isset($input['id'])?(int)$input['id']:0);
        if($id<=0)jsonResponse(array('success'=>false,'message'=>'Phim cần chỉnh sửa không hợp lệ.'),422);
        $existing=$this->rows("SELECT id,movie_code,status FROM movies WHERE id={$id} LIMIT 1");
        if(!$existing)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy phim trong aurora_db.'),404);
        if($existing[0]['status']==='draft')jsonResponse(array('success'=>false,'message'=>'Phim bản nháp phải hoàn tất quy trình phê duyệt trước khi được chỉnh sửa tại Danh sách phim.'),409);

        $stringFields=array('title','original_title','genre','age_rating','director','cast','writer','producer','production_country','description','plot_details','original_language','localization_versions','format','release_date','expected_end_date','distributor','poster_url','banner_url','trailer_url','status');
        $movie=array();
        foreach($stringFields as $field)$movie[$field]=isset($input[$field])?trim((string)$input[$field]):'';
        $duration=isset($input['duration_minutes'])?filter_var($input['duration_minutes'],FILTER_VALIDATE_INT):false;
        $year=isset($input['production_year'])&&$input['production_year']!==''?filter_var($input['production_year'],FILTER_VALIDATE_INT):null;

        if($movie['title']===''||$movie['genre']===''||$movie['age_rating']===''||$movie['director']===''||$movie['cast']===''||$movie['production_country']===''||$movie['description']===''||$movie['original_language']===''||$movie['format']===''||$movie['release_date']===''||$movie['poster_url']==='')jsonResponse(array('success'=>false,'message'=>'Vui lòng hoàn thành đầy đủ các trường bắt buộc của hồ sơ phim.'),422);
        if(strlen($movie['genre'])>150)jsonResponse(array('success'=>false,'message'=>'Danh sách thể loại vượt quá độ dài cho phép.'),422);
        if($duration===false||$duration<1||$duration>600)jsonResponse(array('success'=>false,'message'=>'Thời lượng phim phải từ 1 đến 600 phút.'),422);
        if($year===false||($year!==null&&($year<1888||$year>2100)))jsonResponse(array('success'=>false,'message'=>'Năm sản xuất không hợp lệ.'),422);
        if(!in_array($movie['age_rating'],array('P','K','T13','T16','T18'),true))jsonResponse(array('success'=>false,'message'=>'Phân loại độ tuổi không hợp lệ.'),422);
        if(!in_array($movie['status'],array('now_showing','coming_soon','special_showing','ended'),true))jsonResponse(array('success'=>false,'message'=>'Trạng thái phim không hợp lệ.'),422);
        if(!$this->validDate($movie['release_date'])||($movie['expected_end_date']!==''&&!$this->validDate($movie['expected_end_date'])))jsonResponse(array('success'=>false,'message'=>'Ngày phát hành không hợp lệ. Vui lòng nhập theo thứ tự ngày / tháng / năm.'),422);
        if($movie['expected_end_date']==='')$movie['expected_end_date']=$movie['release_date'];
        if($movie['expected_end_date']<$movie['release_date'])jsonResponse(array('success'=>false,'message'=>'Ngày kết thúc dự kiến phải từ ngày khởi chiếu trở đi.'),422);
        $countryEsc=$this->db->real_escape_string($movie['production_country']);
        if((int)$this->scalar("SELECT COUNT(*) FROM movie_countries WHERE name_vi='{$countryEsc}' AND status='active'")!==1)jsonResponse(array('success'=>false,'message'=>'Quốc gia sản xuất không thuộc danh mục đang sử dụng trong aurora_db.'),422);

        if($movie['original_title']==='')$movie['original_title']=$movie['title'];
        if($movie['writer']==='')$movie['writer']='Đang cập nhật';
        if($movie['producer']==='')$movie['producer']='Đang cập nhật';
        if($movie['plot_details']==='')$movie['plot_details']=$movie['description'];
        if($movie['localization_versions']==='')$movie['localization_versions']='Phụ đề Việt';
        if($movie['distributor']==='')$movie['distributor']='Đang cập nhật';

        $sets=array();
        foreach($stringFields as $field)$sets[]="`{$field}`='".$this->db->real_escape_string($movie[$field])."'";
        $sets[]='duration_minutes='.(int)$duration;
        $sets[]='production_year='.($year===null?'NULL':(int)$year);
        $sets[]='updated_at=NOW()';
        if(!$this->db->query("UPDATE movies SET ".implode(',',$sets)." WHERE id={$id} AND status<>'draft' LIMIT 1"))jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật phim trong aurora_db: '.$this->db->error),500);
        jsonResponse(array('success'=>true,'message'=>'Marketing đã cập nhật thông tin phim trong aurora_db.','data'=>array('id'=>$id,'movie_code'=>$existing[0]['movie_code'])));
    }

    private function validDate($value)
    {
        if(!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/',(string)$value,$parts))return false;
        return checkdate((int)$parts[2],(int)$parts[3],(int)$parts[1]);
    }

    private function moviePlans()
    {
        global $requestMethod;
        if ($requestMethod === 'GET') return $this->listMoviePlans(false);
        if ($requestMethod === 'POST') return $this->saveMoviePlan();
        if ($requestMethod === 'PUT') {
            $operation = isset($_GET['operation']) ? trim((string)$_GET['operation']) : '';
            if ($operation === 'submit') return $this->submitMoviePlan();
            if ($operation === 'withdraw') return $this->withdrawMoviePlan();
            if ($operation === 'publish-movie') return $this->publishApprovedMovie();
            return $this->saveMoviePlan();
        }
        if ($requestMethod === 'DELETE') return $this->deleteMoviePlan();
        jsonResponse(array('success'=>false,'message'=>'Phương thức kế hoạch phim không được hỗ trợ.'),405);
    }

    private function planApprovals()
    {
        global $requestMethod;
        $user = requireAdmin();
        if (AdminController::normalizeRole($user['role']) !== 'super_admin') {
            jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được xem và quyết định phê duyệt kế hoạch Marketing.'),403);
        }
        if ($requestMethod === 'GET') return $this->listMoviePlans(true);
        if ($requestMethod === 'PUT') return $this->reviewMoviePlan();
        jsonResponse(array('success'=>false,'message'=>'Phương thức phê duyệt không được hỗ trợ.'),405);
    }

    private function listMoviePlans($adminView)
    {
        $user = requireAdmin();
        $where = $adminView ? "mp.marketing_owner_id IS NOT NULL" : "1=1";
        if (!$adminView && AdminController::normalizeRole($user['role']) === 'marketing_manager') {
            $where .= " AND (mp.marketing_owner_id=".(int)$user['id']." OR mp.marketing_owner_id IS NULL)";
        }
        if (!empty($_GET['q'])) {
            $q = $this->db->real_escape_string(trim((string)$_GET['q']));
            $where .= " AND (mp.plan_name LIKE '%{$q}%' OR mp.plan_code LIKE '%{$q}%' OR mp.movie_title LIKE '%{$q}%')";
        }
        if (!empty($_GET['approval_status']) && in_array($_GET['approval_status'], array('draft','pending_approval','approved','revision_requested'), true)) {
            $where .= " AND mp.approval_status='".$this->db->real_escape_string($_GET['approval_status'])."'";
        }
        if (!empty($_GET['month'])) $where .= ' AND mp.plan_month='.(int)$_GET['month'];
        if (!empty($_GET['year'])) $where .= ' AND mp.plan_year='.(int)$_GET['year'];
        $data = $this->rows("SELECT mp.*,m.movie_code,m.poster_url,m.banner_url,m.trailer_url,m.release_date,m.expected_end_date AS movie_expected_end_date,m.genre,m.original_title,m.duration_minutes,m.age_rating,m.director,m.cast,m.writer,m.producer,m.production_country,m.production_year,m.description,m.plot_details,m.distributor,m.original_language,m.localization_versions,m.marketing_owner_id AS movie_marketing_owner_id,m.status AS movie_catalog_status,
            (SELECT COUNT(*) FROM movie_allocations ma WHERE ma.plan_id=mp.id) allocation_count,
            (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') FROM theaters t WHERE FIND_IN_SET(t.id,REPLACE(mp.planned_theater_ids,' ',''))) theater_names
            FROM movie_plans mp LEFT JOIN movies m ON m.id=mp.movie_id WHERE {$where}
            ORDER BY CASE mp.approval_status WHEN 'pending_approval' THEN 0 WHEN 'revision_requested' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,mp.updated_at DESC,mp.id DESC");
        foreach ($data as &$plan) {
            $plan['history'] = $this->rows("SELECT action_name,from_status,to_status,actor_name,actor_role,note,created_at FROM marketing_movie_plan_history WHERE plan_id=".(int)$plan['id']." ORDER BY id DESC");
            $plan['review_items'] = $this->rows("SELECT id,review_round,section_key,section_label,field_key,field_label,current_value,comment,status,created_by_name,created_at,resolved_at FROM marketing_movie_plan_review_items WHERE plan_id=".(int)$plan['id']." ORDER BY review_round DESC,id ASC");
            $plan['theater_ids'] = array_values(array_filter(array_map('intval', explode(',', (string)$plan['planned_theater_ids']))));
        }
        unset($plan);
        $summaryWhere = $adminView ? 'marketing_owner_id IS NOT NULL' : '1=1';
        jsonResponse(array('success'=>true,'data'=>$data,'meta'=>array(
            'summary'=>array(
                'total'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE {$summaryWhere}"),
                'draft'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE {$summaryWhere} AND approval_status='draft'"),
                'pending'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE {$summaryWhere} AND approval_status='pending_approval'"),
                'approved'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE {$summaryWhere} AND approval_status='approved'"),
                'revision'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE {$summaryWhere} AND approval_status='revision_requested'")
            ),
            'movies'=>$this->rows("SELECT id,movie_code,title,original_title,genre,duration_minutes,age_rating,production_country,director,cast,description,format,original_language,localization_versions,release_date,expected_end_date,poster_url,banner_url,trailer_url,status,marketing_owner_id FROM movies WHERE status NOT IN ('draft','ended','archived') ORDER BY release_date DESC,title"),
            'genres'=>$this->genreOptions(),
            'countries'=>$this->rows("SELECT id,iso_code,name_vi,name_en FROM movie_countries WHERE status='active' ORDER BY sort_order,name_vi"),
            'theaters'=>$this->rows("SELECT t.id,t.name,t.city,(SELECT COUNT(*) FROM screens s WHERE s.theater_id=t.id) total_screens FROM theaters t ORDER BY t.name")
        )));
    }

    private function saveMoviePlan()
    {
        $user = requireAdmin();
        if (AdminController::normalizeRole($user['role']) !== 'marketing_manager') jsonResponse(array('success'=>false,'message'=>'Chỉ Bộ phận Marketing được lập và cập nhật đề xuất kế hoạch.'),403);
        $input = requestJson();
        $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
        $name = isset($input['plan_name']) ? trim((string)$input['plan_name']) : '';
        $start = isset($input['expected_start_date']) ? trim((string)$input['expected_start_date']) : '';
        $end = isset($input['expected_end_date']) ? trim((string)$input['expected_end_date']) : '';
        $revenue = isset($input['target_revenue']) ? (float)$input['target_revenue'] : 0;
        $screenings = isset($input['target_screenings_per_day']) ? (int)$input['target_screenings_per_day'] : 0;
        $targetTickets = isset($input['target_tickets']) ? (int)$input['target_tickets'] : 0;
        $priority = isset($input['priority_level']) && in_array($input['priority_level'], array('blockbuster','high','medium','low'), true) ? $input['priority_level'] : 'medium';
        $reason = isset($input['recommendation_reason']) ? trim((string)$input['recommendation_reason']) : '';
        $note = isset($input['note']) ? trim((string)$input['note']) : '';
        $campaignName = isset($input['campaign_name']) ? trim((string)$input['campaign_name']) : '';
        $marketingBudget = isset($input['marketing_budget']) ? max(0,(float)$input['marketing_budget']) : 0;
        $promotionProposed = !empty($input['promotion_proposed']) ? 1 : 0;
        $rights = isset($input['release_rights_status']) && in_array($input['release_rights_status'],array('pending_verification','verified','not_required'),true) ? $input['release_rights_status'] : 'pending_verification';
        $classification = isset($input['content_classification_status']) && in_array($input['content_classification_status'],array('pending_review','verified','supplement_required'),true) ? $input['content_classification_status'] : 'pending_review';
        $theaterIds = isset($input['theater_ids']) && is_array($input['theater_ids']) ? array_values(array_unique(array_filter(array_map('intval',$input['theater_ids'])))) : array();
        if ($name === '' || !$this->validDate($start) || !$this->validDate($end) || $start > $end || $reason === '') jsonResponse(array('success'=>false,'message'=>'Tên, thời gian và lý do đề xuất kế hoạch chưa hợp lệ.'),422);
        if ($revenue <= 0 || $screenings <= 0 || $targetTickets <= 0) jsonResponse(array('success'=>false,'message'=>'Doanh thu, số vé và số suất chiếu mục tiêu phải lớn hơn 0.'),422);
        if (!$theaterIds) jsonResponse(array('success'=>false,'message'=>'Vui lòng đề xuất ít nhất một rạp triển khai.'),422);
        $validTheaters = (int)$this->scalar('SELECT COUNT(*) FROM theaters WHERE id IN ('.implode(',',$theaterIds).')');
        if ($validTheaters !== count($theaterIds)) jsonResponse(array('success'=>false,'message'=>'Danh sách rạp đề xuất có dữ liệu không hợp lệ.'),422);
        $existing = array();
        if ($id > 0) {
            $existing = $this->rows("SELECT id,movie_id,approval_status,marketing_owner_id FROM movie_plans WHERE id={$id} LIMIT 1");
            if (!$existing || (int)$existing[0]['marketing_owner_id'] !== (int)$user['id']) jsonResponse(array('success'=>false,'message'=>'Bạn không có quyền sửa kế hoạch này.'),403);
            if (!in_array($existing[0]['approval_status'],array('draft','revision_requested'),true)) jsonResponse(array('success'=>false,'message'=>'Chỉ kế hoạch nháp hoặc bị yêu cầu chỉnh sửa mới được cập nhật.'),409);
        }
        $movieMode = isset($input['movie_mode']) ? trim((string)$input['movie_mode']) : 'existing';
        $movieId = isset($input['movie_id']) ? (int)$input['movie_id'] : 0;
        $profile = isset($input['movie_profile']) && is_array($input['movie_profile']) ? $input['movie_profile'] : array();
        $this->db->query('START TRANSACTION');
        if ($movieMode === 'new') {
            $movieFields = array('title','original_title','age_rating','production_country','director','cast','description','format','audio_language','subtitle','poster_url','banner_url','trailer_url');
            $movieValues = array(); foreach($movieFields as $field)$movieValues[$field]=isset($profile[$field])?trim((string)$profile[$field]):'';
            $rawGenres=isset($profile['genre'])?$profile['genre']:array();if(!is_array($rawGenres))$rawGenres=explode(',',(string)$rawGenres);$genres=array();foreach($rawGenres as $genre){$genre=trim((string)$genre);if($genre!==''&&!in_array($genre,$genres,true))$genres[]=$genre;if(count($genres)>=8)break;}$movieValues['genre']=implode(', ',$genres);
            $duration = isset($profile['duration_minutes']) ? (int)$profile['duration_minutes'] : 0;
            if ($movieValues['title']===''||$movieValues['genre']===''||strlen($movieValues['genre'])>150||$duration<=0||$duration>600||$movieValues['age_rating']===''||$movieValues['production_country']===''||$movieValues['director']===''||$movieValues['description']===''||$movieValues['format']===''||$movieValues['audio_language']==='') {$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Hồ sơ phim mới còn thiếu trường bắt buộc hoặc danh sách thể loại vượt quá giới hạn.'),422);}
            $countryEsc=$this->db->real_escape_string($movieValues['production_country']);
            if((int)$this->scalar("SELECT COUNT(*) FROM movie_countries WHERE name_vi='{$countryEsc}' AND status='active'")!==1){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Quốc gia sản xuất không thuộc danh mục đang sử dụng trong aurora_db.'),422);}
            $safe=array();foreach($movieValues as $key=>$value)$safe[$key]=$this->db->real_escape_string($value);
            $ownedMovie = $movieId>0 ? $this->rows("SELECT id FROM movies WHERE id={$movieId} AND marketing_owner_id=".(int)$user['id']." AND status='draft' LIMIT 1") : array();
            if ($ownedMovie) {
                $movieSql="UPDATE movies SET title='{$safe['title']}',original_title='{$safe['original_title']}',genre='{$safe['genre']}',duration_minutes={$duration},age_rating='{$safe['age_rating']}',production_country='{$safe['production_country']}',director='{$safe['director']}',cast='{$safe['cast']}',description='{$safe['description']}',plot_details='{$safe['description']}',format='{$safe['format']}',original_language='{$safe['audio_language']}',localization_versions='{$safe['subtitle']}',poster_url='{$safe['poster_url']}',banner_url='{$safe['banner_url']}',trailer_url='{$safe['trailer_url']}',release_date='".$this->db->real_escape_string($start)."',expected_end_date='".$this->db->real_escape_string($end)."',updated_at=NOW() WHERE id={$movieId}";
                if(!$this->db->query($movieSql)){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật hồ sơ phim: '.$this->db->error),500);}
            } else {
                $movieCode='MKT-MOV-'.date('Y').'-'.strtoupper(substr(sha1(uniqid((string)mt_rand(),true)),0,7));$movieCode=$this->db->real_escape_string($movieCode);
                $movieSql="INSERT INTO movies(movie_code,title,original_title,genre,duration_minutes,age_rating,director,cast,production_country,production_year,description,plot_details,original_language,localization_versions,format,release_date,expected_end_date,poster_url,banner_url,trailer_url,status,is_hot,marketing_owner_id,created_at,updated_at) VALUES('{$movieCode}','{$safe['title']}','{$safe['original_title']}','{$safe['genre']}',{$duration},'{$safe['age_rating']}','{$safe['director']}','{$safe['cast']}','{$safe['production_country']}',".(int)substr($start,0,4).",'{$safe['description']}','{$safe['description']}','{$safe['audio_language']}','{$safe['subtitle']}','{$safe['format']}','".$this->db->real_escape_string($start)."','".$this->db->real_escape_string($end)."','{$safe['poster_url']}','{$safe['banner_url']}','{$safe['trailer_url']}','draft',0,".(int)$user['id'].",NOW(),NOW())";
                if(!$this->db->query($movieSql)){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể tạo hồ sơ phim mới: '.$this->db->error),500);}$movieId=(int)$this->db->insert_id;
            }
        } elseif ($movieId > 0 && $profile) {
            // Khi Marketing chọn phim trong kho, toàn bộ hồ sơ được frontend nạp
            // lại vào movie_profile. Những thay đổi trong wizard sẽ ghi đè đúng
            // bản ghi movies hiện hữu, còn các cột không xuất hiện trong wizard
            // (biên kịch, nhà sản xuất...) được giữ nguyên.
            $catalogMovie=$this->rows("SELECT id,status FROM movies WHERE id={$movieId} AND status NOT IN ('draft','archived') LIMIT 1");
            if(!$catalogMovie){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Phim được chọn không còn khả dụng trong kho phim.'),422);}
            $movieFields=array('title','original_title','age_rating','production_country','director','cast','description','format','audio_language','subtitle','poster_url','banner_url','trailer_url');
            $movieValues=array();foreach($movieFields as $field)$movieValues[$field]=isset($profile[$field])?trim((string)$profile[$field]):'';
            $rawGenres=isset($profile['genre'])?$profile['genre']:array();if(!is_array($rawGenres))$rawGenres=explode(',',(string)$rawGenres);$genres=array();foreach($rawGenres as $genre){$genre=trim((string)$genre);if($genre!==''&&!in_array($genre,$genres,true))$genres[]=$genre;if(count($genres)>=8)break;}$movieValues['genre']=implode(', ',$genres);
            $duration=isset($profile['duration_minutes'])?(int)$profile['duration_minutes']:0;
            if($movieValues['title']===''||$movieValues['genre']===''||strlen($movieValues['genre'])>150||$duration<=0||$duration>600||$movieValues['age_rating']===''||$movieValues['production_country']===''||$movieValues['director']===''||$movieValues['description']===''||$movieValues['format']===''||$movieValues['audio_language']===''){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Thông tin phim trong kho còn thiếu trường bắt buộc. Vui lòng kiểm tra lại hồ sơ đã nạp.'),422);}
            $countryEsc=$this->db->real_escape_string($movieValues['production_country']);
            if((int)$this->scalar("SELECT COUNT(*) FROM movie_countries WHERE name_vi='{$countryEsc}' AND status='active'")!==1){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Quốc gia sản xuất không thuộc danh mục đang sử dụng trong aurora_db.'),422);}
            $safe=array();foreach($movieValues as $key=>$value)$safe[$key]=$this->db->real_escape_string($value);
            $movieSql="UPDATE movies SET title='{$safe['title']}',original_title='{$safe['original_title']}',genre='{$safe['genre']}',duration_minutes={$duration},age_rating='{$safe['age_rating']}',production_country='{$safe['production_country']}',director='{$safe['director']}',cast='{$safe['cast']}',description='{$safe['description']}',format='{$safe['format']}',original_language='{$safe['audio_language']}',localization_versions='{$safe['subtitle']}',poster_url='{$safe['poster_url']}',banner_url='{$safe['banner_url']}',trailer_url='{$safe['trailer_url']}',release_date='".$this->db->real_escape_string($start)."',expected_end_date='".$this->db->real_escape_string($end)."',updated_at=NOW() WHERE id={$movieId} AND status NOT IN ('draft','archived') LIMIT 1";
            if(!$this->db->query($movieSql)){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể ghi đè thông tin phim đã chọn trong aurora_db: '.$this->db->error),500);}
        }
        $movieRows = $this->rows("SELECT id,title,format FROM movies WHERE id={$movieId} LIMIT 1");
        if (!$movieRows) {$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn phim hợp lệ trong kho phim.'),422);}
        $movie = $movieRows[0];
        $month = (int)substr($start,5,2); $year = (int)substr($start,0,4);
        $planCode = isset($input['plan_code']) && trim($input['plan_code']) !== '' ? trim($input['plan_code']) : 'MKT-PLAN-'.$year.'-'.strtoupper(substr(sha1(uniqid((string)mt_rand(),true)),0,6));
        $values = array(
            'plan_code'=>$planCode,'plan_name'=>$name,'plan_month'=>$month,'plan_year'=>$year,'movie_id'=>$movieId,
            'movie_title'=>$movie['title'],'format'=>$movie['format'],'expected_start_date'=>$start,'expected_end_date'=>$end,
            'target_revenue'=>$revenue,'target_screenings_per_day'=>$screenings,'target_tickets'=>$targetTickets,'priority_level'=>$priority,'recommendation_reason'=>$reason,'note'=>$note,
            'campaign_name'=>$campaignName,'marketing_budget'=>$marketingBudget,'promotion_proposed'=>$promotionProposed,'release_rights_status'=>$rights,'content_classification_status'=>$classification,
            'planned_theater_ids'=>implode(',',$theaterIds)
        );
        if ($id > 0) {
            $sets=array(); foreach($values as $key=>$value)$sets[]="`{$key}`='".$this->db->real_escape_string((string)$value)."'";
            if (!$this->db->query("UPDATE movie_plans SET ".implode(',',$sets).",approval_status='draft',approval_note=NULL,updated_by='".$this->db->real_escape_string($user['full_name'])."',updated_at=NOW() WHERE id={$id}")) {$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật kế hoạch: '.$this->db->error),500);}
            $oldMovieId=(int)$existing[0]['movie_id'];if($oldMovieId!==$movieId&&(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE movie_id={$oldMovieId}")===0)$this->db->query("DELETE FROM movies WHERE id={$oldMovieId} AND marketing_owner_id=".(int)$user['id']." AND status='draft' LIMIT 1");
            $this->logPlanHistory($id,'updated',$existing[0]['approval_status'],'draft',$user,'Marketing cập nhật nội dung kế hoạch.');
            $this->db->query('COMMIT');
            jsonResponse(array('success'=>true,'message'=>'Đã cập nhật bản nháp kế hoạch trong aurora_db.','data'=>array('id'=>$id)));
        }
        $columns=array();$escaped=array();foreach($values as $key=>$value){$columns[]="`{$key}`";$escaped[]="'".$this->db->real_escape_string((string)$value)."'";}
        $actor=$this->db->real_escape_string($user['full_name']);
        $sql="INSERT INTO movie_plans (".implode(',',$columns).",status,created_by,created_at,approved_by,approved_at,updated_by,updated_at,marketing_owner_id,approval_status) VALUES (".implode(',',$escaped).",'draft','{$actor}',NOW(),'','1970-01-01 00:00:00','{$actor}',NOW(),".(int)$user['id'].",'draft')";
        if (!$this->db->query($sql)) {$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể tạo kế hoạch phim: '.$this->db->error),500);}
        $newId=(int)$this->db->insert_id;$this->logPlanHistory($newId,'created','', 'draft',$user,'Marketing tạo bản nháp kế hoạch.');
        $this->db->query('COMMIT');
        jsonResponse(array('success'=>true,'message'=>'Đã tạo bản nháp kế hoạch phim.','data'=>array('id'=>$newId)),201);
    }

    private function submitMoviePlan()
    {
        $user=requireAdmin(); if(AdminController::normalizeRole($user['role'])!=='marketing_manager')jsonResponse(array('success'=>false,'message'=>'Chỉ Marketing được gửi kế hoạch.'),403);
        $input=requestJson();$id=isset($input['id'])?(int)$input['id']:(isset($_GET['id'])?(int)$_GET['id']:0);
        $rows=$this->rows("SELECT approval_status,marketing_owner_id,planned_theater_ids FROM movie_plans WHERE id={$id} LIMIT 1");
        if(!$rows||(int)$rows[0]['marketing_owner_id']!==(int)$user['id'])jsonResponse(array('success'=>false,'message'=>'Kế hoạch không tồn tại hoặc không thuộc tài khoản này.'),404);
        if(!in_array($rows[0]['approval_status'],array('draft','revision_requested'),true))jsonResponse(array('success'=>false,'message'=>'Kế hoạch hiện không thể gửi phê duyệt.'),409);
        if(trim((string)$rows[0]['planned_theater_ids'])==='')jsonResponse(array('success'=>false,'message'=>'Kế hoạch chưa có rạp đề xuất.'),422);
        $actor=$this->db->real_escape_string($user['full_name']);
        if(!$this->db->query("UPDATE movie_plans SET approval_status='pending_approval',submitted_by='{$actor}',submitted_at=NOW(),approval_note=NULL,updated_by='{$actor}',updated_at=NOW() WHERE id={$id}"))jsonResponse(array('success'=>false,'message'=>'Không thể gửi kế hoạch: '.$this->db->error),500);
        $this->db->query("UPDATE marketing_movie_plan_review_items SET status='resolved',resolved_at=NOW() WHERE plan_id={$id} AND status='open'");
        $this->logPlanHistory($id,'submitted',$rows[0]['approval_status'],'pending_approval',$user,'Gửi kế hoạch đến Admin Tổng phê duyệt.');
        jsonResponse(array('success'=>true,'message'=>'Đã gửi kế hoạch đến Admin Tổng. Bạn có thể theo dõi kết quả tại đây.'));
    }

    private function withdrawMoviePlan()
    {
        $user=requireAdmin();$input=requestJson();$id=isset($input['id'])?(int)$input['id']:(isset($_GET['id'])?(int)$_GET['id']:0);
        $rows=$this->rows("SELECT movie_id,approval_status,marketing_owner_id FROM movie_plans WHERE id={$id} LIMIT 1");
        if(!$rows||(int)$rows[0]['marketing_owner_id']!==(int)$user['id']||$rows[0]['approval_status']!=='pending_approval')jsonResponse(array('success'=>false,'message'=>'Chỉ có thể thu hồi kế hoạch đang chờ duyệt của bạn.'),409);
        $this->db->query("UPDATE movie_plans SET approval_status='draft',submitted_at=NULL,submitted_by=NULL,updated_at=NOW() WHERE id={$id}");
        $this->logPlanHistory($id,'withdrawn','pending_approval','draft',$user,'Marketing thu hồi để tiếp tục chỉnh sửa.');
        jsonResponse(array('success'=>true,'message'=>'Đã thu hồi kế hoạch về bản nháp.'));
    }

    private function deleteMoviePlan()
    {
        $user=requireAdmin();$id=isset($_GET['id'])?(int)$_GET['id']:0;
        $rows=$this->rows("SELECT movie_id,approval_status,marketing_owner_id FROM movie_plans WHERE id={$id} LIMIT 1");
        if(!$rows||(int)$rows[0]['marketing_owner_id']!==(int)$user['id'])jsonResponse(array('success'=>false,'message'=>'Kế hoạch không tồn tại hoặc không thuộc tài khoản này.'),404);
        if(!in_array($rows[0]['approval_status'],array('draft','revision_requested'),true))jsonResponse(array('success'=>false,'message'=>'Không thể xóa kế hoạch đã gửi hoặc đã duyệt.'),409);
        $this->db->query("DELETE FROM marketing_movie_plan_review_items WHERE plan_id={$id}");
        $this->db->query("DELETE FROM marketing_movie_plan_history WHERE plan_id={$id}");
        $movieId=(int)$rows[0]['movie_id'];
        if(!$this->db->query("DELETE FROM movie_plans WHERE id={$id} LIMIT 1"))jsonResponse(array('success'=>false,'message'=>'Không thể xóa kế hoạch: '.$this->db->error),500);
        if((int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE movie_id={$movieId}")===0)$this->db->query("DELETE FROM movies WHERE id={$movieId} AND marketing_owner_id=".(int)$user['id']." AND status='draft' LIMIT 1");
        jsonResponse(array('success'=>true,'message'=>'Đã xóa bản nháp kế hoạch phim.'));
    }

    private function reviewMoviePlan()
    {
        $user=requireAdmin();if(AdminController::normalizeRole($user['role'])!=='super_admin')jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được phê duyệt.'),403);
        $input=requestJson();$id=isset($input['id'])?(int)$input['id']:0;$decision=isset($input['decision'])?trim($input['decision']):'';$note=isset($input['note'])?trim($input['note']):'';$rawReviewItems=isset($input['review_items'])&&is_array($input['review_items'])?$input['review_items']:array();$reviewItems=array();
        $reviewTaxonomy=array(
            'movie'=>array('label'=>'Thông tin phim','fields'=>array('title'=>'Tên phim','original_title'=>'Tên phim gốc','genre'=>'Thể loại','age_rating'=>'Phân loại độ tuổi','duration'=>'Thời lượng','director'=>'Đạo diễn','cast'=>'Diễn viên','production_country'=>'Quốc gia sản xuất','description'=>'Tóm tắt nội dung')),
            'release'=>array('label'=>'Phát hành và phiên bản','fields'=>array('format'=>'Định dạng chiếu','language'=>'Ngôn ngữ âm thanh','subtitles'=>'Phụ đề / lồng tiếng','distributor'=>'Nhà phát hành','release_date'=>'Ngày khởi chiếu','end_date'=>'Ngày kết thúc dự kiến','rights'=>'Quyền phát hành','classification'=>'Kiểm tra phân loại','poster'=>'Poster','banner'=>'Banner','trailer'=>'Trailer')),
            'business'=>array('label'=>'Kế hoạch kinh doanh và quảng bá','fields'=>array('plan_name'=>'Tên kế hoạch','expected_period'=>'Thời gian phát hành dự kiến','target_revenue'=>'Doanh thu mục tiêu','target_tickets'=>'Mục tiêu vé bán','screenings'=>'Chỉ tiêu suất chiếu','priority'=>'Mức độ ưu tiên','campaign'=>'Chiến dịch quảng bá','budget'=>'Ngân sách Marketing','promotion'=>'Khuyến mãi đi kèm','reason'=>'Lý do đề xuất','note'=>'Ghi chú triển khai')),
            'theaters'=>array('label'=>'Rạp đề xuất triển khai','fields'=>array('theater_list'=>'Danh sách rạp đề xuất'))
        );
        $seenReviewFields=array();
        foreach($rawReviewItems as $item){
            $section=isset($item['section_key'])?trim((string)$item['section_key']):'';$field=isset($item['field_key'])?trim((string)$item['field_key']):'';$comment=isset($item['comment'])?trim((string)$item['comment']):'';$currentValue=isset($item['current_value'])?trim((string)$item['current_value']):'';$unique=$section.'.'.$field;
            if(!isset($reviewTaxonomy[$section])||!isset($reviewTaxonomy[$section]['fields'][$field])||isset($seenReviewFields[$unique]))continue;
            if($comment===''||strlen($comment)>3000)jsonResponse(array('success'=>false,'message'=>'Mỗi trường được chọn phải có nội dung yêu cầu chỉnh sửa từ 1 đến 3000 ký tự.'),422);
            if(strlen($currentValue)>2000)$currentValue=substr($currentValue,0,2000);
            $seenReviewFields[$unique]=true;$reviewItems[]=array('section_key'=>$section,'section_label'=>$reviewTaxonomy[$section]['label'],'field_key'=>$field,'field_label'=>$reviewTaxonomy[$section]['fields'][$field],'current_value'=>$currentValue,'comment'=>$comment);
        }
        if(!in_array($decision,array('approved','revision_requested'),true))jsonResponse(array('success'=>false,'message'=>'Quyết định phê duyệt không hợp lệ.'),422);
        if($decision==='revision_requested'&&!$reviewItems)jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn ít nhất một trường dữ liệu và nhập yêu cầu chỉnh sửa cụ thể.'),422);
        $rows=$this->rows("SELECT * FROM movie_plans WHERE id={$id} AND marketing_owner_id IS NOT NULL LIMIT 1");
        if(!$rows)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy kế hoạch Marketing.'),404);
        $plan=$rows[0];if($plan['approval_status']!=='pending_approval')jsonResponse(array('success'=>false,'message'=>'Kế hoạch không còn ở trạng thái chờ duyệt.'),409);
        $actor=$this->db->real_escape_string($user['full_name']);$noteEsc=$this->db->real_escape_string($note);$status=$decision==='approved'?'published':'draft';
        if(!$this->db->query('START TRANSACTION'))jsonResponse(array('success'=>false,'message'=>'Không thể bắt đầu phê duyệt kế hoạch trong aurora_db: '.$this->db->error),500);
        // Giữ giá trị rỗng tương thích cả schema cũ (NOT NULL) và schema mới (NULL).
        $approvedBy=$decision==='approved'?"'{$actor}'":"''";$approvedAt=$decision==='approved'?'NOW()':"'1970-01-01 00:00:00'";
        if(!$this->db->query("UPDATE movie_plans SET approval_status='{$decision}',status='{$status}',reviewed_by='{$actor}',reviewed_at=NOW(),approval_note='{$noteEsc}',approved_by={$approvedBy},approved_at={$approvedAt},updated_by='{$actor}',updated_at=NOW() WHERE id={$id} AND approval_status='pending_approval'")||$this->db->affected_rows!==1){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>$error!==''?'Không thể lưu quyết định: '.$error:'Kế hoạch vừa được xử lý ở một phiên khác. Vui lòng tải lại dữ liệu.'),409);}
        if($decision==='revision_requested'){
            $round=(int)$this->scalar("SELECT COALESCE(MAX(review_round),0)+1 FROM marketing_movie_plan_review_items WHERE plan_id={$id}");
            foreach($reviewItems as $item){
                $section=$this->db->real_escape_string($item['section_key']);$sectionLabel=$this->db->real_escape_string($item['section_label']);$field=$this->db->real_escape_string($item['field_key']);$label=$this->db->real_escape_string($item['field_label']);$currentValue=$this->db->real_escape_string($item['current_value']);$comment=$this->db->real_escape_string($item['comment']);
                if(!$this->db->query("INSERT INTO marketing_movie_plan_review_items(plan_id,review_round,section_key,section_label,field_key,field_label,current_value,comment,status,created_by,created_by_name,created_at) VALUES({$id},{$round},'{$section}','{$sectionLabel}','{$field}','{$label}','{$currentValue}','{$comment}','open',".(int)$user['id'].",'{$actor}',NOW())")){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể lưu nội dung phản hồi: '.$error),500);}
            }
        }
        if($decision==='approved'&&!$this->distributeApprovedPlan($plan)){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể phân bổ kế hoạch đến Admin Rạp: '.$error),500);}
        if(!$this->logPlanHistory($id,$decision==='approved'?'approved':'revision_requested','pending_approval',$decision,$user,$note)){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể ghi lịch sử phê duyệt: '.$error),500);}
        if(!$this->db->query('COMMIT')){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể hoàn tất phê duyệt trong aurora_db: '.$error),500);}
        jsonResponse(array('success'=>true,'message'=>$decision==='approved'?'Đã duyệt và phân bổ kế hoạch đến các rạp đề xuất.':'Đã gửi yêu cầu chỉnh sửa đến Marketing.'));
    }

    private function publishApprovedMovie()
    {
        $user=requireAdmin();if(AdminController::normalizeRole($user['role'])!=='marketing_manager')jsonResponse(array('success'=>false,'message'=>'Chỉ Marketing được đưa phim đã duyệt vào danh sách phim.'),403);
        $input=requestJson();$id=isset($input['id'])?(int)$input['id']:(isset($_GET['id'])?(int)$_GET['id']:0);
        $rows=$this->rows("SELECT mp.id,mp.movie_id,mp.movie_title,mp.approval_status,mp.marketing_owner_id,m.status AS movie_status FROM movie_plans mp INNER JOIN movies m ON m.id=mp.movie_id WHERE mp.id={$id} LIMIT 1");
        if(!$rows||(int)$rows[0]['marketing_owner_id']!==(int)$user['id'])jsonResponse(array('success'=>false,'message'=>'Kế hoạch không tồn tại hoặc không thuộc tài khoản này.'),404);
        if($rows[0]['approval_status']!=='approved')jsonResponse(array('success'=>false,'message'=>'Chỉ được thêm phim vào danh sách sau khi Admin Tổng phê duyệt kế hoạch.'),403);
        if($rows[0]['movie_status']!=='draft')jsonResponse(array('success'=>false,'message'=>'Phim này đã có trong Danh sách phim hoặc không còn ở trạng thái chờ công bố.'),409);
        $movieId=(int)$rows[0]['movie_id'];
        if(!$this->db->query("UPDATE movies SET status='coming_soon',updated_at=NOW() WHERE id={$movieId} AND status='draft' LIMIT 1"))jsonResponse(array('success'=>false,'message'=>'Không thể công bố phim trong aurora_db: '.$this->db->error),500);
        $this->logPlanHistory($id,'movie_published','approved','approved',$user,'Marketing đưa phim vào danh sách phim sắp chiếu sau phê duyệt.');
        jsonResponse(array('success'=>true,'message'=>'Đã thêm “'.$rows[0]['movie_title'].'” vào danh sách phim sắp chiếu.'));
    }

    private function distributeApprovedPlan($plan)
    {
        $ids=array_values(array_unique(array_filter(array_map('intval',explode(',',(string)$plan['planned_theater_ids'])))));
        foreach($ids as $theaterId){
            $theaters=$this->rows("SELECT id,name FROM theaters WHERE id={$theaterId} LIMIT 1");if(!$theaters)continue;$name=$this->db->real_escape_string($theaters[0]['name']);$title=$this->db->real_escape_string($plan['movie_title']);$format=$this->db->real_escape_string($plan['format']);
            $exists=(int)$this->scalar("SELECT id FROM movie_allocations WHERE plan_id=".(int)$plan['id']." AND theater_id={$theaterId} LIMIT 1");
            if($exists){if(!$this->db->query("UPDATE movie_allocations SET min_screenings_per_day=".(int)$plan['target_screenings_per_day'].",preferred_screen_types='{$format}',allocated_start_date='".$this->db->real_escape_string($plan['expected_start_date'])."',allocated_end_date='".$this->db->real_escape_string($plan['expected_end_date'])."',status='pending' WHERE id={$exists}"))return false;}
            elseif(!$this->db->query("INSERT INTO movie_allocations(plan_id,movie_id,movie_title,theater_id,theater_name,min_screenings_per_day,preferred_screen_types,allocated_start_date,allocated_end_date,status,confirmed_by,confirmed_at) VALUES(".(int)$plan['id'].",".(int)$plan['movie_id'].",'{$title}',{$theaterId},'{$name}',".(int)$plan['target_screenings_per_day'].",'{$format}','".$this->db->real_escape_string($plan['expected_start_date'])."','".$this->db->real_escape_string($plan['expected_end_date'])."','pending','',NOW())"))return false;
        }
        return true;
    }

    private function logPlanHistory($planId,$action,$from,$to,$user,$note)
    {
        $values=array($action,$from,$to,$user['full_name'],AdminController::normalizeRole($user['role']),$note);$safe=array();foreach($values as $value)$safe[]=$this->db->real_escape_string((string)$value);
        return $this->db->query("INSERT INTO marketing_movie_plan_history(plan_id,action_name,from_status,to_status,actor_id,actor_name,actor_role,note,created_at) VALUES(".(int)$planId.",'{$safe[0]}','{$safe[1]}','{$safe[2]}',".(int)$user['id'].",'{$safe[3]}','{$safe[4]}','{$safe[5]}',NOW())");
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
            'movie_plans_pending'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE marketing_owner_id IS NOT NULL AND approval_status='pending_approval'"),
            'movie_plans_revision'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE marketing_owner_id IS NOT NULL AND approval_status='revision_requested'"),
            'movie_plans_approved'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE marketing_owner_id IS NOT NULL AND approval_status='approved'"),
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
