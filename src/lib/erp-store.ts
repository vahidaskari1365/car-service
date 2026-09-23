// ─── دیتاستور درون‌حافظه‌ای (بدون دیتابیس) ───
// داده‌ها در حافظه سرور نگهداری می‌شوند و با هر CRUD فوراً به‌روزرسانی می‌شوند.
import type { ERPData, ActivityLog } from './erp-types';
import { employees, vehicles, customers, suppliers } from './erp-seed-a';
import {
  deals, workOrders, rentals, installments, parts,
  purchaseRequests, processes, transactions, activityLogs,
} from './erp-seed-b';
import { uid } from './erp-utils';

const initialData = (): ERPData => ({
  vehicles: JSON.parse(JSON.stringify(vehicles)),
  customers: JSON.parse(JSON.stringify(customers)),
  deals: JSON.parse(JSON.stringify(deals)),
  workOrders: JSON.parse(JSON.stringify(workOrders)),
  rentals: JSON.parse(JSON.stringify(rentals)),
  installments: JSON.parse(JSON.stringify(installments)),
  parts: JSON.parse(JSON.stringify(parts)),
  suppliers: JSON.parse(JSON.stringify(suppliers)),
  purchaseRequests: JSON.parse(JSON.stringify(purchaseRequests)),
  processes: JSON.parse(JSON.stringify(processes)),
  transactions: JSON.parse(JSON.stringify(transactions)),
  activityLogs: JSON.parse(JSON.stringify(activityLogs)),
  employees: JSON.parse(JSON.stringify(employees)),
  aiSettings: { provider: 'built-in' },
});

const ENTITIES = [
  'vehicles', 'customers', 'deals', 'workOrders', 'rentals', 'installments',
  'parts', 'suppliers', 'purchaseRequests', 'processes', 'transactions',
  'activityLogs', 'employees',
] as const;

export type EntityName = (typeof ENTITIES)[number];

export function isEntity(name: string): name is EntityName {
  return (ENTITIES as readonly string[]).includes(name);
}

interface StoreHolder {
  __erpData?: ERPData;
}

const g = globalThis as unknown as StoreHolder;

export function getStore(): ERPData {
  if (!g.__erpData) {
    g.__erpData = initialData();
  }
  return g.__erpData;
}

export function resetStore(): void {
  g.__erpData = initialData();
}

// ─── CRUD عمومی ───

export function listEntity(name: EntityName): unknown[] {
  return getStore()[name] as unknown[];
}

export function createEntity(name: EntityName, body: Record<string, unknown>): unknown {
  const store = getStore();
  const item = { id: uid(), ...body } as Record<string, unknown>;
  (store[name] as unknown[]).unshift(item);
  logActivity('ثبت رکورد جدید', nameFa(name), `رکورد جدید در ${nameFa(name)} ایجاد شد`);
  return item;
}

export function updateEntity(name: EntityName, id: string, body: Record<string, unknown>): unknown | null {
  const store = getStore();
  const arr = store[name] as { id: string }[];
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...body, id };
  return arr[idx];
}

export function deleteEntity(name: EntityName, id: string): boolean {
  const store = getStore();
  const arr = store[name] as { id: string }[];
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  return true;
}

export function nameFa(entity: EntityName): string {
  const map: Record<EntityName, string> = {
    vehicles: 'خودروها', customers: 'مشتریان', deals: 'معاملات', workOrders: 'سفارش‌های کار',
    rentals: 'اجاره‌ها', installments: 'قراردادهای اقساط', parts: 'قطعات', suppliers: 'تأمین‌کنندگان',
    purchaseRequests: 'درخواست‌های خرید', processes: 'فرآیندها', transactions: 'تراکنش‌ها',
    activityLogs: 'لاگ فعالیت', employees: 'کارکنان',
  };
  return map[entity];
}

export function logActivity(action: string, module: string, details?: string): void {
  const log: ActivityLog = {
    id: uid('a'),
    at: new Date().toISOString(),
    by: 'کاربر سیستم',
    module,
    action,
    details,
  };
  getStore().activityLogs.unshift(log);
  if (getStore().activityLogs.length > 200) getStore().activityLogs.length = 200;
}

// ─── خلاصه داده برای هوش مصنوعی ───

