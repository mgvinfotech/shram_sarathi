@extends('web.layouts.public')

@section('title', 'How It Works — Shram Sarathi Network')
@section('meta_description', 'Understand how Shram Sarathi Network works in 5 simple steps: select service, specify location, connect with verified providers, agree on rates, and get work done.')

@push('styles')
<style>
    .how-hero {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        border-bottom: 3px solid var(--orange);
    }
    .how-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
    }
    .how-hero h1 span { color: var(--orange); }
    .how-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.85);
        max-width: 720px;
        margin: 0 auto;
    }

    .how-container {
        max-width: 1180px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .how-steps-wrap {
        display: flex;
        flex-direction: column;
        gap: 24px;
        margin: 36px 0;
    }
    .step-full-card {
        background: #ffffff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-lg);
        padding: 28px 32px;
        box-shadow: var(--shadow-sm);
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 24px;
        align-items: center;
        transition: transform 0.25s, box-shadow 0.25s;
    }
    .step-full-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
        border-color: var(--orange);
    }
    @media (max-width: 680px) {
        .step-full-card {
            grid-template-columns: 1fr;
            gap: 16px;
            padding: 22px;
        }
    }
    .step-badge-circle {
        width: 70px;
        height: 70px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.8rem;
        color: #fff;
        font-weight: 900;
    }
    .step-content h3 {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--navy);
        margin: 0 0 6px;
    }
    .step-content p {
        font-size: 0.92rem;
        color: #475569;
        line-height: 1.6;
        margin: 0;
    }

    .dual-guide-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px;
        margin-top: 48px;
    }
    @media (max-width: 860px) {
        .dual-guide-grid {
            grid-template-columns: 1fr;
        }
    }
    .guide-card {
        border-radius: var(--radius-lg);
        padding: 32px;
        box-shadow: var(--shadow-sm);
    }
    .guide-card.customer {
        background: #eff6ff;
        border: 1.5px solid #bfdbfe;
    }
    .guide-card.provider {
        background: #ecfdf5;
        border: 1.5px solid #a7f3d0;
    }
    .guide-card h3 {
        font-size: 1.3rem;
        font-weight: 900;
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .guide-card.customer h3 { color: #1e40af; }
    .guide-card.provider h3 { color: #065f46; }

    .guide-list {
        list-style: none;
        padding: 0;
        margin: 0 0 24px;
    }
    .guide-list li {
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.9rem;
        color: #334155;
        line-height: 1.5;
    }
    .guide-list li i {
        margin-top: 3px;
        font-size: 0.95rem;
    }
</style>
@endpush

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<section class="how-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-list-check"></i> पारदर्शी व सरल प्रक्रिया • 5 Simple Steps
        </span>
        <h1>How Shram Sarathi <span>Network Works</span></h1>
        <p>
            अपनी सेवा का चयन करने से लेकर कार्य के सफल समापन तक — जानिए ग्राहक और कामगार दोनों के लिए पूरी कार्यप्रणाली।
        </p>
    </div>
</section>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="how-container">

    <!-- Visual Banner -->
    <div style="border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); border: 2px solid #fed7aa; margin-bottom: 36px; background: #fff;">
        <img src="{{ asset('images/web_banners/page4_how_it_works.jpg') }}" alt="How Shram Sarathi Works 5-Step Process" style="width: 100%; height: auto; display: block;" loading="lazy">
        <div style="padding: 14px 22px; background: #fff7ed; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <span style="font-size: 0.88rem; color: var(--orange-dark); font-weight: 700;">
                <i class="fa-solid fa-circle-check"></i> शून्य बिचौलिया &bull; सीधा संपर्क &bull; पारदर्शी सेवा रिकॉर्ड
            </span>
            <span style="font-size: 0.84rem; color: #64748b;">
                सुल्तानपुर एवं सम्पूर्ण भारत में उपलब्ध
            </span>
        </div>
    </div>

    <!-- 5 Steps List -->
    <div class="how-steps-wrap">
        <!-- Step 1 -->
        <div class="step-full-card">
            <div class="step-badge-circle" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                01
            </div>
            <div class="step-content">
                <h3>1. सेवा का चयन करें (Choose Service Category)</h3>
                <p>
                    वेबसाइट या मोबाइल ऐप पर अपनी आवश्यकता अनुसार श्रेणी चुनें — मजदूर, कुशल कारीगर (प्लंबर, इलेक्ट्रीशियन, मिस्त्री), ड्राइवर, वाहन/ट्रांसपोर्ट, ठेकेदार या निर्माण व कृषि सामग्री।
                </p>
            </div>
        </div>

        <!-- Step 2 -->
        <div class="step-full-card">
            <div class="step-badge-circle" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
                02
            </div>
            <div class="step-content">
                <h3>2. कार्य का स्थान, समय व आवश्यकता बताएं (Specify Requirements)</h3>
                <p>
                    कार्य स्थल का पता, पिनकोड, कार्य की तारीख, समय (फुल डे 8 घंटे या हाफ डे 4 घंटे) और आवश्यक कामगारों या वाहनों की संख्या दर्ज करें।
                </p>
            </div>
        </div>

        <!-- Step 3 -->
        <div class="step-full-card">
            <div class="step-badge-circle" style="background: linear-gradient(135deg, #10b981, #047857);">
                03
            </div>
            <div class="step-content">
                <h3>3. सत्यापित कामगारों से तुरंत मिलान (Instant Matching)</h3>
                <p>
                    श्रम सारथी का डिजिटल सिस्टम आपके सबसे नजदीकी प्रमाणित व आधार-सत्यापित कामगारों या वाहन मालिकों को आपका अनुरोध भेजता है।
                </p>
            </div>
        </div>

        <!-- Step 4 -->
        <div class="step-full-card">
            <div class="step-badge-circle" style="background: linear-gradient(135deg, #7c3aed, #6d28d9);">
                04
            </div>
            <div class="step-content">
                <h3>4. सीधी बातचीत व पारस्परिक सहमति (Direct Contact & Negotiate)</h3>
                <p>
                    कामगार या प्रदाता आपसे सीधे फोन पर बात करते हैं। काम की रूपरेखा और पारिश्रमिक आपसी बातचीत (मोलभाव) द्वारा तय किया जाता है। बिचौलियों का कोई हस्तक्षेप नहीं होता।
                </p>
            </div>
        </div>

        <!-- Step 5 -->
        <div class="step-full-card">
            <div class="step-badge-circle" style="background: linear-gradient(135deg, #0d9488, #0f766e);">
                05
            </div>
            <div class="step-content">
                <h3>5. सफल कार्य संपादन व डिजिटल रिकॉर्ड (Job Done & Records)</h3>
                <p>
                    कामगार समय पर पहुंचकर कार्य पूर्ण करता है। ग्राहक द्वारा सीधे कामगार को तयशुदा मेहनताना दिया जाता है। ऐप में बुकिंग और लेनदेन का सुरक्षित डिजिटल रिकॉर्ड सुरक्षित रहता है।
                </p>
            </div>
        </div>
    </div>

    <!-- Dual Guidelines (Customers vs Providers) -->
    <div class="dual-guide-grid">
        <!-- Customer Guide -->
        <div class="guide-card customer">
            <h3><i class="fa-solid fa-user"></i> ग्राहकों के लिए (For Customers)</h3>
            <ul class="guide-list">
                <li><i class="fa-solid fa-check" style="color: #2563eb;"></i> <strong>न्यूनतम सुविधा शुल्क:</strong> मजदूर के लिए ₹20/दिन, कारीगर/ड्राइवर के लिए मात्र ₹25/दिन।</li>
                <li><i class="fa-solid fa-check" style="color: #2563eb;"></i> <strong>सत्यापित कामगार:</strong> पहचान और बुनियादी क्रेडेंशियल जांच के बाद ही ऑनबोर्डिंग।</li>
                <li><i class="fa-solid fa-check" style="color: #2563eb;"></i> <strong>सीधी बातचीत:</strong> मजदूरी सीधे कामगार से तय करें बिना किसी छिपे हुए चार्ज के।</li>
                <li><i class="fa-solid fa-check" style="color: #2563eb;"></i> <strong>समर्पित सहायता:</strong> किसी भी प्रश्न के लिए IVR हेल्पलाइन +91 7084900909 उपलब्ध।</li>
            </ul>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="width: 100%; justify-content: center;">
                सेवा बुक करें / Book Service <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- Provider Guide -->
        <div class="guide-card provider">
            <h3><i class="fa-solid fa-hammer"></i> कामगारों के लिए (For Service Providers)</h3>
            <ul class="guide-list">
                <li><i class="fa-solid fa-check" style="color: #059669;"></i> <strong>0% मजदूरी कटौती:</strong> आपकी मजदूरी से कोई कमीशन नहीं काटा जाता, 100% कमाई आपकी।</li>
                <li><i class="fa-solid fa-check" style="color: #059669;"></i> <strong>नियमित काम:</strong> अपने ब्लॉक व शहर में रोजाना काम के नए अवसर प्राप्त करें।</li>
                <li><i class="fa-solid fa-check" style="color: #059669;"></i> <strong>डिजिटल पहचान:</strong> आपका अपना प्रोफाइल, रेटिंग और डिजिटल पहचान पत्र।</li>
                <li><i class="fa-solid fa-check" style="color: #059669;"></i> <strong>सरल ऐप:</strong> हिंदी व स्थानीय भाषा में आसान मोबाइल ऐप का उपयोग।</li>
            </ul>
            <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="slide-btn secondary" style="background: #064e3b; color: #fff; width: 100%; justify-content: center;">
                <i class="fa-brands fa-google-play"></i> ऐप डाउनलोड कर कामगार बनें
            </a>
        </div>
    </div>

</div>

@endsection
