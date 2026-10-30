import React, { useState } from 'react';
import { Course, CourseModule, Quiz, QuizQuestion } from '../types';
import { INITIAL_QUIZZES } from '../services/mockData';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  FileQuestion, 
  Check, 
  X,
  Award,
  BookOpen
} from 'lucide-react';

interface ModuleMiniQuizProps {
  course: Course;
  module: CourseModule;
  moduleIndex: number;
  onPass: (score: number) => void;
  onExit: () => void;
  onRequestNextModule?: () => void;
  hasNextModule?: boolean;
}

export function getModuleQuizQuestions(course: Course, moduleIndex: number): QuizQuestion[] {
  // 1. Tìm trong INITIAL_QUIZZES hoặc localStorage
  let allQuizzes: Quiz[] = INITIAL_QUIZZES;
  try {
    const raw = localStorage.getItem('aurora_ems_quizzes');
    if (raw) allQuizzes = JSON.parse(raw);
  } catch {}

  const matchedQuiz = allQuizzes.find(q => q.courseId === course.id || q.id === course.quizId);

  if (matchedQuiz && matchedQuiz.questions && matchedQuiz.questions.length >= 10) {
    const startIdx = moduleIndex * 10;
    const slice = matchedQuiz.questions.slice(startIdx, startIdx + 10);
    if (slice.length === 10) return slice;
    if (slice.length > 0) return slice;
  }

  // 2. Dự phòng phân tích từ examCheckpoints của khóa học
  if (course.examCheckpoints && course.examCheckpoints.length >= 10) {
    const startIdx = moduleIndex * 10;
    const slice = course.examCheckpoints.slice(startIdx, startIdx + 10);
    return slice.map((cp, idx) => {
      const parts = cp.split(' ➔ Đáp án chuẩn: ');
      const qText = (parts[0] || `Câu hỏi ${startIdx + idx + 1}`).replace(/^Câu \d+:\s*/, '');
      const ansParts = (parts[1] || '').split('. Giải thích SOP: ');
      const correctAns = (ansParts[0] || '').replace(/^\[|\]$/g, '');
      const exp = ansParts[1] || 'Tuân thủ đúng quy chuẩn SOP của rạp Aurora Cinemas.';

      const options = [
        correctAns,
        'Không cần thực hiện theo quy trình chuẩn, linh động theo ca trực',
        'Tùy chỉnh ước lượng bằng mắt của nhân viên trực ca',
        'Bỏ qua bước này nếu rạp đang trong giờ cao điểm đông khách'
      ];

      return {
        id: `gen-${moduleIndex}-${idx}`,
        questionText: qText,
        options,
        correctAnswerIndex: 0,
        explanation: exp
      };
    });
  }

  // 3. Fallback mặc định đủ 10 câu
  return Array.from({ length: 10 }, (_, i) => ({
    id: `fb-${moduleIndex}-${i}`,
    questionText: `Câu ${i + 1}: Quy chuẩn an toàn và thao tác trọng tâm trong ${course.modules[moduleIndex]?.title || 'bài học'} là gì?`,
    options: [
      'Tuân thủ tuyệt đối quy chuẩn SOP vận hành của Aurora Cinemas',
      'Thực hiện theo kinh nghiệm cá nhân không cần quy trình',
      'Chỉ thực hiện khi có quản lý nhắc nhở trực tiếp',
      'Bỏ qua khi rạp đông khách'
    ],
    correctAnswerIndex: 0,
    explanation: 'Mọi nhân viên Aurora Cinemas bắt buộc phải tuân thủ nghiêm ngặt quy trình chuẩn SOP.'
  }));
}

