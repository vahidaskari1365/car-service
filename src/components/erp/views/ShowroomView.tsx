'use client';

// ─── نمایشگاه — خرید و فروش خودرو ───
import { useMemo, useState } from 'react';
import { Plus, Search, Handshake, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow, DetailDrawer } from '../shared';
import { useEntity } from '../use-erp';
import type { Deal, Vehicle, Customer, Employee } from '@/lib/erp-types';
import { moneyShort, money, faNumber, jdate, dealStatusLabels, dealTypeLabels, uid } from '@/lib/erp-utils';

const dealTone: Record<string, string> = {
  draft: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  negotiating: 'bg-amber-50 text-amber-700 border-amber-200',
  contracted: 'bg-teal-50 text-teal-700 border-teal-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

export default function ShowroomView() {
  const { items: deals, loading, create, update } = useEntity<Deal>('deals');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: customers } = useEntity<Customer>('customers');
  const { items: employees } = useEntity<Employee>('employees');
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', customerId: '', type: 'sale', price: '', commission: '', agentId: 'e2', notes: '' });

  const vName = (id: string) => { const v = vehicles.find(x => x.id === id); return v ? `${v.brand} ${v.model}` : '—'; };
  const cName = (id: string) => { const c = customers.find(x => x.id === id); return c ? `${c.firstName} ${c.lastName}` : '—'; };
  const aName = (id: string) => employees.find(x => x.id === id)?.name || '—';

  const filtered = deals.filter(d =>
    `${d.code} ${vName(d.vehicleId)} ${cName(d.customerId)}`.includes(q)
  );

  const stats = useMemo(() => {
    const sales = deals.filter(d => d.type === 'sale' && d.status !== 'cancelled');
    const soldValue = sales.filter(d => d.status === 'delivered').reduce((a, d) => a + d.price, 0);
    const commissions = sales.filter(d => d.status === 'delivered').reduce((a, d) => a + d.commission, 0);
    const open = deals.filter(d => ['negotiating', 'contracted'].includes(d.status)).length;
    return { soldValue, commissions, open, count: sales.length };
  }, [deals]);

  async function handleAdd() {
    if (!form.vehicleId || !form.customerId || !form.price) {
      toast({ title: 'خودرو، مشتری و قیمت الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      code: `${form.type === 'sale' ? 'SL' : 'BY'}-${1000 + deals.length + 1}`,
      vehicleId: form.vehicleId, customerId: form.customerId,
      type: form.type as Deal['type'], price: Number(form.price),
      commission: Number(form.commission || 0), agentId: form.agentId,
      status: 'draft', date: new Date().toISOString(), notes: form.notes || undefined,
    } as Partial<Deal>);
    setForm({ vehicleId: '', customerId: '', type: 'sale', price: '', commission: '', agentId: 'e2', notes: '' });
    setOpen(false);
    toast({ title: 'معامله جدید ثبت شد', description: 'برای پیشبرد فرآیند، وضعیت را تغییر دهید' });
  }

  async function advance(d: Deal) {
    const order: Deal['status'][] = ['draft', 'negotiating', 'contracted', 'delivered'];
    const idx = order.indexOf(d.status);
    if (idx === -1 || idx === order.length - 1) return;
    const next = order[idx + 1];
    const patch: Partial<Deal> = { status: next };
    if (next === 'delivered') {
      patch.deliveryDate = new Date().toISOString();
      // وضعیت خودرو هم به‌روز شود
      const v = vehicles.find(x => x.id === d.vehicleId);
      if (v && d.type === 'sale') {
        await fetch('/api/vehicles', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: v.id, status: 'sold', salePrice: d.price, saleDate: new Date().toISOString(), location: 'تحویل مشتری', customerName: cName(d.customerId) }),
        });
      }
    }
    await update({ id: d.id, ...patch });
    toast({ title: 'وضعیت معامله پیشرفت کرد', description: `${d.code} → ${dealStatusLabels[next]}` });
  }

  const detail = deals.find(d => d.id === detailId) || null;

  return (
    <div className="view-enter">
      <PageHeader
        title="نمایشگاه — خرید و فروش"
        description="مدیریت معاملات، رزرو، قرارداد، کمیسیون و تحویل خودرو"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> معامله جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="ارزش فروش محقق‌شده" value={moneyShort(stats.soldValue)} icon={Handshake} tone="emerald" />
        <KpiCard title="کمیسیون دریافت‌شده" value={moneyShort(stats.commissions)} icon={ReceiptText} tone="amber" />
        <KpiCard title="معاملات در جریان" value={faNumber(stats.open)} sub="مذاکره یا قرارداد" icon={Handshake} tone="orange" />
        <KpiCard title="مجموع معاملات فروش" value={faNumber(stats.count)} icon={Handshake} tone="zinc" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی کد یا نام..." className="ps-8" />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>کد</TableHead>
              <TableHead>نوع</TableHead>
              <TableHead>خودرو</TableHead>
              <TableHead className="hidden md:table-cell">مشتری</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead className="hidden sm:table-cell">کمیسیون</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8}><LoadingTable /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <EmptyRow colSpan={8} text="معامله‌ای یافت نشد" />}
            {!loading && filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs" dir="ltr">{d.code}</TableCell>
                <TableCell className="text-xs">{dealTypeLabels[d.type]}</TableCell>
                <TableCell className="text-sm font-medium">{vName(d.vehicleId)}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{cName(d.customerId)}</TableCell>
                <TableCell className="text-xs font-bold">{moneyShort(d.price)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{d.commission ? moneyShort(d.commission) : '—'}</TableCell>
                <TableCell><StatusPill label={dealStatusLabels[d.status]} tone={dealTone[d.status]} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetailId(d.id)}>جزئیات</Button>
                    {!['delivered', 'cancelled'].includes(d.status) && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => advance(d)}>مرحله بعد</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FormDialog open={open} onOpenChange={setOpen} title="ثبت معامله جدید" description="خرید از مشتری یا فروش به مشتری" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>نوع معامله</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">فروش به مشتری</SelectItem>
                <SelectItem value="purchase">خرید از مشتری</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>خودرو *</Label>
            <Select value={form.vehicleId} onValueChange={v => setForm({ ...form, vehicleId: v })}>
              <SelectTrigger><SelectValue placeholder="انتخاب خودرو" /></SelectTrigger>
              <SelectContent>
                {vehicles.filter(v => v.status !== 'sold').map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — سال {faNumber(v.year)}</SelectItem>
                ))}
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
            <Label>کارشناس فروش</Label>
            <Select value={form.agentId} onValueChange={v => setForm({ ...form, agentId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.division === 'نمایشگاه').map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>مبلغ معامله (تومان) *</Label><Input dir="ltr" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>کمیسیون (تومان)</Label><Input dir="ltr" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>یادداشت</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت معامله</Button>
        </div>
      </FormDialog>

      <DetailDrawer open={!!detail} onOpenChange={v => !v && setDetailId(null)} title={detail ? `معامله ${detail.code}` : ''} description={detail ? dealTypeLabels[detail.type] : ''}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">خودرو</div><div className="font-bold mt-1">{vName(detail.vehicleId)}</div></div>
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">مشتری</div><div className="font-bold mt-1">{cName(detail.customerId)}</div></div>
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">مبلغ</div><div className="font-bold mt-1">{money(detail.price)}</div></div>
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">کمیسیون</div><div className="font-bold mt-1">{money(detail.commission)}</div></div>
            </div>
            <div className="text-xs text-muted-foreground">
              تاریخ: {jdate(detail.date)} · کارشناس: {aName(detail.agentId)} · تحویل: {jdate(detail.deliveryDate)}
            </div>
            {detail.notes && <div className="rounded-lg border p-3 text-xs">{detail.notes}</div>}
            {/* رهگیری مراحل */}
            <div>
              <h4 className="text-sm font-bold mb-2">مراحل معامله</h4>
              <div className="flex items-center gap-1 flex-wrap">
                {(['draft', 'negotiating', 'contracted', 'delivered'] as const).map((st, i) => {
                  const cur = ['draft', 'negotiating', 'contracted', 'delivered'].indexOf(detail.status);
                  return (
                    <div key={st} className="flex items-center gap-1">
                      <StatusPill label={dealStatusLabels[st]} tone={i <= cur && detail.status !== 'cancelled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'} />
                      {i < 3 && <span className="text-zinc-300">←</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
