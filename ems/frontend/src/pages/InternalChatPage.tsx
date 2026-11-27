import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  getUsers,
  getChatMessages,
  sendChatMessage,
  recallChatMessage,
  toggleChatReaction,
  toggleChatPin,
  markChatThreadRead,
  InternalChatMessage,
  ChatAttachment,
  ChatReplyRef,
  ChatSticker,
} from '../services/storage';
import {
  saveChatMediaBlob,
  getChatMediaUrl,
  formatFileSize,
  formatAudioDuration,
  encodePcmToWavBlob,
} from '../services/chatMediaStore';
import { fetchEmployees } from '../services/apiClient';
import {
  MessageSquare,
  Send,
  Users,
  ShieldCheck,
  CheckCheck,
  Search,
  Tag,
  Image as ImageIcon,
  Film,
  Paperclip,
  Mic,
  Square,
  X,
  Download,
  FileText,
  Music,
  Upload,
  AlertCircle,
  Play,
  Pause,
  Undo2,
  Reply,
  Smile,
  Pin,
  Sticker,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface InternalChatPageProps {
  currentUser: User;
}

interface PendingAttachment {
  id: string;
  file: File;
  kind: ChatAttachment['kind'];
  previewUrl: string;
  durationSec?: number;
  isVoiceNote?: boolean;
}

const QUICK_TOPICS = [
  'Hỏi lịch ca trực',
  'Xin hỗ trợ đổi ca',
  'Vấn đề chấm công',
  'Báo sự cố thiết bị/quầy',
];

const REACTION_EMOJIS = ['❤️', '😂', '😮', '👍', '😢', '🔥'];

const QUICK_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😅', '🙏', '👍',
  '👏', '🔥', '❤️', '💯', '🎉', '✨', '🍿', '🎬', '🎟️', '🥤',
  '👌', '🤝', '💪', '⚡', '😢', '😮', '🤔', '😴', '🏃', '✅',
];

const AURORA_STICKERS: ChatSticker[] = [
  { id: 'stk-ok', emoji: '👍', label: 'OK chốt đơn!', bg: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  { id: 'stk-popcorn', emoji: '🍿', label: 'Bắp nước sẵn sàng', bg: 'bg-amber-50 border-amber-200 text-amber-900' },
  { id: 'stk-cinema', emoji: '🎬', label: 'Vào ca thôi!', bg: 'bg-slate-900 border-slate-700 text-amber-300' },
  { id: 'stk-thanks', emoji: '🙏', label: 'Cảm ơn nhiều!', bg: 'bg-sky-50 border-sky-200 text-sky-900' },
  { id: 'stk-fire', emoji: '🔥', label: 'Cháy hết mình!', bg: 'bg-orange-50 border-orange-200 text-orange-900' },
  { id: 'stk-haha', emoji: '😂', label: 'Haha đỉnh quá', bg: 'bg-yellow-50 border-yellow-200 text-yellow-900' },
  { id: 'stk-love', emoji: '❤️', label: 'Yêu cả rạp!', bg: 'bg-rose-50 border-rose-200 text-rose-900' },
  { id: 'stk-run', emoji: '🏃', label: 'Đang tới liền!', bg: 'bg-indigo-50 border-indigo-200 text-indigo-900' },
  { id: 'stk-sorry', emoji: '😅', label: 'Xin lỗi nha!', bg: 'bg-amber-50 border-amber-200 text-amber-900' },
  { id: 'stk-star', emoji: '⭐', label: 'Chuẩn 5 sao!', bg: 'bg-purple-50 border-purple-200 text-purple-900' },
  { id: 'stk-morning', emoji: '☀️', label: 'Chào ca sáng!', bg: 'bg-yellow-50 border-yellow-200 text-amber-900' },
  { id: 'stk-sleep', emoji: '😴', label: 'Tan ca nghỉ thôi', bg: 'bg-slate-100 border-slate-300 text-slate-800' },
];

const MAX_FILE_SIZE_MB = 50;
const INLINE_DATA_URL_LIMIT = 180 * 1024; // 180KB

const cleanId = (id?: string) => String(id || '').replace('usr-', '').trim();

const detectKind = (file: File): ChatAttachment['kind'] => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const getMessagePreviewText = (msg: InternalChatMessage | null, isManager: boolean): string => {
  if (!msg) return '';
  const prefix = isManager && msg.senderRole === 'manager' ? 'Bạn: ' : '';
  if (msg.recalled) return `${prefix}Tin nhắn đã được thu hồi`;
  if (msg.sticker) return `${prefix}${msg.sticker.emoji} [Sticker: ${msg.sticker.label}]`;
  if (msg.content.trim()) return `${prefix}${msg.content}`;
  const first = msg.attachments?.[0];
  if (!first) return '';
  const more = (msg.attachments?.length || 0) > 1 ? ` (+${(msg.attachments?.length || 1) - 1})` : '';
  if (first.kind === 'image') return `${prefix}📷 Hình ảnh${more}`;
  if (first.kind === 'video') return `${prefix}🎥 Video${more}`;
  if (first.kind === 'audio') {
    return `${prefix}${first.isVoiceNote ? '🎤 Tin nhắn thoại' : '🎵 Âm thanh'}${
      first.durationSec ? ` (${formatAudioDuration(first.durationSec)})` : ''
    }${more}`;
  }
  return `${prefix}📎 ${first.name}${more}`;
};

// ─── Custom Audio / Voice Player (Reliable playback + seek bar) ───
const AudioPlayerView: React.FC<{
  url: string;
  att: ChatAttachment;
  isMine: boolean;
}> = ({ url, att, isMine }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(att.durationSec || 0);
  const [playErr, setPlayErr] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 1;
    audio.muted = false;

    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => {
      setPlayErr(null);
      setIsPlaying(true);
    };
    const onError = () => {
      setIsPlaying(false);
      setPlayErr('Không phát được tệp âm thanh này');
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('error', onError);
    };
  }, [url]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      try {
        audio.volume = 1;
        audio.muted = false;
        await audio.play();
      } catch {
        setPlayErr('Trình duyệt chặn phát âm thanh, bấm lại để nghe');
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audio && isFinite(val)) {
      audio.currentTime = val;
    }
  };

  const maxDur = duration > 0 ? duration : 1;

  return (
    <div
      className={`rounded-xl p-2.5 border space-y-2 min-w-[240px] max-w-[310px] ${
        isMine
          ? 'bg-white/12 border-white/20 text-white'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <audio ref={audioRef} src={url} preload="auto" className="hidden" />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition cursor-pointer ${
            isMine
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              : 'bg-slate-900 hover:bg-slate-800 text-amber-400'
          }`}
          title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 truncate">
              {att.isVoiceNote ? (
                <Mic className="w-3 h-3 shrink-0 text-amber-400" />
              ) : (
                <Music className="w-3 h-3 shrink-0 text-amber-400" />
              )}
              <span className="truncate">{att.isVoiceNote ? 'Tin nhắn thoại' : att.name}</span>
            </span>
            <span className="font-mono opacity-80 shrink-0">
              {formatAudioDuration(isPlaying || currentTime > 0 ? currentTime : duration)}
              {duration > 0 ? ` / ${formatAudioDuration(duration)}` : ''}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={maxDur}
            step={0.1}
            value={Math.min(currentTime, maxDur)}
            onChange={handleSeek}
            className="w-full h-1.5 accent-amber-400 cursor-pointer"
          />
        </div>

        <a
          href={url}
          download={att.name}
          className={`p-1.5 rounded-lg transition shrink-0 ${
            isMine ? 'text-white/70 hover:text-amber-300 hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70'
          }`}
          title="Tải tệp âm thanh"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>

      {playErr && <div className="text-[10px] text-rose-400">{playErr}</div>}
    </div>
  );
};

