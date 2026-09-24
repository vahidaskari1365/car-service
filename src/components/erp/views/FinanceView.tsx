'use client';

// ─── امور مالی ───
import { useMemo, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow, SectionCard, FocusBanner, type NavFocus } from '../shared';
import { useEntity } from '../use-erp';
import type { Transaction, Vehicle, InstallmentContract, Customer } from '@/lib/erp-types';
import { money, moneyShort, faNumber, jdate, transactionMethodLabels, vehicleProfit, vehicleCostsTotal } from '@/lib/erp-utils';

const CATEGORIES_EXPENSE = ['خرید خودرو', 'خرید قطعات', 'حقوق و دستمزد', 'اجاره محل', 'تبلیغات', 'بیمه', 'آماده‌سازی خودرو', 'سایر'];
const CATEGORIES_INCOME = ['فروش خودرو', 'اجاره خودرو', 'تعمیرات', 'اقساط', 'بیعانه', 'سایر'];
const DIVISIONS = ['نمایشگاه', 'تعمیرگاه', 'اجاره', 'اقساط', 'اداری'];

export default function FinanceView({ focus, onClearFocus }: { focus?: NavFocus | null; onClearFocus?: () => void }) {
  const { items: transactions, loading, create } = useEntity<Transaction>('transactions');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: installments } = useEntity<InstallmentContract>('installments');
  const { items: customers } = useEntity<Customer>('customers');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // فوکوس موضوعی از داشبورد: درآمد / هزینه / سود / مطالبات
  const [filter, setFilter] = useState(() =>
    focus?.topic === 'income' || focus?.topic === 'receivables' ? 'income'
      : focus?.topic === 'expense' ? 'expense' : 'all'
  );
  const [form, setForm] = useState({ type: 'expense', category: CATEGORIES_EXPENSE[0], amount: '', division: 'اداری', description: '', method: 'transfer' });

  const stats = useMemo(() => ({
    income: transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0),
  }), [transactions]);

  const receivables = useMemo(() => {
    const inst = transactions.filter(t => t.category === 'اقساط');
    return { inst };
  }, [transactions]);

  const filtered = useMemo(() => transactions.filter(t => filter === 'all' || t.type === filter), [transactions, filter]);

  const vehiclePnL = vehicles.filter(v => v.salePrice).map(v => ({
    id: v.id, label: `${v.brand} ${v.model} (${faNumber(v.year)})`,
    purchase: v.purchasePrice, sale: v.salePrice!, costs: vehicleCostsTotal(v),
    profit: vehicleProfit(v) ?? 0,
  }));

  // مطالبات از اقساط فعال + بدهی تأمین‌کنندگان (برای فوکوس «مطالبات»)
  const receivableRows = useMemo(() => installments
    .filter(i => i.status === 'active')
    .map(i => {
      const remaining = i.schedule.filter(s => s.status !== 'paid').reduce((a, s) => a + s.amount, 0);
      const late = i.schedule.filter(s => s.status === 'late').reduce((a, s) => a + s.amount, 0);
      const paid = i.schedule.filter(s => s.status === 'paid').length;
      const c = customers.find(x => x.id === i.customerId);
      return { id: i.id, code: i.code, customer: c ? `${c.firstName} ${c.lastName}` : '—', remaining, late, paid, total: i.schedule.length };
    })
    .filter(r => r.remaining > 0), [installments, customers]);

  async function handleAdd() {
    if (!form.amount || !form.description) {
      toast({ title: 'مبلغ و شرح الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      type: form.type as Transaction['type'], category: form.category,
      amount: Number(form.amount), date: new Date().toISOString(),
      division: form.division, description: form.description,
      method: form.method as Transaction['method'],
    } as Partial<Transaction>);
    setForm({ ...form, amount: '', description: '' });
    setOpen(false);
    toast({ title: 'تراکنش ثبت شد' });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="امور مالی"
        description="دریافت و پرداخت، مطالبات، بدهی‌ها و سود و زیان هر خودرو"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> ثبت تراکنش</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="مجموع دریافت‌ها" value={moneyShort(stats.income)} icon={TrendingUp} tone="emerald" />
        <KpiCard title="مجموع پرداخت‌ها" value={moneyShort(stats.expense)} icon={TrendingDown} tone="red" />
        <KpiCard title="سود عملیاتی" value={moneyShort(stats.income - stats.expense)} icon={Wallet} tone="amber" />
        <KpiCard title="دریافتی اقساط" value={moneyShort(receivables.inst.reduce((a, t) => a + t.amount, 0))} icon={Landmark} tone="teal" />
      </div>

      {focus && (
        <FocusBanner
          label={focus.label}
          description={focus.topic === 'receivables' ? 'از داشبورد باز شده — بخش مطالبات اقساطی و وصولی‌ها را ببینید' : 'از داشبورد با موضوع انتخابی شما باز شده است'}
          onClear={() => { setFilter('all'); onClearFocus?.(); }}
        />
      )}

      {/* مطالبات اقساطی — موضوع کارت «مطالبات» داشبورد */}
      {(focus?.topic === 'receivables' || receivableRows.length > 0) && (
        <SectionCard
          title="مطالبات از فروش اقساطی"
          description={`مانده کل: ${moneyShort(receivableRows.reduce((a, r) => a + r.remaining, 0))} — ${faNumber(receivableRows.length)} قرارداد فعال`}
          className="mb-6"
        >
          <div className="max-h-64 overflow-y-auto">
            <table className="erp-table w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-right py-2">قرارداد</th>
                  <th className="text-right py-2">مشتری</th>
                  <th className="text-right py-2">پرداخت‌شده</th>
                  <th className="text-right py-2">مانده</th>
                  <th className="text-right py-2">معوق</th>
                </tr>
              </thead>
              <tbody>
                {receivableRows.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-mono" dir="ltr">{r.code}</td>
                    <td className="py-2 font-medium">{r.customer}</td>
                    <td className="py-2 text-muted-foreground">{faNumber(r.paid)} از {faNumber(r.total)} قسط</td>
                    <td className="py-2 font-bold text-violet-600 dark:text-violet-300">{moneyShort(r.remaining)}</td>
                    <td className={`py-2 font-bold ${r.late > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{r.late > 0 ? moneyShort(r.late) : '—'}</td>
                  </tr>
                ))}
                {receivableRows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">مطالبات اقساطی ثبت نشده</td></tr>}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <SectionCard title="سود و زیان هر خودرو" description="خرید + هزینه‌ها در مقابل فروش">
          <div className="max-h-72 overflow-y-auto">
            <table className="erp-table w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-right py-2">خودرو</th>
                  <th className="text-right py-2">خرید</th>
                  <th className="text-right py-2 hidden sm:table-cell">هزینه‌ها</th>
                  <th className="text-right py-2">فروش</th>
                  <th className="text-right py-2">سود</th>
                </tr>
              </thead>
              <tbody>
                {vehiclePnL.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">خودروی فروخته‌شده‌ای نیست</td></tr>}
                {vehiclePnL.map(v => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{v.label}</td>
                    <td className="py-2">{moneyShort(v.purchase)}</td>
                    <td className="py-2 hidden sm:table-cell">{moneyShort(v.costs)}</td>
                    <td className="py-2">{moneyShort(v.sale)}</td>
                    <td className={`py-2 font-bold ${v.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(v.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="تراکنش‌ها به تفکیک واحد" description="سهم هر واحد از جریان نقدی">
          <div className="space-y-3">
            {DIVISIONS.map(d => {
              const inc = transactions.filter(t => t.division === d && t.type === 'income').reduce((a, t) => a + t.amount, 0);
              const exp = transactions.filter(t => t.division === d && t.type === 'expense').reduce((a, t) => a + t.amount, 0);
              const max = Math.max(1, ...DIVISIONS.map(x =>
                Math.max(transactions.filter(t => t.division === x).reduce((a, t) => a + t.amount, 0), 1)));
              return (
                <div key={d}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{d}</span>
                    <span className="text-muted-foreground">
                      دریافت: {moneyShort(inc)} — پرداخت: {moneyShort(exp)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-amber-600" style={{ width: `${Math.round(((inc + exp) / max) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه تراکنش‌ها</SelectItem>
            <SelectItem value="income">فقط دریافت‌ها</SelectItem>
            <SelectItem value="expense">فقط پرداخت‌ها</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>تاریخ</TableHead>
              <TableHead>شرح</TableHead>
              <TableHead className="hidden md:table-cell">واحد</TableHead>
              <TableHead className="hidden sm:table-cell">دسته</TableHead>
              <TableHead className="hidden lg:table-cell">روش</TableHead>
              <TableHead>مبلغ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6}><LoadingTable /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <EmptyRow colSpan={6} text="تراکنشی ثبت نشده" />}
            {!loading && filtered.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs whitespace-nowrap">{jdate(t.date)}</TableCell>
                <TableCell className="text-sm">{t.description}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{t.division}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{t.category}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{transactionMethodLabels[t.method]}</TableCell>
                <TableCell className={`text-xs font-bold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '−'} {money(t.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog open={open} onOpenChange={setOpen} title="ثبت تراکنش مالی" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>نوع</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v, category: v === 'income' ? CATEGORIES_INCOME[0] : CATEGORIES_EXPENSE[0] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">دریافت (درآمد)</SelectItem>
                <SelectItem value="expense">پرداخت (هزینه)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>دسته</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(form.type === 'income' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>مبلغ (تومان) *</Label><Input dir="ltr" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>واحد</Label>
            <Select value={form.division} onValueChange={v => setForm({ ...form, division: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>روش پرداخت</Label>
            <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(transactionMethodLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>شرح *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت تراکنش</Button>
        </div>
      </FormDialog>
    </div>
  );
}
