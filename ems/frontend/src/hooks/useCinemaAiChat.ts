import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  askCinemaAiAssistant, 
  AiAssistantResponse, 
  AiToolTraceItem 
} from '../services/openai';

export type PersonaType = 'general' | 'concession' | 'boxoffice' | 'projection' | 'hr';

export interface ChatMessage {
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

export interface UseCinemaAiChatProps {
  userRole: string;
  userId?: string | number;
  userName?: string;
}

export function useCinemaAiChat({ userRole, userId, userName }: UseCinemaAiChatProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState<PersonaType>('general');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const initialWelcomeMessage: ChatMessage = {
    id: 'msg-welcome',
    sender: 'ai',
    text: `✨ Chào bạn${userName ? ' **' + userName + '**' : ''}! Tôi là **Aurora** ⭐ — Linh vật & Trợ lý nghiệp vụ cụm rạp **Aurora Cinemas**!\n\n*"Cùng bạn thắp sáng đam mê và tận hưởng trọn vẹn từng khoảnh khắc điện ảnh!"* 🎬🍿\n\nHôm nay ca trực của bạn thế nào? Dù là công thức nổ bắp caramel thơm giòn chuẩn tỷ lệ vàng, quy định kiểm soát vé C18, hỗ trợ đổi/đăng ký ca hay xử lý nhanh sự cố máy chiếu phòng chiếu — tôi luôn ở đây để đồng hành cùng bạn! Bạn cần tôi hỗ trợ điều gì nào?`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    followUps: [
      '🍿 Công thức nổ bắp caramel tỷ lệ vàng?',
      '🎫 Quy định kiểm tra độ tuổi phim C18?',
      '📅 Đăng ký ca làm việc tuần tới thế nào?',
    ]
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMessage]);

  const sendMessage = useCallback(async (textToSend: string) => {
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
      console.error('Cinema AI Error:', err);
    } finally {
      setLoading(false);
    }
  }, [loading, userRole, persona, conversationId, userId]);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSpeak = useCallback((id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt chưa hỗ trợ giọng đọc Text-to-Speech.');
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
  }, [isSpeakingId]);

  const handleResetChat = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeakingId(null);
    setConversationId(null);
    setMessages([initialWelcomeMessage]);
  }, [initialWelcomeMessage]);

  return {
    query,
    setQuery,
    loading,
    persona,
    setPersona,
    messages,
    sendMessage,
    copiedId,
    handleCopy,
    isSpeakingId,
    handleSpeak,
    conversationId,
    handleResetChat
  };
}
