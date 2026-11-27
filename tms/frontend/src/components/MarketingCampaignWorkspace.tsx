import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, Edit3, Eye,
  Film, Flag, Megaphone, MousePointerClick, PauseCircle, PlayCircle, Plus, RefreshCw,
  Search, Target, Trash2, TrendingUp, Users, X
} from 'lucide-react';
import { VietnameseDateInput, formatVietnameseDate } from './VietnameseDateInput';
import './MarketingCampaignWorkspace.css';

type ConfirmAction = (message: string, onConfirm: () => void | Promise<void>, actionLabel?: string, title?: string) => void;
type Movie = { id: number; title: string; movie_code?: string; poster_url?: string; status?: string };
type Campaign = {
  id: number; campaign_code: string; name: string; movie_id?: number | null; movie_title?: string;
  movie_poster?: string; objective: string; description?: string; channel: string; target_audience: string;
  budget: number; spent_budget: number; expected_reach: number; actual_reach: number; impressions: number;
  clicks: number; conversions: number; start_date: string; end_date: string; status: CampaignStatus;
  owner_name?: string; ctr?: number; conversion_rate?: number; created_at?: string;
};
type CampaignStatus = 'draft' | 'planned' | 'running' | 'paused' | 'completed';
type CampaignForm = Omit<Campaign, 'movie_title' | 'movie_poster' | 'owner_name' | 'ctr' | 'conversion_rate' | 'created_at'>;
type Summary = { total: number; running: number; planned: number; draft: number; paused: number; completed: number; budget: number; spent: number; reach: number };

