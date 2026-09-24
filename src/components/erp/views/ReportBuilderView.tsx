'use client';

// ─── گزارش‌ساز پیشرفته — انتخاب داده، ستون، فیلتر، گروه‌بندی، نمودار، خروجی ───
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SlidersHorizontal, Search, Download, Printer, X, Table2, BarChart3,
  ArrowUpDown, Layers, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, SectionCard, StatusPill } from '../shared';
import { useEntity } from '../use-erp';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import {
  moneyShort, money, faNumber, jdate,
  vehicleStatusLabels, dealStatusLabels, woStatusLabels, rentalStatusLabels,
  insStatusLabels, purchaseStatusLabels, segmentLabels,
} from '@/lib/erp-utils';

// ─── پیکربندی دیتاست‌ها ───

type DatasetKey =
  | 'vehicles' | 'customers' | 'deals' | 'workOrders' | 'rentals' | 'installments'
  | 'parts' | 'transactions' | 'purchaseRequests' | 'suppliers' | 'employees';

const DATASETS: { key: DatasetKey; label: string }[] = [
  { key: 'vehicles', label: 'خودروها' },
  { key: 'customers', label: 'مشتریان' },
  { key: 'deals', label: 'معاملات' },
  { key: 'workOrders', label: 'سفارش‌های کار' },
  { key: 'rentals', label: 'اجاره‌ها' },
  { key: 'installments', label: 'قراردادهای اقساط' },
  { key: 'parts', label: 'قطعات و انبار' },
  { key: 'transactions', label: 'تراکنش‌های مالی' },
  { key: 'purchaseRequests', label: 'درخواست‌های خرید' },
  { key: 'suppliers', label: 'تأمین‌کنندگان' },
  { key: 'employees', label: 'کارکنان' },
];

/** برچسب فارسی فیلدها */
const FIELD_LABELS: Record<string, string> = {
  code: 'کد', brand: 'برند', model: 'مدل', year: 'سال', color: 'رنگ', vin: 'VIN', plate: 'پلاک',
  mileage: 'کارکرد', category: 'دسته', status: 'وضعیت', location: 'محل', purchasePrice: 'قیمت خرید',
  salePrice: 'قیمت فروش', purchaseDate: 'تاریخ خرید', saleDate: 'تاریخ فروش', customerName: 'مشتری',
  firstName: 'نام', lastName: 'نام خانوادگی', phone: 'تلفن', segment: 'سگمنت', city: 'شهر', type: 'نوع',
  price: 'قیمت', commission: 'کمیسیون', date: 'تاریخ', deliveryDate: 'تاریخ تحویل',
  complaint: 'شرح مشکل', laborHours: 'ساعات کار', laborRate: 'نرخ ساعت', receivedAt: 'تاریخ پذیرش',
  technicianId: 'تکنسین', startDate: 'شروع', endDate: 'پایان', dailyRate: 'نرخ روزانه',
  deposit: 'ودیعه', paidAmount: 'پرداخت‌شده', vehiclePrice: 'قیمت خودرو', downPayment: 'پیش‌پرداخت',
  months: 'تعداد اقساط', monthlyPayment: 'قسط ماهانه', interestRate: 'نرخ سود', creditScore: 'امتیاز اعتباری',
  guarantor: 'ضامن', name: 'نام', quantity: 'موجودی', minQuantity: 'حداقل موجودی', unit: 'واحد',
  salePrice_: 'قیمت فروش', shelf: 'قفسه', amount: 'مبلغ', division: 'واحد', description: 'شرح',
  method: 'روش پرداخت', rating: 'امتیاز', balance: 'مانده حساب', role: 'نقش', active: 'فعال',
  title: 'عنوان', currentStageIndex: 'مرحله جاری', createdAt: 'تاریخ ثبت', requestedAt: 'تاریخ درخواست',
  insuranceExpiry: 'انقضای بیمه', inspectionExpiry: 'انقضای معاینه', username: 'نام کاربری',
  fullName: 'نام کامل', notes: 'یادداشت', vehicleId: 'شناسه خودرو', customerId: 'شناسه مشتری',
  preparationStatus: 'وضعیت آماده‌سازی', actualReturnDate: 'تاریخ عودت', mileageIn: 'کارکرد عودت',
  mileageOut: 'کارکرد تحویل', fuelOut: 'سوخت تحویل', fuelIn: 'سوخت عودت', requesterId: 'درخواست‌دهنده',
  supplierId: 'تأمین‌کننده', nationalId: 'کد ملی', birthYear: 'سال تولد',
  address: 'نشانی', email: 'ایمیل', relatedRef: 'مرجع مربوط', createdBy: 'ایجادکننده', completedAt: 'تاریخ تکمیل',
};

