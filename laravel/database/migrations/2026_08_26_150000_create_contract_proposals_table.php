<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Proposal_Master — Thekedar (Contractor) Digital Contract Proposal.
 *
 * Backend Directive #2 (Single Master Record with Versioning):
 * Ek hi proposal_id rehta hai. Har negotiation round (V1 → V2 → V3 …) ka
 * delta `version_history` JSON array mein push hota hai — naya row nahi banta.
 *
 * Three-Tier Terms Locking:
 *   ssn_terms              → platform ki permanent shartein (immutable snapshot)
 *   negotiated_terms       → V1/V2/V3 loop mein badalne wale fields (latest)
 *   final_contract_summary → lock hone ke baad ka frozen contract
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contract_proposals', function (Blueprint $table) {
            $table->id();
            $table->string('proposal_code', 32)->unique();          // SSN-PRO-XXXXXXXX

            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            // Private 1-to-1 negotiation thread ka owner (Directive #4). Lock hone par winner.
            $table->foreignId('contractor_id')->nullable()->constrained('users')->nullOnDelete();

            // ── PART-A: Kaam ka vivaran ──────────────────────────────────────
            $table->string('contractor_type', 60);                  // rcc_concrete | masonry | plumbing …
            $table->text('work_description');
            $table->decimal('work_quantity', 12, 2)->nullable();
            $table->string('work_unit', 30)->nullable();            // sqft | sqmtr | count | rmt | other
            $table->text('site_address');
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->string('district', 100)->nullable();
            $table->string('state', 100)->nullable();

            // ── PART-B: Samay-seema ──────────────────────────────────────────
            $table->date('start_date');
            $table->string('start_time', 20);                       // "10:00 AM"
            $table->unsignedSmallInteger('duration_days');

            // ── PART-C: Samagri ki zimmedari ─────────────────────────────────
            $table->enum('material_responsibility', ['labour_only', 'labour_material'])->default('labour_only');
            $table->text('material_details')->nullable();

            // ── PART-D: Prastavit theka mulya ────────────────────────────────
            $table->enum('price_basis', ['total_contract', 'per_sqft', 'other'])->default('total_contract');
            $table->decimal('total_amount', 12, 2);

            // ── PART-E: Bhugtan ki shartein (auto 100%) ──────────────────────
            $table->decimal('advance_amount', 12, 2)->default(0);
            $table->decimal('advance_percent', 5, 2)->default(0);
            $table->decimal('during_amount', 12, 2)->default(0);
            $table->decimal('during_percent', 5, 2)->default(0);
            $table->decimal('completion_amount', 12, 2)->default(0);
            $table->decimal('completion_percent', 5, 2)->default(0);
            $table->decimal('final_amount', 12, 2)->default(0);
            $table->decimal('final_percent', 5, 2)->default(0);

            // ── PART-F: Niyam evam shartein (3-Tier) ─────────────────────────
            $table->boolean('extra_work_consent')->default(true);
            $table->text('quality_terms')->nullable();
            $table->unsignedSmallInteger('validity_hours')->default(48);
            $table->timestamp('expires_at')->nullable();

            $table->json('ssn_terms')->nullable();                  // Tier 1 (immutable)
            $table->json('negotiated_terms')->nullable();           // Tier 2 (latest version values)
            $table->json('final_contract_summary')->nullable();     // Tier 3 (locked)
            $table->json('version_history')->nullable();            // [{version, created_by, values, changes}]

            $table->unsignedSmallInteger('current_version')->default(1);
            $table->unsignedSmallInteger('final_version')->nullable();

            // draft → broadcasted → negotiating → locked | rejected | expired | cancelled
            $table->enum('status', [
                'draft', 'broadcasted', 'negotiating', 'locked',
                'rejected', 'expired', 'cancelled',
            ])->default('broadcasted');

            // ── Contract lock artifacts ──────────────────────────────────────
            $table->string('contract_id', 32)->nullable()->unique(); // SSN-CON-XXXXXXXX
            $table->timestamp('locked_at')->nullable();
            $table->decimal('platform_fee', 12, 2)->nullable();     // Final value ka 2%
            $table->boolean('fee_debited')->default(false);
            $table->boolean('contacts_unlocked')->default(false);

            $table->string('certificate_token', 64)->nullable()->index();
            $table->string('certificate_path', 255)->nullable();
            $table->string('agreement_token', 64)->nullable()->index();
            $table->string('agreement_path', 255)->nullable();
            $table->string('agreement_mime', 100)->nullable();

            // ── Amendment (Parivartan) request — lock ke baad ────────────────
            $table->enum('amendment_status', ['none', 'requested', 'approved', 'rejected'])->default('none');
            $table->foreignId('amendment_requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('amendment_payload')->nullable();
            $table->text('amendment_reason')->nullable();

            $table->text('reject_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'expires_at']);
            $table->index(['customer_id', 'status']);
            $table->index(['contractor_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_proposals');
    }
};
