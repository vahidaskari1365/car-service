'use client';

// ─── داشبورد مدیریتی — KPI کلیک‌پذیر + نمودارهای تعاملی ───
import { useMemo } from 'react';
import {
  Car, CarFront, Wrench, KeyRound, TrendingUp, TrendingDown, Wallet,
  Package, AlertTriangle, BellRing, CircleDollarSign, Sparkles, CalendarDays,
  MousePointerClick, History, PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { KpiCard, SectionCard, LoadingTable, StatusPill } from '../shared';
import { useDashboard } from '../use-erp';
import { useAppUser } from '@/lib/user-context';
import { moneyShort, money, faNumber, jdatetime } from '@/lib/erp-utils';

const PIE_COLORS = ['#d97706', '#059669', '#f59e0b', '#3b6fa0', '#e11d48', '#7c3aed'];
const PIE_HOVER = ['#f59e0b', '#10b981', '#fbbf24', '#5588bb', '#fb7185', '#a78bfa'];

/** نگاشت واحد درآمد به ماژول مقصد برای کلیک روی نمودار */
const DIVISION_VIEW: Record<string, string> = {
  'نمایشگاه': 'showroom',
  'تعمیرگاه': 'workshop',
  'اجاره': 'rental',
  'اقساط': 'installments',
  'اداری': 'finance',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'شب بخیر';
  if (h < 12) return 'صبح بخیر';
  if (h < 15) return 'ظهر بخیر';
  if (h < 19) return 'عصر بخیر';
  return 'شب بخیر';
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg" dir="rtl">
      {label && <div className="font-bold mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold ltr-num">{moneyShort(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardView({ onNavigate }: { onNavigate?: (v: string, focus?: { topic: string; label: string }) => void }) {
  const { data, loading } = useDashboard();
  const { current } = useAppUser();

  const totalRevenue = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.divisionRevenue).reduce((a, b) => a + b, 0);
  }, [data]);

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

  // KPI کلیک‌پذیر: کلیک = باز شدن همان موضوع در ماژول مربوط
  const kpis = [
    { title: 'خودروهای موجود', value: faNumber(vc.in_stock), sub: `مجموع ناوگان: ${faNumber(vc.total)}`, icon: Car, tone: 'amber' as const, nav: 'vehicles', topic: 'status:in_stock' },
    { title: 'فروش این دوره', value: faNumber(vc.sold), sub: 'از ابتدای دوره', icon: CarFront, tone: 'emerald' as const, nav: 'showroom', topic: 'sold' },
    { title: 'در تعمیرگاه', value: faNumber(vc.in_repair), sub: `${faNumber(data.workshop.openWorkOrders)} سفارش کار باز`, icon: Wrench, tone: 'red' as const, nav: 'workshop', topic: 'open' },
    { title: 'در اجاره', value: faNumber(vc.rented), sub: 'خودروی فعال ناوگان', icon: KeyRound, tone: 'teal' as const, nav: 'rental', topic: 'active' },
    { title: 'درآمد ثبت‌شده', value: moneyShort(fin.income), sub: 'همه واحدها', icon: CircleDollarSign, tone: 'emerald' as const, nav: 'finance', topic: 'income' },
    { title: 'هزینه ثبت‌شده', value: moneyShort(fin.expense), sub: 'خرید، حقوق، اداری', icon: TrendingDown, tone: 'red' as const, nav: 'finance', topic: 'expense' },
    { title: 'سود عملیاتی', value: moneyShort(fin.profit), sub: 'درآمد منهای هزینه', icon: TrendingUp, tone: 'amber' as const, nav: 'finance', topic: 'all' },
    { title: 'مطالبات', value: moneyShort(fin.receivables), sub: `بدهی تأمین‌کنندگان: ${moneyShort(fin.payables)}`, icon: Wallet, tone: 'violet' as const, nav: 'finance', topic: 'receivables' },
  ];

  return (
    <div className="view-enter space-y-5">
      {/* نوار خوش‌آمد — تحویل زمان‌دار */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-amber-500/90 via-amber-600/85 to-orange-600/90 p-5 text-white shadow-lg shadow-amber-500/20">
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-14 left-1/3 h-36 w-36 rounded-full bg-orange-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-amber-100/90">
              <CalendarDays className="h-3.5 w-3.5" />
              {jdatetime(new Date().toISOString())}
            </div>
            <h2 className="text-lg font-extrabold mt-1">{greeting()}، {current?.fullName || 'کاربر عزیز'}</h2>
            <p className="text-xs text-amber-100/85 mt-0.5">
              {faNumber(vc.total)} خودرو در ناوگان · {faNumber(data.workshop.openWorkOrders)} سفارش کار باز · {faNumber(data.alerts.length)} هشدار فعال
            </p>
          </div>
          {onNavigate && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('tracking')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-3.5 py-2.5 text-xs font-bold backdrop-blur hover:bg-white/20 transition-all hover:scale-[1.03]"
              >
                <History className="h-4 w-4" />
                تراکینگ رویدادها
              </button>
              <button
                onClick={() => onNavigate('ai')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-xs font-bold backdrop-blur hover:bg-white/25 transition-all hover:scale-[1.03]"
              >
                <Sparkles className="h-4 w-4" />
                تحلیل لحظه‌ای با هوش مصنوعی
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ردیف KPI — همه کلیک‌پذیر */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <KpiCard
            key={k.title}
            title={k.title}
            value={k.value}
            sub={k.sub}
            icon={k.icon}
            tone={k.tone}
            onClick={onNavigate ? () => onNavigate(k.nav, { topic: k.topic, label: k.title }) : undefined}
          />
        ))}
      </div>
      {onNavigate && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground -mt-2">
          <MousePointerClick className="h-3.5 w-3.5 text-amber-500" />
          روی هر کارت کلیک کنید تا همان موضوع با جزئیات کامل در ماژول مربوط باز شود
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* روند مالی — نمودار گرادیانی کلیک‌پذیر */}
        <SectionCard
          title="روند درآمد و هزینه (۶ ماه اخیر)"
          description="بر اساس تراکنش‌های ثبت‌شده"
          action={<span className="flex items-center gap-1 text-[10px] text-muted-foreground"><MousePointerClick className="h-3 w-3 text-amber-500" /> کلیک = جزئیات</span>}
          className="lg:col-span-2"
        >
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} onClick={(s) => {
                const month = (s?.activePayload?.[0]?.payload as { month?: string } | undefined)?.month;
                if (month && onNavigate) onNavigate('finance', { topic: 'all', label: `روند مالی — ${month}` });
              }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.45} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Vazirmatn', fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickFormatter={(v: number) => `${Math.round(v / 1e6)}`} width={44} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--chart-cursor)' }} />
                <Legend formatter={(v: string) => <span style={{ fontFamily: 'Vazirmatn', fontSize: 12 }}>{v === 'income' ? 'درآمد' : 'هزینه'}</span>} />
                <Bar dataKey="income" name="درآمد" fill="url(#gIncome)" radius={[6, 6, 0, 0]} maxBarSize={32} className="cursor-pointer" />
                <Bar dataKey="expense" name="هزینه" fill="url(#gExpense)" radius={[6, 6, 0, 0]} maxBarSize={32} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* سهم واحدها — دونات با مرکز کلیک‌پذیر */}
        <SectionCard
          title="سهم درآمد واحدها"
          description="کلیک روی هر بخش = باز شدن همان واحد"
          action={<PieChartIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        >
          <div className="h-64 relative" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={divisionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={85}
                  paddingAngle={3}
                  cornerRadius={5}
                  onClick={(_, i) => {
                    const name = divisionData[i]?.name;
                    if (name && onNavigate) onNavigate(DIVISION_VIEW[name] || 'finance', { topic: 'income', label: `درآمد واحد ${name}` });
                  }}
                >
                  {divisionData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="var(--card)" strokeWidth={2} className="cursor-pointer transition-all hover:opacity-80" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
                <Legend formatter={(v: string) => <span style={{ fontFamily: 'Vazirmatn', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            {/* مرکز دونات */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
              <div className="text-[10px] text-muted-foreground">مجموع درآمد</div>
              <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400 ltr-num">{moneyShort(totalRevenue)}</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* وضعیت ناوگان — ردیف‌ها کلیک‌پذیر */}
        <SectionCard title="وضعیت ناوگان خودرو" description="کلیک روی هر وضعیت = مشاهده خودروها">
          <div className="space-y-3">
            {statusRows.map(r => {
              const pct = Math.round((r.value / vc.total) * 100);
              return (
                <button
                  key={r.key}
                  onClick={() => onNavigate?.('vehicles', { topic: `status:${r.key}`, label: `خودروهای ${r.name}` })}
                  className="block w-full text-right rounded-lg p-1 -m-1 hover:bg-accent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground ltr-num">{faNumber(r.value)} خودرو ({faNumber(pct)}٪)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: {
                          in_stock: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                          preparing: 'linear-gradient(90deg,#f97316,#fb923c)',
                          reserved: 'linear-gradient(90deg,#8b5cf6,#a78bfa)',
                          sold: 'linear-gradient(90deg,#059669,#34d399)',
                          rented: 'linear-gradient(90deg,#0d9488,#2dd4bf)',
                          in_repair: 'linear-gradient(90deg,#e11d48,#fb7185)',
                        }[r.key] || '#f59e0b',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* هشدارها — هر هشدار پرش به ماژول */}
        <SectionCard
          title="هشدارها و اقدامات فوری"
          description={`${faNumber(data.alerts.length)} هشدار فعال — کلیک برای رسیدگی`}
          action={<BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          className="lg:col-span-2"
        >
          <div className="max-h-72 space-y-2 overflow-y-auto pl-1">
            {[...highAlerts, ...otherAlerts].length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">هیچ هشدار فعالی وجود ندارد ✓</div>
            )}
            {[...highAlerts, ...otherAlerts].slice(0, 12).map(a => (
              <button
                key={a.type + a.id}
                onClick={() => onNavigate?.(a.view || 'dashboard')}
                className={`w-full text-right rounded-lg border p-3 flex items-start gap-3 transition-all hover:shadow-md hover:scale-[1.005] cursor-pointer ${
                  a.severity === 'high'
                    ? 'border-red-200 bg-red-50/60 hover:border-red-300 dark:border-red-500/30 dark:bg-red-500/10'
                    : a.severity === 'medium'
                      ? 'border-amber-200 bg-amber-50/60 hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10'
                      : 'border-zinc-200 bg-zinc-50 dark:border-zinc-500/30 dark:bg-zinc-500/10'
                }`}
              >
                <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${a.severity === 'high' ? 'text-red-600 dark:text-red-400' : a.severity === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    {a.title}
                    {a.dueHint && (
                      <StatusPill
                        label={a.dueHint}
                        tone={a.severity === 'high'
                          ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30'
                          : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'}
                      />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                </div>
              </button>
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
                    <td className={`py-2 font-bold ltr-num ${p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{money(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* آخرین فعالیت‌ها — پرش به تراکینگ */}
        <SectionCard
          title="آخرین فعالیت‌های سامانه"
          description="تراکینگ کامل عملیات کاربران"
          action={
            <button onClick={() => onNavigate?.('tracking')} className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
              <History className="h-3.5 w-3.5" /> مشاهده همه
            </button>
          }
        >
          <div className="max-h-64 space-y-2.5 overflow-y-auto pl-1">
            {data.activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-xs">
                <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0 shadow-[0_0_6px] shadow-amber-400/60" />
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
          action={<Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        >
          <div className="flex flex-wrap gap-2">
            {data.lowStock.map(p => (
              <StatusPill key={p.id} label={`${p.name} — ${faNumber(p.quantity)} از ${faNumber(p.minQuantity)}`} tone="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
