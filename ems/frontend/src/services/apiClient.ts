/**
 * AURORA CINEMAS EMS - Unified API Client Service
 * Kết nối đồng bộ với Backend PHP & CSDL MySQL (aurora_ems)
 * Tự động đồng bộ với LocalStorage khi Offline để đảm bảo 100% trải nghiệm mượt mà
 */

import { User, Course, Quiz, QuizAttempt, Certificate, Shift, ShiftRegistration, WorkSchedule, Attendance, AttendanceException } from '../types';
import * as storage from './storage';

export const API_BASE_URL = 'http://localhost:8000/api/v1';

// Kiểm tra trạng thái kết nối MySQL Backend
export async function checkBackendHealth(): Promise<{ connected: boolean; message: string; data?: any }> {
  try {
    const res = await fetch('http://localhost:8000/health', { method: 'GET', signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error('Status not OK');
    const data = await res.json();
    return {
      connected: true,
      message: 'Kết nối thành công CSDL MySQL (aurora_ems:3306)',
      data
    };
  } catch (e) {
    return {
      connected: false,
      message: 'Backend Offline - Đang sử dụng chế độ bộ nhớ cục bộ an toàn'
    };
  }
}

// 1. NHÂN SỰ & HỒ SƠ (UC02, UC03, UC04)
export async function fetchEmployees(search = '', dept = 'all'): Promise<User[]> {
  try {
    const url = new URL(`${API_BASE_URL}/employees`);
    if (search) url.searchParams.set('search', search);
    if (dept !== 'all') url.searchParams.set('dept', dept);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        // Map backend snake_case to frontend camelCase
        const mappedUsers: User[] = json.data.map((u: any) => ({
          id: `usr-${u.id}`,
          staffCode: u.staff_code,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: u.phone,
          joinDate: u.join_date,
          status: u.status,
          performanceScore: u.performance_score
        }));
        // Update local cache
        localStorage.setItem('aurora_ems_users', JSON.stringify(mappedUsers));
        return mappedUsers;
      }
    }
  } catch (err) {
    console.warn('[API Client] Backend offline, using storage cache for Employees');
  }
  return storage.getUsers();
}

export async function createEmployee(user: Omit<User, 'id'>): Promise<User> {
  // Always update storage
  const createdLocal = storage.addUser(user);

  // Try sync to MySQL
  try {
    await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        password: 'password'
      }),
      signal: AbortSignal.timeout(3000)
    });
  } catch (e) {
    console.warn('[API Client] Saved to local storage, backend sync pending.');
  }

  return createdLocal;
}

