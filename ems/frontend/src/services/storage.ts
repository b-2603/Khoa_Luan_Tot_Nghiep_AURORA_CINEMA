import { User, Department, Course, Quiz, QuizAttempt, Certificate, ShiftRegistration, WorkSchedule, Attendance, AttendanceException } from '../types';
import { INITIAL_USERS, INITIAL_COURSES, INITIAL_QUIZZES, INITIAL_CERTIFICATES, INITIAL_ATTENDANCE, INITIAL_EXCEPTIONS } from './mockData';
import { getTodayDateString, getTomorrowDateString } from '../utils/dateUtils';

const KEYS = {
  CURRENT_USER: 'aurora_ems_current_user',
  USERS: 'aurora_ems_users',
  COURSES: 'aurora_ems_courses',
  QUIZZES: 'aurora_ems_quizzes',
  ATTEMPTS: 'aurora_ems_attempts',
  CERTIFICATES: 'aurora_ems_certificates',
  REGISTRATIONS: 'aurora_ems_registrations',
  SCHEDULES: 'aurora_ems_schedules',
  ATTENDANCE: 'aurora_ems_attendance',
  EXCEPTIONS: 'aurora_ems_exceptions',
  SHIFT_REMINDERS: 'aurora_ems_shift_reminders',
  INTERNAL_CHAT: 'aurora_ems_internal_chat',
};

function getItem<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setItem<T>(key: string, val: T): void {
  localStorage.setItem(key, JSON.stringify(val));
}

// Current User Session
export function getCurrentUser(): User | null {
  try {
    const item = localStorage.getItem(KEYS.CURRENT_USER);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    setItem(KEYS.CURRENT_USER, user);
  } else {
    localStorage.removeItem(KEYS.CURRENT_USER);
  }
}

export function logoutUser(): void {
  localStorage.removeItem(KEYS.CURRENT_USER);
}

