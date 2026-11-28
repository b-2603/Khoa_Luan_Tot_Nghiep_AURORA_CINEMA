import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Building2, CalendarDays, Check, CheckCircle2, Clock3, Copy, CreditCard,
  Download, Film, Loader2, MapPin, Popcorn, QrCode, ReceiptText, RefreshCw,
  ShieldCheck, Sparkles, Ticket, User, XCircle, Zap,
} from 'lucide-react';
import { saveBookingReceiptPdf, type BookingDetail } from '../../lib/bookingReceiptPdf';

export type ActiveOnlinePayment = {
  id: number;
  provider: 'VIETQR' | 'VNPAY' | 'MOMO' | string;
  txnRef: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | string;
  expiresAt?: string;
  paidAt?: string | null;
  vietqrUrl?: string | null;
  qrPayload?: string | null;
  bankId?: string | null;
  bankCode?: string | null;
  accountNo?: string | null;
  accountName?: string | null;
  transferContent?: string | null;
  sepayAutoSync?: boolean;
  simulationEnabled?: boolean;
  providerTransactionNo?: string | null;
};

export type IssuedTicket = {
  code: string;
  seat: string;
  seatType: string;
  price: number;
  status: string;
  issuedAt: string;
  checkedInAt?: string | null;
  qrPayload: string;
};

type Props = {
  apiBase: string;
  lang: 'vi' | 'en';
  initialPayment: ActiveOnlinePayment;
  bookingId: number;
  bookingCode: string;
  movieTitle: string;
  theaterName: string;
  screenName: string;
  startsAt: string;
  seatsDisplay: string[];
  onDone: () => void;
};

const fmtMoney = (v: unknown) => `${Number(v || 0).toLocaleString('vi-VN')} đ`;
const fmtDateTime = (v: unknown) => (v ? new Date(String(v).replace(' ', 'T')).toLocaleString('vi-VN') : '—');