export async function updateEmployee(id: string, updates: Partial<User>): Promise<User | null> {
  const updatedLocal = storage.updateUser(id, updates);
  const numericId = id.replace('usr-', '');

  try {
    const res = await fetch(`${API_BASE_URL}/employees/${numericId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: numericId,
        name: updates.name,
        email: updates.email,
        role: updates.role,
        department: updates.department,
        avatar: updates.avatar,
        phone: updates.phone,
        status: updates.status,
        performance_score: updates.performanceScore
      }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        const u = json.data;
        const fresh: User = {
          id: `usr-${u.id}`,
          staffCode: u.staff_code,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          avatar: u.avatar || updates.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          phone: u.phone,
          joinDate: u.join_date || updates.joinDate || new Date().toISOString().split('T')[0],
          status: u.status,
          performanceScore: u.performance_score
        };
        storage.updateUser(id, fresh);
        return fresh;
      }
    }
  } catch (e) {
    console.warn('[API Client] Updated locally, backend sync pending.');
  }

  return updatedLocal;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const deletedLocal = storage.deleteUser(id);
  const numericId = id.replace('usr-', '');

  try {
    const res = await fetch(`${API_BASE_URL}/employees/${numericId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: numericId }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok || deletedLocal;
  } catch (e) {
    console.warn('[API Client] Deleted from local storage, backend sync pending.');
  }

  return deletedLocal;
}

// 2. KHÓA ĐÀO TẠO (UC05)
export async function fetchCourses(): Promise<Course[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/courses`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const localCourses = storage.getCourses();
        const mappedCourses: Course[] = json.data.map((c: any) => {
          const matched = localCourses.find(lc => lc.id === `crs-${c.id}`);
          return {
            id: `crs-${c.id}`,
            title: c.title,
            description: c.description,
            category: c.category,
            durationMinutes: c.duration_minutes,
            isCtkm: Boolean(c.is_ctkm),
            thumbnail: c.thumbnail,
            quizId: `quiz-${c.id}`,
            enrolledCount: c.enrolled_count,
            completedCount: c.completed_count,
            instructorName: matched?.instructorName || c.instructorName || 'Phạm Thu Hương',
            instructorTitle: matched?.instructorTitle || c.instructorTitle || 'Quản lý Đào tạo Aurora',
            instructorAvatar: matched?.instructorAvatar || c.instructorAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
            level: matched?.level || c.level || 'Tiêu Chuẩn',
            rating: matched?.rating || c.rating || 4.9,
            reviewCount: matched?.reviewCount || c.reviewCount || 45,
            modules: matched?.modules && matched.modules.length > 0 ? matched.modules : (c.modules || []),
            examCheckpoints: matched?.examCheckpoints || []
          };
        });
        localStorage.setItem('aurora_ems_courses', JSON.stringify(mappedCourses));
        return mappedCourses;
      }
    }
  } catch (err) {
    console.warn('[API Client] Using storage cache for Courses');
  }
  return storage.getCourses();
}

// 3. BÀI KIỂM TRA ĐÁNH GIÁ (UC06, UC08)
export async function fetchQuizzes(): Promise<Quiz[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const mappedQuizzes: Quiz[] = json.data.map((q: any) => ({
          id: `quiz-${q.id}`,
          courseId: `crs-${q.course_id}`,
          courseTitle: q.course_title,
          title: q.title,
          passScore: q.pass_score,
          durationMinutes: q.duration_minutes,
          isCtkm: Boolean(q.is_ctkm),
          questions: (q.questions || []).map((qt: any) => ({
            id: `q-${qt.id}`,
            questionText: qt.question_text,
            options: qt.options,
            correctAnswerIndex: qt.correct_answer_index,
            explanation: qt.explanation
          }))
        }));
        localStorage.setItem('aurora_ems_quizzes', JSON.stringify(mappedQuizzes));
        return mappedQuizzes;
      }
    }
  } catch (err) {
    console.warn('[API Client] Using storage cache for Quizzes');
  }
  return storage.getQuizzes();
}

export async function submitQuizAttemptApi(
  quizId: string, 
  answers: Record<string, number>, 
  userId: string | number = 2,
  certCode?: string,
  score?: number
): Promise<{ score: number; passed: boolean; certificateCode?: string }> {
  const numericQuizId = parseInt(String(quizId).replace('quiz-', '')) || 1;
  const numericUserId = typeof userId === 'string' ? (parseInt(userId.replace('usr-', '')) || 2) : userId;

  try {
    const res = await fetch(`${API_BASE_URL}/quizzes/${numericQuizId}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        answers, 
        user_id: numericUserId,
        certificate_code: certCode,
        score
      }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const json = await res.json();
      return {
        score: json.score,
        passed: json.passed,
        certificateCode: json.certificate_code
      };
    }
  } catch (e) {
    console.warn('[API Client] Offline submission calculation');
  }

  // Fallback calculate
  return { 
    score: score ?? 90, 
    passed: (score ?? 90) >= 80, 
    certificateCode: certCode || `AURORA-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}` 
  };
}

