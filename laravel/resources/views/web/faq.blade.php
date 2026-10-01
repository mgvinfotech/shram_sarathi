@extends('web.layouts.public')

@section('title', 'Frequently Asked Questions (FAQ) — Shram Sarathi Network')
@section('meta_description', 'Find answers to common questions about booking services, provider verification, pricing, wages, commissions, and platform wallet refunds on Shram Sarathi Network.')

@push('styles')
<style>
    .faq-hero {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        border-bottom: 3px solid var(--orange);
    }
    .faq-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
    }
    .faq-hero h1 span { color: var(--orange); }
    .faq-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.85);
        max-width: 720px;
        margin: 0 auto;
    }

    .faq-page-wrap {
        max-width: 1040px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .faq-group {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-lg);
        padding: 30px;
        margin-bottom: 30px;
        box-shadow: var(--shadow-sm);
    }
    .faq-group-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 2px solid #f1f5f9;
    }
    .faq-group-title i {
        font-size: 1.4rem;
        color: var(--orange);
    }
    .faq-group-title h2 {
        font-size: 1.3rem;
        font-weight: 800;
        color: var(--navy);
        margin: 0;
    }

    .faq-accordion-item {
        border-bottom: 1px solid #e2e8f0;
    }
    .faq-accordion-item:last-child {
        border-bottom: none;
    }
    .faq-trigger {
        padding: 18px 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
        transition: color 0.2s;
    }
    .faq-trigger span {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--navy);
    }
    .faq-trigger i {
        color: var(--orange);
        transition: transform 0.25s;
    }
    .faq-accordion-item.active .faq-trigger span {
        color: var(--orange-dark);
    }
    .faq-accordion-item.active .faq-trigger i {
        transform: rotate(180deg);
    }
    .faq-body-content {
        display: none;
        padding: 0 8px 18px;
        font-size: 0.93rem;
        color: #475569;
        line-height: 1.7;
    }
    .faq-accordion-item.active .faq-body-content {
        display: block;
    }
</style>
@endpush

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<section class="faq-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-circle-question"></i> अक्सर पूछे जाने वाले प्रश्न • Help &amp; Clarity
        </span>
        <h1>Frequently Asked <span>Questions</span></h1>
        <p>
            श्रम सारथी नेटवर्क से संबंधित सभी सामान्य प्रश्नों, बुकिंग प्रक्रिया, मजदूरी नियमों व नीतियों के स्पष्ट उत्तर।
        </p>
    </div>
</section>

