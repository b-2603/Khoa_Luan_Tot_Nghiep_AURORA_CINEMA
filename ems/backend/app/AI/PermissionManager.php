<?php

namespace App\AI;

/**
 * RBAC cho AI Tools. Vai trò luôn lấy từ CSDL (bảng users), KHÔNG tin vai trò client tự khai.
 */
class PermissionManager
{
    private const ALL = ['customer', 'staff', 'manager'];
    private const INTERNAL = ['staff', 'manager'];
    private const MANAGER = ['manager'];

    private const MAP = [
        'search_movies'          => self::ALL,
        'get_showtimes'          => self::ALL,
        'get_available_seats'    => self::ALL,
        'recommend_movies'       => self::ALL,
        'search_web'             => self::ALL,
        'get_booking'            => self::INTERNAL,
        'search_knowledge_base'  => self::INTERNAL,
        'get_equipment_status'   => self::INTERNAL,
        'get_pos_transaction'    => self::INTERNAL,
        'get_staff_schedule'     => self::INTERNAL,
        'get_training_progress'  => self::INTERNAL,
        'get_occupancy'          => self::INTERNAL,
        'cancel_booking'         => self::INTERNAL,
        'get_revenue'            => self::MANAGER,
        'get_top_movies'         => self::MANAGER,
        'generate_daily_report'  => self::MANAGER,
    ];

    public static function can(string $role, string $tool): bool
    {
        return in_array($role, self::MAP[$tool] ?? self::MANAGER, true);
    }

    /** Danh sách tool mà vai trò này được phép dùng (đưa cho LLM để không bị "cám dỗ" gọi tool vượt quyền) */
    public static function allowedTools(string $role): array
    {
        return array_keys(array_filter(self::MAP, fn($roles) => in_array($role, $roles, true)));
    }

    public static function denyMessage(string $tool): string
    {
        $need = self::MAP[$tool] ?? self::MANAGER;
        $label = in_array('staff', $need, true) ? 'nhân viên nội bộ' : 'Quản lý';
        return "Bạn không có quyền sử dụng chức năng này (yêu cầu quyền {$label}). Vui lòng liên hệ Quản lý ca nếu cần số liệu này.";
    }
}
