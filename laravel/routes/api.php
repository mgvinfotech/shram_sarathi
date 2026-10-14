<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CallController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ContractorController;
use App\Http\Controllers\Api\ContractorProposalController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProviderController;
use App\Http\Controllers\Api\LabourController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\KarigarController;
use App\Http\Controllers\Api\TransportController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\AgentController;
use Illuminate\Support\Facades\Route;

// ─── Health / Root ────────────────────────────────────────────────────────────

Route::get('/', fn() => response()->json([
    'app' => 'Shram Sarathi',
    'version' => '1.0.0',
    'status' => 'running',
]));

Route::get('/health', fn() => response()->json([
    'status' => 'healthy',
    'env' => config('app.env'),
]));

// ─── Auth (rate limited for brute force & SMS spam protection) ─────────────────

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/signup', [AuthController::class, 'signup']);
    Route::post('/auth/verify-signup', [AuthController::class, 'verifySignup']);
    Route::post('/auth/complete-signup', [AuthController::class, 'completeSignup']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
});

// Strict rate-limiting on SMS/OTP dispatching endpoints (max 6 requests per minute per IP)
Route::middleware('throttle:6,1')->group(function () {
    Route::post('/auth/login-with-otp', [AuthController::class, 'loginWithOtp']);
    Route::post('/auth/send-otp', [AuthController::class, 'loginWithOtp']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
});

// ─── Public ───────────────────────────────────────────────────────────────────

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}/sub-categories', [CategoryController::class, 'subCategories']);

// ─── Razorpay Standard Checkout (Public API Endpoints) ────────────────────────
Route::post('/create-order', [PaymentController::class, 'createStandardOrder']);
Route::post('/verify-payment', [PaymentController::class, 'verifyStandardPayment']);

// ─── Webhooks (no auth — Exotel/Razorpay call these) ─────────────────────────

Route::post('/payment/webhook', [PaymentController::class, 'webhook']);
Route::post('/call/status-webhook', [CallController::class, 'statusWebhook']);
Route::post('/call/dtmf-webhook', [CallController::class, 'dtmfWebhook']);

// ─── Digital Contract public files (capability-token URLs, no JWT) ────────────
// Browser / RN <Image> Authorization header nahi bhej sakte, isliye unguessable
// 48-char token se serve karte hain.

Route::get('/contract/certificate/{token}', [ContractorProposalController::class, 'certificate']);
Route::get('/contract/agreement/{token}', [ContractorProposalController::class, 'agreementFile']);
Route::get('/contract/media/{token}', [ContractorProposalController::class, 'mediaFile']);

// ─── Authenticated routes ─────────────────────────────────────────────────────

