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
        Schema::table('labour_job_requests', function (Blueprint $table) {
            $table->string('duration', 50)->nullable()->after('start_time');
            $table->string('media_url', 500)->nullable()->after('duration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('labour_job_requests', function (Blueprint $table) {
            $table->dropColumn(['duration', 'media_url']);
        });
    }
};
