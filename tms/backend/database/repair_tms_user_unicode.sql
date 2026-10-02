-- Khôi phục tên tiếng Việt bị thay bằng dấu ? trong dữ liệu seed cũ.
-- users.full_name từng là latin1. Chuyển qua BINARY trước để giữ nguyên byte
-- UTF-8 hiện có, sau đó gắn đúng charset utf8 (tránh làm dữ liệu thành mojibake).
ALTER TABLE users MODIFY full_name VARBINARY(120) NOT NULL;
ALTER TABLE users MODIFY full_name VARCHAR(120) CHARACTER SET utf8 NOT NULL;

-- Dùng UTF-8 hex literal để an toàn với MySQL 5.0/WAMP.
UPDATE users SET full_name = 0x4E677579E1BB856E205472E1BAA76E205468C3A1692042E1BAA36F WHERE username = 'admin_tong';
UPDATE users SET full_name = 0x4CC3AA20486FC3A06E67204E616D WHERE username = 'admin_rap';
UPDATE users SET full_name = 0x5472E1BAA76E205468E1BB8B204D6169 WHERE username = 'supervisor';
UPDATE users SET full_name = 0x5068E1BAA16D204D696E68205472616E67 WHERE username = 'accounting';
