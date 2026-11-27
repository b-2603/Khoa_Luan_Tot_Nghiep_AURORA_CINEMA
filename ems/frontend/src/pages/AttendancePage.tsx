import React, { useState, useEffect, useRef } from 'react';
import { Attendance, User, AttendanceException, WorkSchedule } from '../types';
import { 
  getAttendances, saveAttendance, deleteAttendance, getUsers, updateUser, 
  getAttendanceExceptions, saveAttendanceException, updateAttendanceExceptionStatus,
  getWorkSchedules, saveWorkSchedules 
} from '../services/storage';
import { 
  fetchAttendances, fetchEmployees, updateEmployee, 
  saveAttendanceApi, fetchAttendanceExceptions, submitAttendanceExceptionApi, 
  handleExceptionActionApi, fetchWorkSchedules 
} from '../services/apiClient';
import { getTodayDateString, formatDateDMY, formatDateTimeDMY } from '../utils/dateUtils';
import { ProofPhotoCapture } from '../components/ProofPhotoCapture';
import { 
  detectCurrentNetwork, getAuthorizedWifiConfig, setAuthorizedWifiConfig, 
  extractFaceFromVideo, compareFaces, getEnrolledFace, saveEnrolledFace, 
  removeEnrolledFace, startWebcamStream, getAvailableCameras, detectFaceInRealtime,
  isIpInSameWifi, FaceFeatures, NetworkConfig 
} from '../services/biometrics';
import { 
  Clock, CheckCircle2, AlertTriangle, AlertCircle, Search, Filter, Plus, Trash2, 
  UserCheck, LogIn, LogOut, Calendar, User as UserIcon, X, Sparkles, Building2,
  MapPin, Wifi, Camera, ShieldCheck, RefreshCw, Radio, Eye, Check, XCircle,
  Scan, Settings, UserPlus, FileText, Send, ArrowRight, Lock, CheckCheck,
  ChevronRight, CalendarDays, DollarSign, Award
} from 'lucide-react';
import { 
  calculateShiftWage, 
  formatCurrencyVND, 
  checkIsHoliday, 
  BASE_HOURLY_RATE,
  formatLateDuration,
  calculateLateMinutes
} from '../services/payrollService';
import { MonthlyPayrollTable } from '../components/MonthlyPayrollTable';
import { StaffPersonalPayrollPanel } from '../components/StaffPersonalPayrollPanel';

export const SUGGESTED_LATE_REASONS = [
  'Hỏng xe / Sự cố phương tiện di chuyển',
  'Ùn tắc giao thông nghiêm trọng',
  'Thời tiết mưa bão / Đường ngập nước',
  'Sức khỏe đột xuất / Y tế',
  'Hỗ trợ sự cố khẩn cấp tại rạp',
  'Lỗi máy quét Face ID / Mạng rạp',
  'Việc gia đình khẩn cấp',
];

export const CINEMA_BRANCHES = [
  'Tất cả chi nhánh',
  'Aurora Cinema Nguyễn Trãi',
  'Aurora Cinema Landmark 81',
  'Aurora Cinema Thủ Đức',
  'Aurora Cinema Quang Trung',
  'Aurora Cinema Gò Vấp',
];

export const AVAILABLE_SHIFTS = [
  { id: 'shift-1', name: 'Ca Sáng (08:00 - 16:00)', startTime: '08:00', endTime: '16:00', code: 'SH1' },
  { id: 'shift-2', name: 'Ca Chiều (15:30 - 23:00)', startTime: '15:30', endTime: '23:00', code: 'SH2' },
  { id: 'shift-3', name: 'Ca Đêm / Suất Chiếu Muộn (22:00 - 02:00)', startTime: '22:00', endTime: '02:00', code: 'SH3' },
];

export const getRecommendedShiftId = (date = new Date()): string => {
  const totalM = date.getHours() * 60 + date.getMinutes();
  if (totalM >= 360 && totalM < 870) return 'shift-1';
  if (totalM >= 870 && totalM < 1290) return 'shift-2';
  return 'shift-3';
};

export interface CheckInEvaluation {
  status: 'on_time' | 'late';
  diffMinutes: number;
  noteDetail: string;
  isWrongShiftWindow: boolean;
}

export const evaluateCheckIn = (
  currentTimeStr: string,
  shift: typeof AVAILABLE_SHIFTS[0]
): CheckInEvaluation => {
  if (!currentTimeStr || !shift) {
    return { status: 'on_time', diffMinutes: 0, noteDetail: 'Đúng giờ chuẩn', isWrongShiftWindow: false };
  }

  const [currH, currM] = currentTimeStr.split(':').map(Number);
  const [startH, startM] = shift.startTime.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);

  const isOvernightShift = (endH * 60 + endM) <= (startH * 60 + startM);
  let currMinutes = currH * 60 + currM;
  let startMinutes = startH * 60 + startM;

  if (isOvernightShift) {
    if (currMinutes < 720) {
      currMinutes += 1440;
    }
  }

  const diffFromStart = currMinutes - startMinutes;
  const GRACE_PERIOD_MINUTES = 5;
  const ALLOWED_EARLY_MINUTES = 60;

  if (diffFromStart < -ALLOWED_EARLY_MINUTES) {
    const earlyMinutes = Math.abs(diffFromStart);
    const earlyHours = Math.floor(earlyMinutes / 60);
    const remainingMins = earlyMinutes % 60;
    const timeText = earlyHours > 0 ? `${earlyHours}h${remainingMins > 0 ? `${remainingMins}p` : ''}` : `${earlyMinutes} phút`;
    
    return {
      status: 'late',
      diffMinutes: diffFromStart,
      isWrongShiftWindow: true,
      noteDetail: `Sai khung giờ ca trực (Lúc ${currentTimeStr}, sớm hơn ca ${shift.startTime}-${shift.endTime} tới ${timeText})`,
    };
  }

  if (diffFromStart <= GRACE_PERIOD_MINUTES) {
    const earlyMins = Math.abs(diffFromStart);
    const note = diffFromStart < 0 
      ? `Đúng giờ chuẩn (Đến sớm ${earlyMins}p chuẩn bị ca ${shift.startTime})`
      : 'Đúng giờ chuẩn';
    return {
      status: 'on_time',
      diffMinutes: diffFromStart,
      isWrongShiftWindow: false,
      noteDetail: note,
    };
  }

  const lateMinutes = diffFromStart;
  const lateHours = Math.floor(lateMinutes / 60);
  const remainingLateMins = lateMinutes % 60;
  const lateText = lateHours > 0 
    ? `${lateHours} giờ ${remainingLateMins > 0 ? `${remainingLateMins} phút` : ''}`
    : `${lateMinutes} phút`;

  return {
    status: 'late',
    diffMinutes: lateMinutes,
    isWrongShiftWindow: false,
    noteDetail: `Đi muộn ${lateText} (Check-in lúc ${currentTimeStr}, ca bắt đầu ${shift.startTime})`,
  };
};

export const evaluateCheckOut = (
  checkInTimeStr: string,
  checkOutTimeStr: string,
  shift: typeof AVAILABLE_SHIFTS[0]
) => {
  const [inH, inM] = checkInTimeStr.split(':').map(Number);
  const [outH, outM] = checkOutTimeStr.split(':').map(Number);
  const [endH, endM] = shift.endTime.split(':').map(Number);
  const [startH, startM] = shift.startTime.split(':').map(Number);

  let inTotal = inH * 60 + inM;
  let outTotal = outH * 60 + outM;

  if (outTotal < inTotal) {
    outTotal += 1440;
  }

  const diffMinutes = outTotal - inTotal;
  const hoursWorked = Math.max(0.1, Math.round((diffMinutes / 60) * 10) / 10);

  let shiftEndTotal = endH * 60 + endM;
  if ((endH * 60 + endM) <= (startH * 60 + startM)) {
    shiftEndTotal += 1440;
  }

  let note = '';
  if (outTotal < shiftEndTotal - 10) {
    const earlyMins = shiftEndTotal - outTotal;
    const earlyH = Math.floor(earlyMins / 60);
    const earlyRem = earlyMins % 60;
    const earlyText = earlyH > 0 ? `${earlyH}h${earlyRem}p` : `${earlyMins}p`;
    note = `Về sớm ${earlyText} (Ca kết thúc ${shift.endTime})`;
  } else if (outTotal > shiftEndTotal + 30) {
    const otMins = outTotal - shiftEndTotal;
    const otH = Math.floor(otMins / 60);
    const otRem = otMins % 60;
    const otText = otH > 0 ? `${otH}h${otRem}p` : `${otMins}p`;
    note = `Tăng ca thêm ${otText}`;
  } else {
    note = 'Đủ giờ ca tiêu chuẩn';
  }

  return { hoursWorked, note };
};

