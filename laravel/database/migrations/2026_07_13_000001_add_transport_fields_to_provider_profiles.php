<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            // Vehicle owner details
            $table->string('owner_name', 150)->nullable()->after('kyc_status');
            $table->string('owner_id_number', 50)->nullable()->after('owner_name');
            $table->string('driver_name', 150)->nullable()->after('owner_id_number');
            $table->string('driver_license', 50)->nullable()->after('driver_name');
            $table->string('vehicle_number', 30)->nullable()->after('driver_license');
            $table->string('vehicle_type', 50)->nullable()->after('vehicle_number');  // bike, auto, scorpio etc.

            // Usage checkboxes (stored as JSON flags)
            $table->boolean('is_passenger_vehicle')->default(false)->after('vehicle_type');
            $table->boolean('is_goods_vehicle')->default(false)->after('is_passenger_vehicle');
            $table->boolean('is_delivery_vehicle')->default(false)->after('is_goods_vehicle');

            // Per-km fare set by owner
            $table->decimal('per_km_rate', 8, 2)->nullable()->after('is_delivery_vehicle');

            // Referral code (agent)
            $table->string('referral_code', 30)->nullable()->after('per_km_rate');
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'owner_name', 'owner_id_number', 'driver_name', 'driver_license',
                'vehicle_number', 'vehicle_type',
                'is_passenger_vehicle', 'is_goods_vehicle', 'is_delivery_vehicle',
                'per_km_rate', 'referral_code',
            ]);
        });
    }
};
