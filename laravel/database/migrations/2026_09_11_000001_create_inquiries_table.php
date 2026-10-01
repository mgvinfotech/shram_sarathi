<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('inquiries')) {
            Schema::create('inquiries', function (Blueprint $table) {
                $table->id();
                $table->string('reference_no')->unique();
                $table->string('service');
                $table->string('location')->nullable();
                $table->date('preferred_date')->nullable();
                $table->string('name');
                $table->string('mobile', 20);
                $table->string('email')->nullable();
                $table->string('user_type')->default('Customer');
                $table->string('workers_count')->nullable();
                $table->string('shift')->nullable();
                $table->text('message')->nullable();
                $table->string('status')->default('Pending');
                $table->string('ip_address')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiries');
    }
};
