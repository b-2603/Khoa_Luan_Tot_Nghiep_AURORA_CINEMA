// d:/EMS_AURORA/backend/sync_courses_with_quizzes.js
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'quizzes_240.json');
const mockDataPath = path.join(__dirname, '../frontend/src/services/mockData.ts');

const quizData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Build 8 courses matching the 8 quizzes 1-to-1
const coursesDefinitions = [
  {
    id: 'crs-1',
    quizId: 'quiz-1',
    title: 'Nghiệp Vụ Quầy Concession: Rang Bắp Chuẩn Vị & Vận Hành Máy Nước Post-Mix',
    description: 'Nắm vững toàn diện 30 quy chuẩn quầy bắp nước: Công thức nổ bắp nấm Gourmet 32oz, nhiệt độ tủ giữ ấm 60-65°C, áp suất CO2 95-110 PSI, khử trùng vòi Sanitizer 15 phút và an toàn thực phẩm FIFO.',
    category: 'Bắp Nước & Quầy Concession',
    durationMinutes: 45,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Trần Thị Mai',
    instructorTitle: 'Trưởng Ca Vận Hành Quầy Concession',
    instructorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    level: 'Tiêu Chuẩn',
    rating: 4.9,
    reviewCount: 68,
    enrolledCount: 85,
    completedCount: 78,
    modules: [
      {
        id: 'm-101',
        title: 'Chương 1: Công thức vàng rang bắp nấm Gourmet 32oz & Xử lý sự cố nhiệt',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/iPAfLiNepws',
        duration: '15 phút',
        contentSummary: 'Định lượng chuẩn 32oz hạt ngô nấm Gourmet, 110ml dầu bơ vàng, 15g Flavacol. Quy tắc ngắt nhiệt khi tiếng nổ thưa 2-3s và phương pháp xử lý khi bắp cháy (tuyệt đối không đổ nước lạnh).',
        keyTakeaways: [
          'Tỷ lệ chuẩn: 32oz bắp nấm + 110ml dầu bơ thực vật vàng + 15g muối bơ Flavacol',
          'Ngắt nhiệt Heat khi tiếng nổ thưa 2-3 giây/tiếng để nhiệt dư làm nổ nốt hạt còn lại',
          'Khi bắp cháy: Đổ ra xô inox chịu nhiệt, TUYỆT ĐỐI KHÔNG đổ nước lạnh vào nồi đang nóng'
        ]
      },
      {
        id: 'm-102',
        title: 'Chương 2: Vận hành máy nước Post-Mix, Khí CO2 & Vệ sinh khử khuẩn Sanitizer',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/ZfJ3kL-71oM',
        duration: '15 phút',
        contentSummary: 'Duy trì áp suất khí CO2 từ 95 đến 110 PSI, kiểm tra túi siro BIB, ngâm vòi rót dung dịch Sanitizer 15 phút và bảo quản muỗng múc đá đúng quy cách.',
        keyTakeaways: [
          'Áp suất CO2 chuẩn: 95 - 110 PSI; thay bình khi đồng hồ chạm vạch đỏ dưới 500 PSI',
          'Rót nước: Đá 1/3 ly trước, nghiêng ly 45 độ để không bị trào bọt ga',
          'Muỗng múc đá (Ice scoop): Cất trong ống inox riêng, KHÔNG cắm trong thùng đá'
        ]
      },
      {
        id: 'm-103',
        title: 'Chương 3: Tiêu chuẩn bảo quản FIFO, Tủ giữ ấm & Kiểm soát hao hụt',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/D-mF96Z7D2A',
        duration: '15 phút',
        contentSummary: 'Quy tắc nhập trước xuất trước FIFO, duy trì nhiệt độ tủ giữ ấm 60-65°C, hạn dùng bắp đã nổ 24h, vệ sinh cá nhân và kiểm kê cuối ca.',
        keyTakeaways: [
          'Nhiệt độ tủ giữ ấm Popcorn Warmer: 60°C - 65°C; Hạn dùng bắp đóng túi: 24 giờ',
          'Pallet kho cách sàn tối thiểu 15cm; Rã đông xúc xích trong tủ mát 0-4°C dùng trong 48h',
          'Kiểm soát hao hụt (Portion Control) dưới 0.5% qua việc đếm số ly/xô xuất bán trên POS'
        ]
      }
    ]
  },
  {
    id: 'crs-2',
    quizId: 'quiz-2',
    title: 'Kỹ Năng Vận Hành Quầy Vé Box Office, Đặt Chỗ POS & Xử Lý Sự Cố Suất Chiếu',
    description: 'Thành thạo phần mềm bán vé POS Aurora dưới 45 giây, quy định phân loại nhãn phim P, K, T13, T16, T18 theo Luật Điện Ảnh 2022, quy trình kiểm quỹ và xử lý sự cố suất chiếu.',
    category: 'Vé & Chăm sóc Khách hàng',
    durationMinutes: 40,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Nguyễn Văn Minh',
    instructorTitle: 'Trưởng Nhóm Dịch Vụ Khách Hàng',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    level: 'Tiêu Chuẩn',
    rating: 4.85,
    reviewCount: 75,
    enrolledCount: 92,
    completedCount: 84,
    modules: [
      {
        id: 'm-201',
        title: 'Chương 1: Phân loại độ tuổi phim theo Luật Điện Ảnh & Kiểm tra giấy tờ tùy thân',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/8q-wD8H1T_Q',
        duration: '15 phút',
        contentSummary: 'Quy chuẩn nhãn P, K, T13, T16, T18. Bắt buộc đối chiếu CCCD gắn chip hoặc tài khoản VNeID mức 2 đối với phim C18. Xử lý khi phụ huynh muốn dắt trẻ em xem phim 18+.',
        keyTakeaways: [
          'Nhãn P (mọi độ tuổi), Nhãn K (dưới 13 tuổi có phụ huynh kèm), Nhãn T18 (từ đủ 18 tuổi trở lên)',
          'Chỉ chấp nhận CCCD gắn chip, VNeID mức 2 có ảnh; từ chối bán vé C18 cho trẻ em dù có người lớn bảo lãnh',
          'KPI thời gian thao tác bán vé tại quầy POS: Dưới 45 giây/giao dịch'
        ]
      },
      {
        id: 'm-202',
        title: 'Chương 2: Thao tác sơ đồ ghế Sweet Spot, Ghế đôi Sweetbox & Khóa ghế kỹ thuật',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/3q-vP9t1K8E',
        duration: '15 phút',
        contentSummary: 'Tư vấn ghế trung tâm hàng E, F, G, H chuẩn góc nhìn THX. Quy định bán cặp ghế đôi Sweetbox và thao tác khóa ghế (Block Seats) khi có hỏng hóc.',
        keyTakeaways: [
          'Ghế Sweetbox: Bắt buộc bán theo cặp, không xuất lẻ 1 ghế',
          'Ghế người khuyết tật: Nằm ở vị trí bằng phẳng gần lối đi thuận tiện',
          'Khóa ghế hỏng chức năng ngả lưng hoặc ghế bảo trì kỹ thuật trên hệ thống'
        ]
      },
      {
        id: 'm-203',
        title: 'Chương 3: Quy chế đổi trả vé, Két thả Drop Safe & Bồi thường khi rạp gặp sự cố',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/vV9W7Y2Z0s0',
        duration: '10 phút',
        contentSummary: 'Quy định đổi vé trước giờ chiếu 30-60 phút, thả tiền thừa vào két ngầm Drop Safe, đối soát tiền lẻ Float Money đầu ca và đền bù vé mời khi suất chiếu trễ trên 15 phút.',
        keyTakeaways: [
          'Sự cố gián đoạn trên 15 phút: Hoàn tiền 100% + Tặng vé mời Complimentary và voucher F&B',
          'Két thả Drop Safe: Thực hiện khi tiền trong két POS vượt hạn mức an toàn',
          'Bàn giao thẻ ngân hàng và vé bằng cả hai tay kèm lời chúc xem phim vui vẻ'
        ]
      }
    ]
  },
  {
    id: 'crs-3',
    quizId: 'quiz-3',
    title: 'Quy Trình Chuẩn Phục Vụ Khách Hàng AURORA Standard: Soát Vé Usher, Điều Phối & Bản Quyền',
    description: 'Quy chuẩn đón tiếp khán giả 15-20 phút trước suất chiếu, soi đèn pin chúc sàn an toàn, chống quay lén bản quyền (Camcording), dọn dẹp Turnaround 10-15 phút và xử lý Lost & Found.',
    category: 'Soát Vé & Trật Tự Sảnh',
    durationMinutes: 45,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Lê Hoàng Nam',
    instructorTitle: 'Trưởng Nhóm Giám Sát Sảnh & Usher',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    level: 'Tiêu Chuẩn',
    rating: 4.9,
    reviewCount: 82,
    enrolledCount: 110,
    completedCount: 104,
    modules: [
      {
        id: 'm-301',
        title: 'Chương 1: Quy trình mở cửa đón khách & Kỹ năng soát vé QR Code chuẩn',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/ZfJ3kL-71oM',
        duration: '15 phút',
        contentSummary: 'Mở cửa trước giờ chiếu 15-20 phút. Kiểm tra 4 thông số: Tên phim, Ngày chiếu, Số phòng, Số ghế. Phát kính 3D kèm khăn lau nano chuyên dụng.',
        keyTakeaways: [
          'Mở cửa trước 15-20 phút để khán giả ổn định chỗ ngồi thong thả',
          'Đèn pin dẫn đường: Luôn rọi chúc xuống bậc tam cấp chân khách, KHÔNG rọi vào mặt',
          'Xử lý trùng ghế (Double booking): Kiểm tra vé kỹ và bố trí ngay ghế VIP tương đương còn trống'
        ]
      },
      {
        id: 'm-302',
        title: 'Chương 2: Kiểm soát trật tự, Chống quay lén (Camcording) & Cấm hút thuốc lá điện tử',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/k5y_R1E1V5s',
        duration: '15 phút',
        contentSummary: 'Tuần tra phòng chiếu mỗi 15-20 phút. Ngăn chặn hành vi quay lén phim, cấm hút Vape/Pod kích hoạt đầu báo khói PCCC, nhắc nhở khách gây ồn nhẹ nhàng.',
        keyTakeaways: [
          'Quay lén (Camcording): Tiếp cận yêu cầu dừng quay ngay lập tức và xóa clip',
          'Thuốc lá điện tử (Vape/Pod): Nghiêm cấm tuyệt đối vì kích hoạt đầu báo khói khẩn cấp',
          'Nhiệt độ phòng chiếu tiêu chuẩn: Duy trì ổn định từ 22°C đến 24°C'
        ]
      },
      {
        id: 'm-303',
        title: 'Chương 3: Quy trình vệ sinh nhanh Turnaround 10-15 phút & Quản lý đồ thất lạc Lost & Found',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/D-mF96Z7D2A',
        duration: '15 phút',
        contentSummary: 'Dọn dẹp nhanh giữa 2 suất chiếu, kiểm tra tài sản khách bỏ quên bàn giao cho Quản lý trong 10 phút, kiểm tra nhà vệ sinh định kỳ mỗi 30 phút.',
        keyTakeaways: [
          'Turnaround time: 10 - 15 phút, bật sáng đèn phòng để nhặt rác gầm ghế',
          'Tài sản Lost & Found: Bàn giao Duty Manager lập biên bản trong vòng 10 phút',
          'Chào khách cửa ra: "Aurora Cinema cảm ơn quý khách, chúc quý khách ngày mới vui vẻ!"'
        ]
      }
    ]
  },
  {
    id: 'crs-4',
    quizId: 'quiz-4',
    title: 'An Toàn Phòng Cháy Chữa Cháy, Cứu Nạn Cứu Hộ & Sơ Tán Khán Giả Trong Bóng Tối',
    description: 'Bật sáng House Lights Full khi chuông báo cháy reo, cấm dùng thang máy, quy tắc sử dụng bình chữa cháy P.A.S.S, cấp cứu ngạt khói và hồi sinh tim phổi CPR tỷ lệ 30:2.',
    category: 'An Toàn & Khẩn Cấp',
    durationMinutes: 50,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Đội Trưởng Đào Tạo PCCC',
    instructorTitle: 'Chuyên Viên An Toàn Phòng Ngừa Sự Cố Rạp',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    level: 'Bắt Buộc 100%',
    rating: 4.95,
    reviewCount: 94,
    enrolledCount: 130,
    completedCount: 122,
    modules: [
      {
        id: 'm-401',
        title: 'Chương 1: Phản ứng vàng khi chuông báo cháy reo & Quy tắc thoát hiểm rạp',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/HS-7FlZbf4w',
        duration: '15 phút',
        contentSummary: 'Bật sáng toàn bộ đèn House Lights Full, mở toang cửa thoát hiểm Panic Bar, cấm dùng thang máy, hướng dẫn khán giả di chuyển trật tự theo biển EXIT.',
        keyTakeaways: [
          'Hành động đầu tiên: Bật sáng đèn phòng chiếu lên mức tối đa để dập tắt hoảng loạn',
          'TUYỆT ĐỐI CẤM dùng thang máy khi cháy vì hố thang hút khói độc và có nguy cơ kẹt điện',
          'Đèn sự cố EXIT: Hoạt động bằng pin ắc quy lưu điện dự phòng tối thiểu 90 - 120 phút'
        ]
      },
      {
        id: 'm-402',
        title: 'Chương 2: Phân loại bình chữa cháy & Quy tắc sử dụng P.A.S.S dập lửa',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/D-mF96Z7D2A',
        duration: '15 phút',
        contentSummary: 'Bình khí CO2 dùng cho phòng máy chiếu điện tử (nguy cơ bỏng lạnh -79°C không xịt vào người); bình bột ABC cho sảnh. Quy tắc P.A.S.S đứng cách 1.5 - 2.5m đầu gió.',
        keyTakeaways: [
          'Quy tắc P.A.S.S: Pull (Rút chốt) - Aim (Chĩa vòi) - Squeeze (Bóp cò) - Sweep (Quét qua lại)',
          'Bình CO2 hạ nhiệt -79°C: Tuyệt đối không cầm loa kim loại hoặc xịt vào da người',
          'Đầu phun Sprinkler tự động: Kích hoạt nổ ống thủy tinh đỏ khi nhiệt độ đạt ~68°C'
        ]
      },
      {
        id: 'm-403',
        title: 'Chương 3: Di chuyển trong khói độc & Kỹ thuật hồi sinh tim phổi CPR cơ bản',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/ZfJ3kL-71oM',
        duration: '20 phút',
        contentSummary: 'Hạ thấp người men theo chân tường, bịt khăn ướt vào mũi miệng. Kỹ thuật CPR: 30 lần ép tim sâu 5cm tần số 100-120 lần/phút + 2 lần thổi ngạt. Số khẩn cấp 114 và 115.',
        keyTakeaways: [
          'Di chuyển qua khói: Bò sát sàn 30-50cm nơi có không khí sạch, dùng khăn ướt che mũi miệng',
          'Tỷ lệ CPR: 30 lần ép tim lồng ngực sâu 5cm kết hợp 2 lần thổi ngạt liên tục',
          'Đường dây nóng: 114 (Báo cháy cứu nạn) và 115 (Cấp cứu y tế)'
        ]
      }
    ]
  },
  {
    id: 'crs-5',
    quizId: 'quiz-5',
    title: 'Nghệ Thuật Phục Vụ 5 Sao "Aurora Hospitality Standard" & Xử Lý Khách Hàng Khó Tính',
    description: 'Quy tắc chào đón 3 giây, ngôn ngữ hình thể thanh lịch, mô hình xử lý khiếu nại L.A.S.T (Listen - Apologize - Solve - Thank), thẩm quyền Service Recovery và văn hóa tôn trọng khách hàng.',
    category: 'Nghiệp vụ Dịch vụ',
    durationMinutes: 45,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Phạm Thu Hương',
    instructorTitle: 'Giám Đốc Đào Tạo & Phát Triển Nhân Sự',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    level: 'Nâng Cao',
    rating: 4.95,
    reviewCount: 88,
    enrolledCount: 125,
    completedCount: 118,
    modules: [
      {
        id: 'm-501',
        title: 'Chương 1: Tiêu chuẩn diện mạo Aurora Look & Quy tắc chào đón trong 3 giây',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/ZfJ3kL-71oM',
        duration: '15 phút',
        contentSummary: 'Quy tắc nụ cười 3 giây đầu tiên, khoảng cách giao tiếp lịch thiệp 0.8 - 1.2m, trao nhận bằng 2 tay và ngôn ngữ cơ thể tôn trọng không gian riêng của khách hàng.',
        keyTakeaways: [
          'Quy tắc 3 giây: Chủ động mỉm cười và chào đón ngay khi khách bước đến quầy',
          'Khoảng cách giao tiếp chuẩn mực: 0.8m đến 1.2m tạo sự thoải mái tự nhiên',
          'Cấm kỵ: Không dùng câu vô cảm "Tôi không biết / Quy định vậy rạp không chịu trách nhiệm"'
        ]
      },
      {
        id: 'm-502',
        title: 'Chương 2: Mô hình giải quyết khiếu nại L.A.S.T (Listen, Apologize, Solve, Thank)',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/k5y_R1E1V5s',
        duration: '15 phút',
        contentSummary: 'Ứng dụng mô hình L.A.S.T: Lắng nghe không ngắt lời, xin lỗi vì sự bất tiện của khách, đưa giải pháp tức thì trong thẩm quyền và cảm ơn đóng góp quý báu.',
        keyTakeaways: [
          'Listen: Lắng nghe chân thành, hạ thấp tông giọng khi khách đang nóng giận',
          'Apologize: Xin lỗi vì sự bất tiện trước tiên, không tranh cãi hay đổ lỗi đồng nghiệp',
          'Solve & Thank: Đổi ghế, bù bắp nước mới và cảm ơn khách hàng đã góp ý'
        ]
      },
      {
        id: 'm-503',
        title: 'Chương 3: Thẩm quyền phục hồi dịch vụ (Service Recovery) & Chăm sóc khách VIP',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/D-mF96Z7D2A',
        duration: '15 phút',
        contentSummary: 'Thẩm quyền đổi bắp nước miễn phí khi khách làm rơi đổ, ưu tiên phụ nữ mang thai và người cao tuổi, bảo mật thông tin cá nhân khách hàng theo chuẩn quốc tế.',
        keyTakeaways: [
          'Service Recovery: Đổi miễn phí phần bắp mới khi khách vô tình làm đổ trên sảnh',
          'Ưu tiên đặc biệt: Hỗ trợ người dùng xe lăn, phụ nữ có thai vào tận số ghế',
          'Bảo mật dữ liệu: Tuyệt đối không tiết lộ số điện thoại hay thông tin vé của khách'
        ]
      }
    ]
  },
  {
    id: 'crs-6',
    quizId: 'quiz-6',
    title: 'Kỹ Thuật Vận Hành Phòng Máy Chiếu Laser 4K, IMAX & Hệ Thống Âm Thanh Dolby Atmos',
    description: 'Nắm vững định dạng gói phim DCP DCI, nạp chứng thư khóa bản quyền KDM, khởi động buồng laser Chiller 18-22°C trước 30-45 phút, cân chỉnh âm thanh Dolby Atmos chuẩn 85 dBC SPL.',
    category: 'Kỹ Thuật Chiếu Phim',
    durationMinutes: 60,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Lê Hoàng Nam',
    instructorTitle: 'Kỹ Sư Trưởng Phòng Chiếu IMAX',
    instructorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    level: 'Chuyên Môn Cao',
    rating: 5.0,
    reviewCount: 45,
    enrolledCount: 40,
    completedCount: 36,
    modules: [
      {
        id: 'm-601',
        title: 'Chương 1: Tiếp nhận DCP & Quy trình nạp chứng thư khóa KDM qua Barco/Christie',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/HS-7FlZbf4w',
        duration: '20 phút',
        contentSummary: 'Định dạng gói phim số DCP, cơ chế bảo mật DCI, nạp KDM Key mã hóa theo IMB Serial có hiệu lực thời gian chuẩn xác theo giờ Việt Nam.',
        keyTakeaways: [
          'DCP (Digital Cinema Package): Chứa tệp hình ảnh JPEG 2000 và âm thanh PCM chuẩn DCI',
          'KDM: Mã hóa theo Media Block, tự động hết hạn và ngừng chiếu đúng thời khắc ấn định',
          'Bật máy chiếu trước 30 - 45 phút để hệ thống làm mát Chiller ổn định nhiệt độ 18 - 22°C'
        ]
      },
      {
        id: 'm-602',
        title: 'Chương 2: Tỷ lệ khung hình Flat/Scope, Màn bạc 3D & Đo độ sáng Foot-Lamberts',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/GyjwStTNSck',
        duration: '20 phút',
        contentSummary: 'Khác biệt giữa Flat (1.85:1) và Scope (2.39:1). Tiêu chuẩn độ sáng 2D là 14 Foot-Lamberts (fL). Công nghệ màn bạc giữ góc phân cực RealD 3D tránh hiện tượng bóng ma Crosstalk.',
        keyTakeaways: [
          'Flat 1.85:1 (1998x1080) và Scope 2.39:1 (2048x858 CinemaScope)',
          'Độ sáng màn chiếu chuẩn 2D: 14 fL (±2 fL) tại tâm màn chiếu màu trắng',
          'Crosstalk 3D: Hiện tượng bóng ma khi lệch góc phân cực hoặc màn bạc bị bẩn'
        ]
      },
      {
        id: 'm-603',
        title: 'Chương 3: Cân chỉnh âm thanh Dolby Atmos 128 đối tượng & Quản lý UPS lưu điện',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/k5y_R1E1V5s',
        duration: '20 phút',
        contentSummary: 'Âm thanh dựa trên đối tượng (Object-based) lên đến 128 luồng âm thanh 3D. Đo mức áp suất âm thanh chuẩn 85 dBC SPL (Fader 7.0) bằng Pink Noise. Lưu điện UPS duy trì làm mát laser khi mất điện.',
        keyTakeaways: [
          'Áp suất âm thanh chuẩn SMPTE/Dolby: 85 dBC SPL (Fader 7.0 trên CP850/CP950)',
          'Kênh loa trầm LFE: Tái tạo các rung chấn siêu trầm dưới 120Hz',
          'UPS lưu điện: Duy trì quạt làm mát 15-30 phút xả sạch nhiệt buồng laser khi mất điện lưới'
        ]
      }
    ]
  },
  {
    id: 'crs-7',
    quizId: 'quiz-7',
    title: 'CTKM Siêu Bão Mùa Hè 2026: Combo Popcorn X2, Voucher F&B & Khách Hàng VIP',
    description: 'Chính sách ưu đãi Vé 1K Student (T2-T5 trước 17:00), Combo Popcorn X2 miễn phí đổi vị Caramel/Phô mai, 4 hạng thẻ thành viên Aurora Club và quy trình thanh toán quét mã voucher POS.',
    category: 'Chương Trình Khuyến Mãi (CTKM)',
    durationMinutes: 30,
    isCtkm: true,
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Bộ Phận Marketing & Đào Tạo',
    instructorTitle: 'Phụ Trách Chiến Dịch Hè 2026',
    instructorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    level: 'Khuyến Mãi Nóng',
    rating: 4.88,
    reviewCount: 65,
    enrolledCount: 95,
    completedCount: 90,
    modules: [
      {
        id: 'm-701',
        title: 'Chương 1: Thể lệ chi tiết chương trình ưu đãi Vé 1K Student & Combo Popcorn X2',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/3q-vP9t1K8E',
        duration: '10 phút',
        contentSummary: 'Thời gian áp dụng: Thứ Hai đến Thứ Năm hàng tuần trước 17:00 cho phim 2D Standard. Yêu cầu xuất trình thẻ HSSV chính chủ hoặc VNeID. Mỗi bạn mua tối đa 1 vé ưu đãi/ngày.',
        keyTakeaways: [
          'Vé 1K: Áp dụng T2 - T5 suất trước 17:00, tối đa 01 vé/học sinh sinh viên/ngày',
          'Combo Popcorn X2: Tặng kèm 2 ly nước lớn, refill miễn phí trong ngày, đổi vị Caramel/Phô mai miễn phí',
          'Không áp dụng cộng dồn đồng thời 2 chương trình khuyến mãi trên cùng một vé'
        ]
      },
      {
        id: 'm-702',
        title: 'Chương 2: Thao tác quét mã QR Voucher POS & Chính sách thành viên Aurora Member',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/vV9W7Y2Z0s0',
        duration: '10 phút',
        contentSummary: 'Phím F4 mở danh mục khuyến mãi, phím F9 quét barcode voucher ví điện tử MoMo/ZaloPay. 4 hạng thẻ thành viên: Member (5%), Silver (7%), Gold (8%), Diamond (10%).',
        keyTakeaways: [
          'Phím tắt F4 (danh mục khuyến mãi), F9 (quét mã vạch voucher)',
          'Tỷ lệ đổi điểm: 1 điểm = 1.000 VNĐ trừ thẳng tiền thanh toán khi đạt từ 20 điểm trở lên',
          'Điểm thưởng thành viên có hạn sử dụng đến ngày 31 tháng 12 hàng năm'
        ]
      },
      {
        id: 'm-703',
        title: 'Chương 3: Quy chế quà tặng độc quyền bình nước phim & Ngày hội Member Day',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/k5y_R1E1V5s',
        duration: '10 phút',
        contentSummary: 'Bàn giao quà tặng nguyên seal không trầy xước. Khi hết quà tặng trong ngày, tặng bù voucher F&B giảm 30%. Ngày hội Aurora Member Day diễn ra vào Thứ Ba hàng tuần đồng giá vé 55.000đ.',
        keyTakeaways: [
          'Quà tặng bình nước nhân vật: Bàn giao nguyên seal, không đổi trả sau khi rời quầy',
          'Thứ Ba Member Day: Đồng giá vé 55.000đ cho mọi thành viên và giảm 20% bắp nước',
          'Nghiêm cấm nhân viên dùng tài khoản cá nhân quét tích điểm của khách hàng'
        ]
      }
    ]
  },
  {
    id: 'crs-8',
    quizId: 'quiz-8',
    title: 'Giám Sát Ca Trực Cinema Supervisor & Kiểm Soát Thất Thoát, An Toàn Vệ Sinh HACCP',
    description: 'Trách nhiệm Duty Manager: Bảng kiểm tra mở/đóng ca (Opening/Closing Checklist), tiêu chuẩn vệ sinh HACCP, kho mát 0-4°C, kho đông -18°C, lưu mẫu thực phẩm 24h, đối soát két tiền mặt và biên bản sự cố 2h.',
    category: 'Quản Lý & Vận Hành',
    durationMinutes: 60,
    isCtkm: false,
    thumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&auto=format&fit=crop&q=80',
    instructorName: 'Phạm Thu Hương',
    instructorTitle: 'Giám Đốc Đào Tạo & Phát Triển Nhân Sự',
    instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    level: 'Chuyên Môn Cao',
    rating: 4.98,
    reviewCount: 70,
    enrolledCount: 50,
    completedCount: 46,
    modules: [
      {
        id: 'm-801',
        title: 'Chương 1: Quy trình mở ca (Opening Checklist) & Tiêu chuẩn vệ sinh HACCP rạp',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/HS-7FlZbf4w',
        duration: '20 phút',
        contentSummary: 'Hoàn thành Opening Checklist trước giờ mở cửa 45-60 phút. Nhiệt độ kho mát bảo quản 0-4°C, kho đông -18°C. Bắt buộc lưu mẫu thực phẩm tối thiểu 100g trong 24-48 giờ.',
        keyTakeaways: [
          'Opening Checklist: Hoàn thành trước giờ mở cửa đón khách 45 - 60 phút',
          'Nhiệt độ kho: Kho mát 0°C đến 4°C, Kho đông -18°C hoặc thấp hơn',
          'Lưu mẫu thực phẩm (Food Sampling): Đựng hộp vô trùng có dán nhãn lưu 24 - 48 giờ'
        ]
      },
      {
        id: 'm-802',
        title: 'Chương 2: Kiểm soát thất thoát doanh thu POS, Đối soát két tiền & Kiểm kê kho',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/vV9W7Y2Z0s0',
        duration: '20 phút',
        contentSummary: 'Nguyên tắc 4 mắt kiểm quỹ giữa ca, phát hiện gian lận bán vé chui không qua POS, kiểm kê xoay vòng đột xuất (Cycle Count) và kiểm soát hao hụt dưới định mức 0.5%.',
        keyTakeaways: [
          'Đối soát két tiền giữa ca (Mid-shift cash count): Có sự tham gia của cả Supervisor và Thu ngân',
          'Kiểm soát thất thoát: Định mức hao hụt nguyên vật liệu bắp nước cho phép dưới 0.5%',
          'Họp giao ban Briefing đầu ca 10 phút phổ biến mục tiêu doanh số và tác phong'
        ]
      },
      {
        id: 'm-803',
        title: 'Chương 3: Xử lý sự cố bất thường, Đóng ca an toàn (Closing) & Huấn luyện nhân viên',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/k5y_R1E1V5s',
        duration: '20 phút',
        contentSummary: 'Thời gian hoãn suất chiếu tối đa 15 phút trước khi quyết định hủy. Biên bản sự cố (Incident Report) gửi Ban Giám Đốc trong vòng 2 giờ. Closing Checklist khóa van gas CO2 và kiểm tra phòng chiếu.',
        keyTakeaways: [
          'Thẩm quyền hoãn suất chiếu: Tối đa 15 phút, nếu không sửa được bắt buộc hủy và bồi hoàn',
          'Biên bản sự cố (Incident Report): Gửi Ban Giám Đốc rạp trong vòng 02 giờ',
          'Nguyên tắc huấn luyện nhân viên: "Khen ngợi nơi công cộng - Góp ý chốn riêng tư"'
        ]
      }
    ]
  }
];