export default function AutoPaymentTicketStep({
  apiBase, lang, initialPayment, bookingId, bookingCode,
  movieTitle, theaterName, screenName, startsAt, seatsDisplay, onDone,
}: Props) {
  const t = useCallback((vi: string, en: string) => (lang === 'en' ? en : vi), [lang]);
  const [payment, setPayment] = useState<ActiveOnlinePayment>(initialPayment);
  const [tickets, setTickets] = useState<IssuedTicket[]>([]);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [ticketQrMap, setTicketQrMap] = useState<Record<string, string>>({});
  const [inlineQrDataUrl, setInlineQrDataUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string>('');
  const [simulating, setSimulating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!initialPayment.expiresAt) return 600;
    const diff = Math.floor((new Date(initialPayment.expiresAt.replace(' ', 'T')).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const stoppedRef = useRef(false);

  const status = String(payment.status || 'PENDING').toUpperCase();
  const isPaid = status === 'PAID';
  const isPending = status === 'PENDING';
  const provider = String(payment.provider || 'VIETQR').toUpperCase();

  // Generate QR data URL for non-VietQR inline payloads (VNPAY / MoMo inline QR)
  useEffect(() => {
    if (payment.vietqrUrl || !payment.qrPayload) return;
    let active = true;
    QRCode.toDataURL(payment.qrPayload, { width: 280, margin: 2, color: { dark: '#0d1b2e', light: '#ffffff' } })
      .then((url) => { if (active) setInlineQrDataUrl(url); })
      .catch(() => {});
    return () => { active = false; };
  }, [payment.vietqrUrl, payment.qrPayload]);

  // Generate scannable QR images for every issued e-ticket as soon as tickets arrive
  useEffect(() => {
    if (!tickets.length) return;
    let active = true;
    Promise.all(
      tickets.map(async (tk) => {
        const url = await QRCode.toDataURL(tk.qrPayload || tk.code, {
          width: 240, margin: 1, color: { dark: '#0d1b2e', light: '#ffffff' },
        });
        return [tk.code, url] as const;
      }),
    )
      .then((entries) => {
        if (active) setTicketQrMap(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [tickets]);

  // Fetch full booking detail (poster, cinema address, customer, concessions, payment proof) as soon as PAID
  useEffect(() => {
    if (!isPaid || !bookingId) return;
    let active = true;
    fetch(`${apiBase}?action=booking_detail&id=${bookingId}`, { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data?.booking) return;
        const detail = data.booking as BookingDetail;
        setBookingDetail(detail);
        if (Array.isArray(detail.tickets) && detail.tickets.length > 0) {
          setTickets(detail.tickets);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isPaid, bookingId, apiBase]);

  // Countdown timer while pending
  useEffect(() => {
    if (!isPending) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPending]);

  // Poll backend every 3 seconds for automatic payment confirmation (SePay / VNPAY / MoMo)
  const checkStatus = useCallback(async (manual = false) => {
    if (manual) setChecking(true);
    try {
      const res = await fetch(`${apiBase}?action=payment_status&txn_ref=${encodeURIComponent(payment.txnRef)}`, {
        credentials: 'include', cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('Không thể kiểm tra giao dịch.', 'Unable to check payment.'));
      if (stoppedRef.current) return null;
      if (data.payment) {
        setPayment((prev) => ({
          ...prev,
          ...data.payment,
          simulationEnabled: prev.simulationEnabled,
        }));
      }
      if (Array.isArray(data.tickets) && data.tickets.length > 0) {
        setTickets(data.tickets);
      }
      setError('');
      return data;
    } catch (e) {
      if (!stoppedRef.current && manual) {
        setError(e instanceof Error ? e.message : t('Không thể kiểm tra giao dịch.', 'Unable to check payment.'));
      }
      return null;
    } finally {
      if (!stoppedRef.current && manual) setChecking(false);
    }
  }, [apiBase, payment.txnRef, t]);

  useEffect(() => {
    stoppedRef.current = false;
    if (!isPending) return;
    const poll = window.setInterval(() => {
      void checkStatus(false);
    }, 3000);
    return () => {
      stoppedRef.current = true;
      window.clearInterval(poll);
    };
  }, [isPending, checkStatus]);

  async function handleCopy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(''), 1800);
    } catch {}
  }

  async function handleSimulatePaid() {
    setSimulating(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}?action=payment_simulate_paid`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnRef: payment.txnRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('Không thể giả lập thanh toán.', 'Unable to complete test payment.'));
      await checkStatus(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Lỗi xử lý thanh toán.', 'Payment error.'));
    } finally {
      setSimulating(false);
    }
  }

  async function handleDownloadPdf() {
    setDownloadingPdf(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}?action=booking_detail&id=${bookingId}`, {
        credentials: 'include', cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.booking) throw new Error(data.message || t('Không thể tải biên nhận PDF.', 'Unable to load PDF receipt.'));
      await saveBookingReceiptPdf(data.booking as BookingDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Không thể xuất file PDF.', 'Unable to export PDF.'));
    } finally {
      setDownloadingPdf(false);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const providerBadgeColor =
    provider === 'MOMO' ? '#a50064' : provider === 'VNPAY' ? '#005baa' : '#0d1b2e';
  const providerTitle =
    provider === 'MOMO'
      ? 'Ví MoMo QR'
      : provider === 'VNPAY'
      ? 'VNPAY QR'
      : `VietQR · Ngân hàng ${payment.bankId || payment.bankCode || 'MB'}`;

  /* ═══════════════════════════ PAID → E-TICKET VIEW ═══════════════════════════ */
  if (isPaid) {
    const detail = bookingDetail;
    const displayTickets = detail?.tickets?.length ? detail.tickets : tickets;
    const concessions = detail?.concessions || [];
    const seatsSummary = detail?.seats?.length
      ? detail.seats
      : displayTickets.map((tk) => ({ label: tk.seat, type: tk.seatType, price: tk.price }));
    const subtotalVal = detail?.order?.subtotal ?? payment.amount;
    const discountVal = detail?.order?.discountAmount ?? 0;
    const totalVal = detail?.order?.totalAmount ?? detail?.total_amount ?? payment.amount;
    const txNo = detail?.onlinePayment?.providerTransactionNo || payment.providerTransactionNo || payment.txnRef;
    const paidTime = detail?.onlinePayment?.paidAt || payment.paidAt || detail?.created_at;

    return (
      <div style={{ maxWidth: 980, margin: '0 auto', paddingBottom: 44 }}>
        {/* 1. Success Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #0d1b2e 0%, #162e4d 100%)',
          color: '#ffffff',
          borderRadius: 18,
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          boxShadow: '0 14px 36px rgba(13,27,46,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'rgba(34,197,94,0.18)', border: '2px solid #22c55e',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CheckCircle2 size={28} color="#4ade80" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: '#f4c04a', textTransform: 'uppercase' }}>
                {t('AURORA CINEMA · VÉ ĐIỆN TỬ', 'AURORA CINEMA · E-TICKET')}
              </div>
              <h1 style={{ margin: '4px 0 4px', fontSize: 22, fontWeight: 900 }}>
                {t('Đặt vé thành công!', 'Booking Confirmed!')}
              </h1>
              <div style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{t('Mã đặt vé:', 'Booking code:')} <strong style={{ color: '#f4c04a', fontFamily: 'monospace' }}>{detail?.code || bookingCode}</strong></span>
                <span>·</span>
                <span>{providerTitle}</span>
                {paidTime && <><span>·</span><span>{fmtDateTime(paidTime)}</span></>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 18px', borderRadius: 10, border: 0,
                background: '#f4c04a', color: '#0d1b2e', fontWeight: 800, fontSize: 13,
                cursor: downloadingPdf ? 'wait' : 'pointer',
              }}
            >
              {downloadingPdf ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              {t('Tải vé PDF', 'Download PDF')}
            </button>
            <button
              type="button"
              onClick={onDone}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 18px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.06)',
                color: '#ffffff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              {t('Về trang chủ', 'Back to home')}
            </button>
          </div>
        </div>

        {/* 2. Symmetrical 2-Column Main Layout */}
        <div style={{
          marginTop: 20,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.32fr) minmax(300px, 0.95fr)',
          gap: 20,
          alignItems: 'start',
        }}>
          {/* LEFT COLUMN: Movie/Cinema + Customer + Order Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Card A: Movie & Showtime Details */}
            <div style={{
              background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0',
              padding: 20, boxShadow: '0 6px 20px rgba(15,23,42,0.04)',
            }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {detail?.poster_url ? (
                  <img
                    src={detail.poster_url}
                    alt={detail.movie_title || movieTitle}
                    style={{ width: 84, height: 120, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: '1px solid #e2e8f0' }}
                  />
                ) : (
                  <div style={{ width: 84, height: 120, borderRadius: 10, background: '#0d1b2e', color: '#f4c04a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Film size={28} />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 900, padding: '2px 7px', borderRadius: 5, background: '#fef3c7', color: '#92400e' }}>
                      {detail?.age_rating || 'P'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                      {detail?.format || '2D Digital'}
                      {detail?.duration_minutes ? ` · ${detail.duration_minutes} phút` : ''}
                    </span>
                  </div>
                  <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900, color: '#0d1b2e', lineHeight: 1.3 }}>
                    {detail?.movie_title || movieTitle}
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Building2 size={14} color="#0d1b2e" style={{ flexShrink: 0 }} />
                      <strong>{detail?.theater_name || theaterName}</strong>
                      <span>·</span>
                      <span>{detail?.screen_name || screenName}</span>
                    </div>
                    {detail?.theater_address && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: '#64748b' }}>
                        <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{detail.theater_address}{detail.city ? `, ${detail.city}` : ''}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CalendarDays size={14} color="#0d1b2e" style={{ flexShrink: 0 }} />
                      <strong>{fmtDateTime(detail?.starts_at || startsAt)}</strong>
                      {detail?.ends_at && <span style={{ color: '#64748b', fontSize: 12 }}>→ {String(detail.ends_at).slice(11, 16)}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seat badges row */}
              <div style={{
                marginTop: 16, paddingTop: 14, borderTop: '1px dashed #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                  {t(`Ghế đã đặt (${seatsSummary.length} ghế):`, `Booked seats (${seatsSummary.length}):`)}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {seatsSummary.map((s) => (
                    <span key={s.label} style={{
                      padding: '4px 10px', borderRadius: 7, background: '#0d1b2e', color: '#f4c04a',
                      fontSize: 12, fontWeight: 800,
                    }}>
                      {s.label} ({s.type})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card B: Customer & Order Breakdown */}
            <div style={{
              background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0',
              padding: 20, boxShadow: '0 6px 20px rgba(15,23,42,0.04)',
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13.5, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase', letterSpacing: 0.4, display: 'flex', alignItems: 'center', gap: 7 }}>
                <ReceiptText size={16} color="#f4c04a" />
                {t('Chi tiết đơn hàng', 'Order Summary')}
              </h3>

              {/* Customer + Payment Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><User size={12} /> {t('Khách hàng', 'Customer')}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1b2e', marginTop: 3 }}>{detail?.customer?.fullName || 'Khách hàng Aurora'}</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{detail?.customer?.email || '—'}</div>
                  {detail?.customer?.phone && <div style={{ fontSize: 11.5, color: '#64748b' }}>{detail.customer.phone}</div>}
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><CreditCard size={12} /> {t('Thanh toán', 'Payment')}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1b2e', marginTop: 3 }}>{providerTitle}</div>
                  <div style={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: 800, color: '#15803d', marginTop: 2, wordBreak: 'break-all' }}>{txNo}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{t('Trạng thái:', 'Status:')} <strong>ĐÃ THANH TOÁN</strong></div>
                </div>
              </div>

              {/* Line Items Table */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {seatsSummary.map((s) => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#475569' }}>{t('Vé xem phim', 'Movie ticket')} · Ghế <strong>{s.label}</strong> ({s.type})</span>
                    <strong style={{ color: '#0d1b2e' }}>{fmtMoney(s.price)}</strong>
                  </div>
                ))}
                {concessions.map((c, idx) => (
                  <div key={`${c.code}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Popcorn size={13} color="#d97706" /> {c.name} × {c.quantity}
                    </span>
                    <strong style={{ color: '#0d1b2e' }}>{fmtMoney(c.total)}</strong>
                  </div>
                ))}
                {discountVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#16a34a' }}>
                    <span>{t('Giảm giá ưu đãi', 'Voucher discount')} {detail?.order?.voucherCode ? `(${detail.order.voucherCode})` : ''}</span>
                    <strong>-{fmtMoney(discountVal)}</strong>
                  </div>
                )}
                <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0d1b2e' }}>{t('TỔNG ĐÃ THANH TOÁN', 'TOTAL PAID')}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {t('Tạm tính:', 'Subtotal:')} {fmtMoney(subtotalVal)} · {t('Mã chứng từ:', 'Ref:')} {payment.txnRef}
                    </div>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 900, color: '#b45309' }}>{fmtMoney(totalVal)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Boarding-Pass Style Electronic Tickets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0d1b2e', display: 'flex', alignItems: 'center', gap: 7, textTransform: 'uppercase' }}>
                <Ticket size={16} color="#f4c04a" />
                {t(`Vé điện tử (${displayTickets.length})`, `E-Tickets (${displayTickets.length})`)}
              </h2>
              <span style={{ fontSize: 11.5, color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldCheck size={13} /> {t('Quét tại cửa rạp', 'Scan at gate')}
              </span>
            </div>

            {displayTickets.map((tk) => (
              <div key={tk.code} style={{
                background: '#ffffff', borderRadius: 18, border: '1.5px solid #e2e8f0',
                overflow: 'hidden', boxShadow: '0 10px 28px rgba(15,23,42,0.08)',
              }}>
                {/* Ticket Top Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #0d1b2e 0%, #1c3557 100%)',
                  color: '#ffffff', padding: '16px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#f4c04a', fontWeight: 800, letterSpacing: 1.2 }}>AURORA CINEMA · E-TICKET</div>
                    <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{t('Ghế', 'Seat')} {tk.seat}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 99,
                      background: 'rgba(34,197,94,0.22)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.45)',
                    }}>
                      {tk.status === 'VALID' ? t('HỢP LỆ', 'VALID') : tk.status}
                    </span>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{tk.seatType} · {fmtMoney(tk.price)}</div>
                  </div>
                </div>

                {/* Perforated Divider with Side Notches */}
                <div style={{ position: 'relative', height: 20, background: '#ffffff', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: -10, width: 20, height: 20, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                  <div style={{ width: '100%', borderTop: '2px dashed #cbd5e1', margin: '0 16px' }} />
                  <span style={{ position: 'absolute', right: -10, width: 20, height: 20, borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0' }} />
                </div>

                {/* QR Body */}
                <div style={{ padding: '10px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {ticketQrMap[tk.code] ? (
                    <img
                      src={ticketQrMap[tk.code]}
                      alt={tk.code}
                      style={{ width: 190, height: 190, borderRadius: 12, border: '1px solid #e2e8f0', padding: 6, background: '#ffffff' }}
                    />
                  ) : (
                    <div style={{ width: 190, height: 190, display: 'grid', placeItems: 'center', background: '#f8fafc', borderRadius: 12 }}>
                      <Loader2 size={24} className="spin" color="#64748b" />
                    </div>
                  )}

                  <div style={{
                    marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px',
                  }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13.5, fontWeight: 900, color: '#0d1b2e', letterSpacing: 0.6 }}>
                      {tk.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(tk.code, tk.code)}
                      title={t('Sao chép mã vé', 'Copy ticket code')}
                      style={{ border: 0, background: 'transparent', padding: 2, cursor: 'pointer', color: '#475569', display: 'inline-flex' }}
                    >
                      {copiedField === tk.code ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </div>

                  {ticketQrMap[tk.code] && (
                    <a
                      href={ticketQrMap[tk.code]}
                      download={`${tk.code}.png`}
                      style={{
                        marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 700, color: '#0d1b2e', textDecoration: 'none',
                      }}
                    >
                      <Download size={13} /> {t('Lưu ảnh QR', 'Save QR image')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 12.5 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════ FAILED / EXPIRED VIEW ════════════════════════════ */
  if (!isPending) {
    return (
      <div style={{ maxWidth: 560, margin: '24px auto', background: '#ffffff', borderRadius: 16, border: '1px solid #fecaca', padding: 28, textAlign: 'center' }}>
        <XCircle size={46} color="#dc2626" style={{ margin: '0 auto 12px' }} />
        <h2 style={{ margin: '0 0 8px', color: '#0d1b2e', fontSize: 20, fontWeight: 900 }}>
          {status === 'EXPIRED' ? t('Giao dịch đã hết thời gian thanh toán', 'Payment session expired') : t('Thanh toán chưa thành công', 'Payment failed')}
        </h2>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 13.5 }}>
          {t('Ghế đã được tự động mở lại. Bạn có thể đặt vé mới bất cứ lúc nào.', 'Seats have been released automatically. You can book again anytime.')}
        </p>
        <button type="button" onClick={onDone} style={{ padding: '11px 24px', borderRadius: 10, border: 0, background: '#0d1b2e', color: '#f4c04a', fontWeight: 800, cursor: 'pointer' }}>
          {t('Về trang chủ', 'Back to home')}
        </button>
      </div>
    );
  }

  /* ═══════════════════════ PENDING → MOMO GATEWAY QR VIEW ═══════════════════ */
  if (provider === 'MOMO') {
    return (
      <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 40 }}>
        {/* Official-style MoMo Header */}
        <div style={{
          background: '#ffffff', borderRadius: 14, border: '1px solid #f1f5f9',
          padding: '14px 22px', marginBottom: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: '#a50064',
              color: '#ffffff', fontWeight: 900, fontSize: 11, lineHeight: 1.05,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              letterSpacing: 0.4,
            }}>
              <span>mo</span>
              <span>mo</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
              {t('Cổng thanh toán MoMo', 'MoMo Payment Gateway')}
            </span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: '#a50064' }}>
            <Loader2 size={15} className="spin" />
            {t('Đang tự động đối soát giao dịch…', 'Listening for payment…')}
          </div>
        </div>

        {/* 2-Column MoMo Gateway Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(270px, 320px) minmax(0, 1fr)', gap: 22, alignItems: 'stretch' }}>
          {/* Left: Thông tin đơn hàng + Pink Countdown */}
          <div style={{
            background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0',
            padding: '24px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
          }}>
            <div>
              <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 900, color: '#0f172a' }}>
                {t('Thông tin đơn hàng', 'Order details')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 4 }}>{t('Nhà cung cấp', 'Merchant')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: 7, background: '#0d1b2e', color: '#f4c04a',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900,
                    }}>★</span>
                    <strong style={{ fontSize: 14, color: '#0f172a' }}>AURORA CINEMA</strong>
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 3 }}>{t('Mã đơn hàng', 'Order ID')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: 13, color: '#0f172a', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {payment.transferContent || payment.txnRef}
                    </strong>
                    <button
                      type="button"
                      onClick={() => void handleCopy('ref', payment.transferContent || payment.txnRef)}
                      style={{
                        border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: 6,
                        padding: '4px 7px', fontSize: 11, fontWeight: 700, color: '#334155',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                      }}
                    >
                      {copiedField === 'ref' ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 3 }}>{t('Mô tả', 'Description')}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                    {movieTitle} · {seatsDisplay.join(', ')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 3 }}>{t('Số tiền', 'Amount')}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>
                    {fmtMoney(payment.amount)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              {/* MoMo Pink Countdown Box */}
              <div style={{
                background: '#fdf2f8', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                border: '1px solid #fbcfe8',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9d174d', marginBottom: 10 }}>
                  {t('Đơn hàng sẽ hết hạn sau:', 'Order expires in:')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <div style={{ background: '#fbcfe8', borderRadius: 10, padding: '8px 14px', minWidth: 62 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#831843', lineHeight: 1.1 }}>{mm}</div>
                    <div style={{ fontSize: 11, color: '#9d174d', fontWeight: 600 }}>{t('Phút', 'Min')}</div>
                  </div>
                  <div style={{ background: '#fbcfe8', borderRadius: 10, padding: '8px 14px', minWidth: 62 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#831843', lineHeight: 1.1 }}>{ss}</div>
                    <div style={{ fontSize: 11, color: '#9d174d', fontWeight: 600 }}>{t('Giây', 'Sec')}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void checkStatus(true)}
                  disabled={checking}
                  style={{
                    width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 14px', borderRadius: 10, border: '1.5px solid #a50064',
                    background: '#ffffff', color: '#a50064', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={14} className={checking ? 'spin' : ''} />
                  {checking ? t('Đang kiểm tra…', 'Checking…') : t('Kiểm tra giao dịch', 'Check status')}
                </button>
                <button
                  type="button"
                  onClick={onDone}
                  style={{
                    width: '100%', border: 0, background: 'transparent', padding: '6px 0',
                    color: '#a50064', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {t('Quay về', 'Go back')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Vibrant MoMo Magenta QR Panel */}
          <div style={{
            background: 'linear-gradient(145deg, #b0006d 0%, #d82d8b 55%, #a50064 100%)',
            borderRadius: 16, padding: '30px 26px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', color: '#ffffff',
            boxShadow: '0 14px 36px rgba(165,0,100,0.22)',
          }}>
            <div style={{
              background: '#ffffff', borderRadius: 99, padding: '6px 18px',
              display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 22,
              boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
            }}>
              <span style={{
                background: '#a50064', color: '#ffffff', fontWeight: 900, fontSize: 11,
                padding: '3px 7px', borderRadius: 6,
              }}>MoMo</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={{ color: '#dc2626', fontWeight: 900, fontSize: 12, letterSpacing: 0.3 }}>VIETQR</span>
            </div>

            {/* White QR Container with 4 Corner Brackets + Centered MoMo Badge */}
            <div style={{
              position: 'relative', background: '#ffffff', borderRadius: 20, padding: 20,
              boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* 4 MoMo Pink Corner Brackets */}
              <span style={{ position: 'absolute', top: 10, left: 10, width: 20, height: 20, borderTop: '3px solid #d82d8b', borderLeft: '3px solid #d82d8b', borderTopLeftRadius: 6 }} />
              <span style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderTop: '3px solid #d82d8b', borderRight: '3px solid #d82d8b', borderTopRightRadius: 6 }} />
              <span style={{ position: 'absolute', bottom: 10, left: 10, width: 20, height: 20, borderBottom: '3px solid #d82d8b', borderLeft: '3px solid #d82d8b', borderBottomLeftRadius: 6 }} />
              <span style={{ position: 'absolute', bottom: 10, right: 10, width: 20, height: 20, borderBottom: '3px solid #d82d8b', borderRight: '3px solid #d82d8b', borderBottomRightRadius: 6 }} />

              <div style={{ position: 'relative', width: 236, height: 236, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {payment.vietqrUrl ? (
                  <img
                    src={payment.vietqrUrl}
                    alt="MoMo QR"
                    style={{ width: 236, height: 236, borderRadius: 8, display: 'block' }}
                  />
                ) : inlineQrDataUrl ? (
                  <img
                    src={inlineQrDataUrl}
                    alt="MoMo QR"
                    style={{ width: 236, height: 236, borderRadius: 8, display: 'block' }}
                  />
                ) : (
                  <Loader2 size={28} className="spin" color="#a50064" />
                )}
                {/* Small centered MoMo emblem over the center logo spot */}
                <div style={{
                  position: 'absolute', width: 34, height: 34, borderRadius: 9,
                  background: '#a50064', border: '2.5px solid #ffffff',
                  color: '#ffffff', fontWeight: 900, fontSize: 9.5, lineHeight: 1.02,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  pointerEvents: 'none',
                }}>
                  <span>mo</span>
                  <span>mo</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22, fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, maxWidth: 340 }}>
              {t('Sử dụng App MoMo hoặc ứng dụng ngân hàng để quét mã', 'Use MoMo App or any banking app to scan QR')}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {t('Hệ thống tự động xác nhận và phát hành vé điện tử ngay khi nhận tiền', 'Tickets are issued automatically as soon as payment arrives')}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 12.5 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════ PENDING → LIVE QR PAYMENT VIEW ════════════════════ */
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 40 }}>
      {/* Live Auto-Listening Banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14,
        padding: '14px 18px', marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Loader2 size={20} color="#2563eb" className="spin" />
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1e3a8a' }}>
            {t('Đang chờ xác nhận thanh toán…', 'Waiting for payment confirmation…')}
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 99, background: '#ffffff', border: '1px solid #93c5fd',
          fontSize: 13, fontWeight: 900, color: secondsLeft < 120 ? '#dc2626' : '#0d1b2e',
        }}>
          <Clock3 size={15} /> {mm}:{ss}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* Left: Branded QR Code Card */}
        <div style={{
          background: provider === 'MOMO'
            ? 'linear-gradient(160deg, #a50064 0%, #d82d8b 100%)'
            : provider === 'VNPAY'
            ? 'linear-gradient(160deg, #005baa 0%, #0077cc 100%)'
            : '#ffffff',
          borderRadius: 18,
          border: provider === 'VIETQR' ? '1.5px solid #e2e8f0' : 'none',
          padding: 24,
          textAlign: 'center',
          boxShadow: '0 12px 30px rgba(15,23,42,0.10)',
          color: provider === 'VIETQR' ? '#0d1b2e' : '#ffffff',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 14px', borderRadius: 99,
            background: provider === 'VIETQR' ? providerBadgeColor : 'rgba(255,255,255,0.18)',
            color: '#ffffff',
            fontSize: 12, fontWeight: 800, marginBottom: 16,
            backdropFilter: 'blur(4px)',
          }}>
            <QrCode size={14} /> {providerTitle}
          </div>

          <div style={{
            background: '#ffffff', borderRadius: 16,
            padding: provider === 'VIETQR' ? 12 : 18,
            border: provider === 'VIETQR' ? '1px dashed #cbd5e1' : 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            minHeight: 260,
            boxShadow: provider === 'VIETQR' ? 'none' : '0 8px 24px rgba(0,0,0,0.18)',
          }}>
            {payment.vietqrUrl ? (
              <img
                src={payment.vietqrUrl}
                alt={`${provider} QR`}
                style={{
                  maxWidth: '100%',
                  width: provider === 'VIETQR' ? 'auto' : 228,
                  maxHeight: provider === 'VIETQR' ? 310 : 228,
                  borderRadius: 10,
                }}
              />
            ) : inlineQrDataUrl ? (
              <img
                src={inlineQrDataUrl}
                alt={`${provider} QR`}
                style={{ width: 228, height: 228, borderRadius: 10 }}
              />
            ) : (
              <Loader2 size={28} className="spin" color="#64748b" />
            )}
            {provider !== 'VIETQR' && (
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 900, color: provider === 'MOMO' ? '#a50064' : '#005baa' }}>
                {fmtMoney(payment.amount)}
              </div>
            )}
          </div>

          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: provider === 'VIETQR' ? '#64748b' : 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>
            {provider === 'MOMO'
              ? t('Mở ứng dụng Ví MoMo → chọn Quét Mã để thanh toán.', 'Open MoMo app → tap Scan QR to pay.')
              : provider === 'VNPAY'
              ? t('Mở ứng dụng Ngân hàng → chọn VNPAY-QR để quét mã.', 'Open Banking app → scan with VNPAY-QR.')
              : t('Mở ứng dụng Ngân hàng bất kỳ → Quét mã VietQR để thanh toán.', 'Open any Banking app → scan VietQR to pay.')}
          </p>
        </div>

        {/* Right: Transfer Details & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>
              {provider === 'MOMO'
                ? t('Thông tin thanh toán MoMo', 'MoMo payment details')
                : provider === 'VNPAY'
                ? t('Thông tin thanh toán VNPAY-QR', 'VNPAY-QR payment details')
                : t('Thông tin chuyển khoản', 'Transfer details')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { key: 'bank', label: t('Phương thức', 'Method'), value: providerTitle, copyable: false },
                ...(provider === 'VIETQR' && payment.accountNo ? [{ key: 'acc', label: t('Số tài khoản', 'Account No.'), value: payment.accountNo, copyable: true }] : []),
                ...(provider === 'VIETQR' && payment.accountName ? [{ key: 'name', label: t('Chủ tài khoản', 'Account Name'), value: payment.accountName, copyable: false }] : []),
                { key: 'amount', label: t('Số tiền', 'Amount'), value: fmtMoney(payment.amount), raw: String(Math.round(payment.amount)), copyable: true, highlight: true },
                { key: 'ref', label: t('Mã giao dịch / Nội dung', 'Reference Code'), value: payment.transferContent || payment.txnRef, raw: payment.transferContent || payment.txnRef, copyable: true, highlight: true },
              ].map((item) => (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  background: item.highlight ? '#fffbeb' : '#f8fafc',
                  border: `1px solid ${item.highlight ? '#fde68a' : '#e2e8f0'}`,
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: item.highlight ? '#b45309' : '#0d1b2e', marginTop: 2, wordBreak: 'break-all' }}>
                      {item.value}
                    </div>
                  </div>
                  {item.copyable && (
                    <button
                      type="button"
                      onClick={() => void handleCopy(item.key, item.raw || item.value)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
                        background: '#ffffff', color: '#0d1b2e', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {copiedField === item.key ? <><Check size={13} color="#16a34a" /> {t('Đã copy', 'Copied')}</> : <><Copy size={13} /> Copy</>}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void checkStatus(true)}
                disabled={checking}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '11px 14px', borderRadius: 10, border: '1.5px solid #0d1b2e',
                  background: '#ffffff', color: '#0d1b2e', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} className={checking ? 'spin' : ''} />
                {checking ? t('Đang kiểm tra…', 'Checking…') : t('Kiểm tra ngay', 'Check now')}
              </button>
            </div>
          </div>

          {/* Localhost Auto-Confirm Test Box (only when backend enables simulation) */}
          {payment.simulationEnabled && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
              border: '1.5px dashed #16a34a', borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 900, color: '#15803d', marginBottom: 6 }}>
                <Sparkles size={15} />
                {t('Chế độ kiểm thử nhanh Localhost (Demo Khóa Luận)', 'Localhost Auto-Webhook Test Mode')}
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                {payment.sepayAutoSync
                  ? t('SePay đang tự động quét tiền thật mỗi 3 giây. Bạn cũng có thể bấm nút dưới để giả lập webhook nhận tiền ngay.', 'SePay auto-sync is live every 3s. Or click below to simulate instant webhook confirmation.')
                  : t('Bấm nút bên dưới để mô phỏng ngân hàng/ví báo đã nhận đủ tiền — hệ thống sẽ tự động ghi DB và phát hành vé điện tử QR ngay lập tức.', 'Click below to simulate bank/wallet webhook confirmation — tickets will be issued immediately in aurora_db.')}
              </p>
              <button
                type="button"
                onClick={() => void handleSimulatePaid()}
                disabled={simulating}
                style={{
                  width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '11px 16px', borderRadius: 10, border: 0,
                  background: '#15803d', color: '#ffffff', fontWeight: 800, fontSize: 13,
                  cursor: simulating ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(21,128,61,0.25)',
                }}
              >
                {simulating ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
                {simulating ? t('Đang phát hành vé điện tử…', 'Issuing e-tickets…') : t('Giả lập đã nhận tiền → Xuất vé điện tử ngay', 'Simulate Payment Received → Issue E-Ticket')}
              </button>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 12.5 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

