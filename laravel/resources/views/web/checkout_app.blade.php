<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Razorpay Payment — Shram Sarathi</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: #0b192c;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            text-align: center;
        }
        .card {
            background: #10223b;
            border: 1px solid #1e3a5f;
            border-radius: 20px;
            padding: 30px 24px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .logo-badge {
            width: 54px;
            height: 54px;
            background: rgba(249,115,22,0.2);
            border: 1px solid rgba(249,115,22,0.4);
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 26px;
            margin-bottom: 16px;
        }
        h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 6px; }
        p.subtitle { font-size: 0.88rem; color: #94a3b8; margin-bottom: 24px; }
        .amount-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .amount-label { font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .amount-val { font-size: 2rem; font-weight: 800; color: #f97316; margin-top: 4px; }
        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            background: #f97316;
            color: #ffffff;
            font-size: 1rem;
            font-weight: 700;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            margin-bottom: 12px;
            text-decoration: none;
        }
        .btn-cancel {
            background: transparent;
            color: #94a3b8;
            font-size: 0.9rem;
            border: 1px solid #1e3a5f;
        }
        .spinner {
            width: 28px;
            height: 28px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top-color: #f97316;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .splash-loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
        }
        .splash-icon {
            font-size: 42px;
            margin-bottom: 16px;
        }
        .splash-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
        }
        .splash-sub {
            font-size: 0.85rem;
            color: #94a3b8;
            margin-bottom: 20px;
        }
        .status-msg { font-size: 0.92rem; color: #cbd5e1; margin-top: 10px; }
        .card { display: none; }
    </style>
</head>
<body>

    <!-- Minimal Sleek Splash Screen behind Razorpay -->
    <div id="splashLoader" class="splash-loader">
        <div class="splash-icon">🛡️</div>
        <div class="splash-title">Shram Sarathi</div>
        <div class="splash-sub">सुरक्षित Razorpay गेटवे लोड हो रहा है...</div>
        <div class="spinner"></div>
    </div>

    <!-- Card is only displayed if payment fails or needs manual retry -->
    <div id="mainCard" class="card">
        <div class="logo-badge">💳</div>
        <h1>Shram Sarathi Payment</h1>
        <p class="subtitle">{{ $description ?? 'Service Booking / Wallet' }}</p>

        <div class="amount-box">
            <div class="amount-label">Amount Payable</div>
            <div class="amount-val">₹{{ number_format(((int)($amount ?? 1000)) / 100, 2) }}</div>
        </div>

        <div id="loadingBox">
            <div class="spinner"></div>
            <div class="status-msg" id="statusMsg">Opening Razorpay Gateway...</div>
        </div>

        <button id="payNowBtn" class="btn" style="display: none;" onclick="launchRazorpay()">
            Pay Now (पुनः प्रयास करें)
        </button>

        <button class="btn btn-cancel" onclick="cancelPayment()">
            Cancel / रद्द करें
        </button>
    </div>

    <script>
        const orderId = "{{ $order_id ?? '' }}";
        const keyId   = "{{ $key_id ?? env('RAZORPAY_KEY_ID') }}";
        const amount  = "{{ $amount ?? 1000 }}";
        const currency = "{{ $currency ?? 'INR' }}";
        const customerName = "{{ $customer_name ?? '' }}";
        const customerContact = "{{ $contact ?? '' }}";
        const customerEmail = "{{ $email ?? '' }}";
        const preferredMethod = "{{ request()->get('method', '') }}";

        function cancelPayment() {
            window.location.href = "shramsarathi://payment-cancel?order_id=" + encodeURIComponent(orderId);
        }

        function showErrorCard(msg) {
            document.getElementById('splashLoader').style.display = 'none';
            document.getElementById('mainCard').style.display = 'block';
            document.getElementById('statusMsg').innerText = msg;
            document.getElementById('loadingBox').style.display = "block";
            document.getElementById('payNowBtn').style.display = "block";
        }

        function launchRazorpay() {
            document.getElementById('statusMsg').innerText = "Opening Razorpay...";
            document.getElementById('loadingBox').style.display = "block";
            document.getElementById('payNowBtn').style.display = "none";

            const isCard = preferredMethod === 'card';

            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: 'Shram Sarathi Network',
                description: '{{ $description ?? "Payment" }}',
                order_id: orderId,
                prefill: (function() {
                    const p = {};
                    if (customerName && customerName.trim()) p.name = customerName.trim();
                    if (customerEmail && customerEmail.trim()) p.email = customerEmail.trim();
                    if (customerContact) {
                        const digits = customerContact.replace(/\D/g, '');
                        if (digits.length >= 10) {
                            p.contact = digits.slice(-10);
                        }
                    }
                    return p;
                })(),
                theme: {
                    color: '#F26333',
                    hide_topbar: true
                },
                config: {
                    display: {
                        blocks: {
                            card: {
                                name: "Pay via Debit / Credit Card",
                                instruments: [
                                    { method: "card" },
                                    { method: "netbanking" }
                                ]
                            },
                            upi: {
                                name: "Pay using UPI (PhonePe / GPay / Paytm)",
                                instruments: [
                                    {
                                        method: "upi",
                                        flows: ["intent", "qr", "collect"]
                                    }
                                ]
                            },
                            other: {
                                name: "Other Payment Modes",
                                instruments: [
                                    { method: "wallet" }
                                ]
                            }
                        },
                        sequence: isCard
                            ? ["block.card", "block.upi", "block.other"]
                            : ["block.upi", "block.card", "block.other"],
                        preferences: {
                            show_default_blocks: true
                        }
                    }
                },
                handler: async function (response) {
                    showErrorCard("Verifying Payment Signature...");
                    try {
                        const verifyRes = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok && verifyData.success) {
                            document.getElementById('statusMsg').innerText = "Payment Verified! Redirecting to App...";
                            const returnUrl = "shramsarathi://payment-success?" +
                                "order_id=" + encodeURIComponent(response.razorpay_order_id) +
                                "&payment_id=" + encodeURIComponent(response.razorpay_payment_id) +
                                "&signature=" + encodeURIComponent(response.razorpay_signature);
                            window.location.href = returnUrl;
                        } else {
                            showErrorCard("Verification failed: " + (verifyData.error || 'Signature mismatch'));
                        }
                    } catch (err) {
                        showErrorCard("Verification error: " + err.message);
                    }
                },
                modal: {
                    ondismiss: function () {
                        showErrorCard("Payment dismissed by user.");
                        window.location.href = "shramsarathi://payment-cancel?order_id=" + encodeURIComponent(orderId);
                    }
                }
            };

            try {
                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function (resp) {
                    showErrorCard("Payment Failed: " + (resp.error?.description || 'Error'));
                });
                rzp.open();
            } catch (e) {
                showErrorCard("Failed to launch Razorpay: " + e.message);
            }
        }

        // Auto launch when page loads
        window.addEventListener('load', function () {
            setTimeout(launchRazorpay, 300);
        });
    </script>
</body>
</html>
