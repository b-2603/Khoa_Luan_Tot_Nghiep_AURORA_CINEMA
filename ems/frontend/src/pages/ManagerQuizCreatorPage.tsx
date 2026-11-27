import React, { useState, useEffect, useMemo } from 'react';
import { QuizQuestion, Course, CourseModule, Quiz } from '../types';
import { getCourses, saveCourse, getQuizzes } from '../services/storage';
import {
  fetchCourses,
  fetchQuizzes,
  saveCourseApi,
  deleteCourseApi,
  saveQuizApi,
} from '../services/apiClient';
import { generateAiQuizFromTopic } from '../services/openai';
import {
  Sparkles, CheckCircle2, RefreshCw, Trash2, BookOpen, Plus, Search,
  Eye, Edit3, Clock, Award, Video, FileText, X, Check, AlertCircle,
  HelpCircle, Layers, GraduationCap, Film, Play, ChevronDown, ChevronUp,
  Users, Zap, FileQuestion, Image, ListOrdered, Target, Copy,
  ArrowUp, ArrowDown, SlidersHorizontal, CheckSquare, FileCheck2
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

const AI_QUICK_PROMPTS = [
  {
    label: 'Box Ticket & POS',
    prompt: 'Nghiệp vụ bán vé POS, kiểm tra độ tuổi phim C18/T16/T13, quy tắc chọn ghế không để trống lẻ và chính sách đổi trả vé.',
  },
  {
    label: 'Nổ bắp & Post-Mix',
    prompt: 'Quy trình nổ bắp 32oz chuẩn nhiệt độ 230-245°C, áp suất gas CO2 máy nước ngọt Post-Mix 95-110 PSI và vệ sinh vòi cuối ca.',
  },
  {
    label: 'Soát vé & PCCC',
    prompt: 'Quy trình soát vé Usher, kiểm soát quay lén trong phòng chiếu, xử lý khách ồn ào và quy tắc PCCC PASS / thoát hiểm khẩn cấp.',
  },
  {
    label: 'Xử lý khiếu nại VIP',
    prompt: 'Mô hình LAST xử lý khiếu nại khách hàng 5 sao, tiêu chuẩn chào đón 3 giây Aurora Look và xử lý sự cố kỹ thuật phòng chiếu.',
  },
];

// ─── Helper: Level badge color ────────────────────────────────────
const levelBadge = (level?: string) => {
  if (!level) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (level.includes('Bắt Buộc')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (level.includes('CTKM') || level.includes('Khuyến Mãi')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (level.includes('Nâng Cao')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-slate-100/80 text-slate-700 border-slate-200';
};

const contentTypeMeta = (type: string) => {
  switch (type) {
    case 'video':
      return { label: 'Video SOP', icon: <Video className="w-3.5 h-3.5" />, cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'slide':
      return { label: 'Slide PDF', icon: <FileText className="w-3.5 h-3.5" />, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'document':
      return { label: 'Tài liệu', icon: <BookOpen className="w-3.5 h-3.5" />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'interactive':
      return { label: 'Thực hành', icon: <Zap className="w-3.5 h-3.5" />, cls: 'bg-violet-50 text-violet-700 border-violet-200' };
    default:
      return { label: 'Video SOP', icon: <Video className="w-3.5 h-3.5" />, cls: 'bg-sky-50 text-sky-700 border-sky-200' };
  }
};

// Tự động chuyển link YouTube watch/youtu.be sang embed URL
const normalizeEmbedUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  return trimmed;
};

export const ManagerQuizCreatorPage: React.FC = () => {
  // Navigation Tabs
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
  const [examCheckpoints, setExamCheckpoints] = useState<string[]>([
    'Quy chuẩn tác phong chuẩn mực và chào đón 3 giây Aurora Look',
    'Thực hành an toàn lao động và xử lý tình huống phục vụ khách hàng',
  ]);
  const [checkpointInput, setCheckpointInput] = useState('');

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
        'Không sử dụng điện thoại cá nhân trong ca trực',
      ],
    },
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
  const [modStepInput, setModStepInput] = useState('');
  const [modSteps, setModSteps] = useState<string[]>([]);
  const [modNotes, setModNotes] = useState('');
  const [showAdvancedModFields, setShowAdvancedModFields] = useState(false);

  // =========================================================================
  // TAB 3: QUIZ CREATION STATE
  // =========================================================================
  const [selectedCourseForQuiz, setSelectedCourseForQuiz] = useState<string>(courses[0]?.id || '');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDuration, setQuizDuration] = useState<number>(15);
  const [quizPassScore, setQuizPassScore] = useState<number>(80);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);

  // Unified Creation Studio mode
  const [quizCreatorMode, setQuizCreatorMode] = useState<'ai' | 'manual'>('ai');

  // AI Generation
  const [topicPrompt, setTopicPrompt] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(4);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Manual Question Builder State
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualOptions, setManualOptions] = useState<string[]>(['', '', '', '']);
  const [manualCorrectIndex, setManualCorrectIndex] = useState<number>(0);
  const [manualExplanation, setManualExplanation] = useState('');

  // In-place Question Editing & Filtering
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQOptions, setEditQOptions] = useState<string[]>(['', '', '', '']);
  const [editQCorrectIndex, setEditQCorrectIndex] = useState<number>(0);
  const [editQExplanation, setEditQExplanation] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');

  // Collapsible question indexes
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set([0]));

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

  // Update quiz state cleanly when target course changes
  useEffect(() => {
    const targetCourse = courses.find(c => c.id === selectedCourseForQuiz);
    if (!targetCourse) return;

    const existingQuiz = quizzes.find(
      q => q.courseId === targetCourse.id || (targetCourse.quizId && q.id === targetCourse.quizId)
    );

    setEditingQuestionIdx(null);
    setQuestionSearch('');

    if (existingQuiz) {
      setQuizTitle(existingQuiz.title || `Bài Đánh Giá Nghiệp Vụ: ${targetCourse.title}`);
      setQuizDuration(existingQuiz.durationMinutes || 15);
      setQuizPassScore(existingQuiz.passScore || 80);
      setGeneratedQuestions(existingQuiz.questions || []);
      setExpandedQuestions(new Set(existingQuiz.questions?.length ? [0] : []));
    } else {
      setQuizTitle(`Bài Đánh Giá Nghiệp Vụ: ${targetCourse.title}`);
      setQuizDuration(15);
      setQuizPassScore(80);
      setGeneratedQuestions([]);
      setExpandedQuestions(new Set());
    }
  }, [selectedCourseForQuiz, courses, quizzes]);

  // Helper to get quiz for a course
  const getQuizForCourse = (course: Course): Quiz | undefined =>
    quizzes.find(q => q.courseId === course.id || (course.quizId && q.id === course.quizId));

  // =========================================================================
  // HANDLERS FOR COURSE LIST (TAB 1)
  // =========================================================================
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        (course.instructorName || '').toLowerCase().includes(q);

      const matchDept =
        selectedDeptFilter === 'all' ||
        (course.category || '').toLowerCase().includes(selectedDeptFilter.toLowerCase());

      const matchLevel = selectedLevelFilter === 'all' || course.level === selectedLevelFilter;

      return matchSearch && matchDept && matchLevel;
    });
  }, [courses, searchTerm, selectedDeptFilter, selectedLevelFilter]);

  const hasActiveFilters = searchTerm.trim() !== '' || selectedDeptFilter !== 'all' || selectedLevelFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDeptFilter('all');
    setSelectedLevelFilter('all');
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa khóa học "${title}"?`)) {
      await deleteCourseApi(id);
      const freshCourses = await fetchCourses();
      const freshQuizzes = await fetchQuizzes();
      setCourses(freshCourses);
      setQuizzes(freshQuizzes);
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
    setExamCheckpoints(
      course.examCheckpoints && course.examCheckpoints.length > 0
        ? course.examCheckpoints
        : [
            `Quy chuẩn tác phong chuẩn mực của ${course.category || 'rạp'} tại Aurora Cinema`,
            'Thực hành an toàn lao động và xử lý tình huống phục vụ khách hàng',
          ]
    );
    setCheckpointInput('');
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
    setExamCheckpoints([
      'Quy chuẩn tác phong chuẩn mực và chào đón 3 giây Aurora Look',
      'Thực hành an toàn lao động và xử lý tình huống phục vụ khách hàng',
    ]);
    setCheckpointInput('');
    setModules([
      {
        id: `m-${Date.now()}-1`,
        title: 'Chương 1: Quy chuẩn mở ca & vệ sinh trang thiết bị',
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/embed/iPAfLiNepws',
        duration: '15 phút',
        contentSummary: 'Tiêu chuẩn kiểm tra đầu ca, đồng phục và checklist thiết bị.',
        keyTakeaways: ['Kiểm tra an toàn điện & PCCC', 'Vệ sinh quầy theo tiêu chuẩn 5S'],
      },
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
    setModSteps([]);
    setModStepInput('');
    setModNotes('');
    setShowAdvancedModFields(false);
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
    setModSteps(mod.steps || []);
    setModStepInput('');
    setModNotes(mod.notes || '');
    setShowAdvancedModFields(Boolean((mod.steps && mod.steps.length > 0) || mod.notes));
    setModuleModalOpen(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) return;

    const moduleData: CourseModule = {
      id: editingModuleId || `m-${Date.now()}`,
      title: modTitle.trim(),
      contentType: modType,
      duration: modDuration.trim() || '15 phút',
      contentUrl: normalizeEmbedUrl(modUrl),
      contentSummary: modSummary.trim(),
      keyTakeaways: modTakeaways.length > 0 ? modTakeaways : [modTitle.trim()],
      steps: modSteps.length > 0 ? modSteps : undefined,
      notes: modNotes.trim() || undefined,
    };

    if (editingModuleId) {
      setModules(prev => prev.map(m => (m.id === editingModuleId ? moduleData : m)));
      showToast('Đã cập nhật nội dung bài giảng.', 'success');
    } else {
      setModules(prev => [...prev, moduleData]);
      showToast('Đã thêm bài giảng mới vào chương trình học.', 'success');
    }

    setModuleModalOpen(false);
  };

  const handleRemoveModule = (modId: string) => {
    if (modules.length <= 1) {
      showToast('Khóa học cần có ít nhất 1 bài giảng (Module).', 'error');
      return;
    }
    setModules(prev => prev.filter(m => m.id !== modId));
  };

  const handleMoveModule = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;
    setModules(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleAddTakeaway = () => {
    if (modTakeawayInput.trim()) {
      setModTakeaways(prev => [...prev, modTakeawayInput.trim()]);
      setModTakeawayInput('');
    }
  };

  const handleAddStep = () => {
    if (modStepInput.trim()) {
      setModSteps(prev => [...prev, modStepInput.trim()]);
      setModStepInput('');
    }
  };

  const handleAddCheckpoint = () => {
    if (checkpointInput.trim()) {
      setExamCheckpoints(prev => [...prev, checkpointInput.trim()]);
      setCheckpointInput('');
    }
  };

  const handleSaveFullCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim()) {
      showToast('Vui lòng nhập tên khóa học!', 'error');
      return;
    }
    if (modules.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 bài giảng cho khóa học!', 'error');
      return;
    }

    const existing = editingCourseId ? courses.find(c => c.id === editingCourseId) : undefined;
    const courseId = editingCourseId || `crs-${Date.now()}`;
    const newCourse: Course = {
      id: courseId,
      title: courseTitle.trim(),
      description:
        courseDescription.trim() ||
        `Khóa học chuyên môn nghiệp vụ ${courseCategory} chuẩn hóa toàn cụm rạp Aurora Cinema.`,
      category: courseCategory,
      level: courseLevel,
      durationMinutes: courseDuration || 45,
      isCtkm: courseLevel.includes('CTKM') || courseLevel.includes('Khuyến Mãi'),
      thumbnail: courseThumbnail || PRESET_THUMBNAILS[0].url,
      instructorName: instructorName.trim() || 'Phạm Thu Hương',
      instructorTitle: instructorTitle.trim() || 'Quản lý Đào tạo & Nhân sự Rạp',
      instructorAvatar:
        existing?.instructorAvatar ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      rating: existing?.rating || 4.9,
      reviewCount: existing?.reviewCount || 30,
      enrolledCount: existing?.enrolledCount || 0,
      completedCount: existing?.completedCount || 0,
      modules: modules,
      quizId: existing?.quizId || `quiz-${courseId}`,
      examCheckpoints:
        examCheckpoints.length > 0
          ? examCheckpoints
          : [
              `Quy chuẩn tác phong chuẩn mực của ${courseCategory} tại Aurora Cinema`,
              'Thực hành an toàn lao động và xử lý tình huống phục vụ khách hàng',
            ],
    };

    const { syncedToDb } = await saveCourseApi(newCourse, Boolean(editingCourseId));
    const fresh = syncedToDb ? await fetchCourses() : getCourses();
    setCourses(fresh);
    showToast(
      editingCourseId
        ? `Đã cập nhật khóa học "${newCourse.title}".`
        : `Đã lưu khóa học "${newCourse.title}".`,
      syncedToDb ? 'success' : 'info'
    );
    setActiveTab('list');
  };

  // Readiness checklist for Tab 2
  const courseReadiness = useMemo(() => {
    const checks = [
      { label: 'Tên khóa học rõ ràng', done: courseTitle.trim().length >= 5 },
      { label: 'Mô tả & mục tiêu đào tạo', done: courseDescription.trim().length >= 15 },
      { label: 'Ít nhất 1 bài giảng (Module)', done: modules.length >= 1 },
      { label: 'Ảnh bìa khóa học', done: Boolean(courseThumbnail.trim()) },
    ];
    const doneCount = checks.filter(c => c.done).length;
    return { checks, percent: Math.round((doneCount / checks.length) * 100) };
  }, [courseTitle, courseDescription, modules.length, courseThumbnail]);

  // =========================================================================
  // HANDLERS FOR QUIZ GENERATION & MANUAL QUESTIONS (TAB 3)
  // =========================================================================
  const handleGenerateWithAi = async () => {
    if (!topicPrompt.trim()) {
      showToast('Vui lòng nhập chủ đề hoặc yêu cầu nghiệp vụ cần AI tạo câu hỏi!', 'error');
      return;
    }
    setIsAiGenerating(true);

    try {
      const questions = await generateAiQuizFromTopic(topicPrompt, aiQuestionCount);
      if (questions && questions.length > 0) {
        const startIdx = generatedQuestions.length;
        setGeneratedQuestions(prev => [...prev, ...questions]);
        setExpandedQuestions(prev => {
          const next = new Set(prev);
          next.add(startIdx);
          return next;
        });
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
      showToast('Vui lòng điền đủ 4 phương án lựa chọn A, B, C, D!', 'error');
      return;
    }

    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      questionText: manualQuestionText.trim(),
      options: manualOptions.map(o => o.trim()),
      correctAnswerIndex: manualCorrectIndex,
      explanation: manualExplanation.trim() || 'Chuẩn quy trình vận hành SOP Aurora Cinema.',
    };

    const newIdx = generatedQuestions.length;
    setGeneratedQuestions(prev => [...prev, newQ]);
    setExpandedQuestions(prev => new Set(prev).add(newIdx));
    setManualQuestionText('');
    setManualOptions(['', '', '', '']);
    setManualCorrectIndex(0);
    setManualExplanation('');
    showToast('Đã thêm câu hỏi mới vào bộ đề!', 'success');
  };

  const handleStartEditQuestion = (idx: number, q: QuizQuestion) => {
    setEditingQuestionIdx(idx);
    setEditQText(q.questionText);
    setEditQOptions([...q.options, '', '', '', ''].slice(0, 4));
    setEditQCorrectIndex(q.correctAnswerIndex);
    setEditQExplanation(q.explanation || '');
    setExpandedQuestions(prev => new Set(prev).add(idx));
  };

  const handleSaveEditedQuestion = (idx: number) => {
    if (!editQText.trim() || editQOptions.some(o => !o.trim())) {
      showToast('Vui lòng nhập đầy đủ câu hỏi và 4 phương án!', 'error');
      return;
    }
    setGeneratedQuestions(prev =>
      prev.map((q, i) =>
        i === idx
          ? {
              ...q,
              questionText: editQText.trim(),
              options: editQOptions.map(o => o.trim()),
              correctAnswerIndex: editQCorrectIndex,
              explanation: editQExplanation.trim() || 'Chuẩn quy trình vận hành SOP Aurora Cinema.',
            }
          : q
      )
    );
    setEditingQuestionIdx(null);
    showToast(`Đã cập nhật Câu ${idx + 1}.`, 'success');
  };

  const handleDuplicateQuestion = (idx: number) => {
    const source = generatedQuestions[idx];
    if (!source) return;
    const copy: QuizQuestion = {
      ...source,
      id: `q-${Date.now()}-copy`,
      options: [...source.options],
    };
    setGeneratedQuestions(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    showToast(`Đã nhân bản Câu ${idx + 1}.`, 'info');
  };

  const handleMoveQuestion = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= generatedQuestions.length) return;
    setEditingQuestionIdx(null);
    setGeneratedQuestions(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handleSaveQuiz = async () => {
    if (generatedQuestions.length === 0) {
      showToast('Đề thi cần có ít nhất 1 câu hỏi trắc nghiệm!', 'error');
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
      questions: generatedQuestions,
    };

    const { quiz: persistedQuiz, syncedToDb } = await saveQuizApi(newQuiz);
    const updatedCourse: Course = {
      ...targetCourse,
      quizId: persistedQuiz.id,
    };
    saveCourse(updatedCourse);

    if (syncedToDb) {
      const [freshCourses, freshQuizzes] = await Promise.all([fetchCourses(), fetchQuizzes()]);
      setCourses(freshCourses);
      setQuizzes(freshQuizzes);
    } else {
      setQuizzes(getQuizzes());
      setCourses(getCourses());
    }

    showToast(
      `Đã lưu bộ đề thi (${generatedQuestions.length} câu).`,
      syncedToDb ? 'success' : 'info'
    );
    setActiveTab('list');
  };

  const toggleQuestion = (idx: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allQuestionsExpanded =
    generatedQuestions.length > 0 && expandedQuestions.size >= generatedQuestions.length;

  const handleToggleAllQuestions = () => {
    if (allQuestionsExpanded) {
      setExpandedQuestions(new Set());
    } else {
      setExpandedQuestions(new Set(generatedQuestions.map((_, i) => i)));
    }
  };

  const visibleQuestions = useMemo(() => {
    const q = questionSearch.toLowerCase().trim();
    return generatedQuestions
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!q) return true;
        return (
          item.questionText.toLowerCase().includes(q) ||
          item.options.some(o => o.toLowerCase().includes(q)) ||
          (item.explanation || '').toLowerCase().includes(q)
        );
      });
  }, [generatedQuestions, questionSearch]);

  const minCorrectNeeded =
    generatedQuestions.length > 0
      ? Math.ceil((generatedQuestions.length * quizPassScore) / 100)
      : 0;

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* ══════ Toast Notification ══════ */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ══════ Page Header ══════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Đào Tạo & Khảo Thí Nghiệp Vụ
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Xây dựng giáo trình chuẩn SOP và quản lý ngân hàng đề thi toàn cụm rạp Aurora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            {activeTab !== 'create_quiz' && (
              <button
                onClick={() => setActiveTab('create_quiz')}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Soạn Đề Thi</span>
              </button>
            )}
            <button
              onClick={handleStartCreateNewCourse}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tạo Khóa Học</span>
            </button>
          </div>
        </div>

        {/* Clean Underline Tab Bar */}
        <div className="px-6 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          {[
            {
              key: 'list' as const,
              label: 'Danh Sách Khóa Học',
              icon: BookOpen,
              badge: courses.length,
            },
            {
              key: 'create_course' as const,
              label: editingCourseId ? 'Chỉnh Sửa Khóa Học' : 'Thiết Lập Khóa Học',
              icon: Layers,
            },
            {
              key: 'create_quiz' as const,
              label: 'Ngân Hàng Đề Thi',
              icon: FileQuestion,
              badge: generatedQuestions.length > 0 ? generatedQuestions.length : undefined,
            },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-amber-500 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`min-w-[22px] px-1.5 py-0.5 rounded-full text-xs font-bold text-center ${
                      isActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: DANH SÁCH KHÓA HỌC                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'list' && (
        <div className="space-y-5">
          {/* Minimal KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              {
                label: 'Tổng khóa học',
                value: courses.length,
                sub: 'Đang hoạt động',
                icon: BookOpen,
                iconCls: 'bg-slate-100 text-slate-700',
              },
              {
                label: 'Khóa bắt buộc',
                value: courses.filter(c => c.level?.includes('Bắt Buộc')).length,
                sub: 'Chuẩn Onboarding',
                icon: CheckSquare,
                iconCls: 'bg-rose-50 text-rose-600',
              },
              {
                label: 'Tổng bài giảng',
                value: courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0),
                sub: 'Video SOP & Tài liệu',
                icon: Layers,
                iconCls: 'bg-amber-50 text-amber-600',
              },
              {
                label: 'Bộ đề khảo thí',
                value: quizzes.length,
                sub: `${quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0)} câu hỏi`,
                icon: FileCheck2,
                iconCls: 'bg-emerald-50 text-emerald-600',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3.5 shadow-xs"
              >
                <div className={`w-11 h-11 rounded-xl ${stat.iconCls} flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-slate-900 leading-none">{stat.value}</div>
                  <div className="text-xs font-semibold text-slate-600 mt-1">{stat.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên khóa học, nội dung hoặc giảng viên..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2.5">
                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer min-w-[165px]"
                >
                  <option value="all">Tất cả nghiệp vụ</option>
                  {CINEMA_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedLevelFilter}
                  onChange={e => setSelectedLevelFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer min-w-[170px]"
                >
                  <option value="all">Tất cả cấp độ</option>
                  {COURSE_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition cursor-pointer whitespace-nowrap"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Đang hiển thị <strong className="text-slate-800">{filteredCourses.length}</strong> / {courses.length} khóa học
                </span>
              </div>
            )}
          </div>

          {/* Clean Course List Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Subtle Table Header (Desktop) */}
            {filteredCourses.length > 0 && (
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Khóa học & Giảng viên</div>
                <div className="col-span-2">Nghiệp vụ</div>
                <div className="col-span-2">Quy mô</div>
                <div className="col-span-1">Đề thi</div>
                <div className="col-span-2 text-right">Thao tác</div>
              </div>
            )}

            {filteredCourses.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3.5">
                  <Film className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Không tìm thấy khóa học phù hợp</p>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Hãy thử từ khóa khác hoặc tạo khóa học mới cho bộ phận của bạn
                </p>
                <div className="flex items-center justify-center gap-2.5">
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm rounded-xl transition cursor-pointer"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                  <button
                    onClick={handleStartCreateNewCourse}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-xs transition cursor-pointer"
                  >
                    + Tạo Khóa Học Mới
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCourses.map(course => {
                  const linkedQuiz = getQuizForCourse(course);
                  const questionCount = linkedQuiz?.questions?.length || 0;

                  return (
                    <div
                      key={course.id}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50/70 transition group"
                    >
                      {/* Col 1-5: Thumbnail + Title + Instructor */}
                      <div className="md:col-span-5 flex items-center gap-3.5 min-w-0">
                        <div
                          onClick={() => setPreviewCourse(course)}
                          className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 cursor-pointer"
                        >
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setPreviewCourse(course)}
                            className="font-semibold text-slate-900 hover:text-amber-700 text-sm text-left line-clamp-1 transition cursor-pointer block max-w-full"
                          >
                            {course.title}
                          </button>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                            <span className="w-4.5 h-4.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {course.instructorName?.charAt(0) || 'G'}
                            </span>
                            <span className="truncate">{course.instructorName || 'Phạm Thu Hương'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Col 6-7: Category & Level */}
                      <div className="md:col-span-2 flex md:flex-col items-center md:items-start gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">{course.category}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border w-fit ${levelBadge(course.level)}`}
                        >
                          {course.level || 'Tiêu Chuẩn SOP'}
                        </span>
                      </div>

                      {/* Col 8-9: Modules & Duration */}
                      <div className="md:col-span-2 flex items-center md:flex-col md:items-start gap-3 md:gap-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {course.modules?.length || 0} bài giảng
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {course.durationMinutes} phút
                        </span>
                      </div>

                      {/* Col 10: Quiz Status */}
                      <div className="md:col-span-1">
                        {questionCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCourseForQuiz(course.id);
                              setActiveTab('create_quiz');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                            title="Mở & chỉnh sửa bộ đề thi"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{questionCount} câu</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCourseForQuiz(course.id);
                              setActiveTab('create_quiz');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap"
                            title="Tạo đề thi cho khóa học này"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tạo đề</span>
                          </button>
                        )}
                      </div>

                      {/* Col 11-12: Actions */}
                      <div className="md:col-span-2 flex items-center md:justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewCourse(course)}
                          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Xem giáo trình"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourseForQuiz(course.id);
                            setActiveTab('create_quiz');
                          }}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Soạn đề thi"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditCourseClick(course)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa khóa học"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa khóa học"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: TẠO / CHỈNH SỬA KHÓA HỌC                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'create_course' && (
        <form onSubmit={handleSaveFullCourse} className="space-y-6">
          {/* Two-column Workspace: Form (2/3) + Sticky Preview & Checklist (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              {/* SECTION 1: Thông tin cơ bản */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        {editingCourseId ? 'Thông Tin Khóa Học (Đang chỉnh sửa)' : 'Thông Tin Cơ Bản'}
                      </h2>
                      <p className="text-xs text-slate-500">Tên khóa học, phân loại bộ phận và giảng viên phụ trách</p>
                    </div>
                  </div>
                  {editingCourseId && (
                    <button
                      type="button"
                      onClick={handleStartCreateNewCourse}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg transition cursor-pointer"
                    >
                      + Tạo khóa mới
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Tên khóa học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nghiệp Vụ Quầy Box Ticket – Vận Hành Máy POS & Xử Lý Sự Cố"
                      value={courseTitle}
                      onChange={e => setCourseTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Nghiệp vụ áp dụng <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={courseCategory}
                        onChange={e => setCourseCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer"
                      >
                        {CINEMA_DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Cấp độ đào tạo
                      </label>
                      <select
                        value={courseLevel}
                        onChange={e => setCourseLevel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer"
                      >
                        {COURSE_LEVELS.map(lvl => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Thời lượng dự kiến (phút)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        value={courseDuration}
                        onChange={e => setCourseDuration(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Giảng viên / Trưởng ca phụ trách
                      </label>
                      <input
                        type="text"
                        value={instructorName}
                        onChange={e => setInstructorName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Chức danh giảng viên
                      </label>
                      <input
                        type="text"
                        value={instructorTitle}
                        onChange={e => setInstructorTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Mô tả khóa học & mục tiêu SOP
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tóm tắt mục tiêu khóa học, kỹ năng và tiêu chuẩn SOP học viên cần nắm vững..."
                      value={courseDescription}
                      onChange={e => setCourseDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none transition"
                    />
                  </div>

                  {/* Compact Thumbnail Picker */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-slate-400" />
                      Ảnh bìa khóa học
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PRESET_THUMBNAILS.map((preset, idx) => {
                        const selected = courseThumbnail === preset.url;
                        return (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setCourseThumbnail(preset.url)}
                            title={preset.name}
                            className={`relative rounded-xl overflow-hidden aspect-video border-2 transition cursor-pointer ${
                              selected
                                ? 'border-amber-500 ring-2 ring-amber-400/40'
                                : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                            {selected && (
                              <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="url"
                      placeholder="Hoặc dán đường dẫn ảnh bìa tùy chỉnh (https://...)"
                      value={courseThumbnail}
                      onChange={e => setCourseThumbnail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                  </div>
                </div>
              </section>

              {/* SECTION 2: Chương trình học & Bài giảng (Modules) */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Chương Trình Học ({modules.length} bài giảng)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Sắp xếp thứ tự các bài học nhân viên sẽ hoàn thành tuần tự
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddModule}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Thêm Bài Giảng</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {modules.map((mod, index) => {
                    const meta = contentTypeMeta(mod.contentType || 'video');
                    return (
                      <div
                        key={mod.id}
                        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3.5 hover:bg-slate-50/70 transition"
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-semibold text-slate-900 text-sm leading-snug">
                              {mod.title}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.cls}`}
                              >
                                {meta.icon}
                                {meta.label}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {mod.duration || '15 phút'}
                              </span>
                              {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                                <span className="text-slate-400">
                                  • {mod.keyTakeaways.length} điểm cốt lõi
                                </span>
                              )}
                              {mod.steps && mod.steps.length > 0 && (
                                <span className="text-slate-400">• {mod.steps.length} bước thực hành</span>
                              )}
                            </div>
                            {mod.contentSummary && (
                              <p className="text-xs text-slate-500 line-clamp-1 pt-0.5">
                                {mod.contentSummary}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Reorder + Edit + Delete */}
                        <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveModule(index, -1)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index === modules.length - 1}
                            onClick={() => handleMoveModule(index, 1)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModule(mod)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa bài giảng"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveModule(mod.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa bài giảng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SECTION 3: Tiêu chí sát hạch đầu ra (Checkpoints) */}
              <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Tiêu Chí Đánh Giá Đầu Ra ({examCheckpoints.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Các năng lực cốt lõi nhân viên cần đạt sau khi hoàn thành khóa học
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Thêm tiêu chí đánh giá (VD: Thao tác xuất vé POS dưới 30 giây)..."
                      value={checkpointInput}
                      onChange={e => setCheckpointInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCheckpoint();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleAddCheckpoint}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>

                  {examCheckpoints.length > 0 && (
                    <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                      {examCheckpoints.map((cp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-700"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{cp}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setExamCheckpoints(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Sticky Live Preview + Readiness */}
            <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
              {/* Live Course Preview */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Xem trước hiển thị
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Trực tiếp
                  </span>
                </div>

                <div>
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={courseThumbnail || PRESET_THUMBNAILS[0].url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-white text-xs font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {courseDuration} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        {modules.length} bài giảng
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        {courseCategory}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${levelBadge(courseLevel)}`}
                      >
                        {courseLevel}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {courseTitle.trim() || 'Tên khóa học sẽ hiển thị tại đây...'}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {courseDescription.trim() ||
                        'Mô tả ngắn gọn về mục tiêu đào tạo và quy trình SOP của khóa học.'}
                    </p>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {(instructorName || 'G').charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {instructorName || 'Giảng viên'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {instructorTitle || 'Phụ trách đào tạo'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Readiness Checklist */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mức độ hoàn thiện
                  </span>
                  <span className="text-xs font-bold text-amber-700">{courseReadiness.percent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${courseReadiness.percent}%` }}
                  />
                </div>
                <ul className="space-y-2 pt-1">
                  {courseReadiness.checks.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          item.done ? 'text-emerald-500' : 'text-slate-300'
                        }`}
                      />
                      <span className={item.done ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl shadow-xs transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>{editingCourseId ? 'Cập Nhật Khóa Học' : 'Lưu & Xuất Bản'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="w-full py-2 px-4 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl transition cursor-pointer"
                  >
                    Quay lại danh sách
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: SOẠN ĐỀ KHẢO THÍ & NGÂN HÀNG CÂU HỎI                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'create_quiz' && (
        <div className="space-y-6">
          {/* 1. Quiz Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Cấu Hình Bài Khảo Thí</h2>
                  <p className="text-xs text-slate-500">
                    Liên kết khóa học, thời gian làm bài và ngưỡng điểm đạt chuẩn
                  </p>
                </div>
              </div>

              {generatedQuestions.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
                  <span>
                    Đạt tối thiểu{' '}
                    <strong className="text-emerald-700">
                      {minCorrectNeeded}/{generatedQuestions.length} câu
                    </strong>{' '}
                    ({quizPassScore}%)
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>
                    ~{Math.max(0.5, Number((quizDuration / generatedQuestions.length).toFixed(1)))} phút/câu
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Khóa học áp dụng
                  </label>
                  <select
                    value={selectedCourseForQuiz}
                    onChange={e => setSelectedCourseForQuiz(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Thời gian (phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={90}
                    value={quizDuration}
                    onChange={e => setQuizDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Điểm chuẩn đạt (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={quizPassScore}
                    onChange={e => setQuizPassScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tiêu đề bài đánh giá
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  placeholder="VD: Bài Đánh Giá Nghiệp Vụ Box Ticket & POS"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* 2. Unified Question Creation Studio (Clean Segmented Switcher) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Thêm Câu Hỏi Mới</h3>
                <p className="text-xs text-slate-500">
                  Chọn tạo nhanh bằng trợ lý AI hoặc nhập thủ công chi tiết từng đáp án
                </p>
              </div>

              {/* Segmented Toggle */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setQuizCreatorMode('ai')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    quizCreatorMode === 'ai'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AI Soạn Đề</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuizCreatorMode('manual')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    quizCreatorMode === 'manual'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Soạn Thủ Công</span>
                </button>
              </div>
            </div>

            {/* MODE A: AI GENERATOR */}
            {quizCreatorMode === 'ai' && (
              <div className="p-6 space-y-4">
                {/* Quick Topic Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Gợi ý nhanh:</span>
                  {AI_QUICK_PROMPTS.map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTopicPrompt(chip.prompt)}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 text-xs font-medium transition cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  placeholder="Mô tả chủ đề hoặc dán nội dung quy trình SOP cần AI sinh câu hỏi trắc nghiệm..."
                  value={topicPrompt}
                  onChange={e => setTopicPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none transition"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Số lượng câu:</span>
                    {[3, 4, 6, 8].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAiQuestionCount(n)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          aiQuestionCount === n
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {n} câu
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateWithAi}
                    disabled={isAiGenerating || !topicPrompt.trim()}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      isAiGenerating || !topicPrompt.trim()
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-[0.98]'
                    }`}
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang khởi tạo câu hỏi...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Tạo {aiQuestionCount} Câu Hỏi Với AI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* MODE B: MANUAL BUILDER (Spacious 2x2 Options Grid) */}
            {quizCreatorMode === 'manual' && (
              <form onSubmit={handleAddManualQuestion} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Nội dung câu hỏi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nhiệt độ tiêu chuẩn của nồi nổ bắp Popcorn Popper tại Aurora Cinema là bao nhiêu?"
                    value={manualQuestionText}
                    onChange={e => setManualQuestionText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    4 Phương án lựa chọn{' '}
                    <span className="font-normal text-slate-400">
                      (bấm vào chữ A/B/C/D để chọn đáp án đúng)
                    </span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {manualOptions.map((opt, idx) => {
                      const isCorrect = manualCorrectIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-2.5 p-2 rounded-xl border transition ${
                            isCorrect
                              ? 'border-emerald-400 bg-emerald-50/50'
                              : 'border-slate-200 bg-white focus-within:border-amber-400'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setManualCorrectIndex(idx)}
                            title="Đặt làm đáp án đúng"
                            className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition cursor-pointer ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>
                          <input
                            type="text"
                            required
                            placeholder={`Nhập phương án ${String.fromCharCode(65 + idx)}...`}
                            value={opt}
                            onChange={e => {
                              const next = [...manualOptions];
                              next[idx] = e.target.value;
                              setManualOptions(next);
                            }}
                            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                          />
                          {isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mr-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Giải thích chuẩn SOP (hiển thị sau khi nhân viên nộp bài)
                    </label>
                    <input
                      type="text"
                      placeholder="Giải thích lý do đáp án đúng theo quy trình vận hành..."
                      value={manualExplanation}
                      onChange={e => setManualExplanation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl shadow-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Thêm Vào Đề</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. Questions Bank List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ListOrdered className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Danh Sách Câu Hỏi Trong Đề</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  {generatedQuestions.length} câu
                </span>
              </div>

              {generatedQuestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {generatedQuestions.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Lọc câu hỏi..."
                        value={questionSearch}
                        onChange={e => setQuestionSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-400 w-44"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleAllQuestions}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition cursor-pointer"
                  >
                    {allQuestionsExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ câu hỏi trong đề?')) {
                        setGeneratedQuestions([]);
                        setEditingQuestionIdx(null);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>

            {generatedQuestions.length === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <HelpCircle className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Bộ đề thi chưa có câu hỏi</p>
                <p className="text-xs text-slate-400 mt-1">
                  Hãy dùng AI Soạn Đề hoặc chuyển sang tab Soạn Thủ Công ở khung phía trên
                </p>
              </div>
            ) : visibleQuestions.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Không tìm thấy câu hỏi nào khớp với "{questionSearch}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleQuestions.map(({ item: q, idx: qIdx }) => {
                  const isExpanded = expandedQuestions.has(qIdx);
                  const isEditing = editingQuestionIdx === qIdx;

                  return (
                    <div key={q.id || qIdx} className="hover:bg-slate-50/40 transition">
                      {/* Question Summary Row */}
                      <div
                        className="px-6 py-4 flex items-start sm:items-center gap-3.5 cursor-pointer"
                        onClick={() => !isEditing && toggleQuestion(qIdx)}
                      >
                        <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {String(qIdx + 1).padStart(2, '0')}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 leading-snug">
                            {q.questionText}
                          </p>
                          {!isExpanded && !isEditing && (
                            <p className="text-xs text-emerald-700 mt-1 font-medium truncate">
                              Đáp án đúng: {String.fromCharCode(65 + q.correctAnswerIndex)}.{' '}
                              {q.options[q.correctAnswerIndex]}
                            </p>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={qIdx === 0}
                            onClick={() => handleMoveQuestion(qIdx, -1)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-25 cursor-pointer"
                            title="Lên trên"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={qIdx === generatedQuestions.length - 1}
                            onClick={() => handleMoveQuestion(qIdx, 1)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-25 cursor-pointer"
                            title="Xuống dưới"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(qIdx, q)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                            title="Sửa câu hỏi"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(qIdx)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                            title="Nhân bản câu hỏi"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (editingQuestionIdx === qIdx) setEditingQuestionIdx(null);
                              setGeneratedQuestions(prev => prev.filter((_, i) => i !== qIdx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleQuestion(qIdx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* In-place Editor */}
                      {isEditing && (
                        <div className="px-6 pb-5 sm:pl-[70px] space-y-3">
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Câu hỏi
                              </label>
                              <input
                                type="text"
                                value={editQText}
                                onChange={e => setEditQText(e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {editQOptions.map((opt, oIdx) => {
                                const isCorrect = editQCorrectIndex === oIdx;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                                      isCorrect
                                        ? 'border-emerald-400 bg-emerald-50/70'
                                        : 'border-slate-200 bg-white'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setEditQCorrectIndex(oIdx)}
                                      className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + oIdx)}
                                    </button>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={e => {
                                        const next = [...editQOptions];
                                        next[oIdx] = e.target.value;
                                        setEditQOptions(next);
                                      }}
                                      className="flex-1 bg-transparent text-sm text-slate-900 focus:outline-none"
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Giải thích SOP
                              </label>
                              <input
                                type="text"
                                value={editQExplanation}
                                onChange={e => setEditQExplanation(e.target.value)}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingQuestionIdx(null)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedQuestion(qIdx)}
                                className="px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                              >
                                Lưu chỉnh sửa
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expanded Read-only View */}
                      {isExpanded && !isEditing && (
                        <div className="px-6 pb-4 sm:pl-[70px] space-y-2.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctAnswerIndex === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  className={`px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2.5 border ${
                                    isCorrect
                                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 font-bold ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span className="flex-1 leading-snug">{opt}</span>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50/60 border border-amber-200/60 rounded-xl px-3.5 py-2.5">
                              <Award className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <span>
                                <strong className="text-amber-900">Giải thích SOP:</strong> {q.explanation}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Bar */}
            {generatedQuestions.length > 0 && (
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Sẵn sàng áp dụng bộ đề{' '}
                  <strong className="text-slate-800">{generatedQuestions.length} câu hỏi</strong> ({quizDuration}{' '}
                  phút • đạt ≥ {quizPassScore}%)
                </div>
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-xs transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Lưu Bộ Đề Thi ({generatedQuestions.length} Câu)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: XEM CHI TIẾT GIÁO TRÌNH                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {previewCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setPreviewCourse(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    {previewCourse.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${levelBadge(previewCourse.level)}`}
                  >
                    {previewCourse.level || 'Tiêu Chuẩn SOP'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {previewCourse.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewCourse(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div className="relative rounded-xl overflow-hidden aspect-[21/9] bg-slate-900">
                <img
                  src={previewCourse.thumbnail}
                  alt={previewCourse.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-3.5 left-4 right-4">
                  <p className="text-sm text-white/95 line-clamp-2 leading-relaxed">
                    {previewCourse.description}
                  </p>
                </div>
              </div>

              {/* Quick Metrics */}
              {(() => {
                const linkedQuiz = getQuizForCourse(previewCourse);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: Clock, label: 'Thời lượng', value: `${previewCourse.durationMinutes} phút` },
                      { icon: Layers, label: 'Bài giảng', value: `${previewCourse.modules?.length || 0} bài` },
                      { icon: Users, label: 'Học viên', value: `${previewCourse.enrolledCount || 0} NV` },
                      {
                        icon: FileQuestion,
                        label: 'Đề khảo thí',
                        value: linkedQuiz ? `${linkedQuiz.questions.length} câu` : 'Chưa tạo',
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5 text-center">
                        <item.icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                        <div className="text-sm font-bold text-slate-900">{item.value}</div>
                        <div className="text-[11px] text-slate-500">{item.label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Modules */}
              <div className="space-y-2.5">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-amber-600" />
                  Nội Dung Giáo Trình ({previewCourse.modules?.length || 0} bài)
                </h4>
                <div className="space-y-2.5">
                  {previewCourse.modules?.map((mod, idx) => (
                    <div
                      key={mod.id || idx}
                      className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm truncate">
                            {mod.title}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium shrink-0">
                          {mod.duration}
                        </span>
                      </div>
                      {mod.contentSummary && (
                        <p className="text-xs text-slate-600 pl-8.5 leading-relaxed">
                          {mod.contentSummary}
                        </p>
                      )}
                      {mod.keyTakeaways && mod.keyTakeaways.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-8.5 pt-0.5">
                          {mod.keyTakeaways.map((point, pIdx) => (
                            <span
                              key={pIdx}
                              className="text-[11px] bg-white text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md font-medium"
                            >
                              ✓ {point}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => {
                  const id = previewCourse.id;
                  setPreviewCourse(null);
                  setSelectedCourseForQuiz(id);
                  setActiveTab('create_quiz');
                }}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mở Bộ Đề Thi</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewCourse(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = previewCourse.id;
                    setPreviewCourse(null);
                    handleEditCourseClick(courses.find(c => c.id === targetId) || previewCourse);
                  }}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-xs transition cursor-pointer"
                >
                  Chỉnh Sửa Khóa Học
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUB-MODAL: THÊM / SỬA BÀI GIẢNG (MODULE)                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {moduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setModuleModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <Play className="w-4.5 h-4.5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingModuleId ? 'Chỉnh Sửa Bài Giảng' : 'Thêm Bài Giảng Mới'}
                </h3>
              </div>
              <button
                onClick={() => setModuleModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tiêu đề bài giảng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chương 2 – Tiêu chuẩn nổ bắp 32oz & áp suất CO2"
                  value={modTitle}
                  onChange={e => setModTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Hình thức
                  </label>
                  <select
                    value={modType}
                    onChange={e => setModType(e.target.value as CourseModule['contentType'])}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer"
                  >
                    <option value="video">Video SOP</option>
                    <option value="slide">Slide PDF</option>
                    <option value="document">Tài liệu hướng dẫn</option>
                    <option value="interactive">Thực hành tương tác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Thời lượng
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 15 phút"
                    value={modDuration}
                    onChange={e => setModDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Đường dẫn Video / Tài liệu{' '}
                  <span className="font-normal text-slate-400">(tự động chuyển link YouTube)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... hoặc link embed"
                  value={modUrl}
                  onChange={e => setModUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tóm tắt nội dung bài học
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả ngắn gọn nội dung chính và thao tác chuẩn..."
                  value={modSummary}
                  onChange={e => setModSummary(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Điểm lưu ý cốt lõi (Key Takeaways)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Nhập 1 quy tắc chuẩn và nhấn Enter..."
                    value={modTakeawayInput}
                    onChange={e => setModTakeawayInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTakeaway();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>

                {modTakeaways.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {modTakeaways.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium"
                      >
                        ✓ {item}
                        <button
                          type="button"
                          onClick={() => setModTakeaways(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsible Advanced SOP Details */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvancedModFields(v => !v)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <span>Chi tiết nâng cao (Các bước thực hành & Ghi chú SOP)</span>
                  {showAdvancedModFields ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvancedModFields && (
                  <div className="space-y-3 pt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Các bước thao tác chuẩn (Steps)
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="VD: Bước 1 – Kiểm tra nhiệt độ nồi trước khi đổ dầu..."
                          value={modStepInput}
                          onChange={e => setModStepInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddStep();
                            }
                          }}
                          className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={handleAddStep}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Thêm
                        </button>
                      </div>
                      {modSteps.length > 0 && (
                        <ol className="space-y-1.5">
                          {modSteps.map((st, sIdx) => (
                            <li
                              key={sIdx}
                              className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-lg text-xs text-slate-700"
                            >
                              <span>
                                <strong>{sIdx + 1}.</strong> {st}
                              </span>
                              <button
                                type="button"
                                onClick={() => setModSteps(prev => prev.filter((_, i) => i !== sIdx))}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        Ghi chú đặc biệt (Notes)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Lưu ý an toàn, lỗi thường gặp cần tránh..."
                        value={modNotes}
                        onChange={e => setModNotes(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-400 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModuleModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl shadow-xs transition active:scale-[0.98] cursor-pointer"
                >
                  {editingModuleId ? 'Cập Nhật Bài Giảng' : 'Lưu Bài Giảng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
