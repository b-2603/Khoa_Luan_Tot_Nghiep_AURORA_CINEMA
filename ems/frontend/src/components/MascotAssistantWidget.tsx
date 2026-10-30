import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Maximize2, Send, Sparkles, User, RefreshCw, 
  ChevronRight, Zap, Volume2, VolumeX, Copy, Check 
} from 'lucide-react';
import { useCinemaAiChat, PersonaType, ChatMessage } from '../hooks/useCinemaAiChat';
import { AiMessageRenderer } from './AiMessageRenderer';
import { AiAssistantModal } from './AiAssistantModal';

interface MascotAssistantWidgetProps {
  userRole: string;
  userId?: string | number;
  userName?: string;
  onNavigateTab?: (tab: string) => void;
  isFullModalOpen: boolean;
  onToggleFullModal: (open: boolean) => void;
  onOpenKeyModal?: () => void;
}

export const MascotAssistantWidget: React.FC<MascotAssistantWidgetProps> = ({
  userRole,
  userId,
  userName,
  onNavigateTab,
  isFullModalOpen,
  onToggleFullModal,
  onOpenKeyModal,
}) => {
  // Shared AI Chat state
  const chat = useCinemaAiChat({ userRole, userId, userName });
  const { 
    query, 
    setQuery, 
    loading, 
    messages, 
    sendMessage, 
    copiedId, 
    handleCopy, 
    isSpeakingId, 
    handleSpeak, 
    handleResetChat 
  } = chat;

  // Mascot Position & Dragging State
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('aurora_mascot_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      // Fallback
    }
    // Default bottom-right corner
    return {
      x: typeof window !== 'undefined' ? window.innerWidth - 110 : 800,
      y: typeof window !== 'undefined' ? window.innerHeight - 135 : 600,
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isMiniChatOpen, setIsMiniChatOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartClient = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep mascot on-screen when window resizes
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(12, Math.min(window.innerWidth - 100, prev.x)),
        y: Math.max(12, Math.min(window.innerHeight - 120, prev.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll messages in mini chat
  useEffect(() => {
    if (isMiniChatOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isMiniChatOpen, messages, loading]);

  // Handle Dragging (Mouse & Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartClient.current = { x: clientX, y: clientY };
    dragStartOffset.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartClient.current.x;
    const dy = clientY - dragStartClient.current.y;
    if (Math.hypot(dx, dy) > 6) {
      hasDraggedRef.current = true;
    }

    const newX = clientX - dragStartOffset.current.x;
    const newY = clientY - dragStartOffset.current.y;

    const clampedX = Math.max(12, Math.min(window.innerWidth - 100, newX));
    const clampedY = Math.max(12, Math.min(window.innerHeight - 120, newY));

    setPosition({ x: clampedX, y: clampedY });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!hasDraggedRef.current) {
      // It was a click/tap: toggle mini chat bubble
      setIsMiniChatOpen((prev) => !prev);
      setShowGreeting(false);
    } else {
      // Saved dragged position
      localStorage.setItem('aurora_mascot_pos', JSON.stringify(position));
    }
  }, [isDragging, position]);

  // Window event listeners for dragging
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handlePointerUp();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const handleMiniSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      sendMessage(query.trim());
    }
  };

  // Compute smart coordinates for the mini chat bubble
  const computeMiniChatPosition = () => {
    const bubbleW = 370;
    const bubbleH = 500;
    const isRightHalf = position.x > window.innerWidth / 2;
    const isBottomHalf = position.y > window.innerHeight / 2;

    let left = isRightHalf ? position.x - bubbleW - 12 : position.x + 90;
    let top = isBottomHalf ? position.y - bubbleH + 90 : position.y;

    // Boundary clamp
    left = Math.max(12, Math.min(window.innerWidth - bubbleW - 12, left));
    top = Math.max(12, Math.min(window.innerHeight - bubbleH - 12, top));

    return { left: `${left}px`, top: `${top}px` };
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING DRAGGABLE MASCOT (LINH VẬT RẠP AURORA) */}
      {/* ========================================================================= */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'fixed',
          zIndex: 45,
          touchAction: 'none',
        }}
        className="select-none group"
      >
        {/* Floating Mascot Character Container */}
        <div
          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          className={`relative cursor-grab active:cursor-grabbing transition-transform duration-100 ${
            isDragging ? 'scale-105 cursor-grabbing' : 'hover:scale-105'
          }`}
          title="Nhấn giữ chuột để kéo di chuyển linh vật • Nhấp để mở chat nghiệp vụ"
        >
          {/* Subtle Star Glow Background */}
          <div className="absolute inset-0 bg-amber-400/25 rounded-full blur-md -z-10 animate-pulse pointer-events-none"></div>

          {/* 3D Mascot Image with floating animation */}
          <img
            src="/mascot/aurora_mascot_floating.png"
            alt="Linh vật Aurora"
            draggable={false}
            className={`w-20 h-20 sm:w-22 sm:h-22 object-contain pointer-events-none drop-shadow-[0_8px_16px_rgba(245,158,11,0.35)] ${
              isDragging ? '' : 'animate-mascot-float'
            }`}
          />

          {/* Floor Shadow beneath Mascot */}
          <div className="w-14 h-2 bg-slate-950/20 rounded-full blur-xs mx-auto -mt-1 scale-90 pointer-events-none"></div>

          {/* Online Status Pill Badge */}
          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-900 border border-emerald-400/50 rounded-full flex items-center gap-1 shadow-sm pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[9px] font-black text-[#0d1b2e]">AI</span>
          </div>

          {/* Speech Bubble Greeting / Hint */}
          {showGreeting && !isMiniChatOpen && !isFullModalOpen && !isDragging && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                right: position.x > window.innerWidth / 2 ? '0' : 'auto',
                left: position.x > window.innerWidth / 2 ? 'auto' : '0',
                marginBottom: '12px',
              }}
              className="w-64 bg-[#0d1b2e]/98 backdrop-blur-md text-slate-100 text-[11px] p-3 rounded-3xl shadow-[0_12px_35px_rgba(13,27,46,0.7)] border border-[#f4c04a]/70 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f4c04a] animate-ping"></span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#f4c04a]">
                    Linh vật Aurora ⭐
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGreeting(false);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-1.5 font-medium leading-relaxed text-slate-200">
                ✨ <strong className="text-[#f4c04a]">Chào bạn yêu điện ảnh!</strong> Tôi là <strong className="text-white">Aurora</strong> ⭐ — Luôn đồng hành thắp sáng mọi ca trực của bạn. Cần bí kíp bắp nước hay nghiệp vụ rạp, cứ chạm vào tôi nhé! 🍿🎬
              </p>

              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-700/80">
                <span className="text-[10px] text-slate-400 italic">Kéo thả tự do 🖱️</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMiniChatOpen(true);
                    setShowGreeting(false);
                  }}
                  className="px-2.5 py-1 bg-[#f4c04a] hover:bg-[#ffd166] text-[#0d1b2e] font-black rounded-xl text-[10px] transition cursor-pointer shadow-sm shadow-[#f4c04a]/30 flex items-center gap-1"
                >
                  <span>Trò Chuyện Ngay</span>
                  <ChevronRight className="w-3 h-3 text-[#0d1b2e]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MINI CHAT BUBBLE (MỤC CHAT NHỎ NHƯ BONG BÓNG CHAT) */}
      {/* ========================================================================= */}
      {isMiniChatOpen && !isFullModalOpen && (
        <div
          style={computeMiniChatPosition()}
          className="fixed z-46 w-[92vw] max-w-[380px] h-[520px] bg-[#0d1b2e]/98 backdrop-blur-xl border border-[#f4c04a]/40 rounded-3xl shadow-[0_20px_60px_-15px_rgba(13,27,46,0.8),0_0_25px_rgba(244,192,74,0.15)] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Mini Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#0d1b2e] via-[#162740] to-[#0d1b2e] border-b border-[#f4c04a]/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src="/mascot/aurora_mascot_floating.png"
                  alt="Aurora"
                  className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(244,192,74,0.5)]"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0d1b2e]"></span>
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                  <span>Aurora Copilot</span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#f4c04a] text-[#0d1b2e] uppercase">
                    Mascot AI
                  </span>
                </h4>
                <p className="text-[10px] text-[#f4c04a]/90 font-medium">Trợ Lý Nghiệp Vụ Cụm Rạp</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsMiniChatOpen(false);
                  onToggleFullModal(true);
                }}
                className="p-1.5 text-slate-400 hover:text-[#f4c04a] hover:bg-[#162740] rounded-xl transition cursor-pointer"
                title="Phóng to thành màn hình chat đầy đủ"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMiniChatOpen(false)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-[#162740] rounded-xl transition cursor-pointer"
                title="Thu gọn về linh vật"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-gradient-to-b from-[#0a1524] via-[#0d1b2e] to-[#0a1524] text-xs">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                      isUser
                        ? 'bg-[#f4c04a] text-[#0d1b2e] font-bold text-[10px]'
                        : 'bg-[#132238] border border-[#f4c04a]/50 overflow-hidden'
                    }`}
                  >
                    {isUser ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <img
                        src="/mascot/aurora_mascot_floating.png"
                        alt="Aurora"
                        className="w-5 h-5 object-contain"
                      />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-[#f4c04a] to-[#e5b238] text-[#0d1b2e] font-semibold rounded-tr-none shadow-md shadow-[#f4c04a]/20'
                        : 'bg-[#132238]/95 border border-[#f4c04a]/30 text-slate-100 rounded-tl-none shadow-md'
                    }`}
                  >
                    <AiMessageRenderer content={m.text} isUser={isUser} />

                    {/* Tools Used Badge */}
                    {!isUser && m.toolsUsed && m.toolsUsed.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-slate-700/80 flex flex-wrap gap-1">
                        {m.toolsUsed.map((tool, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-[#0a1524] border border-[#f4c04a]/30 text-[9px] font-mono text-[#f4c04a]"
                          >
                            ⚡ {tool}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Follow-up question chips */}
                    {!isUser && m.followUps && m.followUps.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-[#f4c04a]/20 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {m.followUps.map((f, fIdx) => (
                            <button
                              key={fIdx}
                              onClick={() => sendMessage(f)}
                              className="px-2.5 py-1 bg-[#0d1b2e] hover:bg-[#f4c04a]/20 text-[#f4c04a] border border-[#f4c04a]/40 hover:border-[#f4c04a] rounded-full text-[10px] font-semibold transition text-left cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-[#f4c04a] shrink-0" />
                              <span>{f}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-400">
                <div className="w-6 h-6 rounded-lg bg-[#0d1b2e] border border-[#f4c04a]/40 flex items-center justify-center shrink-0">
                  <img
                    src="/mascot/aurora_mascot_floating.png"
                    alt="Aurora"
                    className="w-4 h-4 object-contain animate-bounce"
                  />
                </div>
                <div className="bg-[#132238] border border-[#f4c04a]/30 rounded-2xl px-3 py-2 rounded-tl-none flex items-center gap-1.5 text-[11px] text-[#f4c04a]">
                  <span>Aurora đang tra cứu dữ liệu...</span>
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-[#f4c04a] rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-[#f4c04a]/70 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-[#f4c04a]/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Mini Input Bar */}
          <form onSubmit={handleMiniSubmit} className="p-2.5 bg-[#08121e] border-t border-[#f4c04a]/30 flex gap-1.5 shrink-0">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hỏi Aurora về nghiệp vụ rạp..."
              className="flex-1 bg-[#101e33] border border-[#f4c04a]/40 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#f4c04a]"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="px-3 py-2 bg-[#f4c04a] hover:bg-[#ffd166] disabled:opacity-40 text-[#0d1b2e] font-bold rounded-xl transition cursor-pointer flex items-center justify-center shadow-md shadow-[#f4c04a]/20"
            >
              <Send className="w-3.5 h-3.5 text-[#0d1b2e] font-bold" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FULL SCREEN CHAT MODAL (MÀN HÌNH CHAT ĐẦY ĐỦ KHI PHÓNG TO) */}
      {/* ========================================================================= */}
      <AiAssistantModal
        isOpen={isFullModalOpen}
        onClose={() => onToggleFullModal(false)}
        onMinimizeToMini={() => {
          onToggleFullModal(false);
          setIsMiniChatOpen(true);
        }}
        onOpenKeyModal={onOpenKeyModal}
        userRole={userRole}
        userId={userId}
        userName={userName}
        onNavigateTab={onNavigateTab}
      />
    </>
  );
};
