import { NextRequest, NextResponse } from 'next/server';
import { callLLM, type ChatMessage } from '@/lib/ai-engine';
import { getStore, logActivity } from '@/lib/erp-store';
import { vehicleCostsTotal, workOrderTotal } from '@/lib/erp-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  inputs?: { key: string; label: string; placeholder?: string; type?: 'text' | 'select'; options?: string[] }[];
}

export const AGENTS: AgentInfo[] = [
  { id: 'profitability', name: 'ایجنت تحلیل سودآوری', description: 'تحلیل سود هر خودرو، هر بخش و شناسایی سودآورترین و زیان‌دهترین موارد', icon: 'TrendingUp' },
  { id: 'pricing', name: 'ایجنت قیمت‌گذاری خودرو', description: 'پیشنهاد قیمت خرید و فروش منصفانه بر اساس مدل، سال، کارکرد و داده‌های بازار مجموعه', icon: 'Tags', inputs: [{ key: 'vehicleId', label: 'خودرو', type: 'select', placeholder: 'انتخاب خودرو' }] },
  { id: 'sales_forecast', name: 'ایجنت پیش‌بینی فروش', description: 'پیش‌بینی فروش ماه آینده بر اساس روند معاملات و وضعیت موجودی', icon: 'BarChart3' },
  { id: 'parts_demand', name: 'ایجنت پیش‌بینی قطعات', description: 'پیش‌بینی نیاز انبار بر اساس سفارش‌های کار و تاریخچه مصرف', icon: 'PackageSearch' },
  { id: 'report', name: 'ایجنت گزارش مدیریتی', description: 'تولید گزارش کامل مدیریتی با خلاصه اجرایی، تحلیل و پیشنهادها', icon: 'FileText' },
  { id: 'customer_insight', name: 'ایجنت تحلیل مشتریان', description: 'تحلیل رفتار مشتریان، سگمنت‌بندی و پیشنهاد اقدامات فروش و وفادارسازی', icon: 'Users' },
  { id: 'process_scan', name: 'ایجنت کشف گلوگاه فرآیندها', description: 'شناسایی فرآیندهای پرهزینه، کند و وابسته به افراد با پیشنهاد اتوماسیون', icon: 'GitBranch' },
  { id: 'web_research', name: 'ایجنت دسترسی وب (Agent-Reach)', description: 'خواندن یک صفحه وب (آگهی قیمت، خبر بازار خودرو) و استخراج نکات قابل استفاده برای مجموعه', icon: 'Globe', inputs: [{ key: 'url', label: 'نشانی صفحه', placeholder: 'https://example.com/car-ad' }] },
];