export function initializeStorage() {
  try {
    const existingUsers = getItem<User[]>(KEYS.USERS, []);
    if (!localStorage.getItem(KEYS.USERS) || existingUsers.length === 0) {
      setItem(KEYS.USERS, INITIAL_USERS);
    } else {
      // Chuẩn hóa bộ phận cũ về 4 nghiệp vụ chi nhánh rạp chuẩn
      const normalizeBranchDept = (dept?: string): Department => {
        if (!dept) return 'Box ticket';
        const d = dept.toLowerCase();
        if (d.includes('vé') || d.includes('box') || d.includes('ticket')) return 'Box ticket';
        if (d.includes('bắp') || d.includes('concession') || d.includes('nước')) return 'Concession';
        if (d.includes('dọn') || d.includes('soát') || d.includes('usher') || d.includes('kỹ thuật')) return 'Usher';
        if (d.includes('chế biến') || d.includes('processing') || d.includes('bếp')) return 'Processing';
        if (d.includes('quản lý') || d.includes('manager') || d.includes('nhân sự')) return 'Quản lý Đào tạo & Nhân sự';
        return dept as Department;
      };

      // Luôn bảo đảm tất cả mã nhân viên (staffCode) là số điện thoại (phone)
      const migratedUsers = existingUsers
        .filter(u => u.staffCode !== 'khach_hang_01' && !u.staffCode?.toLowerCase().includes('khach'))
        .map(u => ({
          ...u,
          staffCode: (u.phone && u.phone.trim()) ? u.phone.trim() : (u.staffCode && !u.staffCode.startsWith('AR-') ? u.staffCode : '0901234567'),
          department: normalizeBranchDept(u.department)
        }));
      setItem(KEYS.USERS, migratedUsers);
    }

    // Đồng bộ phiên đăng nhập hiện tại nếu đang lưu mã cũ AR-
    const current = getCurrentUser();
    if (current) {
      const updatedStaffCode = (current.phone && current.phone.trim()) 
        ? current.phone.trim() 
        : (current.staffCode && !current.staffCode.startsWith('AR-') ? current.staffCode : '0395852972');
      if (current.staffCode !== updatedStaffCode) {
        current.staffCode = updatedStaffCode;
        setItem(KEYS.CURRENT_USER, current);
      }
    }
    
    // Đồng bộ nâng cấp toàn diện 8 khóa học chuẩn rạp phim kèm 30 checkpoints sát hạch
    const existingCourses = getItem<Course[]>(KEYS.COURSES, []);
    if (!existingCourses || existingCourses.length < 8 || !existingCourses[0]?.examCheckpoints || existingCourses[0]?.modules?.[0]?.contentUrl !== 'https://www.youtube.com/embed/iPAfLiNepws' || existingCourses.some(c => !c.examCheckpoints || c.examCheckpoints.length < 30)) {
      setItem(KEYS.COURSES, INITIAL_COURSES);
    }

    // Đồng bộ 8 bộ đề thi nghiệp vụ toàn diện (mỗi đề 30 câu hỏi chuẩn rạp)
    const existingQuizzes = getItem<Quiz[]>(KEYS.QUIZZES, []);
    if (!existingQuizzes || existingQuizzes.length < 8 || existingQuizzes.some(q => !q.questions || q.questions.length < 30)) {
      setItem(KEYS.QUIZZES, INITIAL_QUIZZES);
    }

    // Đồng bộ chứng chỉ: Tất cả mã nhân sự trên chứng chỉ đều chuyển sang số điện thoại
    const existingCerts = getItem<Certificate[]>(KEYS.CERTIFICATES, []);
    if (!existingCerts || existingCerts.length === 0) {
      setItem(KEYS.CERTIFICATES, INITIAL_CERTIFICATES);
    } else {
      const allUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
      const phoneMap = new Map<string, string>();
      allUsers.forEach(u => {
        if (u.phone) {
          phoneMap.set(u.id, u.phone);
          phoneMap.set(u.name.toLowerCase().trim(), u.phone);
        }
      });

      const migratedCerts = existingCerts.map(c => {
        let phone = phoneMap.get(c.userId) || phoneMap.get(c.userName.toLowerCase().trim());
        if (!phone && c.userStaffCode && !c.userStaffCode.startsWith('AR-')) {
          phone = c.userStaffCode;
        }
        return {
          ...c,
          userStaffCode: phone || current?.phone || '0395852972'
        };
      });
      setItem(KEYS.CERTIFICATES, migratedCerts);
    }

    if (!localStorage.getItem(KEYS.ATTENDANCE)) {
      setItem(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    } else {
      const list = getItem<Attendance[]>(KEYS.ATTENDANCE, []);
      const allUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
      const phoneMap = new Map<string, string>();
      allUsers.forEach(u => { if (u.phone) { phoneMap.set(u.id, u.phone); phoneMap.set(u.name, u.phone); } });
      const migrated = list.map(a => ({
        ...a,
        staffCode: phoneMap.get(a.userId) || phoneMap.get(a.userName) || (!a.staffCode?.startsWith('AR-') ? a.staffCode : '0901234567')
      }));
      setItem(KEYS.ATTENDANCE, migrated);
    }

    if (!localStorage.getItem(KEYS.EXCEPTIONS)) {
      setItem(KEYS.EXCEPTIONS, INITIAL_EXCEPTIONS);
    } else {
      const list = getItem<AttendanceException[]>(KEYS.EXCEPTIONS, []);
      const allUsers = getItem<User[]>(KEYS.USERS, INITIAL_USERS);
      const phoneMap = new Map<string, string>();
      allUsers.forEach(u => { if (u.phone) { phoneMap.set(u.id, u.phone); phoneMap.set(u.name, u.phone); } });
      const migrated = list.map(e => ({
        ...e,
        staffCode: phoneMap.get(e.userId) || phoneMap.get(e.userName) || (!e.staffCode?.startsWith('AR-') ? e.staffCode : '0912345678')
      }));
      setItem(KEYS.EXCEPTIONS, migrated);
    }

    // Tự động làm mới cache nếu đang chứa ngày tháng 9 cũ
    const cachedRegs = getItem<ShiftRegistration[]>(KEYS.REGISTRATIONS, []);
    if (cachedRegs.length > 0 && cachedRegs.every(r => r.date.startsWith('2026-09'))) {
      localStorage.removeItem(KEYS.REGISTRATIONS);
      localStorage.removeItem(KEYS.SCHEDULES);
    }
  } catch (err) {
    console.warn('[Storage] Initialize notice:', err);
  }
}

try {
  initializeStorage();
} catch (e) {
  console.warn('[Storage] InitializeStorage safe call notice:', e);
}

// Users Management (UC03, UC04)
export const getUsers = (): User[] => getItem<User[]>(KEYS.USERS, INITIAL_USERS);
export const addUser = (newUser: Omit<User, 'id'>): User => {
  const users = getUsers();
  const phone = newUser.phone?.trim() || '';
  const finalStaffCode = phone || (newUser.staffCode && !newUser.staffCode.startsWith('AR-') ? newUser.staffCode : '0901234567');
  const created: User = {
    ...newUser,
    staffCode: finalStaffCode,
    phone: phone || finalStaffCode,
    id: `usr-${Date.now()}`
  };
  users.push(created);
  setItem(KEYS.USERS, users);
  return created;
};

export const updateUser = (id: string, updates: Partial<User>): User | null => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  const phone = updates.phone?.trim();
  const safeUpdates = {
    ...updates,
    ...(phone ? { phone, staffCode: phone } : {})
  };
  const updated = { ...users[index], ...safeUpdates };
  users[index] = updated;
  setItem(KEYS.USERS, users);

  const current = getCurrentUser();
  if (current && current.id === id) {
    setCurrentUser(updated);
  }
  return updated;
};

