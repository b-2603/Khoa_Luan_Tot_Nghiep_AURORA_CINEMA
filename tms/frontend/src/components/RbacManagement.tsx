import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Check, CheckSquare2, ChevronDown, ChevronLeft, ChevronRight, Eye, FileDown, KeyRound, LockKeyhole, MessageSquareText, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, ShieldCheck, SlidersHorizontal, Trash2, UserCog, Users, X } from 'lucide-react';
import './RbacManagement.css';

export type PermissionAction = 'view'|'create'|'update'|'delete'|'approve'|'export';
export type PermissionActions = Record<PermissionAction,boolean>;
export type RbacRole = 'super_admin'|'cinema_admin'|'supervisor'|'accounting'|'marketing_manager';
export type RbacGrant = {level:'full'|'manage'|'view'|'none';note:string;actions:PermissionActions;updated_at?:string};
export type RbacModule = {key:string;module:string;sort_order:number;permissions:Record<RbacRole,RbacGrant>};
export type RbacAccount = {id:number;username:string;full_name:string;email?:string;phone?:string;role:RbacRole;status:string;theater_id?:number;theater_name?:string;override_count:number};
type AccountPermission = {key:string;module:string;sort_order:number;customized:boolean;actions:PermissionActions;inherited_actions:PermissionActions;note:string;updated_at?:string};
type FilterMode = 'all'|'enabled'|'blocked'|'customized';
type Props = {matrix:RbacModule[];accounts:RbacAccount[];apiBase:string;loading:boolean;saving:boolean;editing:boolean;onEdit:()=>void;onCancel:()=>void;onRefresh:()=>void;onSave:()=>void;onActions:(moduleKey:string,role:RbacRole,actions:PermissionActions)=>void;onNote:(moduleKey:string,role:RbacRole,note:string)=>void;notify:(message:string)=>void};

const ROLES:Record<RbacRole,{name:string;description:string;icon:string;color:string}> = {
  super_admin:{name:'Admin Tổng',description:'Quyền khôi phục và quản trị toàn hệ thống',icon:'👑',color:'#d97706'},
  cinema_admin:{name:'Admin Rạp',description:'Quản lý nghiệp vụ trong phạm vi rạp',icon:'🏢',color:'#2563eb'},
  supervisor:{name:'Supervisor',description:'Giám sát ca trực và vận hành tại rạp',icon:'🛡️',color:'#059669'},
  accounting:{name:'Kế toán',description:'Tài chính, đối soát và báo cáo',icon:'📊',color:'#7c3aed'},
  marketing_manager:{name:'Marketing',description:'Phim, chiến dịch và khách hàng',icon:'📣',color:'#be185d'},
};
const ACTIONS:Array<{key:PermissionAction;label:string;short:string;description:string;icon:typeof Eye}> = [
  {key:'view',label:'Xem',short:'Xem',description:'Mở và tra cứu dữ liệu',icon:Eye},
  {key:'create',label:'Tạo mới',short:'Tạo',description:'Thêm bản ghi mới',icon:Plus},
  {key:'update',label:'Chỉnh sửa',short:'Sửa',description:'Thay đổi dữ liệu',icon:Pencil},
  {key:'delete',label:'Xóa',short:'Xóa',description:'Xóa bản ghi',icon:Trash2},
  {key:'approve',label:'Phê duyệt',short:'Duyệt',description:'Duyệt nghiệp vụ',icon:Check},
  {key:'export',label:'Xuất dữ liệu',short:'Xuất',description:'Excel, PDF, báo cáo',icon:FileDown},
];
const EMPTY:PermissionActions = {view:false,create:false,update:false,delete:false,approve:false,export:false};
const PRESETS = [
  {key:'none',label:'Chặn truy cập',value:{...EMPTY}},
  {key:'view',label:'Chỉ xem',value:{...EMPTY,view:true}},
  {key:'operate',label:'Vận hành',value:{view:true,create:true,update:true,delete:false,approve:true,export:true}},
  {key:'full',label:'Toàn quyền',value:{view:true,create:true,update:true,delete:true,approve:true,export:true}},
] as Array<{key:string;label:string;value:PermissionActions}>;
const PAGE_SIZE = 8;
const levelOf = (a:PermissionActions) => !a.view?'none':Object.values(a).every(Boolean)?'full':a.create||a.update||a.delete||a.approve?'manage':'view';
const levelLabel = (level:string) => level==='full'?'Toàn quyền':level==='manage'?'Vận hành':level==='view'?'Chỉ xem':'Đã chặn';

