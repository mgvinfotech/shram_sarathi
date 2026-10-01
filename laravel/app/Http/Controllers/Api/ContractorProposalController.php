<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContractProposal;
use App\Models\ContractProposalOffer;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\Wallet;
use App\Services\ContractProposalService as Svc;
use App\Services\FcmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * ContractorProposalController — ठेकेदार बुकिंग एवं डिजिटल ठेका प्रस्ताव Module.
 *
 * Flow (PDF spec):
 *   SCREEN 1  Customer → Proposal V1 banata hai → skill-wise broadcast
 *   SCREEN 2  Thekedar → Accept / Reject / Counter Offer (V2)
 *   SCREEN 3  Customer → V1 vs V2 tulna → Accept / Send V3 / Reject
 *   SCREEN 4  Final Acceptance → 2% wallet debit → Contract Lock (SSN-CON-XXXXXXXX)
 *
 * Backend Directives implemented:
 *   1. Atomic Single Acceptance (lockForUpdate = PESSIMISTIC_WRITE_LOCK)
 *   2. Single Master Record + version_history JSON (delta changes)
 *   3. Wallet Sufficiency Check + automatic 2% deduction
 *   4. 1-to-1 Private Negotiation Thread
 *   5. Dynamic Skill Broadcast
 *   6. Auto-Expiry Timer Engine (48h) — cron + lazy expiry
 *   7. Watermarked PDF/Print Certificate Generator
 */
