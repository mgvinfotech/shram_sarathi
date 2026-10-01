<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transport_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vehicle_owner_id')->constrained('users')->cascadeOnDelete();

            // Booking type & vehicle
            $table->enum('booking_type', ['immediate', 'advance'])->default('immediate');
            $table->string('vehicle_category', 30);   // passenger / goods / delivery
            $table->string('vehicle_type', 50);        // bike, auto, scorpio, pickup, etc.

            // Pickup & Drop
            $table->string('pickup_address', 500);
            $table->decimal('pickup_lat', 10, 7)->nullable();
            $table->decimal('pickup_lng', 10, 7)->nullable();
            $table->string('drop_address', 500);
            $table->decimal('drop_lat', 10, 7)->nullable();
            $table->decimal('drop_lng', 10, 7)->nullable();

            // Distance & Fare
            $table->decimal('distance_km', 8, 2)->nullable();
            $table->decimal('per_km_rate', 8, 2)->nullable();
            $table->decimal('total_fare', 10, 2)->nullable();
            $table->decimal('commission_pct', 5, 2)->default(5.00);   // 5% normal, 7% urgent
            $table->decimal('commission_amount', 10, 2)->nullable();

            // Secret PIN flow
            $table->string('secret_pin', 4)->nullable();
            $table->enum('status', [
                'searching',      // Customer searching for driver
                'driver_found',   // Driver accepted
                'booked',         // Booking confirmed, PIN shown to customer
                'active',         // Driver entered PIN - trip started, commission deducted
                'completed',      // Trip completed
                'cancelled',      // Cancelled before PIN
                'penalty',        // Cancelled after PIN (commission forfeit)
            ])->default('searching');

            $table->timestamp('pin_verified_at')->nullable();
            $table->boolean('commission_debited')->default(false);

            // For advance bookings
            $table->date('scheduled_date')->nullable();
            $table->time('scheduled_time')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transport_bookings');
    }
};
