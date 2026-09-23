// ─── داده‌های اولیه (Seed) بخش ۲ — عملیات ───
import type {
  Deal, WorkOrder, Rental, InstallmentContract, Part, Supplier,
  PurchaseRequest, WorkflowProcess, Transaction, ActivityLog,
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
let _c = 500;
const cid = (p: string) => `${p}${(++_c).toString(36)}`;

export const deals: Deal[] = [
  { id: 'd1', code: 'SL-1001', vehicleId: 'v4', customerId: 'c2', type: 'sale', price: 1_010_000_000, commission: 15_000_000, agentId: 'e2', status: 'delivered', date: iso(12), deliveryDate: iso(9), notes: 'پرداخت کامل نقدی' },
  { id: 'd2', code: 'SL-1002', vehicleId: 'v8', customerId: 'c3', type: 'sale', price: 1_340_000_000, commission: 20_000_000, agentId: 'e3', status: 'delivered', date: iso(25), deliveryDate: iso(20) },
  { id: 'd3', code: 'BY-1003', vehicleId: 'v1', customerId: 'c9', type: 'purchase', price: 940_000_000, commission: 0, agentId: 'e2', status: 'delivered', date: iso(45), deliveryDate: iso(45), notes: 'خرید نقدی از مشتری' },
  { id: 'd4', code: 'SL-1004', vehicleId: 'v3', customerId: 'c1', type: 'sale', price: 1_085_000_000, commission: 12_000_000, agentId: 'e3', status: 'contracted', date: iso(4), notes: '۵۰ میلیون بیعانه دریافت شد' },
  { id: 'd5', code: 'SL-1005', vehicleId: 'v18', customerId: 'c4', type: 'sale', price: 4_120_000_000, commission: 35_000_000, agentId: 'e2', status: 'negotiating', date: iso(3), notes: 'مشتری در حال بررسی مالی' },
  { id: 'd6', code: 'BY-1006', vehicleId: 'v2', customerId: 'c9', type: 'purchase', price: 415_000_000, commission: 0, agentId: 'e3', status: 'delivered', date: iso(30), deliveryDate: iso(30) },
  { id: 'd7', code: 'SL-1007', vehicleId: 'v13', customerId: 'c12', type: 'sale', price: 765_000_000, commission: 10_000_000, agentId: 'e3', status: 'draft', date: iso(1), notes: 'درخواست قیمت گرفته، در حال مذاکره' },
  { id: 'd8', code: 'SL-1008', vehicleId: 'v7', customerId: 'c8', type: 'sale', price: 655_000_000, commission: 8_000_000, agentId: 'e2', status: 'cancelled', date: iso(18), notes: 'مشتری منصرف شد — تأخیر در پاسخ' },
];

export const workOrders: WorkOrder[] = [
  { id: 'w1', code: 'WO-2001', vehicleId: 'v6', type: 'mechanic', status: 'in_repair', complaint: 'صدای تق‌تق از جلوبندی جلو و لرزش در سرعت بالا', diagnosis: 'تعویض سیبک و بوش جلوبندی + بالانس', technicianId: 'e5', receivedAt: iso(4), laborHours: 6, laborRate: 3_500_000, parts: [ { partId: 'p1', qty: 2, unitPrice: 8_500_000 }, { partId: 'p2', qty: 4, unitPrice: 1_200_000 } ], logs: [ { at: iso(4), by: 'مهدی رضایی', action: 'پذیرش خودرو' }, { at: iso(3), by: 'علی نوری', action: 'کارشناسی و اعلام قطعات', note: 'تأیید مشتری دریافت شد' }, { at: iso(2), by: 'علی نوری', action: 'شروع تعمیر' } ] },
  { id: 'w2', code: 'WO-2002', vehicleId: 'v15', type: 'body_paint', status: 'quality_control', complaint: 'صافکاری گلگیر جلو راست + نقاشی کاپوت', diagnosis: 'صافکاری و رنگ‌کاری دو قطعه', technicianId: 'e6', receivedAt: iso(8), laborHours: 12, laborRate: 3_000_000, parts: [ { partId: 'p8', qty: 3, unitPrice: 4_800_000 } ], qualityCheck: { done: true, by: 'مهدی رضایی', passed: true, notes: 'کیفیت رنگ مناسب، فقط پرداخت نهایی باقی مانده' }, logs: [ { at: iso(8), by: 'مهدی رضایی', action: 'پذیرش' }, { at: iso(6), by: 'حسین شریفی', action: 'شروع صافکاری' }, { at: iso(2), by: 'حسین شریفی', action: 'پایان رنگ و ارجاع به کنترل کیفیت' } ] },
  { id: 'w3', code: 'WO-2003', vehicleId: 'v2', type: 'body_paint', status: 'delivered', complaint: 'صافکاری درب عقب چپ (خرید خودرو)', diagnosis: 'صافکاری و رنگ درب', technicianId: 'e6', receivedAt: iso(28), completedAt: iso(24), laborHours: 8, laborRate: 3_000_000, parts: [ { partId: 'p8', qty: 2, unitPrice: 4_800_000 } ], qualityCheck: { done: true, by: 'مهدی رضایی', passed: true }, logs: [ { at: iso(28), by: 'مهدی رضایی', action: 'پذیرش' }, { at: iso(24), by: 'مهدی رضایی', action: 'تحویل و ثبت در سوابق خودرو' } ] },
  { id: 'w4', code: 'WO-2004', vehicleId: 'v9', type: 'mechanic', status: 'ready', complaint: 'سرویس دوره‌ای ۱۰ هزار کیلومتر + مشکل دینام', diagnosis: 'سرویس کامل + تعویض دینام', technicianId: 'e5', receivedAt: iso(6), laborHours: 4, laborRate: 3_500_000, parts: [ { partId: 'p5', qty: 1, unitPrice: 1_850_000 }, { partId: 'p3', qty: 1, unitPrice: 9_200_000 }, { partId: 'p6', qty: 1, unitPrice: 1_400_000 } ], qualityCheck: { done: true, by: 'مهدی رضایی', passed: true }, logs: [ { at: iso(6), by: 'مهدی رضایی', action: 'پذیرش خودرو ناوگان اجاره' }, { at: iso(1), by: 'علی نوری', action: 'پایان کار و کنترل کیفیت' } ] },
  { id: 'w5', code: 'WO-2005', vehicleId: 'v11', type: 'inspection', status: 'awaiting_approval', complaint: 'کارشناسی کامل پیش از ورود به ناوگان اجاره', diagnosis: 'تعویض دیسک و لنت جلو توصیه شد', receivedAt: iso(2), laborHours: 2, laborRate: 3_000_000, parts: [], logs: [ { at: iso(2), by: 'مهدی رضایی', action: 'کارشناسی انجام شد', note: 'در انتظار تأیید مدیر اجاره برای هزینه' } ] },
  { id: 'w6', code: 'WO-2006', vehicleId: 'v13', type: 'preparation', status: 'diagnosis', complaint: 'آماده‌سازی فروش — شست‌وشو، برق و تنظیمات', technicianId: 'e6', receivedAt: iso(1), laborHours: 0, laborRate: 3_000_000, parts: [], logs: [ { at: iso(1), by: 'مهدی رضایی', action: 'پذیرش جهت آماده‌سازی' } ] },
  { id: 'w7', code: 'WO-2007', vehicleId: 'v7', type: 'electrical', status: 'delivered', complaint: 'خرابی سنسور پارک و نور داشبورد', diagnosis: 'تعویض سنسور پارک عقب', technicianId: 'e5', receivedAt: iso(35), completedAt: iso(33), laborHours: 3, laborRate: 3_500_000, parts: [ { partId: 'p4', qty: 1, unitPrice: 6_400_000 } ], qualityCheck: { done: true, by: 'مهدی رضایی', passed: true }, logs: [ { at: iso(35), by: 'مهدی رضایی', action: 'پذیرش' }, { at: iso(33), by: 'مهدی رضایی', action: 'تحویل' } ] },
  { id: 'w8', code: 'WO-2008', vehicleId: 'v10', type: 'mechanic', status: 'received', complaint: 'دوگانه روشن نمی‌شود', receivedAt: iso(0, 9), laborHours: 0, laborRate: 3_500_000, parts: [], logs: [ { at: iso(0, 9), by: 'مهدی رضایی', action: 'پذیرش اولیه' } ] },
];

export const rentals: Rental[] = [
  { id: 'r1', code: 'RN-3001', vehicleId: 'v9', customerId: 'c5', status: 'active', startDate: iso(12), endDate: isoAhead(18), dailyRate: 4_500_000, deposit: 200_000_000, mileageOut: 58000, fuelOut: 'full', damages: [], fines: [], paidAmount: 135_000_000, notes: 'قرارداد سازمانی ۱ ماهه' },
  { id: 'r2', code: 'RN-3002', vehicleId: 'v10', customerId: 'c6', status: 'active', startDate: iso(5), endDate: isoAhead(2), dailyRate: 2_800_000, deposit: 100_000_000, mileageOut: 45100, fuelOut: 'full', damages: [], fines: [], paidAmount: 39_200_000 },
  { id: 'r3', code: 'RN-3003', vehicleId: 'v10', customerId: 'c8', status: 'overdue', startDate: iso(14), endDate: iso(-4), dailyRate: 2_800_000, deposit: 100_000_000, mileageOut: 44800, fuelOut: 'half', damages: [ { id: cid('dm'), title: 'خط و خش درب جلو', amount: 8_000_000 } ], fines: [], paidAmount: 44_800_000, notes: 'تماس‌های پیگیری ثبت شده — مشتری قول عودت فردا' },
  { id: 'r4', code: 'RN-3004', vehicleId: 'v16', customerId: 'c6', status: 'returned', startDate: iso(25), endDate: iso(-18), actualReturnDate: iso(-18), dailyRate: 1_800_000, deposit: 80_000_000, mileageOut: 131000, mileageIn: 133400, fuelOut: 'full', fuelIn: 'full', damages: [], fines: [], paidAmount: 32_400_000 },
  { id: 'r5', code: 'RN-3005', vehicleId: 'v12', customerId: 'c2', status: 'reserved', startDate: isoAhead(3), endDate: isoAhead(10), dailyRate: 7_500_000, deposit: 300_000_000, mileageOut: 72800, fuelOut: 'full', damages: [], fines: [], paidAmount: 0, notes: 'رزرو برای سفر شمال' },
  { id: 'r6', code: 'RN-3006', vehicleId: 'v9', customerId: 'c10', status: 'returned', startDate: iso(40), endDate: iso(-33), actualReturnDate: iso(-33), dailyRate: 4_500_000, deposit: 150_000_000, mileageOut: 54100, mileageIn: 56050, fuelOut: 'full', fuelIn: 'half', damages: [], fines: [ { id: cid('fn'), title: 'جریمه سرعت غیر مجاز', amount: 2_500_000 } ], paidAmount: 32_000_000 },
];

export const installments: InstallmentContract[] = [
  { id: 'i1', code: 'IN-4001', customerId: 'c2', vehicleId: 'v4', vehiclePrice: 1_010_000_000, downPayment: 400_000_000, months: 18, monthlyPayment: 36_800_000, interestRate: 23, guarantor: 'آقای رضا موسوی', creditScore: 82, status: 'active', startDate: iso(9), schedule: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(n => ({ no: n, dueDate: isoAhead(n * 30), amount: 36_800_000, status: 'pending' as const })), notes: 'فروش اقساطی شاهین ۲۵' },
  { id: 'i2', code: 'IN-4002', customerId: 'c7', vehicleId: 'v13', vehiclePrice: 765_000_000, downPayment: 250_000_000, months: 24, monthlyPayment: 26_500_000, interestRate: 25, creditScore: 74, status: 'credit_check', startDate: iso(6), schedule: [], notes: 'در حال استعلام از سامانه اعتبارسنجی' },
  { id: 'i3', code: 'IN-4003', customerId: 'c11', vehicleId: 'v7', vehiclePrice: 655_000_000, downPayment: 200_000_000, months: 20, monthlyPayment: 24_600_000, interestRate: 24, creditScore: 61, status: 'applied', startDate: iso(3), schedule: [] },
  { id: 'i4', code: 'IN-4004', customerId: 'c5', vehicleId: 'v16', vehiclePrice: 380_000_000, downPayment: 150_000_000, months: 12, monthlyPayment: 21_900_000, interestRate: 22, guarantor: 'شرکت پیک‌ساران', creditScore: 90, status: 'active', startDate: iso(150), schedule: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({ no: n, dueDate: isoAhead((n - 5) * 30), amount: 21_900_000, status: (n <= 4 ? 'paid' : (n === 5 ? 'late' : 'pending')) as 'paid' | 'late' | 'pending', paidDate: n <= 4 ? iso(150 - (n - 1) * 30) : undefined })), notes: 'اقساط شرکت — قسط ۵ معوق' },
  { id: 'i5', code: 'IN-4005', customerId: 'c8', vehicleId: 'v2', vehiclePrice: 455_000_000, downPayment: 0, months: 0, monthlyPayment: 0, interestRate: 0, creditScore: 45, status: 'rejected', startDate: iso(15), schedule: [], notes: 'رد به دلیل سوء سابقه چک برگشتی' },
];

