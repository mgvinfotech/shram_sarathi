<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidPan implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) return;

        $clean = strtoupper(trim(preg_replace('/[\s-]/', '', (string)$value)));

        if (!preg_match('/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/', $clean)) {
            $fail('अमान्य पैन नंबर: फॉर्मेट ABCDE1234F होना चाहिए (Invalid PAN format).');
            return;
        }

        $entityType = $clean[3];
        $validEntities = ['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'];
        if (!in_array($entityType, $validEntities, true)) {
            $fail("अमान्य पैन: चौथा अक्षर '{$entityType}' अमान्य है। चौथा अक्षर P, C, H, F आदि होना चाहिए।");
            return;
        }

        $dummyPans = ['ABCDE1234F', 'AAAAA0000A', 'ZZZZZ9999Z', 'XXXXX0000X'];
        if (in_array($clean, $dummyPans, true)) {
            $fail('फर्जी या डमी पैन नंबर मान्य नहीं है (Fake/dummy PAN rejected).');
        }
    }
}
