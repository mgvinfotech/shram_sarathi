<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('razorpay_order_id', 100)->unique();
            $table->string('razorpay_payment_id', 100)->nullable();
            $table->string('razorpay_refund_id', 100)->nullable();
            $table->string('razorpay_signature', 300)->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 5)->default('INR');
            $table->enum('status', ['created', 'success', 'failed', 'refunded', 'refund_pending'])->default('created');
            $table->string('category', 50)->nullable();
            $table->foreignId('provider_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('failure_reason')->nullable();
            $table->text('refund_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
