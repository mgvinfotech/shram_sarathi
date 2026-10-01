<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Admin') — श्रम सारथी</title>

    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        orange: {
                            50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa',
                            300: '#fdba74', 400: '#fb923c', 500: '#f97316',
                            600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12',
                        }
                    }
                }
            }
        }
    </script>

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

    <style>
        [x-cloak] { display: none !important; }
        .sidebar-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            margin: 2px 8px;
            border-radius: 8px;
            transition: background-color 0.15s, color 0.15s;
            color: #9ca3af;
            text-decoration: none;
            white-space: nowrap;
        }
        .sidebar-link:hover { background-color: #1f2937; color: #fff; }
        .sidebar-link.active { background-color: #f97316; color: #fff; }
        .sidebar-link i { flex-shrink: 0; width: 20px; height: 20px; }
        .sidebar-link span { font-size: 14px; font-weight: 500; }
        .badge { padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; display: inline-block; }
        .btn-primary { background-color: #f97316; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; border: none; cursor: pointer; transition: background-color 0.15s; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .btn-primary:hover { background-color: #ea580c; }
        .btn-secondary { border: 1px solid #e5e7eb; color: #374151; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; background: white; transition: background-color 0.15s; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .btn-secondary:hover { background-color: #f9fafb; }
        .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
        .table-th { text-align: left; padding: 12px 16px; color: #4b5563; font-weight: 500; font-size: 14px; }
        .table-td { padding: 12px 16px; font-size: 14px; }
        .form-input { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; font-family: inherit; }
        .form-input:focus { box-shadow: 0 0 0 2px #f97316; border-color: transparent; }
        .form-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
    </style>
</head>
<body class="font-sans" style="background-color: #f1f5f9;">

<div class="flex h-screen overflow-hidden">

    <!-- Sidebar -->
    <aside id="sidebar" class="text-white flex flex-col transition-all duration-300 w-64 flex-shrink-0" style="background-color: #111827;">

        <!-- Logo -->
        <div class="flex items-center gap-3 p-4 border-b border-gray-700">
            <span class="text-2xl flex-shrink-0">🇮🇳</span>
            <div class="sidebar-text">
                <p class="font-bold text-orange-400 text-sm">श्रम सारथी</p>
                <p class="text-xs text-gray-400">Admin Panel</p>
            </div>
            <button onclick="toggleSidebar()" class="ml-auto text-gray-400 hover:text-white flex-shrink-0" aria-label="Toggle sidebar">
                <i data-lucide="x" class="w-4 h-4" id="sidebar-close-icon"></i>
                <i data-lucide="menu" class="w-4 h-4 hidden" id="sidebar-open-icon"></i>
            </button>
        </div>

        <!-- Nav -->
        <nav class="flex-1 py-4 overflow-y-auto">
            @php
                $navItems = [
                    ['route' => 'admin.dashboard',   'icon' => 'layout-dashboard', 'en' => 'Dashboard',   'hi' => 'डैशबोर्ड'],
                    ['route' => 'admin.users',        'icon' => 'users',            'en' => 'Users',       'hi' => 'उपयोगकर्ता'],
                    ['route' => 'admin.bookings',     'icon' => 'book-open',        'en' => 'Bookings',    'hi' => 'बुकिंग्स'],
                    ['route' => 'admin.payments',     'icon' => 'credit-card',      'en' => 'Payments',    'hi' => 'भुगतान'],
                    ['route' => 'admin.commissions',  'icon' => 'wallet',           'en' => 'Commissions', 'hi' => 'कमीशन'],
                    ['route' => 'admin.rewards',      'icon' => 'gift',             'en' => 'Rewards',     'hi' => 'पुरस्कार'],
                    ['route' => 'admin.tickets',      'icon' => 'message-square',   'en' => 'Tickets',     'hi' => 'शिकायतें'],
                    ['route' => 'admin.inquiries',    'icon' => 'inbox',            'en' => 'Inquiries',   'hi' => 'पूछताछ'],
                    ['route' => 'admin.broadcast',    'icon' => 'radio',            'en' => 'Broadcast',   'hi' => 'ब्रॉडकास्ट'],
                ];
            @endphp

            @foreach($navItems as $item)
                <a href="{{ route($item['route']) }}"
                   class="sidebar-link {{ request()->routeIs($item['route']) ? 'active' : '' }}">
                    <i data-lucide="{{ $item['icon'] }}" class="w-5 h-5 flex-shrink-0"></i>
                    <span class="sidebar-text text-sm font-medium">{{ $item[$lang] }}</span>
                </a>
            @endforeach
        </nav>

        <!-- Bottom: Language Toggle + User + Logout -->
        <div class="border-t border-gray-700">

            <!-- Language Toggle — exactly like React -->
            <form method="POST" action="/admin/lang" class="w-full">
                @csrf
                <input type="hidden" name="lang" value="{{ $lang === 'hi' ? 'en' : 'hi' }}">
                <button type="submit" class="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="{{ $lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें' }}">
                    <span style="font-size:18px;">🌐</span>
                    <div class="sidebar-text flex items-center gap-2">
                        <span style="font-size:12px; font-weight:700; padding:2px 6px; border-radius:4px; {{ $lang === 'hi' ? 'background:#f97316;color:#fff;' : 'color:#6b7280;' }}">हिं</span>
                        <span style="color:#4b5563; font-size:12px;">|</span>
                        <span style="font-size:12px; font-weight:700; padding:2px 6px; border-radius:4px; {{ $lang === 'en' ? 'background:#f97316;color:#fff;' : 'color:#6b7280;' }}">EN</span>
                    </div>
                </button>
            </form>

            <!-- Logged in user -->
            <div class="px-4 py-3 sidebar-text">
                <p class="text-xs text-gray-500">{{ $lang === 'hi' ? 'लॉग इन है' : 'Logged in as' }}</p>
                <p class="text-sm text-gray-300 font-medium truncate">{{ session('admin_user.name', 'Admin') }}</p>
            </div>

            <!-- Logout -->
            <form method="POST" action="{{ route('admin.logout') }}">
                @csrf
                <button type="submit"
                    class="flex items-center gap-3 w-full px-4 py-4 text-gray-400 hover:text-red-400 transition-colors">
                    <i data-lucide="log-out" class="w-5 h-5 flex-shrink-0"></i>
                    <span class="sidebar-text text-sm">{{ $lang === 'hi' ? 'लॉगआउट' : 'Logout' }}</span>
                </button>
            </form>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto">

        <!-- Flash Messages -->
        @if(session('success'))
            <div id="flash-success" class="fixed top-4 right-4 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                {{ session('success') }}
            </div>
            <script>setTimeout(() => document.getElementById('flash-success')?.remove(), 4000)</script>
        @endif

        @if(isset($errors) && $errors->any())
            <div id="flash-error" class="fixed top-4 right-4 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 max-w-sm">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
                <div>
                    @foreach($errors->all() as $error)
                        <p>{{ $error }}</p>
                    @endforeach
                </div>
            </div>
            <script>setTimeout(() => document.getElementById('flash-error')?.remove(), 5000)</script>
        @endif

        @yield('content')
    </main>
</div>

<script>
    // Initialize Lucide icons
    lucide.createIcons();

    // Sidebar toggle
    let sidebarOpen = true;
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const texts   = document.querySelectorAll('.sidebar-text');
        const closeIcon = document.getElementById('sidebar-close-icon');
        const openIcon  = document.getElementById('sidebar-open-icon');

        sidebarOpen = !sidebarOpen;
        if (sidebarOpen) {
            sidebar.classList.remove('w-16');
            sidebar.classList.add('w-64');
            texts.forEach(el => el.classList.remove('hidden'));
            closeIcon.classList.remove('hidden');
            openIcon.classList.add('hidden');
        } else {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-16');
            texts.forEach(el => el.classList.add('hidden'));
            closeIcon.classList.add('hidden');
            openIcon.classList.remove('hidden');
        }
    }
</script>

@stack('scripts')
</body>
</html>
