import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronRight, Clapperboard, Edit3, Eye, Film, Flame, MapPin, RefreshCw, Search, SlidersHorizontal, Sparkles, Star, X } from 'lucide-react';
import './MovieManagementWorkspace.css';

type MovieStatus='draft'|'coming_soon'|'now_showing'|'special_showing'|'ended';
type Priority='normal'|'high'|'critical';
type ManagedMovie={
  id:number;movie_code:string;title:string;original_title:string;genre:string;duration_minutes:number;age_rating:string;format:string;
  release_date:string;expected_end_date:string;poster_url:string;trailer_url:string;status:MovieStatus;is_hot:number;
  management_priority:Priority;management_note:string;lifecycle_updated_by?:string;lifecycle_updated_at?:string;updated_at?:string;
  allocated_theaters:number;active_allocations:number;active_showtimes:number;total_showtimes:number;next_showtime_at?:string;sold_tickets:number;
  attention_level:'ready'|'warning'|'critical';attention_message:string;
};
type Summary={total:number;now_showing:number;coming_soon:number;special_showing:number;hot:number;attention:number;active_showtimes:number;active_theaters:number};
type Props={apiBase:string;notify:(message:string)=>void;onOpenCatalog:()=>void};

const STATUS_META:Record<MovieStatus,{label:string;className:string}>={
  draft:{label:'Bản nháp',className:'draft'},coming_soon:{label:'Sắp chiếu',className:'coming'},now_showing:{label:'Đang chiếu',className:'showing'},special_showing:{label:'Chiếu đặc biệt',className:'special'},ended:{label:'Đã kết thúc',className:'ended'}
};
const PRIORITY_META:Record<Priority,{label:string;description:string}>={
  normal:{label:'Theo dõi thông thường',description:'Không yêu cầu xử lý ưu tiên.'},high:{label:'Ưu tiên cao',description:'Cần theo dõi sát kế hoạch phát hành.'},critical:{label:'Khẩn cấp',description:'Cần Admin Tổng xử lý ngay.'}
};
const emptySummary:Summary={total:0,now_showing:0,coming_soon:0,special_showing:0,hot:0,attention:0,active_showtimes:0,active_theaters:0};
const displayDate=(value?:string)=>{if(!value)return '—';const part=String(value).slice(0,10).split('-');return part.length===3?`${part[2]}/${part[1]}/${part[0]}`:value};
const displayDateTime=(value?:string)=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(String(value).replace(' ','T'))):'Chưa cập nhật';

