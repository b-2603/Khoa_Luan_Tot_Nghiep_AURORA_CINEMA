import React, { useState, useEffect } from 'react';
import { User, Quiz, QuizAttempt } from '../types';
import { getQuizzes, saveQuizAttempt, saveCertificate } from '../services/storage';
import { fetchQuizzes, submitQuizAttemptApi, saveCertificateApi } from '../services/apiClient';
import { 
  FileCheck, Clock, Award, CheckCircle2, XCircle, Search, BookOpen, 
  ArrowRight, RotateCcw, AlertCircle, Eye, Check, ChevronRight, ChevronLeft, 
  HelpCircle, Sparkles, Filter
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
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const [showDetailedReview, setShowDetailedReview] = useState(false);

  useEffect(() => {
    fetchQuizzes().then(data => {
      if (data && data.length > 0) setQuizzes(data);
    });
  }, []);

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

  const handleStartQuiz = (q: Quiz) => {
    setActiveQuiz(q);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setTimeLeft(q.durationMinutes * 60);
    setResult(null);
    setShowSubmitWarning(false);
    setShowDetailedReview(false);
  };

  const handleSelectAnswer = (qId: string, optionIdx: number) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleRequestSubmit = () => {
    if (!activeQuiz) return;
    const answeredCount = activeQuiz.questions.filter(q => answers[q.id] !== undefined).length;
    if (answeredCount < activeQuiz.questions.length) {
      setShowSubmitWarning(true);
    } else {
      handleFinishQuizDirect();
    }
  };

  const handleFinishQuizDirect = () => {
    if (!activeQuiz) return;
    setShowSubmitWarning(false);

    let correctCount = 0;
    activeQuiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswerIndex) {
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
        ? `Xuất sắc! Bạn đã trả lời đúng ${correctCount}/${totalCount} câu hỏi (${score}/100 điểm) và vượt qua bài sát hạch nghiệp vụ Aurora Standard!`
        : `Điểm số ${score}/100 (${correctCount}/${totalCount} câu đúng) chưa đạt ngưỡng yêu cầu ${activeQuiz.passScore}%. Hãy xem lại lời giải chi tiết và ôn tập quy trình trước khi thi lại.`,
      answers
    };

    saveQuizAttempt(attempt);
    setResult(attempt);

    if (passed) {
      const certCode = `AURORA-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const newCert = {
        id: `cert-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userStaffCode: currentUser.staffCode,
        courseId: activeQuiz.courseId,
        courseTitle: activeQuiz.courseTitle,
        certificateCode: certCode,
        issuedAt: new Date().toISOString().split('T')[0],
        score,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${certCode}`
      };

      // 1. Lưu local storage
      saveCertificate(newCert);

      // 2. Lưu trực tiếp vào MySQL backend (POST /certificates)
      saveCertificateApi(newCert).catch(() => {});

      // 3. Đồng bộ attempt vào MySQL database với đúng currentUser.id
      submitQuizAttemptApi(activeQuiz.id, answers, currentUser.id, certCode, score).catch(() => {});

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    } else {
      submitQuizAttemptApi(activeQuiz.id, answers, currentUser.id, undefined, score).catch(() => {});
    }
  };

  const jumpToFirstUnanswered = () => {
    if (!activeQuiz) return;
    const firstUnanswered = activeQuiz.questions.findIndex(q => answers[q.id] === undefined);
    if (firstUnanswered >= 0) {
      setCurrentQuestionIdx(firstUnanswered);
    }
    setShowSubmitWarning(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredQuizzes = quizzes.filter(q => {
    const matchSearch = q.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
                        q.courseTitle.toLowerCase().includes(searchFilter.toLowerCase());
    if (selectedTag === 'ctkm') return matchSearch && q.isCtkm;
    if (selectedTag === 'operation') return matchSearch && !q.isCtkm;
    return matchSearch;
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
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Chuẩn 30 Câu/Đề
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Hệ thống 8 bộ đề thi trắc nghiệm nghiệp vụ toàn diện 2026, mỗi đề gồm đúng 30 câu hỏi tình huống thực tế</p>
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
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
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

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setSelectedTag('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  selectedTag === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Tất cả ({quizzes.length} bài)
              </button>
              <button
                onClick={() => setSelectedTag('operation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  selectedTag === 'operation'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Nghiệp Vụ SOP Rạp (7)
              </button>
              <button
                onClick={() => setSelectedTag('ctkm')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  selectedTag === 'ctkm'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                }`}
              >
                CTKM & VIP Loyalty (1)
              </button>
            </div>
          </div>

          {/* Grid of Quizzes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredQuizzes.map((quiz, idx) => (
              <div 
                key={quiz.id} 
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-lg rounded-3xl p-5 space-y-4 transition flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide border ${
                      quiz.isCtkm 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {quiz.isCtkm ? 'CTKM Hàng Tháng' : `Bài Thi 0${idx + 1}`}
                    </span>
                    <div className="p-2.5 bg-slate-50 group-hover:bg-amber-50 border border-slate-200 group-hover:border-amber-300 rounded-xl text-slate-700 shrink-0 transition">
                      <FileCheck className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>

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

                <div className="space-y-3 pt-3 border-t border-slate-100">
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

                  <button
                    onClick={() => handleStartQuiz(quiz)}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Bắt Đầu Thi (30 Câu)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Quiz Runner (Modern 30-Question Experience) */}
      {activeQuiz && !result && (
        <div className="space-y-5">
          {/* Top Sticky Header */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  ĐANG LÀM BÀI SÁT HẠCH
                </span>
                <span className="text-xs text-slate-500">
                  Câu {currentQuestionIdx + 1} / {totalQuestions}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900">{activeQuiz.title}</h3>
            </div>

            <div className="flex items-center gap-4 self-end md:self-auto">
              {/* Progress Summary */}
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-700">Tiến độ hoàn thành</div>
                <div className="text-xs font-extrabold text-amber-600">{answeredCount}/{totalQuestions} câu ({progressPercent}%)</div>
              </div>

              {/* Countdown Timer */}
              <div className={`px-4 py-2 rounded-2xl border font-mono font-extrabold text-sm flex items-center gap-2 shadow-2xs ${
                timeLeft < 180 
                  ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' 
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{formatTimer(timeLeft)}</span>
              </div>

              <button
                onClick={handleRequestSubmit}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Nộp Bài</span>
              </button>
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Main 2-Column Area: Left Question Runner, Right 30-Question Palette */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Question Box */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              {activeQuiz.questions[currentQuestionIdx] && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      CÂU HỎI SỐ {currentQuestionIdx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {answers[activeQuiz.questions[currentQuestionIdx].id] !== undefined ? '✓ Đã chọn đáp án' : '⚪ Chưa trả lời'}
                    </span>
                  </div>

                  <div className="text-sm md:text-base font-extrabold text-slate-900 leading-relaxed p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-2xl">
                    {activeQuiz.questions[currentQuestionIdx].questionText}
                  </div>

                  <div className="space-y-3">
                    {activeQuiz.questions[currentQuestionIdx].options.map((opt, optIdx) => {
                      const qId = activeQuiz.questions[currentQuestionIdx].id;
                      const isSelected = answers[qId] === optIdx;

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectAnswer(qId, optIdx)}
                          className={`w-full text-left p-4 rounded-2xl border text-xs md:text-sm font-medium transition flex items-center gap-3.5 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-xs ring-2 ring-amber-400/40'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                            isSelected ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-relaxed">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Nav Controls */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                <button
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu Trước</span>
                </button>

                <div className="text-xs text-slate-400 font-medium">
                  {currentQuestionIdx + 1} / {totalQuestions}
                </div>

                {currentQuestionIdx < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Câu Tiếp Theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleRequestSubmit}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Hoàn Thành & Nộp Bài</span>
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Question Palette (30-Question Matrix) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 md:p-6 space-y-4 shadow-sm sticky top-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Ma Trận 30 Câu Hỏi</span>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {answeredCount}/{totalQuestions} đã làm
                </div>
              </div>

              {/* Grid 30 questions */}
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
                {activeQuiz.questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = currentQuestionIdx === idx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-9 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center relative ${
                        isCurrent
                          ? 'ring-2 ring-amber-500 ring-offset-2 scale-105 z-10 ' + (isAnswered ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-white')
                          : isAnswered
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title={`Câu ${idx + 1}: ${isAnswered ? 'Đã trả lời' : 'Chưa trả lời'}`}
                    >
                      <span>{idx + 1}</span>
                      {isAnswered && !isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-300" />
                  <span>Đã làm ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-50 border border-slate-200" />
                  <span>Chưa làm ({totalQuestions - answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-500" />
                  <span>Đang xem</span>
                </div>
              </div>

              <button
                onClick={handleRequestSubmit}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <Check className="w-4 h-4" />
                <span>Nộp Bài Thi Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Warning Modal */}
      {showSubmitWarning && activeQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-base text-slate-900">Bạn Vẫn Còn Câu Hỏi Chưa Làm!</h4>
              <p className="text-xs text-slate-500">
                Bạn mới trả lời <span className="font-bold text-amber-600">{answeredCount}/{totalQuestions} câu</span>. Còn <span className="font-bold text-red-600">{totalQuestions - answeredCount} câu</span> chưa chọn đáp án. Bạn có muốn làm tiếp để đạt điểm cao hơn?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={jumpToFirstUnanswered}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Làm Tiếp Các Câu Chưa Trả Lời ➔
              </button>
              <button
                onClick={handleFinishQuizDirect}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tôi Vẫn Muốn Nộp Bài Luôn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result View & Full 30-Question Review */}
      {result && activeQuiz && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 text-center shadow-xl">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
              result.passed ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-600' : 'bg-red-50 border-2 border-red-300 text-red-600'
            }`}>
              {result.passed ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div>
              <h3 className="font-black text-xl text-slate-900">
                {result.passed ? 'CHÚC MỪNG! BẠN ĐÃ ĐẠT BÀI ĐÁNH GIÁ 🎉' : 'BÀI ĐÁNH GIÁ CHƯA ĐẠT KẾT QUẢ'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{result.quizTitle}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Tổng điểm</div>
                <div className="text-3xl font-black text-amber-600 mt-1">{result.score} / 100</div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Số câu đúng</div>
                <div className="text-3xl font-black text-emerald-600 mt-1">
                  {Math.round((result.score / 100) * result.totalQuestions)} / {result.totalQuestions}
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-slate-400">Điểm tối thiểu</div>
                <div className="text-3xl font-black text-slate-700 mt-1">{activeQuiz.passScore}%</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-medium max-w-lg mx-auto bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
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
                <span>Bạn có thể xem lại đáp án chi tiết và ôn tập quy trình trước khi đăng ký thi lại.</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDetailedReview(prev => !prev)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>{showDetailedReview ? 'Thu Gọn Đáp Án' : `Xem Lời Giải Chi Tiết ${result.totalQuestions} Câu`}</span>
              </button>

              <button
                onClick={() => { setActiveQuiz(null); setResult(null); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Về Danh Sách Bài Thi
              </button>

              {result.passed && onNavigateToCertificates && (
                <button
                  onClick={onNavigateToCertificates}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Xem Chứng Chỉ Của Tôi ➔</span>
                </button>
              )}

              {!result.passed && (
                <button
                  onClick={() => handleStartQuiz(activeQuiz)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-slate-950" />
                  <span>Thi Lại Đề Này (30 Câu)</span>
                </button>
              )}
            </div>
          </div>

          {/* Detailed Question Review Breakdown */}
          {showDetailedReview && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-extrabold text-base text-slate-900">Đáp Án Chi Tiết & Lời Giải Chuẩn SOP</h4>
                  <p className="text-xs text-slate-500">Đối chiếu câu trả lời của bạn với tiêu chuẩn vận hành chính thức của Aurora Cinema</p>
                </div>
                <div className="text-xs font-bold text-slate-600 px-3 py-1 bg-slate-100 rounded-xl">
                  {result.totalQuestions} Câu Hỏi
                </div>
              </div>

              <div className="space-y-5">
                {activeQuiz.questions.map((q, idx) => {
                  const userAns = answers[q.id];
                  const isCorrect = userAns === q.correctAnswerIndex;

                  return (
                    <div 
                      key={q.id} 
                      className={`p-5 rounded-2xl border space-y-3.5 ${
                        isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs md:text-sm font-extrabold text-slate-900 leading-snug">
                          <span className="font-mono text-amber-700 mr-1.5">Câu {idx + 1}:</span>
                          {q.questionText}
                        </div>
                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${
                          isCorrect 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{isCorrect ? 'Chính Xác' : 'Chưa Đúng'}</span>
                        </span>
                      </div>

                      {/* Options breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, optIdx) => {
                          const isUserChoice = userAns === optIdx;
                          const isRightAnswer = optIdx === q.correctAnswerIndex;

                          let optionStyle = 'bg-white border-slate-200 text-slate-600';
                          if (isRightAnswer) {
                            optionStyle = 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold ring-1 ring-emerald-300';
                          } else if (isUserChoice && !isRightAnswer) {
                            optionStyle = 'bg-red-100 border-red-400 text-red-950 font-bold line-through';
                          }

                          return (
                            <div 
                              key={optIdx} 
                              className={`p-3 rounded-xl border flex items-center gap-2.5 ${optionStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="leading-tight flex-1">{opt}</span>
                              {isRightAnswer && <span className="text-[10px] text-emerald-700 font-extrabold shrink-0">✓ Đáp án chuẩn</span>}
                              {isUserChoice && !isRightAnswer && <span className="text-[10px] text-red-700 font-extrabold shrink-0">✗ Bạn đã chọn</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box */}
                      {q.explanation && (
                        <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                          <div className="font-extrabold text-[11px] text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Quy Chuẩn Nghiệp Vụ Aurora SOP:</span>
                          </div>
                          <p className="leading-relaxed text-slate-600 pl-5">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
