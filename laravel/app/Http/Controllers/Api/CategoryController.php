<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SubCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    private const DEFAULT_CATEGORIES = [
        ['name' => 'Majdoor',       'name_hindi' => 'मजदूर',                    'slug' => 'majdoor',       'sort_order' => 1],
        ['name' => 'Karigar',       'name_hindi' => 'कारीगर',                   'slug' => 'karigar',       'sort_order' => 2],
        ['name' => 'Thekedar',      'name_hindi' => 'ठेकेदार',                  'slug' => 'thekedar',      'sort_order' => 3],
        ['name' => 'Krishi Yantra', 'name_hindi' => 'कृषि यंत्र',              'slug' => 'krishi_yantra', 'sort_order' => 4],
        ['name' => 'Nirman Machine','name_hindi' => 'निर्माण मशीनें',           'slug' => 'nirman_machine','sort_order' => 5],
        ['name' => 'Taxi',          'name_hindi' => 'टैक्सी',                   'slug' => 'taxi',          'sort_order' => 6],
        ['name' => 'Transport',     'name_hindi' => 'ट्रांसपोर्ट',             'slug' => 'transport',     'sort_order' => 7],
    ];

    // Sub-categories for each category slug
    private const DEFAULT_SUB_CATEGORIES = [
        'majdoor' => [
            ['name' => 'General Labor',    'name_hindi' => 'सामान्य मजदूर',      'slug' => 'general_labor'],
            ['name' => 'Construction',     'name_hindi' => 'निर्माण मजदूर',      'slug' => 'construction'],
            ['name' => 'Agriculture',      'name_hindi' => 'खेती मजदूर',         'slug' => 'agriculture'],
            ['name' => 'Loading/Unloading','name_hindi' => 'लोडिंग/अनलोडिंग',   'slug' => 'loading_unloading'],
            ['name' => 'Digging',          'name_hindi' => 'खुदाई',              'slug' => 'digging'],
            ['name' => 'Cleaning',         'name_hindi' => 'सफाई',               'slug' => 'cleaning'],
        ],
        'karigar' => [
            ['name' => 'Plumber',          'name_hindi' => 'प्लंबर',             'slug' => 'plumber'],
            ['name' => 'Electrician',      'name_hindi' => 'इलेक्ट्रीशियन',     'slug' => 'electrician'],
            ['name' => 'Painter',          'name_hindi' => 'पेंटर',              'slug' => 'painter'],
            ['name' => 'Carpenter',        'name_hindi' => 'बढ़ई',               'slug' => 'carpenter'],
            ['name' => 'Mason',            'name_hindi' => 'राजमिस्त्री',        'slug' => 'mason'],
            ['name' => 'Welder',           'name_hindi' => 'वेल्डर',             'slug' => 'welder'],
            ['name' => 'AC Mechanic',      'name_hindi' => 'AC मैकेनिक',         'slug' => 'ac_mechanic'],
            ['name' => 'Tile Work',        'name_hindi' => 'टाइल काम',           'slug' => 'tile_work'],
        ],
        'thekedar' => [
            ['name' => 'Building Contractor',  'name_hindi' => 'भवन ठेकेदार',    'slug' => 'building_contractor'],
            ['name' => 'Road Contractor',      'name_hindi' => 'सड़क ठेकेदार',   'slug' => 'road_contractor'],
            ['name' => 'Labor Contractor',     'name_hindi' => 'मजदूर ठेकेदार',  'slug' => 'labor_contractor'],
            ['name' => 'Painting Contractor',  'name_hindi' => 'पेंटिंग ठेकेदार','slug' => 'painting_contractor'],
        ],
        'krishi_yantra' => [
            ['name' => 'Tractor',          'name_hindi' => 'ट्रैक्टर',           'slug' => 'tractor'],
            ['name' => 'Harvester',        'name_hindi' => 'हार्वेस्टर',         'slug' => 'harvester'],
            ['name' => 'Rotavator',        'name_hindi' => 'रोटावेटर',           'slug' => 'rotavator'],
            ['name' => 'Thresher',         'name_hindi' => 'थ्रेशर',             'slug' => 'thresher'],
            ['name' => 'Pump Set',         'name_hindi' => 'पंप सेट',            'slug' => 'pump_set'],
            ['name' => 'Sprayer',          'name_hindi' => 'स्प्रेयर',           'slug' => 'sprayer'],
        ],
        'nirman_machine' => [
            ['name' => 'JCB / Excavator',  'name_hindi' => 'JCB / खुदाई मशीन',  'slug' => 'jcb'],
            ['name' => 'Concrete Mixer',   'name_hindi' => 'कंक्रीट मिक्सर',    'slug' => 'concrete_mixer'],
            ['name' => 'Crane',            'name_hindi' => 'क्रेन',              'slug' => 'crane'],
            ['name' => 'Roller',           'name_hindi' => 'रोलर',               'slug' => 'roller'],
        ],
        'taxi' => [
            ['name' => 'Auto Rickshaw',    'name_hindi' => 'ऑटो रिक्शा',        'slug' => 'auto'],
            ['name' => 'Car',              'name_hindi' => 'कार',                'slug' => 'car'],
            ['name' => 'Bike Taxi',        'name_hindi' => 'बाइक टैक्सी',       'slug' => 'bike_taxi'],
            ['name' => 'E-Rickshaw',       'name_hindi' => 'ई-रिक्शा',          'slug' => 'e_rickshaw'],
        ],
        'transport' => [
            ['name' => 'Mini Truck',       'name_hindi' => 'मिनी ट्रक',         'slug' => 'mini_truck'],
            ['name' => 'Truck',            'name_hindi' => 'ट्रक',               'slug' => 'truck'],
            ['name' => 'Tempo',            'name_hindi' => 'टेम्पो',             'slug' => 'tempo'],
            ['name' => 'Pickup',           'name_hindi' => 'पिकअप',              'slug' => 'pickup'],
        ],
    ];

    // ─── GET /api/categories ──────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'name_hindi', 'slug', 'icon_url', 'sort_order']);

        return response()->json($categories);
    }

    // ─── GET /api/categories/{slug}/sub-categories ────────────────────────────

    public function subCategories(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)->first();
        if (!$category) {
            return response()->json([]);
        }

        $subs = SubCategory::where('category_id', $category->id)
            ->where('is_active', true)
            ->get(['id', 'name', 'name_hindi', 'slug']);

        return response()->json($subs);
    }

    // ─── POST /api/categories/seed ────────────────────────────────────────────

    public function seed(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['detail' => 'Admin access required'], 403);
        }

        $createdCats = 0;
        $createdSubs = 0;

        foreach (self::DEFAULT_CATEGORIES as $cat) {
            $category = Category::firstOrCreate(
                ['slug' => $cat['slug']],
                array_merge($cat, ['is_active' => true])
            );
            if ($category->wasRecentlyCreated) {
                $createdCats++;
            }

            // Seed sub-categories for this category
            $subs = self::DEFAULT_SUB_CATEGORIES[$cat['slug']] ?? [];
            foreach ($subs as $sub) {
                $exists = SubCategory::where('category_id', $category->id)
                    ->where('slug', $sub['slug'])
                    ->exists();
                if (!$exists) {
                    SubCategory::create(array_merge($sub, [
                        'category_id' => $category->id,
                        'is_active'   => true,
                    ]));
                    $createdSubs++;
                }
            }
        }

        return response()->json([
            'message' => "Seeded. {$createdCats} new categories, {$createdSubs} new sub-categories added.",
        ]);
    }
}
