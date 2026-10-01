<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransportBooking extends Model
{
    protected $fillable = [
        'customer_id',
        'vehicle_owner_id',
        'booking_type',
        'service_type',
        'vehicle_category',
        'vehicle_type',
        'pickup_address',
        'pickup_lat',
        'pickup_lng',
        'drop_address',
        'drop_lat',
        'drop_lng',
        'work_description',
        'distance_km',
        'per_km_rate',
        'total_fare',
        'offered_fare',
        'agreed_fare',
        'commission_pct',
        'commission_amount',
        'secret_pin',
        'status',
        'pin_verified_at',
        'commission_debited',
        'scheduled_date',
        'scheduled_time',
        'assigned_at',
        'rejected_drivers',
        'messages',
    ];

    protected $casts = [
        'pickup_lat'        => 'float',
        'pickup_lng'        => 'float',
        'drop_lat'          => 'float',
        'drop_lng'          => 'float',
        'distance_km'       => 'float',
        'per_km_rate'       => 'float',
        'total_fare'        => 'float',
        'offered_fare'      => 'float',
        'agreed_fare'       => 'float',
        'commission_pct'    => 'float',
        'commission_amount' => 'float',
        'commission_debited'=> 'boolean',
        'pin_verified_at'   => 'datetime',
        'assigned_at'       => 'datetime',
        'rejected_drivers'  => 'array',
        'messages'          => 'array',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function vehicleOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'vehicle_owner_id');
    }
}
