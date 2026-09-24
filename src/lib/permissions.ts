// ─── سیستم دسترسی‌ها و نقش‌های کاربری ───
import type { AppUser, UserPerm, UserRole } from './erp-types';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

/** ماژول‌های ناوبری که قابل کنترل دسترسی هستند */
export const PERMISSION_MODULES: { id: string; label: string }[] = [
  { id: 'dashboard', label: 'داشبورد مدیریتی' },
  { id: 'vehicles', label: 'مدیریت خودرو' },
  { id: 'showroom', label: 'نمایشگاه (خرید/فروش)' },
  { id: 'workshop', label: 'تعمیرگاه و خدمات فنی' },
  { id: 'rental', label: 'اجاره خودرو' },
  { id: 'installments', label: 'اقساط و فاینانس' },
  { id: 'parts', label: 'قطعات و انبار' },
  { id: 'crm', label: 'مدیریت مشتریان' },
  { id: 'purchasing', label: 'خرید و تأمین' },
  { id: 'workflow', label: 'اتوماسیون فرآیندها' },
  { id: 'finance', label: 'امور مالی' },
  { id: 'reports', label: 'گزارش‌ها و عملکرد' },
  { id: 'builder', label: 'گزارش‌ساز' },
  { id: 'tracking', label: 'تراکینگ رویدادها' },
  { id: 'users', label: 'کاربران و دسترسی‌ها' },
  { id: 'ai', label: 'دستیار هوشمند' },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدیر ارشد — دسترسی کامل',
  manager: 'مدیر مجموعه',
  accountant: 'کارشناس مالی',
  workshop: 'پرسنل تعمیرگاه',
  sales: 'کارشناس فروش',
  rental: 'مسئول اجاره و ناوگان',
};

export const ROLE_SHORT: Record<UserRole, string> = {
  admin: 'مدیر ارشد',
  manager: 'مدیر مجموعه',
  accountant: 'مالی',
  workshop: 'تعمیرگاه',
  sales: 'فروش',
  rental: 'اجاره',
};

const F: UserPerm = { view: true, create: true, edit: true, delete: true };
const VE: UserPerm = { view: true, create: true, edit: true, delete: false };
const V: UserPerm = { view: true, create: false, edit: false, delete: false };

function preset(full: string[], edit: string[], view: string[]): Record<string, UserPerm> {
  const p: Record<string, UserPerm> = {};
  for (const m of PERMISSION_MODULES) {
    if (full.includes(m.id)) p[m.id] = { ...F };
    else if (edit.includes(m.id)) p[m.id] = { ...VE };
    else if (view.includes(m.id)) p[m.id] = { ...V };
    else p[m.id] = { view: false, create: false, edit: false, delete: false };
  }
  return p;
}

const ALL = PERMISSION_MODULES.map(m => m.id);

/** پیش‌تنظیم دسترسی هر نقش */
export const ROLE_PRESETS: Record<UserRole, Record<string, UserPerm>> = {
  admin: preset(ALL, [], []),
  manager: preset(
    ['dashboard', 'vehicles', 'showroom', 'workshop', 'rental', 'installments', 'parts', 'crm', 'purchasing', 'workflow', 'finance'],
    [],
    ['reports', 'builder', 'tracking', 'users', 'ai'],
  ),
  accountant: preset(
    ['finance'],
    ['installments'],
    ['dashboard', 'reports', 'builder', 'tracking', 'showroom', 'purchasing', 'ai'],
  ),
  workshop: preset(
    ['workshop'],
    ['vehicles', 'parts'],
    ['dashboard', 'tracking', 'ai'],
  ),
  sales: preset(
    ['showroom'],
    ['vehicles', 'crm'],
    ['dashboard', 'reports', 'builder', 'installments', 'ai'],
  ),
  rental: preset(
    ['rental'],
    ['vehicles'],
    ['dashboard', 'crm', 'tracking', 'ai'],
  ),
};

/** بررسی دسترسی کاربر به یک ماژول و عملیات — بدون کاربر یا قبل از بارگذاری قفل نمی‌شود */
export function canAccess(user: AppUser | null | undefined, module: string, action: PermAction = 'view'): boolean {
  if (!user) return true;
  if (!user.active) return action === 'view' ? true : false;
  if (user.role === 'admin') return true;
  return user.permissions?.[module]?.[action] ?? false;
}

/** دسترسی پیش‌فرض بر اساس نقش */
export function defaultPermissionsFor(role: UserRole): Record<string, UserPerm> {
  const clone = ROLE_PRESETS[role] || ROLE_PRESETS.sales;
  return JSON.parse(JSON.stringify(clone));
}

/** خلاصه متنی دسترسی: تعداد ماژول‌های قابل مشاهده */
export function permissionSummary(user: AppUser): string {
  if (user.role === 'admin') return 'همه ماژول‌ها';
  const count = PERMISSION_MODULES.filter(m => user.permissions?.[m.id]?.view).length;
  return `${count} از ${PERMISSION_MODULES.length} ماژول`;
}

/** حروف اول نام برای آواتار */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}
