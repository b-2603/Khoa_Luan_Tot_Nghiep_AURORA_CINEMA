USE aurora_db;
SET NAMES utf8;

-- The original WAMP database was created with latin1. Vietnamese profile
-- values therefore became question marks during UPDATE operations.
ALTER DATABASE aurora_db CHARACTER SET utf8 COLLATE utf8_general_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;

ALTER TABLE users
  MODIFY full_name VARCHAR(120) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  MODIFY phone VARCHAR(20) NULL,
  MODIFY id_number VARCHAR(30) NULL,
  MODIFY birthday DATE NULL,
  MODIFY gender ENUM('male','female','other') NULL,
  MODIFY city VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  MODIFY district VARCHAR(100) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  MODIFY address VARCHAR(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  MODIFY avatar_url VARCHAR(500) CHARACTER SET utf8 COLLATE utf8_general_ci NULL,
  MODIFY updated_at DATETIME NULL;

-- Recover the damaged values from the authoritative administrative catalogue.
UPDATE users u
INNER JOIN administrative_provinces p ON p.code = '79'
SET u.city = p.name
WHERE u.city = 'TP. H? Chí Minh';

UPDATE users u
INNER JOIN administrative_provinces p ON p.code = '82'
SET u.city = p.name
WHERE u.city = 'Ti?n Giang';

UPDATE users u
INNER JOIN administrative_districts d ON d.code = '760'
SET u.district = d.full_name
WHERE u.district = 'Qu?n 1';

UPDATE users u
INNER JOIN administrative_districts d ON d.code_name = 'cho_gao'
SET u.district = d.full_name
WHERE u.district = 'Huy?n Ch? G?o';
