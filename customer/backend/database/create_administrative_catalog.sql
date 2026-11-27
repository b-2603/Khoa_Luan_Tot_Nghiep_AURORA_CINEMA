USE aurora_db;

CREATE TABLE IF NOT EXISTS administrative_provinces (
  code CHAR(2) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  code_name VARCHAR(100) NOT NULL,
  dataset_version VARCHAR(30) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_administrative_province_name (name),
  KEY idx_administrative_province_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
CREATE TABLE IF NOT EXISTS administrative_districts (
  code CHAR(3) NOT NULL PRIMARY KEY,
  province_code CHAR(2) NOT NULL,
  name VARCHAR(120) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  code_name VARCHAR(120) NOT NULL,
  dataset_version VARCHAR(30) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_administrative_district_name (province_code, full_name),
  KEY idx_administrative_district_province (province_code, is_active, sort_order),
  CONSTRAINT fk_administrative_district_province FOREIGN KEY (province_code)
    REFERENCES administrative_provinces(code) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
