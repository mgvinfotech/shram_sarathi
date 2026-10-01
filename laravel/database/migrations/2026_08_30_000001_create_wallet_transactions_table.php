<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // Transaction amount (always positive)
            $table->decimal('amount', 10, 2);

            // credit = money added, debit = money removed
            $table->enum('type', ['credit', 'debit']);

            // Category helps filter in the Earnings Ledger UI
            $table->enum('category', [
                'ONBOARDING_BONUS',           // ₹10 – Labor/Driver/Karigar (hold)
                'ONBOARDING_BONUS_RELEASE',   // ₹10 – moved from hold → balance on first job
                'FRC_BONUS',                  // ₹20 – Contractor/Vehicle FRC (instant)
                'BOOKING_COMMISSION',         // ₹1  – Labour/Karigar/Driver booking
                'CONTRACTOR_COMMISSION',      // 0.20% – Contractor/Vehicle booking
                'WITHDRAWAL',                 // Agent withdrawal request
                'ADMIN_CREDIT',               // Manual admin credit
                'REVERSAL',                   // Reversal / refund
            ]);

            // Human-readable description shown in UI
            $table->string('description', 255)->nullable();

            // Reference to commission record if applicable
            $table->foreignId('commission_id')->nullable()->constrained('commissions')->nullOnDelete();

            // Running balance after this transaction (for ledger display)
            $table->decimal('balance_after', 10, 2)->default(0);

            // For hold transactions – 'held' | 'released' | 'reversed'
            $table->enum('hold_status', ['none', 'held', 'released', 'reversed'])->default('none');

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['wallet_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
