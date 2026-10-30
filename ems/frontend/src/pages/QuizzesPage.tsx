import React, { useState, useEffect, useRef } from 'react';
import { User, Quiz, QuizAttempt } from '../types';
import { getQuizzes, saveQuizAttempt, saveCertificate, getCertificates, getQuizAttempts } from '../services/storage';
import { fetchQuizzes, submitQuizAttemptApi, saveCertificateApi } from '../services/apiClient';
import { 
  FileCheck, Clock, Award, CheckCircle2, XCircle, Search, BookOpen, 
  ArrowRight, RotateCcw, AlertCircle, Eye, Check, ChevronRight, ChevronLeft, 
  HelpCircle, Sparkles, Filter, Lock, Calendar, ShieldCheck, Maximize, Minimize, ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizzesPageProps {
  currentUser: User;
  onNavigateToCertificates?: () => void;
  onNavigateToCourses?: () => void;
}

export const QuizzesPage: React.FC<QuizzesPageProps> = ({ 
  currentUser, 
  onNavigateToCertificates, 
  onNavigateToCourses 
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>(getQuizzes());
  const [attempts, setAttempts] = useState<QuizAttempt[]>(getQuizAttempts());
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unattempted' | 'completed'>('all');
  const [selectedCompletedAttempt, setSelectedCompletedAttempt] = useState<{ quiz: Quiz; attempt: QuizAttempt } | null>(null);

  // Fullscreen and anti-cheat tracking state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Keep a ref of latest answers for timer auto-submit callback
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    fetchQuizzes().then(data => {
      if (data && data.length > 0) setQuizzes(data);
    });
    setAttempts(getQuizAttempts());
  }, []);

  // Fullscreen event listener: lock fullscreen during exam
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Disqualify and fail exam when leaving tab 3 times
  const handleDisqualifyQuiz = (reason?: string) => {
    if (!activeQuiz) return;

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}

    const defaultMsg = 'BÀI THI BỊ ĐÌNH CHỈ & ĐÁNH RỚT (0 ĐIỂM): Bạn đã vi phạm quy chế thi do rời màn hình / chuyển tab 3 lần. Toàn bộ kết quả bị hủy. Nhân viên bắt buộc phải thi lại từ đầu!';

    const attempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      userId: currentUser.id,
      userName: currentUser.name,
      score: 0,
      totalQuestions: activeQuiz.questions.length,
      passed: false,
      completedAt: new Date().toISOString().split('T')[0],
      feedback: reason || defaultMsg,
      answers: answersRef.current
    };

    saveQuizAttempt(attempt);
    setAttempts(getQuizAttempts());
    setResult(attempt);
    submitQuizAttemptApi(activeQuiz.id, answersRef.current, currentUser.id, undefined, 0).catch(() => {});
  };

  // Anti-cheat tab switch & window blur monitoring: Max 3 violations -> Disqualified (Rớt thi lại)
  useEffect(() => {
    if (!activeQuiz || result) return;

    let lastRecorded = 0;
    const recordViolation = () => {
      const now = Date.now();
      if (now - lastRecorded < 1200) return; // Debounce 1.2s to prevent duplicate triggers
      lastRecorded = now;

      setTabSwitchWarning(prev => {
        const next = prev + 1;
        if (next >= 3) {
          handleDisqualifyQuiz();
        }
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation();
      }
    };

    const handleWindowBlur = () => {
      recordViolation();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Bạn đang trong ca thi trực tuyến. Nếu thoát trình duyệt, bài thi sẽ bị hủy!';
      return e.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeQuiz, result]);

  // Exam countdown timer: MUST wait until timeLeft <= 1 to automatically submit & exit
  useEffect(() => {
    if (!activeQuiz || result || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishQuizDirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuiz, result, timeLeft]);

  // Format date helper: DD/MM/YYYY
  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Monthly test expiration deadline helper
  const getMonthlyDeadline = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dayStr = String(lastDay.getDate()).padStart(2, '0');
    const monthStr = String(lastDay.getMonth() + 1).padStart(2, '0');
    const yearStr = lastDay.getFullYear();
    const deadlineDateStr = `${dayStr}/${monthStr}/${yearStr}`;
    
    const endOfMonth = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59);
    const diffMs = endOfMonth.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    return {
      dateStr: deadlineDateStr,
      timeStr: '23:59',
      fullStr: `23:59 ngày ${deadlineDateStr}`,
      daysLeft
    };
  };

  // Find user attempt or certificate for a quiz
  const getUserAttemptForQuiz = (quiz: Quiz): QuizAttempt | null => {
    // 1. In local attempts
    const found = attempts
      .filter(a => (a.userId === currentUser.id || a.userName === currentUser.name) && a.quizId === quiz.id)
      .sort((a, b) => b.score - a.score)[0];
    if (found) return found;

    // 2. In certificates as fallback
    const certs = getCertificates();
    const foundCert = certs.find(c =>
      (c.userId === currentUser.id || c.userName === currentUser.name) &&
      (c.courseId === quiz.courseId || c.courseTitle === quiz.courseTitle)
    );
    if (foundCert) {
      return {
        id: foundCert.id,
        quizId: quiz.id,
        quizTitle: quiz.title,
        userId: currentUser.id,
        userName: currentUser.name,
        score: foundCert.score || 85,
        totalQuestions: quiz.questions.length,
        passed: true,
        completedAt: foundCert.issuedAt,
        feedback: `Đã hoàn thành đạt chuẩn sát hạch định kỳ Aurora Cinema với điểm số ${foundCert.score || 85}/100.`,
        answers: {}
      };
    }
    return null;
  };

  // Enter quiz in Fullscreen mode (If previously passed, only view score. If failed, can retake!)
  const handleStartQuiz = (q: Quiz) => {
    const existing = getUserAttemptForQuiz(q);
    if (existing && existing.passed) {
      setSelectedCompletedAttempt({ quiz: q, attempt: existing });
      return;
    }

    setActiveQuiz(q);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setTimeLeft(q.durationMinutes * 60);
    setResult(null);
    setTabSwitchWarning(0);

    // Request browser fullscreen mode
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  // Re-request fullscreen if accidentally exited
  const handleRequestFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const handleSelectAnswer = (qId: string, optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleRequestSubmit = () => {
    if (!activeQuiz) return;
    setShowConfirmSubmit(true);
  };

  // Automatic submission when timer expires or manual submit
  const handleFinishQuizDirect = () => {
    if (!activeQuiz) return;
    setShowConfirmSubmit(false);

    // Exit browser fullscreen mode
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}

    const currentAns = answersRef.current;
    let correctCount = 0;
    activeQuiz.questions.forEach(q => {
      if (currentAns[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const totalCount = activeQuiz.questions.length || 1;
    const score = Math.round((correctCount / totalCount) * 100);
    const passed = score >= activeQuiz.passScore;

    const attempt: QuizAttempt = {
      id: `att-${Date.now()}`,
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      userId: currentUser.id,
      userName: currentUser.name,
      score,
      totalQuestions: totalCount,
      passed,
      completedAt: new Date().toISOString().split('T')[0],
      feedback: passed
        ? `Xuất sắc! Hết giờ làm bài, hệ thống đã tự động thu bài và ghi nhận bạn đạt ${score}/100 điểm (${correctCount}/${totalCount} câu đúng). Vượt qua bài sát hạch định kỳ Aurora Standard!`
        : `Hết giờ làm bài! Điểm số đạt ${score}/100 (${correctCount}/${totalCount} câu đúng) chưa đạt ngưỡng chuẩn ${activeQuiz.passScore}%. Bạn cần ôn tập và đăng ký thi lại.`,
      answers: currentAns
    };

    saveQuizAttempt(attempt);
    setAttempts(getQuizAttempts());
    setResult(attempt);

    if (passed) {
      const certCode = `AURORA-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const newCert = {
        id: `cert-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userStaffCode: (currentUser.phone && currentUser.phone.trim()) || (currentUser.staffCode && !currentUser.staffCode.startsWith('AR-') ? currentUser.staffCode : '0395852972'),
        courseId: activeQuiz.courseId,
        courseTitle: activeQuiz.courseTitle,
        certificateCode: certCode,
        issuedAt: new Date().toISOString().split('T')[0],
        score,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${certCode}`
      };

      saveCertificate(newCert);
      saveCertificateApi(newCert).catch(() => {});
      submitQuizAttemptApi(activeQuiz.id, currentAns, currentUser.id, certCode, score).catch(() => {});

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    } else {
      submitQuizAttemptApi(activeQuiz.id, currentAns, currentUser.id, undefined, score).catch(() => {});
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Status statistics
  const quizzesWithStatus = quizzes.map(q => ({
    quiz: q,
    attempt: getUserAttemptForQuiz(q)
  }));
  const totalCount = quizzes.length;
  const completedCount = quizzesWithStatus.filter(x => !!x.attempt && x.attempt.passed).length;
  const unattemptedCount = totalCount - completedCount;
  const deadline = getMonthlyDeadline();

  // Filter quizzes according to status, category, and search query
  const filteredQuizzes = quizzes.filter(quiz => {
    const attempt = getUserAttemptForQuiz(quiz);
    const isCompleted = !!attempt && attempt.passed;

    if (statusFilter === 'unattempted' && isCompleted) return false;
    if (statusFilter === 'completed' && !isCompleted) return false;

    const matchSearch = quiz.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
                        quiz.courseTitle.toLowerCase().includes(searchFilter.toLowerCase());
    if (!matchSearch) return false;

    if (selectedTag === 'ctkm') return quiz.isCtkm;
    if (selectedTag === 'operation') return !quiz.isCtkm;
    return true;
  });

  const totalQuestions = activeQuiz ? activeQuiz.questions.length : 0;
  const answeredCount = activeQuiz ? activeQuiz.questions.filter(q => answers[q.id] !== undefined).length : 0;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Kiểm Tra Đánh Giá Nghiệp Vụ Rạp Phim</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
              Định Kỳ Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá kiến thức định kỳ bắt buộc dành cho nhân viên vận hành rạp Aurora Cinema.
          </p>
        </div>

        {onNavigateToCourses && (
          <button
            onClick={onNavigateToCourses}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center gap-2 self-start cursor-pointer shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Xem Thư Viện Khóa Học</span>
          </button>
        )}
      </div>

      {/* Quiz List View */}
      {!activeQuiz && (
        <div className="space-y-4">
          {/* Main Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            {/* Row 1: Search and Status Filter */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm bài thi theo tên hoặc chuyên môn (Bắp nước, Vé, PCCC, Kỹ thuật)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Status Filter Tabs (Đã làm / Chưa làm / Tất cả) */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl shrink-0 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tất Cả ({totalCount})</span>
                </button>

                <button
                  onClick={() => setStatusFilter('unattempted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    statusFilter === 'unattempted'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-amber-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chưa Làm</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    statusFilter === 'unattempted' ? 'bg-amber-600/30 text-slate-950' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {unattemptedCount}
                  </span>
                </button>

                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Đã Hoàn Thành</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    statusFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {completedCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Row 2: Secondary Category Tags */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Chuyên môn:</span>
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    selectedTag === 'all'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Tất cả ({quizzes.length})
                </button>
                <button
                  onClick={() => setSelectedTag('operation')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    selectedTag === 'operation'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Nghiệp Vụ SOP Rạp (7)
                </button>
                <button
                  onClick={() => setSelectedTag('ctkm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                    selectedTag === 'ctkm'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                  }`}
                >
                  CTKM & VIP Loyalty (1)
                </button>
              </div>

              {/* Monthly Deadline Banner for Uncompleted Quizzes */}
              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Hạn chót tháng này: <strong>{deadline.fullStr}</strong> (Còn {deadline.daysLeft} ngày)</span>
              </div>
            </div>
          </div>

          {/* Grid of Quizzes */}
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-800">Không tìm thấy bài thi nào phù hợp</h4>
              <p className="text-xs text-slate-500">
                Hãy thử thay đổi bộ lọc trạng thái (Đã làm / Chưa làm) hoặc từ khóa tìm kiếm.
              </p>
              <button
                onClick={() => { setStatusFilter('all'); setSelectedTag('all'); setSearchFilter(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Đặt Lại Bộ Lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredQuizzes.map((quiz, idx) => {
                const userAttempt = getUserAttemptForQuiz(quiz);
                const isCompleted = !!userAttempt && userAttempt.passed;
                const isFailed = !!userAttempt && !userAttempt.passed;

                return (
                  <div 
                    key={quiz.id} 
                    className={`bg-white border rounded-3xl p-5 space-y-4 transition flex flex-col justify-between group ${
                      isCompleted 
                        ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md bg-gradient-to-b from-white to-emerald-50/20' 
                        : isFailed
                          ? 'border-red-200 hover:border-red-400 hover:shadow-md bg-gradient-to-b from-white to-red-50/20'
                          : 'border-slate-200 hover:border-amber-400 hover:shadow-lg'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide border ${
                            quiz.isCtkm 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {quiz.isCtkm ? 'CTKM Hàng Tháng' : `Bài Thi 0${idx + 1}`}
                          </span>

                          {/* Status Badge */}
                          {isCompleted ? (
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ĐÃ ĐẠT</span>
                            </span>
                          ) : isFailed ? (
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>CHƯA ĐẠT</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>CHƯA LÀM</span>
                            </span>
                          )}
                        </div>

                        <div className={`p-2.5 border rounded-xl shrink-0 transition ${
                          isCompleted
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isFailed
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-slate-50 group-hover:bg-amber-50 border-slate-200 group-hover:border-amber-300 text-slate-700'
                        }`}>
                          {isCompleted ? (
                            <Award className="w-5 h-5 text-emerald-600" />
                          ) : isFailed ? (
                            <RotateCcw className="w-5 h-5 text-red-600" />
                          ) : (
                            <FileCheck className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                      </div>

                      {/* Title & Course */}
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-amber-700 transition">
                          {quiz.title}
                        </h3>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{quiz.courseTitle}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status & Actions */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      {/* CASE 1: ĐÃ CÓ KẾT QUẢ THI (ĐÃ ĐẠT HOẶC CHƯA ĐẠT) */}
                      {userAttempt ? (
                        <div className="space-y-2.5">
                          {/* Score Result Box */}
                          <div className={`p-3 border rounded-2xl space-y-1.5 ${
                            userAttempt.passed 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={`text-[11px] font-bold flex items-center gap-1 ${
                                userAttempt.passed ? 'text-emerald-900' : 'text-red-900'
                              }`}>
                                {userAttempt.passed ? (
                                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                )}
                                <span>Điểm Sát Hạch:</span>
                              </span>
                              <span className={`text-sm font-black ${
                                userAttempt.passed ? 'text-emerald-700' : 'text-red-700'
                              }`}>
                                {userAttempt.score}/100đ
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={userAttempt.passed ? 'text-emerald-800' : 'text-red-800'}>
                                Trạng thái: <strong>{userAttempt.passed ? '✓ Đạt Chuẩn' : '✗ Chưa Đạt (Cần thi lại)'}</strong>
                              </span>
                              <span className="text-slate-500">Ngày: {formatDateVN(userAttempt.completedAt)}</span>
                            </div>
                          </div>



                          {/* Action Buttons: Xem Điểm & Thi Lại nếu rớt */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedCompletedAttempt({ quiz, attempt: userAttempt })}
                              className={`py-2.5 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                userAttempt.passed
                                  ? 'w-full bg-slate-900 hover:bg-slate-800 text-amber-400'
                                  : 'flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500" />
                              <span>Xem Điểm ({userAttempt.score}đ)</span>
                            </button>

                            {!userAttempt.passed && (
                              <button
                                onClick={() => handleStartQuiz(quiz)}
                                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-slate-950" />
                                <span>Thi Lại (30 Câu)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* CASE 2: CHƯA LÀM (UNATTEMPTED) */
                        <div className="space-y-2.5">
                          {/* Exam Info */}
                          <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 font-semibold py-1 bg-slate-50 rounded-xl px-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{quiz.durationMinutes}p</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Đạt {quiz.passScore}%</span>
                            </div>
                            <div className="text-right text-amber-700 font-bold">
                              {quiz.questions.length} câu
                            </div>
                          </div>

                          {/* Expiration Deadline Banner */}
                          <div className="p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                                <span>Hạn chót làm bài:</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-950 font-extrabold text-[10px]">
                                Còn {deadline.daysLeft} ngày
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-amber-800 pl-5">
                              {deadline.fullStr}
                            </div>
                          </div>

                          {/* Start Quiz Button (Launches Fullscreen Exam) */}
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>Bắt Đầu Thi (30 Câu - Toàn Màn Hình)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Score Modal for Completed Quizzes (Only displays score & completion status, NO questions/answers) */}
      {selectedCompletedAttempt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border flex items-center gap-1.5 ${
                selectedCompletedAttempt.attempt.passed
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}>
                {selectedCompletedAttempt.attempt.passed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>BÀI THI ĐÃ HOÀN THÀNH - ĐẠT CHUẨN</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>KẾT QUẢ KHÔNG ĐẠT - YÊU CẦU THI LẠI</span>
                  </>
                )}
              </span>
              <button
                onClick={() => setSelectedCompletedAttempt(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                {selectedCompletedAttempt.quiz.title}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedCompletedAttempt.quiz.courseTitle}</span>
              </p>
            </div>

            {/* Score Summary Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 border rounded-2xl text-center ${
                selectedCompletedAttempt.attempt.passed
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-red-50/70 border-red-200'
              }`}>
                <div className="text-[10px] uppercase font-bold text-slate-500">Điểm số đạt được</div>
                <div className={`text-3xl font-black mt-1 ${
                  selectedCompletedAttempt.attempt.passed ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {selectedCompletedAttempt.attempt.score} <span className="text-base font-semibold text-slate-500">/ 100</span>
                </div>
                <div className={`text-[11px] font-bold mt-1 ${
                  selectedCompletedAttempt.attempt.passed ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {selectedCompletedAttempt.attempt.passed ? '✓ Đạt Chuẩn Nghiệp Vụ' : '✗ Chưa Đạt Chuẩn'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1.5">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Ngày nộp bài</div>
                  <div className="text-xs font-black text-slate-800 mt-0.5">
                    {formatDateVN(selectedCompletedAttempt.attempt.completedAt)}
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Yêu cầu đạt</div>
                  <div className="text-xs font-bold text-slate-700">
                    Tối thiểu {selectedCompletedAttempt.quiz.passScore}%
                  </div>
                </div>
              </div>
            </div>

            {/* Official Feedback Note */}
            {selectedCompletedAttempt.attempt.feedback && (
              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                {selectedCompletedAttempt.attempt.feedback}
              </div>
            )}



            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCompletedAttempt(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>

              {!selectedCompletedAttempt.attempt.passed && (
                <button
                  onClick={() => {
                    const q = selectedCompletedAttempt.quiz;
                    setSelectedCompletedAttempt(null);
                    handleStartQuiz(q);
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Đăng Ký Thi Lại Ngay ➔</span>
                </button>
              )}

              {selectedCompletedAttempt.attempt.passed && onNavigateToCertificates && (
                <button
                  onClick={() => {
                    setSelectedCompletedAttempt(null);
                    onNavigateToCertificates();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>Xem Chứng Chỉ Đạt Được ➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE QUIZ RUNNER (STRICT FULLSCREEN, ANTI-CHEAT 3-TIME TAB SWITCH MONITORING) */}
      {activeQuiz && !result && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto select-none font-sans">
          {/* Top Sticky Header */}
          <header className="bg-slate-900/95 border-b border-slate-800 px-4 md:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-lg shadow-inner">
                ★
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse tracking-wide uppercase">
                    ● KHÓA TOÀN MÀN HÌNH
                  </span>
                  <span className="text-xs text-slate-400 font-medium hidden md:inline">
                    {currentUser.name} (Mã SĐT: {(currentUser.phone && currentUser.phone.trim()) || (currentUser.staffCode && !currentUser.staffCode.startsWith('AR-') ? currentUser.staffCode : '0395852972')})
                  </span>
                </div>
                <h2 className="font-extrabold text-sm md:text-base text-white mt-0.5 line-clamp-1">
                  {activeQuiz.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
              {/* Live Anti-Cheat Tab Switch Counter Pill */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-inner ${
                tabSwitchWarning === 0 
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300' 
                  : tabSwitchWarning === 1 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                    : 'bg-red-500/20 border-red-500/60 text-red-300 animate-pulse'
              }`}>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Thoát tab: <strong className={tabSwitchWarning >= 2 ? 'text-red-400 font-black' : 'text-amber-400'}>{tabSwitchWarning}/3</strong> lần</span>
              </div>

              {/* Countdown Timer with Auto-Submit Warning */}
              <div className={`px-4 py-2 rounded-2xl border font-mono font-black text-base flex items-center gap-2.5 shadow-inner ${
                timeLeft < 180 
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <Clock className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">Hết giờ tự nộp & out bài</div>
                  <div className="text-xl leading-none mt-1">{formatTimer(timeLeft)}</div>
                </div>
              </div>



              {/* Early Submit Button */}
              <button
                onClick={handleRequestSubmit}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Nộp Bài</span>
              </button>

              {/* Locked Fullscreen Notice (NO manual minimize allowed!) */}
              <div className="px-3 py-2 rounded-xl bg-slate-800/90 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 select-none">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Khóa Toàn Màn Hình</span>
              </div>
            </div>
          </header>

          {/* Anti-cheat tab switch warning banner (Level 1 and 2 warnings) */}
          {tabSwitchWarning > 0 && tabSwitchWarning < 3 && (
            <div className="bg-red-950/95 border-b-2 border-red-500 text-red-200 px-6 py-3 text-xs flex items-center justify-between z-30 animate-pulse shadow-lg">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <strong className="text-red-300 uppercase tracking-wide">
                    {tabSwitchWarning === 1 ? '⚠️ CẢNH BÁO VI PHẠM LẦN 1/3:' : '🚨 CẢNH BÁO NGUY HIỂM LẦN 2/3:'}
                  </strong>{' '}
                  <span>
                    Hệ thống ghi nhận bạn vừa rời khỏi màn hình làm bài ({tabSwitchWarning}/3 lần). 
                    Theo quy chế thi sát hạch của Aurora Cinema, <strong>thoát tab đủ 3 lần sẽ bị ĐÁNH RỚT (0 điểm)</strong> và bắt buộc phải thi lại từ đầu!
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setTabSwitchWarning(prev => Math.min(prev, 2))} 
                className="px-3 py-1 bg-red-800/80 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer shrink-0 ml-3"
              >
                Tôi Đã Hiểu
              </button>
            </div>
          )}

          {/* Top Progress Line */}
          <div className="w-full bg-slate-800/80 h-1.5 overflow-hidden">
            <div 
              className="bg-amber-400 h-full transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Main Question & Matrix Container */}
          <main className="max-w-7xl mx-auto w-full p-4 md:p-6 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* 3 cols: Question Body */}
            <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl flex flex-col justify-between">
              {activeQuiz.questions[currentQuestionIdx] && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Câu hỏi {currentQuestionIdx + 1} / {totalQuestions}</span>
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      answers[activeQuiz.questions[currentQuestionIdx].id] !== undefined
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {answers[activeQuiz.questions[currentQuestionIdx].id] !== undefined ? '✓ Đã chọn đáp án' : 'Chưa trả lời'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base md:text-lg text-white leading-relaxed">
                    {activeQuiz.questions[currentQuestionIdx].questionText}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3 pt-2">
                    {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                      const isSelected = answers[activeQuiz.questions[currentQuestionIdx].id] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectAnswer(activeQuiz.questions[currentQuestionIdx].id, optIdx)}
                          className={`w-full text-left p-4 rounded-2xl border text-xs md:text-sm font-semibold transition cursor-pointer flex items-center gap-3.5 ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/50 shadow-md'
                              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                            isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </div>
                          <span className="leading-relaxed flex-1">{opt}</span>
                          {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prev/Next Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu Trước</span>
                </button>

                <div className="text-xs text-slate-400 font-bold">
                  Câu {currentQuestionIdx + 1} trên tổng số {totalQuestions} câu
                </div>

                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                  disabled={currentQuestionIdx === totalQuestions - 1}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <span>Câu Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 1 col: Question Quick Jump Matrix Sidebar & Strict Enforcement */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-2xl h-fit">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                  <span>Ma Trận 30 Câu Hỏi</span>
                </h4>
                <span className="text-xs font-black text-amber-400">{answeredCount}/{totalQuestions} đã làm</span>
              </div>

              <div className="grid grid-cols-5 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {activeQuiz.questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIdx;

                  let style = 'bg-slate-800 text-slate-400 hover:bg-slate-700';
                  if (isAnswered) style = 'bg-emerald-500 text-slate-950 font-black';
                  if (isCurrent) style += ' ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900';

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-9 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center ${style}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
                  <span>Đã làm ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700 shrink-0" />
                  <span>Chưa làm ({totalQuestions - answeredCount})</span>
                </div>
              </div>

              {/* Submit Button Under Matrix */}
              <button
                onClick={handleRequestSubmit}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-3"
              >
                <Check className="w-4 h-4" />
                <span>Nộp Bài Thi Ngay</span>
              </button>
            </div>
          </main>



          {/* Mandatory Fullscreen Blocker Modal (Shows if user pressed ESC to minimize before finishing) */}
          {!isFullscreen && (
            <div className="fixed inset-0 z-[10000] bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="bg-slate-900 border-2 border-red-500/70 rounded-3xl p-8 max-w-md w-full space-y-5 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/40">
                  <Maximize className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">YÊU CẦU TOÀN MÀN HÌNH BẮT BUỘC</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Theo quy chế thi sát hạch của Aurora Cinema, bài thi phải duy trì chế độ toàn màn hình liên tục cho đến khi hoàn thành. Bạn không được phép thu nhỏ cửa sổ làm bài trước khi nộp!
                  </p>
                </div>
                <button
                  onClick={handleRequestFullscreen}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Maximize className="w-4 h-4" />
                  <span>Quay Lại Toàn Màn Hình Để Tiếp Tục Làm Bài</span>
                </button>
              </div>
            </div>
          )}

          {/* Confirm Early Submission Modal */}
          {showConfirmSubmit && activeQuiz && (
            <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-white">Xác Nhận Nộp Bài Thi</h4>
                  <p className="text-xs text-slate-300">
                    Bạn đã trả lời <strong className="text-emerald-400">{answeredCount}/{totalQuestions} câu hỏi</strong>.
                  </p>
                  {answeredCount < totalQuestions && (
                    <p className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                      ⚠️ Còn {totalQuestions - answeredCount} câu chưa chọn đáp án. Bạn có chắc muốn nộp bài sớm không?
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 pt-1">
                    Sau khi nộp, hệ thống sẽ lưu điểm chính thức và kết thúc ca thi.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowConfirmSubmit(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Làm Tiếp
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmSubmit(false);
                      handleFinishQuizDirect();
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Xác Nhận Nộp Bài
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULT SCREEN (AUTO-SAVED TO SYSTEM, ONLY DISPLAYS SCORE & STATUS, NO INSIDE QUESTIONS, RETAKE ALLOWED IF FAILED) */}
      {result && activeQuiz && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 text-center shadow-xl">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
              result.passed ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-600' : 'bg-red-50 border-2 border-red-300 text-red-600'
            }`}>
              {result.passed ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div>
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 border ${
                result.passed 
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                  : result.score === 0 
                    ? 'bg-red-100 text-red-900 border-red-300 font-black' 
                    : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {result.score === 0 && !result.passed 
                  ? 'BỊ ĐÌNH CHỈ DO THOÁT TAB QUÁ 3 LẦN • ĐÁNH RỚT THI LẠI' 
                  : 'HẾT GIỜ LÀM BÀI • ĐÃ TỰ ĐỘNG THU BÀI & LƯU HỆ THỐNG'}
              </div>
              <h3 className="font-black text-xl text-slate-900">
                {result.passed ? 'CHÚC MỪNG! BẠN ĐÃ ĐẠT BÀI ĐÁNH GIÁ 🎉' : 'BÀI ĐÁNH GIÁ CHƯA ĐẠT KẾT QUẢ (RỚT)'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{result.quizTitle}</p>
            </div>

            {/* Score Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Tổng điểm</div>
                <div className={`text-3xl font-black mt-1 ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {result.score} / 100
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Số câu đúng</div>
                <div className="text-3xl font-black text-slate-700 mt-1">
                  {Math.round((result.score / 100) * result.totalQuestions)} / {result.totalQuestions}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Điểm tối thiểu</div>
                <div className="text-3xl font-black text-slate-700 mt-1">{activeQuiz.passScore}%</div>
              </div>
            </div>

            <div className={`text-xs font-medium max-w-lg mx-auto p-3.5 rounded-2xl border ${
              result.passed 
                ? 'bg-slate-50 text-slate-600 border-slate-100' 
                : 'bg-red-50 text-red-800 border-red-200 font-semibold leading-relaxed'
            }`}>
              {result.feedback}
            </div>

            {result.passed ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center justify-center gap-2 font-bold max-w-xl mx-auto">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Chứng chỉ điện tử Aurora Certificate đã được cấp tự động kèm mã QR xác thực!</span>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center justify-center gap-2 font-semibold max-w-xl mx-auto">
                <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bài thi chưa đạt hoặc bị đình chỉ. Bạn được phép bấm nút bên dưới để thi lại từ đầu.</span>
              </div>
            )}



            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => { setActiveQuiz(null); setResult(null); }}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Về Danh Sách Bài Thi
              </button>

              {!result.passed && (
                <button
                  onClick={() => {
                    const q = activeQuiz;
                    setResult(null);
                    handleStartQuiz(q);
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-slate-950" />
                  <span>Thi Lại Bài Này Ngay ➔</span>
                </button>
              )}

              {result.passed && onNavigateToCertificates && (
                <button
                  onClick={onNavigateToCertificates}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Xem Chứng Chỉ Của Tôi ➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
