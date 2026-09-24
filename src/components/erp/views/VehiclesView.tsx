'use client';

// ─── مدیریت خودروها ───
import { useMemo, useState } from 'react';
import { Plus, Search, Car, Trash2, Pencil, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, DetailDrawer, LoadingTable, EmptyRow, FocusBanner, type NavFocus } from '../shared';
import JalaliDatePicker from '../jalali-date-picker';
import { useEntity } from '../use-erp';
import type { Vehicle, VehicleCost } from '@/lib/erp-types';
import {
  money, moneyShort, faNumber, jdate, km, vehicleStatusLabels, vehicleStatusTone,
  vehicleProfit, vehicleCostsTotal, uid,
} from '@/lib/erp-utils';

const emptyForm = {
  brand: '', model: '', year: '1404', color: '', mileage: '0', vin: '', plate: '',
  category: 'showroom', status: 'in_stock', location: 'نمایشگاه', purchasePrice: '', customerName: '',
};

export default function VehiclesView({ focus, onClearFocus }: { focus?: NavFocus | null; onClearFocus?: () => void }) {
  const { items: vehicles, loading, create, update, remove } = useEntity<Vehicle>('vehicles');
  const { toast } = useToast();
  const [q, setQ] = useState('');
  // فوکوس موضوعی از داشبورد: ویو با فیلتر همان موضوع mount می‌شود
  const [statusFilter, setStatusFilter] = useState(() =>
    focus?.topic.startsWith('status:') ? (focus.topic.split(':')[1] || 'all') : 'all'
  );
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [costForm, setCostForm] = useState({ title: '', amount: '', category: 'preparation' });

  const filtered = useMemo(() => vehicles.filter(v => {
    const s = `${v.brand} ${v.model} ${v.vin} ${v.plate || ''} ${v.color}`;
    return s.includes(q) && (statusFilter === 'all' || v.status === statusFilter);
  }), [vehicles, q, statusFilter]);

  const detail = vehicles.find(v => v.id === detailId) || null;

  const stats = useMemo(() => ({
    stock: vehicles.filter(v => v.status === 'in_stock').length,
    sold: vehicles.filter(v => v.status === 'sold').length,
    value: vehicles.filter(v => v.status !== 'sold').reduce((a, v) => a + v.purchasePrice, 0),
    realized: vehicles.filter(v => v.salePrice).reduce((a, v) => a + (vehicleProfit(v) ?? 0), 0),
  }), [vehicles]);

  async function handleAdd() {
    if (!form.brand || !form.model || !form.purchasePrice) {
      toast({ title: 'برند، مدل و قیمت خرید الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      vin: form.vin || '—', plate: form.plate, brand: form.brand, model: form.model,
      year: Number(form.year), color: form.color || '—', mileage: Number(form.mileage),
      category: form.category as Vehicle['category'], status: form.status as Vehicle['status'],
      location: form.location, purchasePrice: Number(form.purchasePrice),
      purchaseDate: new Date().toISOString(), customerName: form.customerName || undefined,
      preparationStatus: 'none', costs: [],
    } as Partial<Vehicle>);
    setForm(emptyForm);
    setAddOpen(false);
    toast({ title: 'خودرو با موفقیت ثبت شد' });
  }

  async function changeStatus(v: Vehicle, status: string) {
    await update({ id: v.id, status: status as Vehicle['status'] });
    toast({ title: 'وضعیت خودرو به‌روزرسانی شد', description: `${v.model} → ${vehicleStatusLabels[status]}` });
  }

  async function addCost() {
    if (!detail || !costForm.title || !costForm.amount) return;
    const cost: VehicleCost = {
      id: uid('c'), title: costForm.title, amount: Number(costForm.amount),
      date: new Date().toISOString(), category: costForm.category as VehicleCost['category'],
    };
    await update({ id: detail.id, costs: [...detail.costs, cost] });
    setCostForm({ title: '', amount: '', category: 'preparation' });
    toast({ title: 'هزینه ثبت شد' });
  }

  async function removeCost(costId: string) {
    if (!detail) return;
    await update({ id: detail.id, costs: detail.costs.filter(c => c.id !== costId) });
  }

  async function markSold(v: Vehicle) {
    const price = window.prompt(`قیمت فروش نهایی ${v.model} (تومان):`, String(v.purchasePrice + 50_000_000));
    if (!price) return;
    await update({
      id: v.id, status: 'sold' as const, salePrice: Number(price), saleDate: new Date().toISOString(),
      location: 'تحویل مشتری',
    });
    toast({ title: 'فروش ثبت شد', description: `${v.model} با قیمت ${moneyShort(Number(price))}` });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="مدیریت خودرو"
        description="ثبت مشخصات کامل، هزینه‌ها، آماده‌سازی، سوابق و محاسبه سود واقعی هر خودرو"
        action={<Button onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> ثبت خودرو جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="در نمایشگاه" value={faNumber(stats.stock)} icon={Car} tone="amber" />
        <KpiCard title="فروخته‌شده" value={faNumber(stats.sold)} icon={Car} tone="emerald" />
        <KpiCard title="ارزش موجودی (خرید)" value={moneyShort(stats.value)} icon={Car} tone="zinc" />
        <KpiCard title="سود محقق‌شده فروش" value={moneyShort(stats.realized)} icon={Car} tone="teal" />
      </div>

      {focus && (
        <FocusBanner
          label={focus.label}
          description="این فهرست از داشبورد با موضوع انتخابی شما باز شده است"
          onClear={() => { setStatusFilter('all'); onClearFocus?.(); }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو: مدل، VIN، پلاک..." className="ps-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="همه وضعیت‌ها" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {Object.entries(vehicleStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>خودرو</TableHead>
              <TableHead className="hidden md:table-cell">VIN / پلاک</TableHead>
              <TableHead className="hidden lg:table-cell">کارکرد</TableHead>
              <TableHead>قیمت خرید</TableHead>
              <TableHead className="hidden sm:table-cell">قیمت فروش</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7}><LoadingTable /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <EmptyRow colSpan={7} text="خودرویی یافت نشد" />}
            {!loading && filtered.map(v => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="font-semibold text-sm">{v.brand} {v.model}</div>
                  <div className="text-xs text-muted-foreground">سال {faNumber(v.year)} · {v.color} · {v.location}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-xs font-mono" dir="ltr">{v.vin}</div>
                  <div className="text-xs text-muted-foreground">{v.plate || '—'}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{km(v.mileage)}</TableCell>
                <TableCell className="text-xs font-medium">{moneyShort(v.purchasePrice)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">
                  {v.salePrice ? (
                    <span>
                      {moneyShort(v.salePrice)}
                      <span className={`block text-[11px] font-bold ${(vehicleProfit(v) ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        سود: {moneyShort(vehicleProfit(v) ?? 0)}
                      </span>
                    </span>
                  ) : '—'}
                </TableCell>
                <TableCell><StatusPill label={vehicleStatusLabels[v.status]} tone={vehicleStatusTone[v.status]} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="جزئیات" onClick={() => setDetailId(v.id)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {v.status !== 'sold' && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-emerald-700" onClick={() => markSold(v)}>
                        فروش
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="حذف" onClick={async () => {
                      if (window.confirm(`حذف ${v.model} از سامانه؟`)) await remove(v.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ثبت خودرو جدید */}
      <FormDialog open={addOpen} onOpenChange={setAddOpen} title="ثبت خودرو جدید" description="مشخصات کامل خودرو را وارد کنید" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>برند *</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="پژو، سایپا، ایران‌خودرو..." /></div>
          <div className="space-y-1.5"><Label>مدل *</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="۲۰۷ اتوماتیک..." /></div>
          <div className="space-y-1.5"><Label>سال (شمسی)</Label><Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>رنگ</Label><Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>VIN / شماره شاسی</Label><Input value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value })} dir="ltr" /></div>
          <div className="space-y-1.5"><Label>پلاک</Label><Input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>کارکرد (کیلومتر)</Label><Input value={form.mileage} onChange={e => setForm({ ...form, mileage: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>قیمت خرید (تومان) *</Label><Input value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} placeholder="مثلاً 940000000" dir="ltr" /></div>
          <div className="space-y-1.5">
            <Label>دسته</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="showroom">نمایشگاه</SelectItem>
                <SelectItem value="rental_fleet">ناوگان اجاره</SelectItem>
                <SelectItem value="service">خدماتی</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>وضعیت اولیه</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">در نمایشگاه</SelectItem>
                <SelectItem value="preparing">در آماده‌سازی</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>محل فعلی</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setAddOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت خودرو</Button>
        </div>
      </FormDialog>

      {/* پرونده خودرو */}
      <DetailDrawer
        open={!!detail}
        onOpenChange={v => !v && setDetailId(null)}
        title={detail ? `${detail.brand} ${detail.model} — سال ${faNumber(detail.year)}` : ''}
        description={detail ? `VIN: ${detail.vin} · ${km(detail.mileage)} · ${detail.color}` : ''}
      >
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">قیمت خرید</div><div className="text-sm font-bold mt-1">{moneyShort(detail.purchasePrice)}</div></div>
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">قیمت فروش</div><div className="text-sm font-bold mt-1">{detail.salePrice ? moneyShort(detail.salePrice) : '—'}</div></div>
              <div className="rounded-lg bg-muted p-3"><div className="text-[11px] text-muted-foreground">مجموع هزینه‌ها</div><div className="text-sm font-bold mt-1">{moneyShort(vehicleCostsTotal(detail))}</div></div>
              <div className={`rounded-lg p-3 ${detail.salePrice ? 'bg-emerald-50' : 'bg-muted'}`}>
                <div className="text-[11px] text-muted-foreground">سود واقعی</div>
                <div className={`text-sm font-bold mt-1 ${detail.salePrice ? 'text-emerald-700' : ''}`}>{detail.salePrice ? moneyShort(vehicleProfit(detail) ?? 0) : 'پس از فروش'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">پلاک:</span> {detail.plate || '—'}</div>
              <div><span className="text-muted-foreground">محل فعلی:</span> {detail.location}</div>
              <div><span className="text-muted-foreground">تاریخ خرید:</span> {jdate(detail.purchaseDate)}</div>
              <div><span className="text-muted-foreground">تاریخ فروش:</span> {jdate(detail.saleDate)}</div>
              <div><span className="text-muted-foreground">آماده‌سازی:</span> {detail.preparationStatus === 'done' ? 'تکمیل شده' : detail.preparationStatus === 'in_progress' ? 'در جریان' : 'شروع نشده'}</div>
              <div><span className="text-muted-foreground">مشتری:</span> {detail.customerName || '—'}</div>
            </div>

            {/* بیمه و معاینه فنی */}
            <div>
              <h4 className="text-sm font-bold mb-2">بیمه‌نامه و معاینه فنی</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">بیمه‌نامه شخص ثالث</span>
                    <span className={
                      !detail.insuranceExpiry ? 'text-muted-foreground'
                        : new Date(detail.insuranceExpiry) < new Date() ? 'text-red-600 font-bold'
                        : new Date(detail.insuranceExpiry).getTime() < Date.now() + 30 * 86400000 ? 'text-amber-600 font-bold'
                        : 'text-emerald-600 font-bold'
                    }>
                      {detail.insuranceExpiry ? (new Date(detail.insuranceExpiry) < new Date() ? 'منقضی — ' : '') + jdate(detail.insuranceExpiry) : 'ثبت نشده'}
                    </span>
                  </div>
                  <JalaliDatePicker
                    value={detail.insuranceExpiry || ''}
                    onChange={iso => update({ id: detail.id, insuranceExpiry: iso || undefined })}
                    placeholder="تاریخ انقضای بیمه‌نامه"
                  />
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">معاینه فنی</span>
                    <span className={
                      !detail.inspectionExpiry ? 'text-muted-foreground'
                        : new Date(detail.inspectionExpiry) < new Date() ? 'text-red-600 font-bold'
                        : new Date(detail.inspectionExpiry).getTime() < Date.now() + 15 * 86400000 ? 'text-amber-600 font-bold'
                        : 'text-emerald-600 font-bold'
                    }>
                      {detail.inspectionExpiry ? (new Date(detail.inspectionExpiry) < new Date() ? 'منقضی — ' : '') + jdate(detail.inspectionExpiry) : 'ثبت نشده'}
                    </span>
                  </div>
                  <JalaliDatePicker
                    value={detail.inspectionExpiry || ''}
                    onChange={iso => update({ id: detail.id, inspectionExpiry: iso || undefined })}
                    placeholder="تاریخ انقضای معاینه فنی"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold">تغییر وضعیت</h4>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(vehicleStatusLabels).map(([k, label]) => (
                  <Button key={k} size="sm" variant={detail.status === k ? 'default' : 'outline'} className="h-8 text-xs"
                    onClick={() => changeStatus(detail, k)} disabled={detail.status === k}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-2">هزینه‌های انجام‌شده روی خودرو</h4>
              <div className="space-y-1.5">
                {detail.costs.length === 0 && <div className="text-xs text-muted-foreground">هزینه‌ای ثبت نشده</div>}
                {detail.costs.map(c => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium">{c.title}</span>
                      <span className="text-muted-foreground block">{jdate(c.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{money(c.amount)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => removeCost(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Input placeholder="عنوان هزینه" value={costForm.title} onChange={e => setCostForm({ ...costForm, title: e.target.value })} className="flex-1" />
                <Input placeholder="مبلغ (تومان)" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} dir="ltr" className="w-40" />
                <Button onClick={addCost} size="sm" className="gap-1"><Pencil className="h-3.5 w-3.5" /> افزودن</Button>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
