<?php

return [

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID', ''),
        'key_secret' => env('RAZORPAY_KEY_SECRET', ''),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET', ''),
    ],

    'exotel' => [
        'sid' => env('EXOTEL_SID', ''),
        'token' => env('EXOTEL_TOKEN', ''),
        'virtual_number' => env('EXOTEL_VIRTUAL_NUMBER', ''),
        'subdomain' => env('EXOTEL_SUBDOMAIN', 'api.exotel.com'),
    ],

    'aws' => [
        'key' => env('AWS_ACCESS_KEY_ID', ''),
        'secret' => env('AWS_SECRET_ACCESS_KEY', ''),
        'region' => env('AWS_DEFAULT_REGION', 'ap-south-1'),
    ],

    'msg24' => [
        'url'            => env('SMS_GATEWAY_URL', 'http://mysms.msg24.in/api/mt/SendSMS'),
        'user'           => env('SMS_USER', ''),
        'password'       => env('SMS_PASSWORD', ''),
        'sender_id'      => env('SMS_SENDER_ID', ''),
        'channel'        => env('SMS_CHANNEL', 'trans'),
        'route'          => env('SMS_ROUTE', '29'),
        'dcs'            => env('SMS_DCS', '0'),
        'flash'          => env('SMS_FLASH', '0'),
        'enabled'        => env('SMS_ENABLED', false),
        'dlt_te_id'      => env('SMS_DLT_TE_ID', null),
        'dlt_pe_id'      => env('SMS_DLT_PE_ID', null),
        'template'       => env(
            'SMS_OTP_TEMPLATE',
            'Shram Sarathi Network: Your verification OTP is {otp}. This OTP is valid for {expire} minutes. Please do not share it with anyone.'
        ),
    ],

];

