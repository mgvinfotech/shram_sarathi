<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="@yield('meta_description', 'Shram Sarathi Network (श्रम सारथी नेटवर्क) — India\'s digital intermediary & service facilitation platform connecting customers with verified Labour, Skilled Workers, Drivers, Contractors, and Transport services in Sultanpur, UP and across India.')">
    <meta name="keywords" content="Shram Sarathi Network, श्रम सारथी नेटवर्क, Labour booking, Majdoor, Karigar, Skilled Worker, Driver, Contractor, Transport, Sultanpur, Uttar Pradesh">
    <meta property="og:title" content="@yield('title', 'Shram Sarathi Network') | श्रम सारथी नेटवर्क">
    <meta property="og:description" content="@yield('meta_description', 'Digital Intermediary & Service Facilitation Platform — Right People for Every Work.')">
    <meta property="og:type" content="website">
    <meta property="og:image" content="{{ asset('images/logo.png') }}">
    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}">
    <title>@yield('title', 'Shram Sarathi Network') — श्रम सारथी नेटवर्क</title>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- FontAwesome Icons for clean SVG/Icon presentation -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        /* ─── CSS Reset & Root Variables ────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --navy-dark:   #07111e;
            --navy:        #0b192c;
            --navy-surface:#10223b;
            --navy-border: #1e3a5f;
            --orange:      #f97316;
            --orange-dark: #ea580c;
            --orange-light:#fff7ed;
            --orange-glow: rgba(249,115,22,0.22);
            --blue-accent: #0284c7;
            --green:       #16a34a;
            --dark:        #0f172a;
            --dark-2:      #1e293b;
            --text-main:   #1e293b;
            --text-muted:  #64748b;
            --text-light:  #94a3b8;
            --white:       #ffffff;
            --bg-body:     #f8fafc;
            --card-border: #e2e8f0;
            --radius-sm:   8px;
            --radius-md:   14px;
            --radius-lg:   22px;
            --shadow-sm:   0 2px 8px rgba(0,0,0,0.04);
            --shadow-md:   0 8px 24px rgba(11,25,44,0.08);
            --shadow-lg:   0 16px 40px rgba(11,25,44,0.14);

            /* Soft Pastel Badge & Card Theme Tokens (Page 9 Mockup Aesthetics) */
            --pastel-blue:    #f0f9ff;
            --pastel-emerald: #f0fdf4;
            --pastel-green:   #f0fdf4;
            --pastel-amber:   #fffbeb;
            --pastel-rose:    #fff1f2;
            --pastel-purple:  #faf5ff;
            --pastel-teal:    #f0fdfa;

            --accent-blue:    #0284c7;
            --accent-emerald: #16a34a;
            --accent-green:   #16a34a;
            --accent-amber:   #d97706;
            --accent-rose:    #e11d48;
            --accent-purple:  #9333ea;
            --accent-teal:    #0d9488;

            --p-blue-bg:    #f0f9ff;
            --p-blue-bd:    #bae6fd;
            --p-blue-tx:    #0369a1;
            --p-green-bg:   #f0fdf4;
            --p-green-bd:   #bbf7d0;
            --p-green-tx:   #15803d;
            --p-amber-bg:   #fffbeb;
            --p-amber-bd:   #fde68a;
            --p-amber-tx:   #b45309;
            --p-rose-bg:    #fff1f2;
            --p-rose-bd:    #fecdd3;
            --p-rose-tx:    #be123c;
            --p-purple-bg:  #faf5ff;
            --p-purple-bd:  #e9d5ff;
            --p-purple-tx:  #7e22ce;
            --p-teal-bg:    #f0fdfa;
            --p-teal-bd:    #99f6e4;
            --p-teal-tx:    #0f766e;
        }

        html { scroll-behavior: smooth; }

        body {
            font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, sans-serif;
            background: var(--bg-body);
            color: var(--text-main);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        a { text-decoration: none; color: inherit; transition: all 0.2s ease; }
        img { max-width: 100%; height: auto; display: block; }
        ul { list-style: none; }

        /* ─── Top Utility Bar ───────────────────────────────────────────── */
        .top-utility {
            background: var(--navy);
            color: rgba(255,255,255,0.85);
            font-size: 0.8125rem;
            padding: 8px 24px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .top-utility__inner {
            max-width: 1280px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
        }

        .top-utility__left {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }

        .top-utility__left i {
            color: var(--orange);
        }

        .top-utility__right {
            display: flex;
            align-items: center;
            gap: 20px;
        }

        .top-utility__link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: rgba(255,255,255,0.85);
            font-weight: 500;
        }

        .top-utility__link:hover {
            color: var(--orange);
        }

        .top-utility__link.whatsapp {
            color: #4ade80;
        }

        .top-utility__link.whatsapp:hover {
            color: #86efac;
        }

        .lang-switch {
            background: rgba(255,255,255,0.12);
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #fff;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.2);
            transition: background 0.2s;
        }

        .lang-switch:hover {
            background: var(--orange);
            border-color: var(--orange);
        }

        /* ─── Main Header / Sticky Navbar ───────────────────────────────── */
        .navbar {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--card-border);
            transition: box-shadow 0.25s ease;
        }

        .navbar__inner {
            max-width: 1440px;
            width: 100%;
            margin: 0 auto;
            height: 72px;
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            box-sizing: border-box;
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            flex-shrink: 0;
        }

        .brand-logo__img {
            height: 46px;
            width: auto;
            object-fit: contain;
            border-radius: 8px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.06));
        }

        .brand-logo__text {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
        }

        .brand-logo__name-en {
            font-size: 1.15rem;
            font-weight: 900;
            letter-spacing: -0.3px;
            color: var(--navy);
            text-transform: uppercase;
        }

        .brand-logo__name-hi {
            font-size: 0.78rem;
            font-weight: 800;
            color: var(--orange);
            font-family: 'Noto Sans Devanagari', sans-serif;
        }

        .brand-logo__sub {
            font-size: 0.58rem;
            font-weight: 600;
            color: var(--text-muted);
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }

        .navbar__nav {
            display: flex;
            align-items: center;
            gap: 2px;
            flex-wrap: nowrap;
        }

        .navbar__link {
            padding: 5px 8px;
            border-radius: var(--radius-sm);
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--dark-2);
            transition: all 0.2s;
            white-space: nowrap;
        }

        .navbar__link:hover,
        .navbar__link.active {
            color: var(--orange);
            background: var(--orange-light);
        }

        .navbar__actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
            white-space: nowrap;
        }

        .btn-search {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-body);
            color: var(--dark-2);
            border: 1px solid var(--card-border);
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
            box-sizing: border-box;
        }

        .btn-search:hover {
            color: var(--orange);
            background: var(--orange-light);
            border-color: rgba(249,115,22,0.3);
        }

        .btn-login {
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            font-size: 0.8125rem;
            font-weight: 600;
            color: var(--navy);
            border: 1.5px solid var(--navy);
            background: transparent;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
        }

        .btn-login:hover {
            background: var(--navy);
            color: #fff;
        }

        .btn-app {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%);
            color: #fff;
            padding: 7px 13px;
            border-radius: var(--radius-sm);
            font-size: 0.8125rem;
            font-weight: 700;
            box-shadow: 0 4px 14px var(--orange-glow);
            transition: transform 0.2s, box-shadow 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
            box-sizing: border-box;
        }

        .btn-app:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(249,115,22,0.35);
            color: #fff;
        }

        .mobile-hamburger {
            display: none;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--bg-body);
            border: 1px solid var(--card-border);
            color: var(--navy);
            font-size: 1.15rem;
            cursor: pointer;
            padding: 0;
            margin: 0;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            flex-shrink: 0;
            line-height: 1;
            box-sizing: border-box;
        }

        .mobile-hamburger:hover,
        .mobile-hamburger:active {
            background: var(--orange-light);
            color: var(--orange);
            border-color: rgba(249,115,22,0.3);
        }

        /* ─── Mobile Drawer ─────────────────────────────────────────────── */
        .mobile-drawer {
            display: none;
            position: fixed;
            top: 74px;
            left: 0;
            right: 0;
            background: #fff;
            border-bottom: 2px solid var(--orange);
            box-shadow: var(--shadow-lg);
            padding: 18px 20px;
            flex-direction: column;
            gap: 8px;
            z-index: 999;
            max-height: calc(100vh - 74px);
            overflow-y: auto;
            box-sizing: border-box;
        }

        .mobile-drawer.open {
            display: flex;
        }

        .mobile-drawer .navbar__link {
            padding: 10px 14px;
            font-size: 1rem;
            border-radius: var(--radius-sm);
        }

        .mobile-drawer__actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 10px;
            padding-top: 14px;
            border-top: 1px solid var(--card-border);
        }

        .mobile-drawer__actions .btn-app,
        .mobile-drawer__actions .btn-login {
            text-align: center;
            justify-content: center;
            width: 100%;
        }

        /* Sticky bottom action for mobile */
        .mobile-bottom-bar {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #fff;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.1);
            z-index: 998;
            padding: 10px 16px;
            display: flex;
            gap: 10px;
        }

        .mobile-bottom-bar a {
            flex: 1;
            text-align: center;
            padding: 12px 10px;
            border-radius: 10px;
            font-size: 0.875rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .mobile-bottom-bar a.btn-primary {
            background: var(--orange);
            color: #fff;
        }

        .mobile-bottom-bar a.btn-secondary {
            background: var(--navy);
            color: #fff;
        }

        @media (max-width: 1180px) {
            .navbar__nav,
            .navbar__actions .btn-login,
            .navbar__actions .btn-app {
                display: none !important;
            }
            .mobile-hamburger {
                display: flex !important;
            }
        }

        @media (min-width: 1181px) {
            .mobile-drawer {
                display: none !important;
            }
        }

        @media (max-width: 640px) {
            .navbar__inner {
                height: 64px;
                padding: 0 14px;
                gap: 8px;
            }
            .brand-logo {
                gap: 8px;
            }
            .brand-logo__img {
                height: 40px;
            }
            .brand-logo__name-en {
                font-size: 1.05rem;
            }
            .brand-logo__name-hi {
                font-size: 0.72rem;
            }
            .brand-logo__sub {
                display: none;
            }
            .navbar__actions {
                gap: 8px;
            }
            .btn-search,
            .mobile-hamburger {
                width: 36px;
                height: 36px;
                font-size: 1rem;
            }
            .mobile-drawer {
                top: 64px;
                max-height: calc(100vh - 64px);
            }
        }

        @media (max-width: 380px) {
            .brand-logo__name-en {
                font-size: 0.95rem;
            }
            .brand-logo__name-hi {
                display: none;
            }
        }

        @media (min-width: 769px) {
            .mobile-bottom-bar {
                display: none !important;
            }
        }

        /* ─── Footer ────────────────────────────────────────────────────── */
        .footer {
            background: var(--navy);
            color: rgba(255,255,255,0.85);
            padding: 70px 24px 30px;
            border-top: 3px solid var(--orange);
            position: relative;
        }

        .footer__inner {
            max-width: 1280px;
            margin: 0 auto;
        }

        .footer__grid {
            display: grid;
            grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.5fr;
            gap: 40px;
            margin-bottom: 50px;
        }

        @media (max-width: 1024px) {
            .footer__grid {
                grid-template-columns: 1fr 1fr;
                gap: 30px;
            }
        }

        @media (max-width: 640px) {
            .footer__grid {
                grid-template-columns: 1fr;
            }
        }

        .footer__brand-logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
        }

        .footer__brand-logo img {
            height: 52px;
            width: auto;
            background: #fff;
            padding: 4px;
            border-radius: 8px;
        }

        .footer__brand p {
            color: rgba(255,255,255,0.7);
            font-size: 0.9rem;
            line-height: 1.7;
            margin-bottom: 20px;
        }

        .footer__socials {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-top: 14px;
        }

        .footer__social-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255,255,255,0.08);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            border: 1px solid rgba(255,255,255,0.15);
            transition: all 0.25s;
        }

        .footer__social-btn:hover {
            background: var(--orange);
            border-color: var(--orange);
            color: #fff;
            transform: translateY(-3px);
        }

        .footer__social-btn.instagram:hover {
            background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%);
        }

        .footer__social-btn.facebook:hover {
            background: #1877f2;
        }

        .footer__social-btn.youtube:hover {
            background: #ff0000;
        }

        .footer__col h4 {
            color: #fff;
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 18px;
            position: relative;
            padding-bottom: 8px;
        }

        .footer__col h4::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 32px;
            height: 2px;
            background: var(--orange);
            border-radius: 2px;
        }

        .footer__col ul {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .footer__col ul li a {
            color: rgba(255,255,255,0.7);
            font-size: 0.875rem;
            transition: all 0.2s;
            display: inline-block;
        }

        .footer__col ul li a:hover {
            color: var(--orange);
            transform: translateX(4px);
        }

        .footer__contact-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            color: rgba(255,255,255,0.75);
            font-size: 0.875rem;
            margin-bottom: 14px;
        }

        .footer__contact-item i {
            color: var(--orange);
            margin-top: 4px;
            font-size: 1rem;
        }

        .footer__disclaimer {
            background: rgba(0,0,0,0.25);
            border-radius: var(--radius-sm);
            padding: 16px 20px;
            margin-bottom: 30px;
            border-left: 4px solid var(--orange);
            font-size: 0.8125rem;
            color: rgba(255,255,255,0.65);
            line-height: 1.6;
        }

        .footer__bottom {
            padding-top: 24px;
            border-top: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.8125rem;
            color: rgba(255,255,255,0.5);
            flex-wrap: wrap;
            gap: 12px;
        }

        /* ─── Policy / Content Pages Common Styling ─────────────────────── */
        .policy-hero {
            background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 100%);
            color: #fff;
            padding: 70px 24px 60px;
            text-align: center;
            position: relative;
        }

        .policy-hero h1 {
            font-size: clamp(2rem, 4vw, 3rem);
            font-weight: 900;
            letter-spacing: -0.5px;
            margin-bottom: 12px;
        }

        .policy-hero h1 span {
            color: var(--orange);
        }

        .policy-hero p {
            color: rgba(255,255,255,0.8);
            font-size: 1.05rem;
            max-width: 680px;
            margin: 0 auto;
        }

        .policy-body {
            max-width: 960px;
            margin: 50px auto 80px;
            padding: 0 24px;
        }

        .policy-meta-badge {
            background: var(--orange-light);
            border: 1px solid rgba(249,115,22,0.25);
            border-radius: var(--radius-sm);
            padding: 12px 18px;
            font-size: 0.85rem;
            color: var(--orange-dark);
            font-weight: 600;
            margin-bottom: 36px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .policy-section {
            background: #fff;
            border: 1px solid var(--card-border);
            border-radius: var(--radius-md);
            padding: 32px 36px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-sm);
        }

        .policy-section h2 {
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--navy);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .policy-section h2 .num-badge {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, var(--navy), var(--navy-surface));
            color: #fff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            font-weight: 800;
            flex-shrink: 0;
            border-left: 3px solid var(--orange);
        }

        .policy-section p {
            color: #475569;
            font-size: 0.95rem;
            line-height: 1.8;
            margin-bottom: 14px;
        }

        .policy-section ul {
            padding-left: 20px;
            margin-bottom: 14px;
        }

        .policy-section ul li {
            color: #475569;
            font-size: 0.95rem;
            line-height: 1.75;
            list-style: disc;
            margin-bottom: 8px;
        }

        .policy-section ul li::marker {
            color: var(--orange);
        }

        .alert-callout {
            background: #fef2f2;
            border: 1.5px solid #f87171;
            border-left-width: 6px;
            border-radius: var(--radius-sm);
            padding: 16px 20px;
            margin: 20px 0;
            color: #991b1b;
            font-size: 0.95rem;
            font-weight: 600;
            line-height: 1.6;
        }

        /* ─── Global Common Components (Shared Across All Pages) ─────────── */
        .section-header {
            max-width: 800px;
            margin: 0 auto 36px;
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

        .slide-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: var(--radius-sm);
            font-size: 0.925rem;
            font-weight: 700;
            transition: all 0.2s;
            text-decoration: none;
        }

        .slide-btn.primary {
            background: var(--orange);
            color: #fff;
            box-shadow: 0 4px 16px var(--orange-glow);
        }

        .slide-btn.primary:hover {
            background: var(--orange-dark);
            transform: translateY(-2px);
            color: #fff;
        }

        .slide-btn.secondary {
            background: rgba(255,255,255,0.15);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.3);
        }

        .slide-btn.secondary:hover {
            background: rgba(255,255,255,0.25);
            color: #fff;
        }

        /* ─── Join Network Pastel Category Cards ────────────────────────── */
        .join-grid-pastel {
            max-width: 1280px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 22px;
        }

        .join-card-pastel {
            background: #ffffff;
            border-radius: var(--radius-lg);
            padding: 26px 20px;
            box-shadow: var(--shadow-sm);
            border: 1.5px solid var(--card-border);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
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

        .join-card__icon {
            width: 54px;
            height: 54px;
            margin: 0 auto 14px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.35rem;
            color: #fff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }

        .join-card__btn-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 16px;
        }

        .btn-playstore-mini {
            background: #0f172a;
            color: #fff !important;
            font-size: 0.82rem;
            font-weight: 700;
            padding: 10px 14px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
        }

        .btn-playstore-mini:hover {
            background: #1e293b;
            color: #38bdf8 !important;
            transform: translateY(-1px);
        }

        .btn-apk-mini {
            background: #ffffff;
            color: #0f172a !important;
            border: 1px solid #cbd5e1;
            font-size: 0.8rem;
            font-weight: 700;
            padding: 8px 14px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            text-decoration: none;
            transition: all 0.2s;
        }

        .btn-apk-mini:hover {
            background: #f8fafc;
            border-color: #94a3b8;
        }
    </style>

    @stack('styles')
</head>
<body>

    <!-- ─── Top Utility Bar ───────────────────────────────────────────── -->
    <div class="top-utility">
        <div class="top-utility__inner">
            <div class="top-utility__left">
                <i class="fa-solid fa-location-dot"></i>
                <span>Sultanpur, Uttar Pradesh &nbsp;|&nbsp; <strong>भारत का भरोसेमंद स्थानीय सेवा नेटवर्क (India's Workforce Service Network)</strong></span>
            </div>
            <div class="top-utility__right">
                <a href="tel:+917084900909" class="top-utility__link">
                    <i class="fa-solid fa-phone"></i>
                    <span>Customer Care (IVR): <strong>+91 7084900909</strong></span>
                </a>
                <a href="https://wa.me/917084900909?text=Hello%20Shram%20Sarathi%20Network" target="_blank" rel="noopener noreferrer" class="top-utility__link whatsapp">
                    <i class="fa-brands fa-whatsapp"></i>
                    <span>WhatsApp Support</span>
                </a>
                <span class="lang-switch" id="langSwitchBtn" onclick="toggleLanguageMode()">
                    <i class="fa-solid fa-globe"></i>
                    <span id="langSwitchText">हिंदी / English</span>
                </span>
            </div>
        </div>
    </div>

    <!-- ─── Sticky Navbar ─────────────────────────────────────────────── -->
    <nav class="navbar" id="navbar">
        <div class="navbar__inner">
            <a href="{{ url('/') }}" class="brand-logo">
                <img src="{{ asset('images/logo.png') }}" alt="Shram Sarathi Network Logo" class="brand-logo__img">
                <div class="brand-logo__text">
                    <span class="brand-logo__name-en">Shram Sarathi Network</span>
                    <span class="brand-logo__name-hi">श्रम सारथी नेटवर्क</span>
                    <span class="brand-logo__sub">Digital Intermediary Platform</span>
                </div>
            </a>

            <!-- Desktop Menu -->
            <div class="navbar__nav">
                <a href="{{ url('/') }}" class="navbar__link {{ request()->is('/') ? 'active' : '' }}">Home</a>
                <a href="{{ url('/about') }}" class="navbar__link {{ request()->is('about') ? 'active' : '' }}">About Us</a>
                <a href="{{ url('/services') }}" class="navbar__link {{ request()->is('services') ? 'active' : '' }}">Services</a>
                <a href="{{ url('/how-it-works') }}" class="navbar__link {{ request()->is('how-it-works') ? 'active' : '' }}">How It Works</a>
                <a href="{{ url('/pricing') }}" class="navbar__link {{ request()->is('pricing') ? 'active' : '' }}">Pricing</a>
                <a href="{{ url('/join-network') }}" class="navbar__link {{ request()->is('join-network') ? 'active' : '' }}">Join Network</a>
                <a href="{{ url('/faq') }}" class="navbar__link {{ request()->is('faq') ? 'active' : '' }}">FAQ</a>
                <a href="{{ url('/contact') }}" class="navbar__link {{ request()->is('contact') ? 'active' : '' }}">Contact</a>
            </div>

            <!-- Actions -->
            <div class="navbar__actions">
                <a href="{{ url('/#inquiry') }}" class="btn-search" title="Quick Search & Inquiry">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-login">
                    <i class="fa-brands fa-google-play" style="color:var(--orange); margin-right:4px;"></i> App
                </a>
                <a href="{{ url('/#inquiry') }}" class="btn-app" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                    <i class="fa-solid fa-calendar-check"></i>
                    <span>Book Online</span>
                </a>
                <button class="mobile-hamburger" id="hamburgerBtn" onclick="toggleMobileMenu()" aria-label="Toggle navigation">
                    <i class="fa-solid fa-bars"></i>
                </button>
            </div>
        </div>

        <!-- Mobile Drawer -->
        <div class="mobile-drawer" id="mobileDrawer">
            <a href="{{ url('/') }}" class="navbar__link {{ request()->is('/') ? 'active' : '' }}" onclick="closeMobileMenu()">Home / होम</a>
            <a href="{{ url('/about') }}" class="navbar__link {{ request()->is('about') ? 'active' : '' }}" onclick="closeMobileMenu()">About Us / परिचय</a>
            <a href="{{ url('/services') }}" class="navbar__link {{ request()->is('services') ? 'active' : '' }}" onclick="closeMobileMenu()">Our Services / सेवाएं</a>
            <a href="{{ url('/how-it-works') }}" class="navbar__link {{ request()->is('how-it-works') ? 'active' : '' }}" onclick="closeMobileMenu()">How It Works / कार्यप्रणाली</a>
            <a href="{{ url('/pricing') }}" class="navbar__link {{ request()->is('pricing') ? 'active' : '' }}" onclick="closeMobileMenu()">Pricing & Tariffs / शुल्क सूची</a>
            <a href="{{ url('/join-network') }}" class="navbar__link {{ request()->is('join-network') ? 'active' : '' }}" onclick="closeMobileMenu()">Join as Worker / कामगार पंजीकरण</a>
            <a href="{{ url('/faq') }}" class="navbar__link {{ request()->is('faq') ? 'active' : '' }}" onclick="closeMobileMenu()">FAQ / सवाल-जवाब</a>
            <a href="{{ url('/blog') }}" class="navbar__link {{ request()->is('blog') ? 'active' : '' }}" onclick="closeMobileMenu()">Blog & Updates / ब्लॉग</a>
            <a href="{{ url('/careers') }}" class="navbar__link {{ request()->is('careers') ? 'active' : '' }}" onclick="closeMobileMenu()">Careers / करियर</a>
            <a href="{{ url('/contact') }}" class="navbar__link {{ request()->is('contact') ? 'active' : '' }}" onclick="closeMobileMenu()">Contact & Support / संपर्क</a>
            <div class="mobile-drawer__actions">
                <a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener" class="btn-login">
                    <i class="fa-brands fa-google-play" style="color:var(--orange);"></i> Download on Google Play
                </a>
                <a href="{{ url('/#inquiry') }}" class="btn-app" onclick="closeMobileMenu()">📅 Book Services Online</a>
            </div>
        </div>
    </nav>

    <!-- ─── Main Content ──────────────────────────────────────────────── -->
    <main class="main-content">
        @yield('content')
    </main>

    <!-- ─── Footer ────────────────────────────────────────────────────── -->
    <footer class="footer" id="contact">
        <div class="footer__inner">
            <div class="footer__disclaimer">
                <strong><i class="fa-solid fa-shield-halved"></i> Statutory Intermediary Disclosure / विधिक प्रकटीकरण:</strong><br>
                Shram Sarathi Network acts as a digital intermediary/service facilitation platform designed to connect customers with independent labour, skilled workers, drivers, contractors, and vehicle/transport service providers. Shram Sarathi Network does not, merely by providing the platform, become the employer of independent service providers, subject to applicable law and terms governing the particular service.
            </div>

            <div class="footer__grid">
                <!-- Brand & Mission -->
                <div class="footer__brand">
                    <a href="{{ url('/') }}" class="footer__brand-logo">
                        <img src="{{ asset('images/logo.png') }}" alt="Shram Sarathi Network Logo">
                        <div style="display:flex; flex-direction:column; line-height:1.2;">
                            <span style="font-size:1.15rem; font-weight:900; color:#fff; text-transform:uppercase;">Shram Sarathi Network</span>
                            <span style="font-size:0.85rem; font-weight:700; color:var(--orange);">श्रम सारथी नेटवर्क</span>
                        </div>
                    </a>
                    <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:30px; padding:6px 14px; font-size:0.75rem; color:#fed7aa; margin:4px 0 14px;">
                        <i class="fa-solid fa-award" style="color:var(--orange);"></i>
                        <span><strong>M/S Shram Sarathi Network</strong> &bull; A Registered Enterprise under MSME / Govt. Guidelines</span>
                    </div>
                    <p>
                        <strong>Right People. Better Work. A Stronger India.</strong><br>
                        “Right to Work for Every People” — Connecting people to work, skills with opportunities, and customers with verified local service providers.
                    </p>
                    <div class="footer__socials">
                        <a href="https://www.instagram.com/shramsarathinetwork?utm_source=qr&stkn=MWZieTV5dTY1eDMxeA==" target="_blank" rel="noopener noreferrer" class="footer__social-btn instagram" title="Follow us on Instagram">
                            <i class="fa-brands fa-instagram"></i>
                        </a>
                        <a href="https://www.facebook.com/share/1FK4ZwiMrK/" target="_blank" rel="noopener noreferrer" class="footer__social-btn facebook" title="Connect on Facebook">
                            <i class="fa-brands fa-facebook-f"></i>
                        </a>
                        <a href="https://youtube.com/@shramsarathinetwork?si=JZ1UkWw0YfKBNk4y" target="_blank" rel="noopener noreferrer" class="footer__social-btn youtube" title="Watch on YouTube">
                            <i class="fa-brands fa-youtube"></i>
                        </a>
                    </div>
                </div>

                <!-- Quick Links (12-Page Architecture) -->
                <div class="footer__col">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="{{ url('/') }}">Home / मुख्य पृष्ठ</a></li>
                        <li><a href="{{ url('/about') }}">About Us / हमारे बारे में</a></li>
                        <li><a href="{{ url('/services') }}">Our Services / सेवाएं</a></li>
                        <li><a href="{{ url('/how-it-works') }}">How It Works / प्रक्रिया</a></li>
                        <li><a href="{{ url('/join-network') }}">Join Network / कामगार जुड़ें</a></li>
                        <li><a href="{{ url('/pricing') }}">Pricing & Rate Card / दर सूची</a></li>
                        <li><a href="{{ url('/faq') }}">FAQ / सवाल-जवाब</a></li>
                        <li><a href="{{ url('/blog') }}">Blog & Updates / ब्लॉग</a></li>
                        <li><a href="{{ url('/careers') }}">Careers / करियर</a></li>
                        <li><a href="{{ url('/contact') }}">Contact Us / संपर्क</a></li>
                    </ul>
                </div>

                <!-- Comprehensive Services -->
                <div class="footer__col">
                    <h4>Our Services</h4>
                    <ul>
                        <li><a href="{{ url('/services#labour') }}">मजदूर | Labour</a></li>
                        <li><a href="{{ url('/services#karigar') }}">कारीगर | Skilled Worker</a></li>
                        <li><a href="{{ url('/services#driver') }}">ड्राइवर | Driver Services</a></li>
                        <li><a href="{{ url('/services#transport') }}">वाहन एवं परिवहन | Transport</a></li>
                        <li><a href="{{ url('/services#contractor') }}">ठेकेदार | Contractor</a></li>
                        <li><a href="{{ url('/services#construction-material') }}">निर्माण सामग्री | Construction Material</a></li>
                        <li><a href="{{ url('/services#agriculture-material') }}">कृषि सामग्री | Agriculture Material</a></li>
                        <li><a href="{{ url('/services#special-events') }}">स्पेशल इवेंट्स | Event Bookings</a></li>
                    </ul>
                </div>

                <!-- Join Network -->
                <div class="footer__col">
                    <h4>Join Network</h4>
                    <ul>
                        <li><a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener">Join as Labour</a></li>
                        <li><a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener">Join as Skilled Worker</a></li>
                        <li><a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener">Join as Driver</a></li>
                        <li><a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener">Join as Contractor</a></li>
                        <li><a href="https://play.google.com/store/apps/details?id=com.shramsarathi.app" target="_blank" rel="noopener">Join as Vehicle Owner</a></li>
                        <li><a href="{{ url('/join-network') }}">Become a Digital Partner</a></li>
                        <li><a href="javascript:void(0);" onclick="return false;" style="cursor: default;" title="Direct APK जल्द उपलब्ध होगा">Direct APK Download</a></li>
                    </ul>
                </div>

                <!-- Support & Contact -->
                <div class="footer__col">
                    <h4>Contact & Support</h4>
                    <div class="footer__contact-item">
                        <i class="fa-solid fa-phone"></i>
                        <div>
                            <strong>Customer Care (IVR):</strong><br>
                            <a href="tel:+917084900909" style="color:var(--orange); font-weight:700;">+91 7084900909</a><br>
                            <small>(24x7 Digital Telephony Desk)</small>
                        </div>
                    </div>
                    <div class="footer__contact-item">
                        <i class="fa-brands fa-whatsapp"></i>
                        <div>
                            <strong>WhatsApp Desk:</strong><br>
                            <a href="https://wa.me/917084900909?text=Hello%20Shram%20Sarathi%20Network" target="_blank" rel="noopener noreferrer" style="color:#4ade80;">+91 7084900909</a>
                        </div>
                    </div>
                    <div class="footer__contact-item">
                        <i class="fa-solid fa-envelope"></i>
                        <div>
                            <strong>Official Support Email:</strong><br>
                            <a href="mailto:support@shramsarathinetwork.com" style="color:#38bdf8; word-break:break-all;">support@shramsarathinetwork.com</a>
                        </div>
                    </div>
                    <div class="footer__contact-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <div>
                            <strong>Registered Office:</strong><br>
                            Sultanpur, Uttar Pradesh, India - 228001
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Legal Bar -->
            <div class="footer__bottom">
                <div>
                    © 2026 <strong>Shram Sarathi Network (श्रम सारथी नेटवर्क)</strong>. All Rights Reserved.
                </div>
                <div style="display:flex; gap:14px; flex-wrap:wrap; justify-content:center; align-items:center;">
                    <a href="{{ url('/terms') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Terms & Conditions</a>
                    <span>•</span>
                    <a href="{{ url('/privacy') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Privacy Policy</a>
                    <span>•</span>
                    <a href="{{ url('/refund') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Refund & Cancellation</a>
                    <span>•</span>
                    <a href="{{ url('/shipping') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Shipping & Delivery</a>
                    <span>•</span>
                    <a href="{{ url('/pricing') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Pricing & Rates</a>
                    <span>•</span>
                    <a href="{{ url('/faq') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">FAQ</a>
                    <span>•</span>
                    <a href="{{ url('/blog') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Blog</a>
                    <span>•</span>
                    <a href="{{ url('/careers') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Careers</a>
                    <span>•</span>
                    <a href="{{ url('/contact') }}" style="color:rgba(255,255,255,0.85); text-decoration:underline;">Contact & Grievance</a>
                </div>
                <div style="width:100%; text-align:center; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-top:10px;">
                    M/S Shram Sarathi Network &bull; A Registered Enterprise under MSME / Govt. Guidelines.<br>
                    Hyperlocal Blue-Collar & Construction Workforce Marketplace Platform.<br>
                    Registered Office: Sultanpur, Uttar Pradesh - 228001, India. All digital payments processed securely.
                </div>
            </div>
        </div>
    </footer>

    <!-- ─── Mobile Sticky Bottom Action Bar ───────────────────────────── -->
    <div class="mobile-bottom-bar">
        <a href="{{ url('/#inquiry') }}" class="btn-primary">
            <i class="fa-solid fa-calendar-check"></i> Book / Inquiry
        </a>
        <a href="{{ url('/#join-network') }}" class="btn-secondary">
            <i class="fa-solid fa-user-plus"></i> Join Network
        </a>
    </div>

    <!-- Scripts -->
    <script>
        function toggleMobileMenu() {
            const drawer = document.getElementById('mobileDrawer');
            const btn = document.getElementById('hamburgerBtn');
            const isOpen = drawer.classList.toggle('open');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
                }
            }
        }

        function closeMobileMenu() {
            const drawer = document.getElementById('mobileDrawer');
            const btn = document.getElementById('hamburgerBtn');
            if (drawer && drawer.classList.contains('open')) {
                drawer.classList.remove('open');
                if (btn) {
                    const icon = btn.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-bars';
                }
            }
        }

        function handleStaticLogin(e) {
            if (e) e.preventDefault();
            showLoginToast('📲 Customer & Partner login is available in the Shram Sarathi Mobile App. Download below!');
            const downloadSec = document.getElementById('download');
            if (downloadSec) {
                downloadSec.scrollIntoView({ behavior: 'smooth' });
            }
            closeMobileMenu();
        }

        function showLoginToast(msg) {
            let toast = document.getElementById('webToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'webToast';
                toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0b192c;color:#fff;padding:12px 24px;border-radius:50px;box-shadow:0 10px 30px rgba(0,0,0,0.35);font-size:0.9rem;font-weight:600;z-index:99999;transition:opacity 0.3s ease;border:1.5px solid #f97316;display:flex;align-items:center;gap:10px;text-align:center;max-width:90%;';
                document.body.appendChild(toast);
            }
            toast.innerHTML = '<i class="fa-solid fa-mobile-screen-button" style="color:#f97316;font-size:1.1rem;"></i> ' + msg;
            toast.style.opacity = '1';
            toast.style.display = 'flex';
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => { if (toast.style.opacity === '0') toast.style.display = 'none'; }, 300);
            }, 4000);
        }

        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if (window.scrollY > 20) {
                nav.style.boxShadow = '0 6px 24px rgba(11,25,44,0.1)';
            } else {
                nav.style.boxShadow = 'none';
            }
        });

        // Simple Language Toggle indicator
        let currentLang = 'en';
        function toggleLanguageMode() {
            currentLang = currentLang === 'en' ? 'hi' : 'en';
            const switchText = document.getElementById('langSwitchText');
            if (currentLang === 'hi') {
                switchText.textContent = 'English में देखें';
                document.querySelectorAll('[data-hi]').forEach(el => {
                    if (!el.dataset.en) el.dataset.en = el.textContent;
                    el.textContent = el.dataset.hi;
                });
            } else {
                switchText.textContent = 'हिंदी में देखें';
                document.querySelectorAll('[data-en]').forEach(el => {
                    el.textContent = el.dataset.en;
                });
            }
        }
    </script>

    <!-- MyOperator WhatsApp Chat Widget -->
    <script>
        var myopWidgetOption = {
            brandColor: "#2bbcca",
            headerText: "Chat With Us",
            position: "br",
            chatButton: "w",
            showQR: true,
            qrCodeUri: "https://t.heyo.bot/8rhrn77",
        };
    </script>
    <script async src="https://widget.myoperator.com/js/inject.js"></script>

    <style>
        /* Ensure MyOperator WhatsApp widget floats cleanly above mobile bottom bar */
        iframe[src*="widget.myoperator.com"],
        iframe[src*="heyo.bot"] {
            z-index: 99999 !important;
            transition: bottom 0.25s ease;
        }
        @media (max-width: 768px) {
            iframe[src*="widget.myoperator.com"],
            iframe[src*="heyo.bot"] {
                bottom: 68px !important;
            }
        }
    </style>

    <script>
        // Adjust WhatsApp widget position on mobile devices so it doesn't overlap the action bar
        function adjustMyopWidgetPosition() {
            var ifr = document.querySelector('iframe[src*="widget.myoperator.com"], iframe[src*="heyo.bot"]');
            if (ifr) {
                if (window.innerWidth <= 768) {
                    ifr.style.setProperty('bottom', '68px', 'important');
                } else {
                    ifr.style.setProperty('bottom', '0px', 'important');
                }
            }
        }
        window.addEventListener('resize', adjustMyopWidgetPosition);
        var myopObserver = new MutationObserver(function() {
            adjustMyopWidgetPosition();
        });
        myopObserver.observe(document.body, { childList: true, subtree: true });
        setInterval(adjustMyopWidgetPosition, 1000);
    </script>

    @stack('scripts')
</body>
</html>
