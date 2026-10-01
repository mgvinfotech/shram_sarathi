<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE `transport_bookings` MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'searching'");
    }

    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE `transport_bookings` MODIFY COLUMN `status` ENUM('searching', 'driver_found', 'booked', 'active', 'completed', 'cancelled', 'penalty') NOT NULL DEFAULT 'searching'");
    }
};
