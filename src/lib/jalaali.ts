// ─── تبدیل تقویم میلادی ↔ شمسی (الگوریتم جلالی — بدون وابستگی خارجی) ┘──
// بر اساس الگوریتم استاندارد jalaali.js (Khayyam / Borkowski)

export interface JalaliDate {
  jy: number; // سال شمسی
  jm: number; // ماه (۱..۱۲)
  jd: number; // روز (۱..۳۱)
}

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const JALALI_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function div(a: number, b: number): number {
  return ~~(a / b);
}

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1748];
  let jump = 0, leap = 0, n = 0, i = 0;
  let bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];

  for (i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = ((((n + 1) % 33) - 1) % 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number): number {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * ((gm + 9) % 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div((j % 1461) / 4, 1) * 5 + 308;
  const gd = div((i % 153) / 5, 1) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      const jm = 1 + div(k, 31);
      const jd = (k % 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  const jm = 7 + div(k, 30);
  const jd = (k % 30) + 1;
  return { jy, jm, jd };
}

export function isLeapJalaliYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/** تاریخ میلادی (Date) → شمسی */
export function toJalaali(date: Date): JalaliDate {
  return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

/** شمسی → میلادی (Date — ساعت ۱۲ ظهر برای جلوگیری از مشکلات منطقه زمانی) */
export function toGregorian(jy: number, jm: number, jd: number): Date {
  const g = d2g(j2d(jy, jm, jd));
  return new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0, 0);
}

/** رشته تاریخ (ISO یا yyyy-MM-dd) → شمسی */
export function parseJalaali(value: string): JalaliDate | null {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return toJalaali(d);
}

/** قالب نمایشی شمسی: ۱۴۰۴/۰۷/۰۲ */
export function formatJalali(value: string | Date | undefined | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  const j = toJalaali(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return toFaDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`);
}

/** قالب کامل با نام ماه: ۲ مهر ۱۴۰۴ */
export function formatJalaliLong(value: string | Date | undefined | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  const j = toJalaali(d);
  return toFaDigits(`${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`);
}

/** تبدیل ارقام لاتین به فارسی */
export function toFaDigits(s: string | number): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(s).replace(/[0-9]/g, d => fa[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toEnDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/**
 * رشته تاریخ ورودی فرم (yyyy-MM-dd از تقویم شمسی) → ISO کامل برای ذخیره
 * ورودی "1404-07-02" (شمسی) را به Date میلادی معادل تبدیل می‌کند.
 */
export function jalaliInputToISO(jalaliYmd: string): string {
  const [jy, jm, jd] = jalaliYmd.split('-').map(Number);
  if (!jy || !jm || !jd) return jalaliYmd; // احتمالاً خودش ISO است
  return toGregorian(jy, jm, jd).toISOString();
}

/** ISO → رشته ورودی فرم شمسی (yyyy-MM-dd شمسی) */
export function isoToJalaliInput(value: string | undefined | null): string {
  if (!value) return '';
  const j = parseJalaali(value);
  if (!j) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${j.jy}-${pad(j.jm)}-${pad(j.jd)}`;
}

/** اختلاف روز از امروز (مثبت = آینده، منفی = گذشته) */
export function daysFromToday(value: string): number {
  const d = new Date(value);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
