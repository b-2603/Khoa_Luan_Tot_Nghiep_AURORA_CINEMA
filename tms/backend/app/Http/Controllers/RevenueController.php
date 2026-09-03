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
        $res = $this->db->query("SELECT * FROM tms_revenue_logs ORDER BY log_date DESC LIMIT 7");
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