export const deleteUser = (id: string): boolean => {
  const users = getUsers();
  const nextUsers = users.filter(u => u.id !== id);
  if (nextUsers.length === users.length) return false;
  setItem(KEYS.USERS, nextUsers);
  return true;
};

// Courses (UC05)
export const getCourses = (): Course[] => getItem<Course[]>(KEYS.COURSES, INITIAL_COURSES);
export const saveCourse = (course: Course): void => {
  const courses = getCourses();
  const idx = courses.findIndex(c => c.id === course.id);
  if (idx >= 0) courses[idx] = course;
  else courses.push(course);
  setItem(KEYS.COURSES, courses);
};

export const deleteCourse = (id: string): boolean => {
  const courses = getCourses();
  const next = courses.filter(c => c.id !== id);
  if (next.length === courses.length) return false;
  setItem(KEYS.COURSES, next);
  return true;
};

// Quizzes (UC06, UC08)
export const getQuizzes = (): Quiz[] => getItem<Quiz[]>(KEYS.QUIZZES, INITIAL_QUIZZES);
export const saveQuiz = (quiz: Quiz): void => {
  const quizzes = getQuizzes();
  const idx = quizzes.findIndex(q => q.id === quiz.id);
  if (idx >= 0) quizzes[idx] = quiz;
  else quizzes.push(quiz);
  setItem(KEYS.QUIZZES, quizzes);
};

// Quiz Attempts & Certificates (UC06, UC07)
export const getQuizAttempts = (): QuizAttempt[] => getItem<QuizAttempt[]>(KEYS.ATTEMPTS, []);
export const saveQuizAttempt = (attempt: QuizAttempt): void => {
  const attempts = getQuizAttempts();
  attempts.push(attempt);
  setItem(KEYS.ATTEMPTS, attempts);
};

export const getCertificates = (): Certificate[] => getItem<Certificate[]>(KEYS.CERTIFICATES, INITIAL_CERTIFICATES);
export const saveCertificate = (cert: Certificate): void => {
  const certs = getCertificates();
  const existingIdx = certs.findIndex(c => 
    c.certificateCode === cert.certificateCode || 
    (c.userId === cert.userId && c.courseId === cert.courseId)
  );
  if (existingIdx >= 0) {
    certs[existingIdx] = cert;
  } else {
    certs.unshift(cert);
  }
  setItem(KEYS.CERTIFICATES, certs);
};

