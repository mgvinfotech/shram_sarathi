@extends('web.layouts.public')

@section('title', 'Blog & Knowledge Center — Shram Sarathi Network')
@section('meta_description', 'Official news, guides, worker stories, and construction/agriculture insights from Shram Sarathi Network (श्रम सारथी नेटवर्क).')

@push('styles')
<style>
    .blog-hero {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        color: #fff;
        padding: 60px 24px 70px;
        text-align: center;
        border-bottom: 3px solid var(--orange);
    }
    .blog-hero h1 {
        font-size: clamp(2rem, 3.8vw, 2.9rem);
        font-weight: 900;
        margin-bottom: 12px;
    }
    .blog-hero h1 span { color: var(--orange); }
    .blog-hero p {
        font-size: 1.05rem;
        color: rgba(255, 255, 255, 0.85);
        max-width: 720px;
        margin: 0 auto;
    }

    .blog-container {
        max-width: 1200px;
        margin: -35px auto 80px;
        padding: 0 20px;
        position: relative;
        z-index: 5;
    }

    .blog-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 26px;
    }
    .blog-card {
        background: #ffffff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        transition: transform 0.25s, box-shadow 0.25s;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .blog-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-md);
        border-color: rgba(249,115,22,0.4);
    }
    .blog-card-media {
        height: 200px;
        background: #0b192c;
        position: relative;
        overflow: hidden;
    }
    .blog-card-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.4s ease;
    }
    .blog-card:hover .blog-card-media img {
        transform: scale(1.04);
    }
    .blog-tag {
        position: absolute;
        top: 12px;
        left: 12px;
        background: rgba(7, 17, 30, 0.85);
        color: #fed7aa;
        font-size: 0.75rem;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 6px;
        backdrop-filter: blur(4px);
    }
    .blog-card-body {
        padding: 24px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .blog-date {
        font-size: 0.8rem;
        color: #94a3b8;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .blog-card-body h3 {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--navy);
        line-height: 1.4;
        margin: 0 0 10px;
    }
    .blog-card-body p {
        font-size: 0.88rem;
        color: #64748b;
        line-height: 1.6;
        margin: 0 0 18px;
    }
    .blog-read-more {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--orange-dark);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
    }
</style>
@endpush

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<section class="blog-hero">
    <div style="max-width: 900px; margin: 0 auto;">
        <span class="hero-pill primary" style="background: rgba(249, 115, 22, 0.2); color: #fed7aa; border: 1px solid rgba(249, 115, 22, 0.4); margin-bottom: 14px;">
            <i class="fa-solid fa-newspaper"></i> ज्ञान व मार्गदर्शन • Knowledge &amp; Insights
        </span>
        <h1>Blog &amp; <span>Knowledge Center</span></h1>
        <p>
            मजदूर बुकिंग टिप्स, निर्माण सामग्री गाइड, कुशल कारीगर सलाह और श्रम सारथी नेटवर्क की नवीनतम घोषणाएं।
        </p>
    </div>
</section>

<!-- ─── Blog Container ───────────────────────────────────────────────── -->
<div class="blog-container">

    <div class="blog-grid">
        <!-- Article 1 -->
        <article class="blog-card">
            <div class="blog-card-media">
                <img src="{{ asset('images/web_banners/page8_about_us.jpg') }}" alt="Fair Wages Guide" loading="lazy">
                <span class="blog-tag">श्रम नियम व दरें</span>
            </div>
            <div class="blog-card-body">
                <div>
                    <div class="blog-date"><i class="fa-regular fa-calendar"></i> सितम्बर 2026</div>
                    <h3>घर निर्माण के लिए सही मजदूर व कारीगर का चयन कैसे करें?</h3>
                    <p>मकान निर्माण या मरम्मत में कुशल राजमिस्त्री, बढ़ई और प्लंबर का सही चयन समय और बजट की भारी बचत कराता है। जानिए आवश्यक बातें।</p>
                </div>
                <a href="{{ url('/#inquiry') }}" class="blog-read-more">सेवा बुक करें <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </article>

        <!-- Article 2 -->
        <article class="blog-card">
            <div class="blog-card-media">
                <img src="{{ asset('images/web_banners/slide4_contractor.jpg') }}" alt="Contractor Guide" loading="lazy">
                <span class="blog-tag">ठेकेदार गाइड</span>
            </div>
            <div class="blog-card-body">
                <div>
                    <div class="blog-date"><i class="fa-regular fa-calendar"></i> सितम्बर 2026</div>
                    <h3>सिविल वर्क व पेंटिंग ठेके में पारदर्शी अनुबंध का महत्व</h3>
                    <p>श्रम सारथी नेटवर्क पर मात्र 3% प्लेटफ़ॉर्म कमीशन के साथ सीधे ठेकेदार खोजें और लिखित शर्तों पर निश्चिंत होकर कार्य कराएं।</p>
                </div>
                <a href="{{ route('web.pricing') }}" class="blog-read-more">रेट कार्ड देखें <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </article>

        <!-- Article 3 -->
        <article class="blog-card">
            <div class="blog-card-media">
                <img src="{{ asset('images/web_banners/slide6_taxi_transport.jpg') }}" alt="Commercial Transport" loading="lazy">
                <span class="blog-tag">परिवहन व वाहन</span>
            </div>
            <div class="blog-card-body">
                <div>
                    <div class="blog-date"><i class="fa-regular fa-calendar"></i> सितम्बर 2026</div>
                    <h3>माल ढुलाई के लिए सही पिकअप और लोडर कैसे चुनें?</h3>
                    <p>सामान की सुरक्षित ढुलाई के लिए छोटा हाथी, बोलेरो पिकअप और भारी ट्रकों की तत्काल व अग्रिम बुकिंग के उपयोगी सुझाव।</p>
                </div>
                <a href="{{ url('/#inquiry') }}" class="blog-read-more">वाहन बुक करें <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        </article>
    </div>

</div>

@endsection
