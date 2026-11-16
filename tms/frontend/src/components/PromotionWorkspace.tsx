import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BadgeCheck, Check, CheckCircle2, ChevronRight, Clock3, Edit3, Eye, Gift, ImagePlus, Megaphone, Package, Pause, Plus, RefreshCw, RotateCcw, Save, Search, Send, ShieldCheck, Sparkles, Tag, Ticket, Trash2, UploadCloud, Users, X } from 'lucide-react';
import { VietnameseDateInput, formatVietnameseDate } from './VietnameseDateInput';
import './PromotionWorkspace.css';
import './PromotionApprovalWorkspace.css';

type Row = Record<string, any> & { id: number };
type ConfirmAction = (message: string, action: () => void | Promise<void>, title?: string, confirmLabel?: string) => void;
type Props = { apiBase: string; notify: (message: string) => void; requestConfirm: ConfirmAction };

const emptyForm = () => ({
  id: 0, promotion_code: '', name: '', description: '', details: '', terms_text: '', category: 'ticket', audience: 'all',
  badge_text: 'ƯU ĐÃI AURORA', theme_color: '#D99A1B', image_url: '', benefit_type: 'percent', discount_type: 'percent', discount_value: 10,
  benefit_title: 'Giảm 10% tổng hóa đơn', benefit_description: '', gift_product_id: 0, gift_quantity: 1, buy_quantity: 1, get_quantity: 1,
  application_scope: 'order', redemption_instructions: '', min_order_amount: 0, max_discount: 0, start_date: '', end_date: '', usage_limit: 0, is_featured: false
});

const adminRecipientOptions = [
  ['marketing_manager','Bộ phận Marketing','Hoàn thiện nội dung truyền thông, phát hành chương trình và theo dõi hiệu quả.'],
  ['cinema_admin','Admin Rạp','Tiếp nhận CTKM, cấu hình POS và tổ chức triển khai tại rạp.'],
  ['hr_manager','Quản lý nhân sự','Phổ biến nghiệp vụ, bố trí và hướng dẫn nhân sự thực hiện.'],
  ['supervisor','Giám sát vận hành','Kiểm tra việc thực hiện và xử lý tình huống phát sinh.'],
  ['accounting','Kế toán','Kiểm soát ngân sách, đối soát ưu đãi và báo cáo chi phí.']
] as const;

const emptyAdminPromotion = () => ({
  id:0,promotion_code:'',name:'',description:'',details:'',terms_text:'',admin_objective:'',coordination_note:'',
  category:'ticket',audience:'all',badge_text:'ƯU ĐÃI AURORA',theme_color:'#D99A1B',benefit_type:'percent',benefit_title:'',
  discount_value:10,min_order_amount:0,max_discount:0,usage_limit:0,start_date:'',end_date:'',
  assignments:[{recipient_role:'marketing_manager',theater_id:0,responsibility:adminRecipientOptions[0][2],due_date:''}]
});

const approvalLabel: Record<string, string> = { draft: 'Bản nháp', pending_approval: 'Chờ Admin Tổng', approved: 'Đã phê duyệt', revision_requested: 'Cần chỉnh sửa' };
const publicationLabel: Record<string, string> = { draft: 'Chưa phát hành', published: 'Đang hiển thị', paused: 'Đã tạm dừng', expired: 'Hết hiệu lực' };
const categoryLabel: Record<string, string> = { ticket: 'Vé xem phim', combo: 'Combo & F&B', member: 'Thành viên', event: 'Sự kiện' };
const money = (value: any) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const date = (value: any) => formatVietnameseDate(value ? String(value) : '', '—');
const benefitTypeLabel:Record<string,string>={percent:'Giảm theo phần trăm',amount:'Giảm số tiền cố định',gift_product:'Tặng sản phẩm / combo',buy_x_get_y:'Mua X tặng Y',free_ticket:'Tặng vé xem phim',membership_bonus:'Tặng điểm / nâng hạng',other:'Quyền lợi khác'};
const offer = (row: Row) => {const type=row.benefit_type||row.discount_type;if(type==='percent')return `${Number(row.discount_value)}%`;if(type==='amount')return money(row.discount_value);if(type==='gift_product')return `Tặng ${Number(row.gift_quantity||1)} ${row.gift_product_name||row.benefit_title||'quà tặng'}`;return row.benefit_title||benefitTypeLabel[type]||'Quyền lợi đặc biệt'};

async function request(apiBase: string, suffix: string, options?: RequestInit) {
  const response = await fetch(`${apiBase}?action=marketing-promotions${suffix}`, { credentials: 'include', cache: 'no-store', ...options });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Không thể xử lý chương trình khuyến mãi.');
  return result;
}

function ApprovalBadge({ value }: { value: string }) {
  const Icon = value === 'approved' ? CheckCircle2 : value === 'pending_approval' ? Clock3 : value === 'revision_requested' ? AlertTriangle : Edit3;
  return <span className={`promo-badge approval ${value}`}><Icon />{approvalLabel[value] || value}</span>;
}

function PublicationBadge({ value }: { value: string }) {
  return <span className={`promo-badge publication ${value || 'draft'}`}><i />{publicationLabel[value] || 'Chưa phát hành'}</span>;
}

function PromotionPreview({ row }: { row: Row }) {
  return <div className="promo-customer-preview" style={{ '--promo-color': row.theme_color || '#D99A1B' } as React.CSSProperties}>
    <div className="promo-preview-art">{row.image_url ? <img src={row.image_url} alt="" /> : <><Gift /><strong>{offer(row)}</strong></>}<span>{row.badge_text || 'ƯU ĐÃI AURORA'}</span></div>
    <div><small>XEM TRƯỚC TRÊN CUSTOMER</small><h3>{row.name || 'Tên chương trình khuyến mãi'}</h3><p>{row.description || 'Mô tả ngắn sẽ hiển thị tại trang Ưu đãi.'}</p><code>{row.promotion_code || 'MÃ-ƯU-ĐÃI'}</code></div>
  </div>;
}

