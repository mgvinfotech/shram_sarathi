@extends('admin.layouts.app')

@section('title', 'Bookings')

@section('content')
<div class="p-6">

    <div class="mb-6 flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">बुकिंग्स / Bookings</h1>
            <p class="text-gray-500 text-sm mt-1">Total: {{ $bookings->total() }} bookings</p>
        </div>
    </div>

    <!-- Status Filter -->
    <form method="GET" action="{{ route('admin.bookings') }}" class="flex gap-3 mb-6">
        <select name="status" class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="">All Statuses</option>
            @foreach(['pending','call_initiated','call_done','confirmed','rejected','refunded','completed'] as $s)
                <option value="{{ $s }}" {{ request('status') === $s ? 'selected' : '' }}>{{ ucfirst(str_replace('_', ' ', $s)) }}</option>
            @endforeach
        </select>
        <button type="submit" class="btn-primary">Filter</button>
        @if(request('status'))
            <a href="{{ route('admin.bookings') }}" class="btn-secondary">Clear</a>
        @endif
    </form>

    <!-- Table -->
    <div class="card overflow-hidden">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                    <th class="table-th">ID</th>
                    <th class="table-th">Customer</th>
                    <th class="table-th">Provider</th>
                    <th class="table-th">Category</th>
                    <th class="table-th">Status</th>
                    <th class="table-th">IVR Response</th>
                    <th class="table-th">Duration</th>
                    <th class="table-th">Date</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
                @forelse($bookings as $booking)
                @php
                    $statusColors = [
                        'pending'        => 'bg-yellow-100 text-yellow-700',
                        'confirmed'      => 'bg-green-100 text-green-700',
                        'rejected'       => 'bg-red-100 text-red-700',
                        'refunded'       => 'bg-blue-100 text-blue-700',
                        'call_initiated' => 'bg-purple-100 text-purple-700',
                        'call_done'      => 'bg-orange-100 text-orange-700',
                        'completed'      => 'bg-teal-100 text-teal-700',
                    ];
                    $ivrColors = [
                        'accepted'    => 'bg-green-100 text-green-700',
                        'rejected'    => 'bg-red-100 text-red-700',
                        'no_response' => 'bg-gray-100 text-gray-600',
                        'pending'     => 'bg-yellow-100 text-yellow-700',
                    ];
                @endphp
                <tr class="hover:bg-gray-50">
                    <td class="table-td text-gray-500">#{{ $booking->id }}</td>
                    <td class="table-td">
                        <div class="font-medium text-gray-900">{{ $booking->customer?->name ?? '—' }}</div>
                        <div class="text-xs text-gray-500">{{ $booking->customer?->phone ?? '' }}</div>
                    </td>
                    <td class="table-td">
                        <div class="font-medium text-gray-900">{{ $booking->provider?->name ?? '—' }}</div>
                        <div class="text-xs text-gray-500">{{ $booking->provider?->phone ?? '' }}</div>
                    </td>
                    <td class="table-td">
                        <span class="badge bg-orange-100 text-orange-700">{{ $booking->category }}</span>
                    </td>
                    <td class="table-td">
                        <span class="badge {{ $statusColors[$booking->status] ?? 'bg-gray-100 text-gray-700' }}">
                            {{ ucfirst(str_replace('_', ' ', $booking->status)) }}
                        </span>
                    </td>
                    <td class="table-td">
                        <span class="badge {{ $ivrColors[$booking->ivr_response] ?? 'bg-gray-100 text-gray-700' }}">
                            {{ ucfirst(str_replace('_', ' ', $booking->ivr_response ?? 'pending')) }}
                        </span>
                    </td>
                    <td class="table-td text-gray-500">
                        {{ $booking->call_duration ? $booking->call_duration . 's' : '—' }}
                    </td>
                    <td class="table-td text-gray-500 text-xs">
                        {{ $booking->created_at?->format('d M Y H:i') ?? '—' }}
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="8" class="text-center py-8 text-gray-400">No bookings found</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    <div class="mt-4">
        {{ $bookings->links() }}
    </div>

</div>
@endsection
