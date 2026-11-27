import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bot, Clock3, Film, Minimize2, Send, Sparkles, Tag } from 'lucide-react';
import './AuroraAssistant.css';
import AuroraMascot3D, { Mascot3DPose, Mascot3DExpression, Mascot3DConfig } from './AuroraMascot3D';
// Compatibility aliases so existing code keeps working
type AuroraExpression = Mascot3DExpression;
type AuroraBehavior   = Mascot3DPose;

type Language = 'vi' | 'en';
type CustomerUser = { id?: number; fullName: string; email: string } | null;
type MascotPose = 'wave' | 'advisor' | 'thinking' | 'intro' | 'notify' | 'thanks';

type MovieRecommendation = {
  id: number;
  title: string;
  genre?: string;
  ageRating?: string;
  format?: string;
  posterUrl?: string;
  upcomingShowtimeCount?: number;
  minTicketPrice?: number | null;
};

type AssistantAction = { type: string; label: string };
type ChatMessage = {
  id: number | string;
  sender: 'USER' | 'ASSISTANT';
  text: string;
  intent?: string;
  pose?: MascotPose;
  motion?: string;
  recommendations?: MovieRecommendation[];
  actions?: AssistantAction[];
};

type Props = {
  apiUrl: string;
  language: Language;
  user: CustomerUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (destination: string) => void;
  onMovieSelect: (movie: MovieRecommendation) => void;
  page: string;
};

const TOUR_STEPS = {
  vi: [
    { key: 'search', title: 'Tìm phim trong vài giây', body: 'Nhấn kính lúp để tìm theo tên phim, thể loại hoặc nội dung bạn yêu thích.' },
    { key: 'movies', title: 'Khám phá phim đang chiếu', body: 'Xem trailer, độ tuổi, định dạng và chọn ngay phim phù hợp với bạn.' },
    { key: 'schedule', title: 'Chọn lịch chiếu thuận tiện', body: 'Lọc theo rạp và ngày để tìm suất chiếu gần bạn nhất.' },
    { key: 'offers', title: 'Đừng bỏ lỡ ưu đãi', body: 'Kiểm tra voucher đang hiệu lực trước khi thanh toán để có mức giá tốt hơn.' },
    { key: 'account', title: 'Mọi thứ nằm trong tài khoản', body: 'Quản lý vé, điểm thưởng, hạng thành viên và thông tin cá nhân tại đây.' },
  ],
  en: [
    { key: 'search', title: 'Find a movie in seconds', body: 'Use search to find a title, genre or story you love.' },
    { key: 'movies', title: 'Explore movies', body: 'Watch trailers, check ratings and formats, then choose your movie.' },
    { key: 'schedule', title: 'Pick a convenient showtime', body: 'Filter by cinema and date to find the best session near you.' },
    { key: 'offers', title: 'Never miss an offer', body: 'Check active vouchers before checkout for a better price.' },
    { key: 'account', title: 'Everything in your account', body: 'Manage tickets, points, membership and personal information here.' },
  ],
};

const WELCOME: Record<Language, string> = {
  vi: 'Xin chào! Mình là Aurora ✦ Mình có thể gợi ý phim từ lịch chiếu thật, kiểm tra giá vé và hướng dẫn bạn đặt chỗ.',
  en: 'Hi! I’m Aurora ✦ I can recommend movies from live showtimes, check ticket prices and guide your booking.',
};

const POSE_MOTIONS: Record<MascotPose, AuroraBehavior> = { wave: 'wave', advisor: 'point', thinking: 'think', intro: 'clap', notify: 'announce', thanks: 'heart' };
const POSE_EXPRESSIONS: Record<MascotPose, AuroraExpression> = { wave: 'happy', advisor: 'focused', thinking: 'thinking', intro: 'excited', notify: 'surprised', thanks: 'love' };
const MASCOT_3D_SIZE_CHAT   = 68;
const MASCOT_3D_SIZE_BUTTON = 150;
const MASCOT_3D_SIZE_TOUR   = 150;
const IDLE_POSES: MascotPose[] = ['wave', 'thinking', 'intro', 'notify', 'thanks'];

