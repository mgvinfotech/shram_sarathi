<?php

namespace App\Services;

use App\Models\NotificationHistory;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * FcmService — Firebase Cloud Messaging (FCM v1 API) push notification sender.
 *
 * Setup:
 *  1. Firebase Console → Project Settings → Service Accounts → "Generate new private key"
 *  2. Downloaded JSON file ko storage/app/firebase-credentials.json mein save karo
 *  3. .env mein FCM_CREDENTIALS_PATH aur FCM_PROJECT_ID set karo
 *
 * Note: FCM v1 API use ho rahi hai (Legacy API June 2024 mein band ho gayi).
 * Auth: Service Account → JWT → Google OAuth2 Access Token → FCM v1 Bearer Token
 */
class FcmService
{
    private const GOOGLE_AUTH_URL  = 'https://oauth2.googleapis.com/token';
    private const FCM_SCOPE        = 'https://www.googleapis.com/auth/firebase.messaging';
    private const TOKEN_CACHE_KEY  = 'fcm_oauth2_access_token';
    private const TOKEN_CACHE_TTL  = 55 * 60; // 55 minutes (Google token 60 min valid hota hai)

    // ─── Send to a single user by user_id ────────────────────────────────────

    /**
     * Push notification bhejo ek user ko.
     *
     * @param int    $userId   Target user ka ID
     * @param string $title    Notification title
     * @param string $body     Notification body (message)
     * @param string $type     Notification type (new_request, accepted, rejected, etc.)
     * @param array  $data     Extra key-value data (booking_id, screen to open, etc.)
     * @param int|null $bookingId  Related booking ID (optional)
     * @param string|null $bookingModel  'transport_bookings' | 'bookings' (optional)
     */
    public function sendToUser(
        int $userId,
        string $title,
        string $body,
        string $type = 'general',
        array $data = [],
        ?int $bookingId = null,
        ?string $bookingModel = null
    ): bool {
        // Always save to notification history (regardless of FCM setup)
        $this->saveHistory($userId, $title, $body, $type, $bookingId, $bookingModel, $data);

        $credentialsPath = base_path(config('fcm.credentials_path', ''));

        if (empty($credentialsPath) || !file_exists($credentialsPath)) {
            Log::info("[FCM] Service account credentials not found at: {$credentialsPath}. Notification saved to history only. User: {$userId}");
            return true;
        }

        $user = User::find($userId);
        if (!$user || empty($user->fcm_token)) {
            Log::info("[FCM] No FCM token for user {$userId}. Notification saved to history only.");
            return true;
        }

        return $this->sendRaw($user->fcm_token, $title, $body, $type, $data, $bookingId, $bookingModel);
    }

    // ─── Send to multiple users ───────────────────────────────────────────────

    /**
     * Multiple users ko notification bhejo.
     *
     * @param array<int> $userIds  Array of user IDs
     */
    public function sendToUsers(
        array $userIds,
        string $title,
        string $body,
        string $type = 'general',
        array $data = [],
        ?int $bookingId = null,
        ?string $bookingModel = null
    ): void {
        foreach ($userIds as $userId) {
            $this->sendToUser($userId, $title, $body, $type, $data, $bookingId, $bookingModel);
        }
    }

    // ─── Private: Get OAuth2 Access Token (with caching) ─────────────────────

