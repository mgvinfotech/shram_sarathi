<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\ProviderProfile;

class RedisService
{
    private const CALL_LOCK_PREFIX = 'call_lock:';
    private const BLACKLIST_PREFIX = 'blacklist:jti:';

    public function __construct()
    {
        // Redis client no longer needed, using Laravel Cache and MySQL
    }

    public function client()
    {
        return null; // Kept for compatibility if called anywhere else
    }

    // ─── Provider Location (MySQL Haversine) ──────────────────────────────────────

    public function updateProviderLocation(int $providerId, float $lat, float $lng): void
    {
        try {
            // Update location directly in MySQL instead of Redis Geo
            ProviderProfile::where('user_id', $providerId)->update([
                'current_lat' => $lat,
                'current_lng' => $lng,
            ]);
        } catch (\Exception $e) {
            Log::error("MySQL location update failed: {$e->getMessage()}");
        }
    }

    /**
     * Get nearby providers using MySQL Haversine formula instead of Redis GEO.
     *
     * @return array<array{provider_id: int, user_id: int, distance_km: float}>
     */
    public function getNearbyProviders(float $lat, float $lng, float $radiusKm = 10.0): array
    {
        try {
            // Standard Haversine formula for MySQL
            $haversine = "(6371 * acos(cos(radians(?)) * cos(radians(current_lat)) * cos(radians(current_lng) - radians(?)) + sin(radians(?)) * sin(radians(current_lat))))";

            $results = ProviderProfile::select('id', 'user_id', DB::raw("{$haversine} AS distance_km"))
                ->having('distance_km', '<=', $radiusKm)
                ->whereNotNull('current_lat')
                ->whereNotNull('current_lng')
                ->orderBy('distance_km', 'asc')
                ->limit(100)
                ->setBindings([$lat, $lng, $lat])
                ->get();

            $providers = [];
            foreach ($results as $item) {
                $providers[] = [
                    'provider_id' => (int) $item->id,
                    'user_id'     => (int) $item->user_id,
                    'distance_km' => (float) $item->distance_km,
                ];
            }
            return $providers;
        } catch (\Exception $e) {
            Log::error("MySQL nearby providers failed: {$e->getMessage()}");
            return [];
        }
    }

    // ─── Call Lock (prevent duplicate calls) ─────────────────────────────────

    /**
     * Acquire a call lock for a booking. Returns true if lock acquired.
     */
    public function lockCall(int $bookingId): bool
    {
        $key = self::CALL_LOCK_PREFIX . $bookingId;
        // Cache::add acts exactly like SET NX
        return Cache::add($key, '1', 300);
    }

    public function releaseCallLock(int $bookingId): void
    {
        Cache::forget(self::CALL_LOCK_PREFIX . $bookingId);
    }

    // ─── JWT Blacklist ────────────────────────────────────────────────────────

    public function blacklistToken(string $jti, int $ttlSeconds): void
    {
        Cache::put(self::BLACKLIST_PREFIX . $jti, '1', $ttlSeconds);
    }

    public function isTokenBlacklisted(string $jti): bool
    {
        return Cache::has(self::BLACKLIST_PREFIX . $jti);
    }

    // ─── Pending Signup Storage ───────────────────────────────────────────────

    public function storePendingSignup(string $phone, array $data, int $ttl = 300): void
    {
        Cache::put("pending_signup:{$phone}", $data, $ttl);
    }

    public function getPendingSignup(string $phone): ?array
    {
        return Cache::get("pending_signup:{$phone}");
    }

    public function deletePendingSignup(string $phone): void
    {
        Cache::forget("pending_signup:{$phone}");
    }

    // ─── Signup OTP Verified Flag ─────────────────────────────────────────────
    // Set AFTER OTP is verified, cleared AFTER user is created in DB.
    // Prevents user from being saved to DB until role is selected.

    public function markSignupVerified(string $phone, int $ttl = 600): void
    {
        Cache::put("signup_verified:{$phone}", true, $ttl);
    }

    public function isSignupVerified(string $phone): bool
    {
        return (bool) Cache::get("signup_verified:{$phone}");
    }

    public function clearSignupVerified(string $phone): void
    {
        Cache::forget("signup_verified:{$phone}");
    }
}
