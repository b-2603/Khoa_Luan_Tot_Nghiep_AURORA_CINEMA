<?php

class AdminController
{
    private $db;
    private $resources = array(
        'movies' => array('table' => 'tms_movies', 'search' => array('title', 'format'), 'fields' => array('title', 'duration_minutes', 'age_rating', 'format', 'status')),
        'screens' => array('table' => 'tms_screens', 'search' => array('screen_code', 'name'), 'fields' => array('screen_code', 'name', 'screen_type', 'total_seats', 'projector_status', 'sound_system_status', 'hvac_temperature', 'lamp_hours', 'status')),
        'schedules' => array('table' => 'tms_schedules', 'search' => array(), 'fields' => array('screen_id', 'movie_id', 'start_time', 'end_time', 'show_date', 'booked_seats', 'total_seats', 'status')),
        'staff' => array('table' => 'tms_staff_shifts', 'search' => array('staff_name', 'position'), 'fields' => array('staff_name', 'position', 'shift_name', 'start_time', 'end_time', 'status', 'work_date')),
        'ticket-types' => array('table' => 'tms_ticket_types', 'search' => array('name', 'code'), 'fields' => array('name', 'code', 'price', 'description', 'status')),
        'products' => array('table' => 'tms_products', 'search' => array('name', 'sku'), 'fields' => array('name', 'sku', 'category', 'price', 'stock_quantity', 'status')),
        'vouchers' => array('table' => 'tms_vouchers', 'search' => array('name', 'code'), 'fields' => array('code', 'name', 'discount_type', 'discount_value', 'starts_at', 'ends_at', 'usage_limit', 'status')),
        'customers' => array('table' => 'tms_customers', 'search' => array('full_name', 'phone', 'email'), 'fields' => array('full_name', 'phone', 'email', 'membership_level', 'points')),
        'theaters' => array('table' => 'theaters', 'search' => array('name', 'city'), 'fields' => array('name', 'address', 'city', 'phone', 'total_screens', 'status')),
        'promotions' => array('table' => 'promotions', 'search' => array('title', 'code'), 'fields' => array('title', 'code', 'discount_percent', 'start_date', 'end_date', 'status')),
        'pos-devices' => array('table' => 'tms_pos_devices', 'search' => array('device_code', 'name'), 'fields' => array('device_code', 'name', 'screen_name', 'ip_address', 'mac_address', 'status', 'approved_by')),
        'pricing-policies' => array('table' => 'tms_pricing_policies', 'search' => array('ticket_type'), 'fields' => array('ticket_type', 'base_price', 'weekend_surcharge', 'holiday_surcharge', 'imax_surcharge', 'status', 'updated_by')),
        'audit-logs' => array('table' => 'tms_audit_logs', 'search' => array('username', 'action'), 'fields' => array('username', 'action', 'details', 'ip_address')),
        'system-configs' => array('table' => 'tms_system_configs', 'search' => array('config_key'), 'fields' => array('config_key', 'config_value', 'description')),
        'movie-plans' => array('table' => 'tms_movie_plans', 'search' => array('plan_name', 'movie_title'), 'fields' => array('plan_name', 'plan_month', 'plan_year', 'movie_id', 'movie_title', 'format', 'expected_start_date', 'expected_end_date', 'target_revenue', 'target_screenings_per_day', 'priority_level', 'status', 'note', 'created_by')),
        'movie-allocations' => array('table' => 'tms_movie_allocations', 'search' => array('movie_title', 'theater_name'), 'fields' => array('plan_id', 'movie_id', 'movie_title', 'theater_id', 'theater_name', 'min_screenings_per_day', 'preferred_screen_types', 'allocated_start_date', 'allocated_end_date', 'status', 'confirmed_by', 'confirmed_at', 'note')),
        'tms-transactions' => array('table' => 'tms_transactions', 'search' => array('transaction_code', 'payment_method'), 'fields' => array('transaction_code', 'customer_id', 'channel', 'amount', 'payment_method', 'status', 'cancel_requested')),
    );

