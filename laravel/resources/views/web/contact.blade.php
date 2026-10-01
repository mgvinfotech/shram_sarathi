@extends('web.layouts.public')

@section('title', 'Contact Us & Grievance Redressal — Shram Sarathi Network')
@section('meta_description', 'Contact M/S Shram Sarathi Network official support desk, registered office address, helpline +91 7084900909, WhatsApp desk, and grievance redressal officer.')

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<div class="policy-hero" style="background: linear-gradient(135deg, rgba(7, 17, 30, 0.88) 0%, rgba(15, 23, 42, 0.84) 100%), url('{{ asset('images/web_banners/page10_contact_support.jpg') }}') center/cover no-repeat; padding: 80px 24px 70px;">
    <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(249,115,22,0.22); border:1px solid rgba(249,115,22,0.4); color:#fdba74; padding:6px 18px; border-radius:50px; font-size:0.875rem; font-weight:700; margin-bottom:16px;">
        <i class="fa-solid fa-headset"></i>
        <span>Official Support &amp; Grievance Helpdesk</span>
    </div>
    <h1>Contact <span>Us</span> &amp; Support</h1>
    <p>Get in touch with Shram Sarathi Network. We are here to assist customers, workers, contractors, and partners across India.</p>
</div>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="policy-body">

    <div class="policy-meta-badge">
        <i class="fa-solid fa-headset"></i>
        <span>Official Support Channels &nbsp;|&nbsp; Operating Hours: Mon – Sat, 9:00 AM – 7:00 PM IST</span>
    </div>

    <!-- 1. Registered Entity & Corporate Office -->
    <div class="policy-section">
        <h2><span class="num-badge">1</span> Registered Business Details</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 15px;">
            <div style="background: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <h4 style="color: var(--navy); margin-bottom: 8px; font-weight: 800;">
                    <i class="fa-solid fa-building" style="color: var(--orange); margin-right: 6px;"></i> Legal Entity Name
                </h4>
                <p style="margin: 0; font-size: 0.95rem; color: #334155; font-weight: 700;">
                    M/S Shram Sarathi Network
                </p>
                <small style="color: #0284c7; font-weight: 600;">(A Registered Enterprise under MSME / Govt. Guidelines)</small><br>
                <small style="color: #64748b;">Digital Intermediary & Workforce Facilitation Platform</small>
            </div>

            <div style="background: #f8fafc; padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <h4 style="color: var(--navy); margin-bottom: 8px; font-weight: 800;">
                    <i class="fa-solid fa-location-dot" style="color: var(--orange); margin-right: 6px;"></i> Physical Registered Office
                </h4>
                <p style="margin: 0; font-size: 0.92rem; color: #334155; line-height: 1.5;">
                    Civil Lines, Near Collectorate Campus,<br>
                    Sultanpur, Uttar Pradesh — 228001, India.
                </p>
            </div>
        </div>
    </div>

    <!-- 2. Customer Support Channels -->
    <div class="policy-section">
        <h2><span class="num-badge">2</span> Customer Care & Communication Channels</h2>

        <!-- Contact & Support Visual Banner -->
        <div style="margin: 18px 0 22px; border-radius: 14px; overflow: hidden; border: 1px solid var(--card-border); box-shadow: var(--shadow-sm); background: #fff;">
            <img src="{{ asset('images/web_banners/page10_contact_support.jpg') }}" alt="Shram Sarathi Support Desk &amp; Customer Care" style="width:100%; height:auto; display:block;" loading="lazy">
            <div style="padding: 12px 18px; background: #f0fdf4; border-top: 1px solid #bbf7d0; font-size: 0.85rem; color: #15803d; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <span><i class="fa-solid fa-headset" style="color: var(--green); margin-right: 6px;"></i> <strong>समर्पित सहायता डेस्क:</strong> Dedicated Telephony, Email &amp; WhatsApp Support</span>
                <span style="font-weight: 700; color: var(--navy);"><i class="fa-solid fa-clock" style="color: var(--orange); margin-right: 4px;"></i> Mon &ndash; Sat: 9:00 AM &ndash; 7:00 PM IST</span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 15px;">
            <div style="padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h4 style="color: var(--navy); margin-bottom: 8px; font-size: 0.95rem; font-weight: 700;">
                        <i class="fa-solid fa-phone" style="color: var(--orange); margin-right: 4px;"></i> IVR Helpline
                    </h4>
                    <p style="margin: 0 0 6px; font-size: 1.15rem; font-weight: 800; color: var(--navy);">
                        <a href="tel:+917084900909" style="color: var(--orange); text-decoration: none;">+91 7084900909</a>
                    </p>
                </div>
                <small style="color: #64748b; font-size: 0.82rem;">Dedicated Telephony Support</small>
            </div>

            <div style="padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
                <div>
                    <h4 style="color: var(--navy); margin-bottom: 8px; font-size: 0.95rem; font-weight: 700;">
                        <i class="fa-solid fa-envelope" style="color: #0284c7; margin-right: 4px;"></i> Official Support Email
                    </h4>
                    <p style="margin: 0 0 6px; font-size: 0.95rem; font-weight: 700; line-height: 1.35; word-break: break-all; overflow-wrap: anywhere;">
                        <a href="mailto:support@shramsarathinetwork.com" style="color: #0284c7; word-break: break-all; overflow-wrap: anywhere; text-decoration: underline;">support@shramsarathinetwork.com</a>
                    </p>
                </div>
                <small style="color: #64748b; font-size: 0.82rem;">Response within 24 business hours</small>
            </div>

            <div style="padding: 18px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; min-width: 0; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h4 style="color: var(--navy); margin-bottom: 8px; font-size: 0.95rem; font-weight: 700;">
                        <i class="fa-brands fa-whatsapp" style="color: #22c55e; margin-right: 4px;"></i> WhatsApp Desk
                    </h4>
                    <p style="margin: 0 0 6px; font-size: 1.05rem; font-weight: 700;">
                        <a href="https://wa.me/917084900909?text=Hello%20Shram%20Sarathi%20Support" target="_blank" rel="noopener" style="color: #22c55e; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                            +91 7084900909 <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem;"></i>
                        </a>
                    </p>
                </div>
                <small style="color: #64748b; font-size: 0.82rem;">Quick help & booking updates</small>
            </div>
        </div>
    </div>

    <!-- 3. Grievance Redressal Mechanism -->
    <div class="policy-section">
        <h2><span class="num-badge">3</span> Grievance Redressal Officer (IT Rules & Consumer Protection)</h2>
        <p>
            In accordance with Information Technology Act 2000 and the Consumer Protection (E-Commerce) Rules 2020, the details of the designated Grievance Redressal Officer are as follows:
        </p>
        <div style="background: #fff7ed; border-left: 4px solid var(--orange); padding: 18px 22px; border-radius: 6px; margin-top: 12px;">
            <p style="margin: 0 0 6px 0; font-weight: 800; color: var(--navy); font-size: 1rem;">
                Grievance Officer: <strong>Compliance Officer</strong>
            </p>
            <p style="margin: 0 0 6px 0; color: #475569; font-size: 0.9rem;">
                <strong>Entity:</strong> M/S Shram Sarathi Network
            </p>
            <p style="margin: 0 0 6px 0; color: #475569; font-size: 0.9rem; word-break: break-all; overflow-wrap: anywhere;">
                <strong>Email:</strong> <a href="mailto:support@shramsarathinetwork.com" style="color: var(--orange); font-weight: 700; word-break: break-all; overflow-wrap: anywhere;">support@shramsarathinetwork.com</a>
            </p>
            <p style="margin: 0; color: #475569; font-size: 0.9rem;">
                <strong>Resolution SLA:</strong> Acknowledgment within 48 hours; resolution within 15 business days.
            </p>
        </div>
    </div>

    <!-- 4. Quick Online Inquiry & Booking -->
    <div class="policy-section" style="background: var(--navy); color: #fff; text-align: center; border-radius: var(--radius-lg); padding: 36px 20px;">
        <h3 style="font-size: 1.3rem; font-weight: 900; margin-bottom: 8px; color: #fff;">Need to Book Workers or Submit an Inquiry?</h3>
        <p style="color: rgba(255,255,255,0.8); max-width: 620px; margin: 0 auto 20px;">
            You can submit your service request, transport need, or material inquiry directly on our web portal or download our Android app.
        </p>
        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
            <a href="{{ url('/#inquiry') }}" style="background: var(--orange); color: #fff; padding: 12px 28px; border-radius: 8px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px; text-decoration: none;">
                <i class="fa-solid fa-calendar-check"></i> Book Services Online
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: #fff; padding: 12px 28px; border-radius: 8px; font-weight: 800; display: inline-flex; align-items: center; gap: 8px; text-decoration: none;">
                <i class="fa-brands fa-google-play"></i> Get Android App
            </a>
        </div>
    </div>

</div>

@endsection
