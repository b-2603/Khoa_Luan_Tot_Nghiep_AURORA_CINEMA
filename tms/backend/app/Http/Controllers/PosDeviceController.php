<?php

class PosDeviceController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function index()
    {
        $user = $this->requireSuperAdmin();
        $this->ensureSchema();
        $method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';
        if ($method === 'GET') $this->listing();
        if ($method !== 'POST' && $method !== 'PUT') jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);

        $input = requestJson();
        $operation = isset($input['operation']) ? strtolower(trim((string)$input['operation'])) : 'save';
        if ($operation === 'save') $this->save($input, $user);
        if ($operation === 'approve' || $operation === 'reject') $this->review($input, $user, $operation);
        if ($operation === 'status') $this->changeStatus($input, $user);
        if ($operation === 'rotate_token') $this->rotateToken($input, $user);
        jsonResponse(array('success'=>false,'message'=>'Thao tác thiết bị POS không hợp lệ.'),422);
    }

    public function heartbeat()
    {
        $this->ensureSchema();
        $input = requestJson();
        $code = isset($input['device_code']) ? strtoupper(trim((string)$input['device_code'])) : '';
        $token = isset($input['device_token']) ? trim((string)$input['device_token']) : '';
        if ($code === '' || $token === '') jsonResponse(array('success'=>false,'message'=>'Thiếu mã thiết bị hoặc khóa kích hoạt.'),422);
        $codeEsc = $this->db->real_escape_string($code);
        $device = $this->one("SELECT * FROM tms_pos_devices WHERE device_code='{$codeEsc}' LIMIT 1");
        if (!$device || empty($device['activation_token_hash']) || hash('sha256',$token) !== $device['activation_token_hash']) {
            jsonResponse(array('success'=>false,'message'=>'Thông tin xác thực thiết bị không hợp lệ.'),401);
        }
        if ($device['approval_status'] === 'rejected' || $device['status'] === 'inactive') {
            jsonResponse(array('success'=>false,'message'=>'Thiết bị đang bị từ chối hoặc đã ngừng hoạt động.'),403);
        }
        $ip = isset($_SERVER['REMOTE_ADDR']) ? substr((string)$_SERVER['REMOTE_ADDR'],0,45) : '';
        $version = isset($input['app_version']) ? substr(trim((string)$input['app_version']),0,40) : '';
        $os = isset($input['os_name']) ? substr(trim((string)$input['os_name']),0,80) : '';
        $ipEsc=$this->db->real_escape_string($ip);$versionEsc=$this->db->real_escape_string($version);$osEsc=$this->db->real_escape_string($os);
        $sets = array("last_seen_at=NOW()","last_ip='{$ipEsc}'","updated_at=NOW()");
        if ($version !== '') $sets[] = "app_version='{$versionEsc}'";
        if ($os !== '') $sets[] = "os_name='{$osEsc}'";
        if (!$this->db->query("UPDATE tms_pos_devices SET ".implode(',',$sets)." WHERE id=".(int)$device['id'])) {
            jsonResponse(array('success'=>false,'message'=>'Không thể ghi nhận heartbeat thiết bị.'),500);
        }
        $shouldLog = empty($device['last_seen_at']) || strtotime($device['last_seen_at']) < time()-1800;
        if ($shouldLog) $this->log((int)$device['id'],'HEARTBEAT','Thiết bị kết nối đến Aurora TMS từ '.$ip,'POS Device');
        jsonResponse(array('success'=>true,'message'=>'Heartbeat đã được ghi nhận.','data'=>array(
            'device_code'=>$code,'approval_status'=>$device['approval_status'],'status'=>$device['status'],'server_time'=>date('Y-m-d H:i:s')
        )));
    }

    private function listing()
    {
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
        $status = isset($_GET['status']) ? trim((string)$_GET['status']) : 'all';
        $approval = isset($_GET['approval']) ? trim((string)$_GET['approval']) : 'all';
        $theaterId = isset($_GET['theater_id']) ? max(0,(int)$_GET['theater_id']) : 0;
        $where = array('1=1');
        if ($q !== '') { $qEsc=$this->db->real_escape_string($q); $where[]="(d.device_code LIKE '%{$qEsc}%' OR d.name LIKE '%{$qEsc}%' OR d.ip_address LIKE '%{$qEsc}%' OR d.mac_address LIKE '%{$qEsc}%' OR t.name LIKE '%{$qEsc}%')"; }
        if ($theaterId > 0) $where[]='d.theater_id='.$theaterId;
        if (in_array($approval,array('pending','approved','rejected'),true)) $where[]="d.approval_status='".$this->db->real_escape_string($approval)."'";
        if (in_array($status,array('active','inactive','maintenance'),true)) $where[]="d.status='".$this->db->real_escape_string($status)."'";
        if ($status === 'online') $where[]="d.status='active' AND d.approval_status='approved' AND d.last_seen_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE)";
        if ($status === 'offline') $where[]="d.status='active' AND d.approval_status='approved' AND (d.last_seen_at IS NULL OR d.last_seen_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE))";

        $devices = $this->all("SELECT d.*,t.name theater_name,t.city theater_city,pc.counter_code,pc.counter_name,pcr.name counter_role_name,
                CASE WHEN d.status='maintenance' THEN 'maintenance' WHEN d.status='inactive' THEN 'inactive'
                     WHEN d.approval_status<>'approved' THEN 'unregistered'
                     WHEN d.last_seen_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 'online' ELSE 'offline' END connection_status,
                (SELECT COUNT(*) FROM pos_shifts ps WHERE ps.theater_id=d.theater_id AND ps.counter=pc.counter_code AND ps.status IN ('active','paused')) open_shift_count,
                (SELECT COUNT(*) FROM orders o INNER JOIN pos_shifts ps2 ON ps2.id=o.pos_shift_id WHERE ps2.theater_id=d.theater_id AND ps2.counter=pc.counter_code AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_orders,
                (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o INNER JOIN pos_shifts ps3 ON ps3.id=o.pos_shift_id WHERE ps3.theater_id=d.theater_id AND ps3.counter=pc.counter_code AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_revenue
            FROM tms_pos_devices d INNER JOIN theaters t ON t.id=d.theater_id
            LEFT JOIN pos_counters pc ON pc.id=d.counter_id LEFT JOIN pos_counter_roles pcr ON pcr.code=pc.counter_role_code
            WHERE ".implode(' AND ',$where)."
            ORDER BY CASE d.approval_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
                     CASE WHEN d.last_seen_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 0 ELSE 1 END,t.name,d.name");
        $summary = $this->one("SELECT COUNT(*) total,
                SUM(CASE WHEN approval_status='pending' THEN 1 ELSE 0 END) pending,
                SUM(CASE WHEN approval_status='approved' THEN 1 ELSE 0 END) approved,
                SUM(CASE WHEN approval_status='rejected' THEN 1 ELSE 0 END) rejected,
                SUM(CASE WHEN status='active' AND approval_status='approved' AND last_seen_at>=DATE_SUB(NOW(),INTERVAL 5 MINUTE) THEN 1 ELSE 0 END) online,
                SUM(CASE WHEN status='active' AND approval_status='approved' AND (last_seen_at IS NULL OR last_seen_at<DATE_SUB(NOW(),INTERVAL 5 MINUTE)) THEN 1 ELSE 0 END) offline,
                SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END) maintenance,
                SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) inactive
            FROM tms_pos_devices");
        $theaters = $this->all("SELECT id,name,city FROM theaters ORDER BY name");
        $counters = $this->all("SELECT pc.id,pc.theater_id,pc.counter_code,pc.counter_name,pc.counter_role_code,pcr.name counter_role_name,pc.status
            FROM pos_counters pc LEFT JOIN pos_counter_roles pcr ON pcr.code=pc.counter_role_code ORDER BY pc.theater_id,pc.sort_order,pc.counter_code");
        $logs = $this->all("SELECT l.id,l.device_id,l.action_name,l.detail,l.actor_name,l.created_at,d.device_code,d.name device_name
            FROM tms_pos_device_logs l INNER JOIN tms_pos_devices d ON d.id=l.device_id ORDER BY l.created_at DESC,l.id DESC LIMIT 40");
        jsonResponse(array('success'=>true,'data'=>array('devices'=>$devices,'summary'=>$summary,'theaters'=>$theaters,'counters'=>$counters,'logs'=>$logs,'source'=>'aurora_db','refreshed_at'=>date('Y-m-d H:i:s'))));
    }

    private function save($input, $user)
    {
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $isNew = $id <= 0;
        $theaterId = isset($input['theater_id']) ? (int)$input['theater_id'] : 0;
        $counterId = isset($input['counter_id']) ? (int)$input['counter_id'] : 0;
        $code = isset($input['device_code']) ? strtoupper(trim((string)$input['device_code'])) : '';
        $name = isset($input['name']) ? trim((string)$input['name']) : '';
        $ip = isset($input['ip_address']) ? trim((string)$input['ip_address']) : '';
        $mac = isset($input['mac_address']) ? strtoupper(trim((string)$input['mac_address'])) : '';
        $version = isset($input['app_version']) ? trim((string)$input['app_version']) : '';
        $os = isset($input['os_name']) ? trim((string)$input['os_name']) : '';
        $notes = isset($input['notes']) ? trim((string)$input['notes']) : '';
        if ($theaterId <= 0 || !$this->one("SELECT id FROM theaters WHERE id={$theaterId} LIMIT 1")) jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn rạp hợp lệ.'),422);
        if ($counterId <= 0 || !$this->one("SELECT id FROM pos_counters WHERE id={$counterId} AND theater_id={$theaterId} LIMIT 1")) jsonResponse(array('success'=>false,'message'=>'Quầy POS không thuộc rạp đã chọn.'),422);
        if (!preg_match('/^[A-Z0-9][A-Z0-9_-]{3,49}$/',$code)) jsonResponse(array('success'=>false,'message'=>'Mã thiết bị cần từ 4–50 ký tự, chỉ gồm chữ hoa, số, gạch ngang hoặc gạch dưới.'),422);
        if (strlen($name)<3 || strlen($name)>120) jsonResponse(array('success'=>false,'message'=>'Tên thiết bị cần từ 3–120 ký tự.'),422);
        if ($ip !== '' && !filter_var($ip,FILTER_VALIDATE_IP)) jsonResponse(array('success'=>false,'message'=>'Địa chỉ IP không hợp lệ.'),422);
        if ($mac !== '' && !preg_match('/^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/',$mac)) jsonResponse(array('success'=>false,'message'=>'Địa chỉ MAC phải có dạng AA:BB:CC:DD:EE:FF.'),422);
        $codeEsc=$this->db->real_escape_string($code);$nameEsc=$this->db->real_escape_string(substr($name,0,120));
        $ipEsc=$this->db->real_escape_string(substr($ip,0,45));$macEsc=$this->db->real_escape_string(substr($mac,0,50));
        $versionEsc=$this->db->real_escape_string(substr($version,0,40));$osEsc=$this->db->real_escape_string(substr($os,0,80));$notesEsc=$this->db->real_escape_string(substr($notes,0,1000));
        $duplicate = $this->one("SELECT id FROM tms_pos_devices WHERE device_code='{$codeEsc}' AND id<>".$id." LIMIT 1");
        if ($duplicate) jsonResponse(array('success'=>false,'message'=>'Mã thiết bị đã tồn tại trong aurora_db.'),409);
        $token = '';
        if ($id > 0) {
            $current = $this->one("SELECT * FROM tms_pos_devices WHERE id={$id} LIMIT 1");
            if (!$current) jsonResponse(array('success'=>false,'message'=>'Thiết bị không tồn tại.'),404);
            if (!$this->db->query("UPDATE tms_pos_devices SET theater_id={$theaterId},counter_id={$counterId},device_code='{$codeEsc}',name='{$nameEsc}',ip_address='{$ipEsc}',mac_address='{$macEsc}',app_version='{$versionEsc}',os_name='{$osEsc}',notes='{$notesEsc}',updated_at=NOW() WHERE id={$id}")) jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật thiết bị: '.$this->db->error),500);
            $this->log($id,'DEVICE_UPDATED','Cập nhật hồ sơ, cấu hình mạng và quầy vận hành.',$user['full_name']);
            $message='Đã cập nhật thiết bị '.$code.'.';
        } else {
            $token=$this->generateToken();$hash=$this->db->real_escape_string(hash('sha256',$token));$actor=$this->db->real_escape_string($user['full_name']);
            if (!$this->db->query("INSERT INTO tms_pos_devices (theater_id,counter_id,device_code,name,ip_address,mac_address,app_version,os_name,status,approval_status,activation_token_hash,notes,created_by,created_at,updated_at) VALUES ({$theaterId},{$counterId},'{$codeEsc}','{$nameEsc}','{$ipEsc}','{$macEsc}','{$versionEsc}','{$osEsc}','inactive','pending','{$hash}','{$notesEsc}','{$actor}',NOW(),NOW())")) jsonResponse(array('success'=>false,'message'=>'Không thể tạo thiết bị: '.$this->db->error),500);
            $id=(int)$this->db->insert_id;
            $this->log($id,'DEVICE_CREATED','Đăng ký thiết bị mới và chuyển vào hàng chờ phê duyệt.',$user['full_name']);
            $message='Đã đăng ký thiết bị '.$code.' vào hàng chờ phê duyệt.';
        }
        writeTmsAuditLog($this->db,$isNew?'POS_DEVICE_CREATED':'POS_DEVICE_SAVED',$message,array('module'=>'pos_devices','entity_type'=>'pos_device','entity_id'=>$id,'severity'=>'success','metadata'=>array('device_code'=>$code,'theater_id'=>$theaterId)));
        jsonResponse(array('success'=>true,'message'=>$message,'data'=>array('id'=>$id,'activation_token'=>$token)));
    }

    private function review($input, $user, $operation)
    {
        $id=isset($input['id'])?(int)$input['id']:0;$device=$this->one("SELECT * FROM tms_pos_devices WHERE id={$id} LIMIT 1");
        if (!$device) jsonResponse(array('success'=>false,'message'=>'Thiết bị không tồn tại.'),404);
        if ($device['approval_status']!=='pending') jsonResponse(array('success'=>false,'message'=>'Thiết bị không còn ở trạng thái chờ phê duyệt.'),409);
        $actor=$this->db->real_escape_string($user['full_name']);$actorId=(int)$user['id'];$token='';
        if ($operation==='approve') {
            $hash=$device['activation_token_hash'];
            if ($hash==='') { $token=$this->generateToken();$hash=$this->db->real_escape_string(hash('sha256',$token)); }
            if (!$this->db->query("UPDATE tms_pos_devices SET approval_status='approved',status='active',approved_by_id={$actorId},approved_by='{$actor}',approved_at=NOW(),rejection_reason='',activation_token_hash='{$hash}',updated_at=NOW() WHERE id={$id} AND approval_status='pending'")) jsonResponse(array('success'=>false,'message'=>'Không thể phê duyệt thiết bị.'),500);
            $message='Đã phê duyệt và kích hoạt thiết bị '.$device['device_code'].'.';$action='DEVICE_APPROVED';
        } else {
            $reason=isset($input['reason'])?trim((string)$input['reason']):'';if($reason==='')jsonResponse(array('success'=>false,'message'=>'Vui lòng nhập lý do từ chối.'),422);
            $reasonEsc=$this->db->real_escape_string(substr($reason,0,500));
            if (!$this->db->query("UPDATE tms_pos_devices SET approval_status='rejected',status='inactive',approved_by_id={$actorId},approved_by='{$actor}',approved_at=NOW(),rejection_reason='{$reasonEsc}',updated_at=NOW() WHERE id={$id} AND approval_status='pending'")) jsonResponse(array('success'=>false,'message'=>'Không thể từ chối thiết bị.'),500);
            $message='Đã từ chối thiết bị '.$device['device_code'].'.';$action='DEVICE_REJECTED';
        }
        $this->log($id,$action,$message,$user['full_name']);
        writeTmsAuditLog($this->db,$action,$message,array('module'=>'pos_devices','entity_type'=>'pos_device','entity_id'=>$id,'severity'=>$operation==='approve'?'success':'warning'));
        jsonResponse(array('success'=>true,'message'=>$message,'data'=>array('activation_token'=>$token)));
    }

    private function changeStatus($input, $user)
    {
        $id=isset($input['id'])?(int)$input['id']:0;$status=isset($input['status'])?trim((string)$input['status']):'';
        if(!in_array($status,array('active','inactive','maintenance'),true))jsonResponse(array('success'=>false,'message'=>'Trạng thái thiết bị không hợp lệ.'),422);
        $device=$this->one("SELECT * FROM tms_pos_devices WHERE id={$id} LIMIT 1");if(!$device)jsonResponse(array('success'=>false,'message'=>'Thiết bị không tồn tại.'),404);
        if($status==='active'&&$device['approval_status']!=='approved')jsonResponse(array('success'=>false,'message'=>'Chỉ thiết bị đã duyệt mới được kích hoạt.'),409);
        if(!$this->db->query("UPDATE tms_pos_devices SET status='{$status}',updated_at=NOW() WHERE id={$id}"))jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật trạng thái thiết bị.'),500);
        $labels=array('active'=>'Kích hoạt','inactive'=>'Ngừng hoạt động','maintenance'=>'Chuyển sang bảo trì');$message=$labels[$status].' thiết bị '.$device['device_code'].'.';
        $this->log($id,'STATUS_CHANGED',$message,$user['full_name']);
        writeTmsAuditLog($this->db,'POS_DEVICE_STATUS_CHANGED',$message,array('module'=>'pos_devices','entity_type'=>'pos_device','entity_id'=>$id,'severity'=>$status==='active'?'success':'warning'));
        jsonResponse(array('success'=>true,'message'=>$message));
    }

    private function rotateToken($input, $user)
    {
        $id=isset($input['id'])?(int)$input['id']:0;$device=$this->one("SELECT * FROM tms_pos_devices WHERE id={$id} LIMIT 1");if(!$device)jsonResponse(array('success'=>false,'message'=>'Thiết bị không tồn tại.'),404);
        $token=$this->generateToken();$hash=$this->db->real_escape_string(hash('sha256',$token));
        if(!$this->db->query("UPDATE tms_pos_devices SET activation_token_hash='{$hash}',last_seen_at=NULL,last_ip='',updated_at=NOW() WHERE id={$id}"))jsonResponse(array('success'=>false,'message'=>'Không thể cấp lại khóa thiết bị.'),500);
        $this->log($id,'TOKEN_ROTATED','Cấp lại khóa kích hoạt; khóa cũ đã mất hiệu lực.',$user['full_name']);
        writeTmsAuditLog($this->db,'POS_DEVICE_TOKEN_ROTATED','Cấp lại khóa kích hoạt cho '.$device['device_code'].'.',array('module'=>'pos_devices','entity_type'=>'pos_device','entity_id'=>$id,'severity'=>'warning'));
        jsonResponse(array('success'=>true,'message'=>'Đã cấp lại khóa kích hoạt cho '.$device['device_code'].'.','data'=>array('activation_token'=>$token)));
    }

    private function ensureSchema()
    {
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_pos_devices (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,theater_id BIGINT UNSIGNED NOT NULL,counter_id BIGINT UNSIGNED NULL,
            device_code VARCHAR(50) NOT NULL,name VARCHAR(120) NOT NULL,ip_address VARCHAR(45) NOT NULL DEFAULT '',mac_address VARCHAR(50) NOT NULL DEFAULT '',
            app_version VARCHAR(40) NOT NULL DEFAULT '',os_name VARCHAR(80) NOT NULL DEFAULT '',status VARCHAR(20) NOT NULL DEFAULT 'inactive',
            approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',approved_by_id BIGINT UNSIGNED NULL,approved_by VARCHAR(120) NULL,approved_at DATETIME NULL,
            rejection_reason VARCHAR(500) NOT NULL DEFAULT '',last_seen_at DATETIME NULL,last_ip VARCHAR(45) NOT NULL DEFAULT '',activation_token_hash CHAR(64) NOT NULL DEFAULT '',
            notes TEXT NULL,created_by VARCHAR(120) NOT NULL DEFAULT 'Aurora TMS',created_at DATETIME NOT NULL,updated_at DATETIME NULL,
            UNIQUE KEY uq_tms_pos_device_code (device_code),KEY idx_tms_pos_device_scope (theater_id,approval_status,status),KEY idx_tms_pos_device_seen (last_seen_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $columns=array(
            'theater_id'=>'BIGINT UNSIGNED NOT NULL DEFAULT 1','counter_id'=>'BIGINT UNSIGNED NULL','app_version'=>"VARCHAR(40) NOT NULL DEFAULT ''",'os_name'=>"VARCHAR(80) NOT NULL DEFAULT ''",
            'approval_status'=>"VARCHAR(20) NOT NULL DEFAULT 'pending'",'approved_by_id'=>'BIGINT UNSIGNED NULL','approved_at'=>'DATETIME NULL','rejection_reason'=>"VARCHAR(500) NOT NULL DEFAULT ''",
            'last_seen_at'=>'DATETIME NULL','last_ip'=>"VARCHAR(45) NOT NULL DEFAULT ''",'activation_token_hash'=>"CHAR(64) NOT NULL DEFAULT ''",'notes'=>'TEXT NULL',
            'created_by'=>"VARCHAR(120) NOT NULL DEFAULT 'Aurora TMS'",'updated_at'=>'DATETIME NULL'
        );
        foreach($columns as $column=>$definition){$found=$this->db->query("SHOW COLUMNS FROM tms_pos_devices LIKE '".$this->db->real_escape_string($column)."'");if(!$found||$found->num_rows===0)$this->db->query("ALTER TABLE tms_pos_devices ADD COLUMN `{$column}` {$definition}");}
        $this->db->query("ALTER TABLE tms_pos_devices MODIFY status VARCHAR(20) NOT NULL DEFAULT 'inactive'");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_pos_device_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,device_id BIGINT UNSIGNED NOT NULL,action_name VARCHAR(60) NOT NULL,
            detail VARCHAR(800) NOT NULL,actor_name VARCHAR(120) NOT NULL,created_at DATETIME NOT NULL,
            KEY idx_tms_pos_device_log (device_id,created_at),KEY idx_tms_pos_device_log_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $count=$this->one("SELECT COUNT(*) total FROM tms_pos_devices");
        if($count&&(int)$count['total']===0){
            $this->db->query("INSERT INTO tms_pos_devices (theater_id,counter_id,device_code,name,ip_address,mac_address,app_version,os_name,status,approval_status,notes,created_by,created_at,updated_at)
                SELECT pc.theater_id,pc.id,CONCAT('POS-',LPAD(pc.theater_id,2,'0'),'-',pc.counter_code),CONCAT(t.name,' · ',pc.counter_name),'','','','Chưa xác định','inactive','pending','Được khởi tạo từ quầy bán hàng hiện có trong aurora_db.','Aurora Migration',NOW(),NOW()
                FROM pos_counters pc INNER JOIN theaters t ON t.id=pc.theater_id");
        }
        $this->db->query("INSERT INTO tms_pos_device_logs (device_id,action_name,detail,actor_name,created_at)
            SELECT d.id,'DEVICE_CREATED','Đồng bộ hồ sơ thiết bị từ quầy POS hiện có trong aurora_db.','Aurora Migration',d.created_at
            FROM tms_pos_devices d WHERE d.created_by='Aurora Migration'
            AND NOT EXISTS (SELECT 1 FROM tms_pos_device_logs l WHERE l.device_id=d.id)");
    }

    private function requireSuperAdmin()
    {
        $user=requireAdmin();$role=AdminController::normalizeRole($user['role']);
        if($role!=='super_admin')jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được quản lý và phê duyệt thiết bị POS.'),403);
        return $user;
    }

    private function generateToken()
    {
        if(function_exists('openssl_random_pseudo_bytes'))return 'pdv_'.bin2hex(openssl_random_pseudo_bytes(24));
        return 'pdv_'.sha1(uniqid((string)mt_rand(),true)).sha1(uniqid((string)mt_rand(),true));
    }

    private function log($deviceId,$action,$detail,$actor)
    {
        $actionEsc=$this->db->real_escape_string(substr($action,0,60));$detailEsc=$this->db->real_escape_string(substr($detail,0,800));$actorEsc=$this->db->real_escape_string(substr($actor,0,120));
        $this->db->query("INSERT INTO tms_pos_device_logs (device_id,action_name,detail,actor_name,created_at) VALUES (".(int)$deviceId.",'{$actionEsc}','{$detailEsc}','{$actorEsc}',NOW())");
    }

    private function one($sql){$result=$this->db->query($sql);if(!$result)jsonResponse(array('success'=>false,'message'=>'Lỗi dữ liệu thiết bị POS: '.$this->db->error),500);$row=$result->fetch_assoc();return $row?$row:array();}
    private function all($sql){$result=$this->db->query($sql);if(!$result)jsonResponse(array('success'=>false,'message'=>'Lỗi dữ liệu thiết bị POS: '.$this->db->error),500);$rows=array();while($row=$result->fetch_assoc())$rows[]=$row;return $rows;}
}
