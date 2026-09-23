'use client';

// ─── خرید و تأمین ───
import { useState } from 'react';
import { Plus, ShoppingCart, CheckCheck, Truck, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow, DetailDrawer } from '../shared';
import { useEntity } from '../use-erp';
import type { PurchaseRequest, Part, Supplier, Quote } from '@/lib/erp-types';
import { money, moneyShort, faNumber, jdate, purchaseStatusLabels, uid } from '@/lib/erp-utils';

const prTone: Record<string, string> = {
  draft: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-teal-50 text-teal-700 border-teal-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  ordered: 'bg-orange-50 text-orange-700 border-orange-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

export default function PurchasingView() {
  const { items: requests, loading, create, update, refresh } = useEntity<PurchaseRequest>('purchaseRequests');
  const { items: parts } = useEntity<Part>('parts');
  const { items: suppliers } = useEntity<Supplier>('suppliers');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ itemPartId: '', itemName: '', qty: '1', estimatedPrice: '' });

  const sName = (id: string) => suppliers.find(s => s.id === id)?.name || '—';
  const detail = requests.find(r => r.id === detailId) || null;

  const stats = {
    open: requests.filter(r => !['paid', 'rejected'].includes(r.status)).length,
    pending: requests.filter(r => r.status === 'pending_approval').length,
    value: requests.filter(r => r.status !== 'rejected').reduce((a, r) => a + r.items.reduce((s, i) => s + i.qty * i.estimatedPrice, 0), 0),
    suppliers: suppliers.length,
  };

  async function handleAdd() {
    const name = form.itemPartId ? (parts.find(p => p.id === form.itemPartId)?.name || form.itemName) : form.itemName;
    if (!name || !form.qty || !form.estimatedPrice) {
      toast({ title: 'قطعه، تعداد و قیمت برآوردی الزامی است', variant: 'destructive' });
      return;
    }
    // استعلام خودکار از تأمین‌کنندگان مرتبط
    const p = parts.find(x => x.id === form.itemPartId);
    const relevant = suppliers.filter(s => p ? s.categories.some(c => p.category.includes(c) || c === p.category) : true).slice(0, 3);
    const quotes: Quote[] = relevant.map(s => ({
      supplierId: s.id,
      price: Math.round(Number(form.estimatedPrice) * Number(form.qty) * (0.97 + Math.random() * 0.06)),
      leadDays: 2 + Math.floor(Math.random() * 4),
    }));
    await create({
      code: `PO-${5000 + requests.length + 1}`, requesterId: 'e4',
      items: [{ name, partId: form.itemPartId || undefined, qty: Number(form.qty), estimatedPrice: Number(form.estimatedPrice) }],
      status: 'pending_approval', quotes,
      approvals: [], createdAt: new Date().toISOString(),
    } as Partial<PurchaseRequest>);
    setForm({ itemPartId: '', itemName: '', qty: '1', estimatedPrice: '' });
    setOpen(false);
    toast({ title: 'درخواست خرید ثبت شد', description: `استعلام از ${faNumber(quotes.length)} تأمین‌کننده ثبت شد — در انتظار تأیید مدیر` });
  }

  async function approve(r: PurchaseRequest, decision: 'approved' | 'rejected') {
    const note = decision === 'rejected' ? window.prompt('دلیل رد:') || '' : '';
    await update({
      id: r.id, status: decision,
      approvals: [...r.approvals, { by: 'مدیرعامل', at: new Date().toISOString(), decision, note: note || undefined }],
    });
    toast({ title: decision === 'approved' ? 'درخواست تأیید شد' : 'درخواست رد شد' });
  }

  async function nextStage(r: PurchaseRequest) {
    const order: PurchaseRequest['status'][] = ['approved', 'ordered', 'received', 'paid'];
    const idx = order.indexOf(r.status);
    if (idx === -1 || idx === order.length - 1) return;
    const next = order[idx + 1];
    if (next === 'received') {
      // ورود خودکار قطعات به انبار
      for (const item of r.items) {
        if (!item.partId) continue;
        const p = parts.find(x => x.id === item.partId);
        if (p) {
          await fetch('/api/parts', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: p.id, quantity: p.quantity + item.qty,
              movements: [...p.movements, { id: uid('m'), type: 'in', qty: item.qty, date: new Date().toISOString(), ref: r.code, note: 'دریافت خرید' }],
            }),
          });
        }
      }
      refresh();
      toast({ title: 'کالا دریافت و به انبار منتقل شد', description: `${r.code} — موجودی انبار به‌روزرسانی شد` });
      return;
    }
    await update({ id: r.id, status: next });
    toast({ title: `مرحله به ${purchaseStatusLabels[next]} تغییر کرد` });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="مدیریت خرید و تأمین"
        description="درخواست خرید، استعلام قیمت تأمین‌کنندگان، تأیید مدیر، سفارش و دریافت"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> درخواست خرید جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="درخواست‌های باز" value={faNumber(stats.open)} icon={ShoppingCart} tone="amber" />
        <KpiCard title="در انتظار تأیید مدیر" value={faNumber(stats.pending)} icon={CheckCheck} tone="red" />
        <KpiCard title="ارزش خریدهای دوره" value={moneyShort(stats.value)} icon={Truck} tone="zinc" />
        <KpiCard title="تأمین‌کنندگان فعال" value={faNumber(stats.suppliers)} icon={Warehouse} tone="teal" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden mb-6">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>کد</TableHead>
              <TableHead>اقلام</TableHead>
              <TableHead className="hidden md:table-cell">تاریخ</TableHead>
              <TableHead>مبلغ برآوردی</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={6}><LoadingTable /></TableCell></TableRow>}
            {!loading && requests.length === 0 && <EmptyRow colSpan={6} text="درخواستی ثبت نشده" />}
            {!loading && requests.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs" dir="ltr">{r.code}</TableCell>
                <TableCell className="text-xs max-w-56 truncate">{r.items.map(i => `${i.name} × ${faNumber(i.qty)}`).join('، ')}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">{jdate(r.createdAt)}</TableCell>
                <TableCell className="text-xs font-bold">{moneyShort(r.items.reduce((s, i) => s + i.qty * i.estimatedPrice, 0))}</TableCell>
                <TableCell><StatusPill label={purchaseStatusLabels[r.status]} tone={prTone[r.status]} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailId(r.id)}>جزئیات</Button>
                    {r.status === 'pending_approval' && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700" onClick={() => approve(r, 'approved')}>تأیید</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => approve(r, 'rejected')}>رد</Button>
                      </>
                    )}
                    {['approved', 'ordered', 'received'].includes(r.status) && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => nextStage(r)}>
                        {r.status === 'approved' ? 'ثبت سفارش' : r.status === 'ordered' ? 'دریافت کالا' : 'ثبت پرداخت'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* تأمین‌کنندگان */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {suppliers.map(s => (
          <div key={s.id} className="rounded-xl border bg-card shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-bold">{s.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{s.city} · <span dir="ltr">{s.phone}</span></div>
              </div>
              <div className="flex gap-0.5 text-amber-500 text-xs">
                {'★'.repeat(s.rating)}<span className="text-zinc-300">{'★'.repeat(5 - s.rating)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {s.categories.map(c => <StatusPill key={c} label={c} />)}
            </div>
            <div className="text-xs mt-2.5">
              <span className="text-muted-foreground">مانده حساب: </span>
              <span className={`font-bold ${s.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(s.balance)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* درخواست جدید */}
      <FormDialog open={open} onOpenChange={setOpen} title="درخواست خرید جدید" description="با ثبت درخواست، استعلام قیمت از تأمین‌کنندگان به‌صورت خودکار انجام می‌شود" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>قطعه از انبار</Label>
            <Select value={form.itemPartId} onValueChange={v => {
              const p = parts.find(x => x.id === v);
              setForm({ ...form, itemPartId: v, itemName: p?.name || '', estimatedPrice: p ? String(p.purchasePrice) : form.estimatedPrice });
            }}>
              <SelectTrigger><SelectValue placeholder="انتخاب قطعه (یا نام دستی وارد کنید)" /></SelectTrigger>
              <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>نام قلم</Label><Input value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>تعداد</Label><Input dir="ltr" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>قیمت برآوردی هر واحد (تومان)</Label><Input dir="ltr" value={form.estimatedPrice} onChange={e => setForm({ ...form, estimatedPrice: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت و استعلام قیمت</Button>
        </div>
      </FormDialog>

      {/* جزئیات درخواست */}
      <DetailDrawer open={!!detail} onOpenChange={v => !v && setDetailId(null)} title={detail ? `درخواست ${detail.code}` : ''} description={detail ? purchaseStatusLabels[detail.status] : ''}>
        {detail && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              {detail.items.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{i.name} × {faNumber(i.qty)}</span>
                  <span className="font-bold">{money(i.qty * i.estimatedPrice)}</span>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-sm font-bold mb-2">مقایسه استعلام تأمین‌کنندگان</h4>
              {detail.quotes.length === 0 && <div className="text-xs text-muted-foreground">استعلامی ثبت نشده</div>}
              <div className="space-y-1.5">
                {detail.quotes.map((q, i) => {
                  const best = Math.min(...detail.quotes.map(x => x.price));
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${q.price === best && detail.quotes.length > 1 ? 'border-emerald-300 bg-emerald-50/50' : ''}`}>
                      <span className="font-medium">{sName(q.supplierId)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">ارسال: {faNumber(q.leadDays)} روز</span>
                        <span className="font-bold">{money(q.price)}</span>
                        {q.price === best && detail.quotes.length > 1 && <StatusPill label="بهترین قیمت" tone="bg-emerald-50 text-emerald-700 border-emerald-200" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-2">تاریخچه تأییدات</h4>
              {detail.approvals.length === 0 && <div className="text-xs text-muted-foreground">هنوز تأییدی ثبت نشده</div>}
              {detail.approvals.map((a, i) => (
                <div key={i} className="rounded-lg border px-3 py-2 text-xs mb-1.5">
                  <b>{a.decision === 'approved' ? 'تأیید' : 'رد'}</b> توسط {a.by} — {jdate(a.at)}
                  {a.note && <div className="text-muted-foreground mt-0.5">{a.note}</div>}
                </div>
              ))}
            </div>

            {detail.notes && <div className="rounded-lg bg-muted p-3 text-xs">{detail.notes}</div>}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
