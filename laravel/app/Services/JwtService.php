<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    private string $secret;
    private string $algo;
    private int $ttlMinutes;

    public function __construct()
    {
        $this->secret     = config('app.jwt_secret', env('JWT_SECRET', 'change-this-secret'));
        $this->algo       = env('JWT_ALGO', 'HS256');
        $this->ttlMinutes = (int) env('JWT_TTL', 10080); // 7 days in minutes
    }

    /**
     * Create a JWT token for the given user.
     */
    public function createToken(int $userId, string $role): string
    {
        $now = time();
        $payload = [
            'sub'  => $userId,
            'role' => $role,
            'iat'  => $now,
            'exp'  => $now + ($this->ttlMinutes * 60),
            'jti'  => bin2hex(random_bytes(16)),
        ];

        return JWT::encode($payload, $this->secret, $this->algo);
    }

    /**
     * Decode and validate a JWT token.
     *
     * @throws \Exception on invalid/expired token
     */
    public function decodeToken(string $token): object
    {
        return JWT::decode($token, new Key($this->secret, $this->algo));
    }
}
