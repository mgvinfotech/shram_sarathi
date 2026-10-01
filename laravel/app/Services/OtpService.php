<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class OtpService
{
    private const DEV_OTP = '123456';
    private const OTP_PREFIX = 'otp:';
    private int $ttlSeconds;

    public function __construct()
    {
        $this->ttlSeconds = (int) env('OTP_EXPIRE_MINUTES', 5) * 60;
    }

    public function isDevMode(): bool
    {
        return in_array(env('ENVIRONMENT', 'development'), ['development', 'dev', 'local']);
    }

    public function generate(): string
    {
        return str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
    }

    public function store(string $phone, string $otp): void
    {
        Cache::put(self::OTP_PREFIX . $phone, $otp, $this->ttlSeconds);
    }

    public function get(string $phone): ?string
    {
        return Cache::get(self::OTP_PREFIX . $phone);
    }

    public function delete(string $phone): void
    {
        Cache::forget(self::OTP_PREFIX . $phone);
    }

    /**
     * Generate OTP, store in Redis, and log it (dev mode only).
     * Returns the OTP only for internal use — never expose to API caller.
     */
    public function sendOtp(string $phone): string
    {
        $otp = $this->isDevMode() ? self::DEV_OTP : $this->generate();
        $this->store($phone, $otp);

        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        if ($this->isDevMode()) {
            Log::info("[DEV] OTP stored for phone: {$maskedPhone}");
        } else {
            // TODO: integrate SMS gateway (MSG91 / Twilio) here
            Log::info("OTP sent via SMS to {$maskedPhone}");
        }

        return $otp;
    }

    /**
     * Verify OTP for a phone number. Returns true if valid.
     */
    public function verify(string $phone, string $otp): bool
    {
        $stored = $this->get($phone);
        return $stored !== null && $stored === $otp;
    }
}
