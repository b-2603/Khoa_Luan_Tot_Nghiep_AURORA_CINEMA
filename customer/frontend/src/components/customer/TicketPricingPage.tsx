import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Info, Loader2, ShieldCheck, Sparkles, Ticket, Users } from 'lucide-react';

const API = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';
type Lang = 'vi' | 'en';
type PriceDate = { date: string; dayType: string; isHoliday: boolean; holidayName: string };
type TicketType = { id: number; name: string; code: string; description: string; basePrice: number; prices: Record<string, number> };
type PricingData = { selectedDate: string; dayType: string; isHoliday: boolean; holidayName: string; dates: PriceDate[]; ticketTypes: TicketType[]; timeSlots: { key: string; start: string }[]; updatedAt: string };

function money(value: number) { return Number(value || 0).toLocaleString('vi-VN') + 'đ'; }
function tr(lang: Lang, vi: string, en: string) { return lang === 'en' ? en : vi; }
function vietnamToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function dateInfo(value: string, lang: Lang) {
  const date = new Date(`${value}T00:00:00+07:00`);
  return {
    weekday: date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' }),
    day: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }),
    full: date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
  };
}

const ticketMeta: Record<string, { vi: string; en: string; descVi: string; descEn: string; icon: typeof Ticket; color: string; bg: string }> = {
  TICKET_REGULAR: { vi: 'Vé tiêu chuẩn', en: 'Standard ticket', descVi: 'Dành cho khách hàng phổ thông', descEn: 'For general customers', icon: Ticket, color: '#1d4ed8', bg: '#eff6ff' },
  TICKET_CHILD: { vi: 'Vé trẻ em', en: 'Child ticket', descVi: 'Áp dụng theo quy định chiều cao tại rạp', descEn: 'Subject to cinema height policy', icon: Users, color: '#15803d', bg: '#f0fdf4' },
  TICKET_STUDENT: { vi: 'Học sinh – sinh viên', en: 'Student ticket', descVi: 'Xuất trình thẻ còn hiệu lực khi nhận vé', descEn: 'Valid student ID required', icon: ShieldCheck, color: '#7e22ce', bg: '#faf5ff' },
  TICKET_COUPLE: { vi: 'Vé ghế đôi', en: 'Couple seat', descVi: 'Giá trọn gói cho một ghế đôi', descEn: 'Package price for one couple seat', icon: Sparkles, color: '#be185d', bg: '#fdf2f8' },
};

