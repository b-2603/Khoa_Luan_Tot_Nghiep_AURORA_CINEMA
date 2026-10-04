<?php

class AdminController
{
    private $db;
    private $resources = array(
        'movies' => array('table' => 'movies', 'search' => array('title', 'format'), 'fields' => array('title', 'duration_minutes', 'age_rating', 'format', 'status')),
        'screens' => array('table' => 'screens', 'search' => array('screen_code', 'name'), 'fields' => array('theater_id', 'screen_code', 'name', 'screen_type', 'total_seats', 'projector_status', 'sound_system_status', 'hvac_temperature', 'lamp_hours', 'status')),
        'schedules' => array('table' => 'showtimes', 'search' => array(), 'fields' => array('screen_id', 'movie_id', 'start_time', 'end_time', 'show_date', 'booked_seats', 'total_seats', 'status')),
        'staff' => array('table' => 'staff_shifts', 'search' => array('staff_name', 'position'), 'fields' => array('staff_name', 'position', 'shift_name', 'start_time', 'end_time', 'status', 'work_date')),
        'ticket-types' => array('table' => 'ticket_types', 'search' => array('name', 'code'), 'fields' => array('name', 'code', 'price', 'description', 'status')),
        'products' => array('table' => 'products', 'search' => array('name', 'sku'), 'fields' => array('name', 'sku', 'category', 'price', 'stock_quantity', 'status')),
        'vouchers' => array('table' => 'vouchers', 'search' => array('name', 'code'), 'fields' => array('code', 'name', 'discount_type', 'discount_value', 'starts_at', 'ends_at', 'usage_limit', 'status')),
        'customers' => array('table' => 'customers', 'search' => array('full_name', 'phone', 'email'), 'fields' => array('full_name', 'phone', 'email', 'membership_level', 'points')),
        'theaters' => array('table' => 'theaters', 'search' => array('name', 'city'), 'fields' => array('name', 'address', 'city', 'phone', 'total_screens', 'status')),
        'promotions' => array('table' => 'vouchers', 'search' => array('name', 'code'), 'fields' => array('code', 'name', 'discount_type', 'discount_value', 'starts_at', 'ends_at', 'usage_limit', 'status')),
        'audit-logs' => array('table' => 'audit_logs', 'search' => array('username', 'action'), 'fields' => array('username', 'action', 'details', 'ip_address')),
        'system-configs' => array('table' => 'system_configs', 'search' => array('config_key'), 'fields' => array('config_key', 'config_value', 'description')),
        'transactions' => array('table' => 'transactions', 'search' => array('transaction_code', 'payment_method'), 'fields' => array('transaction_code', 'customer_id', 'channel', 'amount', 'payment_method', 'status')),
        'refunds' => array('table' => 'refunds', 'search' => array('reason', 'status'), 'fields' => array('transaction_id', 'reason', 'amount', 'status', 'requested_by')),
        'movie-plans' => array('table' => 'movie_plans', 'search' => array('plan_name', 'movie_title'), 'fields' => array('plan_code', 'plan_name', 'plan_month', 'plan_year', 'movie_id', 'movie_title', 'format', 'expected_start_date', 'expected_end_date', 'target_revenue', 'target_screenings_per_day', 'priority_level', 'status', 'note', 'created_by', 'created_at', 'approved_by', 'approved_at', 'updated_by', 'updated_at')),
        'movie-allocations' => array('table' => 'movie_allocations', 'search' => array('movie_title', 'theater_name'), 'fields' => array('plan_id', 'movie_id', 'movie_title', 'theater_id', 'theater_name', 'min_screenings_per_day', 'preferred_screen_types', 'allocated_start_date', 'allocated_end_date', 'status', 'confirmed_by', 'confirmed_at')),
    );

    public function __construct($db)
    {
        $this->db = $db;
    }

    // Kept as a named callback because the deployed WAMP server runs PHP 5.2,
    // which cannot parse anonymous functions.
    public static function compareScheduleSlots($left, $right)
    {
        return strcmp($left['start'], $right['start']);
    }

    // WAMP đang dùng PHP 5.2/MySQLi cũ, chưa có begin_transaction(),
    // commit() và rollback(). Dùng lệnh SQL để các thao tác ghi vẫn nguyên tử.
    private function beginDbTransaction()
    {
        return $this->db->query('START TRANSACTION');
    }

    private function commitDbTransaction()
    {
        return $this->db->query('COMMIT');
    }

    private function rollbackDbTransaction()
    {
        return $this->db->query('ROLLBACK');
    }

    public static function getRoleDefinitions()
    {
        return array(
            'super_admin' => array(
                'code' => 'super_admin',
                'name' => 'Admin Tổng (Super Admin)',
                'badge' => 'Super Admin',
                'color' => '#d97706',
                'bg' => '#fef3c7',
                'description' => 'Quản trị viên cấp cao nhất hệ thống AURORA CINEMA. Toàn quyền quản trị hệ thống, rạp, tài khoản nhân sự và phân quyền RBAC.',
                'can_manage_users' => true,
                'can_manage_settings' => true,
                'can_approve_refunds' => true,
                'can_view_financials' => true,
                'can_edit_screens' => true,
                'can_edit_movies' => true,
                'can_edit_pricing' => true,
            ),
            'cinema_admin' => array(
                'code' => 'cinema_admin',
                'name' => 'Admin Rạp (Cinema Manager)',
                'badge' => 'Cinema Admin',
                'color' => '#2563eb',
                'bg' => '#dbeafe',
                'description' => 'Quản lý toàn diện rạp chiếu: Suất chiếu, phim đang chiếu, phòng chiếu & thiết bị, hàng hóa F&B, nhân sự rạp và phê duyệt hoàn vé tại quầy.',
                'can_manage_users' => false,
                'can_manage_settings' => false,
                'can_approve_refunds' => true,
                'can_view_financials' => true,
                'can_edit_screens' => true,
                'can_edit_movies' => true,
                'can_edit_pricing' => false,
            ),
            'supervisor' => array(
                'code' => 'supervisor',
                'name' => 'Giám Sát Ca (Floor Supervisor)',
                'badge' => 'Supervisor',
                'color' => '#059669',
                'bg' => '#d1fae5',
                'description' => 'Điều hành trực tiếp ca trực rạp: Giám sát vận hành phòng chiếu (máy chiếu, điều hòa, âm thanh), điều phối suất chiếu, chấm công nhân sự và lập yêu cầu hoàn vé.',
                'can_manage_users' => false,
                'can_manage_settings' => false,
                'can_approve_refunds' => false,
                'can_view_financials' => false,
                'can_edit_screens' => true,
                'can_edit_movies' => false,
                'can_edit_pricing' => false,
            ),
            'accounting' => array(
                'code' => 'accounting',
                'name' => 'Kế Toán (Accounting & Finance)',
                'badge' => 'Accounting',
                'color' => '#7c3aed',
                'bg' => '#ede9fe',
                'description' => 'Quản lý tài chính, hạch toán doanh thu vé & F&B, đối soát kênh thanh toán (POS, Web, OTA), quản lý giá vé và đặc quyền kiểm duyệt hoàn tiền.',
                'can_manage_users' => false,
                'can_manage_settings' => false,
                'can_approve_refunds' => true,
                'can_view_financials' => true,
                'can_edit_screens' => false,
                'can_edit_movies' => false,
                'can_edit_pricing' => true,
            ),
        );
    }

    public static function normalizeRole($role)
    {
        if ($role === 'director') return 'super_admin';
        if ($role === 'manager') return 'cinema_admin';
        if ($role === 'technician') return 'supervisor';
        if (in_array($role, array('super_admin', 'cinema_admin', 'supervisor', 'accounting'), true)) {
            return $role;
        }
        return 'cinema_admin';
    }

    public static function getPermissionsMatrix()
    {
        return array(
            array(
                'module' => 'Tổng quan & Dashboard',
                'key' => 'dashboard',
                'super_admin' => 'Toàn bộ chỉ số doanh thu hệ thống, biểu đồ, tỷ lệ lấp đầy, top phim',
                'cinema_admin' => 'Chỉ số rạp phụ trách, suất chiếu, vé bán, doanh thu rạp',
                'supervisor' => 'Chỉ số ca trực, thiết bị phòng máy, nhiệt độ, suất chiếu đang chạy',
                'accounting' => 'Chỉ số dòng tiền, doanh thu theo kênh (POS/Web/OTA), công nợ, đối soát'
            ),
            array(
                'module' => 'Quản trị Phim (Movies)',
                'key' => 'movies',
                'super_admin' => 'Toàn quyền (Xem, Thêm, Sửa, Xóa phim)',
                'cinema_admin' => 'Xem và cập nhật trạng thái chiếu tại rạp',
                'supervisor' => 'Xem thông tin phim & thời lượng',
                'accounting' => 'Xem danh sách để đối soát doanh thu phim'
            ),
            array(
                'module' => 'Suất chiếu (Schedules)',
                'key' => 'schedules',
                'super_admin' => 'Toàn quyền (Tạo, Sửa, Khóa, Hủy suất chiếu)',
                'cinema_admin' => 'Lập lịch, đổi phòng chiếu, điều chỉnh giờ chiếu',
                'supervisor' => 'Xem lịch và cập nhật trạng thái suất chiếu (Bắt đầu/Kết thúc)',
                'accounting' => 'Xem suất chiếu đối soát số lượng vé bán'
            ),
            array(
                'module' => 'Phòng chiếu & Thiết bị (Screens)',
                'key' => 'screens',
                'super_admin' => 'Toàn quyền (Cấu hình phòng chiếu, sơ đồ ghế, thiết bị)',
                'cinema_admin' => 'Quản lý phòng chiếu, thiết lập bảo trì thiết bị',
                'supervisor' => 'Giám sát & điều chỉnh: Nhiệt độ HVAC, máy chiếu, âm thanh, dọn dẹp',
                'accounting' => 'Xem thông tin phòng chiếu phục vụ hạch toán tài sản'
            ),
            array(
                'module' => 'Loại vé & Giá vé (Ticket Types & Pricing)',
                'key' => 'ticket_types',
                'super_admin' => 'Toàn quyền duyệt và áp dụng chính sách giá vé',
                'cinema_admin' => 'Xem và áp dụng bảng giá vé tại rạp',
                'supervisor' => 'Xem bảng giá vé hỗ trợ bán vé quầy',
                'accounting' => 'Thiết lập bảng giá, hạch toán phụ thu, cơ cấu thuế giá vé'
            ),
            array(
                'module' => 'Hàng hóa / Bắp nước (F&B Concessions)',
                'key' => 'products',
                'super_admin' => 'Toàn quyền danh mục hàng hóa, bảng giá F&B',
                'cinema_admin' => 'Quản lý kho hàng rạp, kiểm tra hàng tồn',
                'supervisor' => 'Kiểm kê tồn kho tại quầy ca trực, báo cáo hao hụt',
                'accounting' => 'Quản lý giá vốn, giá bán, kiểm toán kho, đối soát xuất nhập tồn'
            ),
            array(
                'module' => 'Voucher / Khuyến mãi (Promotions)',
                'key' => 'vouchers',
                'super_admin' => 'Toàn quyền tạo chiến dịch khuyến mãi toàn hệ thống',
                'cinema_admin' => 'Tạo và áp dụng mã khuyến mãi tại rạp',
                'supervisor' => 'Tra cứu và xác thực voucher của khách hàng',
                'accounting' => 'Kiểm soát ngân sách giảm giá, đối soát chiết khấu khuyến mãi'
            ),
            array(
                'module' => 'Khách hàng & Hội viên (Customers)',
                'key' => 'customers',
                'super_admin' => 'Toàn quyền quản lý dữ liệu thành viên',
                'cinema_admin' => 'Xem và quản lý hội viên tại rạp',
                'supervisor' => 'Tra cứu điểm thưởng, hỗ trợ khách hàng tại quầy',
                'accounting' => 'Xem báo cáo điểm thưởng và tích lũy doanh thu khách'
            ),
            array(
                'module' => 'Nhân sự ca trực (Staff & Shifts)',
                'key' => 'staff',
                'super_admin' => 'Toàn quyền phân công nhân sự các rạp',
                'cinema_admin' => 'Lập lịch ca trực, phân công nhân viên rạp',
                'supervisor' => 'Điểm danh, check-in / check-out nhân viên ca trực',
                'accounting' => 'Xem dữ liệu chấm công để hạch toán chi phí lương'
            ),
            array(
                'module' => 'Giao dịch & Hoàn tiền (Transactions & Refunds)',
                'key' => 'transactions_refunds',
                'super_admin' => 'Toàn quyền tra cứu giao dịch & duyệt hoàn tiền mọi hạn mức',
                'cinema_admin' => 'Tra cứu đơn hàng, phê duyệt hoàn vé tại rạp',
                'supervisor' => 'Tra cứu giao dịch, lập yêu cầu hoàn tiền sự cố (chờ duyệt)',
                'accounting' => 'Đặc quyền kiểm duyệt hoàn tiền, đối soát dòng tiền POS/Web/OTA'
            ),
            array(
                'module' => 'Báo cáo & Thống kê (Reports)',
                'key' => 'reports',
                'super_admin' => 'Xem và xuất tất cả báo cáo tài chính, hiệu suất, đối soát',
                'cinema_admin' => 'Báo cáo doanh thu rạp, tỷ lệ ghế lấp đầy, suất chiếu',
                'supervisor' => 'Báo cáo ca trực (vé bán, lượng khách, sự cố thiết bị)',
                'accounting' => 'Toàn quyền báo cáo doanh thu tài chính chuyên sâu, xuất Excel/PDF'
            ),
            array(
                'module' => 'Quản lý Tài khoản TMS (User Management)',
                'key' => 'users',
                'super_admin' => 'Đặc quyền: Tạo, sửa, khóa, cấp vai trò cho tất cả User TMS',
                'cinema_admin' => 'Xem danh sách nhân sự tại rạp',
                'supervisor' => 'Không có quyền truy cập',
                'accounting' => 'Không có quyền truy cập'
            ),
            array(
                'module' => 'Cài đặt hệ thống (System Settings)',
                'key' => 'settings',
                'super_admin' => 'Đặc quyền cấu hình hệ thống máy chủ, kết nối TMS',
                'cinema_admin' => 'Không có quyền truy cập',
                'supervisor' => 'Không có quyền truy cập',
                'accounting' => 'Không có quyền truy cập'
            ),
        );
    }

    private function getCurrentRole()
    {
        if (empty($_SESSION['tms_user']['role'])) {
            return null;
        }
        return self::normalizeRole($_SESSION['tms_user']['role']);
    }

    /** Return the cinema explicitly assigned to the signed-in operational user.
     * Never fall back to "all cinemas": an unassigned cinema account must not
     * be able to read another cinema's rooms or showtimes. */
    private function getCurrentTheaterId()
    {
        if (!empty($_SESSION['tms_user']['theater_id'])) return (int)$_SESSION['tms_user']['theater_id'];
        $username = !empty($_SESSION['tms_user']['username']) ? $this->db->real_escape_string($_SESSION['tms_user']['username']) : '';
        if ($username === '') return 0;
        $tmsColumn = $this->db->query("SHOW COLUMNS FROM tms_users LIKE 'theater_id'");
        $fromTms = ($tmsColumn && $tmsColumn->num_rows) ? (int)$this->scalar("SELECT theater_id FROM tms_users WHERE username='{$username}' LIMIT 1") : 0;
        $fromUsers = (int)$this->scalar("SELECT theater_id FROM users WHERE username='{$username}' LIMIT 1");
        $theaterId = $fromTms > 0 ? $fromTms : $fromUsers;
        if ($theaterId > 0) $_SESSION['tms_user']['theater_id'] = $theaterId;
        return $theaterId;
    }

