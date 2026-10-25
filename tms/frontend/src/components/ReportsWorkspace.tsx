import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Building2, CalendarRange, ChevronDown, CircleDollarSign,
  CreditCard, Database, Download, FileText, Film, Package, Percent, Receipt,
  RefreshCw, RotateCcw, Search, ShoppingBasket, SlidersHorizontal, Ticket, TrendingDown, TrendingUp, Users, WalletCards, Warehouse, X
} from 'lucide-react';
import { formatVietnameseDate, VietnameseDateInput } from './VietnameseDateInput';
import './ReportsWorkspace.css';

type TabKey = 'overview' | 'theaters' | 'movies' | 'trends' | 'showtimes' | 'channels' | 'fnb' | 'products' | 'modifiers' | 'inventory' | 'transactions' | 'reconciliation' | 'promotions' | 'employees' | 'feedback';
type Row = Record<string, any>;

type ReportsData = {
  filters: { from: string; to: string; day_count: number; theater_id: number; channel: string; group_by: string; movie_id: number; screen_id: number; employee_id: number; payment_method: string; record_status: string; category: string };
  filter_options: { movies: Row[]; screens: Row[]; categories: Row[]; employees: Row[]; payment_methods: Row[] };
  selected_report: TabKey;
  report_catalog: Array<{ key: TabKey; number: string; group: string; title: string; accessible: boolean }>;
  scope: { role: string; theater: Row | null; source: string };
  export_meta: { report_code: string; report_title: string; generated_by: string; generated_role: string; data_source: string; confidentiality: string; currency: string; timezone: string };
  summary: Row;
  comparison: Row;
  trend: Row[];
  movies: Row[];
  products: Row[];
  payment_methods: Row[];
  channels: Row[];
  theaters: Row[];
  hourly: Row[];
  orders: Row[];
  showtimes: Row[];
  inventory: Row[];
  inventory_summary: Row;
  transactions: Row[];
  reconciliation: Row[];
  promotions: Row[];
  employees: Row[];
  modifiers: Row[];
  feedback: Row[];
  availability: Record<string, { available: boolean; message: string }>;
  theater_options: Row[];
  generated_at: string;
};

const money = (value: any) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const number = (value: any) => Number(value || 0).toLocaleString('vi-VN');
const compactMoney = (value: any) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (amount >= 1_000) return `${(amount / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} nghìn`;
  return number(amount);
};
const localIsoDate = (date = new Date()) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};
const firstDayOfMonth = () => `${localIsoDate().slice(0, 8)}01`;
const formatDateTime = (value: string) => {
  if (!value) return '—';
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const channelLabel = (value: string) => ({ pos: 'POS tại quầy', website: 'Website', web: 'Website', app: 'Ứng dụng', ota: 'Đối tác OTA' }[String(value).toLowerCase()] || value || 'Khác');
const paymentLabel = (value: string) => ({ CASH: 'Tiền mặt', CARD: 'Thẻ ngân hàng', BANK_TRANSFER: 'Chuyển khoản', VNPAY: 'VNPay', MOMO: 'MoMo', ZALOPAY: 'ZaloPay', OTHER: 'Khác' }[String(value).toUpperCase()] || value || 'Khác');
const escapeHtml = (value: any) => String(value ?? '—').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character] || character));
const escapeXml = (value: any) => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&apos;', '"':'&quot;' }[character] || character));

function changeClass(value: any) { return Number(value || 0) > 0 ? 'positive' : Number(value || 0) < 0 ? 'negative' : 'neutral'; }
function ChangeBadge({ value, suffix = '%' }: { value: any; suffix?: string }) {
  const numeric = Number(value || 0);
  return <span className={`reports-change ${changeClass(numeric)}`}>{numeric > 0 ? <TrendingUp/> : numeric < 0 ? <TrendingDown/> : null}{numeric > 0 ? '+' : ''}{numeric.toLocaleString('vi-VN')}{suffix}</span>;
}

