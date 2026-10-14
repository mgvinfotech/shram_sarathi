<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\WorkingLocation;
use App\Services\CommissionService;
use App\Services\RedisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProviderController extends Controller
{
    public function __construct(
        private RedisService    $redis,
        private CommissionService $commissionService
    ) {}

    // ─── POST /api/provider/setup ─────────────────────────────────────────────

    public function setup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category'              => 'sometimes|nullable|string|max:50',
            'sub_categories'        => 'sometimes|array',
            'skills_description'    => 'sometimes|nullable|string',
            'experience_years'      => 'sometimes|nullable|string',
            'expected_daily_wage'   => 'sometimes|nullable|numeric',
            'base_location_address' => 'sometimes|nullable|string',
            'radius_km'             => 'sometimes|nullable|numeric',
            'firm_name'             => 'sometimes|nullable|string',
            'team_size'             => 'sometimes|nullable|string',
            'dl_number'             => 'sometimes|nullable|string',
            'driver_license'        => 'sometimes|nullable|string',
            'owner_name'            => 'sometimes|nullable|string',
            'driver_name'           => 'sometimes|nullable|string',
            'vehicle_type'          => 'sometimes|nullable|string',
            'vehicle_number'        => 'sometimes|nullable|string',
            'per_km_rate'           => 'sometimes|nullable|numeric',
            'is_passenger_vehicle'  => 'sometimes|nullable|boolean',
            'is_goods_vehicle'      => 'sometimes|nullable|boolean',
            'is_delivery_vehicle'   => 'sometimes|nullable|boolean',
            'contract_types'        => 'sometimes|nullable|array',
            'photo'                 => 'sometimes|nullable|file|mimes:jpeg,png,jpg|max:2048',
            'photo_url'             => 'sometimes|nullable|string',
            'lat'                   => 'sometimes|nullable|numeric',
            'lng'                   => 'sometimes|nullable|numeric',
            'working_locations'     => 'sometimes|array',
            'working_locations.*.village'  => 'sometimes|nullable|string',
            'working_locations.*.block'    => 'sometimes|nullable|string',
            'working_locations.*.tehsil'   => 'sometimes|nullable|string',
            'working_locations.*.district' => 'sometimes|nullable|string',
            'working_locations.*.state'    => 'sometimes|nullable|string',
            'working_locations.*.pincode'  => 'sometimes|nullable|string',
            'working_locations.*.lat'      => 'sometimes|nullable|numeric',
            'working_locations.*.lng'      => 'sometimes|nullable|numeric',
        ]);

        $user = $request->user();

        // Handle file upload if photo is uploaded as file
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('uploads', 'public');
            $data['photo_url'] = \Illuminate\Support\Facades\Storage::url($path);
        }

        DB::transaction(function () use ($user, $data) {
            $profile = ProviderProfile::firstOrNew(['user_id' => $user->id]);
            if (!empty($data['category'])) {
                $profile->category = $data['category'];
            } elseif (!$profile->exists && empty($profile->category)) {
                $profile->category = strtolower($user->role);
            }
            if (isset($data['sub_categories'])) $profile->sub_categories = $data['sub_categories'];
            if (isset($data['skills_description'])) $profile->skills_description = $data['skills_description'];
            if (isset($data['experience_years'])) $profile->experience_years = $data['experience_years'];
            if (isset($data['expected_daily_wage'])) $profile->expected_daily_wage = $data['expected_daily_wage'];
            if (isset($data['base_location_address'])) $profile->base_location_address = $data['base_location_address'];
            if (isset($data['radius_km'])) $profile->radius_km = $data['radius_km'];
            if (isset($data['firm_name'])) $profile->firm_name = $data['firm_name'];
            if (isset($data['team_size'])) $profile->team_size = $data['team_size'];
            if (isset($data['dl_number'])) $profile->dl_number = $data['dl_number'];
            if (isset($data['driver_license'])) $profile->driver_license = $data['driver_license'];
            if (isset($data['owner_name'])) $profile->owner_name = $data['owner_name'];
            if (isset($data['driver_name'])) $profile->driver_name = $data['driver_name'];
            if (isset($data['vehicle_type'])) $profile->vehicle_type = $data['vehicle_type'];
            if (isset($data['vehicle_number'])) $profile->vehicle_number = $data['vehicle_number'];
            if (isset($data['per_km_rate'])) $profile->per_km_rate = $data['per_km_rate'];
            if (isset($data['is_passenger_vehicle'])) $profile->is_passenger_vehicle = $data['is_passenger_vehicle'];
            if (isset($data['is_goods_vehicle'])) $profile->is_goods_vehicle = $data['is_goods_vehicle'];
            if (isset($data['is_delivery_vehicle'])) $profile->is_delivery_vehicle = $data['is_delivery_vehicle'];
            if (isset($data['contract_types'])) $profile->contract_types = $data['contract_types'];
            $profile->is_online = true;

            if (isset($data['lat']) && isset($data['lng'])) {
                $profile->current_lat = $data['lat'];
                $profile->current_lng = $data['lng'];
            }
            if (!empty($data['photo_url'])) {
                $profile->photo_url = $data['photo_url'];
            }
            $profile->save();

            // Also update Redis so they appear in geo-search immediately
            if (isset($data['lat']) && isset($data['lng'])) {
                $this->redis->updateProviderLocation($user->id, $data['lat'], $data['lng']);
            }

            // Replace working locations if provided
            if (!empty($data['working_locations'])) {
                WorkingLocation::where('provider_profile_id', $profile->id)->delete();
                foreach ($data['working_locations'] as $loc) {
                    if (!empty($loc['district']) && !empty($loc['state'])) {
                        WorkingLocation::create(array_merge($loc, ['provider_profile_id' => $profile->id]));
                    }
                }
            }
        });

        $profile = ProviderProfile::where('user_id', $user->id)->first();

        return response()->json([
            'message'    => 'Profile updated successfully',
            'profile_id' => $profile ? $profile->id : null,
            'photo_url'  => $profile ? $profile->photo_url : null,
        ]);
    }

    // ─── PUT /api/provider/location ───────────────────────────────────────────

    public function updateLocation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'       => 'required|numeric',
            'lng'       => 'required|numeric',
            'is_online' => 'sometimes|boolean',
        ]);

        $user    = $request->user();
        $profile = ProviderProfile::where('user_id', $user->id)->first();

        if (!$profile) {
            return response()->json(['detail' => 'Provider profile not found'], 404);
        }

        $profile->current_lat = $data['lat'];
        $profile->current_lng = $data['lng'];
        $profile->is_online   = $data['is_online'] ?? true;
        $profile->save();

        if ($profile->is_online) {
            $this->redis->updateProviderLocation($user->id, $data['lat'], $data['lng']);
        }

        return response()->json(['message' => 'Location updated']);
    }

    // ─── POST /api/provider/toggle-online ─────────────────────────────────────

    public function toggleOnline(Request $request): JsonResponse
    {
        $data = $request->validate([
            'is_online' => 'required|boolean',
        ]);

        $user = $request->user();
        $defaultCat = strtolower($user->role ?: 'labour');
        $profile = ProviderProfile::firstOrCreate(
            ['user_id' => $user->id],
            ['category' => $defaultCat, 'is_online' => $data['is_online']]
        );
        $profile->is_online = $data['is_online'];
        $profile->save();

        if ($profile->is_online && $profile->current_lat && $profile->current_lng) {
            $this->redis->updateProviderLocation($user->id, $profile->current_lat, $profile->current_lng);
        }

        return response()->json([
            'message' => $profile->is_online ? 'Aap ab Online hain' : 'Aap ab Offline hain',
            'is_online' => (bool) $profile->is_online
        ]);
    }

    // ─── GET /api/provider/profile/{userId} ───────────────────────────────────

    public function profile(Request $request, int $userId): JsonResponse
    {
        $user = User::find($userId);
        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $profile = ProviderProfile::with(['user', 'workingLocations'])
            ->where('user_id', $userId)
            ->first();

        // If user is a provider role and profile does not exist yet, auto-create one
        if (!$profile && in_array(strtolower($user->role), ['labour', 'karigar', 'driver', 'contractor', 'provider', 'agent', 'transport', 'vehicle'])) {
            $profile = ProviderProfile::create([
                'user_id' => $user->id,
                'category' => strtolower($user->role),
                'is_online' => true,
            ]);
            $profile->load(['user', 'workingLocations']);
        }

        $subCategories = $profile ? ($profile->sub_categories ?? []) : [];
        if (!is_array($subCategories)) {
            $subCategories = [];
        }
        $currentCat = strtolower($profile?->category ?? $user->role ?? '');
        if (in_array($currentCat, ['labour', 'majdoor', 'karigar']) && !empty($profile?->vehicle_type)) {
            $vType = trim(strtolower($profile->vehicle_type));
            $subCategories = array_values(array_filter($subCategories, function ($sc) use ($vType) {
                return trim(strtolower((string)$sc)) !== $vType;
            }));
        }

        return response()->json([
            'id'                     => $profile ? $profile->id : null,
            'user_id'                => $userId,
            'category'               => $profile ? $profile->category : null,
            'sub_categories'         => $subCategories,
            'skills_description'     => $profile ? $profile->skills_description : null,
            'experience_years'       => $profile ? $profile->experience_years : null,
            'expected_daily_wage'    => $profile ? $profile->expected_daily_wage : null,
            'base_location_address'  => $profile ? $profile->base_location_address : null,
            'radius_km'              => $profile ? $profile->radius_km : 10,
            'firm_name'              => $profile ? $profile->firm_name : null,
            'team_size'              => $profile ? $profile->team_size : null,
            'contract_types'         => $profile ? ($profile->contract_types ?? []) : [],
            'dl_number'              => $profile ? $profile->dl_number : null,
            'driver_license'         => $profile ? ($profile->driver_license ?? $profile->dl_number) : null,
            'owner_name'             => $profile ? $profile->owner_name : null,
            'driver_name'            => $profile ? $profile->driver_name : null,
            'vehicle_type'           => $profile ? $profile->vehicle_type : null,
            'vehicle_number'         => $profile ? $profile->vehicle_number : null,
            'per_km_rate'            => $profile ? (float)$profile->per_km_rate : null,
            'is_passenger_vehicle'   => $profile ? (bool)$profile->is_passenger_vehicle : false,
            'is_goods_vehicle'       => $profile ? (bool)$profile->is_goods_vehicle : false,
            'is_delivery_vehicle'    => $profile ? (bool)$profile->is_delivery_vehicle : false,
            'current_lat'            => $profile ? $profile->current_lat : null,
            'current_lng'            => $profile ? $profile->current_lng : null,
            'is_online'              => $profile ? (bool)$profile->is_online : false,
            'total_bookings'         => $profile ? $profile->total_bookings : 0,
            'rating'                 => $profile ? $profile->rating : 5.0,
            'rating_count'           => $profile ? $profile->rating_count : 0,
            'photo_url'              => $profile ? $profile->photo_url : null,
            'working_locations'      => $profile ? $profile->workingLocations : [],
            'name'                   => $user->name,
            'phone'                  => $user->phone,
            'gender'                 => $user->gender,
            'role'                   => $user->role,
            'verification_status'    => $user->verification_status,
        ]);
    }

    // ─── GET /api/provider/dashboard ──────────────────────────────────────────

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        $total     = \App\Models\Booking::where('provider_id', $user->id)->count();
        $confirmed = \App\Models\Booking::where('provider_id', $user->id)
            ->where('status', 'confirmed')
            ->count();

        $recent = \App\Models\Booking::where('provider_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'status', 'category', 'created_at']);

        $profile = ProviderProfile::where('user_id', $user->id)->first();
        $isOnline = $profile ? (bool)$profile->is_online : false;

        return response()->json([
            'total_calls'         => $total,
            'confirmed_bookings'  => $confirmed,
            'rejection_rate'      => $total > 0 ? round(($total - $confirmed) / $total * 100, 1) : 0,
            'recent_bookings'     => $recent,
            'is_online'           => $isOnline,
            'category'            => $profile ? $profile->category : null,
        ]);
    }

    // ─── POST /api/provider/agent/add-member ─────────────────────────────────
    // Supports all provider roles: LABOUR, KARIGAR, DRIVER, CONTRACTOR, VEHICLE
    // ₹10 pending bonus for Labour/Karigar/Driver, ₹20 instant on FRC for Contractor/Vehicle

    public function addLabor(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'                        => 'required|string',
            'name'                         => 'required|string|max:100',
            'category'                     => 'required|string|max:50',
            'role'                         => 'sometimes|string|in:LABOUR,KARIGAR,DRIVER,CONTRACTOR,VEHICLE_TRANSPORT',
            'sub_categories'               => 'sometimes|array',
            'working_locations'            => 'required|array|min:1',
            'working_locations.*.district' => 'required|string',
            'working_locations.*.state'    => 'required|string',
        ]);

        $agent = $request->user();
        $phone = $this->cleanPhone($data['phone']);

        if (User::where('phone', $phone)->exists()) {
            return response()->json(['detail' => 'यह फ़ोन नंबर पहले से पंजीकृत है।'], 400);
        }

        // Determine role — default to provider (Labour type)
        $role     = $data['role'] ?? 'LABOUR';
        $isLabour = in_array(strtoupper($role), ['LABOUR', 'KARIGAR', 'DRIVER']);

        $newUser = null;

        DB::transaction(function () use ($agent, $data, $phone, $role, $isLabour, &$newUser) {
            $newUser = User::create([
                'phone'               => $phone,
                'name'                => $data['name'],
                'role'                => strtolower($role),
                'is_verified'         => false,
                'verification_status' => 'pending',
                'created_by_agent_id' => $agent->id,
            ]);

            $profile = ProviderProfile::create([
                'user_id'        => $newUser->id,
                'category'       => $data['category'],
                'sub_categories' => $data['sub_categories'] ?? [],
                'is_online'      => true,
            ]);

            foreach ($data['working_locations'] as $loc) {
                WorkingLocation::create(array_merge($loc, ['provider_profile_id' => $profile->id]));
            }

            Wallet::firstOrCreate(['user_id' => $newUser->id]);
        });

        // Process bonus AFTER transaction (needs wallet to exist)
        $bonusAmount = 0;
        $bonusNote   = '';

        if ($isLabour) {
            // ₹10 pending bonus — locked until first job
            $this->commissionService->processOnboardingBonus($newUser, $agent->id);
            $bonusAmount = 10;
            $bonusNote   = '₹10 पंजीकरण बोनस लॉक किया गया। पहला काम स्वीकार होने पर स्वचालित रूप से अनलॉक होगा।';
        } else {
            // Contractor / Vehicle — ₹20 released after FRC KYC verification by admin
            $bonusAmount = 20;
            $bonusNote   = 'KYC एवं FRC सत्यापन सफल होने पर ₹20 तत्काल निकालने योग्य बोनस मिलेगा।';
        }

        return response()->json([
            'message'      => "{$data['name']} सफलतापूर्वक पंजीकृत।",
            'bonus_amount' => $bonusAmount,
            'note'         => $bonusNote,
            'is_labour'    => $isLabour,
        ]);
    }

    // ─── GET /api/provider/agent/stats ────────────────────────────────────────

    public function agentStats(Request $request): JsonResponse
    {
        $user   = $request->user();
        $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);

        // Count by type
        $members = User::where('created_by_agent_id', $user->id)->get(['id', 'role', 'is_verified']);

        $labourRoles     = ['labour', 'karigar', 'driver'];
        $contractorRoles = ['contractor', 'vehicle_transport'];

        $totalRegistered   = $members->count();
        $labourCount       = $members->filter(fn($m) => in_array(strtolower($m->role), $labourRoles))->count();
        $contractorCount   = $members->filter(fn($m) => in_array(strtolower($m->role), $contractorRoles))->count();
        $verifiedCount     = $members->filter(fn($m) => $m->is_verified)->count();

        // Today's earnings from wallet_transactions
        $todayEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('type', 'credit')
            ->whereDate('created_at', today())
            ->sum('amount');

        // This month's earnings
        $monthEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('type', 'credit')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        return response()->json([
            'balance'          => (float) $wallet->balance,
            'hold_balance'     => (float) $wallet->hold_balance,
            'total_earned'     => (float) $wallet->total_earned,
            'total_withdrawn'  => (float) $wallet->total_withdrawn,
            'total_registered' => $totalRegistered,
            'labour_count'     => $labourCount,
            'contractor_count' => $contractorCount,
            'verified_count'   => $verifiedCount,
            'today_earnings'   => (float) $todayEarnings,
            'month_earnings'   => (float) $monthEarnings,
        ]);
    }

    // ─── GET /api/provider/agent/network ─────────────────────────────────────
    // Returns all members added by agent with FRC/first-job/bonus status

    public function agentNetwork(Request $request): JsonResponse
    {
        $user   = $request->user();
        $filter = $request->query('filter', 'all'); // all | labour | contractor

        $query = User::where('created_by_agent_id', $user->id)
            ->with(['providerProfile', 'commissionsAsProvider']);

        $labourRoles     = ['labour', 'karigar', 'driver'];
        $contractorRoles = ['contractor', 'vehicle_transport'];

        if ($filter === 'labour') {
            $query->whereIn(DB::raw('LOWER(role)'), $labourRoles);
        } elseif ($filter === 'contractor') {
            $query->whereIn(DB::raw('LOWER(role)'), $contractorRoles);
        }

        $members = $query->orderByDesc('created_at')->get()->map(function ($member) use ($labourRoles) {
            $profile    = $member->providerProfile;
            $commission = $member->commissionsAsProvider->sortByDesc('created_at')->first();

            $isLabour   = in_array(strtolower($member->role), $labourRoles);

            // Determine bonus status
            $bonusStatus = 'pending'; // default
            if ($commission) {
                if ($commission->status === 'released') {
                    $bonusStatus = 'unlocked';
                } elseif ($commission->status === 'hold') {
                    $bonusStatus = 'locked';
                }
            }

            return [
                'id'                  => $member->id,
                'name'                => $member->name,
                'phone'               => substr($member->phone, 0, 5) . 'XXXXX', // masked
                'role'                => $member->role,
                'role_label'          => $this->roleLabel($member->role),
                'category'            => $profile?->category,
                'verification_status' => $member->verification_status,
                'is_verified'         => (bool) $member->is_verified,
                'is_labour'           => $isLabour,
                'frc_done'            => (bool) $member->is_verified,  // FRC = full KYC verified
                'first_job_done'      => $commission && $commission->status === 'released',
                'bonus_status'        => $bonusStatus,
                'bonus_amount'        => $isLabour ? 10 : 20,
                'joined_at'           => $member->created_at?->toDateString(),
            ];
        });

        return response()->json($members);
    }

    // ─── GET /api/provider/agent/earnings ────────────────────────────────────
    // Paginated Earnings Ledger for the agent

    public function agentEarnings(Request $request): JsonResponse
    {
        $user     = $request->user();
        $filter   = $request->query('filter', 'all'); // all | registration | booking | frc | withdrawal
        $page     = max(1, (int) $request->query('page', 1));
        $perPage  = 20;

        $query = WalletTransaction::where('user_id', $user->id)
            ->orderByDesc('created_at');

        switch ($filter) {
            case 'registration':
                $query->whereIn('category', ['ONBOARDING_BONUS', 'ONBOARDING_BONUS_RELEASE']);
                break;
            case 'booking':
                $query->whereIn('category', ['BOOKING_COMMISSION', 'CONTRACTOR_COMMISSION']);
                break;
            case 'frc':
                $query->where('category', 'FRC_BONUS');
                break;
            case 'withdrawal':
                $query->where('category', 'WITHDRAWAL');
                break;
        }

        $total  = $query->count();
        $rows   = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);

        return response()->json([
            'balance'      => (float) $wallet->balance,
            'hold_balance' => (float) $wallet->hold_balance,
            'total'        => $total,
            'page'         => $page,
            'per_page'     => $perPage,
            'transactions' => $rows->map(fn ($t) => [
                'id'           => $t->id,
                'amount'       => (float) $t->amount,
                'type'         => $t->type,
                'category'     => $t->category,
                'category_label' => $this->categoryLabel($t->category),
                'description'  => $t->description,
                'balance_after'=> (float) $t->balance_after,
                'hold_status'  => $t->hold_status,
                'date'         => $t->created_at?->toDateTimeString(),
            ]),
        ]);
    }

    // ─── Backwards-compat alias ───────────────────────────────────────────────
    public function agentLabors(Request $request): JsonResponse
    {
        return $this->agentNetwork($request);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function roleLabel(string $role): string
    {
        return match (strtoupper($role)) {
            'LABOUR'            => 'मजदूर',
            'KARIGAR'           => 'कारीगर',
            'DRIVER'            => 'ड्राइवर',
            'CONTRACTOR'        => 'ठेकेदार',
            'VEHICLE_TRANSPORT' => 'वाहन मालिक',
            default             => ucfirst(strtolower($role)),
        };
    }

    private function categoryLabel(string $cat): string
    {
        return match ($cat) {
            'ONBOARDING_BONUS'         => 'पंजीकरण बोनस (लॉक)',
            'ONBOARDING_BONUS_RELEASE' => 'पंजीकरण बोनस (अनलॉक)',
            'FRC_BONUS'                => 'FRC बोनस (KYC)',
            'BOOKING_COMMISSION'       => 'बुकिंग कमीशन',
            'CONTRACTOR_COMMISSION'    => 'ठेकेदार कमीशन (0.20%)',
            'WITHDRAWAL'               => 'निकासी',
            'ADMIN_CREDIT'             => 'एडमिन क्रेडिट',
            'REVERSAL'                 => 'रिवर्सल',
            default                    => $cat,
        };
    }

    private function cleanPhone(string $phone): string
    {
        $phone = preg_replace('/[\s\-]/', '', $phone);
        if (str_starts_with($phone, '+91')) {
            $phone = substr($phone, 3);
        } elseif (str_starts_with($phone, '91') && strlen($phone) === 12) {
            $phone = substr($phone, 2);
        }
        return $phone;
    }
}
