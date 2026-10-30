import React, { useState, useEffect } from 'react';
import { QuizQuestion, Course, CourseModule, Quiz } from '../types';
import { getCourses, saveCourse, deleteCourse, getQuizzes, saveQuiz } from '../services/storage';
import { fetchCourses, fetchQuizzes } from '../services/apiClient';
import { generateAiQuizFromTopic } from '../services/openai';
import { 
  Sparkles, CheckCircle2, RefreshCw, Trash2, BookOpen, Plus, Search, 
  Filter, Eye, Edit3, Clock, Award, Star, Video, FileText, ChevronRight, 
  X, Check, AlertCircle, HelpCircle, Layers, GraduationCap, Film,
  UserCheck, ExternalLink, Bookmark, ShieldAlert, ArrowRight, Play
} from 'lucide-react';

export const CINEMA_DEPARTMENTS = [
  'Box ticket',
  'Concession',
  'Usher',
  'Processing',
];

export const COURSE_LEVELS = [
  'Bắt Buộc 100%',
  'Tiêu Chuẩn SOP',
  'Nâng Cao',
  'Khuyến Mãi Nóng (CTKM)',
];

export const PRESET_THUMBNAILS = [
  {
    name: 'Bán vé & Sảnh POS (Box ticket)',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=700&auto=format&fit=crop&q=80',
  },
  {
    name: 'Quầy Bắp Nước (Concession)',
    url: 'https://images.unsplash.com/photo-1585647347384-2593bc35786b?w=700&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sảnh Rạp & Soát Vé (Usher)',
    url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=700&auto=format&fit=crop&q=80',
  },
  {
    name: 'Chế Biến & Kho Nguyên Liệu (Processing)',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&auto=format&fit=crop&q=80',
  },
  {
    name: 'Phòng Chiếu & Kỹ Thuật Chiếu Phim',
    url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=700&auto=format&fit=crop&q=80',
  },
  {
    name: 'Dịch Vụ Khách Hàng Chuẩn 5 Sao VIP',
    url: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?w=700&auto=format&fit=crop&q=80',
  },
];

