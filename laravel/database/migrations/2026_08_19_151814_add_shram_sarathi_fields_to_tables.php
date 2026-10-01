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
            $table->unsignedBigInteger('agent_referral_id')->nullable();
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->string('experience_years')->nullable();
            $table->decimal('expected_daily_wage', 8, 2)->nullable();
            $table->decimal('radius_km', 8, 2)->nullable();
            $table->string('base_location_address')->nullable();
            $table->json('contract_types')->nullable();
            $table->string('team_size')->nullable();
            $table->string('dl_number')->nullable();
            $table->string('dl_category')->nullable();
            $table->boolean('is_dl_verified')->default(false);
        });

        Schema::table('wallets', function (Blueprint $table) {
            $table->decimal('pending_bonus_balance', 10, 2)->default(0);
            $table->decimal('withdrawable_balance', 10, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('agent_referral_id');
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'experience_years', 'expected_daily_wage', 'radius_km',
                'base_location_address', 'contract_types', 'team_size',
                'dl_number', 'dl_category', 'is_dl_verified'
            ]);
        });

        Schema::table('wallets', function (Blueprint $table) {
            $table->dropColumn(['pending_bonus_balance', 'withdrawable_balance']);
        });
    }
};
