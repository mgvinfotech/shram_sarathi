<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Commission;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommissionService
{
    // ─── Helper: record a wallet transaction ─────────────────────────────────

    private function recordTransaction(
        Wallet $wallet,
        float  $amount,
        string $type,       // 'credit' | 'debit'
        string $category,
        string $description,
        string $holdStatus = 'none',
        ?int   $commissionId = null
    ): WalletTransaction {
        // Re-fetch fresh balance to avoid race conditions
        $wallet->refresh();
        $balanceAfter = $type === 'credit'
            ? $wallet->balance + $wallet->hold_balance
            : $wallet->balance + $wallet->hold_balance;

        // Use the appropriate balance field for display
        $balanceAfter = $wallet->balance + ($holdStatus === 'held' ? $wallet->hold_balance : 0);

        return WalletTransaction::create([
            'wallet_id'     => $wallet->id,
            'user_id'       => $wallet->user_id,
            'amount'        => $amount,
            'type'          => $type,
            'category'      => $category,
            'description'   => $description,
            'commission_id' => $commissionId,
            'balance_after' => $wallet->balance + $wallet->hold_balance,
            'hold_status'   => $holdStatus,
        ]);
    }

    // ─── 1. Agent adds a new Labor/Driver/Karigar → ₹10 PENDING bonus ─────────

    /**
     * Called right after a Labor/Karigar/Driver is registered by an agent.
     * ₹10 goes into hold_balance (pending until first job acceptance).
     * For Contractor/Vehicle: ₹20 instant is handled in processFirstRegistrationComplete.
     */
    public function processOnboardingBonus(User $newProvider, int $agentId): void
    {
        // Only for LABOUR, KARIGAR, DRIVER roles
        if (!in_array(strtoupper($newProvider->role), ['LABOUR', 'KARIGAR', 'DRIVER', 'PROVIDER'])) {
            return;
        }

        DB::transaction(function () use ($newProvider, $agentId) {
            $agentWallet = Wallet::firstOrCreate(['user_id' => $agentId]);

            // Add ₹10 to hold_balance (locked)
            $agentWallet->hold_balance  += 10.00;
            $agentWallet->total_earned  += 10.00;
            $agentWallet->save();

            $commission = Commission::create([
                'agent_id'    => $agentId,
                'provider_id' => $newProvider->id,
                'amount'      => 10.00,
                'status'      => 'hold',
            ]);

            $this->recordTransaction(
                $agentWallet, 10.00, 'credit',
                'ONBOARDING_BONUS',
                "₹10 पंजीकरण बोनस — {$newProvider->name} ({$newProvider->role}). पहला काम स्वीकार होने पर अनलॉक होगा।",
                'held',
                $commission->id
            );
        });
    }

    // ─── 2. Worker accepts first job → unlock ₹10 from hold to withdrawable ──

    /**
     * Triggered when a Labour/Karigar/Driver accepts their FIRST booking.
     * Moves ₹10 from hold_balance to balance (withdrawable).
     */
    public function processFirstJobAcceptance(User|int $provider): void
    {
        $providerUser = $provider instanceof User ? $provider : User::find($provider);
        if (!$providerUser || !$providerUser->created_by_agent_id) {
            return;
        }

        DB::transaction(function () use ($providerUser) {
            $agentWallet = Wallet::firstOrCreate(['user_id' => $providerUser->created_by_agent_id]);

            // Check there's a hold commission for this provider
            $commission = Commission::where('agent_id', $providerUser->created_by_agent_id)
                ->where('provider_id', $providerUser->id)
                ->where('status', 'hold')
                ->whereNull('first_booking_id')
                ->latest()
                ->first();

            if (!$commission || $agentWallet->hold_balance < 10.00) {
                return;
            }

            // Move from hold → balance
            $agentWallet->hold_balance  -= 10.00;
            $agentWallet->balance       += 10.00;
            $agentWallet->save();

            // Update commission to released
            $commission->update(['status' => 'released', 'released_at' => now()]);

            $this->recordTransaction(
                $agentWallet, 10.00, 'credit',
                'ONBOARDING_BONUS_RELEASE',
                "₹10 बोनस अनलॉक — {$providerUser->name} ने पहला काम स्वीकार किया।",
                'released',
                $commission->id
            );
        });
    }

    // ─── 3. Contractor/Vehicle FRC complete → ₹20 instant withdrawable ────────

    /**
     * Triggered when a Contractor or Vehicle provider completes First Registration + KYC.
     * ₹20 goes directly to balance (withdrawable immediately).
     */
    public function processFirstRegistrationComplete(User $provider): void
    {
        if (!$provider->created_by_agent_id) {
            return;
        }

        $role = strtoupper($provider->role);
        if (!in_array($role, ['CONTRACTOR', 'VEHICLE_TRANSPORT', 'VEHICLE'])) {
            return;
        }

        DB::transaction(function () use ($provider) {
            $agentWallet = Wallet::firstOrCreate(['user_id' => $provider->created_by_agent_id]);

            // ₹20 instant to withdrawable balance
            $agentWallet->balance      += 20.00;
            $agentWallet->total_earned += 20.00;
            $agentWallet->save();

            $commission = Commission::create([
                'agent_id'    => $provider->created_by_agent_id,
                'provider_id' => $provider->id,
                'amount'      => 20.00,
                'status'      => 'released',
                'released_at' => now(),
            ]);

            $this->recordTransaction(
                $agentWallet, 20.00, 'credit',
                'FRC_BONUS',
                "₹20 FRC बोनस — {$provider->name} का KYC सफलतापूर्वक सत्यापित।",
                'none',
                $commission->id
            );
        });
    }

    // ─── 4. Labour/Karigar/Driver booking → ₹1 residual commission ────────────

    /**
     * Triggered when a booking for Labour/Karigar/Driver is accepted.
     * Agent gets ₹1 per booking (directly withdrawable).
     * Also deducts ₹20 booking fee from customer wallet.
     */
    public function processBookingAcceptance(Booking $booking): void
    {
        DB::transaction(function () use ($booking) {
            $customer       = $booking->customer;
            $provider       = $booking->provider;
            $customerWallet = Wallet::firstOrCreate(['user_id' => $customer->id]);
            $providerRole   = strtoupper($provider->role ?? '');

            // ── Labour / Karigar / Driver ─────────────────────────────────────
            if (in_array($providerRole, ['LABOUR', 'KARIGAR', 'DRIVER', 'PROVIDER'])) {
                $bookingFee = 20.00;

                if ($customerWallet->balance < $bookingFee) {
                    throw new \Exception("ग्राहक के वॉलेट में पर्याप्त बैलेंस नहीं है।");
                }

                // Deduct from customer
                $customerWallet->balance -= $bookingFee;
                $customerWallet->save();

                // Agent residual ₹1
                if ($provider->created_by_agent_id) {
                    $agentWallet = Wallet::firstOrCreate(['user_id' => $provider->created_by_agent_id]);
                    $agentWallet->balance      += 1.00;
                    $agentWallet->total_earned += 1.00;
                    $agentWallet->save();

                    $commission = Commission::create([
                        'agent_id'         => $provider->created_by_agent_id,
                        'provider_id'      => $provider->id,
                        'first_booking_id' => $booking->id,
                        'amount'           => 1.00,
                        'status'           => 'released',
                        'released_at'      => now(),
                    ]);

                    $this->recordTransaction(
                        $agentWallet, 1.00, 'credit',
                        'BOOKING_COMMISSION',
                        "₹1 बुकिंग कमीशन — {$provider->name} ({$providerRole}) की बुकिंग #{$booking->id}।",
                        'none',
                        $commission->id
                    );
                }
            }

            // ── Contractor → 2% platform fee deducted from contractor wallet ──
            if ($providerRole === 'CONTRACTOR') {
                $contractValue    = $booking->fare ?? 0;
                $platformFee      = $contractValue * 0.02;   // 2% platform commission
                $agentCommission  = $contractValue * 0.002;  // 0.20% to agent

                $providerWallet = Wallet::firstOrCreate(['user_id' => $provider->id]);

                if ($providerWallet->balance < $platformFee) {
                    throw new \Exception("ठेकेदार के वॉलेट में पर्याप्त बैलेंस नहीं है। 2% प्लेटफ़ॉर्म शुल्क आवश्यक है।");
                }

                // Deduct platform 2% from contractor
                $providerWallet->balance -= $platformFee;
                $providerWallet->save();

                // Agent gets 0.20% of contract value
                if ($provider->created_by_agent_id && $agentCommission > 0) {
                    $agentWallet = Wallet::firstOrCreate(['user_id' => $provider->created_by_agent_id]);
                    $agentWallet->balance      += $agentCommission;
                    $agentWallet->total_earned += $agentCommission;
                    $agentWallet->save();

                    $commission = Commission::create([
                        'agent_id'         => $provider->created_by_agent_id,
                        'provider_id'      => $provider->id,
                        'first_booking_id' => $booking->id,
                        'amount'           => $agentCommission,
                        'status'           => 'released',
                        'released_at'      => now(),
                    ]);

                    $this->recordTransaction(
                        $agentWallet, $agentCommission, 'credit',
                        'CONTRACTOR_COMMISSION',
                        "0.20% ठेकेदार कमीशन — {$provider->name}, ठेका राशि: ₹{$contractValue}, बुकिंग #{$booking->id}।",
                        'none',
                        $commission->id
                    );
                }
            }
        });
    }

    /**
     * Helper for modular worker bookings (Labour, Karigar, Driver):
     * Awards ₹1 residual commission to the referring agent when a job is confirmed.
     */
    public function processWorkerBookingResidual(User|int $worker, int $bookingId, string $module = 'Labour'): void
    {
        $workerUser = $worker instanceof User ? $worker : User::find($worker);
        if (!$workerUser || !$workerUser->created_by_agent_id) {
            return;
        }

        try {
            DB::transaction(function () use ($workerUser, $bookingId, $module) {
                $agentWallet = Wallet::firstOrCreate(['user_id' => $workerUser->created_by_agent_id]);
                $agentWallet->balance      += 1.00;
                $agentWallet->total_earned += 1.00;
                $agentWallet->save();

                $commission = Commission::create([
                    'agent_id'         => $workerUser->created_by_agent_id,
                    'provider_id'      => $workerUser->id,
                    'first_booking_id' => $bookingId,
                    'amount'           => 1.00,
                    'status'           => 'released',
                    'released_at'      => now(),
                ]);

                $this->recordTransaction(
                    $agentWallet, 1.00, 'credit',
                    'BOOKING_COMMISSION',
                    "₹1 लाइफ़टाइम बुकिंग कमीशन ({$module}) — {$workerUser->name}, बुकिंग #{$bookingId}।",
                    'none',
                    $commission->id
                );
            });
        } catch (\Throwable $e) {
            Log::warning("[Commission] processWorkerBookingResidual failed: " . $e->getMessage());
        }
    }

    /**
     * Helper for Contractor & Vehicle/Transport bookings:
     * Awards 0.20% (0.0020) residual commission of total booking value to referring agent.
     */
    public function processContractorOrVehicleBookingResidual(User|int $provider, int $bookingId, float $totalBookingAmount, string $type = 'Transport'): void
    {
        $providerUser = $provider instanceof User ? $provider : User::find($provider);
        if (!$providerUser || !$providerUser->created_by_agent_id || $totalBookingAmount <= 0) {
            return;
        }

        $agentCommission = round($totalBookingAmount * 0.0020, 2);
        if ($agentCommission <= 0) {
            return;
        }

        try {
            DB::transaction(function () use ($providerUser, $bookingId, $totalBookingAmount, $agentCommission, $type) {
                $agentWallet = Wallet::firstOrCreate(['user_id' => $providerUser->created_by_agent_id]);
                $agentWallet->balance      += $agentCommission;
                $agentWallet->total_earned += $agentCommission;
                $agentWallet->save();

                $commission = Commission::create([
                    'agent_id'         => $providerUser->created_by_agent_id,
                    'provider_id'      => $providerUser->id,
                    'first_booking_id' => $bookingId,
                    'amount'           => $agentCommission,
                    'status'           => 'released',
                    'released_at'      => now(),
                ]);

                $this->recordTransaction(
                    $agentWallet, $agentCommission, 'credit',
                    '0.20%_BOOKING_SHARE',
                    "0.20% कमीशन ({$type}) — कुल राशि ₹{$totalBookingAmount}, बुकिंग #{$bookingId}।",
                    'none',
                    $commission->id
                );
            });
        } catch (\Throwable $e) {
            Log::warning("[Commission] processContractorOrVehicleBookingResidual failed: " . $e->getMessage());
        }
    }

    // ─── 5. Agent withdrawal ─────────────────────────────────────────────────

    /**
     * Process Agent withdrawal. Min ₹500. Only from balance (not hold).
     */
    public function processAgentWithdrawal(int $agentId, float $requestedAmount): array
    {
        $agent = User::findOrFail($agentId);

        if (strtoupper($agent->role) !== 'AGENT') {
            return ['status' => 'ERROR', 'message' => 'केवल एजेंट निकासी कर सकते हैं।'];
        }

        if ($requestedAmount < 50) {
            return ['status' => 'ERROR', 'message' => 'निकासी के लिए न्यूनतम राशि ₹50 होनी चाहिए।'];
        }

        $withdrawalFee = (float) \App\Models\Setting::get('withdrawal_charge', 2.0);
        $totalDebit    = round($requestedAmount + $withdrawalFee, 2);

        $agentWallet = Wallet::firstOrCreate(['user_id' => $agentId]);

        if ($agentWallet->balance < $totalDebit) {
            return [
                'status'  => 'ERROR',
                'message' => "निकासी राशि (₹{$requestedAmount}) + चार्ज (₹{$withdrawalFee}) = कुल ₹{$totalDebit} आवश्यक है। आपके पास ₹{$agentWallet->balance} उपलब्ध है।"
            ];
        }

        DB::transaction(function () use ($agentWallet, $requestedAmount, $withdrawalFee, $totalDebit) {
            $agentWallet->balance          -= $totalDebit;
            $agentWallet->total_withdrawn  += $requestedAmount;
            $agentWallet->save();

            $this->recordTransaction(
                $agentWallet, $requestedAmount, 'debit',
                'WITHDRAWAL',
                "₹{$requestedAmount} निकासी अनुरोध।",
                'none'
            );

            if ($withdrawalFee > 0) {
                $this->recordTransaction(
                    $agentWallet, $withdrawalFee, 'debit',
                    'WITHDRAWAL_FEE',
                    "निकासी ट्रांजैक्शन चार्ज / बैंक शुल्क (₹{$withdrawalFee})",
                    'none'
                );
            }
        });

        return [
            'status'        => 'SUCCESS',
            'message'       => "₹{$requestedAmount} निकासी अनुरोध सफलतापूर्वक सबमिट किया गया। चार्ज: ₹{$withdrawalFee}।",
            'amount'        => $requestedAmount,
            'fee'           => $withdrawalFee,
            'balance_after' => $agentWallet->balance,
        ];
    }
}
