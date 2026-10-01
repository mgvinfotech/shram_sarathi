<?php

namespace App\Services;

use App\Models\ContractProposal;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * ContractProposalService — Thekedar Booking Module ka business-logic helper.
 *
 * Yahan rehta hai:
 *   • Three-Tier Terms (SSN_Terms / Negotiated_Terms / Final_Contract_Summary)
 *   • Version snapshot + delta (change) calculation
 *   • V1 vs V-N comparison table (Screen 3)
 *   • 2% platform fee logic (Platform Term #2)
 *   • Watermarked Digital Contract Certificate generator (Directive #7)
 */
class ContractProposalService
{
    /** Platform fee = Final Contract Value ka 2% */
    public const FEE_PERCENT = 2.0;

    // ─── Dropdown / meta options ──────────────────────────────────────────────

    /** PART-A #1 — Thekedar ka prakar. */
    public static function contractorTypes(): array
    {
        return [
            ['slug' => 'rcc_concrete',   'hi' => 'RCC / कंक्रीट कार्य',      'en' => 'RCC / Concrete Work'],
            ['slug' => 'masonry',        'hi' => 'राजमिस्त्री (चिनाई)',      'en' => 'Masonry / Brickwork'],
            ['slug' => 'plumbing',       'hi' => 'प्लंबिंग',                 'en' => 'Plumbing'],
            ['slug' => 'electrical',     'hi' => 'इलेक्ट्रिकल',              'en' => 'Electrical'],
            ['slug' => 'painting',       'hi' => 'पेंटिंग / पुट्टी',          'en' => 'Painting / Putty'],
            ['slug' => 'tiles_marble',   'hi' => 'टाइल्स / मार्बल',          'en' => 'Tiles / Marble'],
            ['slug' => 'carpentry',      'hi' => 'बढ़ईगीरी / लकड़ी कार्य',    'en' => 'Carpentry'],
            ['slug' => 'road_work',      'hi' => 'सड़क निर्माण',             'en' => 'Road Work'],
            ['slug' => 'building_full',  'hi' => 'संपूर्ण भवन निर्माण',       'en' => 'Full Building Construction'],
            ['slug' => 'other',          'hi' => 'अन्य',                     'en' => 'Other'],
        ];
    }

    /** PART-A #3 — Matra ki ikai. */
    public static function workUnits(): array
    {
        return [
            ['slug' => 'sqft',  'hi' => 'वर्गफीट',   'en' => 'Sq. Feet'],
            ['slug' => 'sqmtr', 'hi' => 'वर्गमीटर',  'en' => 'Sq. Meter'],
            ['slug' => 'rmt',   'hi' => 'रनिंग मीटर', 'en' => 'Running Meter'],
            ['slug' => 'count', 'hi' => 'संख्या',    'en' => 'Count / Nos.'],
            ['slug' => 'other', 'hi' => 'अन्य',      'en' => 'Other'],
        ];
    }

    /** PART-D #9 — Mulya ka aadhaar. */
    public static function priceBases(): array
    {
        return [
            ['slug' => 'total_contract', 'hi' => 'पूर्ण कार्य का कुल ठेका', 'en' => 'Total Contract (Lump Sum)'],
            ['slug' => 'per_sqft',       'hi' => 'प्रति वर्गफीट',           'en' => 'Per Sq. Feet'],
            ['slug' => 'other',          'hi' => 'अन्य',                    'en' => 'Other'],
        ];
    }

    public static function materialOptions(): array
    {
        return [
            [
                'slug'  => 'labour_only',
                'hi'    => 'केवल श्रम (Labour Only)',
                'en'    => 'Labour Only',
                'hi_hint' => 'सामग्री ग्राहक देगा',
                'en_hint' => 'Customer will supply material',
            ],
            [
                'slug'  => 'labour_material',
                'hi'    => 'श्रम + सामग्री (Labour + Material)',
                'en'    => 'Labour + Material',
                'hi_hint' => 'ठेकेदार सामग्री लाएगा',
                'en_hint' => 'Contractor will bring material',
            ],
        ];
    }

    public static function label(string $group, ?string $slug, string $lang = 'hi'): string
    {
        if ($slug === null || $slug === '') {
            return '—';
        }
        $list = match ($group) {
            'contractor_type' => self::contractorTypes(),
            'work_unit'       => self::workUnits(),
            'price_basis'     => self::priceBases(),
            'material'        => self::materialOptions(),
            default           => [],
        };
        foreach ($list as $item) {
            if ($item['slug'] === $slug) {
                return $item[$lang] ?? $item['hi'];
            }
        }
        return $slug;
    }

    // ─── TIER 1: SSN ke sthayi shartein (immutable) ───────────────────────────

    /**
     * Bhaag 1 — Standard Platform Terms (7 niyam).
     * Ye snapshot proposal ke saath freeze ho jaata hai (Three-Tier Locking).
     */
    public static function standardTerms(): array
    {
        return [
            'version'    => '1.0',
            'title_hi'   => 'प्लेटफ़ॉर्म की स्थायी शर्तें (Standard SSN Terms)',
            'title_en'   => 'Standard SSN Platform Terms',
            'preamble_hi' => 'श्रम सारथी नेटवर्क का उपयोग करते हुए यह ठेका प्रस्ताव भेजने/स्वीकार करने पर दोनों पक्ष निम्नलिखित शर्तों से बंधे होंगे।',
            'preamble_en' => 'By sending or accepting this contract proposal on Shram Sarathi Network, both parties agree to the following terms.',
            'clauses'    => [
                [
                    'no' => 1,
                    'hi_title' => 'जोड़ने वाला प्लेटफ़ॉर्म (Connecting Platform)',
                    'en_title' => 'Connecting Platform',
                    'hi' => 'श्रम सारथी नेटवर्क केवल एक तकनीकी प्लेटफ़ॉर्म है जो ग्राहक और ठेकेदार के बीच संपर्क तथा ठेका प्रस्ताव नेगोशिएशन (Contract Proposal Negotiation) की सुविधा देता है। अंतिम लॉक हुआ कॉन्ट्रैक्ट सीधे ग्राहक और ठेकेदार के बीच निष्पादित होता है। प्लेटफ़ॉर्म किसी भी पक्ष का एजेंट, प्रतिनिधि या नियोक्ता नहीं है।',
                    'en' => 'SSN is only a technology platform that facilitates contact and contract-proposal negotiation. The final locked contract is executed directly between customer and contractor. The platform is neither an agent, representative nor employer of either party.',
                ],
                [
                    'no' => 2,
                    'hi_title' => '2% वॉलेट एवं शुल्क (Wallet & Fee Logic)',
                    'en_title' => '2% Wallet & Fee Logic',
                    'hi' => 'ग्राहक के लिए यह सेवा 100% निःशुल्क है। अंतिम ठेका मूल्य (Final Contract Value) का 2% ठेकेदार के इन-ऐप वॉलेट से काटा जाता है। ठेकेदार "स्वीकार करें" या "संशोधित प्रस्ताव भेजें" तभी दबा सकता है जब उसके वॉलेट में आवश्यक बैलेंस हो — आवश्यक वॉलेट बैलेंस = अंतिम ठेका मूल्य × 0.02।',
                    'en' => '100% free for the customer. 2% of the final contract value is deducted from the contractor’s in-app wallet. The contractor may press Accept or Send Counter Offer only if Required Wallet Balance = Final Contract Value × 0.02.',
                ],
                [
                    'no' => 3,
                    'hi_title' => 'स्वयं-स्वीकृति निषेध (Non-Self Acceptance Rule)',
                    'en_title' => 'Non-Self Acceptance Rule',
                    'hi' => 'जिस पक्ष ने कोई संस्करण (मूल प्रस्ताव या Counter Offer V1, V2, V3…) भेजा है, वह स्वयं उसे स्वीकार नहीं कर सकता। केवल प्राप्तकर्ता पक्ष ही उसे स्वीकार कर सकता है।',
                    'en' => 'The party that sent a version (original proposal or counter offer V1, V2, V3…) cannot accept it themselves. Only the receiving party may accept it.',
                ],
                [
                    'no' => 4,
                    'hi_title' => 'संपर्क विवरण अनलॉक (Contact Unlocking)',
                    'en_title' => 'Contact Unlocking',
                    'hi' => '2% शुल्क की सफल कटौती और कॉन्ट्रैक्ट लॉक होते ही दोनों पक्षों के नाम, मोबाइल नंबर और कार्यस्थल का पूरा पता तुरंत अनलॉक हो जाते हैं।',
                    'en' => 'On successful 2% deduction and contract lock, both parties’ names, mobile numbers and the full work-site address are unlocked immediately.',
                ],
                [
                    'no' => 5,
                    'hi_title' => 'सीधा भुगतान (Direct Settlement)',
                    'en_title' => 'Direct Settlement',
                    'hi' => 'अग्रिम, रनिंग-बिल और अंतिम भुगतान सीधे दोनों पक्षों के बीच (नकद / UPI) होगा। प्लेटफ़ॉर्म इस लेन-देन में शामिल नहीं है।',
                    'en' => 'Advance, running-bill and final payments move directly between the parties (cash / UPI). The platform is not involved in that transaction.',
                ],
                [
                    'no' => 6,
                    'hi_title' => 'रद्दीकरण नीति (Cancellation Policy)',
                    'en_title' => 'Cancellation Policy',
                    'hi' => 'अंतिम स्वीकृति से पहले कोई भी पक्ष बिना दंड प्रस्ताव अस्वीकार (Reject) कर सकता है। स्वीकृति के बाद यदि ठेकेदार कार्य से पीछे हटता है तो 2% शुल्क वापस नहीं होगा और खाता निलंबित किया जा सकता है। यदि ग्राहक पीछे हटता है तो ठेकेदार SOS रिपोर्ट दर्ज कर सकता है।',
                    'en' => 'Before final acceptance either party may reject with no penalty. After acceptance, if the contractor defaults the 2% is not refunded and the account may be suspended. If the customer defaults, the contractor may file an SOS report.',
                ],
                [
                    'no' => 7,
                    'hi_title' => 'डिजिटल साक्ष्य एवं SOS (Digital Evidence & SOS)',
                    'en_title' => 'Digital Evidence & SOS',
                    'hi' => 'ऐप में दर्ज "Version History Record (V1, V2… VN)" डिजिटल ऑडिट ट्रेल के रूप में भारतीय साक्ष्य अधिनियम के अंतर्गत अंतिम विधिक साक्ष्य होगा। SOS सहायता टीम निष्पक्ष सुलह का प्रयास करेगी; असफल होने पर दोनों पक्ष डिजिटल कॉन्ट्रैक्ट प्रमाणपत्र (PDF) के साथ न्यायालय जा सकते हैं।',
                    'en' => 'The in-app Version History Record (V1, V2… VN) constitutes the digital audit trail and serves as final legal evidence under the Indian Evidence Act. The SOS support team attempts impartial conciliation; failing that, both parties may approach a court with the digital contract certificate (PDF).',
                ],
            ],
        ];
    }

    // ─── TIER 2: Negotiated terms (V1 → V-N mein badalte hain) ────────────────

    /**
     * Proposal ke current mutable fields ka snapshot.
     * Yahi `negotiated_terms` aur `version_history[n].values` mein jaata hai.
     */
    public static function snapshot(ContractProposal $p): array
    {
        return [
            'contractor_type'         => $p->contractor_type,
            'work_description'        => $p->work_description,
            'work_quantity'           => $p->work_quantity !== null ? (float) $p->work_quantity : null,
            'work_unit'               => $p->work_unit,
            'site_address'            => $p->site_address,
            'start_date'              => $p->start_date?->format('Y-m-d'),
            'start_time'              => $p->start_time,
            'duration_days'           => (int) $p->duration_days,
            'material_responsibility' => $p->material_responsibility,
            'material_details'        => $p->material_details,
            'price_basis'             => $p->price_basis,
            'total_amount'            => (float) $p->total_amount,
            'advance_amount'          => (float) $p->advance_amount,
            'advance_percent'         => (float) $p->advance_percent,
            'during_amount'           => (float) $p->during_amount,
            'during_percent'          => (float) $p->during_percent,
            'completion_amount'       => (float) $p->completion_amount,
            'completion_percent'      => (float) $p->completion_percent,
            'final_amount'            => (float) $p->final_amount,
            'final_percent'           => (float) $p->final_percent,
            'extra_work_consent'      => (bool) $p->extra_work_consent,
            'quality_terms'           => $p->quality_terms,
        ];
    }

    /**
     * Comparison table (Screen 3) ke fields — kram wahi jo PDF mein hai.
     * type: money | percent | days | text | option | qty
     */
    public static function comparisonFields(): array
    {
        return [
            ['key' => 'total_amount',            'type' => 'money',   'hi' => 'ठेका राशि',              'en' => 'Contract Amount'],
            ['key' => 'advance_percent',         'type' => 'percent', 'hi' => 'अग्रिम भुगतान',          'en' => 'Advance Payment'],
            ['key' => 'duration_days',           'type' => 'days',    'hi' => 'कार्य अवधि',             'en' => 'Work Duration'],
            ['key' => 'material_responsibility', 'type' => 'material','hi' => 'सामग्री की जिम्मेदारी',   'en' => 'Material Responsibility'],
            ['key' => 'start_date',              'type' => 'date',    'hi' => 'कार्य प्रारंभ तिथि',      'en' => 'Work Start Date'],
            ['key' => 'start_time',              'type' => 'text',    'hi' => 'कार्य प्रारंभ समय',       'en' => 'Work Start Time'],
            ['key' => 'work_quantity',           'type' => 'qty',     'hi' => 'कार्य की मात्रा',         'en' => 'Work Quantity'],
            ['key' => 'during_percent',          'type' => 'percent', 'hi' => 'कार्य के दौरान भुगतान',   'en' => 'Payment During Work'],
            ['key' => 'completion_percent',      'type' => 'percent', 'hi' => 'कार्य पूर्ण होने पर',      'en' => 'On Completion'],
            ['key' => 'final_percent',           'type' => 'percent', 'hi' => 'अंतिम भुगतान',           'en' => 'Final Payment'],
            ['key' => 'quality_terms',           'type' => 'text',    'hi' => 'विशेष गुणवत्ता शर्त',      'en' => 'Special Quality Term'],
        ];
    }

    /**
     * Do version snapshots ka antar — Screen 3 ki tulna-talika ke liye.
     * direction: up (Red ↑) | down (Green ↓) | same
     */
    public static function buildComparison(array $base, array $latest, string $lang = 'hi'): array
    {
        $rows = [];

        foreach (self::comparisonFields() as $field) {
            $key = $field['key'];
            $a   = $base[$key]   ?? null;
            $b   = $latest[$key] ?? null;

            $isNumeric = in_array($field['type'], ['money', 'percent', 'days', 'qty'], true);
            $changed   = $isNumeric
                ? (abs((float) $a - (float) $b) > 0.001)
                : ((string) $a !== (string) $b);

            $direction = 'same';
            if ($changed && $isNumeric) {
                $direction = ((float) $b > (float) $a) ? 'up' : 'down';
            } elseif ($changed) {
                $direction = 'changed';
            }

            $rows[] = [
                'key'         => $key,
                'type'        => $field['type'],
                'label'       => $field[$lang] ?? $field['hi'],
                'label_hi'    => $field['hi'],
                'label_en'    => $field['en'],
                'base_value'  => $a,
                'latest_value' => $b,
                'base_text'   => self::formatValue($field['type'], $a, $lang),
                'latest_text' => self::formatValue($field['type'], $b, $lang),
                'changed'     => $changed,
                'direction'   => $direction,
            ];
        }

        return $rows;
    }

    public static function formatValue(string $type, $value, string $lang = 'hi'): string
    {
        if ($value === null || $value === '') {
            return $lang === 'hi' ? 'V1 के अनुसार' : 'As per V1';
        }

        return match ($type) {
            'money'    => '₹' . number_format((float) $value, 0),
            'percent'  => rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.') . '%',
            'days'     => ((int) $value) . ($lang === 'hi' ? ' दिन' : ' days'),
            'qty'      => rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.'),
            'date'     => self::formatDate((string) $value),
            'material' => self::label('material', (string) $value, $lang),
            default    => (string) $value,
        };
    }

    public static function formatDate(?string $ymd): string
    {
        if (!$ymd) {
            return '—';
        }
        try {
            return \Carbon\Carbon::parse($ymd)->format('d/m/Y');
        } catch (\Throwable) {
            return $ymd;
        }
    }

    // ─── Version history ──────────────────────────────────────────────────────

    /**
     * Naya version entry banao (Directive #2 — delta changes ke saath).
     */
    public static function makeVersionEntry(
        int $version,
        string $createdBy,
        int $createdById,
        array $values,
        ?array $previousValues = null,
        ?string $voiceNoteUrl = null,
        ?string $note = null
    ): array {
        return [
            'version'        => $version,
            'created_by'     => $createdBy,        // customer | contractor
            'created_by_id'  => $createdById,
            'created_at'     => now()->toISOString(),
            'values'         => $values,
            'changes'        => $previousValues === null ? [] : self::diff($previousValues, $values),
            'voice_note_url' => $voiceNoteUrl,
            'note'           => $note,
        ];
    }

    /** Sirf badle hue fields (Delta Changes). */
    public static function diff(array $old, array $new): array
    {
        $changes = [];
        foreach (self::comparisonFields() as $field) {
            $key = $field['key'];
            $a = $old[$key] ?? null;
            $b = $new[$key] ?? null;

            $isNumeric = in_array($field['type'], ['money', 'percent', 'days', 'qty'], true);
            $changed = $isNumeric
                ? (abs((float) $a - (float) $b) > 0.001)
                : ((string) $a !== (string) $b);

            if (!$changed) {
                continue;
            }

            $changes[] = [
                'field'    => $key,
                'label_hi' => $field['hi'],
                'label_en' => $field['en'],
                'type'     => $field['type'],
                'from'     => $a,
                'to'       => $b,
                'from_text' => self::formatValue($field['type'], $a),
                'to_text'   => self::formatValue($field['type'], $b),
            ];
        }
        return $changes;
    }

    // ─── Fee / codes ──────────────────────────────────────────────────────────

    public static function platformFee(float $contractValue): float
    {
        return round($contractValue * (self::FEE_PERCENT / 100), 2);
    }

    public static function generateProposalCode(): string
    {
        do {
            $code = 'SSN-PRO-' . strtoupper(Str::random(8));
        } while (ContractProposal::where('proposal_code', $code)->exists());

        return $code;
    }

    public static function generateContractId(): string
    {
        do {
            $id = 'SSN-CON-' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
        } while (ContractProposal::where('contract_id', $id)->exists());

        return $id;
    }

    // ─── TIER 3: Final Contract Summary (locked) ───────────────────────────────

    public static function buildFinalSummary(ContractProposal $p): array
    {
        return [
            'contract_id'      => $p->contract_id,
            'proposal_code'    => $p->proposal_code,
            'final_version'    => $p->final_version,
            'locked_at'        => optional($p->locked_at)->toISOString(),
            'customer'         => [
                'id'    => $p->customer_id,
                'name'  => $p->customer?->name,
                'phone' => $p->customer?->phone,
            ],
            'contractor'       => [
                'id'    => $p->contractor_id,
                'name'  => $p->contractor?->name,
                'phone' => $p->contractor?->phone,
            ],
            'terms'            => self::snapshot($p),
            'platform_fee'     => $p->platform_fee,
            'fee_percent'      => self::FEE_PERCENT,
            'ssn_terms_version' => $p->ssn_terms['version'] ?? '1.0',
        ];
    }

    // ─── Directive #7: Watermarked Digital Contract Certificate ───────────────

    /**
     * Certificate file generate karke `public` disk par store karta hai
     * aur relative path lautata hai. Print-to-PDF ke liye A4 optimised.
     */
    public static function generateCertificate(ContractProposal $p): ?string
    {
        try {
            $html = self::certificateHtml($p);
            $path = 'contracts/' . $p->contract_id . '-' . Str::random(10) . '.html';
            Storage::disk('public')->put($path, $html);
            return $path;
        } catch (\Throwable $e) {
            Log::error('[ContractProposal] Certificate generate fail: ' . $e->getMessage());
            return null;
        }
    }

    public static function certificateHtml(ContractProposal $p): string
    {
        $t = self::snapshot($p);
        $e = fn ($v) => htmlspecialchars((string) ($v ?? '—'), ENT_QUOTES, 'UTF-8');

        $rows = [
            ['Contract ID', $p->contract_id],
            ['प्रस्ताव कोड / Proposal Code', $p->proposal_code],
            ['अंतिम संस्करण / Final Version', 'V' . $p->final_version],
            ['ठेकेदार का प्रकार / Contractor Type', self::label('contractor_type', $t['contractor_type'])],
            ['कार्य का विवरण / Work Description', $t['work_description']],
            ['कार्य की मात्रा / Quantity', ($t['work_quantity'] ? self::formatValue('qty', $t['work_quantity']) . ' ' . self::label('work_unit', $t['work_unit']) : '—')],
            ['कुल ठेका राशि / Total Amount', self::formatValue('money', $t['total_amount'])],
            ['मूल्य का आधार / Price Basis', self::label('price_basis', $t['price_basis'])],
            ['अग्रिम भुगतान / Advance', self::formatValue('money', $t['advance_amount']) . ' (' . self::formatValue('percent', $t['advance_percent']) . ')'],
            ['कार्य के दौरान / During Work', self::formatValue('money', $t['during_amount']) . ' (' . self::formatValue('percent', $t['during_percent']) . ')'],
            ['कार्य पूर्ण होने पर / On Completion', self::formatValue('money', $t['completion_amount']) . ' (' . self::formatValue('percent', $t['completion_percent']) . ')'],
            ['अंतिम भुगतान / Final', self::formatValue('money', $t['final_amount']) . ' (' . self::formatValue('percent', $t['final_percent']) . ')'],
            ['कार्य अवधि / Duration', self::formatValue('days', $t['duration_days'])],
            ['कार्य प्रारंभ / Start', self::formatDate($t['start_date']) . ' — ' . $t['start_time']],
            ['सामग्री / Material', self::label('material', $t['material_responsibility'])],
            ['सामग्री विवरण / Material Details', $t['material_details']],
            ['विशेष गुणवत्ता शर्त / Quality Term', $t['quality_terms']],
            ['कार्यस्थल / Work Site', $t['site_address']],
            ['ग्राहक / Customer', ($p->customer?->name ?: '—') . ' — ' . ($p->customer?->phone ?: '—')],
            ['ठेकेदार / Contractor', ($p->contractor?->name ?: '—') . ' — ' . ($p->contractor?->phone ?: '—')],
            ['प्लेटफ़ॉर्म शुल्क (2%) / Platform Fee', self::formatValue('money', $p->platform_fee)],
            ['लॉक तिथि / Locked At', optional($p->locked_at)->format('d/m/Y h:i A')],
        ];

        $rowsHtml = '';
        foreach ($rows as [$label, $value]) {
            $rowsHtml .= '<tr><th>' . $e($label) . '</th><td>' . $e($value) . '</td></tr>';
        }

        // Version History Record — Digital Audit Trail (Platform Term #7)
        $historyHtml = '';
        foreach (($p->version_history ?? []) as $entry) {
            $by = ($entry['created_by'] ?? '') === 'customer' ? 'ग्राहक (Customer)' : 'ठेकेदार (Contractor)';
            $when = isset($entry['created_at']) ? date('d/m/Y h:i A', strtotime($entry['created_at'])) : '—';
            $changeList = '';
            foreach (($entry['changes'] ?? []) as $c) {
                $changeList .= '<li>' . $e($c['label_hi'] ?? $c['field']) . ': <s>' . $e($c['from_text'] ?? '') . '</s> → <b>' . $e($c['to_text'] ?? '') . '</b></li>';
            }
            if ($changeList === '') {
                $changeList = '<li>मूल प्रस्ताव (Original proposal)</li>';
            }
            $historyHtml .= '<div class="ver"><div class="ver-h">V' . (int) ($entry['version'] ?? 0)
                . ' — ' . $e($by) . ' <span class="muted">' . $e($when) . '</span></div><ul>' . $changeList . '</ul></div>';
        }

        $termsHtml = '';
        foreach (self::standardTerms()['clauses'] as $c) {
            $termsHtml .= '<div class="clause"><b>' . (int) $c['no'] . '. ' . $e($c['hi_title']) . '</b><p>' . $e($c['hi']) . '</p></div>';
        }

        $watermark = $e($p->contract_id);

        return <<<HTML
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Digital Work Contract — {$watermark}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Nirmala UI", "Noto Sans Devanagari", system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
         margin: 0; padding: 0; background: #EDEDED; color: #1A202C; }
  .page { position: relative; width: 210mm; min-height: 297mm; margin: 12px auto; padding: 16mm 14mm;
          background: #fff; box-shadow: 0 2px 14px rgba(0,0,0,.15); overflow: hidden; }
  .wm { position: absolute; inset: 0; pointer-events: none; z-index: 0;
        display: flex; align-items: center; justify-content: center; }
  .wm span { transform: rotate(-32deg); font-size: 46px; font-weight: 900; letter-spacing: 4px;
             color: rgba(255,107,0,.10); white-space: nowrap; text-align: center; line-height: 1.9; }
  .content { position: relative; z-index: 1; }
  .brand { display: flex; align-items: center; justify-content: space-between;
           border-bottom: 3px solid #FF6B00; padding-bottom: 10px; }
  .brand h1 { font-size: 19px; margin: 0; color: #FF6B00; letter-spacing: .5px; }
  .brand small { color: #718096; font-size: 11px; }
  .cid { text-align: right; font-size: 12px; }
  .cid b { display: block; font-size: 15px; color: #276749; }
  h2 { font-size: 14px; margin: 20px 0 8px; color: #2D3748;
       border-left: 4px solid #FF6B00; padding-left: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th, td { border: 1px solid #E2E8F0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #F7FAFC; width: 38%; font-weight: 600; color: #4A5568; }
  .ver { border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; background: #FCFCFD; }
  .ver-h { font-size: 12px; font-weight: 700; color: #2B6CB0; margin-bottom: 4px; }
  .ver ul { margin: 0; padding-left: 18px; font-size: 11px; color: #4A5568; }
  .muted { color: #A0AEC0; font-weight: 400; }
  .clause { font-size: 10.5px; margin-bottom: 6px; }
  .clause p { margin: 2px 0 0; color: #4A5568; line-height: 1.5; }
  .foot { margin-top: 18px; border-top: 1px dashed #CBD5E0; padding-top: 8px;
          font-size: 10px; color: #718096; line-height: 1.6; }
  .sign { display: flex; gap: 30px; margin-top: 22px; }
  .sign div { flex: 1; border-top: 1px solid #4A5568; padding-top: 5px; font-size: 11px; text-align: center; }
  .noprint { text-align: center; margin: 12px; }
  .noprint button { background: #FF6B00; color: #fff; border: 0; padding: 10px 22px;
                    border-radius: 8px; font-size: 14px; cursor: pointer; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; box-shadow: none; width: auto; min-height: auto; }
    .noprint { display: none; }
  }
</style>
</head>
<body>
<div class="noprint"><button onclick="window.print()">📄 PDF सेव / प्रिंट करें</button></div>
<div class="page">
  <div class="wm"><span>SHRAM SARATHI NETWORK<br>{$watermark}<br>DIGITAL CONTRACT</span></div>
  <div class="content">
    <div class="brand">
      <div>
        <h1>SHRAM SARATHI NETWORK</h1>
        <small>डिजिटल कार्य ठेका प्रमाणपत्र · Digital Work Contract Certificate</small>
      </div>
      <div class="cid">
        Contract ID<b>{$watermark}</b>
      </div>
    </div>

    <h2>📋 अंतिम सहमत शर्तें / Final Agreed Terms</h2>
    <table>{$rowsHtml}</table>

    <h2>🕓 Version History Record (Digital Audit Trail)</h2>
    {$historyHtml}

    <h2>📜 प्लेटफ़ॉर्म की स्थायी शर्तें / Standard SSN Terms</h2>
    {$termsHtml}

    <div class="sign">
      <div>ग्राहक के हस्ताक्षर / Customer</div>
      <div>ठेकेदार के हस्ताक्षर / Contractor</div>
    </div>

    <div class="foot">
      यह प्रमाणपत्र श्रम सारथी नेटवर्क द्वारा स्वतः जनित (auto-generated) है। इसमें दर्ज
      Version History Record डिजिटल ऑडिट ट्रेल के रूप में भारतीय साक्ष्य अधिनियम के अंतर्गत विधिक साक्ष्य है।
      श्रम सारथी नेटवर्क केवल जोड़ने वाला प्लेटफ़ॉर्म है — कॉन्ट्रैक्ट सीधे ग्राहक एवं ठेकेदार के बीच है।
      <br>This certificate is auto-generated by Shram Sarathi Network and carries a tamper-evident version audit trail.
    </div>
  </div>
</div>
</body>
</html>
HTML;
    }
}
