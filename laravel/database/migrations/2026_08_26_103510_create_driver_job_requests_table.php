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
        Schema::create('driver_job_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('assigned_driver_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->string('job_mode'); // daily, permanent
            $table->string('driver_type'); // commercial, private, heavy
            $table->string('vehicle_type'); // suv, dzire, hatchback, truck
            $table->text('description')->nullable();
            
            $table->integer('num_drivers')->default(1);
            $table->integer('booked_spots')->default(0);
            
            $table->decimal('wage', 10, 2);
            $table->string('address');
            $table->string('nearest_place')->nullable();
            $table->decimal('lat', 10, 8)->nullable();
            $table->decimal('lng', 11, 8)->nullable();
            
            $table->date('start_date')->nullable();
            $table->string('start_time')->nullable(); // morning, afternoon, night, or specific time
            
            $table->enum('status', ['pending', 'searching', 'negotiating', 'accepted', 'completed', 'cancelled', 'no_provider'])->default('pending');
            $table->json('rejected_drivers')->nullable();
            
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_job_requests');
    }
};
