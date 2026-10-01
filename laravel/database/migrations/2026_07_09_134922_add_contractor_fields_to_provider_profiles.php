<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            // KYC fields
            $table->string('firm_name', 200)->nullable()->after('photo_url');
            $table->string('pan_number', 20)->nullable()->after('firm_name');
            $table->string('pan_url', 500)->nullable()->after('pan_number');
            $table->string('bank_account_number', 50)->nullable()->after('pan_url');
            $table->string('bank_ifsc', 20)->nullable()->after('bank_account_number');
            $table->string('bank_name', 100)->nullable()->after('bank_ifsc');

            // Base-rate pricing
            $table->decimal('base_rate', 10, 2)->nullable()->after('bank_name');
            $table->string('base_rate_unit', 100)->nullable()->after('base_rate'); // e.g. "per 100 log", "per Sq.Ft"
            $table->string('rate_category', 50)->nullable()->after('base_rate_unit'); // catering, construction, wiring

            // KYC status
            $table->enum('kyc_status', ['pending', 'submitted', 'verified', 'rejected'])->default('pending')->after('rate_category');
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'firm_name', 'pan_number', 'pan_url',
                'bank_account_number', 'bank_ifsc', 'bank_name',
                'base_rate', 'base_rate_unit', 'rate_category', 'kyc_status',
            ]);
        });
    }
};
