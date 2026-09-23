'use client';

// ─── تنظیمات موتور هوش مصنوعی ───
import { useEffect, useState } from 'react';
import { Zap, KeyRound, CheckCircle2, ExternalLink, Server, Cpu, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, SectionCard, StatusPill, LoadingTable } from '../shared';

interface FreeProvider {
  id: string; name: string; baseUrl: string; models: string[];
  needsCard: boolean; maxContext: string; keyUrl: string; note: string;
}

interface Settings {
  provider: 'built-in' | 'custom';
  name?: string; baseUrl?: string; apiKey?: string; model?: string;
}

export default function AISettingsView() {
  const [providers, setProviders] = useState<FreeProvider[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<FreeProvider | null>(null);
  const [form, setForm] = useState({ baseUrl: '', apiKey: '', model: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/ai/settings').then(r => r.json()).then(j => {
      setProviders(j.providers || []);
      setSettings(j.settings);
    });
  }, []);

  function pick(p: FreeProvider) {
    setSelected(p);
    setForm({ baseUrl: p.baseUrl, apiKey: '', model: p.models[0] });
  }

  async function save(provider: 'built-in' | 'custom') {
    setSaving(true);
    try {
      const body = provider === 'built-in'
        ? { provider: 'built-in' }
        : { provider: 'custom', name: selected?.name, ...form };
      const res = await fetch('/api/ai/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSettings(json.settings);
      toast({
        title: 'موتور هوش مصنوعی به‌روزرسانی شد',
        description: provider === 'built-in' ? 'موتور داخلی Z AI فعال است' : `موتور فعال: ${selected?.name}`,
      });
    } catch (e) {
      toast({ title: 'خطا در ذخیره تنظیمات', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <div className="view-enter"><LoadingTable rows={6} /></div>;
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="تنظیمات موتور هوش مصنوعی"
        description="موتور داخلی رایگان فعال است — یا یکی از APIهای رایگان سازگار با OpenAI را وصل کنید (فهرست awesome-freellm-apis)"
      />

      {/* موتور فعلی */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-l from-amber-50 to-card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold">موتور فعال: {settings.provider === 'built-in' ? 'داخلی Z AI (رایگان، همیشه فعال)' : settings.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {settings.provider === 'built-in'
                ? 'بدون نیاز به کلید و تنظیمات — آماده استفاده'
                : `${settings.model} — ${settings.baseUrl}`}
            </div>
          </div>
        </div>
        {settings.provider === 'built-in' ? (
          <StatusPill label="پیش‌فرض فعال" tone="bg-emerald-50 text-emerald-700 border-emerald-200" />
        ) : (
          <StatusPill label="ارائه‌دهنده خارجی" tone="bg-teal-50 text-teal-700 border-teal-200" />
        )}
      </div>

      <Button
        variant={settings.provider === 'built-in' ? 'secondary' : 'default'}
        size="sm"
        className="gap-1.5 mb-6"
        disabled={saving || settings.provider === 'built-in'}
        onClick={() => save('built-in')}
      >
        <Zap className="h-4 w-4" /> بازگشت به موتور داخلی رایگان
      </Button>

      {/* فرم اتصال */}
      {selected && (
        <SectionCard
          title={`اتصال به ${selected.name}`}
          description={selected.note}
          className="mb-6"
          action={<Button size="sm" disabled={saving || !form.apiKey} onClick={() => save('custom')}>تست و ذخیره</Button>}
        >
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input dir="ltr" value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> کلید API</Label>
              <Input dir="ltr" type="password" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} placeholder="کلید را از لینک زیر بگیرید" />
            </div>
            <div className="space-y-1.5">
              <Label>مدل</Label>
              <Input dir="ltr" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} list="models" />
              <datalist id="models">{selected.models.map(m => <option key={m} value={m} />)}</datalist>
            </div>
          </div>
          <a href={selected.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline mt-3">
            دریافت کلید رایگان از {selected.name} <ExternalLink className="h-3 w-3" />
          </a>
          <div className="text-[11px] text-muted-foreground mt-2">
            در صورت خطای ارائه‌دهنده خارجی، سامانه به‌صورت خودکار با موتور داخلی پاسخ می‌دهد تا دستیار همیشه کار کند.
          </div>
        </SectionCard>
      )}

      {/* کاتالوگ ارائه‌دهندگان */}
      <SectionCard
        title="کاتالوگ APIهای رایگان LLM"
        description="برگرفته از مخزن awesome-freellm-apis — همگی نقطه‌پایان سازگار با OpenAI دارند"
        action={<Server className="h-4 w-4 text-amber-600" />}
      >
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {providers.map(p => (
            <div key={p.id} className={`rounded-xl border p-4 space-y-2.5 transition-colors hover:border-amber-300 ${selected?.id === p.id ? 'border-amber-400 bg-amber-50/40' : 'bg-card'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold">{p.name}</div>
                <div className="flex items-center gap-1">
                  {p.needsCard
                    ? <StatusPill label="نیاز به کارت" tone="bg-red-50 text-red-600 border-red-200" />
                    : <StatusPill label="بدون کارت بانکی" tone="bg-emerald-50 text-emerald-700 border-emerald-200" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><CreditCard className="h-3 w-3" /> زمینه: {p.maxContext}</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {p.models.length} مدل</span>
              </div>
              <div className="text-[11px] text-muted-foreground leading-5">{p.note}</div>
              <div className="flex items-center justify-between pt-1">
                <a href={p.keyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-amber-700 hover:underline inline-flex items-center gap-0.5">
                  دریافت کلید <ExternalLink className="h-3 w-3" />
                </a>
                <Button size="sm" variant={selected?.id === p.id ? 'secondary' : 'outline'} className="h-7 text-[11px]" onClick={() => pick(p)}>
                  انتخاب و تنظیم
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
