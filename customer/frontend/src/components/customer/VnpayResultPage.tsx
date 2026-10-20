import {
  AlertTriangle, ArrowLeft, Building2, CalendarDays, CheckCircle2, Clock3,
  CreditCard, Film, Loader2, ReceiptText, RefreshCw, ShieldCheck, Ticket, XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import './VnpayResultPage.css';

type Props = { apiBase:string; result:string; txnRef:string; language:'vi'|'en'; onHome:()=>void };
type PaymentStatus = 'PENDING'|'PAID'|'FAILED'|'EXPIRED'|'CANCELLED';
const money = (value:unknown) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const dateTime = (value:unknown) => value ? new Date(String(value).replace(' ', 'T')).toLocaleString('vi-VN') : '—';

export default function VnpayResultPage({ apiBase, txnRef, language, onHome }:Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(txnRef));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const stoppedRef = useRef(false);
  const timerRef = useRef<number|null>(null);
  const t = useCallback((vi:string, en:string) => language === 'en' ? en : vi, [language]);

  const loadStatus = useCallback(async (manual = false) => {
    if (!txnRef) {
      setLoading(false);
      setError(t('Thông tin phản hồi VNPAY không hợp lệ.', 'Invalid VNPAY response.'));
      return null;
    }
    if (manual) setRefreshing(true);
    try {
      const response = await fetch(`${apiBase}?action=vnpay_status&txn_ref=${encodeURIComponent(txnRef)}`, {
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

  // Không tin cậy query string từ trình duyệt. Chỉ trạng thái trong DB sau khi
  // xác minh chữ ký IPN VNPAY mới được phép hiển thị thanh toán thành công.
  const status = String(data?.payment?.status || 'PENDING').toUpperCase() as PaymentStatus;
  const success = status === 'PAID';
  const pending = status === 'PENDING';
  const statusLabel = success
    ? t('ĐÃ THANH TOÁN', 'PAID')
    : pending ? t('CHỜ ĐỐI SOÁT', 'VERIFYING') : status;
  const heroMessage = success
    ? t('Vé của bạn đã được phát hành và lưu trong tài khoản Aurora.', 'Your tickets have been issued and saved to your Aurora account.')
    : pending
      ? t('VNPAY đang gửi xác nhận bảo mật về Aurora. Vui lòng giữ trang này mở; hệ thống sẽ tự động cập nhật.', 'VNPAY is sending its secure confirmation to Aurora. Keep this page open; it will update automatically.')
      : t('Giao dịch không được ghi nhận thành công. Vé chưa được phát hành và ghế sẽ được tự động hoàn trả.', 'The transaction was not completed. No ticket was issued and the seats will be released automatically.');

  return <main className="vnpay-result-page">
    <header>
      <div className="vnpay-brand"><span>★</span><div><b>AURORA</b><small>CINEMA</small></div></div>
      <div className="vnpay-secure"><ShieldCheck/>Kết quả được xác minh từ IPN VNPAY</div>
    </header>
    <section className="vnpay-result-shell">
      <div className={`vnpay-result-hero ${success ? 'success' : pending ? 'pending' : 'failed'}`}>
        <div className="result-icon">{loading || refreshing ? <Loader2 className="spin"/> : success ? <CheckCircle2/> : pending ? <Clock3/> : <XCircle/>}</div>
        <small>{success ? 'PAYMENT VERIFIED' : pending ? 'VERIFYING PAYMENT' : 'PAYMENT NOT COMPLETED'}</small>
        <h1>{loading
          ? t('Đang đối soát giao dịch…', 'Verifying transaction…')
          : success ? t('Thanh toán thành công', 'Payment successful')
            : pending ? t('Đang chờ VNPAY xác nhận', 'Awaiting VNPAY confirmation')
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
          <div><CreditCard/><span><small>Ngân hàng</small><b>{data.payment.bankCode || 'VNPAY'}</b></span></div>
          <div><Building2/><span><small>Mã giao dịch VNPAY</small><b>{data.payment.providerTransactionNo || 'Chờ xác nhận'}</b></span></div>
        </div>
        <div className="receipt-verification"><ShieldCheck/><span><b>{data.payment.ipnReceivedAt ? t('Đã nhận IPN bảo mật', 'Secure IPN received') : t('Đang chờ IPN bảo mật', 'Awaiting secure IPN')}</b><small>{data.payment.ipnReceivedAt ? dateTime(data.payment.ipnReceivedAt) : t('Aurora chưa ghi nhận xác nhận server-to-server từ VNPAY.', 'Aurora has not received VNPAY server-to-server confirmation yet.')}</small></span></div>
        <div className="receipt-total"><span><small>Tổng thanh toán</small><em>Mã tham chiếu: {data.payment.txnRef}</em></span><b>{money(data.payment.amount)}</b></div>
      </div>}

      <div className="vnpay-result-actions">
        <button onClick={onHome}><ArrowLeft/>{t('Về trang chủ', 'Back to home')}</button>
        {!success && <button disabled={refreshing} onClick={() => void loadStatus(true)}><RefreshCw className={refreshing ? 'spin' : ''}/>{t('Kiểm tra lại', 'Check again')}</button>}
        {success && <button onClick={onHome}><Ticket/>{t('Tiếp tục', 'Continue')}</button>}
      </div>
      <footer><ShieldCheck/><span>Chỉ phát hành vé sau khi chữ ký HMAC-SHA512 và IPN VNPAY được xác minh.</span></footer>
    </section>
  </main>;
}
