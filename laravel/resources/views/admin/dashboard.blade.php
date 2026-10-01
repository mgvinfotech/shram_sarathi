@extends('admin.layouts.app')

@section('title', $t['dashboard'])

@section('content')
<div class="p-6">

    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">{{ $t['liveStats'] }}</h1>
        <p class="text-gray-500 text-sm mt-1">{{ $t['realTimeData'] }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        <div class="card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-500 mb-1">{{ $t['totalUsers'] }}</p>
                    <p class="text-3xl font-bold text-gray-900">{{ number_format($totalUsers) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ $totalProviders }} {{ $t['providers'] }} • {{ $totalCustomers }} {{ $t['customers'] }}</p>
                </div>
                <div class="p-3 rounded-xl bg-orange-500">
                    <i data-lucide="users" class="w-6 h-6 text-white"></i>
                </div>
            </div>
        </div>

        <div class="card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-500 mb-1">{{ $t['totalBookings'] }}</p>
                    <p class="text-3xl font-bold text-gray-900">{{ number_format($totalBookings) }}</p>
                    @php $confirmRate = $totalBookings > 0 ? round($confirmedBookings / $totalBookings * 100) : 0; @endphp
                    <p class="text-xs text-gray-400 mt-1">{{ $confirmRate }}% {{ $t['confirmed'] }}</p>
                </div>
                <div class="p-3 rounded-xl bg-blue-500">
                    <i data-lucide="book-open" class="w-6 h-6 text-white"></i>
                </div>
            </div>
        </div>

        <div class="card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-500 mb-1">{{ $t['totalRevenue'] }}</p>
                    <p class="text-3xl font-bold text-gray-900">₹{{ number_format($totalRevenue) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ $t['successfulPayments'] }}</p>
                </div>
                <div class="p-3 rounded-xl bg-green-500">
                    <i data-lucide="credit-card" class="w-6 h-6 text-white"></i>
                </div>
            </div>
        </div>

        <div class="card p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm text-gray-500 mb-1">{{ $t['confirmedBookings'] }}</p>
                    <p class="text-3xl font-bold text-gray-900">{{ number_format($confirmedBookings) }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ $t['providerAccepted'] }}</p>
                </div>
                <div class="p-3 rounded-xl bg-purple-500">
                    <i data-lucide="trending-up" class="w-6 h-6 text-white"></i>
                </div>
            </div>
        </div>

    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ $t['categoryBreakdown'] }}</h2>
            @if($categoryBreakdown->isEmpty())
                <p class="text-gray-400 text-sm text-center py-8">{{ $t['noBookingData'] }}</p>
            @else
                <canvas id="categoryChart" height="280"></canvas>
            @endif
        </div>

        <div class="card p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ $t['userDistribution'] }}</h2>
            <canvas id="userChart" height="280"></canvas>
        </div>

    </div>

</div>
@endsection

@push('scripts')
<script>
    @if($categoryBreakdown->isNotEmpty())
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(catCtx, {
        type: 'bar',
        data: {
            labels: {!! json_encode($categoryBreakdown->pluck('category')) !!},
            datasets: [{
                label: '{{ $t['confirmedBookings'] }}',
                data: {!! json_encode($categoryBreakdown->pluck('count')) !!},
                backgroundColor: '#f97316',
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
    @endif

    const userCtx = document.getElementById('userChart').getContext('2d');
    new Chart(userCtx, {
        type: 'doughnut',
        data: {
            labels: ['{{ $t['providers'] }}', '{{ $t['customers'] }}'],
            datasets: [{
                data: [{{ $totalProviders }}, {{ $totalCustomers }}],
                backgroundColor: ['#f97316', '#3b82f6'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    setTimeout(() => location.reload(), 30000);
</script>
@endpush
