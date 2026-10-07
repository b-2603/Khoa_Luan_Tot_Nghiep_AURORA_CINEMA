import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, Crown, Edit, ExternalLink,
  Globe2, KeyRound, Lock, Mail, Phone, Plus, RefreshCw, Search, ShieldCheck,
  ShoppingBag, Sparkles, Trash2, UserRound, Users, WalletCards, X, XCircle,
} from 'lucide-react';

type Account = {
  id?: number; username: string; full_name: string; role: string; phone?: string; email?: string;
  theater_id?: number; theater_name?: string; status?: string; last_login?: string | null;
  membership_level?: string; points?: number; booking_count?: number; total_spent?: number;
  oauth_providers?: string | null; created_at?: string; account_type?: 'internal' | 'customer';
};

type AccountSummary = {
  total: number; active: number; locked: number; internal_total: number; internal_active: number;
  customer_total: number; customer_active: number; customer_points: number; admins: number;
};

type Props = {
  internalUsers: Account[]; customerUsers: Account[]; summary: AccountSummary; loading: boolean;
  formatLastLogin: (value?: string | null) => string; onRefresh: () => void; onCreateInternal: () => void;
  onEditInternal: (user: Account) => void; onToggleInternal: (user: Account) => void;
  onDeleteInternal: (user: Account) => void; onToggleCustomer: (user: Account) => void;
};

const ROLE_COPY: Record<string, { name: string; icon: string; color: string; bg: string }> = {
  super_admin: { name: 'Admin Tổng', icon: '👑', color: '#a86208', bg: '#fff5d9' },
  cinema_admin: { name: 'Admin Rạp', icon: '🏢', color: '#2457c5', bg: '#eaf1ff' },
  supervisor: { name: 'Supervisor', icon: '🛡️', color: '#08775b', bg: '#e7f8f1' },
  accounting: { name: 'Kế toán', icon: '📊', color: '#6c3fc3', bg: '#f1ebff' },
};

function money(value: unknown) { return `${Number(value || 0).toLocaleString('vi-VN')} ₫`; }
function initial(name: string) { return name.trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join('').toUpperCase() || 'AU'; }

