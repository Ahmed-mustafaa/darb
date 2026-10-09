import { cookies } from 'next/headers';

export type Locale = 'ar' | 'en';

// [English, Arabic]
const D = {
  brand: ['Darb', 'درب'],
  tagline: ['School transport, tracked live', 'مواصلات مدرسية بمتابعة مباشرة'],
  switchLang: ['العربية', 'English'],
  admin: ['Admin', 'الإدارة'],
  signIn: ['Sign in', 'تسجيل الدخول'],
  signOut: ['Sign out', 'تسجيل الخروج'],
  email: ['Email', 'البريد الإلكتروني'],
  password: ['Password', 'كلمة المرور'],
  loginTitle: ['Admin sign in', 'دخول الإدارة'],
  loginError: ['Wrong email or password.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'],
  notAdmin: ['This account is not an admin', 'هذا الحساب ليس حساب إدارة'],
  notAdminHelp: [
    'Ask the owner to add your account to the admins table (see README, step 4).',
    'اطلب من المالك إضافة حسابك إلى جدول المشرفين (راجع ملف README، الخطوة ٤).',
  ],
  nav_overview: ['Overview', 'نظرة عامة'],
  nav_buses: ['Buses', 'الأتوبيسات'],
  nav_children: ['Children', 'الأطفال'],
  nav_staff: ['Drivers & supervisors', 'السائقون والمشرفات'],
  nav_settings: ['Prices & schools', 'الأسعار والمدارس'],
  kpi_buses: ['Buses', 'الأتوبيسات'],
  kpi_seats: ['Seats filled', 'المقاعد المشغولة'],
  kpi_unassigned: ['Need a bus', 'بدون أتوبيس'],
  kpi_staff: ['Drivers · supervisors', 'سائقون · مشرفات'],
  ofCapacity: ['of fleet capacity', 'من سعة الأسطول'],
  reviewSuggestions: ['Review suggestions', 'راجع الاقتراحات'],
  everyoneAssigned: ['Everyone has a bus', 'كل الأطفال لهم أتوبيس'],
  fleet: ['Fleet', 'الأسطول'],
  liveMapSoon: [
    'The live map arrives in Phase 4, when supervisors start sharing their location.',
    'الخريطة المباشرة تأتي في المرحلة ٤ عندما تبدأ المشرفات بمشاركة الموقع.',
  ],
  bus: ['Bus', 'أتوبيس'],
  plate: ['Plate', 'اللوحة'],
  plateLetters: ['Plate letters', 'حروف اللوحة'],
  plateNumber: ['Plate number', 'أرقام اللوحة'],
  model: ['Model', 'الموديل'],
  capacity: ['Seats', 'عدد المقاعد'],
  seatsUsed: ['seats used', 'مقعد مشغول'],
  school: ['School', 'المدرسة'],
  driver: ['Driver', 'السائق'],
  supervisor: ['Supervisor', 'المشرفة'],
  notAssigned: ['Not assigned', 'غير معيّن'],
  status: ['Status', 'الحالة'],
  status_parked: ['Parked', 'متوقف'],
  status_on_route: ['On route', 'في الطريق'],
  status_at_school: ['At school', 'في المدرسة'],
  save: ['Save', 'حفظ'],
  saved: ['Saved', 'تم الحفظ'],
  add: ['Add', 'إضافة'],
  delete: ['Delete', 'حذف'],
  confirmDelete: ['Delete this? This cannot be undone.', 'هل تريد الحذف؟ لا يمكن التراجع.'],
  addBus: ['Add a bus', 'إضافة أتوبيس'],
  busNumber: ['Bus number', 'رقم الأتوبيس'],
  busFull: ['That bus is full. Raise its seats or pick another bus.', 'هذا الأتوبيس ممتلئ. زِد عدد المقاعد أو اختر أتوبيسًا آخر.'],
  duplicateBus: ['A bus with that number already exists.', 'يوجد أتوبيس بهذا الرقم بالفعل.'],
  seeChildren: ['See children', 'عرض الأطفال'],
  children: ['Children', 'الأطفال'],
  childName: ["Child's name", 'اسم الطفل'],
  grade: ['Grade', 'الصف'],
  notes: ['Notes', 'ملاحظات'],
  parent: ['Parent', 'ولي الأمر'],
  parentName: ["Parent's name", 'اسم ولي الأمر'],
  parentPhone: ["Parent's WhatsApp", 'واتساب ولي الأمر'],
  noBus: ['No bus', 'بدون أتوبيس'],
  noPin: ['No home pin', 'لا يوجد موقع'],
  suggestTitle: ['children need a bus', 'طفل يحتاج أتوبيس'],
  suggestHelp: [
    "Darb only considers buses going to the child's school with a free seat, then picks the one whose pickups are closest to the child's home.",
    'يختار درب من الأتوبيسات المتجهة لمدرسة الطفل والتي بها مقعد فارغ، الأتوبيس الأقرب نقاط تحميله لمنزل الطفل.',
  ],
  acceptAll: ['Accept all suggestions', 'قبول كل الاقتراحات'],
  accept: ['Accept', 'قبول'],
  noSeat: ['No bus to this school has a free seat.', 'لا يوجد أتوبيس لهذه المدرسة به مقعد فارغ.'],
  fromPickups: ['from its nearest pickup', 'من أقرب نقطة تحميل'],
  leastFull: ['emptiest bus (no home pin)', 'الأتوبيس الأقل امتلاءً (لا يوجد موقع)'],
  filterAll: ['All', 'الكل'],
  filterUnassigned: ['Without a bus', 'بدون أتوبيس'],
  search: ['Search child or parent', 'ابحث عن طفل أو ولي أمر'],
  noResults: ['No children match.', 'لا توجد نتائج.'],
  addChildTitle: ['Add a child manually', 'إضافة طفل يدويًا'],
  addChildHelp: [
    'For families you already have on paper or Excel. Parents will register themselves in Phase 2.',
    'للعائلات المسجلة لديك على الورق أو إكسل. سيسجل أولياء الأمور بأنفسهم في المرحلة ٢.',
  ],
  coordinates: ['Home location (lat, lng)', 'موقع المنزل (خط العرض، خط الطول)'],
  coordinatesHelp: [
    'In Google Maps, long-press the house and copy the numbers, e.g. 30.0131, 31.2089',
    'في خرائط جوجل اضغط مطولًا على المنزل وانسخ الأرقام، مثال: 30.0131, 31.2089',
  ],
  badCoordinates: ['Location must look like 30.0131, 31.2089', 'يجب أن يكون الموقع بالشكل 30.0131, 31.2089'],
  childAdded: ['Child added', 'تمت إضافة الطفل'],
  drivers: ['Drivers', 'السائقون'],
  supervisors: ['Supervisors', 'المشرفات'],
  fullName: ['Full name', 'الاسم بالكامل'],
  phone: ['Mobile', 'الموبايل'],
  role: ['Role', 'الوظيفة'],
  role_driver: ['Driver', 'سائق'],
  role_supervisor: ['Supervisor', 'مشرفة'],
  licenseExpiry: ['License expiry', 'انتهاء الرخصة'],
  addPerson: ['Add a person', 'إضافة شخص'],
  assignedTo: ['Assigned to', 'معيّن على'],
  later: ['Later', 'لاحقًا'],
  invalidPhone: ['Enter an Egyptian mobile number, like 010 1234 5678.', 'أدخل رقم موبايل مصري مثل 010 1234 5678.'],
  duplicatePhone: ['That phone number is already registered.', 'رقم الموبايل مسجل بالفعل.'],
  nameRequired: ['Enter a name.', 'أدخل الاسم.'],
  prices: ['Prices & discounts', 'الأسعار والخصومات'],
  monthlyPrice: ['Monthly price per child (EGP)', 'السعر الشهري للطفل (ج.م)'],
  siblingDiscount: ['Sibling discount %', 'خصم الإخوة ٪'],
  returningDiscount: ['Returning family %', 'خصم العائلات القديمة ٪'],
  termMonths: ['Months in a term', 'عدد شهور الترم'],
  termDiscount: ['Term discount %', 'خصم الترم ٪'],
  yearMonths: ['Months in the school year', 'عدد شهور السنة الدراسية'],
  yearDiscount: ['Full-year discount %', 'خصم السنة الكاملة ٪'],
  pricePreview: ['What parents will pay', 'ما سيدفعه ولي الأمر'],
  plan_month: ['Monthly', 'شهري'],
  plan_term: ['One term', 'ترم واحد'],
  plan_year: ['Full school year', 'سنة دراسية كاملة'],
  oneChild: ['1 child', 'طفل واحد'],
  twoChildren: ['2 children', 'طفلان'],
  schools: ['Schools', 'المدارس'],
  addSchool: ['Add a school', 'إضافة مدرسة'],
  nameAr: ['Name in Arabic', 'الاسم بالعربية'],
  nameEn: ['Name in English', 'الاسم بالإنجليزية'],
  errorGeneric: ['Something went wrong. Please try again.', 'حدث خطأ. حاول مرة أخرى.'],
  inUse: ['Still linked to buses or children, so it can’t be deleted.', 'مرتبط بأتوبيسات أو أطفال ولا يمكن حذفه.'],
  landingParents: ['Register your children', 'سجّل أطفالك'],
  landingParentsSoon: ['Parent registration opens soon.', 'تسجيل أولياء الأمور يفتح قريبًا.'],
  landingAdmin: ['Admin sign in', 'دخول الإدارة'],
} as const;

export type Key = keyof typeof D;

export function getLocale(): Locale {
  const v = cookies().get('lang')?.value;
  return v === 'en' ? 'en' : 'ar';
}

export function getT(locale: Locale = getLocale()) {
  const i = locale === 'ar' ? 1 : 0;
  return (k: Key) => D[k][i];
}

export const schoolName = (s: { name_ar: string; name_en: string } | null | undefined, locale: Locale) =>
  s ? (locale === 'ar' ? s.name_ar : s.name_en) : '—';

export const GRADES = ['KG1', 'KG2', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'];
export const gradeLabel = (g: string | null, locale: Locale) => {
  if (!g) return '—';
  if (locale === 'en') return g.startsWith('G') ? 'Grade ' + g.slice(1) : g;
  return g.startsWith('KG') ? 'كي جي ' + g.slice(2) : 'الصف ' + g.slice(1);
};
