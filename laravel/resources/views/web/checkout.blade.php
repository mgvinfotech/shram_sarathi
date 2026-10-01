@extends('web.layouts.public')

@section('title', 'Razorpay Standard Checkout — Shram Sarathi Network')
@section('meta_description', 'Secure online payments via Razorpay Standard Checkout on Shram Sarathi Network.')

@section('content')

<!-- Razorpay Standard Checkout Script -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>

<div class="policy-hero" style="padding: 48px 24px 36px;">
    <h1>Secure <span>Online Checkout</span></h1>
    <p>Razorpay Standard Web Checkout Integration — सुरक्षित एवं त्वरित ऑनलाइन भुगतान</p>
</div>

<div class="policy-body" style="max-width: 820px; margin: 0 auto; padding: 32px 20px;">

    <!-- Payment Container Card -->
    <div style="background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(11,25,44,0.06); overflow: hidden;">
        
        <!-- Card Header -->
        <div style="background: linear-gradient(135deg, #0b192c, #10223b); color: #fff; padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 14px;">
                <div style="width: 44px; height: 44px; background: rgba(249,115,22,0.2); border: 1px solid rgba(249,115,22,0.4); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #f97316; font-size: 20px;">
                    <i class="fa-solid fa-shield-halved"></i>
                </div>
                <div>
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">Payment / भुगतान</h2>
                    <p style="font-size: 0.82rem; color: #94a3b8; margin: 2px 0 0;">256-Bit SSL Encrypted & RBI Authorized Gateway</p>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.08); padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; color: #e2e8f0;">
                <i class="fa-solid fa-lock" style="color: #22c55e;"></i>
                <span>Razorpay Standard Web</span>
            </div>
        </div>

        <!-- Card Body -->
        <div style="padding: 28px;">

            <!-- Alert Boxes for Live Feedback -->
            <div id="checkoutAlertError" style="display: none; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; font-size: 0.92rem;">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa-solid fa-circle-exclamation" style="margin-top: 3px; font-size: 1.1rem;"></i>
                    <div id="checkoutAlertErrorMessage">An error occurred during checkout.</div>
                </div>
            </div>

            <div id="checkoutAlertNotice" style="display: none; background: #fffbeb; border: 1px solid #fde68a; color: #b45309; padding: 14px 18px; border-radius: 10px; margin-bottom: 20px; font-size: 0.92rem;">
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <i class="fa-solid fa-circle-info" style="margin-top: 3px; font-size: 1.1rem;"></i>
                    <div id="checkoutAlertNoticeMessage">Payment was cancelled or closed.</div>
                </div>
            </div>

            <div id="checkoutAlertSuccess" style="display: none; background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <i class="fa-solid fa-circle-check" style="margin-top: 3px; font-size: 1.3rem; color: #16a34a;"></i>
                    <div>
                        <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 6px;">Payment Successful & Verified!</h3>
                        <p style="margin: 0 0 10px; font-size: 0.88rem; color: #166534;">
                            Aapka payment safaltapoorvak receive ho gaya hai aur backend HMAC-SHA256 signature verify ho chuka hai.
                        </p>
                        <div style="background: rgba(255,255,255,0.7); padding: 10px 14px; border-radius: 8px; font-family: monospace; font-size: 0.82rem; color: #1e293b; border: 1px solid #dcfce7;">
                            <div><strong>Payment ID:</strong> <span id="successPaymentId">—</span></div>
                            <div><strong>Order ID:</strong> <span id="successOrderId">—</span></div>
                            <div><strong>Verification:</strong> <span style="color: #16a34a; font-weight: 600;">✓ HMAC-SHA256 Matched</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Checkout Form -->
            <form id="checkoutForm" onsubmit="event.preventDefault(); initiateRazorpayCheckout();">
                
                <!-- Amount Selection -->
                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 600; font-size: 0.92rem; color: #1e293b; margin-bottom: 8px;">
                        Payment Amount / राशि (₹ INR) <span style="color: #ef4444;">*</span>
                    </label>
                    
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap;">
                        <button type="button" class="amt-preset-btn" onclick="setAmount(10)" style="flex: 1; min-width: 70px; padding: 8px 14px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; font-weight: 600; cursor: pointer;">₹10</button>
                        <button type="button" class="amt-preset-btn" onclick="setAmount(50)" style="flex: 1; min-width: 70px; padding: 8px 14px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; font-weight: 600; cursor: pointer;">₹50</button>
                        <button type="button" class="amt-preset-btn" onclick="setAmount(100)" style="flex: 1; min-width: 70px; padding: 8px 14px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; font-weight: 600; cursor: pointer;">₹100</button>
                        <button type="button" class="amt-preset-btn" onclick="setAmount(500)" style="flex: 1; min-width: 70px; padding: 8px 14px; border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 8px; font-weight: 600; cursor: pointer;">₹500</button>
                    </div>

                    <div style="position: relative;">
                        <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 700; color: #64748b; font-size: 1.1rem;">₹</span>
                        <input type="number" id="payAmount" name="amount" min="1" step="1" value="10" required
                               style="width: 100%; padding: 12px 14px 12px 34px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 1.1rem; font-weight: 700; color: #0b192c; outline: none; box-sizing: border-box;">
                    </div>
                    <small style="display: block; margin-top: 6px; color: #64748b; font-size: 0.8rem;">
                        Minimum amount is ₹1 (100 paise). Real or test amount will be converted to paise automatically.
                    </small>
                </div>

                <!-- Customer Details Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div>
                        <label style="display: block; font-weight: 600; font-size: 0.88rem; color: #1e293b; margin-bottom: 6px;">
                            Full Name / नाम
                        </label>
                        <input type="text" id="custName" placeholder="e.g. Ramesh Kumar" value="Customer Test"
                               style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; color: #1e293b; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; font-size: 0.88rem; color: #1e293b; margin-bottom: 6px;">
                            Mobile Number / मोबाइल
                        </label>
                        <input type="tel" id="custPhone" placeholder="10-digit mobile" value="9876543210"
                               style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; color: #1e293b; outline: none; box-sizing: border-box;">
                    </div>
                </div>

                <div style="margin-bottom: 26px;">
                    <label style="display: block; font-weight: 600; font-size: 0.88rem; color: #1e293b; margin-bottom: 6px;">
                        Email Address (Optional)
                    </label>
                    <input type="email" id="custEmail" placeholder="e.g. customer@example.com" value="customer@shramsarathi.in"
                           style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; color: #1e293b; outline: none; box-sizing: border-box;">
                </div>

                <!-- Pay Button -->
                <button type="submit" id="payButton"
                        style="width: 100%; padding: 14px 20px; background: #f97316; color: #ffffff; border: none; border-radius: 12px; font-size: 1.05rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(249,115,22,0.35); transition: background 0.2s;">
                    <i class="fa-solid fa-credit-card"></i>
                    <span id="payButtonText">Proceed to Pay ₹10</span>
                </button>

            </form>

            <!-- Payment Methods Info -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 14px; color: #64748b; font-size: 1.1rem;">
                    <i class="fa-brands fa-google-pay" title="Google Pay"></i>
                    <i class="fa-solid fa-mobile-screen-button" title="UPI Apps"></i>
                    <i class="fa-brands fa-cc-visa" title="Visa"></i>
                    <i class="fa-brands fa-cc-mastercard" title="Mastercard"></i>
                    <i class="fa-solid fa-building-columns" title="Netbanking"></i>
                </div>
                <div style="font-size: 0.8rem; color: #94a3b8;">
                    Powered by <strong style="color: #0b192c;">Razorpay</strong> Standard Checkout
                </div>
            </div>

        </div>

    </div>

    <!-- Technical Integration Summary Section -->
    <div style="margin-top: 36px; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 24px;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #0b192c; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-code" style="color: #f97316;"></i>
            <span>Integration Architecture (3-Step Standard Web Flow)</span>
        </h3>
        <ol style="margin: 0; padding-left: 20px; font-size: 0.88rem; color: #475569; line-height: 1.8;">
            <li><strong>Step 1 (Order Creation):</strong> Frontend calls <code>POST /api/create-order</code> with amount in paise (minimum 100 paise = ₹1). Backend connects to Razorpay API and returns <code>order_id</code>.</li>
            <li><strong>Step 2 (Checkout Modal):</strong> Razorpay Standard JS (<code>checkout.js</code>) opens payment popup with UPI, Cards, Netbanking & Wallets.</li>
            <li><strong>Step 3 (Signature Verification):</strong> On payment completion, <code>razorpay_order_id</code>, <code>razorpay_payment_id</code>, and <code>razorpay_signature</code> are posted to <code>POST /api/verify-payment</code> which verifies the HMAC-SHA256 signature using the secret key.</li>
        </ol>
    </div>