export const parts: Part[] = [
  { id: 'p1', code: 'PT-001', name: 'سیبک فرمان رانا/دنا', category: 'جلوبندی', compatibleModels: ['رانا', 'دنا', 'سمند'], quantity: 8, minQuantity: 5, unit: 'عدد', purchasePrice: 6_900_000, salePrice: 8_500_000, shelf: 'A-12', movements: [ { id: cid('m'), type: 'out', qty: 2, date: iso(2), ref: 'WO-2001' } ] },
  { id: 'p2', code: 'PT-002', name: 'بوش جلوبندی پلی‌اورتان', category: 'جلوبندی', compatibleModels: ['رانا', 'دنا', 'سمند', 'پژو'], quantity: 12, minQuantity: 8, unit: 'عدد', purchasePrice: 850_000, salePrice: 1_200_000, shelf: 'A-13', movements: [ { id: cid('m'), type: 'out', qty: 4, date: iso(2), ref: 'WO-2001' } ] },
  { id: 'p3', code: 'PT-003', name: 'دینام پژو پارس/۲۰۷', category: 'برق', compatibleModels: ['پژو پارس', '۲۰۷'], quantity: 2, minQuantity: 2, unit: 'عدد', purchasePrice: 7_400_000, salePrice: 9_200_000, shelf: 'B-04', movements: [ { id: cid('m'), type: 'out', qty: 1, date: iso(1), ref: 'WO-2004' }, { id: cid('m'), type: 'in', qty: 3, date: iso(20), ref: 'PO-5001' } ] },
  { id: 'p4', code: 'PT-004', name: 'سنسور پارک عقب سمند', category: 'برق', compatibleModels: ['سمند', 'دنا'], quantity: 4, minQuantity: 3, unit: 'عدد', purchasePrice: 5_100_000, salePrice: 6_400_000, shelf: 'B-07', movements: [ { id: cid('m'), type: 'out', qty: 1, date: iso(33), ref: 'WO-2007' } ] },
  { id: 'p5', code: 'PT-005', name: 'فیلتر روغن و هوا (ست سرویس)', category: 'مصرفی', compatibleModels: ['پژو پارس', '۲۰۷', 'پراید', 'تیبا'], quantity: 25, minQuantity: 10, unit: 'ست', purchasePrice: 1_350_000, salePrice: 1_850_000, shelf: 'C-01', movements: [ { id: cid('m'), type: 'out', qty: 1, date: iso(1), ref: 'WO-2004' } ] },
  { id: 'p6', code: 'PT-006', name: 'روغن موتور ۴ لیتر ال‌پی‌جی مناسب', category: 'مصرفی', compatibleModels: ['عمومی'], quantity: 18, minQuantity: 10, unit: 'گالن', purchasePrice: 1_050_000, salePrice: 1_400_000, shelf: 'C-02', movements: [ { id: cid('m'), type: 'out', qty: 1, date: iso(1), ref: 'WO-2004' } ] },
  { id: 'p7', code: 'PT-007', name: 'دیسک و لنت جلو ساندرو', category: 'ترمز', compatibleModels: ['ساندرو'], quantity: 3, minQuantity: 4, unit: 'ست', purchasePrice: 9_800_000, salePrice: 12_500_000, shelf: 'A-21', movements: [] },
  { id: 'p8', code: 'PT-008', name: 'رنگ و مواد صافکاری (لیتر)', category: 'رنگ و مواد مصرفی', compatibleModels: ['عمومی'], quantity: 14, minQuantity: 8, unit: 'لیتر', purchasePrice: 3_600_000, salePrice: 4_800_000, shelf: 'D-02', movements: [ { id: cid('m'), type: 'out', qty: 2, date: iso(24), ref: 'WO-2003' }, { id: cid('m'), type: 'out', qty: 3, date: iso(2), ref: 'WO-2002' } ] },
  { id: 'p9', code: 'PT-009', name: 'باتری ۶۶ آمپر', category: 'برق', compatibleModels: ['پراید', 'تیبا', 'پژو'], quantity: 6, minQuantity: 4, unit: 'عدد', purchasePrice: 5_800_000, salePrice: 7_100_000, shelf: 'B-01', movements: [] },
  { id: 'p10', code: 'PT-010', name: 'لاستیک ۱۸۵/۶۵R14', category: 'لاستیک', compatibleModels: ['پراید', 'تیبا'], quantity: 9, minQuantity: 8, unit: 'حلقه', purchasePrice: 4_200_000, salePrice: 5_300_000, shelf: 'E-01', movements: [] },
  { id: 'p11', code: 'PT-011', name: 'کمپرسور کولر ۲۰۷', category: 'موتور', compatibleModels: ['۲۰۷'], quantity: 1, minQuantity: 1, unit: 'عدد', purchasePrice: 24_000_000, salePrice: 29_500_000, shelf: 'B-11', movements: [] },
  { id: 'p12', code: 'PT-012', name: 'شمع دوگانه‌سوز', category: 'مصرفی', compatibleModels: ['سمند', 'پژو'], quantity: 2, minQuantity: 6, unit: 'عدد', purchasePrice: 780_000, salePrice: 1_050_000, shelf: 'C-05', movements: [] },
  { id: 'p13', code: 'PT-013', name: 'چراغ جلو تیبا ۲', category: 'بدنه', compatibleModels: ['تیبا ۲'], quantity: 4, minQuantity: 2, unit: 'عدد', purchasePrice: 3_900_000, salePrice: 4_900_000, shelf: 'F-03', movements: [] },
  { id: 'p14', code: 'PT-014', name: 'فن رادیاتور پژو پارس', category: 'موتور', compatibleModels: ['پژو پارس'], quantity: 2, minQuantity: 2, unit: 'عدد', purchasePrice: 6_300_000, salePrice: 7_800_000, shelf: 'B-09', movements: [] },
];

