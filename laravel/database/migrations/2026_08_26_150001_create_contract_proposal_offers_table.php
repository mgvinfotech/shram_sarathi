<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ek row per broadcasted contractor (Directive #5 — Dynamic Skill Broadcast).
 *
 * status:
 *   pending    → notification gaya, jawab ka intezaar
 *   on_hold    → kisi doosre thekedar ne private negotiation thread khol di (Directive #4)
 *   countered  → is thekedar ne Counter Offer (V2) bheja — thread owner
 *   accepted   → isi thekedar ne contract lock kiya
 *   rejected   → thekedar ne mana kar diya
 *   expired    → doosre ne le liya / 48 ghante nikal gaye ("Taken by another contractor")
 *   cancelled  → customer ne proposal cancel kiya
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_proposal_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_proposal_id')->constrained('contract_proposals')->onDelete('cascade');
            $table->foreignId('contractor_id')->constrained('users')->onDelete('cascade');

            $table->enum('status', [
                'pending', 'on_hold', 'countered', 'accepted',
                'rejected', 'expired', 'cancelled',
            ])->default('pending');

            $table->decimal('distance_km', 8, 2)->nullable();
            $table->string('expiry_reason', 40)->nullable();   // thread_locked | taken_by_other | timeout
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['contract_proposal_id', 'contractor_id'], 'cpo_proposal_contractor_unique');
            $table->index(['contractor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_proposal_offers');
    }
};