    private function getAccessToken(): ?string
    {
        // Cache se token lo (55 min valid rehta hai)
        if (Cache::has(self::TOKEN_CACHE_KEY)) {
            return Cache::get(self::TOKEN_CACHE_KEY);
        }

        $credentialsPath = base_path(config('fcm.credentials_path', ''));

        if (empty(config('fcm.credentials_path')) || !is_file($credentialsPath)) {
            Log::error('[FCM] Firebase credentials file not found at: ' . $credentialsPath . '. Please check FCM_CREDENTIALS_PATH in .env');
            return null;
        }

        $credentials = json_decode(file_get_contents($credentialsPath), true);

        if (!$credentials || empty($credentials['private_key'])) {
            Log::error('[FCM] Invalid service account credentials JSON.');
            return null;
        }

        $now     = time();
        $payload = [
            'iss'   => $credentials['client_email'],
            'scope' => self::FCM_SCOPE,
            'aud'   => self::GOOGLE_AUTH_URL,
            'iat'   => $now,
            'exp'   => $now + 3600,
        ];

        try {
            // JWT banao service account private key se
            $jwt = JWT::encode($payload, $credentials['private_key'], 'RS256');

            // Google OAuth2 se Bearer Token lo
            $response = Http::asForm()->post(self::GOOGLE_AUTH_URL, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            if (!$response->successful()) {
                Log::error('[FCM] Failed to get OAuth2 access token: ' . $response->body());
                return null;
            }

            $accessToken = $response->json('access_token');
            Cache::put(self::TOKEN_CACHE_KEY, $accessToken, self::TOKEN_CACHE_TTL);

            Log::info('[FCM] OAuth2 access token obtained and cached.');
            return $accessToken;

        } catch (\Throwable $e) {
            Log::error('[FCM] JWT/OAuth2 error: ' . $e->getMessage());
            return null;
        }
    }

    // ─── Private: Raw FCM v1 HTTP call ───────────────────────────────────────

    private function sendRaw(
        string $fcmToken,
        string $title,
        string $body,
        string $type,
        array $data,
        ?int $bookingId,
        ?string $bookingModel
    ): bool {
        $accessToken = $this->getAccessToken();
        if (!$accessToken) {
            Log::error('[FCM] Cannot send notification: no access token available.');
            return false;
        }

        $projectId = config('fcm.project_id');
        $endpoint  = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        // FCM v1 payload format (legacy se alag hai)
        $payload = [
            'message' => [
                'token'        => $fcmToken,
                'notification' => [
                    'title' => $title,
                    'body'  => $body,
                ],
                'data' => array_map('strval', array_merge($data, [
                    'type'          => $type,
                    'booking_id'    => $bookingId ? (string) $bookingId : '',
                    'booking_model' => $bookingModel ?? '',
                    'title'         => $title,
                    'body'          => $body,
                ])),
                'android' => [
                    'priority' => 'high',
                    'notification' => [
                        'sound'              => 'default',
                        'notification_count' => 1,
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'alert' => ['title' => $title, 'body' => $body],
                            'sound' => 'default',
                            'badge' => 1,
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response     = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type'  => 'application/json',
                ])
                ->post($endpoint, $payload);

            $responseData = $response->json();

            if (!$response->successful()) {
                $errorCode = $responseData['error']['details'][0]['errorCode'] ?? $responseData['error']['message'] ?? 'Unknown';
                Log::warning("[FCM] Notification failed. Token: " . substr($fcmToken, 0, 20) . "... Error: {$errorCode}");

                // Invalid token → remove kar do aur cached OAuth token bhi reset
                if (in_array($errorCode, ['UNREGISTERED', 'INVALID_ARGUMENT'])) {
                    User::where('fcm_token', $fcmToken)->update(['fcm_token' => null]);
                    Log::info('[FCM] Removed invalid FCM token.');
                }

                // Auth error → cached token invalidate karo (next call pe fresh token milega)
                if ($errorCode === 'UNAUTHENTICATED' || $response->status() === 401) {
                    Cache::forget(self::TOKEN_CACHE_KEY);
                    Log::info('[FCM] OAuth2 token invalidated from cache due to 401.');
                }

                return false;
            }

            Log::info("[FCM] Notification sent successfully. MessageId: " . ($responseData['name'] ?? 'N/A'));
            return true;

        } catch (\Throwable $e) {
            Log::error('[FCM] HTTP request failed: ' . $e->getMessage());
            return false;
        }
    }

    // ─── Private: Save notification to DB history ─────────────────────────────

    private function saveHistory(
        int $userId,
        string $title,
        string $body,
        string $type,
        ?int $bookingId,
        ?string $bookingModel,
        array $data
    ): void {
        try {
            NotificationHistory::create([
                'user_id'       => $userId,
                'title'         => $title,
                'body'          => $body,
                'type'          => $type,
                'booking_id'    => $bookingId,
                'booking_model' => $bookingModel,
                'data'          => empty($data) ? null : $data,
            ]);
        } catch (\Throwable $e) {
            Log::error('[FCM] Failed to save notification history: ' . $e->getMessage());
        }
    }
}