export const purchaseRequests: PurchaseRequest[] = [
  { id: 'pr1', code: 'PO-5001', requesterId: 'e4', status: 'paid', items: [ { name: 'دینام پژو پارس', partId: 'p3', qty: 3, estimatedPrice: 7_400_000 } ], quotes: [ { supplierId: 's2', price: 7_400_000, leadDays: 3 }, { supplierId: 's5', price: 7_900_000, leadDays: 1 } ], approvals: [ { by: 'وحید عسکری', at: iso(21), decision: 'approved', note: 'تأیید شد' } ], createdAt: iso(22) },
  { id: 'pr2', code: 'PO-5002', requesterId: 'e6', status: 'pending_approval', items: [ { name: 'رنگ آبی متالیک کاپوت و گلگیر', qty: 5, estimatedPrice: 3_600_000 }, { name: 'بتونه و مواد جانبی', qty: 1, estimatedPrice: 4_200_000 } ], quotes: [ { supplierId: 's3', price: 22_200_000, leadDays: 2 }, { supplierId: 's1', price: 24_000_000, leadDays: 4 } ], approvals: [], createdAt: iso(2), notes: 'جهت تکمیل WO-2002' },
  { id: 'pr3', code: 'PO-5003', requesterId: 'e4', status: 'approved', items: [ { name: 'دیسک و لنت جلو ساندرو', partId: 'p7', qty: 4, estimatedPrice: 9_800_000 } ], quotes: [ { supplierId: 's1', price: 9_600_000, leadDays: 5 }, { supplierId: 's2', price: 9_800_000, leadDays: 2 } ], approvals: [ { by: 'وحید عسکری', at: iso(1), decision: 'approved', note: 'سریع‌تر تأمین شود' } ], createdAt: iso(4), notes: 'برای WO-2005 نیاز فوری' },
  { id: 'pr4', code: 'PO-5004', requesterId: 'e5', status: 'draft', items: [ { name: 'شمع دوگانه‌سوز', partId: 'p12', qty: 8, estimatedPrice: 780_000 } ], quotes: [], approvals: [], createdAt: iso(0), notes: 'حداقل موجودی رعایت شود' },
  { id: 'pr5', code: 'PO-5005', requesterId: 'e9', status: 'ordered', items: [ { name: 'لاستیک ۱۸۵/۶۵R14', partId: 'p10', qty: 8, estimatedPrice: 4_200_000 } ], quotes: [ { supplierId: 's4', price: 4_050_000, leadDays: 3 } ], approvals: [ { by: 'وحید عسکری', at: iso(5), decision: 'approved' } ], createdAt: iso(7) },
  { id: 'pr6', code: 'PO-5006', requesterId: 'e7', status: 'rejected', items: [ { name: 'چراغ جلو تیبا ۲', partId: 'p13', qty: 10, estimatedPrice: 3_900_000 } ], quotes: [ { supplierId: 's2', price: 39_000_000, leadDays: 7 } ], approvals: [ { by: 'وحید عسکری', at: iso(9), decision: 'rejected', note: 'موجودی فعلی کافی است' } ], createdAt: iso(11) },
];

