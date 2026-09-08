-- Migration: add extended profile columns to users table
-- Run this on aurora_db if the columns do not yet exist.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone      VARCHAR(20)  NULL AFTER email,
  ADD COLUMN IF NOT EXISTS id_number  VARCHAR(30)  NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS birthday   DATE         NULL AFTER id_number,
  ADD COLUMN IF NOT EXISTS gender     ENUM('male','female','other') NULL AFTER birthday,
  ADD COLUMN IF NOT EXISTS city       VARCHAR(100) NULL AFTER gender,
  ADD COLUMN IF NOT EXISTS district   VARCHAR(100) NULL AFTER city,
  ADD COLUMN IF NOT EXISTS address    VARCHAR(255) NULL AFTER district;