export default function ReportsWorkspace({ apiBase, role, notify }: { apiBase: string; role: string; notify: (message: string) => void }) {
  const initialReport: TabKey = role === 'supervisor' ? 'showtimes' : 'overview';
  const [activeTab, setActiveTab] = useState<TabKey>(initialReport);
  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(localIsoDate);
  const [theaterId, setTheaterId] = useState(0);
  const [channel, setChannel] = useState('all');
  const [groupBy, setGroupBy] = useState('day');
  const [movieId, setMovieId] = useState(0);
  const [screenId, setScreenId] = useState(0);
  const [employeeId, setEmployeeId] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [recordStatus, setRecordStatus] = useState('ALL');
  const [category, setCategory] = useState('all');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  type FilterValues = { from: string; to: string; theaterId: number; report: TabKey; channel: string; groupBy: string; movieId: number; screenId: number; employeeId: number; paymentMethod: string; recordStatus: string; category: string };
  const load = async (overrides: Partial<FilterValues> = {}) => {
    const next: FilterValues = { from, to, theaterId, report: activeTab, channel, groupBy, movieId, screenId, employeeId, paymentMethod, recordStatus, category, ...overrides };
    if (!next.from || !next.to || next.from > next.to) { setError('Vui lòng chọn khoảng ngày hợp lệ.'); return; }
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ action: 'reports', report: next.report, from: next.from, to: next.to, channel: next.channel, group_by: next.groupBy, payment_method: next.paymentMethod, record_status: next.recordStatus, category: next.category });
      if (next.theaterId > 0) params.set('theater_id', String(next.theaterId));
      if (next.movieId > 0) params.set('movie_id', String(next.movieId));
      if (next.screenId > 0) params.set('screen_id', String(next.screenId));
      if (next.employeeId > 0) params.set('employee_id', String(next.employeeId));
      const response = await fetch(`${apiBase}?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải dữ liệu báo cáo.');
      setData(result.data);
      setActiveTab(result.data.selected_report || next.report);
      if (Number(result.data?.filters?.theater_id || 0) !== next.theaterId) setTheaterId(Number(result.data?.filters?.theater_id || 0));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu từ aurora_db.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const daily = useMemo(() => {
    if (!data) return [] as Row[];
    if (data.filters.group_by !== 'day') return data.trend;
    const lookup = new Map(data.trend.map(item => [item.report_date, item]));
    const rows: Row[] = [];
    const cursor = new Date(`${data.filters.from}T12:00:00`);
    const end = new Date(`${data.filters.to}T12:00:00`);
    while (cursor <= end && rows.length < 367) {
      const date = localIsoDate(cursor);
      rows.push({ report_date: date, net_revenue: 0, ticket_revenue: 0, concession_revenue: 0, order_count: 0, tickets_sold: 0, ...(lookup.get(date) || {}) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  }, [data]);

  const applyPreset = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'week' | 'month' | 'last_month' | 'quarter' | 'year') => {
    const now = new Date(); let start = new Date(now); let end = new Date(now);
    if (preset === 'yesterday') { start.setDate(start.getDate() - 1); end = new Date(start); }
    if (preset === '7days') start.setDate(start.getDate() - 6);
    if (preset === '30days') start.setDate(start.getDate() - 29);
    if (preset === 'week') { const offset = (start.getDay() + 6) % 7; start.setDate(start.getDate() - offset); }
    if (preset === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (preset === 'last_month') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
    if (preset === 'quarter') start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (preset === 'year') start = new Date(now.getFullYear(), 0, 1);
    const nextFrom = localIsoDate(start), nextTo = localIsoDate(end); setFrom(nextFrom); setTo(nextTo); void load({ from: nextFrom, to: nextTo });
  };

  const selectReport = (key: TabKey) => { const nextChannel = ['overview','theaters','trends','channels','fnb','products','transactions','reconciliation','promotions'].includes(key) ? channel : 'all'; const nextGroupBy = ['overview','trends'].includes(key) ? groupBy : 'day'; setActiveTab(key); setAdvancedOpen(false); setChannel(nextChannel); setGroupBy(nextGroupBy); setMovieId(0); setScreenId(0); setEmployeeId(0); setPaymentMethod('ALL'); setRecordStatus('ALL'); setCategory('all'); void load({ report: key, channel: nextChannel, groupBy: nextGroupBy, movieId: 0, screenId: 0, employeeId: 0, paymentMethod: 'ALL', recordStatus: 'ALL', category: 'all' }); };
  const resetFilters = () => { const nextFrom = firstDayOfMonth(), nextTo = localIsoDate(), nextTheaterId = role === 'cinema_admin' || role === 'supervisor' ? theaterId : 0; setFrom(nextFrom); setTo(nextTo); setTheaterId(nextTheaterId); setChannel('all'); setGroupBy('day'); setMovieId(0); setScreenId(0); setEmployeeId(0); setPaymentMethod('ALL'); setRecordStatus('ALL'); setCategory('all'); void load({ from: nextFrom, to: nextTo, theaterId: nextTheaterId, channel: 'all', groupBy: 'day', movieId: 0, screenId: 0, employeeId: 0, paymentMethod: 'ALL', recordStatus: 'ALL', category: 'all' }); };
  const logReportExport = async (format: 'pdf'|'excel', rowCount: number) => {
    if (!data) return;
    try {
      await fetch(`${apiBase}?action=report-export`, { method:'POST', credentials:'include', keepalive:true, headers:{'Content-Type':'application/json'}, body:JSON.stringify({ report:activeTab, format, from:data.filters.from, to:data.filters.to, theater_id:data.filters.theater_id, channel:data.filters.channel, row_count:rowCount }) });
    } catch { /* Export remains usable if audit logging is temporarily unavailable. */ }
  };

  const exportExcel = () => {
    if (!data) return;
    setExporting('excel');
    try {
      const config = getReportExportConfig(activeTab, data, daily);
      const xml = buildProfessionalExcel(config, data);
      const blob = new Blob([new Uint8Array([0xEF,0xBB,0xBF]), xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Aurora_${config.fileName}_${data.filters.from}_${data.filters.to}.xls`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      void logReportExport('excel', config.rows.length);
      notify('Đã xuất báo cáo Excel.');
    } catch (reason) {
      notify(reason instanceof Error ? `Không thể xuất Excel: ${reason.message}` : 'Không thể xuất báo cáo Excel.');
    } finally { setExporting(null); }
  };

  const exportPdf = () => {
    if (!data) return;
    const popup = window.open('', '_blank', 'width=1200,height=820');
    if (!popup) { notify('Trình duyệt đang chặn cửa sổ xuất PDF. Vui lòng cho phép popup và thử lại.'); return; }
    setExporting('pdf');
    try {
      const config = getReportExportConfig(activeTab, data, daily);
      const meta = data.export_meta || { report_code:'BC-AURORA', report_title:config.title, generated_by:'Quản trị viên', generated_role:data.scope.role, data_source:'aurora_db', confidentiality:'NỘI BỘ', currency:'VND', timezone:'Asia/Ho_Chi_Minh' };
      const tableHead = `<th class="index">STT</th>${config.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}`;
      const tableRows = config.rows.length ? config.rows.map((row,index) => `<tr><td class="index">${index+1}</td>${config.columns.map(column => `<td class="${column.format === 'money' || column.format === 'number' || column.format === 'percent' ? 'numeric' : ''}">${escapeHtml(renderCell(row,column))}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(1, config.columns.length+1)}" class="empty">Không có dữ liệu trong phạm vi đã chọn.</td></tr>`;
      const summaryCards = reportKpis(activeTab,data).map((item,index)=>`<div class="metric metric-${index+1}"><small>${escapeHtml(item[0])}</small><b>${escapeHtml(item[1])}</b><i></i></div>`).join('');
      const channelText = data.filters.channel === 'all' ? 'Tất cả kênh' : channelLabel(data.filters.channel);
      const groupingText = ({day:'Theo ngày',week:'Theo tuần',month:'Theo tháng',quarter:'Theo quý',year:'Theo năm'} as Record<string,string>)[data.filters.group_by] || data.filters.group_by;
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(meta.report_code)} - ${escapeHtml(config.title)}</title><style>
@page{size:A4 landscape;margin:10mm 9mm 12mm}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;color:#12243c;font-family:"Segoe UI",Arial,sans-serif;font-size:9px;background:#fff}.page{position:relative}.head{position:relative;display:flex;justify-content:space-between;align-items:center;min-height:94px;padding:17px 21px;overflow:hidden;color:#fff;background:linear-gradient(118deg,#091a30 0%,#153b66 62%,#246cac 100%);border-radius:0 0 14px 14px}.head:after{content:"";position:absolute;right:-48px;top:-86px;width:250px;height:250px;border:35px solid rgba(255,255,255,.06);border-radius:50%}.identity{display:flex;align-items:center;gap:13px;z-index:1}.logo{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:#f7c64b;color:#10213a;font-size:25px;font-weight:900;box-shadow:0 7px 18px rgba(0,0,0,.2)}.brand{font-size:10px;font-weight:900;letter-spacing:2px;color:#f7c64b}.head h1{margin:5px 0 3px;font-size:21px;line-height:1.1}.head p{margin:0;color:#cfdeef}.doc{text-align:right;z-index:1}.doc span{display:inline-block;padding:4px 9px;border:1px solid rgba(247,198,75,.65);border-radius:20px;color:#f7c64b;font-size:8px;font-weight:800;letter-spacing:1px}.doc b,.doc small{display:block;margin-top:6px}.doc small{color:#cfdeef}.meta{display:grid;grid-template-columns:repeat(6,1fr);margin:11px 0;border:1px solid #dbe5ef;border-radius:9px;overflow:hidden}.meta div{min-height:51px;padding:9px 10px;background:#f8fbfe;border-right:1px solid #dbe5ef}.meta div:last-child{border:0}.meta small,.metrics small{display:block;color:#6b7e95;font-size:7px;font-weight:800;letter-spacing:.4px;text-transform:uppercase}.meta b{display:block;margin-top:5px;font-size:9px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.metric{position:relative;overflow:hidden;min-height:61px;padding:10px 12px;border:1px solid #dce6f0;border-radius:9px;background:#fff}.metric b{display:block;margin-top:5px;font-size:15px}.metric i{position:absolute;right:-18px;bottom:-24px;width:66px;height:66px;border-radius:50%;background:#eaf2ff}.metric-2 i{background:#e6f7f1}.metric-3 i{background:#fff3df}.metric-4 i{background:#f1eafe}.section-title{display:flex;justify-content:space-between;align-items:end;margin:10px 0 6px;padding:0 1px 5px;border-bottom:2px solid #f2bb38}.section-title h2{margin:0;font-size:12px}.section-title span{color:#6f8198;font-size:8px}table{width:100%;border-collapse:collapse;table-layout:auto}thead{display:table-header-group}tr{break-inside:avoid}th{padding:7px 6px;color:#fff;background:#183e68;text-align:left;font-size:7px;letter-spacing:.25px;text-transform:uppercase;border-right:1px solid #436587}th:first-child{border-radius:5px 0 0 0}th:last-child{border-radius:0 5px 0 0;border:0}td{padding:6px;border-bottom:1px solid #dfe7ef;vertical-align:top;line-height:1.35}tbody tr:nth-child(even){background:#f6f9fc}.index{width:29px;text-align:center}.numeric{text-align:right;white-space:nowrap}.empty{text-align:center;color:#8090a4;padding:24px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin:22px 30px 0;text-align:center;break-inside:avoid}.signatures b{display:block;padding-top:6px;border-top:1px solid #94a3b5}.signatures span{display:block;height:43px;color:#7b8b9e;font-size:8px}.foot{display:flex;justify-content:space-between;margin-top:15px;padding-top:7px;border-top:1px solid #dce5ee;color:#75869b;font-size:7px}.watermark{position:fixed;z-index:-1;left:29%;top:45%;color:rgba(16,33,58,.025);font-size:68px;font-weight:900;transform:rotate(-25deg)}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.head{border-radius:0}.signatures{page-break-inside:avoid}}</style></head><body><div class="watermark">AURORA CINEMA</div><main class="page"><header class="head"><div class="identity"><span class="logo">★</span><div><span class="brand">AURORA CINEMA</span><h1>${escapeHtml(config.title)}</h1><p>Báo cáo quản trị và vận hành rạp chiếu phim</p></div></div><div class="doc"><span>${escapeHtml(meta.confidentiality)}</span><b>${escapeHtml(meta.report_code)}</b><small>Lập lúc ${escapeHtml(formatDateTime(data.generated_at))}</small></div></header><section class="meta"><div><small>Kỳ báo cáo</small><b>${escapeHtml(formatVietnameseDate(data.filters.from))} – ${escapeHtml(formatVietnameseDate(data.filters.to))}</b></div><div><small>Phạm vi</small><b>${escapeHtml(data.scope.theater?.name||'Toàn hệ thống')}</b></div><div><small>Kênh bán</small><b>${escapeHtml(channelText)}</b></div><div><small>Nhóm dữ liệu</small><b>${escapeHtml(groupingText)}</b></div><div><small>Người lập</small><b>${escapeHtml(meta.generated_by)}</b></div><div><small>Nguồn dữ liệu</small><b>${escapeHtml(meta.data_source)}</b></div></section><section class="metrics">${summaryCards}</section><div class="section-title"><h2>Chi tiết dữ liệu</h2><span>${config.rows.length} bản ghi • Đơn vị tiền tệ: ${escapeHtml(meta.currency)}</span></div><table><thead><tr>${tableHead}</tr></thead><tbody>${tableRows}</tbody></table><section class="signatures"><div><b>Người lập biểu</b><span>${escapeHtml(meta.generated_by)}</span></div><div><b>Kiểm soát</b><span>Ký và ghi rõ họ tên</span></div><div><b>Phê duyệt</b><span>Ký và ghi rõ họ tên</span></div></section><footer class="foot"><span>Aurora Cinema • Theater Management System</span><span>Dữ liệu được tổng hợp theo quyền truy cập từ aurora_db</span></footer></main><script>window.onload=function(){setTimeout(function(){window.print()},350)};<\/script></body></html>`);
      popup.document.close();
      void logReportExport('pdf', config.rows.length);
    } catch (reason) {
      popup.close();
      notify(reason instanceof Error ? `Không thể xuất PDF: ${reason.message}` : 'Không thể xuất báo cáo PDF.');
    } finally { setExporting(null); }
  };

  const showMovieFilter = ['movies','showtimes'].includes(activeTab);
  const showScreenFilter = activeTab === 'showtimes';
  const showPaymentFilter = ['channels','transactions','reconciliation'].includes(activeTab);
  const showCategoryFilter = ['fnb','products','inventory'].includes(activeTab);
  const showEmployeeFilter = ['employees','modifiers'].includes(activeTab);
  const showChannelFilter = ['overview','theaters','trends','channels','fnb','products','transactions','reconciliation','promotions'].includes(activeTab);
  const showGroupingFilter = ['overview','trends'].includes(activeTab);
  const statusOptions: Array<[string,string]> = activeTab === 'showtimes' ? [['OPEN','Đang mở'],['CLOSED','Đã đóng'],['CANCELLED','Đã hủy']]
    : activeTab === 'transactions' ? [['PAID','Thành công'],['PENDING','Chờ xử lý'],['CANCELLED','Đã hủy'],['REFUNDED','Đã hoàn tiền']]
    : activeTab === 'promotions' ? [['ACTIVE','Đang hoạt động'],['INACTIVE','Ngừng hoạt động'],['DRAFT','Bản nháp'],['PENDING','Chờ duyệt'],['APPROVED','Đã duyệt'],['PAUSED','Tạm dừng'],['EXPIRED','Hết hạn']]
    : activeTab === 'employees' ? [['ACTIVE','Đang mở ca'],['PAUSED','Tạm dừng'],['CLOSED','Đã đóng ca']] : [];
  const specializedCount = [movieId,screenId,employeeId].filter(Boolean).length + [paymentMethod !== 'ALL',recordStatus !== 'ALL',category !== 'all'].filter(Boolean).length;
  const hasAdvancedFilters = showMovieFilter || showScreenFilter || showPaymentFilter || showCategoryFilter || showEmployeeFilter || statusOptions.length > 0;
  const filterCount = specializedCount + (theaterId > 0 ? 1 : 0) + (channel !== 'all' ? 1 : 0) + (groupBy !== 'day' ? 1 : 0);
  const groupLabel = ({day:'Theo ngày',week:'Theo tuần',month:'Theo tháng',quarter:'Theo quý',year:'Theo năm'} as Record<string,string>)[groupBy] || groupBy;
  const appliedFilterLabels = [
    channel !== 'all' ? channelLabel(channel) : '', groupBy !== 'day' ? groupLabel : '',
    movieId ? data?.filter_options?.movies.find(item=>Number(item.id)===movieId)?.title : '',
    screenId ? data?.filter_options?.screens.find(item=>Number(item.id)===screenId)?.name : '',
    paymentMethod !== 'ALL' ? paymentLabel(paymentMethod) : '', category !== 'all' ? category : '',
    employeeId ? data?.filter_options?.employees.find(item=>Number(item.id)===employeeId)?.full_name : '',
    recordStatus !== 'ALL' ? statusOptions.find(item=>item[0]===recordStatus)?.[1] : ''
  ].filter(Boolean) as string[];

  return <div className="reports-workspace">
    <header className="reports-hero">
      <div><h1>Trung tâm báo cáo vận hành</h1><p>Theo dõi doanh thu, vé bán, F&B, thanh toán và hiệu suất rạp trên cùng một không gian phân tích.</p></div>
      <div className="reports-export-actions"><button className="reports-print" onClick={exportPdf} disabled={!data || loading || exporting !== null}><FileText/><span>{exporting === 'pdf' ? 'Đang tạo…' : 'Xuất PDF'}</span></button><button className="reports-export" onClick={exportExcel} disabled={!data || loading || exporting !== null}><Download/><span>{exporting === 'excel' ? 'Đang tạo…' : 'Xuất Excel'}</span></button></div>
    </header>

    <section className="reports-filter-card reports-filter-v2">
      <header className="reports-filter-heading"><div><SlidersHorizontal/><span><b>Bộ lọc báo cáo</b><small>Tùy chỉnh phạm vi và điều kiện tổng hợp</small></span></div><button onClick={resetFilters} disabled={loading}><RotateCcw/>Đặt lại{filterCount ? ` (${filterCount})` : ''}</button></header>
      <div className="reports-filter-primary">
        <div className="reports-date-field"><label>Từ ngày</label><VietnameseDateInput value={from} onChange={setFrom} max={to} ariaLabel="Từ ngày báo cáo"/></div>
        <div className="reports-date-field"><label>Đến ngày</label><VietnameseDateInput value={to} onChange={setTo} min={from} max={localIsoDate()} ariaLabel="Đến ngày báo cáo"/></div>
        <FilterSelect label="Phạm vi rạp" icon={Building2} value={theaterId} disabled={role === 'cinema_admin' || role === 'supervisor'} onChange={value => { setTheaterId(Number(value)); setScreenId(0); setEmployeeId(0); }} options={[{value:0,label:'Toàn hệ thống'},...(data?.theater_options || []).map(item=>({value:item.id,label:item.name}))]}/>
        {showChannelFilter && <FilterSelect label="Kênh bán" icon={WalletCards} value={channel} onChange={setChannel} options={[{value:'all',label:'Tất cả kênh'},{value:'pos',label:'POS tại quầy'},{value:'website',label:'Website'},{value:'app',label:'Ứng dụng'},{value:'ota',label:'Đối tác OTA'}]}/>} 
        {showGroupingFilter && <FilterSelect label="Nhóm thời gian" icon={CalendarRange} value={groupBy} onChange={setGroupBy} options={[{value:'day',label:'Theo ngày'},{value:'week',label:'Theo tuần'},{value:'month',label:'Theo tháng'},{value:'quarter',label:'Theo quý'},{value:'year',label:'Theo năm'}]}/>} 
        <button className="reports-apply" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''}/><span>{loading ? 'Đang lọc…' : 'Áp dụng'}</span></button>
      </div>
      <div className="reports-filter-actions"><span>Chọn nhanh:</span><button onClick={() => applyPreset('today')}>Hôm nay</button><button onClick={() => applyPreset('yesterday')}>Hôm qua</button><button onClick={() => applyPreset('7days')}>7 ngày</button><button onClick={() => applyPreset('30days')}>30 ngày</button><button onClick={() => applyPreset('week')}>Tuần này</button><button onClick={() => applyPreset('month')}>Tháng này</button><button onClick={() => applyPreset('last_month')}>Tháng trước</button><button onClick={() => applyPreset('quarter')}>Quý này</button><button onClick={() => applyPreset('year')}>Năm nay</button>{hasAdvancedFilters && <button className={advancedOpen ? 'active' : ''} onClick={() => setAdvancedOpen(value => !value)}><SlidersHorizontal/>Bộ lọc nâng cao{specializedCount ? ` (${specializedCount})` : ''}</button>}</div>
      {advancedOpen && hasAdvancedFilters && <div className="reports-filter-advanced">
        {showMovieFilter && <FilterSelect label="Phim" icon={Film} value={movieId} onChange={value=>{setMovieId(Number(value));setScreenId(0);}} options={[{value:0,label:'Tất cả phim'},...(data?.filter_options?.movies || []).map(item=>({value:item.id,label:item.title}))]}/>} 
        {showScreenFilter && <FilterSelect label="Phòng chiếu" icon={Building2} value={screenId} onChange={value=>setScreenId(Number(value))} options={[{value:0,label:'Tất cả phòng'},...(data?.filter_options?.screens || []).map(item=>({value:item.id,label:`${item.theater_name} · ${item.name} (${item.screen_type})`}))]}/>} 
        {showPaymentFilter && <FilterSelect label="Phương thức thanh toán" icon={CreditCard} value={paymentMethod} onChange={setPaymentMethod} options={[{value:'ALL',label:'Tất cả phương thức'},...(data?.filter_options?.payment_methods || []).map(item=>({value:item.value,label:paymentLabel(item.value)}))]}/>} 
        {showCategoryFilter && <FilterSelect label="Danh mục hàng hóa" icon={Package} value={category} onChange={setCategory} options={[{value:'all',label:'Tất cả danh mục'},...(data?.filter_options?.categories || []).map(item=>({value:item.value,label:item.label}))]}/>} 
        {showEmployeeFilter && <FilterSelect label="Nhân viên" icon={Users} value={employeeId} onChange={value=>setEmployeeId(Number(value))} options={[{value:0,label:'Tất cả nhân viên'},...(data?.filter_options?.employees || []).map(item=>({value:item.id,label:`${item.employee_code} · ${item.full_name}` }))]}/>} 
        {statusOptions.length > 0 && <FilterSelect label="Trạng thái" icon={RefreshCw} value={recordStatus} onChange={setRecordStatus} options={[{value:'ALL',label:'Tất cả trạng thái'},...statusOptions.map(item=>({value:item[0],label:item[1]}))]}/>} 
      </div>}
    </section>

    {error ? <section className="reports-error"><BarChart3/><div><b>Chưa thể tải báo cáo</b><span>{error}</span></div><button onClick={() => void load()}>Thử lại</button></section> : null}
    {loading && !data ? <ReportsLoading/> : data ? <>
      <section className="reports-context"><span><CalendarRange/>{formatVietnameseDate(data.filters.from)} – {formatVietnameseDate(data.filters.to)} · {data.filters.day_count} ngày</span><span><Building2/>{data.scope.theater?.name || 'Toàn hệ thống'}</span>{appliedFilterLabels.map(label=><span className="reports-filter-chip" key={label}>{label}</span>)}<span><Database/>Cập nhật {formatDateTime(data.generated_at)}</span></section>
      <ReportKpis data={data} active={activeTab}/>
      <div className="reports-module-layout">
        <ReportCatalog items={data.report_catalog} active={activeTab} onSelect={selectReport}/>
        <main className="reports-module-content">
          <ReportTitle item={data.report_catalog.find(item => item.key === activeTab)}/>
          <ReportView report={activeTab} data={data} daily={daily}/>
        </main>
      </div>
    </> : null}
  </div>;
}

