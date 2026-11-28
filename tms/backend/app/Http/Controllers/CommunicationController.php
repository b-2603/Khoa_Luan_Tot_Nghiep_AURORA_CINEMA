<?php

/** One-to-one EMS/TMS messaging. Metadata lives in aurora_db. */
class CommunicationController
{
    const MAX_FILE_SIZE = 26214400;
    private $db;
    private $topics = array('Hỗ trợ vận hành', 'Lịch làm việc', 'Sự cố hệ thống', 'Thông báo nghiệp vụ');
    private $reactionCodes = array('👍'=>'like', '❤️'=>'heart', '😂'=>'laugh', '😮'=>'wow', '😢'=>'sad', '🎉'=>'celebrate');

    public function __construct($db) { $this->db = $db; }

    public static function ensureSchema($db)
    {
        $queries = array(
            "CREATE TABLE IF NOT EXISTS aurora_internal_messages (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                sender_system VARCHAR(8) NOT NULL, sender_user_id BIGINT UNSIGNED NOT NULL,
                recipient_system VARCHAR(8) NOT NULL, recipient_user_id BIGINT UNSIGNED NOT NULL,
                content TEXT NOT NULL, topic_tag VARCHAR(80) NULL, reply_to_id BIGINT UNSIGNED NULL,
                message_type VARCHAR(16) NOT NULL DEFAULT 'text', read_at DATETIME NULL,
                created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
                KEY idx_message_sender(sender_system,sender_user_id,created_at),
                KEY idx_message_recipient(recipient_system,recipient_user_id,read_at,created_at),
                KEY idx_message_thread(sender_system,sender_user_id,recipient_system,recipient_user_id,id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS aurora_message_attachments (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, message_id BIGINT UNSIGNED NOT NULL,
                original_name VARCHAR(255) NOT NULL, stored_name VARCHAR(255) NOT NULL,
                mime_type VARCHAR(120) NOT NULL, size_bytes BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL,
                UNIQUE KEY uq_attachment_message(message_id), KEY idx_attachment_message(message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS aurora_message_reactions (
                message_id BIGINT UNSIGNED NOT NULL, actor_system VARCHAR(8) NOT NULL,
                actor_user_id BIGINT UNSIGNED NOT NULL, emoji VARCHAR(191) NOT NULL, created_at DATETIME NOT NULL,
                PRIMARY KEY(message_id,actor_system,actor_user_id,emoji), KEY idx_reaction_message(message_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS aurora_emoji_history (
                actor_system VARCHAR(8) NOT NULL, actor_user_id BIGINT UNSIGNED NOT NULL,
                emoji VARCHAR(191) NOT NULL, use_count INT UNSIGNED NOT NULL DEFAULT 1,
                last_used_at DATETIME NOT NULL,
                PRIMARY KEY(actor_system,actor_user_id,emoji),
                KEY idx_emoji_history_recent(actor_system,actor_user_id,last_used_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS aurora_chat_groups (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL,
                description VARCHAR(255) NULL, created_by_system VARCHAR(8) NOT NULL,
                created_by_user_id BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
                KEY idx_chat_group_updated(updated_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS aurora_chat_group_members (
                group_id BIGINT UNSIGNED NOT NULL, member_system VARCHAR(8) NOT NULL,
                member_user_id BIGINT UNSIGNED NOT NULL, member_role VARCHAR(16) NOT NULL DEFAULT 'member',
                joined_at DATETIME NOT NULL, left_at DATETIME NULL,
                PRIMARY KEY(group_id,member_system,member_user_id), KEY idx_group_member(member_system,member_user_id,left_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci",
            "CREATE TABLE IF NOT EXISTS aurora_chat_group_reads (
                group_id BIGINT UNSIGNED NOT NULL, member_system VARCHAR(8) NOT NULL,
                member_user_id BIGINT UNSIGNED NOT NULL, last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
                read_at DATETIME NOT NULL, PRIMARY KEY(group_id,member_system,member_user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci"
        );
        foreach ($queries as $query) if (!$db->query($query)) return false;
        foreach (array('reply_to_id'=>'BIGINT UNSIGNED NULL AFTER topic_tag','message_type'=>"VARCHAR(16) NOT NULL DEFAULT 'text' AFTER reply_to_id",'group_id'=>'BIGINT UNSIGNED NULL AFTER recipient_user_id') as $name=>$definition) {
            $found = $db->query("SHOW COLUMNS FROM aurora_internal_messages LIKE '{$name}'");
            if ((!$found || !$found->num_rows) && !$db->query("ALTER TABLE aurora_internal_messages ADD COLUMN `{$name}` {$definition}")) return false;
        }
        $reactionColumn=$db->query("SHOW COLUMNS FROM aurora_message_reactions LIKE 'emoji'");
        $reactionDefinition=$reactionColumn?$reactionColumn->fetch_assoc():null;
        if($reactionDefinition&&strtolower($reactionDefinition['Type'])!=='varchar(191)'&&!$db->query("ALTER TABLE aurora_message_reactions MODIFY emoji VARCHAR(191) NOT NULL"))return false;
        $indexes = array(
            'aurora_internal_messages'=>array('idx_message_thread'=>'sender_system,sender_user_id,recipient_system,recipient_user_id,id'),
            'aurora_message_attachments'=>array('idx_attachment_message'=>'message_id'),
            'aurora_message_reactions'=>array('idx_reaction_message'=>'message_id')
        );
        foreach ($indexes as $table=>$tableIndexes) foreach ($tableIndexes as $name=>$columns) {
            $found=$db->query("SHOW INDEX FROM `{$table}` WHERE Key_name='{$name}'");
            if ((!$found || !$found->num_rows) && !$db->query("CREATE INDEX `{$name}` ON `{$table}` ({$columns})")) return false;
        }
        return true;
    }

    private function failDatabase($message) { jsonResponse(array('success'=>false,'message'=>$message.' '.$this->db->error), 500); }
    private function uploadDir() { return dirname(dirname(dirname(dirname(dirname(dirname(__FILE__)))))).DIRECTORY_SEPARATOR.'uploads'.DIRECTORY_SEPARATOR.'communications'; }

    /** Store Unicode emoji as ASCII hex so this also works on legacy utf8 tables. */
    private function encodeReaction($emoji)
    {
        $emoji=trim((string)$emoji);
        $emojiPattern='/^(?=[\s\S]*[\x{1F000}-\x{1FAFF}\x{1F1E6}-\x{1F1FF}\x{200D}\x{20E3}\x{2300}-\x{23FF}\x{2600}-\x{27BF}\x{2B00}-\x{2BFF}])\X$/u';
        if($emoji===''||strlen($emoji)>64||!preg_match($emojiPattern,$emoji))return null;
        return 'u'.bin2hex($emoji);
    }

    private function decodeReaction($stored)
    {
        $legacy=array_search($stored,$this->reactionCodes,true);if($legacy!==false)return $legacy;
        if(strlen($stored)>1&&$stored[0]==='u'&&ctype_xdigit(substr($stored,1))&&strlen(substr($stored,1))%2===0){$decoded=pack('H*',substr($stored,1));if($decoded!==false)return $decoded;}
        return $stored;
    }

    private function recentEmojis($me)
    {
        $items=array();
        $result=$this->db->query("SELECT emoji FROM aurora_emoji_history WHERE actor_system='tms' AND actor_user_id=".(int)$me." ORDER BY last_used_at DESC,use_count DESC LIMIT 24");
        if(!$result)return $items;
        while($row=$result->fetch_assoc())$items[]=$this->decodeReaction($row['emoji']);
        return $items;
    }

    private function partner($value)
    {
        if (!preg_match('/^(tms|ems|group):(\d+)$/', (string)$value, $match)) jsonResponse(array('success'=>false,'message'=>'Cuộc trò chuyện không hợp lệ.'),422);
        return array('system'=>$match[1], 'id'=>(int)$match[2], 'ref'=>$match[1].':'.(int)$match[2]);
    }

    private function contacts($me)
    {
        $items = array();
        $result = $this->db->query("SELECT id,full_name AS name,role,email,theater_id,avatar_updated_at,IF(avatar_path IS NULL OR avatar_path='',0,1) AS has_avatar FROM users WHERE status='active' AND role<>'customer' ORDER BY full_name,id");
        if (!$result) $this->failDatabase('Không thể đọc danh bạ TMS.');
        while ($row=$result->fetch_assoc()) {
            if ((int)$row['id']===$me) continue;
            $row['id']=(int)$row['id']; $row['system']='tms'; $row['ref']='tms:'.$row['id'];
            $row['department']='Theater Management System'; $row['has_avatar']=!empty($row['has_avatar']); $row['avatar']=null; $items[]=$row;
        }
        $result = $this->db->query("SELECT id,name,role,email,department,CASE WHEN avatar LIKE 'http://%' OR avatar LIKE 'https://%' THEN avatar ELSE NULL END AS avatar FROM ems_users WHERE status='active' ORDER BY name,id");
        if (!$result) $this->failDatabase('Không thể đọc danh bạ EMS.');
        while ($row=$result->fetch_assoc()) {
            $row['id']=(int)$row['id']; $row['system']='ems'; $row['ref']='ems:'.$row['id']; $items[]=$row;
        }
        return $items;
    }

    private function requireContact($me,$partner)
    {
        if($partner['system']==='group'){
            $result=$this->db->query("SELECT g.id FROM aurora_chat_groups g JOIN aurora_chat_group_members gm ON gm.group_id=g.id WHERE g.id=".(int)$partner['id']." AND gm.member_system='tms' AND gm.member_user_id={$me} AND gm.left_at IS NULL LIMIT 1");
            if($result&&$result->fetch_assoc())return;
            jsonResponse(array('success'=>false,'message'=>'Bạn không phải thành viên của nhóm này.'),403);
        }
        foreach ($this->contacts($me) as $contact) if ($contact['ref']===$partner['ref']) return;
        jsonResponse(array('success'=>false,'message'=>'Tài khoản nhận không tồn tại hoặc đã ngừng hoạt động.'),404);
    }

    private function groupMembers($groupId)
    {
        $result=$this->db->query("SELECT gm.member_system system,gm.member_user_id id,gm.member_role,CASE WHEN gm.member_system='tms' THEN tu.full_name ELSE eu.name END name,CASE WHEN gm.member_system='tms' THEN tu.role ELSE eu.role END role FROM aurora_chat_group_members gm LEFT JOIN users tu ON gm.member_system='tms' AND tu.id=gm.member_user_id LEFT JOIN ems_users eu ON gm.member_system='ems' AND eu.id=gm.member_user_id WHERE gm.group_id={$groupId} AND gm.left_at IS NULL ORDER BY FIELD(gm.member_role,'owner','admin','member'),name");
        if(!$result)$this->failDatabase('Không thể đọc thành viên nhóm.');$items=array();while($row=$result->fetch_assoc()){$row['id']=(int)$row['id'];$row['ref']=$row['system'].':'.$row['id'];$items[]=$row;}return $items;
    }

    private function createGroup($me,$input)
    {
        $name=trim((string)(isset($input['name'])?$input['name']:''));$description=trim((string)(isset($input['description'])?$input['description']:''));$refs=isset($input['members'])&&is_array($input['members'])?array_values(array_unique($input['members'])):array();
        if(strlen($name)<3||strlen($name)>80)jsonResponse(array('success'=>false,'message'=>'Tên nhóm phải có từ 3 đến 80 ký tự.'),422);if(strlen($description)>240)jsonResponse(array('success'=>false,'message'=>'Mô tả nhóm không được vượt quá 240 ký tự.'),422);if(count($refs)<1||count($refs)>99)jsonResponse(array('success'=>false,'message'=>'Hãy chọn từ 1 đến 99 thành viên.'),422);
        $available=array();foreach($this->contacts($me) as $contact)$available[$contact['ref']]=$contact;foreach($refs as $ref)if(!isset($available[$ref]))jsonResponse(array('success'=>false,'message'=>'Danh sách thành viên có tài khoản không hợp lệ.'),422);
        $n=$this->db->real_escape_string($name);$d=$this->db->real_escape_string($description);$this->db->query('START TRANSACTION');$ok=$this->db->query("INSERT INTO aurora_chat_groups(name,description,created_by_system,created_by_user_id,created_at,updated_at) VALUES('{$n}','{$d}','tms',{$me},NOW(),NOW())");$groupId=(int)$this->db->insert_id;$ok=$ok&&$this->db->query("INSERT INTO aurora_chat_group_members(group_id,member_system,member_user_id,member_role,joined_at) VALUES({$groupId},'tms',{$me},'owner',NOW())");
        foreach($refs as $ref){$member=$this->partner($ref);if($ok)$ok=$this->db->query("INSERT INTO aurora_chat_group_members(group_id,member_system,member_user_id,member_role,joined_at) VALUES({$groupId},'{$member['system']}',{$member['id']},'member',NOW())");}
        if(!$ok){$error=$this->db->error;$this->db->query('ROLLBACK');jsonResponse(array('success'=>false,'message'=>'Không thể tạo nhóm: '.$error),500);}$this->db->query('COMMIT');jsonResponse(array('success'=>true,'data'=>array('ref'=>'group:'.$groupId)),201);
    }

    private function addGroupMembers($me,$groupId,$input)
    {
        $owner=$this->db->query("SELECT 1 FROM aurora_chat_group_members WHERE group_id={$groupId} AND member_system='tms' AND member_user_id={$me} AND member_role IN('owner','admin') AND left_at IS NULL");if(!$owner||!$owner->fetch_assoc())jsonResponse(array('success'=>false,'message'=>'Chỉ chủ nhóm hoặc quản trị viên nhóm được thêm thành viên.'),403);
        $refs=isset($input['members'])&&is_array($input['members'])?array_values(array_unique($input['members'])):array();if(!$refs)jsonResponse(array('success'=>false,'message'=>'Hãy chọn thành viên cần thêm.'),422);$available=array();foreach($this->contacts($me) as $contact)$available[$contact['ref']]=$contact;
        foreach($refs as $ref){if(!isset($available[$ref]))continue;$member=$this->partner($ref);$this->db->query("INSERT INTO aurora_chat_group_members(group_id,member_system,member_user_id,member_role,joined_at,left_at) VALUES({$groupId},'{$member['system']}',{$member['id']},'member',NOW(),NULL) ON DUPLICATE KEY UPDATE left_at=NULL,joined_at=NOW()");}$this->db->query("UPDATE aurora_chat_groups SET updated_at=NOW() WHERE id={$groupId}");jsonResponse(array('success'=>true,'data'=>array('members'=>$this->groupMembers($groupId))));
    }

    private function thread($me,$system,$id,$alias='m')
    {
        $p=$alias.'.';
        return "(({$p}sender_system='tms' AND {$p}sender_user_id={$me} AND {$p}recipient_system='{$system}' AND {$p}recipient_user_id={$id}) OR ({$p}sender_system='{$system}' AND {$p}sender_user_id={$id} AND {$p}recipient_system='tms' AND {$p}recipient_user_id={$me}))";
    }

    private function summaries($me)
    {
        $items=array();
        $ref="IF(sender_system='tms' AND sender_user_id={$me},CONCAT(recipient_system,':',recipient_user_id),CONCAT(sender_system,':',sender_user_id))";
        $result=$this->db->query("SELECT latest.ref,m.id,m.content,m.message_type,m.created_at,m.sender_system,m.sender_user_id FROM (SELECT {$ref} ref,MAX(id) last_id FROM aurora_internal_messages WHERE group_id IS NULL AND ((sender_system='tms' AND sender_user_id={$me}) OR (recipient_system='tms' AND recipient_user_id={$me})) GROUP BY ref) latest JOIN aurora_internal_messages m ON m.id=latest.last_id ORDER BY m.id DESC");
        if(!$result)$this->failDatabase('Không thể đọc danh sách hội thoại.');
        while($row=$result->fetch_assoc()){$row['id']=(int)$row['id'];$row['sender_user_id']=(int)$row['sender_user_id'];$row['mine']=$row['sender_system']==='tms'&&$row['sender_user_id']===$me;$row['unread_count']=0;$items[$row['ref']]=$row;}
        $result=$this->db->query("SELECT CONCAT(sender_system,':',sender_user_id) ref,COUNT(*) total FROM aurora_internal_messages WHERE recipient_system='tms' AND recipient_user_id={$me} AND read_at IS NULL GROUP BY sender_system,sender_user_id");
        if(!$result)$this->failDatabase('Không thể đọc trạng thái tin nhắn.');
        while($row=$result->fetch_assoc())if(isset($items[$row['ref']]))$items[$row['ref']]['unread_count']=(int)$row['total'];
        $result=$this->db->query("SELECT g.id,g.name,g.description,g.updated_at,COUNT(DISTINCT members.member_user_id) member_count,MAX(m.id) last_id FROM aurora_chat_groups g JOIN aurora_chat_group_members mine ON mine.group_id=g.id AND mine.member_system='tms' AND mine.member_user_id={$me} AND mine.left_at IS NULL JOIN aurora_chat_group_members members ON members.group_id=g.id AND members.left_at IS NULL LEFT JOIN aurora_internal_messages m ON m.group_id=g.id GROUP BY g.id ORDER BY g.updated_at DESC");
        if(!$result)$this->failDatabase('Không thể đọc danh sách nhóm.');
        while($group=$result->fetch_assoc()){
            $last=null;if($group['last_id']){$message=$this->db->query("SELECT content,message_type,created_at,sender_system,sender_user_id FROM aurora_internal_messages WHERE id=".(int)$group['last_id']);$last=$message?$message->fetch_assoc():null;}
            $read=$this->db->query("SELECT last_read_message_id FROM aurora_chat_group_reads WHERE group_id=".(int)$group['id']." AND member_system='tms' AND member_user_id={$me}");$readRow=$read?$read->fetch_assoc():null;$lastRead=$readRow?(int)$readRow['last_read_message_id']:0;
            $unread=$this->db->query("SELECT COUNT(*) total FROM aurora_internal_messages WHERE group_id=".(int)$group['id']." AND id>{$lastRead} AND NOT(sender_system='tms' AND sender_user_id={$me})");$unreadRow=$unread?$unread->fetch_assoc():array('total'=>0);
            $senderId=$last?(int)$last['sender_user_id']:0;$mine=$last&&$last['sender_system']==='tms'&&$senderId===$me;
            $items[]=array('ref'=>'group:'.$group['id'],'id'=>$last?(int)$group['last_id']:0,'content'=>$last?$last['content']:'Nhóm vừa được tạo','message_type'=>$last?$last['message_type']:'text','created_at'=>$last?$last['created_at']:$group['updated_at'],'sender_system'=>$last?$last['sender_system']:'system','sender_user_id'=>$senderId,'mine'=>$mine,'unread_count'=>(int)$unreadRow['total'],'group'=>array('id'=>(int)$group['id'],'name'=>$group['name'],'description'=>$group['description'],'member_count'=>(int)$group['member_count']));
        }
        usort($items, array('CommunicationController', 'compareConversationDate'));
        return array_values($items);
    }

    public static function compareConversationDate($left, $right)
    {
        return strcmp($right['created_at'], $left['created_at']);
    }

    private function messages($me,$system,$id)
    {
        $condition=$system==='group'?"source.group_id={$id}":$this->thread($me,$system,$id,'source');$items=array();$ids=array();
        $result=$this->db->query("SELECT m.*,a.id attachment_id,a.original_name,a.mime_type,a.size_bytes,r.content reply_content,r.message_type reply_message_type,r.sender_system reply_sender_system,CASE WHEN r.sender_system='tms' THEN rtu.full_name WHEN r.sender_system='ems' THEN reu.name ELSE NULL END reply_sender_name,CASE WHEN m.sender_system='tms' THEN tu.full_name ELSE eu.name END sender_name FROM (SELECT source.* FROM aurora_internal_messages source WHERE {$condition} ORDER BY source.id DESC LIMIT 200) m LEFT JOIN aurora_message_attachments a ON a.message_id=m.id LEFT JOIN aurora_internal_messages r ON r.id=m.reply_to_id LEFT JOIN users rtu ON r.sender_system='tms' AND rtu.id=r.sender_user_id LEFT JOIN ems_users reu ON r.sender_system='ems' AND reu.id=r.sender_user_id LEFT JOIN users tu ON m.sender_system='tms' AND tu.id=m.sender_user_id LEFT JOIN ems_users eu ON m.sender_system='ems' AND eu.id=m.sender_user_id ORDER BY m.id ASC");
        if(!$result)$this->failDatabase('Không thể đọc nội dung hội thoại.');
        while($row=$result->fetch_assoc()){
            $key=(int)$row['id'];$row['id']=$key;$row['sender_user_id']=(int)$row['sender_user_id'];$row['mine']=$row['sender_system']==='tms'&&$row['sender_user_id']===$me;
            $row['attachment']=$row['attachment_id']?array('id'=>(int)$row['attachment_id'],'name'=>$row['original_name'],'mime'=>$row['mime_type'],'size'=>(int)$row['size_bytes']):null;
            $row['reply']=$row['reply_to_id']?array('id'=>(int)$row['reply_to_id'],'content'=>$row['reply_content'],'type'=>$row['reply_message_type'],'sender_system'=>$row['reply_sender_system'],'sender_name'=>$row['reply_sender_name']):null;
            $row['reactions']=array();$items[$key]=$row;$ids[]=$key;
        }
        if($ids){
            $result=$this->db->query("SELECT message_id,emoji,COUNT(*) total,MAX(actor_system='tms' AND actor_user_id={$me}) mine FROM aurora_message_reactions WHERE message_id IN (".implode(',',$ids).") GROUP BY message_id,emoji ORDER BY MIN(created_at)");
            if(!$result)$this->failDatabase('Không thể đọc cảm xúc tin nhắn.');
            while($row=$result->fetch_assoc()){$items[(int)$row['message_id']]['reactions'][]=array('emoji'=>$this->decodeReaction($row['emoji']),'count'=>(int)$row['total'],'mine'=>(bool)$row['mine']);}
        }
        return array_values($items);
    }

    private function saveUpload($file)
    {
        if(!$file||!isset($file['error'])||$file['error']!==UPLOAD_ERR_OK||intval($file['size'])<1||intval($file['size'])>self::MAX_FILE_SIZE)jsonResponse(array('success'=>false,'message'=>'Tệp không hợp lệ hoặc vượt quá 25 MB.'),422);
        $mime=isset($file['type'])?$file['type']:'application/octet-stream';
        if(function_exists('finfo_open')){$f=finfo_open(FILEINFO_MIME_TYPE);if($f){$detected=finfo_file($f,$file['tmp_name']);finfo_close($f);if($detected)$mime=$detected;}}
        if(in_array(strtolower($mime),array('text/html','image/svg+xml','application/x-php','application/x-httpd-php','application/x-msdownload'),true))jsonResponse(array('success'=>false,'message'=>'Định dạng tệp này không được phép.'),422);
        $dir=$this->uploadDir();if(!is_dir($dir)&&!mkdir($dir,0775,true))jsonResponse(array('success'=>false,'message'=>'Không thể tạo thư mục lưu tệp.'),500);
        $ext=preg_replace('/[^a-z0-9]/','',strtolower(pathinfo($file['name'],PATHINFO_EXTENSION)));$random=function_exists('random_bytes')?bin2hex(random_bytes(18)):sha1(uniqid((string)mt_rand(),true));$stored=$random.($ext?'.'.$ext:'');
        if(!move_uploaded_file($file['tmp_name'],$dir.DIRECTORY_SEPARATOR.$stored))jsonResponse(array('success'=>false,'message'=>'Không thể lưu tệp đính kèm.'),500);
        return array('original'=>substr(basename(str_replace('\\','/',$file['name'])),0,255),'stored'=>$stored,'mime'=>$mime,'size'=>(int)$file['size'],'type'=>strpos($mime,'image/')===0?'image':(strpos($mime,'audio/')===0?'audio':'file'));
    }

    private function react($me,$system,$id,$input)
    {
        $messageId=(int)(isset($input['message_id'])?$input['message_id']:0);
        $code=$this->encodeReaction(isset($input['emoji'])?$input['emoji']:'');
        if(!$messageId||$code===null)jsonResponse(array('success'=>false,'message'=>'Vui lòng chọn đúng một biểu tượng cảm xúc.'),422);

        $thread=$system==='group'?"m.group_id={$id}":$this->thread($me,$system,$id);
        $message=$this->db->query("SELECT m.id FROM aurora_internal_messages m WHERE m.id={$messageId} AND {$thread} LIMIT 1");
        if(!$message||!$message->fetch_assoc())jsonResponse(array('success'=>false,'message'=>'Tin nhắn không thuộc cuộc trò chuyện này.'),404);

        $code=$this->db->real_escape_string($code);
        $exists=$this->db->query("SELECT 1 FROM aurora_message_reactions WHERE message_id={$messageId} AND actor_system='tms' AND actor_user_id={$me} AND emoji='{$code}' LIMIT 1");
        $active=!($exists&&$exists->num_rows);
        $sql=$active
            ? "INSERT INTO aurora_message_reactions(message_id,actor_system,actor_user_id,emoji,created_at) VALUES({$messageId},'tms',{$me},'{$code}',NOW())"
            : "DELETE FROM aurora_message_reactions WHERE message_id={$messageId} AND actor_system='tms' AND actor_user_id={$me} AND emoji='{$code}'";
        if(!$this->db->query($sql))$this->failDatabase('Không thể cập nhật cảm xúc.');
        if(!$this->db->query("INSERT INTO aurora_emoji_history(actor_system,actor_user_id,emoji,use_count,last_used_at) VALUES('tms',{$me},'{$code}',1,NOW()) ON DUPLICATE KEY UPDATE use_count=use_count+1,last_used_at=NOW()"))$this->failDatabase('Không thể lưu lịch sử emoji.');
        jsonResponse(array('success'=>true,'data'=>array('active'=>$active)));
    }

    private function send($me,$system,$id,$input)
    {
        $content=trim((string)(isset($input['content'])?$input['content']:''));$topic=trim((string)(isset($input['topic_tag'])?$input['topic_tag']:''));$reply=(int)(isset($input['reply_to_id'])?$input['reply_to_id']:0);$file=isset($_FILES['attachment'])?$_FILES['attachment']:null;
        $length=function_exists('mb_strlen')?mb_strlen($content,'UTF-8'):strlen($content);if($content===''&&!$file)jsonResponse(array('success'=>false,'message'=>'Hãy nhập nội dung hoặc chọn một tệp.'),422);if($length>4000)jsonResponse(array('success'=>false,'message'=>'Tin nhắn không được vượt quá 4.000 ký tự.'),422);if($topic!==''&&!in_array($topic,$this->topics,true))jsonResponse(array('success'=>false,'message'=>'Chủ đề trao đổi không hợp lệ.'),422);
        if($reply){$thread=$system==='group'?"m.group_id={$id}":$this->thread($me,$system,$id);$result=$this->db->query("SELECT m.id FROM aurora_internal_messages m WHERE m.id={$reply} AND {$thread} LIMIT 1");if(!$result||!$result->fetch_assoc())jsonResponse(array('success'=>false,'message'=>'Tin nhắn trả lời không hợp lệ.'),422);}
        $upload=$file?$this->saveUpload($file):null;$c=$this->db->real_escape_string($content);$t=$this->db->real_escape_string($topic);$type=$upload?$upload['type']:'text';$this->db->query('START TRANSACTION');
        $groupId=$system==='group'?$id:'NULL';$recipient=$system==='group'?'group':$system;$ok=$this->db->query("INSERT INTO aurora_internal_messages(sender_system,sender_user_id,recipient_system,recipient_user_id,group_id,content,topic_tag,reply_to_id,message_type,created_at,updated_at) VALUES('tms',{$me},'{$recipient}',{$id},{$groupId},'{$c}','{$t}',".($reply?$reply:'NULL').",'{$type}',NOW(),NOW())");$messageId=(int)$this->db->insert_id;if($ok&&$system==='group')$ok=$this->db->query("UPDATE aurora_chat_groups SET updated_at=NOW() WHERE id={$id}");
        if($ok&&$upload){$o=$this->db->real_escape_string($upload['original']);$s=$this->db->real_escape_string($upload['stored']);$m=$this->db->real_escape_string($upload['mime']);$ok=$this->db->query("INSERT INTO aurora_message_attachments(message_id,original_name,stored_name,mime_type,size_bytes,created_at) VALUES({$messageId},'{$o}','{$s}','{$m}',{$upload['size']},NOW())");}
        if(!$ok){$error=$this->db->error;$this->db->query('ROLLBACK');if($upload)@unlink($this->uploadDir().DIRECTORY_SEPARATOR.$upload['stored']);jsonResponse(array('success'=>false,'message'=>'Không thể gửi tin nhắn: '.$error),500);}
        $this->db->query('COMMIT');jsonResponse(array('success'=>true,'data'=>array('id'=>$messageId)),201);
    }

    public function download()
    {
        $user=requireAdmin();if(!self::ensureSchema($this->db))$this->failDatabase('Không thể chuẩn bị dữ liệu tệp.');$id=(int)(isset($_GET['id'])?$_GET['id']:0);$me=(int)$user['id'];
        $result=$this->db->query("SELECT a.* FROM aurora_message_attachments a JOIN aurora_internal_messages m ON m.id=a.message_id WHERE a.id={$id} AND (((m.sender_system='tms' AND m.sender_user_id={$me}) OR (m.recipient_system='tms' AND m.recipient_user_id={$me})) OR (m.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM aurora_chat_group_members gm WHERE gm.group_id=m.group_id AND gm.member_system='tms' AND gm.member_user_id={$me} AND gm.left_at IS NULL))) LIMIT 1");$row=$result?$result->fetch_assoc():null;if(!$row)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy tệp hoặc bạn không có quyền truy cập.'),404);
        $path=$this->uploadDir().DIRECTORY_SEPARATOR.$row['stored_name'];if(!is_file($path))jsonResponse(array('success'=>false,'message'=>'Tệp không còn tồn tại trên máy chủ.'),404);$name=str_replace(array("\r","\n",'"'),'',basename($row['original_name']));$preview=in_array(strtolower($row['mime_type']),array('image/jpeg','image/png','image/gif','image/webp','audio/mpeg','audio/wav','audio/ogg','audio/webm'),true)&&!empty($_GET['preview']);
        header('X-Content-Type-Options: nosniff');header('Content-Type: '.$row['mime_type']);header('Content-Length: '.filesize($path));header('Content-Disposition: '.($preview?'inline':'attachment')."; filename*=UTF-8''".rawurlencode($name));readfile($path);exit;
    }

    public function handle($method)
    {
        $user=requireAdmin();$me=(int)$user['id'];if(!self::ensureSchema($this->db))$this->failDatabase('Không thể khởi tạo kênh trao đổi trong aurora_db.');
        if($method==='GET'&&empty($_GET['partner']))jsonResponse(array('success'=>true,'data'=>array('contacts'=>$this->contacts($me),'conversations'=>$this->summaries($me),'recent_emojis'=>$this->recentEmojis($me))));
        $input=$method==='GET'?$_GET:requestJson();if($method==='POST'&&isset($input['operation'])&&$input['operation']==='create_group')$this->createGroup($me,$input);$partner=$this->partner(isset($input['partner'])?$input['partner']:'');$this->requireContact($me,$partner);$system=$this->db->real_escape_string($partner['system']);$id=(int)$partner['id'];
        if($method==='POST'&&isset($input['operation'])&&$input['operation']==='add_members'&&$system==='group')$this->addGroupMembers($me,$id,$input);
        if($method==='GET')jsonResponse(array('success'=>true,'data'=>array('items'=>$this->messages($me,$system,$id),'members'=>$system==='group'?$this->groupMembers($id):array())));
        if($method==='PUT'){if($system==='group'){$last=$this->db->query("SELECT COALESCE(MAX(id),0) id FROM aurora_internal_messages WHERE group_id={$id}")->fetch_assoc();$lastId=(int)$last['id'];if(!$this->db->query("INSERT INTO aurora_chat_group_reads(group_id,member_system,member_user_id,last_read_message_id,read_at) VALUES({$id},'tms',{$me},{$lastId},NOW()) ON DUPLICATE KEY UPDATE last_read_message_id=VALUES(last_read_message_id),read_at=NOW()"))$this->failDatabase('Không thể cập nhật trạng thái đã đọc.');}else if(!$this->db->query("UPDATE aurora_internal_messages SET read_at=COALESCE(read_at,NOW()),updated_at=NOW() WHERE sender_system='{$system}' AND sender_user_id={$id} AND recipient_system='tms' AND recipient_user_id={$me} AND read_at IS NULL"))$this->failDatabase('Không thể cập nhật trạng thái đã đọc.');jsonResponse(array('success'=>true));}
        if($method==='POST'&&isset($input['operation'])&&$input['operation']==='react')$this->react($me,$system,$id,$input);
        if($method==='POST')$this->send($me,$system,$id,$input);
        jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
    }
}
