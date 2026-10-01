<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('working_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->string('district', 100)->nullable();
            $table->string('tehsil', 100)->nullable();
            $table->string('block', 100)->nullable();
            $table->string('village', 100)->nullable();
            $table->string('pincode', 10)->nullable();
            $table->string('state', 100)->default('Madhya Pradesh');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('working_locations');
    }
};