export default function AccountManagementPage({ internalUsers, customerUsers, summary, loading, formatLastLogin, onRefresh, onCreateInternal, onEditInternal, onToggleInternal, onDeleteInternal, onToggleCustomer }: Props) {
  const [space, setSpace] = useState<'overview' | 'internal' | 'customer'>('overview');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [membership, setMembership] = useState('all');
  const [selected, setSelected] = useState<Account | null>(null);

  const rows = useMemo(() => {
    const source = space === 'customer' ? customerUsers : internalUsers;
    const keyword = query.trim().toLocaleLowerCase('vi');
    return source.filter(user => {
      const text = `${user.full_name} ${user.username} ${user.email || ''} ${user.phone || ''} ${user.theater_name || ''}`.toLocaleLowerCase('vi');
      return (!keyword || text.includes(keyword)) && (status === 'all' || user.status === status) && (space !== 'internal' || role === 'all' || user.role === role) && (space !== 'customer' || membership === 'all' || user.membership_level === membership);
    });
  }, [space, internalUsers, customerUsers, query, status, role, membership]);

  function openSpace(next: 'internal' | 'customer') { setSpace(next); setQuery(''); setStatus('all'); setRole('all'); setMembership('all'); }

  if (space === 'overview') return <div className="account-hub">
    <section className="account-space-grid">
      <article className="account-space-card internal"><header><span><Building2 size={23}/></span><em>NỘI BỘ · RBAC</em></header><h3>Tài khoản vận hành</h3><p>Dành cho Admin Tổng, Admin Rạp, Supervisor và Kế toán. Có quyền hệ thống, phạm vi rạp và nhật ký quản trị riêng.</p><div className="account-space-metrics"><span><b>{summary.internal_total ?? internalUsers.length}</b><small>Tổng nội bộ</small></span><span><b>{summary.internal_active ?? internalUsers.filter(user => user.status === 'active').length}</b><small>Đang hoạt động</small></span><span><b>{new Set(internalUsers.map(user => user.role)).size}</b><small>Vai trò RBAC</small></span></div><ul><li><KeyRound size={14}/>Phân quyền truy cập theo vai trò</li><li><Building2 size={14}/>Giới hạn dữ liệu theo cụm rạp</li><li><ShieldCheck size={14}/>Theo dõi thao tác quản trị</li></ul><button onClick={() => openSpace('internal')}>Vào không gian nội bộ<ArrowRight size={16}/></button></article>
      <article className="account-space-card customer"><header><span><UserRound size={23}/></span><em>KHÁCH HÀNG · CRM</em></header><h3>Tài khoản customer</h3><p>Dành cho người đặt vé trên website Aurora. Quản lý hạng thành viên, điểm thưởng, đặt vé, chi tiêu và trạng thái truy cập.</p><div className="account-space-metrics"><span><b>{summary.customer_total ?? customerUsers.length}</b><small>Khách hàng</small></span><span><b>{summary.customer_active ?? customerUsers.filter(user => user.status === 'active').length}</b><small>Đang hoạt động</small></span><span><b>{Number(summary.customer_points || 0).toLocaleString('vi-VN')}</b><small>Điểm tích lũy</small></span></div><ul><li><Sparkles size={14}/>Hạng thành viên & điểm thưởng</li><li><ShoppingBag size={14}/>Lịch sử đặt vé và chi tiêu</li><li><Globe2 size={14}/>Định danh email hoặc OAuth</li></ul><button onClick={() => openSpace('customer')}>Vào không gian customer<ArrowRight size={16}/></button></article>
    </section>
    <section className="account-boundary-note account-boundary-guard">
      <div className="account-boundary-intro"><span className="account-boundary-icon"><ShieldCheck size={22}/></span><div><span className="account-boundary-state"><i/>CHÍNH SÁCH BACKEND ĐANG HOẠT ĐỘNG</span><b>Phân vùng danh tính được bảo vệ</b><p>Mỗi loại tài khoản chỉ được truy cập đúng không gian nghiệp vụ đã định.</p></div></div>
      <div className="account-boundary-routes" aria-label="Ranh giới giữa tài khoản nội bộ và customer">
        <div className="account-boundary-route internal"><span><Building2 size={16}/></span><div><small>TÀI KHOẢN NỘI BỘ</small><b>TMS · Phân quyền RBAC</b></div><em>{internalUsers.length}</em></div>
        <span className="account-boundary-lock"><ShieldCheck size={17}/><small>Tách biệt</small></span>
        <div className="account-boundary-route customer"><span><UserRound size={16}/></span><div><small>TÀI KHOẢN CUSTOMER</small><b>CRM · Thành viên Aurora</b></div><em>{customerUsers.length}</em></div>
      </div>
      <div className="account-boundary-actions"><span><i/>Nguồn dữ liệu <b>aurora_db</b></span><button type="button" className={loading ? 'is-loading' : ''} disabled={loading} onClick={onRefresh}><RefreshCw size={14}/>{loading ? 'Đang đồng bộ…' : 'Đồng bộ dữ liệu'}</button></div>
    </section>
  </div>;

  const isInternal = space === 'internal';
  return <div className={`account-workspace ${space}`}>
    <header className="account-workspace-head"><button className="account-back" onClick={() => setSpace('overview')}><ArrowLeft size={16}/></button><span className="account-workspace-symbol">{isInternal ? <Building2 size={21}/> : <UserRound size={21}/>}</span><div><small>{isInternal ? 'KHÔNG GIAN NỘI BỘ · RBAC' : 'KHÔNG GIAN CUSTOMER · CRM'}</small><h2>{isInternal ? 'Quản trị tài khoản vận hành' : 'Hồ sơ khách hàng Aurora'}</h2><p>{isInternal ? 'Cấp quyền, phạm vi rạp và kiểm soát truy cập nhân sự.' : 'Theo dõi thành viên, hành vi đặt vé và trạng thái sử dụng dịch vụ.'}</p></div><aside><b>{isInternal ? internalUsers.length : customerUsers.length}</b><span>{isInternal ? 'tài khoản nội bộ' : 'khách hàng'}</span></aside>{isInternal && <button className="account-primary-action" onClick={onCreateInternal}><Plus size={16}/>Thêm tài khoản nội bộ</button>}</header>
    <section className="account-workspace-stats"><article><Users size={18}/><span><small>Tổng hồ sơ</small><b>{isInternal ? internalUsers.length : customerUsers.length}</b></span></article><article><CheckCircle2 size={18}/><span><small>Đang hoạt động</small><b>{(isInternal ? internalUsers : customerUsers).filter(user => user.status === 'active').length}</b></span></article><article><Lock size={18}/><span><small>Đã hạn chế</small><b>{(isInternal ? internalUsers : customerUsers).filter(user => user.status !== 'active').length}</b></span></article><article>{isInternal ? <Crown size={18}/> : <WalletCards size={18}/>}<span><small>{isInternal ? 'Vai trò sử dụng' : 'Tổng điểm thưởng'}</small><b>{isInternal ? new Set(internalUsers.map(user => user.role)).size : customerUsers.reduce((sum, user) => sum + Number(user.points || 0), 0).toLocaleString('vi-VN')}</b></span></article></section>
    <section className="account-card-panel"><div className="account-card-toolbar"><label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={isInternal ? 'Tìm nhân sự, username, email hoặc rạp...' : 'Tìm customer theo tên, email hoặc số điện thoại...'} /></label>{isInternal ? <select value={role} onChange={event => setRole(event.target.value)}><option value="all">Tất cả vai trò</option><option value="super_admin">Admin Tổng</option><option value="cinema_admin">Admin Rạp</option><option value="supervisor">Supervisor</option><option value="accounting">Kế toán</option></select> : <select value={membership} onChange={event => setMembership(event.target.value)}><option value="all">Mọi hạng thành viên</option><option>STANDARD</option><option>SILVER</option><option>GOLD</option><option>PLATINUM</option></select>}<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Tạm khóa</option><option value="inactive">Ngừng hoạt động</option></select><button onClick={onRefresh}><RefreshCw size={15}/>Làm mới</button></div>
      {loading ? <div className="account-card-loading"><i/><i/><i/></div> : rows.length ? <div className="account-profile-grid">{rows.map(user => isInternal ? <InternalCard key={user.id} user={user} formatLastLogin={formatLastLogin} onOpen={() => setSelected(user)} onEdit={() => onEditInternal(user)} onToggle={() => onToggleInternal(user)} onDelete={() => onDeleteInternal(user)}/> : <CustomerCard key={user.id} user={user} onOpen={() => setSelected(user)} onToggle={() => onToggleCustomer(user)}/>)}</div> : <div className="account-card-empty"><Search size={27}/><b>Không tìm thấy hồ sơ phù hợp</b><span>Thử thay đổi từ khóa hoặc bộ lọc hiện tại.</span></div>}
    </section>
    {selected && <AccountDetail user={selected} internal={selected.role !== 'customer'} formatLastLogin={formatLastLogin} onClose={() => setSelected(null)} onToggle={() => selected.role === 'customer' ? onToggleCustomer(selected) : onToggleInternal(selected)} />}
  </div>;
}

