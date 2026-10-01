<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inquiry extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference_no',
        'service',
        'location',
        'preferred_date',
        'name',
        'mobile',
        'email',
        'user_type',
        'workers_count',
        'shift',
        'message',
        'status',
        'ip_address',
    ];
}
