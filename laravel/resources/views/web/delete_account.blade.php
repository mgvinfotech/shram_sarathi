@extends('web.layouts.public')

@section('title', 'Account & Data Deletion Request — Shram Sarathi Network')
@section('meta_description', 'Request permanent deletion of your Shram Sarathi user account and associated personal data in accordance with Google Play Store User Data & Privacy policies.')

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<div class="policy-hero" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 50px 20px; text-align: center; color: #fff;">
    <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 12px;">Account & Data <span>Deletion</span></h1>
    <p style="font-size: 1.05rem; opacity: 0.85; max-width: 650px; margin: 0 auto;">
        In compliance with Google Play Store User Data policies, users can request the permanent deletion of their account and associated data.
    </p>
</div>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="policy-body" style="max-width: 800px; margin: 40px auto; padding: 0 20px;">

    @if(session('success'))
        <div style="background: #ecfdf5; border: 1px solid #10b981; color: #065f46; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; font-weight: 600;">
            ✅ {{ session('success') }}
        </div>
    @endif

    @if(session('error'))
        <div style="background: #fef2f2; border: 1px solid #ef4444; color: #991b1b; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; font-weight: 600;">
            ❌ {{ session('error') }}
        </div>
    @endif

    @if($errors->any())
        <div style="background: #fef2f2; border: 1px solid #ef4444; color: #991b1b; padding: 16px 20px; border-radius: 12px; margin-bottom: 24px;">
            <ul style="margin: 0; padding-left: 20px;">
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <!-- 1. Policy Notice -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 30px;">
        <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin-bottom: 12px;">
            <i class="fa-solid fa-shield-halved" style="color: #ff6b00; margin-right: 8px;"></i>
            What happens when you delete your account?
        </h2>
        <p style="color: #475569; line-height: 1.6; margin-bottom: 12px;">
            When you submit a deletion request:
        </p>
        <ul style="color: #475569; line-height: 1.7; padding-left: 20px; margin-bottom: 16px;">
            <li><strong>Personal Data Cleared:</strong> Your name, phone number, gender, KYC document copies (Aadhaar / DL), and profile picture are removed or permanently anonymized.</li>
            <li><strong>Authentication Revoked:</strong> Your login credentials and device push tokens (FCM) are permanently deactivated.</li>
            <li><strong>Worker / Provider Profiles:</strong> If you are registered as a service provider (Labour, Driver, Karigar, Transporter), your listing is taken offline and removed from public search.</li>
            <li><strong>Legal & Financial Records:</strong> Any past transactional invoices or tax records required by applicable Indian laws are retained only for statutory auditing purposes and cannot be used for any other purpose.</li>
        </ul>
        <p style="color: #64748b; font-size: 0.9rem; margin: 0;">
            <em>Note: You can also delete your account instantly from within the mobile app by visiting <strong>Profile → Delete Account (खाता हटाएं)</strong>.</em>
        </p>
    </div>

    <!-- 2. Deletion Request Form -->
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
            Submit Account Deletion Request
        </h3>
        <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 20px;">
            Enter the 10-digit mobile number registered with your Shram Sarathi account.
        </p>

        <form method="POST" action="{{ route('web.delete-account.submit') }}">
            @csrf

            <div style="margin-bottom: 18px;">
                <label for="phone" style="display: block; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
                    Registered Mobile Number (पंजीकृत मोबाइल नंबर) *
                </label>
                <div style="display: flex; align-items: center; border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #fff;">
                    <span style="padding: 12px 14px; background: #f1f5f9; color: #475569; font-weight: 600; border-right: 1px solid #cbd5e1;">+91</span>
                    <input type="text" id="phone" name="phone" value="{{ old('phone') }}" placeholder="10-digit mobile number" maxlength="10" required
                           style="width: 100%; border: none; padding: 12px 14px; font-size: 1rem; outline: none;">
                </div>
            </div>

            <div style="margin-bottom: 22px;">
                <label for="reason" style="display: block; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
                    Reason for Deletion (खाता हटाने का कारण - Optional)
                </label>
                <textarea id="reason" name="reason" rows="3" placeholder="Tell us why you want to delete your account..."
                          style="width: 100%; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; font-size: 0.95rem; outline: none; font-family: inherit;">{{ old('reason') }}</textarea>
            </div>

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 22px;">
                <p style="color: #b45309; font-size: 0.88rem; margin: 0; line-height: 1.5;">
                    ⚠️ <strong>Warning:</strong> Account deletion is permanent. Once completed, your registered number will be unlinked and you will need to sign up afresh to use the platform.
                </p>
            </div>

            <button type="submit" onclick="return confirm('क्या आप सचमुच अपना खाता हटाना चाहते हैं? यह प्रक्रिया वापस नहीं ली जा सकती। (Are you sure you want to permanently delete your account?)');"
                    style="width: 100%; background: #dc2626; color: #fff; font-size: 1rem; font-weight: 700; padding: 14px 20px; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s;">
                <i class="fa-solid fa-trash-can" style="margin-right: 8px;"></i> Permanently Delete My Account
            </button>
        </form>
    </div>

    <!-- 3. Support Contacts -->
    <div style="text-align: center; margin-top: 36px; color: #64748b; font-size: 0.9rem;">
        Need help or have questions? Email us at <a href="mailto:support@shramsarathinetwork.com" style="color: #ff6b00; font-weight: 600;">support@shramsarathinetwork.com</a> or call <a href="tel:+917084900909" style="color: #ff6b00; font-weight: 600;">+91 70849 00909</a>.
    </div>

</div>

@endsection
