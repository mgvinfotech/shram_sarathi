<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transport_bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('transport_bookings', 'service_type')) {
                $table->string('service_type', 30)->default('passenger')->after('booking_type'); // passenger, goods, delivery
            }
            if (!Schema::hasColumn('transport_bookings', 'work_description')) {
                $table->text('work_description')->nullable()->after('drop_address'); // Voice / text work details
            }
            if (!Schema::hasColumn('transport_bookings', 'offered_fare')) {
                $table->decimal('offered_fare', 10, 2)->nullable()->after('total_fare'); // Customer proposed fare
            }
            if (!Schema::hasColumn('transport_bookings', 'agreed_fare')) {
                $table->decimal('agreed_fare', 10, 2)->nullable()->after('offered_fare'); // Final locked fare
            }
            if (!Schema::hasColumn('transport_bookings', 'messages')) {
                $table->json('messages')->nullable()->after('rejected_drivers'); // Negotiation messages array
            }
        });
    }

    public function down(): void
    {
        Schema::table('transport_bookings', function (Blueprint $table) {
            $table->dropColumn([
                'service_type',
                'work_description',
                'offered_fare',
                'agreed_fare',
                'messages',
            ]);
        });
    }
};
