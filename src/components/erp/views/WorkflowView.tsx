'use client';

// ─── اتوماسیون فرآیندها (Workflow) ───
import { useState } from 'react';
import { GitBranch, ArrowLeft, CircleX, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatusPill, FormDialog, LoadingTable, DetailDrawer, KpiCard } from '../shared';
import { useEntity } from '../use-erp';
import type { WorkflowProcess } from '@/lib/erp-types';
import { faNumber, jdate, jdatetime } from '@/lib/erp-utils';

const stageTone: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  pending: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30',
  rejected: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
};
const typeLabels: Record<string, string> = {
  purchase: 'خرید', repair: 'تعمیر', sale: 'فروش', rental: 'اجاره', custom: 'سفارشی',
};

export default function WorkflowView() {
  const { items: processes, loading, create, update } = useEntity<WorkflowProcess>('processes');
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'custom', responsible: '' });
  const [logNote, setLogNote] = useState('');

  const detail = processes.find(p => p.id === detailId) || null;

  const stats = {
    total: processes.length,
    active: processes.filter(p => p.currentStageIndex < p.stages.length - 1).length,
    stuck: processes.filter(p => p.stages[p.currentStageIndex]?.status === 'in_progress' && p.stages.filter(s => s.status === 'done').length > 0).length,
  };

  async function handleAdd() {
    if (!form.title || !form.responsible) {
      toast({ title: 'عنوان فرآیند و مسئول اولین مرحله الزامی است', variant: 'destructive' });
      return;
    }
    await create({
      code: `WF-${6000 + processes.length + 1}`,
      type: form.type as WorkflowProcess['type'], title: form.title,
      currentStageIndex: 0, createdBy: 'کاربر سیستم',
      createdAt: new Date().toISOString(),
      stages: [
        { name: 'شروع فرآیند', responsible: form.responsible, status: 'in_progress', startedAt: new Date().toISOString(), logs: [{ at: new Date().toISOString(), by: 'کاربر سیستم', action: 'فرآیند ایجاد شد' }] },
        { name: 'بررسی و تأیید', responsible: 'مدیرعامل', status: 'pending', logs: [] },
        { name: 'اجرا', responsible: form.responsible, status: 'pending', logs: [] },
        { name: 'کنترل و بستن', responsible: 'مدیرعامل', status: 'pending', logs: [] },
      ],
    } as Partial<WorkflowProcess>);
    setForm({ title: '', type: 'custom', responsible: '' });
    setOpen(false);
    toast({ title: 'فرآیند جدید ایجاد شد' });
  }

  async function advance(p: WorkflowProcess) {
    const stages = [...p.stages];
    stages[p.currentStageIndex] = {
      ...stages[p.currentStageIndex], status: 'done', completedAt: new Date().toISOString(),
      logs: [...stages[p.currentStageIndex].logs, { at: new Date().toISOString(), by: 'کاربر سیستم', action: 'مرحله تکمیل شد' }],
    };
    const nextIdx = p.currentStageIndex + 1;
    if (nextIdx < stages.length) {
      stages[nextIdx] = { ...stages[nextIdx], status: 'in_progress', startedAt: new Date().toISOString() };
    }
    await update({ id: p.id, stages, currentStageIndex: Math.min(nextIdx, stages.length - 1) });
    if (nextIdx >= stages.length - 1) {
      await update({ id: p.id, currentStageIndex: stages.length - 1 });
      stages[stages.length - 1] = { ...stages[stages.length - 1], status: 'done', completedAt: new Date().toISOString() };
      await update({ id: p.id, stages });
      toast({ title: 'فرآیند کامل شد ✓', description: p.title });
    } else {
      toast({ title: 'مرحله پیشرفت کرد', description: `${p.title} → ${stages[nextIdx].name}` });
    }
  }

  async function rejectStage(p: WorkflowProcess) {
    const note = window.prompt('دلیل رد مرحله:') || '';
    const stages = [...p.stages];
    stages[p.currentStageIndex] = {
      ...stages[p.currentStageIndex], status: 'rejected',
      logs: [...stages[p.currentStageIndex].logs, { at: new Date().toISOString(), by: 'کاربر سیستم', action: 'مرحله رد شد', note }],
    };
    await update({ id: p.id, stages });
    toast({ title: 'مرحله رد شد', variant: 'destructive' });
  }

  async function addLog(p: WorkflowProcess) {
    if (!logNote.trim()) return;
    const stages = [...p.stages];
    stages[p.currentStageIndex] = {
      ...stages[p.currentStageIndex],
      logs: [...stages[p.currentStageIndex].logs, { at: new Date().toISOString(), by: 'کاربر سیستم', action: 'یادداشت', note: logNote }],
    };
    await update({ id: p.id, stages });
    setLogNote('');
    toast({ title: 'یادداشت در لاگ فرآیند ثبت شد' });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="اتوماسیون فرآیندها"
        description="هر فرآیند دارای مسئول، وضعیت، زمان، تاریخچه و لاگ است — وابستگی به افراد حذف می‌شود"
        action={<Button className="gap-1.5" onClick={() => setOpen(true)}><GitBranch className="h-4 w-4" /> فرآیند جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <KpiCard title="کل فرآیندها" value={faNumber(stats.total)} icon={GitBranch} tone="amber" />
        <KpiCard title="فرآیندهای جاری" value={faNumber(stats.active)} icon={ArrowLeft} tone="teal" />
        <KpiCard title="در جریان اجرا" value={faNumber(stats.stuck)} sub="مرحله فعال" icon={History} tone="zinc" />
      </div>

      {loading ? <LoadingTable rows={4} /> : (
        <div className="space-y-4">
          {processes.map(p => (
            <div key={p.id} className="rounded-xl border bg-card shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">{p.code}</span>
                    <StatusPill label={typeLabels[p.type]} />
                  </div>
                  <div className="text-sm font-bold mt-1">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    ایجاد: {p.createdBy} · {jdate(p.createdAt)} {p.relatedRef && `· مرجع: ${p.relatedRef}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailId(p.id)}>جزئیات و لاگ</Button>
                  {p.currentStageIndex < p.stages.length - 1 && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => advance(p)}>تکمیل مرحله <ArrowLeft className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => rejectStage(p)}><CircleX className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
              {/* استپر مراحل */}
              <div className="flex items-start overflow-x-auto gap-1 pb-1">
                {p.stages.map((s, i) => (
                  <div key={i} className="flex items-center gap-1 shrink-0">
                    <div className={`rounded-lg border px-2.5 py-1.5 min-w-24 text-center ${i === p.currentStageIndex ? 'ring-2 ring-amber-300' : ''}`}>
                      <div className="text-[10px] text-muted-foreground mb-0.5">{faNumber(i + 1)}</div>
                      <div className="text-[11px] font-medium whitespace-nowrap">{s.name}</div>
                      <div className="mt-1"><StatusPill label={s.responsible} tone={stageTone[s.status]} /></div>
                    </div>
                    {i < p.stages.length - 1 && <div className="h-px w-4 bg-border mt-6" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* فرآیند جدید */}
      <FormDialog open={open} onOpenChange={setOpen} title="ایجاد فرآیند جدید" description="قالب چهارمرحله‌ای: شروع → تأیید → اجرا → کنترل">
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>عنوان فرآیند *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثلاً: فرآیند آماده‌سازی خودرو برای فروش" /></div>
          <div className="space-y-1.5">
            <Label>نوع</Label>
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>مسئول مرحله اول *</Label><Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
          <Button onClick={handleAdd}>ایجاد فرآیند</Button>
        </div>
      </FormDialog>

      {/* جزئیات و لاگ */}
      <DetailDrawer open={!!detail} onOpenChange={v => !v && setDetailId(null)} title={detail ? `${detail.code} — ${detail.title}` : ''} description={detail ? `مرحله ${faNumber(detail.currentStageIndex + 1)} از ${faNumber(detail.stages.length)}` : ''}>
        {detail && (
          <div className="space-y-4">
            <div className="space-y-2">
              {detail.stages.map((s, i) => (
                <div key={i} className={`rounded-xl border p-3 ${i === detail.currentStageIndex ? 'border-amber-300 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/10' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold">{faNumber(i + 1)}. {s.name}</div>
                    <StatusPill label={s.status === 'done' ? 'تکمیل' : s.status === 'in_progress' ? 'در جریان' : s.status === 'rejected' ? 'رد شده' : 'در انتظار'} tone={stageTone[s.status]} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    مسئول: {s.responsible}
                    {s.startedAt && ` · شروع: ${jdatetime(s.startedAt)}`}
                    {s.completedAt && ` · پایان: ${jdatetime(s.completedAt)}`}
                  </div>
                  {s.logs.length > 0 && (
                    <div className="mt-2 space-y-1 border-t pt-2">
                      {s.logs.map((l, j) => (
                        <div key={j} className="text-[11px] text-muted-foreground">
                          <b className="text-foreground">{l.action}</b> — {l.by} · {jdatetime(l.at)}{l.note ? ` — ${l.note}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={logNote} onChange={e => setLogNote(e.target.value)} placeholder="یادداشت برای مرحله جاری..." className="flex-1" />
              <Button onClick={() => addLog(detail)}>ثبت در لاگ</Button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