function InternalCard({ user, formatLastLogin, onOpen, onEdit, onToggle, onDelete }: { user: Account; formatLastLogin: Props['formatLastLogin']; onOpen:()=>void; onEdit:()=>void; onToggle:()=>void; onDelete:()=>void }) {
  const config = ROLE_COPY[user.role] || ROLE_COPY.cinema_admin;
  return <article className="account-profile-card internal"><div className="account-profile-top"><span style={{ background: config.bg, color: config.color }}>{config.icon}</span><div><em>{config.name}</em><b>{user.full_name}</b><small>@{user.username}</small></div><i className={user.status === 'active' ? 'active' : 'locked'}>{user.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}</i></div><div className="account-profile-contact"><span><Building2 size={13}/>{user.role === 'super_admin' || user.role === 'accounting' ? 'Toàn hệ thống' : user.theater_name || 'Chưa phân rạp'}</span><span><Mail size={13}/>{user.email || 'Chưa có email'}</span><span><Phone size={13}/>{user.phone || 'Chưa có SĐT'}</span></div><div className="account-profile-foot"><span><small>Đăng nhập cuối</small><b>{formatLastLogin(user.last_login)}</b></span><div><button onClick={onOpen} title="Xem hồ sơ"><ExternalLink size={14}/></button><button onClick={onEdit} title="Chỉnh sửa"><Edit size={14}/></button><button onClick={onToggle} title={user.status === 'active' ? 'Tạm khóa' : 'Mở khóa'}>{user.status === 'active' ? <Lock size={14}/> : <CheckCircle2 size={14}/>}</button><button className="danger" onClick={onDelete} title="Xóa"><Trash2 size={14}/></button></div></div></article>;
}

