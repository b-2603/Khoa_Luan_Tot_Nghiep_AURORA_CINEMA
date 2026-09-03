-- Database Schema cho hệ thống AURORA CINEMA POS
CREATE DATABASE IF NOT EXISTS aurora_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aurora_pos;

-- 1. Bảng nhân viên / tài khoản POS
CREATE TABLE IF NOT EXISTS pos_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NULL,
  role ENUM('cashier', 'supervisor', 'admin') NOT NULL DEFAULT 'cashier',
  status ENUM('active', 'inactive', 'locked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Bảng ca làm việc (Phiên làm việc POS)
CREATE TABLE IF NOT EXISTS pos_shifts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  cinema_name VARCHAR(120) NOT NULL DEFAULT 'AURORA CINEMA',
  counter VARCHAR(60) NOT NULL DEFAULT 'AURORA BOX 02',
  initial_cash DECIMAL(12, 2) NOT NULL DEFAULT 500000.00,
  cash_at_close DECIMAL(12, 2) NULL,
  status ENUM('active', 'paused', 'closed') NOT NULL DEFAULT 'paused',
  opened_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES pos_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Khởi tạo tài khoản nhân viên theo yêu cầu:
-- SĐT: 0328754062 / Mật khẩu: 8888 (Password hash Bcrypt an toàn)
-- Nhân viên: Nguyễn Trần Thái Bảo
INSERT INTO pos_users (username, password_hash, full_name, phone, role, status)
VALUES (
  '0328754062',
  '$2y$10$wE99qWvM9Z174y7x8Ue43eOQYQY8Y4/y7KkM1B3Qf9jY8vX0f3u7q', -- password_hash của 8888
  'Nguyễn Trần Thái Bảo',
  '0328754062',
  'cashier',
  'active'
) ON DUPLICATE KEY UPDATE 
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  status = 'active';

-- Tài khoản quản trị dự phòng: admin / 8888
INSERT INTO pos_users (username, password_hash, full_name, phone, role, status)
VALUES (
  'admin',
  '$2y$10$wE99qWvM9Z174y7x8Ue43eOQYQY8Y4/y7KkM1B3Qf9jY8vX0f3u7q', -- password_hash của 8888
  'Nguyễn Trần Thái Bảo',
  '0328754062',
  'admin',
  'active'
) ON DUPLICATE KEY UPDATE 
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  status = 'active';
