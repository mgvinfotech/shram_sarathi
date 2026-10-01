<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>नई पूछताछ - श्रम सारथी नेटवर्क</title>
    <style>
        /* Mobile-first reset & styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: #f1f5f9;
        }
        @media screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: 0 auto !important;
                border-radius: 0 !important;
            }
            .content-padding {
                padding: 16px !important;
            }
            .header-padding {
                padding: 20px 16px !important;
            }
            .data-label {
                width: 100% !important;
                display: block !important;
                padding-bottom: 2px !important;
            }
            .data-value {
                width: 100% !important;
                display: block !important;
                padding-bottom: 12px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">

    <!-- Outer Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; width: 100%; margin: 0; padding: 15px 0;">
        <tr>
            <td align="center" style="padding: 0 10px;">

                <!-- Container Card (Max 580px) -->
                <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <tr>
                        <td class="header-padding" style="background-color: #0b192c; padding: 22px 24px; border-bottom: 3px solid #f97316;">
                            <div style="font-size: 11px; font-weight: 800; color: #f97316; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">
                                SHRAM SARATHI NETWORK
                            </div>
                            <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.2;">
                                नई ग्राहक पूछताछ (Website Inquiry)
                            </h1>
                            <p style="margin: 4px 0 0; font-size: 12px; color: rgba(255,255,255,0.7);">
                                “लोगों के काम से लोगों को जोड़ता है श्रम सारथी”
                            </p>
                        </td>
                    </tr>

                    <!-- Reference Bar -->
                    <tr>
                        <td style="background-color: #fff7ed; padding: 10px 24px; border-bottom: 1px solid #fed7aa;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="font-size: 12px; font-weight: 700; color: #9a3412;">
                                        Ref: <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #c2410c;">#{{ $referenceNo }}</span>
                                    </td>
                                    <td align="right" style="font-size: 11px; color: #7c2d12;">
                                        {{ $submittedAt ?? now()->format('d M Y, h:i A') }}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Body: Clean Stacked Rows -->
                    <tr>
                        <td class="content-padding" style="padding: 24px;">

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                
                                <!-- Service Category -->
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            सर्विस श्रेणी (Service Category)
                                        </div>
                                        <div style="font-size: 16px; font-weight: 800; color: #ea580c;">
                                            {{ $data['service'] }}
                                        </div>
                                    </td>
                                </tr>

                                <!-- Customer Name -->
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            ग्राहक का नाम (Customer Name)
                                        </div>
                                        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">
                                            {{ $data['name'] }}
                                            @if(!empty($data['user_type']))
                                                <span style="font-size: 12px; font-weight: 500; color: #64748b;">({{ $data['user_type'] }})</span>
                                            @endif
                                        </div>
                                    </td>
                                </tr>

                                <!-- Mobile Number -->
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            मोबाइल नंबर (Mobile Number)
                                        </div>
                                        <div style="font-size: 16px; font-weight: 800; color: #0284c7; font-family: monospace;">
                                            <a href="tel:{{ $data['mobile'] }}" style="color: #0284c7; text-decoration: none;">
                                                +91 {{ $data['mobile'] }}
                                            </a>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Email -->
                                @if(!empty($data['email']))
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            ईमेल (Email Address)
                                        </div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                            {{ $data['email'] }}
                                        </div>
                                    </td>
                                </tr>
                                @endif

                                <!-- Location -->
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            स्थान / शहर (Location)
                                        </div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                            {{ $data['location'] ?: 'Sultanpur, UP' }}
                                        </div>
                                    </td>
                                </tr>

                                <!-- Preferred Date -->
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            कार्य की तारीख (Preferred Date)
                                        </div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                            {{ $data['preferred_date'] ?: 'Immediate' }}
                                        </div>
                                    </td>
                                </tr>

                                <!-- Shift / Duration -->
                                @if(!empty($data['shift']))
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            शिफ्ट / समय (Shift / Duration)
                                        </div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                            {{ $data['shift'] }}
                                        </div>
                                    </td>
                                </tr>
                                @endif

                                <!-- Workers Count -->
                                @if(!empty($data['workers_count']))
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                                            संख्या / आवश्यकता (Count)
                                        </div>
                                        <div style="font-size: 14px; font-weight: 600; color: #1e293b;">
                                            {{ $data['workers_count'] }}
                                        </div>
                                    </td>
                                </tr>
                                @endif

                                <!-- Message / Requirement -->
                                @if(!empty($data['message']))
                                <tr>
                                    <td style="padding-top: 16px;">
                                        <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                                            ग्राहक का संदेश (Requirement Message)
                                        </div>
                                        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; border-radius: 6px; padding: 12px 14px; font-size: 14px; color: #713f12; line-height: 1.6;">
                                            {{ $data['message'] }}
                                        </div>
                                    </td>
                                </tr>
                                @endif

                            </table>

                        </td>
                    </tr>

                    <!-- Clean Simple Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #0b192c;">
                                श्रम सारथी नेटवर्क (Shram Sarathi Network)
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #64748b;">
                                Sultanpur, Uttar Pradesh & Across India • Helpline: 1800-123-4567
                            </p>
                        </td>
                    </tr>

                </table>

                <p style="margin: 14px 0 0; font-size: 11px; color: #94a3b8; text-align: center;">
                    This is an automated inquiry notification from the website.
                </p>

            </td>
        </tr>
    </table>

</body>
</html>
