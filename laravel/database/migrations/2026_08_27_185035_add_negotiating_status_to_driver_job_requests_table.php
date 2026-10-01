<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MySQL ENUM modification requires ALTER TABLE with MODIFY COLUMN
        DB::statement("ALTER TABLE driver_job_requests MODIFY COLUMN status ENUM('pending', 'searching', 'negotiating', 'accepted', 'completed', 'cancelled', 'no_provider') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'negotiating' status
        DB::statement("ALTER TABLE driver_job_requests MODIFY COLUMN status ENUM('pending', 'searching', 'accepted', 'completed', 'cancelled', 'no_provider') NOT NULL DEFAULT 'pending'");
    }
};