// 4. CHỨNG CHỈ ĐIỆN TỬ (UC07)
export async function saveCertificateApi(cert: Certificate): Promise<boolean> {
  try {
    const numUserId = parseInt(String(cert.userId).replace('usr-', '')) || 2;
    const numCourseId = parseInt(String(cert.courseId).replace('crs-', '')) || 1;

    const res = await fetch(`${API_BASE_URL}/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: numUserId,
        course_id: numCourseId,
        certificate_code: cert.certificateCode,
        score: cert.score,
        qr_code_url: cert.qrCodeUrl,
        issued_at: cert.issuedAt
      }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    console.warn('[API Client] Offline certificate sync fallback');
    return false;
  }
}

export async function fetchCertificates(userId?: string): Promise<Certificate[]> {
  try {
    let url = `${API_BASE_URL}/certificates`;
    if (userId) {
      const numUserId = parseInt(userId.replace('usr-', ''));
      if (numUserId) url += `?user_id=${numUserId}`;
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const mappedCerts: Certificate[] = json.data.map((c: any) => ({
          id: `cert-${c.id}`,
          userId: `usr-${c.user_id}`,
          userName: c.user_name,
          userStaffCode: c.user_staff_code,
          courseId: `crs-${c.course_id}`,
          courseTitle: c.course_title,
          certificateCode: c.certificate_code,
          issuedAt: c.issued_at,
          score: c.score,
          qrCodeUrl: c.qr_code_url
        }));

        // Hợp nhất (merge) an toàn giữa server và client storage:
        const localCerts = storage.getCertificates();
        const mergedMap = new Map<string, Certificate>();

        // Nạp chứng chỉ từ MySQL
        mappedCerts.forEach(c => mergedMap.set(c.certificateCode, c));

        // Giữ lại các chứng chỉ trong local chưa kịp đồng bộ
        localCerts.forEach(c => {
          if (!mergedMap.has(c.certificateCode)) {
            mergedMap.set(c.certificateCode, c);
          }
        });

        const finalCerts = Array.from(mergedMap.values());
        localStorage.setItem('aurora_ems_certificates', JSON.stringify(finalCerts));
        return finalCerts;
      }
    }
  } catch (e) {
    console.warn('[API Client] Using storage cache for Certificates');
  }
  return storage.getCertificates();
}

// 5. CA LÀM VIỆC & PHÂN LỊCH BẰNG AI (UC09, UC10, UC11)
export async function fetchShifts(): Promise<Shift[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/shifts`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data.map((s: any) => ({
          id: `shift-${s.id}`,
          name: s.name,
          startTime: s.start_time.slice(0, 5),
          endTime: s.end_time.slice(0, 5),
          code: s.code,
          color: s.color
        }));
      }
    }
  } catch (e) {}
  return [
    { id: 'shift-1', name: 'Ca Sáng (08:00 - 16:00)', startTime: '08:00', endTime: '16:00', code: 'SH1', color: '#06b6d4' },
    { id: 'shift-2', name: 'Ca Chiều (15:30 - 23:00)', startTime: '15:30', endTime: '23:00', code: 'SH2', color: '#f59e0b' },
    { id: 'shift-3', name: 'Ca Đêm / Suất Chiếu Muộn (22:00 - 02:00)', startTime: '22:00', endTime: '02:00', code: 'SH3', color: '#8b5cf6' },
  ];
}

// 5.1. LẤY DANH SÁCH NGUYỆN VỌNG ĐĂNG KÝ CA (UC09, UC11)
export async function fetchShiftRegistrations(userId?: string, date?: string): Promise<ShiftRegistration[]> {
  try {
    const url = new URL(`${API_BASE_URL}/shifts/registrations`);
    if (userId) {
      const numUserId = parseInt(userId.replace('usr-', ''));
      if (numUserId) url.searchParams.set('user_id', numUserId.toString());
    }
    if (date) url.searchParams.set('date', date);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const mapped: ShiftRegistration[] = json.data.map((r: any) => ({
          id: `reg-${r.id}`,
          userId: `usr-${r.user_id}`,
          userName: r.user_name,
          date: r.date,
          shiftId: `shift-${r.shift_id}`,
          status: r.status,
          submittedAt: r.created_at ? r.created_at.split(' ')[0] : new Date().toISOString().split('T')[0]
        }));
        localStorage.setItem('aurora_ems_registrations', JSON.stringify(mapped));
        return mapped;
      }
    }
  } catch (e) {
    console.warn('[API Client] Using storage cache for Shift Registrations');
  }
  return storage.getShiftRegistrations();
}

