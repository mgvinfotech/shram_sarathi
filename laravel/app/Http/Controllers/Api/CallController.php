<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use App\Services\ExotelService;
use App\Services\RazorpayService;
use App\Services\RedisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CallController extends Controller
{
    public function __construct(
        private ExotelService  $exotel,
        private RazorpayService $razorpay,
        private RedisService   $redis,
    ) {}

    // ─── POST /api/call/initiate ──────────────────────────────────────────────

    public function initiate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $user    = $request->user();
        $booking = Booking::where('id', $data['booking_id'])
            ->where('customer_id', $user->id)
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        if ($booking->status !== 'pending') {
            return response()->json([
                'detail' => "Call not allowed. Booking status: {$booking->status}",
            ], 400);
        }

        // Enforce single-call limit via Redis lock
        if (!$this->redis->lockCall($booking->id)) {
            return response()->json(['detail' => 'A call is already in progress for this booking'], 400);
        }

        $provider = User::find($booking->provider_id);
        if (!$provider) {
            $this->redis->releaseCallLock($booking->id);
            return response()->json(['detail' => 'Provider not found'], 404);
        }

        try {
            $callData = $this->exotel->initiateMaskedCall(
                $user->phone,
                $provider->phone,
                $booking->id
            );

            $booking->call_sid = $callData['call_sid'] ?? null;
            $booking->status   = 'call_initiated';
            $booking->save();

            return response()->json([
                'message'  => 'Call initiated. Connecting you to the provider...',
                'call_sid' => $callData['call_sid'] ?? null,
            ]);
        } catch (\Exception $e) {
            $this->redis->releaseCallLock($booking->id);
            Log::error("Call initiation failed: {$e->getMessage()}");
            return response()->json(['detail' => 'Failed to initiate call'], 500);
        }
    }

    // ─── POST /api/call/status-webhook ───────────────────────────────────────

    public function statusWebhook(Request $request): JsonResponse
    {
        $callSid     = $request->input('CallSid', '');
        $status      = $request->input('Status', '');
        $duration    = $request->input('Duration', '0');
        $customField = $request->input('CustomField', '');

        Log::info("Call status webhook: SID={$callSid}, Status={$status}, BookingID={$customField}");

        if (!$customField) {
            return response()->json(['status' => 'ignored']);
        }

        $bookingId = (int) $customField;
        $booking   = Booking::find($bookingId);

        if (!$booking) {
            return response()->json(['status' => 'booking_not_found']);
        }

        $booking->status        = 'call_done';
        $booking->call_duration = is_numeric($duration) ? (int) $duration : 0;
        $booking->save();

        // Auto-trigger IVR call to provider
        $provider = User::find($booking->provider_id);
        if ($provider) {
            try {
                $ivrData = $this->exotel->initiateIvrCall($provider->phone, $bookingId);
                $booking->ivr_call_sid = $ivrData['ivr_call_sid'] ?? null;
                $booking->save();
                Log::info("IVR call initiated for booking {$bookingId}");
            } catch (\Exception $e) {
                Log::error("IVR call failed for booking {$bookingId}: {$e->getMessage()}");
            }
        }

        return response()->json(['status' => 'ok']);
    }

    // ─── POST /api/call/dtmf-webhook ─────────────────────────────────────────

    public function dtmfWebhook(Request $request): JsonResponse
    {
        $callSid     = $request->input('CallSid', '');
        $digits      = $request->input('Digits', '');
        $customField = $request->input('CustomField', '');

        Log::info("DTMF webhook: SID={$callSid}, Digits={$digits}, BookingID={$customField}");

        if (!$customField) {
            return response()->json(['status' => 'ignored']);
        }

        $bookingId = (int) $customField;
        $booking   = Booking::find($bookingId);

        if (!$booking) {
            return response()->json(['status' => 'booking_not_found']);
        }

        if ($digits === '1') {
            // Provider accepted
            $booking->status       = 'confirmed';
            $booking->ivr_response = 'accepted';
            $booking->confirmed_at = now();
            $booking->save();

            $this->redis->releaseCallLock($bookingId);
            Log::info("Booking {$bookingId} CONFIRMED by provider");
        } elseif ($digits === '2' || $digits === '') {
            // Provider rejected or no response
            $booking->status       = 'rejected';
            $booking->ivr_response = $digits === '2' ? 'rejected' : 'no_response';
            $booking->save();

            $this->redis->releaseCallLock($bookingId);
            $this->processAutoRefund($booking);
            Log::info("Booking {$bookingId} REJECTED. Refund initiated.");
        }

        return response()->json(['status' => 'ok']);
    }

    private function processAutoRefund(Booking $booking): void
    {
        $payment = Payment::find($booking->payment_id);

        if ($payment && $payment->status === 'success' && $payment->razorpay_payment_id) {
            try {
                $refund = $this->razorpay->processRefund(
                    $payment->razorpay_payment_id,
                    null,
                    'Provider rejected the booking'
                );
                $payment->status             = 'refund_pending';
                $payment->razorpay_refund_id = $refund['id'] ?? null;
                $payment->save();

                $booking->status = 'refunded';
                $booking->save();
            } catch (\Exception $e) {
                Log::error("Auto-refund failed for booking {$booking->id}: {$e->getMessage()}");
            }
        }
    }
}
