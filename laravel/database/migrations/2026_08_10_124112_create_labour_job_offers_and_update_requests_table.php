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
        // Add booked_spots and live_chat_enabled to labour_job_requests
        Schema::table('labour_job_requests', function (Blueprint $table) {
            $table->integer('booked_spots')->default(0)->after('labour_count');
            $table->boolean('live_chat_enabled')->default(false)->after('booked_spots');
        });

        // Create labour_job_offers table
        Schema::create('labour_job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('labour_job_request_id')->constrained('labour_job_requests')->onDelete('cascade');
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
        Schema::dropIfExists('labour_job_offers');

        Schema::table('labour_job_requests', function (Blueprint $table) {
            $table->dropColumn(['booked_spots', 'live_chat_enabled']);
        });
    }
};