const PAGE_EXPRESSIONS: Record<string, AuroraExpression[]> = {
  home: ['happy', 'focused'], schedule: ['curious', 'focused'], movies: ['excited', 'love'], theaters: ['curious', 'surprised'],
  'ticket-prices': ['focused', 'curious'], offers: ['love', 'excited'], membership: ['happy', 'love'], support: ['focused', 'happy'], booking: ['surprised', 'focused'],
  account: ['happy', 'focused'], 'movie-detail': ['excited', 'surprised'], 'auth-login': ['curious', 'happy'], 'auth-register': ['happy', 'excited'],
  'footer-faq': ['curious', 'focused'], 'footer-booking-guide': ['focused', 'happy'], 'footer-privacy': ['focused', 'curious'], 'footer-terms': ['focused', 'surprised'],
};
const PAGE_POSES: Record<string, MascotPose> = { home: 'wave', schedule: 'advisor', movies: 'intro', theaters: 'thinking', 'ticket-prices': 'thinking', offers: 'notify', membership: 'thanks', support: 'advisor', booking: 'advisor', account: 'thanks', 'movie-detail': 'intro', 'auth-login': 'wave', 'auth-register': 'thanks', 'footer-faq': 'thinking', 'footer-booking-guide': 'advisor', 'footer-privacy': 'thinking', 'footer-terms': 'advisor' };

function createClientMessageId() {
  const cryptoWithUuid = globalThis.crypto as Crypto & { randomUUID?: () => string };
  const randomPart = cryptoWithUuid?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `aurora-${Date.now()}-${randomPart}`;
}

