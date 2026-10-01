<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * ContractProposal — Proposal_Master (Thekedar Booking Module).
 *
 * Single master record; V1 → V2 → V3 … sab `version_history` JSON mein.
 */
class ContractProposal extends Model
{
    protected $table = 'contract_proposals';

    protected $fillable = [
        'proposal_code',
        'customer_id',
        'contractor_id',
        'contractor_type',
        'work_description',
        'work_quantity',
        'work_unit',
        'site_address',
        'lat',
        'lng',
        'district',
        'state',
        'start_date',
        'start_time',
        'duration_days',
        'material_responsibility',
        'material_details',
        'price_basis',
        'total_amount',
        'advance_amount',
        'advance_percent',
        'during_amount',
        'during_percent',
        'completion_amount',
        'completion_percent',
        'final_amount',
        'final_percent',
        'extra_work_consent',
        'quality_terms',
        'validity_hours',
        'expires_at',
        'ssn_terms',
        'negotiated_terms',
        'final_contract_summary',
        'version_history',
        'current_version',
        'final_version',
        'status',
        'contract_id',
        'locked_at',
        'platform_fee',
        'fee_debited',
        'contacts_unlocked',
        'certificate_token',
        'certificate_path',
        'agreement_token',
        'agreement_path',
        'agreement_mime',
        'amendment_status',
        'amendment_requested_by',
        'amendment_payload',
        'amendment_reason',
        'reject_reason',
    ];

    protected $casts = [
        'work_quantity'          => 'float',
        'total_amount'           => 'float',
        'advance_amount'         => 'float',
        'advance_percent'        => 'float',
        'during_amount'          => 'float',
        'during_percent'         => 'float',
        'completion_amount'      => 'float',
        'completion_percent'     => 'float',
        'final_amount'           => 'float',
        'final_percent'          => 'float',
        'platform_fee'           => 'float',
        'duration_days'          => 'integer',
        'validity_hours'         => 'integer',
        'current_version'        => 'integer',
        'final_version'          => 'integer',
        'extra_work_consent'     => 'boolean',
        'fee_debited'            => 'boolean',
        'contacts_unlocked'      => 'boolean',
        'start_date'             => 'date',
        'expires_at'             => 'datetime',
        'locked_at'              => 'datetime',
        'ssn_terms'              => 'array',
        'negotiated_terms'       => 'array',
        'final_contract_summary' => 'array',
        'version_history'        => 'array',
        'amendment_payload'      => 'array',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contractor_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(ContractProposalOffer::class, 'contract_proposal_id');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Kya proposal abhi bhi zinda hai (koi action liya ja sakta hai)? */
    public function isOpen(): bool
    {
        return in_array($this->status, ['broadcasted', 'negotiating'], true);
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }

    /** 48-ghante ki validity khatam ho gayi? */
    public function isPastValidity(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /** Latest version entry (V-N) ya null. */
    public function latestVersionEntry(): ?array
    {
        $history = $this->version_history ?? [];
        return empty($history) ? null : $history[count($history) - 1];
    }

    /** Kisi bhi version ka snapshot nikalo. */
    public function versionEntry(int $version): ?array
    {
        foreach (($this->version_history ?? []) as $entry) {
            if ((int) ($entry['version'] ?? 0) === $version) {
                return $entry;
            }
        }
        return null;
    }

    /**
     * Non-Self Acceptance Rule (Platform Term #3):
     * Jis paksh ne aakhiri version bheja hai, wahi use accept nahi kar sakta.
     */
    public function lastVersionAuthor(): ?string
    {
        $entry = $this->latestVersionEntry();
        return $entry['created_by'] ?? null;
    }

    /**
     * Aakhiri version kis user ne bheja — role string se zyada precise,
     * kyunki ek hi proposal par kai thekedar ho sakte hain.
     */
    public function lastVersionAuthorId(): ?int
    {
        $entry = $this->latestVersionEntry();
        $id    = $entry['created_by_id'] ?? null;
        return ($id === null || (int) $id === 0) ? null : (int) $id;
    }
}
