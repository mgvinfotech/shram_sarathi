<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE `support_tickets` MODIFY COLUMN `priority` VARCHAR(50) NOT NULL DEFAULT 'normal'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `support_tickets` MODIFY COLUMN `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium'");
    }
};