export default function AuroraAssistant({ apiUrl, language, user, open, onOpenChange, onNavigate, onMovieSelect, page }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showTeaser, setShowTeaser] = useState(() => !localStorage.getItem('aurora-ai-teaser-seen'));
  const [mascotPose, setMascotPose] = useState<MascotPose>('wave');
  const [expression, setExpression] = useState<AuroraExpression>('happy');
  const [mascotConfig, setMascotConfig] = useState<Mascot3DConfig>({});
  const [mascotPressed, setMascotPressed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const poseBeforeInteraction = useRef<MascotPose>('wave');
  const expressionBeforeInteraction = useRef<AuroraExpression>('happy');
  const requestVersion = useRef(0);
  const steps = TOUR_STEPS[language];
  const currentStep = steps[tourStep];
  const poseStatus = language === 'vi'
    ? { wave: 'Sẵn sàng hỗ trợ', advisor: 'Đang tư vấn', thinking: 'Đang suy nghĩ', intro: 'Đang giới thiệu phim', notify: 'Có thông tin mới', thanks: 'Cảm ơn bạn' }[mascotPose]
    : { wave: 'Ready to help', advisor: 'Advising you', thinking: 'Thinking', intro: 'Presenting a movie', notify: 'New information', thanks: 'Thank you' }[mascotPose];

  const starterMessages = useMemo<ChatMessage[]>(() => [{ id: 'welcome', sender: 'ASSISTANT', text: WELCOME[language] }], [language]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiUrl}?action=mascot_config&_=${Date.now()}`, { credentials: 'include', cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        const idle = ['float', 'bounce', 'sway'].includes(data.idle_animation) ? data.idle_animation : 'float';
        setMascotConfig({
          bodyColor: data.body_color,
          accentColor: data.accent_color,
          cheekColor: data.cheek_color,
          eyeColor: data.eye_color,
          scarfColor: data.scarf_color,
          idleAnimation: idle,
          enableShadow: data.enable_shadow !== '0',
          enableParticles: data.enable_particles !== '0',
          scaleFactor: Number.parseFloat(data.scale_factor || '1'),
          ambientLight: Number.parseFloat(data.ambient_light || '.6'),
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [apiUrl]);

  useEffect(() => {
    const version = ++requestVersion.current;
    setReady(false);
    setError('');
    fetch(`${apiUrl}?action=ai_assistant&language=${language}&_=${Date.now()}`, { credentials: 'include', cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Assistant unavailable');
        if (version !== requestVersion.current) return;
        const loadedMessages: ChatMessage[] = Array.isArray(data.messages) && data.messages.length ? data.messages : starterMessages;
        setMessages(loadedMessages);
        setError('');
        const lastAssistant = [...loadedMessages].reverse().find(message => message.sender === 'ASSISTANT');
        if (lastAssistant?.pose) showPose(lastAssistant.pose);
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        if (user?.id && data.onboardingRequired) {
          const storedStep = Math.max(0, Math.min(steps.length - 1, Number(data.onboardingStep || 0)));
          setTourStep(storedStep);
          window.setTimeout(() => setTourOpen(true), 550);
        } else {
          setTourOpen(false);
        }
      })
      .catch(error => {
        if (version !== requestVersion.current) return;
        setMessages(starterMessages);
        setError(error instanceof Error ? error.message : 'Assistant unavailable');
      })
      .finally(() => { if (version === requestVersion.current) setReady(true); });
  }, [apiUrl, language, user?.id, reloadKey]);

  useEffect(() => {
    if (open || tourOpen || loading) return;
    let stopped = false;
    let timer = 0;
    let index = Math.max(0, IDLE_POSES.indexOf(mascotPose));
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (stopped) return;
        index = (index + 1) % IDLE_POSES.length;
        showPose(IDLE_POSES[index]);
        schedule();
      }, 9500 + Math.round(Math.random() * 4500));
    };
    schedule();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [open, tourOpen, loading]);

  useEffect(() => {
    const options = PAGE_EXPRESSIONS[page] || PAGE_EXPRESSIONS.home;
    const available = options.filter(item => item !== expression);
    const pool = available.length ? available : options;
    const nextExpression = pool[Math.floor(Math.random() * pool.length)];
    setExpression(nextExpression);
    if (!open && !loading) showPose(PAGE_POSES[page] || 'wave', nextExpression);
    logMascotEvent('POSE_VIEW', `page:${page}`, nextExpression);
  }, [page]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      inputRef.current?.focus();
    }, 120);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, messages, loading, onOpenChange]);

  useEffect(() => {
    if (!tourOpen || !currentStep) { setTargetRect(null); return; }
    const update = () => {
      const target = document.querySelector(`[data-aurora-tour="${currentStep.key}"]`);
      setTargetRect(target instanceof HTMLElement ? target.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [tourOpen, currentStep]);

  useEffect(() => {
    if (!tourOpen) return;
    const tourPoses: MascotPose[] = ['thinking', 'intro', 'notify', 'notify', 'thanks'];
    showPose(tourPoses[tourStep] || 'advisor');
  }, [tourOpen, tourStep]);

  function showPose(pose: MascotPose, nextExpression: AuroraExpression = POSE_EXPRESSIONS[pose]) {
    setMascotPose(pose);
    setExpression(nextExpression);
  }

  function handleMascotEnter() {
    poseBeforeInteraction.current = mascotPose;
    expressionBeforeInteraction.current = expression;
    showPose('wave');
  }

  function handleMascotLeave() {
    setMascotPressed(false);
    showPose(poseBeforeInteraction.current, expressionBeforeInteraction.current);
  }

  function logMascotEvent(eventType: string, trigger: string, expressionOverride?: AuroraExpression) {
    void fetch(`${apiUrl}?action=ai_mascot_event`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType, pose: mascotPose, expression: expressionOverride || expression, trigger, engine: 'AURORA_CINEMATIC_RIG_V3' }) }).catch(() => undefined);
  }

  function openAssistant() {
    setShowTeaser(false);
    localStorage.setItem('aurora-ai-teaser-seen', '1');
    showPose('advisor');
    logMascotEvent('OPEN_CHAT', 'mascot_button');
    onOpenChange(true);
  }

  async function sendMessage(value: string) {
    const message = value.trim();
    if (!message || loading) return;
    const optimistic: ChatMessage = { id: `user-${Date.now()}`, sender: 'USER', text: message };
    setMessages(previous => [...previous, optimistic]);
    setInput(''); setLoading(true); setError(''); showPose('thinking');
    try {
      const response = await fetch(`${apiUrl}?action=ai_assistant`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language, pageContext: page, clientMessageId: createClientMessageId() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (language === 'vi' ? 'Aurora chưa thể trả lời.' : 'Aurora cannot reply right now.'));
      setMessages(previous => [...previous, data.message]);
      showPose((data.message.pose || 'advisor') as MascotPose);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Assistant unavailable';
      setError(message);
      showPose('thinking');
      setMessages(previous => [...previous, { id: `error-${Date.now()}`, sender: 'ASSISTANT', text: language === 'vi' ? `Mình gặp một chút trục trặc: ${message}` : `Something went wrong: ${message}` }]);
    } finally { setLoading(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); void sendMessage(input); }

  function runAction(type: string) {
    logMascotEvent('RUN_ACTION', type);
    onOpenChange(false);
    const map: Record<string, string> = {
      OPEN_MOVIES: 'movies', OPEN_SCHEDULE: 'schedule', OPEN_PRICES: 'ticket-prices',
      OPEN_OFFERS: 'offers', OPEN_MEMBERSHIP: 'membership', OPEN_SUPPORT: 'support',
    };
    if (map[type]) onNavigate(map[type]);
  }

  async function saveTour(operation: 'STEP' | 'COMPLETE' | 'SKIP', step: number, key: string) {
    try {
      await fetch(`${apiUrl}?action=ai_onboarding`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation, step, stepKey: key }) });
    } catch { /* Progress can be retried on the next step. */ }
  }

  function nextTourStep() {
    if (tourStep >= steps.length - 1) {
      setTourOpen(false); void saveTour('COMPLETE', steps.length, currentStep.key); return;
    }
    const next = tourStep + 1; setTourStep(next); void saveTour('STEP', next, steps[next].key);
  }

  function skipTour() { setTourOpen(false); void saveTour('SKIP', tourStep, currentStep.key); }

  function selectMovie(movie: MovieRecommendation) {
    showPose('thanks'); logMascotEvent('OPEN_MOVIE', String(movie.id)); onMovieSelect(movie); onOpenChange(false);
  }

  const money = (value?: number | null) => value ? `${new Intl.NumberFormat('vi-VN').format(value)}đ` : (language === 'vi' ? 'Xem lịch' : 'View times');

  return <>
    {tourOpen && currentStep && <div className="aurora-tour-layer" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Hướng dẫn sử dụng' : 'Product tour'}>
      <div className="aurora-tour-shade" />
      {targetRect && <div className="aurora-tour-focus" style={{ top: targetRect.top - 8, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 16 }} />}
      <section className="aurora-tour-card">
        <div className="aurora-tour-mascot"><AuroraMascot3D expression={expression} pose={POSE_MOTIONS[mascotPose]} talking={false} size={MASCOT_3D_SIZE_TOUR} config={mascotConfig} /></div>
        <div className="aurora-tour-copy">
          <div className="aurora-tour-progress"><span>{language === 'vi' ? 'KHÁM PHÁ AURORA' : 'DISCOVER AURORA'}</span><b>{tourStep + 1}/{steps.length}</b></div>
          <div className="aurora-tour-dots">{steps.map((_, index) => <i key={index} className={index <= tourStep ? 'active' : ''} />)}</div>
          <h2>{currentStep.title}</h2><p>{currentStep.body}</p>
          <div className="aurora-tour-actions"><button type="button" onClick={skipTour}>{language === 'vi' ? 'Bỏ qua' : 'Skip'}</button><button type="button" className="primary" onClick={nextTourStep}>{tourStep === steps.length - 1 ? (language === 'vi' ? 'Bắt đầu trải nghiệm' : 'Start exploring') : (language === 'vi' ? 'Tiếp theo' : 'Next')} <ArrowRight size={15} /></button></div>
        </div>
      </section>
    </div>}

    <aside className={`aurora-assistant ${open ? 'is-open' : ''}`} aria-live="polite">
      {!open && <>
        {showTeaser && <button type="button" className="aurora-assistant-teaser" onClick={openAssistant}><b>{language === 'vi' ? 'Bạn muốn xem phim gì?' : 'What would you like to watch?'}</b><span>{language === 'vi' ? 'Aurora giúp bạn chọn trong vài giây' : 'Aurora can help in seconds'}</span></button>}
        <span className="aurora-assistant-orbit star-one">✦</span><span className="aurora-assistant-orbit star-two">✦</span>
        <button type="button" className={`aurora-mascot-button ${mascotPressed ? 'is-pressed' : ''}`} onPointerEnter={handleMascotEnter} onPointerLeave={handleMascotLeave} onPointerDown={() => setMascotPressed(true)} onPointerUp={() => setMascotPressed(false)} onClick={openAssistant} aria-label={language === 'vi' ? 'Mở trợ lý Aurora' : 'Open Aurora assistant'} aria-expanded={open} aria-controls="aurora-ai-panel">
          <span className="aurora-online-dot" />
          <span className="aurora-mascot-stage"><AuroraMascot3D expression={expression} pose={POSE_MOTIONS[mascotPose]} talking={loading} interactive size={MASCOT_3D_SIZE_BUTTON} config={mascotConfig} /></span>
          <span className="aurora-pose-status">{poseStatus}</span>
        </button>
      </>}

      {open && <section id="aurora-ai-panel" className="aurora-chat-panel" role="dialog" aria-label="Aurora AI">
        <header>
          <div className="aurora-chat-avatar"><AuroraMascot3D expression={expression} pose={POSE_MOTIONS[mascotPose]} talking={loading} size={MASCOT_3D_SIZE_CHAT} config={mascotConfig} /></div>
          <div><span><Sparkles size={12} /> AURORA AI</span><h2>{language === 'vi' ? 'Trợ lý điện ảnh của bạn' : 'Your cinema concierge'}</h2><small className={error ? 'offline' : !ready ? 'connecting' : ''}><i /> {error ? (language === 'vi' ? 'Tạm gián đoạn · Có thể thử lại' : 'Temporarily unavailable · Retry') : !ready ? (language === 'vi' ? 'Đang kết nối dữ liệu Aurora' : 'Connecting to Aurora data') : (language === 'vi' ? 'Đang trực tuyến · Dữ liệu từ Aurora' : 'Online · Powered by Aurora data')}</small></div>
          <button type="button" onClick={() => { logMascotEvent('CLOSE_CHAT', 'header'); onOpenChange(false); }} aria-label={language === 'vi' ? 'Thu nhỏ' : 'Minimize'}><Minimize2 size={18} /></button>
        </header>
        <div className="aurora-chat-trust"><Bot size={13} /><span>{language === 'vi' ? 'Gợi ý dựa trên phim và suất chiếu đang mở bán' : 'Suggestions use movies and showtimes currently on sale'}</span></div>
        <div className="aurora-chat-messages" ref={listRef} aria-live="polite" aria-busy={loading}>
          {!ready && <div className="aurora-chat-loading-state"><span /><p>{language === 'vi' ? 'Aurora đang kiểm tra lịch chiếu…' : 'Aurora is checking showtimes…'}</p></div>}
          {ready && messages.map(message => <div key={message.id} className={`aurora-message-row ${message.sender === 'USER' ? 'user' : 'assistant'}`}>
            {message.sender === 'ASSISTANT' && <div className="aurora-message-mark">✦</div>}
            <div className="aurora-message-content"><div className="aurora-message-bubble">{message.text}</div>
              {!!message.recommendations?.length && <div className="aurora-recommendations">{message.recommendations.map(movie => <article key={movie.id}>
                <div className="aurora-rec-poster">{movie.posterUrl ? <img src={movie.posterUrl} alt="" /> : <Film size={20} />}</div>
                <div><h3>{movie.title}</h3><p>{movie.genre || movie.format} {movie.ageRating ? <b>{movie.ageRating}</b> : null}</p><small><Clock3 size={11} /> {movie.upcomingShowtimeCount || 0} {language === 'vi' ? 'suất sắp tới' : 'upcoming'} · <strong>{money(movie.minTicketPrice)}</strong></small></div>
                <button type="button" onClick={() => selectMovie(movie)} aria-label={language === 'vi' ? `Xem ${movie.title}` : `View ${movie.title}`}><ArrowRight size={15} /></button>
              </article>)}</div>}
              {!!message.actions?.length && <div className="aurora-message-actions">{message.actions.map(action => <button type="button" key={action.type} onClick={() => runAction(action.type)}>{action.label}<ArrowRight size={13} /></button>)}</div>}
            </div>
          </div>)}
          {loading && <div className="aurora-message-row assistant"><div className="aurora-message-mark">✦</div><div className="aurora-typing"><i /><i /><i /></div></div>}
        </div>
        {!!suggestions.length && messages.length < 4 && <div className="aurora-quick-prompts">{suggestions.map(prompt => <button type="button" onClick={() => void sendMessage(prompt)} key={prompt}><Tag size={11} />{prompt}</button>)}</div>}
        {error && <div className="aurora-chat-error" role="alert"><span>{error}</span><button type="button" onClick={() => setReloadKey(value => value + 1)}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button></div>}
        <form onSubmit={submit}><input ref={inputRef} value={input} onChange={event => setInput(event.target.value)} maxLength={600} placeholder={language === 'vi' ? 'Hỏi Aurora về phim, lịch chiếu…' : 'Ask about movies, showtimes…'} aria-label={language === 'vi' ? 'Câu hỏi cho Aurora' : 'Question for Aurora'} /><button type="submit" disabled={!input.trim() || loading} aria-label={language === 'vi' ? 'Gửi' : 'Send'}><Send size={17} /></button></form>
        <footer>{language === 'vi' ? 'Aurora có thể chưa hiểu chính xác mọi câu hỏi.' : 'Aurora may not understand every question perfectly.'}</footer>
      </section>}
    </aside>
  </>;
}