export const processes: WorkflowProcess[] = [
  { id: 'wf1', code: 'WF-6001', type: 'purchase', title: 'فرآیند خرید لاستیک برای ناوگان اجاره', relatedRef: 'PO-5005', currentStageIndex: 4, createdBy: 'امیر قاسمی', createdAt: iso(7), stages: [ { name: 'ثبت درخواست خرید', responsible: 'امیر قاسمی', status: 'done', startedAt: iso(7), completedAt: iso(7), logs: [ { at: iso(7), by: 'امیر قاسمی', action: 'درخواست ثبت شد', note: '۸ حلقه لاستیک' } ] }, { name: 'تأیید مدیر', responsible: 'وحید عسکری', status: 'done', startedAt: iso(6), completedAt: iso(5), logs: [ { at: iso(5), by: 'وحید عسکری', action: 'تأیید شد' } ] }, { name: 'مقایسه قیمت و انتخاب تأمین‌کننده', responsible: 'امیر قاسمی', status: 'done', startedAt: iso(5), completedAt: iso(5), logs: [ { at: iso(5), by: 'امیر قاسمی', action: 'تأمین‌کننده لاستیک رحمت انتخاب شد', note: 'بهترین قیمت و ارسال ۳ روزه' } ] }, { name: 'سفارش خرید', responsible: 'فاطمه حسینی', status: 'done', startedAt: iso(5), completedAt: iso(5), logs: [ { at: iso(5), by: 'فاطمه حسینی', action: 'سفارش ثبت و پیش‌پرداخت واریز شد' } ] }, { name: 'دریافت و کنترل کالا', responsible: 'امیر قاسمی', status: 'in_progress', startedAt: iso(3), logs: [ { at: iso(3), by: 'امیر قاسمی', action: 'در انتظار تحویل بار', note: 'پیک ترخیص: فردا صبح' } ] }, { name: 'ثبت در انبار', responsible: 'نگهدار انبار', status: 'pending', logs: [] }, { name: 'پرداخت نهایی', responsible: 'فاطمه حسینی', status: 'pending', logs: [] } ] },
  { id: 'wf2', code: 'WF-6002', type: 'repair', title: 'فرآیند تعمیر جلوبندی رانا پلاس', relatedRef: 'WO-2001', currentStageIndex: 4, createdBy: 'مهدی رضایی', createdAt: iso(4), stages: [ { name: 'پذیرش خودرو', responsible: 'مهدی رضایی', status: 'done', startedAt: iso(4), completedAt: iso(4), logs: [ { at: iso(4), by: 'مهدی رضایی', action: 'پذیرش و ثبت شکایت مشتری' } ] }, { name: 'کارشناسی و تشخیص', responsible: 'علی نوری', status: 'done', startedAt: iso(3), completedAt: iso(3), logs: [ { at: iso(3), by: 'علی نوری', action: 'تشخیص: سیبک و بوش جلوبندی' } ] }, { name: 'تأیید مشتری و برآورد هزینه', responsible: 'مریم احمدی', status: 'done', startedAt: iso(3), completedAt: iso(3), logs: [ { at: iso(3), by: 'مریم احمدی', action: 'تأیید تلفنی مشتری دریافت شد' } ] }, { name: 'تخصیص تکنسین و شروع کار', responsible: 'مهدی رضایی', status: 'done', startedAt: iso(2), completedAt: iso(2), logs: [ { at: iso(2), by: 'مهدی رضایی', action: 'تخصیص به علی نوری' } ] }, { name: 'اجرای تعمیر و مصرف قطعات', responsible: 'علی نوری', status: 'in_progress', startedAt: iso(2), logs: [ { at: iso(2), by: 'علی نوری', action: 'قطعات از انبار برداشت شد' }, { at: iso(1), by: 'علی نوری', action: 'پیشرفت ۶۰ درصد', note: 'منتظر بوش سمت چپ' } ] }, { name: 'کنترل کیفیت', responsible: 'مهدی رضایی', status: 'pending', logs: [] }, { name: 'تحویل و صدور فاکتور', responsible: 'مریم احمدی', status: 'pending', logs: [] } ] },
  { id: 'wf3', code: 'WF-6003', type: 'sale', title: 'فرآیند فروش دنا پلاس — مشتری کاظمی', relatedRef: 'SL-1004', currentStageIndex: 2, createdBy: 'رضا کریمی', createdAt: iso(6), stages: [ { name: 'تماس و جلسه فروش', responsible: 'رضا کریمی', status: 'done', startedAt: iso(6), completedAt: iso(5), logs: [ { at: iso(5), by: 'رضا کریمی', action: 'بازدید حضوری انجام شد' } ] }, { name: 'قیمت‌گذاری و پیشنهاد', responsible: 'سعید محمدی', status: 'done', startedAt: iso(5), completedAt: iso(4), logs: [ { at: iso(4), by: 'سعید محمدی', action: 'قیمت نهایی ۱٬۰۸۵ میلیون تأیید شد' } ] }, { name: 'عقد قرارداد و دریافت بیعانه', responsible: 'فاطمه حسینی', status: 'in_progress', startedAt: iso(4), logs: [ { at: iso(4), by: 'فاطمه حسینی', action: 'قرارداد تنظیم شد', note: '۵۰ میلیون بیعانه واریز شد' } ] }, { name: 'آماده‌سازی مدارک و حواله', responsible: 'مریم احمدی', status: 'pending', logs: [] }, { name: 'تحویل خودرو', responsible: 'سعید محمدی', status: 'pending', logs: [] }, { name: 'تسویه نهایی و ثبت مالی', responsible: 'فاطمه حسینی', status: 'pending', logs: [] } ] },
  { id: 'wf4', code: 'WF-6004', type: 'rental', title: 'فرآیند اجاره مزدا ۳ — مشتری موسوی', relatedRef: 'RN-3005', currentStageIndex: 1, createdBy: 'امیر قاسمی', createdAt: iso(2), stages: [ { name: 'ثبت درخواست و رزرو', responsible: 'امیر قاسمی', status: 'done', startedAt: iso(2), completedAt: iso(2), logs: [ { at: iso(2), by: 'امیر قاسمی', action: 'رزرو ۳ روز آینده ثبت شد' } ] }, { name: 'اعتبارسنجی و ودیعه', responsible: 'مریم احمدی', status: 'in_progress', startedAt: iso(1), logs: [ { at: iso(1), by: 'مریم احمدی', action: 'بررسی مدارک در جریان است' } ] }, { name: 'عقد قرارداد اجاره', responsible: 'امیر قاسمی', status: 'pending', logs: [] }, { name: 'تحویل خودرو و ثبت کیلومتر و سوخت', responsible: 'امیر قاسمی', status: 'pending', logs: [] } ] },
  { id: 'wf5', code: 'WF-6005', type: 'custom', title: 'فرآیند اعتبارسنجی درخواست اقساط کوئیک', relatedRef: 'IN-4002', currentStageIndex: 1, createdBy: 'نگار صادقی', createdAt: iso(6), stages: [ { name: 'ثبت درخواست مشتری', responsible: 'نگار صادقی', status: 'done', startedAt: iso(6), completedAt: iso(6), logs: [ { at: iso(6), by: 'نگار صادقی', action: 'درخواست IN-4002 ثبت شد' } ] }, { name: 'استعلام اعتباری و بررسی مدارک', responsible: 'نگار صادقی', status: 'in_progress', startedAt: iso(5), logs: [ { at: iso(5), by: 'نگار صادقی', action: 'استعلام از سامانه اعتبارسنجی ارسال شد' } ] }, { name: 'تصمیم کمیسیون فروش', responsible: 'سعید محمدی', status: 'pending', logs: [] }, { name: 'اعلام به مشتری', responsible: 'مریم احمدی', status: 'pending', logs: [] } ] },
];

