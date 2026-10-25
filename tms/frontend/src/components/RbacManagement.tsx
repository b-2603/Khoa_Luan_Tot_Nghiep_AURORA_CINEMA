import { useMemo, useState } from 'react';
import { Check, ChevronRight, Eye, FileDown, LockKeyhole, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2, UserCog, X } from 'lucide-react';
import './RbacManagement.css';

export type PermissionAction='view'|'create'|'update'|'delete'|'approve'|'export';
export type PermissionActions=Record<PermissionAction,boolean>;
export type RbacRole='super_admin'|'cinema_admin'|'supervisor'|'accounting'|'marketing_manager';
export type RbacGrant={level:'full'|'manage'|'view'|'none';note:string;actions:PermissionActions;updated_at?:string};
export type RbacModule={key:string;module:string;sort_order:number;permissions:Record<RbacRole,RbacGrant>};
type Props={matrix:RbacModule[];loading:boolean;saving:boolean;editing:boolean;onEdit:()=>void;onCancel:()=>void;onRefresh:()=>void;onSave:()=>void;onActions:(moduleKey:string,role:RbacRole,actions:PermissionActions)=>void;onNote:(moduleKey:string,role:RbacRole,note:string)=>void};

const ROLES:Record<RbacRole,{name:string;description:string;icon:string;color:string}>={
  super_admin:{name:'Admin Tổng',description:'Quyền khôi phục và quản trị toàn hệ thống',icon:'👑',color:'#d97706'},
  cinema_admin:{name:'Admin Rạp',description:'Quản lý nghiệp vụ trong phạm vi rạp',icon:'🏢',color:'#2563eb'},
  supervisor:{name:'Supervisor',description:'Giám sát ca trực và vận hành tại rạp',icon:'🛡️',color:'#059669'},
  accounting:{name:'Kế toán',description:'Tài chính, đối soát và báo cáo',icon:'📊',color:'#7c3aed'},
  marketing_manager:{name:'Marketing',description:'Phim, chiến dịch và khách hàng',icon:'📣',color:'#be185d'},
};
const ACTIONS:Array<{key:PermissionAction;label:string;description:string;icon:typeof Eye}>=[
  {key:'view',label:'Xem',description:'Mở và tra cứu dữ liệu',icon:Eye},{key:'create',label:'Tạo mới',description:'Thêm bản ghi mới',icon:Plus},{key:'update',label:'Chỉnh sửa',description:'Thay đổi dữ liệu',icon:Pencil},{key:'delete',label:'Xóa',description:'Xóa bản ghi',icon:Trash2},{key:'approve',label:'Phê duyệt',description:'Duyệt nghiệp vụ',icon:Check},{key:'export',label:'Xuất dữ liệu',description:'Excel, PDF, báo cáo',icon:FileDown},
];
const EMPTY:PermissionActions={view:false,create:false,update:false,delete:false,approve:false,export:false};
const PRESETS:Array<{label:string;value:PermissionActions}>=[{label:'Không truy cập',value:{...EMPTY}},{label:'Chỉ xem',value:{...EMPTY,view:true}},{label:'Vận hành',value:{view:true,create:true,update:true,delete:false,approve:true,export:true}},{label:'Toàn quyền',value:{view:true,create:true,update:true,delete:true,approve:true,export:true}}];
const levelOf=(a:PermissionActions)=>!a.view?'none':Object.values(a).every(Boolean)?'full':a.create||a.update||a.delete||a.approve?'manage':'view';
const levelLabel=(level:string)=>level==='full'?'Toàn quyền':level==='manage'?'Được vận hành':level==='view'?'Chỉ xem':'Không truy cập';

