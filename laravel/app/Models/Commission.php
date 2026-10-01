<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Commission extends Model
{
    protected $fillable = [
        'agent_id',
        'provider_id',
        'amount',
        'status',
        'first_booking_id',
        'released_at',
    ];

    protected $casts = [
        'amount'      => 'float',
        'released_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function firstBooking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'first_booking_id');
    }
}
