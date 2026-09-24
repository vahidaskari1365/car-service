'use client';

// ─── اسناد چاپی: فاکتور تعمیرگاه، قرارداد اجاره، قرارداد اقساط، قبض فروش ───
import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { COMPANY } from '@/lib/company';
import { numberToFaWords } from '@/lib/fa-words';
import { money, faNumber } from '@/lib/erp-utils';
import { formatJalaliLong, toFaDigits } from '@/lib/jalaali';
import type { WorkOrder, Rental, InstallmentContract, Vehicle, Customer, Deal, Part } from '@/lib/erp-types';

// ─── ابزارهای مشترک سند ───

function DocHeader({ docTitle, docCode, docDate }: { docTitle: string; docCode: string; docDate: string }) {
  return (
    <div className="border-b-2 border-zinc-800 pb-3 mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 flex items-center justify-center text-xl font-black">ع</div>
        <div>
          <div className="text-base font-black text-zinc-900">{COMPANY.name}</div>
          <div className="text-[10px] text-zinc-600 mt-0.5">{COMPANY.tagline}</div>
          <div className="text-[10px] text-zinc-600 mt-0.5">{COMPANY.address}</div>
          <div className="text-[10px] text-zinc-600">تلفن: {COMPANY.phone} · شناسه ملی: {COMPANY.economicCode}</div>
        </div>
      </div>
      <div className="text-left shrink-0">
        <div className="text-sm font-black text-zinc-900 border-2 border-zinc-800 rounded-md px-3 py-1.5">{docTitle}</div>
        <div className="text-[11px] text-zinc-700 mt-1.5">شماره: <b>{docCode}</b></div>
        <div className="text-[11px] text-zinc-700">تاریخ: <b>{docDate}</b></div>
      </div>
    </div>
  );
}

function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-0 border border-zinc-400 rounded-md overflow-hidden mb-4">
      {items.map((it, i) => (
        <div key={i} className={`flex items-stretch ${i >= 2 ? 'border-t border-zinc-400' : ''} ${i % 2 === 1 ? 'border-s border-zinc-400' : ''}`}>
          <div className="bg-zinc-100 px-2.5 py-1.5 text-[11px] font-bold text-zinc-700 w-32 shrink-0 border-e border-zinc-400">{it.label}</div>
          <div className="px-2.5 py-1.5 text-[11px] text-zinc-900 flex-1">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function PrintTable({ head, rows, foot }: { head: string[]; rows: ReactNode[][]; foot?: ReactNode }) {
  return (
    <table className="w-full border-collapse text-[11px] mb-3">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={i} className="border border-zinc-500 bg-zinc-100 px-2 py-1.5 font-bold text-zinc-800 text-right">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={head.length} className="border border-zinc-400 px-2 py-2 text-center text-zinc-500">موردی ثبت نشده است</td></tr>
        )}
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border border-zinc-400 px-2 py-1.5 text-zinc-900">{cell}</td>
            ))}
          </tr>
        ))}
        {foot}
      </tbody>
    </table>
  );
}

function Clauses({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-black text-zinc-900 mb-1.5">{title}</div>
      <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-700 leading-5 pr-1">
        {items.map((c, i) => <li key={i}>{c}</li>)}
      </ol>
    </div>
  );
}

function Signatures({ left = 'مهر و امضای فروشنده / مجموعه', right = 'مهر و امضای خریدار / مشتری' }: { left?: string; right?: string }) {
  return (
    <div className="grid grid-cols-2 gap-6 mt-6 mb-4">
      <div className="text-center">
        <div className="text-[11px] font-bold text-zinc-700 pb-8 border-b border-zinc-500 mb-1">{left}</div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-bold text-zinc-700 pb-8 border-b border-zinc-500 mb-1">{right}</div>
      </div>
    </div>
  );
}

function DocFooter({ note }: { note?: string }) {
  return (
    <div className="border-t border-zinc-400 pt-2 mt-2 text-[9px] text-zinc-500 text-center leading-4">
      {note || `این سند به‌صورت خودکار توسط ${COMPANY.name} — سامانه جامع مدیریت مجموعه خودرویی صادر شده است.`}
      <br />تاریخ چاپ: {formatJalaliLong(new Date())}
    </div>
  );
}

