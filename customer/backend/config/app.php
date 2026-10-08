<?php

return [
    'name' => env('APP_NAME', 'AuroraCustomer'),
    'env' => env('APP_ENV', 'local'),
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => 'Asia/Ho_Chi_Minh',
    'locale' => 'vi',
    'fallback_locale' => 'en',
    'faker_locale' => 'vi_VN',
    'maintenance' => ['driver' => 'file'],
];
