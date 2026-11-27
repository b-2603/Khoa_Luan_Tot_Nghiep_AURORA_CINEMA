USE aurora_db;

-- Chuyển toàn bộ mã cũ (ví dụ AUR26100000016EB3E2) sang mã 19 chữ số.
-- Cấu trúc: YYMM + user_id đủ 13 số + 2 số kiểm tra CRC32.
UPDATE customer_membership_cards
SET card_number = CONCAT(
      DATE_FORMAT(activated_at, '%y%m'),
      LPAD(user_id, 13, '0'),
      LPAD(MOD(CRC32(CONCAT(
        'aurora-member-',
        DATE_FORMAT(activated_at, '%y%m'),
        LPAD(user_id, 13, '0')
      )), 100), 2, '0')
    ),
    updated_at = NOW();

ALTER TABLE customer_membership_cards
  MODIFY card_number BIGINT UNSIGNED NOT NULL;
