<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('labour_job_requests', function (Blueprint $table) {
            $table->string('job_mode', 20)->default('daily')->after('category');    // daily | permanent
            $table->string('work_type', 100)->nullable()->after('job_mode');        // plaster, brick, painting...
            $table->decimal('wage', 10, 2)->nullable()->after('work_type');         // per-labour wage
            $table->string('time_shift', 20)->nullable()->after('wage');            // full_day | half_day | piece
            $table->string('start_time', 20)->nullable()->after('time_shift');      // now | today | tomorrow | custom
            $table->tinyInteger('labour_count')->default(1)->after('start_time');   // always 1 for labour mode
        });
    }

    public function down(): void
    {
        Schema::table('labour_job_requests', function (Blueprint $table) {
            $table->dropColumn(['job_mode', 'work_type', 'wage', 'time_shift', 'start_time', 'labour_count']);
        });
    }
};

