<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('users');
            $table->foreignId('admin_id')->constrained('users');
            $table->string('gift_name', 200);
            $table->text('message');
            $table->enum('status', ['pending', 'dispatched', 'delivered'])->default('pending');
            $table->string('courier_name', 100)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->boolean('label_printed')->default(false);
            $table->string('ivr_call_sid', 100)->nullable();
            $table->timestamp('ivr_sent_at')->nullable();
            $table->boolean('sms_sent')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rewards');
    }
};
