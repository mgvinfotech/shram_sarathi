<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['detail' => 'Not authenticated'], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json([
                'detail' => 'Insufficient permissions. Required role: ' . implode(' or ', $roles),
            ], 403);
        }

        return $next($request);
    }
}
