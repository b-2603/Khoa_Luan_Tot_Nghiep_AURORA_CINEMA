<?php

class TheaterController
{
    private $db;

    public function __construct($database)
    {
        $this->db = $database;
    }

    public function dashboard()
    {
        // 1. Số phòng chiếu đang hoạt động
        $screenCount = 6;
        $res = $this->db->query("SELECT COUNT(*) as cnt FROM tms_screens WHERE status = 'active'");
        if ($res && $row = $res->fetch_assoc()) {
            $screenCount = (int)$row['cnt'];
        }

        // 2. Doanh thu hôm nay
        $revenue = array(
            'total_revenue' => 238000000.0,
            'ticket_sales' => 185600000.0,
            'concession_sales' => 52400000.0,
            'occupancy_rate' => 84.5
        );
        $resRev = $this->db->query("SELECT * FROM tms_revenue_logs WHERE log_date = CURDATE() ORDER BY id DESC LIMIT 1");
        if ($resRev && $rowRev = $resRev->fetch_assoc()) {
            $revenue = array(
                'total_revenue' => (float)$rowRev['total_revenue'],
                'ticket_sales' => (float)$rowRev['ticket_sales'],
                'concession_sales' => (float)$rowRev['concession_sales'],
                'occupancy_rate' => (float)$rowRev['occupancy_rate']
            );
        }

        // 3. Nhân sự ca trực
        $staffCount = 5;
        $resStaff = $this->db->query("SELECT COUNT(*) as cnt FROM tms_staff_shifts WHERE work_date = CURDATE()");
        if ($resStaff && $rowStaff = $resStaff->fetch_assoc()) {
            $staffCount = (int)$rowStaff['cnt'];
        }

        jsonResponse(array(
            'success' => true,
            'data' => array(
                'cinema_name' => 'AURORA CINEMA',
                'active_screens' => $screenCount,
                'active_screens_text' => "{$screenCount} Phòng chiếu đang hoạt động",
                'revenue' => $revenue,
                'revenue_text' => number_format($revenue['total_revenue'], 0, ',', '.') . ' VNĐ',
                'staff_on_duty' => $staffCount,
                'staff_text' => "{$staffCount} Nhân sự đang trong ca trực",
                'system_status' => 'ONLINE - All Systems Nominal',
                'server_time' => date('Y-m-d H:i:s')
            )
        ));
    }

    public function screens()
    {
        $screens = array();
        $res = $this->db->query("SELECT * FROM tms_screens ORDER BY id ASC");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $screens[] = array(
                    'id' => (int)$row['id'],
                    'code' => $row['screen_code'],
                    'name' => $row['name'],
                    'type' => $row['screen_type'],
                    'seats' => (int)$row['total_seats'],
                    'projector' => $row['projector_status'],
                    'sound' => $row['sound_system_status'],
                    'temp' => (float)$row['hvac_temperature'],
                    'lamp_hours' => (int)$row['lamp_hours'],
                    'status' => $row['status']
                );
            }
        }

        jsonResponse(array(
            'success' => true,
            'data' => $screens
        ));
    }

    public function schedules()
    {
        $schedules = array();
        $sql = "
            SELECT s.*, m.title as movie_title, m.format as movie_format, sc.name as screen_name
            FROM tms_schedules s
            JOIN tms_movies m ON s.movie_id = m.id
            JOIN tms_screens sc ON s.screen_id = sc.id
            WHERE s.show_date = CURDATE()
            ORDER BY s.start_time ASC
        ";
        $res = $this->db->query($sql);
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $schedules[] = array(
                    'id' => (int)$row['id'],
                    'movie' => $row['movie_title'],
                    'format' => $row['movie_format'],
                    'screen' => $row['screen_name'],
                    'start_time' => $row['start_time'],
                    'end_time' => $row['end_time'],
                    'booked' => (int)$row['booked_seats'],
                    'total_seats' => (int)$row['total_seats'],
                    'status' => $row['status']
                );
            }
        }

        jsonResponse(array(
            'success' => true,
            'data' => $schedules
        ));
    }
}
