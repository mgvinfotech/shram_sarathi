@extends('web.layouts.public')

@section('title', 'Shipping & Service Delivery Policy — Shram Sarathi Network')
@section('meta_description', 'Official Shipping and Service Delivery Policy for Shram Sarathi Network (श्रम सारथी नेटवर्क). Understand digital delivery timelines and on-site service fulfillment.')

@section('content')

<!-- ─── Hero ──────────────────────────────────────────────────────────── -->
<div class="policy-hero">
    <h1>Shipping & <span>Delivery Policy</span></h1>
    <p>Transparent guidelines regarding digital order confirmation and on-site fulfillment for services on Shram Sarathi Network.</p>
</div>

<!-- ─── Body ──────────────────────────────────────────────────────────── -->
<div class="policy-body">

    <div class="policy-meta-badge">
        <i class="fa-solid fa-truck-fast"></i>
        <span>Effective Date: September 2026 &nbsp;|&nbsp; Applicable Across All Network Operations</span>
    </div>

    <!-- 1. Nature of Services (No Physical Goods) -->
    <div class="policy-section">
        <h2><span class="num-badge">1</span> Nature of Service Delivery</h2>
        <p>
            <strong>Shram Sarathi Network (श्रम सारथी नेटवर्क)</strong> operates as a technology platform and digital intermediary connecting customers with independent blue-collar workers (Labour / मजदूर, Skilled Karigars / कारीगर, Commercial Drivers / चालक, and Contractors / ठेकेदार).
        </p>
        <p>
            <strong>No physical merchandise or tangible goods are shipped via courier or post.</strong> All platform interactions, booking facilitation, and digital invoices are delivered electronically, followed by on-site physical service execution by verified workers.
        </p>
    </div>

    <!-- 2. Digital Confirmation & Invoicing Timeline -->
    <div class="policy-section">
        <h2><span class="num-badge">2</span> Digital Delivery Timeline</h2>
        <p>
            Upon successful booking and payment of any applicable platform facilitation or advance fee:
        </p>
        <ul style="margin-left: 20px; line-height: 2; color: #475569;">
            <li><strong>Instant Digital Confirmation:</strong> Booking receipt and reference ID are generated instantly on-screen upon payment verification.</li>
            <li><strong>SMS / Notification Delivery:</strong> Booking acknowledgment with service partner details is sent within <strong>15 to 30 minutes</strong> via SMS, in-app notification, or official WhatsApp.</li>
            <li><strong>Digital Invoice / Receipt:</strong> Downloadable electronic GST/commercial invoice is immediately accessible under the customer's account dashboard.</li>
        </ul>
    </div>

    <!-- 3. On-Site Service Fulfillment -->
    <div class="policy-section">
        <h2><span class="num-badge">3</span> On-Site Physical Service Delivery</h2>
        <p>
            The physical performance of the requested service (e.g. construction labor, electrical wiring, plumbing, passenger/goods transport, masonry work) is fulfilled directly at the customer's designated site or location:
        </p>
        <ul style="margin-left: 20px; line-height: 2; color: #475569;">
            <li><strong>Immediate / On-Demand Bookings:</strong> The assigned service provider is dispatched to reach the customer site within <strong>45 to 90 minutes</strong> (subject to distance and local traffic conditions).</li>
            <li><strong>Scheduled / Advance Bookings:</strong> The service provider arrives at the customer's site punctually on the scheduled date and time slot selected during checkout.</li>
            <li><strong>Contractor Projects:</strong> Project deployment timelines and milestones are executed strictly as agreed in the Digital Work Agreement.</li>
        </ul>
    </div>

    <!-- 4. Shipping & Delivery Charges -->
    <div class="policy-section">
        <h2><span class="num-badge">4</span> Delivery Charges & Pricing</h2>
        <p>
            Because Shram Sarathi Network facilitates local services and digital matching, <strong>there are no courier or shipping charges applicable</strong>. Any platform facilitation fee, advance token, or transport distance charge (per km) is clearly displayed to the customer prior to payment and confirmation.
        </p>
    </div>

    <!-- 5. Non-Delivery or Delayed Arrival -->
    <div class="policy-section">
        <h2><span class="num-badge">5</span> Delayed Service or Non-Arrival</h2>
        <p>
            If an assigned service provider fails to arrive at the scheduled location within the committed window due to unforeseen circumstances:
        </p>
        <ul style="margin-left: 20px; line-height: 2; color: #475569;">
            <li>The customer can request an immediate replacement service provider through our platform.</li>
            <li>If replacement is not viable, any advance platform fee charged for the unfilled booking will be fully refunded to the original payment source within <strong>5 to 7 working days</strong> in accordance with our <a href="{{ url('/refund') }}" style="color: var(--orange); font-weight: 700;">Refund Policy</a>.</li>
        </ul>
    </div>

    <!-- 6. Contact for Delivery Assistance -->
    <div class="policy-section" style="background: var(--navy); color: #fff; text-align: center;">
        <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; color: #fff;">Questions Regarding Service Delivery?</h3>
        <p style="color: rgba(255,255,255,0.8); margin-bottom: 18px;">
            Our customer helpline and dispatch monitoring team is active 6 days a week to track service fulfillment.
        </p>
        <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
            <a href="tel:18001234567" style="background: var(--orange); color: #fff; padding: 10px 22px; border-radius: 8px; font-weight: 700; text-decoration: none;">
                <i class="fa-solid fa-phone"></i> Call 1800-123-4567
            </a>
            <a href="mailto:support@shramsarathinetwork.com" style="background: rgba(255,255,255,0.15); color: #fff; padding: 10px 22px; border-radius: 8px; font-weight: 700; text-decoration: none;">
                <i class="fa-solid fa-envelope"></i> support@shramsarathinetwork.com
            </a>
        </div>
    </div>

</div>

@endsection
