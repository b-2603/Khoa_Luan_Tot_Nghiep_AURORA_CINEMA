import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Bot, Send, Sparkles, User, RefreshCw, Key, 
  Volume2, VolumeX, Copy, Check, ArrowRight,
  Film, Popcorn, ShieldAlert, Activity,
  HelpCircle, ChevronRight, Zap, Database, Terminal,
  Clock, AlertTriangle, Minimize2
} from 'lucide-react';
import { 
  askCinemaAiAssistant, 
  AiAssistantResponse, 
  AiToolTraceItem,
  fetchAiToolLogs,
  fetchAiRegisteredTools
} from '../services/openai';
import { AiMessageRenderer } from './AiMessageRenderer';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimizeToMini?: () => void;
  onOpenKeyModal?: () => void;
  userRole: string;
  userId?: string | number;
  userName?: string;
  onNavigateTab?: (tab: string) => void;
}

type PersonaType = 'general' | 'concession' | 'boxoffice' | 'projection' | 'hr';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  category?: string;
  actions?: { label: string; tab: string }[];
  followUps?: string[];
  toolsUsed?: string[];
  toolCalls?: AiToolTraceItem[];
  isPendingConfirmation?: boolean;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ 
  isOpen, 
  onClose, 
  onMinimizeToMini,
  onOpenKeyModal,
  userRole,
  userId,
  userName,
  onNavigateTab
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<PersonaType>('general');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // Modal Audit Logs & Tools Inspector
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTab, setAuditTab] = useState<'logs' | 'tools'>('logs');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [registeredTools, setRegisteredTools] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialWelcomeMessage: ChatMessage = {
    id: 'msg-welcome',
    sender: 'ai',
    text: `✨ Chào bạn${userName ? ' **' + userName + '**' : ''}! Tôi là **Aurora** ⭐ — Linh vật & Trợ lý nghiệp vụ thân thiện của cụm rạp **Aurora Cinemas**!\n\n*"Cùng bạn thắp sáng đam mê và tận hưởng trọn vẹn từng khoảnh khắc điện ảnh!"* 🎬🍿\n\nHôm nay ca trực của bạn thế nào? Dù là công thức nổ bắp caramel thơm giòn chuẩn tỷ lệ vàng, quy định kiểm soát vé C18, hỗ trợ đổi/đăng ký ca hay xử lý nhanh sự cố máy chiếu phòng chiếu — tôi luôn ở đây để đồng hành cùng bạn! Bạn cần tôi hỗ trợ điều gì nào?`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    followUps: [
      '🍿 Công thức nổ bắp caramel tỷ lệ vàng?',
      '🎫 Quy định kiểm tra độ tuổi phim C18?',
      '📅 Đăng ký ca làm việc tuần tới thế nào?',
    ]
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages]);

  // Dừng đọc khi đóng modal
  useEffect(() => {
    if (!isOpen && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
    }
  }, [isOpen]);

  const loadAuditData = async () => {
    setLoadingAudit(true);
    try {
      const [logs, tools] = await Promise.all([
        fetchAiToolLogs(40),
        fetchAiRegisteredTools()
      ]);
      setAuditLogs(logs);
      setRegisteredTools(tools);
    } finally {
      setLoadingAudit(false);
    }
  };

  if (!isOpen) return null;

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response: AiAssistantResponse = await askCinemaAiAssistant(
        textToSend, 
        userRole, 
        persona, 
        conversationId, 
        userId
      );

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: response.text,
        category: response.category,
        actions: response.actions,
        followUps: response.followUps,
        toolsUsed: response.toolsUsed,
        toolCalls: response.toolCalls,
        isPendingConfirmation: response.isPendingConfirmation,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(query);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn chưa hỗ trợ giọng đọc Text-to-Speech.');
      return;
    }

    if (isSpeakingId === id) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[*#_`]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VN'));
    if (viVoice) utterance.voice = viVoice;

    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    setIsSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleResetChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeakingId(null);
    setConversationId(null);
    setMessages([initialWelcomeMessage]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#0d1b2e]/85 backdrop-blur-md">
      <div className="bg-[#0d1b2e] border border-[#f4c04a]/40 rounded-3xl w-full max-w-5xl h-[750px] flex flex-col shadow-[0_25px_80px_-15px_rgba(13,27,46,0.9),0_0_40px_rgba(244,192,74,0.18)] relative overflow-hidden text-slate-100">
        
        {/* ========================================================================= */}
        {/* CINEMA LUXURY BRAND HEADER */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0d1b2e] via-[#162740] to-[#0d1b2e] border-b border-[#f4c04a]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/mascot/aurora_mascot_floating.png"
                alt="Aurora Mascot"
                className="w-10 h-10 object-contain drop-shadow-[0_4px_12px_rgba(244,192,74,0.5)]"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1b2e] ring-2 ring-emerald-400/40"></div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                  <span>AURORA - TRỢ LÝ NGHIỆP VỤ</span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#f4c04a] text-[#0d1b2e] uppercase shadow-sm">
                    MASCOT AI ⭐
                  </span>
                  {conversationId && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#101e33] text-[#f4c04a] border border-[#f4c04a]/40">
                      Session #{conversationId}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-[11px] text-[#f4c04a]/90 font-medium">
                Linh Vật & Trợ Lý Thông Minh Hỗ Trợ Nghiệp Vụ Cụm Rạp Aurora Cinemas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userRole === 'manager' && (
              <button
                onClick={() => {
                  setShowAuditModal(true);
                  loadAuditData();
                }}
                className="px-2.5 py-1.5 bg-[#162740] hover:bg-[#1f375b] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Xem nhật ký 16 AI Tools và Audit Logs"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Giám Sát Tools</span>
              </button>
            )}

            {onOpenKeyModal && (
              <button
                onClick={onOpenKeyModal}
                className="px-2.5 py-1.5 bg-[#162740] hover:bg-[#1f375b] text-[#f4c04a] border border-[#f4c04a]/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cấu hình OpenAI GPT-4o API Key (Tùy chọn)"
              >
                <Key className="w-3.5 h-3.5 text-[#f4c04a]" />
                <span className="hidden sm:inline">API Key</span>
              </button>
            )}

            <button
              onClick={handleResetChat}
              className="p-2 bg-[#162740] hover:bg-[#1f375b] text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Khởi động lại cuộc trò chuyện (Reset memory)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {onMinimizeToMini && (
              <button 
                onClick={onMinimizeToMini} 
                className="p-2 bg-[#162740] hover:bg-[#1f375b] text-slate-300 hover:text-[#f4c04a] rounded-xl transition cursor-pointer"
                title="Thu nhỏ thành bong bóng chat linh vật"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={onClose} 
              className="p-2 bg-[#162740] hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CHAT MESSAGES CONTAINER */}
        {/* ========================================================================= */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-[#0a1524] via-[#0d1b2e] to-[#0a1524]">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            const isSpeaking = isSpeakingId === m.id;

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  isUser
                    ? 'bg-[#f4c04a] text-[#0d1b2e] font-bold'
                    : 'bg-[#132238] border border-[#f4c04a]/50 overflow-hidden'
                }`}>
                  {isUser ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <img
                      src="/mascot/aurora_mascot_floating.png"
                      alt="Aurora"
                      className="w-6 h-6 object-contain"
                    />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[88%] sm:max-w-[82%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg relative ${
                    isUser
                      ? 'bg-gradient-to-r from-[#f4c04a] to-[#e5b238] text-[#0d1b2e] font-semibold rounded-tr-none shadow-[#f4c04a]/20'
                      : 'bg-[#132238]/95 border border-[#f4c04a]/30 text-slate-100 rounded-tl-none backdrop-blur-xs'
                  }`}>
                    {/* Render content */}
                    <AiMessageRenderer content={m.text} isUser={isUser} />

                    {/* Interactive Danger Confirmation Gate */}
                    {m.isPendingConfirmation && (
                      <div className="mt-3.5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
                        <div className="text-xs text-amber-200 flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                          <span><strong>XÁC NHẬN THAO TÁC:</strong> Bạn có chắc chắn muốn hủy đặt vé này?</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => sendMessage('Xác nhận')}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Xác Nhận Hủy</span>
                          </button>
                          <button
                            onClick={() => sendMessage('Không hủy')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Giữ Vé</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tool Execution Badges */}
                    {!isUser && m.toolsUsed && m.toolsUsed.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-[#f4c04a] font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#f4c04a]" />
                          <span>Tools đã chạy:</span>
                        </span>
                        {m.toolCalls && m.toolCalls.length > 0 ? (
                          m.toolCalls.map((tc, tcIdx) => (
                            <span
                              key={tcIdx}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono flex items-center gap-1 ${
                                tc.status === 'success'
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40'
                                  : tc.status === 'denied'
                                  ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                                  : 'bg-amber-950/70 text-[#f4c04a] border border-[#f4c04a]/40'
                              }`}
                              title={`Thời gian chạy: ${tc.execution_time_ms}ms`}
                            >
                              <span>{tc.tool}</span>
                              <span className="text-slate-400 font-sans text-[9px]">({tc.execution_time_ms}ms)</span>
                            </span>
                          ))
                        ) : (
                          m.toolsUsed.map((tName, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-[#0d1b2e] text-[#f4c04a] border border-[#f4c04a]/40">
                              {tName}
                            </span>
                          ))
                        )}
                      </div>
                    )}

                    {/* Footer Controls for AI Message */}
                    {!isUser && (
                      <div className="mt-3 pt-2 border-t border-slate-700/80 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>{m.time}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[#f4c04a] flex items-center gap-1 font-mono">
                            <Sparkles className="w-3 h-3" /> Chuẩn Quy Trình Rạp
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSpeak(m.id, m.text)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSpeaking 
                                ? 'bg-[#f4c04a]/20 text-[#f4c04a] animate-pulse' 
                                : 'hover:bg-[#162740] text-slate-400 hover:text-white'
                            }`}
                            title={isSpeaking ? 'Dừng đọc' : 'Nghe giọng đọc tiếng Việt'}
                          >
                            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-[#f4c04a]" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleCopy(m.id, m.text)}
                            className="p-1.5 hover:bg-[#162740] text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                            title="Sao chép nội dung"
                          >
                            {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Follow-up Question Chips - Minimalist & Elegant */}
                  {!isUser && m.followUps && m.followUps.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {m.followUps.map((f, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => sendMessage(f)}
                          className="px-3.5 py-1.5 bg-[#0d1b2e] hover:bg-[#f4c04a]/20 text-[#f4c04a] border border-[#f4c04a]/40 hover:border-[#f4c04a] rounded-full text-xs font-semibold transition text-left cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Sparkles className="w-3 h-3 text-[#f4c04a] shrink-0" />
                          <span>{f}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-3 items-center text-xs text-slate-400">
              <div className="w-8 h-8 rounded-xl bg-[#0d1b2e] border border-[#f4c04a]/40 flex items-center justify-center shrink-0">
                <img
                  src="/mascot/aurora_mascot_floating.png"
                  alt="Aurora"
                  className="w-5 h-5 object-contain animate-bounce"
                />
              </div>
              <div className="bg-[#132238] border border-[#f4c04a]/30 rounded-2xl px-4 py-3 rounded-tl-none flex items-center gap-2 text-[#f4c04a]">
                <span className="font-semibold">Aurora Cinema AI đang phân tích dữ liệu & gọi Tools...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#f4c04a] rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[#f4c04a]/70 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#f4c04a]/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* CHAT INPUT BAR (Clean & Floating with Brand Tone) */}
        {/* ========================================================================= */}
        <form onSubmit={handleSend} className="p-4 bg-[#08121e] border-t border-[#f4c04a]/30 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập câu hỏi nghiệp vụ rạp cho Aurora (vd: tỷ lệ nổ bắp, hủy vé, sự cố máy chiếu...)"
              className="w-full bg-[#101e33] border border-[#f4c04a]/40 hover:border-[#f4c04a] focus:border-[#f4c04a] rounded-2xl pl-5 pr-14 py-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#f4c04a] transition shadow-inner"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="absolute right-2 p-2.5 bg-[#f4c04a] hover:bg-[#ffd166] disabled:opacity-30 disabled:cursor-not-allowed text-[#0d1b2e] rounded-xl transition flex items-center justify-center cursor-pointer shadow-md shadow-[#f4c04a]/30"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4 text-[#0d1b2e] font-bold" />
            </button>
          </div>
        </form>

        {/* ========================================================================= */}
        {/* AUDIT LOGS & 16-TOOL INSPECTOR DRAWER / OVERLAY */}
        {/* ========================================================================= */}
        {showAuditModal && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col p-4 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h4 className="font-black text-sm text-white">NHẬT KÝ HỆ THỐNG & CÔNG CỤ VẬN HÀNH</h4>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                  <button
                    onClick={() => setAuditTab('logs')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      auditTab === 'logs' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Nhật Ký Thực Thi (Logs)
                  </button>
                  <button
                    onClick={() => setAuditTab('tools')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      auditTab === 'tools' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Danh Mục 16 Tools ({registeredTools.length || 16})
                  </button>
                </div>
                <button
                  onClick={loadAuditData}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                  title="Tải lại dữ liệu"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {loadingAudit ? (
                <div className="text-center py-12 text-slate-400 text-xs">Đang tải nhật ký kiểm toán AI từ MySQL...</div>
              ) : auditTab === 'logs' ? (
                auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">Chưa có bản ghi thực thi tool nào.</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                            log.status === 'success' 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' 
                              : log.status === 'denied'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="font-mono text-cyan-300 font-bold">{log.tool_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({log.execution_time_ms}ms)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{log.created_at}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 overflow-x-auto">
                          <div className="text-[9px] text-slate-400 uppercase font-sans mb-1">Tham số đầu vào:</div>
                          <pre className="text-amber-300">{JSON.stringify(log.arguments, null, 2)}</pre>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 overflow-x-auto">
                          <div className="text-[9px] text-slate-400 uppercase font-sans mb-1">Kết quả trả về:</div>
                          <pre className="text-emerald-300">{JSON.stringify(log.result, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {registeredTools.map((t, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-mono text-cyan-300 font-bold text-sm">{t.name}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{t.description}</p>
                      {t.schema?.parameters?.properties && (
                        <div className="pt-1.5">
                          <span className="text-[9px] text-slate-400 uppercase">Tham số: </span>
                          <span className="font-mono text-[10px] text-amber-300">
                            {Object.keys(t.schema.parameters.properties).join(', ') || 'Không cần'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
