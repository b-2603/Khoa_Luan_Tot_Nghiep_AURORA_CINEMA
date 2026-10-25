<?php

/**
 * Operational and commercial reports backed by live Aurora DB sales data.
 * The controller intentionally stays compatible with the legacy PHP/MySQL
 * runtime used by the local WAMP installation.
 */
class ReportController
{
    private $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function index()
    {
        $user = requireAdmin();
        $role = AdminController::normalizeRole($user['role']);
        $catalog = $this->reportCatalog($role);
        $report = isset($_GET['report']) ? trim((string)$_GET['report']) : $this->firstAccessibleReport($catalog);
        if (!$this->reportIsAccessible($catalog, $report)) {
            jsonResponse(array('success'=>false, 'message'=>'Bạn không có quyền truy cập báo cáo này.'), 403);
        }
        $defaultTo = date('Y-m-d');
        $defaultFrom = date('Y-m-01');
        $from = isset($_GET['from']) ? trim((string)$_GET['from']) : $defaultFrom;
        $to = isset($_GET['to']) ? trim((string)$_GET['to']) : $defaultTo;

        if (!$this->validDate($from) || !$this->validDate($to)) {
            jsonResponse(array('success'=>false, 'message'=>'Khoảng ngày báo cáo không hợp lệ.'), 422);
        }
        if ($from > $to) {
            jsonResponse(array('success'=>false, 'message'=>'Ngày bắt đầu không được sau ngày kết thúc.'), 422);
        }
        if ($to > date('Y-m-d')) {
            jsonResponse(array('success'=>false, 'message'=>'Ngày kết thúc báo cáo không được vượt quá ngày hiện tại.'), 422);
        }
        $dayCount = (int)floor((strtotime($to) - strtotime($from)) / 86400) + 1;
        if ($dayCount > 366) {
            jsonResponse(array('success'=>false, 'message'=>'Mỗi lần chỉ được xem tối đa 366 ngày dữ liệu.'), 422);
        }

        $assignedTheaterId = !empty($user['theater_id']) ? (int)$user['theater_id'] : 0;
        $requestedTheaterId = isset($_GET['theater_id']) ? max(0, (int)$_GET['theater_id']) : 0;
        $channel = isset($_GET['channel']) ? strtolower(trim((string)$_GET['channel'])) : 'all';
        $groupBy = isset($_GET['group_by']) ? strtolower(trim((string)$_GET['group_by'])) : 'day';
        $movieId = isset($_GET['movie_id']) ? max(0, (int)$_GET['movie_id']) : 0;
        $screenId = isset($_GET['screen_id']) ? max(0, (int)$_GET['screen_id']) : 0;
        $employeeId = isset($_GET['employee_id']) ? max(0, (int)$_GET['employee_id']) : 0;
        $paymentMethod = isset($_GET['payment_method']) ? strtoupper(trim((string)$_GET['payment_method'])) : 'ALL';
        $recordStatus = isset($_GET['record_status']) ? strtoupper(trim((string)$_GET['record_status'])) : 'ALL';
        $category = isset($_GET['category']) ? trim((string)$_GET['category']) : 'all';
        if (!in_array($channel, array('all','pos','website','web','app','ota'), true)) {
            jsonResponse(array('success'=>false, 'message'=>'Kênh bán được chọn không hợp lệ.'), 422);
        }
        if (!in_array($groupBy, array('day','week','month','quarter','year'), true)) {
            jsonResponse(array('success'=>false, 'message'=>'Kiểu tổng hợp thời gian không hợp lệ.'), 422);
        }
        if ($paymentMethod !== 'ALL' && !preg_match('/^[A-Z0-9_\-]{1,40}$/', $paymentMethod)) {
            jsonResponse(array('success'=>false, 'message'=>'Phương thức thanh toán không hợp lệ.'), 422);
        }
        if ($recordStatus !== 'ALL' && !preg_match('/^[A-Z0-9_\-]{1,40}$/', $recordStatus)) {
            jsonResponse(array('success'=>false, 'message'=>'Trạng thái báo cáo không hợp lệ.'), 422);
        }
        if ($category !== 'all' && strlen($category) > 80) {
            jsonResponse(array('success'=>false, 'message'=>'Danh mục sản phẩm không hợp lệ.'), 422);
        }
        $isCinemaScoped = in_array($role, array('cinema_admin', 'supervisor'), true);
        if ($isCinemaScoped && $assignedTheaterId <= 0) {
            jsonResponse(array('success'=>false, 'message'=>'Tài khoản chưa được gán rạp phụ trách trong aurora_db.'), 403);
        }
        $theaterId = $isCinemaScoped ? $assignedTheaterId : $requestedTheaterId;
        if ($theaterId > 0 && !$this->one("SELECT id FROM theaters WHERE id={$theaterId} LIMIT 1")) {
            jsonResponse(array('success'=>false, 'message'=>'Rạp được chọn không tồn tại trong aurora_db.'), 404);
        }
        if ($movieId > 0 && !$this->one("SELECT id FROM movies WHERE id={$movieId} LIMIT 1")) {
            jsonResponse(array('success'=>false, 'message'=>'Phim được chọn không tồn tại.'), 422);
        }
        if ($screenId > 0) {
            $screenCheck = $this->one("SELECT id,theater_id FROM screens WHERE id={$screenId} LIMIT 1");
            if (!$screenCheck) jsonResponse(array('success'=>false, 'message'=>'Phòng chiếu được chọn không tồn tại.'), 422);
            if ($theaterId > 0 && (int)$screenCheck['theater_id'] !== $theaterId) jsonResponse(array('success'=>false, 'message'=>'Phòng chiếu không thuộc phạm vi rạp được phép xem.'), 403);
        }
        if ($employeeId > 0) {
            $employeeCheck = $this->one("SELECT id,theater_id FROM pos_users WHERE id={$employeeId} LIMIT 1");
            if (!$employeeCheck) jsonResponse(array('success'=>false, 'message'=>'Nhân viên được chọn không tồn tại.'), 422);
            if ($theaterId > 0 && (int)$employeeCheck['theater_id'] !== $theaterId) jsonResponse(array('success'=>false, 'message'=>'Nhân viên không thuộc phạm vi rạp được phép xem.'), 403);
        }
        if ($category !== 'all') {
            $categoryCheckEsc = $this->db->real_escape_string($category);
            if (!$this->one("SELECT id FROM products WHERE category='{$categoryCheckEsc}' LIMIT 1")) jsonResponse(array('success'=>false, 'message'=>'Danh mục hàng hóa được chọn không tồn tại.'), 422);
        }
        if ($paymentMethod !== 'ALL') {
            $methodCheckEsc = $this->db->real_escape_string($paymentMethod);
            if (!$this->one("SELECT id FROM orders WHERE UPPER(payment_method)='{$methodCheckEsc}' LIMIT 1")) jsonResponse(array('success'=>false, 'message'=>'Phương thức thanh toán chưa có trong hệ thống.'), 422);
        }
        $statusByReport = array(
            'showtimes'=>array('OPEN','CLOSED','CANCELLED'),
            'transactions'=>array('PAID','PENDING','CANCELLED','REFUNDED'),
            'promotions'=>array('ACTIVE','INACTIVE','DRAFT','PENDING','APPROVED','REJECTED','PAUSED','EXPIRED'),
            'employees'=>array('ACTIVE','PAUSED','CLOSED')
        );
        if ($recordStatus !== 'ALL' && (!isset($statusByReport[$report]) || !in_array($recordStatus, $statusByReport[$report], true))) {
            jsonResponse(array('success'=>false, 'message'=>'Trạng thái không áp dụng cho báo cáo đang chọn.'), 422);
        }

        $fromEsc = $this->db->real_escape_string($from);
        $toEsc = $this->db->real_escape_string($to);
        $previousTo = date('Y-m-d', strtotime($from . ' -1 day'));
        $previousFrom = date('Y-m-d', strtotime($previousTo . ' -' . ($dayCount - 1) . ' days'));
        $previousFromEsc = $this->db->real_escape_string($previousFrom);
        $previousToEsc = $this->db->real_escape_string($previousTo);

        $orderJoins = " FROM orders o
            LEFT JOIN bookings b ON b.id=o.booking_id
            LEFT JOIN showtimes st ON st.id=b.showtime_id
            LEFT JOIN screens sc ON sc.id=st.screen_id
            LEFT JOIN pos_shifts ps ON ps.id=o.pos_shift_id ";
        $orderTheater = "COALESCE(NULLIF(sc.theater_id,0),NULLIF(ps.theater_id,0))";
        $orderScope = $theaterId > 0 ? " AND {$orderTheater}={$theaterId}" : '';
        if ($channel !== 'all') {
            $channelEsc = $this->db->real_escape_string($channel === 'web' ? 'website' : $channel);
            $orderScope .= " AND LOWER(o.channel)='{$channelEsc}'";
        }
        $showtimeScope = $theaterId > 0 ? " AND sc.theater_id={$theaterId}" : '';
        if ($movieId > 0) { $orderScope .= " AND st.movie_id={$movieId}"; $showtimeScope .= " AND st.movie_id={$movieId}"; }
        if ($screenId > 0) { $orderScope .= " AND st.screen_id={$screenId}"; $showtimeScope .= " AND st.screen_id={$screenId}"; }
        if ($employeeId > 0) $orderScope .= " AND (o.cashier_id={$employeeId} OR ps.user_id={$employeeId})";
        if ($paymentMethod !== 'ALL') {
            $paymentMethodEsc = $this->db->real_escape_string($paymentMethod);
            $orderScope .= " AND UPPER(o.payment_method)='{$paymentMethodEsc}'";
        }
        $categoryEsc = $this->db->real_escape_string($category);
        $productScope = $category !== 'all' ? " AND oi.item_code IN (SELECT sku COLLATE utf8_general_ci FROM products WHERE category='{$categoryEsc}')" : '';
        $inventoryProductScope = $category !== 'all' ? " AND p.category='{$categoryEsc}'" : '';
        $showtimeStatusScope = " AND st.status<>'CANCELLED'";
        if (in_array($recordStatus, array('OPEN','CLOSED','CANCELLED'), true)) $showtimeStatusScope = " AND st.status='{$recordStatus}'";

        $summary = $this->one("SELECT
                COUNT(DISTINCT o.id) order_count,
                COALESCE(SUM(o.subtotal),0) gross_revenue,
                COALESCE(SUM(o.discount_amount),0) discount_amount,
                COALESCE(SUM(o.total_amount),0) net_revenue,
                COALESCE(AVG(o.total_amount),0) average_order
            {$orderJoins}
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}");
        $itemSummary = $this->one("SELECT
                COALESCE(SUM(CASE WHEN oi.item_type='TICKET' THEN oi.quantity ELSE 0 END),0) tickets_sold,
                COALESCE(SUM(CASE WHEN oi.item_type='TICKET' THEN oi.quantity*oi.unit_price ELSE 0 END),0) ticket_revenue,
                COALESCE(SUM(CASE WHEN oi.item_type IN ('COMBO','MERCHANDISE') THEN oi.quantity ELSE 0 END),0) concession_items,
                COALESCE(SUM(CASE WHEN oi.item_type IN ('COMBO','MERCHANDISE') THEN oi.quantity*oi.unit_price ELSE 0 END),0) concession_revenue
            FROM order_items oi INNER JOIN orders o ON o.id=oi.order_id
            LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id
            LEFT JOIN screens sc ON sc.id=st.screen_id LEFT JOIN pos_shifts ps ON ps.id=o.pos_shift_id
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}{$productScope}");
        $occupancy = $this->one("SELECT COUNT(DISTINCT st.id) showtime_count,
                COALESCE(SUM(sc.total_seats),0) available_seats,
                COALESCE(SUM(COALESCE(sold.sold_seats,0)),0) occupied_seats
            FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id
            LEFT JOIN (SELECT b.showtime_id,COUNT(bs.id) sold_seats FROM bookings b
                INNER JOIN booking_seats bs ON bs.booking_id=b.id WHERE b.status='PAID' GROUP BY b.showtime_id) sold ON sold.showtime_id=st.id
            WHERE DATE(st.starts_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$showtimeStatusScope}{$showtimeScope}");

        $summary = array_merge($summary ? $summary : array(), $itemSummary ? $itemSummary : array(), $occupancy ? $occupancy : array());
        $summary['refund_amount'] = 0;
        if ($theaterId === 0) {
            $refund = $this->one("SELECT COALESCE(SUM(amount),0) refund_amount FROM refunds WHERE status IN ('approved','completed') AND DATE(COALESCE(processed_at,created_at)) BETWEEN '{$fromEsc}' AND '{$toEsc}'");
            $summary['refund_amount'] = $refund ? (float)$refund['refund_amount'] : 0;
        }
        $summary['occupancy_rate'] = !empty($summary['available_seats']) ? round(((float)$summary['occupied_seats'] * 100) / (float)$summary['available_seats'], 1) : 0;

        $previous = $this->one("SELECT COUNT(DISTINCT o.id) order_count,
                COALESCE(SUM(o.total_amount),0) net_revenue,
                COALESCE(AVG(o.total_amount),0) average_order
            {$orderJoins}
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$previousFromEsc}' AND '{$previousToEsc}'{$orderScope}");
        $previousItems = $this->one("SELECT COALESCE(SUM(CASE WHEN oi.item_type='TICKET' THEN oi.quantity ELSE 0 END),0) tickets_sold
            FROM order_items oi INNER JOIN orders o ON o.id=oi.order_id
            LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id
            LEFT JOIN screens sc ON sc.id=st.screen_id LEFT JOIN pos_shifts ps ON ps.id=o.pos_shift_id
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$previousFromEsc}' AND '{$previousToEsc}'{$orderScope}");
        $previousOccupancy = $this->one("SELECT COALESCE(SUM(sc.total_seats),0) available_seats,
                COALESCE(SUM(COALESCE(sold.sold_seats,0)),0) occupied_seats
            FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id
            LEFT JOIN (SELECT b.showtime_id,COUNT(bs.id) sold_seats FROM bookings b
                INNER JOIN booking_seats bs ON bs.booking_id=b.id WHERE b.status='PAID' GROUP BY b.showtime_id) sold ON sold.showtime_id=st.id
            WHERE DATE(st.starts_at) BETWEEN '{$previousFromEsc}' AND '{$previousToEsc}'{$showtimeStatusScope}{$showtimeScope}");
        $previous = array_merge($previous ? $previous : array(), $previousItems ? $previousItems : array());
        $previous['occupancy_rate'] = !empty($previousOccupancy['available_seats']) ? round(((float)$previousOccupancy['occupied_seats'] * 100) / (float)$previousOccupancy['available_seats'], 1) : 0;

        $trendDateExpression = 'DATE(o.created_at)';
        if ($groupBy === 'week') $trendDateExpression = 'DATE_SUB(DATE(o.created_at), INTERVAL WEEKDAY(o.created_at) DAY)';
        if ($groupBy === 'month') $trendDateExpression = "DATE_FORMAT(o.created_at,'%Y-%m-01')";
        if ($groupBy === 'quarter') $trendDateExpression = "CONCAT(YEAR(o.created_at),'-',LPAD(((QUARTER(o.created_at)-1)*3)+1,2,'0'),'-01')";
        if ($groupBy === 'year') $trendDateExpression = "CONCAT(YEAR(o.created_at),'-01-01')";
        $trend = $this->all("SELECT {$trendDateExpression} report_date,
                COUNT(DISTINCT o.id) order_count,
                COALESCE(SUM(o.total_amount),0) net_revenue,
                COALESCE(SUM(items.ticket_revenue),0) ticket_revenue,
                COALESCE(SUM(items.concession_revenue),0) concession_revenue,
                COALESCE(SUM(items.tickets_sold),0) tickets_sold
            {$orderJoins}
            LEFT JOIN (SELECT order_id,
                SUM(CASE WHEN item_type='TICKET' THEN quantity*unit_price ELSE 0 END) ticket_revenue,
                SUM(CASE WHEN item_type IN ('COMBO','MERCHANDISE') THEN quantity*unit_price ELSE 0 END) concession_revenue,
                SUM(CASE WHEN item_type='TICKET' THEN quantity ELSE 0 END) tickets_sold
                FROM order_items GROUP BY order_id) items ON items.order_id=o.id
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
            GROUP BY {$trendDateExpression} ORDER BY report_date");

        $movies = $this->all("SELECT m.id,m.title,m.poster_url,m.genre,
                COUNT(DISTINCT st.id) showtime_count,
                COALESCE(SUM(sc.total_seats),0) available_seats,
                COALESCE(SUM(COALESCE(sold.tickets_sold,0)),0) tickets_sold,
                COALESCE(SUM(COALESCE(sold.ticket_revenue,0)),0) ticket_revenue
            FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id INNER JOIN movies m ON m.id=st.movie_id
            LEFT JOIN (SELECT b.showtime_id,COUNT(bs.id) tickets_sold,COALESCE(SUM(bs.price),0) ticket_revenue
                FROM bookings b INNER JOIN booking_seats bs ON bs.booking_id=b.id WHERE b.status='PAID' GROUP BY b.showtime_id) sold ON sold.showtime_id=st.id
            WHERE DATE(st.starts_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$showtimeStatusScope}{$showtimeScope}
            GROUP BY m.id,m.title,m.poster_url,m.genre ORDER BY ticket_revenue DESC,tickets_sold DESC,m.title LIMIT 20");
        foreach ($movies as $index => $movie) {
            $movies[$index]['occupancy_rate'] = !empty($movie['available_seats']) ? round(((float)$movie['tickets_sold'] * 100) / (float)$movie['available_seats'], 1) : 0;
        }

        $products = $this->all("SELECT oi.item_type,oi.item_code,oi.item_name,
                COUNT(DISTINCT o.id) order_count,COALESCE(SUM(oi.quantity),0) quantity,
                COALESCE(SUM(oi.quantity*oi.unit_price),0) revenue,
                COALESCE(AVG(oi.unit_price),0) average_price
            FROM order_items oi INNER JOIN orders o ON o.id=oi.order_id
            LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id
            LEFT JOIN screens sc ON sc.id=st.screen_id LEFT JOIN pos_shifts ps ON ps.id=o.pos_shift_id
            WHERE o.status='PAID' AND oi.item_type IN ('COMBO','MERCHANDISE')
                AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}{$productScope}
            GROUP BY oi.item_type,oi.item_code,oi.item_name ORDER BY revenue DESC,quantity DESC LIMIT 30");

        $paymentMethods = $this->all("SELECT UPPER(COALESCE(NULLIF(o.payment_method,''),'OTHER')) payment_method,
                COUNT(DISTINCT o.id) order_count,COALESCE(SUM(o.total_amount),0) revenue
            {$orderJoins}
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
            GROUP BY UPPER(COALESCE(NULLIF(o.payment_method,''),'OTHER')) ORDER BY revenue DESC");
        $channels = $this->all("SELECT LOWER(COALESCE(NULLIF(o.channel,''),'other')) channel,
                COUNT(DISTINCT o.id) order_count,COALESCE(SUM(o.total_amount),0) revenue
            {$orderJoins}
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
            GROUP BY LOWER(COALESCE(NULLIF(o.channel,''),'other')) ORDER BY revenue DESC");

        $theaterFilter = $theaterId > 0 ? " WHERE th.id={$theaterId}" : '';
        $theaters = $this->all("SELECT th.id,th.name,th.city,
                COALESCE(sales.order_count,0) order_count,COALESCE(sales.net_revenue,0) net_revenue,
                COALESCE(sales.tickets_sold,0) tickets_sold,COALESCE(sales.concession_revenue,0) concession_revenue,
                COALESCE(ops.showtime_count,0) showtime_count,COALESCE(ops.available_seats,0) available_seats,
                COALESCE(ops.occupied_seats,0) occupied_seats
            FROM theaters th
            LEFT JOIN (SELECT {$orderTheater} theater_id,COUNT(DISTINCT o.id) order_count,
                COALESCE(SUM(o.total_amount),0) net_revenue,
                COALESCE(SUM(items.tickets_sold),0) tickets_sold,
                COALESCE(SUM(items.concession_revenue),0) concession_revenue
                {$orderJoins}
                LEFT JOIN (SELECT order_id,
                    SUM(CASE WHEN item_type='TICKET' THEN quantity ELSE 0 END) tickets_sold,
                    SUM(CASE WHEN item_type IN ('COMBO','MERCHANDISE') THEN quantity*unit_price ELSE 0 END) concession_revenue
                    FROM order_items GROUP BY order_id) items ON items.order_id=o.id
                WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
                GROUP BY {$orderTheater}) sales ON sales.theater_id=th.id
            LEFT JOIN (SELECT sc.theater_id,COUNT(DISTINCT st.id) showtime_count,
                    COALESCE(SUM(sc.total_seats),0) available_seats,
                    COALESCE(SUM(COALESCE(sold.sold_seats,0)),0) occupied_seats
                FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id
                LEFT JOIN (SELECT b.showtime_id,COUNT(bs.id) sold_seats FROM bookings b
                    INNER JOIN booking_seats bs ON bs.booking_id=b.id WHERE b.status='PAID' GROUP BY b.showtime_id) sold ON sold.showtime_id=st.id
                WHERE DATE(st.starts_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$showtimeStatusScope}{$showtimeScope}
                GROUP BY sc.theater_id) ops ON ops.theater_id=th.id
            {$theaterFilter} ORDER BY net_revenue DESC,th.name");
        foreach ($theaters as $index => $theater) {
            $theaters[$index]['occupancy_rate'] = !empty($theater['available_seats']) ? round(((float)$theater['occupied_seats'] * 100) / (float)$theater['available_seats'], 1) : 0;
        }

        $hourly = $this->all("SELECT HOUR(o.created_at) sale_hour,COUNT(DISTINCT o.id) order_count,
                COALESCE(SUM(o.total_amount),0) revenue
            {$orderJoins}
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
            GROUP BY HOUR(o.created_at) ORDER BY sale_hour");

        $orders = $this->all("SELECT o.id,o.order_code,o.created_at,o.channel,o.payment_method,o.subtotal,
                o.discount_amount,o.total_amount,
                COALESCE(th.name,'Chưa xác định rạp') theater_name,
                COALESCE(m.title,'Bán hàng tại quầy') movie_title,
                COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.order_id=o.id),0) item_count,
                COALESCE((SELECT GROUP_CONCAT(CONCAT(oi.item_name,' x',oi.quantity) SEPARATOR ', ') FROM order_items oi WHERE oi.order_id=o.id),'—') item_summary
            {$orderJoins}
            LEFT JOIN theaters th ON th.id={$orderTheater}
            LEFT JOIN movies m ON m.id=st.movie_id
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
            ORDER BY o.created_at DESC,o.id DESC LIMIT 100");

        $showtimes = $this->all("SELECT st.id,m.title movie_title,th.name theater_name,sc.name screen_name,
                sc.screen_type,st.starts_at,st.ends_at,st.status,sc.total_seats available_seats,
                COALESCE(sold.tickets_sold,0) tickets_sold,COALESCE(sold.ticket_revenue,0) ticket_revenue
            FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id
            INNER JOIN theaters th ON th.id=sc.theater_id INNER JOIN movies m ON m.id=st.movie_id
            LEFT JOIN (SELECT b.showtime_id,COUNT(bs.id) tickets_sold,COALESCE(SUM(bs.price),0) ticket_revenue
                FROM bookings b INNER JOIN booking_seats bs ON bs.booking_id=b.id
                WHERE b.status='PAID' GROUP BY b.showtime_id) sold ON sold.showtime_id=st.id
            WHERE DATE(st.starts_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$showtimeStatusScope}{$showtimeScope}
            ORDER BY st.starts_at DESC LIMIT 200");
        foreach ($showtimes as $index => $showtime) {
            $showtimes[$index]['occupancy_rate'] = !empty($showtime['available_seats']) ? round(((float)$showtime['tickets_sold'] * 100) / (float)$showtime['available_seats'], 1) : 0;
        }

        $inventoryScope = $theaterId > 0 ? " AND inv.theater_id={$theaterId}" : '';
        $inventory = $this->all("SELECT inv.id,inv.theater_id,th.name theater_name,p.sku,p.name product_name,p.category,p.unit,
                inv.stock_quantity,inv.reorder_level,p.cost_price,(inv.stock_quantity*p.cost_price) stock_value,
                COALESCE(mv.received_quantity,0) received_quantity,COALESCE(mv.issued_quantity,0) issued_quantity,
                COALESCE(mv.adjustment_quantity,0) adjustment_quantity,inv.updated_at
            FROM theater_product_inventory inv INNER JOIN theaters th ON th.id=inv.theater_id
            INNER JOIN products p ON p.id=inv.product_id
            LEFT JOIN (SELECT theater_id,product_id,
                SUM(CASE WHEN quantity>0 THEN quantity ELSE 0 END) received_quantity,
                SUM(CASE WHEN quantity<0 THEN -quantity ELSE 0 END) issued_quantity,
                SUM(CASE WHEN movement_type LIKE '%adjust%' THEN quantity ELSE 0 END) adjustment_quantity
                FROM product_inventory_movements WHERE DATE(created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'
                GROUP BY theater_id,product_id) mv ON mv.theater_id=inv.theater_id AND mv.product_id=inv.product_id
            WHERE 1=1{$inventoryScope}{$inventoryProductScope} ORDER BY (inv.stock_quantity<=inv.reorder_level) DESC,th.name,p.name");
        $inventorySummary = array('stock_value'=>0,'low_stock'=>0,'out_of_stock'=>0,'sku_count'=>count($inventory));
        foreach ($inventory as $inventoryRow) {
            $inventorySummary['stock_value'] += (float)$inventoryRow['stock_value'];
            if ((int)$inventoryRow['stock_quantity'] <= 0) $inventorySummary['out_of_stock']++;
            if ((int)$inventoryRow['stock_quantity'] > 0 && (int)$inventoryRow['stock_quantity'] <= (int)$inventoryRow['reorder_level']) $inventorySummary['low_stock']++;
        }

        $transactionStatusScope = in_array($recordStatus, array('PAID','PENDING','CANCELLED','REFUNDED'), true) ? " AND o.status='{$recordStatus}'" : '';
        $transactions = $this->all("SELECT o.id,COALESCE(NULLIF(p.reference_code,''),'—') payment_code,o.order_code,o.created_at,
                COALESCE(th.name,'Chưa xác định rạp') theater_name,o.channel,COALESCE(NULLIF(p.method,''),o.payment_method) payment_method,
                COALESCE(p.amount,o.total_amount) amount,LOWER(o.status) payment_status,'' refund_code,'' refund_reason,0 refund_amount,'' refund_status
            FROM orders o LEFT JOIN payments p ON p.order_id=o.id
            LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id
            LEFT JOIN screens sc ON sc.id=st.screen_id LEFT JOIN pos_shifts ps ON ps.id=o.pos_shift_id
            LEFT JOIN theaters th ON th.id={$orderTheater}
            WHERE DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}{$transactionStatusScope}
            ORDER BY o.created_at DESC LIMIT 200");

        $reconciliation = $this->all("SELECT UPPER(COALESCE(NULLIF(o.payment_method,''),'OTHER')) payment_method,
                COUNT(DISTINCT o.id) transaction_count,COALESCE(SUM(o.total_amount),0) system_amount,
                NULL partner_amount,NULL difference_amount,'awaiting_source' reconciliation_status
            {$orderJoins}
            WHERE o.status='PAID' AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$orderScope}
            GROUP BY UPPER(COALESCE(NULLIF(o.payment_method,''),'OTHER')) ORDER BY system_amount DESC");

        $promotionOrdersScope = $orderScope;
        $promotionStatusScope = $recordStatus !== 'ALL' ? " WHERE UPPER(mp.status)='".$this->db->real_escape_string($recordStatus)."'" : '';
        $voucherStatusScope = $recordStatus !== 'ALL' ? " AND UPPER(mv.status)='".$this->db->real_escape_string($recordStatus)."'" : '';
        $promotions = $this->all("SELECT 'promotion' source_type,mp.promotion_code code,mp.name,mp.discount_type,
                mp.discount_value,mp.start_date,mp.end_date,mp.status,0 issued_count,
                0 used_count,0 discount_amount,0 related_revenue
            FROM marketing_promotions mp{$promotionStatusScope}
            UNION ALL
            SELECT 'voucher' source_type,mv.voucher_code code,mv.name,mv.discount_type,mv.discount_value,
                mv.start_date,mv.end_date,mv.status,mv.quantity issued_count,mv.used_count,
                COALESCE(SUM(o.discount_amount),0) discount_amount,COALESCE(SUM(o.total_amount),0) related_revenue
            FROM marketing_vouchers mv LEFT JOIN orders o ON o.status='PAID' AND o.voucher_code=mv.voucher_code COLLATE utf8_general_ci
                AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'
            LEFT JOIN bookings b ON b.id=o.booking_id LEFT JOIN showtimes st ON st.id=b.showtime_id
            LEFT JOIN screens sc ON sc.id=st.screen_id LEFT JOIN pos_shifts ps ON ps.id=o.pos_shift_id
            WHERE 1=1{$promotionOrdersScope}{$voucherStatusScope}
            GROUP BY mv.id,mv.voucher_code,mv.name,mv.discount_type,mv.discount_value,mv.start_date,mv.end_date,mv.status,mv.quantity,mv.used_count
            ORDER BY used_count DESC,name");

        $employeeScope = $theaterId > 0 ? " AND ps.theater_id={$theaterId}" : '';
        if ($employeeId > 0) $employeeScope .= " AND ps.user_id={$employeeId}";
        if (in_array($recordStatus, array('ACTIVE','PAUSED','CLOSED'), true)) $employeeScope .= " AND UPPER(ps.status)='{$recordStatus}'";
        $employees = $this->all("SELECT pu.id,COALESCE(NULLIF(pu.employee_code,''),pu.username) employee_code,pu.full_name,
                th.name theater_name,ps.id shift_id,ps.counter,ps.opened_at,ps.closed_at,ps.status shift_status,
                COUNT(DISTINCT o.id) order_count,COALESCE(SUM(o.total_amount),0) net_revenue,
                COALESCE(SUM(items.tickets_sold),0) tickets_sold,COALESCE(SUM(items.ticket_revenue),0) ticket_revenue,
                COALESCE(SUM(items.concession_revenue),0) concession_revenue,
                COALESCE(SUM(CASE WHEN o.status IN ('CANCELLED','REFUNDED') THEN 1 ELSE 0 END),0) cancelled_count
            FROM pos_shifts ps INNER JOIN pos_users pu ON pu.id=ps.user_id INNER JOIN theaters th ON th.id=ps.theater_id
            LEFT JOIN orders o ON o.pos_shift_id=ps.id AND DATE(o.created_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'
            LEFT JOIN (SELECT order_id,
                SUM(CASE WHEN item_type='TICKET' THEN quantity ELSE 0 END) tickets_sold,
                SUM(CASE WHEN item_type='TICKET' THEN quantity*unit_price ELSE 0 END) ticket_revenue,
                SUM(CASE WHEN item_type IN ('COMBO','MERCHANDISE') THEN quantity*unit_price ELSE 0 END) concession_revenue
                FROM order_items GROUP BY order_id) items ON items.order_id=o.id
            WHERE DATE(ps.opened_at) BETWEEN '{$fromEsc}' AND '{$toEsc}'{$employeeScope}
            GROUP BY pu.id,pu.employee_code,pu.username,pu.full_name,th.name,ps.id,ps.counter,ps.opened_at,ps.closed_at,ps.status
            ORDER BY net_revenue DESC,ps.opened_at DESC LIMIT 200");

        $availability = array(
            'modifiers'=>array('available'=>false,'message'=>'aurora_db chưa có modifier_options và order_item_modifiers; báo cáo sẽ tự hoạt động khi nghiệp vụ POS lưu dữ liệu nâng cấp.'),
            'reconciliation'=>array('available'=>false,'message'=>'Chưa có dữ liệu quyết toán từ đối tác; doanh thu hệ thống vẫn được hiển thị để chuẩn bị đối soát.'),
            'feedback'=>array('available'=>false,'message'=>'aurora_db chưa có bảng phản hồi nhân viên nghiệp vụ. Dữ liệu ems_ai_feedback không được dùng thay thế để tránh sai mục đích và lộ danh tính.')
        );

        $theaterOptionsSql = "SELECT id,name,city FROM theaters" . ($isCinemaScoped ? " WHERE id={$assignedTheaterId}" : '') . " ORDER BY name";
        $theaterOptions = $this->all($theaterOptionsSql);
        $optionTheaterScope = $theaterId > 0 ? " WHERE sc.theater_id={$theaterId}" : '';
        $movieOptions = $this->all("SELECT DISTINCT m.id,m.title FROM movies m INNER JOIN showtimes st ON st.movie_id=m.id INNER JOIN screens sc ON sc.id=st.screen_id{$optionTheaterScope} ORDER BY m.title");
        $screenOptions = $this->all("SELECT sc.id,sc.name,sc.screen_type,sc.theater_id,th.name theater_name FROM screens sc INNER JOIN theaters th ON th.id=sc.theater_id".($theaterId > 0 ? " WHERE sc.theater_id={$theaterId}" : '')." ORDER BY th.name,sc.name");
        $categoryOptions = $this->all("SELECT DISTINCT category value,category label FROM products WHERE status<>'deleted' ORDER BY category");
        $employeeOptions = $this->all("SELECT pu.id,COALESCE(NULLIF(pu.employee_code,''),pu.username) employee_code,pu.full_name,pu.theater_id,th.name theater_name FROM pos_users pu INNER JOIN theaters th ON th.id=pu.theater_id WHERE pu.status='active'".($theaterId > 0 ? " AND pu.theater_id={$theaterId}" : '')." ORDER BY pu.full_name");
        $paymentMethodOptions = $this->all("SELECT DISTINCT UPPER(COALESCE(NULLIF(payment_method,''),'OTHER')) value FROM orders ORDER BY value");
        $scopeTheater = $theaterId > 0 ? $this->one("SELECT id,name,city FROM theaters WHERE id={$theaterId} LIMIT 1") : null;

        $comparison = array(
            'previous_from'=>$previousFrom,
            'previous_to'=>$previousTo,
            'net_revenue_change'=>$this->growth(isset($summary['net_revenue']) ? $summary['net_revenue'] : 0, isset($previous['net_revenue']) ? $previous['net_revenue'] : 0),
            'order_count_change'=>$this->growth(isset($summary['order_count']) ? $summary['order_count'] : 0, isset($previous['order_count']) ? $previous['order_count'] : 0),
            'tickets_sold_change'=>$this->growth(isset($summary['tickets_sold']) ? $summary['tickets_sold'] : 0, isset($previous['tickets_sold']) ? $previous['tickets_sold'] : 0),
            'occupancy_change'=>round((float)$summary['occupancy_rate'] - (float)$previous['occupancy_rate'], 1),
            'previous'=>$previous
        );

        // Chỉ trả các tập dữ liệu cần cho báo cáo đã được backend cấp quyền.
        // Điều này ngăn người dùng đọc dữ liệu của báo cáo bị ẩn bằng DevTools.
        if ($report !== 'overview' && $report !== 'trends') $trend = array();
        if ($report !== 'overview' && $report !== 'movies') $movies = array();
        if ($report !== 'fnb' && $report !== 'products') $products = array();
        if ($report !== 'channels') { $paymentMethods = array(); $channels = array(); }
        if ($report !== 'overview' && $report !== 'theaters') $theaters = array();
        if ($report !== 'overview') $hourly = array();
        if ($report !== 'trends' || $role === 'marketing_manager') $orders = array();
        if ($report !== 'showtimes') $showtimes = array();
        if ($report !== 'inventory') { $inventory = array(); $inventorySummary = array('stock_value'=>0,'low_stock'=>0,'out_of_stock'=>0,'sku_count'=>0); }
        if ($report !== 'transactions') $transactions = array();
        if ($report !== 'reconciliation') $reconciliation = array();
        if ($report !== 'promotions') $promotions = array();
        if ($report !== 'employees') $employees = array();

        $activeReport = null;
        foreach ($catalog as $catalogItem) {
            if ($catalogItem['key'] === $report) { $activeReport = $catalogItem; break; }
        }
        $generatedBy = !empty($user['full_name']) ? $user['full_name'] : (!empty($user['username']) ? $user['username'] : 'Quản trị viên');
        $exportMeta = array(
            'report_code'=>!empty($activeReport['number']) ? 'BC-'.$activeReport['number'] : 'BC-AURORA',
            'report_title'=>!empty($activeReport['title']) ? $activeReport['title'] : 'Báo cáo vận hành',
            'generated_by'=>$generatedBy,
            'generated_role'=>$role,
            'data_source'=>'aurora_db',
            'confidentiality'=>'NỘI BỘ',
            'currency'=>'VND',
            'timezone'=>'Asia/Ho_Chi_Minh'
        );

        jsonResponse(array('success'=>true, 'data'=>array(
            'filters'=>array('from'=>$from,'to'=>$to,'day_count'=>$dayCount,'theater_id'=>$theaterId,'channel'=>$channel,'group_by'=>$groupBy,'movie_id'=>$movieId,'screen_id'=>$screenId,'employee_id'=>$employeeId,'payment_method'=>$paymentMethod,'record_status'=>$recordStatus,'category'=>$category),
            'filter_options'=>array('movies'=>$movieOptions,'screens'=>$screenOptions,'categories'=>$categoryOptions,'employees'=>$employeeOptions,'payment_methods'=>$paymentMethodOptions),
            'selected_report'=>$report,
            'report_catalog'=>$catalog,
            'scope'=>array('role'=>$role,'theater'=>$scopeTheater,'source'=>'aurora_db'),
            'export_meta'=>$exportMeta,
            'summary'=>$summary,
            'comparison'=>$comparison,
            'trend'=>$trend,
            'movies'=>$movies,
            'products'=>$products,
            'payment_methods'=>$paymentMethods,
            'channels'=>$channels,
            'theaters'=>$theaters,
            'hourly'=>$hourly,
            'orders'=>$orders,
            'showtimes'=>$showtimes,
            'inventory'=>$inventory,
            'inventory_summary'=>$inventorySummary,
            'transactions'=>$transactions,
            'reconciliation'=>$reconciliation,
            'promotions'=>$promotions,
            'employees'=>$employees,
            'modifiers'=>array(),
            'feedback'=>array(),
            'availability'=>$availability,
            'theater_options'=>$theaterOptions,
            'generated_at'=>date('Y-m-d H:i:s')
        )));
    }

    public function logExport()
    {
        $user = requireAdmin();
        $role = AdminController::normalizeRole($user['role']);
        $payload = requestJson();
        $report = isset($payload['report']) ? trim((string)$payload['report']) : '';
        $format = isset($payload['format']) ? strtolower(trim((string)$payload['format'])) : '';
        $catalog = $this->reportCatalog($role);
        if (!$this->reportIsAccessible($catalog, $report)) {
            jsonResponse(array('success'=>false,'message'=>'Bạn không có quyền xuất báo cáo này.'), 403);
        }
        if (!in_array($format, array('pdf','excel'), true)) {
            jsonResponse(array('success'=>false,'message'=>'Định dạng xuất báo cáo không hợp lệ.'), 422);
        }
        $safeMeta = array(
            'report'=>$report,
            'format'=>$format,
            'from'=>isset($payload['from']) ? substr((string)$payload['from'],0,10) : '',
            'to'=>isset($payload['to']) ? substr((string)$payload['to'],0,10) : '',
            'theater_id'=>isset($payload['theater_id']) ? max(0,(int)$payload['theater_id']) : 0,
            'channel'=>isset($payload['channel']) ? substr((string)$payload['channel'],0,30) : 'all',
            'row_count'=>isset($payload['row_count']) ? max(0,(int)$payload['row_count']) : 0
        );
        writeTmsAuditLog($this->db, 'report.export', 'Xuất báo cáo '.strtoupper($format).' từ dữ liệu aurora_db.', array(
            'module'=>'reports','entity_type'=>'report','entity_id'=>$report,'severity'=>'success','metadata'=>$safeMeta
        ));
        jsonResponse(array('success'=>true,'message'=>'Đã ghi nhận lịch sử xuất báo cáo.'));
    }

    private function reportCatalog($role)
    {
        $definitions = array(
            array('key'=>'overview','number'=>'01','group'=>'Tổng quan kinh doanh','title'=>'Tổng quan doanh thu toàn chuỗi','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager')),
            array('key'=>'theaters','number'=>'02','group'=>'Doanh thu vé & phim','title'=>'Doanh thu theo rạp','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager')),
            array('key'=>'movies','number'=>'03','group'=>'Doanh thu vé & phim','title'=>'Doanh thu theo phim','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager')),
            array('key'=>'trends','number'=>'04','group'=>'Doanh thu vé & phim','title'=>'Doanh thu theo thời gian','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager')),
            array('key'=>'showtimes','number'=>'05','group'=>'Doanh thu vé & phim','title'=>'Hiệu suất suất chiếu','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager','supervisor')),
            array('key'=>'channels','number'=>'06','group'=>'Doanh thu vé & phim','title'=>'Doanh thu POS / Website','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager')),
            array('key'=>'fnb','number'=>'07','group'=>'F&B & Merchandise','title'=>'Doanh thu F&B / Merchandise','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager','supervisor')),
            array('key'=>'products','number'=>'08','group'=>'F&B & Merchandise','title'=>'Top sản phẩm và combo','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager','supervisor')),
            array('key'=>'modifiers','number'=>'09','group'=>'F&B & Merchandise','title'=>'Up vị bắp / Up size','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager','supervisor')),
            array('key'=>'inventory','number'=>'10','group'=>'Tồn kho F&B','title'=>'Tồn kho F&B','roles'=>array('super_admin','cinema_admin','accounting','supervisor')),
            array('key'=>'transactions','number'=>'11','group'=>'Giao dịch & Đối soát','title'=>'Giao dịch và hoàn tiền','roles'=>array('super_admin','cinema_admin','accounting','supervisor')),
            array('key'=>'reconciliation','number'=>'12','group'=>'Giao dịch & Đối soát','title'=>'Đối soát thanh toán','roles'=>array('super_admin','cinema_admin','accounting')),
            array('key'=>'promotions','number'=>'13','group'=>'Marketing & Khuyến mãi','title'=>'Hiệu quả CTKM và Voucher','roles'=>array('super_admin','cinema_admin','accounting','marketing_manager')),
            array('key'=>'employees','number'=>'14','group'=>'Hiệu suất nhân viên','title'=>'Doanh số nhân viên theo ca','roles'=>array('super_admin','cinema_admin','accounting','supervisor')),
            array('key'=>'feedback','number'=>'15','group'=>'Phản hồi nhân viên','title'=>'Thống kê phản hồi nhân viên','roles'=>array('super_admin'))
        );
        foreach ($definitions as $index => $definition) {
            $definitions[$index]['accessible'] = in_array($role, $definition['roles'], true);
            unset($definitions[$index]['roles']);
        }
        return $definitions;
    }

    private function firstAccessibleReport($catalog)
    {
        foreach ($catalog as $report) if (!empty($report['accessible'])) return $report['key'];
        return 'overview';
    }

    private function reportIsAccessible($catalog, $key)
    {
        foreach ($catalog as $report) if ($report['key'] === $key) return !empty($report['accessible']);
        return false;
    }

    private function validDate($value)
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return false;
        $parts = explode('-', $value);
        return count($parts) === 3 && checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0]);
    }

    private function growth($current, $previous)
    {
        $current = (float)$current;
        $previous = (float)$previous;
        if ($previous == 0) return $current > 0 ? 100 : 0;
        return round((($current - $previous) * 100) / $previous, 1);
    }

    private function one($sql)
    {
        $result = $this->db->query($sql);
        if (!$result) jsonResponse(array('success'=>false, 'message'=>'Không thể tổng hợp báo cáo từ aurora_db: '.$this->db->error), 500);
        $row = $result->fetch_assoc();
        return $row ? $row : array();
    }

    private function all($sql)
    {
        $result = $this->db->query($sql);
        if (!$result) jsonResponse(array('success'=>false, 'message'=>'Không thể tổng hợp báo cáo từ aurora_db: '.$this->db->error), 500);
        $rows = array();
        while ($row = $result->fetch_assoc()) $rows[] = $row;
        return $rows;
    }
}
