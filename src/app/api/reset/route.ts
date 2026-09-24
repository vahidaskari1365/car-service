import { NextResponse } from 'next/server';
import { resetStore, logActivity } from '@/lib/erp-store';

export const dynamic = 'force-dynamic';

/** بازنشانی داده‌ها به حالت اولیه (نمونه) */
export async function POST() {
  resetStore();
  logActivity('بازنشانی داده‌ها', 'سیستم', 'همه داده‌ها به حالت اولیه برگشت');
  return NextResponse.json({ ok: true, message: 'داده‌ها به حالت اولیه بازگشت' });
}
