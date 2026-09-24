// ─── ابزارهای فرمت‌دهی فارسی ───

const faNum = new Intl.NumberFormat('fa-IR');

export function faNumber(n: number): string {
  return faNum.format(n);
}

/** نمایش مبلغ به تومان با رقم فارسی */
export function money(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  return faNum.format(Math.round(n)) + ' تومان';
}

/** نمایش مبلغ به‌صورت خلاصه: میلیارد / میلیون */
export function moneyShort(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return faNum.format(Math.round(v * 10) / 10) + ' میلیارد تومان';
  }
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return faNum.format(Math.round(v)) + ' میلیون تومان';
  }
  return faNum.format(Math.round(n)) + ' تومان';
}

/** تاریخ شمسی (تقویم فارسی در همه محیط‌ها تضمین می‌شود) */
export function jdate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

/** تاریخ و ساعت شمسی */
export function jdatetime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function percent(n: number, digits = 1): string {
  return faNum.format(Math.round(n * 10 ** digits) / 10 ** digits) + '٪';
}

export function km(n: number): string {
  return faNum.format(n) + ' کیلومتر';
}

// ─── برچسب‌های وضعیت ───

export const vehicleStatusLabels: Record<string, string> = {
  in_stock: 'در نمایشگاه', preparing: 'در آماده‌سازی', reserved: 'رزرو شده',
  sold: 'فروخته شده', rented: 'در اجاره', in_repair: 'در تعمیرگاه',
};

export const vehicleStatusTone: Record<string, string> = {
  in_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  preparing: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  reserved: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30',
  sold: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30',
  rented: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
  in_repair: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
};

export const dealStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', negotiating: 'در مذاکره', contracted: 'قرارداد بسته شد',
  delivered: 'تحویل شده', cancelled: 'لغو شده',
};

export const woStatusLabels: Record<string, string> = {
  received: 'پذیرش', diagnosis: 'کارشناسی', awaiting_approval: 'انتظار تأیید مشتری',
  in_repair: 'در حال تعمیر', quality_control: 'کنترل کیفیت', ready: 'آماده تحویل', delivered: 'تحویل شده',
};

export const rentalStatusLabels: Record<string, string> = {
  reserved: 'رزرو شده', active: 'در اجاره', returned: 'عودت شده',
  overdue: 'تأخیر در عودت', cancelled: 'لغو شده',
};

export const insStatusLabels: Record<string, string> = {
  applied: 'ثبت درخواست', credit_check: 'اعتبارسنجی', approved: 'تأیید شده',
  contracted: 'قرارداد', active: 'جاری', completed: 'تسویه', rejected: 'رد شده', defaulted: 'معوق',
};

export const purchaseStatusLabels: Record<string, string> = {
  draft: 'پیش‌نویس', pending_approval: 'در انتظار تأیید مدیر', approved: 'تأیید شده',
  rejected: 'رد شده', ordered: 'سفارش داده شده', received: 'دریافت شده', paid: 'پرداخت شده',
};

export const segmentLabels: Record<string, string> = {
  vip: 'VIP', loyal: 'مشتری وفادار', regular: 'عادی', new: 'جدید', prospect: 'مشتری بالقوه',
};

export const dealTypeLabels: Record<string, string> = { purchase: 'خرید از مشتری', sale: 'فروش به مشتری' };
export const woTypeLabels: Record<string, string> = {
  mechanic: 'مکانیکی', body_paint: 'صافکاری و نقاشی', inspection: 'کارشناسی',
  preparation: 'آماده‌سازی', electrical: 'برق و الکترونیک',
};
export const fuelLabels: Record<string, string> = { full: 'مخزن پر', half: 'نصف', empty: 'خالی' };
export const transactionMethodLabels: Record<string, string> = {
  cash: 'نقدی', card: 'کارت‌خوان', transfer: 'حواله', cheque: 'چک',
};

/** محاسبه سود واقعی خودرو: فروش − خرید − هزینه‌ها */
export function vehicleProfit(v: {
  purchasePrice: number; salePrice?: number; costs: { amount: number }[];
}): number | null {
  if (!v.salePrice) return null;
  const costs = v.costs.reduce((s, c) => s + c.amount, 0);
  return v.salePrice - v.purchasePrice - costs;
}

/** مجموع هزینه‌های خودرو */
export function vehicleCostsTotal(v: { costs: { amount: number }[] }): number {
  return v.costs.reduce((s, c) => s + c.amount, 0);
}

/** هزینه فاکتور تعمیرگاه */
export function workOrderTotal(wo: { laborHours: number; laborRate: number; parts: { qty: number; unitPrice: number }[] }): number {
  const labor = wo.laborHours * wo.laborRate;
  const parts = wo.parts.reduce((s, p) => s + p.qty * p.unitPrice, 0);
  return labor + parts;
}
