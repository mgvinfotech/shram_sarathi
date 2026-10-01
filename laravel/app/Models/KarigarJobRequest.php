<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KarigarJobRequest extends Model
{
    protected $table = 'karigar_job_requests';

    protected $fillable = [
        'customer_id',
        'assigned_karigar_id',
        'karigar_type',
        'work_type',
        'description',
        'job_mode',
        'wage',
        'time_shift',
        'duration',
        'media_url',
        'start_date',
        'start_time',
        'karigar_count',
        'booked_spots',
        'live_chat_enabled',
        'address',
        'nearest_place',
        'lat',
        'lng',
        'district',
        'state',
        'rejected_karigars',
        'assigned_at',
        'status',
        'accepted_at',
        'completed_at',
    ];

    protected $casts = [
        'wage' => 'decimal:2',
        'lat' => 'decimal:7',
        'lng' => 'decimal:7',
        'karigar_count' => 'integer',
        'booked_spots' => 'integer',
        'live_chat_enabled' => 'boolean',
        'rejected_karigars' => 'array',
        'assigned_at' => 'datetime',
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function assignedKarigar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_karigar_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(KarigarJobOffer::class, 'karigar_job_request_id');
    }
}
