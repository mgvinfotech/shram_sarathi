@extends('admin.layouts.app')

@section('title', $lang === 'hi' ? 'पूछताछ एवं लीड्स' : 'Inquiries & Leads')

@section('content')
<div class="p-6 max-w-7xl mx-auto">

    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <i data-lucide="inbox" class="w-6 h-6 text-orange-500"></i>
                {{ $lang === 'hi' ? 'वेबसाइट पूछताछ एवं लीड्स' : 'Website Inquiries & Leads' }}
            </h1>
            <p class="text-xs text-gray-500 mt-1">
                {{ $lang === 'hi' ? 'होमपेज और सर्विस फॉर्म से प्राप्त सभी कस्टमर पूछताछ का विवरण' : 'All incoming service queries and leads submitted via website' }}
            </p>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ route('admin.inquiries') }}" class="btn-secondary text-xs">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                {{ $lang === 'hi' ? 'रीफ्रेश' : 'Refresh' }}
            </a>
        </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="card p-4 border-l-4 border-gray-400">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ $lang === 'hi' ? 'कुल पूछताछ' : 'Total Inquiries' }}</p>
            <p class="text-2xl font-black text-gray-900 mt-1">{{ $stats['total'] }}</p>
        </div>
        <div class="card p-4 border-l-4 border-orange-500 bg-orange-50/30">
            <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-orange-600 uppercase tracking-wider">{{ $lang === 'hi' ? 'लंबित (Pending)' : 'Pending (New)' }}</p>
                @if($stats['pending'] > 0)
                    <span class="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></span>
                @endif
            </div>
            <p class="text-2xl font-black text-orange-600 mt-1">{{ $stats['pending'] }}</p>
        </div>
        <div class="card p-4 border-l-4 border-blue-500">
            <p class="text-xs font-semibold text-blue-600 uppercase tracking-wider">{{ $lang === 'hi' ? 'संपर्क किया (Contacted)' : 'Contacted' }}</p>
            <p class="text-2xl font-black text-blue-700 mt-1">{{ $stats['contacted'] }}</p>
        </div>
        <div class="card p-4 border-l-4 border-green-500">
            <p class="text-xs font-semibold text-green-600 uppercase tracking-wider">{{ $lang === 'hi' ? 'सफल (Converted)' : 'Converted' }}</p>
            <p class="text-2xl font-black text-green-700 mt-1">{{ $stats['converted'] }}</p>
        </div>
    </div>

    <!-- Filters & Search -->
    <div class="card p-4 mb-6">
        <form method="GET" action="{{ route('admin.inquiries') }}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
                <label class="form-label text-xs">{{ $lang === 'hi' ? 'खोजें (नाम, मोबाइल, रेफ़रेंस)' : 'Search (Name, Phone, Ref)' }}</label>
                <div class="relative">
                    <input type="text" name="search" value="{{ request('search') }}"
                           placeholder="{{ $lang === 'hi' ? 'Ramesh, 98765..., SSN-...' : 'Search leads...' }}"
                           class="form-input text-xs pl-8">
                    <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5"></i>
                </div>
            </div>

            <div>
                <label class="form-label text-xs">{{ $lang === 'hi' ? 'सर्विस श्रेणी' : 'Service Category' }}</label>
                <select name="service" class="form-input text-xs">
                    <option value="">{{ $lang === 'hi' ? 'सभी सेवाएं' : 'All Services' }}</option>
                    @foreach(['Labour', 'Skilled Worker', 'Driver', 'Contractor', 'Transport'] as $srv)
                        <option value="{{ $srv }}" {{ request('service') === $srv ? 'selected' : '' }}>{{ $srv }}</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="form-label text-xs">{{ $lang === 'hi' ? 'स्थिति (Status)' : 'Status' }}</label>
                <select name="status" class="form-input text-xs">
                    <option value="">{{ $lang === 'hi' ? 'सभी स्थितियाँ' : 'All Statuses' }}</option>
                    @foreach(['Pending', 'Contacted', 'Converted', 'Cancelled'] as $st)
                        <option value="{{ $st }}" {{ request('status') === $st ? 'selected' : '' }}>{{ $st }}</option>
                    @endforeach
                </select>
            </div>

            <div class="flex items-end gap-2">
                <button type="submit" class="btn-primary text-xs py-2 px-4 flex-1 justify-center">
                    <i data-lucide="filter" class="w-3.5 h-3.5"></i>
                    {{ $lang === 'hi' ? 'फिल्टर करें' : 'Filter' }}
                </button>
                @if(request()->hasAny(['search', 'service', 'status']))
                    <a href="{{ route('admin.inquiries') }}" class="btn-secondary text-xs py-2 px-3">
                        {{ $lang === 'hi' ? 'हटाएं' : 'Clear' }}
                    </a>
                @endif
            </div>
        </form>
    </div>

    <!-- Inquiries List -->
    <div class="space-y-4">
        @forelse($inquiries as $inq)
            @php
                $statusColors = [
                    'Pending'   => 'bg-orange-100 text-orange-800 border-orange-300',
                    'Contacted' => 'bg-blue-100 text-blue-800 border-blue-300',
                    'Converted' => 'bg-green-100 text-green-800 border-green-300',
                    'Cancelled' => 'bg-gray-100 text-gray-700 border-gray-300',
                ];
                $serviceColors = [
                    'Labour'         => 'bg-amber-100 text-amber-900',
                    'Skilled Worker' => 'bg-sky-100 text-sky-900',
                    'Driver'         => 'bg-emerald-100 text-emerald-900',
                    'Contractor'     => 'bg-purple-100 text-purple-900',
                    'Transport'      => 'bg-indigo-100 text-indigo-900',
                ];
                $cleanPhone = preg_replace('/[^0-9]/', '', $inq->mobile);
                $waText = urlencode("नमस्ते {$inq->name} जी, श्रम सारथी नेटवर्क (Shram Sarathi Network) पर आपकी पूछताछ (Ref: {$inq->reference_no}) के संबंध में हम आपसे संपर्क कर रहे हैं। क्या आप अपनी आवश्यकता के बारे में बता सकते हैं?");
            @endphp

            <div class="card p-5 hover:shadow-md transition-shadow border-l-4 {{ $inq->status === 'Pending' ? 'border-l-orange-500' : ($inq->status === 'Converted' ? 'border-l-green-500' : 'border-l-blue-400') }}">
                <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    
                    <!-- Left: Details -->
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-900 text-white">
                                {{ $inq->reference_no }}
                            </span>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full {{ $serviceColors[$inq->service] ?? 'bg-gray-100 text-gray-800' }}">
                                {{ $inq->service }}
                            </span>
                            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border {{ $statusColors[$inq->status] ?? 'bg-gray-100 text-gray-700' }}">
                                ● {{ $inq->status }}
                            </span>
                            <span class="text-xs text-gray-400 ml-auto">
                                <i data-lucide="clock" class="w-3 h-3 inline"></i>
                                {{ $inq->created_at ? $inq->created_at->format('d M Y, h:i A') : '—' }}
                            </span>
                        </div>

                        <!-- Customer Info -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 my-3 py-2 border-y border-gray-100">
                            <div>
                                <p class="text-xs text-gray-400">{{ $lang === 'hi' ? 'ग्राहक का नाम' : 'Customer Name' }}</p>
                                <p class="text-sm font-bold text-gray-900">{{ $inq->name }}</p>
                                <span class="text-[11px] text-gray-500">{{ $inq->user_type ?? 'Customer' }}</span>
                            </div>
                            <div>
                                <p class="text-xs text-gray-400">{{ $lang === 'hi' ? 'मोबाइल नंबर' : 'Phone Number' }}</p>
                                <p class="text-sm font-bold text-gray-900 font-mono">{{ $inq->mobile }}</p>
                                @if($inq->email)
                                    <p class="text-xs text-gray-500 truncate">{{ $inq->email }}</p>
                                @endif
                            </div>
                            <div>
                                <p class="text-xs text-gray-400">{{ $lang === 'hi' ? 'स्थान / शहर' : 'Location' }}</p>
                                <p class="text-sm font-medium text-gray-800 flex items-center gap-1">
                                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-orange-500 flex-shrink-0"></i>
                                    {{ $inq->location ?: 'Sultanpur, UP' }}
                                </p>
                                @if($inq->preferred_date)
                                    <p class="text-[11px] text-gray-500">Date: {{ $inq->preferred_date }}</p>
                                @endif
                            </div>
                        </div>

                        <!-- Shift / Workers / Message -->
                        <div class="flex flex-wrap gap-2 text-xs mb-2">
                            @if($inq->shift)
                                <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                                    <strong>Shift:</strong> {{ $inq->shift }}
                                </span>
                            @endif
                            @if($inq->workers_count)
                                <span class="bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                                    <strong>Count:</strong> {{ $inq->workers_count }}
                                </span>
                            @endif
                        </div>

                        @if($inq->message)
                            <div class="bg-amber-50/60 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-950 mt-2">
                                <span class="font-bold text-amber-900">{{ $lang === 'hi' ? 'ग्राहक का संदेश:' : 'Customer Note:' }}</span>
                                {{ $inq->message }}
                            </div>
                        @endif
                    </div>

                    <!-- Right: Actions -->
                    <div class="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[200px] justify-between border-t sm:border-t-0 pt-3 sm:pt-0">
                        
                        <!-- Quick Call & WhatsApp -->
                        <div class="flex items-center gap-2">
                            <a href="tel:{{ $cleanPhone }}"
                               class="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                               title="Call {{ $inq->name }}">
                                <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                                {{ $lang === 'hi' ? 'कॉल करें' : 'Call' }}
                            </a>
                            <a href="https://wa.me/91{{ $cleanPhone }}?text={{ $waText }}" target="_blank"
                               class="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                               title="WhatsApp {{ $inq->name }}">
                                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                                WhatsApp
                            </a>
                        </div>

                        <!-- Change Status Form -->
                        <form method="POST" action="{{ route('admin.inquiries.status', $inq->id) }}" class="flex items-center gap-1.5">
                            @csrf
                            <select name="status" class="form-input text-xs py-1.5 px-2 font-medium flex-1">
                                <option value="Pending"   {{ $inq->status === 'Pending' ? 'selected' : '' }}>⏳ Pending</option>
                                <option value="Contacted" {{ $inq->status === 'Contacted' ? 'selected' : '' }}>📞 Contacted</option>
                                <option value="Converted" {{ $inq->status === 'Converted' ? 'selected' : '' }}>✅ Converted</option>
                                <option value="Cancelled" {{ $inq->status === 'Cancelled' ? 'selected' : '' }}>❌ Cancelled</option>
                            </select>
                            <button type="submit" class="btn-primary text-xs py-1.5 px-2.5" title="Save Status">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            </button>
                        </form>

                        <!-- Delete button -->
                        <form method="POST" action="{{ route('admin.inquiries.delete', $inq->id) }}"
                              onsubmit="return confirm('क्या आप वाकई इस पूछताछ (#{{ $inq->reference_no }}) को डिलीट करना चाहते हैं?');"
                              class="text-right">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-gray-400 hover:text-red-500 text-xs inline-flex items-center gap-1 transition-colors">
                                <i data-lucide="trash-2" class="w-3 h-3"></i>
                                {{ $lang === 'hi' ? 'डिलीट करें' : 'Delete' }}
                            </button>
                        </form>

                    </div>

                </div>
            </div>
        @empty
            <div class="card p-12 text-center text-gray-400">
                <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-30"></i>
                <p class="text-base font-semibold text-gray-600">{{ $lang === 'hi' ? 'कोई पूछताछ नहीं मिली' : 'No inquiries found' }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ $lang === 'hi' ? 'वेबसाइट से नई पूछताछ आने पर यहाँ दिखाई देंगी।' : 'New inquiries from the website will appear here.' }}</p>
            </div>
        @endforelse

        <!-- Pagination -->
        @if($inquiries->hasPages())
            <div class="mt-6">
                {{ $inquiries->links() }}
            </div>
        @endif
    </div>

</div>
@endsection
