USE aurora_db;

-- Tách dữ liệu điều hành vòng đời khỏi hồ sơ danh mục phim.
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='management_priority')=0,"ALTER TABLE movies ADD management_priority VARCHAR(20) NOT NULL DEFAULT 'normal'",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='management_note')=0,'ALTER TABLE movies ADD management_note TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='lifecycle_updated_by')=0,'ALTER TABLE movies ADD lifecycle_updated_by VARCHAR(120) NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND COLUMN_NAME='lifecycle_updated_at')=0,'ALTER TABLE movies ADD lifecycle_updated_at DATETIME NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='movies' AND INDEX_NAME='idx_movies_management_priority')=0,'CREATE INDEX idx_movies_management_priority ON movies (management_priority,status,release_date)','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
