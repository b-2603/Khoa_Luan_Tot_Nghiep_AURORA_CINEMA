<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasFactory;

    protected $fillable = [
        'staff_code',
        'name',
        'email',
        'password',
        'google_id',
        'facebook_id',
        'avatar',
        'role',
        'department',
        'phone',
        'join_date',
        'status',
        'performance_score'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];
}
