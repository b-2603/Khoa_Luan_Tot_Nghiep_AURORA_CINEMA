USE aurora_db;

CREATE TABLE IF NOT EXISTS pos_counter_roles (
  code VARCHAR(30) NOT NULL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  can_sell_tickets TINYINT(1) NOT NULL DEFAULT 0,
  can_sell_concessions TINYINT(1) NOT NULL DEFAULT 0,
  can_redeem_online_booking TINYINT(1) NOT NULL DEFAULT 0,
  can_sell_merchandise TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT INTO pos_counter_roles
  (code,name,description,can_sell_tickets,can_sell_concessions,can_redeem_online_booking,can_sell_merchandise,is_active,sort_order,updated_at)
VALUES
  ('concession','Concession','Đổi vé online và bán bắp nước trực tiếp',0,1,1,0,1,10,NOW()),
  ('box_ticket','Box Ticket','Bán vé tại quầy và bán kèm bắp nước',1,1,0,0,1,20,NOW()),
  ('merchandise','Merchandise','Bán quà lưu niệm và sản phẩm phim',0,0,0,1,1,30,NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),can_sell_tickets=VALUES(can_sell_tickets),can_sell_concessions=VALUES(can_sell_concessions),can_redeem_online_booking=VALUES(can_redeem_online_booking),can_sell_merchandise=VALUES(can_sell_merchandise),is_active=VALUES(is_active),sort_order=VALUES(sort_order),updated_at=NOW();

SET @has_counter_role := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='aurora_db' AND TABLE_NAME='pos_users' AND COLUMN_NAME='counter_role_code');
SET @sql := IF(@has_counter_role=0,"ALTER TABLE pos_users ADD counter_role_code VARCHAR(30) NOT NULL DEFAULT 'box_ticket'","SELECT 1");
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

CREATE TABLE IF NOT EXISTS pos_booking_redemptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  theater_id BIGINT UNSIGNED NOT NULL,
  pos_user_id BIGINT UNSIGNED NOT NULL,
  pos_shift_id BIGINT UNSIGNED NULL,
  redeemed_at DATETIME NOT NULL,
  note VARCHAR(255) NULL,
  UNIQUE KEY uq_pos_booking_redemption (booking_id),
  KEY idx_pos_redemption_theater_date (theater_id,redeemed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
