/**
 * Enterprise Phone Number Validator & E.164 Normalizer
 * 
 * Supports global E.164 standard formatting (+<country_code><national_number>).
 * Strips whitespace, dashes, parentheses, dots, and unwanted characters.
 * Rejects invalid, truncated, or dummy numbers.
 */

export function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return null;
  }

  // Trim whitespace
  let clean = rawPhone.trim();

  // If starts with 00, convert to +
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }

  // If number starts with 10 digits without + and user looks Indian (starts with 6, 7, 8, 9), default to +91
  if (/^[6-9]\d{9}$/.test(clean.replace(/[\s\-\(\)\.]/g, ''))) {
    clean = '+91' + clean.replace(/[\s\-\(\)\.]/g, '');
  }

  // Remove all non-digit and non-plus characters
  clean = clean.replace(/[^\d+]/g, '');

  // Ensure leading plus
  if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }

  return clean;
}

export function validatePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return {
      isValid: false,
      normalized: null,
      error: 'Mobile phone number is required.'
    };
  }

  const normalized = normalizePhoneNumber(rawPhone);

  if (!normalized) {
    return {
      isValid: false,
      normalized: null,
      error: 'Invalid phone number format.'
    };
  }

  // E.164 regex: starts with +, followed by 1-9, then 6 to 14 digits (total 7 to 15 digits)
  const e164Regex = /^\+[1-9]\d{6,14}$/;

  if (!e164Regex.test(normalized)) {
    return {
      isValid: false,
      normalized: null,
      error: 'Please enter a valid mobile number with country code (e.g. +91 9876543210).'
    };
  }

  // Detect obvious dummy / sequence repetitions (e.g. +910000000000, +11111111111)
  const digitsOnly = normalized.slice(1);
  const uniqueDigits = new Set(digitsOnly.slice(2)); // check subscriber part
  if (uniqueDigits.size <= 1 && digitsOnly.length >= 8) {
    return {
      isValid: false,
      normalized: null,
      error: 'Please provide an active, valid mobile phone number.'
    };
  }

  return {
    isValid: true,
    normalized,
    error: null
  };
}

/**
 * Masks phone number for secure logging & presentation (Zero Sensitive PII Leakage)
 * Example: +919876543210 -> +91 ••••• ••210
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length <= 5) return '•••••';
  const visibleEnd = clean.slice(-3);
  const prefix = clean.slice(0, 3);
  return `${prefix} ••••• ••${visibleEnd}`;
}