function FilterSelect({ label, icon: Icon, value, options, onChange, disabled = false }: { label: string; icon: any; value: string | number; options: Array<{ value: string | number; label: string }>; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="reports-select-field"><span>{label}</span><div><Icon/><select value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={String(option.value)} value={option.value}>{option.label}</option>)}</select><ChevronDown/></div></label>;
}

function ReportCatalog({ items, active, onSelect }: { items: ReportsData['report_catalog']; active: TabKey; onSelect: (key: TabKey) => void }) {
  const groups = Array.from(new Set(items.map(item => item.group)));
  return <aside className="reports-catalog"><header><BarChart3/><div><b>Danh mục báo cáo</b><small>15 báo cáo quản trị</small></div></header>{groups.map(group => <section key={group}><h3>{group}</h3>{items.filter(item => item.group === group).map(item => <button key={item.key} className={active === item.key ? 'active' : ''} disabled={!item.accessible} title={!item.accessible ? 'Vai trò hiện tại không có quyền xem báo cáo này' : item.title} onClick={() => onSelect(item.key)}><span>{item.number}</span><b>{item.title}</b></button>)}</section>)}</aside>;
}

function ReportTitle({ item }: { item?: ReportsData['report_catalog'][number] }) {
  return <header className="reports-current-title"><div><span>BÁO CÁO {item?.number || '—'}</span><h2>{item?.title || 'Báo cáo vận hành'}</h2></div></header>;
}

