<?php

namespace App\Console\Commands;

use App\Models\ContractProposal;
use App\Models\ContractProposalOffer;
use App\Services\FcmService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Directive #6 — Auto-Expiry Timer Engine.
 *
 * Jis proposal par validity window (default 48 ghante) ke andar koi action
 * nahi hua, use backend automatically EXPIRED mark kar deta hai.
 *
 * Registered in routes/console.php → har 5 minute chalta hai.
 */
class ExpireContractProposals extends Command
{
    protected $signature = 'contract:expire-proposals {--limit=200 : Ek run mein maximum proposals}';

    protected $description = 'Thekedar ke prastavon ki 48-ghante validity check karke unhe EXPIRED mark karta hai';

    public function handle(FcmService $fcm): int
    {
        $limit = (int) $this->option('limit');

        $stale = ContractProposal::whereIn('status', ['broadcasted', 'negotiating'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->limit($limit)
            ->get();

        if ($stale->isEmpty()) {
            $this->info('Koi expired proposal nahi mila.');
            return self::SUCCESS;
        }

        $count = 0;

        foreach ($stale as $proposal) {
            try {
                $targets = ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->whereIn('status', ['pending', 'on_hold', 'countered'])
                    ->pluck('contractor_id')
                    ->all();

                ContractProposalOffer::where('contract_proposal_id', $proposal->id)
                    ->whereIn('status', ['pending', 'on_hold', 'countered'])
                    ->update([
                        'status'        => 'expired',
                        'expiry_reason' => 'timeout',
                        'updated_at'    => now(),
                    ]);

                $proposal->status = 'expired';
                $proposal->save();
                $count++;

                foreach (array_unique(array_merge($targets, [$proposal->customer_id])) as $uid) {
                    $isCustomer = (int) $uid === (int) $proposal->customer_id;
                    $fcm->sendToUser(
                        userId: (int) $uid,
                        title: '⌛ प्रस्ताव की वैधता समाप्त',
                        body: $isCustomer
                            ? 'आपका ठेका प्रस्ताव ' . $proposal->proposal_code . ' ' . $proposal->validity_hours .
                              ' घंटे में स्वीकार नहीं हुआ, इसलिए समाप्त हो गया। कृपया नया प्रस्ताव भेजें।'
                            : 'एक ठेका प्रस्ताव की वैधता समाप्त हो गई (Offer Expired)।',
                        type: 'contract_expired',
                        data: [
                            'screen'      => $isCustomer ? 'MyContractProposals' : 'ContractorProposalInbox',
                            'proposal_id' => (string) $proposal->id,
                        ],
                        bookingId: $proposal->id,
                        bookingModel: 'contract_proposals'
                    );
                }

                $this->line("EXPIRED: {$proposal->proposal_code} (#{$proposal->id})");
            } catch (\Throwable $e) {
                Log::error("[ExpireContractProposals] #{$proposal->id} fail: " . $e->getMessage());
                $this->error("Fail #{$proposal->id}: " . $e->getMessage());
            }
        }

        Log::info("[ExpireContractProposals] {$count} proposal(s) auto-expired");
        $this->info("{$count} proposal(s) EXPIRED mark kiye gaye.");

        return self::SUCCESS;
    }
}
