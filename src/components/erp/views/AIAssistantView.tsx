'use client';

// ─── دستیار هوشمند و ایجنت‌های AI ───
import { useEffect, useRef, useState } from 'react';
import {
  Send, Bot, User, Sparkles, TrendingUp, Tags, BarChart3, PackageSearch,
  FileText, Users, GitBranch, Globe, RotateCcw, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, SectionCard, FormDialog } from '../shared';
import { useEntity } from '../use-erp';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import type { Vehicle } from '@/lib/erp-types';

// آیکون هر ایجنت
const agentIcons: Record<string, typeof TrendingUp> = {
  profitability: TrendingUp, pricing: Tags, sales_forecast: BarChart3,
  parts_demand: PackageSearch, report: FileText, customer_insight: Users,
  process_scan: GitBranch, web_research: Globe,
};

interface AgentDef {
  id: string; name: string; description: string; icon: string;
  inputs?: { key: string; label: string; placeholder?: string; type?: 'text' | 'select'; options?: string[] }[];
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; engine?: string }

export default function AIAssistantView() {
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: 'سلام! من **دستیار هوشمند مدیریت مجموعه خودرویی** هستم. 🚗\n\nبه داده‌های لحظه‌ای سامانه دسترسی دارم — خودروها، معاملات، تعمیرگاه، اجاره، اقساط، انبار و مالی. هر سوالی درباره وضعیت مجموعه دارید بپرسید، یا از **ایجنت‌های تخصصی** استفاده کنید.\n\nموتور هوش مصنوعی به‌صورت خودکار فعال است — نیازی به هیچ تنظیماتی نیست.',
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [agentLoading, setAgentLoading] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<{ agent: string; result: string; engine?: string } | null>(null);
  const [pricingVehicleId, setPricingVehicleId] = useState('');
  const [researchUrl, setResearchUrl] = useState('');
  const [researchDialog, setResearchDialog] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { items: vehicles } = useEntity<Vehicle>('vehicles');

  useEffect(() => {
    fetch('/api/ai/agent').then(r => r.json()).then(j => setAgents(j.agents || []));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  async function sendChat(retryText?: string) {
    const text = (retryText ?? input).trim();
    if (!text || chatLoading) return;
    const base = retryText ? messages : [...messages, { role: 'user' as const, content: text }];
    if (!retryText) {
      setMessages(m => [...m, { role: 'user', content: text }]);
      setInput('');
    }
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: base }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMessages(m => [...m, { role: 'assistant', content: json.reply, engine: json.engine }]);
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `⚠️ ارتباط با هوش مصنوعی برقرار نشد.\n\n\`${e instanceof Error ? e.message : 'خطای شبکه'}\`\n\nدکمه «تلاش مجدد» را بزنید.`,
        engine: undefined,
      }]);
      setLastFailed(text);
    } finally {
      setChatLoading(false);
    }
  }
  const [lastFailed, setLastFailed] = useState<string | null>(null);

  function retryLast() {
    if (!lastFailed) return;
    // پیام خطا را حذف کن و دوباره بپرس
    setMessages(m => {
      const copy = [...m];
      while (copy.length && copy[copy.length - 1].role === 'assistant' && copy[copy.length - 1].content.startsWith('⚠️')) copy.pop();
      return copy;
    });
    const t = lastFailed;
    setLastFailed(null);
    sendChat(t);
  }

  async function runAgent(agentId: string, payload: Record<string, string> = {}) {
    setAgentLoading(agentId);
    setAgentResult(null);
    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: agentId, payload }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAgentResult({ agent: agentId, result: json.result, engine: json.engine });
    } catch (e) {
      toast({ title: 'اجرای ایجنت ناموفق بود', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setAgentLoading(null);
    }
  }

  const suggestedQuestions = [
    'وضعیت کلی فروش و سود مجموعه چطور است؟',
    'کدام خودروها احتمال فروش بالایی دارند؟',
    'چه قطعاتی باید به‌زودی سفارش داده شوند؟',
    'اقساط معوق را تحلیل کن و راهکار بده',
  ];

  return (
    <div className="view-enter">
      <PageHeader
        title="دستیار هوشمند و ایجنت‌های AI"
        description="چت با دستیار آگاه به داده‌های شرکت + ایجنت‌های تخصصی تحلیلی + دسترسی وب — موتور AI خودکار و همیشه فعال"
        action={
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-card px-3.5 py-2 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Zap className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">موتور AI فعال — آماده به کار</span>
          </div>
        }
      />

      <div className="grid lg:grid-cols-5 gap-4">
        {/* چت */}
        <SectionCard title="گفتگو با دستیار مدیریتی" description="متصل به داده‌های لحظه‌ای سامانه" className="lg:col-span-3 flex flex-col h-[580px]">
          <div className="flex-1 overflow-y-auto space-y-4 pl-1 chat-scroll">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''} msg-in`}>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${m.role === 'user' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-gradient-to-br from-zinc-800 to-zinc-950 text-amber-400 ring-1 ring-amber-500/30'}`}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`group max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-7 shadow-sm ${m.role === 'user' ? 'chat-bubble-user rounded-tr-sm' : 'chat-bubble-ai border rounded-tl-sm'}`}>
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <>
                      <div className="erp-md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                      {m.engine && !m.content.startsWith('⚠️') && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/50 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                          <Zap className="h-2.5 w-2.5" /> پاسخ از موتور {m.engine}
                        </div>
                      )}
                      {m.content.startsWith('⚠️') && lastFailed && i === messages.length - 1 && (
                        <Button size="sm" variant="outline" className="mt-2 h-7 gap-1.5 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-50" onClick={retryLast}>
                          <RotateCcw className="h-3 w-3" /> تلاش مجدد
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2.5 msg-in">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-amber-400 ring-1 ring-amber-500/30 flex items-center justify-center shrink-0 shadow-sm"><Bot className="h-4 w-4" /></div>
                <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-3.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
                    <span className="text-xs text-muted-foreground ms-2">در حال تحلیل داده‌های سامانه...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* پیشنهادها */}
          {messages.length <= 2 && !chatLoading && (
            <div className="flex flex-wrap gap-1.5 py-2.5">
              {suggestedQuestions.map(q => (
                <button key={q} onClick={() => sendChat(q)} className="text-[11px] rounded-full border border-amber-200/80 bg-gradient-to-l from-amber-50 to-white text-amber-800 px-3 py-1.5 shadow-sm hover:shadow hover:border-amber-300 hover:-translate-y-px transition-all">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2.5 border-t">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="سؤال خود را بنویسید... (Enter برای ارسال)"
              className="min-h-11 flex-1 resize-none"
              rows={1}
            />
            <Button onClick={() => sendChat()} disabled={chatLoading || !input.trim()} className="gap-1.5 self-end shadow-sm shadow-amber-500/25">
              <Send className="h-4 w-4" /> ارسال
            </Button>
          </div>
        </SectionCard>

        {/* ایجنت‌ها */}
        <div className="lg:col-span-2 space-y-3">
          <SectionCard title="ایجنت‌های تخصصی هوشمند" description="هر ایجنت روی داده‌های مرتبط خودش تحلیل عمیق انجام می‌دهد">
            <div className="space-y-2 max-h-[500px] overflow-y-auto pl-1 chat-scroll">
              {agents.map(a => {
                const Icon = agentIcons[a.id] || Sparkles;
                return (
                  <div key={a.id} className="agent-card rounded-xl border p-3 transition-all">
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold">{a.name}</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-5">{a.description}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {a.id === 'pricing' && (
                        <Select value={pricingVehicleId} onValueChange={setPricingVehicleId}>
                          <SelectTrigger className="h-7 flex-1 text-[11px]"><SelectValue placeholder="انتخاب خودرو..." /></SelectTrigger>
                          <SelectContent>
                            {vehicles.filter(v => v.status !== 'sold').map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {a.id === 'web_research' && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setResearchDialog(true)}>ورود نشانی صفحه</Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 text-[11px] gap-1 ml-auto shadow-sm"
                        disabled={agentLoading === a.id || (a.id === 'pricing' && !pricingVehicleId)}
                        onClick={() => runAgent(a.id, a.id === 'pricing' ? { vehicleId: pricingVehicleId } : {})}
                      >
                        {agentLoading === a.id ? (
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 rounded-full border border-white/40 border-t-white animate-spin" /> در حال اجرا
                          </span>
                        ) : (
                          <><Sparkles className="h-3 w-3" /> اجرا</>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* نتیجه ایجنت */}
          {agentLoading && (
            <div className="agent-card rounded-xl border bg-gradient-to-l from-amber-50/60 to-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-5 w-5 rounded-full border-2 border-amber-300 border-t-amber-600 animate-spin" />
              ایجنت در حال تحلیل داده‌های مجموعه است...
            </div>
          )}
          {agentResult && !agentLoading && (
            <SectionCard
              title={`نتیجه ${agents.find(a => a.id === agentResult.agent)?.name || 'ایجنت'}`}
              description={`تحلیل تولیدشده بر اساس داده‌های واقعی سامانه · موتور: ${agentResult.engine || 'AI'}`}
              className="result-in"
            >
              <div className="max-h-96 overflow-y-auto text-sm erp-md chat-scroll">
                <ReactMarkdown>{agentResult.result}</ReactMarkdown>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* دیالوگ وب‌ریسرچ */}
      <FormDialog
        open={researchDialog} onOpenChange={setResearchDialog}
        title="ایجنت دسترسی وب (Agent-Reach)"
        description="نشانی یک صفحه وب (آگهی قیمت خودرو، خبر بازار) را وارد کنید تا ایجنت محتوای آن را بخواند و برای مجموعه تحلیل کند"
      >
        <div className="space-y-3">
          <Input dir="ltr" value={researchUrl} onChange={e => setResearchUrl(e.target.value)} placeholder="https://..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResearchDialog(false)}>انصراف</Button>
            <Button
              disabled={!researchUrl.trim()}
              onClick={() => { setResearchDialog(false); runAgent('web_research', { url: researchUrl }); }}
            >
              خواندن و تحلیل صفحه
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
