@extends('web.layouts.public')

@section('title', 'Affordable & Transparent Pricing — Shram Sarathi Network')
@section('meta_description', 'Official rate card of Shram Sarathi Network (श्रम सारथी नेटवर्क). Transparent customer booking fees (Labour ₹20, Karigar ₹25, Driver ₹25), 0% deduction from workers, fair vehicle commissions.')

@push('styles')
<style>
    .pricing-hero {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        position: relative;
        border-bottom: 3px solid var(--orange);
    }
    .pricing-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
    }
    .pricing-hero h1 span {
        color: var(--orange);
    }
    .pricing-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.85);
        max-width: 760px;
        margin: 0 auto;
        line-height: 1.6;
    }

    .pricing-container {
        max-width: 1200px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .pricing-pill-banner {
        background: #ffffff;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        padding: 24px 30px;
        border: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 36px;
    }
    .pricing-pill-item {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .pricing-pill-item i {
        font-size: 1.8rem;
        color: var(--orange);
    }
    .pricing-pill-item h4 {
        font-size: 0.95rem;
        font-weight: 800;
        color: var(--navy);
        margin: 0 0 2px;
    }
    .pricing-pill-item p {
        font-size: 0.82rem;
        color: #64748b;
        margin: 0;
    }

    /* Pricing Tables & Cards */
    .rate-section {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-lg);
        padding: 32px;
        margin-bottom: 32px;
        box-shadow: var(--shadow-sm);
    }
    .rate-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid #f1f5f9;
    }
    .rate-section-title {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .rate-section-title i {
        font-size: 1.6rem;
    }
    .rate-section-title h2 {
        font-size: 1.35rem;
        font-weight: 900;
        color: var(--navy);
        margin: 0;
    }
    .rate-section-title span {
        display: block;
        font-size: 0.82rem;
        color: #64748b;
        font-weight: 600;
    }

    .table-responsive {
        overflow-x: auto;
    }
    .custom-rate-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.92rem;
    }
    .custom-rate-table th {
        background: #0b192c;
        color: #fff;
        padding: 14px 18px;
        font-weight: 700;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .custom-rate-table td {
        padding: 16px 18px;
        border-bottom: 1px solid #e2e8f0;
        color: #334155;
        vertical-align: middle;
    }
    .custom-rate-table tr:hover td {
        background: #f8fafc;
    }

    .tag-free {
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        font-weight: 800;
        font-size: 0.78rem;
        padding: 4px 10px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .tag-fee {
        background: #fff7ed;
        color: #9a3412;
        border: 1px solid #fed7aa;
        font-weight: 800;
        font-size: 0.78rem;
        padding: 4px 10px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .tag-comm {
        background: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
        font-weight: 800;
        font-size: 0.78rem;
        padding: 4px 10px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .legal-box {
        background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
        border: 1.5px solid #cbd5e1;
        border-left: 6px solid var(--orange);
        border-radius: var(--radius-md);
        padding: 22px 26px;
        margin-top: 36px;
    }
    .legal-box h4 {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--navy);
        margin: 0 0 8px;
    }
    .legal-box p {
        font-size: 0.88rem;
        color: #475569;
        line-height: 1.65;
        margin: 0 0 8px;
    }
    .legal-box p:last-child {
        margin: 0;
    }
</style>
@endpush

@section('content')

<!-- ─── Pricing Hero ─────────────────────────────────────────────────── -->
<section class="pricing-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-scale-balanced"></i> आधिकारिक दर सूची • Official Rate Card
        </span>
        <h1>Affordable & <span>Transparent Pricing</span></h1>
        <p>
            श्रम सारथी नेटवर्क — पारस्परिक सहमति व निष्पक्ष शुल्क संरचना। कामगारों के मेहनताने से 0% कटौती और ग्राहकों के लिए न्यूनतम पारदर्शी बुकिंग शुल्क।
        </p>
    </div>
</section>

<!-- ─── Pricing Container ────────────────────────────────────────────── -->
<div class="pricing-container">

    <!-- Overview Pill Bar -->
    <div class="pricing-pill-banner">
        <div class="pricing-pill-item">
            <i class="fa-solid fa-handshake"></i>
            <div>
                <h4>Mutual Agreement / Negotiable</h4>
                <p>मजदूरी ग्राहक और कामगार की आपसी सहमति पर</p>
            </div>
        </div>
        <div class="pricing-pill-item">
            <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
            <div>
                <h4>Zero Worker Deductions (0%)</h4>
                <p>श्रमिक को मिलता है 100% पूरा पारिश्रमिक</p>
            </div>
        </div>
        <div class="pricing-pill-item">
            <i class="fa-solid fa-receipt" style="color: #0284c7;"></i>
            <div>
                <h4>Nominal Booking Fees</h4>
                <p>₹20 – ₹25 प्रति दिन / ₹500 – ₹600 मासिक</p>
            </div>
        </div>
        <div class="pricing-pill-item">
            <i class="fa-solid fa-shield-halved" style="color: #8b5cf6;"></i>
            <div>
                <h4>Registered MSME Enterprise</h4>
                <p>M/S Shram Sarathi Network Govt. Guidelines</p>
            </div>
        </div>
    </div>

    <!-- 1. Labour Rate Card -->
    <div class="rate-section" id="labour-rates">
        <div class="rate-section-header">
            <div class="rate-section-title">
                <i class="fa-solid fa-person-digging" style="color: #f59e0b;"></i>
                <div>
                    <h2>1. मजदूर (Labour)</h2>
                    <span>Construction, loading, agriculture, digging, cleaning & general labour</span>
                </div>
            </div>
            <span class="tag-free"><i class="fa-solid fa-check"></i> 0% मजदूरी कटौती</span>
        </div>

        <div class="table-responsive">
            <table class="custom-rate-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">सेवा विवरण (Description)</th>
                        <th style="width: 25%;">दैनिक बुकिंग शुल्क (Customer)</th>
                        <th style="width: 25%;">मासिक बुकिंग शुल्क (Customer)</th>
                        <th style="width: 25%;">कामगार पारिश्रमिक (Wages)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>सामान्य अकुशल मजदूर</strong><br>
                            <small style="color: #64748b;">फुल डे (8 घंटे) या हाफ डे (4 घंटे)</small>
                        </td>
                        <td>
                            <span class="tag-fee">₹20 / दिन</span><br>
                            <small style="color: #64748b;">(ग्राहक द्वारा देय सुविधा शुल्क)</small>
                        </td>
                        <td>
                            <span class="tag-fee">₹500 / माह</span><br>
                            <small style="color: #64748b;">(नियमित मासिक सेवा)</small>
                        </td>
                        <td>
                            <strong style="color: var(--orange-dark);">पारस्परिक सहमति (Negotiable)</strong><br>
                            <span class="tag-free"><i class="fa-solid fa-shield-check"></i> ₹0 प्लेटफॉर्म कटौती (100% श्रमिक को)</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p style="margin-top: 14px; font-size: 0.85rem; color: #64748b;">
            <i class="fa-solid fa-circle-info"></i> <em>नोट:</em> कार्य स्थल, समय और प्रकार के अनुसार ग्राहक और मजदूर आपस में बात करके प्रतिदिन या प्रति कार्य की मजदूरी तय करते हैं। श्रम सारथी नेटवर्क केवल न्यूनतम डिजिटल सुविधा शुल्क लेता है।
        </p>
    </div>

    <!-- 2. Skilled Worker Rate Card -->
    <div class="rate-section" id="skilled-rates">
        <div class="rate-section-header">
            <div class="rate-section-title">
                <i class="fa-solid fa-wrench" style="color: #0284c7;"></i>
                <div>
                    <h2>2. कुशल कारीगर / मिस्त्री (Skilled Worker)</h2>
                    <span>Plumber, Electrician, Carpenter, Mason (राजमिस्त्री), Painter, Welder, Fabricator</span>
                </div>
            </div>
            <span class="tag-free"><i class="fa-solid fa-check"></i> 0% कारीगर कटौती</span>
        </div>

        <div class="table-responsive">
            <table class="custom-rate-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">कारीगर श्रेणी (Trade)</th>
                        <th style="width: 25%;">दैनिक बुकिंग शुल्क (Customer)</th>
                        <th style="width: 25%;">मासिक बुकिंग शुल्क (Customer)</th>
                        <th style="width: 25%;">कारीगर दर (Work Rate)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>राजमिस्त्री (Mason), बढ़ई (Carpenter), पेंटर, प्लंबर, इलेक्ट्रीशियन, वेल्डर</strong>
                        </td>
                        <td>
                            <span class="tag-fee">₹25 / दिन</span><br>
                            <small style="color: #64748b;">(ग्राहक द्वारा देय सुविधा शुल्क)</small>
                        </td>
                        <td>
                            <span class="tag-fee">₹600 / माह</span><br>
                            <small style="color: #64748b;">(मासिक अनुबंध / कार्य)</small>
                        </td>
                        <td>
                            <strong style="color: var(--orange-dark);">पारस्परिक सहमति / मोलभाव आधारित</strong><br>
                            <span class="tag-free"><i class="fa-solid fa-shield-check"></i> 0% कटौती (पूरा मेहनताना कारीगर का)</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p style="margin-top: 14px; font-size: 0.85rem; color: #64748b;">
            <i class="fa-solid fa-circle-info"></i> <em>नोट:</em> विजिट या काम के अनुसार कारीगर और ग्राहक सीधे मिलकर काम का दायरा व पारिश्रमिक तय करते हैं।
        </p>
    </div>

    <!-- 3. Driver Rate Card -->
    <div class="rate-section" id="driver-rates">
        <div class="rate-section-header">
            <div class="rate-section-title">
                <i class="fa-solid fa-id-card" style="color: #10b981;"></i>
                <div>
                    <h2>3. चालक / ड्राइवर (Driver)</h2>
                    <span>Car, Taxi, Commercial Vehicle, Tractor, JCB & Heavy Machinery Driver</span>
                </div>
            </div>
            <span class="tag-free"><i class="fa-solid fa-check"></i> 0% चालक कटौती</span>
        </div>

        <div class="table-responsive">
            <table class="custom-rate-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">ड्राइवर प्रकार (Category)</th>
                        <th style="width: 25%;">दैनिक बुकिंग शुल्क (Customer)</th>
                        <th style="width: 25%;">मासिक बुकिंग शुल्क (Customer)</th>
                        <th style="width: 25%;">ड्राइवर वेतन (Salary / Fare)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>प्राइवेट कार चालक, कमर्शियल ड्राइवर, जेसीबी/क्रेन ऑपरेटर</strong>
                        </td>
                        <td>
                            <span class="tag-fee">₹25 / दिन</span><br>
                            <small style="color: #64748b;">(ग्राहक द्वारा देय सुविधा शुल्क)</small>
                        </td>
                        <td>
                            <span class="tag-fee">₹600 / माह</span><br>
                            <small style="color: #64748b;">(मासिक परमानेंट/अस्थायी चालक)</small>
                        </td>
                        <td>
                            <strong style="color: var(--orange-dark);">पारस्परिक सहमति / Negotiable</strong><br>
                            <span class="tag-free"><i class="fa-solid fa-shield-check"></i> 0% कटौती (ड्राइवर को 100% वेतन)</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 4. Commercial Vehicles Rate Card -->
    <div class="rate-section" id="vehicle-rates">
        <div class="rate-section-header">
            <div class="rate-section-title">
                <i class="fa-solid fa-truck-moving" style="color: #0d9488;"></i>
                <div>
                    <h2>4. व्यावसायिक वाहन (Commercial Vehicles & Transport)</h2>
                    <span>Taxi, Cab, Auto, E-Rickshaw, Pickup, Loader, Mini Truck & Freight Transport</span>
                </div>
            </div>
            <span class="tag-comm"><i class="fa-solid fa-percent"></i> वाहन मालिक कमीशन मॉडल</span>
        </div>

        <div class="table-responsive">
            <table class="custom-rate-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">बुकिंग प्रकार (Booking Type)</th>
                        <th style="width: 25%;">सवारी / ग्राहक किराया</th>
                        <th style="width: 25%;">प्लेटफॉर्म कमीशन (वाहन मालिक द्वारा देय)</th>
                        <th style="width: 25%;">सुविधा विवरण</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>तत्काल वाहन बुकिंग (Immediate Booking)</strong><br>
                            <small style="color: #64748b;">लोकल टैक्सी, ऑटो, लोडर, पिकअप</small>
                        </td>
                        <td>
                            <strong style="color: var(--navy);">मीटर / पारस्परिक सहमति दर</strong>
                        </td>
                        <td>
                            <span class="tag-comm">10% कमीशन</span><br>
                            <small style="color: #64748b;">(ट्रिप भाड़े पर वाहन मालिक द्वारा देय)</small>
                        </td>
                        <td>तुरंत वाहन आवंटन, जीपीएस ट्रैकिंग सहायता</td>
                    </tr>
                    <tr>
                        <td>
                            <strong>अग्रिम वाहन बुकिंग (Advance Booking)</strong><br>
                            <small style="color: #64748b;">टूर, शादी-विवाह, आउटस्टेशन, एयरपोर्ट</small>
                        </td>
                        <td>
                            <strong style="color: var(--navy);">पारस्परिक सहमति कोटेशन</strong>
                        </td>
                        <td>
                            <span class="tag-comm">12% कमीशन</span><br>
                            <small style="color: #64748b;">(कुल ट्रिप भाड़े पर वाहन मालिक द्वारा देय)</small>
                        </td>
                        <td>निश्चित समय पर वाहन उपलब्धता की गारंटी</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 5. Contractor Rate Card -->
    <div class="rate-section" id="contractor-rates">
        <div class="rate-section-header">
            <div class="rate-section-title">
                <i class="fa-solid fa-helmet-safety" style="color: #7c3aed;"></i>
                <div>
                    <h2>5. ठेकेदार (Contractor)</h2>
                    <span>Building Construction, Civil Works, Renovation, Painting Contract & Projects</span>
                </div>
            </div>
            <span class="tag-comm"><i class="fa-solid fa-handshake"></i> प्रोजेक्ट अनुबंध</span>
        </div>

        <div class="table-responsive">
            <table class="custom-rate-table">
                <thead>
                    <tr>
                        <th style="width: 30%;">सेवा प्रकार (Service Type)</th>
                        <th style="width: 35%;">अनुबंध राशि (Contract Value)</th>
                        <th style="width: 35%;">प्लेटफॉर्म कमीशन (ठेकेदार द्वारा देय)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>मकान निर्माण, सिविल वर्क, पुताई, इंटीरियर व रीनोवेशन</strong>
                        </td>
                        <td>
                            <strong style="color: var(--orange-dark);">पारस्परिक सहमति / निविदा आधारित कोटेशन</strong><br>
                            <small style="color: #64748b;">ग्राहक और ठेकेदार के बीच सीधा एग्रीमेंट</small>
                        </td>
                        <td>
                            <span class="tag-comm">3% कमीशन</span><br>
                            <small style="color: #64748b;">(स्वीकृत कुल अनुबंध राशि पर ठेकेदार द्वारा देय)</small><br>
                            <span class="tag-free" style="margin-top: 4px;"><i class="fa-solid fa-check"></i> ग्राहक के लिए 0% कमीशन</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- 6 & 7. Construction & Agri Materials Rate Card -->
    <div class="rate-section" id="material-rates">
        <div class="rate-section-header">
            <div class="rate-section-title">
                <i class="fa-solid fa-trowel-bricks" style="color: #0d9488;"></i>
                <div>
                    <h2>6 & 7. निर्माण सामग्री एवं कृषि सामग्री (Building & Agri Materials)</h2>
                    <span>बालू, मौरंग, सीमेंट, सरिया, ईंट, गिट्टी, उन्नत बीज, खाद (यूरिया/डीएपी), कीटनाशक व उपकरण</span>
                </div>
            </div>
            <span class="tag-free"><i class="fa-solid fa-tag"></i> 0% सप्लायर कमीशन</span>
        </div>

        <div class="table-responsive">
            <table class="custom-rate-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">श्रेणी (Category)</th>
                        <th style="width: 35%;">प्रमुख सामग्री (Key Items)</th>
                        <th style="width: 20%;">मूल्य निर्धारण (Pricing)</th>
                        <th style="width: 20%;">प्लेटफ़ॉर्म शुल्क</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>निर्माण सामग्री (Construction Material)</strong></td>
                        <td>बालू, मौरंग, सीमेंट, सरिया, ईंट, गिट्टी, रोड़ी, टाइल्स, मार्बल, पेंट</td>
                        <td>सीधे सप्लायर / थोक बाजार दर (Market Rates)</td>
                        <td><span class="tag-free">0% कमीशन / Direct Connect</span></td>
                    </tr>
                    <tr>
                        <td><strong>कृषि सामग्री (Agriculture Material)</strong></td>
                        <td>उन्नत बीज, खाद (यूरिया/डीएपी/जैविक खाद), कीटनाशक, सिंचाई उपकरण, पशु आहार</td>
                        <td>उचित एमआरपी / सब्सिडी / डीलर दरें</td>
                        <td><span class="tag-free">0% कमीशन / Direct Connect</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Digital Intermediary Legal Notice -->
    <div class="legal-box">
        <h4><i class="fa-solid fa-shield-halved" style="color: var(--orange); margin-right: 8px;"></i> महत्वपूर्ण विधिक एवं परिचालन स्पष्टीकरण (Statutory Intermediary Notice)</h4>
        <p>
            <strong>1. डिजिटल मध्यस्थता मंच (Digital Intermediary):</strong> श्रम सारथी नेटवर्क (M/S Shram Sarathi Network, भारत सरकार एवं एमएसएमई दिशा-निर्देशों के अंतर्गत पंजीकृत उद्यम) एक डिजिटल सुविधा मंच है। यह मंच कामगारों, ठेकेदारों, वाहन मालिकों, सामग्री विक्रेताओं और ग्राहकों को सीधे जोड़ने का कार्य करता है।
        </p>
        <p>
            <strong>2. पारस्परिक सहमति व मोलभाव:</strong> सभी प्रकार के काम की मजदूरी, दैनिक दर, प्रोजेक्ट लागत और सामग्री का मूल्य ग्राहक और संबंधित प्रदाता के बीच आपसी बातचीत व सहमति से तय होता है।
        </p>
        <p>
            <strong>3. पारदर्शी भुगतान एवं रिफंड नीति:</strong> किसी विवाद या असंतोष की स्थिति में ग्राहक अथवा कामगार द्वारा दर्ज शिकायत की जांच के पश्चात स्वीकार्य रिफंड राशि एडमिन पैनल द्वारा सीधे उपयोगकर्ता के प्लेटफ़ॉर्म वॉलेट (Wallet) में क्रेडिट की जाती है।
        </p>
        <p>
            <strong>4. सहायता व संपर्क:</strong> शुल्क अथवा दरों संबंधी किसी भी स्पष्टीकरण के लिए हमारी आधिकारिक IVR हेल्पलाइन <strong>+91 7084900909</strong> अथवा ईमेल <strong>support@shramsarathinetwork.com</strong> पर संपर्क करें।
        </p>
    </div>

    <!-- Action Buttons -->
    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-top: 40px;">
        <a href="{{ url('/#inquiry') }}" class="slide-btn primary" style="padding: 14px 30px; font-size: 1rem;">
            <span>ऑनलाइन सेवा बुक करें / Book Service</span> <i class="fa-solid fa-arrow-right"></i>
        </a>
        <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="slide-btn secondary" style="background: var(--navy); border: 1px solid rgba(255,255,255,0.3); padding: 14px 30px; font-size: 1rem;">
            <i class="fa-brands fa-google-play"></i> <span>ऐप डाउनलोड करें</span>
        </a>
    </div>

</div>

@endsection
