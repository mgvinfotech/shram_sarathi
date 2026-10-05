<?php

namespace App\Console\Commands;

use App\Services\SmsService;
use Illuminate\Console\Command;

class SendTestSms extends Command
{
    protected $signature = 'sms:send {phone : Mobile number to send test SMS to} {--otp= : Optional custom OTP code}';

    protected $description = 'Send a test OTP SMS via Msg24 SMS gateway';

    public function handle(SmsService $smsService): int
    {
        $phone = $this->argument('phone');
        $otp = $this->option('otp') ?: str_pad((string) random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expireMinutes = (int) env('OTP_EXPIRE_MINUTES', 5);

        $this->info("--------------------------------------------------");
        $this->info("        Shram Sarathi Msg24 SMS Gateway Tester   ");
        $this->info("--------------------------------------------------");
        $this->line("Target Phone     : {$phone}");
        $this->line("Formatted Phone  : " . $smsService->formatPhone($phone));
        $this->line("Generated OTP    : {$otp}");
        $this->line("Validity Minutes : {$expireMinutes}");
        $this->line("DLT Template     : " . $smsService->buildOtpMessage($otp, $expireMinutes));
        $this->line("Gateway Enabled  : " . ($smsService->isEnabled() ? 'YES' : 'NO (Skipped / Mock mode)'));
        $this->newLine();

        $this->comment("Dispatching SMS request to Msg24...");

        $message = $smsService->buildOtpMessage($otp, $expireMinutes);
        $result = $smsService->sendRawSms($phone, $message);

        if ($result['success']) {
            $this->info("✅ SMS Dispatched Successfully!");
            $this->line("Response: " . json_encode($result['response'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return self::SUCCESS;
        }

        $this->error("❌ SMS Dispatch Failed!");
        $this->error("Error: " . ($result['error'] ?? 'Unknown error'));
        if (!empty($result['response'])) {
            $this->line("Raw Response: " . json_encode($result['response'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }

        return self::FAILURE;
    }
}
