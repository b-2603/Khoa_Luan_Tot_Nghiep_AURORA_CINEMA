<?php

class PromotionDeploymentController
{
    private $db;

    public function __construct($db) { $this->db = $db; }

    private function rows($sql)
    {
        $result=$this->db->query($sql);
        if(!$result) jsonResponse(array('success'=>false,'message'=>'Không thể đọc kế hoạch CTKM tại rạp: '.$this->db->error),500);
        $rows=array();while($row=$result->fetch_assoc())$rows[]=$row;$result->free();return $rows;
    }

    private function scalar($sql)
    {
        $result=$this->db->query($sql);if(!$result)return 0;$row=$result->fetch_row();$result->free();return isset($row[0])?$row[0]:0;
    }

    public function ensureSchema()
    {
        $sql="CREATE TABLE IF NOT EXISTS promotion_theater_deployments (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            promotion_id BIGINT UNSIGNED NOT NULL,
            voucher_id BIGINT UNSIGNED NOT NULL,
            theater_id BIGINT UNSIGNED NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            received_by BIGINT UNSIGNED NULL,received_by_name VARCHAR(120) NULL,received_at DATETIME NULL,
            pos_button_label VARCHAR(50) NULL,pos_button_color VARCHAR(20) NOT NULL DEFAULT '#D99A1B',
            pos_button_icon VARCHAR(30) NOT NULL DEFAULT 'gift',pos_sort_order INT NOT NULL DEFAULT 0,
            applies_to VARCHAR(20) NOT NULL DEFAULT 'all',pos_enabled TINYINT(1) NOT NULL DEFAULT 0,
            configured_by BIGINT UNSIGNED NULL,configured_by_name VARCHAR(120) NULL,configured_at DATETIME NULL,
            redemption_count INT UNSIGNED NOT NULL DEFAULT 0,last_redeemed_at DATETIME NULL,
            created_at DATETIME NOT NULL,updated_at DATETIME NULL,
            UNIQUE KEY uq_promotion_theater (promotion_id,theater_id),
            KEY idx_promotion_deployment_theater (theater_id,status,pos_enabled),
            KEY idx_promotion_deployment_voucher (voucher_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci";
        if(!$this->db->query($sql))jsonResponse(array('success'=>false,'message'=>'Không thể khởi tạo phân phối CTKM theo rạp: '.$this->db->error),500);
    }

    public function handle()
    {
        global $requestMethod;
        $user=requireAdmin();$role=AdminController::normalizeRole($user['role']);
        if(!in_array($role,array('cinema_admin','super_admin'),true))jsonResponse(array('success'=>false,'message'=>'Chức năng này dành cho Admin Rạp và Admin Tổng.'),403);
        $this->ensureSchema();
        $theaterId=$role==='super_admin'&&isset($_GET['theater_id'])?(int)$_GET['theater_id']:(int)$user['theater_id'];
        if($theaterId<1)jsonResponse(array('success'=>false,'message'=>'Tài khoản chưa được gán rạp vận hành.'),422);
        if((int)$this->scalar("SELECT COUNT(*) FROM theaters WHERE id={$theaterId}")!==1)jsonResponse(array('success'=>false,'message'=>'Rạp không tồn tại trong aurora_db.'),404);
        if($requestMethod==='GET') {
            $where="d.theater_id={$theaterId}";
            if(!empty($_GET['status'])&&in_array($_GET['status'],array('pending','received','active','paused'),true))$where.=" AND d.status='".$this->db->real_escape_string($_GET['status'])."'";
            if(!empty($_GET['q'])){$q=$this->db->real_escape_string(trim((string)$_GET['q']));$where.=" AND (p.name LIKE '%{$q}%' OR p.promotion_code LIKE '%{$q}%')";}
            $rows=$this->rows("SELECT d.*,p.promotion_code,p.name,p.description,p.details,p.terms_text,p.category,p.audience,p.badge_text,p.theme_color,p.image_url,p.discount_type,p.discount_value,p.benefit_type,p.benefit_title,p.benefit_description,p.gift_product_id,p.gift_quantity,p.buy_quantity,p.get_quantity,p.application_scope,p.redemption_instructions,gift.name gift_product_name,p.min_order_amount,p.max_discount,p.start_date,p.end_date,p.usage_limit,p.is_featured,v.used_count,v.status voucher_status,t.name theater_name
                FROM promotion_theater_deployments d
                INNER JOIN marketing_promotions p ON p.id=d.promotion_id
                INNER JOIN vouchers v ON v.id=d.voucher_id
                INNER JOIN theaters t ON t.id=d.theater_id
                LEFT JOIN products gift ON gift.id=p.gift_product_id
                WHERE {$where} ORDER BY FIELD(d.status,'pending','received','active','paused'),p.start_date,d.id DESC");
            $summary=array('total'=>(int)$this->scalar("SELECT COUNT(*) FROM promotion_theater_deployments WHERE theater_id={$theaterId}"),'pending'=>(int)$this->scalar("SELECT COUNT(*) FROM promotion_theater_deployments WHERE theater_id={$theaterId} AND status='pending'"),'received'=>(int)$this->scalar("SELECT COUNT(*) FROM promotion_theater_deployments WHERE theater_id={$theaterId} AND status='received'"),'active'=>(int)$this->scalar("SELECT COUNT(*) FROM promotion_theater_deployments WHERE theater_id={$theaterId} AND status='active'"),'paused'=>(int)$this->scalar("SELECT COUNT(*) FROM promotion_theater_deployments WHERE theater_id={$theaterId} AND status='paused'"));
            jsonResponse(array('success'=>true,'data'=>$rows,'meta'=>array('summary'=>$summary,'theater_id'=>$theaterId,'source'=>'aurora_db')));
        }
        if(!in_array($requestMethod,array('POST','PUT'),true))jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $input=requestJson();$id=isset($input['id'])?(int)$input['id']:0;$operation=isset($input['operation'])?trim((string)$input['operation']):'';
        $found=$this->rows("SELECT d.*,p.name,p.promotion_code,p.publication_status,v.status voucher_status FROM promotion_theater_deployments d INNER JOIN marketing_promotions p ON p.id=d.promotion_id INNER JOIN vouchers v ON v.id=d.voucher_id WHERE d.id={$id} AND d.theater_id={$theaterId} LIMIT 1");
        if(!$found)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy kế hoạch CTKM thuộc rạp này.'),404);$row=$found[0];
        $actorId=(int)$user['id'];$actor=$this->db->real_escape_string($user['full_name']);
        if($operation==='receive') {
            if($row['status']!=='pending')jsonResponse(array('success'=>false,'message'=>'Kế hoạch đã được tiếp nhận trước đó.'),409);
            if(!$this->db->query("UPDATE promotion_theater_deployments SET status='received',received_by={$actorId},received_by_name='{$actor}',received_at=NOW(),updated_at=NOW() WHERE id={$id}"))jsonResponse(array('success'=>false,'message'=>'Không thể tiếp nhận kế hoạch: '.$this->db->error),500);
            jsonResponse(array('success'=>true,'message'=>'Đã tiếp nhận kế hoạch. Bạn có thể cấu hình nút CTKM trên POS.'));
        }
        if($operation==='save_button') {
            if(!in_array($row['status'],array('received','active','paused'),true))jsonResponse(array('success'=>false,'message'=>'Hãy tiếp nhận kế hoạch trước khi tạo nút POS.'),409);
            if($row['publication_status']!=='published'||$row['voucher_status']!=='active')jsonResponse(array('success'=>false,'message'=>'Chương trình trung tâm hiện không hoạt động.'),409);
            $label=isset($input['pos_button_label'])?trim((string)$input['pos_button_label']):'';$color=isset($input['pos_button_color'])?trim((string)$input['pos_button_color']):'#D99A1B';$icon=isset($input['pos_button_icon'])?trim((string)$input['pos_button_icon']):'gift';$applies=isset($input['applies_to'])?trim((string)$input['applies_to']):'all';$sort=isset($input['pos_sort_order'])?(int)$input['pos_sort_order']:0;
            if($label===''||strlen($label)>50)jsonResponse(array('success'=>false,'message'=>'Tên nút POS phải có từ 1 đến 50 ký tự.'),422);
            if(!preg_match('/^#[0-9A-Fa-f]{6}$/',$color))jsonResponse(array('success'=>false,'message'=>'Màu nút POS không hợp lệ.'),422);
            if(!in_array($icon,array('gift','ticket','percent','star'),true))$icon='gift';if(!in_array($applies,array('all','ticket','combo'),true))$applies='all';
            $labelEsc=$this->db->real_escape_string($label);$colorEsc=$this->db->real_escape_string($color);
            if(!$this->db->query("UPDATE promotion_theater_deployments SET status='active',pos_button_label='{$labelEsc}',pos_button_color='{$colorEsc}',pos_button_icon='{$icon}',pos_sort_order={$sort},applies_to='{$applies}',pos_enabled=1,configured_by={$actorId},configured_by_name='{$actor}',configured_at=NOW(),updated_at=NOW() WHERE id={$id}"))jsonResponse(array('success'=>false,'message'=>'Không thể tạo nút POS: '.$this->db->error),500);
            jsonResponse(array('success'=>true,'message'=>'Đã tạo và bật nút CTKM trên hệ thống POS của rạp.'));
        }
        if(in_array($operation,array('activate','pause'),true)) {
            if(empty($row['pos_button_label']))jsonResponse(array('success'=>false,'message'=>'Hãy cấu hình nút POS trước.'),409);
            $active=$operation==='activate';$status=$active?'active':'paused';$enabled=$active?1:0;
            if(!$this->db->query("UPDATE promotion_theater_deployments SET status='{$status}',pos_enabled={$enabled},updated_at=NOW() WHERE id={$id}"))jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật nút POS: '.$this->db->error),500);
            jsonResponse(array('success'=>true,'message'=>$active?'Đã bật lại nút CTKM trên POS.':'Đã tạm ẩn nút CTKM khỏi POS.'));
        }
        jsonResponse(array('success'=>false,'message'=>'Thao tác triển khai CTKM không hợp lệ.'),422);
    }
}
