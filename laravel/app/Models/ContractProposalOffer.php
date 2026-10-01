<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractProposalOffer extends Model
{
    protected $table = 'contract_proposal_offers';

    protected $fillable = [
        'contract_proposal_id',
        'contractor_id',
        'status',
        'distance_km',
        'expiry_reason',
        'notified_at',
        'responded_at',
    ];

    protected $casts = [
        'distance_km'  => 'float',
        'notified_at'  => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function proposal(): BelongsTo
    {
        return $this->belongsTo(ContractProposal::class, 'contract_proposal_id');
    }

    public function contractor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'contractor_id');
    }
}
