'use client';

// ─── CRM — مدیریت مشتریان ───
import { useMemo, useState } from 'react';
import { Plus, Users, Phone, CalendarClock, Tag, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, DetailDrawer, LoadingTable, EmptyRow } from '../shared';
import { useEntity } from '../use-erp';
import type { Customer, Deal, Rental, WorkOrder, Vehicle, InstallmentContract } from '@/lib/erp-types';
import { moneyShort, faNumber, jdate, segmentLabels, uid, insStatusLabels } from '@/lib/erp-utils';

const segTone: Record<string, string> = {
  vip: 'bg-amber-50 text-amber-700 border-amber-200',
  loyal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  regular: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  new: 'bg-teal-50 text-teal-700 border-teal-200',
  prospect: 'bg-orange-50 text-orange-700 border-orange-200',
};

export default function CRMView() {
  const { items: customers, loading, create, update, refresh } = useEntity<Customer>('customers');
  const { items: deals } = useEntity<Deal>('deals');
  const { items: rentals } = useEntity<Rental>('rentals');
  const { items: workOrders } = useEntity<WorkOrder>('workOrders');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: installments } = useEntity<InstallmentContract>('installments');
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [segFilter, setSegFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', type: 'individual', segment: 'new', city: '', nationalId: '' });
  const [followUpForm, setFollowUpForm] = useState({ title: '', dueDate: '' });

  const cName = (id: string) => { const c = customers.find(x => x.id === id); return c ? `${c.firstName} ${c.lastName}` : '—'; };
  const detail = customers.find(c => c.id === detailId) || null;

  const filtered = useMemo(() => customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.phone}`.includes(q) && (segFilter === 'all' || c.segment === segFilter)
  ), [customers, q, segFilter]);

  const historyOf = (id: string) => ({
    deals: deals.filter(d => d.customerId === id),
    rentals: rentals.filter(r => r.customerId === id),
    workOrders: workOrders.filter(w => w.customerId === id),
    installments: installments.filter(i => i.customerId === id),
  });

  const stats = useMemo(() => ({
    total: customers.length,
    vip: customers.filter(c => c.segment === 'vip').length,
    followUps: customers.flatMap(c => c.followUps).filter(f => !f.done).length,
    dueNow: customers.flatMap(c => c.followUps).filter(f => !f.done && new Date(f.dueDate) <= new Date(Date.now() + 2 * 86400000)).length,
  }), [customers]);

  async function handleAdd() {
    if (!form.firstName || !form.phone) {
      toast({ title: 'نام و شماره تماس الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      firstName: form.firstName, lastName: form.lastName, phone: form.phone,
      type: form.type as Customer['type'], segment: form.segment as Customer['segment'],
      city: form.city || undefined, nationalId: form.nationalId || undefined,
      tags: [], followUps: [], createdAt: new Date().toISOString(),
    } as Partial<Customer>);
    setForm({ firstName: '', lastName: '', phone: '', type: 'individual', segment: 'new', city: '', nationalId: '' });
    setOpen(false);
    toast({ title: 'مشتری جدید ثبت شد' });
  }

  async function addFollowUp() {
    if (!detail || !followUpForm.title || !followUpForm.dueDate) return;
    await update({
      id: detail.id,
      followUps: [...detail.followUps, { id: uid('f'), title: followUpForm.title, dueDate: followUpForm.dueDate, done: false }],
    });
    setFollowUpForm({ title: '', dueDate: '' });
    toast({ title: 'یادآوری پیگیری ثبت شد' });
  }

  async function toggleFollowUp(fuId: string) {
    if (!detail) return;
    await update({ id: detail.id, followUps: detail.followUps.map(f => f.id === fuId ? { ...f, done: true } : f) });
    toast({ title: 'پیگیری انجام شد ✓' });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="مدیریت مشتریان (CRM)"
        description="پرونده کامل مشتری، تاریخچه تعاملات، پیگیری‌ها و دسته‌بندی"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> مشتری جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="کل مشتریان" value={faNumber(stats.total)} icon={Users} tone="amber" />
        <KpiCard title="مشتریان VIP" value={faNumber(stats.vip)} icon={Tag} tone="emerald" />
        <KpiCard title="پیگیری‌های باز" value={faNumber(stats.followUps)} icon={Phone} tone="teal" />
        <KpiCard title="پیگیری امروز/فردا" value={faNumber(stats.dueNow)} icon={CalendarClock} tone="red" />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام یا شماره..." className="max-w-xs" />
        <Select value={segFilter} onValueChange={setSegFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="همه سگمنت‌ها" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه سگمنت‌ها</SelectItem>
            {Object.entries(segmentLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>مشتری</TableHead>
              <TableHead>تماس</TableHead>
              <TableHead className="hidden md:table-cell">شهر</TableHead>
              <TableHead className="hidden lg:table-cell">تعاملات</TableHead>
              <TableHead>سگمنت</TableHead>
              <TableHead className="hidden sm:table-cell">پیگیری باز</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7}><LoadingTable /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <EmptyRow colSpan={7} text="مشتری‌ای یافت نشد" />}
            {!loading && filtered.map(c => {
              const h = historyOf(c.id);
              const openF = c.followUps.filter(f => !f.done).length;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{c.type === 'company' ? '' : ''}{c.firstName} {c.lastName}</div>
                    <div className="text-[11px] text-muted-foreground">{c.tags.join('، ') || '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs" dir="ltr">{c.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs">{c.city || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-[11px] text-muted-foreground">
                    {faNumber(h.deals.length)} معامله · {faNumber(h.rentals.length)} اجاره · {faNumber(h.workOrders.length)} تعمیر
                  </TableCell>
                  <TableCell><StatusPill label={segmentLabels[c.segment]} tone={segTone[c.segment]} /></TableCell>
                  <TableCell className="hidden sm:table-cell text-xs font-medium">{openF > 0 ? faNumber(openF) : '—'}</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailId(c.id)}>پرونده</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* مشتری جدید */}
      <FormDialog open={open} onOpenChange={setOpen} title="ثبت مشتری جدید" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>نام *</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>نام خانوادگی / شرکت</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>شماره تماس *</Label><Input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>کد ملی</Label><Input dir="ltr" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>نوع</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">شخص حقیقی</SelectItem>
                <SelectItem value="company">شرکت</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>سگمنت</Label>
            <Select value={form.segment} onValueChange={v => setForm({ ...form, segment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(segmentLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>شهر</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت مشتری</Button>
        </div>
      </FormDialog>

      {/* پرونده مشتری */}
      <DetailDrawer open={!!detail} onOpenChange={v => !v && setDetailId(null)} title={detail ? `پرونده ${detail.firstName} ${detail.lastName}` : ''} description={detail ? `${segmentLabels[detail.segment]} · عضویت از ${jdate(detail.createdAt)}` : ''}>
        {detail && (() => {
          const h = historyOf(detail.id);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">تماس:</span> <span dir="ltr">{detail.phone}</span></div>
                <div><span className="text-muted-foreground">کد ملی:</span> {detail.nationalId || '—'}</div>
                <div><span className="text-muted-foreground">شهر:</span> {detail.city || '—'}</div>
                <div><span className="text-muted-foreground">نوع:</span> {detail.type === 'company' ? 'شخص حقوقی' : 'شخص حقیقی'}</div>
              </div>

              {/* تاریخچه */}
              <div>
                <h4 className="text-sm font-bold mb-2">تاریخچه معاملات</h4>
                {h.deals.length === 0 && <div className="text-xs text-muted-foreground">معامله‌ای ندارد</div>}
                <div className="space-y-1.5">
                  {h.deals.map(d => {
                    const v = vehicles.find(x => x.id === d.vehicleId);
                    return (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                        <span>{d.type === 'sale' ? 'فروش' : 'خرید'} — {v ? `${v.brand} ${v.model}` : '—'}</span>
                        <span className="font-bold">{moneyShort(d.price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-bold mb-2">اجاره‌ها</h4>
                  {h.rentals.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
                  {h.rentals.map(r => (
                    <div key={r.id} className="rounded-lg border px-3 py-2 text-xs mb-1.5">
                      {r.code} — {jdate(r.startDate)} — {moneyShort(r.dailyRate)}/روز
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-bold mb-2">اقساط</h4>
                  {h.installments.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
                  {h.installments.map(i => (
                    <div key={i.id} className="rounded-lg border px-3 py-2 text-xs mb-1.5">
                      {i.code} — {insStatusLabels[i.status]}
                    </div>
                  ))}
                </div>
              </div>

              {/* پیگیری‌ها */}
              <div>
                <h4 className="text-sm font-bold mb-2">یادآوری و پیگیری‌ها</h4>
                <div className="space-y-1.5">
                  {detail.followUps.length === 0 && <div className="text-xs text-muted-foreground">پیگیری ثبت نشده</div>}
                  {detail.followUps.map(f => (
                    <div key={f.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${f.done ? 'opacity-60' : ''}`}>
                      <div>
                        <span className={`font-medium ${f.done ? 'line-through' : ''}`}>{f.title}</span>
                        <span className="text-muted-foreground block">موعد: {jdate(f.dueDate)}</span>
                      </div>
                      {!f.done && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-emerald-700" onClick={() => toggleFollowUp(f.id)}>
                          <CircleCheck className="h-3.5 w-3.5" /> انجام شد
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Input placeholder="عنوان پیگیری (تماس، یادآوری...)" value={followUpForm.title} onChange={e => setFollowUpForm({ ...followUpForm, title: e.target.value })} className="flex-1" />
                  <Input type="date" value={followUpForm.dueDate} onChange={e => setFollowUpForm({ ...followUpForm, dueDate: e.target.value })} className="w-40" />
                  <Button size="sm" onClick={addFollowUp}>ثبت</Button>
                </div>
              </div>
            </div>
          );
        })()}
      </DetailDrawer>
    </div>
  );
}
