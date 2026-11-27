SET NAMES utf8;
USE `aurora_db`;

CREATE TABLE IF NOT EXISTS online_payment_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'VNPAY',
  txn_ref VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  provider_transaction_no VARCHAR(40) NULL,
  bank_code VARCHAR(30) NULL,
  card_type VARCHAR(30) NULL,
  response_code VARCHAR(10) NULL,
  transaction_status VARCHAR(10) NULL,
  pay_date VARCHAR(20) NULL,
  raw_response TEXT NULL,
  expires_at DATETIME NOT NULL,
  paid_at DATETIME NULL,
  failed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  tmn_code VARCHAR(30) NULL,
  request_ip VARCHAR(45) NULL,
  order_info VARCHAR(255) NULL,
  return_received_at DATETIME NULL,
  ipn_received_at DATETIME NULL,
  last_callback_at DATETIME NULL,
  callback_count INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_online_payment_txn_ref (txn_ref),
  KEY idx_online_payment_booking (booking_id),
  KEY idx_online_payment_status (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='tmn_code')=0,'ALTER TABLE online_payment_transactions ADD tmn_code VARCHAR(30) NULL','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='request_ip')=0,'ALTER TABLE online_payment_transactions ADD request_ip VARCHAR(45) NULL','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='order_info')=0,'ALTER TABLE online_payment_transactions ADD order_info VARCHAR(255) NULL','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='return_received_at')=0,'ALTER TABLE online_payment_transactions ADD return_received_at DATETIME NULL','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='ipn_received_at')=0,'ALTER TABLE online_payment_transactions ADD ipn_received_at DATETIME NULL','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='last_callback_at')=0,'ALTER TABLE online_payment_transactions ADD last_callback_at DATETIME NULL','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;
SET @ddl=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='online_payment_transactions' AND COLUMN_NAME='callback_count')=0,'ALTER TABLE online_payment_transactions ADD callback_count INT UNSIGNED NOT NULL DEFAULT 0','SELECT 1');PREPARE stmt FROM @ddl;EXECUTE stmt;DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS online_payment_callback_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT UNSIGNED NULL,
  txn_ref VARCHAR(100) NOT NULL,
  callback_type VARCHAR(20) NOT NULL,
  signature_valid TINYINT(1) NOT NULL DEFAULT 0,
  response_code VARCHAR(10) NULL,
  transaction_status VARCHAR(10) NULL,
  source_ip VARCHAR(45) NULL,
  payload TEXT NOT NULL,
  processing_result VARCHAR(80) NULL,
  received_at DATETIME NOT NULL,
  KEY idx_vnpay_callback_txn(transaction_id),
  KEY idx_vnpay_callback_ref(txn_ref,received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
