<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services (Google & Facebook OAuth 2.0 Credentials)
    |--------------------------------------------------------------------------
    */

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/google/callback'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI', 'http://localhost:8000/api/v1/auth/facebook/callback'),
    ],

];
