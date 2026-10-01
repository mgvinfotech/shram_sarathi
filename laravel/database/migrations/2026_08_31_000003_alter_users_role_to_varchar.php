<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Alter `users`.`role` column to VARCHAR(50) to prevent any truncation errors.
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'customer'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY COLUMN `role` ENUM(
                'customer',
                'provider',
                'admin',
                'agent',
                'sub_admin',
                'labour',
                'karigar',
                'driver',
                'contractor'
            ) NOT NULL DEFAULT 'customer'
        ");
    }
};
