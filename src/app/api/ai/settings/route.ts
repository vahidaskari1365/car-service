import { NextRequest, NextResponse } from 'next/server';
import { getStore, logActivity } from '@/lib/erp-store';
import { FREE_PROVIDERS } from '@/lib/ai-providers';
import type { AIProviderSettings } from '@/lib/erp-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ settings: getStore().aiSettings, providers: FREE_PROVIDERS });
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AIProviderSettings>;
    const s = getStore();
    if (body.provider === 'built-in') {
      s.aiSettings = { provider: 'built-in' };
    } else {
      if (!body.baseUrl || !body.apiKey || !body.model) {
        return NextResponse.json({ error: 'نشانی پایه، کلید API و نام مدل همگی الزامی‌اند' }, { status: 400 });
      }
      s.aiSettings = {
        provider: 'custom',
        name: body.name || 'ارائه‌دهنده سفارشی',
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        model: body.model,
      };
    }
    logActivity('به‌روزرسانی تنظیمات هوش مصنوعی', 'هوش مصنوعی', `موتور فعال: ${s.aiSettings.provider === 'custom' ? s.aiSettings.name : 'داخلی Z AI'}`);
    return NextResponse.json({ settings: s.aiSettings });
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 });
  }
}