export function aiContext(): string {
  const s = getStore();
  const sold = s.vehicles.filter(v => v.status === 'sold');
  const inStock = s.vehicles.filter(v => v.status === 'in_stock');
  const activeRentals = s.rentals.filter(r => r.status === 'active' || r.status === 'overdue');
  const openWO = s.workOrders.filter(w => w.status !== 'delivered');
  const lowStock = s.parts.filter(p => p.quantity <= p.minQuantity);
  const income = s.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = s.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const receivables = s.installments.filter(i => i.status === 'active').flatMap(i => i.schedule)
    .filter(r => r.status !== 'paid').reduce((a, r) => a + r.amount, 0)
    + s.rentals.filter(r => r.status === 'active').reduce((a, r) => a + Math.max(0, r.dailyRate * 30 - r.paidAmount), 0);

  const lines = [
    `خودروها: مجموع ${s.vehicles.length} | در نمایشگاه ${inStock.length} | فروخته ${sold.length} | در تعمیرگاه ${s.vehicles.filter(v => v.status === 'in_repair').length} | در اجاره ${s.vehicles.filter(v => v.status === 'rented').length} | رزرو ${s.vehicles.filter(v => v.status === 'reserved').length}`,
    `فهرست خودروها: ${s.vehicles.map(v => `${v.model} (${v.year}) — وضعیت: ${v.status} — خرید: ${(v.purchasePrice / 1e9).toFixed(2)} میلیارد${v.salePrice ? ` — فروش: ${(v.salePrice / 1e9).toFixed(2)} میلیارد` : ''}${v.costs.length ? ` — هزینه‌ها: ${(v.costs.reduce((a, c) => a + c.amount, 0) / 1e6).toFixed(0)} میلیون` : ''}`).join(' | ')}`,
    `معاملات: ${s.deals.map(d => `${d.code} ${d.type === 'sale' ? 'فروش' : 'خرید'} — ${d.price / 1e6} میلیون — وضعیت ${d.status}`).join(' | ')}`,
    `مشتریان: ${s.customers.length} نفر (VIP: ${s.customers.filter(c => c.segment === 'vip').length}، وفادار: ${s.customers.filter(c => c.segment === 'loyal').length}، بالقوه: ${s.customers.filter(c => c.segment === 'prospect').length}) — ${s.customers.map(c => `${c.firstName} ${c.lastName} (${c.segment})`).join('، ')}`,
    `سفارش‌های کار باز: ${openWO.map(w => `${w.code} ${w.status} (${w.type})`).join(' | ')}`,
    `اجاره فعال/معوق: ${activeRentals.map(r => `${r.code} ${r.status} نرخ ${(r.dailyRate / 1e6)} میلیون/روز`).join(' | ')}`,
    `اقساط: ${s.installments.map(i => `${i.code} وضعیت ${i.status} — مبلغ خودرو ${i.vehiclePrice / 1e6} میلیون — پیش‌پرداخت ${i.downPayment / 1e6} — ${i.months} قسط ${i.monthlyPayment / 1e6} میلیون — امتیاز اعتباری ${i.creditScore ?? '—'}`).join(' | ')}`,
    `قطعات کم‌موجود: ${lowStock.length ? lowStock.map(p => `${p.name} (${p.quantity} از حداقل ${p.minQuantity})`).join(' | ') : 'ندارد'}`,
    `مالی: درآمد ثبت‌شده ${(income / 1e9).toFixed(2)} میلیارد — هزینه ${(expense / 1e9).toFixed(2)} میلیارد — سود عملیاتی ${(income - expense) / 1e9} میلیارد`,
    `مطالبات (اقساط واجاره برآوردی): ${(receivables / 1e9).toFixed(2)} میلیارد`,
    `تأمین‌کنندگان: ${s.suppliers.map(x => `${x.name} (مانده ${(x.balance / 1e6)} میلیون، امتیاز ${x.rating})`).join(' | ')}`,
    `درخواست‌های خرید باز: ${s.purchaseRequests.filter(p => !['paid', 'rejected'].includes(p.status)).map(p => `${p.code} ${p.status}`).join(' | ')}`,
    `فرآیندهای جاری: ${s.processes.filter(p => p.currentStageIndex < p.stages.length - 1).map(p => `${p.code} ${p.title} — مرحله ${p.currentStageIndex + 1} از ${p.stages.length}`).join(' | ')}`,
    `کارکنان: ${s.employees.map(e => `${e.name} (${e.role} — ${e.division})`).join('، ')}`,
  ];
  return lines.join('\n');
}
