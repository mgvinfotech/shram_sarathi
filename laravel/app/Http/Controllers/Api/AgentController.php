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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AgentController extends Controller
{
    public function __construct(
        private CommissionService $commissionService
    ) {}

    // ─── GET /api/agent/stats (and /api/provider/agent/stats) ──────────────────

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);

        $allMembers = User::where('created_by_agent_id', $user->id)->get();
        $totalNetwork = $allMembers->count();

        $labourCount = $allMembers->filter(function ($u) {
            return in_array(strtoupper($u->role ?? ''), ['LABOUR', 'KARIGAR', 'DRIVER', 'PROVIDER']);
        })->count();

        $vehicleCount = $allMembers->filter(function ($u) {
            return in_array(strtoupper($u->role ?? ''), ['VEHICLE', 'VEHICLE_TRANSPORT', 'TRANSPORT']);
        })->count();

        $contractorCount = $allMembers->filter(function ($u) {
            return in_array(strtoupper($u->role ?? ''), ['CONTRACTOR', 'THEKEDAR']);
        })->count();

        // Count total completed/accepted bookings from all referred providers
        $memberIds = $allMembers->pluck('id')->toArray();
        $totalBookings = 0;
        if (!empty($memberIds)) {
            $totalBookings += DB::table('labour_job_requests')->whereIn('assigned_provider_id', $memberIds)->whereIn('status', ['accepted', 'completed', 'active'])->count();
            $totalBookings += DB::table('karigar_job_requests')->whereIn('assigned_karigar_id', $memberIds)->whereIn('status', ['accepted', 'completed', 'active'])->count();
            $totalBookings += DB::table('driver_job_requests')->whereIn('assigned_driver_id', $memberIds)->whereIn('status', ['accepted', 'completed', 'active'])->count();
            $totalBookings += DB::table('transport_bookings')->whereIn('vehicle_owner_id', $memberIds)->count();
            $totalBookings += DB::table('contract_proposals')->whereIn('contractor_id', $memberIds)->count();
        }

        $todayEarnings = (float) WalletTransaction::where('user_id', $user->id)
            ->where('type', 'credit')
            ->whereDate('created_at', today())
            ->sum('amount');

        $monthEarnings = (float) WalletTransaction::where('user_id', $user->id)
            ->where('type', 'credit')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('amount');

        return response()->json([
            'agent_id'          => 'AGT' . str_pad($user->id, 6, '0', STR_PAD_LEFT),
            'agent_name'        => $user->name ?? 'एजेंट पार्टनर',
            'is_active'         => (bool) ($user->is_active ?? true),
            'balance'           => (float) $wallet->balance,
            'hold_balance'      => (float) $wallet->hold_balance,
            'total_earned'      => (float) $wallet->total_earned,
            'total_withdrawn'   => (float) $wallet->total_withdrawn,
            'total_network'     => $totalNetwork,
            'total_registered'  => $totalNetwork,
            'total_bookings'    => $totalBookings,
            'today_earnings'    => $todayEarnings,
            'month_earnings'    => $monthEarnings,
            'labour_count'      => $labourCount,
            'vehicle_count'     => $vehicleCount,
            'contractor_count'  => $contractorCount,
            'verified_count'    => $allMembers->where('is_verified', true)->count(),
        ]);
    }

    // ─── GET /api/agent/network (and /api/provider/agent/network) ────────────

    public function network(Request $request): JsonResponse
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all');

        $query = User::with('providerProfile')->where('created_by_agent_id', $user->id);

        if ($filter === 'labour') {
            $query->whereIn('role', ['labour', 'karigar', 'driver', 'provider', 'LABOUR', 'KARIGAR', 'DRIVER', 'PROVIDER']);
        } elseif ($filter === 'vehicle') {
            $query->whereIn('role', ['vehicle', 'vehicle_transport', 'transport', 'VEHICLE', 'VEHICLE_TRANSPORT', 'TRANSPORT']);
        } elseif ($filter === 'contractor') {
            $query->whereIn('role', ['contractor', 'thekedar', 'CONTRACTOR', 'THEKEDAR']);
        }

        $members = $query->latest()->get();

        $list = $members->map(function ($m) use ($user) {
            $roleUpper = strtoupper($m->role ?? '');
            $isLabour = in_array($roleUpper, ['LABOUR', 'KARIGAR', 'DRIVER', 'PROVIDER']);
            $isVehicle = in_array($roleUpper, ['VEHICLE', 'VEHICLE_TRANSPORT', 'TRANSPORT']);
            $isContractor = in_array($roleUpper, ['CONTRACTOR', 'THEKEDAR']);

            $memberType = $isLabour
                ? ($roleUpper === 'KARIGAR' ? 'karigar' : ($roleUpper === 'DRIVER' ? 'driver' : 'labour'))
                : ($isVehicle ? 'vehicle' : 'contractor');

            $roleLabel = match ($memberType) {
                'labour'     => 'श्रमिक (लेबर)',
                'karigar'    => 'कारीगर',
                'driver'     => 'ड्राइवर',
                'vehicle'    => 'गाड़ी मालिक / चालक',
                'contractor' => 'ठेकेदार (Contractor)',
                default      => 'सदस्य',
            };

            // Check if first job done or FRC verified
            $firstJobDone = Commission::where('agent_id', $user->id)
                ->where('provider_id', $m->id)
                ->where('status', 'released')
                ->exists();

            $commission = Commission::where('agent_id', $user->id)
                ->where('provider_id', $m->id)
                ->latest()
                ->first();

            $bonusStatus = 'pending';
            $bonusAmount = 0.0;
            if ($isLabour) {
                $bonusAmount = 10.0;
                $bonusStatus = $firstJobDone ? 'unlocked' : 'locked';
            } else {
                $bonusAmount = 20.0;
                $bonusStatus = ($m->is_verified || $firstJobDone) ? 'unlocked' : 'locked';
            }

            $frcStatus = ($m->is_verified || $firstJobDone) ? 'VERIFIED' : 'PENDING';

            return [
                'id'                  => $m->id,
                'name'                => $m->name,
                'phone'               => $m->phone,
                'role'                => $m->role,
                'role_label'          => $roleLabel,
                'member_type'         => $memberType,
                'category'            => $m->providerProfile?->category ?? null,
                'vehicle_number'      => $m->providerProfile?->vehicle_number ?? ($m->vehicle_number ?? null),
                'company_name'        => $m->providerProfile?->firm_name ?? ($m->company_name ?? null),
                'is_verified'         => (bool) $m->is_verified,
                'verification_status' => $m->verification_status ?? 'verified',
                'is_labour'           => $isLabour,
                'is_vehicle'          => $isVehicle,
                'is_contractor'       => $isContractor,
                'frc_status'          => $frcStatus,
                'frc_done'            => $frcStatus === 'VERIFIED',
                'first_job_done'      => $firstJobDone,
                'first_job_date'      => $commission?->released_at ? $commission->released_at->format('d M Y') : null,
                'bonus_status'        => $bonusStatus,
                'bonus_amount'        => $bonusAmount,
                'joined_at'           => $m->created_at ? $m->created_at->format('d M Y') : '',
                'created_at'          => $m->created_at,
            ];
        });

        $allMembers = User::where('created_by_agent_id', $user->id)->get();
        $totalCount = $allMembers->count();
        $labourCount = $allMembers->filter(fn($u) => in_array(strtoupper($u->role ?? ''), ['LABOUR', 'KARIGAR', 'DRIVER', 'PROVIDER']))->count();
        $vehicleCount = $allMembers->filter(fn($u) => in_array(strtoupper($u->role ?? ''), ['VEHICLE', 'VEHICLE_TRANSPORT', 'TRANSPORT']))->count();
        $contractorCount = $allMembers->filter(fn($u) => in_array(strtoupper($u->role ?? ''), ['CONTRACTOR', 'THEKEDAR']))->count();

        return response()->json([
            'total_count'       => $totalCount,
            'labour_count'      => $labourCount,
            'vehicle_count'     => $vehicleCount,
            'contractor_count'  => $contractorCount,
            'members'           => $list,
            'data'              => $list, // Fallback for list endpoints
        ]);
    }

    // ─── GET /api/agent/earnings (and /api/provider/agent/earnings) ──────────

    public function earnings(Request $request): JsonResponse
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all');
        $page = max(1, (int) $request->query('page', 1));
        $perPage = max(1, (int) $request->query('per_page', 20));

        $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);

        $query = WalletTransaction::where('user_id', $user->id);

        if ($filter === 'registration') {
            $query->whereIn('category', ['ONBOARDING_BONUS', 'ONBOARDING_BONUS_RELEASE']);
        } elseif ($filter === 'booking') {
            $query->whereIn('category', ['BOOKING_COMMISSION', 'CONTRACTOR_COMMISSION']);
        } elseif ($filter === 'frc') {
            $query->where('category', 'FRC_BONUS');
        } elseif ($filter === 'withdrawal') {
            $query->where('category', 'WITHDRAWAL');
        }

        $total = $query->count();
        $txs = $query->latest()->forPage($page, $perPage)->get();

        $categoryLabels = [
            'ONBOARDING_BONUS'         => 'रजिस्ट्रेशन बोनस (पेंडिंग)',
            'ONBOARDING_BONUS_RELEASE' => 'बोनस अनलॉक (पहला काम)',
            'FRC_BONUS'                => 'FRC बोनस (तुरंत)',
            'BOOKING_COMMISSION'       => 'बुकिंग कमीशन (₹1)',
            'CONTRACTOR_COMMISSION'    => 'ठेकेदार कमीशन (0.20%)',
            'WITHDRAWAL'               => 'निकासी (Withdrawal)',
            'ADMIN_CREDIT'             => 'एडमिन क्रेडिट',
            'REVERSAL'                 => 'रिफंड / रिवर्सल',
        ];

        $transactions = $txs->map(function ($t) use ($categoryLabels) {
            return [
                'id'             => $t->id,
                'amount'         => (float) $t->amount,
                'type'           => $t->type,
                'category'       => $t->category,
                'category_label' => $categoryLabels[$t->category] ?? $t->category,
                'description'    => $t->description,
                'balance_after'  => (float) $t->balance_after,
                'hold_status'    => $t->hold_status,
                'date'           => $t->created_at ? $t->created_at->toISOString() : '',
                'formatted_date' => $t->created_at ? $t->created_at->format('d M Y, h:i A') : '',
            ];
        });

        return response()->json([
            'balance'           => (float) $wallet->balance,
            'hold_balance'      => (float) $wallet->hold_balance,
            'total_earned'      => (float) $wallet->total_earned,
            'total_withdrawn'   => (float) $wallet->total_withdrawn,
            'page'              => $page,
            'per_page'          => $perPage,
            'total'             => $total,
            'transactions'      => $transactions,
        ]);
    }

    // ─── POST /api/agent/add-member (and /api/provider/agent/add-labor) ──────

    public function addMember(Request $request): JsonResponse
    {
        $agent = $request->user();

        $validated = $request->validate([
            'name'            => 'required|string|max:100',
            'phone'           => 'required|string|size:10',
            'member_type'     => 'nullable|string|in:labour,karigar,driver,vehicle,contractor',
            'category'        => 'nullable',
            'gender'          => 'nullable|string',
            'sub_categories'  => 'nullable|array',
            'vehicle_number'  => 'nullable|string',
            'vehicle_type'    => 'nullable|string',
            'company_name'    => 'nullable|string',
            'state'           => 'nullable|string',
            'district'        => 'nullable|string',
            'block'           => 'nullable|string',
            'village'         => 'nullable|string',
            'pincode'         => 'nullable|string',
            'address'         => 'nullable|string',
            'working_locations' => 'nullable|array',
        ]);

        if (is_array($request->input('category'))) {
            $validated['category'] = implode(', ', $request->input('category'));
            if (empty($validated['sub_categories'])) {
                $validated['sub_categories'] = $request->input('category');
            }
        } elseif (!empty($validated['category']) && empty($validated['sub_categories'])) {
            $validated['sub_categories'] = array_map('trim', explode(',', $validated['category']));
        }

        $phone = $validated['phone'];
        $name = $validated['name'];
        $memberType = $validated['member_type'] ?? 'labour';

        // Map member type to role
        $role = match ($memberType) {
            'karigar'    => 'karigar',
            'driver'     => 'driver',
            'vehicle'    => 'vehicle_transport',
            'contractor' => 'contractor',
            default      => 'labour',
        };

        // If category is thekedar or transport from old forms
        if (!empty($validated['category'])) {
            if ($validated['category'] === 'thekedar') {
                $role = 'contractor';
                $memberType = 'contractor';
            } elseif (in_array($validated['category'], ['taxi', 'transport'])) {
                $role = 'vehicle_transport';
                $memberType = 'vehicle';
            } elseif ($validated['category'] === 'karigar') {
                $role = 'karigar';
                $memberType = 'karigar';
            }
        }

        // Check if user already exists
        $existingUser = User::where('phone', $phone)->first();
        if ($existingUser) {
            if ($existingUser->created_by_agent_id && $existingUser->created_by_agent_id !== $agent->id) {
                return response()->json(['detail' => 'यह मोबाइल नंबर पहले से किसी अन्य एजेंट द्वारा पंजीकृत है।'], 422);
            }
            $user = $existingUser;
            $user->created_by_agent_id = $agent->id;
            $user->role = $role;
            $user->is_active = true;
            $user->is_verified = true;
            $user->save();
        } else {
            $user = User::create([
                'phone'                => $phone,
                'name'                 => $name,
                'gender'               => $validated['gender'] ?? null,
                'role'                 => $role,
                'created_by_agent_id'  => $agent->id,
                'is_verified'          => true,
                'is_active'            => true,
                'verification_status'  => 'verified',
            ]);
        }

        // Save ProviderProfile
        $profile = ProviderProfile::firstOrCreate(['user_id' => $user->id]);
        if (!empty($validated['category'])) $profile->category = $validated['category'];
        if (!empty($validated['vehicle_number'])) $profile->vehicle_number = $validated['vehicle_number'];
        if (!empty($validated['vehicle_type'])) $profile->vehicle_type = $validated['vehicle_type'];
        if (!empty($validated['company_name'])) $profile->firm_name = $validated['company_name'];
        if (!empty($validated['sub_categories'])) $profile->sub_categories = $validated['sub_categories'];
        $profile->save();

        // Save WorkingLocation
        $locData = [
            'state'    => $validated['state'] ?? 'Uttar Pradesh',
            'district' => $validated['district'] ?? null,
            'block'    => $validated['block'] ?? null,
            'village'  => $validated['village'] ?? null,
            'pincode'  => $validated['pincode'] ?? null,
        ];
        if (!empty($validated['working_locations'][0])) {
            $locData = array_merge($locData, array_filter($validated['working_locations'][0]));
        }
        WorkingLocation::updateOrCreate(
            ['provider_profile_id' => $profile->id],
            $locData
        );

        // Trigger Commission Logic as per PDF
        $bonusType = 'locked';
        $bonusAmount = 10.0;

        if (in_array($memberType, ['labour', 'karigar', 'driver'])) {
            $this->commissionService->processOnboardingBonus($user, $agent->id);
            $bonusType = 'locked';
            $bonusAmount = 10.0;
            $msg = "कामगार {$name} को सफलतापूर्वक जोड़ दिया गया है। ₹10 का बोनस आपके 'पेंडिंग बोनस' में जमा हो गया है (पहला काम स्वीकार करने पर अनलॉक होगा)।";
        } else {
            $this->commissionService->processFirstRegistrationComplete($user);
            $bonusType = 'withdrawable';
            $bonusAmount = 20.0;
            $msg = "{$name} का FRC पंजीकरण पूरा हुआ। ₹20 का FRC बोनस तुरंत आपके 'निकालने योग्य बैलेंस' में जोड़ दिया गया है!";
        }

        return response()->json([
            'status'        => 'SUCCESS',
            'message'       => $msg,
            'user'          => $user,
            'bonus_type'    => $bonusType,
            'bonus_amount'  => $bonusAmount,
        ]);
    }

    // ─── POST /api/agent/withdraw (and /api/provider/agent/withdraw) ─────────

    public function withdraw(Request $request): JsonResponse
    {
        $agent = $request->user();
        $amount = (float) $request->input('amount', 0);

        if ($amount < 500) {
            return response()->json(['detail' => 'न्यूनतम विड्रॉल सीमा ₹500 है।'], 422);
        }

        $wallet = Wallet::firstOrCreate(['user_id' => $agent->id]);
        if ($wallet->balance < $amount) {
            return response()->json([
                'detail' => "अपर्याप्त बैलेंस! आपके पास केवल ₹{$wallet->balance} निकालने योग्य हैं।"
            ], 422);
        }

        $result = $this->commissionService->processAgentWithdrawal($agent->id, $amount);

        if ($result['status'] === 'ERROR') {
            return response()->json(['detail' => $result['message']], 422);
        }

        return response()->json([
            'status'  => 'SUCCESS',
            'message' => "₹{$amount} की निकासी का अनुरोध सफलतापूर्वक सबमिट हो गया है। 24 घंटे के भीतर बैंक खाते में ट्रांसफर कर दिया जाएगा।",
            'balance' => (float) $wallet->fresh()->balance,
        ]);
    }

    // ─── GET /api/agent/notices ───────────────────────────────────────────────

    public function notices(Request $request): JsonResponse
    {
        return response()->json([
            [
                'id'         => 1,
                'title'      => '🚀 नया एजेंट बोनस ऑफर!',
                'content'    => 'अधिक से अधिक कारीगर, मजदूर व गाड़ियां जोड़ें और प्रति बुकिंग आजीवन पैसिव इनकम कमाएं।',
                'date'       => now()->format('d M Y'),
                'is_unread'  => true,
            ],
            [
                'id'         => 2,
                'title'      => '💳 विड्रॉल पॉलिसी अपडेट',
                'content'    => 'न्यूनतम विड्रॉल ₹500 है। अनुरोध सबमिट करने के 24 घंटे के भीतर राशि आपके खाते में भेजी जाती है।',
                'date'       => now()->subDays(2)->format('d M Y'),
                'is_unread'  => false,
            ]
        ]);
    }

    // ─── GET /api/agent/support ───────────────────────────────────────────────

    public function support(Request $request): JsonResponse
    {
        return response()->json([
            'helpline_phone' => '1800-123-7890',
            'whatsapp_phone' => '919876543210',
            'email'          => 'support@shramsarathi.in',
            'timing'         => 'सोमवार - शनिवार, सुबह 9:00 से शाम 7:00 बजे तक',
        ]);
    }
}