type ReportColumn = { key: string; label: string; format?: 'money' | 'number' | 'percent' | 'datetime' | 'channel' | 'payment' };
const renderCell = (row: Row, column: ReportColumn) => {
  const value = row[column.key];
  if (column.format === 'money') return money(value);
  if (column.format === 'number') return number(value);
  if (column.format === 'percent') return `${Number(value || 0).toLocaleString('vi-VN')}%`;
  if (column.format === 'datetime') return formatDateTime(value);
  if (column.format === 'channel') return channelLabel(value);
  if (column.format === 'payment') return paymentLabel(value);
  return value === null || value === undefined || value === '' ? '—' : String(value);
};
const exportCellValue = (row: Row, column: ReportColumn) => column.format === 'money' || column.format === 'number' || column.format === 'percent' ? Number(row[column.key] || 0) : renderCell(row, column);

type ExportConfig = { title: string; fileName: string; rows: Row[]; columns: ReportColumn[] };
const reportKpis = (report: TabKey, data: ReportsData): Array<[string,string]> => {
  if (report === 'inventory') return [['Giá trị tồn',money(data.inventory_summary.stock_value)],['SKU quản lý',number(data.inventory_summary.sku_count)],['SKU sắp hết',number(data.inventory_summary.low_stock)],['SKU hết hàng',number(data.inventory_summary.out_of_stock)]];
  if (report === 'transactions' || report === 'reconciliation') return [['Số giao dịch',number(data.transactions.length)],['Giá trị giao dịch',money(data.transactions.reduce((sum,row)=>sum+Number(row.amount||0),0))],['Tiền hoàn',money(data.summary.refund_amount)],['Phương thức',number(data.payment_methods.length)]];
  if (report === 'promotions') return [['Chương trình',number(data.promotions.length)],['Lượt sử dụng',number(data.promotions.reduce((sum,row)=>sum+Number(row.used_count||0),0))],['Giá trị ưu đãi',money(data.promotions.reduce((sum,row)=>sum+Number(row.discount_amount||0),0))],['Doanh thu liên quan',money(data.promotions.reduce((sum,row)=>sum+Number(row.related_revenue||0),0))]];
  if (report === 'employees') return [['Ca làm việc',number(data.employees.length)],['Doanh số theo ca',money(data.employees.reduce((sum,row)=>sum+Number(row.net_revenue||0),0))],['Vé đã bán',number(data.employees.reduce((sum,row)=>sum+Number(row.tickets_sold||0),0))],['F&B / MER',money(data.employees.reduce((sum,row)=>sum+Number(row.concession_revenue||0),0))]];
  return [['Doanh thu thuần',money(data.summary.net_revenue)],['Vé đã bán',`${number(data.summary.tickets_sold)} vé`],['F&B & hàng hóa',money(data.summary.concession_revenue)],['Tỷ lệ lấp đầy',`${Number(data.summary.occupancy_rate||0).toLocaleString('vi-VN')}%`]];
};

function buildProfessionalExcel(config: ExportConfig, data: ReportsData) {
  const columnCount = Math.max(10, config.columns.length + 1);
  const mergeAll = columnCount - 1;
  const excelCell = (value: any, style = 'Text', type: 'String'|'Number' = 'String') => `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
  const spanCell = (value: any, style: string, span: number) => `<Cell ss:StyleID="${style}" ss:MergeAcross="${Math.max(0,span)}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
  const meta = data.export_meta || { report_code:'BC-AURORA', report_title:config.title, generated_by:'Quản trị viên', generated_role:data.scope.role, data_source:'aurora_db', confidentiality:'NỘI BỘ', currency:'VND', timezone:'Asia/Ho_Chi_Minh' };
  const groupLabel = ({day:'Theo ngày',week:'Theo tuần',month:'Theo tháng',quarter:'Theo quý',year:'Theo năm'} as Record<string,string>)[data.filters.group_by] || data.filters.group_by;
  const channelText = data.filters.channel === 'all' ? 'Tất cả kênh' : channelLabel(data.filters.channel);
  const kpis = reportKpis(data.selected_report, data);
  const widths = Array.from({length:columnCount},(_,index)=> `<Column ss:AutoFitWidth="0" ss:Width="${index < config.columns.length ? Math.min(210,Math.max(90,config.columns[index].label.length*9)) : 92}"/>`).join('');
  const kpiLabels = kpis.map(item=>spanCell(item[0],'KpiLabel',1)).join('');
  const kpiValues = kpis.map(item=>spanCell(item[1],'KpiValue',1)).join('');
  const headers = config.columns.map(column=>excelCell(column.label,'Header')).join('');
  const rows = config.rows.length ? config.rows.map((row,index)=> `<Row ss:AutoFitHeight="1">${excelCell(index+1,'Index','Number')}${config.columns.map(column => {
    const numeric = ['money','number','percent'].includes(column.format || '');
    const style = column.format === 'money' ? 'Money' : column.format === 'percent' ? 'Percent' : column.format === 'number' ? 'Number' : 'Text';
    return excelCell(numeric ? exportCellValue(row,column) : renderCell(row,column),style,numeric?'Number':'String');
  }).join('')}</Row>`).join('') : `<Row ss:Height="38">${spanCell('Không có dữ liệu trong phạm vi đã chọn.','Empty',mergeAll)}</Row>`;
  const titleMerge = Math.max(0,columnCount - 1);
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Author>${escapeXml(meta.generated_by)}</Author><Company>Aurora Cinema</Company><Title>${escapeXml(config.title)}</Title><Description>Dữ liệu tổng hợp từ aurora_db</Description></DocumentProperties>
<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#172B45"/></Style>
<Style ss:ID="Brand"><Alignment ss:Vertical="Center"/><Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#F7C64B"/><Interior ss:Color="#10213A" ss:Pattern="Solid"/></Style>
<Style ss:ID="Title"><Alignment ss:Vertical="Center"/><Font ss:FontName="Segoe UI" ss:Size="20" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#10213A" ss:Pattern="Solid"/></Style>
<Style ss:ID="Subtitle"><Alignment ss:Vertical="Center"/><Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#DDE8F5"/><Interior ss:Color="#10213A" ss:Pattern="Solid"/></Style>
<Style ss:ID="Section"><Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#10213A"/><Interior ss:Color="#F7C64B" ss:Pattern="Solid"/></Style>
<Style ss:ID="MetaLabel"><Font ss:Bold="1" ss:Color="#63758C"/><Interior ss:Color="#EDF3FA" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E3EF"/></Borders></Style>
<Style ss:ID="MetaValue"><Font ss:Bold="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D8E3EF"/></Borders></Style>
<Style ss:ID="KpiLabel"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#63758C"/><Interior ss:Color="#F4F8FC" ss:Pattern="Solid"/><Borders><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E4EF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E4EF"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E4EF"/></Borders></Style>
<Style ss:ID="KpiValue"><Alignment ss:Horizontal="Center"/><Font ss:Size="15" ss:Bold="1" ss:Color="#1768D3"/><Interior ss:Color="#F4F8FC" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E4EF"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E4EF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E4EF"/></Borders></Style>
<Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1C4775" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFFFFF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#53779C"/></Borders></Style>
<Style ss:ID="Index"><Alignment ss:Horizontal="Center"/><Interior ss:Color="#EDF3FA" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCE5EF"/></Borders></Style>
<Style ss:ID="Text"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCE5EF"/></Borders></Style>
<Style ss:ID="Number"><Alignment ss:Horizontal="Right"/><NumberFormat ss:Format="#,##0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCE5EF"/></Borders></Style>
<Style ss:ID="Money"><Alignment ss:Horizontal="Right"/><Font ss:Bold="1" ss:Color="#10213A"/><NumberFormat ss:Format="#,##0 &quot;đ&quot;"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCE5EF"/></Borders></Style>
<Style ss:ID="Percent"><Alignment ss:Horizontal="Right"/><NumberFormat ss:Format="0.0&quot;%&quot;"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DCE5EF"/></Borders></Style>
<Style ss:ID="Empty"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Font ss:Italic="1" ss:Color="#7B8CA1"/><Interior ss:Color="#F7F9FC" ss:Pattern="Solid"/></Style>
<Style ss:ID="Footer"><Alignment ss:Horizontal="Center"/><Font ss:Size="8" ss:Italic="1" ss:Color="#74869C"/></Style>
</Styles><Worksheet ss:Name="Báo cáo Aurora"><Table>${widths}
<Row ss:Height="24">${spanCell('★  AURORA CINEMA  •  THEATER MANAGEMENT SYSTEM','Brand',titleMerge)}</Row>
<Row ss:Height="34">${spanCell(config.title,'Title',titleMerge)}</Row>
<Row ss:Height="22">${spanCell(`${meta.report_code}  |  ${meta.confidentiality}  |  Nguồn dữ liệu: ${meta.data_source}`,'Subtitle',titleMerge)}</Row>
<Row ss:Height="10"/><Row ss:Height="22">${spanCell('THÔNG TIN BÁO CÁO','Section',titleMerge)}</Row>
<Row>${excelCell('Kỳ báo cáo','MetaLabel')}${spanCell(`${formatVietnameseDate(data.filters.from)} – ${formatVietnameseDate(data.filters.to)} (${data.filters.day_count} ngày)`,'MetaValue',2)}${excelCell('Phạm vi','MetaLabel')}${spanCell(data.scope.theater?.name||'Toàn hệ thống','MetaValue',2)}${excelCell('Mã báo cáo','MetaLabel')}${excelCell(meta.report_code,'MetaValue')}</Row>
<Row>${excelCell('Kênh bán','MetaLabel')}${spanCell(channelText,'MetaValue',2)}${excelCell('Nhóm dữ liệu','MetaLabel')}${spanCell(groupLabel,'MetaValue',2)}${excelCell('Người lập','MetaLabel')}${excelCell(meta.generated_by,'MetaValue')}</Row>
<Row>${excelCell('Thời điểm xuất','MetaLabel')}${spanCell(formatDateTime(data.generated_at),'MetaValue',2)}${excelCell('Múi giờ','MetaLabel')}${spanCell(meta.timezone,'MetaValue',2)}${excelCell('Đơn vị tiền','MetaLabel')}${excelCell(meta.currency,'MetaValue')}</Row>
<Row ss:Height="10"/><Row>${kpiLabels}</Row><Row ss:Height="28">${kpiValues}</Row><Row ss:Height="10"/>
<Row ss:Height="22">${spanCell(`CHI TIẾT DỮ LIỆU • ${config.rows.length} BẢN GHI`,'Section',titleMerge)}</Row>
<Row ss:Height="28">${excelCell('STT','Header')}${headers}</Row>${rows}
<Row ss:Height="16"/><Row ss:Height="22">${spanCell('Người lập biểu','MetaLabel',1)}${spanCell('Kiểm soát','MetaLabel',1)}${spanCell('Phê duyệt','MetaLabel',2)}</Row>
<Row ss:Height="52">${spanCell(meta.generated_by,'MetaValue',1)}${spanCell('','MetaValue',1)}${spanCell('','MetaValue',2)}</Row>
<Row ss:Height="22">${spanCell('Tài liệu nội bộ Aurora Cinema • Dữ liệu được tổng hợp theo quyền truy cập từ aurora_db','Footer',titleMerge)}</Row>
</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape"/><Header x:Margin="0.3"/><Footer x:Margin="0.3"/><PageMargins x:Bottom="0.5" x:Left="0.35" x:Right="0.35" x:Top="0.5"/></PageSetup><FitToPage/><Print><FitWidth>1</FitWidth><ValidPrinterInfo/></Print><FreezePanes/><FrozenNoSplit/><SplitHorizontal>13</SplitHorizontal><TopRowBottomPane>13</TopRowBottomPane><ActivePane>2</ActivePane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions><AutoFilter x:Range="R14C1:R${14+Math.max(1,config.rows.length)}C${config.columns.length+1}" xmlns="urn:schemas-microsoft-com:office:excel"/></Worksheet></Workbook>`;
}

