<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabourJobRequest extends Model
{
    protected $table = 'labour_job_requests';

    protected $fillable = [
        'customer_id',
        'assigned_provider_id',
        'category',
        'sub_category',
        'job_mode',
        'work_type',
        'wage',
        'time_shift',
        'start_time',
        'labour_count',
        'booked_spots',
        'live_chat_enabled',
        'description',
        'address',
        'lat',
        'lng',
        'duration',
        'media_url',
        'district',
        'state',
        'status',
        'rejected_providers',
        'assigned_at',
        'accepted_at',
        'completed_at',
    ];

    protected $casts = [
        'lat'                => 'float',
        'lng'                => 'float',
        'wage'               => 'float',
        'labour_count'       => 'integer',
        'booked_spots'       => 'integer',
        'live_chat_enabled'  => 'boolean',
        'rejected_providers' => 'array',
        'assigned_at'        => 'datetime',
        'accepted_at'        => 'datetime',
        'completed_at'       => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_provider_id');
    }

    public function offers()
    {
        return $this->hasMany(LabourJobOffer::class, 'labour_job_request_id');
    }
}