export default function TicketPricingPage({ language, onViewSchedule }: { language: Lang; onViewSchedule: () => void }) {
  const [data, setData] = useState<PricingData | null>(null);
  const [selectedDate, setSelectedDate] = useState(vietnamToday);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API}?action=ticket_prices&date=${encodeURIComponent(selectedDate)}`, { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Cannot load prices');
        return result;
      })
      .then(result => setData(result))
      .catch(err => { if (err.name !== 'AbortError') setError(tr(language, 'Không thể tải bảng giá. Vui lòng thử lại.', 'Unable to load ticket prices. Please try again.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedDate]);

  const dayLabel = data?.dayType === 'holiday' ? tr(language, 'Ngày lễ', 'Holiday') : data?.dayType === 'weekend' ? tr(language, 'Cuối tuần', 'Weekend') : tr(language, 'Ngày thường', 'Weekday');

  return (
    <main className="aurora-ticket-page">
      <style>{`
        .aurora-ticket-page{min-height:100%;background:#f4f7fb;color:#10233e;padding-bottom:52px}.at-wrap{max-width:1180px;margin:0 auto;padding:0 18px}.at-hero{position:relative;overflow:hidden;background:linear-gradient(120deg,#07182e 0%,#102f55 62%,#17416f 100%);color:white;padding:42px 0 84px}.at-hero:after{content:"";position:absolute;width:360px;height:360px;border-radius:50%;right:-80px;top:-190px;background:rgba(244,192,74,.15);box-shadow:0 0 0 60px rgba(244,192,74,.05)}.at-date-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:9px}.at-date{border:1px solid #d9e3ee;background:white;border-radius:13px;padding:11px 7px;color:#56708a;cursor:pointer;transition:.18s ease}.at-date:hover{transform:translateY(-2px);border-color:#e2ae34}.at-date.active{background:#102c4d;border-color:#102c4d;color:white;box-shadow:0 8px 20px rgba(13,40,70,.2)}.at-table{width:100%;border-collapse:separate;border-spacing:0}.at-table th,.at-table td{padding:17px 18px;border-bottom:1px solid #e7edf4}.at-table th{background:#f7f9fc;text-align:center;color:#60758a;font-size:11px;text-transform:uppercase;letter-spacing:.5px}.at-table th:first-child{text-align:left}.at-table tr:last-child td{border-bottom:0}.at-ticket-cell{display:flex;align-items:center;gap:12px}.at-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none}.at-price{text-align:center;font-size:16px;font-weight:850;color:#10233e}.at-price small{display:block;margin-top:3px;color:#8495a7;font-size:10px;font-weight:600}.at-notes{display:grid;grid-template-columns:1fr 1fr;gap:16px}.spin{animation:at-spin .8s linear infinite}@keyframes at-spin{to{transform:rotate(360deg)}}@media(max-width:760px){.at-hero{padding:30px 0 70px}.at-date-grid{grid-template-columns:repeat(4,1fr)}.at-table-wrap{overflow-x:auto}.at-table{min-width:700px}.at-notes{grid-template-columns:1fr}.at-title{font-size:28px!important}}@media(max-width:460px){.at-date-grid{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      <section className="at-hero">
        <div className="at-wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 99, background: 'rgba(244,192,74,.13)', border: '1px solid rgba(244,192,74,.35)', color: '#f8ce66', fontSize: 11, fontWeight: 800, letterSpacing: .7 }}><Ticket size={14} /> AURORA CINEMA</div>
          <h1 className="at-title" style={{ margin: '14px 0 8px', fontSize: 36, lineHeight: 1.15, fontWeight: 900 }}>{tr(language, 'Bảng giá vé xem phim', 'Cinema ticket prices')}</h1>
          <p style={{ margin: 0, maxWidth: 610, color: '#c7d6e6', fontSize: 14, lineHeight: 1.7 }}>{tr(language, 'Chọn ngày dự kiến xem phim để tham khảo mức giá đang áp dụng theo từng loại vé và khung giờ.', 'Choose your movie date to see applicable prices by ticket type and time slot.')}</p>
        </div>
      </section>

      <div className="at-wrap" style={{ marginTop: -50, position: 'relative', zIndex: 2 }}>
        <section style={{ background: '#fff', border: '1px solid #e0e7ef', borderRadius: 18, padding: '20px', boxShadow: '0 16px 40px rgba(15,39,68,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 15 }}>
            <div><div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 850 }}><CalendarDays size={17} color="#d28b0b" />{tr(language, 'Chọn ngày xem phim', 'Select movie date')}</div><div style={{ marginTop: 4, color: '#8092a4', fontSize: 11.5 }}>{tr(language, 'Giá được cập nhật theo ngày bạn chọn', 'Prices update for your selected date')}</div></div>
            {data && <span style={{ padding: '6px 10px', borderRadius: 99, background: data.isHoliday ? '#fff1f2' : data.dayType === 'weekend' ? '#fff7e6' : '#edf8f2', color: data.isHoliday ? '#be123c' : data.dayType === 'weekend' ? '#a16207' : '#15803d', fontSize: 11, fontWeight: 800 }}>{data.holidayName || dayLabel}</span>}
          </div>
          <div className="at-date-grid">
            {(data?.dates || []).map(item => { const info = dateInfo(item.date, language); const active = item.date === selectedDate; return <button key={item.date} className={`at-date${active ? ' active' : ''}`} onClick={() => setSelectedDate(item.date)}><div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', opacity: .8 }}>{info.weekday}</div><div style={{ marginTop: 3, fontSize: 14, fontWeight: 900 }}>{info.day}</div>{item.isHoliday && <div style={{ marginTop: 3, fontSize: 8.5, color: active ? '#f8ce66' : '#dc294f', fontWeight: 800 }}>{tr(language, 'NGÀY LỄ', 'HOLIDAY')}</div>}</button>; })}
          </div>
        </section>

        <section style={{ marginTop: 18, background: '#fff', border: '1px solid #e0e7ef', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 28px rgba(15,39,68,.06)' }}>
          <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #e7edf4' }}>
            <div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{tr(language, 'Giá vé áp dụng', 'Applicable ticket prices')}</h2><div style={{ marginTop: 5, color: '#71869b', fontSize: 12 }}>{data ? `${dateInfo(data.selectedDate, language).full} · ${dayLabel}` : tr(language, 'Đang tải dữ liệu...', 'Loading data...')}</div></div>
            <button onClick={onViewSchedule} style={{ border: 0, borderRadius: 10, background: 'linear-gradient(135deg,#f4c04a,#e8a020)', color: '#10233e', padding: '10px 15px', fontSize: 12, fontWeight: 850, cursor: 'pointer', boxShadow: '0 6px 16px rgba(232,160,32,.24)' }}>{tr(language, 'XEM LỊCH CHIẾU', 'VIEW SHOWTIMES')}</button>
          </div>

          {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: '#6d8297', fontSize: 13 }}><Loader2 size={20} className="spin" />{tr(language, 'Đang cập nhật bảng giá...', 'Updating prices...')}</div> : error ? <div style={{ padding: 60, textAlign: 'center', color: '#b42318' }}>{error}</div> : (
            <div className="at-table-wrap"><table className="at-table"><thead><tr><th>{tr(language, 'Loại vé', 'Ticket type')}</th>{data?.timeSlots.map(slot => <th key={slot.key}><Clock3 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />{slot.key === 'morning' ? tr(language, 'Buổi sáng', 'Morning') : slot.key === 'standard' ? tr(language, 'Ban ngày', 'Daytime') : tr(language, 'Buổi tối', 'Evening')}<div style={{ marginTop: 4, fontSize: 9, fontWeight: 600, textTransform: 'none', color: '#92a2b2' }}>{slot.key === 'morning' ? tr(language, 'Trước 12:00', 'Before 12:00') : slot.key === 'standard' ? tr(language, '12:00 – trước 18:00', '12:00 – before 18:00') : tr(language, 'Từ 18:00', 'From 18:00')}</div></th>)}</tr></thead><tbody>{data?.ticketTypes.map(ticket => { const meta = ticketMeta[ticket.code] || ticketMeta.TICKET_REGULAR; const Icon = meta.icon; return <tr key={ticket.id}><td><div className="at-ticket-cell"><div className="at-icon" style={{ background: meta.bg, color: meta.color }}><Icon size={20} /></div><div><div style={{ fontSize: 13.5, fontWeight: 850 }}>{tr(language, meta.vi, meta.en)}</div><div style={{ marginTop: 3, color: '#8495a6', fontSize: 10.5 }}>{tr(language, meta.descVi, meta.descEn)}</div></div></div></td>{data.timeSlots.map(slot => <td className="at-price" key={slot.key}>{money(ticket.prices[slot.key])}<small>{tr(language, 'đã gồm thuế', 'tax included')}</small></td>)}</tr>; })}</tbody></table></div>
          )}
        </section>

        <div className="at-notes" style={{ marginTop: 18 }}>
          <section style={{ borderRadius: 16, padding: 20, background: '#102b4c', color: '#fff', boxShadow: '0 10px 25px rgba(13,39,69,.14)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#f4c04a', fontSize: 13, fontWeight: 850 }}><Info size={17} />{tr(language, 'Thông tin cần biết', 'Good to know')}</div><ul style={{ margin: '13px 0 0', paddingLeft: 18, color: '#c9d7e5', fontSize: 12, lineHeight: 1.85 }}><li>{tr(language, 'Giá vé có thể thay đổi vào ngày lễ và theo chương trình đặc biệt.', 'Prices may vary on holidays and special programs.')}</li><li>{tr(language, 'Vé trẻ em và sinh viên cần giấy tờ hợp lệ khi soát vé.', 'Child and student tickets require valid identification.')}</li><li>{tr(language, 'Giá ghế VIP hoặc định dạng đặc biệt được hiển thị ở bước chọn ghế.', 'VIP seat and premium-format pricing is shown during seat selection.')}</li></ul></section>
          <section style={{ borderRadius: 16, padding: 20, background: '#fff', border: '1px solid #e0e7ef' }}><div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#172f4b', fontSize: 13, fontWeight: 850 }}><CheckCircle2 size={18} color="#16a34a" />{tr(language, 'Minh bạch và đồng bộ', 'Transparent and consistent')}</div><p style={{ margin: '12px 0 0', color: '#6f8397', fontSize: 12, lineHeight: 1.75 }}>{tr(language, 'Mức giá trên được đồng bộ với hệ thống vận hành Aurora. Giá cuối cùng của đơn hàng sẽ được xác nhận trước khi thanh toán.', 'These prices are synchronized with Aurora operations. Your final order price is confirmed before payment.')}</p></section>
        </div>
      </div>
    </main>
  );
}
