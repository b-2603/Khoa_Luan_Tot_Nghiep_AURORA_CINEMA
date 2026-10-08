USE `aurora_db`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `booking_seats`;
TRUNCATE TABLE `bookings`;
TRUNCATE TABLE `showtimes`;
TRUNCATE TABLE `movies`;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO `movies` (
  `id`,
  `title`,
  `description`,
  `duration_minutes`,
  `age_rating`,
  `format`,
  `poster_url`,
  `trailer_url`,
  `status`,
  `release_date`
) VALUES
(1, 'Avatar: Dòng Chảy Của Nước', 'Hành trình vượt biển sâu bảo vệ gia đình Sully trước hiểm họa sinh tồn tàn khốc của người Trái Đất.', 192, 'T13', '3D IMAX / HFR 48fps', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=d9MyW72ELq0', 'NOW_SHOWING', '2026-05-15'),
(2, 'Dune: Hành Tinh Cát - Phần Hai', 'Paul Atreides trỗi dậy trên sa mạc Arrakis, lãnh đạo người Fremen chống lại ách thống trị tàn bạo.', 166, 'T16', 'Dolby Atmos 4K / IMAX', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=Way9Dexny3w', 'NOW_SHOWING', '2026-06-01'),
(3, 'Oppenheimer', 'Bộ phim tiểu sử lịch sử mãn nhãn về J. Robert Oppenheimer và dự án Manhattan chế tạo bom nguyên tử.', 180, 'T18', '2D IMAX 70mm', 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=uYPbbksJxIg', 'NOW_SHOWING', '2026-06-10'),
(4, 'Mai (Trấn Thành Film)', 'Câu chuyện cảm động sâu sắc về tình yêu, sự hy sinh và những vết thương quá khứ của người phụ nữ.', 131, 'T18', '2D Digital', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=mai_trailer', 'NOW_SHOWING', '2026-06-15'),
(5, 'Godzilla x Kong: Đế Chế Mới', 'Hai quái thú huyền thoại bắt tay đối đầu với Skar King và mối hiểm họa hủy diệt Trái Đất Rỗng.', 115, 'T13', '3D / 4DX Dynamic', 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=godzilla', 'NOW_SHOWING', '2026-06-20'),
(6, 'Quý Tử Vượt Giàu', 'Hài kịch gia đình ấm áp kể về chàng công tử học cách tự lập và tìm lại giá trị thực của cuộc sống.', 110, 'T13', '2D Digital', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=quytu', 'NOW_SHOWING', '2026-06-25'),
(7, 'Deadpool & Wolverine', 'Bộ đôi siêu anh hùng lầy lội tái xuất trong hành trình giải cứu đa vũ trụ Marvel đầy tiếng cười và bạo lực.', 128, 'T18', 'IMAX 3D / 2D Digital', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=deadpool', 'COMING_SOON', '2026-08-15'),
(8, 'Inside Out 2 (Những Mảnh Ghép Cảm Xúc 2)', 'Tuổi dậy thì của Riley đón chào Cảm Xúc Lo Âu và nhóm bạn mới, khuấy đảo Tổng Hành Dinh tâm trí.', 96, 'P', '2D Lồng tiếng / Phụ đề 3D', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=insideout2', 'COMING_SOON', '2026-08-20'),
(9, 'Joker: Folie à Deux (Điên Có Đôi)', 'Arthur Fleck hội ngộ Harley Quinn trong bức tranh tâm lý nhạc kịch đen tối đầy ám ảnh tại Arkham.', 138, 'T18', 'IMAX 70mm / Dolby Atmos', 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=joker2', 'COMING_SOON', '2026-09-02'),
(10, 'Kraven: Thợ Săn Thủ Lĩnh', 'Nguồn gốc của một trong những phản diện nguy hiểm bậc nhất Spider-Man với bản năng săn mồi siêu đẳng.', 125, 'T18', '2D Digital / 4DX', 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=kraven', 'COMING_SOON', '2026-09-15'),
(11, 'Venom: Kèo Cuối (The Last Dance)', 'Eddie Brock và Venom đối mặt với cuộc truy đuổi của cả hai thế giới trong chương cuối cùng của cuộc đời.', 118, 'T16', 'IMAX 3D / 2D Digital', 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=venom3', 'COMING_SOON', '2026-10-05'),
(12, 'Moana 2 (Hành Trình Của Moana 2)', 'Moana và Maui tái hợp trong chuyến hải trình vượt ngàn trùng dương đến những vùng biển xa xôi chưa ai đặt chân tới.', 100, 'P', '2D Lồng tiếng / 3D', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=moana2', 'COMING_SOON', '2026-11-20'),
(13, 'Kung Fu Panda 4 (Suất Chiếu Sớm)', 'Suất chiếu sớm độc quyền cuối tuần dành riêng cho khán giả nhí và gia đình trước ngày công chiếu chính thức.', 94, 'P', '2D Lồng tiếng / 3D', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=panda4', 'SPECIAL_SHOWING', '2026-06-30'),
(14, 'Lật Mặt 7: Một Điều Ước (Sneak Show)', 'Suất chiếu đặc biệt Sneak Show xúc động với phần giao lưu trực tiếp cùng đạo diễn Lý Hải và dàn diễn viên.', 138, 'K', '2D Digital VIP', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=latmat7', 'SPECIAL_SHOWING', '2026-07-02'),
(15, 'Chiikawa: Bí Mật Đảo Nước (Fan Screening)', 'Suất chiếu đặc biệt kèm quà tặng độc quyền mô hình Chiikawa giới hạn chỉ có tại Aurora Cinema.', 85, 'K', '2D Digital Lồng tiếng', 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=chiikawa', 'SPECIAL_SHOWING', '2026-07-08'),
(16, 'Quái Vật 4DX Huyền Thoại (Midnight Show)', 'Suất chiếu lúc nửa đêm trải nghiệm trọn vẹn sức mạnh rung chấn 4DX Dynamic và âm thanh vòm Dolby.', 105, '4DX', '4DX 3D Dynamic', 'https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=quai_vat_4dx', 'SPECIAL_SHOWING', '2026-07-14'),
(17, 'Interstellar: Hố Tử Thần (Kỷ Niệm 10 Năm)', 'Siêu phẩm khoa học viễn tưởng của Christopher Nolan tái xuất trên màn chiếu Laser IMAX khổng lồ.', 169, 'T13', 'IMAX Laser 70mm', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=interstellar', 'SPECIAL_SHOWING', '2026-07-20'),
(18, 'Titanic Remastered 4K 3D (Suất Chiếu VIP)', 'Bản phục chế 4K 3D đỉnh cao của kiệt tác Titanic trên ghế Sofa VIP Starium phục vụ rượu vang và bắp cao cấp.', 195, 'T16', 'VIP 3D HFR 4K', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&auto=format&fit=crop&q=80', 'https://www.youtube.com/watch?v=titanic', 'SPECIAL_SHOWING', '2026-07-25');
