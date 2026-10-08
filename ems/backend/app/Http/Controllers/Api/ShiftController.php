<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\OpenAIService;

class ShiftController extends Controller
{
    protected OpenAIService $openAiService;

    public function __construct(OpenAIService $openAiService)
    {
        $this->openAiService = $openAiService;
    }

    /**
     * UC09: Đăng ký nguyện vọng lịch làm việc (Staff)
     */
    public function registerShiftPreference(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Đã ghi nhận nguyện vọng phân ca làm việc tuần tới!'
        ]);
    }

    /**
     * UC10: Xem lịch phân ca cá nhân (Staff)
     */
    public function getMySchedule(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                [
                    'date' => '2026-09-21',
                    'shift_name' => 'Ca Sáng (08:00 - 16:00)',
                    'location' => 'Cụm Rạp 1 - Quầy Vé',
                    'status' => 'assigned'
                ],
                [
                    'date' => '2026-09-23',
                    'shift_name' => 'Ca Chiều (15:30 - 23:00)',
                    'location' => 'Cụm Rạp 1 - Popcorn',
                    'status' => 'assigned'
                ]
            ]
        ]);
    }

    /**
     * UC11: Set lịch làm việc cho nhân viên & Kích hoạt AI Auto-Scheduler
     */
    public function autoScheduleWithAi(Request $request)
    {
        $targetDate = $request->input('target_date', '2026-09-21');
        $staffList = [
            ['id' => 'usr-1', 'name' => 'Nguyễn Văn Minh'],
            ['id' => 'usr-2', 'name' => 'Trần Thị Mai'],
            ['id' => 'usr-3', 'name' => 'Lê Hoàng Nam']
        ];

        $suggestions = $this->openAiService->generateShiftSuggestions($staffList, $targetDate);

        return response()->json([
            'status' => 'success',
            'message' => 'Trợ lý AI đã tự động phân bổ ca làm việc tối ưu cho toàn bộ nhân sự!',
            'data' => $suggestions
        ]);
    }
}
