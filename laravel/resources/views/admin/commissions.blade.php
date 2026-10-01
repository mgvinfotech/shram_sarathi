@extends('admin.layouts.app')

@section('title', $t['commissions'])

@section('content')
<div class="p-6">

    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">{{ $t['commissionManagement'] }}</h1>
        <p class="text-gray-500 text-sm mt-1">{{ $t['commissionSubtitle'] }}</p>
    </div>

    <!-- Vehicle Booking Commission Settings (गाड़ी बुकिंग कमीशन नियंत्रण) -->
    <div class="card p-5 mb-6 border-l-4 border-orange-500 bg-white shadow-sm rounded-xl">
        <div class="flex items-center justify-between mb-3">
            <div>
                <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>🚗</span>
                    <span>{{ $lang === 'hi' ? 'गाड़ी बुकिंग कमीशन सेटिंग्स (Vehicle Commission Control)' : 'Vehicle Booking Commission Settings' }}</span>
                </h2>
                <p class="text-xs text-gray-500 mt-0.5">
                    {{ $lang === 'hi' ? 'गाड़ी बुकिंग पर कमीशन 5% से 7% के दायरे में रहेगा। न्यूनतम कमीशन ₹5 से कम नहीं काटा जाएगा।' : 'Vehicle commission stays within 5% to 7%. Minimum commission cannot be less than ₹5.' }}
                </p>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                5% - 7% Range & Min ₹5
            </span>
        </div>

        <form method="POST" action="{{ route('admin.settings.vehicle-commission') }}" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-2 border-t border-gray-100">
            @csrf
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">
                    {{ $lang === 'hi' ? 'एडवांस बुकिंग कमीशन (%)' : 'Advance Booking Comm (%)' }}
                </label>
                <div class="relative">
                    <input type="number" step="0.1" min="5" max="7" name="normal_pct"
                           value="{{ old('normal_pct', $vehicleSettings['normal_pct'] ?? 5.0) }}"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" required>
                    <span class="absolute right-3 top-2 text-gray-400 text-xs font-bold">%</span>
                </div>
                <span class="text-[11px] text-gray-400">Min 5.0% - Max 7.0%</span>
            </div>

            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">
                    {{ $lang === 'hi' ? 'इमीडिएट बुकिंग कमीशन (%)' : 'Immediate Booking Comm (%)' }}
                </label>
                <div class="relative">
                    <input type="number" step="0.1" min="5" max="7" name="immediate_pct"
                           value="{{ old('immediate_pct', $vehicleSettings['immediate_pct'] ?? 7.0) }}"
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" required>
                    <span class="absolute right-3 top-2 text-gray-400 text-xs font-bold">%</span>
                </div>
                <span class="text-[11px] text-gray-400">Min 5.0% - Max 7.0%</span>
            </div>

            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">
                    {{ $lang === 'hi' ? 'न्यूनतम कटौती सीमा (₹)' : 'Minimum Cut Deduction (₹)' }}
                </label>
                <div class="relative">
                    <span class="absolute left-3 top-2 text-gray-500 text-sm">₹</span>
                    <input type="number" step="1" min="5" name="min_commission"
                           value="{{ old('min_commission', $vehicleSettings['min_commission'] ?? 5.0) }}"
                           class="w-full pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none" required>
                </div>
                <span class="text-[11px] text-gray-400">{{ $lang === 'hi' ? 'न्यूनतम ₹5 (कमीशन इससे कम नहीं कटेगा)' : 'Min ₹5 (never deducted below this)' }}</span>
            </div>

            <div>
                <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-1.5">
                    <span>💾</span>
                    <span>{{ $lang === 'hi' ? 'सेटिंग्स सुरक्षित करें' : 'Save Settings' }}</span>
                </button>
            </div>
        </form>
    </div>

    <!-- Filter -->
    <form method="GET" action="{{ route('admin.commissions') }}" class="flex gap-3 mb-6">
        <select name="status" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">{{ $t['allStatuses'] }}</option>
            <option value="hold"      {{ request('status') === 'hold'      ? 'selected' : '' }}>{{ $t['hold'] }}</option>
            <option value="released"  {{ request('status') === 'released'  ? 'selected' : '' }}>{{ $t['released'] }}</option>
        </select>
        <button type="submit" class="btn-primary">{{ $t['filter'] }}</button>
        @if(request('status'))
            <a href="{{ route('admin.commissions') }}" class="btn-secondary">{{ $t['clear'] }}</a>
        @endif
    </form>

    <div class="card overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th class="table-th">ID</th>
                    <th class="table-th">{{ $t['agentId'] }}</th>
                    <th class="table-th">{{ $t['providerId'] }}</th>
                    <th class="table-th">{{ $t['amount'] }}</th>
                    <th class="table-th">{{ $t['status'] }}</th>
                    <th class="table-th">{{ $lang === 'hi' ? 'रिलीज़ की तारीख' : 'Released At' }}</th>
                    <th class="table-th">{{ $t['actions'] }}</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
                @forelse($commissions as $commission)
                <tr class="hover:bg-gray-50">
                    <td class="table-td text-gray-500">#{{ $commission->id }}</td>
                    <td class="table-td">{{ $commission->agent_id }}</td>
                    <td class="table-td">{{ $commission->provider_id }}</td>
                    <td class="table-td font-semibold">₹{{ $commission->amount }}</td>
                    <td class="table-td">
                        @if($commission->status === 'hold')
                            <span class="badge bg-yellow-100 text-yellow-700">{{ $t['hold'] }}</span>
                        @elseif($commission->status === 'released')
                            <span class="badge bg-green-100 text-green-700">{{ $t['released'] }}</span>
                        @else
                            <span class="badge bg-gray-100 text-gray-700">{{ $commission->status }}</span>
                        @endif
                    </td>
                    <td class="table-td text-gray-500 text-xs">
                        {{ $commission->released_at ? \Carbon\Carbon::parse($commission->released_at)->format('d M Y') : '—' }}
                    </td>
                    <td class="table-td">
                        @if($commission->status === 'hold')
                            <form method="POST" action="{{ route('admin.commissions.release', $commission->id) }}" class="inline">
                                @csrf
                                <button type="submit"
                                    onclick="return confirm('Release ₹{{ $commission->amount }} commission?')"
                                    class="flex items-center gap-1 text-xs text-green-600 hover:bg-green-50 px-2 py-1 rounded">
                                    <i data-lucide="unlock" class="w-3 h-3"></i>
                                    {{ $t['release'] }}
                                </button>
                            </form>
                        @endif
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-400">{{ $t['noCommissions'] }}</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <div class="mt-4">{{ $commissions->links() }}</div>

</div>
@endsection
