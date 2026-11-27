/**
 * AuroraMascotShowcase – Trang giới thiệu linh vật 3D Aurora Cinema
 * Standalone showcase page hiển thị đầy đủ các pose & biểu cảm 3D.
 */
import { useState } from 'react';
import AuroraMascot3D, { Mascot3DExpression, Mascot3DPose } from './AuroraMascot3D';
import './AuroraMascotShowcase.css';

const EXPRESSIONS: { key: Mascot3DExpression; emoji: string; label: string }[] = [
  { key: 'happy',     emoji: '😊', label: 'Bình thường' },
  { key: 'excited',   emoji: '🤩', label: 'Hào hứng'   },
  { key: 'curious',   emoji: '🤔', label: 'Tò mò'      },
  { key: 'wink',      emoji: '😉', label: 'Nháy mắt'   },
  { key: 'love',      emoji: '🥰', label: 'Yêu thích'  },
  { key: 'surprised', emoji: '😲', label: 'Bất ngờ'    },
  { key: 'focused',   emoji: '🎯', label: 'Tập trung'  },
  { key: 'thinking',  emoji: '💭', label: 'Suy nghĩ'   },
  { key: 'sad',       emoji: '😢', label: 'Buồn'        },
  { key: 'announce',  emoji: '📣', label: 'Thông báo'  },
];

const POSES: { key: Mascot3DPose; emoji: string; label: string }[] = [
  { key: 'idle',     emoji: '🧍', label: 'Bình thường' },
  { key: 'wave',     emoji: '👋', label: 'Vẫy chào'   },
  { key: 'point',    emoji: '👉', label: 'Chỉ tay'    },
  { key: 'clap',     emoji: '👏', label: 'Vỗ tay'     },
  { key: 'think',    emoji: '🤔', label: 'Đang nghĩ'  },
  { key: 'heart',    emoji: '❤️', label: 'Trái tim'   },
  { key: 'announce', emoji: '📣', label: 'Thông báo'  },
  { key: 'bow',      emoji: '🙇', label: 'Cúi chào'   },
  { key: 'jump',     emoji: '🦘', label: 'Nhảy lên'   },
  { key: 'spin',     emoji: '🌀', label: 'Xoay tròn'  },
];

