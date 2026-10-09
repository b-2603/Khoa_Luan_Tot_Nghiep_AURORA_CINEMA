import React, { useState, useEffect, useRef } from 'react';
import { Attendance, User, AttendanceException } from '../types';
import { 
  getAttendances, saveAttendance, deleteAttendance, getUsers, updateUser, 
  getAttendanceExceptions, saveAttendanceException, updateAttendanceExceptionStatus 
} from '../services/storage';
import { 
  fetchAttendances, fetchEmployees, updateEmployee, 
  saveAttendanceApi, fetchAttendanceExceptions, submitAttendanceExceptionApi, 
  handleExceptionActionApi 
} from '../services/apiClient';
import { getTodayDateString } from '../utils/dateUtils';
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
  Scan, Settings, UserPlus, FileText, Send, ArrowRight, Lock
} from 'lucide-react';

interface AttendancePageProps {
  currentUser?: User | null;
  onUpdateUser?: (user: User) => void;
  onNavigateTab?: (tab: any) => void;
}

export const AVAILABLE_SHIFTS = [
  { id: 'shift-1', name: 'Ca Sáng (08:00 - 16:00)', startTime: '08:00', endTime: '16:00', code: 'SH1' },
  { id: 'shift-2', name: 'Ca Chiều (15:30 - 23:00)', startTime: '15:30', endTime: '23:00', code: 'SH2' },
  { id: 'shift-3', name: 'Ca Đêm / Suất Chiếu Muộn (22:00 - 02:00)', startTime: '22:00', endTime: '02:00', code: 'SH3' },
];

// Gợi ý ca làm việc theo giờ thực tế hiện tại
export const getRecommendedShiftId = (date = new Date()): string => {
  const totalM = date.getHours() * 60 + date.getMinutes();
  // 06:00 (360) đến 14:30 (870) -> Ca Sáng (08:00 - 16:00)
  if (totalM >= 360 && totalM < 870) return 'shift-1';
  // 14:30 (870) đến 21:30 (1290) -> Ca Chiều (15:30 - 23:00)
  if (totalM >= 870 && totalM < 1290) return 'shift-2';
  // 21:30 (1290) đến 05:59 (359) sáng hôm sau -> Ca Đêm (22:00 - 02:00)
  return 'shift-3';
};

export interface CheckInEvaluation {
  status: 'on_time' | 'late';
  diffMinutes: number;
  noteDetail: string;
  isWrongShiftWindow: boolean;
}

// Đánh giá tính hợp lệ và thời gian Check-in theo ca làm việc rạp chiếu phim
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
    // Ca đêm (22:00 -> 02:00): giờ rạng sáng (00:00 - 11:59) tính là sau nửa đêm (+ 1440 phút)
    if (currMinutes < 720) {
      currMinutes += 1440;
    }
  }

  const diffFromStart = currMinutes - startMinutes; // > 0: sau giờ bắt đầu, < 0: trước giờ bắt đầu

  // Quy chuẩn rạp chiếu phim Aurora:
  // - Cho phép đến sớm tối đa 60 phút để nhận bàn giao, chuẩn bị đồng phục
  // - Ân hạn đi muộn: tối đa 5 phút sau giờ bắt đầu ca
  const GRACE_PERIOD_MINUTES = 5;
  const ALLOWED_EARLY_MINUTES = 60;

  // 1. Check-in quá sớm trước giờ ca (> 60 phút)
  // Ví dụ: Ca Sáng 08:00 mà check in lúc 01:54 AM (sớm hơn 6 tiếng)
  if (diffFromStart < -ALLOWED_EARLY_MINUTES) {
    const earlyMinutes = Math.abs(diffFromStart);
    const earlyHours = Math.floor(earlyMinutes / 60);
    const remainingMins = earlyMinutes % 60;
    const timeText = earlyHours > 0 ? `${earlyHours}h${remainingMins > 0 ? `${remainingMins}p` : ''}` : `${earlyMinutes} phút`;
    
    return {
      status: 'late',
      diffMinutes: diffFromStart,
      isWrongShiftWindow: true,
      noteDetail: `Sai khung giờ ca trực (Lúc ${currentTimeStr}, sớm hơn ca ${shift.startTime}-${shift.endTime} tới ${timeText} - Không đúng giờ)`,
    };
  }

  // 2. Check-in đúng giờ: từ [start - 60 phút] đến [start + 5 phút]
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

  // 3. Check-in muộn (sau start + 5 phút)
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
    noteDetail: `Đi muộn ${lateText} (Check-in lúc ${currentTimeStr}, ca bắt đầu lúc ${shift.startTime})`,
  };
};

// Đánh giá Check-out và tính toán tổng số giờ làm việc (hỗ trợ ca qua đêm)
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

  // Xử lý ca qua đêm (Check-in ban đêm, Check-out rạng sáng hôm sau)
  if (outTotal < inTotal) {
    outTotal += 1440;
  }

  const diffMinutes = outTotal - inTotal;
  const hoursWorked = Math.max(0.1, Math.round((diffMinutes / 60) * 10) / 10);

  // So sánh với giờ kết thúc ca theo lịch
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

