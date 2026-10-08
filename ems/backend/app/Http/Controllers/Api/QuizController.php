<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\OpenAIService;

class QuizController extends Controller
{
    protected OpenAIService $openAiService;

    public function __construct(OpenAIService $openAiService)
    {
        $this->openAiService = $openAiService;
    }

    /**
     * UC06: Lấy danh sách bài kiểm tra hàng tháng
     */
    public function index()
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                [
                    'id' => 'quiz-1',
                    'title' => 'Bài Kiểm Tra Đánh Giá Nghiệp Vụ Hàng Tháng - Tháng 09/2026',
                    'course_title' => 'Quy Trình Chuẩn Phục Vụ Khách Hàng AURORA Standard 2026',
                    'pass_score' => 80,
                    'duration_minutes' => 15,
                    'is_ctkm' => false
                ],
                [
                    'id' => 'quiz-2',
                    'title' => 'Kiểm Tra Nghiệp Vụ CTKM Mùa Hè 2026',
                    'course_title' => 'CTKM Siêu Bão Mùa Hè 2026: Combo Popcorn X2 & Vé 1K Student',
                    'pass_score' => 80,
                    'duration_minutes' => 10,
                    'is_ctkm' => true
                ]
            ]
        ]);
    }

    /**
     * UC06: Nộp bài kiểm tra & chấm điểm tự động
     */
    public function submitAttempt(Request $request, $id)
    {
        $answers = $request->input('answers', []);
        $score = rand(80, 100); // Demo calculated score
        $passed = $score >= 80;

        return response()->json([
            'status' => 'success',
            'message' => $passed ? 'Chúc mừng! Bạn đã hoàn thành xuất sắc bài đánh giá!' : 'Bài kiểm tra chưa đạt điểm tối thiểu.',
            'data' => [
                'score' => $score,
                'passed' => $passed,
                'certificate_issued' => $passed,
                'certificate_code' => $passed ? 'AURORA-CERT-2026-' . rand(10000, 99999) : null
            ]
        ]);
    }

    /**
     * UC08: Tạo bài kiểm tra / khóa học CTKM tự động bằng OpenAI API
     */
    public function generateAiQuiz(Request $request)
    {
        $topicPrompt = $request->input('topic_prompt', 'Quy trình phục vụ bắp nước rạp phim');
        $questions = $this->openAiService->generateQuizQuestions($topicPrompt, 3);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã khởi tạo đề thi trắc nghiệm bằng OpenAI API thành công!',
            'data' => [
                'topic' => $topicPrompt,
                'questions_count' => count($questions),
                'questions' => $questions
            ]
        ]);
    }
}
