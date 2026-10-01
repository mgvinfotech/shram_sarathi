<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WorkingLocation;
use App\Rules\ValidAadhaar;
use App\Rules\ValidPan;
use App\Services\RedisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class OnboardingController extends Controller
{
    public function __construct(private RedisService $redis) {}

    public function completeProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = strtoupper($user->role); // Current active role (normalized)

        // Also check ALL roles the user signed up for (stored as JSON array)
        $selectedRoles = array_map('strtoupper', $user->selected_roles ?? []);
        if (empty($selectedRoles)) {
            $selectedRoles = [$role];
        }
        // Union: merge current role + all selected roles for field validation
        $allRoles = array_unique(array_merge([$role], $selectedRoles));

        $rules = [
            'photo'                => 'sometimes|nullable|file|mimes:jpeg,png,jpg|max:2048',
            'agent_referral_code'  => 'sometimes|nullable|string',
            'lat'                  => 'sometimes|nullable|numeric',
            'lng'                  => 'sometimes|nullable|numeric',
            'base_location_address'=> 'sometimes|nullable|string',
            'radius_km'            => 'sometimes|nullable|numeric',
            'state'                => 'sometimes|nullable|string',
            'district'             => 'sometimes|nullable|string',
            // ID Verification
            'aadhaar_number'       => ['sometimes', 'nullable', 'string', new ValidAadhaar()],
            'owner_id_number'      => 'sometimes|nullable|string',
            'aadhaar_photo'        => 'sometimes|nullable|file|mimes:jpeg,png,jpg|max:2048',
            'pan_number'           => ['sometimes', 'nullable', 'string', new ValidPan()],
            'pan_photo'            => 'sometimes|nullable|file|mimes:jpeg,png,jpg|max:2048',
            // Transport / Vehicle fields (always allowed — role check happens at save time)
            'vehicle_number'       => 'sometimes|nullable|string',
            'per_km_rate'          => 'sometimes|nullable|numeric',
            'is_passenger_vehicle' => 'sometimes|nullable',
            'is_goods_vehicle'     => 'sometimes|nullable',
            'is_delivery_vehicle'  => 'sometimes|nullable',
        ];

        // Add role-specific validation rules for ALL selected roles
        foreach ($allRoles as $r) {
            if ($r === 'LABOUR') {
                $rules = array_merge($rules, [
                    'category'           => 'sometimes|nullable|string|max:50',
                    'experience_years'   => 'sometimes|nullable|string',
                    'expected_daily_wage'=> 'sometimes|nullable|numeric',
                ]);
            } elseif ($r === 'KARIGAR') {
                $rules = array_merge($rules, [
                    'category'           => 'sometimes|nullable|string|max:50',
                    'skills_description' => 'sometimes|nullable|string',
                    'experience_years'   => 'sometimes|nullable|string',
                    'expected_daily_wage'=> 'sometimes|nullable|numeric',
                ]);
            } elseif (in_array($r, ['DRIVER', 'TRANSPORT', 'PROVIDER'])) {
                $rules = array_merge($rules, [
                    'category'         => 'sometimes|nullable|string|max:50',
                    'contract_types'   => 'sometimes|nullable|array',
                    'vehicle_type'     => 'sometimes|nullable|string',
                    'vehicle_number'   => 'sometimes|nullable|string',
                    'per_km_rate'      => 'sometimes|nullable|numeric',
                    'experience_years' => 'sometimes|nullable|string',
                    'dl_number'        => 'sometimes|nullable|string',
                    'dl_category'      => 'sometimes|nullable|string',
                    'is_dl_verified'   => 'sometimes|boolean',
                    'rc_number'        => 'sometimes|nullable|string',
                    'rc_photo'         => 'sometimes|nullable|file|mimes:jpeg,png,jpg|max:2048',
                    'insurance_photo'  => 'sometimes|nullable|file|mimes:jpeg,png,jpg|max:2048',
                ]);
            } elseif ($r === 'CONTRACTOR') {
                $rules = array_merge($rules, [
                    'firm_name'        => 'sometimes|nullable|string',
                    'category'         => 'sometimes|nullable|string',
                    'team_size'        => 'sometimes|nullable|string',
                    'experience_years' => 'sometimes|nullable|string',
                    'contract_types'   => 'sometimes|nullable|array',
                ]);
            } elseif ($r === 'AGENT') {
                $rules = array_merge($rules, [
                    'payout_type'  => 'sometimes|nullable|string',
                    'upi_id'       => 'sometimes|nullable|string',
                    'bank_details' => 'sometimes|nullable|json',
                ]);
            } elseif ($r === 'CUSTOMER') {
                $rules = array_merge($rules, [
                    'customer_type' => 'sometimes|nullable|string',
                    'firm_name'     => 'sometimes|nullable|string',
                    'location_type' => 'sometimes|nullable|string',
                ]);
            }
        }

        $data = $request->validate($rules);

        // Handle File Uploads (Local Storage)
        $uploadedPaths = [];
        $fileFields = ['photo', 'aadhaar_photo', 'pan_photo', 'rc_photo', 'insurance_photo'];
        
        foreach ($fileFields as $field) {
            if ($request->hasFile($field)) {
                $path = $request->file($field)->store('uploads', 'public');
                $uploadedPaths[$field . '_url'] = Storage::url($path);
            }
        }

        DB::transaction(function () use ($user, $role, $allRoles, $data, $uploadedPaths) {
            // Check Agent Referral
            if (!empty($data['agent_referral_code'])) {
                // The code is typically something like AG-9821
                $agentId = str_replace('AG-', '', $data['agent_referral_code']);
                $agent = User::where('id', $agentId)->where('role', 'AGENT')->first();
                if ($agent) {
                    $user->agent_referral_id = $agent->id;
                    $user->save();
                    
                    // Agent Incentive Trigger: add ₹10 to pending wallet
                    $agentWallet = Wallet::firstOrCreate(['user_id' => $agent->id]);
                    $agentWallet->pending_bonus_balance += 10.00;
                    $agentWallet->save();
                }
            }

            // Save User ID documents and Role specific fields
            if (!empty($data['name'])) {
                $user->name = $data['name'];
            }
            if (isset($uploadedPaths['aadhaar_photo_url'])) {
                $user->aadhaar_url = $uploadedPaths['aadhaar_photo_url'];
            }
            // Save user-level fields for ALL selected roles
            if (in_array('AGENT', $allRoles)) {
                $user->payout_type   = $data['payout_type']  ?? $user->payout_type;
                $user->upi_id        = $data['upi_id']        ?? $user->upi_id;
                $user->bank_details  = $data['bank_details']  ?? $user->bank_details;
            }
            if (in_array('CUSTOMER', $allRoles)) {
                $user->customer_type = $data['customer_type'] ?? $user->customer_type;
                $user->firm_name     = $data['firm_name']     ?? $user->firm_name;
                $user->location_type = $data['location_type'] ?? $user->location_type;
            }
            $user->save();

            // Provider roles — check if ANY of the selected roles is a provider role
            $providerRoles = ['LABOUR', 'KARIGAR', 'DRIVER', 'TRANSPORT', 'CONTRACTOR', 'PROVIDER'];
            $hasProviderRole = count(array_intersect($allRoles, $providerRoles)) > 0;

            // Create or update ProviderProfile (stores photo_url for any user role)
            $profile = ProviderProfile::firstOrNew(['user_id' => $user->id]);
            if (isset($uploadedPaths['photo_url'])) {
                $profile->photo_url = $uploadedPaths['photo_url'];
            }

            if ($hasProviderRole) {
                // Determine correct category based on role priority
                // IMPORTANT: category must match what searchDrivers/Labour queries use
                $roleToCategoryMap = [
                    'DRIVER'     => 'driver',
                    'TRANSPORT'  => 'transport',
                    'LABOUR'     => 'labour',
                    'KARIGAR'    => 'karigar',
                    'CONTRACTOR' => 'contractor',
                    'PROVIDER'   => 'labour',
                ];
                // Find first matching provider role and get its canonical category
                $canonicalCategory = null;
                foreach ($providerRoles as $pr) {
                    if (in_array($pr, $allRoles)) {
                        $canonicalCategory = $roleToCategoryMap[$pr] ?? strtolower($pr);
                        break;
                    }
                }
                // Frontend-sent category overrides canonical ONLY if it's a valid non-empty value
                // AND not a stale/wrong value (like 'majdoor' for a driver)
                $frontendCategory = !empty($data['category']) ? strtolower(trim($data['category'])) : null;
                $validCategories  = ['driver', 'transport', 'labour', 'karigar', 'contractor', 'provider'];
                if ($frontendCategory && in_array($frontendCategory, $validCategories)) {
                    $profile->category = $frontendCategory;
                } else {
                    // Always use canonical role-based category — prevents 'majdoor' for drivers
                    $profile->category = $canonicalCategory ?? ($profile->category ?: strtolower($role));
                }

                $profile->skills_description   = $data['skills_description']   ?? $profile->skills_description;
                $profile->experience_years     = $data['experience_years']     ?? $profile->experience_years;
                $profile->expected_daily_wage  = $data['expected_daily_wage']  ?? $profile->expected_daily_wage;
                $profile->current_lat          = $data['lat']                  ?? $profile->current_lat;
                $profile->current_lng          = $data['lng']                  ?? $profile->current_lng;
                $profile->radius_km            = $data['radius_km']            ?? ($profile->radius_km ?: 10);
                $profile->base_location_address= $data['base_location_address'] ?? ($profile->base_location_address ?: 'Not specified');
                $profile->is_online            = true;

                // Sub-categories array (Task 7 Multi-Select)
                if (!empty($data['sub_categories'])) {
                    $subs = is_array($data['sub_categories']) ? $data['sub_categories'] : json_decode($data['sub_categories'], true);
                    if (is_array($subs) && count($subs) > 0) {
                        $profile->sub_categories = array_values(array_unique(array_filter($subs)));
                    }
                }

                // Driver / Transport fields — save if DRIVER or TRANSPORT in allRoles, OR vehicle data was sent
                $hasDriverRole    = in_array('DRIVER',    $allRoles);
                $hasTransportRole = in_array('TRANSPORT', $allRoles);
                if ($hasDriverRole || $hasTransportRole || !empty($data['vehicle_number']) || $profile->category === 'transport') {
                    $profile->contract_types = $data['contract_types'] ?? ($profile->contract_types ?: ['commercial']);
                    $profile->vehicle_type   = $data['vehicle_type']   ?? ($profile->vehicle_type   ?: 'Sedan');
                    $profile->vehicle_number = $data['vehicle_number'] ?? $profile->vehicle_number;
                    $profile->per_km_rate    = $data['per_km_rate']    ?? ($profile->per_km_rate    ?: 15.0);
                    if (isset($data['is_passenger_vehicle'])) {
                        $profile->is_passenger_vehicle = filter_var($data['is_passenger_vehicle'], FILTER_VALIDATE_BOOLEAN);
                    }
                    if (isset($data['is_goods_vehicle'])) {
                        $profile->is_goods_vehicle = filter_var($data['is_goods_vehicle'], FILTER_VALIDATE_BOOLEAN);
                    }
                    if (isset($data['is_delivery_vehicle'])) {
                        $profile->is_delivery_vehicle = filter_var($data['is_delivery_vehicle'], FILTER_VALIDATE_BOOLEAN);
                    }
                    $profile->dl_number          = $data['dl_number']    ?? $profile->dl_number;
                    $profile->dl_category        = $data['dl_category']  ?? ($profile->dl_category ?: 'LMV');
                    $profile->is_dl_verified     = isset($data['is_dl_verified']) ? (bool)$data['is_dl_verified'] : false;
                    $profile->rc_number          = $data['rc_number']    ?? $profile->rc_number;
                    $profile->rc_image_url       = $uploadedPaths['rc_photo_url']        ?? $profile->rc_image_url;
                    $profile->insurance_image_url= $uploadedPaths['insurance_photo_url'] ?? $profile->insurance_image_url;

                    // Populate sub_categories with vehicle_type for searchDrivers compatibility
                    $vehicleType  = $profile->vehicle_type;
                    $existingSubs = $profile->sub_categories ?? [];
                    if ($vehicleType && !in_array($vehicleType, $existingSubs)) {
                        $existingSubs[] = $vehicleType;
                    }
                    $profile->sub_categories = $existingSubs;
                }

                if (in_array('CONTRACTOR', $allRoles)) {
                    $profile->firm_name     = $data['firm_name']     ?? $profile->firm_name;
                    $profile->team_size     = $data['team_size']     ?? $profile->team_size;
                    $profile->contract_types= $data['contract_types']?? ($profile->contract_types ?: []);
                    $profile->pan_number    = $data['pan_number']    ?? $profile->pan_number;
                    $profile->pan_url       = $uploadedPaths['pan_photo_url'] ?? $profile->pan_url;
                }

                // ALWAYS save profile first so it gets an ID!
                $profile->save();

                // Save Working Location (State & District)
                $district = $data['district'] ?? null;
                $state    = $data['state']    ?? 'Madhya Pradesh';
                if ($district) {
                    WorkingLocation::updateOrCreate(
                        ['provider_profile_id' => $profile->id, 'district' => $district],
                        ['state' => $state]
                    );
                }

                // Update Redis for GeoLocation if coords provided
                if ($profile->current_lat && $profile->current_lng) {
                    $this->redis->updateProviderLocation($user->id, $profile->current_lat, $profile->current_lng);
                }
            } else {
                // Customer / Agent only — still save photo and basic profile entry
                if (empty($profile->category)) {
                    $profile->category = strtolower($role);
                }
                // Always save location for all users
                $profile->current_lat           = $data['lat']                  ?? $profile->current_lat;
                $profile->current_lng           = $data['lng']                  ?? $profile->current_lng;
                $profile->base_location_address = $data['base_location_address'] ?? $profile->base_location_address;
                if ($profile->isDirty() || !empty($profile->photo_url)) {
                    $profile->save();
                }
            }

        });

        return response()->json([
            'message' => 'Profile completed successfully',
            'user' => $user->fresh(),
        ]);
    }
}
