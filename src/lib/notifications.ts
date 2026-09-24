// ─── موتور محاسبه اعلان‌ها و هشدارها (مشترک بین داشبورد و مرکز اعلان‌ها) ───
import type { ERPData } from './erp-types';
import { daysFromToday, toFaDigits } from './jalaali';

export interface ErpAlert {
  id: string;
  type: 'rental' | 'installment' | 'stock' | 'purchase' | 'crm' | 'insurance' | 'inspection';
  view: string;               // ماژول مرتبط برای پرش
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  dueHint?: string;           // «۲ روز مانده» / «۳ روز گذشته»
}

const VIEW_BY_TYPE: Record<ErpAlert['type'], string> = {
  rental: 'rental',
  installment: 'installments',
  stock: 'parts',
  purchase: 'purchasing',
  crm: 'crm',
  insurance: 'vehicles',
  inspection: 'vehicles',
};

function hint(days: number): string {
  if (days === 0) return 'امروز';
  if (days > 0) return `${toFaDigits(days)} روز مانده`;
  return `${toFaDigits(Math.abs(days))} روز گذشته`;
}

export function computeAlerts(s: ERPData): ErpAlert[] {
  const alerts: ErpAlert[] = [];

  // ── اجاره: تأخیر در عودت + عودت نزدیک ──
  for (const r of s.rentals) {
    const cust = s.customers.find(c => c.id === r.customerId);
    const cname = cust ? `${cust.firstName} ${cust.lastName}` : '—';
    if (r.status === 'overdue') {
      alerts.push({
        id: `overdue-${r.id}`, type: 'rental', view: 'rental',
        title: 'تأخیر در عودت خودروی اجاره‌ای',
        description: `قرارداد ${r.code} — مهلت عودت به مشتری ${cname} گذشته است`,
        severity: 'high', dueHint: hint(daysFromToday(r.endDate)),
      });
    } else if (r.status === 'active') {
      const d = daysFromToday(r.endDate);
      if (d <= 2) {
        alerts.push({
          id: `returndue-${r.id}`, type: 'rental', view: 'rental',
          title: d === 0 ? 'عودت خودروی اجاره‌ای امروز است' : 'موعد عودت اجاره نزدیک است',
          description: `قرارداد ${r.code} — خودرو ${s.vehicles.find(v => v.id === r.vehicleId)?.model || ''} — مشتری ${cname}`,
          severity: d < 0 ? 'high' : 'medium', dueHint: hint(d),
        });
      }
    }
  }

  // ── اقساط: معوق + سررسید نزدیک (فردا و امروز) ──
  for (const i of s.installments.filter(x => x.status === 'active')) {
    const cust = s.customers.find(c => c.id === i.customerId);
    const cname = cust ? `${cust.firstName} ${cust.lastName}` : '—';
    for (const r of i.schedule) {
      if (r.status === 'paid') continue;
      const d = daysFromToday(r.dueDate);
      if (r.status === 'late') {
        alerts.push({
          id: `ins-late-${i.code}-${r.no}`, type: 'installment', view: 'installments',
          title: 'قسط معوق',
          description: `قرارداد ${i.code} — قسط شماره ${r.no} به مبلغ ${Math.round(r.amount / 1e6)} میلیون — مشتری: ${cname}`,
          severity: 'high', dueHint: hint(d),
        });
      } else if (d <= 3 && d >= 0) {
        alerts.push({
          id: `ins-due-${i.code}-${r.no}`, type: 'installment', view: 'installments',
          title: d === 0 ? 'سررسید قسط امروز است' : 'سررسید قسط نزدیک است',
          description: `قرارداد ${i.code} — قسط شماره ${r.no} به مبلغ ${Math.round(r.amount / 1e6)} میلیون — مشتری: ${cname}`,
          severity: 'medium', dueHint: hint(d),
        });
      }
    }
  }

  // ── بیمه منقضی یا نزدیک انقضا ──
  for (const v of s.vehicles) {
    if (v.insuranceExpiry) {
      const d = daysFromToday(v.insuranceExpiry);
      if (d < 0) {
        alerts.push({
          id: `ins-exp-${v.id}`, type: 'insurance', view: 'vehicles',
          title: 'بیمه‌نامه خودرو منقضی شده است',
          description: `${v.brand} ${v.model} (${v.plate || v.vin}) — بیمه‌نامه منقضی؛ تمدید فوری لازم است`,
          severity: 'high', dueHint: hint(d),
        });
      } else if (d <= 30) {
        alerts.push({
          id: `ins-soon-${v.id}`, type: 'insurance', view: 'vehicles',
          title: 'بیمه‌نامه به‌زودی منقضی می‌شود',
          description: `${v.brand} ${v.model} (${v.plate || v.vin}) — ${d === 0 ? 'امروز آخرین مهلت' : `${toFaDigits(d)} روز تا انقضای بیمه‌نامه`}`,
          severity: 'medium', dueHint: hint(d),
        });
      }
    }
    if (v.inspectionExpiry) {
      const d = daysFromToday(v.inspectionExpiry);
      if (d < 0) {
        alerts.push({
          id: `insp-exp-${v.id}`, type: 'inspection', view: 'vehicles',
          title: 'معاینه فنی منقضی شده است',
          description: `${v.brand} ${v.model} (${v.plate || v.vin}) — گواهی معاینه فنی منقضی؛ انجام آزمون لازم است`,
          severity: 'high', dueHint: hint(d),
        });
      } else if (d <= 15) {
        alerts.push({
          id: `insp-soon-${v.id}`, type: 'inspection', view: 'vehicles',
          title: 'معاینه فنی به‌زودی منقضی می‌شود',
          description: `${v.brand} ${v.model} (${v.plate || v.vin}) — ${d === 0 ? 'امروز آخرین مهلت' : `${toFaDigits(d)} روز تا انقضا`}`,
          severity: 'medium', dueHint: hint(d),
        });
      }
    }
  }

  // ── موجودی قطعات ──
  for (const p of s.parts.filter(p => p.quantity <= p.minQuantity)) {
    alerts.push({
      id: `stock-${p.id}`, type: 'stock', view: 'parts',
      title: 'موجودی قطعه کم است',
      description: `${p.name} (${p.code}) — موجودی ${p.quantity} از حداقل ${p.minQuantity}`,
      severity: p.quantity === 0 ? 'high' : 'medium',
    });
  }

  // ── تأیید خرید ──
  for (const p of s.purchaseRequests.filter(p => p.status === 'pending_approval')) {
    alerts.push({
      id: `purchase-${p.id}`, type: 'purchase', view: 'purchasing',
      title: 'درخواست خرید در انتظار تأیید',
      description: `${p.code} — ${p.items.map(i => i.name).join('، ')}`,
      severity: 'medium',
    });
  }

  // ── پیگیری CRM ──
  for (const c of s.customers) {
    for (const f of c.followUps) {
      if (f.done) continue;
      const d = daysFromToday(f.dueDate);
      if (d <= 2) {
        alerts.push({
          id: `crm-${f.id}`, type: 'crm', view: 'crm',
          title: d < 0 ? 'پیگیری مشتری عقب‌افتاده' : 'پیگیری مشتری',
          description: `${c.firstName} ${c.lastName} — ${f.title}`,
          severity: d < 0 ? 'medium' : 'low', dueHint: hint(d),
        });
      }
    }
  }

  // ترتیب: بحرانی → متوسط → کم
  const order = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
