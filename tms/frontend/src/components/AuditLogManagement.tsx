import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, Download, Eye, FileClock, FilterX, Fingerprint, RefreshCw, Search,
  ShieldCheck, UserRound, Users, X, XCircle
} from 'lucide-react';
import './AuditLogManagement.css';

type AuditRow = {
  id:number; user_id:number|null; username:string; actor_name:string; role:string; action:string;
  module:string; entity_type:string; entity_id:string; details:string; severity:'info'|'success'|'warning'|'error';
  status_code:number|null; http_method:string; request_path:string; ip_address:string; user_agent:string;
  event_hash:string; created_at:string; metadata:Record<string,unknown>|null; verified:boolean;
};
type Option = { value?:string; action?:string; total:number|string };
type ResponseShape = {
  success:boolean; message?:string; data:AuditRow[];
  summary:{total:number;today:number;last_24h:number;failed:number;unique_users:number};
  meta:{page:number;per_page:number;total:number;total_pages:number};
  filters:{actions:Option[];roles:Option[];modules:Option[]};
};
type Props = { apiBase:string; notify:(message:string)=>void };

const EMPTY_SUMMARY = { total:0, today:0, last_24h:0, failed:0, unique_users:0 };
const ROLE_LABELS:Record<string,string> = { super_admin:'Admin Tổng',cinema_admin:'Admin Rạp',supervisor:'Giám sát',accounting:'Kế toán',marketing_manager:'Marketing',system:'Hệ thống',guest:'Khách' };
const MODULE_LABELS:Record<string,string> = { security:'Bảo mật & tài khoản',schedules:'Lịch chiếu',movies:'Phim & phân bổ',finance:'Tài chính',operations:'Vận hành & POS',system:'Hệ thống' };

function formatDateTime(value:string) {
  if (!value) return '—';
  const parsed = new Date(value.replace(' ', 'T') + '+07:00');
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(parsed);
}