class ContractorProposalController extends Controller
{
    public function __construct(private FcmService $fcm)
    {
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /api/contractor/proposal/meta — dropdown options + standard terms
    // ══════════════════════════════════════════════════════════════════════════

    public function meta(Request $request): JsonResponse
    {
        return response()->json([
            'contractor_types' => Svc::contractorTypes(),
            'work_units'       => Svc::workUnits(),
            'price_bases'      => Svc::priceBases(),
            'material_options' => Svc::materialOptions(),
            'fee_percent'      => Svc::FEE_PERCENT,
            'default_validity_hours' => 48,
            'ssn_terms'        => Svc::standardTerms(),
            'payment_defaults' => [
                'advance_percent'    => 20,
                'during_percent'     => 30,
                'completion_percent' => 30,
                'final_percent'      => 20,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCREEN 1 — POST /api/contractor/proposal/create  (Customer, V1)
    // ══════════════════════════════════════════════════════════════════════════

    public function create(Request $request): JsonResponse
    {
        $typeSlugs  = array_column(Svc::contractorTypes(), 'slug');
        $unitSlugs  = array_column(Svc::workUnits(), 'slug');
        $basisSlugs = array_column(Svc::priceBases(), 'slug');

        $data = $request->validate([
            'contractor_type'    => 'required|string|in:' . implode(',', $typeSlugs),
            'work_description'   => 'required|string|max:2000',
            'work_quantity'      => 'nullable|numeric|min:0',
            'work_unit'          => 'nullable|string|in:' . implode(',', $unitSlugs),
            'site_address'       => 'required|string|max:500',
            'lat'                => 'nullable|numeric|between:-90,90',
            'lng'                => 'nullable|numeric|between:-180,180',
            'district'           => 'nullable|string|max:100',
            'state'              => 'nullable|string|max:100',

            'start_date'         => 'required|date',
            'start_time'         => 'required|string|max:20',
            'duration_days'      => 'required|integer|min:1|max:3650',

            'material_responsibility' => 'required|in:labour_only,labour_material',
            'material_details'   => 'nullable|string|max:2000',

            'price_basis'        => 'required|string|in:' . implode(',', $basisSlugs),
            'total_amount'       => 'required|numeric|min:1|max:999999999',

            'advance_percent'    => 'required|numeric|min:0|max:100',
            'during_percent'     => 'required|numeric|min:0|max:100',
            'completion_percent' => 'required|numeric|min:0|max:100',
            'final_percent'      => 'required|numeric|min:0|max:100',

            'extra_work_consent' => 'sometimes|boolean',
            'quality_terms'      => 'nullable|string|max:2000',
            'validity_hours'     => 'sometimes|integer|min:1|max:720',
            'terms_accepted'     => 'accepted',
        ]);

        $customer = $request->user();

        // ── PART-E: system auto-calculate — kul yog 100% hona zaroori hai ──────
        $pcts = [
            'advance'    => (float) $data['advance_percent'],
            'during'     => (float) $data['during_percent'],
            'completion' => (float) $data['completion_percent'],
            'final'      => (float) $data['final_percent'],
        ];
        $sum = array_sum($pcts);
        if (abs($sum - 100) > 0.5) {
            return response()->json([
                'detail' => 'भुगतान शर्तों का कुल योग 100% होना चाहिए। अभी यह ' .
                    rtrim(rtrim(number_format($sum, 2, '.', ''), '0'), '.') . '% है।',
                'errors' => ['advance_percent' => ['कुल योग 100% होना चाहिए']],
            ], 422);
        }

        // Labour + Material chuna hai to samagri ka vivaran chahiye
        if ($data['material_responsibility'] === 'labour_material' && empty($data['material_details'])) {
            return response()->json([
                'detail' => 'श्रम + सामग्री चुनने पर सामग्री का विवरण दर्ज करना आवश्यक है।',
                'errors' => ['material_details' => ['सामग्री का विवरण दर्ज करें']],
            ], 422);
        }

        $total  = (float) $data['total_amount'];
        $amount = $this->computeSplit($total, $pcts);
        $validityHours = (int) ($data['validity_hours'] ?? 48);

        $proposal = new ContractProposal();
        $proposal->fill([
            'proposal_code'    => Svc::generateProposalCode(),
            'customer_id'      => $customer->id,
            'contractor_type'  => $data['contractor_type'],
            'work_description' => $data['work_description'],
            'work_quantity'    => $data['work_quantity'] ?? null,
            'work_unit'        => $data['work_unit'] ?? null,
            'site_address'     => $data['site_address'],
            'lat'              => $data['lat'] ?? null,
            'lng'              => $data['lng'] ?? null,
            'district'         => $data['district'] ?? null,
            'state'            => $data['state'] ?? null,
            'start_date'       => $data['start_date'],
            'start_time'       => $data['start_time'],
            'duration_days'    => (int) $data['duration_days'],
            'material_responsibility' => $data['material_responsibility'],
            'material_details' => $data['material_details'] ?? null,
            'price_basis'      => $data['price_basis'],
            'total_amount'     => $total,
            'advance_amount'      => $amount['advance'],
            'advance_percent'     => $pcts['advance'],
            'during_amount'       => $amount['during'],
            'during_percent'      => $pcts['during'],
            'completion_amount'   => $amount['completion'],
            'completion_percent'  => $pcts['completion'],
            'final_amount'        => $amount['final'],
            'final_percent'       => $pcts['final'],
            'extra_work_consent'  => (bool) ($data['extra_work_consent'] ?? true),
            'quality_terms'       => $data['quality_terms'] ?? null,
            'validity_hours'      => $validityHours,
            'expires_at'          => now()->addHours($validityHours),
            'ssn_terms'           => Svc::standardTerms(),
            'current_version'     => 1,
            'status'              => 'broadcasted',
        ]);
        $proposal->save();

        // Tier 2 + V1 history entry
        $snapshot = Svc::snapshot($proposal);
        $proposal->negotiated_terms = $snapshot;
        $proposal->version_history  = [
            Svc::makeVersionEntry(1, 'customer', $customer->id, $snapshot, null, null, 'मूल प्रस्ताव (Original Proposal V1)'),
        ];
        $proposal->save();

        // ── Directive #5: Dynamic Skill Broadcast ─────────────────────────────
        $broadcast = $this->broadcast($proposal);

        Log::info("[ContractProposal] {$proposal->proposal_code} created by customer #{$customer->id}, " .
            "broadcast to {$broadcast['count']} contractors (fallback=" . ($broadcast['fallback'] ? 'yes' : 'no') . ')');

        return response()->json([
            'proposal_id'     => $proposal->id,
            'proposal_code'   => $proposal->proposal_code,
            'status'          => $proposal->status,
            'current_version' => 1,
            'expires_at'      => $proposal->expires_at?->toISOString(),
            'notified_count'  => $broadcast['count'],
            'broadcast_fallback' => $broadcast['fallback'],
            'message'         => $broadcast['count'] > 0
                ? 'प्रस्ताव (V1) ' . $broadcast['count'] . ' ठेकेदारों को भेज दिया गया है। उनके जवाब का इंतज़ार करें।'
                : 'प्रस्ताव सेव हो गया, लेकिन इस श्रेणी में अभी कोई ठेकेदार उपलब्ध नहीं मिला। वे उपलब्ध होते ही सूचित होंगे।',
        ], 201);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Lists
    // ══════════════════════════════════════════════════════════════════════════

    /** GET /api/contractor/proposal/customer/list */
    public function customerList(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->expireStaleFor($user->id, 'customer');

        $rows = ContractProposal::with(['contractor', 'offers'])
            ->where('customer_id', $user->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn ($p) => $this->summaryRow($p, 'customer'));

        return response()->json($rows);
    }

    /** GET /api/contractor/proposal/contractor/inbox */
    public function contractorInbox(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->expireStaleFor($user->id, 'contractor');

        $offers = ContractProposalOffer::with(['proposal.customer'])
            ->where('contractor_id', $user->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->filter(fn ($o) => $o->proposal !== null);

        $rows = $offers->map(function ($o) {
            $row = $this->summaryRow($o->proposal, 'contractor');
            $row['offer_status']  = $o->status;
            $row['expiry_reason'] = $o->expiry_reason;
            $row['distance_km']   = $o->distance_km;
            $row['is_actionable'] = in_array($o->status, ['pending', 'countered'], true)
                && $o->proposal->isOpen() && !$o->proposal->isPastValidity();
            return $row;
        })->values();

        return response()->json($rows);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /api/contractor/proposal/{id} — full detail (Screens 2/3/4 data)
    // ══════════════════════════════════════════════════════════════════════════

    public function show(Request $request, int $id): JsonResponse
    {
        $user     = $request->user();
        $proposal = ContractProposal::with(['customer', 'contractor', 'offers.contractor'])->find($id);

        if (!$proposal) {
            return response()->json(['detail' => 'प्रस्ताव नहीं मिला।'], 404);
        }

        $offer = $proposal->offers->firstWhere('contractor_id', $user->id);
        $role  = $this->roleOf($proposal, $user, $offer);

        if ($role === null) {
            return response()->json(['detail' => 'यह प्रस्ताव देखने की अनुमति नहीं है।'], 403);
        }

        $this->expireIfNeeded($proposal);
        $proposal->refresh()->load(['customer', 'contractor', 'offers.contractor']);
        $offer = $proposal->offers->firstWhere('contractor_id', $user->id);

        return response()->json($this->present($proposal, $user, $role, $offer));
    }

    /** GET /api/contractor/proposal/{id}/versions — Digital Audit Trail */
    public function versions(Request $request, int $id): JsonResponse
    {
        $user     = $request->user();
        $proposal = ContractProposal::with('offers')->find($id);

        if (!$proposal) {
            return response()->json(['detail' => 'प्रस्ताव नहीं मिला।'], 404);
        }
        $offer = $proposal->offers->firstWhere('contractor_id', $user->id);
        if ($this->roleOf($proposal, $user, $offer) === null) {
            return response()->json(['detail' => 'अनुमति नहीं है।'], 403);
        }

        return response()->json([
            'proposal_id'     => $proposal->id,
            'current_version' => $proposal->current_version,
            'final_version'   => $proposal->final_version,
            'versions'        => $this->decorateHistory($proposal),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCREEN 2/3 — POST /api/contractor/proposal/{id}/counter  (V2, V3, V4 …)
    // ══════════════════════════════════════════════════════════════════════════

    public function counter(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'total_amount'       => 'sometimes|numeric|min:1|max:999999999',
            'duration_days'      => 'sometimes|integer|min:1|max:3650',
            'advance_percent'    => 'sometimes|numeric|min:0|max:100',
            'during_percent'     => 'sometimes|numeric|min:0|max:100',
            'completion_percent' => 'sometimes|numeric|min:0|max:100',
            'final_percent'      => 'sometimes|numeric|min:0|max:100',
            'start_date'         => 'sometimes|date',
            'start_time'         => 'sometimes|string|max:20',
            'material_responsibility' => 'sometimes|in:labour_only,labour_material',
            'material_details'   => 'sometimes|nullable|string|max:2000',
            'quality_terms'      => 'sometimes|nullable|string|max:2000',
            'note'               => 'sometimes|nullable|string|max:1000',
            'voice_note_url'     => 'sometimes|nullable|string|max:500',
        ]);

        $user = $request->user();

        try {
            $result = DB::transaction(function () use ($id, $user, $data) {
                /** @var ContractProposal|null $proposal */
                $proposal = ContractProposal::lockForUpdate()->find($id);
                if (!$proposal) {
                    return $this->err('प्रस्ताव नहीं मिला।', 404);
                }

                $offer = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->where('contractor_id', $user->id)->lockForUpdate()->first();
                $role = $this->roleOf($proposal, $user, $offer);

                if ($role === null || $role === 'viewer') {
                    return $this->err('अनुमति नहीं है।', 403);
                }
                if ($proposal->isLocked()) {
                    return $this->err('यह प्रस्ताव लॉक हो चुका है — अब संशोधन संभव नहीं।', 409);
                }
                if (!$proposal->isOpen()) {
                    return $this->err($this->closedMessage($proposal), 409);
                }
                if ($proposal->isPastValidity()) {
                    $this->markExpired($proposal);
                    return $this->err('प्रस्ताव की वैधता (' . $proposal->validity_hours . ' घंटे) समाप्त हो गई है।', 409);
                }

                // Contractor side gating (Directive #4 — 1-to-1 private thread)
                if ($role === 'contractor') {
                    if (!$offer || !in_array($offer->status, ['pending', 'countered'], true)) {
                        return $this->err($this->offerBlockedMessage($offer), 409);
                    }
                    if ($proposal->contractor_id && $proposal->contractor_id !== $user->id) {
                        return $this->err('यह प्रस्ताव अब किसी अन्य ठेकेदार के साथ नेगोशिएशन में है।', 409);
                    }
                } else {
                    // Customer sirf apne thread-owner ko counter kar sakta hai
                    if (!$proposal->contractor_id) {
                        return $this->err('अभी किसी ठेकेदार ने संशोधित प्रस्ताव नहीं भेजा है।', 409);
                    }
                }

                // Non-Self Acceptance ka counterpart: apne hi version par counter nahi
                $authorId = $proposal->lastVersionAuthorId();
                $selfAuthored = $authorId !== null
                    ? $authorId === (int) $user->id
                    : $proposal->lastVersionAuthor() === $role;

                if ($selfAuthored) {
                    return $this->err(
                        $role === 'contractor'
                            ? 'आपका संशोधित प्रस्ताव पहले ही भेजा जा चुका है — अब ग्राहक के जवाब का इंतज़ार करें।'
                            : 'आपका प्रस्ताव पहले ही भेजा जा चुका है — अब ठेकेदार के जवाब का इंतज़ार करें।',
                        409
                    );
                }

                $previous = Svc::snapshot($proposal);
                $newTotal = isset($data['total_amount']) ? (float) $data['total_amount'] : (float) $proposal->total_amount;

                // ── Directive #3: Wallet Sufficiency Check (contractor side) ──
                if ($role === 'contractor') {
                    $check = $this->walletCheck($user->id, $newTotal);
                    if (!$check['ok']) {
                        return $this->err($check['message'], 400, [
                            'wallet_balance'  => $check['balance'],
                            'required_balance' => $check['required'],
                            'missing_amount'  => $check['missing'],
                            'wallet_short'    => true,
                        ]);
                    }
                }

                // ── Percent split (agar koi bhi percent bheja hai to 100% check)
                $pcts = [
                    'advance'    => (float) ($data['advance_percent']    ?? $proposal->advance_percent),
                    'during'     => (float) ($data['during_percent']     ?? $proposal->during_percent),
                    'completion' => (float) ($data['completion_percent'] ?? $proposal->completion_percent),
                    'final'      => (float) ($data['final_percent']      ?? $proposal->final_percent),
                ];
                $sum = array_sum($pcts);
                if (abs($sum - 100) > 0.5) {
                    // Sirf advance badla hai to baaki ko proportionally adjust karo
                    $pcts = $this->rebalancePercents($pcts, $data);
                    $sum  = array_sum($pcts);
                    if (abs($sum - 100) > 0.5) {
                        return $this->err('भुगतान शर्तों का कुल योग 100% होना चाहिए। अभी यह ' .
                            rtrim(rtrim(number_format($sum, 2, '.', ''), '0'), '.') . '% है।', 422);
                    }
                }

                $amounts = $this->computeSplit($newTotal, $pcts);

                $material = $data['material_responsibility'] ?? $proposal->material_responsibility;
                $matDetails = array_key_exists('material_details', $data)
                    ? $data['material_details']
                    : $proposal->material_details;
                if ($material === 'labour_material' && empty($matDetails)) {
                    return $this->err('श्रम + सामग्री चुनने पर सामग्री का विवरण दर्ज करना आवश्यक है।', 422);
                }

                $proposal->total_amount       = $newTotal;
                $proposal->duration_days      = (int) ($data['duration_days'] ?? $proposal->duration_days);
                $proposal->advance_percent    = $pcts['advance'];
                $proposal->during_percent     = $pcts['during'];
                $proposal->completion_percent = $pcts['completion'];
                $proposal->final_percent      = $pcts['final'];
                $proposal->advance_amount     = $amounts['advance'];
                $proposal->during_amount      = $amounts['during'];
                $proposal->completion_amount  = $amounts['completion'];
                $proposal->final_amount       = $amounts['final'];
                if (isset($data['start_date']))  { $proposal->start_date = $data['start_date']; }
                if (isset($data['start_time']))  { $proposal->start_time = $data['start_time']; }
                $proposal->material_responsibility = $material;
                $proposal->material_details   = $matDetails;
                if (array_key_exists('quality_terms', $data)) { $proposal->quality_terms = $data['quality_terms']; }

                $newVersion = (int) $proposal->current_version + 1;
                $snapshot   = Svc::snapshot($proposal);

                $history = $proposal->version_history ?? [];
                $history[] = Svc::makeVersionEntry(
                    $newVersion,
                    $role,
                    $user->id,
                    $snapshot,
                    $previous,
                    $data['voice_note_url'] ?? null,
                    $data['note'] ?? null
                );

                $proposal->version_history  = $history;
                $proposal->negotiated_terms = $snapshot;
                $proposal->current_version  = $newVersion;
                $proposal->status           = 'negotiating';

                $heldContractorIds = [];
                if ($role === 'contractor') {
                    // Thread private ho gaya — baaki thekedaron ko hold par daalo
                    if (!$proposal->contractor_id) {
                        $proposal->contractor_id = $user->id;
                        $heldContractorIds = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                            ->where('contractor_id', '!=', $user->id)
                            ->where('status', 'pending')
                            ->pluck('contractor_id')->all();

                        ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                            ->where('contractor_id', '!=', $user->id)
                            ->where('status', 'pending')
                            ->update(['status' => 'on_hold', 'expiry_reason' => 'thread_locked', 'updated_at' => now()]);
                    }
                    $offer->status = 'countered';
                    $offer->responded_at = now();
                    $offer->save();
                }

                $proposal->save();

                return [
                    'ok'       => true,
                    'proposal' => $proposal,
                    'role'     => $role,
                    'version'  => $newVersion,
                    'held'     => $heldContractorIds,
                ];
            });
        } catch (\Throwable $e) {
            Log::error('[ContractProposal] counter fail: ' . $e->getMessage());
            return response()->json(['detail' => 'संशोधित प्रस्ताव भेजने में समस्या हुई। कृपया दोबारा प्रयास करें।'], 500);
        }

        if (!($result['ok'] ?? false)) {
            return response()->json($result['body'], $result['code']);
        }

        /** @var ContractProposal $proposal */
        $proposal = $result['proposal'];
        $version  = $result['version'];

        // ── Notifications ────────────────────────────────────────────────────
        if ($result['role'] === 'contractor') {
            $this->fcm->sendToUser(
                userId: $proposal->customer_id,
                title: '✏️ संशोधित प्रस्ताव (V' . $version . ') आया है',
                body: 'ठेकेदार ने ₹' . number_format($proposal->total_amount, 0) . ' / ' .
                      $proposal->duration_days . ' दिन का संशोधित प्रस्ताव भेजा है।',
                type: 'contract_counter_offer',
                data: [
                    'screen'      => 'ContractVersionCompare',
                    'proposal_id' => (string) $proposal->id,
                    'version'     => (string) $version,
                ],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );

            foreach (($result['held'] ?? []) as $heldId) {
                $this->fcm->sendToUser(
                    userId: $heldId,
                    title: '⏸️ प्रस्ताव होल्ड पर',
                    body: 'इस ठेका प्रस्ताव पर किसी अन्य ठेकेदार से नेगोशिएशन शुरू हो गई है।',
                    type: 'contract_on_hold',
                    data: ['screen' => 'ContractorProposalInbox', 'proposal_id' => (string) $proposal->id],
                    bookingId: $proposal->id,
                    bookingModel: 'contract_proposals'
                );
            }
        } else {
            $this->fcm->sendToUser(
                userId: (int) $proposal->contractor_id,
                title: '🔄 ग्राहक ने पुनः संशोधन भेजा (V' . $version . ')',
                body: 'नई शर्तें: ₹' . number_format($proposal->total_amount, 0) . ' / ' .
                      $proposal->duration_days . ' दिन। कृपया जवाब दें।',
                type: 'contract_counter_offer',
                data: [
                    'screen'      => 'ContractVersionCompare',
                    'proposal_id' => (string) $proposal->id,
                    'version'     => (string) $version,
                ],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        return response()->json([
            'message'         => 'संशोधित प्रस्ताव (V' . $version . ') भेज दिया गया है।',
            'proposal_id'     => $proposal->id,
            'current_version' => $version,
            'status'          => $proposal->status,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SCREEN 4 — POST /api/contractor/proposal/{id}/accept  (FINAL ACCEPTANCE)
    // ══════════════════════════════════════════════════════════════════════════

    public function accept(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'terms_read' => 'accepted',
        ]);

        $user = $request->user();

        try {
            $result = DB::transaction(function () use ($id, $user) {
                // ── Directive #1: PESSIMISTIC_WRITE_LOCK ─────────────────────
                /** @var ContractProposal|null $proposal */
                $proposal = ContractProposal::lockForUpdate()->find($id);
                if (!$proposal) {
                    return $this->err('प्रस्ताव नहीं मिला।', 404);
                }

                $offer = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->where('contractor_id', $user->id)->lockForUpdate()->first();
                $role = $this->roleOf($proposal, $user, $offer);

                if ($role === null || $role === 'viewer') {
                    return $this->err('अनुमति नहीं है।', 403);
                }

                // Race condition: koi doosra pehle accept kar chuka
                if ($proposal->isLocked()) {
                    return $this->err(
                        $proposal->contractor_id === $user->id
                            ? 'यह कॉन्ट्रैक्ट पहले ही लॉक हो चुका है।'
                            : 'Offer Expired — यह प्रस्ताव किसी अन्य ठेकेदार द्वारा स्वीकार कर लिया गया है।',
                        409,
                        ['taken_by_another' => $proposal->contractor_id !== $user->id]
                    );
                }
                if (!$proposal->isOpen()) {
                    return $this->err($this->closedMessage($proposal), 409);
                }
                if ($proposal->isPastValidity()) {
                    $this->markExpired($proposal);
                    return $this->err('प्रस्ताव की वैधता समाप्त हो गई है (Offer Expired)।', 409);
                }

                // Contractor kaun hai? (Directive #4 — private thread gating pehle)
                if ($role === 'contractor') {
                    if (!$offer || !in_array($offer->status, ['pending', 'countered'], true)) {
                        return $this->err($this->offerBlockedMessage($offer), 409);
                    }
                    if ($proposal->contractor_id && $proposal->contractor_id !== $user->id) {
                        return $this->err('Offer Expired — यह प्रस्ताव किसी अन्य ठेकेदार के साथ नेगोशिएशन में है।', 409);
                    }
                    $contractorId = $user->id;
                } else {
                    if (!$proposal->contractor_id) {
                        return $this->err('अभी किसी ठेकेदार ने प्रस्ताव पर जवाब नहीं दिया है।', 409);
                    }
                    $contractorId = (int) $proposal->contractor_id;
                    $offer = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                        ->where('contractor_id', $contractorId)->lockForUpdate()->first();
                    if (!$offer) {
                        return $this->err('ठेकेदार का ऑफ़र रिकॉर्ड नहीं मिला।', 409);
                    }
                }

                // ── Platform Term #3: Non-Self Acceptance Rule ───────────────
                // User-ID se compare karte hain (role string se nahi), kyunki ek
                // proposal par kai thekedar ho sakte hain.
                $authorId = $proposal->lastVersionAuthorId();
                if ($authorId !== null && $authorId === (int) $user->id) {
                    return $this->err(
                        'यह संस्करण (V' . $proposal->current_version . ') आपने भेजा था, इसलिए आप इसे स्वयं स्वीकार नहीं कर सकते — ' .
                        'केवल दूसरा पक्ष इसे स्वीकार कर सकता है।',
                        400
                    );
                }
                if ($authorId === null && $proposal->lastVersionAuthor() === $role) {
                    return $this->err('यह संस्करण आप ही की ओर से भेजा गया था — इसे दूसरा पक्ष ही स्वीकार कर सकता है।', 400);
                }

                $finalValue = (float) $proposal->total_amount;
                $fee        = Svc::platformFee($finalValue);

                // ── Directive #3: 2% wallet check + automatic deduction ───────
                $bypass = (bool) env('WALLET_CHECK_BYPASS', false);
                if ($bypass) {
                    Log::info("[DEV BYPASS] 2% fee (₹{$fee}) debit skipped for proposal #{$proposal->id}");
                } else {
                    $wallet = Wallet::where('user_id', $contractorId)->lockForUpdate()->first();
                    $balance = (float) ($wallet?->balance ?? 0);
                    if (!$wallet || $balance < $fee) {
                        $missing = round($fee - $balance, 2);
                        return $this->err(
                            $role === 'contractor'
                                ? 'पर्याप्त वॉलेट बैलेंस नहीं है। कृपया ₹' . number_format($missing, 2) . ' का रिचार्ज करें।'
                                : 'ठेकेदार के वॉलेट में ₹' . number_format($missing, 2) . ' की कमी है। ' .
                                  'कॉन्ट्रैक्ट लॉक नहीं हो सका — उन्हें रिचार्ज करने को कहें।',
                            400,
                            [
                                'wallet_short'     => true,
                                'wallet_balance'   => $balance,
                                'required_balance' => $fee,
                                'missing_amount'   => $missing,
                            ]
                        );
                    }
                    $wallet->balance = round($balance - $fee, 2);
                    $wallet->save();
                }

                // ── Contract Lock ────────────────────────────────────────────
                $proposal->contractor_id     = $contractorId;
                $proposal->contract_id       = Svc::generateContractId();
                $proposal->status            = 'locked';
                $proposal->final_version     = (int) $proposal->current_version;
                $proposal->locked_at         = now();
                $proposal->platform_fee      = $fee;
                $proposal->fee_debited       = true;
                $proposal->contacts_unlocked = true;   // Platform Term #4
                $proposal->certificate_token = Str::random(48);
                $proposal->save();

                // Tier 3 — Final_Contract_Summary
                $proposal->load(['customer', 'contractor']);
                $proposal->final_contract_summary = Svc::buildFinalSummary($proposal);
                $proposal->save();

                // Winner + Auto-expiry for baaki sab (Directive #1)
                $offer->status = 'accepted';
                $offer->responded_at = now();
                $offer->save();

                $losers = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->where('contractor_id', '!=', $contractorId)
                    ->whereIn('status', ['pending', 'on_hold', 'countered'])
                    ->pluck('contractor_id')->all();

                ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->where('contractor_id', '!=', $contractorId)
                    ->whereIn('status', ['pending', 'on_hold', 'countered'])
                    ->update(['status' => 'expired', 'expiry_reason' => 'taken_by_other', 'updated_at' => now()]);

                ProviderProfile::where('user_id', $contractorId)->increment('total_bookings');

                return [
                    'ok' => true, 'proposal' => $proposal, 'role' => $role,
                    'fee' => $fee, 'losers' => $losers, 'bypass' => $bypass,
                ];
            });
        } catch (\Throwable $e) {
            Log::error('[ContractProposal] accept fail: ' . $e->getMessage());
            return response()->json(['detail' => 'स्वीकृति प्रक्रिया में समस्या हुई। कृपया दोबारा प्रयास करें।'], 500);
        }

        if (!($result['ok'] ?? false)) {
            return response()->json($result['body'], $result['code']);
        }

        /** @var ContractProposal $proposal */
        $proposal = $result['proposal'];

        // ── Directive #7: watermarked certificate (transaction ke baahar) ─────
        $path = Svc::generateCertificate($proposal);
        if ($path) {
            $proposal->certificate_path = $path;
            $proposal->save();
        }

        // ─── Agent Residual Commission (0.20% / Thekedar) ───────────────────
        try {
            app(\App\Services\CommissionService::class)->processContractorOrVehicleBookingResidual(
                (int) $proposal->contractor_id,
                $proposal->id,
                (float) $proposal->total_amount,
                'Thekedar'
            );
        } catch (\Throwable $e) {
            Log::warning('[ContractProposal] Agent residual commission error: ' . $e->getMessage());
        }

        // ── Notifications ────────────────────────────────────────────────────
        foreach ([$proposal->customer_id, $proposal->contractor_id] as $uid) {
            $this->fcm->sendToUser(
                userId: (int) $uid,
                title: '🎉 कॉन्ट्रैक्ट बन गया!',
                body: 'Contract ID: ' . $proposal->contract_id . ' — ₹' .
                      number_format($proposal->total_amount, 0) . ' पर सहमति लॉक हो गई। संपर्क विवरण अनलॉक हो गए हैं।',
                type: 'contract_locked',
                data: [
                    'screen'      => 'DigitalContract',
                    'proposal_id' => (string) $proposal->id,
                    'contract_id' => (string) $proposal->contract_id,
                ],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        foreach (($result['losers'] ?? []) as $loserId) {
            $this->fcm->sendToUser(
                userId: (int) $loserId,
                title: '⌛ Offer Expired',
                body: 'यह ठेका प्रस्ताव किसी अन्य ठेकेदार द्वारा स्वीकार कर लिया गया है।',
                type: 'contract_expired',
                data: ['screen' => 'ContractorProposalInbox', 'proposal_id' => (string) $proposal->id],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        Log::info("[ContractProposal] {$proposal->contract_id} LOCKED — proposal #{$proposal->id}, " .
            "contractor #{$proposal->contractor_id}, fee ₹{$result['fee']}");

        return response()->json([
            'message'        => '🎉 कॉन्ट्रैक्ट बन गया! ' . $proposal->contract_id,
            'contract_id'    => $proposal->contract_id,
            'proposal_id'    => $proposal->id,
            'final_version'  => $proposal->final_version,
            'status'         => $proposal->status,
            'platform_fee'   => $result['fee'],
            'fee_percent'    => Svc::FEE_PERCENT,
            'bypass_mode'    => $result['bypass'],
            'contacts_unlocked' => true,
            'certificate_url'   => $this->certificateUrl($proposal),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/contractor/proposal/{id}/reject
    // ══════════════════════════════════════════════════════════════════════════

    public function reject(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'sometimes|nullable|string|max:500']);
        $user = $request->user();

        try {
            $result = DB::transaction(function () use ($id, $user, $data) {
                /** @var ContractProposal|null $proposal */
                $proposal = ContractProposal::lockForUpdate()->find($id);
                if (!$proposal) {
                    return $this->err('प्रस्ताव नहीं मिला।', 404);
                }

                $offer = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->where('contractor_id', $user->id)->lockForUpdate()->first();
                $role  = $this->roleOf($proposal, $user, $offer);

                if ($role === null || $role === 'viewer') {
                    return $this->err('अनुमति नहीं है।', 403);
                }
                if ($proposal->isLocked()) {
                    return $this->err('कॉन्ट्रैक्ट लॉक हो चुका है — अब अस्वीकार नहीं किया जा सकता।', 409);
                }
                if (!$proposal->isOpen()) {
                    return $this->err($this->closedMessage($proposal), 409);
                }

                $notify = [];
                $revived = [];

                if ($role === 'contractor') {
                    if (!$offer) {
                        return $this->err('आपका ऑफ़र रिकॉर्ड नहीं मिला।', 404);
                    }
                    $offer->status = 'rejected';
                    $offer->responded_at = now();
                    $offer->save();

                    $wasThreadOwner = ((int) $proposal->contractor_id === (int) $user->id);

                    if ($wasThreadOwner) {
                        // Thread band — hold wale thekedaron ko wapas activate karo
                        $revived = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                            ->where('status', 'on_hold')->pluck('contractor_id')->all();

                        ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                            ->where('status', 'on_hold')
                            ->update(['status' => 'pending', 'expiry_reason' => null, 'updated_at' => now()]);

                        $proposal->contractor_id = null;

                        // Shartein V1 par revert (audit trail intact rehta hai)
                        if ((int) $proposal->current_version > 1) {
                            $this->revertToV1($proposal, 'ठेकेदार ने नेगोशिएशन छोड़ दी — शर्तें V1 पर वापस।');
                        }
                    }

                    $remaining = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                        ->whereIn('status', ['pending', 'countered'])->count();

                    if ($remaining === 0) {
                        $proposal->status = 'rejected';
                        $proposal->reject_reason = $data['reason'] ?? 'सभी ठेकेदारों ने अस्वीकार किया';
                    } else {
                        $proposal->status = $proposal->contractor_id ? 'negotiating' : 'broadcasted';
                    }
                    $proposal->save();

                    $notify[] = [
                        'user_id' => $proposal->customer_id,
                        'title'   => '✕ ठेकेदार ने प्रस्ताव अस्वीकार किया',
                        'body'    => $remaining === 0
                            ? 'सभी ठेकेदारों ने प्रस्ताव अस्वीकार कर दिया। कृपया नया प्रस्ताव भेजें।'
                            : 'एक ठेकेदार ने अस्वीकार किया। अन्य ठेकेदार अभी भी जवाब दे सकते हैं।',
                        'screen'  => $remaining === 0 ? 'MyContractProposals' : 'ContractVersionCompare',
                    ];
                } else {
                    // Customer poora proposal reject kar raha hai
                    $targets = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                        ->whereIn('status', ['pending', 'on_hold', 'countered'])
                        ->pluck('contractor_id')->all();

                    ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                        ->whereIn('status', ['pending', 'on_hold', 'countered'])
                        ->update(['status' => 'cancelled', 'expiry_reason' => 'customer_rejected', 'updated_at' => now()]);

                    $proposal->status = 'rejected';
                    $proposal->reject_reason = $data['reason'] ?? null;
                    $proposal->save();

                    foreach ($targets as $tid) {
                        $notify[] = [
                            'user_id' => $tid,
                            'title'   => '✕ प्रस्ताव समाप्त',
                            'body'    => 'ग्राहक ने यह ठेका प्रस्ताव अस्वीकार / समाप्त कर दिया है।',
                            'screen'  => 'ContractorProposalInbox',
                        ];
                    }
                }

                foreach ($revived as $rid) {
                    $notify[] = [
                        'user_id' => $rid,
                        'title'   => '🔔 प्रस्ताव फिर उपलब्ध',
                        'body'    => 'यह ठेका प्रस्ताव दोबारा उपलब्ध है — अब आप जवाब दे सकते हैं।',
                        'screen'  => 'ContractorProposalDetail',
                    ];
                }

                return ['ok' => true, 'proposal' => $proposal, 'notify' => $notify, 'role' => $role];
            });
        } catch (\Throwable $e) {
            Log::error('[ContractProposal] reject fail: ' . $e->getMessage());
            return response()->json(['detail' => 'अस्वीकार करने में समस्या हुई।'], 500);
        }

        if (!($result['ok'] ?? false)) {
            return response()->json($result['body'], $result['code']);
        }

        /** @var ContractProposal $proposal */
        $proposal = $result['proposal'];

        foreach ($result['notify'] as $n) {
            $this->fcm->sendToUser(
                userId: (int) $n['user_id'],
                title: $n['title'],
                body: $n['body'],
                type: 'contract_rejected',
                data: ['screen' => $n['screen'], 'proposal_id' => (string) $proposal->id],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        return response()->json([
            'message'     => 'प्रस्ताव अस्वीकार कर दिया गया।',
            'proposal_id' => $proposal->id,
            'status'      => $proposal->status,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/contractor/proposal/{id}/cancel  (Customer, lock se pehle)
    // ══════════════════════════════════════════════════════════════════════════

    public function cancel(Request $request, int $id): JsonResponse
    {
        $user     = $request->user();
        $proposal = ContractProposal::where('id', $id)->where('customer_id', $user->id)->first();

        if (!$proposal) {
            return response()->json(['detail' => 'प्रस्ताव नहीं मिला।'], 404);
        }
        if ($proposal->isLocked()) {
            return response()->json([
                'detail' => 'कॉन्ट्रैक्ट लॉक हो चुका है — इसे रद्द नहीं किया जा सकता। ' .
                            'परिवर्तन के लिए "Change Request / Amendment" का उपयोग करें।',
            ], 409);
        }
        if (!$proposal->isOpen()) {
            return response()->json(['detail' => $this->closedMessage($proposal)], 409);
        }

        $targets = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
            ->whereIn('status', ['pending', 'on_hold', 'countered'])
            ->pluck('contractor_id')->all();

        ContractProposalOffer::where('contract_proposal_id', $proposal->id)
            ->whereIn('status', ['pending', 'on_hold', 'countered'])
            ->update(['status' => 'cancelled', 'expiry_reason' => 'customer_cancelled', 'updated_at' => now()]);

        $proposal->status = 'cancelled';
        $proposal->save();

        foreach ($targets as $tid) {
            $this->fcm->sendToUser(
                userId: (int) $tid,
                title: '✕ प्रस्ताव रद्द',
                body: 'ग्राहक ने यह ठेका प्रस्ताव रद्द कर दिया है।',
                type: 'contract_cancelled',
                data: ['screen' => 'ContractorProposalInbox', 'proposal_id' => (string) $proposal->id],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        return response()->json([
            'message' => 'प्रस्ताव रद्द कर दिया गया। कोई शुल्क नहीं लगा।',
            'status'  => $proposal->status,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Uploads — voice note (counter offer) + vistrit Agreement (optional)
    // ══════════════════════════════════════════════════════════════════════════

    /** POST /api/contractor/proposal/upload-media */
    public function uploadMedia(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240|mimetypes:audio/mpeg,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/webm,audio/ogg,video/mp4,application/octet-stream',
        ]);

        $path  = $request->file('file')->store('contract-media', 'public');
        $token = Str::random(48);

        // Token → path mapping cache mein (media short-lived hai)
        \Illuminate\Support\Facades\Cache::put('cmedia:' . $token, [
            'path' => $path,
            'mime' => $request->file('file')->getClientMimeType(),
        ], now()->addDays(90));

        return response()->json([
            'url'  => url('/api/contract/media/' . $token),
            'path' => $path,
        ], 201);
    }

    /** POST /api/contractor/proposal/{id}/agreement */
    public function uploadAgreement(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:15360|mimes:pdf,jpg,jpeg,png,webp',
        ]);

        $user     = $request->user();
        $proposal = ContractProposal::with('offers')->find($id);

        if (!$proposal) {
            return response()->json(['detail' => 'प्रस्ताव नहीं मिला।'], 404);
        }
        if (!in_array($user->id, [(int) $proposal->customer_id, (int) $proposal->contractor_id], true)) {
            return response()->json(['detail' => 'अनुमति नहीं है।'], 403);
        }
        if (!$proposal->isLocked()) {
            return response()->json(['detail' => 'Agreement अपलोड करने के लिए पहले कॉन्ट्रैक्ट लॉक होना ज़रूरी है।'], 409);
        }

        // Purani file hatao
        if ($proposal->agreement_path && Storage::disk('public')->exists($proposal->agreement_path)) {
            Storage::disk('public')->delete($proposal->agreement_path);
        }

        $file = $request->file('file');
        $proposal->agreement_path  = $file->store('contract-agreements', 'public');
        $proposal->agreement_mime  = $file->getClientMimeType();
        $proposal->agreement_token = $proposal->agreement_token ?: Str::random(48);
        $proposal->save();

        $other = $user->id === (int) $proposal->customer_id ? $proposal->contractor_id : $proposal->customer_id;
        if ($other) {
            $this->fcm->sendToUser(
                userId: (int) $other,
                title: '📎 विस्तृत Agreement अपलोड हुआ',
                body: 'कॉन्ट्रैक्ट ' . $proposal->contract_id . ' के लिए विस्तृत Agreement अपलोड किया गया है।',
                type: 'contract_agreement',
                data: ['screen' => 'DigitalContract', 'proposal_id' => (string) $proposal->id],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        return response()->json([
            'message'       => 'Agreement अपलोड हो गया।',
            'agreement_url' => $this->agreementUrl($proposal),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Amendment (परिवर्तन) — lock ke baad dono paksh ki sahmati
    // ══════════════════════════════════════════════════════════════════════════

    /** POST /api/contractor/proposal/{id}/amendment */
    public function requestAmendment(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'total_amount'   => 'sometimes|numeric|min:1|max:999999999',
            'duration_days'  => 'sometimes|integer|min:1|max:3650',
            'start_date'     => 'sometimes|date',
            'start_time'     => 'sometimes|string|max:20',
            'quality_terms'  => 'sometimes|nullable|string|max:2000',
            'material_responsibility' => 'sometimes|in:labour_only,labour_material',
            'material_details' => 'sometimes|nullable|string|max:2000',
            'reason'         => 'required|string|max:1000',
        ]);

        $user     = $request->user();
        $proposal = ContractProposal::find($id);

        if (!$proposal || !$proposal->isLocked()) {
            return response()->json(['detail' => 'लॉक हुआ कॉन्ट्रैक्ट नहीं मिला।'], 404);
        }
        if (!in_array($user->id, [(int) $proposal->customer_id, (int) $proposal->contractor_id], true)) {
            return response()->json(['detail' => 'अनुमति नहीं है।'], 403);
        }
        if ($proposal->amendment_status === 'requested') {
            return response()->json([
                'detail' => 'एक परिवर्तन अनुरोध पहले से लंबित है। पहले उस पर निर्णय लें।',
            ], 409);
        }

        $payload = collect($data)->except('reason')->all();
        if (empty($payload)) {
            return response()->json(['detail' => 'कम से कम एक शर्त में परिवर्तन प्रस्तावित करें।'], 422);
        }

        $proposal->amendment_status       = 'requested';
        $proposal->amendment_requested_by = $user->id;
        $proposal->amendment_payload      = $payload;
        $proposal->amendment_reason       = $data['reason'];
        $proposal->save();

        $other = $user->id === (int) $proposal->customer_id ? $proposal->contractor_id : $proposal->customer_id;
        $this->fcm->sendToUser(
            userId: (int) $other,
            title: '🔁 परिवर्तन अनुरोध (Amendment Request)',
            body: 'कॉन्ट्रैक्ट ' . $proposal->contract_id . ' में परिवर्तन का अनुरोध आया है। आपकी सहमति आवश्यक है।',
            type: 'contract_amendment',
            data: ['screen' => 'DigitalContract', 'proposal_id' => (string) $proposal->id],
            bookingId: $proposal->id,
            bookingModel: 'contract_proposals'
        );

        return response()->json([
            'message'          => 'परिवर्तन अनुरोध भेज दिया गया। दूसरे पक्ष की सहमति का इंतज़ार करें।',
            'amendment_status' => 'requested',
        ]);
    }

    /** POST /api/contractor/proposal/{id}/amendment/respond */
    public function respondAmendment(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'decision' => 'required|in:approve,reject',
        ]);

        $user     = $request->user();
        $proposal = ContractProposal::with(['customer', 'contractor'])->find($id);

        if (!$proposal || !$proposal->isLocked() || $proposal->amendment_status !== 'requested') {
            return response()->json(['detail' => 'कोई लंबित परिवर्तन अनुरोध नहीं मिला।'], 404);
        }
        if (!in_array($user->id, [(int) $proposal->customer_id, (int) $proposal->contractor_id], true)) {
            return response()->json(['detail' => 'अनुमति नहीं है।'], 403);
        }
        if ((int) $proposal->amendment_requested_by === (int) $user->id) {
            return response()->json([
                'detail' => 'यह अनुरोध आपने भेजा था — इसे दूसरा पक्ष ही स्वीकार कर सकता है।',
            ], 400);
        }

        if ($data['decision'] === 'reject') {
            $proposal->amendment_status = 'rejected';
            $proposal->save();

            $this->fcm->sendToUser(
                userId: (int) $proposal->amendment_requested_by,
                title: '✕ परिवर्तन अनुरोध अस्वीकृत',
                body: 'दूसरे पक्ष ने परिवर्तन अनुरोध अस्वीकार कर दिया। मूल शर्तें लागू रहेंगी।',
                type: 'contract_amendment',
                data: ['screen' => 'DigitalContract', 'proposal_id' => (string) $proposal->id],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );

            return response()->json(['message' => 'परिवर्तन अनुरोध अस्वीकार कर दिया गया।', 'amendment_status' => 'rejected']);
        }

        // Approve → naya version + summary + certificate regenerate
        $payload  = $proposal->amendment_payload ?? [];
        $previous = Svc::snapshot($proposal);

        if (isset($payload['total_amount'])) {
            $total = (float) $payload['total_amount'];
            $pcts  = [
                'advance'    => (float) $proposal->advance_percent,
                'during'     => (float) $proposal->during_percent,
                'completion' => (float) $proposal->completion_percent,
                'final'      => (float) $proposal->final_percent,
            ];
            $amounts = $this->computeSplit($total, $pcts);
            $proposal->total_amount      = $total;
            $proposal->advance_amount    = $amounts['advance'];
            $proposal->during_amount     = $amounts['during'];
            $proposal->completion_amount = $amounts['completion'];
            $proposal->final_amount      = $amounts['final'];
        }
        foreach (['duration_days', 'start_date', 'start_time', 'quality_terms', 'material_responsibility', 'material_details'] as $f) {
            if (array_key_exists($f, $payload)) {
                $proposal->{$f} = $payload[$f];
            }
        }

        $newVersion = (int) $proposal->current_version + 1;
        $snapshot   = Svc::snapshot($proposal);
        $history    = $proposal->version_history ?? [];
        $history[]  = Svc::makeVersionEntry(
            $newVersion,
            (int) $proposal->amendment_requested_by === (int) $proposal->customer_id ? 'customer' : 'contractor',
            (int) $proposal->amendment_requested_by,
            $snapshot,
            $previous,
            null,
            'परिवर्तन (Amendment) — दोनों पक्षों की सहमति से। कारण: ' . ($proposal->amendment_reason ?? '—')
        );

        $proposal->version_history  = $history;
        $proposal->negotiated_terms = $snapshot;
        $proposal->current_version  = $newVersion;
        $proposal->final_version    = $newVersion;
        $proposal->amendment_status = 'approved';
        $proposal->save();

        $proposal->final_contract_summary = Svc::buildFinalSummary($proposal);
        if ($proposal->certificate_path && Storage::disk('public')->exists($proposal->certificate_path)) {
            Storage::disk('public')->delete($proposal->certificate_path);
        }
        $proposal->certificate_path = Svc::generateCertificate($proposal);
        $proposal->save();

        foreach ([$proposal->customer_id, $proposal->contractor_id] as $uid) {
            $this->fcm->sendToUser(
                userId: (int) $uid,
                title: '✅ परिवर्तन स्वीकृत (V' . $newVersion . ')',
                body: 'कॉन्ट्रैक्ट ' . $proposal->contract_id . ' की शर्तें अपडेट हो गईं। नया प्रमाणपत्र तैयार है।',
                type: 'contract_amendment',
                data: ['screen' => 'DigitalContract', 'proposal_id' => (string) $proposal->id],
                bookingId: $proposal->id,
                bookingModel: 'contract_proposals'
            );
        }

        return response()->json([
            'message'          => 'परिवर्तन स्वीकृत — कॉन्ट्रैक्ट V' . $newVersion . ' के रूप में अपडेट हो गया।',
            'amendment_status' => 'approved',
            'final_version'    => $newVersion,
            'note'             => '2% प्लेटफ़ॉर्म शुल्क मूल कॉन्ट्रैक्ट मूल्य पर पहले ही लिया जा चुका है — परिवर्तन पर अतिरिक्त शुल्क नहीं लगा।',
            'certificate_url'  => $this->certificateUrl($proposal),
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Public (token-based) file serving — certificate / agreement / voice note
    // ══════════════════════════════════════════════════════════════════════════

    public function certificate(string $token)
    {
        $proposal = ContractProposal::where('certificate_token', $token)->first();
        if (!$proposal) {
            abort(404, 'Certificate not found');
        }

        // Path missing ho to on-the-fly regenerate
        if (!$proposal->certificate_path || !Storage::disk('public')->exists($proposal->certificate_path)) {
            $proposal->load(['customer', 'contractor']);
            return response(Svc::certificateHtml($proposal), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
        }

        return response(Storage::disk('public')->get($proposal->certificate_path), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function agreementFile(string $token)
    {
        $proposal = ContractProposal::where('agreement_token', $token)->first();
        if (!$proposal || !$proposal->agreement_path || !Storage::disk('public')->exists($proposal->agreement_path)) {
            abort(404, 'Agreement not found');
        }

        return response(Storage::disk('public')->get($proposal->agreement_path), 200, [
            'Content-Type'        => $proposal->agreement_mime ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="' . ($proposal->contract_id ?: 'agreement') . '"',
        ]);
    }

    public function mediaFile(string $token)
    {
        $meta = \Illuminate\Support\Facades\Cache::get('cmedia:' . $token);
        if (!$meta || !Storage::disk('public')->exists($meta['path'])) {
            abort(404, 'Media not found');
        }

        return response(Storage::disk('public')->get($meta['path']), 200, [
            'Content-Type' => $meta['mime'] ?: 'application/octet-stream',
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Internal helpers
    // ══════════════════════════════════════════════════════════════════════════

    /** Directive #5 — sirf usi skill ke registered thekedaron ko broadcast. */
    private function broadcast(ContractProposal $proposal): array
    {
        $lat = $proposal->lat !== null ? (float) $proposal->lat : null;
        $lng = $proposal->lng !== null ? (float) $proposal->lng : null;

        $base = ProviderProfile::with(['user'])
            ->where('category', 'thekedar')
            ->where('user_id', '!=', $proposal->customer_id);

        $matched  = (clone $base)->whereJsonContains('contract_types', $proposal->contractor_type)->get();
        $fallback = false;

        if ($matched->isEmpty()) {
            // Dev / early-stage safety: kisi ne contract_types set nahi kiya to sabhi thekedar
            $matched  = (clone $base)->get();
            $fallback = true;
        }

        $matched = $matched->filter(fn ($p) => $p->user !== null);

        // Distance map (model attributes ko pollute nahi karte)
        $dist = [];
        if ($lat !== null && $lng !== null) {
            foreach ($matched as $p) {
                $dist[$p->user_id] = ($p->current_lat !== null && $p->current_lng !== null)
                    ? round($this->haversineKm($lat, $lng, (float) $p->current_lat, (float) $p->current_lng), 2)
                    : null;
            }

            // Provider ke service radius ka samman (unknown location wale bhi shaamil)
            $inRadius = $matched->filter(function ($p) use ($dist) {
                $d = $dist[$p->user_id] ?? null;
                return $d === null || $d <= max((float) ($p->radius_km ?: 0), 50);
            });

            $matched = ($inRadius->isEmpty() ? $matched : $inRadius)
                ->sortBy(fn ($p) => $dist[$p->user_id] ?? 9999)
                ->take(25)
                ->values();
        } else {
            $matched = $matched->take(25)->values();
        }

        $typeLabel = Svc::label('contractor_type', $proposal->contractor_type);
        $place     = trim(($proposal->district ?? '') . ($proposal->state ? ', ' . $proposal->state : ''), ', ');
        $count     = 0;

        foreach ($matched as $profile) {
            try {
                ContractProposalOffer::updateOrCreate(
                    [
                        'contract_proposal_id' => $proposal->id,
                        'contractor_id'        => $profile->user_id,
                    ],
                    [
                        'status'      => 'pending',
                        'distance_km' => $dist[$profile->user_id] ?? null,
                        'notified_at' => now(),
                    ]
                );
                $count++;

                $this->fcm->sendToUser(
                    userId: $profile->user_id,
                    title: '📄 नया ठेका प्रस्ताव (V1)',
                    body: '👷 ' . $typeLabel . ' — ₹' . number_format((float) $proposal->total_amount, 0) .
                          ($place !== '' ? ' · ' . $place : '') . '. ' . $proposal->validity_hours . ' घंटे में जवाब दें।',
                    type: 'contract_proposal',
                    data: [
                        'screen'      => 'ContractorProposalDetail',
                        'proposal_id' => (string) $proposal->id,
                        'version'     => '1',
                    ],
                    bookingId: $proposal->id,
                    bookingModel: 'contract_proposals'
                );
            } catch (\Throwable $e) {
                Log::warning('[ContractProposal] broadcast to #' . $profile->user_id . ' fail: ' . $e->getMessage());
            }
        }

        return ['count' => $count, 'fallback' => $fallback];
    }

    /** PART-E — percent se amount nikalo, rounding ka antar `final` mein absorb. */
    private function computeSplit(float $total, array $pcts): array
    {
        $advance    = round($total * $pcts['advance'] / 100, 2);
        $during     = round($total * $pcts['during'] / 100, 2);
        $completion = round($total * $pcts['completion'] / 100, 2);
        $final      = round($total - $advance - $during - $completion, 2);

        if ($final < 0) {
            $final = 0.0;
        }

        return compact('advance', 'during', 'completion', 'final');
    }

    /**
     * Agar user ne sirf advance% badla hai to baaki teen ko proportionally
     * adjust kar do — taki kul yog 100% bana rahe.
     */
    private function rebalancePercents(array $pcts, array $data): array
    {
        $touched = array_values(array_filter(
            ['advance', 'during', 'completion', 'final'],
            fn ($k) => array_key_exists($k . '_percent', $data)
        ));
        $untouched = array_values(array_diff(['advance', 'during', 'completion', 'final'], $touched));

        if (empty($untouched)) {
            return $pcts;
        }

        $lockedSum = 0.0;
        foreach ($touched as $k) {
            $lockedSum += $pcts[$k];
        }
        $remaining = round(100 - $lockedSum, 2);
        if ($remaining < 0) {
            return $pcts;
        }

        $oldSum = 0.0;
        foreach ($untouched as $k) {
            $oldSum += $pcts[$k];
        }

        if ($oldSum <= 0) {
            $each = round($remaining / count($untouched), 2);
            foreach ($untouched as $k) {
                $pcts[$k] = $each;
            }
        } else {
            foreach ($untouched as $k) {
                $pcts[$k] = round($remaining * ($pcts[$k] / $oldSum), 2);
            }
        }

        // Rounding ka antar aakhiri untouched field mein daal do
        $diff = round(100 - array_sum($pcts), 2);
        if (abs($diff) > 0.001) {
            $last = end($untouched);
            $pcts[$last] = round($pcts[$last] + $diff, 2);
        }

        return $pcts;
    }

    private function haversineKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R  = 6371;
        $dL = deg2rad($lat2 - $lat1);
        $dO = deg2rad($lon2 - $lon1);
        $a  = sin($dL / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dO / 2) ** 2;
        return $R * 2 * asin(sqrt($a));
    }

    /** customer | contractor | viewer | null */
    private function roleOf(ContractProposal $proposal, User $user, ?ContractProposalOffer $offer): ?string
    {
        if ((int) $proposal->customer_id === (int) $user->id) {
            return 'customer';
        }
        if ((int) $proposal->contractor_id === (int) $user->id) {
            return 'contractor';
        }
        if ($offer !== null) {
            return 'contractor';
        }
        return null;
    }

    private function walletCheck(int $contractorId, float $contractValue): array
    {
        $required = Svc::platformFee($contractValue);

        if (env('WALLET_CHECK_BYPASS', false)) {
            return ['ok' => true, 'balance' => $required, 'required' => $required, 'missing' => 0.0, 'message' => null, 'bypass' => true];
        }

        $balance = (float) (Wallet::where('user_id', $contractorId)->value('balance') ?? 0);
        $missing = round(max(0, $required - $balance), 2);

        return [
            'ok'       => $balance >= $required,
            'balance'  => $balance,
            'required' => $required,
            'missing'  => $missing,
            'message'  => 'पर्याप्त वॉलेट बैलेंस नहीं है। कृपया ₹' . number_format($missing, 2) . ' का रिचार्ज करें।',
            'bypass'   => false,
        ];
    }

    /** Directive #6 — lazy expiry (cron ke saath double safety). */
    private function expireIfNeeded(ContractProposal $proposal): void
    {
        if ($proposal->isOpen() && $proposal->isPastValidity()) {
            $this->markExpired($proposal);
        }
    }

    private function markExpired(ContractProposal $proposal): void
    {
        $proposal->status = 'expired';
        $proposal->save();

        ContractProposalOffer::where('contract_proposal_id', $proposal->id)
            ->whereIn('status', ['pending', 'on_hold', 'countered'])
            ->update(['status' => 'expired', 'expiry_reason' => 'timeout', 'updated_at' => now()]);

        Log::info("[ContractProposal] #{$proposal->id} auto-EXPIRED (validity {$proposal->validity_hours}h)");
    }

    /** List screens kholte waqt purane proposals ko expire kar do. */
    private function expireStaleFor(int $userId, string $side): void
    {
        $query = ContractProposal::whereIn('status', ['broadcasted', 'negotiating'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now());

        if ($side === 'customer') {
            $query->where('customer_id', $userId);
        } else {
            $query->whereIn('id', function ($q) use ($userId) {
                $q->select('contract_proposal_id')->from('contract_proposal_offers')
                  ->where('contractor_id', $userId);
            });
        }

        foreach ($query->limit(50)->get() as $stale) {
            $this->markExpired($stale);
        }
    }

    /** Thread owner ke reject par shartein V1 par wapas (audit trail intact). */
    private function revertToV1(ContractProposal $proposal, string $note): void
    {
        $v1 = $proposal->versionEntry(1);
        if (!$v1 || empty($v1['values'])) {
            return;
        }

        $previous = Svc::snapshot($proposal);
        $values   = $v1['values'];

        foreach ([
            'total_amount', 'advance_amount', 'advance_percent', 'during_amount', 'during_percent',
            'completion_amount', 'completion_percent', 'final_amount', 'final_percent',
            'duration_days', 'start_date', 'start_time',
            'material_responsibility', 'material_details', 'quality_terms',
        ] as $f) {
            if (array_key_exists($f, $values)) {
                $proposal->{$f} = $values[$f];
            }
        }

        $newVersion = (int) $proposal->current_version + 1;
        $history    = $proposal->version_history ?? [];
        $history[]  = Svc::makeVersionEntry($newVersion, 'system', 0, $values, $previous, null, $note);

        $proposal->version_history  = $history;
        $proposal->negotiated_terms = $values;
        $proposal->current_version  = $newVersion;
    }

    private function closedMessage(ContractProposal $proposal): string
    {
        return match ($proposal->status) {
            'locked'    => 'यह प्रस्ताव लॉक हो चुका है।',
            'rejected'  => 'यह प्रस्ताव अस्वीकृत हो चुका है।',
            'expired'   => 'प्रस्ताव की वैधता समाप्त हो गई है (Offer Expired)।',
            'cancelled' => 'ग्राहक ने यह प्रस्ताव रद्द कर दिया है।',
            default     => 'इस प्रस्ताव पर अब कार्यवाही संभव नहीं है।',
        };
    }

    private function offerBlockedMessage(?ContractProposalOffer $offer): string
    {
        return match ($offer?->status) {
            null        => 'यह प्रस्ताव आपको नहीं भेजा गया था।',
            'on_hold'   => 'इस प्रस्ताव पर किसी अन्य ठेकेदार से नेगोशिएशन चल रही है। वह समाप्त होने पर आपको सूचित किया जाएगा।',
            'rejected'  => 'आपने यह प्रस्ताव पहले ही अस्वीकार कर दिया है।',
            'expired'   => 'Offer Expired — यह प्रस्ताव किसी अन्य ठेकेदार द्वारा ले लिया गया या समय समाप्त हो गया।',
            'cancelled' => 'ग्राहक ने यह प्रस्ताव रद्द कर दिया है।',
            'accepted'  => 'यह प्रस्ताव पहले ही स्वीकार हो चुका है।',
            default     => 'इस प्रस्ताव पर अब कार्यवाही संभव नहीं है।',
        };
    }

    private function certificateUrl(ContractProposal $proposal): ?string
    {
        return $proposal->certificate_token ? url('/api/contract/certificate/' . $proposal->certificate_token) : null;
    }

    private function agreementUrl(ContractProposal $proposal): ?string
    {
        return ($proposal->agreement_token && $proposal->agreement_path)
            ? url('/api/contract/agreement/' . $proposal->agreement_token)
            : null;
    }

    // ─── Presenters ───────────────────────────────────────────────────────────

    private function summaryRow(ContractProposal $p, string $side): array
    {
        return [
            'proposal_id'     => $p->id,
            'proposal_code'   => $p->proposal_code,
            'contract_id'     => $p->contract_id,
            'status'          => $p->status,
            'status_label'    => $this->statusLabel($p->status),
            'contractor_type' => $p->contractor_type,
            'contractor_type_label' => Svc::label('contractor_type', $p->contractor_type),
            'work_description' => Str::limit($p->work_description, 120),
            'total_amount'    => (float) $p->total_amount,
            'advance_percent' => (float) $p->advance_percent,
            'duration_days'   => (int) $p->duration_days,
            'material_responsibility' => $p->material_responsibility,
            'material_label'  => Svc::label('material', $p->material_responsibility),
            'start_date'      => $p->start_date?->format('Y-m-d'),
            'start_time'      => $p->start_time,
            'current_version' => (int) $p->current_version,
            'final_version'   => $p->final_version,
            'place'           => trim(($p->district ?? '') . ($p->state ? ', ' . $p->state : ''), ', '),
            'expires_at'      => $p->expires_at?->toISOString(),
            'created_at'      => $p->created_at?->toISOString(),
            'locked_at'       => $p->locked_at?->toISOString(),
            'platform_fee'    => $p->platform_fee,
            'required_fee'    => Svc::platformFee((float) $p->total_amount),
            'counterparty'    => $side === 'customer'
                ? ($p->contacts_unlocked ? ($p->contractor?->name ?: 'ठेकेदार') : 'ठेकेदार')
                : ($p->contacts_unlocked ? ($p->customer?->name ?: 'ग्राहक') : 'ग्राहक'),
            'has_agreement'   => (bool) $p->agreement_path,
        ];
    }

    private function present(ContractProposal $p, User $user, string $role, ?ContractProposalOffer $offer): array
    {
        $unlocked = (bool) $p->contacts_unlocked;
        $isCustomer = $role === 'customer';

        // Platform Term #4 — lock se pehle sirf district/state, naam-number chhupe
        $siteAddress = ($isCustomer || $unlocked)
            ? $p->site_address
            : (trim(($p->district ?? '') . ($p->state ? ', ' . $p->state : ''), ', ') ?: 'लॉक होने पर पूरा पता दिखेगा');

        $v1     = $p->versionEntry(1)['values'] ?? Svc::snapshot($p);
        $latest = $p->negotiated_terms ?? Svc::snapshot($p);

        $lastAuthor = $p->lastVersionAuthor();
        $authorId   = $p->lastVersionAuthorId();
        $selfAuthored = $authorId !== null ? $authorId === (int) $user->id : $lastAuthor === $role;

        $isOpen     = $p->isOpen() && !$p->isPastValidity();
        $offerOk    = $role === 'customer'
            ? true
            : ($offer && in_array($offer->status, ['pending', 'countered'], true));
        $threadOk   = $role === 'contractor'
            ? (!$p->contractor_id || (int) $p->contractor_id === (int) $user->id)
            : (bool) $p->contractor_id;

        $canAct     = $isOpen && $offerOk && $threadOk;
        $canAccept  = $canAct && !$selfAuthored && $lastAuthor !== null;
        $canCounter = $canAct && !$selfAuthored;

        // Contractor ke liye wallet info (Directive #3)
        $wallet = null;
        if ($role === 'contractor') {
            $w = $this->walletCheck((int) $user->id, (float) $p->total_amount);
            $wallet = [
                'balance'          => $w['balance'],
                'required_balance' => $w['required'],
                'missing_amount'   => $w['missing'],
                'sufficient'       => $w['ok'],
                'bypass'           => $w['bypass'] ?? false,
                'fee_percent'      => Svc::FEE_PERCENT,
            ];
        }

        return [
            'proposal_id'     => $p->id,
            'proposal_code'   => $p->proposal_code,
            'contract_id'     => $p->contract_id,
            'status'          => $p->status,
            'status_label'    => $this->statusLabel($p->status),
            'role'            => $role,
            'offer_status'    => $offer?->status,
            'offer_blocked_reason' => ($role === 'contractor' && !$offerOk) ? $this->offerBlockedMessage($offer) : null,
            'thread_taken_by_other' => $role === 'contractor' && $p->contractor_id && (int) $p->contractor_id !== (int) $user->id,

            // PART-A
            'contractor_type' => $p->contractor_type,
            'contractor_type_label' => Svc::label('contractor_type', $p->contractor_type),
            'work_description' => $p->work_description,
            'work_quantity'   => $p->work_quantity !== null ? (float) $p->work_quantity : null,
            'work_unit'       => $p->work_unit,
            'work_unit_label' => Svc::label('work_unit', $p->work_unit),
            'site_address'    => $siteAddress,
            'address_locked'  => !($isCustomer || $unlocked),
            'district'        => $p->district,
            'state'           => $p->state,
            'place'           => trim(($p->district ?? '') . ($p->state ? ', ' . $p->state : ''), ', '),
            'lat'             => $unlocked && $p->lat !== null ? (float) $p->lat : null,
            'lng'             => $unlocked && $p->lng !== null ? (float) $p->lng : null,

            // PART-B
            'start_date'      => $p->start_date?->format('Y-m-d'),
            'start_date_text' => Svc::formatDate($p->start_date?->format('Y-m-d')),
            'start_time'      => $p->start_time,
            'duration_days'   => (int) $p->duration_days,

            // PART-C
            'material_responsibility' => $p->material_responsibility,
            'material_label'  => Svc::label('material', $p->material_responsibility),
            'material_details' => $p->material_details,

            // PART-D / E
            'price_basis'     => $p->price_basis,
            'price_basis_label' => Svc::label('price_basis', $p->price_basis),
            'total_amount'    => (float) $p->total_amount,
            'payment_terms'   => [
                ['key' => 'advance',    'label' => 'अग्रिम भुगतान (Advance)',   'amount' => (float) $p->advance_amount,    'percent' => (float) $p->advance_percent],
                ['key' => 'during',     'label' => 'कार्य के दौरान भुगतान',      'amount' => (float) $p->during_amount,     'percent' => (float) $p->during_percent],
                ['key' => 'completion', 'label' => 'कार्य पूर्ण होने पर',        'amount' => (float) $p->completion_amount, 'percent' => (float) $p->completion_percent],
                ['key' => 'final',      'label' => 'अंतिम भुगतान (Final)',      'amount' => (float) $p->final_amount,      'percent' => (float) $p->final_percent],
            ],
            'payment_total'   => [
                'amount'  => round((float) $p->advance_amount + (float) $p->during_amount +
                                   (float) $p->completion_amount + (float) $p->final_amount, 2),
                'percent' => round((float) $p->advance_percent + (float) $p->during_percent +
                                   (float) $p->completion_percent + (float) $p->final_percent, 2),
            ],

            // PART-F (3-Tier)
            'ssn_terms'       => $p->ssn_terms ?: Svc::standardTerms(),
            'extra_work_consent' => (bool) $p->extra_work_consent,
            'quality_terms'   => $p->quality_terms,
            'validity_hours'  => (int) $p->validity_hours,
            'expires_at'      => $p->expires_at?->toISOString(),
            'seconds_left'    => $p->expires_at ? (int) max(0, now()->diffInSeconds($p->expires_at, false)) : null,

            // Versioning
            'current_version' => (int) $p->current_version,
            'final_version'   => $p->final_version,
            'last_version_by' => $lastAuthor,
            'version_history' => $this->decorateHistory($p),
            'comparison'      => Svc::buildComparison($v1, $latest),
            'has_changes'     => (int) $p->current_version > 1,

            // Actions
            'can_accept'      => $canAccept,
            'can_counter'     => $canCounter,
            'can_reject'      => $canAct,
            'can_cancel'      => $isCustomer && $isOpen,
            'block_reason'    => $this->blockReason($p, $role, $selfAuthored, $isOpen, $offerOk, $threadOk, $offer),

            // Lock artifacts
            'locked_at'       => $p->locked_at?->toISOString(),
            'platform_fee'    => $p->platform_fee,
            'fee_percent'     => Svc::FEE_PERCENT,
            'required_fee'    => Svc::platformFee((float) $p->total_amount),
            'contacts_unlocked' => $unlocked,
            'final_contract_summary' => $p->final_contract_summary,
            'certificate_url' => $p->isLocked() ? $this->certificateUrl($p) : null,
            'agreement_url'   => $this->agreementUrl($p),
            'wallet'          => $wallet,

            // Amendment
            'amendment_status'  => $p->amendment_status,
            'amendment_payload' => $p->amendment_payload,
            'amendment_reason'  => $p->amendment_reason,
            'amendment_requested_by_me' => (int) $p->amendment_requested_by === (int) $user->id,
            'can_request_amendment' => $p->isLocked() && $p->amendment_status !== 'requested',
            'can_respond_amendment' => $p->isLocked() && $p->amendment_status === 'requested'
                                        && (int) $p->amendment_requested_by !== (int) $user->id,

            // Parties (Platform Term #4)
            'customer' => [
                'id'    => $p->customer_id,
                'name'  => ($isCustomer || $unlocked) ? ($p->customer?->name ?: 'ग्राहक') : 'ग्राहक (लॉक)',
                'phone' => ($isCustomer || $unlocked) ? $p->customer?->phone : null,
            ],
            'contractor' => [
                'id'    => $p->contractor_id,
                'name'  => ($role === 'contractor' || $unlocked) ? ($p->contractor?->name ?: 'ठेकेदार') : 'ठेकेदार (लॉक)',
                'phone' => ($role === 'contractor' && (int) $p->contractor_id === (int) $user->id) || $unlocked
                            ? $p->contractor?->phone : null,
            ],
            'notified_count'  => $p->offers->count(),
            'created_at'      => $p->created_at?->toISOString(),
        ];
    }

    private function blockReason(
        ContractProposal $p, string $role, bool $selfAuthored, bool $isOpen,
        bool $offerOk, bool $threadOk, ?ContractProposalOffer $offer
    ): ?string {
        if (!$isOpen) {
            return $p->isLocked() ? null : $this->closedMessage($p);
        }
        if (!$offerOk) {
            return $this->offerBlockedMessage($offer);
        }
        if (!$threadOk) {
            return $role === 'contractor'
                ? 'यह प्रस्ताव अब किसी अन्य ठेकेदार के साथ नेगोशिएशन में है।'
                : 'अभी किसी ठेकेदार ने जवाब नहीं दिया है।';
        }
        if ($selfAuthored) {
            return $role === 'contractor'
                ? 'आपका संशोधित प्रस्ताव (V' . $p->current_version . ') भेजा जा चुका है — ग्राहक के जवाब का इंतज़ार करें।'
                : 'आपका प्रस्ताव (V' . $p->current_version . ') भेजा जा चुका है — ठेकेदार के जवाब का इंतज़ार करें।';
        }
        return null;
    }

    private function decorateHistory(ContractProposal $p): array
    {
        $out = [];
        foreach (($p->version_history ?? []) as $entry) {
            $by = $entry['created_by'] ?? 'system';
            $out[] = [
                'version'    => (int) ($entry['version'] ?? 0),
                'created_by' => $by,
                'created_by_label' => match ($by) {
                    'customer'   => 'ग्राहक (Customer)',
                    'contractor' => 'ठेकेदार (Contractor)',
                    default      => 'सिस्टम (System)',
                },
                'created_at'   => $entry['created_at'] ?? null,
                'note'         => $entry['note'] ?? null,
                'voice_note_url' => $entry['voice_note_url'] ?? null,
                'changes'      => $entry['changes'] ?? [],
                'values'       => $entry['values'] ?? [],
                'total_amount' => isset($entry['values']['total_amount']) ? (float) $entry['values']['total_amount'] : null,
                'is_final'     => $p->final_version !== null && (int) ($entry['version'] ?? 0) === (int) $p->final_version,
            ];
        }
        return $out;
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'draft'       => '🆕 नया प्रस्ताव (Draft)',
            'broadcasted' => '📤 भेजा गया — जवाब का इंतज़ार',
            'negotiating' => '✏️ नेगोशिएशन चल रही है',
            'locked'      => '🔒 कॉन्ट्रैक्ट लॉक',
            'rejected'    => '✕ अस्वीकृत',
            'expired'     => '⌛ वैधता समाप्त',
            'cancelled'   => '🚫 रद्द',
            default       => $status,
        };
    }

    /** Error helper — transaction ke andar se return karne ke liye. */
    private function err(string $detail, int $code, array $extra = []): array
    {
        return ['ok' => false, 'code' => $code, 'body' => array_merge(['detail' => $detail], $extra)];
    }
}