function CustomerCard({ user, onOpen, onToggle }: { user: Account; onOpen:()=>void; onToggle:()=>void }) {
  return <article className="account-profile-card customer"><div className="account-profile-top"><span>{initial(user.full_name)}</span><div><em>{user.membership_level || 'STANDARD'}</em><b>{user.full_name}</b><small>{user.email || `@${user.username}`}</small></div><i className={user.status === 'active' ? 'active' : 'locked'}>{user.status === 'active' ? 'Hoạt động' : 'Hạn chế'}</i></div><div className="customer-value-grid"><span><b>{Number(user.points || 0).toLocaleString('vi-VN')}</b><small>Điểm thưởng</small></span><span><b>{user.booking_count || 0}</b><small>Lượt đặt vé</small></span><span><b>{money(user.total_spent)}</b><small>Tổng chi tiêu</small></span></div><div className="account-profile-contact"><span><Phone size={13}/>{user.phone || 'Chưa cập nhật SĐT'}</span><span><Globe2 size={13}/>{user.oauth_providers ? `Đăng nhập ${user.oauth_providers}` : 'Đăng nhập email'}</span></div><div className="account-profile-foot"><span><small>Ngày tham gia</small><b>{String(user.created_at || '').slice(0,10) || '—'}</b></span><div><button onClick={onOpen} title="Xem hồ sơ"><ExternalLink size={14}/></button><button onClick={onToggle} title={user.status === 'active' ? 'Hạn chế truy cập' : 'Mở lại truy cập'}>{user.status === 'active' ? <Lock size={14}/> : <CheckCircle2 size={14}/>}</button></div></div></article>;
}

function AccountDetail({ user, internal, formatLastLogin, onClose, onToggle }: { user: Account; internal: boolean; formatLastLogin: Props['formatLastLogin']; onClose:()=>void; onToggle:()=>void }) {
  return <div className="account-detail-backdrop" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}><aside className="account-detail-panel"><button className="account-detail-close" onClick={onClose}><X size={18}/></button><header className={internal ? 'internal' : 'customer'}><span>{internal ? (ROLE_COPY[user.role]?.icon || '🏢') : initial(user.full_name)}</span><small>{internal ? 'HỒ SƠ NỘI BỘ' : 'HỒ SƠ CUSTOMER'}</small><h2>{user.full_name}</h2><p>{user.email || `@${user.username}`}</p></header><section><h3>Thông tin định danh</h3><dl><div><dt>Loại tài khoản</dt><dd>{internal ? 'Nội bộ · RBAC' : 'Customer · CRM'}</dd></div><div><dt>Trạng thái</dt><dd className={user.status === 'active' ? 'ok' : 'danger'}>{user.status === 'active' ? 'Đang hoạt động' : 'Đã hạn chế'}</dd></div><div><dt>Số điện thoại</dt><dd>{user.phone || 'Chưa cập nhật'}</dd></div><div><dt>Đăng nhập cuối</dt><dd>{formatLastLogin(user.last_login)}</dd></div></dl></section>{internal ? <section><h3>Quyền & phạm vi</h3><dl><div><dt>Vai trò</dt><dd>{ROLE_COPY[user.role]?.name || user.role}</dd></div><div><dt>Phạm vi</dt><dd>{user.role === 'super_admin' || user.role === 'accounting' ? 'Toàn hệ thống' : user.theater_name || 'Chưa phân rạp'}</dd></div><div><dt>Username</dt><dd>@{user.username}</dd></div></dl></section> : <section><h3>Giá trị thành viên</h3><dl><div><dt>Hạng thành viên</dt><dd>{user.membership_level || 'STANDARD'}</dd></div><div><dt>Điểm thưởng</dt><dd>{Number(user.points || 0).toLocaleString('vi-VN')}</dd></div><div><dt>Lượt đặt vé</dt><dd>{user.booking_count || 0}</dd></div><div><dt>Tổng chi tiêu</dt><dd>{money(user.total_spent)}</dd></div><div><dt>Kênh đăng nhập</dt><dd>{user.oauth_providers || 'Email & mật khẩu'}</dd></div></dl></section>}<footer><button onClick={onToggle}>{user.status === 'active' ? <><Lock size={15}/>Hạn chế truy cập</> : <><CheckCircle2 size={15}/>Mở lại truy cập</>}</button></footer></aside></div>;
}
