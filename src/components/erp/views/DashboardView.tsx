'use client';

// ─── داشبورد مدیریتی ───
import {
  Car, CarFront, Wrench, KeyRound, TrendingUp, TrendingDown, Wallet,
  Package, AlertTriangle, BellRing, CircleDollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { KpiCard, SectionCard, LoadingTable, StatusPill } from '../shared';
import { useDashboard } from '../use-erp';
import { moneyShort, money, faNumber, jdatetime } from '@/lib/erp-utils';

const PIE_COLORS = ['#d97706', '#059669', '#f59e0b', '#3b6fa0', '#e11d48'];

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md" dir="rtl">
      {label && <div className="font-bold mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <span className="font-semibold">{moneyShort(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { data, loading } = useDashboard();

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <LoadingTable key={i} rows={1} />)}</div>
        <LoadingTable rows={4} />
      </div>
    );
  }

  const vc = data.vehicleCounts;
  const fin = data.finance;
  const divisionData = Object.entries(data.divisionRevenue).map(([name, value]) => ({ name, value }));
  const highAlerts = data.alerts.filter(a => a.severity === 'high');
  const otherAlerts = data.alerts.filter(a => a.severity !== 'high');

  const statusRows = [
    { name: 'در نمایشگاه', key: 'in_stock', value: vc.in_stock },
    { name: 'آماده‌سازی', key: 'preparing', value: vc.preparing },
    { name: 'رزرو', key: 'reserved', value: vc.reserved },
    { name: 'فروخته', key: 'sold', value: vc.sold },
    { name: 'اجاره', key: 'rented', value: vc.rented },
    { name: 'تعمیرگاه', key: 'in_repair', value: vc.in_repair },
  ].filter(r => r.value > 0);

  return (
    <div className="view-enter space-y-5">
      {/* ردیف KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="خودروهای موجود" value={faNumber(vc.in_stock)} sub={`مجموع ناوگان: ${faNumber(vc.total)}`} icon={Car} tone="amber" />
        <KpiCard title="فروش این دوره" value={faNumber(vc.sold)} sub="از ابتدای دوره" icon={CarFront} tone="emerald" />
        <KpiCard title="در تعمیرگاه" value={faNumber(vc.in_repair)} sub={`${faNumber(data.workshop.openWorkOrders)} سفارش کار باز`} icon={Wrench} tone="red" />
        <KpiCard title="در اجاره" value={faNumber(vc.rented)} sub="خودروی فعال ناوگان" icon={KeyRound} tone="teal" />
        <KpiCard title="درآمد ثبت‌شده" value={moneyShort(fin.income)} sub="همه واحدها" icon={CircleDollarSign} tone="emerald" />
        <KpiCard title="هزینه ثبت‌شده" value={moneyShort(fin.expense)} sub="خرید، حقوق، اداری" icon={TrendingDown} tone="red" />
        <KpiCard title="سود عملیاتی" value={moneyShort(fin.profit)} sub="درآمد منهای هزینه" icon={TrendingUp} tone="amber" />
        <KpiCard title="مطالبات" value={moneyShort(fin.receivables)} sub={`بدهی تأمین‌کنندگان: ${moneyShort(fin.payables)}`} icon={Wallet} tone="orange" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* روند مالی */}
        <SectionCard title="روند درآمد و هزینه (۶ ماه اخیر)" description="بر اساس تراکنش‌های ثبت‌شده" className="lg:col-span-2">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Vazirmatn' }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1e6)}`} width={44} />
                <Tooltip content={<ChartTip />} />
                <Legend formatter={(v: string) => <span style={{ fontFamily: 'Vazirmatn' }}>{v === 'income' ? 'درآمد' : 'هزینه'}</span>} />
                <Bar dataKey="income" name="درآمد" fill="#059669" radius={[5, 5, 0, 0]} maxBarSize={30} />
                <Bar dataKey="expense" name="هزینه" fill="#e11d48" radius={[5, 5, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* سهم واحدها */}
        <SectionCard title="سهم درآمد واحدها" description="توزیع درآمد به تفکیک واحد">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={divisionData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {divisionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend formatter={(v: string) => <span style={{ fontFamily: 'Vazirmatn', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* وضعیت ناوگان */}
        <SectionCard title="وضعیت ناوگان خودرو" description="توزیع خودروها بر اساس وضعیت">
          <div className="space-y-3">
            {statusRows.map(r => {
              const pct = Math.round((r.value / vc.total) * 100);
              return (
                <div key={r.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">{faNumber(r.value)} خودرو ({faNumber(pct)}٪)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* هشدارها */}
        <SectionCard
          title="هشدارها و اقدامات فوری"
          description={`${faNumber(data.alerts.length)} هشدار فعال`}
          action={<BellRing className="h-4 w-4 text-amber-600" />}
          className="lg:col-span-2"
        >
          <div className="max-h-72 space-y-2 overflow-y-auto pl-1">
            {[...highAlerts, ...otherAlerts].length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">هیچ هشدار فعالی وجود ندارد ✓</div>
            )}
            {[...highAlerts, ...otherAlerts].slice(0, 12).map(a => (
              <div key={a.type + a.id} className={`rounded-lg border p-3 flex items-start gap-3 ${a.severity === 'high' ? 'border-red-200 bg-red-50/60' : a.severity === 'medium' ? 'border-amber-200 bg-amber-50/60' : 'border-zinc-200 bg-zinc-50'}`}>
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-zinc-500'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-bold">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* سود هر خودرو */}
        <SectionCard title="سود واقعی هر خودرو (فروش‌شده)" description="فروش منهای خرید و هزینه‌ها">
          <div className="max-h-64 overflow-y-auto">
            <table className="erp-table w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-right py-2">خودرو</th>
                  <th className="text-right py-2">سود واقعی</th>
                </tr>
              </thead>
              <tbody>
                {data.vehiclePnL.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-muted-foreground">هنوز خودرویی فروخته نشده</td></tr>}
                {data.vehiclePnL.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{p.label}</td>
                    <td className={`py-2 font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* آخرین فعالیت‌ها */}
        <SectionCard title="آخرین فعالیت‌های سامانه" description="لاگ عملیات کاربران و فرآیندها">
          <div className="max-h-64 space-y-2.5 overflow-y-auto pl-1">
            {data.activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-xs">
                <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium">{a.action}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {a.by} · {a.module} · {jdatetime(a.at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* قطعات کم‌موجود */}
      {data.lowStock.length > 0 && (
        <SectionCard
          title="قطعات نیازمند سفارش مجدد"
          description="موجودی به حداقل رسیده یا کمتر"
          action={<Package className="h-4 w-4 text-amber-600" />}
        >
          <div className="flex flex-wrap gap-2">
            {data.lowStock.map(p => (
              <StatusPill key={p.id} label={`${p.name} — ${faNumber(p.quantity)} از ${faNumber(p.minQuantity)}`} tone="bg-amber-50 text-amber-700 border-amber-200" />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
