-- Aurora Cinema internal communication tables.
-- Run against aurora_db. This migration is additive and preserves messages.
USE `aurora_db`;

CREATE TABLE IF NOT EXISTS `aurora_internal_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sender_system` VARCHAR(8) NOT NULL,
  `sender_user_id` BIGINT UNSIGNED NOT NULL,
  `recipient_system` VARCHAR(8) NOT NULL,
  `recipient_user_id` BIGINT UNSIGNED NOT NULL,
  `group_id` BIGINT UNSIGNED NULL,
  `content` TEXT NOT NULL,
  `topic_tag` VARCHAR(80) NULL,
  `reply_to_id` BIGINT UNSIGNED NULL,
  `message_type` VARCHAR(16) NOT NULL DEFAULT 'text',
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_message_sender` (`sender_system`,`sender_user_id`,`created_at`),
  KEY `idx_message_recipient` (`recipient_system`,`recipient_user_id`,`read_at`,`created_at`),
  KEY `idx_message_thread` (`sender_system`,`sender_user_id`,`recipient_system`,`recipient_user_id`,`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `aurora_chat_groups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL, `description` VARCHAR(240) NULL,
  `created_by_system` VARCHAR(8) NOT NULL, `created_by_user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `aurora_chat_group_members` (
  `group_id` BIGINT UNSIGNED NOT NULL, `member_system` VARCHAR(8) NOT NULL,
  `member_user_id` BIGINT UNSIGNED NOT NULL, `member_role` VARCHAR(16) NOT NULL DEFAULT 'member',
  `joined_at` DATETIME NOT NULL, `left_at` DATETIME NULL,
  PRIMARY KEY (`group_id`,`member_system`,`member_user_id`),
  KEY `idx_group_member` (`member_system`,`member_user_id`,`left_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `aurora_chat_group_reads` (
  `group_id` BIGINT UNSIGNED NOT NULL, `member_system` VARCHAR(8) NOT NULL,
  `member_user_id` BIGINT UNSIGNED NOT NULL, `last_read_message_id` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `read_at` DATETIME NOT NULL,
  PRIMARY KEY (`group_id`,`member_system`,`member_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `aurora_message_attachments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(120) NOT NULL,
  `size_bytes` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attachment_message` (`message_id`),
  KEY `idx_attachment_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `aurora_message_reactions` (
  `message_id` BIGINT UNSIGNED NOT NULL,
  `actor_system` VARCHAR(8) NOT NULL,
  `actor_user_id` BIGINT UNSIGNED NOT NULL,
  `emoji` VARCHAR(16) NOT NULL,
  `created_at` DATETIME NOT NULL,
  PRIMARY KEY (`message_id`,`actor_system`,`actor_user_id`,`emoji`),
  KEY `idx_reaction_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
