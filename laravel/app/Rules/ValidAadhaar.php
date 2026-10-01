<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidAadhaar implements ValidationRule
{
    private static array $d = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    ];

    private static array $p = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) return;

        $clean = preg_replace('/[\s-]/', '', (string)$value);

        if (!preg_match('/^\d{12}$/', $clean)) {
            $fail('आधार नंबर ठीक 12 अंकों का होना चाहिए (Aadhaar must be 12 digits).');
            return;
        }

        if ($clean[0] === '0' || $clean[0] === '1') {
            $fail('अमान्य आधार: आधार नंबर 0 या 1 से शुरू नहीं हो सकता (Aadhaar cannot start with 0 or 1).');
            return;
        }

        if (preg_match('/^(\d)\1{11}$/', $clean)) {
            $fail('फर्जी आधार: सभी 12 अंक एक जैसे नहीं हो सकते (Repeating digits not allowed).');
            return;
        }

        $dummySequences = ['123456789012', '987654321098', '234567890123', '012345678901'];
        if (in_array($clean, $dummySequences, true)) {
            $fail('फर्जी आधार: डमी या क्रमबद्ध नंबर मान्य नहीं है (Dummy sequences rejected).');
            return;
        }

        // Verhoeff checksum
        $c = 0;
        $reversed = array_reverse(str_split($clean));
        for ($i = 0; $i < count($reversed); $i++) {
            $c = self::$d[$c][self::$p[$i % 8][(int)$reversed[$i]]];
        }

        if ($c !== 0) {
            $fail('अमान्य आधार नंबर: चेकसम विफल रहा (Invalid Aadhaar checksum). असली 12 अंकों का आधार दर्ज करें।');
        }
    }
}
