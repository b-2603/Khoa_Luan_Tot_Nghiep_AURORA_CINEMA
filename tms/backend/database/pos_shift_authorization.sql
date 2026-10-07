USE aurora_db;

SET @has_authorizer_id := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='aurora_db' AND TABLE_NAME='pos_shifts' AND COLUMN_NAME='authorized_by_tms_user_id');
SET @sql := IF(@has_authorizer_id=0,'ALTER TABLE pos_shifts ADD authorized_by_tms_user_id BIGINT UNSIGNED NULL','SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_authorizer_name := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='aurora_db' AND TABLE_NAME='pos_shifts' AND COLUMN_NAME='authorized_by_name');
SET @sql := IF(@has_authorizer_name=0,'ALTER TABLE pos_shifts ADD authorized_by_name VARCHAR(120) NULL','SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @has_authorizer_role := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='aurora_db' AND TABLE_NAME='pos_shifts' AND COLUMN_NAME='authorized_by_role');
SET @sql := IF(@has_authorizer_role=0,'ALTER TABLE pos_shifts ADD authorized_by_role VARCHAR(30) NULL','SELECT 1');
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

CREATE TABLE IF NOT EXISTS pos_management_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  theater_id BIGINT UNSIGNED NOT NULL,
  pos_user_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_name VARCHAR(120) NOT NULL,
  action_name VARCHAR(50) NOT NULL,
  detail VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_pos_management_theater_created (theater_id,created_at),
  KEY idx_pos_management_user_created (pos_user_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
