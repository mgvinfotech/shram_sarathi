<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsService
{
    private string $apiUrl;
    private string $user;
    private string $password;
    private string $senderId;
    private string $channel;
    private string $route;
    private string $dcs;
    private string $flash;
    private ?string $dltTeId;
    private ?string $dltPeId;
    private string $template;
    private bool $enabled;

    public function __construct()
    {
        $config = config('services.msg24', []);

        $this->apiUrl   = $config['url'] ?? env('SMS_GATEWAY_URL', 'http://mysms.msg24.in/api/mt/SendSMS');
        $this->user     = $config['user'] ?? env('SMS_USER', '');
        $this->password = $config['password'] ?? env('SMS_PASSWORD', '');
        $this->senderId = $config['sender_id'] ?? env('SMS_SENDER_ID', '');
        $this->channel  = $config['channel'] ?? env('SMS_CHANNEL', 'trans');
        $this->route    = (string) ($config['route'] ?? env('SMS_ROUTE', '29'));
        $this->dcs      = (string) ($config['dcs'] ?? env('SMS_DCS', '0'));
        $this->flash    = (string) ($config['flash'] ?? env('SMS_FLASH', '0'));
        $this->dltTeId  = $config['dlt_te_id'] ?? env('SMS_DLT_TE_ID');
        $this->dltPeId  = $config['dlt_pe_id'] ?? env('SMS_DLT_PE_ID');
        $this->enabled  = (bool) ($config['enabled'] ?? env('SMS_ENABLED', false));

        // Exact DLT approved template format:
        // "Shram Sarathi Network: Your verification OTP is {#num#}. This OTP is valid for {#num#} minutes. Please do not share it with anyone."
        $this->template = $config['template'] ?? env(
            'SMS_OTP_TEMPLATE',
            'Shram Sarathi Network: Your verification OTP is {otp}. This OTP is valid for {expire} minutes. Please do not share it with anyone.'
        );
    }

    /**
     * Check if SMS Gateway sending is enabled.
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Format a phone number to Indian 12-digit format (91XXXXXXXXXX) expected by the gateway.
     */
    public function formatPhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // If 12 digits starting with 91, keep it
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            return $digits;
        }

        // If 10 digits standard Indian mobile
        if (strlen($digits) === 10) {
            return '91' . $digits;
        }

        // If 11 digits starting with 0
        if (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            return '91' . substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Build the message text matching the approved DLT template strictly.
     */
    public function buildOtpMessage(string $otp, int $expireMinutes = 5): string
    {
        return str_replace(
            ['{otp}', '{expire}'],
            [$otp, (string) $expireMinutes],
            $this->template
        );
    }

    /**
     * Send OTP SMS to recipient.
     *
     * @param string $phone
     * @param string $otp
     * @param int $expireMinutes
     * @return bool
     */
    public function sendOtp(string $phone, string $otp, int $expireMinutes = 5): bool
    {
        $message = $this->buildOtpMessage($otp, $expireMinutes);
        $result = $this->sendRawSms($phone, $message);

        return $result['success'];
    }

    /**
     * Send raw SMS via Msg24 Gateway API.
     *
     * @param string $phone
     * @param string $message
     * @return array{success: bool, response: mixed, error: ?string}
     */
    public function sendRawSms(string $phone, string $message): array
    {
        $formattedPhone = $this->formatPhone($phone);
        $maskedPhone = substr($formattedPhone, 0, 4) . '******' . substr($formattedPhone, -2);

        if (!$this->enabled) {
            Log::info("[SMS Gateway] Sending skipped (SMS_ENABLED is false) for {$maskedPhone}: {$message}");
            return [
                'success'  => true,
                'response' => ['status' => 'skipped_mock_mode'],
                'error'    => null,
            ];
        }

        if (empty($this->user) || empty($this->password)) {
            $msg = 'SMS_USER or SMS_PASSWORD is not set in environment (.env)';
            Log::error("[SMS Gateway] Configuration Error: {$msg}");
            return [
                'success'  => false,
                'response' => null,
                'error'    => $msg,
            ];
        }

        $params = [
            'user'     => $this->user,
            'password' => $this->password,
            'senderid' => $this->senderId,
            'channel'  => $this->channel,
            'DCS'      => $this->dcs,
            'flashsms' => $this->flash,
            'number'   => $formattedPhone,
            'text'     => $message,
            'route'    => $this->route,
        ];

        // Include DLT IDs if provided
        if (!empty($this->dltTeId)) {
            $params['DLTTemplateId'] = $this->dltTeId;
            $params['templateid']    = $this->dltTeId;
        }
        if (!empty($this->dltPeId)) {
            $params['PEID']   = $this->dltPeId;
            $params['entityid'] = $this->dltPeId;
        }

        try {
            $queryString = http_build_query($params);
            $fullUrl = $this->apiUrl . (str_contains($this->apiUrl, '?') ? '&' : '?') . $queryString;

            // Msg24 API requires HTTP GET with full query parameters
            $response = Http::timeout(12)
                ->retry(2, 500)
                ->get($fullUrl);

            $body = $response->body();
            $json = $response->json();

            if ($response->successful()) {
                // Check if the response JSON contains error codes
                $isError = false;
                $errorMessage = null;

                if (is_array($json)) {
                    if (isset($json['ErrorCode']) && $json['ErrorCode'] !== '000' && $json['ErrorCode'] !== '0') {
                        $isError = true;
                        $errorMessage = $json['ErrorMessage'] ?? 'Gateway returned error code ' . $json['ErrorCode'];
                    } elseif (isset($json['status']) && strtolower($json['status']) === 'error') {
                        $isError = true;
                        $errorMessage = $json['message'] ?? 'SMS dispatch error';
                    }
                }

                if ($isError) {
                    Log::error("[SMS Gateway] Delivery failed for {$maskedPhone}: {$errorMessage} | Raw: {$body}");
                    return [
                        'success'  => false,
                        'response' => $json ?? $body,
                        'error'    => $errorMessage,
                    ];
                }

                Log::info("[SMS Gateway] SMS dispatched successfully to {$maskedPhone} | Response: {$body}");
                return [
                    'success'  => true,
                    'response' => $json ?? $body,
                    'error'    => null,
                ];
            }

            Log::error("[SMS Gateway] HTTP {$response->status()} error for {$maskedPhone}: {$body}");
            return [
                'success'  => false,
                'response' => $body,
                'error'    => "HTTP {$response->status()}",
            ];

        } catch (\Throwable $e) {
            Log::error("[SMS Gateway] Exception sending SMS to {$maskedPhone}: {$e->getMessage()}");
            return [
                'success'  => false,
                'response' => null,
                'error'    => $e->getMessage(),
            ];
        }
    }
}
