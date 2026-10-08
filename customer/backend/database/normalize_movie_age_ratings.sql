USE `aurora_db`;

-- Phân loại phổ biến chính thức: P, K, T13, T16, T18.
-- Cột age_rating chỉ lưu mã ngắn để các hệ thống Aurora hiển thị thống nhất.
UPDATE `movies`
SET `age_rating` = CASE
  WHEN UPPER(`age_rating`) LIKE 'T13%' THEN 'T13'
  WHEN UPPER(`age_rating`) LIKE 'T16%' THEN 'T16'
  WHEN UPPER(`age_rating`) LIKE 'T18%' THEN 'T18'
  WHEN UPPER(`age_rating`) LIKE 'K%' THEN 'K'
  WHEN UPPER(`age_rating`) = '4DX' THEN 'T16'
  ELSE 'P'
END;
