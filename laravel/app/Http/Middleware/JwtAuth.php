<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuth
{
    public function __construct(private JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');

        if (!str_starts_with($header, 'Bearer ')) {
            return response()->json(['detail' => 'Not authenticated'], 401);
        }

        $token = substr($header, 7);

        try {
            $payload = $this->jwt->decodeToken($token);
        } catch (\Exception $e) {
            return response()->json(['detail' => 'Invalid or expired token'], 401);
        }

        // Check token blacklist
        if (isset($payload->jti)) {
            $redis = app(\App\Services\RedisService::class);
            if ($redis->isTokenBlacklisted($payload->jti)) {
                return response()->json(['detail' => 'Token has been revoked'], 401);
            }
        }

        $user = User::find($payload->sub);

        if (!$user) {
            return response()->json(['detail' => 'User not found'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['detail' => 'Account is inactive'], 403);
        }

        if ($user->is_blacklisted) {
            return response()->json(['detail' => 'Account is blocked. Contact support.'], 403);
        }

        $request->setUserResolver(fn() => $user);

        return $next($request);
    }
}
