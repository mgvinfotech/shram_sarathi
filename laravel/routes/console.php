<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks
|--------------------------------------------------------------------------
| Directive #6 (Thekedar Module) — Auto-Expiry Timer Engine.
| Jis ठेका प्रस्ताव par 48 ghante tak koi action nahi hua use EXPIRED mark karo.
|
| Production mein server par ye cron entry chahiye:
|   * * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
*/
Schedule::command('contract:expire-proposals')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

