<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('title', 200);
            $table->string('body', 500);
            $table->string('type', 50)->default('general')
                ->comment('e.g. new_request, accepted, rejected, cancelled, completed, timeout');
            $table->unsignedBigInteger('booking_id')->nullable()->comment('Related booking ID if applicable');
            $table->string('booking_model', 50)->nullable()->comment('transport_bookings or bookings');
            $table->json('data')->nullable()->comment('Extra payload data for deep-linking');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_histories');
    }
};
