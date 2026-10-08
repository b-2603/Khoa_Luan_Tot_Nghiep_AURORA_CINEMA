-- ========================================================
-- CAP NHAT DAY DU THONG TIN CHO TAT CA PHIM TRONG aurora_db
-- Thuc hien: 28/09/2026
-- ========================================================

USE aurora_db;

-- PHIM 1: Avatar: Dong Chay Cua Nuoc
UPDATE movies SET
  movie_code = 'AVC-2022',
  original_title = 'Avatar: The Way of Water',
  director = 'James Cameron',
  cast = 'Sam Worthington, Zoe Saldana, Sigourney Weaver, Stephen Lang, Kate Winslet, Cliff Curtis, Britain Dalton, Trinity Bliss',
  writer = 'James Cameron, Rick Jaffa, Amanda Silver',
  producer = 'James Cameron, Jon Landau',
  production_country = 'My',
  production_year = 2022,
  plot_details = 'Jake Sully va Neytiri da thanh lap gia dinh va dang co gang giu ho o voi nhau. Ho phai roi bo ngoi nha va kham pha cac vung cua Pandora. Khi mot moi de doa quen thuoc xuat hien tro lai, Jake va Neytiri phai chien dau mot cuoc chien kho khan va dau thuong de giu mang song cho nhau. Cuoc hanh trinh vuot bien sau dua gia dinh Sully den bo toc Metkayina, nhung nguoi Navi song hai hoa voi dai duong Pandora.',
  original_language = 'Tieng Anh',
  localization_versions = 'Long tieng Viet, Phu de Viet',
  expected_end_date = '2026-08-15',
  distributor = 'Walt Disney Pictures / 20th Century Studios',
  banner_url = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 1;

-- PHIM 2: Dune: Hanh Tinh Cat - Phan Hai
UPDATE movies SET
  movie_code = 'DUNE-2024',
  original_title = 'Dune: Part Two',
  director = 'Denis Villeneuve',
  cast = 'Timothee Chalamet, Zendaya, Rebecca Ferguson, Josh Brolin, Austin Butler, Florence Pugh, Dave Bautista, Christopher Walken, Lea Seydoux, Stellan Skarsgard',
  writer = 'Denis Villeneuve, Jon Spaihts',
  producer = 'Mary Parent, Denis Villeneuve, Cale Boyter, Tanya Lapointe, Patrick McCormick',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Paul Atreides hop nhat voi Chani va nguoi Fremen tren con duong bao thu chong lai nhung ke da pha huy gia dinh anh. Paul Atreides troi day tren sa mac Arrakis, lanh dao nguoi Fremen chong lai ach thong tri tan bao cua Nha Harkonnen duoi su bao tro cua Hoang De, dong thoi doi mat voi dinh menh cua minh nhu la vi Messiah huyen thoai.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet, Long tieng Viet',
  expected_end_date = '2026-08-20',
  distributor = 'Warner Bros. Pictures',
  banner_url = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 2;

-- PHIM 3: Oppenheimer
UPDATE movies SET
  movie_code = 'OPP-2023',
  original_title = 'Oppenheimer',
  director = 'Christopher Nolan',
  cast = 'Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr., Florence Pugh, Josh Hartnett, Casey Affleck, Rami Malek, Kenneth Branagh',
  writer = 'Christopher Nolan',
  producer = 'Emma Thomas, Charles Roven, Christopher Nolan',
  production_country = 'My, Anh',
  production_year = 2023,
  plot_details = 'Bo phim tieu su lich su cua nha dao dien Christopher Nolan xoay quanh cuoc doi J. Robert Oppenheimer, nha vat ly ly thuyet nguoi My da dong vai tro quan trong trong Du an Manhattan - chuong trinh bi mat cua My trong The chien thu hai de phat trien vu khi nguyen tu dau tien tren the gioi. Bo phim khac hoa hanh trinh tu nghien cuu khoa hoc den khoanh khac thu nghiem Trinity va nhung he qua dao duc sau sac.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet',
  expected_end_date = '2026-08-25',
  distributor = 'Universal Pictures',
  banner_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 3;