    private function ensureCinemaOwnershipSchema()
    {
        // Ownership is persisted in aurora_db, not inferred from screen names.
        // This migration is safe for existing installations and is intentionally
        // compatible with old MySQL versions used by WAMP.
        $columns = array(
            'users' => array('theater_id' => 'BIGINT UNSIGNED NULL'),
            'screens' => array('theater_id' => 'BIGINT UNSIGNED NULL')
        );
        foreach ($columns as $table => $defs) foreach ($defs as $column => $definition) {
            $exists = $this->db->query("SHOW COLUMNS FROM {$table} LIKE '{$column}'");
            if (!$exists || $exists->num_rows === 0) $this->db->query("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
        }
        $screenIndex = $this->db->query("SHOW INDEX FROM screens WHERE Key_name='idx_screens_theater_scope'");
        if (!$screenIndex || $screenIndex->num_rows === 0) $this->db->query("CREATE INDEX idx_screens_theater_scope ON screens (theater_id, status)");
        $userIndex = $this->db->query("SHOW INDEX FROM users WHERE Key_name='idx_users_theater_scope'");
        if (!$userIndex || $userIndex->num_rows === 0) $this->db->query("CREATE INDEX idx_users_theater_scope ON users (theater_id, role, status)");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_cinema_scope_audits (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            actor_username VARCHAR(120) NOT NULL,
            action_name VARCHAR(80) NOT NULL,
            theater_id BIGINT UNSIGNED NULL,
            screen_id BIGINT UNSIGNED NULL,
            detail VARCHAR(500) NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_scope_audit_theater (theater_id), KEY idx_scope_audit_screen (screen_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        // One business-friendly convention throughout aurora_db: room names
        // are simply “Phòng 01”, “Phòng 02”, ... inside each cinema.  Technical
        // format/details remain in screen_type and never clutter user-facing
        // selections. Seat counts are deliberately untouched.
        $needsRename = $this->scalar("SELECT COUNT(*) FROM screens WHERE name LIKE '% - %'");
        if ((int)$needsRename > 0) {
            $rooms = $this->rows("SELECT id, theater_id FROM screens WHERE theater_id IS NOT NULL ORDER BY theater_id ASC, id ASC");
            $roomNumbers = array();
            foreach ($rooms as $room) {
                $theaterId = (int)$room['theater_id'];
                if (!isset($roomNumbers[$theaterId])) $roomNumbers[$theaterId] = 0;
                $roomNumbers[$theaterId]++;
                $roomName = 'Phòng ' . str_pad((string)$roomNumbers[$theaterId], 2, '0', STR_PAD_LEFT);
                $this->db->query("UPDATE screens SET name='".$this->db->real_escape_string($roomName)."' WHERE id=".(int)$room['id']);
            }
        }
        // The aggregate is controlled by rooms, never manually entered.
        $theaters = $this->rows("SELECT id FROM theaters");
        foreach ($theaters as $theater) {
            $theaterId = (int)$theater['id'];
            $count = (int)$this->scalar("SELECT COUNT(*) FROM screens WHERE theater_id={$theaterId}");
            $this->db->query("UPDATE theaters SET total_screens={$count} WHERE id={$theaterId}");
        }
    }

    /**
     * Central ticket price matrix.  Pricing belongs to Aurora DB rather than
     * being calculated in the browser so POS, website and TMS always use one
     * approved source of truth.
     */
    private function ensureTicketPricingSchema()
    {
        $pricingColumn = $this->db->query("SHOW COLUMNS FROM ticket_types LIKE 'pricing_enabled'");
        if (!$pricingColumn || $pricingColumn->num_rows === 0) $this->db->query("ALTER TABLE ticket_types ADD COLUMN pricing_enabled TINYINT(1) NOT NULL DEFAULT 0");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_ticket_price_matrix (
            ticket_type_id BIGINT UNSIGNED NOT NULL,
            day_type VARCHAR(20) NOT NULL,
            time_slot VARCHAR(20) NOT NULL,
            price DECIMAL(12,0) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            updated_by VARCHAR(120) NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (ticket_type_id, day_type, time_slot),
            KEY idx_ticket_price_lookup (day_type, time_slot, is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_ticket_price_audits (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            ticket_type_id BIGINT UNSIGNED NOT NULL,
            actor_username VARCHAR(120) NOT NULL,
            old_matrix TEXT NULL,
            new_matrix TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_ticket_price_audit_type (ticket_type_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_ticket_price_metadata (
            ticket_type_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
            category VARCHAR(60) NOT NULL DEFAULT 'standard',
            eligibility_note VARCHAR(500) NULL,
            purchase_limit INT UNSIGNED NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_holiday_dates (
            holiday_date DATE NOT NULL PRIMARY KEY,
            holiday_name VARCHAR(120) NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("INSERT IGNORE INTO tms_holiday_dates (holiday_date, holiday_name, is_active, updated_at) VALUES
            ('2026-01-01','Tết Dương lịch',1,NOW()),('2026-04-30','Ngày Giải phóng miền Nam',1,NOW()),
            ('2026-05-01','Quốc tế Lao động',1,NOW()),('2026-09-02','Quốc khánh',1,NOW())");

        $definitions = array(
            array('TICKET_REGULAR', 'Vé thường', 90000, 'Vé tiêu chuẩn áp dụng cho khách hàng phổ thông.'),
            array('TICKET_CHILD', 'Vé trẻ em', 60000, 'Áp dụng cho trẻ em theo điều kiện của rạp.'),
            array('TICKET_STUDENT', 'Vé học sinh sinh viên', 70000, 'Yêu cầu xuất trình thẻ học sinh, sinh viên hợp lệ.'),
            array('TICKET_INVITATION', 'Vé Invitation', 0, 'Vé mời theo danh sách được phê duyệt.'),
            array('TICKET_STAFF_A', 'Vé Staff A', 30000, 'Ưu đãi nội bộ nhóm Staff A.'),
            array('TICKET_STAFF_B', 'Vé Staff B', 50000, 'Ưu đãi nội bộ nhóm Staff B.'),
            array('TICKET_COUPLE', 'Vé ghế đôi', 220000, 'Giá cho một cặp ghế đôi.')
        );
        foreach ($definitions as $definition) {
            $code = $this->db->real_escape_string($definition[0]);
            $name = $this->db->real_escape_string($definition[1]);
            $price = (int)$definition[2];
            $description = $this->db->real_escape_string($definition[3]);
            // INSERT IGNORE preserves every price that has been approved before.
            $this->db->query("INSERT IGNORE INTO ticket_types (code, name, price, description, status, pricing_enabled) VALUES ('{$code}', '{$name}', {$price}, '{$description}', 'active', 1)");
            $this->db->query("UPDATE ticket_types SET pricing_enabled=1 WHERE code='{$code}'");
        }
        // Retire the old holiday-ticket product without deleting historical
        // showtime links used for reconciliation. It is no longer selectable
        // or returned by the pricing API.
        $holidayTicketId = (int)$this->scalar("SELECT id FROM ticket_types WHERE code='TICKET_HOLIDAY' LIMIT 1");
        if ($holidayTicketId > 0) {
            $this->db->query("UPDATE ticket_types SET status='inactive', pricing_enabled=0, updated_at=NOW() WHERE id={$holidayTicketId}");
            $this->db->query("UPDATE tms_ticket_price_matrix SET is_active=0, updated_at=NOW() WHERE ticket_type_id={$holidayTicketId}");
        }

        $defaults = array(
            'TICKET_REGULAR' => array('weekday'=>array(75000,90000,105000), 'weekend'=>array(90000,105000,120000), 'holiday'=>array(115000,130000,145000)),
            'TICKET_CHILD' => array('weekday'=>array(50000,60000,65000), 'weekend'=>array(60000,70000,75000), 'holiday'=>array(70000,80000,85000)),
            'TICKET_STUDENT' => array('weekday'=>array(60000,70000,80000), 'weekend'=>array(70000,80000,90000), 'holiday'=>array(80000,90000,100000)),
            'TICKET_INVITATION' => array('weekday'=>array(0,0,0), 'weekend'=>array(0,0,0), 'holiday'=>array(0,0,0)),
            'TICKET_STAFF_A' => array('weekday'=>array(25000,30000,35000), 'weekend'=>array(30000,35000,40000), 'holiday'=>array(35000,40000,45000)),
            'TICKET_STAFF_B' => array('weekday'=>array(40000,50000,60000), 'weekend'=>array(50000,60000,70000), 'holiday'=>array(60000,70000,80000)),
            'TICKET_COUPLE' => array('weekday'=>array(180000,220000,250000), 'weekend'=>array(220000,250000,280000), 'holiday'=>array(260000,290000,320000))
        );
        $slots = array('morning', 'standard', 'evening');
        foreach ($defaults as $code => $days) {
            $ticketId = (int)$this->scalar("SELECT id FROM ticket_types WHERE code='".$this->db->real_escape_string($code)."' LIMIT 1");
            if ($ticketId <= 0) continue;
            foreach ($days as $day => $prices) foreach ($slots as $index => $slot) {
                $price = (int)$prices[$index];
                $this->db->query("INSERT IGNORE INTO tms_ticket_price_matrix (ticket_type_id, day_type, time_slot, price, is_active, updated_at) VALUES ({$ticketId}, '{$day}', '{$slot}', {$price}, 1, NOW())");
            }
        }
        // Internal Staff tickets are complimentary. Availability is a business
        // rule stored in the matrix: Staff A is unavailable on public holidays;
        // Staff B is only valid Monday through Friday.
        $staffAId = (int)$this->scalar("SELECT id FROM ticket_types WHERE code='TICKET_STAFF_A' LIMIT 1");
        $staffBId = (int)$this->scalar("SELECT id FROM ticket_types WHERE code='TICKET_STAFF_B' LIMIT 1");
        if ($staffAId > 0) {
            $this->db->query("UPDATE ticket_types SET price=0, updated_at=NOW() WHERE id={$staffAId}");
            $this->db->query("UPDATE tms_ticket_price_matrix SET price=0, is_active=IF(day_type='holiday',0,1), updated_at=NOW() WHERE ticket_type_id={$staffAId}");
        }
        if ($staffBId > 0) {
            $this->db->query("UPDATE ticket_types SET price=0, updated_at=NOW() WHERE id={$staffBId}");
            $this->db->query("UPDATE tms_ticket_price_matrix SET price=0, is_active=IF(day_type='weekday',1,0), updated_at=NOW() WHERE ticket_type_id={$staffBId}");
        }
    }

    public function ticketPricingPolicies()
    {
        $this->ensureTicketPricingSchema();
        requireAdmin();
        $codes = "'TICKET_REGULAR','TICKET_CHILD','TICKET_STUDENT','TICKET_INVITATION','TICKET_STAFF_A','TICKET_STAFF_B','TICKET_COUPLE'";
        $types = $this->rows("SELECT t.id, t.code, t.name, t.price, t.description, t.status, COALESCE(md.category,'standard') category, COALESCE(md.eligibility_note,'') eligibility_note, md.purchase_limit FROM ticket_types t LEFT JOIN tms_ticket_price_metadata md ON md.ticket_type_id=t.id WHERE t.pricing_enabled=1 AND t.status='active' ORDER BY FIELD(t.code, {$codes}), t.name");
        $matrixRows = $this->rows("SELECT p.ticket_type_id, p.day_type, p.time_slot, p.price, p.is_active, p.updated_at, p.updated_by FROM tms_ticket_price_matrix p INNER JOIN ticket_types t ON t.id=p.ticket_type_id WHERE t.pricing_enabled=1 AND t.status='active' ORDER BY t.id, p.day_type, p.time_slot");
        $matrix = array();
        foreach ($matrixRows as $row) {
            $id = (int)$row['ticket_type_id'];
            if (!isset($matrix[$id])) $matrix[$id] = array();
            if (!isset($matrix[$id][$row['day_type']])) $matrix[$id][$row['day_type']] = array();
            // -1 is intentionally returned to the client for an unavailable
            // cell; zero remains a valid complimentary ticket price.
            $matrix[$id][$row['day_type']][$row['time_slot']] = (int)$row['is_active'] ? (int)$row['price'] : -1;
        }
        foreach ($types as &$type) {
            $type['id'] = (int)$type['id']; $type['price'] = (int)$type['price'];
            $type['matrix'] = isset($matrix[$type['id']]) ? $matrix[$type['id']] : array();
        }
        unset($type);
        jsonResponse(array('success' => true, 'data' => array('types' => $types, 'can_edit' => $this->getCurrentRole() === 'super_admin')));
    }

    public function saveTicketPricingPolicy()
    {
        requireAdmin();
        if ($this->getCurrentRole() !== 'super_admin') jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng có quyền ban hành chính sách giá.'), 403);
        $this->ensureTicketPricingSchema();
        $input = requestJson(); $ticketId = isset($input['ticket_type_id']) ? (int)$input['ticket_type_id'] : 0;
        $isCreate = isset($input['mode']) && $input['mode'] === 'create';
        $prices = isset($input['prices']) && is_array($input['prices']) ? $input['prices'] : array();
        if ((!$isCreate && $ticketId <= 0) || !$prices) jsonResponse(array('success' => false, 'message' => 'Thiếu loại vé hoặc bảng giá cần cập nhật.'), 400);
        // Validate the complete matrix before creating anything. This prevents
        // a half-created ticket type if a client submits an incomplete price grid.
        $days = array('weekday','weekend','holiday'); $slots = array('morning','standard','evening'); $clean = array();
        foreach ($days as $day) foreach ($slots as $slot) {
            if (!isset($prices[$day][$slot]) || !is_numeric($prices[$day][$slot])) jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập đủ giá cho từng khung giờ.'), 400);
            $value = (int)$prices[$day][$slot];
            if ($value < 0 || $value > 3000000) jsonResponse(array('success' => false, 'message' => 'Mức giá phải từ 0 đến 3.000.000 ₫.'), 400);
            $clean[$day][$slot] = $value;
        }
        $newTicket = array();
        if ($isCreate) {
            $name = trim(isset($input['name']) ? (string)$input['name'] : '');
            $code = strtoupper(trim(isset($input['code']) ? (string)$input['code'] : ''));
            $description = trim(isset($input['description']) ? (string)$input['description'] : '');
            $category = trim(isset($input['category']) ? (string)$input['category'] : 'standard');
            $eligibility = trim(isset($input['eligibility_note']) ? (string)$input['eligibility_note'] : '');
            $limit = isset($input['purchase_limit']) && $input['purchase_limit'] !== '' ? (int)$input['purchase_limit'] : 0;
            if (mb_strlen($name, 'UTF-8') < 3 || mb_strlen($name, 'UTF-8') > 100) jsonResponse(array('success'=>false,'message'=>'Tên loại vé cần từ 3 đến 100 ký tự.'),400);
            if (!preg_match('/^TICKET_[A-Z0-9_]{3,32}$/', $code)) jsonResponse(array('success'=>false,'message'=>'Mã vé phải có dạng TICKET_TEN_VE, chỉ gồm chữ in hoa, số và dấu gạch dưới.'),400);
            if (in_array($code, array('TICKET_HOLIDAY','TICKET_STAFF_A','TICKET_STAFF_B'), true)) jsonResponse(array('success'=>false,'message'=>'Mã vé này thuộc chính sách hệ thống và không thể tạo lại.'),400);
            if ((int)$this->scalar("SELECT COUNT(*) FROM ticket_types WHERE code='".$this->db->real_escape_string($code)."'") > 0) jsonResponse(array('success'=>false,'message'=>'Mã vé đã tồn tại trong Aurora DB.'),400);
            if (!in_array($category, array('standard','discount','member','special'), true)) jsonResponse(array('success'=>false,'message'=>'Nhóm vé không hợp lệ.'),400);
            if ($limit < 0 || $limit > 99) jsonResponse(array('success'=>false,'message'=>'Giới hạn mua phải từ 1 đến 99 vé, hoặc để trống.'),400);
            $newTicket = array(
                'name' => $this->db->real_escape_string($name), 'code' => $this->db->real_escape_string($code),
                'description' => $this->db->real_escape_string(substr($description,0,255)),
                'category' => $this->db->real_escape_string($category), 'eligibility' => $this->db->real_escape_string(substr($eligibility,0,500)),
                'limit' => $limit > 0 ? (string)$limit : 'NULL'
            );
        }
        $actor = $this->db->real_escape_string(isset($_SESSION['tms_user']['username']) ? $_SESSION['tms_user']['username'] : 'system');
        if (!$this->db->query('START TRANSACTION')) jsonResponse(array('success'=>false,'message'=>'Không thể bắt đầu cập nhật giá.'),500);
        try {
            if ($isCreate) {
                if (!$this->db->query("INSERT INTO ticket_types (code,name,price,description,status,pricing_enabled,created_at,updated_at) VALUES ('{$newTicket['code']}','{$newTicket['name']}',0,'{$newTicket['description']}','active',1,NOW(),NOW())")) throw new Exception($this->db->error);
                $ticketId = (int)$this->db->insert_id;
                if ($ticketId <= 0) throw new Exception('Không nhận được mã loại vé mới.');
                if (!$this->db->query("INSERT INTO tms_ticket_price_metadata (ticket_type_id,category,eligibility_note,purchase_limit,updated_at) VALUES ({$ticketId},'{$newTicket['category']}','{$newTicket['eligibility']}',{$newTicket['limit']},NOW())")) throw new Exception($this->db->error);
            }
            $ticketRecord = $this->rows("SELECT code, pricing_enabled FROM ticket_types WHERE id={$ticketId} LIMIT 1");
            $ticketCode = !empty($ticketRecord) ? (string)$ticketRecord[0]['code'] : '';
            $allowed = !empty($ticketRecord) && (int)$ticketRecord[0]['pricing_enabled'] === 1 && $ticketCode !== 'TICKET_HOLIDAY';
            if (!$allowed) throw new Exception('Loại vé không thuộc chính sách giá Aurora.');
            $oldRows = $this->rows("SELECT day_type, time_slot, price FROM tms_ticket_price_matrix WHERE ticket_type_id={$ticketId}");
            foreach ($days as $day) foreach ($slots as $slot) {
                $unavailable = ($ticketCode === 'TICKET_STAFF_A' && $day === 'holiday') || ($ticketCode === 'TICKET_STAFF_B' && $day !== 'weekday');
                $value = in_array($ticketCode, array('TICKET_STAFF_A','TICKET_STAFF_B'), true) ? 0 : $clean[$day][$slot];
                $active = $unavailable ? 0 : 1;
                if (!$this->db->query("INSERT INTO tms_ticket_price_matrix (ticket_type_id, day_type, time_slot, price, is_active, updated_by, updated_at) VALUES ({$ticketId}, '{$day}', '{$slot}', {$value}, {$active}, '{$actor}', NOW()) ON DUPLICATE KEY UPDATE price={$value}, is_active={$active}, updated_by='{$actor}', updated_at=NOW()")) throw new Exception($this->db->error);
            }
            $standard = in_array($ticketCode, array('TICKET_STAFF_A','TICKET_STAFF_B'), true) ? 0 : $clean['weekday']['standard'];
            if (!$this->db->query("UPDATE ticket_types SET price={$standard}, updated_at=NOW() WHERE id={$ticketId}")) throw new Exception($this->db->error);
            $old = $this->db->real_escape_string(json_encode($oldRows)); $new = $this->db->real_escape_string(json_encode($clean));
            if (!$this->db->query("INSERT INTO tms_ticket_price_audits (ticket_type_id, actor_username, old_matrix, new_matrix, created_at) VALUES ({$ticketId}, '{$actor}', '{$old}', '{$new}', NOW())")) throw new Exception($this->db->error);
            if (!$this->db->query('COMMIT')) throw new Exception($this->db->error);
        } catch (Exception $e) { $this->db->query('ROLLBACK'); jsonResponse(array('success'=>false,'message'=>'Không thể lưu chính sách giá: '.$e->getMessage()),500); }
        jsonResponse(array('success' => true, 'message' => $isCreate ? 'Đã tạo loại vé và ban hành bảng giá vào Aurora DB.' : 'Đã ban hành bảng giá mới vào Aurora DB.', 'data'=>array('ticket_type_id'=>$ticketId)));
    }

    private function enforceCinemaScope($alias = '')
    {
        $role = $this->getCurrentRole();
        if (!in_array($role, array('cinema_admin', 'supervisor'), true)) return '';
        $theaterId = $this->getCurrentTheaterId();
        if ($theaterId <= 0) jsonResponse(array('success' => false, 'message' => 'Tài khoản rạp chưa được gán rạp phụ trách. Vui lòng liên hệ Admin Tổng để gán phạm vi rạp.'), 403);
        return ($alias !== '' ? $alias.'.' : '') . 'theater_id = ' . $theaterId;
    }

    public function dashboard()
    {
        $role = $this->getCurrentRole();
        $reportDate = !empty($_GET['date']) && preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $_GET['date']) ? $_GET['date'] : date('Y-m-d');
        $reportDateEsc = $this->db->real_escape_string($reportDate);
        // Transactions are the source of truth when they exist. Revenue logs
        // remain a read-only historical fallback for installations importing
        // legacy data before the POS/customer systems were connected.
        $transactionToday = $this->rows("SELECT
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN status = 'paid' AND channel = 'pos' THEN amount ELSE 0 END), 0) AS pos_revenue,
            COALESCE(SUM(CASE WHEN status = 'paid' AND channel = 'website' THEN amount ELSE 0 END), 0) AS website_revenue,
            COALESCE(SUM(CASE WHEN status = 'paid' AND channel = 'ota' THEN amount ELSE 0 END), 0) AS ota_revenue,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS transaction_count
            FROM transactions WHERE DATE(created_at) = '{$reportDateEsc}'");
        $transactionToday = !empty($transactionToday) ? $transactionToday[0] : array();
        $hasTransactionData = !empty($transactionToday['transaction_count']);
        $today = $this->rows("SELECT total_revenue, ticket_sales, concession_sales, total_tickets, occupancy_rate
            FROM revenue_logs WHERE log_date = '{$reportDateEsc}' ORDER BY id DESC LIMIT 1");
        $legacyRevenue = !empty($today) ? $today[0] : array('total_revenue' => 0, 'ticket_sales' => 0, 'concession_sales' => 0, 'total_tickets' => 0, 'occupancy_rate' => 0);
        $revenue = $hasTransactionData ? array(
            'total_revenue' => $transactionToday['total_revenue'],
            'ticket_sales' => $transactionToday['total_revenue'],
            'concession_sales' => 0,
            'total_tickets' => $this->scalar("SELECT COALESCE(SUM(booked_seats), 0) FROM showtimes WHERE show_date = '{$reportDateEsc}' AND status <> 'cancelled'"),
            'occupancy_rate' => $this->scalar("SELECT COALESCE(AVG(CASE WHEN total_seats > 0 THEN booked_seats * 100 / total_seats ELSE 0 END), 0) FROM showtimes WHERE show_date = '{$reportDateEsc}' AND status <> 'cancelled'")
        ) : $legacyRevenue;

        $dailyRows = $this->rows("SELECT DATE(created_at) AS date, COALESCE(SUM(amount), 0) AS total_revenue
            FROM transactions WHERE status = 'paid' AND created_at >= DATE_SUB('{$reportDateEsc}', INTERVAL 6 DAY) AND created_at < DATE_ADD('{$reportDateEsc}', INTERVAL 1 DAY)
            GROUP BY DATE(created_at) ORDER BY date");
        if (empty($dailyRows)) {
            $dailyRows = $this->rows("SELECT log_date AS date, ticket_sales, concession_sales, total_revenue, total_tickets, occupancy_rate
                FROM revenue_logs WHERE log_date >= DATE_SUB('{$reportDateEsc}', INTERVAL 6 DAY) AND log_date <= '{$reportDateEsc}' ORDER BY log_date");
        }
        $normalizedDailyRows = array();
        foreach ($dailyRows as $dailyRow) {
            $normalizedDailyRows[] = $this->numberFields($dailyRow, array('ticket_sales', 'concession_sales', 'total_revenue', 'total_tickets', 'occupancy_rate'));
        }

        $roleDefs = self::getRoleDefinitions();
        $roleDef = isset($roleDefs[$role]) ? $roleDefs[$role] : null;

        $data = array(
            'date' => $reportDate,
            'role' => $role,
            'role_definition' => $roleDef,
            'revenue' => $this->numberFields($revenue, array('total_revenue', 'ticket_sales', 'concession_sales', 'occupancy_rate')),
            'revenue_source' => $hasTransactionData ? 'transactions' : 'revenue_logs',
            'previous_day_revenue' => (float)$this->scalar("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'paid' AND DATE(created_at) = DATE_SUB('{$reportDateEsc}', INTERVAL 1 DAY)"),
            'transaction_count' => (int)$transactionToday['transaction_count'],
            'channels' => array(
                array('code' => 'pos', 'name' => 'Quầy vé (POS)', 'amount' => (float)$transactionToday['pos_revenue']),
                array('code' => 'website', 'name' => 'Website / Ứng dụng', 'amount' => (float)$transactionToday['website_revenue']),
                array('code' => 'ota', 'name' => 'Đối tác OTA', 'amount' => (float)$transactionToday['ota_revenue'])
            ),
            'active_theaters' => $this->scalar("SELECT COUNT(*) FROM theaters WHERE status = 'active'"),
            'active_users' => $this->scalar("SELECT COUNT(*) FROM users WHERE status = 'active'"),
            'active_screens' => $this->scalar("SELECT COUNT(*) FROM screens WHERE status = 'active'"),
            'showtimes' => $this->scalar("SELECT COUNT(*) FROM showtimes WHERE show_date = '{$reportDateEsc}' AND status <> 'cancelled'"),
            'booked_seats' => $this->scalar("SELECT COALESCE(SUM(booked_seats), 0) FROM showtimes WHERE show_date = '{$reportDateEsc}'"),
            'staff_on_duty' => $this->scalar("SELECT COUNT(*) FROM staff_shifts WHERE work_date = '{$reportDateEsc}' AND status IN ('on_duty','checked_in')"),
            'pending_refunds' => $this->scalar("SELECT COUNT(*) FROM refunds WHERE status = 'pending'"),
            'revenue_7_days' => $normalizedDailyRows,
            'top_movies' => $this->rows("SELECT m.id, m.title, COALESCE(SUM(s.booked_seats), 0) booked_seats, COUNT(s.id) showtimes FROM movies m LEFT JOIN showtimes s ON s.movie_id = m.id AND s.show_date = '{$reportDateEsc}' GROUP BY m.id, m.title ORDER BY booked_seats DESC LIMIT 5"),
            'recent_transactions' => $this->rows("SELECT t.*, c.full_name customer_name FROM transactions t LEFT JOIN customers c ON c.id=t.customer_id WHERE DATE(t.created_at) = '{$reportDateEsc}' ORDER BY t.id DESC LIMIT 5"),
            'screens_status' => $this->rows("SELECT id, screen_code, name, screen_type, projector_status, sound_system_status, hvac_temperature, lamp_hours, status FROM screens ORDER BY screen_code"),
        );
        jsonResponse(array('success' => true, 'data' => $data));
    }

    public function cinemaScheduleBoard()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin', 'supervisor'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền xem bảng điều phối lịch chiếu.'), 403);
        }
        $date = !empty($_GET['date']) && preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $_GET['date']) ? $_GET['date'] : date('Y-m-d');
        $dateEsc = $this->db->real_escape_string($date);
        $this->ensureSchedulePublishSchema();
        $screenScope = $this->enforceCinemaScope();
        $scopeSql = $screenScope !== '' ? ' AND '.$screenScope : '';
        $screens = $this->rows("SELECT id, screen_code, name, screen_type, total_seats, projector_status, sound_system_status, status FROM screens WHERE status <> 'inactive'{$scopeSql} ORDER BY screen_code, id");
        $showtimes = $this->rows("SELECT st.id, st.screen_id, st.movie_id, st.show_date, st.start_time, st.end_time, st.booked_seats, st.total_seats, st.status, COALESCE(d.ticket_price, 0) ticket_price, COALESCE(d.operational_note, '') operational_note, m.title movie_title, m.age_rating, m.format movie_format FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id LEFT JOIN movies m ON m.id = st.movie_id LEFT JOIN tms_schedule_details d ON d.showtime_id=st.id WHERE st.show_date = '{$dateEsc}'" . ($screenScope !== '' ? ' AND s.theater_id='.$this->getCurrentTheaterId() : '') . " ORDER BY st.screen_id, st.start_time");
        foreach ($showtimes as &$showtime) {
            $showtime = $this->numberFields($showtime, array('id', 'screen_id', 'movie_id', 'booked_seats', 'total_seats', 'ticket_price'));
        }
        unset($showtime);
        jsonResponse(array('success' => true, 'data' => array('date' => $date, 'cinema_name' => 'Aurora Cinema Q1', 'screens' => $screens, 'showtimes' => $showtimes)));
    }

    private function ensureMovieAllocationTasksSchema()
    {
        $this->db->query("CREATE TABLE IF NOT EXISTS movie_allocation_tasks (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            allocation_id BIGINT UNSIGNED NOT NULL,
            task_key VARCHAR(60) NOT NULL,
            task_name VARCHAR(180) NOT NULL,
            task_description VARCHAR(500) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            updated_by VARCHAR(120) NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uq_allocation_task (allocation_id, task_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS movie_allocation_briefings (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            allocation_id BIGINT UNSIGNED NOT NULL,
            message VARCHAR(500) NOT NULL,
            sent_by VARCHAR(120) NOT NULL,
            sent_at DATETIME NOT NULL,
            UNIQUE KEY uq_allocation_briefing (allocation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS movie_allocation_screen_preparations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            allocation_id BIGINT UNSIGNED NOT NULL,
            screen_id BIGINT UNSIGNED NOT NULL,
            preparation_status VARCHAR(20) NOT NULL DEFAULT 'ready',
            note VARCHAR(500) NOT NULL,
            prepared_by VARCHAR(120) NOT NULL,
            prepared_at DATETIME NOT NULL,
            UNIQUE KEY uq_allocation_prepared_screen (allocation_id, screen_id),
            KEY idx_preparation_allocation (allocation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    }

    private function syncMovieAllocationTasks($allocation, $movie)
    {
        $this->ensureMovieAllocationTasksSchema();
        $allocationId = (int)$allocation['id'];
        $movieId = (int)$allocation['movie_id'];
        $minimum = max(1, (int)$allocation['min_screenings_per_day']);
        $start = !empty($allocation['allocated_start_date']) ? $allocation['allocated_start_date'] : date('Y-m-d');
        $end = !empty($allocation['allocated_end_date']) ? $allocation['allocated_end_date'] : $start;
        $dayCount = max(1, (int)floor((strtotime($end) - strtotime($start)) / 86400) + 1);
        $scheduled = (int)$this->scalar("SELECT COUNT(*) FROM showtimes WHERE movie_id={$movieId} AND show_date >= '".$this->db->real_escape_string($start)."' AND show_date <= '".$this->db->real_escape_string($end)."' AND status <> 'cancelled'") >= ($minimum * $dayCount);
        $prepared = (int)$this->scalar("SELECT COUNT(*) FROM movie_allocation_screen_preparations p INNER JOIN screens s ON s.id=p.screen_id WHERE p.allocation_id={$allocationId} AND p.preparation_status='ready' AND s.status='active'") > 0;
        $briefed = (int)$this->scalar("SELECT COUNT(*) FROM movie_allocation_briefings WHERE allocation_id={$allocationId}") > 0;
        $assetsReady = !empty($movie['poster_url']) && !empty($movie['trailer_url']);
        $checks = array(
            'review_assets' => $assetsReady,
            'prepare_screens' => $prepared,
            'create_showtimes' => $scheduled,
            'brief_team' => $briefed,
            'opening_check' => $assetsReady && $prepared && $scheduled && $briefed
        );
        $names = array('review_assets' => 'Kiểm tra hồ sơ & phiên bản phim', 'prepare_screens' => 'Chuẩn bị phòng chiếu ưu tiên', 'create_showtimes' => 'Lập lịch chiếu theo chỉ tiêu', 'brief_team' => 'Thông báo đội ngũ vận hành', 'opening_check' => 'Kiểm tra trước ngày triển khai');
        foreach ($checks as $key => $completed) {
            $keyEsc = $this->db->real_escape_string($key); $nameEsc = $this->db->real_escape_string($names[$key]);
            $status = $completed ? 'completed' : 'pending';
            $actor = $completed ? 'Hệ thống Aurora DB' : '';
            $actorEsc = $this->db->real_escape_string($actor);
            $this->db->query("INSERT INTO movie_allocation_tasks (allocation_id, task_key, task_name, task_description, status, updated_by, updated_at) VALUES ({$allocationId}, '{$keyEsc}', '{$nameEsc}', '', '{$status}', '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE status='{$status}', updated_by='{$actorEsc}', updated_at=IF(status <> '{$status}', NOW(), updated_at)");
        }
    }

    public function moviePlanDetail()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền xem chi tiết kế hoạch triển khai.'), 403);
        }
        $allocationId = isset($_GET['allocation_id']) ? (int)$_GET['allocation_id'] : 0;
        if ($allocationId <= 0) jsonResponse(array('success' => false, 'message' => 'Thiếu mã phân bổ.'), 400);
        $this->ensurePlanningSchema();
        $this->ensureMovieAllocationTasksSchema();
        // m.* keeps this endpoint compatible with older Aurora DB installations
        // where the movie catalogue has fewer optional metadata columns.
        $rows = $this->rows("SELECT m.*, m.status movie_status, mp.plan_code, mp.plan_name, mp.plan_month, mp.plan_year, mp.format plan_format, mp.expected_start_date plan_start_date, mp.expected_end_date plan_end_date, mp.target_revenue, mp.target_screenings_per_day, mp.priority_level, mp.note plan_note, mp.created_by plan_created_by, mp.created_at plan_created_at, ma.* FROM movie_allocations ma LEFT JOIN movie_plans mp ON mp.id = ma.plan_id LEFT JOIN movies m ON m.id = ma.movie_id WHERE ma.id = " . $allocationId . " LIMIT 1");
        if (empty($rows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $this->syncMovieAllocationTasks($rows[0], $rows[0]);
        $taskRows = $this->rows("SELECT task_key, task_name, task_description, status, updated_by, updated_at FROM movie_allocation_tasks WHERE allocation_id = " . $allocationId . " ORDER BY id ASC");
        $savedTasks = array();
        foreach ($taskRows as $task) $savedTasks[$task['task_key']] = $task;
        $taskBlueprints = array(
            array('task_key' => 'review_assets', 'task_name' => 'Kiểm tra hồ sơ & phiên bản phim', 'task_description' => 'Tự hoàn thành khi Aurora DB có đủ poster và trailer hợp lệ.', 'action_view' => 'Xem kế hoạch phim', 'action_label' => 'Mở hồ sơ phim'),
            array('task_key' => 'prepare_screens', 'task_name' => 'Chuẩn bị phòng chiếu ưu tiên', 'task_description' => 'Chọn và xác nhận phòng sẵn sàng; biên bản chuẩn bị được lưu trong Aurora DB.', 'action_view' => 'screens', 'action_label' => 'Chuẩn bị phòng'),
            array('task_key' => 'create_showtimes', 'task_name' => 'Lập lịch chiếu theo chỉ tiêu', 'task_description' => 'Tự hoàn thành khi lịch trong toàn bộ thời gian phân bổ đạt chỉ tiêu suất/ngày.', 'action_view' => 'schedules', 'action_label' => 'Lập lịch chiếu'),
            array('task_key' => 'brief_team', 'task_name' => 'Thông báo đội ngũ vận hành', 'task_description' => 'Gửi thông báo triển khai cho đội ngũ; bản ghi được lưu trong Aurora DB.', 'action_view' => 'staff', 'action_label' => 'Gửi thông báo'),
            array('task_key' => 'opening_check', 'task_name' => 'Kiểm tra trước ngày triển khai', 'task_description' => 'Tự hoàn thành khi hồ sơ, phòng chiếu, lịch và thông báo đều sẵn sàng.', 'action_view' => 'dashboard', 'action_label' => 'Xem vận hành')
        );
        $tasks = array();
        foreach ($taskBlueprints as $blueprint) {
            $key = $blueprint['task_key'];
            $tasks[] = array_merge($blueprint, isset($savedTasks[$key]) ? $savedTasks[$key] : array('status' => 'pending', 'updated_by' => '', 'updated_at' => ''));
        }
        jsonResponse(array('success' => true, 'data' => array('plan' => $rows[0], 'tasks' => $tasks)));
    }

    public function executeMoviePlanAction()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền thực hiện công việc triển khai.'), 403);
        $input = requestJson();
        $allocationId = isset($input['allocation_id']) ? (int)$input['allocation_id'] : 0;
        $taskKey = isset($input['task_key']) ? preg_replace('/[^a-z_]/', '', $input['task_key']) : '';
        if ($allocationId <= 0 || $taskKey !== 'brief_team') jsonResponse(array('success' => false, 'message' => 'Thao tác triển khai không hợp lệ.'), 400);
        $this->ensurePlanningSchema(); $this->ensureMovieAllocationTasksSchema();
        $rows = $this->rows("SELECT ma.*, m.* FROM movie_allocations ma LEFT JOIN movies m ON m.id=ma.movie_id WHERE ma.id={$allocationId} LIMIT 1");
        if (empty($rows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $allocation = $rows[0];
        $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
        $message = 'Triển khai phim '.$allocation['movie_title'].' · '.$allocation['allocated_start_date'].' đến '.$allocation['allocated_end_date'].'. Vui lòng kiểm tra quy định độ tuổi, lịch chiếu và sẵn sàng phục vụ.';
        $messageEsc = $this->db->real_escape_string($message); $actorEsc = $this->db->real_escape_string($actor);
        if (!$this->db->query("INSERT INTO movie_allocation_briefings (allocation_id, message, sent_by, sent_at) VALUES ({$allocationId}, '{$messageEsc}', '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE message='{$messageEsc}', sent_by='{$actorEsc}', sent_at=NOW()")) jsonResponse(array('success' => false, 'message' => 'Không thể lưu thông báo vận hành: '.$this->db->error), 500);
        $this->syncMovieAllocationTasks($allocation, $allocation);
        jsonResponse(array('success' => true, 'message' => 'Đã gửi thông báo triển khai và lưu vào Aurora DB.'));
    }

    public function moviePlanScreenPreparation()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin', 'supervisor'), true)) jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền chuẩn bị phòng chiếu.'), 403);
        $this->ensurePlanningSchema(); $this->ensureMovieAllocationTasksSchema();
        $allocationId = isset($_GET['allocation_id']) ? (int)$_GET['allocation_id'] : 0;
        $input = requestJson();
        if (!$allocationId && isset($input['allocation_id'])) $allocationId = (int)$input['allocation_id'];
        if ($allocationId <= 0) jsonResponse(array('success' => false, 'message' => 'Thiếu mã phân bổ phim.'), 400);
        $rows = $this->rows("SELECT ma.*, m.format movie_format, m.title FROM movie_allocations ma LEFT JOIN movies m ON m.id=ma.movie_id WHERE ma.id={$allocationId} LIMIT 1");
        if (empty($rows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $allocation = $rows[0];
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $screenId = isset($input['screen_id']) ? (int)$input['screen_id'] : 0;
            $note = isset($input['note']) ? trim((string)$input['note']) : '';
            $screen = $this->rows("SELECT id, name, status FROM screens WHERE id={$screenId} LIMIT 1");
            if (!$screen || $screen[0]['status'] !== 'active') jsonResponse(array('success' => false, 'message' => 'Chỉ có thể xác nhận phòng chiếu đang hoạt động.'), 400);
            $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
            $noteEsc = $this->db->real_escape_string($note); $actorEsc = $this->db->real_escape_string($actor);
            if (!$this->db->query("INSERT INTO movie_allocation_screen_preparations (allocation_id, screen_id, preparation_status, note, prepared_by, prepared_at) VALUES ({$allocationId}, {$screenId}, 'ready', '{$noteEsc}', '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE preparation_status='ready', note='{$noteEsc}', prepared_by='{$actorEsc}', prepared_at=NOW()")) jsonResponse(array('success' => false, 'message' => 'Không thể lưu biên bản chuẩn bị phòng: '.$this->db->error), 500);
            $this->syncMovieAllocationTasks($allocation, $allocation);
            jsonResponse(array('success' => true, 'message' => 'Đã xác nhận phòng '.$screen[0]['name'].' sẵn sàng và lưu vào Aurora DB.'));
        }
        $screens = $this->rows("SELECT s.id, s.screen_code, s.name, s.screen_type, s.total_seats, s.projector_status, s.sound_system_status, s.hvac_temperature, s.status, p.preparation_status, p.note, p.prepared_by, p.prepared_at FROM screens s LEFT JOIN movie_allocation_screen_preparations p ON p.screen_id=s.id AND p.allocation_id={$allocationId} ORDER BY s.screen_code, s.id");
        jsonResponse(array('success' => true, 'data' => array('allocation' => $allocation, 'screens' => $screens)));
    }

    public function updateMoviePlanTask()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền cập nhật kế hoạch triển khai.'), 403);
        $input = requestJson();
        $allocationId = isset($input['allocation_id']) ? (int)$input['allocation_id'] : 0;
        $taskKey = isset($input['task_key']) ? preg_replace('/[^a-z_]/', '', $input['task_key']) : '';
        $status = isset($input['status']) ? $input['status'] : '';
        if ($allocationId <= 0 || !$taskKey || !in_array($status, array('pending', 'completed'), true)) jsonResponse(array('success' => false, 'message' => 'Dữ liệu công việc triển khai không hợp lệ.'), 400);
        $this->ensurePlanningSchema();
        $this->ensureMovieAllocationTasksSchema();
        if (!$this->scalar("SELECT COUNT(*) FROM movie_allocations WHERE id = " . $allocationId)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $taskNames = array('review_assets' => 'Kiểm tra hồ sơ & phiên bản phim', 'prepare_screens' => 'Chuẩn bị phòng chiếu ưu tiên', 'create_showtimes' => 'Lập lịch chiếu theo chỉ tiêu', 'brief_team' => 'Thông báo đội ngũ vận hành', 'opening_check' => 'Kiểm tra trước ngày triển khai');
        if (!isset($taskNames[$taskKey])) jsonResponse(array('success' => false, 'message' => 'Công việc triển khai không hợp lệ.'), 400);
        $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
        $keyEsc = $this->db->real_escape_string($taskKey); $nameEsc = $this->db->real_escape_string($taskNames[$taskKey]); $actorEsc = $this->db->real_escape_string($actor); $statusEsc = $this->db->real_escape_string($status);
        $sql = "INSERT INTO movie_allocation_tasks (allocation_id, task_key, task_name, task_description, status, updated_by, updated_at) VALUES ({$allocationId}, '{$keyEsc}', '{$nameEsc}', '', '{$statusEsc}', '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE status = '{$statusEsc}', updated_by = '{$actorEsc}', updated_at = NOW()";
        if (!$this->db->query($sql)) jsonResponse(array('success' => false, 'message' => 'Không thể cập nhật công việc: ' . $this->db->error), 500);
        jsonResponse(array('success' => true, 'message' => $status === 'completed' ? 'Đã đánh dấu hoàn tất công việc triển khai.' : 'Đã chuyển công việc về trạng thái cần thực hiện.'));
    }

    public function listResource($resource)
    {
        if (!isset($this->resources[$resource])) {
            jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404);
        }
        if (in_array($resource, array('screens', 'schedules', 'theaters'), true)) {
            requireAdmin();
            $this->ensureCinemaOwnershipSchema();
        }
        if ($resource === 'movies') {
            $this->ensureMovieCatalogSchema();
            $this->listMovies();
        }
        if ($resource === 'movie-plans' || $resource === 'movie-allocations') {
            $this->ensurePlanningSchema();
        }
        if ($resource === 'schedules') {
            $this->ensureSchedulePublishSchema();
        }
        $cfg = $this->resources[$resource];
        $where = array('1=1');
        // Data scope is enforced on the API, so manipulating the browser
        // request cannot expose rooms or showtimes belonging to another rạp.
        if ($resource === 'screens') {
            $scope = $this->enforceCinemaScope();
            if ($scope !== '') $where[] = $scope;
        }
        if ($resource === 'schedules') {
            $scope = $this->enforceCinemaScope('sc');
            if ($scope !== '') $where[] = $scope;
        }
        if ($resource === 'theaters') {
            $scope = $this->enforceCinemaScope();
            if ($scope !== '') $where[] = 'id = ' . $this->getCurrentTheaterId();
        }

        if (!empty($_GET['q']) && !empty($cfg['search'])) {
            $qEsc = $this->db->real_escape_string($_GET['q']);
            $parts = array();
            foreach ($cfg['search'] as $field) {
                $parts[] = "`{$field}` LIKE '%{$qEsc}%'";
            }
            $where[] = '(' . implode(' OR ', $parts) . ')';
        }
        if (!empty($_GET['status'])) {
            if ($resource === 'schedules') {
                $requestedStatus = strtolower(trim((string)$_GET['status']));
                if ($requestedStatus === 'cancelled') $where[] = "s.status='CANCELLED'";
                else if ($requestedStatus === 'finished') $where[] = "s.status='CLOSED'";
                else $where[] = "s.status='OPEN'";
            } else $where[] = "`status` = '" . $this->db->real_escape_string($_GET['status']) . "'";
        }
        if ($resource === 'schedules' && !empty($_GET['date'])) {
            $where[] = "DATE(s.starts_at) = '" . $this->db->real_escape_string($_GET['date']) . "'";
        }
        if ($resource === 'movie-plans') {
            $planTable = $this->db->query("SHOW TABLES LIKE 'movie_plans'");
            if (!$planTable || $planTable->num_rows === 0) {
                jsonResponse(array('success' => true, 'data' => array()));
            }
            if (!empty($_GET['month'])) {
                $where[] = "`plan_month` = " . (int)$_GET['month'];
            }
            if (!empty($_GET['year'])) {
                $where[] = "`plan_year` = " . (int)$_GET['year'];
            }
            $sql = "SELECT * FROM movie_plans WHERE " . implode(' AND ', $where) . " ORDER BY plan_month ASC, expected_start_date ASC, id DESC";
            $plans = $this->rows($sql);
            $totalTheaters = $this->scalar("SELECT COUNT(*) FROM theaters");
            if (!$totalTheaters) $totalTheaters = 5;
            foreach ($plans as &$p) {
                $pId = (int)$p['id'];
                $mId = (int)$p['movie_id'];
                $allocations = $this->rows("SELECT * FROM movie_allocations WHERE plan_id = {$pId} OR (plan_id = 0 AND movie_id = {$mId}) ORDER BY theater_id ASC");
                $p['allocations'] = $allocations;
                $p['allocated_count'] = count($allocations);
                $p['total_theaters'] = $totalTheaters;
                $confirmedCount = 0;
                foreach ($allocations as $al) {
                    if ($al['status'] === 'confirmed' || $al['status'] === 'deploying') {
                        $confirmedCount++;
                    }
                }
                $p['confirmed_count'] = $confirmedCount;
            }
            unset($p);
            jsonResponse(array('success' => true, 'data' => $plans));
        }

        if ($resource === 'movie-allocations') {
            $allocTable = $this->db->query("SHOW TABLES LIKE 'movie_allocations'");
            if (!$allocTable || $allocTable->num_rows === 0) {
                jsonResponse(array('success' => true, 'data' => array()));
            }
            if (!empty($_GET['plan_id'])) {
                $where[] = "`plan_id` = " . (int)$_GET['plan_id'];
            }
            if (!empty($_GET['movie_id'])) {
                $where[] = "`movie_id` = " . (int)$_GET['movie_id'];
            }
            if (!empty($_GET['theater_id'])) {
                $where[] = "`theater_id` = " . (int)$_GET['theater_id'];
            }
            $sql = "SELECT * FROM movie_allocations WHERE " . implode(' AND ', $where) . " ORDER BY id DESC";
            $rows = $this->rows($sql);
            jsonResponse(array('success' => true, 'data' => $rows));
        }

        $select = '*';
        if ($resource === 'schedules') {
            $select = "s.id, s.screen_id, s.movie_id, DATE(s.starts_at) show_date, TIME(s.starts_at) start_time, TIME(s.ends_at) end_time, (SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id=s.id AND b.status NOT IN ('CANCELLED','EXPIRED')) booked_seats, sc.total_seats, CASE WHEN s.status='CANCELLED' THEN 'cancelled' WHEN s.status='CLOSED' THEN 'finished' WHEN NOW() BETWEEN s.starts_at AND s.ends_at THEN 'running' ELSE 'scheduled' END status, m.title movie_title, sc.name screen_name, s.ticket_price, COALESCE(d.operational_note, '') operational_note, COALESCE((SELECT GROUP_CONCAT(stt.ticket_type_id ORDER BY stt.ticket_type_id) FROM tms_showtime_ticket_types stt WHERE stt.showtime_id=s.id), '') ticket_type_ids";
        }
        $sql = "SELECT {$select} FROM {$cfg['table']}" . ($resource === 'schedules' ? ' s JOIN movies m ON m.id=s.movie_id JOIN screens sc ON sc.id=s.screen_id LEFT JOIN tms_schedule_details d ON d.showtime_id=s.id' : '') . ' WHERE ' . implode(' AND ', $where) . ($resource === 'schedules' ? ' ORDER BY s.starts_at DESC' : ' ORDER BY id DESC');
        $rows = $this->rows($sql);
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    private function fillMissingValues(array $values, $resource = '')
    {
        $filled = array();
        foreach ($values as $field => $value) {
            $fieldKey = strtolower((string)$field);
            $raw = $value;
            if (is_string($raw)) {
                $raw = trim($raw);
            }

            $default = null;
            if ($raw === null || $raw === '' || $raw === array()) {
                $lower = strtolower((string)$field);
                if (strpos($lower, 'name') !== false || strpos($lower, 'title') !== false || strpos($lower, 'label') !== false || strpos($lower, 'movie_title') !== false || strpos($lower, 'plan_name') !== false) {
                    $default = 'Thông tin đang cập nhật';
                } elseif (strpos($lower, 'description') !== false || strpos($lower, 'note') !== false || strpos($lower, 'details') !== false || strpos($lower, 'summary') !== false) {
                    $default = 'Mô tả đang được cập nhật.';
                } elseif (strpos($lower, 'phone') !== false || strpos($lower, 'address') !== false || strpos($lower, 'city') !== false || strpos($lower, 'location') !== false) {
                    $default = 'Đang cập nhật';
                } elseif (strpos($lower, 'code') !== false || strpos($lower, 'id') !== false || strpos($lower, 'sku') !== false || strpos($lower, 'no_') !== false) {
                    $default = 'AUTO-' . strtoupper(substr(md5((string)microtime(true) . $field), 0, 8));
                } elseif (strpos($lower, 'status') !== false) {
                    $default = $resource === 'movies' ? 'coming_soon' : ($resource === 'schedules' ? 'scheduled' : 'active');
                } elseif (strpos($lower, 'date') !== false || strpos($lower, 'time') !== false || strpos($lower, 'at') !== false) {
                    $default = date('Y-m-d');
                } elseif (strpos($lower, 'amount') !== false || strpos($lower, 'price') !== false || strpos($lower, 'cost') !== false || strpos($lower, 'value') !== false || strpos($lower, 'discount') !== false || strpos($lower, 'total') !== false) {
                    $default = 0;
                } elseif (strpos($lower, 'url') !== false || strpos($lower, 'image') !== false || strpos($lower, 'media') !== false || strpos($lower, 'file') !== false) {
                    $default = 'https://placehold.co/600x900/1f2937/ffffff?text=Aurora+Media';
                } elseif (strpos($lower, 'role') !== false) {
                    $default = 'cinema_admin';
                } elseif (strpos($lower, 'email') !== false) {
                    $default = 'contact@aurora-cinema.vn';
                } elseif (strpos($lower, 'country') !== false || strpos($lower, 'language') !== false || strpos($lower, 'genre') !== false || strpos($lower, 'format') !== false) {
                    $default = 'Việt Nam';
                } else {
                    $default = 'Thông tin đang cập nhật';
                }
            }

            $filled[$field] = $default !== null ? $default : $value;
        }
        return $filled;
    }

    public function save($resource)
    {
        if (!isset($this->resources[$resource])) {
            jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404);
        }
        if ($resource === 'movies') {
            $this->saveMovie();
        }
        if ($resource === 'schedules') {
            $this->saveSchedule();
        }
        if ($resource === 'movie-plans' || $resource === 'movie-allocations') {
            $this->ensurePlanningSchema();
        }
        requireAdmin();
        $role = $this->getCurrentRole();
        $input = requestJson();
        $cfg = $this->resources[$resource];
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        if ($resource === 'screens' && $id > 0) {
            $scope = $this->enforceCinemaScope();
            if ($scope !== '' && !(int)$this->scalar('SELECT COUNT(*) FROM screens WHERE id='.$id.' AND '.$scope)) {
                jsonResponse(array('success' => false, 'message' => 'Bạn không được phép cập nhật phòng chiếu của rạp khác.'), 403);
            }
        }
        if ($resource === 'screens') {
            $this->ensureCinemaOwnershipSchema();
            if ($role === 'cinema_admin') {
                $ownedTheaterId = $this->getCurrentTheaterId();
                if ($ownedTheaterId <= 0) jsonResponse(array('success' => false, 'message' => 'Tài khoản Admin Rạp chưa được gán rạp phụ trách.'), 403);
                $input['theater_id'] = $ownedTheaterId;
            } elseif ($id === 0 && (!isset($input['theater_id']) || (int)$input['theater_id'] <= 0)) {
                jsonResponse(array('success' => false, 'message' => 'Admin Tổng cần chọn rạp sở hữu trước khi tạo phòng chiếu.'), 400);
            }
        }

        // Kiểm tra phân quyền thực hiện theo từng vai trò
        if ($resource === 'ticket-types' && !in_array($role, array('super_admin', 'accounting'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Kế Toán mới có quyền chỉnh sửa bảng giá vé.'), 403);
        }
        if ($resource === 'movies' && $role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền chỉnh sửa danh mục phim dùng chung.'), 403);
        }
        if ($resource === 'schedules') {
            if ($role === 'supervisor') {
                // Supervisor chỉ được phép cập nhật trạng thái suất chiếu
                if (isset($input['status']) && count($input) <= 2) {
                    $this->execute("UPDATE showtimes SET status = ? WHERE id = ?", 'si', array($input['status'], $id));
                    jsonResponse(array('success' => true, 'message' => 'Đã cập nhật trạng thái suất chiếu.'));
                }
                jsonResponse(array('success' => false, 'message' => 'Giám sát ca chỉ được phép cập nhật trạng thái vận hành của suất chiếu.'), 403);
            } elseif (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền quản lý suất chiếu.'), 403);
            }
            $scope = $this->enforceCinemaScope('s');
            if ($scope !== '' && !(int)$this->scalar('SELECT COUNT(*) FROM showtimes s INNER JOIN screens sc ON sc.id=s.screen_id WHERE s.id='.$id.' AND '.$scope)) {
                jsonResponse(array('success' => false, 'message' => 'Bạn không được phép hủy suất chiếu của rạp khác.'), 403);
            }
        }
        if ($resource === 'screens') {
            if ($role === 'supervisor') {
                // Supervisor cập nhật thông số thiết bị phòng chiếu
                $allowedFields = array('projector_status', 'sound_system_status', 'hvac_temperature', 'status');
                $sets = array(); $params = array(); $types = '';
                foreach ($allowedFields as $f) {
                    if (array_key_exists($f, $input)) {
                        $sets[] = "`{$f}` = ?";
                        $params[] = $input[$f];
                        $types .= ($f === 'hvac_temperature' ? 'd' : 's');
                    }
                }
                if ($sets && $id > 0) {
                    $params[] = $id; $types .= 'i';
                    $this->execute("UPDATE screens SET " . implode(',', $sets) . " WHERE id = ?", $types, $params);
                    jsonResponse(array('success' => true, 'message' => 'Đã cập nhật trạng thái thiết bị phòng chiếu.'));
                }
                jsonResponse(array('success' => false, 'message' => 'Giám sát ca chỉ được phép điều chỉnh trạng thái thiết bị và nhiệt độ phòng.'), 403);
            } elseif (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền quản lý phòng chiếu.'), 403);
            }
        }
        if ($resource === 'staff' && !in_array($role, array('super_admin', 'cinema_admin', 'supervisor'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền quản lý ca trực nhân viên.'), 403);
        }
        if ($resource === 'movie-plans' && $role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Đặc quyền lập và quản lý kế hoạch phim thuộc về Admin Tổng.'), 403);
        }
        if ($resource === 'movie-plans') {
            $validPlanStatuses = array('draft', 'published', 'in_progress', 'completed', 'cancelled');
            if (isset($input['status']) && !in_array($input['status'], $validPlanStatuses, true)) {
                jsonResponse(array('success' => false, 'message' => 'Trạng thái kế hoạch không hợp lệ. Luồng hợp lệ: Nháp → Đã ban hành → Đang triển khai → Hoàn tất / Hủy.'), 422);
            }
            if ($id === 0 && isset($input['status']) && !in_array($input['status'], array('draft', 'published'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Kế hoạch mới chỉ có thể được lưu Nháp hoặc ban hành.'), 422);
            }
            if ($id > 0 && isset($input['status'])) {
                $currentRows = $this->rows("SELECT status FROM movie_plans WHERE id = " . $id);
                if (empty($currentRows)) {
                    jsonResponse(array('success' => false, 'message' => 'Không tìm thấy kế hoạch phim.'), 404);
                }
                $currentStatus = $currentRows[0]['status'];
                $nextStatus = $input['status'];
                $transitions = array(
                    'draft' => array('draft', 'published', 'cancelled'),
                    'published' => array('published', 'in_progress', 'cancelled'),
                    'in_progress' => array('in_progress', 'completed', 'cancelled'),
                    'completed' => array('completed'),
                    'cancelled' => array('cancelled')
                );
                if (!isset($transitions[$currentStatus]) || !in_array($nextStatus, $transitions[$currentStatus], true)) {
                    jsonResponse(array('success' => false, 'message' => 'Không thể chuyển từ trạng thái hiện tại sang trạng thái đã chọn.'), 422);
                }
            }
        }
        if ($resource === 'movie-allocations' && isset($input['status']) && $input['status'] === 'confirmed') {
            $approver = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
            $input['confirmed_by'] = $approver;
            $input['confirmed_at'] = date('Y-m-d H:i:s');
        }
        if ($resource === 'movie-allocations' && (!isset($input['status']) || $input['status'] !== 'confirmed')) {
            if ($role !== 'super_admin') {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền phân bổ kế hoạch cho rạp.'), 403);
            }
            $planId = isset($input['plan_id']) ? (int)$input['plan_id'] : 0;
            $planRows = $planId > 0 ? $this->rows("SELECT status FROM movie_plans WHERE id = " . $planId) : array();
            if (empty($planRows) || $planRows[0]['status'] !== 'published') {
                jsonResponse(array('success' => false, 'message' => 'Chỉ kế hoạch đã ban hành mới được phân bổ cho Admin Rạp.'), 422);
            }
        }

        $values = array();
        foreach ($cfg['fields'] as $field) {
            if (array_key_exists($field, $input)) {
                $values[$field] = $input[$field];
            }
        }
        $values = $this->fillMissingValues($values, $resource);
        if (!$values) {
            jsonResponse(array('success' => false, 'message' => 'Không có dữ liệu hợp lệ.'), 400);
        }

        if ($id > 0) {
            $sets = array();
            foreach ($values as $field => $value) {
                $valEsc = $this->db->real_escape_string($value);
                $sets[] = "`{$field}` = '{$valEsc}'";
            }
            $this->db->query("UPDATE {$cfg['table']} SET " . implode(',', $sets) . " WHERE id = " . $id);
            $message = 'Cập nhật thành công.';
        } else {
            $fields = array_keys($values);
            $valEscaped = array();
            foreach ($values as $value) {
                $valEscaped[] = "'" . $this->db->real_escape_string($value) . "'";
            }
            $this->db->query("INSERT INTO {$cfg['table']} (`" . implode('`,`', $fields) . "`) VALUES (" . implode(',', $valEscaped) . ")");
            $id = $this->db->insert_id;
            $message = 'Tạo mới thành công.';
        }

        if ($resource === 'screens') {
            $actor = !empty($_SESSION['tms_user']['username']) ? $_SESSION['tms_user']['username'] : 'system';
            $actorEsc = $this->db->real_escape_string($actor);
            $detail = $id > 0 ? 'Cập nhật thông tin phòng và sức chứa.' : 'Tạo phòng chiếu mới.';
            $detailEsc = $this->db->real_escape_string($detail);
            $theaterId = isset($values['theater_id']) ? (int)$values['theater_id'] : (int)$this->scalar('SELECT theater_id FROM screens WHERE id='.$id);
            $this->db->query("INSERT INTO tms_cinema_scope_audits (actor_username, action_name, theater_id, screen_id, detail, created_at) VALUES ('{$actorEsc}', 'screen_saved', {$theaterId}, {$id}, '{$detailEsc}', NOW())");
        }

        // Chỉ kế hoạch đã ban hành mới được gửi đến Admin Rạp. Bản nháp tuyệt đối không có phân bổ.
        if ($resource === 'movie-plans') {
            $savedPlan = $this->rows("SELECT status FROM movie_plans WHERE id = " . $id);
            $savedStatus = !empty($savedPlan[0]['status']) ? $savedPlan[0]['status'] : 'draft';
            if ($savedStatus === 'draft') {
                $this->db->query("DELETE FROM movie_allocations WHERE plan_id = " . $id);
            }
        }
        if ($resource === 'movie-plans' && !empty($input['theaters']) && is_array($input['theaters']) && isset($savedStatus) && $savedStatus === 'published') {
            $allocTable = $this->db->query("SHOW TABLES LIKE 'movie_allocations'");
            if ($allocTable && $allocTable->num_rows > 0) {
                $planRes = $this->rows("SELECT * FROM movie_plans WHERE id = " . $id);
                if (!empty($planRes[0])) {
                    $plan = $planRes[0];
                    foreach ($input['theaters'] as $tId) {
                        $tId = (int)$tId;
                        if ($tId <= 0) continue;
                        $tRow = $this->rows("SELECT name FROM theaters WHERE id = " . $tId);
                        $tName = !empty($tRow[0]['name']) ? $tRow[0]['name'] : 'Rạp #' . $tId;
                        $exists = $this->rows("SELECT id FROM movie_allocations WHERE plan_id = {$id} AND theater_id = {$tId}");
                        if (empty($exists)) {
                            $minScreen = !empty($input['min_screenings_per_day']) ? (int)$input['min_screenings_per_day'] : (int)$plan['target_screenings_per_day'];
                            $mTitleEsc = $this->db->real_escape_string($plan['movie_title']);
                            $tNameEsc = $this->db->real_escape_string($tName);
                            $this->db->query("INSERT INTO movie_allocations (`plan_id`, `movie_id`, `movie_title`, `theater_id`, `theater_name`, `min_screenings_per_day`, `preferred_screen_types`, `allocated_start_date`, `allocated_end_date`, `status`) VALUES ({$id}, {$plan['movie_id']}, '{$mTitleEsc}', {$tId}, '{$tNameEsc}', {$minScreen}, 'Standard / IMAX', '{$plan['expected_start_date']}', '{$plan['expected_end_date']}', 'pending')");
                        }
                    }
                }
            }
        }

        jsonResponse(array('success' => true, 'message' => $message, 'data' => array('id' => $id)), $id && !isset($input['id']) ? 201 : 200);
    }

    private function ensureMovieCatalogSchema()
    {
        $masterTable = $this->db->query("SHOW TABLES LIKE 'movies'");
        if (!$masterTable || !$masterTable->num_rows) {
            jsonResponse(array('success' => false, 'message' => 'Không tìm thấy bảng movies trong aurora_db.'), 500);
        }
    }

    private function ensurePlanningSchema()
    {
        $this->db->query("CREATE TABLE IF NOT EXISTS movie_plans (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, plan_code VARCHAR(50) NOT NULL, plan_name VARCHAR(255) NOT NULL,
            plan_month INT NOT NULL, plan_year INT NOT NULL, movie_id BIGINT UNSIGNED NOT NULL, movie_title VARCHAR(200) NOT NULL,
            format VARCHAR(100) NOT NULL, expected_start_date DATE NOT NULL, expected_end_date DATE NOT NULL,
            target_revenue DECIMAL(14,2) NOT NULL DEFAULT 0, target_screenings_per_day INT NOT NULL DEFAULT 0,
            priority_level VARCHAR(20) NOT NULL DEFAULT 'medium', status VARCHAR(30) NOT NULL DEFAULT 'draft', note TEXT NOT NULL,
            created_by VARCHAR(120) NOT NULL, created_at DATETIME NOT NULL, approved_by VARCHAR(120) NOT NULL, approved_at DATETIME NOT NULL,
            updated_by VARCHAR(120) NOT NULL, updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS movie_allocations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, plan_id BIGINT UNSIGNED NOT NULL, movie_id BIGINT UNSIGNED NOT NULL,
            movie_title VARCHAR(200) NOT NULL, theater_id BIGINT UNSIGNED NOT NULL, theater_name VARCHAR(150) NOT NULL,
            min_screenings_per_day INT NOT NULL DEFAULT 0, preferred_screen_types VARCHAR(120) NOT NULL,
            allocated_start_date DATE NOT NULL, allocated_end_date DATE NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending',
            confirmed_by VARCHAR(120) NOT NULL, confirmed_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        // Dữ liệu từ luồng cũ có bước duyệt không phù hợp với quyền Admin Tổng.
        // Chuẩn hóa ngay khi khởi tạo để giao diện và dữ liệu luôn dùng cùng một vòng đời.
        $this->db->query("UPDATE movie_plans SET status = CASE WHEN status = 'pending_approval' THEN 'draft' WHEN status = 'approved' THEN 'published' ELSE status END WHERE status IN ('pending_approval', 'approved')");
        $this->db->query("DELETE ma FROM movie_allocations ma INNER JOIN movie_plans mp ON mp.id = ma.plan_id WHERE mp.status = 'draft'");
    }

    private function listMovies()
    {
        $where = array('1=1');
        if (!empty($_GET['q'])) {
            $query = $this->db->real_escape_string($_GET['q']);
            $where[] = "(title LIKE '%{$query}%' OR format LIKE '%{$query}%' OR movie_code LIKE '%{$query}%')";
        }
        if (!empty($_GET['status'])) {
            $status = $this->db->real_escape_string(strtolower($_GET['status']));
            $where[] = "LOWER(status) = '{$status}'";
        }
        $sql = "SELECT * FROM movies WHERE " . implode(' AND ', $where) . ' ORDER BY id DESC';
        jsonResponse(array('success' => true, 'data' => $this->rows($sql)));
    }

    /**
     * Return only movies that may be scheduled at the signed-in cinema.
     * The catalogue itself is not an authorization source: a movie must belong
     * to a published plan and its allocation must have been accepted by the
     * cinema before it can be offered by the schedule editor.
     */
    public function scheduleMovies()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền lập lịch chiếu.'), 403);
        }
        $this->ensurePlanningSchema();
        $where = array(
            "mp.status IN ('published','in_progress')",
            "ma.status IN ('confirmed','deploying')"
        );
        if ($role === 'cinema_admin') {
            $theaterId = $this->getCurrentTheaterId();
            if ($theaterId <= 0) {
                jsonResponse(array('success' => false, 'message' => 'Tài khoản chưa được gán rạp phụ trách.'), 403);
            }
            $where[] = 'ma.theater_id = ' . $theaterId;
        }
        $sql = "SELECT m.*, ma.id allocation_id, ma.theater_id, ma.theater_name,
                       ma.allocated_start_date, ma.allocated_end_date,
                       ma.min_screenings_per_day, ma.preferred_screen_types,
                       ma.status allocation_status, mp.id plan_id,
                       mp.plan_code, mp.plan_name, mp.status plan_status
                FROM movie_allocations ma
                INNER JOIN movie_plans mp ON mp.id = ma.plan_id
                INNER JOIN movies m ON m.id = ma.movie_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY ma.allocated_start_date ASC, m.title ASC, ma.theater_id ASC";
        jsonResponse(array('success' => true, 'data' => $this->rows($sql)));
    }

    private function saveMovie()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if ($role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền quản lý kho phim dùng chung.'), 403);
        }
        $this->ensureMovieCatalogSchema();
        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        $fieldMap = array(
            'movie_code', 'title', 'original_title', 'genre', 'age_rating', 'director', 'cast', 'writer',
            'producer', 'production_country', 'description', 'plot_details', 'original_language',
            'localization_versions', 'format', 'release_date', 'expected_end_date', 'distributor',
            'poster_url', 'banner_url', 'trailer_url', 'status'
        );
        $movie = array();
        foreach ($fieldMap as $field) {
            $movie[$field] = isset($input[$field]) ? trim((string)$input[$field]) : '';
        }

        if ($movie['title'] === '') jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập tiêu đề phim.'), 400);
        if ($movie['original_title'] === '') $movie['original_title'] = $movie['title'];
        if ($movie['genre'] === '') $movie['genre'] = 'Khác';
        if ($movie['director'] === '') $movie['director'] = 'Đang cập nhật';
        if ($movie['cast'] === '') $movie['cast'] = 'Đang cập nhật';
        if ($movie['writer'] === '') $movie['writer'] = 'Đang cập nhật';
        if ($movie['producer'] === '') $movie['producer'] = 'Aurora Pictures Việt Nam';
        if ($movie['production_country'] === '') $movie['production_country'] = 'Việt Nam';
        if ($movie['description'] === '') $movie['description'] = 'Mô tả phim đang được cập nhật.';
        if ($movie['plot_details'] === '') $movie['plot_details'] = $movie['description'];
        if ($movie['original_language'] === '') $movie['original_language'] = 'Tiếng Việt';
        if ($movie['localization_versions'] === '') $movie['localization_versions'] = 'Phụ đề Việt / Lồng tiếng Việt';
        if ($movie['distributor'] === '') $movie['distributor'] = 'Aurora Pictures Việt Nam';
        if ($movie['expected_end_date'] === '') $movie['expected_end_date'] = $movie['release_date'];
        if ($movie['status'] === '') $movie['status'] = 'coming_soon';

        $duration = isset($input['duration_minutes']) ? filter_var($input['duration_minutes'], FILTER_VALIDATE_INT) : false;
        if ($duration === false || $duration < 1 || $duration > 600) jsonResponse(array('success' => false, 'message' => 'Thời lượng phim phải từ 1 đến 600 phút.'), 400);

        $year = isset($input['production_year']) && $input['production_year'] !== '' ? filter_var($input['production_year'], FILTER_VALIDATE_INT) : null;
        if ($year === false || ($year !== null && ($year < 1888 || $year > 2100))) jsonResponse(array('success' => false, 'message' => 'Năm sản xuất không hợp lệ.'), 400);

        $movie['duration_minutes'] = $duration;
        $movie['production_year'] = $year;
        $movie['status'] = strtolower($movie['status']);

        if (!in_array($movie['status'], array('now_showing', 'coming_soon', 'special_showing', 'ended'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Trạng thái phim không hợp lệ.'), 400);
        }

        $this->beginDbTransaction();
        try {
            if ($id > 0) {
                $existing = $this->rows('SELECT id FROM movies WHERE id = ' . $id . ' FOR UPDATE');
                if (!$existing) throw new Exception('Không tìm thấy phim cần cập nhật.');
                $cols = array();
                $params = array();
                $types = '';
                foreach (array('movie_code','title','original_title','genre','duration_minutes','age_rating','director','cast','writer','producer','production_country','production_year','description','plot_details','original_language','localization_versions','format','release_date','expected_end_date','distributor','poster_url','banner_url','trailer_url','status') as $field) {
                    $cols[] = "`{$field}` = ?";
                    $params[] = isset($movie[$field]) ? $movie[$field] : null;
                    $types .= in_array($field, array('duration_minutes','production_year'), true) ? 'i' : 's';
                }
                $params[] = $id;
                $types .= 'i';
                $this->executeMovieStatement('UPDATE movies SET ' . implode(', ', $cols) . ' WHERE id = ?', $types, $params);
                $message = 'Cập nhật thông tin phim thành công.';
            } else {
                $cols = array();
                $values = array();
                $types = '';
                foreach (array('movie_code','title','original_title','genre','duration_minutes','age_rating','director','cast','writer','producer','production_country','production_year','description','plot_details','original_language','localization_versions','format','release_date','expected_end_date','distributor','poster_url','banner_url','trailer_url','status') as $field) {
                    $cols[] = "`{$field}`";
                    $values[] = isset($movie[$field]) ? $movie[$field] : null;
                    $types .= in_array($field, array('duration_minutes','production_year'), true) ? 'i' : 's';
                }
                $this->executeMovieStatement('INSERT INTO movies (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($cols), '?')) . ')', $types, $values);
                $id = (int)$this->db->insert_id;
                $message = 'Đã lưu đầy đủ thông tin phim vào aurora_db.';
            }
                $this->commitDbTransaction();
            jsonResponse(array('success' => true, 'message' => $message, 'data' => array('id' => $id)), 200);
        } catch (Exception $e) {
            $this->rollbackDbTransaction();
            jsonResponse(array('success' => false, 'message' => $e->getMessage()), 400);
        }
    }

    /**
     * A TMS schedule is the source of truth for a cinema manager.  The link
     * table lets us publish that schedule to the customer-facing showtimes
     * table without assuming that IDs in the two screen tables are identical.
     */
    private function saveSchedule()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền lập suất chiếu.'), 403);
        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        $wasUpdate = $id > 0;
        $legacyScreenIds = isset($input['screen_ids']) && is_array($input['screen_ids']) ? array_values(array_unique(array_filter(array_map('intval', $input['screen_ids'])))) : array();
        $movieId = isset($input['movie_id']) ? (int)$input['movie_id'] : 0;
        $showDate = isset($input['show_date']) ? trim((string)$input['show_date']) : '';
        $status = isset($input['status']) ? strtolower(trim((string)$input['status'])) : 'scheduled';
        $ticketTypeIds = isset($input['ticket_type_ids']) && is_array($input['ticket_type_ids']) ? $input['ticket_type_ids'] : array();
        $ticketTypeIds = array_values(array_unique(array_filter(array_map('intval', $ticketTypeIds))));
        $note = isset($input['operational_note']) ? trim((string)$input['operational_note']) : '';
        $rawSlots = isset($input['time_slots']) && is_array($input['time_slots']) ? $input['time_slots'] : array(array('start_time' => isset($input['start_time']) ? $input['start_time'] : ''));
        if ($id > 0) $rawSlots = array_slice($rawSlots, 0, 1);
        $screenIds = array();
        foreach ($rawSlots as $slotInput) {
            $slotScreenId = is_array($slotInput) && isset($slotInput['screen_id']) ? (int)$slotInput['screen_id'] : (count($legacyScreenIds) === 1 ? (int)$legacyScreenIds[0] : 0);
            if ($slotScreenId > 0) $screenIds[] = $slotScreenId;
        }
        $screenIds = array_values(array_unique($screenIds));
        if (empty($screenIds) || !$movieId || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $showDate) || !$rawSlots || !in_array($status, array('scheduled', 'running', 'finished', 'cancelled'), true)) jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập đủ phim, phòng, ngày và giờ chiếu hợp lệ.'), 400);
        if (empty($ticketTypeIds)) jsonResponse(array('success' => false, 'message' => 'Vui lòng chọn ít nhất một loại vé áp dụng cho suất chiếu.'), 400);
        $this->ensureTicketPricingSchema();
        if ($id > 0 && count($rawSlots) !== 1) jsonResponse(array('success' => false, 'message' => 'Một lần chỉnh sửa chỉ áp dụng cho một suất chiếu.'), 400);
        $screenScope = $this->enforceCinemaScope();
        $screenSql = implode(',', $screenIds);
        $dateEsc = $this->db->real_escape_string($showDate);
        $screens = $this->rows('SELECT id, name, total_seats, theater_id FROM screens WHERE id IN ('.$screenSql.')' . ($screenScope !== '' ? ' AND '.$screenScope : ''));
        $movie = $this->rows('SELECT id, duration_minutes FROM movies WHERE id=' . $movieId);
        if (count($screens) !== count($screenIds) || !$movie) jsonResponse(array('success' => false, 'message' => 'Phim hoặc một trong các phòng chiếu không tồn tại hoặc không thuộc phạm vi rạp của bạn.'), 400);
        $this->ensurePlanningSchema();
        $allocationRows = $this->rows("SELECT DISTINCT ma.theater_id
            FROM movie_allocations ma
            INNER JOIN movie_plans mp ON mp.id=ma.plan_id
            WHERE ma.movie_id={$movieId}
              AND ma.status IN ('confirmed','deploying')
              AND mp.status IN ('published','in_progress')
              AND '{$dateEsc}' BETWEEN ma.allocated_start_date AND ma.allocated_end_date");
        $allocatedTheaters = array();
        foreach ($allocationRows as $allocationRow) $allocatedTheaters[(int)$allocationRow['theater_id']] = true;
        foreach ($screens as $screenRow) {
            $screenTheaterId = isset($screenRow['theater_id']) ? (int)$screenRow['theater_id'] : 0;
            if ($screenTheaterId <= 0 || !isset($allocatedTheaters[$screenTheaterId])) {
                jsonResponse(array('success' => false, 'message' => 'Phim chưa được lên kế hoạch, xác nhận phân bổ hoặc không còn trong thời gian phân bổ của rạp chứa phòng '.$screenRow['name'].'.'), 422);
            }
        }
        $duration = (int)$movie[0]['duration_minutes'];
        if ($duration < 1 || $duration > 600) jsonResponse(array('success'=>false, 'message'=>'Thời lượng phim trong Aurora DB không hợp lệ.'), 400);
        $screenMap = array(); foreach ($screens as $screenRow) $screenMap[(int)$screenRow['id']] = $screenRow;
        $slots = array(); $seenSlots = array(); $ticketTypeSql = implode(',', $ticketTypeIds);
        $isHoliday = (int)$this->scalar("SELECT COUNT(*) FROM tms_holiday_dates WHERE holiday_date='{$dateEsc}' AND is_active=1") > 0;
        $dayType = $isHoliday ? 'holiday' : ((int)date('N', strtotime($showDate)) >= 6 ? 'weekend' : 'weekday');
        foreach ($rawSlots as $rawSlot) {
            $slotScreenId = is_array($rawSlot) && isset($rawSlot['screen_id']) ? (int)$rawSlot['screen_id'] : (count($legacyScreenIds) === 1 ? (int)$legacyScreenIds[0] : 0);
            if ($slotScreenId < 1 || !isset($screenMap[$slotScreenId])) jsonResponse(array('success'=>false,'message'=>'Mỗi khung giờ phải chọn một phòng chiếu hợp lệ.'),400);
            $start = trim((string)(is_array($rawSlot) && isset($rawSlot['start_time']) ? $rawSlot['start_time'] : ''));
            $slotKey = $slotScreenId.'|'.$start;
            if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $start) || isset($seenSlots[$slotKey])) jsonResponse(array('success'=>false,'message'=>'Cùng một phòng không thể có hai suất bắt đầu trùng giờ.'),400);
            $startTimestamp = strtotime('2000-01-01 '.substr($start, 0, 5).':00'); if ($startTimestamp === false) jsonResponse(array('success'=>false,'message'=>'Giờ bắt đầu không hợp lệ.'),400);
            $endTimestamp = $startTimestamp + ($duration * 60);
            if (date('Y-m-d', $endTimestamp) !== date('Y-m-d', $startTimestamp)) jsonResponse(array('success'=>false,'message'=>'Khung giờ không được vượt qua 24:00.'),400);
            $end = date('H:i', $endTimestamp); $seenSlots[$slotKey] = true;
            $timeSlot = (int)substr($start, 0, 2) < 12 ? 'morning' : ((int)substr($start, 0, 2) < 18 ? 'standard' : 'evening');
            $types = $this->rows("SELECT t.id, p.price FROM ticket_types t INNER JOIN tms_ticket_price_matrix p ON p.ticket_type_id=t.id AND p.day_type='{$dayType}' AND p.time_slot='{$timeSlot}' AND p.is_active=1 WHERE t.id IN ({$ticketTypeSql}) AND t.status='active'");
            if (count($types) !== count($ticketTypeIds)) jsonResponse(array('success'=>false,'message'=>'Một hoặc nhiều loại vé không áp dụng cho khung giờ '.$start.'.'),400);
            $values=array(); foreach ($types as $type) $values[]=(float)$type['price'];
            $slots[] = array('screen_id'=>$slotScreenId, 'start'=>$start, 'end'=>$end, 'price'=>min($values), 'types'=>$types);
        }
        usort($slots, array('AdminController', 'compareScheduleSlots'));
        for ($i=0; $i<count($slots); $i++) for ($j=$i+1; $j<count($slots); $j++) if ($slots[$i]['screen_id']===$slots[$j]['screen_id'] && $slots[$j]['start'] < $slots[$i]['end'] && $slots[$j]['end'] > $slots[$i]['start']) jsonResponse(array('success'=>false,'message'=>'Các suất của phòng '.$screenMap[$slots[$i]['screen_id']]['name'].' đang chồng lấn nhau.'),400);
        foreach ($slots as $slot) { $candidateId=(int)$slot['screen_id']; $startAt=$dateEsc.' '.$slot['start'].':00'; $endAt=$dateEsc.' '.$slot['end'].':00'; $conflicts=$this->rows("SELECT starts_at,ends_at FROM showtimes WHERE screen_id={$candidateId} AND status <> 'CANCELLED' AND id <> {$id} AND starts_at < '{$endAt}' AND ends_at > '{$startAt}' LIMIT 1"); if ($conflicts) jsonResponse(array('success'=>false,'message'=>'Phòng '.$screenMap[$candidateId]['name'].' đã có suất chiếu trùng khung '.$slot['start'].' – '.$slot['end'].'. Chưa có dữ liệu nào được tạo.'),409); }
        $this->db->query("CREATE TABLE IF NOT EXISTS schedule_operation_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, showtime_id BIGINT UNSIGNED NOT NULL,
            action_name VARCHAR(40) NOT NULL, performed_by VARCHAR(120) NOT NULL, created_at DATETIME NOT NULL,
            KEY idx_schedule_operation_showtime (showtime_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_schedule_details (
            showtime_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
            ticket_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            operational_note VARCHAR(500) NOT NULL DEFAULT '',
            updated_by VARCHAR(120) NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_showtime_ticket_types (
            showtime_id BIGINT UNSIGNED NOT NULL,
            ticket_type_id BIGINT UNSIGNED NOT NULL,
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (showtime_id, ticket_type_id),
            KEY idx_showtime_ticket_type (ticket_type_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        $this->beginDbTransaction();
        try {
            $created = array();
            $canonicalStatus = $status === 'cancelled' ? 'CANCELLED' : ($status === 'finished' ? 'CLOSED' : 'OPEN');
            if ($id > 0) {
                $slot=$slots[0]; $screen = $screenMap[(int)$slot['screen_id']];
                $old = $this->rows('SELECT id FROM showtimes WHERE id=' . $id . ' FOR UPDATE');
                if (!$old) throw new Exception('Không tìm thấy suất chiếu cần cập nhật.');
                $startsAt=$showDate.' '.$slot['start'].':00'; $endsAt=$showDate.' '.$slot['end'].':00';
                $this->executeMovieStatement('UPDATE showtimes SET screen_id=?, movie_id=?, starts_at=?, ends_at=?, ticket_price=?, status=? WHERE id=?', 'iissdsi', array((int)$screen['id'], $movieId, $startsAt, $endsAt, (float)$slot['price'], $canonicalStatus, $id)); $created[]=array('id'=>$id,'slot'=>$slot);
            } else {
                foreach ($slots as $slot) { $screen=$screenMap[(int)$slot['screen_id']]; $startsAt=$showDate.' '.$slot['start'].':00'; $endsAt=$showDate.' '.$slot['end'].':00'; $this->executeMovieStatement('INSERT INTO showtimes (screen_id, movie_id, starts_at, ends_at, ticket_price, status) VALUES (?, ?, ?, ?, ?, ?)', 'iissds', array((int)$screen['id'], $movieId, $startsAt, $endsAt, (float)$slot['price'], $canonicalStatus)); $created[]=array('id'=>(int)$this->db->insert_id,'slot'=>$slot); }
                $id = $created[0]['id'];
            }
            $noteEsc = $this->db->real_escape_string(substr($note, 0, 500));
            $actorForDetail = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
            $actorForDetailEsc = $this->db->real_escape_string($actorForDetail);
            foreach ($created as $item) { $createdId=(int)$item['id']; $price=(float)$item['slot']['price']; $this->db->query("INSERT INTO tms_schedule_details (showtime_id, ticket_price, operational_note, updated_by, updated_at) VALUES ({$createdId}, {$price}, '{$noteEsc}', '{$actorForDetailEsc}', NOW()) ON DUPLICATE KEY UPDATE ticket_price={$price}, operational_note='{$noteEsc}', updated_by='{$actorForDetailEsc}', updated_at=NOW()");
                $this->db->query("DELETE FROM tms_showtime_ticket_types WHERE showtime_id={$createdId}");
                foreach ($item['slot']['types'] as $ticketType) $this->db->query("INSERT INTO tms_showtime_ticket_types (showtime_id, ticket_type_id, price) VALUES ({$createdId}, ".(int)$ticketType['id'].", ".(float)$ticketType['price'].")");
            }
            $this->commitDbTransaction();
        } catch (Exception $e) {
            $this->rollbackDbTransaction();
            jsonResponse(array('success' => false, 'message' => $e->getMessage()), 400);
        }
        // A saved showtime is an operational action. Re-evaluate every related
        // allocation immediately so its deployment checklist reflects Aurora DB.
        $allocations = $this->rows('SELECT ma.*, m.poster_url, m.trailer_url FROM movie_allocations ma LEFT JOIN movies m ON m.id=ma.movie_id WHERE ma.movie_id=' . $movieId);
        foreach ($allocations as $allocation) $this->syncMovieAllocationTasks($allocation, $allocation);
        $actor = !empty($_SESSION['tms_user']['full_name']) ? $this->db->real_escape_string($_SESSION['tms_user']['full_name']) : 'Admin Rạp';
        $createdIds=array(); foreach($created as $item) { $createdId=(int)$item['id']; $createdIds[]=$createdId; $this->db->query("INSERT INTO schedule_operation_logs (showtime_id, action_name, performed_by, created_at) VALUES ({$createdId}, '".($wasUpdate ? 'updated' : 'created')."', '{$actor}', NOW())"); }
        jsonResponse(array('success' => true, 'message' => count($createdIds) > 1 ? 'Đã tạo '.count($createdIds).' suất chiếu, mỗi khung giờ đúng phòng đã chọn trong aurora_db.' : 'Đã lưu suất chiếu vào aurora_db.', 'data' => array('id' => $id, 'ids' => $createdIds)), $wasUpdate ? 200 : 201);
    }

    private function ensureSchedulePublishSchema()
    {
        $this->ensureMovieCatalogSchema();
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_schedule_details (
            showtime_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
            ticket_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            operational_note VARCHAR(500) NOT NULL DEFAULT '',
            updated_by VARCHAR(120) NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_showtime_ticket_types (
            showtime_id BIGINT UNSIGNED NOT NULL,
            ticket_type_id BIGINT UNSIGNED NOT NULL,
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (showtime_id, ticket_type_id),
            KEY idx_showtime_ticket_type (ticket_type_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
    }

    private function customerScreenForTmsScreen($tmsScreenId, $tmsScreenName)
    {
        $escaped = $this->db->real_escape_string($tmsScreenName);
        $candidate = $this->rows("SELECT id FROM screens WHERE name='{$escaped}' ORDER BY id LIMIT 1");
        return $candidate ? (int)$candidate[0]['id'] : (int)$tmsScreenId;
    }

    private function isMovieMediaReference($value, $kind)
    {
        if (filter_var($value, FILTER_VALIDATE_URL)) return true;
        $path = parse_url($value, PHP_URL_PATH);
        $extensions = $kind === 'trailer' ? 'mp4|webm|mov' : 'jpg|png|webp';
        return is_string($path) && preg_match('#^/(?:[A-Za-z0-9%._-]+/)*uploads/movies/movie-' . $kind . '-[a-f0-9]{40}\\.(' . $extensions . ')$#i', $path) === 1;
    }

    private function executeMovieStatement($sql, $types, $params)
    {
        $stmt = $this->prepare($sql, $types, $params);
        if (!$stmt->execute()) {
            $error = $stmt->error;
            $duplicate = $stmt->errno === 1062;
            $this->rollbackDbTransaction();
            jsonResponse(array('success' => false, 'message' => $duplicate ? 'Mã phim đã tồn tại trong kho hệ thống.' : $error), $duplicate ? 400 : 500);
        }
        return $stmt;
    }

    public function delete($resource)
    {
        if (!isset($this->resources[$resource])) {
            jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404);
        }
        requireAdmin();
        $role = $this->getCurrentRole();

        // Kiểm tra quyền xóa
        if ($role === 'supervisor') {
            jsonResponse(array('success' => false, 'message' => 'Giám sát ca không có quyền xóa dữ liệu hệ thống.'), 403);
        }
        if ($role === 'accounting' && in_array($resource, array('movies', 'screens', 'schedules', 'movie-plans', 'movie-allocations'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Kế toán không có quyền xóa phim hoặc kế hoạch phim.'), 403);
        }

        // Thu hồi hàng loạt chỉ áp dụng cho các phân bổ Admin Rạp chưa tiếp nhận.
        // Các phân bổ đã xác nhận hoặc đang triển khai luôn được giữ nguyên.
        if ($resource === 'movie-allocations' && isset($_GET['bulk']) && $_GET['bulk'] === 'pending') {
            if ($role !== 'super_admin') {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền thu hồi phân bổ hàng loạt.'), 403);
            }
            $this->ensurePlanningSchema();
            if (!$this->db->query("DELETE FROM movie_allocations WHERE status = 'pending'")) {
                jsonResponse(array('success' => false, 'message' => 'Không thể thu hồi các phân bổ chưa tiếp nhận: ' . $this->db->error), 500);
            }
            $deleted = (int)$this->db->affected_rows;
            jsonResponse(array('success' => true, 'message' => 'Đã thu hồi ' . $deleted . ' phân bổ chưa tiếp nhận khỏi Aurora DB.', 'data' => array('deleted_count' => $deleted)));
        }

        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu id.'), 400);
        }
        if ($resource === 'schedules') {
            if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền hủy suất chiếu.'), 403);
            }
            $scope = $this->enforceCinemaScope('sc');
            if ($scope !== '' && !(int)$this->scalar('SELECT COUNT(*) FROM showtimes s INNER JOIN screens sc ON sc.id=s.screen_id WHERE s.id='.$id.' AND '.$scope)) {
                jsonResponse(array('success' => false, 'message' => 'Bạn không được phép hủy suất chiếu của rạp khác.'), 403);
            }
            $this->beginDbTransaction();
            if (!$this->db->query('DELETE FROM showtimes WHERE id=' . $id)) {
                $this->rollbackDbTransaction(); jsonResponse(array('success' => false, 'message' => $this->db->error), 500);
            }
            $this->commitDbTransaction();
            jsonResponse(array('success' => true, 'message' => 'Đã hủy suất chiếu khỏi aurora_db.'));
        }
        if ($resource === 'movies') {
            $this->ensureMovieCatalogSchema();
            $showtimesTable = $this->db->query("SHOW TABLES LIKE 'showtimes'");
            $hasShowtimes = $showtimesTable && $showtimesTable->num_rows && $this->scalar('SELECT COUNT(*) FROM showtimes WHERE movie_id = ' . $id) > 0;
            if ($hasShowtimes) {
                jsonResponse(array('success' => false, 'message' => 'Không thể xóa phim đã có lịch chiếu hoặc suất chiếu được mở bán.'), 400);
            }
            $this->beginDbTransaction();
            if (!$this->db->query('DELETE FROM movies WHERE id = ' . $id)) {
                $error = $this->db->error;
                $this->rollbackDbTransaction();
                jsonResponse(array('success' => false, 'message' => $error), 500);
            }
            $this->commitDbTransaction();
            jsonResponse(array('success' => true, 'message' => 'Đã xóa phim khỏi kho hệ thống.'));
        }
        if ($resource === 'movie-plans') {
            $allocTable = $this->db->query("SHOW TABLES LIKE 'movie_allocations'");
            if ($allocTable && $allocTable->num_rows > 0) {
                $this->db->query("DELETE FROM movie_allocations WHERE plan_id = " . $id);
            }
        }
        $this->db->query("DELETE FROM {$this->resources[$resource]['table']} WHERE id = " . $id);
        jsonResponse(array('success' => true, 'message' => 'Đã xóa dữ liệu thành công.'));
    }

    // ========================================================
    // QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG TMS & PHÂN QUYỀN (RBAC)
    // ========================================================

    private function ensureUserManagementSchema()
    {
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_user_activity_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            target_user_id BIGINT UNSIGNED NOT NULL,
            action_name VARCHAR(80) NOT NULL,
            detail VARCHAR(500) NOT NULL,
            performed_by VARCHAR(120) NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_tms_user_activity_target (target_user_id),
            KEY idx_tms_user_activity_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");

        // Older Aurora DB installations did not keep the cinema assignment on
        // the account itself.  Keep this migration idempotent so the account
        // dialog can be deployed safely against an existing database.
        $columns = array('email' => "VARCHAR(180) NULL", 'theater_id' => "BIGINT UNSIGNED NULL");
        foreach ($columns as $column => $definition) {
            $exists = $this->db->query("SHOW COLUMNS FROM users LIKE '".$column."'");
            if (!$exists || $exists->num_rows === 0) {
                $this->db->query("ALTER TABLE users ADD COLUMN ".$column." ".$definition);
            }
        }
    }

    private function logUserManagementActivity($userId, $action, $detail)
    {
        $this->ensureUserManagementSchema();
        $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Tổng';
        $actionEsc = $this->db->real_escape_string($action);
        $detailEsc = $this->db->real_escape_string($detail);
        $actorEsc = $this->db->real_escape_string($actor);
        $this->db->query("INSERT INTO tms_user_activity_logs (target_user_id, action_name, detail, performed_by, created_at) VALUES (".(int)$userId.", '{$actionEsc}', '{$detailEsc}', '{$actorEsc}', NOW())");
    }

    public function listUsers()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền xem danh sách nhân sự TMS.'), 403);
        }

        $this->ensureUserManagementSchema();
        $where = array('1=1');
        if (!empty($_GET['q'])) { $q = $this->db->real_escape_string(trim($_GET['q'])); $where[] = "(u.username LIKE '%{$q}%' OR u.full_name LIKE '%{$q}%' OR u.phone LIKE '%{$q}%' OR u.email LIKE '%{$q}%')"; }
        if (!empty($_GET['role'])) { $roleFilter = $this->db->real_escape_string(self::normalizeRole($_GET['role'])); $where[] = "role = '{$roleFilter}'"; }
        if (!empty($_GET['status']) && in_array($_GET['status'], array('active', 'inactive', 'locked'), true)) { $where[] = "status = '".$this->db->real_escape_string($_GET['status'])."'"; }
        $users = $this->rows("SELECT u.id, u.username, u.full_name, u.phone, u.email, u.theater_id, t.name AS theater_name, u.role, u.status, u.last_login, u.created_at, MAX(l.created_at) AS last_management_action FROM users u LEFT JOIN theaters t ON t.id=u.theater_id LEFT JOIN tms_user_activity_logs l ON l.target_user_id=u.id WHERE ".implode(' AND ', $where)." GROUP BY u.id, u.username, u.full_name, u.phone, u.email, u.theater_id, t.name, u.role, u.status, u.last_login, u.created_at ORDER BY u.status='active' DESC, u.full_name ASC");
        $rolesDef = self::getRoleDefinitions();

        foreach ($users as &$u) {
            $normalized = self::normalizeRole($u['role']);
            $u['normalized_role'] = $normalized;
            $u['role_info'] = isset($rolesDef[$normalized]) ? $rolesDef[$normalized] : array('name' => $u['role'], 'badge' => $u['role']);
        }
        unset($u);

        jsonResponse(array(
            'success' => true,
            'data' => $users,
            'summary' => array(
                'total' => (int)$this->scalar('SELECT COUNT(*) FROM users'),
                'active' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE status='active'"),
                'locked' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE status IN ('locked','inactive')"),
                'admins' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE role IN ('super_admin','cinema_admin') AND status='active'")
            ),
            'roles' => array_values($rolesDef),
            'theaters' => $this->rows("SELECT id, name, city, status FROM theaters WHERE status = 'active' ORDER BY name ASC"),
            'matrix' => self::getPermissionsMatrix()
        ));
    }

    public function saveUser()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if ($role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Đặc quyền tạo và phân quyền tài khoản TMS chỉ dành cho Admin Tổng (Super Admin).'), 403);
        }

        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        $username = isset($input['username']) ? trim((string)$input['username']) : '';
        $fullName = isset($input['full_name']) ? trim((string)$input['full_name']) : '';
        $phone = isset($input['phone']) ? trim((string)$input['phone']) : '';
        $email = isset($input['email']) ? trim((string)$input['email']) : '';
        $theaterId = isset($input['theater_id']) ? (int)$input['theater_id'] : 0;
        $userRole = isset($input['role']) ? self::normalizeRole($input['role']) : 'cinema_admin';
        $status = isset($input['status']) && in_array($input['status'], array('active', 'inactive', 'locked'), true) ? $input['status'] : 'active';
        $password = isset($input['password']) ? trim((string)$input['password']) : '';

        if ($userRole === '') $userRole = 'cinema_admin';
        if ($status === '') $status = 'active';
        if (!$id && ($username === '' || $fullName === '' || $email === '')) {
            jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập tên đăng nhập, họ tên và email công việc.'), 400);
        }
        if ($username !== '' && !preg_match('/^[A-Za-z0-9._-]{3,60}$/', $username)) jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập gồm 3–60 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.'), 400);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) jsonResponse(array('success' => false, 'message' => 'Email công việc không đúng định dạng.'), 400);
        if (!$id && strlen($password) < 6) jsonResponse(array('success' => false, 'message' => 'Mật khẩu khởi tạo cần có ít nhất 6 ký tự.'), 400);
        if ($password !== '' && strlen($password) < 6) jsonResponse(array('success' => false, 'message' => 'Mật khẩu mới cần có ít nhất 6 ký tự.'), 400);
        if (in_array($userRole, array('cinema_admin', 'supervisor'), true) && !$theaterId) jsonResponse(array('success' => false, 'message' => 'Vui lòng chỉ định rạp phụ trách cho vai trò này.'), 400);
        if ($theaterId > 0 && !(int)$this->scalar("SELECT COUNT(*) FROM theaters WHERE id=".$theaterId)) jsonResponse(array('success' => false, 'message' => 'Rạp được chọn không tồn tại trong Aurora DB.'), 400);

        $fnEsc = $this->db->real_escape_string($fullName);
        $phEsc = $this->db->real_escape_string($phone);
        $emEsc = $this->db->real_escape_string($email);
        $theaterSql = $theaterId > 0 ? (string)$theaterId : 'NULL';
        $rlEsc = $this->db->real_escape_string($userRole);
        $stEsc = $this->db->real_escape_string($status);

        if ($id > 0) {
            if (!empty($_SESSION['tms_user']['id']) && (int)$_SESSION['tms_user']['id'] === $id && $status !== 'active') jsonResponse(array('success' => false, 'message' => 'Không thể khóa tài khoản đang đăng nhập.'), 400);
            if ($password !== '') {
                $hash = function_exists('password_hash') ? password_hash($password, PASSWORD_BCRYPT) : crypt($password);
                $hashEsc = $this->db->real_escape_string($hash);
                $this->db->query("UPDATE users SET full_name = '{$fnEsc}', phone = '{$phEsc}', email = '{$emEsc}', theater_id = {$theaterSql}, role = '{$rlEsc}', status = '{$stEsc}', password_hash = '{$hashEsc}', updated_at = NOW() WHERE id = " . $id);
            } else {
                $this->db->query("UPDATE users SET full_name = '{$fnEsc}', phone = '{$phEsc}', email = '{$emEsc}', theater_id = {$theaterSql}, role = '{$rlEsc}', status = '{$stEsc}', updated_at = NOW() WHERE id = " . $id);
            }
            if ($this->db->affected_rows < 0) jsonResponse(array('success' => false, 'message' => 'Không thể cập nhật tài khoản: '.$this->db->error), 500);
            $this->logUserManagementActivity($id, 'updated', 'Cập nhật hồ sơ, vai trò, rạp phụ trách hoặc trạng thái tài khoản.');
            jsonResponse(array('success' => true, 'message' => 'Đã cập nhật tài khoản và phân quyền trong Aurora DB.'));
        } else {
            // Check username unique
            $uEsc = $this->db->real_escape_string($username);
            $check = $this->rows("SELECT id FROM users WHERE username = '{$uEsc}'");
            if ($check) {
                jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập đã tồn tại trong hệ thống.'), 400);
            }
            $pwdToUse = $password;
            $hash = function_exists('password_hash') ? password_hash($pwdToUse, PASSWORD_BCRYPT) : crypt($pwdToUse);
            $hashEsc = $this->db->real_escape_string($hash);
            if (!$this->db->query("INSERT INTO users (username, password_hash, full_name, phone, email, theater_id, role, status) VALUES ('{$uEsc}', '{$hashEsc}', '{$fnEsc}', '{$phEsc}', '{$emEsc}', {$theaterSql}, '{$rlEsc}', '{$stEsc}')")) jsonResponse(array('success' => false, 'message' => 'Không thể tạo tài khoản: '.$this->db->error), 500);
            $newId = (int)$this->db->insert_id;
            $this->logUserManagementActivity($newId, 'created', 'Tạo tài khoản, gán vai trò '.$userRole.' và phạm vi rạp '.($theaterId > 0 ? '#'.$theaterId : 'toàn hệ thống').'.');
            jsonResponse(array('success' => true, 'message' => 'Đã tạo tài khoản và gán quyền trong Aurora DB.', 'data' => array('id' => $newId)), 201);
        }
    }

    public function deleteUser()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if ($role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền xóa tài khoản TMS.'), 403);
        }
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu ID người dùng.'), 400);
        }
        // Không cho phép tự xóa tài khoản của chính mình
        if (!empty($_SESSION['tms_user']['id']) && (int)$_SESSION['tms_user']['id'] === $id) {
            jsonResponse(array('success' => false, 'message' => 'Không thể xóa tài khoản của chính bạn đang đăng nhập.'), 400);
        }
        $this->db->query("DELETE FROM users WHERE id = " . $id);
        jsonResponse(array('success' => true, 'message' => 'Đã xóa tài khoản người dùng khỏi hệ thống.'));
    }

    // ========================================================
    // GIAO DỊCH & HOÀN TIỀN (TRANSACTIONS & REFUNDS)
    // ========================================================

    public function transactions()
    {
        $rows = $this->rows("SELECT t.*, c.full_name customer_name, c.phone customer_phone FROM transactions t LEFT JOIN customers c ON c.id=t.customer_id ORDER BY t.id DESC LIMIT 100");
        // Nếu bảng transactions chưa có dữ liệu, hệ thống trả về danh sách trống.
        if (empty($rows)) {
            $rows = array();
        }
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function createTransaction()
    {
        requireAdmin();
        $input = requestJson();
        $code = isset($input['transaction_code']) ? trim((string)$input['transaction_code']) : ('TXN-' . date('ymdHis') . rand(10, 99));
        $customer = isset($input['customer_id']) && $input['customer_id'] !== '' ? (int)$input['customer_id'] : null;
        $channel = isset($input['channel']) ? $input['channel'] : 'pos';
        $amount = isset($input['amount']) ? (float)$input['amount'] : 0;
        $method = isset($input['payment_method']) ? $input['payment_method'] : 'cash';
        if ($amount < 0 || !in_array($channel, array('pos', 'website', 'ota'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Dữ liệu giao dịch không hợp lệ.'), 400);
        }
        // Kiểm tra code trùng
        $codeEsc = $this->db->real_escape_string($code);
        $exist = $this->rows("SELECT id FROM transactions WHERE transaction_code = '{$codeEsc}'");
        if ($exist) {
            $code = $code . '-' . rand(100, 999);
            $codeEsc = $this->db->real_escape_string($code);
        }
        $custVal = $customer ? $customer : 'NULL';
        $channelEsc = $this->db->real_escape_string($channel);
        $methodEsc = $this->db->real_escape_string($method);
        $this->db->query("INSERT INTO transactions (transaction_code, customer_id, channel, amount, payment_method, status) VALUES ('{$codeEsc}', {$custVal}, '{$channelEsc}', {$amount}, '{$methodEsc}', 'paid')");
        if ($this->db->error) {
            jsonResponse(array('success' => false, 'message' => 'Lỗi tạo giao dịch: ' . $this->db->error), 500);
        }
        // Ghi audit log
        $userInfo = isset($_SESSION['tms_user']) ? $_SESSION['tms_user'] : array('username' => 'system', 'role' => 'system');
        $uname = isset($userInfo['username']) ? $this->db->real_escape_string($userInfo['username']) : 'system';
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
        $ipEsc = $this->db->real_escape_string($ip);
        $this->db->query("INSERT INTO audit_logs (username, action, details, ip_address) VALUES ('{$uname}', 'CREATE_TRANSACTION', 'Tạo giao dịch {$codeEsc} - {$amount} VND', '{$ipEsc}')");
        jsonResponse(array('success' => true, 'message' => 'Đã tạo giao dịch.', 'data' => array('id' => $this->db->insert_id, 'transaction_code' => $code)), 201);
    }

    public function refunds()
    {
        $rows = $this->rows("SELECT * FROM refunds ORDER BY id DESC LIMIT 100");
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function updateRefund()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        $status = isset($input['status']) ? $input['status'] : '';

        if ($id <= 0) {
            $transactionCode = isset($input['transaction_code']) ? trim((string)$input['transaction_code']) : ('TXN-' . time());
            $transaction = $this->rows("SELECT id, customer_id, amount FROM transactions WHERE transaction_code = '{$this->db->real_escape_string($transactionCode)}' LIMIT 1");
            if (!$transaction) {
                jsonResponse(array('success' => false, 'message' => 'Không tìm thấy giao dịch để hoàn trả.'), 400);
            }
            $amount = isset($input['amount']) ? (float)$input['amount'] : (float)$transaction[0]['amount'];
            $reason = isset($input['reason']) ? trim((string)$input['reason']) : 'Yêu cầu hoàn trả vé';
            $requestedBy = !empty($_SESSION['tms_user']['id']) ? (int)$_SESSION['tms_user']['id'] : null;
            $this->db->query("INSERT INTO refunds (transaction_id, reason, amount, status, requested_by, processed_at) VALUES ({$transaction[0]['id']}, '{$this->db->real_escape_string($reason)}', {$amount}, 'pending', " . ($requestedBy ? $requestedBy : 'NULL') . ", NOW())");
            jsonResponse(array('success' => true, 'message' => 'Đã tạo yêu cầu hoàn vé thành công.'));
        }

        if (in_array($status, array('approved', 'rejected', 'completed'), true) && !in_array($role, array('super_admin', 'supervisor', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Giám sát ca hoặc Ban quản lý rạp mới có quyền phê duyệt hoàn vé.'), 403);
        }

        if (!$id || !in_array($status, array('approved', 'rejected', 'completed', 'pending'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Dữ liệu hoàn tiền không hợp lệ.'), 400);
        }

        $approver = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Quản trị viên';
        $this->execute("UPDATE refunds SET status=?, processed_at=NOW() WHERE id=?", 'si', array($status, $id));
        jsonResponse(array('success' => true, 'message' => 'Đã cập nhật yêu cầu hoàn tiền thành công.'));
    }

    public function seats()
    {
        $screen = isset($_GET['screen_id']) ? (int)$_GET['screen_id'] : 0;
        if (!$screen) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu screen_id.'), 400);
        }
        $rows = $this->rows('SELECT * FROM seats WHERE screen_id=' . $screen . ' ORDER BY seat_code');
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function report()
    {
        $role = $this->getCurrentRole();
        $from = isset($_GET['from']) ? $_GET['from'] : date('Y-m-d', strtotime('-6 days'));
        $to = isset($_GET['to']) ? $_GET['to'] : date('Y-m-d');
        $from = $this->db->real_escape_string($from);
        $to = $this->db->real_escape_string($to);

        $daily = $this->rows("SELECT * FROM revenue_logs WHERE log_date BETWEEN '{$from}' AND '{$to}' ORDER BY log_date");
        $summary = $this->rows("SELECT COALESCE(SUM(total_revenue),0) total_revenue, COALESCE(SUM(ticket_sales),0) ticket_sales, COALESCE(SUM(concession_sales),0) concession_sales, COALESCE(SUM(total_tickets),0) total_tickets, COALESCE(AVG(occupancy_rate),0) occupancy_rate FROM revenue_logs WHERE log_date BETWEEN '{$from}' AND '{$to}'");
        $summaryRow = isset($summary[0]) ? $summary[0] : array();

        // Thống kê theo phương thức và kênh bán (hữu ích cho Kế toán & Super Admin)
        $byChannel = $this->rows("SELECT channel, COUNT(*) count, COALESCE(SUM(amount), 0) total FROM transactions WHERE status = 'paid' GROUP BY channel");
        $byMethod = $this->rows("SELECT payment_method, COUNT(*) count, COALESCE(SUM(amount), 0) total FROM transactions WHERE status = 'paid' GROUP BY payment_method");

        jsonResponse(array(
            'success' => true,
            'data' => array(
                'from' => $from,
                'to' => $to,
                'role' => $role,
                'summary' => $summaryRow,
                'daily' => $daily,
                'channels' => $byChannel,
                'payment_methods' => $byMethod,
            )
        ));
    }

    private function scalar($sql)
    {
        $result = $this->db->query($sql);
        $row = $result ? $result->fetch_row() : array(0);
        if (!isset($row[0]) || $row[0] === null) {
            return 0;
        }
        // Preserve decimal aggregates such as occupancy/revenue while keeping
        // count queries as integers for API consumers.
        return strpos((string)$row[0], '.') !== false ? (float)$row[0] : (int)$row[0];
    }

    private function rows($sql)
    {
        $result = $this->db->query($sql);
        $rows = array();
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $rows[] = $row;
            }
        }
        return $rows;
    }

    private function numberFields($row, $fields)
    {
        foreach ($fields as $field) {
            if (isset($row[$field])) {
                $row[$field] = (float)$row[$field];
            }
        }
        return $row;
    }

    private function preparedRows($sql, $types, $params)
    {
        $stmt = $this->prepare($sql, $types, $params);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = array();
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
        return $rows;
    }

    private function execute($sql, $types, $params)
    {
        $stmt = $this->prepare($sql, $types, $params);
        if (!$stmt->execute()) {
            jsonResponse(array('success' => false, 'message' => $stmt->error), 500);
        }
    }

    private function prepare($sql, $types, $params)
    {
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            jsonResponse(array('success' => false, 'message' => $this->db->error), 500);
        }
        if ($types !== '') {
            $refs = array($types);
            foreach ($params as $key => $value) {
                $refs[] = &$params[$key];
            }
            call_user_func_array(array($stmt, 'bind_param'), $refs);
        }
        return $stmt;
    }
}
