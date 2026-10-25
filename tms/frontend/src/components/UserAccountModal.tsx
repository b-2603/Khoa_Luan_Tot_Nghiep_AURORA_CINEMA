import type { FormEvent } from 'react';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, LoaderCircle, Mail, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import './UserAccountModal.css';

export type UserRole = 'super_admin'|'cinema_admin'|'supervisor'|'accounting'|'marketing_manager';
export type UserAccountForm = { id:number; username:string; full_name:string; phone:string; email:string; theater_id:number; role:UserRole; password:string; status:string };
type RoleView = { name:string; emoji:string; color:string; bg:string; borderColor:string; tagline:string; description:string };
type TheaterView = { id:number; name:string; city?:string };
type Props = { form:UserAccountForm; setForm:(value:UserAccountForm)=>void; roles:Record<UserRole,RoleView>; theaters:TheaterView[]; saving:boolean; error:string; showPassword:boolean; onTogglePassword:()=>void; onClose:()=>void; onSubmit:(event:FormEvent)=>void };

const FIELD_ICONS = { username:UserRound, full_name:UserRound, email:Mail, phone:Phone };

export default function UserAccountModal({form,setForm,roles,theaters,saving,error,showPassword,onTogglePassword,onClose,onSubmit}:Props){
  const role=roles[form.role];
  const needsTheater=form.role==='cinema_admin'||form.role==='supervisor';
  const theater=theaters.find(item=>Number(item.id)===Number(form.theater_id));
  const passwordScore=Math.min(4,[form.password.length>=6,/[A-Z]/.test(form.password),/[0-9]/.test(form.password),/[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length);
  const update=<K extends keyof UserAccountForm>(key:K,value:UserAccountForm[K])=>setForm({...form,[key]:value});
  return <div className="uam-overlay" onMouseDown={event=>{if(event.currentTarget===event.target&&!saving)onClose();}}>
    <div className="uam-dialog" role="dialog" aria-modal="true" aria-labelledby="uam-title">
      <header className="uam-header"><div><h2 id="uam-title">{form.id?'Cập nhật tài khoản TMS':'Cấp tài khoản vận hành mới'}</h2><p>{form.id?'Điều chỉnh hồ sơ, phạm vi và trạng thái truy cập.':'Tạo danh tính nội bộ và gán quyền truy cập theo nguyên tắc tối thiểu.'}</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Đóng"><X size={18}/></button></header>
      <form onSubmit={onSubmit}>
        <div className="uam-body">
          <aside className="uam-profile">
            <div className="uam-avatar" style={{background:role.bg,color:role.color,borderColor:role.borderColor}}>{role.emoji}</div>
            <span className="uam-profile-label">HỒ SƠ QUYỀN TRUY CẬP</span>
            <h3>{form.full_name.trim()||'Nhân sự mới'}</h3><p>{form.email.trim()||'Chưa nhập email công việc'}</p>
            <div className="uam-role" style={{background:role.bg,borderColor:role.borderColor}}><ShieldCheck size={17} style={{color:role.color}}/><div><b style={{color:role.color}}>{role.name}</b><small>{role.tagline}</small></div></div>
            <dl><div><dt>Phạm vi</dt><dd>{needsTheater?(theater?.name||'Chưa chọn rạp'):'Toàn hệ thống'}</dd></div><div><dt>Trạng thái</dt><dd className={form.status==='active'?'active':'restricted'}>{form.status==='active'?'Cho phép đăng nhập':form.status==='locked'?'Tạm khóa':'Ngừng hoạt động'}</dd></div><div><dt>Mã định danh</dt><dd>{form.id?`TMS-${String(form.id).padStart(5,'0')}`:'Tạo tự động khi lưu'}</dd></div></dl>
          </aside>
          <main className="uam-content">
            {error&&<div className="uam-error"><AlertCircle size={17}/><div><b>Chưa thể lưu tài khoản</b><span>{error}</span></div></div>}
            <section><div className="uam-section-heading"><span>01</span><div><b>Thông tin định danh</b><small>Dữ liệu dùng để nhận diện và liên hệ nhân sự.</small></div></div><div className="uam-grid">
              {(['username','full_name','email','phone'] as const).map(key=>{const Icon=FIELD_ICONS[key];const meta={username:['Tên đăng nhập','nguyen.an'],full_name:['Họ và tên nhân sự','Nguyễn Văn An'],email:['Email công việc','nhansu@auroracinema.vn'],phone:['Số điện thoại','0901 234 567']}[key];return <label key={key} className="uam-field"><span>{meta[0]} {key!=='phone'&&<em>*</em>}</span><div><Icon size={15}/><input type={key==='email'?'email':key==='phone'?'tel':'text'} value={form[key]} onChange={e=>update(key,key==='username'?e.target.value.replace(/\s/g,''):e.target.value)} placeholder={meta[1]} required={key!=='phone'} disabled={key==='username'&&form.id>0}/></div>{key==='username'&&<small>{form.id?'Tên đăng nhập không thể thay đổi.':'3–60 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.'}</small>}</label>;})}
            </div></section>
            <section><div className="uam-section-heading"><span>02</span><div><b>Vai trò & phạm vi</b></div></div><div className="uam-grid">
              <label className="uam-field"><span>Vai trò hệ thống <em>*</em></span><select value={form.role} onChange={e=>{const next=e.target.value as UserRole;setForm({...form,role:next,theater_id:next==='cinema_admin'||next==='supervisor'?form.theater_id:0});}}><option value="super_admin">Admin Tổng · Toàn hệ thống</option><option value="cinema_admin">Admin Rạp · Quản lý một rạp</option><option value="supervisor">Supervisor · Giám sát rạp</option><option value="accounting">Kế toán · Tài chính & đối soát</option><option value="marketing_manager">Marketing · Toàn hệ thống</option></select></label>
              <label className="uam-field"><span>Rạp phụ trách {needsTheater&&<em>*</em>}</span><select value={form.theater_id} onChange={e=>update('theater_id',Number(e.target.value))} disabled={!needsTheater} required={needsTheater}><option value={0}>{needsTheater?'Chọn rạp phụ trách':'Áp dụng toàn hệ thống'}</option>{theaters.map(item=><option key={item.id} value={item.id}>{item.name}{item.city?` · ${item.city}`:''}</option>)}</select></label>
              <label className="uam-field"><span>{form.id?'Mật khẩu mới':'Mật khẩu khởi tạo'} {!form.id&&<em>*</em>}</span><div className="uam-password"><KeyRound size={15}/><input type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} placeholder={form.id?'Để trống nếu không thay đổi':'Tối thiểu 6 ký tự'} required={!form.id} minLength={form.password?6:undefined}/><button type="button" onClick={onTogglePassword} aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{form.password&&<div className={`uam-strength score-${passwordScore}`}><i/><i/><i/><i/><small>{passwordScore<=1?'Yếu':passwordScore<=2?'Trung bình':'Tốt'}</small></div>}</label>
              <label className="uam-field"><span>Trạng thái truy cập</span><select value={form.status} onChange={e=>update('status',e.target.value)}><option value="active">Hoạt động · Cho phép đăng nhập</option><option value="inactive">Ngừng hoạt động</option><option value="locked">Tạm khóa truy cập</option></select></label>
            </div></section>
          </main>
        </div>
        <footer className="uam-footer"><aside><button type="button" onClick={onClose} disabled={saving}>Hủy bỏ</button><button type="submit" className="primary" disabled={saving}>{saving?<><LoaderCircle className="uam-spin" size={16}/>Đang ghi dữ liệu...</>:<><Check size={16}/>{form.id?'Lưu thay đổi':'Tạo & cấp quyền'}</>}</button></aside></footer>
      </form>
    </div>
  </div>;
}
