// Pop-up messages after actions. [English, Arabic]. {n} and {name} are filled in.
export const FLASH = {
  accountCreated: ['Account created. Next: your home on the map.', 'تم إنشاء الحساب. التالي: موقع المنزل.'],
  welcomeBack: ['Signed in. Welcome back!', 'تم تسجيل الدخول. أهلًا بعودتك!'],
  signedOut: ['Signed out', 'تم تسجيل الخروج'],
  locationSaved: ['Home location saved', 'تم حفظ موقع المنزل'],
  childrenSaved: ['{n} child(ren) saved', 'تم حفظ بيانات {n} طفل'],
  packageChosen: ['Package chosen. Now pay with InstaPay.', 'تم اختيار الباقة. ادفع الآن عبر إنستاباي.'],
  receiptSent: ['Receipt sent. We’ll confirm your payment soon.', 'تم إرسال الإيصال. سنؤكد الدفع قريبًا.'],
  tripStarted: ['Trip started. Sharing your location.', 'بدأت الرحلة. جارٍ مشاركة موقعك.'],
  tripEnded: ['Trip ended', 'انتهت الرحلة'],
  markedPicked: ['{name} marked picked up. Next family notified.', 'تم تسجيل ركوب {name}. تم إخطار العائلة التالية.'],
  markedAbsent: ['{name} marked absent', 'تم تسجيل غياب {name}'],
  markedDropped: ['{name} dropped off', 'تم تسجيل نزول {name}'],
  markedUndo: ['Change undone for {name}', 'تم التراجع عن تسجيل {name}'],
  busAdded: ['Bus {n} added', 'تمت إضافة أتوبيس {n}'],
  busSaved: ['Bus saved', 'تم حفظ الأتوبيس'],
  busDeleted: ['Bus deleted', 'تم حذف الأتوبيس'],
  personAdded: ['{name} added', 'تمت إضافة {name}'],
  assignmentSaved: ['Assignment saved', 'تم حفظ التعيين'],
  passwordSet: ['New password saved. Tell them the new password.', 'تم حفظ كلمة المرور الجديدة. أخبرهم بها.'],
  staffActive: ['Status saved', 'تم حفظ الحالة'],
  childMoved: ['{name} moved to Bus {n}', 'تم نقل {name} إلى أتوبيس {n}'],
  childRemoved: ['{name} removed from the bus', 'تمت إزالة {name} من الأتوبيس'],
  childrenAssigned: ['{n} child(ren) placed on buses', 'تم تسكين {n} طفل على الأتوبيسات'],
  childAdded: ['{name} added', 'تمت إضافة {name}'],
  childDeleted: ['Child deleted', 'تم حذف الطفل'],
  pricesSaved: ['Prices saved. Parents see them now.', 'تم حفظ الأسعار. تظهر للأهل الآن.'],
  instapaySaved: ['InstaPay details saved', 'تم حفظ بيانات إنستاباي'],
  schoolAdded: ['School added', 'تمت إضافة المدرسة'],
  schoolDeleted: ['School deleted', 'تم حذف المدرسة'],
  paymentConfirmed: ['Payment confirmed · {n} child(ren) placed on a bus', 'تم تأكيد الدفع · تم تسكين {n} طفل على أتوبيس'],
  paymentRejected: ['Payment rejected. The parent sees the reason.', 'تم رفض الدفع. سيرى ولي الأمر السبب.'],
  paymentRecorded: ['Payment recorded as paid', 'تم تسجيل الدفعة كمدفوعة'],
} as const;

export type FlashKey = keyof typeof FLASH;

export function flashMessages(locale: 'ar' | 'en'): Record<string, string> {
  const i = locale === 'ar' ? 1 : 0;
  return Object.fromEntries(Object.entries(FLASH).map(([k, v]) => [k, v[i]]));
}
