import React, { useState } from 'react';
import { QuizQuestion, Course } from '../types';
import { getCourses, saveQuiz } from '../services/storage';
import { generateAiQuizFromTopic } from '../services/openai';
import { Sparkles, CheckCircle2, RefreshCw, Trash2, BookOpen } from 'lucide-react';

export const ManagerQuizCreatorPage: React.FC = () => {
  const [courses] = useState<Course[]>(getCourses());
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [topicPrompt, setTopicPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGenerateWithAi = async () => {
    if (!topicPrompt.trim()) return;
    setIsAiGenerating(true);
    setSavedSuccess(false);

    try {
      const questions = await generateAiQuizFromTopic(topicPrompt, 3);
      setGeneratedQuestions(questions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveQuiz = () => {
    if (generatedQuestions.length === 0) return;

    const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
    const quizId = `quiz-${Date.now()}`;

    saveQuiz({
      id: quizId,
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.title,
      title: `Bài Đánh Giá Nghiệp Vụ: ${topicPrompt || selectedCourse.title}`,
      passScore: 80,
      durationMinutes: 15,
      isCtkm: true,
      questions: generatedQuestions
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleRemoveQuestion = (idx: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900">Tạo Bài Kiểm Tra & Khóa Học Nghiệp Vụ</h2>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            ✨ Soạn Đề Tự Động
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Khởi tạo câu hỏi trắc nghiệm nghiệp vụ từ nội dung khóa học.</p>
      </div>

      {/* Main Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Chọn Khóa Học Liên Quan</span>
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-500"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.category})
              </option>
            ))}
          </select>
        </div>

        {/* AI Prompt Input */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Chủ đề hoặc nội dung cần tạo câu hỏi:</span>
            </label>
          </div>

          <textarea
            rows={3}
            placeholder="Ví dụ: Quy trình phát hành Combo Popcorn Siêu Bão Summer 2026, quy định đổi vị bắp miễn phí và nguyên tắc chào hỏi khách hàng tại quầy vé..."
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />

          <button
            onClick={handleGenerateWithAi}
            disabled={isAiGenerating || !topicPrompt.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-purple-500 to-amber-500 hover:from-purple-500 hover:to-amber-400 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
          >
            {isAiGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang tự động khởi tạo bộ câu hỏi trắc nghiệm...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Khởi Tạo Bộ Câu Hỏi Tự Động</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Questions List */}
        {generatedQuestions.length > 0 && (
          <div className="space-y-4 pt-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>Danh sách câu hỏi vừa khởi tạo ({generatedQuestions.length})</span>
              <span className="text-xs text-emerald-700 font-bold">Sẵn sàng xuất bản</span>
            </h3>

            <div className="space-y-3">
              {generatedQuestions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 relative">
                  <button
                    onClick={() => handleRemoveQuestion(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="text-xs font-bold text-amber-800 pr-6">
                    Câu {idx + 1}: {q.questionText}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2.5 rounded-xl text-[11px] border ${
                          oIdx === q.correctAnswerIndex
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {String.fromCharCode(65 + oIdx)}. {opt}
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                    💡 Hướng dẫn đáp án: {q.explanation}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveQuiz}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedSuccess ? 'Đã Xuất Bản Đề Thi Thành Công!' : 'Xuất Bản Đề Thi Vào Hệ Thống'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
