<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Booking extends Model
{
    protected $fillable = [
        'customer_id',
        'provider_id',
        'category',
        'sub_category',
        'status',
        'ivr_response',
        'call_sid',
        'ivr_call_sid',
        'call_duration',
        'payment_id',
        'customer_lat',
        'customer_lng',
        'customer_address',
        'notes',
        'confirmed_at',
        // Contractor booking fields
        'quantity',
        'total_bill',
        'advance_10pct',
        'secret_pin',
        'work_date',
        'work_time',
        'work_terms',
        'pin_confirmed_at',
        'advance_debited',
    ];

    protected $casts = [
        'customer_lat' => 'float',
        'customer_lng' => 'float',
        'confirmed_at' => 'datetime',
        'quantity' => 'integer',
        'total_bill' => 'float',
        'advance_10pct' => 'float',
        'pin_confirmed_at' => 'datetime',
        'advance_debited' => 'boolean',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
