import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Bell, CheckCheck, CheckCircle2, ChevronRight,
  CircleDollarSign, Film, Inbox, Megaphone, Package, Receipt, RefreshCw, ShieldAlert, Truck, X,
} from 'lucide-react';

export type TmsNotification = {
  id: number;
  category: string;
  severity: 'info' | 'success' | 'warning' | 'critical' | string;
  title: string;
  message: string;
  theater_id?: number | null;
  action_view?: string | null;
  action_label?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  created_by: string;
  created_at: string;
  read_at?: string | null;
  is_read: boolean;
};

type Props = {
  apiBase: string;
  enabled: boolean;
  userKey?: string | number;
  onOpen?: () => void;
  onNavigate: (view: string) => void;
  onError: (message: string) => void;
};

function relativeTime(value: string) {
  const parsed = new Date(String(value || '').replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return 'Vừa cập nhật';
  const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return parsed.toLocaleDateString('vi-VN');
}

function NotificationIcon({ item }: { item: TmsNotification }) {
  if (item.category === 'refund') return <CircleDollarSign size={18} />;
  if (item.category === 'transaction') return <Receipt size={18} />;
  if (item.category === 'movie_plan') return <Film size={18} />;
  if (item.category === 'marketing_approval' || item.category === 'marketing_result') return <Megaphone size={18} />;
  if (item.category === 'product_plan') return <Package size={18} />;
  if (item.category === 'product_distribution') return <Truck size={18} />;
  if (item.severity === 'critical') return <ShieldAlert size={18} />;
  if (item.severity === 'warning') return <AlertTriangle size={18} />;
  if (item.severity === 'success') return <CheckCircle2 size={18} />;
  return <Bell size={18} />;
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    refund: 'Hoàn tiền', transaction: 'Giao dịch', movie_plan: 'Kế hoạch phim',
    marketing_approval: 'Marketing', marketing_result: 'Marketing',
    product_plan: 'KPI hàng hóa', product_distribution: 'Phân bố hàng hóa', system: 'Hệ thống',
  };
  return labels[category] || 'Vận hành';
}

type NotificationFilter = 'all' | 'unread' | 'actionable';

