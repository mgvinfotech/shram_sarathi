@extends('web.layouts.public')

@section('title', 'Privacy Policy — Shram Sarathi Network')
@section('meta_description', 'Official Privacy Policy of Shram Sarathi Network (श्रम सारथी नेटवर्क) — how we handle inquiries, booking records, user data, and privacy protection.')

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<div class="policy-hero">
    <h1>Privacy <span>Policy</span></h1>
    <p>Your privacy and data security are paramount to Shram Sarathi Network. Here is how we collect, handle, and protect your information.</p>
</div>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="policy-body">

    <div class="policy-meta-badge">
        <i class="fa-solid fa-user-lock"></i>
        <span>Effective Date: September 2026 &nbsp;|&nbsp; Version 2.0 &nbsp;|&nbsp; Shram Sarathi Network (श्रम सारथी नेटवर्क)</span>
    </div>

    <!-- 1. Introduction -->
    <div class="policy-section">
        <h2><span class="num-badge">1</span> Introduction & Role</h2>
        <p>
            <strong>Shram Sarathi Network (श्रम सारथी नेटवर्क)</strong> ("Platform", "we", "us", or "our") operates as a technology-enabled digital intermediary connecting customers with independent service providers (Labour, Skilled Workers, Drivers, Contractors, and Transport operators).
        </p>
        <p>
            This Privacy Policy explains how personal and service-related information is collected, processed, and protected in compliance with applicable Indian information technology regulations and data privacy principles.
        </p>
    </div>

    <!-- 2. Information We Collect -->
    <div class="policy-section">
        <h2><span class="num-badge">2</span> Information We Collect</h2>
        <p>We may collect information under the following categories:</p>
        <ul>
            <li><strong>Website Inquiry Information:</strong> Name, mobile number, email, city/locality, selected service category, work shift/duration, and project details provided when submitting an inquiry form.</li>
            <li><strong>Service Provider Verification Data:</strong> Identity credentials (such as Aadhaar/PAN where applicable), skill verification, commercial driving license, and vehicle registration records for onboarding.</li>
            <li><strong>Digital Records & Communication:</strong> Telephony (IVR / MyOperator) records, WhatsApp customer service interactions, and support ticket history for service facilitation, quality assurance, and dispute resolution.</li>
            <li><strong>Technical & Device Data:</strong> IP address, browser type, operating system, and general location details for platform security and fraudulent request prevention.</li>
        </ul>
    </div>

    <!-- 3. Purpose of Processing -->
    <div class="policy-section">
        <h2><span class="num-badge">3</span> How We Use Your Information</h2>
        <p>The information collected is used strictly for legitimate business and facilitation purposes:</p>
        <ul>
            <li>Connecting customers with relevant, available, and verified local service providers.</li>
            <li>Routing website inquiries to our support desk, CRM, and customer-care telephony workflows.</li>
            <li>Verifying provider credentials and maintaining safe, trusted community standards.</li>
            <li>Providing transactional confirmations, WhatsApp notifications, and customer support.</li>
            <li>Preventing spam, abuse, fraudulent bookings, and identity misuse.</li>
            <li>Complying with statutory compliance requirements under Indian law.</li>
        </ul>
    </div>

    <!-- 4. Data Sharing & Disclosure -->
    <div class="policy-section">
        <h2><span class="num-badge">4</span> Data Sharing & Disclosure</h2>
        <p>
            We do not sell, rent, or trade your personal information to third-party advertisers. Information is only shared under the following limited circumstances:
        </p>
        <ul>
            <li><strong>With Independent Service Providers / Customers:</strong> Relevant contact and location details are shared to coordinate accepted bookings and service facilitation.</li>
            <li><strong>With Service Partners:</strong> Trusted infrastructure partners such as SMS gateways, MyOperator telephony IVR, and cloud database providers under strict confidentiality agreements.</li>
            <li><strong>For Legal & Compliance Reasons:</strong> When requested by authorized law enforcement authorities or court orders pursuant to Indian laws.</li>
        </ul>
    </div>

    <!-- 5. Data Security & Storage -->
    <div class="policy-section">
        <h2><span class="num-badge">5</span> Data Security & Retention</h2>
        <p>
            We implement reasonable technical, operational, and administrative safeguards to protect your personal information against unauthorized access, loss, or misuse. Data is retained only for as long as necessary to fulfill service facilitation, auditing, and legal recordkeeping requirements.
        </p>
    </div>

    <!-- 6. Your Rights -->
    <div class="policy-section">
        <h2><span class="num-badge">6</span> User Rights & Choices</h2>
        <p>
            You have the right to review, update, or request the correction of your personal information held in our records. You may also contact our support team to opt out of non-essential promotional messages or request information deletion, subject to statutory recordkeeping requirements.
        </p>
    </div>

    <!-- 7. Grievance Officer & Contact -->
    <div class="policy-section" style="background:linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%); color:#fff; text-align:center;">
        <h3 style="font-size:1.25rem; font-weight:900; margin-bottom:10px; color:#fff;">Grievance Redressal & Privacy Inquiries</h3>
        <p style="color:rgba(255,255,255,0.8); max-width:580px; margin:0 auto 20px;">
            For privacy-related questions, data update requests, or grievance redressal, please contact our designated support channel:
        </p>
        <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
            <a href="mailto:support@shramsarathi.com" style="background:var(--orange); color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-envelope"></i> support@shramsarathi.com
            </a>
            <a href="tel:18001234567" style="background:rgba(255,255,255,0.15); color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-phone"></i> IVR: 1800-123-4567
            </a>
        </div>
        <p style="font-size:0.8rem; color:rgba(255,255,255,0.5); margin-top:16px;">
            Office: Sultanpur, Uttar Pradesh, India
        </p>
    </div>

</div>

@endsection
