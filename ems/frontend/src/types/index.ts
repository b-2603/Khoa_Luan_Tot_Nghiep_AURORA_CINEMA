export type Role = 'staff' | 'manager';

export type Department = 
  | 'Vé & Chăm sóc Khách hàng' 
  | 'Bắp nước & Quầy Concession' 
  | 'Kỹ thuật Phim & Âm thanh' 
  | 'Quản lý Đào tạo & Nhân sự';

export interface User {
  id: string;
  staffCode: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  avatar: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'leave' | 'inactive';
  performanceScore?: number;
}

export interface CourseModule {
  id: string;
  title: string;
  contentType: 'video' | 'slide' | 'document' | 'interactive';
  contentUrl: string;
  duration: string;
  isCompleted?: boolean;
  contentSummary?: string;
  keyTakeaways?: string[];
  steps?: string[];
  notes?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  isCtkm: boolean;
  thumbnail: string;
  modules: CourseModule[];
  quizId?: string;
  examCheckpoints?: string[];
  enrolledCount: number;
  completedCount: number;
  instructorName?: string;
  instructorAvatar?: string;
  instructorTitle?: string;
  level?: 'Cơ Bản' | 'Tiêu Chuẩn' | 'Nâng Cao' | 'Bắt Buộc' | 'Bắt Buộc 100%' | 'Chuyên Môn Cao' | 'Khuyến Mãi Nóng' | string;
  rating?: number;
  reviewCount?: number;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  passScore: number; // e.g. 80 (%)
  durationMinutes: number;
  questions: QuizQuestion[];
  isCtkm: boolean;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  completedAt: string;
  feedback: string;
  answers: Record<string, number>;
}

export interface Certificate {
  id: string;
  userId: string;
  userName: string;
  userStaffCode: string;
  courseId: string;
  courseTitle: string;
  certificateCode: string;
  issuedAt: string;
  score: number;
  qrCodeUrl: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  code: 'SH1' | 'SH2' | 'SH3';
  color: string;
}

export interface ShiftRegistration {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  shiftId: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface WorkSchedule {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  staffCode: string;
  department: Department;
  date: string; // YYYY-MM-DD
  shiftId: string;
  shiftName: string;
  location: string;
  status: 'assigned' | 'completed' | 'swapped';
  assignedBy: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  staffCode: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'on_time' | 'late' | 'early_leave' | 'absent';
  hoursWorked: number;
  note?: string;
}

export interface AttendanceException {
  id: string;
  attendanceId?: string;
  userId: string;
  userName: string;
  staffCode: string;
  type: 'late_justification' | 'leave_request' | 'shift_swap';
  typeTitle: string;
  reason: string;
  targetDate: string;
  proofImage?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewComment?: string;
}
