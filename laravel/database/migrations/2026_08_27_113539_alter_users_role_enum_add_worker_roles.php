<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Extend the `role` ENUM column to include worker roles.
     * MySQL ENUM is case-insensitive, so we use a single consistent casing.
     * Frontend will send lowercase values mapped as follows:
     *   LABOUR -> labour, KARIGAR -> karigar, DRIVER -> driver, CONTRACTOR -> contractor
     */
    public function up(): void
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

    public function down(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY COLUMN `role` ENUM(
                'customer',
                'provider',
                'admin',
                'agent',
                'sub_admin'
            ) NOT NULL DEFAULT 'customer'
        ");
    }
};
