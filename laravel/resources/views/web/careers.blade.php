@extends('web.layouts.public')

@section('title', 'Careers & Field Opportunities — Shram Sarathi Network')
@section('meta_description', 'Join our team at Shram Sarathi Network. Explore careers in operations, district management, and block-level field partner opportunities.')

@push('styles')
<style>
    .careers-hero {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        border-bottom: 3px solid var(--orange);
    }
    .careers-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
    }
    .careers-hero h1 span { color: var(--orange); }
    .careers-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.85);
        max-width: 720px;
        margin: 0 auto;
    }

    .careers-container {
        max-width: 1140px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .job-card {
        background: #ffffff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-lg);
        padding: 28px 32px;
        box-shadow: var(--shadow-sm);
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 20px;
        transition: transform 0.25s, box-shadow 0.25s;
    }
    .job-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
        border-color: var(--orange);
    }
    .job-details h3 {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--navy);
        margin: 0 0 6px;
    }
    .job-meta {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        font-size: 0.84rem;
        color: #64748b;
        margin-bottom: 10px;
    }
    .job-meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }
    .job-details p {
        font-size: 0.9rem;
        color: #475569;
        margin: 0;
        max-width: 680px;
        line-height: 1.55;
    }
</style>
@endpush

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<section class="careers-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-briefcase"></i> हमारे साथ काम करें • Work With Us
        </span>
        <h1>Careers &amp; <span>Opportunities</span></h1>
        <p>
            भारत के सबसे तेजी से बढ़ते श्रम व सेवा नेटवर्क का हिस्सा बनें। जमीनी स्तर पर रोजगार सृजन और डिजिटल क्रांति को आगे बढ़ाएं।
        </p>
    </div>
</section>

<!-- ─── Careers Container ────────────────────────────────────────────── -->
<div class="careers-container">

    <!-- Overview Banner -->
    <div style="background: #fff; border-radius: var(--radius-lg); padding: 26px 30px; border: 1px solid var(--card-border); margin-bottom: 32px; box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--navy); margin: 0 0 4px;">हमारे मिशन से जुड़ें</h3>
            <p style="margin: 0; font-size: 0.9rem; color: #64748b;">M/S Shram Sarathi Network (A Registered Enterprise under MSME / Govt. Guidelines)</p>
        </div>
        <a href="mailto:support@shramsarathinetwork.com?subject=Job%20Application%20at%20Shram%20Sarathi" class="slide-btn primary">
            <i class="fa-solid fa-paper-plane"></i> बायोडाटा भेजें / Apply Now
        </a>
    </div>

    <!-- Job 1 -->
    <div class="job-card">
        <div class="job-details">
            <h3>जिला परिचालन प्रबंधक (District Operations Executive)</h3>
            <div class="job-meta">
                <span><i class="fa-solid fa-location-dot" style="color: var(--orange);"></i> सुल्तानपुर / अमेठी / अयोध्या (UP)</span>
                <span><i class="fa-solid fa-clock"></i> Full Time</span>
                <span><i class="fa-solid fa-briefcase"></i> 1-3 Years Experience</span>
            </div>
            <p>जिले में कामगारों, ठेकेदारों और वाहन मालिकों के ऑनबोर्डिंग नेटवर्क का प्रबंधन, फील्ड एजेंट्स का समन्वय और बुकिंग मॉनिटरिंग।</p>
        </div>
        <a href="mailto:support@shramsarathinetwork.com?subject=Application%20for%20District%20Operations" class="slide-btn secondary" style="background: var(--navy); color: #fff;">
            आवेदन करें ➔
        </a>
    </div>

    <!-- Job 2 -->
    <div class="job-card">
        <div class="job-details">
            <h3>फील्ड सत्यापन व ऑनबोर्डिंग अधिकारी (Field Onboarding Specialist)</h3>
            <div class="job-meta">
                <span><i class="fa-solid fa-location-dot" style="color: var(--orange);"></i> उत्तर प्रदेश (विभिन्न ब्लॉक)</span>
                <span><i class="fa-solid fa-clock"></i> Full Time / Field</span>
                <span><i class="fa-solid fa-id-card"></i> Freshers / 0-2 Years</span>
            </div>
            <p>मजदूरों, राजमिस्त्री, प्लंबर और ड्राइवरों के पास जाकर उनका आधार सत्यापन, डिजिटल प्रोफाइल निर्माण और ऐप उपयोग में सहायता।</p>
        </div>
        <a href="mailto:support@shramsarathinetwork.com?subject=Application%20for%20Field%20Onboarding" class="slide-btn secondary" style="background: var(--navy); color: #fff;">
            आवेदन करें ➔
        </a>
    </div>

    <!-- Job 3 -->
    <div class="job-card">
        <div class="job-details">
            <h3>ब्लॉक डिजिटल सारथी पार्टनर (Block Agent Partner)</h3>
            <div class="job-meta">
                <span><i class="fa-solid fa-location-dot" style="color: var(--orange);"></i> आपका अपना ब्लॉक व कस्बा</span>
                <span><i class="fa-solid fa-handshake"></i> Incentive &amp; Commission Based</span>
                <span><i class="fa-solid fa-user-check"></i> कोई पूर्व अनुभव आवश्यक नहीं</span>
            </div>
            <p>अपने क्षेत्र में अधिकृत श्रम सारथी एजेंट बनें। कामगारों को जोड़ें, ग्राहकों की बुकिंग में मदद करें और आकर्षक मासिक कमीशन पाएं।</p>
        </div>
        <a href="tel:+917084900909" class="slide-btn primary">
            <i class="fa-solid fa-phone"></i> सीधे बात करें: +91 7084900909
        </a>
    </div>

</div>

@endsection
