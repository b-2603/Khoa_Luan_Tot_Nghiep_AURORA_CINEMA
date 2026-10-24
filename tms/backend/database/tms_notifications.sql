-- Aurora TMS notification inbox.
-- Source workflows remain authoritative; api.php synchronises outstanding work
-- into this durable, per-user inbox without creating demo data.
USE aurora_db;

CREATE TABLE IF NOT EXISTS tms_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  notification_key VARCHAR(160) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'system',
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  title VARCHAR(180) NOT NULL,
  message VARCHAR(600) NOT NULL,
  target_roles VARCHAR(255) NOT NULL DEFAULT 'all',
  target_user_id BIGINT UNSIGNED NULL,
  theater_id BIGINT UNSIGNED NULL,
  action_view VARCHAR(80) NULL,
  action_label VARCHAR(100) NULL,
  entity_type VARCHAR(60) NULL,
  entity_id BIGINT UNSIGNED NULL,
  created_by VARCHAR(120) NOT NULL DEFAULT 'Aurora System',
  created_at DATETIME NOT NULL,
  expires_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tms_notification_key (notification_key),
  KEY idx_tms_notification_scope (target_user_id, theater_id, created_at),
  KEY idx_tms_notification_roles (target_roles),
  KEY idx_tms_notification_entity (entity_type, entity_id),
  KEY idx_tms_notification_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS tms_notification_receipts (
  notification_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME NULL,
  dismissed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (notification_id, user_id),
  KEY idx_tms_notification_receipt_user (user_id, read_at, dismissed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