// Helper gắn chi nhánh rạp nếu chưa có
export const resolveBranch = (user: User, schedule?: WorkSchedule, attendance?: Attendance): string => {
  if (attendance?.location) return attendance.location;
  if (schedule?.location) return schedule.location;
  if (user.branch) return user.branch;
  const hash = (user.id || user.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const branches = [
    'Aurora Cinema Nguyễn Trãi',
    'Aurora Cinema Landmark 81',
    'Aurora Cinema Thủ Đức',
    'Aurora Cinema Quang Trung',
    'Aurora Cinema Gò Vấp',
  ];
  return branches[hash % branches.length];
};

interface AttendancePageProps {
  currentUser?: User | null;
  onUpdateUser?: (user: User) => void;
  onNavigateTab?: (tab: any) => void;
  initialSubTab?: 'monitor' | 'exceptions' | 'punch' | 'payroll';
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ 
  currentUser, 
  onUpdateUser, 
  onNavigateTab,
  initialSubTab 
}) => {
  const isManager = currentUser?.role === 'manager';
  
  // Tab chính được hợp nhất:
  // - 'monitor': Bảng Giám Sát Chấm Công & Ca Trực Chi Nhánh
  // - 'payroll': Bảng Lương & Tổng Hợp Công Cuối Tháng (Quản lý)
  // - 'exceptions': Xử Lý Lỗi Chấm Công & Duyệt Trễ (Đơn giải trình, duyệt miễn trừ, xử lý trễ/quên chấm)
  // - 'punch': Máy Quét Điểm Danh Face ID (Kiosk rạp)
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'exceptions' | 'punch' | 'payroll'>(
    initialSubTab || (isManager ? 'monitor' : 'punch')
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Core Data States
  const [attendances, setAttendances] = useState<Attendance[]>(getAttendances());
  const [users, setUsers] = useState<User[]>(getUsers());
  const [exceptions, setExceptions] = useState<AttendanceException[]>(getAttendanceExceptions());
  const [schedules, setSchedules] = useState<WorkSchedule[]>(getWorkSchedules());

  // Filters for Tab 1 (Giám sát chấm công)
  const todayStr = getTodayDateString();
  const [monitorDate, setMonitorDate] = useState<string>(todayStr);
  const [branchFilter, setBranchFilter] = useState<string>('Tất cả chi nhánh');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'attended' | 'not_attended' | 'late'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filters for Tab 2 (Xử lý lỗi chấm công & ngoại lệ)
  const [excStatusFilter, setExcStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [excTypeFilter, setExcTypeFilter] = useState<string>('all');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Submit Exception Modal (Tab 2)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [excDate, setExcDate] = useState(todayStr);
  const [excType, setExcType] = useState<'late_justification' | 'leave_request' | 'shift_swap'>('late_justification');
  const [excReason, setExcReason] = useState('');
  const [excProofImage, setExcProofImage] = useState<string | undefined>(undefined);

  // Quick exception submission modal state from Tab 1
  const [quickExceptionModalOpen, setQuickExceptionModalOpen] = useState(false);
  const [targetLateRecord, setTargetLateRecord] = useState<Attendance | null>(null);
  const [quickReason, setQuickReason] = useState('');
  const [quickProofImage, setQuickProofImage] = useState<string | undefined>(undefined);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3800);
  };

  // Live Clock
  const [liveClock, setLiveClock] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync with API backend
  useEffect(() => {
    Promise.all([
      fetchAttendances(),
      fetchEmployees(),
      fetchAttendanceExceptions(),
      fetchWorkSchedules()
    ]).then(([attData, empData, excData, schData]) => {
      if (attData && attData.length > 0) setAttendances(attData);
      if (empData && empData.length > 0) setUsers(empData);
      if (excData && excData.length > 0) setExceptions(excData);
      if (schData && schData.length > 0) setSchedules(schData);
    }).catch(err => {
      console.warn('Backend sync note:', err);
    });
  }, []);

  // =========================================================================
  // FACE ID & KIOSK PUNCH STATES & REFS
  // =========================================================================
  const selectedUser = (currentUser?.id ? users.find(u => u.id === currentUser.id) || currentUser : null) || users[0];
  const [selectedShiftId, setSelectedShiftId] = useState<string>(() => getRecommendedShiftId());
  const selectedShift = AVAILABLE_SHIFTS.find(s => s.id === selectedShiftId) || AVAILABLE_SHIFTS[0];

  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyActionType, setVerifyActionType] = useState<'check_in' | 'check_out'>('check_in');

  // Network State
  const [currentNetworkIp, setCurrentNetworkIp] = useState<string>('Đang dò mạng...');
  const [authorizedConfig, setAuthorizedConfig] = useState<NetworkConfig>(getAuthorizedWifiConfig());
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);
  const [wifiInputIp, setWifiInputIp] = useState(authorizedConfig.authorizedIp || '');
  const [wifiInputSsid, setWifiInputSsid] = useState(authorizedConfig.wifiSsidName || 'AURORA-CINEMA-STAFF-5G');

  const isWifiValid = Boolean(
    authorizedConfig.authorizedIp && 
    currentNetworkIp && 
    isIpInSameWifi(currentNetworkIp, authorizedConfig.authorizedIp)
  );

  // Real Face Recognition State
  const [enrolledFace, setEnrolledFace] = useState<FaceFeatures | null>(null);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ similarity: number; isMatch: boolean; reason: string } | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [realtimeFaceTrack, setRealtimeFaceTrack] = useState<{ 
    hasFace: boolean; 
    confidence: number; 
    isOccluded?: boolean; 
    occlusionReason?: string; 
  }>({ hasFace: false, confidence: 0 });
  const [isAutoPunching, setIsAutoPunching] = useState(false);
  const autoPunchLockRef = useRef(false);
  const [activeCameraName, setActiveCameraName] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const executeVerifiedPunchRef = useRef<((scanResult?: any) => void) | null>(null);

  // Manual Add Modal State (Quản lý)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState('');
  const [modalDate, setModalDate] = useState(todayStr);
  const [modalShiftId, setModalShiftId] = useState('shift-1');
  const [modalCheckIn, setModalCheckIn] = useState('08:00');
  const [modalCheckOut, setModalCheckOut] = useState('16:00');
  const [modalStatus, setModalStatus] = useState<'on_time' | 'late'>('on_time');
  const [modalNote, setModalNote] = useState('');
  const [modalLocation, setModalLocation] = useState('Aurora Cinema Nguyễn Trãi');

  // Load enrolled face
  useEffect(() => {
    if (selectedUser?.id) {
      const face = getEnrolledFace(selectedUser.id);
      setEnrolledFace(face);
      setLastScanResult(null);
    }
  }, [selectedUser?.id]);

  // Network check
  const refreshNetworkInfo = async () => {
    setIsCheckingNetwork(true);
    const net = await detectCurrentNetwork();
    setCurrentNetworkIp(net.ip || '192.168.1.108');
    setIsCheckingNetwork(false);
  };

  useEffect(() => {
    refreshNetworkInfo();
  }, []);

  // Camera cleanup
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraReady(false);
    setIsAutoPunching(false);
    autoPunchLockRef.current = false;
  };

  const initCameraStream = async (targetDeviceId?: string) => {
    setCameraError(false);
    setCameraErrorMessage('');
    stopCameraStream();

    await new Promise(r => setTimeout(r, 150));
    if (!videoRef.current) return;

    try {
      const cams = await getAvailableCameras();
      setAvailableCameras(cams);

      const streamResult = await startWebcamStream(videoRef.current, targetDeviceId || selectedCameraId || undefined);
      if (streamResult.stream) {
        mediaStreamRef.current = streamResult.stream;
        setActiveCameraName(streamResult.activeCameraName || 'Camera');
        if (targetDeviceId) setSelectedCameraId(targetDeviceId);
        setCameraReady(true);
      } else {
        setCameraError(true);
        setCameraErrorMessage(streamResult.error || 'Không thể mở luồng video camera.');
      }
    } catch (err: any) {
      setCameraError(true);
      setCameraErrorMessage(err?.message || 'Lỗi kết nối camera thiết bị.');
    }
  };

  // Realtime face detection loop
  useEffect(() => {
    if (!isVerifyModalOpen || !cameraReady) return;

    let isMounted = true;
    let trackInterval: any = null;
    let consecutiveMatchCount = 0;
    autoPunchLockRef.current = false;
    setIsAutoPunching(false);

    trackInterval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !isMounted || autoPunchLockRef.current) return;

      const track = await detectFaceInRealtime(video);
      if (!isMounted) return;
      setRealtimeFaceTrack(track);

      if (!track.hasFace || track.isOccluded || track.confidence < 62) {
        consecutiveMatchCount = 0;
        setLastScanResult(null);
        setIsAutoPunching(false);
        return;
      }

      if (!isWifiValid || !enrolledFace) {
        return;
      }

      const currentFace = await extractFaceFromVideo(video, track);
      if (!currentFace || !isMounted) {
        consecutiveMatchCount = 0;
        setLastScanResult(null);
        return;
      }

      const result = compareFaces(currentFace, enrolledFace);
      if (!result.isMatch) {
        consecutiveMatchCount = 0;
        setLastScanResult(result);
        setIsAutoPunching(false);
        return;
      }

      consecutiveMatchCount += 1;
      if (consecutiveMatchCount >= 2 && !autoPunchLockRef.current) {
        autoPunchLockRef.current = true;
        setLastScanResult(result);
        setIsAutoPunching(true);
        setTimeout(() => {
          if (isMounted && executeVerifiedPunchRef.current) {
            executeVerifiedPunchRef.current(result);
          }
        }, 450);
      }
    }, 450);

    return () => {
      isMounted = false;
      if (trackInterval) clearInterval(trackInterval);
    };
  }, [isVerifyModalOpen, cameraReady, enrolledFace, isWifiValid]);

  const cleanAttUserId = (id?: string) => String(id || '').replace('usr-', '').trim();
  const cleanAttShiftId = (s?: string) => String(s || '1').replace('shift-', '').trim();

  const todayUserAttendances = attendances.filter(a => {
    const sameUser =
      (selectedUser?.id && cleanAttUserId(a.userId) === cleanAttUserId(selectedUser.id)) ||
      (selectedUser?.name && a.userName?.toLowerCase().trim() === selectedUser.name.toLowerCase().trim());
    return sameUser && a.date === todayStr;
  });

  const openTodayAttendance = todayUserAttendances.find(
    a =>
      Boolean(a.checkIn) &&
      !a.checkOut &&
      (!a.shiftId || cleanAttShiftId(a.shiftId) === cleanAttShiftId(selectedShift.id))
  );
  const exactShiftAttendance = todayUserAttendances.find(
    a => a.shiftId && cleanAttShiftId(a.shiftId) === cleanAttShiftId(selectedShift.id)
  );
  const legacyTodayAttendance = todayUserAttendances.find(a => !a.shiftId);

  const currentShiftAttendance = openTodayAttendance || exactShiftAttendance || legacyTodayAttendance;

  const isInActiveShift = Boolean(currentShiftAttendance?.checkIn && !currentShiftAttendance?.checkOut);
  const hasCompletedShiftCycle = Boolean(currentShiftAttendance?.checkIn && currentShiftAttendance?.checkOut);

  const startVerification = (type: 'check_in' | 'check_out') => {
    if (type === 'check_in' && isInActiveShift) {
      showToast(
        `Bạn đã xác thực Check-in vào ca lúc ${currentShiftAttendance?.checkIn}. Vui lòng Check-out tan ca trước!`,
        'info'
      );
      return;
    }
    if (type === 'check_out' && !isInActiveShift) {
      showToast(
        `Bạn cần Check-in vào ca trước khi thực hiện Check-out tan ca!`,
        'error'
      );
      return;
    }

    setVerifyActionType(type);
    setIsVerifyModalOpen(true);
    setLastScanResult(null);
    autoPunchLockRef.current = false;
    if (!isWifiValid) {
      showToast('⚠️ Thiết bị chưa kết nối Wi-Fi rạp. Tính năng điểm danh đang bị khóa!', 'error');
    }
    setTimeout(() => {
      initCameraStream();
    }, 200);
  };

  const handleEnrollFace = async () => {
    const video = videoRef.current;
    if (!video || !selectedUser) return;
    const face = await extractFaceFromVideo(video);
    if (!face) {
      alert('Không nhận diện được khuôn mặt rõ nét! Vui lòng nhìn thẳng vào camera.');
      return;
    }
    saveEnrolledFace(selectedUser.id, face);
    setEnrolledFace(face);
    setLastScanResult(null);
    showToast(`Đã đăng ký Face ID thành công cho nhân sự ${selectedUser.name}!`, 'success');
  };

  const handleCompleteVerifiedPunch = (scanResult?: { similarity: number; isMatch: boolean } | null) => {
    if (!isWifiValid) {
      showToast('❌ Không thể chấm công: Bạn chưa kết nối vào Wi-Fi rạp được ủy quyền!', 'error');
      return;
    }

    if (!enrolledFace) {
      showToast('❌ Nhân sự chưa có dữ liệu khuôn mặt mẫu! Vui lòng nhờ Quản lý đăng ký khuôn mặt trước.', 'error');
      return;
    }

    if (realtimeFaceTrack.isOccluded || !realtimeFaceTrack.hasFace) {
      showToast('❌ Khuôn mặt đang bị che khuất hoặc không rõ! Vui lòng bỏ tay ra và nhìn thẳng vào camera.', 'error');
      return;
    }

    const finalScan = scanResult || lastScanResult;
    if (!finalScan || !finalScan.isMatch) {
      showToast('❌ Chưa quét khớp khuôn mặt Face ID! Vui lòng nhìn thẳng vào camera để xác thực.', 'error');
      return;
    }

    if (!selectedUser) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hh}:${mm}`;

    if (verifyActionType === 'check_in') {
      if (isInActiveShift) {
        setIsVerifyModalOpen(false);
        stopCameraStream();
        showToast(
          `Bạn đã Check-in vào ca lúc ${currentShiftAttendance?.checkIn} hôm nay rồi!`,
          'info'
        );
        return;
      }

      const evaluation = evaluateCheckIn(currentTimeStr, selectedShift);
      const status: 'on_time' | 'late' = evaluation.status;
      const note = `[Face ID: ${finalScan?.similarity || 95}% • Wi-Fi: ${authorizedConfig.wifiSsidName || 'Rạp'}] ${evaluation.noteDetail}`;

      const newRecord: Attendance = {
        id: currentShiftAttendance?.id || `att-${Date.now()}`,
        userId: selectedUser.id,
        userName: selectedUser.name,
        staffCode: selectedUser.phone || selectedUser.staffCode || '0901234567',
        date: todayStr,
        checkIn: currentTimeStr,
        checkOut: undefined,
        status,
        hoursWorked: 0,
        note,
        location: resolveBranch(selectedUser),
        shiftId: selectedShift.id,
        shiftName: selectedShift.name,
      };

      saveAttendance(newRecord);
      saveAttendanceApi(newRecord);
      setAttendances(getAttendances());
      setIsVerifyModalOpen(false);
      stopCameraStream();
      showToast(
        `⚡ ĐÃ CHECK-IN! Nhân sự ${selectedUser.name}. Giờ vào: ${currentTimeStr} (${status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'})`,
        status === 'on_time' ? 'success' : 'info'
      );
    } else {
      const todayRecord = openTodayAttendance || currentShiftAttendance;
      if (!todayRecord) {
        setIsVerifyModalOpen(false);
        stopCameraStream();
        showToast('Không tìm thấy ca Check-in đang mở hôm nay để Check-out!', 'error');
        return;
      }
      
      const checkOutEval = evaluateCheckOut(todayRecord.checkIn || currentTimeStr, currentTimeStr, selectedShift);

      const updated: Attendance = {
        ...todayRecord,
        checkOut: currentTimeStr,
        hoursWorked: checkOutEval.hoursWorked,
        note: `${todayRecord.note || ''} | [Check-out: ${currentTimeStr} - ${checkOutEval.note} • Face ID: ${finalScan?.similarity || 95}% • Wi-Fi: ${authorizedConfig.wifiSsidName || 'Rạp'}]`.trim(),
      };

      saveAttendance(updated);
      saveAttendanceApi(updated);
      setAttendances(getAttendances());
      setIsVerifyModalOpen(false);
      stopCameraStream();
      showToast(
        `⚡ ĐÃ CHECK-OUT! Nhân sự ${selectedUser.name}. Tổng giờ làm: ${updated.hoursWorked}h`,
        'success'
      );
    }
  };

  executeVerifiedPunchRef.current = handleCompleteVerifiedPunch;

  // Handle Manual Save from Modal (Quản lý)
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = users.find(u => u.id === modalEmployeeId) || users[0];
    if (!targetUser) return;

    const chosenShift = AVAILABLE_SHIFTS.find(s => s.id === modalShiftId) || AVAILABLE_SHIFTS[0];

    let hours = 8;
    let checkoutNote = '';
    if (modalCheckIn && modalCheckOut) {
      const evalOut = evaluateCheckOut(modalCheckIn, modalCheckOut, chosenShift);
      hours = evalOut.hoursWorked;
      checkoutNote = evalOut.note;
    }

    const checkinEval = evaluateCheckIn(modalCheckIn, chosenShift);
    const finalStatus = modalStatus || checkinEval.status;

    const newRecord: Attendance = {
      id: `att-${Date.now()}`,
      userId: targetUser.id,
      userName: targetUser.name,
      staffCode: targetUser.phone || targetUser.staffCode || '0901234567',
      date: modalDate,
      checkIn: modalCheckIn,
      checkOut: modalCheckOut,
      status: finalStatus,
      hoursWorked: hours,
      note: modalNote || `Quản lý ghi nhận thủ công - ${finalStatus === 'late' ? 'Đi muộn' : 'Đúng giờ'} (${checkoutNote || checkinEval.noteDetail})`,
      location: modalLocation,
      shiftId: chosenShift.id,
      shiftName: chosenShift.name,
    };

    saveAttendance(newRecord);
    saveAttendanceApi(newRecord);
    setAttendances(getAttendances());
    setIsModalOpen(false);
    showToast(`Đã ghi nhận chấm công cho nhân sự ${targetUser.name}!`, 'success');
  };

  // Delete attendance record
  const handleDeleteAttendance = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bản ghi chấm công của ${name}?`)) {
      deleteAttendance(id);
      setAttendances(getAttendances());
      showToast(`Đã xóa bản ghi chấm công của ${name}.`, 'info');
    }
  };

  // =========================================================================
  // EXCEPTION HANDLING LOGIC & DUYỆT TRỄ (TỰ ĐỘNG CẬP NHẬT CHẤM CÔNG)
  // =========================================================================
  const handleActionException = async (id: string, status: 'approved' | 'rejected') => {
    const reviewerName = currentUser?.name || 'Phạm Thu Hương (Manager)';
    const comment = status === 'approved' 
      ? 'Đã kiểm tra minh chứng và phê duyệt miễn trừ vi phạm chấm công.' 
      : 'Từ chối đơn do không đủ căn cứ giải trình.';
      
    updateAttendanceExceptionStatus(id, status, reviewerName, comment);
    await handleExceptionActionApi(id, status, comment);

    // TỰ ĐỘNG ĐỒNG BỘ SANG BẢNG CHẤM CÔNG (ATTENDANCE) ĐỂ XÓA PHẠT ĐI MUỘN
    const exc = exceptions.find(e => e.id === id);
    if (exc && status === 'approved') {
      const allAtts = getAttendances();
      const targetAtt = allAtts.find(a => 
        (a.userId === exc.userId || a.staffCode === exc.staffCode || a.userName.toLowerCase() === exc.userName.toLowerCase()) &&
        a.date === exc.targetDate
      );

      if (targetAtt) {
        const updatedAtt: Attendance = {
          ...targetAtt,
          status: 'on_time', // Miễn trừ đi muộn, chuyển sang đúng giờ
          note: `${targetAtt.note || ''} | [Quản lý ${reviewerName} đã duyệt giải trình: ${exc.reason}]`.trim(),
        };
        saveAttendance(updatedAtt);
        saveAttendanceApi(updatedAtt);
        setAttendances(getAttendances());
      }
    }

    setExceptions(getAttendanceExceptions());
    showToast(status === 'approved' 
      ? '✓ Đã phê duyệt đơn và đồng bộ miễn trừ đi muộn sang Bảng Chấm Công!' 
      : '✕ Đã từ chối đơn giải trình.',
      status === 'approved' ? 'success' : 'info'
    );
  };

  // Quản lý duyệt trễ trực tiếp 1 chạm từ Bảng Giám Sát Chấm Công
  const handleQuickForgiveLate = async (att: Attendance) => {
    const reviewerName = currentUser?.name || 'Phạm Thu Hương (Manager)';
    
    // Tìm đơn nếu có
    const matchedExc = exceptions.find(e => 
      (e.userId === att.userId || e.userName.toLowerCase() === att.userName.toLowerCase() || e.staffCode === att.staffCode) && 
      e.targetDate === att.date && e.status === 'pending'
    );

    if (matchedExc) {
      await handleActionException(matchedExc.id, 'approved');
      return;
    }

    const updatedAtt: Attendance = {
      ...att,
      status: 'on_time',
      note: `${att.note || ''} | [Quản lý ${reviewerName} đã duyệt miễn phạt đi muộn]`.trim(),
    };

    saveAttendance(updatedAtt);
    await saveAttendanceApi(updatedAtt);
    setAttendances(getAttendances());
    showToast(`✓ Đã duyệt trễ và miễn trừ vi phạm cho nhân sự ${att.userName}!`, 'success');
  };

  // Nộp đơn giải trình nhanh cho ca đi muộn (Nhân viên)
  const handleOpenQuickException = (att: Attendance) => {
    setTargetLateRecord(att);
    setQuickReason('');
    setQuickProofImage(undefined);
    setQuickExceptionModalOpen(true);
  };

  const handleQuickSubmitException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLateRecord || !quickReason.trim()) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    const newExc = {
      attendanceId: targetLateRecord.id,
      userId: targetLateRecord.userId,
      userName: targetLateRecord.userName,
      staffCode: targetLateRecord.staffCode,
      type: 'late_justification' as const,
      typeTitle: 'Giải trình Đi Muộn',
      reason: quickReason.trim(),
      targetDate: targetLateRecord.date,
      proofImage: quickProofImage,
      status: 'pending' as const,
      submittedAt: `${dd}/${month}/${yyyy} ${hh}:${mm}`,
    };

    saveAttendanceException(newExc);
    await submitAttendanceExceptionApi(newExc);
    setExceptions(getAttendanceExceptions());
    setQuickExceptionModalOpen(false);
    setQuickReason('');
    setQuickProofImage(undefined);
    showToast('Đã gửi đơn giải trình thành công tới Quản lý rạp! Đơn đang chờ duyệt.', 'success');
  };

  // Nộp đơn ngoại lệ từ Tab 2
  const handleSubmitNewException = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = currentUser || users[0];
    if (!excReason.trim()) return;

    const typeTitles: Record<string, string> = {
      late_justification: 'Giải trình Đi Muộn',
      leave_request: 'Đơn Xin Nghỉ Phép',
      shift_swap: 'Yêu Cầu Đổi Ca Trực',
    };

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    const newExc = {
      userId: user.id,
      userName: user.name,
      staffCode: user.staffCode || user.id,
      type: excType,
      typeTitle: typeTitles[excType] || 'Ngoại Lệ Chấm Công',
      reason: excReason.trim(),
      targetDate: excDate,
      proofImage: excProofImage,
      status: 'pending' as const,
      submittedAt: `${dd}/${month}/${yyyy} ${hh}:${mm}`,
    };

    saveAttendanceException(newExc);
    await submitAttendanceExceptionApi(newExc);
    setExceptions(getAttendanceExceptions());
    setIsSubmitModalOpen(false);
    setExcReason('');
    setExcProofImage(undefined);
    showToast('Đã tạo đơn ngoại lệ thành công!', 'success');
  };

  // =========================================================================
  // DATA PREPARATION FOR TAB 1: GIÁM SÁT CHẤM CÔNG & SO KHỚP LỊCH CA
  // =========================================================================
  // Lọc danh sách nhân sự cụm rạp (loại bỏ vai trò admin/office nếu có)
  const branchStaffList = users.filter(u => {
    if (u.role === 'staff') return true;
    const dept = (u.department || '').toLowerCase();
    return dept.includes('ticket') || dept.includes('concession') || dept.includes('usher') || dept.includes('processing') || dept.includes('bắp') || dept.includes('vé');
  });

  // Cross-check: So khớp từng nhân viên với lịch ca và bản ghi chấm công ngày monitorDate
  const staffMonitorRows = branchStaffList.map(staff => {
    // 1. Lịch ca được phân bổ ngày này
    const scheduledItem = schedules.find(s => 
      (s.userId === staff.id || s.userId === staff.id.replace('usr-', '')) && 
      s.date === monitorDate
    );

    // 2. Bản ghi chấm công ngày này
    const attRecord = attendances.find(a => 
      (a.userId === staff.id || a.staffCode === staff.staffCode || a.userName.toLowerCase() === staff.name.toLowerCase()) && 
      a.date === monitorDate
    );

    // 3. Chi nhánh làm việc
    const branch = resolveBranch(staff, scheduledItem, attRecord);

    // 4. Ca phân công
    const shift = scheduledItem 
      ? (AVAILABLE_SHIFTS.find(s => s.id === scheduledItem.shiftId) || { id: scheduledItem.shiftId, name: scheduledItem.shiftName || 'Ca theo lịch', startTime: '08:00', endTime: '16:00', code: 'SH1' })
      : null;

    // 5. Trạng thái đã chấm công hay chưa
    const hasCheckedIn = Boolean(attRecord && attRecord.checkIn);
    const hasCheckedOut = Boolean(attRecord && attRecord.checkOut);

    // 6. Tìm đơn ngoại lệ đang chờ hoặc đã duyệt
    const matchedExc = exceptions.find(e => 
      (e.userId === staff.id || e.staffCode === staff.staffCode || e.userName.toLowerCase() === staff.name.toLowerCase()) && 
      e.targetDate === monitorDate
    );

    // 7. Tính toán mức lương & tiền phạt trễ (xử lý chính xác số phút trễ theo ca, gồm cả ca đêm qua 00:00)
    const isExcused = matchedExc?.status === 'approved' || (attRecord?.note || '').includes('miễn phạt');
    const wageDetail = calculateShiftWage({
      date: monitorDate,
      checkIn: attRecord?.checkIn,
      checkOut: attRecord?.checkOut,
      shiftStartTime: shift?.startTime || '08:00',
      shiftEndTime: shift?.endTime || '16:00',
      hoursWorked: attRecord?.hoursWorked,
      isExcused,
      department: staff.department,
    });

    const isLate = wageDetail.lateMinutes > 5;

    // 8. Đánh giá tính chuẩn xác theo ca làm việc (Shift Compliance)
    let compliance: {
      code: 'on_time' | 'late' | 'not_attended' | 'off_duty' | 'extra_shift';
      label: string;
      subText?: string;
      badgeColor: string;
    };

    if (!hasCheckedIn) {
      if (scheduledItem) {
        compliance = {
          code: 'not_attended',
          label: '❌ Chưa chấm công theo ca',
          subText: `Có ca ${shift?.name || 'phân công'} nhưng chưa điểm danh`,
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      } else {
        compliance = {
          code: 'off_duty',
          label: '— Không có lịch ca (Nghỉ)',
          badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
        };
      }
    } else {
      if (!scheduledItem) {
        compliance = {
          code: 'extra_shift',
          label: 'ℹ️ Trực ngoài lịch (Tăng cường)',
          subText: `Chấm công lúc ${attRecord?.checkIn}`,
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      } else {
        if (isLate && !isExcused) {
          compliance = {
            code: 'late',
            label: `⏱️ Trễ ${formatLateDuration(wageDetail.lateMinutes)}`,
            subText: `Vào ${attRecord?.checkIn} (Ca bắt đầu ${shift?.startTime})`,
            badgeColor: wageDetail.lateInfo.isExcessiveLate 
              ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse'
              : 'bg-amber-50 text-amber-800 border-amber-300 font-bold',
          };
        } else {
          compliance = {
            code: 'on_time',
            label: isExcused ? '🛡️ Đã duyệt miễn phạt trễ' : '✓ Đúng ca & đúng giờ',
            subText: `Check-in ${attRecord?.checkIn} (${isExcused ? 'Đã duyệt' : 'Đạt chuẩn'})`,
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          };
        }
      }
    }

    return {
      staff,
      branch,
      scheduledItem,
      shift,
      attRecord,
      hasCheckedIn,
      hasCheckedOut,
      compliance,
      matchedExc,
      wageDetail,
    };
  });

  // Áp dụng bộ lọc cho Tab 1
  const filteredMonitorRows = staffMonitorRows.filter(row => {
    // Chi nhánh
    if (branchFilter !== 'Tất cả chi nhánh' && row.branch !== branchFilter) {
      return false;
    }
    // Ca làm việc
    if (shiftFilter !== 'all') {
      if (row.shift?.id !== shiftFilter) return false;
    }
    // Trạng thái chấm công
    if (attendanceStatusFilter === 'attended' && !row.hasCheckedIn) return false;
    if (attendanceStatusFilter === 'not_attended' && row.hasCheckedIn) return false;
    if (attendanceStatusFilter === 'late' && row.compliance.code !== 'late') return false;

    // Search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = row.staff.name.toLowerCase().includes(q);
      const matchCode = (row.staff.staffCode || '').toLowerCase().includes(q);
      const matchDept = (row.staff.department || '').toLowerCase().includes(q);
      const matchBranch = row.branch.toLowerCase().includes(q);
      return matchName || matchCode || matchDept || matchBranch;
    }
    return true;
  });

  // KPI Overview Tab 1
  const totalStaffCount = staffMonitorRows.length;
  const attendedCount = staffMonitorRows.filter(r => r.hasCheckedIn).length;
  const notAttendedCount = staffMonitorRows.filter(r => !r.hasCheckedIn && r.scheduledItem).length;
  const lateCountInMonitor = staffMonitorRows.filter(r => r.compliance.code === 'late').length;
  const totalDayEstimatedWage = staffMonitorRows.reduce((sum, r) => sum + r.wageDetail.netShiftWage, 0);
  const totalDayPenalties = staffMonitorRows.reduce((sum, r) => sum + r.wageDetail.penaltyAmount, 0);
  const monitorDateHoliday = checkIsHoliday(monitorDate);

  // KPI Tab 2 (Exceptions)
  const pendingExceptionsCount = exceptions.filter(e => e.status === 'pending').length;
  const approvedExceptionsCount = exceptions.filter(e => e.status === 'approved').length;
  const rejectedExceptionsCount = exceptions.filter(e => e.status === 'rejected').length;

  const filteredExceptions = exceptions.filter(e => {
    const matchesStatus = excStatusFilter === 'all' || e.status === excStatusFilter;
    const matchesType = excTypeFilter === 'all' || e.type === excTypeFilter;
    return matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : toast.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Clean Navigation Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 pt-5 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {isManager ? 'Quản Lý Chấm Công' : 'Điểm Danh & Chấm Công'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isManager
                  ? 'Theo dõi điểm danh theo ngày, duyệt đơn giải trình và tính lương tự động'
                  : 'Điểm danh ca trực bằng Face ID qua Wi-Fi rạp và gửi đơn giải trình'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Compact Clock */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{liveClock || '--:--:--'}</span>
            </div>

            {isManager && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setWifiInputIp(authorizedConfig.authorizedIp || '10.106.193.65');
                    setWifiInputSsid(authorizedConfig.wifiSsidName || 'AURORA-CINEMA-STAFF-5G');
                    setIsWifiModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                  title="Cấu hình Wi-Fi điểm danh tại rạp"
                >
                  <Wifi className={`w-3.5 h-3.5 ${isWifiValid ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Wi-Fi rạp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab(activeSubTab === 'punch' ? 'monitor' : 'punch')}
                  className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-semibold rounded-xl transition cursor-pointer ${
                    activeSubTab === 'punch'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="Mở máy quét điểm danh Face ID"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>{activeSubTab === 'punch' ? 'Đóng Kiosk' : 'Kiosk Face ID'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalEmployeeId(users[0]?.id || '');
                    setModalDate(monitorDate);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Chấm Công Bù</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Clean Underline Tabs */}
        <div className="px-6 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          {isManager ? (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('monitor')}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'monitor'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Building2 className={`w-4 h-4 ${activeSubTab === 'monitor' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Chấm Công Ngày</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeSubTab === 'monitor' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {attendedCount}/{totalStaffCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('exceptions')}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'exceptions'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${activeSubTab === 'exceptions' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Đơn Giải Trình</span>
                {pendingExceptionsCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                    {pendingExceptionsCount} chờ duyệt
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                    {exceptions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('payroll')}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'payroll'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <DollarSign className={`w-4 h-4 ${activeSubTab === 'payroll' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Bảng Lương Tháng</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveSubTab('punch')}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'punch'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Scan className={`w-4 h-4 ${activeSubTab === 'punch' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Điểm Danh Face ID</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('exceptions')}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'exceptions'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className={`w-4 h-4 ${activeSubTab === 'exceptions' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Đơn Giải Trình</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('payroll')}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'payroll'
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className={`w-4 h-4 ${activeSubTab === 'payroll' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>Phiếu Lương Của Tôi</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: CHẤM CÔNG NGÀY (TINH GỌN, DỄ QUÉT, KHÔNG RỐI MẮT)            */}
      {/* =================================================================== */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-4">
          {/* Subtle Holiday Strip (Only when holiday) */}
          {monitorDateHoliday.isHoliday && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold">
                  Ngày Lễ: {monitorDateHoliday.holidayName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-bold">
                  Hệ số ×{monitorDateHoliday.multiplier}
                </span>
              </div>
              <span className="text-xs text-indigo-700">
                Tự động áp dụng nhân lương ngày lễ trong Bảng Lương Tháng
              </span>
            </div>
          )}

          {/* 4 Clickable Status Filter KPI Cards (Replaces 6 noisy cards + status dropdown) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                key: 'all' as const,
                label: 'Tổng nhân sự',
                value: totalStaffCount,
                sub: `Ngày ${formatDateDMY(monitorDate)}`,
                activeCls: 'border-slate-900 ring-1 ring-slate-900 bg-slate-50/70',
                valCls: 'text-slate-900',
                icon: Building2,
                iconCls: 'bg-slate-100 text-slate-600',
              },
              {
                key: 'attended' as const,
                label: 'Đã điểm danh',
                value: attendedCount,
                sub: `${totalStaffCount > 0 ? Math.round((attendedCount / totalStaffCount) * 100) : 0}% quân số`,
                activeCls: 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30',
                valCls: 'text-emerald-700',
                icon: CheckCircle2,
                iconCls: 'bg-emerald-50 text-emerald-600',
              },
              {
                key: 'late' as const,
                label: 'Đi muộn',
                value: lateCountInMonitor,
                sub: totalDayPenalties > 0 ? `Phạt dự kiến ${formatCurrencyVND(totalDayPenalties)}` : 'Không phát sinh phạt',
                activeCls: 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30',
                valCls: 'text-amber-700',
                icon: AlertTriangle,
                iconCls: 'bg-amber-50 text-amber-600',
              },
              {
                key: 'not_attended' as const,
                label: 'Chưa chấm công',
                value: notAttendedCount,
                sub: 'Chưa quét Face ID',
                activeCls: 'border-rose-500 ring-1 ring-rose-500 bg-rose-50/30',
                valCls: 'text-rose-700',
                icon: AlertCircle,
                iconCls: 'bg-rose-50 text-rose-600',
              },
            ].map(card => {
              const isSelected = attendanceStatusFilter === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setAttendanceStatusFilter(card.key)}
                  className={`text-left bg-white p-4 rounded-2xl border transition flex items-center gap-3.5 cursor-pointer shadow-xs ${
                    isSelected ? card.activeCls : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${card.iconCls} flex items-center justify-center shrink-0`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-2xl font-bold leading-none ${card.valCls}`}>{card.value}</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">{card.label}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{card.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Single-row Clean Filter Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên nhân viên, mã NV, bộ phận..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <input
                type="date"
                value={monitorDate}
                onChange={(e) => setMonitorDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-amber-400 cursor-pointer"
              />

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {CINEMA_BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">Tất cả ca trực</option>
                {AVAILABLE_SHIFTS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CLEAN 5-COLUMN DAILY ATTENDANCE TABLE */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Danh sách chấm công • {formatDateDMY(monitorDate)}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  {filteredMonitorRows.length} người
                </span>
              </div>
              {totalDayEstimatedWage > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab('payroll')}
                  className="text-xs text-slate-500 hover:text-amber-700 transition cursor-pointer"
                >
                  Quỹ công ước tính ngày:{' '}
                  <strong className="font-mono text-slate-800">{formatCurrencyVND(totalDayEstimatedWage)}</strong> →
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Nhân Viên</th>
                    <th className="px-4 py-3.5">Ca Trực</th>
                    <th className="px-4 py-3.5">Giờ Vào / Ra</th>
                    <th className="px-4 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredMonitorRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                        Không có nhân viên nào phù hợp với bộ lọc ngày {formatDateDMY(monitorDate)}.
                      </td>
                    </tr>
                  ) : (
                    filteredMonitorRows.map((row) => (
                      <tr key={row.staff.id} className="hover:bg-slate-50/70 transition">
                        {/* Nhân viên */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {row.staff.avatar ? (
                              <img
                                src={row.staff.avatar}
                                alt={row.staff.name}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                                {row.staff.name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate">{row.staff.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                                <span>{row.staff.department || 'Nhân viên rạp'}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400 truncate">{row.branch.replace('Aurora Cinema ', '')}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Ca trực */}
                        <td className="px-4 py-3.5">
                          {row.scheduledItem ? (
                            <div>
                              <div className="font-medium text-slate-900 text-sm">
                                {row.shift?.name.split('(')[0].trim() || row.scheduledItem.shiftName}
                              </div>
                              <div className="text-xs font-mono text-slate-500 mt-0.5">
                                {row.shift?.startTime} – {row.shift?.endTime}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Không có lịch</span>
                          )}
                        </td>

                        {/* Giờ vào / ra */}
                        <td className="px-4 py-3.5">
                          {row.hasCheckedIn ? (
                            <div>
                              <div className="font-mono text-sm font-semibold text-slate-800">
                                <span className={row.wageDetail.lateMinutes > 5 && !row.wageDetail.lateInfo.isExcused ? 'text-amber-700' : 'text-emerald-700'}>
                                  {row.attRecord?.checkIn}
                                </span>
                                <span className="text-slate-300 mx-1.5">→</span>
                                <span>{row.attRecord?.checkOut || 'Đang trực'}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span>{row.wageDetail.hoursWorked} giờ công</span>
                                {row.wageDetail.isInProgress && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-semibold">
                                    Đang tính
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Trạng thái gọn 1 cột */}
                        <td className="px-4 py-3.5">
                          {!row.hasCheckedIn ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                              <XCircle className="w-3.5 h-3.5" />
                              Chưa chấm công
                            </span>
                          ) : row.wageDetail.lateMinutes > 5 ? (
                            row.wageDetail.lateInfo.isExcused ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Đã miễn phạt
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Trễ {formatLateDuration(row.wageDetail.lateMinutes)}
                                </span>
                                {row.wageDetail.penaltyAmount > 0 && (
                                  <div className="text-[11px] font-mono text-rose-600 font-semibold mt-1">
                                    Phạt -{formatCurrencyVND(row.wageDetail.penaltyAmount)}
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Đúng giờ
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(row.wageDetail.lateMinutes > 5 || row.compliance.code === 'late') &&
                              !row.wageDetail.lateInfo.isExcused && (
                                <button
                                  type="button"
                                  onClick={() => row.attRecord && handleQuickForgiveLate(row.attRecord)}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  title="Miễn trừ phạt đi muộn"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>Duyệt trễ</span>
                                </button>
                              )}

                            {!row.hasCheckedIn && isManager && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalEmployeeId(row.staff.id);
                                  setModalDate(monitorDate);
                                  if (row.shift) setModalShiftId(row.shift.id);
                                  setModalLocation(row.branch);
                                  setIsModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Chấm bù</span>
                              </button>
                            )}

                            {row.attRecord && isManager && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttendance(row.attRecord!.id, row.staff.name)}
                                title="Xóa bản ghi chấm công"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB PAYROLL: BẢNG LƯƠNG QUẢN LÝ HOẶC PHIẾU LƯƠNG CÁ NHÂN NHÂN VIÊN  */}
      {/* =================================================================== */}
      {activeSubTab === 'payroll' && isManager && (
        <MonthlyPayrollTable 
          users={users} 
          attendances={attendances} 
          shifts={AVAILABLE_SHIFTS as any}
          exceptions={exceptions}
        />
      )}

      {activeSubTab === 'payroll' && !isManager && selectedUser && (
        <StaffPersonalPayrollPanel
          currentUser={selectedUser}
          attendances={attendances}
          shifts={AVAILABLE_SHIFTS as any}
          exceptions={exceptions}
        />
      )}

      {/* =================================================================== */}
      {/* TAB 2: ĐƠN GIẢI TRÌNH & DUYỆT NGOẠI LỆ (GỌN GÀNG, TẬP TRUNG)        */}
      {/* =================================================================== */}
      {activeSubTab === 'exceptions' && (
        <div className="space-y-4">
          {/* Unified Clean Filter Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Segmented Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
              {[
                { key: 'all' as const, label: 'Tất cả', count: exceptions.length },
                { key: 'pending' as const, label: 'Chờ duyệt', count: pendingExceptionsCount },
                { key: 'approved' as const, label: 'Đã duyệt', count: approvedExceptionsCount },
                { key: 'rejected' as const, label: 'Từ chối', count: rejectedExceptionsCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setExcStatusFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    excStatusFilter === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                    tab.key === 'pending' && tab.count > 0
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={excTypeFilter}
                onChange={(e) => setExcTypeFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="all">Tất cả loại đơn</option>
                <option value="late_justification">Giải trình đi muộn</option>
                <option value="leave_request">Đơn nghỉ phép</option>
                <option value="shift_swap">Đề xuất đổi ca</option>
              </select>

              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Tạo đơn mới</span>
              </button>
            </div>
          </div>

          {/* Exceptions List */}
          <div className="space-y-3">
            {filteredExceptions.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl py-12 px-6 text-center text-slate-400">
                <FileText className="w-9 h-9 mx-auto text-slate-300 mb-2.5" />
                <p className="text-sm font-medium text-slate-600">Không có đơn giải trình nào</p>
                <p className="text-xs text-slate-400 mt-0.5">Thử đổi trạng thái hoặc loại đơn ở thanh lọc phía trên</p>
              </div>
            ) : (
              filteredExceptions.map((exc) => (
                <div
                  key={exc.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{exc.userName}</span>
                      <span className="text-xs font-mono text-slate-400">{exc.staffCode}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                        exc.type === 'late_justification'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : exc.type === 'leave_request'
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}>
                        {exc.typeTitle}
                      </span>
                      <span className="text-xs text-slate-500">
                        Ca ngày <strong className="font-mono text-slate-700">{formatDateDMY(exc.targetDate)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-slate-400">{exc.submittedAt}</span>
                      {exc.status === 'pending' ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Chờ duyệt
                        </span>
                      ) : exc.status === 'approved' ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Từ chối
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-4 py-3 border border-slate-200/70">
                        {exc.reason}
                      </p>

                      {exc.reviewedBy && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Đã xử lý bởi <strong className="text-slate-700">{exc.reviewedBy}</strong>
                            {exc.reviewComment && ` — "${exc.reviewComment}"`}
                          </span>
                        </div>
                      )}
                    </div>

                    {exc.proofImage && (
                      <div
                        onClick={() => setZoomImage(exc.proofImage || null)}
                        className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group relative shrink-0"
                        title="Bấm xem ảnh minh chứng"
                      >
                        <img
                          src={exc.proofImage}
                          alt="Minh chứng"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>

                  {isManager && exc.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleActionException(exc.id, 'rejected')}
                        className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionException(exc.id, 'approved')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Phê duyệt & Miễn phạt</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: KIOSK ĐIỂM DANH FACE ID TRỰC TIẾP TẠI RẠP PHIM                 */}
      {/* =================================================================== */}
      {activeSubTab === 'punch' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-50 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Máy Quét Điểm Danh Ca Làm Việc Trực Tiếp
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      isWifiValid 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                    title={`IP hiện tại: ${currentNetworkIp} | IP Wi-Fi rạp yêu cầu: ${authorizedConfig.authorizedIp}`}
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      <span>
                        {isWifiValid
                          ? `Đã kết nối Wi-Fi rạp (${authorizedConfig.wifiSsidName} • ${currentNetworkIp})`
                          : `Chưa kết nối Wi-Fi rạp (IP hiện tại: ${currentNetworkIp} ≠ Rạp: ${authorizedConfig.authorizedIp})`}
                      </span>
                    </div>

                    {isManager ? (
                      <button
                        type="button"
                        onClick={() => {
                          setWifiInputIp(authorizedConfig.authorizedIp || '10.106.193.65');
                          setWifiInputSsid(authorizedConfig.wifiSsidName || 'AURORA-CINEMA-STAFF-5G');
                          setIsWifiModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition cursor-pointer"
                        title="Cấu hình IP Wi-Fi rạp (Chỉ Quản lý)"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cài đặt Wi-Fi</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={refreshNetworkInfo}
                        disabled={isCheckingNetwork}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition cursor-pointer"
                        title="Kiểm tra lại kết nối Wi-Fi rạp"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isCheckingNetwork ? 'animate-spin' : ''}`} />
                        <span>Kiểm tra lại mạng</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Authenticated Staff Card */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nhân Sự Điểm Danh:
                    </label>
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-white border border-slate-300 rounded-xl shadow-xs">
                      {selectedUser?.avatar ? (
                        <img 
                          src={selectedUser.avatar} 
                          alt={selectedUser.name} 
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-400 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {selectedUser?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span className="truncate">{selectedUser?.name}</span>
                          <span className="shrink-0 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Chính chủ
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {selectedUser?.staffCode || selectedUser?.id} • {selectedUser?.department || 'Nhân sự'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Select Shift */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Ca Trực Phân Công:
                      </label>
                      {selectedShiftId === getRecommendedShiftId() && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                          Gợi ý theo giờ
                        </span>
                      )}
                    </div>
                    <select
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs cursor-pointer font-medium"
                    >
                      {AVAILABLE_SHIFTS.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.id === getRecommendedShiftId() ? `★ ${s.name} (Hiện tại)` : s.name}
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const now = new Date();
                      const hh = String(now.getHours()).padStart(2, '0');
                      const mm = String(now.getMinutes()).padStart(2, '0');
                      const evalNow = evaluateCheckIn(`${hh}:${mm}`, selectedShift);
                      return (
                        <div className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg border ${
                          evalNow.status === 'on_time'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : evalNow.isWrongShiftWindow
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {evalNow.status === 'on_time' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">
                            Lúc này ({hh}:{mm}): {evalNow.status === 'on_time' ? 'Đúng giờ chuẩn' : evalNow.isWrongShiftWindow ? 'Sai khung giờ ca' : 'Đi muộn'}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* System Clock & Cinema Branch */}
                  <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-medium">Chi nhánh rạp điểm danh</div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {resolveBranch(selectedUser)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2.5 min-w-[235px]">
                <button
                  type="button"
                  disabled={isInActiveShift}
                  onClick={() => startVerification('check_in')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition shadow-xs ${
                    isInActiveShift
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20 cursor-pointer'
                  }`}
                >
                  {isInActiveShift ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Đã Vào Ca ({currentShiftAttendance?.checkIn})</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 shrink-0" />
                      <span>Xác Thực & Check-in Vào Ca</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!isInActiveShift}
                  onClick={() => startVerification('check_out')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition shadow-xs ${
                    !isInActiveShift
                      ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-500/20 cursor-pointer'
                  }`}
                >
                  {!isInActiveShift ? (
                    hasCompletedShiftCycle ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Đã Tan Ca ({currentShiftAttendance?.checkOut})</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Check-out Tan Ca (Chưa vào ca)</span>
                      </>
                    )
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Xác Thực & Check-out Tan Ca</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: FACE ID VERIFICATION CAMERA (KIOSK POPUP)                     */}
      {/* =================================================================== */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsVerifyModalOpen(false);
                stopCameraStream();
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 shadow-2xs">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Điểm danh {verifyActionType === 'check_in' ? 'vào ca' : 'tan ca'} Face ID
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedUser?.name} • <span className="font-medium text-slate-700">{selectedShift.name}</span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isWifiValid 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                  : 'bg-rose-50 text-rose-700 border-rose-200/80'
              }`}>
                <Wifi className="w-3 h-3" />
                {isWifiValid ? 'Wi-Fi rạp hợp lệ' : 'Chưa vào Wi-Fi rạp (Bị khóa)'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                <MapPin className="w-3 h-3" />
                {resolveBranch(selectedUser)}
              </span>
            </div>

            {!isWifiValid && (
              <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs text-left my-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Điểm danh bị khóa: Chưa vào Wi-Fi rạp!</span>
                </div>
                <p className="text-[11px] text-rose-600 mt-1">
                  Nhân sự bắt buộc phải kết nối Wi-Fi <span className="font-bold text-rose-800">"{authorizedConfig.wifiSsidName}"</span> để chấm công.
                </p>
                <div className="text-[10px] text-slate-500 mt-1.5 font-mono flex items-center justify-between border-t border-rose-100 pt-1">
                  <span>IP thiết bị: <strong>{currentNetworkIp}</strong></span>
                  {authorizedConfig.authorizedIp && <span>Mạng yêu cầu: <strong>{authorizedConfig.authorizedIp}</strong></span>}
                </div>
              </div>
            )}

            {/* Video Face Frame */}
            <div className="relative w-56 h-56 rounded-full overflow-hidden bg-slate-950 border-4 border-slate-100 shadow-xl flex items-center justify-center my-2">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              <div className={`absolute inset-3 rounded-full border-2 transition-all duration-300 pointer-events-none ${
                isAutoPunching || lastScanResult?.isMatch
                  ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)] scale-102'
                  : realtimeFaceTrack.isOccluded
                  ? 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse'
                  : realtimeFaceTrack.hasFace
                  ? 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'border-white/35 border-dashed'
              }`} />

              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center z-20">
                  <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                  <p className="text-xs text-slate-200 font-medium mb-2.5">Không thể mở camera</p>
                  <button
                    type="button"
                    onClick={() => initCameraStream()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>

            {/* Live Recognition Status */}
            <div className="mt-2 min-h-[22px] flex items-center justify-center text-center px-2">
              {!isWifiValid ? (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  Đang khóa điểm danh do chưa kết nối Wi-Fi rạp
                </span>
              ) : isAutoPunching ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Nhận diện thành công! Đang lưu chấm công...
                </span>
              ) : lastScanResult?.isMatch ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Đã khớp khuôn mặt ({lastScanResult.similarity}%)
                </span>
              ) : lastScanResult && !lastScanResult.isMatch && realtimeFaceTrack.hasFace ? (
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  Khuôn mặt không khớp mẫu đã lưu ({lastScanResult.similarity}%)
                </span>
              ) : realtimeFaceTrack.isOccluded ? (
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  {realtimeFaceTrack.occlusionReason || 'Vui lòng nhìn thẳng vào camera'}
                </span>
              ) : realtimeFaceTrack.hasFace ? (
                <span className="text-xs font-medium text-amber-600 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang nhận diện khuôn mặt...
                </span>
              ) : enrolledFace ? (
                <span className="text-xs text-slate-500 font-medium">
                  Vui lòng nhìn thẳng vào camera để nhận diện
                </span>
              ) : isManager ? (
                <span className="text-xs text-amber-700 font-medium">
                  Chưa có ảnh khuôn mặt mẫu. Quản lý bấm nút dưới để chụp.
                </span>
              ) : (
                <span className="text-xs text-amber-700 font-medium">
                  Chưa có dữ liệu khuôn mặt. Vui lòng nhờ Quản lý đăng ký.
                </span>
              )}
            </div>

            {isManager && (
              <div className="w-full mt-2">
                <button
                  type="button"
                  onClick={handleEnrollFace}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{enrolledFace ? 'Chụp lại khuôn mặt mẫu' : 'Đăng ký khuôn mặt mẫu mới'}</span>
                </button>
              </div>
            )}

            <div className="w-full flex items-center gap-2.5 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  stopCameraStream();
                }}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => handleCompleteVerifiedPunch()}
                disabled={isAutoPunching || !isWifiValid || !enrolledFace || !lastScanResult?.isMatch}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                  isWifiValid && enrolledFace && lastScanResult?.isMatch && !isAutoPunching
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                title={
                  !isWifiValid
                    ? 'Bạn chưa vào đúng Wi-Fi rạp nên nút này bị khóa'
                    : !enrolledFace
                    ? 'Nhân sự chưa đăng ký khuôn mặt mẫu'
                    : !lastScanResult?.isMatch
                    ? 'Cần quét khớp khuôn mặt chính chủ trước khi xác nhận'
                    : 'Xác nhận chấm công'
                }
              >
                <Check className="w-4 h-4" />
                {isAutoPunching
                  ? 'Đang lưu...'
                  : !isWifiValid
                  ? 'Bị Khóa Wi-Fi'
                  : !enrolledFace
                  ? 'Chưa Có Mẫu Mặt'
                  : !lastScanResult?.isMatch
                  ? 'Chờ Quét Mặt...'
                  : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CẤU HÌNH IP WI-FI RẠP CHO CHẤM CÔNG                          */}
      {/* =================================================================== */}
      {isWifiModalOpen && isManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cấu Hình Wi-Fi Rạp Phim</h3>
                  <p className="text-[11px] text-slate-500">Thiết lập IP mạng hợp lệ cho điểm danh nhân sự</p>
                </div>
              </div>
              <button
                onClick={() => setIsWifiModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const updated = setAuthorizedWifiConfig(wifiInputIp.trim(), wifiInputSsid.trim());
                setAuthorizedConfig(updated);
                setIsWifiModalOpen(false);
                showToast('✓ Đã lưu cấu hình Wi-Fi rạp thành công!', 'success');
              }}
              className="space-y-4"
            >
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">IP thiết bị hiện tại:</span>
                  <span className="font-mono font-bold text-slate-900">{currentNetworkIp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Trạng thái:</span>
                  <span className={`font-semibold ${isWifiValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isWifiValid ? '✓ Đang kết nối đúng Wi-Fi rạp' : '✗ Chưa vào Wi-Fi rạp'}
                  </span>
                </div>
                <div className="pt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={refreshNetworkInfo}
                    disabled={isCheckingNetwork}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isCheckingNetwork ? 'animate-spin' : ''}`} />
                    <span>Dò lại mạng</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IP Wi-Fi Rạp Được Ủy Quyền: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={wifiInputIp}
                  onChange={(e) => setWifiInputIp(e.target.value)}
                  placeholder="VD: 10.106.193.65"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên SSID Wi-Fi Rạp:
                </label>
                <input
                  type="text"
                  value={wifiInputSsid}
                  onChange={(e) => setWifiInputSsid(e.target.value)}
                  placeholder="VD: AURORA-CINEMA-STAFF-5G"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWifiModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: GHI NHẬN CHẤM CÔNG THỦ CÔNG (QUẢN LÝ BỔ SUNG)                  */}
      {/* =================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Chấm Công & Phân Bổ Ca</h3>
                  <p className="text-[11px] text-slate-500">Bổ sung chấm công khi nhân sự quên hoặc thiết bị lỗi</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhân Viên <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={modalEmployeeId}
                  onChange={(e) => setModalEmployeeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  {branchStaffList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.staffCode || u.id}) - {u.department || 'Nhân sự'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày Làm Việc:
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chi Nhánh Rạp:
                  </label>
                  <select
                    value={modalLocation}
                    onChange={(e) => setModalLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  >
                    {CINEMA_BRANCHES.filter(b => b !== 'Tất cả chi nhánh').map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ca Trực:
                </label>
                <select
                  value={modalShiftId}
                  onChange={(e) => {
                    const newShiftId = e.target.value;
                    setModalShiftId(newShiftId);
                    const s = AVAILABLE_SHIFTS.find(x => x.id === newShiftId) || AVAILABLE_SHIFTS[0];
                    const ev = evaluateCheckIn(modalCheckIn, s);
                    setModalStatus(ev.status);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  {AVAILABLE_SHIFTS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ Check-in Vào:
                  </label>
                  <input
                    type="time"
                    value={modalCheckIn}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      setModalCheckIn(newTime);
                      const s = AVAILABLE_SHIFTS.find(x => x.id === modalShiftId) || AVAILABLE_SHIFTS[0];
                      const ev = evaluateCheckIn(newTime, s);
                      setModalStatus(ev.status);
                    }}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ Check-out Ra:
                  </label>
                  <input
                    type="time"
                    value={modalCheckOut}
                    onChange={(e) => setModalCheckOut(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng Thái Đánh Giá:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="on_time"
                      checked={modalStatus === 'on_time'}
                      onChange={() => setModalStatus('on_time')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-emerald-700">✓ Đúng Giờ Chuẩn</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="late"
                      checked={modalStatus === 'late'}
                      onChange={() => setModalStatus('late')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-amber-700">⏱️ Đi Muộn (Late)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi Chú Ngoại Lệ:
                </label>
                <textarea
                  rows={2}
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Lý do ghi nhận bổ sung (VD: Nhân viên quên quẹt thẻ, quản lý duyệt trực tiếp)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none shadow-2xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lưu Chấm Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TẠO ĐƠN GIẢI TRÌNH MỚI (TỪ TAB 2)                            */}
      {/* =================================================================== */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Gửi Đơn Giải Trình Ngoại Lệ</h3>
                  <p className="text-[11px] text-slate-500">Giải trình đi muộn, quên chấm công hoặc xin nghỉ phép</p>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewException} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại Đơn <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={excType}
                    onChange={(e) => setExcType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  >
                    <option value="late_justification">Giải trình Đi Muộn</option>
                    <option value="leave_request">Đơn Xin Nghỉ Phép</option>
                    <option value="shift_swap">Yêu Cầu Đổi Ca Trực</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày Ca Làm Việc:
                  </label>
                  <input
                    type="date"
                    value={excDate}
                    onChange={(e) => setExcDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý Do Gợi Ý Nhanh:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_LATE_REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setExcReason(r)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội Dung Giải Trình Chi Tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  required
                  value={excReason}
                  onChange={(e) => setExcReason(e.target.value)}
                  placeholder="Ghi rõ chi tiết lý do và thời gian phát sinh sự cố..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none shadow-2xs font-medium"
                />
              </div>

              {/* Photo Proof Capture Component */}
              <ProofPhotoCapture
                proofImage={excProofImage}
                onImageChange={setExcProofImage}
                staffInfo={selectedUser?.name || 'Nhân sự rạp'}
              />

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Gửi Đơn Giải Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ZOOM XEM ẢNH MINH CHỨNG FULL SCREEN                          */}
      {/* =================================================================== */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2 animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={zoomImage} 
              alt="Minh chứng chi tiết" 
              className="max-h-[80vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