const STATUS: Record<CampaignStatus, string> = {
  draft: 'Bản nháp', planned: 'Đã lên kế hoạch', running: 'Đang triển khai', paused: 'Tạm dừng', completed: 'Hoàn tất'
};
const CHANNELS = ['Facebook', 'TikTok', 'YouTube', 'Website', 'Email', 'Push notification', 'Rạp chiếu'];
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = (): CampaignForm => ({
  id: 0, campaign_code: '', name: '', movie_id: null, objective: '', description: '', channel: 'Facebook, Website',
  target_audience: 'Khách hàng Aurora Cinema', budget: 0, spent_budget: 0, expected_reach: 0, actual_reach: 0,
  impressions: 0, clicks: 0, conversions: 0, start_date: today(), end_date: today(), status: 'draft'
});
const number = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${number(value).toLocaleString('vi-VN')} đ`;
const compact = (value: unknown) => number(value).toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });
const date = (value: string) => formatVietnameseDate(value, '—');
const percent = (value: number, max: number) => max > 0 ? Math.min(100, Math.round(value * 100 / max)) : 0;

export default function MarketingCampaignWorkspace({ apiBase, notify, requestConfirm }: {
  apiBase: string; notify: (message: string) => void; requestConfirm: ConfirmAction;
}) {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, running: 0, planned: 0, draft: 0, paused: 0, completed: 0, budget: 0, spent: 0, reach: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | CampaignStatus>('all');
  const [viewing, setViewing] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState<CampaignForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'marketing-campaigns', q: query, status });
      const response = await fetch(`${apiBase}?${params}`, { credentials: 'include', cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Không thể tải chiến dịch Marketing.');
      setRows(json.data || []);
      setMovies(json.meta?.movies || []);
      setSummary(json.meta?.summary || {});
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể kết nối dữ liệu chiến dịch.');
    } finally { setLoading(false); }
  }, [apiBase, notify, query, status]);

  useEffect(() => { const timer = setTimeout(() => void load(), query ? 250 : 0); return () => clearTimeout(timer); }, [load, query]);

  const edit = (row?: Campaign) => setEditing(row ? {
    ...row, movie_id: row.movie_id ? number(row.movie_id) : null, budget: number(row.budget), spent_budget: number(row.spent_budget),
    expected_reach: number(row.expected_reach), actual_reach: number(row.actual_reach), impressions: number(row.impressions),
    clicks: number(row.clicks), conversions: number(row.conversions)
  } : emptyForm());

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (!editing.name.trim() || !editing.objective.trim() || !editing.channel.trim() || !editing.target_audience.trim()) {
      notify('Vui lòng nhập đầy đủ tên, mục tiêu, kênh và đối tượng chiến dịch.'); return;
    }
    if (editing.end_date < editing.start_date) { notify('Ngày kết thúc phải từ ngày bắt đầu trở đi.'); return; }
    if (number(editing.spent_budget) > number(editing.budget)) { notify('Chi phí thực tế không được vượt ngân sách.'); return; }
    if (number(editing.clicks) > number(editing.impressions)) { notify('Lượt nhấp không được lớn hơn lượt hiển thị.'); return; }
    if (number(editing.conversions) > number(editing.clicks)) { notify('Lượt chuyển đổi không được lớn hơn lượt nhấp.'); return; }
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}?action=marketing-campaigns${editing.id ? `&id=${editing.id}` : ''}`, {
        method: editing.id ? 'PUT' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing)
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Không thể lưu chiến dịch.');
      notify(json.message); setEditing(null); await load();
    } catch (error) { notify(error instanceof Error ? error.message : 'Không thể lưu chiến dịch.'); }
    finally { setSaving(false); }
  };

  const changeStatus = async (row: Campaign, next: CampaignStatus) => {
    try {
      const response = await fetch(`${apiBase}?action=marketing-campaigns&id=${row.id}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...row, status: next })
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Không thể cập nhật trạng thái.');
      notify(`Đã chuyển chiến dịch sang “${STATUS[next]}”.`); setViewing(null); await load();
    } catch (error) { notify(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái.'); }
  };

  const remove = (row: Campaign) => requestConfirm(
    `Bản nháp “${row.name}” sẽ bị xóa vĩnh viễn khỏi aurora_db.`,
    async () => {
      try {
        const response = await fetch(`${apiBase}?action=marketing-campaigns&id=${row.id}`, { method: 'DELETE', credentials: 'include' });
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.message || 'Không thể xóa chiến dịch.');
        notify(json.message); setViewing(null); await load();
      } catch (error) { notify(error instanceof Error ? error.message : 'Không thể xóa chiến dịch.'); }
    }, 'Xóa bản nháp', 'Xóa chiến dịch?'
  );

  const tabs = useMemo(() => ([
    ['all', 'Tất cả', summary.total], ['running', 'Đang chạy', summary.running], ['planned', 'Sắp triển khai', summary.planned],
    ['draft', 'Bản nháp', summary.draft], ['completed', 'Hoàn tất', summary.completed]
  ] as Array<[typeof status, string, number]>), [summary]);
  const budgetRate = percent(summary.spent, summary.budget);

  return <div className="campaign-workspace">
    <section className="campaign-kpis">
      <article><i className="blue"><Megaphone/></i><div><small>Tổng chiến dịch</small><b>{summary.total}</b><span>{summary.running} đang triển khai</span></div></article>
      <article><i className="amber"><CircleDollarSign/></i><div><small>Ngân sách kế hoạch</small><b>{money(summary.budget)}</b><span>Đã sử dụng {budgetRate}%</span></div></article>
      <article><i className="green"><Users/></i><div><small>Tiếp cận thực tế</small><b>{compact(summary.reach)}</b><span>Khách hàng đa kênh</span></div></article>
      <article><i className="violet"><CheckCircle2/></i><div><small>Đã hoàn tất</small><b>{summary.completed}</b><span>{summary.planned} đang chờ triển khai</span></div></article>
    </section>

    <section className="campaign-board">
      <header className="campaign-board-head">
        <div><h3>Danh sách chiến dịch</h3><p>Quản lý toàn bộ vòng đời và chỉ số truyền thông.</p></div>
        <button className="campaign-primary" onClick={() => edit()}><Plus/> Tạo chiến dịch</button>
      </header>
      <div className="campaign-filters">
        <label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, tên chiến dịch hoặc phim..."/></label>
        <nav>{tabs.map(([key, label, count]) => <button key={key} className={status === key ? 'active' : ''} onClick={() => setStatus(key)}>{label}<b>{count}</b></button>)}</nav>
        <button className="campaign-refresh" onClick={() => void load()} title="Làm mới"><RefreshCw/></button>
      </div>

      {loading ? <div className="campaign-state"><RefreshCw className="spin"/><b>Đang tải dữ liệu từ aurora_db...</b></div> : rows.length === 0 ?
        <div className="campaign-state"><Megaphone/><b>Chưa có chiến dịch phù hợp</b><span>Thay đổi bộ lọc hoặc tạo chiến dịch đầu tiên.</span><button onClick={() => edit()}><Plus/> Tạo chiến dịch</button></div> :
        <div className="campaign-table-wrap"><table className="campaign-table"><thead><tr><th>Chiến dịch & phim</th><th>Kênh / đối tượng</th><th>Thời gian</th><th>Ngân sách</th><th>Hiệu quả</th><th>Trạng thái</th><th/></tr></thead><tbody>
          {rows.map(row => {
            const spentRate = percent(number(row.spent_budget), number(row.budget));
            const reachRate = percent(number(row.actual_reach), number(row.expected_reach));
            return <tr key={row.id}>
              <td><div className="campaign-title-cell">{row.movie_poster ? <img src={row.movie_poster} alt=""/> : <i><Film/></i>}<div><code>{row.campaign_code}</code><b>{row.name}</b><span>{row.movie_title || 'Chiến dịch thương hiệu Aurora'}</span></div></div></td>
              <td><b>{row.channel}</b><span>{row.target_audience}</span></td>
              <td><b>{date(row.start_date)}</b><span>đến {date(row.end_date)}</span></td>
              <td><b>{money(row.budget)}</b><div className="campaign-progress"><i style={{width: `${spentRate}%`}}/></div><span>Đã chi {money(row.spent_budget)} · {spentRate}%</span></td>
              <td><b>{compact(row.actual_reach)} lượt tiếp cận</b><div className="campaign-progress green"><i style={{width: `${reachRate}%`}}/></div><span>CTR {number(row.ctr).toLocaleString('vi-VN')}% · {number(row.conversions).toLocaleString('vi-VN')} chuyển đổi</span></td>
              <td><span className={`campaign-status ${row.status}`}>{STATUS[row.status]}</span></td>
              <td><div className="campaign-actions"><button title="Xem hồ sơ" onClick={() => setViewing(row)}><Eye/></button><button title="Chỉnh sửa" onClick={() => edit(row)}><Edit3/></button>{row.status === 'draft' && <button className="danger" title="Xóa bản nháp" onClick={() => remove(row)}><Trash2/></button>}</div></td>
            </tr>;
          })}
        </tbody></table></div>}
    </section>

    {viewing && <CampaignDetail row={viewing} onClose={() => setViewing(null)} onEdit={() => { setViewing(null); edit(viewing); }} onStatus={changeStatus} onDelete={remove}/>}
    {editing && <CampaignEditor form={editing} movies={movies} saving={saving} onChange={setEditing} onClose={() => setEditing(null)} onSave={save}/>}
  </div>;
}

function CampaignDetail({ row, onClose, onEdit, onStatus, onDelete }: {
  row: Campaign; onClose: () => void; onEdit: () => void; onStatus: (row: Campaign, status: CampaignStatus) => void; onDelete: (row: Campaign) => void;
}) {
  const reachRate = percent(number(row.actual_reach), number(row.expected_reach));
  return <div className="campaign-modal-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}><section className="campaign-detail">
    <header><div><span>HỒ SƠ CHIẾN DỊCH</span><h3>{row.name}</h3><p><code>{row.campaign_code}</code><span className={`campaign-status ${row.status}`}>{STATUS[row.status]}</span></p></div><button onClick={onClose}><X/></button></header>
    <div className="campaign-detail-body">
      <div className="campaign-detail-main">
        <section className="campaign-movie"><i>{row.movie_poster ? <img src={row.movie_poster} alt=""/> : <Film/>}</i><div><small>PHIM ĐƯỢC QUẢNG BÁ</small><b>{row.movie_title || 'Chiến dịch thương hiệu Aurora Cinema'}</b><span>{row.channel}</span></div></section>
        <section><h4><Target/> Mục tiêu & thông điệp</h4><p><b>Mục tiêu:</b> {row.objective}</p><p>{row.description || 'Chưa có mô tả chi tiết.'}</p></section>
        <section><h4><BarChart3/> Hiệu quả chiến dịch</h4><div className="campaign-metrics"><p><b>{number(row.impressions).toLocaleString('vi-VN')}</b><span>Lượt hiển thị</span></p><p><b>{number(row.clicks).toLocaleString('vi-VN')}</b><span>Lượt nhấp · CTR {number(row.ctr)}%</span></p><p><b>{number(row.conversions).toLocaleString('vi-VN')}</b><span>Chuyển đổi · {number(row.conversion_rate)}%</span></p></div><div className="campaign-reach"><span><b>Tiếp cận mục tiêu</b><b>{reachRate}%</b></span><div><i style={{width: `${reachRate}%`}}/></div><small>{number(row.actual_reach).toLocaleString('vi-VN')} / {number(row.expected_reach).toLocaleString('vi-VN')} lượt tiếp cận</small></div></section>
      </div>
      <aside><h4>Thông tin triển khai</h4><dl><dt><CalendarDays/> Thời gian</dt><dd>{date(row.start_date)} – {date(row.end_date)}</dd><dt><Users/> Đối tượng</dt><dd>{row.target_audience}</dd><dt><CircleDollarSign/> Ngân sách</dt><dd>{money(row.budget)}<small>Đã chi {money(row.spent_budget)}</small></dd><dt><Flag/> Người phụ trách</dt><dd>{row.owner_name || 'Marketing Aurora'}</dd></dl></aside>
    </div>
    <footer><button onClick={onClose}>Đóng</button><div>{row.status === 'draft' && <button className="danger" onClick={() => onDelete(row)}><Trash2/> Xóa</button>}<button onClick={onEdit}><Edit3/> Chỉnh sửa</button>{(row.status === 'draft' || row.status === 'paused') && <button className="primary" onClick={() => onStatus(row, row.status === 'draft' ? 'planned' : 'running')}><PlayCircle/> {row.status === 'draft' ? 'Lên kế hoạch' : 'Tiếp tục'}</button>}{row.status === 'planned' && <button className="primary" onClick={() => onStatus(row, 'running')}><PlayCircle/> Bắt đầu</button>}{row.status === 'running' && <button onClick={() => onStatus(row, 'paused')}><PauseCircle/> Tạm dừng</button>}{(row.status === 'running' || row.status === 'paused') && <button className="primary" onClick={() => onStatus(row, 'completed')}><CheckCircle2/> Hoàn tất</button>}</div></footer>
  </section></div>;
}

function CampaignEditor({ form, movies, saving, onChange, onClose, onSave }: {
  form: CampaignForm; movies: Movie[]; saving: boolean; onChange: (form: CampaignForm) => void; onClose: () => void; onSave: (event: FormEvent) => void;
}) {
  const selectedChannels = form.channel.split(',').map(value => value.trim()).filter(Boolean);
  const set = (key: keyof CampaignForm, value: string | number | null) => onChange({ ...form, [key]: value });
  const toggleChannel = (channel: string) => {
    const next = selectedChannels.includes(channel) ? selectedChannels.filter(value => value !== channel) : [...selectedChannels, channel];
    set('channel', next.join(', '));
  };
  return <div className="campaign-modal-backdrop" onMouseDown={event => event.currentTarget === event.target && !saving && onClose()}><form className="campaign-editor" onSubmit={onSave}>
    <header><div><span>{form.id ? 'CẬP NHẬT CHIẾN DỊCH' : 'CHIẾN DỊCH MỚI'}</span><h3>{form.id ? form.name : 'Tạo chiến dịch quảng bá phim'}</h3><p>Dữ liệu được lưu trực tiếp và kiểm tra hợp lệ trong aurora_db.</p></div><button type="button" onClick={onClose} disabled={saving}><X/></button></header>
    <div className="campaign-editor-body">
      <section><h4>1. Thông tin chiến dịch</h4><div className="campaign-form-grid">
        <label><span>Mã chiến dịch <small>(tự tạo nếu để trống)</small></span><input value={form.campaign_code} onChange={e => set('campaign_code', e.target.value.toUpperCase())} placeholder="MKT-PHIM-2026"/></label>
        <label><span>Phim quảng bá</span><select value={form.movie_id || ''} onChange={e => set('movie_id', e.target.value ? Number(e.target.value) : null)}><option value="">Chiến dịch thương hiệu</option>{movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
        <label className="wide"><span>Tên chiến dịch *</span><input required maxLength={180} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ví dụ: Bom tấn cuối năm cùng Aurora"/></label>
        <label className="wide"><span>Mục tiêu *</span><textarea required value={form.objective} onChange={e => set('objective', e.target.value)} placeholder="Mục tiêu đo lường được của chiến dịch..."/></label>
        <label className="wide"><span>Mô tả / thông điệp chính</span><textarea value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Thông điệp, định hướng nội dung và ghi chú triển khai..."/></label>
      </div></section>
      <section><h4>2. Kênh & đối tượng</h4><label className="campaign-channel-label"><span>Kênh triển khai *</span><div className="campaign-channel-options">{CHANNELS.map(channel => <button type="button" key={channel} className={selectedChannels.includes(channel) ? 'active' : ''} onClick={() => toggleChannel(channel)}>{selectedChannels.includes(channel) && <CheckCircle2/>}{channel}</button>)}</div></label><label><span>Đối tượng mục tiêu *</span><input required value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder="Khách hàng 18–35 tuổi, yêu thích phim hành động..."/></label></section>
      <section><h4>3. Thời gian & ngân sách</h4><div className="campaign-form-grid"><label><span>Ngày bắt đầu *</span><VietnameseDateInput value={form.start_date} onChange={value => set('start_date', value)} ariaLabel="Ngày bắt đầu"/></label><label><span>Ngày kết thúc *</span><VietnameseDateInput value={form.end_date} onChange={value => set('end_date', value)} ariaLabel="Ngày kết thúc"/></label><label><span>Ngân sách (VNĐ)</span><input type="number" min="0" value={form.budget} onChange={e => set('budget', Number(e.target.value))}/></label><label><span>Chi phí thực tế (VNĐ)</span><input type="number" min="0" value={form.spent_budget} onChange={e => set('spent_budget', Number(e.target.value))}/></label><label><span>Tiếp cận mục tiêu</span><input type="number" min="0" value={form.expected_reach} onChange={e => set('expected_reach', Number(e.target.value))}/></label><label><span>Tiếp cận thực tế</span><input type="number" min="0" value={form.actual_reach} onChange={e => set('actual_reach', Number(e.target.value))}/></label></div></section>
      <section><h4>4. Chỉ số hiệu quả</h4><div className="campaign-form-grid three"><label><span>Lượt hiển thị</span><input type="number" min="0" value={form.impressions} onChange={e => set('impressions', Number(e.target.value))}/></label><label><span>Lượt nhấp</span><input type="number" min="0" value={form.clicks} onChange={e => set('clicks', Number(e.target.value))}/></label><label><span>Lượt chuyển đổi</span><input type="number" min="0" value={form.conversions} onChange={e => set('conversions', Number(e.target.value))}/></label><label className="wide"><span>Trạng thái</span><select value={form.status} onChange={e => set('status', e.target.value as CampaignStatus)}>{Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></section>
    </div>
    <footer><button type="button" onClick={onClose} disabled={saving}>Hủy</button><button className="primary" disabled={saving}>{saving ? <RefreshCw className="spin"/> : <CheckCircle2/>}{saving ? 'Đang lưu...' : 'Lưu chiến dịch'}</button></footer>
  </form></div>;
}
