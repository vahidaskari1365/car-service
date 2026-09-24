// ─── داده‌های اولیه (Seed) — مجموعه نمونه خودرویی ───
import type {
  Vehicle, Customer, Employee, Deal, WorkOrder, Rental, InstallmentContract,
  Part, Supplier, PurchaseRequest, WorkflowProcess, Transaction, ActivityLog,
} from './erp-types';

function iso(daysAgo: number, hour = 10): string {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function isoAhead(days: number, hour = 10): string {
  const d = new Date(Date.now() + days * 86400000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

let _c = 100;
const cid = (p: string) => `${p}${(++_c).toString(36)}`;

export const employees: Employee[] = [
  { id: 'e1', name: 'وحید عسکری', role: 'مدیرعامل', division: 'مدیریت', phone: '۰۹۱۲۱۱۱۲۲۳۳', active: true },
  { id: 'e2', name: 'سعید محمدی', role: 'مدیر فروش نمایشگاه', division: 'نمایشگاه', phone: '۰۹۱۲۲۲۳۳۴۴۵', active: true },
  { id: 'e3', name: 'رضا کریمی', role: 'کارشناس فروش', division: 'نمایشگاه', phone: '۰۹۱۹۳۳۴۴۵۵۶', active: true },
  { id: 'e4', name: 'مهدی رضایی', role: 'مدیر تعمیرگاه', division: 'تعمیرگاه', phone: '۰۹۱۲۴۴۵۵۶۶۷', active: true },
  { id: 'e5', name: 'علی نوری', role: 'تکنسین ارشد مکانیک', division: 'تعمیرگاه', phone: '۰۹۳۵۵۵۶۶۷۷۸', active: true },
  { id: 'e6', name: 'حسین شریفی', role: 'تکنسین صافکاری و نقاشی', division: 'تعمیرگاه', phone: '۰۹۳۶۶۶۷۷۸۸۹', active: true },
  { id: 'e7', name: 'مریم احمدی', role: 'مدیر CRM و پشتیبانی', division: 'پشتیبانی', phone: '۰۹۱۲۷۷۸۸۹۹۰۰', active: true },
  { id: 'e8', name: 'فاطمه حسینی', role: 'مدیر مالی', division: 'مالی', phone: '۰۹۱۲۸۸۹۹۰۰۱۱', active: true },
  { id: 'e9', name: 'امیر قاسمی', role: 'مسئول اجاره و ناوگان', division: 'اجاره', phone: '۰۹۱۲۹۹۰۰۱۱۲۲', active: true },
  { id: 'e10', name: 'نگار صادقی', role: 'کارشناس اعتبارسنجی و لیزینگ', division: 'اقساط', phone: '۰۹۱۲۱۰۲۰۳۰۴۰', active: true },
];

export const vehicles: Vehicle[] = [
  { id: 'v1', vin: 'IRN7P20M7JA451201', plate: '۱۲ ب ۳۴۵ ایران ۲۲', brand: 'پژو', model: '۲۰۷ اتوماتیک پانوراما', year: 1403, color: 'نقره‌ای', mileage: 18500, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - سالن اصلی', purchasePrice: 940_000_000, purchaseDate: iso(45), createdAt: iso(45), preparationStatus: 'done', insuranceExpiry: isoAhead(120), inspectionExpiry: isoAhead(95), costs: [ { id: cid('c'), title: 'سرویس کامل + شمع و روغن', amount: 9_500_000, date: iso(40), category: 'preparation' }, { id: cid('c'), title: 'حواله و نقل‌وانتقال', amount: 3_200_000, date: iso(40), category: 'documentation' } ], notes: 'بدون رنگ، بیمه کامل' },
  { id: 'v2', vin: 'IRN1P13D4BC778902', plate: '۴۴ ج ۶۷۸ ایران ۱۱', brand: 'پراید', model: 'پراید ۱۳۱', year: 1402, color: 'سفید', mileage: 42000, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - حیاط', purchasePrice: 415_000_000, purchaseDate: iso(30), createdAt: iso(30), preparationStatus: 'in_progress', insuranceExpiry: isoAhead(12), inspectionExpiry: isoAhead(8), costs: [ { id: cid('c'), title: 'صافکاری درب عقب', amount: 12_000_000, date: iso(25), category: 'repair' } ] },
  { id: 'v3', vin: 'IRN9DN3P8KD334411', plate: '۷۸ د ۹۰۱ ایران ۳۳', brand: 'ایران‌خودرو', model: 'دنا پلاس اتوماتیک', year: 1404, color: 'مشکی متالیک', mileage: 9800, category: 'showroom', status: 'reserved', location: 'نمایشگاه - ویترین', purchasePrice: 1_010_000_000, purchaseDate: iso(18), createdAt: iso(18), preparationStatus: 'done', insuranceExpiry: isoAhead(25), inspectionExpiry: isoAhead(160), costs: [ { id: cid('c'), title: 'شست‌وشو و پولیش', amount: 4_500_000, date: iso(15), category: 'preparation' } ], customerName: 'آقای کاظمی (رزرو)' },
  { id: 'v4', vin: 'IRN5SH2N6LA998833', plate: '۳۰ س ۱۲۳ ایران ۴۴', brand: 'سایپا', model: 'شاهین ۲۵', year: 1403, color: 'طوسی', mileage: 26300, category: 'showroom', status: 'sold', location: 'تحویل مشتری', purchasePrice: 930_000_000, purchaseDate: iso(75), createdAt: iso(75), salePrice: 1_010_000_000, saleDate: iso(9), preparationStatus: 'done', insuranceExpiry: isoAhead(200), inspectionExpiry: isoAhead(300), customerName: 'خانم موسوی', costs: [ { id: cid('c'), title: 'تعمیر کولر', amount: 15_000_000, date: iso(60), category: 'repair' }, { id: cid('c'), title: 'کارت و پلاک', amount: 2_800_000, date: iso(12), category: 'documentation' } ] },
  { id: 'v5', vin: 'IRN3TM4A9NB556677', plate: '۵۵ ط ۴۵۶ ایران ۵۵', brand: 'ایران‌خودرو', model: 'تارا اتوماتیک', year: 1404, color: 'سفید صدفی', mileage: 5400, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - ویترین', purchasePrice: 1_620_000_000, purchaseDate: iso(12), createdAt: iso(12), preparationStatus: 'none', insuranceExpiry: isoAhead(340), inspectionExpiry: isoAhead(350), costs: [] },
  { id: 'v6', vin: 'IRN8RN2P3PC221144', plate: '۲۱ ر ۷۸۹ ایران ۶۶', brand: 'ایران‌خودرو', model: 'رانا پلاس توربو', year: 1403, color: 'قرمز', mileage: 33400, category: 'showroom', status: 'in_repair', location: 'تعمیرگاه', purchasePrice: 605_000_000, purchaseDate: iso(22), createdAt: iso(22), preparationStatus: 'in_progress', insuranceExpiry: iso(-6), inspectionExpiry: iso(-12), costs: [ { id: cid('c'), title: 'در انتظار فاکتور تعمیرگاه', amount: 0, date: iso(3), category: 'repair' } ] },
  { id: 'v7', vin: 'IRN2SM4L7ND667788', plate: '۶۳ ص ۲۳۴ ایران ۷۷', brand: 'ایران‌خودرو', model: 'سمند LX دوگانه‌سوز', year: 1401, color: 'آبی نفتی', mileage: 88900, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - حیاط', purchasePrice: 620_000_000, purchaseDate: iso(38), createdAt: iso(38), preparationStatus: 'done', insuranceExpiry: isoAhead(45), inspectionExpiry: isoAhead(20), costs: [ { id: cid('c'), title: 'تنظیم موتور دوگانه', amount: 6_800_000, date: iso(33), category: 'preparation' } ] },
  { id: 'v8', vin: 'IRN6QK2R5PB889900', plate: '۸۹ ق ۵۶۷ ایران ۸۸', brand: 'کیا', model: 'سراتو COUPE', year: 1399, color: 'خاکستری', mileage: 121000, category: 'showroom', status: 'sold', location: 'تحویل مشتری', purchasePrice: 1_250_000_000, purchaseDate: iso(120), createdAt: iso(120), salePrice: 1_340_000_000, saleDate: iso(20), preparationStatus: 'done', insuranceExpiry: isoAhead(75), inspectionExpiry: isoAhead(280), customerName: 'آقای فرهادی', costs: [ { id: cid('c'), title: 'تعویض لاستیک ۴ عدد', amount: 38_000_000, date: iso(100), category: 'preparation' }, { id: cid('c'), title: 'برف‌پاک‌کن و فیلتر', amount: 2_400_000, date: iso(95), category: 'other' } ] },
  { id: 'v9', vin: 'IRN4PB2C1RA112233', plate: '۱۴ پ ۸۹۰ ایران ۹۹', brand: 'پژو', model: 'پارس سال', year: 1402, color: 'مشکی', mileage: 61200, category: 'rental_fleet', status: 'rented', location: 'تحویل به مشتری اجاره', purchasePrice: 870_000_000, purchaseDate: iso(400), createdAt: iso(400), preparationStatus: 'done', insuranceExpiry: isoAhead(18), inspectionExpiry: isoAhead(25), costs: [] },
  { id: 'v10', vin: 'IRN7TJ3D9SB445566', plate: '۴۵ ت ۱۲۳ ایران ۱۰', brand: 'سایپا', model: 'تیبا ۲', year: 1402, color: 'سفید', mileage: 47600, category: 'rental_fleet', status: 'rented', location: 'تحویل به مشتری اجاره', purchasePrice: 495_000_000, purchaseDate: iso(350), createdAt: iso(350), preparationStatus: 'done', insuranceExpiry: iso(-3), inspectionExpiry: iso(-1), costs: [] },
  { id: 'v11', vin: 'IRN9SD2P4TC778899', plate: '۷۶ س ۴۵۶ ایران ۲۱', brand: 'سایپا', model: 'ساندرو استپ‌وی', year: 1402, color: 'قهوه‌ای', mileage: 29800, category: 'rental_fleet', status: 'in_stock', location: 'پارکینگ ناوگان اجاره', purchasePrice: 1_390_000_000, purchaseDate: iso(280), createdAt: iso(280), preparationStatus: 'done', insuranceExpiry: isoAhead(90), inspectionExpiry: isoAhead(240), costs: [] },
  { id: 'v12', vin: 'IRN1KM4T2UB990011', plate: '۳۲ ک ۷۸۹ ایران ۳۲', brand: 'مزدا', model: 'مزدا ۳', year: 1401, color: 'قرمز جگری', mileage: 74300, category: 'rental_fleet', status: 'reserved', location: 'پارکینگ ناوگان اجاره', purchasePrice: 1_880_000_000, purchaseDate: iso(260), createdAt: iso(260), preparationStatus: 'done', insuranceExpiry: isoAhead(60), inspectionExpiry: isoAhead(180), costs: [] },
  { id: 'v13', vin: 'IRN5QX2P9VA223344', plate: '۹۸ خ ۲۳۴ ایران ۴۳', brand: 'کوئیک', model: 'کوئیک R', year: 1403, color: 'نارنجی', mileage: 15200, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - سالن اصلی', purchasePrice: 720_000_000, purchaseDate: iso(8), createdAt: iso(8), preparationStatus: 'none', insuranceExpiry: isoAhead(150), inspectionExpiry: isoAhead(330), costs: [] },
  { id: 'v14', vin: 'IRN3HM2S6WB556677', plate: '۶۷ ه ۵۶۷ ایران ۵۴', brand: 'ایران‌خودرو', model: 'هما S8', year: 1404, color: 'طوسی متالیک', mileage: 3100, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - ویترین', purchasePrice: 2_290_000_000, purchaseDate: iso(5), createdAt: iso(5), preparationStatus: 'none', insuranceExpiry: isoAhead(365), inspectionExpiry: isoAhead(400), costs: [] },
  { id: 'v15', vin: 'IRN8PN4K1XC889900', plate: '۸۵ ن ۸۹۰ ایران ۶۵', brand: 'پژو', model: '۲۰۷ نقره‌ای یدکی', year: 1401, color: 'نقره‌ای', mileage: 96800, category: 'service', status: 'in_repair', location: 'تعمیرگاه', purchasePrice: 780_000_000, purchaseDate: iso(200), createdAt: iso(200), preparationStatus: 'in_progress', insuranceExpiry: iso(-20), inspectionExpiry: iso(-30), costs: [] },
  { id: 'v16', vin: 'IRN2DP3M5YD112233', plate: '۵۹ ی ۳۴۵ ایران ۷۶', brand: 'سایپا', model: 'پراید ۱۳۱', year: 1400, color: 'سفید', mileage: 134500, category: 'rental_fleet', status: 'in_stock', location: 'پارکینگ ناوگان اجاره', purchasePrice: 380_000_000, purchaseDate: iso(450), createdAt: iso(450), preparationStatus: 'done', insuranceExpiry: isoAhead(40), inspectionExpiry: isoAhead(15), costs: [] },
  { id: 'v17', vin: 'IRN6CV2R8GD445566', plate: '۲۳ چ ۶۷۸ ایران ۸۷', brand: 'چری', model: 'آریزو ۶ پرو', year: 1403, color: 'مشکی', mileage: 18900, category: 'showroom', status: 'in_stock', location: 'نمایشگاه - سالن اصلی', purchasePrice: 1_450_000_000, purchaseDate: iso(15), createdAt: iso(15), preparationStatus: 'in_progress', insuranceExpiry: isoAhead(220), inspectionExpiry: isoAhead(310), costs: [ { id: cid('c'), title: 'بررسی برق و آپدیت نرم‌افزار', amount: 5_600_000, date: iso(10), category: 'preparation' } ] },
  { id: 'v18', vin: 'IRN4BK2T7HE667788', plate: '۴۱ ب ۹۰۱ ایران ۹۸', brand: 'بی‌ام‌و', model: '320i', year: 1399, color: 'سفید', mileage: 95200, category: 'showroom', status: 'reserved', location: 'نمایشگاه - ویترین', purchasePrice: 3_950_000_000, purchaseDate: iso(28), createdAt: iso(28), preparationStatus: 'done', insuranceExpiry: isoAhead(10), inspectionExpiry: isoAhead(140), customerName: 'آقای توکلی', costs: [ { id: cid('c'), title: 'سرویس تخصصی بی‌ام‌و + تعویض روغن گیربکس', amount: 45_000_000, date: iso(20), category: 'preparation' } ] },
];

export const customers: Customer[] = [
  { id: 'c1', firstName: 'محمد', lastName: 'کاظمی', phone: '۰۹۱۲۱۲۳۴۵۶۷', nationalId: '۰۱۲۳۴۵۶۷۸۹', type: 'individual', segment: 'vip', city: 'تهران', address: 'سعادت‌آباد، بلوار دریا', tags: ['خرید نقدی', 'معرفی مشتری'], followUps: [ { id: cid('f'), title: 'پیگیری عقد قرارداد دنا پلاس', dueDate: isoAhead(1), done: false, note: 'مشتری گفته تا فردا پیش‌پرداخت واریز می‌کند' } ], createdAt: iso(120) },
  { id: 'c2', firstName: 'زهرا', lastName: 'موسوی', phone: '۰۹۳۵۳۴۵۶۷۸۹', nationalId: '۲۳۴۵۶۷۸۹۰۱', type: 'individual', segment: 'loyal', city: 'تهران', tags: ['خرید اقساطی'], followUps: [ { id: cid('f'), title: 'تماس رضایت‌سنجی پس از فروش', dueDate: iso(-9), done: true } ], notes: 'دومین خرید از مجموعه', createdAt: iso(300) },
  { id: 'c3', firstName: 'علی', lastName: 'فرهادی', phone: '۰۹۱۹۴۵۶۷۸۹۰', type: 'individual', segment: 'vip', city: 'کرج', tags: ['خرید نقدی', 'فروش خودرو'], followUps: [], createdAt: iso(200) },
  { id: 'c4', firstName: 'حسین', lastName: 'توکلی', phone: '۰۹۱۲۵۶۷۸۹۰۱', type: 'individual', segment: 'regular', city: 'تهران', tags: ['رزرو'], followUps: [ { id: cid('f'), title: 'پیگیری پرداخت بیعانه بی‌ام‌و 320i', dueDate: isoAhead(2), done: false } ], createdAt: iso(45) },
  { id: 'c5', firstName: 'شرکت لجستیک', lastName: 'پیک‌ساران پارس', phone: '۰۲۱۸۸۷۷۶۶۵۵', type: 'company', segment: 'loyal', city: 'تهران', tags: ['اجاره بلندمدت', 'قرارداد سازمانی'], followUps: [ { id: cid('f'), title: 'تمدید قرارداد اجاره ۵ دستگاه تیبا', dueDate: isoAhead(12), done: false } ], createdAt: iso(180) },
  { id: 'c6', firstName: 'سارا', lastName: 'احمدی', phone: '۰۹۳۶۶۷۸۹۰۱۲', type: 'individual', segment: 'new', city: 'تهران', tags: ['اجاره کوتاه‌مدت'], followUps: [], createdAt: iso(60) },
  { id: 'c7', firstName: 'ناصر', lastName: 'قنبری', phone: '۰۹۱۲۷۸۹۰۱۲۳', type: 'individual', segment: 'prospect', city: 'تهران', tags: ['درخواست اقساط'], followUps: [ { id: cid('f'), title: 'اعلام نتیجه اعتبارسنجی اقساط', dueDate: isoAhead(1), done: false } ], createdAt: iso(20) },
  { id: 'c8', firstName: 'لیلا', lastName: 'رحیمی', phone: '۰۹۳۵۸۹۰۱۲۳۴', type: 'individual', segment: 'regular', city: 'تهران', tags: ['تعمیرات'], followUps: [], createdAt: iso(90) },
  { id: 'c9', firstName: 'بهنام', lastName: 'اسدی', phone: '۰۹۱۹۹۰۱۲۳۴۵', type: 'individual', segment: 'prospect', city: 'شهریار', tags: ['فروش خودرو'], followUps: [ { id: cid('f'), title: 'کارشناسی خودرو پراید جهت خرید از مشتری', dueDate: isoAhead(3), done: false } ], createdAt: iso(10) },
  { id: 'c10', firstName: 'مرضیه', lastName: 'سلطانی', phone: '۰۹۱۲۰۱۲۳۴۵۶', type: 'individual', segment: 'loyal', city: 'تهران', tags: ['سرویس دوره‌ای'], followUps: [], notes: 'همیشه سرویس دوره‌ای را در مجموعه انجام می‌دهد', createdAt: iso(400) },
  { id: 'c11', firstName: 'کامران', lastName: 'جهانگیری', phone: '۰۹۳۵۱۲۳۴۵۶۷', type: 'individual', segment: 'new', city: 'تهران', tags: ['درخواست اقساط'], followUps: [], createdAt: iso(7) },
  { id: 'c12', firstName: 'مهندس آرش', lastName: 'نیک‌پور', phone: '۰۹۱۲۳۴۵۶۷۸۹', type: 'individual', segment: 'vip', city: 'تهران', tags: ['خرید نقدی', 'معرفی مشتری'], followUps: [ { id: cid('f'), title: 'ارسال کاتالوگ تارا و هما', dueDate: isoAhead(4), done: false } ], createdAt: iso(150) },
];

export const suppliers: Supplier[] = [
  { id: 's1', name: 'فروشگاه قطعات ماشین‌آلات پارس', phone: '۰۲۱۵۵۴۴۳۳۲۲', city: 'تهران', categories: ['جلوبندی', 'موتور'], rating: 5, balance: 62_000_000 },
  { id: 's2', name: 'پخش لوازم یدکی ایران‌خودرو (منتخب)', phone: '۰۲۱۳۳۲۲۱۱۰۰', city: 'تهران', categories: ['بدنه', 'موتور', 'برق'], rating: 4, balance: 0 },
  { id: 's3', name: 'بازرگانی رنگ خودرو کیمیا', phone: '۰۲۱۶۶۷۷۸۸۹۹', city: 'تهران', categories: ['رنگ و مواد مصرفی'], rating: 4, balance: 18_500_000 },
  { id: 's4', name: 'لاستیک‌فروشی مرکزی رحمت', phone: '۰۲۱۴۴۵۵۶۶۷۷', city: 'تهران', categories: ['لاستیک'], rating: 5, balance: 0 },
  { id: 's5', name: 'قطعات برق و باتری البرز', phone: '۰۲۱۷۷۸۸۹۹۰۰', city: 'کرج', categories: ['برق', 'باتری'], rating: 3, balance: 9_200_000 },
  { id: 's6', name: 'فیلتر و لوازم مصرفی گلدستان', phone: '۰۲۱۸۸۹۹۰۰۱۱', city: 'تهران', categories: ['مصرفی'], rating: 4, balance: 0 },
];
