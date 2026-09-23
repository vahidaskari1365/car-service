'use client';

// ─── گزارش‌گیری و کنترل عملکرد ───
import { useMemo } from 'react';
import { Building2, UserCog, FileBarChart } from 'lucide-react';
import { KpiCard, PageHeader, SectionCard, LoadingTable, StatusPill } from '../shared';
import { useEntity } from '../use-erp';
import type { Deal, WorkOrder, Rental, Transaction, Employee, Vehicle, InstallmentContract } from '@/lib/erp-types';
import { moneyShort, faNumber, workOrderTotal, vehicleProfit } from '@/lib/erp-utils';

export default function ReportsView({ onOpenAI }: { onOpenAI?: () => void }) {
  const { items: deals } = useEntity<Deal>('deals');
  const { items: workOrders } = useEntity<WorkOrder>('workOrders');
  const { items: rentals } = useEntity<Rental>('rentals');
  const { items: transactions } = useEntity<Transaction>('transactions');
  const { items: employees } = useEntity<Employee>('employees');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: installments } = useEntity<InstallmentContract>('installments');

  const divisionStats = useMemo(() => {
    const divisions = ['نمایشگاه', 'تعمیرگاه', 'اجاره', 'اقساط'];
    return divisions.map(d => {
      const income = transactions.filter(t => t.division === d && t.type === 'income').reduce((a, t) => a + t.amount, 0);
      const expense = transactions.filter(t => t.division === d && t.type === 'expense').reduce((a, t) => a + t.amount, 0);
      let activity = 0;
      if (d === 'نمایشگاه') activity = deals.filter(x => x.status === 'delivered').length;
      if (d === 'تعمیرگاه') activity = workOrders.filter(w => w.status === 'delivered').length;
      if (d === 'اجاره') activity = rentals.filter(r => r.status === 'returned' || r.status === 'active').length;
      if (d === 'اقساط') activity = installments.filter(i => i.status === 'active').length;
      return { division: d, income, expense, profit: income - expense, activity };
    });
  }, [deals, workOrders, rentals, transactions, installments]);

  const employeeStats = useMemo(() => employees.map(e => {
    const dealsCount = deals.filter(d => d.agentId === e.id && d.status === 'delivered').length;
    const dealsValue = deals.filter(d => d.agentId === e.id && d.status === 'delivered').reduce((a, d) => a + d.price, 0);
    const commission = deals.filter(d => d.agentId === e.id && d.status === 'delivered').reduce((a, d) => a + d.commission, 0);
    const woCount = workOrders.filter(w => w.technicianId === e.id).length;
    const woRevenue = workOrders.filter(w => w.technicianId === e.id && w.status === 'delivered').reduce((a, w) => a + workOrderTotal(w), 0);
    return { ...e, dealsCount, dealsValue, commission, woCount, woRevenue };
  }), [employees, deals, workOrders]);

  const totalProfitRealized = vehicles.filter(v => v.salePrice).reduce((a, v) => a + (vehicleProfit(v) ?? 0), 0);

  return (
    <div className="view-enter">
      <PageHeader
        title="گزارش‌ها و کنترل عملکرد"
        description="عملکرد واحدها، کارکنان و شاخص‌های کلیدی مجموعه"
        action={
          <button onClick={onOpenAI} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
            <FileBarChart className="h-4 w-4" /> تولید گزارش با هوش مصنوعی
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="معاملات تحویل‌شده" value={faNumber(deals.filter(d => d.status === 'delivered').length)} icon={Building2} tone="amber" />
        <KpiCard title="سفارش کار تحویل‌شده" value={faNumber(workOrders.filter(w => w.status === 'delivered').length)} icon={Building2} tone="teal" />
        <KpiCard title="قرارداد اجاره" value={faNumber(rentals.length)} icon={Building2} tone="zinc" />
        <KpiCard title="سود محقق‌شده ناوگان" value={moneyShort(totalProfitRealized)} icon={Building2} tone="emerald" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="عملکرد واحدها" description="درآمد، هزینه و تعداد عملیات هر واحد">
          <div className="overflow-x-auto">
            <table className="erp-table w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-right py-2">واحد</th>
                  <th className="text-right py-2">درآمد</th>
                  <th className="text-right py-2">هزینه</th>
                  <th className="text-right py-2">سود</th>
                  <th className="text-right py-2">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {divisionStats.map(d => (
                  <tr key={d.division} className="border-b last:border-0">
                    <td className="py-2.5 font-bold">{d.division}</td>
                    <td className="py-2.5 text-emerald-700">{moneyShort(d.income)}</td>
                    <td className="py-2.5 text-red-600">{moneyShort(d.expense)}</td>
                    <td className={`py-2.5 font-bold ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{moneyShort(d.profit)}</td>
                    <td className="py-2.5">{faNumber(d.activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="عملکرد کارکنان" description="فروش، تعمیرات و کمیسیون به تفکیک فرد">
          <div className="max-h-72 overflow-y-auto">
            <table className="erp-table w-full text-xs">
              <thead className="text-muted-foreground border-b sticky top-0 bg-card">
                <tr>
                  <th className="text-right py-2">نام</th>
                  <th className="text-right py-2">واحد</th>
                  <th className="text-right py-2">عملکرد</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map(e => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2.5">
                      <div className="font-bold">{e.name}</div>
                      <div className="text-[10px] text-muted-foreground">{e.role}</div>
                    </td>
                    <td className="py-2.5">{e.division}</td>
                    <td className="py-2.5">
                      {e.dealsCount > 0 && <div>{faNumber(e.dealsCount)} معامله — {moneyShort(e.dealsValue)}</div>}
                      {e.woCount > 0 && <div>{faNumber(e.woCount)} سفارش کار — {moneyShort(e.woRevenue)}</div>}
                      {e.dealsCount === 0 && e.woCount === 0 && <div className="text-muted-foreground">—</div>}
                      {e.commission > 0 && <div className="text-emerald-700 font-bold">کمیسیون: {moneyShort(e.commission)}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="شاخص‌های کلیدی وضعیت" description="نمای کلی سلامت عملیات" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-wrap">
          <StatusPill label={`نرخ تبدیل معاملات: ${faNumber(Math.round((deals.filter(d => d.status === 'delivered').length / Math.max(1, deals.length)) * 100))}٪`} tone="bg-amber-50 text-amber-700 border-amber-200" />
          <StatusPill label={`متوسط سود هر خودروی فروخته‌شده: ${moneyShort(totalProfitRealized / Math.max(1, vehicles.filter(v => v.salePrice).length))}`} tone="bg-emerald-50 text-emerald-700 border-emerald-200" />
          <StatusPill label={`سفارش کار باز: ${faNumber(workOrders.filter(w => w.status !== 'delivered').length)}`} tone="bg-red-50 text-red-700 border-red-200" />
          <StatusPill label={`قرارداد اقساط فعال: ${faNumber(installments.filter(i => i.status === 'active').length)}`} tone="bg-teal-50 text-teal-700 border-teal-200" />
          <StatusPill label={`خودروی در اجاره: ${faNumber(vehicles.filter(v => v.status === 'rented').length)}`} tone="bg-orange-50 text-orange-700 border-orange-200" />
          <StatusPill label={`اقساط معوق: ${faNumber(installments.filter(i => i.status === 'active').flatMap(i => i.schedule).filter(s => s.status === 'late').length)}`} tone="bg-red-50 text-red-700 border-red-200" />
        </div>
      </SectionCard>
    </div>
  );
}
