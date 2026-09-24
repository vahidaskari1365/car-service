// ─── تبدیل عدد به حروف فارسی (برای اسناد رسمی) ───

const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const scales = ['', ' هزار', ' میلیون', ' میلیارد'];

function threeDigitToWords(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(hundreds[h]);
  if (rest >= 10 && rest < 20) {
    parts.push(teens[rest - 10]);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (t > 1) parts.push(tens[t]);
    if (o > 0) parts.push(ones[o]);
  }
  return parts.filter(Boolean).join(' و ');
}

/** عدد تومان به حروف فارسی — مثال: «یک میلیارد و دویست و پنجاه میلیون تومان» */
export function numberToFaWords(n: number): string {
  if (!isFinite(n) || n === 0) return 'صفر تومان';
  n = Math.round(Math.abs(n));
  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) {
      const w = threeDigitToWords(groups[i]) + scales[i];
      parts.push(w);
    }
  }
  return parts.join(' و ') + ' تومان';
}
