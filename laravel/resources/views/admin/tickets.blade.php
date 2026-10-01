@extends('admin.layouts.app')

@section('title', $t['tickets'])

@section('content')
<div class="p-6">

    <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">{{ $t['ticketManagement'] }}</h1>
        <div class="flex gap-2">
            @php
                $statusLabels = [
                    ''           => $lang === 'hi' ? 'सभी' : 'All',
                    'open'       => $lang === 'hi' ? 'खुली' : 'Open',
                    'in_progress'=> $lang === 'hi' ? 'प्रगति में' : 'In Progress',
                    'resolved'   => $lang === 'hi' ? 'हल हुई' : 'Resolved',
                ];
            @endphp
            @foreach(['', 'open', 'in_progress', 'resolved'] as $s)
                <a href="{{ route('admin.tickets') }}{{ $s ? '?status='.$s : '' }}"
                   class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                   {{ request('status', '') === $s ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300' }}">
                    {{ $statusLabels[$s] }}
                </a>
            @endforeach
        </div>
    </div>

    <div class="space-y-4">
        @forelse($tickets as $ticket)
        @php
            $priorityColors = [
                'urgent' => 'bg-red-600 text-white font-bold',
                'high'   => 'bg-red-100 text-red-700 font-semibold',
                'medium' => 'bg-yellow-100 text-yellow-700',
                'normal' => 'bg-yellow-100 text-yellow-700',
                'low'    => 'bg-green-100 text-green-700',
            ];
            $statusColors = [
                'open'        => 'bg-red-100 text-red-700',
                'in_progress' => 'bg-blue-100 text-blue-700',
                'resolved'    => 'bg-green-100 text-green-700',
                'closed'      => 'bg-gray-100 text-gray-700',
            ];
            $priorityLabels = [
                'urgent' => $lang === 'hi' ? '🚨 अति आवश्यक (SOS)' : '🚨 Urgent (SOS)',
                'high'   => $lang === 'hi' ? 'उच्च' : 'High',
                'medium' => $lang === 'hi' ? 'मध्यम' : 'Medium',
                'normal' => $lang === 'hi' ? 'सामान्य' : 'Normal',
                'low'    => $lang === 'hi' ? 'कम' : 'Low',
            ];
        @endphp
        <div class="card p-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-semibold text-gray-900">#{{ $ticket->id }}</span>
                        <span class="badge {{ $priorityColors[$ticket->priority] ?? 'bg-gray-100 text-gray-700' }}">
                            {{ $priorityLabels[$ticket->priority] ?? $ticket->priority }}
                        </span>
                        <span class="badge {{ $statusColors[$ticket->status] ?? 'bg-gray-100 text-gray-700' }}">
                            {{ $statusLabels[$ticket->status] ?? $ticket->status }}
                        </span>
                    </div>
                    <p class="text-sm font-medium text-gray-800">{{ $ticket->subject }}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        {{ $t['user'] }} #{{ $ticket->user_id }} •
                        {{ $ticket->created_at?->format('d M Y H:i') ?? '—' }}
                    </p>
                    @if($ticket->description)
                        <p class="text-xs text-gray-600 mt-2 bg-gray-50 rounded p-2">{{ Str::limit($ticket->description, 200) }}</p>
                    @endif
                    @if($ticket->resolution_notes)
                        <p class="text-xs text-green-700 mt-2 bg-green-50 rounded p-2">
                            ✅ {{ $lang === 'hi' ? 'समाधान' : 'Resolution' }}: {{ $ticket->resolution_notes }}
                        </p>
                    @endif
                </div>
            </div>

            @if($ticket->status === 'open' || $ticket->status === 'in_progress')
            <div class="mt-3">
                <form method="POST" action="{{ route('admin.tickets.resolve', $ticket->id) }}" class="flex gap-2">
                    @csrf
                    <input type="text" name="resolution" required
                        placeholder="{{ $t['writeResolution'] }}"
                        class="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <button type="submit"
                        class="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600 transition-colors">
                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                        {{ $t['resolve'] }}
                    </button>
                </form>
            </div>
            @endif
        </div>
        @empty
        <div class="card p-8 text-center text-gray-400">
            <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
            <p>{{ $t['noTickets'] }}</p>
        </div>
        @endforelse
    </div>

    <div class="mt-4">{{ $tickets->links() }}</div>

</div>
@endsection