const vTitle = (v?: Vehicle) => (v ? `${v.brand} ${v.model} — سال ${toFaDigits(v.year)} — ${v.color}` : '—');
const cTitle = (c?: Customer) => (c ? `${c.firstName} ${c.lastName}${c.type === 'company' ? ' (شرکت)' : ''}` : '—');
const cPhone = (c?: Customer) => c?.phone || '—';
const cNational = (c?: Customer) => c?.nationalId || '—';

// ═══ ۱) فاکتور تعمیرگاه و خدمات فنی ═══

export function WorkshopInvoiceDoc({ wo, vehicle, customer, parts }: {
  wo: WorkOrder; vehicle?: Vehicle; customer?: Customer; parts: Part[];
}) {
  const labor = wo.laborHours * wo.laborRate;
  const partsTotal = wo.parts.reduce((s, p) => s + p.qty * p.unitPrice, 0);
  const total = labor + partsTotal;

  return (
    <div className="doc-body">
      <DocHeader docTitle="فاکتور خدمات فنی" docCode={wo.code} docDate={formatJalaliLong(wo.receivedAt)} />
      <InfoGrid items={[
        { label: 'خودرو', value: vTitle(vehicle) },
        { label: 'شماره شاسی', value: vehicle?.vin || '—' },
        { label: 'پلاک', value: vehicle?.plate || '—' },
        { label: 'کیلومتر', value: vehicle ? faNumber(vehicle.mileage) + ' کیلومتر' : '—' },
        { label: 'مشتری', value: cTitle(customer) },
        { label: 'تلفن مشتری', value: cPhone(customer) },
        { label: 'نوع خدمت', value: { mechanic: 'مکانیکی', body_paint: 'صافکاری و نقاشی', inspection: 'کارشناسی', preparation: 'آماده‌سازی', electrical: 'برق و الکترونیک' }[wo.type] || '—' },
        { label: 'تکنسین مسئول', value: wo.technicianId ? 'تکنسین مجموعه' : '—' },
      ]} />

      <div className="border border-zinc-400 rounded-md p-2.5 mb-3 text-[11px]">
        <b className="text-zinc-700">شرح مشکل (از زبان مشتری):</b> {wo.complaint}
        {wo.diagnosis && <><br /><b className="text-zinc-700">تشخیص فنی:</b> {wo.diagnosis}</>}
      </div>

      <PrintTable
        head={['ردیف', 'شرح خدمات / قطعات', 'تعداد', 'فی (تومان)', 'مبلغ (تومان)']}
        rows={[
          ...wo.parts.map((p, i) => {
            const pt = parts.find(x => x.id === p.partId);
            return [
              toFaDigits(i + 1),
              `${pt?.name || 'قطعه'}${pt?.code ? ` (${pt.code})` : ''}`,
              toFaDigits(p.qty),
              money(p.unitPrice),
              money(p.qty * p.unitPrice),
            ];
          }),
          [
            toFaDigits(wo.parts.length + 1),
            `دستمزد فنی — ${toFaDigits(wo.laborHours)} ساعت کار × ${money(wo.laborRate)}`,
            toFaDigits(wo.laborHours),
            money(wo.laborRate),
            money(labor),
          ],
        ]}
        foot={
          <tr className="bg-zinc-100">
            <td colSpan={4} className="border border-zinc-500 px-2 py-2 font-black text-left">جمع کل فاکتور</td>
            <td className="border border-zinc-500 px-2 py-2 font-black">{money(total)}</td>
          </tr>
        }
      />

      <div className="rounded-md bg-zinc-50 border border-zinc-300 p-2.5 text-[11px] mb-3 leading-5">
        <b>مبلغ به حروف:</b> {numberToFaWords(total)}
        {wo.completedAt && <div className="mt-0.5"><b>تاریخ تحویل خودرو:</b> {formatJalaliLong(wo.completedAt)}</div>}
      </div>

      <p className="text-[10px] text-zinc-600 mb-2 leading-5">
        ضمانت خدمات فنی این مجموعه ۳ ماه یا ۵٬۰۰۰ کیلومتر برای قطعات تعویضی و ۱۰ روز برای همان عیب است. قطعات مصرفی مشمول ضمانت نمایندگی قطعه می‌باشد.
      </p>
      <Signatures left="مهر و امضای تعمیرگاه" right="امضای مشتری (تحویل‌گیرنده)" />
      <DocFooter />
    </div>
  );
}

