<?php

class RevenueController
{
    private $db;

    public function __construct($database)
    {
        $this->db = $database;
    }

    public function index()
    {
        // Doanh thu phải được tính từ đơn đã thanh toán trong aurora_db,
        // không lấy số demo cũ của hệ thống.
        $sql = "SELECT d.log_date,
                    COALESCE(t.ticket_sales, 0) AS ticket_sales,
                    COALESCE(c.concession_sales, 0) AS concession_sales,
                    COALESCE(t.ticket_sales, 0) + COALESCE(c.concession_sales, 0) AS total_revenue,
                    COALESCE(t.total_tickets, 0) AS total_tickets,
                    COALESCE(t.total_tickets / NULLIF(capacity.total_seats, 0) * 100, 0) AS occupancy_rate
                FROM (
                    SELECT DATE(created_at) log_date FROM bookings WHERE status='PAID'
                    UNION SELECT DATE(created_at) FROM orders WHERE status='PAID'
                ) d
                LEFT JOIN (
                    SELECT DATE(b.created_at) log_date, COALESCE(SUM(bs.price), 0) ticket_sales, COUNT(bs.id) total_tickets
                    FROM bookings b INNER JOIN booking_seats bs ON bs.booking_id=b.id
                    WHERE b.status='PAID' GROUP BY DATE(b.created_at)
                ) t ON t.log_date=d.log_date
                LEFT JOIN (
                    SELECT log_date, SUM(amount) concession_sales FROM (
                        SELECT DATE(b.created_at) log_date, COALESCE(SUM(bc.quantity * bc.unit_price), 0) amount
                        FROM bookings b INNER JOIN booking_concessions bc ON bc.booking_id=b.id WHERE b.status='PAID' GROUP BY DATE(b.created_at)
                        UNION ALL
                        SELECT DATE(o.created_at) log_date, COALESCE(SUM(oi.quantity * oi.unit_price), 0) amount
                        FROM orders o INNER JOIN order_items oi ON oi.order_id=o.id WHERE o.status='PAID' AND oi.item_type='COMBO' GROUP BY DATE(o.created_at)
                    ) concession_sources GROUP BY log_date
                ) c ON c.log_date=d.log_date
                LEFT JOIN (
                    SELECT DATE(st.starts_at) log_date, SUM(sc.total_seats) total_seats
                    FROM showtimes st INNER JOIN screens sc ON sc.id=st.screen_id GROUP BY DATE(st.starts_at)
                ) capacity ON capacity.log_date=d.log_date
                ORDER BY d.log_date DESC LIMIT 7";
        $res = $this->db->query($sql);
        $logs = array();
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $logs[] = array(
                    'date' => $row['log_date'],
                    'ticket_sales' => (float)$row['ticket_sales'],
                    'concession_sales' => (float)$row['concession_sales'],
                    'total_revenue' => (float)$row['total_revenue'],
                    'total_tickets' => (int)$row['total_tickets'],
                    'occupancy_rate' => (float)$row['occupancy_rate']
                );
            }
        }

        jsonResponse(array(
            'success' => true,
            'data' => $logs
        ));
    }
}
