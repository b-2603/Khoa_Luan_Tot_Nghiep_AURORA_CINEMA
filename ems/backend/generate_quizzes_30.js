// d:/EMS_AURORA/backend/generate_quizzes_30.js
// Generates 8 professional cinema operational quizzes with 30 questions each (Total 240 questions)
const fs = require('fs');
const path = require('path');

const quizzesData = [
  {
    id: 1,
    courseId: 4,
    courseTitle: 'Nghiệp Vụ Quầy Concession: Rang Bắp Chuẩn Vị & Vận Hành Máy Nước Post-Mix',
    title: 'Kiểm Tra Nghiệp Vụ Quầy Bắp Nước Concession & Pha Chế Nước Post-Mix 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Tỷ lệ pha chế hạt bắp - dầu bơ thực vật - muối Flavacol chuẩn cho nồi rang thương mại 32oz tại Aurora Cinema là gì?',
        options: [
          '500g hạt bắp - 200ml dầu ăn thường - 150g đường trắng',
          '32oz hạt bắp nấm Gourmet - 110ml dầu bơ thực vật vàng - 15g muối bơ Flavacol',
          'Tùy chỉnh ước lượng bằng mắt của nhân viên trực ca',
          'Đổ đầy nồi bắp và bấm nút chạy tự động không cần dầu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chuẩn công thức Aurora Concession là 32oz hạt bắp nấm Gourmet + 110ml dầu bơ thực vật vàng chuyên dụng + 15g muối Flavacol để bắp nở tròn hình nấm đều và giòn tan.'
      },
      {
        questionText: 'Khi nào nhân viên bắt buộc phải ngắt công tắc gia nhiệt (Heat) của nồi rang bắp?',
        options: [
          'Ngay khi nghe tiếng nổ đầu tiên',
          'Khi tiếng bắp nổ thưa dần còn 2 - 3 giây/tiếng nổ để tránh cháy khét hạt bắp ở đáy nồi',
          'Chờ bắp nổ hết hoàn toàn không còn bất kỳ tiếng nổ nào',
          'Sau 15 phút đếm giờ tự động'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khi tiếng nổ giãn ra còn 2 - 3 giây một tiếng, nhiệt lượng tích tụ trong nồi đủ làm nổ nốt các hạt còn lại. Tiếp tục đun nhiệt sẽ làm khét mẻ bắp.'
      },
      {
        questionText: 'Chỉ số áp suất gas CO2 tiêu chuẩn cấp cho vòi rót máy nước ngọt Post-Mix là bao nhiêu PSI?',
        options: [
          '30 - 45 PSI',
          '50 - 65 PSI',
          '95 - 110 PSI',
          '150 - 200 PSI'
        ],
        correctAnswerIndex: 2,
        explanation: 'Áp suất CO2 chuẩn từ 95 - 110 PSI đảm bảo độ sủi bọt ga (carbonation) sắc nét và đẩy siro đúng tỷ lệ brix tiêu chuẩn của Coca-Cola/Pepsi.'
      },
      {
        questionText: 'Quy trình vệ sinh khử khuẩn vòi rót máy nước Post-Mix cuối ca trực bắt buộc thực hiện như thế nào?',
        options: [
          'Chỉ cần xả nước nóng qua vòi trong 30 giây',
          'Tháo rời đầu vòi và van chia siro, ngâm dung dịch sát khuẩn thực phẩm chuyên dụng Sanitizer theo nồng độ chuẩn 15 phút',
          'Dùng cồn 90 độ phun trực tiếp vào vòi đang mở',
          'Dùng nước rửa chén pha đặc chà mạnh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đầu vòi rót là nơi dễ tích tụ nấm men đường, bắt buộc tháo rời ngâm dung dịch Sanitizer chuẩn an toàn thực phẩm 15 phút và để khô tự nhiên.'
      },
      {
        questionText: 'Nhiệt độ tiêu chuẩn duy trì trong tủ giữ ấm bắp rang (Popcorn Warmer) tại quầy là bao nhiêu?',
        options: [
          '30°C - 40°C',
          '45°C - 50°C',
          '60°C - 65°C',
          '80°C - 90°C'
        ],
        correctAnswerIndex: 2,
        explanation: 'Nhiệt độ 60°C - 65°C giúp bắp luôn giòn rụm, ngăn chặn ẩm mốc và giữ bơ không bị vón cục mà không làm biến tính dầu thực vật.'
      },
      {
        questionText: 'Nguyên tắc quản lý nguyên vật liệu FIFO trong kho bắp nước nghĩa là gì?',
        options: [
          'Fast In Fast Out - Hàng nào nhanh thì bán trước',
          'First In First Out - Hàng nhập trước phải được xuất dùng trước',
          'Final In Final Out - Hàng mới nhất dùng trước để bảo đảm tươi ngon',
          'Free In Free Out - Hàng khuyến mãi tặng trước'
        ],
        correctAnswerIndex: 1,
        explanation: 'FIFO (First In First Out) là nguyên tắc cốt lõi trong an toàn thực phẩm, đảm bảo các lô siro, hạt bắp, dầu bơ nhập trước luôn được dùng trước hạn.'
      },
      {
        questionText: 'Khi vòi nước ngọt Post-Mix chỉ chảy ra nước soda có ga trong suốt không có màu siro, nguyên nhân chính là gì?',
        options: [
          'Áp suất CO2 bị quá tải',
          'Hết túi siro BIB (Bag-In-Box) trong phòng pha chế hoặc đầu nối cắm chưa chặt',
          'Máy làm lạnh bị đóng băng vòi',
          'Nước máy đầu vào bị ngắt'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khi hết túi siro BIB hoặc van ngắt tự động kích hoạt, bơm siro ngừng đẩy khiến vòi chỉ còn xả nước soda có ga.'
      },
      {
        questionText: 'Quy định sử dụng găng tay nilon dùng 1 lần tại quầy Concession như thế nào là đúng chuẩn?',
        options: [
          'Đeo một đôi suốt cả ca làm việc 8 tiếng',
          'Chỉ cần đeo khi có quản lý đứng quan sát',
          'Bắt buộc đeo găng tay khi tiếp xúc trực tiếp bắp rang, thực phẩm và thay mới ngay sau khi thu tiền mặt hoặc dọn vệ sinh',
          'Không cần đeo nếu đã rửa tay bằng nước lạnh'
        ],
        correctAnswerIndex: 2,
        explanation: 'Tiền mặt chứa rất nhiều vi khuẩn; nhân viên bắt buộc thay găng tay mới sau mỗi lần chạm tiền mặt trước khi thao tác thực phẩm.'
      },
      {
        questionText: 'Dụng cụ múc đá viên (Ice Scoop) bắt buộc phải đặt ở đâu sau khi sử dụng?',
        options: [
          'Cắm ngập trực tiếp trong thùng đá viên để tiện lấy lần sau',
          'Đặt trên mặt quầy thu ngân',
          'Đặt vào giá đỡ/ống đựng inox chuyên dụng riêng biệt bên ngoài thùng đá',
          'Để trên nắp máy làm đá'
        ],
        correctAnswerIndex: 2,
        explanation: 'Nghiêm cấm cắm muỗng múc đá trong thùng đá vì vi khuẩn từ tay cầm sẽ lây nhiễm chéo trực tiếp vào đá viên của khách hàng.'
      },
      {
        questionText: 'Nhiệt độ nóng chảy lý tưởng khi ngào lớp caramel bọc bắp trong chảo chuyên dụng là bao nhiêu?',
        options: [
          '90°C - 100°C',
          '120°C - 130°C',
          '160°C - 170°C',
          '220°C - 250°C'
        ],
        correctAnswerIndex: 2,
        explanation: 'Khoảng 160°C - 170°C đường chuyển màu cánh gián thơm ngậy mà không bị cháy đắng, giúp bắp Caramel Aurora có màu hổ phách tuyệt đẹp.'
      },
      {
        questionText: 'Khi bắp bị cháy khét đen trong nồi rang, hành động xử lý KHẨN CẤP đúng kỹ thuật là gì?',
        options: [
          'Đổ ngay một ca nước đá lạnh vào nồi để hạ nhiệt tức thì',
          'Lập tức ngắt công tắc Heat và Motor, dùng găng tay chịu nhiệt mở nắp đổ mẻ bắp vào xô inox thải, tuyệt đối KHÔNG đổ nước vào nồi đang nóng',
          'Đậy kín nắp chờ bắp tự nguội',
          'Bấm nút xả nước máy vào lòng nồi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đổ nước lạnh vào nồi đang ở nhiệt độ >200°C sẽ gây sốc nhiệt làm biến dạng nứt nồi kim loại và hơi nước sôi bắn gây bỏng nghiêm trọng.'
      },
      {
        questionText: 'Hạn sử dụng tối đa của bắp rang thành phẩm lưu trữ trong túi kín tại tủ giữ ấm là bao lâu?',
        options: [
          '4 tiếng',
          'Trong vòng 24 tiếng kể từ lúc nổ',
          '3 ngày',
          '1 tuần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bắp rang Aurora chỉ có giá trị sử dụng tối đa trong vòng 24 giờ để đảm bảo độ giòn thơm và hương vị bơ chuẩn 5 sao.'
      },
      {
        questionText: 'Cách bảo quản bột gia vị phô mai lắc bắp đúng chuẩn để không bị vón cục là gì?',
        options: [
          'Để hở miệng túi ở nơi có gió điều hòa',
          'Đóng kín miệng túi zip sau mỗi lần lấy, bảo quản trong hộp kín ở nơi khô ráo, tránh độ ẩm cao',
          'Bảo quản trong ngăn đá tủ lạnh',
          'Pha sẵn với nước để xịt lên bắp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bột phô mai rất háo nước, tiếp xúc không khí ẩm sẽ nhanh chóng hút ẩm vón cục và mất mùi thơm đặc trưng.'
      },
      {
        questionText: 'Khay hứng nước thừa (Drip Tray) dưới vòi nước Post-Mix phải được vệ sinh với tần suất nào?',
        options: [
          '1 tuần một lần',
          'Mỗi 2 tiếng kiểm tra đổ nước thải và tổng vệ sinh khử trùng cuối ca',
          'Khi nào nước tràn ra ngoài sàn mới dọn',
          'Chỉ dọn vào ngày bảo trì tháng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nước ngọt đọng tại khay hứng là môi trường lý tưởng cho ruồi giấm và vi khuẩn sinh sôi, cần đổ nước định kỳ mỗi 2 tiếng và vệ sinh sạch sẽ.'
      },
      {
        questionText: 'Khi bình khí CO2 báo đồng hồ áp suất tụt về vạch đỏ (dưới 500 PSI áp suất bình), nhân viên cần làm gì?',
        options: [
          'Lắc mạnh bình khí để tăng áp suất',
          'Thông báo Trưởng ca hoặc kỹ thuật để tiến hành đổi sang bình khí CO2 dự phòng theo quy trình an toàn',
          'Tiếp tục bán cho đến khi khách khiếu nại nước không có ga',
          'Mở van xả hết lượng khí còn lại ra phòng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phải chủ động thay bình CO2 khi áp suất chạm vạch đỏ để đảm bảo chất lượng nước ngọt liên tục không bị gián đoạn phục vụ khách.'
      },
      {
        questionText: 'Thứ tự thao tác rót đá và nước ngọt vào ly giấy để nước không bị trào bọt ga ra ngoài là gì?',
        options: [
          'Rót nước ngọt đầy tràn ly rồi gắp đá thả vào',
          'Cho đá viên khoảng 1/3 đến 1/2 ly trước, nghiêng nhẹ ly 45 độ sát miệng vòi rót để giảm va đập tạo bọt',
          'Cho đá đầy 100% ly rồi nhỏ vài giọt siro',
          'Rót nửa ly nước ngọt, cho đá, rồi rót tiếp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Cho đá trước và nghiêng ly 45 độ giúp dòng nước chảy êm theo thành ly, giảm giải phóng khí CO2 đột ngột gây tràn bọt.'
      },
      {
        questionText: 'Khoảng cách tối thiểu giữa pallet kê hàng nguyên liệu bắp nước với mặt sàn kho theo tiêu chuẩn vệ sinh an toàn thực phẩm là bao nhiêu?',
        options: [
          '5 cm',
          'Tối thiểu 15 cm',
          'Có thể đặt trực tiếp lên sàn gạch nếu đã quét sạch',
          'Không có quy định'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hàng thực phẩm bắt buộc cách sàn tối thiểu 15cm và cách tường 20cm để chống ẩm mốc sàn nhà và ngăn ngừa côn trùng xâm nhập.'
      },
      {
        questionText: 'Khi khách hàng gọi Combo Solo (1 bắp + 1 nước), kỹ năng Upsell chuẩn Aurora của nhân viên là gì?',
        options: [
          'Tự động in hóa đơn nâng cấp không cần hỏi khách',
          'Tươi cười giới thiệu: "Dạ thưa anh/chị, hôm nay cụm rạp đang có ưu đãi chỉ thêm 15.000đ để nâng cấp lên Combo Đôi gồm 2 ly nước lớn và bắp cỡ lớn hơn nhiều, mình nâng cấp luôn nhé ạ?"',
          'Nói khách mua combo nhỏ này không đủ ăn',
          'Không nói gì chỉ thu đúng tiền'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kỹ năng Upsell chuyên nghiệp là nêu rõ lợi ích vượt trội về giá và khẩu phần giúp khách hàng cảm thấy nhận được giá trị xứng đáng.'
      },
      {
        questionText: 'Quy trình rã đông xúc xích và bảo quản tại quầy Hot food tuân thủ nguyên tắc nào?',
        options: [
          'Ngâm xúc xích vào nước nóng 100°C trong 5 phút',
          'Rã đông chậm trong ngăn mát tủ lạnh 0°C - 4°C trước 12-24 giờ, xúc xích đã rã đông dùng trong vòng 48 giờ',
          'Để ngoài nhiệt độ phòng từ sáng đến chiều',
          'Rã đông bằng lò vi sóng công suất lớn cho chín luôn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Rã đông chậm trong tủ mát 0-4°C ngăn chặn vi khuẩn phát triển ở dải nhiệt độ nguy hiểm (5°C - 60°C) và giữ trọn độ mọng nước của xúc xích.'
      },
      {
        questionText: 'Tần suất rửa tay bằng xà phòng diệt khuẩn theo quy chuẩn 6 bước của nhân viên quầy Concession là bao lâu?',
        options: [
          'Một lần vào đầu ca làm việc là đủ',
          'Tối thiểu mỗi 30 - 60 phút một lần và bắt buộc rửa tay ngay sau khi đi vệ sinh, ho/hắt hơi, đổ rác hoặc tiếp xúc tiền mặt',
          'Chỉ rửa tay khi thấy tay bị dính bẩn mắt thường thấy được',
          '2 tiếng một lần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Rửa tay thường xuyên theo quy chuẩn 6 bước Bộ Y Tế là hàng rào phòng ngừa lây nhiễm chéo hàng đầu trong ngành F&B rạp chiếu phim.'
      },
      {
        questionText: 'Quy định diện mạo nào sau đây là BẮT BUỘC đối với nhân viên chế biến quầy bắp nước?',
        options: [
          'Được đeo nhẫn đính đá và sơn móng tay nhiều màu',
          'Cắt ngắn móng tay, không sơn móng tay, không đeo trang sức ở bàn tay/cổ tay, đội mũ lưới trùm tóc và đeo khẩu trang',
          'Tóc dài thả tự nhiên cho đẹp',
          'Có thể mang dép lê khi trời mưa'
        ],
        correctAnswerIndex: 1,
        explanation: 'Móng tay dài, sơn móng và trang sức có nguy cơ rơi mảnh vụn hoặc lưu cữu vi khuẩn gây mất an toàn vệ sinh thực phẩm nghiêm trọng.'
      },
      {
        questionText: 'Độ Brix chuẩn của nước ngọt có ga tại vòi Post-Mix được hiểu là chỉ số gì?',
        options: [
          'Độ cồn trong nước ngọt',
          'Tỷ lệ phần trăm hàm lượng chất rắn hòa tan (chủ yếu là đường siro) trong dung dịch nước ngọt thành phẩm',
          'Thời gian nước ngọt giữ được ga',
          'Độ lạnh của đá viên'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chỉ số Brix biểu thị độ ngọt tiêu chuẩn; nếu sai lệch sẽ làm nước quá ngọt khé hoặc quá nhạt làm mất hương vị nguyên bản của thương hiệu.'
      },
      {
        questionText: 'Khi khách hàng phàn nàn bắp phô mai bị mặn hơn bình thường, cách xử lý chuẩn của nhân viên là gì?',
        options: [
          'Tranh cãi rằng công thức cân định lượng máy tự động không thể mặn',
          'Chân thành xin lỗi khách, lập tức đổi ngay một phần bắp phô mai mới được lắc đều tay chuẩn vị và ghi nhận phản hồi để kiểm tra lại hũ gia vị',
          'Bảo khách mua thêm ly nước ngọt uống cho đỡ mặn',
          'Từ chối giải quyết vì khách đã ăn thử'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phương châm khách hàng là thượng đế: Đổi ngay phần bắp mới và kiểm tra lại thao tác lắc bột phô mai xem có bị dồn cục ở đáy xô hay không.'
      },
      {
        questionText: 'Hóa chất tẩy rửa cặn khét lòng nồi bắp (Kettle Cleaner) được sử dụng vào thời điểm nào?',
        options: [
          'Xịt vào nồi ngay giữa giờ cao điểm đông khách',
          'Sử dụng trong quy trình tổng vệ sinh đóng ca đêm khi nồi đã nguội hẳn và tuân thủ xả sạch nước nhiều lần',
          'Dùng chung với dầu bơ để nổ bắp cho bóng',
          'Chỉ dùng 1 năm 1 lần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hóa chất tẩy cặn nồi chuyên dụng chỉ được sử dụng trong ca đêm, phải tráng rửa tối thiểu 3 lần nước sạch để đảm bảo không còn dư lượng hóa chất.'
      },
      {
        questionText: 'Máy làm đá viên tự động tại rạp cần được kiểm tra bảo dưỡng và thay lõi lọc nước định kỳ bao lâu?',
        options: [
          '10 năm 1 lần',
          'Mỗi 3 - 6 tháng định kỳ kiểm tra thay lõi lọc và khử cặn khoáng',
          'Chỉ khi nào máy không ra đá mới kiểm tra',
          'Mỗi ngày thay 1 lõi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lõi lọc nước máy đá cần thay định kỳ mỗi 3-6 tháng để đá viên luôn trong suốt, không có mùi lạ và đạt chuẩn nước uống tinh khiết trực tiếp.'
      },
      {
        questionText: 'Khái niệm "Portion Control" (Kiểm soát khẩu phần) trong quầy Concession có mục đích gì?',
        options: [
          'Cho khách ăn càng ít càng tốt để tiết kiệm chi phí',
          'Đảm bảo sự nhất quán về lượng hạt bắp, dầu bơ, nước ngọt giữa các ly bắp nước phục vụ khách và hạn chế thất thoát nguyên vật liệu',
          'Tăng thời gian chế biến món ăn',
          'Chỉ phục vụ khách quen'
        ],
        correctAnswerIndex: 1,
        explanation: 'Portion Control đảm bảo quyền lợi khách hàng luôn nhận đủ trọng lượng chuẩn và rạp kiểm soát chính xác giá vốn hàng bán (COGS).'
      },
      {
        questionText: 'Khi phát hiện một túi siro BIB bị rách rò rỉ dung dịch đường ra sàn phòng pha chế, hành động cần làm ngay là gì?',
        options: [
          'Để nguyên đó ca sau dọn',
          'Khóa van cấp, tháo túi rò rỉ cách ly, lau sạch sàn bằng nước nóng khử khuẩn tránh kiến/gián bu và lập biên bản hàng hỏng',
          'Đổ dầu ăn lên vết rò rỉ',
          'Dùng băng dính dán vết rách lại rồi dùng tiếp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đường siro rỉ ra sàn sẽ thu hút côn trùng dịch hại xâm nhập phòng siro; cần cách ly túi hỏng và làm sạch ngay lập tức.'
      },
      {
        questionText: 'Thao tác kiểm kê chốt tồn kho quầy Concession cuối ngày bao gồm những bước nào?',
        options: [
          'Chỉ cần ước lượng bằng mắt rồi điền bừa số liệu',
          'Đếm thực tế số lượng ly giấy các size, xô bắp, túi bắp đóng sẵn, số lượng xúc xích và đối chiếu với số lượng xuất bán trên báo cáo POS',
          'Chỉ đếm tiền mặt trong két',
          'Nhờ nhân viên bảo vệ kiểm tra hộ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm kê vật tư bao bì (ly, xô) là phương pháp chuẩn để đối soát chính xác số lượng sản phẩm bán ra so với số liệu ghi nhận trên phần mềm POS.'
      },
      {
        questionText: 'Quy tắc an toàn khi vận chuyển và thay thế bình khí nén CO2 là gì?',
        options: [
          'Lăn bình khí nằm ngang trên sàn nhà',
          'Luôn dùng xe đẩy chuyên dụng có xích giằng cố định bình thẳng đứng, khóa van chặt và đội mũ chụp bảo vệ van',
          'Để bình nằm nghiêng dưới đất khi sử dụng',
          'Không cần khóa van khi tháo dây nối'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bình khí CO2 có áp suất rất cao (>800 PSI), nếu gãy van do va đập bình sẽ biến thành tên lửa phản lực cực kỳ nguy hiểm tính mạng.'
      },
      {
        questionText: 'Mục tiêu chất lượng cốt lõi của bộ phận Concession tại cụm rạp Aurora Cinema là gì?',
        options: [
          'Bán giá đắt nhất thị trường',
          'Bắp luôn tươi nóng giòn rụm, nước ngọt chuẩn ga thanh mát, vệ sinh an toàn thực phẩm tuyệt đối và tốc độ phục vụ dưới 60 giây',
          'Giảm bớt đá để khách uống nhanh hơn',
          'Chỉ bán loại bắp ngọt truyền thống'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chất lượng bắp giòn thơm, nước ngọt sắc nét, an toàn thực phẩm chuẩn 5 sao và thao tác nhanh chóng là kim chỉ nam tạo nên trải nghiệm điện ảnh hoàn hảo.'
      }
    ]
  },
  {
    id: 2,
    courseId: 6,
    courseTitle: 'Kỹ Năng Vận Hành Quầy Vé Box Office, Đặt Chỗ POS & Xử Lý Sự Cố Suất Chiếu',
    title: 'Kiểm Tra Nghiệp Vụ Quầy Vé Box Office, Hệ Thống POS & Phân Loại Phim 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Theo Thông tư số 05/2023/TT-BVHTTDL và Luật Điện Ảnh Việt Nam, nhãn phim "P" quy định độ tuổi khán giả như thế nào?',
        options: [
          'Chỉ dành cho phụ huynh có con nhỏ',
          'Phim được phép phổ biến đến người xem ở mọi độ tuổi',
          'Chỉ dành cho học sinh cấp một',
          'Cấm trẻ em dưới 6 tuổi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhãn P (General) là phim được phổ biến rộng rãi cho mọi độ tuổi khán giả không giới hạn.'
      },
      {
        questionText: 'Nhãn phim "K" theo quy chuẩn phân loại phim rạp Việt Nam có ý nghĩa gì?',
        options: [
          'Phim kinh dị cấm người yếu tim',
          'Phim được phép phổ biến đến người xem dưới 13 tuổi với điều kiện có cha, mẹ hoặc người giám hộ đi cùng',
          'Phim chỉ chiếu vào ban ngày',
          'Phim Hàn Quốc (Korean Cinema)'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhãn K là phân loại dành cho khán giả dưới 13 tuổi nhưng bắt buộc phải có cha mẹ hoặc người giám hộ xem cùng.'
      },
      {
        questionText: 'Khán giả muốn xem phim gắn nhãn "T18" (hoặc C18) bắt buộc phải đáp ứng điều kiện nào?',
        options: [
          'Từ đủ 16 tuổi trở lên và có người lớn đi kèm',
          'Từ đủ 18 tuổi trở lên, nhân viên quầy vé và soát vé bắt buộc kiểm tra giấy tờ tùy thân có ảnh hợp lệ',
          'Chỉ cần nói miệng là đã 18 tuổi',
          'Chỉ cần có thẻ học sinh cấp ba'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phim C18 nghiêm cấm người xem dưới 18 tuổi dưới mọi hình thức, bất kể có người lớn đi cùng hay không.'
      },
      {
        questionText: 'Giấy tờ tùy thân nào sau đây được công nhận hợp lệ để xác minh độ tuổi khán giả tại cụm rạp?',
        options: [
          'Thẻ gửi xe hoặc thẻ thư viện không có ảnh',
          'Căn cước công dân gắn chip, tài khoản định danh điện tử VNeID mức độ 2, Giấy phép lái xe hoặc Hộ chiếu còn hạn',
          'Ảnh chụp màn hình facebook cá nhân',
          'Tin nhắn xác nhận của phụ huynh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chỉ các giấy tờ nhân thân có ảnh do cơ quan nhà nước có thẩm quyền cấp (hoặc VNeID mức 2) mới có giá trị pháp lý xác minh độ tuổi.'
      },
      {
        questionText: 'Chỉ số KPI thời gian phục vụ tiêu chuẩn cho 01 giao dịch bán vé tại quầy POS Box Office của Aurora là bao nhiêu?',
        options: [
          'Dưới 45 giây/giao dịch',
          'Từ 2 đến 3 phút/giao dịch',
          'Tùy thuộc vào việc nhân viên có bận nói chuyện hay không',
          'Không quá 5 phút/giao dịch'
        ],
        correctAnswerIndex: 0,
        explanation: 'KPI tại Box Office Aurora là dưới 45 giây/giao dịch để giải tỏa áp lực hàng đợi nhanh chóng vào giờ cao điểm trước suất chiếu.'
      },
      {
        questionText: 'Quy định đối với việc bán ghế Sweetbox (Ghế đôi) trên sơ đồ phòng chiếu là gì?',
        options: [
          'Có thể tách bán lẻ từng ghế cho khách đi một mình',
          'Bắt buộc bán theo cặp (Block 2 ghế liền kề), hệ thống không cho phép xuất lẻ 1 ghế của cặp Sweetbox',
          'Chỉ bán cho khách VIP có thẻ vàng',
          'Không tính tiền ghế thứ hai'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ghế đôi Sweetbox được thiết kế riêng tư cho 2 người, chính sách rạp quy định bán trọn gói theo cặp không tách rời.'
      },
      {
        questionText: 'Khi khách hàng có nhu cầu đổi suất chiếu sang khung giờ khác, điều kiện hợp lệ là gì?',
        options: [
          'Khi phim đã chiếu được 30 phút vẫn được đổi',
          'Vé chưa qua cửa soát vé và yêu cầu đổi được thực hiện trước giờ chiếu tối thiểu 30 - 60 phút theo chính sách của rạp',
          'Không bao giờ được đổi vé trong bất kỳ trường hợp nào',
          'Chỉ đổi nếu bù thêm 200.000đ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Vé chỉ được hỗ trợ đổi trước giờ chiếu tối thiểu 30-60 phút khi chưa qua cửa soát vé để ghế trống kịp mở bán lại cho khách khác.'
      },
      {
        questionText: 'Khi suất chiếu gặp sự cố kỹ thuật gián đoạn trên 15 phút không khắc phục được, quyền hạn xử lý đền bù của nhân viên là gì?',
        options: [
          'Yêu cầu khách ngồi im chờ hết giờ rồi về',
          'Chân thành xin lỗi, hoàn tiền 100% (hoặc đổi suất chiếu khác theo ý khách) kèm tặng 01 Vé mời Complimentary Ticket và Voucher bắp nước tri ân',
          'Chỉ hoàn 50% tiền vé vì khách đã xem được đoạn mở đầu',
          'Bảo khách tự liên hệ lên ban giám đốc công ty'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chính sách Aurora Guest Care cam kết bồi hoàn 100% kèm quà tặng tri ân để giữ trọn vẹn niềm tin và thiện cảm của khách hàng.'
      },
      {
        questionText: 'Vị trí ghế ngồi dành riêng cho người sử dụng xe lăn (Wheelchair accessible) có đặc điểm gì trên POS?',
        options: [
          'Bán với giá cao gấp đôi ghế thường',
          'Được đánh ký hiệu riêng, nằm ở vị trí bằng phẳng gần lối đi thuận tiện và ưu tiên dành cho khán giả khuyết tật',
          'Chỉ mở bán vào ban đêm',
          'Là ghế không có tựa lưng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ghế người khuyết tật được ưu tiên đặc biệt, thiết kế lối đi riêng không bậc thang để hỗ trợ tiếp cận văn minh.'
      },
      {
        questionText: 'Thao tác chuẩn khi máy in vé POS bị kẹt giấy hoặc hết cuộn vé nhiệt giữa lúc đang in là gì?',
        options: [
          'Dùng kéo cậy mạnh vào đầu in nhiệt',
          'Bấm tạm dừng trên màn hình, mở nắp máy in gỡ giấy nhẹ nhàng theo chiều cuốn hoặc thay cuộn giấy mới đúng mặt cảm nhiệt, in lại lệnh vé bị kẹt',
          'Tắt cầu giao điện của cả quầy',
          'Bảo khách sang rạp khác mua vé'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mở lẫy nắp máy in gỡ giấy kẹt theo chiều quay con lăn và lắp giấy đúng mặt cảm nhiệt giúp bảo vệ đầu kim in và xuất lại vé chính xác.'
      },
      {
        questionText: 'Khi khách hàng thanh toán bằng phương thức quét mã QR (VietQR / Napas247 / Ví điện tử), nhân viên chỉ xuất vé khi nào?',
        options: [
          'Khi khách hàng nói miệng: "Tôi chuyển khoản rồi đó em"',
          'Khi màn hình POS hiện thông báo "Giao dịch thành công" và máy in tự động xuất hóa đơn vé',
          'Khi khách cho xem ảnh chụp màn hình chuyển khoản trên điện thoại của họ (dù POS chưa báo thành công)',
          'Không cần kiểm tra chỉ cần thấy khách cầm điện thoại'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bắt buộc chờ màn hình POS ghi nhận thành công từ cổng thanh toán để phòng tránh rủi ro ảnh chụp màn hình giả mạo hoặc giao dịch bị treo.'
      },
      {
        questionText: 'Quy định về số tiền lẻ dự trữ ban đầu (Float money) tại ngăn kéo thu ngân đầu ca là gì?',
        options: [
          'Nhân viên tự mang tiền cá nhân vào để thối',
          'Nhận bàn giao từ Trưởng ca đúng định mức tiền lẻ quy định (ví dụ 1.000.000đ), kiểm đếm ký biên bản và cấm để tiền cá nhân vào ngăn két',
          'Không cần tiền lẻ, chỉ nhận thanh toán tròn tiền',
          'Để bao nhiêu tiền tùy thích'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiền Float phải kiểm đếm chính xác đầu ca và nghiêm cấm trộn lẫn tiền cá nhân vào két POS để đảm bảo minh bạch tuyệt đối khi đối soát quỹ.'
      },
      {
        questionText: 'Quy trình kiểm tra tiền mặt nghi vấn tiền giả bằng mắt thường và thiết bị tại quầy bao gồm:',
        options: [
          'Ngửi mùi tiền giấy',
          'Kiểm tra độ nổi của nét in hình chân dung, soi hình mờ ẩn dưới đèn cực tím UV và kiểm tra dải đổi màu bảo an',
          'Đốt thử một góc tờ tiền',
          'Chỉ nhận tiền mới cứng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiền polymer thật có chi tiết in nổi sắc sảo, dải cửa sổ trong suốt chứa hình ẩn và phản quang đặc trưng dưới đèn cực tím UV.'
      },
      {
        questionText: 'Thao tác "Drop Safe" (Thả tiền vào két ngầm an toàn) được thực hiện khi nào?',
        options: [
          'Chỉ khi hết ca làm việc',
          'Khi lượng tiền mặt tích lũy trong ngăn kéo POS vượt hạn mức an toàn quy định (ví dụ vượt 5.000.000đ) để phòng ngừa cướp giật và rủi ro',
          'Khi nhân viên đi ăn trưa',
          'Không bao giờ dùng két thả'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thả tiền thừa định kỳ vào két an toàn giảm thiểu rủi ro mất mát tiền mặt tại quầy giao dịch trong suốt ca vận hành.'
      },
      {
        questionText: 'Nếu khách hàng dẫn theo trẻ em 10 tuổi và nằng nặc đòi mua vé xem phim C18, cách ứng xử đúng chuẩn là gì?',
        options: [
          'Bán vé cho khách vì khách hàng là thượng đế',
          'Kiên quyết từ chối nhã nhặn, giải thích rõ quy định pháp luật xử phạt nghiêm khắc rạp chiếu và tư vấn đổi sang phim khác phù hợp lứa tuổi của bé',
          'Thu thêm phụ phí gấp ba rồi cho vào xem',
          'Gọi bảo vệ lôi khách ra ngoài'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhân viên phải tuân thủ Luật Điện Ảnh tuyệt đối, kiên quyết từ chối một cách lịch sự và khéo léo giới thiệu các phim hoạt hình/gia đình phù hợp.'
      },
      {
        questionText: 'Khách hàng làm mất vé giấy đã in và đến quầy nhờ hỗ trợ trước giờ chiếu 10 phút, nhân viên cần làm gì?',
        options: [
          'Bắt khách phải mua lại vé mới với giá gốc',
          'Kiểm tra trên hệ thống POS bằng số điện thoại thành viên, mã giao dịch thẻ ngân hàng hoặc lịch sử đặt chỗ để in lại vé xác nhận cho khách',
          'Nói khách mất vé thì không được vào xem',
          'Đổi cho khách sang ngày hôm sau'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hệ thống lưu trữ lịch sử giao dịch điện tử đầy đủ; nhân viên đối chiếu đúng thông tin chính chủ và hỗ trợ cấp lại thẻ vào phòng chiếu cho khách.'
      },
      {
        questionText: 'Thao tác khóa ghế (Seat Blocking) trên hệ thống sơ đồ phòng chiếu được áp dụng trong trường hợp nào?',
        options: [
          'Khóa ghế để nhân viên rạp tự vào xem phim miễn phí',
          'Khóa các ghế bị hỏng chức năng ngả lưng/gãy tay vịn, ghế dành cho khách VIP hoặc theo yêu cầu bảo trì kỹ thuật',
          'Khóa ghế đẹp nhất để chờ người nhà đến mua',
          'Khóa ngẫu nhiên không có lý do'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ghế có lỗi kỹ thuật hoặc sự cố vệ sinh bắt buộc phải khóa trên hệ thống để không bán cho khách hàng tránh khiếu nại.'
      },
      {
        questionText: 'Khách hàng doanh nghiệp yêu cầu xuất hóa đơn giá trị gia tăng (VAT điện tử) cho vé xem phim, nhân viên cần thu thập thông tin gì?',
        options: [
          'Chỉ cần tên giám đốc công ty',
          'Tên công ty đầy đủ, Mã số thuế (MST), địa chỉ đăng ký kinh doanh và địa chỉ email nhận hóa đơn điện tử',
          'Số tài khoản ngân hàng của giám đốc',
          'Chứng minh thư của người mua'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hóa đơn điện tử VAT hợp lệ theo quy định Tổng Cục Thuế bắt buộc phải có đầy đủ Tên công ty, MST chính xác và email nhận hóa đơn.'
      },
      {
        questionText: 'Khi khách hàng khiếu nại nhân viên thối thiếu tiền mặt sau khi rời quầy 5 mét, quy trình giải quyết chuẩn là:',
        options: [
          'Khẳng định ngay "Tiền trao cháo múc, rời quầy rạp không chịu trách nhiệm"',
          'Mời khách vào khu vực quầy nhã nhặn, báo Trưởng ca kiểm tra camera giám sát độ phân giải cao tại quầy và kiểm đếm chốt két tiền mặt đối chiếu',
          'Tự móc tiền túi đưa cho khách để đuổi khách đi',
          'Cãi nhau tay đôi với khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Camera quầy thu ngân luôn quay cận cảnh mệnh giá tiền giao nhận; đối chiếu camera và kiểm quỹ tức thì là giải pháp minh bạch, công bằng nhất.'
      },
      {
        questionText: 'Quy định đặt vé theo nhóm (Group Booking) từ 20 khách trở lên tại quầy vé Aurora là gì?',
        options: [
          'Từ chối bán vì số lượng quá đông',
          'Chuyển thông tin cho Trưởng ca/Bộ phận kinh doanh để áp dụng chính sách chiết khấu vé đoàn và hỗ trợ xuất vé liên thông hàng ghế đẹp',
          'Bắt từng người xếp hàng mua 20 lần riêng biệt',
          'Chỉ nhận đặt vé trước 1 tháng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đoàn khách đông được hưởng chính sách ưu đãi vé nhóm và cần sự điều phối của Trưởng ca để sắp xếp vị trí ghế ngồi liền dải tốt nhất.'
      },
      {
        questionText: 'Hành động trao vé, thẻ tín dụng và tiền thối cho khách hàng theo chuẩn "Aurora 5-Star" là gì?',
        options: [
          'Ném lên mặt quầy để khách tự nhặt',
          'Cầm bằng cả hai tay, ánh mắt nhìn khách mỉm cười thân thiện, nói lời cảm ơn và chúc khách xem phim vui vẻ',
          'Đưa bằng một tay trong khi tay kia bấm chuột',
          'Nhờ nhân viên đứng cạnh đưa hộ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đưa bằng hai tay kèm ánh mắt ấm áp và lời chúc chân thành thể hiện lòng tôn trọng cao nhất và tạo ấn tượng đẹp về sự chuyên nghiệp.'
      },
      {
        questionText: 'Khi suất chiếu phim 3D sắp diễn ra, nhân viên quầy vé có trách nhiệm tư vấn gì cho khách?',
        options: [
          'Bảo khách chuẩn bị sẵn kính râm ở nhà',
          'Nhắc nhở khách suất chiếu là định dạng 3D, thông báo kính 3D sẽ được phát tại cửa phòng chiếu và lưu ý đối với người có tiền sử chóng mặt',
          'Không cần thông báo gì',
          'Yêu cầu khách mua đứt kính 3D với giá 500.000đ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tư vấn rõ ràng về định dạng 3D giúp khách hàng chuẩn bị tâm lý và tránh trường hợp khách nhầm lẫn giữa suất 2D và 3D.'
      },
      {
        questionText: 'Biên bản chênh lệch quỹ tiền mặt (Cash Variance Report) được lập trong trường hợp nào?',
        options: [
          'Chỉ khi thừa tiền từ 1 triệu đồng trở lên',
          'Bất kỳ khi nào số tiền thực tế trong két lệch (dù thừa hay thiếu) so với số liệu doanh thu trên hệ thống POS cuối ca kiểm kê',
          'Không bao giờ cần lập biên bản',
          'Chỉ lập khi bị mất két'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bất kỳ chênh lệch âm hay dương dù chỉ 1.000đ cũng phải được ghi nhận biên bản giải trình rõ nguyên nhân để phục vụ đối soát kế toán.'
      },
      {
        questionText: 'Khi hệ thống mạng nội bộ bị ngắt kết nối Internet tạm thời, phần mềm POS Aurora vận hành ở chế độ nào?',
        options: [
          'Đóng cửa rạp nghỉ bán',
          'Chuyển sang chế độ Offline Mode bán vé cục bộ trong mạng LAN và tự động đồng bộ lên máy chủ Cloud ngay khi có kết nối trở lại',
          'Bán vé viết tay trên giấy trắng',
          'Cho khách vào xem tự do không cần vé'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiến trúc Offline-First của POS Aurora cho phép tiếp tục bán vé nội bộ mà không làm tê liệt vận hành quầy khi đứt cáp quang.'
      },
      {
        questionText: 'Quy tắc ngón tay trỏ khi hướng dẫn khách hàng xem sơ đồ ghế trên màn hình phụ là gì?',
        options: [
          'Dùng một ngón tay chỉ thẳng sát mắt khách',
          'Mở lòng bàn tay hướng về màn hình hoặc chỉ nhẹ nhàng vào khu vực ghế trung tâm (Sweet spot) tầm nhìn đẹp nhất cho khách lựa chọn',
          'Chỉ vào góc màn hình rồi thôi',
          'Không cho khách nhìn màn hình phụ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mở lòng bàn tay khép ngón là cử chỉ chuẩn mực trong ngành khách sạn và dịch vụ cao cấp, tránh cảm giác chỉ trỏ bất lịch sự.'
      },
      {
        questionText: 'Vị trí ghế ngồi "Sweet Spot" (Khu vực ghế trung tâm xem sướng nhất) trong phòng chiếu thường nằm ở đâu?',
        options: [
          'Hàng ghế đầu tiên sát mép màn hình (Hàng A)',
          'Khu vực giữa phòng chiếu (thường từ hàng E đến hàng J) nơi có góc nhìn toàn cảnh và cân bằng âm thanh stereo chuẩn nhất',
          'Hai ghế sát vách tường ngoài cùng',
          'Hàng ghế dưới chân máy chiếu góc tối'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khu vực trung tâm khoảng 2/3 chiều dài phòng chiếu mang lại góc nhìn 36° đến 40° chuẩn THX và đón trọn luồng âm thanh vòm hoàn hảo.'
      },
      {
        questionText: 'Khi khách hàng thắc mắc tại sao giá vé suất chiếu sau 22:00 lại rẻ hơn suất 19:30, nhân viên giải thích ra sao?',
        options: [
          'Vì ban đêm rạp chiếu phim chất lượng kém hơn',
          'Dạ thưa anh/chị, cụm rạp có chính sách ưu đãi giá vé suất chiếu muộn (Late Night Show) để khuyến khích khán giả trẻ trải nghiệm rạp đêm với mức giá tiết kiệm',
          'Do giám đốc thích giảm giá',
          'Vì ban đêm không có người trực'
        ],
        correctAnswerIndex: 1,
        explanation: 'Giải thích tích cực về chính sách giá vé khuyến khích kích cầu giúp khách hàng cảm thấy được hưởng lợi ích và tôn trọng.'
      },
      {
        questionText: 'Mã số đặt vé trực tuyến (Booking Code) của khách hàng mua qua App có đặc điểm gì?',
        options: [
          'Có thể đọc bừa cho nhân viên nghe',
          'Gồm chuỗi ký tự chữ/số và mã QR độc nhất vô nhị để quét trực tiếp tại máy in vé tự động (Kiosk) hoặc quầy POS lấy vé trong 5 giây',
          'Hết hạn sau 5 phút kể từ lúc đặt',
          'Chỉ dùng được 1 lần cho cả tuần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mã đặt chỗ trực tuyến tích hợp QR code mã hóa giúp lấy vé tức thì không cần chờ đợi xếp hàng tại quầy vé truyền thống.'
      },
      {
        questionText: 'Nếu khách hàng muốn mua vé cho một bộ phim chưa tới ngày công chiếu chính thức, đó là loại vé gì?',
        options: [
          'Vé lậu',
          'Vé suất chiếu sớm (Sneak Show / Early Access) hoặc vé đặt trước (Pre-sale) cho phim bom tấn theo thông báo của nhà phát hành',
          'Vé xem lại của tuần trước',
          'Vé không có chỗ ngồi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Vé Pre-sale hoặc Sneak Show là cơ hội để khán giả thưởng thức siêu phẩm trước ngày khởi chiếu chính thức toàn quốc.'
      },
      {
        questionText: 'Nhiệm vụ cuối cùng của nhân viên Box Office trước khi rời khỏi quầy kết thúc ca trực là gì?',
        options: [
          'Chạy ngay về nhà không cần bàn giao',
          'Đăng xuất tài khoản POS, đối soát nộp đủ tiền mặt vào két an toàn, vệ sinh sạch sẽ mặt quầy và ký biên bản bàn giao ca cho nhân viên tiếp theo',
          'Để máy tính bật nguyên trạng cho ca sau dùng chung tài khoản',
          'Tắt điều hòa phòng chiếu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đăng xuất tài khoản cá nhân và đối soát tài chính bảo vệ trách nhiệm cá nhân của nhân viên thu ngân và duy trì tính liên tục của rạp.'
      }
    ]
  },
  {
    id: 3,
    courseId: 1,
    courseTitle: 'Quy Trình Chuẩn Phục Vụ Khách Hàng AURORA Standard 2026',
    title: 'Kiểm Tra Quy Trình Soát Vé Usher, Điều Phối Sảnh & Bản Quyền Phòng Chiếu 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Thời điểm chuẩn bắt đầu mở cửa phòng chiếu để đón khán giả vào xem phim là khi nào?',
        options: [
          'Đúng giờ chiếu trên vé mới mở cửa',
          'Trước giờ chiếu phim từ 15 đến 20 phút (sau khi phòng chiếu đã được dọn vệ sinh sạch sẽ và kiểm tra thiết bị hoàn tất)',
          'Trước 45 phút',
          'Sau khi phim đã chiếu hết trailer quảng cáo'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mở cửa trước 15 - 20 phút giúp khán giả ổn định chỗ ngồi thong thả, tránh ùn tắc cửa ra vào và không bỏ lỡ phần đầu của bộ phim.'
      },
      {
        questionText: 'Quy trình kiểm tra vé tại cửa phòng chiếu (Usher Check) gồm những thao tác nào?',
        options: [
          'Chỉ nhìn lướt qua mặt khách hàng',
          'Mỉm cười chào đón, quét mã QR vé điện tử hoặc kiểm tra cuống vé giấy: đúng ngày chiếu, suất chiếu, số phòng chiếu, số ghế và xé cuống vé đúng quy cách',
          'Thu luôn toàn bộ vé của khách không trả lại',
          'Yêu cầu khách đọc to số ghế'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm tra 4 thông số: Tên phim, Số phòng, Giờ chiếu, Số ghế và xé đúng đường răng cưa trả lại cuống vé cho khách giữ đối chiếu chỗ ngồi.'
      },
      {
        questionText: 'Cách sử dụng đèn pin dẫn đường (Usher Flashlight) trong phòng chiếu tối đúng kỹ thuật là gì?',
        options: [
          'Rọi thẳng luồng ánh sáng vào mặt khách hàng để nhìn rõ mặt',
          'Rọi chùm sáng chúc xuống bậc tam cấp chân khách di chuyển, che bớt luồng sáng tản mát và hướng dẫn từng bước an toàn',
          'Bật đèn pin chớp nháy liên tục',
          'Rọi thẳng lên màn hình chiếu phim'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tuyệt đối không rọi vào mặt khách gây chói mắt khó chịu; luôn chiếu sáng chúc đất vào bậc tam cấp để phòng ngừa trượt ngã trong bóng tối.'
      },
      {
        questionText: 'Khi phát hiện một khán giả đang dùng điện thoại hoặc máy quay lén nội dung phim trên màn hình, quy trình xử lý chuẩn là gì?',
        options: [
          'Lập tức nhảy vào giật lấy máy điện thoại của khách',
          'Tiếp cận nhanh chóng, cúi người nói nhỏ lịch sự yêu cầu khách dừng quay ngay, nhắc nhở quy định bảo vệ bản quyền quốc tế và yêu cầu xóa đoạn video đã quay',
          'Bỏ qua coi như không thấy',
          'Tắt luôn máy chiếu phòng phim'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hành vi quay lén (Camcording) vi phạm nghiêm trọng Luật Sở Hữu Trí Tuệ; Usher phải can thiệp ngay lập tức một cách mềm mỏng nhưng kiên quyết.'
      },
      {
        questionText: 'Tần suất nhân viên Usher đi tuần tra kiểm tra an ninh trật tự bên trong phòng chiếu khi phim đang chạy là bao lâu?',
        options: [
          'Chỉ đứng ở ngoài cửa suốt cả buổi',
          'Mỗi 15 đến 20 phút/lần bước nhẹ vào phòng kiểm tra: chất lượng âm thanh, độ nét hình ảnh, nhiệt độ và trật tự khán giả',
          '2 tiếng mới vào một lần',
          'Chỉ vào khi có chuông báo động'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm tra định kỳ mỗi 15-20 phút giúp phát hiện sớm các sự cố kỹ thuật, khán giả gây ồn hoặc hành vi hút thuốc lá điện tử trong phòng kín.'
      },
      {
        questionText: 'Nếu phát hiện khán giả hút thuốc lá điện tử (Vape / Pod) nhả khói trong phòng chiếu, nhân viên cần xử lý ra sao?',
        options: [
          'Cho phép hút nếu không có ai ngồi bên cạnh',
          'Lập tức tiến đến nhắc nhở kiên quyết: Rạp nghiêm cấm tuyệt đối mọi hình thức hút thuốc vì khói sẽ kích hoạt đầu báo khói PCCC tự động reo chuông toàn tòa nhà',
          'Hút cùng với khách',
          'Đợi hết phim mới nhắc'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đầu cảm biến quang học báo khói rất nhạy; khói Vape có thể kích hoạt báo cháy giả làm ngắt điện và sơ tán toàn bộ rạp chiếu phim.'
      },
      {
        questionText: 'Khi có hai nhóm khách hàng cầm vé trùng cùng một số ghế ngồi (Double Booking), Usher giải quyết như thế nào?',
        options: [
          'Bảo hai bên tự oẳn tù tì phân định thắng thua',
          'Lịch sự xin phép xem lại cả 2 vé: đối chiếu kỹ ngày chiếu, giờ chiếu và số phòng; nếu trùng thật thì bố trí ngay ghế VIP tương đương còn trống và báo Trưởng ca',
          'Đuổi cả hai nhóm ra ngoài',
          'Bắt một nhóm đứng xem'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phần lớn do khách đi nhầm phòng hoặc nhầm ngày; nếu do lỗi hệ thống, Usher phải nhanh chóng bố trí ghế đẹp tương đương và bù đắp Voucher F&B.'
      },
      {
        questionText: 'Thời gian dọn dẹp vệ sinh phòng chiếu giữa 2 suất chiếu (Turnaround Time) tiêu chuẩn là bao nhiêu phút?',
        options: [
          'Chỉ có 1 phút',
          'Khoảng 10 đến 15 phút với sự phối hợp nhịp nhàng của đội ngũ Usher',
          'Khoảng 1 tiếng đồng hồ',
          'Không cần dọn, để ca đêm dọn một lần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thời gian Turnaround 10-15 phút đòi hỏi đội ngũ làm việc ăn ý: nhặt rác gầm ghế, quét sạch lối đi, lau vết nước đổ và xịt khử khuẩn trước khi đón đợt khách mới.'
      },
      {
        questionText: 'Các bước kiểm tra và vệ sinh phòng chiếu chuẩn sau khi hết phim bao gồm:',
        options: [
          'Chỉ gom rác to ở cửa ra vào',
          'Bật sáng đèn phòng -> Kiểm tra kỹ tài sản thất lạc trên ghế và gầm ghế -> Nhặt ly bắp nước thừa -> Quét dọn lối đi -> Kiểm tra cửa thoát hiểm đóng kín',
          'Tắt hết đèn rồi quét bóng tối',
          'Đẩy hết rác vào dưới gầm ghế'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bật sáng đèn tối đa giúp nhìn rõ từng ngóc ngách, đảm bảo không bỏ sót đồ rơi của khách và giữ phòng chiếu tinh tươm như mới.'
      },
      {
        questionText: 'Khi nhặt được tài sản có giá trị (ví tiền, điện thoại, túi xách) do khách bỏ quên, quy trình Lost & Found chuẩn là:',
        options: [
          'Bỏ vào balo cá nhân đợi xem có ai gọi thì trả',
          'Ghi nhận chính xác số phòng, số ghế nhặt được, lập tức bàn giao cho Duty Manager lập biên bản niêm phong và lưu kho an toàn trong vòng 10 phút',
          'Đăng bài lên trang cá nhân tìm chủ nhân',
          'Để nguyên trên ghế phòng chiếu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bàn giao ngay cho Quản lý ca trực lập biên bản 2 bên ký nhận đảm bảo tính minh bạch, camera ghi nhận và giúp khách nhận lại tài sản nhanh nhất.'
      },
      {
        questionText: 'Nhiệt độ phòng chiếu phim tiêu chuẩn Aurora Cinema được duy trì ở mức nào để khách thoải mái nhất?',
        options: [
          '16°C - 18°C',
          '22°C - 24°C',
          '28°C - 30°C',
          'Không bật điều hòa'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhiệt độ 22°C - 24°C là mức nhiệt tối ưu cho cơ thể ngồi tĩnh trong phòng chiếu từ 2 đến 3 tiếng mà không bị quá rét hoặc ngột ngạt.'
      },
      {
        questionText: 'Quy trình phát và thu hồi kính xem phim 3D / IMAX tại cửa phòng chiếu là gì?',
        options: [
          'Khách tự tìm trong thùng rác lấy kính',
          'Phát kính sạch kèm khăn lau nano chuyên dụng cho từng khách; khi hết phim đứng tại cửa đón nhận lại kính nhẹ nhàng và chuyển về khay vệ sinh tia cực tím UV',
          'Cho khách mang về nhà không cần trả',
          'Không cho khách lau kính'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kính 3D được khử trùng bằng tủ sấy tia UV sau mỗi suất chiếu để đảm bảo vệ sinh mắt tuyệt đối cho khán giả tiếp theo.'
      },
      {
        questionText: 'Khi có trẻ em khóc to hoặc gây ồn ào kéo dài trong phòng chiếu ảnh hưởng các khán giả khác, Usher xử lý ra sao?',
        options: [
          'Quát mắng phụ huynh gay gắt',
          'Tiến lại gần phụ huynh, cúi người nói nhỏ tế nhị: mời phụ huynh bế bé ra khu vực sảnh nghỉ ngơi một chút cho bé bình tĩnh lại và quay lại sau',
          'Bật đèn cả phòng chiếu lên',
          'Đuổi phụ huynh ra về không hoàn tiền'
        ],
        correctAnswerIndex: 1,
        explanation: 'Gợi ý nhẹ nhàng đưa bé ra sảnh dỗ dành vừa giúp phụ huynh đỡ ngượng ngùng vừa bảo vệ không gian thưởng thức nghệ thuật của cả phòng chiếu.'
      },
      {
        questionText: 'Cửa thoát hiểm ở phía sau màn hình phòng chiếu có quy định an toàn gì?',
        options: [
          'Có thể lấy xích khóa chặt để chống trộm',
          'Luôn sử dụng thanh đẩy thoát hiểm Panic Bar một chiều, tuyệt đối không chèn vật cản và tự động đóng kín để ngăn cách tiếng ồn bên ngoài',
          'Mở toang cửa cho gió thổi vào trong lúc chiếu phim',
          'Dùng làm nơi chất bàn ghế cũ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Cửa thoát hiểm phải thông thoáng 100% không vật cản và cơ chế mở 1 chiều từ trong ra ngoài để sơ tán tức thì khi có biến cố.'
      },
      {
        questionText: 'Khi thấy khán giả gác cả hai chân lên thành ghế phía trước, hành động chuẩn của Usher là:',
        options: [
          'Lấy đèn pin gõ vào chân khách',
          'Tiếp cận nhã nhặn, khẽ nghiêng người nhắc nhỏ: "Dạ em chào anh/chị, anh/chị vui lòng hạ chân xuống giúp em để giữ vệ sinh ghế ngồi chung ạ, em cảm ơn anh/chị"',
          'Chụp ảnh khách đăng lên mạng xã hội',
          'Kệ khách vì khách đã trả tiền vé'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lời nhắc nhỏ nhẹ, chân thành nhưng rõ ràng giúp khách nhận ra hành vi chưa đẹp và điều chỉnh ngay mà không làm tổn thương lòng tự trọng.'
      },
      {
        questionText: 'Tác phong đứng trực cửa phòng chiếu của nhân viên Usher trong suốt ca trực yêu cầu:',
        options: [
          'Ngồi bệt xuống đất chơi game điện thoại',
          'Đứng thẳng lưng, hai tay đan nhẹ phía trước hoặc sau lưng, mắt quan sát sảnh với nụ cười thân thiện, sẵn sàng hỗ trợ khách',
          'Dựa lưng vào tường và đeo tai nghe nghe nhạc cá nhân',
          'Bỏ vị trí đi dạo quanh trung tâm thương mại'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tác phong chuẩn mực, không sử dụng điện thoại và luôn trong tư thế sẵn sàng thể hiện tinh thần hiếu khách đẳng cấp của Aurora Cinema.'
      },
      {
        questionText: 'Câu chào chuẩn mực của Usher khi kết thúc suất chiếu và tạm biệt khán giả ra về là:',
        options: [
          'Hết phim rồi, mọi người ra nhanh cho em dọn',
          '"Aurora Cinema xin cảm ơn quý khách, chúc quý khách một ngày thật vui vẻ và hẹn gặp lại quý khách lần sau ạ!"',
          'Không cần nói gì',
          'Ai có rác thì tự cầm ra vứt'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lời cảm ơn và lời chúc ấm áp ở cửa ra là điểm chạm cảm xúc cuối cùng tạo nên ký ức khó quên về chất lượng dịch vụ của rạp.'
      },
      {
        questionText: 'Quy định đối với việc mang thức ăn, đồ uống từ bên ngoài vào rạp chiếu phim được xử lý thế nào?',
        options: [
          'Giật thức ăn ném vào sọt rác trước mặt khách',
          'Lịch sự giải thích nội quy rạp: rạp hạn chế các loại thức ăn có mùi nồng (sầu riêng, mắm, bún đậu...) gây ảnh hưởng không gian kín và hỗ trợ bảo quản tại quầy',
          'Cho phép mang mọi loại đồ ăn có mùi vào rạp',
          'Phạt tiền khách 500.000đ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phòng chiếu là không gian kín máy lạnh tuần hoàn; thực phẩm nặng mùi sẽ bám vào đệm ghế và làm ảnh hưởng nghiêm trọng đến mọi người xung quanh.'
      },
      {
        questionText: 'Khi phát hiện một chiếc ghế trong phòng chiếu bị ướt nước ngọt trước khi khách vào ngồi, Usher cần làm gì?',
        options: [
          'Lấy áo của mình lau',
          'Lấy khăn thấm hút lau sạch nhanh, đặt biển thông báo hoặc khóa ghế trên hệ thống và chủ động hướng dẫn khách sang vị trí ghế bên cạnh tốt hơn',
          'Kệ để khách ngồi lên tự khô',
          'Tắt điện phòng chiếu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chủ động phát hiện và chuyển đổi chỗ ngồi cho khách trước khi khách bị ướt đồ là phản xạ bảo vệ trải nghiệm khách hàng xuất sắc.'
      },
      {
        questionText: 'Quy trình kiểm tra hệ thống nhà vệ sinh rạp phim (Restroom Check) của nhân viên Usher định kỳ là:',
        options: [
          'Một ngày kiểm tra 1 lần lúc đóng cửa',
          'Mỗi 30 phút kiểm tra: giấy vệ sinh, xà phòng rửa tay, độ sạch của gương/sàn, thùng rác và ký xác nhận vào bảng Checklist treo tại cửa',
          'Khi nào khách phàn nàn bẩn mới vào xem',
          'Không phải nhiệm vụ của rạp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhà vệ sinh sạch sẽ, khô ráo, thơm mát và đủ giấy/xà phòng là một trong những tiêu chí chấm điểm chất lượng 5 sao khắt khe nhất của khách hàng.'
      },
      {
        questionText: 'Khi có khách hàng sử dụng xe lăn đến cửa phòng chiếu, Usher cần hỗ trợ như thế nào?',
        options: [
          'Tự tiện đẩy xe lăn chạy thật nhanh',
          'Hỏi ý kiến khách trước: "Dạ em chào anh/chị, em có thể hỗ trợ đẩy xe cho anh/chị vào vị trí ghế chuyên dụng được không ạ?" và di chuyển cẩn trọng nhẹ nhàng',
          'Bảo khách để xe lăn ở ngoài sảnh rồi tự đi bộ vào',
          'Từ chối đón tiếp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Luôn hỏi ý kiến trước khi chạm vào xe lăn thể hiện sự tôn trọng không gian cá nhân của người khuyết tật.'
      },
      {
        questionText: 'Khi suất chiếu đã đến giờ chiếu 5 phút nhưng màn hình vẫn tối đen và chưa có âm thanh, Usher cần làm gì?',
        options: [
          'Đứng im không nói gì',
          'Liên hệ ngay qua bộ đàm cho bộ phận Kỹ thuật máy chiếu (Booth/Projectionist) để kiểm tra tín hiệu và thông báo xoa dịu khách hàng trong phòng',
          'Bảo khách về nhà đi phim hỏng rồi',
          'Tự ý vào phòng máy bấm linh tinh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kênh liên lạc bộ đàm nội bộ giữa Usher và Kỹ thuật viên phòng chiếu giúp khắc phục sự cố chỉ trong 60 giây trước khi khán giả sốt ruột.'
      },
      {
        questionText: 'Biển báo "Sàn ướt cẩn thận trượt ngã" (Wet Floor) bắt buộc phải được đặt ở đâu?',
        options: [
          'Cất trong kho không bao giờ dùng',
          'Đặt ngay tại vị trí sàn vừa lau ướt hoặc khu vực có nước đổ chưa kịp khô để cảnh báo phòng ngừa tai nạn trượt chân cho khách',
          'Đặt chắn giữa cửa ra vào',
          'Đặt trên ghế ngồi của khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Biển cảnh báo sàn ướt màu vàng dạ quang là quy chuẩn an toàn bắt buộc để loại trừ 100% rủi ro trượt ngã gây chấn thương.'
      },
      {
        questionText: 'Nhân viên Usher có được phép ngồi xem phim cùng khán giả trong ca trực hay không?',
        options: [
          'Được phép ngồi xem nếu phim hay',
          'Tuyệt đối nghiêm cấm việc ngồi xem phim hoặc làm việc riêng trong ca trực vì phải tập trung cao độ giám sát an ninh và hỗ trợ khách hàng',
          'Chỉ được xem 30 phút',
          'Tùy sở thích nhân viên'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kỷ luật ca trực nghiêm cấm nhân viên xem phim trong giờ làm việc để đảm bảo an toàn, giám sát bản quyền và tác phong chuyên nghiệp.'
      },
      {
        questionText: 'Khi phát hiện một khán giả có biểu hiện say xỉn, nói năng mất kiểm soát gây rối tại sảnh phòng chiếu, Usher cần làm gì?',
        options: [
          'Xông vào đánh nhau với khách',
          'Giữ khoảng cách an toàn, dùng lời lẽ ôn hòa khuyên can và lập tức bấm bộ đàm gọi Đội An ninh/Bảo vệ và Trưởng ca ra phối hợp giải quyết',
          'Khóa nhốt khách vào phòng chiếu',
          'Bỏ chạy'
        ],
        correctAnswerIndex: 1,
        explanation: 'Không đối đầu trực tiếp; phối hợp với bảo vệ chuyên nghiệp để cách ly đối tượng quá khích ra khỏi khu vực đông người một cách an toàn.'
      },
      {
        questionText: 'Quy trình thu gom rác tái chế và rác hữu cơ sau mỗi suất chiếu tại rạp phim là gì?',
        options: [
          'Đổ chung tất cả vào một bao rồi vứt ra đường',
          'Phân loại riêng vỏ chai nhựa/lon nhôm tái chế với bao bì giấy bắp và thức ăn thừa, vứt đúng thùng rác phân loại theo tiêu chuẩn môi trường xanh',
          'Để nguyên trên ghế',
          'Chôn rác trong phòng kỹ thuật'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chính sách Aurora Green Cinema cam kết phân loại rác tái chế góp phần bảo vệ môi trường và giảm thiểu rác thải nhựa.'
      },
      {
        questionText: 'Thao tác kiểm tra âm lượng phòng chiếu bằng thiết bị đo SPL (Decibel Meter) khi phim đang chạy thực hiện như thế nào?',
        options: [
          'Đứng ngoài cửa áp tai vào nghe',
          'Đứng tại vị trí hàng ghế trung tâm phòng chiếu, bật máy đo chuẩn dBC, đối chiếu mức âm lượng chuẩn 85 dBC trong các phân cảnh cao trào',
          'Hỏi khách xem có to quá không',
          'Mở volume hết cỡ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đo âm thanh tại tâm phòng chiếu đảm bảo áp suất âm thanh đạt chuẩn Hollywood mà không làm chói tai hoặc gây ảnh hưởng thính lực người xem.'
      },
      {
        questionText: 'Khi khách hàng bị vấp ngã tại bậc tam cấp phòng chiếu, hành động đầu tiên của Usher là:',
        options: [
          'Đứng cười rồi quay video clip',
          'Tiếp cận ngay lập tức, ân cần hỏi thăm: "Anh/chị có bị đau ở đâu không ạ?", hỗ trợ khách đứng dậy từ từ và báo Trưởng ca mang hộp y tế sơ cứu nếu trầy xước',
          'Trách móc khách không chú ý nhìn đường',
          'Bảo khách tự đứng dậy đi tiếp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Sự quan tâm chăm sóc ân cần tức thì giúp xoa dịu cơn đau và sự ngượng ngùng của khách, đồng thời phòng ngừa các chấn thương nặng hơn.'
      },
      {
        questionText: 'Nhiệm vụ kiểm tra cuối ca của Usher trước khi bàn giao phòng chiếu cho ca đêm là gì?',
        options: [
          'Về sớm 15 phút không cần dọn',
          'Kiểm tra toàn bộ các phòng chiếu đã tắt điện chiếu sáng chính, tắt điều hòa không cần thiết, cửa thoát hiểm chốt an toàn và không còn khán giả ngủ quên',
          'Chỉ cần tắt bóng đèn sảnh',
          'Để cửa phòng chiếu mở toang'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đảm bảo không còn khán giả ngủ quên trong phòng chiếu và mọi cửa nẻo được khóa an toàn là trách nhiệm then chốt khi chốt ca rạp.'
      },
      {
        questionText: 'Giá trị quan trọng nhất mà một nhân viên Usher mang lại cho khán giả tại Aurora Cinema là gì?',
        options: [
          'Xé vé càng nhanh càng tốt',
          'Sự an tâm, an toàn, không gian thưởng thức điện ảnh văn minh sạch sẽ và sự đồng hành chu đáo trong suốt hành trình xem phim',
          'Bán thật nhiều bắp nước',
          'Giữ trật tự bằng sự đe dọa'
        ],
        correctAnswerIndex: 1,
        explanation: 'Usher là người bảo vệ trải nghiệm cảm xúc của khán giả, kiến tạo không gian điện ảnh thăng hoa và an toàn tuyệt đối.'
      }
    ]
  },
  {
    id: 4,
    courseId: 3,
    courseTitle: 'An Toàn Phòng Cháy Chữa Cháy & Sơ Tán Phòng Chiếu IMAX',
    title: 'Kiểm Tra Nghiệp Vụ An Toàn PCCC, Cứu Hộ Cứu Nạn & Sơ Tán Khẩn Cấp 2026',
    passScore: 85,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Hành động ĐẦU TIÊN và QUAN TRỌNG NHẤT của nhân viên rạp khi chuông báo cháy tự động reo là gì?',
        options: [
          'Bỏ chạy một mình ra thang máy tòa nhà',
          'Bật sáng đèn phòng chiếu lên mức tối đa (House Lights Full), mở toang toàn bộ các cửa thoát hiểm và điều phối sơ tán bình tĩnh theo biển EXIT',
          'Tiếp tục để phim chiếu chờ bảo vệ xác nhận',
          'Khóa chặt cửa phòng chiếu để khách không ùa ra sảnh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bật sáng toàn bộ đèn phòng chiếu giúp xua tan bóng tối và cơn hoảng loạn, mở cửa thoát hiểm tạo lối thoát thông thoáng ngay tức khắc.'
      },
      {
        questionText: 'Tại sao TUYỆT ĐỐI NGHIÊM CẤM sử dụng thang máy khi có tình huống cháy nổ tại tòa nhà rạp chiếu phim?',
        options: [
          'Vì thang máy chạy chậm hơn thang bộ',
          'Vì hố thang máy tạo hiệu ứng ống khói hút khí độc, nhiệt độ cực cao và hệ thống điện tòa nhà có thể bị ngắt làm kẹt người bên trong buồng thang',
          'Vì thang máy chỉ dành riêng cho Ban Giám Đốc',
          'Vì tải trọng thang máy có hạn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hố thang máy là ống khói khổng lồ hút toàn bộ khí CO độc hại và mất điện sẽ biến buồng thang thành chiếc lồng thiêu chết người.'
      },
      {
        questionText: 'Bình chữa cháy khí CO2 (vòi loa loe to, vỏ màu đen/đỏ không có đồng hồ áp suất) KHÔNG ĐƯỢC xịt vào trường hợp nào?',
        options: [
          'Cháy thiết bị điện tử trong phòng máy chiếu',
          'Cháy kim loại kiềm, than cốc hoặc xịt trực tiếp vào cơ thể người (nguy cơ bỏng lạnh cực sâu -79°C gây hoại tử)',
          'Cháy bảng điện tủ rack',
          'Cháy máy tính POS'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khí CO2 giãn nở làm nhiệt độ tụt sâu xuống -79°C gây bỏng lạnh hoại tử da thịt ngay lập tức nếu tiếp xúc da người.'
      },
      {
        questionText: 'Hệ thống đèn chiếu sáng sự cố khẩn cấp (Emergency Lights) và biển báo EXIT phải hoạt động được tối thiểu bao lâu khi mất điện hoàn toàn?',
        options: [
          '10 phút',
          'Tối thiểu 90 đến 120 phút nhờ bộ ắc quy lưu điện dự phòng',
          'Chỉ 5 phút',
          'Không cần ắc quy dự phòng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiêu chuẩn PCCC quốc gia yêu cầu ắc quy đèn chiếu sáng sự cố duy trì tối thiểu 90 - 120 phút đủ để hoàn tất cứu nạn toàn diện.'
      },
      {
        questionText: 'Kim đồng hồ áp suất trên bình chữa cháy bột khô ABC chỉ ở vị trí nào là bình đạt chuẩn sẵn sàng hoạt động?',
        options: [
          'Vạch màu đỏ bên trái (Tụt áp)',
          'Vạch màu xanh lá cây ở giữa (Áp suất đạt tiêu chuẩn)',
          'Vạch màu vàng bên phải (Quá áp nhẹ)',
          'Kim chỉ số 0'
        ],
        correctAnswerIndex: 1,
        explanation: 'Vạch xanh biểu thị áp suất khí đẩy nitơ bên trong bình đạt mức tối ưu từ 1.2 đến 1.4 MPa để phun bột dập lửa hiệu quả.'
      },
      {
        questionText: 'Khoảng cách an toàn tiêu chuẩn khi cầm bình bột chữa cháy xịt vào gốc ngọn lửa là bao nhiêu?',
        options: [
          'Đứng sát cách 10 cm',
          'Cách xa từ 1.5 mét đến 2.5 mét và đứng ở đầu hướng gió',
          'Cách xa 10 mét',
          'Đứng ở cuối hướng gió xịt ngược lại'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đứng cách 1.5 - 2.5m ở đầu hướng gió giúp luồng bột trùm kín đám cháy mà không bị lửa tạt hoặc hít phải khói độc.'
      },
      {
        questionText: 'Thao tác 4 bước chuẩn (Quy tắc P.A.S.S) khi sử dụng bình chữa cháy xách tay là gì?',
        options: [
          'Ném bình vào đống lửa rồi chạy',
          'Pull (Rút chốt an toàn) -> Aim (Hướng loa phun vào gốc lửa) -> Squeeze (Bóp cò van xả) -> Sweep (Quét loa qua lại bao phủ đám cháy)',
          'Lắc mạnh -> Mở nắp -> Đổ bột ra sàn -> Quét',
          'Bóp cò -> Rút chốt -> Hướng vòi lên trời'
        ],
        correctAnswerIndex: 1,
        explanation: 'Quy tắc vàng P.A.S.S (Pull - Aim - Squeeze - Sweep) được huấn luyện toàn cầu cho mọi nhân viên xử lý đám cháy ban đầu trong 30 giây.'
      },
      {
        questionText: 'Khi di chuyển qua khu vực có nhiều khói độc và khí nóng bốc lên, tư thế chuẩn để thoát hiểm là:',
        options: [
          'Đứng thẳng chạy thật nhanh',
          'Hạ thấp trọng tâm, khom lưng hoặc bò men theo chân tường, dùng khăn/vải ướt bịt kín mũi và miệng',
          'Nằm ngửa nhìn lên trần nhà',
          'Nhảy từ trên cao xuống'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khí độc và nhiệt độ nóng bốc lên cao; lớp không khí sạch giàu oxy nhất luôn nằm ở khoảng cách 30-50cm sát mặt sàn nhà.'
      },
      {
        questionText: 'Quy trình sơ tán phòng chiếu IMAX đông người (trên 300 khán giả) yêu cầu nhân viên điều phối như thế nào?',
        options: [
          'La hét thật to: "Cháy rồi chạy mau đi bà con"',
          'Dùng loa cầm tay dõng dạc, phát khẩu lệnh rõ ràng: "Yêu cầu quý khách bình tĩnh, di chuyển theo hàng lần lượt theo sự hướng dẫn của nhân viên ra cửa thoát hiểm gần nhất, không xô đẩy"',
          'Bỏ mặc khách tự tìm đường thoát',
          'Khóa cửa đợi bảo vệ đến'
        ],
        correctAnswerIndex: 1,
        explanation: 'Giọng nói bình tĩnh, khẩu lệnh dứt khoát và phong thái tự tin của nhân viên là liều thuốc dập tắt tâm lý hoảng loạn giẫm đạp đám đông.'
      },
      {
        questionText: 'Nút ấn báo cháy khẩn cấp bằng tay (Manual Call Point) gắn tường được kích hoạt bằng cách nào?',
        options: [
          'Dùng búa đập vỡ kính hoặc nhấn mạnh vào tâm vòng tròn công tắc báo động',
          'Rút dây điện ra',
          'Thổi gió vào',
          'Chỉ nhấn khi có sự đồng ý của toàn bộ nhân viên'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ấn nút khẩn cấp thủ công truyền tín hiệu ngay về tủ trung tâm báo cháy để kích hoạt chuông còi và tự động nhả chốt cửa thoát hiểm.'
      },
      {
        questionText: 'Hệ thống đầu phun nước tự động Sprinkler chữa cháy trần nhà thường kích hoạt nổ ống thủy tinh ở nhiệt độ nào?',
        options: [
          '40°C',
          'Khoảng 68°C (ống thủy tinh chứa chất lỏng màu đỏ tiêu chuẩn)',
          '150°C',
          '200°C'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhiệt độ 68°C làm giãn nở vỡ ống thủy tinh màu đỏ của đầu Sprinkler, giải phóng áp lực nước chữa cháy tự động bao phủ khu vực.'
      },
      {
        questionText: 'Kỹ thuật hồi sinh tim phổi CPR cơ bản cho nạn nhân bất tỉnh ngừng thở bao gồm tỷ lệ ép tim và thổi ngạt nào?',
        options: [
          '10 lần ép tim - 5 lần thổi ngạt',
          '30 lần ép tim ngoài lồng ngực sâu 5cm (tần số 100 - 120 lần/phút) kết hợp 2 lần thổi ngạt liên tục',
          'Chỉ cần xoa dầu gió vào trán',
          '100 lần thổi ngạt không ép tim'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tỷ lệ 30:2 (30 lần ép tim lồng ngực sâu 5-6cm và 2 lần hà hơi thổi ngạt) là phác đồ chuẩn quốc tế duy trì tuần hoàn máu não.'
      },
      {
        questionText: 'Khi có nạn nhân bị co giật, động kinh trong phòng chiếu, cách sơ cứu ĐÚNG là gì?',
        options: [
          'Dùng thìa kim loại cậy răng nhét vào miệng nạn nhân',
          'Kê vật mềm dưới đầu, nới lỏng cổ áo, nghiêng người nạn nhân sang một bên để đờm nhớt chảy ra, dọn sạch vật sắc nhọn xung quanh và tuyệt đối KHÔNG nhét bất cứ thứ gì vào miệng',
          'Đè chặt chân tay ghì nạn nhân xuống đất',
          'Tát vào mặt nạn nhân'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhét vật cứng vào miệng có thể gây gãy răng rơi vào đường thở làm ngạt thở tử vong; chỉ cần bảo vệ đầu và đặt nằm nghiêng an toàn.'
      },
      {
        questionText: 'Sơ cứu vết bỏng nhiệt (do dầu bơ nồi bắp hoặc nước sôi) đúng quy chuẩn y tế là gì?',
        options: [
          'Bôi kem đánh răng hoặc mỡ trăn lên vết thương ngay',
          'Ngâm rửa vết bỏng dưới vòi nước sạch mát (15°C - 20°C) chảy nhẹ liên tục từ 15 đến 20 phút, sau đó băng nhẹ bằng gạc vô trùng',
          'Đắp đá lạnh đóng băng trực tiếp lên da',
          'Chọc vỡ các bọng nước phồng rộp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Xả nước mát 15-20 phút giúp hạ nhiệt vùng mô sâu, giảm đau rát tức thì; đắp đá lạnh sâu sẽ gây sốc nhiệt và hoại tử tế bào da.'
      },
      {
        questionText: 'Khi phát hiện mùi khét điện bốc lên từ ổ cắm hoặc thiết bị tại quầy Concession, thao tác khẩn cấp là:',
        options: [
          'Đổ nước vào ổ cắm',
          'Lập tức ngắt Aptomat (Cầu dao) điện tổng của khu vực đó, không bật tắt bất kỳ công tắc nào phát sinh tia lửa và báo Trưởng ca kỹ thuật',
          'Dùng quạt thổi cho bớt mùi',
          'Tiếp tục cắm thêm thiết bị'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ngắt nguồn điện ngay lập tức triệt tiêu nguồn nhiệt sinh lửa và phòng ngừa nguy cơ chập cháy điện lan rộng toàn bộ quầy.'
      },
      {
        questionText: 'Túi y tế sơ cấp cứu tại cụm rạp Aurora bắt buộc phải được trang bị tại những vị trí nào?',
        options: [
          'Chỉ cất ở phòng giám đốc khóa cửa',
          'Luôn đặt tại Quầy Box Office tiếp tân sảnh và Phòng Quản lý ca trực (Duty Manager Room) với đầy đủ bông băng, cồn đỏ, nẹp gạc vô trùng',
          'Để trong nhà kho rác',
          'Không cần trang bị'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hộp sơ cứu phải đặt tại nơi dễ thấy, dễ lấy 24/7 có phân công người kiểm tra hạn dùng thuốc và vật tư định kỳ hàng tháng.'
      },
      {
        questionText: 'Quy định pháp luật về việc chốt khóa cửa thoát hiểm EXIT trong giờ rạp mở cửa đón khách như thế nào?',
        options: [
          'Được phép khóa bằng ổ khóa xích sắt',
          'Tuyệt đối NGHIÊM CẤM khóa trái hoặc chèn bất kỳ vật cản nào chặn lối thoát hiểm khi rạp đang có khách bên trong',
          'Được khóa nếu có 1 nhân viên giữ chìa',
          'Chỉ khóa vào buổi tối'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khóa cửa thoát hiểm khi có người bên trong là hành vi vi phạm pháp luật hình sự đặc biệt nghiêm trọng có thể dẫn đến thảm họa tử vong hàng loạt.'
      },
      {
        questionText: 'Số điện thoại khẩn cấp quốc gia để báo cháy và yêu cầu cứu nạn cứu hộ tại Việt Nam là gì?',
        options: [
          '113',
          '114',
          '115',
          '111'
        ],
        correctAnswerIndex: 1,
        explanation: '114 là đường dây nóng khẩn cấp kết nối trực tiếp với Trung tâm thông tin chỉ huy Cảnh sát PCCC & CNCH toàn quốc.'
      },
      {
        questionText: 'Số điện thoại khẩn cấp gọi xe cứu thương y tế cấp cứu ngoại viện là gì?',
        options: [
          '113',
          '114',
          '115',
          '112'
        ],
        correctAnswerIndex: 2,
        explanation: '115 là số tổng đài cấp cứu y tế quốc gia.'
      },
      {
        questionText: 'Các tổ nghiệp vụ trong Đội Phòng cháy chữa cháy cơ sở tại cụm rạp bao gồm:',
        options: [
          'Tổ bán hàng và tổ bảo vệ',
          'Tổ Chỉ huy ứng phó, Tổ Hướng dẫn thoát nạn & Sơ tán, Tổ Chữa cháy trực tiếp tại chỗ, Tổ Cứu thương & Di tản tài sản',
          'Chỉ cần 1 người là đủ',
          'Tổ quay phim'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phân công 4 tổ chuyên biệt giúp vận hành quy trình ứng cứu khẩn cấp chính xác, không giẫm chân lên nhau khi sự cố xảy ra.'
      },
      {
        questionText: 'Điểm tập kết an toàn (Assembly Point) sau khi hoàn tất sơ tán khỏi rạp chiếu phim là ở đâu?',
        options: [
          'Tập trung tại sảnh thang máy tòa nhà',
          'Khu vực sân trống thông thoáng ngoài trời của tòa nhà trung tâm thương mại theo sơ đồ quy định PCCC',
          'Trốn vào tầng hầm để xe',
          'Tập trung tại nóc tòa nhà'
        ],
        correctAnswerIndex: 1,
        explanation: 'Điểm tập kết ngoài trời không bị ảnh hưởng bởi khói độc, sập đổ công trình và thuận tiện cho việc điểm danh quân số nhân viên/khán giả.'
      },
      {
        questionText: 'Khi thực hiện sơ tán khẩn cấp, nhân viên chốt chặn cửa có nhiệm vụ gì trước khi rời đi cuối cùng?',
        options: [
          'Chụp ảnh selfie làm kỷ niệm',
          'Kiểm tra nhanh toàn bộ phòng chiếu, nhà vệ sinh xem còn ai mắc kẹt hoặc ngất xỉu không rồi mới rút lui ra điểm tập kết an toàn',
          'Khóa cửa nhốt người còn lại',
          'Mang theo bắp rang ăn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhà vệ sinh là nơi khán giả dễ không nghe thấy chuông báo động; nhân viên chốt hậu phải gõ cửa kiểm tra quét sạch toàn bộ rạp.'
      },
      {
        questionText: 'Khi phát hiện có tiếng rít xì ga lớn hoặc mùi khí CO2 rò rỉ nồng độ cao trong kho bắp nước, hành động cần làm là:',
        options: [
          'Chạy vào hít thử xem có phải CO2 không',
          'Không bước vào vùng trũng (vì khí CO2 nặng hơn không khí chìm sát đất), mở toang các cửa thông gió sảnh, ngắt van khóa ngoài và báo sơ tán',
          'Bật diêm kiểm tra rò rỉ',
          'Đóng kín cửa kho'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khí CO2 không màu, nặng hơn không khí và chiếm chỗ của oxy; hít phải nồng độ cao trong phòng kín sẽ gây ngất lịm tử vong sau vài giây.'
      },
      {
        questionText: 'Tần suất tổ chức thực tập phương án PCCC & Cứu nạn cứu hộ định kỳ theo Luật PCCC là bao lâu?',
        options: [
          '10 năm một lần',
          'Tối thiểu 01 lần/năm đối với cơ sở tập trung đông người như rạp chiếu phim',
          'Không bắt buộc diễn tập',
          '5 năm một lần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Rạp chiếu phim là cơ sở công cộng bắt buộc diễn tập phương án PCCC và thoát nạn tối thiểu 1 lần mỗi năm theo quy định Bộ Công An.'
      },
      {
        questionText: 'Cuộn vòi chữa cháy vách tường trong hộp chữa cháy tủ kính được vận hành như thế nào?',
        options: [
          'Cầm cả cuộn ném vào đám cháy',
          'Mở cửa tủ, rải cuộn vòi thẳng không bị xoắn gấp, lắp một đầu vào van họng nước, lắp đầu kia vào lăng phun, mở van xả nước và giữ chắc tay cầm',
          'Đổ dầu vào vòi',
          'Cắt dây vòi ra'
        ],
        correctAnswerIndex: 1,
        explanation: 'Rải vòi thẳng chống xoắn gập giúp lưu lượng nước đạt áp suất cực đại (0.4 - 0.6 MPa) dập tắt các đám cháy lớn hiệu quả.'
      },
      {
        questionText: 'Phát ngôn đối với cơ quan truyền thông, nhà báo và người dân xung quanh khi rạp có sự cố cháy nổ là trách nhiệm của ai?',
        options: [
          'Bất kỳ nhân viên nào cũng có quyền trả lời phỏng vấn theo ý mình',
          'Chỉ Người phát ngôn chính thức được Ban Giám Đốc công ty ủy quyền bằng văn bản mới có thẩm quyền cung cấp thông tin chính xác',
          'Nhân viên bảo vệ',
          'Người xem phim'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhân viên tuyệt đối không suy đoán hoặc phát ngôn tùy tiện trên mạng xã hội tránh gây hoang mang dư luận và vi phạm quy chế bảo mật công ty.'
      },
      {
        questionText: 'Chất liệu rèm màn chiếu và thảm sàn trong phòng chiếu rạp Aurora bắt buộc phải đạt tiêu chuẩn gì?',
        options: [
          'Chất liệu nilon dễ bắt lửa',
          'Chất liệu đã qua xử lý hóa chất chống cháy chậm (Fire-Retardant) tiêu chuẩn khó bắt lửa và không phát sinh khói độc đậm đặc',
          'Bằng gỗ ép thông thường',
          'Không có tiêu chuẩn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mọi vật liệu nội thất phòng chiếu rạp hiện đại đều phải được kiểm định chống cháy lan để kéo dài thời gian thoát hiểm quý báu.'
      },
      {
        questionText: 'Khi nạn nhân bị gãy xương cẳng chân do xô đẩy ngã cầu thang, nguyên tắc sơ cứu cố định là gì?',
        options: [
          'Kéo giật mạnh chân nạn nhân cho thẳng lại',
          'Giữ nguyên tư thế gãy, dùng nẹp y tế hoặc thanh gỗ cố định bất động cả 2 khớp (khớp gối và khớp cổ chân) trước khi vận chuyển nạn nhân',
          'Bắt nạn nhân tự đứng dậy đi',
          'Xoa bóp rượu gừng lên vết gãy'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bất động 2 khớp trên và dưới ổ gãy ngăn đầu xương sắc nhọn đâm rách mạch máu và dây thần kinh xung quanh.'
      },
      {
        questionText: 'Quy trình kiểm tra bảo trì bình chữa cháy định kỳ hàng tháng của nhân viên an toàn bao gồm:',
        options: [
          'Xịt thử xem bình còn bột không rồi cất đi',
          'Kiểm tra tem kiểm định còn hạn, kim đồng hồ áp suất vạch xanh, chốt chì niêm phong nguyên vẹn, vỏ bình không móp rỉ sét và cân trọng lượng',
          'Sơn lại vỏ bình cho đẹp',
          'Không cần kiểm tra'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm tra chốt chì, đồng hồ đo áp và lắc đảo bình bột định kỳ giúp bột không bị vón cục ở đáy bình và sẵn sàng dập lửa.'
      },
      {
        questionText: 'Khẩu hiệu cốt lõi về an toàn lao động và PCCC tại cụm rạp Aurora Cinema là gì?',
        options: [
          'Cháy đâu chữa đó',
          '"Phòng ngừa tai họa hơn chữa cháy - Tính mạng con người là trên hết"',
          'Tiết kiệm chi phí là quan trọng nhất',
          'Không ai cần quan tâm'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tính mạng và sự an toàn tuyệt đối của khán giả và cán bộ nhân viên luôn là giá trị cao nhất không thể đánh đổi tại Aurora Cinema.'
      }
    ]
  },
  {
    id: 5,
    courseId: 5,
    courseTitle: 'Nghệ Thuật Phục Vụ 5 Sao Aurora Hospitality Standard & Xử Lý Khách Hàng Khó Tính',
    title: 'Kiểm Tra Tiêu Chuẩn Phục Vụ 5 Sao Aurora Hospitality & Giải Quyết Khiếu Nại 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Triết lý cốt lõi của tiêu chuẩn dịch vụ khách hàng "Aurora 5-Star Hospitality" được định nghĩa là gì?',
        options: [
          'Chỉ phục vụ tận tình với khách hàng mua vé VIP',
          'Sự tận tâm, chu đáo, tinh tế trong từng cử chỉ và cam kết mang lại trải nghiệm vượt trên cả sự kỳ vọng của mỗi khán giả',
          'Coi khách hàng là đối thủ cần tranh luận',
          'Làm đúng giờ rồi về'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hospitality là sự hiếu khách từ trái tim, xem mỗi khán giả như người thân đến chơi nhà để phục vụ bằng sự thấu hiểu sâu sắc.'
      },
      {
        questionText: 'Quy tắc "3 giây đầu tiên" trong tác phong tiếp đón khách hàng của nhân viên rạp yêu cầu gì?',
        options: [
          'Nhìn chăm chú vào khách trong 3 giây rồi quay đi',
          'Trong vòng 3 giây đầu tiên khi khách bước đến quầy, nhân viên phải chủ động ngước nhìn, nở nụ cười tươi ấm áp và gật đầu chào đón',
          'Cúi đầu nhìn xuống bàn phím',
          'Hỏi ngay khách có bao nhiêu tiền'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nụ cười và ánh mắt chào đón trong 3 giây đầu tiên kích hoạt cảm xúc tích cực và xóa bỏ khoảng cách xa lạ giữa rạp và người xem.'
      },
      {
        questionText: 'Khoảng cách giao tiếp lịch sự chuẩn mực (Personal Space) khi đứng nói chuyện với khách hàng là bao nhiêu?',
        options: [
          'Đứng sát cách 10 cm ghé tai nói thầm',
          'Từ 0.8 mét đến 1.2 mét để tạo cảm giác tôn trọng không gian riêng tư và tự nhiên cho khách',
          'Đứng xa 5 mét nói to qua loa',
          'Đứng quay lưng lại với khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khoảng cách 0.8 - 1.2m là khoảng cách xã hội lịch thiệp quốc tế, vừa đủ nghe rõ ràng mà không gây cảm giác xâm phạm không gian cá nhân.'
      },
      {
        questionText: 'Chữ cái "L" trong mô hình giải quyết khiếu nại kinh điển L.A.S.T là viết tắt của từ gì?',
        options: [
          'Leave - Bỏ mặc khách đi chỗ khác',
          'Listen - Lắng nghe chủ động, chân thành, mắt nhìn khách và tuyệt đối không ngắt lời khi khách đang trình bày bức xúc',
          'Laugh - Cười to khi khách phàn nàn',
          'Lock - Khóa cửa lại'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lắng nghe trọn vẹn là chìa khóa giải tỏa cơn giận dữ; khách hàng cần cảm nhận được sự tôn trọng và thấu hiểu trước tiên.'
      },
      {
        questionText: 'Chữ cái "A" trong mô hình L.A.S.T mang ý nghĩa gì?',
        options: [
          'Argue - Tranh cãi quyết liệt để chứng minh khách sai',
          'Apologize - Xin lỗi chân thành vì trải nghiệm chưa trọn vẹn hoặc sự bất tiện mà khách hàng phải trải qua',
          'Ask - Tra khảo khách hàng',
          'Attack - Công kích lại khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Xin lỗi vì sự bất tiện của khách thể hiện sự đồng cảm chuyên nghiệp, không đồng nghĩa với việc nhận lỗi pháp lý cá nhân.'
      },
      {
        questionText: 'Chữ cái "S" trong mô hình L.A.S.T yêu cầu nhân viên phải làm gì?',
        options: [
          'Stop - Dừng nói chuyện',
          'Solve - Đưa ra giải pháp hành động cụ thể, nhanh chóng và thỏa đáng trong thẩm quyền để bù đắp cho khách hàng',
          'Send - Gửi khách sang rạp khác',
          'Sit - Ngồi nghỉ ngơi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Giải pháp giải quyết tức thì chứng minh thiện chí phụng sự và năng lực giải quyết vấn đề chuyên nghiệp của đội ngũ rạp.'
      },
      {
        questionText: 'Chữ cái "T" trong mô hình L.A.S.T khép lại cuộc hội thoại với tinh thần gì?',
        options: [
          'Terminate - Chấm dứt đuổi khách về',
          'Thank - Cảm ơn khách hàng chân thành vì đã đóng góp ý kiến quý báu giúp cụm rạp hoàn thiện chất lượng dịch vụ tốt hơn',
          'Take - Lấy lại đồ đã tặng',
          'Tell - Kể tội khách hàng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lời cảm ơn chân thành biến một khiếu nại tiêu cực thành cơ hội vàng thắt chặt sự gắn kết trung thành của khách hàng với rạp.'
      },
      {
        questionText: 'Khi khách hàng đang trong trạng thái vô cùng tức giận và lớn tiếng quát mắng tại quầy sảnh, thái độ ĐÚNG là:',
        options: [
          'Quát lại to hơn để lấn át tiếng khách',
          'Giữ giọng nói điềm tĩnh, hạ tông giọng ấm áp, mời khách vào phòng khách riêng hoặc góc yên tĩnh để lắng nghe và mời khách ly nước mát',
          'Gọi bảo vệ lôi khách ra đường',
          'Chạy trốn vào nhà vệ sinh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tách khách ra khỏi đám đông và hạ thấp âm lượng giọng nói giúp giảm thiểu hiệu ứng khán giả tò mò và nhanh chóng hạ hỏa cơn giận.'
      },
      {
        questionText: 'Quy tắc ngầm tối thượng khi xử lý sự cố dịch vụ là gì?',
        options: [
          'Đổ lỗi cho nhân viên ca trước hoặc do máy tính hỏng',
          'Không bao giờ tranh cãi, không đổ lỗi cho đồng nghiệp hoặc hệ thống trước mặt khách; luôn nhận trách nhiệm đại diện tập thể hỗ trợ',
          'Đổ lỗi cho nhà phát hành phim',
          'Bảo khách xui xẻo thì chịu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khách hàng không quan tâm lỗi thuộc về ai trong nội bộ; họ chỉ nhìn thấy một thương hiệu Aurora thống nhất chịu trách nhiệm phục vụ.'
      },
      {
        questionText: 'Thẩm quyền phục hồi dịch vụ (Service Recovery) tại chỗ của nhân viên tuyến đầu bao gồm:',
        options: [
          'Tự ý giảm giá 90% toàn bộ vé',
          'Đổi suất chiếu khác theo ý khách, tặng bắp nước mới miễn phí hoặc cấp Voucher Vé Mời Complimentary trong định mức cho phép của SOP',
          'Không có quyền hạn gì',
          'Cho khách xem phim miễn phí 1 năm'
        ],
        correctAnswerIndex: 1,
        explanation: 'Trao quyền xử lý bồi hoàn tại chỗ giúp giải quyết dứt điểm khiếu nại trong 3 phút mà không cần bắt khách chờ xin ý kiến nhiều cấp.'
      },
      {
        questionText: 'Cách xưng hô chuẩn mực khi giao tiếp với khán giả tại Aurora Cinema là:',
        options: [
          'Ê bạn ơi, này bạn',
          '"Dạ em chào anh/chị ạ", "Dạ thưa cô/chú ạ"',
          'Mày - tao cho thân thiện',
          'Gọi tên cộc lốc'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kính ngữ "Dạ - Vâng - Cảm ơn - Xin phép" là chuẩn mực văn hóa ứng xử thanh lịch của người Việt Nam trong ngành dịch vụ.'
      },
      {
        questionText: 'Khi giao tiếp với khách hàng nước ngoài không nói được tiếng Việt, nhân viên cần:',
        options: [
          'Xua tay lắc đầu bỏ chạy',
          'Tươi cười chào bằng tiếng Anh cơ bản ("Hello, welcome to Aurora Cinema!"), sử dụng câu ngắn gọn rõ ràng và chỉ dẫn trực quan trên màn hình POS',
          'Nói tiếng Việt thật to vào tai khách',
          'Bảo khách tự đi học tiếng Việt'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiếng Anh giao tiếp căn bản kết hợp ngôn ngữ hình thể và màn hình trực quan giúp du khách quốc tế cảm nhận sự hiếu khách quốc tế.'
      },
      {
        questionText: 'Nếu khách hàng vô tình làm rơi đổ cả xô bắp nước xuống sàn sảnh ngay sau khi nhận tại quầy, nhân viên xử lý ra sao?',
        options: [
          'Bắt khách đền tiền lau sàn',
          'Đỡ khách nếu khách trượt, nói lời trấn an: "Dạ không sao đâu ạ, để em hỗ trợ dọn ngay", lập tức đổi miễn phí 01 phần bắp nước mới cho khách với nụ cười thân thiện',
          'Mắng khách vụng về',
          'Bảo khách tự lấy chổi quét'
        ],
        correctAnswerIndex: 1,
        explanation: 'Một hành động đổi bắp miễn phí hào hiệp khi khách gặp sự cố xui xẻo sẽ biến khách hàng thành fan trung thành trọn đời của cụm rạp.'
      },
      {
        questionText: 'Cụm từ nào sau đây TUYỆT ĐỐI KHÔNG ĐƯỢC NÓI với khách hàng trong mọi hoàn cảnh?',
        options: [
          '"Dạ em rất tiếc về sự bất tiện này"',
          '"Cái đó em không biết, quy định rạp là vậy, khách tự đi mà tìm hiểu"',
          '"Dạ em sẽ kiểm tra ngay giúp anh/chị ạ"',
          '"Cảm ơn anh/chị đã kiên nhẫn chờ đợi ạ"'
        ],
        correctAnswerIndex: 1,
        explanation: 'Câu nói vô cảm "Tôi không biết / Không phải việc của tôi" giết chết trải nghiệm dịch vụ và thể hiện sự thiếu chuyên nghiệp tột cùng.'
      },
      {
        questionText: 'Khi khách hàng có nhu cầu đặc biệt (phụ nữ mang thai gần ngày sinh, người lớn tuổi đi lại khó khăn), nhân viên cần:',
        options: [
          'Bắt xếp hàng dài bình thường như mọi người',
          'Chủ động ưu tiên phục vụ tại làn đón tiếp nhanh, dìu đỡ hoặc xách hộ bắp nước vào tận số ghế trong phòng chiếu',
          'Khuyên khách ở nhà không nên đi xem phim',
          'Thu thêm phụ phí phục vụ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chăm sóc chu đáo đối tượng yếu thế thể hiện tính nhân văn sâu sắc và đẳng cấp dịch vụ 5 sao thực thụ của Aurora Cinema.'
      },
      {
        questionText: 'Ngôn ngữ cơ thể (Body Language) nào sau đây bị coi là tiêu cực và cấm kỵ tại quầy dịch vụ?',
        options: [
          'Đứng thẳng lưng, hai tay buông tự nhiên',
          'Khoanh tay trước ngực, chống cằm ngáp ngắn ngáp dài, nhai kẹo cao su hoặc mắt dán vào màn hình điện thoại',
          'Mỉm cười thân thiện',
          'Gật đầu lắng nghe'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khoanh tay và nhai kẹo cao su thể hiện sự phòng thủ, kiêu ngạo và bất lịch sự đối với người đối diện.'
      },
      {
        questionText: 'Khi khách hàng khen ngợi: "Hôm nay nhân viên rạp phục vụ rất dễ thương và nhiệt tình!", câu trả lời chuẩn mực là:',
        options: [
          'Chuyện bình thường mà có gì đâu',
          '"Dạ em cảm ơn anh/chị rất nhiều ạ! Lời khen của anh/chị là nguồn động lực rất lớn cho đội ngũ Aurora Cinema. Chúc anh/chị xem phim thật vui ạ!"',
          'Thôi đừng khen nữa em ngại',
          'Không nói gì chỉ gật đầu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Đón nhận lời khen bằng sự khiêm tốn, cảm ơn chân thành và lan tỏa niềm tự hào tập thể củng cố hình ảnh dịch vụ hoàn hảo.'
      },
      {
        questionText: 'Quy trình tiếp nhận góp ý của khách hàng qua mạng xã hội (Fanpage / Hotline) yêu cầu tốc độ phản hồi ban đầu trong vòng bao lâu?',
        options: [
          'Trong vòng 15 đến 30 phút với thái độ cầu thị, tiếp nhận thông tin và chuyển ngay bộ phận CSKH xử lý',
          'Sau 1 tháng',
          'Xóa ngay bình luận chê bai của khách để giấu đi',
          'Chặn nick khách hàng'
        ],
        correctAnswerIndex: 0,
        explanation: 'Phản hồi trong 15-30 phút ngăn chặn khủng hoảng truyền thông leo thang và chứng minh rạp luôn lắng nghe ý kiến cộng đồng.'
      },
      {
        questionText: 'Nghệ thuật ghi nhớ tên khách hàng (Personalization) đối với khách hàng thân thiết hạng Diamond mang lại tác dụng gì?',
        options: [
          'Không có tác dụng gì',
          'Tạo cảm giác được trân trọng như khách quý VIP, làm tăng mức độ hài lòng và tỷ lệ gắn bó lâu dài với cụm rạp',
          'Làm khách hàng sợ hãi',
          'Mất thời gian của nhân viên'
        ],
        correctAnswerIndex: 1,
        explanation: 'Âm thanh của tên gọi một người là âm thanh êm dịu nhất đối với họ; chào đích danh "Anh Minh", "Chị Hương" tạo điểm chạm cảm xúc đỉnh cao.'
      },
      {
        questionText: 'Khi khách hàng phàn nàn âm thanh phòng chiếu có tiếng rè nhỏ, hành động đúng của nhân viên là:',
        options: [
          'Bảo khách do tai khách bị ù',
          'Ghi nhận phòng chiếu và dãy ghế cụ thể, cảm ơn khách và báo ngay kỹ thuật viên vào kiểm tra loa vòm bằng máy đo tức thì',
          'Cãi nhau với khách',
          'Bảo khách xem hết phim rồi tính'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiếp nhận nhanh và xử lý kỹ thuật tức thì giúp duy trì chất lượng chuẩn Hollywood cho cả phòng chiếu.'
      },
      {
        questionText: 'Khi có khách hàng bỏ quên vật dụng cá nhân và quay lại nhận đồ sau khi đã được lưu trữ Lost & Found, thủ tục bàn giao là:',
        options: [
          'Đưa đồ ngay không cần hỏi han',
          'Đối chiếu đặc điểm nhận dạng, xem căn cước/số điện thoại, mở biên bản hoàn trả có ký nhận đầy đủ và kèm lời chúc mừng khách',
          'Đòi tiền chuộc tài sản',
          'Nói đồ đã bị vứt bỏ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thủ tục đối chiếu cẩn trọng tránh trao nhầm tài sản và để lại ấn tượng tốt đẹp về tính trung thực, liêm chính của rạp.'
      },
      {
        questionText: 'Kỹ năng từ chối khéo léo (Saying No Positively) khi khách yêu cầu việc trái quy định (ví dụ đòi hoàn tiền vé suất đã chiếu xong) là:',
        options: [
          'Quát thẳng vào mặt khách: "Không được!"',
          'Nêu lý do khách quan của hệ thống một cách mềm mỏng, thể hiện sự thấu hiểu và hướng khách sang một giải pháp thay thế hợp lý (tặng voucher giảm giá cho lần sau)',
          'Đồng ý làm trái luật',
          'Im lặng không trả lời'
        ],
        correctAnswerIndex: 1,
        explanation: 'Từ chối tích cực là nói "Không" với yêu cầu vô lý nhưng vẫn nói "Có" với thái độ tôn trọng và giải pháp xoa dịu thay thế.'
      },
      {
        questionText: 'Quy định bảo mật thông tin khách hàng (Privacy Protection) theo tiêu chuẩn 5 sao yêu cầu nhân viên:',
        options: [
          'Chụp ảnh số điện thoại của khách xinh đẹp đăng lên mạng xã hội',
          'Tuyệt đối không tiết lộ, không sao chép, không chia sẻ số điện thoại, email hoặc lịch sử xem phim của khách hàng cho bất kỳ bên thứ ba nào',
          'Bán danh sách khách hàng cho môi giới bất động sản',
          'Đọc to số điện thoại khách cho cả sảnh nghe'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bảo mật dữ liệu cá nhân là nghĩa vụ pháp lý và là đạo đức nghề nghiệp tối thượng để bảo vệ quyền riêng tư của khán giả.'
      },
      {
        questionText: 'Tinh thần làm việc đồng đội (Teamwork) giữa các bộ phận Box Office, Concession và Usher thể hiện qua:',
        options: [
          'Việc ai nấy làm, quầy bạn đông khách mặc kệ',
          'Sự phối hợp nhịp nhàng, sẵn sàng hỗ trợ tiếp ứng quầy đông khách khi hàng đợi vượt quá 5 người để giải tỏa áp lực chung',
          'Nói xấu nhau sau lưng',
          'Đùn đẩy việc dọn vệ sinh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Một trải nghiệm rạp phim hoàn hảo là tác phẩm của cả một tập thể gắn kết, luôn bọc lót hỗ trợ nhau vì mục tiêu chung.'
      },
      {
        questionText: 'Khi khách hàng phàn nàn nhiệt độ phòng chiếu quá lạnh, phản ứng đúng chuẩn của nhân viên là:',
        options: [
          'Bảo khách lần sau đi xem phim nhớ mang áo phao',
          'Ghi nhận vị trí ngồi của khách, liên hệ kỹ thuật điều chỉnh nhiệt độ phòng chiếu lên 1-2°C và chủ động mượn chăn đắp hỗ trợ khách nếu rạp có dịch vụ mượn chăn',
          'Tắt điều hòa luôn',
          'Bảo khách chịu khó vì người khác đang thấy nóng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thấu hiểu cảm giác buốt lạnh của khách và hỗ trợ chăn ấm hoặc điều chỉnh nhiệt độ đem lại sự ấm áp cả về thể chất lẫn tinh thần.'
      },
      {
        questionText: 'Tác phong diện mạo chuẩn "Aurora Look" trước khi bước vào ca trực bắt buộc phải kiểm tra:',
        options: [
          'Mặc quần áo ngủ cho thoải mái',
          'Đồng phục ủi phẳng phiu sạch sẽ, thẻ tên đeo ngay ngắn ngực trái, tóc cột gọn gàng, móng tay sạch sẽ và hơi thở thơm tho',
          'Đeo nhiều nhẫn vàng lắc bạc',
          'Trang điểm lòe loẹt sặc sỡ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Diện mạo chỉn chu, sạch sẽ phản ánh sự tôn trọng bản thân, tôn trọng nghề nghiệp và tạo sự an tâm tin cậy cho khách hàng.'
      },
      {
        questionText: 'Thao tác tự đánh giá cuối ngày (Daily Reflection) của nhân viên dịch vụ nhằm mục đích gì?',
        options: [
          'Để tự khen mình giỏi nhất rạp',
          'Nhìn nhận lại các tình huống phục vụ trong ngày, rút kinh nghiệm những điểm chưa tốt và chia sẻ cách làm hay với đồng nghiệp',
          'Để tính xem trốn việc được bao nhiêu tiếng',
          'Không có ích lợi gì'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tự soi rọi và học hỏi mỗi ngày là con đường ngắn nhất giúp nhân viên trở thành chuyên gia dịch vụ khách hàng xuất sắc.'
      },
      {
        questionText: 'Khi xảy ra sự cố suất chiếu bị trễ 10 phút do kỹ thuật, thông báo đến khách hàng trong phòng cần có nội dung:',
        options: [
          'Máy chiếu hỏng rồi ai không đợi được thì về',
          'Lời chào lịch sự, thông báo lý do kỹ thuật ngắn gọn, chân thành xin lỗi vì sự chờ đợi, thông báo thời gian dự kiến khắc phục và cảm ơn sự thông cảm của quý khách',
          'Im lặng để khách tự đoán',
          'Bảo khách sang phòng khác'
        ],
        correctAnswerIndex: 1,
        explanation: 'Sự minh bạch và chủ động xin lỗi giải tỏa 90% sự bức xúc lo âu của khán giả ngồi trong bóng tối.'
      },
      {
        questionText: 'Ý thức "Đại sứ thương hiệu" (Brand Ambassador) của mỗi nhân viên Aurora Cinema được hiểu là:',
        options: [
          'Chỉ cần làm việc khi có mặt quản lý giám sát',
          'Mỗi hành động, lời nói, nụ cười của nhân viên đều đại diện cho uy tín, phẩm giá và đẳng cấp của toàn bộ thương hiệu Aurora Cinema',
          'Không liên quan gì đến thương hiệu',
          'Được quyền tự do làm theo sở thích'
        ],
        correctAnswerIndex: 1,
        explanation: 'Trong mắt khách hàng, nhân viên đứng trước mặt chính là hiện thân của Aurora Cinema; phẩm chất của nhân viên tạo nên giá trị thương hiệu.'
      },
      {
        questionText: 'Phần thưởng lớn nhất đối với một nhân viên làm việc trong ngành dịch vụ rạp chiếu phim là gì?',
        options: [
          'Hết giờ làm việc chạy về nhà',
          'Nhìn thấy nụ cười rạng rỡ, ánh mắt thỏa mãn của khán giả sau những giờ phút thăng hoa cùng điện ảnh và sự gắn bó yêu mến của khách hàng',
          'Bán được hàng hết hạn',
          'Không bị ai nhắc nhở'
        ],
        correctAnswerIndex: 1,
        explanation: 'Niềm vui kiến tạo hạnh phúc cho người khác chính là ngọn lửa đam mê cao quý nuôi dưỡng tình yêu nghề dịch vụ điện ảnh.'
      }
    ]
  },
  {
    id: 6,
    courseId: 3,
    courseTitle: 'Kỹ Thuật Vận Hành Phòng Máy Chiếu Laser 4K, IMAX & Hệ Thống Âm Thanh Dolby Atmos',
    title: 'Kiểm Tra Kỹ Thuật Máy Chiếu Laser 4K, Khóa KDM & Âm Thanh Dolby Atmos 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Gói định dạng phim số tiêu chuẩn dùng để chiếu rạp trên toàn thế giới có tên viết tắt là gì?',
        options: [
          'MP4 (MPEG-4 Part 14)',
          'DCP (Digital Cinema Package) theo tiêu chuẩn bảo mật của hiệp hội DCI',
          'MKV (Matroska Video)',
          'AVI (Audio Video Interleave)'
        ],
        correctAnswerIndex: 1,
        explanation: 'DCP là gói định dạng số chuyên dụng chứa hình ảnh JPEG 2000 nén không suy hao, âm thanh PCM đa kênh và phụ đề XML được bảo mật DCI.'
      },
      {
        questionText: 'Khóa bảo mật KDM (Key Delivery Message) của phim rạp số có đặc điểm kỹ thuật nào sau đây?',
        options: [
          'Một mã dùng chung cho tất cả các máy chiếu trên toàn quốc',
          'Được mã hóa riêng cho số Serial của khối xử lý bảo mật IMB/Media Block của từng máy chiếu và chỉ có hiệu lực mở khóa trong khung ngày giờ ấn định',
          'Là mật khẩu nhập tay của quản lý ca',
          'Không cần KDM nếu đã có tệp DCP của phim'
        ],
        correctAnswerIndex: 1,
        explanation: 'KDM sử dụng thuật toán khóa công khai RSA mã hóa riêng cho Media Block cụ thể; máy khác copy sang cũng không thể giải mã chiếu phim.'
      },
      {
        questionText: 'Quy trình khởi động hệ thống máy chiếu Laser Barco/Christie trước suất chiếu đầu tiên trong ngày yêu cầu tối thiểu bao lâu?',
        options: [
          'Đúng giờ chiếu thì bấm nút nguồn',
          'Khởi động trước tối thiểu 30 đến 45 phút để hệ thống làm mát bằng chất lỏng (Chiller) ổn định nhiệt độ buồng quang học laser',
          'Chỉ cần 1 phút',
          'Máy chiếu luôn bật 24/7 không bao giờ tắt'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nguồn sáng laser và hệ thống làm mát lỏng chiller cần 30-45 phút để đạt trạng thái cân bằng nhiệt, tránh hiện tượng lệch bước sóng màu.'
      },
      {
        questionText: 'Nhiệt độ nước làm mát tiêu chuẩn trong hệ thống Chiller của máy chiếu Laser RGB duy trì ở dải nào?',
        options: [
          '0°C - 5°C',
          '18°C - 22°C',
          '45°C - 50°C',
          '80°C - 90°C'
        ],
        correctAnswerIndex: 1,
        explanation: 'Dải nhiệt độ 18°C - 22°C là tối ưu cho đi-ốt laser bán dẫn hoạt động bền bỉ, ngăn đọng sương ngưng tụ nước trong buồng quang học.'
      },
      {
        questionText: 'Điểm khác biệt cốt lõi giữa công nghệ âm thanh Dolby Atmos so với hệ thống 5.1 / 7.1 truyền thống là gì?',
        options: [
          'Dolby Atmos chỉ có 2 loa stereo',
          'Dolby Atmos chuyển từ âm thanh theo kênh cố định (Channel-based) sang âm thanh theo đối tượng (Object-based) lên đến 128 luồng âm thanh chuyển động tự do trong không gian 3D',
          'Dolby Atmos không có loa trầm subwoofer',
          'Dolby Atmos chỉ dùng cho phim câm'
        ],
        correctAnswerIndex: 1,
        explanation: 'Atmos giải phóng âm thanh khỏi các kênh cố định; kỹ sư âm thanh có thể định vị chính xác vị trí máy bay trực thăng bay lượn trên trần nhà.'
      },
      {
        questionText: 'Mức áp suất âm thanh chuẩn tham chiếu (Reference Sound Level) tại tâm phòng chiếu theo tiêu chuẩn SMPTE/Dolby là bao nhiêu?',
        options: [
          '65 dBC SPL',
          '85 dBC SPL (Mức Fader 7.0 trên bộ xử lý âm thanh rạp chiếu CP850 / CP950)',
          '110 dBC SPL',
          '40 dBC SPL'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiêu chuẩn quốc tế 85 dBC SPL (fader 7.0) tái tạo dải động trung thực nhất từ tiếng thì thầm 30 dB đến tiếng nổ bom 105 dB của bản mix Hollywood.'
      },
      {
        questionText: 'Khái niệm "Boothless Cinema" (Rạp chiếu không buồng máy) trong thiết kế hiện đại có nghĩa là gì?',
        options: [
          'Rạp không cần dùng máy chiếu',
          'Máy chiếu được treo trực tiếp trong khoang cách âm chống ồn gắn trần bên trong phòng chiếu, không cần xây phòng kỹ thuật riêng biệt phía sau',
          'Máy chiếu đặt ở sảnh quầy vé',
          'Chiếu phim bằng máy chiếu gia đình mini'
        ],
        correctAnswerIndex: 1,
        explanation: 'Boothless Cinema tiết kiệm diện tích xây dựng rạp, yêu cầu vỏ bọc cách âm tiêu chuẩn cao và hệ thống thông gió giải nhiệt trần hoàn hảo.'
      },
      {
        questionText: 'Quy trình vệ sinh thấu kính máy chiếu (Projection Lens) định kỳ yêu cầu sử dụng vật liệu gì?',
        options: [
          'Dùng vạt áo đồng phục hoặc khăn ướt lau mạnh',
          'Sử dụng bóng thổi bụi chuyên dụng, cọ lông lạc đà mềm và giấy lau quang học thấm dung dịch cồn isopropyl tinh khiết lau vòng tròn từ tâm ra ngoài',
          'Dùng nước rửa chén chà xát',
          'Dùng giấy ăn ráp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thấu kính máy chiếu tráng lớp phủ chống phản xạ đắt tiền; cọ xát bằng vải thường sẽ gây xước quang học làm mờ hình ảnh vĩnh viễn.'
      },
      {
        questionText: 'Các phương thức nạp nội dung phim DCP vào máy chủ chiếu phim (TMS / Media Server) bao gồm:',
        options: [
          'Chép qua đĩa mềm mềm 1.44MB',
          'Cắm ổ cứng chuyên dụng chuẩn CRU qua khay eSATA/USB 3.0 hoặc tải trực tuyến tự động qua đường truyền mạng vệ tinh băng thông rộng',
          'Chụp ảnh từng cảnh phim gửi qua Zalo',
          'Dùng thẻ nhớ điện thoại'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bản phim DCP dung lượng từ 150GB đến 400GB được phân phối qua ổ cứng chống sốc CRU hoặc đường truyền vệ tinh mã hóa an toàn.'
      },
      {
        questionText: 'Khi phụ đề phim bị mất đồng bộ (chạy nhanh hoặc chậm hơn tiếng nói nhân vật 3 giây), kỹ thuật viên xử lý thế nào?',
        options: [
          'Bảo khán giả tự học tiếng Anh nghe cho quen',
          'Truy cập giao diện Automation trên TMS/Server, điều chỉnh thông số Subtitle Delay Offset bù trừ đúng mili-giây hoặc kiểm tra lại file phụ đề XML nạp đúng phiên bản',
          'Tắt luôn máy chiếu',
          'Chỉnh tua nhanh tiếng phim'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bộ xử lý Media Block cho phép bù độ trễ phụ đề (Subtitle Offset) tính bằng mili-giây để khớp hoàn hảo khẩu hình nhân vật.'
      },
      {
        questionText: 'Lệnh điều khiển tự động (Automation Cues) trong danh sách phát (Show Playlist) của rạp chiếu gồm những lệnh gì?',
        options: [
          'Lệnh tắt mở điều hòa trung tâm thương mại',
          'Lệnh chỉnh độ sáng đèn phòng chiếu (House Lights 100% -> 50% -> 0%), lệnh mở rèm màn hình, lệnh chuyển đổi tỷ lệ khung hình Flat/Scope và lệnh chỉnh mức âm lượng',
          'Lệnh báo công an',
          'Lệnh phát nhạc chuông'
        ],
        correctAnswerIndex: 1,
        explanation: 'Automation Cues tự động hóa toàn bộ trải nghiệm: giảm dần ánh sáng khi trailer bắt đầu, tắt hẳn khi vào phim chính và tự bật sáng khi credit chạy.'
      },
      {
        questionText: 'Tỷ lệ khung hình chuẩn "Flat" và "Scope" trong chiếu phim rạp kỹ thuật số có tỷ lệ tương ứng là:',
        options: [
          'Flat là 1:1 và Scope là 16:9',
          'Flat có tỷ lệ 1.85:1 (độ phân giải 1998x1080 hoặc 3996x2160) và Scope có tỷ lệ 2.39:1 (độ phân giải 2048x858 hoặc 4096x1716)',
          'Cả hai đều có tỷ lệ 4:3',
          'Scope là màn hình tròn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Flat (1.85:1) và Scope (2.39:1 CinemaScope) là 2 chuẩn khung hình chiếu rạp thống trị toàn bộ các tác phẩm điện ảnh toàn cầu.'
      },
      {
        questionText: 'Hệ thống lưu điện UPS (Uninterruptible Power Supply) công suất lớn trong phòng máy chiếu có vai trò gì khi mất điện lưới đột ngột?',
        options: [
          'Để chiếu tiếp hết cả bộ phim dài 3 tiếng',
          'Cấp điện tức thì từ 15 đến 30 phút để duy trì quạt tản nhiệt và chiller xả sạch nhiệt dư trong buồng laser, tránh cháy nứt khối lăng kính quang học và lưu dữ liệu an toàn',
          'Để thắp sáng phòng bảo vệ',
          'Không có tác dụng gì'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khi ngắt điện đột ngột buồng laser tích tụ nhiệt độ cực cao; quạt làm mát phải chạy thêm 10 phút nhờ UPS để không làm vỡ các linh kiện quang học đắt giá.'
      },
      {
        questionText: 'Độ sáng tiêu chuẩn trên màn chiếu khi chiếu phim định dạng 2D theo tiêu chuẩn DCI/SMPTE là bao nhiêu Foot-Lamberts (fL)?',
        options: [
          '5 fL',
          '14 fL (Foot-Lamberts) ± 2 fL đo tại tâm màn chiếu màu trắng',
          '50 fL',
          '1 fL'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chuẩn 14 fL (tương đương 48 cd/m²) tại tâm màn hình là độ sáng vàng giúp mắt không mỏi và thể hiện trọn vẹn độ sâu màu đen và chi tiết bóng râm.'
      },
      {
        questionText: 'Màn chiếu tráng bạc (Silver Screen) chuyên dụng trong phòng chiếu 3D có tác dụng kỹ thuật gì?',
        options: [
          'Để chống rỉ sét màn hình',
          'Có hệ số phản xạ ánh sáng (Gain) cao và bảo toàn góc phân cực ánh sáng (Polarization Preservation) giúp hình ảnh 3D qua kính không bị tối và không bị bóng ma',
          'Để làm gương soi cho khách',
          'Làm bằng bạc nguyên chất đắt tiền'
        ],
        correctAnswerIndex: 1,
        explanation: 'Màn bạc giữ được góc phân cực của luồng ánh sáng phân cực tròn RealD 3D, đưa hình ảnh mắt trái và mắt phải tách biệt sắc nét.'
      },
      {
        questionText: 'Khi KDM của một bộ phim bom tấn bị hết hạn lúc 23:59 trong khi suất chiếu muộn bắt đầu lúc 23:30, điều gì sẽ xảy ra?',
        options: [
          'Phim vẫn chiếu bình thường đến hết',
          'Đúng 23:59 Media Block sẽ tự động khóa và dừng chiếu phim ngay lập tức giữa chừng nếu không nạp KDM gia hạn mới kịp thời',
          'Máy chiếu tự phát nổ',
          'Chuyển sang chiếu phim khác'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chip bảo mật IMB đếm giờ bằng xung đồng hồ phần cứng độc lập; đến đúng giây hết hạn của KDM nó sẽ ngừng giải mã dữ liệu lập tức.'
      },
      {
        questionText: 'Quy trình kiểm tra âm thanh Pink Noise (Tiếng ồn hồng) đầu ngày của kỹ thuật viên nhằm mục đích gì?',
        options: [
          'Để đuổi chuột trong phòng chiếu',
          'Kiểm tra độc lập từng kênh loa (Loa trái, trung tâm, phải, loa vòm xung quanh, loa trần và loa siêu trầm Subwoofer) có phát đủ dải tần và không bị cháy cuộn cảm loa',
          'Để nghe nhạc thư giãn',
          'Làm nóng phòng chiếu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Pink Noise phát năng lượng đồng đều trên toàn bộ dải tần số 20Hz - 20kHz, giúp kỹ thuật viên phát hiện ngay củ loa nào bị nghẹt hoặc rè.'
      },
      {
        questionText: 'Cấu hình mảng đĩa cứng lưu trữ trong máy chủ rạp phim thường sử dụng chuẩn RAID nào để bảo đảm không mất phim khi hỏng ổ cứng?',
        options: [
          'Không dùng RAID',
          'RAID 5 hoặc RAID 6 (cho phép hỏng 1 đến 2 ổ cứng mà hệ thống vẫn đọc phim mượt mà và không mất dữ liệu)',
          'RAID 0 (hỏng 1 ổ mất toàn bộ)',
          'Lưu trên USB'
        ],
        correctAnswerIndex: 1,
        explanation: 'RAID 5/6 có cơ chế ghi mã kiểm tra chẵn lẻ (Parity), nếu một ổ cứng bị chết cơ thì rạp vẫn chiếu phim bình thường trong lúc thay thế nóng ổ mới.'
      },
      {
        questionText: 'Khái niệm "Framing & Focus" khi cân chỉnh hình ảnh máy chiếu nghĩa là gì?',
        options: [
          'Chỉnh màu sắc rực rỡ nhất',
          'Cân chỉnh hình ảnh khớp khít vào đúng khung viền màn hình (không bị tràn ra ngoài hoặc hụt viền) và độ nét căng đều từ tâm ra 4 góc màn hình',
          'Chỉnh độ nghiêng của ghế ngồi',
          'Chỉnh âm lượng loa'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hình ảnh phải phủ trọn vẹn màn chiếu không bị cong méo hình thang (Keystone) và lấy nét quang học chuẩn từng điểm ảnh 4K.'
      },
      {
        questionText: 'Tấm lọc bụi không khí (Air Filter) của máy chiếu rạp cần được vệ sinh bảo trì định kỳ bao lâu?',
        options: [
          '10 năm 1 lần',
          'Mỗi tuần hút bụi kiểm tra và thay mới định kỳ mỗi 3 - 6 tháng theo khuyến cáo nhà sản xuất',
          'Chỉ khi máy bốc khói mới thay',
          'Không bao giờ cần vệ sinh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lưới lọc bụi bị tắc sẽ làm giảm lưu lượng gió tản nhiệt, khiến cảm biến nhiệt độ ngắt máy chiếu khẩn cấp giữa giờ chiếu.'
      },
      {
        questionText: 'Khi tổ chức sự kiện họp báo ra mắt phim cần cắm máy tính xách tay phát bài thuyết trình lên màn chiếu rạp, cổng tín hiệu được chọn là:',
        options: [
          'Cổng cáp điện thoại',
          'Cổng chuyển đổi chuyên dụng HDMI / SDI tích hợp bộ xử lý chuyển đổi tỷ lệ tín hiệu (Scaler / Video Switcher)',
          'Cổng cáp âm thanh analog 3.5mm',
          'Cổng máy in'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bộ chuyển đổi Scaler nhận diện độ phân giải của laptop phát biểu và chuyển đổi tín hiệu chuẩn sang máy chiếu rạp mượt mà.'
      },
      {
        questionText: 'Chuẩn bảo mật DCI (Digital Cinema Initiatives) do các studio Hollywood sáng lập gồm những thành viên nào?',
        options: [
          'Google, Apple, Microsoft',
          'Disney, Paramount, Universal, Sony Pictures, Warner Bros',
          'Samsung, LG, Sony',
          'Các công ty bán vé rạp'
        ],
        correctAnswerIndex: 1,
        explanation: '5 đại gia studio Hollywood lập ra DCI năm 2002 để ban hành tiêu chuẩn kỹ thuật số và mã hóa chống sao chép lậu toàn cầu.'
      },
      {
        questionText: 'Hiện tượng "Ghosting / Crosstalk" trong suất chiếu phim 3D là gì?',
        options: [
          'Nhìn thấy ma trong phòng chiếu',
          'Hình ảnh dành cho mắt trái bị lọt một phần sang mắt phải (hoặc ngược lại) tạo ra bóng mờ nhòe gây nhức đầu chóng mặt cho khán giả',
          'Màn hình bị tối đen',
          'Âm thanh bị vang'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lệch góc phân cực hoặc màn bạc bẩn làm giảm độ tương phản phân cực dẫn đến hiện tượng bóng ma Crosstalk cực kỳ khó chịu.'
      },
      {
        questionText: 'Loa kênh LFE (Low Frequency Effects) trong hệ thống âm thanh rạp phim chịu trách nhiệm dải tần số nào?',
        options: [
          'Tiếng chim hót ríu rít',
          'Các âm trầm siêu trầm có tần số cực thấp (thường dưới 120Hz) như tiếng bom nổ, sấm sét, động đất mang lại độ rung chấn nghẹt thở',
          'Dải tiếng nói của diễn viên',
          'Tần số siêu âm không nghe được'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kênh siêu trầm LFE truyền tải năng lượng cơ học rung chuyển lồng ngực tạo cảm giác thực tế như đang sống trong cảnh phim bom tấn.'
      },
      {
        questionText: 'Mục đích của việc kiểm tra nhiệt độ buồng máy chiếu (Interlock Sensor Check) trước khi rời ca là gì?',
        options: [
          'Để xem phòng có mát để ngủ không',
          'Đảm bảo các cửa buồng máy đã đóng kín khớp cảm biến bảo vệ an toàn quang học laser (Laser Interlock) và không có cảnh báo nhiệt độ cao',
          'Để bật máy sưởi',
          'Không cần kiểm tra'
        ],
        correctAnswerIndex: 1,
        explanation: 'Cảm biến an toàn Laser Interlock sẽ tự động ngắt nguồn phát laser ngay nếu cửa buồng máy bị hở để bảo vệ mắt kỹ thuật viên.'
      },
      {
        questionText: 'Quy trình dọn dẹp dung lượng ổ cứng Media Server (Ingest Storage Maintenance) định kỳ thực hiện như thế nào?',
        options: [
          'Xóa toàn bộ phim trong máy kể cả phim đang chiếu',
          'Chỉ xóa các bản phim DCP cũ đã hết hạn chiếu và hết thời hạn hợp đồng, luôn duy trì tối thiểu 20% dung lượng trống cho phim mới nạp',
          'Không bao giờ xóa phim',
          'Định dạng lại toàn bộ ổ cứng cuối tuần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Duy trì tối thiểu 20% dung lượng ổ cứng giúp hệ điều hành server phân mảnh dữ liệu thấp và nạp phim mới tốc độ cao.'
      },
      {
        questionText: 'Tủ Rack chứa các bộ khuếch đại công suất (Power Amplifiers) yêu cầu điều kiện môi trường nào?',
        options: [
          'Đặt ngoài trời mưa nắng',
          'Phòng kín có điều hòa liên tục 20°C - 24°C, khô ráo, không bụi bặm và có quạt hút gió cưỡng bức làm mát các sò công suất',
          'Nhiệt độ trên 50°C',
          'Để trong nhà kho rác'
        ],
        correctAnswerIndex: 1,
        explanation: 'Các amply công suất hàng chục nghìn Watt sinh nhiệt rất lớn; nhiệt độ cao sẽ kích hoạt mạch bảo vệ ngắt tiếng (Thermal Protect) ngay lập tức.'
      },
      {
        questionText: 'Thao tác lập "Nhật ký vận hành kỹ thuật phòng chiếu" (Projectionist Daily Log) cuối ngày ghi nhận thông tin gì?',
        options: [
          'Ghi chép số bước chân đi trong ngày',
          'Số giờ hoạt động của nguồn sáng Laser/đèn chiếu, tình trạng nạp KDM, các lỗi cảnh báo hệ thống trong ngày và số suất chiếu hoàn thành mỹ mãn',
          'Ghi tên các diễn viên đẹp trai',
          'Không cần ghi chép'
        ],
        correctAnswerIndex: 1,
        explanation: 'Sổ nhật ký kỹ thuật là căn cứ bảo hành thiết bị chính hãng và theo dõi tuổi thọ khấu hao của khối laser trị giá hàng tỷ đồng.'
      },
      {
        questionText: 'Khi gặp sự cố mất đồng bộ âm thanh và hình ảnh (Lip-sync Error), kỹ thuật viên can thiệp vào tham số nào?',
        options: [
          'Audio Delay (độ trễ âm thanh tính bằng mili-giây ms) trên bộ vi xử lý tín hiệu âm thanh kỹ thuật số',
          'Tăng giảm âm lượng loa',
          'Tắt bóng đèn máy chiếu',
          'Thay dây loa mới'
        ],
        correctAnswerIndex: 0,
        explanation: 'Bộ xử lý hình ảnh 4K mất vài chục ms để giải mã; thông số Audio Delay đồng bộ tiếng khớp chính xác tới từng khung hình với cử động môi diễn viên.'
      },
      {
        questionText: 'Sứ mệnh cao nhất của kỹ thuật viên vận hành phòng chiếu (Projectionist) tại Aurora Cinema là gì?',
        options: [
          'Bật máy chiếu rồi đi ngủ',
          'Đảm bảo sự chuẩn xác tuyệt đối về hình ảnh sắc nét, màu sắc chân thực, âm thanh vòm sống động và vận hành an toàn không gián đoạn bất kỳ giây phút nào',
          'Chiếu phim càng nhanh càng tốt',
          'Chỉ chăm sóc phòng chiếu lớn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kỹ thuật viên phòng chiếu là những người hùng thầm lặng sau khung kính, truyền tải trọn vẹn mọi xúc cảm và linh hồn của tác phẩm điện ảnh đến khán giả.'
      }
    ]
  },
  {
    id: 7,
    courseId: 2,
    courseTitle: 'CTKM Siêu Bão Mùa Hè 2026: Combo Popcorn X2 & Vé 1K Student',
    title: 'Kiểm Tra Nghiệp Vụ CTKM Mùa Hè 2026, Quản Trị Voucher & Khách Hàng VIP 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: true,
    questions: [
      {
        questionText: 'Chiến dịch khuyến mãi trọng điểm mùa hè 2026 tại cụm rạp Aurora có tên gọi chính thức là gì?',
        options: [
          'Mùa Đông Ấm Áp 2026',
          'Siêu Bão Mùa Hè 2026: Combo Popcorn X2 & Vé 1K Student Bom Tấn',
          'Lễ Hội Phim Cổ Điển',
          'Tri Ân Khách Hàng Cao Tuổi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chiến dịch "Siêu Bão Mùa Hè 2026" là chương trình kích cầu quy mô lớn nhất năm hướng đến giới trẻ và học sinh sinh viên cả nước.'
      },
      {
        questionText: 'Khung giờ và ngày áp dụng ưu đãi "Vé 1K Student" cho học sinh sinh viên là:',
        options: [
          'Áp dụng tất cả các ngày kể cả thứ 7 và Chủ Nhật',
          'Từ Thứ Hai đến Thứ Năm hàng tuần cho các suất chiếu 2D Standard trước 17:00',
          'Chỉ áp dụng các suất chiếu sau 23:00 đêm',
          'Chỉ áp dụng cho phim hoạt hình Việt Nam'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chương trình áp dụng từ T2 đến T5 cho suất chiếu trước 17:00 nhằm kích cầu lấp đầy các khung giờ thấp điểm trong tuần.'
      },
      {
        questionText: 'Điều kiện giấy tờ bắt buộc để học sinh sinh viên nhận ưu đãi vé 1K là gì?',
        options: [
          'Chỉ cần nói miệng mình đang là sinh viên',
          'Xuất trình thẻ Học sinh/Sinh viên chính chủ còn hạn sử dụng hoặc tài khoản VNeID có thông tin học sinh/sinh viên kèm CCCD đối chiếu',
          'Thẻ đi xe bus thành phố',
          'Không cần giấy tờ gì'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thẻ HSSV chính chủ hoặc VNeID hợp lệ là điều kiện bắt buộc để đảm bảo ưu đãi đến đúng đối tượng thụ hưởng và chống đầu cơ vé.'
      },
      {
        questionText: 'Số lượng vé 1K tối đa mà một học sinh sinh viên được mua trong 01 ngày là bao nhiêu?',
        options: [
          'Mua bao nhiêu vé cũng được',
          'Tối đa 01 vé ưu đãi/học sinh sinh viên/ngày',
          'Tối đa 10 vé',
          'Bắt buộc mua 5 vé một lúc'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hạn mức 01 vé/ngày/bạn sinh viên nhằm chia sẻ cơ hội công bằng cho hàng nghìn bạn trẻ khác cùng được thưởng thức phim.'
      },
      {
        questionText: 'Quyền lợi nổi bật của gói "Combo Popcorn X2" trong chiến dịch hè 2026 bao gồm:',
        options: [
          'Chỉ có 1 hộp bắp nhỏ không có nước',
          '01 xô bắp khổng lồ vị tùy chọn + 02 ly nước ngọt lớn và được MIỄN PHÍ Refill (rót thêm) nước ngọt 01 lần trong ngày',
          'Không cho chọn vị bắp',
          'Chỉ áp dụng khi mua kèm vé VIP'
        ],
        correctAnswerIndex: 1,
        explanation: 'Combo X2 tặng 2 ly nước lớn và quyền lợi Refill miễn phí 1 lần giải tỏa cơn khát mùa hè cực kỳ hấp dẫn đối với các cặp đôi và nhóm bạn.'
      },
      {
        questionText: 'Chính sách nâng cấp vị bắp (Caramel / Phô mai) trong Combo Popcorn X2 hè 2026 được tính phí thế nào?',
        options: [
          'Phụ thu thêm 30.000 VNĐ',
          'Hoàn toàn MIỄN PHÍ đổi vị sang bắp Caramel thượng hạng hoặc Phô mai lắc béo ngậy',
          'Thu thêm 50.000 VNĐ',
          'Chỉ cho ăn bắp mặn'
        ],
        correctAnswerIndex: 1,
        explanation: 'Điểm đặc biệt của chiến dịch hè 2026 là miễn phí 100% việc đổi sang vị bắp ngọt Caramel và Phô mai cao cấp.'
      },
      {
        questionText: 'Hệ thống thành viên Aurora Membership có bao nhiêu hạng thẻ bậc thang?',
        options: [
          'Chỉ có 1 hạng duy nhất',
          '4 hạng thẻ: Aurora Member (Chuẩn) -> Aurora Silver (Bạc) -> Aurora Gold (Vàng) -> Aurora Diamond (Kim Cương)',
          '10 hạng thẻ',
          'Không có thẻ thành viên'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hệ thống bậc thang 4 cấp độ với các đặc quyền tăng dần khuyến khích khách hàng tích điểm nâng hạng để hưởng chiết khấu cao.'
      },
      {
        questionText: 'Tỷ lệ tích lũy điểm thưởng thành viên khi mua vé và bắp nước tại rạp là bao nhiêu?',
        options: [
          '100% giá trị hóa đơn',
          'Từ 5% đến 10% giá trị giao dịch tùy theo hạng thẻ thành viên (Member 5%, Silver 7%, Gold 8%, Diamond 10%)',
          '0.1%',
          'Chỉ tích điểm khi mua bắp nước'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chính sách tích điểm lũy tiến từ 5% đến 10% mang lại giá trị hoàn tiền hấp dẫn hàng đầu trong hệ thống rạp chiếu phim.'
      },
      {
        questionText: 'Quy tắc sử dụng điểm thưởng Aurora Point để thanh toán vé và combo là:',
        options: [
          'Điểm thưởng không có giá trị quy đổi',
          '1 điểm tương đương 1.000 VNĐ, có thể dùng trừ trực tiếp vào hóa đơn thanh toán khi đạt số dư tối thiểu từ 20 điểm trở lên',
          'Chỉ đổi được móc chìa khóa',
          'Bắt buộc tích đủ 1 triệu điểm mới được dùng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tỷ lệ quy đổi 1 điểm = 1.000đ trừ thẳng tiền thanh toán vô cùng minh bạch, dễ hiểu và tiện lợi cho khách hàng.'
      },
      {
        questionText: 'Thao tác áp mã khuyến mãi CTKM trên màn hình phần mềm POS Aurora được thực hiện bằng phím tắt nào?',
        options: [
          'Phím tắt Alt + F4 (Tắt máy)',
          'Nhấn phím F4 để mở cửa sổ danh mục các CTKM đang kích hoạt hoặc bấm phím F9 quét mã barcode voucher',
          'Nhấn phím Esc',
          'Nhập mật khẩu quản lý'
        ],
        correctAnswerIndex: 1,
        explanation: 'Phím F4 mở nhanh danh mục chiến dịch và F9 bật đầu đọc quét mã vạch voucher giúp thu ngân thao tác trong vòng 3 giây.'
      },
      {
        questionText: 'Khi quét mã voucher của đối tác thanh toán (MoMo, ZaloPay, ShopeePay), POS báo lỗi "Voucher không hợp lệ hoặc đã sử dụng", cách xử lý là:',
        options: [
          'Bảo khách đi về vì dùng đồ lừa đảo',
          'Lịch sự giải thích màn hình báo lỗi, kiểm tra hạn dùng và điều kiện rạp áp dụng trên app của khách, hỗ trợ khách mở lại mã mới hoặc thanh toán phương thức khác',
          'Tự móc tiền túi bù cho khách',
          'Xóa tài khoản của khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhiều trường hợp voucher hết hạn hoặc chưa kích hoạt; nhân viên hướng dẫn khách kiểm tra chi tiết điều khoản trên ứng dụng đối tác.'
      },
      {
        questionText: 'Đặc quyền sinh nhật dành cho thành viên cụm rạp Aurora trong tháng sinh là gì?',
        options: [
          'Bắt khách khao nhân viên rạp ăn bắp',
          'Tặng 01 vé xem phim miễn phí 2D Standard + 01 phần Combo bắp nước sinh nhật ngọt ngào gửi vào tài khoản thành viên',
          'Không có ưu đãi gì',
          'Chỉ gửi tin nhắn chúc mừng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Món quà sinh nhật gồm 1 vé xem phim và combo bắp nước miễn phí là chính sách tri ân được khách hàng yêu thích nhất của Aurora.'
      },
      {
        questionText: 'Quy định bàn giao quà tặng độc quyền nhân vật phim (Collectible Popcorn Cup / Tumbler) cho khách là:',
        options: [
          'Quà móp méo cũng cứ phát cho khách',
          'Kiểm tra quà tặng còn nguyên vẹn, nguyên seal túi bọc, không trầy xước, hướng dẫn khách kiểm tra tại quầy trước khi mang đi',
          'Khách về nhà phát hiện hỏng được đổi sau 1 tháng',
          'Không cho khách xem quà'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bàn giao quà nguyên seal và đối chiếu tại quầy tránh tranh chấp đổi trả hàng quà tặng lưu niệm số lượng giới hạn.'
      },
      {
        questionText: 'Khi số lượng quà tặng bình nước trong ngày đã hết sạch trước 20:00, phương án thay thế của rạp là:',
        options: [
          'Bảo khách xui xẻo ráng chịu',
          'Tươi cười thông báo hết quà trong ngày, tặng bù Voucher F&B giảm giá 30% cho lần xem phim kế tiếp và ghi lại thông tin khách để ưu tiên đợt nhập quà mới',
          'Thu thêm tiền bồi thường của khách',
          'Đóng cửa quầy không bán nữa'
        ],
        correctAnswerIndex: 1,
        explanation: 'Chủ động bù đắp Voucher giảm 30% xoa dịu cảm giác hụt hẫng và thể hiện sự tôn trọng quyền lợi của khán giả.'
      },
      {
        questionText: 'Nguyên tắc cộng dồn các chương trình khuyến mãi (Stacking Promotions) tại Aurora quy định:',
        options: [
          'Được cộng dồn vô hạn tất cả các loại voucher khuyến mãi cùng lúc',
          'Mỗi vé xem phim hoặc combo chỉ được áp dụng 01 chương trình khuyến mãi có giá trị ưu đãi cao nhất, không áp dụng đồng thời trừ khi có quy định riêng',
          'Không áp dụng bất kỳ khuyến mãi nào',
          'Tùy nhân viên quyết định'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nguyên tắc không cộng dồn khuyến mãi bảo đảm biên lợi nhuận tài chính rạp và tránh gian lận trục lợi chính sách.'
      },
      {
        questionText: 'Chính sách giá vé ưu đãi dành cho trẻ em có chiều cao dưới 0.7 mét tại Aurora là gì?',
        options: [
          'Tính giá vé gấp đôi người lớn',
          'Miễn phí hoàn toàn vé xem phim khi trẻ ngồi chung ghế với phụ huynh',
          'Bắt buộc mua vé người lớn',
          'Không cho trẻ em vào rạp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Em bé nhỏ dưới 0.7m ngồi chung lòng bố mẹ được miễn vé hoàn toàn tạo điều kiện cho các gia đình có con nhỏ cùng giải trí.'
      },
      {
        questionText: 'Chính sách giá vé tri ân dành cho người cao tuổi (từ đủ 55 tuổi trở lên) tại rạp áp dụng ra sao?',
        options: [
          'Không có chính sách giảm giá',
          'Đồng giá vé ưu đãi 50.000đ cho tất cả các ngày trong tuần đối với phim 2D khi xuất trình CCCD chính chủ',
          'Chỉ giảm vào ngày lễ',
          'Miễn phí toàn bộ suất chiếu đêm'
        ],
        correctAnswerIndex: 1,
        explanation: 'Giá vé đồng giá 50.000đ cho người cao tuổi là chính sách an sinh văn hóa thể hiện lòng tri ân sâu sắc với thế hệ đi trước.'
      },
      {
        questionText: 'Quy trình lưu trữ cuống hóa đơn voucher đối tác sau ca bán vé để phục vụ kế toán là gì?',
        options: [
          'Vứt vào sọt rác sau khi khách đi',
          'Kẹp giữ cuống hóa đơn có chữ ký khách hàng, xếp gọn theo từng đối tác (MoMo, ShopeePay...), bàn giao cùng bảng tổng hợp đối soát cuối ca',
          'Mang về nhà giữ',
          'Đốt bỏ cuối ngày'
        ],
        correctAnswerIndex: 1,
        explanation: 'Cuống hóa đơn là chứng từ gốc bắt buộc để phòng Kế toán đối soát dòng tiền và quyết toán thu hồi tiền từ các đối tác ví điện tử.'
      },
      {
        questionText: 'Kỹ năng giới thiệu chương trình khách hàng thân thiết cho khách mới chưa đăng ký thẻ tại quầy là:',
        options: [
          'Ép buộc khách phải đăng ký mới cho mua vé',
          'Gợi ý nhanh trong 10 giây: "Dạ thưa anh/chị, chỉ cần 30 giây đăng ký số điện thoại miễn phí, mình sẽ được tích ngay 5% điểm hoàn tiền và nhận vé xem phim sinh nhật ạ!"',
          'Không thèm hỏi khách',
          'Bảo khách tự lên mạng tìm'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nêu bật quyền lợi cốt lõi (hoàn tiền + vé sinh nhật) trong 10 giây thuyết phục khách hàng hào hứng đăng ký thành viên ngay lập tức.'
      },
      {
        questionText: 'Khi khách hàng quên mang theo thẻ cứng thành viên khi đến quầy, nhân viên tra cứu bằng cách nào?',
        options: [
          'Từ chối tích điểm',
          'Tra cứu nhanh chóng trên màn hình POS bằng số điện thoại đăng ký hoặc quét mã thành viên trên App điện thoại của khách',
          'Bắt khách về nhà lấy thẻ',
          'Trừ hết điểm của khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Số điện thoại là mã định danh thành viên duy nhất; khách không cần mang thẻ cứng vẫn hưởng trọn vẹn mọi quyền lợi tích điểm.'
      },
      {
        questionText: 'Thời hạn hiệu lực của điểm thưởng tích lũy trong tài khoản thành viên Aurora kết thúc vào thời điểm nào?',
        options: [
          'Hết hạn sau 24 tiếng',
          'Điểm thưởng có giá trị tích lũy trong năm và hết hạn vào ngày 31 tháng 12 hàng năm (có thông báo trước 30 ngày cho khách hàng)',
          'Không bao giờ hết hạn',
          'Hết hạn sau 1 tuần'
        ],
        correctAnswerIndex: 1,
        explanation: 'Điểm thưởng chốt chu kỳ tài chính hàng năm vào 31/12, rạp luôn gửi thông báo qua App trước 1 tháng để khách kịp quy đổi.'
      },
      {
        questionText: 'Vé mời miễn phí (Complimentary Ticket / Free Ticket) KHÔNG ĐƯỢC áp dụng cho các suất chiếu nào?',
        options: [
          'Mọi suất chiếu đều xem được',
          'Không áp dụng cho các suất chiếu đặc biệt sớm (Sneak Show), các phòng chiếu định dạng cao cấp đặc thù (IMAX Laser, 4DX) và các ngày nghỉ Lễ Tết quy định',
          'Chỉ xem được phim dở',
          'Không áp dụng ngày thứ Ba'
        ],
        correctAnswerIndex: 1,
        explanation: 'Quy chế vé mời Complimentary loại trừ phòng chiếu công nghệ đặc thù đắt tiền và ngày Lễ Tết để ưu tiên doanh thu phòng vé.'
      },
      {
        questionText: 'Hành vi nhân viên tự ý dùng tài khoản thành viên cá nhân để quét tích điểm cho khách không có thẻ bị xử lý thế nào?',
        options: [
          'Được khen thưởng vì chăm chỉ tích điểm',
          'Là hành vi gian lận nghiêm trọng (Fraud), bị xử lý kỷ luật sa thải và thu hồi toàn bộ số điểm gian lận theo quy chế nội bộ',
          'Được chia đôi tiền tích điểm',
          'Không bị làm sao'
        ],
        correctAnswerIndex: 1,
        explanation: 'Trục lợi điểm thưởng là hành vi vi phạm đạo đức nghề nghiệp và pháp luật nội bộ, bị nghiêm cấm và chế tài cao nhất tại Aurora.'
      },
      {
        questionText: 'Ngày hội thành viên "Aurora Member Day" diễn ra vào ngày nào hàng tuần với ưu đãi gì?',
        options: [
          'Chủ Nhật hàng tuần',
          'Thứ Ba hàng tuần: Đồng giá vé xem phim chỉ 55.000đ cho mọi thành viên và giảm 20% combo bắp nước',
          'Thứ Sáu hàng tuần',
          'Chỉ diễn ra vào ngày mùng 1 đầu tháng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thứ Ba Happy Member Day là ngày hội truyền thống giúp kích cầu các ngày đầu tuần và tri ân các thành viên trung thành.'
      },
      {
        questionText: 'Khi khách hàng khiếu nại nhân viên không tư vấn gói ưu đãi Combo tiết kiệm hơn cho gia đình, cách giải quyết là:',
        options: [
          'Tranh cãi rằng khách tự chọn gì thì tính nấy',
          'Chân thành xin lỗi vì sự thiếu sót trong khâu tư vấn, lập tức hủy hóa đơn cũ và áp dụng lại gói combo ưu đãi tiết kiệm nhất cho gia đình khách',
          'Từ chối hủy vé',
          'Bảo khách sang bàn bên cạnh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hủy lệnh xuất bán cũ và gán lại gói combo tiết kiệm hơn cho gia đình thể hiện sự thành tâm bảo vệ quyền lợi tài chính của khách.'
      },
      {
        questionText: 'Chương trình quay số may mắn trúng thưởng xe máy điện khi mua vé xem phim bom tấn hè yêu cầu điều kiện gì?',
        options: [
          'Mua 100 vé mới được quay',
          'Mỗi hóa đơn mua từ 02 vé xem phim kèm 01 Combo X2 có mã dự thưởng in dưới chân cuống vé để nhập quay thưởng trên Aurora App',
          'Tất cả mọi người vào rạp đều trúng',
          'Chỉ dành cho nhân viên rạp'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mã dự thưởng in tự động dưới chân hóa đơn kết nối trực tiếp với App tạo sự minh bạch và kích thích khách hàng mua trọn gói dịch vụ.'
      },
      {
        questionText: 'Các kênh truyền thông tại sảnh rạp hỗ trợ lan tỏa chương trình khuyến mãi hè 2026 bao gồm:',
        options: [
          'Chỉ truyền miệng nội bộ',
          'Màn hình LED Poster sảnh chính, Standee nhân vật tại lối đi, thông báo phát thanh định kỳ sảnh và tờ rơi cầm tay tại quầy vé',
          'Vẽ phấn lên tường rạp',
          'Không cần truyền thông'
        ],
        correctAnswerIndex: 1,
        explanation: 'Truyền thông trực quan đa kênh tại sảnh giúp khách hàng tiếp cận thông tin khuyến mãi tự nhiên và đưa ra quyết định mua hàng nhanh chóng.'
      },
      {
        questionText: 'Nhiệm vụ kiểm soát số lượng quà tặng khuyến mãi tồn kho thực tế so với số liệu phần mềm được làm khi nào?',
        options: [
          'Một năm kiểm tra 1 lần',
          'Kiểm đếm chốt số lượng quà thực tế sau mỗi ca trực và đối chiếu với số lượng xuất tặng ghi nhận trên hệ thống POS',
          'Khi nào mất hết quà mới kiểm tra',
          'Không cần kiểm kê'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm kê quà tặng mỗi ca ngăn ngừa thất thoát tài sản khuyến mãi và đảm bảo số liệu báo cáo luôn trùng khớp 100%.'
      },
      {
        questionText: 'Báo cáo doanh số chiến dịch khuyến mãi hè 2026 được gửi cho ai vào cuối ngày?',
        options: [
          'Gửi cho bạn bè xem',
          'Trưởng ca trực chốt báo cáo gửi Trưởng bộ phận Marketing & Quản lý cụm rạp để theo dõi hiệu quả doanh thu và điều chỉnh nguồn lực',
          'Tự giữ không gửi cho ai',
          'Gửi cho hãng xe ôm công nghệ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Báo cáo doanh thu theo ngày là cơ sở dữ liệu quan trọng để bộ phận Marketing đánh giá mức độ hấp dẫn của chiến dịch và tối ưu tồn kho.'
      },
      {
        questionText: 'Mục tiêu tối thượng của các chương trình khuyến mãi và tri ân khách hàng tại Aurora Cinema là gì?',
        options: [
          'Bán tống bán tháo hàng ế ẩm',
          'Mang điện ảnh đỉnh cao đến gần hơn với mọi tầng lớp khán giả, lan tỏa niềm vui giải trí và xây dựng cộng đồng người yêu điện ảnh trung thành bền vững',
          'Thu tiền thật nhanh rồi đóng cửa',
          'Cạnh tranh phá giá không lành mạnh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Mục tiêu lớn nhất là truyền cảm hứng văn hóa điện ảnh, đem lại giá trị thiết thực và sự gắn kết yêu mến dài lâu của công chúng yêu phim.'
      }
    ]
  },
  {
    id: 8,
    courseId: 5,
    courseTitle: 'Giám Sát Ca Trực Cinema Supervisor & Kiểm Soát Thất Thoát, An Toàn Vệ Sinh HACCP',
    title: 'Kiểm Tra Nghiệp Vụ Giám Sát Ca Trực (Supervisor), Kiểm Kê Kho & An Toàn Thực Phẩm HACCP 2026',
    passScore: 80,
    durationMinutes: 25,
    isCtkm: false,
    questions: [
      {
        questionText: 'Trách nhiệm cốt lõi của một Quản lý ca trực (Duty Manager / Floor Supervisor) tại cụm rạp Aurora là gì?',
        options: [
          'Chỉ ngồi trong văn phòng xem camera và bấm điện thoại',
          'Chịu trách nhiệm toàn diện về an toàn con người, chất lượng dịch vụ khách hàng, kiểm soát doanh thu tiền mặt, vận hành thiết bị và dẫn dắt đội ngũ trong ca',
          'Làm thay toàn bộ công việc của nhân viên',
          'Chỉ đi kiểm tra khi có giám đốc xuống'
        ],
        correctAnswerIndex: 1,
        explanation: 'Supervisor là đầu tàu chỉ huy trực tiếp toàn bộ dòng chảy vận hành của rạp trong ca, giải quyết sự cố tức thì và duy trì chuẩn mực dịch vụ.'
      },
      {
        questionText: 'Bảng kiểm tra mở ca (Opening Checklist) của Supervisor bắt buộc phải hoàn thành trước giờ mở cửa đón khách bao lâu?',
        options: [
          'Đúng giờ mở cửa mới bắt đầu đi kiểm tra',
          'Trước giờ mở cửa tối thiểu 45 đến 60 phút để kiểm tra toàn bộ hệ thống điện chiếu sáng, máy lạnh, âm thanh, tồn kho quầy vé và sẵn sàng nguyên liệu bắp nước',
          'Trước 5 phút',
          'Để ca chiều kiểm tra'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hoàn thành Opening Checklist trước 45-60 phút giúp phát hiện và khắc phục các sự cố rò rỉ, mất kết nối trước khi vị khách đầu tiên bước vào sảnh.'
      },
      {
        questionText: 'Tiêu chuẩn an toàn vệ sinh thực phẩm HACCP tại khu vực chế biến bắp nước rạp phim quy định nguyên tắc cốt lõi nào?',
        options: [
          'Để đồ ăn sống chín lẫn lộn cho tiện',
          'Phân tích và kiểm soát các mối nguy tại các điểm kiểm soát tới hạn (CCP): nhiệt độ bơ, kiểm soát dị vật kim loại, hạn sử dụng siro và khử trùng vòi rót',
          'Chỉ cần lau bụi bằng khăn khô',
          'Không có điểm kiểm soát tới hạn'
        ],
        correctAnswerIndex: 1,
        explanation: 'HACCP nhận diện và triệt tiêu mọi mối nguy vật lý, hóa học, sinh học từ khâu nhập nguyên liệu đến tận tay người tiêu dùng.'
      },
      {
        questionText: 'Quy định về việc lưu mẫu thực phẩm (Food Sampling) hàng ngày tại quầy Concession yêu cầu:',
        options: [
          'Nhân viên ăn thử rồi thôi',
          'Lấy mẫu đại diện các mẻ bắp, xúc xích, phô mai (tối thiểu 100g/mẫu) đựng trong hộp vô trùng có dán nhãn ngày giờ, lưu trữ trong ngăn mát tủ lạnh 24 - 48 giờ',
          'Vứt bỏ mẫu sau 1 tiếng',
          'Không cần lưu mẫu'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lưu mẫu thực phẩm 24-48 giờ là quy định bắt buộc của Chi cục An toàn vệ sinh thực phẩm để phục vụ xét nghiệm đối chứng khi có nghi vấn ngộ độc.'
      },
      {
        questionText: 'Nhiệt độ tiêu chuẩn duy trì trong kho mát bảo quản xúc xích và nguyên liệu tươi sống là bao nhiêu?',
        options: [
          '15°C - 20°C',
          '0°C đến 4°C',
          '-18°C',
          'Nhiệt độ phòng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Dải nhiệt độ 0°C - 4°C ức chế hoàn toàn sự phát triển của vi khuẩn gây ôi thiu mà không làm đóng băng phá vỡ cấu trúc tế bào thực phẩm.'
      },
      {
        questionText: 'Nhiệt độ tiêu chuẩn duy trì trong kho đông (Freezer Storage) bảo quản thực phẩm đông lạnh dài ngày là:',
        options: [
          '0°C',
          '-18°C hoặc thấp hơn',
          '5°C',
          '-5°C'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nhiệt độ -18°C ngăn chặn tuyệt đối hoạt động của vi sinh vật và các enzyme phân hủy chất lượng thực phẩm trong nhiều tháng.'
      },
      {
        questionText: 'Phương pháp kiểm kê đột xuất (Cycle Count) các mặt hàng có giá trị cao và dễ thất thoát (ly giấy, xô bắp, phô mai) nhằm mục đích:',
        options: [
          'Làm khó nhân viên quầy',
          'Phát hiện kịp thời các chênh lệch số liệu giữa phần mềm và thực tế trong ngày để ngăn chặn gian lận và thất thoát nguyên vật liệu ngay lập tức',
          'Chỉ kiểm tra cho vui',
          'Để nhân viên đếm hàng thay vì phục vụ khách'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm kê xoay vòng bất ngờ tạo tính tự giác cao độ và triệt tiêu nguy cơ thất thoát hàng tồn kho từ trong trứng nước.'
      },
      {
        questionText: 'Định mức hao hụt cho phép (Variance Tolerance) đối với nguyên liệu bắp nước tại rạp tiêu chuẩn là bao nhiêu?',
        options: [
          'Được phép hao hụt 20%',
          'Dưới 0.5% đến 1.0% tổng giá trị xuất bán theo quy chế quản trị tài chính nội bộ',
          'Được hao hụt 50%',
          'Không cần quản lý định mức'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tỷ lệ hao hụt cho phép dao động dưới 0.5% - 1% bù đắp các hao hụt tự nhiên trong quá trình nổ bắp và rơi vãi thao tác chuẩn.'
      },
      {
        questionText: 'Hành vi gian lận bán vé nào sau đây là nghiêm trọng nhất và cần được Supervisor giám sát phát hiện ngay?',
        options: [
          'Tư vấn thêm bắp nước cho khách',
          'In vé giả mạo, cho khách vào xem không xuất vé trên hệ thống POS để bỏ túi tiền mặt riêng hoặc dùng lại cuống vé cũ',
          'Xuất hóa đơn VAT cho khách',
          'Đổi suất chiếu cho khách đúng quy trình'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bán vé chui không qua POS là hành vi tham ô biển thủ tài sản doanh nghiệp, bị xử lý kỷ luật nghiêm khắc và truy cứu trách nhiệm.'
      },
      {
        questionText: 'Quy trình đối soát két tiền mặt giữa ca (Mid-shift Cash Count) được thực hiện với sự tham gia của ai?',
        options: [
          'Thu ngân tự làm một mình không ai biết',
          'Supervisor cùng Thu ngân trực tiếp kiểm đếm độc lập, đối chiếu với báo cáo doanh thu tạm tính trên POS và cùng ký vào biên bản kiểm quỹ niêm phong',
          'Khách hàng đứng đếm hộ',
          'Nhân viên bảo vệ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nguyên tắc 4 mắt (Dual Control) kiểm đếm có sự chứng kiến của 2 người bảo vệ tính minh bạch và tránh nghi ngờ lẫn nhau.'
      },
      {
        questionText: 'Khi nhân viên trực ca gọi điện báo nghỉ ốm đột xuất trước giờ vào ca 30 phút, Supervisor xử lý ra sao?',
        options: [
          'Mắng chửi nhân viên và mặc kệ quầy thiếu người',
          'Thăm hỏi sức khỏe nhân viên, ghi nhận nghỉ ốm và lập tức kích hoạt danh sách nhân sự dự phòng (On-call Staff) điều động nhân viên thay thế kịp giờ ca',
          'Đóng cửa toàn bộ rạp chiếu phim',
          'Bắt khách hàng tự làm việc'
        ],
        correctAnswerIndex: 1,
        explanation: 'Văn hóa thấu hiểu sức khỏe nhân viên đi đôi với phản xạ điều động nhân sự dự bị On-call bảo đảm quầy dịch vụ không bao giờ bị trống người.'
      },
      {
        questionText: 'Khi phòng chiếu gặp sự cố kỹ thuật chưa giải quyết được, thời gian Supervisor được phép quyết định hoãn suất chiếu tối đa là bao lâu?',
        options: [
          'Hoãn 2 tiếng đồng hồ',
          'Tối đa không quá 15 phút; nếu sau 15 phút không khắc phục được thì bắt buộc kích hoạt phương án hủy suất và bồi hoàn cho toàn bộ khán giả',
          'Hoãn đến sáng hôm sau',
          'Không bao giờ được hủy suất'
        ],
        correctAnswerIndex: 1,
        explanation: 'Khán giả không thể chờ đợi quá 15 phút trong phòng tối; quyết định dứt khoát chuyển sang phương án bồi hoàn bảo vệ uy tín thương hiệu.'
      },
      {
        questionText: 'Biên bản sự cố bất thường (Incident Report) bắt buộc phải được Supervisor lập và gửi Ban Giám Đốc trong vòng bao lâu?',
        options: [
          'Sau 1 tháng',
          'Trong vòng 02 giờ kể từ thời điểm sự cố xảy ra (sự cố cháy nổ, tai nạn thương tích, gián đoạn chiếu phim, khách hàng gây rối)',
          'Không cần lập biên bản',
          'Khi nào rảnh thì viết'
        ],
        correctAnswerIndex: 1,
        explanation: 'Thời hạn 2 giờ đảm bảo Ban Giám Đốc nắm trọn vẹn thông tin trung thực để chỉ đạo ứng phó khủng hoảng truyền thông kịp thời.'
      },
      {
        questionText: 'Khi có đoàn kiểm tra liên ngành của cơ quan nhà nước (Thanh tra văn hóa, Quản lý thị trường, PCCC, Y tế) đến kiểm tra rạp, Supervisor cần:',
        options: [
          'Bỏ chạy khóa cửa văn phòng lại',
          'Tiếp đón nhã nhặn, kiểm tra quyết định kiểm tra và thẻ công chức, thông báo ngay cho Giám đốc cụm rạp, cung cấp hồ sơ pháp lý minh bạch theo đúng thẩm quyền',
          'Gây gổ chống đối cơ quan chức năng',
          'Tự ý ký các biên bản xử phạt ngoài thẩm quyền'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tác phong đĩnh đạc, kiểm tra tư cách pháp lý đoàn kiểm tra và phối hợp minh bạch là trách nhiệm của người quản lý cơ sở.'
      },
      {
        questionText: 'Nội dung buổi họp giao ban đầu ca (Briefing) 10 phút của Supervisor với nhân viên bao gồm:',
        options: [
          'Đứng kể chuyện phiếm cá nhân',
          'Kiểm tra tác phong diện mạo, phổ biến các phim mới ra rạp hôm nay, thông báo mục tiêu doanh số bán bắp nước, nhắc nhở các lưu ý an toàn và truyền cảm hứng',
          'Chỉ trích nhân viên trước tập thể',
          'Chỉ điểm danh rồi giải tán'
        ],
        correctAnswerIndex: 1,
        explanation: '10 phút Briefing đầu ca truyền năng lượng tích cực, định hướng rõ mục tiêu trọng tâm và chuẩn bị tâm thế vững vàng cho toàn đội ngũ.'
      },
      {
        questionText: 'Bảng kiểm tra đóng ca (Closing Checklist) cuối ngày của Supervisor yêu cầu kiểm tra những hạng mục nào?',
        options: [
          'Chỉ cần tắt bóng đèn cầu thang rồi về',
          'Chốt quỹ doanh thu tiền mặt, khóa van ga CO2, kiểm tra an toàn điện toàn rạp, kiểm tra các phòng chiếu không còn khách ngủ quên, chốt khóa cửa kho và kích hoạt hệ thống báo động chống trộm',
          'Để cửa rạp mở toang',
          'Bỏ tiền trên bàn thu ngân'
        ],
        correctAnswerIndex: 1,
        explanation: 'Closing Checklist là chốt chặn an ninh cuối cùng bảo vệ tài sản hàng tỷ đồng của rạp phim trong suốt đêm vắng người.'
      },
      {
        questionText: 'Khi phát hiện một nhân viên có hành vi trộm cắp tiền hoặc tài sản của rạp, quy trình xử lý của Supervisor là:',
        options: [
          'Đánh đập nhân viên',
          'Bảo toàn chứng cứ camera, mời nhân viên vào phòng làm việc kín đáo cùng 01 nhân chứng, lập biên bản ghi nhận sự việc trung thực và báo cáo Giám đốc nhân sự xử lý',
          'Lên mạng xã hội bêu rếu nhân viên',
          'Bỏ qua nếu nhân viên xin lỗi'
        ],
        correctAnswerIndex: 1,
        explanation: 'Xử lý nhân sự theo đúng trình tự pháp luật lao động, tôn trọng nhân phẩm con người và bảo đảm chứng cứ pháp lý vững chắc.'
      },
      {
        questionText: 'Biện pháp điều phối an ninh khi rạp tổ chức sự kiện thảm đỏ công chiếu phim (Premiere Event) quy tụ đông đảo nghệ sĩ và khán giả là:',
        options: [
          'Để khán giả tràn vào chụp ảnh tự do',
          'Thiết lập hàng rào rào chắn (Barrier Stanchions) phân làn rõ ràng, tăng cường nhân sự kiểm soát cửa vé, bố trí bảo vệ túc trực tại các điểm nút giao thông',
          'Không cho ai vào xem phim',
          'Tắt điện sảnh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Hàng rào phân luồng và kế hoạch an ninh dự phòng ngăn chặn thảm họa chen lấn xô đẩy trong các sự kiện giải trí đông người.'
      },
      {
        questionText: 'Quy trình bàn giao chìa khóa các phòng chức năng và niêm phong cửa kho cuối ca được quản lý thế nào?',
        options: [
          'Chìa khóa ai muốn cầm thì cầm',
          'Toàn bộ chìa khóa được cất vào tủ chìa khóa trung tâm có khóa số, ghi chép sổ nhật ký mượn trả chìa và dán tem niêm phong cửa kho nguyên liệu',
          'Để chìa khóa cắm sẵn trên ổ khóa cửa',
          'Vứt chìa khóa vào thùng rác'
        ],
        correctAnswerIndex: 1,
        explanation: 'Kiểm soát tủ chìa khóa và tem niêm phong kho ngăn chặn mọi sự xâm nhập bất hợp pháp ngoài giờ làm việc.'
      },
      {
        questionText: 'Supervisor quản lý chi phí tiêu hao vật tư phụ trợ (Operating Supplies: ly, túi, khăn giấy) bằng cách nào?',
        options: [
          'Cấm nhân viên không được phát khăn giấy cho khách',
          'Theo dõi định mức tiêu hao trên mỗi giao dịch, hướng dẫn nhân viên thao tác chuẩn xác tránh làm rơi rách bao bì và định kỳ kiểm đếm hao hụt',
          'Mua hàng kém chất lượng trôi nổi',
          'Không cần quản lý'
        ],
        correctAnswerIndex: 1,
        explanation: 'Tiết kiệm chi phí vận hành từ những chi tiết nhỏ nhất như ly giấy, ống hút nâng cao hiệu quả kinh doanh mà vẫn đảm bảo trải nghiệm khách hàng.'
      },
      {
        questionText: 'Kỹ năng phản hồi và huấn luyện nhân viên (Coaching & Feedback) hiệu quả của Supervisor tuân theo nguyên tắc nào?',
        options: [
          'Mắng mỏ nhân viên giữa sảnh đông người cho nhớ lâu',
          'Khen ngợi công khai trước tập thể khi nhân viên làm tốt; góp ý xây dựng riêng tư (1-on-1) chỉ rõ hành vi cần cải thiện và hướng dẫn cách làm đúng',
          'Chỉ chỉ trích không hướng dẫn',
          'Không bao giờ khen ai'
        ],
        correctAnswerIndex: 1,
        explanation: 'Nguyên tắc vàng quản trị nhân sự: "Khen ngợi nơi công cộng - Góp ý chốn riêng tư" giúp nhân viên tâm phục khẩu phục và không ngừng tiến bộ.'
      },
      {
        questionText: 'Quy trình xử lý chất thải nguy hại (bóng đèn xenon cũ, pin micro, mực in, hóa chất tẩy rửa) tại rạp là:',
        options: [
          'Đập vỡ ném vào thùng rác sinh hoạt chung',
          'Thu gom lưu trữ trong thùng chứa chuyên dụng có dán nhãn chất thải nguy hại và ký hợp đồng chuyển giao cho đơn vị xử lý môi trường có giấy phép',
          'Đổ xuống cống rãnh thành phố',
          'Đem đốt ngoài trời'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bóng đèn rạp chứa áp suất và kim loại nặng; quản lý chất thải nguy hại đúng quy định pháp luật bảo vệ môi trường và cộng đồng.'
      },
      {
        questionText: 'Hệ thống camera giám sát (CCTV) tại các quầy thu ngân và khu vực nhạy cảm phải lưu trữ dữ liệu tối thiểu bao lâu?',
        options: [
          'Chỉ lưu trong 1 ngày',
          'Tối thiểu từ 30 đến 60 ngày liên tục với chất lượng hình ảnh sắc nét',
          'Không cần ghi hình chỉ xem trực tiếp',
          'Lưu 1 năm'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lưu trữ tối thiểu 30-60 ngày phục vụ công tác tra cứu khiếu nại, đối soát tài chính và cung cấp dữ liệu cho cơ quan công an khi có điều tra.'
      },
      {
        questionText: 'Thẩm quyền phê duyệt đơn xin đổi ca làm việc (Shift Swap Request) giữa 2 nhân viên thuộc về ai?',
        options: [
          'Nhân viên tự đổi ngầm với nhau không cần báo ai',
          'Supervisor hoặc Trưởng bộ phận đào tạo duyệt trên phần mềm quản lý lịch sau khi đối chiếu đảm bảo cả 2 nhân viên đáp ứng tiêu chuẩn kỹ năng của vị trí ca đó',
          'Bảo vệ duyệt',
          'Khách hàng duyệt'
        ],
        correctAnswerIndex: 1,
        explanation: 'Quản lý phải phê duyệt để bảo đảm cơ cấu nhân sự ca trực luôn đủ năng lực chuyên môn và không bị trùng lịch làm việc quá giờ quy định.'
      },
      {
        questionText: 'Khi xảy ra tai nạn lao động trong ca trực (nhân viên bị bỏng nồi bắp hoặc trượt chân té ngã), Supervisor xử lý theo trình tự nào?',
        options: [
          'Che giấu thông tin không cho ai biết',
          'Sơ cứu khẩn cấp ngay lập tức -> Đưa nạn nhân đi bệnh viện nếu cần -> Lập biên bản tai nạn lao động ghi nhận nguyên nhân -> Báo cáo Ban Giám Đốc và triển khai biện pháp phòng ngừa',
          'Trừ lương nhân viên bị tai nạn',
          'Bắt nhân viên làm tiếp hết ca'
        ],
        correctAnswerIndex: 1,
        explanation: 'Ưu tiên cấp cứu tính mạng sức khỏe người lao động lên hàng đầu, sau đó điều tra nguyên nhân để cải tiến quy trình bảo hộ lao động.'
      },
      {
        questionText: 'Việc giám sát chất lượng âm thanh và hình ảnh của các phòng chiếu trong ca trực của Supervisor được thực hiện:',
        options: [
          'Chỉ kiểm tra khi phim đã chiếu xong',
          'Trực tiếp đi tuần tra ngẫu nhiên các phòng chiếu trong ca, đối chiếu mức âm lượng, độ sáng, không khí lạnh và tác phong Usher trực cửa',
          'Không cần kiểm tra vì đã có máy tự động',
          'Hỏi nhân viên bảo vệ'
        ],
        correctAnswerIndex: 1,
        explanation: 'Trực tiếp mục sở thị trên sàn (Management by Walking Around) là cách quản lý hiệu quả nhất giúp duy trì tiêu chuẩn vận hành hoàn hảo.'
      },
      {
        questionText: 'Biên bản bàn giao ca trực giữa Quản lý ca Sáng và Quản lý ca Chiều (Logbook Handover) bao gồm những nội dung gì?',
        options: [
          'Chỉ chào nhau một câu rồi về',
          'Số liệu doanh thu đến thời điểm giao ca, tình trạng tồn kho tiền mặt, các sự cố kỹ thuật còn tồn đọng, danh sách sự kiện đặc biệt và các chỉ đạo cần theo dõi tiếp trong ca chiều',
          'Kể chuyện cá nhân',
          'Giao lại điện thoại cá nhân'
        ],
        correctAnswerIndex: 1,
        explanation: 'Bàn giao ca bài bản bảo đảm dòng chảy vận hành xuyên suốt không bị đứt gãy thông tin và giúp ca sau chủ động ứng phó.'
      },
      {
        questionText: 'Phương pháp quản lý thời gian "Ưu tiên việc quan trọng và khẩn cấp" (Eisenhower Matrix) giúp Supervisor:',
        options: [
          'Tránh việc lười biếng',
          'Tập trung xử lý ngay các sự cố ảnh hưởng trực tiếp đến an toàn khách hàng và doanh thu rạp, đồng thời chủ động lên kế hoạch phòng ngừa rủi ro dài hạn',
          'Chỉ làm những việc dễ',
          'Ủy quyền toàn bộ mọi việc cho người khác'
        ],
        correctAnswerIndex: 1,
        explanation: 'Quản trị thời gian khoa học giúp người lãnh đạo không bị cuốn vào những vụn vặt mà luôn làm chủ tình hình vận hành của rạp.'
      },
      {
        questionText: 'Văn hóa làm việc "Tôn trọng - Minh bạch - Đồng đội" tại Aurora Cinema bắt đầu từ hình mẫu của ai?',
        options: [
          'Từ nhân viên bảo vệ bên ngoài',
          'Từ chính thái độ, tác phong liêm chính, sự công bằng và tinh thần phụng sự gương mẫu của người Giám sát ca trực (Supervisor)',
          'Không ai cần làm gương',
          'Từ khách hàng'
        ],
        correctAnswerIndex: 1,
        explanation: 'Lãnh đạo bằng sự làm gương (Lead by Example) là phương pháp xây dựng văn hóa doanh nghiệp mạnh mẽ và bền vững nhất.'
      },
      {
        questionText: 'Thước đo thành công lớn nhất của một ca trực dưới sự dẫn dắt của Supervisor là gì?',
        options: [
          'Đạt doanh số cao nhưng có nhân viên bị tai nạn',
          'Toàn bộ ca trực diễn ra an toàn tuyệt đối, 100% khán giả rời rạp với nụ cười hài lòng, doanh số vượt chỉ tiêu và tập thể nhân viên gắn kết, tràn đầy năng lượng',
          'Không bị ai mắng',
          'Ca trực trôi qua nhanh'
        ],
        correctAnswerIndex: 1,
        explanation: 'Sự an toàn, sự hài lòng của khách hàng, hiệu quả kinh doanh và tinh thần đồng đội rạng rỡ chính là định nghĩa trọn vẹn của một ca trực thành công rực rỡ.'
      }
    ]
  }
];

// Helper to write to files and database
async function main() {
  console.log('Total Quizzes:', quizzesData.length);
  quizzesData.forEach(q => console.log(`Quiz ${q.id}: ${q.title} - ${q.questions.length} questions`));

  // 1. Create SQL update string for database_aurora_ems.sql and execute into MySQL via PHP
  const sqlStatements = [];

  // Ensure courses 1..8 exist
  const coursesToEnsure = [
    { id: 1, title: 'Quy Trình Chuẩn Phục Vụ Khách Hàng AURORA Standard 2026', cat: 'Nghiệp vụ Dịch vụ' },
    { id: 2, title: 'CTKM Siêu Bão Mùa Hè 2026: Combo Popcorn X2 & Vé 1K Student', cat: 'Chương Trình Khuyến Mãi (CTKM)' },
    { id: 3, title: 'An Toàn Phòng Cháy Chữa Cháy & Sơ Tán Phòng Chiếu IMAX', cat: 'An Toàn & Kỹ Thuật' },
    { id: 4, title: 'Nghiệp Vụ Quầy Concession: Rang Bắp Chuẩn Vị & Vận Hành Máy Nước Post-Mix', cat: 'Bắp Nước & Quầy Concession' },
    { id: 5, title: 'Nghệ Thuật Phục Vụ 5 Sao Aurora Hospitality Standard & Xử Lý Khách Hàng Khó Tính', cat: 'Nghiệp vụ Dịch vụ' },
    { id: 6, title: 'Kỹ Năng Vận Hành Quầy Vé Box Office, Đặt Chỗ POS & Xử Lý Sự Cố Suất Chiếu', cat: 'Vé & Chăm sóc Khách hàng' },
    { id: 7, title: 'Kỹ Thuật Vận Hành Máy Chiếu Laser 4K, IMAX & Hệ Thống Âm Thanh Dolby Atmos', cat: 'Kỹ Thuật Chiếu Phim' },
    { id: 8, title: 'Giám Sát Ca Trực Cinema Supervisor & Kiểm Soát Thất Thoát, An Toàn Vệ Sinh HACCP', cat: 'Quản Lý & Vận Hành' }
  ];

  // Output JSON for easy import into PHP
  const jsonPath = path.join(__dirname, 'quizzes_240.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ courses: coursesToEnsure, quizzes: quizzesData }, null, 2), 'utf8');
  console.log(`Saved quizzes_240.json successfully!`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
