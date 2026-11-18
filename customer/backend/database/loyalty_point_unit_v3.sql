USE aurora_db;

-- V3: 1 diem Aurora = 1 VND.
UPDATE loyalty_point_transactions SET points_change=points_change*1000,balance_after=balance_after*1000,point_value_vnd=1;
UPDATE users SET points=points*1000 WHERE role='customer';
UPDATE orders SET loyalty_points_redeemed=loyalty_points_redeemed*1000,loyalty_points_earned=loyalty_points_earned*1000;
ALTER TABLE loyalty_point_transactions MODIFY point_value_vnd INT UNSIGNED NOT NULL DEFAULT 1;
UPDATE customer_membership_tiers SET min_points=CASE tier_code WHEN 'STANDARD' THEN 0 WHEN 'SILVER' THEN 500000 WHEN 'GOLD' THEN 2000000 WHEN 'VIP' THEN 5000000 WHEN 'PLATINUM' THEN 5000000 ELSE min_points END;