export default function NotificationCenter({ apiBase, enabled, userKey, onOpen, onNavigate, onError }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [items, setItems] = useState<TmsNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [actionable, setActionable] = useState(0);
  const [priority, setPriority] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  async function loadNotifications(background = false, selectedFilter = filter) {
    if (!enabled) return;
    background ? setRefreshing(true) : setLoading(true);
    try {
      const response = await fetch(`${apiBase}?action=notifications&filter=${selectedFilter}&limit=50`, {
        credentials: 'include', cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải thông báo.');
      setItems(Array.isArray(result.data) ? result.data : []);
      setUnread(Number(result.summary?.unread || 0));
      setActionable(Number(result.summary?.actionable || 0));
      setPriority(Number(result.summary?.priority || 0));
      setLastUpdated(result.summary?.refreshed_at || '');
    } catch (error) {
      if (!background) onError(error instanceof Error ? error.message : 'Không thể tải trung tâm thông báo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateNotification(operation: 'read' | 'read_all' | 'dismiss', notificationId?: number) {
    const response = await fetch(`${apiBase}?action=notifications`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, notification_id: notificationId }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật thông báo.');
  }

  useEffect(() => {
    if (!enabled) return;
    loadNotifications(false, 'all');
    const interval = window.setInterval(() => loadNotifications(true, filter), 10000);
    const onVisibility = () => { if (document.visibilityState === 'visible') loadNotifications(true, filter); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, userKey, filter]);

  useEffect(() => {
    if (!open) return;
    loadNotifications(true, filter);
    const closeOnOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectFilter = (next: NotificationFilter) => {
    setFilter(next);
  };

  const openItem = async (item: TmsNotification) => {
    try {
      if (!item.is_read) {
        await updateNotification('read', item.id);
        setItems(current => filter === 'unread'
          ? current.filter(entry => entry.id !== item.id)
          : current.map(entry => entry.id === item.id ? { ...entry, is_read: true, read_at: new Date().toISOString() } : entry));
        setUnread(value => Math.max(0, value - 1));
        if (item.severity === 'warning' || item.severity === 'critical') setPriority(value => Math.max(0, value - 1));
      }
      if (item.action_view) onNavigate(item.action_view);
      setOpen(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể mở thông báo.');
    }
  };

  const dismissItem = async (event: React.MouseEvent, item: TmsNotification) => {
    event.stopPropagation();
    try {
      await updateNotification('dismiss', item.id);
      setItems(current => current.filter(entry => entry.id !== item.id));
      if (!item.is_read) setUnread(value => Math.max(0, value - 1));
      if (item.entity_type && item.action_view) setActionable(value => Math.max(0, value - 1));
      if (!item.is_read && (item.severity === 'warning' || item.severity === 'critical')) setPriority(value => Math.max(0, value - 1));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể ẩn thông báo.');
    }
  };

  const markAllRead = async () => {
    if (!unread) return;
    try {
      await updateNotification('read_all');
      setItems(current => filter === 'unread' ? [] : current.map(item => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() })));
      setUnread(0);
      setPriority(0);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể đánh dấu tất cả đã đọc.');
    }
  };

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        type="button"
        className={`notification-trigger ${open ? 'active' : ''}`}
        onClick={() => setOpen(value => {
          const next = !value;
          if (next) onOpen?.();
          return next;
        })}
        aria-label={unread ? `Mở thông báo, ${unread} thông báo chưa đọc` : 'Mở thông báo'}
        aria-expanded={open}
      >
        <Bell size={23} />
        {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}
      </button>

      {open && (
        <section className="notification-panel" role="dialog" aria-label="Trung tâm thông báo">
          <header className="notification-panel-head">
            <div className="notification-panel-title">
              <span className="notification-panel-symbol"><Bell size={19} /></span>
              <div><b>Trung tâm thông báo</b><small>{unread ? `${unread} chưa đọc${priority ? ` · ${priority} ưu tiên` : ''}` : 'Bạn đã xem tất cả thông báo'}</small></div>
            </div>
            <button type="button" className="notification-icon-button" onClick={() => setOpen(false)} aria-label="Đóng"><X size={17} /></button>
          </header>

          <div className="notification-toolbar">
            <div className="notification-tabs" role="tablist">
              <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => selectFilter('all')}>Tất cả</button>
              <button type="button" className={filter === 'unread' ? 'active' : ''} onClick={() => selectFilter('unread')}>Chưa đọc {unread > 0 && <span>{unread}</span>}</button>
              <button type="button" className={filter === 'actionable' ? 'active' : ''} onClick={() => selectFilter('actionable')}>Cần xử lý {actionable > 0 && <span className="actionable">{actionable}</span>}</button>
            </div>
            <button type="button" className="notification-read-all" disabled={!unread} onClick={markAllRead}><CheckCheck size={15} /> Đọc tất cả</button>
          </div>

          <div className="notification-items" aria-live="polite">
            {loading ? (
              <div className="notification-state"><RefreshCw className="spin" size={24} /><b>Đang đồng bộ thông báo</b><span>Dữ liệu được đọc từ aurora_db</span></div>
            ) : items.length === 0 ? (
              <div className="notification-state success"><Inbox size={29} /><b>{filter === 'unread' ? 'Không còn thông báo chưa đọc' : filter === 'actionable' ? 'Không có công việc cần xử lý' : 'Hộp thư đang trống'}</b><span>Công việc mới sẽ xuất hiện tại đây.</span></div>
            ) : items.map(item => (
              <article key={item.id} className={`notification-item ${item.is_read ? 'read' : 'unread'} severity-${item.severity}`} onClick={() => openItem(item)}>
                <span className="notification-item-icon"><NotificationIcon item={item} /></span>
                <div className="notification-item-content">
                  <div className="notification-item-meta"><span className="notification-category">{categoryLabel(item.category)}</span><time>{relativeTime(item.created_at)}</time></div>
                  <b>{item.title}</b>
                  <p>{item.message}</p>
                  <small className="notification-origin">Gửi bởi {item.created_by}</small>
                  {item.action_view && <small className="notification-item-action">{item.action_label || 'Xem chi tiết'} <ChevronRight size={13} /></small>}
                </div>
                {!item.is_read && <i className="notification-unread-dot" aria-label="Chưa đọc" />}
                <button type="button" className="notification-dismiss" onClick={event => dismissItem(event, item)} aria-label="Ẩn thông báo"><X size={13} /></button>
              </article>
            ))}
          </div>

          <footer className="notification-panel-foot">
            <span>{lastUpdated ? `Đồng bộ lúc ${lastUpdated.slice(11, 16)}` : 'Dữ liệu trực tiếp từ aurora_db'}</span>
            <button type="button" onClick={() => loadNotifications(true, filter)} disabled={refreshing}><RefreshCw className={refreshing ? 'spin' : ''} size={14} /> Làm mới</button>
          </footer>
        </section>
      )}
    </div>
  );
}
