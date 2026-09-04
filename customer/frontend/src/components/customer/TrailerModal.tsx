import { PlayCircle, X } from 'lucide-react';

type Props = { movie: any; onClose: () => void };

export default function TrailerModal({ movie, onClose }: Props) {
  const match = movie.trailerUrl && (movie.trailerUrl.match(/[?&]v=([^&]+)/) || movie.trailerUrl.match(/youtu\.be\/([^?]+)/));

  return <div style={overlay} onClick={onClose}>
    <section style={modal} onClick={event => event.stopPropagation()}>
      <button onClick={onClose} style={close} aria-label="Đóng trailer"><X size={19} /></button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f4c04a', fontSize: 12, fontWeight: 900, letterSpacing: .8, marginBottom: 14 }}><PlayCircle size={17} /> TRAILER · AURORA CINEMA</div>
      <h2 style={{ color: '#fff', fontSize: 22, margin: '0 0 16px' }}>{movie.title}</h2>
      {match ? <div style={frame}><iframe title={`Trailer ${movie.title}`} src={`https://www.youtube.com/embed/${match[1]}?autoplay=1`} style={video} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div> : <div style={empty}>Trailer của phim này chưa được cập nhật trong hệ thống.</div>}
    </section>
  </div>;
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(3,10,20,.86)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modal: React.CSSProperties = { width: 'min(850px,100%)', background: '#071526', border: '1px solid rgba(244,192,74,.35)', borderRadius: 16, padding: 24, position: 'relative', boxShadow: '0 25px 80px rgba(0,0,0,.5)' };
const close: React.CSSProperties = { position: 'absolute', top: 14, right: 14, width: 34, height: 34, border: 0, borderRadius: '50%', background: 'rgba(255,255,255,.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const frame: React.CSSProperties = { aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 10, background: '#000' };
const video: React.CSSProperties = { display: 'block', width: '100%', height: '100%', border: 0 };
const empty: React.CSSProperties = { padding: '70px 20px', textAlign: 'center', color: '#cbd5e1', background: '#10233a', borderRadius: 10 };