// ═══ ۲) قرارداد اجاره خودرو ═══

export function RentalContractDoc({ rental, vehicle, customer }: {
  rental: Rental; vehicle?: Vehicle; customer?: Customer;
}) {
  const fuelLabels: Record<string, string> = { full: 'پر', half: 'نصف', empty: 'خالی' };
  return (
    <div className="doc-body">
      <DocHeader docTitle="قرارداد اجاره خودرو" docCode={rental.code} docDate={formatJalaliLong(rental.startDate)} />
      <InfoGrid items={[
        { label: 'مستأجر (مشتری)', value: cTitle(customer) },
        { label: 'شماره تماس', value: cPhone(customer) },
        { label: 'کد ملی', value: cNational(customer) },
        { label: 'شماره قرارداد', value: rental.code },
        { label: 'خودرو', value: vTitle(vehicle) },
        { label: 'شماره پلاک', value: vehicle?.plate || '—' },
        { label: 'شماره شاسی (VIN)', value: vehicle?.vin || '—' },
        { label: 'کیلومتر هنگام تحویل', value: faNumber(rental.mileageOut) },
      ]} />

      <PrintTable
        head={['از تاریخ', 'تا تاریخ', 'نرخ روزانه', 'ودیعه', 'سوخت هنگام تحویل', 'وضعیت']}
        rows={[[
          formatJalaliLong(rental.startDate),
          formatJalaliLong(rental.endDate),
          money(rental.dailyRate),
          money(rental.deposit),
          fuelLabels[rental.fuelOut] || '—',
          { reserved: 'رزرو شده', active: 'در اجاره', returned: 'عودت شده', overdue: 'تأخیر در عودت', cancelled: 'لغو شده' }[rental.status] || '—',
        ]]}
      />

      <Clauses title="شرایط قرارداد" items={[
        `موجر (اجاره‌دهنده) خودروی مشخّص در جدول فوق را به مدت مندرج در قرارداد در قبال نرخ روزانه ${money(rental.dailyRate)} به مستأجر اجاره داد.`,
        'مستأجر متعهد است خودرو را در موعد مقرر با مخزن پر، نظافت شده و همراه با تمام مدارک عودت دهد؛ هر روز تأخیر عودت، معادل نرخ روزانه به‌علاوه ۲۰٪ جریمه محاسبه و از ودیعه کسر می‌شود.',
        'سقف کیلومتر مجاز روزانه ۲۰۰ کیلومتر است؛ هر کیلومتر مازاد طبق تعرفه مجموعه محاسبه می‌شود.',
        'کلیه جرائم رانندگی، خسارات بدنه و مکانیکی ناشی از تصادف یا بی‌احتیاطی و هزینه جرائم راهور در دوره اجاره بر عهده مستأجر است.',
        'خودرو باید فقط توسط راننده اعلام‌شده در قرارداد رانده شود و واگذاری به غیر بدون موافقت کتبی موجر ممنوع است.',
        'ودیعه به‌عنوان وثیقه انجام تعهدات مستأجر است و پس از عودت سالم خودرو، تسویه کرایه و عدم وصول جرائم، مسترد می‌شود.',
        'این قرارداد در ۷ ماده تنظیم و پس از امضای طرفین لازم‌الاجرا است و هرگونه اختلاف در مرجع رسیدگی قضایی تهران مطرح می‌شود.',
      ]} />

      {rental.damages.length > 0 && (
        <PrintTable
          head={['خسارت ثبت‌شده', 'مبلغ']}
          rows={rental.damages.map(d => [d.title, money(d.amount)])}
        />
      )}

      <div className="rounded-md bg-zinc-50 border border-zinc-300 p-2.5 text-[11px] mb-2 leading-5">
        <b>ودیعه به حروف:</b> {numberToFaWords(rental.deposit)}
      </div>

      <Signatures left="مهر و امضای موجر" right="امضای مستأجر" />
      <DocFooter note="این قرارداد دو برگ دارد و هر برگ دارای اعتبار یکسان است." />
    </div>
  );
}

