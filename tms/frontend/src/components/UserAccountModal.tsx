import type { FormEvent } from 'react';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, LoaderCircle, Mail, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import './UserAccountModal.css';

export type UserRole = 'cinema_admin'|'supervisor'|'accounting'|'marketing_manager'|'manager';
export type UserAccountForm = { id:number; system:'tms'|'ems'; username:string; full_name:string; phone:string; email:string; theater_id:number; department:string; role:UserRole; password:string; status:string };
type RoleView = { name:string; emoji:string; color:string; bg:string; borderColor:string; tagline:string; description:string };
type TheaterView = { id:number; name:string; city?:string };
type Props = { form:UserAccountForm; setForm:(value:UserAccountForm)=>void; roles:Record<string,RoleView>; theaters:TheaterView[]; saving:boolean; error:string; showPassword:boolean; onTogglePassword:()=>void; onClose:()=>void; onSubmit:(event:FormEvent)=>void };

const FIELD_ICONS = { username:UserRound, full_name:UserRound, email:Mail, phone:Phone };

export default function UserAccountModal({form,setForm,roles,theaters,saving,error,showPassword,onTogglePassword,onClose,onSubmit}:Props){
  const role=form.system==='ems'?{name:'Quản lý nhân sự',emoji:'🪪',color:'#b86600',bg:'#fff5df',borderColor:'#e9b85f',tagline:'Quản trị nhân sự, đào tạo và vận hành EMS',description:'Tài khoản quản lý nhân sự trong hệ thống EMS.'}:roles[form.role];
  const needsTheater=form.role==='cinema_admin'||form.role==='supervisor';
  const theater=theaters.find(item=>Number(item.id)===Number(form.theater_id));
  const passwordScore=Math.min(4,[form.password.length>=6,/[A-Z]/.test(form.password),/[0-9]/.test(form.password),/[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length);
  const update=<K extends keyof UserAccountForm>(key:K,value:UserAccountForm[K])=>setForm({...form,[key]:value});
  return <div className="uam-overlay" onMouseDown={event=>{if(event.currentTarget===event.target&&!saving)onClose();}}>
    <div className="uam-dialog" role="dialog" aria-modal="true" aria-labelledby="uam-title">
      <header className="uam-header"><div><h2 id="uam-title">{form.id?`Cập nhật tài khoản ${form.system.toUpperCase()}`:'Cấp tài khoản quản trị mới'}</h2><p>{form.id?'Điều chỉnh hồ sơ, phạm vi và trạng thái truy cập.':'Chỉ cấp tài khoản vận hành TMS hoặc Quản lý nhân sự EMS.'}</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Đóng"><X size={18}/></button></header>
      <form onSubmit={onSubmit}>
        <div className="uam-body">
          <aside className="uam-profile">
            <div className="uam-avatar" style={{background:role.bg,color:role.color,borderColor:role.borderColor}}>{role.emoji}</div>
            <span className="uam-profile-label">HỒ SƠ QUYỀN TRUY CẬP</span>
            <h3>{form.full_name.trim()||'Nhân sự mới'}</h3><p>{form.email.trim()||'Chưa nhập email công việc'}</p>
            <div className="uam-role" style={{background:role.bg,borderColor:role.borderColor}}><ShieldCheck size={17} style={{color:role.color}}/><div><b style={{color:role.color}}>{role.name}</b><small>{role.tagline}</small></div></div>
            <dl><div><dt>Hệ thống</dt><dd>{form.system.toUpperCase()}</dd></div><div><dt>Phạm vi</dt><dd>{form.system==='ems'?(form.department||'Chưa chọn phòng ban'):needsTheater?(theater?.name||'Chưa chọn rạp'):'Toàn hệ thống'}</dd></div><div><dt>Trạng thái</dt><dd className={form.status==='active'?'active':'restricted'}>{form.status==='active'?'Cho phép đăng nhập':form.status==='locked'?'Tạm khóa':form.status==='leave'?'Nghỉ phép':'Ngừng hoạt động'}</dd></div><div><dt>Mã định danh</dt><dd>{form.id?`${form.system.toUpperCase()}-${String(form.id).padStart(5,'0')}`:'Tạo tự động khi lưu'}</dd></div></dl>
          </aside>
          <main className="uam-content">
            {error&&<div className="uam-error"><AlertCircle size={17}/><div><b>Chưa thể lưu tài khoản</b><span>{error}</span></div></div>}
            <section><div className="uam-section-heading"><span>01</span><div><b>Thông tin định danh</b><small>Dữ liệu dùng để nhận diện và liên hệ nhân sự.</small></div></div><div className="uam-grid">
              {(['username','full_name','email','phone'] as const).map(key=>{const Icon=FIELD_ICONS[key];const meta={username:[form.system==='ems'?'Mã nhân sự EMS':'Tên đăng nhập',form.system==='ems'?'AR-MGR-001':'nguyen.an'],full_name:['Họ và tên nhân sự','Nguyễn Văn An'],email:['Email công việc','nhansu@auroracinema.vn'],phone:['Số điện thoại','0901 234 567']}[key];return <label key={key} className="uam-field"><span>{meta[0]} {key!=='phone'&&<em>*</em>}</span><div><Icon size={15}/><input type={key==='email'?'email':key==='phone'?'tel':'text'} value={form[key]} onChange={e=>update(key,key==='username'?(form.system==='ems'?e.target.value.toUpperCase():e.target.value).replace(/\s/g,''):e.target.value)} placeholder={meta[1]} required={key!=='phone'} disabled={key==='username'&&form.id>0}/></div>{key==='username'&&<small>{form.id?'Mã đăng nhập không thể thay đổi.':'3–60 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.'}</small>}</label>;})}
            </div></section>
            <section><div className="uam-section-heading"><span>02</span><div><b>Hệ thống, vai trò & phạm vi</b><small>POS và Customer là tài khoản cố định, không cấp tại đây.</small></div></div><div className="uam-grid">
              <label className="uam-field"><span>Hệ thống quản trị <em>*</em></span><select value={form.system} disabled={form.id>0} onChange={e=>{const system=e.target.value as 'tms'|'ems';setForm({...form,system,username:'',role:system==='ems'?'manager':'cinema_admin',theater_id:0,department:system==='ems'?'Quản lý Đào tạo & Nhân sự':'',status:'active'});}}><option value="tms">TMS · Quản trị vận hành rạp</option><option value="ems">EMS · Quản lý nhân sự</option></select></label>
              <label className="uam-field"><span>Vai trò hệ thống <em>*</em></span><select value={form.role} onChange={e=>{const next=e.target.value as UserRole;setForm({...form,role:next,theater_id:next==='cinema_admin'||next==='supervisor'?form.theater_id:0});}}>{form.system==='ems'?<option value="manager">Quản lý nhân sự · EMS</option>:<><option value="cinema_admin">Admin Rạp · Quản lý một rạp</option><option value="supervisor">Supervisor · Giám sát rạp</option><option value="accounting">Kế toán · Tài chính & đối soát</option><option value="marketing_manager">Marketing · Toàn hệ thống</option></>}</select></label>
              {form.system==='ems'?<label className="uam-field uam-field-wide"><span>Phòng ban EMS <em>*</em></span><input value={form.department} onChange={e=>update('department',e.target.value)} placeholder="Quản lý Đào tạo & Nhân sự" required/></label>:<label className="uam-field uam-field-wide"><span>Rạp phụ trách {needsTheater&&<em>*</em>}</span><select value={form.theater_id} onChange={e=>update('theater_id',Number(e.target.value))} disabled={!needsTheater} required={needsTheater}><option value={0}>{needsTheater?'Chọn rạp phụ trách':'Áp dụng toàn hệ thống'}</option>{theaters.map(item=><option key={item.id} value={item.id}>{item.name}{item.city?` · ${item.city}`:''}</option>)}</select></label>}
              <label className="uam-field"><span>{form.id?'Mật khẩu mới':'Mật khẩu khởi tạo'} {!form.id&&<em>*</em>}</span><div className="uam-password"><KeyRound size={15}/><input type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} placeholder={form.id?'Để trống nếu không thay đổi':'Tối thiểu 6 ký tự'} required={!form.id} minLength={form.password?6:undefined}/><button type="button" onClick={onTogglePassword} aria-label={showPassword?'Ẩn mật khẩu':'Hiện mật khẩu'}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{form.password&&<div className={`uam-strength score-${passwordScore}`}><i/><i/><i/><i/><small>{passwordScore<=1?'Yếu':passwordScore<=2?'Trung bình':'Tốt'}</small></div>}</label>
              <label className="uam-field"><span>Trạng thái truy cập</span><select value={form.status} onChange={e=>update('status',e.target.value)}><option value="active">Hoạt động · Cho phép đăng nhập</option>{form.system==='ems'&&<option value="leave">Đang nghỉ phép</option>}<option value="inactive">Ngừng hoạt động</option>{form.system==='tms'&&<option value="locked">Tạm khóa truy cập</option>}</select></label>
            </div></section>
          </main>
        </div>
        <footer className="uam-footer"><aside><button type="button" onClick={onClose} disabled={saving}>Hủy bỏ</button><button type="submit" className="primary" disabled={saving}>{saving?<><LoaderCircle className="uam-spin" size={16}/>Đang ghi dữ liệu...</>:<><Check size={16}/>{form.id?'Lưu thay đổi':'Tạo & cấp quyền'}</>}</button></aside></footer>
      </form>
    </div>
  </div>;
}
