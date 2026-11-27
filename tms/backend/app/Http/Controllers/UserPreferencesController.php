<?php

/** Personal TMS appearance preferences for every authenticated actor. */
class UserPreferencesController
{
    private $db;

    public function __construct($db) { $this->db = $db; }

    public static function defaults()
    {
        return array(
            'menu_position'=>'left',
            'background_theme'=>'cloud',
            'accent_color'=>'aurora',
            'interface_density'=>'comfortable',
            'font_scale'=>'medium',
            'sidebar_default'=>'expanded',
            'content_width'=>'contained',
            'sidebar_theme'=>'navy',
            'topbar_style'=>'light',
            'card_style'=>'elevated',
            'corner_style'=>'soft',
            'table_style'=>'clean',
            'scrollbar_style'=>'slim',
            'reduce_motion'=>false,
            'high_contrast'=>false,
            'show_footer'=>true,
            'sticky_topbar'=>false,
            'show_notifications'=>true,
            'show_greeting'=>true,
            'show_role_badge'=>true,
            'remember_last_view'=>true,
            'highlight_focus'=>true
        );
    }

    private function columnExists($column)
    {
        $escaped = $this->db->real_escape_string($column);
        $result = $this->db->query("SHOW COLUMNS FROM tms_user_preferences LIKE '{$escaped}'");
        return $result && $result->num_rows > 0;
    }

