<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;

class ExotelService
{
    private Client $http;
    private string $sid;
    private string $token;
    private string $virtualNumber;
    private string $subdomain;
    private string $appUrl;

    public function __construct()
    {
        $this->sid           = env('EXOTEL_SID', '');
        $this->token         = env('EXOTEL_TOKEN', '');
        $this->virtualNumber = env('EXOTEL_VIRTUAL_NUMBER', '');
        $this->subdomain     = env('EXOTEL_SUBDOMAIN', 'api.exotel.com');
        $this->appUrl        = env('APP_URL', 'http://localhost:8000');

        $this->http = new Client([
            'base_uri' => "https://{$this->subdomain}/v1/Accounts/{$this->sid}/",
            'auth'     => [$this->sid, $this->token],
            'timeout'  => 30,
        ]);
    }

    /**
     * Initiate a masked call between customer and provider via Exotel.
     */
    public function initiateMaskedCall(string $customerPhone, string $providerPhone, int $bookingId): array
    {
        try {
            $response = $this->http->post('Calls/connect.json', [
                'form_params' => [
                    'From'        => $this->formatPhone($customerPhone),
                    'To'          => $this->formatPhone($providerPhone),
                    'CallerId'    => $this->virtualNumber,
                    'StatusCallback' => "{$this->appUrl}/api/call/status-webhook",
                    'CustomField' => (string) $bookingId,
                ],
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return ['call_sid' => $data['Call']['Sid'] ?? null];
        } catch (RequestException $e) {
            Log::error("Exotel masked call failed: {$e->getMessage()}");
            throw new \RuntimeException('Failed to initiate call: ' . $e->getMessage());
        }
    }

    /**
     * Initiate an IVR call to provider after customer call ends.
     * Provider presses 1 to confirm, 2 to reject.
     */
    public function initiateIvrCall(string $providerPhone, int $bookingId): array
    {
        try {
            $ivrUrl = "{$this->appUrl}/api/call/dtmf-webhook";

            $response = $this->http->post('Calls/connect.json', [
                'form_params' => [
                    'From'        => $this->formatPhone($providerPhone),
                    'To'          => $this->formatPhone($providerPhone),
                    'CallerId'    => $this->virtualNumber,
                    'Url'         => "http://my.exotel.com/exoml/start_voice/ivr_booking",
                    'StatusCallback' => $ivrUrl,
                    'CustomField' => (string) $bookingId,
                ],
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return ['ivr_call_sid' => $data['Call']['Sid'] ?? null];
        } catch (RequestException $e) {
            Log::error("Exotel IVR call failed: {$e->getMessage()}");
            throw new \RuntimeException('Failed to initiate IVR call: ' . $e->getMessage());
        }
    }

    /**
     * Send a TTS (Text-to-Speech) call using AWS Polly audio.
     */
    public function sendTtsCall(string $phone, string $message, int $rewardId): array
    {
        try {
            $audioUrl = "{$this->appUrl}/api/admin/rewards/{$rewardId}/audio";

            $response = $this->http->post('Calls/connect.json', [
                'form_params' => [
                    'From'     => $this->formatPhone($phone),
                    'To'       => $this->formatPhone($phone),
                    'CallerId' => $this->virtualNumber,
                    'Url'      => $audioUrl,
                ],
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            return ['call_sid' => $data['Call']['Sid'] ?? null];
        } catch (RequestException $e) {
            Log::error("Exotel TTS call failed: {$e->getMessage()}");
            throw new \RuntimeException('Failed to send TTS call: ' . $e->getMessage());
        }
    }

    /**
     * Send bulk broadcast (SMS or voice) to multiple phones.
     */
    public function sendBulkBroadcast(array $phones, string $message, string $type = 'sms'): array
    {
        $success = 0;
        $failed  = 0;

        foreach ($phones as $phone) {
            try {
                if ($type === 'sms') {
                    $this->sendSms($phone, $message);
                } else {
                    // Voice broadcast via TTS
                    $this->http->post('Calls/connect.json', [
                        'form_params' => [
                            'From'     => $this->formatPhone($phone),
                            'To'       => $this->formatPhone($phone),
                            'CallerId' => $this->virtualNumber,
                        ],
                    ]);
                }
                $success++;
            } catch (\Exception $e) {
                Log::warning("Broadcast failed for {$phone}: {$e->getMessage()}");
                $failed++;
            }
        }

        return ['success' => $success, 'failed' => $failed, 'total' => count($phones)];
    }

    /**
     * Send an SMS via Exotel.
     */
    public function sendSms(string $phone, string $message): void
    {
        try {
            $this->http->post('SMS/send.json', [
                'form_params' => [
                    'From'   => $this->virtualNumber,
                    'To'     => $this->formatPhone($phone),
                    'Body'   => $message,
                ],
            ]);
        } catch (RequestException $e) {
            Log::error("Exotel SMS failed to {$phone}: {$e->getMessage()}");
            throw new \RuntimeException('SMS failed: ' . $e->getMessage());
        }
    }

    private function formatPhone(string $phone): string
    {
        // Ensure +91 prefix for Indian numbers
        $phone = preg_replace('/\D/', '', $phone);
        if (strlen($phone) === 10) {
            return '+91' . $phone;
        }
        if (strlen($phone) === 12 && str_starts_with($phone, '91')) {
            return '+' . $phone;
        }
        return $phone;
    }
}
