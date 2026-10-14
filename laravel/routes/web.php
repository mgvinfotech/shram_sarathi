<?php

use App\Http\Controllers\Admin\AdminPanelController;
use App\Http\Controllers\Web\PageController;
use Illuminate\Support\Facades\Route;

// ─── Public Web Pages (web.* route group) ────────────────────────────────────
Route::name('web.')->group(function () {
    Route::get('/',              [PageController::class, 'home'])->name('home');
    Route::get('/about',         [PageController::class, 'about'])->name('about');
    Route::get('/services',      [PageController::class, 'services'])->name('services');
    Route::get('/how-it-works',  [PageController::class, 'howItWorks'])->name('how-it-works');
    Route::get('/join-network',  [PageController::class, 'joinNetwork'])->name('join-network');
    Route::get('/pricing',       [PageController::class, 'pricing'])->name('pricing');
    Route::get('/contact',       [PageController::class, 'contact'])->name('contact');
    Route::get('/faq',           [PageController::class, 'faq'])->name('faq');
    Route::get('/blog',          [PageController::class, 'blog'])->name('blog');
    Route::get('/careers',       [PageController::class, 'careers'])->name('careers');
    Route::get('/terms',         [PageController::class, 'terms'])->name('terms');
    Route::get('/privacy',       [PageController::class, 'privacy'])->name('privacy');
    Route::get('/delete-account',[PageController::class, 'deleteAccount'])->name('delete-account');
    Route::post('/delete-account',[PageController::class, 'submitDeleteAccountRequest'])->name('delete-account.submit');
    Route::get('/refund',        [PageController::class, 'refund'])->name('refund');
    Route::get('/shipping',      [PageController::class, 'shipping'])->name('shipping');
    Route::get('/checkout',      [PageController::class, 'checkout'])->name('checkout');
    Route::get('/checkout-app',  [PageController::class, 'checkoutApp'])->name('checkout.app');
    Route::get('/download-apk',  [PageController::class, 'downloadApk'])->name('download-apk');
    Route::post('/inquiry',      [PageController::class, 'submitInquiry'])->name('inquiry.submit');
});

// Non-prefixed alias for inquiry form submission
Route::post('/inquiry', [PageController::class, 'submitInquiry'])->name('inquiry.submit');

// ─── Admin Panel (Blade) ──────────────────────────────────────────────────────

// Language toggle
Route::post('/admin/lang', function (\Illuminate\Http\Request $request) {
    $lang = $request->input('lang', 'en');
    session(['admin_lang' => in_array($lang, ['en', 'hi']) ? $lang : 'en']);
    return back();
})->name('admin.lang');

// Login (no auth)
Route::get('/admin/login',  [AdminPanelController::class, 'loginPage'])->name('admin.login');
Route::post('/admin/login', [AdminPanelController::class, 'loginStep1'])->name('admin.login.step1');
Route::post('/admin/verify-otp', [AdminPanelController::class, 'loginStep2'])->name('admin.login.step2');

// Forgot Password
Route::get('/admin/forgot-password', [AdminPanelController::class, 'forgotPasswordPage'])->name('admin.forgot-password');
Route::post('/admin/forgot-password', [AdminPanelController::class, 'forgotPasswordStep1'])->name('admin.forgot-password.step1');
Route::post('/admin/reset-password', [AdminPanelController::class, 'forgotPasswordStep2'])->name('admin.forgot-password.step2');

Route::post('/admin/logout', [AdminPanelController::class, 'logout'])->name('admin.logout');

// Protected admin routes
Route::middleware('admin.auth')->prefix('admin')->name('admin.')->group(function () {
    Route::get('/',           fn() => redirect()->route('admin.dashboard'));
    Route::get('/dashboard',  [AdminPanelController::class, 'dashboard'])->name('dashboard');
    Route::get('/users',      [AdminPanelController::class, 'users'])->name('users');
    Route::get('/bookings',   [AdminPanelController::class, 'bookings'])->name('bookings');
    Route::get('/payments',   [AdminPanelController::class, 'payments'])->name('payments');
    Route::get('/commissions',[AdminPanelController::class, 'commissions'])->name('commissions');
    Route::get('/rewards',    [AdminPanelController::class, 'rewards'])->name('rewards');
    Route::get('/tickets',    [AdminPanelController::class, 'tickets'])->name('tickets');
    Route::get('/inquiries',  [AdminPanelController::class, 'inquiries'])->name('inquiries');
    Route::get('/broadcast',  [AdminPanelController::class, 'broadcast'])->name('broadcast');

    // AJAX / form actions
    Route::post('/users/{id}/verify',     [AdminPanelController::class, 'verifyUser'])->name('users.verify');
    Route::post('/users/{id}/blacklist',  [AdminPanelController::class, 'blacklistUser'])->name('users.blacklist');
    Route::post('/users/create-agent',    [AdminPanelController::class, 'createAgent'])->name('users.create-agent');
    Route::post('/payments/{id}/refund',  [AdminPanelController::class, 'refundPayment'])->name('payments.refund');
    Route::post('/withdrawals/{id}/settle', [AdminPanelController::class, 'markWithdrawalSettled'])->name('withdrawals.settle');
    Route::post('/commissions/{id}/release', [AdminPanelController::class, 'releaseCommission'])->name('commissions.release');
    Route::post('/rewards/send',          [AdminPanelController::class, 'sendReward'])->name('rewards.send');
    Route::get('/rewards/{id}/print-label', [AdminPanelController::class, 'printLabel'])->name('rewards.print-label');
    Route::post('/tickets/{id}/resolve',  [AdminPanelController::class, 'resolveTicket'])->name('tickets.resolve');
    Route::post('/inquiries/{id}/status', [AdminPanelController::class, 'updateInquiryStatus'])->name('inquiries.status');
    Route::delete('/inquiries/{id}',      [AdminPanelController::class, 'deleteInquiry'])->name('inquiries.delete');
    Route::post('/broadcast/send',        [AdminPanelController::class, 'sendBroadcast'])->name('broadcast.send');
    Route::post('/settings/booking-fee',        [AdminPanelController::class, 'updateBookingFee'])->name('settings.booking-fee');
    Route::post('/settings/vehicle-commission', [AdminPanelController::class, 'updateVehicleCommissionSettings'])->name('settings.vehicle-commission');
});

// Fallback storage file server for uploaded media
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    if (!file_exists($fullPath)) {
        abort(404);
    }
    return response()->file($fullPath);
})->where('path', '.*');

// ─── Direct APK Download Routes ──────────────────────────────────────────────
Route::get('/sharam.apk', function () {
    $file = public_path('sharam.apk');
    if (!file_exists($file)) {
        abort(404, 'APK file not found');
    }
    return response()->download($file, 'sharam.apk', [
        'Content-Type' => 'application/vnd.android.package-archive',
        'Content-Disposition' => 'attachment; filename="sharam.apk"',
    ]);
})->name('apk.download.sharam');

Route::get('/shram.apk', function () {
    $file = file_exists(public_path('shram.apk')) ? public_path('shram.apk') : public_path('sharam.apk');
    if (!file_exists($file)) {
        abort(404, 'APK file not found');
    }
    return response()->download($file, 'shram.apk', [
        'Content-Type' => 'application/vnd.android.package-archive',
        'Content-Disposition' => 'attachment; filename="shram.apk"',
    ]);
})->name('apk.download.shram');

