<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use App\Models\Wallet;
use App\Services\CommissionService;
use Illuminate\Support\Facades\DB;

class BookingService
{
    public function __construct(private CommissionService $commissionService) {}

    /**
     * Called when a customer requests a service (before broadcasting to providers).
     */
    public function validateAndBroadcastRequest($customerId, $serviceType, $bookingDetails)
    {
        $customer = User::findOrFail($customerId);
        $customerWallet = Wallet::firstOrCreate(['user_id' => $customer->id]);

        // 1. Minimum Balance Check for Labour, Karigar, or Driver
        if (in_array($serviceType, ['LABOUR', 'KARIGAR', 'DRIVER'])) {
            $bookingFee = 20.00; // Fixed booking fee defined by admin

            if ($customerWallet->balance < $bookingFee) {
                return [
                    "status" => "ERROR",
                    "error_code" => "INSUFFICIENT_WALLET_BALANCE",
                    "message" => "बुकिंग अनुरोध भेजने के लिए आपके वॉलेट में न्यूनतम ₹{$bookingFee} होना आवश्यक है। कृपया पहले वॉलेट रिचार्ज करें।",
                    "action" => "OPEN_RECHARGE_MODAL",
                    "required_amount" => $bookingFee - $customerWallet->balance
                ];
            }

            // Create booking in PENDING_ACCEPTANCE state. No wallet deduction yet.
            $booking = Booking::create([
                'customer_id' => $customer->id,
                'service_type' => $serviceType,
                'details' => json_encode($bookingDetails),
                'status' => 'PENDING_ACCEPTANCE'
            ]);

            // Pseudo-code to broadcast to nearby providers
            // broadcast_job_to_nearby_providers($serviceType, $bookingDetails);

            return [
                "status" => "SUCCESS", 
                "message" => "अनुरोध सफलतापूर्वक भेजा गया।",
                "booking" => $booking
            ];
        }

        // 2. Contractor and Vehicle booking for customer is 100% free
        if (in_array($serviceType, ['CONTRACTOR', 'VEHICLE_TRANSPORT'])) {
            $booking = Booking::create([
                'customer_id' => $customer->id,
                'service_type' => $serviceType,
                'details' => json_encode($bookingDetails),
                'status' => 'PENDING_ACCEPTANCE'
            ]);

            // broadcast_job_to_contractors_or_vehicles($serviceType, $bookingDetails);

            return [
                "status" => "SUCCESS", 
                "message" => "अनुरोध सफलतापूर्वक भेजा गया (निःशुल्क)।",
                "booking" => $booking
            ];
        }

        return [
            "status" => "ERROR",
            "message" => "Invalid service type."
        ];
    }

    /**
     * Called when a worker (provider) hits "Accept" on a broadcasted request.
     */
    public function onWorkerAcceptBooking($bookingId, $workerId)
    {
        $booking = Booking::findOrFail($bookingId);
        $customer = $booking->customer;
        $worker = User::findOrFail($workerId);
        $customerWallet = Wallet::firstOrCreate(['user_id' => $customer->id]);

        if (in_array($booking->service_type, ['LABOUR', 'KARIGAR', 'DRIVER'])) {
            $bookingFee = 20.00;

            // Re-verify that customer still has balance (in case they made another concurrent request)
            if ($customerWallet->balance >= $bookingFee) {
                DB::transaction(function () use ($booking, $worker, $customerWallet, $bookingFee) {
                    // 1. Deduct booking fee from customer's wallet
                    $customerWallet->balance -= $bookingFee;
                    $customerWallet->save();

                    // Log transaction
                    // log_wallet_transaction($customer->id, $bookingFee, "DEBIT", "{$booking->service_type}_BOOKING_CONFIRMED");

                    // 2. Confirm booking and assign worker
                    $booking->status = "CONFIRMED";
                    $booking->provider_id = $worker->id;
                    $booking->save();

                    // 3. Process Agent Commissions (₹1 residual share etc)
                    $this->commissionService->processBookingAcceptance($booking);

                    // 4. Check if this is the worker's very first job to release ₹10 onboarding bonus
                    $this->commissionService->processFirstJobAcceptance($worker);
                });

                return [
                    "status" => "SUCCESS", 
                    "message" => "बुकिंग कन्फर्म हो गई है और शुल्क कट गया है।"
                ];
            } else {
                return [
                    "status" => "ERROR", 
                    "message" => "ग्राहक के वॉलेट में पर्याप्त बैलेंस नहीं है।"
                ];
            }
        }

        // For Contractor / Vehicle acceptance, logic is handled in onProviderAcceptBooking
        return [
            "status" => "PENDING_NEGOTIATION",
            "message" => "यह फंक्शन केवल लेबर/कारीगर/ड्राइवर के लिए है।"
        ];
    }

