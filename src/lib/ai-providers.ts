// ─── کاتالوگ ارائه‌دهندگان رایگان LLM ───
// منبع: github.com/open-free-llm-api/awesome-freellm-apis
// همه ارائه‌دهندگان زیر نقطه‌پایان سازگار با OpenAI دارند و بدون کارت بانکی قابل استفاده‌اند.

export interface FreeProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: string[];
  needsCard: boolean;
  maxContext: string;
  keyUrl: string;
  note: string;
}

export const FREE_PROVIDERS: FreeProvider[] = [
  {
    id: 'groq', name: 'Groq (پیشنهادی)', baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct', 'qwen/qwen3-32b'],
    needsCard: false, maxContext: '128K', keyUrl: 'https://console.groq.com/keys',
    note: 'بدون کارت بانکی — تیر رایگان ۳۰ درخواست در دقیقه — بسیار سریع',
  },
  {
    id: 'google', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    needsCard: false, maxContext: '1M', keyUrl: 'https://aistudio.google.com/app/apikey',
    note: 'بدون کارت بانکی — پنجره زمینه ۱ میلیون توکن',
  },
  {
    id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen3-235b-a22b:free', 'google/gemma-3-27b-it:free'],
    needsCard: false, maxContext: 'پویا', keyUrl: 'https://openrouter.ai/keys',
    note: 'ده‌ها مدل با برچسب رایگان — بدون کارت بانکی',
  },
  {
    id: 'mistral', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo'],
    needsCard: false, maxContext: '256K', keyUrl: 'https://console.mistral.ai/api-keys',
    note: 'پلن رایگان آزمایشی — بدون کارت بانکی',
  },
  {
    id: 'cohere', name: 'Cohere', baseUrl: 'https://api.cohere.ai/compatibility/v1',
    models: ['command-r-plus-08-2024', 'command-r-08-2024'],
    needsCard: false, maxContext: '256K', keyUrl: 'https://dashboard.cohere.com/api-keys',
    note: 'کلید آزمایشی رایگان — مناسب پروتوتایپ',
  },
  {
    id: 'github', name: 'GitHub Models', baseUrl: 'https://models.github.ai/inference',
    models: ['openai/gpt-4.1-mini', 'meta/Llama-4-Scout-17B-16E-Instruct', 'mistral-ai/Mistral-Large-2411'],
    needsCard: false, maxContext: '128K', keyUrl: 'https://github.com/settings/tokens',
    note: 'رایگان با توکن GitHub — سهمیه محدود روزانه',
  },
  {
    id: 'cloudflare', name: 'Cloudflare Workers AI', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1',
    models: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/qwen/qwen1.5-14b-chat-awq'],
    needsCard: false, maxContext: '24K', keyUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    note: 'بدون کارت بانکی — نیاز به Account ID',
  },
  {
    id: 'llm7', name: 'LLM7.io', baseUrl: 'https://api.llm7.io/v1',
    models: ['gpt-4o-mini-2024-07-18', 'deepseek-r1', 'gemini-2.0-flash'],
    needsCard: false, maxContext: 'پویا', keyUrl: 'https://token.llm7.io',
    note: 'کاملاً رایگان — توکن اختیاری برای سهمیه بیشتر',
  },
  {
    id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: ['meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1', 'qwen/qwen2.5-coder-32b-instruct'],
    needsCard: false, maxContext: '128K', keyUrl: 'https://build.nvidia.com/settings/api-keys',
    note: 'بیش از ۱۰۰ مدل — نیازمند تأیید شماره تلفن',
  },
  {
    id: 'huggingface', name: 'Hugging Face', baseUrl: 'https://router.huggingface.co/v1',
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct'],
    needsCard: false, maxContext: '128K', keyUrl: 'https://huggingface.co/settings/tokens',
    note: 'توکن رایگان HF — سهمیه محدود ماهانه',
  },
  {
    id: 'zai', name: 'Z AI (Zhipu)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.6', 'glm-4.5-air', 'glm-4-flash'],
    needsCard: false, maxContext: '200K', keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    note: 'مدل GLM — همین موتوری که در این سامانه به‌صورت داخلی فعال است',
  },
];