export function MarketingPromotionWorkspace({ apiBase, notify, requestConfirm }: Props) {
  const [rows, setRows] = useState<Row[]>([]), [summary, setSummary] = useState<any>({}), [loading, setLoading] = useState(true);
  const [giftProducts,setGiftProducts]=useState<Row[]>([]),[uploading,setUploading]=useState(false);const imageInputRef=useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [editing, setEditing] = useState(false), [viewing, setViewing] = useState<Row | null>(null);
  const [form, setForm] = useState<any>(emptyForm()), [saving, setSaving] = useState(false), [step, setStep] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(); if (query) params.set('q', query); if (filter !== 'all') params.set('approval_status', filter);
      const result = await request(apiBase, `&${params.toString()}`); setRows(result.data || []); setSummary(result.meta?.summary || {});setGiftProducts(result.meta?.gift_products||[]);
    } catch (error) { notify(error instanceof Error ? error.message : 'Không thể tải kế hoạch khuyến mãi.'); } finally { setLoading(false); }
  }, [apiBase, filter, notify, query]);
  useEffect(() => { const timer = setTimeout(() => void load(), query ? 250 : 0); return () => clearTimeout(timer); }, [load, query]);
  const openEditor = (row?: Row) => { const value=row?{...emptyForm(),...row,benefit_type:row.benefit_type||row.discount_type||'percent',is_featured:Boolean(Number(row.is_featured))}:emptyForm();setForm(value); setStep(1); setEditing(true); };
  const uploadImage=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;const data=new FormData();data.append('image',file);setUploading(true);try{const response=await fetch(`${apiBase}?action=promotion-image`,{method:'POST',credentials:'include',body:data});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message);setForm((current:any)=>({...current,image_url:result.data.url}));notify(result.message)}catch(error){notify(error instanceof Error?error.message:'Không thể tải ảnh chương trình.')}finally{setUploading(false)}};
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const result = await request(apiBase, '', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, operation: 'save' }) }); notify(result.message); setEditing(false); await load(); }
    catch (error) { notify(error instanceof Error ? error.message : 'Không thể lưu kế hoạch.'); } finally { setSaving(false); }
  };
  const action = (row: Row, operation: string) => {
    const labels: Record<string, [string, string, string]> = {
      submit: ['Gửi kế hoạch này đến Admin Tổng để xem xét?', 'Gửi phê duyệt', 'Gửi Admin Tổng'],
      withdraw: ['Thu hồi hồ sơ đang chờ duyệt về bản nháp?', 'Thu hồi kế hoạch', 'Thu hồi'],
      publish: ['Tạo chương trình từ kế hoạch đã duyệt và hiển thị ngay trên trang Customer?', 'Phát hành chương trình', 'Tạo & phát hành'],
      pause: ['Tạm ẩn chương trình này khỏi trang Customer?', 'Tạm dừng chương trình', 'Tạm dừng'],
      delete: ['Xóa vĩnh viễn bản nháp này khỏi aurora_db?', 'Xóa kế hoạch', 'Xóa']
    };
    const [message, title, button] = labels[operation];
    requestConfirm(message, async () => {
      try {
        const result = operation === 'delete'
          ? await request(apiBase, `&id=${row.id}`, { method: 'DELETE' })
          : await request(apiBase, '', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, operation }) });
        notify(result.message); setViewing(null); await load();
      } catch (error) { notify(error instanceof Error ? error.message : 'Không thể xử lý kế hoạch.'); }
    }, title, button);
  };
  const tabs = [['all', 'Tất cả', summary.total], ['draft', 'Bản nháp', summary.draft], ['pending_approval', 'Chờ duyệt', summary.pending], ['approved', 'Đã duyệt', summary.approved], ['revision_requested', 'Cần sửa', summary.revision]];
  return <div className="promotion-workspace">
    <section className="promo-kpis">
      <article><span className="rose"><Gift /></span><div><small>Tổng kế hoạch</small><b>{summary.total || 0}</b><em>Trong aurora_db</em></div></article>
      <article><span className="amber"><Clock3 /></span><div><small>Chờ Admin Tổng</small><b>{summary.pending || 0}</b><em>Đang chờ xử lý</em></div></article>
      <article><span className="green"><BadgeCheck /></span><div><small>Đã phê duyệt</small><b>{summary.approved || 0}</b><em>Đủ điều kiện phát hành</em></div></article>
      <article><span className="blue"><Megaphone /></span><div><small>Đang hiển thị</small><b>{summary.published || 0}</b><em>Trên Customer Website</em></div></article>
    </section>
    <section className="promo-flow"><ShieldCheck /><div><b>Quy trình kiểm soát khuyến mãi</b><p>Marketing lập kế hoạch và gửi duyệt. Chỉ hồ sơ được Admin Tổng phê duyệt mới có nút tạo chương trình và đồng bộ sang trang Customer.</p></div><div className="promo-flow-steps"><span className="done"><i>1</i>Lập kế hoạch</span><ChevronRight/><span><i>2</i>Admin duyệt</span><ChevronRight/><span><i>3</i>Phát hành</span></div></section>
    <section className="promo-board">
      <header><div><h2>Kế hoạch chương trình khuyến mãi</h2><p>Theo dõi từ bản nháp đến khi xuất hiện trên website khách hàng.</p></div><button onClick={() => openEditor()}><Plus />Lập kế hoạch mới</button></header>
      <div className="promo-tools"><label><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, tên hoặc nội dung kế hoạch…" /></label><nav>{tabs.map(([key, label, count]) => <button key={String(key)} className={filter === key ? 'active' : ''} onClick={() => setFilter(String(key))}>{label}<b>{Number(count || 0)}</b></button>)}</nav><button className="refresh" onClick={() => void load()}><RefreshCw /></button></div>
      {loading ? <div className="promo-state"><RefreshCw className="spin"/><b>Đang đọc dữ liệu từ aurora_db…</b></div> : rows.length ? <div className="promo-table-wrap"><table><thead><tr><th>Kế hoạch</th><th>Ưu đãi</th><th>Thời gian</th><th>Phê duyệt</th><th>Phát hành</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={row.approval_status === 'revision_requested' ? 'revision' : ''}>
        <td><div className="promo-title-cell"><i style={{ background: row.theme_color || '#D99A1B' }}><Gift /></i><div><code>{row.promotion_code}</code><b>{row.name}</b><span>{categoryLabel[row.category] || row.category} · {row.audience === 'all' ? 'Mọi khách hàng' : `Nhóm ${row.audience}`}</span></div></div></td>
        <td><b className="promo-value">{offer(row)}</b><small>Đơn tối thiểu {money(row.min_order_amount)}</small></td>
        <td><b>{date(row.start_date)}</b><small>đến {date(row.end_date)}</small></td>
        <td><ApprovalBadge value={row.approval_status}/>{row.review_note && <small className="review-copy">{row.review_note}</small>}</td>
        <td><PublicationBadge value={row.publication_status}/>{row.publication_status === 'published' && <small>{Number(row.voucher_used_count || 0)} lượt sử dụng</small>}</td>
        <td><div className="promo-actions"><button title="Xem hồ sơ" onClick={() => setViewing(row)}><Eye /></button>{['draft', 'revision_requested'].includes(row.approval_status) && <button title="Chỉnh sửa" onClick={() => openEditor(row)}><Edit3 /></button>}{['draft', 'revision_requested'].includes(row.approval_status) && <button className="send" title="Gửi Admin Tổng" onClick={() => action(row, 'submit')}><Send /></button>}{row.approval_status === 'pending_approval' && <button title="Thu hồi" onClick={() => action(row, 'withdraw')}><RotateCcw /></button>}{row.approval_status === 'approved' && row.publication_status !== 'published' && <button className="publish" onClick={() => action(row, 'publish')}><Sparkles/>Tạo chương trình</button>}{row.publication_status === 'published' && <button title="Tạm dừng hiển thị" onClick={() => action(row, 'pause')}><Pause /></button>}{['draft', 'revision_requested'].includes(row.approval_status) && <button className="danger" title="Xóa" onClick={() => action(row, 'delete')}><Trash2 /></button>}</div></td>
      </tr>)}</tbody></table></div> : <div className="promo-state"><Gift/><b>Chưa có kế hoạch phù hợp</b><span>Lập kế hoạch đầu tiên để bắt đầu quy trình phê duyệt.</span></div>}
    </section>
    {editing && <div className="promo-modal-backdrop" onMouseDown={event => event.currentTarget === event.target && !saving && setEditing(false)}><form className="promo-editor" onSubmit={submit}>
      <header><div><span>{form.id ? 'CHỈNH SỬA KẾ HOẠCH' : 'KẾ HOẠCH KHUYẾN MÃI MỚI'}</span><h2>{form.id ? form.name : 'Lên kế hoạch chương trình khuyến mãi'}</h2><p>Hoàn thiện nội dung sẽ được Admin Tổng xem xét trước khi phát hành.</p></div><button type="button" onClick={() => setEditing(false)}><X/></button></header>
      <nav className="promo-editor-steps">{[['1','Thông tin'],['2','Ưu đãi'],['3','Hiển thị'],['4','Kiểm tra']].map(([number,label], index) => <button type="button" key={number} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} onClick={() => step > index + 1 && setStep(index + 1)}><b>{step > index + 1 ? <Check/> : number}</b><span>{label}</span></button>)}</nav>
      <div className="promo-editor-body">
        {step === 1 && <section><div className="promo-section-title"><Tag/><div><h3>Thông tin kế hoạch</h3><p>Tên, mã và nội dung truyền thông của chương trình.</p></div></div><div className="promo-form-grid"><label><span>Mã chương trình</span><input value={form.promotion_code} onChange={e => setForm({...form,promotion_code:e.target.value.toUpperCase()})} placeholder="Tự tạo nếu để trống"/></label><label><span>Tên chương trình *</span><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label className="wide"><span>Mô tả ngắn *</span><textarea required value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Thông điệp ngắn hiển thị trên thẻ ưu đãi…"/></label><label className="wide"><span>Nội dung chi tiết</span><textarea value={form.details} onChange={e => setForm({...form,details:e.target.value})}/></label><label className="wide"><span>Điều kiện áp dụng *</span><textarea required value={form.terms_text} onChange={e => setForm({...form,terms_text:e.target.value})} placeholder="Đối tượng, suất chiếu, giới hạn kết hợp ưu đãi…"/></label></div></section>}
        {step === 2 && <section><div className="promo-section-title"><Gift/><div><h3>Thiết kế quyền lợi chương trình</h3><p>Chọn đúng bản chất quyền lợi; chương trình không bắt buộc phải giảm tiền.</p></div></div><div className="benefit-type-grid">{[
          ['percent','Giảm phần trăm','Giảm theo % trên phạm vi áp dụng',Tag],['amount','Giảm tiền cố định','Trừ một số tiền xác định',Tag],['gift_product','Tặng sản phẩm / combo','Tặng bắp, nước hoặc combo',Gift],['buy_x_get_y','Mua X tặng Y','Khuyến khích mua theo số lượng',Package],['free_ticket','Tặng vé xem phim','Tặng một hoặc nhiều vé',Ticket],['membership_bonus','Điểm / hạng thành viên','Tặng điểm hoặc nâng hạng',Users],['other','Quyền lợi khác','Quà tặng hoặc trải nghiệm riêng',Sparkles]
        ].map(([key,label,description,Icon]:any)=><button type="button" key={key} className={form.benefit_type===key?'selected':''} onClick={()=>setForm({...form,benefit_type:key,discount_type:key})}><Icon/><span><b>{label}</b><small>{description}</small></span>{form.benefit_type===key&&<Check/>}</button>)}</div>
        <div className="promo-form-grid benefit-fields"><label className="wide"><span>Tên quyền lợi hiển thị *</span><input required maxLength={150} value={form.benefit_title} onChange={e=>setForm({...form,benefit_title:e.target.value})} placeholder="Ví dụ: Tặng combo bắp nước cỡ M"/></label><label className="wide"><span>Mô tả quyền lợi</span><textarea value={form.benefit_description} onChange={e=>setForm({...form,benefit_description:e.target.value})} placeholder="Mô tả khách hàng sẽ nhận được gì và cách nhận…"/></label>
        {['percent','amount'].includes(form.benefit_type)&&<><label><span>{form.benefit_type==='percent'?'Phần trăm giảm *':'Số tiền giảm *'}</span><div className="promo-value-input"><input type="number" required min="1" max={form.benefit_type==='percent'?100:undefined} value={form.discount_value} onChange={e=>setForm({...form,discount_value:Number(e.target.value)})}/><b>{form.benefit_type==='percent'?'%':'₫'}</b></div></label><label><span>Giảm tối đa</span><div className="promo-value-input"><input type="number" min="0" value={form.max_discount} onChange={e=>setForm({...form,max_discount:Number(e.target.value)})}/><b>₫</b></div></label></>}
        {['gift_product','buy_x_get_y'].includes(form.benefit_type)&&<><label className="wide"><span>Sản phẩm / combo quà tặng *</span><select required value={form.gift_product_id||''} onChange={e=>{const product=giftProducts.find(item=>Number(item.id)===Number(e.target.value));setForm({...form,gift_product_id:Number(e.target.value),gift_product_name:product?.name||''})}}><option value="">Chọn từ danh mục hàng hóa đang hoạt động</option>{giftProducts.map(product=><option key={product.id} value={product.id}>{product.sku} · {product.name} ({product.unit})</option>)}</select></label>{form.benefit_type==='gift_product'?<label><span>Số lượng tặng</span><input type="number" min="1" value={form.gift_quantity} onChange={e=>setForm({...form,gift_quantity:Number(e.target.value)})}/></label>:<><label><span>Số lượng khách mua</span><input type="number" min="1" value={form.buy_quantity} onChange={e=>setForm({...form,buy_quantity:Number(e.target.value)})}/></label><label><span>Số lượng được tặng</span><input type="number" min="1" value={form.get_quantity} onChange={e=>setForm({...form,get_quantity:Number(e.target.value),gift_quantity:Number(e.target.value)})}/></label></>}</>}
        {form.benefit_type==='free_ticket'&&<label><span>Số vé tặng</span><input type="number" min="1" value={form.gift_quantity} onChange={e=>setForm({...form,gift_quantity:Number(e.target.value)})}/></label>}
        <label><span>Phạm vi áp dụng</span><select value={form.application_scope} onChange={e=>setForm({...form,application_scope:e.target.value})}><option value="order">Toàn đơn hàng</option><option value="ticket">Vé xem phim</option><option value="combo">Combo & F&amp;B</option><option value="product">Sản phẩm chỉ định</option><option value="membership">Tài khoản thành viên</option></select></label><label><span>Đơn hàng tối thiểu</span><input type="number" min="0" value={form.min_order_amount} onChange={e=>setForm({...form,min_order_amount:Number(e.target.value)})}/></label><label><span>Đối tượng</span><select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option value="all">Mọi khách hàng</option><option value="member">Thành viên Aurora</option><option value="silver">Hạng Silver</option><option value="gold">Hạng Gold</option><option value="platinum">Hạng Platinum</option></select></label><label><span>Giới hạn lượt dùng</span><input type="number" min="0" value={form.usage_limit} onChange={e=>setForm({...form,usage_limit:Number(e.target.value)})}/><small>Nhập 0 nếu không giới hạn</small></label><label><span>Ngày bắt đầu *</span><VietnameseDateInput required value={form.start_date} onChange={value=>setForm({...form,start_date:value})} ariaLabel="Ngày bắt đầu"/></label><label><span>Ngày kết thúc *</span><VietnameseDateInput required value={form.end_date} onChange={value=>setForm({...form,end_date:value})} ariaLabel="Ngày kết thúc"/></label><label className="wide"><span>Hướng dẫn đổi / nhận quyền lợi</span><textarea value={form.redemption_instructions} onChange={e=>setForm({...form,redemption_instructions:e.target.value})} placeholder="Ví dụ: Xuất trình mã tại quầy Concession sau khi thanh toán vé…"/></label></div></section>}
        {step === 3 && <section><div className="promo-section-title"><Sparkles/><div><h3>Hình ảnh & trình bày trên Customer</h3><p>Tải ảnh chiến dịch và kiểm tra thẻ hiển thị trước khi gửi duyệt.</p></div></div><div className="promotion-creative-layout"><aside className="promotion-image-uploader"><button type="button" className={form.image_url?'has-image':''} disabled={uploading} onClick={()=>imageInputRef.current?.click()}>{form.image_url?<img src={form.image_url} alt="Ảnh chương trình"/>:<><ImagePlus/><b>{uploading?'Đang tải ảnh…':'Tải ảnh chương trình'}</b><span>JPG, PNG, WebP · tối đa 8 MB<br/>Tối thiểu 600 × 300 px</span></>}<em><UploadCloud/>{form.image_url?'Thay ảnh':'Chọn ảnh'}</em></button><input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage}/>{form.image_url&&<button type="button" className="remove-promotion-image" onClick={()=>setForm({...form,image_url:''})}>Xóa ảnh hiện tại</button>}</aside><div className="promo-form-grid"><label><span>Nhóm chương trình</span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="ticket">Vé xem phim</option><option value="combo">Combo &amp; F&amp;B</option><option value="member">Thành viên</option><option value="event">Sự kiện</option></select></label><label><span>Nhãn nổi bật</span><input maxLength={60} value={form.badge_text} onChange={e=>setForm({...form,badge_text:e.target.value})}/></label><label><span>Màu chủ đạo</span><div className="promotion-color-field"><input type="color" value={form.theme_color} onChange={e=>setForm({...form,theme_color:e.target.value})}/><b>{form.theme_color}</b></div></label><label className="check"><input type="checkbox" checked={form.is_featured} onChange={e=>setForm({...form,is_featured:e.target.checked})}/><span>Ưu đãi nổi bật trên Customer</span></label></div></div><PromotionPreview row={form}/></section>}
        {step === 4 && <section><div className="promo-section-title"><ShieldCheck/><div><h3>Kiểm tra trước khi lưu</h3><p>Bản nháp chưa hiển thị trên Customer cho đến khi Admin Tổng duyệt và Marketing phát hành.</p></div></div><PromotionPreview row={form}/><div className="promo-review-grid"><article><small>Ưu đãi</small><b>{offer(form)}</b><span>Đơn tối thiểu {money(form.min_order_amount)}</span></article><article><small>Hiệu lực</small><b>{date(form.start_date)}</b><span>đến {date(form.end_date)}</span></article><article><small>Đối tượng</small><b>{form.audience === 'all' ? 'Mọi khách hàng' : form.audience}</b><span>{categoryLabel[form.category]}</span></article></div></section>}
      </div>
      <footer><div><ShieldCheck/><span>Dữ liệu lưu trực tiếp trong aurora_db</span></div>{step > 1 && <button type="button" onClick={() => setStep(step - 1)}>Quay lại</button>}{step < 4 ? <button type="button" className="primary" onClick={() => setStep(step + 1)}>Tiếp tục<ChevronRight/></button> : <button disabled={saving} className="primary"><Save/>{saving ? 'Đang lưu…' : 'Lưu bản nháp'}</button>}</footer>
    </form></div>}
    {viewing && <PromotionDetail row={viewing} onClose={() => setViewing(null)} />}
  </div>;
}

