<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reward extends Model
{
    protected $fillable = [
        'provider_id',
        'admin_id',
        'gift_name',
        'message',
        'status',
        'courier_name',
        'tracking_number',
        'label_printed',
        'ivr_call_sid',
        'ivr_sent_at',
        'sms_sent',
    ];

    protected $casts = [
        'label_printed' => 'boolean',
        'sms_sent'      => 'boolean',
        'ivr_sent_at'   => 'datetime',
    ];

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
