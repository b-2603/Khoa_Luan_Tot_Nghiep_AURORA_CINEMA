import {
  AlertTriangle, ArrowLeft, Building2, CalendarDays, CheckCircle2, Clock3,
  CreditCard, Download, Film, Loader2, ReceiptText, RefreshCw, ShieldCheck, Ticket, XCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveBookingReceiptPdf, type BookingDetail } from '../../lib/bookingReceiptPdf';
import './VnpayResultPage.css';

type Props = { apiBase:string; result:string; txnRef:string; language:'vi'|'en'; onHome:()=>void };
type PaymentStatus = 'PENDING'|'PAID'|'FAILED'|'EXPIRED'|'CANCELLED';
const money = (value:unknown) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const dateTime = (value:unknown) => value ? new Date(String(value).replace(' ', 'T')).toLocaleString('vi-VN') : '—';

export default function VnpayResultPage({ apiBase, txnRef, language, onHome }:Props) {
  const [data, setData] = useState<any>(null);
  const [ticketQrMap, setTicketQrMap] = useState<Record<string, string>>({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [loading, setLoading] = useState(Boolean(txnRef));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const stoppedRef = useRef(false);
  const timerRef = useRef<number|null>(null);
  const t = useCallback((vi:string, en:string) => language === 'en' ? en : vi, [language]);

  const loadStatus = useCallback(async (manual = false) => {
    if (!txnRef) {
      setLoading(false);
      setError(t('Thông tin phản hồi thanh toán không hợp lệ.', 'Invalid payment response.'));
      return null;
    }
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`${apiBase}?action=payment_status&txn_ref=${encodeURIComponent(txnRef)}`, {
        credentials: 'include', cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || t('Không thể đối soát giao dịch.', 'Unable to verify transaction.'));
      if (!stoppedRef.current) {
        setData(payload);
        setError('');
        setLoading(false);
      }
      return payload;
    } catch (fetchError) {
      if (!stoppedRef.current) {
        setError(fetchError instanceof Error ? fetchError.message : t('Không thể đối soát giao dịch.', 'Unable to verify transaction.'));
        setLoading(false);
      }
      return null;
    } finally {
      if (!stoppedRef.current) setRefreshing(false);
    }
  }, [apiBase, txnRef, t]);

  useEffect(() => {
    stoppedRef.current = false;
    let attempt = 0;
    const poll = async () => {
      const payload = await loadStatus();
      if (!stoppedRef.current && payload?.payment?.status === 'PENDING' && attempt < 19) {
        attempt += 1;
        timerRef.current = window.setTimeout(poll, 2000);
      }
    };
    void poll();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [loadStatus]);

  useEffect(() => {
    const issued: Array<{ code: string; qrPayload?: string }> = Array.isArray(data?.tickets) ? data.tickets : [];
    if (!issued.length) return;
    let active = true;
    Promise.all(
      issued.map(async (tk) => {
        const url = await QRCode.toDataURL(tk.qrPayload || tk.code, {
          width: 220, margin: 1, color: { dark: '#0d1b2e', light: '#ffffff' },
        });
        return [tk.code, url] as const;
      }),
    ).then((entries) => {
      if (active) setTicketQrMap(Object.fromEntries(entries));
    }).catch(() => {});
    return () => { active = false; };
  }, [data?.tickets]);

  async function handleDownloadPdf() {
    const bId = Number(data?.booking?.id || 0);
    if (!bId) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${apiBase}?action=booking_detail&id=${bId}`, { credentials: 'include', cache: 'no-store' });
      const payload = await res.json();
      if (res.ok && payload.booking) await saveBookingReceiptPdf(payload.booking as BookingDetail);
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Chỉ hiển thị thành công sau khi backend đã xác minh giao dịch trong aurora_db.
  const urlProvider = (new URLSearchParams(window.location.search).get('provider') || '').toUpperCase();
  const provider = String(data?.payment?.provider || urlProvider || 'VNPAY').toUpperCase();
  const providerName = provider === 'MOMO' ? 'MoMo' : provider === 'VIETQR' ? 'VietQR' : 'VNPAY';
  const status = String(data?.payment?.status || 'PENDING').toUpperCase() as PaymentStatus;
  const success = status === 'PAID';
  const pending = status === 'PENDING';
  const statusLabel = success
    ? t('ĐÃ THANH TOÁN', 'PAID')
    : pending ? t('CHỜ ĐỐI SOÁT', 'VERIFYING') : status;
  const heroMessage = success
    ? t('Vé điện tử QR của bạn đã được phát hành tự động và lưu trong tài khoản Aurora.', 'Your QR e-tickets have been automatically issued and saved to your Aurora account.')
    : pending
      ? t(`${providerName} đang gửi xác nhận bảo mật về Aurora. Vui lòng giữ trang này mở; hệ thống sẽ tự động cập nhật.`, `${providerName} is sending its secure confirmation to Aurora. Keep this page open; it will update automatically.`)
      : t('Giao dịch không được ghi nhận thành công. Vé chưa được phát hành và ghế sẽ được tự động hoàn trả.', 'The transaction was not completed. No ticket was issued and the seats will be released automatically.');

  return <main className="vnpay-result-page">
    <header>
      <div className="vnpay-brand"><span>★</span><div><b>AURORA</b><small>CINEMA</small></div></div>
      <div className="vnpay-secure"><ShieldCheck/>Kết quả được xác minh tự động từ {providerName}</div>
    </header>
    <section className="vnpay-result-shell">
      <div className={`vnpay-result-hero ${success ? 'success' : pending ? 'pending' : 'failed'}`}>
        <div className="result-icon">{loading || refreshing ? <Loader2 className="spin"/> : success ? <CheckCircle2/> : pending ? <Clock3/> : <XCircle/>}</div>
        <small>{success ? 'PAYMENT VERIFIED' : pending ? 'VERIFYING PAYMENT' : 'PAYMENT NOT COMPLETED'}</small>
        <h1>{loading
          ? t('Đang đối soát giao dịch…', 'Verifying transaction…')
          : success ? t('Thanh toán thành công', 'Payment successful')
            : pending ? t(`Đang chờ ${providerName} xác nhận`, `Awaiting ${providerName} confirmation`)
              : t('Thanh toán chưa thành công', 'Payment was not completed')}</h1>
        <p>{heroMessage}</p>
      </div>

      {error ? <div className="vnpay-result-error">
        <AlertTriangle/><span><b>{t('Không thể xác minh giao dịch', 'Unable to verify transaction')}</b><small>{error}</small></span>
      </div> : data && <div className="vnpay-receipt">
        <div className="receipt-head"><div><ReceiptText/><span><small>BIÊN NHẬN ĐIỆN TỬ</small><b>{data.booking.code}</b></span></div><span className={`receipt-status ${success ? 'paid' : pending ? 'pending' : 'failed'}`}>{statusLabel}</span></div>
        <div className="receipt-movie"><Film/><span><small>Phim</small><b>{data.booking.movieTitle}</b><em>{data.booking.theaterName} · {data.booking.screenName}</em></span></div>
        <div className="receipt-grid">
          <div><CalendarDays/><span><small>Suất chiếu</small><b>{dateTime(data.booking.startsAt)}</b></span></div>
          <div><Ticket/><span><small>Ghế</small><b>{(data.booking.seats || []).join(', ') || '—'}</b></span></div>
          <div><CreditCard/><span><small>Cổng / Ngân hàng</small><b>{data.payment.bankCode || providerName}</b></span></div>
          <div><Building2/><span><small>Mã giao dịch {providerName}</small><b>{data.payment.providerTransactionNo || 'Chờ xác nhận'}</b></span></div>
        </div>
        <div className="receipt-verification"><ShieldCheck/><span><b>{data.payment.ipnReceivedAt ? t(`Đã xác minh tự động từ ${providerName}`, `Verified automatically by ${providerName}`) : t('Đang chờ xác minh bảo mật', 'Awaiting secure confirmation')}</b><small>{data.payment.ipnReceivedAt ? dateTime(data.payment.ipnReceivedAt) : t(`Aurora chưa ghi nhận xác nhận từ ${providerName}.`, `Aurora has not received confirmation from ${providerName} yet.`)}</small></span></div>
        <div className="receipt-total"><span><small>Tổng thanh toán</small><em>Mã tham chiếu: {data.payment.txnRef}</em></span><b>{money(data.payment.amount)}</b></div>
      </div>}

      {success && Array.isArray(data?.tickets) && data.tickets.length > 0 && (
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {data.tickets.map((tk: any) => (
            <div key={tk.code} style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#0d1b2e', marginBottom: 8 }}>
                {t('VÉ ĐIỆN TỬ · GHẾ', 'E-TICKET · SEAT')} {tk.seat}
              </div>
              {ticketQrMap[tk.code] ? (
                <img src={ticketQrMap[tk.code]} alt={tk.code} style={{ width: 156, height: 156, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              ) : (
                <Loader2 size={24} className="spin" />
              )}
              <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: '#0d1b2e' }}>{tk.code}</div>
            </div>
          ))}
        </div>
      )}

      <div className="vnpay-result-actions">
        <button onClick={onHome}><ArrowLeft/>{t('Về trang chủ', 'Back to home')}</button>
        {!success && <button disabled={refreshing} onClick={() => void loadStatus(true)}><RefreshCw className={refreshing ? 'spin' : ''}/>{t('Kiểm tra lại', 'Check again')}</button>}
        {success && <button disabled={downloadingPdf} onClick={() => void handleDownloadPdf()}><Download/>{downloadingPdf ? t('Đang xuất PDF…', 'Exporting PDF…') : t('Tải vé PDF', 'Download PDF')}</button>}
        {success && <button onClick={onHome}><Ticket/>{t('Tiếp tục', 'Continue')}</button>}
      </div>
      <footer><ShieldCheck/><span>Chỉ phát hành vé sau khi chữ ký bảo mật và xác nhận từ {providerName} được kiểm tra hợp lệ.</span></footer>
    </section>
  </main>;
}
