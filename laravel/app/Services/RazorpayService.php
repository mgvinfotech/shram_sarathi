<?php

namespace App\Services;

use Razorpay\Api\Api;
use Illuminate\Support\Facades\Log;

class RazorpayService
{
    private Api $api;
    private string $keyId;
    private string $keySecret;
    private string $webhookSecret;

    public function __construct()
    {
        $this->keyId         = config('services.razorpay.key_id') ?: env('RAZORPAY_KEY_ID', '');
        $this->keySecret     = config('services.razorpay.key_secret') ?: env('RAZORPAY_KEY_SECRET', '');
        $this->webhookSecret = config('services.razorpay.webhook_secret') ?: env('RAZORPAY_WEBHOOK_SECRET', '');
        $this->api           = new Api($this->keyId, $this->keySecret);
    }

    public function getKeyId(): string
    {
        return $this->keyId;
    }

    /**
     * Create a Razorpay order.
     *
     * @param  float  $amountInr  Amount in INR (will be converted to paise)
     * @param  string $receipt    Unique receipt identifier
     * @param  array  $notes      Optional notes
     * @return array              Razorpay order object as array
     */
    public function createOrder(float $amountInr, string $receipt, array $notes = []): array
    {
        $order = $this->api->order->create([
            'amount'          => (int) ($amountInr * 100), // paise
            'currency'        => 'INR',
            'receipt'         => $receipt,
            'notes'           => $notes,
            'payment_capture' => 1,
        ]);

        return $order->toArray();
    }

    /**
     * Create a Razorpay order with amount in paise directly.
     *
     * @param int $amountPaise Amount in paise (minimum 100 paise = 1 INR)
     * @param string|null $receipt
     * @param string $currency
     * @param array $notes
     * @return array
     */
    public function createOrderPaise(int $amountPaise, ?string $receipt = null, string $currency = 'INR', array $notes = []): array
    {
        $receipt = $receipt ?: ('rcpt_' . time() . '_' . rand(100, 999));
        $order = $this->api->order->create([
            'amount'          => $amountPaise,
            'currency'        => strtoupper($currency),
            'receipt'         => $receipt,
            'notes'           => $notes,
            'payment_capture' => 1,
        ]);

        return $order->toArray();
    }

    /**
     * Verify Razorpay payment signature using HMAC-SHA256.
     * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
     */
    public function verifyPaymentSignatureManual(string $orderId, string $paymentId, string $signature): bool
    {
        if (empty($this->keySecret) || empty($orderId) || empty($paymentId) || empty($signature)) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, $this->keySecret);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Verify Razorpay payment signature via SDK utility.
     */
    public function verifySignature(string $orderId, string $paymentId, string $signature): bool
    {
        try {
            $this->api->utility->verifyPaymentSignature([
                'razorpay_order_id'   => $orderId,
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature'  => $signature,
            ]);
            return true;
        } catch (\Exception $e) {
            Log::warning("Razorpay signature verification failed: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Verify Razorpay webhook signature.
     */
    public function verifyWebhookSignature(string $body, string $signature): bool
    {
        if (empty($this->webhookSecret)) {
            Log::warning('Razorpay webhook secret not configured');
            return false;
        }

        try {
            $this->api->utility->verifyWebhookSignature($body, $signature, $this->webhookSecret);
            return true;
        } catch (\Exception $e) {
            Log::warning("Razorpay webhook signature invalid: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Process a refund for a payment.
     *
     * @return array Refund object
     */
    public function processRefund(string $paymentId, ?float $amount = null, string $reason = ''): array
    {
        $params = ['speed' => 'normal'];
        if ($amount !== null) {
            $params['amount'] = (int) ($amount * 100); // paise
        }
        if ($reason) {
            $params['notes'] = ['reason' => $reason];
        }

        $refund = $this->api->payment->fetch($paymentId)->refund($params);
        return $refund->toArray();
    }
}
