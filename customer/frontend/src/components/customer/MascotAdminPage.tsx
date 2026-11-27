/**
 * MascotAdminPage – Trang quản trị Linh vật 3D Aurora Cinema
 * Kết nối aurora_db qua API, cho phép admin chỉnh màu sắc, pose, biểu cảm,
 * xem thống kê tương tác và preview realtime linh vật 3D.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import AuroraMascot3D, {
  Mascot3DExpression,
  Mascot3DPose,
  Mascot3DConfig,
} from './AuroraMascot3D';
import './MascotAdminPage.css';

// ─── Types ─────────────────────────────────────────────────────────────────
interface MascotConfig {
  bodyColor: string;
  accentColor: string;
  cheekColor: string;
  eyeColor: string;
  scarfColor: string;
  mascotName: string;
  mascotSlogan: string;
  idleAnimation: string;
  enableShadow: boolean;
  enableParticles: boolean;
  scaleFactor: number;
  ambientLight: number;
}

interface MascotStats {
  totalEventsAllTime: number;
  uniqueUsersAllTime: number;
  totalChatOpens: number;
  eventsLast7d: number;
  eventsToday: number;
}

interface ApiProps {
  apiUrl: string;
}

const EXPRESSIONS: Mascot3DExpression[] = [
  'happy', 'excited', 'curious', 'wink', 'love',
  'surprised', 'focused', 'thinking', 'sad', 'announce',
];
const POSES: Mascot3DPose[] = [
  'idle', 'wave', 'point', 'clap', 'think',
  'heart', 'announce', 'bow', 'jump', 'spin',
];

const EXPRESSION_LABELS: Record<Mascot3DExpression, string> = {
  happy: '😊 Vui vẻ', excited: '🤩 Hào hứng', curious: '🤔 Tò mò',
  wink: '😉 Nháy mắt', love: '🥰 Yêu thích', surprised: '😲 Bất ngờ',
  focused: '🎯 Tập trung', thinking: '💭 Suy nghĩ', sad: '😢 Buồn',
  announce: '📣 Thông báo',
};
const POSE_LABELS: Record<Mascot3DPose, string> = {
  idle: '🧍 Bình thường', wave: '👋 Vẫy chào', point: '👉 Chỉ tay',
  clap: '👏 Vỗ tay', think: '🤔 Đang nghĩ', heart: '❤️ Trái tim',
  announce: '📣 Thông báo', bow: '🙇 Cúi chào', jump: '🦘 Nhảy',
  spin: '🌀 Xoay tròn',
};

const DEFAULT_CONFIG: MascotConfig = {
  bodyColor: '#F7D25E', accentColor: '#0F1B3D', cheekColor: '#FFB8C6',
  eyeColor: '#1A1A3A', scarfColor: '#162850',
  mascotName: 'Aurora', mascotSlogan: 'Cùng bạn tận hưởng mọi khoảnh khắc điện ảnh!',
  idleAnimation: 'float', enableShadow: true, enableParticles: true,
  scaleFactor: 1.0, ambientLight: 0.6,
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="mascot-stat-card">
      <div className="mascot-stat-icon">{icon}</div>
      <div className="mascot-stat-body">
        <div className="mascot-stat-value">{value}</div>
        <div className="mascot-stat-label">{label}</div>
        {sub && <div className="mascot-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Color Picker Row ───────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mascot-color-row">
      <span className="mascot-color-label">{label}</span>
      <div className="mascot-color-input-wrap">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} />
        <span className="mascot-color-hex">{value.toUpperCase()}</span>
      </div>
    </label>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MascotAdminPage({ apiUrl }: ApiProps) {
  const [config, setConfig]       = useState<MascotConfig>(DEFAULT_CONFIG);
  const [draft, setDraft]         = useState<MascotConfig>(DEFAULT_CONFIG);
  const [stats, setStats]         = useState<MascotStats | null>(null);
  const [expression, setExpression] = useState<Mascot3DExpression>('happy');
  const [pose, setPose]           = useState<Mascot3DPose>('wave');
  const [talking, setTalking]     = useState(false);
  const [tab, setTab]             = useState<'preview' | 'colors' | 'behavior' | 'stats'>('preview');
  const [saving, setSaving]       = useState(false);
  const [saveOk, setSaveOk]       = useState(false);
  const [loadError, setLoadError] = useState('');
  const [autoLoop, setAutoLoop]   = useState(false);
  const autoRef                   = useRef<number>(0);
  const poseIdx                   = useRef(0);
  const exprIdx                   = useRef(0);

  // ── Fetch config & stats from DB ─────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [cfgRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}?action=mascot_config`, { credentials: 'include', cache: 'no-store' }),
        fetch(`${apiUrl}?action=mascot_stats`,  { credentials: 'include', cache: 'no-store' }),
      ]);
      if (cfgRes.ok) {
        const data = await cfgRes.json();
        const c: MascotConfig = {
          bodyColor:      data.body_color       || DEFAULT_CONFIG.bodyColor,
          accentColor:    data.accent_color     || DEFAULT_CONFIG.accentColor,
          cheekColor:     data.cheek_color      || DEFAULT_CONFIG.cheekColor,
          eyeColor:       data.eye_color        || DEFAULT_CONFIG.eyeColor,
          scarfColor:     data.scarf_color      || DEFAULT_CONFIG.scarfColor,
          mascotName:     data.mascot_name      || DEFAULT_CONFIG.mascotName,
          mascotSlogan:   data.mascot_slogan    || DEFAULT_CONFIG.mascotSlogan,
          idleAnimation:  data.idle_animation   || DEFAULT_CONFIG.idleAnimation,
          enableShadow:   data.enable_shadow !== '0',
          enableParticles: data.enable_particles !== '0',
          scaleFactor:    parseFloat(data.scale_factor || '1.0'),
          ambientLight:   parseFloat(data.ambient_light || '0.6'),
        };
        setConfig(c); setDraft(c);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats({
          totalEventsAllTime: s.total_events_all_time || 0,
          uniqueUsersAllTime: s.unique_users_all_time || 0,
          totalChatOpens:     s.total_chat_opens      || 0,
          eventsLast7d:       s.events_last_7d        || 0,
          eventsToday:        s.events_today          || 0,
        });
      }
    } catch (err) {
      setLoadError('Không thể tải cấu hình từ server. Đang dùng giá trị mặc định.');
      console.warn('Mascot config load error:', err);
    }
  }, [apiUrl]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Auto-loop poses/expressions for showcase ──────────────────────────────
  useEffect(() => {
    if (!autoLoop) { window.clearInterval(autoRef.current); return; }
    autoRef.current = window.setInterval(() => {
      poseIdx.current = (poseIdx.current + 1) % POSES.length;
      exprIdx.current = (exprIdx.current + 1) % EXPRESSIONS.length;
      setPose(POSES[poseIdx.current]);
      setExpression(EXPRESSIONS[exprIdx.current]);
    }, 3200);
    return () => window.clearInterval(autoRef.current);
  }, [autoLoop]);

  // ── Save config to DB ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true); setSaveOk(false);
    try {
      const payload = {
        body_color:       draft.bodyColor,
        accent_color:     draft.accentColor,
        cheek_color:      draft.cheekColor,
        eye_color:        draft.eyeColor,
        scarf_color:      draft.scarfColor,
        mascot_name:      draft.mascotName,
        mascot_slogan:    draft.mascotSlogan,
        idle_animation:   draft.idleAnimation,
        enable_shadow:    draft.enableShadow ? '1' : '0',
        enable_particles: draft.enableParticles ? '1' : '0',
        scale_factor:     String(draft.scaleFactor),
        ambient_light:    String(draft.ambientLight),
      };
      const res = await fetch(`${apiUrl}?action=mascot_config`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Lưu thất bại');
      setConfig({ ...draft }); setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setLoadError(String(err));
    } finally { setSaving(false); }
  };

  const handleReset = () => setDraft({ ...config });

  const mascotCfg: Mascot3DConfig = {
    bodyColor:   draft.bodyColor,
    accentColor: draft.accentColor,
    cheekColor:  draft.cheekColor,
    eyeColor:    draft.eyeColor,
    scarfColor:  draft.scarfColor,
    idleAnimation: (['float', 'bounce', 'sway'].includes(draft.idleAnimation) ? draft.idleAnimation : 'float') as Mascot3DConfig['idleAnimation'],
    enableShadow: draft.enableShadow,
    enableParticles: draft.enableParticles,
    scaleFactor: draft.scaleFactor,
    ambientLight: draft.ambientLight,
  };

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <div className="mascot-admin-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mascot-admin-header">
        <div className="mascot-admin-header-left">
          <div className="mascot-admin-header-icon">✦</div>
          <div>
            <h1 className="mascot-admin-title">Linh Vật Aurora 3D</h1>
            <p className="mascot-admin-subtitle">Quản lý và tuỳ chỉnh linh vật 3D của rạp chiếu phim</p>
          </div>
        </div>
        <div className="mascot-admin-header-actions">
          {hasChanges && (
            <>
              <button className="mascot-btn mascot-btn-ghost" onClick={handleReset} disabled={saving}>
                ↺ Huỷ thay đổi
              </button>
              <button className="mascot-btn mascot-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="mascot-btn-spinner" /> : '💾'} Lưu cấu hình
              </button>
            </>
          )}
          {saveOk && <span className="mascot-save-ok">✓ Đã lưu thành công!</span>}
        </div>
      </div>

      {loadError && (
        <div className="mascot-admin-error">
          <span>⚠️</span> {loadError}
          <button onClick={() => setLoadError('')}>✕</button>
        </div>
      )}

      {/* ── Layout ─────────────────────────────────────────────────────── */}
      <div className="mascot-admin-layout">

        {/* ── Left: 3D Preview Pane ───────────────────────────────────── */}
        <div className="mascot-preview-pane">
          <div className="mascot-preview-stage">
            {/* Ambient glow */}
            <div className="mascot-preview-glow" />
            <AuroraMascot3D
              expression={expression}
              pose={pose}
              talking={talking}
              interactive
              size={280}
              config={mascotCfg}
            />
            {/* Name badge */}
            <div className="mascot-preview-badge">
              <span>✦</span> {draft.mascotName}
            </div>
            <p className="mascot-preview-slogan">"{draft.mascotSlogan}"</p>
          </div>

          {/* Quick controls */}
          <div className="mascot-quick-controls">
            <div className="mascot-quick-row">
              <span className="mascot-quick-label">Nói chuyện</span>
              <button
                className={`mascot-toggle ${talking ? 'on' : ''}`}
                onClick={() => setTalking(t => !t)}
              >
                <span />
              </button>
            </div>
            <div className="mascot-quick-row">
              <span className="mascot-quick-label">Tự động demo</span>
              <button
                className={`mascot-toggle ${autoLoop ? 'on' : ''}`}
                onClick={() => setAutoLoop(a => !a)}
              >
                <span />
              </button>
            </div>
          </div>

          {/* Pose grid */}
          <div className="mascot-pose-grid">
            <div className="mascot-section-title">⚡ Pose nhanh</div>
            <div className="mascot-pose-buttons">
              {POSES.map(p => (
                <button
                  key={p}
                  className={`mascot-pose-btn ${pose === p ? 'active' : ''}`}
                  onClick={() => { setPose(p); setAutoLoop(false); }}
                >
                  {POSE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Expression grid */}
          <div className="mascot-pose-grid">
            <div className="mascot-section-title">😊 Biểu cảm</div>
            <div className="mascot-pose-buttons">
              {EXPRESSIONS.map(ex => (
                <button
                  key={ex}
                  className={`mascot-pose-btn ${expression === ex ? 'active' : ''}`}
                  onClick={() => { setExpression(ex); setAutoLoop(false); }}
                >
                  {EXPRESSION_LABELS[ex]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ─────────────────────────────────────────────── */}
        <div className="mascot-config-pane">
          {/* Tabs */}
          <div className="mascot-tabs">
            {(['preview', 'colors', 'behavior', 'stats'] as const).map(t => (
              <button
                key={t}
                className={`mascot-tab ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {{ preview: '🖼️ Cài đặt', colors: '🎨 Màu sắc', behavior: '⚙️ Hành vi', stats: '📊 Thống kê' }[t]}
              </button>
            ))}
          </div>

          {/* ── Tab: Preview/Info ──────────────────────────────────────── */}
          {tab === 'preview' && (
            <div className="mascot-tab-content">
              <div className="mascot-form-section">
                <h3 className="mascot-form-title">🏷️ Thông tin linh vật</h3>
                <label className="mascot-form-label">
                  Tên linh vật
                  <input
                    className="mascot-form-input"
                    value={draft.mascotName}
                    onChange={e => setDraft(d => ({ ...d, mascotName: e.target.value }))}
                    maxLength={40}
                    placeholder="Aurora"
                  />
                </label>
                <label className="mascot-form-label">
                  Slogan
                  <input
                    className="mascot-form-input"
                    value={draft.mascotSlogan}
                    onChange={e => setDraft(d => ({ ...d, mascotSlogan: e.target.value }))}
                    maxLength={120}
                    placeholder="Cùng bạn tận hưởng..."
                  />
                </label>
              </div>

              <div className="mascot-form-section">
                <h3 className="mascot-form-title">🔆 Ánh sáng</h3>
                <label className="mascot-form-label">
                  Ánh sáng môi trường ({Math.round(draft.ambientLight * 100)}%)
                  <input
                    type="range" min="0.1" max="1.2" step="0.05"
                    value={draft.ambientLight}
                    onChange={e => setDraft(d => ({ ...d, ambientLight: parseFloat(e.target.value) }))}
                    className="mascot-slider"
                  />
                </label>
                <label className="mascot-form-label">
                  Tỷ lệ kích thước ({draft.scaleFactor.toFixed(2)}x)
                  <input
                    type="range" min="0.5" max="1.8" step="0.05"
                    value={draft.scaleFactor}
                    onChange={e => setDraft(d => ({ ...d, scaleFactor: parseFloat(e.target.value) }))}
                    className="mascot-slider"
                  />
                </label>
              </div>

              <div className="mascot-form-section">
                <h3 className="mascot-form-title">✨ Hiệu ứng</h3>
                <label className="mascot-toggle-label">
                  <span>Bóng đổ điện ảnh</span>
                  <button
                    className={`mascot-toggle ${draft.enableShadow ? 'on' : ''}`}
                    onClick={() => setDraft(d => ({ ...d, enableShadow: !d.enableShadow }))}
                  ><span /></button>
                </label>
                <label className="mascot-toggle-label">
                  <span>Hiệu ứng hạt (particles)</span>
                  <button
                    className={`mascot-toggle ${draft.enableParticles ? 'on' : ''}`}
                    onClick={() => setDraft(d => ({ ...d, enableParticles: !d.enableParticles }))}
                  ><span /></button>
                </label>
              </div>

              <div className="mascot-info-box">
                <p>💡 <strong>Engine:</strong> Connected 2.5D với spring parallax</p>
                <p>🎬 <strong>FPS:</strong> requestAnimationFrame 60fps khi đang hiển thị</p>
                <p>🖥️ <strong>Render:</strong> Pose PNG trong suốt + crossfade + CSS perspective</p>
                <p>📐 <strong>Silhouette:</strong> Toàn thân liền khối, không lộ khe khớp</p>
              </div>
            </div>
          )}

          {/* ── Tab: Colors ───────────────────────────────────────────── */}
          {tab === 'colors' && (
            <div className="mascot-tab-content">
              <div className="mascot-form-section">
                <h3 className="mascot-form-title">🎨 Bảng màu hiệu ứng</h3>
                <p className="mascot-form-desc">Các màu điều khiển aura, hạt sáng, bóng và hiệu ứng biểu cảm; ảnh master không bị nhuộm màu.</p>
                <ColorRow label="🌟 Thân chính (vàng sao)" value={draft.bodyColor}   onChange={v => setDraft(d => ({ ...d, bodyColor: v }))} />
                <ColorRow label="🌙 Nhấn (xanh navy)"      value={draft.accentColor} onChange={v => setDraft(d => ({ ...d, accentColor: v }))} />
                <ColorRow label="🌸 Má hồng"               value={draft.cheekColor}  onChange={v => setDraft(d => ({ ...d, cheekColor: v }))} />
                <ColorRow label="👁️ Mắt"                   value={draft.eyeColor}    onChange={v => setDraft(d => ({ ...d, eyeColor: v }))} />
                <ColorRow label="🧣 Khăn choàng"           value={draft.scarfColor}  onChange={v => setDraft(d => ({ ...d, scarfColor: v }))} />
              </div>

              <div className="mascot-color-presets">
                <h3 className="mascot-form-title">🎭 Bộ màu có sẵn</h3>
                {[
                  { label: 'Aurora Classic', bodyColor: '#F7D25E', accentColor: '#0F1B3D', cheekColor: '#FFB8C6', eyeColor: '#1A1A3A', scarfColor: '#162850' },
                  { label: 'Midnight Blue', bodyColor: '#B8D4FF', accentColor: '#0A0F2E', cheekColor: '#C8AAFF', eyeColor: '#050D2A', scarfColor: '#1A0940' },
                  { label: 'Sunset Gold',   bodyColor: '#FFD066', accentColor: '#8B2000', cheekColor: '#FF8C7A', eyeColor: '#3D0C00', scarfColor: '#7A1800' },
                  { label: 'Sakura Pink',   bodyColor: '#FFD6E8', accentColor: '#5C1A3A', cheekColor: '#FFB0CC', eyeColor: '#3A0A22', scarfColor: '#8B2A55' },
                  { label: 'Ocean Teal',    bodyColor: '#7FDEDB', accentColor: '#0A3030', cheekColor: '#B0FFEE', eyeColor: '#051A1A', scarfColor: '#104040' },
                  { label: 'Lavender Dream',bodyColor: '#D8B4FE', accentColor: '#2D1B69', cheekColor: '#F0ABFC', eyeColor: '#1A0F3D', scarfColor: '#3D1B7A' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    className="mascot-preset-btn"
                    onClick={() => setDraft(d => ({ ...d, ...preset }))}
                  >
                    <div className="mascot-preset-swatch">
                      <span style={{ background: preset.bodyColor }} />
                      <span style={{ background: preset.accentColor }} />
                      <span style={{ background: preset.cheekColor }} />
                    </div>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Behavior ─────────────────────────────────────────── */}
          {tab === 'behavior' && (
            <div className="mascot-tab-content">
              <div className="mascot-form-section">
                <h3 className="mascot-form-title">🎬 Animation mặc định</h3>
                <label className="mascot-form-label">
                  Kiểu idle
                  <select
                    className="mascot-form-select"
                    value={draft.idleAnimation}
                    onChange={e => setDraft(d => ({ ...d, idleAnimation: e.target.value }))}
                  >
                    <option value="float">Float – Lơ lửng nhẹ nhàng</option>
                    <option value="bounce">Bounce – Nảy lên xuống</option>
                    <option value="sway">Sway – Lắc lư</option>
                  </select>
                </label>
              </div>

              <div className="mascot-form-section">
                <h3 className="mascot-form-title">📋 Bảng pose & biểu cảm đầy đủ</h3>
                <div className="mascot-matrix">
                  <div className="mascot-matrix-section">
                    <div className="mascot-matrix-title">Poses</div>
                    {POSES.map(p => (
                      <div key={p} className="mascot-matrix-item">
                        <span className="mascot-matrix-key">{p}</span>
                        <span className="mascot-matrix-val">{POSE_LABELS[p]}</span>
                        <button
                          className="mascot-matrix-btn"
                          onClick={() => { setPose(p); setTab('preview'); }}
                        >▶</button>
                      </div>
                    ))}
                  </div>
                  <div className="mascot-matrix-section">
                    <div className="mascot-matrix-title">Expressions</div>
                    {EXPRESSIONS.map(ex => (
                      <div key={ex} className="mascot-matrix-item">
                        <span className="mascot-matrix-key">{ex}</span>
                        <span className="mascot-matrix-val">{EXPRESSION_LABELS[ex]}</span>
                        <button
                          className="mascot-matrix-btn"
                          onClick={() => { setExpression(ex); setTab('preview'); }}
                        >▶</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mascot-info-box">
                <p>⚡ <strong>Spring Physics:</strong> Stiffness 140–900, Damping 12–28</p>
                <p>🔄 <strong>Loop:</strong> 60fps requestAnimationFrame, delta-time clamp 50ms</p>
                <p>👁️ <strong>Blink:</strong> Tự động ngẫu nhiên 2.2–6s, natural lid morph</p>
                <p>🖱️ <strong>Look-at:</strong> Camera parallax + eye gaze tracking chuột</p>
              </div>
            </div>
          )}

          {/* ── Tab: Stats ────────────────────────────────────────────── */}
          {tab === 'stats' && (
            <div className="mascot-tab-content">
              <div className="mascot-form-section">
                <h3 className="mascot-form-title">📊 Thống kê tương tác (aurora_db)</h3>
                {stats ? (
                  <div className="mascot-stats-grid">
                    <StatCard icon="👆" label="Tổng tương tác" value={stats.totalEventsAllTime.toLocaleString('vi-VN')} sub="Toàn thời gian" />
                    <StatCard icon="👤" label="Người dùng độc lập" value={stats.uniqueUsersAllTime.toLocaleString('vi-VN')} sub="Đã tương tác" />
                    <StatCard icon="💬" label="Lần mở chat" value={stats.totalChatOpens.toLocaleString('vi-VN')} sub="Với Aurora AI" />
                    <StatCard icon="📅" label="7 ngày qua" value={stats.eventsLast7d.toLocaleString('vi-VN')} sub="Sự kiện gần đây" />
                    <StatCard icon="🔥" label="Hôm nay" value={stats.eventsToday.toLocaleString('vi-VN')} sub="Sự kiện ngày nay" />
                  </div>
                ) : (
                  <div className="mascot-stats-empty">
                    <div className="mascot-stats-spinner" />
                    <p>Đang tải dữ liệu từ aurora_db…</p>
                    <p className="mascot-stats-note">
                      Cần chạy <code>mascot_3d_system.sql</code> trong aurora_db và API endpoint <code>mascot_stats</code>.
                    </p>
                  </div>
                )}
              </div>

              <div className="mascot-form-section">
                <h3 className="mascot-form-title">🗃️ Bảng dữ liệu aurora_db</h3>
                <div className="mascot-db-table-list">
                  {[
                    { table: 'mascot_3d_config',      desc: 'Cấu hình màu sắc, tên, slogan…',        rows: '~16 rows' },
                    { table: 'mascot_3d_events',       desc: 'Log sự kiện click, hover, mở chat…',    rows: 'Tăng theo thời gian' },
                    { table: 'mascot_3d_daily_stats',  desc: 'Thống kê tổng hợp theo ngày',           rows: '1 row/ngày' },
                    { table: 'mascot_3d_stats_summary',desc: 'View tổng hợp cho dashboard',           rows: 'VIEW' },
                  ].map(t => (
                    <div key={t.table} className="mascot-db-row">
                      <code className="mascot-db-name">{t.table}</code>
                      <span className="mascot-db-desc">{t.desc}</span>
                      <span className="mascot-db-rows">{t.rows}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mascot-info-box">
                <p>📁 Migration file: <code>customer/backend/database/mascot_3d_system.sql</code></p>
                <p>🔗 API actions: <code>mascot_config</code>, <code>mascot_stats</code>, <code>mascot_event</code></p>
                <p>🔐 Bảo mật: Chỉ admin mới có quyền POST vào mascot_config</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
