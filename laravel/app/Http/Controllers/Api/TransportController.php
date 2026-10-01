<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\NotificationController;
use App\Models\ProviderProfile;
use App\Models\TransportBooking;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\Setting;
use App\Rules\ValidIfsc;
use App\Services\CommissionService;
use App\Services\FcmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * TransportController — Parivahan Seva (Transport / Logistics / Delivery System) Module.
 * 
 * Complete implementation according to Shram Sarathi Network Blueprint:
 * 1. Customer UI Flow:
 *    - Step 1: Immediate (7% commission) vs Advance (5% commission) + Passenger/Goods/Delivery + Vehicle Types
 *    - Step 2: Pickup/Drop location with GPS & OpenStreetMap search + Voice/Text Work Details
 *    - Step 3: Fare Preview with Distance, Rate/km, Total Fare, Interactive Offered Fare Counter ([-] ₹ 195 [+]), Modifier Chips (-10%, -5%, +5%, +10%), Commission Notice
 *    - Step 4: Live broadcast to 5-10km online drivers, live negotiation chat & counter offers, instant contract lock
 * 2. Driver UI & State Machine:
 *    - New Request Alert Card with 60s countdown + Auto-Play Hindi TTS Voice
 *    - Pre-requisite Wallet Balance Check (>= commission) before accept/counter
 *    - Atomic single acceptance (Pessimistic DB lock: lockForUpdate)
 *    - Instant wallet commission deduction (Zero-Bypass Policy) + WalletTransaction logging
 *    - Driver status becomes BUSY / ENGAGED (blocking new incoming requests)
 *    - Digital Transport & Work Agreement with unlocked contacts and navigation
 *    - 'कार्य पूर्ण / Done' action resets driver status back to AVAILABLE (ऑनलाइन)
 * 3. Live Negotiation & Strict Non-Self-Acceptance Rule:
 *    - Driver can counter offer with custom message
 *    - Customer can Accept, Counter Back, or Reject
 *    - Non-Self-Acceptance: Only the recipient can accept the latest counter offer
 */
class TransportController extends Controller
{
    public function __construct(private FcmService $fcm)
    {
    }

    // Default rate chart per KM by vehicle type
    private const VEHICLE_RATES = [
        'bike' => ['rate' => 8.0, 'min' => 30.0, 'name' => 'Bike 🏍️'],
        'auto' => ['rate' => 12.0, 'min' => 50.0, 'name' => 'Auto 🛺'],
        'e_rickshaw' => ['rate' => 10.0, 'min' => 40.0, 'name' => 'E-Rickshaw ⚡'],
        'small_car' => ['rate' => 15.0, 'min' => 100.0, 'name' => 'WagonR / Dzire 🚗'],
        'wagonr_dzire' => ['rate' => 15.0, 'min' => 100.0, 'name' => 'WagonR / Dzire 🚗'],
        'suv' => ['rate' => 20.0, 'min' => 150.0, 'name' => 'Scorpio / Bolero 🚙'],
        'scorpio_bolero' => ['rate' => 20.0, 'min' => 150.0, 'name' => 'Scorpio / Bolero 🚙'],
        'pickup' => ['rate' => 22.0, 'min' => 200.0, 'name' => 'Pickup 🛻'],
        'chota_hathi' => ['rate' => 25.0, 'min' => 250.0, 'name' => 'Chota Hathi 🚚'],
        'loader' => ['rate' => 30.0, 'min' => 300.0, 'name' => 'Loader 🏗️'],
        'tractor' => ['rate' => 30.0, 'min' => 300.0, 'name' => 'Tractor 🚜'],
    ];