export const ModuleMiniQuiz: React.FC<ModuleMiniQuizProps> = ({
  course,
  module,
  moduleIndex,
  onPass,
  onExit,
  onRequestNextModule,
  hasNextModule = false,
}) => {
  const questions = getModuleQuizQuestions(course, moduleIndex);

  const [isTestStarted, setIsTestStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const answeredCount = Object.keys(selectedAnswers).length;
  const currentQ = questions[currentIdx] || questions[0];

  // Bắt đầu làm bài
  const handleStart = () => {
    setIsTestStarted(true);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setScore(null);
  };

  // Chọn đáp án
  const handleSelectOption = (optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
  };

  // Nộp bài
  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correct++;
      }
    });

    setScore(correct);
    setIsSubmitted(true);

    if (correct >= 8) {
      onPass(correct);
    }
  };

  // Reset test khi out hoặc bấm làm lại (bắt buộc test lại từ đầu)
  const handleRetestFromStart = () => {
    setIsTestStarted(true);
    setIsSubmitted(false);
    setSelectedAnswers({});
    setCurrentIdx(0);
    setScore(null);
  };

  // Xác nhận thoát bài test
  const handleConfirmExit = () => {
    setShowExitModal(false);
    // Bắt buộc reset toàn bộ câu trả lời
    setSelectedAnswers({});
    setCurrentIdx(0);
    setIsTestStarted(false);
    setIsSubmitted(false);
    setScore(null);
    onExit();
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm relative">
      {/* MODAL CẢNH BÁO KHI THOÁT RA KHỎI BÀI TEST */}
      {showExitModal && (
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
                Bạn đang làm bài kiểm tra 10 câu. Theo quy định, nếu bạn <strong>thoát ra ngoài (out bài test)</strong>, toàn bộ câu trả lời đang làm sẽ bị <strong>HỦY</strong> và bạn bắt buộc phải làm lại từ đầu từ <strong>Câu 1</strong> khi quay lại!
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Ở Lại Làm Bài Tiếp
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                Xác Nhận Thoát & Làm Lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MÀN HÌNH CHƯA BẮT ĐẦU TEST */}
      {/* ========================================================================= */}
      {!isTestStarted && !isSubmitted && (
        <div className="text-center py-6 px-4 space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                10 CÂU HỎI TRẮC NGHIỆM
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ĐẠT TỪ 8/10 ĐỂ QUA BÀI
              </span>
            </div>
            <h4 className="text-base font-black text-slate-900 leading-snug">
              Bài Kiểm Tra Củng Cố Kiến Thức (Bài {moduleIndex + 1})
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {module.title}
            </p>
          </div>

          <div className="max-w-md mx-auto p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-left flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-900 leading-relaxed">
              <strong>Quy định bắt buộc:</strong> Khi nhân viên <strong>out bài test</strong> (thoát ra hoặc đổi tab khi chưa nộp bài), toàn bộ câu trả lời sẽ bị hủy và bắt buộc phải <strong>test lại từ đầu</strong> từ Câu 1.
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleStart}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 mx-auto transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Bắt Đầu Làm Bài Test 10 Câu Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MÀN HÌNH ĐANG LÀM BÀI TEST */}
      {/* ========================================================================= */}
      {isTestStarted && !isSubmitted && (
        <div className="space-y-4">
          {/* Header thanh trạng thái bài thi */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-mono font-black text-xs">
                Câu {currentIdx + 1} / {questions.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Đã trả lời: <strong className="text-purple-700">{answeredCount}</strong>/{questions.length} câu
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Thoát bài test (Bắt buộc test lại khi quay lại)"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Thoát bài test</span>
            </button>
          </div>

          {/* Dải số nhảy câu hỏi (Jump bar) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {questions.map((_, i) => {
              const isAnswered = selectedAnswers[i] !== undefined;
              const isCurrent = i === currentIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIdx(i)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center transition cursor-pointer shrink-0 ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-black shadow-xs'
                      : isAnswered
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Khung nội dung câu hỏi */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h5 className="font-extrabold text-sm text-slate-900 leading-snug">
              {currentQ.questionText}
            </h5>

            {/* Danh sách 4 đáp án A, B, C, D */}
            <div className="space-y-2 pt-1">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentIdx] === optIdx;
                const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;

                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold ring-2 ring-purple-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-purple-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {letter}
                    </span>
                    <span className="leading-snug flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Điều hướng Câu trước / Câu tiếp theo / Nộp bài */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Câu Trước</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Câu Tiếp Theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-md ${
                  answeredCount === questions.length
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Nộp Bài Test (10 Câu)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MÀN HÌNH KẾT QUẢ & ĐÁNH GIÁ (SAU KHI NỘP BÀI) */}
      {/* ========================================================================= */}
      {isSubmitted && score !== null && (
        <div className="space-y-4">
          {score >= 8 ? (
            /* TRƯỜNG HỢP 1: ĐẠT (>= 8/10) */
            <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-2 border-emerald-400 rounded-2xl text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Award className="w-8 h-8 text-amber-200" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-200 text-emerald-900 inline-block mb-1">
                  XUẤT SẮC • ĐÃ VƯỢT QUA BÀI TEST!
                </span>
                <h4 className="text-xl font-black text-emerald-950">
                  {score} / 10 Điểm (Đạt {(score / 10) * 100}%)
                </h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                  Bạn đã ghi nhớ sâu toàn bộ nghiệp vụ của bài giảng. Bài học đã được <strong>hoàn thành 100%</strong> và mở khóa bài tiếp theo!
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {hasNextModule && onRequestNextModule && (
                  <button
                    type="button"
                    onClick={onRequestNextModule}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                  >
                    <span>Chuyển Sang Bài Học Tiếp Theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRetestFromStart}
                  className="px-4 py-2.5 border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm Lại Để Ôn Luyện</span>
                </button>
              </div>
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: CHƯA ĐẠT (< 8/10) - BẮT BUỘC TEST LẠI */
            <div className="p-5 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-400 rounded-2xl text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-200 text-rose-900 inline-block mb-1">
                  CHƯA ĐẠT TIÊU CHUẨN
                </span>
                <h4 className="text-xl font-black text-rose-950">
                  {score} / 10 Điểm (Cần tối thiểu 8/10 để qua bài)
                </h4>
                <p className="text-xs text-rose-800 mt-1 max-w-md mx-auto">
                  Theo quy định của rạp, bạn cần xem kỹ các câu sai kèm giải thích SOP bên dưới và <strong>bắt buộc phải làm lại bài test từ Câu 1</strong> để được mở khóa bài học tiếp theo.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRetestFromStart}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 mx-auto transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Bắt Buộc Làm Lại Bài Test (Từ Câu 1)</span>
                </button>
              </div>
            </div>
          )}

          {/* Danh sách 10 câu kèm giải thích chi tiết */}
          <div className="space-y-3 pt-2">
            <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Xem Lại 10 Câu Trắc Nghiệm & Giải Thích Chuẩn SOP:</span>
            </h5>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {questions.map((q, idx) => {
                const userChoice = selectedAnswers[idx];
                const isCorrect = userChoice === q.correctAnswerIndex;

                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition ${
                      isCorrect 
                        ? 'bg-emerald-50/70 border-emerald-200' 
                        : 'bg-rose-50/70 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="font-bold text-slate-900 leading-snug flex-1">
                        {q.questionText}
                      </div>
                    </div>

                    <div className="pl-7 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span>Lựa chọn của bạn:</span>
                        <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                          {userChoice !== undefined ? q.options[userChoice] : 'Chưa chọn'}
                        </strong>
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 inline" />
                        )}
                      </div>

                      {!isCorrect && (
                        <div className="text-emerald-800 font-bold">
                          Đáp án đúng: {q.options[q.correctAnswerIndex]}
                        </div>
                      )}

                      {q.explanation && (
                        <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200 mt-1 leading-relaxed">
                          <span className="font-bold text-purple-700">Quy chuẩn SOP:</span> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
