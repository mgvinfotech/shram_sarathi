<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationHistory;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * NotificationController — FCM token management + notification history APIs.
 */
class NotificationController extends Controller
{
    // ─── PUT /api/user/fcm-token ──────────────────────────────────────────────
    // Mobile app FCM token save/update karo (login ke baad call karo).

    public function saveFcmToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fcm_token' => 'required|string|max:500',
        ]);

        $user = $request->user();
        $user->fcm_token = $data['fcm_token'];
        $user->save();

        Log::info("[FCM] Token saved for user #{$user->id} (role: {$user->role})");

        return response()->json(['message' => 'FCM token saved successfully']);
    }

    // ─── GET /api/notifications ───────────────────────────────────────────────
    // User ki notification history fetch karo (latest first, paginated).

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = NotificationHistory::forUser($user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get([
                'id', 'title', 'body', 'type', 'booking_id',
                'booking_model', 'data', 'read_at', 'created_at',
            ]);

        $unreadCount = NotificationHistory::forUser($user->id)->unread()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    // ─── PUT /api/notifications/{id}/read ─────────────────────────────────────
    // Single notification mark as read.

    public function markRead(Request $request, int $id): JsonResponse
    {
        $user         = $request->user();
        $notification = NotificationHistory::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$notification) {
            return response()->json(['detail' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        return response()->json(['message' => 'Marked as read']);
    }

    // ─── PUT /api/notifications/mark-all-read ────────────────────────────────
    // Saari notifications ek saath read mark karo.

    public function markAllRead(Request $request): JsonResponse
    {
        $user = $request->user();

        NotificationHistory::forUser($user->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    // ─── DELETE /api/notifications ────────────────────────────────────────────
    // Notification history clear karo.

    public function clearAll(Request $request): JsonResponse
    {
        $user = $request->user();

        NotificationHistory::forUser($user->id)->delete();

        return response()->json(['message' => 'Notification history cleared']);
    }

    // ─── GET /api/admin/settings/notification-timeout ────────────────────────
    // Admin: notification timeout (seconds) fetch karo.

    public function getTimeout(Request $request): JsonResponse
    {
        $timeout = $this->getNotificationTimeout();
        return response()->json([
            'timeout_seconds' => $timeout,
            'source'          => 'settings',
        ]);
    }

    // ─── PUT /api/admin/settings/notification-timeout ────────────────────────
    // Admin: notification timeout (seconds) update karo.

    public function updateTimeout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'timeout_seconds' => 'required|integer|min:10|max:120',
        ]);

        $user = $request->user();
        if (!in_array($user->role, ['admin', 'sub_admin'])) {
            return response()->json(['detail' => 'Unauthorized'], 403);
        }

        // Update in settings table if exists, else use env-based fallback
        try {
            $setting = Setting::first();
            if ($setting) {
                $setting->notification_timeout_seconds = $data['timeout_seconds'];
                $setting->save();
            }
        } catch (\Throwable $e) {
            Log::warning('[FCM] Could not save timeout to settings: ' . $e->getMessage());
        }

        return response()->json([
            'message'         => 'Notification timeout updated successfully',
            'timeout_seconds' => $data['timeout_seconds'],
        ]);
    }

    // ─── Helper: Get configured timeout ──────────────────────────────────────

    public static function getNotificationTimeout(): int
    {
        try {
            $setting = Setting::first();
            if ($setting && isset($setting->notification_timeout_seconds)) {
                return (int) $setting->notification_timeout_seconds;
            }
        } catch (\Throwable) {
            // fallback
        }

        return (int) config('fcm.request_timeout_seconds', 30);
    }
}
