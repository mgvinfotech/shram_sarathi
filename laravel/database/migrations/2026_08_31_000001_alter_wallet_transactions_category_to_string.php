<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `wallet_transactions` MODIFY COLUMN `category` VARCHAR(60) NOT NULL DEFAULT 'BOOKING_COMMISSION'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `wallet_transactions` MODIFY COLUMN `category` ENUM('ONBOARDING_BONUS', 'ONBOARDING_BONUS_RELEASE', 'FRC_BONUS', 'BOOKING_COMMISSION', 'CONTRACTOR_COMMISSION', 'WITHDRAWAL', 'ADMIN_CREDIT', 'REVERSAL') NOT NULL DEFAULT 'BOOKING_COMMISSION'");
    }
};
