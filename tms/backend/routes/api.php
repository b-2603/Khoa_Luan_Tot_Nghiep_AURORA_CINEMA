<?php

return array(
    'login' => array('AuthController', 'login'),
    'logout' => array('AuthController', 'logout'),
    'me' => array('AuthController', 'me'),
    'sso' => array('AuthController', 'sso'),
    'dashboard' => array('TheaterController', 'dashboard'),
    'screens' => array('TheaterController', 'screens'),
    'schedules' => array('TheaterController', 'schedules'),
    'revenue' => array('RevenueController', 'index'),
    'staff' => array('StaffController', 'index'),
);
