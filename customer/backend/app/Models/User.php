<?php

namespace App\Models;

class User
{
    public function __construct(
        public int $id = 0,
        public string $fullName = '',
        public string $email = '',
        public string $membershipLevel = 'STANDARD',
        public int $points = 0
    ) {}
}
