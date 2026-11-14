import React, { useState, useMemo } from 'react';
import { User, Attendance, Shift } from '../types';
import {
  generateMonthlyPayroll,
  formatCurrencyVND,
  exportPayrollCSV,
  calculateShiftWage,
  BASE_HOURLY_RATE,
  EmployeeMonthlyPayroll,
} from '../services/payrollService';
import {
  DollarSign,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  Award,
  Search,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  X,
  Building2,
  Eye,
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

interface MonthlyPayrollTableProps {
  users: User[];
  attendances: Attendance[];
  shifts?: Shift[];
  currentMonthStr?: string; // YYYY-MM
}

export const MonthlyPayrollTable: React.FC<MonthlyPayrollTableProps> = ({
  users,
  attendances,
  shifts = [],
  currentMonthStr,
}) => {
  const now = new Date();
  const defaultMonth = currentMonthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeMonthlyPayroll | null>(null);

  // Chuyển tháng trước / sau
  const handleMonthChange = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // Tính toán bảng lương toàn rạp
  const payrollSummary = useMemo(() => {
    return generateMonthlyPayroll(selectedMonth, users, attendances, shifts);
  }, [selectedMonth, users, attendances, shifts]);

  // Bộ lọc
  const filteredEmployees = useMemo(() => {
    return payrollSummary.employees.filter(emp => {
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = emp.userName.toLowerCase().includes(q);
        const matchCode = emp.staffCode.toLowerCase().includes(q);
        const matchDept = emp.department.toLowerCase().includes(q);
        return matchName || matchCode || matchDept;
      }
      return true;
    });
  }, [payrollSummary, departmentFilter, searchTerm]);

  // Danh sách các ca chi tiết của nhân viên được chọn xem
  const employeeShiftDetails = useMemo(() => {
    if (!selectedEmployee) return [];
    const cleanId = (id?: string) => String(id || '').replace('usr-', '').trim();

    return attendances
      .filter(a => {
        const matchU =
          cleanId(a.userId) === cleanId(selectedEmployee.userId) ||
          (a.userName &&
            selectedEmployee.userName &&
            a.userName.toLowerCase().trim() === selectedEmployee.userName.toLowerCase().trim());
        return matchU && a.date.startsWith(selectedMonth) && Boolean(a.checkIn);
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(att => {
        const shiftObj = shifts.find(s => s.id === att.shiftId || s.id.replace('shift-', '') === att.shiftId);
        const startTime =
          shiftObj?.startTime ||
          (att.shiftId === 'shift-2' ? '15:30' : att.shiftId === 'shift-3' ? '22:00' : '08:00');
        const isExcused = Boolean(att.note?.includes('đã duyệt') || att.note?.includes('miễn phạt'));

        const wage = calculateShiftWage({
          date: att.date,
          checkIn: att.checkIn,
          checkOut: att.checkOut,
          shiftStartTime: startTime,
          hoursWorked: att.hoursWorked || 8,
          isExcused,
        });

        return {
          att,
          startTime,
          wage,
          isExcused,
        };
      });
  }, [selectedEmployee, attendances, selectedMonth, shifts]);

  const departments = Array.from(new Set(users.map(u => u.department || 'Nhân viên rạp')));

  return (
    <div className="space-y-4">
      {/* Thanh Tiêu Đề & Bộ Chọn Tháng & Nút Xuất Excel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base">
                Bảng Lương & Tổng Hợp Công {payrollSummary.monthName}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Đơn giá: {formatCurrencyVND(BASE_HOURLY_RATE)}/h
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy ra tiền lương ca làm việc, hệ số ngày Lễ x3 và trừ phạt đi muộn tự động
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ chọn tháng */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold font-mono text-slate-800">{selectedMonth}</span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Nút Xuất File Excel CSV */}
          <button
            onClick={() => exportPayrollCSV(payrollSummary)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Bảng Lương Excel</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Tổng Kết Lương Tháng */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-emerald-200 bg-emerald-50/20 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
            <span>Tổng Lương Thực Nhận</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrencyVND(payrollSummary.totalNetWageAll)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
            Lương ca gốc: {formatCurrencyVND(payrollSummary.totalGrossWageAll)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
            <span>Tổng Số Ca Làm Việc</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {payrollSummary.totalShiftsAll} <span className="text-xs font-normal text-slate-500">ca trực</span>
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>{payrollSummary.holidayShiftCountAll} ca Lễ nhân x3 lương</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
            <span>Tổng Số Giờ Công</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {payrollSummary.totalHoursAll} <span className="text-xs font-normal text-slate-500">giờ</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Tính trên {payrollSummary.totalEmployees} nhân sự rạp
          </div>
        </div>

        <div className="bg-white border border-rose-200 bg-rose-50/20 p-4 rounded-2xl shadow-xs">
          <div className="text-[11px] font-semibold text-rose-800 flex items-center justify-between">
            <span>Tổng Phạt Trừ Đi Muộn</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">
            {payrollSummary.totalPenaltiesAll > 0 ? `-${formatCurrencyVND(payrollSummary.totalPenaltiesAll)}` : '0 ₫'}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5 font-medium">
            Tự động khấu trừ vào lương cuối tháng
          </div>
        </div>
      </div>

      {/* Thanh Tìm Kiếm & Lọc Bộ Phận */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, mã số, số điện thoại..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tất cả bộ phận</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BẢNG TỔNG HỢP LƯƠNG NHÂN SỰ DẠNG BẢNG CHI TIẾT */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Nhân Viên & Bộ Phận</th>
                <th className="px-3 py-3.5 text-center">Tổng Số Ca</th>
                <th className="px-3 py-3.5 text-center">Ca Ngày Lễ (x3)</th>
                <th className="px-3 py-3.5 text-center">Tổng Giờ Làm</th>
                <th className="px-3 py-3.5 text-right">Lương Ca Gốc</th>
                <th className="px-3 py-3.5 text-center">Đi Muộn</th>
                <th className="px-3 py-3.5 text-right">Phạt Trừ Trễ</th>
                <th className="px-4 py-3.5 text-right font-black text-slate-900">Lương Thực Nhận</th>
                <th className="px-3 py-3.5 text-center">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Không có dữ liệu nhân sự nào trong {payrollSummary.monthName}.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.userId} className="hover:bg-slate-50/80 transition">
                    {/* Nhân viên & Bộ phận */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {emp.avatar ? (
                          <img
                            src={emp.avatar}
                            alt={emp.userName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.userName.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{emp.userName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="font-mono text-amber-700 font-semibold">{emp.staffCode}</span>
                            <span>•</span>
                            <span className="truncate">{emp.department}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tổng Số Ca */}
                    <td className="px-3 py-3 text-center font-bold text-slate-800">
                      {emp.totalShifts} ca
                    </td>

                    {/* Ca Ngày Lễ (x3) */}
                    <td className="px-3 py-3 text-center">
                      {emp.holidayShifts > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          {emp.holidayShifts} ca lễ (x3)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Tổng Giờ Làm */}
                    <td className="px-3 py-3 text-center font-mono font-semibold text-slate-700">
                      {emp.totalHours}h
                    </td>

                    {/* Lương Ca Gốc */}
                    <td className="px-3 py-3 text-right font-mono font-medium text-slate-800">
                      {formatCurrencyVND(emp.totalRawWage)}
                    </td>

                    {/* Đi Muộn */}
                    <td className="px-3 py-3 text-center">
                      {emp.totalLateCount > 0 ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {emp.totalLateCount} lần ({emp.totalLateMinutes}p)
                          </span>
                          {emp.totalExcessiveLateCount > 0 && (
                            <div className="text-[9px] text-rose-600 font-black">
                              {emp.totalExcessiveLateCount} lần trễ &gt;60p!
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Chuẩn
                        </span>
                      )}
                    </td>

                    {/* Phạt Trừ Đi Muộn */}
                    <td className="px-3 py-3 text-right font-mono">
                      {emp.totalPenalties > 0 ? (
                        <span className="font-bold text-rose-600">
                          -{formatCurrencyVND(emp.totalPenalties)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">0 ₫</span>
                      )}
                    </td>

                    {/* Lương Thực Nhận */}
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-black text-emerald-700 font-mono">
                        {formatCurrencyVND(emp.totalNetWage)}
                      </div>
                    </td>

                    {/* Nút Xem Chi Tiết Từng Ca */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setSelectedEmployee(emp)}
                        className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition cursor-pointer"
                        title="Xem chi tiết từng ca chấm công và tiền lương"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CHI TIẾT TỪNG CA CÔNG VÀ LƯƠNG CỦA NHÂN VIÊN */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                {selectedEmployee.avatar ? (
                  <img
                    src={selectedEmployee.avatar}
                    alt={selectedEmployee.userName}
                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-amber-400 shadow-xs"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-base">
                    {selectedEmployee.userName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base">{selectedEmployee.userName}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {selectedEmployee.department}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mã NV: <strong className="font-mono text-amber-700">{selectedEmployee.staffCode}</strong> • Bảng
                    kê chấm công & lương {payrollSummary.monthName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thẻ tóm tắt lương nhân viên này */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium">Tổng ca làm việc</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedEmployee.totalShifts} ca ({selectedEmployee.totalHours}h)
                </div>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200">
                <div className="text-[10px] text-rose-700 font-medium">Tổng tiền phạt trễ</div>
                <div className="text-base font-bold text-rose-700 mt-0.5">
                  -{formatCurrencyVND(selectedEmployee.totalPenalties)}
                </div>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                <div className="text-[10px] text-emerald-800 font-medium">Lương thực nhận tháng</div>
                <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                  {formatCurrencyVND(selectedEmployee.totalNetWage)}
                </div>
              </div>
            </div>

            {/* Danh sách từng ca */}
            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {employeeShiftDetails.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có ca làm việc nào được ghi nhận trong {payrollSummary.monthName}.
                </div>
              ) : (
                employeeShiftDetails.map(({ att, startTime, wage }) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span>📅 {formatDateDMY(att.date)}</span>
                        <span>•</span>
                        <span className="text-amber-800">{att.shiftName || 'Ca làm việc'}</span>
                        {wage.isHoliday && (
                          <span className="px-2 py-0.2 rounded-md text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                            ⭐ Ngày Lễ x3 Lương ({wage.holidayName})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                        <span>
                          Ca chuẩn: <strong className="font-mono text-slate-700">{startTime}</strong>
                        </span>
                        <span>|</span>
                        <span>
                          Vào ca:{' '}
                          <strong
                            className={`font-mono ${wage.lateInfo.lateMinutes > 5 ? 'text-amber-700' : 'text-emerald-700'}`}
                          >
                            {att.checkIn || '--:--'}
                          </strong>
                        </span>
                        <span>|</span>
                        <span>
                          Ra ca: <strong className="font-mono text-slate-700">{att.checkOut || 'Đang trực'}</strong>
                        </span>
                        <span>|</span>
                        <span>
                          Giờ làm: <strong>{wage.hoursWorked}h</strong>
                        </span>
                      </div>
                      {/* Trạng thái đi muộn */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${wage.lateInfo.badgeClass}`}>
                          {wage.lateInfo.label}
                        </span>
                        {wage.penaltyAmount > 0 && (
                          <span className="text-[10px] text-rose-600 font-bold">
                            (Phạt: -{formatCurrencyVND(wage.penaltyAmount)})
                          </span>
                        )}
                        {att.note && (
                          <span className="text-[10px] text-slate-500 italic max-w-xs truncate">
                            • {att.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-400">Thực nhận ca này:</div>
                      <div className="text-sm font-black text-emerald-700 font-mono">
                        {formatCurrencyVND(wage.netShiftWage)}
                      </div>
                      {wage.penaltyAmount > 0 && (
                        <div className="text-[9px] text-slate-400 line-through">
                          Gốc: {formatCurrencyVND(wage.rawShiftWage)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-end">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