-- PHIM 4: Mai
UPDATE movies SET
  movie_code = 'MAI-2024',
  original_title = 'Mai',
  director = 'Tran Thanh',
  cast = 'Phuong Anh Dao, Tuan Tran, NSND Hong Dao, Thai Hoa, Uyen An, Tien Luat, Thu Trang, Ngoc Giau, Kha Nhu, Pham Quynh Anh',
  writer = 'Tran Thanh',
  producer = 'Tran Thanh, Hoang Quan',
  production_country = 'Viet Nam',
  production_year = 2024,
  plot_details = 'Mai la cau chuyen ve mot co gai truong thanh ten Mai, nguoi mang nhieu vet thuong tam hon tu qua khu. Co song cung cha va hai cau con trai nho, chat vat muu sinh nhung long luon yeu thuong va che cho nhung nguoi than yeu. Cuoc doi Mai thay doi khi gap Duong - mot thanh nien tre tuoi, hon nhien va chan thanh. Cau chuyen tinh yeu cua ho khac hoa su hy sinh, su manh me vuot qua noi dau va y nghia sau sac cua tinh nguoi trong cuoc song binh di.',
  original_language = 'Tieng Viet',
  localization_versions = 'Phim goc tieng Viet',
  expected_end_date = '2026-08-15',
  distributor = 'Galaxy Studio',
  banner_url = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 4;

-- PHIM 5: Godzilla x Kong
UPDATE movies SET
  movie_code = 'GXK-2024',
  original_title = 'Godzilla x Kong: The New Empire',
  director = 'Adam Wingard',
  cast = 'Rebecca Hall, Brian Tyree Henry, Dan Stevens, Kaylee Hottle, Alex Ferns, Fala Chen',
  writer = 'Terry Rossio, Simon Barrett, Jeremy Slater',
  producer = 'Mary Parent, Alex Garcia, Eric McLeod, Thomas Tull',
  production_country = 'My, Nhat Ban',
  production_year = 2024,
  plot_details = 'Hai titan vi dai Godzilla va Kong phai lien ket de doi mat voi mot moi de doa chua tung co: Skar King, mot nhan vat bi an va manh me dang an nau trong Trai Dat Rong. Cung voi cac dong minh cua ho, hai quai thu huyen thoai phai vuot qua nhung chien tran kinh hoang tren khap dia cau de ngan chan tham hoa huy diet nhan loai.',
  original_language = 'Tieng Anh',
  localization_versions = 'Long tieng Viet, Phu de Viet',
  expected_end_date = '2026-08-20',
  distributor = 'Warner Bros. Pictures',
  banner_url = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 5;

-- PHIM 6: Quy Tu Vuot Giau
UPDATE movies SET
  movie_code = 'QTVG-2024',
  original_title = 'Quy Tu Vuot Giau',
  director = 'Huynh Tuan Anh',
  cast = 'Truong The Vinh, Le Giang, Le Duong Bao Lam, Xuan Nghi, Ai Phuong, Linh Dan, Trinh Thang Binh',
  writer = 'Huynh Tuan Anh, Thien Kim',
  producer = 'BHD Film',
  production_country = 'Viet Nam',
  production_year = 2024,
  plot_details = 'Bo phim hai gia dinh ke ve Khai, mot cong tu nha giau cay the luc cua cha va chua bao gio phai tu lo cho ban than. Moi chuyen thay doi khi cha anh quyet dinh thu thach con trai: de anh tu minh xoay xo, khong tien bac, khong nguoi giup do trong vong 30 ngay. Hanh trinh gian nan do giup Khai nhan ra gia tri thuc su cua cuoc song, cua lao dong va tinh nguoi.',
  original_language = 'Tieng Viet',
  localization_versions = 'Phim goc tieng Viet',
  expected_end_date = '2026-08-15',
  distributor = 'BHD Star Cineplex',
  banner_url = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 6;

-- PHIM 7: Deadpool & Wolverine
UPDATE movies SET
  movie_code = 'DPW-2024',
  original_title = 'Deadpool & Wolverine',
  director = 'Shawn Levy',
  cast = 'Ryan Reynolds, Hugh Jackman, Emma Corrin, Matthew Macfadyen, Jennifer Garner, Wesley Snipes, Channing Tatum, Dafne Keen',
  writer = 'Ryan Reynolds, Shawn Levy, Rhett Reese, Paul Wernick, Zeb Wells',
  producer = 'Kevin Feige, Shawn Levy, Ryan Reynolds, Lauren Shuler Donner',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Wade Wilson / Deadpool phai chieu mo mot Wolverine dang mat tinh than va keo anh vao cuoc chien giai cuu da vu tru. Bo doi sieu anh hung lay loi phai doi mat voi nhung ke thu nguy hiem tu nhieu chieu khong gian khac nhau, vua chien dau vua cai va mang den vo so man hai huoc khong the nao quen.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet',
  expected_end_date = '2026-10-30',
  distributor = 'Walt Disney Pictures / Marvel Studios',
  banner_url = 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 7;

