-- Membership card data in aurora_db. The customer API also provisions this
-- table automatically for existing environments.
CREATE TABLE IF NOT EXISTS customer_membership_cards (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  card_number BIGINT UNSIGNED NOT NULL,
  activated_at DATETIME NOT NULL,
  expires_at DATE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_membership_card_user (user_id),
  UNIQUE KEY uq_membership_card_number (card_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
