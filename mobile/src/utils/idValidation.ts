/**
 * Indian ID & KYC Validation Utilities
 * Enforces strict validation to prevent fake Aadhaar, PAN, Voter ID, DL, IFSC, etc.
 */

// ─── Verhoeff Algorithm Tables for Aadhaar Checksum ───────────────────────────
const D_TABLE: number[][] = [
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

const P_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function runVerhoeff(numStr: string): boolean {
  let c = 0;
  const reversed = numStr.split('').map(Number).reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D_TABLE[c][P_TABLE[i % 8][reversed[i]]];
  }
  return c === 0;
}

// Valid 2-letter State/UT codes in India
export const INDIAN_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DD', 'DL', 'DN',
  'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LA', 'LD',
  'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
  'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'UA', 'WB',
]);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorHi?: string;
}

/**
 * 1. Aadhaar Number Validation (UIDAI Standard)
 * - Must be 12 digits
 * - Cannot start with 0 or 1
 * - Cannot be all repeating digits (e.g. 111111111111, 222222222222)
 * - Cannot be common sequential numbers (e.g. 123456789012)
 * - Must satisfy Verhoeff Checksum
 */
export function validateAadhaar(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s-]/g, '').trim();

  if (!clean) {
    return { isValid: false, error: 'Aadhaar number is required.', errorHi: 'आधार नंबर आवश्यक है।' };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      error: 'Aadhaar number must contain digits only.',
      errorHi: 'आधार नंबर में केवल अंक (0-9) होने चाहिए।',
    };
  }

  if (clean.length !== 12) {
    return {
      isValid: false,
      error: `Aadhaar must be 12 digits (currently ${clean.length}).`,
      errorHi: `आधार में 12 अंक होने चाहिए (अभी ${clean.length} अंक हैं)।`,
    };
  }

  if (clean.startsWith('0') || clean.startsWith('1')) {
    return {
      isValid: false,
      error: 'Invalid Aadhaar: Cannot start with 0 or 1.',
      errorHi: 'अमान्य आधार: आधार नंबर 0 या 1 से शुरू नहीं हो सकता।',
    };
  }

  // Reject repeating digits e.g. 222222222222, 999999999999
  if (/^(\d)\1{11}$/.test(clean)) {
    return {
      isValid: false,
      error: 'Fake Aadhaar: Repeating digits are not allowed.',
      errorHi: 'फर्जी आधार: सभी अंक एक जैसे नहीं हो सकते।',
    };
  }

  // Reject obvious test sequences
  const dummySequences = ['123456789012', '987654321098', '234567890123', '012345678901'];
  if (dummySequences.includes(clean)) {
    return {
      isValid: false,
      error: 'Fake Aadhaar: Sequential dummy numbers are rejected.',
      errorHi: 'फर्जी आधार: डमी या क्रमबद्ध नंबर मान्य नहीं है।',
    };
  }

  // UIDAI Verhoeff Checksum
  if (!runVerhoeff(clean)) {
    return {
      isValid: false,
      error: 'Invalid Aadhaar checksum. Please enter a genuine 12-digit Aadhaar number.',
      errorHi: 'अमान्य आधार चेकसम। कृपया सही 12 अंकों का असली आधार नंबर दर्ज करें।',
    };
  }

  return { isValid: true };
}

/**
 * 2. PAN Card Validation (Income Tax Dept Standard)
 * - 10 characters
 * - Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
 * - 4th character must be valid entity type: P, C, H, F, A, T, B, L, J, G
 */
