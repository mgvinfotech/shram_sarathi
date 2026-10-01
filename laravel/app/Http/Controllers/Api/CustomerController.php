<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Services\RedisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function __construct(private RedisService $redis) {}

    // ─── GET /api/customer/search-nearby ─────────────────────────────────────

    public function searchNearby(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat'          => 'required|numeric',
            'lng'          => 'required|numeric',
            'category'     => 'sometimes|nullable|string',
            'skill'        => 'sometimes|nullable|string',   // sub-category slug filter
            'radius_km'    => 'sometimes|numeric|max:50',
            'district'     => 'sometimes|nullable|string',
            'state'        => 'sometimes|nullable|string',
        ]);

        $lat      = (float) $data['lat'];
        $lng      = (float) $data['lng'];
        $category = $data['category'] ?? null;
        $skill    = $data['skill'] ?? null;
        $radius   = (float) ($data['radius_km'] ?? 10.0);
        $district = $data['district'] ?? null;
        $state    = $data['state'] ?? null;

        $query = ProviderProfile::with(['user', 'workingLocations'])
            ->where('is_online', true)
            ->whereHas('user', fn($q) => $q->where('is_active', true)->where('is_blacklisted', false));

        if ($category) {
            $query->where('category', $category);
        }
        if ($skill) {
            $query->whereJsonContains('sub_categories', $skill);
        }

        // Calculate distance using Haversine formula
        $haversine = "(6371 * acos(cos(radians(?)) * cos(radians(current_lat)) * cos(radians(current_lng) - radians(?)) + sin(radians(?)) * sin(radians(current_lat))))";
        $query->select('*', DB::raw("CASE WHEN current_lat IS NOT NULL AND current_lng IS NOT NULL THEN {$haversine} ELSE 0.0 END as distance_km"));
        $query->addBinding([$lat, $lng, $lat], 'select');

        // Filter: match within radius (if GPS is set) OR match registered district/state
        $query->where(function ($q) use ($lat, $lng, $radius, $district, $state, $haversine) {
            $q->where(function ($sub) use ($lat, $lng, $radius, $haversine) {
                $sub->whereNotNull('current_lat')
                    ->whereNotNull('current_lng')
                    ->whereRaw("{$haversine} <= ?", [$lat, $lng, $lat, $radius]);
            });

            if ($district) {
                $q->orWhereHas('workingLocations', function ($wl) use ($district, $state) {
                    $wl->where('district', $district);
                    if ($state) {
                        $wl->where('state', $state);
                    }
                });
            }
        });

        $profiles = $query->get();
        $providers = [];

        foreach ($profiles as $profile) {
            $user = $profile->user;
            $providers[] = [
                'provider_id'        => $profile->id,
                'user_id'            => $user->id,
                'name'               => $user->name,
                'phone'              => $user->phone,
                'category'           => $profile->category,
                'sub_categories'     => $profile->sub_categories ?? [],
                'skills_description' => $profile->skills_description,
                'distance_km'        => round((float) ($profile->distance_km ?? 0.0), 2),
                'rating'             => $profile->rating,
                'total_bookings'     => $profile->total_bookings,
                'photo_url'          => $profile->photo_url,
                'is_online'          => $profile->is_online,
            ];
        }

        // Sort by distance
        usort($providers, fn($a, $b) => $a['distance_km'] <=> $b['distance_km']);

        return response()->json($providers);
    }

    // ─── GET /api/customer/bookings ───────────────────────────────────────────

    public function bookings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page'      => 'sometimes|integer|min:1',
            'page_size' => 'sometimes|integer|max:50',
        ]);

        $page     = (int) ($data['page'] ?? 1);
        $pageSize = (int) ($data['page_size'] ?? 10);
        $user     = $request->user();

        $bookings = Booking::where('customer_id', $user->id)
            ->orderByDesc('created_at')
            ->offset(($page - 1) * $pageSize)
            ->limit($pageSize)
            ->get(['id', 'provider_id', 'category', 'status', 'created_at']);

        return response()->json([
            'bookings'  => $bookings,
            'page'      => $page,
            'page_size' => $pageSize,
        ]);
    }
}
