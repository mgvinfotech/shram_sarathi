@extends('web.layouts.public')

@section('title', 'Page Not Found (404) — Shram Sarathi Network')
@section('meta_description', 'The page you are looking for was not found on Shram Sarathi Network. Explore our 7 core service categories or contact support.')

@push('styles')
<style>
    .error-hero {
        padding: 90px 24px 100px;
        text-align: center;
        background: #ffffff;
    }
    .error-code {
        font-size: clamp(5rem, 12vw, 8rem);
        font-weight: 900;
        color: var(--orange);
        line-height: 1;
        letter-spacing: -2px;
        margin-bottom: 12px;
    }
    .error-hero h1 {
        font-size: clamp(1.8rem, 3.2vw, 2.4rem);
        font-weight: 900;
        color: var(--navy);
        margin-bottom: 12px;
    }
    .error-hero p {
        font-size: 1.05rem;
        color: #64748b;
        max-width: 620px;
        margin: 0 auto 32px;
        line-height: 1.6;
    }
    .error-actions {
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
    }
</style>
@endpush

@section('content')

<section class="error-hero">
    <div style="max-width: 800px; margin: 0 auto;">
        <div class="error-code">404</div>
        <span class="hero-pill primary" style="background: var(--orange-light); color: var(--orange-dark); margin-bottom: 14px;">
            <i class="fa-solid fa-triangle-exclamation"></i> पृष्ठ उपलब्ध नहीं है • Page Not Found
        </span>
        <h1>पृष्ठ नहीं मिला / Page Not Found</h1>
        <p>
            आप जिस पृष्ठ की तलाश कर रहे हैं वह स्थानांतरित कर दिया गया है या मौजूद नहीं है। आप मुख्य पृष्ठ पर जा सकते हैं अथवा हमारी सेवाओं का अन्वेषण कर सकते हैं।
        </p>

        <div class="error-actions">
            <a href="{{ route('web.home') }}" class="slide-btn primary" style="padding: 14px 28px;">
                <i class="fa-solid fa-house"></i> मुख्य पृष्ठ पर जाएं / Go Home
            </a>
            <a href="{{ route('web.services') }}" class="slide-btn secondary" style="background: var(--navy); color: #fff; border: none; padding: 14px 28px;">
                <i class="fa-solid fa-layer-group"></i> सेवाएं देखें / Explore Services
            </a>
            <a href="tel:+917084900909" class="slide-btn secondary" style="background: #f1f5f9; color: var(--navy); border: 1px solid #cbd5e1; padding: 14px 28px;">
                <i class="fa-solid fa-phone"></i> सहायता: +91 7084900909
            </a>
        </div>
    </div>
</section>

@endsection
