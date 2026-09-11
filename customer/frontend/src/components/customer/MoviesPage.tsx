import React, { useState, useMemo } from 'react';
import { Ticket, Clock, Film, Search, Sparkles, Play, ChevronRight, Tag } from 'lucide-react';

export type Movie = {
  id: number;
  title: string;
  description?: string;
  durationMinutes: number;
  duration?: number;
  ageRating: string;
  rating?: string;
  format: string;
  genre?: string;
  posterUrl: string;
  poster?: string;
  trailerUrl?: string;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING' | 'ENDED';
  releaseDate?: string;
  isHot?: boolean;
};

type Props = {
  movies: Movie[];
  theaters?: any[];
  selectedTheater?: string;
  onSelectMovie: (movie: Movie) => void;
  onBookMovie: (movie: Movie) => void;
  onWatchTrailer?: (movie: Movie) => void;
  initialTab?: 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING';
};

const TAB_CONFIG = [
  { key: 'COMING_SOON', label: 'PHIM SẮP CHIẾU' },
  { key: 'NOW_SHOWING', label: 'PHIM ĐANG CHIẾU' },
  { key: 'SPECIAL_SHOWING', label: 'SUẤT CHIẾU ĐẶC BIỆT' },
] as const;

export default function MoviesPage({
  movies,
  onSelectMovie,
  onBookMovie,
  onWatchTrailer,
  initialTab = 'NOW_SHOWING',
}: Props) {
  const [activeTab, setActiveTab] = useState<'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');

  // Filter movies according to active tab
  const tabMovies = useMemo(() => {
    return movies.filter((m) => m.status === activeTab);
  }, [movies, activeTab]);

  // Extract all unique genre labels for filtering
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    tabMovies.forEach((m) => {
      if (m.genre) {
        m.genre.split(',').forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set);
  }, [tabMovies]);

  // Search and genre filtered list
  const filteredMovies = useMemo(() => {
    return tabMovies.filter((m) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.genre && m.genre.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchGenre =
        selectedGenre === 'ALL' ||
        (m.genre && m.genre.includes(selectedGenre));
      return matchSearch && matchGenre;
    });
  }, [tabMovies, searchQuery, selectedGenre]);

  // Helper for age rating badge styling
  const getRatingBadgeStyle = (rating?: string) => {
    const r = (rating || 'P').toUpperCase();
    if (r === 'P') return { bg: '#22c55e', text: '#fff', label: 'P' };
    if (r === 'K') return { bg: '#eab308', text: '#fff', label: 'K' };
    if (r === 'T13') return { bg: '#f97316', text: '#fff', label: 'T13' };
    if (r === 'T16') return { bg: '#ea580c', text: '#fff', label: 'T16' };
    if (r === 'T18') return { bg: '#ef4444', text: '#fff', label: 'T18' };
    if (r === '4DX') return { bg: '#8b5cf6', text: '#fff', label: '4DX' };
    return { bg: '#64748b', text: '#fff', label: r };
  };

  return (
    <div style={{ background: '#ffffff', minHeight: 'calc(100vh - 120px)', paddingBottom: 60 }}>
      {/* PAGE CONTAINER */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 16px 0' }}>
        
        {/* BREADCRUMB */}
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#b7791f', fontWeight: 700, cursor: 'pointer' }}>Trang chủ</span>
          <span>›</span>
          <span style={{ color: '#1e293b', fontWeight: 700 }}>Danh sách phim</span>
        </div>

        {/* TABS HEADER - EXACT LAYOUT AS REFERENCE SCREENSHOT */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 36,
            borderBottom: '1px solid #e2e8f0',
            marginBottom: 28,
            paddingBottom: 0,
            overflowX: 'auto',
          }}
        >
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedGenre('ALL');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 6px 16px',
                  fontSize: 16.5,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  color: isActive ? '#b7791f' : '#334155',
                  cursor: 'pointer',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s ease',
                  outline: 'none',
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: '#d4a72c',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* SEARCH & QUICK GENRE FILTER BAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 26,
            padding: '12px 18px',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px solid #edf2f7',
          }}
        >
          {/* Genre chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginRight: 4 }}>
              Thể loại:
            </span>
            <button
              onClick={() => setSelectedGenre('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: selectedGenre === 'ALL' ? 700 : 500,
                background: selectedGenre === 'ALL' ? '#0d1b2e' : '#fff',
                color: selectedGenre === 'ALL' ? '#fff' : '#475569',
                border: selectedGenre === 'ALL' ? '1px solid #0d1b2e' : '1px solid #d1d5db',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Tất cả
            </button>
            {allGenres.slice(0, 6).map((g) => {
              const active = selectedGenre === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(active ? 'ALL' : g)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    background: active ? '#0d1b2e' : '#fff',
                    color: active ? '#fff' : '#475569',
                    border: active ? '1px solid #0d1b2e' : '1px solid #d1d5db',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', minWidth: 240, maxWidth: 320, flex: '1 1 200px' }}>
            <Search
              size={15}
              color="#94a3b8"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm phim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px 8px 34px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#fff',
                outline: 'none',
                color: '#0f172a',
              }}
            />
          </div>
        </div>

        {/* MOVIES GRID - 4 COLUMNS EXACTLY AS REFERENCE */}
        {filteredMovies.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '30px 22px',
            }}
          >
            {filteredMovies.map((movie) => {
              const ratingBadge = getRatingBadgeStyle(movie.ageRating || movie.rating);
              const duration = movie.durationMinutes || movie.duration || 120;
              const poster = movie.posterUrl || movie.poster;

              return (
                <div
                  key={movie.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  {/* POSTER WRAPPER */}
                  <div
                    onClick={() => onSelectMovie(movie)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '2 / 3',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      background: '#1e293b',
                    }}
                    className="movie-poster-card"
                  >
                    {/* Poster Image */}
                    {poster ? (
                      <img
                        src={poster}
                        alt={movie.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.35s ease',
                        }}
                        className="poster-img"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 10,
                          color: '#f4c04a',
                          background: 'linear-gradient(145deg, #0d1b2e, #1a3050)',
                        }}
                      >
                        <Film size={44} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>Aurora Cinema</span>
                      </div>
                    )}

                    {/* AGE RATING BADGE (TOP-LEFT) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: ratingBadge.bg,
                        color: ratingBadge.text,
                        fontSize: 11.5,
                        fontWeight: 900,
                        padding: '3px 8px',
                        borderRadius: 6,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        letterSpacing: 0.5,
                        zIndex: 3,
                      }}
                    >
                      {ratingBadge.label}
                    </div>

                    {/* HOT CORNER RIBBON (TOP-RIGHT) */}
                    {(movie.isHot || movie.status === 'NOW_SHOWING') && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 14,
                          right: -32,
                          transform: 'rotate(45deg)',
                          background: 'linear-gradient(135deg, #ff4d4f 0%, #e63946 100%)',
                          color: '#ffffff',
                          fontSize: 10.5,
                          fontWeight: 900,
                          padding: '3px 36px',
                          letterSpacing: 0.8,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          textTransform: 'uppercase',
                          zIndex: 3,
                          pointerEvents: 'none',
                        }}
                      >
                        HOT
                      </div>
                    )}

                    {/* HOVER OVERLAY WITH TRAILER / DETAIL ACTION */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
                        opacity: 0,
                        transition: 'opacity 0.25s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 10,
                        zIndex: 2,
                      }}
                      className="poster-overlay"
                    >
                      {movie.trailerUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onWatchTrailer) onWatchTrailer(movie);
                            else onSelectMovie(movie);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(255,255,255,0.92)',
                            color: '#0d1b2e',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 20,
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          <Play size={14} fill="#0d1b2e" /> Trailer
                        </button>
                      )}
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Xem chi tiết</span>
                    </div>
                  </div>

                  {/* MOVIE INFO BELOW POSTER */}
                  <div style={{ marginTop: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* TITLE */}
                    <h3
                      onClick={() => onSelectMovie(movie)}
                      title={movie.title}
                      style={{
                        margin: '0 0 6px',
                        fontSize: 16,
                        fontWeight: 800,
                        color: '#0d1b2e',
                        lineHeight: 1.35,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {movie.title}
                    </h3>

                    {/* GENRE */}
                    <div
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <strong style={{ color: '#334155' }}>Thể loại:</strong>{' '}
                      {movie.genre || 'Hành động, Phiêu lưu'}
                    </div>

                    {/* DURATION */}
                    <div
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginBottom: 12,
                      }}
                    >
                      <strong style={{ color: '#334155' }}>Thời lượng:</strong> {duration} phút
                    </div>

                    {/* ACTION BUTTON - MUA VÉ */}
                    <div style={{ marginTop: 'auto' }}>
                      <button
                        onClick={() => {
                          if (movie.status === 'COMING_SOON') {
                            onSelectMovie(movie);
                          } else {
                            onBookMovie(movie);
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'linear-gradient(135deg, #0d1b2e 0%, #1a3050 100%)',
                          color: '#f8e8b0',
                          border: '1px solid #263f61',
                          borderRadius: 8,
                          fontSize: 13.5,
                          fontWeight: 800,
                          letterSpacing: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 9,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 10px rgba(13, 27, 46, 0.24)',
                        }}
                        className="btn-muave"
                      >
                        {/* Điểm nhấn vàng kim theo nhận diện Aurora Cinema */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(244, 192, 74, 0.16)',
                            borderRadius: 4,
                            padding: '2px 4px',
                          }}
                        >
                          <Ticket size={16} color="#f4c04a" />
                        </span>
                        {movie.status === 'COMING_SOON' ? 'XEM CHI TIẾT' : 'MUA VÉ'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: 16,
              border: '1px dashed #cbd5e1',
            }}
          >
            <Film size={44} color="#94a3b8" style={{ marginBottom: 12 }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 18, color: '#1e293b' }}>
              Không tìm thấy phim phù hợp
            </h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              Vui lòng thử chọn danh mục hoặc tìm kiếm với từ khóa khác.
            </p>
          </div>
        )}
      </div>

      {/* COMPONENT STYLES */}
      <style>{`
        .movie-poster-card:hover .poster-img {
          transform: scale(1.05);
        }
        .movie-poster-card:hover .poster-overlay {
          opacity: 1 !important;
        }
        .btn-muave:hover {
          background: linear-gradient(135deg, #1a3050 0%, #263f61 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 7px 16px rgba(13, 27, 46, 0.3) !important;
        }
        .btn-muave:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
