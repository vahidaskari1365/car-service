import { NextRequest, NextResponse } from 'next/server';
import { callLLM, ERP_SYSTEM_PROMPT, type ChatMessage } from '@/lib/ai-engine';
import { aiContext, logActivity } from '@/lib/erp-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface ChatBody {
  messages?: { role: 'user' | 'assistant'; content: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody;
    const history = (body.messages || [])
      .filter(m => m.content && m.content.trim().length > 0)
      .slice(-10);

    if (history.length === 0) {
      return NextResponse.json({ error: 'پیامی برای ارسال وجود ندارد' }, { status: 400 });
    }

    const context = aiContext();

    const messages: ChatMessage[] = [
      { role: 'system', content: ERP_SYSTEM_PROMPT },
      { role: 'system', content: `داده‌های لحظه‌ای سامانه (فقط برای تو):\n${context}` },
      ...history.map(m => ({ role: m.role, content: m.content }) as ChatMessage),
    ];

    const { content, engine } = await callLLM(messages, 0.5);
    logActivity('گفتگو با دستیار هوشمند', 'هوش مصنوعی', history[history.length - 1]?.content?.slice(0, 80));

    return NextResponse.json({ reply: content, engine });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
    return NextResponse.json({ error: `دستیار هوشمند موقتاً در دسترس نیست: ${msg}` }, { status: 503 });
  }
}