// ─── Attachment Renderer inside a message bubble ──────────────────
const AttachmentView: React.FC<{
  att: ChatAttachment;
  isMine: boolean;
  onZoomImage: (url: string, name: string) => void;
}> = ({ att, isMine, onZoomImage }) => {
  const [url, setUrl] = useState<string | null>(att.dataUrl || null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (att.dataUrl) {
      setUrl(att.dataUrl);
      return;
    }
    let active = true;
    getChatMediaUrl(att.mediaId).then(resolved => {
      if (!active) return;
      if (resolved) setUrl(resolved);
      else setMissing(true);
    });
    return () => {
      active = false;
    };
  }, [att.mediaId, att.dataUrl]);

  if (missing || !url) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
          isMine
            ? 'bg-white/10 border-white/20 text-white/80'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <Paperclip className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{missing ? `Không tải được: ${att.name}` : `Đang tải ${att.name}...`}</span>
      </div>
    );
  }

  if (att.kind === 'image') {
    return (
      <button
        type="button"
        onClick={() => onZoomImage(url, att.name)}
        className="block rounded-xl overflow-hidden border border-black/10 group relative max-w-[280px] cursor-pointer"
        title="Bấm để xem ảnh lớn"
      >
        <img
          src={url}
          alt={att.name}
          className="max-h-60 w-auto object-cover group-hover:scale-[1.02] transition"
        />
      </button>
    );
  }

  if (att.kind === 'video') {
    return (
      <div className="rounded-xl overflow-hidden border border-black/15 bg-black max-w-[320px]">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-60 bg-black"
        />
        <div
          className={`px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] ${
            isMine ? 'bg-slate-900/60 text-white/90' : 'bg-slate-900 text-slate-200'
          }`}
        >
          <span className="truncate">{att.name}</span>
          <a
            href={url}
            download={att.name}
            className="shrink-0 hover:text-amber-400 transition"
            title="Tải video"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  if (att.kind === 'audio') {
    return <AudioPlayerView url={url} att={att} isMine={isMine} />;
  }

  // Generic File / Document
  return (
    <a
      href={url}
      download={att.name}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition min-w-[220px] max-w-[300px] ${
        isMine
          ? 'bg-white/15 hover:bg-white/20 border-white/25 text-white'
          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isMine ? 'bg-white/20 text-amber-300' : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
      >
        <FileText className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold truncate">{att.name}</div>
        <div className={`text-[11px] mt-0.5 ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
          {formatFileSize(att.size)} • Tải xuống
        </div>
      </div>
      <Download className="w-4 h-4 shrink-0 opacity-75" />
    </a>
  );
};

// ─── Main InternalChatPage ────────────────────────────────────────
export const InternalChatPage: React.FC<InternalChatPageProps> = ({ currentUser }) => {
  const isManager = currentUser.role === 'manager';
  const [allUsers, setAllUsers] = useState<User[]>(getUsers());
  const [messages, setMessages] = useState<InternalChatMessage[]>(getChatMessages());
  const [selectedThread, setSelectedThread] = useState<string>(() =>
    isManager ? 'usr-6' : currentUser.id
  );
  const [inputText, setInputText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pending attachments before send
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Image Lightbox, Reply, Reaction, Pin & Sticker/Emoji Picker state
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatReplyRef | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [openReactionMsgId, setOpenReactionMsgId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'sticker' | 'emoji'>('sticker');
  const [showAllPinned, setShowAllPinned] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Voice Recording state (MediaRecorder + AnalyserNode VU meter + WAV conversion)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [micHasSignal, setMicHasSignal] = useState(false);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [activeMicLabel, setActiveMicLabel] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vuRafRef = useRef<number | null>(null);
  const vuStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingSecondsRef = useRef<number>(0);

  // Hidden file inputs
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  useEffect(() => {
    fetchEmployees()
      .then(list => {
        if (list && list.length > 0) setAllUsers(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isManager) {
      setSelectedThread(currentUser.id);
    } else if (selectedThread !== 'group-all') {
      const staffs = allUsers.filter(u => u.role === 'staff');
      if (staffs.length > 0 && !staffs.some(s => cleanId(s.id) === cleanId(selectedThread))) {
        setSelectedThread(staffs[0].id);
      }
    }
  }, [currentUser.id, isManager, allUsers.length]);

  useEffect(() => {
    const updated = markChatThreadRead(selectedThread, currentUser.role);
    setMessages(updated);
    setReplyingTo(null);
  }, [selectedThread, currentUser.role]);

  useEffect(() => {
    const syncMessages = () => {
      const latest = markChatThreadRead(selectedThread, currentUser.role);
      setMessages(prev => {
        if (
          prev.length === latest.length &&
          prev[prev.length - 1]?.id === latest[latest.length - 1]?.id &&
          prev.every(
            (m, i) =>
              m.readByManager === latest[i]?.readByManager &&
              m.readByStaff === latest[i]?.readByStaff &&
              Boolean(m.recalled) === Boolean(latest[i]?.recalled) &&
              Boolean(m.pinned) === Boolean(latest[i]?.pinned) &&
              JSON.stringify(m.reactions || []) === JSON.stringify(latest[i]?.reactions || [])
          )
        ) {
          return prev;
        }
        return latest;
      });
    };
    const interval = setInterval(syncMessages, 1500);
    window.addEventListener('storage', syncMessages);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncMessages);
    };
  }, [selectedThread, currentUser.role]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedThread]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
      if (vuRafRef.current) cancelAnimationFrame(vuRafRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      audioCtxRef.current?.close().catch(() => {});
      recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Add files to staging bar
  const stageFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    const next: PendingAttachment[] = [];

    for (const file of arr) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showError(`Tệp "${file.name}" vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`);
        continue;
      }
      const kind = detectKind(file);
      next.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        kind,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (next.length > 0) {
      setPendingAttachments(prev => [...prev, ...next]);
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments(prev => {
      const target = prev.find(p => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  // Paste image directly from clipboard (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      stageFiles(files);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      stageFiles(e.dataTransfer.files);
    }
  };

  // Voice recording controls (MediaRecorder + AnalyserNode VU + auto WAV conversion)
  const cleanupRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (vuRafRef.current) {
      cancelAnimationFrame(vuRafRef.current);
      vuRafRef.current = null;
    }
    analyserRef.current = null;
    try {
      audioCtxRef.current?.close().catch(() => {});
    } catch {}
    audioCtxRef.current = null;
    mediaRecorderRef.current = null;
    vuStreamRef.current?.getTracks().forEach(t => t.stop());
    vuStreamRef.current = null;
    recordingStreamRef.current?.getTracks().forEach(t => t.stop());
    recordingStreamRef.current = null;
    setIsRecording(false);
    setRecordingSec(0);
    setMicLevel(0);
    setMicHasSignal(false);
  };

  const startVoiceRecording = async (overrideMicId?: string) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Trình duyệt không hỗ trợ ghi âm micro.');
      return;
    }

    // Dừng phiên cũ nếu đang đổi micro
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupRecording();

    const targetDeviceId = overrideMicId !== undefined ? overrideMicId : selectedMicId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: targetDeviceId ? { deviceId: { exact: targetDeviceId } } : true,
      });
      recordingStreamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        setActiveMicLabel(
          `${audioTrack.label || 'Micro mặc định'}${audioTrack.muted ? ' (Đang bị tắt tiếng trên Windows!)' : ''}`
        );
        if (audioTrack.muted) {
          showError(`Micro "${audioTrack.label}" đang bị tắt tiếng (Muted) trong Windows Sound Settings.`);
        }
      }

      // Nạp danh sách tất cả micro trên máy để người dùng đổi nhanh nếu sai nguồn thu
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d => d.kind === 'audioinput');
        setAvailableMics(mics);
        if (!targetDeviceId && audioTrack?.getSettings?.().deviceId) {
          setSelectedMicId(audioTrack.getSettings().deviceId || '');
        }
      } catch {}

      // 1. Live VU meter dùng stream.clone() để không xung đột luồng với MediaRecorder
      try {
        const clonedForVu = stream.clone();
        vuStreamRef.current = clonedForVu;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        const src = ctx.createMediaStreamSource(clonedForVu);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const dataArr = new Uint8Array(analyser.fftSize);
        const tickVu = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteTimeDomainData(dataArr);
          let peak = 0;
          for (let i = 0; i < dataArr.length; i++) {
            const dev = Math.abs(dataArr[i] - 128) / 128;
            if (dev > peak) peak = dev;
          }
          const level = Math.min(100, Math.round(peak * 320));
          setMicLevel(level);
          if (peak > 0.01) setMicHasSignal(true);
          vuRafRef.current = requestAnimationFrame(tickVu);
        };
        vuRafRef.current = requestAnimationFrame(tickVu);
      } catch {}

      // 2. Ghi âm trực tiếp bằng MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recordingSecondsRef.current = 0;
      setRecordingSec(0);
      setMicHasSignal(false);

      recorder.ondataavailable = ev => {
        if (ev.data && ev.data.size > 0) {
          recordingChunksRef.current.push(ev.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSec(recordingSecondsRef.current);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      showError(
        msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed')
          ? 'Trình duyệt đang chặn quyền Micro. Hãy bấm biểu tượng ổ khóa trên thanh địa chỉ → Cho phép Micro.'
          : 'Không thể mở Micro. Hãy kiểm tra Windows Settings → Privacy → Microphone.'
      );
    }
  };

  const handleSwitchMic = (newMicId: string) => {
    setSelectedMicId(newMicId);
    if (isRecording) {
      startVoiceRecording(newMicId);
    }
  };

  const cancelVoiceRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null;
      rec.stop();
    }
    recordingChunksRef.current = [];
    cleanupRecording();
  };

  const stopAndSendVoiceRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === 'inactive') {
      cleanupRecording();
      return;
    }
    const duration = Math.max(1, recordingSecondsRef.current);
    const recMime = rec.mimeType || 'audio/webm';

    rec.onstop = async () => {
      try {
        const rawBlob = new Blob(recordingChunksRef.current, { type: recMime });
        recordingChunksRef.current = [];
        cleanupRecording();

        if (rawBlob.size === 0) {
          showError('Micro không ghi nhận được dữ liệu âm thanh. Hãy kiểm tra lại nguồn Micro.');
          return;
        }

        // Chuyển đổi sang WAV chuẩn để phát mượt & hiển thị đúng thời lượng trên mọi trình duyệt
        let finalBlob: Blob = rawBlob;
        let ext = 'webm';
        let finalDuration = duration;
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const decodeCtx = new AudioCtx();
          const arrayBuf = await rawBlob.arrayBuffer();
          const audioBuffer = await decodeCtx.decodeAudioData(arrayBuf);
          const pcm = audioBuffer.getChannelData(0);
          finalDuration = Math.max(1, Math.round(audioBuffer.duration));
          finalBlob = encodePcmToWavBlob([pcm], audioBuffer.sampleRate, 16000);
          ext = 'wav';
          decodeCtx.close().catch(() => {});
        } catch {
          // Fallback giữ nguyên blob gốc nếu trình duyệt không decode được
        }

        const mediaId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await saveChatMediaBlob(mediaId, finalBlob);

        const voiceAtt: ChatAttachment = {
          id: mediaId,
          kind: 'audio',
          name: `Ghi_am_${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-')}.${ext}`,
          mimeType: finalBlob.type || recMime,
          size: finalBlob.size,
          mediaId,
          durationSec: finalDuration,
          isVoiceNote: true,
        };

        const targetThread =
          selectedThread === 'group-all'
            ? 'group-all'
            : isManager
            ? selectedThread
            : currentUser.id;

        const updated = sendChatMessage({
          threadStaffId: targetThread,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          senderAvatar: currentUser.avatar,
          senderDepartment: currentUser.department,
          content: '',
          topicTag: selectedTopic || undefined,
          attachments: [voiceAtt],
          replyTo: replyingTo || undefined,
        });

        setMessages(updated);
        setSelectedTopic('');
        setReplyingTo(null);
      } catch (err) {
        console.error('Voice send error:', err);
        showError('Lỗi khi lưu tin nhắn thoại. Vui lòng thử lại.');
      }
    };

    rec.stop();
  };

  const handleStartReply = (msg: InternalChatMessage) => {
    if (msg.recalled) return;
    const previewText = getMessagePreviewText(msg, false) || 'Tin nhắn';
    setReplyingTo({
      id: msg.id,
      senderName: msg.senderName,
      previewText,
    });
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMsgId(messageId);
    setTimeout(() => {
      setHighlightedMsgId(prev => (prev === messageId ? null : prev));
    }, 1600);
  };

  const handleRecallMessage = (messageId: string) => {
    const updated = recallChatMessage(messageId);
    setMessages(updated);
    if (replyingTo?.id === messageId) {
      setReplyingTo(null);
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const updated = toggleChatReaction(messageId, emoji, currentUser.id, currentUser.name);
    setMessages(updated);
    setOpenReactionMsgId(null);
  };

  const handleTogglePin = (messageId: string) => {
    const updated = toggleChatPin(messageId);
    setMessages(updated);
  };

  const handleSendSticker = (sticker: ChatSticker) => {
    const targetThread =
      selectedThread === 'group-all'
        ? 'group-all'
        : isManager
        ? selectedThread
        : currentUser.id;

    const updated = sendChatMessage({
      threadStaffId: targetThread,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      senderDepartment: currentUser.department,
      content: '',
      sticker,
      replyTo: replyingTo || undefined,
    });

    setMessages(updated);
    setReplyingTo(null);
    setPickerOpen(false);
  };

  const handleInsertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    try {
      const savedAttachments: ChatAttachment[] = [];

      for (const item of pendingAttachments) {
        const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await saveChatMediaBlob(mediaId, item.file);
        const dataUrl =
          item.file.size <= INLINE_DATA_URL_LIMIT ? await blobToDataUrl(item.file) : undefined;

        savedAttachments.push({
          id: item.id,
          kind: item.kind,
          name: item.file.name,
          mimeType: item.file.type || 'application/octet-stream',
          size: item.file.size,
          mediaId,
          dataUrl,
          durationSec: item.durationSec,
          isVoiceNote: item.isVoiceNote,
        });
        URL.revokeObjectURL(item.previewUrl);
      }

      const targetThread =
        selectedThread === 'group-all'
          ? 'group-all'
          : isManager
          ? selectedThread
          : currentUser.id;

      const updated = sendChatMessage({
        threadStaffId: targetThread,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        senderAvatar: currentUser.avatar,
        senderDepartment: currentUser.department,
        content: trimmed,
        topicTag: selectedTopic || undefined,
        attachments: savedAttachments.length > 0 ? savedAttachments : undefined,
        replyTo: replyingTo || undefined,
      });

      setMessages(updated);
      setInputText('');
      setSelectedTopic('');
      setPendingAttachments([]);
      setReplyingTo(null);
    } catch {
      showError('Không thể gửi tệp đính kèm. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const staffList = allUsers.filter(
    u =>
      u.role === 'staff' &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const managerUser =
    allUsers.find(u => u.role === 'manager') || {
      id: 'usr-1',
      name: 'Phạm Thu Hương',
      role: 'manager' as const,
      department: 'Ban Quản Lý Cụm Rạp',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      email: 'huong.pham@auroracinema.vn',
      staffCode: '0901112222',
      joinDate: '2024-01-10',
      status: 'active' as const,
    };

  const activeThreadMessages = messages.filter(m => {
    if (selectedThread === 'group-all') return m.threadStaffId === 'group-all';
    return m.threadStaffId !== 'group-all' && cleanId(m.threadStaffId) === cleanId(selectedThread);
  });

  const pinnedMessages = activeThreadMessages.filter(m => m.pinned && !m.recalled);

  const activeStaffPartner =
    selectedThread !== 'group-all'
      ? allUsers.find(u => cleanId(u.id) === cleanId(selectedThread))
      : null;

  const getThreadUnread = (threadId: string) => {
    if (threadId === 'group-all') {
      return messages.filter(
        m =>
          m.threadStaffId === 'group-all' &&
          (isManager ? m.senderRole === 'staff' && !m.readByManager : m.senderRole === 'manager' && !m.readByStaff)
      ).length;
    }
    return messages.filter(
      m =>
        m.threadStaffId !== 'group-all' &&
        cleanId(m.threadStaffId) === cleanId(threadId) &&
        (isManager ? m.senderRole === 'staff' && !m.readByManager : m.senderRole === 'manager' && !m.readByStaff)
    ).length;
  };

  const getLastMessage = (threadId: string) => {
    const list = messages.filter(m =>
      threadId === 'group-all'
        ? m.threadStaffId === 'group-all'
        : m.threadStaffId !== 'group-all' && cleanId(m.threadStaffId) === cleanId(threadId)
    );
    return list.length > 0 ? list[list.length - 1] : null;
  };

  return (
    <div className="h-[calc(100vh-120px)] min-h-[580px] bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row relative">
      {/* Error Toast */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 shadow-lg text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) stageFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => {
          if (e.target.files) stageFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={e => {
          if (e.target.files) stageFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) stageFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* ══════ LEFT SIDEBAR: CONVERSATIONS ══════ */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Kênh Trao Đổi Nội Bộ</h2>
              <p className="text-xs text-slate-500">Hỗ trợ ảnh, video, tệp & giọng nói</p>
            </div>
          </div>

          {isManager && (
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên nhân viên..."
                className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-amber-400"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {!isManager && (
            <button
              onClick={() => setSelectedThread(currentUser.id)}
              className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                selectedThread !== 'group-all'
                  ? 'bg-amber-50/70 border-l-4 border-amber-500'
                  : 'hover:bg-white'
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={managerUser.avatar}
                  alt={managerUser.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 truncate">QL. {managerUser.name}</span>
                  {getThreadUnread(currentUser.id) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                      {getThreadUnread(currentUser.id)}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-700 font-semibold">Quản lý Cụm Rạp (1-1)</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {getMessagePreviewText(getLastMessage(currentUser.id), false) || 'Nhắn tin trực tiếp cho Quản lý...'}
                </div>
              </div>
            </button>
          )}

          <button
            onClick={() => setSelectedThread('group-all')}
            className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
              selectedThread === 'group-all'
                ? 'bg-amber-50/70 border-l-4 border-amber-500'
                : 'hover:bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-slate-900 truncate">Kênh Chung Cụm Rạp</span>
                {getThreadUnread('group-all') > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {getThreadUnread('group-all')}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Toàn bộ Quản lý & Nhân viên</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {getMessagePreviewText(getLastMessage('group-all'), isManager) || 'Kênh trao đổi chung toàn rạp'}
              </div>
            </div>
          </button>

          {isManager &&
            staffList.map(staff => {
              const unread = getThreadUnread(staff.id);
              const lastMsg = getLastMessage(staff.id);
              const isSelected =
                selectedThread !== 'group-all' && cleanId(selectedThread) === cleanId(staff.id);

              return (
                <button
                  key={staff.id}
                  onClick={() => setSelectedThread(staff.id)}
                  className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/70 border-l-4 border-amber-500'
                      : 'hover:bg-white'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={staff.avatar}
                      alt={staff.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                    />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 truncate">{staff.name}</span>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{staff.department}</div>
                    <div className="text-xs text-slate-600 truncate mt-0.5">
                      {getMessagePreviewText(lastMsg, true) || 'Chưa có tin nhắn'}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* ══════ RIGHT PANEL: CHAT THREAD ══════ */}
      <div
        className="flex-1 flex flex-col bg-slate-50/40 min-w-0 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mb-3 shadow-lg">
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-base font-bold">Thả ảnh, video, âm thanh hoặc tệp vào đây</p>
            <p className="text-xs text-slate-300 mt-1">Hỗ trợ nhiều tệp cùng lúc (tối đa {MAX_FILE_SIZE_MB}MB/tệp)</p>
          </div>
        )}

        {/* Thread Header */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          {selectedThread === 'group-all' ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900">Kênh Chung Cụm Rạp Aurora</div>
                <div className="text-xs text-slate-500">Mọi nhân viên và quản lý đều nhận được tin nhắn tại đây</div>
              </div>
            </div>
          ) : isManager ? (
            <div className="flex items-center gap-3">
              <img
                src={activeStaffPartner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={activeStaffPartner?.name || 'Nhân viên'}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
              />
              <div>
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>{activeStaffPartner?.name || 'Nhân viên'}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Nhân viên
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {activeStaffPartner?.department || 'Khối vận hành rạp'} • SĐT:{' '}
                  {activeStaffPartner?.phone || activeStaffPartner?.staffCode || '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={managerUser.avatar}
                alt={managerUser.name}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200"
              />
              <div>
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Quản lý {managerUser.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" /> Quản lý cụm rạp
                  </span>
                </div>
                <div className="text-xs text-emerald-600 font-medium">● Trực tuyến</div>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Messages Banner (Zalo / Messenger style) */}
        {pinnedMessages.length > 0 && (
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-2 space-y-1.5">
            {(showAllPinned ? pinnedMessages : [pinnedMessages[pinnedMessages.length - 1]]).map(pm => (
              <div key={pm.id} className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleJumpToMessage(pm.id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition cursor-pointer"
                  title="Bấm để nhảy tới tin nhắn đã ghim"
                >
                  <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-500/30" />
                  <span className="font-bold text-amber-900 shrink-0">{pm.senderName}:</span>
                  <span className="text-slate-700 truncate">
                    {getMessagePreviewText(pm, false)}
                  </span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {pinnedMessages.length > 1 && !showAllPinned && (
                    <button
                      type="button"
                      onClick={() => setShowAllPinned(true)}
                      className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      +{pinnedMessages.length - 1} ghim
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTogglePin(pm.id)}
                    className="p-1 text-amber-700/70 hover:text-rose-600 hover:bg-white/70 rounded-md transition cursor-pointer"
                    title="Bỏ ghim"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {showAllPinned && pinnedMessages.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAllPinned(false)}
                className="text-[11px] font-semibold text-amber-800 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <ChevronUp className="w-3 h-3" />
                Thu gọn danh sách ghim
              </button>
            )}
          </div>
        )}

        {/* Messages Feed */}
        <div
          className="flex-1 p-5 overflow-y-auto space-y-4"
          onClick={() => {
            if (openReactionMsgId) setOpenReactionMsgId(null);
            if (pickerOpen) setPickerOpen(false);
          }}
        >
          {activeThreadMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <MessageSquare className="w-10 h-10 mb-2 text-slate-300" />
              <div className="text-sm font-semibold text-slate-600">Chưa có cuộc trò chuyện nào</div>
              <div className="text-xs text-slate-400 mt-0.5">
                Gửi tin nhắn, hình ảnh, video, tệp đính kèm hoặc ghi âm giọng nói để bắt đầu.
              </div>
            </div>
          ) : (
            activeThreadMessages.map(msg => {
              const isMine =
                cleanId(msg.senderId) === cleanId(currentUser.id) &&
                msg.senderRole === currentUser.role;

              return (
                <div
                  key={msg.id}
                  id={`chat-msg-${msg.id}`}
                  className={`flex items-end gap-2.5 rounded-2xl transition-colors duration-300 ${
                    isMine ? 'justify-end' : 'justify-start'
                  } ${highlightedMsgId === msg.id ? 'bg-amber-100/70 p-1.5 -m-1.5' : ''}`}
                >
                  {!isMine && (
                    <img
                      src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={msg.senderName}
                      className="w-8 h-8 rounded-xl object-cover shrink-0 ring-1 ring-slate-200"
                    />
                  )}

                  <div className={`max-w-[78%] space-y-1 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-1.5 text-[11px] ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">{msg.senderName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                          msg.senderRole === 'manager'
                            ? 'bg-slate-900 text-amber-400'
                            : 'bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        {msg.senderRole === 'manager' ? 'Quản lý' : 'Nhân viên'}
                      </span>
                      {msg.topicTag && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] inline-flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          {msg.topicTag}
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center gap-1.5 group/msg relative ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      {msg.recalled ? (
                        <div className="px-3.5 py-2 rounded-2xl text-xs italic border border-dashed border-slate-300 bg-slate-100/70 text-slate-400">
                          Tin nhắn đã được thu hồi
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            {/* Floating Quick Reaction Bar */}
                            {openReactionMsgId === msg.id && (
                              <div
                                onClick={e => e.stopPropagation()}
                                className={`absolute -top-11 z-20 flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-full shadow-lg ${
                                  isMine ? 'right-0' : 'left-0'
                                }`}
                              >
                                {REACTION_EMOJIS.map(em => (
                                  <button
                                    key={em}
                                    type="button"
                                    onClick={() => handleToggleReaction(msg.id, em)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 hover:scale-125 transition text-base cursor-pointer"
                                  >
                                    {em}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Message Bubble OR Sticker Card */}
                            {msg.sticker && !msg.content && (!msg.attachments || msg.attachments.length === 0) ? (
                              <div onDoubleClick={() => handleStartReply(msg)} className="space-y-1.5">
                                {msg.replyTo && (
                                  <button
                                    type="button"
                                    onClick={() => handleJumpToMessage(msg.replyTo!.id)}
                                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border-l-2 border-amber-500 text-xs transition cursor-pointer"
                                  >
                                    <div className="font-bold text-[11px] text-amber-700 truncate">
                                      {msg.replyTo.senderName}
                                    </div>
                                    <div className="truncate text-[11px] text-slate-500">
                                      {msg.replyTo.previewText}
                                    </div>
                                  </button>
                                )}
                                <div
                                  className={`inline-flex flex-col items-center justify-center px-5 py-3.5 rounded-2xl border-2 shadow-xs select-none ${msg.sticker.bg}`}
                                >
                                  <span className="text-5xl leading-none">{msg.sticker.emoji}</span>
                                  <span className="text-xs font-bold mt-2">{msg.sticker.label}</span>
                                </div>
                              </div>
                            ) : (
                              <div
                                onDoubleClick={() => handleStartReply(msg)}
                                className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-2xs space-y-2 ${
                                  isMine
                                    ? 'bg-slate-900 text-white rounded-br-sm'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                                }`}
                              >
                                {msg.pinned && (
                                  <div className={`flex items-center gap-1 text-[10px] font-semibold ${isMine ? 'text-amber-300' : 'text-amber-600'}`}>
                                    <Pin className="w-3 h-3" />
                                    <span>Đã ghim</span>
                                  </div>
                                )}

                                {msg.replyTo && (
                                  <button
                                    type="button"
                                    onClick={() => handleJumpToMessage(msg.replyTo!.id)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-xl border-l-2 text-xs transition cursor-pointer ${
                                      isMine
                                        ? 'bg-white/10 hover:bg-white/15 border-amber-400 text-white/90'
                                        : 'bg-slate-100 hover:bg-slate-200/70 border-amber-500 text-slate-700'
                                    }`}
                                    title="Bấm để xem tin nhắn gốc"
                                  >
                                    <div className={`font-bold text-[11px] truncate ${isMine ? 'text-amber-300' : 'text-amber-700'}`}>
                                      {msg.replyTo.senderName}
                                    </div>
                                    <div className={`truncate text-[11px] ${isMine ? 'text-white/75' : 'text-slate-500'}`}>
                                      {msg.replyTo.previewText}
                                    </div>
                                  </button>
                                )}

                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="space-y-2">
                                    {msg.attachments.map(att => (
                                      <AttachmentView
                                        key={att.id}
                                        att={att}
                                        isMine={isMine}
                                        onZoomImage={(url, name) => setLightbox({ url, name })}
                                      />
                                    ))}
                                  </div>
                                )}
                                {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}
                              </div>
                            )}

                            {/* Reaction Pills Bar */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`flex flex-wrap items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                {msg.reactions.map(r => {
                                  const iReacted = r.userIds.some(uid => cleanId(uid) === cleanId(currentUser.id));
                                  return (
                                    <button
                                      key={r.emoji}
                                      type="button"
                                      onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                      title={r.userNames.join(', ')}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition cursor-pointer ${
                                        iReacted
                                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{r.emoji}</span>
                                      {r.userIds.length > 1 && (
                                        <span className="text-[10px] font-mono">{r.userIds.length}</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Hover Action Buttons: React / Reply / Pin / Recall */}
                          <div
                            onClick={e => e.stopPropagation()}
                            className="opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 flex items-center gap-0.5 transition shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenReactionMsgId(prev => (prev === msg.id ? null : msg.id))
                              }
                              title="Thả cảm xúc"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartReply(msg)}
                              title="Trả lời"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg.id)}
                              title={msg.pinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                msg.pinned
                                  ? 'text-amber-600 bg-amber-50'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            {isMine && (
                              <button
                                type="button"
                                onClick={() => handleRecallMessage(msg.id)}
                                title="Thu hồi tin nhắn"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Undo2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className={`flex items-center gap-1 text-[11px] text-slate-400 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span>{msg.createdAt}</span>
                      {isMine && (
                        <CheckCheck
                          className={`w-3.5 h-3.5 ${
                            (isManager && msg.readByStaff) || (!isManager && msg.readByManager)
                              ? 'text-emerald-500'
                              : 'text-slate-300'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ══════ COMPOSER ══════ */}
        <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-slate-200 space-y-2.5 relative">
          {/* Sticker & Emoji Picker Popover */}
          {pickerOpen && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute bottom-full left-3.5 mb-2 z-30 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPickerTab('sticker')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      pickerTab === 'sticker'
                        ? 'bg-slate-900 text-amber-400'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sticker className="w-3.5 h-3.5" />
                    <span>Sticker Aurora</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTab('emoji')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      pickerTab === 'emoji'
                        ? 'bg-slate-900 text-amber-400'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>Emoji</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {pickerTab === 'sticker' ? (
                <div className="p-3 grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {AURORA_STICKERS.map(stk => (
                    <button
                      key={stk.id}
                      type="button"
                      onClick={() => handleSendSticker(stk)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition hover:scale-105 cursor-pointer ${stk.bg}`}
                    >
                      <span className="text-3xl leading-none">{stk.emoji}</span>
                      <span className="text-[10px] font-bold mt-1.5 text-center leading-tight">{stk.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 grid grid-cols-6 gap-1.5 max-h-56 overflow-y-auto">
                  {QUICK_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleInsertEmoji(em)}
                      className="h-10 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 hover:scale-110 transition cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reply Preview Bar */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200 border-l-4 border-l-amber-500 rounded-xl">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Đang trả lời {replyingTo.senderName}</span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{replyingTo.previewText}</div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition cursor-pointer shrink-0"
                title="Hủy trả lời"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pending Attachments Preview Bar */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              {pendingAttachments.map(item => (
                <div
                  key={item.id}
                  className="relative group flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 pr-7 max-w-[220px]"
                >
                  {item.kind === 'image' ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : item.kind === 'video' ? (
                    <div className="w-10 h-10 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                      <Film className="w-4.5 h-4.5" />
                    </div>
                  ) : item.kind === 'audio' ? (
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Music className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{item.file.name}</div>
                    <div className="text-[10px] text-slate-400">{formatFileSize(item.file.size)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(item.id)}
                    className="absolute top-1 right-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                    title="Bỏ tệp này"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Voice Recording Active Bar OR Normal Input Bar */}
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                <span className="font-mono text-sm font-bold text-rose-900 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">
                  {formatAudioDuration(recordingSec)}
                </span>
                <div className="flex items-center gap-1 h-5">
                  {[12, 26, 44, 62, 80].map((threshold, idx) => (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        micLevel >= threshold ? 'bg-rose-600' : 'bg-rose-200'
                      }`}
                      style={{ height: `${Math.min(20, Math.max(5, Math.round((micLevel / 100) * 20) - idx))}px` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={stopAndSendVoiceRecording}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Dừng & Gửi</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Media Action Buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setPickerOpen(prev => !prev);
                  }}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    pickerOpen
                      ? 'bg-amber-100 text-amber-800'
                      : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                  }`}
                  title="Gửi Sticker & Emoji"
                >
                  <Smile className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                  title="Gửi hình ảnh (hoặc dán Ctrl+V)"
                >
                  <ImageIcon className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                  title="Gửi video"
                >
                  <Film className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                  title="Gửi tệp âm thanh (MP3, WAV...)"
                >
                  <Music className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Đính kèm tệp / tài liệu (PDF, Word, Excel...)"
                >
                  <Paperclip className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startVoiceRecording()}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Ghi âm giọng nói trực tiếp"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
              </div>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  selectedThread === 'group-all'
                    ? 'Nhập tin nhắn, dán ảnh hoặc kéo thả tệp vào Kênh Chung...'
                    : isManager
                    ? `Nhắn cho ${activeStaffPartner?.name || 'nhân viên'}...`
                    : 'Nhập nội dung trao đổi với Quản lý...'
                }
                className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-amber-400 transition"
              />

              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && pendingAttachments.length === 0)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{isSending ? 'Đang gửi...' : 'Gửi'}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ══════ IMAGE LIGHTBOX MODAL ══════ */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-w-4xl w-full flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-white px-2">
              <span className="text-sm font-semibold truncate">{lightbox.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightbox.url}
                  download={lightbox.name}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải xuống
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