function PromotionDetail({ row, onClose, review }: { row: Row; onClose: () => void; review?: React.ReactNode }) {
  const monetary=['percent','amount'].includes(row.benefit_type||row.discount_type);
  return <div className="promo-modal-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}><article className="promo-detail">
    <header><div><span>HỒ SƠ KHUYẾN MÃI · {row.promotion_code}</span><h2>{row.name}</h2><p><ApprovalBadge value={row.approval_status}/><PublicationBadge value={row.publication_status}/></p></div><button onClick={onClose}><X/></button></header>
    <div className="promo-detail-body"><PromotionPreview row={row}/><section className="promo-detail-grid">
      <article><small>Quyền lợi</small><b>{offer(row)}</b><span>{monetary&&Number(row.max_discount)>0?`Tối đa ${money(row.max_discount)}`:benefitTypeLabel[row.benefit_type||row.discount_type]}</span></article>
      <article><small>Thời gian</small><b>{date(row.start_date)}</b><span>đến {date(row.end_date)}</span></article>
      <article><small>Đối tượng</small><b>{row.audience === 'all' ? 'Mọi khách hàng' : row.audience}</b><span>{categoryLabel[row.category]}</span></article>
      <article><small>Giới hạn</small><b>{Number(row.usage_limit) ? `${Number(row.usage_limit).toLocaleString('vi-VN')} lượt` : 'Không giới hạn'}</b><span>{Number(row.voucher_used_count || 0)} lượt đã dùng</span></article>
    </section><section className="promo-copy">{row.admin_objective&&<><h3>Mục tiêu do Admin Tổng giao</h3><p>{row.admin_objective}</p></>}<h3>Nội dung chương trình</h3><p>{row.details || row.description}</p>{row.benefit_description&&<><h3>Chi tiết quyền lợi</h3><p>{row.benefit_description}</p></>}<h3>Điều kiện áp dụng</h3><p>{row.terms_text}</p>{row.coordination_note&&<><h3>Ghi chú phối hợp</h3><p>{row.coordination_note}</p></>}{row.assignment_labels&&<><h3>Đơn vị thực hiện</h3><p>{row.assignment_labels}</p></>}{row.redemption_instructions&&<><h3>Cách nhận quyền lợi</h3><p>{row.redemption_instructions}</p></>}</section>{row.review_note && <section className="promo-review-note"><AlertTriangle/><div><b>Phản hồi của Admin Tổng</b><p>{row.review_note}</p><small>{row.reviewed_by} · {row.reviewed_at}</small></div></section>}</div>{review}
  </article></div>;
}