<!-- ─── FAQ Container ────────────────────────────────────────────────── -->
<div class="faq-page-wrap">

    <!-- Group 1: General & Platform Model -->
    <div class="faq-group">
        <div class="faq-group-title">
            <i class="fa-solid fa-building"></i>
            <h2>1. प्लेटफ़ॉर्म व कंपनी परिचय (Platform Overview)</h2>
        </div>

        <div class="faq-accordion-item active">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>1. क्या श्रम सारथी नेटवर्क कामगारों का नियोक्ता (Employer) है?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                नहीं। श्रम सारथी नेटवर्क (M/S Shram Sarathi Network, भारत सरकार एवं एमएसएमई दिशा-निर्देशों के अंतर्गत पंजीकृत उद्यम) एक डिजिटल मध्यस्थ (Digital Intermediary) और सेवा सुविधा मंच है। यह स्वतंत्र कामगारों, ड्राइवरों, वाहन मालिकों, ठेकेदारों और ग्राहकों को तकनीक द्वारा सीधे जोड़ता है।
            </div>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>2. श्रम सारथी नेटवर्क किन-किन शहरों में उपलब्ध है?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                हमारी सेवाएं सुल्तानपुर (उत्तर प्रदेश) में सक्रिय रूप से संचालित हैं और निरंतर अन्य जिलों, कस्बों व सम्पूर्ण भारत में विस्तारित की जा रही हैं। वेबसाइट व मोबाइल ऐप दोनों के माध्यम से आप किसी भी क्षेत्र से बुकिंग व पूछताछ कर सकते हैं।
            </div>
        </div>
    </div>

    <!-- Group 2: For Customers -->
    <div class="faq-group">
        <div class="faq-group-title">
            <i class="fa-solid fa-users"></i>
            <h2>2. ग्राहकों के लिए (For Customers)</h2>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>3. ग्राहक को सेवा बुक करने पर कितना शुल्क देना पड़ता है?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                ग्राहकों के लिए न्यूनतम पारदर्शी सुविधा शुल्क है:
                <ul style="margin: 8px 0 0 20px;">
                    <li><strong>मजदूर:</strong> ₹20 / दिन (मासिक अनुबंध: ₹500 / माह)</li>
                    <li><strong>कुशल कारीगर (प्लंबर, मिस्त्री, इलेक्ट्रीशियन):</strong> ₹25 / दिन (मासिक अनुबंध: ₹600 / माह)</li>
                    <li><strong>ड्राइवर:</strong> ₹25 / दिन (मासिक अनुबंध: ₹600 / माह)</li>
                    <li><strong>ठेकेदार:</strong> ग्राहक के लिए 0% कमीशन।</li>
                </ul>
            </div>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>4. काम की मजदूरी कैसे तय होती है?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                काम की दैनिक या कार्य-आधारित मजदूरी पूरी तरह <strong>पारस्परिक सहमति (मोलभाव)</strong> पर आधारित होती है। ग्राहक और कामगार सीधे फोन पर अथवा कार्यस्थल पर काम देखकर आपसी बातचीत से मजदूरी तय करते हैं।
            </div>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>5. यदि कामगार समय पर न आए तो क्या रिफंड मिलेगा?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                यदि किसी कारणवश प्रदाता सेवा आरंभ करने से पूर्व रद्द कर देता है या उपस्थित नहीं होता है, तो हमारी सपोर्ट टीम तुरंत दूसरा कामगार उपलब्ध कराती है या देय रिफंड एडमिन पैनल द्वारा सीधे आपके प्लेटफ़ॉर्म वॉलेट (Wallet) में क्रेडिट कर दिया जाता है।
            </div>
        </div>
    </div>

    <!-- Group 3: For Service Providers -->
    <div class="faq-group">
        <div class="faq-group-title">
            <i class="fa-solid fa-hammer"></i>
            <h2>3. कामगारों व प्रदाताओं के लिए (For Service Providers)</h2>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>6. क्या कामगारों की मजदूरी से कोई कमीशन काटा जाता है?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                <strong>बिल्कुल नहीं (0% कटौती)।</strong> श्रमिकों, कारीगरों व ड्राइवरों की मजदूरी से कोई कटौती नहीं की जाती। ग्राहक द्वारा दिया गया पूरा 100% मेहनताना सीधे कामगार के हाथ में जाता है।
            </div>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>7. कामगार के रूप में पंजीकरण कैसे करें?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                आप Google Play Store से <strong>Shram Sarathi App</strong> डाउनलोड करके अपना नाम, मोबाइल नंबर, आधार विवरण और कार्य श्रेणी चुनकर तुरंत पंजीकृत हो सकते हैं। हमारी स्थानीय टीम सत्यापन के पश्चात आपकी आईडी सक्रिय कर देगी।
            </div>
        </div>

        <div class="faq-accordion-item">
            <div class="faq-trigger" onclick="toggleFaqItem(this)">
                <span>8. व्यावसायिक वाहनों व ठेकेदारों का क्या कमीशन नियम है?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-body-content">
                वाहन मालिकों के लिए: तत्काल बुकिंग पर 10% और अग्रिम बुकिंग पर 12% ट्रिप कमीशन वाहन मालिक द्वारा देय होता है। ठेकेदारों के लिए: स्वीकृत अनुबंध राशि पर मात्र 3% प्लेटफ़ॉर्म कमीशन लागू होता है।
            </div>
        </div>
    </div>

    <!-- Group 4: Support & Contact -->
    <div class="faq-group" style="text-align: center; background: #f8fafc;">
        <h3 style="color: var(--navy); font-size: 1.25rem; font-weight: 800; margin-bottom: 8px;">क्या आपके पास कोई अन्य प्रश्न है?</h3>
        <p style="color: #64748b; font-size: 0.92rem; margin-bottom: 20px;">हमारी सहायता टीम आपकी सेवा के लिए सदैव तत्पर है।</p>
        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
            <a href="tel:+917084900909" class="slide-btn primary">
                <i class="fa-solid fa-phone"></i> हेल्पलाइन: +91 7084900909
            </a>
            <a href="https://wa.me/917084900909" target="_blank" rel="noopener" class="slide-btn secondary" style="background: #22c55e; color: #fff; border: none;">
                <i class="fa-brands fa-whatsapp"></i> व्हाट्सएप सहायता
            </a>
        </div>
    </div>

</div>

@endsection

@push('scripts')
<script>
    function toggleFaqItem(triggerEl) {
        const item = triggerEl.closest('.faq-accordion-item');
        if (item) {
            item.classList.toggle('active');
        }
    }
</script>
@endpush
