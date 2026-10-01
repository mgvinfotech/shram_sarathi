@extends('web.layouts.public')

@section('title', 'Join Shram Sarathi Network — For Service Providers & Partners')
@section('meta_description', 'Join Shram Sarathi Network as Labour, Skilled Worker, Driver, Contractor, Vehicle Owner, or Material Supplier. 0% deductions from worker wages, daily work, and direct customer bookings.')

@push('styles')
<style>
    .join-hero {
        background: linear-gradient(135deg, #064e3b 0%, #0b192c 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        border-bottom: 3px solid var(--orange);
    }
    .join-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
    }
    .join-hero h1 span { color: #34d399; }
    .join-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.88);
        max-width: 740px;
        margin: 0 auto;
    }

    .join-container {
        max-width: 1240px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .benefits-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 40px;
    }
    @media (max-width: 960px) {
        .benefits-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 540px) {
        .benefits-grid { grid-template-columns: 1fr; }
    }
    .benefit-item {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 24px 20px;
        text-align: center;
        box-shadow: var(--shadow-sm);
    }
    .benefit-icon {
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: #ecfdf5;
        color: #059669;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        margin: 0 auto 14px;
    }
    .benefit-item h4 {
        font-size: 1rem;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 6px;
    }
    .benefit-item p {
        font-size: 0.84rem;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
    }

    .download-cta-banner {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        border-radius: var(--radius-lg);
        padding: 40px 32px;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 28px;
        flex-wrap: wrap;
        box-shadow: var(--shadow-lg);
        border: 2px solid rgba(249,115,22,0.4);
        margin: 40px 0;
    }
    .download-cta-text h3 {
        font-size: 1.6rem;
        font-weight: 900;
        color: #fff;
        margin: 0 0 8px;
    }
    .download-cta-text p {
        font-size: 0.95rem;
        color: rgba(255, 255, 255, 0.85);
        margin: 0;
        max-width: 600px;
    }
    .download-cta-buttons {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
    }
</style>
@endpush

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<section class="join-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(52, 211, 153, 0.2); color: #a7f3d0; border: 1px solid rgba(52, 211, 153, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-user-plus"></i> सेवा प्रदाता पंजीकरण • Provider Network
        </span>
        <h1>Join Shram Sarathi <span>Network</span></h1>
        <p>
            हर हाथ को काम, हर हुनर को सम्मान — सीधे ग्राहकों से जुड़ें, अपनी कमाई बढ़ाएं और श्रम सारथी नेटवर्क के साथ बनें आत्मनिर्भर।
        </p>
    </div>