function getReportExportConfig(report: TabKey, data: ReportsData, daily: Row[]): ExportConfig {
  const item = data.report_catalog.find(entry => entry.key === report);
  const base = { title: item?.title || 'Báo cáo vận hành', fileName: `Bao_cao_${item?.number || report}` };
  if (report === 'overview' || report === 'trends') return {...base,rows:daily,columns:[{key:'report_date',label:'Kỳ báo cáo'},{key:'order_count',label:'Số đơn',format:'number'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'ticket_revenue',label:'Doanh thu vé',format:'money'},{key:'concession_revenue',label:'F&B / hàng hóa',format:'money'},{key:'net_revenue',label:'Doanh thu thuần',format:'money'}]};
  if (report === 'theaters') return {...base,rows:data.theaters,columns:[{key:'name',label:'Rạp'},{key:'city',label:'Khu vực'},{key:'net_revenue',label:'Tổng doanh thu',format:'money'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'concession_revenue',label:'F&B / MER',format:'money'},{key:'occupancy_rate',label:'Lấp đầy',format:'percent'}]};
  if (report === 'movies') return {...base,rows:data.movies,columns:[{key:'title',label:'Phim'},{key:'genre',label:'Thể loại'},{key:'showtime_count',label:'Suất chiếu',format:'number'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'ticket_revenue',label:'Doanh thu vé',format:'money'},{key:'occupancy_rate',label:'Lấp đầy',format:'percent'}]};
  if (report === 'showtimes') return {...base,rows:data.showtimes,columns:[{key:'movie_title',label:'Phim'},{key:'theater_name',label:'Rạp'},{key:'screen_name',label:'Phòng'},{key:'starts_at',label:'Bắt đầu',format:'datetime'},{key:'tickets_sold',label:'Ghế bán',format:'number'},{key:'available_seats',label:'Sức chứa',format:'number'},{key:'occupancy_rate',label:'Lấp đầy',format:'percent'},{key:'ticket_revenue',label:'Doanh thu',format:'money'}]};
  if (report === 'channels') return {...base,rows:data.channels,columns:[{key:'channel',label:'Kênh bán',format:'channel'},{key:'order_count',label:'Số đơn',format:'number'},{key:'revenue',label:'Doanh thu',format:'money'}]};
  if (report === 'fnb' || report === 'products') return {...base,rows:data.products,columns:[{key:'item_code',label:'SKU'},{key:'item_name',label:'Sản phẩm'},{key:'item_type',label:'Nhóm'},{key:'quantity',label:'Số lượng',format:'number'},{key:'order_count',label:'Số đơn',format:'number'},{key:'average_price',label:'Giá bán TB',format:'money'},{key:'revenue',label:'Doanh thu',format:'money'}]};
  if (report === 'inventory') return {...base,rows:data.inventory,columns:[{key:'theater_name',label:'Rạp'},{key:'sku',label:'SKU'},{key:'product_name',label:'Mặt hàng'},{key:'category',label:'Danh mục'},{key:'received_quantity',label:'Nhập',format:'number'},{key:'issued_quantity',label:'Xuất',format:'number'},{key:'stock_quantity',label:'Tồn cuối',format:'number'},{key:'reorder_level',label:'Tồn tối thiểu',format:'number'},{key:'stock_value',label:'Giá trị tồn',format:'money'}]};
  if (report === 'transactions') return {...base,rows:data.transactions,columns:[{key:'order_code',label:'Mã đơn'},{key:'payment_code',label:'Mã thanh toán'},{key:'theater_name',label:'Rạp'},{key:'created_at',label:'Thời gian',format:'datetime'},{key:'channel',label:'Kênh',format:'channel'},{key:'payment_method',label:'Phương thức',format:'payment'},{key:'amount',label:'Số tiền',format:'money'},{key:'payment_status',label:'Trạng thái'}]};
  if (report === 'reconciliation') return {...base,rows:data.reconciliation,columns:[{key:'payment_method',label:'Phương thức',format:'payment'},{key:'transaction_count',label:'Giao dịch',format:'number'},{key:'system_amount',label:'Hệ thống ghi nhận',format:'money'},{key:'partner_amount',label:'Đối tác / thực nhận',format:'money'},{key:'difference_amount',label:'Chênh lệch',format:'money'},{key:'reconciliation_status',label:'Trạng thái'}]};
  if (report === 'promotions') return {...base,rows:data.promotions,columns:[{key:'code',label:'Mã'},{key:'name',label:'Chương trình'},{key:'source_type',label:'Loại'},{key:'start_date',label:'Bắt đầu'},{key:'end_date',label:'Kết thúc'},{key:'issued_count',label:'Phát hành',format:'number'},{key:'used_count',label:'Đã dùng',format:'number'},{key:'discount_amount',label:'Giá trị ưu đãi',format:'money'},{key:'related_revenue',label:'Doanh thu liên quan',format:'money'},{key:'status',label:'Trạng thái'}]};
  if (report === 'employees') return {...base,rows:data.employees,columns:[{key:'employee_code',label:'Mã NV'},{key:'full_name',label:'Nhân viên'},{key:'theater_name',label:'Rạp'},{key:'counter',label:'Quầy'},{key:'opened_at',label:'Mở ca',format:'datetime'},{key:'order_count',label:'Số đơn',format:'number'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'ticket_revenue',label:'Doanh thu vé',format:'money'},{key:'concession_revenue',label:'F&B / MER',format:'money'},{key:'net_revenue',label:'Tổng doanh số',format:'money'}]};
  const unavailable = data.availability[report];
  return {...base,rows:[{status:unavailable?.available?'Sẵn sàng':'Chưa có nguồn dữ liệu',message:unavailable?.message||'Chưa có dữ liệu phù hợp trong aurora_db.'}],columns:[{key:'status',label:'Trạng thái'},{key:'message',label:'Ghi chú nguồn dữ liệu'}]};
}

