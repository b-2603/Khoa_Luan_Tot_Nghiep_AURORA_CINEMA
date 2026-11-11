-- Bắt buộc client đọc file này dưới UTF-8. WAMP/MySQL 5 cũ thường mặc định
-- latin1, khiến tên tiếng Việt bị lưu thành chuỗi mojibake (ví dụ Nguyá»…).
SET NAMES utf8;
USE `aurora_db`;

-- Tài khoản mẫu của actor Marketing. TMS xác thực trực tiếp trên users để
-- dùng chung một nguồn định danh với RBAC và nhật ký quản trị.
INSERT INTO users (username,password_hash,full_name,email,phone,role,status,theater_id,created_at,updated_at)
VALUES ('marketing','sha256:aurora-tms-local-2026:60c844054c978c40c98143e225c56bca1be18c66610c90e228726ec96b74d02a','Nguyễn Minh Anh','marketing@aurora.local','0909002026','marketing_manager','active',1,NOW(),NOW())
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),email=VALUES(email),phone=VALUES(phone),role='marketing_manager',status='active',password_hash=VALUES(password_hash),updated_at=NOW();

-- Actor mới dùng chung bảng users của toàn hệ thống.
-- role hiện tại là VARCHAR(30); nếu một bản cài đặt cũ dùng ENUM thì chạy dòng
-- ALTER tương ứng trước khi tạo tài khoản Marketing Manager.
-- ALTER TABLE users MODIFY role ENUM('customer','super_admin','cinema_admin','supervisor','accounting','marketing_manager') NOT NULL DEFAULT 'customer';

CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
  KEY idx_marketing_campaign_status (status,start_date,end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_promotions (
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
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_vouchers (
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
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_contents (
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
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_notifications (
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
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_customer_segments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description VARCHAR(255) NULL,
  criteria_json TEXT NULL,
  estimated_size INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_countries (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  iso_code CHAR(2) NOT NULL UNIQUE,
  name_vi VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_movie_country_status (status,sort_order,name_vi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT IGNORE INTO movie_countries (iso_code,name_vi,name_en,sort_order,status) VALUES
('VN','Việt Nam','Vietnam',1,'active'),('US','Hoa Kỳ','United States',2,'active'),
('KR','Hàn Quốc','South Korea',3,'active'),('JP','Nhật Bản','Japan',4,'active'),
('CN','Trung Quốc','China',5,'active'),('TH','Thái Lan','Thailand',6,'active'),
('HK','Hong Kong','Hong Kong',7,'active'),('GB','Anh','United Kingdom',8,'active'),
('FR','Pháp','France',9,'active'),('DE','Đức','Germany',10,'active'),
('CA','Canada','Canada',11,'active'),('AU','Úc','Australia',12,'active'),
('IN','Ấn Độ','India',13,'active'),('ES','Tây Ban Nha','Spain',14,'active'),
('IT','Ý','Italy',15,'active'),('SG','Singapore','Singapore',16,'active'),
('TW','Đài Loan','Taiwan',17,'active'),('ID','Indonesia','Indonesia',18,'active'),
('MY','Malaysia','Malaysia',19,'active'),('PH','Philippines','Philippines',20,'active');

CREATE TABLE IF NOT EXISTS movie_audio_languages (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name_vi VARCHAR(80) NOT NULL UNIQUE,
  name_en VARCHAR(80) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_movie_audio_language_status (status,sort_order,name_vi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT IGNORE INTO movie_audio_languages (code,name_vi,name_en,sort_order,status) VALUES
('vi','Tiếng Việt','Vietnamese',1,'active'),('en','Tiếng Anh','English',2,'active'),
('ko','Tiếng Hàn','Korean',3,'active'),('ja','Tiếng Nhật','Japanese',4,'active'),
('zh','Tiếng Trung','Chinese',5,'active'),('th','Tiếng Thái','Thai',6,'active'),
('fr','Tiếng Pháp','French',7,'active'),('es','Tiếng Tây Ban Nha','Spanish',8,'active'),
('de','Tiếng Đức','German',9,'active'),('ru','Tiếng Nga','Russian',10,'active'),
('hi','Tiếng Hindi','Hindi',11,'active'),('id','Tiếng Indonesia','Indonesian',12,'active');

CREATE TABLE IF NOT EXISTS movie_subtitle_options (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  label_vi VARCHAR(120) NOT NULL UNIQUE,
  label_en VARCHAR(120) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_movie_subtitle_status (status,sort_order,label_vi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT IGNORE INTO movie_subtitle_options (code,label_vi,label_en,sort_order,status) VALUES
('none','Không','None',1,'active'),('vi','Tiếng Việt','Vietnamese',2,'active'),
('en','Tiếng Anh','English',3,'active'),('vi_en','Song ngữ Việt - Anh','Vietnamese - English bilingual',4,'active'),
('sub_vi','Phụ đề Việt','Vietnamese subtitles',5,'active'),('sub_en','Phụ đề Anh','English subtitles',6,'active'),
('sub_vi_dub_vi','Phụ đề Việt / Lồng tiếng Việt','Vietnamese subtitles / Vietnamese dub',7,'active'),
('sub_vi_dub_en','Phụ đề Việt / Lồng tiếng Anh','Vietnamese subtitles / English dub',8,'active'),
('sub_en_dub_vi','Phụ đề Anh / Lồng tiếng Việt','English subtitles / Vietnamese dub',9,'active'),
('sub_vi_dub_ko','Phụ đề Việt / Lồng tiếng Hàn','Vietnamese subtitles / Korean dub',10,'active');

CREATE TABLE IF NOT EXISTS movie_plan_reason_options (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  label_vi VARCHAR(160) NOT NULL UNIQUE,
  description_vi VARCHAR(255) NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  KEY idx_movie_plan_reason_status (status,sort_order,label_vi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

INSERT IGNORE INTO movie_plan_reason_options (code,label_vi,description_vi,sort_order,status) VALUES
('market_demand','Nhu cầu thị trường cao','Phù hợp xu hướng tìm kiếm và nhu cầu xem phim hiện tại.',1,'active'),
('target_audience','Phù hợp đối tượng khán giả mục tiêu','Nội dung phù hợp nhóm khách hàng trọng tâm của Aurora Cinema.',2,'active'),
('revenue_potential','Tiềm năng doanh thu tốt','Có khả năng đạt mục tiêu vé bán và doanh thu kỳ phát hành.',3,'active'),
('strong_franchise','Thương hiệu phim có sức hút','Thuộc thương hiệu, loạt phim hoặc sở hữu dàn diễn viên nổi bật.',4,'active'),
('seasonal_fit','Phù hợp mùa vụ hoặc dịp lễ','Thời điểm phát hành phù hợp lễ, Tết, hè hoặc sự kiện đặc biệt.',5,'active'),
('content_diversity','Bổ sung đa dạng nội dung','Giúp cân bằng thể loại và làm phong phú danh mục phim đang khai thác.',6,'active'),
('marketing_support','Có lợi thế truyền thông','Có tài nguyên, đối tác hoặc chiến dịch hỗ trợ quảng bá tốt.',7,'active'),
('competitive_advantage','Tạo lợi thế cạnh tranh','Tăng sức cạnh tranh với các cụm rạp và nội dung cùng thời điểm.',8,'active'),
('customer_request','Theo yêu cầu hoặc phản hồi khách hàng','Được đề xuất từ khảo sát, lượt quan tâm hoặc phản hồi khách hàng.',9,'active'),
('strategic_partnership','Phù hợp hợp tác chiến lược','Gắn với thỏa thuận nhà phát hành hoặc đối tác chiến lược.',10,'active');

INSERT IGNORE INTO movie_audio_languages (code,name_vi,name_en,sort_order,status)
SELECT CONCAT('legacy_',LEFT(SHA1(TRIM(original_language)),12)),TRIM(original_language),TRIM(original_language),90,'active'
FROM movies WHERE original_language IS NOT NULL AND TRIM(original_language)<>'' GROUP BY TRIM(original_language);
INSERT IGNORE INTO movie_subtitle_options (code,label_vi,label_en,sort_order,status)
SELECT CONCAT('legacy_',LEFT(SHA1(TRIM(localization_versions)),12)),TRIM(localization_versions),TRIM(localization_versions),90,'active'
FROM movies WHERE localization_versions IS NOT NULL AND TRIM(localization_versions)<>'' GROUP BY TRIM(localization_versions);

-- Quy trình Marketing lập kế hoạch -> Admin Tổng duyệt -> phân bổ đến rạp.
CREATE TABLE IF NOT EXISTS marketing_movie_plan_history (
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
  KEY idx_mkt_plan_history (plan_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Phản hồi có cấu trúc của Admin Tổng theo từng hạng mục kế hoạch.
CREATE TABLE IF NOT EXISTS marketing_movie_plan_review_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  review_round INT UNSIGNED NOT NULL DEFAULT 1,
  section_key VARCHAR(40) NOT NULL,
  section_label VARCHAR(120) NOT NULL DEFAULT '',
  field_key VARCHAR(60) NOT NULL DEFAULT '',
  field_label VARCHAR(120) NOT NULL,
  current_value TEXT NULL,
  comment TEXT NOT NULL,
  status ENUM('open','resolved') NOT NULL DEFAULT 'open',
  created_by BIGINT UNSIGNED NULL,
  created_by_name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  KEY idx_mkt_plan_review (plan_id,status,review_round)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_movie_plan_review_items' AND COLUMN_NAME='section_label')=0,"ALTER TABLE marketing_movie_plan_review_items ADD section_label VARCHAR(120) NOT NULL DEFAULT ''",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_movie_plan_review_items' AND COLUMN_NAME='field_key')=0,"ALTER TABLE marketing_movie_plan_review_items ADD field_key VARCHAR(60) NOT NULL DEFAULT ''",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_movie_plan_review_items' AND COLUMN_NAME='current_value')=0,'ALTER TABLE marketing_movie_plan_review_items ADD current_value TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='marketing_owner_id')=0,'ALTER TABLE movie_plans ADD marketing_owner_id BIGINT UNSIGNED NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='approval_status')=0,"ALTER TABLE movie_plans ADD approval_status VARCHAR(30) NOT NULL DEFAULT 'draft'",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='submitted_by')=0,'ALTER TABLE movie_plans ADD submitted_by VARCHAR(120) NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='submitted_at')=0,'ALTER TABLE movie_plans ADD submitted_at DATETIME NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='reviewed_by')=0,'ALTER TABLE movie_plans ADD reviewed_by VARCHAR(120) NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='reviewed_at')=0,'ALTER TABLE movie_plans ADD reviewed_at DATETIME NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='approval_note')=0,'ALTER TABLE movie_plans ADD approval_note TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='recommendation_reason')=0,'ALTER TABLE movie_plans ADD recommendation_reason TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='recommendation_reason_codes')=0,'ALTER TABLE movie_plans ADD recommendation_reason_codes TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='recommendation_reason_detail')=0,'ALTER TABLE movie_plans ADD recommendation_reason_detail TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='target_tickets')=0,'ALTER TABLE movie_plans ADD target_tickets INT UNSIGNED NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='campaign_name')=0,'ALTER TABLE movie_plans ADD campaign_name VARCHAR(200) NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='marketing_budget')=0,'ALTER TABLE movie_plans ADD marketing_budget DECIMAL(14,2) NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='promotion_proposed')=0,'ALTER TABLE movie_plans ADD promotion_proposed TINYINT(1) NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='release_rights_status')=0,"ALTER TABLE movie_plans ADD release_rights_status VARCHAR(30) NOT NULL DEFAULT 'pending_verification'",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movie_plans' AND COLUMN_NAME='content_classification_status')=0,"ALTER TABLE movie_plans ADD content_classification_status VARCHAR(30) NOT NULL DEFAULT 'pending_review'",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='marketing_owner_id')=0,'ALTER TABLE movies ADD marketing_owner_id BIGINT UNSIGNED NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE movie_plans SET approval_status=CASE WHEN status='draft' THEN 'draft' ELSE 'approved' END WHERE marketing_owner_id IS NULL;
UPDATE movie_plans SET recommendation_reason_detail=recommendation_reason WHERE (recommendation_reason_detail IS NULL OR TRIM(recommendation_reason_detail)='') AND recommendation_reason IS NOT NULL AND TRIM(recommendation_reason)<>'';