function actionLabel(value:string) {
  return value.toLowerCase().split('_').map(word => word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
}

function severityOf(row:AuditRow) {
  if (row.severity && row.severity !== 'info') return row.severity;
  if ((row.status_code || 0) >= 400 || row.action.includes('FAILED') || row.action.includes('DELETE')) return row.action.includes('DELETE') ? 'warning' : 'error';
  if (row.action.includes('SUCCESS') || row.action.includes('CREATE') || row.action.includes('APPROVE')) return 'success';
  return 'info';
}

function escapeCsv(value:unknown) {
  return `"${String(value ?? '').replace(/"/g,'""')}"`;
}

export default function AuditLogManagement({apiBase,notify}:Props) {
  const [rows,setRows] = useState<AuditRow[]>([]);
  const [summary,setSummary] = useState(EMPTY_SUMMARY);
  const [meta,setMeta] = useState({page:1,per_page:20,total:0,total_pages:1});
  const [options,setOptions] = useState<ResponseShape['filters']>({actions:[],roles:[],modules:[]});
  const [query,setQuery] = useState('');
  const [action,setAction] = useState('');
  const [role,setRole] = useState('');
  const [module,setModule] = useState('');
  const [severity,setSeverity] = useState('');
  const [dateFrom,setDateFrom] = useState('');
  const [dateTo,setDateTo] = useState('');
  const [page,setPage] = useState(1);
  const [loading,setLoading] = useState(true);
  const [exporting,setExporting] = useState(false);
  const [error,setError] = useState('');
  const [selected,setSelected] = useState<AuditRow|null>(null);
  const [refreshKey,setRefreshKey] = useState(0);

  const makeParams = (targetPage:number, perPage=20) => {
    const params = new URLSearchParams({action:'audit-log-workspace',page:String(targetPage),per_page:String(perPage)});
    if (query.trim()) params.set('q',query.trim());
    if (action) params.set('event_action',action);
    if (role) params.set('role',role);
    if (module) params.set('module',module);
    if (severity) params.set('severity',severity);
    if (dateFrom) params.set('date_from',dateFrom);
    if (dateTo) params.set('date_to',dateTo);
    return params;
  };

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`${apiBase}?${makeParams(page)}`,{credentials:'include',cache:'no-store',signal:controller.signal});
        const result:ResponseShape = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải nhật ký hệ thống.');
        setRows(result.data || []); setSummary(result.summary || EMPTY_SUMMARY); setMeta(result.meta); setOptions(result.filters || {actions:[],roles:[],modules:[]});
      } catch (caught) {
        if ((caught as Error).name !== 'AbortError') setError((caught as Error).message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 350 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  },[apiBase,page,query,action,role,module,severity,dateFrom,dateTo,refreshKey]);

  const hasFilters = Boolean(query || action || role || module || severity || dateFrom || dateTo);
  const visibleRange = useMemo(() => ({from:meta.total ? (meta.page-1)*meta.per_page+1 : 0,to:Math.min(meta.page*meta.per_page,meta.total)}),[meta]);
  const setFilter = (setter:(value:string)=>void,value:string) => { setter(value); setPage(1); };
  const resetFilters = () => { setQuery('');setAction('');setRole('');setModule('');setSeverity('');setDateFrom('');setDateTo('');setPage(1); };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const collected:AuditRow[] = [];
      let current = 1; let pages = 1;
      do {
        const response = await fetch(`${apiBase}?${makeParams(current,250)}`,{credentials:'include',cache:'no-store'});
        const result:ResponseShape = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể xuất dữ liệu.');
        collected.push(...(result.data || [])); pages = result.meta.total_pages; current++;
      } while (current <= pages);
      const header = ['Mã','Thời gian','Người dùng','Họ tên','Vai trò','Hành động','Module','Đối tượng','Chi tiết','Mức độ','HTTP','IP'];
      const lines = [header.map(escapeCsv).join(','),...collected.map(row => [row.id,row.created_at,row.username,row.actor_name,ROLE_LABELS[row.role]||row.role,row.action,MODULE_LABELS[row.module]||row.module,[row.entity_type,row.entity_id].filter(Boolean).join(' #'),row.details,row.severity,row.status_code,row.ip_address].map(escapeCsv).join(','))];
      const blob = new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href=url; link.download=`aurora-audit-log-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
      notify(`Đã xuất ${collected.length} bản ghi Audit Log.`);
    } catch (caught) { setError((caught as Error).message); }
    finally { setExporting(false); }
  };

  return <section className="audit-workspace">
    <div className="audit-hero">
      <div className="audit-hero-copy">
        <span className="audit-eyebrow"><ShieldCheck size={15}/> TRUNG TÂM KIỂM SOÁT HỆ THỐNG</span>
        <h2>Audit Log</h2>
        <p>Theo dõi dấu vết hoạt động, sự kiện bảo mật và thay đổi dữ liệu trên toàn bộ Aurora Cinema.</p>
      </div>
      <div className="audit-hero-actions">
        <button className="audit-btn secondary" onClick={()=>setRefreshKey(key=>key+1)} disabled={loading}><RefreshCw size={16} className={loading?'spin':''}/> Làm mới</button>
        <button className="audit-btn primary" onClick={exportCsv} disabled={exporting || !meta.total}><Download size={16}/> {exporting?'Đang xuất...':'Xuất CSV'}</button>
      </div>
    </div>

    <div className="audit-kpis">
      <article><span className="audit-kpi-icon blue"><FileClock/></span><div><small>Tổng bản ghi</small><strong>{summary.total.toLocaleString('vi-VN')}</strong><em>Toàn bộ lịch sử</em></div></article>
      <article><span className="audit-kpi-icon green"><Activity/></span><div><small>Hôm nay</small><strong>{summary.today.toLocaleString('vi-VN')}</strong><em>{summary.last_24h.toLocaleString('vi-VN')} trong 24 giờ</em></div></article>
      <article><span className="audit-kpi-icon violet"><Users/></span><div><small>Người dùng phát sinh</small><strong>{summary.unique_users.toLocaleString('vi-VN')}</strong><em>Tài khoản duy nhất</em></div></article>
      <article><span className="audit-kpi-icon red"><AlertTriangle/></span><div><small>Sự kiện cần chú ý</small><strong>{summary.failed.toLocaleString('vi-VN')}</strong><em>Lỗi hoặc bị từ chối</em></div></article>
    </div>

    <div className="audit-panel">
      <div className="audit-filter-primary">
        <label className="audit-search"><Search size={18}/><input value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="Tìm người dùng, hành động, đối tượng, IP..."/><kbd>⌘ K</kbd></label>
        <div className="audit-date"><CalendarDays size={17}/><input type="date" value={dateFrom} max={dateTo||undefined} onChange={event=>setFilter(setDateFrom,event.target.value)}/><span>đến</span><input type="date" value={dateTo} min={dateFrom||undefined} onChange={event=>setFilter(setDateTo,event.target.value)}/></div>
      </div>
      <div className="audit-filter-secondary">
        <select value={action} onChange={event=>setFilter(setAction,event.target.value)}><option value="">Tất cả hành động</option>{options.actions.map(item=><option key={item.action} value={item.action}>{actionLabel(item.action||'')} ({item.total})</option>)}</select>
        <select value={role} onChange={event=>setFilter(setRole,event.target.value)}><option value="">Tất cả vai trò</option>{options.roles.map(item=><option key={item.value} value={item.value}>{ROLE_LABELS[item.value||'']||item.value} ({item.total})</option>)}</select>
        <select value={module} onChange={event=>setFilter(setModule,event.target.value)}><option value="">Tất cả phân hệ</option>{options.modules.map(item=><option key={item.value} value={item.value}>{MODULE_LABELS[item.value||'']||item.value} ({item.total})</option>)}</select>
        <select value={severity} onChange={event=>setFilter(setSeverity,event.target.value)}><option value="">Tất cả mức độ</option><option value="success">Thành công</option><option value="info">Thông tin</option><option value="warning">Cảnh báo</option><option value="error">Lỗi</option></select>
        {hasFilters&&<button className="audit-clear" onClick={resetFilters}><FilterX size={15}/> Xóa bộ lọc</button>}
      </div>

      {error&&<div className="audit-error"><XCircle size={18}/><span>{error}</span><button onClick={()=>setRefreshKey(key=>key+1)}>Thử lại</button></div>}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Phân hệ / Đối tượng</th><th>Địa chỉ IP</th><th>Mức độ</th><th aria-label="Chi tiết"/></tr></thead>
          <tbody>
            {loading&&Array.from({length:6}).map((_,index)=><tr className="audit-skeleton" key={index}><td colSpan={7}><span/></td></tr>)}
            {!loading&&!rows.length&&<tr><td colSpan={7}><div className="audit-empty"><FileClock size={34}/><strong>Chưa có bản ghi phù hợp</strong><span>Hãy thay đổi điều kiện lọc hoặc chọn khoảng thời gian khác.</span>{hasFilters&&<button onClick={resetFilters}>Xóa bộ lọc</button>}</div></td></tr>}
            {!loading&&rows.map(row=>{const tone=severityOf(row);return <tr key={row.id}>
              <td><div className="audit-time"><strong>{formatDateTime(row.created_at).split(' ')[1]||''}</strong><span>{formatDateTime(row.created_at).split(' ')[0]}</span></div></td>
              <td><div className="audit-actor"><span className={`audit-avatar ${row.role}`}><UserRound size={16}/></span><div><strong>{row.actor_name||row.username}</strong><small>@{row.username} · {ROLE_LABELS[row.role]||row.role}</small></div></div></td>
              <td><span className={`audit-action ${tone}`}>{actionLabel(row.action)}</span><small className="audit-code">{row.action}</small></td>
              <td><div className="audit-target"><strong>{MODULE_LABELS[row.module]||row.module||'Hệ thống'}</strong><span>{[row.entity_type,row.entity_id].filter(Boolean).join(' #')||row.details||'TMS System'}</span></div></td>
              <td><code className="audit-ip">{row.ip_address||'—'}</code></td>
              <td><span className={`audit-severity ${tone}`}>{tone==='success'?<CheckCircle2/>:tone==='error'?<XCircle/>:tone==='warning'?<AlertTriangle/>:<Activity/>}{tone==='success'?'Thành công':tone==='error'?'Lỗi':tone==='warning'?'Cảnh báo':'Thông tin'}</span></td>
              <td><button className="audit-view" onClick={()=>setSelected(row)} aria-label={`Xem chi tiết nhật ký ${row.id}`}><Eye size={17}/></button></td>
            </tr>})}
          </tbody>
        </table>
      </div>
      <footer className="audit-pagination"><span>Hiển thị <strong>{visibleRange.from}–{visibleRange.to}</strong> trong <strong>{meta.total.toLocaleString('vi-VN')}</strong> bản ghi</span><div><button disabled={page<=1||loading} onClick={()=>setPage(value=>Math.max(1,value-1))}><ChevronLeft size={17}/></button><span>Trang <strong>{meta.page}</strong> / {meta.total_pages}</span><button disabled={page>=meta.total_pages||loading} onClick={()=>setPage(value=>value+1)}><ChevronRight size={17}/></button></div></footer>
    </div>

    {selected&&<div className="audit-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}>
      <aside className="audit-detail" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
        <header><div><span><Fingerprint size={18}/></span><div><small>BẢN GHI #{selected.id}</small><h3 id="audit-detail-title">Chi tiết sự kiện</h3></div></div><button onClick={()=>setSelected(null)} aria-label="Đóng"><X/></button></header>
        <div className="audit-detail-status"><span className={`audit-severity ${severityOf(selected)}`}>{severityOf(selected)==='success'?<CheckCircle2/>:severityOf(selected)==='error'?<XCircle/>:severityOf(selected)==='warning'?<AlertTriangle/>:<Activity/>}{actionLabel(selected.action)}</span>{selected.verified&&<span className="audit-verified"><ShieldCheck size={15}/> Đã gắn mã kiểm chứng</span>}</div>
        <dl>
          <div><dt>Thời gian</dt><dd><Clock3 size={15}/>{formatDateTime(selected.created_at)}</dd></div>
          <div><dt>Người thực hiện</dt><dd>{selected.actor_name} <small>@{selected.username}</small></dd></div>
          <div><dt>Vai trò</dt><dd>{ROLE_LABELS[selected.role]||selected.role}</dd></div>
          <div><dt>Phân hệ</dt><dd>{MODULE_LABELS[selected.module]||selected.module}</dd></div>
          <div><dt>Đối tượng</dt><dd>{[selected.entity_type,selected.entity_id].filter(Boolean).join(' #')||'TMS System'}</dd></div>
          <div><dt>HTTP / trạng thái</dt><dd>{selected.http_method||'—'} · {selected.status_code||'—'}</dd></div>
          <div><dt>Địa chỉ IP</dt><dd><code>{selected.ip_address||'—'}</code></dd></div>
        </dl>
        <section><h4>Nội dung thay đổi</h4><p>{selected.details||'Không có mô tả bổ sung.'}</p></section>
        {selected.metadata&&<section><h4>Dữ liệu ngữ cảnh</h4><pre>{JSON.stringify(selected.metadata,null,2)}</pre></section>}
        {selected.request_path&&<section><h4>Yêu cầu hệ thống</h4><code className="audit-path">{selected.request_path}</code></section>}
        <footer><button onClick={()=>setSelected(null)}>Đóng chi tiết</button></footer>
      </aside>
    </div>}
  </section>;
}
