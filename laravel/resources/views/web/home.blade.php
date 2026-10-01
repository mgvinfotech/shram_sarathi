@extends('web.layouts.public')

@section('title', 'Shram Sarathi Network — Right People for Every Work')
@section('meta_description', 'Shram Sarathi Network is a digital intermediary and service facilitation platform connecting customers with independent Labour, Skilled Workers, Drivers, Contractors, and Transport service providers across Sultanpur, UP and India.')

@push('styles')
<style>
    /* ─── Promotional Advertisement Slider (8 Visual Banners) ─── */
    .promo-slider {
        position: relative;
        background: var(--navy-dark);
        color: #fff;
        overflow: hidden;
        border-bottom: 3px solid var(--orange);
    }

    .slider-track {
        display: flex;
        transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        width: 100%;
    }

    .slide {
        min-width: 100%;
        min-height: 520px;
        box-sizing: border-box;
        display: flex;
        align-items: flex-end;
        justify-content: flex-start;
        position: relative;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        padding: 40px 36px 48px;
    }

    .slide__overlay {
        position: absolute;
        inset: 0;
        /* Subtle bottom vignette only — leaves center logo and banner graphics completely clean */
        background: linear-gradient(180deg, rgba(7,17,30,0) 0%, rgba(7,17,30,0.05) 30%, rgba(7,17,30,0.5) 68%, rgba(7,17,30,0.92) 100%);
        pointer-events: none;
    }

    .slide--center {
        justify-content: center;
        align-items: flex-end;
        padding-bottom: 42px;
    }

    .slide--center .slide__overlay {
        background: linear-gradient(180deg, rgba(7,17,30,0) 0%, rgba(7,17,30,0.05) 40%, rgba(7,17,30,0.55) 72%, rgba(7,17,30,0.92) 100%);
    }

    .slide__inner {
        max-width: 1240px;
        width: 100%;
        margin: 0 auto;
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-end;
    }

    .slide--center .slide__inner {
        justify-content: center;
        text-align: center;
    }

    /* Transparent content container with zero black/blue box strip */
    .slide__content-card {
        max-width: 820px;
        background: transparent;
        border: none;
        box-shadow: none;
        padding: 0;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }

    .slide--center .slide__content-card {
        max-width: 860px;
        text-align: center;
        margin: 0 auto;
    }

    @media (max-width: 860px) {
        .slide {
            min-height: 500px;
            padding: 20px 16px 36px;
            align-items: flex-end;
            background-position: center top;
        }
        .slide__overlay {
            background: linear-gradient(180deg, rgba(7,17,30,0) 0%, rgba(7,17,30,0.1) 25%, rgba(7,17,30,0.6) 60%, rgba(7,17,30,0.94) 100%);
        }
        .slide__content-card {
            max-width: 100%;
            padding: 0;
            background: transparent;
            border: none;
            box-shadow: none;
            backdrop-filter: none;
        }
        .slide__tag {
            font-size: 0.7rem;
            padding: 3px 10px;
            margin-bottom: 6px;
        }
        .slide__title {
            font-size: 1.25rem !important;
            line-height: 1.3;
            margin-bottom: 6px;
        }
        .slide__desc {
            font-size: 0.84rem !important;
            line-height: 1.45;
            margin-bottom: 12px;
        }
    }

    .slide__tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(249, 115, 22, 0.92);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding: 4px 14px;
        border-radius: 20px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }

    .slide__title {
        font-size: clamp(1.6rem, 3.2vw, 2.4rem);
        font-weight: 900;
        line-height: 1.25;
        letter-spacing: -0.5px;
        margin-bottom: 8px;
        color: #fff;
        text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.85);
    }

    .slide__title .highlight {
        color: #fed7aa;
        text-shadow: 0 2px 8px rgba(0,0,0,0.95);
    }

    .slide__desc {
        font-size: 0.95rem;
        color: #f8fafc;
        line-height: 1.6;
        margin-bottom: 18px;
        max-width: 780px;
        text-shadow: 0 1px 6px rgba(0,0,0,0.95), 0 2px 12px rgba(0,0,0,0.9);
    }

    .slide--center .slide__desc {
        margin-left: auto;
        margin-right: auto;
    }

    .slide__ctas {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }

    .slide--center .slide__ctas {
        justify-content: center;
    }

    .slide-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border-radius: var(--radius-sm);
        font-size: 0.925rem;
        font-weight: 700;
        transition: all 0.2s;
    }

    .slide-btn.primary {
        background: var(--orange);
        color: #fff;
        box-shadow: 0 4px 16px var(--orange-glow);
    }

    .slide-btn.primary:hover {
        background: var(--orange-dark);
        transform: translateY(-2px);
    }

    .slide-btn.secondary {
        background: rgba(255,255,255,0.15);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.3);
    }

    .slide-btn.secondary:hover {
        background: rgba(255,255,255,0.25);
    }

    /* Slider Controls */
    .slider-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(11,25,44,0.75);
        border: 1px solid rgba(255,255,255,0.25);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.15rem;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 10;
    }

    .slider-arrow:hover {
        background: var(--orange);
        border-color: var(--orange);
    }

    .slider-arrow.prev { left: 16px; }
    .slider-arrow.next { right: 16px; }

    .slider-dots {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 10;
    }

    .slider-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255,255,255,0.35);
        border: none;
        cursor: pointer;
        transition: all 0.25s;
    }

    .slider-dot.active {
        width: 30px;
        border-radius: 10px;
        background: var(--orange);
    }

    @media (max-width: 860px) {
        .slider-arrow {
            top: 28%;
            width: 34px;
            height: 34px;
            font-size: 0.9rem;
            background: rgba(7, 17, 30, 0.65);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.35);
        }
        .slider-arrow.prev { left: 8px; }
        .slider-arrow.next { right: 8px; }
        .slider-dots {
            bottom: 10px;
            gap: 6px;
        }
        .slider-dot {
            width: 8px;
            height: 8px;
        }
        .slider-dot.active {
            width: 20px;
            border-radius: 6px;
        }
    }

    /* ─── Hero Section ─────────────────────────────────────────────── */
    .hero {
        background: #ffffff;
        padding: 60px 24px 70px;
        border-bottom: 1px solid var(--card-border);
    }

    .hero__inner {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 40px;
        align-items: center;
    }

    @media (max-width: 960px) {
        .hero__inner {
            grid-template-columns: 1fr;
        }
    }

    .hero__badge-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .hero-pill {
        background: #f1f5f9;
        color: var(--navy);
        font-size: 0.8rem;
        font-weight: 700;
        padding: 5px 12px;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .hero-pill.primary {
        background: var(--orange-light);
        color: var(--orange-dark);
        border: 1px solid rgba(249,115,22,0.25);
    }

    .hero__headline {
        font-size: clamp(2.2rem, 4.5vw, 3.4rem);
        font-weight: 900;
        color: var(--navy);
        line-height: 1.12;
        letter-spacing: -0.5px;
        margin-bottom: 14px;
    }

    .hero__headline span.highlight {
        color: var(--orange);
        position: relative;
    }

    .hero__subheadline {
        font-size: 1.15rem;
        color: #475569;
        line-height: 1.6;
        margin-bottom: 24px;
        max-width: 620px;
    }

    .hero__quote-box {
        background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
        border: 1px solid #cbd5e1;
        border-left: 5px solid var(--orange);
        border-radius: var(--radius-md);
        padding: 16px 20px;
        margin-bottom: 28px;
    }

    .hero__quote-box p {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--navy);
        margin-bottom: 4px;
        font-family: 'Noto Sans Devanagari', sans-serif;
    }

    .hero__quote-box small {
        color: var(--text-muted);
        font-size: 0.825rem;
        font-weight: 600;
    }

    .hero__actions {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 28px;
    }

    .btn-hero-primary {
        background: var(--orange);
        color: #fff;
        padding: 14px 28px;
        border-radius: var(--radius-sm);
        font-size: 1rem;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 16px var(--orange-glow);
        transition: all 0.2s;
    }

    .btn-hero-primary:hover {
        background: var(--orange-dark);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(249,115,22,0.35);
        color: #fff;
    }

    .btn-hero-secondary {
        background: #fff;
        color: var(--navy);
        border: 2px solid var(--navy);
        padding: 14px 28px;
        border-radius: var(--radius-sm);
        font-size: 1rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
    }

    .btn-hero-secondary:hover {
        background: var(--navy);
        color: #fff;
    }

    .trust-strip {
        display: flex;
        align-items: center;
        gap: 18px;
        flex-wrap: wrap;
        padding-top: 18px;
        border-top: 1px solid var(--card-border);
        font-size: 0.825rem;
        color: var(--text-muted);
        font-weight: 600;
    }

    .trust-strip span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .trust-strip i {
        color: var(--green);
    }

    /* Hero Floating Graphic */
    .hero__visual-wrap {
        position: relative;
        text-align: center;
    }

    .hero-main-card {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        border-radius: var(--radius-lg);
        padding: 36px 30px;
        color: #fff;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--navy-border);
        text-align: left;
    }

    .hero-main-card h3 {
        font-size: 1.35rem;
        font-weight: 800;
        margin-bottom: 8px;
        color: #fff;
    }

    .hero-main-card p {
        color: rgba(255,255,255,0.75);
        font-size: 0.9rem;
        margin-bottom: 20px;
        line-height: 1.6;
    }

    .hero-stat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
    }

    .stat-badge {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
    }

    .stat-badge .num {
        font-size: 1.25rem;
        font-weight: 900;
        color: var(--orange);
    }

    .stat-badge .lbl {
        font-size: 0.75rem;
        color: rgba(255,255,255,0.7);
        font-weight: 500;
    }

    /* ─── 5 Core Services Section ───────────────────────────────────── */
    .section-services {
        padding: 80px 24px;
        background: var(--bg-body);
    }

    .section-header {
        max-width: 800px;
        margin: 0 auto 50px;
        text-align: center;
    }

    .section-badge {
        display: inline-block;
        background: var(--orange-light);
        color: var(--orange-dark);
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding: 5px 14px;
        border-radius: 20px;
        margin-bottom: 12px;
        border: 1px solid rgba(249,115,22,0.25);
    }

    .section-title {
        font-size: clamp(1.8rem, 3.2vw, 2.5rem);
        font-weight: 900;
        color: var(--navy);
        letter-spacing: -0.5px;
        margin-bottom: 12px;
    }

    .section-subtitle {
        color: var(--text-muted);
        font-size: 1rem;
        line-height: 1.7;
    }

    .services-grid {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
    }

    @media (max-width: 1120px) {
        .services-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 820px) {
        .services-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 540px) {
        .services-grid {
            grid-template-columns: 1fr;
        }
    }

    .service-card {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 28px 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: var(--shadow-sm);
        transition: all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
        position: relative;
        overflow: hidden;
    }

    .service-card:hover {
        transform: translateY(-6px);
        box-shadow: var(--shadow-md);
        border-color: rgba(249,115,22,0.4);
    }

    .service-card__top-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--navy);
        transition: background 0.3s;
    }

    .service-card:hover .service-card__top-bar {
        background: var(--orange);
    }

    .service-card__icon {
        width: 58px;
        height: 58px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        margin-bottom: 18px;
        color: #fff;
    }

    .service-card.c-labour .service-card__icon { background: linear-gradient(135deg, #ea580c, #f97316); }
    .service-card.c-skilled .service-card__icon { background: linear-gradient(135deg, #0284c7, #38bdf8); }
    .service-card.c-driver .service-card__icon { background: linear-gradient(135deg, #16a34a, #4ade80); }
    .service-card.c-transport .service-card__icon { background: linear-gradient(135deg, #d97706, #fbbf24); }
    .service-card.c-contractor .service-card__icon { background: linear-gradient(135deg, #7c3aed, #a855f7); }
    .service-card.c-material .service-card__icon { background: linear-gradient(135deg, #0d9488, #14b8a6); }
    .service-card.c-agri .service-card__icon { background: linear-gradient(135deg, #65a30d, #84cc16); }

    .service-card__title-en {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 2px;
    }

    .service-card__title-hi {
        font-size: 0.925rem;
        font-weight: 700;
        color: var(--orange-dark);
        font-family: 'Noto Sans Devanagari', sans-serif;
        margin-bottom: 12px;
    }

    .service-card__desc {
        color: #64748b;
        font-size: 0.85rem;
        line-height: 1.6;
        margin-bottom: 20px;
        flex-grow: 1;
    }

    .service-card__btn {
        width: 100%;
        text-align: center;
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
        font-weight: 700;
        background: var(--bg-body);
        color: var(--navy);
        border: 1px solid var(--card-border);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
    }

    .service-card:hover .service-card__btn {
        background: var(--orange);
        color: #fff;
        border-color: var(--orange);
    }

    /* ─── Split Two-Column: Quick Inquiry & App Download ────────────── */
    .section-inquiry-app {
        padding: 80px 24px;
        background: #ffffff;
        border-top: 1px solid var(--card-border);
        border-bottom: 1px solid var(--card-border);
    }

    .inquiry-app__grid {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 40px;
        align-items: start;
    }

    @media (max-width: 990px) {
        .inquiry-app__grid {
            grid-template-columns: 1fr;
        }
    }

    /* Quick Inquiry Card */
    .inquiry-card {
        background: #fff;
        border: 2px solid #fed7aa;
        border-radius: var(--radius-lg);
        padding: 36px 32px;
        box-shadow: var(--shadow-md);
        position: relative;
    }

    .inquiry-card__header {
        margin-bottom: 24px;
    }

    .inquiry-card__header h3 {
        font-size: 1.45rem;
        font-weight: 900;
        color: var(--navy);
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
    }

    .inquiry-card__header p {
        color: var(--text-muted);
        font-size: 0.9rem;
    }

    .inquiry-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    @media (max-width: 600px) {
        .inquiry-form {
            grid-template-columns: 1fr;
        }
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .form-group.full {
        grid-column: 1 / -1;
    }

    .form-label {
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--navy);
    }

    .form-control {
        width: 100%;
        padding: 11px 14px;
        border-radius: var(--radius-sm);
        border: 1px solid #cbd5e1;
        font-size: 0.9rem;
        color: var(--dark-2);
        background: #f8fafc;
        transition: border-color 0.2s, background 0.2s;
        font-family: inherit;
    }

    .form-control:focus {
        outline: none;
        border-color: var(--orange);
        background: #fff;
        box-shadow: 0 0 0 3px var(--orange-glow);
    }

    .shift-radio-group {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
    }

    .shift-radio-label {
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        font-size: 0.78rem;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
    }

    .shift-radio-group input[type="radio"] {
        display: none;
    }

    .shift-radio-group input[type="radio"]:checked + .shift-radio-label {
        border-color: var(--orange);
        background: var(--orange-light);
        color: var(--orange-dark);
        font-weight: 700;
    }

    .consent-label {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.78rem;
        color: var(--text-muted);
        line-height: 1.5;
        cursor: pointer;
    }

    .consent-label input {
        margin-top: 3px;
        accent-color: var(--orange);
    }

    .btn-submit-inquiry {
        background: linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%);
        color: #fff;
        border: none;
        padding: 14px 20px;
        border-radius: var(--radius-sm);
        font-size: 1rem;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 16px var(--orange-glow);
        transition: transform 0.2s, box-shadow 0.2s;
        width: 100%;
        margin-top: 6px;
    }

    .btn-submit-inquiry:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(249,115,22,0.35);
    }

    .inquiry-alert {
        display: none;
        padding: 14px 18px;
        border-radius: var(--radius-sm);
        margin-top: 16px;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    .inquiry-alert.success {
        background: #f0fdf4;
        border: 1px solid #86efac;
        color: #166534;
    }

    .inquiry-alert.error {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #991b1b;
    }

    /* App Download Card */
    .app-card {
        background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
        border-radius: var(--radius-lg);
        padding: 36px 30px;
        color: #fff;
        box-shadow: var(--shadow-md);
        border: 1px solid var(--navy-border);
    }

    .app-card__header {
        margin-bottom: 24px;
    }

    .app-card__header h3 {
        font-size: 1.45rem;
        font-weight: 900;
        color: #fff;
        margin-bottom: 8px;
    }

    .app-card__header p {
        color: rgba(255,255,255,0.8);
        font-size: 0.925rem;
        line-height: 1.6;
    }

    .qr-download-block {
        display: flex;
        align-items: center;
        gap: 20px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: var(--radius-md);
        padding: 20px;
        margin-bottom: 26px;
    }

    .qr-box {
        background: #fff;
        padding: 8px;
        border-radius: 10px;
        width: 100px;
        height: 100px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .qr-box svg,
    .qr-box img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }


    .qr-info h4 {
        font-size: 0.95rem;
        font-weight: 800;
        color: #fff;
        margin-bottom: 4px;
    }

    .qr-info p {
        font-size: 0.8rem;
        color: rgba(255,255,255,0.7);
        line-height: 1.4;
    }

    .store-buttons {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 26px;
    }

    .store-btn {
        flex: 1;
        min-width: 140px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #fff;
        transition: all 0.2s;
    }

    .store-btn:hover {
        background: rgba(255,255,255,0.18);
        border-color: var(--orange);
    }

    .store-btn i {
        font-size: 1.6rem;
    }

    .store-btn div {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
    }

    .store-btn small {
        font-size: 0.65rem;
        color: rgba(255,255,255,0.6);
        text-transform: uppercase;
    }

    .store-btn strong {
        font-size: 0.875rem;
        font-weight: 700;
    }

    .app-features-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 20px;
    }

    .app-feature-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.85rem;
        color: rgba(255,255,255,0.85);
        font-weight: 500;
    }

    .app-feature-item i {
        color: var(--orange);
        font-size: 1rem;
        flex-shrink: 0;
    }

    /* ─── How Shram Sarathi Works ───────────────────────────────────── */
    .section-how {
        padding: 80px 24px;
        background: #f8fafc;
    }

    .steps-wrapper {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        position: relative;
    }

    @media (max-width: 900px) {
        .steps-wrapper {
            grid-template-columns: 1fr;
            gap: 20px;
        }
    }

    .step-card {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 24px 18px;
        text-align: center;
        box-shadow: var(--shadow-sm);
        position: relative;
    }

    .step-num {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: var(--navy);
        color: #fff;
        font-weight: 800;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 14px;
        border: 3px solid var(--orange-light);
    }

    .step-card h4 {
        font-size: 1rem;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 8px;
    }

    .step-card p {
        font-size: 0.825rem;
        color: var(--text-muted);
        line-height: 1.5;
    }

    /* ─── Join Shram Sarathi Network (Provider Section) ─────────────── */
    .section-join {
        padding: 80px 24px;
        background: #ffffff;
        border-top: 1px solid var(--card-border);
    }

    .join-grid {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
        margin-bottom: 40px;
    }

    @media (max-width: 1040px) {
        .join-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 680px) {
        .join-grid {
            grid-template-columns: 1fr;
        }
    }

    .join-card {
        background: #f8fafc;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 24px 20px;
        text-align: center;
        transition: all 0.25s;
    }

    .join-card:hover {
        background: #fff;
        border-color: var(--orange);
        box-shadow: var(--shadow-md);
        transform: translateY(-4px);
    }

    .join-card__icon {
        width: 50px;
        height: 50px;
        margin: 0 auto 14px;
        border-radius: 50%;
        background: #fff;
        border: 1px solid var(--card-border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        color: var(--navy);
    }

    .join-card:hover .join-card__icon {
        background: var(--orange);
        color: #fff;
        border-color: var(--orange);
    }

    .join-card h4 {
        font-size: 1rem;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 6px;
    }

    .join-card p {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-bottom: 16px;
        line-height: 1.4;
    }

    .join-card a {
        font-size: 0.825rem;
        font-weight: 700;
        color: var(--orange-dark);
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .join-card a:hover {
        gap: 8px;
    }

    /* Agent Partner Banner */
    .agent-banner {
        max-width: 1280px;
        margin: 0 auto;
        background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
        border-radius: var(--radius-lg);
        padding: 40px 48px;
        color: #fff;
        display: grid;
        grid-template-columns: 1.25fr 0.75fr;
        gap: 32px;
        align-items: center;
        box-shadow: var(--shadow-md);
    }

    .agent-banner__visual {
        border-radius: var(--radius-md);
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        border: 2px solid rgba(255,255,255,0.25);
    }

    .agent-banner__visual img {
        width: 100%;
        height: auto;
        display: block;
    }

    @media (max-width: 860px) {
        .agent-banner {
            grid-template-columns: 1fr;
            padding: 26px 18px;
            gap: 22px;
        }
        .agent-banner h3 {
            font-size: 1.35rem;
        }
        .agent-banner p {
            font-size: 0.9rem;
            margin-bottom: 16px;
        }
        .agent-perks {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-bottom: 20px !important;
        }
        .btn-agent-cta {
            width: 100%;
            justify-content: center;
        }
    }

    .agent-banner h3 {
        font-size: 1.6rem;
        font-weight: 900;
        margin-bottom: 8px;
    }

    .agent-banner p {
        color: rgba(255,255,255,0.85);
        font-size: 0.95rem;
        line-height: 1.6;
        margin-bottom: 18px;
    }

    .agent-perks {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    .agent-perk {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        color: rgba(255,255,255,0.9);
    }

    .agent-perk i {
        color: #34d399;
    }

    .btn-agent-cta {
        background: #fff;
        color: #065f46;
        padding: 14px 28px;
        border-radius: var(--radius-sm);
        font-size: 1rem;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }

    .btn-agent-cta:hover {
        background: #f0fdf4;
        transform: translateY(-2px);
    }

    /* ─── Customer Showcase Section Responsive ─── */
    .section-customer-showcase {
        padding: 70px 24px;
        background: #ffffff;
        border-top: 1px solid var(--card-border);
        border-bottom: 1px solid var(--card-border);
    }

    .customer-showcase__grid {
        max-width: 1240px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 40px;
        align-items: center;
    }

    .customer-showcase__banner {
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-lg);
        border: 2px solid #fed7aa;
        position: relative;
    }

    .customer-showcase__banner img {
        width: 100%;
        height: auto;
        display: block;
    }

    .customer-showcase__overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(to top, rgba(7,17,30,0.94) 0%, rgba(7,17,30,0.5) 60%, transparent 100%);
        padding: 18px 22px;
        color: #fff;
    }

    .customer-showcase__features {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 26px;
    }

    @media (max-width: 900px) {
        .section-customer-showcase {
            padding: 40px 16px;
        }
        .customer-showcase__grid {
            grid-template-columns: 1fr;
            gap: 24px;
        }
        .customer-showcase__overlay {
            position: static;
            background: #07111e;
            padding: 14px 16px;
        }
        .customer-showcase__overlay h4 {
            font-size: 1.05rem;
            margin: 4px 0 2px;
        }
        .customer-showcase__overlay p {
            font-size: 0.8rem;
        }
    }

    @media (max-width: 480px) {
        .customer-showcase__features {
            grid-template-columns: 1fr;
            gap: 12px;
        }
        .btn-customer-cta {
            width: 100%;
            justify-content: center;
        }
    }

    /* ─── How it Works & Provider Showcase Visual Banners on Mobile ─── */
    @media (max-width: 768px) {
        .how-it-works-visual {
            margin-bottom: 24px !important;
        }
        .how-it-works-banner-bar {
            position: static !important;
            background: #07111e !important;
            padding: 12px 16px !important;
        }
        .how-it-works-banner-bar strong {
            font-size: 0.82rem !important;
            line-height: 1.4;
        }
        .provider-showcase-banner {
            margin-bottom: 24px !important;
        }
        .provider-showcase-banner-bar {
            position: static !important;
            background: #07111e !important;
            padding: 12px 16px !important;
        }
        .provider-showcase-banner-bar h3 {
            font-size: 1.08rem !important;
            margin: 4px 0 2px !important;
        }
        .provider-showcase-banner-bar p {
            font-size: 0.8rem !important;
        }
    }

    /* ─── Why Choose Us (6 Pillars) ─────────────────────────────────── */
    .section-why {
        padding: 80px 24px;
        background: #f8fafc;
    }

    .why-grid {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
    }

    @media (max-width: 860px) {
        .why-grid {
            grid-template-columns: 1fr;
        }
    }

    .why-card {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 28px 24px;
        box-shadow: var(--shadow-sm);
        display: flex;
        gap: 16px;
        align-items: flex-start;
    }

    .why-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        background: var(--orange-light);
        color: var(--orange-dark);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
    }

    .why-card h4 {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 4px;
    }

    .why-card p {
        font-size: 0.85rem;
        color: var(--text-muted);
        line-height: 1.5;
    }

    /* ─── Testimonials / What Our Users Say ─────────────────────────── */
    .section-testimonials {
        padding: 80px 24px;
        background: #ffffff;
        border-top: 1px solid var(--card-border);
    }

    .testimonials-grid {
        max-width: 1200px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
    }

    @media (max-width: 860px) {
        .testimonials-grid {
            grid-template-columns: 1fr;
        }
    }

    .testi-card {
        background: #f8fafc;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 28px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .testi-stars {
        color: #f59e0b;
        font-size: 0.9rem;
        margin-bottom: 12px;
    }

    .testi-text {
        font-size: 0.925rem;
        color: var(--dark-2);
        line-height: 1.65;
        margin-bottom: 20px;
        font-style: italic;
    }

    .testi-author {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .testi-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--navy);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 1rem;
    }

    .testi-name {
        font-weight: 800;
        color: var(--navy);
        font-size: 0.9rem;
    }

    .testi-loc {
        font-size: 0.78rem;
        color: var(--text-muted);
    }

    /* ─── FAQ Accordion ─────────────────────────────────────────────── */
    .section-faq {
        padding: 80px 24px;
        background: #f8fafc;
        border-top: 1px solid var(--card-border);
    }

    .faq-container {
        max-width: 860px;
        margin: 0 auto;
    }

    .faq-item {
        background: #fff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        margin-bottom: 14px;
        overflow: hidden;
        transition: all 0.2s;
    }

    .faq-question {
        padding: 20px 24px;
        font-size: 1rem;
        font-weight: 700;
        color: var(--navy);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        user-select: none;
    }

    .faq-question i {
        color: var(--orange);
        transition: transform 0.25s;
    }

    .faq-item.active .faq-question i {
        transform: rotate(180deg);
    }

    .faq-answer {
        display: none;
        padding: 0 24px 20px;
        font-size: 0.925rem;
        color: #475569;
        line-height: 1.7;
    }

    .faq-item.active .faq-answer {
        display: block;
    }

    /* ─── Pastel Feature Highlights (Page 9 Mockups) ─── */
    .section-features {
        padding: 56px 24px;
        background: #ffffff;
        border-bottom: 1px solid var(--card-border);
    }
    .features-grid {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 22px;
    }
    @media (max-width: 992px) {
        .features-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    @media (max-width: 640px) {
        .features-grid {
            grid-template-columns: 1fr;
        }
    }
    .feature-card {
        border-radius: var(--radius-lg);
        padding: 24px 20px;
        border: 1.5px solid transparent;
        transition: all 0.3s ease;
        position: relative;
    }
    .feature-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
    .feature-card.bg-blue { background: var(--pastel-blue); border-color: #bfdbfe; }
    .feature-card.bg-emerald { background: var(--pastel-emerald); border-color: #a7f3d0; }
    .feature-card.bg-amber { background: var(--pastel-amber); border-color: #fde68a; }
    .feature-card.bg-purple { background: var(--pastel-purple); border-color: #e9d5ff; }
    .feature-card.bg-teal { background: var(--pastel-teal); border-color: #99f6e4; }
    .feature-card.bg-rose { background: var(--pastel-rose); border-color: #fecdd3; }
    
    .feature-card__icon {
        width: 50px;
        height: 50px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.35rem;
        margin-bottom: 14px;
        color: #fff;
    }
    .bg-blue .feature-card__icon { background: var(--accent-blue); }
    .bg-emerald .feature-card__icon { background: var(--accent-emerald); }
    .bg-amber .feature-card__icon { background: var(--accent-amber); }
    .bg-purple .feature-card__icon { background: var(--accent-purple); }
    .bg-teal .feature-card__icon { background: var(--accent-teal); }
    .bg-rose .feature-card__icon { background: var(--accent-rose); }
    
    .feature-card h4 {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--navy);
        margin-bottom: 4px;
    }
    .feature-card h4 small {
        display: block;
        font-size: 0.8rem;
        color: #64748b;
        font-weight: 600;
        margin-top: 2px;
    }
    .feature-card p {
        font-size: 0.86rem;
        color: #334155;
        line-height: 1.5;
        margin: 0;
    }

    /* ─── Rate Card Preview Section ─── */
    .section-pricing-preview {
        padding: 70px 24px;
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        border-top: 1px solid var(--card-border);
        border-bottom: 1px solid var(--card-border);
    }
    .rate-preview-grid {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
    }
    .rate-card {
        background: #ffffff;
        border: 1px solid var(--card-border);
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: var(--shadow-sm);
        transition: transform 0.25s, box-shadow 0.25s;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .rate-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
        border-color: var(--orange);
    }
    .rate-card__header {
        border-bottom: 1px dashed #cbd5e1;
        padding-bottom: 12px;
        margin-bottom: 14px;
    }
    .rate-card__title {
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--navy);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .rate-card__wage {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--orange-dark);
        margin: 6px 0;
    }
    .rate-fee-tag {
        display: inline-block;
        background: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;
    }
    .rate-card__points {
        list-style: none;
        padding: 0;
        margin: 0 0 16px;
        font-size: 0.85rem;
        color: #475569;
    }
    .rate-card__points li {
        margin-bottom: 6px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }
    .rate-card__points li i {
        color: #10b981;
        margin-top: 3px;
        font-size: 0.8rem;
    }

    /* Join Network Pastel Cards */
    .join-grid-pastel {
        max-width: 1280px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 20px;
    }
    .join-card-pastel {
        background: #ffffff;
        border-radius: var(--radius-lg);
        padding: 24px 18px;
        box-shadow: var(--shadow-sm);
        border: 1.5px solid var(--card-border);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        transition: all 0.3s;
    }
    .join-card-pastel:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-md);
    }
    .join-card-pastel.c-blue { background: #eff6ff; border-color: #bfdbfe; }
    .join-card-pastel.c-emerald { background: #ecfdf5; border-color: #a7f3d0; }
    .join-card-pastel.c-amber { background: #fffbeb; border-color: #fde68a; }
    .join-card-pastel.c-purple { background: #faf5ff; border-color: #e9d5ff; }
    .join-card-pastel.c-teal { background: #f0fdfa; border-color: #99f6e4; }
    .join-card-pastel.c-rose { background: #fff1f2; border-color: #fecdd3; }

    .join-card__btn-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 14px;
    }
    .btn-playstore-mini {
        background: #0f172a;
        color: #fff !important;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 8px 12px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        text-decoration: none;
        transition: background 0.2s;
    }
    .btn-playstore-mini:hover {
        background: #1e293b;
        color: #38bdf8 !important;
    }
    .btn-apk-mini {
        background: #ffffff;
        color: #0f172a !important;
        border: 1px solid #cbd5e1;
        font-size: 0.76rem;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        text-decoration: none;
        transition: all 0.2s;
    }
    .btn-apk-mini:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
    }
</style>
@endpush

@section('content')

<!-- ═════════════════════════════════════════════════════════════════════
     1. MANDATORY Advertisement / Promotional Slider (8 Slides)
══════════════════════════════════════════════════════════════════════ -->
<section class="promo-slider" id="promoSlider">
    <div class="slider-track" id="sliderTrack">

        <!-- SLIDE 01 — MASTER BRAND HERO (Logo in Center as requested) -->
        <div class="slide slide--center" style="background-image: url('{{ asset('images/web_banners/slide1_brand_hero.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-star"></i> आधिकारिक ब्रांड मंच • Official Brand Network</span>
                    <h2 class="slide__title">लोगों के काम से लोगों को जोड़ता है <span class="highlight">श्रम सारथी नेटवर्क</span></h2>
                    <p class="slide__desc">
                        Right People for Every Work — मजदूर, कुशल कारीगर, ड्राइवर, ठेकेदार, डिलीवरी, ट्रांसपोर्ट व निर्माण सामग्री एक ही राष्ट्रीय मंच पर।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary"><span>सेवा बुक करें / Book Service</span> <i class="fa-solid fa-arrow-right"></i></a>
                        <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="slide-btn secondary"><i class="fa-brands fa-google-play"></i> <span>ऐप डाउनलोड करें</span></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 02 — LABOUR (मजदूर विज्ञापन) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide2_labour.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-person-digging"></i> मजदूर नेटवर्क • Majdoor Network</span>
                    <h2 class="slide__title">हर प्रकार के मजदूर <span class="highlight">एक ही डिजिटल नेटवर्क पर</span></h2>
                    <p class="slide__desc">
                        भवन निर्माण, लोडिंग-अनलोडिंग, कृषि कार्य, गड्ढा खुदाई और सामान्य मजदूरी। फुल डे (8 घंटे) या हाफ डे (4 घंटे) के लिए तुरंत पाएं सत्यापित स्थानीय मजदूर।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary" onclick="selectServiceInquiry('Labour')">मजदूर बुक करें / Book Labour <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 03 — SKILLED WORKER (कारीगर/मिस्त्री विज्ञापन) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide3_karigar.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-screwdriver-wrench"></i> दक्ष कारीगर • Karigar Network</span>
                    <h2 class="slide__title">अनुभवी कारीगर व मिस्त्री <span class="highlight">तुरंत पाएं</span></h2>
                    <p class="slide__desc">
                        प्लंबर, इलेक्ट्रीशियन, बढ़ई (Carpenter), पेंटर, राजमिस्त्री (Mistri), वेल्डर एवं फैब्रिकेटर। अपने घर, दुकान व प्रोजेक्ट के लिए सर्वश्रेष्ठ हुनरमंद।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary" onclick="selectServiceInquiry('Skilled Worker')">कारीगर खोजें / Book Skilled Worker <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 04 — CONTRACTOR (ठेकेदार विज्ञापन) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide4_contractor.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-helmet-safety"></i> ठेकेदार नेटवर्क • Contractor Network</span>
                    <h2 class="slide__title">आपका बड़ा प्रोजेक्ट — <span class="highlight">आपका भरोसेमंद ठेकेदार</span></h2>
                    <p class="slide__desc">
                        मकान निर्माण, सिविल वर्क, रंगाई-पुताई ठेका, सोलर पैनल एवं कैटरिंग/इवेंट कॉन्ट्रैक्ट। डिजिटल ठेका प्रस्ताव भेजें और प्रतिस्पर्धी बोलियां पाएं।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary" onclick="selectServiceInquiry('Contractor')">ठेकेदार सेवा / Contractor Service <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 05 — DRIVER (ड्राइवर विज्ञापन) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide5_driver.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-id-card"></i> ड्राइवर सेवाएं • Professional Drivers</span>
                    <h2 class="slide__title">अनुभवी एवं लाइसेंसधारी ड्राइवर <span class="highlight">ऑन-डिमांड</span></h2>
                    <p class="slide__desc">
                        निजी कार, टैक्सी, ऑटो, कमर्शियल ट्रक, जेसीबी/क्रेन ऑपरेटर और डिलीवरी राइडर्स। सुरक्षित, कुशल और अनुशासित ड्राइवरों की त्वरित बुकिंग।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary" onclick="selectServiceInquiry('Driver')">ड्राइवर बुक करें / Book Driver <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 06 — TAXI & TRANSPORT (टैक्सी और ट्रांसपोर्ट) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide6_taxi_transport.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-truck-moving"></i> टैक्सी व ट्रांसपोर्ट • Taxi & Transport</span>
                    <h2 class="slide__title">सवारी एवं माल ढुलाई <span class="highlight">आसान, सुरक्षित व किफायती</span></h2>
                    <p class="slide__desc">
                        टैक्सी, कैब, ऑटो, ई-रिक्शा, छोटा हाथी, पिकअप, लोडर और बड़े ट्रक। अपने सामान की सुरक्षित ढुलाई और पारिवारिक सफर के लिए वाहन बुक करें।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary" onclick="selectServiceInquiry('Vehicle & Transport')">ट्रांसपोर्ट सेवा / Book Transport <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 07 — ADVANCE VEHICLE BOOKING (अग्रिम वाहन बुकिंग) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide7_advance_vehicle.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-plane-departure"></i> अग्रिम वाहन बुकिंग • Advance Booking</span>
                    <h2 class="slide__title">टूर, एयरपोर्ट, शादी-विवाह व आउटस्टेशन <span class="highlight">एडवांस बुक करें</span></h2>
                    <p class="slide__desc">
                        परिवार के साथ तीर्थ यात्रा, एयरपोर्ट ड्रॉप/पिकअप, पर्व-त्योहार या शादी के लिए लग्जरी बस, ट्रैवलर व सेडान कार पहले से बुक करें और निश्चिंत रहें।
                    </p>
                    <div class="slide__ctas">
                        <a href="#inquiry" class="slide-btn primary" onclick="selectServiceInquiry('Vehicle & Transport')">अग्रिम वाहन बुक करें / Advance Book <i class="fa-solid fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>

        <!-- SLIDE 08 — COMPLETE WORKFORCE (सभी कामगार एक छत के नीचे) -->
        <div class="slide" style="background-image: url('{{ asset('images/web_banners/slide8_all_workforce.jpg') }}');">
            <div class="slide__overlay"></div>
            <div class="slide__inner">
                <div class="slide__content-card">
                    <span class="slide__tag"><i class="fa-solid fa-users-gear"></i> संपूर्ण कार्यबल • All-in-One Workforce</span>
                    <h2 class="slide__title">मजदूर, कारीगर, ड्राइवर, ठेकेदार व वाहन <span class="highlight">सब कुछ एक साथ</span></h2>
                    <p class="slide__desc">
                        श्रम सारथी नेटवर्क — पारदर्शी दरें, त्वरित सेवा और प्रमाणित पहचान के साथ हर प्रकार की श्रम एवं परिवहन सेवा आपके हाथ में।
                    </p>
                    <div class="slide__ctas">
                        <a href="#services" class="slide-btn primary">सभी सेवाएं देखें / Explore All <i class="fa-solid fa-arrow-right"></i></a>
                        <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="slide-btn secondary"><i class="fa-brands fa-google-play"></i> कामगार के रूप में जुड़ें</a>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Controls -->
    <button class="slider-arrow prev" onclick="prevSlide()" aria-label="Previous slide"><i class="fa-solid fa-chevron-left"></i></button>
    <button class="slider-arrow next" onclick="nextSlide()" aria-label="Next slide"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="slider-dots" id="sliderDots"></div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     2. Hero Section
══════════════════════════════════════════════════════════════════════ -->
<section class="hero">
    <div class="hero__inner">
        <div>
            <div class="hero__badge-row">
                <span class="hero-pill primary"><i class="fa-solid fa-circle-check"></i> Digital Intermediary Platform</span>
                <span class="hero-pill"><i class="fa-solid fa-location-dot"></i> Sultanpur & Across India</span>
            </div>
            <h1 class="hero__headline">
                Right People for <span class="highlight">Every Work</span>
            </h1>
            <p class="hero__subheadline">
                Find Labour, Skilled Workers, Drivers, Contractors, Transport and Materials — All on One Digital Platform.
            </p>

            <div class="hero__quote-box">
                <p>“लोगों के काम से लोगों को जोड़ता है श्रम सारथी नेटवर्क”</p>
                <small>Connecting People to Work, Building a Stronger India 🇮🇳</small>
            </div>

            <div class="hero__actions">
                <a href="#inquiry" class="btn-hero-primary">
                    Book a Service <i class="fa-solid fa-arrow-right"></i>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-hero-secondary">
                    <i class="fa-brands fa-google-play"></i> Download App
                </a>
            </div>

            <div class="trust-strip">
                <span><i class="fa-solid fa-shield"></i> Digital Platform</span>
                <span><i class="fa-solid fa-map-pin"></i> Location Based</span>
                <span><i class="fa-solid fa-user-check"></i> Verification/KYC</span>
                <span><i class="fa-solid fa-headset"></i> Customer Support</span>
            </div>
        </div>

        <div class="hero__visual-wrap">
            <div class="hero-network-card" style="background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-lg); border: 2px solid rgba(249, 115, 22, 0.4);">
                <div style="position: relative;">
                    <img src="{{ asset('images/web_banners/page2_home_hero.jpg') }}" alt="Shram Sarathi Pan-India Digital Workforce Network" style="width: 100%; height: auto; display: block;">
                    <div style="position: absolute; top: 12px; left: 12px; background: rgba(7, 17, 30, 0.85); backdrop-filter: blur(8px); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(249, 115, 22, 0.5); display: flex; align-items: center; gap: 6px;">
                        <span style="color: #22c55e; font-size: 0.7rem;">●</span>
                        <span style="color: #fff; font-size: 0.75rem; font-weight: 700;">अखिल भारतीय नेटवर्क</span>
                    </div>
                </div>
                <div style="padding: 20px 24px; color: #fff;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0;">भारत का अपना सेवा मंच</h3>
                        <span style="color: var(--orange); font-size: 0.8rem; font-weight: 700;">श्रम सारथी नेटवर्क</span>
                    </div>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.86rem; margin-bottom: 16px; line-height: 1.5;">
                        सुल्तानपुर से संपूर्ण भारत तक — लाखों कुशल व अकुशल कामगारों, आपूर्तिकर्ताओं और ग्राहकों को सीधे जोड़ता डिजिटल सेतु।
                    </p>
                    <div class="hero-stat-grid" style="margin-top: 0;">
                        <div class="stat-badge">
                            <div class="num">7+</div>
                            <div class="lbl">मुख्य सेवा श्रेणियां</div>
                        </div>
                        <div class="stat-badge">
                            <div class="num">100%</div>
                            <div class="lbl">सत्यापित कामगार</div>
                        </div>
                        <div class="stat-badge">
                            <div class="num" style="font-size: 1rem;">+91 7084900909</div>
                            <div class="lbl">हेल्पलाइन नंबर</div>
                        </div>
                        <div class="stat-badge">
                            <div class="num">24/7</div>
                            <div class="lbl">व्हाट्सएप सपोर्ट</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     2.5 Key Features & Benefits (Pastel Cards as per Specification)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-features">
    <div class="section-header" style="margin-bottom: 36px;">
        <span class="section-badge">विश्वास और पारदर्शिता</span>
        <h2 class="section-title">श्रम सारथी नेटवर्क की मुख्य विशेषताएं</h2>
        <p class="section-subtitle">
            कामगारों और ग्राहकों के बीच बिना किसी बिचौलिये के सीधी, सुरक्षित और पारदर्शी कनेक्टिविटी।
        </p>
    </div>

    <div class="features-grid">
        <!-- 1. Fast Matching -->
        <div class="feature-card bg-blue">
            <div class="feature-card__icon"><i class="fa-solid fa-bolt-lightning"></i></div>
            <h4>त्वरित मिलान <small>Fast Matching</small></h4>
            <p>कुछ ही मिनटों में आपकी आवश्यकता अनुसार नजदीकी सत्यापित मजदूर, कारीगर या वाहन उपलब्ध।</p>
        </div>

        <!-- 2. Verified Providers -->
        <div class="feature-card bg-emerald">
            <div class="feature-card__icon"><i class="fa-solid fa-shield-halved"></i></div>
            <h4>100% सत्यापित प्रोफ़ाइल <small>Verified Profiles</small></h4>
            <p>आधार व पहचान सत्यापन के साथ सुरक्षित सेवा। हर कामगार का डिजिटल प्रोफाइल और अनुभव विवरण।</p>
        </div>

        <!-- 3. Transparent Rates -->
        <div class="feature-card bg-amber">
            <div class="feature-card__icon"><i class="fa-solid fa-handshake-angle"></i></div>
            <h4>पारस्परिक सहमति व मोलभाव <small>Negotiable & Transparent</small></h4>
            <p>काम के अनुसार पारदर्शी दरें। ग्राहक और कामगार आपस में बातचीत कर काम की राशि तय करते हैं।</p>
        </div>

        <!-- 4. Direct Booking & Zero Middleman -->
        <div class="feature-card bg-purple">
            <div class="feature-card__icon"><i class="fa-solid fa-user-group"></i></div>
            <h4>सीधी बुकिंग — 0% कटौती <small>Direct Booking & 0% Cut</small></h4>
            <p>श्रमिकों की मजदूरी से ₹0 कटौती। पूरा पारिश्रमिक सीधे कामगार के हाथ में जाता है।</p>
        </div>

        <!-- 5. Construction & Agri Material -->
        <div class="feature-card bg-teal">
            <div class="feature-card__icon"><i class="fa-solid fa-trowel-bricks"></i></div>
            <h4>निर्माण व कृषि सामग्री <small>Construction & Agri Hub</small></h4>
            <p>सीमेंट, मौरंग, सरिया, खाद व बीज सीधे सप्लायर व डीलरों से मंगवाएं बिना किसी अतिरिक्त कमीशन के।</p>
        </div>

        <!-- 6. 24/7 Helpline Support -->
        <div class="feature-card bg-rose">
            <div class="feature-card__icon"><i class="fa-solid fa-phone-volume"></i></div>
            <h4>समर्पित सहायता केंद्र <small>24/7 Helpline Desk</small></h4>
            <p>IVR हेल्पलाइन और व्हाट्सएप (+91 7084900909) पर त्वरित समाधान व बुकिंग सहायता उपलब्ध।</p>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     3. Our Services — Seven Core Categories (MANDATORY)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-services" id="services">
    <div class="section-header">
        <span class="section-badge">7 Core Categories</span>
        <h2 class="section-title">Our Services / हमारी सेवाएं</h2>
        <p class="section-subtitle">
            मजदूर, कारीगर, ड्राइवर, वाहन, ठेकेदार व निर्माण-कृषि सामग्री — हर आवश्यकता के लिए विश्वसनीय नेटवर्क।
        </p>
    </div>

    <div class="services-grid">
        <!-- 1. Labour -->
        <div class="service-card c-labour">
            <div class="service-card__top-bar"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-person-digging"></i></div>
                <h3 class="service-card__title-en">Labour</h3>
                <div class="service-card__title-hi">मजदूर</div>
                <p class="service-card__desc">
                    Construction, loading, agriculture, digging, cleaning, and other general unskilled labour.
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Labour')">
                Book Labour <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- 2. Skilled Worker -->
        <div class="service-card c-skilled">
            <div class="service-card__top-bar"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-wrench"></i></div>
                <h3 class="service-card__title-en">Skilled Worker</h3>
                <div class="service-card__title-hi">कारीगर / मिस्त्री</div>
                <p class="service-card__desc">
                    Carpenter, electrician, plumber, painter, mason (mistri), welder, fabricator & skilled trades.
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Skilled Worker')">
                Book Skilled Worker <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- 3. Driver -->
        <div class="service-card c-driver">
            <div class="service-card__top-bar"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-id-card"></i></div>
                <h3 class="service-card__title-en">Driver</h3>
                <div class="service-card__title-hi">ड्राइवर</div>
                <p class="service-card__desc">
                    Taxi/cab, auto, e-rickshaw, commercial truck, tractor, JCB and private chauffeur drivers.
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Driver')">
                Book Driver <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- 4. Vehicle & Transport -->
        <div class="service-card c-transport">
            <div class="service-card__top-bar"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-truck-pickup"></i></div>
                <h3 class="service-card__title-en">Vehicle & Transport</h3>
                <div class="service-card__title-hi">वाहन एवं परिवहन</div>
                <p class="service-card__desc">
                    Taxi, cab, auto, e-rickshaw, loader, pickup, mini-truck and freight goods transportation.
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Vehicle & Transport')">
                Book Vehicle <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- 5. Contractor -->
        <div class="service-card c-contractor">
            <div class="service-card__top-bar"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-helmet-safety"></i></div>
                <h3 class="service-card__title-en">Contractor</h3>
                <div class="service-card__title-hi">ठेकेदार</div>
                <p class="service-card__desc">
                    Construction, building renovation, civil work, painting and project-based contracting.
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Contractor')">
                Find Contractor <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- 6. Construction Material -->
        <div class="service-card c-material">
            <div class="service-card__top-bar" style="background: linear-gradient(90deg, #0d9488, #14b8a6);"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-trowel-bricks"></i></div>
                <h3 class="service-card__title-en">Construction Material</h3>
                <div class="service-card__title-hi">निर्माण सामग्री</div>
                <p class="service-card__desc">
                    बालू, मौरंग, सीमेंट, सरिया, ईंट, गिट्टी, रोड़ी व हार्डवेयर सामग्री सीधे सप्लायरों से।
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Construction Material')">
                Order Material <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- 7. Agriculture Material -->
        <div class="service-card c-agri">
            <div class="service-card__top-bar" style="background: linear-gradient(90deg, #65a30d, #84cc16);"></div>
            <div>
                <div class="service-card__icon"><i class="fa-solid fa-wheat-awn"></i></div>
                <h3 class="service-card__title-en">Agriculture Material</h3>
                <div class="service-card__title-hi">कृषि सामग्री</div>
                <p class="service-card__desc">
                    उन्नत बीज, खाद (यूरिया/डीएपी), कीटनाशक, सिंचाई पाइप, कृषि उपकरण व पशु आहार।
                </p>
            </div>
            <a href="#inquiry" class="service-card__btn" onclick="selectServiceInquiry('Agriculture Material')">
                Order Agri Supply <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     For Customer & Family Experience Banner (page5_for_customer.jpg)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-customer-showcase">
    <div class="customer-showcase__grid">
        <div class="customer-showcase__banner">
            <img src="{{ asset('images/web_banners/page5_for_customer.jpg') }}" alt="Happy Indian family booking services at home" loading="lazy">
            <div class="customer-showcase__overlay">
                <span style="background: var(--orange); color: #fff; font-size: 0.72rem; font-weight: 800; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">ग्राहकों के लिए</span>
                <h4 style="font-weight: 800; color: #fff;">घर बैठे पाएं कुशल व भरोसेमंद कामगार</h4>
                <p style="margin: 0; color: rgba(255,255,255,0.85);">सुरक्षित वातावरण, उचित दरें और गुणवत्तापूर्ण कार्य की गारंटी।</p>
            </div>
        </div>
        <div>
            <span class="section-badge"><i class="fa-solid fa-house-chimney-user"></i> ग्राहक सुविधा व सुरक्षा</span>
            <h2 style="font-size: clamp(1.8rem, 3.2vw, 2.4rem); font-weight: 900; color: var(--navy); margin-bottom: 14px; line-height: 1.2;">
                घर, परिवार एवं व्यवसाय के लिए <span style="color: var(--orange);">सुरक्षित सेवाएं</span>
            </h2>
            <p style="font-size: 0.98rem; color: #475569; line-height: 1.6; margin-bottom: 22px;">
                अपने घर की मरम्मत, इंटीरियर, नल-बिजली सुधार, ड्राइविंग या माल ढुलाई के लिए अब भटकने की जरूरत नहीं। श्रम सारथी पर सत्यापित कामगारों से सीधे संपर्क करें।
            </p>
            <div class="customer-showcase__features">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa-solid fa-user-shield" style="color: var(--green); font-size: 1.2rem; margin-top: 2px;"></i>
                    <div>
                        <strong style="font-size: 0.92rem; color: var(--navy); display: block;">100% KYC सत्यापित</strong>
                        <small style="color: #64748b;">पहचान व आधार प्रमाणीकरण</small>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa-solid fa-indian-rupee-sign" style="color: var(--orange); font-size: 1.2rem; margin-top: 2px;"></i>
                    <div>
                        <strong style="font-size: 0.92rem; color: var(--navy); display: block;">पारदर्शी दरें</strong>
                        <small style="color: #64748b;">सीधी बातचीत, उचित मूल्य</small>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa-solid fa-business-time" style="color: var(--blue-accent); font-size: 1.2rem; margin-top: 2px;"></i>
                    <div>
                        <strong style="font-size: 0.92rem; color: var(--navy); display: block;">लचीले विकल्प</strong>
                        <small style="color: #64748b;">फुल डे, हाफ डे या प्रोजेक्ट</small>
                    </div>
                </div>
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa-solid fa-headset" style="color: var(--green); font-size: 1.2rem; margin-top: 2px;"></i>
                    <div>
                        <strong style="font-size: 0.92rem; color: var(--navy); display: block;">24x7 ग्राहक सहायता</strong>
                        <small style="color: #64748b;">व्हाट्सएप व कॉल पर मदद</small>
                    </div>
                </div>
            </div>
            <a href="#inquiry" class="btn-hero-primary btn-customer-cta" style="display: inline-flex;">
                आवश्यकता बताएं / Book a Service <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     4. Split Two-Column: Quick Inquiry (MANDATORY) & Download App
══════════════════════════════════════════════════════════════════════ -->
<section class="section-inquiry-app" id="inquiry">
    <div class="inquiry-app__grid">

        <!-- Left: Quick Inquiry Form with Support Visual (page9_inquiry.jpg) -->
        <div class="inquiry-card">
            <div class="inquiry-card__header">
                <h3><i class="fa-solid fa-clipboard-list" style="color:var(--orange);"></i> Quick Inquiry / आवश्यकता बताएं</h3>
                <p>Tell us your requirement, we will connect you with the right provider.</p>
            </div>

            <!-- Visual Help Desk Header -->
            <div class="inquiry-support-badge" style="display: flex; align-items: center; gap: 14px; background: linear-gradient(135deg, #07111e, #0b192c); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 20px; border: 1px solid rgba(249,115,22,0.35);">
                <img src="{{ asset('images/web_banners/page9_inquiry.jpg') }}" alt="Customer Support Desk" style="width: 76px; height: 52px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25);">
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 800; color: #fff; margin: 0 0 2px;">समर्पित हेल्पलाइन एवं सहायता केंद्र</h4>
                    <p style="margin: 0; font-size: 0.78rem; color: rgba(255,255,255,0.8);">पूछताछ दर्ज करें, हमारी टीम कुछ ही मिनटों में आपसे संपर्क करेगी।</p>
                </div>
            </div>

            <form id="quickInquiryForm" onsubmit="handleInquirySubmit(event)">
                @csrf
                <div class="inquiry-form">
                    <!-- Service Selector -->
                    <div class="form-group">
                        <label class="form-label" for="inqService">Select Service *</label>
                        <select id="inqService" name="service" class="form-control" required>
                            <option value="">-- Choose Category --</option>
                            <option value="Labour">Labour (मजदूर)</option>
                            <option value="Skilled Worker">Skilled Worker (कारीगर / मिस्त्री)</option>
                            <option value="Driver">Driver (ड्राइवर)</option>
                            <option value="Vehicle & Transport">Vehicle & Transport (वाहन/परिवहन)</option>
                            <option value="Contractor">Contractor (ठेकेदार)</option>
                            <option value="Construction Material">Construction Material (निर्माण सामग्री)</option>
                            <option value="Agriculture Material">Agriculture Material (कृषि सामग्री)</option>
                        </select>
                    </div>

                    <!-- User Type -->
                    <div class="form-group">
                        <label class="form-label" for="inqUserType">I am a *</label>
                        <select id="inqUserType" name="user_type" class="form-control">
                            <option value="Customer">Customer (ग्राहक)</option>
                            <option value="Service Provider">Service Provider (श्रमिक/कारीगर)</option>
                            <option value="Contractor">Contractor (ठेकेदार)</option>
                            <option value="Driver">Driver (ड्राइवर)</option>
                            <option value="Material Supplier">Material Supplier / Dealer (सामग्री आपूर्तिकर्ता)</option>
                            <option value="Other">Other / अन्य</option>
                        </select>
                    </div>

                    <!-- Location -->
                    <div class="form-group">
                        <label class="form-label" for="inqLocation">City / Area / Location *</label>
                        <input type="text" id="inqLocation" name="location" class="form-control" placeholder="e.g. Sultanpur, UP" value="Sultanpur, Uttar Pradesh" required>
                    </div>

                    <!-- Preferred Date -->
                    <div class="form-group">
                        <label class="form-label" for="inqDate">Preferred Date *</label>
                        <input type="date" id="inqDate" name="preferred_date" class="form-control" value="{{ date('Y-m-d') }}">
                    </div>

                    <!-- Name -->
                    <div class="form-group">
                        <label class="form-label" for="inqName">Your Name *</label>
                        <input type="text" id="inqName" name="name" class="form-control" placeholder="Enter your full name" required>
                    </div>

                    <!-- Mobile -->
                    <div class="form-group">
                        <label class="form-label" for="inqMobile">Mobile Number *</label>
                        <input type="tel" id="inqMobile" name="mobile" class="form-control" placeholder="10-digit mobile number" pattern="[0-9]{10}" maxlength="10" required>
                    </div>

                    <!-- Email (optional) -->
                    <div class="form-group">
                        <label class="form-label" for="inqEmail">Email Address (Optional)</label>
                        <input type="email" id="inqEmail" name="email" class="form-control" placeholder="name@example.com">
                    </div>

                    <!-- Number of Workers -->
                    <div class="form-group">
                        <label class="form-label" for="inqWorkers">Workers / Vehicles Count</label>
                        <input type="text" id="inqWorkers" name="workers_count" class="form-control" placeholder="e.g. 1 Worker, 2 Labours">
                    </div>

                    <!-- Shift / Duration -->
                    <div class="form-group full">
                        <label class="form-label">Shift / Duration (आवश्यकता की अवधि)</label>
                        <div class="shift-radio-group">
                            <label>
                                <input type="radio" name="shift" value="Full Day (8 Hours)" checked>
                                <div class="shift-radio-label">Full Day (8 hrs)</div>
                            </label>
                            <label>
                                <input type="radio" name="shift" value="Half Day (4 Hours)">
                                <div class="shift-radio-label">Half Day (4 hrs)</div>
                            </label>
                            <label>
                                <input type="radio" name="shift" value="Contract / Project">
                                <div class="shift-radio-label">Contract Work</div>
                            </label>
                        </div>
                    </div>

                    <!-- Additional Details -->
                    <div class="form-group full">
                        <label class="form-label" for="inqMessage">Requirement Details / कार्य विवरण</label>
                        <textarea id="inqMessage" name="message" class="form-control" rows="3" placeholder="Briefly describe your work requirements or query..."></textarea>
                    </div>

                    <!-- Privacy Consent Checkbox -->
                    <div class="form-group full">
                        <label class="consent-label">
                            <input type="checkbox" name="consent" id="inqConsent" value="1" required checked>
                            <span>I agree to submit this inquiry and receive service-related communication from Shram Sarathi Network, and I accept the <a href="{{ url('/privacy') }}" target="_blank" style="color:var(--orange); text-decoration:underline;">Privacy Policy</a> and <a href="{{ url('/terms') }}" target="_blank" style="color:var(--orange); text-decoration:underline;">Terms</a>.</span>
                        </label>
                    </div>

                    <!-- Submit Button -->
                    <div class="form-group full">
                        <button type="submit" class="btn-submit-inquiry" id="btnSubmitInquiry">
                            <span>Send Inquiry</span> <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </form>

            <div id="inquiryAlert" class="inquiry-alert"></div>
        </div>

        <!-- Right: Download App Card -->
        <div class="app-card" id="download">
            <div class="app-card__header">
                <h3>Access Shram Sarathi Platform</h3>
                <p>Book verified workers, manage service requests and connect easily on our official web portal & mobile apps.</p>
            </div>

            <!-- QR Code Box -->
            <div class="qr-download-block">
                <div class="qr-box">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fshramsarathinetwork.com" alt="QR Code to Open Shram Sarathi Web Platform">
                </div>
                <div class="qr-info">
                    <h4>Scan to Open on Mobile / मोबाइल पर खोलें</h4>
                    <p>Scan with your phone camera to instantly access our mobile-friendly online booking platform.</p>
                </div>
            </div>

            <!-- Store & Web Booking Buttons -->
            <div class="store-buttons">
                <!-- Instant Web Booking (Primary) -->
                <a href="#inquiry" class="store-btn" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border: 1.5px solid #fdba74; flex: 1 1 100%; padding: 13px 18px; margin-bottom: 6px; box-shadow: 0 4px 16px rgba(249, 115, 22, 0.45); text-decoration: none;">
                    <i class="fa-solid fa-globe" style="font-size: 2rem; color: #fff;"></i>
                    <div style="flex: 1;">
                        <small style="color: #ffedd5; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.5px;">Online Web Portal</small>
                        <strong style="font-size: 1.05rem; color: #fff; display: block; margin-top: 2px;">Book Services Instantly on Web</strong>
                    </div>
                    <span style="background: rgba(0,0,0,0.2); padding: 5px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 700; color: #fff;">
                        <i class="fa-solid fa-arrow-right"></i> Book Now
                    </span>
                </a>

                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="store-btn">
                    <i class="fa-brands fa-google-play"></i>
                    <div>
                        <small>Get It On</small>
                        <strong>Google Play</strong>
                    </div>
                </a>
                <a href="javascript:void(0);" class="store-btn" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">
                    <i class="fa-solid fa-download"></i>
                    <div>
                        <small>Direct Android</small>
                        <strong>Download APK</strong>
                    </div>
                </a>
            </div>

            <!-- App Feature List -->
            <div class="app-features-list">
                <div class="app-feature-item">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Verified Service Providers with KYC</span>
                </div>
                <div class="app-feature-item">
                    <i class="fa-solid fa-bolt"></i>
                    <span>Fast & Easy Service Discovery</span>
                </div>
                <div class="app-feature-item">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>Local Support in Sultanpur & Your City</span>
                </div>
                <div class="app-feature-item">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>Safe & Secure Digital Records</span>
                </div>
            </div>
        </div>

    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     5. How Shram Sarathi Works (5 Steps)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-how" id="how-it-works">
    <div class="section-header">
        <span class="section-badge">Simple & Transparent</span>
        <h2 class="section-title">How Shram Sarathi Works</h2>
        <p class="section-subtitle">A simple 5-step process connecting your work with genuine opportunities.</p>
    </div>

    <!-- 5-Step Process Visual Illustration Banner (page4_how_it_works.jpg) -->
    <div class="how-it-works-visual" style="max-width: 1200px; margin: 0 auto 36px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); border: 2px solid #e2e8f0; position: relative;">
        <img src="{{ asset('images/web_banners/page4_how_it_works.jpg') }}" alt="5 Steps How Shram Sarathi Works — Service Selection to Handshake" style="width: 100%; height: auto; display: block;" loading="lazy">
        <div class="how-it-works-banner-bar" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(7,17,30,0.92) 0%, rgba(7,17,30,0.3) 60%, transparent 100%); padding: 16px 24px; color: #fff; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: var(--orange); color: #fff; font-size: 0.72rem; font-weight: 800; padding: 3px 10px; border-radius: 10px;">कार्यप्रणाली</span>
                <strong style="font-size: 0.95rem; color: #fff;">1. सेवा चयन &nbsp;➔&nbsp; 2. स्थान व समय &nbsp;➔&nbsp; 3. सत्यापित कामगार &nbsp;➔&nbsp; 4. डिजिटल रिकॉर्ड &nbsp;➔&nbsp; 5. सफल कार्य</strong>
            </div>
            <a href="#inquiry" style="color: #fdba74; font-size: 0.85rem; font-weight: 700; text-decoration: underline;">अभी शुरू करें / Get Started ➔</a>
        </div>
    </div>

    <div class="steps-wrapper">
        <div class="step-card">
            <div class="step-num">01</div>
            <h4>Choose Service</h4>
            <p>Select your required service category from Labour, Karigar, Driver, Transport, or Contractor.</p>
        </div>
        <div class="step-card">
            <div class="step-num">02</div>
            <h4>Share Details</h4>
            <p>Enter location, date, required shift (Full/Half Day) and relevant project requirements.</p>
        </div>
        <div class="step-card">
            <div class="step-num">03</div>
            <h4>Get Providers</h4>
            <p>We connect your requirement with verified, available local service providers.</p>
        </div>
        <div class="step-card">
            <div class="step-num">04</div>
            <h4>Confirm & Book</h4>
            <p>Review provider details, agree on terms, and confirm service facilitation.</p>
        </div>
        <div class="step-card">
            <div class="step-num">05</div>
            <h4>Service & Records</h4>
            <p>Receive quality service, complete transaction, and maintain digital records.</p>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     5.5 Affordable & Transparent Pricing (Preview Rate Card)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-pricing-preview" id="pricing-preview">
    <div class="section-header">
        <span class="section-badge" style="background: #ecfdf5; color: #065f46; border-color: #a7f3d0;">किफायती व पारदर्शी दरें</span>
        <h2 class="section-title">पारस्परिक सहमति व निष्पक्ष शुल्क संरचना</h2>
        <p class="section-subtitle">
            काम की मजदूरी व दरें ग्राहक और कामगार की आपसी बातचीत (मोलभाव) पर आधारित हैं। श्रमिकों के पारिश्रमिक से ₹0 की कटौती।
        </p>
    </div>

    <div class="rate-preview-grid">
        <!-- 1. Labour -->
        <div class="rate-card">
            <div class="rate-card__header">
                <div class="rate-card__title">
                    <span>मजदूर (Labour)</span>
                    <span class="rate-fee-tag">0% मजदूरी कटौती</span>
                </div>
                <div class="rate-card__wage">पारस्परिक सहमति / Negotiable</div>
                <small style="color: #64748b;">फुल डे (8 घंटे) या हाफ डे (4 घंटे)</small>
            </div>
            <ul class="rate-card__points">
                <li><i class="fa-solid fa-check"></i> ग्राहक बुकिंग शुल्क: ₹20 / दिन</li>
                <li><i class="fa-solid fa-check"></i> मासिक बुकिंग सुविधा: ₹500 / माह</li>
                <li><i class="fa-solid fa-check"></i> कामगार की मजदूरी से शून्य कटौती</li>
            </ul>
            <a href="{{ route('web.pricing') }}" class="btn-apk-mini" style="width: 100%; text-align: center;">विस्तृत दरें देखें ➔</a>
        </div>

        <!-- 2. Skilled Worker -->
        <div class="rate-card">
            <div class="rate-card__header">
                <div class="rate-card__title">
                    <span>कारीगर / मिस्त्री (Skilled)</span>
                    <span class="rate-fee-tag">0% मजदूरी कटौती</span>
                </div>
                <div class="rate-card__wage">पारस्परिक सहमति / Negotiable</div>
                <small style="color: #64748b;">प्लंबर, इलेक्ट्रीशियन, बढ़ई, पेंटर, मिस्त्री</small>
            </div>
            <ul class="rate-card__points">
                <li><i class="fa-solid fa-check"></i> ग्राहक बुकिंग शुल्क: ₹25 / दिन</li>
                <li><i class="fa-solid fa-check"></i> मासिक बुकिंग सुविधा: ₹600 / माह</li>
                <li><i class="fa-solid fa-check"></i> मिस्त्री को मिलता है पूरा 100% मेहनताना</li>
            </ul>
            <a href="{{ route('web.pricing') }}" class="btn-apk-mini" style="width: 100%; text-align: center;">विस्तृत दरें देखें ➔</a>
        </div>

        <!-- 3. Driver -->
        <div class="rate-card">
            <div class="rate-card__header">
                <div class="rate-card__title">
                    <span>ड्राइवर (Driver)</span>
                    <span class="rate-fee-tag">0% वेतन कटौती</span>
                </div>
                <div class="rate-card__wage">पारस्परिक सहमति / Negotiable</div>
                <small style="color: #64748b;">कार, टैक्सी, कमर्शियल व प्राइवेट चालक</small>
            </div>
            <ul class="rate-card__points">
                <li><i class="fa-solid fa-check"></i> ग्राहक बुकिंग शुल्क: ₹25 / दिन</li>
                <li><i class="fa-solid fa-check"></i> मासिक बुकिंग सुविधा: ₹600 / माह</li>
                <li><i class="fa-solid fa-check"></i> व्यक्तिगत या व्यावसायिक ड्राइविंग सेवा</li>
            </ul>
            <a href="{{ route('web.pricing') }}" class="btn-apk-mini" style="width: 100%; text-align: center;">विस्तृत दरें देखें ➔</a>
        </div>

        <!-- 4. Vehicle & Contractor -->
        <div class="rate-card">
            <div class="rate-card__header">
                <div class="rate-card__title">
                    <span>वाहन व ठेकेदार (Vehicle & Contractor)</span>
                    <span class="rate-fee-tag" style="background:#eff6ff; color:#1e40af; border-color:#bfdbfe;">पारदर्शी कमीशन</span>
                </div>
                <div class="rate-card__wage">न्यूनतम प्लेटफ़ॉर्म कमीशन</div>
                <small style="color: #64748b;">तत्काल वाहन 10% | अग्रिम वाहन 12% | ठेकेदार 3%</small>
            </div>
            <ul class="rate-card__points">
                <li><i class="fa-solid fa-check"></i> वाहन मालिक द्वारा देय मामूली कमीशन</li>
                <li><i class="fa-solid fa-check"></i> ठेकेदार अनुबंध राशि पर मात्र 3%</li>
                <li><i class="fa-solid fa-check"></i> निर्माण व कृषि सामग्री पर 0% शुल्क</li>
            </ul>
            <a href="{{ route('web.pricing') }}" class="btn-playstore-mini" style="width: 100%; justify-content: center;"><i class="fa-solid fa-list-check"></i> संपूर्ण रेट कार्ड देखें ➔</a>
        </div>
    </div>

    <div style="text-align: center; margin-top: 36px;">
        <a href="{{ route('web.pricing') }}" class="btn-hero-primary" style="display: inline-flex; align-items: center; gap: 8px;">
            <span>सभी 7 श्रेणियों का आधिकारिक रेट कार्ड देखें</span>
            <i class="fa-solid fa-arrow-right"></i>
        </a>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     6. Join Shram Sarathi Network & Agent Network
══════════════════════════════════════════════════════════════════════ -->
<section class="section-join" id="join-network">
    <div class="section-header">
        <span class="section-badge">For Service Providers</span>
        <h2 class="section-title">Join Shram Sarathi Network / नेटवर्क से जुड़ें</h2>
        <p class="section-subtitle">More opportunities, more income — Be a part of our growing digital workforce.</p>
    </div>

    <!-- Service Provider Network Showcase Banner (page6_for_provider.jpg) -->
    <div class="provider-showcase-banner" style="max-width: 1200px; margin: 0 auto 36px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); border: 2px solid #fed7aa; position: relative;">
        <img src="{{ asset('images/web_banners/page6_for_provider.jpg') }}" alt="Shram Sarathi Service Providers Network" style="width: 100%; height: auto; display: block;" loading="lazy">
        <div class="provider-showcase-banner-bar" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(7,17,30,0.92) 0%, rgba(7,17,30,0.3) 60%, transparent 100%); padding: 18px 24px; color: #fff;">
            <span style="background: var(--green); color: #fff; font-size: 0.75rem; font-weight: 800; padding: 3px 10px; border-radius: 12px; text-transform: uppercase;">सम्मान और स्वाभिमान</span>
            <h3 style="font-size: 1.25rem; font-weight: 900; margin: 6px 0 2px; color: #fff;">हर हाथ को काम — श्रम सारथी के साथ बनें आत्मनिर्भर</h3>
            <p style="margin: 0; font-size: 0.85rem; color: rgba(255,255,255,0.88);">सीधे ग्राहकों से जुड़ें, काम के अधिक अवसर पाएं और डिजिटल पहचान के साथ सम्मानपूर्वक कमाई करें।</p>
        </div>
    </div>

    <div class="join-grid-pastel">
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

    <!-- Agent Network Banner (Section 11) with page7_agent_network.jpg -->
    <div class="agent-banner" id="agent-network">
        <div>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 10px;">ग्राउंड पार्टनर नेटवर्क • Agent Partner</span>
            <h3>Become a Digital Sarathi / Agent Partner</h3>
            <p>अपने ब्लॉक, तहसील और शहर में श्रम सारथी के अधिकृत एजेंट बनें। स्थानीय श्रमिकों को जोड़ें, बुकिंग में सहायता करें और आकर्षक कमीशन कमाएं।</p>
            <div class="agent-perks" style="margin-bottom: 22px;">
                <div class="agent-perk"><i class="fa-solid fa-circle-check"></i> प्रत्येक कामगार जोड़ने पर कमीशन</div>
                <div class="agent-perk"><i class="fa-solid fa-circle-check"></i> सफल बुकिंग समन्वय प्रोत्साहन</div>
                <div class="agent-perk"><i class="fa-solid fa-circle-check"></i> डिजिटल आईडी कार्ड व टैबलेट सपोर्ट</div>
                <div class="agent-perk"><i class="fa-solid fa-circle-check"></i> ब्लॉक स्तर पर आधिकारिक पहचान</div>
            </div>
            <a href="#inquiry" class="btn-agent-cta" onclick="selectServiceInquiry('Labour', 'Other')">
                Join as Agent / एजेंट बनें <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>
        <div class="agent-banner__visual">
            <img src="{{ asset('images/web_banners/page7_agent_network.jpg') }}" alt="Shram Sarathi Field Agent Partner Network" loading="lazy">
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     7. Why Choose Shram Sarathi? (6 Pillars)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-why">
    <div class="section-header">
        <span class="section-badge">Trusted Network</span>
        <h2 class="section-title">Why Choose Shram Sarathi?</h2>
        <p class="section-subtitle">Bridging the gap between skills and opportunities with technology.</p>
    </div>

    <div class="why-grid">
        <div class="why-card">
            <div class="why-icon"><i class="fa-solid fa-user-shield"></i></div>
            <div>
                <h4>Verified Providers with KYC</h4>
                <p>Service providers are onboarded through identity and basic credential verification.</p>
            </div>
        </div>
        <div class="why-card">
            <div class="why-icon"><i class="fa-solid fa-scale-balanced"></i></div>
            <div>
                <h4>Affordable & Transparent</h4>
                <p>Direct communication and transparent service facilitation without hidden charges.</p>
            </div>
        </div>
        <div class="why-card">
            <div class="why-icon"><i class="fa-solid fa-bolt"></i></div>
            <div>
                <h4>Quick & Easy Booking</h4>
                <p>Rapid inquiry response and convenient coordination through app and web channels.</p>
            </div>
        </div>
        <div class="why-card">
            <div class="why-icon"><i class="fa-solid fa-location-crosshairs"></i></div>
            <div>
                <h4>Local & Reliable Service</h4>
                <p>Connecting you with service providers right in your own city, town, and locality.</p>
            </div>
        </div>
        <div class="why-card">
            <div class="why-icon"><i class="fa-solid fa-file-invoice"></i></div>
            <div>
                <h4>Digital Records & Support</h4>
                <p>Clear booking history, transaction transparency, and responsive customer care.</p>
            </div>
        </div>
        <div class="why-card">
            <div class="why-icon"><i class="fa-solid fa-hand-holding-heart"></i></div>
            <div>
                <h4>Empowering Communities</h4>
                <p>Promoting local employment and digital inclusion for blue-collar workforce across India.</p>
            </div>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     8. Testimonials / What Our Users Say
══════════════════════════════════════════════════════════════════════ -->
<section class="section-testimonials">
    <div class="section-header">
        <span class="section-badge">User Experiences</span>
        <h2 class="section-title">What Our Users Say</h2>
        <p class="section-subtitle">Authentic feedback from customers and service providers in our network.</p>
    </div>

    <div class="testimonials-grid">
        <div class="testi-card">
            <div class="testi-stars">
                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            </div>
            <div class="testi-text">
                "Mujhe jaldi aur sahi mazdoor mil gaye. Bahut achhi service hai. Construction material loading ke liye 2 ghante me team mil gayi."
            </div>
            <div class="testi-author">
                <div class="testi-avatar">RK</div>
                <div>
                    <div class="testi-name">Rajesh Kumar</div>
                    <div class="testi-loc">Sultanpur, Uttar Pradesh</div>
                </div>
            </div>
        </div>

        <div class="testi-card">
            <div class="testi-stars">
                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            </div>
            <div class="testi-text">
                "Ghar ke kaam ke liye karigar milna ab bahut aasan ho gaya. Plumber aur electrician dono samay par aaye aur kaam badhiya kiya."
            </div>
            <div class="testi-author">
                <div class="testi-avatar" style="background:var(--orange);">NS</div>
                <div>
                    <div class="testi-name">Neha Singh</div>
                    <div class="testi-loc">Prayagraj, Uttar Pradesh</div>
                </div>
            </div>
        </div>

        <div class="testi-card">
            <div class="testi-stars">
                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            </div>
            <div class="testi-text">
                "Driver booking bahut simple hai aur samay par service milti hai. Commercial pickup transport ke liye Shram Sarathi best platform hai."
            </div>
            <div class="testi-author">
                <div class="testi-avatar" style="background:#0284c7;">AY</div>
                <div>
                    <div class="testi-name">Amit Yadav</div>
                    <div class="testi-loc">Lucknow, Uttar Pradesh</div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ═════════════════════════════════════════════════════════════════════
     9. Frequently Asked Questions (Section 17 FAQ)
══════════════════════════════════════════════════════════════════════ -->
<section class="section-faq">
    <div class="section-header">
        <span class="section-badge">Help & Clarity</span>
        <h2 class="section-title">Frequently Asked Questions</h2>
        <p class="section-subtitle">Clear answers regarding platform operations and service guidelines.</p>
    </div>

    <div class="faq-container">
        <!-- Q1 -->
        <div class="faq-item active">
            <div class="faq-question" onclick="toggleFaq(this)">
                <span>1. Is Shram Sarathi Network an employer?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                No. Shram Sarathi Network operates strictly as a digital intermediary and service facilitation platform. It does not become an employer of independent service providers. The provider status, conduct, and responsibilities are governed by applicable arrangements, law, and service terms.
            </div>
        </div>

        <!-- Q2 -->
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFaq(this)">
                <span>2. Do I need the Mobile App?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                Operational booking, tracking, notifications, and ongoing service updates are primarily managed through the Shram Sarathi mobile application. However, you can submit inquiries, discover services, and request facilitation directly from this website.
            </div>
        </div>

        <!-- Q3 -->
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFaq(this)">
                <span>3. Who can become a service provider?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                Eligible labourers, skilled tradespeople (masons, carpenters, plumbers, electricians, painters, welders), commercial & private drivers, transport owners, and contractors can register through the applicable onboarding and verification process.
            </div>
        </div>

        <!-- Q4 -->
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFaq(this)">
                <span>4. Are contractor and vehicle transport services available?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                Yes. Contractor services for renovation/construction and transport services (taxi, auto, loader, pickup, goods carriers) are available in our operational zones including Sultanpur and expanding regional sectors.
            </div>
        </div>

        <!-- Q5 -->
        <div class="faq-item">
            <div class="faq-question" onclick="toggleFaq(this)">
                <span>5. Can I submit an inquiry from the website?</span>
                <i class="fa-solid fa-chevron-down"></i>
            </div>
            <div class="faq-answer">
                Yes! The website provides a direct Quick Inquiry form for requirements and lead generation. Once submitted, our team routes the request to verified providers and assists you promptly.
            </div>
        </div>
    </div>
</section>

@endsection

@push('scripts')
<script>
    // ─── Promotional Slider Controls ─────────────────────────────────
    let currentSlide = 0;
    let totalSlides = 8;
    let autoSlideTimer = null;

    function initSlider() {
        const slides = document.querySelectorAll('.slide');
        if (slides.length > 0) {
            totalSlides = slides.length;
        }
        const dotsContainer = document.getElementById('sliderDots');
        if (!dotsContainer) return;
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.onclick = () => goToSlide(i);
            dotsContainer.appendChild(dot);
        }
        startAutoSlide();
    }

    function updateSlider() {
        const track = document.getElementById('sliderTrack');
        if (!track) return;
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        document.querySelectorAll('.slider-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % totalSlides;
        updateSlider();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        updateSlider();
    }

    function goToSlide(index) {
        currentSlide = index;
        updateSlider();
        restartAutoSlide();
    }

    function startAutoSlide() {
        autoSlideTimer = setInterval(nextSlide, 5000);
    }

    function restartAutoSlide() {
        clearInterval(autoSlideTimer);
        startAutoSlide();
    }

    const sliderEl = document.getElementById('promoSlider');
    if (sliderEl) {
        sliderEl.addEventListener('mouseenter', () => clearInterval(autoSlideTimer));
        sliderEl.addEventListener('mouseleave', () => startAutoSlide());
    }

    document.addEventListener('DOMContentLoaded', initSlider);

    // ─── Quick Inquiry Helper & AJAX Submission ──────────────────────
    function selectServiceInquiry(serviceName, userType = 'Customer') {
        const serviceSelect = document.getElementById('inqService');
        if (serviceSelect) {
            serviceSelect.value = serviceName;
        }
        const userTypeSelect = document.getElementById('inqUserType');
        if (userTypeSelect && userType) {
            userTypeSelect.value = userType;
        }
        const inqSection = document.getElementById('inquiry');
        if (inqSection) {
            inqSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async function handleInquirySubmit(event) {
        event.preventDefault();
        const form = document.getElementById('quickInquiryForm');
        const alertBox = document.getElementById('inquiryAlert');
        const submitBtn = document.getElementById('btnSubmitInquiry');

        alertBox.style.display = 'none';
        alertBox.className = 'inquiry-alert';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        const formData = new FormData(form);

        try {
            const response = await fetch('{{ route("inquiry.submit") }}', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alertBox.className = 'inquiry-alert success';
                alertBox.innerHTML = `
                    <strong><i class="fa-solid fa-circle-check"></i> पूछताछ सफलतापूर्वक दर्ज हुई! (Inquiry Received)</strong><br>
                    ${result.message}<br>
                    <span style="display:inline-block; margin-top:6px; font-weight:bold; background:#dcfce7; padding:4px 8px; border-radius:6px;">
                        Reference No: ${result.reference_no}
                    </span>
                `;
                alertBox.style.display = 'block';
                form.reset();
                document.getElementById('inqConsent').checked = true;
            } else {
                throw new Error(result.message || 'Submission failed. Please check the fields and try again.');
            }
        } catch (error) {
            alertBox.className = 'inquiry-alert error';
            alertBox.innerHTML = `<strong><i class="fa-solid fa-triangle-exclamation"></i> Error:</strong> ${error.message}`;
            alertBox.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Send Inquiry</span> <i class="fa-solid fa-paper-plane"></i>';
        }
    }

    // ─── FAQ Toggle ──────────────────────────────────────────────────
    function toggleFaq(el) {
        const item = el.parentElement;
        item.classList.toggle('active');
    }
</script>
@endpush
