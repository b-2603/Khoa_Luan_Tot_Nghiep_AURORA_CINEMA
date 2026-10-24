USE aurora_db;

CREATE TABLE IF NOT EXISTS customer_ai_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  onboarding_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
  preferred_genres VARCHAR(255) NULL,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  onboarding_completed_at DATETIME NULL,
  updated_at DATETIME NOT NULL,
  KEY idx_ai_profile_onboarding (onboarding_status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ai_conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_key VARCHAR(64) NOT NULL,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'vi',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_message_at DATETIME NULL,
  UNIQUE KEY uq_ai_conversation_key (conversation_key),
  KEY idx_ai_conversation_user (user_id, updated_at),
  KEY idx_ai_conversation_session (session_key, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ai_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  client_message_id VARCHAR(80) NULL,
  sender VARCHAR(20) NOT NULL,
  message_text TEXT NOT NULL,
  intent VARCHAR(50) NULL,
  metadata_json TEXT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_ai_message_client (conversation_id, sender, client_message_id),
  KEY idx_ai_message_conversation (conversation_id, id),
  KEY idx_ai_message_intent (intent, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_ai_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(40) NOT NULL,
  step_key VARCHAR(60) NULL,
  metadata_json TEXT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_ai_event_user (user_id, created_at),
  KEY idx_ai_event_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Nâng cấp an toàn cho database đã có các bảng từ phiên bản trước.
SET @aurora_has_client_message_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_ai_messages'
    AND COLUMN_NAME = 'client_message_id'
);
SET @aurora_add_client_message_id := IF(
  @aurora_has_client_message_id = 0,
  'ALTER TABLE customer_ai_messages ADD COLUMN client_message_id VARCHAR(80) NULL AFTER conversation_id',
  'SELECT 1'
);
PREPARE aurora_stmt FROM @aurora_add_client_message_id;
EXECUTE aurora_stmt;
DEALLOCATE PREPARE aurora_stmt;

SET @aurora_has_client_message_index := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_ai_messages'
    AND INDEX_NAME = 'uq_ai_message_client'
);
SET @aurora_add_client_message_index := IF(
  @aurora_has_client_message_index = 0,
  'ALTER TABLE customer_ai_messages ADD UNIQUE KEY uq_ai_message_client (conversation_id, sender, client_message_id)',
  'SELECT 1'
);
PREPARE aurora_stmt FROM @aurora_add_client_message_index;
EXECUTE aurora_stmt;
DEALLOCATE PREPARE aurora_stmt;

ALTER TABLE customer_ai_profiles CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE customer_ai_conversations CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE customer_ai_messages CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
ALTER TABLE customer_ai_events CONVERT TO CHARACTER SET utf8 COLLATE utf8_unicode_ci;
