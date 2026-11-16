-- CMS nội dung Customer Website dùng chung aurora_db.
CREATE TABLE IF NOT EXISTS marketing_content_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, content_id BIGINT UNSIGNED NOT NULL,
  action_name VARCHAR(40) NOT NULL, snapshot_json TEXT NULL, actor_id BIGINT UNSIGNED NULL,
  actor_name VARCHAR(120) NULL, created_at DATETIME NOT NULL,
  KEY idx_content_history (content_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
CREATE TABLE IF NOT EXISTS marketing_content_assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, content_id BIGINT UNSIGNED NULL,
  file_name VARCHAR(180) NOT NULL, original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL, file_size INT UNSIGNED NOT NULL, public_url VARCHAR(500) NOT NULL,
  uploaded_by BIGINT UNSIGNED NULL, created_at DATETIME NOT NULL,
  KEY idx_content_asset (content_id), KEY idx_content_asset_uploader (uploaded_by, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
