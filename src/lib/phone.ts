/**
 * Normalises an Egyptian mobile number to E.164 (+201XXXXXXXXX).
 * Accepts 01012345678, 1012345678, +20 10 1234 5678, 00201012345678, and Arabic-Indic digits.
 * Returns null if it is not a valid Egyptian mobile number.
 */
export function normalizeEgPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const western = input.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  let digits = western.replace(/\D/g, '');
  if (digits.startsWith('0020')) digits = digits.slice(4);
  else if (digits.startsWith('20') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!/^1[0125]\d{8}$/.test(digits)) return null;
  return '+20' + digits;
}

/** +201012345678 → 010 1234 5678 */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = e164.match(/^\+20(\d{2})(\d{4})(\d{4})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}
