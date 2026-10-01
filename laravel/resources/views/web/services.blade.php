@extends('web.layouts.public')

@section('title', 'All Services & Workforce Categories — Shram Sarathi Network')
@section('meta_description', 'Discover all 7 service categories on Shram Sarathi Network: Labour, Skilled Workers, Drivers, Commercial Vehicles, Contractors, Construction Materials, and Agriculture Materials.')

@push('styles')
<style>
    .services-hero {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        position: relative;
        border-bottom: 3px solid var(--orange);
    }
    .services-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
    }
    .services-hero h1 span {
        color: var(--orange);
    }
    .services-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.85);
        max-width: 760px;
        margin: 0 auto;
        line-height: 1.6;
    }

    .services-page-wrap {
        max-width: 1240px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .category-section-card {
        background: #ffffff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        padding: 32px;
        margin-bottom: 36px;
        transition: transform 0.25s, box-shadow 0.25s;
    }
    .category-section-card:hover {
        box-shadow: var(--shadow-md);
        border-color: rgba(249,115,22,0.4);
    }
    .category-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #f1f5f9;
    }
    .category-header-left {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    .category-header-icon {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        color: #fff;
    }
    .category-header-titles h2 {
        font-size: 1.4rem;
        font-weight: 900;
        color: var(--navy);
        margin: 0 0 4px;
    }
    .category-header-titles span {
        font-size: 0.88rem;
        color: #64748b;
        font-weight: 600;
    }

    .subtrade-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 14px;
        margin-bottom: 22px;
    }
    .subtrade-item {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.2s;
    }
    .subtrade-item:hover {
        background: #eff6ff;
        border-color: #93c5fd;
        transform: translateY(-2px);
    }
    .subtrade-item i {
        color: var(--orange);
        font-size: 1rem;
    }
    .subtrade-item span {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--navy);
    }

    .category-footer-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        background: #f8fafc;
        padding: 14px 20px;
        border-radius: 10px;
    }
    .category-rate-note {
        font-size: 0.85rem;
        color: #475569;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .category-rate-note strong {
        color: var(--orange-dark);
    }
</style>
@endpush

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<section class="services-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-layer-group"></i> सम्पूर्ण सेवा निर्देशिका • Comprehensive Service Directory
        </span>
        <h1>7 Core <span>Service Categories</span></h1>
        <p>
            मजदूर, कुशल कारीगर, ड्राइवर, वाहन, ठेकेदार व निर्माण-कृषि सामग्री — हर आवश्यकता के लिए सत्यापित कामगार और विश्वसनीय सप्लायर्स।
        </p>
    </div>
</section>

