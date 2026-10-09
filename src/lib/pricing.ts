export type Settings = {
  monthly_price: number;
  sibling_discount: number;
  returning_discount: number;
  term_months: number;
  term_discount: number;
  year_months: number;
  year_discount: number;
};
export type PlanId = 'month' | 'term' | 'year';

export function planMonths(s: Settings, plan: PlanId) {
  return plan === 'month' ? 1 : plan === 'term' ? s.term_months : s.year_months;
}
export function planDiscount(s: Settings, plan: PlanId) {
  return plan === 'month' ? 0 : plan === 'term' ? s.term_discount : s.year_discount;
}

/** Price for a family. Rounded to the nearest 5 EGP. */
export function quote(s: Settings, children: number, plan: PlanId, returning: boolean) {
  const months = planMonths(s, plan);
  const perChild = Number(s.monthly_price) * months * (1 - Number(planDiscount(s, plan)) / 100);
  let subtotal = 0;
  let siblingSaving = 0;
  for (let i = 0; i < children; i++) {
    subtotal += perChild;
    if (i > 0) siblingSaving += (perChild * Number(s.sibling_discount)) / 100;
  }
  const afterSiblings = subtotal - siblingSaving;
  const returningSaving = returning ? (afterSiblings * Number(s.returning_discount)) / 100 : 0;
  const total = Math.round((afterSiblings - returningSaving) / 5) * 5;
  const listPrice = Number(s.monthly_price) * months * children;
  return { months, perChild, subtotal, siblingSaving, returningSaving, total, saving: listPrice - total };
}

export function recommendPlan(children: number, returning: boolean): PlanId {
  return children >= 2 || returning ? 'year' : 'term';
}

export const egp = (n: number, locale: 'ar' | 'en') =>
  locale === 'ar' ? `${Math.round(n).toLocaleString('ar-EG')} ج.م` : `${Math.round(n).toLocaleString('en-US')} EGP`;
