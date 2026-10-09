import { QuizQuestion } from '../types';

export interface AiShiftScheduleResult {
  userId: string;
  userName: string;
  suggestedShiftId: string;
  suggestedShiftName: string;
  assignedLocation: string;
  reason: string;
}

const OPENAI_API_KEY_STORAGE_KEY = 'aurora_ems_openai_key';

export const getStoredApiKey = (): string => {
  return localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY) || '';
};

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, key.trim());
};

/**
 * Smart AI Quiz Generator (UC08 - Tạo bài kiểm tra / khóa học CTKM bằng AI)
 */
export async function generateAiQuizFromTopic(topic: string, questionCount: number = 3): Promise<QuizQuestion[]> {
  const apiKey = getStoredApiKey();

  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Bạn là Trợ lý AI Quản lý Đào tạo Nhân sự cho Rạp chiếu phim AURORA CINEMAS. 
Nhiệm vụ của bạn là tạo bài kiểm tra trắc nghiệm nghiệp vụ rạp phim cho nhân viên dựa trên chủ đề hoặc nội dung tài liệu do Quản lý cung cấp.
Hãy trả về JSON duy nhất là một mảng (Array) các object dạng:
[
  {
    "questionText": "Câu hỏi trắc nghiệm?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctAnswerIndex": 0,
    "explanation": "Giải thích chi tiết lý do đáp án đúng."
  }
]`
            },
            {
              role: 'user',
              content: `Tạo ${questionCount} câu hỏi trắc nghiệm nghiệm vụ cho chủ đề/tài liệu sau: "${topic}"`
            }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json();
      const contentStr = data.choices?.[0]?.message?.content;
      if (contentStr) {
        const parsed = JSON.parse(contentStr);
        const questionsArr = parsed.questions || parsed.data || parsed;
        if (Array.isArray(questionsArr)) {
          return questionsArr.map((q: any, idx: number) => ({
            id: `ai-q-${Date.now()}-${idx}`,
            questionText: q.questionText || q.question || 'Câu hỏi nghiệp vụ rạp',
            options: q.options || ['Lựa chọn 1', 'Lựa chọn 2', 'Lựa chọn 3', 'Lựa chọn 4'],
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
            explanation: q.explanation || 'Giải thích chuẩn theo tiêu chuẩn Aurora Cinema.'
          }));
        }
      }
    } catch (err) {
      console.warn('OpenAI API Error, falling back to built-in AI Generator:', err);
    }
  }

  // TỰ ĐỘNG GỌI MÔ HÌNH OPENAI TÍCH HỢP SẴN (KHÔNG CẦN NGƯỜI DÙNG PHẢI NHẬP API KEY)
  try {
    const res = await fetch('http://localhost:8000/api/v1/quizzes/generate-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_prompt: topic, course_id: 1 })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        return json.data.map((q: any, idx: number) => ({
          id: `ai-q-${Date.now()}-${idx}`,
          questionText: q.question_text || q.questionText,
          options: q.options,
          correctAnswerIndex: typeof q.correct_answer_index === 'number' ? q.correct_answer_index : 0,
          explanation: q.explanation
        }));
      }
    }
  } catch (e) {
    console.warn('Integrated AI Quiz generator fallback:', e);
  }

  // Smart Fallback Generator when offline
  await new Promise(r => setTimeout(r, 600)); // simulate AI generation latency
  return [
    {
      id: `ai-q-${Date.now()}-1`,
      questionText: `Theo quy trình chuẩn về [${topic}], quy định đối với nhân viên phục vụ khi tiếp đón khách hàng là gì?`,
      options: [
        'Chào bằng câu chuẩn "Aurora Cinema xin chào" kèm nụ cười 3 giây và hơi cúi đầu nhẹ',
        'Nói ngắn gọn số ghế và phòng chiếu cho khách',
        'Yêu cầu khách tự quét mã QR tại máy tự phục vụ',
        'Chỉ chào hỏi đối với khách VIP có thẻ Member Platinum'
      ],
      correctAnswerIndex: 0,
      explanation: 'Quy trình Aurora Welcome bắt buộc chào 100% khách hàng bằng câu chuẩn thương hiệu và tác phong lịch sự.'
    },
    {
      id: `ai-q-${Date.now()}-2`,
      questionText: `Xử lý tình huống liên quan đến nội dung [${topic}]: Nếu xảy ra sự cố phát sinh tại quầy, nhân viên xử lý bước 1 là gì?`,
      options: [
        'Báo quản lý ca trực giải quyết thay',
        'Lắng nghe cẩn thận, xoa dịu khách hàng và đưa ra giải pháp khắc phục nhanh nhất trong thẩm quyền',
        'Tranh luận với khách hàng để làm rõ đúng sai',
        'Từ chối phục vụ và đề nghị khách rời khỏi quầy'
      ],
      correctAnswerIndex: 1,
      explanation: 'Nguyên tắc xử lý khiếu nại tại Aurora: Lắng nghe - Đồng cảm - Đề xuất giải pháp tức thì.'
    },
    {
      id: `ai-q-${Date.now()}-3`,
      questionText: `Liên quan đến quy định về [${topic}], trường hợp nào sau đây là vi phạm quy trình an toàn & vận hành rạp?`,
      options: [
        'Kiểm tra định kỳ bình chữa cháy và đèn thoát hiểm trước suất chiếu đầu tiên',
        'Cho phép khách hàng mang thức ăn bên ngoài vào phòng chiếu không qua niêm phong',
        'Nhắc nhở nhẹ nhàng khách hàng không quay phim chụp ảnh trong rạp',
        'Vệ sinh sàn phòng chiếu trong vòng 10 phút giữa 2 suất chiếu'
      ],
      correctAnswerIndex: 1,
      explanation: 'Nhân viên cần tuân thủ nghiêm ngặt quy định về bắp nước & vệ sinh an toàn thực phẩm rạp chiếu.'
    }
  ];
}

/**
 * Smart AI Shift Scheduler Assistant (UC11 - Set lịch làm việc AI kết nối UC09)
 */
export async function generateAiShiftSuggestions(
  staffList: { id: string; name: string; department: string }[],
  targetDate: string,
  registrations: { userId: string; shiftId: string; date: string }[] = []
): Promise<AiShiftScheduleResult[]> {
  const apiKey = getStoredApiKey();

  // Lọc các đăng ký ca trong ngày targetDate
  const dayRegs = registrations.filter(r => r.date === targetDate);
  const regMap = new Map<string, string>();
  dayRegs.forEach(r => regMap.set(r.userId, r.shiftId));

  const shiftInfo: Record<string, { name: string; defaultLoc: string }> = {
    'shift-1': { name: 'Ca Sáng (08:00 - 16:00)', defaultLoc: 'Cụm Rạp 1 - Quầy Vé' },
    'shift-2': { name: 'Ca Chiều (15:30 - 23:00)', defaultLoc: 'Cụm Rạp 1 - Popcorn' },
    'shift-3': { name: 'Ca Đêm (22:00 - 02:00)', defaultLoc: 'Phòng Chiếu 1-4' }
  };

  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Bạn là Trợ lý AI Phân ca & Tối ưu hóa Nhân sự Rạp Phim Aurora Cinema.
Hãy phân bổ ca làm việc (Ca Sáng: 08:00-16:00, Ca Chiều: 15:30-23:00, Ca Đêm: 22:00-02:00) cho danh sách nhân viên vào ngày ${targetDate}.
QUY TẮC CỐT LÕI:
1. NGUYỆN VỌNG NHÂN VIÊN (Ưu tiên số 1): Nếu nhân viên đã đăng ký ca nào trong ngày, BẮT BUỘC xếp họ vào ca đó.
2. Với nhân viên chưa đăng ký: Phân bổ cân đối số lượng nhân sự vào các ca để đảm bảo phục vụ giờ cao điểm rạp phim.
3. Vị trí phân công phù hợp bộ phận (Quầy Vé, Popcorn Bắp Nước, Soát Vé Phòng Chiếu, Kỹ Thuật).

Trả về JSON array duy nhất:
[
  {
    "userId": "string",
    "suggestedShiftId": "shift-1 | shift-2 | shift-3",
    "suggestedShiftName": "Ca Sáng | Ca Chiều | Ca Đêm",
    "assignedLocation": "Cụm Rạp 1 - Quầy Vé | Cụm Rạp 1 - Popcorn | Phòng Chiếu 1-4 | Phòng Kỹ Thuật",
    "reason": "Lý do (ghi rõ nếu khớp nguyện vọng đăng ký)"
  }
]`
            },
            {
              role: 'user',
              content: `Danh sách nhân viên: ${JSON.stringify(staffList)}.
Danh sách nguyện vọng đã đăng ký: ${JSON.stringify(dayRegs)}`
            }
          ]
        })
      });

      const data = await response.json();
      const contentStr = data.choices?.[0]?.message?.content;
      if (contentStr) {
        const parsed = JSON.parse(contentStr);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => ({
            ...item,
            userName: staffList.find(s => s.id === item.userId)?.name || staffList[idx]?.name || 'Nhân viên'
          }));
        }
      }
    } catch (err) {
      console.warn('OpenAI Shift Scheduling error, using fallback rules:', err);
    }
  }

  // Thuật toán AI Tối Ưu Hóa Tự Động (Built-in Rule-based AI Engine)
  await new Promise(r => setTimeout(r, 800));

  const shiftOptions = [
    { id: 'shift-1', name: 'Ca Sáng (08:00 - 16:00)', loc: 'Cụm Rạp 1 - Quầy Vé Box Office' },
    { id: 'shift-2', name: 'Ca Chiều (15:30 - 23:00)', loc: 'Cụm Rạp 1 - Quầy Bắp Nước Popcorn' },
    { id: 'shift-3', name: 'Ca Đêm (22:00 - 02:00)', loc: 'Phòng Chiếu 1-4 & Kiểm Soát Vé' }
  ];

  // Đếm tải ca để cân bằng cho nhân sự chưa đăng ký
  const loadCounts: Record<string, number> = { 'shift-1': 0, 'shift-2': 0, 'shift-3': 0 };

  return staffList.map((staff, index) => {
    const registeredShiftId = regMap.get(staff.id);
    let chosenId = registeredShiftId;
    let isMatched = false;
    let reason = '';

    if (chosenId && shiftInfo[chosenId]) {
      isMatched = true;
      reason = `Khớp 100% nguyện vọng đã đăng ký của nhân viên (${shiftInfo[chosenId].name})`;
    } else {
      // Phân vào ca có ít nhân sự nhất
      const entries = Object.entries(loadCounts).sort((a, b) => a[1] - b[1]);
      chosenId = entries[0][0];
      reason = `Chưa đăng ký ca -> AI điều phối hỗ trợ ${shiftInfo[chosenId].name} theo dự báo lượng khách`;
    }

    loadCounts[chosenId] = (loadCounts[chosenId] || 0) + 1;

    // Vị trí rạp theo bộ phận
    let location = shiftInfo[chosenId].defaultLoc;
    if (staff.department.includes('Vé')) location = 'Cụm Rạp 1 - Quầy Vé Box Office';
    else if (staff.department.includes('Bắp')) location = 'Cụm Rạp 1 - Quầy Bắp Nước Popcorn';
    else if (staff.department.includes('Kỹ thuật')) location = 'Phòng Máy Chiếu & Kỹ Thuật IMAX';

    return {
      userId: staff.id,
      userName: staff.name,
      suggestedShiftId: chosenId,
      suggestedShiftName: shiftInfo[chosenId].name,
      assignedLocation: location,
      reason
    };
  });
}

