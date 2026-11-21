<?php
/** Shared EMS/TMS direct messaging stored in aurora_db. */
class CommunicationController {
    private $db;
    public function __construct($db){$this->db=$db;}
    public static function ensureSchema($db){
        return (bool)$db->query("CREATE TABLE IF NOT EXISTS aurora_internal_messages (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          sender_system VARCHAR(8) NOT NULL, sender_user_id BIGINT UNSIGNED NOT NULL,
          recipient_system VARCHAR(8) NOT NULL, recipient_user_id BIGINT UNSIGNED NOT NULL,
          content TEXT NOT NULL, topic_tag VARCHAR(80) NULL, read_at DATETIME NULL,
          created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
          KEY idx_message_sender (sender_system,sender_user_id,created_at),
          KEY idx_message_recipient (recipient_system,recipient_user_id,read_at,created_at),
          KEY idx_message_thread (sender_system,sender_user_id,recipient_system,recipient_user_id,created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
    }
    private function contacts($me){
        $items=array();$result=$this->db->query("SELECT id,full_name AS name,role,email,theater_id FROM users WHERE status='active' AND role<>'customer' ORDER BY full_name");
        if($result)while($row=$result->fetch_assoc()){if($me['system']==='tms'&&(int)$row['id']===$me['id'])continue;$row['system']='tms';$row['ref']='tms:'.$row['id'];$row['department']='Theater Management System';$items[]=$row;}
        $result=$this->db->query("SELECT id,name,role,email,department,avatar FROM ems_users WHERE status='active' ORDER BY name");
        if($result)while($row=$result->fetch_assoc()){if($me['system']==='ems'&&(int)$row['id']===$me['id'])continue;$row['system']='ems';$row['ref']='ems:'.$row['id'];$items[]=$row;}
        return $items;
    }
    private function parsePartner($ref){
        if(!preg_match('/^(tms|ems):(\d+)$/',(string)$ref,$m))jsonResponse(array('success'=>false,'message'=>'Người nhận không hợp lệ.'),422);
        return array('system'=>$m[1],'id'=>(int)$m[2]);
    }
    public function handle($method){
        $user=requireAdmin();$me=array('system'=>'tms','id'=>(int)$user['id']);
        if(!self::ensureSchema($this->db))jsonResponse(array('success'=>false,'message'=>'Không thể khởi tạo kênh trao đổi trong aurora_db: '.$this->db->error),500);
        if($method==='GET'&&empty($_GET['partner'])){
            $contacts=$this->contacts($me);$unread=array();$conversationRefs=array();
            $r=$this->db->query("SELECT IF(sender_system='tms' AND sender_user_id={$me['id']},CONCAT(recipient_system,':',recipient_user_id),CONCAT(sender_system,':',sender_user_id)) ref,MAX(id) last_id FROM aurora_internal_messages WHERE (sender_system='tms' AND sender_user_id={$me['id']}) OR (recipient_system='tms' AND recipient_user_id={$me['id']}) GROUP BY ref ORDER BY last_id DESC");
            if($r)while($x=$r->fetch_assoc())$conversationRefs[]=$x['ref'];
            $r=$this->db->query("SELECT CONCAT(sender_system,':',sender_user_id) ref,COUNT(*) total FROM aurora_internal_messages WHERE recipient_system='tms' AND recipient_user_id={$me['id']} AND read_at IS NULL GROUP BY sender_system,sender_user_id");
            if($r)while($x=$r->fetch_assoc())$unread[$x['ref']]=(int)$x['total'];
            jsonResponse(array('success'=>true,'data'=>array('contacts'=>$contacts,'conversation_refs'=>$conversationRefs,'unread'=>$unread,'me'=>array('ref'=>'tms:'.$me['id'],'name'=>$user['full_name'],'role'=>$user['role']))));
        }
        $input=$method==='GET'?$_GET:requestJson();$partner=$this->parsePartner(isset($input['partner'])?$input['partner']:'');
        $ps=$this->db->real_escape_string($partner['system']);$pid=(int)$partner['id'];$mid=$me['id'];
        $thread="((sender_system='tms' AND sender_user_id={$mid} AND recipient_system='{$ps}' AND recipient_user_id={$pid}) OR (sender_system='{$ps}' AND sender_user_id={$pid} AND recipient_system='tms' AND recipient_user_id={$mid}))";
        if($method==='GET'){
            $rows=array();$r=$this->db->query("SELECT id,sender_system,sender_user_id,recipient_system,recipient_user_id,content,topic_tag,read_at,created_at FROM aurora_internal_messages WHERE {$thread} ORDER BY id ASC LIMIT 500");
            if($r)while($x=$r->fetch_assoc()){$x['mine']=$x['sender_system']==='tms'&&(int)$x['sender_user_id']===$mid;$rows[]=$x;}
            jsonResponse(array('success'=>true,'data'=>$rows));
        }
        if($method==='PUT'){
            $this->db->query("UPDATE aurora_internal_messages SET read_at=COALESCE(read_at,NOW()),updated_at=NOW() WHERE sender_system='{$ps}' AND sender_user_id={$pid} AND recipient_system='tms' AND recipient_user_id={$mid}");
            jsonResponse(array('success'=>true));
        }
        if($method==='POST'){
            $content=trim(isset($input['content'])?(string)$input['content']:'');$topic=trim(isset($input['topic_tag'])?(string)$input['topic_tag']:'');
            if($content===''||strlen($content)>4000)jsonResponse(array('success'=>false,'message'=>'Tin nhắn phải có từ 1 đến 4.000 ký tự.'),422);
            $content=$this->db->real_escape_string($content);$topic=$this->db->real_escape_string(substr($topic,0,80));
            if(!$this->db->query("INSERT INTO aurora_internal_messages(sender_system,sender_user_id,recipient_system,recipient_user_id,content,topic_tag,created_at,updated_at) VALUES('tms',{$mid},'{$ps}',{$pid},'{$content}','{$topic}',NOW(),NOW())"))jsonResponse(array('success'=>false,'message'=>'Không thể gửi tin nhắn.'),500);
            jsonResponse(array('success'=>true,'message'=>'Đã gửi tin nhắn.','data'=>array('id'=>(int)$this->db->insert_id)),201);
        }
        jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
    }
}
