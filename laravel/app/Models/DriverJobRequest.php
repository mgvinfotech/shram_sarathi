<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DriverJobRequest extends Model
{
    protected $fillable = [
        'customer_id',
        'assigned_driver_id',
        'job_mode',
        'driver_type',
        'vehicle_type',
        'description',
        'num_drivers',
        'booked_spots',
        'wage',
        'address',
        'nearest_place',
        'lat',
        'lng',
        'start_date',
        'start_time',
        'status',
        'rejected_drivers',
        'assigned_at',
        'accepted_at',
        'completed_at',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'wage' => 'float',
        'num_drivers' => 'integer',
        'booked_spots' => 'integer',
        'rejected_drivers' => 'array',
        'start_date' => 'date',
        'assigned_at' => 'datetime',
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_driver_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(DriverJobOffer::class, 'driver_job_request_id');
    }
}
