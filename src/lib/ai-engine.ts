// ─── موتور هوش مصنوعی خودکار (بدون نیاز به هیچ تنظیماتی) ───
// زنجیره تلاش خودکار تا پاسخ موفق:
//  ۱) موتور داخلی z-ai-web-dev-sdk (در محیط ابری همیشه فعال)
//  ۲) LLM7.io — کاملاً رایگان و «بدون کلید» (طبق awesome-freellm-apis) → اپ روی هر سروری کار می‌کند
//  ۳) کلیدهای محیطی (اختیاری): GROQ_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY / ...
// در هر حالت کاربر هیچ تنظیمی لازم ندارد — هوش مصنوعی همیشه پاسخ می‌دهد.
import ZAI from 'z-ai-web-dev-sdk';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResult {
  content: string;
  engine: string;
}

const REQUEST_TIMEOUT_MS = 90_000;

// مدل‌های رایگانِ بدون کلید در LLM7 (به‌ترتیب اولویت) — مدل‌های «usage_based_only» کنار گذاشته شده‌اند
const LLM7_MODELS = ['GLM-5.3-Flash', 'minimax-m2.7', 'mistral-Nemo-Instruct-2407'];
const LLM7_BASE = 'https://api.llm7.io/v1';

// ارائه‌دهندگان محیطی اختیاری — فقط اگر متغیر محیطی مربوطه ست شده باشد خودکار فعال می‌شوند
interface EnvProvider {
  engine: string;
  envKey: string;
  baseUrl: string;
  model: string;
  extraHeaders?: Record<string, string>;
}
const ENV_PROVIDERS: EnvProvider[] = [
  { engine: 'Groq', envKey: 'GROQ_API_KEY', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { engine: 'OpenRouter', envKey: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3.3-70b-instruct:free' },
  { engine: 'Gemini', envKey: 'GEMINI_API_KEY', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash' },
  { engine: 'Mistral', envKey: 'MISTRAL_API_KEY', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
  { engine: 'OpenAI', envKey: 'OPENAI_API_KEY', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
];

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(t) };
}

async function fetchOpenAICompatible(
  baseUrl: string, apiKey: string | undefined, model: string,
  messages: ChatMessage[], temperature: number, engine: string,
  extraHeaders?: Record<string, string>,
): Promise<LLMResult> {
  const { signal, clear } = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...extraHeaders,
      },
      body: JSON.stringify({ model, messages, temperature }),
      signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} — ${txt.slice(0, 160)}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('پاسخ خالی');
    return { content, engine };
  } finally {
    clear();
  }
}

// ── موتور ۱: داخلی Z AI ──
async function callBuiltin(messages: ChatMessage[], temperature: number): Promise<LLMResult> {
  const zai = await ZAI.create();
  const completion = await Promise.race([
    zai.chat.completions.create({
      messages,
      temperature,
    } as Parameters<typeof zai.chat.completions.create>[0]),
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('اتمام زمان موتور داخلی')), REQUEST_TIMEOUT_MS)),
  ]);
  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('پاسخی از موتور داخلی دریافت نشد');
  return { content, engine: 'داخلی Z AI' };
}

// ── موتور ۲: LLM7 بدون کلید ──
async function callLLM7(messages: ChatMessage[], temperature: number): Promise<LLMResult> {
  let lastErr: Error | null = null;
  for (const model of LLM7_MODELS) {
    try {
      return await fetchOpenAICompatible(LLM7_BASE, undefined, model, messages, temperature, `LLM7 · ${model}`);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr || new Error('LLM7 در دسترس نیست');
}

// ── موتور ۳: کلیدهای محیطی (اختیاری) ──
async function callEnvProviders(messages: ChatMessage[], temperature: number): Promise<LLMResult> {
  for (const p of ENV_PROVIDERS) {
    const key = process.env[p.envKey];
    if (!key) continue;
    try {
      return await fetchOpenAICompatible(p.baseUrl, key, p.model, messages, temperature, p.engine);
    } catch {
      // به ارائه‌دهنده محیطی بعدی می‌رویم
    }
  }
  throw new Error('هیچ کلید محیطی فعالی پاسخ نداد');
}

/**
 * فراخوانی LLM با زنجیره fallback خودکار:
 * Z AI داخلی → LLM7 بدون کلید → کلیدهای محیطی
 */
export async function callLLM(messages: ChatMessage[], temperature = 0.6): Promise<LLMResult> {
  const errors: string[] = [];

  // ۱) موتور داخلی
  try {
    return await callBuiltin(messages, temperature);
  } catch (err) {
    errors.push(`داخلی: ${err instanceof Error ? err.message : err}`);
  }

  // ۲) LLM7 بدون کلید (سبب کارکردن AI روی هر سروری بدون تنظیمات می‌شود)
  try {
    return await callLLM7(messages, temperature);
  } catch (err) {
    errors.push(`LLM7: ${err instanceof Error ? err.message : err}`);
  }

  // ۳) کلیدهای محیطی
  try {
    return await callEnvProviders(messages, temperature);
  } catch (err) {
    errors.push(`محیطی: ${err instanceof Error ? err.message : err}`);
  }

  throw new Error(`هیچ موتور هوش مصنوعی در دسترس نیست — ${errors.join(' | ')}`);
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
- لحن حرفه‌ای و مدیریتی داشته باشد.`;
