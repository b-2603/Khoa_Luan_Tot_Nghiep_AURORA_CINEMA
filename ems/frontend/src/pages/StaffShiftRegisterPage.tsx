import React, { useState, useEffect } from 'react';
import { User, ShiftRegistration, Shift } from '../types';
import { INITIAL_SHIFTS } from '../services/mockData';
import { getShiftRegistrations, saveShiftRegistration, deleteShiftRegistration } from '../services/storage';
import { fetchShiftRegistrations, registerShiftPreference, cancelShiftRegistration, fetchShifts } from '../services/apiClient';
import { 
  CalendarPlus, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Check, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { getUpcomingDays, checkShiftRegistrationWindow } from '../utils/dateUtils';

interface StaffShiftRegisterPageProps {
  currentUser: User;
  onNavigateToSchedule?: () => void;
}

export const StaffShiftRegisterPage: React.FC<StaffShiftRegisterPageProps> = ({ currentUser, onNavigateToSchedule }) => {
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Chế độ kiểm thử (Demo) cho phép thử nghiệm cả trạng thái Mở (T3 - T5) và Khóa (Sau T5)
  const [simulationMode, setSimulationMode] = useState<'realtime' | 'simulate_open' | 'simulate_closed'>('realtime');

  // Tính toán trạng thái Cổng Đăng Ký (Chỉ mở từ Thứ 3 đến Thứ 5 hàng tuần)
  const simulatedDate = simulationMode === 'simulate_open'
    ? new Date('2026-10-21T10:00:00') // Giả lập Thứ Tư
    : simulationMode === 'simulate_closed'
    ? new Date('2026-10-23T10:00:00') // Giả lập Thứ Sáu
    : undefined;

  const windowInfo = checkShiftRegistrationWindow(simulatedDate);
  const isRegistrationOpen = windowInfo.isOpen;

  // Danh sách 7 ngày từ Hôm Nay và các ngày tiếp theo trong tuần theo thời gian thực
  const weekDays = getUpcomingDays(7);

  // Load danh sách nguyện vọng từ API Backend (MySQL aurora_ems)
  const loadRegistrations = async () => {
    setIsLoading(true);
    try {
      const data = await fetchShiftRegistrations(currentUser.id);
      // Lọc các đăng ký thuộc user hiện tại
      const myRegs = data.filter(r => r.userId === currentUser.id || r.userId === currentUser.id.replace('usr-', ''));
      setRegistrations(myRegs);
    } catch {
      const local = getShiftRegistrations().filter(r => r.userId === currentUser.id);
      setRegistrations(local);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
    fetchShifts().then(s => {
      if (s && s.length > 0) setShifts(s);
    });
  }, [currentUser.id]);

  const showNotification = (type: 'success' | 'info' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4500);
  };

  // Xử lý Đăng ký / Hủy đăng ký ca (Toggle)
  const handleToggleRegistration = async (date: string, shiftId: string) => {
    // 1. KIỂM TRA QUY ĐỊNH THỜI GIAN: Chỉ mở cổng từ Thứ 3 đến Thứ 5
    if (!isRegistrationOpen) {
      showNotification(
        'error',
        `Cổng đăng ký ca đang KHÓA (${windowInfo.currentDayName})! Hệ thống chỉ mở cho nhân viên đăng ký mỗi tuần từ Thứ 3 đến Thứ 5. Sau Thứ 5, nhân viên không thể thay đổi hay chỉnh sửa để Quản lý chốt lịch tuần.`
      );
      return;
    }

    const existing = registrations.find(r => r.date === date && r.shiftId === shiftId);

    if (existing) {
      // Nếu đã được duyệt và xếp lịch chính thức -> Không được tự ý hủy, phải qua đơn đổi ca
      if (existing.status === 'approved') {
        showNotification('info', 'Ca này đã được Quản lý duyệt và xuất bản vào lịch chính thức. Nếu cần đổi ca, bạn vui lòng tạo đơn tại mục "Xử lý ngoại lệ chấm công".');
        return;
      }

      // Nếu đang pending -> Cho phép hủy đăng ký khi trong khung giờ Thứ 3 - Thứ 5
      deleteShiftRegistration(currentUser.id, shiftId, date);
      setRegistrations(prev => prev.filter(r => !(r.date === date && r.shiftId === shiftId)));
      await cancelShiftRegistration(currentUser.id, shiftId, date, simulationMode !== 'realtime');
      showNotification('success', 'Đã hủy nguyện vọng đăng ký ca làm việc thành công!');
      return;
    }

    // Đăng ký mới
    const shift = shifts.find(s => s.id === shiftId);
    const newReg = saveShiftRegistration({
      userId: currentUser.id,
      userName: currentUser.name,
      date,
      shiftId,
      status: 'pending',
      submittedAt: new Date().toISOString().split('T')[0]
    });

    setRegistrations(prev => [...prev, newReg]);
    await registerShiftPreference(currentUser.id, shiftId, date, simulationMode !== 'realtime');
    showNotification('success', `Đã ghi nhận nguyện vọng đăng ký ${shift?.name || 'ca làm việc'} ngày ${date}!`);
  };

  const approvedCount = registrations.filter(r => r.status === 'approved').length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Đăng Ký Lịch Làm Việc Tuần Tới</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border ${
              isRegistrationOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {isRegistrationOpen ? <Unlock className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-rose-600" />}
              {windowInfo.badgeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký nguyện vọng ca làm việc trong tuần (Mở cho nhân viên mỗi tuần từ Thứ 3 đến Thứ 5).
          </p>
        </div>

        {approvedCount > 0 && onNavigateToSchedule && (
          <button
            onClick={onNavigateToSchedule}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Xem Lịch Chính Thức</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* BANNER THÔNG BÁO QUY ĐỊNH MỞ/KHÓA CỔNG ĐĂNG KÝ (THỨ 3 - THỨ 5) */}
      <div className="space-y-2">
        {isRegistrationOpen ? (
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/5 border-2 border-emerald-500/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Cổng Đăng Ký Ca Tuần Đang MỞ
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {windowInfo.currentDayName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Nhân viên được phép tự do đăng ký, điều chỉnh hoặc hủy ca làm việc cho tuần tới. Cổng sẽ đóng lúc <strong className="text-slate-900">23:59 Thứ Năm</strong> để Quản lý chốt lịch.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {windowInfo.deadlineText}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/70 border-2 border-amber-500/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md text-white">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs shrink-0 mt-0.5">
                <Lock className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white tracking-wide">
                    Cổng Đăng Ký Ca Tuần Đã KHÓA (Sau Thứ 5)
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 text-slate-950">
                    {windowInfo.currentDayName} • Đã Chốt Sổ Tuần
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Nhân viên chỉ được phép đăng ký lịch từ <strong className="text-amber-400">Thứ 3 đến Thứ 5</strong>. Sau Thứ 5, nhân viên không thể thay đổi hay chỉnh sửa đăng ký ca làm việc nhằm tránh trường hợp lịch bị đổi liên tục không thể chốt lịch tuần được.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-amber-300 bg-black/40 px-3.5 py-1.5 rounded-xl border border-amber-500/30 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>{windowInfo.nextOpenText}</span>
              </span>
            </div>
          </div>
        )}

        {/* Thanh công cụ mô phỏng dành cho Demo Đồ án tốt nghiệp */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 pt-1 gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-medium">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Quy định: Mở đăng ký từ Thứ 3 đến hết Thứ 5 hàng tuần. Sau Thứ 5 khóa toàn bộ.</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Mô phỏng Demo:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSimulationMode('realtime')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  simulationMode === 'realtime'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sử dụng thời gian thực tế của máy tính"
              >
                Thời gian thực ({checkShiftRegistrationWindow().currentDayName})
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('simulate_open')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  simulationMode === 'simulate_open'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Giả lập Thứ Tư để xem trạng thái Mở cổng"
              >
                Thử lúc MỞ (T3 - T5)
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('simulate_closed')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                  simulationMode === 'simulate_closed'
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Giả lập Thứ Sáu để xem trạng thái Khóa cổng sau Thứ 5"
              >
                Thử lúc KHÓA (Sau T5)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả thao tác */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm border transition-all ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : actionMessage.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Thống kê tiến độ đăng ký của nhân viên */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tổng ca đã đăng ký</div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span>{registrations.length}</span>
            <span className="text-xs font-normal text-slate-400">/ 7 ngày</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tiêu chuẩn: 5 ca/tuần</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Đã duyệt & xếp lịch</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {approvedCount} <span className="text-xs font-normal text-slate-400">ca chính thức</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Đã chốt trên hệ thống
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Đang chờ duyệt</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {pendingCount} <span className="text-xs font-normal text-slate-400">nguyện vọng</span>
          </div>
          <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Chờ quản lý xếp lịch
          </div>
        </div>
      </div>

      {/* Chú giải các ca làm việc tại rạp phim */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
          Khung giờ các ca làm việc tại rạp
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {shifts.map(s => (
            <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: s.color }}></span>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono">{s.code}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{s.startTime} - {s.endTime}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bảng Đăng Ký Phân Ca Tuần (Weekly Registration Grid) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>
              Bảng Đăng Ký Nguyện Vọng Phân Ca ({weekDays[0]?.dayNum} - {weekDays[weekDays.length - 1]?.dayNum}/{new Date().getFullYear()})
            </span>
          </h3>
          <span className={`text-xs font-semibold flex items-center gap-1 ${
            isRegistrationOpen ? 'text-emerald-700' : 'text-slate-500'
          }`}>
            {isRegistrationOpen ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bấm vào ca để Đăng ký hoặc Hủy</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Cổng đã khóa sau Thứ 5 • Chỉ xem lịch</span>
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map(d => {
            const dayRegs = registrations.filter(r => r.date === d.date);

            return (
              <div 
                key={d.date} 
                className={`p-3 rounded-xl space-y-2.5 flex flex-col justify-between border transition ${
                  d.isToday 
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40 shadow-xs' 
                    : d.isTomorrow
                    ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-center border-b border-slate-200/80 pb-2">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-xs font-bold ${d.isToday ? 'text-amber-800' : d.isTomorrow ? 'text-purple-800' : 'text-slate-800'}`}>
                      {d.dayLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{d.dayNum}</div>
                </div>

                <div className="space-y-2 flex-1">
                  {shifts.map(shift => {
                    const reg = dayRegs.find(r => r.shiftId === shift.id);
                    const isRegistered = !!reg;
                    const isApproved = reg?.status === 'approved';

                    return (
                      <button
                        key={shift.id}
                        onClick={() => handleToggleRegistration(d.date, shift.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-semibold transition-all flex flex-col justify-between gap-1 shadow-sm ${
                          isApproved
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-300'
                            : isRegistered
                            ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300'
                            : !isRegistrationOpen
                            ? 'bg-slate-100/70 border-slate-200 text-slate-400 hover:border-slate-300'
                            : 'bg-white border-slate-200 hover:border-amber-300 text-slate-600 hover:text-slate-900'
                        } ${isRegistrationOpen ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-90'}`}
                        title={
                          isApproved
                            ? 'Đã được Quản lý duyệt & xếp lịch chính thức'
                            : isRegistered && !isRegistrationOpen
                            ? 'Đã ghi nhận nguyện vọng (Cổng đăng ký đã khóa sau Thứ 5, không thể hủy)'
                            : isRegistered
                            ? 'Bấm để hủy nguyện vọng này'
                            : !isRegistrationOpen
                            ? 'Cổng đăng ký đang khóa sau Thứ 5 (Chỉ mở từ Thứ 3 đến Thứ 5 hàng tuần)'
                            : 'Bấm để đăng ký nguyện vọng ca này'
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }}></span>
                            <span>{shift.code}</span>
                            {!isRegistrationOpen && !isRegistered && (
                              <Lock className="w-2.5 h-2.5 text-slate-400" />
                            )}
                          </span>

                          {isApproved ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800 font-bold flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Đã xếp
                            </span>
                          ) : isRegistered ? (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                              isRegistrationOpen ? 'bg-amber-200/60 text-amber-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              <Clock className="w-2.5 h-2.5" /> {isRegistrationOpen ? 'Chờ duyệt' : 'Đã chốt'}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {shift.startTime}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Tóm tắt ngày */}
                <div className="pt-2 border-t border-slate-200 text-center">
                  <span className={`text-[10px] font-medium ${dayRegs.length > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                    {dayRegs.length > 0 ? `${dayRegs.length} ca đã chọn` : 'Nghỉ ngày này'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