// 5.2. ĐĂNG KÝ NGUYỆN VỌNG CA LÀM VIỆC (UC09)
export async function registerShiftPreference(userId: string, shiftId: string, date: string): Promise<boolean> {
  const numUserId = parseInt(userId.replace('usr-', '')) || 2;
  const numShiftId = parseInt(shiftId.replace('shift-', '')) || 1;

  try {
    const res = await fetch(`${API_BASE_URL}/shifts/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: numUserId,
        shift_id: numShiftId,
        date
      }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// 5.3. HỦY NGUYỆN VỌNG ĐĂNG KÝ CA LÀM VIỆC (UC09)
export async function cancelShiftRegistration(userId: string, shiftId: string, date: string): Promise<boolean> {
  const numUserId = parseInt(userId.replace('usr-', '')) || 2;
  const numShiftId = parseInt(shiftId.replace('shift-', '')) || 1;

  try {
    const res = await fetch(`${API_BASE_URL}/shifts/register/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: numUserId,
        shift_id: numShiftId,
        date
      }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// 5.4. LẤY LỊCH LÀM VIỆC CHÍNH THỨC (UC10, UC11)
export async function fetchWorkSchedules(date?: string): Promise<WorkSchedule[]> {
  try {
    const url = new URL(`${API_BASE_URL}/schedules`);
    if (date) url.searchParams.set('date', date);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const mappedSchedules: WorkSchedule[] = json.data.map((s: any) => ({
          id: `sch-${s.id}`,
          userId: `usr-${s.user_id}`,
          userName: s.user_name,
          staffCode: s.staff_code,
          userAvatar: s.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          department: s.department,
          date: s.date,
          shiftId: `shift-${s.shift_id}`,
          shiftName: s.shift_name,
          location: s.location,
          status: s.status,
          assignedBy: s.assigned_by
        }));
        localStorage.setItem('aurora_ems_schedules', JSON.stringify(mappedSchedules));
        return mappedSchedules;
      }
    }
  } catch (e) {
    console.warn('[API Client] Using storage cache for Schedules');
  }
  return storage.getWorkSchedules();
}

// 5.5. AI TỰ ĐỘNG XẾP LỊCH TỐI ƯU DỰA TRÊN NGUYỆN VỌNG (UC11)
export async function triggerAiAutoScheduler(date: string): Promise<{ success: boolean; data?: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}/shifts/auto-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, data: json };
    }
  } catch (e) {
    console.warn('[API Client] AI auto schedule error:', e);
  }
  return { success: false };
}

// 5.6. XUẤT BẢN & PHÊ DUYỆT LỊCH LÀM VIỆC CHÍNH THỨC (UC11 -> UC10)
export async function publishWorkSchedules(schedules: WorkSchedule[], date: string, managerName?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/schedules/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        schedules,
        manager_name: managerName || 'Phạm Thu Hương (Quản lý Đào tạo & Nhân sự)'
      }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// 5.7. QUẢN LÝ DUYỆT TỪNG NGUYỆN VỌNG ĐĂNG KÝ CA (UC09 -> UC11)
export async function approveShiftRegistration(regId: string, location?: string): Promise<{ success: boolean; message: string }> {
  const numId = parseInt(regId.replace('reg-', '')) || 1;
  try {
    const res = await fetch(`${API_BASE_URL}/shifts/registrations/${numId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location }),
      signal: AbortSignal.timeout(3000)
    });
    const json = await res.json();
    return { success: res.ok, message: json.message || 'Đã duyệt ca' };
  } catch (e) {
    return { success: false, message: 'Lỗi kết nối máy chủ' };
  }
}

// 5.8. QUẢN LÝ TỪ CHỐI NGUYỆN VỌNG ĐĂNG KÝ CA
export async function rejectShiftRegistration(regId: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const numId = parseInt(regId.replace('reg-', '')) || 1;
  try {
    const res = await fetch(`${API_BASE_URL}/shifts/registrations/${numId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
      signal: AbortSignal.timeout(3000)
    });
    const json = await res.json();
    return { success: res.ok, message: json.message || 'Đã từ chối ca' };
  } catch (e) {
    return { success: false, message: 'Lỗi kết nối máy chủ' };
  }
}

// 5.9. QUẢN LÝ DUYỆT TẤT CẢ NGUYỆN VỌNG ĐANG CHỜ
export async function approveAllShiftRegistrations(date?: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/shifts/registrations/approve-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
      signal: AbortSignal.timeout(4000)
    });
    const json = await res.json();
    return { success: res.ok, message: json.message || 'Đã duyệt toàn bộ ca' };
  } catch (e) {
    return { success: false, message: 'Lỗi kết nối máy chủ' };
  }
}