export function validatePan(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s-]/g, '').trim().toUpperCase();

  if (!clean) {
    return { isValid: false, error: 'PAN number is required.', errorHi: 'पैन नंबर आवश्यक है।' };
  }

  if (clean.length !== 10) {
    return {
      isValid: false,
      error: `PAN must be 10 characters (currently ${clean.length}).`,
      errorHi: `पैन कार्ड में 10 अक्षर होने चाहिए (अभी ${clean.length} हैं)।`,
    };
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid PAN format. Example: ABCDE1234F',
      errorHi: 'अमान्य पैन फॉर्मेट। उदाहरण: ABCDE1234F',
    };
  }

  // 4th character entity check
  const entityType = clean[3];
  const validEntities = ['P', 'C', 'H', 'F', 'A', 'T', 'B', 'L', 'J', 'G'];
  if (!validEntities.includes(entityType)) {
    return {
      isValid: false,
      error: `Invalid PAN entity character '${entityType}'. 4th character must be P, C, H, F, etc.`,
      errorHi: `अमान्य पैन: चौथा अक्षर '${entityType}' अमान्य है।`,
    };
  }

  // Reject obvious dummy PANs
  const dummyPans = ['ABCDE1234F', 'AAAAA0000A', 'ZZZZZ9999Z', 'XXXXX0000X'];
  if (dummyPans.includes(clean)) {
    return {
      isValid: false,
      error: 'Fake/Sample PAN number detected. Please enter your genuine PAN.',
      errorHi: 'फर्जी या सैंपल पैन नंबर मान्य नहीं है। कृपया अपना असली पैन नंबर डालें।',
    };
  }

  return { isValid: true };
}

/**
 * 3. Voter ID / EPIC Validation (Election Commission of India)
 * - Standard: 3 letters + 7 digits (e.g. ABC1234567)
 * - Legacy: 2-3 letters + 7-8 digits
 */
export function validateVoterId(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s\/-]/g, '').trim().toUpperCase();

  if (!clean) {
    return { isValid: false, error: 'Voter ID is required.', errorHi: 'वोटर आईडी आवश्यक है।' };
  }

  if (clean.length < 10 || clean.length > 12) {
    return {
      isValid: false,
      error: 'Voter ID must be 10 to 12 characters.',
      errorHi: 'वोटर आईडी 10 से 12 अक्षरों का होना चाहिए।',
    };
  }

  const standardRegex = /^[A-Z]{3}[0-9]{7}$/;
  const legacyRegex   = /^[A-Z]{2,3}[0-9]{7,8}$/;

  if (!standardRegex.test(clean) && !legacyRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid Voter ID format. Example: ABC1234567',
      errorHi: 'अमान्य वोटर आईडी फॉर्मेट। उदाहरण: ABC1234567',
    };
  }

  if (/^([A-Z])\1{2}0{7}$/.test(clean)) {
    return {
      isValid: false,
      error: 'Fake Voter ID detected.',
      errorHi: 'फर्जी वोटर आईडी मान्य नहीं है।',
    };
  }

  return { isValid: true };
}

/**
 * 4. Driving License Validation (MoRTH Standard)
 * - Format: 2-letter state code + 2-digit RTO + 4-digit year + 7 digits
 * - Example: UP3220180012345 (15-16 chars)
 */
export function validateDrivingLicense(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s-]/g, '').trim().toUpperCase();

  if (!clean) {
    return { isValid: false, error: 'Driving License is required.', errorHi: 'ड्राइविंग लाइसेंस आवश्यक है।' };
  }

  if (clean.length < 15 || clean.length > 16) {
    return {
      isValid: false,
      error: `Driving License must be 15-16 characters (currently ${clean.length}).`,
      errorHi: `ड्राइविंग लाइसेंस 15-16 अक्षरों का होना चाहिए (अभी ${clean.length} हैं)।`,
    };
  }

  const state = clean.substring(0, 2);
  if (!INDIAN_STATE_CODES.has(state)) {
    return {
      isValid: false,
      error: `Invalid State code '${state}' in Driving License.`,
      errorHi: `ड्राइविंग लाइसेंस में अमान्य राज्य कोड '${state}' है।`,
    };
  }

  const dlRegex = /^[A-Z]{2}[0-9]{2}[0-9A-Z]{11,12}$/;
  if (!dlRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid Driving License format. Example: UP3220180012345',
      errorHi: 'अमान्य ड्राइविंग लाइसेंस फॉर्मेट। उदाहरण: UP3220180012345',
    };
  }

  if (/^[A-Z]{2}0{13,14}$/.test(clean)) {
    return {
      isValid: false,
      error: 'Fake Driving License number detected.',
      errorHi: 'फर्जी ड्राइविंग लाइसेंस नंबर मान्य नहीं है।',
    };
  }

  return { isValid: true };
}

/**
 * 5. Bank IFSC Validation (RBI Standard)
 * - 11 characters
 * - 4 letters (bank code) + '0' (5th char) + 6 alphanumeric branch code
 * - Example: SBIN0001234, HDFC0000001
 */