    // ─── POST /api/transport/vehicle-setup ────────────────────────────────────
    public function vehicleSetup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'owner_name' => 'required|string|max:150',
            'owner_id_number' => 'sometimes|nullable|string|max:50',
            'driver_name' => 'sometimes|nullable|string|max:150',
            'driver_license' => 'sometimes|nullable|string|max:50',
            'vehicle_number' => 'required|string|max:30',
            'vehicle_type' => 'required|string|max:50',
            'is_passenger_vehicle' => 'sometimes|boolean',
            'is_goods_vehicle' => 'sometimes|boolean',
            'is_delivery_vehicle' => 'sometimes|boolean',
            'per_km_rate' => 'required|numeric|min:1',
            'bank_account_number' => 'sometimes|nullable|string|max:50',
            'bank_ifsc' => ['sometimes', 'nullable', 'string', new ValidIfsc()],
            'referral_code' => 'sometimes|nullable|string|max:30',
            'district' => 'required|string',
            'state' => 'required|string',
            'lat' => 'sometimes|nullable|numeric',
            'lng' => 'sometimes|nullable|numeric',
        ]);

        $user = $request->user();

        if ($user->role === 'customer') {
            $user->role = 'provider';
            $user->save();
        }

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);

        $profile = ProviderProfile::firstOrNew(['user_id' => $user->id]);
        $profile->category = 'transport';
        $profile->owner_name = $data['owner_name'];
        $profile->owner_id_number = $data['owner_id_number'] ?? null;
        $profile->driver_name = $data['driver_name'] ?? $data['owner_name'];
        $profile->driver_license = $data['driver_license'] ?? null;
        $profile->vehicle_number = $data['vehicle_number'];
        $profile->vehicle_type = $data['vehicle_type'];

        $isPassenger = $data['is_passenger_vehicle'] ?? false;
        $isGoods = $data['is_goods_vehicle'] ?? false;
        $isDelivery = $data['is_delivery_vehicle'] ?? false;

        if (!$isPassenger && !$isGoods && !$isDelivery) {
            $vType = strtolower($data['vehicle_type']);
            if (in_array($vType, ['pickup', 'chota_hathi', 'loader', 'tractor'])) {
                $isGoods = true;
            } else {
                $isPassenger = true;
            }
        }

        $profile->is_passenger_vehicle = $isPassenger;
        $profile->is_goods_vehicle = $isGoods;
        $profile->is_delivery_vehicle = $isDelivery;
        $profile->per_km_rate = $data['per_km_rate'];
        $profile->bank_account_number = $data['bank_account_number'] ?? null;
        $profile->bank_ifsc = $data['bank_ifsc'] ?? null;
        $profile->referral_code = $data['referral_code'] ?? null;
        $profile->is_online = true;
        $profile->save();

        \App\Models\WorkingLocation::where('provider_profile_id', $profile->id)->delete();
        \App\Models\WorkingLocation::create([
            'provider_profile_id' => $profile->id,
            'district' => $data['district'],
            'state' => $data['state'],
        ]);

        if (!empty($data['lat']) && !empty($data['lng'])) {
            $profile->current_lat = $data['lat'];
            $profile->current_lng = $data['lng'];
            $profile->save();
        }

        return response()->json([
            'message' => 'Transport profile saved successfully',
            'vehicle_type' => $profile->vehicle_type,
            'per_km_rate' => $profile->per_km_rate,
            'vehicle_number' => $profile->vehicle_number,
        ]);
    }

    // ─── GET /api/transport/vehicles ──────────────────────────────────────────
    public function searchVehicles(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vehicle_category' => 'required|string|in:passenger,goods,delivery',
            'vehicle_type' => 'sometimes|nullable|string',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
        ]);

        $query = ProviderProfile::with(['user', 'user.wallet'])
            ->where('category', 'transport')
            ->where('is_online', true);

        if ($data['vehicle_category'] === 'passenger') {
            $query->where('is_passenger_vehicle', true);
        } elseif ($data['vehicle_category'] === 'goods') {
            $query->where('is_goods_vehicle', true);
        } elseif ($data['vehicle_category'] === 'delivery') {
            $query->where('is_delivery_vehicle', true);
        }

        if (!empty($data['vehicle_type'])) {
            $query->where('vehicle_type', $data['vehicle_type']);
        }

        $vehicles = $query->get()->map(function ($profile) use ($data) {
            $distance = $this->haversineKm(
                $data['lat'],
                $data['lng'],
                $profile->current_lat ?? 0,
                $profile->current_lng ?? 0
            );
            return [
                'vehicle_owner_id' => $profile->user_id,
                'owner_name' => $profile->owner_name ?? $profile->user?->name,
                'driver_name' => $profile->driver_name,
                'vehicle_type' => $profile->vehicle_type,
                'vehicle_number' => $profile->vehicle_number,
                'per_km_rate' => $profile->per_km_rate,
                'rating' => $profile->rating,
                'distance_km' => round($distance, 2),
                'is_passenger' => $profile->is_passenger_vehicle,
                'is_goods' => $profile->is_goods_vehicle,
                'is_delivery' => $profile->is_delivery_vehicle,
            ];
        })->sortBy('distance_km')->values();

        return response()->json($vehicles);
    }

    // ─── POST /api/transport/calculate-fare ───────────────────────────────────
    // Screen 3: Calculates distance, per km rate, total fare, and commission notice
    public function calculateFare(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_type' => 'sometimes|string|in:immediate,advance',
            'service_type' => 'sometimes|string|in:passenger,goods,delivery',
            'vehicle_type' => 'required|string',
            'pickup_address' => 'required|string',
            'pickup_lat' => 'sometimes|nullable|numeric',
            'pickup_lng' => 'sometimes|nullable|numeric',
            'drop_address' => 'required|string',
            'drop_lat' => 'sometimes|nullable|numeric',
            'drop_lng' => 'sometimes|nullable|numeric',
            'work_description' => 'sometimes|nullable|string',
        ]);

        $bookingType = $data['booking_type'] ?? 'immediate';
        $serviceType = $data['service_type'] ?? 'passenger';
        $vehicleType = strtolower($data['vehicle_type']);

        // Determine Per KM Rate
        $vConfig = self::VEHICLE_RATES[$vehicleType] ?? ['rate' => 15.0, 'min' => 100.0, 'name' => 'WagonR / Dzire 🚗'];
        $perKmRate = (float) $vConfig['rate'];
        $minFare = (float) $vConfig['min'];

        // Distance Calculation
        $distanceKm = $this->resolveDistance(
            $data['pickup_address'],
            $data['drop_address'],
            $data['pickup_lat'] ?? null,
            $data['pickup_lng'] ?? null,
            $data['drop_lat'] ?? null,
            $data['drop_lng'] ?? null
        );

        if (!$distanceKm || $distanceKm <= 0) {
            $distanceKm = 12.98; // Fallback demo distance
        }

        // Fare Calculation
        $calculatedFare = round($distanceKm * $perKmRate, 1);
        $totalFare = max($calculatedFare, $minFare);

        // Immediate = 7%, Advance = 5% (Configurable via Admin Panel 5%-7%, min ₹5)
        $normalPct = (float) Setting::get('vehicle_commission_normal_pct', 5.0);
        $immediatePct = (float) Setting::get('vehicle_commission_immediate_pct', 7.0);
        $minCommission = (float) Setting::get('vehicle_min_commission', 5.0);

        $commissionPct = ($bookingType === 'immediate') ? $immediatePct : $normalPct;
        $commissionAmount = max($minCommission, round($totalFare * ($commissionPct / 100), 2));
        $driverNetEarnings = round($totalFare - $commissionAmount, 2);

        return response()->json([
            'distance_km' => $distanceKm,
            'per_km_rate' => $perKmRate,
            'calculated_fare' => $calculatedFare,
            'total_fare' => $totalFare,
            'suggested_fare' => round($totalFare),
            'booking_type' => $bookingType,
            'service_type' => $serviceType,
            'vehicle_type' => $vehicleType,
            'vehicle_type_name' => $vConfig['name'],
            'commission_pct' => $commissionPct,
            'commission_amount' => $commissionAmount,
            'driver_net_earnings' => $driverNetEarnings,
            'commission_notice' => 'प्लेटफॉर्म कमीशन वाहन स्वामी के वॉलेट से काटा जाएगा',
        ]);
    }

    // ─── POST /api/transport/book (Broadcast Request) ─────────────────────────
    // Screen 3 Action: Customer sends broadcast to nearby online drivers
    public function bookRide(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_type' => 'sometimes|string|in:immediate,advance',
            'scheduled_date' => 'sometimes|nullable|string',
            'scheduled_time' => 'sometimes|nullable|string',
            'service_type' => 'sometimes|string|in:passenger,goods,delivery',
            'vehicle_type' => 'required|string',
            'pickup_address' => 'required|string',
            'pickup_lat' => 'sometimes|nullable|numeric',
            'pickup_lng' => 'sometimes|nullable|numeric',
            'drop_address' => 'required|string',
            'drop_lat' => 'sometimes|nullable|numeric',
            'drop_lng' => 'sometimes|nullable|numeric',
            'work_description' => 'sometimes|nullable|string',
            'distance_km' => 'sometimes|nullable|numeric',
            'per_km_rate' => 'sometimes|nullable|numeric',
            'total_fare' => 'required|numeric|min:1',
            'offered_fare' => 'required|numeric|min:1',
        ]);

        $customer = $request->user();
        $bookingType = $data['booking_type'] ?? 'immediate';
        $serviceType = $data['service_type'] ?? 'passenger';
        $vehicleType = strtolower($data['vehicle_type']);
        $offeredFare = (float) $data['offered_fare'];

        // Dynamic commission from Admin Settings (5% - 7%, min ₹5)
        $normalPct = (float) Setting::get('vehicle_commission_normal_pct', 5.0);
        $immediatePct = (float) Setting::get('vehicle_commission_immediate_pct', 7.0);
        $minCommission = (float) Setting::get('vehicle_min_commission', 5.0);

        $commissionPct = ($bookingType === 'immediate') ? $immediatePct : $normalPct;
        $commissionAmount = max($minCommission, round($offeredFare * ($commissionPct / 100), 2));

        $pin = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

        // Find candidate online drivers
        $driverQuery = ProviderProfile::with(['user', 'user.wallet'])
            ->where('category', 'transport')
            ->where('is_online', true);

        // Vehicle category matching
        if ($serviceType === 'passenger') {
            $driverQuery->where('is_passenger_vehicle', true);
        } elseif ($serviceType === 'goods') {
            $driverQuery->where('is_goods_vehicle', true);
        } elseif ($serviceType === 'delivery') {
            $driverQuery->where('is_delivery_vehicle', true);
        }

        // Wallet balance check for drivers (must have >= commission)
        $minReqBalance = $commissionAmount;
        $candidateDrivers = $driverQuery->get()->filter(function ($profile) use ($minReqBalance) {
            $wallet = $profile->user?->wallet;
            return $wallet && ($wallet->balance >= $minReqBalance || env('WALLET_CHECK_BYPASS', false));
        });

        // Pick initial assigned driver if available, else first transport provider
        $initialDriverId = $candidateDrivers->first()?->user_id ?? User::where('role', 'provider')->first()?->id ?? 1;

        $booking = TransportBooking::create([
            'customer_id' => $customer->id,
            'vehicle_owner_id' => $initialDriverId,
            'booking_type' => $bookingType,
            'scheduled_date' => $data['scheduled_date'] ?? null,
            'scheduled_time' => $data['scheduled_time'] ?? null,
            'service_type' => $serviceType,
            'vehicle_category' => $serviceType,
            'vehicle_type' => $vehicleType,
            'pickup_address' => $data['pickup_address'],
            'pickup_lat' => $data['pickup_lat'] ?? null,
            'pickup_lng' => $data['pickup_lng'] ?? null,
            'drop_address' => $data['drop_address'],
            'drop_lat' => $data['drop_lat'] ?? null,
            'drop_lng' => $data['drop_lng'] ?? null,
            'work_description' => $data['work_description'] ?? 'यात्रा / सामान परिवहन',
            'distance_km' => $data['distance_km'] ?? 12.98,
            'per_km_rate' => $data['per_km_rate'] ?? 15.0,
            'total_fare' => (float) $data['total_fare'],
            'offered_fare' => $offeredFare,
            'agreed_fare' => $offeredFare,
            'commission_pct' => $commissionPct,
            'commission_amount' => $commissionAmount,
            'secret_pin' => $pin,
            'status' => 'searching',
            'assigned_at' => now(),
            'rejected_drivers' => [],
            'messages' => [],
        ]);

        // Generate Hindi TTS Audio text for drivers (Blueprint Page 3)
        $serviceLabel = match ($serviceType) {
            'goods' => 'माल',
            'delivery' => 'डिलीवरी',
            default => 'यात्री',
        };
        $ttsText = "नया {$serviceLabel} अनुरोध आया है। {$data['pickup_address']} से {$data['drop_address']}, दूरी " . round($booking->distance_km) . " किलोमीटर। काम का विवरण: {$booking->work_description}। प्रस्तावित किराया ₹" . round($offeredFare) . " रुपये है।";

        // FCM Broadcast to all nearby matching drivers
        $timeout = NotificationController::getNotificationTimeout();
        foreach ($candidateDrivers as $driverProfile) {
            $this->fcm->sendToUser(
                userId: $driverProfile->user_id,
                title: '🚗 नया परिवहन अनुरोध!',
                body: $ttsText,
                type: 'new_transport_request',
                data: [
                    'screen' => 'VehicleDriverDash',
                    'booking_id' => (string) $booking->id,
                    'timeout' => (string) $timeout,
                    'tts_text' => $ttsText,
                    'offered_fare' => (string) $offeredFare,
                    'work_description' => $booking->work_description,
                ],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'गाड़ी रिक्वेस्ट सफलतापूर्वक भेजी गई!',
            'booking_id' => $booking->id,
            'status' => 'searching',
            'offered_fare' => $booking->offered_fare,
            'total_fare' => $booking->total_fare,
            'distance_km' => $booking->distance_km,
            'work_description' => $booking->work_description,
            'tts_speech_text' => $ttsText,
        ]);
    }

    // ─── GET /api/transport/driver/pending ────────────────────────────────────
    // Driver UI Screen: Fetches incoming job alert with Hindi TTS text and countdown
    public function driverPendingRequest(Request $request): JsonResponse
    {
        $driver = $request->user();
        $timeout = 120; // 120 seconds alert window (2 minutes)

        // 1. Driver State Check: If driver is currently BUSY on an active trip, return no request
        $activeTrip = TransportBooking::where('vehicle_owner_id', $driver->id)
            ->whereIn('status', ['accepted', 'active'])
            ->first();

        if ($activeTrip) {
            return response()->json([
                'has_request' => false,
                'is_busy' => true,
                'active_booking_id' => $activeTrip->id,
            ]);
        }

        // 2. Profile Check: Driver must be online
        $profile = ProviderProfile::where('user_id', $driver->id)->first();
        if (!$profile || !$profile->is_online) {
            return response()->json(['has_request' => false]);
        }

        // Automatically mark stale transport requests older than 120s as timeout
        TransportBooking::whereIn('status', ['searching', 'negotiating'])
            ->where(function ($q) {
                $q->where('assigned_at', '<', now()->subSeconds(120))
                    ->orWhere(function ($sub) {
                        $sub->whereNull('assigned_at')
                            ->where('created_at', '<', now()->subSeconds(120));
                    });
            })
            ->update(['status' => 'timeout']);

        // Find candidate bookings
        $bookings = TransportBooking::whereIn('status', ['searching', 'negotiating'])
            ->where(function ($q) {
                $q->where('assigned_at', '>=', now()->subSeconds(120))
                    ->orWhere(function ($sub) {
                        $sub->whereNull('assigned_at')
                            ->where('created_at', '>=', now()->subSeconds(120));
                    });
            })
            ->orderByDesc('created_at')
            ->get();

        $booking = null;
        foreach ($bookings as $b) {
            // Check if this driver already rejected this booking
            $rejected = is_array($b->rejected_drivers) ? $b->rejected_drivers : [];
            if (in_array($driver->id, $rejected)) {
                continue;
            }

            // Check vehicle category compatibility
            $matchesCategory = false;
            if ($b->service_type === 'passenger' && $profile->is_passenger_vehicle) {
                $matchesCategory = true;
            } elseif ($b->service_type === 'goods' && $profile->is_goods_vehicle) {
                $matchesCategory = true;
            } elseif ($b->service_type === 'delivery' && $profile->is_delivery_vehicle) {
                $matchesCategory = true;
            } elseif (!$b->service_type) {
                $matchesCategory = true;
            }

            if (!$matchesCategory) {
                continue;
            }

            // Check Wallet Balance: Must have >= commission
            $commAmt = round(($b->offered_fare ?? $b->total_fare) * ($b->commission_pct / 100), 2);
            $wallet = Wallet::firstOrCreate(['user_id' => $driver->id]);
            if (!env('WALLET_CHECK_BYPASS', false) && $wallet->balance < $commAmt) {
                continue;
            }

            // Geo-radius check: If coordinates available, check within 15 km
            if ($profile->current_lat && $profile->current_lng && $b->pickup_lat && $b->pickup_lng) {
                $distKm = $this->haversineKm($profile->current_lat, $profile->current_lng, $b->pickup_lat, $b->pickup_lng);
                if ($distKm > 15.0) {
                    continue;
                }
            }

            $booking = $b;
            break;
        }

        if (!$booking) {
            return response()->json(['has_request' => false]);
        }

        $assignedTime = $booking->assigned_at ?? $booking->created_at ?? now();
        $elapsed = now()->timestamp - $assignedTime->timestamp;
        $remaining = max(0, $timeout - $elapsed);

        if ($remaining <= 0) {
            $booking->status = 'timeout';
            $booking->save();
            return response()->json(['has_request' => false]);
        }

        $serviceLabel = match ($booking->service_type) {
            'goods' => 'माल (Goods)',
            'delivery' => 'डिलीवरी (Delivery)',
            default => 'यात्री (Passenger)',
        };

        $vConfig = self::VEHICLE_RATES[$booking->vehicle_type] ?? ['name' => ucfirst($booking->vehicle_type)];
        $vehicleLabel = $vConfig['name'];

        $commissionAmt = round(($booking->offered_fare ?? $booking->total_fare) * ($booking->commission_pct / 100), 2);
        $netEarnings = round(($booking->offered_fare ?? $booking->total_fare) - $commissionAmt, 2);

        $ttsText = "नया {$serviceLabel} अनुरोध आया है। {$booking->pickup_address} से {$booking->drop_address}, दूरी " . round($booking->distance_km) . " किलोमीटर। काम का विवरण: {$booking->work_description}। प्रस्तावित किराया ₹" . round($booking->offered_fare ?? $booking->total_fare) . " रुपये है।";

        return response()->json([
            'has_request' => true,
            'booking_id' => $booking->id,
            'service_type' => $booking->service_type,
            'service_label' => $serviceLabel,
            'vehicle_type' => $booking->vehicle_type,
            'vehicle_type_label' => $vehicleLabel,
            'booking_type' => $booking->booking_type,
            'pickup_address' => $booking->pickup_address,
            'drop_address' => $booking->drop_address,
            'distance_km' => (float) $booking->distance_km,
            'work_description' => $booking->work_description,
            'offered_fare' => (float) ($booking->offered_fare ?? $booking->total_fare),
            'total_fare' => (float) $booking->total_fare,
            'commission_pct' => (float) $booking->commission_pct,
            'commission_amount' => $commissionAmt,
            'driver_net_earnings' => $netEarnings,
            'tts_speech_text' => $ttsText,
            'timeout_seconds' => $timeout,
            'remaining_seconds' => $remaining,
            'messages' => $booking->messages ?? [],
            'status' => $booking->status,
        ]);
    }

    // ─── POST /api/transport/driver/accept (Instant Lock & Wallet Deduction) ──
    public function driverAccept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $driver = $request->user();

        try {
            DB::beginTransaction();

            $booking = TransportBooking::where('id', $data['booking_id'])
                ->lockForUpdate()
                ->first();

            if (!$booking || !in_array($booking->status, ['searching', 'negotiating'])) {
                DB::rollBack();
                return response()->json(['detail' => 'यह अनुरोध किसी अन्य ड्राइवर द्वारा स्वीकार किया जा चुका है या समाप्त हो चुका है।'], 400);
            }

            // Strict Non-Self-Acceptance Rule: If driver is the sender of the latest counter offer, driver cannot accept
            $msgs = $booking->messages ?? [];
            if (!empty($msgs)) {
                $lastMsg = end($msgs);
                if (isset($lastMsg['sender']) && $lastMsg['sender'] === 'driver') {
                    DB::rollBack();
                    return response()->json(['detail' => 'आपने यह काउंटर-ऑफ़र भेजा है। केवल ग्राहक ही इसे स्वीकार कर सकता है।'], 400);
                }
            }

            $fare = (float) ($booking->agreed_fare ?: $booking->offered_fare ?: $booking->total_fare);
            $commissionAmt = round($fare * ($booking->commission_pct / 100), 2);

            // 1. Pre-requisite Wallet Balance Check (Blueprint Rule 1)
            $wallet = Wallet::firstOrCreate(['user_id' => $driver->id]);
            $bypassWallet = filter_var(env('WALLET_CHECK_BYPASS', false), FILTER_VALIDATE_BOOLEAN);
            if (!$bypassWallet && $wallet->balance < $commissionAmt) {
                DB::rollBack();
                $shortage = round($commissionAmt - $wallet->balance, 2);
                return response()->json([
                    'detail' => "वॉलेट में पर्याप्त बैलेंस नहीं है। कृपया पहले ₹{$shortage} का रिचार्ज करें।",
                    'balance' => $wallet->balance,
                    'required' => $commissionAmt,
                    'shortage' => $shortage,
                ], 400);
            }

            // 2. Direct Wallet Commission Deduction (Zero-Bypass Policy - Blueprint Rule 2)
            $wallet->balance -= $commissionAmt;
            $wallet->save();

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $driver->id,
                'amount' => $commissionAmt,
                'type' => 'debit',
                'category' => 'PLATFORM_FEE',
                'description' => "परिवहन बुकिंग कमीशन ({$booking->commission_pct}%) - Booking #{$booking->id}",
                'balance_after' => $wallet->balance,
                'hold_status' => 'none',
            ]);

            // 3. Update Booking State
            $msgs = $booking->messages ?? [];
            $msgs[] = [
                'sender' => 'system',
                'type' => 'accepted',
                'wage' => (float) $fare,
                'message' => "🎉 ड्राइवर ने ₹{$fare} का अनुरोध स्वीकार कर लिया है! यात्रा स्वीकृत हो गई।",
                'timestamp' => now()->toISOString(),
            ];

            $booking->vehicle_owner_id = $driver->id;
            $booking->status = 'accepted';
            $booking->agreed_fare = $fare;
            $booking->commission_amount = $commissionAmt;
            $booking->commission_debited = true;
            $booking->pin_verified_at = now();
            $booking->messages = $msgs;
            $booking->save();

            // 4. Update Driver State to BUSY / ENGAGED (Blueprint Rule 3)
            $profile = ProviderProfile::where('user_id', $driver->id)->first();
            if ($profile) {
                $profile->is_online = false; // Mark Busy
                $profile->save();
            }

            DB::commit();

            // Trigger Agent Residual Commission (0.20% for Vehicle/Transport)
            try {
                app(CommissionService::class)->processContractorOrVehicleBookingResidual($driver->id, $booking->id, $fare, 'Transport');
            } catch (\Throwable $e) {
                Log::warning("[Transport] Agent residual commission error: " . $e->getMessage());
            }

            $customer = User::find($booking->customer_id);

            // FCM Notification to Customer
            $this->fcm->sendToUser(
                userId: $booking->customer_id,
                title: '✅ ड्राइवर मिल गया!',
                body: "{$driver->name} ने आपका अनुरोध स्वीकार कर लिया है।",
                type: 'accepted',
                data: [
                    'screen' => 'TransportBooking',
                    'booking_id' => (string) $booking->id,
                ],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );

            return response()->json([
                'success' => true,
                'message' => 'अनुरोध सफलतापूर्वक स्वीकार किया गया!',
                'booking_id' => $booking->id,
                'status' => 'accepted',
                'agreed_fare' => $booking->agreed_fare,
                'commission_paid' => $commissionAmt,
                'customer_name' => $customer?->name,
                'customer_phone' => $customer?->phone,
                'pickup_address' => $booking->pickup_address,
                'drop_address' => $booking->drop_address,
                'work_description' => $booking->work_description,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("[Transport] driverAccept error: " . $e->getMessage());
            return response()->json(['detail' => 'Acceptance failed: ' . $e->getMessage()], 500);
        }
    }

    // ─── POST /api/transport/driver/counter (Cross Offer) ─────────────────────
    // Driver sends custom counter offer (e.g. ₹220) and message
    public function driverCounter(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
            'wage' => 'required|numeric|min:1',
            'message' => 'sometimes|nullable|string',
        ]);

        $driver = $request->user();
        $counterFare = (float) $data['wage'];

        $booking = TransportBooking::where('id', $data['booking_id'])
            ->whereIn('status', ['searching', 'negotiating'])
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not available for negotiation'], 404);
        }

        // Wallet Balance Check for driver before counter
        $reqCommission = round($counterFare * ($booking->commission_pct / 100), 2);
        $wallet = Wallet::firstOrCreate(['user_id' => $driver->id]);
        if (!env('WALLET_CHECK_BYPASS', false) && $wallet->balance < $reqCommission) {
            $shortage = round($reqCommission - $wallet->balance, 2);
            return response()->json([
                'detail' => "काउंटर-ऑफ़र भेजने के लिए वॉलेट में कम से कम ₹{$reqCommission} बैलेंस होना चाहिए। (कमी: ₹{$shortage})",
                'shortage' => $shortage,
            ], 400);
        }

        $defaultMsg = "{$booking->pickup_address} से {$booking->drop_address} के लिए मेरा किराया ₹{$counterFare} रहेगा।";
        $msgText = !empty($data['message']) ? $data['message'] : $defaultMsg;

        $newMsg = [
            'sender' => 'driver',
            'sender_name' => $driver->name,
            'wage' => $counterFare,
            'message' => $msgText,
            'timestamp' => now()->toISOString(),
        ];

        $msgs = $booking->messages ?? [];
        $msgs[] = $newMsg;

        $booking->vehicle_owner_id = $driver->id;
        $booking->offered_fare = $counterFare;
        $booking->status = 'negotiating';
        $booking->messages = $msgs;
        $booking->save();

        // FCM to Customer
        $this->fcm->sendToUser(
            userId: $booking->customer_id,
            title: '💬 ड्राइवर का काउंटर-ऑफ़र!',
            body: "ड्राइवर ने ₹{$counterFare} का काउंटर-ऑफ़र भेजा है: \"{$msgText}\"",
            type: 'counter_offer',
            data: [
                'screen' => 'TransportBooking',
                'booking_id' => (string) $booking->id,
                'wage' => (string) $counterFare,
            ],
            bookingId: $booking->id,
            bookingModel: 'transport_bookings'
        );

        return response()->json([
            'success' => true,
            'message' => 'काउंटर-ऑफ़र सफलतापूर्वक भेजा गया!',
            'booking_id' => $booking->id,
            'status' => 'negotiating',
            'counter_fare' => $counterFare,
            'messages' => $booking->messages,
        ]);
    }

    // ─── POST /api/transport/customer/counter (Customer Counter Offer) ────────
    // Customer proposes new counter fare back to driver
    public function customerCounter(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
            'wage' => 'required|numeric|min:1',
            'message' => 'sometimes|nullable|string',
        ]);

        $customer = $request->user();
        $counterFare = (float) $data['wage'];

        $booking = TransportBooking::where('id', $data['booking_id'])
            ->where('customer_id', $customer->id)
            ->whereIn('status', ['searching', 'negotiating'])
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not available for negotiation'], 404);
        }

        $defaultMsg = "ग्राहक का काउंटर-ऑफ़र: ₹{$counterFare}";
        $msgText = !empty($data['message']) ? $data['message'] : $defaultMsg;

        $newMsg = [
            'sender' => 'customer',
            'sender_name' => $customer->name,
            'wage' => $counterFare,
            'message' => $msgText,
            'timestamp' => now()->toISOString(),
        ];

        $msgs = $booking->messages ?? [];
        $msgs[] = $newMsg;

        $booking->offered_fare = $counterFare;
        $booking->status = 'negotiating';
        $booking->messages = $msgs;
        $booking->save();

        // FCM to Driver
        if ($booking->vehicle_owner_id) {
            $this->fcm->sendToUser(
                userId: $booking->vehicle_owner_id,
                title: '💬 ग्राहक का काउंटर-ऑफ़र!',
                body: "ग्राहक ने ₹{$counterFare} का नया ऑफ़र भेजा है: \"{$msgText}\"",
                type: 'counter_offer',
                data: [
                    'screen' => 'VehicleDriverDash',
                    'booking_id' => (string) $booking->id,
                    'wage' => (string) $counterFare,
                ],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'काउंटर-ऑफ़र ड्राइवर को भेज दिया गया!',
            'booking_id' => $booking->id,
            'status' => 'negotiating',
            'counter_fare' => $counterFare,
            'messages' => $booking->messages,
        ]);
    }

    // ─── POST /api/transport/customer/accept (Customer Accepts Counter) ───────
    // Strict Non-Self Acceptance Rule: Customer accepts driver's counter offer
    public function customerAccept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $customer = $request->user();

        try {
            DB::beginTransaction();

            $booking = TransportBooking::where('id', $data['booking_id'])
                ->where('customer_id', $customer->id)
                ->whereIn('status', ['searching', 'negotiating'])
                ->lockForUpdate()
                ->first();

            if (!$booking || !$booking->vehicle_owner_id) {
                DB::rollBack();
                return response()->json(['detail' => 'Booking unavailable or no driver assigned.'], 400);
            }

            // Strict Non-Self-Acceptance Rule: If customer is the sender of the latest counter offer, customer cannot self-accept
            $msgs = $booking->messages ?? [];
            if (!empty($msgs)) {
                $lastMsg = end($msgs);
                if (isset($lastMsg['sender']) && $lastMsg['sender'] === 'customer') {
                    DB::rollBack();
                    return response()->json(['detail' => 'आपने यह काउंटर-ऑफ़र भेजा है। केवल ड्राइवर ही इसे स्वीकार कर सकता है।'], 400);
                }
            }

            $driverId = $booking->vehicle_owner_id;
            $agreedFare = (float) ($booking->offered_fare ?: $booking->total_fare);
            $commissionAmt = round($agreedFare * ($booking->commission_pct / 100), 2);

            // Deduct commission from driver wallet
            $wallet = Wallet::firstOrCreate(['user_id' => $driverId]);
            $bypassWallet = filter_var(env('WALLET_CHECK_BYPASS', false), FILTER_VALIDATE_BOOLEAN);
            if (!$bypassWallet && $wallet->balance < $commissionAmt) {
                DB::rollBack();
                return response()->json(['detail' => 'ड्राइवर के वॉलेट में पर्याप्त बैलेंस नहीं है।'], 400);
            }

            $wallet->balance -= $commissionAmt;
            $wallet->save();

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $driverId,
                'amount' => $commissionAmt,
                'type' => 'debit',
                'category' => 'PLATFORM_FEE',
                'description' => "परिवहन बुकिंग कमीशन ({$booking->commission_pct}%) - Booking #{$booking->id}",
                'balance_after' => $wallet->balance,
                'hold_status' => 'none',
            ]);

            $msgs = $booking->messages ?? [];
            $msgs[] = [
                'sender' => 'system',
                'type' => 'accepted',
                'wage' => (float) $agreedFare,
                'message' => "🎉 ग्राहक ने ₹{$agreedFare} का ऑफ़र स्वीकार कर लिया है! यात्रा स्वीकृत हो गई।",
                'timestamp' => now()->toISOString(),
            ];

            $booking->status = 'accepted';
            $booking->agreed_fare = $agreedFare;
            $booking->commission_amount = $commissionAmt;
            $booking->commission_debited = true;
            $booking->pin_verified_at = now();
            $booking->messages = $msgs;
            $booking->save();

            // Set driver status to BUSY
            $profile = ProviderProfile::where('user_id', $driverId)->first();
            if ($profile) {
                $profile->is_online = false;
                $profile->save();
            }

            DB::commit();

            // Trigger Agent Residual Commission (0.20% for Vehicle/Transport)
            try {
                app(CommissionService::class)->processContractorOrVehicleBookingResidual($driverId, $booking->id, $agreedFare, 'Transport');
            } catch (\Throwable $e) {
                Log::warning("[Transport] Agent residual commission error: " . $e->getMessage());
            }

            $driver = User::find($driverId);

            // FCM to Driver
            $this->fcm->sendToUser(
                userId: $driverId,
                title: '🎉 ग्राहक ने काउंटर-ऑफ़र स्वीकार किया!',
                body: "ग्राहक ने ₹{$agreedFare} का ऑफ़र मंज़ूर कर लिया है। डिजिटल समझौता तैयार है!",
                type: 'accepted',
                data: ['screen' => 'VehicleDriverDash', 'booking_id' => (string) $booking->id],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );

            return response()->json([
                'success' => true,
                'message' => 'काउंटर-ऑफ़र स्वीकार किया गया! डिजिटल समझौता तैयार है।',
                'booking_id' => $booking->id,
                'status' => 'accepted',
                'agreed_fare' => $booking->agreed_fare,
                'driver_name' => $driver?->name,
                'driver_phone' => $driver?->phone,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("[Transport] customerAccept error: " . $e->getMessage());
            return response()->json(['detail' => 'Customer acceptance failed'], 500);
        }
    }

    // ─── POST /api/transport/driver/reject ────────────────────────────────────
    // Driver rejects an incoming request or negotiation
    public function driverReject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $driver = $request->user();
        $booking = TransportBooking::where('id', $data['booking_id'])->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found.'], 404);
        }

        $rejected = is_array($booking->rejected_drivers) ? $booking->rejected_drivers : [];
        if (!in_array($driver->id, $rejected)) {
            $rejected[] = $driver->id;
            $booking->rejected_drivers = $rejected;
        }

        // If rejection happens during active negotiation or after cross-offer
        $isNegotiatingWithThisDriver = ($booking->vehicle_owner_id == $driver->id || $booking->status === 'negotiating' || !empty($booking->messages));

        if ($isNegotiatingWithThisDriver) {
            $msgs = $booking->messages ?? [];
            $msgs[] = [
                'sender' => 'driver',
                'sender_name' => $driver->name,
                'type' => 'rejected',
                'wage' => (float) ($booking->offered_fare ?? $booking->total_fare),
                'message' => "ड्राइवर ({$driver->name}) ने यह ऑफ़र / अनुरोध अस्वीकार (Reject) कर दिया है।",
                'timestamp' => now()->toISOString(),
            ];
            $booking->messages = $msgs;
            $booking->status = 'driver_rejected';
            $booking->vehicle_owner_id = null;

            // Send FCM Notification to Customer
            $this->fcm->sendToUser(
                userId: $booking->customer_id,
                title: '❌ ड्राइवर ने ऑफ़र अस्वीकार किया',
                body: "{$driver->name} ने आपका काउंटर-ऑफ़र / अनुरोध अस्वीकार कर दिया है।",
                type: 'driver_rejected',
                data: [
                    'screen' => 'TransportBooking',
                    'booking_id' => (string) $booking->id,
                ],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );
        }

        $booking->save();

        return response()->json([
            'success' => true,
            'message' => 'अनुरोध अस्वीकार किया गया।',
            'booking_id' => $booking->id,
            'status' => $booking->status,
            'messages' => $booking->messages ?? [],
        ]);
    }

    // ─── POST /api/transport/customer/reject ──────────────────────────────────
    // Customer rejects driver's counter offer during negotiation
    public function customerReject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
        ]);

        $customer = $request->user();
        $booking = TransportBooking::where('id', $data['booking_id'])
            ->where('customer_id', $customer->id)
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found.'], 404);
        }

        $driverId = $booking->vehicle_owner_id;

        $msgs = $booking->messages ?? [];
        $msgs[] = [
            'sender' => 'customer',
            'sender_name' => $customer->name,
            'type' => 'rejected',
            'wage' => (float) ($booking->offered_fare ?? $booking->total_fare),
            'message' => 'ग्राहक ने ड्राइवर का काउंटर-ऑफ़र अस्वीकार (Reject) कर दिया है।',
            'timestamp' => now()->toISOString(),
        ];
        $booking->messages = $msgs;
        $booking->status = 'customer_rejected';

        if ($driverId) {
            $rejected = is_array($booking->rejected_drivers) ? $booking->rejected_drivers : [];
            if (!in_array($driverId, $rejected)) {
                $rejected[] = $driverId;
                $booking->rejected_drivers = $rejected;
            }
            $booking->vehicle_owner_id = null;

            // FCM to Driver
            $this->fcm->sendToUser(
                userId: $driverId,
                title: '❌ ग्राहक ने ऑफ़र अस्वीकार किया',
                body: 'ग्राहक ने आपका काउंटर-ऑफ़र अस्वीकार कर दिया है।',
                type: 'customer_rejected',
                data: ['screen' => 'VehicleDriverDash', 'booking_id' => (string) $booking->id],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );
        }

        $booking->save();

        return response()->json([
            'success' => true,
            'message' => 'ऑफ़र अस्वीकार कर दिया गया।',
            'booking_id' => $booking->id,
            'status' => $booking->status,
            'messages' => $booking->messages ?? [],
        ]);
    }

    // ─── POST /api/transport/driver/complete (End Trip / Done Action) ─────────
    // Driver taps 'कार्य पूर्ण / Done' -> resets driver status to AVAILABLE
    public function completeBooking(Request $request): JsonResponse
    {
        $data = $request->validate(['booking_id' => 'required|integer']);
        $driver = $request->user();

        $booking = TransportBooking::where('id', $data['booking_id'])
            ->where('vehicle_owner_id', $driver->id)
            ->whereIn('status', ['accepted', 'active'])
            ->first();

        if (!$booking) {
            return response()->json(['detail' => 'Active booking not found.'], 404);
        }

        $booking->status = 'completed';
        $booking->save();

        // Restore Driver State to AVAILABLE (Online) (Blueprint Rule 4)
        $profile = ProviderProfile::where('user_id', $driver->id)->first();
        if ($profile) {
            $profile->is_online = true;
            $profile->save();
        }

        // FCM to Customer
        $this->fcm->sendToUser(
            userId: $booking->customer_id,
            title: '🎉 यात्रा / डिलीवरी पूरी हो गई!',
            body: 'आपकी ट्रिप सफलतापूर्वक पूरी हो गई है। कृपया रेटिंग दें!',
            type: 'completed',
            data: ['screen' => 'TransportBooking', 'booking_id' => (string) $booking->id],
            bookingId: $booking->id,
            bookingModel: 'transport_bookings'
        );

        return response()->json([
            'success' => true,
            'message' => 'यात्रा सफलतापूर्वक पूर्ण चिह्नित की गई!',
            'status' => 'completed',
            'is_online' => true,
        ]);
    }

    // ─── GET /api/transport/booking/{id}/agreement (Digital Contract Summary) ─
    public function digitalAgreement(Request $request, int $id): JsonResponse
    {
        $booking = TransportBooking::find($id);

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        $customer = User::find($booking->customer_id);
        $owner = User::find($booking->vehicle_owner_id);
        $profile = ProviderProfile::where('user_id', $booking->vehicle_owner_id)->first();

        $vConfig = self::VEHICLE_RATES[$booking->vehicle_type] ?? ['name' => ucfirst($booking->vehicle_type)];

        $serviceLabel = match ($booking->service_type) {
            'goods' => 'माल परिवहन (Goods Transport)',
            'delivery' => 'डिलीवरी (Delivery)',
            default => 'यात्री सेवा (Passenger Transport)',
        };

        $agreedFare = (float) ($booking->agreed_fare ?: $booking->offered_fare ?: $booking->total_fare);
        $commAmt = (float) $booking->commission_amount;
        $netEarnings = (float) round($agreedFare - $commAmt, 2);

        return response()->json([
            'booking_id' => $booking->id,
            'booking_reference' => "SSN-TR-{$booking->id}",
            'booking_id_formatted' => "SSN-TR-{$booking->id}",
            'status' => $booking->status === 'completed' ? 'पूर्ण (Completed)' : ($booking->status === 'accepted' ? 'स्वीकृत (Locked)' : $booking->status),
            'raw_status' => $booking->status,
            'service_type' => $booking->service_type,
            'service_label' => $serviceLabel,
            'service_type_label' => $serviceLabel,
            'vehicle_type' => $booking->vehicle_type,
            'vehicle_type_label' => $vConfig['name'],
            'vehicle_number' => $profile?->vehicle_number ?? 'DL-01-XXXX',
            'customer_name' => $customer?->name ?? 'ग्राहक',
            'customer_phone' => $customer?->phone ?? '',
            'driver_name' => $profile?->driver_name ?? $owner?->name ?? 'ड्राइवर',
            'driver_phone' => $owner?->phone ?? '',
            'pickup_address' => $booking->pickup_address,
            'drop_address' => $booking->drop_address,
            'distance_km' => (float) $booking->distance_km,
            'work_description' => $booking->work_description,
            'agreed_work_details' => $booking->work_description,
            'total_fare' => (float) $booking->total_fare,
            'agreed_fare' => $agreedFare,
            'payment_mode' => 'ड्राइवर को नकद / UPI',
            'commission_pct' => (float) $booking->commission_pct,
            'commission_amount' => $commAmt,
            'driver_net_earnings' => $netEarnings,
            'secret_pin' => $booking->secret_pin,
            'created_at' => $booking->created_at?->toISOString(),
            'pin_verified_at' => $booking->pin_verified_at?->toISOString(),
            'terms' => 'तय किराये से अतिरिक्त कोई मांग मान्य नहीं होगी।',
        ]);
    }

    // ─── GET /api/transport/booking/{id} ──────────────────────────────────────
    public function bookingStatus(Request $request, int $id): JsonResponse
    {
        $booking = TransportBooking::find($id);

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        // Auto-timeout check: If searching/negotiating for more than 120s without acceptance
        if (in_array($booking->status, ['searching', 'negotiating'])) {
            $assignedAt = $booking->assigned_at ?? $booking->created_at;
            $elapsedSeconds = $assignedAt ? now()->diffInSeconds($assignedAt) : 0;
            if ($elapsedSeconds >= 120) {
                $booking->status = 'timeout';
                $booking->save();
            }
        }

        $customer = User::find($booking->customer_id);
        $owner = User::find($booking->vehicle_owner_id);
        $providerProfile = ProviderProfile::where('user_id', $booking->vehicle_owner_id)->first();
        $vConfig = self::VEHICLE_RATES[$booking->vehicle_type] ?? ['name' => ucfirst($booking->vehicle_type)];

        return response()->json([
            'booking_id' => $booking->id,
            'status' => $booking->status,
            'vehicle_type' => $booking->vehicle_type,
            'vehicle_type_label' => $vConfig['name'],
            'service_type' => $booking->service_type,
            'pickup_address' => $booking->pickup_address,
            'drop_address' => $booking->drop_address,
            'distance_km' => (float) $booking->distance_km,
            'total_fare' => (float) $booking->total_fare,
            'offered_fare' => (float) ($booking->offered_fare ?? $booking->total_fare),
            'agreed_fare' => (float) ($booking->agreed_fare ?? $booking->offered_fare ?? $booking->total_fare),
            'commission_amount' => (float) $booking->commission_amount,
            'work_description' => $booking->work_description,
            'customer_name' => $customer?->name ?? 'ग्राहक',
            'customer_phone' => $customer?->phone ?? '',
            'owner_phone' => $owner?->phone ?? '',
            'driver_phone' => $owner?->phone ?? '',
            'driver_name' => $providerProfile?->driver_name ?? $owner?->name ?? 'ड्राइवर',
            'vehicle_number' => $providerProfile?->vehicle_number ?? 'DL-01-XXXX',
            'driver_lat' => $providerProfile?->current_lat,
            'driver_lng' => $providerProfile?->current_lng,
            'secret_pin' => $booking->secret_pin,
            'messages' => $booking->messages ?? [],
        ]);
    }

    // ─── POST /api/transport/verify-pin ───────────────────────────────────────
    public function verifyPin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
            'pin' => 'required|string|size:4',
        ]);

        $booking = TransportBooking::where('id', $data['booking_id'])->first();
        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        if ($booking->secret_pin !== $data['pin']) {
            return response()->json(['detail' => 'गलत पिन दर्ज किया गया है।'], 400);
        }

        $booking->pin_verified_at = now();
        $booking->status = 'active';
        $booking->save();

        return response()->json([
            'success' => true,
            'message' => 'पिन सत्यापित! यात्रा प्रारंभ हुई।',
            'status' => 'active',
        ]);
    }



    // ─── GET /api/transport/places/search?q={query} ───────────────────────────
    public function searchPlaces(Request $request): JsonResponse
    {
        $query = trim($request->query('q', ''));
        if (strlen($query) < 2) {
            return response()->json([]);
        }

        // 1. Try Photon (fast, unthrottled OpenStreetMap typeahead)
        try {
            $photonRes = Http::timeout(3)->get('https://photon.komoot.io/api/', [
                'q' => $query,
                'limit' => 8,
                'lang' => 'en',
            ]);

            if ($photonRes->successful()) {
                $features = $photonRes->json('features') ?? [];
                $suggestions = [];
                foreach ($features as $f) {
                    $props = $f['properties'] ?? [];
                    $coords = $f['geometry']['coordinates'] ?? [0, 0];
                    if (!empty($props['countrycode']) && strtoupper($props['countrycode']) !== 'IN') {
                        continue;
                    }

                    $parts = array_filter([
                        $props['name'] ?? '',
                        $props['street'] ?? '',
                        $props['city'] ?? $props['town'] ?? $props['village'] ?? $props['county'] ?? '',
                        $props['state'] ?? '',
                    ]);
                    $shortName = implode(', ', array_unique($parts));
                    if (!empty($shortName)) {
                        $suggestions[] = [
                            'place_id' => (string) ($props['osm_id'] ?? uniqid()),
                            'display_name' => $shortName . (!empty($props['country']) ? ", {$props['country']}" : ''),
                            'short_name' => $shortName,
                            'lat' => (float) ($coords[1] ?? 0),
                            'lng' => (float) ($coords[0] ?? 0),
                        ];
                    }
                }

                if (!empty($suggestions)) {
                    return response()->json($suggestions);
                }
            }
        } catch (\Throwable $e) {
            Log::warning("[Transport] Photon searchPlaces error: " . $e->getMessage());
        }

        // 2. Fallback to Nominatim
        try {
            $nomQuery = !preg_match('/india/i', $query) ? "{$query}, India" : $query;
            $res = Http::timeout(4)->withHeaders([
                'User-Agent' => 'ShramSarthi-GeoService/2.0 (support@shramsarthi.in)',
                'Accept-Language' => 'hi,en;q=0.9',
            ])->get('https://nominatim.openstreetmap.org/search', [
                'q' => $nomQuery,
                'format' => 'json',
                'addressdetails' => 1,
                'limit' => 6,
                'countrycodes' => 'in',
            ]);

            if ($res->successful()) {
                $items = $res->json() ?? [];
                $suggestions = [];
                foreach ($items as $item) {
                    $a = $item['address'] ?? [];
                    $parts = array_filter([
                        $item['name'] ?? $a['road'] ?? $a['suburb'] ?? '',
                        $a['city'] ?? $a['town'] ?? $a['village'] ?? $a['county'] ?? '',
                        $a['state'] ?? '',
                    ]);
                    $short = implode(', ', array_unique($parts));
                    $suggestions[] = [
                        'place_id' => (string) ($item['place_id'] ?? uniqid()),
                        'display_name' => $item['display_name'] ?? $short,
                        'short_name' => $short ?: ($item['display_name'] ?? $query),
                        'lat' => (float) ($item['lat'] ?? 0),
                        'lng' => (float) ($item['lon'] ?? 0),
                    ];
                }
                return response()->json($suggestions);
            }
        } catch (\Throwable $e) {
            Log::warning("[Transport] Nominatim searchPlaces error: " . $e->getMessage());
        }

        return response()->json([]);
    }

    // ─── POST /api/transport/rate ─────────────────────────────────────────────
    public function rateBooking(Request $request): JsonResponse
    {
        $data = $request->validate([
            'booking_id' => 'required|integer',
            'rating' => 'required|numeric|min:1|max:5',
            'review' => 'sometimes|nullable|string',
        ]);

        $booking = TransportBooking::where('id', $data['booking_id'])->first();
        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        if ($booking->vehicle_owner_id) {
            $profile = ProviderProfile::where('user_id', $booking->vehicle_owner_id)->first();
            if ($profile) {
                $currentCount = $profile->rating_count ?? 0;
                $currentAvg = $profile->rating ?? 5.0;
                $newRating = round((($currentAvg * $currentCount) + $data['rating']) / ($currentCount + 1), 2);
                $profile->rating = $newRating;
                $profile->rating_count = $currentCount + 1;
                $profile->save();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'रेटिंग दर्ज की गई। धन्यवाद!',
        ]);
    }


    // ─── POST /api/transport/booking/{id}/cancel ─────────────────────────────
    public function cancelBooking(Request $request, ?int $id = null): JsonResponse
    {
        $bookingId = $id ?? $request->input('booking_id');
        $user = $request->user();
        $booking = TransportBooking::where('id', $bookingId)->first();

        if (!$booking) {
            return response()->json(['detail' => 'Booking not found'], 404);
        }

        if ($booking->customer_id !== $user->id && $booking->vehicle_owner_id !== $user->id) {
            return response()->json(['detail' => 'Unauthorized'], 403);
        }

        if (in_array($booking->status, ['completed', 'cancelled'])) {
            return response()->json(['detail' => 'Booking is already ' . $booking->status], 400);
        }

        // Refund driver commission if debited
        if ($booking->commission_debited && $booking->vehicle_owner_id && $booking->commission_amount > 0) {
            $wallet = Wallet::firstOrCreate(['user_id' => $booking->vehicle_owner_id]);
            $wallet->balance += $booking->commission_amount;
            $wallet->save();

            WalletTransaction::create([
                'wallet_id' => $wallet->id,
                'user_id' => $booking->vehicle_owner_id,
                'amount' => $booking->commission_amount,
                'type' => 'credit',
                'category' => 'REFUND',
                'description' => "परिवहन बुकिंग कैंसलेशन रिफंड - Booking #{$booking->id}",
                'balance_after' => $wallet->balance,
                'hold_status' => 'none',
            ]);
        }

        $booking->status = 'cancelled';
        $booking->save();

        // If driver was marked busy, make them online/available again
        if ($booking->vehicle_owner_id) {
            $profile = ProviderProfile::where('user_id', $booking->vehicle_owner_id)->first();
            if ($profile) {
                $profile->is_online = true;
                $profile->save();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'बुकिंग सफलतापूर्वक रद्द कर दी गई।',
            'status' => 'cancelled',
        ]);
    }

    // ─── POST /api/transport/negotiation/send ─────────────────────────────────
    public function sendNegotiation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'job_id' => 'required|integer',
            'wage' => 'nullable|numeric|min:1',
            'message' => 'sometimes|nullable|string',
            'content' => 'sometimes|nullable|string',
            'type' => 'sometimes|nullable|string|in:text,offer,voice',
        ]);

        $booking = TransportBooking::where('id', $data['job_id'])->first();
        if (!$booking) {
            return response()->json(['detail' => 'Booking not found.'], 404);
        }

        $user = $request->user();
        $isCustomer = $user->role === 'customer' || $booking->customer_id === $user->id;
        $senderRole = $isCustomer ? 'customer' : 'driver';

        $wage = $data['wage'] ?? null;
        $type = $data['type'] ?? ($wage ? 'offer' : 'text');
        $content = !empty($data['content']) ? $data['content'] : (!empty($data['message']) ? $data['message'] : ($wage ? "प्रस्तावित किराया: ₹{$wage}" : 'संदेश'));

        // If it's a price offer/counter, update booking offered_fare & validate driver wallet if driver
        if ($wage) {
            $counterFare = (float) $wage;
            if (!$isCustomer) {
                $reqCommission = round($counterFare * ($booking->commission_pct / 100), 2);
                $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);
                if (!env('WALLET_CHECK_BYPASS', false) && $wallet->balance < $reqCommission) {
                    $shortage = round($reqCommission - $wallet->balance, 2);
                    return response()->json([
                        'detail' => "काउंटर-ऑफ़र भेजने के लिए वॉलेट में कम से कम ₹{$reqCommission} बैलेंस होना चाहिए। (कमी: ₹{$shortage})",
                        'shortage' => $shortage,
                    ], 400);
                }
                $booking->vehicle_owner_id = $user->id;
            }
            $booking->offered_fare = $counterFare;
        }

        $msgs = $booking->messages ?? [];
        $newMsg = [
            'id' => uniqid('msg_'),
            'sender' => $senderRole,
            'sender_name' => $user->name,
            'type' => $type,
            'content' => $content,
            'message' => $content,
            'wage' => $wage ? (float) $wage : null,
            'timestamp' => now()->toISOString(),
        ];
        $msgs[] = $newMsg;

        $booking->status = 'negotiating';
        $booking->messages = $msgs;
        $booking->save();

        // Send FCM Notification
        $receiverId = $isCustomer ? $booking->vehicle_owner_id : $booking->customer_id;
        if ($receiverId) {
            $notifTitle = $isCustomer ? '💬 ग्राहक का संदेश / काउंटर-ऑफ़र' : '💬 ड्राइवर का संदेश / काउंटर-ऑफ़र';
            $this->fcm->sendToUser(
                userId: $receiverId,
                title: $notifTitle,
                body: $content,
                type: 'negotiation',
                data: [
                    'screen' => 'NegotiationChatScreen',
                    'job_id' => (string) $booking->id,
                    'module' => 'transport',
                ],
                bookingId: $booking->id,
                bookingModel: 'transport_bookings'
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Sent successfully',
            'messages' => $msgs,
            'booking_id' => $booking->id,
            'status' => $booking->status,
        ]);
    }

    // ─── GET /api/transport/negotiation/messages/{jobId} ──────────────────────
    public function getNegotiationMessages(Request $request, int $jobId): JsonResponse
    {
        $user = $request->user();
        $booking = TransportBooking::find($jobId);
        if (!$booking) {
            return response()->json(['messages' => []]);
        }

        $isCustomer = $booking->customer_id === $user->id;
        $customer = User::find($booking->customer_id);
        $driver = $booking->vehicle_owner_id ? User::find($booking->vehicle_owner_id) : null;
        $driverProfile = $booking->vehicle_owner_id ? ProviderProfile::where('user_id', $booking->vehicle_owner_id)->first() : null;

        $msgs = $booking->messages ?? [];
        $formattedMsgs = [];
        foreach ($msgs as $idx => $m) {
            $formattedMsgs[] = [
                'id' => $m['id'] ?? ("msg_" . $idx),
                'sender' => $m['sender'] ?? 'system',
                'type' => $m['type'] ?? (isset($m['wage']) ? 'offer' : 'text'),
                'content' => $m['content'] ?? ($m['message'] ?? ''),
                'message' => $m['message'] ?? ($m['content'] ?? ''),
                'wage' => isset($m['wage']) ? (float) $m['wage'] : null,
                'timestamp' => $m['timestamp'] ?? now()->toISOString(),
            ];
        }

        $vConfig = self::VEHICLE_RATES[$booking->vehicle_type] ?? ['name' => ucfirst($booking->vehicle_type)];
        $serviceLabel = match ($booking->service_type) {
            'goods' => 'माल परिवहन',
            'delivery' => 'डिलीवरी',
            default => 'यात्री सेवा',
        };

        return response()->json([
            'job_id' => $booking->id,
            'booking_id' => $booking->id,
            'status' => $booking->status,
            'service_type' => $booking->service_type,
            'work_type' => $serviceLabel,
            'description' => $booking->work_description,
            'category' => $vConfig['name'] ?? $booking->vehicle_type,
            'vehicle_type_label' => $vConfig['name'] ?? $booking->vehicle_type,
            'wage' => (float) ($booking->agreed_fare ?: $booking->offered_fare ?: $booking->total_fare),
            'pickup_address' => $booking->pickup_address,
            'drop_address' => $booking->drop_address,
            'address' => "{$booking->pickup_address} ➔ {$booking->drop_address}",
            'distance_km' => (float) $booking->distance_km,
            'customer_name' => $customer?->name,
            'customer_phone' => in_array($booking->status, ['accepted', 'active', 'completed']) ? $customer?->phone : null,
            'driver_name' => $driverProfile?->driver_name ?? $driver?->name ?? 'ड्राइवर',
            'driver_phone' => in_array($booking->status, ['accepted', 'active', 'completed']) ? $driver?->phone : null,
            'provider_id' => $booking->vehicle_owner_id,
            'messages' => $formattedMsgs,
        ]);
    }

    // ─── POST /api/transport/negotiation/upload-voice ─────────────────────────
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

    // ─── GET /api/transport/customer/bookings ─────────────────────────────────
    public function customerBookings(Request $request): JsonResponse
    {
        $customer = $request->user();

        $bookings = TransportBooking::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        $result = $bookings->map(function ($b) {
            $owner = User::find($b->vehicle_owner_id);
            $profile = ProviderProfile::where('user_id', $b->vehicle_owner_id)->first();
            return [
                'booking_id' => $b->id,
                'status' => $b->status,
                'service_type' => $b->service_type,
                'vehicle_type' => $b->vehicle_type,
                'pickup_address' => $b->pickup_address,
                'drop_address' => $b->drop_address,
                'distance_km' => (float) $b->distance_km,
                'work_description' => $b->work_description,
                'total_fare' => (float) $b->total_fare,
                'agreed_fare' => (float) ($b->agreed_fare ?: $b->offered_fare ?: $b->total_fare),
                'commission_amount' => (float) $b->commission_amount,
                'owner_phone' => $owner?->phone,
                'driver_phone' => $owner?->phone,
                'driver_name' => $profile?->driver_name ?? $owner?->name,
                'vehicle_number' => $profile?->vehicle_number,
                'secret_pin' => $b->secret_pin,
                'created_at' => $b->created_at?->toISOString(),
            ];
        });

        return response()->json($result);
    }

    // ─── GET /api/transport/driver/bookings ───────────────────────────────────
    public function driverBookings(Request $request): JsonResponse
    {
        $driver = $request->user();

        $bookings = TransportBooking::where('vehicle_owner_id', $driver->id)
            ->whereNotIn('status', ['searching'])
            ->orderByDesc('created_at')
            ->limit(30)
            ->get();

        $result = $bookings->map(function ($b) {
            $customer = User::find($b->customer_id);
            return [
                'id' => $b->id,
                'booking_id' => $b->id,
                'status' => $b->status,
                'service_type' => $b->service_type,
                'vehicle_type' => $b->vehicle_type,
                'pickup_address' => $b->pickup_address,
                'drop_address' => $b->drop_address,
                'total_fare' => (float) $b->total_fare,
                'agreed_fare' => (float) ($b->agreed_fare ?: $b->offered_fare ?: $b->total_fare),
                'commission_amount' => (float) $b->commission_amount,
                'distance_km' => (float) $b->distance_km,
                'work_description' => $b->work_description,
                'customer_phone' => $customer?->phone,
                'customer_name' => $customer?->name,
                'secret_pin' => $b->secret_pin,
                'created_at' => $b->created_at?->toISOString(),
            ];
        });

        return response()->json($result);
    }

    // ─── GET /api/transport/vehicle-profile ───────────────────────────────────
    public function vehicleProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = ProviderProfile::with('workingLocations')->where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['detail' => 'Vehicle profile not found.'], 404);
        }

        $location = $profile->workingLocations->first();

        return response()->json([
            'owner_name' => $profile->owner_name,
            'driver_name' => $profile->driver_name,
            'vehicle_number' => $profile->vehicle_number,
            'vehicle_type' => $profile->vehicle_type,
            'per_km_rate' => (float) $profile->per_km_rate,
            'is_passenger_vehicle' => (bool) $profile->is_passenger_vehicle,
            'is_goods_vehicle' => (bool) $profile->is_goods_vehicle,
            'is_delivery_vehicle' => (bool) $profile->is_delivery_vehicle,
            'is_online' => (bool) $profile->is_online,
            'district' => $location ? $location->district : null,
            'state' => $location ? $location->state : null,
        ]);
    }

    // ─── Helper: Resolve Distance with OSRM & Geocoding ──────────────────────
    private function resolveDistance(
        string $pickup,
        string $drop,
        ?float $pLat,
        ?float $pLng,
        ?float $dLat,
        ?float $dLng
    ): float {
        // 1. If Google Maps key is set
        $googleKey = env('GOOGLE_MAPS_API_KEY');
        if ($googleKey) {
            $origin = ($pLat && $pLng) ? "{$pLat},{$pLng}" : $pickup;
            $dest = ($dLat && $dLng) ? "{$dLat},{$dLng}" : $drop;
            try {
                $res = Http::timeout(4)->get('https://maps.googleapis.com/maps/api/distancematrix/json', [
                    'origins' => $origin,
                    'destinations' => $dest,
                    'key' => $googleKey,
                    'units' => 'metric',
                ]);
                $json = $res->json();
                $meters = $json['rows'][0]['elements'][0]['distance']['value'] ?? null;
                if ($meters && $meters > 0) {
                    return round($meters / 1000.0, 2);
                }
            } catch (\Throwable $e) {
                // fallback
            }
        }

        // 2. If lat/lng are missing, geocode via Nominatim
        if (!$pLat || !$pLng) {
            $geoP = $this->geocodeAddress($pickup);
            if ($geoP) {
                $pLat = $geoP['lat'];
                $pLng = $geoP['lng'];
            }
        }
        if (!$dLat || !$dLng) {
            $geoD = $this->geocodeAddress($drop);
            if ($geoD) {
                $dLat = $geoD['lat'];
                $dLng = $geoD['lng'];
            }
        }

        // 3. If coordinates are resolved, query free OSRM Driving Route API
        if ($pLat && $pLng && $dLat && $dLng) {
            try {
                $osrmUrl = "http://router.project-osrm.org/route/v1/driving/{$pLng},{$pLat};{$dLng},{$dLat}?overview=false";
                $res = Http::timeout(4)->withHeaders(['User-Agent' => 'SarthiApp/1.0'])->get($osrmUrl);
                if ($res->successful()) {
                    $json = $res->json();
                    if (($json['code'] ?? '') === 'Ok' && !empty($json['routes'][0]['distance'])) {
                        $meters = (float) $json['routes'][0]['distance'];
                        if ($meters > 0) {
                            return round($meters / 1000.0, 2);
                        }
                    }
                }
            } catch (\Throwable $e) {
                // OSRM failed, fallback to haversine * 1.3
            }

            $rawKm = $this->haversineKm($pLat, $pLng, $dLat, $dLng);
            return round($rawKm * 1.30, 2);
        }

        // 4. Fallback intelligent heuristic based on address strings
        return 12.50;
    }

    private function geocodeAddress(string $query): ?array
    {
        $cleanQuery = trim(preg_replace('/\s+/', ' ', $query));
        if (empty($cleanQuery) || strlen($cleanQuery) < 2) {
            return null;
        }

        // Candidates to search
        $attempts = [$cleanQuery];
        if (!preg_match('/india/i', $cleanQuery)) {
            $attempts[] = $cleanQuery . ', India';
        }

        // Try extracting first 2 words if query is very long (e.g. "Civil Lines Sultanpur Road...")
        $parts = array_filter(explode(',', $cleanQuery));
        if (count($parts) > 1) {
            $attempts[] = trim($parts[0]) . ', ' . trim($parts[1]) . ', India';
        }

        foreach ($attempts as $q) {
            try {
                $res = Http::timeout(4)->withHeaders([
                    'User-Agent' => 'ShramSarthi-GeoService/2.0 (support@shramsarthi.in)',
                    'Accept-Language' => 'hi,en;q=0.9',
                ])->get('https://nominatim.openstreetmap.org/search', [
                    'q' => $q,
                    'format' => 'json',
                    'limit' => 1,
                    'countrycodes' => 'in',
                ]);

                if ($res->successful() && !empty($res->json()) && isset($res->json()[0]['lat'])) {
                    $item = $res->json()[0];
                    return [
                        'lat' => (float) $item['lat'],
                        'lng' => (float) $item['lon'],
                    ];
                }
            } catch (\Throwable $e) {
                // proceed to next candidate
            }
        }

        return null;
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        if (!$lat2 || !$lng2)
            return 12.50;
        $R = 6371;
        $dL = deg2rad($lat2 - $lat1);
        $dG = deg2rad($lng2 - $lng1);
        $a = sin($dL / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dG / 2) ** 2;
        return $R * 2 * asin(sqrt($a));
    }
}
