<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidIfsc implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) return;

        $clean = strtoupper(trim(preg_replace('/[\s-]/', '', (string)$value)));

        if (strlen($clean) !== 11) {
            $fail('IFSC कोड ठीक 11 अक्षरों का होना चाहिए (IFSC must be 11 characters).');
            return;
        }

        if (!preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $clean)) {
            $fail('अमान्य IFSC कोड: 5वां अक्षर 0 (शून्य) होना चाहिए। उदाहरण: SBIN0001234');
        }
    }
}
