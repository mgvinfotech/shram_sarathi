<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderProfile extends Model
{
    protected $fillable = [
        'user_id',
        'category',
        'sub_categories',
        'skills_description',
        'current_lat',
        'current_lng',
        'is_online',
        'total_bookings',
        'rating',
        'rating_count',
        'photo_url',
        'experience_years',
        'expected_daily_wage',
        'radius_km',
        'base_location_address',
        // Contractor KYC
        'firm_name',
        'pan_number',
        'pan_url',
        'bank_account_number',
        'bank_ifsc',
        'bank_name',
        'base_rate',
        'base_rate_unit',
        'rate_category',
        'kyc_status',
        'contract_types',
        'team_size',
        // Transport / Vehicle owner fields
        'owner_name',
        'owner_id_number',
        'driver_name',
        'driver_license',
        'vehicle_number',
        'vehicle_type',
        'is_passenger_vehicle',
        'is_goods_vehicle',
        'is_delivery_vehicle',
        'per_km_rate',
        'referral_code',
        'dl_number',
        'dl_category',
        'is_dl_verified',
        'rc_image_url',
        'insurance_image_url',
    ];

    protected $casts = [
        'sub_categories'       => 'array',
        'contract_types'       => 'array',
        'is_online'            => 'boolean',
        'current_lat'          => 'float',
        'current_lng'          => 'float',
        'rating'               => 'float',
        'base_rate'            => 'float',
        'per_km_rate'          => 'float',
        'expected_daily_wage'  => 'float',
        'radius_km'            => 'float',
        'is_passenger_vehicle' => 'boolean',
        'is_goods_vehicle'     => 'boolean',
        'is_delivery_vehicle'  => 'boolean',
        'is_dl_verified'       => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function workingLocations(): HasMany
    {
        return $this->hasMany(WorkingLocation::class);
    }
}
