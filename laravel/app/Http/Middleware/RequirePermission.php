<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['detail' => 'Not authenticated'], 401);
        }

        // Admins have all permissions
        if ($user->role === 'admin') {
            return $next($request);
        }

        // Sub-admins need explicit permission
        if ($user->role === 'sub_admin') {
            $perms = $user->permissions ?? [];
            if (!empty($perms[$permission])) {
                return $next($request);
            }
        }

        return response()->json([
            'detail' => "Permission denied. Required permission: {$permission}",
        ], 403);
    }
}