export default function MovieManagementWorkspace({apiBase,notify,onOpenCatalog}:Props){
  const [rows,setRows]=useState<ManagedMovie[]>([]),[summary,setSummary]=useState<Summary>(emptySummary),[loading,setLoading]=useState(true);
  const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[priority,setPriority]=useState('all'),[attentionOnly,setAttentionOnly]=useState(false);
  const [editing,setEditing]=useState<ManagedMovie|null>(null),[form,setForm]=useState<any>({}),[saving,setSaving]=useState(false);
  const load=useCallback(async()=>{setLoading(true);try{const params=new URLSearchParams({action:'movie-management'});if(query.trim())params.set('q',query.trim());if(status!=='all')params.set('status',status);if(priority!=='all')params.set('priority',priority);if(attentionOnly)params.set('attention','1');const response=await fetch(`${apiBase}?${params}`,{credentials:'include',cache:'no-store'});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Không thể tải trung tâm điều hành phim.');setRows(result.data||[]);setSummary(result.meta?.summary||emptySummary)}catch(error){notify(error instanceof Error?error.message:'Không thể đọc dữ liệu điều hành từ aurora_db.')}finally{setLoading(false)}},[apiBase,query,status,priority,attentionOnly,notify]);
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),query?250:0);return()=>window.clearTimeout(timer)},[load,query]);
  const openEditor=(movie:ManagedMovie)=>{setEditing(movie);setForm({id:movie.id,status:movie.status==='draft'?'coming_soon':movie.status,management_priority:movie.management_priority||'normal',is_hot:Number(movie.is_hot)===1,release_date:String(movie.release_date||'').slice(0,10),expected_end_date:String(movie.expected_end_date||'').slice(0,10),management_note:movie.management_note||''})};
  const save=async(event:FormEvent)=>{event.preventDefault();if(!editing)return;setSaving(true);try{const response=await fetch(`${apiBase}?action=movie-management&id=${editing.id}`,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Không thể cập nhật phim.');notify(result.message);setEditing(null);await load()}catch(error){notify(error instanceof Error?error.message:'Không thể ghi dữ liệu vào aurora_db.')}finally{setSaving(false)}};
  return <div className="movie-ops-page">
    <section className="movie-ops-hero">
      <div><span>ĐIỀU HÀNH PHÁT HÀNH TOÀN HỆ THỐNG</span><h2>Trung tâm quản lý vòng đời phim</h2><p>Theo dõi trạng thái phát hành, độ phủ rạp, suất chiếu và các cảnh báo vận hành từ dữ liệu thực tế.</p></div>
      <aside><button onClick={()=>void load()}><RefreshCw className={loading?'spin':''}/>Làm mới</button><button className="catalog" onClick={onOpenCatalog}><Film/>Mở danh sách phim<ChevronRight/></button></aside>
    </section>
    <section className="movie-ops-kpis">
      <article><span className="total"><Film/></span><div><small>Tổng phim quản lý</small><b>{summary.total}</b><em>Trong kho aurora_db</em></div></article>
      <article><span className="showing"><Clapperboard/></span><div><small>Đang khai thác</small><b>{summary.now_showing}</b><em>{summary.active_showtimes} suất đang hoạt động</em></div></article>
      <article><span className="coming"><CalendarDays/></span><div><small>Sắp phát hành</small><b>{summary.coming_soon}</b><em>Cần chuẩn bị kế hoạch</em></div></article>
      <article><span className="hot"><Flame/></span><div><small>Phim nổi bật</small><b>{summary.hot}</b><em>Đang ưu tiên truyền thông</em></div></article>
      <article className={summary.attention?'needs-attention':''}><span className="warning"><AlertTriangle/></span><div><small>Cần xử lý</small><b>{summary.attention}</b><em>Cảnh báo dữ liệu/vận hành</em></div></article>
    </section>
    <section className="movie-ops-toolbar">
      <label><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Tìm theo tên hoặc mã phim…"/></label>
      <select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">Tất cả vòng đời</option><option value="draft">Bản nháp</option><option value="coming_soon">Sắp chiếu</option><option value="now_showing">Đang chiếu</option><option value="special_showing">Chiếu đặc biệt</option><option value="ended">Đã kết thúc</option></select>
      <select value={priority} onChange={event=>setPriority(event.target.value)}><option value="all">Tất cả ưu tiên</option><option value="critical">Khẩn cấp</option><option value="high">Ưu tiên cao</option><option value="normal">Thông thường</option></select>
      <button className={attentionOnly?'active':''} onClick={()=>setAttentionOnly(value=>!value)}><AlertTriangle/>Chỉ xem cảnh báo {summary.attention>0&&<b>{summary.attention}</b>}</button>
    </section>
    <section className="movie-ops-panel">
      <header><div><span>DANH SÁCH ĐIỀU HÀNH</span><h3>Tình trạng phát hành phim</h3></div><p><SlidersHorizontal/>{rows.length} phim theo bộ lọc</p></header>
      {loading?<div className="movie-ops-loading"><RefreshCw className="spin"/>Đang tổng hợp dữ liệu từ aurora_db…</div>:rows.length?<div className="movie-ops-table-wrap"><table><thead><tr><th>Phim</th><th>Vòng đời</th><th>Thời gian phát hành</th><th>Độ phủ & lịch chiếu</th><th>Ưu tiên</th><th>Tình trạng</th><th/></tr></thead><tbody>{rows.map(movie=>{const statusMeta=STATUS_META[movie.status]||STATUS_META.draft;return <tr key={movie.id} className={movie.attention_level!=='ready'?'attention-row':''}>
        <td><div className="movie-ops-title"><span>{movie.poster_url?<img src={movie.poster_url} alt=""/>:<Film/>}</span><div><code>{movie.movie_code||`#${movie.id}`}</code><b>{movie.title}</b><small>{movie.genre||movie.original_title} · {movie.duration_minutes} phút · {movie.age_rating}</small></div></div></td>
        <td><span className={`movie-life-badge ${statusMeta.className}`}>{statusMeta.label}</span>{Number(movie.is_hot)===1&&<small className="movie-hot-mark"><Flame/>Nổi bật</small>}</td>
        <td><b>{displayDate(movie.release_date)}</b><small>đến {displayDate(movie.expected_end_date)}</small>{movie.next_showtime_at&&<em>Suất kế: {displayDateTime(movie.next_showtime_at)}</em>}</td>
        <td><div className="movie-coverage"><span><MapPin/><b>{movie.allocated_theaters}</b> rạp</span><span><Clapperboard/><b>{movie.active_showtimes}</b> suất hoạt động</span><small>{movie.sold_tickets.toLocaleString('vi-VN')} vé đã ghi nhận</small></div></td>
        <td><span className={`movie-priority ${movie.management_priority||'normal'}`}>{movie.management_priority==='critical'?<AlertTriangle/>:movie.management_priority==='high'?<Star/>:<Eye/>}{PRIORITY_META[movie.management_priority||'normal'].label}</span></td>
        <td>{movie.attention_level==='ready'?<span className="movie-ready"><CheckCircle2/>Sẵn sàng</span>:<span className={`movie-attention ${movie.attention_level}`}><AlertTriangle/>{movie.attention_message}</span>}</td>
        <td><button className="movie-manage-button" onClick={()=>openEditor(movie)}><Edit3/>Điều hành</button></td>
      </tr>})}</tbody></table></div>:<div className="movie-ops-empty"><CheckCircle2/><b>Không có phim phù hợp</b><span>Thử thay đổi từ khóa hoặc bộ lọc điều hành.</span></div>}
    </section>
    {editing&&<div className="movie-ops-modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target&&!saving)setEditing(null)}}><form className="movie-ops-modal" onSubmit={save}>
      <header><div><span>ĐIỀU HÀNH VÒNG ĐỜI</span><h3>{editing.title}</h3><p>{editing.movie_code} · Dữ liệu cập nhật trực tiếp vào aurora_db</p></div><button type="button" disabled={saving} onClick={()=>setEditing(null)}><X/></button></header>
      <div className="movie-ops-modal-body"><div className="movie-ops-editor-movie"><span>{editing.poster_url?<img src={editing.poster_url} alt=""/>:<Film/>}</span><div><b>{editing.title}</b><small>{editing.original_title||editing.genre}</small><em>Cập nhật gần nhất: {displayDateTime(editing.lifecycle_updated_at||editing.updated_at)}</em></div></div>
        <label><span>Trạng thái vòng đời <em>*</em></span><select value={form.status} onChange={event=>setForm({...form,status:event.target.value})}><option value="coming_soon">Sắp chiếu</option><option value="now_showing">Đang chiếu</option><option value="special_showing">Chiếu đặc biệt</option><option value="ended">Đã kết thúc</option></select></label>
        <fieldset><legend>Mức ưu tiên điều hành</legend>{(['normal','high','critical'] as Priority[]).map(value=><button type="button" key={value} className={form.management_priority===value?`selected ${value}`:''} onClick={()=>setForm({...form,management_priority:value})}><i>{value==='critical'?<AlertTriangle/>:value==='high'?<Star/>:<Eye/>}</i><span><b>{PRIORITY_META[value].label}</b><small>{PRIORITY_META[value].description}</small></span></button>)}</fieldset>
        <div className="movie-ops-date-grid"><label><span>Ngày phát hành <em>*</em></span><input type="date" required value={form.release_date} onChange={event=>setForm({...form,release_date:event.target.value})}/></label><label><span>Kết thúc dự kiến <em>*</em></span><input type="date" required min={form.release_date} value={form.expected_end_date} onChange={event=>setForm({...form,expected_end_date:event.target.value})}/></label></div>
        <label className="movie-feature-toggle"><input type="checkbox" checked={Boolean(form.is_hot)} onChange={event=>setForm({...form,is_hot:event.target.checked})}/><span><Sparkles/><b>Đánh dấu phim nổi bật</b><small>Ưu tiên hiển thị và truyền thông trên các kênh Aurora.</small></span></label>
        <label><span>Ghi chú điều hành nội bộ</span><textarea maxLength={2000} value={form.management_note} onChange={event=>setForm({...form,management_note:event.target.value})} placeholder="Công việc cần theo dõi, rủi ro phát hành hoặc yêu cầu phối hợp với các rạp…"/><small>{String(form.management_note||'').length}/2000 ký tự</small></label>
      </div><footer><button type="button" disabled={saving} onClick={()=>setEditing(null)}>Hủy</button><button className="primary" disabled={saving}>{saving?<RefreshCw className="spin"/>:<CheckCircle2/>}{saving?'Đang lưu…':'Lưu điều hành'}</button></footer>
    </form></div>}
  </div>;
}