function dataFor(agentId: string, payload: Record<string, string>): string {
  const s = getStore();
  const head = `داده‌های سامانه مجموعه خودرویی (تاریخ امروز: ${new Intl.DateTimeFormat('fa-IR').format(new Date())}):`;

  switch (agentId) {
    case 'pricing': {
      const v = s.vehicles.find(x => x.id === payload.vehicleId) || s.vehicles.filter(x => !x.salePrice)[0];
      const similar = s.vehicles.filter(x => x.brand === v?.brand);
      return `${head}
خودروی هدف: ${JSON.stringify(v, null, 1)}
خودروهای مشابه در مجموعه: ${JSON.stringify(similar.map(x => ({ model: x.model, year: x.year, mileage: x.mileage, purchase: x.purchasePrice, sale: x.salePrice })), null, 1)}
میانگین قیمت‌های معاملات اخیر: ${JSON.stringify(s.deals.map(d => ({ type: d.type, price: d.price })), null, 1)}`;
    }
    case 'parts_demand': {
      return `${head}
قطعات: ${JSON.stringify(s.parts.map(p => ({ code: p.code, name: p.name, qty: p.quantity, min: p.minQuantity, purchasePrice: p.purchasePrice, sales: p.salePrice })), null, 1)}
سفارش‌های کار (مصرف قطعات): ${JSON.stringify(s.workOrders.map(w => ({ code: w.code, type: w.type, status: w.status, parts: w.parts })), null, 1)}`;
    }
    case 'customer_insight': {
      return `${head}
مشتریان: ${JSON.stringify(s.customers.map(c => ({ name: `${c.firstName} ${c.lastName}`, segment: c.segment, type: c.type, tags: c.tags, followUps: c.followUps.length, createdAt: c.createdAt })), null, 1)}
معاملات: ${JSON.stringify(s.deals.map(d => ({ code: d.code, customerId: d.customerId, type: d.type, price: d.price, status: d.status })), null, 1)}
اجاره‌ها: ${JSON.stringify(s.rentals.map(r => ({ code: r.code, customerId: r.customerId, status: r.status, dailyRate: r.dailyRate })), null, 1)}`;
    }
    case 'process_scan': {
      return `${head}
فرآیندها: ${JSON.stringify(s.processes.map(p => ({ code: p.code, title: p.title, stages: p.stages.map(st => ({ name: st.name, responsible: st.responsible, status: st.status, logs: st.logs.length })) })), null, 1)}
درخواست‌های خرید: ${JSON.stringify(s.purchaseRequests.map(p => ({ code: p.code, status: p.status, quotes: p.quotes, items: p.items })), null, 1)}
کارکنان: ${JSON.stringify(s.employees.map(e => ({ name: e.name, role: e.role, division: e.division })), null, 1)}`;
    }
    case 'sales_forecast': {
      return `${head}
معاملات: ${JSON.stringify(s.deals, null, 1)}
موجودی فروش‌نیافته: ${JSON.stringify(s.vehicles.filter(v => !v.salePrice).map(v => ({ model: v.model, year: v.year, status: v.status, price: v.purchasePrice })), null, 1)}
درخواست‌های اقساط: ${JSON.stringify(s.installments.map(i => ({ code: i.code, status: i.status, vehiclePrice: i.vehiclePrice, creditScore: i.creditScore })), null, 1)}`;
    }
    case 'profitability': {
      const pnl = s.vehicles.filter(v => v.salePrice).map(v => ({
        model: v.model, year: v.year,
        purchase: v.purchasePrice, sale: v.salePrice,
        costs: vehicleCostsTotal(v),
        profit: (v.salePrice ?? 0) - v.purchasePrice - vehicleCostsTotal(v),
      }));
      const woProfit = s.workOrders.filter(w => w.status === 'delivered').map(w => ({ code: w.code, total: workOrderTotal(w), laborHours: w.laborHours }));
      const rentalIncome = s.rentals.filter(r => r.status === 'returned').map(r => ({ code: r.code, days: r.dailyRate, paid: r.paidAmount }));
      return `${head}
سود هر خودرو: ${JSON.stringify(pnl, null, 1)}
فاکتورهای تعمیرگاه: ${JSON.stringify(woProfit, null, 1)}
درآمد اجاره‌های تمام‌شده: ${JSON.stringify(rentalIncome, null, 1)}
تراکنش‌ها: ${JSON.stringify(s.transactions.map(t => ({ type: t.type, category: t.category, amount: t.amount, division: t.division })), null, 1)}`;
    }
    case 'web_research': {
      return `${head}
کاربر آدرس زیر را برای تحلیل داده است: ${payload.url || '(بدون آدرس)'}`;
    }
    default: {
      // گزارش مدیریتی — همه داده‌ها
      return `${head}
خودروها: ${JSON.stringify(s.vehicles.map(v => ({ model: v.model, year: v.year, status: v.status, purchase: v.purchasePrice, sale: v.salePrice, costs: vehicleCostsTotal(v) })), null, 1)}
معاملات: ${JSON.stringify(s.deals.map(d => ({ code: d.code, type: d.type, price: d.price, status: d.status })), null, 1)}
سفارش‌های کار: ${JSON.stringify(s.workOrders.map(w => ({ code: w.code, status: w.status, total: workOrderTotal(w) })), null, 1)}
اجاره: ${JSON.stringify(s.rentals.map(r => ({ code: r.code, status: r.status, dailyRate: r.dailyRate, paid: r.paidAmount })), null, 1)}
اقساط: ${JSON.stringify(s.installments.map(i => ({ code: i.code, status: i.status, monthly: i.monthlyPayment, months: i.months })), null, 1)}
تراکنش‌ها: ${JSON.stringify(s.transactions.map(t => ({ type: t.type, category: t.category, amount: t.amount })), null, 1)}
قطعات کم‌موجود: ${JSON.stringify(s.parts.filter(p => p.quantity <= p.minQuantity).map(p => p.name), null, 1)}`;
    }
  }
}

