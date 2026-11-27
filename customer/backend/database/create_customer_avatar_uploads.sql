USE aurora_db;

CREATE TABLE IF NOT EXISTS customer_avatar_uploads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  avatar_url VARCHAR(500) NOT NULL,
  storage_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  image_width INT UNSIGNED NOT NULL,
  image_height INT UNSIGNED NOT NULL,
  source_width INT UNSIGNED NULL,
  source_height INT UNSIGNED NULL,
  crop_offset_x DECIMAL(7,4) NULL,
  crop_offset_y DECIMAL(7,4) NULL,
  crop_zoom DECIMAL(7,4) NULL,
  crop_output_size INT UNSIGNED NULL,
  status ENUM('ACTIVE','REPLACED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_customer_avatar_user_status (user_id, status),
  CONSTRAINT fk_customer_avatar_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