<!-- ─── Services Directory Container ─────────────────────────────────── -->
<div class="services-page-wrap">

    <!-- 1. Labour -->
    <div class="category-section-card" id="labour">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                    <i class="fa-solid fa-person-digging"></i>
                </div>
                <div class="category-header-titles">
                    <h2>1. मजदूर (Labour Network)</h2>
                    <span>Construction, Loading, Agriculture, Digging, Cleaning & General Unskilled Work</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                मजदूर बुक करें / Book Labour <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-trowel"></i><span>भवन निर्माण मजदूर (Building)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-boxes-stacked"></i><span>लोडिंग व अनलोडिंग (Loading)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-wheat-awn"></i><span>कृषि व बागवानी मजदूर (Agri)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-shovel"></i><span>गड्ढा खुदाई व मिट्टी कार्य (Digging)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-broom"></i><span>साइट सफाई व मलबा हटाना (Cleaning)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck-ramp-box"></i><span>गोदाम व वेयरहाउस श्रमिक</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-clock"></i><span>हाफ डे मजदूर (4 घंटे)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-calendar-day"></i><span>फुल डे मजदूर (8 घंटे)</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>शुल्क: <strong>ग्राहक बुकिंग शुल्क ₹20/दिन</strong> | कामगार मजदूरी: <strong>पारस्परिक सहमति (Negotiable)</strong></span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <!-- 2. Skilled Worker -->
    <div class="category-section-card" id="skilled-worker">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #0284c7, #0369a1);">
                    <i class="fa-solid fa-wrench"></i>
                </div>
                <div class="category-header-titles">
                    <h2>2. कुशल कारीगर / मिस्त्री (Skilled Worker)</h2>
                    <span>Certified Plumbers, Electricians, Carpenters, Painters, Masons & Technicians</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                कारीगर खोजें / Book Skilled <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-trowel-bricks"></i><span>राजमिस्त्री (Mason / Mistri)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-bolt"></i><span>इलेक्ट्रीशियन (Electrician)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-faucet-drip"></i><span>प्लंबर (Plumber)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-hammer"></i><span>बढ़ई (Carpenter)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-paint-roller"></i><span>पेंटर (Painter & Whitewash)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-fire-burner"></i><span>वेल्डर व फैब्रिकेटर (Welder)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-border-all"></i><span>टाइल्स व मार्बल मिस्त्री</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-screwdriver"></i><span>पीओपी व फॉल्स सीलिंग कारीगर</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>शुल्क: <strong>ग्राहक बुकिंग शुल्क ₹25/दिन</strong> | कारीगर पारिश्रमिक: <strong>पारस्परिक सहमति (Negotiable)</strong></span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <!-- 3. Driver -->
    <div class="category-section-card" id="driver">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #10b981, #047857);">
                    <i class="fa-solid fa-id-card"></i>
                </div>
                <div class="category-header-titles">
                    <h2>3. चालक / ड्राइवर (Driver Network)</h2>
                    <span>Experienced Private Car, Commercial, Taxi, Tractor & Heavy Machinery Drivers</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                ड्राइवर बुक करें / Book Driver <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-car-side"></i><span>प्राइवेट कार चालक (Personal Chauffeur)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-taxi"></i><span>टैक्सी व कैब ड्राइवर</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck"></i><span>कमर्शियल व गुड्स ड्राइवर (Truck/Pickup)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-tractor"></i><span>ट्रैक्टर व कृषि वाहन चालक</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck-front"></i><span>जेसीबी व क्रेन ऑपरेटर</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-route"></i><span>आउटस्टेशन व लॉन्ग रूट ड्राइवर</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>शुल्क: <strong>ग्राहक बुकिंग शुल्क ₹25/दिन</strong> | मासिक: <strong>₹600/माह</strong> | 0% वेतन कटौती</span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <!-- 4. Commercial Vehicles & Transport -->
    <div class="category-section-card" id="transport">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #0d9488, #0f766e);">
                    <i class="fa-solid fa-truck-moving"></i>
                </div>
                <div class="category-header-titles">
                    <h2>4. व्यावसायिक वाहन (Vehicle & Transport)</h2>
                    <span>Taxi, Cab, Auto, Loader, Pickup, Mini-Truck & Freight Goods Transportation</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                वाहन खोजें / Book Vehicle <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-car"></i><span>लोकल व आउटस्टेशन टैक्सी / सेडान / एसयूवी</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck-pickup"></i><span>छोटा हाथी व पिकअप (Tata Ace / Bolero)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck-ramp-box"></i><span>लोडर व माल वाहक टेम्पो</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-van-shuttle"></i><span>ट्रैवलर व शादी-विवाह बुकिंग बस</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck-plane"></i><span>एयरपोर्ट ड्रॉप व पिकअप कैब</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-truck"></i><span>भारी मालवाहक ट्रक व कंटेनर</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>कमीशन (वाहन मालिक द्वारा देय): <strong>तत्काल 10%</strong> | <strong>अग्रिम 12%</strong></span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <!-- 5. Contractor -->
    <div class="category-section-card" id="contractor">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #7c3aed, #6d28d9);">
                    <i class="fa-solid fa-helmet-safety"></i>
                </div>
                <div class="category-header-titles">
                    <h2>5. ठेकेदार (Contractor Network)</h2>
                    <span>Turnkey Construction, Civil Engineering, Renovation, Painting & Special Projects</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                ठेकेदार खोजें / Find Contractor <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-building"></i><span>मकान निर्माण ठेकेदार (House Construction)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-compass-drafting"></i><span>सिविल वर्क व नींव कार्य</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-brush"></i><span>पेंटिंग व पुताई ठेका</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-couch"></i><span>इंटीरियर डेकोरेशन व मॉड्यूलर किचन</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-sun"></i><span>सोलर पैनल इंस्टालेशन कॉन्ट्रैक्ट</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-bell-concierge"></i><span>इवेंट व कैटरिंग ठेका</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>कमीशन (ठेकेदार द्वारा देय): <strong>स्वीकृत अनुबंध राशि पर 3%</strong> | ग्राहक के लिए <strong>0% कमीशन</strong></span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <!-- 6. Construction Material -->
    <div class="category-section-card" id="construction-material">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #0d9488, #14b8a6);">
                    <i class="fa-solid fa-trowel-bricks"></i>
                </div>
                <div class="category-header-titles">
                    <h2>6. निर्माण सामग्री (Construction Material)</h2>
                    <span>Sand, Red Morang, Cement, TMT Rebar, Bricks, Gravel, Tiles & Paints</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                सामग्री कोटेशन पाएं <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-mountain"></i><span>बालू / रेत (Fine & Coarse Sand)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-cubes"></i><span>लाल मौरंग (Red Morang)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-layer-group"></i><span>सीमेंट (All Standard Brands)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-bars-staggered"></i><span>टीएमटी सरिया (TMT Rebar 8mm to 25mm)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-square"></i><span>लाल ईंट व फ्लाई ऐश ब्रिक्स (Bricks)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-gem"></i><span>गिट्टी व रोड़ी (Aggregates)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-table-cells"></i><span>टाइल्स, मार्बल व ग्रेनाइट</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-paint-roller"></i><span>पेंट, प्राइमर व पुट्टी</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>सप्लायर डीलिंग: <strong>सीधे थोक व बाजार दर पर</strong> | प्लेटफ़ॉर्म शुल्क: <strong>0% कमीशन</strong></span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <!-- 7. Agriculture Material -->
    <div class="category-section-card" id="agriculture-material">
        <div class="category-header">
            <div class="category-header-left">
                <div class="category-header-icon" style="background: linear-gradient(135deg, #65a30d, #84cc16);">
                    <i class="fa-solid fa-wheat-awn"></i>
                </div>
                <div class="category-header-titles">
                    <h2>7. कृषि सामग्री (Agriculture Material)</h2>
                    <span>Certified Hybrid Seeds, Fertilizers, Pesticides, Irrigation Equipment & Cattle Feed</span>
                </div>
            </div>
            <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 10px 20px; font-size: 0.88rem;">
                कृषि आपूर्ति ऑर्डर करें <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <div class="subtrade-grid">
            <div class="subtrade-item"><i class="fa-solid fa-seedling"></i><span>प्रमाणित उन्नत बीज (Certified Seeds)</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-sack-dollar"></i><span>यूरिया, डीएपी व रासायनिक खाद</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-leaf"></i><span>जैविक खाद व वर्मीकम्पोस्ट</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-spray-can"></i><span>कीटनाशक व फफूंदनाशक दवाएं</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-droplet"></i><span>सिंचाई पाइप, डिलीवरी होज व मोटर</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-tractor"></i><span>स्प्रेयर मशीन व कृषि यंत्र</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-cow"></i><span>पशु आहार, चोकर व पोषण सप्लीमेंट</span></div>
            <div class="subtrade-item"><i class="fa-solid fa-shield-virus"></i><span>फसल सुरक्षा उत्पाद</span></div>
        </div>

        <div class="category-footer-actions">
            <div class="category-rate-note">
                <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                <span>किसानों के लिए: <strong>उचित एमआरपी व डीलर दर</strong> | प्लेटफ़ॉर्म शुल्क: <strong>0% कमीशन</strong></span>
            </div>
            <a href="{{ route('web.pricing') }}" style="font-size: 0.85rem; font-weight: 700; color: var(--navy); text-decoration: underline;">रेट कार्ड देखें ➔</a>
        </div>
    </div>

</div>

@endsection
