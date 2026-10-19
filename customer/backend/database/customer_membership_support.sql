USE aurora_db;

CREATE TABLE IF NOT EXISTS customer_membership_tiers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, tier_code VARCHAR(20) NOT NULL UNIQUE,
  tier_name VARCHAR(60) NOT NULL, min_points INT UNSIGNED NOT NULL DEFAULT 0,
  theme_color VARCHAR(20) NOT NULL, benefits_json TEXT NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS customer_support_categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, category_code VARCHAR(30) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL, description VARCHAR(255) NOT NULL DEFAULT '',
  icon_name VARCHAR(40) NOT NULL DEFAULT 'help', sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS customer_support_faqs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, category_code VARCHAR(30) NOT NULL,
  question VARCHAR(255) NOT NULL, answer_text TEXT NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
  KEY idx_support_faq_category (category_code,is_active,sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS customer_support_tickets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ticket_code VARCHAR(24) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL, session_key VARCHAR(128) NOT NULL,
  full_name VARCHAR(120) NOT NULL, email VARCHAR(150) NOT NULL, phone VARCHAR(30) NOT NULL DEFAULT '',
  category_code VARCHAR(30) NOT NULL, subject VARCHAR(180) NOT NULL, message_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW', priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
  KEY idx_support_ticket_user (user_id,created_at), KEY idx_support_ticket_status (status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
