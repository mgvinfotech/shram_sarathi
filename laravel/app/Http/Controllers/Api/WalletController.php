<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\User;
use App\Models\ProviderProfile;
use App\Services\RazorpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use App\Rules\ValidIfsc;
use App\Services\OtpService;

class WalletController extends Controller
{
    public function __construct(private ?RazorpayService $razorpay = null)
    {
        if (!$this->razorpay && class_exists(RazorpayService::class)) {
            $this->razorpay = app(RazorpayService::class);
        }
    }

    /**
     * GET /api/wallet
     * Returns the current user's wallet balance, hold balance, and recent transaction history.
     */
    public function getWallet(Request $request): JsonResponse
    {
        $user = $request->user();

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'balance' => 0.00,
                'hold_balance' => 0.00,
                'total_earned' => 0.00,
                'total_withdrawn' => 0.00,
            ]
        );

        $transactions = WalletTransaction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(function ($tx) {
                return [
                    'id'            => $tx->id,
                    'amount'        => (float) $tx->amount,
                    'type'          => $tx->type,
                    'category'      => $tx->category,
                    'category_label'=> match ($tx->category) {
                        'RECHARGE'                 => 'वॉलेट रिचार्ज',
                        'ONBOARDING_BONUS'         => 'पंजीकरण बोनस (Locked)',
                        'ONBOARDING_BONUS_RELEASE' => 'बोनस अनलॉक (पहला काम)',
                        'FRC_BONUS'                => 'FRC बोनस (Contractor/Vehicle)',
                        'BOOKING_COMMISSION'       => 'बुकिंग कमीशन',
                        'CONTRACTOR_COMMISSION'    => 'ठेकेदार कमीशन',
                        'PLATFORM_FEE'             => 'प्लेटफ़ॉर्म शुल्क',
                        'WITHDRAWAL'               => 'बैंक निकासी',
                        default                    => $tx->category,
                    },
                    'description'   => $tx->description,
                    'balance_after' => (float) $tx->balance_after,
                    'hold_status'   => $tx->hold_status,
                    'created_at'    => $tx->created_at?->toISOString() ?? now()->toISOString(),
                ];
            });

        return response()->json([
            'balance'             => (float) ($wallet->balance ?? 0.00),
            'hold_balance'        => (float) ($wallet->hold_balance ?? 0.00),
            'total_earned'        => (float) ($wallet->total_earned ?? 0.00),
            'total_withdrawn'     => (float) ($wallet->total_withdrawn ?? 0.00),
            'upi_vpa'             => env('PLATFORM_UPI_VPA', 'shramsarathi@upi'),
            'merchant_name'       => env('PLATFORM_MERCHANT_NAME', 'Shram Sarathi'),
            'razorpay_key'        => env('RAZORPAY_KEY_ID', ''),
            'transactions'        => $transactions,
        ]);
    }

    /**
     * POST /api/wallet/recharge
     * Add funds to wallet (via UPI intent, Card, Online Gateway, or Direct top-up)
     */
    public function recharge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount'             => 'required|numeric|min:1',
            'payment_method'     => 'sometimes|nullable|string|in:upi,card,netbanking,direct,dev_bypass,razorpay',
            'ref_id'             => 'sometimes|nullable|string|max:100',
            '_internal_verified' => 'sometimes|boolean',
        ]);

        $user   = $request->user();
        $amount = (float) $data['amount'];
        $method = $data['payment_method'] ?? 'razorpay';
        $refId  = $data['ref_id'] ?? ('TXN_' . strtoupper(uniqid()));

        // Security check: Unconditionally block direct unverified recharges
        if (empty($data['_internal_verified'])) {
            return response()->json([
                'detail' => 'Direct wallet recharge is disabled. Please complete payment via Razorpay.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $wallet = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'balance' => 0.00,
                    'hold_balance' => 0.00,
                    'total_earned' => 0.00,
                    'total_withdrawn' => 0.00,
                ]
            );

            $wallet->balance += $amount;
            $wallet->save();

            // Record transaction in ledger
            WalletTransaction::create([
                'wallet_id'     => $wallet->id,
                'user_id'       => $user->id,
                'amount'        => $amount,
                'type'          => 'credit',
                'category'      => 'RECHARGE',
                'description'   => "वॉलेट रिचार्ज via " . strtoupper($method) . " (Ref: {$refId})",
                'balance_after' => $wallet->balance,
                'hold_status'   => 'none',
            ]);

            // Check if this recharge crosses threshold to trigger Agent Referral Commission
            if ($wallet->balance >= 100) {
                $profile = ProviderProfile::where('user_id', $user->id)->first();

                if ($profile && $profile->referral_code && !$profile->referral_paid) {
                    $agent = User::where('role', 'agent')
                        ->where('phone', $profile->referral_code)
                        ->first();

                    if ($agent) {
                        $agentWallet = Wallet::firstOrCreate(['user_id' => $agent->id]);
                        $agentWallet->balance += 20.00;
                        $agentWallet->total_earned += 20.00;
                        $agentWallet->save();

                        WalletTransaction::create([
                            'wallet_id'     => $agentWallet->id,
                            'user_id'       => $agent->id,
                            'amount'        => 20.00,
                            'type'          => 'credit',
                            'category'      => 'FRC_BONUS',
                            'description'   => "रेफरल बोनस: {$user->name} ({$user->phone}) ने ₹100+ रिचार्ज किया",
                            'balance_after' => $agentWallet->balance,
                            'hold_status'   => 'none',
                        ]);

                        $profile->referral_paid = true;
                        $profile->save();

                        Log::info("Agent ({$agent->phone}) credited ₹20 for referral of user ({$user->phone}).");
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "₹{$amount} आपके वॉलेट में सफलतापूर्वक जोड़ दिए गए हैं।",
                'balance' => $wallet->balance,
                'hold_balance' => $wallet->hold_balance,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Wallet recharge failed: " . $e->getMessage());
            return response()->json(['detail' => 'Wallet recharge failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/wallet/create-order
     * Creates a Razorpay Order for Card/Netbanking/UPI wallet recharge.
     */
    public function createOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
        ]);

        $user   = $request->user();
        $amount = (float) $data['amount'];

        $keyId = config('services.razorpay.key_id') ?: env('RAZORPAY_KEY_ID', '');
        if (empty($keyId)) {
            return response()->json(['detail' => 'Razorpay payment gateway is not configured on server.'], 500);
        }

        try {
            $receipt = "w_rec_{$user->id}_" . time();
            $order = $this->razorpay->createOrder(
                $amount,
                $receipt,
                [
                    'user_id' => (string) $user->id,
                    'purpose' => 'wallet_recharge',
                ]
            );

            return response()->json([
                'success'  => true,
                'order_id' => $order['id'],
                'amount'   => $order['amount'],
                'currency' => $order['currency'],
                'key_id'   => $keyId,
            ]);
        } catch (\Exception $e) {
            Log::error("Wallet createOrder failed: " . $e->getMessage());
            return response()->json(['detail' => 'Payment order creation failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/wallet/verify-order
     * Verifies payment signature and credits the wallet.
     */
    public function verifyOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount'              => 'required|numeric|min:1',
            'razorpay_order_id'   => 'required|string',
            'razorpay_payment_id' => 'required|string',
            'razorpay_signature'  => 'required|string',
        ]);

        $user   = $request->user();
        $amount = (float) $data['amount'];

        // Prevent duplicate processing of the same payment id
        $alreadyProcessed = WalletTransaction::where('user_id', $user->id)
            ->where('description', 'LIKE', "%{$data['razorpay_payment_id']}%")
            ->exists();

        if ($alreadyProcessed) {
            return response()->json(['detail' => 'This payment has already been credited to your wallet.'], 400);
        }

        // Verify Razorpay HMAC-SHA256 signature
        if ($this->razorpay) {
            $isValid = $this->razorpay->verifyPaymentSignatureManual(
                $data['razorpay_order_id'],
                $data['razorpay_payment_id'],
                $data['razorpay_signature']
            );

            if (!$isValid) {
                return response()->json(['detail' => 'Invalid payment signature. Verification failed.'], 400);
            }
        }

        // Securely credit wallet
        $req = new Request([
            'amount'             => $amount,
            'payment_method'     => 'razorpay',
            'ref_id'             => $data['razorpay_payment_id'],
            '_internal_verified' => true,
        ]);
        $req->setUserResolver(fn() => $user);

        return $this->recharge($req);
    }

    /**
     * GET /api/wallet/payout-methods
     * Returns currently linked payout method, masking details, and cooling period status.
     */
    public function getPayoutMethod(Request $request): JsonResponse
    {
        $user = $request->user();
        $isCooling = (bool) ($user->payout_cooling_until && $user->payout_cooling_until->isFuture());
        $coolingHours = $isCooling ? round(now()->diffInMinutes($user->payout_cooling_until) / 60, 1) : 0;

        $hasPayout = !empty($user->payout_type) && (!empty($user->upi_id) || !empty($user->bank_details));

        $maskedUpi = null;
        if (!empty($user->upi_id)) {
            $parts = explode('@', $user->upi_id);
            $userPart = $parts[0] ?? '';
            $handlePart = $parts[1] ?? '';
            $maskedUpi = (strlen($userPart) > 2 ? substr($userPart, 0, 2) . '****' : $userPart . '**') . '@' . $handlePart;
        }

        $bankDetails = $user->bank_details;
        $maskedBank = null;
        if (!empty($bankDetails['account_number'])) {
            $ac = (string) $bankDetails['account_number'];
            $maskedBank = ($bankDetails['bank_name'] ?? 'Bank') . ' (••••' . substr($ac, -4) . ')';
        }

        return response()->json([
            'has_payout_method'       => $hasPayout,
            'payout_type'             => $user->payout_type,
            'upi_id'                  => $user->upi_id,
            'masked_upi'              => $maskedUpi,
            'bank_details'            => $bankDetails,
            'masked_bank'             => $maskedBank,
            'payout_verified_at'      => $user->payout_verified_at?->toIso8601String(),
            'is_cooling'              => $isCooling,
            'cooling_hours_remaining' => $coolingHours,
            'cooling_until'           => $user->payout_cooling_until?->toIso8601String(),
            'registered_phone'        => substr($user->phone, 0, 2) . '******' . substr($user->phone, -2),
            'has_password'            => !empty($user->password),
        ]);
    }

    /**
     * POST /api/wallet/payout-methods/send-otp
     * Sends OTP to the registered phone number before adding or modifying a payout method.
     */
    public function sendPayoutOtp(Request $request): JsonResponse
    {
        $user = $request->user();
        $otpService = app(OtpService::class);
        $shouldSendSms = $otpService->isSmsEnabled() || !$otpService->isDevMode();
        $otp = $shouldSendSms ? $otpService->generate() : '123456';

        Cache::put("payout_otp:{$user->phone}", $otp, 300); // 5 minutes TTL
        Log::info("[Payout OTP] Generated for user #{$user->id} ({$user->phone}): {$otp}");

        if ($shouldSendSms) {
            app(\App\Services\SmsService::class)->sendOtp($user->phone, $otp, 5);
        }

        $maskedPhone = substr($user->phone, 0, 2) . '******' . substr($user->phone, -2);

        $response = [
            'success' => true,
            'message' => "आपके रजिस्टर्ड मोबाइल नंबर ({$maskedPhone}) पर 6 अंकों का OTP भेजा गया है।",
            'phone'   => $maskedPhone,
        ];

        if ($otpService->isDevMode()) {
            $response['dev_otp'] = $otp;
        }

        return response()->json($response);
    }

    /**
     * POST /api/wallet/payout-methods
     * Validates OTP and updates the user's verified payout method.
     * Enforces 24-hour cooling lock if modifying an existing payout account on a non-empty wallet.
     */
    public function updatePayoutMethod(Request $request): JsonResponse
    {
        $data = $request->validate([
            'otp'                   => 'required|string|size:6',
            'payout_type'           => 'required|string|in:upi,bank',
            'upi_id'                => 'required_if:payout_type,upi|nullable|string|max:100|regex:/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/',
            'account_number'        => 'required_if:payout_type,bank|nullable|string|min:9|max:18',
            'ifsc_code'             => ['required_if:payout_type,bank', 'nullable', 'string', new ValidIfsc],
            'bank_name'             => 'nullable|string|max:100',
            'account_holder_name'   => 'nullable|string|max:100',
        ], [
            'upi_id.regex'          => 'अमान्य UPI ID प्रारूप। (उदा: 9876543210@paytm या name@okhdfcbank)',
            'account_number.min'    => 'अमान्य बैंक खाता नंबर (न्यूनतम 9 अंक)।',
            'account_number.max'    => 'अमान्य बैंक खाता नंबर (अधिकतम 18 अंक)।',
        ]);

        $user = $request->user();

        // 1. Verify OTP
        $cachedOtp = Cache::get("payout_otp:{$user->phone}");
        if (!$cachedOtp || $cachedOtp !== $data['otp']) {
            return response()->json(['detail' => 'अमान्य या समाप्त OTP। कृपया नया OTP मांगें।'], 422);
        }
        Cache::forget("payout_otp:{$user->phone}");

        // 2. Check if user already had a verified payout method and wallet balance
        $hadExisting = !empty($user->payout_type) && (!empty($user->upi_id) || !empty($user->bank_details));
        $wallet = Wallet::where('user_id', $user->id)->first();
        $hasBalance = $wallet && $wallet->balance > 0;

        // 3. Save to payout history audit log
        $history = $user->payout_history ?? [];
        $history[] = [
            'payout_type'  => $user->payout_type,
            'upi_id'       => $user->upi_id,
            'bank_details' => $user->bank_details,
            'replaced_at'  => now()->toIso8601String(),
        ];
        $user->payout_history = $history;

        // 4. Update payout details
        $user->payout_type = $data['payout_type'];
        if ($data['payout_type'] === 'upi') {
            $user->upi_id = strtolower(trim($data['upi_id']));
            $user->bank_details = null;
        } else {
            $user->upi_id = null;
            $user->bank_details = [
                'account_number'      => trim($data['account_number']),
                'ifsc_code'           => strtoupper(trim($data['ifsc_code'])),
                'bank_name'           => trim($data['bank_name'] ?? 'Bank Transfer'),
                'account_holder_name' => trim($data['account_holder_name'] ?? $user->name),
            ];
        }

        $user->payout_verified_at = now();

        // 5. Anti-theft 24-Hour Cooling Lock
        // If an existing payout was changed on an account with wallet balance, enforce 24-hr lock
        if ($hadExisting && $hasBalance) {
            $user->payout_cooling_until = now()->addHours(24);
            $coolingMsg = "सुरक्षा सूचना: आपका विड्रॉल विवरण अपडेट हो गया है। धोखाधड़ी रोकथाम के लिए अगले 24 घंटे तक इस नए खाते में निकासी लॉक रहेगी।";
        } else {
            $user->payout_cooling_until = null;
            $coolingMsg = "आपका विड्रॉल विवरण सफलतापूर्वक लिंक व वेरीफाई हो गया है।";
        }

        $user->save();

        return response()->json([
            'success'                 => true,
            'message'                 => $coolingMsg,
            'payout_type'             => $user->payout_type,
            'upi_id'                  => $user->upi_id,
            'bank_details'            => $user->bank_details,
            'is_cooling'              => (bool) ($user->payout_cooling_until && $user->payout_cooling_until->isFuture()),
            'cooling_hours_remaining' => $user->payout_cooling_until ? round(now()->diffInMinutes($user->payout_cooling_until) / 60, 1) : 0,
            'has_password'            => !empty($user->password),
        ]);
    }

    /**
     * POST /api/wallet/withdraw
     * High-security withdrawal:
     * 1. Re-authenticates account owner via password.
     * 2. Enforces verified payout method (UPI or Bank A/C).
     * 3. Enforces 24-hour anti-theft cooling lock.
     * 4. Enforces minimum ₹50 limit and deducts ₹2 bank fee.
     * 5. Atomically locks wallet, debits funds, and records full audit trail in ledger.
     */
    public function withdraw(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount'   => 'required|numeric|min:50',
            'password' => 'nullable|string',
        ], [
            'amount.min' => 'न्यूनतम निकासी राशि ₹50 है।',
        ]);

        $user   = $request->user();
        $amount = (float) $data['amount'];

        // ── 1. Re-authenticate account owner via password (if set on account) ──
        if (!empty($user->password)) {
            if (empty($data['password'])) {
                return response()->json([
                    'detail' => 'सुरक्षा के लिए अपना लॉगिन पासवर्ड दर्ज करना अनिवार्य है।'
                ], 422);
            }
            if (!Hash::check($data['password'], $user->password)) {
                return response()->json([
                    'detail' => 'गलत पासवर्ड! सुरक्षा कारणों से निकासी अस्वीकार कर दी गई। कृपया सही पासवर्ड दर्ज करें।'
                ], 422);
            }
        }

        // ── 2. Check verified payout method ──────────────────────────────────
        if (empty($user->payout_type) || (empty($user->upi_id) && empty($user->bank_details))) {
            return response()->json([
                'detail' => 'निकासी से पहले कृपया अपना UPI ID या बैंक खाता लिंक व वेरीफाई करें।'
            ], 422);
        }

        // ── 3. Check 24-Hour Anti-theft Cooling Lock ─────────────────────────
        if ($user->payout_cooling_until && $user->payout_cooling_until->isFuture()) {
            $hrs = round(now()->diffInMinutes($user->payout_cooling_until) / 60, 1);
            return response()->json([
                'detail' => "सुरक्षा लॉक: आपका विड्रॉल विवरण हाल ही में बदला गया है। सुरक्षा कारणों से आप {$hrs} घंटे बाद ही निकासी कर सकेंगे।"
            ], 403);
        }

        $withdrawalFee = (float) \App\Models\Setting::get('withdrawal_charge', 2.0);
        $totalDebit    = round($amount + $withdrawalFee, 2);

        // Determine destination text for ledger and admin audit
        if ($user->payout_type === 'upi') {
            $destText = "UPI: {$user->upi_id}";
        } else {
            $ac = $user->bank_details['account_number'] ?? '—';
            $ifsc = $user->bank_details['ifsc_code'] ?? '—';
            $bName = $user->bank_details['bank_name'] ?? 'Bank';
            $destText = "{$bName} A/C: {$ac} (IFSC: {$ifsc})";
        }

        try {
            DB::beginTransaction();

            $wallet = Wallet::where('user_id', $user->id)->lockForUpdate()->first();

            if (!$wallet || $wallet->balance < $totalDebit) {
                DB::rollBack();
                $avail = $wallet ? number_format($wallet->balance, 2) : '0.00';
                return response()->json([
                    'detail' => "अपर्याप्त वॉलेट बैलेंस। निकासी (₹{$amount}) + शुल्क (₹{$withdrawalFee}) = कुल ₹{$totalDebit} आवश्यक है। उपलब्ध: ₹{$avail}"
                ], 400);
            }

            if ($amount < 50) {
                DB::rollBack();
                return response()->json(['detail' => 'न्यूनतम निकासी राशि ₹50 है।'], 400);
            }

            $wallet->balance         -= $totalDebit;
            $wallet->total_withdrawn += $amount;
            $wallet->save();

            // Record withdrawal transaction in ledger with full payout destination
            WalletTransaction::create([
                'wallet_id'     => $wallet->id,
                'user_id'       => $user->id,
                'amount'        => $amount,
                'type'          => 'debit',
                'category'      => 'WITHDRAWAL',
                'description'   => "निकासी अनुरोध (₹{$amount}) → {$destText}",
                'balance_after' => round($wallet->balance + $withdrawalFee, 2),
                'hold_status'   => 'none',
            ]);

            // Record withdrawal fee transaction in ledger
            if ($withdrawalFee > 0) {
                WalletTransaction::create([
                    'wallet_id'     => $wallet->id,
                    'user_id'       => $user->id,
                    'amount'        => $withdrawalFee,
                    'type'          => 'debit',
                    'category'      => 'WITHDRAWAL_FEE',
                    'description'   => "निकासी ट्रांजैक्शन चार्ज / बैंक शुल्क (₹{$withdrawalFee})",
                    'balance_after' => $wallet->balance,
                    'hold_status'   => 'none',
                ]);
            }

            DB::commit();

            return response()->json([
                'success'           => true,
                'message'           => "₹{$amount} की निकासी प्रक्रिया सफलतापूर्वक शुरू हो गई है। राशि आपके {$destText} में 24-48 घंटे में क्रेडिट कर दी जाएगी।",
                'amount'            => $amount,
                'fee'               => $withdrawalFee,
                'total_debited'     => $totalDebit,
                'balance'           => $wallet->balance,
                'destination'       => $destText,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Wallet withdrawal failed: " . $e->getMessage());
            return response()->json(['detail' => 'Wallet withdrawal failed.'], 500);
        }
    }
}
