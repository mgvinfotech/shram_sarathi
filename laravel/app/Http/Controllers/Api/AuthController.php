<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use App\Services\JwtService;
use App\Services\OtpService;
use App\Services\RedisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function __construct(
        private JwtService   $jwt,
        private OtpService   $otp,
        private RedisService $redis,
    ) {}

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user) {
            $user->fcm_token = null;
            $user->save();
        }

        return response()->json(['message' => 'Logged out successfully']);
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

    private function validatePhone(string $phone): bool
    {
        return (bool) preg_match('/^[6-9]\d{9}$/', $phone);
    }

    // ─── POST /api/auth/signup ────────────────────────────────────────────────

    public function signup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'          => 'required|string',
            'name'           => 'required|string|max:100',
            'password'       => 'required|string|min:6',
            'gender'         => 'nullable|string',
            'role'           => 'sometimes|string',
            'roles'          => 'sometimes|array',
            'selected_roles' => 'sometimes|array',
        ]);

        $phone = $this->cleanPhone($data['phone']);
        if (!$this->validatePhone($phone)) {
            return response()->json(['detail' => 'Invalid Indian mobile number (10 digits, starts with 6-9)'], 422);
        }

        if (User::where('phone', $phone)->exists()) {
            return response()->json(['detail' => 'Phone number already registered. Please login.'], 400);
        }

        // Normalize roles array
        $rawRoles = $data['roles'] ?? $data['selected_roles'] ?? (!empty($data['role']) ? [$data['role']] : ['customer']);
        $normalizedRoles = [];
        foreach ((array) $rawRoles as $r) {
            $lower = strtolower(trim($r));
            if ($lower === 'provider') $lower = 'labour';
            if (!empty($lower)) {
                $normalizedRoles[] = $lower;
            }
        }
        // Always guarantee customer role is present
        if (!in_array('customer', $normalizedRoles)) {
            $normalizedRoles[] = 'customer';
        }
        $normalizedRoles = array_values(array_unique($normalizedRoles));

        // Store pending signup in Redis (5 min TTL)
        $this->redis->storePendingSignup($phone, [
            'name'           => $data['name'],
            'password'       => $data['password'],
            'gender'         => $data['gender'] ?? null,
            'role'           => $normalizedRoles[0] ?? 'customer',
            'selected_roles' => $normalizedRoles,
        ]);

        $this->otp->sendOtp($phone);
        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        $maskedName = substr($data['name'], 0, 2) . '***';
        Log::info("SIGNUP | phone={$maskedPhone} name='{$maskedName}' | OTP sent");

        return response()->json([
            'message' => 'OTP sent to your mobile number',
            'phone'   => $phone,
        ]);
    }

    // ─── POST /api/auth/verify-signup ─────────────────────────────────────────
    // STEP 2: Verify OTP only. Do NOT create user in DB yet.
    // Just mark phone as OTP-verified in Redis (10 min TTL).

    public function verifySignup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'otp'   => 'required|string|size:6',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        $storedOtp = $this->otp->get($phone);
        if (!$storedOtp) {
            return response()->json(['detail' => 'OTP expired. Please request a new one.'], 400);
        }
        if ($storedOtp !== $data['otp']) {
            Log::warning("SIGNUP OTP FAIL | phone={$phone}");
            return response()->json(['detail' => 'Invalid OTP'], 400);
        }
        $this->otp->delete($phone);

        // Verify pending signup still exists in Redis
        $pending = $this->redis->getPendingSignup($phone);
        if (!$pending) {
            return response()->json(['detail' => 'Signup session expired. Please start again.'], 400);
        }

        // Mark OTP as verified — user must now choose role to complete signup
        $this->redis->markSignupVerified($phone);

        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        Log::info("SIGNUP OTP OK | phone={$maskedPhone} | waiting for role selection");

        return response()->json([
            'verified' => true,
            'phone'    => $phone,
            'message'  => 'OTP verified. Please select your role to complete signup.',
        ]);
    }

    // ─── POST /api/auth/complete-signup ───────────────────────────────────────
    // STEP 3: Final step — user picks role → create in DB + return JWT

    public function completeSignup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'role'  => 'required|string|in:customer,provider,transport,labour,karigar,driver,contractor,agent,LABOUR,KARIGAR,DRIVER,TRANSPORT,CONTRACTOR,AGENT,CUSTOMER',
        ]);

        // Normalize role to lowercase
        $assignedRole = strtolower($data['role']);
        if ($assignedRole === 'provider') {
            $assignedRole = 'labour';
        }
        $data['role'] = $assignedRole;

        $phone = $this->cleanPhone($data['phone']);

        // Check OTP was verified
        if (!$this->redis->isSignupVerified($phone)) {
            return response()->json(['detail' => 'OTP not verified or session expired. Please start signup again.'], 400);
        }

        // Get pending signup data
        $pending = $this->redis->getPendingSignup($phone);
        if (!$pending) {
            return response()->json(['detail' => 'Signup session expired. Please start again.'], 400);
        }

        // Prevent duplicate registration
        if (User::where('phone', $phone)->exists()) {
            return response()->json(['detail' => 'Phone number already registered. Please login.'], 400);
        }

        // Determine selected roles list
        $rawRoles = $request->input('roles') ?? $request->input('selected_roles') ?? ($pending['selected_roles'] ?? [$data['role']]);
        if (is_string($rawRoles)) {
            $rawRoles = explode(',', $rawRoles);
        }
        $normalizedRoles = [];
        foreach ((array) $rawRoles as $r) {
            $lower = strtolower(trim($r));
            if ($lower === 'provider') $lower = 'labour';
            if (!empty($lower)) {
                $normalizedRoles[] = $lower;
            }
        }
        if (!in_array($data['role'], $normalizedRoles)) {
            $normalizedRoles[] = $data['role'];
        }
        // Always guarantee customer is present
        if (!in_array('customer', $normalizedRoles)) {
            $normalizedRoles[] = 'customer';
        }
        $normalizedRoles = array_values(array_unique($normalizedRoles));

        // ✅ NOW create user in DB
        $user = new User([
            'phone'               => $phone,
            'name'                => $pending['name'],
            'gender'              => $pending['gender'] ?? null,
            'role'                => $data['role'],
            'selected_roles'      => $normalizedRoles,
            'is_verified'         => true,
            'verification_status' => 'pending',
        ]);
        $user->setPassword($pending['password']);
        $user->save();

        // Create wallet
        Wallet::create(['user_id' => $user->id]);

        // Cleanup Redis
        $this->redis->deletePendingSignup($phone);
        $this->redis->clearSignupVerified($phone);

        $token = $this->jwt->createToken($user->id, $user->role);
        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        $maskedName  = substr($user->name, 0, 2) . '***';
        Log::info("SIGNUP COMPLETE | phone={$maskedPhone} name='{$maskedName}' id={$user->id} role={$user->role}");

        $hasProfile = !in_array($user->role, ['customer', 'provider']);

        return response()->json([
            'access_token'   => $token,
            'token_type'     => 'bearer',
            'user_id'        => $user->id,
            'role'           => $user->role,
            'selected_roles' => $user->getSelectedRoles(),
            'name'           => $user->name,
            'is_new_user'    => true,
            'has_profile'    => $hasProfile,
        ]);
    }

    // ─── POST /api/auth/login ─────────────────────────────────────────────────

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return response()->json(['detail' => 'Phone number not registered. Please sign up.'], 401);
        }
        if ($user->is_blacklisted) {
            Log::warning("LOGIN BLOCKED | phone={$phone} id={$user->id}");
            return response()->json(['detail' => 'Account is blocked. Contact support.'], 403);
        }
        if (!$user->verifyPassword($data['password'])) {
            Log::warning("LOGIN FAIL (wrong password) | phone={$phone}");
            return response()->json(['detail' => 'Incorrect password'], 401);
        }

        $this->otp->sendOtp($phone);
        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        $maskedName = substr($user->name, 0, 2) . '***';
        Log::info("LOGIN | phone={$maskedPhone} name='{$maskedName}' id={$user->id} | OTP sent for 2FA");

        return response()->json([
            'message' => 'Password verified. OTP sent for 2FA verification.',
            'phone'   => $phone,
        ]);
    }

    // ─── POST /api/auth/login-with-otp ───────────────────────────────────────

    public function loginWithOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
        ]);

        $phone = $this->cleanPhone($data['phone']);
        if (!$this->validatePhone($phone)) {
            return response()->json(['detail' => 'Invalid Indian mobile number (10 digits, starts with 6-9)'], 422);
        }

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return response()->json(['detail' => 'Phone number not registered. Please sign up.'], 401);
        }
        if ($user->is_blacklisted) {
            Log::warning("OTP-LOGIN BLOCKED | phone={$phone} id={$user->id}");
            return response()->json(['detail' => 'Account is blocked. Contact support.'], 403);
        }

        $this->otp->sendOtp($phone);
        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        $maskedName  = substr($user->name, 0, 2) . '***';
        Log::info("OTP-LOGIN | phone={$maskedPhone} name='{$maskedName}' id={$user->id} | OTP sent");

        return response()->json([
            'message' => 'OTP sent to your mobile number',
            'phone'   => $phone,
        ]);
    }

    // ─── POST /api/auth/verify-otp ────────────────────────────────────────────

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
            'otp'   => 'required|string|size:6',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        $storedOtp = $this->otp->get($phone);
        if (!$storedOtp) {
            return response()->json(['detail' => 'OTP expired or not found. Please login again.'], 400);
        }
        if ($storedOtp !== $data['otp']) {
            Log::warning("LOGIN OTP FAIL | phone={$phone}");
            return response()->json(['detail' => 'Invalid OTP'], 400);
        }
        $this->otp->delete($phone);

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $token = $this->jwt->createToken($user->id, $user->role);
        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        $maskedName = substr($user->name, 0, 2) . '***';
        Log::info("LOGIN OK | phone={$maskedPhone} name='{$maskedName}' id={$user->id} role={$user->role}");

        $hasProfile = $this->checkHasProviderProfile($user, $user->role);

        return response()->json([
            'access_token'   => $token,
            'token_type'     => 'bearer',
            'user_id'        => $user->id,
            'role'           => $user->role,
            'selected_roles' => $user->getSelectedRoles(),
            'name'           => $user->name,
            'is_new_user'    => false,
            'has_profile'    => $hasProfile,
        ]);
    }

    // ─── GET /api/auth/me ─────────────────────────────────────────────────────

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $photoUrl = null;
        if ($user->providerProfile && !empty($user->providerProfile->photo_url)) {
            $photoUrl = $user->providerProfile->photo_url;
        } elseif (!empty($user->aadhaar_url)) {
            $photoUrl = $user->aadhaar_url;
        }
        $hasProfile = $this->checkHasProviderProfile($user, $user->role);
        return response()->json([
            'id'                  => $user->id,
            'phone'               => $user->phone,
            'name'                => $user->name,
            'role'                => $user->role,
            'selected_roles'      => $user->getSelectedRoles(),
            'photo_url'           => $photoUrl,
            'is_verified'         => $user->is_verified,
            'verification_status' => $user->verification_status,
            'has_password'        => !empty($user->password),
            'has_profile'         => $hasProfile,
            'gender'              => $user->gender,
        ]);
    }

    // ─── Helper: Check if provider profile has required details filled ─────────

    public function checkHasProviderProfile(User $user, string $role): bool
    {
        $role = strtolower($role);
        if (in_array($role, ['customer', 'admin', 'agent'])) {
            return true;
        }

        $profile = $user->providerProfile;
        if (!$profile || !$profile->exists) {
            return false;
        }

        switch ($role) {
            case 'labour':
                $hasCat = in_array(strtolower($profile->category ?? ''), ['labour', 'majdoor']);
                $hasDetails = !empty($profile->expected_daily_wage) || !empty($profile->sub_categories) || !empty($profile->experience_years);
                return $hasCat && $hasDetails;

            case 'karigar':
                $hasCat = strtolower($profile->category ?? '') === 'karigar';
                $hasDetails = !empty($profile->expected_daily_wage) || !empty($profile->sub_categories) || !empty($profile->experience_years);
                return $hasCat && $hasDetails;

            case 'driver':
                return (!empty($profile->dl_number) || !empty($profile->vehicle_type));

            case 'transport':
                return (!empty($profile->vehicle_number) || !empty($profile->vehicle_type) || in_array(strtolower($profile->category ?? ''), ['transport', 'vehicle']));

            case 'contractor':
                return (!empty($profile->firm_name) || !empty($profile->team_size));

            default:
                return $profile->exists;
        }
    }

    // ─── POST /api/auth/update-role ───────────────────────────────────────────

    public function updateRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => 'required|string|in:customer,provider,transport,labour,karigar,driver,contractor,agent,LABOUR,KARIGAR,DRIVER,TRANSPORT,CONTRACTOR,AGENT,CUSTOMER',
        ]);

        $user = $request->user();
        $targetRole = strtolower($data['role']);
        if ($targetRole === 'provider') {
            $targetRole = 'labour';
        }

        $allowedRoles = $user->getSelectedRoles();

        // Enforce restriction: user can only switch to roles they signed up for / enabled
        if (!empty($user->selected_roles) && is_array($user->selected_roles) && !in_array($targetRole, $allowedRoles)) {
            return response()->json([
                'detail' => 'साइनअप के समय आपने यह रोल नहीं चुना था। आप केवल अपने चुने हुए अकाउंट्स में ही स्विच कर सकते हैं।',
                'allowed_roles' => $allowedRoles,
            ], 403);
        }

        $user->role = $targetRole;
        $user->save();

        // ── Update ProviderProfile online status based on new role ──────────────
        $providerRoleToCategory = [
            'driver'     => 'driver',
            'transport'  => 'transport',
            'labour'     => 'labour',
            'karigar'    => 'karigar',
            'contractor' => 'contractor',
            'agent'      => 'agent',
        ];
        $isProviderRole = array_key_exists($targetRole, $providerRoleToCategory);

        $profile = \App\Models\ProviderProfile::firstOrNew(['user_id' => $user->id]);
        if ($isProviderRole) {
            $correctCategory = $providerRoleToCategory[$targetRole];
            // Only update and save if the profile already exists in DB with real data
            if ($profile->exists) {
                $profile->is_online = true;
                $profile->category = $correctCategory;
                $profile->save();
            }
        } else {
            // Switching to customer/non-provider → go offline so they don't appear in searches
            if ($profile->exists) {
                $profile->is_online = false;
                $profile->save();
            }
        }

        $token = $this->jwt->createToken($user->id, $user->role);
        $hasProfile = $this->checkHasProviderProfile($user, $targetRole);

        \Illuminate\Support\Facades\Log::info("ROLE SWITCH | user_id={$user->id} → role={$targetRole} has_profile=" . ($hasProfile ? 'true' : 'false'));

        return response()->json([
            'message'        => 'Role updated successfully',
            'role'           => $user->role,
            'selected_roles' => $user->getSelectedRoles(),
            'access_token'   => $token,
            'has_profile'    => $hasProfile,
            'token_type'     => 'bearer',
        ]);
    }


    // ─── POST /api/auth/add-role ───────────────────────────────────────────────

    public function addRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => 'required|string|in:customer,provider,transport,labour,karigar,driver,contractor,agent,LABOUR,KARIGAR,DRIVER,TRANSPORT,CONTRACTOR,AGENT,CUSTOMER',
        ]);

        $user = $request->user();
        $newRole = strtolower($data['role']);
        if ($newRole === 'provider') $newRole = 'labour';

        $currentSelected = $user->getSelectedRoles();
        if (!in_array($newRole, $currentSelected)) {
            $currentSelected[] = $newRole;
            $user->selected_roles = array_values(array_unique($currentSelected));
            $user->save();
        }

        return response()->json([
            'message'        => 'New role added to account successfully',
            'selected_roles' => $user->getSelectedRoles(),
        ]);
    }
    // ─── POST /api/auth/forgot-password ───────────────────────────────────────

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return response()->json(['detail' => 'Phone number not registered.'], 404);
        }

        $this->otp->sendOtp($phone);
        
        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        Log::info("FORGOT PASSWORD | phone={$maskedPhone} | OTP sent");

        return response()->json([
            'message' => 'OTP sent to your mobile number for password reset.',
            'phone'   => $phone,
        ]);
    }

    // ─── POST /api/auth/reset-password ────────────────────────────────────────

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'        => 'required|string',
            'otp'          => 'required|string|size:6',
            'new_password' => 'required|string|min:6',
        ]);

        $phone = $this->cleanPhone($data['phone']);

        $storedOtp = $this->otp->get($phone);
        if (!$storedOtp) {
            return response()->json(['detail' => 'OTP expired or not found. Please request a new one.'], 400);
        }
        if ($storedOtp !== $data['otp']) {
            $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
            Log::warning("RESET PASSWORD OTP FAIL | phone={$maskedPhone}");
            return response()->json(['detail' => 'Invalid OTP'], 400);
        }
        
        $this->otp->delete($phone);

        $user = User::where('phone', $phone)->first();
        if (!$user) {
            return response()->json(['detail' => 'User not found'], 404);
        }

        $user->setPassword($data['new_password']);
        $user->save();

        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        Log::info("RESET PASSWORD OK | phone={$maskedPhone} id={$user->id}");

        return response()->json([
            'message' => 'Password reset successfully. You can now login.',
        ]);
    }

    // ─── PUT /api/auth/profile ────────────────────────────────────────────

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'password' => 'sometimes|nullable|string|min:6',
            'gender'   => 'sometimes|nullable|string',
        ]);

        $user->name = $data['name'];
        if (array_key_exists('gender', $data)) {
            $user->gender = $data['gender'];
        }
        if (!empty($data['password'])) {
            $user->setPassword($data['password']);
        }
        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'name'    => $user->name,
        ]);
    }

    // ─── DELETE /api/auth/delete-account ──────────────────────────────────

    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['detail' => 'Unauthenticated.'], 401);
        }

        // Check if user has active bookings
        $hasActiveBookings = \App\Models\Booking::where(function ($q) use ($user) {
            $q->where('customer_id', $user->id)
              ->orWhere('provider_id', $user->id);
        })->whereIn('status', ['requested', 'accepted', 'in_progress'])->exists();

        if ($hasActiveBookings) {
            return response()->json([
                'detail' => 'आपकी सक्रिय बुकिंग चल रही है। कृपया पहले अपनी बुकिंग पूरी या रद्द करें।'
            ], 400);
        }

        $userId = $user->id;
        $originalPhone = $user->phone;

        // If provider profile exists, deactivate it
        if ($user->providerProfile) {
            $user->providerProfile->is_online = false;
            $user->providerProfile->is_available = false;
            $user->providerProfile->save();
        }

        // Anonymize and delete user data to comply with Google Play & privacy standards
        $user->phone = 'del_' . $userId . '_' . time();
        $user->name = 'Deleted User';
        $user->gender = null;
        $user->email = null;
        $user->aadhaar_url = null;
        $user->eshram_url = null;
        $user->fcm_token = null;
        $user->upi_id = null;
        $user->bank_details = null;
        $user->is_active = false;
        $user->is_blacklisted = true;
        $user->blacklist_reason = 'Account deleted upon user request';
        $user->setPassword(bin2hex(random_bytes(16)));
        $user->save();

        Log::info("ACCOUNT DELETED | user_id={$userId} original_phone={$originalPhone}");

        return response()->json([
            'message' => 'Account and personal data have been deleted successfully.',
        ]);
    }
}
