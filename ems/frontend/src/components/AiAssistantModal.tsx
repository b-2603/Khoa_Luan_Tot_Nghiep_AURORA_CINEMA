import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Bot, Send, Sparkles, User, RefreshCw, Key, 
  Volume2, VolumeX, Copy, Check, ArrowRight,
  Film, Popcorn, ShieldAlert, Activity,
  HelpCircle, ChevronRight, Zap, Database, Terminal,
  Clock, AlertTriangle
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
    text: `Chào bạn${userName ? ' ' + userName : ''}! Tôi là **Cinema AI** — Trợ lý ảo hỗ trợ vận hành và nghiệp vụ tại cụm rạp **Aurora Cinemas**.

Tôi có thể đồng hành và giải đáp cho bạn các nội dung:
• 🍿 **Nghiệp vụ quầy & phòng chiếu:** Công thức bắp nước F&B, quy trình bán vé Box Office, hỗ trợ kỹ thuật máy chiếu và an toàn PCCC.
• 📚 **Đào tạo & Sát hạch:** Tra cứu quy trình SOP, hướng dẫn hoàn thành các khóa học nghiệp vụ và bài kiểm tra cấp chứng chỉ.
• 📅 **Ca làm & Chấm công:** Hướng dẫn quy định đăng ký ca làm, quy trình giải trình chấm công và các thủ tục nội bộ rạp.
• 🎬 **Thông tin rạp & Phim ảnh:** Hỗ trợ tra cứu lịch chiếu, phòng chiếu, tình trạng ghế và giải đáp thắc mắc dịch vụ.

*Bạn có thể bấm chọn các phím tắt bên dưới hoặc gõ trực tiếp câu hỏi để bắt đầu nhé!*`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: userRole === 'manager' ? [
      { label: '📊 Tổng Quan Quản Trị', tab: 'dashboard' },
      { label: '🗓️ Xếp Lịch Phân Ca AI', tab: 'manager-scheduler' },
      { label: '⏰ Quản Lý Chấm Công', tab: 'attendance' },
      { label: '✨ Tạo Khóa Học / Quiz AI', tab: 'manager-quiz-creator' },
    ] : [
      { label: '📚 Khóa Học Nghiệp Vụ', tab: 'courses' },
      { label: '🎯 Làm Bài Kiểm Tra', tab: 'quizzes' },
      { label: '🗓️ Đăng Ký Ca Làm Việc', tab: 'shift-register' },
      { label: '🏆 Chứng Chỉ Của Tôi', tab: 'certificates' },
    ],
    followUps: [
      'Công thức nổ bắp caramel chuẩn tỷ lệ vàng là gì?',
      'Quy định kiểm tra độ tuổi đối với phim C18 thế nào?',
      'Làm thế nào để đăng ký ca làm việc cho tuần tới?',
      'Quy trình xử lý khi máy chiếu bị mất hình trong phòng chiếu?'
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

  // Quick prompt presets
  const quickPrompts = [
    { icon: '🎬', label: 'Suất chiếu Avatar', query: 'Tìm các suất chiếu phim Avatar hôm nay' },
    { icon: '💺', label: 'Ghế trống 19:30', query: 'Suất 19:30 phòng P01 còn bao nhiêu ghế trống?' },
    { icon: '📊', label: 'Báo cáo doanh thu', query: 'Tạo báo cáo doanh thu và tỷ lệ lấp đầy hôm nay' },
    { icon: '⚠️', label: 'Sự cố P03 (EMS)', query: 'Kiểm tra trạng thái thiết bị và sự cố phòng P03' },
    { icon: '💳', label: 'Lỗi máy POS 125', query: 'Tra cứu lỗi giao dịch máy POS125 và hướng khắc phục' },
    { icon: '🍿', label: 'Công thức nổ bắp', query: 'Công thức nổ bắp tỷ lệ vàng và nhiệt độ chuẩn của máy popper là bao nhiêu?' },
    { icon: '🌐', label: 'Christopher Nolan', query: 'Christopher Nolan là ai và có những phim nào nổi tiếng?' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-5xl h-[750px] flex flex-col shadow-2xl relative overflow-hidden text-slate-100">
        
        {/* ========================================================================= */}
        {/* VIP PRO HEADER */}
        {/* ========================================================================= */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 ring-2 ring-emerald-400/40"></div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>CINEMA AI COPILOT</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 uppercase shadow-xs">
                    4.0 VIP
                  </span>
                  {conversationId && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30">
                      Session #{conversationId}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Trợ Lý Thông Minh Hỗ Trợ Nghiệp Vụ & Vận Hành Cụm Rạp Aurora Cinemas
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
                className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-indigo-900/60 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Xem nhật ký 16 AI Tools và Audit Logs"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Giám Sát Tools</span>
              </button>
            )}

            {onOpenKeyModal && (
              <button
                onClick={onOpenKeyModal}
                className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Cấu hình OpenAI GPT-4o API Key (Tùy chọn)"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">API Key</span>
              </button>
            )}

            <button
              onClick={handleResetChat}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Khởi động lại cuộc trò chuyện (Reset memory)"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button 
              onClick={onClose} 
              className="p-2 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EXPERT PERSONA SELECTOR TABS */}
        {/* ========================================================================= */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1 pr-2">
            Chuyên mục:
          </span>

          {[
            { id: 'general', label: 'Tổng Hợp Nghiệp Vụ', icon: Zap },
            { id: 'boxoffice', label: 'Phim & Quầy Vé', icon: Film },
            { id: 'projection', label: 'Thiết Bị EMS / TMS', icon: Sparkles },
            { id: 'concession', label: 'Bắp Nước F&B', icon: Popcorn },
            { id: 'hr', label: 'Quản Trị & Nhân Sự', icon: Database },
          ].map(tab => {
            const Icon = tab.icon;
            const active = persona === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setPersona(tab.id as PersonaType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold scale-[1.02]'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* CHAT MESSAGES CONTAINER */}
        {/* ========================================================================= */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-bold'
                    : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[88%] sm:max-w-[82%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg relative ${
                    isUser
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800/90 border border-slate-700 text-slate-200 rounded-tl-none backdrop-blur-xs'
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
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
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
                                  : 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                              }`}
                              title={`Thời gian chạy: ${tc.execution_time_ms}ms`}
                            >
                              <span>{tc.tool}</span>
                              <span className="text-slate-400 font-sans text-[9px]">({tc.execution_time_ms}ms)</span>
                            </span>
                          ))
                        ) : (
                          m.toolsUsed.map((tName, tIdx) => (
                            <span key={tIdx} className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/40">
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
                          <span className="text-emerald-400 flex items-center gap-1 font-mono">
                            <Sparkles className="w-3 h-3" /> Cinema AI Verified
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSpeak(m.id, m.text)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isSpeaking 
                                ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
                                : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                            }`}
                            title={isSpeaking ? 'Dừng đọc' : 'Nghe giọng đọc tiếng Việt'}
                          >
                            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleCopy(m.id, m.text)}
                            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                            title="Sao chép nội dung"
                          >
                            {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deep Action Navigation Buttons */}
                  {!isUser && m.actions && m.actions.length > 0 && onNavigateTab && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => onNavigateTab(act.tab)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/20 to-amber-500/20 hover:from-amber-500 hover:to-amber-600 hover:text-slate-950 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Question Chips */}
                  {!isUser && m.followUps && m.followUps.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                        <HelpCircle className="w-3 h-3 text-purple-400" />
                        <span>Câu hỏi gợi ý tiếp theo:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.followUps.map((f, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => sendMessage(f)}
                            className="px-2.5 py-1 bg-slate-800/80 hover:bg-purple-950/60 hover:border-purple-500/60 text-slate-300 hover:text-purple-200 border border-slate-700 rounded-lg text-[11px] transition text-left cursor-pointer flex items-center gap-1"
                          >
                            <ChevronRight className="w-2.5 h-2.5 text-purple-400 shrink-0" />
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
            <div className="flex gap-3 items-center text-xs text-slate-400">
              <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-purple-300 animate-spin" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl px-4 py-3 rounded-tl-none flex items-center gap-2">
                <span className="text-purple-300 font-semibold">Aurora Cinema AI đang phân tích dữ liệu & gọi Tools...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ========================================================================= */}
        {/* QUICK SITUATIONS BAR */}
        {/* ========================================================================= */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[10px] font-bold text-amber-500/90 uppercase tracking-wider whitespace-nowrap pl-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Thao Tác Nhanh:</span>
          </span>

          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(p.query)}
              className="px-2.5 py-1 bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[11px] font-medium transition whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* CHAT INPUT BAR */}
        {/* ========================================================================= */}
        <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hỏi bất kỳ điều gì: Suất chiếu Avatar, ghế trống, doanh thu hôm nay, sự cố P03, quy trình hủy vé..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Gửi Hỏi</span>
          </button>
        </form>

        {/* ========================================================================= */}
        {/* AUDIT LOGS & 16-TOOL INSPECTOR DRAWER / OVERLAY */}
        {/* ========================================================================= */}
        {showAuditModal && (
          <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col p-4 backdrop-blur-md animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h4 className="font-black text-sm text-white">TRÌNH GIÁM SÁT CINEMA AI (AUDIT LOGS & 16 TOOLS)</h4>
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
