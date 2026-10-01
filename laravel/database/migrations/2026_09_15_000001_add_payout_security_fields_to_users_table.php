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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'payout_verified_at')) {
                $table->timestamp('payout_verified_at')->nullable()->after('bank_details');
            }
            if (!Schema::hasColumn('users', 'payout_cooling_until')) {
                $table->timestamp('payout_cooling_until')->nullable()->after('payout_verified_at');
            }
            if (!Schema::hasColumn('users', 'payout_history')) {
                $table->json('payout_history')->nullable()->after('payout_cooling_until');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'payout_verified_at',
                'payout_cooling_until',
                'payout_history',
            ]);
        });
    }
};