// Shift Registrations (UC09)
export const getShiftRegistrations = (): ShiftRegistration[] => {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  return getItem<ShiftRegistration[]>(KEYS.REGISTRATIONS, [
    { id: 'reg-1', userId: 'usr-6', userName: 'Nguyễn Trần Thái Bảo', date: today, shiftId: 'shift-1', status: 'pending', submittedAt: today },
    { id: 'reg-2', userId: 'usr-2', userName: 'Nguyễn Văn Minh', date: today, shiftId: 'shift-2', status: 'pending', submittedAt: today },
    { id: 'reg-3', userId: 'usr-3', userName: 'Trần Thị Mai', date: tomorrow, shiftId: 'shift-1', status: 'pending', submittedAt: today },
    { id: 'reg-4', userId: 'usr-4', userName: 'Lê Hoàng Nam', date: tomorrow, shiftId: 'shift-3', status: 'approved', submittedAt: today },
  ]);
};

export const saveShiftRegistrations = (regs: ShiftRegistration[]): void => {
  setItem(KEYS.REGISTRATIONS, regs);
};

export const updateShiftRegistrationStatus = (
  regId: string,
  status: 'pending' | 'approved' | 'rejected'
): ShiftRegistration[] => {
  const regs = getShiftRegistrations().map(r =>
    r.id === regId ? { ...r, status } : r
  );
  setItem(KEYS.REGISTRATIONS, regs);
  return regs;
};

export const saveShiftRegistration = (reg: Omit<ShiftRegistration, 'id'>): ShiftRegistration => {
  const regs = getShiftRegistrations();
  const existingIdx = regs.findIndex(r => r.userId === reg.userId && r.shiftId === reg.shiftId && r.date === reg.date);
  if (existingIdx >= 0) {
    return regs[existingIdx];
  }
  const created: ShiftRegistration = { ...reg, id: `reg-${Date.now()}` };
  regs.push(created);
  setItem(KEYS.REGISTRATIONS, regs);
  return created;
};

export const deleteShiftRegistration = (userId: string, shiftId: string, date: string): boolean => {
  const regs = getShiftRegistrations();
  const filtered = regs.filter(r => !(r.userId === userId && r.shiftId === shiftId && r.date === date));
  if (filtered.length !== regs.length) {
    setItem(KEYS.REGISTRATIONS, filtered);
    return true;
  }
  return false;
};

export const approveShiftRegistrationsForDate = (date: string, userShiftMap: Record<string, string>): void => {
  const regs = getShiftRegistrations();
  regs.forEach(r => {
    if (r.date === date) {
      if (userShiftMap[r.userId] === r.shiftId) {
        r.status = 'approved';
      } else if (userShiftMap[r.userId]) {
        r.status = 'rejected';
      }
    }
  });
  setItem(KEYS.REGISTRATIONS, regs);
};

