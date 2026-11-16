<?php

$databaseDir = dirname(__FILE__);
$config = require dirname($databaseDir) . '/config/app.php';
$database = $config['db'];
$db = new mysqli($database['host'], $database['username'], $database['password'], $database['database'], (int)$database['port']);
if ($db->connect_errno) {
    fwrite(STDERR, "Khong the ket noi aurora_db: {$db->connect_error}\n");
    exit(1);
}
$db->set_charset('utf8');

function addColumnWhenMissing($db, $table, $column, $definition)
{
    $result = $db->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
    if ($result && $result->num_rows > 0) return true;
    return (bool)$db->query("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
}

if (!$db->query("ALTER TABLE marketing_promotions MODIFY approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'")) {
    fwrite(STDERR, "Khong the mo rong trang thai phe duyet: {$db->error}\n");
    exit(1);
}
if (!$db->query("ALTER TABLE marketing_promotions MODIFY discount_type VARCHAR(30) NOT NULL DEFAULT 'percent'")) { fwrite(STDERR, "Khong the mo rong loai quyen loi Marketing: {$db->error}\n"); exit(1); }
$promotionColumns = array(
    'description'=>'VARCHAR(255) NULL','details'=>'TEXT NULL','terms_text'=>'TEXT NULL','category'=>"VARCHAR(30) NOT NULL DEFAULT 'ticket'",
    'audience'=>"VARCHAR(30) NOT NULL DEFAULT 'all'",'badge_text'=>'VARCHAR(60) NULL','theme_color'=>"VARCHAR(20) NOT NULL DEFAULT '#D99A1B'",
    'image_url'=>'VARCHAR(500) NULL','min_order_amount'=>'DECIMAL(12,2) NOT NULL DEFAULT 0','max_discount'=>'DECIMAL(12,2) NOT NULL DEFAULT 0',
    'usage_limit'=>'INT UNSIGNED NOT NULL DEFAULT 0','is_featured'=>'TINYINT(1) NOT NULL DEFAULT 0','publication_status'=>"VARCHAR(30) NOT NULL DEFAULT 'draft'",
    'submitted_by'=>'VARCHAR(120) NULL','submitted_at'=>'DATETIME NULL','reviewed_by'=>'VARCHAR(120) NULL','reviewed_at'=>'DATETIME NULL',
    'review_note'=>'TEXT NULL','published_by'=>'VARCHAR(120) NULL','published_at'=>'DATETIME NULL','voucher_id'=>'BIGINT UNSIGNED NULL',
    'benefit_type'=>"VARCHAR(30) NOT NULL DEFAULT 'percent'",'benefit_title'=>'VARCHAR(150) NULL','benefit_description'=>'TEXT NULL',
    'gift_product_id'=>'BIGINT UNSIGNED NULL','gift_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0','buy_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0',
    'get_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0','application_scope'=>"VARCHAR(20) NOT NULL DEFAULT 'order'",'redemption_instructions'=>'TEXT NULL',
    'source_type'=>"VARCHAR(30) NOT NULL DEFAULT 'marketing_plan'",'admin_objective'=>'TEXT NULL','coordination_note'=>'TEXT NULL'
);
foreach ($promotionColumns as $column=>$definition) {
    if (!addColumnWhenMissing($db, 'marketing_promotions', $column, $definition)) { fwrite(STDERR, "Loi marketing_promotions.{$column}: {$db->error}\n"); exit(1); }
}
$db->query("UPDATE marketing_promotions SET approval_status='pending_approval' WHERE approval_status='pending'");
if (!$db->query("CREATE TABLE IF NOT EXISTS marketing_promotion_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,promotion_id BIGINT UNSIGNED NOT NULL,action_name VARCHAR(40) NOT NULL,
    from_status VARCHAR(30) NULL,to_status VARCHAR(30) NOT NULL,actor_id BIGINT UNSIGNED NULL,actor_name VARCHAR(120) NOT NULL,
    actor_role VARCHAR(40) NOT NULL,note TEXT NULL,created_at DATETIME NOT NULL,KEY idx_mkt_promotion_history (promotion_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci")) { fwrite(STDERR, "Khong the tao lich su duyet: {$db->error}\n"); exit(1); }
if (!$db->query("CREATE TABLE IF NOT EXISTS promotion_theater_deployments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,promotion_id BIGINT UNSIGNED NOT NULL,voucher_id BIGINT UNSIGNED NOT NULL,theater_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',received_by BIGINT UNSIGNED NULL,received_by_name VARCHAR(120) NULL,received_at DATETIME NULL,
    pos_button_label VARCHAR(50) NULL,pos_button_color VARCHAR(20) NOT NULL DEFAULT '#D99A1B',pos_button_icon VARCHAR(30) NOT NULL DEFAULT 'gift',
    pos_sort_order INT NOT NULL DEFAULT 0,applies_to VARCHAR(20) NOT NULL DEFAULT 'all',pos_enabled TINYINT(1) NOT NULL DEFAULT 0,
    configured_by BIGINT UNSIGNED NULL,configured_by_name VARCHAR(120) NULL,configured_at DATETIME NULL,redemption_count INT UNSIGNED NOT NULL DEFAULT 0,
    last_redeemed_at DATETIME NULL,created_at DATETIME NOT NULL,updated_at DATETIME NULL,UNIQUE KEY uq_promotion_theater (promotion_id,theater_id),
    KEY idx_promotion_deployment_theater (theater_id,status,pos_enabled),KEY idx_promotion_deployment_voucher (voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci")) { fwrite(STDERR, "Khong the tao bang phan phoi CTKM: {$db->error}\n"); exit(1); }
if (!$db->query("CREATE TABLE IF NOT EXISTS promotion_media_assets (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,promotion_id BIGINT UNSIGNED NULL,file_name VARCHAR(180) NOT NULL,original_name VARCHAR(255) NOT NULL,mime_type VARCHAR(80) NOT NULL,file_size INT UNSIGNED NOT NULL,public_url VARCHAR(500) NOT NULL,uploaded_by BIGINT UNSIGNED NULL,created_at DATETIME NOT NULL,KEY idx_promotion_media_promotion(promotion_id),KEY idx_promotion_media_uploader(uploaded_by,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci")) { fwrite(STDERR, "Khong the tao thu vien anh CTKM: {$db->error}\n"); exit(1); }
if (!$db->query("CREATE TABLE IF NOT EXISTS promotion_department_assignments (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,promotion_id BIGINT UNSIGNED NOT NULL,recipient_role VARCHAR(40) NOT NULL,recipient_label VARCHAR(120) NOT NULL,theater_id BIGINT UNSIGNED NULL,responsibility TEXT NOT NULL,due_date DATE NULL,status VARCHAR(30) NOT NULL DEFAULT 'assigned',assigned_by BIGINT UNSIGNED NOT NULL,assigned_by_name VARCHAR(120) NOT NULL,assigned_at DATETIME NOT NULL,accepted_at DATETIME NULL,completed_at DATETIME NULL,updated_at DATETIME NULL,KEY idx_promotion_assignment(promotion_id,status),KEY idx_promotion_recipient(recipient_role,theater_id,status)) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci")) { fwrite(STDERR, "Khong the tao bang phan cong CTKM: {$db->error}\n"); exit(1); }
$db->query("ALTER TABLE vouchers MODIFY discount_type VARCHAR(30) NOT NULL DEFAULT 'percent'");
$voucherColumns = array(
    'short_description'=>'VARCHAR(255) NULL','details'=>'TEXT NULL','terms_text'=>'TEXT NULL','category'=>"VARCHAR(30) NOT NULL DEFAULT 'ticket'",
    'audience'=>"VARCHAR(30) NOT NULL DEFAULT 'all'",'badge_text'=>'VARCHAR(60) NULL','theme_color'=>"VARCHAR(20) NOT NULL DEFAULT '#D99A1B'",
    'image_url'=>'VARCHAR(500) NULL','min_order_amount'=>'DECIMAL(12,2) NOT NULL DEFAULT 0','max_discount'=>'DECIMAL(12,2) NOT NULL DEFAULT 0',
    'is_featured'=>'TINYINT(1) NOT NULL DEFAULT 0','sort_order'=>'INT NOT NULL DEFAULT 0','source_promotion_id'=>'BIGINT UNSIGNED NULL',
    'benefit_type'=>"VARCHAR(30) NOT NULL DEFAULT 'percent'",'benefit_title'=>'VARCHAR(150) NULL','benefit_description'=>'TEXT NULL',
    'gift_product_id'=>'BIGINT UNSIGNED NULL','gift_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0','buy_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0',
    'get_quantity'=>'INT UNSIGNED NOT NULL DEFAULT 0','application_scope'=>"VARCHAR(20) NOT NULL DEFAULT 'order'",'redemption_instructions'=>'TEXT NULL'
);
foreach ($voucherColumns as $column=>$definition) {
    if (!addColumnWhenMissing($db, 'vouchers', $column, $definition)) { fwrite(STDERR, "Loi vouchers.{$column}: {$db->error}\n"); exit(1); }
}
$orderColumns=array('promotion_deployment_id'=>'BIGINT UNSIGNED NULL','voucher_code'=>'VARCHAR(40) NULL','promotion_discount_amount'=>'DECIMAL(12,2) NOT NULL DEFAULT 0');
foreach($orderColumns as $column=>$definition){if(!addColumnWhenMissing($db,'orders',$column,$definition)){fwrite(STDERR,"Loi orders.{$column}: {$db->error}\n");exit(1);}}
$checks = array();
$result = $db->query("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND ((TABLE_NAME='marketing_promotions' AND COLUMN_NAME IN ('publication_status','review_note','voucher_id')) OR (TABLE_NAME='vouchers' AND COLUMN_NAME IN ('source_promotion_id','short_description','terms_text'))) ORDER BY TABLE_NAME,COLUMN_NAME");
while ($row = $result->fetch_assoc()) $checks[] = $row['TABLE_NAME'] . '.' . $row['COLUMN_NAME'];
echo "Da nang cap quy trinh khuyen mai trong aurora_db.\n";
echo "Da xac minh: " . implode(', ', $checks) . "\n";
