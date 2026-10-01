<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Contractor-specific booking fields
            $table->integer('quantity')->nullable()->after('notes');           // e.g. 100 workers
            $table->decimal('total_bill', 10, 2)->nullable()->after('quantity'); // base_rate × quantity
            $table->decimal('advance_10pct', 10, 2)->nullable()->after('total_bill'); // 10% to deduct
            $table->string('secret_pin', 10)->nullable()->after('advance_10pct'); // 4-digit PIN
            $table->string('work_date', 50)->nullable()->after('secret_pin');
            $table->string('work_time', 50)->nullable()->after('work_date');
            $table->text('work_terms')->nullable()->after('work_time');
            $table->timestamp('pin_confirmed_at')->nullable()->after('work_terms'); // when provider entered PIN
            $table->boolean('advance_debited')->default(false)->after('pin_confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'quantity', 'total_bill', 'advance_10pct',
                'secret_pin', 'work_date', 'work_time', 'work_terms',
                'pin_confirmed_at', 'advance_debited',
            ]);
        });
    }
};