export function PromotionApprovalWorkspace({ apiBase, notify, requestConfirm, initialStatus = 'pending_approval' }: Props & { initialStatus?: string }) {
  const [rows, setRows] = useState<Row[]>([]), [summary, setSummary] = useState<any>({}), [loading, setLoading] = useState(true), [query, setQuery] = useState(''), [status, setStatus] = useState(initialStatus), [selected, setSelected] = useState<Row | null>(null), [decision, setDecision] = useState<'approved'|'revision_requested'|null>(null), [note, setNote] = useState(''), [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const params = new URLSearchParams(); if(query)params.set('q',query);if(status!=='all')params.set('approval_status',status);const result=await request(apiBase,`&${params}`);setRows(result.data||[]);setSummary(result.meta?.summary||{}); } catch(error){notify(error instanceof Error?error.message:'Không thể tải hàng đợi duyệt.')} finally{setLoading(false)} },[apiBase,notify,query,status]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),query?250:0);return()=>clearTimeout(timer)},[load,query]);
  const open = (row: Row) => { setSelected(row); setDecision(null); setNote(''); };
  const executeReview = () => { if(!selected||!decision)return;const label=decision==='approved'?'Phê duyệt kế hoạch':'Gửi yêu cầu sửa';requestConfirm(decision==='approved'?'Sau khi duyệt, Marketing sẽ được phép tạo chương trình từ đúng nội dung hồ sơ này.':'Hồ sơ sẽ được trả lại Marketing để cập nhật.',async()=>{setSaving(true);try{const result=await request(apiBase,'',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,operation:'review',decision,note})});notify(result.message);setSelected(null);await load();}catch(error){notify(error instanceof Error?error.message:'Không thể lưu quyết định.')}finally{setSaving(false)}},label,decision==='approved'?'Phê duyệt':'Gửi lại'); };
  const stats = useMemo(() => [['Chờ xử lý',summary.pending||0,Clock3,'amber'],['Đã phê duyệt',summary.approved||0,CheckCircle2,'green'],['Yêu cầu sửa',summary.revision||0,RotateCcw,'rose'],['Đã phát hành',summary.published||0,Megaphone,'blue']] as const,[summary]);
  return <div className="promotion-workspace admin-promotion-workspace"><section className="promo-kpis">{stats.map(([label,value,Icon,tone])=><article key={label}><span className={tone}><Icon/></span><div><small>{label}</small><b>{value}</b><em>Hồ sơ khuyến mãi</em></div></article>)}</section><section className="promo-board"><div className="promo-tools admin"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm mã hoặc tên chương trình…"/></label><nav>{[['pending_approval','Chờ duyệt',summary.pending],['approved','Đã duyệt',summary.approved],['revision_requested','Yêu cầu sửa',summary.revision],['all','Tất cả',summary.total]].map(([key,label,count])=><button key={String(key)} className={status===key?'active':''} onClick={()=>setStatus(String(key))}>{label}<b>{Number(count||0)}</b></button>)}</nav></div>{loading?<div className="promo-state"><RefreshCw className="spin"/><b>Đang tải hàng đợi từ aurora_db…</b></div>:rows.length?<div className="promo-approval-list">{rows.map(row=><article key={row.id} className={row.approval_status}><div className="promo-title-cell"><i style={{background:row.theme_color||'#D99A1B'}}><Gift/></i><div><code>{row.promotion_code}</code><h3>{row.name}</h3><span>{row.creator_name||'Marketing'} · gửi {date(row.submitted_at)}</span></div></div><div className="promo-approval-metrics"><span><small>Ưu đãi</small><b>{offer(row)}</b></span><span><small>Thời gian</small><b>{date(row.start_date)} – {date(row.end_date)}</b></span><span><small>Đối tượng</small><b>{row.audience==='all'?'Mọi khách hàng':row.audience}</b></span></div><aside><ApprovalBadge value={row.approval_status}/><button onClick={()=>open(row)}>{row.approval_status==='pending_approval'?'Xem & xử lý':'Xem hồ sơ'}<ChevronRight/></button></aside></article>)}</div>:<div className="promo-state"><CheckCircle2/><b>Không có hồ sơ trong nhóm này</b><span>Kế hoạch Marketing gửi duyệt sẽ xuất hiện tại đây.</span></div>}</section>{selected&&<PromotionDetail row={selected} onClose={()=>setSelected(null)} review={selected.approval_status==='pending_approval'?<section className="promo-decision"><header><ShieldCheck/><div><h3>Quyết định của Admin Tổng</h3><p>Marketing chỉ được phát hành sau khi hồ sơ được phê duyệt.</p></div></header><div className="promo-decision-options"><button className={decision==='approved'?'selected approve':''} onClick={()=>setDecision('approved')}><CheckCircle2/><span><b>Phê duyệt kế hoạch</b><small>Cho phép Marketing tạo chương trình</small></span></button><button className={decision==='revision_requested'?'selected revise':''} onClick={()=>setDecision('revision_requested')}><RotateCcw/><span><b>Yêu cầu chỉnh sửa</b><small>Trả hồ sơ kèm phản hồi cụ thể</small></span></button></div><label><span>Ý kiến phê duyệt {decision==='revision_requested'&&<em>*</em>}</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={decision==='approved'?'Ghi chú thêm cho Marketing (không bắt buộc)…':'Nêu rõ nội dung, điều kiện hoặc số liệu cần chỉnh sửa…'}/></label><button className={`promo-review-submit ${decision||''}`} disabled={!decision||saving} onClick={executeReview}>{saving?<RefreshCw className="spin"/>:decision==='approved'?<Check/>:<Send/>}{saving?'Đang xử lý…':decision==='approved'?'Phê duyệt và cho phép tạo':'Gửi Marketing chỉnh sửa'}</button></section>:undefined}/>}</div>;
}

