<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\SubCategory;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
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

    public function run(): void
    {
        // Delete existing categories and sub-categories to avoid duplicate entries during re-seeding
        Category::query()->delete();

        foreach (self::DEFAULT_CATEGORIES as $cat) {
            $category = Category::create(array_merge($cat, ['is_active' => true]));

            $subs = self::DEFAULT_SUB_CATEGORIES[$cat['slug']] ?? [];
            foreach ($subs as $sub) {
                SubCategory::create(array_merge($sub, [
                    'category_id' => $category->id,
                    'is_active'   => true,
                ]));
            }
        }
    }
}
