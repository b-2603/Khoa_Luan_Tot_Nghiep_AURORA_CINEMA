import React, { useState, useMemo } from 'react';
import { User, Attendance, AttendanceException, Shift } from '../types';
import {
  generateMonthlyPayroll,
  formatCurrencyVND,
  exportPayrollExcel,
  printEmployeePayslip,
  getPayrollConfig,
  savePayrollConfig,
  resetPayrollConfig,
  saveEmployeeAdjustment,
  saveEmployeePayrollStatus,
  saveAllEmployeePayrollStatuses,
  PayrollConfig,
  PayrollStatus,
  EmployeeMonthlyPayroll,
} from '../services/payrollService';
import {
  Wallet,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  Award,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  X,
  Eye,
  Settings2,
  Printer,
  Moon,
  TrendingUp,
  RotateCcw,
  Check,
  SlidersHorizontal,
  ShieldCheck,
  Plus,
  Minus,
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

interface MonthlyPayrollTableProps {
  users: User[];
  attendances: Attendance[];
  shifts?: Shift[];
  exceptions?: AttendanceException[];
  currentMonthStr?: string; // YYYY-MM
}

const STATUS_META: Record<PayrollStatus, { label: string; cls: string; next: PayrollStatus; nextLabel: string }> = {
  draft: {
    label: 'Bản nháp',
    cls: 'bg-slate-100 text-slate-700 border-slate-200',
    next: 'approved',
    nextLabel: 'Chốt lương',
  },
  approved: {
    label: 'Đã chốt',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
    next: 'paid',
    nextLabel: 'Đánh dấu đã trả',
  },
  paid: {
    label: 'Đã chi trả',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    next: 'draft',
    nextLabel: 'Mở lại nháp',
  },
};

export const MonthlyPayrollTable: React.FC<MonthlyPayrollTableProps> = ({
  users,
  attendances,
  shifts = [],
  exceptions = [],
  currentMonthStr,
}) => {
  const now = new Date();
  const defaultMonth =
    currentMonthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PayrollStatus>('all');
  const [sortBy, setSortBy] = useState<'net_desc' | 'hours_desc' | 'late_desc' | 'name_asc'>('net_desc');

  // Dynamic Payroll Config & Force-recompute version counter
  const [config, setConfig] = useState<PayrollConfig>(() => getPayrollConfig());
  const [dataVersion, setDataVersion] = useState(0);

  // Modals
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<PayrollConfig>(config);

  // Adjustment form inside Payslip modal
  const [adjBonus, setAdjBonus] = useState<number>(0);
  const [adjBonusNote, setAdjBonusNote] = useState('');
  const [adjDeduction, setAdjDeduction] = useState<number>(0);
  const [adjDeductionNote, setAdjDeductionNote] = useState('');
  const [showAdjForm, setShowAdjForm] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleMonthChange = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedEmployeeId(null);
  };

  // Compute full automated payroll
  const payrollSummary = useMemo(() => {
    void dataVersion;
    return generateMonthlyPayroll(selectedMonth, users, attendances, shifts, exceptions, config);
  }, [selectedMonth, users, attendances, shifts, exceptions, config, dataVersion]);

  const selectedEmployee: EmployeeMonthlyPayroll | null = useMemo(() => {
    if (!selectedEmployeeId) return null;
    return payrollSummary.employees.find(e => e.userId === selectedEmployeeId) || null;
  }, [selectedEmployeeId, payrollSummary]);

  const openPayslip = (emp: EmployeeMonthlyPayroll) => {
    setSelectedEmployeeId(emp.userId);
    setAdjBonus(emp.manualBonus);
    setAdjBonusNote(emp.manualBonusNote || '');
    setAdjDeduction(emp.manualDeduction);
    setAdjDeductionNote(emp.manualDeductionNote || '');
    setShowAdjForm(false);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    saveEmployeeAdjustment(selectedMonth, selectedEmployee.userId, {
      bonus: Math.max(0, Number(adjBonus) || 0),
      bonusNote: adjBonusNote.trim(),
      deduction: Math.max(0, Number(adjDeduction) || 0),
      deductionNote: adjDeductionNote.trim(),
    });
    setDataVersion(v => v + 1);
    setShowAdjForm(false);
    notify(`Đã cập nhật điều chỉnh lương cho ${selectedEmployee.userName}.`);
  };

  const handleCycleStatus = (emp: EmployeeMonthlyPayroll) => {
    const nextStatus = STATUS_META[emp.status].next;
    saveEmployeePayrollStatus(selectedMonth, emp.userId, nextStatus);
    setDataVersion(v => v + 1);
    notify(`${emp.userName}: chuyển sang "${STATUS_META[nextStatus].label}".`);
  };

  const handleBulkStatus = (status: PayrollStatus) => {
    const ids = payrollSummary.employees.map(e => e.userId);
    if (ids.length === 0) return;
    saveAllEmployeePayrollStatuses(selectedMonth, ids, status);
    setDataVersion(v => v + 1);
    notify(`Đã cập nhật ${ids.length} nhân sự sang trạng thái "${STATUS_META[status].label}".`);
  };

  const handleOpenConfig = () => {
    setDraftConfig(JSON.parse(JSON.stringify(config)));
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    savePayrollConfig(draftConfig);
    setConfig(draftConfig);
    setIsConfigModalOpen(false);
    notify('Đã lưu công thức lương mới và tính lại toàn bộ bảng lương.');
  };

  const handleResetConfig = () => {
    const def = resetPayrollConfig();
    setDraftConfig(JSON.parse(JSON.stringify(def)));
    setConfig(def);
    notify('Đã khôi phục công thức lương chuẩn Aurora Cinema.');
  };

  // Filtered & Sorted Employees
  const filteredEmployees = useMemo(() => {
    const list = payrollSummary.employees.filter(emp => {
      if (departmentFilter !== 'all' && emp.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          emp.userName.toLowerCase().includes(q) ||
          emp.staffCode.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'net_desc') return b.totalNetWage - a.totalNetWage;
      if (sortBy === 'hours_desc') return b.totalHours - a.totalHours;
      if (sortBy === 'late_desc') return b.totalLateMinutes - a.totalLateMinutes;
      return a.userName.localeCompare(b.userName, 'vi');
    });
  }, [payrollSummary, departmentFilter, statusFilter, searchTerm, sortBy]);

  const departments = useMemo(
    () => Array.from(new Set(payrollSummary.employees.map(e => e.department))),
    [payrollSummary]
  );

  // Totals for currently visible rows
  const visibleTotals = useMemo(() => {
    return filteredEmployees.reduce(
      (acc, e) => ({
        shifts: acc.shifts + e.totalShifts,
        hours: Math.round((acc.hours + e.totalHours) * 10) / 10,
        rawWage: acc.rawWage + e.totalRawWage,
        allowances: acc.allowances + e.totalAllowancesAndBonuses,
        deductions: acc.deductions + e.totalDeductions,
        netWage: acc.netWage + e.totalNetWage,
      }),
      { shifts: 0, hours: 0, rawWage: 0, allowances: 0, deductions: 0, netWage: 0 }
    );
  }, [filteredEmployees]);

  const paidPercent =
    payrollSummary.totalEmployees > 0
      ? Math.round((payrollSummary.paidCount / payrollSummary.totalEmployees) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold shadow-xl border border-slate-700">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* ══════ 1. HEADER & ACTION BAR ══════ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-bold text-slate-900 text-lg tracking-tight">
                  Bảng Lương • {payrollSummary.monthName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {payrollSummary.paidCount}/{payrollSummary.totalEmployees} đã chi trả
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-bold font-mono text-slate-800">{selectedMonth}</span>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Policy Settings */}
            <button
              type="button"
              onClick={handleOpenConfig}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-slate-500" />
              <span>Công Thức Lương</span>
            </button>

            {/* Bulk Approve / Mark Paid */}
            {payrollSummary.paidCount < payrollSummary.totalEmployees && (
              <button
                type="button"
                onClick={() =>
                  handleBulkStatus(
                    payrollSummary.approvedCount + payrollSummary.paidCount < payrollSummary.totalEmployees
                      ? 'approved'
                      : 'paid'
                  )
                }
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {payrollSummary.approvedCount + payrollSummary.paidCount < payrollSummary.totalEmployees
                    ? 'Chốt Lương Toàn Rạp'
                    : 'Xác Nhận Chi Trả Tất Cả'}
                </span>
              </button>
            )}

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => exportPayrollExcel(payrollSummary)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Active Policy Strip (Ultra clear, scannable) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span>
              Cuối tuần: <strong className="text-slate-900">×{config.weekendMultiplier}</strong>
            </span>
            <span>
              Ngày Lễ: <strong className="text-indigo-700">×{config.holidayMultiplier}</strong>
            </span>
            <span>
              Ca đêm (22h–06h):{' '}
              <strong className="text-slate-900">+{Math.round(config.nightShiftBonusRate * 100)}%</strong>
            </span>
            <span>
              Tăng ca OT: <strong className="text-slate-900">×{config.overtimeMultiplier}</strong>
            </span>
            <span>
              Cơm ca: <strong className="text-slate-900">{formatCurrencyVND(config.mealAllowancePerShift)}/ca</strong>
            </span>
            <span>
              Chuyên cần:{' '}
              <strong className="text-emerald-700">
                +{formatCurrencyVND(config.attendanceBonusAmount)}
              </strong>{' '}
              (≥{config.attendanceBonusMinShifts} ca, 0 trễ)
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenConfig}
            className="text-amber-700 hover:text-amber-800 font-semibold hover:underline cursor-pointer"
          >
            Tùy chỉnh →
          </button>
        </div>
      </div>

      {/* ══════ 2. FOUR CLEAN KPI CARDS ══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Net Pay */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Tổng Thực Lĩnh (Net)</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            {formatCurrencyVND(payrollSummary.totalNetWageAll)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Tiến độ chi trả: {paidPercent}%</span>
            <span>{payrollSummary.activeEmployees}/{payrollSummary.totalEmployees} NV có công</span>
          </div>
        </div>

        {/* KPI 2: Shifts & Hours */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Tổng Công & Giờ Làm</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {payrollSummary.totalHoursAll}h{' '}
            <span className="text-sm font-medium text-slate-500">({payrollSummary.totalShiftsAll} ca)</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 pt-1">
            {payrollSummary.holidayShiftCountAll > 0 && (
              <span className="text-indigo-700 font-semibold">
                {payrollSummary.holidayShiftCountAll} ca Lễ
              </span>
            )}
            <span>{payrollSummary.weekendShiftCountAll} ca cuối tuần</span>
            {payrollSummary.totalNightHoursAll > 0 && (
              <span>• {payrollSummary.totalNightHoursAll}h đêm</span>
            )}
            {payrollSummary.totalOvertimeHoursAll > 0 && (
              <span className="text-amber-700 font-semibold">• {payrollSummary.totalOvertimeHoursAll}h OT</span>
            )}
          </div>
        </div>

        {/* KPI 3: Allowances & Bonuses */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Tổng Phụ Cấp & Thưởng</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            +{formatCurrencyVND(payrollSummary.totalAllowancesAll)}
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Lương công gốc: <strong className="text-slate-700">{formatCurrencyVND(payrollSummary.totalGrossWageAll)}</strong>
          </div>
        </div>

        {/* KPI 4: Deductions & Penalties */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Tổng Khấu Trừ & Phạt Trễ</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {payrollSummary.totalDeductionsAll > 0
              ? `-${formatCurrencyVND(payrollSummary.totalDeductionsAll)}`
              : '0 ₫'}
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            {payrollSummary.excusedCountAll > 0 ? (
              <span className="text-emerald-700 font-medium">
                Đã tự động miễn phạt {payrollSummary.excusedCountAll} đơn duyệt
              </span>
            ) : (
              <span>Tự động trừ phạt theo mốc phút trễ</span>
            )}
          </div>
        </div>
      </div>

      {/* ══════ 3. SEARCH, FILTERS & SORT BAR ══════ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên nhân viên, mã NV hoặc bộ phận..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Tất cả bộ phận</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | PayrollStatus)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="approved">Đã chốt</option>
            <option value="paid">Đã chi trả</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-1"
            >
              <option value="net_desc">Lương cao nhất</option>
              <option value="hours_desc">Giờ công nhiều nhất</option>
              <option value="late_desc">Đi muộn nhiều nhất</option>
              <option value="name_asc">Tên A → Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══════ 4. CLEAN, SPACIOUS PAYROLL TABLE ══════ */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nhân Sự</th>
                <th className="px-4 py-3.5">Công & Giờ Làm</th>
                <th className="px-4 py-3.5 text-right">Lương Công</th>
                <th className="px-4 py-3.5 text-right">Phụ Cấp & Thưởng</th>
                <th className="px-4 py-3.5 text-right">Khấu Trừ</th>
                <th className="px-4 py-3.5 text-right text-slate-900">Thực Lĩnh</th>
                <th className="px-4 py-3.5 text-center">Trạng Thái</th>
                <th className="px-5 py-3.5 text-right">Phiếu Lương</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    Không có nhân sự phù hợp với bộ lọc trong {payrollSummary.monthName}.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const st = STATUS_META[emp.status];
                  return (
                    <tr
                      key={emp.userId}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Nhân sự */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {emp.avatar ? (
                            <img
                              src={emp.avatar}
                              alt={emp.userName}
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm shrink-0">
                              {emp.userName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{emp.userName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="truncate">{emp.department}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-600">{formatCurrencyVND(emp.hourlyRate)}/h</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Công & Giờ làm */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">
                          {emp.totalShifts} ca{' '}
                          <span className="font-mono text-xs font-normal text-slate-500">({emp.totalHours}h)</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {emp.holidayShifts > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {emp.holidayShifts} Lễ ×{config.holidayMultiplier}
                            </span>
                          )}
                          {emp.weekendShifts > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              {emp.weekendShifts} cuối tuần
                            </span>
                          )}
                          {emp.totalNightHours > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              <Moon className="w-2.5 h-2.5" />
                              {emp.totalNightHours}h đêm
                            </span>
                          )}
                          {emp.totalOvertimeHours > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              +{emp.totalOvertimeHours}h OT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lương công */}
                      <td className="px-4 py-4 text-right font-mono">
                        <div className="font-semibold text-slate-800">{formatCurrencyVND(emp.totalRawWage)}</div>
                        {(emp.dayTypePremiumTotal > 0 || emp.nightAllowanceTotal > 0 || emp.overtimeWageTotal > 0) && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Cơ bản: {formatCurrencyVND(emp.baseWageTotal)}
                          </div>
                        )}
                      </td>

                      {/* Phụ cấp & Thưởng */}
                      <td className="px-4 py-4 text-right font-mono">
                        {emp.totalAllowancesAndBonuses > 0 ? (
                          <div>
                            <div className="font-semibold text-emerald-700">
                              +{formatCurrencyVND(emp.totalAllowancesAndBonuses)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                              {[
                                emp.mealAllowanceTotal > 0 ? 'Cơm ca' : '',
                                emp.attendanceBonus > 0 ? 'Chuyên cần' : '',
                                emp.manualBonus > 0 ? 'Thưởng thêm' : '',
                              ]
                                .filter(Boolean)
                                .join(' + ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">0 ₫</span>
                        )}
                      </td>

                      {/* Khấu trừ */}
                      <td className="px-4 py-4 text-right font-mono">
                        {emp.totalDeductions > 0 ? (
                          <div>
                            <div className="font-semibold text-rose-600">
                              -{formatCurrencyVND(emp.totalDeductions)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                              {emp.totalLateCount > 0 && `${emp.totalLateCount} lần trễ (${emp.totalLateMinutes}p)`}
                              {emp.totalLateCount > 0 && emp.manualDeduction > 0 && ' • '}
                              {emp.manualDeduction > 0 && 'Khấu trừ khác'}
                            </div>
                          </div>
                        ) : (
                          <div className="font-sans">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              0 ₫
                            </span>
                            {emp.totalExcusedCount > 0 && (
                              <div className="text-[10px] text-slate-400">
                                ({emp.totalExcusedCount} đơn miễn)
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Thực lĩnh */}
                      <td className="px-4 py-4 text-right">
                        <div className="text-base font-bold font-mono text-slate-900">
                          {formatCurrencyVND(emp.totalNetWage)}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(emp)}
                          title={`Bấm để chuyển sang: ${st.nextLabel}`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer hover:opacity-85 whitespace-nowrap ${st.cls}`}
                        >
                          {st.label}
                        </button>
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPayslip(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => printEmployeePayslip(emp, payrollSummary.monthName)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="In phiếu lương"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Summary Footer */}
            {filteredEmployees.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 text-sm font-bold text-slate-900">
                  <td className="px-5 py-3.5">
                    Tổng cộng ({filteredEmployees.length} nhân sự)
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-700">
                    {visibleTotals.shifts} ca • {visibleTotals.hours}h
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    {formatCurrencyVND(visibleTotals.rawWage)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-700">
                    +{formatCurrencyVND(visibleTotals.allowances)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-rose-600">
                    {visibleTotals.deductions > 0 ? `-${formatCurrencyVND(visibleTotals.deductions)}` : '0 ₫'}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-base text-emerald-700">
                    {formatCurrencyVND(visibleTotals.netWage)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: PHIẾU LƯƠNG CHI TIẾT (PAYSLIP & SHIFT BREAKDOWN)          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          onClick={() => setSelectedEmployeeId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                {selectedEmployee.avatar ? (
                  <img
                    src={selectedEmployee.avatar}
                    alt={selectedEmployee.userName}
                    className="w-11 h-11 rounded-xl object-cover ring-2 ring-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-base shrink-0">
                    {selectedEmployee.userName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      Phiếu Lương • {selectedEmployee.userName}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                        STATUS_META[selectedEmployee.status].cls
                      }`}
                    >
                      {STATUS_META[selectedEmployee.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedEmployee.department} • Mã NV:{' '}
                    <span className="font-mono font-semibold text-slate-700">{selectedEmployee.staffCode}</span> •
                    Đơn giá:{' '}
                    <span className="font-mono font-semibold text-slate-700">
                      {formatCurrencyVND(selectedEmployee.hourlyRate)}/h
                    </span>{' '}
                    • {payrollSummary.monthName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => printEmployeePayslip(selectedEmployee, payrollSummary.monthName)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">In phiếu lương</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmployeeId(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Net Pay Banner */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Thực Lĩnh Kỳ {payrollSummary.monthName}
                  </div>
                  <div className="text-3xl font-bold font-mono text-amber-400 mt-1">
                    {formatCurrencyVND(selectedEmployee.totalNetWage)}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Tổng thu nhập {formatCurrencyVND(selectedEmployee.totalGrossIncome)} − Khấu trừ{' '}
                    {formatCurrencyVND(selectedEmployee.totalDeductions)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdjForm(v => !v)}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    {showAdjForm ? 'Ẩn điều chỉnh' : '± Thưởng / Khấu trừ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCycleStatus(selectedEmployee)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {STATUS_META[selectedEmployee.status].nextLabel}
                  </button>
                </div>
              </div>

              {/* Inline Manual Bonus / Deduction Form */}
              {showAdjForm && (
                <form
                  onSubmit={handleSaveAdjustment}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Điều chỉnh Thưởng / Ứng lương / Khấu trừ tháng {payrollSummary.monthName}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Thưởng thêm (VNĐ)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={adjBonus}
                        onChange={e => setAdjBonus(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Lý do (VD: Thưởng doanh số Combo bắp nước)"
                        value={adjBonusNote}
                        onChange={e => setAdjBonusNote(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                        <Minus className="w-3.5 h-3.5" /> Khấu trừ / Ứng lương (VNĐ)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={adjDeduction}
                        onChange={e => setAdjDeduction(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Lý do (VD: Tạm ứng lương giữa tháng)"
                        value={adjDeductionNote}
                        onChange={e => setAdjDeductionNote(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAdjForm(false)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                    >
                      Lưu điều chỉnh
                    </button>
                  </div>
                </form>
              )}

              {/* Two-Column Breakdown: Earnings vs Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <TrendingUp className="w-4 h-4" />
                    Khoản Thu Nhập (Earnings)
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Lương giờ chuẩn ({selectedEmployee.totalStandardHours}h)
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrencyVND(selectedEmployee.baseWageTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Phụ trội Cuối tuần / Ngày Lễ
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrencyVND(selectedEmployee.dayTypePremiumTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Lương tăng ca OT ({selectedEmployee.totalOvertimeHours}h)
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrencyVND(selectedEmployee.overtimeWageTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Phụ cấp làm đêm ({selectedEmployee.totalNightHours}h • +{Math.round(config.nightShiftBonusRate * 100)}%)
                      </span>
                      <span className="font-mono font-semibold text-slate-900">
                        {formatCurrencyVND(selectedEmployee.nightAllowanceTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">
                        Phụ cấp cơm ca & gửi xe
                      </span>
                      <span className="font-mono font-semibold text-emerald-700">
                        +{formatCurrencyVND(selectedEmployee.mealAllowanceTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-slate-600">Thưởng chuyên cần</div>
                        <div className="text-[11px] text-slate-400">
                          {selectedEmployee.attendanceBonusReason}
                        </div>
                      </div>
                      <span
                        className={`font-mono font-semibold shrink-0 ${
                          selectedEmployee.attendanceBonus > 0 ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {selectedEmployee.attendanceBonus > 0
                          ? `+${formatCurrencyVND(selectedEmployee.attendanceBonus)}`
                          : '0 ₫'}
                      </span>
                    </div>

                    {selectedEmployee.manualBonus > 0 && (
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-slate-600">Thưởng điều chỉnh</div>
                          {selectedEmployee.manualBonusNote && (
                            <div className="text-[11px] text-slate-400">{selectedEmployee.manualBonusNote}</div>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-emerald-700 shrink-0">
                          +{formatCurrencyVND(selectedEmployee.manualBonus)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                    <span>Tổng thu nhập (Gross)</span>
                    <span className="font-mono">{formatCurrencyVND(selectedEmployee.totalGrossIncome)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      <AlertTriangle className="w-4 h-4" />
                      Khoản Khấu Trừ (Deductions)
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="text-slate-600">Phạt đi muộn</div>
                          <div className="text-[11px] text-slate-400">
                            {selectedEmployee.totalLateCount} lần bị phạt ({selectedEmployee.totalLateMinutes} phút)
                          </div>
                        </div>
                        <span
                          className={`font-mono font-semibold shrink-0 ${
                            selectedEmployee.totalPenalties > 0 ? 'text-rose-600' : 'text-slate-400'
                          }`}
                        >
                          {selectedEmployee.totalPenalties > 0
                            ? `-${formatCurrencyVND(selectedEmployee.totalPenalties)}`
                            : '0 ₫'}
                        </span>
                      </div>

                      {selectedEmployee.totalExcusedCount > 0 && (
                        <div className="flex justify-between items-center text-xs bg-emerald-50 border border-emerald-200/70 rounded-xl px-3 py-2 text-emerald-800">
                          <span>Đơn giải trình đã duyệt miễn phạt</span>
                          <strong>{selectedEmployee.totalExcusedCount} lần (0 ₫)</strong>
                        </div>
                      )}

                      {selectedEmployee.manualDeduction > 0 && (
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="text-slate-600">Khấu trừ / Ứng lương</div>
                            {selectedEmployee.manualDeductionNote && (
                              <div className="text-[11px] text-slate-400">
                                {selectedEmployee.manualDeductionNote}
                              </div>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-rose-600 shrink-0">
                            -{formatCurrencyVND(selectedEmployee.manualDeduction)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex justify-between text-sm font-bold text-rose-700">
                    <span>Tổng khấu trừ</span>
                    <span className="font-mono">
                      {selectedEmployee.totalDeductions > 0
                        ? `-${formatCurrencyVND(selectedEmployee.totalDeductions)}`
                        : '0 ₫'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shift-by-Shift Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    Bảng Kê Từng Ca Chấm Công ({selectedEmployee.shiftLines.length} ca)
                  </h4>
                  <span className="text-xs text-slate-500">
                    Tổng {selectedEmployee.totalHours} giờ làm việc
                  </span>
                </div>

                {selectedEmployee.shiftLines.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/70">
                    Chưa ghi nhận ca làm việc nào trong {payrollSummary.monthName}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedEmployee.shiftLines.map(line => {
                      const { attendance: att, wage, shiftStartTime, shiftEndTime, excuseSource } = line;
                      return (
                        <div
                          key={att.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {formatDateDMY(att.date)}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-semibold text-slate-700">
                                {att.shiftName || `Ca (${shiftStartTime}–${shiftEndTime})`}
                              </span>
                              {wage.isHoliday && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <Sparkles className="w-3 h-3" />
                                  Lễ ×{wage.multiplier} ({wage.holidayName})
                                </span>
                              )}
                              {!wage.isHoliday && wage.isWeekend && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                  Cuối tuần ×{wage.multiplier}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>
                                Giờ chuẩn: <strong className="font-mono text-slate-700">{shiftStartTime}–{shiftEndTime}</strong>
                              </span>
                              <span>
                                Thực tế:{' '}
                                <strong className="font-mono text-slate-900">
                                  {att.checkIn || '--:--'} → {att.checkOut || 'Đang trực'}
                                </strong>
                              </span>
                              <span>
                                Tổng: <strong className="text-slate-800">{wage.hoursWorked}h</strong>
                                {wage.overtimeHours > 0 && (
                                  <span className="text-sky-700 font-semibold"> (+{wage.overtimeHours}h OT)</span>
                                )}
                                {wage.nightHours > 0 && (
                                  <span className="text-slate-700 font-semibold"> ({wage.nightHours}h đêm)</span>
                                )}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${wage.lateInfo.badgeClass}`}
                              >
                                {wage.lateInfo.label}
                              </span>
                              {excuseSource && (
                                <span className="text-[11px] text-emerald-700 font-medium">
                                  • {excuseSource}
                                </span>
                              )}
                              {wage.nightAllowance > 0 && (
                                <span className="text-[11px] text-slate-500">
                                  • PC đêm +{formatCurrencyVND(wage.nightAllowance)}
                                </span>
                              )}
                              {wage.mealAllowance > 0 && (
                                <span className="text-[11px] text-slate-500">
                                  • Cơm ca +{formatCurrencyVND(wage.mealAllowance)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="md:text-right shrink-0 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/80 min-w-[140px]">
                            <div className="text-[11px] text-slate-400">Thực nhận ca</div>
                            <div className="text-base font-bold font-mono text-emerald-700">
                              {formatCurrencyVND(wage.netShiftWage)}
                            </div>
                            {wage.penaltyAmount > 0 && (
                              <div className="text-[11px] text-rose-600 font-mono">
                                Phạt: -{formatCurrencyVND(wage.penaltyAmount)}
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

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Dữ liệu chấm công & đơn miễn trừ đồng bộ trực tiếp</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployeeId(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: CẤU HÌNH CÔNG THỨC TÍNH LƯƠNG (PAYROLL POLICY)            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isConfigModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-4"
          onClick={() => setIsConfigModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <Settings2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Cấu Hình Công Thức Tính Lương</h3>
                  <p className="text-xs text-slate-500">
                    Mọi thay đổi được áp dụng tự động cho toàn bộ bảng lương cụm rạp
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="overflow-y-auto p-6 space-y-6">
              {/* 1. Đơn giá theo bộ phận */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Đơn giá giờ chuẩn theo bộ phận (VNĐ / giờ)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(draftConfig.departmentRates).map(([dept, rate]) => (
                    <div key={dept} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-sm font-semibold text-slate-800">{dept}</span>
                      <input
                        type="number"
                        min={15000}
                        step={1000}
                        value={rate}
                        onChange={e =>
                          setDraftConfig(prev => ({
                            ...prev,
                            departmentRates: {
                              ...prev.departmentRates,
                              [dept]: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono font-bold text-right text-slate-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Hệ số nhân lương */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Hệ số ngày làm việc, tăng ca & làm đêm (BLLĐ 2019)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cuối tuần (×)</label>
                    <input
                      type="number"
                      step={0.05}
                      min={1}
                      max={3}
                      value={draftConfig.weekendMultiplier}
                      onChange={e =>
                        setDraftConfig(prev => ({ ...prev, weekendMultiplier: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày Lễ (×)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={5}
                      value={draftConfig.holidayMultiplier}
                      onChange={e =>
                        setDraftConfig(prev => ({ ...prev, holidayMultiplier: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tăng ca OT (×)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1}
                      max={4}
                      value={draftConfig.overtimeMultiplier}
                      onChange={e =>
                        setDraftConfig(prev => ({ ...prev, overtimeMultiplier: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ca đêm (+%)</label>
                    <input
                      type="number"
                      step={5}
                      min={0}
                      max={100}
                      value={Math.round(draftConfig.nightShiftBonusRate * 100)}
                      onChange={e =>
                        setDraftConfig(prev => ({
                          ...prev,
                          nightShiftBonusRate: Number(e.target.value) / 100,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Phụ cấp & Thưởng chuyên cần */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Phụ cấp tự động & Thưởng chuyên cần
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cơm ca / gửi xe (VNĐ/ca)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={draftConfig.mealAllowancePerShift}
                      onChange={e =>
                        setDraftConfig(prev => ({ ...prev, mealAllowancePerShift: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Thưởng chuyên cần (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50000}
                      value={draftConfig.attendanceBonusAmount}
                      onChange={e =>
                        setDraftConfig(prev => ({ ...prev, attendanceBonusAmount: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Số ca tối thiểu hưởng thưởng
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={draftConfig.attendanceBonusMinShifts}
                      onChange={e =>
                        setDraftConfig(prev => ({
                          ...prev,
                          attendanceBonusMinShifts: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Thang phạt đi muộn */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  4. Quy định du di & Thang phạt đi muộn (VNĐ)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Du di (phút)</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={draftConfig.graceMinutes}
                      onChange={e =>
                        setDraftConfig(prev => ({ ...prev, graceMinutes: Number(e.target.value) }))
                      }
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  {[
                    { key: 'minor' as const, label: '6 – 15p' },
                    { key: 'moderate' as const, label: '16 – 30p' },
                    { key: 'severe' as const, label: '31 – 60p' },
                    { key: 'critical' as const, label: '> 60p' },
                  ].map(tier => (
                    <div key={tier.key}>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">{tier.label}</label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={draftConfig.latePenalties[tier.key]}
                        onChange={e =>
                          setDraftConfig(prev => ({
                            ...prev,
                            latePenalties: {
                              ...prev.latePenalties,
                              [tier.key]: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Áp Dụng Công Thức</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
