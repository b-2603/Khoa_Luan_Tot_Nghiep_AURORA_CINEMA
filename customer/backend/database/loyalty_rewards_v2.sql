USE aurora_db;

-- Aurora Rewards v2: 1 diem = 1.000 VND khi thanh toan tai POS.
-- Ve tich 5%, san pham tich 10%; VIP duoc cong them 3 diem phan tram.
ALTER TABLE users MODIFY membership_level ENUM('STANDARD','SILVER','GOLD','VIP','PLATINUM') NOT NULL DEFAULT 'STANDARD';

ALTER TABLE loyalty_point_transactions DROP INDEX uq_loyalty_booking;
ALTER TABLE loyalty_point_transactions
  ADD COLUMN order_id BIGINT UNSIGNED NULL AFTER booking_id,
  ADD COLUMN ticket_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER points_change,
  ADD COLUMN product_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER ticket_amount,
  ADD COLUMN ticket_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER product_amount,
  ADD COLUMN product_rate DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER ticket_rate,
  ADD COLUMN point_value_vnd INT UNSIGNED NOT NULL DEFAULT 1 AFTER product_rate,
  ADD UNIQUE KEY uq_loyalty_order_type (order_id, transaction_type),
  ADD KEY idx_loyalty_booking (booking_id);

ALTER TABLE orders
  ADD COLUMN loyalty_points_redeemed INT UNSIGNED NOT NULL DEFAULT 0 AFTER promotion_discount_amount,
  ADD COLUMN loyalty_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER loyalty_points_redeemed,
  ADD COLUMN loyalty_points_earned INT UNSIGNED NOT NULL DEFAULT 0 AFTER loyalty_discount_amount;

UPDATE users SET membership_level='VIP' WHERE membership_level='PLATINUM';
UPDATE customer_membership_tiers SET is_active=0 WHERE tier_code='PLATINUM';
INSERT INTO customer_membership_tiers
  (tier_code,tier_name,min_points,theme_color,benefits_json,sort_order,is_active,created_at,updated_at)
VALUES
  ('VIP','VIP',5000,'#0d1b2e','["Cộng thêm 3% tích điểm cho vé","Cộng thêm 3% tích điểm cho hàng hóa","Dùng điểm trực tiếp tại POS"]',4,1,NOW(),NOW())
ON DUPLICATE KEY UPDATE tier_name=VALUES(tier_name),min_points=VALUES(min_points),theme_color=VALUES(theme_color),benefits_json=VALUES(benefits_json),sort_order=VALUES(sort_order),is_active=1,updated_at=NOW();

UPDATE customer_membership_tiers SET benefits_json='["Tích 5% giá trị vé","Tích 10% giá trị hàng hóa","Dùng điểm tại POS"]' WHERE tier_code IN ('STANDARD','SILVER','GOLD');
