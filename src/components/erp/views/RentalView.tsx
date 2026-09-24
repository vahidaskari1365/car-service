'use client';

// ─── اجاره خودرو ───
import { useMemo, useState } from 'react';
import { Plus, KeyRound, CalendarClock, AlertOctagon, Coins, ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow } from '../shared';
import { useEntity } from '../use-erp';
import JalaliDatePicker from '../jalali-date-picker';
import { PrintDocDialog, RentalContractDoc } from '../print/print-docs';
import type { Rental, Vehicle, Customer } from '@/lib/erp-types';
import { money, moneyShort, faNumber, jdate, rentalStatusLabels, fuelLabels, uid } from '@/lib/erp-utils';

const rentalTone: Record<string, string> = {
  reserved: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-teal-50 text-teal-700 border-teal-200',
  returned: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-zinc-50 text-zinc-400 border-zinc-200',
};

export default function RentalView() {
  const { items: rentals, loading, create, update } = useEntity<Rental>('rentals');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: customers } = useEntity<Customer>('customers');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [printId, setPrintId] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', customerId: '', startDate: '', endDate: '', dailyRate: '', deposit: '' });
  const printRental = rentals.find(r => r.id === printId) || null;

  const fleet = vehicles.filter(v => v.category === 'rental_fleet');
  const cName = (id: string) => { const c = customers.find(x => x.id === id); return c ? `${c.firstName} ${c.lastName}` : '—'; };
  const vName = (id: string) => { const v = vehicles.find(x => x.id === id); return v ? `${v.brand} ${v.model}` : '—'; };

  const stats = useMemo(() => ({
    fleetSize: fleet.length,
    active: rentals.filter(r => r.status === 'active').length,
    overdue: rentals.filter(r => r.status === 'overdue').length,
    income: rentals.reduce((a, r) => a + r.paidAmount, 0),
  }), [rentals, fleet]);

  async function handleAdd() {
    if (!form.vehicleId || !form.customerId || !form.startDate || !form.endDate || !form.dailyRate) {
      toast({ title: 'تکمیل فیلدهای الزامی ضروری است', variant: 'destructive' });
      return;
    }
    const v = vehicles.find(x => x.id === form.vehicleId);
    await create({
      code: `RN-${3000 + rentals.length + 1}`,
      vehicleId: form.vehicleId, customerId: form.customerId,
      status: 'reserved', startDate: form.startDate, endDate: form.endDate,
      dailyRate: Number(form.dailyRate), deposit: Number(form.deposit || 0),
      mileageOut: v?.mileage || 0, fuelOut: 'full', damages: [], fines: [], paidAmount: 0,
    } as Partial<Rental>);
    await fetch('/api/vehicles', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: form.vehicleId, status: 'reserved' }),
    });
    setForm({ vehicleId: '', customerId: '', startDate: '', endDate: '', dailyRate: '', deposit: '' });
    setOpen(false);
    toast({ title: 'رزرو اجاره ثبت شد' });
  }

  async function handOver(r: Rental) {
    await update({ id: r.id, status: 'active' });
    await fetch('/api/vehicles', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.vehicleId, status: 'rented', location: 'تحویل به مشتری اجاره' }),
    });
    toast({ title: 'خودرو تحویل داده شد', description: `${r.code} — ثبت کیلومتر و سوخت انجام شد` });
  }

  async function returnCar(r: Rental) {
    const mileageIn = window.prompt('کیلومتر هنگام عودت:', String((r.mileageOut || 0) + 200));
    if (mileageIn === null) return;
    const damage = window.prompt('خسارت (مبلغ تومان — در صورت نداشتن خالی بگذارید):', '0') || '0';
    const totalDays = Math.max(1, Math.ceil((Date.now() - new Date(r.startDate).getTime()) / 86400000));
    const amount = totalDays * r.dailyRate + Number(damage);
    const paid = window.prompt(`مبلغ دریافتی نهایی (تعداد روز: ${totalDays} — مجموع با خسارت: ${amount}):`, String(amount));
    if (paid === null) return;
    const damages = Number(damage) > 0 ? [{ id: uid('dm'), title: 'خسارت هنگام عودت', amount: Number(damage) }] : r.damages;
    await update({
      id: r.id, status: 'returned', actualReturnDate: new Date().toISOString(),
      mileageIn: Number(mileageIn), fuelIn: 'full', damages, paidAmount: Number(paid),
    });
    await fetch('/api/vehicles', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.vehicleId, status: 'in_stock', location: 'پارکینگ ناوگان اجاره', mileage: Number(mileageIn) }),
    });
    toast({ title: 'عودت ثبت شد', description: `${r.code} — دریافت: ${moneyShort(Number(paid))}` });
  }

  async function markOverdue(r: Rental) {
    await update({ id: r.id, status: 'overdue' });
    toast({ title: 'قرارداد به وضعیت تأخیر منتقل شد', variant: 'destructive' });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="اجاره خودرو"
        description="مدیریت ناوگان، رزرو، قرارداد، تحویل و عودت، خسارت، جریمه و پرداخت‌ها"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> رزرو اجاره جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="ناوگان" value={faNumber(stats.fleetSize)} sub="خودرو" icon={KeyRound} tone="teal" />
        <KpiCard title="در اجاره فعال" value={faNumber(stats.active)} icon={CalendarClock} tone="amber" />
        <KpiCard title="تأخیر در عودت" value={faNumber(stats.overdue)} icon={AlertOctagon} tone="red" />
        <KpiCard title="درآمد اجاره" value={moneyShort(stats.income)} icon={Coins} tone="emerald" />
      </div>

      {/* وضعیت ناوگان */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {fleet.map(v => {
          const activeRental = rentals.find(r => r.vehicleId === v.id && ['active', 'overdue'].includes(r.status));
          return (
            <div key={v.id} className={`rounded-xl border p-3.5 shadow-sm ${activeRental?.status === 'overdue' ? 'border-red-300 bg-red-50/50' : activeRental ? 'border-teal-200 bg-teal-50/40' : 'bg-card'}`}>
              <div className="text-sm font-bold">{v.model}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{v.plate}</div>
              <div className="mt-2">
                <StatusPill
                  label={activeRental ? (activeRental.status === 'overdue' ? 'تأخیر در عودت' : 'در اجاره') : 'آماده اجاره'}
                  tone={activeRental ? (activeRental.status === 'overdue' ? rentalTone.overdue : rentalTone.active) : rentalTone.returned}
                />
              </div>
              {activeRental && <div className="text-[11px] text-muted-foreground mt-2">عودت: {jdate(activeRental.endDate)}</div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>کد</TableHead>
              <TableHead>خودرو</TableHead>
              <TableHead className="hidden md:table-cell">مشتری</TableHead>
              <TableHead>بازه</TableHead>
              <TableHead>نرخ روزانه</TableHead>
              <TableHead className="hidden sm:table-cell">پرداخت</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
              <TableHead className="w-10" aria-label="چاپ" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={9}><LoadingTable /></TableCell></TableRow>}
            {!loading && rentals.length === 0 && <EmptyRow colSpan={9} text="قرارداد اجاره‌ای ثبت نشده" />}
            {!loading && rentals.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs" dir="ltr">{r.code}</TableCell>
                <TableCell className="text-sm font-medium">{vName(r.vehicleId)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{cName(r.customerId)}</TableCell>
                <TableCell className="text-xs">{jdate(r.startDate)} تا {jdate(r.endDate)}</TableCell>
                <TableCell className="text-xs">{moneyShort(r.dailyRate)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{moneyShort(r.paidAmount)}</TableCell>
                <TableCell><StatusPill label={rentalStatusLabels[r.status]} tone={rentalTone[r.status]} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {r.status === 'reserved' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handOver(r)}>تحویل</Button>}
                    {['active', 'overdue'].includes(r.status) && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => returnCar(r)}>عودت</Button>}
                    {r.status === 'active' && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => markOverdue(r)}>ثبت تأخیر</Button>}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-700" title="چاپ قرارداد اجاره" onClick={() => setPrintId(r.id)}>
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog open={open} onOpenChange={setOpen} title="رزرو اجاره خودرو" description="ثبت رزرو و ایجاد قرارداد اجاره" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>خودروی ناوگان *</Label>
            <Select value={form.vehicleId} onValueChange={v => setForm({ ...form, vehicleId: v })}>
              <SelectTrigger><SelectValue placeholder="انتخاب خودرو" /></SelectTrigger>
              <SelectContent>
                {fleet.map(v => <SelectItem key={v.id} value={v.id}>{v.model} — {v.plate}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>مشتری *</Label>
            <Select value={form.customerId} onValueChange={v => setForm({ ...form, customerId: v })}>
              <SelectTrigger><SelectValue placeholder="انتخاب مشتری" /></SelectTrigger>
              <SelectContent>
                {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>تاریخ شروع *</Label>
            <JalaliDatePicker value={form.startDate} onChange={iso => setForm({ ...form, startDate: iso })} placeholder="انتخاب تاریخ شروع" />
          </div>
          <div className="space-y-1.5">
            <Label>تاریخ پایان *</Label>
            <JalaliDatePicker value={form.endDate} onChange={iso => setForm({ ...form, endDate: iso })} placeholder="انتخاب تاریخ پایان" />
          </div>
          <div className="space-y-1.5"><Label>نرخ روزانه (تومان) *</Label><Input dir="ltr" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} placeholder="4500000" /></div>
          <div className="space-y-1.5"><Label>ودیعه (تومان)</Label><Input dir="ltr" value={form.deposit} onChange={e => setForm({ ...form, deposit: e.target.value })} placeholder="100000000" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd} className="gap-1">ثبت رزرو <ArrowLeft className="h-3.5 w-3.5" /></Button>
        </div>
      </FormDialog>

      {/* چاپ قرارداد اجاره */}
      <PrintDocDialog open={!!printRental} onOpenChange={v => !v && setPrintId(null)} title={`قرارداد اجاره ${printRental?.code || ''}`}>
        {printRental && (
          <RentalContractDoc
            rental={printRental}
            vehicle={vehicles.find(v => v.id === printRental.vehicleId)}
            customer={customers.find(c => c.id === printRental.customerId)}
          />
        )}
      </PrintDocDialog>
    </div>
  );
}
