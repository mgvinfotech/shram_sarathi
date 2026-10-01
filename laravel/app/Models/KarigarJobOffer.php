<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KarigarJobOffer extends Model
{
    protected $table = 'karigar_job_offers';

    protected $fillable = [
        'karigar_job_request_id',
        'provider_id',
        'status',
        'messages',
    ];

    protected $casts = [
        'messages' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function request(): BelongsTo
    {
        return $this->belongsTo(KarigarJobRequest::class, 'karigar_job_request_id');
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provider_id');
    }
}