function tx(type: 'income' | 'expense', category: string, amount: number, daysAgo: number, division: string, description: string, method: Transaction['method'] = 'transfer'): Transaction {
  return { id: cid('t'), type, category, amount, date: iso(daysAgo), division, description, method };
}

export const transactions: Transaction[] = [
  tx('income', 'فروش خودرو', 1_010_000_000, 12, 'نمایشگاه', 'فروش شاهین ۲۵ — SL-1001', 'transfer'),
  tx('expense', 'خرید خودرو', 930_000_000, 75, 'نمایشگاه', 'خرید شاهین ۲۵', 'transfer'),
  tx('income', 'فروش خودرو', 1_340_000_000, 25, 'نمایشگاه', 'فروش سراتو — SL-1002', 'transfer'),
  tx('expense', 'خرید خودرو', 1_250_000_000, 120, 'نمایشگاه', 'خرید سراتو', 'transfer'),
  tx('income', 'اجاره خودرو', 135_000_000, 12, 'اجاره', 'اجاره سازمانی پژو پارس — RN-3001', 'transfer'),
  tx('income', 'اجاره خودرو', 39_200_000, 5, 'اجاره', 'اجاره تیبا ۲ — RN-3002', 'card'),
  tx('income', 'اجاره خودرو', 44_800_000, 14, 'اجاره', 'اجاره تیبا ۲ — RN-3003', 'card'),
  tx('income', 'اجاره خودرو', 32_400_000, 25, 'اجاره', 'اجاره پراید — RN-3004', 'cash'),
  tx('income', 'تعمیرات', 48_600_000, 24, 'تعمیرگاه', 'فاکتور صافکاری پراید — WO-2003', 'card'),
  tx('income', 'تعمیرات', 24_200_000, 33, 'تعمیرگاه', 'فاکتور برق سمند — WO-2007', 'card'),
  tx('expense', 'خرید قطعات', 22_200_000, 20, 'تعمیرگاه', 'خرید دینام — PO-5001', 'transfer'),
  tx('expense', 'حقوق و دستمزد', 185_000_000, 30, 'اداری', 'حقوق ماهانه کارکنان'),
  tx('expense', 'اجاره محل', 120_000_000, 28, 'اداری', 'اجاره نمایشگاه و تعمیرگاه', 'cheque'),
  tx('expense', 'تبلیغات', 45_000_000, 15, 'اداری', 'کمپین دیوید‌برد و دیوار'),
  tx('income', 'بیعانه', 50_000_000, 4, 'نمایشگاه', 'بیعانه دنا پلاس — SL-1004', 'card'),
  tx('expense', 'آماده‌سازی خودرو', 9_500_000, 40, 'تعمیرگاه', 'سرویس ۲۰۷', 'cash'),
  tx('income', 'اقساط', 21_900_000, 30, 'اقساط', 'قسط ۳ قرارداد IN-4004', 'transfer'),
  tx('income', 'اقساط', 21_900_000, 60, 'اقساط', 'قسط ۲ قرارداد IN-4004', 'transfer'),
  tx('income', 'اقساط', 21_900_000, 90, 'اقساط', 'قسط ۱ قرارداد IN-4004', 'transfer'),
  tx('expense', 'بیمه', 38_000_000, 20, 'اداری', 'بیمه ناوگان اجاره'),
];

