<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\NotificationController;
use App\Models\KarigarJobRequest;
use App\Models\KarigarJobOffer;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Transaction;
use App\Services\FcmService;
use App\Services\CommissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * KarigarController — Skilled Craftsman (Karigar) Hiring Module APIs.
 *
 * DB Table: karigar_job_requests
 *   Columns: customer_id, assigned_karigar_id, karigar_type, work_type,
 *            description, address, lat, lng, wage, time_shift, duration, media_url,
 *            start_date, start_time, karigar_count, booked_spots, live_chat_enabled,
 *            rejected_karigars (JSON), assigned_at, status (enum),
 *            accepted_at, completed_at
 *
 * Status enum: searching | pending | negotiating | accepted | rejected | cancelled | completed | no_provider
 */
class KarigarController extends Controller
{
    public function __construct(private FcmService $fcm)
    {
    }

    // ─── GET /api/karigar/search ──────────────────────────────────────────────
    // Customer searches available karigars by type near their location.

    public function searchKarigars(Request $request): JsonResponse
    {
        $data = $request->validate([
            'karigar_type' => 'required|string|max:100',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]);

        $query = ProviderProfile::with(['user'])
            ->where(function($catQ) use ($data) {
                $catQ->where('category', 'karigar')
                     ->orWhereHas('user', function($uq) {
                         $uq->where('role', 'karigar');
                     });
                if (!empty($data['karigar_type'])) {
                    $catQ->orWhere('category', $data['karigar_type']);
                }
            })
            ->where('is_online', true);

        if (!env('WALLET_CHECK_BYPASS', false)) {
            $query->whereHas('user.wallet', function ($q) {
                $q->where('balance', '>', 0);
            });
        }

        // Filter by specific skill if provided
        $categorySlugs = ['karigar', 'any'];
        if (!empty($data['karigar_type']) && !in_array($data['karigar_type'], $categorySlugs)) {
            $query->where(function($subQ) use ($data) {
                $subQ->whereJsonContains('sub_categories', $data['karigar_type'])
                     ->orWhere('category', $data['karigar_type'])
                     ->orWhere('skills_description', 'LIKE', '%' . $data['karigar_type'] . '%');
            });
        }

        $karigars = $query->get()->map(function ($profile) use ($data) {
            $dist = $this->haversineKm($data['lat'], $data['lng'], $profile->current_lat ?? 0, $profile->current_lng ?? 0);
            return [
                'provider_id' => $profile->user_id,
                'name' => $profile->user?->name,
                'karigar_type' => $profile->sub_categories,
                'rating' => $profile->rating,
                'distance_km' => round($dist, 2),
                'photo_url' => $profile->photo_url,
                'skills' => $profile->skills_description,
            ];
        })->sortBy('distance_km')->values();

        return response()->json($karigars);
    }

    // ─── POST /api/karigar/request ────────────────────────────────────────────
    // Customer submits a job request → broadcasted to nearest available karigars.

