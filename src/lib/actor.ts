// ─── کاربر جاری به‌صورت ماژولی (خارج از مرز React — بدون هشدار client boundary) ───

let actorCache = 'کاربر سیستم';

/** نام کاربر جاری برای ثبت مسئولیت در تراکینگ */
export function getActorName(): string {
  return actorCache;
}

/** به‌روزرسانی کاربر جاری (از UserProvider فراخوانی می‌شود) */
export function setActorName(name: string): void {
  actorCache = name || 'کاربر سیستم';
}

/** هدر X-User آماده برای fetch مستقیم (encode — هدر فقط Latin-1 می‌پذیرد) */
export function actorHeader(): Record<string, string> {
  return { 'X-User': encodeURIComponent(actorCache) };
}
