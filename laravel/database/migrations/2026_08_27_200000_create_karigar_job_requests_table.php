<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Karigar (Craftsman) Job Requests Table
     * 
     * This table stores customer requests for skilled craftsmen (electricians, plumbers, carpenters, etc.)
     * Similar to labour_job_requests but specifically for skilled workers (karigars).
     */
    public function up(): void
    {
        Schema::create('karigar_job_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_karigar_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Job Type & Details
            $table->string('karigar_type')->nullable();  // Type of karigar: electrician, plumber, carpenter, painter, welder
            $table->string('work_type')->nullable();     // Specific work: wiring, fixing fan, painting room
            $table->text('description')->nullable();     // Detailed work description (voice/text)
            $table->string('job_mode')->default('daily'); // daily | permanent
            
            // Payment
            $table->decimal('wage', 10, 2)->nullable();  // Proposed rate per karigar
            $table->string('time_shift')->nullable();    // full_day | half_day | piece_work
            $table->string('duration')->nullable();      // Estimated duration: 1 day, 2 days, 1 week
            $table->string('media_url')->nullable();     // Photo/Video of work site
            
            // Scheduling
            $table->string('start_date')->nullable();    // Date when work should start
            $table->string('start_time')->nullable();    // Time slot: today, tomorrow_morning, specific time
            
            // Multi-Karigar Support (Like Labour Module)
            $table->integer('karigar_count')->default(1);    // Number of karigars needed
            $table->integer('booked_spots')->default(0);     // How many have accepted
            $table->boolean('live_chat_enabled')->default(false);
            
            // Location
            $table->text('address');
            $table->string('nearest_place')->nullable();  // Nearest landmark
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('district')->nullable();
            $table->string('state')->nullable();
            
            // Assignment & Status
            $table->json('rejected_karigars')->nullable();  // Array of provider IDs who rejected
            $table->timestamp('assigned_at')->nullable();
            $table->enum('status', ['searching', 'pending', 'negotiating', 'accepted', 'rejected', 'cancelled', 'completed', 'no_provider'])->default('searching');
            
            // Timestamps
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('customer_id');
            $table->index('assigned_karigar_id');
            $table->index('status');
            $table->index(['lat', 'lng']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('karigar_job_requests');
    }
};
