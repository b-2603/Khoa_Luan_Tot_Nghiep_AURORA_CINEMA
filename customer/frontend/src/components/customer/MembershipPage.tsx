import { useEffect, useState } from 'react';
import { ArrowRight, Check, Crown, Gift, History, ShieldCheck, Sparkles, Star, Ticket } from 'lucide-react';
import './CustomerPortalPages.css';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = {
  language: 'vi' | 'en';
  user: { fullName:string; email:string; membershipLevel?:string; points?:number } | null;
  onRegister: () => void;
  onOpenAccount: () => void;
  onOpenOffers: () => void;
};

type Tier = { code:string; name:string; minPoints:number; color:string; benefits:string[] };
type Member = { fullName:string; cardNumber:string; level:string; points:number; activatedAt:string; expiresAt:string; nextLevel:string|null; nextThreshold:number|null; pointsToNext:number };
type PointRow = { id:number; points_change:number; balance_after:number; description:string; created_at:string };

export default function MembershipPage({ language, user, onRegister, onOpenAccount, onOpenOffers }: Props) {
  const t = (vi:string,en:string) => language === 'en' ? en : vi;
  const [tiers,setTiers] = useState<Tier[]>([]);
  const [member,setMember] = useState<Member|null>(null);
  const [history,setHistory] = useState<PointRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(()=>{
    let active=true; setLoading(true); setError('');
    fetch(`${API_URL}?action=membership_overview&_=${Date.now()}`,{credentials:'include',cache:'no-store'})
      .then(async response=>{ const data=await response.json(); if(!response.ok) throw new Error(data.message||t('Không thể tải dữ liệu thành viên.','Unable to load membership data.')); return data; })
      .then(data=>{ if(!active)return; setTiers(data.tiers||[]);setMember(data.member||null);setHistory(data.history||[]); })
      .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:t('Không thể tải dữ liệu.','Unable to load data.'));})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[user?.email,language]);

  const currentTier = tiers.find(tier=>tier.code===(member?.level||user?.membershipLevel||'STANDARD')) || tiers[0];
  const progress = member?.nextThreshold ? Math.min(100,Math.round(member.points*100/member.nextThreshold)) : 100;

  return <main className="portal-page membership-page">
    <div className="portal-shell">
      <section className="membership-hero">
        <div className="membership-hero-copy">
          <span className="portal-kicker"><Sparkles size={14}/>{t('AURORA REWARDS','AURORA REWARDS')}</span>
          <h1>{user?t('Đặc quyền dành riêng cho bạn','Privileges made for you'):t('Mỗi trải nghiệm, thêm một đặc quyền','Every experience unlocks a privilege')}</h1>
          <p>{t('Tích điểm từ mỗi giao dịch, nâng hạng thành viên và tận hưởng những ưu đãi điện ảnh được thiết kế riêng.','Earn points on every purchase, advance your tier and enjoy cinema rewards tailored to you.')}</p>
          <div className="portal-actions">{user?<button onClick={onOpenAccount}><Crown size={17}/>{t('Quản lý thẻ thành viên','Manage membership card')}</button>:<button onClick={onRegister}><Star size={17}/>{t('Tham gia Aurora Rewards','Join Aurora Rewards')}</button>}<button className="secondary" onClick={onOpenOffers}><Gift size={17}/>{t('Xem ưu đãi thành viên','View member offers')}</button></div>
        </div>
        <div className="membership-digital-card" style={{'--tier-color':currentTier?.color||'#f4c04a'} as React.CSSProperties}>
          <header><span>AURORA</span><Crown size={22}/></header>
          <div><small>{t('HẠNG THÀNH VIÊN','MEMBERSHIP TIER')}</small><b>{member?.level||user?.membershipLevel||t('KHÁCH','GUEST')}</b></div>
          <footer><span><small>{t('MÃ THÀNH VIÊN','MEMBER NUMBER')}</small><b>{member?.cardNumber||'•••• •••• ••••'}</b></span><span><small>{t('ĐIỂM KHẢ DỤNG','AVAILABLE POINTS')}</small><b>{Number(member?.points||user?.points||0).toLocaleString('vi-VN')}</b></span></footer>
        </div>
      </section>

      {loading?<div className="portal-state"><i/><b>{t('Đang đồng bộ dữ liệu thành viên…','Syncing membership data…')}</b></div>:error?<div className="portal-state error"><ShieldCheck/><b>{error}</b></div>:<>
        {member&&<section className="membership-progress-card"><div><span><Crown size={18}/></span><div><small>{t('HÀNH TRÌNH THĂNG HẠNG','TIER JOURNEY')}</small><h2>{member.nextLevel?t(`Tiến đến hạng ${member.nextLevel}`,`Progress to ${member.nextLevel}`):t('Bạn đang ở hạng cao nhất','You are at the highest tier')}</h2></div></div><strong>{member.nextLevel?`${member.points.toLocaleString('vi-VN')} / ${member.nextThreshold?.toLocaleString('vi-VN')} ${t('điểm','points')}`:t('PLATINUM','PLATINUM')}</strong><div className="membership-progress-track"><i style={{width:`${progress}%`}}/></div><p>{member.nextLevel?t(`Cần thêm ${member.pointsToNext.toLocaleString('vi-VN')} điểm để mở khóa đặc quyền tiếp theo.`,`Earn ${member.pointsToNext.toLocaleString('vi-VN')} more points to unlock the next privileges.`):t('Cảm ơn bạn đã đồng hành cùng Aurora Cinema.','Thank you for your loyalty to Aurora Cinema.')}</p></section>}

        <section className="portal-section"><header><div><span>{t('HỆ THỐNG HẠNG THẺ','MEMBERSHIP TIERS')}</span><h2>{t('Đặc quyền tăng theo từng hành trình','Privileges that grow with every journey')}</h2></div><small>{t('1.000đ chi tiêu hợp lệ = 1 điểm Aurora','VND 1,000 eligible spend = 1 Aurora point')}</small></header><div className="membership-tier-grid">{tiers.map((tier,index)=><article className={tier.code===(member?.level||user?.membershipLevel)?'active':''} key={tier.code} style={{'--tier-color':tier.color} as React.CSSProperties}><div className="tier-orbit"/><span>{index+1}</span><Crown size={22}/><small>{tier.code}</small><h3>{tier.name}</h3><b>{tier.minPoints.toLocaleString('vi-VN')}+ {t('điểm','points')}</b><ul>{tier.benefits.map(benefit=><li key={benefit}><Check size={13}/>{benefit}</li>)}</ul>{tier.code===(member?.level||user?.membershipLevel)&&<em>{t('HẠNG CỦA BẠN','YOUR TIER')}</em>}</article>)}</div></section>

        <section className="membership-bottom-grid"><article><header><span><History size={18}/></span><div><small>{t('LỊCH SỬ GẦN ĐÂY','RECENT ACTIVITY')}</small><h2>{t('Biến động điểm thưởng','Point activity')}</h2></div></header>{user?(history.length?<div className="membership-history">{history.map(row=><div key={row.id}><span className={row.points_change>=0?'plus':'minus'}>{row.points_change>=0?'+':''}{row.points_change}</span><div><b>{row.description}</b><small>{new Date(row.created_at.replace(' ','T')).toLocaleString(language==='en'?'en-GB':'vi-VN')}</small></div><em>{row.balance_after.toLocaleString('vi-VN')} {t('điểm','pts')}</em></div>)}</div>:<div className="portal-empty"><Ticket/><b>{t('Chưa có giao dịch điểm','No point activity yet')}</b><span>{t('Điểm sẽ xuất hiện sau khi thanh toán vé thành công.','Points appear after a successful ticket purchase.')}</span></div>):<div className="portal-empty"><ShieldCheck/><b>{t('Đăng nhập để xem lịch sử','Sign in to view your history')}</b><button onClick={onRegister}>{t('Đăng nhập / đăng ký','Sign in / register')}<ArrowRight size={14}/></button></div>}</article><aside><Sparkles/><h2>{t('Quyền lợi luôn minh bạch','Benefits, always transparent')}</h2><p>{t('Hạng thẻ, số dư điểm và lịch sử tích điểm được đồng bộ trực tiếp từ aurora_db sau mỗi giao dịch.','Your tier, point balance and history are synchronized directly from aurora_db after each transaction.')}</p><div><ShieldCheck/><span><b>{t('Dữ liệu an toàn','Secure data')}</b><small>{t('Gắn với tài khoản Aurora của bạn','Linked to your Aurora account')}</small></span></div><div><Gift/><span><b>{t('Ưu đãi đúng hạng','Tier-based offers')}</b><small>{t('Cập nhật theo cấp độ thành viên','Updated for your membership level')}</small></span></div></aside></section>
      </>}
    </div>
  </main>;
}
