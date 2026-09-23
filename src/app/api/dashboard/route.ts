import { NextResponse } from 'next/server';
import { getStore } from '@/lib/erp-store';
import { vehicleCostsTotal, workOrderTotal } from '@/lib/erp-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getStore();

  const vehicleCounts = {
    total: s.vehicles.length,
    in_stock: s.vehicles.filter(v => v.status === 'in_stock').length,
    preparing: s.vehicles.filter(v => v.status === 'preparing').length,
    reserved: s.vehicles.filter(v => v.status === 'reserved').length,
    sold: s.vehicles.filter(v => v.status === 'sold').length,
    rented: s.vehicles.filter(v => v.status === 'rented').length,
    in_repair: s.vehicles.filter(v => v.status === 'in_repair').length,
  };

  const income = s.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = s.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  // مطالبات: اقساط پرداخت‌نشده + اجاره‌های فعال تسویه‌نشده
  const unpaidInstallments = s.installments
    .filter(i => i.status === 'active')
    .flatMap(i => i.schedule)
    .filter(r => r.status !== 'paid')
    .reduce((a, r) => a + r.amount, 0);
  const unpaidRentals = s.rentals
    .filter(r => r.status === 'active')
    .reduce((a, r) => a + Math.max(0, r.dailyRate * 30 - r.paidAmount), 0);

  // بدهی به تأمین‌کنندگان
  const payables = s.suppliers.reduce((a, x) => a + x.balance, 0);

  // سود هر خودروی فروخته‌شده
  const vehiclePnL = s.vehicles
    .filter(v => v.salePrice)
    .map(v => ({
      id: v.id,
      label: `${v.model} (${v.year})`,
      profit: v.salePrice! - v.purchasePrice - vehicleCostsTotal(v),
    }));

  // سود تعمیرگاه (نمونه: کارهای تحویل‌شده)
  const workshopRevenue = s.workOrders
    .filter(w => w.status === 'delivered')
    .reduce((a, w) => a + workOrderTotal(w), 0);

  const divisionRevenue: Record<string, number> = {};
  for (const t of s.transactions) {
    if (t.type !== 'income') continue;
    divisionRevenue[t.division] = (divisionRevenue[t.division] || 0) + t.amount;
  }

  const lowStock = s.parts
    .filter(p => p.quantity <= p.minQuantity)
    .map(p => ({ id: p.id, name: p.name, code: p.code, quantity: p.quantity, minQuantity: p.minQuantity }));

  const alerts: { id: string; type: string; title: string; description: string; severity: 'high' | 'medium' | 'low' }[] = [];
  const overdueRentals = s.rentals.filter(r => r.status === 'overdue');
  for (const r of overdueRentals) {
    const cust = s.customers.find(c => c.id === r.customerId);
    alerts.push({ id: r.id, type: 'rental', title: 'تأخیر در عودت خودروی اجاره‌ای', description: `قرارداد ${r.code} — مهلت عودت به مشتری ${cust ? cust.firstName + ' ' + cust.lastName : '—'} گذشته است`, severity: 'high' });
  }
  const lateInstallments = s.installments.filter(i => i.status === 'active')
    .flatMap(i => i.schedule.filter(r => r.status === 'late').map(r => ({ i, r })));
  for (const { i, r } of lateInstallments) {
    const cust = s.customers.find(c => c.id === i.customerId);
    alerts.push({ id: i.code + r.no, type: 'installment', title: 'قسط معوق', description: `قرارداد ${i.code} — قسط شماره ${r.no} به مبلغ ${Math.round(r.amount / 1e6)} میلیون — مشتری: ${cust ? cust.firstName + ' ' + cust.lastName : '—'}`, severity: 'high' });
  }
  for (const p of lowStock) {
    alerts.push({ id: p.id, type: 'stock', title: 'موجودی قطعه کم است', description: `${p.name} (${p.code}) — موجودی ${p.quantity} از حداقل ${p.minQuantity}`, severity: 'medium' });
  }
  const pendingApprovals = s.purchaseRequests.filter(p => p.status === 'pending_approval');
  for (const p of pendingApprovals) {
    alerts.push({ id: p.id, type: 'purchase', title: 'درخواست خرید در انتظار تأیید', description: `${p.code} — ${p.items.map(i => i.name).join('، ')}`, severity: 'medium' });
  }
  const dueFollowUps = s.customers.flatMap(c => c.followUps.filter(f => !f.done && new Date(f.dueDate) <= new Date(Date.now() + 2 * 86400000)).map(f => ({ c, f })));
  for (const { c, f } of dueFollowUps) {
    alerts.push({ id: f.id, type: 'crm', title: 'پیگیری مشتری', description: `${c.firstName} ${c.lastName} — ${f.title}`, severity: 'low' });
  }

  const openWorkOrders = s.workOrders.filter(w => w.status !== 'delivered').length;
  const workshopByStatus = s.workOrders.reduce<Record<string, number>>((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {});

  // روند ۶ ماه اخیر (ساده بر اساس تراکنش‌ها)
  const monthly: { month: string; income: number; expense: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = s.transactions.filter(t => {
      const td = new Date(t.date);
      return td >= d && td < next;
    });
    const monthName = new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(d);
    monthly.push({
      month: monthName,
      income: inMonth.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
      expense: inMonth.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
    });
  }

  return NextResponse.json({
    vehicleCounts,
    finance: { income, expense, profit: income - expense, receivables: unpaidInstallments + unpaidRentals, payables },
    divisionRevenue,
    vehiclePnL,
    workshop: { openWorkOrders, byStatus: workshopByStatus, revenue: workshopRevenue },
    lowStock,
    alerts,
    monthly,
    activity: s.activityLogs.slice(0, 8),
  });
}