-- PHIM 8: Inside Out 2
UPDATE movies SET
  movie_code = 'IO2-2024',
  original_title = 'Inside Out 2',
  director = 'Kelsey Mann',
  cast = 'Amy Poehler, Maya Hawke, Kensington Tallman, Liza Lapira, Tony Hale, Lewis Black, Phyllis Smith, Mindy Kaling, Bill Hader',
  writer = 'Dave Holstein, Meg LeFauve',
  producer = 'Mark Nielsen, Pete Docter',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Riley buoc vao tuoi day thi va Tong Hanh Dinh tam tri co be phai don nhan nhung Cam Xuc moi xuat hien: Anxiety (Lo Au), Envy (Ghen Ti), Ennui (Chan Nan) va Embarrassment (Nguong Ngung). Nhung Cam Xuc moi nay khuay dao cuoc song von yen binh, khien Joy va nhung nguoi ban cu phai tim cach giu vung su can bang cho Riley.',
  original_language = 'Tieng Anh',
  localization_versions = 'Long tieng Viet, Phu de Viet',
  expected_end_date = '2026-10-30',
  distributor = 'Walt Disney Pictures / Pixar Animation Studios',
  banner_url = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 8;

-- PHIM 9: Joker 2
UPDATE movies SET
  movie_code = 'JKR2-2024',
  original_title = 'Joker: Folie a Deux',
  director = 'Todd Phillips',
  cast = 'Joaquin Phoenix, Lady Gaga, Zazie Beetz, Brendan Gleeson, Catherine Keener, Jacob Lofland, Ken Leung',
  writer = 'Todd Phillips, Scott Silver',
  producer = 'Todd Phillips, Bradley Cooper, Emma Tillinger Koskoff',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Phan tiep theo cua bo phim Joker 2019, Arthur Fleck dang bi giam giu tai Benh vien Tam than Arkham va dau tranh voi ban sac kep cua minh trong khi doi mat voi mot phien toa xet xu toi ac cua minh. Tai day, anh gap Harley Quinn va tim thay tinh yeu. Bo phim duoc the hien theo phong cach nhac kich tam ly den toi, xen ke giua thuc tai va nhung ao mong am nhac day am anh.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet',
  expected_end_date = '2026-11-15',
  distributor = 'Warner Bros. Pictures',
  banner_url = 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 9;

-- PHIM 10: Kraven
UPDATE movies SET
  movie_code = 'KRV-2024',
  original_title = 'Kraven the Hunter',
  director = 'J.C. Chandor',
  cast = 'Aaron Taylor-Johnson, Ariana DeBose, Fred Hechinger, Alessandro Nivola, Christopher Abbott, Russell Crowe',
  writer = 'Art Marcum, Matt Holloway, Richard Wenk',
  producer = 'Columbia Pictures, Marvel Entertainment',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Bo phim kham pha nguon goc cua Sergei Kravinoff - mot trong nhung phan dien nguy hiem bac nhat trong vu tru Spider-Man. Sergei la con trai cua mot ten toi pham Nga giau co, nguoi da tro thanh Kraven the Hunter - tho san vi dai nhat the gioi voi ban nang sieu dang co duoc tu mot su kien huyen bi.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet, Long tieng Viet',
  expected_end_date = '2026-11-30',
  distributor = 'Sony Pictures Releasing',
  banner_url = 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 10;

-- PHIM 11: Venom 3
UPDATE movies SET
  movie_code = 'VEN3-2024',
  original_title = 'Venom: The Last Dance',
  director = 'Kelly Marcel',
  cast = 'Tom Hardy, Chiwetel Ejiofor, Juno Temple, Rhys Ifans, Stephen Graham, Alanna Ubach, Clark Backo',
  writer = 'Kelly Marcel',
  producer = 'Avi Arad, Matt Tolmach, Amy Pascal, Kelly Marcel, Tom Hardy',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Eddie Brock va Venom dang bi ca hai the gioi truy duoi. Khi thao chay, ca hai phai dua ra mot quyet dinh tan khoc co the dat dau cham het cho moi rang buoc giua ho. Day la chuong ket trong bo ba phim ve Venom, noi Eddie Brock phai doi mat voi nhung the luc tu ca Trai Dat lan Klyntar.',
  original_language = 'Tieng Anh',
  localization_versions = 'Long tieng Viet, Phu de Viet',
  expected_end_date = '2026-12-15',
  distributor = 'Sony Pictures Releasing',
  banner_url = 'https://images.unsplash.com/photo-1568832359672-e36cf5d74f54?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 11;

