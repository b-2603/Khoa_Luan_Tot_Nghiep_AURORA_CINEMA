import { useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight, BadgePercent, CalendarDays, Check, ChevronRight, Clock3,
  Copy, Gift, Search, ShieldCheck, Sparkles, Ticket, Users, X,
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Language = 'vi' | 'en';

type Promotion = {
  id: number;
  name: string;
  code: string;
  description?: string;
  details?: string;
  terms?: string;
  category?: string;
  audience?: string;
  badge?: string;
  themeColor?: string;
  imageUrl?: string;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  startsAt?: string;
  endsAt?: string;
  remainingUses?: number | null;
  isFeatured?: boolean;
};

type PromotionsPageProps = {
  language: Language;
  promotions: Promotion[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onBook: () => void;
};

const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
  all: { vi: 'Tất cả ưu đãi', en: 'All offers' },
  ticket: { vi: 'Vé xem phim', en: 'Movie tickets' },
  combo: { vi: 'Bắp nước & Combo', en: 'Food & combos' },
  member: { vi: 'Thành viên', en: 'Members' },
  experience: { vi: 'Trải nghiệm đặc biệt', en: 'Premium experiences' },
};

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function dateLabel(value: string | undefined, language: Language) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value.replace(' ', 'T') + '+07:00'));
}

function offerValue(promotion: Promotion, language: Language) {
  if (promotion.discountType === 'percent') return `${Number(promotion.discountValue || 0)}%`;
  return language === 'vi' ? `-${money(promotion.discountValue)}` : `${money(promotion.discountValue)} off`;
}

function categoryIcon(category: string | undefined) {
  if (category === 'member') return Users;
  if (category === 'combo') return Gift;
  if (category === 'experience') return Sparkles;
  return Ticket;
}

