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

    private function movieLanguageOptions()
    {
        return $this->rows("SELECT code,name_vi,name_en FROM movie_audio_languages WHERE status='active' ORDER BY sort_order,name_vi");
    }

    private function movieSubtitleOptions()
    {
        return $this->rows("SELECT code,label_vi,label_en FROM movie_subtitle_options WHERE status='active' ORDER BY sort_order,label_vi");
    }

    private function moviePlanReasonOptions()
    {
        return $this->rows("SELECT code,label_vi,description_vi FROM movie_plan_reason_options WHERE status='active' ORDER BY sort_order,label_vi");
    }

    private function activeMovieCatalogValueExists($table, $column, $value)
    {
        $allowed = array('movie_audio_languages'=>array('name_vi'), 'movie_subtitle_options'=>array('label_vi'));
        if (!isset($allowed[$table]) || !in_array($column, $allowed[$table], true)) return false;
        $valueEsc = $this->db->real_escape_string(trim((string)$value));
        return (int)$this->scalar("SELECT COUNT(*) FROM `{$table}` WHERE `{$column}`='{$valueEsc}' AND status='active'") === 1;
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
            "CREATE TABLE IF NOT EXISTS movie_audio_languages (
                id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(20) NOT NULL UNIQUE,
                name_vi VARCHAR(80) NOT NULL UNIQUE,
                name_en VARCHAR(80) NOT NULL,
                sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
                status ENUM('active','inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_movie_audio_language_status (status,sort_order,name_vi)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS movie_subtitle_options (
                id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(40) NOT NULL UNIQUE,
                label_vi VARCHAR(120) NOT NULL UNIQUE,
                label_en VARCHAR(120) NOT NULL,
                sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
                status ENUM('active','inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_movie_subtitle_status (status,sort_order,label_vi)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS movie_plan_reason_options (
                id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                label_vi VARCHAR(160) NOT NULL UNIQUE,
                description_vi VARCHAR(255) NULL,
                sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
                status ENUM('active','inactive') NOT NULL DEFAULT 'active',
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                KEY idx_movie_plan_reason_status (status,sort_order,label_vi)
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS marketing_promotion_history (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                promotion_id BIGINT UNSIGNED NOT NULL,
                action_name VARCHAR(40) NOT NULL,
                from_status VARCHAR(30) NULL,
                to_status VARCHAR(30) NOT NULL,
                actor_id BIGINT UNSIGNED NULL,
                actor_name VARCHAR(120) NOT NULL,
                actor_role VARCHAR(40) NOT NULL,
                note TEXT NULL,
                created_at DATETIME NOT NULL,
                KEY idx_mkt_promotion_history (promotion_id,created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS promotion_theater_deployments (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                promotion_id BIGINT UNSIGNED NOT NULL,voucher_id BIGINT UNSIGNED NOT NULL,theater_id BIGINT UNSIGNED NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'pending',received_by BIGINT UNSIGNED NULL,received_by_name VARCHAR(120) NULL,received_at DATETIME NULL,
                pos_button_label VARCHAR(50) NULL,pos_button_color VARCHAR(20) NOT NULL DEFAULT '#D99A1B',pos_button_icon VARCHAR(30) NOT NULL DEFAULT 'gift',
                pos_sort_order INT NOT NULL DEFAULT 0,applies_to VARCHAR(20) NOT NULL DEFAULT 'all',pos_enabled TINYINT(1) NOT NULL DEFAULT 0,
                configured_by BIGINT UNSIGNED NULL,configured_by_name VARCHAR(120) NULL,configured_at DATETIME NULL,
                redemption_count INT UNSIGNED NOT NULL DEFAULT 0,last_redeemed_at DATETIME NULL,created_at DATETIME NOT NULL,updated_at DATETIME NULL,
                UNIQUE KEY uq_promotion_theater (promotion_id,theater_id),KEY idx_promotion_deployment_theater (theater_id,status,pos_enabled),KEY idx_promotion_deployment_voucher (voucher_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS promotion_department_assignments (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,promotion_id BIGINT UNSIGNED NOT NULL,
                recipient_role VARCHAR(40) NOT NULL,recipient_label VARCHAR(120) NOT NULL,theater_id BIGINT UNSIGNED NULL,
                responsibility TEXT NOT NULL,due_date DATE NULL,status VARCHAR(30) NOT NULL DEFAULT 'assigned',
                assigned_by BIGINT UNSIGNED NOT NULL,assigned_by_name VARCHAR(120) NOT NULL,assigned_at DATETIME NOT NULL,
                accepted_at DATETIME NULL,completed_at DATETIME NULL,updated_at DATETIME NULL,
                KEY idx_promotion_assignment (promotion_id,status),KEY idx_promotion_recipient (recipient_role,theater_id,status)
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
            'recommendation_reason_codes' => 'TEXT NULL',
            'recommendation_reason_detail' => 'TEXT NULL',
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
        $campaignColumns = array(
            'movie_id' => 'BIGINT UNSIGNED NULL',
            'target_audience' => "VARCHAR(180) NOT NULL DEFAULT 'Khách hàng Aurora Cinema'",
            'description' => 'TEXT NULL',
            'expected_reach' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'actual_reach' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'impressions' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'clicks' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'conversions' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'spent_budget' => 'DECIMAL(14,2) NOT NULL DEFAULT 0'
        );
        foreach ($campaignColumns as $column => $definition) {
            if (!$this->columnExists('marketing_campaigns', $column) && !$this->db->query("ALTER TABLE marketing_campaigns ADD COLUMN `{$column}` {$definition}")) {
                jsonResponse(array('success'=>false,'message'=>'Không thể nâng cấp dữ liệu chiến dịch Marketing: '.$this->db->error),500);
            }
        }
        $promotionColumns = array(
            'description' => 'VARCHAR(255) NULL',
            'details' => 'TEXT NULL',
            'terms_text' => 'TEXT NULL',
            'category' => "VARCHAR(30) NOT NULL DEFAULT 'ticket'",
            'audience' => "VARCHAR(30) NOT NULL DEFAULT 'all'",
            'badge_text' => 'VARCHAR(60) NULL',
            'theme_color' => "VARCHAR(20) NOT NULL DEFAULT '#D99A1B'",
            'image_url' => 'VARCHAR(500) NULL',
            'min_order_amount' => 'DECIMAL(12,2) NOT NULL DEFAULT 0',
            'max_discount' => 'DECIMAL(12,2) NOT NULL DEFAULT 0',
            'usage_limit' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'is_featured' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'publication_status' => "VARCHAR(30) NOT NULL DEFAULT 'draft'",
            'submitted_by' => 'VARCHAR(120) NULL',
            'submitted_at' => 'DATETIME NULL',
            'reviewed_by' => 'VARCHAR(120) NULL',
            'reviewed_at' => 'DATETIME NULL',
            'review_note' => 'TEXT NULL',
            'published_by' => 'VARCHAR(120) NULL',
            'published_at' => 'DATETIME NULL',
            'voucher_id' => 'BIGINT UNSIGNED NULL',
            'benefit_type' => "VARCHAR(30) NOT NULL DEFAULT 'percent'",
            'benefit_title' => 'VARCHAR(150) NULL',
            'benefit_description' => 'TEXT NULL',
            'gift_product_id' => 'BIGINT UNSIGNED NULL',
            'gift_quantity' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'buy_quantity' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'get_quantity' => 'INT UNSIGNED NOT NULL DEFAULT 0',
            'application_scope' => "VARCHAR(20) NOT NULL DEFAULT 'order'",
            'redemption_instructions' => 'TEXT NULL',
            'source_type' => "VARCHAR(30) NOT NULL DEFAULT 'marketing_plan'",
            'admin_objective' => 'TEXT NULL',
            'coordination_note' => 'TEXT NULL'
        );
        foreach ($promotionColumns as $column => $definition) {
            if (!$this->columnExists('marketing_promotions', $column) && !$this->db->query("ALTER TABLE marketing_promotions ADD COLUMN `{$column}` {$definition}")) {
                jsonResponse(array('success'=>false,'message'=>'Không thể nâng cấp quy trình khuyến mãi: '.$this->db->error),500);
            }
        }
        $approvalType = strtolower((string)$this->scalar("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_promotions' AND COLUMN_NAME='approval_status'"));
        if (strpos($approvalType, 'enum(') === 0 && !$this->db->query("ALTER TABLE marketing_promotions MODIFY approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'")) {
            jsonResponse(array('success'=>false,'message'=>'Không thể mở rộng trạng thái duyệt khuyến mãi: '.$this->db->error),500);
        }
        $promotionDiscountType = strtolower((string)$this->scalar("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_promotions' AND COLUMN_NAME='discount_type'"));
        if(strpos($promotionDiscountType,'enum(')===0&&!$this->db->query("ALTER TABLE marketing_promotions MODIFY discount_type VARCHAR(30) NOT NULL DEFAULT 'percent'"))jsonResponse(array('success'=>false,'message'=>'Không thể mở rộng loại quyền lợi CTKM: '.$this->db->error),500);
        $this->db->query("UPDATE marketing_promotions SET approval_status='pending_approval' WHERE approval_status='pending'");
        $voucherColumns = array(
            'short_description' => 'VARCHAR(255) NULL', 'details' => 'TEXT NULL', 'terms_text' => 'TEXT NULL',
            'category' => "VARCHAR(30) NOT NULL DEFAULT 'ticket'", 'audience' => "VARCHAR(30) NOT NULL DEFAULT 'all'",
            'badge_text' => 'VARCHAR(60) NULL', 'theme_color' => "VARCHAR(20) NOT NULL DEFAULT '#D99A1B'",
            'image_url' => 'VARCHAR(500) NULL', 'min_order_amount' => 'DECIMAL(12,2) NOT NULL DEFAULT 0',
            'max_discount' => 'DECIMAL(12,2) NOT NULL DEFAULT 0', 'is_featured' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'sort_order' => 'INT NOT NULL DEFAULT 0', 'source_promotion_id' => 'BIGINT UNSIGNED NULL',
            'benefit_type' => "VARCHAR(30) NOT NULL DEFAULT 'percent'",'benefit_title'=>'VARCHAR(150) NULL','benefit_description'=>'TEXT NULL',
            'gift_product_id'=>'BIGINT UNSIGNED NULL','gift_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0','buy_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0',
            'get_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0','application_scope'=>"VARCHAR(20) NOT NULL DEFAULT 'order'",'redemption_instructions'=>'TEXT NULL'
        );
        foreach ($voucherColumns as $column => $definition) {
            if (!$this->columnExists('vouchers', $column) && !$this->db->query("ALTER TABLE vouchers ADD COLUMN `{$column}` {$definition}")) {
                jsonResponse(array('success'=>false,'message'=>'Không thể đồng bộ schema ưu đãi Customer: '.$this->db->error),500);
            }
        }
        $voucherDiscountType=strtolower((string)$this->scalar("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vouchers' AND COLUMN_NAME='discount_type'"));
        if(strpos($voucherDiscountType,'enum(')===0&&!$this->db->query("ALTER TABLE vouchers MODIFY discount_type VARCHAR(30) NOT NULL DEFAULT 'percent'"))jsonResponse(array('success'=>false,'message'=>'Không thể mở rộng loại quyền lợi voucher: '.$this->db->error),500);
        if(!$this->db->query("CREATE TABLE IF NOT EXISTS promotion_media_assets (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,promotion_id BIGINT UNSIGNED NULL,file_name VARCHAR(180) NOT NULL,original_name VARCHAR(255) NOT NULL,mime_type VARCHAR(80) NOT NULL,file_size INT UNSIGNED NOT NULL,public_url VARCHAR(500) NOT NULL,uploaded_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL,KEY idx_promotion_media_promotion(promotion_id),KEY idx_promotion_media_uploader(uploaded_by,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"))jsonResponse(array('success'=>false,'message'=>'Không thể chuẩn bị thư viện ảnh CTKM: '.$this->db->error),500);
        $contentColumns=array(
            'placement_key'=>"VARCHAR(50) NOT NULL DEFAULT 'home_hero'",'eyebrow'=>'VARCHAR(140) NULL',
            'body_text'=>'TEXT NULL','button_label'=>'VARCHAR(80) NULL','button_url'=>'VARCHAR(500) NULL',
            'alt_text'=>'VARCHAR(255) NULL','sort_order'=>'INT NOT NULL DEFAULT 0','is_visible'=>'TINYINT(1) NOT NULL DEFAULT 1',
            'starts_at'=>'DATETIME NULL','ends_at'=>'DATETIME NULL','published_at'=>'DATETIME NULL','published_by'=>'VARCHAR(120) NULL'
        );
        foreach($contentColumns as $column=>$definition){
            if(!$this->columnExists('marketing_contents',$column)&&!$this->db->query("ALTER TABLE marketing_contents ADD COLUMN `{$column}` {$definition}"))jsonResponse(array('success'=>false,'message'=>'Không thể nâng cấp CMS Customer Website: '.$this->db->error),500);
        }
        if(!$this->db->query("CREATE TABLE IF NOT EXISTS marketing_content_history (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,content_id BIGINT UNSIGNED NOT NULL,action_name VARCHAR(40) NOT NULL,snapshot_json TEXT NULL,actor_id BIGINT UNSIGNED NULL,actor_name VARCHAR(120) NULL,created_at DATETIME NOT NULL,KEY idx_content_history(content_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"))jsonResponse(array('success'=>false,'message'=>'Không thể chuẩn bị lịch sử CMS: '.$this->db->error),500);
        if(!$this->db->query("CREATE TABLE IF NOT EXISTS marketing_content_assets (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,content_id BIGINT UNSIGNED NULL,file_name VARCHAR(180) NOT NULL,original_name VARCHAR(255) NOT NULL,mime_type VARCHAR(80) NOT NULL,file_size INT UNSIGNED NOT NULL,public_url VARCHAR(500) NOT NULL,uploaded_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL,KEY idx_content_asset(content_id),KEY idx_content_asset_uploader(uploaded_by,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"))jsonResponse(array('success'=>false,'message'=>'Không thể chuẩn bị thư viện CMS: '.$this->db->error),500);
        $this->db->query("UPDATE marketing_contents SET placement_key=CASE WHEN content_type='featured_movie' THEN 'home_featured' WHEN content_type='news' THEN 'home_announcement' ELSE 'home_hero' END WHERE placement_key IS NULL OR placement_key='' OR (placement_key='home_hero' AND placement<>'Hero trang chủ')");
        $this->db->query("UPDATE marketing_contents SET starts_at=publish_at WHERE starts_at IS NULL AND publish_at IS NOT NULL");
        $this->db->query("UPDATE marketing_contents SET sort_order=id WHERE sort_order=0");
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
        $this->db->query("INSERT IGNORE INTO movie_audio_languages (code,name_vi,name_en,sort_order,status) VALUES
            ('vi','Tiếng Việt','Vietnamese',1,'active'),('en','Tiếng Anh','English',2,'active'),
            ('ko','Tiếng Hàn','Korean',3,'active'),('ja','Tiếng Nhật','Japanese',4,'active'),
            ('zh','Tiếng Trung','Chinese',5,'active'),('th','Tiếng Thái','Thai',6,'active'),
            ('fr','Tiếng Pháp','French',7,'active'),('es','Tiếng Tây Ban Nha','Spanish',8,'active'),
            ('de','Tiếng Đức','German',9,'active'),('ru','Tiếng Nga','Russian',10,'active'),
            ('hi','Tiếng Hindi','Hindi',11,'active'),('id','Tiếng Indonesia','Indonesian',12,'active')");
        $this->db->query("INSERT IGNORE INTO movie_subtitle_options (code,label_vi,label_en,sort_order,status) VALUES
            ('none','Không','None',1,'active'),('vi','Tiếng Việt','Vietnamese',2,'active'),
            ('en','Tiếng Anh','English',3,'active'),('vi_en','Song ngữ Việt - Anh','Vietnamese - English bilingual',4,'active'),
            ('sub_vi','Phụ đề Việt','Vietnamese subtitles',5,'active'),('sub_en','Phụ đề Anh','English subtitles',6,'active'),
            ('sub_vi_dub_vi','Phụ đề Việt / Lồng tiếng Việt','Vietnamese subtitles / Vietnamese dub',7,'active'),
            ('sub_vi_dub_en','Phụ đề Việt / Lồng tiếng Anh','Vietnamese subtitles / English dub',8,'active'),
            ('sub_en_dub_vi','Phụ đề Anh / Lồng tiếng Việt','English subtitles / Vietnamese dub',9,'active'),
            ('sub_vi_dub_ko','Phụ đề Việt / Lồng tiếng Hàn','Vietnamese subtitles / Korean dub',10,'active')");
        $this->db->query("INSERT IGNORE INTO movie_plan_reason_options (code,label_vi,description_vi,sort_order,status) VALUES
            ('market_demand','Nhu cầu thị trường cao','Phù hợp xu hướng tìm kiếm và nhu cầu xem phim hiện tại.',1,'active'),
            ('target_audience','Phù hợp đối tượng khán giả mục tiêu','Nội dung phù hợp nhóm khách hàng trọng tâm của Aurora Cinema.',2,'active'),
            ('revenue_potential','Tiềm năng doanh thu tốt','Có khả năng đạt mục tiêu vé bán và doanh thu kỳ phát hành.',3,'active'),
            ('strong_franchise','Thương hiệu phim có sức hút','Thuộc thương hiệu, loạt phim hoặc sở hữu dàn diễn viên nổi bật.',4,'active'),
            ('seasonal_fit','Phù hợp mùa vụ hoặc dịp lễ','Thời điểm phát hành phù hợp lễ, Tết, hè hoặc sự kiện đặc biệt.',5,'active'),
            ('content_diversity','Bổ sung đa dạng nội dung','Giúp cân bằng thể loại và làm phong phú danh mục phim đang khai thác.',6,'active'),
            ('marketing_support','Có lợi thế truyền thông','Có tài nguyên, đối tác hoặc chiến dịch hỗ trợ quảng bá tốt.',7,'active'),
            ('competitive_advantage','Tạo lợi thế cạnh tranh','Tăng sức cạnh tranh với các cụm rạp và nội dung cùng thời điểm.',8,'active'),
            ('customer_request','Theo yêu cầu hoặc phản hồi khách hàng','Được đề xuất từ khảo sát, lượt quan tâm hoặc phản hồi khách hàng.',9,'active'),
            ('strategic_partnership','Phù hợp hợp tác chiến lược','Gắn với thỏa thuận nhà phát hành hoặc đối tác chiến lược.',10,'active')");
        // Preserve valid values already stored by older versions by promoting
        // them into the managed catalogs instead of losing them in the new
        // select controls.
        $this->db->query("INSERT IGNORE INTO movie_audio_languages (code,name_vi,name_en,sort_order,status)
            SELECT CONCAT('legacy_',LEFT(SHA1(TRIM(original_language)),12)),TRIM(original_language),TRIM(original_language),90,'active'
            FROM movies WHERE original_language IS NOT NULL AND TRIM(original_language)<>'' GROUP BY TRIM(original_language)");
        $this->db->query("INSERT IGNORE INTO movie_subtitle_options (code,label_vi,label_en,sort_order,status)
            SELECT CONCAT('legacy_',LEFT(SHA1(TRIM(localization_versions)),12)),TRIM(localization_versions),TRIM(localization_versions),90,'active'
            FROM movies WHERE localization_versions IS NOT NULL AND TRIM(localization_versions)<>'' GROUP BY TRIM(localization_versions)");
        $this->db->query("UPDATE movie_plans SET recommendation_reason_detail=recommendation_reason WHERE (recommendation_reason_detail IS NULL OR TRIM(recommendation_reason_detail)='') AND recommendation_reason IS NOT NULL AND TRIM(recommendation_reason)<>''");
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_campaigns') === 0) {
            $this->db->query("INSERT INTO marketing_campaigns (campaign_code,name,objective,channel,budget,start_date,end_date,status,created_at) VALUES
                ('MKT-AUTUMN','Mùa phim cuối năm','Tăng nhận diện và lượng vé đặt trực tuyến','Facebook, Website',120000000,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 45 DAY),'planned',NOW()),
                ('MKT-MEMBER','Aurora Member Week','Tăng tỷ lệ khách hàng quay lại','Email, Push',45000000,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 14 DAY),'running',NOW())");
        }
        if ((int)$this->scalar('SELECT COUNT(*) FROM marketing_promotions') === 0) {
            $this->db->query("INSERT INTO marketing_promotions (promotion_code,name,discount_type,discount_value,start_date,end_date,approval_status,status,created_at) VALUES
                ('CTKM-WEEKEND','Cuối tuần rực rỡ','percent',10,CURDATE(),DATE_ADD(CURDATE(), INTERVAL 30 DAY),'pending_approval','inactive',NOW())");
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
        if ($resource === 'movies') return $this->movieCatalog();
        if ($resource === 'movie-plans') return $this->moviePlans();
        if ($resource === 'plan-approvals') return $this->planApprovals();
        if ($resource === 'campaigns') return $this->campaigns();
        if ($resource === 'promotions') return $this->promotions();
        if ($resource === 'contents') return $this->websiteContents();
        if ($resource === 'content-media') return $this->contentMedia();

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
            'promotions' => array('table'=>'marketing_promotions','code'=>'promotion_code','required'=>'name','fields'=>array('promotion_code','name','discount_type','discount_value','start_date','end_date','approval_status','status')),
            'vouchers' => array('table'=>'marketing_vouchers','code'=>'voucher_code','required'=>'name','fields'=>array('voucher_code','name','discount_type','discount_value','quantity','start_date','end_date','status')),
            'notifications' => array('table'=>'marketing_notifications','code'=>'','required'=>'title','fields'=>array('title','channel','audience','message','scheduled_at','status')),
            'segments' => array('table'=>'marketing_customer_segments','code'=>'','required'=>'name','fields'=>array('name','description','criteria_json','estimated_size','status'))
        );
    }

    private function campaigns()
    {
        global $requestMethod;
        $user = requireAdmin();
        $actorId = (int)$user['id'];
        if ($requestMethod === 'GET') {
            $where = array('1=1');
            $status = isset($_GET['status']) ? trim((string)$_GET['status']) : 'all';
            $allowed = array('draft','planned','running','paused','completed');
            if (in_array($status,$allowed,true)) $where[] = "c.status='".$this->db->real_escape_string($status)."'";
            if (!empty($_GET['q'])) {
                $q=$this->db->real_escape_string(trim((string)$_GET['q']));
                $where[]="(c.campaign_code LIKE '%{$q}%' OR c.name LIKE '%{$q}%' OR c.objective LIKE '%{$q}%' OR m.title LIKE '%{$q}%')";
            }
            $rows=$this->rows("SELECT c.*,m.title movie_title,m.poster_url movie_poster,u.full_name owner_name,
                CASE WHEN c.impressions>0 THEN ROUND(c.clicks*100/c.impressions,2) ELSE 0 END ctr,
                CASE WHEN c.clicks>0 THEN ROUND(c.conversions*100/c.clicks,2) ELSE 0 END conversion_rate
                FROM marketing_campaigns c LEFT JOIN movies m ON m.id=c.movie_id LEFT JOIN users u ON u.id=c.owner_id
                WHERE ".implode(' AND ',$where)." ORDER BY FIELD(c.status,'running','planned','paused','draft','completed'),c.start_date DESC,c.id DESC");
            $summary=array(
                'total'=>(int)$this->scalar('SELECT COUNT(*) FROM marketing_campaigns'),
                'running'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='running'"),
                'planned'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='planned'"),
                'draft'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='draft'"),
                'paused'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='paused'"),
                'completed'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='completed'"),
                'budget'=>(float)$this->scalar('SELECT COALESCE(SUM(budget),0) FROM marketing_campaigns'),
                'spent'=>(float)$this->scalar('SELECT COALESCE(SUM(spent_budget),0) FROM marketing_campaigns'),
                'reach'=>(int)$this->scalar('SELECT COALESCE(SUM(actual_reach),0) FROM marketing_campaigns')
            );
            $movies=$this->rows("SELECT id,title,movie_code,poster_url,status FROM movies WHERE status IN ('now_showing','coming_soon','NOW_SHOWING','COMING_SOON','special_showing') ORDER BY release_date DESC,title");
            jsonResponse(array('success'=>true,'data'=>$rows,'meta'=>array('summary'=>$summary,'movies'=>$movies,'source'=>'aurora_db')));
        }
        if ($requestMethod === 'DELETE') {
            $id=isset($_GET['id'])?(int)$_GET['id']:0;
            $row=$this->rows("SELECT id,name,status,owner_id FROM marketing_campaigns WHERE id={$id} LIMIT 1");
            if (!$row) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy chiến dịch.'),404);
            if ($row[0]['status']!=='draft') jsonResponse(array('success'=>false,'message'=>'Chỉ được xóa chiến dịch đang ở trạng thái Bản nháp.'),422);
            if (!$this->db->query("DELETE FROM marketing_campaigns WHERE id={$id} LIMIT 1")) jsonResponse(array('success'=>false,'message'=>'Không thể xóa chiến dịch: '.$this->db->error),500);
            writeTmsAuditLog($this->db,'MARKETING_CAMPAIGN_DELETED','Đã xóa bản nháp chiến dịch '.$row[0]['name'].'.',array('user_id'=>$actorId,'username'=>$user['username'],'role'=>$user['role'],'module'=>'marketing','entity_type'=>'marketing_campaign','entity_id'=>$id,'severity'=>'warning','status_code'=>200));
            jsonResponse(array('success'=>true,'message'=>'Đã xóa bản nháp chiến dịch khỏi aurora_db.'));
        }
        if ($requestMethod !== 'POST' && $requestMethod !== 'PUT') jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $input=requestJson();$id=isset($input['id'])?(int)$input['id']:0;
        $name=isset($input['name'])?trim((string)$input['name']):'';
        $code=isset($input['campaign_code'])?strtoupper(trim((string)$input['campaign_code'])):'';
        $objective=isset($input['objective'])?trim((string)$input['objective']):'';
        $description=isset($input['description'])?trim((string)$input['description']):'';
        $channel=isset($input['channel'])?trim((string)$input['channel']):'';
        $audience=isset($input['target_audience'])?trim((string)$input['target_audience']):'';
        $movieId=isset($input['movie_id'])?(int)$input['movie_id']:0;
        $budget=isset($input['budget'])?max(0,(float)$input['budget']):0;
        $spent=isset($input['spent_budget'])?max(0,(float)$input['spent_budget']):0;
        $expected=isset($input['expected_reach'])?max(0,(int)$input['expected_reach']):0;
        $actual=isset($input['actual_reach'])?max(0,(int)$input['actual_reach']):0;
        $impressions=isset($input['impressions'])?max(0,(int)$input['impressions']):0;
        $clicks=isset($input['clicks'])?max(0,(int)$input['clicks']):0;
        $conversions=isset($input['conversions'])?max(0,(int)$input['conversions']):0;
        $start=isset($input['start_date'])?trim((string)$input['start_date']):'';$end=isset($input['end_date'])?trim((string)$input['end_date']):'';
        $status=isset($input['status'])?trim((string)$input['status']):'draft';$statuses=array('draft','planned','running','paused','completed');
        if ($name===''||strlen($name)>180) jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập tên chiến dịch hợp lệ.'),422);
        if ($code!==''&&!preg_match('/^[A-Z0-9_-]{3,40}$/',$code)) jsonResponse(array('success'=>false,'message'=>'Mã chiến dịch chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.'),422);
        if ($objective===''||$channel===''||$audience==='') jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập mục tiêu, kênh triển khai và đối tượng mục tiêu.'),422);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$start)||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$end)||$end<$start) jsonResponse(array('success'=>false,'message'=>'Thời gian chiến dịch không hợp lệ.'),422);
        if (!in_array($status,$statuses,true)) jsonResponse(array('success'=>false,'message'=>'Trạng thái chiến dịch không hợp lệ.'),422);
        if ($spent>$budget) jsonResponse(array('success'=>false,'message'=>'Chi phí thực tế không được vượt ngân sách chiến dịch.'),422);
        if ($clicks>$impressions) jsonResponse(array('success'=>false,'message'=>'Lượt nhấp không được lớn hơn lượt hiển thị.'),422);
        if ($conversions>$clicks) jsonResponse(array('success'=>false,'message'=>'Lượt chuyển đổi không được lớn hơn lượt nhấp.'),422);
        if ($movieId>0&&(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE id={$movieId}")!==1) jsonResponse(array('success'=>false,'message'=>'Phim được chọn không tồn tại trong aurora_db.'),422);
        if ($code==='') $code='MKT-'.date('Ym').'-'.strtoupper(substr(sha1(uniqid((string)mt_rand(),true)),0,6));
        $fields=array('campaign_code'=>$code,'name'=>$name,'objective'=>$objective,'description'=>$description,'channel'=>$channel,'target_audience'=>$audience,'movie_id'=>$movieId>0?$movieId:null,'budget'=>$budget,'spent_budget'=>$spent,'expected_reach'=>$expected,'actual_reach'=>$actual,'impressions'=>$impressions,'clicks'=>$clicks,'conversions'=>$conversions,'start_date'=>$start,'end_date'=>$end,'status'=>$status);
        $sets=array();foreach($fields as $key=>$value)$sets[]="`{$key}`=".($value===null?'NULL':"'".$this->db->real_escape_string((string)$value)."'");
        if ($id>0) {
            if ((int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE id={$id}")!==1) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy chiến dịch cần cập nhật.'),404);
            $sql="UPDATE marketing_campaigns SET ".implode(',',$sets).",updated_at=NOW() WHERE id={$id}";
        } else $sql="INSERT INTO marketing_campaigns SET ".implode(',',$sets).",owner_id={$actorId},created_at=NOW(),updated_at=NOW()";
        if (!$this->db->query($sql)) {
            if ((int)$this->db->errno===1062) jsonResponse(array('success'=>false,'message'=>'Mã chiến dịch đã tồn tại. Vui lòng chọn mã khác.'),422);
            jsonResponse(array('success'=>false,'message'=>'Không thể lưu chiến dịch vào aurora_db: '.$this->db->error),500);
        }
        $savedId=$id>0?$id:(int)$this->db->insert_id;
        writeTmsAuditLog($this->db,$id>0?'MARKETING_CAMPAIGN_UPDATED':'MARKETING_CAMPAIGN_CREATED',($id>0?'Cập nhật':'Tạo').' chiến dịch '.$name.'.',array('user_id'=>$actorId,'username'=>$user['username'],'role'=>$user['role'],'module'=>'marketing','entity_type'=>'marketing_campaign','entity_id'=>$savedId,'severity'=>'success','status_code'=>200,'metadata'=>array('status'=>$status,'budget'=>$budget)));
        jsonResponse(array('success'=>true,'message'=>$id>0?'Đã cập nhật chiến dịch trong aurora_db.':'Đã tạo chiến dịch mới trong aurora_db.','data'=>array('id'=>$savedId)), $id>0?200:201);
    }

    private function logPromotionHistory($promotionId, $action, $from, $to, $user, $note)
    {
        $actorId=(int)$user['id'];
        $actorName=$this->db->real_escape_string((string)$user['full_name']);
        $actorRole=$this->db->real_escape_string(AdminController::normalizeRole($user['role']));
        $actionEsc=$this->db->real_escape_string($action);
        $fromSql=$from===null?'NULL':"'".$this->db->real_escape_string($from)."'";
        $toEsc=$this->db->real_escape_string($to);
        $noteEsc=$this->db->real_escape_string((string)$note);
        if(!$this->db->query("INSERT INTO marketing_promotion_history (promotion_id,action_name,from_status,to_status,actor_id,actor_name,actor_role,note,created_at) VALUES ({$promotionId},'{$actionEsc}',{$fromSql},'{$toEsc}',{$actorId},'{$actorName}','{$actorRole}','{$noteEsc}',NOW())")) {
            throw new Exception('Không thể ghi lịch sử chương trình khuyến mãi: '.$this->db->error);
        }
    }

    private function promotions()
    {
        global $requestMethod;
        $user=requireAdmin();
        $role=AdminController::normalizeRole($user['role']);
        $actorId=(int)$user['id'];
        $isAdmin=$role==='super_admin';
        $scope=$isAdmin?'1=1':"(p.created_by={$actorId} OR EXISTS(SELECT 1 FROM promotion_department_assignments pa_scope WHERE pa_scope.promotion_id=p.id AND pa_scope.recipient_role='marketing_manager'))";

        if($requestMethod==='GET') {
            $where=array($scope);
            if(!empty($_GET['approval_status'])&&in_array($_GET['approval_status'],array('draft','pending_approval','approved','revision_requested'),true)) {
                $where[]="p.approval_status='".$this->db->real_escape_string($_GET['approval_status'])."'";
            }
            if(!empty($_GET['publication_status'])&&in_array($_GET['publication_status'],array('draft','published','paused','expired'),true)) {
                $where[]="p.publication_status='".$this->db->real_escape_string($_GET['publication_status'])."'";
            }
            if(!empty($_GET['q'])) {
                $q=$this->db->real_escape_string(trim((string)$_GET['q']));
                $where[]="(p.promotion_code LIKE '%{$q}%' OR p.name LIKE '%{$q}%' OR p.description LIKE '%{$q}%')";
            }
            $rows=$this->rows("SELECT p.*,creator.full_name creator_name,v.used_count voucher_used_count,v.status voucher_status,gift.name gift_product_name,gift.sku gift_product_sku,gift.unit gift_product_unit,gift.image_url gift_product_image,
                    COALESCE(deployment.theater_count,0) theater_count,
                    COALESCE(deployment.active_theater_count,0) active_theater_count,
                    COALESCE(deployment.pending_theater_count,0) pending_theater_count,
                    COALESCE(deployment.redemption_count,0) deployment_redemption_count,
                    COALESCE(assignment.assignment_count,0) assignment_count,COALESCE(assignment.completed_count,0) completed_assignment_count,
                    assignment.assignment_labels
                FROM marketing_promotions p
                LEFT JOIN users creator ON creator.id=p.created_by
                LEFT JOIN vouchers v ON v.id=p.voucher_id
                LEFT JOIN products gift ON gift.id=p.gift_product_id
                LEFT JOIN (
                    SELECT promotion_id,COUNT(*) theater_count,
                        SUM(CASE WHEN status='active' AND pos_enabled=1 THEN 1 ELSE 0 END) active_theater_count,
                        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending_theater_count,
                        SUM(redemption_count) redemption_count
                    FROM promotion_theater_deployments GROUP BY promotion_id
                ) deployment ON deployment.promotion_id=p.id
                LEFT JOIN (SELECT promotion_id,COUNT(*) assignment_count,SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) completed_count,GROUP_CONCAT(DISTINCT recipient_label ORDER BY recipient_label SEPARATOR ', ') assignment_labels FROM promotion_department_assignments GROUP BY promotion_id) assignment ON assignment.promotion_id=p.id
                WHERE ".implode(' AND ',$where)."
                ORDER BY FIELD(p.approval_status,'pending_approval','revision_requested','draft','approved'),p.updated_at DESC,p.id DESC");
            $summaryWhere=$scope;
            $summary=array(
                'total'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere}"),
                'draft'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.approval_status='draft'"),
                'pending'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.approval_status='pending_approval'"),
                'approved'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.approval_status='approved'"),
                'revision'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.approval_status='revision_requested'"),
                'published'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.publication_status='published'"),
                'unpublished'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.publication_status='draft'"),
                'paused'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE {$summaryWhere} AND p.publication_status='paused'"),
                'active_theaters'=>(int)$this->scalar("SELECT COUNT(*) FROM promotion_theater_deployments d INNER JOIN marketing_promotions p ON p.id=d.promotion_id WHERE {$summaryWhere} AND d.status='active' AND d.pos_enabled=1"),
                'redemptions'=>(int)$this->scalar("SELECT COALESCE(SUM(d.redemption_count),0) FROM promotion_theater_deployments d INNER JOIN marketing_promotions p ON p.id=d.promotion_id WHERE {$summaryWhere}")
            );
            $history=array();
            if(!empty($_GET['id'])) {
                $id=(int)$_GET['id'];
                $allowed=(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions p WHERE p.id={$id} AND {$scope}");
                if(!$allowed) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy kế hoạch khuyến mãi.'),404);
                $history=$this->rows("SELECT action_name,from_status,to_status,actor_name,actor_role,note,created_at FROM marketing_promotion_history WHERE promotion_id={$id} ORDER BY id DESC");
            }
            $giftProducts=$this->rows("SELECT id,sku,name,category,unit,image_url,status FROM products WHERE status='active' ORDER BY category,name");
            $theaters=$this->rows("SELECT id,name FROM theaters ORDER BY name");
            $assignments=array();if(!empty($_GET['id'])){$id=(int)$_GET['id'];$assignments=$this->rows("SELECT id,recipient_role,recipient_label,theater_id,responsibility,due_date,status,assigned_by_name,assigned_at,accepted_at,completed_at FROM promotion_department_assignments WHERE promotion_id={$id} ORDER BY id");}
            jsonResponse(array('success'=>true,'data'=>$rows,'meta'=>array('summary'=>$summary,'history'=>$history,'assignments'=>$assignments,'theaters'=>$theaters,'role'=>$role,'source'=>'aurora_db','gift_products'=>$giftProducts)));
        }

        $input=requestJson();
        $operation=isset($input['operation'])?trim((string)$input['operation']):(isset($_GET['operation'])?trim((string)$_GET['operation']):'save');
        $id=isset($input['id'])?(int)$input['id']:(isset($_GET['id'])?(int)$_GET['id']:0);

        if($operation==='admin_save') {
            if(!$isAdmin)jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được lập và điều phối chương trình.'),403);
            $name=isset($input['name'])?trim((string)$input['name']):'';$code=isset($input['promotion_code'])?strtoupper(trim((string)$input['promotion_code'])):'';
            $description=isset($input['description'])?trim((string)$input['description']):'';$terms=isset($input['terms_text'])?trim((string)$input['terms_text']):'';$objective=isset($input['admin_objective'])?trim((string)$input['admin_objective']):'';$coordination=isset($input['coordination_note'])?trim((string)$input['coordination_note']):'';
            $start=isset($input['start_date'])?trim((string)$input['start_date']):'';$end=isset($input['end_date'])?trim((string)$input['end_date']):'';$benefit=isset($input['benefit_type'])?trim((string)$input['benefit_type']):'percent';$discount=isset($input['discount_value'])?max(0,(float)$input['discount_value']):0;
            if($name===''||strlen($name)>180||$description===''||$terms===''||$objective==='')jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập đầy đủ tên, mô tả, mục tiêu và điều kiện chương trình.'),422);
            if($code==='')$code='CTKM-ADMIN-'.date('ymd').'-'.strtoupper(substr(sha1(uniqid((string)mt_rand(),true)),0,4));if(!preg_match('/^[A-Z0-9_-]{3,40}$/',$code))jsonResponse(array('success'=>false,'message'=>'Mã CTKM không hợp lệ.'),422);
            if(!in_array($benefit,array('percent','amount','other'),true)||($benefit!=='other'&&$discount<=0))jsonResponse(array('success'=>false,'message'=>'Quyền lợi chương trình không hợp lệ.'),422);
            if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$start)||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$end)||$end<$start)jsonResponse(array('success'=>false,'message'=>'Thời gian triển khai không hợp lệ.'),422);
            $assignments=isset($input['assignments'])&&is_array($input['assignments'])?$input['assignments']:array();if(!$assignments)jsonResponse(array('success'=>false,'message'=>'Hãy chọn ít nhất một bộ phận thực hiện.'),422);
            $allowedRoles=array('marketing_manager'=>'Bộ phận Marketing','cinema_admin'=>'Admin Rạp','supervisor'=>'Giám sát vận hành','accounting'=>'Kế toán','hr_manager'=>'Quản lý nhân sự');
            $actorName=$this->db->real_escape_string($user['full_name']);$fields=array('promotion_code'=>$code,'name'=>$name,'description'=>$description,'details'=>isset($input['details'])?trim((string)$input['details']):'','terms_text'=>$terms,'category'=>isset($input['category'])?(string)$input['category']:'ticket','audience'=>isset($input['audience'])?(string)$input['audience']:'all','badge_text'=>isset($input['badge_text'])?(string)$input['badge_text']:'ƯU ĐÃI AURORA','theme_color'=>isset($input['theme_color'])?(string)$input['theme_color']:'#D99A1B','benefit_type'=>$benefit,'discount_type'=>$benefit,'benefit_title'=>isset($input['benefit_title'])?(string)$input['benefit_title']:$name,'discount_value'=>$discount,'min_order_amount'=>isset($input['min_order_amount'])?max(0,(float)$input['min_order_amount']):0,'max_discount'=>isset($input['max_discount'])?max(0,(float)$input['max_discount']):0,'start_date'=>$start,'end_date'=>$end,'usage_limit'=>isset($input['usage_limit'])?max(0,(int)$input['usage_limit']):0,'source_type'=>'admin_plan','admin_objective'=>$objective,'coordination_note'=>$coordination);
            $sets=array();foreach($fields as $key=>$value)$sets[]="`{$key}`='".$this->db->real_escape_string((string)$value)."'";
            $this->db->query('START TRANSACTION');try{
                if($id>0){if(!(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions WHERE id={$id}"))throw new Exception('Chương trình không tồn tại.');if(!$this->db->query("UPDATE marketing_promotions SET ".implode(',',$sets).",approval_status='approved',reviewed_by='{$actorName}',reviewed_at=NOW(),updated_at=NOW() WHERE id={$id}"))throw new Exception($this->db->error);$savedId=$id;}else{if(!$this->db->query("INSERT INTO marketing_promotions SET ".implode(',',$sets).",approval_status='approved',publication_status='draft',status='inactive',created_by={$actorId},reviewed_by='{$actorName}',reviewed_at=NOW(),created_at=NOW(),updated_at=NOW()"))throw new Exception($this->db->error);$savedId=(int)$this->db->insert_id;}
                if(!$this->db->query("DELETE FROM promotion_department_assignments WHERE promotion_id={$savedId}"))throw new Exception($this->db->error);
                foreach($assignments as $assignment){$recipient=isset($assignment['recipient_role'])?(string)$assignment['recipient_role']:'';if(!isset($allowedRoles[$recipient]))throw new Exception('Bộ phận nhận việc không hợp lệ.');$theater=isset($assignment['theater_id'])?(int)$assignment['theater_id']:0;$responsibility=isset($assignment['responsibility'])?trim((string)$assignment['responsibility']):'';$due=isset($assignment['due_date'])&&preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)$assignment['due_date'])?(string)$assignment['due_date']:$start;if($responsibility==='')throw new Exception('Nội dung phân công không được để trống.');$label=$allowedRoles[$recipient];if($recipient==='cinema_admin'&&$theater>0){$theaterName=(string)$this->scalar("SELECT name FROM theaters WHERE id={$theater} LIMIT 1");if($theaterName==='')throw new Exception('Rạp nhận việc không tồn tại.');$label.=' · '.$theaterName;}$r=$this->db->real_escape_string($recipient);$le=$this->db->real_escape_string($label);$re=$this->db->real_escape_string($responsibility);$theaterSql=$theater>0?(string)$theater:'NULL';if(!$this->db->query("INSERT INTO promotion_department_assignments(promotion_id,recipient_role,recipient_label,theater_id,responsibility,due_date,status,assigned_by,assigned_by_name,assigned_at) VALUES({$savedId},'{$r}','{$le}',{$theaterSql},'{$re}','{$due}','assigned',{$actorId},'{$actorName}',NOW())"))throw new Exception($this->db->error);}
                $this->logPromotionHistory($savedId,$id>0?'admin_updated':'admin_created',null,'approved',$user,'Admin Tổng lập kế hoạch và phân công thực hiện.');$this->db->commit();
            }catch(Exception $error){$this->db->rollback();$message=(int)$this->db->errno===1062?'Mã chương trình đã tồn tại.':$error->getMessage();jsonResponse(array('success'=>false,'message'=>'Không thể lưu kế hoạch: '.$message),422);}jsonResponse(array('success'=>true,'message'=>$id>0?'Đã cập nhật kế hoạch và phân công.':'Đã tạo kế hoạch CTKM và gửi đến các bộ phận.','data'=>array('id'=>$savedId)),201);
        }

        if($operation==='admin_delete') {
            if(!$isAdmin)jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được xóa chương trình.'),403);$found=$this->rows("SELECT p.id,p.name,p.voucher_id,COALESCE(v.used_count,0) used_count FROM marketing_promotions p LEFT JOIN vouchers v ON v.id=p.voucher_id WHERE p.id={$id} LIMIT 1");if(!$found)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy chương trình.'),404);if((int)$found[0]['used_count']>0)jsonResponse(array('success'=>false,'message'=>'Chương trình đã phát sinh lượt sử dụng nên không thể xóa; hãy tạm dừng để bảo toàn lịch sử.'),409);$voucherId=(int)$found[0]['voucher_id'];$this->db->query('START TRANSACTION');try{if(!$this->db->query("DELETE FROM promotion_department_assignments WHERE promotion_id={$id}"))throw new Exception($this->db->error);if(!$this->db->query("DELETE FROM promotion_theater_deployments WHERE promotion_id={$id}"))throw new Exception($this->db->error);if(!$this->db->query("DELETE FROM marketing_promotion_history WHERE promotion_id={$id}"))throw new Exception($this->db->error);if(!$this->db->query("DELETE FROM marketing_promotions WHERE id={$id}"))throw new Exception($this->db->error);if($voucherId>0&&!$this->db->query("DELETE FROM vouchers WHERE id={$voucherId}"))throw new Exception($this->db->error);$this->db->commit();}catch(Exception $error){$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể xóa chương trình: '.$error->getMessage()),500);}jsonResponse(array('success'=>true,'message'=>'Đã xóa chương trình và dữ liệu phân công liên quan khỏi aurora_db.'));
        }

        if($requestMethod==='DELETE') {
            if($isAdmin) jsonResponse(array('success'=>false,'message'=>'Admin Tổng không xóa hồ sơ Marketing trong quy trình phê duyệt.'),403);
            $row=$this->rows("SELECT id,name,approval_status,created_by FROM marketing_promotions WHERE id={$id} LIMIT 1");
            if(!$row||(int)$row[0]['created_by']!==$actorId) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy kế hoạch của bạn.'),404);
            if(!in_array($row[0]['approval_status'],array('draft','revision_requested'),true)) jsonResponse(array('success'=>false,'message'=>'Chỉ được xóa hồ sơ nháp hoặc đang yêu cầu chỉnh sửa.'),409);
            if(!$this->db->query("DELETE FROM marketing_promotions WHERE id={$id} LIMIT 1")) jsonResponse(array('success'=>false,'message'=>'Không thể xóa hồ sơ: '.$this->db->error),500);
            jsonResponse(array('success'=>true,'message'=>'Đã xóa kế hoạch khuyến mãi khỏi aurora_db.'));
        }
        if(!in_array($requestMethod,array('POST','PUT'),true)) jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);

        if(in_array($operation,array('submit','withdraw'),true)) {
            if($isAdmin) jsonResponse(array('success'=>false,'message'=>'Thao tác này dành cho Marketing.'),403);
            $rows=$this->rows("SELECT id,name,approval_status,created_by FROM marketing_promotions WHERE id={$id} LIMIT 1");
            if(!$rows||(int)$rows[0]['created_by']!==$actorId) jsonResponse(array('success'=>false,'message'=>'Hồ sơ không tồn tại hoặc không thuộc quyền của bạn.'),404);
            $from=$rows[0]['approval_status'];
            if($operation==='submit') {
                if(!in_array($from,array('draft','revision_requested'),true)) jsonResponse(array('success'=>false,'message'=>'Hồ sơ hiện không thể gửi duyệt.'),409);
                $actor=$this->db->real_escape_string($user['full_name']);
                $this->db->query('START TRANSACTION');
                try {
                    if(!$this->db->query("UPDATE marketing_promotions SET approval_status='pending_approval',submitted_by='{$actor}',submitted_at=NOW(),review_note=NULL,updated_at=NOW() WHERE id={$id}")) throw new Exception($this->db->error);
                    $this->logPromotionHistory($id,'submitted',$from,'pending_approval',$user,'Gửi kế hoạch đến Admin Tổng phê duyệt.');
                    $this->db->commit();
                } catch(Exception $e) {$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể gửi duyệt: '.$e->getMessage()),500);}
                jsonResponse(array('success'=>true,'message'=>'Đã gửi kế hoạch khuyến mãi đến Admin Tổng.'));
            }
            if($from!=='pending_approval') jsonResponse(array('success'=>false,'message'=>'Chỉ thu hồi được hồ sơ đang chờ duyệt.'),409);
            $this->db->query('START TRANSACTION');
            try {
                if(!$this->db->query("UPDATE marketing_promotions SET approval_status='draft',submitted_by=NULL,submitted_at=NULL,updated_at=NOW() WHERE id={$id}")) throw new Exception($this->db->error);
                $this->logPromotionHistory($id,'withdrawn',$from,'draft',$user,'Marketing thu hồi kế hoạch.');
                $this->db->commit();
            } catch(Exception $e) {$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể thu hồi: '.$e->getMessage()),500);}
            jsonResponse(array('success'=>true,'message'=>'Đã thu hồi kế hoạch về bản nháp.'));
        }

        if($operation==='review') {
            if(!$isAdmin) jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được phê duyệt kế hoạch khuyến mãi.'),403);
            $decision=isset($input['decision'])?trim((string)$input['decision']):'';
            $note=isset($input['note'])?trim((string)$input['note']):'';
            if(!in_array($decision,array('approved','revision_requested'),true)) jsonResponse(array('success'=>false,'message'=>'Quyết định phê duyệt không hợp lệ.'),422);
            if($decision==='revision_requested'&&$note==='') jsonResponse(array('success'=>false,'message'=>'Vui lòng ghi rõ nội dung Marketing cần chỉnh sửa.'),422);
            $rows=$this->rows("SELECT id,name,approval_status FROM marketing_promotions WHERE id={$id} LIMIT 1");
            if(!$rows) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy hồ sơ.'),404);
            if($rows[0]['approval_status']!=='pending_approval') jsonResponse(array('success'=>false,'message'=>'Hồ sơ không còn ở trạng thái chờ duyệt.'),409);
            $actor=$this->db->real_escape_string($user['full_name']);$noteEsc=$this->db->real_escape_string($note);
            if(!$this->db->query('START TRANSACTION')) jsonResponse(array('success'=>false,'message'=>'Không thể bắt đầu giao dịch phê duyệt trong aurora_db: '.$this->db->error),500);
            try {
                if(!$this->db->query("UPDATE marketing_promotions SET approval_status='{$decision}',reviewed_by='{$actor}',reviewed_at=NOW(),review_note='{$noteEsc}',updated_at=NOW() WHERE id={$id} AND approval_status='pending_approval'")) throw new Exception('database:'.$this->db->error);
                if($this->db->affected_rows!==1) {
                    $this->db->rollback();
                    jsonResponse(array('success'=>false,'message'=>'Hồ sơ vừa được xử lý ở một phiên khác. Vui lòng tải lại hàng đợi.'),409);
                }
                $this->logPromotionHistory($id,$decision==='approved'?'approved':'revision_requested','pending_approval',$decision,$user,$note);
                if(!$this->db->commit()) throw new Exception('commit:'.$this->db->error);
            } catch(Exception $e) {
                $this->db->rollback();
                $detail=$e->getMessage();
                if(strpos($detail,'database:')===0) $detail=substr($detail,9);
                else if(strpos($detail,'commit:')===0) $detail=substr($detail,7);
                jsonResponse(array('success'=>false,'message'=>'Không thể lưu quyết định và lịch sử trong aurora_db: '.$detail),500);
            }
            jsonResponse(array('success'=>true,'message'=>$decision==='approved'?'Đã phê duyệt. Marketing có thể phát hành chương trình.':'Đã gửi yêu cầu chỉnh sửa cho Marketing.'));
        }

        if(in_array($operation,array('publish','pause'),true)) {
            if($isAdmin) jsonResponse(array('success'=>false,'message'=>'Việc phát hành thuộc bộ phận Marketing sau khi được duyệt.'),403);
            $rows=$this->rows("SELECT * FROM marketing_promotions p WHERE p.id={$id} AND (p.created_by={$actorId} OR EXISTS(SELECT 1 FROM promotion_department_assignments pa WHERE pa.promotion_id=p.id AND pa.recipient_role='marketing_manager')) LIMIT 1");
            if(!$rows) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy chương trình của bạn.'),404);
            $p=$rows[0];
            if($p['approval_status']!=='approved') jsonResponse(array('success'=>false,'message'=>'Chỉ được tạo chương trình sau khi Admin Tổng phê duyệt kế hoạch.'),403);
            if($operation==='pause') {
                $this->db->query('START TRANSACTION');
                try {
                    if(!empty($p['voucher_id'])&&!$this->db->query("UPDATE vouchers SET status='inactive',updated_at=NOW() WHERE id=".(int)$p['voucher_id'])) throw new Exception($this->db->error);
                    if(!$this->db->query("UPDATE marketing_promotions SET publication_status='paused',status='inactive',updated_at=NOW() WHERE id={$id}")) throw new Exception($this->db->error);
                    if(!$this->db->query("UPDATE promotion_theater_deployments SET status='paused',pos_enabled=0,updated_at=NOW() WHERE promotion_id={$id}")) throw new Exception($this->db->error);
                    $this->logPromotionHistory($id,'paused','published','paused',$user,'Tạm dừng hiển thị trên Customer.');
                    $this->db->commit();
                } catch(Exception $e) {$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể tạm dừng: '.$e->getMessage()),500);}
                jsonResponse(array('success'=>true,'message'=>'Đã tạm dừng chương trình trên trang Customer.'));
            }
            $map=array('promotion_code'=>'code','name'=>'name','description'=>'short_description','details'=>'details','terms_text'=>'terms_text','category'=>'category','audience'=>'audience','badge_text'=>'badge_text','theme_color'=>'theme_color','image_url'=>'image_url','discount_type'=>'discount_type','benefit_type'=>'benefit_type','benefit_title'=>'benefit_title','benefit_description'=>'benefit_description','gift_product_id'=>'gift_product_id','gift_quantity'=>'gift_quantity','buy_quantity'=>'buy_quantity','get_quantity'=>'get_quantity','application_scope'=>'application_scope','redemption_instructions'=>'redemption_instructions','discount_value'=>'discount_value','min_order_amount'=>'min_order_amount','max_discount'=>'max_discount','usage_limit'=>'usage_limit','is_featured'=>'is_featured');
            $voucher=array();foreach($map as $source=>$target)$voucher[$target]=$p[$source];
            $voucher['starts_at']=$p['start_date'].' 00:00:00';$voucher['ends_at']=$p['end_date'].' 23:59:59';
            $columns=array();$values=array();$updates=array();foreach($voucher as $column=>$value){$columns[]="`{$column}`";$values[]="'".$this->db->real_escape_string((string)$value)."'";$updates[]="`{$column}`=VALUES(`{$column}`)";}
            $columns[]='status';$values[]="'active'";$updates[]="status='active'";$columns[]='source_promotion_id';$values[]=(string)$id;$updates[]='source_promotion_id=VALUES(source_promotion_id)';
            $this->db->query('START TRANSACTION');
            try {
                $sql="INSERT INTO vouchers (".implode(',',$columns).",created_at,updated_at) VALUES (".implode(',',$values).",NOW(),NOW()) ON DUPLICATE KEY UPDATE ".implode(',',$updates).",updated_at=NOW()";
                if(!$this->db->query($sql)) throw new Exception($this->db->error);
                $voucherId=(int)$this->scalar("SELECT id FROM vouchers WHERE code='".$this->db->real_escape_string($p['promotion_code'])."' LIMIT 1");
                $actor=$this->db->real_escape_string($user['full_name']);
                if(!$this->db->query("UPDATE marketing_promotions SET publication_status='published',status='active',voucher_id={$voucherId},published_by='{$actor}',published_at=NOW(),updated_at=NOW() WHERE id={$id}")) throw new Exception($this->db->error);
                if(!$this->db->query("INSERT INTO promotion_theater_deployments (promotion_id,voucher_id,theater_id,status,pos_button_color,created_at,updated_at)
                    SELECT {$id},{$voucherId},t.id,'pending','".$this->db->real_escape_string($p['theme_color'])."',NOW(),NOW() FROM theaters t
                    ON DUPLICATE KEY UPDATE voucher_id=VALUES(voucher_id),updated_at=NOW()")) throw new Exception($this->db->error);
                $this->logPromotionHistory($id,'published',$p['publication_status'],'published',$user,'Phát hành chương trình lên Customer Website.');
                $this->db->commit();
            } catch(Exception $e) {$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể phát hành: '.$e->getMessage()),500);}
            jsonResponse(array('success'=>true,'message'=>'Đã tạo chương trình và hiển thị trên trang Customer.','data'=>array('voucher_id'=>$voucherId)));
        }

        if($operation!=='save') jsonResponse(array('success'=>false,'message'=>'Thao tác khuyến mãi không hợp lệ.'),422);
        if($isAdmin) jsonResponse(array('success'=>false,'message'=>'Admin Tổng chỉ xem và phê duyệt; Marketing là đơn vị lập kế hoạch.'),403);
        $existing=null;
        if($id>0){$found=$this->rows("SELECT * FROM marketing_promotions WHERE id={$id} AND created_by={$actorId} LIMIT 1");if(!$found)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy hồ sơ của bạn.'),404);$existing=$found[0];if(!in_array($existing['approval_status'],array('draft','revision_requested'),true))jsonResponse(array('success'=>false,'message'=>'Chỉ hồ sơ nháp hoặc bị yêu cầu sửa mới được cập nhật.'),409);}
        $name=isset($input['name'])?trim((string)$input['name']):'';$code=isset($input['promotion_code'])?strtoupper(trim((string)$input['promotion_code'])):'';
        $description=isset($input['description'])?trim((string)$input['description']):'';$details=isset($input['details'])?trim((string)$input['details']):'';$terms=isset($input['terms_text'])?trim((string)$input['terms_text']):'';
        $benefitType=isset($input['benefit_type'])?trim((string)$input['benefit_type']):(isset($input['discount_type'])?trim((string)$input['discount_type']):'percent');
        $allowedBenefitTypes=array('percent','amount','gift_product','buy_x_get_y','free_ticket','membership_bonus','other');
        if(!in_array($benefitType,$allowedBenefitTypes,true))jsonResponse(array('success'=>false,'message'=>'Loại quyền lợi chương trình không hợp lệ.'),422);
        $discountType=$benefitType;$discountValue=isset($input['discount_value'])?max(0,(float)$input['discount_value']):0;
        $benefitTitle=isset($input['benefit_title'])?trim((string)$input['benefit_title']):'';$benefitDescription=isset($input['benefit_description'])?trim((string)$input['benefit_description']):'';
        $giftProductId=isset($input['gift_product_id'])?(int)$input['gift_product_id']:0;$giftQuantity=isset($input['gift_quantity'])?max(0,(int)$input['gift_quantity']):0;$buyQuantity=isset($input['buy_quantity'])?max(0,(int)$input['buy_quantity']):0;$getQuantity=isset($input['get_quantity'])?max(0,(int)$input['get_quantity']):0;
        $applicationScope=isset($input['application_scope'])?trim((string)$input['application_scope']):'order';if(!in_array($applicationScope,array('order','ticket','combo','product','membership'),true))$applicationScope='order';
        $redemptionInstructions=isset($input['redemption_instructions'])?trim((string)$input['redemption_instructions']):'';
        $start=isset($input['start_date'])?trim((string)$input['start_date']):'';$end=isset($input['end_date'])?trim((string)$input['end_date']):'';
        if($name===''||strlen($name)>150)jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập tên chương trình hợp lệ (tối đa 150 ký tự).'),422);
        if($code==='' )$code='CTKM-'.date('Ym').'-'.strtoupper(substr(sha1(uniqid((string)mt_rand(),true)),0,5));
        if(!preg_match('/^[A-Z0-9_-]{3,40}$/',$code))jsonResponse(array('success'=>false,'message'=>'Mã CTKM chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.'),422);
        if(in_array($benefitType,array('percent','amount'),true)&&($discountValue<=0||($benefitType==='percent'&&$discountValue>100)))jsonResponse(array('success'=>false,'message'=>'Giá trị giảm giá không hợp lệ.'),422);
        if($benefitTitle===''||strlen($benefitTitle)>150)jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập tên quyền lợi rõ ràng (tối đa 150 ký tự).'),422);
        if(in_array($benefitType,array('gift_product','buy_x_get_y'),true)){
            if($giftProductId<1||(int)$this->scalar("SELECT COUNT(*) FROM products WHERE id={$giftProductId} AND status='active'")!==1)jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn sản phẩm hoặc combo quà tặng đang hoạt động.'),422);
            if($giftQuantity<1)$giftQuantity=1;if($benefitType==='buy_x_get_y'&&($buyQuantity<1||$getQuantity<1))jsonResponse(array('success'=>false,'message'=>'Chương trình mua X tặng Y cần số lượng mua và số lượng tặng lớn hơn 0.'),422);
        }else{$giftProductId=0;$giftQuantity=0;$buyQuantity=0;$getQuantity=0;}
        if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$start)||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$end)||$end<$start)jsonResponse(array('success'=>false,'message'=>'Thời gian áp dụng không hợp lệ.'),422);
        if($description===''||$terms==='')jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập mô tả và điều kiện áp dụng.'),422);
        $allowedCategories=array('ticket','combo','member','event');$category=isset($input['category'])&&in_array($input['category'],$allowedCategories,true)?$input['category']:'ticket';
        $allowedAudiences=array('all','member','silver','gold','platinum');$audience=isset($input['audience'])&&in_array($input['audience'],$allowedAudiences,true)?$input['audience']:'all';
        $fields=array('promotion_code'=>$code,'name'=>$name,'description'=>$description,'details'=>$details,'terms_text'=>$terms,'category'=>$category,'audience'=>$audience,'badge_text'=>isset($input['badge_text'])?trim((string)$input['badge_text']):'','theme_color'=>isset($input['theme_color'])?trim((string)$input['theme_color']):'#D99A1B','image_url'=>isset($input['image_url'])?trim((string)$input['image_url']):'','discount_type'=>$discountType,'benefit_type'=>$benefitType,'benefit_title'=>$benefitTitle,'benefit_description'=>$benefitDescription,'gift_product_id'=>$giftProductId>0?$giftProductId:null,'gift_quantity'=>$giftQuantity,'buy_quantity'=>$buyQuantity,'get_quantity'=>$getQuantity,'application_scope'=>$applicationScope,'redemption_instructions'=>$redemptionInstructions,'discount_value'=>$discountValue,'min_order_amount'=>isset($input['min_order_amount'])?max(0,(float)$input['min_order_amount']):0,'max_discount'=>in_array($benefitType,array('percent','amount'),true)&&isset($input['max_discount'])?max(0,(float)$input['max_discount']):0,'start_date'=>$start,'end_date'=>$end,'usage_limit'=>isset($input['usage_limit'])?max(0,(int)$input['usage_limit']):0,'is_featured'=>!empty($input['is_featured'])?1:0);
        $sets=array();foreach($fields as $key=>$value)$sets[]="`{$key}`='".$this->db->real_escape_string((string)$value)."'";
        $this->db->query('START TRANSACTION');
        try {
            if($id>0){if(!$this->db->query("UPDATE marketing_promotions SET ".implode(',',$sets).",approval_status='draft',review_note=NULL,updated_at=NOW() WHERE id={$id}"))throw new Exception($this->db->error);$savedId=$id;$this->logPromotionHistory($id,'updated',$existing['approval_status'],'draft',$user,'Marketing cập nhật kế hoạch.');}
            else {if(!$this->db->query("INSERT INTO marketing_promotions SET ".implode(',',$sets).",approval_status='draft',publication_status='draft',status='inactive',created_by={$actorId},created_at=NOW(),updated_at=NOW()"))throw new Exception($this->db->error);$savedId=(int)$this->db->insert_id;$this->logPromotionHistory($savedId,'created',null,'draft',$user,'Tạo bản nháp kế hoạch khuyến mãi.');}
            if(!empty($fields['image_url'])){$imageEsc=$this->db->real_escape_string($fields['image_url']);$this->db->query("UPDATE promotion_media_assets SET promotion_id={$savedId} WHERE public_url='{$imageEsc}' AND uploaded_by={$actorId}");}
            $this->db->commit();
        } catch(Exception $e){$this->db->rollback();$message=(int)$this->db->errno===1062?'Mã CTKM đã tồn tại.':$e->getMessage();jsonResponse(array('success'=>false,'message'=>'Không thể lưu kế hoạch: '.$message),422);}
        jsonResponse(array('success'=>true,'message'=>$id>0?'Đã cập nhật bản nháp trong aurora_db.':'Đã tạo bản nháp kế hoạch khuyến mãi.','data'=>array('id'=>$savedId)),$id>0?200:201);
    }

    private function websiteContents()
    {
        global $requestMethod;
        $user=requireAdmin();
        $actorId=(int)$user['id'];
        if($requestMethod==='GET'){
            $where=array('1=1');
            if(!empty($_GET['placement'])){$placement=$this->db->real_escape_string(trim((string)$_GET['placement']));$where[]="placement_key='{$placement}'";}
            if(!empty($_GET['q'])){$q=$this->db->real_escape_string(trim((string)$_GET['q']));$where[]="(title LIKE '%{$q}%' OR summary LIKE '%{$q}%' OR body_text LIKE '%{$q}%')";}
            $rows=$this->rows("SELECT * FROM marketing_contents WHERE ".implode(' AND ',$where)." ORDER BY FIELD(placement_key,'home_hero','home_announcement','home_offer','home_ad_top','home_featured','home_ad_middle','home_ad_bottom'),sort_order,id");
            $summary=array('total'=>0,'published'=>0,'scheduled'=>0,'draft'=>0,'visible_now'=>0);
            foreach($rows as $row){$summary['total']++;if(isset($summary[$row['status']]))$summary[$row['status']]++;if($row['status']==='published'&&(int)$row['is_visible']===1&&(empty($row['starts_at'])||strtotime($row['starts_at'])<=time())&&(empty($row['ends_at'])||strtotime($row['ends_at'])>=time()))$summary['visible_now']++;}
            jsonResponse(array('success'=>true,'data'=>$rows,'meta'=>array('summary'=>$summary,'placements'=>array(
                array('key'=>'home_hero','label'=>'Hero trang chủ','description'=>'Banner lớn đầu trang Customer','max'=>5),
                array('key'=>'home_announcement','label'=>'Thông báo trang chủ','description'=>'Thông điệp ngắn dưới khu vực nổi bật','max'=>3),
                array('key'=>'home_offer','label'=>'Thẻ ưu đãi','description'=>'Ưu đãi nổi bật cạnh Hero','max'=>1),
                array('key'=>'home_featured','label'=>'Khối phim nổi bật','description'=>'Tiêu đề và mô tả cho danh mục phim','max'=>1),
                array('key'=>'home_ad_top','label'=>'Quảng cáo đầu trang','description'=>'Banner quảng cáo dưới khu vực Hero','max'=>8),
                array('key'=>'home_ad_middle','label'=>'Quảng cáo giữa trang','description'=>'Banner quảng cáo giữa đặt vé nhanh và danh mục phim','max'=>8),
                array('key'=>'home_ad_bottom','label'=>'Quảng cáo cuối trang','description'=>'Banner quảng cáo trước khu vực tiện ích','max'=>8)
            ))));
        }
        $input=requestJson();
        $operation=isset($_GET['operation'])?trim((string)$_GET['operation']):'';
        if($requestMethod==='PUT'&&$operation==='reorder'){
            $ids=isset($input['ids'])&&is_array($input['ids'])?$input['ids']:array();
            $this->db->query('START TRANSACTION');
            foreach($ids as $index=>$rawId){$id=(int)$rawId;if($id>0&&!$this->db->query("UPDATE marketing_contents SET sort_order=".($index+1).",updated_at=NOW() WHERE id={$id}")){$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể lưu thứ tự nội dung.'),500);}}
            $this->db->commit();jsonResponse(array('success'=>true,'message'=>'Đã lưu thứ tự hiển thị vào aurora_db.'));
        }
        $id=isset($input['id'])?(int)$input['id']:(isset($_GET['id'])?(int)$_GET['id']:0);
        if($requestMethod==='DELETE'){
            if($id<1)jsonResponse(array('success'=>false,'message'=>'Nội dung không hợp lệ.'),422);
            $existing=$this->rows("SELECT * FROM marketing_contents WHERE id={$id} LIMIT 1");
            if(!$existing)jsonResponse(array('success'=>false,'message'=>'Nội dung không tồn tại.'),404);
            $this->logContentHistory($id,'deleted',$existing[0],$user);
            if(!$this->db->query("DELETE FROM marketing_contents WHERE id={$id} LIMIT 1"))jsonResponse(array('success'=>false,'message'=>'Không thể xóa nội dung: '.$this->db->error),500);
            jsonResponse(array('success'=>true,'message'=>'Đã xóa nội dung khỏi aurora_db.'));
        }
        if($requestMethod!=='POST'&&$requestMethod!=='PUT')jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $title=isset($input['title'])?trim((string)$input['title']):'';
        $placement=isset($input['placement_key'])?trim((string)$input['placement_key']):'home_hero';
        $status=isset($input['status'])?trim((string)$input['status']):'draft';
        $allowedPlacements=array('home_hero','home_announcement','home_offer','home_featured','home_ad_top','home_ad_middle','home_ad_bottom');
        $allowedStatuses=array('draft','scheduled','published','archived');
        if($title===''||!in_array($placement,$allowedPlacements,true)||!in_array($status,$allowedStatuses,true))jsonResponse(array('success'=>false,'message'=>'Tiêu đề, vị trí hoặc trạng thái không hợp lệ.'),422);
        $startsAt=$this->contentDate(isset($input['starts_at'])?$input['starts_at']:'');
        $endsAt=$this->contentDate(isset($input['ends_at'])?$input['ends_at']:'');
        if($startsAt!==null&&$endsAt!==null&&strtotime($endsAt)<=strtotime($startsAt))jsonResponse(array('success'=>false,'message'=>'Thời gian kết thúc phải sau thời gian bắt đầu.'),422);
        if($status==='scheduled'&&$startsAt===null)jsonResponse(array('success'=>false,'message'=>'Nội dung lên lịch cần có thời gian bắt đầu.'),422);
        $fields=array(
            'title'=>$title,'content_type'=>isset($input['content_type'])?trim((string)$input['content_type']):'banner',
            'placement_key'=>$placement,'placement'=>$this->contentPlacementLabel($placement),'eyebrow'=>isset($input['eyebrow'])?trim((string)$input['eyebrow']):'',
            'summary'=>isset($input['summary'])?trim((string)$input['summary']):'','body_text'=>isset($input['body_text'])?trim((string)$input['body_text']):'',
            'media_url'=>isset($input['media_url'])?trim((string)$input['media_url']):'','alt_text'=>isset($input['alt_text'])?trim((string)$input['alt_text']):'',
            'button_label'=>isset($input['button_label'])?trim((string)$input['button_label']):'','button_url'=>isset($input['button_url'])?trim((string)$input['button_url']):'',
            'status'=>$status,'is_visible'=>!empty($input['is_visible'])?1:0,'starts_at'=>$startsAt,'ends_at'=>$endsAt,'publish_at'=>$startsAt
        );
        if(strlen($title)>200||strlen($fields['button_label'])>80||strlen($fields['media_url'])>500)jsonResponse(array('success'=>false,'message'=>'Một số trường vượt quá độ dài cho phép.'),422);
        $sets=array();foreach($fields as $key=>$value){$sets[]="`{$key}`=".($value===null?'NULL':"'".$this->db->real_escape_string((string)$value)."'");}
        if($status==='published'){$sets[]='published_at=COALESCE(published_at,NOW())';$sets[]="published_by='".$this->db->real_escape_string($user['full_name'])."'";}
        $this->db->query('START TRANSACTION');
        if($id>0){$existing=$this->rows("SELECT * FROM marketing_contents WHERE id={$id} LIMIT 1");if(!$existing){$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Nội dung không tồn tại.'),404);}if(!$this->db->query("UPDATE marketing_contents SET ".implode(',',$sets).",updated_at=NOW() WHERE id={$id}")){$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật nội dung: '.$this->db->error),500);}$savedId=$id;$action='updated';}
        else{$next=(int)$this->scalar("SELECT COALESCE(MAX(sort_order),0)+1 FROM marketing_contents WHERE placement_key='".$this->db->real_escape_string($placement)."'");if(!$this->db->query("INSERT INTO marketing_contents SET ".implode(',',$sets).",sort_order={$next},created_by={$actorId},created_at=NOW(),updated_at=NOW()")){$this->db->rollback();jsonResponse(array('success'=>false,'message'=>'Không thể tạo nội dung: '.$this->db->error),500);}$savedId=(int)$this->db->insert_id;$action='created';}
        $saved=$this->rows("SELECT * FROM marketing_contents WHERE id={$savedId} LIMIT 1");
        $this->logContentHistory($savedId,$action,$saved[0],$user);
        if(!empty($fields['media_url'])){$url=$this->db->real_escape_string($fields['media_url']);$this->db->query("UPDATE marketing_content_assets SET content_id={$savedId} WHERE public_url='{$url}' AND uploaded_by={$actorId}");}
        $this->db->commit();jsonResponse(array('success'=>true,'message'=>$id>0?'Đã cập nhật nội dung Customer Website.':'Đã tạo nội dung Customer Website.','data'=>$saved[0]),$id>0?200:201);
    }

    private function contentMedia()
    {
        global $requestMethod;
        if($requestMethod!=='POST')jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $user=requireAdmin();
        if(empty($_FILES['media'])||!is_uploaded_file($_FILES['media']['tmp_name']))jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn file ảnh.'),422);
        $file=$_FILES['media'];
        if((int)$file['error']!==UPLOAD_ERR_OK|| (int)$file['size']>10*1024*1024)jsonResponse(array('success'=>false,'message'=>'Ảnh tải lên không hợp lệ hoặc vượt quá 10 MB.'),422);
        $info=@getimagesize($file['tmp_name']);$types=array(IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_GIF=>'gif');if(defined('IMAGETYPE_WEBP'))$types[IMAGETYPE_WEBP]='webp';
        if(!$info||!isset($types[$info[2]]))jsonResponse(array('success'=>false,'message'=>'Chỉ hỗ trợ ảnh JPG, PNG, GIF hoặc WebP.'),422);
        if((int)$info[0]<600||(int)$info[1]<250)jsonResponse(array('success'=>false,'message'=>'Ảnh cần có kích thước tối thiểu 600 × 250 px.'),422);
        $directory=dirname(dirname(dirname(dirname(__FILE__)))).DIRECTORY_SEPARATOR.'public'.DIRECTORY_SEPARATOR.'uploads'.DIRECTORY_SEPARATOR.'website-content';
        if(!is_dir($directory)&&!@mkdir($directory,0775,true))jsonResponse(array('success'=>false,'message'=>'Không thể tạo thư mục lưu ảnh CMS.'),500);
        $name='cms-'.date('Ymd-His').'-'.substr(sha1(uniqid((string)mt_rand(),true)),0,10).'.'.$types[$info[2]];
        if(!move_uploaded_file($file['tmp_name'],$directory.DIRECTORY_SEPARATOR.$name))jsonResponse(array('success'=>false,'message'=>'Không thể lưu ảnh tải lên.'),500);
        $scheme=!empty($_SERVER['HTTPS'])&&$_SERVER['HTTPS']!=='off'?'https':'http';$host=isset($_SERVER['HTTP_HOST'])?$_SERVER['HTTP_HOST']:'localhost';$script=isset($_SERVER['SCRIPT_NAME'])?str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME'])):'';
        $url=$scheme.'://'.$host.rtrim($script,'/').'/uploads/website-content/'.$name;$mime=isset($info['mime'])?$info['mime']:'image/'.$types[$info[2]];
        $original=$this->db->real_escape_string(basename($file['name']));$mimeEsc=$this->db->real_escape_string($mime);$urlEsc=$this->db->real_escape_string($url);$actorId=(int)$user['id'];
        $this->db->query("INSERT INTO marketing_content_assets(file_name,original_name,mime_type,file_size,public_url,uploaded_by,created_at) VALUES ('{$name}','{$original}','{$mimeEsc}',".(int)$file['size'].",'{$urlEsc}',{$actorId},NOW())");
        jsonResponse(array('success'=>true,'message'=>'Đã tải ảnh lên thư viện aurora_db.','data'=>array('url'=>$url,'width'=>(int)$info[0],'height'=>(int)$info[1])),201);
    }

    private function contentDate($value){$value=trim((string)$value);if($value==='')return null;$timestamp=strtotime(str_replace('T',' ',$value));return $timestamp===false?null:date('Y-m-d H:i:s',$timestamp);}
    private function contentPlacementLabel($key){$labels=array('home_hero'=>'Hero trang chủ','home_announcement'=>'Thông báo trang chủ','home_offer'=>'Thẻ ưu đãi','home_featured'=>'Khối phim nổi bật','home_ad_top'=>'Quảng cáo đầu trang','home_ad_middle'=>'Quảng cáo giữa trang','home_ad_bottom'=>'Quảng cáo cuối trang');return isset($labels[$key])?$labels[$key]:$key;}
    private function logContentHistory($id,$action,$snapshot,$user){$json=$this->db->real_escape_string(json_encode($snapshot));$name=$this->db->real_escape_string(isset($user['full_name'])?$user['full_name']:$user['username']);$this->db->query("INSERT INTO marketing_content_history(content_id,action_name,snapshot_json,actor_id,actor_name,created_at) VALUES (".(int)$id.",'".$this->db->real_escape_string($action)."','{$json}',".(int)$user['id'].",'{$name}',NOW())");}

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
        if(!$this->db->query("UPDATE movies SET status=CASE WHEN release_date>CURDATE() THEN 'coming_soon' ELSE 'now_showing' END WHERE UPPER(status) IN ('COMING_SOON','NOW_SHOWING') AND release_date IS NOT NULL AND status<>CASE WHEN release_date>CURDATE() THEN 'coming_soon' ELSE 'now_showing' END"))jsonResponse(array('success'=>false,'message'=>'Không thể tự đồng bộ trạng thái phim theo ngày khởi chiếu trong aurora_db: '.$this->db->error),500);
        $where = "m.status<>'draft'";
        if (!empty($_GET['q'])) {
            $q = $this->db->real_escape_string(trim((string)$_GET['q']));
            $where .= " AND (m.title LIKE '%{$q}%' OR m.original_title LIKE '%{$q}%' OR m.movie_code LIKE '%{$q}%')";
        }
        if(!empty($_GET['status'])&&in_array($_GET['status'],array('coming_soon','now_showing','special_showing','ended','archived'),true))$where.=" AND m.status='".$this->db->real_escape_string($_GET['status'])."'";
        $ownerId=(int)$user['id'];
        // Marketing sees the same shared catalog as Admin Tổng, but an edit
        // grant is scoped to movies that originated from this account's own
        // approved planning workflow.  The flag is calculated by the API so
        // hiding a button in the browser is never the security boundary.
        $data = $this->rows("SELECT m.id,m.movie_code,m.title,m.original_title,m.genre,m.duration_minutes,m.age_rating,m.director,m.cast,m.writer,m.producer,m.production_country,m.production_year,m.description,m.plot_details,m.original_language,m.localization_versions,m.format,m.release_date,m.expected_end_date,m.distributor,m.poster_url,m.banner_url,m.trailer_url,m.status,m.updated_at,
            CASE WHEN m.marketing_owner_id={$ownerId} OR EXISTS(SELECT 1 FROM movie_plans own_plan WHERE own_plan.movie_id=m.id AND own_plan.marketing_owner_id={$ownerId} AND own_plan.approval_status='approved') THEN 1 ELSE 0 END AS can_edit
            FROM movies m WHERE {$where} ORDER BY CASE m.status WHEN 'now_showing' THEN 0 WHEN 'special_showing' THEN 1 WHEN 'coming_soon' THEN 2 ELSE 3 END,m.release_date DESC,m.id DESC");
        $candidates=$this->rows("SELECT mp.id AS plan_id,mp.plan_code,mp.plan_name,mp.approved_at,mp.target_revenue,mp.target_tickets,mp.planned_theater_ids,m.id AS movie_id,m.movie_code,m.title,m.original_title,m.genre,m.duration_minutes,m.age_rating,m.format,m.release_date,m.poster_url FROM movie_plans mp INNER JOIN movies m ON m.id=mp.movie_id WHERE mp.marketing_owner_id={$ownerId} AND mp.approval_status='approved' AND m.status='draft' ORDER BY mp.approved_at DESC,mp.id DESC");
        jsonResponse(array('success'=>true,'data'=>$data,'meta'=>array('summary'=>array(
            'total'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status<>'draft'"),
            'now_showing'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status='now_showing'"),
            'coming_soon'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status='coming_soon'"),
            'special_showing'=>(int)$this->scalar("SELECT COUNT(*) FROM movies WHERE status='special_showing'"),
            'eligible'=>count($candidates)
        ),'approved_candidates'=>$candidates,'genres'=>$this->genreOptions(),'countries'=>$this->rows("SELECT id,iso_code,name_vi,name_en FROM movie_countries WHERE status='active' ORDER BY sort_order,name_vi"),'audio_languages'=>$this->movieLanguageOptions(),'subtitle_options'=>$this->movieSubtitleOptions(),'permissions'=>array(
            'can_view'=>true,'can_update_owned'=>true,'can_publish_approved'=>true,'can_create_direct'=>false,'can_import'=>false,'can_delete'=>false
        ))));
    }

    private function updateCatalogMovie()
    {
        $user=requireAdmin();
        if(AdminController::normalizeRole($user['role'])!=='marketing_manager')jsonResponse(array('success'=>false,'message'=>'Thao tác này chỉ dành cho bộ phận Marketing.'),403);
        $input=requestJson();
        $id=isset($_GET['id'])?(int)$_GET['id']:(isset($input['id'])?(int)$input['id']:0);
        if($id<=0)jsonResponse(array('success'=>false,'message'=>'Phim cần chỉnh sửa không hợp lệ.'),422);
        $existing=$this->rows("SELECT id,movie_code,status,marketing_owner_id FROM movies WHERE id={$id} LIMIT 1");
        if(!$existing)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy phim trong aurora_db.'),404);
        if($existing[0]['status']==='draft')jsonResponse(array('success'=>false,'message'=>'Phim bản nháp phải hoàn tất quy trình phê duyệt trước khi được chỉnh sửa tại Danh sách phim.'),409);
        $owned=(int)$existing[0]['marketing_owner_id']===(int)$user['id']||(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE movie_id={$id} AND marketing_owner_id=".(int)$user['id']." AND approval_status='approved'")>0;
        if(!$owned)jsonResponse(array('success'=>false,'message'=>'Bạn chỉ được chỉnh sửa phim do tài khoản Marketing này lập kế hoạch và đã được Admin Tổng phê duyệt.'),403);

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
        if(!$this->activeMovieCatalogValueExists('movie_audio_languages','name_vi',$movie['original_language']))jsonResponse(array('success'=>false,'message'=>'Ngôn ngữ âm thanh không thuộc danh mục đang sử dụng trong aurora_db.'),422);
        if($movie['localization_versions']!==''&&!$this->activeMovieCatalogValueExists('movie_subtitle_options','label_vi',$movie['localization_versions']))jsonResponse(array('success'=>false,'message'=>'Phụ đề không thuộc danh mục đang sử dụng trong aurora_db.'),422);
        if(!$this->validDate($movie['release_date'])||($movie['expected_end_date']!==''&&!$this->validDate($movie['expected_end_date'])))jsonResponse(array('success'=>false,'message'=>'Ngày phát hành không hợp lệ. Vui lòng nhập theo thứ tự ngày / tháng / năm.'),422);
        if($movie['expected_end_date']==='')$movie['expected_end_date']=$movie['release_date'];
        if($movie['expected_end_date']<$movie['release_date'])jsonResponse(array('success'=>false,'message'=>'Ngày kết thúc dự kiến phải từ ngày khởi chiếu trở đi.'),422);
        if(in_array($movie['status'],array('coming_soon','now_showing'),true))$movie['status']=$movie['release_date']<=(string)$this->scalar('SELECT CURDATE()')?'now_showing':'coming_soon';
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
        if(function_exists('writeTmsAuditLog'))writeTmsAuditLog($this->db,'MARKETING_MOVIE_UPDATED','Marketing cập nhật phim '.$existing[0]['movie_code'].' trong kho phim dùng chung.',array('module'=>'marketing','entity_type'=>'movie','entity_id'=>(string)$id,'severity'=>'success','metadata'=>array('movie_code'=>$existing[0]['movie_code'],'scope'=>'owned_approved_movie')));
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
            (SELECT COUNT(*) FROM movie_allocations ma WHERE ma.plan_id=mp.id AND ma.status='pending') allocation_pending_count,
            (SELECT COUNT(*) FROM movie_allocations ma WHERE ma.plan_id=mp.id AND ma.status IN ('confirmed','deploying','active')) allocation_received_count,
            (SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ', ') FROM theaters t WHERE FIND_IN_SET(t.id,REPLACE(mp.planned_theater_ids,' ',''))) theater_names
            FROM movie_plans mp LEFT JOIN movies m ON m.id=mp.movie_id WHERE {$where}
            ORDER BY CASE mp.approval_status WHEN 'pending_approval' THEN 0 WHEN 'revision_requested' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,mp.updated_at DESC,mp.id DESC");
        $reasonOptions=$this->moviePlanReasonOptions();
        $reasonLabels=array();foreach($reasonOptions as $option)$reasonLabels[$option['code']]=$option['label_vi'];
        foreach ($data as &$plan) {
            $plan['history'] = $this->rows("SELECT action_name,from_status,to_status,actor_name,actor_role,note,created_at FROM marketing_movie_plan_history WHERE plan_id=".(int)$plan['id']." ORDER BY id DESC");
            $plan['review_items'] = $this->rows("SELECT id,review_round,section_key,section_label,field_key,field_label,current_value,comment,status,created_by_name,created_at,resolved_at FROM marketing_movie_plan_review_items WHERE plan_id=".(int)$plan['id']." ORDER BY review_round DESC,id ASC");
            $plan['theater_ids'] = array_values(array_filter(array_map('intval', explode(',', (string)$plan['planned_theater_ids']))));
            $decodedReasons=json_decode((string)$plan['recommendation_reason_codes'],true);
            $validReasonCodes=array();$selectedReasonLabels=array();
            if(is_array($decodedReasons)){foreach($decodedReasons as $code){$code=trim((string)$code);if($code!==''&&isset($reasonLabels[$code])&&!in_array($code,$validReasonCodes,true)){$validReasonCodes[]=$code;$selectedReasonLabels[]=$reasonLabels[$code];}}}
            $plan['recommendation_reason_codes']=$validReasonCodes;
            $plan['recommendation_reason_labels']=$selectedReasonLabels;
            if(trim((string)$plan['recommendation_reason_detail'])===''&&trim((string)$plan['recommendation_reason'])!=='')$plan['recommendation_reason_detail']=$plan['recommendation_reason'];
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
            'audio_languages'=>$this->movieLanguageOptions(),
            'subtitle_options'=>$this->movieSubtitleOptions(),
            'reason_options'=>$reasonOptions,
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
        $reasonCodes=array();if(isset($input['recommendation_reason_codes'])&&is_array($input['recommendation_reason_codes'])){foreach($input['recommendation_reason_codes'] as $value){$value=trim((string)$value);if($value!==''&&!in_array($value,$reasonCodes,true))$reasonCodes[]=$value;}}
        if(count($reasonCodes)>8)jsonResponse(array('success'=>false,'message'=>'Chỉ được chọn tối đa 8 lý do đề xuất.'),422);
        $reasonDetail=isset($input['recommendation_reason_detail'])?trim((string)$input['recommendation_reason_detail']):trim((string)(isset($input['recommendation_reason'])?$input['recommendation_reason']:''));
        $availableReasons=$this->moviePlanReasonOptions();$reasonMap=array();foreach($availableReasons as $option)$reasonMap[$option['code']]=$option['label_vi'];
        foreach($reasonCodes as $code)if(!isset($reasonMap[$code]))jsonResponse(array('success'=>false,'message'=>'Lý do đề xuất không thuộc danh mục đang hoạt động trong aurora_db.'),422);
        $reasonLabels=array();foreach($reasonCodes as $code)$reasonLabels[]=$reasonMap[$code];
        $reason=implode(', ',$reasonLabels).($reasonDetail!==''?((count($reasonLabels)?'. Chi tiết: ':'').$reasonDetail):'');
        $note = isset($input['note']) ? trim((string)$input['note']) : '';
        $campaignName = isset($input['campaign_name']) ? trim((string)$input['campaign_name']) : '';
        $marketingBudget = isset($input['marketing_budget']) ? max(0,(float)$input['marketing_budget']) : 0;
        $promotionProposed = !empty($input['promotion_proposed']) ? 1 : 0;
        $rights = isset($input['release_rights_status']) && in_array($input['release_rights_status'],array('pending_verification','verified','not_required'),true) ? $input['release_rights_status'] : 'pending_verification';
        $classification = isset($input['content_classification_status']) && in_array($input['content_classification_status'],array('pending_review','verified','supplement_required'),true) ? $input['content_classification_status'] : 'pending_review';
        $theaterIds = isset($input['theater_ids']) && is_array($input['theater_ids']) ? array_values(array_unique(array_filter(array_map('intval',$input['theater_ids'])))) : array();
        if ($name === '' || !$this->validDate($start) || !$this->validDate($end) || $start > $end || !$reasonCodes || $reasonDetail === '') jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn ít nhất một lý do và nhập nội dung chi tiết cho đề xuất.'),422);
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
            if(!$this->activeMovieCatalogValueExists('movie_audio_languages','name_vi',$movieValues['audio_language'])||!$this->activeMovieCatalogValueExists('movie_subtitle_options','label_vi',$movieValues['subtitle'])){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Ngôn ngữ âm thanh hoặc phụ đề không thuộc danh mục đang sử dụng trong aurora_db.'),422);}
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
            if(!$this->activeMovieCatalogValueExists('movie_audio_languages','name_vi',$movieValues['audio_language'])||!$this->activeMovieCatalogValueExists('movie_subtitle_options','label_vi',$movieValues['subtitle'])){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Ngôn ngữ âm thanh hoặc phụ đề không thuộc danh mục đang sử dụng trong aurora_db.'),422);}
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
            'target_revenue'=>$revenue,'target_screenings_per_day'=>$screenings,'target_tickets'=>$targetTickets,'priority_level'=>$priority,'recommendation_reason'=>$reason,'recommendation_reason_codes'=>json_encode($reasonCodes),'recommendation_reason_detail'=>$reasonDetail,'note'=>$note,
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
        $input=requestJson();$id=isset($input['id'])?(int)$input['id']:0;$decision=isset($input['decision'])?trim($input['decision']):'';$note=isset($input['note'])?trim($input['note']):'';$rawReviewItems=isset($input['review_items'])&&is_array($input['review_items'])?$input['review_items']:array();$requestedTheaterIds=isset($input['theater_ids'])&&is_array($input['theater_ids'])?array_values(array_unique(array_filter(array_map('intval',$input['theater_ids'])))):array();$reviewItems=array();
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
        if($decision==='approved'){
            $databaseDate=(string)$this->scalar('SELECT CURDATE()');
            if(!$this->validDate($plan['expected_start_date'])||!$this->validDate($plan['expected_end_date'])||$plan['expected_end_date']<$plan['expected_start_date']){
                jsonResponse(array('success'=>false,'message'=>'Không thể duyệt: thời gian triển khai của kế hoạch không hợp lệ. Hãy trả Marketing cập nhật lại ngày bắt đầu và kết thúc.'),422);
            }
            if($plan['expected_end_date']<$databaseDate){
                jsonResponse(array('success'=>false,'message'=>'Không thể duyệt kế hoạch đã hết hạn ngày '.date('d/m/Y',strtotime($plan['expected_end_date'])).'. Hãy yêu cầu Marketing cập nhật thời gian triển khai trước khi duyệt.'),422);
            }
            $plannedTheaterIds=$requestedTheaterIds;
            if(!$plannedTheaterIds)jsonResponse(array('success'=>false,'message'=>'Không thể duyệt: kế hoạch chưa chọn rạp triển khai.'),422);
            $validTheaterCount=(int)$this->scalar('SELECT COUNT(*) FROM theaters WHERE id IN ('.implode(',',$plannedTheaterIds).')');
            if($validTheaterCount!==count($plannedTheaterIds))jsonResponse(array('success'=>false,'message'=>'Không thể duyệt: danh sách rạp đề xuất có dữ liệu không còn tồn tại trong aurora_db.'),422);
        }
        $actor=$this->db->real_escape_string($user['full_name']);$noteEsc=$this->db->real_escape_string($note);$status=$decision==='approved'?'published':'draft';
        if($decision==='approved')$plan['planned_theater_ids']=implode(',',$plannedTheaterIds);
        if(!$this->db->query('START TRANSACTION'))jsonResponse(array('success'=>false,'message'=>'Không thể bắt đầu phê duyệt kế hoạch trong aurora_db: '.$this->db->error),500);
        // Giữ giá trị rỗng tương thích cả schema cũ (NOT NULL) và schema mới (NULL).
        $approvedBy=$decision==='approved'?"'{$actor}'":"''";$approvedAt=$decision==='approved'?'NOW()':"'1970-01-01 00:00:00'";
        $theaterScope=$decision==='approved'?",planned_theater_ids='".$this->db->real_escape_string($plan['planned_theater_ids'])."'":'';
        if(!$this->db->query("UPDATE movie_plans SET approval_status='{$decision}',status='{$status}',reviewed_by='{$actor}',reviewed_at=NOW(),approval_note='{$noteEsc}',approved_by={$approvedBy},approved_at={$approvedAt}{$theaterScope},updated_by='{$actor}',updated_at=NOW() WHERE id={$id} AND approval_status='pending_approval'")||$this->db->affected_rows!==1){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>$error!==''?'Không thể lưu quyết định: '.$error:'Kế hoạch vừa được xử lý ở một phiên khác. Vui lòng tải lại dữ liệu.'),409);}
        if($decision==='revision_requested'){
            $round=(int)$this->scalar("SELECT COALESCE(MAX(review_round),0)+1 FROM marketing_movie_plan_review_items WHERE plan_id={$id}");
            foreach($reviewItems as $item){
                $section=$this->db->real_escape_string($item['section_key']);$sectionLabel=$this->db->real_escape_string($item['section_label']);$field=$this->db->real_escape_string($item['field_key']);$label=$this->db->real_escape_string($item['field_label']);$currentValue=$this->db->real_escape_string($item['current_value']);$comment=$this->db->real_escape_string($item['comment']);
                if(!$this->db->query("INSERT INTO marketing_movie_plan_review_items(plan_id,review_round,section_key,section_label,field_key,field_label,current_value,comment,status,created_by,created_by_name,created_at) VALUES({$id},{$round},'{$section}','{$sectionLabel}','{$field}','{$label}','{$currentValue}','{$comment}','open',".(int)$user['id'].",'{$actor}',NOW())")){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể lưu nội dung phản hồi: '.$error),500);}
            }
        }
        $distributedCount=0;
        if($decision==='approved'){
            $distributedCount=$this->distributeApprovedPlan($plan);
            if($distributedCount===false){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể phân bổ kế hoạch đến Admin Rạp: '.$error),500);}
            if($distributedCount!==count($plannedTheaterIds)){$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Phê duyệt đã được hoàn tác vì chưa phân bổ đủ đến tất cả rạp đề xuất.'),409);}
        }
        if(!$this->logPlanHistory($id,$decision==='approved'?'approved':'revision_requested','pending_approval',$decision,$user,$note)){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể ghi lịch sử phê duyệt: '.$error),500);}
        if(!$this->db->query('COMMIT')){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể hoàn tất phê duyệt trong aurora_db: '.$error),500);}
        jsonResponse(array('success'=>true,'message'=>$decision==='approved'?'Đã duyệt và tạo '.$distributedCount.' phân bổ chờ Admin Rạp xác nhận.':'Đã gửi yêu cầu chỉnh sửa đến Marketing.','data'=>$decision==='approved'?array('plan_id'=>$id,'allocation_count'=>$distributedCount):array()));
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
        $distributed=0;
        foreach($ids as $theaterId){
            $theaters=$this->rows("SELECT id,name FROM theaters WHERE id={$theaterId} LIMIT 1");if(!$theaters)return false;$name=$this->db->real_escape_string($theaters[0]['name']);$title=$this->db->real_escape_string($plan['movie_title']);$format=$this->db->real_escape_string($plan['format']);
            $exists=(int)$this->scalar("SELECT id FROM movie_allocations WHERE plan_id=".(int)$plan['id']." AND theater_id={$theaterId} LIMIT 1");
            if($exists){if(!$this->db->query("UPDATE movie_allocations SET min_screenings_per_day=".(int)$plan['target_screenings_per_day'].",preferred_screen_types='{$format}',allocated_start_date='".$this->db->real_escape_string($plan['expected_start_date'])."',allocated_end_date='".$this->db->real_escape_string($plan['expected_end_date'])."',status='pending',confirmed_by='',confirmed_at=NOW() WHERE id={$exists}"))return false;}
            elseif(!$this->db->query("INSERT INTO movie_allocations(plan_id,movie_id,movie_title,theater_id,theater_name,min_screenings_per_day,preferred_screen_types,allocated_start_date,allocated_end_date,status,confirmed_by,confirmed_at) VALUES(".(int)$plan['id'].",".(int)$plan['movie_id'].",'{$title}',{$theaterId},'{$name}',".(int)$plan['target_screenings_per_day'].",'{$format}','".$this->db->real_escape_string($plan['expected_start_date'])."','".$this->db->real_escape_string($plan['expected_end_date'])."','pending','',NOW())"))return false;
            $distributed++;
        }
        return $distributed;
    }

    private function logPlanHistory($planId,$action,$from,$to,$user,$note)
    {
        $values=array($action,$from,$to,$user['full_name'],AdminController::normalizeRole($user['role']),$note);$safe=array();foreach($values as $value)$safe[]=$this->db->real_escape_string((string)$value);
        return $this->db->query("INSERT INTO marketing_movie_plan_history(plan_id,action_name,from_status,to_status,actor_id,actor_name,actor_role,note,created_at) VALUES(".(int)$planId.",'{$safe[0]}','{$safe[1]}','{$safe[2]}',".(int)$user['id'].",'{$safe[3]}','{$safe[4]}','{$safe[5]}',NOW())");
    }

    private function dashboard()
    {
        $data = array(
            'generated_at'=>date('Y-m-d H:i:s'),
            'campaigns_total'=>(int)$this->scalar('SELECT COUNT(*) FROM marketing_campaigns'),
            'campaigns_running'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='running'"),
            'campaigns_planned'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='planned'"),
            'campaigns_completed'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_campaigns WHERE status='completed'"),
            'budget_total'=>(float)$this->scalar('SELECT COALESCE(SUM(budget),0) FROM marketing_campaigns'),
            'budget_active'=>(float)$this->scalar("SELECT COALESCE(SUM(budget),0) FROM marketing_campaigns WHERE status IN ('planned','running')"),
            'promotions_pending'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions WHERE approval_status='pending_approval'"),
            'promotions_active'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_promotions WHERE status='active'"),
            'active_vouchers'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_vouchers WHERE status='active'"),
            'voucher_quantity'=>(int)$this->scalar('SELECT COALESCE(SUM(quantity),0) FROM marketing_vouchers'),
            'voucher_redemptions'=>(int)$this->scalar('SELECT COALESCE(SUM(used_count),0) FROM marketing_vouchers'),
            'published_contents'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_contents WHERE status='published'"),
            'scheduled_notifications'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_notifications WHERE status='scheduled'"),
            'customer_segments'=>(int)$this->scalar("SELECT COUNT(*) FROM marketing_customer_segments WHERE status='active'"),
            'customers_total'=>(int)$this->scalar("SELECT COUNT(*) FROM users WHERE role='customer'"),
            'movie_plans_pending'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE marketing_owner_id IS NOT NULL AND approval_status='pending_approval'"),
            'movie_plans_revision'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE marketing_owner_id IS NOT NULL AND approval_status='revision_requested'"),
            'movie_plans_approved'=>(int)$this->scalar("SELECT COUNT(*) FROM movie_plans WHERE marketing_owner_id IS NOT NULL AND approval_status='approved'"),
            'recent_campaigns'=>$this->rows('SELECT id,campaign_code,name,channel,budget,start_date,end_date,status FROM marketing_campaigns ORDER BY COALESCE(updated_at,created_at) DESC,id DESC LIMIT 6'),
            'upcoming_contents'=>$this->rows("SELECT id,title,placement,publish_at,status FROM marketing_contents WHERE status IN ('scheduled','published') AND (publish_at IS NULL OR publish_at>=DATE_SUB(NOW(),INTERVAL 1 DAY)) ORDER BY publish_at ASC LIMIT 5"),
            'channel_breakdown'=>$this->rows("SELECT channel,COUNT(*) campaign_count,COALESCE(SUM(budget),0) budget FROM marketing_campaigns GROUP BY channel ORDER BY budget DESC")
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
