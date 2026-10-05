<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class OtpService
{
    private const DEV_OTP = '123456';
    private const OTP_PREFIX = 'otp:';
    private int $ttlSeconds;
    private SmsService $smsService;

    public function __construct(?SmsService $smsService = null)
    {
        $this->ttlSeconds = (int) env('OTP_EXPIRE_MINUTES', 5) * 60;
        $this->smsService = $smsService ?? app(SmsService::class);
    }

    public function isDevMode(): bool
    {
        return in_array(env('ENVIRONMENT', 'development'), ['development', 'dev', 'local']);
    }

    public function isSmsEnabled(): bool
    {
        return $this->smsService->isEnabled();
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
     * Generate OTP, store in Cache, and send via Msg24 SMS Gateway.
     * Returns the OTP only for internal use — never expose to API caller.
     */
    public function sendOtp(string $phone): string
    {
        $shouldSendSms = $this->isSmsEnabled() || !$this->isDevMode();

        // If SMS sending is enabled or in production, generate real random OTP
        $otp = $shouldSendSms ? $this->generate() : self::DEV_OTP;
        $this->store($phone, $otp);

        $maskedPhone = substr($phone, 0, 2) . '******' . substr($phone, -2);
        $expireMinutes = (int) env('OTP_EXPIRE_MINUTES', 5);

        if ($shouldSendSms) {
            $sent = $this->smsService->sendOtp($phone, $otp, $expireMinutes);
            if ($sent) {
                Log::info("OTP sent via Msg24 SMS gateway to {$maskedPhone}");
            } else {
                Log::warning("Failed to send OTP via SMS gateway to {$maskedPhone}");
            }

            if ($this->isDevMode()) {
                Log::info("[DEV OTP] Generated: {$otp} for phone: {$maskedPhone}");
            }
        } else {
            Log::info("[DEV] Mock OTP stored for phone: {$maskedPhone} -> {$otp}");
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

