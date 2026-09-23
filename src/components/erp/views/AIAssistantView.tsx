'use client';

// ─── دستیار هوشمند و ایجنت‌های AI ───
import { useEffect, useRef, useState } from 'react';
import {
  Send, Bot, User, Sparkles, TrendingUp, Tags, BarChart3, PackageSearch,
  FileText, Users, GitBranch, Globe, Loader2, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, SectionCard, StatusPill, FormDialog } from '../shared';
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

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export default function AIAssistantView({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: 'سلام! من **دستیار هوشمند مدیریت مجموعه خودرویی** هستم. 🚗\n\nبه داده‌های لحظه‌ای سامانه دسترسی دارم — خودروها، معاملات، تعمیرگاه، اجاره، اقساط، انبار و مالی. هر سوالی درباره وضعیت مجموعه دارید بپرسید، یا از **ایجنت‌های تخصصی** زیر استفاده کنید.',
    },
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [agentLoading, setAgentLoading] = useState<string | null>(null);
  const [agentResult, setAgentResult] = useState<{ agent: string; result: string } | null>(null);
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

  async function sendChat() {
    const text = input.trim();
    if (!text || chatLoading) return;
    setMessages(m => [...m, { role: 'user', content: text }]);
    setInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: text }] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMessages(m => [...m, { role: 'assistant', content: json.reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'خطا در ارتباط با هوش مصنوعی'}` }]);
    } finally {
      setChatLoading(false);
    }
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
      setAgentResult({ agent: agentId, result: json.result });
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
        description="چت با دستیار آگاه به داده‌های شرکت + ایجنت‌های تخصصی تحلیلی + دسترسی وب"
        action={
          <Button variant="outline" className="gap-1.5" onClick={onOpenSettings}>
            <RefreshCw className="h-4 w-4" /> تنظیمات موتور AI
          </Button>
        }
      />

      <div className="grid lg:grid-cols-5 gap-4">
        {/* چت */}
        <SectionCard title="گفتگو با دستیار مدیریتی" description="متصل به داده‌های لحظه‌ای سامانه" className="lg:col-span-3 flex flex-col h-[560px]">
          <div className="flex-1 overflow-y-auto space-y-3 pl-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-900 text-amber-400'}`}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-7 ${m.role === 'user' ? 'chat-bubble-user rounded-tr-sm' : 'chat-bubble-ai border rounded-tl-sm'}`}>
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <div className="erp-md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 text-amber-400 flex items-center justify-center shrink-0"><Bot className="h-4 w-4" /></div>
                <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> در حال تحلیل داده‌های سامانه...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* پیشنهادها */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 py-2">
              {suggestedQuestions.map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-[11px] rounded-full border border-amber-200 bg-amber-50 text-amber-800 px-2.5 py-1 hover:bg-amber-100 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="سؤال خود را بنویسید... (Enter برای ارسال)"
              className="min-h-11 flex-1 resize-none"
              rows={1}
            />
            <Button onClick={sendChat} disabled={chatLoading || !input.trim()} className="gap-1.5 self-end">
              <Send className="h-4 w-4" /> ارسال
            </Button>
          </div>
        </SectionCard>

        {/* ایجنت‌ها */}
        <div className="lg:col-span-2 space-y-3">
          <SectionCard title="ایجنت‌های تخصصی هوشمند" description="هر ایجنت روی داده‌های مرتبط خودش تحلیل عمیق انجام می‌دهد">
            <div className="space-y-2 max-h-[480px] overflow-y-auto pl-1">
              {agents.map(a => {
                const Icon = agentIcons[a.id] || Sparkles;
                return (
                  <div key={a.id} className="rounded-xl border p-3 hover:border-amber-300 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 h-5 w-5" />
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
                        className="h-7 text-[11px] gap-1 ml-auto"
                        disabled={agentLoading === a.id || (a.id === 'pricing' && !pricingVehicleId)}
                        onClick={() => runAgent(a.id, a.id === 'pricing' ? { vehicleId: pricingVehicleId } : {})}
                      >
                        {agentLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        اجرا
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* نتیجه ایجنت */}
          {agentLoading && (
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" /> ایجنت در حال تحلیل داده‌های مجموعه است...
            </div>
          )}
          {agentResult && !agentLoading && (
            <SectionCard
              title={`نتیجه ${agents.find(a => a.id === agentResult.agent)?.name || 'ایجنت'}`}
              description="تحلیل تولیدشده بر اساس داده‌های واقعی سامانه"
            >
              <div className="max-h-96 overflow-y-auto text-sm erp-md">
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
