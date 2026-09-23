'use client';

// ─── قطعات و انبار ───
import { useMemo, useState } from 'react';
import { Plus, Package, PackageX, ShoppingCart, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow } from '../shared';
import { useEntity } from '../use-erp';
import type { Part, PartMovement, Supplier, PurchaseRequest } from '@/lib/erp-types';
import { money, moneyShort, faNumber, jdate, uid } from '@/lib/erp-utils';

export default function PartsView() {
  const { items: parts, loading, create, update, refresh } = useEntity<Part>('parts');
  const { items: suppliers } = useEntity<Supplier>('suppliers');
  const { items: purchaseRequests, create: createPR } = useEntity<PurchaseRequest>('purchaseRequests');
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [movementPart, setMovementPart] = useState<Part | null>(null);
  const [mv, setMv] = useState({ type: 'in', qty: '1', ref: '', note: '' });
  const [form, setForm] = useState({ code: '', name: '', category: 'مصرفی', quantity: '0', minQuantity: '3', unit: 'عدد', purchasePrice: '', salePrice: '', shelf: '' });

  const lowStock = parts.filter(p => p.quantity <= p.minQuantity);
  const stockValue = parts.reduce((a, p) => a + p.quantity * p.purchasePrice, 0);

  const filtered = useMemo(() => parts.filter(p =>
    `${p.code} ${p.name} ${p.category}`.includes(q)
  ), [parts, q]);

  async function handleAdd() {
    if (!form.name || !form.purchasePrice) {
      toast({ title: 'نام قطعه و قیمت خرید الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      code: form.code || `PT-${100 + parts.length + 1}`, name: form.name, category: form.category,
      compatibleModels: [], quantity: Number(form.quantity), minQuantity: Number(form.minQuantity),
      unit: form.unit, purchasePrice: Number(form.purchasePrice), salePrice: Number(form.salePrice || form.purchasePrice),
      shelf: form.shelf || '—', movements: [],
    } as Partial<Part>);
    setForm({ code: '', name: '', category: 'مصرفی', quantity: '0', minQuantity: '3', unit: 'عدد', purchasePrice: '', salePrice: '', shelf: '' });
    setOpen(false);
    toast({ title: 'قطعه جدید ثبت شد' });
  }

  async function registerMovement() {
    if (!movementPart || !mv.qty) return;
    const qty = Number(mv.qty);
    const newQty = mv.type === 'in' ? movementPart.quantity + qty : movementPart.quantity - qty;
    if (newQty < 0) {
      toast({ title: 'موجودی کافی نیست', variant: 'destructive' });
      return;
    }
    const movement: PartMovement = { id: uid('m'), type: mv.type as 'in' | 'out', qty, date: new Date().toISOString(), ref: mv.ref || undefined, note: mv.note || undefined };
    await update({ id: movementPart.id, quantity: newQty, movements: [...movementPart.movements, movement] });
    setMovementPart(null);
    setMv({ type: 'in', qty: '1', ref: '', note: '' });
    toast({ title: 'حرکت انبار ثبت شد', description: `${mv.type === 'in' ? 'ورود' : 'خروج'} ${faNumber(qty)} عدد — موجودی جدید: ${faNumber(newQty)}` });
  }

  async function quickReorder(p: Part) {
    const suggested = Math.max(p.minQuantity * 2 - p.quantity, 2);
    await createPR({
      code: `PO-${5000 + purchaseRequests.length + 1}`, requesterId: 'e4',
      items: [{ name: p.name, partId: p.id, qty: suggested, estimatedPrice: p.purchasePrice }],
      status: 'pending_approval',
      quotes: suppliers.filter(s => s.categories.some(c => p.category.includes(c) || c === p.category)).slice(0, 2).map(s => ({ supplierId: s.id, price: suggested * p.purchasePrice, leadDays: 3 })),
      approvals: [], createdAt: new Date().toISOString(),
      notes: 'سفارش خودکار به دلیل رسیدن به حداقل موجودی',
    } as Partial<PurchaseRequest>);
    toast({ title: 'درخواست خرید خودکار ایجاد شد', description: `${p.name} × ${faNumber(suggested)} — در ماژول خرید برای تأیید مدیر` });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="قطعات و انبار"
        description="کدگذاری، موجودی، حداقل موجودی، ورود و خروج، سفارش مجدد خودکار"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> قطعه جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="تعداد اقلام" value={faNumber(parts.length)} icon={Boxes} tone="amber" />
        <KpiCard title="ارزش موجودی انبار" value={moneyShort(stockValue)} icon={Package} tone="zinc" />
        <KpiCard title="زیر حداقل موجودی" value={faNumber(lowStock.length)} icon={PackageX} tone="red" />
        <KpiCard title="درخواست‌های خرید باز" value={faNumber(purchaseRequests.filter(p => !['paid', 'rejected'].includes(p.status)).length)} icon={ShoppingCart} tone="teal" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجوی نام یا کد قطعه..." className="max-w-xs" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>کد</TableHead>
              <TableHead>نام قطعه</TableHead>
              <TableHead className="hidden md:table-cell">دسته</TableHead>
              <TableHead>موجودی</TableHead>
              <TableHead className="hidden sm:table-cell">قیمت خرید/فروش</TableHead>
              <TableHead className="hidden lg:table-cell">قفسه</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7}><LoadingTable /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <EmptyRow colSpan={7} text="قطعه‌ای یافت نشد" />}
            {!loading && filtered.map(p => (
              <TableRow key={p.id} className={p.quantity <= p.minQuantity ? 'bg-red-50/40' : undefined}>
                <TableCell className="font-mono text-xs" dir="ltr">{p.code}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.compatibleModels.slice(0, 3).join('، ')}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs">{p.category}</TableCell>
                <TableCell>
                  <span className={`text-sm font-bold ${p.quantity <= p.minQuantity ? 'text-red-600' : ''}`}>{faNumber(p.quantity)}</span>
                  <span className="text-[11px] text-muted-foreground"> از {faNumber(p.minQuantity)}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-[11px]">{moneyShort(p.purchasePrice)} / {moneyShort(p.salePrice)}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{p.shelf}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setMovementPart(p); setMv({ ...mv, type: 'in' }); }}>ورود</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setMovementPart(p); setMv({ ...mv, type: 'out' }); }}>خروج</Button>
                    {p.quantity <= p.minQuantity && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => quickReorder(p)}>سفارش مجدد</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* قطعه جدید */}
      <FormDialog open={open} onOpenChange={setOpen} title="ثبت قطعه جدید" description="کدگذاری و موجودی اولیه" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>کد قطعه</Label><Input dir="ltr" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="خالی بگذارید تا خودکار تولید شود" /></div>
          <div className="space-y-1.5"><Label>نام قطعه *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>دسته</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['موتور', 'جلوبندی', 'برق', 'بدنه', 'مصرفی', 'ترمز', 'لاستیک', 'رنگ و مواد مصرفی'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>قفسه</Label><Input dir="ltr" value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })} placeholder="A-01" /></div>
          <div className="space-y-1.5"><Label>موجودی اولیه</Label><Input dir="ltr" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>حداقل موجودی</Label><Input dir="ltr" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>قیمت خرید (تومان) *</Label><Input dir="ltr" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>قیمت فروش (تومان)</Label><Input dir="ltr" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت قطعه</Button>
        </div>
      </FormDialog>

      {/* حرکت انبار */}
      <FormDialog open={!!movementPart} onOpenChange={v => !v && setMovementPart(null)} title={`حرکت انبار — ${movementPart?.name || ''}`} description={`موجودی فعلی: ${faNumber(movementPart?.quantity || 0)} ${movementPart?.unit || ''}`}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>نوع حرکت</Label>
            <Select value={mv.type} onValueChange={v => setMv({ ...mv, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in">ورود به انبار</SelectItem>
                <SelectItem value="out">خروج از انبار</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>تعداد</Label><Input dir="ltr" value={mv.qty} onChange={e => setMv({ ...mv, qty: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>مرجع (شماره سفارش کار/خرید)</Label><Input dir="ltr" value={mv.ref} onChange={e => setMv({ ...mv, ref: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>یادداشت</Label><Input value={mv.note} onChange={e => setMv({ ...mv, note: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setMovementPart(null)}>انصراف</Button>
          <Button onClick={registerMovement}>ثبت حرکت</Button>
        </div>
      </FormDialog>
    </div>
  );
}