export function PromotionManagementWorkspace({ apiBase, notify, requestConfirm }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<Row | null>(null);
  const [theaters, setTheaters] = useState<Row[]>([]);
  const [editing, setEditing] = useState(false);
  const [adminForm, setAdminForm] = useState<any>(emptyAdminPromotion());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (status !== 'all') params.set('publication_status', status);
      const result = await request(apiBase, `&${params.toString()}`);
      setRows(result.data || []);
      setSummary(result.meta?.summary || {});
      setTheaters(result.meta?.theaters || []);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể tải danh sách chương trình khuyến mãi.');
    } finally {
      setLoading(false);
    }
  }, [apiBase, notify, query, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  const filters = [
    ['all', 'Tất cả', summary.total],
    ['published', 'Đang phát hành', summary.published],
    ['draft', 'Chưa phát hành', summary.unpublished],
    ['paused', 'Tạm dừng', summary.paused]
  ];

  const toggleRecipient = (role:string) => {
    const exists=adminForm.assignments.some((item:any)=>item.recipient_role===role);
    const option=adminRecipientOptions.find(item=>item[0]===role);
    setAdminForm({...adminForm,assignments:exists?adminForm.assignments.filter((item:any)=>item.recipient_role!==role):[...adminForm.assignments,{recipient_role:role,theater_id:0,responsibility:option?.[2]||'',due_date:adminForm.start_date}]});
  };
  const updateAssignment=(role:string,field:string,value:any)=>setAdminForm({...adminForm,assignments:adminForm.assignments.map((item:any)=>item.recipient_role===role?{...item,[field]:value}:item)});
  const saveAdminPromotion=async(event:FormEvent)=>{event.preventDefault();setSaving(true);try{const result=await request(apiBase,'',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...adminForm,operation:'admin_save'})});notify(result.message);setEditing(false);setAdminForm(emptyAdminPromotion());await load()}catch(error){notify(error instanceof Error?error.message:'Không thể lưu kế hoạch chương trình.')}finally{setSaving(false)}};
  const removePromotion=(row:Row)=>requestConfirm(`Xóa chương trình “${row.name}” cùng toàn bộ phân công liên quan? Chương trình đã có lượt sử dụng sẽ được hệ thống bảo vệ và không cho xóa.`,async()=>{try{const result=await request(apiBase,'',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'admin_delete',id:row.id})});notify(result.message);setSelected(null);await load()}catch(error){notify(error instanceof Error?error.message:'Không thể xóa chương trình.')}},'Xóa chương trình','Xóa chương trình');

  return <div className="promotion-workspace promotion-management-workspace">
    <section className="promo-kpis promo-management-kpis">
      <article><span className="rose"><Gift/></span><div><small>Tổng chương trình</small><b>{summary.total || 0}</b><em>Tất cả hồ sơ trong hệ thống</em></div></article>
      <article><span className="green"><Megaphone/></span><div><small>Đang phát hành</small><b>{summary.published || 0}</b><em>Hiển thị trên Customer</em></div></article>
      <article><span className="blue"><Ticket/></span><div><small>Điểm POS đang bật</small><b>{summary.active_theaters || 0}</b><em>Cấu hình tại các rạp</em></div></article>
      <article><span className="amber"><Users/></span><div><small>Lượt áp dụng</small><b>{Number(summary.redemptions || 0).toLocaleString('vi-VN')}</b><em>Ghi nhận từ vận hành rạp</em></div></article>
    </section>
    <section className="promo-board promo-management-board">
      <div className="promo-tools admin"><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, tên hoặc nội dung chương trình…"/></label><nav>{filters.map(([key,label,count]) => <button type="button" key={String(key)} className={status === key ? 'active' : ''} onClick={() => setStatus(String(key))}>{label}<b>{Math.max(0, Number(count || 0))}</b></button>)}</nav><button type="button" className="promo-admin-create" onClick={()=>{setAdminForm(emptyAdminPromotion());setEditing(true)}}><Plus/>Lập kế hoạch mới</button></div>
      {loading ? <div className="promo-state"><RefreshCw className="spin"/><b>Đang đồng bộ chương trình từ aurora_db…</b><span>Đối chiếu hồ sơ, voucher và cấu hình tại rạp.</span></div> : rows.length ? <div className="promo-management-list">{rows.map(row => <article key={row.id}>
        <div className="promo-management-art" style={{background:`linear-gradient(145deg,${row.theme_color || '#D99A1B'},#14233a)`}}>{row.image_url ? <img src={row.image_url} alt=""/> : <Gift/>}<strong>{offer(row)}</strong><small>{row.badge_text || 'AURORA CINEMA'}</small></div>
        <div className="promo-management-main"><div className="promo-management-title"><code>{row.promotion_code}</code><PublicationBadge value={row.publication_status}/></div><h3>{row.name}</h3><p>{row.description || 'Chưa có mô tả chương trình.'}</p><div className="promo-management-meta"><span><Clock3/><b>{date(row.start_date)} – {date(row.end_date)}</b></span><span><Users/><b>{row.audience === 'all' ? 'Mọi khách hàng' : row.audience}</b></span><span><Tag/><b>{categoryLabel[row.category] || row.category}</b></span>{Number(row.assignment_count||0)>0&&<span><ShieldCheck/><b>{row.assignment_count} đơn vị: {row.assignment_labels}</b></span>}</div></div>
        <div className="promo-deployment-summary"><span><small>Độ phủ rạp</small><b>{Number(row.active_theater_count || 0)} / {Number(row.theater_count || 0)}</b><em>POS đang bật</em></span><span><small>Chờ tiếp nhận</small><b>{Number(row.pending_theater_count || 0)}</b><em>rạp chưa cấu hình</em></span><span><small>Lượt sử dụng</small><b>{Number(row.deployment_redemption_count || row.voucher_used_count || 0).toLocaleString('vi-VN')}</b><em>toàn hệ thống</em></span></div>
        <div className="promo-management-actions"><button type="button" className="promo-management-view" onClick={() => setSelected(row)}><Eye/>Chi tiết</button><button type="button" className="promo-management-delete" onClick={()=>removePromotion(row)}><Trash2/>Xóa</button></div>
      </article>)}</div> : <div className="promo-state"><Gift/><b>Không có chương trình phù hợp</b><span>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span></div>}
    </section>
    {selected && <PromotionDetail row={selected} onClose={() => setSelected(null)}/>}
    {editing&&<div className="promo-modal-backdrop" onMouseDown={event=>event.currentTarget===event.target&&!saving&&setEditing(false)}><form className="promo-editor admin-promotion-editor" onSubmit={saveAdminPromotion}>
      <header><div><span>ADMIN TỔNG · ĐIỀU PHỐI CTKM</span><h2>Lập kế hoạch chương trình khuyến mãi</h2><p>Tạo chương trình và giao nhiệm vụ cụ thể đến các bộ phận thực hiện.</p></div><button type="button" onClick={()=>setEditing(false)}><X/></button></header>
      <div className="promo-editor-body admin-promotion-body">
        <section><div className="promo-section-title"><Tag/><div><h3>1. Thông tin chương trình</h3><p>Nội dung này là nguồn thống nhất cho Marketing, rạp và các đơn vị phối hợp.</p></div></div><div className="promo-form-grid"><label><span>Mã chương trình</span><input value={adminForm.promotion_code} onChange={e=>setAdminForm({...adminForm,promotion_code:e.target.value.toUpperCase()})} placeholder="Tự động nếu để trống"/></label><label><span>Tên chương trình *</span><input required value={adminForm.name} onChange={e=>setAdminForm({...adminForm,name:e.target.value})}/></label><label className="wide"><span>Mục tiêu chương trình *</span><textarea required value={adminForm.admin_objective} onChange={e=>setAdminForm({...adminForm,admin_objective:e.target.value})} placeholder="Mục tiêu kinh doanh, khách hàng và kết quả cần đạt…"/></label><label className="wide"><span>Mô tả truyền thông *</span><textarea required value={adminForm.description} onChange={e=>setAdminForm({...adminForm,description:e.target.value})}/></label><label className="wide"><span>Điều kiện áp dụng *</span><textarea required value={adminForm.terms_text} onChange={e=>setAdminForm({...adminForm,terms_text:e.target.value})}/></label></div></section>
        <section><div className="promo-section-title"><Gift/><div><h3>2. Quyền lợi và thời gian</h3><p>Xác định ưu đãi, đối tượng và giới hạn áp dụng.</p></div></div><div className="promo-form-grid"><label><span>Loại quyền lợi</span><select value={adminForm.benefit_type} onChange={e=>setAdminForm({...adminForm,benefit_type:e.target.value})}><option value="percent">Giảm phần trăm</option><option value="amount">Giảm tiền cố định</option><option value="other">Quyền lợi khác</option></select></label><label><span>Tên quyền lợi *</span><input required value={adminForm.benefit_title} onChange={e=>setAdminForm({...adminForm,benefit_title:e.target.value})} placeholder="Ví dụ: Giảm 20% vé xem phim"/></label>{adminForm.benefit_type!=='other'&&<label><span>Giá trị giảm *</span><input type="number" min="1" max={adminForm.benefit_type==='percent'?100:undefined} required value={adminForm.discount_value} onChange={e=>setAdminForm({...adminForm,discount_value:Number(e.target.value)})}/></label>}<label><span>Đối tượng</span><select value={adminForm.audience} onChange={e=>setAdminForm({...adminForm,audience:e.target.value})}><option value="all">Mọi khách hàng</option><option value="member">Thành viên Aurora</option><option value="silver">Hạng Silver</option><option value="gold">Hạng Gold</option><option value="platinum">Hạng Platinum</option></select></label><label><span>Ngày bắt đầu *</span><VietnameseDateInput required value={adminForm.start_date} onChange={value=>setAdminForm({...adminForm,start_date:value,assignments:adminForm.assignments.map((item:any)=>({...item,due_date:item.due_date||value}))})}/></label><label><span>Ngày kết thúc *</span><VietnameseDateInput required value={adminForm.end_date} onChange={value=>setAdminForm({...adminForm,end_date:value})}/></label></div></section>
        <section><div className="promo-section-title"><Users/><div><h3>3. Phân công thực hiện</h3><p>Chọn đơn vị nhận kế hoạch và mô tả rõ trách nhiệm bàn giao.</p></div></div><div className="admin-recipient-grid">{adminRecipientOptions.map(([role,label,description])=>{const assignment=adminForm.assignments.find((item:any)=>item.recipient_role===role);return <article key={role} className={assignment?'selected':''}><button type="button" onClick={()=>toggleRecipient(role)}><span>{assignment?<CheckCircle2/>:<Users/>}</span><div><b>{label}</b><small>{description}</small></div></button>{assignment&&<div className="admin-assignment-fields">{role==='cinema_admin'&&<label><span>Phạm vi rạp</span><select value={assignment.theater_id||0} onChange={e=>updateAssignment(role,'theater_id',Number(e.target.value))}><option value="0">Toàn bộ hệ thống rạp</option>{theaters.map(theater=><option key={theater.id} value={theater.id}>{theater.name}</option>)}</select></label>}<label><span>Hạn hoàn thành</span><VietnameseDateInput value={assignment.due_date||adminForm.start_date} onChange={value=>updateAssignment(role,'due_date',value)}/></label><label className="wide"><span>Nhiệm vụ cụ thể *</span><textarea required value={assignment.responsibility} onChange={e=>updateAssignment(role,'responsibility',e.target.value)}/></label></div>}</article>})}</div><label className="admin-coordination-note"><span>Ghi chú điều phối chung</span><textarea value={adminForm.coordination_note} onChange={e=>setAdminForm({...adminForm,coordination_note:e.target.value})} placeholder="Mốc báo cáo, đầu mối phối hợp, yêu cầu nghiệm thu…"/></label></section>
      </div><footer><div><ShieldCheck/><span>Lưu trực tiếp vào aurora_db và ghi lịch sử điều phối</span></div><button type="button" onClick={()=>setEditing(false)}>Hủy</button><button className="primary" disabled={saving||!adminForm.assignments.length}><Send/>{saving?'Đang gửi…':'Tạo & giao kế hoạch'}</button></footer>
    </form></div>}
  </div>;
}
