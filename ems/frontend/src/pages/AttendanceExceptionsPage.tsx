import React, { useState, useEffect } from 'react';
import { AttendanceException, User, Attendance } from '../types';
import { 
  getAttendanceExceptions, updateAttendanceExceptionStatus, 
  saveAttendanceException, getUsers, getAttendances, saveAttendance 
} from '../services/storage';
import { 
  fetchAttendanceExceptions, handleExceptionActionApi, 
  submitAttendanceExceptionApi, saveAttendanceApi 
} from '../services/apiClient';
import { getTodayDateString } from '../utils/dateUtils';
import { 
  AlertCircle, CheckCircle2, XCircle, Clock, FileText, 
  UserCheck, Plus, X, Send, Filter, Check, ArrowRight
} from 'lucide-react';

interface AttendanceExceptionsPageProps {
  currentUser?: User | null;
  onNavigateTab?: (tab: any) => void;
}

export const AttendanceExceptionsPage: React.FC<AttendanceExceptionsPageProps> = ({ 
  currentUser,
  onNavigateTab 
}) => {
  const [exceptions, setExceptions] = useState<AttendanceException[]>(getAttendanceExceptions());
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  
  // Submit modal form states
  const [targetDate, setTargetDate] = useState(getTodayDateString());
  const [type, setType] = useState<'late_justification' | 'leave_request' | 'shift_swap'>('late_justification');
  const [reason, setReason] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isManager = currentUser?.role === 'manager';

  useEffect(() => {
    fetchAttendanceExceptions().then(data => {
      if (data && data.length > 0) setExceptions(data);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    const reviewerName = currentUser?.name || 'Phạm Thu Hương (Manager)';
    const comment = status === 'approved' 
      ? 'Đã kiểm tra minh chứng và phê duyệt miễn trừ vi phạm chấm công.' 
      : 'Từ chối đơn do không đủ căn cứ giải trình.';
      
    updateAttendanceExceptionStatus(id, status, reviewerName, comment);
    await handleExceptionActionApi(id, status, comment);

    // TỰ ĐỘNG ĐỒNG BỘ SANG BẢNG CHẤM CÔNG (ATTENDANCE)
    const exc = exceptions.find(e => e.id === id);
    if (exc && status === 'approved') {
      const allAtts = getAttendances();
      const targetAtt = allAtts.find(a => 
        (a.userId === exc.userId || a.staffCode === exc.staffCode || a.userName === exc.userName) &&
        a.date === exc.targetDate
      );

      if (targetAtt) {
        const updatedAtt: Attendance = {
          ...targetAtt,
          note: `${targetAtt.note || ''} | [Quản lý ${reviewerName} đã duyệt giải trình: ${exc.reason}]`.trim(),
        };
        saveAttendance(updatedAtt);
        saveAttendanceApi(updatedAtt);
      }
    }

    setExceptions(getAttendanceExceptions());
    showToast(status === 'approved' 
      ? '✓ Đã phê duyệt đơn và đồng bộ miễn trừ sang Bảng Chấm Công!' 
      : '✕ Đã từ chối đơn giải trình.'
    );
  };

  const handleSubmitException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const user = currentUser || getUsers()[0];
    const typeTitles: Record<string, string> = {
      late_justification: 'Giải trình Đi Muộn',
      leave_request: 'Đơn Xin Nghỉ Phép',
      shift_swap: 'Yêu Cầu Đổi Ca Trực',
    };

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    const newExc = {
      userId: user.id,
      userName: user.name,
      staffCode: user.staffCode || `AR-${user.id}`,
      type,
      typeTitle: typeTitles[type] || 'Giải trình Chấm công',
      reason,
      targetDate,
      status: 'pending' as const,
      submittedAt: `${getTodayDateString()} ${hh}:${mm}`,
    };

    saveAttendanceException(newExc);
    await submitAttendanceExceptionApi(newExc);

    setExceptions(getAttendanceExceptions());
    setIsSubmitModalOpen(false);
    setReason('');
    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3500);
  };

  // Scoping dữ liệu:
  // - Nhân viên (Staff): Xem các đơn do chính mình gửi
  // - Quản lý (Manager): Xem toàn bộ đơn của toàn cụm rạp
  const scopedExceptions = isManager
    ? exceptions
    : exceptions.filter(e => 
        (currentUser?.id && e.userId === currentUser.id) ||
        (currentUser?.staffCode && e.staffCode === currentUser.staffCode) ||
        (currentUser?.name && e.userName === currentUser.name)
      );

  const filteredExceptions = scopedExceptions.filter(e => {
    if (statusFilter === 'all') return true;
    return e.status === statusFilter;
  });

  const totalCount = scopedExceptions.length;
  const pendingCount = scopedExceptions.filter(e => e.status === 'pending').length;
  const approvedCount = scopedExceptions.filter(e => e.status === 'approved').length;
  const rejectedCount = scopedExceptions.filter(e => e.status === 'rejected').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {(submitSuccess || toastMessage) && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl shadow-lg text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMessage || 'Gửi đơn giải trình thành công! Đơn đã chuyển đến Quản lý phê duyệt.'}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {isManager ? 'Xử Lý Ngoại Lệ & Đơn Giải Trình Chấm Công' : 'Danh Sách Đơn Giải Trình Của Bạn'}
            </h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isManager ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isManager ? 'Quyền Quản Lý' : 'Nhân Viên'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isManager 
              ? 'Phê duyệt giải trình đi muộn, đơn xin nghỉ phép và yêu cầu đổi ca.'
              : 'Theo dõi tiến độ duyệt đơn giải trình cá nhân.'
            }
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('attendance')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
            >
              <Clock className="w-3.5 h-3.5" />
              Xem Bảng Chấm Công
            </button>
          )}

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            + Gửi Đơn Giải Trình Mới
          </button>
        </div>
      </div>

      {isManager && pendingCount > 0 && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Có {pendingCount} đơn giải trình đang chờ bạn phê duyệt.</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'all' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400">Tất Cả Đơn</div>
          <div className="text-xl font-bold mt-1">{totalCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'pending' 
              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm' 
              : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50/60'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80 flex items-center gap-1">
            <span>Chờ Duyệt</span>
            {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-ping"></span>}
          </div>
          <div className="text-xl font-bold mt-1 text-amber-900">{pendingCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'approved' 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
              : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50/60'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Đã Phê Duyệt</div>
          <div className="text-xl font-bold mt-1 text-emerald-700">{approvedCount}</div>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`p-3.5 rounded-xl border text-left transition ${
            statusFilter === 'rejected' 
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
              : 'bg-white text-rose-800 border-rose-200 hover:bg-rose-50/60'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Đã Từ Chối</div>
          <div className="text-xl font-bold mt-1 text-rose-700">{rejectedCount}</div>
        </button>
      </div>

      {/* Exceptions List */}
      {filteredExceptions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">Không Có Đơn Nào Phù Hợp</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'Tất cả các đơn giải trình chấm công đã được Quản lý giải quyết.'
              : 'Hiện chưa có đơn giải trình nào trong danh mục này.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExceptions.map((exc) => (
            <div 
              key={exc.id} 
              className={`bg-white border rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition ${
                exc.status === 'pending' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-amber-900 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300">
                      {exc.typeTitle}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      📅 Ngày ca làm: <strong className="text-slate-800">{exc.targetDate}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      • Nộp lúc: {exc.submittedAt}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 mt-2 flex items-center gap-2">
                    <span>{exc.userName}</span>
                    <span className="text-xs font-mono text-amber-700 font-semibold">({exc.staffCode})</span>
                  </h3>
                </div>

                <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 self-start ${
                  exc.status === 'pending'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : exc.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {exc.status === 'pending' ? '⏳ Chờ Quản Lý Duyệt' : exc.status === 'approved' ? '✓ Đã Phê Duyệt' : '✕ Đã Từ Chối'}
                </span>
              </div>

              {/* Nội dung giải trình */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1">
                <div className="font-semibold text-slate-900">Lý do giải trình của nhân sự:</div>
                <p className="text-slate-800 italic font-mono bg-white p-2 rounded-lg border border-slate-200">
                  "{exc.reason}"
                </p>
              </div>

              {/* Actions / Review Feedback */}
              {exc.status === 'pending' ? (
                isManager ? (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-amber-800 font-medium">
                      ⚠️ Duyệt đơn sẽ tự động đồng bộ miễn trừ sang bảng chấm công của nhân viên.
                    </span>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleAction(exc.id, 'rejected')}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
                      >
                        Từ Chối
                      </button>
                      <button
                        onClick={() => handleAction(exc.id, 'approved')}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Phê Duyệt Miễn Trừ</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Đơn đang chờ Quản lý Rạp xem xét và phê duyệt miễn trừ cho ca trực này.</span>
                  </div>
                )
              ) : (
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    Người duyệt: <strong className="text-slate-800">{exc.reviewedBy || 'Quản lý'}</strong>
                    {exc.reviewComment && <span className="text-slate-500 ml-2">— "{exc.reviewComment}"</span>}
                  </div>
                  {exc.status === 'approved' && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('attendance')}
                      className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0"
                    >
                      Kiểm tra trên Bảng Chấm Công <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Gửi đơn giải trình mới */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Gửi Đơn Giải Trình Ngoại Lệ</h3>
                  <p className="text-xs text-slate-500">Nộp giải trình đi muộn hoặc xin miễn trừ vi phạm chấm công</p>
                </div>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitException} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại Yêu Cầu / Ngoại Lệ:
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="late_justification">Giải trình Đi Muộn (Xe hỏng, ngập nước, hỗ trợ khách...)</option>
                  <option value="leave_request">Đơn Xin Nghỉ Phép Đột Xuất</option>
                  <option value="shift_swap">Yêu Cầu Hoán Đổi Ca Trực</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày Phát Sinh Ngoại Lệ:
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý Do Giải Trình Chi Tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả chi tiết nguyên nhân (ví dụ: Xe bị hỏng trên đường đến rạp, hỗ trợ khách khẩn cấp tại phòng chiếu IMAX, hệ thống mạng rạp bảo trì...)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
                >
                  <Send className="w-4 h-4" />
                  Gửi Đơn Lên Quản Lý
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
