-- Chuẩn hóa URL media cũ: khoảng trắng trong đường dẫn dự án phải được mã hóa.
UPDATE movies SET poster_url = REPLACE(poster_url, ' ', '%20') WHERE poster_url LIKE 'http://localhost/AURORA CINEMA/%';
UPDATE movies SET banner_url = REPLACE(banner_url, ' ', '%20') WHERE banner_url LIKE 'http://localhost/AURORA CINEMA/%';
UPDATE movies SET trailer_url = REPLACE(trailer_url, ' ', '%20') WHERE trailer_url LIKE 'http://localhost/AURORA CINEMA/%';
