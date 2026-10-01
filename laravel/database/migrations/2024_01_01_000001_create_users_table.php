<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 15)->unique();
            $table->string('name', 100);
            $table->string('email', 150)->nullable()->unique();
            $table->string('password', 200)->nullable();
            $table->enum('role', ['customer', 'provider', 'admin', 'agent', 'sub_admin'])->default('customer');
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_blacklisted')->default(false);
            $table->text('blacklist_reason')->nullable();
            $table->json('permissions')->nullable();
            $table->foreignId('created_by_agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('aadhaar_url', 500)->nullable();
            $table->string('eshram_url', 500)->nullable();
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