/** فیلدهای مبلغی (نمایش با فرمت تومان) */
const MONEY_FIELDS = new Set([
  'purchasePrice', 'salePrice', 'price', 'commission', 'laborRate', 'dailyRate',
  'deposit', 'paidAmount', 'vehiclePrice', 'downPayment', 'monthlyPayment',
  'amount', 'balance',
]);

/** فیلدهای تاریخی (نمایش شمسی) */
const DATE_FIELDS = new Set([
  'purchaseDate', 'saleDate', 'deliveryDate', 'receivedAt', 'startDate', 'endDate',
  'createdAt', 'date', 'insuranceExpiry', 'inspectionExpiry', 'completedAt',
]);

const STATUS_LABELS: Record<string, Record<string, string>> = {
  status: vehicleStatusLabels as Record<string, string>,
};

/** برچسب وضعیت بر اساس فیلد و مقدار — بهترین تطبیق */
function statusLabel(field: string, value: string): string {
  const maps = [vehicleStatusLabels, dealStatusLabels, woStatusLabels, rentalStatusLabels, insStatusLabels, purchaseStatusLabels, segmentLabels];
  if (field === 'segment') return segmentLabels[value] || value;
  if (field === 'status') {
    for (const m of maps) if (m[value]) return m[value];
  }
  return value;
}

function fmt(field: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (DATE_FIELDS.has(field)) return jdate(String(value));
  if (MONEY_FIELDS.has(field) && typeof value === 'number') return money(value);
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
  if (typeof value === 'object') return '—';
  if (typeof value === 'string' && (field === 'status' || field === 'segment')) return statusLabel(field, value);
  return String(value);
}

interface Preset {
  label: string; dataset: DatasetKey; columns: string[]; groupBy?: string;
}

type Row = { id: string } & Record<string, unknown>;

const PRESETS: Preset[] = [
  { label: 'خودروهای ناوگان و قیمت‌ها', dataset: 'vehicles', columns: ['brand', 'model', 'year', 'status', 'purchasePrice', 'salePrice'], groupBy: 'status' },
  { label: 'تراکنش‌های مالی به تفکیک واحد', dataset: 'transactions', columns: ['date', 'type', 'division', 'category', 'amount', 'description'], groupBy: 'division' },
  { label: 'اجاره‌ها و وضعیت عودت', dataset: 'rentals', columns: ['code', 'vehicleId', 'startDate', 'endDate', 'dailyRate', 'status'], groupBy: 'status' },
  { label: 'قطعات و موجودی انبار', dataset: 'parts', columns: ['code', 'name', 'category', 'quantity', 'minQuantity', 'purchasePrice'], groupBy: 'category' },
  { label: 'سفارش‌های کار تعمیرگاه', dataset: 'workOrders', columns: ['code', 'type', 'status', 'laborHours', 'receivedAt'], groupBy: 'status' },
];

const CHART_COLORS = ['#d97706', '#059669', '#3b6fa0', '#e11d48', '#7c3aed', '#0d9488', '#f59e0b', '#64748b'];

