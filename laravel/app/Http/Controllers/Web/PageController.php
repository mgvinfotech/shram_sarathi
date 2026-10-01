<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Inquiry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class PageController extends Controller
{
    /**
     * Public Home / Master Services page.
     */
    public function home()
    {
        return view('web.home');
    }

    /**
     * Services Directory & Full Taxonomy page.
     */
    public function services()
    {
        return view('web.services');
    }

    /**
     * How It Works 5-Step process page.
     */
    public function howItWorks()
    {
        return view('web.how_it_works');
    }

    /**
     * Join Network service provider onboarding page.
     */
    public function joinNetwork()
    {
        return view('web.join_network');
    }

    /**
     * Frequently Asked Questions (FAQ) page.
     */
    public function faq()
    {
        return view('web.faq');
    }

    /**
     * Blog & Platform Updates page.
     */
    public function blog()
    {
        return view('web.blog');
    }

    /**
     * Careers & Partner Network page.
     */
    public function careers()
    {
        return view('web.careers');
    }

    /**
     * About Business & Mission page.
     */
    public function about()
    {
        return view('web.about');
    }

    /**
     * Terms & Conditions page.
     */
    public function terms()
    {
        return view('web.terms');
    }

    /**
     * Privacy Policy page.
     */
    public function privacy()
    {
        return view('web.privacy');
    }

    /**
     * Refund & Return / Cancellation Policy page.
     */
    public function refund()
    {
        return view('web.refund');
    }

    /**
     * Official Contact Us & Grievance Redressal page (Mandatory for Razorpay).
     */
    public function contact()
    {
        return view('web.contact');
    }

    /**
     * Official Shipping & Service Delivery Policy page (Mandatory for Razorpay).
     */
    public function shipping()
    {
        return view('web.shipping');
    }

    /**
     * Official Pricing & Service Rates page (Mandatory for Razorpay).
     */
    public function pricing()
    {
        return view('web.pricing');
    }

    /**
     * Razorpay Standard Web Checkout payment & test page.
     */
    public function checkout()
    {
        return view('web.checkout', [
            'razorpayKey' => env('RAZORPAY_KEY_ID', ''),
        ]);
    }

    /**
     * Mobile app in-browser Razorpay Standard Web Checkout.
     */
    public function checkoutApp(Request $request)
    {
        return view('web.checkout_app', [
            'key_id'        => env('RAZORPAY_KEY_ID', ''),
            'order_id'      => $request->query('order_id', ''),
            'amount'        => $request->query('amount', 1000),
            'currency'      => $request->query('currency', 'INR'),
            'description'   => $request->query('description', 'Service Booking'),
            'customer_name' => $request->query('name', ''),
            'contact'       => $request->query('contact', ''),
            'email'         => $request->query('email', ''),
        ]);
    }

    /**
     * Direct APK file download.
     */
    public function downloadApk()
    {
        $file = file_exists(public_path('sharam.apk')) ? public_path('sharam.apk') : public_path('shram.apk');
        if (!file_exists($file)) {
            abort(404, 'APK file not found');
        }
        return response()->download($file, 'shram.apk', [
            'Content-Type'        => 'application/vnd.android.package-archive',
            'Content-Disposition' => 'attachment; filename="shram.apk"',
        ]);
    }

    /**
     * Handle website quick inquiry submission.
     */
    public function submitInquiry(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'service'        => 'required|string|max:100',
            'name'           => 'required|string|max:120',
            'mobile'         => ['required', 'regex:/^[0-9]{10}$/'],
            'location'       => 'nullable|string|max:150',
            'preferred_date' => 'nullable|string|max:30',
            'email'          => 'nullable|email|max:150',
            'user_type'      => 'nullable|string|max:60',
            'workers_count'  => 'nullable|string|max:50',
            'shift'          => 'nullable|string|max:50',
            'message'        => 'nullable|string|max:1500',
            'consent'        => 'accepted',
        ], [
            'service.required' => 'Please select a service category.',
            'name.required'    => 'Please enter your name.',
            'mobile.required'  => 'Please enter your 10-digit mobile number.',
            'mobile.regex'     => 'Please enter a valid 10-digit mobile number.',
            'consent.accepted' => 'You must accept the terms and consent to submit an inquiry.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $referenceNo = 'SSN-INQ-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $data = [
            'reference_no'   => $referenceNo,
            'service'        => $request->input('service'),
            'location'       => $request->input('location') ?: 'Sultanpur, UP',
            'preferred_date' => $request->input('preferred_date'),
            'name'           => $request->input('name'),
            'mobile'         => $request->input('mobile'),
            'email'          => $request->input('email'),
            'user_type'      => $request->input('user_type', 'Customer'),
            'workers_count'  => $request->input('workers_count'),
            'shift'          => $request->input('shift'),
            'message'        => $request->input('message'),
            'status'         => 'Pending',
            'ip_address'     => $request->ip(),
        ];

        // 1. Save in Database
        try {
            Inquiry::create($data);
        } catch (\Exception $e) {
            Log::error("Failed to save Inquiry to DB: " . $e->getMessage());
        }

        // 2. Save in JSON backup file
        try {
            $filePath = storage_path('app/inquiries.json');
            $existing = [];
            if (file_exists($filePath)) {
                $content = file_get_contents($filePath);
                $existing = json_decode($content, true) ?: [];
            }
            $existing[] = array_merge($data, ['timestamp' => now()->toIso8601String()]);
            file_put_contents($filePath, json_encode($existing, JSON_PRETTY_PRINT));
        } catch (\Exception $e) {
            Log::error("Failed to append inquiry to JSON: " . $e->getMessage());
        }

        // 3. Send rich HTML email notification to support/admin
        try {
            $supportEmail = env('SUPPORT_INQUIRY_EMAIL', 'support@shramsarathi.com');
            $submittedAt  = now()->format('d M Y, h:i A');

            Mail::send('emails.inquiry_notification', [
                'data'        => $data,
                'referenceNo' => $referenceNo,
                'submittedAt' => $submittedAt,
            ], function ($msg) use ($supportEmail, $referenceNo, $data) {
                $msg->to($supportEmail)
                    ->subject("🔔 New Inquiry [#{$referenceNo}] — {$data['service']} ({$data['name']}) | Shram Sarathi");
            });
        } catch (\Exception $e) {
            Log::info("Email notification bypassed or failed (check SMTP settings): " . $e->getMessage());
        }

        return response()->json([
            'success'      => true,
            'reference_no' => $referenceNo,
            'message'      => 'आपकी पूछताछ सफलतापूर्वक दर्ज कर ली गई है! हमारी सहायता टीम शीघ्र ही आपसे संपर्क करेगी। (Your inquiry has been received! Our support team will contact you shortly.)',
        ]);
    }
}
