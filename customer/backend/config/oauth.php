<?php

return [
    'frontend_url' => env('CUSTOMER_FRONTEND_URL', 'http://localhost:3000'),
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID', ''),
        'client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'redirect_uri' => env('GOOGLE_REDIRECT_URI', 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=google'),
    ],
    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID', ''),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET', ''),
        'graph_version' => env('FACEBOOK_GRAPH_VERSION', 'v25.0'),
        'redirect_uri' => env('FACEBOOK_REDIRECT_URI', 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php?action=oauth_callback&provider=facebook'),
    ],
];
