<?php

namespace App\Http\Controllers\Api\V1;

class HealthController
{
    public function __construct(private readonly mixed $authService = null)
    {
    }

    public function index(): void
    {
        $response = [
            'success' => true,
            'message' => 'POS backend đang hoạt động.',
            'timestamp' => date('c'),
            'service' => 'aurora-pos',
        ];

        echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}