export default function PromotionsPage({ language, promotions, loading, error, onRetry, onBook }: PromotionsPageProps) {
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Promotion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const featured = promotions.find(item => item.isFeatured) || promotions[0];
  const categories = useMemo(() => ['all', ...Array.from(new Set(promotions.map(item => item.category || 'ticket')))], [promotions]);
  const visible = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase(language === 'vi' ? 'vi' : 'en');
    return promotions.filter(item => {
      const categoryMatches = category === 'all' || (item.category || 'ticket') === category;
      const searchMatches = !keyword || `${item.name} ${item.description || ''} ${item.code}`.toLocaleLowerCase(language === 'vi' ? 'vi' : 'en').includes(keyword);
      return categoryMatches && searchMatches;
    });
  }, [promotions, category, query, language]);

  async function openPromotion(promotion: Promotion) {
    setSelected(promotion);
    setDetailLoading(true);
    fetch(`${API_URL}?action=promotion_detail&id=${promotion.id}`, { credentials: 'include', cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('detail failed')))
      .then(result => { if (result.promotion) setSelected(result.promotion); })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
    fetch(`${API_URL}?action=home_event`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'VIEW_PROMOTION', entityType: 'promotion', entityId: promotion.id, metadata: { source: 'offers_page' } }),
    }).catch(() => {});
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(current => current === code ? '' : current), 1800);
    } catch {
      setCopiedCode('');
    }
  }

  function renderArtwork(promotion: Promotion, featuredCard = false) {
    const Icon = categoryIcon(promotion.category);
    return <div className={`offers-artwork ${featuredCard ? 'featured' : ''}`} style={{ '--offer-color': promotion.themeColor || '#D89718' } as CSSProperties}>
      {promotion.imageUrl ? <img src={encodeURI(promotion.imageUrl)} alt="" /> : <>
        <div className="offers-artwork-orbit" />
        <Icon size={featuredCard ? 42 : 28} />
        <strong>{offerValue(promotion, language)}</strong>
        <span>{promotion.badge || t('ƯU ĐÃI AURORA', 'AURORA OFFER')}</span>
      </>}
    </div>;
  }

  return <main className="offers-page">
    <div className="offers-shell">
      <header className="offers-heading">
        <div><span><Sparkles size={14}/>{t('Đặc quyền điện ảnh', 'Cinema privileges')}</span><h1>{t('Ưu đãi dành cho bạn', 'Offers made for you')}</h1><p>{t('Khám phá voucher mới nhất từ Aurora Cinema, sao chép mã và áp dụng trực tiếp khi thanh toán.', 'Discover the latest Aurora Cinema vouchers, copy a code and apply it directly at checkout.')}</p></div>
        <aside><ShieldCheck size={20}/><div><b>{t('Dữ liệu ưu đãi trực tiếp', 'Live offer data')}</b><small>{t('Hiệu lực và lượt sử dụng được đồng bộ từ Aurora DB', 'Validity and availability are synced from Aurora DB')}</small></div></aside>
      </header>

      {loading ? <section className="offers-loading" aria-label={t('Đang tải ưu đãi', 'Loading offers')}><i/><i/><i/></section> : error ? <section className="offers-state"><Gift size={30}/><h2>{t('Chưa thể tải ưu đãi', 'Offers are unavailable')}</h2><p>{error}</p><button onClick={onRetry}>{t('Thử lại', 'Try again')}</button></section> : promotions.length === 0 ? <section className="offers-state"><Gift size={30}/><h2>{t('Chưa có ưu đãi đang hoạt động', 'No active offers')}</h2><p>{t('Các chương trình mới sẽ xuất hiện tại đây ngay khi được phát hành.', 'New campaigns will appear here as soon as they launch.')}</p></section> : <>
        {featured && <section className="offers-featured" style={{ '--offer-color': featured.themeColor || '#D89718' } as CSSProperties}>
          <div className="offers-featured-copy"><span>{featured.badge || t('ƯU ĐÃI NỔI BẬT', 'FEATURED OFFER')}</span><h2>{featured.name}</h2><p>{featured.description}</p><div className="offers-featured-facts"><b>{offerValue(featured, language)}</b><small><CalendarDays size={14}/>{t('Đến', 'Until')} {dateLabel(featured.endsAt, language)}</small>{featured.minOrderAmount ? <small><Ticket size={14}/>{t('Đơn từ', 'Orders from')} {money(featured.minOrderAmount)}</small> : null}</div><div className="offers-featured-actions"><button onClick={() => openPromotion(featured)}>{t('Xem chi tiết', 'View details')}<ArrowRight size={15}/></button><button onClick={() => copyCode(featured.code)}>{copiedCode === featured.code ? <Check size={15}/> : <Copy size={15}/>} {copiedCode === featured.code ? t('Đã sao chép', 'Copied') : featured.code}</button></div></div>
          {renderArtwork(featured, true)}
        </section>}

        <section className="offers-toolbar">
          <div className="offers-tabs">{categories.map(key => <button key={key} className={category === key ? 'active' : ''} onClick={() => setCategory(key)}>{CATEGORY_LABELS[key]?.[language] || key}</button>)}</div>
          <label><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Tìm tên hoặc mã ưu đãi...', 'Search offers or codes...')} /></label>
        </section>

        <div className="offers-section-title"><div><span>{t('ĐANG DIỄN RA', 'AVAILABLE NOW')}</span><h2>{t('Chọn ưu đãi phù hợp', 'Choose your offer')}</h2></div><small>{visible.length} {t('ưu đãi', 'offers')}</small></div>
        {visible.length ? <section className="offers-grid">{visible.map(promotion => <article className="offer-card" key={promotion.id}>
          {renderArtwork(promotion)}
          <div className="offer-card-body"><div className="offer-card-meta"><span>{CATEGORY_LABELS[promotion.category || 'ticket']?.[language] || promotion.category}</span>{promotion.remainingUses !== null && promotion.remainingUses !== undefined && promotion.remainingUses < 100 ? <em>{t('Sắp hết lượt', 'Almost gone')}</em> : null}</div><h3>{promotion.name}</h3><p>{promotion.description}</p><div className="offer-card-valid"><Clock3 size={14}/>{t('Hiệu lực đến', 'Valid until')} <b>{dateLabel(promotion.endsAt, language)}</b></div><div className="offer-code"><span><small>{t('MÃ ƯU ĐÃI', 'PROMO CODE')}</small><b>{promotion.code}</b></span><button aria-label={t('Sao chép mã', 'Copy code')} onClick={() => copyCode(promotion.code)}>{copiedCode === promotion.code ? <Check size={16}/> : <Copy size={16}/>}</button></div><button className="offer-detail-button" onClick={() => openPromotion(promotion)}>{t('Xem điều kiện áp dụng', 'View terms')}<ChevronRight size={15}/></button></div>
        </article>)}</section> : <section className="offers-state compact"><Search size={26}/><h2>{t('Không tìm thấy ưu đãi phù hợp', 'No matching offers')}</h2><p>{t('Thử thay đổi từ khóa hoặc danh mục.', 'Try another keyword or category.')}</p></section>}
      </>}

      <section className="offers-how"><div><span>01</span><b>{t('Chọn ưu đãi', 'Choose an offer')}</b><p>{t('Xem kỹ thời hạn và điều kiện.', 'Review the validity and terms.')}</p></div><ChevronRight/><div><span>02</span><b>{t('Sao chép mã', 'Copy the code')}</b><p>{t('Lưu mã bạn muốn sử dụng.', 'Save the code you want to use.')}</p></div><ChevronRight/><div><span>03</span><b>{t('Đặt vé & áp dụng', 'Book and apply')}</b><p>{t('Nhập mã tại bước thanh toán.', 'Enter it during checkout.')}</p></div></section>
    </div>

    {selected && <div className="offer-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setSelected(null); }}><section className="offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
      <button className="offer-modal-close" onClick={() => setSelected(null)} aria-label={t('Đóng', 'Close')}><X size={18}/></button>
      {renderArtwork(selected, true)}
      <div className="offer-modal-content">{detailLoading && <div className="offer-modal-loading">{t('Đang đồng bộ chi tiết...', 'Loading details...')}</div>}<span>{selected.badge || t('ƯU ĐÃI AURORA', 'AURORA OFFER')}</span><h2 id="offer-modal-title">{selected.name}</h2><p>{selected.details || selected.description}</p><dl><div><dt>{t('Giá trị', 'Value')}</dt><dd>{offerValue(selected, language)}</dd></div><div><dt>{t('Đơn tối thiểu', 'Minimum order')}</dt><dd>{selected.minOrderAmount ? money(selected.minOrderAmount) : t('Không giới hạn', 'No minimum')}</dd></div><div><dt>{t('Giảm tối đa', 'Maximum discount')}</dt><dd>{selected.maxDiscount ? money(selected.maxDiscount) : t('Không giới hạn', 'No cap')}</dd></div><div><dt>{t('Thời hạn', 'Validity')}</dt><dd>{dateLabel(selected.startsAt, language)} — {dateLabel(selected.endsAt, language)}</dd></div></dl><div className="offer-modal-terms"><b><ShieldCheck size={16}/>{t('Điều kiện áp dụng', 'Terms and conditions')}</b><p>{selected.terms || t('Áp dụng theo điều kiện của chương trình tại thời điểm thanh toán.', 'Campaign terms apply at checkout.')}</p></div><div className="offer-modal-code"><span><small>{t('MÃ ÁP DỤNG', 'APPLY CODE')}</small><b>{selected.code}</b></span><button onClick={() => copyCode(selected.code)}>{copiedCode === selected.code ? <Check size={16}/> : <Copy size={16}/>} {copiedCode === selected.code ? t('Đã sao chép', 'Copied') : t('Sao chép mã', 'Copy code')}</button></div><button className="offer-modal-book" onClick={() => { setSelected(null); onBook(); }}><Ticket size={17}/>{t('Đặt vé ngay', 'Book now')}</button></div>
    </section></div>}
  </main>;
}