// Attach the exact 30 Exam Checkpoints to each course directly from quizData!
coursesDefinitions.forEach((crs, idx) => {
  const matchingQuiz = quizData.quizzes[idx];
  if (matchingQuiz) {
    crs.examCheckpoints = matchingQuiz.questions.map((q, qIdx) => {
      const correctOpt = q.options[q.correctAnswerIndex];
      return `Câu ${qIdx + 1}: ${q.questionText} ➔ Đáp án chuẩn: [${correctOpt}]. Giải thích SOP: ${q.explanation}`;
    });
  }
});

// Update mockData.ts
const coursesTs = 'export const INITIAL_COURSES: Course[] = ' + JSON.stringify(coursesDefinitions, null, 2) + ';\n';

let mockContent = fs.readFileSync(mockDataPath, 'utf8');
const regex = /export const INITIAL_COURSES: Course\[\] = \[[\s\S]*?\n\];\n/;

if (!regex.test(mockContent)) {
  console.error("Could not find INITIAL_COURSES in mockData.ts");
  process.exit(1);
}

mockContent = mockContent.replace(regex, coursesTs);
fs.writeFileSync(mockDataPath, mockContent, 'utf8');
console.log("Updated mockData.ts with all 8 courses and 30 exam checkpoints per course successfully!");