    public function __construct($db)
    {
        $this->db = $db;
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

    public function dashboard()
    {
        $role = $this->getCurrentRole();
        $today = $this->db->query("SELECT * FROM tms_revenue_logs WHERE log_date = CURDATE() ORDER BY id DESC LIMIT 1");
        $revenue = $today ? $today->fetch_assoc() : null;
        $revenue = $revenue ? $revenue : array('total_revenue' => 0, 'ticket_sales' => 0, 'concession_sales' => 0, 'total_tickets' => 0, 'occupancy_rate' => 0);

        $roleDefs = self::getRoleDefinitions();
        $roleDef = isset($roleDefs[$role]) ? $roleDefs[$role] : null;

        $data = array(
            'date' => date('Y-m-d'),
            'role' => $role,
            'role_definition' => $roleDef,
            'revenue' => $this->numberFields($revenue, array('total_revenue', 'ticket_sales', 'concession_sales', 'occupancy_rate')),
            'active_screens' => $this->scalar("SELECT COUNT(*) FROM tms_screens WHERE status = 'active'"),
            'showtimes' => $this->scalar("SELECT COUNT(*) FROM tms_schedules WHERE show_date = CURDATE() AND status <> 'cancelled'"),
            'booked_seats' => $this->scalar("SELECT COALESCE(SUM(booked_seats), 0) FROM tms_schedules WHERE show_date = CURDATE()"),
            'staff_on_duty' => $this->scalar("SELECT COUNT(*) FROM tms_staff_shifts WHERE work_date = CURDATE() AND status IN ('on_duty','checked_in')"),
            'pending_refunds' => $this->scalar("SELECT COUNT(*) FROM tms_refunds WHERE status = 'pending'"),
            'revenue_7_days' => $this->rows("SELECT log_date date, ticket_sales, concession_sales, total_revenue, total_tickets, occupancy_rate FROM tms_revenue_logs WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ORDER BY log_date"),
            'top_movies' => $this->rows("SELECT m.id, m.title, COALESCE(SUM(s.booked_seats), 0) booked_seats, COUNT(s.id) showtimes FROM tms_movies m LEFT JOIN tms_schedules s ON s.movie_id = m.id GROUP BY m.id, m.title ORDER BY booked_seats DESC LIMIT 5"),
            'recent_transactions' => $this->rows("SELECT t.*, c.full_name customer_name FROM tms_transactions t LEFT JOIN tms_customers c ON c.id=t.customer_id ORDER BY t.id DESC LIMIT 5"),
            'screens_status' => $this->rows("SELECT id, screen_code, name, screen_type, projector_status, sound_system_status, hvac_temperature, lamp_hours, status FROM tms_screens ORDER BY screen_code"),
        );
        jsonResponse(array('success' => true, 'data' => $data));
    }

    public function listResource($resource)
    {
        if (!isset($this->resources[$resource])) {
            jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404);
        }
        if ($resource === 'movies') {
            $this->ensureMovieCatalogSchema();
            $this->listMovies();
        }
        $cfg = $this->resources[$resource];
        $where = array('1=1');

        if (!empty($_GET['q']) && !empty($cfg['search'])) {
            $qEsc = $this->db->real_escape_string($_GET['q']);
            $parts = array();
            foreach ($cfg['search'] as $field) {
                $parts[] = "`{$field}` LIKE '%{$qEsc}%'";
            }
            $where[] = '(' . implode(' OR ', $parts) . ')';
        }
        if (!empty($_GET['status'])) {
            $where[] = "`status` = '" . $this->db->real_escape_string($_GET['status']) . "'";
        }
        if ($resource === 'schedules' && !empty($_GET['date'])) {
            $where[] = "`show_date` = '" . $this->db->real_escape_string($_GET['date']) . "'";
        }
        if ($resource === 'movie-plans') {
            if (!empty($_GET['month'])) {
                $where[] = "`plan_month` = " . (int)$_GET['month'];
            }
            if (!empty($_GET['year'])) {
                $where[] = "`plan_year` = " . (int)$_GET['year'];
            }
            $sql = "SELECT * FROM tms_movie_plans WHERE " . implode(' AND ', $where) . " ORDER BY plan_month ASC, expected_start_date ASC, id DESC";
            $plans = $this->rows($sql);
            $totalTheaters = $this->scalar("SELECT COUNT(*) FROM theaters");
            if (!$totalTheaters) $totalTheaters = 5;
            foreach ($plans as &$p) {
                $pId = (int)$p['id'];
                $mId = (int)$p['movie_id'];
                $allocations = $this->rows("SELECT * FROM tms_movie_allocations WHERE plan_id = {$pId} OR (plan_id = 0 AND movie_id = {$mId}) ORDER BY theater_id ASC");
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
            if (!empty($_GET['plan_id'])) {
                $where[] = "`plan_id` = " . (int)$_GET['plan_id'];
            }
            if (!empty($_GET['movie_id'])) {
                $where[] = "`movie_id` = " . (int)$_GET['movie_id'];
            }
            if (!empty($_GET['theater_id'])) {
                $where[] = "`theater_id` = " . (int)$_GET['theater_id'];
            }
            $sql = "SELECT * FROM tms_movie_allocations WHERE " . implode(' AND ', $where) . " ORDER BY id DESC";
            $rows = $this->rows($sql);
            jsonResponse(array('success' => true, 'data' => $rows));
        }

        $select = '*';
        if ($resource === 'schedules') {
            $select = 's.*, m.title movie_title, sc.name screen_name';
        }
        $sql = "SELECT {$select} FROM {$cfg['table']}" . ($resource === 'schedules' ? ' s JOIN tms_movies m ON m.id=s.movie_id JOIN tms_screens sc ON sc.id=s.screen_id' : '') . ' WHERE ' . implode(' AND ', $where) . ($resource === 'schedules' ? ' ORDER BY s.id DESC' : ' ORDER BY id DESC');
        $rows = $this->rows($sql);
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function save($resource)
    {
        if (!isset($this->resources[$resource])) {
            jsonResponse(array('success' => false, 'message' => 'Resource không tồn tại.'), 404);
        }
        if ($resource === 'movies') {
            $this->saveMovie();
        }
        requireAdmin();
        $role = $this->getCurrentRole();
        $input = requestJson();
        $cfg = $this->resources[$resource];
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);

        // Kiểm tra phân quyền thực hiện theo từng vai trò
        if ($resource === 'ticket-types' && !in_array($role, array('super_admin', 'accounting'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Kế Toán mới có quyền chỉnh sửa bảng giá vé.'), 403);
        }
        if ($resource === 'movies' && !in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền chỉnh sửa danh mục phim.'), 403);
        }
        if ($resource === 'schedules') {
            if ($role === 'supervisor') {
                // Supervisor chỉ được phép cập nhật trạng thái suất chiếu
                if (isset($input['status']) && count($input) <= 2) {
                    $this->execute("UPDATE tms_schedules SET status = ? WHERE id = ?", 'si', array($input['status'], $id));
                    jsonResponse(array('success' => true, 'message' => 'Đã cập nhật trạng thái suất chiếu.'));
                }
                jsonResponse(array('success' => false, 'message' => 'Giám sát ca chỉ được phép cập nhật trạng thái vận hành của suất chiếu.'), 403);
            } elseif (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền quản lý suất chiếu.'), 403);
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
                    $this->execute("UPDATE tms_screens SET " . implode(',', $sets) . " WHERE id = ?", $types, $params);
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
        if ($resource === 'movie-allocations' && isset($input['status']) && $input['status'] === 'confirmed') {
            $approver = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Admin Rạp';
            $input['confirmed_by'] = $approver;
            $input['confirmed_at'] = date('Y-m-d H:i:s');
        }

        $values = array();
        foreach ($cfg['fields'] as $field) {
            if (array_key_exists($field, $input)) {
                $values[$field] = $input[$field];
            }
        }
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

        // Tự động phân bổ cho các rạp được chọn (nếu có)
        if ($resource === 'movie-plans' && !empty($input['theaters']) && is_array($input['theaters'])) {
            $planRes = $this->rows("SELECT * FROM tms_movie_plans WHERE id = " . $id);
            if (!empty($planRes[0])) {
                $plan = $planRes[0];
                foreach ($input['theaters'] as $tId) {
                    $tId = (int)$tId;
                    if ($tId <= 0) continue;
                    $tRow = $this->rows("SELECT name FROM theaters WHERE id = " . $tId);
                    $tName = !empty($tRow[0]['name']) ? $tRow[0]['name'] : 'Rạp #' . $tId;
                    $exists = $this->rows("SELECT id FROM tms_movie_allocations WHERE plan_id = {$id} AND theater_id = {$tId}");
                    if (empty($exists)) {
                        $minScreen = !empty($input['min_screenings_per_day']) ? (int)$input['min_screenings_per_day'] : (int)$plan['target_screenings_per_day'];
                        $mTitleEsc = $this->db->real_escape_string($plan['movie_title']);
                        $tNameEsc = $this->db->real_escape_string($tName);
                        $this->db->query("INSERT INTO tms_movie_allocations (`plan_id`, `movie_id`, `movie_title`, `theater_id`, `theater_name`, `min_screenings_per_day`, `preferred_screen_types`, `allocated_start_date`, `allocated_end_date`, `status`) VALUES ({$id}, {$plan['movie_id']}, '{$mTitleEsc}', {$tId}, '{$tNameEsc}', {$minScreen}, 'Standard / IMAX', '{$plan['expected_start_date']}', '{$plan['expected_end_date']}', 'pending')");
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

        $masterColumns = array(
            'movie_code' => 'VARCHAR(50) NULL', 'original_title' => 'VARCHAR(180) NULL',
            'director' => 'VARCHAR(180) NULL', 'cast' => 'TEXT NULL', 'writer' => 'VARCHAR(180) NULL',
            'producer' => 'VARCHAR(180) NULL', 'production_country' => 'VARCHAR(100) NULL',
            'production_year' => 'SMALLINT UNSIGNED NULL', 'plot_details' => 'MEDIUMTEXT NULL',
            'original_language' => 'VARCHAR(80) NULL', 'localization_versions' => 'VARCHAR(255) NULL',
            'expected_end_date' => 'DATE NULL', 'distributor' => 'VARCHAR(180) NULL', 'banner_url' => 'VARCHAR(500) NULL'
        );
        $columnResult = $this->db->query('SHOW COLUMNS FROM movies');
        if (!$columnResult) {
            jsonResponse(array('success' => false, 'message' => 'Không thể đọc cấu trúc movies: ' . $this->db->error), 500);
        }
        $existingColumns = array();
        while ($column = $columnResult->fetch_assoc()) $existingColumns[$column['Field']] = true;
        foreach ($masterColumns as $column => $definition) {
            if (!isset($existingColumns[$column]) && !$this->db->query("ALTER TABLE movies ADD COLUMN `{$column}` {$definition}")) {
                jsonResponse(array('success' => false, 'message' => 'Không thể nâng cấp movies: ' . $this->db->error), 500);
            }
        }

        $formatResult = $this->db->query("SHOW COLUMNS FROM movies LIKE 'format'");
        if ($formatResult && ($format = $formatResult->fetch_assoc()) && preg_match('/varchar\((\d+)\)/i', $format['Type'], $match) && (int)$match[1] < 100) {
            if (!$this->db->query("ALTER TABLE movies MODIFY format VARCHAR(100) NOT NULL DEFAULT '2D Digital'")) {
                jsonResponse(array('success' => false, 'message' => 'Không thể mở rộng định dạng movies: ' . $this->db->error), 500);
            }
        }

        $codeIndex = $this->db->query("SHOW INDEX FROM movies WHERE Column_name = 'movie_code'");
        if ($codeIndex && !$codeIndex->num_rows && !$this->db->query('ALTER TABLE movies ADD UNIQUE KEY uq_movies_movie_code (movie_code)')) {
            jsonResponse(array('success' => false, 'message' => 'Không thể tạo chỉ mục mã phim: ' . $this->db->error), 500);
        }

        $tmsResult = $this->db->query('SHOW COLUMNS FROM tms_movies');
        if (!$tmsResult) {
            jsonResponse(array('success' => false, 'message' => 'Không tìm thấy bảng tms_movies trong aurora_db: ' . $this->db->error), 500);
        }
        $tmsColumns = array();
        while ($column = $tmsResult->fetch_assoc()) $tmsColumns[$column['Field']] = $column;
        if (!$this->db->query('CREATE TABLE IF NOT EXISTS tms_movie_catalog_links (tms_movie_id BIGINT UNSIGNED NOT NULL PRIMARY KEY, catalog_movie_id BIGINT UNSIGNED NOT NULL UNIQUE, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_tms_movie_catalog_tms FOREIGN KEY (tms_movie_id) REFERENCES tms_movies(id) ON DELETE CASCADE, CONSTRAINT fk_tms_movie_catalog_master FOREIGN KEY (catalog_movie_id) REFERENCES movies(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci')) {
            jsonResponse(array('success' => false, 'message' => 'Không thể tạo liên kết catalog phim: ' . $this->db->error), 500);
        }
        if (isset($tmsColumns['format']) && preg_match('/varchar\((\d+)\)/i', $tmsColumns['format']['Type'], $match) && (int)$match[1] < 100) {
            if (!$this->db->query("ALTER TABLE tms_movies MODIFY format VARCHAR(100) NOT NULL DEFAULT '2D Digital / 3D'")) {
                jsonResponse(array('success' => false, 'message' => 'Không thể mở rộng định dạng TMS: ' . $this->db->error), 500);
            }
        }
        if (isset($tmsColumns['status']) && stripos($tmsColumns['status']['Type'], 'enum(') === 0) {
            if (!$this->db->query("ALTER TABLE tms_movies MODIFY status VARCHAR(40) NOT NULL DEFAULT 'now_showing'")) {
                jsonResponse(array('success' => false, 'message' => 'Không thể mở rộng trạng thái TMS: ' . $this->db->error), 500);
            }
        }
    }

    private function listMovies()
    {
        $where = array('1=1');
        if (!empty($_GET['q'])) {
            $query = $this->db->real_escape_string($_GET['q']);
            $where[] = "(tm.title LIKE '%{$query}%' OR tm.format LIKE '%{$query}%' OR m.movie_code LIKE '%{$query}%')";
        }
        if (!empty($_GET['status'])) {
            $status = $this->db->real_escape_string(strtolower($_GET['status']));
            $where[] = "tm.status = '{$status}'";
        }
        $sql = "SELECT tm.id, l.catalog_movie_id, COALESCE(m.movie_code, '') movie_code,
            COALESCE(m.title, tm.title) title, COALESCE(m.original_title, '') original_title,
            COALESCE(m.genre, '') genre, tm.duration_minutes, tm.age_rating,
            COALESCE(m.director, '') director, COALESCE(m.`cast`, '') `cast`,
            COALESCE(m.writer, '') writer, COALESCE(m.producer, '') producer,
            COALESCE(m.production_country, '') production_country, m.production_year,
            COALESCE(m.description, '') description, COALESCE(m.plot_details, '') plot_details,
            COALESCE(m.original_language, '') original_language, COALESCE(m.localization_versions, '') localization_versions,
            COALESCE(m.format, tm.format) format, COALESCE(m.release_date, '') release_date,
            COALESCE(m.expected_end_date, '') expected_end_date, COALESCE(m.distributor, '') distributor,
            COALESCE(m.poster_url, '') poster_url, COALESCE(m.banner_url, '') banner_url,
            COALESCE(m.trailer_url, '') trailer_url, LOWER(COALESCE(m.status, tm.status)) status
            FROM tms_movies tm LEFT JOIN tms_movie_catalog_links l ON l.tms_movie_id = tm.id LEFT JOIN movies m ON m.id = l.catalog_movie_id
            WHERE " . implode(' AND ', $where) . ' ORDER BY tm.id DESC';
        jsonResponse(array('success' => true, 'data' => $this->rows($sql)));
    }

    private function saveMovie()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền chỉnh sửa danh mục phim.'), 403);
        }
        $this->ensureMovieCatalogSchema();
        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        $fields = array(
            'movie_code', 'title', 'original_title', 'genre', 'age_rating', 'director', 'cast', 'writer',
            'producer', 'production_country', 'description', 'plot_details', 'original_language',
            'localization_versions', 'format', 'release_date', 'expected_end_date', 'distributor',
            'poster_url', 'banner_url', 'trailer_url'
        );
        $movie = array();
        foreach ($fields as $field) $movie[$field] = isset($input[$field]) ? trim((string)$input[$field]) : '';
        foreach (array('movie_code', 'title', 'genre', 'age_rating', 'director', 'cast', 'production_country', 'description', 'original_language', 'format', 'release_date', 'poster_url') as $required) {
            if ($movie[$required] === '') jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập đầy đủ các trường bắt buộc.'), 400);
        }
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/', $movie['movie_code'])) {
            jsonResponse(array('success' => false, 'message' => 'Mã phim chỉ được gồm chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.'), 400);
        }
        $duration = isset($input['duration_minutes']) ? filter_var($input['duration_minutes'], FILTER_VALIDATE_INT) : false;
        if ($duration === false || $duration < 1 || $duration > 600) jsonResponse(array('success' => false, 'message' => 'Thời lượng phim phải từ 1 đến 600 phút.'), 400);
        $year = isset($input['production_year']) && $input['production_year'] !== '' ? filter_var($input['production_year'], FILTER_VALIDATE_INT) : null;
        if ($year === false || ($year !== null && ($year < 1888 || $year > 2100))) jsonResponse(array('success' => false, 'message' => 'Năm sản xuất không hợp lệ.'), 400);
        $movie['duration_minutes'] = $duration;
        $movie['production_year'] = $year;

        foreach (array('release_date' => true, 'expected_end_date' => false) as $field => $required) {
            if ($movie[$field] === '' && !$required) { $movie[$field] = null; continue; }
            if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $movie[$field], $parts) || !checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1])) {
                jsonResponse(array('success' => false, 'message' => 'Ngày khởi chiếu hoặc ngày kết thúc không hợp lệ.'), 400);
            }
        }
        if ($movie['expected_end_date'] !== null && $movie['expected_end_date'] < $movie['release_date']) jsonResponse(array('success' => false, 'message' => 'Ngày kết thúc phải bằng hoặc sau ngày khởi chiếu.'), 400);
        if (!$this->isMovieMediaReference($movie['poster_url'], 'poster')) jsonResponse(array('success' => false, 'message' => 'Poster tải lên không hợp lệ.'), 400);
        foreach (array('banner_url' => 'banner', 'trailer_url' => 'trailer') as $urlField => $kind) {
            if ($movie[$urlField] !== '' && !$this->isMovieMediaReference($movie[$urlField], $kind)) jsonResponse(array('success' => false, 'message' => 'Tệp banner hoặc trailer không hợp lệ.'), 400);
            if ($movie[$urlField] === '') $movie[$urlField] = null;
        }
        if (!in_array($movie['age_rating'], array('P', 'K', 'T13', 'T16', 'T18'), true)) jsonResponse(array('success' => false, 'message' => 'Độ tuổi không hợp lệ.'), 400);
        $status = isset($input['status']) ? strtolower(trim((string)$input['status'])) : '';
        if (!in_array($status, array('now_showing', 'coming_soon', 'special_showing', 'ended'), true)) jsonResponse(array('success' => false, 'message' => 'Trạng thái phim không hợp lệ.'), 400);
        $movie['status'] = strtoupper($status);

        $this->db->begin_transaction();
        $catalogId = 0;
        if ($id > 0) {
            $existing = $this->rows('SELECT l.catalog_movie_id FROM tms_movies tm LEFT JOIN tms_movie_catalog_links l ON l.tms_movie_id = tm.id WHERE tm.id = ' . $id . ' FOR UPDATE');
            if (!$existing) { $this->db->rollback(); jsonResponse(array('success' => false, 'message' => 'Không tìm thấy phim cần cập nhật.'), 404); }
            $catalogId = (int)$existing[0]['catalog_movie_id'];
        }

        $masterFields = array(
            'movie_code', 'title', 'original_title', 'genre', 'duration_minutes', 'age_rating', 'director', 'cast',
            'writer', 'producer', 'production_country', 'production_year', 'description', 'plot_details',
            'original_language', 'localization_versions', 'format', 'release_date', 'expected_end_date',
            'distributor', 'poster_url', 'banner_url', 'trailer_url', 'status'
        );
        $values = array();
        $types = '';
        foreach ($masterFields as $field) {
            $values[] = isset($movie[$field]) ? $movie[$field] : null;
            $types .= in_array($field, array('duration_minutes', 'production_year'), true) ? 'i' : 's';
        }
        if ($catalogId > 0) {
            $sets = array();
            foreach ($masterFields as $field) $sets[] = "`{$field}` = ?";
            $values[] = $catalogId;
            $this->executeMovieStatement('UPDATE movies SET ' . implode(', ', $sets) . ' WHERE id = ?', $types . 'i', $values);
        } else {
            $columns = array();
            foreach ($masterFields as $field) $columns[] = '`' . $field . '`';
            $this->executeMovieStatement('INSERT INTO movies (' . implode(', ', $columns) . ') VALUES (' . implode(', ', array_fill(0, count($masterFields), '?')) . ')', $types, $values);
            $catalogId = (int)$this->db->insert_id;
        }
        if ($id > 0) {
            $this->executeMovieStatement('UPDATE tms_movies SET title = ?, duration_minutes = ?, age_rating = ?, format = ?, status = ? WHERE id = ?', 'sisssi', array($movie['title'], $duration, $movie['age_rating'], $movie['format'], $status, $id));
            $this->executeMovieStatement('INSERT INTO tms_movie_catalog_links (tms_movie_id, catalog_movie_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE catalog_movie_id = VALUES(catalog_movie_id)', 'ii', array($id, $catalogId));
            $message = 'Cập nhật thông tin phim thành công.';
        } else {
            $this->executeMovieStatement('INSERT INTO tms_movies (title, duration_minutes, age_rating, format, status) VALUES (?, ?, ?, ?, ?)', 'sisss', array($movie['title'], $duration, $movie['age_rating'], $movie['format'], $status));
            $id = (int)$this->db->insert_id;
            $this->executeMovieStatement('INSERT INTO tms_movie_catalog_links (tms_movie_id, catalog_movie_id) VALUES (?, ?)', 'ii', array($id, $catalogId));
            $message = 'Đã lưu đầy đủ thông tin phim vào aurora_db.';
        }
        $this->db->commit();
        jsonResponse(array('success' => true, 'message' => $message, 'data' => array('id' => $id, 'catalog_movie_id' => $catalogId)), 200);
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
            $this->db->rollback();
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

        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if (!$id) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu id.'), 400);
        }
        if ($resource === 'movies') {
            $this->ensureMovieCatalogSchema();
            $linked = $this->rows('SELECT catalog_movie_id FROM tms_movie_catalog_links WHERE tms_movie_id = ' . $id);
            if (!empty($linked[0]['catalog_movie_id'])) {
                $catalogId = (int)$linked[0]['catalog_movie_id'];
                $showtimesTable = $this->db->query("SHOW TABLES LIKE 'showtimes'");
                $hasCustomerShowtimes = $showtimesTable && $showtimesTable->num_rows && $this->scalar('SELECT COUNT(*) FROM showtimes WHERE movie_id = ' . $catalogId) > 0;
                if ($this->scalar('SELECT COUNT(*) FROM tms_schedules WHERE movie_id = ' . $id) > 0 || $hasCustomerShowtimes) {
                    jsonResponse(array('success' => false, 'message' => 'Không thể xóa phim đã có lịch chiếu hoặc suất chiếu được mở bán.'), 400);
                }
                $this->db->begin_transaction();
                if (!$this->db->query('DELETE FROM tms_movies WHERE id = ' . $id) || !$this->db->query('DELETE FROM movies WHERE id = ' . $catalogId)) {
                    $error = $this->db->error;
                    $this->db->rollback();
                    jsonResponse(array('success' => false, 'message' => $error), 500);
                }
                $this->db->commit();
                jsonResponse(array('success' => true, 'message' => 'Đã xóa phim khỏi kho hệ thống.'));
            }
        }
        if ($resource === 'movie-plans') {
            $this->db->query("DELETE FROM tms_movie_allocations WHERE plan_id = " . $id);
        }
        $this->db->query("DELETE FROM {$this->resources[$resource]['table']} WHERE id = " . $id);
        jsonResponse(array('success' => true, 'message' => 'Đã xóa dữ liệu thành công.'));
    }

    // ========================================================
    // QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG TMS & PHÂN QUYỀN (RBAC)
    // ========================================================

    public function listUsers()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        if (!in_array($role, array('super_admin', 'cinema_admin'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Chỉ Admin Tổng hoặc Admin Rạp mới có quyền xem danh sách nhân sự TMS.'), 403);
        }

        $users = $this->rows("SELECT id, username, full_name, phone, role, status, last_login, created_at FROM tms_users ORDER BY id ASC");
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
            'roles' => array_values($rolesDef),
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
        $userRole = isset($input['role']) ? self::normalizeRole($input['role']) : 'cinema_admin';
        $status = isset($input['status']) && in_array($input['status'], array('active', 'inactive', 'locked'), true) ? $input['status'] : 'active';
        $password = isset($input['password']) ? trim((string)$input['password']) : '';

        if (!$id && ($username === '' || $fullName === '')) {
            jsonResponse(array('success' => false, 'message' => 'Vui lòng nhập tên đăng nhập và họ tên người dùng.'), 400);
        }

        $fnEsc = $this->db->real_escape_string($fullName);
        $phEsc = $this->db->real_escape_string($phone);
        $rlEsc = $this->db->real_escape_string($userRole);
        $stEsc = $this->db->real_escape_string($status);

        if ($id > 0) {
            if ($password !== '') {
                $hash = function_exists('password_hash') ? password_hash($password, PASSWORD_BCRYPT) : crypt($password);
                $hashEsc = $this->db->real_escape_string($hash);
                $this->db->query("UPDATE tms_users SET full_name = '{$fnEsc}', phone = '{$phEsc}', role = '{$rlEsc}', status = '{$stEsc}', password_hash = '{$hashEsc}' WHERE id = " . $id);
            } else {
                $this->db->query("UPDATE tms_users SET full_name = '{$fnEsc}', phone = '{$phEsc}', role = '{$rlEsc}', status = '{$stEsc}' WHERE id = " . $id);
            }
            jsonResponse(array('success' => true, 'message' => 'Cập nhật thông tin và phân quyền người dùng thành công.'));
        } else {
            // Check username unique
            $uEsc = $this->db->real_escape_string($username);
            $check = $this->rows("SELECT id FROM tms_users WHERE username = '{$uEsc}'");
            if ($check) {
                jsonResponse(array('success' => false, 'message' => 'Tên đăng nhập đã tồn tại trong hệ thống.'), 400);
            }
            $pwdToUse = $password !== '' ? $password : '8888';
            $hash = function_exists('password_hash') ? password_hash($pwdToUse, PASSWORD_BCRYPT) : crypt($pwdToUse);
            $hashEsc = $this->db->real_escape_string($hash);
            $this->db->query("INSERT INTO tms_users (username, password_hash, full_name, phone, role, status) VALUES ('{$uEsc}', '{$hashEsc}', '{$fnEsc}', '{$phEsc}', '{$rlEsc}', '{$stEsc}')");
            jsonResponse(array('success' => true, 'message' => 'Tạo tài khoản người dùng và gán quyền thành công.', 'data' => array('id' => $this->db->insert_id)), 201);
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
        $this->db->query("DELETE FROM tms_users WHERE id = " . $id);
        jsonResponse(array('success' => true, 'message' => 'Đã xóa tài khoản người dùng khỏi hệ thống.'));
    }

    // ========================================================
    // GIAO DỊCH & HOÀN TIỀN (TRANSACTIONS & REFUNDS)
    // ========================================================

    public function transactions()
    {
        $rows = $this->rows("SELECT t.*, c.full_name customer_name, c.phone customer_phone FROM tms_transactions t LEFT JOIN tms_customers c ON c.id=t.customer_id ORDER BY t.id DESC LIMIT 100");
        // Nếu bảng tms_transactions chưa có dữ liệu, thử từ tms_orders (fallback)
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
        $exist = $this->rows("SELECT id FROM tms_transactions WHERE transaction_code = '{$codeEsc}'");
        if ($exist) {
            $code = $code . '-' . rand(100, 999);
            $codeEsc = $this->db->real_escape_string($code);
        }
        $custVal = $customer ? $customer : 'NULL';
        $channelEsc = $this->db->real_escape_string($channel);
        $methodEsc = $this->db->real_escape_string($method);
        $this->db->query("INSERT INTO tms_transactions (transaction_code, customer_id, channel, amount, payment_method, status, cancel_requested) VALUES ('{$codeEsc}', {$custVal}, '{$channelEsc}', {$amount}, '{$methodEsc}', 'paid', 0)");
        if ($this->db->error) {
            jsonResponse(array('success' => false, 'message' => 'Lỗi tạo giao dịch: ' . $this->db->error), 500);
        }
        // Ghi audit log
        $userInfo = isset($_SESSION['tms_user']) ? $_SESSION['tms_user'] : array('username' => 'system', 'role' => 'system');
        $uname = isset($userInfo['username']) ? $this->db->real_escape_string($userInfo['username']) : 'system';
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
        $ipEsc = $this->db->real_escape_string($ip);
        $this->db->query("INSERT INTO tms_audit_logs (username, action, details, ip_address) VALUES ('{$uname}', 'CREATE_TRANSACTION', 'Tạo giao dịch {$codeEsc} - {$amount} VND', '{$ipEsc}')");
        jsonResponse(array('success' => true, 'message' => 'Đã tạo giao dịch.', 'data' => array('id' => $this->db->insert_id, 'transaction_code' => $code)), 201);
    }

    public function refunds()
    {
        $rows = $this->rows("SELECT * FROM tms_refunds ORDER BY id DESC LIMIT 100");
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function updateRefund()
    {
        requireAdmin();
        $role = $this->getCurrentRole();
        $input = requestJson();
        $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($input['id']) ? (int)$input['id'] : 0);
        $status = isset($input['status']) ? $input['status'] : '';

        // Tạo yêu cầu hoàn vé mới
        if ($id <= 0) {
            $txnCode = isset($input['transaction_code']) ? trim($input['transaction_code']) : ('TXN-' . time());
            $custName = isset($input['customer_name']) ? trim($input['customer_name']) : 'Khách vãng lai';
            $custPhone = isset($input['customer_phone']) ? trim($input['customer_phone']) : '';
            $amount = isset($input['amount']) ? (float)$input['amount'] : 0.00;
            $reason = isset($input['reason']) ? trim($input['reason']) : 'Yêu cầu hoàn trả vé';
            $paymentMethod = isset($input['payment_method']) ? trim($input['payment_method']) : 'cash';
            $requestedBy = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Nhân sự TMS';

            $stmt = $this->db->prepare("INSERT INTO tms_refunds (transaction_code, customer_name, customer_phone, amount, reason, payment_method, status, requested_by, requested_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())");
            if ($stmt) {
                $stmt->bind_param('sssdsds', $txnCode, $custName, $custPhone, $amount, $reason, $paymentMethod, $requestedBy);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $stmt->close();
                jsonResponse(array('success' => true, 'message' => 'Đã tạo yêu cầu hoàn vé thành công.', 'id' => $newId));
            } else {
                jsonResponse(array('success' => false, 'message' => 'Lỗi tạo yêu cầu hoàn vé: ' . $this->db->error), 500);
            }
        }

        // Quyền phê duyệt duyệt (approved, rejected, completed) dành cho: supervisor, cinema_admin, super_admin
        if (in_array($status, array('approved', 'rejected', 'completed'), true)) {
            if (!in_array($role, array('super_admin', 'supervisor', 'cinema_admin'), true)) {
                jsonResponse(array('success' => false, 'message' => 'Chỉ Giám sát ca hoặc Ban quản lý rạp mới có quyền phê duyệt hoàn vé.'), 403);
            }
        }

        if (!$id || !in_array($status, array('approved', 'rejected', 'completed', 'pending'), true)) {
            jsonResponse(array('success' => false, 'message' => 'Dữ liệu hoàn tiền không hợp lệ.'), 400);
        }

        $approver = !empty($_SESSION['tms_user']['full_name']) ? $_SESSION['tms_user']['full_name'] : 'Quản trị viên';
        $this->execute("UPDATE tms_refunds SET status=?, approved_by=?, processed_at=NOW() WHERE id=?", 'ssi', array($status, $approver, $id));
        jsonResponse(array('success' => true, 'message' => 'Đã cập nhật yêu cầu hoàn tiền thành công.'));
    }

    public function seats()
    {
        $screen = isset($_GET['screen_id']) ? (int)$_GET['screen_id'] : 0;
        if (!$screen) {
            jsonResponse(array('success' => false, 'message' => 'Thiếu screen_id.'), 400);
        }
        $rows = $this->rows('SELECT * FROM tms_seats WHERE screen_id=' . $screen . ' ORDER BY seat_code');
        jsonResponse(array('success' => true, 'data' => $rows));
    }

    public function report()
    {
        $role = $this->getCurrentRole();
        $from = isset($_GET['from']) ? $_GET['from'] : date('Y-m-d', strtotime('-6 days'));
        $to = isset($_GET['to']) ? $_GET['to'] : date('Y-m-d');
        $from = $this->db->real_escape_string($from);
        $to = $this->db->real_escape_string($to);

        $daily = $this->rows("SELECT * FROM tms_revenue_logs WHERE log_date BETWEEN '{$from}' AND '{$to}' ORDER BY log_date");
        $summary = $this->rows("SELECT COALESCE(SUM(total_revenue),0) total_revenue, COALESCE(SUM(ticket_sales),0) ticket_sales, COALESCE(SUM(concession_sales),0) concession_sales, COALESCE(SUM(total_tickets),0) total_tickets, COALESCE(AVG(occupancy_rate),0) occupancy_rate FROM tms_revenue_logs WHERE log_date BETWEEN '{$from}' AND '{$to}'");
        $summaryRow = isset($summary[0]) ? $summary[0] : array();

        // Thống kê theo phương thức và kênh bán (hữu ích cho Kế toán & Super Admin)
        $byChannel = $this->rows("SELECT channel, COUNT(*) count, COALESCE(SUM(amount), 0) total FROM tms_transactions WHERE status = 'paid' GROUP BY channel");
        $byMethod = $this->rows("SELECT payment_method, COUNT(*) count, COALESCE(SUM(amount), 0) total FROM tms_transactions WHERE status = 'paid' GROUP BY payment_method");

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
        return isset($row[0]) ? (int)$row[0] : 0;
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
