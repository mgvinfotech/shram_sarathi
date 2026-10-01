<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wallet extends Model
{
    protected $fillable = [
        'user_id',
        'balance',
        'hold_balance',
        'total_earned',
        'total_withdrawn',
        'pending_bonus_balance',
        'withdrawable_balance',
    ];

    protected $casts = [
        'balance'          => 'float',
        'hold_balance'     => 'float',
        'total_earned'     => 'float',
        'total_withdrawn'  => 'float',
        'pending_bonus_balance' => 'float',
        'withdrawable_balance'  => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
