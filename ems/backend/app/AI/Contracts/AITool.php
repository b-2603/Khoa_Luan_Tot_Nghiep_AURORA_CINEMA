<?php

namespace App\AI\Contracts;

interface AITool
{
    public function name(): string;

    public function description(): string;

    public function schema(): array;

    public function execute(array $arguments, ?array $user = null, ?\PDO $pdo = null): array;
}