// Work Schedules (UC10, UC11)
export const getWorkSchedules = (): WorkSchedule[] => {
  const today = getTodayDateString();
  return getItem<WorkSchedule[]>(KEYS.SCHEDULES, [
    { id: 'sch-1', userId: 'usr-4', userName: 'Lê Hoàng Nam', staffCode: '0923456789', userAvatar: INITIAL_USERS[2]?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', department: 'Kỹ thuật Phim & Âm thanh', date: today, shiftId: 'shift-3', shiftName: 'Ca Đêm / Suất Chiếu Muộn (22:00 - 02:00)', location: 'Phòng Máy Chiếu & Kỹ Thuật IMAX', status: 'assigned', assignedBy: 'Quản lý Phạm Thu Hương' },
    { id: 'sch-2', userId: 'usr-3', userName: 'Trần Thị Mai', staffCode: '0912345678', userAvatar: INITIAL_USERS[1]?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', department: 'Bắp nước & Quầy Concession', date: today, shiftId: 'shift-1', shiftName: 'Ca Sáng (08:00 - 16:00)', location: 'Cụm Rạp 1 - Quầy Bắp Nước Concession', status: 'assigned', assignedBy: 'Quản lý Phạm Thu Hương' },
  ]);
};
export const saveWorkSchedules = (schedules: WorkSchedule[]): void => {
  setItem(KEYS.SCHEDULES, schedules);
};

export const mergeWorkSchedules = (newItems: WorkSchedule[], targetDates?: string[]): WorkSchedule[] => {
  const current = getWorkSchedules();
  let filtered = current;
  if (targetDates && targetDates.length > 0) {
    filtered = current.filter(s => !targetDates.includes(s.date));
  } else {
    const datesInNew = Array.from(new Set(newItems.map(s => s.date)));
    filtered = current.filter(s => !datesInNew.includes(s.date));
  }
  const merged = [...filtered, ...newItems];
  saveWorkSchedules(merged);
  return merged;
};

export const saveSingleWorkSchedule = (item: WorkSchedule, oldShiftId?: string): WorkSchedule[] => {
  const current = getWorkSchedules();
  const cleanId = (id: string) => String(id).replace('usr-', '').trim();
  const cleanShift = (s: string) => String(s).replace('shift-', '').trim();
  const targetShift = cleanShift(oldShiftId || item.shiftId);
  const filtered = current.filter(s => !(
    cleanId(s.userId) === cleanId(item.userId) && 
    s.date === item.date &&
    cleanShift(s.shiftId) === targetShift
  ));
  const updated = [...filtered, item];
  saveWorkSchedules(updated);
  return updated;
};

export const removeSingleWorkSchedule = (userId: string, date: string, shiftId?: string): WorkSchedule[] => {
  const current = getWorkSchedules();
  const cleanId = (id: string) => String(id).replace('usr-', '').trim();
  const cleanShift = (s: string) => String(s).replace('shift-', '').trim();
  const updated = current.filter(s => {
    const sameUserAndDate = cleanId(s.userId) === cleanId(userId) && s.date === date;
    if (!sameUserAndDate) return true;
    if (!shiftId) return false;
    return cleanShift(s.shiftId) !== cleanShift(shiftId);
  });
  saveWorkSchedules(updated);
  return updated;
};

export const syncApprovedRegistrationsToSchedules = (
  regs?: ShiftRegistration[],
  existingSchedules?: WorkSchedule[]
): WorkSchedule[] => {
  const allRegs = regs || getShiftRegistrations();
  const currentSchedules = [...(existingSchedules || getWorkSchedules())];
  const allUsers = getUsers();
  const cleanId = (id: string) => String(id).replace('usr-', '').trim();
  const cleanShift = (s: string) => String(s).replace('shift-', '').trim();

  const shiftLabelMap: Record<string, string> = {
    '1': 'Ca Sáng (08:00–16:00)',
    '2': 'Ca Chiều (15:30–23:00)',
    '3': 'Ca Đêm (22:00–02:00)',
  };

  let changed = false;
  allRegs.forEach(reg => {
    if (reg.status !== 'approved') return;
    const sNum = cleanShift(reg.shiftId);
    const hasSchedule = currentSchedules.some(
      s =>
        cleanId(s.userId) === cleanId(reg.userId) &&
        s.date === reg.date &&
        cleanShift(s.shiftId) === sNum
    );
    if (!hasSchedule) {
      const staff = allUsers.find(u => cleanId(u.id) === cleanId(reg.userId));
      const dept = (staff?.department || '').toLowerCase();
      let loc = 'Cụm Rạp 1 - Quầy Vé Box Office';
      if (dept.includes('bắp') || dept.includes('concession') || dept.includes('nước')) {
        loc = 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
      } else if (dept.includes('kỹ thuật') || dept.includes('usher') || dept.includes('soát')) {
        loc = 'Phòng Máy Chiếu & Kỹ Thuật IMAX';
      }
      const normShiftId = `shift-${sNum}`;
      currentSchedules.push({
        id: `sch-sync-${reg.date}-${cleanId(reg.userId)}-${sNum}`,
        userId: staff?.id || `usr-${cleanId(reg.userId)}`,
        userName: staff?.name || reg.userName,
        userAvatar: staff?.avatar || '',
        staffCode: staff?.phone || staff?.staffCode || '',
        department: staff?.department || 'Box ticket',
        date: reg.date,
        shiftId: normShiftId,
        shiftName: shiftLabelMap[sNum] || reg.shiftId,
        location: loc as any,
        status: 'assigned',
        assignedBy: 'Quản lý duyệt',
      });
      changed = true;
    }
  });

  if (changed) {
    saveWorkSchedules(currentSchedules);
  }
  return currentSchedules;
};

// Attendance (UC12)
export const getAttendances = (): Attendance[] => getItem<Attendance[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
export const saveAttendance = (att: Attendance): void => {
  const list = getAttendances();
  const idx = list.findIndex(a => a.id === att.id);
  if (idx >= 0) list[idx] = att;
  else list.unshift(att);
  setItem(KEYS.ATTENDANCE, list);
};
export const deleteAttendance = (id: string): void => {
  const list = getAttendances().filter(a => a.id !== id);
  setItem(KEYS.ATTENDANCE, list);
};

// Attendance Exceptions (UC13)
export const getAttendanceExceptions = (): AttendanceException[] => getItem<AttendanceException[]>(KEYS.EXCEPTIONS, INITIAL_EXCEPTIONS);
export const saveAttendanceException = (exc: Omit<AttendanceException, 'id'>): AttendanceException => {
  const list = getAttendanceExceptions();
  const created: AttendanceException = { ...exc, id: `exc-${Date.now()}` };
  list.push(created);
  setItem(KEYS.EXCEPTIONS, list);
  return created;
};
export const updateAttendanceExceptionStatus = (id: string, status: 'approved' | 'rejected', reviewer: string, comment?: string): void => {
  const list = getAttendanceExceptions();
  const idx = list.findIndex(e => e.id === id);
  if (idx >= 0) {
    list[idx].status = status;
    list[idx].reviewedBy = reviewer;
    if (comment) list[idx].reviewComment = comment;
    setItem(KEYS.EXCEPTIONS, list);
  }
};

export interface ShiftReminder {
  id: string;
  userId: string;
  userName: string;
  registeredCount: number;
  requiredCount: number;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export const getShiftReminders = (userId?: string): ShiftReminder[] => {
  const list = getItem<ShiftReminder[]>(KEYS.SHIFT_REMINDERS, []);
  if (!userId) return list;
  const clean = (id: string) => String(id).replace('usr-', '').trim();
  return list.filter(r => clean(r.userId) === clean(userId) && !r.isRead);
};

export const sendShiftReminders = (
  items: Omit<ShiftReminder, 'id' | 'createdAt' | 'isRead'>[]
): ShiftReminder[] => {
  const current = getItem<ShiftReminder[]>(KEYS.SHIFT_REMINDERS, []);
  const clean = (id: string) => String(id).replace('usr-', '').trim();
  const targetIds = new Set(items.map(i => clean(i.userId)));
  const filtered = current.filter(r => !targetIds.has(clean(r.userId)));
  const nowStr = new Date().toLocaleString('vi-VN');
  const created: ShiftReminder[] = items.map((item, idx) => ({
    ...item,
    id: `rem-${Date.now()}-${idx}`,
    createdAt: nowStr,
    isRead: false,
  }));
  const updated = [...created, ...filtered];
  setItem(KEYS.SHIFT_REMINDERS, updated);
  return updated;
};

export const dismissShiftReminder = (userId: string): void => {
  const current = getItem<ShiftReminder[]>(KEYS.SHIFT_REMINDERS, []);
  const clean = (id: string) => String(id).replace('usr-', '').trim();
  const updated = current.map(r =>
    clean(r.userId) === clean(userId) ? { ...r, isRead: true } : r
  );
  setItem(KEYS.SHIFT_REMINDERS, updated);
};

export interface InternalChatMessage {
  id: string;
  threadStaffId: string;
  senderId: string;
  senderName: string;
  senderRole: 'staff' | 'manager';
  senderAvatar: string;
  senderDepartment?: string;
  content: string;
  topicTag?: string;
  createdAt: string;
  readByManager: boolean;
  readByStaff: boolean;
}

const DEFAULT_CHAT_MESSAGES: InternalChatMessage[] = [
  {
    id: 'chat-init-1',
    threadStaffId: 'group-all',
    senderId: 'usr-1',
    senderName: 'Phạm Thu Hương',
    senderRole: 'manager',
    senderAvatar: INITIAL_USERS[0]?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    senderDepartment: 'Ban Quản Lý Cụm Rạp',
    content: 'Chào toàn thể nhân sự cụm rạp Aurora! Các bạn có vướng mắc về lịch trực, chấm công hoặc sự cố tại quầy vé/bắp nước thì nhắn trực tiếp vào kênh này hoặc nhắn riêng cho chị nhé.',
    topicTag: 'Thông báo chung',
    createdAt: '08:30 Hôm nay',
    readByManager: true,
    readByStaff: true,
  },
  {
    id: 'chat-init-2',
    threadStaffId: 'usr-6',
    senderId: 'usr-1',
    senderName: 'Phạm Thu Hương',
    senderRole: 'manager',
    senderAvatar: INITIAL_USERS[0]?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    senderDepartment: 'Ban Quản Lý Cụm Rạp',
    content: 'Chào Bảo, nếu em cần hỗ trợ đổi ca hoặc hỏi về lịch trực tuần tiếp theo thì nhắn vào đây cho chị nhé!',
    topicTag: 'Hỗ trợ nhân sự',
    createdAt: '09:00 Hôm nay',
    readByManager: true,
    readByStaff: true,
  },
];

export const getChatMessages = (): InternalChatMessage[] => {
  return getItem<InternalChatMessage[]>(KEYS.INTERNAL_CHAT, DEFAULT_CHAT_MESSAGES);
};

export const sendChatMessage = (
  msg: Omit<InternalChatMessage, 'id' | 'createdAt' | 'readByManager' | 'readByStaff'>
): InternalChatMessage[] => {
  const list = getChatMessages();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');

  const created: InternalChatMessage = {
    ...msg,
    id: `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: `${hh}:${mm} (${dd}/${mo})`,
    readByManager: msg.senderRole === 'manager',
    readByStaff: msg.senderRole === 'staff',
  };

  const updated = [...list, created];
  setItem(KEYS.INTERNAL_CHAT, updated);
  return updated;
};

export const markChatThreadRead = (
  threadStaffId: string,
  viewerRole: 'staff' | 'manager'
): InternalChatMessage[] => {
  const list = getChatMessages();
  const clean = (id: string) => String(id).replace('usr-', '').trim();
  const targetClean = threadStaffId === 'group-all' ? 'group-all' : clean(threadStaffId);
  let changed = false;

  const updated = list.map(m => {
    const mThreadClean = m.threadStaffId === 'group-all' ? 'group-all' : clean(m.threadStaffId);
    if (mThreadClean !== targetClean) return m;
    if (viewerRole === 'manager' && !m.readByManager) {
      changed = true;
      return { ...m, readByManager: true };
    }
    if (viewerRole === 'staff' && !m.readByStaff) {
      changed = true;
      return { ...m, readByStaff: true };
    }
    return m;
  });

  if (changed) {
    setItem(KEYS.INTERNAL_CHAT, updated);
  }
  return updated;
};

export const getUnreadChatCount = (userId: string, role: 'staff' | 'manager'): number => {
  const list = getChatMessages();
  const clean = (id: string) => String(id).replace('usr-', '').trim();
  const myClean = clean(userId);

  if (role === 'manager') {
    return list.filter(m => m.senderRole === 'staff' && !m.readByManager).length;
  }
  return list.filter(
    m =>
      m.senderRole === 'manager' &&
      !m.readByStaff &&
      (m.threadStaffId === 'group-all' || clean(m.threadStaffId) === myClean)
  ).length;
};
