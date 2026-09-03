import { ArrowLeft, Ticket, Coffee, DollarSign, UserCheck } from 'lucide-react';

interface PosSalesScreenProps {
  cinemaName?: string;
  staffName?: string;
  counter?: string;
  onBackToDashboard: () => void;
  onCloseShift?: () => void;
}

export default function PosSalesScreen({
  cinemaName = 'AURORA CINEMA',
  staffName = 'Nguyễn Trần Thái Bảo',
  counter = 'AURORA BOX 02',
  onBackToDashboard,
  onCloseShift,
}: PosSalesScreenProps) {
  return (
    <div className="pos-sales-layout">
      {/* Topbar */}
      <header className="pos-sales-header">
        <div className="pos-sales-header-left">
          <button
            type="button"
            className="pos-btn pos-btn-secondary btn-sm"
            onClick={onBackToDashboard}
          >
            <ArrowLeft size={16} />
            <span>Quay lại ca làm việc</span>
          </button>
          <span className="pos-sales-branch">{cinemaName} - {counter}</span>
        </div>
        <div className="pos-sales-header-right">
          <span className="pos-sales-user">
            <UserCheck size={16} /> {staffName}
          </span>
        </div>
      </header>

      {/* Main workspace */}
      <div className="pos-sales-body">
        <div className="pos-sales-welcome">
          <div className="pos-sales-card">
            <h3>HỆ THỐNG BÁN VÉ & BẮP NƯỚC TẠI QUẦY</h3>
            <p>Quầy <strong>{counter}</strong> đã sẵn sàng tiếp nhận khách hàng.</p>
            <div className="pos-quick-actions">
              <button className="pos-quick-btn">
                <Ticket size={24} />
                <span>Bán vé xem phim</span>
              </button>
              <button className="pos-quick-btn">
                <Coffee size={24} />
                <span>Combo Bắp & Nước</span>
              </button>
              <button
                className="pos-quick-btn"
                onClick={onBackToDashboard}
                title="Quay lại dashboard ca để đóng kết phiên"
              >
                <DollarSign size={24} />
                <span>Kết ca / Đóng phiên</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
