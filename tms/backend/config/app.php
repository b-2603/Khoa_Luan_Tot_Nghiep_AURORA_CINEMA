<?php

return array(
    'name' => 'Aurora Cinema - Theater Management System (TMS)',
    'env' => 'local',
    'debug' => true,
    'db' => array(
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'aurora_tms',
        'username' => 'root',
        'password' => '',
    ),
    'allowed_origins' => array(
        'http://localhost:5175',
        'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
    ),
);
