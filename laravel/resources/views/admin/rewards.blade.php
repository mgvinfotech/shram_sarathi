@extends('admin.layouts.app')

@section('title', 'Rewards')

@section('content')
<div class="p-6 max-w-2xl">

    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Reward Management</h1>
        <p class="text-gray-500 text-sm mt-1">Send reward notification via TTS IVR call and SMS</p>
    </div>

    <div class="card p-6">
        <form method="POST" action="{{ route('admin.rewards.send') }}">
            @csrf

            <!-- Provider ID -->
            <div class="mb-4">
                <label class="form-label">Provider ID</label>
                <input type="number" name="provider_id" required
                    placeholder="Enter Provider User ID"
                    value="{{ old('provider_id') }}"
                    class="form-input">
            </div>

            <!-- Gift Name -->
            <div class="mb-4">
                <label class="form-label">Gift Name</label>
                <div class="flex flex-wrap gap-2 mb-2" id="giftPresets">
                    @foreach(['T-Shirt', 'Toolkit', 'Machinery', 'Cash Reward', 'Mobile Phone'] as $gift)
                        <button type="button"
                            onclick="selectGift('{{ $gift }}')"
                            class="gift-preset px-3 py-1 rounded-full text-xs border border-gray-200 text-gray-600 hover:border-orange-300 transition-colors">
                            {{ $gift }}
                        </button>
                    @endforeach
                </div>
                <input type="text" name="gift_name" id="giftInput" required
                    placeholder="Or enter custom gift name"
                    value="{{ old('gift_name') }}"
                    class="form-input">
            </div>

            <!-- Message -->
            <div class="mb-6">
                <label class="form-label">IVR Message (will be converted to voice)</label>
                <div class="flex flex-col gap-2 mb-2">
                    @foreach([
                        'बधाई हो! आपको श्रम सारथी की तरफ से टूलकिट उपहार में दी जा रही है।',
                        'Congratulations! You have been awarded a toolkit from Shram Sarathi.',
                        'आपकी मेहनत और लगन के लिए धन्यवाद। यह पुरस्कार आपके लिए है।',
                    ] as $preset)
                        <button type="button"
                            onclick="selectMessage(this)"
                            data-msg="{{ $preset }}"
                            class="msg-preset text-left px-3 py-2 rounded-lg text-xs border border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                            {{ $preset }}
                        </button>
                    @endforeach
                </div>
                <textarea name="message" id="messageInput" rows="3" required
                    placeholder="Or write custom message..."
                    class="form-input resize-none">{{ old('message') }}</textarea>
                <p class="text-xs text-gray-400 mt-1">This message will be converted to Hindi voice by AWS Polly</p>
            </div>

            <!-- Actions -->
            <div class="flex gap-3">
                <button type="submit" class="btn-primary flex items-center gap-2">
                    <i data-lucide="send" class="w-4 h-4"></i>
                    Send IVR Call + SMS
                </button>
            </div>
        </form>
    </div>

    <!-- Info Box -->
    <div class="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 class="text-sm font-semibold text-blue-800 mb-2">🔊 How TTS IVR works?</h3>
        <ol class="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Admin types the message</li>
            <li>AWS Polly converts it to Hindi voice</li>
            <li>Exotel makes automated call to provider</li>
            <li>SMS is also sent</li>
        </ol>
    </div>

    <!-- Recent Rewards -->
    @php
        $recentRewards = \App\Models\Reward::with('provider')->orderByDesc('created_at')->limit(10)->get();
    @endphp
    @if($recentRewards->isNotEmpty())
    <div class="mt-6 card overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100">
            <h3 class="font-semibold text-gray-900 text-sm">Recent Rewards</h3>
        </div>
        <table class="w-full text-sm">
            <thead class="bg-gray-50">
                <tr>
                    <th class="table-th">ID</th>
                    <th class="table-th">Provider</th>
                    <th class="table-th">Gift</th>
                    <th class="table-th">Status</th>
                    <th class="table-th">Date</th>
                    <th class="table-th">Label</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
                @foreach($recentRewards as $reward)
                <tr class="hover:bg-gray-50">
                    <td class="table-td text-gray-500">#{{ $reward->id }}</td>
                    <td class="table-td font-medium">{{ $reward->provider?->name ?? '—' }}</td>
                    <td class="table-td">{{ $reward->gift_name }}</td>
                    <td class="table-td">
                        <span class="badge {{ $reward->status === 'delivered' ? 'bg-green-100 text-green-700' : ($reward->status === 'dispatched' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700') }}">
                            {{ ucfirst($reward->status) }}
                        </span>
                    </td>
                    <td class="table-td text-gray-500 text-xs">{{ $reward->created_at?->format('d M Y') }}</td>
                    <td class="table-td">
                        <a href="{{ route('admin.rewards.print-label', $reward->id) }}" target="_blank"
                            class="flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 px-2 py-1 rounded">
                            <i data-lucide="printer" class="w-3 h-3"></i> Print
                        </a>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

</div>

<script>
function selectGift(name) {
    document.getElementById('giftInput').value = name;
    document.querySelectorAll('.gift-preset').forEach(btn => {
        btn.classList.toggle('bg-orange-500', btn.textContent.trim() === name);
        btn.classList.toggle('text-white', btn.textContent.trim() === name);
        btn.classList.toggle('border-orange-500', btn.textContent.trim() === name);
    });
}

function selectMessage(btn) {
    document.getElementById('messageInput').value = btn.dataset.msg;
    document.querySelectorAll('.msg-preset').forEach(b => {
        b.classList.remove('border-orange-400', 'bg-orange-50');
    });
    btn.classList.add('border-orange-400', 'bg-orange-50');
}
</script>
@endsection