    private function ensureSchema()
    {
        $created = (bool)$this->db->query("CREATE TABLE IF NOT EXISTS tms_user_preferences (
            user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
            menu_position VARCHAR(12) NOT NULL DEFAULT 'left',
            background_theme VARCHAR(20) NOT NULL DEFAULT 'cloud',
            accent_color VARCHAR(20) NOT NULL DEFAULT 'aurora',
            interface_density VARCHAR(20) NOT NULL DEFAULT 'comfortable',
            font_scale VARCHAR(12) NOT NULL DEFAULT 'medium',
            sidebar_default VARCHAR(12) NOT NULL DEFAULT 'expanded',
            content_width VARCHAR(12) NOT NULL DEFAULT 'contained',
            sidebar_theme VARCHAR(12) NOT NULL DEFAULT 'navy',
            topbar_style VARCHAR(12) NOT NULL DEFAULT 'light',
            card_style VARCHAR(12) NOT NULL DEFAULT 'elevated',
            corner_style VARCHAR(12) NOT NULL DEFAULT 'soft',
            table_style VARCHAR(12) NOT NULL DEFAULT 'clean',
            scrollbar_style VARCHAR(12) NOT NULL DEFAULT 'slim',
            reduce_motion TINYINT(1) NOT NULL DEFAULT 0,
            high_contrast TINYINT(1) NOT NULL DEFAULT 0,
            show_footer TINYINT(1) NOT NULL DEFAULT 1,
            sticky_topbar TINYINT(1) NOT NULL DEFAULT 0,
            show_notifications TINYINT(1) NOT NULL DEFAULT 1,
            show_greeting TINYINT(1) NOT NULL DEFAULT 1,
            show_role_badge TINYINT(1) NOT NULL DEFAULT 1,
            remember_last_view TINYINT(1) NOT NULL DEFAULT 1,
            highlight_focus TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            KEY idx_tms_preferences_updated (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
        if (!$created) return false;

        // Upgrade existing installations without requiring a manual database import.
        $columns = array(
            'sidebar_theme'=>"VARCHAR(12) NOT NULL DEFAULT 'navy'",
            'topbar_style'=>"VARCHAR(12) NOT NULL DEFAULT 'light'",
            'card_style'=>"VARCHAR(12) NOT NULL DEFAULT 'elevated'",
            'corner_style'=>"VARCHAR(12) NOT NULL DEFAULT 'soft'",
            'table_style'=>"VARCHAR(12) NOT NULL DEFAULT 'clean'",
            'scrollbar_style'=>"VARCHAR(12) NOT NULL DEFAULT 'slim'",
            'sticky_topbar'=>'TINYINT(1) NOT NULL DEFAULT 0',
            'show_notifications'=>'TINYINT(1) NOT NULL DEFAULT 1',
            'show_greeting'=>'TINYINT(1) NOT NULL DEFAULT 1',
            'show_role_badge'=>'TINYINT(1) NOT NULL DEFAULT 1',
            'remember_last_view'=>'TINYINT(1) NOT NULL DEFAULT 1',
            'highlight_focus'=>'TINYINT(1) NOT NULL DEFAULT 1'
        );
        foreach ($columns as $name => $definition) {
            if (!$this->columnExists($name) && !$this->db->query("ALTER TABLE tms_user_preferences ADD COLUMN {$name} {$definition} AFTER content_width")) return false;
        }
        return true;
    }

    private function valuesForUser($userId)
    {
        $preferences = self::defaults();
        $result = $this->db->query("SELECT * FROM tms_user_preferences WHERE user_id=".(int)$userId." LIMIT 1");
        $row = $result ? $result->fetch_assoc() : null;
        if ($row) {
            foreach ($preferences as $key => $defaultValue) {
                if (!array_key_exists($key, $row)) continue;
                $preferences[$key] = is_bool($defaultValue) ? (int)$row[$key] === 1 : $row[$key];
            }
        }
        return array('preferences'=>$preferences,'updated_at'=>$row && !empty($row['updated_at']) ? $row['updated_at'] : null);
    }

    private function validate($input)
    {
        $allowed = array(
            'menu_position'=>array('left','right'),
            'background_theme'=>array('cloud','paper','warm','mist','midnight'),
            'accent_color'=>array('aurora','blue','emerald','violet','rose'),
            'interface_density'=>array('comfortable','compact'),
            'font_scale'=>array('small','medium','large'),
            'sidebar_default'=>array('expanded','collapsed'),
            'content_width'=>array('contained','wide'),
            'sidebar_theme'=>array('navy','charcoal','light'),
            'topbar_style'=>array('light','soft','accent'),
            'card_style'=>array('elevated','outlined','flat'),
            'corner_style'=>array('square','soft','rounded'),
            'table_style'=>array('clean','striped','grid'),
            'scrollbar_style'=>array('slim','standard')
        );
        $booleanKeys = array('reduce_motion','high_contrast','show_footer','sticky_topbar','show_notifications','show_greeting','show_role_badge','remember_last_view','highlight_focus');
        $defaults = self::defaults(); $clean = array(); $errors = array();
        foreach ($input as $key => $value) {
            if (!array_key_exists($key, $defaults)) { $errors[$key] = 'Tùy chọn không được hỗ trợ.'; continue; }
            if (isset($allowed[$key])) {
                $text = trim((string)$value);
                if (!in_array($text, $allowed[$key], true)) $errors[$key] = 'Giá trị không hợp lệ.';
                else $clean[$key] = $text;
            } else if (in_array($key, $booleanKeys, true)) {
                if (!in_array($value, array(true,false,0,1,'0','1'), true)) $errors[$key] = 'Giá trị bật/tắt không hợp lệ.';
                else $clean[$key] = ($value === true || $value === 1 || $value === '1');
            }
        }
        return array($clean,$errors);
    }

    public function handle($requestMethod)
    {
        $user = requireAdmin(); $userId = (int)$user['id'];
        if (!$this->ensureSchema()) jsonResponse(array('success'=>false,'message'=>'Không thể khởi tạo bảng tùy chọn giao diện trong aurora_db: '.$this->db->error), 500);

        if ($requestMethod === 'GET') jsonResponse(array('success'=>true,'data'=>$this->valuesForUser($userId)));
        if ($requestMethod === 'DELETE') {
            if (!$this->db->query("DELETE FROM tms_user_preferences WHERE user_id={$userId}")) jsonResponse(array('success'=>false,'message'=>'Không thể khôi phục cài đặt mặc định.'),500);
            writeTmsAuditLog($this->db,'USER_PREFERENCES_RESET','Khôi phục giao diện TMS mặc định.',array('module'=>'account','entity_type'=>'user_preference','entity_id'=>(string)$userId,'severity'=>'info'));
            jsonResponse(array('success'=>true,'message'=>'Đã khôi phục giao diện mặc định.','data'=>$this->valuesForUser($userId)));
        }
        if ($requestMethod !== 'PUT' && $requestMethod !== 'POST') jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);

        $body = requestJson(); $submitted = isset($body['preferences']) && is_array($body['preferences']) ? $body['preferences'] : array();
        list($clean,$errors) = $this->validate($submitted);
        if ($errors) jsonResponse(array('success'=>false,'message'=>'Một số tùy chọn chưa hợp lệ.','errors'=>$errors),422);
        if (!$clean) jsonResponse(array('success'=>false,'message'=>'Không có thay đổi nào để lưu.'),422);

        $current = $this->valuesForUser($userId); $next = array_merge($current['preferences'],$clean);
        $stringKeys=array('menu_position','background_theme','accent_color','interface_density','font_scale','sidebar_default','content_width','sidebar_theme','topbar_style','card_style','corner_style','table_style','scrollbar_style');
        $escaped=array(); foreach($stringKeys as $key)$escaped[$key]=$this->db->real_escape_string($next[$key]);
        $reduce=$next['reduce_motion']?1:0;$contrast=$next['high_contrast']?1:0;$footer=$next['show_footer']?1:0;
        $sticky=$next['sticky_topbar']?1:0;$notifications=$next['show_notifications']?1:0;$greeting=$next['show_greeting']?1:0;$roleBadge=$next['show_role_badge']?1:0;$remember=$next['remember_last_view']?1:0;$focus=$next['highlight_focus']?1:0;
        $sql="INSERT INTO tms_user_preferences (user_id,menu_position,background_theme,accent_color,interface_density,font_scale,sidebar_default,content_width,sidebar_theme,topbar_style,card_style,corner_style,table_style,scrollbar_style,reduce_motion,high_contrast,show_footer,sticky_topbar,show_notifications,show_greeting,show_role_badge,remember_last_view,highlight_focus,created_at,updated_at) VALUES
            ({$userId},'{$escaped['menu_position']}','{$escaped['background_theme']}','{$escaped['accent_color']}','{$escaped['interface_density']}','{$escaped['font_scale']}','{$escaped['sidebar_default']}','{$escaped['content_width']}','{$escaped['sidebar_theme']}','{$escaped['topbar_style']}','{$escaped['card_style']}','{$escaped['corner_style']}','{$escaped['table_style']}','{$escaped['scrollbar_style']}',{$reduce},{$contrast},{$footer},{$sticky},{$notifications},{$greeting},{$roleBadge},{$remember},{$focus},NOW(),NOW())
            ON DUPLICATE KEY UPDATE menu_position=VALUES(menu_position),background_theme=VALUES(background_theme),accent_color=VALUES(accent_color),interface_density=VALUES(interface_density),font_scale=VALUES(font_scale),sidebar_default=VALUES(sidebar_default),content_width=VALUES(content_width),sidebar_theme=VALUES(sidebar_theme),topbar_style=VALUES(topbar_style),card_style=VALUES(card_style),corner_style=VALUES(corner_style),table_style=VALUES(table_style),scrollbar_style=VALUES(scrollbar_style),reduce_motion=VALUES(reduce_motion),high_contrast=VALUES(high_contrast),show_footer=VALUES(show_footer),sticky_topbar=VALUES(sticky_topbar),show_notifications=VALUES(show_notifications),show_greeting=VALUES(show_greeting),show_role_badge=VALUES(show_role_badge),remember_last_view=VALUES(remember_last_view),highlight_focus=VALUES(highlight_focus),updated_at=NOW()";
        if (!$this->db->query($sql)) jsonResponse(array('success'=>false,'message'=>'Không thể lưu tùy chọn giao diện vào aurora_db: '.$this->db->error),500);
        writeTmsAuditLog($this->db,'USER_PREFERENCES_UPDATED','Cập nhật tùy chọn giao diện TMS.',array('module'=>'account','entity_type'=>'user_preference','entity_id'=>(string)$userId,'severity'=>'success','metadata'=>array('keys'=>array_keys($clean))));
        jsonResponse(array('success'=>true,'message'=>'Đã lưu và áp dụng cài đặt giao diện.','data'=>$this->valuesForUser($userId)));
    }
}