// ═══ ۳) قرارداد فروش اقساطی ═══

export function InstallmentContractDoc({ contract, vehicle, customer }: {
  contract: InstallmentContract; vehicle?: Vehicle; customer?: Customer;
}) {
  const remaining = contract.vehiclePrice - contract.downPayment;
  return (
    <div className="doc-body">
      <DocHeader docTitle="قرارداد فروش اقساطی" docCode={contract.code} docDate={formatJalaliLong(contract.startDate)} />
      <InfoGrid items={[
        { label: 'خریدار (مشتری)', value: cTitle(customer) },
        { label: 'شماره تماس', value: cPhone(customer) },
        { label: 'کد ملی', value: cNational(customer) },
        { label: 'ضامن', value: contract.guarantor || '—' },
        { label: 'خودرو', value: vTitle(vehicle) },
        { label: 'شماره شاسی (VIN)', value: vehicle?.vin || '—' },
        { label: 'پلاک', value: vehicle?.plate || '—' },
        { label: 'امتیاز اعتباری', value: contract.creditScore !== undefined ? `${toFaDigits(contract.creditScore)} از ۱۰۰` : '—' },
      ]} />

      <PrintTable
        head={['قیمت کل خودرو', 'پیش‌پرداخت (بیعانه)', 'مانده اقساطی', 'تعداد اقساط', 'مبلغ هر قسط', 'سود سالانه']}
        rows={[[
          money(contract.vehiclePrice),
          money(contract.downPayment),
          money(remaining),
          toFaDigits(contract.months) + ' قسط',
          money(contract.monthlyPayment),
          toFaDigits(contract.interestRate) + '٪',
        ]]}
      />

      <Clauses title="شرایط قرارداد" items={[
        `مانده بهای خودرو معادل ${money(remaining)} (${numberToFaWords(remaining)}) به‌صورت ${toFaDigits(contract.months)} قسط ماهانه طبق جدول پیوست تسویه می‌شود.`,
        'پیش‌پرداخت هنگام امضای این قرارداد دریافت شد و رسید جداگانه صادر گردید.',
        'چنانچه هر قسط بیش از ۱۰ روز از سررسید تأخیر شود، جریمه دیرکرد ۰/۵ درصد روزانه بر مبلغ قسط معوق تعلق می‌گیرد.',
        'سند و مدارک خودرو تا تسویه کامل مانده نزد فروشنده به‌عنوان وثیقه باقی می‌ماند.',
        'انتقال یا فروش خودرو به غیر پیش از تسویه کامل، منوط به موافقت کتبی و تسویه مانده است.',
        'ضامن مندرج در قرارداد، مسئولیت تضامنی پرداخت کامل اقساط را می‌پذیرد.',
        'این قرارداد در ۷ ماده و جدول اقساط پیوست، تنظیم و برای طرفین لازم‌الاجرا است.',
      ]} />

      <div className="text-xs font-black text-zinc-900 mb-1.5">جدول سررسید اقساط</div>
      <PrintTable
        head={['قسط', 'سررسید', 'مبلغ (تومان)', 'وضعیت', 'تاریخ پرداخت']}
        rows={contract.schedule.map(s => [
          toFaDigits(s.no),
          formatJalaliLong(s.dueDate),
          money(s.amount),
          s.status === 'paid' ? 'پرداخت‌شده' : s.status === 'late' ? 'معوق' : 'در انتظار',
          s.paidDate ? formatJalaliLong(s.paidDate) : '—',
        ])}
        foot={
          <tr className="bg-zinc-100">
            <td colSpan={2} className="border border-zinc-500 px-2 py-2 font-black text-left">جمع کل اقساط</td>
            <td colSpan={3} className="border border-zinc-500 px-2 py-2 font-black">{money(contract.monthlyPayment * contract.months)}</td>
          </tr>
        }
      />

      <Signatures left="مهر و امضای فروشنده" right="امضای خریدار و ضامن" />
      <DocFooter note="این قرارداد دو برگ دارد و هر برگ دارای اعتبار یکسان است." />
    </div>
  );
}

// ═══ ۴) قبض فروش خودرو (صورت‌حساب فروش) ═══