const AGENT_PROMPTS: Record<string, string> = {
  profitability: `تو «ایجنت تحلیل سودآوری» یک مجموعه خودرویی هستی. داده‌های واقعی سامانه را تحلیل کن:
۱) جدول سود هر خودروی فروخته‌شده (پرداخت مارک‌داون با ستون‌های خودرو، خرید، فروش، هزینه‌ها، سود)
۲) تحلیل سود تعمیرگاه و اجاره
۳) سودآورترین و کم‌بازده‌ترین بخش‌ها
۴) ۳ پیشنهاد عملی برای بهبود سود
فقط از داده‌های داده‌شده استفاده کن. اعداد را به میلیون تومان گرد کن. فارسی روان و ساختارمند.`,
  pricing: `تو «ایجنت قیمت‌گذاری خودرو» هستی. برای خودروی هدف:
۱) قیمت منصفانه فروش پیشنهادی (بازه پایین/منصفانه/بالا) به تومان
۲) قیمت پیشنهادی خرید (حداکثر قیمت خرید مناسب)
۳) منطق قیمت‌گذاری: سال، کارکرد، وضعیت آماده‌سازی، مقایسه با معاملات مشابه مجموعه
۴) هشدارهای ریسک (رنگ خاص، کارکرد بالا و ...)
فقط بر اساس داده‌های سامانه استدلال کن. مارک‌داون ساختارمند فارسی.`,
  sales_forecast: `تو «ایجنت پیش‌بینی فروش» هستی. بر اساس معاملات، موجودی، درخواست‌های اقساط و وضعیت پیگیری‌ها:
۱) پیش‌بینی تعداد و ارزش فروش ماه آینده (سناریوی بدبینانه/واقع‌بینانه/خوش‌بینانه)
۲) خودروهایی که احتمال فروش بالاتری دارند
۳) معاملات در حال مذاکره و اقدام لازم برای بستن آن‌ها
۴) ریسک‌های فروش
خروجی مارک‌داون فارسی و مختصر.`,
  parts_demand: `تو «ایجنت پیش‌بینی نیاز قطعات» هستی. بر اساس موجودی فعلی، حداقل‌ها و مصرف سفارش‌های کار:
۱) جدول قطعاتی که باید سفارش داده شوند (نام، موجودی، حداقل، پیشنهاد خرید)
۲) قطعاتی که به‌زودی به حد بحرانی می‌رسند
۳) برآورد بودجه خرید
۴) پیشنهاد زمان‌بندی خرید
مارک‌داون فارسی.`,
  report: `تو «ایجنت گزارش مدیریتی» هستی. یک گزارش کامل مدیریتی بنویس با بخش‌های:
## خلاصه اجرایی (۵ خط)
## وضعیت ناوگان و موجودی
## عملکرد مالی (درآمد، هزینه، سود، مطالبات)
## عملکرد واحدها (نمایشگاه، تعمیرگاه، اجاره، اقساط)
## ریسک‌ها و هشدارها
## پیشنهادهای هفته آینده
اعداد دقیق از داده‌ها. فارسی رسمی و مدیریتی.`,
  customer_insight: `تو «ایجنت تحلیل مشتریان» هستی. تحلیل کن:
۱) توزیع سگمنت‌ها و معنای آن
۲) مشتریان کلیدی و فرصت‌های فروش مجدد/معرفی
۳) پیگیری‌های در انتظار و اولویت‌بندی آن‌ها
۴) ۵ اقدام مشخص برای تیم فروش و CRM
مارک‌داون فارسی.`,
  process_scan: `تو «ایجنت کشف گلوگاه فرآیندها» هستی. تحلیل کن:
۱) فرآیندهای دارای تأخیر یا مرحله گیرکرده (in_progress طولانی، pending زیاد)
۲) مراحل وابسته به فرد خاص
۳) فرآیندهای پرهزینه
۴) پیشنهاد اتوماسیون و حذف دست‌کاری انسانی برای هر گلوگاه
مارک‌داون فارسی.`,
  web_research: `تو «ایجنت دسترسی وب (الهام‌گرفته از Agent-Reach)» هستی. محتوای صفحه وب برایت ارسال می‌شود. تحلیل کن:
۱) خلاصه محتوا در ۳ تا ۵ خط
۲) نکات مرتبط با بازار خودرو (قیمت، مدل، رقبا)
۳) اقدام پیشنهادی برای مجموعه
اگر محتوا مرتبط با خودرو نبود، صادقانه بگو و خلاصه کوتاه بده. فارسی.`,
};

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CarServiceERP/1.0; +https://github.com/vahidaskari1365/car-service)' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`خطای دریافت صفحه (کد ${res.status})`);
  const html = await res.text();
  // استخراج متن ساده از HTML
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 12000);
}

export async function GET() {
  return NextResponse.json({ agents: AGENTS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { agent?: string; payload?: Record<string, string> };
    const agentId = body.agent || 'report';
    const payload = body.payload || {};
    const prompt = AGENT_PROMPTS[agentId];
    if (!prompt) return NextResponse.json({ error: 'ایجنت نامعتبر است' }, { status: 400 });

    let extraContext = '';
    if (agentId === 'web_research') {
      const url = (payload.url || '').trim();
      if (!url) return NextResponse.json({ error: 'نشانی صفحه را وارد کنید' }, { status: 400 });
      try {
        const pageText = await fetchPageText(url);
        extraContext = `\n\nمحتوای صفحه ${url}:\n${pageText}`;
      } catch (e) {
        return NextResponse.json({ error: `دریافت صفحه ناموفق بود: ${e instanceof Error ? e.message : 'خطای شبکه'}` }, { status: 502 });
      }
    }
    if (agentId === 'pricing' && payload.vehicleId) {
      const v = getStore().vehicles.find(x => x.id === payload.vehicleId);
      if (v) extraContext = `\n\nتأکید: خودروی هدف «${v.model} سال ${v.year}» با شناسه ${v.id} است.`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: dataFor(agentId, payload) + extraContext },
    ];

    const result = await callLLM(messages, 0.55);
    logActivity(`اجرای ایجنت: ${AGENTS.find(a => a.id === agentId)?.name}`, 'هوش مصنوعی');
    return NextResponse.json({ result, agent: agentId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
    return NextResponse.json({ error: `اجرای ایجنت ناموفق بود: ${msg}` }, { status: 500 });
  }
}
