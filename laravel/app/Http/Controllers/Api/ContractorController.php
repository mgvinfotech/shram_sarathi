<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ProviderProfile;
use App\Models\Wallet;
use App\Models\User;
use App\Rules\ValidPan;
use App\Rules\ValidIfsc;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * ContractorController — All Thekedar (Contractor) specific APIs.
 *
 * Dev/Prod transparency: Every wallet-debit that would need Razorpay in production
 * is wrapped with a BYPASS guard so it works fully offline during development.
 */
class ContractorController extends Controller
{
    // ─── POST /api/contractor/kyc ─────────────────────────────────────────────
    // Thekedar apna KYC + Base-Rate submit karta hai.

    public function submitKyc(Request $request): JsonResponse
    {
        $data = $request->validate([
            'firm_name'           => 'sometimes|nullable|string|max:200',
            'pan_number'          => ['sometimes', 'nullable', 'string', new ValidPan()],
            'pan_url'             => 'sometimes|nullable|string|max:500',
            'bank_account_number' => 'sometimes|nullable|string|max:50',
            'bank_ifsc'           => ['sometimes', 'nullable', 'string', new ValidIfsc()],
            'bank_name'           => 'sometimes|nullable|string|max:100',
            'base_rate'           => 'required|numeric|min:1',
            'base_rate_unit'      => 'required|string|max:100', // e.g. "per 100 log"
            'rate_category'       => 'required|string|max:50',  // catering / construction / wiring
            'owner_id_number'     => 'sometimes|nullable|string|max:50', // Identity Card
        ]);

        $user    = $request->user();
        $profile = ProviderProfile::where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['detail' => 'Provider profile not found. Complete setup first.'], 404);
        }

        $profile->fill($data);
        $profile->kyc_status = 'submitted';
        $profile->save();

        return response()->json([
            'message'        => 'KYC submitted successfully',
            'base_rate'      => $profile->base_rate,
            'base_rate_unit' => $profile->base_rate_unit,
            'kyc_status'     => $profile->kyc_status,
        ]);
    }

    // ─── POST /api/contractor/calculate-bill ──────────────────────────────────
    // Customer quantity dalta hai → backend total_bill + 10% advance calculate karke deta hai.

    public function calculateBill(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id' => 'required|integer|exists:users,id',
            'quantity'    => 'required|integer|min:1',
        ]);

        $profile = ProviderProfile::where('user_id', $data['provider_id'])->first();

        if (!$profile || !$profile->base_rate) {
            return response()->json(['detail' => 'Contractor has not set a base rate yet.'], 400);
        }

        $totalBill    = $profile->base_rate * $data['quantity'];
        $advance10pct = round($totalBill * 0.10, 2);

        return response()->json([
            'provider_id'     => $data['provider_id'],
            'quantity'        => $data['quantity'],
            'base_rate'       => $profile->base_rate,
            'base_rate_unit'  => $profile->base_rate_unit,
            'total_bill'      => $totalBill,
            'advance_10pct'   => $advance10pct,
            'firm_name'       => $profile->firm_name,
        ]);
    }

    // ─── POST /api/contractor/wallet-check ────────────────────────────────────
    // Customer ke Call button dabane se PEHLE: thekedar ke wallet mein 10% advance hai ya nahi.

    public function walletCheck(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id'   => 'required|integer|exists:users,id',
            'advance_amount' => 'required|numeric|min:0',
        ]);

        $wallet = Wallet::where('user_id', $data['provider_id'])->first();

        if (!$wallet || $wallet->balance < $data['advance_amount']) {
            $balance = $wallet?->balance ?? 0.00;
            return response()->json([
                'can_call'       => false,
                'wallet_balance' => $balance,
                'required'       => $data['advance_amount'],
                'shortage'       => round($data['advance_amount'] - $balance, 2),
                'message'        => 'Thekedar ke wallet mein insufficient balance hai. Please recharge karo.',
            ]);
        }

        return response()->json([
            'can_call'       => true,
            'wallet_balance' => $wallet->balance,
            'required'       => $data['advance_amount'],
        ]);
    }

    // ─── POST /api/contractor/initiate-call ───────────────────────────────────
    // Call initiate hoti hai → booking create hoti hai + secret PIN generate hota hai.

    public function initiateCall(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id'      => 'required|integer|exists:users,id',
            'quantity'         => 'required|integer|min:1',
            'customer_address' => 'required|string|max:500',
        ]);

        $customer = $request->user();

        // SERVER-SIDE BILL CALCULATION (SECURITY FIX)
        // Never trust client-provided total_bill or advance_10pct!
        $profile = ProviderProfile::where('user_id', $data['provider_id'])->first();
        if (!$profile || !$profile->base_rate) {
            return response()->json(['detail' => 'Contractor has not set a base rate yet.'], 400);
        }

        $totalBill    = $profile->base_rate * $data['quantity'];
        $advance10pct = round($totalBill * 0.10, 2);

        // Generate a 4-digit secret PIN
        $pin = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

        $booking = Booking::create([
            'customer_id'  => $customer->id,
            'provider_id'  => $data['provider_id'],
            'category'     => 'thekedar',
            'status'       => 'call_initiated',
            'quantity'     => $data['quantity'],
            'total_bill'   => $totalBill,
            'advance_10pct'=> $advance10pct,
            'secret_pin'   => $pin,
            'customer_address' => $data['customer_address'],
        ]);

        $provider = User::find($data['provider_id']);

        // Fetch provider phone for native dialing
        return response()->json([
            'booking_id'     => $booking->id,
            'secret_pin'     => $pin,
            'provider_phone' => $provider?->phone,
            'total_bill'     => $totalBill,
            'advance_10pct'  => $advance10pct,
            'message'        => 'Booking created. Abhi provider ko call karo. Deal hone par unhe PIN do.',
        ]);
    }

    // ─── POST /api/contractor/confirm-deal ────────────────────────────────────
    // Thekedar apni screen mein PIN daalega + kaam ki details → 10% auto-debit.

    public function confirmDeal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
            'secret_pin' => 'required|string|size:4',
            'work_date'  => 'required|string|max:50',
            'work_time'  => 'required|string|max:50',
            'work_terms' => 'sometimes|nullable|string',
        ]);

        $provider = $request->user();

        $booking = Booking::where('id', $data['booking_id'])
            ->where('provider_id', $provider->id)
            ->where('status', 'call_initiated')
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found or already confirmed.'], 404);
        }

        if ($booking->secret_pin !== $data['secret_pin']) {
            return response()->json(['detail' => 'Galat PIN hai. Customer se sahi PIN lo.'], 400);
        }

        $wallet = Wallet::where('user_id', $provider->id)->first();
        if (!$wallet || $wallet->balance < $booking->advance_10pct) {
            return response()->json([
                'detail'  => 'Wallet mein sufficient balance nahi hai. Pehle recharge karo.',
                'balance' => $wallet?->balance ?? 0,
                'required'=> $booking->advance_10pct,
            ], 400);
        }

        DB::transaction(function () use ($wallet, $booking) {
            $wallet->balance -= $booking->advance_10pct;
            $wallet->save();
        });
        $debitSuccess = true;

        if ($debitSuccess) {
            $booking->status           = 'confirmed';
            $booking->work_date        = $data['work_date'];
            $booking->work_time        = $data['work_time'];
            $booking->work_terms       = $data['work_terms'] ?? null;
            $booking->pin_confirmed_at = now();
            $booking->advance_debited  = true;
            $booking->confirmed_at     = now();
            $booking->save();

            // Increment provider's total_bookings
            ProviderProfile::where('user_id', $provider->id)
                ->increment('total_bookings');
        }

        return response()->json([
            'message'      => 'Deal confirm ho gayi! ₹' . $booking->advance_10pct . ' advance debit hua.',
            'booking_id'   => $booking->id,
            'status'       => $booking->status,
            'work_date'    => $booking->work_date,
            'work_time'    => $booking->work_time,
            'advance_paid' => $booking->advance_10pct,
            'bypass_mode'  => env('WALLET_CHECK_BYPASS', false),
        ]);
    }

    // ─── GET /api/contractor/booking/{id} ─────────────────────────────────────
    // Fetch booking details (Customer Name, Phone, Address) for Contractor PIN screen
    public function getBookingDetails(Request $request, $id): JsonResponse
    {
        $provider = $request->user();
        $booking = Booking::with('customer')->where('id', $id)
            ->where('provider_id', $provider->id)
            ->where('category', 'thekedar')
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found.'], 404);
        }

        return response()->json([
            'booking_id'       => $booking->id,
            'status'           => $booking->status,
            'customer_name'    => $booking->customer->name ?? 'Unknown',
            'customer_phone'   => $booking->customer->phone ?? 'Unknown',
            'customer_address' => $booking->customer_address ?? 'Not provided',
            'quantity'         => $booking->quantity,
            'total_bill'       => $booking->total_bill,
            'advance_10pct'    => $booking->advance_10pct,
        ]);
    }

    // ─── GET /api/contractor/profile ──────────────────────────────────────────
    // Thekedar ka KYC + rate profile fetch karo.

    public function getProfile(Request $request): JsonResponse
    {
        $user    = $request->user();
        $profile = ProviderProfile::where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['detail' => 'Profile not found'], 404);
        }

        return response()->json([
            'firm_name'           => $profile->firm_name,
            'pan_number'          => $profile->pan_number,
            'pan_url'             => $profile->pan_url,
            'bank_account_number' => $profile->bank_account_number,
            'bank_ifsc'           => $profile->bank_ifsc,
            'bank_name'           => $profile->bank_name,
            'base_rate'           => $profile->base_rate,
            'base_rate_unit'      => $profile->base_rate_unit,
            'rate_category'       => $profile->rate_category,
            'kyc_status'          => $profile->kyc_status,
        ]);
    }

    // ─── GET /api/contractor/customer-kyc-check ───────────────────────────────
    // Customer ka profile 100% complete hai ya nahi — thekedar number unlock se pehle.

    public function customerKycCheck(Request $request): JsonResponse
    {
        $customer = $request->user();

        $issues = [];

        // Check if identity document is present
        if (empty($customer->aadhaar_url) && empty($customer->eshram_url)) {
            $issues[] = 'identity_document_missing';
        }

        // Check if name is set
        if (empty($customer->name)) {
            $issues[] = 'name_missing';
        }

        if (count($issues) > 0) {
            return response()->json([
                'kyc_complete' => false,
                'issues'       => $issues,
                'message'      => 'Please complete your profile before contacting a contractor.',
            ], 400);
        }

        return response()->json([
            'kyc_complete' => true,
            'message'      => 'Profile is complete. You can contact the contractor.',
        ]);
    }

    // ─── POST /api/contractor/cancel ──────────────────────────────────────────
    // Booking cancel karo. Agar PIN verify ho chuka hai to penalty lagegi.

    public function cancelBooking(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $user    = $request->user();
        $booking = Booking::find($data['booking_id']);

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        // Ensure requester is the contractor (provider)
        if ($booking->provider_id !== $user->id) {
            return response()->json(['detail' => 'Unauthorized'], 403);
        }

        // Cannot cancel if already completed or already cancelled
        if (in_array($booking->status, ['completed', 'cancelled'])) {
            return response()->json(['detail' => 'Booking cannot be cancelled at this stage.'], 400);
        }

        // Penalty rule: PIN was already verified → advance_debited is true → NO REFUND
        if ($booking->advance_debited) {
            $booking->status = 'cancelled';
            $booking->save();
            return response()->json([
                'message'     => 'Booking cancelled after deal confirmation. 10% advance commission has been forfeited as penalty.',
                'status'      => $booking->status,
                'penalty'     => true,
                'amount_lost' => $booking->advance_10pct,
                'note'        => 'Commission refund nahi hoga — Blueprint Section 5.2 ke anusar.',
            ]);
        }

        // Safe cancellation — PIN never verified, no money was deducted
        $booking->status = 'cancelled';
        $booking->save();

        return response()->json([
            'message' => 'Booking cancelled. No penalty as deal was not yet confirmed.',
            'status'  => $booking->status,
            'penalty' => false,
        ]);
    }

    // ─── GET /api/contractor/provider/history ─────────────────────────────────
    // Fetch jobs where this thekedar was booked by a customer

    public function providerHistory(Request $request): JsonResponse
    {
        $provider = $request->user();

        $bookings = Booking::with('customer')
            ->where('provider_id', $provider->id)
            ->where('category', 'thekedar')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $result = $bookings->map(function ($b) use ($provider) {
            $profile = ProviderProfile::where('user_id', $provider->id)->first();
            return [
                'id' => $b->id,
                'job_id' => $b->id, // For UI compatibility
                'status' => $b->status,
                'labour_type' => $profile ? $profile->rate_category : 'Contractor Job',
                'description' => "Base Rate: ₹" . ($profile ? $profile->base_rate : 0) . " / " . ($profile ? $profile->base_rate_unit : '') . "\n" .
                                 "Quantity: " . $b->quantity . "\n" .
                                 "Total Bill: ₹" . $b->total_bill . "\n" .
                                 "Advance Paid: ₹" . $b->advance_10pct,
                'address' => $b->customer_address,
                'customer_name' => $b->customer->name ?? 'Customer',
                'customer_phone' => in_array($b->status, ['confirmed', 'completed']) ? $b->customer->phone : null,
                'quantity' => $b->quantity,
                'total_bill' => $b->total_bill,
                'advance_10pct' => $b->advance_10pct,
                'created_at' => $b->created_at,
            ];
        });

        return response()->json($result);
    }

    // ─── GET /api/contractor/customer/history ─────────────────────────────────
    // Fetch jobs where the customer booked a thekedar

    public function customerHistory(Request $request): JsonResponse
    {
        $customer = $request->user();

        $bookings = Booking::with('provider')
            ->where('customer_id', $customer->id)
            ->where('category', 'thekedar')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $result = $bookings->map(function ($b) {
            $profile = ProviderProfile::where('user_id', $b->provider_id)->first();
            return [
                'id' => $b->id,
                'job_id' => $b->id, // For UI compatibility
                'status' => $b->status,
                'labour_type' => $profile ? $profile->rate_category : 'Contractor Job',
                'description' => "Base Rate: ₹" . ($profile ? $profile->base_rate : 0) . " / " . ($profile ? $profile->base_rate_unit : '') . "\n" .
                                 "Quantity: " . $b->quantity . "\n" .
                                 "Total Bill: ₹" . $b->total_bill . "\n" .
                                 "Advance Paid: ₹" . $b->advance_10pct,
                'address' => $b->customer_address,
                'provider_name' => $profile ? $profile->firm_name : ($b->provider->name ?? 'Contractor'),
                'provider_phone' => in_array($b->status, ['confirmed', 'completed']) ? $b->provider->phone : null,
                'quantity' => $b->quantity,
                'total_bill' => $b->total_bill,
                'advance_10pct' => $b->advance_10pct,
                'created_at' => $b->created_at,
            ];
        });

        return response()->json($result);
    }
}
