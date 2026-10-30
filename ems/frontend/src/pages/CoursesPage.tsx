import React, { useState, useEffect } from 'react';
import { Course, CourseModule } from '../types';
import { getCourses, saveCourse } from '../services/storage';
import { fetchCourses } from '../services/apiClient';
import { askCinemaAiAssistant } from '../services/openai';
import { ModuleMiniQuiz } from '../components/ModuleMiniQuiz';
import { 
  BookOpen, 
  PlayCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  X, 
  Search, 
  Filter, 
  Star, 
  Award, 
  Flame, 
  User, 
  ChevronRight, 
  HelpCircle, 
  Send, 
  Edit3, 
  GraduationCap, 
  Check, 
  CheckCheck,
  ShieldAlert,
  Zap,
  BookmarkCheck,
  Film,
  ArrowRight,
  Lock,
  Unlock,
  AlertTriangle,
  FileQuestion,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface CoursesPageProps {
  onNavigateToQuiz?: () => void;
}

export interface ModuleProgressRecord {
  videoPercent: number; // 0..50%
  testPercent: number;  // 0..50%
  totalPercent: number; // 0..100%
  isCompleted: boolean;
  testScore?: number;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ onNavigateToQuiz }) => {
  const [courses, setCourses] = useState<Course[]>(getCourses());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState<CourseModule | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Player tabs: 'video' | 'mini_quiz' | 'exam_points' | 'handbook' | 'notes' | 'ai'
  const [playerTab, setPlayerTab] = useState<'video' | 'mini_quiz' | 'exam_points' | 'handbook' | 'notes' | 'ai'>('video');
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChatLog, setAiChatLog] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [isAiAnswering, setIsAiAnswering] = useState(false);

  // Quản lý tiến độ từng bài học (Video 50% + Test 10 câu 50% = 100%)
  const [moduleProgressMap, setModuleProgressMap] = useState<Record<string, ModuleProgressRecord>>(() => {
    try {
      const raw = localStorage.getItem('aurora_ems_module_progress');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    fetchCourses().then(data => {
      if (data && data.length > 0) setCourses(data);
    });

    // Load saved notes from localStorage
    const savedNotes = localStorage.getItem('aurora_ems_lesson_notes');
    if (savedNotes) {
      try { setPersonalNotes(JSON.parse(savedNotes)); } catch {}
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getModuleProgress = (courseId: string, moduleId: string, isModCompleted?: boolean): ModuleProgressRecord => {
    const key = `${courseId}_${moduleId}`;
    const existing = moduleProgressMap[key];
    if (existing) return existing;
    if (isModCompleted) {
      return { videoPercent: 50, testPercent: 50, totalPercent: 100, isCompleted: true, testScore: 10 };
    }
    return { videoPercent: 0, testPercent: 0, totalPercent: 0, isCompleted: false };
  };

  // Khóa học tuần tự: Bắt buộc xem xong bài 1 mới được coi bài 2
  const isModuleUnlocked = (idx: number): boolean => {
    if (idx === 0) return true; // Bài 1 luôn mở
    if (!selectedCourse) return false;
    return selectedCourse.modules.slice(0, idx).every(prevMod => {
      const key = `${selectedCourse.id}_${prevMod.id}`;
      const p = moduleProgressMap[key];
      return prevMod.isCompleted || p?.isCompleted;
    });
  };

  // Ngăn chặn out bài test khi chưa nộp bài
  const confirmExitTest = (action: () => void) => {
    if (playerTab === 'mini_quiz') {
      setPendingExitAction(() => action);
      setShowExitConfirmModal(true);
    } else {
      action();
    }
  };

  const handleOpenCourse = (c: Course) => {
    setSelectedCourse(c);
    setActiveModule(c.modules[0] || null);
    setPlayerTab('video');
    setAiChatLog([
      { 
        sender: 'ai', 
        text: `Xin chào! Tôi là Trợ lý Hỗ Trợ Đào Tạo Aurora. Tôi luôn sẵn sàng giải đáp các quy chuẩn nghiệp vụ liên quan đến khóa học "${c.title}". Bạn có câu hỏi nào cần hỗ trợ không?` 
      }
    ]);
  };

  const handleSelectModule = (m: CourseModule, idx: number) => {
    if (!isModuleUnlocked(idx)) {
      showToast(`🔒 Bài học này đang bị khóa! Bạn cần xem hết Bài ${idx} và vượt qua bài test 10 câu để mở khóa bài tiếp theo.`);
      return;
    }
    confirmExitTest(() => {
      setActiveModule(m);
      setPlayerTab('video');
    });
  };

  const handleSwitchTab = (newTab: 'video' | 'mini_quiz' | 'exam_points' | 'handbook' | 'notes' | 'ai') => {
    if (playerTab === 'mini_quiz' && newTab !== 'mini_quiz') {
      confirmExitTest(() => setPlayerTab(newTab));
    } else {
      setPlayerTab(newTab);
    }
  };

  const handleCloseCourseModal = () => {
    confirmExitTest(() => {
      setSelectedCourse(null);
    });
  };

  const handleUpdateVideoProgress = (newPercent: number) => {
    if (!selectedCourse || !activeModule) return;
    const key = `${selectedCourse.id}_${activeModule.id}`;
    const curr = getModuleProgress(selectedCourse.id, activeModule.id, activeModule.isCompleted);
    const updatedVideo = Math.min(50, Math.max(curr.videoPercent, newPercent));
    const updatedTotal = Math.min(100, updatedVideo + curr.testPercent);
    const updatedIsCompleted = curr.isCompleted || (updatedVideo >= 50 && curr.testPercent >= 50);

    const updatedRec: ModuleProgressRecord = {
      ...curr,
      videoPercent: updatedVideo,
      totalPercent: updatedTotal,
      isCompleted: updatedIsCompleted
    };

    const newMap = { ...moduleProgressMap, [key]: updatedRec };
    setModuleProgressMap(newMap);
    localStorage.setItem('aurora_ems_module_progress', JSON.stringify(newMap));

    if (updatedVideo >= 50 && curr.videoPercent < 50) {
      showToast('✓ Bạn đã xem xong Video (50%)! Hãy làm bài test 10 câu để hoàn thành 100% bài học.');
    }
  };

  const handlePassModule = (courseId: string, modId: string, testScore: number) => {
    const key = `${courseId}_${modId}`;
    const updatedRec: ModuleProgressRecord = {
      videoPercent: 50,
      testPercent: 50,
      totalPercent: 100,
      isCompleted: true,
      testScore
    };

    const newMap = { ...moduleProgressMap, [key]: updatedRec };
    setModuleProgressMap(newMap);
    localStorage.setItem('aurora_ems_module_progress', JSON.stringify(newMap));

    // Cập nhật trạng thái module trong course
    handleMarkModuleComplete(modId);
  };

  const handleMarkModuleComplete = (modId: string) => {
    if (!selectedCourse) return;
    const updatedModules = selectedCourse.modules.map(m => 
      m.id === modId ? { ...m, isCompleted: true } : m
    );
    const updatedCourse = { ...selectedCourse, modules: updatedModules };
    saveCourse(updatedCourse);
    setSelectedCourse(updatedCourse);
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  const handleSaveNote = (text: string) => {
    if (!activeModule) return;
    const updated = { ...personalNotes, [activeModule.id]: text };
    setPersonalNotes(updated);
    localStorage.setItem('aurora_ems_lesson_notes', JSON.stringify(updated));
  };

  const handleAskAi = async () => {
    if (!aiQuestion.trim() || !selectedCourse) return;
    const q = aiQuestion.trim();
    setAiQuestion('');
    setAiChatLog(prev => [...prev, { sender: 'user', text: q }]);
    setIsAiAnswering(true);

    try {
      const prompt = `Khóa học: "${selectedCourse.title}". Bài học: "${activeModule?.title || ''}". Câu hỏi nghiệp vụ của nhân viên: "${q}". Hãy trả lời ngắn gọn, chuyên nghiệp, chính xác theo tiêu chuẩn vận hành rạp chiếu phim Aurora Cinemas.`;
      const answer = await askCinemaAiAssistant(prompt, 'staff');
      setAiChatLog(prev => [...prev, { sender: 'ai', text: answer.text }]);
    } catch {
      setAiChatLog(prev => [...prev, { sender: 'ai', text: 'Hệ thống hỗ trợ hiện đang bận. Vui lòng gửi lại câu hỏi sau giây lát.' }]);
    } finally {
      setIsAiAnswering(false);
    }
  };

  // Filter Categories
  const categories = [
    { id: 'all', label: 'Tất Cả Khóa Học' },
    { id: 'Bắp Nước & Quầy Concession', label: 'Quầy Bắp Nước Concession' },
    { id: 'Vé & Chăm sóc Khách hàng', label: 'Vé Box Office & CSKH' },
    { id: 'Kỹ thuật Phim & Âm thanh', label: 'Kỹ Thuật IMAX & Âm Thanh' },
    { id: 'An Toàn & Khẩn Cấp', label: 'An Toàn PCCC & Sơ Tán' },
    { id: 'Chương Trình Khuyến Mãi (CTKM)', label: 'Khuyến Mãi CTKM' },
  ];

  // Filtering Logic
  const filteredCourses = courses.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.instructorName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;

    const completedMods = c.modules.filter(m => m.isCompleted).length;
    const isCompleted = completedMods === c.modules.length && c.modules.length > 0;
    const isInProgress = completedMods > 0 && !isCompleted;

    const matchStatus = selectedStatus === 'all' 
      ? true 
      : selectedStatus === 'completed' 
      ? isCompleted 
      : isInProgress;

    return matchSearch && matchCategory && matchStatus;
  });

  // Global KPIs
  const totalCourses = courses.length;
  const completedCoursesCount = courses.filter(c => c.modules.every(m => m.isCompleted) && c.modules.length > 0).length;
  const totalHours = Math.round(courses.reduce((acc, c) => acc + c.durationMinutes, 0) / 60);

  return (
    <div className="space-y-6">
      {/* Hero Banner: Học Viện Đào Tạo Aurora Cinemas Academy */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 border border-purple-500/20 shadow-xl p-6 lg:p-8 text-white">
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AURORA CINEMAS ACADEMY 2026</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Học Viện Đào Tạo Nghiệp Vụ Chuẩn Rạp Chiếu Phim
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Chương trình đào tạo và nâng cao nghiệp vụ nhân sự rạp chiếu phim.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <div className="text-2xl font-black text-amber-400">{completedCoursesCount}/{totalCourses}</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Khóa Đã Học</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <div className="text-2xl font-black text-cyan-400">{totalHours}h+</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Thời Lượng Chuẩn</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-emerald-400">100%</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Cấp Chứng Chỉ QR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên khóa học, kỹ năng hoặc giảng viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">Trạng thái:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => setSelectedStatus('in_progress')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                selectedStatus === 'in_progress'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đang Học
            </button>
            <button
              onClick={() => setSelectedStatus('completed')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                selectedStatus === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã Hoàn Thành
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-purple-50 text-purple-700 border border-purple-300 font-bold shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const completedMods = course.modules.filter(m => m.isCompleted).length;
          const percent = Math.round((completedMods / (course.modules.length || 1)) * 100);
          const isDone = percent === 100 && course.modules.length > 0;

          return (
            <div
              key={course.id}
              className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg flex flex-col justify-between transition-all duration-300 group"
            >
              <div>
                {/* Course Thumbnail & Badges */}
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/20"></div>

                  {course.isCtkm ? (
                    <span className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" /> CTKM NỔI BẬT
                    </span>
                  ) : (
                    <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-amber-500/30">
                      {course.level || 'Tiêu Chuẩn'}
                    </span>
                  )}

                  <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-white/20">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> {course.durationMinutes} phút
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-700 uppercase tracking-wide">
                      {course.category}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{course.rating || 4.9}</span>
                      <span className="text-[10px] text-slate-400">({course.reviewCount || 42})</span>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-900 line-clamp-2 group-hover:text-amber-600 transition leading-snug">
                    {course.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>

                  {/* Giảng viên phụ trách */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <img 
                      src={course.instructorAvatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'} 
                      alt={course.instructorName} 
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">{course.instructorName || 'Phạm Thu Hương'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[190px]">{course.instructorTitle || 'Quản lý Đào tạo Aurora'}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                      <span>{completedMods}/{course.modules.length} bài học hoàn thành</span>
                      <span className={isDone ? 'text-emerald-600' : 'text-amber-600'}>{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-purple-600'
                        }`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => handleOpenCourse(course)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
                    isDone
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : percent > 0
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isDone ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                      <span>Ôn Tập Bài Giảng</span>
                    </>
                  ) : percent > 0 ? (
                    <>
                      <PlayCircle className="w-4 h-4 text-slate-950" />
                      <span>Tiếp Tục Học ({percent}%)</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 text-amber-400" />
                      <span>Bắt Đầu Khóa Học</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* COURSE PLAYER MODAL (TRÌNH HỌC TẬP NGHIỆP VỤ CAO CẤP) */}
      {/* ========================================================================= */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[760px] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-amber-700 uppercase tracking-wider">{selectedCourse.category}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-purple-700 font-mono">{selectedCourse.level || 'Tiêu Chuẩn'}</span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1">
                  {selectedCourse.title}
                </h3>
              </div>

              <button 
                onClick={handleCloseCourseModal} 
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
                title="Đóng cửa sổ học"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Player / Content Area */}
              <div className="flex-1 bg-slate-50 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto">
                {activeModule ? (
                  <div className="space-y-4">
                    {/* BĂNG TIẾN ĐỘ BÀI HỌC (VIDEO 50% + BÀI TEST 10 CÂU 50% = 100%) */}
                    {(() => {
                      const activeModIdx = selectedCourse.modules.findIndex(m => m.id === activeModule.id);
                      const currentProg = getModuleProgress(selectedCourse.id, activeModule.id, activeModule.isCompleted);

                      return (
                        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">
                                Tiến độ {activeModule.title.split(':')[0] || 'Bài học'}:
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                currentProg.isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-950 border border-amber-300'
                              }`}>
                                {currentProg.totalPercent}% Hoàn Thành
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
                                <span>Video:</span> <strong>{currentProg.videoPercent}/50%</strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1">
                                <FileQuestion className="w-3.5 h-3.5 text-purple-600" />
                                <span>Test 10 câu:</span> <strong>{currentProg.testPercent}/50%</strong>
                              </span>
                            </div>
                          </div>

                          {/* Thanh phần trăm hai màu (Vàng cho video, Tím cho bài test) */}
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/80 p-0.5 flex">
                            <div
                              className="h-full bg-amber-500 rounded-l-full transition-all duration-300"
                              style={{ width: `${currentProg.videoPercent}%` }}
                              title={`Tiến độ video: ${currentProg.videoPercent}/50%`}
                            />
                            <div
                              className="h-full bg-purple-600 rounded-r-full transition-all duration-300"
                              style={{ width: `${currentProg.testPercent}%` }}
                              title={`Tiến độ bài test: ${currentProg.testPercent}/50%`}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Player Tabs */}
                    {(() => {
                      const currentProg = getModuleProgress(selectedCourse.id, activeModule.id, activeModule.isCompleted);
                      return (
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                          <button
                            onClick={() => handleSwitchTab('video')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              playerTab === 'video'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Video / Trình Chiếu</span>
                          </button>

                          <button
                            onClick={() => handleSwitchTab('mini_quiz')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              playerTab === 'mini_quiz'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                                : currentProg.testPercent >= 50
                                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                            }`}
                          >
                            <FileQuestion className="w-3.5 h-3.5" />
                            <span>Bài Test 10 Câu (Nhớ Bài)</span>
                            {currentProg.testPercent >= 50 ? (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-200 text-emerald-900 font-extrabold">✓ 50%</span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-200 text-purple-900 font-bold">10 câu</span>
                            )}
                          </button>

                          <button
                            onClick={() => handleSwitchTab('exam_points')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              playerTab === 'exam_points'
                                ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5 text-emerald-500" />
                            <span>30 Điểm Thi Sát Hạch</span>
                          </button>

                          <button
                            onClick={() => handleSwitchTab('handbook')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              playerTab === 'handbook'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-400" />
                            <span>Cẩm Nang SOP Chi Tiết</span>
                          </button>

                          <button
                            onClick={() => handleSwitchTab('notes')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              playerTab === 'notes'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Ghi Chú Của Tôi</span>
                          </button>

                          <button
                            onClick={() => handleSwitchTab('ai')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              playerTab === 'ai'
                                ? 'bg-gradient-to-r from-purple-600 to-amber-500 text-white shadow-xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Hỏi Đáp Nghiệp Vụ</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Tab 1: Video / Media Thực Tế */}
                    {playerTab === 'video' && (() => {
                      const currentProg = getModuleProgress(selectedCourse.id, activeModule.id, activeModule.isCompleted);

                      return (
                        <div className="space-y-4">
                          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative group">
                            {activeModule.contentUrl && (activeModule.contentUrl.includes('youtube.com') || activeModule.contentUrl.includes('youtu.be')) ? (
                              <iframe
                                src={
                                  activeModule.contentUrl.includes('embed/')
                                    ? activeModule.contentUrl
                                    : activeModule.contentUrl.includes('watch?v=')
                                    ? `https://www.youtube.com/embed/${activeModule.contentUrl.split('v=')[1]?.split('&')[0]}?autoplay=0&rel=0&modestbranding=1`
                                    : `https://www.youtube.com/embed/${activeModule.contentUrl.split('youtu.be/')[1]?.split('?')[0]}?autoplay=0&rel=0&modestbranding=1`
                                }
                                title={activeModule.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            ) : (
                              <video 
                                key={activeModule.contentUrl} 
                                controls 
                                className="w-full h-full object-cover"
                                onTimeUpdate={(e) => {
                                  const dur = e.currentTarget.duration || 1;
                                  const curr = e.currentTarget.currentTime || 0;
                                  const pct = Math.min(50, Math.round((curr / dur) * 50));
                                  if (pct > currentProg.videoPercent) {
                                    handleUpdateVideoProgress(pct);
                                  }
                                }}
                              >
                                <source src={activeModule.contentUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'} type="video/mp4" />
                                Trình duyệt không hỗ trợ thẻ video.
                              </video>
                            )}

                            {/* Top floating badge */}
                            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-lg">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                <span>VIDEO NGHIỆP VỤ THỰC TẾ</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] text-slate-300 font-mono">
                                {activeModule.duration}
                              </span>
                            </div>
                          </div>

                          {/* Thanh Theo Dõi & Xác Nhận Tiến Độ Video (0 -> 50%) */}
                          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                                <PlayCircle className="w-4 h-4 text-amber-600" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>Tiến độ xem video:</span>
                                  <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-extrabold">
                                    {currentProg.videoPercent}% / 50%
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500">Xem hết video để nhận đủ 50% tiến độ bài học</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateVideoProgress(25)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                              >
                                25%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateVideoProgress(40)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer"
                              >
                                40%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateVideoProgress(50)}
                                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer ${
                                  currentProg.videoPercent >= 50
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-2xs'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{currentProg.videoPercent >= 50 ? 'Đã xem đủ video (50%)' : 'Xác nhận xem xong (50%)'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Banner Gợi Ý Sang Làm Bài Test 10 Câu */}
                          {currentProg.videoPercent >= 50 && !currentProg.isCompleted && (
                            <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-amber-50 border-2 border-purple-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                                  <Sparkles className="w-5 h-5 text-amber-200" />
                                </div>
                                <div>
                                  <h5 className="font-extrabold text-xs text-purple-950">
                                    Bạn đã xem xong Video (50%)!
                                  </h5>
                                  <p className="text-[11px] text-purple-800 leading-relaxed">
                                    Hãy làm <strong>Bài kiểm tra nhỏ 10 câu</strong> để đạt 100% và mở khóa bài tiếp theo.
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleSwitchTab('mini_quiz')}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                              >
                                <FileQuestion className="w-4 h-4 text-amber-200" />
                                <span>Làm Bài Test 10 Câu Ngay ➔</span>
                              </button>
                            </div>
                          )}

                          {activeModule.contentSummary && (
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                  <BookOpen className="w-4 h-4 text-amber-600" />
                                  <span>Tóm tắt nội dung bài giảng:</span>
                                </h4>
                                {activeModule.contentUrl && (activeModule.contentUrl.includes('youtube.com') || activeModule.contentUrl.includes('youtu.be')) && (
                                  <a
                                    href={activeModule.contentUrl.replace('/embed/', '/watch?v=')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1"
                                  >
                                    <span>Xem nguồn gốc trên YouTube ↗</span>
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {activeModule.contentSummary}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Tab 2: BÀI TEST 10 CÂU HỎI TRẮC NGHIỆM ĐỂ NHỚ BÀI */}
                    {playerTab === 'mini_quiz' && (() => {
                      const activeModIdx = selectedCourse.modules.findIndex(m => m.id === activeModule.id);
                      return (
                        <ModuleMiniQuiz
                          course={selectedCourse}
                          module={activeModule}
                          moduleIndex={activeModIdx >= 0 ? activeModIdx : 0}
                          hasNextModule={activeModIdx < selectedCourse.modules.length - 1}
                          onPass={(score) => handlePassModule(selectedCourse.id, activeModule.id, score)}
                          onExit={() => setPlayerTab('video')}
                          onRequestNextModule={() => {
                            const nextIdx = activeModIdx + 1;
                            if (nextIdx < selectedCourse.modules.length) {
                              setActiveModule(selectedCourse.modules[nextIdx]);
                              setPlayerTab('video');
                            }
                          }}
                        />
                      );
                    })()}

                    {/* Tab 3: 30 Điểm Thi Sát Hạch */}
                    {playerTab === 'exam_points' && selectedCourse && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ĐỒNG BỘ 100% VỚI ĐỀ THI
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                {selectedCourse.examCheckpoints?.length || 30} Điểm Sát Hạch Cốt Lõi
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900 mt-1">
                              Nắm Chắc 30 Điểm Trọng Tâm Này Để Đạt Điểm Tuyệt Đối (100/100)
                            </h4>
                          </div>

                          {onNavigateToQuiz && (
                            <button
                              onClick={() => {
                                setSelectedCourse(null);
                                onNavigateToQuiz();
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <span>Làm Bài Kiểm Tra 30 Câu Ngay</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          Tất cả 30 câu hỏi của bài kiểm tra nghiệp vụ được trích xuất trực tiếp từ các tiêu chuẩn thao tác thực tế dưới đây. Vui lòng đọc kỹ trước khi nộp bài thi.
                        </p>

                        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                          {(selectedCourse.examCheckpoints && selectedCourse.examCheckpoints.length > 0
                            ? selectedCourse.examCheckpoints
                            : []
                          ).map((point, pIdx) => {
                            const parts = point.split(' ➔ Đáp án chuẩn: ');
                            const questionPart = parts[0] || point;
                            const answerAndExp = parts[1] || '';
                            const answerParts = answerAndExp.split('. Giải thích SOP: ');
                            const answerPart = answerParts[0] || '';
                            const expPart = answerParts[1] || '';

                            return (
                              <div key={pIdx} className="p-3.5 bg-slate-50 border border-slate-200 hover:border-emerald-300 rounded-xl space-y-1.5 transition">
                                <div className="text-xs font-extrabold text-slate-900 leading-snug">
                                  {questionPart}
                                </div>
                                {answerPart && (
                                  <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Đáp án chuẩn: {answerPart}</span>
                                  </div>
                                )}
                                {expPart && (
                                  <div className="text-[11px] text-slate-600 leading-relaxed pl-5 bg-white/70 p-2 rounded-lg border border-slate-100">
                                    <span className="font-semibold text-amber-700">Quy chuẩn SOP:</span> {expPart}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Cẩm Nang SOP Chi Tiết */}
                    {playerTab === 'handbook' && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                        <div className="border-b border-slate-100 pb-3">
                          <span className="text-[10px] font-bold uppercase text-purple-700 font-mono">Quy Chuẩn Thao Tác Chuẩn (SOP)</span>
                          <h4 className="font-bold text-sm text-slate-900 mt-0.5">{activeModule.title}</h4>
                        </div>

                        {activeModule.keyTakeaways && activeModule.keyTakeaways.length > 0 && (
                          <div className="space-y-2 bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                            <h5 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-600" />
                              <span>Các Điểm Cốt Lõi Bắt Buộc Nhớ:</span>
                            </h5>
                            <ul className="space-y-1.5 text-xs text-amber-950">
                              {activeModule.keyTakeaways.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {activeModule.steps && activeModule.steps.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="font-bold text-xs text-slate-800">Quy Trình Các Bước Thực Hiện:</h5>
                            <div className="space-y-2">
                              {activeModule.steps.map((step, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium flex items-start gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="mt-0.5">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 5: Ghi Chú Cá Nhân */}
                    {playerTab === 'notes' && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4 text-cyan-600" />
                            <span>Ghi chú của bạn cho bài học này:</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">Tự động lưu vào máy</span>
                        </div>

                        <textarea
                          rows={6}
                          placeholder="Viết lại những lưu ý nghiệp vụ, mẹo xử lý hoặc câu hỏi cần hỏi Quản lý ca trực..."
                          value={personalNotes[activeModule.id] || ''}
                          onChange={(e) => handleSaveNote(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition"
                        />
                      </div>
                    )}

                    {/* Tab 6: Hỏi Trợ Lý AI */}
                    {playerTab === 'ai' && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm flex flex-col h-[380px]">
                        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span>Hỏi Đáp Nghiệp Vụ Khóa Học</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Được tối ưu theo quy chuẩn rạp</span>
                        </div>

                        {/* Chat conversation area */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                          {aiChatLog.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                                msg.sender === 'user'
                                  ? 'ml-auto bg-amber-500 text-slate-950 font-semibold'
                                  : 'bg-purple-50 text-purple-950 border border-purple-100'
                              }`}
                            >
                              {msg.text}
                            </div>
                          ))}
                          {isAiAnswering && (
                            <div className="p-3 bg-purple-50 text-purple-900 rounded-2xl border border-purple-100 text-xs italic flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
                              <span>Đang tra cứu tiêu chuẩn vận hành rạp...</span>
                            </div>
                          )}
                        </div>

                        {/* Input bar */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <input
                            type="text"
                            placeholder="Nhập thắc mắc về bài giảng này (ví dụ: 'Xử lý khi bắp bị cháy?')..."
                            value={aiQuestion}
                            onChange={(e) => setAiQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <button
                            onClick={handleAskAi}
                            disabled={isAiAnswering || !aiQuestion.trim()}
                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-500 text-xs">Vui lòng chọn bài giảng bên phải</div>
                )}

                {/* Footer Controls */}
                {activeModule && (() => {
                  const currentProg = getModuleProgress(selectedCourse.id, activeModule.id, activeModule.isCompleted);

                  return (
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                      <div>
                        {selectedCourse.modules.every(m => m.isCompleted) && onNavigateToQuiz ? (
                          <button
                            onClick={() => {
                              setSelectedCourse(null);
                              onNavigateToQuiz();
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                          >
                            <GraduationCap className="w-4 h-4 text-slate-950" />
                            <span>Làm Bài Kiểm Tra Nhận Chứng Chỉ ➔</span>
                          </button>
                        ) : (
                          <div className="text-xs text-slate-500 font-medium">
                            Hoàn thành tất cả các bài để mở khóa bài kiểm tra cấp Chứng chỉ Điện tử.
                          </div>
                        )}
                      </div>

                      {currentProg.isCompleted || activeModule.isCompleted ? (
                        <div className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Bài Này Đã Hoàn Thành 100% (Đạt Test 10 Câu)</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSwitchTab('mini_quiz')}
                          className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow-md flex items-center gap-2 transition cursor-pointer"
                        >
                          <FileQuestion className="w-4 h-4 text-amber-200" />
                          <span>
                            {currentProg.videoPercent >= 50
                              ? 'Làm Bài Test 10 Câu Để Hoàn Thành Bài ➔'
                              : 'Xem Video & Làm Bài Test 10 Câu'}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right Modules Playlist */}
              <div className="w-full md:w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                    Nội dung khóa học ({selectedCourse.modules.length} bài)
                  </h4>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Đã hoàn thành {selectedCourse.modules.filter(m => m.isCompleted).length}/{selectedCourse.modules.length} bài
                  </div>
                </div>

                <div className="space-y-2.5">
                  {selectedCourse.modules.map((m, idx) => {
                    const isSelected = activeModule?.id === m.id;
                    const unlocked = isModuleUnlocked(idx);
                    const modProg = getModuleProgress(selectedCourse.id, m.id, m.isCompleted);

                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectModule(m, idx)}
                        className={`w-full text-left p-3 rounded-2xl border text-xs transition flex flex-col gap-2 ${
                          !unlocked
                            ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-80'
                            : isSelected
                            ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold ring-1 ring-amber-300 shadow-2xs cursor-pointer'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer'
                        }`}
                        title={
                          !unlocked
                            ? `Khóa: Cần hoàn thành Bài ${idx} và vượt qua bài test 10 câu để mở khóa bài này`
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between w-full">
                          <div className="space-y-0.5 pr-2">
                            <div className="text-[10px] font-mono font-bold flex items-center gap-1.5">
                              <span className={unlocked ? 'text-amber-800' : 'text-slate-400'}>
                                Bài {idx + 1}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">{m.duration}</span>
                            </div>
                            <div className={`line-clamp-2 leading-tight ${unlocked ? 'text-slate-900' : 'text-slate-400'}`}>
                              {m.title}
                            </div>
                          </div>

                          {!unlocked ? (
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5" title="Đang khóa">
                              <Lock className="w-3 h-3" />
                            </span>
                          ) : modProg.isCompleted || m.isCompleted ? (
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5" title="Đã hoàn thành">
                              <Check className="w-3 h-3 text-emerald-700 font-bold" />
                            </span>
                          ) : (
                            <PlayCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                        </div>

                        {/* Thanh phần trăm ở mỗi bài */}
                        <div className="w-full pt-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className={modProg.isCompleted || m.isCompleted ? 'text-emerald-700 font-bold' : unlocked ? 'text-amber-800 font-semibold' : 'text-slate-400'}>
                              {modProg.isCompleted || m.isCompleted ? '✓ Hoàn thành 100%' : `${modProg.totalPercent}%`}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {unlocked ? `Video: ${modProg.videoPercent}% • Test: ${modProg.testPercent}%` : '🔒 Chưa mở'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-amber-500 transition-all duration-300"
                              style={{ width: `${modProg.videoPercent}%` }}
                            />
                            <div
                              className="h-full bg-purple-600 transition-all duration-300"
                              style={{ width: `${modProg.testPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO KHI ĐANG TEST MÀ THOÁT RA KHỎI MODAL HOẶC ĐỔI TAB */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-300 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Cảnh Báo: Hủy Kết Quả Bài Test!
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Bạn đang làm bài kiểm tra 10 câu. Theo quy định của rạp, nếu bạn <strong>thoát ra ngoài (out bài test)</strong>, toàn bộ câu trả lời đang làm sẽ bị <strong>HỦY</strong> và bạn bắt buộc phải làm lại từ đầu từ <strong>Câu 1</strong> khi quay lại!
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  setPendingExitAction(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Ở Lại Làm Bài Tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  if (pendingExitAction) {
                    pendingExitAction();
                    setPendingExitAction(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                Xác Nhận Thoát & Làm Lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Thông Báo Nổi */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[80] p-4 bg-slate-900 text-white border border-amber-500/50 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
