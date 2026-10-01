<?php

return [
    /*
    |--------------------------------------------------------------------------
    | FCM v1 API — Service Account Credentials Path
    |--------------------------------------------------------------------------
    | Firebase Console → Project Settings → Service Accounts →
    |   "Generate new private key" → JSON file download karo
    | Us file ko storage/app/firebase-credentials.json mein save karo.
    | .env mein FCM_CREDENTIALS_PATH set karo.
    |
    */
    'credentials_path' => env('FCM_CREDENTIALS_PATH', 'storage/app/firebase-credentials.json'),

    /*
    |--------------------------------------------------------------------------
    | Firebase Project ID
    |--------------------------------------------------------------------------
    | Firebase Console → Project Settings → General → Project ID copy karo.
    | .env mein FCM_PROJECT_ID set karo.
    |
    */
    'project_id' => env('FCM_PROJECT_ID', ''),

    /*
    |--------------------------------------------------------------------------
    | Notification Request Timeout (seconds)
    |--------------------------------------------------------------------------
    | Kitne seconds mein agar driver respond nahi karta toh next driver ko bheja jata hai.
    | Admin panel se bhi configure kiya ja sakta hai (settings table).
    | Default: 30 seconds
    |
    */
    'request_timeout_seconds' => env('FCM_REQUEST_TIMEOUT', 30),
];