    public function requestKarigar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'karigar_type'  => 'required|string|max:100',
            'work_type'     => 'sometimes|nullable|string|max:100',
            'job_mode'      => 'required|string|in:daily,permanent',
            'wage'          => 'sometimes|nullable|numeric',
            'rate_unit'     => 'sometimes|nullable|string|in:daily,monthly,hourly',
            'time_shift'    => 'nullable|string',
            'duration'      => 'nullable|string',
            'media_url'     => 'nullable|string',
            'start_date'    => 'nullable|string',
            'start_time'    => 'required|string',
            'karigar_count' => 'sometimes|nullable|integer|min:1|max:20',
            'description'   => 'sometimes|nullable|string|max:1000',
            'address'       => 'required|string|max:500',
            'nearest_place' => 'sometimes|nullable|string|max:200',
            'lat'           => 'sometimes|nullable|numeric',
            'lng'           => 'sometimes|nullable|numeric',
        ]);

        $customer = $request->user();

        // ─── Pre-requisite Wallet Balance Check (sign up module page 28/32) ──
        $customerWallet = Wallet::firstOrCreate(['user_id' => $customer->id], [
            'balance' => 0.00,
            'hold_balance' => 0.00,
            'total_earned' => 0.00,
            'total_withdrawn' => 0.00,
        ]);
        $bypassWallet = filter_var(env('WALLET_CHECK_BYPASS', false), FILTER_VALIDATE_BOOLEAN);
        if (!$bypassWallet && $customerWallet->balance < 20.00) {
            $shortage = round(20.00 - $customerWallet->balance, 2);
            return response()->json([
                'status' => 'ERROR',
                'error_code' => 'INSUFFICIENT_WALLET_BALANCE',
                'detail' => "बुकिंग अनुरोध भेजने के लिए आपके वॉलेट में न्यूनतम ₹20 होना आवश्यक है। कृपया पहले वॉलेट रिचार्ज करें।",
                'message' => "बुकिंग अनुरोध भेजने के लिए आपके वॉलेट में न्यूनतम ₹20 होना आवश्यक है। कृपया पहले वॉलेट रिचार्ज करें।",
                'action' => 'OPEN_RECHARGE_MODAL',
                'required_amount' => $shortage,
                'wallet_balance' => (float) $customerWallet->balance,
            ], 400);
        }

        // Check if customer has an active searching request already
        $existing = KarigarJobRequest::where('customer_id', $customer->id)
            ->whereIn('status', ['searching', 'pending'])
            ->first();

        if ($existing) {
            if ((now()->timestamp - $existing->created_at->timestamp) >= 900) {
                $existing->status = 'cancelled';
                $existing->save();
            } else {
                return response()->json([
                    'detail' => 'Aapka ek request already pending hai. Pehle usse cancel karein.',
                    'job_id' => $existing->id,
                    'status' => $existing->status,
                ], 400);
            }
        }

        $karigarCount = $data['karigar_count'] ?? 1;
        
        $job = KarigarJobRequest::create([
            'customer_id'          => $customer->id,
            'assigned_karigar_id'  => null,
            'karigar_type'         => $data['karigar_type'],
            'work_type'            => $data['work_type']  ?? null,
            'job_mode'             => $data['job_mode']   ?? 'daily',
            'wage'                 => $data['wage']       ?? null,
            'time_shift'           => $data['time_shift'] ?? null,
            'duration'             => $data['duration']   ?? null,
            'media_url'            => $data['media_url']  ?? null,
            'start_date'           => $data['start_date'] ?? null,
            'start_time'           => $data['start_time'] ?? 'now',
            'karigar_count'        => $karigarCount,
            'booked_spots'         => 0,
            'live_chat_enabled'    => $request->input('live_chat_enabled', false),
            'description'          => $data['description'] ?? null,
            'address'              => $data['address'],
            'nearest_place'        => $data['nearest_place'] ?? null,
            'lat'                  => $data['lat'] ?? null,
            'lng'                  => $data['lng'] ?? null,
            'status'               => 'searching',
            'rejected_karigars'    => [],
            'assigned_at'          => now(),
        ]);

        // Find multiple providers to broadcast to (up to 3x the demand)
        $limit = $karigarCount * 3;
        $providers = $this->findNearestProviders($data['karigar_type'], [], $data['lat'] ?? null, $data['lng'] ?? null, $limit);
        
        if ($providers->isEmpty()) {
            $job->status = 'no_provider';
            $job->save();
            return response()->json([
                'detail' => 'Is waqt koi karigar available nahi hai. Thodi der baad dobara try karein.',
                'job_id' => $job->id,
                'status' => 'no_provider'
            ], 404);
        }
        
        $timeout = NotificationController::getNotificationTimeout();
        $workLabel = $data['work_type'] ?? $data['karigar_type'];
        
        foreach ($providers as $prov) {
            KarigarJobOffer::create([
                'karigar_job_request_id' => $job->id,
                'provider_id' => $prov->user_id,
                'status' => 'pending'
            ]);
            
            $this->fcm->sendToUser(
                userId: $prov->user_id,
                title: '🔧 Naya Karigar Kaam!',
                body: "Kaam: {$workLabel} — {$data['address']}. {$timeout} sec mein accept karein!",
                type: 'new_karigar_request',
                data: [
                    'screen'  => 'KarigarProviderRequest',
                    'job_id'  => (string) $job->id,
                    'timeout' => (string) $timeout,
                ],
                bookingId: $job->id,
                bookingModel: 'karigar_job_requests'
            );
        }

        Log::info("[Karigar] Job #{$job->id} broadcasted to " . count($providers) . " providers for customer #{$customer->id}");

        return response()->json([
            'job_id'       => $job->id,
            'status'       => 'searching',
            'karigar_type'  => $data['karigar_type'],
            'work_type'    => $data['work_type'] ?? null,
            'description'  => $data['description'] ?? null,
            'job_mode'     => $data['job_mode'] ?? 'daily',
            'wage'         => $data['wage'] ?? null,
            'time_shift'   => $data['time_shift'] ?? null,
            'duration'     => $data['duration'] ?? null,
            'media_url'    => $data['media_url'] ?? null,
            'start_date'   => $data['start_date'] ?? null,
            'start_time'   => $data['start_time'] ?? null,
            'address'      => $data['address'],
            'message'      => 'Request bhej di gayi. Karigar ke jawab ka intezaar karein.',
        ]);
    }

    // ─── GET /api/karigar/provider/pending ────────────────────────────────────
    // Provider checks for incoming job requests (polling) + auto-timeout stuck requests.

    public function providerPending(Request $request): JsonResponse
    {
        $provider = $request->user();
        $timeout = NotificationController::getNotificationTimeout();

        $pendingOffers = KarigarJobOffer::with('request')
            ->where('provider_id', $provider->id)
            ->whereIn('status', ['pending', 'negotiating'])
            ->get();

        $validPending = null;

        foreach ($pendingOffers as $offer) {
            $job = $offer->request;
            if (!$job || !in_array($job->status, ['searching', 'negotiating'])) {
                continue;
            }

            // If all spots booked or already accepted, skip
            if (($job->booked_spots ?? 0) >= ($job->karigar_count ?? 1) || $job->status === 'accepted' || $offer->status === 'accepted') {
                continue;
            }

            // In negotiation: only alert provider if the CUSTOMER sent the counter-offer
            if ($offer->status === 'negotiating') {
                $msgs = $offer->messages ?? [];
                if (empty($msgs)) {
                    continue;
                }
                $lastMsg = end($msgs);
                // If provider sent the last message, provider is waiting for customer — do not alert provider!
                if (!isset($lastMsg['sender']) || $lastMsg['sender'] === 'provider') {
                    continue;
                }
            }

            if ($job->status === 'searching') {
                $elapsed = $job->created_at ? (now()->timestamp - $job->created_at->timestamp) : 0;
                if ($elapsed >= $timeout) {
                    $job->status = 'no_provider';
                    $job->save();
                    Log::info("[Karigar] Auto-timed out job #{$job->id} (no provider accepted in {$timeout}s)");
                    continue;
                }
            }

            $validPending = $job;
            break;
        }

        if (!$validPending) {
            return response()->json(['has_request' => false]);
        }

        $elapsed = $validPending->created_at ? (now()->timestamp - $validPending->created_at->timestamp) : 0;
        $remaining = max(0, $timeout - $elapsed);

        $customer = User::find($validPending->customer_id);

        $distance = 2.5;
        if (!empty($provider->lat) && !empty($provider->lng) && !empty($validPending->lat) && !empty($validPending->lng)) {
            $distance = round($this->haversineKm((float)$provider->lat, (float)$provider->lng, (float)$validPending->lat, (float)$validPending->lng), 1);
        }

        return response()->json([
            'has_request'       => true,
            'job_id'            => $validPending->id,
            'karigar_type'      => $validPending->karigar_type,
            'work_type'         => $validPending->work_type,
            'description'       => $validPending->description,
            'job_mode'          => $validPending->job_mode,
            'wage'              => $validPending->wage,
            'time_shift'        => $validPending->time_shift,
            'duration'          => $validPending->duration,
            'media_url'         => $validPending->media_url,
            'start_date'        => $validPending->start_date,
            'start_time'        => $validPending->start_time,
            'karigar_count'     => $validPending->karigar_count,
            'booked_spots'      => $validPending->booked_spots ?? 0,
            'address'           => $validPending->address,
            'nearest_place'     => $validPending->nearest_place,
            'lat'               => $validPending->lat,
            'lng'               => $validPending->lng,
            'distance_km'       => $distance,
            'customer_name'     => $customer?->name,
            'assigned_at'       => $validPending->assigned_at,
            'created_at'        => $validPending->created_at,
            'timeout_seconds'   => $timeout,
            'remaining_seconds' => $remaining,
        ]);
    }

    // ─── POST /api/karigar/provider/accept ────────────────────────────────────
    // Provider accepts the job request.

    public function providerAccept(Request $request): JsonResponse
    {
        $data = $request->validate(['job_id' => 'required|integer']);
        $provider = $request->user();

        $offer = KarigarJobOffer::where('karigar_job_request_id', $data['job_id'])
            ->where('provider_id', $provider->id)
            ->whereIn('status', ['pending', 'negotiating'])
            ->first();

        if (!$offer) {
            return response()->json(['detail' => 'Request nahi mili ya timeout ho gayi.'], 404);
        }

        $job = KarigarJobRequest::find($data['job_id']);
        if (!$job || !in_array($job->status, ['searching', 'negotiating'])) {
            return response()->json(['detail' => 'Request already filled ya cancelled hai.'], 404);
        }

        // Strict Non-Self-Acceptance: Provider cannot accept their own counter offer
        $msgs = $offer->messages ?? [];
        if (!empty($msgs)) {
            $lastMessage = end($msgs);
            if (isset($lastMessage['sender']) && $lastMessage['sender'] === 'provider') {
                return response()->json(['detail' => 'यह ऑफ़र आपने भेजा था, केवल ग्राहक ही इसे स्वीकार कर सकता है।'], 400);
            }
            if (!empty($lastMessage['wage'])) {
                $job->wage = $lastMessage['wage'];
            }
        }

        $offer->status = 'accepted';
        $offer->save();

        // ─── FCM: Notify customer → provider accepted negotiation ─────────────
        $customer = User::find($job->customer_id);
        $this->fcm->sendToUser(
            userId: $job->customer_id,
            title: '✅ Karigar Ne Offer Accept Kar Liya!',
            body: "{$provider->name} ne aapki negotiated rate accept kar li hai.",
            type: 'accepted',
            data: [
                'screen' => 'KarigarRequestStatus',
                'job_id' => (string) $job->id,
            ],
            bookingId: $job->id,
            bookingModel: 'karigar_job_requests'
        );

        $job->booked_spots = ($job->booked_spots ?? 0) + 1;
        if ($job->booked_spots >= $job->karigar_count) {
            $job->status = 'accepted';
            $job->accepted_at = now();
            // Cancel all other pending offers with bot message
            $remainingOffers = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->whereIn('status', ['pending', 'negotiating'])
                ->get();
            foreach ($remainingOffers as $remOffer) {
                $botMsg = [
                    'id'        => uniqid('bot_'),
                    'sender'    => 'system',
                    'type'      => 'text',
                    'content'   => "🤖 आपका धन्यवाद! इस काम के सभी स्पॉट भर चुके हैं। आपका नया काम आने पर आपको तुरंत सूचित किया जाएगा।",
                    'wage'      => null,
                    'timestamp' => now()->toISOString(),
                ];
                $msgs = $remOffer->messages ?? [];
                $msgs[] = $botMsg;
                $remOffer->messages = $msgs;
                $remOffer->status = 'cancelled';
                $remOffer->save();
            }
        }
        
        // ─── Deduct ₹20 Platform Fee from Customer Wallet (if balance available) ─
        $customerWallet = Wallet::firstOrCreate(['user_id' => $job->customer_id], [
            'balance' => 0.00,
            'hold_balance' => 0.00,
            'total_earned' => 0.00,
            'total_withdrawn' => 0.00,
        ]);
        if ($customerWallet->balance >= 20.00) {
            $customerWallet->balance -= 20.00;
            $customerWallet->save();

            WalletTransaction::create([
                'wallet_id'     => $customerWallet->id,
                'user_id'       => $job->customer_id,
                'amount'        => 20.00,
                'type'          => 'debit',
                'category'      => 'PLATFORM_FEE',
                'description'   => 'प्लेटफ़ॉर्म बुकिंग शुल्क (Karigar)',
                'balance_after' => $customerWallet->balance,
                'hold_status'   => 'none',
            ]);
        }

        $job->save();

        // ─── Agent Bonus & Residual Commission ─────────────────────────────
        try {
            app(CommissionService::class)->processFirstJobAcceptance($provider->id);
            app(CommissionService::class)->processWorkerBookingResidual($provider->id, $job->id, 'Karigar');
        } catch (\Throwable $e) {
            Log::warning('[Karigar] Agent bonus / residual unlock failed: ' . $e->getMessage());
        }

        $providerUser = User::find($provider->id);

        // ─── FCM: Notify customer → job accepted ─────────────────────────────
        $this->fcm->sendToUser(
            userId: $job->customer_id,
            title: '✅ Karigar Mil Gaya!',
            body: "{$providerUser->name} ne aapki request accept kar li. Woh jaldi pahunch jayenge.",
            type: 'accepted',
            data: [
                'screen' => 'KarigarRequestStatus',
                'job_id' => (string) $job->id,
            ],
            bookingId: $job->id,
            bookingModel: 'karigar_job_requests'
        );

        Log::info("[Karigar] Job #{$job->id} accepted by provider #{$provider->id}");

        return response()->json([
            'message' => 'Request accept kar li gayi!',
            'job_id' => $job->id,
            'status' => 'accepted',
            'customer_name' => $customer?->name,
            'customer_phone' => $customer?->phone,
            'address' => $job->address,
            'lat' => $job->lat,
            'lng' => $job->lng,
        ]);
    }

    // ─── POST /api/karigar/customer/accept ────────────────────────────────────
    // Customer accepts a provider's negotiation offer.

    public function customerAccept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_id' => 'required|integer',
            'provider_id' => 'required|integer'
        ]);
        $customer = $request->user();

        $job = KarigarJobRequest::where('id', $data['job_id'])->where('customer_id', $customer->id)->first();
        if (!$job || !in_array($job->status, ['searching', 'negotiating'])) {
            return response()->json(['detail' => 'Request already filled ya cancelled hai.'], 404);
        }

        $offer = KarigarJobOffer::where('karigar_job_request_id', $job->id)
            ->where('provider_id', $data['provider_id'])
            ->whereIn('status', ['pending', 'negotiating'])
            ->first();

        if (!$offer) {
            return response()->json(['detail' => 'Provider ka offer valid nahi hai.'], 404);
        }

        // Strict Non-Self-Acceptance: Customer cannot accept their own counter offer
        $msgs = $offer->messages ?? [];
        if (!empty($msgs)) {
            $lastMessage = end($msgs);
            if (isset($lastMessage['sender']) && $lastMessage['sender'] === 'customer') {
                return response()->json(['detail' => 'यह ऑफ़र आपने भेजा था, केवल कारीगर ही इसे स्वीकार कर सकता है।'], 400);
            }
            if (!empty($lastMessage['wage'])) {
                $job->wage = $lastMessage['wage'];
            }
        }

        $offer->status = 'accepted';
        $offer->save();

        // ─── FCM: Notify provider → customer accepted negotiation ─────────────
        $this->fcm->sendToUser(
            userId: $data['provider_id'],
            title: '✅ Customer Ne Offer Accept Kar Liya!',
            body: "{$customer->name} ne aapki negotiated rate accept kar li hai.",
            type: 'accepted',
            data: [
                'screen' => 'ProviderDashboard',
                'job_id' => (string) $job->id,
            ],
            bookingId: $job->id,
            bookingModel: 'karigar_job_requests'
        );

        $job->booked_spots = ($job->booked_spots ?? 0) + 1;
        if ($job->booked_spots >= $job->karigar_count) {
            $job->status = 'accepted';
            $job->accepted_at = now();
            // Cancel all other pending offers with bot message
            $remainingOffers = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->whereIn('status', ['pending', 'negotiating'])
                ->get();
            foreach ($remainingOffers as $remOffer) {
                $botMsg = [
                    'id'        => uniqid('bot_'),
                    'sender'    => 'system',
                    'type'      => 'text',
                    'content'   => "🤖 आपका धन्यवाद! इस काम के सभी स्पॉट भर चुके हैं। आपका नया काम आने पर आपको तुरंत सूचित किया जाएगा।",
                    'wage'      => null,
                    'timestamp' => now()->toISOString(),
                ];
                $msgs = $remOffer->messages ?? [];
                $msgs[] = $botMsg;
                $remOffer->messages = $msgs;
                $remOffer->status = 'cancelled';
                $remOffer->save();
            }
        }

        // ─── Deduct ₹20 Platform Fee from Customer Wallet (if balance available) ─
        $customerWallet = Wallet::firstOrCreate(['user_id' => $customer->id], [
            'balance' => 0.00,
            'hold_balance' => 0.00,
            'total_earned' => 0.00,
            'total_withdrawn' => 0.00,
        ]);
        if ($customerWallet->balance >= 20.00) {
            $customerWallet->balance -= 20.00;
            $customerWallet->save();

            WalletTransaction::create([
                'wallet_id'     => $customerWallet->id,
                'user_id'       => $customer->id,
                'amount'        => 20.00,
                'type'          => 'debit',
                'category'      => 'PLATFORM_FEE',
                'description'   => 'प्लेटफ़ॉर्म बुकिंग शुल्क (Karigar)',
                'balance_after' => $customerWallet->balance,
                'hold_status'   => 'none',
            ]);
        }

        $job->save();

        // ─── Agent Bonus & Residual Commission ─────────────────────────────
        try {
            app(CommissionService::class)->processFirstJobAcceptance($data['provider_id']);
            app(CommissionService::class)->processWorkerBookingResidual($data['provider_id'], $job->id, 'Karigar');
        } catch (\Throwable $e) {
            Log::warning('[Karigar] Agent bonus / residual unlock failed: ' . $e->getMessage());
        }

        // ─── FCM: Notify provider → job accepted ─────────────────────────────
        $this->fcm->sendToUser(
            userId: $data['provider_id'],
            title: '✅ Customer Ne Aapka Offer Accept Kiya!',
            body: "Customer {$customer->name} ne aapka offer manzoor kar liya hai.",
            type: 'accepted',
            data: [
                'screen' => 'ProviderDashboard',
                'job_id' => (string) $job->id,
            ],
            bookingId: $job->id,
            bookingModel: 'karigar_job_requests'
        );

        Log::info("[Karigar] Job #{$job->id} provider offer #{$data['provider_id']} accepted by customer #{$customer->id}");

        return response()->json([
            'message' => 'Provider ka offer accept kar liya gaya hai.',
            'job_id' => $job->id,
            'status' => 'accepted'
        ]);
    }

    // ─── POST /api/karigar/provider/reject ────────────────────────────────────
    // Provider manually rejects the job.

    public function providerReject(Request $request): JsonResponse
    {
        $data = $request->validate(['job_id' => 'required|integer']);
        $provider = $request->user();

        $offer = KarigarJobOffer::where('karigar_job_request_id', $data['job_id'])
            ->where('provider_id', $provider->id)
            ->whereIn('status', ['pending', 'negotiating'])
            ->first();

        if (!$offer) {
            return response()->json(['detail' => 'Request nahi mili ya timeout ho gayi.'], 404);
        }

        $offer->status = 'rejected';
        $offer->save();

        return response()->json(['message' => 'Request reject kar di gayi.']);
    }

    // ─── GET /api/karigar/status/{id} ─────────────────────────────────────────
    // Customer checks their job request status.

    public function jobStatus(Request $request, int $id): JsonResponse
    {
        $customer = $request->user();
        $job = KarigarJobRequest::find($id);

        if (!$job || $job->customer_id !== $customer->id) {
            return response()->json(['detail' => 'Request nahi mili.'], 404);
        }

        // Auto-timeout check
        if ($job->status === 'searching' && $job->created_at) {
            $timeout = NotificationController::getNotificationTimeout();
            $elapsed = now()->timestamp - $job->created_at->timestamp;
            if ($elapsed >= $timeout) {
                if (($job->booked_spots ?? 0) > 0) {
                    $job->status = 'accepted';
                    $job->accepted_at = now();
                } else {
                    $job->status = 'no_provider';
                }
                $job->save();
            }
        }

        $acceptedOffers = KarigarJobOffer::where('karigar_job_request_id', $job->id)
            ->where('status', 'accepted')
            ->get();
            
        $providers = [];
        foreach ($acceptedOffers as $offer) {
            $provUser = User::find($offer->provider_id);
            if ($provUser) {
                $msgs = $offer->messages ?? [];
                $agreedWage = $job->wage;
                foreach (array_reverse($msgs) as $m) {
                    if (!empty($m['wage'])) { $agreedWage = $m['wage']; break; }
                }
                $providers[] = [
                    'id'          => $provUser->id,
                    'name'        => $provUser->name,
                    'phone'       => $provUser->phone,
                    'agreed_wage' => $agreedWage,
                ];
            }
        }
        
        $firstProvider = $providers[0] ?? null;

        $negotiatingOffers = KarigarJobOffer::where('karigar_job_request_id', $job->id)
            ->where('status', 'negotiating')
            ->get();
            
        $negotiations = [];
        foreach ($negotiatingOffers as $offer) {
            $provUser = User::find($offer->provider_id);
            if ($provUser) {
                $msgs = $offer->messages ?? [];
                $lastMsg = !empty($msgs) ? end($msgs) : null;
                $negotiations[] = [
                    'provider_id' => $provUser->id,
                    'provider_name' => $provUser->name,
                    'last_offer' => $lastMsg ? ($lastMsg['wage'] ?? null) : null,
                    'last_sender' => $lastMsg ? ($lastMsg['sender'] ?? null) : null,
                ];
            }
        }

        return response()->json([
            'job_id'        => $job->id,
            'status'        => $job->status,
            'karigar_type'  => $job->karigar_type,
            'work_type'     => $job->work_type,
            'description'   => $job->description,
            'job_mode'      => $job->job_mode,
            'wage'          => $job->wage,
            'time_shift'    => $job->time_shift,
            'duration'      => $job->duration,
            'media_url'     => $job->media_url,
            'start_date'    => $job->start_date,
            'start_time'    => $job->start_time,
            'address'       => $job->address,
            'karigar_count' => $job->karigar_count,
            'booked_spots'  => $job->booked_spots,
            'providers'     => $providers,
            'negotiations'  => $negotiations,
            'provider_name' => $firstProvider['name'] ?? null,
            'provider_phone' => $firstProvider['phone'] ?? null,
            'accepted_at' => $job->accepted_at,
            'created_at' => $job->created_at,
        ]);
    }

    // ─── POST /api/karigar/cancel ─────────────────────────────────────────────
    // Customer cancels the job request.

    public function cancelRequest(Request $request): JsonResponse
    {
        $data = $request->validate(['job_id' => 'required|integer']);
        $customer = $request->user();

        $job = KarigarJobRequest::where('id', $data['job_id'])
            ->where('customer_id', $customer->id)
            ->whereIn('status', ['searching', 'pending'])
            ->first();

        if (!$job) {
            return response()->json(['detail' => 'Request nahi mili ya already complete hai.'], 404);
        }

        if (($job->booked_spots ?? 0) > 0) {
            // Partial cancellation - just stop searching for more
            $job->status = 'accepted';
            $job->accepted_at = now();
            $job->save();
            
            // Clear remaining pending offers
            KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->whereIn('status', ['pending', 'negotiating'])
                ->update(['status' => 'cancelled']);

            return response()->json(['message' => 'Baki spots cancel kar diye gaye hain. Request ab accepted state me hai.', 'status' => 'accepted']);
        } else {
            $job->status = 'cancelled';
            $job->save();
        }

        // Clear all pending offers
        KarigarJobOffer::where('karigar_job_request_id', $job->id)
            ->whereIn('status', ['pending', 'negotiating'])
            ->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Request cancel kar di gayi.', 'status' => 'cancelled']);
    }

    // ─── GET /api/karigar/customer/history ────────────────────────────────────

    public function customerHistory(Request $request): JsonResponse
    {
        $customer = $request->user();

        $jobs = KarigarJobRequest::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();
            
        foreach ($jobs as $job) {
            if (in_array($job->status, ['searching', 'pending']) && (now()->timestamp - $job->created_at->timestamp) >= 900) {
                $job->status = 'cancelled';
                $job->save();
            }
        }

        $result = $jobs->map(function ($job) {
            $providers = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->where('status', 'accepted')
                ->with('provider')
                ->get();
            $firstProvider = $providers->first()?->provider;
            
            return [
                'job_id' => $job->id,
                'status' => $job->status,
                'karigar_type' => $job->karigar_type,
                'description' => $job->description,
                'address' => $job->address,
                'provider_name' => $firstProvider?->name,
                'provider_phone' => in_array($job->status, ['accepted', 'completed']) ? $firstProvider?->phone : null,
                'accepted_at' => $job->accepted_at,
                'created_at' => $job->created_at,
            ];
        });

        return response()->json($result);
    }

    // ─── GET /api/karigar/provider/history ────────────────────────────────────

    public function providerHistory(Request $request): JsonResponse
    {
        $provider = $request->user();

        $offers = KarigarJobOffer::where('provider_id', $provider->id)
            ->whereNotIn('status', ['rejected'])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();
            
        $jobs = [];
        foreach ($offers as $offer) {
            $job = KarigarJobRequest::find($offer->karigar_job_request_id);
            if ($job) {
                $effectiveStatus = $offer->status === 'negotiating' ? 'negotiating' : $job->status;
                $job->effective_status = $effectiveStatus;
                $jobs[] = $job;
            }
        }
        $jobs = collect($jobs)->unique('id')->values();

        $result = $jobs->filter(function ($job) {
            $status = $job->effective_status ?? $job->status;
            return in_array($status, ['accepted', 'completed', 'negotiating']);
        })->map(function ($job) {
            $customer = User::find($job->customer_id);
            $status = $job->effective_status ?? $job->status;
            $isConfirmed = in_array($status, ['accepted', 'completed']);
            return [
                'job_id' => $job->id,
                'status' => $status,
                'karigar_type' => $job->karigar_type,
                'work_type' => $job->work_type,
                'wage' => $job->wage,
                'time_shift' => $job->time_shift,
                'start_date' => $job->start_date,
                'start_time' => $job->start_time,
                'description' => $job->description,
                'address' => $job->address,
                'customer_name' => $customer?->name,
                'customer_phone' => $isConfirmed ? $customer?->phone : null,
                'accepted_at' => $job->accepted_at,
                'created_at' => $job->created_at,
            ];
        });

        return response()->json($result);
    }

    // ─── Negotiation Chat APIs ────────────────────────────────────────────────

    public function sendMessage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_id' => 'required|integer',
            'message_type' => 'required|string|in:text,wage_offer',
            'content' => 'sometimes|nullable|string|max:1000',
            'wage' => 'sometimes|nullable|numeric|min:1',
        ]);

        $user = $request->user();
        $job = KarigarJobRequest::find($data['job_id']);

        if (!$job) {
            return response()->json(['detail' => 'Job request nahi mili.'], 404);
        }

        $isCustomer = ($job->customer_id === $user->id);
        
        // Find the offer for this conversation
        if ($isCustomer) {
            $providerId = $request->input('provider_id');
            if (!$providerId) {
                return response()->json(['detail' => 'Provider ID required.'], 400);
            }
            $offer = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->where('provider_id', $providerId)
                ->first();
        } else {
            $offer = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->where('provider_id', $user->id)
                ->first();
        }

        if (!$offer) {
            return response()->json(['detail' => 'Offer nahi mila.'], 404);
        }

        // Update offer status to negotiating
        if ($offer->status === 'pending') {
            $offer->status = 'negotiating';
            $job->status = 'negotiating';
            $job->save();
        }

        // Create message
        $message = [
            'id' => uniqid('msg_'),
            'sender' => $isCustomer ? 'customer' : 'provider',
            'sender_name' => $user->name,
            'type' => $data['message_type'],
            'content' => $data['content'] ?? null,
            'wage' => $data['wage'] ?? null,
            'timestamp' => now()->toISOString(),
        ];

        $messages = $offer->messages ?? [];
        $messages[] = $message;
        $offer->messages = $messages;
        $offer->save();

        // Send FCM notification
        $recipientId = $isCustomer ? $offer->provider_id : $job->customer_id;
        $this->fcm->sendToUser(
            userId: $recipientId,
            title: "💬 {$user->name} से नया मैसेज!",
            body: $data['wage'] ? "नया रेट प्रस्ताव: ₹{$data['wage']}" : substr($data['content'] ?? '', 0, 50),
            type: 'new_message',
            data: [
                'screen' => $isCustomer ? 'KarigarProviderRequest' : 'KarigarRequestStatus',
                'job_id' => (string) $job->id,
            ],
            bookingId: $job->id,
            bookingModel: 'karigar_job_requests'
        );

        return response()->json([
            'message' => 'Message bhej diya gaya.',
            'offer_status' => $offer->status
        ]);
    }

    public function getMessages(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_id' => 'required|integer',
            'provider_id' => 'sometimes|nullable|integer',
        ]);

        $user = $request->user();
        $job = KarigarJobRequest::find($data['job_id']);

        if (!$job) {
            return response()->json(['detail' => 'Job request nahi mili.'], 404);
        }

        $isCustomer = ($job->customer_id === $user->id);
        
        if ($isCustomer) {
            $providerId = $data['provider_id'] ?? null;
            if (!$providerId) {
                return response()->json(['detail' => 'Provider ID required.'], 400);
            }
            $offer = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->where('provider_id', $providerId)
                ->first();
        } else {
            $offer = KarigarJobOffer::where('karigar_job_request_id', $job->id)
                ->where('provider_id', $user->id)
                ->first();
        }

        if (!$offer) {
            return response()->json(['messages' => [], 'offer_status' => 'pending']);
        }

        return response()->json([
            'messages' => $offer->messages ?? [],
            'offer_status' => $offer->status
        ]);
    }

    // ─── Helper: Find Nearest Providers ──────────────────────────────────────

    private function findNearestProviders(string $karigarType, array $excludeIds, ?float $lat, ?float $lng, int $limit = 10)
    {
        $baseQuery = function() use ($excludeIds, $karigarType) {
            $q = ProviderProfile::with(['user', 'user.wallet'])
                ->where(function($catQ) use ($karigarType) {
                    $catQ->where('category', 'karigar')
                         ->orWhereHas('user', function($uq) {
                             $uq->where('role', 'karigar');
                         });
                    if (!empty($karigarType)) {
                        $catQ->orWhere('category', $karigarType);
                    }
                })
                ->where('is_online', true)
                ->whereNotIn('user_id', $excludeIds);
            
            if (!env('WALLET_CHECK_BYPASS', false)) {
                $q->whereHas('user.wallet', function ($wq) {
                    $wq->where('balance', '>', 0);
                });
            }
            return $q;
        };

        $query = $baseQuery();
        $categorySlugs = ['karigar', 'any'];
        if (!empty($karigarType) && !in_array($karigarType, $categorySlugs)) {
            $query->where(function($subQ) use ($karigarType) {
                $subQ->whereJsonContains('sub_categories', $karigarType)
                     ->orWhere('category', $karigarType)
                     ->orWhere('skills_description', 'LIKE', '%' . $karigarType . '%');
            });
        }

        $profiles = $query->limit($limit * 2)->get();

        // Tier 2 Fallback: If no provider matched exact sub_category filter, fallback to any available online karigar/labour
        if ($profiles->isEmpty()) {
            $fallbackQuery = $baseQuery();
            $profiles = $fallbackQuery->limit($limit * 2)->get();
        }

        if (!empty($lat) && !empty($lng)) {
            $profiles = $profiles->map(function ($profile) use ($lat, $lng) {
                $profile->distance_km = $this->haversineKm($lat, $lng, $profile->current_lat ?? 0, $profile->current_lng ?? 0);
                return $profile;
            })->sortBy('distance_km')->take($limit);
        } else {
            $profiles = $profiles->take($limit);
        }

        return $profiles;
    }

    // ─── Helper: Haversine Distance ──────────────────────────────────────────

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng/2) * sin($dLng/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        return $earthRadius * $c;
    }

    // ─── Negotiation APIs ──────────────────────────────────────────────────────

    public function sendNegotiation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_id' => 'required|integer',
            'provider_id' => 'nullable|integer',
            'type' => 'sometimes|nullable|string|in:text,offer,voice',
            'content' => 'sometimes|nullable|string',
            'message' => 'sometimes|nullable|string',
            'wage' => 'nullable|numeric'
        ]);
        
        $user = $request->user();
        $wage = $data['wage'] ?? null;
        $type = $data['type'] ?? ($wage ? 'offer' : 'text');
        $content = !empty($data['content']) ? $data['content'] : (!empty($data['message']) ? $data['message'] : ($wage ? "प्रस्तावित राशि: ₹{$wage}" : 'संदेश'));
        
        $jobReq = KarigarJobRequest::find($data['job_id']);
        if (!$jobReq) {
            return response()->json(['detail' => 'Job request not found'], 404);
        }
        
        $isCustomer = $jobReq->customer_id === $user->id;
        $senderRole = $isCustomer ? 'customer' : 'provider';
        $targetProviderId = $data['provider_id'] ?? $request->input('provider_id');
        
        if ($isCustomer) {
            $offerQuery = KarigarJobOffer::where('karigar_job_request_id', $jobReq->id);
            if ($targetProviderId) {
                $offerQuery->where('provider_id', $targetProviderId);
            } elseif ($jobReq->assigned_karigar_id) {
                $offerQuery->where('provider_id', $jobReq->assigned_karigar_id);
            } else {
                $offerQuery->orderByDesc('updated_at');
            }
            $offer = $offerQuery->first();
            
            if (!$offer && $targetProviderId) {
                $offer = KarigarJobOffer::create([
                    'karigar_job_request_id' => $jobReq->id,
                    'provider_id' => (int)$targetProviderId,
                    'status' => 'negotiating',
                    'messages' => []
                ]);
            }
        } else {
            $offer = KarigarJobOffer::firstOrCreate(
                ['karigar_job_request_id' => $jobReq->id, 'provider_id' => $user->id],
                ['status' => 'negotiating', 'messages' => []]
            );
        }
        
        if (!$offer) {
            return response()->json(['detail' => 'Offer not found'], 404);
        }
        
        $messages = $offer->messages ?? [];
        $messages[] = [
            'id' => uniqid(),
            'sender' => $senderRole,
            'type' => $type,
            'content' => $content,
            'wage' => $wage,
            'timestamp' => now()->toISOString()
        ];
        
        $offer->messages = $messages;
        if ($offer->status !== 'accepted') {
            $offer->status = 'negotiating';
        }
        $offer->save();
        
        if ($jobReq->status !== 'accepted') {
            $jobReq->status = 'negotiating';
            $jobReq->assigned_karigar_id = $offer->provider_id;
        }
        $jobReq->save();
        
        // Notify the other party
        $receiverId = $isCustomer ? $offer->provider_id : $jobReq->customer_id;
        $notifTitle = $isCustomer ? '💬 ग्राहक का संदेश / काउंटर-ऑफ़र' : '💬 कारीगर का संदेश / काउंटर-ऑफ़र';
        $this->fcm->sendToUser(
            userId: $receiverId,
            title: $notifTitle,
            body: $content,
            type: 'negotiation',
            data: [
                'screen' => 'NegotiationChatScreen',
                'job_id' => (string) $jobReq->id,
                'provider_id' => (string) $offer->provider_id,
                'module' => 'karigar'
            ],
            bookingId: $jobReq->id,
            bookingModel: 'karigar_job_requests'
        );
        
        return response()->json(['message' => 'Sent successfully', 'messages' => $messages, 'provider_id' => $offer->provider_id]);
    }
    
    public function getNegotiationMessages(Request $request, int $jobId): JsonResponse
    {
        $user = $request->user();
        $jobReq = KarigarJobRequest::find($jobId);
        if (!$jobReq) {
            return response()->json(['messages' => []]);
        }
        
        $isCustomer = $jobReq->customer_id === $user->id;
        $targetProviderId = $request->query('provider_id');
        
        if ($isCustomer) {
            $offerQuery = KarigarJobOffer::where('karigar_job_request_id', $jobId);
            if ($targetProviderId) {
                $offerQuery->where('provider_id', (int)$targetProviderId);
            } elseif ($jobReq->assigned_karigar_id) {
                $offerQuery->where('provider_id', $jobReq->assigned_karigar_id);
            } else {
                $offerQuery->orderByDesc('updated_at');
            }
            $offer = $offerQuery->first();
        } else {
            $offer = KarigarJobOffer::where('karigar_job_request_id', $jobId)
                ->where('provider_id', $user->id)
                ->first();

            if (!$offer) {
                return response()->json(['message' => 'Unauthorized access to negotiation chat', 'messages' => []], 403);
            }
        }
        
        $customer = $jobReq->customer_id ? User::find($jobReq->customer_id) : null;
        $provider = $offer?->provider_id ? User::find($offer->provider_id) : ($targetProviderId ? User::find($targetProviderId) : null);
        $providerProfile = $offer?->provider_id ? ProviderProfile::where('user_id', $offer->provider_id)->first() : null;

        $dist = ($jobReq->lat && $jobReq->lng && $providerProfile && $providerProfile->current_lat && $providerProfile->current_lng)
            ? round($this->haversineKm($jobReq->lat, $jobReq->lng, $providerProfile->current_lat, $providerProfile->current_lng), 1)
            : null;

        $jobData = [
            'job_id' => $jobId,
            'status' => $jobReq->status ?? ($offer ? $offer->status : 'negotiating'),
            'work_type' => $jobReq->work_type,
            'description' => $jobReq->description,
            'category' => $jobReq->category,
            'labour_type' => $jobReq->category,
            'wage' => $jobReq->wage,
            'job_mode' => $jobReq->job_mode ?? 'daily',
            'time_shift' => $jobReq->time_shift,
            'start_time' => $jobReq->start_time,
            'address' => $jobReq->address,
            'labour_count' => $jobReq->karigar_count ?? 1,
            'booked_spots' => $jobReq->booked_spots ?? 0,
            'distance_km' => $dist,
            'customer_name' => $customer?->name,
            'customer_phone' => $customer?->phone,
            'provider_name' => $providerProfile?->full_name ?? $provider?->name ?? 'कारीगर',
            'provider_phone' => $provider?->phone,
        ];

        if (!$offer) {
            return response()->json(array_merge($jobData, [
                'messages' => [],
                'provider_id' => $targetProviderId ? (int)$targetProviderId : null,
            ]));
        }
        
        return response()->json(array_merge($jobData, [
            'messages' => $offer->messages ?? [],
            'provider_id' => $offer->provider_id,
        ]));
    }

    // ─── POST /api/karigar/negotiation/upload-voice ───────────────────────────
    public function uploadVoice(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:15360|mimes:mp3,wav,m4a,aac,ogg,webm,3gp,mp4',
        ]);

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension() ?: 'm4a';
        $fileName = 'voice_' . uniqid() . '_' . time() . '.' . $extension;
        $path = $file->storeAs('negotiation_voices', $fileName, 'public');

        $url = asset('storage/' . $path);

        return response()->json([
            'url' => $url,
            'file_name' => $fileName,
            'size' => $file->getSize(),
        ]);
    }
}
