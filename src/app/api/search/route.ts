import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/erp-store';

export const dynamic = 'force-dynamic';

interface SearchResult {
  id: string;
  type: string;       // نوع فارسی برای نمایش
  view: string;       // ماژول مقصد
  title: string;
  sub: string;
  badge?: string;
}

/** جستجوی سراسری بین همه ماژول‌ها */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const s = getStore();
  const norm = (x: string | undefined | null) => (x || '').toString().toLowerCase();
  const results: SearchResult[] = [];
  const push = (r: SearchResult) => {
    if (results.length < 30) results.push(r);
  };

  // خودروها
  for (const v of s.vehicles) {
    const hay = norm(`${v.brand} ${v.model} ${v.vin} ${v.plate} ${v.customerName} ${v.color} ${v.year} ${v.status}`);
    if (hay.includes(q)) {
      push({
        id: v.id, type: 'خودرو', view: 'vehicles',
        title: `${v.brand} ${v.model} (${v.year})`,
        sub: `${v.plate || v.vin} — ${v.customerName || 'بدون خریدار'}`,
        badge: v.status === 'sold' ? 'فروخته شده' : undefined,
      });
    }
  }

  // مشتریان
  for (const c of s.customers) {
    const hay = norm(`${c.firstName} ${c.lastName} ${c.phone} ${c.city} ${c.nationalId} ${c.tags.join(' ')}`);
    if (hay.includes(q)) {
      push({
        id: c.id, type: 'مشتری', view: 'crm',
        title: `${c.firstName} ${c.lastName}`,
        sub: `${c.phone} — ${c.city || '—'}`,
      });
    }
  }

  // معاملات
  for (const d of s.deals) {
    const v = s.vehicles.find(x => x.id === d.vehicleId);
    const c = s.customers.find(x => x.id === d.customerId);
    const hay = norm(`${d.code} ${v?.model} ${v?.brand} ${c?.firstName} ${c?.lastName}`);
    if (hay.includes(q)) {
      push({
        id: d.id, type: d.type === 'sale' ? 'معامله فروش' : 'معامله خرید', view: 'showroom',
        title: `${d.code} — ${v ? `${v.brand} ${v.model}` : 'خودرو'}`,
        sub: `${c ? `${c.firstName} ${c.lastName}` : '—'} — ${(d.price / 1e9).toFixed(2)} میلیارد`,
      });
    }
  }

  // سفارش‌های کار
  for (const w of s.workOrders) {
    const v = s.vehicles.find(x => x.id === w.vehicleId);
    const hay = norm(`${w.code} ${v?.model} ${v?.brand} ${w.complaint} ${w.diagnosis} ${v?.plate}`);
    if (hay.includes(q)) {
      push({
        id: w.id, type: 'سفارش کار تعمیرگاه', view: 'workshop',
        title: `${w.code} — ${v ? `${v.brand} ${v.model}` : '—'}`,
        sub: w.complaint.slice(0, 60),
      });
    }
  }

  // اجاره‌ها
  for (const r of s.rentals) {
    const v = s.vehicles.find(x => x.id === r.vehicleId);
    const c = s.customers.find(x => x.id === r.customerId);
    const hay = norm(`${r.code} ${v?.model} ${v?.brand} ${v?.plate} ${c?.firstName} ${c?.lastName}`);
    if (hay.includes(q)) {
      push({
        id: r.id, type: 'قرارداد اجاره', view: 'rental',
        title: `${r.code} — ${v ? `${v.brand} ${v.model}` : '—'}`,
        sub: `${c ? `${c.firstName} ${c.lastName}` : '—'} — نرخ ${(r.dailyRate / 1e6)} میلیون/روز`,
      });
    }
  }

  // اقساط
  for (const i of s.installments) {
    const v = s.vehicles.find(x => x.id === i.vehicleId);
    const c = s.customers.find(x => x.id === i.customerId);
    const hay = norm(`${i.code} ${v?.model} ${v?.brand} ${c?.firstName} ${c?.lastName} ${i.guarantor}`);
    if (hay.includes(q)) {
      push({
        id: i.id, type: 'قرارداد اقساط', view: 'installments',
        title: `${i.code} — ${c ? `${c.firstName} ${c.lastName}` : '—'}`,
        sub: `${v ? `${v.brand} ${v.model}` : '—'} — قسط ${(i.monthlyPayment / 1e6)} میلیون`,
      });
    }
  }

  // قطعات
  for (const p of s.parts) {
    const hay = norm(`${p.name} ${p.code} ${p.category} ${p.shelf} ${p.compatibleModels.join(' ')}`);
    if (hay.includes(q)) {
      push({
        id: p.id, type: 'قطعه انبار', view: 'parts',
        title: `${p.name} (${p.code})`,
        sub: `${p.category} — قفسه ${p.shelf} — موجودی ${p.quantity} ${p.unit}`,
      });
    }
  }

  // تأمین‌کنندگان
  for (const sp of s.suppliers) {
    const hay = norm(`${sp.name} ${sp.phone} ${sp.city} ${sp.categories.join(' ')}`);
    if (hay.includes(q)) {
      push({
        id: sp.id, type: 'تأمین‌کننده', view: 'purchasing',
        title: sp.name,
        sub: `${sp.phone} — مانده ${(sp.balance / 1e6)} میلیون`,
      });
    }
  }

  // درخواست‌های خرید
  for (const pr of s.purchaseRequests) {
    const hay = norm(`${pr.code} ${pr.items.map(i => i.name).join(' ')}`);
    if (hay.includes(q)) {
      push({
        id: pr.id, type: 'درخواست خرید', view: 'purchasing',
        title: `${pr.code} — ${pr.items[0]?.name || ''}`,
        sub: `تعداد اقلام: ${pr.items.length}`,
      });
    }
  }

  // فرآیندها
  for (const p of s.processes) {
    const hay = norm(`${p.code} ${p.title} ${p.createdBy} ${p.type}`);
    if (hay.includes(q)) {
      push({
        id: p.id, type: 'فرآیند اتوماسیون', view: 'workflow',
        title: `${p.code} — ${p.title}`,
        sub: `مرحله ${p.currentStageIndex + 1} از ${p.stages.length}`,
      });
    }
  }

  // تراکنش‌ها
  for (const t of s.transactions) {
    const hay = norm(`${t.description} ${t.category} ${t.division}`);
    if (hay.includes(q)) {
      push({
        id: t.id, type: t.type === 'income' ? 'درآمد' : 'هزینه', view: 'finance',
        title: t.description.slice(0, 60),
        sub: `${t.category} — ${(t.amount / 1e6)} میلیون — ${t.date?.slice(0, 10)}`,
      });
    }
  }

  return NextResponse.json({ results });
}
