@extends('admin.layouts.app')

@section('title', $t['broadcast'])

@section('content')
<div class="p-6 max-w-2xl">

    <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">{{ $t['bulkBroadcast'] }}</h1>
        <p class="text-gray-500 text-sm mt-1">{{ $t['broadcastSubtitle'] }}</p>
    </div>

    <div class="card p-6">
        <form method="POST" action="{{ route('admin.broadcast.send') }}">
            @csrf

            <!-- Type Selector -->
            <div class="mb-4">
                <label class="form-label">{{ $t['broadcastType'] }}</label>
                <div class="flex gap-3">
                    <label class="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors
                        {{ old('broadcast_type', 'sms') === 'sms' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300' }}">
                        <input type="radio" name="broadcast_type" value="sms"
                            {{ old('broadcast_type', 'sms') === 'sms' ? 'checked' : '' }}
                            class="hidden" onchange="updateTypeUI()">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                        SMS
                    </label>
                    <label class="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors
                        {{ old('broadcast_type') === 'voice' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300' }}">
                        <input type="radio" name="broadcast_type" value="voice"
                            {{ old('broadcast_type') === 'voice' ? 'checked' : '' }}
                            class="hidden" onchange="updateTypeUI()">
                        <i data-lucide="phone" class="w-4 h-4"></i>
                        Voice Call (TTS)
                    </label>
                </div>
            </div>

            <!-- Category Filter -->
            <div class="mb-4">
                <label class="form-label">{{ $t['categoryFilter'] }}</label>
                <select name="category_filter" class="form-input">
                    <option value="">{{ $t['allProviders'] }}</option>
                    <option value="majdoor"       {{ old('category_filter') === 'majdoor'       ? 'selected' : '' }}>मजदूर / Majdoor</option>
                    <option value="karigar"       {{ old('category_filter') === 'karigar'       ? 'selected' : '' }}>कारीगर / Karigar</option>
                    <option value="thekedar"      {{ old('category_filter') === 'thekedar'      ? 'selected' : '' }}>ठेकेदार / Thekedar</option>
                    <option value="taxi"          {{ old('category_filter') === 'taxi'          ? 'selected' : '' }}>टैक्सी / Taxi</option>
                    <option value="transport"     {{ old('category_filter') === 'transport'     ? 'selected' : '' }}>ट्रांसपोर्ट / Transport</option>
                    <option value="krishi_yantra" {{ old('category_filter') === 'krishi_yantra' ? 'selected' : '' }}>कृषि यंत्र / Krishi Yantra</option>
                    <option value="nirman_machine"{{ old('category_filter') === 'nirman_machine'? 'selected' : '' }}>निर्माण मशीनें / Nirman Machine</option>
                </select>
            </div>

            <!-- Message -->
            <div class="mb-6">
                <label class="form-label">{{ $t['message'] }}</label>
                <textarea name="message" rows="4" required
                    placeholder="{{ $lang === 'hi' ? 'यहाँ संदेश लिखें...' : 'Write message here...' }}"
                    id="broadcastMsg"
                    oninput="document.getElementById('charCount').textContent = this.value.length"
                    class="form-input resize-none">{{ old('message') }}</textarea>
                <p class="text-xs text-gray-400 mt-1">
                    <span id="charCount">{{ strlen(old('message', '')) }}</span> {{ $t['characters'] }}
                </p>
            </div>

            <button type="submit"
                onclick="return confirm('{{ $lang === 'hi' ? 'क्या आप सभी सारथियों को यह संदेश भेजना चाहते हैं?' : 'Send broadcast to all matching providers?' }}')"
                class="btn-primary flex items-center gap-2">
                <i data-lucide="radio" class="w-4 h-4"></i>
                {{ $t['sendBroadcast'] }}
            </button>
        </form>
    </div>

    <!-- Info -->
    <div class="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
        <p class="text-sm font-semibold text-yellow-800 mb-1">⚠️ {{ $lang === 'hi' ? 'ध्यान दें' : 'Important' }}</p>
        <ul class="text-xs text-yellow-700 space-y-1 list-disc list-inside">
            @if($lang === 'hi')
                <li>यह सभी सक्रिय सारथियों को भेजा जाएगा (या चुनी गई श्रेणी को)</li>
                <li>Voice कॉल AWS Polly TTS (हिंदी आवाज़) का उपयोग करती है</li>
                <li>SMS Exotel SMS gateway से भेजा जाएगा</li>
                <li>यह कार्य वापस नहीं लिया जा सकता</li>
            @else
                <li>This will send to ALL active providers (or filtered category)</li>
                <li>Voice calls use AWS Polly TTS (Hindi voice)</li>
                <li>SMS uses Exotel SMS gateway</li>
                <li>This action cannot be undone</li>
            @endif
        </ul>
    </div>

</div>

<script>
function updateTypeUI() {
    const radios = document.querySelectorAll('input[name="broadcast_type"]');
    radios.forEach(radio => {
        const label = radio.closest('label');
        if (radio.checked) {
            label.classList.add('bg-orange-500', 'text-white', 'border-orange-500');
            label.classList.remove('border-gray-200', 'text-gray-600');
        } else {
            label.classList.remove('bg-orange-500', 'text-white', 'border-orange-500');
            label.classList.add('border-gray-200', 'text-gray-600');
        }
    });
}
document.querySelectorAll('input[name="broadcast_type"]').forEach(r => {
    r.addEventListener('change', updateTypeUI);
});
</script>
@endsection
