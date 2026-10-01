<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify OTP — श्रम सारथी Admin</title>

    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: {
                        orange: { 500: '#f97316', 600: '#ea580c' }
                    }
                }
            }
        }
    </script>
    <style>body { background-color: #0f172a; }</style>
</head>
<body class="font-sans min-h-screen flex items-center justify-center p-4">

<div class="w-full max-w-sm">

    <!-- Card — same cream bg as React OTP step -->
    <div class="rounded-2xl p-8 shadow-2xl" style="background-color: #f9f8f7;">

        <!-- Logo -->
        <div class="text-center mb-8">
            <span class="text-5xl">🇮🇳</span>
            <h1 class="text-2xl font-bold text-gray-900 mt-3">Shram Sarathi</h1>
            <p class="text-gray-500 text-sm mt-1">OTP Verification</p>
        </div>

        <p class="text-sm text-gray-600 text-center mb-6">
            OTP sent to <strong>{{ $phone }}</strong>
        </p>

        <!-- Errors -->
        @if($errors->any())
            <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                @foreach($errors->all() as $error)
                    <p>{{ $error }}</p>
                @endforeach
            </div>
        @endif

        <form method="POST" action="{{ route('admin.login.step2') }}">
            @csrf
            <input type="hidden" name="phone" value="{{ $phone }}">

            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                <input
                    type="text"
                    name="otp"
                    placeholder="6-digit OTP"
                    maxlength="6"
                    pattern="\d{6}"
                    required
                    autofocus
                    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                >
            </div>

            <button type="submit"
                class="w-full bg-orange-500 text-white py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors text-sm">
                Verify &amp; Login
            </button>
        </form>

        <a href="{{ route('admin.login') }}"
           class="block text-center text-gray-500 text-sm mt-4 py-2 hover:text-gray-700 transition-colors">
            ← Back to Login
        </a>
    </div>
</div>

</body>
</html>