Route::middleware('jwt.auth')->group(function () {

    // Auth
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/update-role', [AuthController::class, 'updateRole']);
    Route::post('/auth/add-role', [AuthController::class, 'addRole']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::delete('/auth/delete-account', [AuthController::class, 'deleteAccount']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Onboarding
    Route::post('/onboarding/complete-profile', [OnboardingController::class, 'completeProfile']);

    // Customer
    Route::get('/customer/search-nearby', [CustomerController::class, 'searchNearby']);
    Route::get('/customer/bookings', [CustomerController::class, 'bookings']);

    // Provider
    Route::post('/provider/setup', [ProviderController::class, 'setup']);
    Route::put('/provider/location', [ProviderController::class, 'updateLocation']);
    Route::post('/provider/toggle-online', [ProviderController::class, 'toggleOnline']);
    Route::get('/provider/profile/{userId}', [ProviderController::class, 'profile']);
    Route::get('/provider/dashboard', [ProviderController::class, 'dashboard']);
    Route::post('/provider/agent/add-labor', [ProviderController::class, 'addLabor']);    // legacy alias
    Route::post('/provider/agent/add-member', [ProviderController::class, 'addLabor']); // new endpoint
    Route::get('/provider/agent/stats', [ProviderController::class, 'agentStats']);
    Route::get('/provider/agent/labors', [ProviderController::class, 'agentLabors']);   // legacy alias
    Route::get('/provider/agent/network', [ProviderController::class, 'agentNetwork']); // new endpoint
    Route::get('/provider/agent/earnings', [ProviderController::class, 'agentEarnings']);

    // Contractor (Thekedar) Module
    Route::post('/contractor/kyc', [ContractorController::class, 'submitKyc']);
    Route::get('/contractor/profile', [ContractorController::class, 'getProfile']);
    Route::post('/contractor/calculate-bill', [ContractorController::class, 'calculateBill']);
    Route::post('/contractor/wallet-check', [ContractorController::class, 'walletCheck']);
    Route::post('/contractor/initiate-call', [ContractorController::class, 'initiateCall']);
    Route::post('/contractor/confirm-deal', [ContractorController::class, 'confirmDeal']);
    Route::post('/contractor/cancel', [ContractorController::class, 'cancelBooking']);
    Route::get('/contractor/customer-kyc-check', [ContractorController::class, 'customerKycCheck']);
    Route::get('/contractor/booking/{id}', [ContractorController::class, 'getBookingDetails']);
    Route::get('/contractor/provider/history', [ContractorController::class, 'providerHistory']);
    Route::get('/contractor/customer/history', [ContractorController::class, 'customerHistory']);

    // ─── ठेकेदार बुकिंग एवं डिजिटल ठेका प्रस्ताव (Contract Proposal Engine) ────────
    // V1 → Counter Offer (V2) → V3 … → FINAL ACCEPTANCE → Digital Work Contract
    Route::get('/contractor/proposal/meta', [ContractorProposalController::class, 'meta']);
    Route::post('/contractor/proposal/create', [ContractorProposalController::class, 'create']);
    Route::post('/contractor/proposal/upload-media', [ContractorProposalController::class, 'uploadMedia']);
    Route::get('/contractor/proposal/customer/list', [ContractorProposalController::class, 'customerList']);
    Route::get('/contractor/proposal/contractor/inbox', [ContractorProposalController::class, 'contractorInbox']);
    Route::get('/contractor/proposal/{id}', [ContractorProposalController::class, 'show'])->whereNumber('id');
    Route::get('/contractor/proposal/{id}/versions', [ContractorProposalController::class, 'versions'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/counter', [ContractorProposalController::class, 'counter'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/accept', [ContractorProposalController::class, 'accept'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/reject', [ContractorProposalController::class, 'reject'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/cancel', [ContractorProposalController::class, 'cancel'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/agreement', [ContractorProposalController::class, 'uploadAgreement'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/amendment', [ContractorProposalController::class, 'requestAmendment'])->whereNumber('id');
    Route::post('/contractor/proposal/{id}/amendment/respond', [ContractorProposalController::class, 'respondAmendment'])->whereNumber('id');

    // Labour (Mazdoor) Module
    Route::get('/labour/search', [LabourController::class, 'searchLabourers']);
    Route::post('/labour/request', [LabourController::class, 'requestLabour']);
    Route::get('/labour/status/{id}', [LabourController::class, 'jobStatus']);
    Route::post('/labour/cancel', [LabourController::class, 'cancelRequest']);
    Route::get('/labour/customer/history', [LabourController::class, 'customerHistory']);
    Route::get('/labour/provider/pending', [LabourController::class, 'providerPending']);
    Route::post('/labour/provider/accept', [LabourController::class, 'providerAccept']);
    Route::post('/labour/provider/reject', [LabourController::class, 'providerReject']);
    Route::get('/labour/provider/history', [LabourController::class, 'providerHistory']);

    Route::post('/labour/negotiation/send', [LabourController::class, 'sendNegotiation']);
    Route::get('/labour/negotiation/messages/{jobId}', [LabourController::class, 'getNegotiationMessages']);
    Route::post('/labour/negotiation/upload-voice', [LabourController::class, 'uploadVoice']);
    Route::post('/labour/customer/accept', [LabourController::class, 'customerAccept']);

    // Driver Booking Module
    Route::get('/driver/search', [DriverController::class, 'searchDrivers']);
    Route::post('/driver/request', [DriverController::class, 'requestDriver']);
    Route::get('/driver/status/{id}', [DriverController::class, 'jobStatus']);
    Route::post('/driver/cancel', [DriverController::class, 'cancelRequest']);
    Route::get('/driver/customer/history', [DriverController::class, 'customerHistory']);
    Route::get('/driver/provider/pending', [DriverController::class, 'providerPending']);
    Route::post('/driver/provider/accept', [DriverController::class, 'providerAccept']);
    Route::post('/driver/provider/reject', [DriverController::class, 'providerReject']);
    Route::get('/driver/provider/history', [DriverController::class, 'providerHistory']);

    Route::post('/driver/negotiation/send', [DriverController::class, 'sendNegotiation']);
    Route::get('/driver/negotiation/messages/{jobId}', [DriverController::class, 'getNegotiationMessages']);
    Route::post('/driver/negotiation/upload-voice', [DriverController::class, 'uploadVoice']);
    Route::post('/driver/customer/accept', [DriverController::class, 'customerAccept']);

    // Karigar (Craftsman) Booking Module
    Route::get('/karigar/search', [KarigarController::class, 'searchKarigars']);
    Route::post('/karigar/request', [KarigarController::class, 'requestKarigar']);
    Route::get('/karigar/status/{id}', [KarigarController::class, 'jobStatus']);
    Route::post('/karigar/cancel', [KarigarController::class, 'cancelRequest']);
    Route::get('/karigar/customer/history', [KarigarController::class, 'customerHistory']);
    Route::get('/karigar/provider/pending', [KarigarController::class, 'providerPending']);
    Route::post('/karigar/provider/accept', [KarigarController::class, 'providerAccept']);
    Route::post('/karigar/provider/reject', [KarigarController::class, 'providerReject']);
    Route::get('/karigar/provider/history', [KarigarController::class, 'providerHistory']);

    Route::post('/karigar/negotiation/send', [KarigarController::class, 'sendNegotiation']);
    Route::get('/karigar/negotiation/messages/{jobId}', [KarigarController::class, 'getNegotiationMessages']);
    Route::post('/karigar/negotiation/upload-voice', [KarigarController::class, 'uploadVoice']);
    Route::post('/karigar/customer/accept', [KarigarController::class, 'customerAccept']);

    // Transport (Parivahan Seva) Module
    Route::post('/transport/vehicle-setup', [TransportController::class, 'vehicleSetup']);
    Route::get('/transport/vehicles', [TransportController::class, 'searchVehicles']);
    Route::get('/transport/places/search', [TransportController::class, 'searchPlaces']);
    Route::post('/transport/calculate-fare', [TransportController::class, 'calculateFare']);
    Route::post('/transport/book', [TransportController::class, 'bookRide']);
    Route::post('/transport/driver/accept', [TransportController::class, 'driverAccept']);
    Route::post('/transport/driver/counter', [TransportController::class, 'driverCounter']);
    Route::post('/transport/customer/counter', [TransportController::class, 'customerCounter']);
    Route::post('/transport/customer/accept', [TransportController::class, 'customerAccept']);
    Route::post('/transport/customer/reject', [TransportController::class, 'customerReject']);
    Route::post('/transport/verify-pin', [TransportController::class, 'verifyPin']);
    Route::post('/transport/cancel', [TransportController::class, 'cancelBooking']);
    Route::get('/transport/customer/bookings', [TransportController::class, 'customerBookings']);
    Route::get('/transport/driver/bookings', [TransportController::class, 'driverBookings']);
    Route::get('/transport/driver/pending', [TransportController::class, 'driverPendingRequest']);
    Route::post('/transport/driver/reject', [TransportController::class, 'driverReject']);
    Route::post('/transport/driver/complete', [TransportController::class, 'completeBooking']);
    Route::post('/transport/rate', [TransportController::class, 'rateBooking']);
    Route::get('/transport/booking/{id}', [TransportController::class, 'bookingStatus']);
    Route::post('/transport/booking/{id}/cancel', [TransportController::class, 'cancelBooking']);
    Route::get('/transport/booking/{id}/agreement', [TransportController::class, 'digitalAgreement']);
    Route::get('/transport/vehicle-profile', [TransportController::class, 'vehicleProfile']);
    Route::get('/transport/negotiation/messages/{jobId}', [TransportController::class, 'getNegotiationMessages']);
    Route::post('/transport/negotiation/send', [TransportController::class, 'sendNegotiation']);
    Route::post('/transport/negotiation/upload-voice', [TransportController::class, 'uploadVoice']);

    // Universal negotiation voice upload fallback
    Route::post('/negotiation/upload-voice', [LabourController::class, 'uploadVoice']);

    // Payment / Wallet
    Route::get('/payment/fee', [PaymentController::class, 'getFee']);
    Route::post('/payment/create-order', [PaymentController::class, 'createOrder']);
    Route::post('/payment/verify', [PaymentController::class, 'verify']);
    Route::post('/payment/refund', [PaymentController::class, 'refund']);
    Route::get('/wallet', [\App\Http\Controllers\Api\WalletController::class, 'getWallet']);
    Route::get('/wallet/payout-methods', [\App\Http\Controllers\Api\WalletController::class, 'getPayoutMethod']);
    Route::post('/wallet/payout-methods/send-otp', [\App\Http\Controllers\Api\WalletController::class, 'sendPayoutOtp']);
    Route::post('/wallet/payout-methods', [\App\Http\Controllers\Api\WalletController::class, 'updatePayoutMethod']);
    Route::post('/wallet/recharge', [\App\Http\Controllers\Api\WalletController::class, 'recharge']);
    Route::post('/wallet/create-order', [\App\Http\Controllers\Api\WalletController::class, 'createOrder']);
    Route::post('/wallet/verify-order', [\App\Http\Controllers\Api\WalletController::class, 'verifyOrder']);
    Route::post('/wallet/withdraw', [\App\Http\Controllers\Api\WalletController::class, 'withdraw']);

    // Call
    Route::post('/call/initiate', [CallController::class, 'initiate']);

    // Admin API
    Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/admin/users', [AdminController::class, 'users']);
    Route::put('/admin/users/{id}/verify', [AdminController::class, 'verifyUser']);
    Route::put('/admin/users/{id}/blacklist', [AdminController::class, 'blacklistUser']);
    Route::post('/admin/sub-admin/create', [AdminController::class, 'createSubAdmin']);
    Route::post('/admin/agents', [AdminController::class, 'createAgent']);
    Route::get('/admin/payments', [AdminController::class, 'payments']);
    Route::get('/admin/commissions', [AdminController::class, 'commissions']);
    Route::post('/admin/commissions/{id}/release', [AdminController::class, 'releaseCommission']);
    Route::post('/admin/rewards/send', [AdminController::class, 'sendReward']);
    Route::get('/admin/rewards/{id}/audio', [AdminController::class, 'rewardAudio']);
    Route::get('/admin/rewards/{id}/print-label', [AdminController::class, 'printLabel']);
    Route::post('/admin/broadcast', [AdminController::class, 'broadcast']);
    Route::get('/admin/tickets', [AdminController::class, 'tickets']);
    Route::put('/admin/tickets/{id}/resolve', [AdminController::class, 'resolveTicket']);
    Route::put('/admin/settings/booking-fee', [AdminController::class, 'updateBookingFee']);
    Route::put('/admin/settings/vehicle-commission', [AdminController::class, 'updateVehicleCommission']);

    // User Support & SOS Tickets
    Route::get('/support/tickets', [\App\Http\Controllers\Api\SupportTicketController::class, 'index']);
    Route::post('/support/tickets', [\App\Http\Controllers\Api\SupportTicketController::class, 'store']);

    // Categories (admin seed)
    Route::post('/categories/seed', [CategoryController::class, 'seed']);

    // ─── Notifications & FCM ──────────────────────────────────────────────────
    Route::put('/user/fcm-token', [NotificationController::class, 'saveFcmToken']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::put('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications', [NotificationController::class, 'clearAll']);

    // Admin: Notification timeout config
    Route::get('/admin/settings/notification-timeout', [NotificationController::class, 'getTimeout']);
    Route::put('/admin/settings/notification-timeout', [NotificationController::class, 'updateTimeout']);

    // ─── Agent Partner Module (Shram Sarathi Network) ─────────────────────────
    Route::get('/agent/stats', [AgentController::class, 'stats']);
    Route::get('/agent/dashboard', [AgentController::class, 'stats']);
    Route::get('/agent/network', [AgentController::class, 'network']);
    Route::get('/agent/earnings', [AgentController::class, 'earnings']);
    Route::post('/agent/add-member', [AgentController::class, 'addMember']);
    Route::post('/agent/add-labor', [AgentController::class, 'addMember']);
    Route::post('/agent/withdraw', [AgentController::class, 'withdraw']);
    Route::get('/agent/notices', [AgentController::class, 'notices']);
    Route::get('/agent/support', [AgentController::class, 'support']);

    // Backward-compatibility Aliases for /provider/agent/...
    Route::get('/provider/agent/stats', [AgentController::class, 'stats']);
    Route::get('/provider/agent/network', [AgentController::class, 'network']);
    Route::get('/provider/agent/earnings', [AgentController::class, 'earnings']);
    Route::post('/provider/agent/add-labor', [AgentController::class, 'addMember']);
    Route::post('/provider/agent/withdraw', [AgentController::class, 'withdraw']);
});
