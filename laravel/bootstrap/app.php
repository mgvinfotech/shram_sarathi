<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'jwt.auth'    => \App\Http\Middleware\JwtAuth::class,
            'admin.auth'  => \App\Http\Middleware\AdminAuth::class,
            'role'        => \App\Http\Middleware\RequireRole::class,
            'permission'  => \App\Http\Middleware\RequirePermission::class,
        ]);

        // Web middleware group (session, CSRF, etc.)
        $middleware->web(append: [
            // Additional web middleware if needed
        ]);

        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Exclude webhook routes from CSRF verification
        $middleware->validateCsrfTokens(except: [
            'api/payment/webhook',
            'api/call/status-webhook',
            'api/call/dtmf-webhook',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['detail' => 'Not authenticated'], 401);
            }
        });

        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['detail' => 'Not found'], 404);
            }
        });
    })->create();