-- PHIM 12: Moana 2
UPDATE movies SET
  movie_code = 'MOA2-2024',
  original_title = 'Moana 2',
  director = 'David Derrick Jr., Jason Hand, Dana Ledoux Miller',
  cast = 'Auliyi Cravalho, Dwayne Johnson, Rose Matafeo, Hualala Castillo, David Fane, Huakai Walmsley, Khaleesi Lambert-Tsuda',
  writer = 'Dana Ledoux Miller, Jared Bush',
  producer = 'Christina Chen, Yvett Merino',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Sau khi nhan duoc mot loi keu goi bat ngo tu to tien xa xua, Moana phai dan doi thuy thu doan den vung bien xa xoi va nguy hiem cua Oceania. Cung voi than ban than Maui va nhung nguoi ban moi, Moana khoi hanh chuyen hai trinh vuot ngan trung duong de kham pha nhung bi mat cua dai duong.',
  original_language = 'Tieng Anh',
  localization_versions = 'Long tieng Viet, Phu de Viet',
  expected_end_date = '2027-02-28',
  distributor = 'Walt Disney Pictures',
  banner_url = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 12;

-- PHIM 13: Kung Fu Panda 4
UPDATE movies SET
  movie_code = 'KFP4-2024',
  original_title = 'Kung Fu Panda 4',
  director = 'Mike Mitchell',
  cast = 'Jack Black, Awkwafina, Bryan Cranston, Viola Davis, Ian McShane, James Hong, Dustin Hoffman, Angelina Jolie, Lucy Liu, Jackie Chan, Seth Rogen, David Cross',
  writer = 'Darren Lemke, Gloria Shen',
  producer = 'Mike Mitchell, Melissa Cobb',
  production_country = 'My',
  production_year = 2024,
  plot_details = 'Po can tim nguoi ke thua vai tro Chien Binh Rong cua minh va anh gap Zhen - mot ten trom tinh ranh va nhanh nhen. Trong khi do, mot phu thuy moi noi len voi suc manh co the trieu hoi nhung ke phan dien tu qua khu. Day la suat chieu som dac biet cuoi tuan danh cho khan gia nhi va gia dinh.',
  original_language = 'Tieng Anh',
  localization_versions = 'Long tieng Viet, Phu de Viet',
  expected_end_date = '2026-09-30',
  distributor = 'Universal Pictures / DreamWorks Animation',
  banner_url = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 13;

-- PHIM 14: Lat Mat 7
UPDATE movies SET
  movie_code = 'LM7-2024',
  original_title = 'Lat Mat 7: Mot Dieu Uoc',
  director = 'Ly Hai',
  cast = 'Ly Hai, Minh Ha, Hua Minh Dat, Lam Vy Da, NSUT Hung Thuan, Truong The Vinh, Puka, Gin Tuan Kiet, Miu Le',
  writer = 'Ly Hai',
  producer = 'Ly Hai, Minh Ha',
  production_country = 'Viet Nam',
  production_year = 2024,
  plot_details = 'Lat Mat 7 tiep tuc chuoi phim gia dinh cam dong cua dao dien Ly Hai. Bo phim xoay quanh nhung cau chuyen chan thuc ve gia dinh voi nhung moi quan he phuc tap, tinh cam gan ket va nhung dieu uoc gian di nhung thieng lieng. Suat chieu Sneak Show dac biet se co buoi giao luu truc tiep voi dao dien va dien vien chinh.',
  original_language = 'Tieng Viet',
  localization_versions = 'Phim goc tieng Viet',
  expected_end_date = '2026-09-15',
  distributor = 'Ly Hai Minh Ha Production',
  banner_url = 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 14;

