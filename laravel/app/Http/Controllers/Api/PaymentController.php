<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\RazorpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private RazorpayService $razorpay) {}

    // ─── POST /api/payment/create-order ──────────────────────────────────────
    // NOTE: Razorpay is bypassed in dev mode. Direct booking is created.

    public function createOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id' => 'required|integer|exists:users,id',
            'category'    => 'required|string|max:50',
        ]);

        $user   = $request->user();
        $amount = (float) Setting::get('booking_fee', env('BOOKING_FEE', 0));

        // ── Real Razorpay Order Creation ──────────────────────────────────────
        $order = $this->razorpay->createOrder(
            $amount,
            "booking_{$user->id}_{$data['provider_id']}",
            [
                'customer_id' => (string) $user->id,
                'provider_id' => (string) $data['provider_id'],
                'category'    => $data['category'],
            ]
        );

        $payment = Payment::create([
            'user_id'           => $user->id,
            'razorpay_order_id' => $order['id'],
            'amount'            => $amount,
            'status'            => 'created',
            'category'          => $data['category'],
            'provider_id'       => $data['provider_id'],
        ]);

        $keyId = config('services.razorpay.key_id') ?: env('RAZORPAY_KEY_ID', '');

        return response()->json([
            'success'        => true,
            'order_id'       => $order['id'],
            'amount'         => $order['amount'],
            'currency'       => $order['currency'],
            'payment_db_id'  => $payment->id,
            'key_id'         => $keyId,
        ]);
    }

    // ─── POST /api/payment/verify ─────────────────────────────────────────────

    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'razorpay_order_id'   => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature'  => 'required|string',
            'payment_db_id'       => 'required|integer',
        ]);

        $isValid = $this->razorpay->verifySignature(
            $data['razorpay_order_id'],
            $data['razorpay_payment_id'],
            $data['razorpay_signature']
        );

        if (!$isValid) {
            return response()->json(['detail' => 'Invalid payment signature'], 400);
        }

        $payment = Payment::find($data['payment_db_id']);
        if (!$payment) {
            return response()->json(['detail' => 'Payment record not found'], 404);
        }

        $payment->razorpay_payment_id = $data['razorpay_payment_id'];
        $payment->razorpay_signature  = $data['razorpay_signature'];
        $payment->status              = 'success';
        $payment->save();

        $user    = $request->user();
        $booking = Booking::create([
            'customer_id' => $user->id,
            'provider_id' => $payment->provider_id,
            'category'    => $payment->category,
            'status'      => 'pending',
            'payment_id'  => $payment->id,
        ]);

        $providerUser = \App\Models\User::find($payment->provider_id);

        return response()->json([
            'message'        => 'Payment verified. You can now call the provider.',
            'booking_id'     => $booking->id,
            'provider_id'    => $payment->provider_id,
            'provider_phone' => $providerUser?->phone,
        ]);
    }

    // ─── GET /api/payment/fee ─────────────────────────────────────────────────

    public function getFee(): JsonResponse
    {
        $amount = (float) Setting::get('booking_fee', env('BOOKING_FEE', 10));
        return response()->json([
            'success' => true,
            'fee'     => $amount,
        ]);
    }

    // ─── POST /api/payment/webhook ────────────────────────────────────────────

    public function webhook(Request $request): JsonResponse
    {
        $body      = $request->getContent();
        $signature = $request->header('X-Razorpay-Signature', '');

        if (!$this->razorpay->verifyWebhookSignature($body, $signature)) {
            return response()->json(['detail' => 'Invalid webhook signature'], 400);
        }

        $event     = json_decode($body, true);
        $eventType = $event['event'] ?? '';

        if ($eventType === 'payment.captured') {
            $entity  = $event['payload']['payment']['entity'];
            $orderId = $entity['order_id'] ?? null;

            $payment = Payment::where('razorpay_order_id', $orderId)->first();
            if ($payment && $payment->status !== 'success') {
                $payment->status              = 'success';
                $payment->razorpay_payment_id = $entity['id'] ?? null;
                $payment->save();
            }
        } elseif ($eventType === 'refund.processed') {
            $entity    = $event['payload']['refund']['entity'];
            $paymentId = $entity['payment_id'] ?? null;

            $payment = Payment::where('razorpay_payment_id', $paymentId)->first();
            if ($payment) {
                $payment->status              = 'refunded';
                $payment->razorpay_refund_id  = $entity['id'] ?? null;
                $payment->save();
            }
        }

        return response()->json(['status' => 'ok']);
    }

    // ─── POST /api/payment/refund ─────────────────────────────────────────────

    public function refund(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_id' => 'required|integer',
            'reason'     => 'sometimes|string',
        ]);

        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $payment = Payment::find($data['payment_id']);
        if (!$payment) {
            return response()->json(['detail' => 'Payment not found'], 404);
        }
        if ($payment->status !== 'success') {
            return response()->json(['detail' => "Cannot refund payment with status: {$payment->status}"], 400);
        }
        if (!$payment->razorpay_payment_id) {
            return response()->json(['detail' => 'No Razorpay payment ID found'], 400);
        }

        $refund = $this->razorpay->processRefund(
            $payment->razorpay_payment_id,
            null,
            $data['reason'] ?? ''
        );

        $payment->status             = 'refund_pending';
        $payment->razorpay_refund_id = $refund['id'] ?? null;
        $payment->refund_reason      = $data['reason'] ?? null;
        $payment->save();

        $booking = Booking::where('payment_id', $payment->id)->first();
        if ($booking) {
            $booking->status = 'refunded';
            $booking->save();
        }

        return response()->json(['message' => 'Refund initiated', 'refund_id' => $refund['id'] ?? null]);
    }

    // ─── POST /api/create-order (Razorpay Standard Web Checkout) ─────────────
    public function createStandardOrder(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'amount'   => 'required|integer|min:100', // Amount in paise, min 100 (₹1)
            'currency' => 'sometimes|string|size:3',
            'receipt'  => 'sometimes|string|max:40',
        ], [
            'amount.min' => 'Minimum amount must be at least 100 paise (₹1).',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => 'Validation failed',
                'details' => $validator->errors(),
            ], 400);
        }

        $amountPaise = (int) $request->input('amount');
        $currency    = strtoupper($request->input('currency', 'INR'));
        $receipt     = $request->input('receipt', 'rcpt_' . time() . '_' . rand(100, 999));

        try {
            $order = $this->razorpay->createOrderPaise($amountPaise, $receipt, $currency);

            return response()->json([
                'success'  => true,
                'order_id' => $order['id'],
                'amount'   => $order['amount'],
                'currency' => $order['currency'],
                'key_id'   => env('RAZORPAY_KEY_ID'),
            ]);
        } catch (\Exception $e) {
            $message    = $e->getMessage();
            $statusCode = 500;

            if (stripos($message, 'Authentication failed') !== false || stripos($message, 'Unauthorized') !== false) {
                $statusCode = 401;
            }

            Log::error("Razorpay create-order failed: {$message}");

            return response()->json([
                'error'   => 'Razorpay API error',
                'message' => $message,
            ], $statusCode);
        }
    }

    // ─── POST /api/verify-payment (Razorpay Standard Web Checkout) ───────────
    public function verifyStandardPayment(Request $request): JsonResponse
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'razorpay_order_id'   => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature'  => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'   => 'Missing required verification fields',
                'details' => $validator->errors(),
            ], 400);
        }

        $orderId   = (string) $request->input('razorpay_order_id');
        $paymentId = (string) $request->input('razorpay_payment_id');
        $signature = (string) $request->input('razorpay_signature');

        $isValid = $this->razorpay->verifyPaymentSignatureManual($orderId, $paymentId, $signature);

        if (!$isValid) {
            return response()->json([
                'success' => false,
                'error'   => 'Payment signature mismatch. Verification failed.',
            ], 400);
        }

        // If order exists in database, update status to success
        $payment = Payment::where('razorpay_order_id', $orderId)->first();
        if ($payment) {
            $payment->razorpay_payment_id = $paymentId;
            $payment->razorpay_signature  = $signature;
            $payment->status              = 'success';
            $payment->save();
        }

        return response()->json([
            'success'             => true,
            'message'             => 'Payment signature verified successfully.',
            'razorpay_order_id'   => $orderId,
            'razorpay_payment_id' => $paymentId,
        ]);
    }
}

