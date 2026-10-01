@extends('admin.layouts.app')

@section('title', $t['paymentLogs'] ?? 'Transactions & Payouts')

@section('content')
<div class="p-6">

    <!-- Header -->
    <div class="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ $t['financialOverview'] ?? 'Financial Ledger & Transactions' }}</h1>
            <p class="text-gray-500 text-sm mt-1">{{ $t['financialSubtitle'] ?? 'Live tracking of all wallet recharges, withdrawals, platform fees, and gateway orders' }}</p>
        </div>
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                लाइव लेजर (Live Ledger)
            </span>
        </div>
    </div>

    <!-- ── 4 Top Financial KPI Cards ── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- 1. Total Platform Revenue -->
        <div class="card p-5 border-l-4 border-l-green-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ $t['kpiPlatformRevenue'] ?? 'Platform Revenue' }}</p>
                    <p class="text-2xl font-extrabold text-gray-900 mt-1">₹{{ number_format($kpis['platformRevenue'], 2) }}</p>
                    <p class="text-xs text-green-600 font-medium mt-1">{{ $t['kpiPlatformRevenueSub'] ?? 'From booking & withdrawal fees' }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                    <i data-lucide="trending-up" class="w-6 h-6"></i>
                </div>
            </div>
        </div>

        <!-- 2. Total Inflow (Recharges) -->
        <div class="card p-5 border-l-4 border-l-blue-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ $t['kpiTotalRecharges'] ?? 'Total Inflow (Recharges)' }}</p>
                    <p class="text-2xl font-extrabold text-blue-600 mt-1">₹{{ number_format($kpis['recharges'], 2) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ $t['kpiTotalRechargesSub'] ?? 'Total money added by users' }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <i data-lucide="arrow-down-left" class="w-6 h-6"></i>
                </div>
            </div>
        </div>

        <!-- 3. Total Withdrawals Outflow -->
        <div class="card p-5 border-l-4 border-l-orange-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ $t['kpiTotalWithdrawals'] ?? 'Total Withdrawals' }}</p>
                    <p class="text-2xl font-extrabold text-orange-600 mt-1">₹{{ number_format($kpis['withdrawals'], 2) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ $t['kpiTotalWithdrawalsSub'] ?? 'Withdrawn to bank/UPI' }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <i data-lucide="arrow-up-right" class="w-6 h-6"></i>
                </div>
            </div>
        </div>

        <!-- 4. User Wallet Reserves -->
        <div class="card p-5 border-l-4 border-l-purple-500">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ $t['kpiWalletReserves'] ?? 'User Wallet Reserves' }}</p>
                    <p class="text-2xl font-extrabold text-purple-700 mt-1">₹{{ number_format($kpis['reserves'], 2) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ $t['kpiWalletReservesSub'] ?? 'Active balance in user wallets' }}</p>
                </div>
                <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <i data-lucide="wallet" class="w-6 h-6"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- ── Tab Navigation ── -->
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 mb-6 pb-2">
        @php
            $tabs = [
                'all'         => ['label' => $t['tabAll'] ?? '📋 All Transactions',     'count' => $tabCounts['all']],
                'withdrawals' => ['label' => $t['tabWithdrawals'] ?? '💸 Withdrawals',   'count' => $tabCounts['withdrawals']],
                'recharges'   => ['label' => $t['tabRecharges'] ?? '➕ Recharges',       'count' => $tabCounts['recharges']],
                'fees'        => ['label' => $t['tabFees'] ?? '📈 Platform Earnings',   'count' => $tabCounts['fees']],
                'gateway'     => ['label' => $t['tabGateway'] ?? '⚡ Razorpay Gateway',  'count' => $tabCounts['gateway']],
            ];
        @endphp

        @foreach($tabs as $tabKey => $tabData)
            @php $isActive = $tab === $tabKey; @endphp
            <a href="{{ route('admin.payments', ['tab' => $tabKey]) }}"
               class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all {{ $isActive ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100' }}">
                <span>{{ $tabData['label'] }}</span>
                <span class="px-2 py-0.5 rounded-full text-xs {{ $isActive ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700' }}">
                    {{ $tabData['count'] }}
                </span>
            </a>
        @endforeach
    </div>

    <!-- ── Search & Filter Controls ── -->
    <div class="card p-4 mb-6">
        <form method="GET" action="{{ route('admin.payments') }}" class="flex flex-col md:flex-row gap-3 items-center">
            <input type="hidden" name="tab" value="{{ $tab }}">

            <!-- Search input -->
            <div class="relative flex-1 w-full">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"></i>
                <input type="text" name="search"
                    placeholder="{{ $t['searchTx'] ?? 'Search by user, phone, ID, or reference...' }}"
                    value="{{ request('search') }}"
                    class="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            </div>

            @if($tab !== 'gateway')
                <!-- Type Filter -->
                <select name="type" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto">
                    <option value="">{{ $t['allTypes'] ?? 'All Types' }}</option>
                    <option value="credit" {{ request('type') === 'credit' ? 'selected' : '' }}>🟢 {{ $t['credit'] ?? 'Credit' }}</option>
                    <option value="debit"  {{ request('type') === 'debit'  ? 'selected' : '' }}>🔴 {{ $t['debit'] ?? 'Debit' }}</option>
                </select>

                @if($tab === 'all')
                <!-- Category Filter -->
                <select name="category" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto">
                    <option value="">{{ $t['allCategories'] ?? 'All Categories' }}</option>
                    <option value="RECHARGE"        {{ request('category') === 'RECHARGE' ? 'selected' : '' }}>वॉलेट रिचार्ज (RECHARGE)</option>
                    <option value="WITHDRAWAL"      {{ request('category') === 'WITHDRAWAL' ? 'selected' : '' }}>निकासी (WITHDRAWAL)</option>
                    <option value="WITHDRAWAL_FEE"  {{ request('category') === 'WITHDRAWAL_FEE' ? 'selected' : '' }}>बैंक शुल्क (WITHDRAWAL_FEE)</option>
                    <option value="PLATFORM_FEE"    {{ request('category') === 'PLATFORM_FEE' ? 'selected' : '' }}>प्लेटफ़ॉर्म शुल्क (PLATFORM_FEE)</option>
                    <option value="FRC_BONUS"       {{ request('category') === 'FRC_BONUS' ? 'selected' : '' }}>रेफरल बोनस (FRC_BONUS)</option>
                    <option value="ONBOARDING_BONUS" {{ request('category') === 'ONBOARDING_BONUS' ? 'selected' : '' }}>ऑनबोर्डिंग बोनस</option>
                </select>
                @endif
            @else
                <!-- Gateway Status Filter -->
                <select name="status" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-auto">
                    <option value="">{{ $t['allStatuses'] }}</option>
                    <option value="success"  {{ request('status') === 'success'  ? 'selected' : '' }}>{{ $t['success'] }}</option>
                    <option value="created"  {{ request('status') === 'created'  ? 'selected' : '' }}>{{ $t['created'] }}</option>
                    <option value="failed"   {{ request('status') === 'failed'   ? 'selected' : '' }}>{{ $t['failed'] }}</option>
                    <option value="refunded" {{ request('status') === 'refunded' ? 'selected' : '' }}>{{ $t['refunded'] }}</option>
                </select>
            @endif

            <div class="flex gap-2 w-full md:w-auto">
                <button type="submit" class="btn-primary flex-1 md:flex-initial">
                    {{ $t['filter'] ?? 'Filter' }}
                </button>
                @if(request('search') || request('type') || request('category') || request('status'))
                    <a href="{{ route('admin.payments', ['tab' => $tab]) }}" class="btn-secondary">
                        {{ $t['clear'] ?? 'Clear' }}
                    </a>
                @endif
            </div>
        </form>
    </div>

    <!-- ── Transaction Content Table ── -->
    <div class="card overflow-hidden">
        @if($tab !== 'gateway')
            <!-- Wallet Ledger Transactions Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="table-th">ID</th>
                            <th class="table-th">{{ $t['user'] ?? 'User' }}</th>
                            <th class="table-th">प्रकार (Type)</th>
                            <th class="table-th">श्रेणी (Category)</th>
                            <th class="table-th">{{ $t['amount'] }}</th>
                            <th class="table-th">{{ $t['balanceAfter'] ?? 'Balance After' }}</th>
                            <th class="table-th">{{ $t['description'] ?? 'Description / Destination' }}</th>
                            <th class="table-th">{{ $t['date'] }}</th>
                            <th class="table-th text-right">कार्य (Action)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        @php
                            $roleColors = [
                                'customer'   => 'bg-blue-50 text-blue-700 border-blue-200',
                                'provider'   => 'bg-orange-50 text-orange-700 border-orange-200',
                                'contractor' => 'bg-indigo-50 text-indigo-700 border-indigo-200',
                                'driver'     => 'bg-amber-50 text-amber-700 border-amber-200',
                                'karigar'    => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                'agent'      => 'bg-teal-50 text-teal-700 border-teal-200',
                                'admin'      => 'bg-purple-50 text-purple-700 border-purple-200',
                            ];

                            $categoryStyles = [
                                'RECHARGE'        => ['badge' => 'bg-blue-100 text-blue-800',   'label' => '➕ रिचार्ज'],
                                'WITHDRAWAL'      => ['badge' => 'bg-orange-100 text-orange-800', 'label' => '💸 निकासी'],
                                'WITHDRAWAL_FEE'  => ['badge' => 'bg-gray-100 text-gray-700',   'label' => '🏦 बैंक शुल्क'],
                                'PLATFORM_FEE'    => ['badge' => 'bg-purple-100 text-purple-800', 'label' => '📈 प्लेटफ़ॉर्म शुल्क'],
                                'FRC_BONUS'       => ['badge' => 'bg-emerald-100 text-emerald-800', 'label' => '🎁 रेफरल बोनस'],
                                'ONBOARDING_BONUS' => ['badge' => 'bg-amber-100 text-amber-800', 'label' => '🎉 स्वागत बोनस'],
                            ];
                        @endphp

                        @forelse($transactions as $tx)
                        <tr class="hover:bg-gray-50 transition-colors">
                            <!-- ID -->
                            <td class="table-td text-gray-500 font-mono font-semibold">#{{ $tx->id }}</td>

                            <!-- User Info -->
                            <td class="table-td">
                                @if($tx->user)
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                                            {{ strtoupper(substr($tx->user->name ?? 'U', 0, 1)) }}
                                        </div>
                                        <div>
                                            <p class="font-semibold text-gray-900 leading-tight">{{ $tx->user->name }}</p>
                                            <p class="text-xs text-gray-500">{{ $tx->user->phone }}</p>
                                            <span class="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border {{ $roleColors[$tx->user->role] ?? 'bg-gray-50 text-gray-600 border-gray-200' }}">
                                                {{ ucfirst($tx->user->role) }}
                                            </span>
                                        </div>
                                    </div>
                                @else
                                    <span class="text-gray-400">User #{{ $tx->user_id }}</span>
                                @endif
                            </td>

                            <!-- Type (Credit / Debit) -->
                            <td class="table-td">
                                @if($tx->type === 'credit')
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                        <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i> Credit
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> Debit
                                    </span>
                                @endif
                            </td>

                            <!-- Category -->
                            <td class="table-td">
                                @php
                                    $catInfo = $categoryStyles[$tx->category] ?? ['badge' => 'bg-gray-100 text-gray-700', 'label' => $tx->category];
                                @endphp
                                <span class="badge {{ $catInfo['badge'] }}">
                                    {{ $catInfo['label'] }}
                                </span>
                            </td>

                            <!-- Amount -->
                            <td class="table-td font-extrabold text-base {{ $tx->type === 'credit' ? 'text-green-600' : 'text-gray-900' }}">
                                {{ $tx->type === 'credit' ? '+' : '-' }}₹{{ number_format($tx->amount, 2) }}
                            </td>

                            <!-- Balance After -->
                            <td class="table-td font-semibold text-gray-600">
                                ₹{{ number_format($tx->balance_after, 2) }}
                            </td>

                            <!-- Description / Destination -->
                            <td class="table-td max-w-xs">
                                <p class="text-xs text-gray-700 font-medium leading-relaxed">{{ $tx->description }}</p>
                                @if(str_contains($tx->description, 'UPI:'))
                                    <span class="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                        ⚡ UPI Transfer
                                    </span>
                                @elseif(str_contains($tx->description, 'बैंक') || str_contains($tx->description, 'Bank'))
                                    <span class="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        🏦 Bank Transfer
                                    </span>
                                @endif
                            </td>

                            <!-- Date -->
                            <td class="table-td text-gray-500 text-xs whitespace-nowrap">
                                <div>{{ $tx->created_at?->format('d M Y') ?? '—' }}</div>
                                <div class="text-[11px] text-gray-400">{{ $tx->created_at?->format('h:i A') ?? '' }}</div>
                            </td>

                            <!-- Action (Settlement for withdrawals) -->
                            <td class="table-td text-right whitespace-nowrap">
                                @if($tx->category === 'WITHDRAWAL')
                                    @if(str_contains($tx->description, '[Settled:'))
                                        <span class="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-200">
                                            ✅ भुगतान संपन्न (Settled)
                                        </span>
                                    @else
                                        <form method="POST" action="{{ route('admin.withdrawals.settle', $tx->id) }}" class="inline-block" onsubmit="return confirm('क्या आपने उपयोगकर्ता को राशि ट्रांसफर कर दी है?');">
                                            @csrf
                                            <input type="hidden" name="settlement_ref" value="Manual UTR / Payout Verified">
                                            <button type="submit" class="inline-flex items-center gap-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg shadow-sm transition-all">
                                                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> भुगतान मार्क करें
                                            </button>
                                        </form>
                                    @endif
                                @else
                                    <span class="text-xs text-gray-400">—</span>
                                @endif
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="9" class="text-center py-12 text-gray-400">
                                <div class="flex flex-col items-center justify-center">
                                    <i data-lucide="receipt" class="w-10 h-10 text-gray-300 mb-2"></i>
                                    <p class="font-medium">{{ $t['noPayments'] ?? 'No transactions found' }}</p>
                                    <p class="text-xs text-gray-400 mt-1">इस फ़िल्टर या खोज के अंतर्गत कोई रिकॉर्ड मौजूद नहीं है।</p>
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-gray-100 flex items-center justify-between">
                <p class="text-xs text-gray-500">
                    कुल <span class="font-bold text-gray-800">{{ $transactions->total() }}</span> में से <span class="font-bold text-gray-800">{{ $transactions->firstItem() ?? 0 }}-{{ $transactions->lastItem() ?? 0 }}</span> दिखाए जा रहे हैं
                </p>
                <div>{{ $transactions->links() }}</div>
            </div>

        @else
            <!-- Raw Razorpay Gateway Orders Table -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="table-th">ID</th>
                            <th class="table-th">{{ $t['user'] ?? 'User' }}</th>
                            <th class="table-th">{{ $t['amount'] }}</th>
                            <th class="table-th">{{ $t['razorpayOrder'] }}</th>
                            <th class="table-th">Payment ID</th>
                            <th class="table-th">{{ $t['status'] }}</th>
                            <th class="table-th">{{ $t['date'] }}</th>
                            <th class="table-th text-right">{{ $t['actions'] }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        @php
                            $statusColors = [
                                'success'        => 'bg-green-100 text-green-700',
                                'created'        => 'bg-yellow-100 text-yellow-700',
                                'failed'         => 'bg-red-100 text-red-700',
                                'refunded'       => 'bg-blue-100 text-blue-700',
                                'refund_pending' => 'bg-purple-100 text-purple-700',
                            ];
                            $statusLabels = [
                                'success'        => $t['success'],
                                'created'        => $t['created'],
                                'failed'         => $t['failed'],
                                'refunded'       => $t['refunded'],
                                'refund_pending' => $t['refunded'],
                            ];
                        @endphp

                        @forelse($payments as $payment)
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="table-td text-gray-500 font-mono">#{{ $payment->id }}</td>
                            <td class="table-td">
                                @if($payment->user)
                                    <div>
                                        <p class="font-semibold text-gray-900">{{ $payment->user->name }}</p>
                                        <p class="text-xs text-gray-500">{{ $payment->user->phone }}</p>
                                    </div>
                                @else
                                    <span class="text-gray-400">User #{{ $payment->user_id }}</span>
                                @endif
                            </td>
                            <td class="table-td font-extrabold text-gray-900">₹{{ number_format($payment->amount, 2) }}</td>
                            <td class="table-td text-xs text-gray-600 font-mono">
                                {{ $payment->razorpay_order_id ?? '—' }}
                            </td>
                            <td class="table-td text-xs text-gray-600 font-mono">
                                {{ $payment->razorpay_payment_id ?? '—' }}
                            </td>
                            <td class="table-td">
                                <span class="badge {{ $statusColors[$payment->status] ?? 'bg-gray-100 text-gray-700' }}">
                                    {{ $statusLabels[$payment->status] ?? $payment->status }}
                                </span>
                            </td>
                            <td class="table-td text-gray-500 text-xs">
                                {{ $payment->created_at?->format('d M Y, h:i A') ?? '—' }}
                            </td>
                            <td class="table-td text-right">
                                @if($payment->status === 'success')
                                    <form method="POST" action="{{ route('admin.payments.refund', $payment->id) }}" class="inline">
                                        @csrf
                                        <input type="hidden" name="reason" value="Admin manual refund">
                                        <button type="submit"
                                            onclick="return confirm('Initiate refund for ₹{{ $payment->amount }}?')"
                                            class="inline-flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg transition-all font-semibold">
                                            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
                                            {{ $t['refund'] }}
                                        </button>
                                    </form>
                                @else
                                    <span class="text-xs text-gray-400">—</span>
                                @endif
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="8" class="text-center py-12 text-gray-400">
                                <div class="flex flex-col items-center justify-center">
                                    <i data-lucide="credit-card" class="w-10 h-10 text-gray-300 mb-2"></i>
                                    <p class="font-medium">{{ $t['noPayments'] ?? 'No payments found' }}</p>
                                    <p class="text-xs text-gray-400 mt-1">गेटवे पर कोई सीधा भुगतान रिकॉर्ड नहीं मिला।</p>
                                </div>
                            </td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="p-4 border-t border-gray-100 flex items-center justify-between">
                <p class="text-xs text-gray-500">
                    कुल <span class="font-bold text-gray-800">{{ $payments->total() }}</span> में से <span class="font-bold text-gray-800">{{ $payments->firstItem() ?? 0 }}-{{ $payments->lastItem() ?? 0 }}</span> दिखाए जा रहे हैं
                </p>
                <div>{{ $payments->links() }}</div>
            </div>
        @endif
    </div>

</div>
@endsection