function ReportView({ report, data, daily }: { report: TabKey; data: ReportsData; daily: Row[] }) {
  if (report === 'overview') return <Overview data={data} daily={daily}/>;
  if (report === 'trends') return <RevenueReport data={data} daily={daily}/>;
  if (report === 'channels') return <PaymentsReport data={data}/>;
  if (report === 'theaters') return <DataExplorer title="So sánh doanh thu theo rạp" icon={Building2} rows={data.theaters} columns={[
    {key:'name',label:'Rạp'},{key:'city',label:'Khu vực'},{key:'net_revenue',label:'Tổng doanh thu',format:'money'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'concession_revenue',label:'F&B / MER',format:'money'},{key:'occupancy_rate',label:'Lấp đầy',format:'percent'}]}/>;
  if (report === 'movies') return <DataExplorer title="Doanh thu và hiệu suất phim" icon={Film} rows={data.movies} columns={[
    {key:'title',label:'Phim'},{key:'genre',label:'Thể loại'},{key:'showtime_count',label:'Suất chiếu',format:'number'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'ticket_revenue',label:'Doanh thu vé',format:'money'},{key:'occupancy_rate',label:'Lấp đầy',format:'percent'}]}/>;
  if (report === 'showtimes') return <DataExplorer title="Hiệu suất từng suất chiếu" icon={Film} rows={data.showtimes} columns={[
    {key:'movie_title',label:'Phim'},{key:'theater_name',label:'Rạp'},{key:'screen_name',label:'Phòng'},{key:'starts_at',label:'Bắt đầu',format:'datetime'},{key:'tickets_sold',label:'Ghế bán',format:'number'},{key:'available_seats',label:'Sức chứa',format:'number'},{key:'occupancy_rate',label:'Lấp đầy',format:'percent'},{key:'ticket_revenue',label:'Doanh thu',format:'money'}]}/>;
  if (report === 'fnb' || report === 'products') return <DataExplorer title={report === 'fnb' ? 'Doanh thu F&B và Merchandise' : 'Top sản phẩm và combo bán chạy'} icon={ShoppingBasket} rows={data.products} columns={[
    {key:'item_code',label:'SKU'},{key:'item_name',label:'Sản phẩm'},{key:'item_type',label:'Nhóm'},{key:'quantity',label:'Số lượng',format:'number'},{key:'order_count',label:'Số đơn',format:'number'},{key:'average_price',label:'Giá bán TB',format:'money'},{key:'revenue',label:'Doanh thu',format:'money'}]}/>;
  if (report === 'inventory') return <DataExplorer title="Nhập – xuất – tồn theo rạp" icon={Warehouse} rows={data.inventory} columns={[
    {key:'theater_name',label:'Rạp'},{key:'sku',label:'SKU'},{key:'product_name',label:'Mặt hàng'},{key:'category',label:'Danh mục'},{key:'received_quantity',label:'Nhập',format:'number'},{key:'issued_quantity',label:'Xuất',format:'number'},{key:'stock_quantity',label:'Tồn cuối',format:'number'},{key:'reorder_level',label:'Tồn tối thiểu',format:'number'},{key:'stock_value',label:'Giá trị tồn',format:'money'}]}/>;
  if (report === 'transactions') return <DataExplorer title="Giao dịch thanh toán và hoàn tiền" icon={Receipt} rows={data.transactions} columns={[
    {key:'order_code',label:'Mã đơn'},{key:'payment_code',label:'Mã thanh toán'},{key:'theater_name',label:'Rạp'},{key:'created_at',label:'Thời gian',format:'datetime'},{key:'channel',label:'Kênh',format:'channel'},{key:'payment_method',label:'Phương thức',format:'payment'},{key:'amount',label:'Số tiền',format:'money'},{key:'payment_status',label:'Trạng thái'}]}/>;
  if (report === 'reconciliation') return <><AvailabilityNotice info={data.availability.reconciliation}/><DataExplorer title="Số liệu hệ thống chờ đối soát" icon={CreditCard} rows={data.reconciliation} columns={[
    {key:'payment_method',label:'Phương thức',format:'payment'},{key:'transaction_count',label:'Giao dịch',format:'number'},{key:'system_amount',label:'Hệ thống ghi nhận',format:'money'},{key:'partner_amount',label:'Đối tác / thực nhận',format:'money'},{key:'difference_amount',label:'Chênh lệch',format:'money'},{key:'reconciliation_status',label:'Trạng thái'}]}/></>;
  if (report === 'promotions') return <DataExplorer title="Hiệu quả chương trình và voucher" icon={Percent} rows={data.promotions} columns={[
    {key:'code',label:'Mã'},{key:'name',label:'Chương trình'},{key:'source_type',label:'Loại'},{key:'start_date',label:'Bắt đầu'},{key:'end_date',label:'Kết thúc'},{key:'issued_count',label:'Phát hành',format:'number'},{key:'used_count',label:'Đã dùng',format:'number'},{key:'discount_amount',label:'Giá trị ưu đãi',format:'money'},{key:'related_revenue',label:'Doanh thu liên quan',format:'money'},{key:'status',label:'Trạng thái'}]}/>;
  if (report === 'employees') return <DataExplorer title="Doanh số nhân viên theo ca" icon={Users} rows={data.employees} columns={[
    {key:'employee_code',label:'Mã NV'},{key:'full_name',label:'Nhân viên'},{key:'theater_name',label:'Rạp'},{key:'counter',label:'Quầy'},{key:'opened_at',label:'Mở ca',format:'datetime'},{key:'order_count',label:'Số đơn',format:'number'},{key:'tickets_sold',label:'Vé bán',format:'number'},{key:'ticket_revenue',label:'Doanh thu vé',format:'money'},{key:'concession_revenue',label:'F&B / MER',format:'money'},{key:'net_revenue',label:'Tổng doanh số',format:'money'}]}/>;
  if (report === 'modifiers') return <AvailabilityNotice info={data.availability.modifiers}/>;
  return <AvailabilityNotice info={data.availability.feedback}/>;
}

function AvailabilityNotice({ info }: { info?: { available: boolean; message: string } }) {
  return <section className="reports-source-notice"><Database/><div><b>Nguồn dữ liệu đang được chuẩn bị</b><p>{info?.message || 'Chưa có dữ liệu phù hợp trong aurora_db.'}</p></div></section>;
}

function DataExplorer({ title, icon: Icon, rows, columns }: { title: string; icon: any; rows: Row[]; columns: ReportColumn[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);
  const pageSize = 10;
  const filtered = useMemo(() => rows.filter(row => !query || Object.values(row).some(value => String(value ?? '').toLowerCase().includes(query.toLowerCase()))), [rows, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);
  return <section className="reports-panel reports-data-explorer"><div className="reports-table-toolbar"><PanelHeader title={title} icon={Icon}/><label><Search/><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm trong báo cáo…"/></label></div>
    {visible.length ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={row.id || `${index}-${Object.values(row)[0]}`} onClick={() => setSelected(row)}>{columns.map(column => <td key={column.key}>{renderCell(row, column)}</td>)}</tr>)}</tbody></table></div> : <EmptyReport icon={Icon} text="Không có dữ liệu phù hợp với bộ lọc hiện tại."/>}
    <footer className="reports-pagination"><span>Trang {Math.min(page, pages)}/{pages} · {number(filtered.length)} dòng</span><div><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><button disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Sau</button></div></footer>
    {selected && <div className="reports-drawer-backdrop" onClick={() => setSelected(null)}><aside className="reports-drawer" onClick={event => event.stopPropagation()}><header><div><span>DRILL-DOWN</span><h3>Chi tiết bản ghi</h3></div><button onClick={() => setSelected(null)}><X/></button></header><dl>{columns.map(column => <div key={column.key}><dt>{column.label}</dt><dd>{renderCell(selected, column)}</dd></div>)}</dl></aside></div>}
  </section>;
}

