'use client';

// ─── تقویم شمسی (Date Picker) — بدون وابستگی خارجی ───
import { useMemo, useState } from 'react';
import { CalendarIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  toJalaali, toGregorian, jalaaliMonthLength, JALALI_MONTHS,
  formatJalali, toFaDigits, isoToJalaliInput, jalaliInputToISO,
} from '@/lib/jalaali';

interface Props {
  value: string;                       // ISO یا رشته خالی
  onChange: (iso: string) => void;     // خروجی همیشه ISO است
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function JalaliDatePicker({ value, onChange, placeholder = 'انتخاب تاریخ', className, disabled }: Props) {
  const [open, setOpen] = useState(false);

  // ماه جاری نمایش‌داده‌شده در تقویم
  const initial = value ? parseJalaliSafe(value) : toJalaali(new Date());
  const [view, setView] = useState<{ jy: number; jm: number }>({ jy: initial.jy, jm: initial.jm });

  const selected = useMemo(() => (value ? isoToJalaliInput(value) : ''), [value]);

  const grid = useMemo(() => {
    const monthLen = jalaaliMonthLength(view.jy, view.jm);
    const firstGreg = toGregorian(view.jy, view.jm, 1);
    // روز هفته: شنبه = ۰ (getDay یکشنبه=0، پس شنبه=6 → +1 % 7)
    const startWeekday = (firstGreg.getDay() + 1) % 7;
    const cells: ({ jd: number; current: boolean; date: Date } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= monthLen; d++) cells.push({ jd: d, current: true, date: toGregorian(view.jy, view.jm, d) });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const todayJ = toJalaali(new Date());

  function moveMonth(delta: number) {
    let jm = view.jm + delta;
    let jy = view.jy;
    if (jm > 12) { jm = 1; jy += 1; }
    if (jm < 1) { jm = 12; jy -= 1; }
    setView({ jy, jm });
  }

  function pick(cell: { jd: number; date: Date }) {
    onChange(cell.date.toISOString());
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) { const b = value ? parseJalaliSafe(value) : toJalaali(new Date()); setView({ jy: b.jy, jm: b.jm }); } }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-between font-normal h-9', !value && 'text-muted-foreground', className)}
        >
          <span className="flex items-center gap-1.5 truncate">
            <CalendarIcon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            {value ? formatJalali(value) : placeholder}
          </span>
          <ChevronRight className="h-3.5 w-3.5 opacity-50 rotate-90" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2.5" align="start" collisionPadding={8}>
        {/* سربرگ ماه و سال */}
        <div className="flex items-center justify-between mb-2">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveMonth(1)} aria-label="ماه بعد">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="text-sm font-bold text-center flex-1">{JALALI_MONTHS[view.jm - 1]} {toFaDigits(view.jy)}</div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveMonth(-1)} aria-label="ماه قبل">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        {/* روزهای هفته */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        {/* شبکه روزها */}
        <div className="grid grid-cols-7 gap-0.5">
          {grid.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const isToday = todayJ.jy === view.jy && todayJ.jm === view.jm && todayJ.jd === cell.jd;
            const isSelected = selected === `${view.jy}-${String(view.jm).padStart(2, '0')}-${String(cell.jd).padStart(2, '0')}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(cell)}
                className={cn(
                  'h-7 rounded-md text-[11px] transition-colors hover:bg-amber-100 hover:text-amber-900',
                  isToday && 'ring-1 ring-amber-400 font-bold',
                  isSelected && 'bg-amber-500 text-white font-bold hover:bg-amber-600 hover:text-white',
                )}
              >
                {toFaDigits(cell.jd)}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-700"
            onClick={() => { const now = new Date(); onChange(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString()); setOpen(false); }}
          >
            امروز
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { onChange(''); setOpen(false); }}>
              پاک کردن
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseJalaliSafe(v: string) {
  const d = new Date(v);
  if (!isNaN(d.getTime())) return toJalaali(d);
  // احتمالاً رشته شمسی yyyy-MM-dd
  const j = v.split('-').map(Number);
  if (j.length === 3 && j[0] > 1300 && j[0] < 1600) return { jy: j[0], jm: j[1], jd: j[2] };
  return toJalaali(new Date());
}

// تبدیل رشته شمسی فرم به ISO (برای جاهایی که مقدار خام شمسی ذخیره شده)
export { jalaliInputToISO };
