// ─── تعریف انواع نود طراح فرآیند (مشترک بین کلاینت و سرور) ───
import type { FlowNodeKind } from './erp-types';

export interface FlowFieldDef {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  showIf?: { key: string; equals: string };   // فیلد فقط وقتی نمایش داده شود که config[key] === equals
  hint?: string;
}

export interface FlowKindDef {
  fa: string;
  desc: string;
  tone: string;          // کلاس رنگ آیکون
  fields: FlowFieldDef[];
}

export const TRIGGER_EVENTS = [
  { value: 'customer_request', label: 'درخواست جدید مشتری' },
  { value: 'sale_order', label: 'ثبت سفارش فروش' },
  { value: 'workshop_entry', label: 'ورود خودرو به تعمیرگاه' },
  { value: 'installment_due', label: 'سررسید قسط' },
  { value: 'rental_end', label: 'پایان قرارداد اجاره' },
];

export const TASK_ACTIONS = [
  { value: 'check_inventory', label: 'بررسی موجودی نمایشگاه' },
  { value: 'prepare_vehicle', label: 'آماده‌سازی خودرو' },
  { value: 'check_customer', label: 'بررسی مدارک مشتری' },
  { value: 'check_parts', label: 'بررسی موجودی قطعه در انبار' },
  { value: 'register_docs', label: 'ثبت قرارداد در سامانه' },
];

export const CONDITION_DEFS = [
  { value: 'has_stock', label: 'خودروی آماده فروش موجود است؟' },
  { value: 'credit_ok', label: 'اعتبار مشتری بالای حد مجاز (۶۰) است؟' },
  { value: 'parts_ok', label: 'قطعه‌ای زیر حد موجودی نیست؟' },
  { value: 'has_open_wo', label: 'سفارش کار بازی وجود دارد؟' },
];

export const NOTIFY_CHANNELS = [
  { value: 'sms', label: 'پیامک' },
  { value: 'email', label: 'ایمیل' },
  { value: 'app', label: 'اعلان سامانه' },
];

export const KIND_DEFS: Record<FlowNodeKind, FlowKindDef> = {
  trigger: {
    fa: 'رویداد شروع', desc: 'نقطه فعال‌سازی فرآیند', tone: 'text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300',
    fields: [{ key: 'event', label: 'رویداد فعال‌ساز', type: 'select', options: TRIGGER_EVENTS, required: true }],
  },
  task: {
    fa: 'عملیات', desc: 'انجام یک کار واقعی در سامانه', tone: 'text-sky-600 bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300',
    fields: [
      { key: 'action', label: 'نوع عملیات', type: 'select', options: TASK_ACTIONS, required: true },
      { key: 'responsible', label: 'مسئول اجرا', type: 'text', placeholder: 'مثلاً: کارشناس فروش', required: true },
      { key: 'partName', label: 'نام قطعه', type: 'text', placeholder: 'مثلاً: لنت ترمز', showIf: { key: 'action', equals: 'check_parts' } },
      { key: 'partQty', label: 'تعداد لازم', type: 'number', placeholder: 'مثلاً: ۴', showIf: { key: 'action', equals: 'check_parts' } },
    ],
  },
  condition: {
    fa: 'شرط / انشعاب', desc: 'بررسی واقعی داده‌ها و انشعاب مسیر', tone: 'text-violet-600 bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300',
    fields: [{ key: 'cond', label: 'شرط', type: 'select', options: CONDITION_DEFS, required: true }],
  },
  approval: {
    fa: 'تأیید مدیر', desc: 'ایستگاه تصمیم و تأیید انسانی', tone: 'text-rose-600 bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300',
    fields: [{ key: 'approver', label: 'تأییدکننده', type: 'text', placeholder: 'مثلاً: مدیرعامل', required: true }],
  },
  notify: {
    fa: 'اطلاع‌رسانی', desc: 'ارسال پیام یا اعلان', tone: 'text-teal-600 bg-teal-100 dark:bg-teal-500/15 dark:text-teal-300',
    fields: [
      { key: 'channel', label: 'کانال', type: 'select', options: NOTIFY_CHANNELS, required: true },
      { key: 'recipient', label: 'گیرنده', type: 'text', placeholder: 'شماره موبایل / ایمیل / نام کارشناس', required: true },
    ],
  },
  delay: {
    fa: 'انتظار / تأخیر', desc: 'مکث زمانی در فرآیند', tone: 'text-orange-600 bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300',
    fields: [{ key: 'label', label: 'مدت انتظار', type: 'text', placeholder: 'مثلاً: ۲۴ ساعت' }],
  },
  end: {
    fa: 'پایان فرآیند', desc: 'اتمام مسیر', tone: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300',
    fields: [],
  },
};

/** برچسب کوتاه پیکربندی برای نمایش داخل نود روی بوم */
export function configSummary(kind: FlowNodeKind, config: Record<string, string>): string {
  switch (kind) {
    case 'trigger': return TRIGGER_EVENTS.find(o => o.value === config.event)?.label || 'رویداد انتخاب نشده';
    case 'task': return TASK_ACTIONS.find(o => o.value === config.action)?.label || 'عملیات انتخاب نشده';
    case 'condition': return CONDITION_DEFS.find(o => o.value === config.cond)?.label || 'شرط انتخاب نشده';
    case 'approval': return config.approver ? `تأییدکننده: ${config.approver}` : 'تأییدکننده تعیین نشده';
    case 'notify': {
      const ch = NOTIFY_CHANNELS.find(o => o.value === config.channel)?.label;
      if (!ch) return 'کانال تعیین نشده';
      return `${ch} → ${config.recipient || 'بدون گیرنده'}`;
    }
    case 'delay': return config.label ? `انتظار: ${config.label}` : 'بدون مدت';
    case 'end': return 'اتمام مسیر';
  }
}
