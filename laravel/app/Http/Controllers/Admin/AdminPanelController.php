<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Commission;
use App\Models\Inquiry;
use App\Models\Payment;
use App\Models\ProviderProfile;
use App\Models\Reward;
use App\Models\Setting;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\ExotelService;
use App\Services\JwtService;
use App\Services\OtpService;
use App\Services\PollyService;
use App\Services\RazorpayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdminPanelController extends Controller
{
    public function __construct(
        private JwtService    $jwt,
        private OtpService    $otp,
        private ExotelService $exotel,
        private PollyService  $polly,
        private RazorpayService $razorpay,
    ) {}

    // ─── Auth ─────────────────────────────────────────────────────────────────

    public function loginPage()
    {
        if (session('admin_user')) {
            return redirect()->route('admin.dashboard');
        }
        return view('admin.login');
    }

    public function loginStep1(Request $request)
    {
        $data = $request->validate([
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        $phone = $this->cleanPhone($data['phone']);
        $user  = User::where('phone', $phone)->first();

        if (!$user) {
            return back()->withErrors(['phone' => 'Phone number not registered.'])->withInput();
        }
        if (!in_array($user->role, ['admin', 'sub_admin'])) {
            return back()->withErrors(['phone' => 'No admin access for this account.'])->withInput();
        }
        if ($user->is_blacklisted) {
            return back()->withErrors(['phone' => 'Account is blocked.'])->withInput();
        }
        if (!$user->verifyPassword($data['password'])) {
            return back()->withErrors(['password' => 'Incorrect password.'])->withInput();
        }

        $this->otp->sendOtp($phone);
        session(['admin_pending_phone' => $phone]);

        return view('admin.verify-otp', ['phone' => $phone]);
    }

    public function loginStep2(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'otp'   => 'required|string|size:6',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        if (!$this->otp->verify($phone, $data['otp'])) {
            return back()->withErrors(['otp' => 'Invalid or expired OTP.'])->withInput();
        }
        $this->otp->delete($phone);

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return back()->withErrors(['otp' => 'User not found.']);
        }

        session([
            'admin_user' => [
                'id'    => $user->id,
                'name'  => $user->name,
                'phone' => $user->phone,
                'role'  => $user->role,
                'permissions' => $user->permissions ?? [],
            ],
        ]);

        return redirect()->route('admin.dashboard');
    }

    public function forgotPasswordPage()
    {
        return view('admin.forgot-password');
    }

    public function forgotPasswordStep1(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required|string',
        ]);

        $phone = $this->cleanPhone($data['phone']);
        $user  = User::where('phone', $phone)->first();

        if (!$user) {
            return back()->withErrors(['phone' => 'Phone number not registered.'])->withInput();
        }
        if (!in_array($user->role, ['admin', 'sub_admin'])) {
            return back()->withErrors(['phone' => 'No admin access for this account.'])->withInput();
        }

        $this->otp->sendOtp($phone);
        session(['admin_reset_phone' => $phone]);

        return view('admin.reset-password', ['phone' => $phone]);
    }

    public function forgotPasswordStep2(Request $request)
    {
        $data = $request->validate([
            'phone'        => 'required|string',
            'otp'          => 'required|string|size:6',
            'new_password' => 'required|string|min:6',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        if (!$this->otp->verify($phone, $data['otp'])) {
            return back()->withErrors(['otp' => 'Invalid or expired OTP.'])->withInput();
        }
        $this->otp->delete($phone);

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return back()->withErrors(['otp' => 'User not found.']);
        }

        $user->setPassword($data['new_password']);
        $user->save();

        return redirect()->route('admin.login')->with('success', 'Password reset successfully. Please login.');
    }

    public function logout(Request $request)
    {
        $request->session()->forget('admin_user');
        return redirect()->route('admin.login');
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    public function dashboard()
    {
        $totalUsers      = User::count();
        $totalProviders  = User::where('role', 'provider')->count();
        $totalCustomers  = User::where('role', 'customer')->count();
        $totalBookings   = Booking::count();
        $confirmedBookings = Booking::where('status', 'confirmed')->count();
        // Platform Revenue: fees collected from bookings, transport, withdrawals + any direct payments
        $platformFees   = WalletTransaction::whereIn('category', ['PLATFORM_FEE', 'WITHDRAWAL_FEE'])->sum('amount') ?? 0;
        $directPayments = Payment::where('status', 'success')->sum('amount') ?? 0;
        $totalRevenue   = (float) ($platformFees + $directPayments);

        $categoryBreakdown = Booking::select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->get();

        return view('admin.dashboard', compact(
            'totalUsers', 'totalProviders', 'totalCustomers',
            'totalBookings', 'confirmedBookings', 'totalRevenue',
            'categoryBreakdown'
        ));
    }

    // ─── Users ────────────────────────────────────────────────────────────────

    public function users(Request $request)
    {
        $query = User::query();

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q->where('name', 'ilike', "%{$s}%")
                ->orWhere('phone', 'ilike', "%{$s}%"));
        }

        $users = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return view('admin.users', compact('users'));
    }

    public function verifyUser(Request $request, int $id)
    {
        $user     = User::findOrFail($id);
        $approved = $request->input('approved') === '1';

        $user->verification_status = $approved ? 'verified' : 'rejected';
        $user->is_verified         = $approved;
        $user->save();

        return back()->with('success', 'User ' . ($approved ? 'verified' : 'rejected') . ' successfully.');
    }

    public function blacklistUser(Request $request, int $id)
    {
        $user      = User::findOrFail($id);
        $blacklist = $request->input('blacklist') === '1';

        $user->is_blacklisted   = $blacklist;
        $user->blacklist_reason = $blacklist ? ($request->input('reason', 'Admin action')) : null;
        $user->save();

        return back()->with('success', 'User ' . ($blacklist ? 'blacklisted' : 'unblacklisted') . '.');
    }

    public function createAgent(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'phone'    => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        if (User::where('phone', $phone)->exists()) {
            return back()->withErrors(['phone' => 'Phone already registered.'])->withInput();
        }

        $agent = new User([
            'phone'       => $phone,
            'name'        => $data['name'],
            'role'        => 'agent',
            'is_verified' => true,
        ]);
        $agent->setPassword($data['password']);
        $agent->save();

        Wallet::create(['user_id' => $agent->id]);

        return back()->with('success', "Agent '{$data['name']}' created successfully.");
    }

    // ─── Bookings ─────────────────────────────────────────────────────────────

    public function bookings(Request $request)
    {
        $query = Booking::with(['customer', 'provider'])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $bookings = $query->paginate(20)->withQueryString();

        return view('admin.bookings', compact('bookings'));
    }

    // ─── Payments ─────────────────────────────────────────────────────────────

    public function payments(Request $request)
    {
        $tab = $request->input('tab', 'all');

        // Top Financial KPI Statistics
        $totalPlatformRevenue = (float) (WalletTransaction::whereIn('category', ['PLATFORM_FEE', 'WITHDRAWAL_FEE'])->sum('amount')
                                + Payment::where('status', 'success')->sum('amount'));
        $totalRecharges       = (float) WalletTransaction::where('category', 'RECHARGE')->sum('amount');
        $totalWithdrawals     = (float) WalletTransaction::where('category', 'WITHDRAWAL')->sum('amount');
        $totalWalletReserves  = (float) Wallet::sum('balance');

        $kpis = [
            'platformRevenue' => $totalPlatformRevenue,
            'recharges'       => $totalRecharges,
            'withdrawals'     => $totalWithdrawals,
            'reserves'        => $totalWalletReserves,
        ];

        // Counts for tab badges
        $tabCounts = [
            'all'         => WalletTransaction::count(),
            'withdrawals' => WalletTransaction::where('category', 'WITHDRAWAL')->count(),
            'recharges'   => WalletTransaction::where('category', 'RECHARGE')->count(),
            'fees'        => WalletTransaction::whereIn('category', ['PLATFORM_FEE', 'WITHDRAWAL_FEE'])->count(),
            'gateway'     => Payment::count(),
        ];

        // ── Tab: Gateway (Raw Razorpay Orders) ──────────────────────────────
        if ($tab === 'gateway') {
            $query = Payment::with('user')->orderByDesc('created_at');

            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $s = trim($request->search);
                $query->where(function ($q) use ($s) {
                    $q->where('id', $s)
                      ->orWhere('razorpay_order_id', 'like', "%{$s}%")
                      ->orWhere('razorpay_payment_id', 'like', "%{$s}%")
                      ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"));
                });
            }

            $payments = $query->paginate(20)->withQueryString();
            return view('admin.payments', compact('payments', 'kpis', 'tabCounts', 'tab'));
        }

        // ── Tabs: Wallet Ledger Transactions (All, Withdrawals, Recharges, Platform Fees) ──
        $query = WalletTransaction::with(['user', 'wallet'])->orderByDesc('created_at');

        if ($tab === 'withdrawals') {
            $query->whereIn('category', ['WITHDRAWAL', 'WITHDRAWAL_FEE']);
        } elseif ($tab === 'recharges') {
            $query->where('category', 'RECHARGE');
        } elseif ($tab === 'fees') {
            $query->whereIn('category', ['PLATFORM_FEE', 'WITHDRAWAL_FEE']);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('id', $s)
                  ->orWhere('description', 'like', "%{$s}%")
                  ->orWhere('category', 'like', "%{$s}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"));
            });
        }

        $transactions = $query->paginate(20)->withQueryString();

        return view('admin.payments', compact('transactions', 'kpis', 'tabCounts', 'tab'));
    }

    public function markWithdrawalSettled(Request $request, int $id)
    {
        $tx = WalletTransaction::findOrFail($id);
        if (!in_array($tx->category, ['WITHDRAWAL', 'WITHDRAWAL_FEE'])) {
            return back()->withErrors(['error' => 'This is not a withdrawal transaction.']);
        }

        $ref = trim($request->input('settlement_ref', 'Settled by Admin'));
        if (!str_contains($tx->description, '[Settled:')) {
            $tx->description .= " [Settled: {$ref} at " . now()->format('d M Y, h:i A') . "]";
            $tx->save();
        }

        return back()->with('success', "Withdrawal #{$id} marked as settled successfully.");
    }

    public function refundPayment(Request $request, int $id)
    {
        $payment = Payment::findOrFail($id);

        if ($payment->status !== 'success') {
            return back()->withErrors(['error' => "Cannot refund payment with status: {$payment->status}"]);
        }
        if (!$payment->razorpay_payment_id) {
            return back()->withErrors(['error' => 'No Razorpay payment ID found.']);
        }

        try {
            $refund = $this->razorpay->processRefund(
                $payment->razorpay_payment_id,
                null,
                $request->input('reason', 'Admin manual refund')
            );

            $payment->status             = 'refund_pending';
            $payment->razorpay_refund_id = $refund['id'] ?? null;
            $payment->save();

            $booking = Booking::where('payment_id', $payment->id)->first();
            if ($booking) {
                $booking->status = 'refunded';
                $booking->save();
            }

            return back()->with('success', 'Refund initiated successfully.');
        } catch (\Exception $e) {
            Log::error("Refund failed: {$e->getMessage()}");
            return back()->withErrors(['error' => 'Refund failed: ' . $e->getMessage()]);
        }
    }

    // ─── Commissions ──────────────────────────────────────────────────────────

    public function commissions(Request $request)
    {
        $query = Commission::orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $commissions = $query->paginate(20)->withQueryString();

        $vehicleSettings = [
            'normal_pct'     => (float) Setting::get('vehicle_commission_normal_pct', 5.0),
            'immediate_pct'  => (float) Setting::get('vehicle_commission_immediate_pct', 7.0),
            'min_commission' => (float) Setting::get('vehicle_min_commission', 5.0),
        ];

        return view('admin.commissions', compact('commissions', 'vehicleSettings'));
    }

    public function releaseCommission(int $id)
    {
        $commission = Commission::findOrFail($id);

        if ($commission->status !== 'hold') {
            return back()->withErrors(['error' => 'Commission is not on hold.']);
        }

        $commission->status      = 'released';
        $commission->released_at = now();
        $commission->save();

        $wallet = Wallet::firstOrCreate(['user_id' => $commission->agent_id]);
        $wallet->balance      += $commission->amount;
        $wallet->hold_balance  = max(0, $wallet->hold_balance - $commission->amount);
        $wallet->total_earned += $commission->amount;
        $wallet->save();

        return back()->with('success', "Commission of ₹{$commission->amount} released.");
    }

    // ─── Rewards ──────────────────────────────────────────────────────────────

    public function rewards()
    {
        return view('admin.rewards');
    }

    public function sendReward(Request $request)
    {
        $data = $request->validate([
            'provider_id' => 'required|integer|exists:users,id',
            'gift_name'   => 'required|string|max:200',
            'message'     => 'required|string',
        ]);

        $adminUser = session('admin_user');
        $provider  = User::findOrFail($data['provider_id']);

        $reward = Reward::create([
            'provider_id' => $data['provider_id'],
            'admin_id'    => $adminUser['id'],
            'gift_name'   => $data['gift_name'],
            'message'     => $data['message'],
        ]);

        // Send TTS call
        try {
            $callData = $this->exotel->sendTtsCall($provider->phone, $data['message'], $reward->id);
            $reward->ivr_call_sid = $callData['call_sid'] ?? null;
            $reward->ivr_sent_at  = now();
            $reward->save();
        } catch (\Exception $e) {
            Log::error("TTS call failed: {$e->getMessage()}");
        }

        // Send SMS
        try {
            $this->exotel->sendSms($provider->phone, "श्रम सारथी: {$data['message']}");
            $reward->sms_sent = true;
            $reward->save();
        } catch (\Exception $e) {
            Log::error("SMS failed: {$e->getMessage()}");
        }

        return back()->with('success', "Reward sent to {$provider->name}! Reward ID: #{$reward->id}");
    }

    public function printLabel(Request $request, int $id)
    {
        $reward   = Reward::with('provider')->findOrFail($id);
        $provider = $reward->provider;
        $profile  = ProviderProfile::with('workingLocations')->where('user_id', $provider->id)->first();

        $address = 'Address not available';
        $pincode = '';
        if ($profile && $profile->workingLocations->isNotEmpty()) {
            $loc   = $profile->workingLocations->first();
            $parts = array_filter([$loc->village, $loc->block, $loc->tehsil, $loc->district, $loc->state]);
            $address = implode(', ', $parts);
            $pincode = $loc->pincode ?? '';
        }

        return view('admin.print-label', compact('reward', 'provider', 'address', 'pincode'));
    }

    // ─── Tickets ──────────────────────────────────────────────────────────────

    public function tickets(Request $request)
    {
        $query = SupportTicket::orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $tickets = $query->paginate(20)->withQueryString();

        return view('admin.tickets', compact('tickets'));
    }

    public function resolveTicket(Request $request, int $id)
    {
        $data   = $request->validate(['resolution' => 'required|string']);
        $ticket = SupportTicket::findOrFail($id);
        $admin  = session('admin_user');

        $ticket->status           = 'resolved';
        $ticket->resolution_notes = $data['resolution'];
        $ticket->assigned_to      = $admin['id'];
        $ticket->save();

        return back()->with('success', 'Ticket resolved.');
    }

    // ─── Inquiries / Leads ───────────────────────────────────────────────────

    public function inquiries(Request $request)
    {
        $query = Inquiry::orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('service')) {
            $query->where('service', $request->service);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('mobile', 'like', "%{$s}%")
                  ->orWhere('reference_no', 'like', "%{$s}%")
                  ->orWhere('location', 'like', "%{$s}%");
            });
        }

        $inquiries = $query->paginate(20)->withQueryString();

        $stats = [
            'total'     => Inquiry::count(),
            'pending'   => Inquiry::where('status', 'Pending')->count(),
            'contacted' => Inquiry::where('status', 'Contacted')->count(),
            'converted' => Inquiry::where('status', 'Converted')->count(),
            'cancelled' => Inquiry::where('status', 'Cancelled')->count(),
        ];

        return view('admin.inquiries', compact('inquiries', 'stats'));
    }

    public function updateInquiryStatus(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => 'required|in:Pending,Contacted,Converted,Cancelled',
        ]);

        $inquiry = Inquiry::findOrFail($id);
        $inquiry->status = $data['status'];
        $inquiry->save();

        return back()->with('success', "Inquiry #{$inquiry->reference_no} status updated to {$data['status']}.");
    }

    public function deleteInquiry(int $id)
    {
        $inquiry = Inquiry::findOrFail($id);
        $ref = $inquiry->reference_no;
        $inquiry->delete();

        return back()->with('success', "Inquiry #{$ref} deleted successfully.");
    }

    // ─── Broadcast ────────────────────────────────────────────────────────────

    public function broadcast()
    {
        return view('admin.broadcast');
    }

    public function sendBroadcast(Request $request)
    {
        $data = $request->validate([
            'message'        => 'required|string',
            'broadcast_type' => 'required|in:sms,voice',
            'category_filter'=> 'nullable|string',
        ]);

        $query = User::where('role', 'provider')->where('is_active', true);
        if (!empty($data['category_filter'])) {
            $query->whereHas('providerProfile', fn($q) => $q->where('category', $data['category_filter']));
        }

        $phones  = $query->pluck('phone')->toArray();
        $results = $this->exotel->sendBulkBroadcast($phones, $data['message'], $data['broadcast_type']);

        $msg = "Broadcast sent to " . count($phones) . " providers. ✅ {$results['success']} success, ❌ {$results['failed']} failed.";
        return back()->with('success', $msg);
    }

    // ─── Settings ─────────────────────────────────────────────────────────────

    public function updateBookingFee(Request $request)
    {
        $data = $request->validate(['fee' => 'required|integer|min:1|max:1000']);
        Setting::set('booking_fee', $data['fee']);
        return back()->with('success', "Booking fee updated to ₹{$data['fee']}.");
    }

    public function updateVehicleCommissionSettings(Request $request)
    {
        $data = $request->validate([
            'normal_pct'     => 'required|numeric|min:5|max:7',
            'immediate_pct'  => 'required|numeric|min:5|max:7',
            'min_commission' => 'required|numeric|min:5',
        ]);

        Setting::set('vehicle_commission_normal_pct', $data['normal_pct']);
        Setting::set('vehicle_commission_immediate_pct', $data['immediate_pct']);
        Setting::set('vehicle_min_commission', $data['min_commission']);

        return back()->with('success', "गाड़ी बुकिंग कमीशन सेटिंग्स अपडेट हो गईं (Advance: {$data['normal_pct']}%, Immediate: {$data['immediate_pct']}%, न्यूनतम कटौती: ₹{$data['min_commission']})।");
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

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
