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
            'screens' => array(
                'theater_id' => 'BIGINT UNSIGNED NULL',
                'screen_code' => "VARCHAR(30) NOT NULL DEFAULT ''",
                'screen_type' => "VARCHAR(40) NOT NULL DEFAULT '2D'",
                'projector_status' => "VARCHAR(20) NOT NULL DEFAULT 'online'",
                'sound_system_status' => "VARCHAR(20) NOT NULL DEFAULT 'online'",
                'hvac_temperature' => 'DECIMAL(4,1) NOT NULL DEFAULT 22.0',
                'lamp_hours' => 'INT UNSIGNED NOT NULL DEFAULT 0',
                'status' => "VARCHAR(20) NOT NULL DEFAULT 'active'"
            ),
            'staff_shifts' => array('theater_id' => 'BIGINT UNSIGNED NULL')
        );
        foreach ($columns as $table => $defs) foreach ($defs as $column => $definition) {
            $exists = $this->db->query("SHOW COLUMNS FROM {$table} LIKE '{$column}'");
            if (!$exists || $exists->num_rows === 0) $this->db->query("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
        }
        $screenIndex = $this->db->query("SHOW INDEX FROM screens WHERE Key_name='idx_screens_theater_scope'");
        if (!$screenIndex || $screenIndex->num_rows === 0) $this->db->query("CREATE INDEX idx_screens_theater_scope ON screens (theater_id, status)");
        $userIndex = $this->db->query("SHOW INDEX FROM users WHERE Key_name='idx_users_theater_scope'");
        if (!$userIndex || $userIndex->num_rows === 0) $this->db->query("CREATE INDEX idx_users_theater_scope ON users (theater_id, role, status)");
        $staffIndex = $this->db->query("SHOW INDEX FROM staff_shifts WHERE Key_name='idx_staff_shift_theater_date'");
        if (!$staffIndex || $staffIndex->num_rows === 0) $this->db->query("CREATE INDEX idx_staff_shift_theater_date ON staff_shifts (theater_id, work_date, status)");
        $this->db->query("UPDATE screens SET screen_code=CONCAT('SCR-', LPAD(id, 3, '0')) WHERE screen_code='' OR screen_code IS NULL");
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
     * POS employees and selling sessions are shared by TMS and the POS app.
     * Keep this migration here so an existing aurora_db installation is
     * upgraded before a cinema administrator reads or changes the data.
     */
    private function ensurePosManagementSchema()
    {
        $this->db->query("CREATE TABLE IF NOT EXISTS pos_counter_roles (
            code VARCHAR(30) NOT NULL PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            description VARCHAR(255) NOT NULL,
            can_sell_tickets TINYINT(1) NOT NULL DEFAULT 0,
            can_sell_concessions TINYINT(1) NOT NULL DEFAULT 0,
            can_redeem_online_booking TINYINT(1) NOT NULL DEFAULT 0,
            can_sell_merchandise TINYINT(1) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            sort_order INT NOT NULL DEFAULT 0,
            updated_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
        $this->db->query("INSERT INTO pos_counter_roles (code,name,description,can_sell_tickets,can_sell_concessions,can_redeem_online_booking,can_sell_merchandise,is_active,sort_order,updated_at) VALUES
            ('concession','Concession','Đổi vé online và bán bắp nước trực tiếp',0,1,1,0,1,10,NOW()),
            ('box_ticket','Box Ticket','Bán vé tại quầy và bán kèm bắp nước',1,1,0,0,1,20,NOW()),
            ('merchandise','Merchandise','Bán quà lưu niệm và sản phẩm phim',0,0,0,1,1,30,NOW())
            ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description),can_sell_tickets=VALUES(can_sell_tickets),can_sell_concessions=VALUES(can_sell_concessions),can_redeem_online_booking=VALUES(can_redeem_online_booking),can_sell_merchandise=VALUES(can_sell_merchandise),is_active=VALUES(is_active),sort_order=VALUES(sort_order),updated_at=NOW()");
        $this->db->query("CREATE TABLE IF NOT EXISTS pos_users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(60) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(120) NOT NULL,
            phone VARCHAR(20) NULL,
            employee_code VARCHAR(30) NULL,
            role ENUM('cashier','supervisor','admin') NOT NULL DEFAULT 'cashier',
            counter_role_code VARCHAR(30) NOT NULL DEFAULT 'box_ticket',
            status ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
            theater_id BIGINT UNSIGNED NOT NULL,
            counter_code VARCHAR(60) NOT NULL DEFAULT 'QUAY-01',
            last_login_at DATETIME NULL,
            issued_by_tms_user_id BIGINT UNSIGNED NULL,
            issued_by_name VARCHAR(120) NULL,
            updated_by_tms_user_id BIGINT UNSIGNED NULL,
            updated_by_name VARCHAR(120) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            UNIQUE KEY uq_pos_users_username (username),
            KEY idx_pos_users_theater (theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
        $userColumns = array(
            'counter_role_code' => "VARCHAR(30) NOT NULL DEFAULT 'box_ticket'",
            'employee_code' => 'VARCHAR(30) NULL',
            'issued_by_tms_user_id' => 'BIGINT UNSIGNED NULL',
            'issued_by_name' => 'VARCHAR(120) NULL',
            'updated_by_tms_user_id' => 'BIGINT UNSIGNED NULL',
            'updated_by_name' => 'VARCHAR(120) NULL'
        );
        foreach ($userColumns as $column => $definition) {
            $exists = $this->db->query("SHOW COLUMNS FROM pos_users LIKE '{$column}'");
            if (!$exists || $exists->num_rows === 0) $this->db->query("ALTER TABLE pos_users ADD COLUMN {$column} {$definition}");
        }
        $employeeIndex = $this->db->query("SHOW INDEX FROM pos_users WHERE Key_name='uq_pos_users_theater_employee'");
        if (!$employeeIndex || $employeeIndex->num_rows === 0) $this->db->query("CREATE UNIQUE INDEX uq_pos_users_theater_employee ON pos_users (theater_id, employee_code)");

        $this->db->query("CREATE TABLE IF NOT EXISTS pos_shifts (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNSIGNED NOT NULL,
            theater_id BIGINT UNSIGNED NOT NULL,
            cinema_name VARCHAR(120) NOT NULL,
            counter VARCHAR(60) NOT NULL,
            initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
            cash_at_close DECIMAL(12,2) NULL,
            expected_cash DECIMAL(12,2) NULL,
            cash_difference DECIMAL(12,2) NULL,
            sales_areas VARCHAR(255) NOT NULL DEFAULT 'box_office',
            status ENUM('active','paused','closed') NOT NULL DEFAULT 'active',
            opened_at DATETIME NOT NULL,
            closed_at DATETIME NULL,
            notes TEXT NULL,
            close_note TEXT NULL,
            closed_by VARCHAR(120) NULL,
            authorized_by_tms_user_id BIGINT UNSIGNED NULL,
            authorized_by_name VARCHAR(120) NULL,
            authorized_by_role VARCHAR(30) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NULL,
            KEY idx_pos_shifts_user_status (user_id, status),
            KEY idx_pos_shifts_theater (theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
        $shiftColumns = array(
            'expected_cash' => 'DECIMAL(12,2) NULL',
            'cash_difference' => 'DECIMAL(12,2) NULL',
            'sales_areas' => "VARCHAR(255) NOT NULL DEFAULT 'box_office'",
            'close_note' => 'TEXT NULL',
            'closed_by' => 'VARCHAR(120) NULL',
            'authorized_by_tms_user_id' => 'BIGINT UNSIGNED NULL',
            'authorized_by_name' => 'VARCHAR(120) NULL',
            'authorized_by_role' => 'VARCHAR(30) NULL'
        );
        foreach ($shiftColumns as $column => $definition) {
            $exists = $this->db->query("SHOW COLUMNS FROM pos_shifts LIKE '{$column}'");
            if (!$exists || $exists->num_rows === 0) $this->db->query("ALTER TABLE pos_shifts ADD COLUMN {$column} {$definition}");
        }
        $workScheduleColumn = $this->db->query("SHOW COLUMNS FROM pos_shifts LIKE 'work_schedule_id'");
        if (!$workScheduleColumn || $workScheduleColumn->num_rows === 0) $this->db->query("ALTER TABLE pos_shifts ADD COLUMN work_schedule_id BIGINT UNSIGNED NULL");

        $this->db->query("CREATE TABLE IF NOT EXISTS pos_work_schedules (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            theater_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            work_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            sales_areas VARCHAR(255) NOT NULL,
            counter VARCHAR(60) NOT NULL,
            initial_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
            status ENUM('scheduled','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'scheduled',
            linked_shift_id BIGINT UNSIGNED NULL,
            notes VARCHAR(1000) NULL,
            created_by_tms_user_id BIGINT UNSIGNED NULL,
            created_by_name VARCHAR(120) NOT NULL,
            updated_by_tms_user_id BIGINT UNSIGNED NULL,
            updated_by_name VARCHAR(120) NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NULL,
            UNIQUE KEY uq_pos_work_assignment (theater_id,user_id,work_date,start_time),
            KEY idx_pos_work_date_status (theater_id,work_date,status),
            KEY idx_pos_work_counter (theater_id,counter,work_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");

        if ($this->tableExists('orders')) {
            $shiftColumn = $this->db->query("SHOW COLUMNS FROM orders LIKE 'pos_shift_id'");
            if (!$shiftColumn || $shiftColumn->num_rows === 0) $this->db->query("ALTER TABLE orders ADD COLUMN pos_shift_id BIGINT UNSIGNED NULL");
            $shiftIndex = $this->db->query("SHOW INDEX FROM orders WHERE Key_name='idx_orders_pos_shift'");
            if (!$shiftIndex || $shiftIndex->num_rows === 0) $this->db->query("CREATE INDEX idx_orders_pos_shift ON orders (pos_shift_id)");
        }
        $this->db->query("CREATE TABLE IF NOT EXISTS pos_management_audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            theater_id BIGINT UNSIGNED NOT NULL,
            pos_user_id BIGINT UNSIGNED NULL,
            actor_user_id BIGINT UNSIGNED NULL,
            actor_name VARCHAR(120) NOT NULL,
            action_name VARCHAR(50) NOT NULL,
            detail VARCHAR(500) NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_pos_management_theater_created (theater_id,created_at),
            KEY idx_pos_management_user_created (pos_user_id,created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci");
    }

    public function posCounterRoles()
    {
        $this->requirePosManagementAccess();
        $rows=$this->rows("SELECT code,name,description,can_sell_tickets,can_sell_concessions,can_redeem_online_booking,can_sell_merchandise FROM pos_counter_roles WHERE is_active=1 ORDER BY sort_order,name");
        foreach($rows as &$row){foreach(array('can_sell_tickets','can_sell_concessions','can_redeem_online_booking','can_sell_merchandise') as $field)$row[$field]=(int)$row[$field];} unset($row);
        jsonResponse(array('success'=>true,'data'=>$rows));
    }

    private function auditPosManagement($theaterId,$posUserId,$action,$detail)
    {
        $actorId=!empty($_SESSION['tms_user']['id'])?(int)$_SESSION['tms_user']['id']:0;
        $actor=!empty($_SESSION['tms_user']['full_name'])?$_SESSION['tms_user']['full_name']:'Quản trị TMS';
        $actorEsc=$this->db->real_escape_string(substr($actor,0,120)); $actionEsc=$this->db->real_escape_string(substr($action,0,50)); $detailEsc=$this->db->real_escape_string(substr($detail,0,500));
        $userValue=$posUserId>0?(int)$posUserId:'NULL'; $actorValue=$actorId>0?$actorId:'NULL';
        $this->db->query("INSERT INTO pos_management_audit_logs (theater_id,pos_user_id,actor_user_id,actor_name,action_name,detail,created_at) VALUES (".(int)$theaterId.",{$userValue},{$actorValue},'{$actorEsc}','{$actionEsc}','{$detailEsc}',NOW())");
    }

    private function requirePosManagementAccess()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Rạp hoặc Admin Tổng được quản lý nhân viên và phiên bán hàng.'), 403);
        }
        $this->ensureCinemaOwnershipSchema();
        $this->ensurePosManagementSchema();
        return $role;
    }

    private function requirePosSessionAccess()
    {
        requireAdmin();
        $role=$this->getCurrentRole();
        if(!in_array($role,array('super_admin','cinema_admin','supervisor'),true)) jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Rạp hoặc Supervisor được quản lý phiên bán hàng.'),403);
        $this->ensureCinemaOwnershipSchema();$this->ensurePosManagementSchema();
        return $role;
    }

    private function posManagementTheaterId($role, $input, $required)
    {
        if ($role === 'cinema_admin' || $role === 'supervisor') {
            $theaterId = $this->getCurrentTheaterId();
        } else {
            $theaterId = isset($input['theater_id']) ? (int)$input['theater_id'] : (isset($_GET['theater_id']) ? (int)$_GET['theater_id'] : 0);
        }
        if ($required && $theaterId <= 0) jsonResponse(array('success' => false, 'message' => 'Vui lòng chọn rạp cần quản lý.'), 422);
        if ($theaterId > 0 && !(int)$this->scalar("SELECT COUNT(*) FROM theaters WHERE id={$theaterId}")) {
            jsonResponse(array('success' => false, 'message' => 'Rạp được chọn không tồn tại trong aurora_db.'), 422);
        }
        return $theaterId;
    }

    private function posSalesAggregateForShift($shift)
    {
        $shiftId=(int)$shift['id']; $userId=(int)$shift['user_id'];
        $opened=$this->db->real_escape_string($shift['opened_at']);
        $closed=!empty($shift['closed_at'])?"'".$this->db->real_escape_string($shift['closed_at'])."'":'NOW()';
        $row=$this->row("SELECT COUNT(DISTINCT o.id) order_count,
            COALESCE(SUM(CASE WHEN o.status='PAID' THEN o.total_amount ELSE 0 END),0) total_revenue,
            COALESCE(SUM(CASE WHEN o.status='PAID' AND UPPER(o.payment_method)='CASH' THEN o.total_amount ELSE 0 END),0) cash_revenue,
            COALESCE(SUM(CASE WHEN o.status='PAID' AND UPPER(o.payment_method)<>'CASH' THEN o.total_amount ELSE 0 END),0) non_cash_revenue
          FROM orders o WHERE o.cashier_id={$userId}
            AND (o.pos_shift_id={$shiftId} OR (o.pos_shift_id IS NULL AND o.created_at>='{$opened}' AND o.created_at<={$closed}))");
        return $row?$row:array('order_count'=>0,'total_revenue'=>0,'cash_revenue'=>0,'non_cash_revenue'=>0);
    }

    public function posStaff()
    {
        $role = $this->requirePosManagementAccess();
        $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
        $input = $method === 'GET' ? array() : requestJson();
        $theaterId = $this->posManagementTheaterId($role, $input, $method !== 'GET');

        if ($method === 'GET') {
            $where = array("pu.role IN ('cashier','supervisor')");
            if ($theaterId > 0) $where[] = 'pu.theater_id=' . $theaterId;
            $summaryWhere=implode(' AND ',$where);
            if (!empty($_GET['q'])) {
                $q = $this->db->real_escape_string(trim((string)$_GET['q']));
                $where[] = "(pu.full_name LIKE '%{$q}%' OR pu.employee_code LIKE '%{$q}%' OR pu.username LIKE '%{$q}%' OR pu.phone LIKE '%{$q}%')";
            }
            if (!empty($_GET['status']) && in_array($_GET['status'], array('active','inactive','locked'), true)) {
                $where[] = "pu.status='" . $this->db->real_escape_string($_GET['status']) . "'";
            }
            $rows = $this->rows("SELECT pu.id,pu.employee_code,pu.username,pu.full_name,pu.phone,pu.role,pu.status,pu.theater_id,pu.last_login_at,pu.created_at,pu.updated_at,pu.issued_by_tms_user_id,pu.issued_by_name,pu.updated_by_tms_user_id,pu.updated_by_name,t.name theater_name,
                (SELECT ps.id FROM pos_shifts ps WHERE ps.user_id=pu.id AND ps.status IN ('active','paused') ORDER BY ps.id DESC LIMIT 1) open_shift_id,
                (SELECT ps.status FROM pos_shifts ps WHERE ps.user_id=pu.id AND ps.status IN ('active','paused') ORDER BY ps.id DESC LIMIT 1) shift_status,
                (SELECT COUNT(*) FROM orders o WHERE o.cashier_id=pu.id AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_orders,
                (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o WHERE o.cashier_id=pu.id AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_revenue
              FROM pos_users pu LEFT JOIN theaters t ON t.id=pu.theater_id
              WHERE " . implode(' AND ', $where) . " ORDER BY FIELD(pu.status,'active','locked','inactive'),pu.full_name,pu.id");
            $summary = array('total'=>0,'active'=>0,'working'=>0,'locked'=>0,'inactive'=>0,'cashiers'=>0,'supervisors'=>0,'today_orders'=>0,'today_revenue'=>0);
            foreach ($rows as &$row) {
                $row['id']=(int)$row['id']; $row['theater_id']=(int)$row['theater_id']; $row['open_shift_id']=(int)$row['open_shift_id'];
                $row['today_orders']=(int)$row['today_orders']; $row['today_revenue']=(float)$row['today_revenue'];
                foreach(array('can_sell_tickets','can_sell_concessions','can_redeem_online_booking','can_sell_merchandise') as $field)$row[$field]=(int)$row[$field];
            }
            unset($row);
            $summaryRows=$this->rows("SELECT pu.status,pu.role,
                (SELECT COUNT(*) FROM pos_shifts ps WHERE ps.user_id=pu.id AND ps.status IN ('active','paused')) open_shifts,
                (SELECT COUNT(*) FROM orders o WHERE o.cashier_id=pu.id AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_orders,
                (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o WHERE o.cashier_id=pu.id AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_revenue
              FROM pos_users pu WHERE {$summaryWhere}");
            $summary['total']=count($summaryRows);
            foreach($summaryRows as $summaryRow){if($summaryRow['status']==='active')$summary['active']++;if($summaryRow['status']==='locked')$summary['locked']++;if($summaryRow['status']==='inactive')$summary['inactive']++;if($summaryRow['role']==='cashier')$summary['cashiers']++;else if($summaryRow['role']==='supervisor')$summary['supervisors']++;if((int)$summaryRow['open_shifts']>0)$summary['working']++;$summary['today_orders']+=(int)$summaryRow['today_orders'];$summary['today_revenue']+=(float)$summaryRow['today_revenue'];}
            jsonResponse(array('success'=>true,'data'=>$rows,'summary'=>$summary));
        }

        if ($method === 'DELETE') {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
            if ($id <= 0) jsonResponse(array('success'=>false,'message'=>'Nhân viên không hợp lệ.'),422);
            $scope = $role === 'cinema_admin' ? " AND theater_id={$theaterId}" : ($theaterId > 0 ? " AND theater_id={$theaterId}" : '');
            if (!(int)$this->scalar("SELECT COUNT(*) FROM pos_users WHERE id={$id} AND role IN ('cashier','supervisor'){$scope}")) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy nhân viên trong rạp phụ trách.'),404);
            if ((int)$this->scalar("SELECT COUNT(*) FROM pos_shifts WHERE user_id={$id} AND status IN ('active','paused')")) jsonResponse(array('success'=>false,'message'=>'Hãy đóng phiên bán hàng đang mở trước khi ngưng nhân viên.'),409);
            if (!$this->db->query("UPDATE pos_users SET status='inactive',updated_at=NOW() WHERE id={$id}{$scope}")) jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật nhân viên: '.$this->db->error),500);
            $this->auditPosManagement($theaterId,$id,'STAFF_DEACTIVATED','Ngưng tài khoản nhân viên bán hàng và giữ nguyên lịch sử nghiệp vụ.');
            jsonResponse(array('success'=>true,'message'=>'Đã ngưng tài khoản bán hàng; lịch sử phiên và đơn hàng vẫn được giữ lại.'));
        }

        if ($method !== 'POST' && $method !== 'PUT') jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $fullName = trim(isset($input['full_name']) ? (string)$input['full_name'] : '');
        $phone = trim(isset($input['phone']) ? (string)$input['phone'] : '');
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        $username = $phone;
        $employeeCode = $phone;
        $posRole = isset($input['role']) && in_array($input['role'],array('cashier','supervisor'),true) ? $input['role'] : 'cashier';
        if ($id > 0 && !isset($input['role'])) {
            $existingRole = $this->row("SELECT role FROM pos_users WHERE id={$id} AND theater_id={$theaterId} LIMIT 1");
            if ($existingRole && in_array($existingRole['role'],array('cashier','supervisor'),true)) $posRole = $existingRole['role'];
        }
        $status = isset($input['status']) && in_array($input['status'],array('active','inactive','locked'),true) ? $input['status'] : 'active';
        $password = isset($input['password']) ? (string)$input['password'] : '';
        if (strlen($fullName)<2 || strlen($fullName)>120) jsonResponse(array('success'=>false,'message'=>'Họ tên nhân viên phải có từ 2 đến 120 ký tự.'),422);
        if (!preg_match('/^\+?[0-9]{9,15}$/',$phone)) jsonResponse(array('success'=>false,'message'=>'Mã nhân viên / số điện thoại cần có từ 9 đến 15 chữ số.'),422);
        if ($password==='' && $id===0) $password='88888888';
        if ($id===0 && strlen($password)<4) jsonResponse(array('success'=>false,'message'=>'Mật khẩu ban đầu cần ít nhất 4 ký tự.'),422);
        if ($password!=='' && (strlen($password)<4 || strlen($password)>128)) jsonResponse(array('success'=>false,'message'=>'Mật khẩu cần có từ 4 đến 128 ký tự.'),422);
        $fullNameEsc=$this->db->real_escape_string($fullName); $usernameEsc=$this->db->real_escape_string($username); $phoneEsc=$this->db->real_escape_string($phone);
        $employeeEsc=$this->db->real_escape_string($employeeCode);
        $actorId=!empty($_SESSION['tms_user']['id'])?(int)$_SESSION['tms_user']['id']:0;
        $actorName=!empty($_SESSION['tms_user']['full_name'])?(string)$_SESSION['tms_user']['full_name']:'Quản trị TMS';
        $actorNameEsc=$this->db->real_escape_string(substr($actorName,0,120));
        $actorIdSql=$actorId>0?(string)$actorId:'NULL';
        $duplicateId = (int)$this->scalar("SELECT id FROM pos_users WHERE username='{$usernameEsc}' AND id<>".$id." LIMIT 1");
        if ($duplicateId) jsonResponse(array('success'=>false,'message'=>'Mã nhân viên / số điện thoại đã được sử dụng.'),409);
        $duplicateEmployee = (int)$this->scalar("SELECT id FROM pos_users WHERE theater_id={$theaterId} AND employee_code='{$employeeEsc}' AND id<>".$id." LIMIT 1");
        if ($duplicateEmployee) jsonResponse(array('success'=>false,'message'=>'Mã nhân viên / số điện thoại đã tồn tại tại rạp này.'),409);
        if ($id>0) {
            if (!(int)$this->scalar("SELECT COUNT(*) FROM pos_users WHERE id={$id} AND theater_id={$theaterId} AND role IN ('cashier','supervisor')")) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy nhân viên trong rạp phụ trách.'),404);
            if ($status!=='active' && (int)$this->scalar("SELECT COUNT(*) FROM pos_shifts WHERE user_id={$id} AND status IN ('active','paused')")) jsonResponse(array('success'=>false,'message'=>'Không thể khóa/ngưng nhân viên khi phiên bán hàng còn mở.'),409);
            $passwordSql='';
            if ($password!=='') { $hash=$this->db->real_escape_string('sha256:aurora-pos-local-2026:'.hash('sha256','aurora-pos-local-2026:'.$password)); $passwordSql=",password_hash='{$hash}'"; }
            $sql="UPDATE pos_users SET employee_code='{$employeeEsc}',username='{$usernameEsc}',full_name='{$fullNameEsc}',phone='{$phoneEsc}',role='{$posRole}',status='{$status}',updated_by_tms_user_id={$actorIdSql},updated_by_name='{$actorNameEsc}',updated_at=NOW(){$passwordSql} WHERE id={$id} AND theater_id={$theaterId}";
            if (!$this->db->query($sql)) jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật nhân viên: '.$this->db->error),500);
            $this->auditPosManagement($theaterId,$id,'STAFF_UPDATED','Cập nhật thông tin nhân viên hoặc tài khoản POS.');
            jsonResponse(array('success'=>true,'message'=>'Đã cập nhật hồ sơ và quyền đăng nhập POS.'));
        }
        $hash=$this->db->real_escape_string('sha256:aurora-pos-local-2026:'.hash('sha256','aurora-pos-local-2026:'.$password));
        $sql="INSERT INTO pos_users (employee_code,username,password_hash,full_name,phone,role,status,theater_id,issued_by_tms_user_id,issued_by_name,updated_by_tms_user_id,updated_by_name,created_at,updated_at) VALUES ('{$employeeEsc}','{$usernameEsc}','{$hash}','{$fullNameEsc}','{$phoneEsc}','{$posRole}','{$status}',{$theaterId},{$actorIdSql},'{$actorNameEsc}',{$actorIdSql},'{$actorNameEsc}',NOW(),NOW())";
        if (!$this->db->query($sql)) jsonResponse(array('success'=>false,'message'=>'Không thể tạo nhân viên: '.$this->db->error),500);
        $createdId=(int)$this->db->insert_id; $this->auditPosManagement($theaterId,$createdId,'STAFF_CREATED','Tạo nhân viên bán hàng và cấp tài khoản đăng nhập POS.');
        jsonResponse(array('success'=>true,'message'=>'Đã tạo nhân viên bán hàng và tài khoản đăng nhập POS.','data'=>array('id'=>$createdId)),201);
    }

    public function posStaffDetail()
    {
        $role=$this->requirePosManagementAccess();
        $id=isset($_GET['id'])?(int)$_GET['id']:0;
        $theaterId=$this->posManagementTheaterId($role,array(),false);
        if($id<=0) jsonResponse(array('success'=>false,'message'=>'Nhân viên không hợp lệ.'),422);
        $scope=$theaterId>0?' AND pu.theater_id='.$theaterId:'';
        $staff=$this->row("SELECT pu.id,pu.employee_code,pu.username,pu.full_name,pu.phone,pu.role,pu.status,pu.theater_id,pu.last_login_at,pu.created_at,pu.updated_at,pu.issued_by_tms_user_id,pu.issued_by_name,pu.updated_by_tms_user_id,pu.updated_by_name,t.name theater_name,t.address theater_address,
          (SELECT ps.id FROM pos_shifts ps WHERE ps.user_id=pu.id AND ps.status IN ('active','paused') ORDER BY ps.id DESC LIMIT 1) open_shift_id,
          (SELECT ps.status FROM pos_shifts ps WHERE ps.user_id=pu.id AND ps.status IN ('active','paused') ORDER BY ps.id DESC LIMIT 1) shift_status,
          (SELECT COUNT(*) FROM orders o WHERE o.cashier_id=pu.id AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_orders,
          (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o WHERE o.cashier_id=pu.id AND o.status='PAID' AND DATE(o.created_at)=CURDATE()) today_revenue
          FROM pos_users pu LEFT JOIN theaters t ON t.id=pu.theater_id
          WHERE pu.id={$id} AND pu.role IN ('cashier','supervisor'){$scope} LIMIT 1");
        if(!$staff) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy nhân viên trong phạm vi rạp phụ trách.'),404);
        $userId=(int)$staff['id'];
        $performance=$this->row("SELECT
            COUNT(CASE WHEN o.status='PAID' THEN 1 END) order_count,
            COALESCE(SUM(CASE WHEN o.status='PAID' THEN o.total_amount ELSE 0 END),0) revenue,
            COALESCE(AVG(CASE WHEN o.status='PAID' THEN o.total_amount ELSE NULL END),0) average_order,
            COUNT(CASE WHEN o.status='CANCELLED' THEN 1 END) cancelled_orders,
            COUNT(DISTINCT CASE WHEN o.status='PAID' THEN DATE(o.created_at) END) selling_days
          FROM orders o WHERE o.cashier_id={$userId} AND o.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)");
        if(!$performance)$performance=array('order_count'=>0,'revenue'=>0,'average_order'=>0,'cancelled_orders'=>0,'selling_days'=>0);
        $performance['order_count']=(int)$performance['order_count']; $performance['revenue']=(float)$performance['revenue'];
        $performance['average_order']=(float)$performance['average_order']; $performance['cancelled_orders']=(int)$performance['cancelled_orders']; $performance['selling_days']=(int)$performance['selling_days'];
        $paymentMethods=$this->rows("SELECT UPPER(payment_method) method,COUNT(*) order_count,COALESCE(SUM(total_amount),0) revenue FROM orders WHERE cashier_id={$userId} AND status='PAID' AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) GROUP BY UPPER(payment_method) ORDER BY revenue DESC");
        foreach($paymentMethods as &$payment){$payment['order_count']=(int)$payment['order_count'];$payment['revenue']=(float)$payment['revenue'];} unset($payment);
        $recentShifts=$this->rows("SELECT * FROM pos_shifts WHERE user_id={$userId} AND theater_id=".(int)$staff['theater_id']." ORDER BY opened_at DESC,id DESC LIMIT 8");
        foreach($recentShifts as &$shift){
            $sales=$this->posSalesAggregateForShift($shift); $shift['id']=(int)$shift['id']; $shift['initial_cash']=(float)$shift['initial_cash'];
            $shift['cash_at_close']=$shift['cash_at_close']===null?null:(float)$shift['cash_at_close']; $shift['order_count']=(int)$sales['order_count']; $shift['total_revenue']=(float)$sales['total_revenue']; $shift['cash_revenue']=(float)$sales['cash_revenue'];
            $shift['expected_cash']=$shift['expected_cash']===null?$shift['initial_cash']+$shift['cash_revenue']:(float)$shift['expected_cash'];
            $shift['cash_difference']=$shift['cash_difference']===null?($shift['cash_at_close']===null?null:$shift['cash_at_close']-$shift['expected_cash']):(float)$shift['cash_difference'];
        } unset($shift);
        $loginEvents=$this->rows("SELECT id,event_type,is_success,ip_address,created_at FROM pos_login_events WHERE user_id={$userId} ORDER BY created_at DESC,id DESC LIMIT 8");
        foreach($loginEvents as &$event){$event['id']=(int)$event['id'];$event['is_success']=(int)$event['is_success'];} unset($event);
        $staff['id']=(int)$staff['id']; $staff['theater_id']=(int)$staff['theater_id']; $staff['open_shift_id']=(int)$staff['open_shift_id']; $staff['today_orders']=(int)$staff['today_orders']; $staff['today_revenue']=(float)$staff['today_revenue'];
        $managementEvents=$this->rows("SELECT id,actor_name,action_name,detail,created_at FROM pos_management_audit_logs WHERE pos_user_id={$userId} AND theater_id=".(int)$staff['theater_id']." ORDER BY created_at DESC,id DESC LIMIT 8");
        jsonResponse(array('success'=>true,'data'=>array('staff'=>$staff,'performance_30_days'=>$performance,'payment_methods'=>$paymentMethods,'recent_shifts'=>$recentShifts,'login_events'=>$loginEvents,'management_events'=>$managementEvents)));
    }

    public function posSessions()
    {
        $role = $this->requirePosSessionAccess();
        $method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
        $input = $method === 'GET' ? array() : requestJson();
        $theaterId = $this->posManagementTheaterId($role,$input,$method!=='GET');
        if ($method === 'GET') {
            $where=array('1=1');
            if ($theaterId>0) $where[]='ps.theater_id='.$theaterId;
            $date=isset($_GET['date'])?trim((string)$_GET['date']):date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$date)) jsonResponse(array('success'=>false,'message'=>'Ngày xem phiên không hợp lệ.'),422);
            $dateEsc=$this->db->real_escape_string($date); $where[]="DATE(ps.opened_at)='{$dateEsc}'";
            if (!empty($_GET['status']) && in_array($_GET['status'],array('active','paused','closed'),true)) $where[]="ps.status='".$this->db->real_escape_string($_GET['status'])."'";
            $rows=$this->rows("SELECT ps.*,pu.employee_code,pu.full_name,pu.username,pu.phone,pu.role,t.name theater_name
              FROM pos_shifts ps INNER JOIN pos_users pu ON pu.id=ps.user_id LEFT JOIN theaters t ON t.id=ps.theater_id
              WHERE ".implode(' AND ',$where)." ORDER BY ps.opened_at DESC,ps.id DESC");
            $summary=array('total'=>count($rows),'active'=>0,'paused'=>0,'closed'=>0,'order_count'=>0,'total_revenue'=>0,'cash_difference'=>0);
            foreach($rows as &$row){
                $sales=$this->posSalesAggregateForShift($row);
                $row['order_count']=$sales['order_count']; $row['total_revenue']=$sales['total_revenue']; $row['cash_revenue']=$sales['cash_revenue']; $row['non_cash_revenue']=$sales['non_cash_revenue'];
                $row['id']=(int)$row['id']; $row['user_id']=(int)$row['user_id']; $row['theater_id']=(int)$row['theater_id'];
                $row['initial_cash']=(float)$row['initial_cash']; $row['cash_at_close']=$row['cash_at_close']===null?null:(float)$row['cash_at_close'];
                $row['sales_areas']=$row['sales_areas']===''?array():explode(',',$row['sales_areas']);
                $row['order_count']=(int)$row['order_count']; $row['total_revenue']=(float)$row['total_revenue']; $row['cash_revenue']=(float)$row['cash_revenue']; $row['non_cash_revenue']=(float)$row['non_cash_revenue'];
                $row['expected_cash']=$row['expected_cash']===null?$row['initial_cash']+$row['cash_revenue']:(float)$row['expected_cash'];
                $row['cash_difference']=$row['cash_difference']===null?($row['cash_at_close']===null?null:$row['cash_at_close']-$row['expected_cash']):(float)$row['cash_difference'];
                $summary[$row['status']]++; $summary['order_count']+=$row['order_count']; $summary['total_revenue']+=$row['total_revenue']; if($row['cash_difference']!==null)$summary['cash_difference']+=$row['cash_difference'];
            }
            $availableStaff=$this->rows("SELECT pu.id,pu.employee_code,pu.username,pu.full_name,pu.phone,pu.role,pu.status,pu.theater_id,t.name theater_name,(SELECT ps.id FROM pos_shifts ps WHERE ps.user_id=pu.id AND ps.status IN ('active','paused') ORDER BY ps.id DESC LIMIT 1) open_shift_id FROM pos_users pu LEFT JOIN theaters t ON t.id=pu.theater_id WHERE pu.role IN ('cashier','supervisor') AND pu.status='active'".($theaterId>0?' AND pu.theater_id='.$theaterId:'')." ORDER BY pu.full_name");
            foreach($availableStaff as &$candidate){$candidate['id']=(int)$candidate['id'];$candidate['theater_id']=(int)$candidate['theater_id'];$candidate['open_shift_id']=(int)$candidate['open_shift_id'];}unset($candidate);
            unset($row); jsonResponse(array('success'=>true,'data'=>$rows,'summary'=>$summary,'date'=>$date,'available_staff'=>$availableStaff));
        }
        if ($method!=='POST' && $method!=='PUT') jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $operation=isset($input['operation'])?strtolower(trim((string)$input['operation'])):'open';
        if ($operation==='open') {
            $scheduleId=isset($input['work_schedule_id'])?(int)$input['work_schedule_id']:0;
            $schedule=null;
            if($scheduleId>0){
                $schedule=$this->row("SELECT * FROM pos_work_schedules WHERE id={$scheduleId} AND theater_id={$theaterId} LIMIT 1");
                if(!$schedule) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy ca làm việc trong rạp phụ trách.'),404);
                if(!in_array($schedule['status'],array('scheduled','confirmed'),true)) jsonResponse(array('success'=>false,'message'=>'Ca làm việc này đã mở phiên, hoàn tất hoặc bị hủy.'),409);
                if($schedule['work_date']!==date('Y-m-d')) jsonResponse(array('success'=>false,'message'=>'Chỉ có thể mở phiên cho ca làm việc trong ngày hôm nay.'),409);
                $input['user_id']=(int)$schedule['user_id'];
                if(empty($input['counter']))$input['counter']=$schedule['counter'];
                $input['sales_areas']=explode(',',(string)$schedule['sales_areas']);
                if(!isset($input['initial_cash']))$input['initial_cash']=$schedule['initial_cash'];
                if(empty($input['notes']))$input['notes']=$schedule['notes'];
            }
            $userId=isset($input['user_id'])?(int)$input['user_id']:0; $initial=isset($input['initial_cash'])?(float)$input['initial_cash']:0;
            $counter=strtoupper(trim(isset($input['counter'])?(string)$input['counter']:'')); $notes=trim(isset($input['notes'])?(string)$input['notes']:'');
            $allowedAreas=array('box_office','concession','merchandise','customer_service');$areas=array();
            if(isset($input['sales_areas'])&&is_array($input['sales_areas']))foreach($input['sales_areas'] as $area)if(in_array($area,$allowedAreas,true)&&!in_array($area,$areas,true))$areas[]=$area;
            if($userId<=0 || $initial<0 || $initial>100000000) jsonResponse(array('success'=>false,'message'=>'Nhân viên hoặc tiền đầu phiên không hợp lệ.'),422);
            if(!$areas)jsonResponse(array('success'=>false,'message'=>'Hãy chọn ít nhất một khu vực nghiệp vụ cho phiên.'),422);
            if($counter===''||strlen($counter)>60)jsonResponse(array('success'=>false,'message'=>'Quầy bán không hợp lệ.'),422);
            $staff=$this->row("SELECT id,full_name FROM pos_users WHERE id={$userId} AND theater_id={$theaterId} AND role IN ('cashier','supervisor') AND status='active' LIMIT 1");
            if(!$staff) jsonResponse(array('success'=>false,'message'=>'Nhân viên không hoạt động hoặc không thuộc rạp phụ trách.'),404);
            if((int)$this->scalar("SELECT COUNT(*) FROM pos_shifts WHERE user_id={$userId} AND status IN ('active','paused')")) jsonResponse(array('success'=>false,'message'=>'Nhân viên này đang có một phiên chưa đóng.'),409);
            $counterEsc=$this->db->real_escape_string(substr($counter,0,60));$areasEsc=$this->db->real_escape_string(implode(',',$areas));
            if((int)$this->scalar("SELECT COUNT(*) FROM pos_shifts WHERE theater_id={$theaterId} AND counter='{$counterEsc}' AND status IN ('active','paused')")) jsonResponse(array('success'=>false,'message'=>'Quầy này đang được sử dụng bởi một phiên khác.'),409);
            $theater=$this->row("SELECT name FROM theaters WHERE id={$theaterId} LIMIT 1"); $cinemaEsc=$this->db->real_escape_string($theater['name']); $notesEsc=$this->db->real_escape_string(substr($notes,0,1000));
            $scheduleValue=$scheduleId>0?(string)$scheduleId:'NULL';
            $actorId=!empty($_SESSION['tms_user']['id'])?(int)$_SESSION['tms_user']['id']:0;$actorName=!empty($_SESSION['tms_user']['full_name'])?$_SESSION['tms_user']['full_name']:'Quản trị TMS';$actorNameEsc=$this->db->real_escape_string(substr($actorName,0,120));$roleEsc=$this->db->real_escape_string($role);$actorIdSql=$actorId>0?(string)$actorId:'NULL';
            if(!$this->db->query("INSERT INTO pos_shifts (user_id,theater_id,cinema_name,counter,sales_areas,initial_cash,status,opened_at,notes,work_schedule_id,authorized_by_tms_user_id,authorized_by_name,authorized_by_role,created_at,updated_at) VALUES ({$userId},{$theaterId},'{$cinemaEsc}','{$counterEsc}','{$areasEsc}',{$initial},'active',NOW(),'{$notesEsc}',{$scheduleValue},{$actorIdSql},'{$actorNameEsc}','{$roleEsc}',NOW(),NOW())")) jsonResponse(array('success'=>false,'message'=>'Không thể mở phiên bán hàng: '.$this->db->error),500);
            $createdShiftId=(int)$this->db->insert_id;
            if($scheduleId>0)$this->db->query("UPDATE pos_work_schedules SET status='active',linked_shift_id={$createdShiftId},updated_at=NOW() WHERE id={$scheduleId} AND theater_id={$theaterId}");
            $this->auditPosManagement($theaterId,$userId,'SHIFT_AUTHORIZED',''.$actorName.' ('.($role==='supervisor'?'Supervisor':'Admin Rạp').') đã cấp và mở phiên bán hàng tại '.$counter.'.');
            jsonResponse(array('success'=>true,'message'=>'Đã cấp quyền đăng nhập và mở phiên bán hàng cho '.$staff['full_name'].'.','data'=>array('id'=>$createdShiftId)),201);
        }
        $shiftId=isset($input['id'])?(int)$input['id']:0;
        $shift=$this->row("SELECT * FROM pos_shifts WHERE id={$shiftId} AND theater_id={$theaterId} LIMIT 1");
        if(!$shift) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy phiên bán hàng trong rạp phụ trách.'),404);
        if($operation==='pause' || $operation==='resume') {
            $required=$operation==='pause'?'active':'paused'; $target=$operation==='pause'?'paused':'active';
            if($shift['status']!==$required) jsonResponse(array('success'=>false,'message'=>'Trạng thái phiên đã thay đổi. Hãy tải lại dữ liệu.'),409);
            if(!$this->db->query("UPDATE pos_shifts SET status='{$target}',updated_at=NOW() WHERE id={$shiftId} AND theater_id={$theaterId} AND status='{$required}'")) jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật phiên: '.$this->db->error),500);
            $this->auditPosManagement($theaterId,(int)$shift['user_id'],$operation==='pause'?'SHIFT_PAUSED':'SHIFT_RESUMED',($operation==='pause'?'Tạm dừng':'Tiếp tục').' phiên bán hàng #'.$shiftId.'.');
            jsonResponse(array('success'=>true,'message'=>$operation==='pause'?'Đã tạm dừng phiên bán hàng.':'Đã tiếp tục phiên bán hàng.'));
        }
        if($operation!=='close') jsonResponse(array('success'=>false,'message'=>'Thao tác phiên không hợp lệ.'),422);
        if(!in_array($shift['status'],array('active','paused'),true)) jsonResponse(array('success'=>false,'message'=>'Phiên bán hàng này đã được đóng.'),409);
        $cashAtClose=isset($input['cash_at_close'])?(float)$input['cash_at_close']:-1; $closeNote=trim(isset($input['close_note'])?(string)$input['close_note']:'');
        if($cashAtClose<0 || $cashAtClose>1000000000) jsonResponse(array('success'=>false,'message'=>'Tiền mặt kiểm đếm cuối phiên không hợp lệ.'),422);
        $sales=$this->posSalesAggregateForShift($shift);
        $expected=(float)$shift['initial_cash']+(float)$sales['cash_revenue']; $difference=$cashAtClose-$expected;
        $noteEsc=$this->db->real_escape_string(substr($closeNote,0,1000)); $actor=!empty($_SESSION['tms_user']['full_name'])?$_SESSION['tms_user']['full_name']:'Admin Rạp'; $actorEsc=$this->db->real_escape_string($actor);
        if(!$this->db->query("UPDATE pos_shifts SET status='closed',cash_at_close={$cashAtClose},expected_cash={$expected},cash_difference={$difference},closed_at=NOW(),close_note='{$noteEsc}',closed_by='{$actorEsc}',updated_at=NOW() WHERE id={$shiftId} AND theater_id={$theaterId} AND status IN ('active','paused')")) jsonResponse(array('success'=>false,'message'=>'Không thể đóng phiên: '.$this->db->error),500);
        if(!empty($shift['work_schedule_id']))$this->db->query("UPDATE pos_work_schedules SET status='completed',updated_at=NOW() WHERE id=".(int)$shift['work_schedule_id']." AND theater_id={$theaterId}");
        $this->auditPosManagement($theaterId,(int)$shift['user_id'],'SHIFT_CLOSED','Kết phiên #'.$shiftId.', chênh lệch tiền mặt '.number_format($difference,0,'.','').' VND.');
        jsonResponse(array('success'=>true,'message'=>'Đã kết phiên. Tài khoản POS sẽ không thể đăng nhập cho đến khi được Admin Rạp hoặc Supervisor mở phiên mới.','data'=>array('id'=>$shiftId,'status'=>'closed','expected_cash'=>$expected,'cash_at_close'=>$cashAtClose,'cash_difference'=>$difference)));
    }

    public function posWorkSchedules()
    {
        $role=$this->requirePosManagementAccess();
        $method=isset($_SERVER['REQUEST_METHOD'])?$_SERVER['REQUEST_METHOD']:'GET';
        $input=$method==='GET'?array():requestJson();
        $theaterId=$this->posManagementTheaterId($role,$input,$method!=='GET');
        if($method==='GET'){
            $date=isset($_GET['date'])?trim((string)$_GET['date']):date('Y-m-d');
            if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$date))jsonResponse(array('success'=>false,'message'=>'Ngày xem lịch ca không hợp lệ.'),422);
            $where=array("pws.work_date='".$this->db->real_escape_string($date)."'");
            if($theaterId>0)$where[]='pws.theater_id='.$theaterId;
            if(!empty($_GET['status'])&&in_array($_GET['status'],array('scheduled','confirmed','active','completed','cancelled'),true))$where[]="pws.status='".$this->db->real_escape_string($_GET['status'])."'";
            $rows=$this->rows("SELECT pws.*,pu.employee_code,pu.full_name,pu.username,pu.role,pu.status user_status,t.name theater_name,ps.status shift_status
                FROM pos_work_schedules pws INNER JOIN pos_users pu ON pu.id=pws.user_id
                LEFT JOIN theaters t ON t.id=pws.theater_id LEFT JOIN pos_shifts ps ON ps.id=pws.linked_shift_id
                WHERE ".implode(' AND ',$where)." ORDER BY pws.start_time,pws.id");
            $summary=array('total'=>count($rows),'scheduled'=>0,'confirmed'=>0,'active'=>0,'completed'=>0,'cancelled'=>0);
            foreach($rows as &$row){$row['id']=(int)$row['id'];$row['theater_id']=(int)$row['theater_id'];$row['user_id']=(int)$row['user_id'];$row['linked_shift_id']=$row['linked_shift_id']===null?null:(int)$row['linked_shift_id'];$row['initial_cash']=(float)$row['initial_cash'];$row['sales_areas']=$row['sales_areas']===''?array():explode(',',$row['sales_areas']);$summary[$row['status']]++;}
            unset($row);jsonResponse(array('success'=>true,'data'=>$rows,'summary'=>$summary,'date'=>$date));
        }
        if(!in_array($method,array('POST','PUT','DELETE'),true))jsonResponse(array('success'=>false,'message'=>'Phương thức không được hỗ trợ.'),405);
        $id=isset($input['id'])?(int)$input['id']:(isset($_GET['id'])?(int)$_GET['id']:0);
        if($method==='DELETE'||(isset($input['operation'])&&$input['operation']==='cancel')){
            if($id<=0)jsonResponse(array('success'=>false,'message'=>'Ca làm việc không hợp lệ.'),422);
            $schedule=$this->row("SELECT * FROM pos_work_schedules WHERE id={$id} AND theater_id={$theaterId} LIMIT 1");
            if(!$schedule)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy ca làm việc trong rạp phụ trách.'),404);
            if(in_array($schedule['status'],array('active','completed'),true))jsonResponse(array('success'=>false,'message'=>'Không thể hủy ca đã mở hoặc đã hoàn tất.'),409);
            if(!$this->db->query("UPDATE pos_work_schedules SET status='cancelled',updated_at=NOW() WHERE id={$id} AND theater_id={$theaterId}"))jsonResponse(array('success'=>false,'message'=>'Không thể hủy ca làm việc: '.$this->db->error),500);
            $this->auditPosManagement($theaterId,(int)$schedule['user_id'],'WORK_SCHEDULE_CANCELLED','Hủy kế hoạch ca #'.$id.'.');
            jsonResponse(array('success'=>true,'message'=>'Đã hủy ca làm việc và giữ lại lịch sử phân công.'));
        }
        $userId=isset($input['user_id'])?(int)$input['user_id']:0;$workDate=trim(isset($input['work_date'])?(string)$input['work_date']:'');
        $start=trim(isset($input['start_time'])?(string)$input['start_time']:'');$end=trim(isset($input['end_time'])?(string)$input['end_time']:'');
        $counter=strtoupper(trim(isset($input['counter'])?(string)$input['counter']:''));$initial=isset($input['initial_cash'])?(float)$input['initial_cash']:0;$notes=trim(isset($input['notes'])?(string)$input['notes']:'');
        $allowedAreas=array('box_office','concession','merchandise','customer_service');$areas=array();
        if(isset($input['sales_areas'])&&is_array($input['sales_areas']))foreach($input['sales_areas'] as $area)if(in_array($area,$allowedAreas,true)&&!in_array($area,$areas,true))$areas[]=$area;
        if($userId<=0||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$workDate)||!preg_match('/^\d{2}:\d{2}$/',$start)||!preg_match('/^\d{2}:\d{2}$/',$end))jsonResponse(array('success'=>false,'message'=>'Nhân viên, ngày hoặc thời gian ca chưa hợp lệ.'),422);
        if($start>=$end)jsonResponse(array('success'=>false,'message'=>'Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày làm việc.'),422);
        if(!$areas)jsonResponse(array('success'=>false,'message'=>'Hãy chọn ít nhất một khu vực bán hàng.'),422);
        if($counter===''||strlen($counter)>60)jsonResponse(array('success'=>false,'message'=>'Quầy POS không hợp lệ.'),422);
        if($initial<0||$initial>100000000)jsonResponse(array('success'=>false,'message'=>'Tiền đầu ca không hợp lệ.'),422);
        $staff=$this->row("SELECT id,full_name,status FROM pos_users WHERE id={$userId} AND theater_id={$theaterId} AND role IN ('cashier','supervisor') LIMIT 1");
        if(!$staff||$staff['status']!=='active')jsonResponse(array('success'=>false,'message'=>'Nhân viên không hoạt động hoặc không thuộc rạp phụ trách.'),404);
        if($id>0){$current=$this->row("SELECT * FROM pos_work_schedules WHERE id={$id} AND theater_id={$theaterId} LIMIT 1");if(!$current)jsonResponse(array('success'=>false,'message'=>'Không tìm thấy ca làm việc.'),404);if(in_array($current['status'],array('active','completed','cancelled'),true))jsonResponse(array('success'=>false,'message'=>'Chỉ có thể chỉnh sửa ca đang lên lịch.'),409);}
        $dateEsc=$this->db->real_escape_string($workDate);$startEsc=$this->db->real_escape_string($start);$endEsc=$this->db->real_escape_string($end);$counterEsc=$this->db->real_escape_string($counter);
        $conflictId=(int)$this->scalar("SELECT id FROM pos_work_schedules WHERE theater_id={$theaterId} AND work_date='{$dateEsc}' AND status<>'cancelled' AND id<>".$id." AND (user_id={$userId} OR counter='{$counterEsc}') AND start_time<'{$endEsc}:00' AND end_time>'{$startEsc}:00' LIMIT 1");
        if($conflictId)jsonResponse(array('success'=>false,'message'=>'Nhân viên hoặc quầy POS đã có ca trùng thời gian.'),409);
        $areasEsc=$this->db->real_escape_string(implode(',',$areas));$notesEsc=$this->db->real_escape_string(substr($notes,0,1000));
        $actorId=!empty($_SESSION['tms_user']['id'])?(int)$_SESSION['tms_user']['id']:0;$actor=!empty($_SESSION['tms_user']['full_name'])?(string)$_SESSION['tms_user']['full_name']:'Quản trị TMS';$actorEsc=$this->db->real_escape_string(substr($actor,0,120));$actorIdSql=$actorId>0?(string)$actorId:'NULL';
        if($id>0){
            if(!$this->db->query("UPDATE pos_work_schedules SET user_id={$userId},work_date='{$dateEsc}',start_time='{$startEsc}:00',end_time='{$endEsc}:00',sales_areas='{$areasEsc}',counter='{$counterEsc}',initial_cash={$initial},notes='{$notesEsc}',updated_by_tms_user_id={$actorIdSql},updated_by_name='{$actorEsc}',updated_at=NOW() WHERE id={$id} AND theater_id={$theaterId}"))jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật ca làm việc: '.$this->db->error),500);
            $this->auditPosManagement($theaterId,$userId,'WORK_SCHEDULE_UPDATED','Cập nhật kế hoạch ca #'.$id.'.');jsonResponse(array('success'=>true,'message'=>'Đã cập nhật kế hoạch ca làm việc.'));
        }
        if(!$this->db->query("INSERT INTO pos_work_schedules (theater_id,user_id,work_date,start_time,end_time,sales_areas,counter,initial_cash,status,notes,created_by_tms_user_id,created_by_name,updated_by_tms_user_id,updated_by_name,created_at,updated_at) VALUES ({$theaterId},{$userId},'{$dateEsc}','{$startEsc}:00','{$endEsc}:00','{$areasEsc}','{$counterEsc}',{$initial},'scheduled','{$notesEsc}',{$actorIdSql},'{$actorEsc}',{$actorIdSql},'{$actorEsc}',NOW(),NOW())"))jsonResponse(array('success'=>false,'message'=>'Không thể tạo ca làm việc: '.$this->db->error),500);
        $createdId=(int)$this->db->insert_id;$this->auditPosManagement($theaterId,$userId,'WORK_SCHEDULE_CREATED','Thiết lập ca #'.$createdId.' từ '.$start.' đến '.$end.' tại '.$counter.'.');
        jsonResponse(array('success'=>true,'message'=>'Đã thiết lập ca làm việc cho '.$staff['full_name'].'.','data'=>array('id'=>$createdId)),201);
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

    private function enforceMovieAllocationAccess($allocationId)
    {
        $role = $this->getCurrentRole();
        if (!in_array($role, array('cinema_admin', 'supervisor'), true)) return;
        $theaterId = $this->getCurrentTheaterId();
        if ($theaterId <= 0) {
            jsonResponse(array('success' => false, 'message' => 'Tài khoản rạp chưa được gán rạp phụ trách trong aurora_db.'), 403);
        }
        $allocationId = (int)$allocationId;
        if ($allocationId <= 0 || !(int)$this->scalar("SELECT COUNT(*) FROM movie_allocations WHERE id={$allocationId} AND theater_id={$theaterId}")) {
            jsonResponse(array('success' => false, 'message' => 'Phân bổ phim không thuộc rạp bạn đang phụ trách.'), 403);
        }
    }

    public function dashboard()
    {
        requireAdmin();
        $this->ensureCinemaOwnershipSchema();
        $role = $this->getCurrentRole();
        $reportDate = !empty($_GET['date']) && preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $_GET['date']) ? $_GET['date'] : date('Y-m-d');
        $reportDateEsc = $this->db->real_escape_string($reportDate);
        $theaterId = in_array($role, array('cinema_admin', 'supervisor'), true) ? $this->getCurrentTheaterId() : 0;
        if (in_array($role, array('cinema_admin', 'supervisor'), true) && $theaterId <= 0) jsonResponse(array('success'=>false,'message'=>'Tài khoản chưa được gán rạp phụ trách trong aurora_db.'),403);
        $screenScope = $theaterId > 0 ? ' AND sc.theater_id='.$theaterId : '';
        $staffScope = $theaterId > 0 ? ' AND ss.theater_id='.$theaterId : '';
        $orderScope = $theaterId > 0 ? ' AND sc.theater_id='.$theaterId : '';
        $theater = $theaterId > 0 ? $this->row('SELECT id,name,address,city FROM theaters WHERE id='.$theaterId) : null;

        $orderTodayRows = $this->rows("SELECT COALESCE(SUM(o.total_amount),0) total_revenue,
            COALESCE(SUM(CASE WHEN LOWER(o.channel)='pos' THEN o.total_amount ELSE 0 END),0) pos_revenue,
            COALESCE(SUM(CASE WHEN LOWER(o.channel) IN ('website','web','app') THEN o.total_amount ELSE 0 END),0) website_revenue,
            COALESCE(SUM(CASE WHEN LOWER(o.channel)='ota' THEN o.total_amount ELSE 0 END),0) ota_revenue,
            COUNT(DISTINCT o.id) transaction_count
            FROM orders o LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id LEFT JOIN screens sc ON sc.id=st.screen_id
            WHERE o.status='PAID' AND DATE(o.created_at)='{$reportDateEsc}'{$orderScope}");
        $orderToday = !empty($orderTodayRows) ? $orderTodayRows[0] : array('total_revenue'=>0,'pos_revenue'=>0,'website_revenue'=>0,'ota_revenue'=>0,'transaction_count'=>0);
        $ticketCount = (int)$this->scalar("SELECT COUNT(bs.id) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id INNER JOIN showtimes st ON st.id=b.showtime_id INNER JOIN screens sc ON sc.id=st.screen_id WHERE b.status='PAID' AND DATE(st.starts_at)='{$reportDateEsc}'{$screenScope}");
        $capacity = (int)$this->scalar("SELECT COALESCE(SUM(sc.total_seats),0) FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id WHERE DATE(st.starts_at)='{$reportDateEsc}' AND st.status<>'CANCELLED'{$screenScope}");
        $occupancy = $capacity > 0 ? round($ticketCount * 100 / $capacity, 2) : 0;
        $revenue = array('total_revenue'=>(float)$orderToday['total_revenue'],'ticket_sales'=>(float)$orderToday['total_revenue'],'concession_sales'=>0,'total_tickets'=>$ticketCount,'occupancy_rate'=>$occupancy);

        $dailyRows = $this->rows("SELECT DATE(o.created_at) date, COALESCE(SUM(o.total_amount),0) total_revenue
            FROM orders o LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id LEFT JOIN screens sc ON sc.id=st.screen_id
            WHERE o.status='PAID' AND o.created_at>=DATE_SUB('{$reportDateEsc}',INTERVAL 6 DAY) AND o.created_at<DATE_ADD('{$reportDateEsc}',INTERVAL 1 DAY){$orderScope}
            GROUP BY DATE(o.created_at) ORDER BY date");
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
            'theater' => $theater,
            'revenue' => $this->numberFields($revenue, array('total_revenue', 'ticket_sales', 'concession_sales', 'occupancy_rate')),
            'revenue_source' => 'orders',
            'previous_day_revenue' => (float)$this->scalar("SELECT COALESCE(SUM(o.total_amount),0) FROM orders o LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id LEFT JOIN screens sc ON sc.id=st.screen_id WHERE o.status='PAID' AND DATE(o.created_at)=DATE_SUB('{$reportDateEsc}',INTERVAL 1 DAY){$orderScope}"),
            'transaction_count' => (int)$orderToday['transaction_count'],
            'channels' => array(
                array('code' => 'pos', 'name' => 'Quầy vé (POS)', 'amount' => (float)$orderToday['pos_revenue']),
                array('code' => 'website', 'name' => 'Website / Ứng dụng', 'amount' => (float)$orderToday['website_revenue']),
                array('code' => 'ota', 'name' => 'Đối tác OTA', 'amount' => (float)$orderToday['ota_revenue'])
            ),
            'active_theaters' => $theaterId > 0 ? 1 : $this->scalar("SELECT COUNT(*) FROM theaters"),
            'active_users' => $this->scalar("SELECT COUNT(*) FROM users WHERE status = 'active'"),
            'active_screens' => $this->scalar("SELECT COUNT(*) FROM screens sc WHERE sc.status='active'{$screenScope}"),
            'showtimes' => $this->scalar("SELECT COUNT(*) FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id WHERE DATE(st.starts_at)='{$reportDateEsc}' AND st.status<>'CANCELLED'{$screenScope}"),
            'booked_seats' => $ticketCount,
            'staff_on_duty' => $this->scalar("SELECT COUNT(*) FROM staff_shifts ss WHERE ss.work_date='{$reportDateEsc}' AND ss.status IN ('on_duty','checked_in'){$staffScope}"),
            'pending_refunds' => $theaterId > 0 ? $this->scalar("SELECT COUNT(*) FROM refunds r INNER JOIN users requester ON requester.id=r.requested_by WHERE r.status='pending' AND requester.theater_id={$theaterId}") : $this->scalar("SELECT COUNT(*) FROM refunds WHERE status='pending'"),
            'revenue_7_days' => $normalizedDailyRows,
            'top_movies' => $this->rows("SELECT m.id,m.title,COUNT(DISTINCT st.id) showtimes,COUNT(bs.id) booked_seats FROM movies m INNER JOIN showtimes st ON st.movie_id=m.id INNER JOIN screens sc ON sc.id=st.screen_id LEFT JOIN bookings b ON b.showtime_id=st.id AND b.status='PAID' LEFT JOIN booking_seats bs ON bs.booking_id=b.id WHERE DATE(st.starts_at)='{$reportDateEsc}'{$screenScope} GROUP BY m.id,m.title ORDER BY booked_seats DESC,showtimes DESC LIMIT 5"),
            'recent_transactions' => $this->rows("SELECT o.id,o.order_code transaction_code,u.full_name customer_name,o.total_amount amount,LOWER(o.channel) channel,o.status,o.created_at FROM orders o LEFT JOIN users u ON u.id=o.customer_id LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id LEFT JOIN screens sc ON sc.id=st.screen_id WHERE DATE(o.created_at)='{$reportDateEsc}'{$orderScope} ORDER BY o.id DESC LIMIT 5"),
            'screens_status' => $this->rows("SELECT sc.id,sc.screen_code,sc.name,sc.screen_type,sc.projector_status,sc.sound_system_status,sc.hvac_temperature,sc.lamp_hours,sc.status,sc.total_seats FROM screens sc WHERE 1=1{$screenScope} ORDER BY sc.screen_code,sc.id"),
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
        $theaterId = $screenScope !== '' ? $this->getCurrentTheaterId() : 0;
        $scopeSql = $theaterId > 0 ? ' AND theater_id='.$theaterId : '';
        $showtimeScopeSql = $theaterId > 0 ? ' AND s.theater_id='.$theaterId : '';
        $screens = $this->rows("SELECT id,screen_code,name,screen_type,total_seats,projector_status,sound_system_status,hvac_temperature,lamp_hours,status FROM screens WHERE status<>'inactive'{$scopeSql} ORDER BY screen_code,id");
        $showtimes = $this->rows("SELECT st.id,st.screen_id,st.movie_id,DATE(st.starts_at) show_date,TIME(st.starts_at) start_time,TIME(st.ends_at) end_time,
            (SELECT COUNT(bs.id) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id=st.id AND b.status='PAID') booked_seats,
            s.total_seats,CASE WHEN st.status='CANCELLED' THEN 'cancelled' WHEN st.status='CLOSED' OR NOW()>st.ends_at THEN 'finished' WHEN NOW() BETWEEN st.starts_at AND st.ends_at THEN 'running' ELSE 'scheduled' END status,
            st.ticket_price,COALESCE(d.operational_note,'') operational_note,m.title movie_title,m.age_rating,m.format movie_format,
            COALESCE((SELECT GROUP_CONCAT(tt.ticket_type_id ORDER BY tt.ticket_type_id) FROM tms_showtime_ticket_types tt WHERE tt.showtime_id=st.id),'') ticket_type_ids
            FROM showtimes st INNER JOIN screens s ON s.id=st.screen_id LEFT JOIN movies m ON m.id=st.movie_id LEFT JOIN tms_schedule_details d ON d.showtime_id=st.id
            WHERE DATE(st.starts_at)='{$dateEsc}'{$showtimeScopeSql} ORDER BY st.screen_id,st.starts_at");
        foreach ($showtimes as &$showtime) {
            $showtime = $this->numberFields($showtime, array('id', 'screen_id', 'movie_id', 'booked_seats', 'total_seats', 'ticket_price'));
        }
        unset($showtime);
        $theater = $theaterId > 0 ? $this->row('SELECT id,name,address,city FROM theaters WHERE id='.$theaterId) : null;
        $totalBooked = 0; $totalCapacity = 0; $scheduled = 0; $running = 0; $finished = 0; $cancelled = 0;
        foreach ($showtimes as $showtimeSummary) {
            $totalBooked += (int)$showtimeSummary['booked_seats'];
            if ($showtimeSummary['status'] !== 'cancelled') $totalCapacity += (int)$showtimeSummary['total_seats'];
            if ($showtimeSummary['status'] === 'scheduled') $scheduled++;
            else if ($showtimeSummary['status'] === 'running') $running++;
            else if ($showtimeSummary['status'] === 'finished') $finished++;
            else $cancelled++;
        }
        $revenueScope = $theaterId > 0 ? ' AND sc.theater_id='.$theaterId : '';
        $salesRows = $this->rows("SELECT COUNT(DISTINCT o.id) paid_orders,COALESCE(SUM(o.total_amount),0) revenue FROM orders o LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id LEFT JOIN screens sc ON sc.id=st.screen_id WHERE o.status='PAID' AND DATE(o.created_at)='{$dateEsc}'{$revenueScope}");
        $sales = !empty($salesRows) ? $salesRows[0] : array('paid_orders'=>0,'revenue'=>0);
        $summary = array('total_showtimes'=>count($showtimes),'scheduled'=>$scheduled,'running'=>$running,'finished'=>$finished,'cancelled'=>$cancelled,'active_screens'=>count($screens),'booked_seats'=>$totalBooked,'total_capacity'=>$totalCapacity,'occupancy_rate'=>$totalCapacity > 0 ? round($totalBooked*100/$totalCapacity,1) : 0,'paid_orders'=>(int)$sales['paid_orders'],'revenue'=>(float)$sales['revenue']);
        jsonResponse(array('success' => true, 'data' => array('date'=>$date,'theater'=>$theater,'cinema_name'=>$theater ? $theater['name'] : 'Toàn hệ thống Aurora','screens'=>$screens,'showtimes'=>$showtimes,'summary'=>$summary)));
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
            recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
            sent_by VARCHAR(120) NOT NULL,
            sent_at DATETIME NOT NULL,
            UNIQUE KEY uq_allocation_briefing (allocation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS movie_allocation_screen_preparations (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            allocation_id BIGINT UNSIGNED NOT NULL,
            screen_id BIGINT UNSIGNED NOT NULL,
            preparation_status VARCHAR(20) NOT NULL DEFAULT 'ready',
            content_playback_checked TINYINT(1) NOT NULL DEFAULT 0,
            projector_checked TINYINT(1) NOT NULL DEFAULT 0,
            sound_checked TINYINT(1) NOT NULL DEFAULT 0,
            auditorium_checked TINYINT(1) NOT NULL DEFAULT 0,
            safety_checked TINYINT(1) NOT NULL DEFAULT 0,
            note VARCHAR(500) NOT NULL,
            prepared_by VARCHAR(120) NOT NULL,
            prepared_at DATETIME NOT NULL,
            UNIQUE KEY uq_allocation_prepared_screen (allocation_id, screen_id),
            KEY idx_preparation_allocation (allocation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $preparationColumns = array(
            'content_playback_checked' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'projector_checked' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'sound_checked' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'auditorium_checked' => 'TINYINT(1) NOT NULL DEFAULT 0',
            'safety_checked' => 'TINYINT(1) NOT NULL DEFAULT 0'
        );
        foreach ($preparationColumns as $column => $definition) {
            $columnResult = $this->db->query("SHOW COLUMNS FROM movie_allocation_screen_preparations LIKE '{$column}'");
            if ($columnResult && $columnResult->num_rows === 0) {
                $this->db->query("ALTER TABLE movie_allocation_screen_preparations ADD COLUMN {$column} {$definition}");
            }
        }
        $recipientColumn = $this->db->query("SHOW COLUMNS FROM movie_allocation_briefings LIKE 'recipient_count'");
        if ($recipientColumn && $recipientColumn->num_rows === 0) {
            $this->db->query("ALTER TABLE movie_allocation_briefings ADD COLUMN recipient_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER message");
        }
    }

    private function movieAllocationReadinessSnapshot($allocation, $movie)
    {
        $allocationId = (int)$allocation['id'];
        $movieId = (int)$allocation['movie_id'];
        $theaterId = isset($allocation['theater_id']) ? (int)$allocation['theater_id'] : 0;
        $minimum = max(1, (int)$allocation['min_screenings_per_day']);
        $start = !empty($allocation['allocated_start_date']) ? $allocation['allocated_start_date'] : date('Y-m-d');
        $end = !empty($allocation['allocated_end_date']) ? $allocation['allocated_end_date'] : $start;
        $dayCount = max(1, (int)floor((strtotime($end) - strtotime($start)) / 86400) + 1);
        $startEsc = $this->db->real_escape_string($start);
        $endEsc = $this->db->real_escape_string($end);
        $scheduledDays = (int)$this->scalar("SELECT COUNT(*) FROM (
            SELECT DATE(st.starts_at) AS show_day
            FROM showtimes st
            INNER JOIN screens sc ON sc.id=st.screen_id
            WHERE st.movie_id={$movieId}
              AND sc.theater_id={$theaterId}
              AND DATE(st.starts_at) BETWEEN '{$startEsc}' AND '{$endEsc}'
              AND st.status <> 'CANCELLED'
            GROUP BY DATE(st.starts_at)
            HAVING COUNT(*) >= {$minimum}
        ) compliant_days");
        $scheduled = $theaterId > 0 && $scheduledDays >= $dayCount;
        $preparedScreenCount = (int)$this->scalar("SELECT COUNT(*) FROM movie_allocation_screen_preparations p INNER JOIN screens s ON s.id=p.screen_id WHERE p.allocation_id={$allocationId} AND p.preparation_status='ready' AND p.content_playback_checked=1 AND p.projector_checked=1 AND p.sound_checked=1 AND p.auditorium_checked=1 AND p.safety_checked=1 AND s.status='active' AND s.projector_status='online' AND s.sound_system_status='online' AND s.total_seats>0");
        $prepared = $preparedScreenCount > 0;
        $briefingRows = $this->rows("SELECT message, recipient_count, sent_by, sent_at FROM movie_allocation_briefings WHERE allocation_id={$allocationId} LIMIT 1");
        $briefing = !empty($briefingRows) ? $briefingRows[0] : null;
        $briefed = $briefing !== null && (int)$briefing['recipient_count'] > 0;
        $assetFields = array(
            'poster' => !empty($movie['poster_url']),
            'trailer' => !empty($movie['trailer_url']),
            'duration' => !empty($movie['duration_minutes']) && (int)$movie['duration_minutes'] > 0,
            'age_rating' => !empty($movie['age_rating']),
            'format' => !empty($movie['format']) || !empty($allocation['preferred_screen_types'])
        );
        $assetReadyCount = count(array_filter($assetFields));
        $assetsReady = $assetReadyCount === count($assetFields);
        $checks = array(
            'review_assets' => $assetsReady,
            'prepare_screens' => $prepared,
            'create_showtimes' => $scheduled,
            'brief_team' => $briefed,
            'opening_check' => $assetsReady && $prepared && $scheduled && $briefed
        );
        return array(
            'checks' => $checks,
            'assets_ready_count' => $assetReadyCount,
            'assets_required_count' => count($assetFields),
            'asset_fields' => $assetFields,
            'prepared_screen_count' => $preparedScreenCount,
            'scheduled_days' => $scheduledDays,
            'required_days' => $dayCount,
            'minimum_screenings_per_day' => $minimum,
            'briefing' => $briefing
        );
    }

    private function syncMovieAllocationTasks($allocation, $movie)
    {
        $this->ensureMovieAllocationTasksSchema();
        $allocationId = (int)$allocation['id'];
        $snapshot = $this->movieAllocationReadinessSnapshot($allocation, $movie);
        $names = array(
            'review_assets' => 'Hoàn thiện hồ sơ phát hành',
            'prepare_screens' => 'Kiểm tra kỹ thuật phòng chiếu',
            'create_showtimes' => 'Xếp đủ suất chiếu được giao',
            'brief_team' => 'Gửi phân công cho đội vận hành',
            'opening_check' => 'Đủ điều kiện mở bán & vận hành'
        );
        $descriptions = array(
            'review_assets' => 'Poster, trailer, thời lượng, phân loại độ tuổi và định dạng phim phải đầy đủ.',
            'prepare_screens' => 'Ít nhất một phòng phải đạt kiểm tra nội dung, máy chiếu, âm thanh, khán phòng và an toàn.',
            'create_showtimes' => 'Mỗi ngày trong thời gian phân bổ phải đạt số suất tối thiểu được giao.',
            'brief_team' => 'Lưu thông báo phân công cho nhân sự có ca trong thời gian triển khai.',
            'opening_check' => 'Tự động hoàn tất khi bốn điều kiện vận hành phía trên đều đạt.'
        );
        foreach ($snapshot['checks'] as $key => $completed) {
            $nameEsc = $this->db->real_escape_string($names[$key]);
            $descriptionEsc = $this->db->real_escape_string($descriptions[$key]);
            $keyEsc = $this->db->real_escape_string($key);
            $status = $completed ? 'completed' : 'pending';
            $actor = $completed ? 'Hệ thống Aurora DB' : '';
            $actorEsc = $this->db->real_escape_string($actor);
            $this->db->query("INSERT INTO movie_allocation_tasks (allocation_id, task_key, task_name, task_description, status, updated_by, updated_at) VALUES ({$allocationId}, '{$keyEsc}', '{$nameEsc}', '{$descriptionEsc}', '{$status}', '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE task_name='{$nameEsc}', task_description='{$descriptionEsc}', updated_at=IF(status <> '{$status}', NOW(), updated_at), status='{$status}', updated_by='{$actorEsc}'");
        }
        return $snapshot;
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
        $this->enforceMovieAllocationAccess($allocationId);
        $this->ensureMovieAllocationTasksSchema();
        // m.* keeps this endpoint compatible with older Aurora DB installations
        // where the movie catalogue has fewer optional metadata columns.
        $rows = $this->rows("SELECT m.*, m.status movie_status, mp.plan_code, mp.plan_name, mp.plan_month, mp.plan_year, mp.format plan_format, mp.expected_start_date plan_start_date, mp.expected_end_date plan_end_date, mp.target_revenue, mp.target_screenings_per_day, mp.priority_level, mp.note plan_note, mp.created_by plan_created_by, mp.created_at plan_created_at, ma.* FROM movie_allocations ma LEFT JOIN movie_plans mp ON mp.id = ma.plan_id LEFT JOIN movies m ON m.id = ma.movie_id WHERE ma.id = " . $allocationId . " LIMIT 1");
        if (empty($rows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $snapshot = $this->syncMovieAllocationTasks($rows[0], $rows[0]);
        $taskRows = $this->rows("SELECT task_key, task_name, task_description, status, updated_by, updated_at FROM movie_allocation_tasks WHERE allocation_id = " . $allocationId . " ORDER BY id ASC");
        $savedTasks = array();
        foreach ($taskRows as $task) $savedTasks[$task['task_key']] = $task;
        $briefing = $snapshot['briefing'];
        $taskBlueprints = array(
            array('task_key' => 'review_assets', 'task_name' => 'Hoàn thiện hồ sơ phát hành', 'task_description' => 'Cần đủ poster, trailer, thời lượng, phân loại độ tuổi và định dạng phim.', 'evidence' => 'Đã có '.$snapshot['assets_ready_count'].'/'.$snapshot['assets_required_count'].' dữ liệu bắt buộc.', 'action_view' => 'Xem kế hoạch phim', 'action_label' => 'Bổ sung hồ sơ'),
            array('task_key' => 'prepare_screens', 'task_name' => 'Kiểm tra kỹ thuật phòng chiếu', 'task_description' => 'Xác nhận nội dung phát đúng phiên bản, hình ảnh, âm thanh, khán phòng và lối thoát hiểm.', 'evidence' => $snapshot['prepared_screen_count'].' phòng đã đạt đầy đủ kiểm tra và có thiết bị online.', 'action_view' => 'screens', 'action_label' => 'Kiểm tra phòng'),
            array('task_key' => 'create_showtimes', 'task_name' => 'Xếp đủ suất chiếu được giao', 'task_description' => 'Mỗi ngày trong thời gian phân bổ cần tối thiểu '.$snapshot['minimum_screenings_per_day'].' suất không bị hủy.', 'evidence' => $snapshot['scheduled_days'].'/'.$snapshot['required_days'].' ngày đã đạt chỉ tiêu.', 'action_view' => 'schedules', 'action_label' => 'Xếp lịch chiếu'),
            array('task_key' => 'brief_team', 'task_name' => 'Gửi phân công cho đội vận hành', 'task_description' => 'Thông báo phim, thời gian triển khai và yêu cầu vận hành cho nhân sự có ca.', 'evidence' => $briefing ? 'Đã gửi cho '.(int)$briefing['recipient_count'].' nhân sự bởi '.$briefing['sent_by'].' lúc '.$briefing['sent_at'].'.' : 'Chưa có thông báo phân công được lưu.', 'action_view' => '', 'action_label' => $briefing ? 'Gửi lại phân công' : 'Gửi phân công'),
            array('task_key' => 'opening_check', 'task_name' => 'Đủ điều kiện mở bán & vận hành', 'task_description' => 'Hệ thống tự xác nhận khi hồ sơ, phòng chiếu, lịch chiếu và phân công đều đạt.', 'evidence' => $snapshot['checks']['opening_check'] ? 'Toàn bộ điều kiện đã được đối chiếu từ Aurora DB.' : 'Còn điều kiện chưa hoàn thành ở các bước phía trên.', 'action_view' => '', 'action_label' => '')
        );
        $tasks = array();
        foreach ($taskBlueprints as $blueprint) {
            $key = $blueprint['task_key'];
            $saved = isset($savedTasks[$key]) ? $savedTasks[$key] : array('status' => 'pending', 'updated_by' => '', 'updated_at' => '');
            $tasks[] = array_merge($saved, $blueprint, array('status' => isset($saved['status']) ? $saved['status'] : 'pending'));
        }
        jsonResponse(array('success' => true, 'data' => array('plan' => $rows[0], 'tasks' => $tasks, 'readiness' => $snapshot)));
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
        $this->ensurePlanningSchema(); $this->ensureCinemaOwnershipSchema(); $this->ensureMovieAllocationTasksSchema();
        $this->enforceMovieAllocationAccess($allocationId);
        $rows = $this->rows("SELECT ma.*, m.poster_url, m.trailer_url, m.duration_minutes, m.age_rating, m.format movie_format FROM movie_allocations ma LEFT JOIN movies m ON m.id=ma.movie_id WHERE ma.id={$allocationId} LIMIT 1");
        if (empty($rows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $allocation = $rows[0];
        $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
        $theaterId = (int)$allocation['theater_id'];
        $startEsc = $this->db->real_escape_string($allocation['allocated_start_date']);
        $endEsc = $this->db->real_escape_string($allocation['allocated_end_date']);
        $recipientCount = (int)$this->scalar("SELECT COUNT(DISTINCT staff_name) FROM staff_shifts WHERE theater_id={$theaterId} AND work_date BETWEEN '{$startEsc}' AND '{$endEsc}' AND status <> 'absent'");
        if ($recipientCount <= 0) jsonResponse(array('success' => false, 'message' => 'Chưa có nhân sự được xếp ca trong thời gian triển khai. Hãy lập ca làm việc trước khi gửi phân công.'), 400);
        $message = 'Phân công triển khai phim '.$allocation['movie_title'].' từ '.$allocation['allocated_start_date'].' đến '.$allocation['allocated_end_date'].'. Kiểm tra phân loại độ tuổi, đúng phòng và giờ chiếu, vệ sinh khán phòng và sẵn sàng đón khách.';
        $messageEsc = $this->db->real_escape_string($message); $actorEsc = $this->db->real_escape_string($actor);
        if (!$this->db->query("INSERT INTO movie_allocation_briefings (allocation_id, message, recipient_count, sent_by, sent_at) VALUES ({$allocationId}, '{$messageEsc}', {$recipientCount}, '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE message='{$messageEsc}', recipient_count={$recipientCount}, sent_by='{$actorEsc}', sent_at=NOW()")) jsonResponse(array('success' => false, 'message' => 'Không thể lưu phân công vận hành: '.$this->db->error), 500);
        $this->syncMovieAllocationTasks($allocation, $allocation);
        jsonResponse(array('success' => true, 'message' => 'Đã lưu phân công cho '.$recipientCount.' nhân sự có ca trong Aurora DB.', 'data' => array('recipient_count' => $recipientCount, 'message' => $message)));
    }

    public function moviePlanScreenPreparation()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin', 'supervisor'), true)) jsonResponse(array('success' => false, 'message' => 'Bạn không có quyền xác nhận kiểm tra kỹ thuật phòng chiếu.'), 403);
        $this->ensurePlanningSchema(); $this->ensureMovieAllocationTasksSchema();
        $allocationId = isset($_GET['allocation_id']) ? (int)$_GET['allocation_id'] : 0;
        $input = requestJson();
        if (!$allocationId && isset($input['allocation_id'])) $allocationId = (int)$input['allocation_id'];
        if ($allocationId <= 0) jsonResponse(array('success' => false, 'message' => 'Thiếu mã phân bổ phim.'), 400);
        $this->enforceMovieAllocationAccess($allocationId);
        $rows = $this->rows("SELECT ma.*, m.format movie_format, m.title, m.poster_url, m.trailer_url, m.duration_minutes, m.age_rating FROM movie_allocations ma LEFT JOIN movies m ON m.id=ma.movie_id WHERE ma.id={$allocationId} LIMIT 1");
        if (empty($rows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $allocation = $rows[0];
        $allocationTheaterId = (int)$allocation['theater_id'];
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $screenId = isset($input['screen_id']) ? (int)$input['screen_id'] : 0;
            $note = isset($input['note']) ? trim((string)$input['note']) : '';
            $checkFields = array('content_playback_checked', 'projector_checked', 'sound_checked', 'auditorium_checked', 'safety_checked');
            $checks = array();
            foreach ($checkFields as $field) $checks[$field] = !empty($input[$field]) ? 1 : 0;
            if (array_sum($checks) !== count($checkFields)) jsonResponse(array('success' => false, 'message' => 'Cần xác nhận đủ 5 nội dung kiểm tra trước khi lưu biên bản.'), 400);
            $screen = $this->rows("SELECT id, name, status, projector_status, sound_system_status, total_seats FROM screens WHERE id={$screenId} AND theater_id={$allocationTheaterId} LIMIT 1");
            if (!$screen) jsonResponse(array('success' => false, 'message' => 'Phòng chiếu không thuộc rạp được phân bổ.'), 404);
            $screenRow = $screen[0];
            $blockingReasons = array();
            if ($screenRow['status'] !== 'active') $blockingReasons[] = 'phòng chưa ở trạng thái hoạt động';
            if ($screenRow['projector_status'] !== 'online') $blockingReasons[] = 'máy chiếu chưa online';
            if ($screenRow['sound_system_status'] !== 'online') $blockingReasons[] = 'hệ thống âm thanh chưa online';
            if ((int)$screenRow['total_seats'] <= 0) $blockingReasons[] = 'phòng chưa có sơ đồ ghế';
            if ($blockingReasons) jsonResponse(array('success' => false, 'message' => 'Chưa thể xác nhận: '.implode(', ', $blockingReasons).'.'), 400);
            $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
            $noteEsc = $this->db->real_escape_string($note); $actorEsc = $this->db->real_escape_string($actor);
            if (!$this->db->query("INSERT INTO movie_allocation_screen_preparations (allocation_id, screen_id, preparation_status, content_playback_checked, projector_checked, sound_checked, auditorium_checked, safety_checked, note, prepared_by, prepared_at) VALUES ({$allocationId}, {$screenId}, 'ready', 1, 1, 1, 1, 1, '{$noteEsc}', '{$actorEsc}', NOW()) ON DUPLICATE KEY UPDATE preparation_status='ready', content_playback_checked=1, projector_checked=1, sound_checked=1, auditorium_checked=1, safety_checked=1, note='{$noteEsc}', prepared_by='{$actorEsc}', prepared_at=NOW()")) jsonResponse(array('success' => false, 'message' => 'Không thể lưu biên bản kiểm tra phòng: '.$this->db->error), 500);
            $this->syncMovieAllocationTasks($allocation, $allocation);
            jsonResponse(array('success' => true, 'message' => 'Phòng '.$screenRow['name'].' đã đạt đủ 5 nội dung kiểm tra; biên bản đã lưu vào Aurora DB.'));
        }
        $screens = $this->rows("SELECT s.id, s.screen_code, s.name, s.screen_type, s.total_seats, s.projector_status, s.sound_system_status, s.hvac_temperature, s.status, p.preparation_status, COALESCE(p.content_playback_checked,0) content_playback_checked, COALESCE(p.projector_checked,0) projector_checked, COALESCE(p.sound_checked,0) sound_checked, COALESCE(p.auditorium_checked,0) auditorium_checked, COALESCE(p.safety_checked,0) safety_checked, p.note, p.prepared_by, p.prepared_at, IF(s.status='active' AND s.projector_status='online' AND s.sound_system_status='online' AND s.total_seats>0,1,0) system_ready FROM screens s LEFT JOIN movie_allocation_screen_preparations p ON p.screen_id=s.id AND p.allocation_id={$allocationId} WHERE s.theater_id={$allocationTheaterId} ORDER BY s.screen_code, s.id");
        $readyCount = 0;
        foreach ($screens as &$screenItem) {
            $screenItem['checks_completed'] = (int)$screenItem['content_playback_checked'] + (int)$screenItem['projector_checked'] + (int)$screenItem['sound_checked'] + (int)$screenItem['auditorium_checked'] + (int)$screenItem['safety_checked'];
            $screenItem['is_ready'] = $screenItem['preparation_status'] === 'ready' && $screenItem['checks_completed'] === 5 && (int)$screenItem['system_ready'] === 1;
            if ($screenItem['is_ready']) $readyCount++;
        }
        unset($screenItem);
        jsonResponse(array('success' => true, 'data' => array('allocation' => $allocation, 'screens' => $screens, 'summary' => array('ready_screens' => $readyCount, 'total_screens' => count($screens), 'required_checks' => 5))));
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
        $this->enforceMovieAllocationAccess($allocationId);
        if (!$this->scalar("SELECT COUNT(*) FROM movie_allocations WHERE id = " . $allocationId)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phân bổ phim.'), 404);
        $taskNames = array('review_assets' => 'Hoàn thiện hồ sơ phát hành', 'prepare_screens' => 'Kiểm tra kỹ thuật phòng chiếu', 'create_showtimes' => 'Xếp đủ suất chiếu được giao', 'brief_team' => 'Gửi phân công cho đội vận hành', 'opening_check' => 'Đủ điều kiện mở bán & vận hành');
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
        if (in_array($resource, array('screens', 'schedules', 'theaters', 'movie-plans', 'movie-allocations'), true)) {
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
        $role = $this->getCurrentRole();
        // Data scope is enforced on the API, so manipulating the browser
        // request cannot expose rooms or showtimes belonging to another rạp.
        if ($resource === 'screens') {
            $scope = $this->enforceCinemaScope();
            if ($scope !== '') $where[] = $scope;
        }
        if ($resource === 'schedules') {
            $scope = $this->enforceCinemaScope('sc');
            if ($scope !== '') $where[] = $scope;
            if ($role === 'super_admin' && isset($_GET['theater_id']) && (int)$_GET['theater_id'] > 0) {
                $requestedTheaterId = (int)$_GET['theater_id'];
                if (!(int)$this->scalar("SELECT COUNT(*) FROM theaters WHERE id={$requestedTheaterId}")) {
                    jsonResponse(array('success' => false, 'message' => 'Cụm rạp được chọn không tồn tại trong aurora_db.'), 422);
                }
                $where[] = 'sc.theater_id = ' . $requestedTheaterId;
            }
        }
        if ($resource === 'theaters') {
            $scope = $this->enforceCinemaScope();
            if ($scope !== '') $where[] = 'id = ' . $this->getCurrentTheaterId();
        }
        if ($resource === 'movie-allocations') {
            $scope = $this->enforceCinemaScope();
            if ($scope !== '') $where[] = $scope;
        }

        if (!empty($_GET['q'])) {
            $qEsc = $this->db->real_escape_string(trim((string)$_GET['q']));
            if ($resource === 'schedules') {
                $where[] = "(m.title LIKE '%{$qEsc}%' OR sc.name LIKE '%{$qEsc}%' OR th.name LIKE '%{$qEsc}%')";
            } else if (!empty($cfg['search'])) {
                $parts = array();
                foreach ($cfg['search'] as $field) {
                    $parts[] = "`{$field}` LIKE '%{$qEsc}%'";
                }
                $where[] = '(' . implode(' OR ', $parts) . ')';
            }
        }
        if (!empty($_GET['status'])) {
            if ($resource === 'schedules') {
                $requestedStatus = strtolower(trim((string)$_GET['status']));
                if ($requestedStatus === 'cancelled') $where[] = "s.status='CANCELLED'";
                else if ($requestedStatus === 'finished') $where[] = "(s.status='CLOSED' OR (s.status<>'CANCELLED' AND s.ends_at<NOW()))";
                else if ($requestedStatus === 'running') $where[] = "s.status='OPEN' AND NOW() BETWEEN s.starts_at AND s.ends_at";
                else if ($requestedStatus === 'scheduled') $where[] = "s.status='OPEN' AND s.starts_at>NOW()";
            } else $where[] = "`status` = '" . $this->db->real_escape_string($_GET['status']) . "'";
        }
        if ($resource === 'schedules' && !empty($_GET['date'])) {
            $requestedDate = trim((string)$_GET['date']);
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
                $where[] = "DATE(s.starts_at) = '" . $this->db->real_escape_string($requestedDate) . "'";
            }
        }
        if ($resource === 'schedules') {
            $requestedView = isset($_GET['view']) ? strtolower(trim((string)$_GET['view'])) : 'active';
            if ($requestedView === 'upcoming') $where[] = "s.status='OPEN' AND s.starts_at>NOW()";
            else if ($requestedView === 'history') $where[] = "(s.status='CLOSED' OR s.ends_at<NOW())";
            else if ($requestedView === 'active') $where[] = "s.status='OPEN' AND s.ends_at>=NOW()";
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
            $planTheaterId = 0;
            if (in_array($role, array('cinema_admin', 'supervisor'), true)) {
                $planTheaterId = $this->getCurrentTheaterId();
                if ($planTheaterId <= 0) jsonResponse(array('success' => false, 'message' => 'Tài khoản chưa được gán rạp phụ trách.'), 403);
                $where[] = "EXISTS (SELECT 1 FROM movie_allocations scoped_ma WHERE scoped_ma.plan_id=movie_plans.id AND scoped_ma.theater_id={$planTheaterId})";
            }
            $sql = "SELECT * FROM movie_plans WHERE " . implode(' AND ', $where) . " ORDER BY plan_month ASC, expected_start_date ASC, id DESC";
            $plans = $this->rows($sql);
            $totalTheaters = $this->scalar("SELECT COUNT(*) FROM theaters");
            if (!$totalTheaters) $totalTheaters = 5;
            foreach ($plans as &$p) {
                $pId = (int)$p['id'];
                $mId = (int)$p['movie_id'];
                $allocationScope = $planTheaterId > 0 ? " AND theater_id={$planTheaterId}" : '';
                $allocations = $this->rows("SELECT * FROM movie_allocations WHERE (plan_id = {$pId} OR (plan_id = 0 AND movie_id = {$mId})){$allocationScope} ORDER BY theater_id ASC");
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
            $select = "s.id, s.screen_id, s.movie_id, sc.theater_id, th.name theater_name, th.city theater_city, DATE(s.starts_at) show_date, TIME(s.starts_at) start_time, TIME(s.ends_at) end_time, (SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id=s.id AND b.status NOT IN ('CANCELLED','EXPIRED')) booked_seats, sc.total_seats, CASE WHEN s.status='CANCELLED' THEN 'cancelled' WHEN s.status='CLOSED' OR NOW() > s.ends_at THEN 'finished' WHEN NOW() BETWEEN s.starts_at AND s.ends_at THEN 'running' ELSE 'scheduled' END status, m.title movie_title, sc.name screen_name, s.ticket_price, COALESCE(d.operational_note, '') operational_note, COALESCE((SELECT GROUP_CONCAT(stt.ticket_type_id ORDER BY stt.ticket_type_id) FROM tms_showtime_ticket_types stt WHERE stt.showtime_id=s.id), '') ticket_type_ids, CASE WHEN s.starts_at > NOW() AND NOT EXISTS (SELECT 1 FROM bookings booking_history WHERE booking_history.showtime_id=s.id) THEN 1 ELSE 0 END can_delete, CASE WHEN s.starts_at <= NOW() THEN 'started' WHEN EXISTS (SELECT 1 FROM bookings booking_history WHERE booking_history.showtime_id=s.id) THEN 'has_booking_history' ELSE '' END delete_block_reason";

            $fromSql = ' FROM showtimes s JOIN movies m ON m.id=s.movie_id JOIN screens sc ON sc.id=s.screen_id JOIN theaters th ON th.id=sc.theater_id LEFT JOIN tms_schedule_details d ON d.showtime_id=s.id';
            $whereSql = implode(' AND ', $where);
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
            if ($perPage < 10) $perPage = 10;
            if ($perPage > 50) $perPage = 50;
            $total = (int)$this->scalar("SELECT COUNT(*){$fromSql} WHERE {$whereSql}");
            $totalPages = max(1, (int)ceil($total / $perPage));
            if ($page > $totalPages) $page = $totalPages;
            $offset = ($page - 1) * $perPage;
            $orderSql = $requestedView === 'history'
                ? ' ORDER BY s.starts_at DESC'
                : ' ORDER BY CASE WHEN NOW() BETWEEN s.starts_at AND s.ends_at THEN 0 ELSE 1 END, s.starts_at ASC';
            $rows = $this->rows("SELECT {$select}{$fromSql} WHERE {$whereSql}{$orderSql} LIMIT {$offset},{$perPage}");

            $summaryWhere = array('1=1');
            $summaryScope = $this->enforceCinemaScope('sc');
            if ($summaryScope !== '') $summaryWhere[] = $summaryScope;
            if ($role === 'super_admin' && isset($requestedTheaterId) && $requestedTheaterId > 0) $summaryWhere[] = 'sc.theater_id=' . $requestedTheaterId;
            $summarySql = "SELECT
                SUM(CASE WHEN s.status='OPEN' AND s.starts_at>NOW() THEN 1 ELSE 0 END) scheduled,
                SUM(CASE WHEN s.status='OPEN' AND NOW() BETWEEN s.starts_at AND s.ends_at THEN 1 ELSE 0 END) running,
                SUM(CASE WHEN s.status='CLOSED' OR (s.status<>'CANCELLED' AND s.ends_at<NOW()) THEN 1 ELSE 0 END) finished,
                COUNT(DISTINCT CASE WHEN s.status='OPEN' AND s.ends_at>=NOW() THEN s.screen_id ELSE NULL END) active_rooms,
                COUNT(DISTINCT sc.theater_id) theaters
                FROM showtimes s JOIN screens sc ON sc.id=s.screen_id
                WHERE ".implode(' AND ', $summaryWhere);
            $summaryResult = $this->db->query($summarySql);
            $summary = $summaryResult ? $summaryResult->fetch_assoc() : array();
            $bookedWhere = array("b.status NOT IN ('CANCELLED','EXPIRED')");
            if ($summaryScope !== '') $bookedWhere[] = $summaryScope;
            $summary['booked_seats'] = (int)$this->scalar("SELECT COUNT(bs.id) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id INNER JOIN showtimes s ON s.id=b.showtime_id INNER JOIN screens sc ON sc.id=s.screen_id WHERE ".implode(' AND ', $bookedWhere));
            jsonResponse(array(
                'success' => true,
                'data' => $rows,
                'meta' => array(
                    'page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'view' => $requestedView,
                    'theater_id' => isset($requestedTheaterId) ? $requestedTheaterId : ($role === 'super_admin' ? 0 : $this->getCurrentTheaterId()),
                    'summary' => $summary
                )
            ));
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
            if ($role !== 'cinema_admin') {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Rạp được xác nhận tiếp nhận kế hoạch của rạp mình.'), 403);
            }
            if ($id <= 0) jsonResponse(array('success' => false, 'message' => 'Thiếu mã phân bổ cần xác nhận.'), 400);
            $this->enforceMovieAllocationAccess($id);
            $allocationRows = $this->rows("SELECT status FROM movie_allocations WHERE id={$id} LIMIT 1");
            $allocationStatus = !empty($allocationRows[0]['status']) ? strtolower(trim((string)$allocationRows[0]['status'])) : '';
            if ($allocationStatus !== 'pending') {
                jsonResponse(array('success' => false, 'message' => 'Phân bổ này không còn ở trạng thái chờ xác nhận.'), 409);
            }
            $approver = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
            $input['confirmed_by'] = $approver;
            $input['confirmed_at'] = date('Y-m-d H:i:s');
        }
        if ($resource === 'movie-allocations' && (!isset($input['status']) || $input['status'] !== 'confirmed')) {
            if ($role !== 'super_admin') {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền phân bổ kế hoạch cho rạp.'), 403);
            }
            $planId = isset($input['plan_id']) ? (int)$input['plan_id'] : 0;
            $planRows = $planId > 0 ? $this->rows("SELECT movie_id, movie_title, format, expected_start_date, expected_end_date, status FROM movie_plans WHERE id = " . $planId) : array();
            if (empty($planRows) || $planRows[0]['status'] !== 'published') {
                jsonResponse(array('success' => false, 'message' => 'Chỉ kế hoạch đã ban hành mới được phân bổ cho Admin Rạp.'), 422);
            }
            $theaterId = isset($input['theater_id']) ? (int)$input['theater_id'] : 0;
            $theaterRows = $theaterId > 0 ? $this->rows("SELECT id, name FROM theaters WHERE id = " . $theaterId) : array();
            if (empty($theaterRows)) {
                jsonResponse(array('success' => false, 'message' => 'Cụm rạp được chọn không tồn tại trong aurora_db.'), 422);
            }
            if ($id === 0 && (int)$this->scalar("SELECT COUNT(*) FROM movie_allocations WHERE plan_id = {$planId} AND theater_id = {$theaterId}")) {
                jsonResponse(array('success' => false, 'message' => 'Kế hoạch này đã được phân bổ cho cụm rạp đã chọn.'), 409);
            }
            // Tên rạp và thông tin phim luôn lấy từ Aurora DB; không tin dữ
            // liệu mô tả do trình duyệt gửi lên.
            $input['movie_id'] = (int)$planRows[0]['movie_id'];
            $input['movie_title'] = $planRows[0]['movie_title'];
            $input['theater_id'] = $theaterId;
            $input['theater_name'] = $theaterRows[0]['name'];
            $input['preferred_screen_types'] = $planRows[0]['format'];
            $input['allocated_start_date'] = $planRows[0]['expected_start_date'];
            $input['allocated_end_date'] = $planRows[0]['expected_end_date'];
            $input['status'] = 'pending';
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
            if (!$this->db->query("UPDATE {$cfg['table']} SET " . implode(',', $sets) . " WHERE id = " . $id)) {
                jsonResponse(array('success' => false, 'message' => 'Không thể cập nhật dữ liệu trong aurora_db: ' . $this->db->error), 500);
            }
            $message = 'Cập nhật thành công.';
        } else {
            $fields = array_keys($values);
            $valEscaped = array();
            foreach ($values as $value) {
                $valEscaped[] = "'" . $this->db->real_escape_string($value) . "'";
            }
            if (!$this->db->query("INSERT INTO {$cfg['table']} (`" . implode('`,`', $fields) . "`) VALUES (" . implode(',', $valEscaped) . ")")) {
                jsonResponse(array('success' => false, 'message' => 'Không thể ghi dữ liệu vào aurora_db: ' . $this->db->error), 500);
            }
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
                        if (empty($tRow[0]['name'])) continue;
                        $tName = $tRow[0]['name'];
                        $exists = $this->rows("SELECT id FROM movie_allocations WHERE plan_id = {$id} AND theater_id = {$tId}");
                        if (empty($exists)) {
                            $minScreen = !empty($input['min_screenings_per_day']) ? (int)$input['min_screenings_per_day'] : (int)$plan['target_screenings_per_day'];
                            $mTitleEsc = $this->db->real_escape_string($plan['movie_title']);
                            $tNameEsc = $this->db->real_escape_string($tName);
                            $formatEsc = $this->db->real_escape_string($plan['format']);
                            if (!$this->db->query("INSERT INTO movie_allocations (`plan_id`, `movie_id`, `movie_title`, `theater_id`, `theater_name`, `min_screenings_per_day`, `preferred_screen_types`, `allocated_start_date`, `allocated_end_date`, `status`) VALUES ({$id}, {$plan['movie_id']}, '{$mTitleEsc}', {$tId}, '{$tNameEsc}', {$minScreen}, '{$formatEsc}', '{$plan['expected_start_date']}', '{$plan['expected_end_date']}', 'pending')")) {
                                jsonResponse(array('success' => false, 'message' => 'Không thể ghi phân bổ kế hoạch vào aurora_db: ' . $this->db->error), 500);
                            }
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
            confirmed_by VARCHAR(120) NOT NULL, confirmed_at DATETIME NOT NULL,
            UNIQUE KEY uq_movie_allocation_plan_theater (plan_id, theater_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        // Đồng bộ tên hiển thị từ bảng chủ và bổ sung ràng buộc cho database
        // cũ. BINARY tránh lỗi trộn collation giữa các bản schema lịch sử.
        $this->db->query("UPDATE movie_allocations ma INNER JOIN theaters t ON t.id=ma.theater_id SET ma.theater_name=t.name WHERE BINARY ma.theater_name<>BINARY t.name");
        $allocationUniqueIndex = $this->db->query("SHOW INDEX FROM movie_allocations WHERE Key_name='uq_movie_allocation_plan_theater'");
        if ($allocationUniqueIndex && $allocationUniqueIndex->num_rows === 0) {
            $this->db->query("ALTER TABLE movie_allocations ADD UNIQUE KEY uq_movie_allocation_plan_theater (plan_id, theater_id)");
        }
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
        $sql = "SELECT *, LOWER(status) normalized_status FROM movies WHERE " . implode(' AND ', $where) . ' ORDER BY id DESC';
        $movies = $this->rows($sql);
        foreach ($movies as &$movie) {
            $movie['status'] = isset($movie['normalized_status']) ? $movie['normalized_status'] : strtolower((string)$movie['status']);
            unset($movie['normalized_status']);
        }
        unset($movie);
        jsonResponse(array('success' => true, 'data' => $movies));
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
        $showDateParts = explode('-', $showDate);
        if (count($showDateParts) !== 3 || !checkdate((int)$showDateParts[1], (int)$showDateParts[2], (int)$showDateParts[0])) jsonResponse(array('success'=>false,'message'=>'Ngày chiếu không hợp lệ. Vui lòng chọn theo thứ tự ngày / tháng / năm.'),422);
        if (!$wasUpdate && $status !== 'scheduled') jsonResponse(array('success' => false, 'message' => 'Suất chiếu mới chỉ được tạo ở trạng thái Mở bán theo lịch (OPEN).'), 422);
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
        foreach ($slots as $statusSlot) {
            $statusStartEsc = $this->db->real_escape_string($showDate.' '.$statusSlot['start'].':00');
            $statusEndEsc = $this->db->real_escape_string($showDate.' '.$statusSlot['end'].':00');
            if ($status === 'scheduled' && !(int)$this->scalar("SELECT '{$statusStartEsc}' > NOW()")) jsonResponse(array('success'=>false,'message'=>'Chỉ suất chưa bắt đầu mới có thể ở trạng thái Sắp chiếu · Mở bán.'),422);
            if ($status === 'running' && !(int)$this->scalar("SELECT NOW() BETWEEN '{$statusStartEsc}' AND '{$statusEndEsc}'")) jsonResponse(array('success'=>false,'message'=>'Trạng thái Đang chiếu được hệ thống xác định tự động theo khung giờ, không thể đặt thủ công.'),422);
            if ($status === 'finished' && !(int)$this->scalar("SELECT '{$statusEndEsc}' < NOW()")) jsonResponse(array('success'=>false,'message'=>'Trạng thái Đã kết thúc được hệ thống xác định tự động sau giờ kết thúc.'),422);
        }
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
            updated_at DATETIME NOT NULL,
            CONSTRAINT fk_tms_schedule_details_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_showtime_ticket_types (
            showtime_id BIGINT UNSIGNED NOT NULL,
            ticket_type_id BIGINT UNSIGNED NOT NULL,
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (showtime_id, ticket_type_id),
            KEY idx_showtime_ticket_type (ticket_type_id),
            CONSTRAINT fk_tms_showtime_ticket_types_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
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
        jsonResponse(array('success' => true, 'message' => count($createdIds) > 1 ? 'Đã tạo '.count($createdIds).' suất chiếu, mỗi khung giờ đúng phòng đã chọn trong aurora_db.' : 'Đã lưu suất chiếu vào aurora_db.', 'data' => array('id' => $id, 'ids' => $createdIds, 'show_date' => $showDate, 'display_date' => date('d/m/Y', strtotime($showDate)))), $wasUpdate ? 200 : 201);
    }

    private function ensureSchedulePublishSchema()
    {
        $this->ensureMovieCatalogSchema();
        $this->db->query("CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(80) NOT NULL,
            action VARCHAR(80) NOT NULL,
            details TEXT NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS schedule_operation_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            showtime_id BIGINT UNSIGNED NOT NULL,
            action_name VARCHAR(40) NOT NULL,
            performed_by VARCHAR(120) NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_schedule_operation_showtime (showtime_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS schedule_deletion_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            showtime_id BIGINT UNSIGNED NOT NULL,
            movie_id BIGINT UNSIGNED NOT NULL,
            screen_id BIGINT UNSIGNED NOT NULL,
            starts_at DATETIME NOT NULL,
            ends_at DATETIME NOT NULL,
            status VARCHAR(20) NOT NULL,
            ticket_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            deleted_by VARCHAR(120) NOT NULL,
            batch_code VARCHAR(40) NOT NULL,
            deleted_at DATETIME NOT NULL,
            KEY idx_schedule_deletion_showtime (showtime_id),
            KEY idx_schedule_deletion_batch (batch_code),
            KEY idx_schedule_deletion_time (deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_schedule_details (
            showtime_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
            ticket_price DECIMAL(12,2) NOT NULL DEFAULT 0,
            operational_note VARCHAR(500) NOT NULL DEFAULT '',
            updated_by VARCHAR(120) NOT NULL,
            updated_at DATETIME NOT NULL,
            CONSTRAINT fk_tms_schedule_details_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8");
        $this->db->query("CREATE TABLE IF NOT EXISTS tms_showtime_ticket_types (
            showtime_id BIGINT UNSIGNED NOT NULL,
            ticket_type_id BIGINT UNSIGNED NOT NULL,
            price DECIMAL(12,2) NOT NULL DEFAULT 0,
            PRIMARY KEY (showtime_id, ticket_type_id),
            KEY idx_showtime_ticket_type (ticket_type_id),
            CONSTRAINT fk_tms_showtime_ticket_types_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE
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

        if ($resource === 'schedules') {
            if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền xóa suất chiếu.'), 403);
            }

            $input = requestJson();
            if (isset($input['ids']) && !is_array($input['ids'])) {
                jsonResponse(array('success' => false, 'message' => 'Danh sách suất chiếu không hợp lệ.'), 422);
            }
            $rawIds = isset($input['ids'])
                ? $input['ids']
                : (isset($_GET['id']) ? array($_GET['id']) : array());
            if (count($rawIds) > 2000) jsonResponse(array('success' => false, 'message' => 'Mỗi lần chỉ được xóa tối đa 2.000 suất chiếu.'), 422);
            $ids = array();
            foreach ($rawIds as $rawId) {
                $scheduleId = 0;
                if (is_int($rawId)) {
                    $scheduleId = $rawId;
                } else if (is_string($rawId) && ctype_digit($rawId)) {
                    $normalizedId = ltrim($rawId, '0');
                    $scheduleId = (int)$rawId;
                    if ($normalizedId === '' || (string)$scheduleId !== $normalizedId) $scheduleId = 0;
                }
                if ($scheduleId < 1) {
                    jsonResponse(array('success' => false, 'message' => 'Mã suất chiếu phải là số nguyên dương.'), 422);
                }
                $ids[$scheduleId] = $scheduleId;
            }
            $ids = array_values($ids);
            sort($ids);
            if (count($ids) < 1) jsonResponse(array('success' => false, 'message' => 'Vui lòng chọn ít nhất một suất chiếu cần xóa.'), 422);
            $requestedIds = $ids;

            $scope = $this->enforceCinemaScope('sc');
            $this->ensureSchedulePublishSchema();
            $this->ensureScheduleDeleteIntegrity();
            if (!$this->beginDbTransaction()) jsonResponse(array('success' => false, 'message' => 'Không thể bắt đầu giao dịch xóa lịch chiếu.'), 500);
            $deletedMovieIds = array();
            $alreadyMissingIds = array();
            $deletedIds = array();
            $deletedCount = 0;
            $batchCode = '';
            try {
                $idSql = implode(',', $ids);
                $scopeSql = $scope !== '' ? ' AND '.$scope : '';
                $result = $this->db->query("SELECT s.id, s.movie_id, s.screen_id, s.starts_at, s.ends_at, s.status, s.ticket_price,
                           CASE WHEN s.starts_at <= NOW() THEN 1 ELSE 0 END AS has_started
                    FROM showtimes s
                    INNER JOIN screens sc ON sc.id=s.screen_id
                    WHERE s.id IN ({$idSql}){$scopeSql}
                    FOR UPDATE");
                if (!$result) throw new Exception($this->db->error);
                $schedules = array();
                while ($row = $result->fetch_assoc()) $schedules[] = $row;
                if (count($schedules) !== count($ids)) {
                    $foundMap = array();
                    foreach ($schedules as $schedule) $foundMap[(int)$schedule['id']] = (int)$schedule['id'];
                    $existingMap = array();
                    $existingResult = $this->db->query("SELECT id FROM showtimes WHERE id IN ({$idSql}) FOR UPDATE");
                    if (!$existingResult) throw new Exception($this->db->error);
                    while ($existingRow = $existingResult->fetch_assoc()) $existingMap[(int)$existingRow['id']] = (int)$existingRow['id'];
                    $outsideScopeIds = array_values(array_diff(array_values($existingMap), array_values($foundMap)));
                    if (count($outsideScopeIds) > 0) {
                        $this->rollbackDbTransaction();
                        jsonResponse(array(
                            'success' => false,
                            'message' => 'Một hoặc nhiều suất chiếu không thuộc phạm vi rạp bạn quản lý.',
                            'data' => array('outside_scope_ids' => $outsideScopeIds)
                        ), 403);
                    }
                    $alreadyMissingIds = array_values(array_diff($requestedIds, array_values($existingMap)));
                }

                $ids = array();
                foreach ($schedules as $schedule) $ids[] = (int)$schedule['id'];
                sort($ids);
                $idSql = implode(',', $ids);

                if (count($ids) === 0) {
                    if (!$this->commitDbTransaction()) throw new Exception($this->db->error);
                } else {

                $startedIds = array();
                foreach ($schedules as $schedule) if ((int)$schedule['has_started'] === 1) $startedIds[] = (int)$schedule['id'];
                if (count($startedIds) > 0) {
                    $this->rollbackDbTransaction();
                    jsonResponse(array(
                        'success' => false,
                        'message' => 'Chỉ được xóa suất chiếu chưa bắt đầu. Không có suất nào bị xóa.',
                        'data' => array('blocked_ids' => $startedIds)
                    ), 409);
                }

                $bookingResult = $this->db->query("SELECT id, showtime_id FROM bookings WHERE showtime_id IN ({$idSql}) FOR UPDATE");
                if (!$bookingResult) throw new Exception($this->db->error);
                $blockedMap = array();
                while ($booking = $bookingResult->fetch_assoc()) $blockedMap[(int)$booking['showtime_id']] = (int)$booking['showtime_id'];
                $blockedIds = array_values($blockedMap);
                if (count($blockedIds) > 0) {
                    $this->rollbackDbTransaction();
                    jsonResponse(array(
                        'success' => false,
                        'message' => 'Không thể xóa vì '.count($blockedIds).' suất chiếu đã có lịch sử đặt vé. Không có suất nào bị xóa.',
                        'data' => array('blocked_ids' => $blockedIds)
                    ), 409);
                }

                $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : (!empty($_SESSION['tms_user']['username']) ? $_SESSION['tms_user']['username'] : 'TMS Admin');
                $actorEsc = $this->db->real_escape_string($actor);
                $batchCode = 'DEL-' . strtoupper(substr(sha1(uniqid((string)mt_rand(), true)), 0, 20));
                foreach ($schedules as $schedule) {
                    $showtimeId = (int)$schedule['id'];
                    $movieId = (int)$schedule['movie_id'];
                    $deletedMovieIds[$movieId] = $movieId;
                    $screenId = (int)$schedule['screen_id'];
                    $startsAtEsc = $this->db->real_escape_string($schedule['starts_at']);
                    $endsAtEsc = $this->db->real_escape_string($schedule['ends_at']);
                    $statusEsc = $this->db->real_escape_string($schedule['status']);
                    $ticketPrice = (float)$schedule['ticket_price'];
                    if (!$this->db->query("INSERT INTO schedule_deletion_logs (showtime_id,movie_id,screen_id,starts_at,ends_at,status,ticket_price,deleted_by,batch_code,deleted_at) VALUES ({$showtimeId},{$movieId},{$screenId},'{$startsAtEsc}','{$endsAtEsc}','{$statusEsc}',{$ticketPrice},'{$actorEsc}','{$batchCode}',NOW())")) throw new Exception($this->db->error);
                    if (!$this->db->query("INSERT INTO schedule_operation_logs (showtime_id,action_name,performed_by,created_at) VALUES ({$showtimeId},'deleted','{$actorEsc}',NOW())")) throw new Exception($this->db->error);
                }
                $username = !empty($_SESSION['tms_user']['username']) ? $_SESSION['tms_user']['username'] : $actor;
                $usernameEsc = $this->db->real_escape_string($username);
                $ipAddress = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
                $ipEsc = $this->db->real_escape_string($ipAddress);
                $auditDetails = $this->db->real_escape_string(json_encode(array('batch_code'=>$batchCode, 'deleted_ids'=>$ids, 'deleted_count'=>count($ids))));
                $auditAction = count($ids) > 1 ? 'BULK_DELETE_SHOWTIMES' : 'DELETE_SHOWTIME';
                if (!$this->db->query("INSERT INTO audit_logs (username,action,details,ip_address) VALUES ('{$usernameEsc}','{$auditAction}','{$auditDetails}','{$ipEsc}')")) throw new Exception($this->db->error);

                $deleteTables = array('seat_holds', 'tms_showtime_ticket_types', 'tms_schedule_details');
                foreach ($deleteTables as $table) {
                    if ($this->tableExists($table) && !$this->db->query("DELETE FROM {$table} WHERE showtime_id IN ({$idSql})")) throw new Exception($this->db->error);
                }
                $eventTables = array('customer_schedule_events', 'customer_theater_schedule_events', 'customer_theater_detail_events');
                foreach ($eventTables as $table) {
                    if ($this->tableExists($table) && !$this->db->query("UPDATE {$table} SET showtime_id=NULL WHERE showtime_id IN ({$idSql})")) throw new Exception($this->db->error);
                }
                if (!$this->db->query("DELETE FROM showtimes WHERE id IN ({$idSql})")) throw new Exception($this->db->error);
                $deletedCount = (int)$this->db->affected_rows;
                if ($deletedCount !== count($ids)) throw new Exception('Số suất chiếu đã xóa không khớp với yêu cầu.');
                $deletedIds = $ids;
                if (!$this->commitDbTransaction()) throw new Exception($this->db->error);
                }
            } catch (Exception $e) {
                $this->rollbackDbTransaction();
                error_log('Aurora schedule deletion failed: '.$e->getMessage());
                jsonResponse(array('success' => false, 'message' => 'Không thể xóa lịch chiếu khỏi aurora_db. Vui lòng thử lại hoặc liên hệ quản trị hệ thống.'), 500);
            }

            if (count($deletedMovieIds) > 0) {
                $allocationMovieSql = implode(',', array_values($deletedMovieIds));
                $allocations = $this->rows("SELECT ma.*, m.poster_url, m.trailer_url FROM movie_allocations ma LEFT JOIN movies m ON m.id=ma.movie_id WHERE ma.movie_id IN ({$allocationMovieSql})");
                foreach ($allocations as $allocation) $this->syncMovieAllocationTasks($allocation, $allocation);
            }

            if ($deletedCount > 0) {
                $message = $deletedCount > 1 ? 'Đã xóa '.$deletedCount.' suất chiếu đã chọn khỏi aurora_db.' : 'Đã xóa suất chiếu khỏi aurora_db.';
                if (count($alreadyMissingIds) > 0) $message .= ' '.count($alreadyMissingIds).' suất đã được xóa trước đó và đã được loại khỏi danh sách.';
            } else {
                $message = 'Các suất chiếu đã chọn đã được xóa trước đó. Danh sách đã được đồng bộ lại.';
            }
            jsonResponse(array(
                'success' => true,
                'message' => $message,
                'data' => array(
                    'requested_count' => count($requestedIds),
                    'deleted_count' => $deletedCount,
                    'deleted_ids' => $deletedIds,
                    'already_missing_ids' => $alreadyMissingIds,
                    'batch_code' => $batchCode
                )
            ));
        }
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu id.'), 400);
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
        $accountType = isset($_GET['account_type']) && $_GET['account_type'] === 'customer' ? 'customer' : 'internal';
        if ($accountType === 'customer' && $role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Không gian tài khoản customer chỉ dành cho Admin Tổng.'), 403);
        }
        $where = array($accountType === 'customer' ? "u.role = 'customer'" : "u.role <> 'customer'");
        if (!empty($_GET['q'])) { $q = $this->db->real_escape_string(trim($_GET['q'])); $where[] = "(u.username LIKE '%{$q}%' OR u.full_name LIKE '%{$q}%' OR u.phone LIKE '%{$q}%' OR u.email LIKE '%{$q}%')"; }
        if ($accountType === 'internal' && !empty($_GET['role'])) { $roleFilter = $this->db->real_escape_string(self::normalizeRole($_GET['role'])); $where[] = "u.role = '{$roleFilter}'"; }
        if ($accountType === 'customer' && !empty($_GET['membership']) && in_array($_GET['membership'], array('STANDARD', 'SILVER', 'GOLD', 'PLATINUM'), true)) { $where[] = "u.membership_level = '".$this->db->real_escape_string($_GET['membership'])."'"; }
        if (!empty($_GET['status']) && in_array($_GET['status'], array('active', 'inactive', 'locked'), true)) { $where[] = "status = '".$this->db->real_escape_string($_GET['status'])."'"; }
        $users = $this->rows("SELECT u.id, u.username, u.full_name, u.phone, u.email, u.theater_id, t.name AS theater_name, u.role, u.status, u.last_login, u.membership_level, u.points, u.created_at, MAX(l.created_at) AS last_management_action,
            (SELECT COUNT(*) FROM bookings b WHERE b.user_id=u.id) AS booking_count,
            (SELECT COALESCE(SUM(o.total_amount),0) FROM orders o WHERE o.customer_id=u.id AND o.status='PAID') AS total_spent,
            (SELECT GROUP_CONCAT(DISTINCT oa.provider ORDER BY oa.provider SEPARATOR ',') FROM oauth_accounts oa WHERE oa.user_id=u.id) AS oauth_providers
            FROM users u LEFT JOIN theaters t ON t.id=u.theater_id LEFT JOIN tms_user_activity_logs l ON l.target_user_id=u.id WHERE ".implode(' AND ', $where)." GROUP BY u.id, u.username, u.full_name, u.phone, u.email, u.theater_id, t.name, u.role, u.status, u.last_login, u.membership_level, u.points, u.created_at ORDER BY u.status='active' DESC, u.full_name ASC");
        $rolesDef = self::getRoleDefinitions();
        $clockResult = $this->db->query('SELECT NOW()');
        if (!$clockResult) {
            jsonResponse(array('success' => false, 'message' => 'Không thể xác định giờ hiện tại từ aurora_db: ' . $this->db->error), 500);
        }
        $clockRow = $clockResult->fetch_row();
        $currentTime = isset($clockRow[0]) ? (string)$clockRow[0] : '';
        $clockResult->free();
        if ($currentTime === '') {
            jsonResponse(array('success' => false, 'message' => 'aurora_db không trả về giờ hiện tại hợp lệ.'), 500);
        }

        foreach ($users as &$u) {
            if (empty($u['last_login']) || $u['last_login'] === '1970-01-01 00:00:00' || $u['last_login'] > $currentTime) {
                $u['last_login'] = null;
            }
            $normalized = self::normalizeRole($u['role']);
            $u['normalized_role'] = $normalized;
            $u['account_type'] = $u['role'] === 'customer' ? 'customer' : 'internal';
            $u['booking_count'] = (int)$u['booking_count'];
            $u['total_spent'] = (float)$u['total_spent'];
            $u['points'] = (int)$u['points'];
            $u['role_info'] = isset($rolesDef[$normalized]) ? $rolesDef[$normalized] : array('name' => 'Khách hàng', 'badge' => 'Customer');
        }
        unset($u);

        jsonResponse(array(
            'success' => true,
            'data' => $users,
            'account_type' => $accountType,
            'summary' => array(
                'total' => (int)$this->scalar('SELECT COUNT(*) FROM users'),
                'active' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE status='active'"),
                'locked' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE status IN ('locked','inactive')"),
                'internal_total' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE role <> 'customer'"),
                'internal_active' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE role <> 'customer' AND status='active'"),
                'customer_total' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE role = 'customer'"),
                'customer_active' => (int)$this->scalar("SELECT COUNT(*) FROM users WHERE role = 'customer' AND status='active'"),
                'customer_points' => (int)$this->scalar("SELECT COALESCE(SUM(points),0) FROM users WHERE role = 'customer'"),
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
        if (!in_array($userRole, array('super_admin', 'cinema_admin', 'supervisor', 'accounting'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Form phân quyền nội bộ không được phép tạo hoặc chuyển đổi tài khoản customer.'), 400);
        }
        $allowedStatuses = array('active', 'inactive', 'locked');
        $statusProvided = array_key_exists('status', $input);
        $status = $statusProvided ? $input['status'] : ($id > 0 ? null : 'active');
        $password = isset($input['password']) ? trim((string)$input['password']) : '';

        if ($userRole === '') $userRole = 'cinema_admin';
        if ($statusProvided && !in_array($status, $allowedStatuses, true)) {
            jsonResponse(array('success' => false, 'message' => 'Trạng thái tài khoản không hợp lệ.'), 400);
        }
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

        if ($id > 0) {
            $existingUser = $this->row("SELECT status, role FROM users WHERE id = " . $id);
            if (!$existingUser) jsonResponse(array('success' => false, 'message' => 'Tài khoản không tồn tại trong Aurora DB.'), 404);
            if ($existingUser['role'] === 'customer') jsonResponse(array('success' => false, 'message' => 'Tài khoản customer phải được quản lý trong không gian Khách hàng, không thể cấp quyền nội bộ.'), 400);
            if ($status === null) {
                $status = $existingUser['status'];
            }
            $stEsc = $this->db->real_escape_string($status);
            if (!empty($_SESSION['tms_user']['id']) && (int)$_SESSION['tms_user']['id'] === $id && $status !== 'active') jsonResponse(array('success' => false, 'message' => 'Không thể khóa tài khoản đang đăng nhập.'), 400);
            if ($password !== '') {
                $hash = function_exists('password_hash') ? password_hash($password, PASSWORD_BCRYPT) : crypt($password);
                $hashEsc = $this->db->real_escape_string($hash);
                $updated = $this->db->query("UPDATE users SET full_name = '{$fnEsc}', phone = '{$phEsc}', email = '{$emEsc}', theater_id = {$theaterSql}, role = '{$rlEsc}', status = '{$stEsc}', password_hash = '{$hashEsc}', updated_at = NOW() WHERE id = " . $id);
            } else {
                $updated = $this->db->query("UPDATE users SET full_name = '{$fnEsc}', phone = '{$phEsc}', email = '{$emEsc}', theater_id = {$theaterSql}, role = '{$rlEsc}', status = '{$stEsc}', updated_at = NOW() WHERE id = " . $id);
            }
            if (!$updated) jsonResponse(array('success' => false, 'message' => 'Không thể cập nhật tài khoản: '.$this->db->error), 500);
            $this->logUserManagementActivity($id, 'updated', 'Cập nhật hồ sơ, vai trò, rạp phụ trách hoặc trạng thái tài khoản.');
            jsonResponse(array('success' => true, 'message' => 'Đã cập nhật tài khoản và phân quyền trong Aurora DB.'));
        } else {
            $stEsc = $this->db->real_escape_string($status);
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

    public function updateCustomerStatus()
    {
        requireAdmin();
        if ($this->getCurrentRole() !== 'super_admin') jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền thay đổi trạng thái customer.'), 403);
        $input = requestJson();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
        $status = isset($input['status']) ? trim((string)$input['status']) : '';
        if ($id < 1 || !in_array($status, array('active', 'locked', 'inactive'), true)) jsonResponse(array('success' => false, 'message' => 'Dữ liệu trạng thái customer không hợp lệ.'), 400);
        $customer = $this->row("SELECT id, full_name, role FROM users WHERE id={$id} LIMIT 1");
        if (!$customer || $customer['role'] !== 'customer') jsonResponse(array('success' => false, 'message' => 'Không tìm thấy tài khoản customer trong Aurora DB.'), 404);
        $statusEsc = $this->db->real_escape_string($status);
        if (!$this->db->query("UPDATE users SET status='{$statusEsc}', updated_at=NOW() WHERE id={$id} AND role='customer'")) jsonResponse(array('success' => false, 'message' => 'Không thể cập nhật trạng thái customer: '.$this->db->error), 500);
        $this->logUserManagementActivity($id, 'customer_status_updated', 'Cập nhật trạng thái customer thành '.$status.'.');
        jsonResponse(array('success' => true, 'message' => $status === 'active' ? 'Đã mở lại quyền truy cập của customer.' : 'Đã hạn chế quyền truy cập của customer.', 'data' => array('id'=>$id, 'status'=>$status)));
    }

    public function deleteUser()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if ($role !== 'super_admin') {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng mới có quyền xóa tài khoản TMS.'), 403);
        }
        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        if (!$id) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu ID người dùng cần xóa.'), 400);
        }
        // Không cho phép tự xóa tài khoản của chính mình
        if (!empty($_SESSION['tms_user']['id']) && (int)$_SESSION['tms_user']['id'] === $id) {
            jsonResponse(array('success' => false, 'message' => 'Bạn không thể tự xóa tài khoản đang đăng nhập.'), 400);
        }

        // Lấy thông tin tài khoản trước khi xóa để ghi nhật ký
        $userRow = $this->row("SELECT id, username, full_name, role FROM users WHERE id = {$id}");
        if (!$userRow) {
            jsonResponse(array('success' => false, 'message' => 'Tài khoản không tồn tại trong Aurora DB.'), 404);
        }
        if ($userRow['role'] === 'customer') {
            jsonResponse(array('success' => false, 'message' => 'Không thể xóa customer từ nghiệp vụ quản trị tài khoản nội bộ.'), 400);
        }

        // Dọn dẹp an toàn các bảng liên quan để tránh lỗi Foreign Key
        $this->db->query("DELETE FROM oauth_accounts WHERE user_id = {$id}");
        $this->db->query("UPDATE oauth_login_attempts SET user_id = NULL WHERE user_id = {$id}");
        $this->db->query("DELETE FROM tms_user_activity_logs WHERE target_user_id = {$id}");
        $this->db->query("DELETE FROM loyalty_point_transactions WHERE user_id = {$id}");
        $this->db->query("DELETE FROM customer_ticket_price_views WHERE user_id = {$id}");
        $this->db->query("DELETE FROM movie_search_logs WHERE user_id = {$id}");
        $this->db->query("DELETE FROM customer_home_events WHERE user_id = {$id}");
        $this->db->query("DELETE FROM customer_movie_catalog_events WHERE user_id = {$id}");
        $this->db->query("DELETE FROM customer_schedule_events WHERE user_id = {$id}");
        $this->db->query("DELETE FROM customer_theater_detail_events WHERE user_id = {$id}");
        $this->db->query("DELETE FROM customer_theater_schedule_events WHERE user_id = {$id}");
        $this->db->query("DELETE FROM pos_login_events WHERE user_id = {$id}");
        $this->db->query("DELETE FROM pos_shifts WHERE user_id = {$id}");
        $this->db->query("DELETE FROM seat_holds WHERE user_id = {$id}");
        $this->db->query("UPDATE refunds SET requested_by = NULL WHERE requested_by = {$id}");
        $this->db->query("UPDATE orders SET customer_id = 0 WHERE customer_id = {$id}");
        $this->db->query("UPDATE transactions SET customer_id = NULL WHERE customer_id = {$id}");

        // Xử lý booking ghế và combo nếu có
        $bookings = $this->rows("SELECT id FROM bookings WHERE user_id = {$id}");
        if (!empty($bookings)) {
            $bIds = array();
            foreach ($bookings as $b) {
                $bIds[] = (int)$b['id'];
            }
            $bIdList = implode(',', $bIds);
            if ($bIdList !== '') {
                $this->db->query("UPDATE orders SET booking_id = 0 WHERE booking_id IN ({$bIdList})");
                $this->db->query("DELETE FROM booking_seats WHERE booking_id IN ({$bIdList})");
                $this->db->query("DELETE FROM booking_concessions WHERE booking_id IN ({$bIdList})");
                $this->db->query("DELETE FROM bookings WHERE id IN ({$bIdList})");
            }
        }

        $deleted = $this->db->query("DELETE FROM users WHERE id = " . $id);
        if (!$deleted) {
            jsonResponse(array('success' => false, 'message' => 'Không thể xóa tài khoản trong Aurora DB: ' . $this->db->error), 500);
        }

        $this->logUserManagementActivity($id, 'deleted', "Admin Tổng đã xóa vĩnh viễn tài khoản @{$userRow['username']} ({$userRow['full_name']}) khỏi Aurora DB.");
        jsonResponse(array('success' => true, 'message' => "Đã xóa vĩnh viễn tài khoản {$userRow['full_name']} (@{$userRow['username']}) khỏi Aurora DB."));
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
        requireAdmin();
        $this->ensureCinemaOwnershipSchema();
        $scope = $this->enforceCinemaScope('sc');
        if ($scope !== '' && !(int)$this->scalar('SELECT COUNT(*) FROM screens sc WHERE sc.id='.$screen.' AND '.$scope)) {
            jsonResponse(array('success' => false, 'message' => 'Bạn không được phép xem sơ đồ ghế của rạp khác.'), 403);
        }
        $rows = $this->rows('SELECT se.* FROM seats se INNER JOIN screens sc ON sc.id=se.screen_id WHERE se.screen_id=' . $screen . ' ORDER BY se.seat_row, se.seat_number');
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    private function ensureShowtimeSeatLockSchema()
    {
        $lockSql = "CREATE TABLE IF NOT EXISTS tms_showtime_seat_locks (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            showtime_id BIGINT UNSIGNED NOT NULL,
            seat_id BIGINT UNSIGNED NOT NULL,
            reason VARCHAR(255) NOT NULL DEFAULT '',
            locked_by VARCHAR(120) NOT NULL,
            locked_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            UNIQUE KEY uq_tms_showtime_seat_lock (showtime_id, seat_id),
            KEY idx_tms_showtime_seat_lock_seat (seat_id),
            CONSTRAINT fk_tms_seat_lock_showtime FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE,
            CONSTRAINT fk_tms_seat_lock_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
        if (!$this->db->query($lockSql)) jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo dữ liệu khóa ghế: '.$this->db->error), 500);
        $logSql = "CREATE TABLE IF NOT EXISTS tms_showtime_seat_lock_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            showtime_id BIGINT UNSIGNED NOT NULL,
            seat_id BIGINT UNSIGNED NOT NULL,
            action_name VARCHAR(20) NOT NULL,
            reason VARCHAR(255) NOT NULL DEFAULT '',
            performed_by VARCHAR(120) NOT NULL,
            created_at DATETIME NOT NULL,
            KEY idx_tms_seat_lock_log_showtime (showtime_id),
            KEY idx_tms_seat_lock_log_seat (seat_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
        if (!$this->db->query($logSql)) jsonResponse(array('success' => false, 'message' => 'Không thể khởi tạo lịch sử khóa ghế: '.$this->db->error), 500);
    }

    public function screenSeatMap()
    {
        requireAdmin();
        $this->ensureCinemaOwnershipSchema();
        $this->ensureShowtimeSeatLockSchema();
        $screenId = isset($_GET['screen_id']) ? (int)$_GET['screen_id'] : 0;
        $showtimeId = isset($_GET['showtime_id']) ? (int)$_GET['showtime_id'] : 0;
        $date = isset($_GET['date']) ? trim((string)$_GET['date']) : date('Y-m-d');
        if ($screenId <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) jsonResponse(array('success' => false, 'message' => 'Phòng chiếu hoặc ngày xem không hợp lệ.'), 422);
        $scope = $this->enforceCinemaScope('sc');
        $scopeSql = $scope !== '' ? ' AND '.$scope : '';
        $screenRows = $this->rows("SELECT sc.id,sc.theater_id,sc.screen_code,sc.name,sc.screen_type,sc.total_seats,sc.status,th.name theater_name,th.address theater_address FROM screens sc INNER JOIN theaters th ON th.id=sc.theater_id WHERE sc.id={$screenId}{$scopeSql} LIMIT 1");
        if (empty($screenRows)) jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phòng chiếu trong phạm vi rạp được phân quyền.'), 404);
        $dateEsc = $this->db->real_escape_string($date);
        $showtimes = $this->rows("SELECT st.id,st.movie_id,m.title movie_title,m.duration_minutes,m.age_rating,m.poster_url,st.starts_at,st.ends_at,st.status,
            (SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id=st.id AND b.status NOT IN ('CANCELLED','EXPIRED')) booked_seats,
            (SELECT COUNT(*) FROM tms_showtime_seat_locks sl WHERE sl.showtime_id=st.id) locked_seats
            FROM showtimes st INNER JOIN movies m ON m.id=st.movie_id
            WHERE st.screen_id={$screenId} AND DATE(st.starts_at)='{$dateEsc}' AND st.status<>'CANCELLED' ORDER BY st.starts_at");
        if ($showtimeId <= 0 && !empty($showtimes)) $showtimeId = (int)$showtimes[0]['id'];
        $selectedShowtime = null;
        foreach ($showtimes as $showtime) if ((int)$showtime['id'] === $showtimeId) { $selectedShowtime = $showtime; break; }
        if ($showtimeId > 0 && empty($selectedShowtime)) jsonResponse(array('success' => false, 'message' => 'Suất chiếu không thuộc phòng hoặc ngày đang chọn.'), 422);
        $seats = array();
        if ($showtimeId > 0) {
            $seats = $this->rows("SELECT se.id,se.seat_row,se.seat_number,se.seat_type,
                CASE WHEN EXISTS (SELECT 1 FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id={$showtimeId} AND bs.seat_id=se.id AND b.status NOT IN ('CANCELLED','EXPIRED')) THEN 'booked'
                     WHEN EXISTS (SELECT 1 FROM tms_showtime_seat_locks sl WHERE sl.showtime_id={$showtimeId} AND sl.seat_id=se.id) THEN 'locked'
                     WHEN EXISTS (SELECT 1 FROM seat_holds sh WHERE sh.showtime_id={$showtimeId} AND sh.seat_id=se.id AND sh.expires_at>NOW()) THEN 'held'
                     ELSE 'available' END seat_status,
                COALESCE((SELECT sl.reason FROM tms_showtime_seat_locks sl WHERE sl.showtime_id={$showtimeId} AND sl.seat_id=se.id LIMIT 1),'') lock_reason,
                COALESCE((SELECT sl.locked_by FROM tms_showtime_seat_locks sl WHERE sl.showtime_id={$showtimeId} AND sl.seat_id=se.id LIMIT 1),'') locked_by
                FROM seats se WHERE se.screen_id={$screenId} ORDER BY se.seat_row,se.seat_number");
        } else {
            // Vẫn trả sơ đồ vật lý của phòng khi ngày đang xem chưa có suất chiếu.
            // Trạng thái khóa/đặt chỉ có ý nghĩa sau khi người dùng chọn một suất cụ thể.
            $seats = $this->rows("SELECT se.id,se.seat_row,se.seat_number,se.seat_type,
                'available' seat_status,'' lock_reason,'' locked_by
                FROM seats se WHERE se.screen_id={$screenId} ORDER BY se.seat_row,se.seat_number");
        }
        $counts = array('available'=>0,'booked'=>0,'locked'=>0,'held'=>0);
        foreach ($seats as $seat) if (isset($counts[$seat['seat_status']])) $counts[$seat['seat_status']]++;
        jsonResponse(array('success'=>true,'data'=>array('date'=>$date,'screen'=>$screenRows[0],'showtimes'=>$showtimes,'selected_showtime'=>$selectedShowtime,'seats'=>$seats,'summary'=>$counts)));
    }

    public function cinemaSystemOverview()
    {
        requireAdmin();
        if ($this->getCurrentRole() !== 'super_admin') {
            jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng được xem trung tâm Hệ thống rạp.'),403);
        }
        $this->ensureCinemaOwnershipSchema();
        $this->ensureShowtimeSeatLockSchema();
        $date = isset($_GET['date']) ? trim((string)$_GET['date']) : date('Y-m-d');
        $theaterId = isset($_GET['theater_id']) ? (int)$_GET['theater_id'] : 0;
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) jsonResponse(array('success'=>false,'message'=>'Ngày vận hành không hợp lệ.'),422);
        if ($theaterId > 0 && !(int)$this->scalar('SELECT COUNT(*) FROM theaters WHERE id='.$theaterId)) {
            jsonResponse(array('success'=>false,'message'=>'Rạp được chọn không tồn tại trong aurora_db.'),404);
        }
        $dateEsc = $this->db->real_escape_string($date);
        $theaters = $this->rows("SELECT th.id,th.name,th.address,th.city,'' phone,'active' status,
            COUNT(DISTINCT sc.id) total_screens,COALESCE(SUM(sc.total_seats),0) total_seats,
            COALESCE(SUM(CASE WHEN sc.status='active' THEN 1 ELSE 0 END),0) active_screens,
            COALESCE((SELECT u.full_name FROM users u WHERE u.theater_id=th.id AND u.role='cinema_admin' AND u.status='active' ORDER BY u.id LIMIT 1),'Chưa phân công') admin_name,
            (SELECT COUNT(*) FROM showtimes st INNER JOIN screens day_sc ON day_sc.id=st.screen_id WHERE day_sc.theater_id=th.id AND DATE(st.starts_at)='{$dateEsc}' AND st.status<>'CANCELLED') showtimes,
            (SELECT COUNT(*) FROM showtimes st INNER JOIN screens run_sc ON run_sc.id=st.screen_id WHERE run_sc.theater_id=th.id AND DATE(st.starts_at)='{$dateEsc}' AND st.status='OPEN' AND NOW() BETWEEN st.starts_at AND st.ends_at) running_showtimes,
            (SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id INNER JOIN showtimes st ON st.id=b.showtime_id INNER JOIN screens book_sc ON book_sc.id=st.screen_id WHERE book_sc.theater_id=th.id AND DATE(st.starts_at)='{$dateEsc}' AND b.status NOT IN ('CANCELLED','EXPIRED')) booked_seats,
            (SELECT COUNT(*) FROM tms_showtime_seat_locks sl INNER JOIN showtimes st ON st.id=sl.showtime_id INNER JOIN screens lock_sc ON lock_sc.id=st.screen_id WHERE lock_sc.theater_id=th.id AND DATE(st.starts_at)='{$dateEsc}') locked_seats
            FROM theaters th LEFT JOIN screens sc ON sc.theater_id=th.id GROUP BY th.id,th.name,th.address,th.city ORDER BY th.name");
        $screens = array();
        if ($theaterId > 0) {
            $screens = $this->rows("SELECT sc.id,sc.theater_id,sc.screen_code,sc.name,sc.screen_type,sc.total_seats,sc.status,
                (SELECT COUNT(*) FROM showtimes st WHERE st.screen_id=sc.id AND DATE(st.starts_at)='{$dateEsc}' AND st.status<>'CANCELLED') showtimes,
                (SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id INNER JOIN showtimes st ON st.id=b.showtime_id WHERE st.screen_id=sc.id AND DATE(st.starts_at)='{$dateEsc}' AND b.status NOT IN ('CANCELLED','EXPIRED')) booked_seats,
                (SELECT st.starts_at FROM showtimes st WHERE st.screen_id=sc.id AND DATE(st.starts_at)='{$dateEsc}' AND st.status<>'CANCELLED' ORDER BY st.starts_at LIMIT 1) first_showtime,
                COALESCE((SELECT m.title FROM showtimes st INNER JOIN movies m ON m.id=st.movie_id WHERE st.screen_id=sc.id AND DATE(st.starts_at)='{$dateEsc}' AND st.status<>'CANCELLED' ORDER BY st.starts_at LIMIT 1),'Chưa có lịch') first_movie
                FROM screens sc WHERE sc.theater_id={$theaterId} ORDER BY sc.screen_code,sc.id");
        }
        $summary = array('theaters'=>count($theaters),'screens'=>0,'active_screens'=>0,'seats'=>0,'showtimes'=>0,'booked_seats'=>0,'locked_seats'=>0);
        foreach ($theaters as $theater) {
            $summary['screens'] += (int)$theater['total_screens']; $summary['active_screens'] += (int)$theater['active_screens'];
            $summary['seats'] += (int)$theater['total_seats']; $summary['showtimes'] += (int)$theater['showtimes'];
            $summary['booked_seats'] += (int)$theater['booked_seats']; $summary['locked_seats'] += (int)$theater['locked_seats'];
        }
        jsonResponse(array('success'=>true,'data'=>array('date'=>$date,'selected_theater_id'=>$theaterId,'summary'=>$summary,'theaters'=>$theaters,'screens'=>$screens)));
    }

    public function updateShowtimeSeatLocks()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin','cinema_admin'), true)) jsonResponse(array('success'=>false,'message'=>'Chỉ Admin Tổng hoặc Admin Rạp được khóa ghế theo suất chiếu.'),403);
        $this->ensureCinemaOwnershipSchema();
        $this->ensureShowtimeSeatLockSchema();
        $input = requestJson();
        $showtimeId = isset($input['showtime_id']) ? (int)$input['showtime_id'] : 0;
        $mode = isset($input['mode']) ? strtolower(trim((string)$input['mode'])) : '';
        $reason = isset($input['reason']) ? trim((string)$input['reason']) : '';
        $seatIds = isset($input['seat_ids']) && is_array($input['seat_ids']) ? array_values(array_unique(array_map('intval',$input['seat_ids']))) : array();
        $validIds = array(); foreach ($seatIds as $seatId) if ($seatId > 0) $validIds[] = $seatId; $seatIds = $validIds;
        if ($showtimeId <= 0 || empty($seatIds) || count($seatIds) > 200 || !in_array($mode,array('lock','unlock'),true)) jsonResponse(array('success'=>false,'message'=>'Dữ liệu khóa ghế không hợp lệ.'),422);
        if ($mode === 'lock' && $reason === '') $reason = 'Khóa ghế theo yêu cầu vận hành';
        $scope = $this->enforceCinemaScope('sc'); $scopeSql = $scope !== '' ? ' AND '.$scope : '';
        $showtimeRows = $this->rows("SELECT st.id,st.screen_id,st.starts_at,st.status FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id WHERE st.id={$showtimeId}{$scopeSql} LIMIT 1");
        if (empty($showtimeRows)) jsonResponse(array('success'=>false,'message'=>'Không tìm thấy suất chiếu trong phạm vi rạp được phân quyền.'),404);
        $screenId = (int)$showtimeRows[0]['screen_id'];
        // Ghế COUPLE được bố trí thành từng cặp liên tiếp (1-2, 3-4...).
        // Luôn mở rộng request thành đủ cặp ở backend để không thể khóa lệch
        // một nửa ghế đôi bằng cách sửa payload từ trình duyệt.
        $requestedIdSql = implode(',',$seatIds);
        $pairRows = $this->rows("SELECT pair_seat.id FROM seats selected_seat INNER JOIN seats pair_seat
            ON pair_seat.screen_id=selected_seat.screen_id AND pair_seat.seat_row=selected_seat.seat_row
            AND pair_seat.seat_type='COUPLE'
            AND pair_seat.seat_number=IF(MOD(selected_seat.seat_number,2)=1,selected_seat.seat_number+1,selected_seat.seat_number-1)
            WHERE selected_seat.screen_id={$screenId} AND selected_seat.seat_type='COUPLE' AND selected_seat.id IN ({$requestedIdSql})");
        foreach ($pairRows as $pairRow) $seatIds[] = (int)$pairRow['id'];
        $seatIds = array_values(array_unique($seatIds));
        if (count($seatIds) > 200) jsonResponse(array('success'=>false,'message'=>'Chỉ được cập nhật tối đa 200 vị trí ghế mỗi lần.'),422);
        $idSql = implode(',',$seatIds);
        if ((int)$this->scalar("SELECT COUNT(*) FROM seats WHERE screen_id={$screenId} AND id IN ({$idSql})") !== count($seatIds)) jsonResponse(array('success'=>false,'message'=>'Một hoặc nhiều ghế không thuộc phòng chiếu của suất này.'),422);
        if ($mode === 'lock') {
            if ((int)$this->scalar("SELECT COUNT(*) FROM booking_seats bs INNER JOIN bookings b ON b.id=bs.booking_id WHERE b.showtime_id={$showtimeId} AND bs.seat_id IN ({$idSql}) AND b.status NOT IN ('CANCELLED','EXPIRED')") > 0) jsonResponse(array('success'=>false,'message'=>'Không thể khóa ghế đã được khách đặt.'),409);
            if ((int)$this->scalar("SELECT COUNT(*) FROM seat_holds WHERE showtime_id={$showtimeId} AND seat_id IN ({$idSql}) AND expires_at>NOW()") > 0) jsonResponse(array('success'=>false,'message'=>'Một hoặc nhiều ghế đang được khách giữ tạm thời. Vui lòng thử lại sau.'),409);
        }
        $actor = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : (!empty($_SESSION['tms_user']['username']) ? $_SESSION['tms_user']['username'] : 'Quản trị viên');
        $actorEsc = $this->db->real_escape_string($actor); $reasonEsc = $this->db->real_escape_string(substr($reason,0,255));
        if (!$this->beginDbTransaction()) jsonResponse(array('success'=>false,'message'=>'Không thể bắt đầu cập nhật khóa ghế.'),500);
        try {
            foreach ($seatIds as $seatId) {
                if ($mode === 'lock') {
                    if (!$this->db->query("INSERT INTO tms_showtime_seat_locks (showtime_id,seat_id,reason,locked_by,locked_at,updated_at) VALUES ({$showtimeId},{$seatId},'{$reasonEsc}','{$actorEsc}',NOW(),NOW()) ON DUPLICATE KEY UPDATE reason='{$reasonEsc}',locked_by='{$actorEsc}',updated_at=NOW()")) throw new Exception($this->db->error);
                } else {
                    if (!$this->db->query("DELETE FROM tms_showtime_seat_locks WHERE showtime_id={$showtimeId} AND seat_id={$seatId}")) throw new Exception($this->db->error);
                }
                if (!$this->db->query("INSERT INTO tms_showtime_seat_lock_logs (showtime_id,seat_id,action_name,reason,performed_by,created_at) VALUES ({$showtimeId},{$seatId},'{$mode}','{$reasonEsc}','{$actorEsc}',NOW())")) throw new Exception($this->db->error);
            }
            if (!$this->commitDbTransaction()) throw new Exception($this->db->error);
        } catch (Exception $e) { $this->rollbackDbTransaction(); jsonResponse(array('success'=>false,'message'=>'Không thể cập nhật khóa ghế: '.$e->getMessage()),500); }
        jsonResponse(array('success'=>true,'message'=>$mode==='lock' ? 'Đã khóa '.count($seatIds).' ghế cho suất chiếu.' : 'Đã mở khóa '.count($seatIds).' ghế cho suất chiếu.','data'=>array('showtime_id'=>$showtimeId,'seat_ids'=>$seatIds,'mode'=>$mode)));
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

    private function tableExists($table)
    {
        $tableEsc = $this->db->real_escape_string($table);
        $result = $this->db->query("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{$tableEsc}' LIMIT 1");
        return $result && $result->num_rows > 0;
    }

    private function ensureScheduleDeleteIntegrity()
    {
        $cascadeTables = array(
            'seat_holds' => 'fk_seat_holds_showtime',
            'tms_schedule_details' => 'fk_tms_schedule_details_showtime',
            'tms_showtime_ticket_types' => 'fk_tms_showtime_ticket_types_showtime'
        );
        foreach ($cascadeTables as $table => $constraint) {
            if (!$this->tableExists($table)) continue;
            if (!$this->db->query("DELETE child_row FROM `{$table}` child_row LEFT JOIN showtimes s ON s.id=child_row.showtime_id WHERE s.id IS NULL")) {
                error_log('Aurora orphan cleanup failed for '.$table.': '.$this->db->error);
                jsonResponse(array('success'=>false, 'message'=>'Không thể chuẩn bị toàn vẹn dữ liệu lịch chiếu trong aurora_db.'), 500);
            }
            if (!$this->ensureShowtimeForeignKey($table, $constraint, 'CASCADE')) {
                error_log('Aurora foreign key setup failed for '.$table.': '.$this->db->error);
                jsonResponse(array('success'=>false, 'message'=>'Không thể thiết lập ràng buộc dữ liệu lịch chiếu trong aurora_db.'), 500);
            }
        }

        $eventTables = array(
            'customer_schedule_events' => 'fk_customer_schedule_events_showtime',
            'customer_theater_schedule_events' => 'fk_customer_theater_schedule_events_showtime',
            'customer_theater_detail_events' => 'fk_customer_theater_detail_events_showtime'
        );
        foreach ($eventTables as $table => $constraint) {
            if (!$this->tableExists($table)) continue;
            if (!$this->db->query("UPDATE `{$table}` event_row LEFT JOIN showtimes s ON s.id=event_row.showtime_id SET event_row.showtime_id=NULL WHERE event_row.showtime_id IS NOT NULL AND s.id IS NULL")) {
                error_log('Aurora event cleanup failed for '.$table.': '.$this->db->error);
                jsonResponse(array('success'=>false, 'message'=>'Không thể chuẩn bị dữ liệu theo dõi lịch chiếu trong aurora_db.'), 500);
            }
            if (!$this->ensureShowtimeForeignKey($table, $constraint, 'SET NULL')) {
                error_log('Aurora event foreign key setup failed for '.$table.': '.$this->db->error);
                jsonResponse(array('success'=>false, 'message'=>'Không thể thiết lập ràng buộc dữ liệu theo dõi lịch chiếu trong aurora_db.'), 500);
            }
        }
    }

    private function ensureShowtimeForeignKey($table, $constraint, $deleteRule)
    {
        if (!preg_match('/^[A-Za-z0-9_]+$/', $table) || !preg_match('/^[A-Za-z0-9_]+$/', $constraint)) return false;
        $rule = strtoupper($deleteRule) === 'SET NULL' ? 'SET NULL' : 'CASCADE';
        $tableEsc = $this->db->real_escape_string($table);
        $existing = $this->db->query("SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='{$tableEsc}' AND COLUMN_NAME='showtime_id' AND REFERENCED_TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME='showtimes' LIMIT 1");
        if (!$existing) return false;
        if ($existing->num_rows > 0) return true;
        return (bool)$this->db->query("ALTER TABLE `{$table}` ADD CONSTRAINT `{$constraint}` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`) ON DELETE {$rule}");
    }

    private function row($sql)
    {
        $result = $this->db->query($sql);
        return $result ? $result->fetch_assoc() : null;
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
