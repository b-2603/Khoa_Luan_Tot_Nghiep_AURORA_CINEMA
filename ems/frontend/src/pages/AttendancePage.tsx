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
  FaceFeatures, NetworkConfig 
} from '../services/biometrics';
import { 
  Clock, CheckCircle2, AlertTriangle, AlertCircle, Search, Filter, Plus, Trash2, 
  UserCheck, LogIn, LogOut, Calendar, User as UserIcon, X, Sparkles, Building2,
  MapPin, Wifi, Camera, ShieldCheck, RefreshCw, Radio, Eye, Check, XCircle,
  Scan, Settings, UserPlus, FileText, Send, ArrowRight, Lock, CheckCheck,
  ChevronRight, CalendarDays
} from 'lucide-react';

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
  initialSubTab?: 'monitor' | 'exceptions' | 'punch';
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ 
  currentUser, 
  onUpdateUser, 
  onNavigateTab,
  initialSubTab 
}) => {
  const isManager = currentUser?.role === 'manager';
  
  // Tab chính được hợp nhất:
  // - 'monitor': Bảng Giám Sát Chấm Công Chi Nhánh (Check-in, ca làm việc, chi nhánh, so khớp giờ)
  // - 'exceptions': Xử Lý Lỗi Chấm Công & Duyệt Trễ (Đơn giải trình, duyệt miễn trừ, xử lý trễ/quên chấm)
  // - 'punch': Máy Quét Điểm Danh Face ID (Kiosk rạp)
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'exceptions' | 'punch'>(
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
    autoPunchLockRef.current = false;
    setIsAutoPunching(false);

    trackInterval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !isMounted || autoPunchLockRef.current) return;

      const track = await detectFaceInRealtime(video);
      if (!isMounted) return;
      setRealtimeFaceTrack(track);

      if (track.hasFace && track.confidence > 0.65 && !track.isOccluded && enrolledFace && !autoPunchLockRef.current) {
        autoPunchLockRef.current = true;
        setIsAutoPunching(true);

        const currentFace = await extractFaceFromVideo(video);
        if (currentFace && isMounted) {
          const result = compareFaces(currentFace, enrolledFace);
          setLastScanResult(result);

          if (result.isMatch) {
            setTimeout(() => {
              if (isMounted && executeVerifiedPunchRef.current) {
                executeVerifiedPunchRef.current(result);
              }
            }, 600);
          } else {
            setIsAutoPunching(false);
            autoPunchLockRef.current = false;
          }
        } else {
          setIsAutoPunching(false);
          autoPunchLockRef.current = false;
        }
      }
    }, 450);

    return () => {
      isMounted = false;
      if (trackInterval) clearInterval(trackInterval);
    };
  }, [isVerifyModalOpen, cameraReady, enrolledFace]);

  const startVerification = (type: 'check_in' | 'check_out') => {
    setVerifyActionType(type);
    setIsVerifyModalOpen(true);
    setLastScanResult(null);
    autoPunchLockRef.current = false;
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
    showToast(`Đã đăng ký Face ID thành công cho nhân sự ${selectedUser.name}!`, 'success');
  };

  const isWifiValid = Boolean(
    authorizedConfig.authorizedIp && 
    currentNetworkIp && 
    authorizedConfig.authorizedIp === currentNetworkIp
  );

  const handleCompleteVerifiedPunch = (scanResult?: { similarity: number; isMatch: boolean } | null) => {
    const finalScan = scanResult || lastScanResult;
    if (!selectedUser) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${hh}:${mm}`;

    if (verifyActionType === 'check_in') {
      const evaluation = evaluateCheckIn(currentTimeStr, selectedShift);
      const status: 'on_time' | 'late' = evaluation.status;
      const note = `[Face ID: ${finalScan?.similarity || 95}% • Wi-Fi rạp] ${evaluation.noteDetail}`;

      const newRecord: Attendance = {
        id: `att-${Date.now()}`,
        userId: selectedUser.id,
        userName: selectedUser.name,
        staffCode: selectedUser.phone || selectedUser.staffCode || '0901234567',
        date: todayStr,
        checkIn: currentTimeStr,
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
      const todayRecord = attendances.find(a => 
        (a.userId === selectedUser.id || a.userName === selectedUser.name) && 
        a.date === todayStr && !a.checkOut
      );
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
        note: `${todayRecord.note || ''} | [Check-out: ${currentTimeStr} - ${checkOutEval.note} • Face ID: ${finalScan?.similarity || 95}%]`.trim(),
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

    // 6. Đánh giá tính chuẩn xác theo ca làm việc (Shift Compliance)
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
        if (attRecord?.status === 'late') {
          compliance = {
            code: 'late',
            label: '⏱️ Đi muộn so với ca',
            subText: `Check-in ${attRecord.checkIn} (Ca bắt đầu ${shift?.startTime})`,
            badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
          };
        } else {
          compliance = {
            code: 'on_time',
            label: '✓ Đúng ca & đúng giờ',
            subText: `Check-in ${attRecord?.checkIn} (Đạt chuẩn)`,
            badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          };
        }
      }
    }

    // 7. Tìm đơn ngoại lệ đang chờ hoặc đã duyệt
    const matchedExc = exceptions.find(e => 
      (e.userId === staff.id || e.staffCode === staff.staffCode || e.userName.toLowerCase() === staff.name.toLowerCase()) && 
      e.targetDate === monitorDate
    );

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

      {/* Top Header & Integrated Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-800 font-bold">
                <Clock className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Quản Lý Chấm Công & Xử Lý Lỗi Vi Phạm Ca Trực
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kiểm tra nhân sự đã chấm công chưa, đúng giờ, chi nhánh nào, so khớp ca và phê duyệt xử lý ngoại lệ trễ.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end lg:self-center">
            {/* Live Clock Badge */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <div className="text-xs font-mono font-bold text-slate-800">{liveClock || '--:--:--'}</div>
            </div>

            {isManager && (
              <button
                onClick={() => {
                  setModalEmployeeId(users[0]?.id || '');
                  setModalDate(monitorDate);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ghi Nhận Chấm Công</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Unified Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            onClick={() => setActiveSubTab('monitor')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'monitor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Giám Sát Chấm Công & Ca Trực Chi Nhánh</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeSubTab === 'monitor' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {attendedCount}/{totalStaffCount}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('exceptions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
              activeSubTab === 'exceptions'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Xử Lý Lỗi Chấm Công & Duyệt Trễ</span>
            {pendingExceptionsCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                {pendingExceptionsCount} Chờ Duyệt
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                {exceptions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('punch')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'punch'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Scan className="w-4 h-4 text-amber-400" />
            <span>Kiosk Điểm Danh Face ID</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: GIÁM SÁT CHẤM CÔNG CHI NHÁNH & SO KHỚP CA LÀM VIỆC             */}
      {/* =================================================================== */}
      {activeSubTab === 'monitor' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Quick Statistics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between">
                <span>Tổng Nhân Sự Cụm Rạp</span>
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">{totalStaffCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Toàn bộ chi nhánh</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-700 flex items-center justify-between">
                <span>Đã Điểm Danh Ca</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-700 mt-1">{attendedCount}</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                Đạt {totalStaffCount > 0 ? Math.round((attendedCount / totalStaffCount) * 100) : 0}% tổng quân số
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="text-[11px] font-medium text-amber-700 flex items-center justify-between">
                <span>Đi Muộn Cần Duyệt Trễ</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-700 mt-1">{lateCountInMonitor}</div>
              <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                Có thể bấm duyệt miễn trừ ngay
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <div className="text-[11px] font-medium text-rose-700 flex items-center justify-between">
                <span>Chưa Chấm Công Theo Ca</span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-xl font-bold text-rose-700 mt-1">{notAttendedCount}</div>
              <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                Có ca nhưng chưa quẹt Face ID
              </div>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ngày Theo Dõi Chấm Công:</span>
                </label>
                <input
                  type="date"
                  value={monitorDate}
                  onChange={(e) => setMonitorDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              {/* Branch Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chi Nhánh Cụm Rạp:</span>
                </label>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {CINEMA_BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Shift Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ca Làm Việc Theo Lịch:</span>
                </label>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">Tất cả các ca</option>
                  {AVAILABLE_SHIFTS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-600" />
                  <span>Trạng Thái Điểm Danh:</span>
                </label>
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái ({staffMonitorRows.length})</option>
                  <option value="attended">Đã chấm công ({attendedCount})</option>
                  <option value="not_attended">Chưa chấm công ({notAttendedCount})</option>
                  <option value="late">Đi muộn ({lateCountInMonitor})</option>
                </select>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Tìm nhanh theo Tên nhân viên (VD: Huỳnh Văn Thái Bảo), Mã nhân sự, Nghiệp vụ hoặc Chi nhánh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* MAIN MONITORING TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Bảng Kiểm Tra Điểm Danh & Ca Trực ({formatDateDMY(monitorDate)})</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  {filteredMonitorRows.length} nhân sự
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                So khớp dữ liệu phân ca thực tế và máy quét Face ID
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Nhân Viên & Nghiệp Vụ</th>
                    <th className="px-4 py-3.5">Chi Nhánh</th>
                    <th className="px-4 py-3.5">Ca Phân Công Theo Lịch</th>
                    <th className="px-4 py-3.5">Giờ Chấm Công Thực Tế</th>
                    <th className="px-4 py-3.5">So Khớp Ca Làm Việc</th>
                    <th className="px-4 py-3.5 text-right">Xử Lý & Thao Tác Quản Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMonitorRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Không tìm thấy nhân viên nào phù hợp với bộ lọc ngày {formatDateDMY(monitorDate)}.
                      </td>
                    </tr>
                  ) : (
                    filteredMonitorRows.map((row) => (
                      <tr key={row.staff.id} className="hover:bg-slate-50/80 transition">
                        {/* Nhân Viên & Nghiệp Vụ */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {row.staff.avatar ? (
                              <img 
                                src={row.staff.avatar} 
                                alt={row.staff.name} 
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {row.staff.name?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{row.staff.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-amber-700 font-semibold">{row.staff.staffCode || row.staff.id}</span>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium truncate">
                                  {row.staff.department || 'Nhân viên rạp'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Chi Nhánh */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{row.branch}</span>
                          </div>
                        </td>

                        {/* Ca Phân Công Theo Lịch */}
                        <td className="px-4 py-3.5">
                          {row.scheduledItem ? (
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{row.shift?.name || row.scheduledItem.shiftName}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Khung giờ: <span className="font-mono font-medium text-slate-700">{row.shift?.startTime} - {row.shift?.endTime}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                              Không có lịch ca
                            </span>
                          )}
                        </td>

                        {/* Giờ Chấm Công Thực Tế */}
                        <td className="px-4 py-3.5">
                          {row.hasCheckedIn ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-mono text-xs">
                                <span className="text-slate-500 text-[10px]">Vào:</span>
                                <span className={`font-bold ${row.attRecord?.status === 'late' ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {row.attRecord?.checkIn}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-500 text-[10px]">Ra:</span>
                                <span className="font-bold text-slate-700">
                                  {row.attRecord?.checkOut || 'Đang trong ca'}
                                </span>
                              </div>
                              {row.attRecord?.hoursWorked ? (
                                <div className="text-[10px] text-slate-500">
                                  Đã làm: <strong className="text-slate-800">{row.attRecord.hoursWorked} giờ</strong>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              Chưa chấm công
                            </span>
                          )}
                        </td>

                        {/* So Khớp Ca Làm Việc */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold border ${row.compliance.badgeColor}`}>
                              {row.compliance.label}
                            </span>
                            {row.compliance.subText && (
                              <div className="text-[10px] text-slate-500 italic max-w-xs truncate">
                                {row.compliance.subText}
                              </div>
                            )}
                            {row.attRecord?.note && (
                              <div className="text-[9px] text-slate-400 font-mono max-w-xs truncate" title={row.attRecord.note}>
                                {row.attRecord.note}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Xử Lý & Thao Tác Quản Lý */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Nút Duyệt Trễ Nhanh (nếu đi muộn) */}
                            {row.compliance.code === 'late' && (
                              <button
                                onClick={() => row.attRecord && handleQuickForgiveLate(row.attRecord)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-[11px] font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                title="Phê duyệt miễn phạt đi muộn"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Duyệt Trễ</span>
                              </button>
                            )}

                            {/* Nút Ghi Nhận Chấm Công Bổ Sung (nếu chưa chấm) */}
                            {!row.hasCheckedIn && isManager && (
                              <button
                                onClick={() => {
                                  setModalEmployeeId(row.staff.id);
                                  setModalDate(monitorDate);
                                  if (row.shift) setModalShiftId(row.shift.id);
                                  setModalLocation(row.branch);
                                  setIsModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer"
                                title="Ghi nhận giờ vào ra bổ sung"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Chấm Bổ Sung</span>
                              </button>
                            )}

                            {/* Xóa bản ghi chấm công nếu cần */}
                            {row.attRecord && isManager && (
                              <button
                                onClick={() => handleDeleteAttendance(row.attRecord!.id, row.staff.name)}
                                title="Xóa bản ghi chấm công này"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      {/* TAB 2: XỬ LÝ LỖI CHẤM CÔNG & DUYỆT TRỄ (ĐƠN NGOẠI LỆ ĐƯỢC TẬP TRUNG)  */}
      {/* =================================================================== */}
      {activeSubTab === 'exceptions' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Exceptions Overview KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setExcStatusFilter('all')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                excStatusFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-medium opacity-80">Tất Cả Đơn</div>
              <div className="text-2xl font-bold mt-1">{exceptions.length}</div>
            </div>

            <div 
              onClick={() => setExcStatusFilter('pending')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                excStatusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                  : 'bg-white text-amber-700 border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="text-[11px] font-medium flex items-center justify-between">
                <span>Chờ Phê Duyệt</span>
                {pendingExceptionsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                )}
              </div>
              <div className="text-2xl font-bold mt-1">{pendingExceptionsCount}</div>
            </div>

            <div 
              onClick={() => setExcStatusFilter('approved')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                excStatusFilter === 'approved'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-white text-emerald-700 border-emerald-200 hover:border-emerald-300'
              }`}
            >
              <div className="text-[11px] font-medium opacity-80">Đã Phê Duyệt</div>
              <div className="text-2xl font-bold mt-1">{approvedExceptionsCount}</div>
            </div>

            <div 
              onClick={() => setExcStatusFilter('rejected')}
              className={`p-4 rounded-xl border transition cursor-pointer ${
                excStatusFilter === 'rejected'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                  : 'bg-white text-rose-700 border-rose-200 hover:border-rose-300'
              }`}
            >
              <div className="text-[11px] font-medium opacity-80">Đã Từ Chối</div>
              <div className="text-2xl font-bold mt-1">{rejectedExceptionsCount}</div>
            </div>
          </div>

          {/* Exceptions Header & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-amber-600" />
                Lọc loại đơn:
              </span>
              <button
                onClick={() => setExcTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  excTypeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả loại
              </button>
              <button
                onClick={() => setExcTypeFilter('late_justification')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  excTypeFilter === 'late_justification' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Giải trình Đi Muộn
              </button>
              <button
                onClick={() => setExcTypeFilter('leave_request')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  excTypeFilter === 'leave_request' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Nghỉ Phép
              </button>
              <button
                onClick={() => setExcTypeFilter('shift_swap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  excTypeFilter === 'shift_swap' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Đổi Ca
              </button>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Gửi Đơn Giải Trình Mới</span>
            </button>
          </div>

          {/* Exceptions List */}
          <div className="space-y-3">
            {filteredExceptions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Không có đơn giải trình hoặc ngoại lệ nào phù hợp với bộ lọc.</p>
              </div>
            ) : (
              filteredExceptions.map((exc) => (
                <div 
                  key={exc.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        exc.type === 'late_justification'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : exc.type === 'leave_request'
                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}>
                        {exc.typeTitle}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Ngày ca làm: <strong className="text-slate-800 font-mono">{formatDateDMY(exc.targetDate)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Nộp lúc: {exc.submittedAt}</span>
                      {exc.status === 'pending' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Chờ Duyệt
                        </span>
                      ) : exc.status === 'approved' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Đã Phê Duyệt
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          ✕ Bị Từ Chối
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{exc.userName}</strong>
                        <span className="text-xs font-mono text-amber-700 font-semibold">({exc.staffCode})</span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                        <span className="text-slate-400 font-bold mr-1">Lý do giải trình:</span>
                        "{exc.reason}"
                      </div>

                      {exc.reviewedBy && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Người duyệt: <strong>{exc.reviewedBy}</strong> {exc.reviewComment && `— "${exc.reviewComment}"`}</span>
                        </div>
                      )}
                    </div>

                    {/* Proof Photo Thumbnail */}
                    {exc.proofImage && (
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <div 
                          onClick={() => setZoomImage(exc.proofImage || null)}
                          className="w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-200 shadow-xs cursor-pointer group relative"
                        >
                          <img 
                            src={exc.proofImage} 
                            alt="Minh chứng" 
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                            <Eye className="w-4 h-4 mr-1" /> Xem ảnh
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-slate-400" /> Minh chứng ảnh
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Manager */}
                  {isManager && exc.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleActionException(exc.id, 'rejected')}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                      >
                        ✕ Từ Chối
                      </button>
                      <button
                        onClick={() => handleActionException(exc.id, 'approved')}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Phê Duyệt & Miễn Trừ Vi Phạm</span>
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
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Máy Quét Điểm Danh Ca Làm Việc Trực Tiếp
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

              {/* Action Punch Buttons triggering verification */}
              <div className="flex sm:flex-col gap-2.5 min-w-[220px]">
                <button
                  onClick={() => startVerification('check_in')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20 cursor-pointer transition shadow-xs"
                >
                  <LogIn className="w-4 h-4" />
                  Xác Thực & Check-in Vào Ca
                </button>

                <button
                  onClick={() => startVerification('check_out')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-500/20 cursor-pointer transition shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  Xác Thực & Check-out Tan Ca
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
                {isWifiValid ? 'Wi-Fi rạp' : 'Chưa vào Wi-Fi rạp'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/80">
                <MapPin className="w-3 h-3" />
                {resolveBranch(selectedUser)}
              </span>
            </div>

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
              {isAutoPunching ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Nhận diện thành công! Đang lưu chấm công...
                </span>
              ) : lastScanResult?.isMatch ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Đã khớp khuôn mặt ({lastScanResult.similarity}%)
                </span>
              ) : realtimeFaceTrack.isOccluded ? (
                <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  Vui lòng không che mặt hoặc bỏ khẩu trang
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

            {/* Enroll button for Manager */}
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
                disabled={isAutoPunching}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isAutoPunching ? 'Đang lưu...' : 'Xác Nhận'}
              </button>
            </div>
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
