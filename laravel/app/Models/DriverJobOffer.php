<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverJobOffer extends Model
{
    protected $fillable = [
        'driver_job_request_id',
        'provider_id',
        'proposed_wage',
        'status',
        'chat_messages',
    ];

    protected $casts = [
        'proposed_wage' => 'float',
        'chat_messages' => 'array',
    ];

    public function getMessagesAttribute()
    {
        return $this->chat_messages ?? [];
    }

    public function setMessagesAttribute($value)
    {
        $this->attributes['chat_messages'] = is_array($value) ? json_encode($value) : $value;
    }

    public function jobRequest(): BelongsTo
    {
        return $this->belongsTo(DriverJobRequest::class, 'driver_job_request_id');
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(DriverJobRequest::class, 'driver_job_request_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }
}
