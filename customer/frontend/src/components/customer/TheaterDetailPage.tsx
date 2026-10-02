import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Film, MapPin, Phone, Sparkles, Ticket, Users } from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = {
  theaters: any[];
  selectedTheaterId: number | null;
  language: 'vi' | 'en';
  onSelectTheater: (theater: any) => void;
  onViewSchedule: () => void;
};

export default function TheaterDetailPage({ theaters, selectedTheaterId, language, onSelectTheater, onViewSchedule }: Props) {
  const [theater, setTheater] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const selected = theaters.find(item => item.id === selectedTheaterId) || theaters[0];
  const isEn = language === 'en';
  const t = (vi: string, en: string) => isEn ? en : vi;

  useEffect(() => {
    if (!selected?.id) return;
    setLoading(true);
    setTheater(null);
    fetch(`${API_URL}?action=theater_detail&theater_id=${selected.id}`)
      .then(response => response.json())
      .then(result => setTheater(result?.theater || null))
      .catch(() => setTheater(null))
      .finally(() => setLoading(false));
  }, [selected?.id]);

  const current = theater || selected;
  const highlights = (isEn ? current?.highlightsEn : current?.highlights) || [];
  const facilities = (isEn ? current?.facilitiesEn : current?.facilities) || [];

  return <main className="theater-detail-page">
    <section className="theater-detail-heading">
      <div>
        <div className="theater-kicker">AURORA CINEMA · {t('HỆ THỐNG RẠP', 'CINEMA NETWORK')}</div>
        <h1>{t('Khám phá rạp Aurora', 'Discover Aurora Cinemas')}</h1>
        <p>{t('Chọn một cụm rạp để xem không gian, công nghệ và tiện ích riêng biệt.', 'Choose a cinema to explore its unique space, technology and amenities.')}</p>
      </div>
      <div className="theater-picker" aria-label={t('Chọn rạp', 'Select cinema')}>
        {theaters.map(item => <button key={item.id} onClick={() => onSelectTheater(item)} className={item.id === selected?.id ? 'active' : ''}>{item.name}</button>)}
      </div>
    </section>

    {!current ? <div className="theater-empty">{t('Chưa có thông tin rạp.', 'No cinema information available.')}</div> : <>
      <section className="theater-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7,18,35,.94) 0%, rgba(7,18,35,.72) 48%, rgba(7,18,35,.28) 100%), url("${current.heroImageUrl || ''}")` }}>
        <div className="theater-hero-content">
          <div className="theater-eyebrow"><Sparkles size={15} /> {current.city}</div>
          <h2>{current.name}</h2>
          <p>{isEn ? current.shortDescriptionEn : current.shortDescription}</p>
          <div className="theater-address"><MapPin size={16} /> {current.address}</div>
          <button onClick={onViewSchedule} className="theater-primary-btn"><CalendarDays size={16} /> {t('Xem lịch chiếu tại rạp', 'View cinema showtimes')} <ArrowRight size={15} /></button>
        </div>
      </section>

      {loading ? <div className="theater-loading">{t('Đang tải thông tin rạp...', 'Loading cinema details...')}</div> : <div className="theater-content-grid">
        <section className="theater-main-card">
          <div className="theater-section-label"><Film size={17} /> {t('CÂU CHUYỆN CỦA RẠP', 'THE CINEMA STORY')}</div>
          <h3>{t('Một trải nghiệm được thiết kế riêng cho bạn', 'An experience designed for you')}</h3>
          <p>{isEn ? current.descriptionEn : current.description}</p>
          <div className="theater-feature-grid">
            {highlights.map((item: string) => <div key={item} className="theater-feature"><CheckCircle2 size={17} />{item}</div>)}
          </div>
        </section>
        <aside className="theater-info-card">
          <div className="theater-section-label"><Ticket size={17} /> {t('THÔNG TIN RẠP', 'CINEMA INFO')}</div>
          <div className="theater-stat"><Film /><span><b>{current.screenCount || selected?.screens?.length || 0}</b>{t(' phòng chiếu', ' auditoriums')}</span></div>
          <div className="theater-stat"><Users /><span><b>{Number(current.totalSeats || 0).toLocaleString('vi-VN')}</b>{t(' ghế phục vụ', ' seats')}</span></div>
          <div className="theater-stat"><Clock3 /><span><small>{t('Giờ hoạt động', 'Opening hours')}</small><b>{current.openingHours || '09:00 - 23:00'}</b></span></div>
          <div className="theater-stat"><Phone /><span><small>{t('Hotline', 'Hotline')}</small><b>{current.contactPhone || '1900 2088'}</b></span></div>
          {current.mapUrl && <a className="theater-map-link" href={current.mapUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> {t('Chỉ đường đến rạp', 'Get directions')}</a>}
        </aside>
      </div>}

      <section className="theater-facilities">
        <div><div className="theater-section-label"><Sparkles size={17} /> {t('TIỆN ÍCH', 'AMENITIES')}</div><h3>{t('Thoải mái từ lúc đến rạp đến khi phim khép lại', 'Comfort from arrival until the final credits')}</h3></div>
        <div className="theater-facility-list">{facilities.map((item: string) => <div key={item}><CheckCircle2 size={16} />{item}</div>)}</div>
      </section>
    </>}
  </main>;
}
