import type { Locale } from '@/lib/i18n';

/** Turns a stored notification into the sentence the parent reads. */
export function notifText(kind: string, params: Record<string, any>, names: string[], locale: Locale): string {
  const ar = locale === 'ar';
  const bus = params.bus ?? '';
  const who = names.length ? names.join(ar ? ' و' : ' & ') : ar ? 'الأطفال' : 'The children';
  const afternoon = params.trip_kind === 'afternoon';
  switch (kind) {
    case 'next':
      return afternoon
        ? ar ? `أتوبيس ${bus} في الطريق إلى منزلك الآن لتوصيل الأطفال.` : `Bus ${bus} is heading to your home now to drop off the children.`
        : ar ? `أتوبيس ${bus} في الطريق إليك الآن. من فضلك جهّز الأطفال عند الباب.` : `Bus ${bus} is heading to you now. Please have the children ready at the door.`;
    case 'ten_min':
      return ar ? `أتوبيس ${bus} على بعد حوالي ${params.minutes ?? 10} دقائق.` : `Bus ${bus} is about ${params.minutes ?? 10} minutes away.`;
    case 'picked_up':
      return ar ? `${who} ركب الأتوبيس.` : `${who} got on the bus.`;
    case 'absent':
      return ar ? `تم تسجيل ${who} غائبًا اليوم.` : `${who} marked absent today.`;
    case 'dropped_off':
      return ar ? `${who} نزل عند المنزل.` : `${who} got off at home.`;
    case 'at_school':
      return ar ? `${who} وصل المدرسة.` : `${who} arrived at school.`;
    default:
      return '';
  }
}
