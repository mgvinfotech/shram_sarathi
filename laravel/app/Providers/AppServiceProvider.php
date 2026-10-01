<?php

namespace App\Providers;

use App\Http\View\Composers\LangComposer;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Use Tailwind-styled pagination
        Paginator::defaultView('admin.components.pagination');
        Paginator::defaultSimpleView('admin.components.pagination-simple');

        // Inject $lang and $t (translations) into ALL admin views
        View::composer('admin.*', LangComposer::class);
    }
}
