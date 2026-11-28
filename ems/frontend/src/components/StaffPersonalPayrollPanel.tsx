import React, { useState, useMemo } from 'react';
import { User, Attendance, AttendanceException, Shift } from '../types';
import {
  generateMonthlyPayroll,
  formatCurrencyVND,
  printEmployeePayslip,
  PayrollStatus,
} from '../services/payrollService';
import {
  Wallet,
  ChevronLeft,
  ChevronRight,
  Printer,
  Clock,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  CheckCircle2,
  Moon,
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

interface StaffPersonalPayrollPanelProps {
  currentUser: User;
  attendances: Attendance[];
  shifts: Shift[];
  exceptions: AttendanceException[];
}

const STATUS_BADGE: Record<PayrollStatus, { label: string; cls: string }> = {
  draft: { label: 'Tạm tính (Bản nháp)', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  approved: { label: 'Quản lý đã chốt', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  paid: { label: 'Đã chi trả', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const StaffPersonalPayrollPanel: React.FC<StaffPersonalPayrollPanelProps> = ({
  currentUser,
  attendances,
  shifts,
  exceptions,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const summary = useMemo(
    () => generateMonthlyPayroll(selectedMonth, [currentUser], attendances, shifts, exceptions),
    [selectedMonth, currentUser, attendances, shifts, exceptions]
  );

  const myPayroll = summary.employees[0];
  if (!myPayroll) return null;

  const st = STATUS_BADGE[myPayroll.status];

  return (
    <div className="space-y-5">
      {/* Header + Month Picker */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">
                Phiếu Lương Cá Nhân • {summary.monthName}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${st.cls}`}>
                {st.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Bộ phận {myPayroll.department} • Đơn giá chuẩn{' '}
              <strong className="font-mono text-slate-700">{formatCurrencyVND(myPayroll.hourlyRate)}/h</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold font-mono text-slate-800">{selectedMonth}</span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => printEmployeePayslip(myPayroll, summary.monthName)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>In Phiếu Lương</span>
          </button>
        </div>
      </div>

      {/* Net Pay Hero Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lương Thực Lĩnh {summary.monthName}
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrencyVND(myPayroll.totalNetWage)}
          </div>
          <div className="text-xs text-slate-300 mt-1.5">
            Tổng thu nhập {formatCurrencyVND(myPayroll.totalGrossIncome)} − Khấu trừ{' '}
            {formatCurrencyVND(myPayroll.totalDeductions)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <div className="text-lg font-bold">{myPayroll.totalShifts}</div>
            <div className="text-[11px] text-slate-300">Ca làm việc</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <div className="text-lg font-bold font-mono">{myPayroll.totalHours}h</div>
            <div className="text-[11px] text-slate-300">Tổng giờ công</div>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
            <div className="text-lg font-bold text-emerald-400">
              {myPayroll.attendanceBonusEligible ? 'Đạt' : `${myPayroll.totalShifts}/${summary.config.attendanceBonusMinShifts}`}
            </div>
            <div className="text-[11px] text-slate-300">Chuyên cần</div>
          </div>
        </div>
      </div>

      {/* Earnings & Deductions Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 pb-2.5 border-b border-slate-100">
            <TrendingUp className="w-4 h-4" />
            <span>Khoản Thu Nhập</span>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Lương giờ chuẩn ({myPayroll.totalStandardHours}h)</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrencyVND(myPayroll.baseWageTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Phụ trội Cuối tuần / Ngày Lễ</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrencyVND(myPayroll.dayTypePremiumTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Lương tăng ca OT ({myPayroll.totalOvertimeHours}h)</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrencyVND(myPayroll.overtimeWageTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Phụ cấp làm đêm ({myPayroll.totalNightHours}h)</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrencyVND(myPayroll.nightAllowanceTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Phụ cấp cơm ca & gửi xe</span>
              <span className="font-mono font-semibold text-emerald-700">+{formatCurrencyVND(myPayroll.mealAllowanceTotal)}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="text-slate-600">Thưởng chuyên cần</div>
                <div className="text-[11px] text-slate-400">{myPayroll.attendanceBonusReason}</div>
              </div>
              <span className={`font-mono font-semibold shrink-0 ${myPayroll.attendanceBonus > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                {myPayroll.attendanceBonus > 0 ? `+${formatCurrencyVND(myPayroll.attendanceBonus)}` : '0 ₫'}
              </span>
            </div>
            {myPayroll.manualBonus > 0 && (
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-slate-600">Thưởng thêm</div>
                  {myPayroll.manualBonusNote && <div className="text-[11px] text-slate-400">{myPayroll.manualBonusNote}</div>}
                </div>
                <span className="font-mono font-semibold text-emerald-700 shrink-0">
                  +{formatCurrencyVND(myPayroll.manualBonus)}
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
            <span>Tổng thu nhập (Gross)</span>
            <span className="font-mono">{formatCurrencyVND(myPayroll.totalGrossIncome)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 pb-2.5 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4" />
              <span>Khoản Khấu Trừ</span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-slate-600">Phạt đi muộn</div>
                  <div className="text-[11px] text-slate-400">
                    {myPayroll.totalLateCount} lần ({myPayroll.totalLateMinutes} phút)
                  </div>
                </div>
                <span className={`font-mono font-semibold ${myPayroll.totalPenalties > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {myPayroll.totalPenalties > 0 ? `-${formatCurrencyVND(myPayroll.totalPenalties)}` : '0 ₫'}
                </span>
              </div>

              {myPayroll.totalExcusedCount > 0 && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đơn giải trình đã duyệt miễn phạt
                  </span>
                  <strong>{myPayroll.totalExcusedCount} lần</strong>
                </div>
              )}

              {myPayroll.manualDeduction > 0 && (
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="text-slate-600">Khấu trừ / Tạm ứng</div>
                    {myPayroll.manualDeductionNote && (
                      <div className="text-[11px] text-slate-400">{myPayroll.manualDeductionNote}</div>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-rose-600 shrink-0">
                    -{formatCurrencyVND(myPayroll.manualDeduction)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-sm font-bold text-rose-700">
            <span>Tổng khấu trừ</span>
            <span className="font-mono">
              {myPayroll.totalDeductions > 0 ? `-${formatCurrencyVND(myPayroll.totalDeductions)}` : '0 ₫'}
            </span>
          </div>
        </div>
      </div>

      {/* Shift History in Selected Month */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            Chi Tiết Các Ca Trong {summary.monthName} ({myPayroll.shiftLines.length} ca)
          </h4>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {myPayroll.totalHours}h
          </span>
        </div>

        {myPayroll.shiftLines.length === 0 ? (
          <div className="py-12 px-6 text-center text-sm text-slate-400">
            Chưa có dữ liệu chấm công trong {summary.monthName}.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myPayroll.shiftLines.map(line => {
              const { attendance: att, wage, shiftStartTime, shiftEndTime, excuseSource } = line;
              return (
                <div
                  key={att.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{formatDateDMY(att.date)}</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {att.shiftName || `${shiftStartTime}–${shiftEndTime}`}
                      </span>
                      {wage.isHoliday && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Sparkles className="w-3 h-3" />
                          Lễ ×{wage.multiplier}
                        </span>
                      )}
                      {!wage.isHoliday && wage.isWeekend && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Cuối tuần ×{wage.multiplier}
                        </span>
                      )}
                      {wage.nightHours > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                          <Moon className="w-3 h-3" />
                          {wage.nightHours}h đêm
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Vào–Ra:{' '}
                        <strong className="font-mono text-slate-800">
                          {att.checkIn || '--:--'} → {att.checkOut || 'Đang trực'}
                        </strong>
                      </span>
                      <span>
                        Công: <strong className="text-slate-700">{wage.hoursWorked}h</strong>
                        {wage.overtimeHours > 0 && (
                          <span className="text-sky-700 font-semibold"> (+{wage.overtimeHours}h OT)</span>
                        )}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${wage.lateInfo.badgeClass}`}>
                        {wage.lateInfo.label}
                      </span>
                      {excuseSource && <span className="text-emerald-700 font-medium">{excuseSource}</span>}
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <div className="text-sm font-bold font-mono text-emerald-700">
                      {formatCurrencyVND(wage.netShiftWage)}
                    </div>
                    {wage.penaltyAmount > 0 && (
                      <div className="text-[11px] font-mono text-rose-600">
                        Phạt -{formatCurrencyVND(wage.penaltyAmount)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

