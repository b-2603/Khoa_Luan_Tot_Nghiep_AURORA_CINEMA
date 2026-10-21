SET NAMES utf8;
USE `aurora_db`;

ALTER TABLE products MODIFY status VARCHAR(20) NOT NULL DEFAULT 'active';
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='description')=0,'ALTER TABLE products ADD description TEXT NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='unit')=0,"ALTER TABLE products ADD unit VARCHAR(40) NOT NULL DEFAULT 'Sản phẩm'",'SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='cost_price')=0,'ALTER TABLE products ADD cost_price DECIMAL(12,2) NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='customer_price')=0,'ALTER TABLE products ADD customer_price DECIMAL(12,2) NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='pos_price')=0,'ALTER TABLE products ADD pos_price DECIMAL(12,2) NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='member_price')=0,'ALTER TABLE products ADD member_price DECIMAL(12,2) NOT NULL DEFAULT 0','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='image_url')=0,'ALTER TABLE products ADD image_url VARCHAR(500) NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='created_by')=0,'ALTER TABLE products ADD created_by BIGINT UNSIGNED NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='updated_by')=0,'ALTER TABLE products ADD updated_by BIGINT UNSIGNED NULL','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS product_categories (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,code VARCHAR(40) NOT NULL UNIQUE,name VARCHAR(100) NOT NULL,sku_prefix VARCHAR(12) NOT NULL,default_unit VARCHAR(40) NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'active',sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
CREATE TABLE IF NOT EXISTS product_units (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,code VARCHAR(40) NOT NULL UNIQUE,name VARCHAR(80) NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'active',sort_order INT NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
INSERT INTO product_units(code,name,status,sort_order) VALUES
('portion','Phần','active',10),('cup','Ly','active',20),('bottle','Chai','active',30),('box','Hộp','active',40),('pack','Gói','active',50),('combo','Combo','active',60),('item','Sản phẩm','active',70)
ON DUPLICATE KEY UPDATE name=VALUES(name),status='active',sort_order=VALUES(sort_order);
DELETE FROM product_categories WHERE code NOT IN ('Popcorn','Beverages','Snacks','Hot Food','Ice Cream & Desserts','Combo','Special / Limited Edition','Upgrade','Promotion');
INSERT INTO product_categories(code,name,sku_prefix,default_unit,status,sort_order) VALUES
('Popcorn','Popcorn','POP','Hộp','active',10),('Beverages','Beverages','BEV','Ly','active',20),('Snacks','Snacks','SNK','Gói','active',30),('Hot Food','Hot Food','HOT','Phần','active',40),('Ice Cream & Desserts','Ice Cream & Desserts','ICE','Phần','active',50),('Combo','Combo','CMB','Combo','active',60),('Special / Limited Edition','Special / Limited Edition','SPL','Sản phẩm','active',70),('Upgrade','Upgrade','UPG','Phần','active',80),('Promotion','Promotion','PRO','Sản phẩm','active',90)
ON DUPLICATE KEY UPDATE name=VALUES(name),sku_prefix=VALUES(sku_prefix),default_unit=VALUES(default_unit),status='active',sort_order=VALUES(sort_order);
UPDATE products SET unit='Gói' WHERE category='Snacks' AND (unit IS NULL OR TRIM(unit)='' OR unit='Sản phẩm');
UPDATE products SET customer_price=price+10000,pos_price=price+10000,member_price=price WHERE customer_price<=0 OR pos_price<=0 OR member_price<=0;

CREATE TABLE IF NOT EXISTS product_plans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  effective_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  note TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_by_name VARCHAR(120) NOT NULL,
  sent_by BIGINT UNSIGNED NULL,
  sent_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  sent_at DATETIME NULL,
  KEY idx_product_plan_status(status,effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS product_plan_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  unit VARCHAR(40) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  planned_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  monthly_sales_target INT UNSIGNED NOT NULL DEFAULT 0,
  note VARCHAR(500) NULL,
  UNIQUE KEY uq_product_plan_item(plan_id,product_id),
  KEY idx_product_plan_item_product(product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='product_plan_items' AND COLUMN_NAME='monthly_sales_target')=0,'ALTER TABLE product_plan_items ADD monthly_sales_target INT UNSIGNED NOT NULL DEFAULT 0 AFTER planned_quantity','SELECT 1'); PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
UPDATE product_plan_items SET monthly_sales_target=planned_quantity WHERE monthly_sales_target=0 AND planned_quantity>0;

CREATE TABLE IF NOT EXISTS product_plan_theaters (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  theater_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  sent_at DATETIME NOT NULL,
  acknowledged_by BIGINT UNSIGNED NULL,
  acknowledged_by_name VARCHAR(120) NULL,
  acknowledged_at DATETIME NULL,
  response_note VARCHAR(500) NULL,
  UNIQUE KEY uq_product_plan_theater(plan_id,theater_id),
  KEY idx_product_plan_theater_scope(theater_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS theater_product_inventory (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  theater_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  reorder_level INT UNSIGNED NOT NULL DEFAULT 10,
  last_plan_id BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_theater_product_inventory(theater_id,product_id),
  KEY idx_theater_inventory_stock(theater_id,stock_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS product_inventory_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  theater_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  plan_id BIGINT UNSIGNED NULL,
  movement_type VARCHAR(30) NOT NULL,
  quantity INT NOT NULL,
  stock_before INT UNSIGNED NOT NULL,
  stock_after INT UNSIGNED NOT NULL,
  reference_code VARCHAR(80) NULL,
  performed_by BIGINT UNSIGNED NULL,
  performed_by_name VARCHAR(120) NULL,
  created_at DATETIME NOT NULL,
  KEY idx_inventory_movement_theater(theater_id,created_at),
  KEY idx_inventory_movement_product(product_id,created_at),
  KEY idx_inventory_movement_order(order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
