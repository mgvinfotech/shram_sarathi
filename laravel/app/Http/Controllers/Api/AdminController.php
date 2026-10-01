<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Payment;
use App\Models\ProviderProfile;
use App\Models\Reward;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\Wallet;
use App\Services\ExotelService;
use App\Services\PollyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    public function __construct(
        private ExotelService $exotel,
        private PollyService  $polly,
    ) {}

    // ─── GET /api/admin/dashboard ─────────────────────────────────────────────

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'sub_admin'])) {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $totalUsers      = User::count();
        $totalProviders  = User::where('role', 'provider')->count();
        $totalCustomers  = User::where('role', 'customer')->count();
        $totalBookings   = Booking::count();
        $confirmedBookings = Booking::where('status', 'confirmed')->count();
        $totalRevenue    = Payment::where('status', 'success')->sum('amount') ?? 0;

        $categoryBreakdown = Booking::select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->get()
            ->map(fn($row) => ['category' => $row->category, 'count' => $row->count]);

        return response()->json([
            'total_users'        => $totalUsers,
            'total_providers'    => $totalProviders,
            'total_customers'    => $totalCustomers,
            'total_bookings'     => $totalBookings,
            'confirmed_bookings' => $confirmedBookings,
            'total_revenue_inr'  => $totalRevenue,
            'category_breakdown' => $categoryBreakdown,
        ]);
    }

    // ─── GET /api/admin/users ─────────────────────────────────────────────────

    public function users(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('users')) {
            return response()->json(['detail' => 'Permission denied'], 403);
        }

        $role       = $request->query('role');
        $isVerified = $request->query('is_verified');
        $search     = $request->query('search');
        $page       = max(1, (int) $request->query('page', 1));
        $pageSize   = min(100, (int) $request->query('page_size', 20));

        $query = User::query();
        if ($role) {
            $query->where('role', $role);
        }
        if ($isVerified !== null) {
            $query->where('is_verified', filter_var($isVerified, FILTER_VALIDATE_BOOLEAN));
        }
        if ($search) {
            $query->where(fn($q) => $q->where('name', 'ilike', "%{$search}%")
                ->orWhere('phone', 'ilike', "%{$search}%"));
        }

        $total = $query->count();
        $users = $query->offset(($page - 1) * $pageSize)->limit($pageSize)->get();

        return response()->json([
            'users' => $users->map(fn($u) => [
                'id'                  => $u->id,
                'name'                => $u->name,
                'phone'               => $u->phone,
                'role'                => $u->role,
                'is_verified'         => $u->is_verified,
                'verification_status' => $u->verification_status,
                'is_blacklisted'      => $u->is_blacklisted,
                'created_at'          => $u->created_at,
            ]),
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize,
        ]);
    }

    // ─── PUT /api/admin/users/{id}/verify ────────────────────────────────────

    public function verifyUser(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermission('users')) {
            return response()->json(['detail' => 'Permission denied'], 403);
        }

        $approved = filter_var($request->query('approved', 'true'), FILTER_VALIDATE_BOOLEAN);
        $user     = User::find($id);

        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $user->verification_status = $approved ? 'verified' : 'rejected';
        $user->is_verified         = $approved;
        $user->save();

        return response()->json(['message' => "User " . ($approved ? 'verified' : 'rejected')]);
    }

    // ─── PUT /api/admin/users/{id}/blacklist ──────────────────────────────────

    public function blacklistUser(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $blacklist = filter_var($request->query('blacklist', 'true'), FILTER_VALIDATE_BOOLEAN);
        $reason    = $request->query('reason', '');
        $user      = User::find($id);

        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $user->is_blacklisted   = $blacklist;
        $user->blacklist_reason = $blacklist ? $reason : null;
        $user->save();

        return response()->json(['message' => "User " . ($blacklist ? 'blacklisted' : 'unblacklisted')]);
    }

    // ─── POST /api/admin/sub-admin/create ────────────────────────────────────

    public function createSubAdmin(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $phone       = $request->query('phone');
        $name        = $request->query('name');
        $permissions = $request->query('permissions', []);

        if (!$phone || !$name) {
            return response()->json(['detail' => 'phone and name are required'], 422);
        }

        if (User::where('phone', $phone)->exists()) {
            return response()->json(['detail' => 'Phone already registered'], 400);
        }

        $subAdmin = User::create([
            'phone'       => $phone,
            'name'        => $name,
            'role'        => 'sub_admin',
            'permissions' => is_array($permissions) ? $permissions : json_decode($permissions, true),
        ]);

        return response()->json(['message' => 'Sub-admin created', 'user_id' => $subAdmin->id]);
    }

    // ─── POST /api/admin/agents ───────────────────────────────────────────────

    public function createAgent(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $phone    = $request->query('phone');
        $name     = $request->query('name');
        $password = $request->query('password');

        if (!$phone || !$name || !$password) {
            return response()->json(['detail' => 'phone, name, and password are required'], 422);
        }

        if (User::where('phone', $phone)->exists()) {
            return response()->json(['detail' => 'Phone already registered'], 400);
        }

        $agent = new User([
            'phone'       => $phone,
            'name'        => $name,
            'role'        => 'agent',
            'is_verified' => true,
        ]);
        $agent->setPassword($password);
        $agent->save();

        Wallet::create(['user_id' => $agent->id]);

        return response()->json(['message' => 'Agent created successfully', 'agent_id' => $agent->id]);
    }

    // ─── GET /api/admin/payments ──────────────────────────────────────────────

    public function payments(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('financials')) {
            return response()->json(['detail' => 'Permission denied'], 403);
        }

        $status   = $request->query('status');
        $page     = max(1, (int) $request->query('page', 1));
        $pageSize = min(100, (int) $request->query('page_size', 20));

        $query = Payment::query();
        if ($status) {
            $query->where('status', $status);
        }

        $total    = $query->count();
        $payments = $query->orderByDesc('created_at')
            ->offset(($page - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        return response()->json([
            'payments' => $payments->map(fn($p) => [
                'id'                  => $p->id,
                'user_id'             => $p->user_id,
                'amount'              => $p->amount,
                'status'              => $p->status,
                'razorpay_order_id'   => $p->razorpay_order_id,
                'razorpay_payment_id' => $p->razorpay_payment_id,
                'created_at'          => $p->created_at,
            ]),
            'total' => $total,
        ]);
    }

    // ─── GET /api/admin/commissions ───────────────────────────────────────────

    public function commissions(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('financials')) {
            return response()->json(['detail' => 'Permission denied'], 403);
        }

        $status = $request->query('status');
        $query  = Commission::query();
        if ($status) {
            $query->where('status', $status);
        }

        return response()->json($query->get()->map(fn($c) => [
            'id'          => $c->id,
            'agent_id'    => $c->agent_id,
            'provider_id' => $c->provider_id,
            'amount'      => $c->amount,
            'status'      => $c->status,
            'released_at' => $c->released_at,
        ]));
    }

    // ─── POST /api/admin/commissions/{id}/release ─────────────────────────────

    public function releaseCommission(Request $request, int $id): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $commission = Commission::find($id);
        if (!$commission) {
            return response()->json(['detail' => 'Commission not found'], 404);
        }
        if ($commission->status !== 'hold') {
            return response()->json(['detail' => 'Commission is not on hold'], 400);
        }

        $commission->status      = 'released';
        $commission->released_at = now();
        $commission->save();

        $wallet = Wallet::firstOrCreate(['user_id' => $commission->agent_id]);
        $wallet->balance      += $commission->amount;
        $wallet->hold_balance  = max(0, $wallet->hold_balance - $commission->amount);
        $wallet->total_earned += $commission->amount;
        $wallet->save();

        return response()->json(['message' => 'Commission released', 'amount' => $commission->amount]);
    }

    // ─── POST /api/admin/rewards/send ─────────────────────────────────────────

    public function sendReward(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $providerId = (int) $request->query('provider_id');
        $giftName   = $request->query('gift_name', '');
        $message    = $request->query('message', '');

        $provider = User::find($providerId);
        if (!$provider) {
            return response()->json(['detail' => 'Provider not found'], 404);
        }

        $reward = Reward::create([
            'provider_id' => $providerId,
            'admin_id'    => $request->user()->id,
            'gift_name'   => $giftName,
            'message'     => $message,
        ]);

        // Send TTS call
        try {
            $callData = $this->exotel->sendTtsCall($provider->phone, $message, $reward->id);
            $reward->ivr_call_sid = $callData['call_sid'] ?? null;
            $reward->ivr_sent_at  = now();
            $reward->save();
        } catch (\Exception $e) {
            Log::error("TTS call failed: {$e->getMessage()}");
        }

        // Send SMS
        try {
            $this->exotel->sendSms($provider->phone, "श्रम सारथी: {$message}");
            $reward->sms_sent = true;
            $reward->save();
        } catch (\Exception $e) {
            Log::error("SMS failed: {$e->getMessage()}");
        }

        return response()->json(['message' => 'Reward notification sent', 'reward_id' => $reward->id]);
    }

    // ─── GET /api/admin/rewards/{id}/audio ───────────────────────────────────

    public function rewardAudio(int $id): Response
    {
        $reward = Reward::find($id);
        if (!$reward) {
            abort(404, 'Reward not found');
        }

        try {
            $audioBytes = $this->polly->generateAudio($reward->message);
            return response($audioBytes, 200, [
                'Content-Type'        => 'audio/mpeg',
                'Content-Disposition' => 'inline',
            ]);
        } catch (\Exception $e) {
            Log::error("Polly TTS generation failed: {$e->getMessage()}");
            abort(500, 'Audio generation failed');
        }
    }

    // ─── GET /api/admin/rewards/{id}/print-label ─────────────────────────────

    public function printLabel(Request $request, int $id): \Illuminate\Http\Response
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Admin access required');
        }

        $reward = Reward::with('provider')->find($id);
        if (!$reward) {
            abort(404, 'Reward not found');
        }

        $provider = $reward->provider;
        $profile  = ProviderProfile::with('workingLocations')->where('user_id', $provider->id)->first();

        $address = 'Address not available';
        $pincode = '';
        if ($profile && $profile->workingLocations->isNotEmpty()) {
            $loc     = $profile->workingLocations->first();
            $parts   = array_filter([$loc->village, $loc->block, $loc->tehsil, $loc->district, $loc->state]);
            $address = implode(', ', $parts);
            $pincode = $loc->pincode ?? '';
        }

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shipping Label - {$provider->name}</title>
    <style>
        @media print { body { margin: 0; } .no-print { display: none; } }
        body { font-family: Arial, sans-serif; padding: 20px; }
        .label { border: 3px solid #000; padding: 20px; width: 400px; }
        .company { font-size: 18px; font-weight: bold; text-align: center;
                    border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .to { font-size: 14px; margin-bottom: 5px; }
        .name { font-size: 20px; font-weight: bold; margin: 10px 0; }
        .address { font-size: 14px; line-height: 1.6; }
        .pincode { font-size: 24px; font-weight: bold; letter-spacing: 4px; margin-top: 10px; }
        .gift { background: #f0f0f0; padding: 8px; margin-top: 10px;
                 font-size: 12px; border-radius: 4px; }
        .print-btn { margin-top: 20px; padding: 10px 20px; font-size: 16px;
                      cursor: pointer; background: #007bff; color: white;
                      border: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="label">
        <div class="company">🇮🇳 श्रम सारथी</div>
        <div class="to">TO:</div>
        <div class="name">{$provider->name}</div>
        <div class="to">📱 {$provider->phone}</div>
        <div class="address">{$address}</div>
        <div class="pincode">PIN: {$pincode}</div>
        <div class="gift">🎁 Gift: {$reward->gift_name}</div>
    </div>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print Label</button>
</body>
</html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    // ─── POST /api/admin/broadcast ────────────────────────────────────────────

    public function broadcast(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $message        = $request->query('message', '');
        $broadcastType  = $request->query('broadcast_type', 'sms');
        $categoryFilter = $request->query('category_filter');

        $query = User::where('role', 'provider')->where('is_active', true);
        if ($categoryFilter) {
            $query->whereHas('providerProfile', fn($q) => $q->where('category', $categoryFilter));
        }

        $phones  = $query->pluck('phone')->toArray();
        $results = $this->exotel->sendBulkBroadcast($phones, $message, $broadcastType);

        return response()->json([
            'message' => "Broadcast sent to " . count($phones) . " providers",
            'results' => $results,
        ]);
    }

    // ─── GET /api/admin/tickets ───────────────────────────────────────────────

    public function tickets(Request $request): JsonResponse
    {
        if (!$request->user()->hasPermission('tickets')) {
            return response()->json(['detail' => 'Permission denied'], 403);
        }

        $status = $request->query('status');
        $query  = SupportTicket::query();
        if ($status) {
            $query->where('status', $status);
        }

        return response()->json($query->orderByDesc('created_at')->get()->map(fn($t) => [
            'id'         => $t->id,
            'user_id'    => $t->user_id,
            'subject'    => $t->subject,
            'status'     => $t->status,
            'priority'   => $t->priority,
            'created_at' => $t->created_at,
        ]));
    }

    // ─── PUT /api/admin/tickets/{id}/resolve ─────────────────────────────────

    public function resolveTicket(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasPermission('tickets')) {
            return response()->json(['detail' => 'Permission denied'], 403);
        }

        $resolution = $request->query('resolution', '');
        $ticket     = SupportTicket::find($id);

        if (!$ticket) {
            return response()->json(['detail' => 'Ticket not found'], 404);
        }

        $ticket->status           = 'resolved';
        $ticket->resolution_notes = $resolution;
        $ticket->assigned_to      = $request->user()->id;
        $ticket->save();

        return response()->json(['message' => 'Ticket resolved']);
    }

    // ─── PUT /api/admin/settings/booking-fee ─────────────────────────────────

    public function updateBookingFee(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $fee = (int) $request->query('fee', 10);
        Setting::set('booking_fee', $fee);

        return response()->json(['message' => "Booking fee updated to ₹{$fee}"]);
    }

    // ─── PUT /api/admin/settings/vehicle-commission ───────────────────────────

    public function updateVehicleCommission(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $data = $request->validate([
            'normal_pct'     => 'required|numeric|min:5|max:7',
            'immediate_pct'  => 'required|numeric|min:5|max:7',
            'min_commission' => 'required|numeric|min:5',
        ]);

        Setting::set('vehicle_commission_normal_pct', $data['normal_pct']);
        Setting::set('vehicle_commission_immediate_pct', $data['immediate_pct']);
        Setting::set('vehicle_min_commission', $data['min_commission']);

        return response()->json([
            'success' => true,
            'message' => 'Vehicle commission settings updated successfully',
            'data'    => $data,
        ]);
    }
}