export default function RbacManagement(props:Props) {
  const {matrix,accounts,apiBase,loading,saving,editing,onEdit,onCancel,onRefresh,onSave,onActions,onNote,notify} = props;
  const [mode,setMode] = useState<'role'|'account'>('role');
  const [role,setRole] = useState<RbacRole>('cinema_admin');
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState<FilterMode>('all');
  const [page,setPage] = useState(1);
  const [selectedKeys,setSelectedKeys] = useState<string[]>([]);
  const [expandedKey,setExpandedKey] = useState('');
  const selectableAccounts = useMemo(()=>accounts.filter(a=>a.role!=='super_admin'),[accounts]);
  const [accountId,setAccountId] = useState(0);
  const [accountItems,setAccountItems] = useState<AccountPermission[]>([]);
  const [accountLoading,setAccountLoading] = useState(false);
  const [accountEditing,setAccountEditing] = useState(false);
  const [accountSaving,setAccountSaving] = useState(false);
  const [accountError,setAccountError] = useState('');

  useEffect(()=>{if(mode==='account'&&!accountId&&selectableAccounts.length)setAccountId(selectableAccounts[0].id);},[mode,accountId,selectableAccounts]);
  const loadAccount = async(id=accountId) => {
    if(!id)return;
    setAccountLoading(true);setAccountError('');
    try {
      const response=await fetch(`${apiBase}?action=account-permissions&user_id=${id}`,{credentials:'include',cache:'no-store'});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||'Không thể tải quyền tài khoản.');
      setAccountItems(result.data.items||[]);
    } catch(error) {setAccountError(error instanceof Error?error.message:'Không thể tải quyền tài khoản.');}
    finally {setAccountLoading(false);}
  };
  useEffect(()=>{if(mode==='account'&&accountId){setAccountEditing(false);void loadAccount(accountId);}},[mode,accountId]);
  useEffect(()=>{setPage(1);setSelectedKeys([]);setExpandedKey('');},[mode,role,accountId,query,filter]);

  const selectedAccount=selectableAccounts.find(a=>a.id===accountId);
  const allItems:(RbacModule|AccountPermission)[] = mode==='role'?matrix:accountItems;
  const actionsOf=(item:RbacModule|AccountPermission)=>mode==='role'?((item as RbacModule).permissions[role]?.actions||EMPTY):(item as AccountPermission).actions;
  const filteredRows=useMemo(()=>{
    const keyword=query.trim().toLocaleLowerCase('vi');
    return allItems.filter(item=>{
      const actions=actionsOf(item);
      const matchesText=`${item.module} ${item.key}`.toLocaleLowerCase('vi').includes(keyword);
      const matchesFilter=filter==='all'||(filter==='enabled'&&actions.view)||(filter==='blocked'&&!actions.view)||(filter==='customized'&&mode==='account'&&(item as AccountPermission).customized);
      return matchesText&&matchesFilter;
    });
  },[matrix,accountItems,mode,role,query,filter]);
  const totalPages=Math.max(1,Math.ceil(filteredRows.length/PAGE_SIZE));
  const pageRows=filteredRows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  useEffect(()=>{if(page>totalPages)setPage(totalPages);},[page,totalPages]);
  const grants=mode==='role'?matrix.map(m=>m.permissions[role]).filter(Boolean):accountItems.map(item=>({actions:item.actions} as RbacGrant));
  const accessible=grants.filter(g=>g.actions?.view).length;
  const enabledActions=grants.reduce((sum,g)=>sum+Object.values(g.actions||EMPTY).filter(Boolean).length,0);
  const customized=accountItems.filter(item=>item.customized).length;
  const locked=mode==='role'&&role==='super_admin';
  const isEditing=mode==='role'?editing:accountEditing;
  const isSaving=mode==='role'?saving:accountSaving;
  const allPageSelected=pageRows.length>0&&pageRows.every(item=>selectedKeys.includes(item.key));

  const setRoleAction=(module:RbacModule,key:PermissionAction,value:boolean)=>{
    const next={...(module.permissions[role]?.actions||EMPTY),[key]:value};
    if(key!=='view'&&value)next.view=true;
    if(key==='view'&&!value)Object.keys(next).forEach(action=>next[action as PermissionAction]=false);
    onActions(module.key,role,next);
  };
  const updateAccount=(key:string,patch:Partial<AccountPermission>)=>setAccountItems(previous=>previous.map(item=>item.key===key?{...item,...patch}:item));
  const setAccountAction=(item:AccountPermission,key:PermissionAction,value:boolean)=>{
    const next={...item.actions,[key]:value};
    if(key!=='view'&&value)next.view=true;
    if(key==='view'&&!value)Object.keys(next).forEach(action=>next[action as PermissionAction]=false);
    updateAccount(item.key,{customized:true,actions:next});
  };
  const inheritAccount=(item:AccountPermission)=>updateAccount(item.key,{customized:false,actions:{...item.inherited_actions},note:''});
  const applyPreset=(item:RbacModule|AccountPermission,value:PermissionActions)=>mode==='role'?onActions(item.key,role,{...value}):updateAccount(item.key,{customized:true,actions:{...value}});
  const applyBulkPreset=(value:PermissionActions)=>selectedKeys.forEach(key=>{const item=allItems.find(row=>row.key===key);if(item)applyPreset(item,value);});
  const inheritBulk=()=>selectedKeys.forEach(key=>{const item=accountItems.find(row=>row.key===key);if(item)inheritAccount(item);});
  const togglePageSelection=()=>{const visible=pageRows.map(item=>item.key);setSelectedKeys(current=>allPageSelected?current.filter(key=>!visible.includes(key)):[...new Set([...current,...visible])]);};
  const toggleSelection=(key:string)=>setSelectedKeys(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
  const saveAccount=async()=>{
    if(!accountId)return;
    setAccountSaving(true);
    try {
      const response=await fetch(`${apiBase}?action=account-permissions`,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:accountId,items:accountItems})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||'Không thể lưu quyền tài khoản.');
      setAccountEditing(false);notify(result.message);await loadAccount(accountId);onRefresh();
    } catch(error) {notify(error instanceof Error?error.message:'Không thể lưu quyền tài khoản.');}
    finally {setAccountSaving(false);}
  };
  const cancel=()=>{if(mode==='role')onCancel();else{setAccountEditing(false);void loadAccount(accountId);}};
  const save=()=>mode==='role'?onSave():void saveAccount();
  const refresh=()=>mode==='role'?onRefresh():void loadAccount(accountId);

  return <div className="rbac-center">
    <header className="rbac-center-head"><div><span><ShieldCheck size={15}/>TRUNG TÂM PHÂN QUYỀN AURORA</span><h2>Quản trị quyền truy cập</h2><p>Tra cứu nhanh, chỉnh sửa trực tiếp và áp dụng hàng loạt mà không cần cuộn qua từng thẻ.</p><nav><button className={mode==='role'?'active':''} onClick={()=>setMode('role')}><Users/>Theo vai trò</button><button className={mode==='account'?'active':''} onClick={()=>setMode('account')}><UserCog/>Theo tài khoản</button></nav></div><aside>{isEditing?<><button onClick={cancel} disabled={isSaving}><X/>Hủy thay đổi</button><button className="primary" onClick={save} disabled={isSaving}><Save/>{isSaving?'Đang lưu...':'Lưu & áp dụng'}</button></>:<><button onClick={refresh}><RefreshCw/>Tải lại</button><button className="primary" disabled={locked||(mode==='account'&&!accountId)} onClick={()=>mode==='role'?onEdit():setAccountEditing(true)}><Pencil/>Chỉnh sửa quyền</button></>}</aside></header>

    {mode==='role'?<section className="rbac-role-list">{(Object.keys(ROLES) as RbacRole[]).map(key=>{const item=ROLES[key],count=matrix.filter(m=>m.permissions[key]?.actions?.view).length;return <button key={key} className={role===key?'active':''} style={{'--role-color':item.color} as CSSProperties} onClick={()=>setRole(key)}><span>{item.icon}</span><div><b>{item.name}</b><small>{item.description}</small></div><em>{count}/{matrix.length}<ChevronRight/></em></button>;})}</section>:<section className="rbac-account-picker"><div><span><Search/><select value={accountId} onChange={e=>setAccountId(Number(e.target.value))}><option value={0}>Chọn tài khoản nội bộ...</option>{selectableAccounts.map(a=><option key={a.id} value={a.id}>{a.full_name} · @{a.username}</option>)}</select></span></div>{selectedAccount&&<article><span>{selectedAccount.full_name.trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase()}</span><div><b>{selectedAccount.full_name}</b><small>{ROLES[selectedAccount.role]?.name} · {selectedAccount.theater_name||'Toàn hệ thống'}</small><em>{selectedAccount.email||selectedAccount.phone||`@${selectedAccount.username}`}</em></div><i className={selectedAccount.status}>{selectedAccount.status==='active'?'Hoạt động':'Hạn chế'}</i></article>}</section>}

    <section className="rbac-role-summary"><div className="rbac-role-title"><span style={{background:mode==='role'?`${ROLES[role].color}18`:'#e8f0ff',color:mode==='role'?ROLES[role].color:'#2563eb'}}>{mode==='role'?ROLES[role].icon:<KeyRound/>}</span><div><small>ĐANG CẤU HÌNH</small><h3>{mode==='role'?ROLES[role].name:selectedAccount?.full_name||'Chưa chọn tài khoản'}</h3>{mode==='role'&&<p>{ROLES[role].description}</p>}</div></div><div className="rbac-role-metrics"><span><b>{accessible}</b><small>Phân hệ được mở</small></span><span><b>{enabledActions}</b><small>Quyền đang cấp</small></span><span><b>{mode==='role'?matrix.length-accessible:customized}</b><small>{mode==='role'?'Phân hệ bị chặn':'Ngoại lệ tài khoản'}</small></span></div></section>

    <section className="rbac-matrix-panel">
      <div className="rbac-matrix-toolbar"><label className="rbac-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên hoặc mã phân hệ..."/>{query&&<button onClick={()=>setQuery('')} aria-label="Xóa tìm kiếm"><X/></button>}</label><div className="rbac-filter-tabs"><SlidersHorizontal/>{(['all','enabled','blocked'] as FilterMode[]).map(key=><button key={key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{key==='all'?`Tất cả ${allItems.length}`:key==='enabled'?`Được mở ${accessible}`:`Bị chặn ${allItems.length-accessible}`}</button>)}{mode==='account'&&<button className={filter==='customized'?'active':''} onClick={()=>setFilter('customized')}>Quyền riêng {customized}</button>}</div><span>{filteredRows.length} kết quả · trang {page}/{totalPages}</span></div>
      {isEditing&&!locked&&<div className={`rbac-bulkbar ${selectedKeys.length?'visible':''}`}><div><CheckSquare2/><b>{selectedKeys.length?`${selectedKeys.length} phân hệ đã chọn`:'Chọn phân hệ để áp dụng nhanh'}</b><small>Có thể chọn các hàng ở nhiều trang</small></div><div>{mode==='account'&&<button disabled={!selectedKeys.length} onClick={inheritBulk}><RotateCcw/>Kế thừa</button>}{PRESETS.map(preset=><button key={preset.key} disabled={!selectedKeys.length} className={preset.key} onClick={()=>applyBulkPreset(preset.value)}>{preset.label}</button>)}</div></div>}
      {(loading||accountLoading)?<div className="rbac-module-loading">Đang tải chính sách từ aurora_db...</div>:accountError&&mode==='account'?<div className="rbac-module-error"><LockKeyhole/><b>{accountError}</b><button onClick={()=>void loadAccount(accountId)}>Thử lại</button></div>:mode==='account'&&!accountId?<div className="rbac-module-loading">Chọn một tài khoản để xem quyền hiệu lực.</div>:filteredRows.length===0?<div className="rbac-module-loading">Không tìm thấy phân hệ phù hợp với bộ lọc.</div>:<div className="rbac-table-wrap"><table className="rbac-table"><thead><tr><th className="select-col"><label><input type="checkbox" checked={allPageSelected} disabled={!isEditing||locked} onChange={togglePageSelection}/><span><Check/></span></label></th><th className="module-col">Phân hệ / chức năng</th>{ACTIONS.map(action=>{const Icon=action.icon;return <th key={action.key} title={action.description}><Icon/><span>{action.short}</span></th>;})}<th className="status-col">Mức quyền</th><th className="detail-col">Chi tiết</th></tr></thead><tbody>{pageRows.map(raw=>{const module=raw as RbacModule,accountItem=raw as AccountPermission,actions=actionsOf(raw),level=levelOf(actions),isCustom=mode==='account'&&accountItem.customized,isExpanded=expandedKey===raw.key;return <Fragment key={raw.key}><tr className={`${selectedKeys.includes(raw.key)?'selected':''} ${isCustom?'customized':''}`}><td className="select-col"><label><input type="checkbox" checked={selectedKeys.includes(raw.key)} disabled={!isEditing||locked} onChange={()=>toggleSelection(raw.key)}/><span><Check/></span></label></td><td className="module-col"><span className="module-icon"><UserCog/></span><div><b>{raw.module}</b><small>{raw.key}{isCustom&&<em>Quyền riêng</em>}</small></div></td>{ACTIONS.map(action=>{const checked=Boolean(actions[action.key]);return <td key={action.key} className="permission-col"><label className={checked?'checked':''} title={`${action.label}: ${action.description}`}><input type="checkbox" checked={checked} disabled={!isEditing||locked} onChange={e=>mode==='role'?setRoleAction(module,action.key,e.target.checked):setAccountAction(accountItem,action.key,e.target.checked)}/><span><Check/></span></label></td>;})}<td className="status-col"><span className={`rbac-level ${level}`}>{levelLabel(level)}</span></td><td className="detail-col"><button className={isExpanded?'active':''} onClick={()=>setExpandedKey(isExpanded?'':raw.key)} title="Mở cài đặt nhanh và ghi chú"><SlidersHorizontal/><ChevronDown/></button></td></tr>{isExpanded&&<tr className="rbac-detail-row"><td colSpan={10}><div><section><small>ÁP DỤNG NHANH CHO PHÂN HỆ NÀY</small><span>{mode==='account'&&<button disabled={!isEditing||locked} onClick={()=>inheritAccount(accountItem)}><RotateCcw/>Kế thừa vai trò</button>}{PRESETS.map(preset=><button key={preset.key} disabled={!isEditing||locked} className={levelOf(preset.value)===level?'active':''} onClick={()=>applyPreset(raw,preset.value)}>{preset.label}</button>)}</span></section><label><span><MessageSquareText/>Phạm vi / ghi chú nghiệp vụ</span>{isEditing&&!locked?<textarea value={mode==='role'?module.permissions[role]?.note||'':accountItem.note||''} maxLength={255} onChange={e=>mode==='role'?onNote(raw.key,role,e.target.value):updateAccount(raw.key,{customized:true,note:e.target.value})} placeholder="Ví dụ: Chỉ dữ liệu của rạp được phân công"/>:<p>{mode==='role'?module.permissions[role]?.note||'Không có ghi chú bổ sung.':accountItem.customized?accountItem.note||'Quyền riêng không có ghi chú.':'Kế thừa phạm vi từ vai trò.'}</p>}</label></div></td></tr>}</Fragment>;})}</tbody></table></div>}
      {filteredRows.length>PAGE_SIZE&&<footer className="rbac-pagination"><span>Hiển thị {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filteredRows.length)} trong {filteredRows.length} phân hệ</span><div><button disabled={page===1} onClick={()=>setPage(value=>value-1)}><ChevronLeft/>Trang trước</button>{Array.from({length:totalPages},(_,index)=>index+1).map(value=><button key={value} className={page===value?'active':''} onClick={()=>setPage(value)}>{value}</button>)}<button disabled={page===totalPages} onClick={()=>setPage(value=>value+1)}>Trang sau<ChevronRight/></button></div></footer>}
    </section>
    {isEditing&&<div className="rbac-sticky-save"><div><ShieldCheck/><span><b>Đang chỉnh sửa chính sách quyền</b><small>Thay đổi chỉ có hiệu lực sau khi lưu vào aurora_db.</small></span></div><span><button onClick={cancel} disabled={isSaving}>Hủy</button><button className="primary" onClick={save} disabled={isSaving}><Save/>{isSaving?'Đang lưu...':'Lưu & áp dụng'}</button></span></div>}
  </div>;
}
