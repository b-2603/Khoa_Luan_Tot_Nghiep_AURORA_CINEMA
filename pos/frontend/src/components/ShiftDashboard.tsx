import { useState, useEffect } from 'react';
import { ArrowRight, CalendarDays, CheckCircle, Clock3, IdCard, KeyRound, LogOut, MapPin, Monitor, PowerOff, RefreshCw, ShieldCheck, ShoppingBag, WalletCards, X, AlertTriangle } from 'lucide-react';

export interface ShiftInfo {
  cinemaName: string;
  staffName: string;
  workDate: string;
  shiftTime: string;
  counter: string;
  initialCash: string;
  status: 'Tạm nghỉ' | 'Đang bán' | 'Đang hoạt động' | 'Đã kết phiên';
  remainingSeconds?: number;
}

interface ShiftDashboardProps {
  shiftData?: Partial<ShiftInfo>;
  onSalesClick?: () => void;
  onLogout?: () => void;
  onReload?: () => void;
  onCloseShift?: () => void;
}

// Hàm tính số giây còn lại từ thời điểm hiện tại đến 23:59:59 của ngày
const getSecondsUntilEndOfDay = () => {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const diffInSeconds = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
  return diffInSeconds;
};

export default function ShiftDashboard({
  shiftData,
  onSalesClick,
  onLogout,
  onReload,
  onCloseShift,
}: ShiftDashboardProps) {
  const [data, setData] = useState<ShiftInfo>({
    cinemaName: shiftData?.cinemaName || 'AURORA CINEMA',
    staffName: shiftData?.staffName || 'Nguyễn Trần Thái Bảo',
    workDate: shiftData?.workDate || new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    shiftTime: shiftData?.shiftTime || '00:00:00 - 23:59:59',
    counter: shiftData?.counter || 'AURORA BOX 02',
    initialCash: shiftData?.initialCash || '500.000 VNĐ',
    status: shiftData?.status || 'Tạm nghỉ',
    remainingSeconds: shiftData?.remainingSeconds ?? getSecondsUntilEndOfDay(),
  });

  const [remainingTime, setRemainingTime] = useState<number>(() => getSecondsUntilEndOfDay());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Cập nhật khi props shiftData thay đổi
  useEffect(() => {
    if (shiftData) {
      setData((prev) => ({
        ...prev,
        ...shiftData,
      }));
    }
  }, [shiftData]);

  // Bộ đếm ngược thời gian từ thời điểm hiện tại đến 23:59:59
  useEffect(() => {
    // Cập nhật thời gian chính xác
    setRemainingTime(getSecondsUntilEndOfDay());

    const timer = setInterval(() => {
      setRemainingTime(getSecondsUntilEndOfDay());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format số giây còn lại thành "Xh : Ym : Zs"
  const formatRemainingTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
  };

  const timeParts = {
    hours: Math.floor(remainingTime / 3600).toString().padStart(2, '0'),
    minutes: Math.floor((remainingTime % 3600) / 60).toString().padStart(2, '0'),
    seconds: (remainingTime % 60).toString().padStart(2, '0'),
  };
  const staffInitials = data.staffName.split(/\s+/).filter(Boolean).slice(-2).map(part => part.charAt(0)).join('').toUpperCase();

  const handleReload = () => {
    setIsRefreshing(true);
    setRemainingTime(getSecondsUntilEndOfDay());
    if (onReload) {
      onReload();
    }
    setTimeout(() => {
      setIsRefreshing(false);
      setNotification('Đã làm mới thông tin và thời gian ca làm việc!');
      setTimeout(() => setNotification(null), 3000);
    }, 500);
  };

  const handleConfirmCloseShift = () => {
    setShowCloseModal(false);
    setData((prev) => ({ ...prev, status: 'Đã kết phiên' }));
    setNotification('Đã đóng và kết thúc phiên làm việc thành công!');
    setTimeout(() => {
      if (onCloseShift) {
        onCloseShift();
      } else if (onLogout) {
        onLogout();
      }
    }, 1200);
  };

  return (
    <div className="pos-dashboard-wrap">
      {notification && (
        <div className="pos-toast">
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      <section className="shift-shell">
        <aside className="shift-identity">
          <div className="shift-brand"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z"/></svg></span><div><b>AURORA</b><small>CINEMA · POS</small></div></div>
          <div className="shift-station-label"><Monitor size={14}/><span>WORKSTATION</span><b>{data.counter}</b></div>
          <div className="shift-welcome">
            <div className="shift-avatar">{staffInitials || 'NV'}<i/></div>
            <div className="shift-welcome-copy"><span>PHIÊN BÁN HÀNG ĐÃ SẴN SÀNG</span><h1>Xin chào,<br/>{data.staffName.split(/\s+/).slice(-2).join(' ')}</h1><p>Kiểm tra thông tin bàn giao trước khi bắt đầu phục vụ khách hàng.</p></div>
          </div>
          <div className="shift-location"><MapPin size={18}/><div><small>ĐỊA ĐIỂM LÀM VIỆC</small><b>{data.cinemaName}</b><span>{data.counter}</span></div></div>
          <div className="shift-authorized"><KeyRound size={17}/><div><b>Đã được cấp quyền bán hàng</b><span>Phiên được Admin Rạp hoặc Supervisor xác nhận.</span></div><CheckCircle size={17}/></div>
          <div className="shift-security"><ShieldCheck size={17}/><p><b>Phiên được bảo vệ</b><span>Mọi giao dịch được ghi nhận trong Aurora DB.</span></p></div>
        </aside>

        <main className="shift-overview">
          <header className="shift-overview-head"><div><span>TRUNG TÂM VẬN HÀNH POS</span><h2>Tổng quan phiên hiện tại</h2><p>Theo dõi thời gian, quầy làm việc và thông tin bàn giao ca.</p></div><span className={`shift-live ${data.status==='Tạm nghỉ'?'paused':''}`}><i/>{data.status}</span></header>

          <div className="shift-countdown">
            <div className="shift-countdown-copy"><Clock3 size={22}/><span><small>THỜI GIAN CÒN LẠI TRONG CA</small><b>Kết thúc lúc 23:59 hôm nay</b></span></div>
            <div className="shift-time-blocks" aria-label={formatRemainingTime(remainingTime)}><span><strong>{timeParts.hours}</strong><small>GIỜ</small></span><i>:</i><span><strong>{timeParts.minutes}</strong><small>PHÚT</small></span><i>:</i><span><strong>{timeParts.seconds}</strong><small>GIÂY</small></span></div>
          </div>

          <div className="shift-data-grid">
            <article><span><IdCard size={18}/></span><div><small>Nhân viên phụ trách</small><b>{data.staffName}</b></div></article>
            <article><span><CalendarDays size={18}/></span><div><small>Ngày làm việc</small><b>{data.workDate}</b></div></article>
            <article><span><Clock3 size={18}/></span><div><small>Khung giờ phiên</small><b>{data.shiftTime}</b></div></article>
            <article><span><WalletCards size={18}/></span><div><small>Tiền mặt đầu phiên</small><b>{data.initialCash}</b></div></article>
          </div>

          <button type="button" className="shift-start-sale" onClick={onSalesClick} id="btn-pos-sales"><span><ShoppingBag size={21}/></span><div><b>Đi đến màn hình bán hàng</b><small>Bán vé, bắp nước và xử lý nghiệp vụ tại quầy</small></div><ArrowRight size={20}/></button>

          <footer className="shift-actions"><button type="button" onClick={handleReload} disabled={isRefreshing} id="btn-pos-reload"><RefreshCw size={16} className={isRefreshing?'spin-icon':''}/><span>Làm mới dữ liệu</span></button><div><button type="button" className="close-shift" onClick={()=>setShowCloseModal(true)} id="btn-pos-close-shift"><PowerOff size={16}/><span>Kết phiên</span></button><button type="button" className="logout" onClick={onLogout} id="btn-pos-logout"><LogOut size={16}/><span>Đăng xuất</span></button></div></footer>
        </main>
      </section>

      {/* Modal xác nhận kết phiên làm việc */}
      {showCloseModal && (
        <div className="pos-modal-overlay">
          <div className="pos-modal-card">
            <div className="pos-modal-header">
              <div className="pos-modal-title">
                <AlertTriangle size={22} color="#eab308" />
                <span>XÁC NHẬN KẾT PHIÊN LÀM VIỆC</span>
              </div>
              <button
                type="button"
                className="pos-modal-close-btn"
                onClick={() => setShowCloseModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="pos-modal-body">
              <p className="pos-modal-desc">
                Bạn có chắc chắn muốn <strong>kết thúc phiên làm việc</strong> hiện tại không?
              </p>

              <div className="pos-modal-summary">
                <div className="pos-summary-row">
                  <span>Nhân viên:</span>
                  <strong>{data.staffName}</strong>
                </div>
                <div className="pos-summary-row">
                  <span>Quầy làm việc:</span>
                  <strong>{data.counter}</strong>
                </div>
                <div className="pos-summary-row">
                  <span>Thời gian bắt đầu:</span>
                  <strong>00:00:00</strong>
                </div>
                <div className="pos-summary-row">
                  <span>Thời gian đóng ca:</span>
                  <strong>{new Date().toLocaleTimeString('vi-VN')}</strong>
                </div>
                <div className="pos-summary-row">
                  <span>Tiền mặt đầu phiên:</span>
                  <strong>{data.initialCash}</strong>
                </div>
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="pos-btn pos-btn-secondary"
                onClick={() => setShowCloseModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="pos-btn pos-btn-danger"
                onClick={handleConfirmCloseShift}
              >
                <PowerOff size={16} />
                <span>Xác nhận đóng phiên</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
