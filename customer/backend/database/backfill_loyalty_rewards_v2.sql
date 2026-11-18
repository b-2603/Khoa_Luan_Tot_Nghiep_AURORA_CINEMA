USE aurora_db;

-- Ghi nhan cac don PAID da ton tai truoc khi Aurora Rewards v2 duoc trien khai.
INSERT INTO loyalty_point_transactions
  (user_id,booking_id,order_id,points_change,ticket_amount,product_amount,ticket_rate,product_rate,point_value_vnd,balance_after,transaction_type,description,created_at)
SELECT
  o.customer_id,
  NULLIF(o.booking_id,0),
  o.id,
  FLOOR((SUM(CASE WHEN oi.item_type='TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END)*0.05 +
         SUM(CASE WHEN oi.item_type<>'TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END)*0.10)/1000),
  SUM(CASE WHEN oi.item_type='TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END),
  SUM(CASE WHEN oi.item_type<>'TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END),
  5,10,1000,0,'POS_EARN',CONCAT('Tích điểm đơn POS #',o.id,' · vé 5% · hàng hóa 10%'),o.created_at
FROM orders o
INNER JOIN order_items oi ON oi.order_id=o.id
LEFT JOIN loyalty_point_transactions l ON l.order_id=o.id AND l.transaction_type='POS_EARN'
WHERE o.status='PAID' AND o.channel='POS' AND o.customer_id>0 AND l.id IS NULL
GROUP BY o.id
HAVING FLOOR((SUM(CASE WHEN oi.item_type='TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END)*0.05 +
              SUM(CASE WHEN oi.item_type<>'TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END)*0.10)/1000)>0
ORDER BY o.id;

UPDATE orders o SET loyalty_points_earned=COALESCE((SELECT l.points_change FROM loyalty_point_transactions l WHERE l.order_id=o.id AND l.transaction_type IN('POS_EARN','ONLINE_EARN') LIMIT 1),0);
UPDATE users u SET
  u.points=GREATEST(0,COALESCE((SELECT SUM(l.points_change) FROM loyalty_point_transactions l WHERE l.user_id=u.id),0)),
  u.membership_level=CASE
    WHEN COALESCE((SELECT SUM(CASE WHEN l.points_change>0 THEN l.points_change ELSE 0 END) FROM loyalty_point_transactions l WHERE l.user_id=u.id),0)>=5000 THEN 'VIP'
    WHEN COALESCE((SELECT SUM(CASE WHEN l.points_change>0 THEN l.points_change ELSE 0 END) FROM loyalty_point_transactions l WHERE l.user_id=u.id),0)>=2000 THEN 'GOLD'
    WHEN COALESCE((SELECT SUM(CASE WHEN l.points_change>0 THEN l.points_change ELSE 0 END) FROM loyalty_point_transactions l WHERE l.user_id=u.id),0)>=500 THEN 'SILVER'
    ELSE 'STANDARD' END,
  u.updated_at=NOW()
WHERE u.role='customer';

-- Backfill ban dau khong co giao dich tru diem xen ke, nen so du sau moi dong
-- bang tong tich luy theo thu tu giao dich cua tung khach hang.
DROP TEMPORARY TABLE IF EXISTS loyalty_balance_backfill;
CREATE TEMPORARY TABLE loyalty_balance_backfill AS
SELECT l.id,SUM(x.points_change) balance_after
FROM loyalty_point_transactions l
INNER JOIN loyalty_point_transactions x ON x.user_id=l.user_id AND x.id<=l.id
GROUP BY l.id;
UPDATE loyalty_point_transactions l INNER JOIN loyalty_balance_backfill b ON b.id=l.id SET l.balance_after=GREATEST(0,b.balance_after);
DROP TEMPORARY TABLE loyalty_balance_backfill;