</div>

<!-- JavaScript Integration Logic -->
<script>
    const payAmountInput = document.getElementById('payAmount');
    const payButtonText  = document.getElementById('payButtonText');
    const payButton      = document.getElementById('payButton');

    // Update button text when amount changes
    payAmountInput.addEventListener('input', function() {
        const val = this.value || 0;
        payButtonText.innerText = 'Proceed to Pay ₹' + val;
    });

    function setAmount(amount) {
        payAmountInput.value = amount;
        payButtonText.innerText = 'Proceed to Pay ₹' + amount;
    }

    function hideAlerts() {
        document.getElementById('checkoutAlertError').style.display = 'none';
        document.getElementById('checkoutAlertNotice').style.display = 'none';
        document.getElementById('checkoutAlertSuccess').style.display = 'none';
    }

    function showError(message) {
        hideAlerts();
        document.getElementById('checkoutAlertErrorMessage').innerText = message;
        document.getElementById('checkoutAlertError').style.display = 'block';
    }

    function showNotice(message) {
        hideAlerts();
        document.getElementById('checkoutAlertNoticeMessage').innerText = message;
        document.getElementById('checkoutAlertNotice').style.display = 'block';
    }

    function showSuccess(response, verifyData) {
        hideAlerts();
        document.getElementById('successPaymentId').innerText = response.razorpay_payment_id || '—';
        document.getElementById('successOrderId').innerText = response.razorpay_order_id || '—';
        document.getElementById('checkoutAlertSuccess').style.display = 'block';
    }

    function setLoading(isLoading, text = 'Processing...') {
        if (isLoading) {
            payButton.disabled = true;
            payButton.style.opacity = '0.7';
            payButton.style.cursor = 'not-allowed';
            payButtonText.innerText = text;
        } else {
            payButton.disabled = false;
            payButton.style.opacity = '1';
            payButton.style.cursor = 'pointer';
            payButtonText.innerText = 'Proceed to Pay ₹' + payAmountInput.value;
        }
    }

    async function initiateRazorpayCheckout() {
        hideAlerts();
        const inrAmount = parseFloat(payAmountInput.value);

        if (isNaN(inrAmount) || inrAmount < 1) {
            showError('Please enter a valid amount of at least ₹1 (100 paise).');
            return;
        }

        const amountPaise = Math.round(inrAmount * 100);
        const name    = document.getElementById('custName').value.trim();
        const phone   = document.getElementById('custPhone').value.trim();
        const email   = document.getElementById('custEmail').value.trim();

        // ── STEP 1: Backend Create Order ─────────────────────────────────────
        setLoading(true, 'Creating Order...');

        let orderData;
        try {
            const res = await fetch('/api/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    amount: amountPaise,
                    currency: 'INR',
                    receipt: 'web_rcpt_' + Date.now()
                })
            });

            orderData = await res.json();

            if (!res.ok || !orderData.order_id) {
                const errMsg = orderData.message || orderData.error || 'Failed to create Razorpay order.';
                showError('Error (' + res.status + '): ' + errMsg);
                setLoading(false);
                return;
            }
        } catch (netErr) {
            showError('Network error while connecting to order endpoint: ' + netErr.message);
            setLoading(false);
            return;
        }

        // ── STEP 2: Open Razorpay Standard Checkout Modal ───────────────────
        setLoading(true, 'Waiting for payment...');

        const razorpayKey = orderData.key_id || '{{ $razorpayKey }}';

        let cleanPhone = phone.replace(/\D/g, ''); // remove non-digits
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
            cleanPhone = cleanPhone.substring(2); // strip leading 91
        } else if (cleanPhone.length > 10 && cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1); // strip leading 0
        }

        const options = {
            key: razorpayKey,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'Shram Sarathi Network',
            description: 'Standard Web Checkout (₹' + inrAmount + ')',
            order_id: orderData.order_id,
            prefill: {
                name: name || '',
                email: email || '',
                contact: cleanPhone || ''
            },
            theme: {
                color: '#f97316'
            },
            handler: async function (response) {
                // ── STEP 3: Verify Payment Signature ─────────────────────────
                setLoading(true, 'Verifying Payment...');
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

                    const verifyResult = await verifyRes.json();

                    if (verifyRes.ok && verifyResult.success) {
                        showSuccess(response, verifyResult);
                    } else {
                        showError('Verification failed: ' + (verifyResult.error || 'Signature mismatch'));
                    }
                } catch (vErr) {
                    showError('Error verifying payment: ' + vErr.message);
                } finally {
                    setLoading(false);
                }
            },
            modal: {
                ondismiss: function () {
                    showNotice('Payment modal closed / cancelled by user.');
                    setLoading(false);
                }
            }
        };

        try {
            const rzp = new Razorpay(options);

            rzp.on('payment.failed', function (failResponse) {
                const desc = failResponse.error ? failResponse.error.description : 'Payment failed.';
                showError('Payment Failed: ' + desc);
                setLoading(false);
            });

            rzp.open();
        } catch (modalErr) {
            showError('Could not open Razorpay checkout modal: ' + modalErr.message);
            setLoading(false);
        }
    }
</script>

@endsection