export default function ReportBuilderView() {
  const [dataset, setDataset] = useState<DatasetKey>('vehicles');
  const [q, setQ] = useState('');
  const [statusCol, setStatusCol] = useState('status');
  const [statusVal, setStatusVal] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [sumField, setSumField] = useState('none');
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [printOpen, setPrintOpen] = useState(false);

  const veh = useEntity<Row>('vehicles');
  const cus = useEntity<Row>('customers');
  const dea = useEntity<Row>('deals');
  const wor = useEntity<Row>('workOrders');
  const ren = useEntity<Row>('rentals');
  const ins = useEntity<Row>('installments');
  const par = useEntity<Row>('parts');
  const tra = useEntity<Row>('transactions');
  const pur = useEntity<Row>('purchaseRequests');
  const sup = useEntity<Row>('suppliers');
  const emp = useEntity<Row>('employees');

  const hooks: Record<DatasetKey, ReturnType<typeof useEntity<Row>>> = {
    vehicles: veh, customers: cus, deals: dea, workOrders: wor, rentals: ren,
    installments: ins, parts: par, transactions: tra, purchaseRequests: pur,
    suppliers: sup, employees: emp,
  };

  const { items, loading } = hooks[dataset];

  // ستون‌های موجود دیتاست (از اولین رکورد یا مقصد پرکاربرد)
  const columns = useMemo(() => {
    const sample = items[0] || {};
    const skip = new Set(['id', 'costs', 'schedule', 'followUps', 'movements', 'logs', 'stages', 'quotes', 'approvals', 'damages', 'fines', 'items', 'tags', 'permissions', 'qualityCheck', 'parts', 'insuranceExpiry', 'inspectionExpiry']);
    const keys = Object.keys(sample).filter(k => !skip.has(k));
    // ترتیب بهتر: کد/نام/وضعیت اول
    const priority = ['code', 'brand', 'model', 'name', 'fullName', 'firstName', 'title', 'description', 'status', 'type', 'segment', 'date', 'createdAt'];
    return keys.sort((a, b) => {
      const ia = priority.indexOf(a), ib = priority.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });
  }, [items]);

  // وقتی دیتاست عوض شد، ستون‌های پیش‌فرض انتخاب شود
  function switchDataset(ds: DatasetKey) {
    setDataset(ds);
    setStatusVal('all');
    setGroupBy('none');
    setSumField('none');
    setSortCol('');
    // ستون‌های پیش‌فرض: تا ۶ ستون اول
    const sample = hooks[ds].items[0] || {};
    const skip = new Set(['id', 'costs', 'schedule', 'followUps', 'movements', 'logs', 'stages', 'quotes', 'approvals', 'damages', 'fines', 'items', 'tags', 'permissions', 'qualityCheck', 'parts']);
    setSelectedCols(Object.keys(sample).filter(k => !skip.has(k)).slice(0, 6));
  }

  // اگر ستون‌های انتخابی با دیتاست نمی‌خوانند
  const effectiveCols = useMemo(
    () => (selectedCols.length ? selectedCols.filter(c => columns.includes(c)) : columns.slice(0, 6)),
    [selectedCols, columns],
  );

  // مقادیر یکتا برای فیلتر وضعیت
  const statusValues = useMemo(() => {
    if (!statusCol || !columns.includes(statusCol)) return [];
    return Array.from(new Set(items.map(i => String(i[statusCol] ?? '')))).filter(v => v && v !== 'undefined').sort();
  }, [items, statusCol, columns]);

  const filtered = useMemo(() => items.filter(row => {
    const hay = effectiveCols.map(c => fmt(c, row[c])).join(' ');
    if (q && !hay.includes(q)) return false;
    if (statusCol && statusVal !== 'all' && String(row[statusCol] ?? '') !== statusVal) return false;
    return true;
  }), [items, effectiveCols, q, statusCol, statusVal]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      const sa = String(va ?? ''), sb = String(vb ?? '');
      return sortAsc ? sa.localeCompare(sb, 'fa') : sb.localeCompare(sa, 'fa');
    });
    return arr;
  }, [filtered, sortCol, sortAsc]);

  // گروه‌بندی + تجمیع
  const groups = useMemo(() => {
    if (groupBy === 'none') return [];
    const map = new Map<string, { count: number; sum: number }>();
    for (const row of filtered) {
      const key = fmt(groupBy, row[groupBy]);
      const g = map.get(key) || { count: 0, sum: 0 };
      g.count += 1;
      if (sumField !== 'none' && typeof row[sumField] === 'number') g.sum += row[sumField] as number;
      map.set(key, g);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, groupBy, sumField]);

  function toggleCol(c: string) {
    setSelectedCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function applyPreset(p: Preset) {
    setDataset(p.dataset);
    setStatusVal('all');
    setGroupBy(p.groupBy || 'none');
    setSumField('none');
    setSortCol('');
    setSelectedCols(p.columns);
  }

  function exportCSV() {
    const header = effectiveCols.map(c => FIELD_LABELS[c] || c).join(',');
    const rows = sorted.map(r => effectiveCols.map(c => {
      const v = fmt(c, r[c]);
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','));
    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const numericFields = columns.filter(c => items.length > 0 && typeof items[0][c] === 'number' && !DATE_FIELDS.has(c) && c !== 'year');
  const datasetLabel = DATASETS.find(d => d.key === dataset)?.label || dataset;

  return (
    <div className="view-enter">
      <PageHeader
        title="گزارش‌ساز پیشرفته"
        description="دیتاست را انتخاب کنید، ستون‌ها و فیلترها را تعیین کنید، گروه‌بندی و تجمیع ببینید و خروجی CSV یا چاپ بگیرید"
      />

      {/* گزارش‌های آماده */}
      <SectionCard title="گزارش‌های آماده" description="یک کلیک — پرکاربردترین گزارش‌های مجموعه" className="mb-5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" /> {p.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* پیکربندی */}
      <SectionCard title="پیکربندی گزارش" description="دیتاست، ستون‌ها، فیلتر، گروه‌بندی و مرتب‌سازی" className="mb-5">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>منبع داده</Label>
              <Select value={dataset} onValueChange={v => switchDataset(v as DatasetKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATASETS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>فیلتر وضعیت</Label>
              {statusValues.length > 0 ? (
                <div className="flex gap-2">
                  <Select value={statusCol} onValueChange={v => { setStatusCol(v); setStatusVal('all'); }}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{FIELD_LABELS[c] || c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={statusVal} onValueChange={setStatusVal}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه</SelectItem>
                      {statusValues.map(v => <SelectItem key={v} value={v}>{fmt(statusCol, v)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : <div className="h-9 rounded-md bg-muted/50" />}
            </div>
            <div className="space-y-1.5">
              <Label>گروه‌بندی بر اساس</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون گروه‌بندی</SelectItem>
                  {columns.map(c => <SelectItem key={c} value={c}>{FIELD_LABELS[c] || c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تجمیع عددی گروه</Label>
              <Select value={sumField} onValueChange={setSumField} disabled={groupBy === 'none'}>
                <SelectTrigger><SelectValue placeholder="فقط شمارش" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">فقط شمارش</SelectItem>
                  {numericFields.map(c => <SelectItem key={c} value={c}>مجموع {FIELD_LABELS[c] || c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* انتخاب ستون‌ها */}
          <div>
            <Label className="mb-2 block">ستون‌های گزارش ({faNumber(effectiveCols.length)} انتخاب شده)</Label>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(c => (
                <label
                  key={c}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                    effectiveCols.includes(c)
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Checkbox checked={effectiveCols.includes(c)} onCheckedChange={() => toggleCol(c)} />
                  {FIELD_LABELS[c] || c}
                </label>
              ))}
            </div>
          </div>

          {/* جستجو و مرتب‌سازی */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو در نتایج..." className="ps-8" />
            </div>
            <Select value={sortCol || 'none'} onValueChange={v => setSortCol(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="مرتب‌سازی" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون مرتب‌سازی</SelectItem>
                {columns.map(c => <SelectItem key={c} value={c}>{FIELD_LABELS[c] || c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-1.5" disabled={!sortCol} onClick={() => setSortAsc(a => !a)}>
              <ArrowUpDown className="h-4 w-4" /> {sortCol ? (sortAsc ? 'صعودی' : 'نزولی') : 'مرتب‌سازی غیرفعال'}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* نمودار گروه‌بندی */}
      {groupBy !== 'none' && groups.length > 0 && (
        <SectionCard
          title={`نمودار گروه‌بندی: ${FIELD_LABELS[groupBy] || groupBy}`}
          description={sumField !== 'none' ? `مجموع ${FIELD_LABELS[sumField] || sumField} در هر گروه` : 'تعداد رکورد در هر گروه'}
          className="mb-5"
        >
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groups.slice(0, 8)} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Vazirmatn', fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} interval={0} angle={-15} height={44} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={(v: number) => sumField !== 'none' ? `${Math.round(v / 1e6)}M` : `${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, fontSize: 12, fontFamily: 'Vazirmatn' }}
                  formatter={(v: number) => (sumField !== 'none' ? moneyShort(v) : faNumber(v))}
                />
                <Bar dataKey={sumField !== 'none' ? 'sum' : 'count'} fill="url(#gBar)" radius={[6, 6, 0, 0]} maxBarSize={46}>
                  {groups.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* جدول گروه‌ها */}
          <div className="mt-3 max-h-40 overflow-y-auto">
            <table className="erp-table w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-right py-2">گروه</th>
                  <th className="text-right py-2">تعداد</th>
                  {sumField !== 'none' && <th className="text-right py-2">مجموع {FIELD_LABELS[sumField] || sumField}</th>}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.name} className="border-b last:border-0">
                    <td className="py-2 font-medium">{g.name}</td>
                    <td className="py-2 ltr-num">{faNumber(g.count)}</td>
                    {sumField !== 'none' && <td className="py-2 font-bold ltr-num">{moneyShort(g.sum)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* نتایج */}
      <SectionCard
        title={`نتایج: ${datasetLabel}`}
        description={`${faNumber(sorted.length)} رکورد از ${faNumber(items.length)} رکورد کل`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV} disabled={sorted.length === 0}>
              <Download className="h-3.5 w-3.5" /> خروجی CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPrintOpen(true)} disabled={sorted.length === 0}>
              <Printer className="h-3.5 w-3.5" /> چاپ گزارش
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">رکوردی مطابق فیلترها یافت نشد</div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="max-h-[420px] overflow-auto">
              <table className="erp-table w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b bg-muted/50">
                    <th className="text-right py-2.5 px-3 w-10">#</th>
                    {effectiveCols.map(c => (
                      <th key={c} className="text-right py-2.5 px-3 whitespace-nowrap">
                        {FIELD_LABELS[c] || c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 200).map((row, i) => (
                    <tr key={String(row.id ?? i)} className="border-b last:border-0 hover:bg-accent/40 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground ltr-num">{faNumber(i + 1)}</td>
                      {effectiveCols.map(c => (
                        <td key={c} className={`py-2 px-3 ${MONEY_FIELDS.has(c) ? 'font-medium ltr-num' : ''}`}>{fmt(c, row[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length > 200 && (
              <div className="border-t bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground text-center">
                نمایش ۲۰۰ رکورد اول از {faNumber(sorted.length)} — برای مشاهده کامل، خروجی CSV بگیرید
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* پیش‌نمایش چاپ */}
      {printOpen && createPortal(
        <div className="print-overlay fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="mx-auto my-6 max-w-4xl rounded-xl bg-white text-zinc-900 shadow-2xl print-doc-root">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <div className="text-lg font-extrabold">گزارش {datasetLabel}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{jdate(new Date().toISOString())} — {faNumber(sorted.length)} رکورد</div>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button size="sm" className="gap-1.5" onClick={() => window.print()}><Printer className="h-4 w-4" /> چاپ</Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPrintOpen(false)}><X className="h-4 w-4" /> بستن</Button>
              </div>
            </div>
            <div className="p-6">
              {groupBy !== 'none' && groups.length > 0 && (
                <div className="mb-5">
                  <div className="text-sm font-bold mb-2 flex items-center gap-1.5"><Layers className="h-4 w-4" /> خلاصه گروه‌ها ({FIELD_LABELS[groupBy] || groupBy})</div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>{['گروه', 'تعداد', ...(sumField !== 'none' ? ['مجموع'] : [])].map(h => <th key={h} className="border px-2 py-1.5 text-right bg-zinc-50">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {groups.map(g => (
                        <tr key={g.name}>
                          <td className="border px-2 py-1.5">{g.name}</td>
                          <td className="border px-2 py-1.5">{faNumber(g.count)}</td>
                          {sumField !== 'none' && <td className="border px-2 py-1.5">{money(g.sum)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="text-sm font-bold mb-2 flex items-center gap-1.5"><Table2 className="h-4 w-4" /> جزئیات رکوردها</div>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr>
                    <th className="border px-2 py-1.5 text-right bg-zinc-50 w-8">#</th>
                    {effectiveCols.map(c => <th key={c} className="border px-2 py-1.5 text-right bg-zinc-50 whitespace-nowrap">{FIELD_LABELS[c] || c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.slice(0, 300).map((row, i) => (
                    <tr key={String(row.id ?? i)}>
                      <td className="border px-2 py-1.5 text-zinc-500">{faNumber(i + 1)}</td>
                      {effectiveCols.map(c => <td key={c} className="border px-2 py-1.5">{fmt(c, row[c])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-400">
                <span>سامانه جامع مدیریت مجموعه خودرویی — گزارش‌ساز</span>
                <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {faNumber(sorted.length)} رکورد</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
        راهنما: برای گزارش دلخواه، دیتاست و ستون‌ها را انتخاب کنید؛ با «گروه‌بندی» نمودار تعاملی می‌گیرید و با CSV/چاپ خروجی می‌دهید.
        <StatusPill label="بدون نیاز به دیتابیس" />
      </div>
    </div>
  );
}
