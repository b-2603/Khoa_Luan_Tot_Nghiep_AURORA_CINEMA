<?php

class StaffController
{
    private $db;

    public function __construct($database)
    {
        $this->db = $database;
    }

    public function index()
    {
        $res = $this->db->query("SELECT * FROM tms_staff_shifts WHERE work_date = CURDATE() ORDER BY id ASC");
        $shifts = array();
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                $shifts[] = array(
                    'id' => (int)$row['id'],
                    'name' => $row['staff_name'],
                    'position' => $row['position'],
                    'shift' => $row['shift_name'],
                    'start_time' => $row['start_time'],
                    'end_time' => $row['end_time'],
                    'status' => $row['status'],
                    'check_in' => $row['check_in_at']
                );
            }
        }

        jsonResponse(array(
            'success' => true,
            'data' => $shifts
        ));
    }
}
