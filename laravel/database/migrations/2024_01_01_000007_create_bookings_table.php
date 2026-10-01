<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users');
            $table->foreignId('provider_id')->constrained('users');
            $table->string('category', 50);
            $table->string('sub_category', 50)->nullable();
            $table->enum('status', ['pending', 'call_initiated', 'call_done', 'confirmed', 'rejected', 'refunded', 'completed'])->default('pending');
            $table->enum('ivr_response', ['pending', 'accepted', 'rejected', 'no_response'])->default('pending');
            $table->string('call_sid', 100)->nullable();
            $table->string('ivr_call_sid', 100)->nullable();
            $table->integer('call_duration')->nullable();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->decimal('customer_lat', 10, 7)->nullable();
            $table->decimal('customer_lng', 10, 7)->nullable();
            $table->text('customer_address')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