-- PHIM 15: Chiikawa
UPDATE movies SET
  movie_code = 'CHK-2024',
  original_title = 'Chiikawa Movie: Nanka Ii Kanji no Yatsu',
  director = 'Hiroyuki Imaishi',
  cast = 'Kazuya Nakai, Ami Koshimizu, Jun Fukuyama, Chiwa Saito',
  writer = 'Nagano (tac gia manga goc)',
  producer = 'ADK Emotions, Sotsu',
  production_country = 'Nhat Ban',
  production_year = 2024,
  plot_details = 'Chiikawa va nhung nguoi ban nho - Hachiware, Usagi - bat dau cuoc hanh trinh phieu luu tren mot hon dao bi an day nuoc. Tren hanh trinh kham pha, ho gap nhung bi mat ky dieu, nhung nguoi ban moi va nhung thach thuc thu vi. Suat chieu Fan Screening dac biet kem qua tang doc quyen mo hinh Chiikawa gioi han.',
  original_language = 'Tieng Nhat',
  localization_versions = 'Long tieng Viet',
  expected_end_date = '2026-09-20',
  distributor = 'Aurora Cinema (Fan Screening)',
  banner_url = 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 15;

-- PHIM 16: Quai Vat 4DX
UPDATE movies SET
  movie_code = 'QV4DX-2024',
  original_title = 'Monster: 4DX Legend Edition',
  director = 'Michael Dougherty',
  cast = 'Alexander Skarsgard, Millie Bobby Brown, Rebecca Hall, Brian Tyree Henry, Demian Bichir, Aisha Hinds, OShea Jackson Jr.',
  writer = 'Zach Shields, Eric Pearson',
  producer = 'Alex Garcia, Mary Parent, Brian Rogers, Thomas Tull',
  production_country = 'My, Nhat Ban',
  production_year = 2024,
  plot_details = 'Suat chieu nua dem huyen thoai voi bo phim kinh di hanh dong vien tuong ve nhung quai vat khong lo. Trai nghiem tron ven suc manh rung chan manh me cua he thong 4DX Dynamic cung am thanh vom Dolby hoanh trang trong khong gian rap chieu toi tam huyen bi.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet',
  expected_end_date = '2026-09-28',
  distributor = 'Aurora Cinema Special Events',
  banner_url = 'https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 16;

-- PHIM 17: Interstellar 10th
UPDATE movies SET
  movie_code = 'INST-10TH',
  original_title = 'Interstellar (10th Anniversary IMAX)',
  director = 'Christopher Nolan',
  cast = 'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Bill Irwin, Ellen Burstyn, Michael Caine, Matt Damon, Topher Grace, Mackenzie Foy, Timothee Chalamet',
  writer = 'Jonathan Nolan, Christopher Nolan',
  producer = 'Emma Thomas, Christopher Nolan, Lynda Obst',
  production_country = 'My, Anh, Canada',
  production_year = 2014,
  plot_details = 'Trong tuong lai gan, Trai Dat dang dan can kiet tai nguyen va nhan loai dung truoc nguy co tuyet chung. Cu phi cong NASA Cooper cung nhom nha khoa hoc mao hiem vuot qua lo giun vu tru gan Sao Tho de tim kiem hanh tinh co the cuu loai nguoi. Ban tai chieu ky niem 10 nam tren man IMAX Laser 70mm khong lo.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet',
  expected_end_date = '2026-09-30',
  distributor = 'Warner Bros. Pictures (Re-release)',
  banner_url = 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 17;

-- PHIM 18: Titanic
UPDATE movies SET
  movie_code = 'TIT-4K3D',
  original_title = 'Titanic (4K 3D Remastered VIP Edition)',
  director = 'James Cameron',
  cast = 'Leonardo DiCaprio, Kate Winslet, Billy Zane, Kathy Bates, Frances Fisher, Bernard Hill, Jonathan Hyde, Danny Nucci, David Warner, Bill Paxton',
  writer = 'James Cameron',
  producer = 'James Cameron, Jon Landau',
  production_country = 'My',
  production_year = 1997,
  plot_details = 'Cau chuyen tinh yeu kinh dien bat tu giua Jack Dawson - chang trai ngheo tai nang - va Rose DeWitt Bukater - tieu thu thuong luu dinh hon voi mot quy ong giau co. Ho gap nhau tren chuyen hai trinh dau tien va cung la cuoi cung cua con tau Titanic huyen thoai. Ban phuc che 4K 3D dinh cao cua kiet tac dien anh moi thoi dai.',
  original_language = 'Tieng Anh',
  localization_versions = 'Phu de Viet',
  expected_end_date = '2026-10-05',
  distributor = 'Paramount Pictures / 20th Century Studios (Re-release)',
  banner_url = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&auto=format&fit=crop&q=80',
  updated_at = NOW()
WHERE id = 18;
