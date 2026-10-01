<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add notification_timeout_seconds to settings table.
     * Admin panel se configure kiya ja sakta hai.
     */
    public function up(): void
    {
        // Check if settings table exists and add column if needed
        if (Schema::hasTable('settings') && !Schema::hasColumn('settings', 'notification_timeout_seconds')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->unsignedInteger('notification_timeout_seconds')->default(30)
                    ->comment('Seconds before a job request auto-times-out and moves to next provider');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'notification_timeout_seconds')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->dropColumn('notification_timeout_seconds');
            });
        }
    }
};
