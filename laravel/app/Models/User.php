<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\NotificationHistory;

class User extends Authenticatable
{
    use HasFactory;

    protected $fillable = [
        'phone',
        'name',
        'gender',
        'email',
        'password',
        'role',
        'selected_roles',
        'is_verified',
        'is_active',
        'is_blacklisted',
        'blacklist_reason',
        'permissions',
        'created_by_agent_id',
        'agent_referral_id',
        'aadhaar_url',
        'eshram_url',
        'verification_status',
        'fcm_token',
        'payout_type',
        'upi_id',
        'bank_details',
        'payout_verified_at',
        'payout_cooling_until',
        'payout_history',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_verified'          => 'boolean',
        'is_active'            => 'boolean',
        'is_blacklisted'       => 'boolean',
        'selected_roles'       => 'array',
        'permissions'          => 'array',
        'bank_details'         => 'array',
        'payout_history'       => 'array',
        'payout_cooling_until' => 'datetime',
        'payout_verified_at'   => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function providerProfile(): HasOne
    {
        return $this->hasOne(ProviderProfile::class);
    }

    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function bookingsAsCustomer(): HasMany
    {
        return $this->hasMany(Booking::class, 'customer_id');
    }

    public function bookingsAsProvider(): HasMany
    {
        return $this->hasMany(Booking::class, 'provider_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function commissionsAsAgent(): HasMany
    {
        return $this->hasMany(Commission::class, 'agent_id');
    }

    public function commissionsAsProvider(): HasMany
    {
        return $this->hasMany(Commission::class, 'provider_id');
    }

    public function rewardsReceived(): HasMany
    {
        return $this->hasMany(Reward::class, 'provider_id');
    }

    public function rewardsSent(): HasMany
    {
        return $this->hasMany(Reward::class, 'admin_id');
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function registeredLabors(): HasMany
    {
        return $this->hasMany(User::class, 'created_by_agent_id');
    }

    public function referredByAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_referral_id');
    }

    public function notificationHistories(): HasMany
    {
        return $this->hasMany(NotificationHistory::class);
    }

    // ─── Password Helpers ─────────────────────────────────────────────────────

    public function setPassword(string $password): void
    {
        $this->password = bcrypt($password);
    }

    public function verifyPassword(string $password): bool
    {
        return password_verify($password, $this->password ?? '');
    }

    // ─── Permission Helpers ───────────────────────────────────────────────────

    public function hasPermission(string $permission): bool
    {
        if (in_array($this->role, ['admin'])) {
            return true;
        }
        $perms = $this->permissions ?? [];
        return !empty($perms[$permission]);
    }

    /**
     * Return normalized lowercase list of allowed roles for account switching.
     */
    public function getSelectedRoles(): array
    {
        $roles = $this->selected_roles;
        if (!is_array($roles) || empty($roles)) {
            // Default fallback: allow current role, and if current role is worker, also allow customer
            return array_values(array_unique([strtolower($this->role ?? 'customer'), 'customer']));
        }
        $normalized = array_map(function ($r) {
            $lower = strtolower(trim($r));
            if ($lower === 'provider') return 'labour';
            return $lower;
        }, $roles);

        return array_values(array_unique($normalized));
    }
}
