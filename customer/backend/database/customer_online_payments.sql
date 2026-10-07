USE aurora_db;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  method VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference_code VARCHAR(80) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  INDEX idx_payments_order (order_id),
  UNIQUE KEY uq_payments_reference (reference_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
