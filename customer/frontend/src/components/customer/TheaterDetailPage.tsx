import { useEffect, useState } from 'react';
import {
  AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Clock3,
  Film, MapPin, Navigation, Phone, RefreshCw, ShieldCheck, Sparkles, Ticket, Users,
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = {
  theaters: any[];
  movies: any[];
  selectedTheaterId: number | null;
  language: 'vi' | 'en';
  onSelectTheater: (theater: any) => void;
  onViewSchedule: () => void;
  onBook: (movie: any, showtime: any, theaterName: string) => void;
};

function formatDate(value: string, locale: string, withYear = false) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short', day: '2-digit', month: '2-digit', ...(withYear ? { year: 'numeric' as const } : {}), timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function timeOf(value: string) {
  return String(value || '').slice(11, 16) || '—';
}

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

export default function TheaterDetailPage({ theaters, movies, selectedTheaterId, language, onSelectTheater, onViewSchedule, onBook }: Props) {
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const selected = theaters.find(item => Number(item.id) === Number(selectedTheaterId)) || theaters[0];

  useEffect(() => { setSelectedDate(''); }, [selected?.id]);

  useEffect(() => {
    if (!selected?.id) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API_URL}?action=theater_detail&theater_id=${selected.id}${selectedDate ? `&date=${encodeURIComponent(selectedDate)}` : ''}`, {
      credentials: 'include', cache: 'no-store', signal: controller.signal,
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || t('Không thể tải thông tin rạp.', 'Unable to load cinema details.'));
        return result;
      })
      .then(result => setDetail(result.theater || null))
      .catch(cause => { if (cause.name !== 'AbortError') { setDetail(null); setError(cause.message || t('Không thể tải thông tin rạp.', 'Unable to load cinema details.')); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selected?.id, selectedDate, refreshTick, language]);

  const current = detail || selected;
  const date = detail?.scheduleDate || selectedDate;
  const dates = detail?.availableDates || [];
  const showtimes = detail?.showtimes || [];
  const rooms = detail?.rooms || [];
  const operation = detail?.operation || {};
  const highlights = (language === 'en' ? detail?.highlightsEn : detail?.highlights) || [];
  const facilities = (language === 'en' ? detail?.facilitiesEn : detail?.facilities) || [];

  function recordEvent(eventType: string, theaterId = Number(current?.id || 0), showtimeId = 0, eventDate = date) {
    if (!theaterId || !eventDate) return;
    fetch(`${API_URL}?action=theater_detail_event`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, theaterId, showtimeId, selectedDate: eventDate }),
    }).catch(() => {});
  }

  function chooseTheater(theater: any) {
    onSelectTheater(theater);
    const eventDate = detail?.availableDates?.[0] || date;
    if (eventDate) recordEvent('SELECT_THEATER', Number(theater.id), 0, eventDate);
  }

  function chooseDate(value: string) {
    setSelectedDate(value);
    recordEvent('SELECT_DATE', Number(current?.id || 0), 0, value);
  }

  function openSchedule() {
    recordEvent('VIEW_SCHEDULE');
    onViewSchedule();
  }

  function bookShowtime(showtime: any) {
    const movie = movies.find(item => Number(item.id) === Number(showtime.movie_id));
    if (!movie) { openSchedule(); return; }
    recordEvent('SELECT_SHOWTIME', Number(current?.id || 0), Number(showtime.id));
    onBook(movie, showtime, current?.name || selected?.name || 'Aurora Cinema');
  }

  if (!selected) return <main className="theater-profile-v2"><div className="theater-profile-state"><Film size={34}/><b>{t('Chưa có cụm rạp trong hệ thống.', 'No cinemas are available.')}</b></div></main>;

  return <main className="theater-profile-v2">
    <div className="theater-profile-shell">
      <header className="theater-profile-heading">
        <div><span><Sparkles size={14}/>{t('Mạng lưới Aurora Cinema', 'Aurora Cinema network')}</span><h1>{t('Không gian điện ảnh dành cho bạn', 'A cinema experience made for you')}</h1><p>{t('Khám phá từng cụm rạp, tiện ích, phòng chiếu và lịch vận hành theo dữ liệu thực.', 'Explore each cinema, its amenities, auditoriums and live operating schedule.')}</p></div>
        <div className="theater-profile-picker" aria-label={t('Chọn cụm rạp', 'Choose cinema')}>{theaters.map(item => <button key={item.id} className={Number(item.id) === Number(selected.id) ? 'active' : ''} onClick={() => chooseTheater(item)}><span>{item.name}</span><small>{item.city}</small></button>)}</div>
      </header>

      {error && !detail ? <section className="theater-profile-state error"><AlertCircle size={36}/><b>{t('Không thể tải dữ liệu rạp', 'Unable to load cinema data')}</b><p>{error}</p><button onClick={() => setRefreshTick(value => value + 1)}><RefreshCw size={15}/>{t('Thử lại', 'Try again')}</button></section> : <>
        <section className={`theater-profile-hero ${loading ? 'loading' : ''}`}>
          {current?.heroImageUrl ? <img src={current.heroImageUrl} alt=""/> : null}<div className="theater-profile-hero-shade"/>
          <div className="theater-profile-hero-copy"><span className="theater-profile-live"><i/>{t('Dữ liệu vận hành trực tiếp', 'Live operational data')}</span><small><MapPin size={13}/>{current?.city || t('Hệ thống Aurora', 'Aurora network')}</small><h2>{current?.name}</h2><p>{(language === 'en' ? current?.shortDescriptionEn : current?.shortDescription) || t('Điểm đến điện ảnh hiện đại với lịch chiếu linh hoạt mỗi ngày.', 'A modern cinema destination with flexible daily showtimes.')}</p><div className="theater-profile-address"><MapPin size={15}/>{current?.address}</div><div className="theater-profile-actions"><button onClick={openSchedule}><CalendarDays size={16}/>{t('Xem lịch và đặt vé', 'View showtimes & book')}<ArrowRight size={15}/></button>{current?.mapUrl && <a href={current.mapUrl} target="_blank" rel="noreferrer" onClick={() => recordEvent('OPEN_DIRECTIONS')}><Navigation size={15}/>{t('Chỉ đường', 'Directions')}</a>}</div></div>
          <aside className="theater-profile-facts"><div><Film/><span><b>{current?.screenCount || 0}</b>{t('phòng chiếu', 'screens')}</span></div><div><Users/><span><b>{Number(current?.totalSeats || 0).toLocaleString('vi-VN')}</b>{t('ghế ngồi', 'seats')}</span></div><div><Clock3/><span><b>{current?.openingHours || '—'}</b>{t('giờ hoạt động', 'operating hours')}</span></div></aside>
        </section>

        <section className="theater-profile-metrics">
          <div><CalendarDays/><span><small>{t('Suất chiếu trong ngày', 'Daily showtimes')}</small><b>{loading ? '—' : operation.showtimeCount || 0}</b></span></div>
          <div><Film/><span><small>{t('Phòng có lịch', 'Scheduled rooms')}</small><b>{loading ? '—' : `${operation.activeRoomCount || 0}/${current?.screenCount || 0}`}</b></span></div>
          <div><Users/><span><small>{t('Tỷ lệ lấp đầy', 'Occupancy')}</small><b>{loading ? '—' : `${operation.occupancyPercent || 0}%`}</b></span></div>
          <div><Clock3/><span><small>{t('Suất gần nhất', 'Next showtime')}</small><b>{loading ? '—' : timeOf(operation.nextShowtime)}</b></span></div>
          <div><Phone/><span><small>{t('Hỗ trợ tại rạp', 'Cinema support')}</small><b>{current?.contactPhone || '1900 2088'}</b></span></div>
        </section>

        <section className="theater-profile-schedule">
          <div className="theater-profile-section-head"><div><span><CalendarDays size={14}/>{t('Lịch chiếu tại rạp', 'Cinema showtimes')}</span><h2>{t('Chọn suất chiếu phù hợp', 'Choose your ideal showtime')}</h2><p>{date ? formatDate(date, locale, true) : t('Đang cập nhật lịch chiếu', 'Updating showtimes')}</p></div><button onClick={openSchedule}>{t('Xem toàn bộ lịch', 'View full schedule')}<ChevronRight size={15}/></button></div>
          <div className="theater-profile-dates">{dates.map((item: string, index: number) => <button key={item} className={item === date ? 'active' : ''} onClick={() => chooseDate(item)}><small>{index === 0 ? t('Hôm nay', 'Today') : formatDate(item, locale).split(',')[0]}</small><b>{formatDate(item, locale).split(',').slice(-1)[0].trim()}</b></button>)}</div>
          {loading ? <div className="theater-profile-loading">{Array.from({ length: 4 }, (_, index) => <i key={index}/>)}</div> : showtimes.length ? <div className="theater-profile-showtimes">{showtimes.map((showtime: any) => <article key={showtime.id}>
            <div className="theater-profile-time"><b>{timeOf(showtime.starts_at)}</b><small>{timeOf(showtime.ends_at)}</small></div>
            <div className="theater-profile-poster">{showtime.poster_url ? <img src={showtime.poster_url} alt=""/> : <Film size={18}/>}</div>
            <div className="theater-profile-show-copy"><h3>{showtime.movie_title}</h3><p>{showtime.screen_name} · {showtime.format || '2D Digital'} · {showtime.age_rating || 'P'}</p><span className={String(showtime.availability).toLowerCase()}><Users size={12}/>{showtime.availability === 'SOLD_OUT' ? t('Hết ghế', 'Sold out') : `${showtime.seats_left} ${t('ghế còn lại', 'seats left')}`}</span></div>
            <div className="theater-profile-price"><small>{t('Từ', 'From')}</small><b>{money(showtime.ticket_price)}</b></div>
            <button disabled={showtime.availability === 'SOLD_OUT'} onClick={() => bookShowtime(showtime)}><Ticket size={14}/>{t('Đặt vé', 'Book')}</button>
          </article>)}</div> : <div className="theater-profile-state compact"><Film size={28}/><b>{t('Chưa có suất chiếu cho ngày này', 'No showtimes for this date')}</b><p>{t('Hãy chọn một ngày khác trong lịch.', 'Choose another date in the schedule.')}</p></div>}
        </section>

        <section className="theater-profile-detail-grid">
          <article className="theater-profile-about"><span><Sparkles size={14}/>{t('Trải nghiệm tại rạp', 'Cinema experience')}</span><h2>{t('Được thiết kế cho từng khoảnh khắc điện ảnh', 'Designed for every cinematic moment')}</h2><p>{(language === 'en' ? current?.descriptionEn : current?.description) || t('Thông tin trải nghiệm đang được cập nhật từ hệ thống.', 'Experience information is being updated.')}</p><div>{highlights.map((item: string) => <span key={item}><CheckCircle2 size={15}/>{item}</span>)}</div></article>
          <article className="theater-profile-rooms"><span><Film size={14}/>{t('Phòng chiếu', 'Auditoriums')}</span><h2>{t('Tình trạng vận hành theo ngày', 'Daily operational status')}</h2><div>{rooms.map((room: any) => <section key={room.id}><i className={room.operation_status === 'RUNNING' ? 'running' : room.showtime_count ? 'scheduled' : ''}/><div><b>{room.name}</b><small>{room.total_seats} {t('ghế', 'seats')} · {room.showtime_count} {t('suất', 'shows')}</small></div><aside><strong>{room.occupancy_percent}%</strong><span><i style={{ width: `${room.occupancy_percent}%` }}/></span></aside></section>)}</div></article>
        </section>

        <section className="theater-profile-amenities"><div><span><ShieldCheck size={16}/>{t('Tiện ích & dịch vụ', 'Amenities & services')}</span><h2>{t('Một buổi xem phim trọn vẹn hơn', 'A more complete movie experience')}</h2></div><div>{facilities.length ? facilities.map((item: string) => <span key={item}><CheckCircle2 size={15}/>{item}</span>) : <span><CheckCircle2 size={15}/>{t('Tiện ích đang được cập nhật', 'Amenities are being updated')}</span>}</div></section>

        <footer className="theater-profile-note"><span><CheckCircle2 size={15}/>{t('Thông tin vận hành được đồng bộ trực tiếp từ aurora_db.', 'Operational information is synchronized directly from aurora_db.')}</span><small>{detail?.serverTime ? `${t('Cập nhật', 'Updated')} ${timeOf(detail.serverTime)}` : ''}</small></footer>
      </>}
    </div>
  </main>;
}
