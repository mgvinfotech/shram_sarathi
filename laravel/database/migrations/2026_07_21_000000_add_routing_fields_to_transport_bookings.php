<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_bookings', function (Blueprint $table) {
            $table->timestamp('assigned_at')->nullable()->after('status');
            $table->json('rejected_drivers')->nullable()->after('assigned_at');
        });
    }

    public function down(): void
    {
        Schema::table('transport_bookings', function (Blueprint $table) {
            $table->dropColumn(['assigned_at', 'rejected_drivers']);
        });
    }
};