export function SaleBillDoc({ deal, vehicle, customer, agentName }: {
  deal: Deal; vehicle?: Vehicle; customer?: Customer; agentName?: string;
}) {
  const total = deal.price + (deal.commission || 0);
  const isSale = deal.type === 'sale';
  return (
    <div className="doc-body">
      <DocHeader
        docTitle={isSale ? 'قبض فروش خودرو' : 'قبض خرید خودرو'}
        docCode={deal.code}
        docDate={formatJalaliLong(deal.date)}
      />
      <InfoGrid items={[
        { label: isSale ? 'خریدار (مشتری)' : 'فروشنده (مشتری)', value: cTitle(customer) },
        { label: 'شماره تماس', value: cPhone(customer) },
        { label: 'کد ملی', value: cNational(customer) },
        { label: 'کارشناس فروش', value: agentName || '—' },
        { label: 'خودرو', value: vTitle(vehicle) },
        { label: 'شماره شاسی (VIN)', value: vehicle?.vin || '—' },
        { label: 'پلاک', value: vehicle?.plate || '—' },
        { label: 'کارکرد', value: vehicle ? faNumber(vehicle.mileage) + ' کیلومتر' : '—' },
      ]} />

      <PrintTable
        head={['ردیف', 'شرح', 'مبلغ (تومان)']}
        rows={[
          [toFaDigits(1), `${isSale ? 'فروش' : 'خرید'} خودرو ${vTitle(vehicle)}`, money(deal.price)],
          ...(deal.commission ? [[toFaDigits(2), 'کمیسیون و کارمزد خدمات مجموعه', money(deal.commission)]] : []),
        ]}
        foot={
          <tr className="bg-zinc-100">
            <td colSpan={2} className="border border-zinc-500 px-2 py-2 font-black text-left">مبلغ نهایی {isSale ? 'قابل پرداخت خریدار' : 'قابل پرداخت به فروشنده'}</td>
            <td className="border border-zinc-500 px-2 py-2 font-black">{money(total)}</td>
          </tr>
        }
      />

      <div className="rounded-md bg-zinc-50 border border-zinc-300 p-2.5 text-[11px] mb-3 leading-5">
        <b>مبلغ به حروف:</b> {numberToFaWords(total)}
        {deal.deliveryDate && <div className="mt-0.5"><b>تاریخ تحویل:</b> {formatJalaliLong(deal.deliveryDate)}</div>}
      </div>

      <p className="text-[10px] text-zinc-600 mb-2 leading-5">
        فروشنده تعهد می‌نماید خودروی فوق سند رسمی و باز بدون اِینجمنس، تصادفِ ساختاری و سوابق مالکیت مشکوک داشته باشد. تحویل خودرو همراه با مدارک (سند، کارت، بیمه‌نامه، معاینه فنی) انجام شد و پس از تحویل، مسئولیت نگهداری و بیمه با خریدار است.
      </p>
      <Signatures left="مهر و امضای مجموعه (فروشنده)" right="امضای مشتری" />
      <DocFooter />
    </div>
  );
}

// ═══ دیالوگ پیش‌نمایش و چاپ (پورتال مستقیم به body — سازگار با CSS چاپ) ═══

export function PrintDocDialog({ open, onOpenChange, title, children }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; children: ReactNode;
}) {
  // بستن با Escape + قفل اسکرول بدنه
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="print-overlay fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="mx-auto my-5 w-full max-w-[820px] px-3">
        {/* نوار ابزار — فقط روی صفحه */}
        <div className="print:hidden sticky top-0 z-10 flex items-center gap-2 rounded-t-xl border border-b-0 border-zinc-300 bg-zinc-100 px-4 py-2.5">
          <div className="text-sm font-bold text-zinc-800">{title}</div>
          <div className="ms-auto flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1.5" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> چاپ / ذخیره PDF
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)} aria-label="بستن">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          className="print-doc-root rounded-b-xl rounded-t-none bg-white text-zinc-900 border border-zinc-300 shadow-2xl px-6 py-5"
          dir="rtl"
          style={{ fontFamily: "'Vazirmatn', Tahoma, sans-serif" }}
        >
          {children}
        </div>
        <div className="print:hidden h-6" />
      </div>
    </div>,
    document.body,
  );
}
