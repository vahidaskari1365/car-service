// ─── موتور هوش مصنوعی ───
// موتور داخلی: z-ai-web-dev-sdk (رایگان، همیشه فعال)
// موتور خارجی: هر API رایگان سازگار با OpenAI (Groq، Gemini، OpenRouter و ...) طبق awesome-freellm-apis
import ZAI from 'z-ai-web-dev-sdk';
import { getStore } from './erp-store';
import type { AIProviderSettings } from './erp-types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callLLM(messages: ChatMessage[], temperature = 0.6): Promise<string> {
  const settings: AIProviderSettings = getStore().aiSettings;

  // ۱) ارائه‌دهنده خارجی (سازگار با OpenAI)
  if (settings.provider === 'custom' && settings.baseUrl && settings.apiKey && settings.model) {
    try {
      const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({ model: settings.model, messages, temperature }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`خطای ارائه‌دهنده خارجی (${res.status}): ${txt.slice(0, 200)}`);
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('پاسخ خالی از ارائه‌دهنده خارجی');
      return content;
    } catch (err) {
      // در صورت خطا به موتور داخلی برمی‌گردیم
      const msg = err instanceof Error ? err.message : String(err);
      try {
        const fallback = await callBuiltin(messages, temperature);
        return `${fallback}\n\n---\n⚠️ موتور خارجی (${settings.name || settings.model}) خطا داد و پاسخ با موتور داخلی تولید شد: ${msg}`;
      } catch {
        throw new Error(`ارائه‌دهنده خارجی در دسترس نیست: ${msg}`);
      }
    }
  }

  // ۲) موتور داخلی Z AI
  return callBuiltin(messages, temperature);
}

async function callBuiltin(messages: ChatMessage[], temperature: number): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    temperature,
  } as Parameters<typeof zai.chat.completions.create>[0]);
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('پاسخی از موتور هوش مصنوعی دریافت نشد');
  return content;
}

export const ERP_SYSTEM_PROMPT = `تو «دستیار هوشمند سامانه مدیریت مجموعه خودرویی» هستی؛ یک دستیار مدیریتی متخصص در حوزه ERP خودرویی.
وظایف تو:
- پاسخ به سؤالات مدیریتی بر اساس داده‌های واقعی سامانه (که در پیام سیستم ارسال می‌شود)
- تحلیل فروش، سودآوری، اجاره، تعمیرگاه، اقساط و انبار
- پیشنهادهای عملی و کاربردی برای بهبود کسب‌وکار
- کمک در تصمیم‌گیری مدیر

قواعد مهم:
- همیشه فارسی روان پاسخ بده.
- اعداد را با واحد «تومان» یا «میلیون تومان» بیان کن.
- از داده‌های واقعی که در اختیارت قرار می‌گیرد استفاده کن و آمار از خودت نساز؛ اگر داده‌ای موجود نیست صادقانه بگو.
- پاسخ‌ها را ساختارمند (تیتر، فهرست کوتاه) و خلاصه و کاربردی بنویس.
- لحن حرفه‌ای و مدیریتی داشته باش.`;
