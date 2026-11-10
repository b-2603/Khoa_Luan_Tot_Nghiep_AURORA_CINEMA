import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import {
  getUsers,
  getChatMessages,
  sendChatMessage,
  markChatThreadRead,
  InternalChatMessage,
} from '../services/storage';
import { fetchEmployees } from '../services/apiClient';
import {
  MessageSquare,
  Send,
  Users,
  ShieldCheck,
  CheckCheck,
  Search,
  Tag,
} from 'lucide-react';

interface InternalChatPageProps {
  currentUser: User;
}

const QUICK_TOPICS = [
  'Hỏi lịch ca trực',
  'Xin hỗ trợ đổi ca',
  'Vấn đề chấm công',
  'Báo sự cố thiết bị/quầy',
];

const cleanId = (id?: string) => String(id || '').replace('usr-', '').trim();

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
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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
  }, [selectedThread, currentUser.role]);

  useEffect(() => {
    const syncMessages = () => {
      const latest = markChatThreadRead(selectedThread, currentUser.role);
      setMessages(latest);
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

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
    });

    setMessages(updated);
    setInputText('');
    setSelectedTopic('');
  };

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
    <div className="h-[calc(100vh-120px)] min-h-[560px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/60 shrink-0">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Kênh Trao Đổi Nội Bộ
              </h2>
              <p className="text-[11px] text-slate-500">
                Kết nối trực tiếp giữa Quản lý & Nhân sự cụm rạp
              </p>
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
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:border-purple-400"
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
                  ? 'bg-purple-50/90 border-l-4 border-purple-600'
                  : 'hover:bg-white'
              }`}
            >
              <div className="relative shrink-0">
                <img
                  src={managerUser.avatar}
                  alt={managerUser.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-purple-200"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    QL. {managerUser.name}
                  </span>
                  {getThreadUnread(currentUser.id) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                      {getThreadUnread(currentUser.id)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-purple-700 font-semibold">
                  Quản lý Cụm Rạp (Chat 1-1)
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {getLastMessage(currentUser.id)?.content || 'Nhắn tin trực tiếp cho Quản lý...'}
                </div>
              </div>
            </button>
          )}

          <button
            onClick={() => setSelectedThread('group-all')}
            className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
              selectedThread === 'group-all'
                ? 'bg-purple-50/90 border-l-4 border-purple-600'
                : 'hover:bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-slate-900 truncate">
                  Kênh Chung Cụm Rạp
                </span>
                {getThreadUnread('group-all') > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {getThreadUnread('group-all')}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-amber-700 font-semibold">
                Toàn bộ Quản lý & Nhân viên
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {getLastMessage('group-all')?.content || 'Kênh trao đổi chung toàn rạp'}
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
                      ? 'bg-purple-50/90 border-l-4 border-purple-600'
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
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {staff.name}
                      </span>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                          {unread}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {staff.department}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      {lastMsg ? `${lastMsg.senderRole === 'manager' ? 'Bạn: ' : ''}${lastMsg.content}` : 'Chưa có tin nhắn'}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-50/30 min-w-0">
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          {selectedThread === 'group-all' ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900">
                  Kênh Chung Cụm Rạp Aurora
                </div>
                <div className="text-[11px] text-slate-500">
                  Mọi nhân viên và quản lý đều nhận được tin nhắn tại đây
                </div>
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
                <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span>{activeStaffPartner?.name || 'Nhân viên'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Nhân viên
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeStaffPartner?.department || 'Khối vận hành rạp'} • SĐT: {activeStaffPartner?.phone || activeStaffPartner?.staffCode || '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <img
                src={managerUser.avatar}
                alt={managerUser.name}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-purple-200"
              />
              <div>
                <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span>Quản lý {managerUser.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Quản lý cụm rạp
                  </span>
                </div>
                <div className="text-[11px] text-emerald-600 font-medium">
                  ● Trực tuyến — Sẵn sàng tiếp nhận phản hồi của bạn
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
          {activeThreadMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
              <MessageSquare className="w-10 h-10 mb-2 text-slate-300" />
              <div className="text-xs font-bold text-slate-600">
                Chưa có cuộc trò chuyện nào
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Hãy gửi tin nhắn đầu tiên để trao đổi trực tiếp.
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
                  className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <img
                      src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-lg object-cover shrink-0 ring-1 ring-slate-200"
                    />
                  )}

                  <div className={`max-w-[75%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-slate-700">{msg.senderName}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                        msg.senderRole === 'manager'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {msg.senderRole === 'manager' ? 'Quản lý' : 'Nhân viên'}
                      </span>
                      {msg.topicTag && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px] inline-flex items-center gap-0.5">
                          <Tag className="w-2.5 h-2.5" />
                          {msg.topicTag}
                        </span>
                      )}
                    </div>

                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        isMine
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>

                    <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span>{msg.createdAt}</span>
                      {isMine && (
                        <CheckCheck
                          className={`w-3 h-3 ${
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

        <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 mr-1">Chủ đề nhanh:</span>
            {QUICK_TOPICS.map(topic => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(prev => (prev === topic ? '' : topic))}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                  selectedTopic === topic
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                selectedThread === 'group-all'
                  ? 'Nhập tin nhắn gửi lên Kênh Chung Cụm Rạp...'
                  : isManager
                  ? `Nhập phản hồi cho ${activeStaffPartner?.name || 'nhân viên'}...`
                  : 'Nhập nội dung cần trao đổi hoặc báo với Quản lý...'
              }
              className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