function ReportKpis({ data, active }: { data: ReportsData; active: TabKey }) {
  const s = data.summary, c = data.comparison;
  let cards: Array<{ label: string; value: string; note: string; change: any; changeSuffix?: string; icon: any; tone: string }> = [
    { label: 'Doanh thu thuần', value: money(s.net_revenue), note: `${number(s.order_count)} đơn đã thanh toán`, change: c.net_revenue_change, icon: CircleDollarSign, tone: 'blue' },
    { label: 'Vé đã bán', value: `${number(s.tickets_sold)} vé`, note: `${number(s.showtime_count)} suất chiếu`, change: c.tickets_sold_change, icon: Ticket, tone: 'green' },
    { label: 'F&B & hàng hóa', value: money(s.concession_revenue), note: `${number(s.concession_items)} sản phẩm`, change: null, icon: ShoppingBasket, tone: 'orange' },
    { label: 'Tỷ lệ lấp đầy', value: `${Number(s.occupancy_rate || 0).toLocaleString('vi-VN')}%`, note: `${number(s.occupied_seats)}/${number(s.available_seats)} ghế`, change: c.occupancy_change, changeSuffix: ' điểm', icon: Percent, tone: 'purple' }
  ];
  if (active === 'inventory') cards = [
    {label:'Giá trị tồn kho',value:money(data.inventory_summary.stock_value),note:`${number(data.inventory_summary.sku_count)} SKU tại các rạp`,change:null,icon:Warehouse,tone:'blue'},
    {label:'SKU sắp hết',value:number(data.inventory_summary.low_stock),note:'Đã chạm mức đặt hàng lại',change:null,icon:Package,tone:'orange'},
    {label:'SKU hết hàng',value:number(data.inventory_summary.out_of_stock),note:'Cần xử lý bổ sung tồn',change:null,icon:Package,tone:'purple'},
    {label:'Biến động trong kỳ',value:number(data.inventory.reduce((sum,row)=>sum+Number(row.received_quantity||0)+Number(row.issued_quantity||0),0)),note:'Tổng lượt nhập và xuất',change:null,icon:RefreshCw,tone:'green'}
  ];
  if (active === 'transactions' || active === 'reconciliation') cards = [
    {label:'Giao dịch thành công',value:number(data.transactions.length),note:'Bản ghi thanh toán trong kỳ',change:null,icon:Receipt,tone:'green'},
    {label:'Giá trị thanh toán',value:money(data.transactions.reduce((sum,row)=>sum+Number(row.amount||0),0)),note:'Theo bảng payments',change:null,icon:CreditCard,tone:'blue'},
    {label:'Tiền hoàn',value:money(s.refund_amount),note:'Yêu cầu đã duyệt/hoàn tất',change:null,icon:RefreshCw,tone:'orange'},
    {label:'Đối soát',value:data.availability.reconciliation.available?'Sẵn sàng':'Chờ nguồn',note:'Cần dữ liệu quyết toán đối tác',change:null,icon:Database,tone:'purple'}
  ];
  if (active === 'promotions') cards = [
    {label:'Chương trình / voucher',value:number(data.promotions.length),note:'Cấu hình trong aurora_db',change:null,icon:Percent,tone:'blue'},
    {label:'Lượt sử dụng',value:number(data.promotions.reduce((sum,row)=>sum+Number(row.used_count||0),0)),note:'Voucher đã ghi nhận',change:null,icon:Ticket,tone:'green'},
    {label:'Giá trị ưu đãi',value:money(data.promotions.reduce((sum,row)=>sum+Number(row.discount_amount||0),0)),note:'Giảm giá trên đơn liên kết',change:null,icon:CircleDollarSign,tone:'orange'},
    {label:'Doanh thu liên quan',value:money(data.promotions.reduce((sum,row)=>sum+Number(row.related_revenue||0),0)),note:'Không đồng nhất với ROI',change:null,icon:TrendingUp,tone:'purple'}
  ];
  if (active === 'employees') cards = [
    {label:'Ca làm việc',value:number(data.employees.length),note:'Ca POS trong kỳ',change:null,icon:Users,tone:'blue'},
    {label:'Doanh số theo ca',value:money(data.employees.reduce((sum,row)=>sum+Number(row.net_revenue||0),0)),note:'Đơn gắn đúng pos_shift_id',change:null,icon:CircleDollarSign,tone:'green'},
    {label:'Vé đã bán',value:number(data.employees.reduce((sum,row)=>sum+Number(row.tickets_sold||0),0)),note:'Theo nhân viên và quầy',change:null,icon:Ticket,tone:'orange'},
    {label:'F&B / MER',value:money(data.employees.reduce((sum,row)=>sum+Number(row.concession_revenue||0),0)),note:'Doanh thu bán kèm',change:null,icon:ShoppingBasket,tone:'purple'}
  ];
  return <section className="reports-kpi-grid">{cards.map(card => { const Icon = card.icon; return <article key={card.label} className={card.tone}><span className="reports-kpi-icon"><Icon/></span><div><small>{card.label}</small><strong>{card.value}</strong><p>{card.note}</p></div>{card.change !== null && <ChangeBadge value={card.change} suffix={card.changeSuffix || '%'}/>}</article>; })}</section>;
}

function Overview({ data, daily }: { data: ReportsData; daily: Row[] }) {
  return <div className="reports-dashboard-grid">
    <section className="reports-panel reports-trend-panel"><PanelHeader title="Xu hướng doanh thu" subtitle="Doanh thu thuần theo ngày trong kỳ báo cáo" icon={TrendingUp}/><RevenueChart rows={daily}/></section>
    <section className="reports-panel"><PanelHeader title="Cơ cấu doanh thu" subtitle="Tỷ trọng vé và F&B / hàng hóa" icon={WalletCards}/><RevenueMix summary={data.summary}/></section>
    <section className="reports-panel"><PanelHeader title="Top phim theo doanh thu" subtitle="Hiệu suất lịch chiếu trong kỳ" icon={Film}/><RankList rows={data.movies.slice(0, 5)} labelKey="title" valueKey="ticket_revenue" secondaryKey="tickets_sold" secondarySuffix=" vé"/></section>
    <section className="reports-panel"><PanelHeader title="Khung giờ bán hàng" subtitle="Doanh thu ghi nhận theo giờ tạo đơn" icon={Receipt}/><HourlyBars rows={data.hourly}/></section>
    <section className="reports-panel reports-wide"><PanelHeader title="Hiệu suất theo rạp" subtitle="So sánh doanh thu và tỷ lệ lấp đầy" icon={Building2}/><TheaterCompact rows={data.theaters}/></section>
  </div>;
}

function RevenueReport({ data, daily }: { data: ReportsData; daily: Row[] }) {
  const s = data.summary;
  return <div className="reports-section-stack">
    <section className="reports-finance-strip">
      <article><small>Doanh thu gộp</small><b>{money(s.gross_revenue)}</b></article><i>−</i>
      <article className="deduction"><small>Giảm giá</small><b>{money(s.discount_amount)}</b></article><i>=</i>
      <article className="net"><small>Doanh thu sau giảm giá</small><b>{money(s.net_revenue)}</b></article><i>•</i>
      <article className="deduction"><small>Hoàn tiền đã duyệt</small><b>{money(s.refund_amount)}</b></article>
    </section>
    <section className="reports-panel"><PanelHeader title="Diễn biến doanh thu" subtitle="Tách doanh thu vé và F&B theo từng ngày" icon={TrendingUp}/><RevenueChart rows={daily} detailed/></section>
    <section className="reports-panel"><PanelHeader title="Chi tiết giao dịch" subtitle={`Hiển thị ${data.orders.length} giao dịch gần nhất trong kỳ`} icon={Receipt}/><OrdersTable rows={data.orders}/></section>
  </div>;
}

function MoviesReport({ rows }: { rows: Row[] }) {
  return <section className="reports-panel"><PanelHeader title="Báo cáo phim và bán vé" subtitle="Doanh thu vé, suất chiếu và hiệu quả sử dụng ghế" icon={Film}/>{rows.length ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>#</th><th>Phim</th><th>Suất chiếu</th><th>Vé bán</th><th>Doanh thu vé</th><th>Tỷ lệ lấp đầy</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td><span className={`reports-rank rank-${index + 1}`}>{index + 1}</span></td><td><div className="reports-movie-cell">{row.poster_url ? <img src={row.poster_url} alt=""/> : <span><Film/></span>}<div><b>{row.title}</b><small>{row.genre || 'Chưa phân loại'}</small></div></div></td><td>{number(row.showtime_count)}</td><td><b>{number(row.tickets_sold)}</b></td><td><strong>{money(row.ticket_revenue)}</strong></td><td><Progress value={Number(row.occupancy_rate)} label={`${Number(row.occupancy_rate).toLocaleString('vi-VN')}%`}/></td></tr>)}</tbody></table></div> : <EmptyReport icon={Film} text="Chưa có suất chiếu trong khoảng thời gian này."/>}</section>;
}

function ProductsReport({ rows }: { rows: Row[] }) {
  return <section className="reports-panel"><PanelHeader title="Báo cáo F&B và hàng hóa" subtitle="Sản lượng, doanh thu và mức đóng góp theo sản phẩm" icon={ShoppingBasket}/>{rows.length ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>#</th><th>Mã hàng</th><th>Sản phẩm</th><th>Nhóm</th><th>Số đơn</th><th>Số lượng</th><th>Giá bán TB</th><th>Doanh thu</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.item_type}-${row.item_code}`}><td><span className={`reports-rank rank-${index + 1}`}>{index + 1}</span></td><td><code>{row.item_code}</code></td><td><b>{row.item_name}</b></td><td><span className="reports-type-badge"><Package/>{row.item_type === 'COMBO' ? 'F&B / Combo' : 'Hàng hóa'}</span></td><td>{number(row.order_count)}</td><td><b>{number(row.quantity)}</b></td><td>{money(row.average_price)}</td><td><strong>{money(row.revenue)}</strong></td></tr>)}</tbody></table></div> : <EmptyReport icon={ShoppingBasket} text="Chưa phát sinh doanh thu F&B hoặc hàng hóa trong kỳ."/>}</section>;
}

function PaymentsReport({ data }: { data: ReportsData }) {
  return <div className="reports-two-columns">
    <section className="reports-panel"><PanelHeader title="Phương thức thanh toán" subtitle="Giá trị giao dịch đã thanh toán" icon={CreditCard}/><Distribution rows={data.payment_methods} label={row => paymentLabel(row.payment_method)}/></section>
    <section className="reports-panel"><PanelHeader title="Kênh bán hàng" subtitle="Cơ cấu doanh thu POS, Website và đối tác" icon={WalletCards}/><Distribution rows={data.channels} label={row => channelLabel(row.channel)}/></section>
  </div>;
}

function TheatersReport({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map(row => Number(row.net_revenue || 0)));
  return <section className="reports-panel"><PanelHeader title="So sánh hiệu suất rạp" subtitle="Doanh thu, vé bán, suất chiếu và tỷ lệ lấp đầy" icon={Building2}/>{rows.length ? <div className="reports-table-wrap"><table className="reports-table theater-table"><thead><tr><th>Rạp</th><th>Doanh thu</th><th>Tỷ trọng</th><th>Vé bán</th><th>Suất chiếu</th><th>Lấp đầy</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><div className="reports-theater-name"><span><Building2/></span><div><b>{row.name}</b><small>{row.city}</small></div></div></td><td><strong>{money(row.net_revenue)}</strong></td><td><Progress value={Number(row.net_revenue) * 100 / max} label={`${(Number(row.net_revenue) * 100 / max).toFixed(0)}%`}/></td><td>{number(row.tickets_sold)}</td><td>{number(row.showtime_count)}</td><td><Progress value={Number(row.occupancy_rate)} label={`${Number(row.occupancy_rate).toLocaleString('vi-VN')}%`}/></td></tr>)}</tbody></table></div> : <EmptyReport icon={Building2} text="Chưa có dữ liệu rạp trong phạm vi được chọn."/>}</section>;
}

function PanelHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon: any }) { return <header className="reports-panel-header"><span><Icon/></span><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div></header>; }

function RevenueChart({ rows, detailed = false }: { rows: Row[]; detailed?: boolean }) {
  const width = 920, height = 270, padX = 48, padTop = 22, padBottom = 42;
  const max = Math.max(1, ...rows.map(row => Number(row.net_revenue || 0)));
  const x = (index: number) => rows.length <= 1 ? width / 2 : padX + index * (width - padX * 2) / (rows.length - 1);
  const y = (value: number) => padTop + (height - padTop - padBottom) * (1 - value / max);
  const line = rows.map((row, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(Number(row.net_revenue || 0))}`).join(' ');
  const area = rows.length ? `${line} L ${x(rows.length - 1)} ${height - padBottom} L ${x(0)} ${height - padBottom} Z` : '';
  const labelStep = Math.max(1, Math.ceil(rows.length / 7));
  return <div className="reports-chart-shell">
    <div className="reports-chart-legend"><span><i className="revenue"/>Doanh thu thuần</span>{detailed && <><span><i className="ticket"/>Vé</span><span><i className="concession"/>F&B / hàng hóa</span></>}</div>
    <svg className="reports-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu theo ngày">
      <defs><linearGradient id="auroraRevenueGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2878f0" stopOpacity=".28"/><stop offset="1" stopColor="#2878f0" stopOpacity=".02"/></linearGradient></defs>
      {[0, .25, .5, .75, 1].map(step => <g key={step}><line x1={padX} x2={width - padX} y1={y(max * step)} y2={y(max * step)} className="grid"/><text x={padX - 8} y={y(max * step) + 4} textAnchor="end">{compactMoney(max * step)}</text></g>)}
      {area && <path d={area} fill="url(#auroraRevenueGradient)"/>}{line && <path d={line} className="revenue-line"/>}
      {detailed && rows.map((row, index) => <g key={`bar-${row.report_date}`}><rect x={x(index) - 3} y={y(Number(row.ticket_revenue || 0))} width="3" height={height - padBottom - y(Number(row.ticket_revenue || 0))} className="ticket-bar"/><rect x={x(index)} y={y(Number(row.concession_revenue || 0))} width="3" height={height - padBottom - y(Number(row.concession_revenue || 0))} className="concession-bar"/></g>)}
      {rows.map((row, index) => <g key={row.report_date}>{(index % labelStep === 0 || index === rows.length - 1) && <text x={x(index)} y={height - 16} textAnchor="middle">{formatVietnameseDate(row.report_date).slice(0, 5)}</text>}<circle cx={x(index)} cy={y(Number(row.net_revenue || 0))} r="4" className="revenue-point"><title>{formatVietnameseDate(row.report_date)}: {money(row.net_revenue)}</title></circle></g>)}
    </svg>
    {!rows.some(row => Number(row.net_revenue) > 0) && <div className="reports-chart-empty">Chưa phát sinh doanh thu trong kỳ đã chọn</div>}
  </div>;
}

function RevenueMix({ summary }: { summary: Row }) {
  const ticket = Number(summary.ticket_revenue || 0), concession = Number(summary.concession_revenue || 0), total = Math.max(1, ticket + concession);
  const ticketShare = ticket * 100 / total;
  return <div className="reports-mix"><div className="reports-donut" style={{ background: `conic-gradient(#2878f0 0 ${ticketShare}%, #f59e0b ${ticketShare}% 100%)` }}><span><b>{number(summary.order_count)}</b><small>đơn hàng</small></span></div><div className="reports-mix-list"><div><i className="blue"/><span><b>Doanh thu vé</b><small>{ticketShare.toFixed(1)}% tổng cơ cấu</small></span><strong>{money(ticket)}</strong></div><div><i className="orange"/><span><b>F&B & hàng hóa</b><small>{(100 - ticketShare).toFixed(1)}% tổng cơ cấu</small></span><strong>{money(concession)}</strong></div><div><i className="gray"/><span><b>Giá trị đơn trung bình</b><small>Trên mỗi giao dịch</small></span><strong>{money(summary.average_order)}</strong></div></div></div>;
}

function RankList({ rows, labelKey, valueKey, secondaryKey, secondarySuffix }: { rows: Row[]; labelKey: string; valueKey: string; secondaryKey: string; secondarySuffix: string }) {
  const max = Math.max(1, ...rows.map(row => Number(row[valueKey] || 0)));
  return rows.length ? <div className="reports-rank-list">{rows.map((row, index) => <div key={row.id || row[labelKey]}><span className={`reports-rank rank-${index + 1}`}>{index + 1}</span><section><header><b>{row[labelKey]}</b><strong>{money(row[valueKey])}</strong></header><div><i style={{ width: `${Number(row[valueKey]) * 100 / max}%` }}/></div><small>{number(row[secondaryKey])}{secondarySuffix}</small></section></div>)}</div> : <EmptyReport icon={Film} text="Chưa có dữ liệu xếp hạng."/>;
}

function HourlyBars({ rows }: { rows: Row[] }) {
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const lookup = new Map(rows.map(row => [Number(row.sale_hour), row]));
  const max = Math.max(1, ...rows.map(row => Number(row.revenue || 0)));
  return <div className="reports-hourly">{hours.map(hour => { const row = lookup.get(hour); const value = Number(row?.revenue || 0); return <div key={hour} title={`${hour}:00 · ${money(value)}`}><i style={{ height: `${Math.max(value ? 8 : 2, value * 100 / max)}%` }}/><span>{hour % 3 === 0 ? `${hour}h` : ''}</span></div>; })}</div>;
}

function TheaterCompact({ rows }: { rows: Row[] }) {
  return rows.length ? <div className="reports-theater-compact">{rows.slice(0, 5).map((row, index) => <article key={row.id}><span>{index + 1}</span><div><b>{row.name}</b><small>{number(row.tickets_sold)} vé · {number(row.showtime_count)} suất</small></div><strong>{money(row.net_revenue)}</strong><Progress value={Number(row.occupancy_rate)} label={`${Number(row.occupancy_rate).toLocaleString('vi-VN')}%`}/></article>)}</div> : <EmptyReport icon={Building2} text="Chưa có dữ liệu theo rạp."/>;
}

function Distribution({ rows, label }: { rows: Row[]; label: (row: Row) => string }) {
  const colors = ['#2878f0', '#0ea67a', '#f59e0b', '#8b5cf6', '#ef4444'];
  const total = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  let cursor = 0;
  const segments = rows.map((row, index) => { const start = cursor; cursor += total ? Number(row.revenue) * 100 / total : 0; return `${colors[index % colors.length]} ${start}% ${cursor}%`; });
  return rows.length ? <div className="reports-distribution"><div className="reports-donut large" style={{ background: `conic-gradient(${segments.join(',')})` }}><span><b>{money(total)}</b><small>Tổng doanh thu</small></span></div><div className="reports-distribution-list">{rows.map((row, index) => { const share = total ? Number(row.revenue) * 100 / total : 0; return <div key={label(row)}><i style={{ background: colors[index % colors.length] }}/><span><b>{label(row)}</b><small>{number(row.order_count)} giao dịch · {share.toFixed(1)}%</small></span><strong>{money(row.revenue)}</strong></div>; })}</div></div> : <EmptyReport icon={CreditCard} text="Chưa có giao dịch thanh toán trong kỳ."/>;
}

function OrdersTable({ rows }: { rows: Row[] }) {
  return rows.length ? <div className="reports-table-wrap"><table className="reports-table orders-table"><thead><tr><th>Mã đơn / thời gian</th><th>Rạp / phim</th><th>Nội dung bán</th><th>Kênh</th><th>Thanh toán</th><th>Tổng tiền</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><b>{row.order_code}</b><small>{formatDateTime(row.created_at)}</small></td><td><b>{row.theater_name}</b><small>{row.movie_title}</small></td><td><span className="reports-order-items" title={row.item_summary}>{row.item_summary}</span><small>{number(row.item_count)} sản phẩm</small></td><td><span className="reports-channel-badge">{channelLabel(row.channel)}</span></td><td>{paymentLabel(row.payment_method)}</td><td><strong>{money(row.total_amount)}</strong>{Number(row.discount_amount) > 0 && <small>Giảm {money(row.discount_amount)}</small>}</td></tr>)}</tbody></table></div> : <EmptyReport icon={Receipt} text="Chưa có giao dịch đã thanh toán trong kỳ."/>;
}

function Progress({ value, label }: { value: number; label: string }) { return <div className="reports-progress"><div><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div><b>{label}</b></div>; }
function EmptyReport({ icon: Icon, text }: { icon: any; text: string }) { return <div className="reports-empty"><Icon/><b>Chưa có dữ liệu</b><span>{text}</span></div>; }
function ReportsLoading() { return <div className="reports-loading"><RefreshCw className="spin"/><b>Đang tổng hợp báo cáo</b><span>Đọc dữ liệu giao dịch, lịch chiếu và bán hàng từ aurora_db…</span></div>; }
