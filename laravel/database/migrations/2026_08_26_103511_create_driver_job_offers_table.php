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
        Schema::create('driver_job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_job_request_id')->constrained('driver_job_requests')->onDelete('cascade');
            $table->foreignId('provider_id')->constrained('users')->onDelete('cascade');
            $table->decimal('proposed_wage', 10, 2)->nullable();
            $table->enum('status', ['pending', 'cross_offer', 'accepted', 'rejected', 'cancelled'])->default('pending');
            $table->json('chat_messages')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_job_offers');
    }
};