export const activityLogs: ActivityLog[] = [
  { id: cid('a'), at: iso(0, 9), by: 'مهدی رضایی', module: 'تعمیرگاه', action: 'پذیرش تیبا ۲ ناوگان اجاره', details: 'WO-2008 ثبت شد' },
  { id: cid('a'), at: iso(1), by: 'علی نوری', module: 'تعمیرگاه', action: 'به‌روزرسانی WO-2001', details: 'پیشرفت ۶۰ درصد' },
  { id: cid('a'), at: iso(1), by: 'رضا کریمی', module: 'نمایشگاه', action: 'ثبت پیش‌نویس فروش کوئیک', details: 'SL-1007' },
  { id: cid('a'), at: iso(2), by: 'امیر قاسمی', module: 'اجاره', action: 'رزرو مزدا ۳', details: 'RN-3005' },
  { id: cid('a'), at: iso(3), by: 'وحید عسکری', module: 'خرید', action: 'تأیید درخواست PO-5003', details: 'دیسک و لنت ساندرو' },
  { id: cid('a'), at: iso(4), by: 'نگار صادقی', module: 'اقساط', action: 'ثبت درخواست اقساط', details: 'IN-4003' },
  { id: cid('a'), at: iso(5), by: 'فاطمه حسینی', module: 'مالی', action: 'ثبت دریافت بیعانه', details: '۵۰ میلیون — SL-1004' },
];
