@extends('web.layouts.public')

@section('title', 'About Business & Our Mission — Shram Sarathi Network')
@section('meta_description', 'Learn about Shram Sarathi Network (श्रम सारथी नेटवर्क) — M/S Shram Sarathi Network, A Registered Enterprise under MSME / Govt. Guidelines. Our mission: “Right to Work for Every People”.')

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<div class="policy-hero" style="background: linear-gradient(135deg, rgba(7, 17, 30, 0.88) 0%, rgba(15, 23, 42, 0.82) 100%), url('{{ asset('images/web_banners/page8_about_us.jpg') }}') center/cover no-repeat; padding: 80px 24px 70px;">
    <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(249,115,22,0.22); border:1px solid rgba(249,115,22,0.4); color:#fdba74; padding:6px 18px; border-radius:50px; font-size:0.875rem; font-weight:700; margin-bottom:16px;">
        <i class="fa-solid fa-users"></i>
        <span>Official Business Profile &amp; Mission — Shram Sarathi Network</span>
    </div>
    <h1>About Business & <span>Our Mission</span></h1>
    <p>“Right to Work for Every People” — Connecting people with work, skills with opportunities, and customers with trusted service providers across India.</p>
</div>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="policy-body">

    <div class="policy-meta-badge" style="background: #eff6ff; border-color: #bfdbfe; color: #1e40af;">
        <i class="fa-solid fa-award" style="color: #3b82f6;"></i>
        <span><strong>M/S Shram Sarathi Network</strong> &nbsp;|&nbsp; A Registered Enterprise under MSME / Govt. Guidelines &nbsp;|&nbsp; Pan-India Digital Facilitation</span>
    </div>

    <!-- Section 1: About Business -->
    <div class="policy-section">
        <h2><span class="num-badge">1</span> About Business / व्यवसाय के बारे में</h2>
        <p>
            <strong>Shram Sarathi Network (श्रम सारथी नेटवर्क)</strong> is an Indian technology-enabled digital intermediary and service facilitation platform operated under <strong>M/S Shram Sarathi Network (A Registered Enterprise under MSME / Govt. Guidelines)</strong>. The platform is designed to connect customers seamlessly with independent labourers, skilled technicians, drivers, contractors, vehicle owners, and construction/agriculture material suppliers.
        </p>

        <!-- About Us Graphic Showcase Card -->
        <div style="margin: 20px 0 24px; border-radius: 14px; overflow: hidden; border: 1px solid var(--card-border); box-shadow: var(--shadow-sm); background: #fff;">
            <img src="{{ asset('images/web_banners/page8_about_us.jpg') }}" alt="About Shram Sarathi Network Workforce Ecosystem" style="width:100%; height:auto; display:block;" loading="lazy">
            <div style="padding: 12px 18px; background: #f8fafc; font-size: 0.85rem; color: #475569; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <span><i class="fa-solid fa-shield-halved" style="color: var(--green); margin-right: 6px;"></i> M/S Shram Sarathi Network &bull; Registered MSME Enterprise</span>
                <span style="font-weight: 600; color: var(--navy);"><i class="fa-solid fa-location-dot" style="color: var(--orange); margin-right: 4px;"></i> Sultanpur, UP &bull; Pan-India Coverage</span>
            </div>
        </div>

        <p>
            The platform facilitates service discovery, lead generation, quick inquiry handling, transparent coordination, communication, and digital records through its official website and high-performance Android mobile application.
        </p>
        <div class="alert-callout" style="background:#f8fafc; border-color:var(--navy); color:var(--navy);">
            <strong><i class="fa-solid fa-scale-balanced"></i> Platform Legal & Intermediary Status:</strong><br>
            Shram Sarathi Network operates solely as a digital intermediary under the Information Technology Act, 2000 and applicable intermediary rules. The platform does not employ workers directly nor does it own transport vehicles or material stores. All wages, service rates, and material costs are determined through mutual agreement (मोलभाव) directly between the customer and provider.
        </div>
    </div>

    <!-- Section 2: Our Mission -->
    <div class="policy-section">
        <h2><span class="num-badge">2</span> Our Mission / हमारा मिशन</h2>
        <div style="background:var(--orange-light); border-left:4px solid var(--orange); padding:16px 20px; border-radius:8px; margin-bottom:20px;">
            <h3 style="font-size:1.3rem; font-weight:900; color:var(--orange-dark); margin-bottom:4px;">
                “Right to Work for Every People”
            </h3>
            <p style="margin:0; font-weight:600; color:var(--navy);">
                Our mission is to build an inclusive technology network that connects people with work, skills with opportunities, and customers with verified local service providers.
            </p>
        </div>

        <!-- Our Mission Panorama Visual Showcase -->
        <div style="margin: 20px 0 24px; border-radius: 14px; overflow: hidden; border: 1px solid var(--card-border); box-shadow: var(--shadow-sm); background: #fff;">
            <img src="{{ asset('images/web_banners/page3_our_mission.jpg') }}" alt="Our Mission — Right to Work for Every People" style="width:100%; height:auto; display:block;" loading="lazy">
            <div style="padding: 12px 18px; background: #fff7ed; border-top: 1px solid rgba(249,115,22,0.2); font-size: 0.85rem; color: var(--orange-dark); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <span><strong>हमारा संकल्प:</strong> हर हाथ को काम, हर हुनर को पहचान (Right to Work for Every People)</span>
                <span style="font-weight: 700; color: var(--navy);"><i class="fa-solid fa-handshake" style="color: var(--orange); margin-right: 4px;"></i> Direct Connection &bull; Middleman-Free</span>
            </div>
        </div>

        <h3 style="font-size:1.1rem; font-weight:800; color:var(--navy); margin-bottom:14px;">Key Objectives & Pillars:</h3>
        <ul>
            <li><strong>Connect local workers and skilled professionals with genuine opportunities:</strong> Eliminating exploitative commission agents and empowering blue-collar professionals with direct customer access.</li>
            <li><strong>Make labour, skilled-worker, driver, contractor, transport and materials easier to discover:</strong> Fast and reliable discovery for households, builders, farmers, and commercial entities.</li>
            <li><strong>Promote digital access to local service networks:</strong> Bringing modern smartphone and web technology to grassroot workers across Tier-2, Tier-3 cities, and rural belts.</li>
            <li><strong>Support transparent and technology-enabled service facilitation:</strong> Clear communication, fair negotiation, 0% deduction from workers, and permanent digital transaction records.</li>
            <li><strong>Help service providers build a digital presence and access customers:</strong> Providing verified identity, KYC verification badges, and reputation building.</li>
            <li><strong>Strengthen local employment opportunities and service connectivity:</strong> Fostering economic self-reliance and community-level prosperity across Sultanpur and Bharat.</li>
            <li><strong>Build a trusted, accessible and scalable service network across India:</strong> Expanding systematically from Uttar Pradesh to nationwide operations.</li>
        </ul>
    </div>

    <!-- Section 3: Core Service Ecosystem -->
    <div class="policy-section">
        <h2><span class="num-badge">3</span> Seven Core Service Categories / मुख्य 7 सेवाएं</h2>
        <p>Shram Sarathi Network spans across seven specialized domains covering the entire workforce and material lifecycle:</p>
        <ul>
            <li><strong>मजदूर (Labour):</strong> General labour for construction, agriculture, loading/unloading, digging, cleaning, and household tasks (Full Day 8 hrs, Half Day 4 hrs, or contract).</li>
            <li><strong>कारीगर / मिस्त्री (Skilled Worker):</strong> Certified plumbers, electricians, carpenters, painters, masons (mistri), welders, and fabricators.</li>
            <li><strong>चालक / ड्राइवर (Driver):</strong> Verified drivers for private cars, taxis, autos, tractors, JCBs, and heavy commercial vehicles.</li>
            <li><strong>वाहन एवं परिवहन (Vehicle & Transport):</strong> Taxis, cabs, auto-rickshaws, pickups, loaders, and freight trucks for immediate or advance booking.</li>
            <li><strong>ठेकेदार (Contractor):</strong> Turnkey building construction, civil engineering, interior renovation, and painting contracts.</li>
            <li><strong>निर्माण सामग्री (Construction Material):</strong> Sand (बालू), red morang (मौरंग), cement, TMT rebars (सरिया), bricks (ईंट), gravel (गिट्टी/रोड़ी), tiles, and paints.</li>
            <li><strong>कृषि सामग्री (Agriculture Material):</strong> High-yield seeds, fertilizers (urea/DAP/organic manure), pesticides, irrigation pipes/motors, and cattle feed.</li>
        </ul>
    </div>

    <!-- Section 4: Connect & Support -->
    <div class="policy-section" style="text-align:center; background:linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%); color:#fff; border-radius: var(--radius-lg); padding: 40px 24px;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 12px;">
            M/S Shram Sarathi Network
        </span>
        <h2 style="color:#fff; justify-content:center; margin-bottom:10px;">Connect With Shram Sarathi Network</h2>
        <p style="color:rgba(255,255,255,0.85); max-width:600px; margin:0 auto 20px; font-size: 0.95rem;">
            Have questions, need booking assistance, or want to partner with us in your district? Reach out to our dedicated support desk.
        </p>

        <div style="display:flex; justify-content:center; gap:16px; margin-bottom:28px;">
            <a href="https://www.instagram.com/shramsarathinetwork?utm_source=qr&stkn=MWZieTV5dTY1eDMxeA==" target="_blank" rel="noopener noreferrer" style="background:#fff; color:#e1306c; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition: transform 0.2s;" title="Instagram">
                <i class="fa-brands fa-instagram"></i>
            </a>
            <a href="https://www.facebook.com/share/1FK4ZwiMrK/" target="_blank" rel="noopener noreferrer" style="background:#fff; color:#1877f2; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition: transform 0.2s;" title="Facebook">
                <i class="fa-brands fa-facebook-f"></i>
            </a>
            <a href="https://youtube.com/@shramsarathinetwork?si=JZ1UkWw0YfKBNk4y" target="_blank" rel="noopener noreferrer" style="background:#fff; color:#ff0000; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition: transform 0.2s;" title="YouTube">
                <i class="fa-brands fa-youtube"></i>
            </a>
            <a href="https://wa.me/917084900909" target="_blank" rel="noopener noreferrer" style="background:#fff; color:#22c55e; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition: transform 0.2s;" title="WhatsApp Desk">
                <i class="fa-brands fa-whatsapp"></i>
            </a>
        </div>

        <div style="display:flex; justify-content:center; gap:14px; flex-wrap:wrap;">
            <a href="tel:+917084900909" style="background:var(--orange); color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; text-decoration: none;">
                <i class="fa-solid fa-phone"></i> IVR Helpline: +91 7084900909
            </a>
            <a href="mailto:support@shramsarathinetwork.com" style="background:rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; text-decoration: none;">
                <i class="fa-solid fa-envelope"></i> support@shramsarathinetwork.com
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" style="background:#0f172a; border: 1px solid rgba(255,255,255,0.25); color:#fff; padding:12px 24px; border-radius:8px; font-weight:700; text-decoration: none;">
                <i class="fa-brands fa-google-play"></i> Get Android App
            </a>
        </div>
    </div>

</div>

@endsection
