USE `aurora_db`;

-- Tạo sơ đồ ghế từ sức chứa thật của từng phòng trong bảng screens.
-- A/B là VIP, các hàng còn lại là STANDARD.
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `seats`;
SET FOREIGN_KEY_CHECKS = 1;

DROP PROCEDURE IF EXISTS aurora_seed_seats;
DELIMITER //
CREATE PROCEDURE aurora_seed_seats()
BEGIN
  DECLARE finished INT DEFAULT 0;
  DECLARE current_screen BIGINT UNSIGNED;
  DECLARE capacity INT;
  DECLARE position_no INT;
  DECLARE seat_row CHAR(2);
  DECLARE seat_number INT;
  DECLARE seat_kind VARCHAR(10);
  DECLARE screen_cursor CURSOR FOR SELECT id, total_seats FROM screens;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = 1;

  OPEN screen_cursor;
  screen_loop: LOOP
    FETCH screen_cursor INTO current_screen, capacity;
    IF finished = 1 THEN LEAVE screen_loop; END IF;
    SET position_no = 1;
    WHILE position_no <= capacity DO
      SET seat_row = CHAR(64 + CEIL(position_no / 10));
      SET seat_number = MOD(position_no - 1, 10) + 1;
      SET seat_kind = IF(seat_row IN ('A', 'B'), 'VIP', 'STANDARD');
      INSERT INTO seats (screen_id, seat_row, seat_number, seat_type)
      VALUES (current_screen, seat_row, seat_number, seat_kind);
      SET position_no = position_no + 1;
    END WHILE;
  END LOOP;
  CLOSE screen_cursor;
END//
DELIMITER ;
CALL aurora_seed_seats();
DROP PROCEDURE aurora_seed_seats;
