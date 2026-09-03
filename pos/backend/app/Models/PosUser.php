<?php

namespace App\Models;

class PosUser
{
    public int $id;
    public string $username;
    public string $passwordHash;
    public string $fullName;
    public string $role;
    public string $status;

    public function __construct(int $id, string $username, string $passwordHash, string $fullName, string $role, string $status)
    {
        $this->id = $id;
        $this->username = $username;
        $this->passwordHash = $passwordHash;
        $this->fullName = $fullName;
        $this->role = $role;
        $this->status = $status;
    }
}