export const AttendancePage: React.FC<AttendancePageProps> = ({ currentUser, onUpdateUser, onNavigateTab }) => {
  const [attendances, setAttendances] = useState<Attendance[]>(getAttendances());
  const [users, setUsers] = useState<User[]>(getUsers());
  const [exceptions, setExceptions] = useState<AttendanceException[]>(getAttendanceExceptions());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late'>('all');

  // Quick exception submission modal state
  const [quickExceptionModalOpen, setQuickExceptionModalOpen] = useState(false);
  const [targetLateRecord, setTargetLateRecord] = useState<Attendance | null>(null);
  const [quickReason, setQuickReason] = useState('');
  
  // Quyền hạn tài khoản:
  // - Quản lý (Manager): Xem toàn bộ lịch sử rạp, quản lý phân công và ghi nhận bổ sung
  // - Nhân viên (Staff): CHỈ điểm danh cho chính mình, CHỈ xem lịch sử chấm công của chính tài khoản mình
  const isManager = currentUser?.role === 'manager';
  const selectedUser = (currentUser?.id ? users.find(u => u.id === currentUser.id) || currentUser : null) || users[0];
  const [selectedShiftId, setSelectedShiftId] = useState<string>(() => getRecommendedShiftId());
  const [liveClock, setLiveClock] = useState<string>('');
  
  // Verification Modal State (GPS + WiFi + Face Recognition)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyActionType, setVerifyActionType] = useState<'check_in' | 'check_out'>('check_in');
  
  // REAL NETWORK (WI-FI) STATE
  const [currentNetworkIp, setCurrentNetworkIp] = useState<string>('Đang dò mạng...');
  const [authorizedConfig, setAuthorizedConfig] = useState<NetworkConfig>(getAuthorizedWifiConfig());
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(false);

  // REAL FACE RECOGNITION STATE
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

  // GPS State
  const [gpsSimulatedFar, setGpsSimulatedFar] = useState(false);

  // Manual Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmployeeId, setModalEmployeeId] = useState('');
  const [modalShiftId, setModalShiftId] = useState('shift-1');
  const [modalDate, setModalDate] = useState(getTodayDateString());
  const [modalCheckIn, setModalCheckIn] = useState('08:00');
  const [modalCheckOut, setModalCheckOut] = useState('16:00');
  const [modalStatus, setModalStatus] = useState<'on_time' | 'late'>('on_time');
  const [modalNote, setModalNote] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Keep live time updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch API / sync storage
  useEffect(() => {
    fetchAttendances().then(data => {
      if (data && data.length > 0) setAttendances(data);
    });
    fetchEmployees().then(empList => {
      if (empList && empList.length > 0) {
        setUsers(empList);
      }
    });
    fetchAttendanceExceptions().then(excList => {
      if (excList && excList.length > 0) {
        setExceptions(excList);
      }
    });
  }, []);

  // Refresh enrolled face whenever selectedUser changes
  useEffect(() => {
    if (selectedUser?.id) {
      const savedFace = getEnrolledFace(selectedUser.id);
      setEnrolledFace(savedFace);
      setLastScanResult(null);
    }
  }, [selectedUser?.id]);

  // Load Real Network IP and default authorized Wi-Fi config
  const refreshNetworkInfo = async () => {
    setIsCheckingNetwork(true);
    const net = await detectCurrentNetwork();
    setCurrentNetworkIp(net.ip);
    setIsCheckingNetwork(false);

    const currentConfig = getAuthorizedWifiConfig();
    if (!currentConfig.authorizedIp && net.ip) {
      const initial = setAuthorizedWifiConfig(net.ip, 'Wi-Fi Cụm Rạp Aurora Cinema (Đã Lưu)');
      setAuthorizedConfig(initial);
    } else {
      setAuthorizedConfig(currentConfig);
    }
  };

  // Khởi động Camera thật của chính thiết bị hiện tại khi mở modal
  const initCameraStream = async (targetDeviceId?: string) => {
    setCameraError(false);
    setCameraReady(false);
    setCameraErrorMessage('');

    // Chờ 1 chút để video ref mount
    await new Promise(r => setTimeout(r, 100));
    const video = videoRef.current;
    if (!video) return;

    const devId = targetDeviceId || selectedCameraId;
    const result = await startWebcamStream(video, devId || undefined);
    if (result.stream) {
      mediaStreamRef.current = result.stream;
      setActiveCameraName(result.activeCameraName || 'Camera thiết bị');
      setCameraReady(true);
      setCameraError(false);

      // Lấy danh sách các camera có sẵn trên máy
      getAvailableCameras().then(cams => {
        setAvailableCameras(cams);
      });
    } else {
      setCameraError(true);
      setCameraErrorMessage(result.error || 'Không thể kết nối camera của thiết bị này.');
    }
  };

  useEffect(() => {
    if (isVerifyModalOpen) {
      setLastScanResult(null);
      setIsFaceScanning(false);
      autoPunchLockRef.current = false;
      setIsAutoPunching(false);
      refreshNetworkInfo();
      initCameraStream();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      setCameraReady(false);
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isVerifyModalOpen]);

  const executeVerifiedPunchRef = useRef<(scanResult?: { similarity: number; isMatch: boolean } | null) => void>(() => {});

  // Theo dõi bắt nét khuôn mặt & TỰ ĐỘNG SO KHỚP CHẤM CÔNG (Auto Face Scan & Punch Loop)
  useEffect(() => {
    if (!isVerifyModalOpen) return;

    let cancelled = false;
    let busy = false;

    const tick = async () => {
      const video = videoRef.current;
      if (busy || cancelled || !video || autoPunchLockRef.current) return;
      busy = true;
      try {
        // 1. Nhận diện khuôn mặt thật theo thời gian thực
        const track = await detectFaceInRealtime(video);
        if (cancelled || autoPunchLockRef.current) return;

        setRealtimeFaceTrack({
          hasFace: track.hasFace,
          confidence: track.confidence,
          isOccluded: track.isOccluded,
          occlusionReason: track.occlusionReason
        });

        // Không có mặt thật trong vòng tròn hoặc đang bị che khuất
        if (!track.hasFace || track.isOccluded) {
          setLastScanResult(null);
          return;
        }

        // 2. Tự động so khớp với mặt mẫu & điểm danh
        if (!enrolledFace) return;
        const currentFace = await extractFaceFromVideo(video, track);
        if (!currentFace || cancelled || autoPunchLockRef.current) return;

        const result = compareFaces(currentFace, enrolledFace);
        setLastScanResult(result);

        if (result.isMatch) {
          const canPunch = !gpsSimulatedFar && Boolean(
            authorizedConfig.authorizedIp &&
            currentNetworkIp &&
            authorizedConfig.authorizedIp === currentNetworkIp
          );

          if (canPunch) {
            // Khóa lại tránh lặp lại nhiều lần
            autoPunchLockRef.current = true;
            setIsAutoPunching(true);

            // Hiệu ứng 450ms sáng viền xanh rồi tự động hoàn tất điểm danh
            setTimeout(() => {
              executeVerifiedPunchRef.current(result);
            }, 450);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        busy = false;
      }
    };

    const interval = setInterval(tick, 400);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isVerifyModalOpen, enrolledFace, gpsSimulatedFar, authorizedConfig.authorizedIp, currentNetworkIp]);

  const todayStr = getTodayDateString();
  const selectedShift = AVAILABLE_SHIFTS.find(s => s.id === selectedShiftId) || AVAILABLE_SHIFTS[0];

  // Ca đang mở (đã Check-in nhưng chưa Check-out) hôm nay của nhân sự
  const activeRecord = attendances.find(a => 
    (a.userId === selectedUser?.id || a.userName.toLowerCase() === selectedUser?.name.toLowerCase()) && 
    a.date === todayStr &&
    !a.checkOut
  );

  // Ca gần nhất trong ngày hôm nay của nhân sự
  const latestTodayRecord = attendances
    .filter(a => 
      (a.userId === selectedUser?.id || a.userName.toLowerCase() === selectedUser?.name.toLowerCase()) && 
      a.date === todayStr
    )
    .slice(-1)[0] || null;

  // Bản ghi dùng để hiển thị trạng thái
  const todayRecord = activeRecord || latestTodayRecord;

  // Trigger Verification Workflow
  const startVerification = (action: 'check_in' | 'check_out') => {
    setVerifyActionType(action);
    setLastScanResult(null);
    autoPunchLockRef.current = false;
    setIsAutoPunching(false);
    setIsVerifyModalOpen(true);
  };

  // 1. ACTION: ĐĂNG KÝ / CHỤP KHUÔN MẶT MẪU THẬT TỪ WEBCAM (ENROLLMENT - CHỈ QUẢN LÝ)
  const handleEnrollFace = async () => {
    if (!isManager) {
      alert('Quyền truy cập bị từ chối: Chỉ Quản lý rạp / HR mới có thẩm quyền đăng ký hoặc cập nhật dữ liệu Face ID!');
      return;
    }

    const video = videoRef.current;
    if (!video) {
      alert('Camera chưa sẵn sàng!');
      return;
    }

    const face = await extractFaceFromVideo(video);
    if (!face) {
      alert('Chưa nhận diện được khuôn mặt thật. Hãy nhìn thẳng vào giữa vòng tròn, bỏ tay/vật che ra và thử lại!');
      return;
    }

    // 1. Lưu vector đặc trưng Face ID và hình ảnh sinh trắc học vào hệ thống (Không đè ảnh hồ sơ)
    saveEnrolledFace(selectedUser.id, face);
    setEnrolledFace(face);
    setLastScanResult(null);

    showNotification(`Đã lưu dữ liệu Face ID của ${selectedUser.name} vào hệ thống thành công!`, 'success');
  };

  // 2. ACTION: QUÉT VÀ SO KHỚP KHUÔN MẶT THẬT (REAL SCAN & COMPARE)
  const handleRealFaceScan = () => {
    const video = videoRef.current;
    if (!video) {
      alert('Camera chưa sẵn sàng kết nối!');
      return;
    }
    if (!enrolledFace) {
      alert('Bạn chưa lưu khuôn mặt mẫu! Hãy bấm nút "📸 Chụp & Lưu Mặt Mẫu" trước.');
      return;
    }

    setIsFaceScanning(true);
    setTimeout(async () => {
      const currentFace = await extractFaceFromVideo(video);
      if (!currentFace) {
        setIsFaceScanning(false);
        setLastScanResult({ similarity: 0, isMatch: false, reason: 'Chưa nhận được tín hiệu hình ảnh từ camera.' });
        return;
      }

      // SO KHỚP THẬT BẰNG COSINE SIMILARITY
      const result = compareFaces(currentFace, enrolledFace);
      setLastScanResult(result);
      setIsFaceScanning(false);

      if (result.isMatch) {
        showNotification(`Xác thực thành công! Độ trùng khớp khuôn mặt: ${result.similarity}%`, 'success');
      } else {
        showNotification(`Từ chối: ${result.reason}`, 'error');
      }
    }, 1000);
  };

  // 3. ACTION: CÀI ĐẶT WI-FI HIỆN TẠI LÀM WI-FI RẠP
  const handleSetCurrentAsCinemaWifi = () => {
    if (!currentNetworkIp || currentNetworkIp.includes('Đang')) return;
    const updated = setAuthorizedWifiConfig(currentNetworkIp, 'Wi-Fi Cụm Rạp Aurora (Mạng Hiện Tại)');
    setAuthorizedConfig(updated);
    showNotification(`Đã thiết lập IP [${currentNetworkIp}] làm Wi-Fi Rạp được cấp phép!`, 'success');
  };

  // CHECK CONSTRAINTS VALIDATION
  const isGpsValid = !gpsSimulatedFar;
  const isWifiValid = Boolean(
    authorizedConfig.authorizedIp && 
    currentNetworkIp && 
    authorizedConfig.authorizedIp === currentNetworkIp
  );
  const isFaceValid = Boolean(lastScanResult && lastScanResult.isMatch);
  const isAllValid = isGpsValid && isWifiValid && isFaceValid;

  // Tự động kiểm tra và hiệu chỉnh các bản ghi bị tính sai trạng thái "Đúng giờ" khi check-in rạng sáng
  useEffect(() => {
    const list = getAttendances();
    let changed = false;
    const fixed = list.map(item => {
      if (item.date === todayStr && item.checkIn && item.status === 'on_time') {
        const [h] = item.checkIn.split(':').map(Number);
        // Nếu check-in rạng sáng trước 07:00 (ví dụ 01:54 AM) mà bị tính là on_time của ca ngày
        if (h < 7) {
          changed = true;
          const shift1 = AVAILABLE_SHIFTS[0];
          const evalRes = evaluateCheckIn(item.checkIn, shift1);
          return {
            ...item,
            status: evalRes.status,
            note: item.note 
              ? item.note.replace('Đúng giờ chuẩn', evalRes.noteDetail)
              : evalRes.noteDetail
          };
        }
      }
      return item;
    });

    if (changed) {
      fixed.forEach(saveAttendance);
      setAttendances(getAttendances());
    }
  }, [todayStr]);

  // Complete verified punch action (Cả TỰ ĐỘNG & THỦ CÔNG)
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
        staffCode: selectedUser.staffCode || `AR-${selectedUser.id}`,
        date: todayStr,
        checkIn: currentTimeStr,
        status,
        hoursWorked: 0,
        note,
      };

      saveAttendance(newRecord);
      saveAttendanceApi(newRecord);
      setAttendances(getAttendances());
      setIsVerifyModalOpen(false);
      setIsAutoPunching(false);
      showNotification(
        `⚡ ĐÃ TỰ ĐỘNG CHECK-IN! Nhân sự ${selectedUser.name} (${finalScan?.similarity || 95}%). Check-in lúc ${currentTimeStr} (${status === 'on_time' ? 'Đúng giờ' : 'Đi muộn / Lệch ca'})!`,
        status === 'on_time' ? 'success' : 'info'
      );
    } else {
      const recordToCheckout = activeRecord || todayRecord;
      if (!recordToCheckout || recordToCheckout.checkOut) {
        setIsVerifyModalOpen(false);
        setIsAutoPunching(false);
        showNotification('Không tìm thấy ca Check-in đang mở hôm nay để Check-out!', 'error');
        return;
      }
      
      const checkOutEval = evaluateCheckOut(recordToCheckout.checkIn || currentTimeStr, currentTimeStr, selectedShift);

      const updated: Attendance = {
        ...recordToCheckout,
        checkOut: currentTimeStr,
        hoursWorked: checkOutEval.hoursWorked,
        note: `${recordToCheckout.note || ''} | [Check-out: ${currentTimeStr} - ${checkOutEval.note} • Face ID: ${finalScan?.similarity || 95}%]`.trim(),
      };

      saveAttendance(updated);
      saveAttendanceApi(updated);
      setAttendances(getAttendances());
      setIsVerifyModalOpen(false);
      setIsAutoPunching(false);
      showNotification(
        `⚡ ĐÃ TỰ ĐỘNG CHECK-OUT! Nhân sự ${selectedUser.name} (${finalScan?.similarity || 95}%). Tổng giờ làm: ${updated.hoursWorked}h (${checkOutEval.note})`,
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
      staffCode: targetUser.staffCode || `AR-${targetUser.id}`,
      date: modalDate,
      checkIn: modalCheckIn,
      checkOut: modalCheckOut,
      status: finalStatus,
      hoursWorked: hours,
      note: modalNote || `Quản lý ghi nhận thủ công - ${finalStatus === 'late' ? 'Đi muộn' : 'Đúng giờ'} (${checkoutNote || checkinEval.noteDetail})`,
    };

    saveAttendance(newRecord);
    saveAttendanceApi(newRecord);
    setAttendances(getAttendances());
    setIsModalOpen(false);
    showNotification(`Đã ghi nhận chấm công cho nhân sự ${targetUser.name}!`, 'success');
  };

  // Delete attendance record
  const handleDeleteAttendance = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bản ghi chấm công của ${name}?`)) {
      deleteAttendance(id);
      setAttendances(getAttendances());
      showNotification(`Đã xóa bản ghi chấm công của ${name}.`, 'info');
    }
  };

  // Nộp đơn giải trình nhanh cho ca đi muộn (Nhân viên)
  const handleOpenQuickException = (att: Attendance) => {
    setTargetLateRecord(att);
    setQuickReason('');
    setQuickExceptionModalOpen(true);
  };

  const handleQuickSubmitException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLateRecord || !quickReason.trim()) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    const newExc = {
      userId: targetLateRecord.userId,
      userName: targetLateRecord.userName,
      staffCode: targetLateRecord.staffCode,
      type: 'late_justification' as const,
      typeTitle: 'Giải trình Đi Muộn',
      reason: quickReason,
      targetDate: targetLateRecord.date,
      status: 'pending' as const,
      submittedAt: `${getTodayDateString()} ${hh}:${mm}`,
    };

    saveAttendanceException(newExc);
    await submitAttendanceExceptionApi(newExc);
    setExceptions(getAttendanceExceptions());
    setQuickExceptionModalOpen(false);
    setQuickReason('');
    showNotification('Đã gửi đơn giải trình thành công tới Quản lý rạp! Đơn đang chờ duyệt.', 'success');
  };

  // Quản lý phê duyệt nhanh đơn giải trình ngay từ bảng chấm công
  const handleQuickApproveException = async (excId: string, att: Attendance) => {
    const reviewerName = currentUser?.name || 'Phạm Thu Hương (Manager)';
    const comment = 'Quản lý phê duyệt miễn trừ trực tiếp từ Bảng Chấm Công.';
    
    updateAttendanceExceptionStatus(excId, 'approved', reviewerName, comment);
    await handleExceptionActionApi(excId, 'approved', comment);

    const updatedAtt: Attendance = {
      ...att,
      note: `${att.note || ''} | [Quản lý ${reviewerName} đã duyệt giải trình đi muộn]`.trim(),
    };

    saveAttendance(updatedAtt);
    await saveAttendanceApi(updatedAtt);

    setAttendances(getAttendances());
    setExceptions(getAttendanceExceptions());
    showNotification(`Đã phê duyệt miễn trừ vi phạm cho nhân sự ${att.userName}!`, 'success');
  };

  // Phân quyền dữ liệu chấm công:
  // - Quản lý (Manager): Xem toàn bộ lịch sử chấm công của tất cả nhân sự
  // - Nhân viên (Staff): CHỈ xem lịch sử chấm công của chính tài khoản mình
  const scopedAttendances = isManager
    ? attendances
    : attendances.filter(a => 
        (selectedUser?.id && a.userId === selectedUser.id) || 
        (selectedUser?.staffCode && a.staffCode === selectedUser.staffCode) ||
        (selectedUser?.name && a.userName.toLowerCase() === selectedUser.name.toLowerCase())
      );

  // Filtered attendances for table
  const filtered = scopedAttendances.filter(a => {
    const matchesSearch = 
      a.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.staffCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.date && a.date.includes(searchTerm)) ||
      (a.note && a.note.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate quick stats dựa trên dữ liệu được phép xem
  const totalRecords = scopedAttendances.length;
  const onTimeCount = scopedAttendances.filter(a => a.status === 'on_time').length;
  const lateCount = scopedAttendances.filter(a => a.status === 'late').length;
  const onTimeRate = totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 100;

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
          <CheckCircle2 className="w-5 h-5" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isManager ? 'Quản Lý Chấm Công Nhân Sự' : 'Lịch Sử Điểm Danh & Chấm Công Cá Nhân'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isManager 
              ? 'Theo dõi và quản lý ca làm việc toàn bộ nhân sự cụm rạp.' 
              : 'Ghi nhận ca trực và nhận diện sinh trắc học Face ID.'}
          </p>
        </div>
        {isManager && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setModalEmployeeId(users[0]?.id || '');
                setModalDate(todayStr);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Ghi Nhận Thủ Công
            </button>
          </div>
        )}
      </div>

      {/* Banner Thông Báo Đơn Ngoại Lệ Cần Duyệt (Quản lý) */}
      {isManager && exceptions.filter(e => e.status === 'pending').length > 0 && (
        <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Có {exceptions.filter(e => e.status === 'pending').length} đơn giải trình ngoại lệ chấm công đang chờ phê duyệt</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              </div>
            </div>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('attendance-exceptions')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              <span>Đi Đến Duyệt Đơn Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* QUICK PUNCH CARD: Interactive Check-in / Check-out */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-50 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Điểm Danh Ca Làm Việc
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Authenticated Staff Card (Tài khoản chính chủ - Không cho phép chọn người khác) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tài Khoản Điểm Danh:
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

                {/* Trạng thái dự kiến thời gian thực nếu điểm danh ngay bây giờ */}
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

              {/* Live Clock & Info */}
              <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">Giờ Hệ Thống Rạp Chiếu</div>
                  <div className="text-sm font-mono font-bold text-slate-900">{liveClock || '--:--:--'}</div>
                </div>
              </div>
            </div>


            {/* Current status of selected staff */}
            {selectedUser && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-600">Trạng thái ca hôm nay của <strong>{selectedUser.name}</strong>:</span>
                {activeRecord ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                    ⏳ Đang trong ca (Check-in lúc {activeRecord.checkIn} - {activeRecord.status === 'on_time' ? 'Đúng giờ' : 'Đi muộn'})
                  </span>
                ) : latestTodayRecord?.checkOut ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    ✓ Đã hoàn thành ca ({latestTodayRecord.checkIn} → {latestTodayRecord.checkOut} | {latestTodayRecord.hoursWorked} giờ) • Sẵn sàng nhận ca tiếp theo
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                    Chưa điểm danh ca trực hôm nay ({todayStr})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Punch Buttons triggering verification */}
          <div className="flex sm:flex-col gap-2.5 min-w-[220px]">
            <button
              onClick={() => startVerification('check_in')}
              disabled={Boolean(activeRecord)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition shadow-xs ${
                activeRecord
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20 cursor-pointer'
              }`}
            >
              <LogIn className="w-4 h-4" />
              {latestTodayRecord?.checkOut ? 'Xác Thực & Check-in Ca Tiếp Theo (+)' : 'Xác Thực & Check-in Vào Ca'}
            </button>

            <button
              onClick={() => startVerification('check_out')}
              disabled={!activeRecord}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition shadow-xs ${
                !activeRecord
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-500/20 cursor-pointer'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Xác Thực & Check-out Tan Ca
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">
            {isManager ? 'Tổng Lượt Chấm Công Toàn Rạp' : 'Tổng Ca Điểm Danh Của Bạn'}
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalRecords}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-emerald-600">
            {isManager ? 'Số Ca Đúng Giờ' : 'Ca Đi Đúng Giờ'}
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{onTimeCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-amber-600">
            {isManager ? 'Đi Muộn / Cần Giải Trình' : 'Ca Đi Muộn / Lệch Ca'}
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">{lateCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500">
            {isManager ? 'Tỷ Lệ Chuyên Cần Cụm Rạp' : 'Tỷ Lệ Chuyên Cần Của Bạn'}
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{onTimeRate}%</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={isManager ? "Tìm theo Tên nhân viên (VD: Thái Bảo) hoặc Mã nhân sự..." : "Tìm kiếm lịch sử theo Ngày (VD: 2026-10-09), Ghi chú..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả ({totalRecords})
          </button>
          <button
            onClick={() => setStatusFilter('on_time')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'on_time'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Đúng giờ ({onTimeCount})
          </button>
          <button
            onClick={() => setStatusFilter('late')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'late'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Đi muộn ({lateCount})
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Mã & Nhân Viên</th>
                <th className="px-4 py-3.5">Ngày Chấm Công</th>
                <th className="px-4 py-3.5">Giờ Check-in</th>
                <th className="px-4 py-3.5">Giờ Check-out</th>
                <th className="px-4 py-3.5 text-center">Tổng Giờ Làm</th>
                <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                <th className="px-4 py-3.5">Dữ Liệu Ràng Buộc & Ghi Chú</th>
                {isManager && <th className="px-4 py-3.5 text-right">Thao Tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="px-4 py-8 text-center text-slate-400">
                    {isManager 
                      ? 'Không tìm thấy bản ghi chấm công nào phù hợp.' 
                      : 'Bạn chưa có bản ghi chấm công nào phù hợp với bộ lọc.'}
                  </td>
                </tr>
              ) : (
                filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{att.userName}</div>
                      <div className="text-[10px] font-mono text-amber-700 font-semibold">{att.staffCode}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-600">{att.date}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600 font-bold">{att.checkIn || '--'}</td>
                    <td className="px-4 py-3 font-mono text-amber-600 font-bold">{att.checkOut || '--'}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">{att.hoursWorked} giờ</td>
                    <td className="px-4 py-3 text-center">
                      {att.status === 'on_time' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Đúng Giờ
                        </span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Đi Muộn
                          </span>

                          {/* Trạng thái đơn giải trình ngoại lệ */}
                          {(() => {
                            const matchedExc = exceptions.find(e => 
                              (e.userId === att.userId || e.userName === att.userName || e.staffCode === att.staffCode) && 
                              e.targetDate === att.date
                            );

                            if (matchedExc) {
                              if (matchedExc.status === 'pending') {
                                return (
                                  <div className="flex flex-col items-center gap-1 mt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold whitespace-nowrap">
                                      ⏳ Chờ Quản lý duyệt
                                    </span>
                                    {isManager && (
                                      <button
                                        onClick={() => handleQuickApproveException(matchedExc.id, att)}
                                        className="text-[9px] px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-xs transition cursor-pointer"
                                      >
                                        ✓ Duyệt Ngay
                                      </button>
                                    )}
                                  </div>
                                );
                              } else if (matchedExc.status === 'approved') {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold whitespace-nowrap mt-0.5">
                                    ✓ Đã duyệt miễn trừ
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-bold whitespace-nowrap mt-0.5">
                                    ✕ Bị từ chối
                                  </span>
                                );
                              }
                            } else {
                              if (!isManager) {
                                return (
                                  <button
                                    onClick={() => handleOpenQuickException(att)}
                                    className="text-[9px] px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold shadow-xs transition flex items-center gap-1 mt-0.5 cursor-pointer"
                                  >
                                    📝 Gửi Giải Trình
                                  </button>
                                );
                              } else {
                                return (
                                  <span className="text-[9px] text-slate-400 italic mt-0.5">
                                    Chưa nộp đơn
                                  </span>
                                );
                              }
                            }
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px] max-w-sm">
                      <div className="truncate font-mono">{att.note || '—'}</div>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAttendance(att.id, att.userName)}
                          title="Xóa bản ghi"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHẤM CÔNG KHUÔN MẶT (GIAO DIỆN TINH GỌN, HIỆN ĐẠI) */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center relative animate-in zoom-in-95 duration-150">
            {/* Nút đóng */}
            <button
              onClick={() => setIsVerifyModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tiêu đề ngắn gọn, thân thiện */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 shadow-2xs">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Chấm công {verifyActionType === 'check_in' ? 'vào ca' : 'ra ca'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedUser?.name} • <span className="font-medium text-slate-700">{selectedShift?.name ? selectedShift.name.split(' (')[0] : 'Ca làm việc'}</span>
            </p>

            {/* Trạng thái Wi-Fi & Vị trí gọn gàng */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 mb-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isWifiValid 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                  : 'bg-rose-50 text-rose-700 border-rose-200/80'
              }`}>
                <Wifi className="w-3 h-3" />
                {isWifiValid ? 'Wi-Fi rạp' : 'Chưa vào Wi-Fi rạp'}
              </span>

              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isGpsValid 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                  : 'bg-rose-50 text-rose-700 border-rose-200/80'
              }`}>
                <MapPin className="w-3 h-3" />
                {isGpsValid ? 'Tại rạp' : 'Ngoài rạp'}
              </span>

              <button
                type="button"
                onClick={refreshNetworkInfo}
                disabled={isCheckingNetwork}
                className="text-[11px] text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 px-2 py-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                title="Quét lại mạng Wi-Fi"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingNetwork ? 'animate-spin' : ''}`} />
                <span>Kiểm tra lại</span>
              </button>
            </div>

            {/* Khung camera tròn phong cách Face ID tối giản */}
            <div className="relative w-56 h-56 rounded-full overflow-hidden bg-slate-950 border-4 border-slate-100 shadow-xl flex items-center justify-center my-1">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Vòng nhận diện nhẹ nhàng */}
              <div className={`absolute inset-3 rounded-full border-2 transition-all duration-300 pointer-events-none ${
                isAutoPunching || isFaceValid
                  ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)] scale-102'
                  : realtimeFaceTrack.isOccluded
                  ? 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse'
                  : realtimeFaceTrack.hasFace
                  ? 'border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                  : 'border-white/35 border-dashed'
              }`} />

              {/* Lỗi camera nếu có */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center z-20">
                  <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                  <p className="text-xs text-slate-200 font-medium mb-2.5">Không thể mở camera</p>
                  <button
                    type="button"
                    onClick={() => initCameraStream()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>

            {/* Chọn camera nếu có nhiều camera */}
            {availableCameras.length > 1 && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    initCameraStream(e.target.value);
                  }}
                  className="bg-transparent text-slate-600 text-[11px] font-medium border-0 focus:outline-none cursor-pointer hover:text-indigo-600 max-w-[200px] truncate"
                >
                  {availableCameras.map((cam, idx) => (
                    <option key={cam.deviceId || idx} value={cam.deviceId}>
                      {cam.label ? cam.label.replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)/g, '').trim() : `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Trạng thái nhận diện ngắn gọn, đời thường */}
            <div className="mt-3 min-h-[22px] flex items-center justify-center text-center px-2">
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
                <span className="text-xs font-medium text-indigo-600 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang nhận diện khuôn mặt...
                </span>
              ) : enrolledFace ? (
                <span className="text-xs text-slate-500 font-medium">
                  Vui lòng nhìn thẳng vào camera để nhận diện
                </span>
              ) : isManager ? (
                <span className="text-xs text-amber-700 font-medium">
                  Nhân viên chưa có ảnh mẫu. Quản lý bấm nút bên dưới để chụp.
                </span>
              ) : (
                <span className="text-xs text-amber-700 font-medium">
                  Chưa có dữ liệu khuôn mặt. Vui lòng liên hệ Quản lý.
                </span>
              )}
            </div>

            {/* Quyền đăng ký Face ID (CHỈ QUẢN LÝ MỚI ĐƯỢC PHÉP) */}
            <div className="w-full mt-3">
              {!enrolledFace ? (
                isManager ? (
                  <button
                    type="button"
                    onClick={handleEnrollFace}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    Đăng ký khuôn mặt cho nhân viên
                  </button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 text-center leading-relaxed">
                    Tài khoản chưa có dữ liệu khuôn mặt. Bạn hãy nhờ Quản lý ca đăng ký giúp nhé.
                  </div>
                )
              ) : (
                isManager && (
                  <button
                    type="button"
                    onClick={handleEnrollFace}
                    className="text-xs text-slate-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Chụp lại khuôn mặt</span>
                  </button>
                )
              )}
            </div>

            {/* Cảnh báo nhẹ nếu chưa đúng Wi-Fi */}
            {!isWifiValid && (
              <div className="w-full mt-2.5 p-2 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>Vui lòng kết nối vào Wi-Fi rạp để điểm danh</span>
              </div>
            )}

            {/* Nút bấm thao tác */}
            <div className="w-full flex items-center gap-2.5 mt-4 pt-3.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => handleCompleteVerifiedPunch()}
                disabled={!isAllValid || isAutoPunching}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isAllValid
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <Check className="w-4 h-4" />
                {isAutoPunching ? 'Đang lưu...' : 'Chấm công'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thêm ghi nhận chấm công thủ công (Quản lý) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Ghi Nhận Chấm Công Thủ Công</h3>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Select Employee */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhân Viên <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={modalEmployeeId}
                  onChange={(e) => setModalEmployeeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.staffCode || u.id}) - {u.department || 'Nhân sự'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Shift */}
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    {AVAILABLE_SHIFTS.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Check-in & Check-out */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ Check-in:
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ Check-out:
                  </label>
                  <input
                    type="time"
                    value={modalCheckOut}
                    onChange={(e) => setModalCheckOut(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng Thái Điểm Danh:
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="on_time"
                      checked={modalStatus === 'on_time'}
                      onChange={() => setModalStatus('on_time')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-emerald-700">Đúng Giờ (On Time)</span>
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
                    <span className="font-semibold text-amber-700">Đi Muộn (Late)</span>
                  </label>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi Chú / Lý Do:
                </label>
                <textarea
                  rows={2}
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Nhập ghi chú hoặc lý do ngoại lệ..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Lưu Chấm Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Gửi Đơn Giải Trình Nhanh Cho Ca Bị Đi Muộn (Nhân Viên) */}
      {quickExceptionModalOpen && targetLateRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Gửi Giải Trình Cho Ca Bị Đi Muộn</h3>
                </div>
              </div>
              <button
                onClick={() => setQuickExceptionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-xs space-y-1">
              <div><strong>Nhân sự:</strong> {targetLateRecord.userName} <span className="font-mono text-amber-700">({targetLateRecord.staffCode})</span></div>
              <div><strong>Ngày ca làm:</strong> <span className="font-mono font-bold text-slate-800">{targetLateRecord.date}</span></div>
              <div>
                <strong>Thời điểm Check-in:</strong> <span className="font-mono text-amber-700 font-bold">{targetLateRecord.checkIn || '--'}</span>
              </div>
              <div className="text-[11px] text-slate-500 italic mt-1">
                Ghi chú hệ thống: {targetLateRecord.note || 'Đi muộn'}
              </div>
            </div>

            <form onSubmit={handleQuickSubmitException} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý Do Đi Muộn Chi Tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  required
                  value={quickReason}
                  onChange={(e) => setQuickReason(e.target.value)}
                  placeholder="Mô tả chi tiết nguyên nhân khách quan (ví dụ: Xe bị hỏng trên đường đến rạp, hỗ trợ khách hàng khẩn cấp tại phòng chiếu IMAX, sự cố thời tiết mưa ngập...)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickExceptionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition"
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
    </div>
  );
};
