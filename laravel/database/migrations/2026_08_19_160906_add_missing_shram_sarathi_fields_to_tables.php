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
            // Agent Fields
            $table->string('payout_type')->nullable(); // UPI, Bank
            $table->string('upi_id')->nullable();
            $table->json('bank_details')->nullable(); // JSON for bank details

            // Customer Fields
            $table->string('customer_type')->nullable(); // Individual, Business
            $table->string('firm_name')->nullable();
            $table->string('location_type')->nullable(); // Home, Shop, Site
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            // Vehicle / Transport Partner fields
            $table->string('rc_number')->nullable();
            $table->string('rc_image_url')->nullable();
            $table->string('insurance_image_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'payout_type',
                'upi_id',
                'bank_details',
                'customer_type',
                'firm_name',
                'location_type'
            ]);
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'rc_number',
                'rc_image_url',
                'insurance_image_url'
            ]);
        });
    }
};