export default function RbacManagement({matrix,loading,saving,editing,onEdit,onCancel,onRefresh,onSave,onActions,onNote}:Props){
  const [role,setRole]=useState<RbacRole>('cinema_admin');const [query,setQuery]=useState('');
  const rows=useMemo(()=>matrix.filter(item=>`${item.module} ${item.key}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))),[matrix,query]);
  const grants=matrix.map(item=>item.permissions[role]).filter(Boolean);const accessible=grants.filter(g=>g.actions?.view).length;const enabledActions=grants.reduce((sum,g)=>sum+Object.values(g.actions||EMPTY).filter(Boolean).length,0);const locked=role==='super_admin';
  const setAction=(module:RbacModule,key:PermissionAction,value:boolean)=>{const current=module.permissions[role]?.actions||EMPTY;const next={...current,[key]:value};if(key!=='view'&&value)next.view=true;if(key==='view'&&!value){Object.keys(next).forEach(action=>next[action as PermissionAction]=false);}onActions(module.key,role,next);};
  return <div className="rbac-center">
    <header className="rbac-center-head"><div><span><ShieldCheck size={14}/>PHÂN QUYỀN THEO CHỨC NĂNG</span><h2>Chính sách truy cập TMS</h2><p>Chọn vai trò, sau đó bật đúng hành động được phép thực hiện trong từng phân hệ.</p></div><aside>{editing?<><button onClick={onCancel} disabled={saving}><X size={15}/>Hủy thay đổi</button><button className="primary" onClick={onSave} disabled={saving}><Save size={15}/>{saving?'Đang lưu...':'Lưu & áp dụng'}</button></>:<><button onClick={onRefresh}><RefreshCw size={15}/>Đồng bộ</button><button className="primary" onClick={onEdit}><Pencil size={15}/>Chỉnh sửa quyền</button></>}</aside></header>
    <section className="rbac-role-list">{(Object.keys(ROLES) as RbacRole[]).map(key=>{const item=ROLES[key],count=matrix.filter(m=>m.permissions[key]?.actions?.view).length;return <button key={key} className={role===key?'active':''} style={{'--role-color':item.color} as React.CSSProperties} onClick={()=>setRole(key)}><span>{item.icon}</span><div><b>{item.name}</b><small>{item.description}</small></div><em>{count}/{matrix.length}<ChevronRight size={13}/></em></button>;})}</section>
    <section className="rbac-role-summary"><div className="rbac-role-title"><span style={{background:`${ROLES[role].color}18`,color:ROLES[role].color}}>{ROLES[role].icon}</span><div><small>ĐANG CẤU HÌNH</small><h3>{ROLES[role].name}</h3><p>{ROLES[role].description}</p></div></div><div className="rbac-role-metrics"><span><b>{accessible}</b><small>Phân hệ có thể mở</small></span><span><b>{enabledActions}</b><small>Hành động được cấp</small></span><span><b>{matrix.length-accessible}</b><small>Phân hệ bị chặn</small></span></div>{locked&&<div className="rbac-root-lock"><LockKeyhole size={16}/><span>Quyền Admin Tổng được khóa để bảo đảm khả năng khôi phục hệ thống.</span></div>}</section>
    <section className="rbac-module-panel"><div className="rbac-module-toolbar"><label><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm phân hệ hoặc mã chức năng..."/></label><span>{rows.length} phân hệ</span></div>
      {loading?<div className="rbac-module-loading">Đang tải chính sách từ aurora_db...</div>:<div className="rbac-module-grid">{rows.map(module=>{const grant=module.permissions[role];const actions=grant?.actions||EMPTY;const level=levelOf(actions);return <article key={module.key} className={`rbac-module-card ${level}`}><header><span><UserCog size={17}/></span><div><b>{module.module}</b><small>{module.key}</small></div><em>{levelLabel(level)}</em></header>{editing&&!locked&&<div className="rbac-presets">{PRESETS.map(preset=><button key={preset.label} onClick={()=>onActions(module.key,role,{...preset.value})}>{preset.label}</button>)}</div>}<div className="rbac-action-grid">{ACTIONS.map(action=>{const Icon=action.icon;const checked=Boolean(actions[action.key]);return <label key={action.key} className={checked?'checked':''}><input type="checkbox" checked={checked} disabled={!editing||locked} onChange={e=>setAction(module,action.key,e.target.checked)}/><span><Icon size={15}/></span><div><b>{action.label}</b><small>{action.description}</small></div><i><Check size={11}/></i></label>;})}</div><label className="rbac-note"><span>Phạm vi / ghi chú nghiệp vụ</span>{editing&&!locked?<textarea value={grant?.note||''} maxLength={255} onChange={e=>onNote(module.key,role,e.target.value)} placeholder="Ví dụ: Chỉ dữ liệu của rạp được phân công"/>:<p>{grant?.note||'Không có ghi chú bổ sung.'}</p>}</label></article>;})}</div>}
    </section>
  </div>;
}
