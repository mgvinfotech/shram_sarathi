<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Karigar Job Offers Table
     * 
     * Tracks which karigars received job broadcast and their negotiation status.
     * Supports live chat negotiation between customer and multiple karigars.
     */
    public function up(): void
    {
        Schema::create('karigar_job_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karigar_job_request_id')->constrained('karigar_job_requests')->onDelete('cascade');
            $table->foreignId('provider_id')->constrained('users')->onDelete('cascade');
            
            // Offer Status
            $table->string('status')->default('pending'); // pending | negotiating | accepted | rejected | cancelled
            
            // Negotiation Chat Messages (JSON array)
            $table->json('messages')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Indexes
            $table->index('karigar_job_request_id');
            $table->index('provider_id');
            $table->index('status');
            $table->unique(['karigar_job_request_id', 'provider_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('karigar_job_offers');
    }
};
