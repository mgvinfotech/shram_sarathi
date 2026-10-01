<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $adminUser = session('admin_user');

        if (!$adminUser) {
            return redirect()->route('admin.login')
                ->with('error', 'Please login to access the admin panel.');
        }

        // Share admin user with all views
        view()->share('adminUser', $adminUser);

        return $next($request);
    }
}