export const ManagerQuizCreatorPage: React.FC = () => {
  // Navigation Tabs:
  // - 'list': Xem danh sách tất cả các khóa học đã tạo
  // - 'create_course': Tạo hoặc chỉnh sửa khóa học bài bản
  // - 'create_quiz': Soạn đề thi trắc nghiệm & ngân hàng câu hỏi
  const [activeTab, setActiveTab] = useState<'list' | 'create_course' | 'create_quiz'>('list');

  // Core Data
  const [courses, setCourses] = useState<Course[]>(getCourses());
  const [quizzes, setQuizzes] = useState<Quiz[]>(getQuizzes());

  // Search & Filter for Tab 1
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all');

  // Course Detail Preview Modal
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  // =========================================================================
  // TAB 2: COURSE CREATION & EDITING STATE
  // =========================================================================
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState<string>('Box ticket');
  const [courseLevel, setCourseLevel] = useState<string>('Tiêu Chuẩn SOP');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseDuration, setCourseDuration] = useState<number>(45);
  const [instructorName, setInstructorName] = useState('Phạm Thu Hương');
  const [instructorTitle, setInstructorTitle] = useState('Quản lý Đào tạo & Nhân sự Rạp');
  const [courseThumbnail, setCourseThumbnail] = useState(PRESET_THUMBNAILS[0].url);

  // Modules within the course
  const [modules, setModules] = useState<CourseModule[]>([
    {
      id: `m-${Date.now()}-1`,
      title: 'Chương 1: Quy chuẩn chào đón và tác phong nghiệp vụ chuẩn Aurora',
      contentType: 'video',
      contentUrl: 'https://www.youtube.com/embed/iPAfLiNepws',
      duration: '15 phút',
      contentSummary: 'Nắm vững tác phong, đồng phục và câu chào đón khách chuẩn hóa tại cụm rạp.',
      keyTakeaways: [
        'Cúi chào góc 15 độ kèm nụ cười thân thiện 3 giây',
        'Xưng hô chuẩn mực: Dạ - Vâng - Cảm ơn - Xin phép',
        'Không sử dụng điện thoại cá nhân trong ca trực'
      ]
    }
  ]);

  // Sub-modal for adding/editing a single module
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [modTitle, setModTitle] = useState('');
  const [modType, setModType] = useState<'video' | 'slide' | 'document' | 'interactive'>('video');
  const [modDuration, setModDuration] = useState('15 phút');
  const [modUrl, setModUrl] = useState('https://www.youtube.com/embed/iPAfLiNepws');
  const [modSummary, setModSummary] = useState('');
  const [modTakeawayInput, setModTakeawayInput] = useState('');
  const [modTakeaways, setModTakeaways] = useState<string[]>([]);

  // =========================================================================
  // TAB 3: QUIZ CREATION STATE
  // =========================================================================
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState<string>(courses[0]?.id || '');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDuration, setQuizDuration] = useState<number>(15);
  const [quizPassScore, setQuizPassScore] = useState<number>(80);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);

  // AI Generation
  const [topicPrompt, setTopicPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Manual Question Builder State
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualOptions, setManualOptions] = useState<string[]>(['', '', '', '']);
  const [manualCorrectIndex, setManualCorrectIndex] = useState<number>(0);
  const [manualExplanation, setManualExplanation] = useState('');
  const [isAddingManualQuestion, setIsAddingManualQuestion] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync data on mount
  useEffect(() => {
    Promise.all([fetchCourses(), fetchQuizzes()]).then(([courseData, quizData]) => {
      if (courseData && courseData.length > 0) setCourses(courseData);
      if (quizData && quizData.length > 0) setQuizzes(quizData);
    });
  }, []);

  // Update default quiz title when target course changes
  useEffect(() => {
    const targetCourse = courses.find(c => c.id === selectedCourseForQuiz);
    if (targetCourse) {
      setQuizTitle(`Bài Đánh Giá Nghiệp Vụ: ${targetCourse.title}`);
      // Nếu khóa đã có đề thi, nạp sẵn câu hỏi hiện có
      const existingQuiz = quizzes.find(q => q.courseId === targetCourse.id || q.id === targetCourse.quizId);
      if (existingQuiz && existingQuiz.questions && existingQuiz.questions.length > 0) {
        setGeneratedQuestions(existingQuiz.questions);
      }
    }
  }, [selectedCourseForQuiz, courses, quizzes]);

  // =========================================================================
  // HANDLERS FOR COURSE LIST (TAB 1)
  // =========================================================================
  const filteredCourses = courses.filter(course => {
    const matchSearch = 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.instructorName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchDept = selectedDeptFilter === 'all' || 
      (course.category || '').toLowerCase().includes(selectedDeptFilter.toLowerCase());

    const matchLevel = selectedLevelFilter === 'all' || course.level === selectedLevelFilter;

    return matchSearch && matchDept && matchLevel;
  });

  const handleDeleteCourse = (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${title}"?`)) {
      deleteCourse(id);
      setCourses(getCourses());
      showToast(`Đã xóa khóa học "${title}".`, 'info');
    }
  };

  const handleEditCourseClick = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseCategory(course.category || 'Box ticket');
    setCourseLevel(course.level || 'Tiêu Chuẩn SOP');
    setCourseDescription(course.description);
    setCourseDuration(course.durationMinutes || 45);
    setInstructorName(course.instructorName || 'Phạm Thu Hương');
    setInstructorTitle(course.instructorTitle || 'Quản lý Đào tạo & Nhân sự Rạp');
    setCourseThumbnail(course.thumbnail || PRESET_THUMBNAILS[0].url);
    setModules(course.modules && course.modules.length > 0 ? course.modules : []);
    setActiveTab('create_course');
  };

  const handleStartCreateNewCourse = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseCategory('Box ticket');
    setCourseLevel('Tiêu Chuẩn SOP');
    setCourseDescription('');
    setCourseDuration(45);
    setInstructorName('Phạm Thu Hương');
    setInstructorTitle('Quản lý Đào tạo & Nhân sự Rạp');
    setCourseThumbnail(PRESET_THUMBNAILS[0].url);
    setModules([
      {
        id: `m-${Date.now()}-1`,
        title: 'Chương 1: Quy chuẩn mở ca & vệ sinh trang thiết bị',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/iPAfLiNepws',
        duration: '15 phút',
        contentSummary: 'Tiêu chuẩn kiểm tra đầu ca, đồng phục và checklist thiết bị.',
        keyTakeaways: ['Kiểm tra an toàn điện & PCCC', 'Vệ sinh quầy theo tiêu chuẩn 5S']
      }
    ]);
    setActiveTab('create_course');
  };

  // =========================================================================
  // HANDLERS FOR COURSE CREATION & MODULES (TAB 2)
  // =========================================================================
  const handleOpenAddModule = () => {
    setEditingModuleId(null);
    setModTitle('');
    setModType('video');
    setModDuration('15 phút');
    setModUrl('https://www.youtube.com/embed/iPAfLiNepws');
    setModSummary('');
    setModTakeaways([]);
    setModTakeawayInput('');
    setModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod: CourseModule) => {
    setEditingModuleId(mod.id);
    setModTitle(mod.title);
    setModType(mod.contentType || 'video');
    setModDuration(mod.duration || '15 phút');
    setModUrl(mod.contentUrl || '');
    setModSummary(mod.contentSummary || '');
    setModTakeaways(mod.keyTakeaways || []);
    setModTakeawayInput('');
    setModuleModalOpen(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) return;

    const moduleData: CourseModule = {
      id: editingModuleId || `m-${Date.now()}`,
      title: modTitle.trim(),
      contentType: modType,
      duration: modDuration,
      contentUrl: modUrl,
      contentSummary: modSummary.trim(),
      keyTakeaways: modTakeaways.length > 0 ? modTakeaways : [modTitle.trim()]
    };

    if (editingModuleId) {
      setModules(prev => prev.map(m => m.id === editingModuleId ? moduleData : m));
    } else {
      setModules(prev => [...prev, moduleData]);
    }

    setModuleModalOpen(false);
  };

  const handleRemoveModule = (modId: string) => {
    if (modules.length <= 1) {
      alert('Khóa học cần có ít nhất 1 bài học (Module)!');
      return;
    }
    setModules(prev => prev.filter(m => m.id !== modId));
  };

  const handleAddTakeaway = () => {
    if (modTakeawayInput.trim()) {
      setModTakeaways(prev => [...prev, modTakeawayInput.trim()]);
      setModTakeawayInput('');
    }
  };

  const handleSaveFullCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      alert('Vui lòng nhập tên khóa học!');
      return;
    }
    if (modules.length === 0) {
      alert('Vui lòng thêm ít nhất 1 bài học / module cho khóa học!');
      return;
    }

    const courseId = editingCourseId || `crs-${Date.now()}`;
    const newCourse: Course = {
      id: courseId,
      title: courseTitle.trim(),
      description: courseDescription.trim() || `Khóa học chuyên môn nghiệp vụ ${courseCategory} chuẩn hóa toàn cụm rạp Aurora Cinema.`,
      category: courseCategory,
      level: courseLevel,
      durationMinutes: courseDuration || 45,
      isCtkm: courseLevel.includes('CTKM') || courseLevel.includes('Khuyến Mãi'),
      thumbnail: courseThumbnail,
      instructorName,
      instructorTitle,
      instructorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviewCount: 30,
      enrolledCount: editingCourseId ? (courses.find(c => c.id === editingCourseId)?.enrolledCount || 65) : 0,
      completedCount: editingCourseId ? (courses.find(c => c.id === editingCourseId)?.completedCount || 58) : 0,
      modules: modules,
      quizId: `quiz-${courseId}`,
      examCheckpoints: [
        `Quy chuẩn tác phong chuẩn mực của ${courseCategory} tại Aurora Cinema`,
        `Thực hành an toàn lao động và xử lý tình huống phục vụ khách hàng`
      ]
    };

    saveCourse(newCourse);
    setCourses(getCourses());
    showToast(editingCourseId ? `✓ Đã cập nhật khóa học "${newCourse.title}"!` : `✓ Đã tạo mới khóa học "${newCourse.title}" thành công!`, 'success');
    setActiveTab('list');
  };

  // =========================================================================
  // HANDLERS FOR QUIZ GENERATION & MANUAL QUESTIONS (TAB 3)
  // =========================================================================
  const handleGenerateWithAi = async () => {
    if (!topicPrompt.trim()) {
      alert('Vui lòng nhập chủ đề hoặc yêu cầu nghiệp vụ cần AI tạo câu hỏi!');
      return;
    }
    setIsAiGenerating(true);

    try {
      const questions = await generateAiQuizFromTopic(topicPrompt, 4);
      if (questions && questions.length > 0) {
        setGeneratedQuestions(prev => [...prev, ...questions]);
        showToast(`AI đã khởi tạo thành công ${questions.length} câu hỏi nghiệp vụ!`, 'success');
      } else {
        showToast('Không thể tạo câu hỏi từ chủ đề này, vui lòng thử lại.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối AI, vui lòng thử lại.', 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestionText.trim()) return;
    if (manualOptions.some(opt => !opt.trim())) {
      alert('Vui lòng điền đủ 4 phương án lựa chọn A, B, C, D!');
      return;
    }

    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      questionText: manualQuestionText.trim(),
      options: manualOptions.map(o => o.trim()),
      correctAnswerIndex: manualCorrectIndex,
      explanation: manualExplanation.trim() || 'Chuẩn quy trình vận hành SOP Aurora Cinema.'
    };

    setGeneratedQuestions(prev => [...prev, newQ]);
    setManualQuestionText('');
    setManualOptions(['', '', '', '']);
    setManualCorrectIndex(0);
    setManualExplanation('');
    setIsAddingManualQuestion(false);
    showToast('Đã thêm câu hỏi trắc nghiệm mới!', 'success');
  };

  const handleSaveQuiz = () => {
    if (generatedQuestions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi trắc nghiệm!');
      return;
    }

    const targetCourse = courses.find(c => c.id === selectedCourseForQuiz) || courses[0];
    if (!targetCourse) return;

    const quizId = targetCourse.quizId || `quiz-${targetCourse.id}`;

    const newQuiz: Quiz = {
      id: quizId,
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
      title: quizTitle.trim() || `Bài Đánh Giá Nghiệp Vụ: ${targetCourse.title}`,
      passScore: quizPassScore,
      durationMinutes: quizDuration,
      isCtkm: targetCourse.isCtkm,
      questions: generatedQuestions
    };

    saveQuiz(newQuiz);
    setQuizzes(getQuizzes());

    // Cập nhật lại course có quizId
    const updatedCourse: Course = {
      ...targetCourse,
      quizId: quizId
    };
    saveCourse(updatedCourse);
    setCourses(getCourses());

    showToast(`✓ Đã lưu thành công bộ đề thi (${generatedQuestions.length} câu) cho khóa học!`, 'success');
    setActiveTab('list');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : toast.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-800 font-bold">
                <GraduationCap className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Quản Lý Khóa Học & Đề Khảo Thí Nghiệp Vụ
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý danh sách khóa học cụm rạp, soạn thảo giáo trình module bài bản và thiết lập bộ đề thi đánh giá.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleStartCreateNewCourse}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tạo Khóa Học Mới</span>
            </button>
          </div>
        </div>

        {/* 3 Main Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'list'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Danh Sách Khóa Học Đã Tạo</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === 'list' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {courses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('create_course')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'create_course'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>{editingCourseId ? 'Chỉnh Sửa Khóa Học' : 'Thiết Lập Khóa Học Mới'}</span>
          </button>

          <button
            onClick={() => setActiveTab('create_quiz')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'create_quiz'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Soạn Đề Khảo Thí & Ngân Hàng Câu Hỏi</span>
            {generatedQuestions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                {generatedQuestions.length} câu
              </span>
            )}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: DANH SÁCH KHÓA HỌC ĐÃ TẠO                                    */}
      {/* =================================================================== */}
      {activeTab === 'list' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500">Tổng Số Khóa Học</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{courses.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Toàn cụm rạp Aurora</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="text-[11px] font-medium text-emerald-700">Khóa Bắt Buộc (Onboarding)</div>
              <div className="text-xl font-bold text-emerald-700 mt-1">
                {courses.filter(c => c.level === 'Bắt Buộc 100%' || c.level === 'Bắt Buộc').length}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Tiêu chuẩn nhận việc</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="text-[11px] font-medium text-amber-700">Tổng Số Bài Giảng (Modules)</div>
              <div className="text-xl font-bold text-amber-700 mt-1">
                {courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0)}
              </div>
              <div className="text-[10px] text-amber-600 font-medium mt-0.5">Video SOP & Slide</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <div className="text-[11px] font-medium text-blue-700">Bộ Đề Khảo Thí Đã Thiết Lập</div>
              <div className="text-xl font-bold text-blue-700 mt-1">
                {quizzes.length}
              </div>
              <div className="text-[10px] text-blue-600 font-medium mt-0.5">Đề thi sát hạch</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search Bar */}
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo tên khóa học, giảng viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">Tất cả nghiệp vụ rạp</option>
                  {CINEMA_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <select
                  value={selectedLevelFilter}
                  onChange={(e) => setSelectedLevelFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">Tất cả cấp độ đào tạo</option>
                  {COURSE_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Courses Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                <Film className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">Không tìm thấy khóa học nào phù hợp với bộ lọc.</p>
                <button
                  onClick={handleStartCreateNewCourse}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  + Tạo Khóa Học Đầu Tiên
                </button>
              </div>
            ) : (
              filteredCourses.map((course) => {
                const hasQuiz = Boolean(quizzes.some(q => q.courseId === course.id || q.id === course.quizId));
                return (
                  <div 
                    key={course.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Thumbnail with Overlay Badges */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                        <img 
                          src={course.thumbnail} 
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />
                        
                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs">
                            {course.category}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs ${
                            course.level?.includes('Bắt Buộc') 
                              ? 'bg-rose-600 text-white' 
                              : course.level?.includes('CTKM')
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-900/80 text-slate-200 border border-white/20 backdrop-blur-xs'
                          }`}>
                            {course.level || 'Tiêu Chuẩn'}
                          </span>
                        </div>

                        {/* Bottom Info on Image */}
                        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px] font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            {course.durationMinutes} phút
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            {course.modules?.length || 0} bài học
                          </span>
                        </div>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-4 space-y-2.5">
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-amber-800 transition">
                          {course.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>

                        {/* Instructor & Quiz Status */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {course.instructorName?.charAt(0) || 'G'}
                            </div>
                            <span className="text-slate-700 font-semibold text-[11px] truncate">
                              {course.instructorName || 'Phạm Thu Hương'}
                            </span>
                          </div>

                          {hasQuiz ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Đã có đề thi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                              Chưa có đề thi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => setPreviewCourse(course)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Xem chi tiết giáo trình"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Xem Giáo Trình</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedCourseForQuiz(course.id);
                            setActiveTab('create_quiz');
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Soạn đề thi cho khóa học này"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                          <span>Đề Thi</span>
                        </button>

                        <button
                          onClick={() => handleEditCourseClick(course)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa khóa học"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa khóa học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: TẠO HOẶC CHỈNH SỬA KHÓA HỌC BÀI BẢN                        */}
      {/* =================================================================== */}
      {activeTab === 'create_course' && (
        <form onSubmit={handleSaveFullCourse} className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 text-amber-800 rounded-xl font-bold">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingCourseId ? 'Chỉnh Sửa Thông Tin Khóa Học' : 'Khởi Tạo Khóa Học Nghiệp Vụ Chuẩn Rạp'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Thiết lập thông tin chung, ảnh đại diện và giảng viên phụ trách
                  </p>
                </div>
              </div>

              {editingCourseId && (
                <button
                  type="button"
                  onClick={handleStartCreateNewCourse}
                  className="text-xs text-amber-700 hover:underline font-semibold"
                >
                  Tạo khóa học mới thay vì sửa
                </button>
              )}
            </div>

            {/* Course Title */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tên Khóa Học Nghiệp Vụ <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Nghiệp Vụ Quầy Box Ticket: Vận Hành Máy POS & Xử Lý Sự Cố Khách Hàng"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Department & Level & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nghiệp Vụ Áp Dụng <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {CINEMA_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cấp Độ Đào Tạo:
                </label>
                <select
                  value={courseLevel}
                  onChange={(e) => setCourseLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {COURSE_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tổng Thời Lượng Dự Kiến (Phút):
                </label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={courseDuration}
                  onChange={(e) => setCourseDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Instructor Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giảng Viên / Trưởng Ca Phụ Trách:
                </label>
                <input
                  type="text"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức Danh Giảng Viên:
                </label>
                <input
                  type="text"
                  value={instructorTitle}
                  onChange={(e) => setInstructorTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Thumbnail Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Ảnh Bìa Thumbnail Khóa Học:
              </label>
              
              {/* Preset Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                {PRESET_THUMBNAILS.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCourseThumbnail(preset.url)}
                    className={`relative rounded-xl overflow-hidden h-20 border-2 cursor-pointer transition ${
                      courseThumbnail === preset.url 
                        ? 'border-amber-500 ring-2 ring-amber-400 scale-102' 
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 p-1 flex items-end">
                      <span className="text-[9px] font-bold text-white leading-tight line-clamp-2">
                        {preset.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Image URL input */}
              <input
                type="url"
                placeholder="Hoặc nhập liên kết ảnh bìa tùy chỉnh (URL)..."
                value={courseThumbnail}
                onChange={(e) => setCourseThumbnail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            {/* Course Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô Tả Khóa Học & Mục Tiêu Đào Tạo SOP:
              </label>
              <textarea
                rows={3}
                placeholder="Tóm tắt mục tiêu khóa học, các tiêu chuẩn SOP mà học viên cần đạt được sau khi hoàn thành..."
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 resize-none shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* MODULES BUILDER SECTION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-500/10 text-indigo-700 rounded-xl font-bold">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Chương Trình Học & Các Bài Giảng (Modules)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Khóa học hiện có {modules.length} bài giảng SOP. Nhân viên sẽ học tuần tự các bài học này.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModule}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Bài Giảng</span>
              </button>
            </div>

            {/* List of Modules */}
            <div className="space-y-3">
              {modules.map((mod, index) => (
                <div 
                  key={mod.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/60 transition"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <span>{mod.title}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-md bg-white border border-slate-200 font-medium text-slate-600 uppercase">
                          {mod.contentType || 'video'}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {mod.duration || '15 phút'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{mod.contentSummary}</p>
                      {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {mod.keyTakeaways.map((point, pIdx) => (
                            <span key={pIdx} className="text-[9px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                              ✓ {point}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModule(mod)}
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
                      title="Sửa bài giảng này"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveModule(mod.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
                      title="Xóa bài học"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{editingCourseId ? 'Cập Nhật Khóa Học' : 'Lưu & Xuất Bản Khóa Học'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 3: SOẠN ĐỀ KHẢO THÍ & NGÂN HÀNG CÂU HỎI                        */}
      {/* =================================================================== */}
      {activeTab === 'create_quiz' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-500/10 text-purple-800 rounded-xl font-bold">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Cấu Hình Bài Kiểm Tra & Soạn Đề Khảo Thí
                  </h2>
                  <p className="text-xs text-slate-500">
                    Liên kết bộ câu hỏi trắc nghiệm với khóa học để nhân viên làm bài sau khi xem bài giảng
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl">
                {generatedQuestions.length} câu hỏi đã có trong đề
              </span>
            </div>

            {/* Course Selector & Quiz Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chọn Khóa Học Liên Quan:</span>
                </label>
                <select
                  value={selectedCourseForQuiz}
                  onChange={(e) => setSelectedCourseForQuiz(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời Gian Làm Bài (Phút):
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điểm Chuẩn Đạt (Pass %):
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={quizPassScore}
                  onChange={(e) => setQuizPassScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu Đề Bài Đánh Giá:
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>
          </div>

          {/* TWO MODES OF ADDING QUESTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* MODE 1: AI AUTO-GENERATOR */}
            <div className="bg-gradient-to-br from-purple-500/10 via-white to-amber-500/10 border border-purple-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-600 text-white font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-purple-950">Chế Độ 1: AI Soạn Đề Tự Động</h3>
                    <p className="text-[10px] text-purple-700">Sinh câu hỏi trắc nghiệm chuẩn nghiệp vụ rạp phim Aurora</p>
                  </div>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Nhập yêu cầu hoặc chủ đề (VD: Quy trình nổ bắp 32oz, tỷ lệ pha muối bơ, áp suất gas CO2 máy Post-Mix và an toàn thực phẩm FIFO)..."
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-2xs resize-none"
              />

              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={isAiGenerating || !topicPrompt.trim()}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  isAiGenerating || !topicPrompt.trim()
                    ? 'bg-purple-200 text-purple-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                }`}
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Đang Soạn Câu Hỏi Chuẩn SOP...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Khởi Tạo 4 Câu Hỏi Với AI</span>
                  </>
                )}
              </button>
            </div>

            {/* MODE 2: MANUAL QUESTION BUILDER */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Chế Độ 2: Soạn Câu Hỏi Thủ Công</h3>
                    <p className="text-[10px] text-slate-500">Tự nhập nội dung câu hỏi, 4 đáp án và giải thích nghiệp vụ</p>
                  </div>
                </div>

                {!isAddingManualQuestion && (
                  <button
                    type="button"
                    onClick={() => setIsAddingManualQuestion(true)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Viết Câu Mới
                  </button>
                )}
              </div>

              {isAddingManualQuestion ? (
                <form onSubmit={handleAddManualQuestion} className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nội Dung Câu Hỏi:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nhiệt độ bảo quản của tủ giữ ấm bắp Popcorn Warmer là bao nhiêu?"
                      value={manualQuestionText}
                      onChange={(e) => setManualQuestionText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      4 Phương Án (Tích chọn tròn để đặt đáp án đúng):
                    </label>
                    {manualOptions.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={manualCorrectIndex === idx}
                          onChange={() => setManualCorrectIndex(idx)}
                          className="text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                        <span className="font-bold text-xs text-slate-500 w-4">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={`Phương án ${String.fromCharCode(65 + idx)}...`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...manualOptions];
                            newOpts[idx] = e.target.value;
                            setManualOptions(newOpts);
                          }}
                          className={`flex-1 px-2.5 py-1 text-xs rounded-lg border focus:outline-none ${
                            manualCorrectIndex === idx 
                              ? 'border-emerald-500 bg-emerald-50/30 text-slate-900 font-semibold' 
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Giải Thích Chuẩn SOP:
                    </label>
                    <input
                      type="text"
                      placeholder="Giải thích tại sao đáp án này là chuẩn quy trình..."
                      value={manualExplanation}
                      onChange={(e) => setManualExplanation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingManualQuestion(false)}
                      className="px-3 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-2xs"
                    >
                      Thêm Vào Đề
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">
                    Bấm nút <strong>"+ Viết Câu Mới"</strong> để tự nhập câu hỏi trắc nghiệm của bạn.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QUESTIONS LIST IN THE QUIZ */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Danh Sách Câu Hỏi Trong Đề Khảo Thí</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-900">
                    {generatedQuestions.length} câu
                  </span>
                </h3>
              </div>

              {generatedQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Xóa tất cả câu hỏi
                </button>
              )}
            </div>

            {generatedQuestions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Đề thi chưa có câu hỏi nào. Hãy dùng AI hoặc soạn thủ công ở trên!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedQuestions.map((q, qIdx) => (
                  <div 
                    key={q.id || qIdx}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:bg-slate-100/60 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold text-xs text-slate-900 leading-snug">
                        <span className="text-amber-800 mr-1.5">Câu {qIdx + 1}:</span>
                        {q.questionText}
                      </div>
                      <button
                        type="button"
                        onClick={() => setGeneratedQuestions(prev => prev.filter((_, idx) => idx !== qIdx))}
                        className="p-1 text-slate-400 hover:text-rose-600 transition shrink-0"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        return (
                          <div 
                            key={optIdx}
                            className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                              isCorrect 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 flex items-center gap-1.5">
                        <Award className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>SOP: {q.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Save Quiz Button */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveQuiz}
                disabled={generatedQuestions.length === 0}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                  generatedQuestions.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Lưu Bộ Đề Khảo Thí ({generatedQuestions.length} Câu) Vào Khóa Học</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: XEM CHI TIẾT GIÁO TRÌNH KHÓA HỌC                             */}
      {/* =================================================================== */}
      {previewCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-800 font-bold">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{previewCourse.title}</h3>
                  <p className="text-xs text-slate-500">{previewCourse.category} • {previewCourse.level || 'Tiêu Chuẩn'}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCourse(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-44 rounded-2xl overflow-hidden shadow-xs">
              <img src={previewCourse.thumbnail} alt={previewCourse.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <div className="text-xs font-medium opacity-90">{previewCourse.description}</div>
              </div>
            </div>

            {/* Modules List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Giáo Trình Chi Tiết ({previewCourse.modules?.length || 0} Bài Học):</span>
              </h4>

              <div className="space-y-2">
                {previewCourse.modules?.map((mod, idx) => (
                  <div key={mod.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                      <span>{idx + 1}. {mod.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{mod.duration}</span>
                    </div>
                    {mod.contentSummary && (
                      <p className="text-[11px] text-slate-600">{mod.contentSummary}</p>
                    )}
                    {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {mod.keyTakeaways.map((point, pIdx) => (
                          <span key={pIdx} className="text-[9px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">
                            ✓ {point}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const targetId = previewCourse.id;
                  setPreviewCourse(null);
                  handleEditCourseClick(courses.find(c => c.id === targetId) || previewCourse);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Chỉnh Sửa Khóa Học Này
              </button>
              <button
                type="button"
                onClick={() => setPreviewCourse(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-MODAL: THÊM / SỬA 1 BÀI HỌC (MODULE) TRONG TAB 2                 */}
      {/* =================================================================== */}
      {moduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-500/10 text-indigo-700 rounded-xl font-bold">
                  <Play className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingModuleId ? 'Chỉnh Sửa Bài Giảng' : 'Thêm Bài Giảng (Module) Mới'}
                </h3>
              </div>
              <button
                onClick={() => setModuleModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tiêu Đề Bài Giảng <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chương 2: Tiêu chuẩn nổ bắp 32oz & áp suất CO2 máy Post-Mix"
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hình Thức Bài Giảng:
                  </label>
                  <select
                    value={modType}
                    onChange={(e) => setModType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="video">Video SOP (YouTube / Cloud)</option>
                    <option value="slide">Slide Quy Trình PDF</option>
                    <option value="document">Tài Liệu Hướng Dẫn</option>
                    <option value="interactive">Thực Hành Tương Tác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời Lượng Bài Học:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 15 phút"
                    value={modDuration}
                    onChange={(e) => setModDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường Dẫn Video / Nội Dung (Embed URL):
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/embed/..."
                  value={modUrl}
                  onChange={(e) => setModUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tóm Tắt Nội Dung Bài Học:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi ngắn gọn nội dung và thao tác chuẩn..."
                  value={modSummary}
                  onChange={(e) => setModSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điểm Lưu Ý Cốt Lõi (Key Takeaways):
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nhập 1 quy tắc chuẩn và bấm Thêm..."
                    value={modTakeawayInput}
                    onChange={(e) => setModTakeawayInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTakeaway();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                  >
                    Thêm
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {modTakeaways.map((item, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg text-[11px] font-medium"
                    >
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => setModTakeaways(prev => prev.filter((_, i) => i !== idx))}
                        className="text-indigo-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModuleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lưu Bài Giảng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