</section>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="join-container">

    <!-- Showcase Banner -->
    <div style="border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); border: 2px solid #fed7aa; margin-bottom: 36px; background: #fff;">
        <img src="{{ asset('images/web_banners/page6_for_provider.jpg') }}" alt="Shram Sarathi Service Providers Network" style="width: 100%; height: auto; display: block;" loading="lazy">
        <div style="padding: 16px 24px; background: #f0fdf4; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <span style="font-size: 0.9rem; color: #065f46; font-weight: 800;">
                <i class="fa-solid fa-shield-halved"></i> 0% मजदूरी कटौती &bull; 100% पारिश्रमिक आपका &bull; कोई बिचौलिया नहीं
            </span>
            <span style="font-size: 0.84rem; color: #64748b;">
                प्रमाणित पहचान व आधार सत्यापन
            </span>
        </div>
    </div>

    <!-- 4 Key Provider Benefits -->
    <div class="benefits-grid">
        <div class="benefit-item">
            <div class="benefit-icon"><i class="fa-solid fa-hand-holding-dollar"></i></div>
            <h4>0% मजदूरी कटौती</h4>
            <p>आपकी मेहनत की पूरी कमाई आपकी। प्लेटफॉर्म श्रमिक पारिश्रमिक से कोई कमीशन नहीं काटता।</p>
        </div>
        <div class="benefit-item">
            <div class="benefit-icon"><i class="fa-solid fa-calendar-check"></i></div>
            <h4>रोजाना काम के अवसर</h4>
            <p>अपने नजदीकी इलाके में रोजाना नए ग्राहक, निर्माण कार्य और बुकिंग प्राप्त करें।</p>
        </div>
        <div class="benefit-item">
            <div class="benefit-icon"><i class="fa-solid fa-id-badge"></i></div>
            <h4>डिजिटल पहचान व सम्मान</h4>
            <p>सत्यापित कामगार प्रोफाइल, अनुभव पत्र और डिजिटल पहचान से ग्राहकों का विश्वास पाएं।</p>
        </div>
        <div class="benefit-item">
            <div class="benefit-icon"><i class="fa-solid fa-mobile-screen"></i></div>
            <h4>आसान मोबाइल ऐप</h4>
            <p>हिंदी व सरल भाषा में बना ऐप। एक क्लिक में बुकिंग स्वीकार करें और ग्राहक से बात करें।</p>
        </div>
    </div>

    <!-- 6 Pastel Registration Cards -->
    <div class="section-header" style="margin-bottom: 32px;">
        <span class="section-badge">श्रेणी अनुसार पंजीकरण</span>
        <h2 class="section-title">अपनी श्रेणी चुनें और तुरंत जुड़ें</h2>
        <p class="section-subtitle">Google Play Store से ऐप डाउनलोड करके कुछ ही मिनटों में अपना पंजीकरण पूर्ण करें।</p>
    </div>

    <div class="join-grid-pastel" style="margin-bottom: 40px;">
        <!-- 1. Labour -->
        <div class="join-card-pastel c-amber">
            <div>
                <div class="join-card__icon" style="background: #f59e0b; color: #fff;"><i class="fa-solid fa-person-digging"></i></div>
                <h4 style="margin-bottom: 2px;">मजदूर के रूप में जुड़ें</h4>
                <small style="color: #92400e; font-weight: 700; display: block; margin-bottom: 8px;">Labour Registration</small>
                <p style="font-size: 0.84rem; color: #475569; margin-bottom: 12px;">निर्माण, लोडिंग, कृषि व सामान्य मजदूरी में नियमित काम पाएं। 0% मजदूरी कटौती।</p>
            </div>
            <div class="join-card__btn-group">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-playstore-mini">
                    <i class="fa-brands fa-google-play"></i> Play Store से जुड़ें
                </a>
                <a href="javascript:void(0);" class="btn-apk-mini" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
                </a>
            </div>
        </div>

        <!-- 2. Skilled Worker -->
        <div class="join-card-pastel c-blue">
            <div>
                <div class="join-card__icon" style="background: #0284c7; color: #fff;"><i class="fa-solid fa-wrench"></i></div>
                <h4 style="margin-bottom: 2px;">कारीगर / मिस्त्री बनें</h4>
                <small style="color: #0369a1; font-weight: 700; display: block; margin-bottom: 8px;">Skilled Worker Registration</small>
                <p style="font-size: 0.84rem; color: #475569; margin-bottom: 12px;">प्लंबर, इलेक्ट्रीशियन, बढ़ई, पेंटर व राजमिस्त्री अपने हुनर से सीधे ग्राहक पाएं।</p>
            </div>
            <div class="join-card__btn-group">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-playstore-mini">
                    <i class="fa-brands fa-google-play"></i> Play Store से जुड़ें
                </a>
                <a href="javascript:void(0);" class="btn-apk-mini" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
                </a>
            </div>
        </div>

        <!-- 3. Driver -->
        <div class="join-card-pastel c-emerald">
            <div>
                <div class="join-card__icon" style="background: #10b981; color: #fff;"><i class="fa-solid fa-id-card"></i></div>
                <h4 style="margin-bottom: 2px;">ड्राइवर के रूप में जुड़ें</h4>
                <small style="color: #047857; font-weight: 700; display: block; margin-bottom: 8px;">Driver Registration</small>
                <p style="font-size: 0.84rem; color: #475569; margin-bottom: 12px;">कार, टैक्सी, कमर्शियल वाहन या भारी वाहन चालक अपनी सुविधा अनुसार ड्यूटी पाएं।</p>
            </div>
            <div class="join-card__btn-group">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-playstore-mini">
                    <i class="fa-brands fa-google-play"></i> Play Store से जुड़ें
                </a>
                <a href="javascript:void(0);" class="btn-apk-mini" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
                </a>
            </div>
        </div>

        <!-- 4. Vehicle Owner / Transport -->
        <div class="join-card-pastel c-teal">
            <div>
                <div class="join-card__icon" style="background: #0d9488; color: #fff;"><i class="fa-solid fa-truck-moving"></i></div>
                <h4 style="margin-bottom: 2px;">वाहन मालिक / ट्रांसपोर्ट</h4>
                <small style="color: #0f766e; font-weight: 700; display: block; margin-bottom: 8px;">Vehicle Owner Registration</small>
                <p style="font-size: 0.84rem; color: #475569; margin-bottom: 12px;">ऑटो, टैक्सी, पिकअप, लोडर या बड़े ट्रक जोड़ें और नियमित ट्रिप्स पाएं।</p>
            </div>
            <div class="join-card__btn-group">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-playstore-mini">
                    <i class="fa-brands fa-google-play"></i> Play Store से जुड़ें
                </a>
                <a href="javascript:void(0);" class="btn-apk-mini" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
                </a>
            </div>
        </div>

        <!-- 5. Contractor -->
        <div class="join-card-pastel c-purple">
            <div>
                <div class="join-card__icon" style="background: #7c3aed; color: #fff;"><i class="fa-solid fa-helmet-safety"></i></div>
                <h4 style="margin-bottom: 2px;">ठेकेदार (Contractor)</h4>
                <small style="color: #6d28d9; font-weight: 700; display: block; margin-bottom: 8px;">Contractor Registration</small>
                <p style="font-size: 0.84rem; color: #475569; margin-bottom: 12px;">भवन निर्माण, मरम्मत, सिविल वर्क और पेंटिंग प्रोजेक्ट्स के लिए सीधे निविदाएं पाएं।</p>
            </div>
            <div class="join-card__btn-group">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-playstore-mini">
                    <i class="fa-brands fa-google-play"></i> Play Store से जुड़ें
                </a>
                <a href="javascript:void(0);" class="btn-apk-mini" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
                </a>
            </div>
        </div>

        <!-- 6. Material Supplier -->
        <div class="join-card-pastel c-rose">
            <div>
                <div class="join-card__icon" style="background: #e11d48; color: #fff;"><i class="fa-solid fa-store"></i></div>
                <h4 style="margin-bottom: 2px;">सामग्री आपूर्तिकर्ता / विक्रेता</h4>
                <small style="color: #be123c; font-weight: 700; display: block; margin-bottom: 8px;">Material Supplier Vendor</small>
                <p style="font-size: 0.84rem; color: #475569; margin-bottom: 12px;">निर्माण या कृषि सामग्री की अपनी दुकान जोड़ें और सीधे ग्राहकों से ऑर्डर पाएं।</p>
            </div>
            <div class="join-card__btn-group">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-playstore-mini">
                    <i class="fa-brands fa-google-play"></i> Play Store से जुड़ें
                </a>
                <a href="javascript:void(0);" class="btn-apk-mini" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
                </a>
            </div>
        </div>
    </div>

    <!-- Download App Banner -->
    <div class="download-cta-banner">
        <div class="download-cta-text">
            <span class="hero-pill primary" style="background: rgba(249,115,22,0.25); color: #fed7aa; margin-bottom: 10px;">
                <i class="fa-brands fa-android"></i> Android Mobile Application
            </span>
            <h3>आज ही श्रम सारथी ऐप डाउनलोड करें</h3>
            <p>
                काम पाने और अपनी दैनिक आय बढ़ाने के लिए आधिकारिक एंड्रॉइड ऐप अपने फोन में इंस्टॉल करें।
            </p>
        </div>
        <div class="download-cta-buttons">
            <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="slide-btn primary" style="background: #fff; color: var(--navy); box-shadow: none;">
                <i class="fa-brands fa-google-play" style="color: #10b981;"></i> Google Play Store
            </a>
            <a href="javascript:void(0);" class="slide-btn secondary" onclick="return false;" style="border-color: rgba(255,255,255,0.4); cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                <i class="fa-solid fa-download"></i> डायरेक्ट APK डाउनलोड
            </a>
        </div>
    </div>

    <!-- Agent / Ground Partner Network Banner -->
    <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); border-radius: var(--radius-lg); padding: 36px 30px; color: #fff; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 30px; align-items: center;">
        <div>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 12px;">
                ग्राउंड पार्टनर नेटवर्क • Agent Partner
            </span>
            <h3 style="font-size: 1.5rem; font-weight: 900; color: #fff; margin: 0 0 10px;">
                Become a Digital Sarathi / Agent Partner
            </h3>
            <p style="color: rgba(255,255,255,0.9); font-size: 0.92rem; line-height: 1.6; margin-bottom: 20px;">
                अपने ब्लॉक, तहसील और शहर में श्रम सारथी के अधिकृत एजेंट बनें। स्थानीय श्रमिकों को ऑनबोर्ड करें, बुकिंग में मदद करें और आकर्षक मासिक आय व प्रोत्साहन अर्जित करें।
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; font-size: 0.88rem;">
                <div><i class="fa-solid fa-circle-check" style="color: #34d399; margin-right: 6px;"></i> प्रत्येक कामगार जोड़ने पर आकर्षक कमीशन</div>
                <div><i class="fa-solid fa-circle-check" style="color: #34d399; margin-right: 6px;"></i> सफल बुकिंग समन्वय प्रोत्साहन राशि</div>
                <div><i class="fa-solid fa-circle-check" style="color: #34d399; margin-right: 6px;"></i> डिजिटल आईडी कार्ड व ब्लॉक स्तर पर आधिकारिक पहचान</div>
            </div>
            <a href="tel:+917084900909" class="slide-btn primary" style="background: var(--orange); color: #fff;">
                <i class="fa-solid fa-phone"></i> एजेंट बनने हेतु संपर्क करें: +91 7084900909
            </a>
        </div>
        <div style="border-radius: 12px; overflow: hidden; border: 2px solid rgba(255,255,255,0.3); box-shadow: var(--shadow-md);">
            <img src="{{ asset('images/web_banners/page7_agent_network.jpg') }}" alt="Shram Sarathi Field Agent Partner Network" style="width: 100%; height: auto; display: block;" loading="lazy">
        </div>
    </div>

</div>

@endsection