export function validateIfsc(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s-]/g, '').trim().toUpperCase();

  if (!clean) {
    return { isValid: false, error: 'IFSC Code is required.', errorHi: 'IFSC कोड आवश्यक है।' };
  }

  if (clean.length !== 11) {
    return {
      isValid: false,
      error: `IFSC code must be exactly 11 characters (currently ${clean.length}).`,
      errorHi: `IFSC कोड में ठीक 11 अक्षर होने चाहिए (अभी ${clean.length} हैं)।`,
    };
  }

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid IFSC format. 5th character must be 0 (Zero). Example: SBIN0001234',
      errorHi: 'अमान्य IFSC फॉर्मेट। 5वां अक्षर 0 (शून्य) होना चाहिए। उदाहरण: SBIN0001234',
    };
  }

  return { isValid: true };
}

/**
 * 6. Bank Account Number Validation
 * - 9 to 18 numeric digits
 * - Cannot be all same repeating digits
 */
export function validateBankAccount(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s-]/g, '').trim();

  if (!clean) {
    return { isValid: false, error: 'Bank account number is required.', errorHi: 'बैंक खाता संख्या आवश्यक है।' };
  }

  if (!/^\d{9,18}$/.test(clean)) {
    return {
      isValid: false,
      error: 'Bank account number must be between 9 and 18 digits.',
      errorHi: 'बैंक खाता संख्या 9 से 18 अंकों की होनी चाहिए।',
    };
  }

  if (/^(\d)\1+$/.test(clean)) {
    return {
      isValid: false,
      error: 'Fake Bank Account: Repeating digits are not allowed.',
      errorHi: 'फर्जी बैंक खाता: सभी अंक एक जैसे नहीं हो सकते।',
    };
  }

  return { isValid: true };
}

/**
 * 7. Vehicle Registration Number (RC) Validation (MoRTH / Parivahan)
 * - Standard: State (2 letters) + District code (1-2 digits) + series (0-3 letters) + 4 digits
 * - Bharat (BH) Series: 2 digits + BH + 4 digits + 1-2 letters
 * - Example: UP32AB1234, DL01A9999, 22BH1234AA
 */
export function validateVehicleNumber(rawInput: string): ValidationResult {
  const clean = rawInput.replace(/[\s-]/g, '').trim().toUpperCase();

  if (!clean) {
    return { isValid: false, error: 'Vehicle number is required.', errorHi: 'गाड़ी नंबर आवश्यक है।' };
  }

  const standardRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  const bhRegex       = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

  if (!standardRegex.test(clean) && !bhRegex.test(clean)) {
    return {
      isValid: false,
      error: 'Invalid vehicle number format. Example: UP32AB1234',
      errorHi: 'अमान्य गाड़ी नंबर फॉर्मेट। उदाहरण: UP32AB1234',
    };
  }

  if (standardRegex.test(clean)) {
    const state = clean.substring(0, 2);
    if (!INDIAN_STATE_CODES.has(state)) {
      return {
        isValid: false,
        error: `Invalid state code '${state}' in vehicle number.`,
        errorHi: `गाड़ी नंबर में अमान्य राज्य कोड '${state}' है।`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Universal ID Validator by type
 */
export function validateIdByType(idType: string, value: string): ValidationResult {
  switch (idType.toLowerCase()) {
    case 'aadhaar':
      return validateAadhaar(value);
    case 'pan':
      return validatePan(value);
    case 'voter':
      return validateVoterId(value);
    case 'dl':
      return validateDrivingLicense(value);
    default:
      if (!value.trim()) {
        return { isValid: false, error: 'ID number is required.', errorHi: 'ID नंबर आवश्यक है।' };
      }
      return { isValid: true };
  }
}

/**
 * Friendly Formatter for ID numbers as user types:
 * - Aadhaar: "1234 5678 9012"
 * - PAN: uppercase "ABCDE1234F"
 * - Voter / DL: uppercase
 */
export function formatIdNumber(idType: string, value: string): string {
  const t = idType.toLowerCase();
  if (t === 'aadhaar') {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(' ');
  }
  if (t === 'pan') {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  }
  if (t === 'voter') {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  }
  if (t === 'dl') {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  }
  return value.toUpperCase();
}
