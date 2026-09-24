'use client';

// ─── فروش اقساطی، لیزینگ و فاینانس ───
import { useMemo, useState } from 'react';
import { Plus, CreditCard, Calculator, AlertTriangle, Landmark, Receipt, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow, DetailDrawer } from '../shared';
import { useEntity } from '../use-erp';
import { PrintDocDialog, InstallmentContractDoc } from '../print/print-docs';
import type { InstallmentContract, Vehicle, Customer, Transaction } from '@/lib/erp-types';
import { money, moneyShort, faNumber, jdate, insStatusLabels, percent } from '@/lib/erp-utils';

const insTone: Record<string, string> = {
  applied: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  credit_check: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-teal-50 text-teal-700 border-teal-200',
  contracted: 'bg-teal-50 text-teal-700 border-teal-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  defaulted: 'bg-red-50 text-red-700 border-red-300',
};

export default function InstallmentsView() {
  const { items: contracts, loading, create, update } = useEntity<InstallmentContract>('installments');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: customers } = useEntity<Customer>('customers');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [form, setForm] = useState({ customerId: '', vehicleId: '', vehiclePrice: '', downPayment: '', months: '18', interestRate: '23', guarantor: '', creditScore: '' });

  const cName = (id: string) => { const c = customers.find(x => x.id === id); return c ? `${c.firstName} ${c.lastName}` : '—'; };
  const vName = (id: string) => { const v = vehicles.find(x => x.id === id); return v ? `${v.brand} ${v.model}` : '—'; };
  const detail = contracts.find(i => i.id === detailId) || null;
  const printContract = contracts.find(i => i.id === printId) || null;

  const stats = useMemo(() => ({
    active: contracts.filter(c => c.status === 'active').length,
    portfolio: contracts.filter(c => c.status === 'active').reduce((a, c) => a + (c.vehiclePrice - c.downPayment), 0),
    collected: contracts.filter(c => c.status === 'active').flatMap(c => c.schedule).filter(s => s.status === 'paid').reduce((a, s) => a + s.amount, 0),
    overdue: contracts.filter(c => c.status === 'active').flatMap(c => c.schedule).filter(s => s.status === 'late').reduce((a, s) => a + s.amount, 0),
  }), [contracts]);

  const calcMonthly = () => {
    const price = Number(form.vehiclePrice || 0);
    const down = Number(form.downPayment || 0);
    const months = Number(form.months || 1);
    const annual = Number(form.interestRate || 0) / 100;
    const principal = price - down;
    const total = principal * (1 + (annual * months) / 12);
    return months > 0 ? Math.round(total / months / 100000) * 100000 : 0;
  };

  async function handleAdd() {
    if (!form.customerId || !form.vehicleId || !form.vehiclePrice || !form.downPayment) {
      toast({ title: 'فیلدهای الزامی را تکمیل کنید', variant: 'destructive' });
      return;
    }
    const monthly = calcMonthly();
    const months = Number(form.months);
    const schedule = Array.from({ length: months }, (_, i) => ({
      no: i + 1,
      dueDate: new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString(),
      amount: monthly,
      status: 'pending' as const,
    }));
    await create({
      code: `IN-${4000 + contracts.length + 1}`,
      customerId: form.customerId, vehicleId: form.vehicleId,
      vehiclePrice: Number(form.vehiclePrice), downPayment: Number(form.downPayment),
      months, monthlyPayment: monthly, interestRate: Number(form.interestRate),
      guarantor: form.guarantor || undefined,
      creditScore: form.creditScore ? Number(form.creditScore) : undefined,
      status: 'applied', startDate: new Date().toISOString(), schedule,
    } as Partial<InstallmentContract>);
    setForm({ customerId: '', vehicleId: '', vehiclePrice: '', downPayment: '', months: '18', interestRate: '23', guarantor: '', creditScore: '' });
    setOpen(false);
    toast({ title: 'درخواست اقساط ثبت شد', description: `قسط ماهانه: ${moneyShort(monthly)}` });
  }

  async function advance(c: InstallmentContract) {
    const order: InstallmentContract['status'][] = ['applied', 'credit_check', 'approved', 'contracted', 'active'];
    const idx = order.indexOf(c.status);
    if (idx === -1 || idx === order.length - 1) return;
    const next = order[idx + 1];
    await update({ id: c.id, status: next });
    toast({ title: 'وضعیت پرونده پیشرفت کرد', description: `${c.code} → ${insStatusLabels[next]}` });
  }

  async function payInstallment(c: InstallmentContract, no: number) {
    const row = c.schedule.find(s => s.no === no);
    if (!row) return;
    const schedule = c.schedule.map(s => s.no === no ? { ...s, status: 'paid' as const, paidDate: new Date().toISOString() } : s);
    await update({ id: c.id, schedule });
    // ثبت تراکنش مالی
    await fetch('/api/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'income', category: 'اقساط', amount: row.amount, date: new Date().toISOString(),
        division: 'اقساط', description: `قسط ${no} قرارداد ${c.code} — ${cName(c.customerId)}`, method: 'transfer',
      }),
    });
    toast({ title: 'پرداخت قسط ثبت شد', description: `${moneyShort(row.amount)} — در مالی هم ثبت شد` });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="فروش اقساطی، لیزینگ و فاینانس"
        description="اعتبارسنجی، محاسبه اقساط، قرارداد، سررسیدها، تأخیر و جرائم"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> درخواست اقساط جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="پرونده‌های فعال" value={faNumber(stats.active)} icon={CreditCard} tone="amber" />
        <KpiCard title="مجموع پورتفوی" value={moneyShort(stats.portfolio)} sub="اقساط باقی‌مانده" icon={Landmark} tone="zinc" />
        <KpiCard title="دریافتی اقساط" value={moneyShort(stats.collected)} icon={Receipt} tone="emerald" />
        <KpiCard title="اقساط معوق" value={moneyShort(stats.overdue)} icon={AlertTriangle} tone="red" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>کد</TableHead>
              <TableHead>مشتری</TableHead>
              <TableHead className="hidden md:table-cell">خودرو</TableHead>
              <TableHead>پیش‌پرداخت</TableHead>
              <TableHead className="hidden sm:table-cell">قسط ماهانه</TableHead>
              <TableHead className="hidden lg:table-cell">امتیاز اعتباری</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8}><LoadingTable /></TableCell></TableRow>}
            {!loading && contracts.length === 0 && <EmptyRow colSpan={8} text="پرونده‌ای ثبت نشده" />}
            {!loading && contracts.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs" dir="ltr">{c.code}</TableCell>
                <TableCell className="text-sm font-medium">{cName(c.customerId)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{vName(c.vehicleId)}</TableCell>
                <TableCell className="text-xs">{moneyShort(c.downPayment)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs font-bold">{c.months ? moneyShort(c.monthlyPayment) : '—'}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {c.creditScore !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${c.creditScore >= 75 ? 'bg-emerald-500' : c.creditScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.creditScore}%` }} />
                      </div>
                      <span className="text-xs">{faNumber(c.creditScore)}</span>
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell><StatusPill label={insStatusLabels[c.status]} tone={insTone[c.status]} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailId(c.id)}>اقساط</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-teal-700" onClick={() => setPrintId(c.id)} title="چاپ قرارداد فروش اقساطی">
                      <Printer className="h-3.5 w-3.5" /> قرارداد
                    </Button>
                    {['applied', 'credit_check', 'approved', 'contracted'].includes(c.status) && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => advance(c)}>مرحله بعد</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* درخواست جدید */}
      <FormDialog open={open} onOpenChange={setOpen} title="درخواست فروش اقساطی" description="اعتبارسنجی و محاسبه اقساط" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>مشتری *</Label>
            <Select value={form.customerId} onValueChange={v => setForm({ ...form, customerId: v })}>
              <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
              <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>خودرو *</Label>
            <Select value={form.vehicleId} onValueChange={v => {
              const veh = vehicles.find(x => x.id === v);
              setForm({ ...form, vehicleId: v, vehiclePrice: veh ? String(veh.purchasePrice + 30_000_000) : form.vehiclePrice });
            }}>
              <SelectTrigger><SelectValue placeholder="انتخاب خودرو" /></SelectTrigger>
              <SelectContent>{vehicles.filter(v => v.status !== 'sold').map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>قیمت خودرو (تومان) *</Label><Input dir="ltr" value={form.vehiclePrice} onChange={e => setForm({ ...form, vehiclePrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>پیش‌پرداخت (تومان) *</Label><Input dir="ltr" value={form.downPayment} onChange={e => setForm({ ...form, downPayment: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>تعداد اقساط</Label><Input dir="ltr" value={form.months} onChange={e => setForm({ ...form, months: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>سود سالانه (درصد)</Label><Input dir="ltr" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>ضامن</Label><Input value={form.guarantor} onChange={e => setForm({ ...form, guarantor: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>امتیاز اعتباری (۰ تا ۱۰۰)</Label><Input dir="ltr" value={form.creditScore} onChange={e => setForm({ ...form, creditScore: e.target.value })} /></div>
        </div>
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center justify-between">
          <span className="text-sm flex items-center gap-1.5"><Calculator className="h-4 w-4 text-amber-600" /> قسط ماهانه محاسبه‌شده:</span>
          <span className="font-bold">{money(calcMonthly())}</span>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت درخواست</Button>
        </div>
      </FormDialog>

      {/* جدول اقساط */}
      <DetailDrawer open={!!detail} onOpenChange={v => !v && setDetailId(null)} title={detail ? `اقساط قرارداد ${detail.code}` : ''} description={detail ? `${cName(detail.customerId)} — ${vName(detail.vehicleId)}` : ''}>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">مبلغ خودرو</div><div className="font-bold text-sm">{moneyShort(detail.vehiclePrice)}</div></div>
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">پیش‌پرداخت</div><div className="font-bold text-sm">{moneyShort(detail.downPayment)}</div></div>
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">تعداد اقساط</div><div className="font-bold text-sm">{faNumber(detail.months)}</div></div>
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">سود سالانه</div><div className="font-bold text-sm">{percent(detail.interestRate, 0)}</div></div>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-14">قسط</TableHead>
                    <TableHead>سررسید</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead className="text-center">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.schedule.length === 0 && <EmptyRow colSpan={5} text="جدول اقساط پس از عقد قرارداد صادر می‌شود" />}
                  {detail.schedule.map(s => (
                    <TableRow key={s.no}>
                      <TableCell className="font-bold text-xs">{faNumber(s.no)}</TableCell>
                      <TableCell className="text-xs">{jdate(s.dueDate)}</TableCell>
                      <TableCell className="text-xs font-medium">{money(s.amount)}</TableCell>
                      <TableCell>
                        <StatusPill
                          label={s.status === 'paid' ? `پرداخت‌شده (${jdate(s.paidDate)})` : s.status === 'late' ? 'معوق' : 'در انتظار'}
                          tone={s.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s.status === 'late' ? 'bg-red-50 text-red-700 border-red-200' : undefined}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {s.status !== 'paid' && detail.status === 'active' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => payInstallment(detail, s.no)}>ثبت پرداخت</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {detail.guarantor && <div className="text-xs text-muted-foreground">ضامن: {detail.guarantor}</div>}
            <div>
              <Button size="sm" variant="outline" className="gap-1 text-teal-700" onClick={() => setPrintId(detail.id)}>
                <Printer className="h-3.5 w-3.5" /> چاپ قرارداد فروش اقساطی
              </Button>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* چاپ قرارداد اقساط */}
      <PrintDocDialog open={!!printContract} onOpenChange={v => !v && setPrintId(null)} title={`قرارداد فروش اقساطی ${printContract?.code || ''}`}>
        {printContract && (
          <InstallmentContractDoc
            contract={printContract}
            vehicle={vehicles.find(v => v.id === printContract.vehicleId)}
            customer={customers.find(c => c.id === printContract.customerId)}
          />
        )}
      </PrintDocDialog>
    </div>
  );
}
