<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\TransportBooking;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WorkingLocation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportBlueprintTest extends TestCase
{
    public function test_transport_blueprint_end_to_end_flow()
    {
        // 1. Create Customer and Driver with Wallets
        $customer = User::create([
            'name' => 'Amit Customer',
            'phone' => '9800000010',
            'role' => 'customer',
        ]);
        Wallet::create(['user_id' => $customer->id, 'balance' => 500.0]);

        $driver = User::create([
            'name' => 'Ramesh Driver',
            'phone' => '9400000022',
            'role' => 'provider',
        ]);
        $driverWallet = Wallet::create(['user_id' => $driver->id, 'balance' => 100.0]);

        $profile = ProviderProfile::create([
            'user_id' => $driver->id,
            'category' => 'transport',
            'driver_name' => 'Ramesh Kumar',
            'vehicle_number' => 'UP65-AB-1234',
            'vehicle_type' => 'wagonr_dzire',
            'is_passenger_vehicle' => true,
            'is_goods_vehicle' => false,
            'is_delivery_vehicle' => false,
            'per_km_rate' => 15.0,
            'is_online' => true,
            'current_lat' => 26.0416,
            'current_lng' => 82.2694,
        ]);

        // 2. Test Calculate Fare (Immediate 7% vs Advance 5%)
        $calcRes = $this->actingAs($customer, 'sanctum')->postJson('/api/transport/calculate-fare', [
            'booking_type' => 'immediate',
            'service_type' => 'passenger',
            'vehicle_type' => 'wagonr_dzire',
            'pickup_address' => 'Lambhua, UP',
            'drop_address' => 'Sultanpur, UP',
            'work_description' => '4 passengers with 2 luggage bags',
        ]);
        $calcRes->assertStatus(200);
        $calcRes->assertJsonFragment(['commission_pct' => 7.0]);

        // 3. Test Customer Broadcast Booking
        $bookRes = $this->actingAs($customer, 'sanctum')->postJson('/api/transport/book', [
            'booking_type' => 'immediate',
            'service_type' => 'passenger',
            'vehicle_type' => 'wagonr_dzire',
            'pickup_address' => 'Lambhua, UP',
            'pickup_lat' => 26.0416,
            'pickup_lng' => 82.2694,
            'drop_address' => 'Sultanpur, UP',
            'drop_lat' => 26.2648,
            'drop_lng' => 82.0727,
            'work_description' => '4 passengers with 2 luggage bags',
            'distance_km' => 12.98,
            'per_km_rate' => 15.0,
            'total_fare' => 195.0,
            'offered_fare' => 195.0,
        ]);
        $bookRes->assertStatus(200);
        $bookingId = $bookRes->json('booking_id');
        $this->assertNotNull($bookingId);

        // 4. Test Driver Pending Request
        $pendingRes = $this->actingAs($driver, 'sanctum')->getJson('/api/transport/driver/pending');
        $pendingRes->assertStatus(200);
        $pendingRes->assertJsonFragment(['has_request' => true, 'booking_id' => $bookingId]);

        // 5. Test Driver Cross Offer (Negotiation)
        $counterRes = $this->actingAs($driver, 'sanctum')->postJson('/api/transport/driver/counter', [
            'booking_id' => $bookingId,
            'wage' => 220.0,
            'message' => 'Lambhua to Sultanpur mera kiraya 220 rahega',
        ]);
        $counterRes->assertStatus(200);
        $counterRes->assertJsonFragment(['status' => 'negotiating']);

        // 6. Test Non-Self-Acceptance: Driver CANNOT accept their own counter offer
        $driverSelfAcceptRes = $this->actingAs($driver, 'sanctum')->postJson('/api/transport/driver/accept', [
            'booking_id' => $bookingId,
        ]);
        $driverSelfAcceptRes->assertStatus(400);

        // 7. Test Customer Accepts Driver's Counter Offer
        $custAcceptRes = $this->actingAs($customer, 'sanctum')->postJson('/api/transport/customer/accept', [
            'booking_id' => $bookingId,
        ]);
        $custAcceptRes->assertStatus(200);
        $custAcceptRes->assertJsonFragment(['status' => 'accepted']);

        // Verify Driver State becomes BUSY and Wallet debited
        $driverProfileFresh = ProviderProfile::where('user_id', $driver->id)->first();
        $this->assertFalse((bool) $driverProfileFresh->is_online, 'Driver must be marked BUSY');

        $driverWalletFresh = Wallet::where('user_id', $driver->id)->first();
        $this->assertEquals(100.0 - 15.40, $driverWalletFresh->balance, 'Commission must be deducted from wallet');

        // 8. Test Digital Agreement
        $agreementRes = $this->actingAs($customer, 'sanctum')->getJson("/api/transport/booking/{$bookingId}/agreement");
        $agreementRes->assertStatus(200);
        $agreementRes->assertJsonFragment(['status' => 'स्वीकृत (Locked)', 'agreed_fare' => 220.0]);

        // 9. Test Driver Marks Trip as Done / Completed
        $completeRes = $this->actingAs($driver, 'sanctum')->postJson('/api/transport/driver/complete', [
            'booking_id' => $bookingId,
        ]);
        $completeRes->assertStatus(200);

        // Verify Driver State restored back to AVAILABLE (Online)
        $driverProfileAfterDone = ProviderProfile::where('user_id', $driver->id)->first();
        $this->assertTrue((bool) $driverProfileAfterDone->is_online, 'Driver must be restored to AVAILABLE');
    }
}
