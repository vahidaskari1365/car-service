'use client';

// ─── تعمیرگاه و خدمات فنی ───
import { useMemo, useState } from 'react';
import { Plus, Wrench, ClipboardCheck, Clock, PackageSearch, ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { KpiCard, PageHeader, StatusPill, FormDialog, LoadingTable, DetailDrawer, FocusBanner, type NavFocus } from '../shared';
import { useEntity } from '../use-erp';
import { actorHeader } from '@/lib/actor';
import { PrintDocDialog, WorkshopInvoiceDoc } from '../print/print-docs';
import type { WorkOrder, Vehicle, Employee, Part, WorkOrderLog, Customer } from '@/lib/erp-types';
import { money, moneyShort, faNumber, jdate, jdatetime, woStatusLabels, woTypeLabels, workOrderTotal, uid } from '@/lib/erp-utils';

const STAGES: WorkOrder['status'][] = ['received', 'diagnosis', 'awaiting_approval', 'in_repair', 'quality_control', 'ready', 'delivered'];
const stageTone: Record<string, string> = {
  received: 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-300 dark:border-zinc-500/30',
  diagnosis: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30',
  awaiting_approval: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  in_repair: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  quality_control: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
  ready: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  delivered: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30',
};

export default function WorkshopView({ focus, onClearFocus }: { focus?: NavFocus | null; onClearFocus?: () => void }) {
  const { items: workOrders, loading, create, update, refresh } = useEntity<WorkOrder>('workOrders');
  const { items: vehicles } = useEntity<Vehicle>('vehicles');
  const { items: employees } = useEntity<Employee>('employees');
  const { items: parts } = useEntity<Part>('parts');
  const { items: customers } = useEntity<Customer>('customers');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [form, setForm] = useState({ vehicleId: '', type: 'mechanic', complaint: '', technicianId: 'e5' });
  const [partId, setPartId] = useState('');
  // فوکوس موضوعی از داشبورد: «در تعمیرگاه» → سفارش‌های کار باز
  const [stageFilter, setStageFilter] = useState(() => focus?.topic === 'open' ? 'open' : 'all');

  const vName = (id: string) => { const v = vehicles.find(x => x.id === id); return v ? `${v.brand} ${v.model} (${faNumber(v.year)})` : '—'; };
  const eName = (id?: string) => employees.find(x => x.id === id)?.name || '—';
  const detail = workOrders.find(w => w.id === detailId) || null;
  const printWo = workOrders.find(w => w.id === printId) || null;

  const stats = useMemo(() => ({
    open: workOrders.filter(w => w.status !== 'delivered').length,
    inRepair: workOrders.filter(w => w.status === 'in_repair').length,
    revenue: workOrders.filter(w => w.status === 'delivered').reduce((a, w) => a + workOrderTotal(w), 0),
    hours: workOrders.reduce((a, w) => a + w.laborHours, 0),
  }), [workOrders]);

  async function handleAdd() {
    if (!form.vehicleId || !form.complaint) {
      toast({ title: 'انتخاب خودرو و شرح مشکل الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      code: `WO-${2000 + workOrders.length + 1}`,
      vehicleId: form.vehicleId, type: form.type as WorkOrder['type'],
      status: 'received', complaint: form.complaint,
      technicianId: form.technicianId || undefined,
      receivedAt: new Date().toISOString(), laborHours: 0, laborRate: 3_500_000, parts: [],
      logs: [{ at: new Date().toISOString(), by: eName(form.technicianId) || 'پذیرش', action: 'پذیرش خودرو در تعمیرگاه' }],
    } as Partial<WorkOrder>);
    setForm({ vehicleId: '', type: 'mechanic', complaint: '', technicianId: 'e5' });
    setOpen(false);
    toast({ title: 'سفارش کار ثبت شد', description: 'پذیرش خودرو انجام شد' });
  }

  async function advance(w: WorkOrder) {
    const idx = STAGES.indexOf(w.status);
    if (idx === -1 || idx === STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    const log: WorkOrderLog = { at: new Date().toISOString(), by: eName(w.technicianId) || 'سیستم', action: `انتقال به مرحله: ${woStatusLabels[next]}` };
    const patch: Record<string, unknown> = { status: next, logs: [...w.logs, log] };
    if (next === 'delivered') patch.completedAt = new Date().toISOString();
    if (next === 'in_repair' && !w.diagnosis) patch.diagnosis = 'در حال بررسی توسط تکنسین';
    await update({ id: w.id, ...patch } as Partial<WorkOrder> & { id: string });

    // اگر تحویل شد، هزینه به‌عنوان هزینه آماده‌سازی/تعمیر به خودرو اضافه شود
    if (next === 'delivered') {
      const v = vehicles.find(x => x.id === w.vehicleId);
      if (v) {
        const cost = {
          id: uid('c'), title: `تعمیرات — ${w.code}`,
          amount: workOrderTotal(w), date: new Date().toISOString(), category: 'repair' as const,
        };
        await fetch('/api/vehicles', {
          method: 'PUT', headers: { 'Content-Type': 'application/json', ...actorHeader() },
          body: JSON.stringify({ id: v.id, costs: [...v.costs, cost], status: v.status === 'in_repair' ? 'in_stock' : v.status, preparationStatus: w.type === 'preparation' ? 'done' : v.preparationStatus }),
        });
      }
      toast({ title: 'سفارش کار تحویل شد', description: `${w.code} — فاکتور: ${moneyShort(workOrderTotal(w))}` });
    } else {
      toast({ title: 'مرحله پیشرفت کرد', description: `${w.code} → ${woStatusLabels[next]}` });
    }
  }

  async function addPart() {
    if (!detail || !partId) return;
    const p = parts.find(x => x.id === partId);
    if (!p) return;
    if (p.quantity <= 0) {
      toast({ title: 'موجودی این قطعه تمام شده است', variant: 'destructive' });
      return;
    }
    const existing = detail.parts.find(x => x.partId === partId);
    const newParts = existing
      ? detail.parts.map(x => x.partId === partId ? { ...x, qty: x.qty + 1 } : x)
      : [...detail.parts, { partId, qty: 1, unitPrice: p.salePrice }];
    // کاهش موجودی انبار + ثبت حرکت
    await fetch('/api/parts', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, quantity: p.quantity - 1, movements: [...p.movements, { id: uid('m'), type: 'out', qty: 1, date: new Date().toISOString(), ref: detail.code, note: 'مصرف در تعمیرگاه' }] }),
    });
    await update({ id: detail.id, parts: newParts });
    setPartId('');
    refresh();
    toast({ title: 'قطعه به سفارش کار اضافه شد', description: `${p.name} — موجودی انبار به‌روزرسانی شد` });
  }

  async function saveDiagnosis() {
    if (!detail) return;
    const diag = window.prompt('تشخیص فنی:', detail.diagnosis || '');
    if (diag === null) return;
    const hours = window.prompt('ساعات کار برآوردی:', String(detail.laborHours));
    await update({
      id: detail.id, diagnosis: diag || undefined,
      laborHours: Number(hours || detail.laborHours),
      logs: [...detail.logs, { at: new Date().toISOString(), by: eName(detail.technicianId), action: 'ثبت تشخیص فنی' }],
    });
    toast({ title: 'تشخیص ثبت شد' });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="تعمیرگاه و خدمات فنی"
        description="پذیرش، کارشناسی، تخصیص تکنسین، مصرف قطعات، کنترل کیفیت و صدور فاکتور"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> پذیرش خودرو جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard title="سفارش‌های کار باز" value={faNumber(stats.open)} icon={Wrench} tone="red" />
        <KpiCard title="در حال تعمیر" value={faNumber(stats.inRepair)} icon={Wrench} tone="amber" />
        <KpiCard title="درآمد فاکتورهای تعمیرگاه" value={moneyShort(stats.revenue)} icon={ClipboardCheck} tone="emerald" />
        <KpiCard title="مجموع ساعات کار ثبت‌شده" value={faNumber(stats.hours)} sub="ساعت" icon={Clock} tone="zinc" />
      </div>

      {focus && (
        <FocusBanner
          label={focus.label}
          description="از داشبورد باز شده است — فقط سفارش‌های کار باز (بدون تحویل‌شده)"
          onClear={() => { setStageFilter('all'); onClearFocus?.(); }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { k: 'all', label: 'همه مراحل' },
          { k: 'open', label: `باز (${faNumber(stats.open)})` },
          { k: 'in_repair', label: 'در حال تعمیر' },
          { k: 'ready', label: 'آماده تحویل' },
          { k: 'delivered', label: 'تحویل‌شده' },
        ].map(f => (
          <button
            key={f.k}
            onClick={() => setStageFilter(f.k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
              stageFilter === f.k
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300'
                : 'bg-card border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* خط تولید مراحل */}
      {loading ? <LoadingTable rows={4} /> : (
        <div className="space-y-4">
          {STAGES.filter(stage =>
            stageFilter === 'all' ? true
              : stageFilter === 'open' ? stage !== 'delivered'
              : stage === stageFilter
          ).map(stage => {
            const list = workOrders.filter(w => w.status === stage);
            if (list.length === 0) return null;
            return (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusPill label={`${woStatusLabels[stage]} (${faNumber(list.length)})`} tone={stageTone[stage]} />
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {list.map(w => (
                    <div key={w.id} className="rounded-xl border bg-card shadow-sm p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold">{vName(w.vehicleId)}</div>
                          <div className="text-[11px] text-muted-foreground font-mono" dir="ltr">{w.code}</div>
                        </div>
                        <StatusPill label={woTypeLabels[w.type]} />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-8">{w.complaint}</p>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>تکنسین: {eName(w.technicianId)}</span>
                        <span>پذیرش: {jdate(w.receivedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{w.laborHours > 0 || w.parts.length > 0 ? moneyShort(workOrderTotal(w)) : '—'}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetailId(w.id)}>جزئیات</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-teal-700" onClick={() => setPrintId(w.id)} title="چاپ فاکتور خدمات فنی">
                            <Printer className="h-3.5 w-3.5" /> فاکتور
                          </Button>
                          {stage !== 'delivered' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => advance(w)}>
                              مرحله بعد <ArrowLeft className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* پذیرش */}
      <FormDialog open={open} onOpenChange={setOpen} title="پذیرش خودرو در تعمیرگاه" description="ایجاد سفارش کار جدید (Work Order)" wide>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>خودرو *</Label>
            <Select value={form.vehicleId} onValueChange={v => setForm({ ...form, vehicleId: v })}>
              <SelectTrigger><SelectValue placeholder="انتخاب خودرو" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.plate || v.vin}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>نوع خدمت</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(woTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>تکنسین مسئول</Label>
            <Select value={form.technicianId} onValueChange={v => setForm({ ...form, technicianId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.division === 'تعمیرگاه').map(e => <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>شرح مشکل (از زبان مشتری) *</Label>
            <Textarea value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} placeholder="مثلاً: صدای تق‌تق از جلوبندی و لرزش..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ثبت پذیرش</Button>
        </div>
      </FormDialog>

      {/* جزئیات سفارش کار */}
      <DetailDrawer open={!!detail} onOpenChange={v => !v && setDetailId(null)} title={detail ? `سفارش کار ${detail.code}` : ''} description={detail ? `${vName(detail.vehicleId)} — ${woTypeLabels[detail.type]}` : ''}>
        {detail && (
          <div className="space-y-5">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="text-[11px] text-muted-foreground mb-1">شرح مشکل</div>
              {detail.complaint}
            </div>
            {detail.diagnosis && (
              <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3 text-sm dark:border-teal-500/40 dark:bg-teal-500/10">
                <div className="text-[11px] text-teal-700 mb-1">تشخیص فنی</div>
                {detail.diagnosis}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">ساعات کار</div><div className="font-bold text-sm">{faNumber(detail.laborHours)}</div></div>
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">نرخ هر ساعت</div><div className="font-bold text-sm">{moneyShort(detail.laborRate)}</div></div>
              <div className="rounded-lg bg-amber-50 p-2.5"><div className="text-[10px] text-amber-700">مبلغ فاکتور</div><div className="font-bold text-sm">{money(workOrderTotal(detail))}</div></div>
              <div className="rounded-lg bg-muted p-2.5"><div className="text-[10px] text-muted-foreground">تکنسین</div><div className="font-bold text-sm">{eName(detail.technicianId)}</div></div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={saveDiagnosis} className="gap-1"><ClipboardCheck className="h-3.5 w-3.5" /> ثبت تشخیص و ساعات کار</Button>
              <Button size="sm" variant="outline" onClick={() => setPrintId(detail.id)} className="gap-1 text-teal-700"><Printer className="h-3.5 w-3.5" /> چاپ فاکتور خدمات فنی</Button>
              {detail.status !== 'delivered' && (
                <Button size="sm" onClick={() => advance(detail)} className="gap-1">انتقال به مرحله بعد <ArrowLeft className="h-3.5 w-3.5" /></Button>
              )}
            </div>

            {/* قطعات مصرفی */}
            <div>
              <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5"><PackageSearch className="h-4 w-4" /> قطعات مصرفی</h4>
              <div className="space-y-1.5">
                {detail.parts.length === 0 && <div className="text-xs text-muted-foreground">قطعه‌ای مصرف نشده</div>}
                {detail.parts.map(p => {
                  const pt = parts.find(x => x.id === p.partId);
                  return (
                    <div key={p.partId} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                      <span className="font-medium">{pt?.name || p.partId} × {faNumber(p.qty)}</span>
                      <span className="font-bold">{money(p.qty * p.unitPrice)}</span>
                    </div>
                  );
                })}
              </div>
              {detail.status !== 'delivered' && (
                <div className="flex gap-2 mt-3">
                  <Select value={partId} onValueChange={setPartId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="انتخاب قطعه از انبار" /></SelectTrigger>
                    <SelectContent>
                      {parts.map(p => (
                        <SelectItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} (موجودی: {faNumber(p.quantity)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={addPart}>افزودن</Button>
                </div>
              )}
            </div>

            {/* تایم‌لاین */}
            <div>
              <h4 className="text-sm font-bold mb-2">تاریخچه مراحل</h4>
              <div className="space-y-0">
                {detail.logs.map((l, i) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-500 mt-1" />
                      {i < detail.logs.length - 1 && <div className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-3">
                      <div className="font-medium">{l.action}</div>
                      <div className="text-muted-foreground">{l.by} · {jdatetime(l.at)}{l.note ? ` — ${l.note}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {detail.qualityCheck && (
              <div className={`rounded-lg border p-3 text-xs ${detail.qualityCheck.passed ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-red-200 bg-red-50/60 dark:border-red-500/40 dark:bg-red-500/10'}`}>
                <b>کنترل کیفیت:</b> {detail.qualityCheck.passed ? 'تأیید شد' : 'رد شد'} — {detail.qualityCheck.by}
                {detail.qualityCheck.notes && <div className="mt-1">{detail.qualityCheck.notes}</div>}
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* چاپ فاکتور تعمیرگاه */}
      <PrintDocDialog open={!!printWo} onOpenChange={v => !v && setPrintId(null)} title={`فاکتور خدمات فنی ${printWo?.code || ''}`}>
        {printWo && (
          <WorkshopInvoiceDoc
            wo={printWo}
            vehicle={vehicles.find(v => v.id === printWo.vehicleId)}
            customer={customers.find(c => c.id === printWo.customerId)}
            parts={parts}
          />
        )}
      </PrintDocDialog>
    </div>
  );
}