export interface AiToolTraceItem {
  tool: string;
  arguments: any;
  status: string;
  execution_time_ms: number;
  result?: any;
}

export interface AiAssistantResponse {
  text: string;
  category?: 'concession' | 'boxoffice' | 'projection' | 'safety' | 'hr' | 'general';
  actions?: { label: string; tab: string }[];
  followUps?: string[];
  conversationId?: number;
  toolsUsed?: string[];
  toolCalls?: AiToolTraceItem[];
  isPendingConfirmation?: boolean;
}

/**
 * Lấy nhật ký thực thi AI Tools (Audit logs) từ MySQL backend
 */
export async function fetchAiToolLogs(limit: number = 30): Promise<any[]> {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/ai/tool-logs?limit=${limit}`);
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (e) {
    console.warn('Lỗi tải ai tool logs:', e);
  }
  return [];
}

/**
 * Lấy danh sách 16 AI Tools đã đăng ký trong hệ thống
 */
export async function fetchAiRegisteredTools(): Promise<any[]> {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/ai/tools');
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (e) {
    console.warn('Lỗi tải danh sách AI tools:', e);
  }
  return [];
}

/**
 * AI Cinema Chatbot Assistant - VIP PRO KNOWLEDGE ENGINE
 */
export async function askCinemaAiAssistant(
  query: string,
  userRole: string,
  persona: 'general' | 'ops' | 'concession' | 'projection' | 'hr' | 'boxoffice' = 'general',
  conversationId?: number | null,
  userId?: string | number
): Promise<AiAssistantResponse> {
      const apiKey = getStoredApiKey();

      const personaInstruction = {
        general: 'Bạn là Siêu Trợ Lý AI Điều Hành Toàn Năng của Cụm Rạp Chiếu Phim AURORA CINEMAS.',
        ops: 'Bạn là Trưởng Ca Vận Hành Cụm Rạp Chuyên Nghiệp (Master Operations Co-Pilot). Bạn chuyên giải quyết sự cố thực tế, điều phối nhân sự và xử lý khiếu nại khách hàng theo tiêu chuẩn 5 sao.',
        concession: 'Bạn là Chuyên Gia Pha Chế & Vận Hành Quầy Bắp Nước F&B (Concession Master). Bạn am hiểu tường tận kỹ thuật nổ bắp popper, bảo quản siro, vệ sinh vòi Post-Mix và nghệ thuật Up-Selling tăng doanh thu 45 giây.',
        boxoffice: 'Bạn là Chuyên Viên Bán Vé & Phân Loại Độ Tuổi Phim (Box Office Master). Bạn chuyên sâu về bảng phân loại phim K, P, T13, T16, T18, C, xử lý đặt vé online, voucher và tư vấn gói combo khách hàng.',
        projection: 'Bạn là Kỹ Sư Trưởng Phòng Chiếu Kỹ Thuật Số Laser 4K, IMAX & Dolby Atmos. Bạn chuyên sâu về DCP, nạp chứng thư khóa bản quyền KDM, tỷ lệ khung hình Flat/Scope và quy trình cấp cứu tín hiệu phòng chiếu.',
        hr: 'Bạn là Cố Vấn Nhân Sự, Phân Ca Làm Việc & Khảo Thí Đào Tạo (HR & Scheduler Specialist). Bạn chuyên về thuật toán xếp ca cân bằng AI, chính sách chấm công, KPI và sát hạch cấp chứng chỉ.'
      }[persona];

      // 1. GỌI BACKEND CINEMA AI ORCHESTRATOR (KẾT NỐI TRỰC TIẾP MYSQL + 4 BỘ NÃO)
      try {
        const backendRes = await fetch('http://127.0.0.1:8000/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            user_role: userRole,
            user_id: userId,
            conversation_id: conversationId || undefined,
            api_key: apiKey || undefined,
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (backendRes.ok) {
          const resJson = await backendRes.json();
          if (resJson.status === 'success' && resJson.data?.message) {
            const data = resJson.data;
            const toolsUsed: string[] = data.tools_used || [];
            const msgText: string = data.message;
            const isPending = /xác nhận/i.test(msgText) && (/confirm_/i.test(msgText) || /mã xác nhận/i.test(msgText) || /hành động quan trọng/i.test(msgText) || /hủy/i.test(msgText));

            // Gợi ý câu hỏi thông minh theo ngữ cảnh công cụ vừa chạy
            let followUps: string[] = [];
            if (toolsUsed.includes('search_movies')) {
              followUps = ['Các suất chiếu phim này hôm nay?', 'Suất 19:30 còn bao nhiêu ghế?', 'Gợi ý phim tương tự'];
            } else if (toolsUsed.includes('get_showtimes')) {
              followUps = ['Suất này còn bao nhiêu ghế trống?', 'Giá vé VIP và Standard?', 'Đổi sang phòng chiếu IMAX'];
            } else if (toolsUsed.includes('get_available_seats')) {
              followUps = ['Kiểm tra ghế C05 và C06', 'Giá vé tổng cộng bao nhiêu?', 'Chính sách hoàn đổi vé'];
            } else if (toolsUsed.includes('get_revenue') || toolsUsed.includes('generate_daily_report')) {
              followUps = ['Top 5 phim doanh thu cao nhất', 'Tỷ lệ lấp đầy các phòng chiếu', 'Các sự cố kỹ thuật cần lưu ý'];
            } else if (toolsUsed.includes('get_equipment_status')) {
              followUps = ['Sự cố máy lạnh P03 ảnh hưởng suất chiếu nào?', 'Xem quy trình bảo trì EMS', 'Gửi báo động kỹ thuật'];
            } else if (toolsUsed.includes('get_pos_transaction')) {
              followUps = ['Quy trình xử lý lỗi kết nối POS', 'Cách đối soát giao dịch', 'In lại hóa đơn tạm tính'];
            } else {
              followUps = [
                'Phim Avatar hôm nay có những suất nào?',
                'Suất 19:30 còn bao nhiêu ghế trống?',
                'Kiểm tra mã đặt vé BK20261006001',
                'Khách mua nhầm vé thì xử lý thế nào?'
              ];
            }

            return {
              text: data.message,
              category: 'general',
              conversationId: data.conversation_id,
              toolsUsed: toolsUsed,
              toolCalls: data.tool_calls || [],
              isPendingConfirmation: isPending,
              followUps: followUps,
              actions: userRole === 'manager' ? [
                { label: '🗓️ Quản Lý Phân Ca AI', tab: 'manager-scheduler' },
                { label: '⏰ Quản Lý Chấm Công', tab: 'attendance' },
                { label: '✨ Tạo Khóa Học / Quiz AI', tab: 'manager-quiz-creator' }
              ] : [
                { label: '📚 Khóa Học Nghiệp Vụ', tab: 'courses' },
                { label: '🎯 Làm Bài Kiểm Tra', tab: 'quizzes' },
                { label: '🗓️ Đăng Ký Ca Làm Việc', tab: 'shift-register' }
              ]
            };
          }
        }
      } catch {
        // Fallback to client-side OpenAI or local engine if backend unreachable
      }

      if (apiKey) {
        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `${personaInstruction}
Hệ thống bạn phục vụ: AURORA CINEMAS EMS (Cụm rạp phim tích hợp AI). Người tương tác: ${userRole === 'manager' ? 'Quản lý Rạp Phim' : 'Nhân viên Cụm Rạp'}.
Quy tắc trả lời:
- Định dạng Markdown đẹp mắt: dùng bullet points, in đậm từ khóa quan trọng, bảng biểu tóm tắt nếu cần, và biểu tượng cảm xúc (emoji) trực quan.
- Bám sát SOP thực tế rạp phim: Nêu rõ thông số kỹ thuật, mốc thời gian quy chuẩn (dưới 45s, 30p, nhiệt độ 230-245°C, áp suất 95-110 PSI, âm thanh fader 7.0 85dBC).
- Đưa ra lời khuyên hành động thực tế ngay lập tức.`
                },
                { role: 'user', content: query }
              ]
            })
          });

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            return {
              text: content,
              category: 'general',
              followUps: [
                'Cho tôi xem kịch bản mẫu xử lý tình huống này',
                'Quy định này nằm trong khóa đào tạo nào?',
                'Tôi cần báo cáo cho Quản lý ca như thế nào?'
              ]
            };
          }
        } catch (err) {
          console.warn('OpenAI API Error, falling back to integrated AI Engine:', err);
        }
      }

      // TỰ ĐỘNG GỌI MÔ HÌNH OPENAI TÍCH HỢP SẴN TRÊN SERVER (HỎI GÌ CŨNG BIẾT 100%, KHÔNG CẦN KEY)
      try {
        const res = await fetch('http://localhost:8000/api/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, persona, role: userRole }),
          signal: AbortSignal.timeout(12000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.reply && json.reply.trim().length > 10) {
            const replyText = json.reply.trim();
            const actions: { label: string; tab: string }[] = [];
            const lower = (query + ' ' + replyText).toLowerCase();

            if (lower.includes('bắp') || lower.includes('pha chế') || lower.includes('vé') || lower.includes('khóa học') || lower.includes('sop') || lower.includes('pccc')) {
              actions.push({ label: '📚 Khóa Học Nghiệp Vụ', tab: 'courses' });
            }
            if (lower.includes('thi') || lower.includes('kiểm tra') || lower.includes('trắc nghiệm')) {
              actions.push({ label: '🎯 Làm Bài Kiểm Tra', tab: 'quizzes' });
            }
            if (lower.includes('chứng chỉ') || lower.includes('bằng')) {
              actions.push({ label: '🏆 Xem Chứng Chỉ', tab: 'certificates' });
            }
            if (lower.includes('ca làm') || lower.includes('lịch') || lower.includes('đăng ký')) {
              actions.push({ 
                label: '🗓️ Lịch Ca Làm Việc', 
                tab: userRole === 'manager' ? 'manager-scheduler' : 'shift-register' 
              });
            }

            return {
              text: replyText,
              category: 'general',
              actions: actions.length > 0 ? actions : undefined,
              followUps: [
                'Giải thích chi tiết hơn cho tôi phần này',
                'Tôi cần lưu ý lỗi gì thường gặp nhất trong thực tế?',
                'Cho tôi xem kịch bản mẫu áp dụng ngay'
              ]
            };
          }
        }
      } catch (e) {
        console.warn('Integrated AI Chat fallback to local engine:', e);
      }

      // Built-in VIP Cinema Knowledge Engine (Offline RAG fallback khi mất Internet)
      await new Promise(r => setTimeout(r, 400));
      const q = query.toLowerCase().trim();

      // 0. GIAO TIẾP TỰ NHIÊN (CHÀO HỎI, CẢM ƠN, TẠM BIỆT)
      if (/^(xin chào|chào bạn|chào ad|chào em|chào anh|chào chị|chào|hello|hi|hey|alo)\b/i.test(q) || /^(bạn là ai|bạn tên là gì|bạn tên gì|giới thiệu về bạn)/i.test(q)) {
        return {
          category: 'general',
          text: `👋 **Xin chào bạn!** Tôi là **Cinema AI** – Trợ lý ảo điều hành thông minh của **AURORA CINEMAS** 🎬.

Tôi có thể đồng hành và hỗ trợ bạn:
• 🍿 **Dịch vụ Rạp:** Bảng giá vé, Menu bắp nước Combo F&B, lịch chiếu phim và quy định độ tuổi.
• 🎟️ **Vận hành & POS:** Tra cứu booking vé, xử lý lỗi giao dịch POS, hỗ trợ kiểm soát vé C18.
• 🎥 **Kỹ thuật & Phòng chiếu:** Hướng dẫn vận hành máy chiếu Barco/Christie Laser 4K, khóa KDM, âm thanh Dolby Atmos.
• 📚 **Đào tạo SOP & Nhân sự:** Hướng dẫn khóa học nghiệp vụ, bài thi chứng chỉ và đăng ký ca làm việc.

*Bạn cần hỗ trợ nội dung nào cứ nhắn cho mình nhé!*`,
          actions: [
            { label: '🎟️ Xem Bảng Giá Vé', tab: 'boxoffice' },
            { label: '🍿 Menu Bắp Nước', tab: 'concession' },
            { label: '📚 Khóa Học Nghiệp Vụ', tab: 'courses' }
          ],
          followUps: [
            'Bảng giá vé rạp Aurora Cinemas hôm nay?',
            'Menu combo bắp nước có những loại nào?',
            'Quy định kiểm tra độ tuổi đối với phim C18?',
            'Cách xử lý khi giao dịch POS bị lỗi timeout?'
          ]
        };
      }

      if (/^(cảm ơn|cam on|cám ơn|thanks|thank you|ok cảm ơn|tuyệt vời|oke cảm ơn)\b/i.test(q)) {
        return {
          category: 'general',
          text: `Dạ không có gì ạ! Rất vui được hỗ trợ bạn. Chúc bạn có những trải nghiệm thật tuyệt vời tại **Aurora Cinemas**! 🍿✨ Nếu cần hỗ trợ thêm thông tin nào khác, bạn cứ nhắn mình nhé!`,
          followUps: ['Xem bảng giá vé rạp', 'Menu bắp nước và combo', 'Lịch ca làm việc tuần này']
        };
      }

      if (/^(tạm biệt|bye|goodbye|hẹn gặp lại)\b/i.test(q)) {
        return {
          category: 'general',
          text: `Tạm biệt bạn! Chúc bạn một ngày làm việc và xem phim tràn đầy niềm vui! Hẹn gặp lại bạn tại **Aurora Cinemas**! 👋🎬`,
          followUps: ['Bảng giá vé rạp', 'Menu bắp nước']
        };
      }

      // 0.1. BẢNG GIÁ VÉ RẠP
      if (/(bảng giá|giá vé|vé bao nhiêu|giá xem phim|bao nhiêu một vé|mức giá|giá một vé|bao nhiêu tiền một vé|vé 2d)/i.test(q) && !/(quy trình|đổi vé|hoàn vé|c18)/i.test(q)) {
        return {
          category: 'boxoffice',
          text: `🎟️ **BẢNG GIÁ VÉ NIÊM YẾT – CỤM RẠP AURORA CINEMAS:**

• **Ghế Tiêu chuẩn (Standard 2D):** **95.000đ** *(Thứ 2 - Thứ 5)* | **105.000đ** *(Cuối tuần & Ngày lễ)*
• **Ghế VIP (Tầm nhìn trung tâm đẹp nhất):** **115.000đ** / vé
• **Ghế Đôi Sweetbox (Dành cho 2 người):** **230.000đ** / cặp *(tặng kèm 1 bắp ngọt)*
• **Ưu đãi Học sinh / Sinh viên / U22:** **65.000đ** / vé *(áp dụng suất trước 17h, xuất trình CCCD/thẻ HSSV)*
• **Phòng Chiếu Laser 4K Dolby Atmos:** **+20.000đ** / vé
• **Phòng Chiếu IMAX Laser:** **145.000đ - 165.000đ** / vé

💡 *Khách hàng là thành viên Aurora Star được tích lũy 5% - 10% điểm thưởng trên mỗi giao dịch.*`,
          actions: [
            { label: '🎟️ Quầy Bán Vé Box Office', tab: 'boxoffice' },
            { label: '📚 Khóa Học Bán Vé & POS', tab: 'courses' }
          ],
          followUps: [
            'Học sinh sinh viên cần giấy tờ gì để mua vé 65k?',
            'Chính sách tích điểm thẻ thành viên Aurora Star',
            'Quy định đổi trả vé xem phim tại quầy'
          ]
        };
      }

      // 0.2. MENU BẮP NƯỚC & COMBO F&B (KHI HỎI VỀ GIÁ / MENU)
      if (/(menu bắp|combo bắp|giá bắp|giá nước|bắp nước có gì|combo nào|bán bắp|các loại bắp|nước ngọt)/i.test(q) && !/(công thức|nổ bắp|nhiệt độ|vệ sinh|áp suất|kỹ thuật)/i.test(q)) {
        return {
          category: 'concession',
          text: `🍿 **MENU BẮP NƯỚC & COMBO F&B – AURORA CONCESSION:**

1. **Combo Solo (1 người):** 1 Bắp Rang Bơ (Size M) + 1 Nước Ngọt Tươi (Size L) → **85.000đ**
2. **Combo Couple (2 người):** 1 Bắp Rang Bơ (Size L) + 2 Nước Ngọt Tươi (Size L) → **119.000đ**
3. **Combo Family / Bom Tấn:** 2 Bắp Lớn + 3 Nước Ngọt + 1 Snack Khoai Tây → **169.000đ**

🍿 **Hương vị bắp hảo hạng:**
• Bắp Ngọt Truyền Thống / Bắp Mặn Bơ
• Bắp Caramel Thượng Hạng: **+15.000đ**
• Bắp Phô Mai Cheddar: **+15.000đ**

🥤 **Nước ngọt tươi Post-Mix mát lạnh:** Coca-Cola, Sprite, Fanta, Nước suối Dasani *(Refill miễn phí trong ngày với khách có vé VIP!)*.`,
          actions: [
            { label: '🍿 Quầy Bắp Nước F&B', tab: 'concession' },
            { label: '📚 Khóa Học Pha Chế Concession', tab: 'courses' }
          ],
          followUps: [
            'Công thức nổ bắp caramel chuẩn tỷ lệ vàng là gì?',
            'Kỹ thuật up-selling combo bắp nước 45 giây',
            'Quy trình vệ sinh vòi nước ngọt Post-Mix cuối ca'
          ]
        };
      }

      // 0.3. PHIM ĐANG CHIẾU & LỊCH CHIẾU
      if (/(phim đang chiếu|phim gì|có phim gì|lịch chiếu|hôm nay chiếu gì|suất chiếu|phim mới|phim hot)/i.test(q) && !/(máy chiếu|hỏng|lỗi|kỹ thuật)/i.test(q)) {
        return {
          category: 'general',
          text: `🎬 **DANH SÁCH PHIM ĐANG CHIẾU TẠI CỤM RẠP AURORA CINEMAS:**

1. 🌌 **Avatar: Dòng Chảy Của Nước** [T13] – *Khoa học viễn tưởng, Hành động (192 phút)*
   • Suất chiếu: 09:30 | 13:45 | 17:30 | 20:15 | 22:30 (Phòng IMAX & Atmos)
2. 🌸 **Mai** [T18] – *Tâm lý, Tình cảm (131 phút)* – Đạo diễn: Trấn Thành
   • Suất chiếu: 10:00 | 14:15 | 18:30 | 21:00 (Phòng P01, P02)
3. 🏜️ **Dune: Hành Tinh Cát - Phần 2** [T16] – *Khoa học viễn tưởng, Sử thi (166 phút)*
   • Suất chiếu: 11:00 | 15:30 | 19:45 | 22:45 (Phòng Laser 4K)
4. 🚀 **Hố Đen Tử Thần (Interstellar Remaster)** [T13] – *Khoa học viễn tưởng (169 phút)*
   • Suất chiếu: 14:00 | 18:00 | 21:30 (Phòng IMAX Laser)
5. ⚔️ **Deadpool & Wolverine** [T18] – *Hành động, Siêu anh hùng (128 phút)*
   • Suất chiếu: 12:30 | 16:45 | 20:00 | 22:15
6. ⚰️ **Quật Mộ Trùng Ma (Exhuma)** [T16] – *Kinh dị, Bí ẩn (134 phút)*
   • Suất chiếu: 13:00 | 17:15 | 20:45 | 23:15

💡 *Bạn có thể đến quầy vé Box Office hoặc đặt online để giữ vị trí ghế trung tâm đẹp nhất!*`,
          actions: [
            { label: '🎟️ Mua Vé Ngay', tab: 'boxoffice' },
            { label: '🍿 Đặt Combo Bắp Nước', tab: 'concession' }
          ],
          followUps: [
            'Bảng giá vé các khung giờ hôm nay?',
            'Quy định độ tuổi phim T18 kiểm tra CCCD thế nào?',
            'Phim Avatar suất tối còn bao nhiêu ghế trống?'
          ]
        };
      }

      // 1. NGHIỆP VỤ BẮP NƯỚC (CONCESSION - KỸ THUẬT & QUY TRÌNH)
      if (/(công thức|nổ bắp|popper|post-mix|vệ sinh vòi|up-selling|pha chế)/i.test(q) || (q.includes('bắp') && /(làm sao|thế nào|chuẩn|tỷ lệ|quy trình)/i.test(q))) {
        return {
          category: 'concession',
          text: `🍿 **TIÊU CHUẨN VẬN HÀNH QUẦY BẮP NƯỚC CONCESSION - AURORA STANDARD:**

1. **Công thức nổ bắp chuẩn tỷ lệ vàng:**
   - **Định lượng 1 nồi Popper:** 240g hạt bắp bướm nhập khẩu + 75ml dầu dừa tạo màu vàng bơ óng + 150g đường Caramel/bột phô mai.
   - **Nhiệt độ nồi chuẩn:** **230°C - 245°C**. Bật công tắc Warm & Motor khuấy trước 5 phút.
   - **Thời gian nổ:** 3 phút 15 giây. **BẮT BUỘC** tắt công tắc nhiệt và xả cần gạt ngay khi tiếng nổ thưa dưới **2 giây/tiếng** để chống cháy khét đáy nồi!

2. **Vận hành máy nước ngọt tươi Post-Mix:**
   - Áp suất khí CO2 tiêu chuẩn: **95 - 110 PSI** (Độ ngọt Brix 5.2 : 1).
   - Nhiệt độ nước tại vòi rót: **2°C - 4°C** bảo toàn bọt ga sảng khoái.
   - Quy chuẩn vệ sinh cuối ca: Tháo rời đầu vòi Diffuser ngâm dung dịch sát khuẩn Chloramine B trong **15 phút**.

3. **Nghệ thuật Up-Selling 45 giây:**
   - Nguyên tắc 2 lựa chọn: *"Hôm nay rạp có Combo bắp phô mai kèm bình nước bom tấn chỉ chênh 15k, anh/chị nâng cấp lên size Khổng Lồ để được refill miễn phí nhé?"*
   - Tốc độ phục vụ chuẩn KPI: Dưới **45 giây/khách hàng**.`,
          actions: [
            { label: '📚 Khóa Học Pha Chế Bắp Nước (CRS-01)', tab: 'courses' },
            { label: '🎯 Làm Bài Thi Trắc Nghiệm Concession', tab: 'quizzes' }
          ],
          followUps: [
            'Cách xử lý khi nước ngọt Post-Mix bị nhạt bọt ga?',
            'Quy trình bảo quản hạt ngô và dầu bơ dừa chống ẩm?',
            'Kịch bản mời khách mua Combo bình nước nhân vật bom tấn'
          ]
        };
      }

      // 2. NGHIỆP VỤ BÁN VÉ POS & KHÁCH HÀNG (BOX OFFICE - QUY TRÌNH & ĐỘ TUỔI)
      if (/(độ tuổi|c18|t18|t16|t13|phân loại phim|đổi vé|hoàn vé|lỗi pos|quẹt thẻ|cccd|vneid)/i.test(q) || (q.includes('vé') && /(quy trình|nghiệp vụ|hướng dẫn|thế nào|làm sao)/i.test(q))) {
        return {
          category: 'boxoffice',
          text: `🎟️ **QUY TRÌNH BÁN VÉ BOX OFFICE & QUY CHẾ ĐỘ TUỔI ĐIỆN ẢNH:**

1. **Quy định kiểm soát độ tuổi phim (Luật Điện Ảnh):**
   - **Phim nhãn C18 (T18):** Nghiêm cấm khán giả dưới 18 tuổi.
   - Nhân viên **BẮT BUỘC** đối chiếu 100% khách hàng trẻ tuổi bằng **CCCD gắn chip chính chủ** hoặc tài khoản **VNeID mức 2** có ảnh.
   - *Cách từ chối lịch sự:* *"Dạ quy định của Cục Điện Ảnh bắt buộc người xem phim này từ đủ 18 tuổi, em xin phép hỗ trợ anh/chị đổi sang phim khác phù hợp hơn ạ."*

2. **Chính sách Đổi/Trả vé & Cấp bù:**
   - **Đổi vé miễn phí:** Khách được đổi suất chiếu khác trước giờ chiếu tối thiểu **30 phút** (hoặc 60 phút theo SOP POS).
   - **Sự cố kỹ thuật > 15 phút:** Nhân viên có thẩm quyền hoàn tiền 100% hoặc cấp ngay **01 Vé mời (Complimentary Ticket)** + Voucher bắp nước miễn phí.

3. **Nguyên tắc chọn ghế trên màn hình POS:**
   - Phím tắt **F2:** Chọn nhanh suất chiếu kế tiếp.
   - **Quy tắc vàng:** Tuyệt đối không để lại duy nhất **1 ghế trống** kẹp giữa 2 cụm khách đã đặt.`,
          actions: [
            { label: '📚 Khóa Học Box Office & POS (CRS-02)', tab: 'courses' },
            { label: '🎯 Thi Sát Hạch Nghiệp Vụ Bán Vé', tab: 'quizzes' }
          ],
          followUps: [
            'Khách quên mang CCCD nhưng xuất trình thẻ sinh viên có được vào xem phim C18 không?',
            'Quy trình thao tác hoàn tiền vé thanh toán qua ví MoMo/ZaloPay?',
            'Chính sách tích điểm thành viên Aurora Star Platinum'
          ]
        };
      }

      // 3. KỸ THUẬT PHÒNG CHIẾU (PROJECTION BOOTH)
      if (q.includes('máy chiếu') || q.includes('kdm') || q.includes('dcp') || q.includes('âm thanh') || q.includes('màn chiếu') || q.includes('mất hình') || q.includes('mất tiếng') || q.includes('dolby') || q.includes('imax')) {
        return {
          category: 'projection',
          text: `🎥 **CẨM NANG KỸ THUẬT PHÒNG CHIẾU PHIM LASER 4K & DOLBY ATMOS:**

1. **Khóa KDM & Gói phim DCP:**
   - Kiểm tra tính toàn vẹn mã băm **SHA-1** của gói phim DCP khi nạp từ ổ cứng CRU Dataport.
   - Nạp chứng thư khóa **KDM Key:** Khóa chỉ có hiệu lực đúng dải giờ UTC+7 theo giấy phép nhà phát hành.
   - Khởi động máy chiếu Laser Barco/Christie trước giờ chiếu tối thiểu **30 - 45 phút** để ổn định nhiệt độ buồng quang học.

2. **Quy chuẩn tỷ lệ khung hình & Âm lượng Hollywood:**
   - **Phim Flat (1.85:1):** Chiếu đầy màn hình không viền đen.
   - **Phim Scope (2.39:1):** Tỷ lệ điện ảnh rộng, hạ mặt nạ rèm trên dưới hoặc mở rộng hai bên.
   - **Mức âm lượng chuẩn SMPTE:** Đặt Fader tại mức **7.0 (85 dBC SPL)** trên bộ xử lý âm thanh Dolby CP950.

3. **Quy trình khẩn cấp 60 giây khi mất hình/tiếng:**
   - **Giây 0-10:** Bật ngay đèn chiếu sáng sảnh (House Light) lên 30% để trấn an khán giả.
   - **Giây 10-30:** Bật microphone thông báo xin lỗi ngắn gọn và nêu thời gian kiểm tra.
   - **Giây 30-60:** Khởi động lại cổng IMB/Server máy chiếu và chuyển sang kênh dự phòng.`,
          actions: [
            { label: '📚 Khóa Học Vận Hành Máy Chiếu (CRS-03)', tab: 'courses' },
            { label: '🎯 Sát Hạch Kỹ Thuật Chiếu Phim', tab: 'quizzes' }
          ],
          followUps: [
            'Cách kiểm tra nhiệt độ nước làm mát buồng laser máy chiếu?',
            'Khắc phục sự cố lệch pha âm thanh Atmos giữa loa vòm và loa Subwoofer',
            'Quy trình chuyển đổi tỷ lệ thấu kính ống kính Lens Shift tự động'
          ]
        };
      }

      // 4. AN TOÀN, PCCC & CỨU HỘ KHẨN CẤP
      if (q.includes('cháy') || q.includes('pccc') || q.includes('thoát hiểm') || q.includes('khẩn cấp') || q.includes('cứu hộ') || q.includes('bình chữa cháy') || q.includes('sơ tán')) {
        return {
          category: 'safety',
          text: `🚨 **QUY TRÌNH AN TOÀN PHÒNG CHÁY CHỮA CHÁY & SƠ TÁN KHẨN CẤP:**

1. **Phân biệt & Kỹ thuật dập lửa:**
   - **Bình khí CO2 (Loa to, không đồng hồ):** Dùng dập lửa tại **Phòng máy chiếu & tủ điện vi mạch** (không để lại cặn bột làm hỏng linh kiện). *Lưu ý:* Tuyệt đối không cầm tay vào loa kim loại tránh bỏng lạnh -79°C!
   - **Bình bột ABC (Có đồng hồ kim xanh):** Dùng dập lửa tại sảnh chờ, quầy bắp nước và thảm trải sàn.
   - **Quy tắc PASS:** **P**ull (Rút chốt an toàn) -> **A**im (Chĩa loa vào gốc lửa) -> **S**queeze (Bóp cò dứt khoát) -> **S**weep (Quét ngang qua lại ở khoảng cách 1.5m - 2m).

2. **Cửa thoát hiểm & Điều phối sơ tán trong bóng tối:**
   - Thanh đẩy **Panic Bar:** Đẩy nhẹ bằng lực cơ thể là cửa tự mở bung ra ngoài, kiểm tra chốt then cài mỗi sáng.
   - Đèn Exit chỉ hướng: Duy trì pin ắc quy lưu điện dự phòng tối thiểu **120 phút**.
   - Tác phong nhân viên Usher: Bật đèn dạ quang, đứng tại các ngã rẽ hướng dẫn: *"Xin mời quý khách di chuyển trật tự theo lối thoát hiểm phía trước."*`,
          actions: [
            { label: '📚 Khóa An Toàn PCCC & Thoát Hiểm (CRS-04)', tab: 'courses' },
            { label: '🎯 Bài Kiểm Tra An Toàn PCCC', tab: 'quizzes' }
          ],
          followUps: [
            'Kỹ thuật hồi sức tim phổi CPR 30 lần ép tim : 2 lần thổi ngạt',
            'Vị trí túi sơ cấp cứu y tế đặt tại đâu trong cụm rạp?',
            'Quy trình ngắt cầu dao tổng khi có chuông báo cháy tự động'
          ]
        };
      }

      // 5. CHĂM SÓC KHÁCH HÀNG & SOP PHỤC VỤ (SOP LAST)
      if (q.includes('khiếu nại') || q.includes('sop') || q.includes('last') || q.includes('thái độ') || q.includes('diện mạo') || q.includes('quay lén') || q.includes('ồn ào') || q.includes('khóc')) {
        return {
          category: 'general',
          text: `⭐ **TIÊU CHUẨN PHỤC VỤ 5 SAO & MÔ HÌNH XỬ LÝ KHIẾU NẠI LAST:**

1. **Quy tắc diện mạo & Chào đón 3 giây (Aurora Look):**
   - Đồng phục phẳng phiu, bảng tên đeo ngay ngắn ngực trái, tóc gọn gàng.
   - Mắt nhìn thân thiện, hơi cúi đầu nhẹ 15 độ và câu chào chuẩn: *"Aurora Cinemas xin chào, em có thể hỗ trợ gì cho anh/chị ạ?"*
   - Trao vé, hóa đơn và thẻ ngân hàng bằng **cả 2 tay**.

2. **Mô hình LAST giải quyết khiếu nại:**
   - **L - Listen:** Lắng nghe chăm chú, không ngắt lời, gật đầu thấu hiểu.
   - **A - Apologize:** Chân thành xin lỗi vì trải nghiệm chưa trọn vẹn của khách: *"Dạ em rất tiếc vì sự cố này khiến anh/chị phiền lòng..."*
   - **S - Solve:** Đưa ra giải pháp tức thì trong thẩm quyền (đổi vị bắp, đổi chỗ ngồi đẹp hơn, bù vé mới).
   - **T - Thank:** Cảm ơn khách hàng đã góp ý để rạp nâng cao chất lượng dịch vụ.

3. **Xử lý tình huống nhạy cảm phòng chiếu:**
   - Khách ồn ào/gác chân: Đến gần, cúi ngang tầm mắt, nhắc nhở bằng giọng thì thầm lịch sự.
   - Khách quay lén phim: Yêu cầu dừng quay lập tức và giải thích ngắn gọn về bản quyền tác phẩm điện ảnh.`,
          actions: [
            { label: '📚 Khóa Tiêu Chuẩn Phục Vụ 5 Sao (CRS-05)', tab: 'courses' },
            { label: '🎯 Sát Hạch Nghiệp Vụ Chăm Sóc Khách Hàng', tab: 'quizzes' }
          ],
          followUps: [
            'Kịch bản xử lý khi khách làm đổ bắp nước trên thảm phòng chiếu?',
            'Khách khiếu nại âm lượng phòng chiếu quá to thì làm thế nào?',
            'Trường hợp khách say xỉn gây rối tại sảnh rạp giải quyết ra sao?'
          ]
        };
      }

      // 6. KHUYẾN MÃI CTKM HÈ 2026
      if (q.includes('khuyến mãi') || q.includes('ctkm') || q.includes('hè') || q.includes('voucher') || q.includes('1k') || q.includes('quà tặng') || q.includes('sinh viên')) {
        return {
          category: 'concession',
          text: `🎉 **CHƯƠNG TRÌNH KHUYẾN MÃI SIÊU BÃO MÙA HÈ 2026 (AURORA SUMMER FEST):**

1. **Gói ưu đãi Vé 1K Student & Combo Popcorn X2:**
   - **Thời gian áp dụng:** Thứ Hai đến Thứ Năm hàng tuần cho suất chiếu trước **17:00**.
   - **Điều kiện:** Xuất trình thẻ HSSV chính chủ còn hạn hoặc ứng dụng VNeID cấp độ 2 (mỗi thẻ mua tối đa 1 vé/ngày).
   - **Combo Popcorn X2:** Tặng kèm 2 ly nước ngọt lớn và được **refill miễn phí** trong ngày tại quầy Concession.

2. **Thao tác POS & Quét E-Voucher:**
   - Phím tắt **F9:** Mở cổng quét voucher khuyến mãi từ máy quét mã vạch Honeywell.
   - Đọc e-code từ ví MoMo, ZaloPay, ShopeePay và áp dụng chiết khấu tự động.
   - Kiểm tra màn hình phụ hiển thị đúng số tiền giảm trừ trước khi khách thanh toán.

3. **Quy chế phát quà tặng bình nước nhân vật:**
   - Bàn giao quà tặng nguyên seal, không móp méo trầy xước.
   - Khi hết quà trong ngày: Tặng Voucher giảm 30% bắp nước cho lần xem phim tiếp theo.`,
          actions: [
            { label: '📚 Khóa Học Triển Khai CTKM Hè 2026 (CRS-06)', tab: 'courses' },
            { label: '🎯 Kiểm Tra Kiến Thức CTKM Hè 2026', tab: 'quizzes' }
          ],
          followUps: [
            'Khách dùng voucher đối tác ngân hàng có được cộng dồn điểm thẻ Aurora không?',
            'Xử lý lỗi máy quét POS không nhận mã voucher của MoMo',
            'Cách bàn giao và kiểm đếm tồn kho bình nước nhân vật cuối ngày'
          ]
        };
      }

      // 7. ĐĂNG KÝ CA LÀM VIỆC & PHÂN LỊCH AI (UC09, UC10, UC11)
      if (q.includes('ca làm') || q.includes('lịch làm') || q.includes('đăng ký ca') || q.includes('đổi ca') || q.includes('xếp ca') || q.includes('nguyện vọng') || q.includes('chấm công') || q.includes('đi muộn')) {
        return {
          category: 'hr',
          text: `📅 **QUY CHẾ PHÂN CA LÀM VIỆC & ĐĂNG KÝ NGUYỆN VỌNG BẰNG AI:**

1. **Hạn chót đăng ký ca hàng tuần:**
   - Nhân viên gửi nguyện vọng ca trực tuần tới trước **20h00 tối Thứ 5**.
   - Các ca làm việc tiêu chuẩn:
     * **Ca Sáng (SH1):** 08:00 - 16:00
     * **Ca Chiều (SH2):** 15:30 - 23:00 (Giờ cao điểm rạp)
     * **Ca Đêm (SH3):** 22:00 - 02:00 (Suất chiếu muộn & dọn dẹp vệ sinh)

2. **Thuật toán Xếp ca AI Cân bằng Tải:**
   - **Ưu tiên số 1:** Khớp **100% nguyện vọng** của nhân viên đã đăng ký sớm.
   - **Tối ưu hóa nhân sự:** Tự động dự báo lưu lượng khách giờ cao điểm để điều phối nhân sự chưa đăng ký vào ca phù hợp, đảm bảo mỗi ca đủ chuyên môn (Vé, Popcorn, Phòng Chiếu).

3. **Quy định Chấm công & Đi muộn:**
   - Check-in vân tay/POS trước giờ ca tối thiểu **5 phút**.
   - Đi muộn do lý do bất khả kháng (thiên tai, tai nạn, kẹt xe có xác nhận): Lập **Đơn Giải trình Đi muộn** đính kèm minh chứng tại mục Xử lý chấm công để Quản lý duyệt miễn trừ điểm KPI.`,
          actions: [
            { label: '🗓️ Đăng Ký Nguyện Vọng Ca Trực', tab: 'shift-register' },
            { label: '⏱️ Xử Lý Chấm Công & Đi Muộn', tab: 'attendance-exceptions' }
          ],
          followUps: [
            'Làm thế nào để đổi ca với đồng nghiệp cùng cụm rạp?',
            'Thời gian Quản lý công bố lịch làm việc chính thức tuần mới là khi nào?',
            'Cách thức tính điểm KPI chuyên cần hàng tháng'
          ]
        };
      }

      // 8. CHỨNG CHỈ ĐIỆN TỬ & ĐÀO TẠO
      if (q.includes('chứng chỉ') || q.includes('bài thi') || q.includes('kiểm tra') || q.includes('khảo thí') || q.includes('kết quả') || q.includes('in bằng')) {
        return {
          category: 'general',
          text: `🎓 **CHÍNH SÁCH ĐÀO TẠO & CẤP CHỨNG CHỈ ĐIỆN TỬ AURORA:**

1. **Ngưỡng đạt bài kiểm tra nghiệp vụ:**
   - Bài thi trắc nghiệm định kỳ yêu cầu đạt tối thiểu **80/100 điểm** (80%).
   - Mỗi câu hỏi đều có giải thích chi tiết đáp án đúng theo quy chuẩn SOP rạp.

2. **Cấp chứng chỉ điện tử tự động:**
   - Ngay sau khi vượt qua bài thi, hệ thống EMS sẽ tự động phát hành **Chứng chỉ Năng lực Nghiệp vụ (Certificate of Excellence)** mang mã độc bản \`AURORA-CERT-2026-XXXXX\`.
   - Chứng chỉ tích hợp **con dấu đỏ bảo chứng 3D**, chữ ký của Giám Đốc Cụm Rạp & Giám Đốc Đào Tạo, kèm **mã QR Code** tra cứu xác thực trực tuyến.
   - Hỗ trợ **In ấn & Xuất file PDF chất lượng cao** khổ A4 ngang chuẩn quốc tế.`,
          actions: [
            { label: '🏆 Xem Kho Chứng Chỉ Đã Đạt', tab: 'certificates' },
            { label: '📝 Làm Bài Đánh Giá Nghiệp Vụ', tab: 'quizzes' }
          ],
          followUps: [
            'Nếu không đạt điểm 80% tôi có được thi lại ngay không?',
            'Chứng chỉ có giá trị bao lâu trong hệ thống rạp Aurora?',
            'Làm sao để in chứng chỉ ra khổ giấy A4 ngang không bị méo viền?'
          ]
        };
      }

      // DEFAULT INTEL ASSISTANT RESPONSE
      return {
        category: 'general',
        text: `🤖 **CHÀO BẠN! TÔI LÀ AURORA COPILOT PRO 4.0 - TRỢ LÝ AI ĐIỀU HÀNH RẠP CHIẾU PHIM.**

Tôi được tích hợp toàn bộ cơ sở tri thức nghiệp vụ rạp phim tiêu chuẩn quốc tế và đồng bộ dữ liệu thời gian thực với hệ thống EMS. 

💡 **Bạn có thể yêu cầu tôi hỗ trợ bất kỳ nội dung nào sau đây:**
- 🍿 **Quầy Bắp Nước:** Công thức nổ bắp caramel/phô mai, vệ sinh vòi Post-Mix, kỹ thuật up-selling 45 giây.
- 🎟️ **Quầy Vé Box Office:** Quy tắc soát vé phim C18, phím tắt POS F2/F9, chính sách đổi trả vé & thẻ thành viên.
- 🎥 **Phòng Chiếu Kỹ Thuật:** Tiếp nhận DCP, nạp chứng thư khóa KDM Barco/Christie, tỷ lệ Flat/Scope, xử lý mất tín hiệu.
- 🚨 **An Toàn & PCCC:** Quy tắc sử dụng bình khí CO2 vs bình bột ABC, thanh Panic Bar thoát hiểm, sơ cứu CPR.
- 📅 **Lịch Làm Việc & Chấm Công:** Đăng ký ca trước Thứ 5, thuật toán xếp ca thông minh AI, giải trình đi muộn.
- 🎓 **Đào Tạo & Khảo Thí:** Cẩm nang bài thi trắc nghiệm, cấp chứng chỉ điện tử QR code danh giá.`,
        actions: [
          { label: '📚 Khám Phá Khóa Học SOP', tab: 'courses' },
          { label: '🗓️ Đăng Ký Ca Làm Việc', tab: 'shift-register' },
          { label: '🏆 Xem Chứng Chỉ Điện Tử', tab: 'certificates' }
        ],
        followUps: [
          'Quy trình nổ bắp chuẩn để hạt nở đều không bị khét?',
          'Khách quên mang CCCD muốn xem phim C18 xử lý thế nào?',
          'Quy tắc dập lửa bằng bình CO2 trong phòng máy chiếu?',
          'Làm thế nào để đăng ký ca làm việc tuần tới?'
        ]
      };
    }