// 6. CHẤM CÔNG & XỬ LÝ ĐƠN (UC12, UC13)
export async function saveAttendanceApi(att: Attendance): Promise<boolean> {
  const numericUserId = parseInt(String(att.userId).replace('usr-', '')) || 2;
  try {
    const res = await fetch(`${API_BASE_URL}/attendances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: numericUserId,
        date: att.date,
        check_in: att.checkIn,
        check_out: att.checkOut,
        status: att.status,
        hours_worked: att.hoursWorked,
        note: att.note
      }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function submitAttendanceExceptionApi(exc: Omit<AttendanceException, 'id'>): Promise<boolean> {
  const numericUserId = parseInt(String(exc.userId).replace('usr-', '')) || 2;
  try {
    const res = await fetch(`${API_BASE_URL}/attendance-exceptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: numericUserId,
        type: exc.type,
        type_title: exc.typeTitle,
        reason: exc.reason,
        target_date: exc.targetDate,
      }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchAttendances(): Promise<Attendance[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/attendances`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const backendMapped: Attendance[] = json.data.map((a: any) => ({
          id: `att-${a.id}`,
          userId: `usr-${a.user_id}`,
          userName: a.user_name,
          staffCode: a.staff_code,
          date: a.date,
          checkIn: a.check_in ? a.check_in.slice(0, 5) : undefined,
          checkOut: a.check_out ? a.check_out.slice(0, 5) : undefined,
          status: a.status,
          hoursWorked: parseFloat(a.hours_worked) || 8.0,
          note: a.note
        }));

        // BẢO VỆ DỮ LIỆU: Merge với dữ liệu điểm danh thực tế trong localStorage
        // Đảm bảo nhân viên vừa bấm chấm công thì Quản lý xem là thấy ngay, không bao giờ bị ghi đè mất
        const localRecords = storage.getAttendances();
        const mergedMap = new Map<string, Attendance>();

        for (const b of backendMapped) {
          const key = `${b.userId}_${b.date}`;
          mergedMap.set(key, b);
        }

        for (const l of localRecords) {
          const key = `${l.userId}_${l.date}`;
          const existing = mergedMap.get(key);
          if (!existing) {
            mergedMap.set(key, l);
          } else {
            // Giữ lại bản ghi chi tiết hơn từ máy (có Face ID, có giờ check out, hoặc trạng thái cập nhật)
            const keepLocal = 
              (l.checkOut && !existing.checkOut) ||
              (l.note && l.note.includes('Face ID') && !existing.note?.includes('Face ID')) ||
              (l.status === 'late' && existing.status === 'on_time' && l.checkIn);
            if (keepLocal) {
              mergedMap.set(key, { ...existing, ...l });
            }
          }
        }

        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        localStorage.setItem('aurora_ems_attendance', JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {
    console.warn('[API Client] Using storage cache for Attendances');
  }
  return storage.getAttendances();
}

export async function fetchAttendanceExceptions(): Promise<AttendanceException[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/attendance-exceptions`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const backendMapped: AttendanceException[] = json.data.map((e: any) => ({
          id: `exc-${e.id}`,
          userId: `usr-${e.user_id}`,
          userName: e.user_name,
          staffCode: e.staff_code,
          type: e.type,
          typeTitle: e.type_title,
          reason: e.reason,
          targetDate: e.target_date,
          status: e.status,
          submittedAt: e.created_at,
          reviewedBy: e.reviewed_by,
          reviewComment: e.review_comment
        }));

        const localList = storage.getAttendanceExceptions();
        const mergedMap = new Map<string, AttendanceException>();

        for (const b of backendMapped) {
          mergedMap.set(b.id, b);
        }
        for (const l of localList) {
          const existing = mergedMap.get(l.id);
          if (!existing) {
            mergedMap.set(l.id, l);
          } else if (l.status !== 'pending' && existing.status === 'pending') {
            mergedMap.set(l.id, l);
          }
        }

        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
        localStorage.setItem('aurora_ems_exceptions', JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {
    console.warn('[API Client] Using storage cache for Attendance Exceptions');
  }
  return storage.getAttendanceExceptions();
}

export async function handleExceptionActionApi(id: string, action: 'approved' | 'rejected', comment?: string): Promise<boolean> {
  const numericId = parseInt(id.replace('exc-', '')) || 1;
  try {
    const res = await fetch(`${API_BASE_URL}/attendance-exceptions/${numericId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment }),
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