    /**
     * Called when a Contractor or Vehicle Partner accepts a booking.
     * Deducts commission directly from their wallet instead of the customer's.
     */
    public function onProviderAcceptBooking($bookingId, $providerId, $bookingType = "IMMEDIATE")
    {
        $booking = Booking::findOrFail($bookingId);
        $provider = User::findOrFail($providerId);
        $providerWallet = Wallet::firstOrCreate(['user_id' => $provider->id]);

        if ($booking->service_type === 'VEHICLE_TRANSPORT') {
            // commission_rate = 0.07 if booking.type == "IMMEDIATE" else 0.05
            $commissionRate = ($bookingType === 'IMMEDIATE') ? 0.07 : 0.05;
            $fare = $booking->fare ?? 0; // Assuming fare is pre-calculated or part of details
            $commissionAmount = $fare * $commissionRate;

            if ($providerWallet->balance >= $commissionAmount) {
                DB::transaction(function () use ($booking, $provider, $providerWallet, $commissionAmount) {
                    $providerWallet->balance -= $commissionAmount;
                    $providerWallet->save();

                    $booking->status = "CONFIRMED";
                    $booking->provider_id = $provider->id;
                    $booking->save();

                    // Update provider status to BUSY
                    $provider->status = 'BUSY';
                    $provider->save();

                    $this->commissionService->processBookingAcceptance($booking);
                });

                return [
                    "status" => "SUCCESS",
                    "message" => "बुकिंग कन्फर्म हो गई है और {$commissionAmount} रुपये का कमीशन आपके वॉलेट से काट लिया गया है।"
                ];
            } else {
                return [
                    "status" => "ERROR",
                    "error_code" => "INSUFFICIENT_WALLET_BALANCE",
                    "message" => "बुकिंग स्वीकार करने के लिए आपके वॉलेट में पर्याप्त बैलेंस नहीं है। कृपया रिचार्ज करें।"
                ];
            }
        }

        if ($booking->service_type === 'CONTRACTOR') {
            // Contractor deduction happens upon FINAL_ACCEPTANCE after negotiation
            $contractValue = $booking->fare ?? 0;
            $commissionAmount = $contractValue * 0.03;

            if ($providerWallet->balance >= $commissionAmount) {
                DB::transaction(function () use ($booking, $provider, $providerWallet, $commissionAmount) {
                    $providerWallet->balance -= $commissionAmount;
                    $providerWallet->save();

                    $booking->status = "LOCKED";
                    $booking->provider_id = $provider->id;
                    $booking->save();

                    $this->commissionService->processBookingAcceptance($booking);
                });

                return [
                    "status" => "SUCCESS",
                    "message" => "प्रस्ताव लॉक हो गया है और 3% कमीशन ({$commissionAmount} रुपये) आपके वॉलेट से काट लिया गया है।"
                ];
            } else {
                return [
                    "status" => "ERROR",
                    "error_code" => "INSUFFICIENT_WALLET_BALANCE",
                    "message" => "प्रस्ताव स्वीकार करने के लिए आपके वॉलेट में 3% कॉन्ट्रैक्ट वैल्यू (कम से कम ₹{$commissionAmount}) होना आवश्यक है।"
                ];
            }
        }

        return [
            "status" => "ERROR",
            "message" => "यह सर्विस प्रकार इस फंक्शन द्वारा समर्थित नहीं है।"
        ];
    }
}