export default function AuroraMascotShowcase() {
  const [expression, setExpression] = useState<Mascot3DExpression>('happy');
  const [pose, setPose]             = useState<Mascot3DPose>('wave');
  const [talking, setTalking]       = useState(false);

  return (
    <div className="showcase-page">
      {/* Background FX */}
      <div className="showcase-bg" aria-hidden="true">
        <div className="showcase-bg-glow glow-a" />
        <div className="showcase-bg-glow glow-b" />
        <div className="showcase-bg-stars">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} className="showcase-star" style={{
              left: `${(i * 37 + 11) % 100}%`,
              top:  `${(i * 53 + 7) % 100}%`,
              animationDelay: `${(i * 0.41) % 3.5}s`,
              fontSize: `${8 + (i % 5) * 3}px`,
            }}>✦</span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="showcase-header">
        <div className="showcase-logo">
          <span className="showcase-logo-icon">✦</span>
          <span className="showcase-logo-text">AURORA<span>CINEMA</span></span>
        </div>
        <h1 className="showcase-title">Linh Vật Aurora 3D</h1>
        <p className="showcase-subtitle">
          Silhouette liền khối • Spring parallax 2.5D • Chuyển động mượt 60fps
        </p>
      </header>

      {/* Main hero */}
      <section className="showcase-hero">
        <div className="showcase-hero-stage">
          <div className="showcase-hero-ring" />
          <div className="showcase-hero-ring ring-2" />
          <AuroraMascot3D
            expression={expression}
            pose={pose}
            talking={talking}
            interactive
            size={320}
          />
          <div className="showcase-hero-label">
            <span>✦</span> Aurora
          </div>
        </div>

        <div className="showcase-hero-controls">
          <div className="showcase-ctrl-group">
            <div className="showcase-ctrl-title">💬 Đang nói chuyện</div>
            <button
              className={`showcase-toggle ${talking ? 'on' : ''}`}
              onClick={() => setTalking(t => !t)}
            >
              <span />{talking ? 'Đang nói' : 'Im lặng'}
            </button>
          </div>

          <div className="showcase-ctrl-group">
            <div className="showcase-ctrl-title">🎭 Pose hiện tại</div>
            <div className="showcase-active-info">
              {POSES.find(p => p.key === pose)?.emoji} {POSES.find(p => p.key === pose)?.label}
            </div>
          </div>

          <div className="showcase-ctrl-group">
            <div className="showcase-ctrl-title">😊 Biểu cảm</div>
            <div className="showcase-active-info">
              {EXPRESSIONS.find(e => e.key === expression)?.emoji} {EXPRESSIONS.find(e => e.key === expression)?.label}
            </div>
          </div>

          <div className="showcase-tech-badges">
            <span>Connected 2.5D</span><span>Spring Motion</span>
            <span>Pose Crossfade</span><span>60fps</span>
            <span>Transparent PNG</span><span>Reduced Motion</span>
          </div>
        </div>
      </section>

      {/* Pose Selector */}
      <section className="showcase-section">
        <h2 className="showcase-section-title">
          <span>⚡</span> Chọn Pose
        </h2>
        <div className="showcase-grid">
          {POSES.map(p => (
            <button
              key={p.key}
              className={`showcase-card ${pose === p.key ? 'active' : ''}`}
              onClick={() => setPose(p.key)}
            >
              <AuroraMascot3D
                expression={expression}
                pose={p.key}
                talking={talking && p.key === pose}
                interactive={false}
                size={110}
              />
              <div className="showcase-card-label">
                <span>{p.emoji}</span> {p.label}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Expression Selector */}
      <section className="showcase-section">
        <h2 className="showcase-section-title">
          <span>😊</span> Chọn Biểu Cảm
        </h2>
        <div className="showcase-grid">
          {EXPRESSIONS.map(ex => (
            <button
              key={ex.key}
              className={`showcase-card ${expression === ex.key ? 'active' : ''}`}
              onClick={() => setExpression(ex.key)}
            >
              <AuroraMascot3D
                expression={ex.key}
                pose={pose}
                talking={false}
                interactive={false}
                size={110}
              />
              <div className="showcase-card-label">
                <span>{ex.emoji}</span> {ex.label}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Feature callouts */}
      <section className="showcase-features">
        <h2 className="showcase-section-title"><span>✨</span> Công nghệ</h2>
        <div className="showcase-features-grid">
          {[
            { icon: '🖥️', title: 'Connected 2.5D',       body: 'Mỗi pose dùng silhouette toàn thân trong suốt, giữ tay, chân và khăn nối liền ở mọi khung hình' },
            { icon: '⚡', title: 'Spring Motion',         body: 'Spring parallax nội suy độ nghiêng, dịch chuyển và nhịp thở tự nhiên theo con trỏ' },
            { icon: '🎬', title: '60fps Smooth',          body: 'requestAnimationFrame có delta-time clamping và tự dừng khi tab ẩn hoặc ngoài viewport' },
            { icon: '👁️', title: 'Natural Reactions',    body: 'Chớp mắt ngẫu nhiên, pointer parallax và các hiệu ứng trạng thái giúp nhân vật có sức sống' },
            { icon: '😊', title: '10 Expressions',       body: 'Biểu cảm vui, buồn, nháy mắt, ngạc nhiên, yêu thích và tập trung được điều khiển theo ngữ cảnh' },
            { icon: '💡', title: 'Cinematic Lighting',   body: 'Ánh sáng studio được giữ nguyên từ master render, bổ sung aura, gloss và bóng nền mềm' },
            { icon: '✦',  title: 'Particle Effects',     body: 'Hạt vàng lấp lánh và hiệu ứng tim, dấu hỏi, giọng nói đồng bộ với trạng thái' },
            { icon: '🎨', title: 'FX Configuration',     body: 'Admin cấu hình màu aura, hiệu ứng, độ sáng, tỷ lệ và kiểu idle trong aurora_db' },
          ].map(f => (
            <div key={f.title} className="showcase-feature-card">
              <div className="showcase-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="showcase-footer">
        <p>Aurora Cinema • Cinematic 2.5D • React + TypeScript</p>
        <p>Dữ liệu cấu hình lưu trong <code>aurora_db.mascot_3d_config</code></p>
      </footer>
    </div>
  );
}
