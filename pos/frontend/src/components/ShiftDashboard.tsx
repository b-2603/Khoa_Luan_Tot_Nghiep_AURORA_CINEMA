import { useState, useEffect } from 'react';
import { ShoppingCart, RotateCw, LogOut, CheckCircle, PowerOff, AlertTriangle, X } from 'lucide-react';

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

  const toggleStatus = () => {
    const nextStatus = data.status === 'Tạm nghỉ' ? 'Đang bán' : 'Tạm nghỉ';
    setData((prev) => ({ ...prev, status: nextStatus }));
    setNotification(`Trạng thái ca chuyển thành: ${nextStatus}`);
    setTimeout(() => setNotification(null), 2500);
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

      <div className="pos-dashboard-card">
        {/* Logo & Tên Thương hiệu Aurora Cinema */}
        <div className="shared-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            background: '#f0b52d',
            borderRadius: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(240, 181, 45, 0.35)',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#0b1220">
              <path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z" />
            </svg>
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.05 }}>
            <div style={{ fontSize: 19, fontWeight: 900, letterSpacing: '0.04em', color: '#0b1220' }}>AURORA</div>
            <div style={{ fontSize: 8.5, letterSpacing: '0.36em', color: '#7a8fa6', fontWeight: 700, marginTop: 2 }}>CINEMA</div>
          </div>
        </div>

        {/* Tên Rạp / Chi nhánh */}
        <h2 className="pos-cinema-title" style={{ marginTop: 0 }}>{data.cinemaName}</h2>

        {/* Danh sách thông tin ca làm việc */}
        <div className="pos-info-list">
          <div className="pos-info-row">
            <span className="pos-info-label">Tên nhân viên:</span>
            <span className="pos-info-value font-bold">{data.staffName}</span>
          </div>

          <div className="pos-info-row">
            <span className="pos-info-label">Ngày làm việc:</span>
            <span className="pos-info-value font-bold">{data.workDate}</span>
          </div>

          <div className="pos-info-row">
            <span className="pos-info-label">Phiên làm việc:</span>
            <span className="pos-info-value font-bold">{data.shiftTime}</span>
          </div>

          <div className="pos-info-row">
            <span className="pos-info-label">Quầy làm việc:</span>
            <span className="pos-info-value font-bold">{data.counter}</span>
          </div>

          <div className="pos-info-row">
            <span className="pos-info-label">Tiền đầu phiên:</span>
            <span className="pos-info-value font-bold">{data.initialCash}</span>
          </div>

          <div className="pos-info-row">
            <span className="pos-info-label">Trạng thái:</span>
            <div className="pos-info-value">
              <span
                className={`pos-badge ${
                  data.status === 'Tạm nghỉ' ? 'pos-badge-warning' : 'pos-badge-success'
                }`}
                onClick={toggleStatus}
                title="Bấm để đổi trạng thái ca"
              >
                {data.status}
              </span>
            </div>
          </div>

          <div className="pos-info-row">
            <span className="pos-info-label">Thời gian còn lại:</span>
            <div className="pos-info-value">
              <span className="pos-badge pos-badge-primary">
                {formatRemainingTime(remainingTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Cụm nút thao tác phía dưới */}
        <div className="pos-actions-row">
          <button
            type="button"
            className="pos-btn pos-btn-primary"
            onClick={onSalesClick}
            id="btn-pos-sales"
          >
            <ShoppingCart size={17} />
            <span>Bán hàng</span>
          </button>

          <button
            type="button"
            className="pos-btn pos-btn-secondary"
            onClick={handleReload}
            disabled={isRefreshing}
            id="btn-pos-reload"
          >
            <RotateCw size={17} className={isRefreshing ? 'spin-icon' : ''} />
            <span>Tải lại</span>
          </button>

          <button
            type="button"
            className="pos-btn pos-btn-warning"
            onClick={() => setShowCloseModal(true)}
            id="btn-pos-close-shift"
            title="Đóng kết thúc phiên làm việc của nhân viên"
          >
            <PowerOff size={17} />
            <span>Kết phiên</span>
          </button>

          <button
            type="button"
            className="pos-btn pos-btn-danger"
            onClick={onLogout}
            id="btn-pos-logout"
          >
            <LogOut size={17} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

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
