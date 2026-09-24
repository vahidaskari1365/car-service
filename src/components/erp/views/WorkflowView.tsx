'use client';

// ─── اتوماسیون فرآیندها: طراح گرافیکی زنده (n8n-مانند) + فرآیندهای جاری ───
import { useEffect, useRef, useState } from 'react';
import {
  GitBranch, ArrowLeft, CircleX, History, Zap, Wrench, Split, UserCheck,
  BellRing, Timer, Flag, Play, Save, Trash2, FilePlus2, Sparkles, Loader2,
  CheckCircle2, XCircle, SkipForward, TriangleAlert, MousePointerClick, Link2,
  Activity, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatusPill, FormDialog, LoadingTable, DetailDrawer, KpiCard } from '../shared';
import { useEntity } from '../use-erp';
import { getActorName } from '@/lib/actor';
import { KIND_DEFS, configSummary } from '@/lib/flow-defs';
import { uid, faNumber, jdate, jdatetime } from '@/lib/erp-utils';
import type { FlowDef, FlowEdge, FlowNode, FlowNodeKind, FlowNodeState, WorkflowProcess } from '@/lib/erp-types';

// ─── ثابت‌های بوم ───
const NODE_W = 180;
const NODE_H = 64;
const CANVAS_W = 2000;
const CANVAS_H = 1300;

const KIND_ICON: Record<FlowNodeKind, LucideIcon> = {
  trigger: Zap, task: Wrench, condition: Split, approval: UserCheck,
  notify: BellRing, delay: Timer, end: Flag,
};

interface RunResult { nodeId: string; status: 'success' | 'error'; message: string; durationMs: number }
interface RunResponse {
  path: string[];
  results: RunResult[];
  skipped: { nodeId: string; reason: string }[];
  warnings: string[];
  summary: { total: number; ok: number; failed: number; durationMs: number };
  error?: string;
}
interface LogEntry { nodeId: string | null; label: string; status: 'success' | 'error' | 'skipped' | 'warning'; message: string; durationMs: number }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** قالب نمونه با شناسه‌های تازه */
function sampleTemplate(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const ids = Array.from({ length: 9 }, () => uid('n'));
  const [a, b, c, d, e, f, g, h, i] = ids;
  return {
    nodes: [
      { id: a, kind: 'trigger', label: 'درخواست مشتری', config: { event: 'customer_request' }, x: 30, y: 150 },
      { id: b, kind: 'task', label: 'بررسی موجودی نمایشگاه', config: { action: 'check_inventory', responsible: 'کارشناس فروش' }, x: 265, y: 150 },
      { id: c, kind: 'condition', label: 'خودرو آماده فروش هست؟', config: { cond: 'has_stock' }, x: 500, y: 150 },
      { id: d, kind: 'task', label: 'بررسی مدارک مشتری', config: { action: 'check_customer', responsible: 'کارشناس فروش' }, x: 735, y: 55 },
      { id: e, kind: 'approval', label: 'تأیید مدیر فروش', config: { approver: 'مدیر فروشگاه' }, x: 970, y: 55 },
      { id: f, kind: 'notify', label: 'اطلاع به مشتری', config: { channel: 'sms', recipient: '09121234567' }, x: 1205, y: 55 },
      { id: g, kind: 'task', label: 'ثبت قرارداد فروش', config: { action: 'register_docs', responsible: 'واحد قراردادها' }, x: 1440, y: 55 },
      { id: h, kind: 'end', label: 'تحویل و پایان', config: {}, x: 1675, y: 55 },
      { id: i, kind: 'notify', label: 'به مشتری اطلاع بده موجودی نیست', config: { channel: 'app', recipient: 'کارشناس فروش' }, x: 735, y: 265 },
    ],
    edges: [
      { id: uid('e'), from: a, to: b },
      { id: uid('e'), from: b, to: c },
      { id: uid('e'), from: c, to: d, label: 'بله' },
      { id: uid('e'), from: d, to: e },
      { id: uid('e'), from: e, to: f },
      { id: uid('e'), from: f, to: g },
      { id: uid('e'), from: g, to: h },
      { id: uid('e'), from: c, to: i, label: 'خیر' },
    ],
  };
}

// ═══════════════════ طراح گرافیکی فرآیند ═══════════════════
function FlowDesigner() {
  const { items: flows, refresh: refreshFlows } = useEntity<FlowDef>('flows');
  const { toast } = useToast();
  // یک نمونه واحد تا شناسه‌های نود و یال قالب هم‌خوان بمانند
  const [initialTemplate] = useState(() => sampleTemplate());

  const [flowId, setFlowId] = useState<string | null>(null);
  const [flowName, setFlowName] = useState('فرآیند فروش خودرو (نمونه)');
  const [nodes, setNodes] = useState<FlowNode[]>(initialTemplate.nodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialTemplate.edges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // وضعیت اجرای تست
  const [running, setRunning] = useState(false);
  const [states, setStates] = useState<Record<string, FlowNodeState>>({});
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<RunResponse['summary'] | null>(null);

  const connectingRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectingRef.current = connecting;
  }, [connecting]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [log.length]);

  const labelOf = (id: string | null) => (id ? nodes.find(n => n.id === id)?.label || 'نود' : '—');
  const nodeById = (id: string) => nodes.find(n => n.id === id);
  const hasTrigger = nodes.some(n => n.kind === 'trigger');

  function touch() { setDirty(true); }

  // ─── افزودن نود ───
  function addNode(kind: FlowNodeKind) {
    if (runningRef.current) return;
    const n = nodes.length;
    const node: FlowNode = {
      id: uid('n'), kind,
      label: KIND_DEFS[kind].fa,
      config: kind === 'trigger' ? { event: 'customer_request' } : kind === 'condition' ? { cond: 'has_stock' } : {},
      x: 30 + (n % 5) * 245, y: 60 + Math.floor(n / 5) * 140,
    };
    setNodes(ns => [...ns, node]);
    setSelectedNode(node.id);
    setSelectedEdge(null);
    touch();
  }

  // ─── حذف نود / یال ───
  function deleteNode(id: string) {
    if (runningRef.current) return;
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.from !== id && e.to !== id));
    setSelectedNode(null);
    touch();
  }
  function deleteEdge(id: string) {
    if (runningRef.current) return;
    setEdges(es => es.filter(e => e.id !== id));
    setSelectedEdge(null);
    touch();
  }

  // ─── اتصال نودها ───
  function startConnect(id: string, ev: React.PointerEvent) {
    ev.stopPropagation();
    if (runningRef.current) return;
    setConnecting(id);
    setSelectedNode(null);
    setSelectedEdge(null);
  }
  function completeConnect(targetId: string) {
    const from = connectingRef.current;
    setConnecting(null);
    setGhost(null);
    if (!from || from === targetId || runningRef.current) return;
    setEdges(es => {
      if (es.some(e => e.from === from && e.to === targetId)) return es;
      const fromNode = nodeById(from);
      let label: string | undefined;
      if (fromNode?.kind === 'condition') {
        const outs = es.filter(e => e.from === from);
        if (!outs.some(x => x.label === 'بله')) label = 'بله';
        else if (!outs.some(x => x.label === 'خیر')) label = 'خیر';
      }
      return [...es, { id: uid('e'), from, to: targetId, label }];
    });
    touch();
  }
  function cancelConnect() { setConnecting(null); setGhost(null); }

  // ─── درگ نود ───
  function onNodePointerDown(node: FlowNode, ev: React.PointerEvent) {
    if (runningRef.current) return;
    ev.stopPropagation();
    const startX = ev.clientX, startY = ev.clientY;
    const origX = node.x, origY = node.y;
    let moved = false;
    const onMove = (e2: PointerEvent) => {
      const dx = e2.clientX - startX, dy = e2.clientY - startY;
      if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      moved = true;
      setNodes(ns => ns.map(n => n.id === node.id
        ? { ...n, x: Math.max(4, Math.min(CANVAS_W - NODE_W - 4, origX + dx)), y: Math.max(4, Math.min(CANVAS_H - NODE_H - 4, origY + dy)) }
        : n));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) { touch(); return; }
      if (connectingRef.current) { completeConnect(node.id); return; }
      setSelectedNode(node.id);
      setSelectedEdge(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onCanvasPointerMove(ev: React.PointerEvent) {
    if (!connectingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setGhost({ x: ev.clientX - rect.left + el.scrollLeft, y: ev.clientY - rect.top + el.scrollTop });
  }
  function onCanvasBgClick(ev: React.MouseEvent) {
    const t = ev.target as HTMLElement;
    // کلیک روی خودِ نود/پیام‌های نود/برچسب یال نباید انتخاب را پاک کند
    if (t.closest('.wf-node') || t.closest('.wf-node-msg') || t.closest('button')) return;
    cancelConnect();
    setSelectedNode(null);
    setSelectedEdge(null);
  }

  // ─── ذخیره / بارگذاری ───
  async function saveFlow() {
    if (!flowName.trim()) { toast({ title: 'نام فرآیند را وارد کنید', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const headers = { 'Content-Type': 'application/json', 'X-User': encodeURIComponent(getActorName()) };
      if (flowId) {
        const res = await fetch('/api/flows', { method: 'PUT', headers, body: JSON.stringify({ id: flowId, name: flowName, nodes, edges }) });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch('/api/flows', { method: 'POST', headers, body: JSON.stringify({ name: flowName, nodes, edges }) });
        const json = await res.json();
        if (!res.ok) throw new Error();
        if (json.data?.id) setFlowId(json.data.id);
      }
      await refreshFlows();
      setDirty(false);
      toast({ title: 'فرآیند ذخیره شد ✓', description: flowName });
    } catch {
      toast({ title: 'خطا در ذخیره فرآیند', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  function loadFlow(id: string) {
    const f = flows.find(x => x.id === id);
    if (!f) return;
    setFlowId(f.id);
    setFlowName(f.name);
    setNodes(JSON.parse(JSON.stringify(f.nodes)));
    setEdges(JSON.parse(JSON.stringify(f.edges)));
    setSelectedNode(null); setSelectedEdge(null);
    setStates({}); setMsgs({}); setLog([]); setSummary(null);
    setDirty(false);
  }

  function newFlow() {
    setFlowId(null); setFlowName(''); setNodes([]); setEdges([]);
    setSelectedNode(null); setSelectedEdge(null);
    setStates({}); setMsgs({}); setLog([]); setSummary(null);
    setDirty(false);
  }
  function loadSample() {
    const t = sampleTemplate();
    setNodes(t.nodes); setEdges(t.edges);
    setFlowName('فرآیند نمونه فروش');
    setStates({}); setMsgs({}); setLog([]); setSummary(null);
    setDirty(true);
  }
  async function removeFlow() {
    if (!flowId) return;
    await fetch(`/api/flows?id=${flowId}`, { method: 'DELETE', headers: { 'X-User': encodeURIComponent(getActorName()) } });
    await refreshFlows();
    newFlow();
    toast({ title: 'فرآیند حذف شد' });
  }

  // ─── اجرای تست فرایند (قلب سیستم — مانند n8n) ───
  async function runTest() {
    if (runningRef.current || nodes.length === 0) return;
    setRunning(true);
    setStates(Object.fromEntries(nodes.map(n => [n.id, 'idle' as FlowNodeState])));
    setMsgs({}); setLog([]); setSummary(null); setActiveEdge(null);
    try {
      const res = await fetch('/api/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User': encodeURIComponent(getActorName()) },
        body: JSON.stringify({ flow: { id: flowId || 'tmp', name: flowName || 'فرآیند بدون نام', nodes, edges } }),
      });
      const json = await res.json() as RunResponse;
      if (!res.ok || json.error) {
        toast({ title: json.error || 'خطا در اجرای تست فرآیند', variant: 'destructive' });
        return;
      }
      for (const r of json.results) {
        setActiveEdge(edges.find(e => e.to === r.nodeId)?.id || null);
        setStates(st => ({ ...st, [r.nodeId]: 'running' }));
        await sleep(640);
        setStates(st => ({ ...st, [r.nodeId]: r.status }));
        setMsgs(m => ({ ...m, [r.nodeId]: r.message }));
        setLog(l => [...l, { nodeId: r.nodeId, label: labelOf(r.nodeId), status: r.status, message: r.message, durationMs: r.durationMs }]);
        await sleep(r.status === 'error' ? 460 : 200);
        setActiveEdge(null);
      }
      for (const s of json.skipped) {
        setStates(st => ({ ...st, [s.nodeId]: 'skipped' }));
        setMsgs(m => ({ ...m, [s.nodeId]: s.reason }));
        setLog(l => [...l, { nodeId: s.nodeId, label: labelOf(s.nodeId), status: 'skipped', message: s.reason, durationMs: 0 }]);
      }
      for (const w of json.warnings) {
        setLog(l => [...l, { nodeId: null, label: 'هشدار ساختار', status: 'warning', message: w, durationMs: 0 }]);
      }
      setSummary(json.summary);
      const allOk = json.summary.failed === 0;
      if (flowId) {
        fetch('/api/flows', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User': encodeURIComponent(getActorName()) },
          body: JSON.stringify({ id: flowId, lastTestAt: new Date().toISOString(), lastTestOk: allOk }),
        }).catch(() => {});
      }
      const failMsg = json.results.find(r => r.status === 'error')?.message;
      if (allOk) {
        toast({ title: `تست موفق — ${faNumber(json.summary.ok)} مرحله سبز شد ✓`, description: `${flowName} · ${faNumber(json.summary.durationMs)}ms` });
      } else {
        toast({ title: 'تست با خطا متوقف شد', description: failMsg, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'ارتباط با سرور برقرار نشد', variant: 'destructive' });
    } finally {
      setRunning(false);
      setActiveEdge(null);
    }
  }

  // ─── محاسبه مسیر بِزیه ───
  function edgeGeom(e: FlowEdge) {
    const from = nodeById(e.from), to = nodeById(e.to);
    if (!from || !to) return null;
    const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2;
    const x2 = to.x, y2 = to.y + NODE_H / 2;
    const dx = Math.max(46, Math.abs(x2 - x1) / 2);
    return { x1, y1, x2, y2, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
  }

  function edgeClass(e: FlowEdge): string {
    const targetState = states[e.to];
    if (activeEdge === e.id) return 'stroke-amber-500 wf-edge-active';
    if (targetState === 'success') return 'stroke-emerald-500';
    if (targetState === 'error') return 'stroke-red-500';
    if (targetState === 'skipped') return 'stroke-zinc-300 dark:stroke-zinc-700';
    return 'stroke-zinc-400 dark:stroke-zinc-600';
  }
  function edgeMarker(e: FlowEdge): string {
    const targetState = states[e.to];
    if (activeEdge === e.id) return 'url(#wf-arrow-active)';
    if (targetState === 'success') return 'url(#wf-arrow-success)';
    if (targetState === 'error') return 'url(#wf-arrow-error)';
    return 'url(#wf-arrow)';
  }

  const selNode = selectedNode ? nodeById(selectedNode) : null;
  const selEdge = selectedEdge ? edges.find(e => e.id === selectedEdge) : null;

  return (
    <div className="space-y-3">
      {/* ─── نوار ابزار ─── */}
      <div className="rounded-xl border bg-card shadow-sm p-2.5 flex flex-wrap items-center gap-2">
        <Select value={flowId || undefined} onValueChange={loadFlow}>
          <SelectTrigger className="w-56 h-8 text-xs"><SelectValue placeholder="بارگذاری فرآیند ذخیره‌شده…" /></SelectTrigger>
          <SelectContent>
            {flows.map(f => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}{f.lastTestOk === true ? ' ✓' : f.lastTestOk === false ? ' ✗' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={newFlow}><FilePlus2 className="h-3.5 w-3.5" /> فرآیند جدید</Button>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={loadSample}><Sparkles className="h-3.5 w-3.5" /> قالب نمونه</Button>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={saveFlow} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} ذخیره
        </Button>
        {flowId && (
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-red-600 hover:text-red-700" onClick={removeFlow}><Trash2 className="h-3.5 w-3.5" /> حذف</Button>
        )}
        <Input value={flowName} onChange={e => { setFlowName(e.target.value); touch(); }} placeholder="نام فرآیند…" className="w-52 h-8 text-xs" />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-md bg-muted px-1.5 py-0.5">{faNumber(nodes.length)} نود</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5">{faNumber(edges.length)} اتصال</span>
          {dirty && <span className="rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 px-1.5 py-0.5">ذخیره نشده</span>}
          {!hasTrigger && <span className="rounded-md bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300 px-1.5 py-0.5">نود شروع لازم است</span>}
        </div>
        {/* دکمه پایانی: تست فرایند */}
        <Button className="h-9 gap-1.5 ms-auto font-bold shadow-md" onClick={runTest} disabled={running || nodes.length === 0}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'در حال اجرای تست…' : 'تست فرایند'}
        </Button>
      </div>

      {/* خلاصه نتیجه تست */}
      {summary && (
        <div className="flex flex-wrap items-center gap-2 text-xs wf-log-enter">
          <span className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 px-2.5 py-1 font-bold">
            ✓ {faNumber(summary.ok)} مرحله موفق
          </span>
          <span className={`rounded-lg border px-2.5 py-1 font-bold ${summary.failed ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-400'}`}>
            {summary.failed ? `✗ ${faNumber(summary.failed)} خطا` : 'بدون خطا'}
          </span>
          <span className="rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-500/30 dark:bg-zinc-500/10 dark:text-zinc-400 px-2.5 py-1">
            {faNumber(summary.total - summary.ok - summary.failed)} گره اجرا نشده
          </span>
          <span className="text-muted-foreground">زمان کل: {faNumber(summary.durationMs)} میلی‌ثانیه</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 items-stretch">
        {/* ─── پالت انواع نود ─── */}
        <div className="rounded-xl border bg-card shadow-sm p-2 w-full lg:w-44 shrink-0 space-y-1">
          <div className="text-[11px] font-bold text-muted-foreground px-1 pb-1 border-b mb-1.5">افزودن گره</div>
          {(Object.keys(KIND_DEFS) as FlowNodeKind[]).map(kind => {
            const Icon = KIND_ICON[kind];
            return (
              <button
                key={kind}
                onClick={() => addNode(kind)}
                disabled={running}
                className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-right hover:bg-muted transition-colors disabled:opacity-50 group"
              >
                <span className={`h-7 w-7 rounded-lg grid place-items-center shrink-0 ${KIND_DEFS[kind].tone}`}><Icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold leading-4">{KIND_DEFS[kind].fa}</span>
                  <span className="block text-[10px] text-muted-foreground leading-3.5 truncate">{KIND_DEFS[kind].desc}</span>
                </span>
              </button>
            );
          })}
          <div className="text-[10px] text-muted-foreground leading-4 pt-2 border-t mt-1.5 flex items-start gap-1">
            <MousePointerClick className="h-3 w-3 mt-0.5 shrink-0" />
            برای اتصال: روی دایرهٔ خروجی نود کلیک کنید، سپس نود مقصد را بزنید.
          </div>
        </div>

        {/* ─── بوم ─── */}
        <div className="flex-1 min-w-0 space-y-2">
          <div
            ref={scrollRef}
            dir="ltr"
            className="relative overflow-auto wf-canvas-bg rounded-xl border shadow-inner h-[520px]"
            onPointerMove={onCanvasPointerMove}
            onClick={onCanvasBgClick}
          >
            <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
              <svg width={CANVAS_W} height={CANVAS_H} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                <defs>
                  <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="fill-zinc-400 dark:fill-zinc-600" /></marker>
                  <marker id="wf-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="fill-amber-500" /></marker>
                  <marker id="wf-arrow-success" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="fill-emerald-500" /></marker>
                  <marker id="wf-arrow-error" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="fill-red-500" /></marker>
                </defs>
                {/* خط اتصال شبح هنگام وصل کردن */}
                {connecting && ghost && (() => {
                  const from = nodeById(connecting);
                  if (!from) return null;
                  const x1 = from.x + NODE_W, y1 = from.y + NODE_H / 2;
                  return <line x1={x1} y1={y1} x2={ghost.x} y2={ghost.y} stroke="oklch(0.77 0.16 70)" strokeWidth={2} strokeDasharray="6 4" />;
                })()}
                {edges.map(e => {
                  const g = edgeGeom(e);
                  if (!g) return null;
                  return (
                    <g key={e.id}>
                      <path d={g.d} fill="none" strokeWidth={16} stroke="transparent" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                        onPointerDown={ev => { ev.stopPropagation(); if (!runningRef.current) { setSelectedEdge(e.id); setSelectedNode(null); cancelConnect(); } }} />
                      <path d={g.d} fill="none" strokeWidth={activeEdge === e.id ? 2.5 : 2} className={`${edgeClass(e)} wf-node`} markerEnd={edgeMarker(e)} />
                    </g>
                  );
                })}
              </svg>

              {/* برچسب یال‌ها (بله/خیر) */}
              {edges.filter(e => e.label).map(e => {
                const g = edgeGeom(e);
                if (!g) return null;
                return (
                  <button
                    key={e.id}
                    dir="rtl"
                    onClick={ev => { ev.stopPropagation(); if (!runningRef.current) { setSelectedEdge(e.id); setSelectedNode(null); } }}
                    className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold rounded-full px-2 py-0.5 border shadow-sm transition-transform hover:scale-110 ${e.label === 'بله'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30'}`}
                    style={{ left: g.mx, top: g.my }}
                  >
                    {e.label}
                  </button>
                );
              })}

              {/* نودها */}
              {nodes.map(n => {
                const Icon = KIND_ICON[n.kind];
                const st = states[n.id] || 'idle';
                const msg = msgs[n.id];
                const isSel = selectedNode === n.id;
                const box = [
                  // ⚠️ باید relative بماند: اگر absolute باشد ارتفاع والده صفر می‌شود و پیام‌های وضعیت روی خود نود می‌افتند
                  'wf-node relative rounded-xl border-2 bg-card shadow-md cursor-grab active:cursor-grabbing',
                  st === 'running' && 'border-amber-400 ring-2 ring-amber-300/70 wf-running',
                  st === 'success' && 'border-emerald-500 ring-2 ring-emerald-400/60 wf-pop',
                  st === 'error' && 'border-red-500 ring-2 ring-red-400/60 wf-shake',
                  st === 'skipped' && 'border-dashed border-zinc-300 dark:border-zinc-700 opacity-50',
                  st === 'idle' && !isSel && 'border-border hover:border-primary/50',
                  isSel && st === 'idle' && 'border-primary ring-2 ring-primary/30',
                ].filter(Boolean).join(' ');
                return (
                  <div key={n.id} className="absolute" style={{ left: n.x, top: n.y, width: NODE_W }}>
                    <div
                      className={box}
                      style={{ width: NODE_W, minHeight: NODE_H }}
                      onPointerDown={ev => onNodePointerDown(n, ev)}
                    >
                      {/* پورت ورودی و خروجی */}
                      <span className="absolute -left-[7px] top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-600 border-2 border-background" />
                      <span
                        className="wf-port absolute -right-[7px] top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-background shadow hover:scale-150 transition-transform"
                        title="اتصال به نود بعدی"
                        onPointerDown={ev => startConnect(n.id, ev)}
                      />
                      <div className="flex items-start gap-2 p-2" dir="rtl">
                        <span className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${KIND_DEFS[n.kind].tone}`}>
                          {st === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-amber-600" /> : <Icon className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold leading-4 truncate" title={n.label}>{n.label}</span>
                          <span className="block text-[9.5px] text-muted-foreground leading-3.5 truncate" title={configSummary(n.kind, n.config)}>
                            {configSummary(n.kind, n.config)}
                          </span>
                        </span>
                      </div>
                      {/* نشان وضعیت */}
                      {st === 'success' && <span className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-emerald-500 grid place-items-center shadow"><CheckCircle2 className="h-3.5 w-3.5 text-white" /></span>}
                      {st === 'error' && <span className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-red-500 grid place-items-center shadow"><XCircle className="h-3.5 w-3.5 text-white" /></span>}
                      {st === 'skipped' && <span className="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-zinc-400 dark:bg-zinc-600 grid place-items-center shadow"><SkipForward className="h-3 w-3 text-white" /></span>}
                    </div>
                    {/* پیام وضعیت زیر نود — علت خطا یا خروجی موفق */}
                    {msg && st === 'error' && (
                      <div dir="rtl" title={msg} className="wf-node-msg wf-log-enter absolute top-full mt-1.5 w-full rounded-lg bg-red-600 text-white text-[10px] leading-4 px-2 py-1.5 shadow-lg z-30 line-clamp-3">
                        ✗ {msg}
                      </div>
                    )}
                    {msg && st === 'success' && (
                      <div dir="rtl" title={msg} className="wf-node-msg wf-log-enter absolute top-full mt-1.5 w-full rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] leading-4 px-2 py-1.5 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 z-10 line-clamp-2">
                        ✓ {msg} <span className="opacity-60">({faNumber(Math.round((log.find(l => l.nodeId === n.id)?.durationMs || 0)))}ms)</span>
                      </div>
                    )}
                    {st === 'running' && (
                      <div dir="rtl" className="absolute top-full mt-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 shadow wf-log-enter">در حال اجرا…</div>
                    )}
                    {st === 'skipped' && msg && (
                      <div dir="rtl" title={msg} className="wf-node-msg wf-log-enter absolute top-full mt-1.5 w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 text-[10px] leading-4 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400 z-10 line-clamp-2">
                        {msg}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* حالت خالی */}
              {nodes.length === 0 && (
                <div dir="rtl" className="absolute inset-0 grid place-items-center">
                  <div className="rounded-2xl border-2 border-dashed bg-card/80 backdrop-blur p-6 text-center space-y-3 max-w-xs">
                    <GitBranch className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div className="text-sm font-bold">بوم خالی است</div>
                    <div className="text-[11px] text-muted-foreground leading-5">گره «رویداد شروع» را از پالت اضافه کنید یا قالب آماده را بارگذاری کنید.</div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => addNode('trigger')}><Zap className="h-3.5 w-3.5" /> نود شروع</Button>
                      <Button size="sm" className="gap-1" onClick={loadSample}><Sparkles className="h-3.5 w-3.5" /> قالب نمونه</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* راهنمای رنگ‌ها */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground px-1">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> موفق</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> خطا + نمایش علت</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> در حال اجرا</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" /> ردشده / اجرا نشده</span>
            <span>· هر گره در تست، واقعاً روی داده‌های زنده سامانه اجرا و بررسی می‌شود</span>
          </div>
        </div>

        {/* ─── پنل تنظیمات ─── */}
        <div className="w-full lg:w-64 shrink-0 space-y-3">
          <div className="rounded-xl border bg-card shadow-sm p-3 min-h-[220px]">
            {!selNode && !selEdge && (
              <div className="text-center text-[11px] text-muted-foreground space-y-2 pt-8">
                <MousePointerClick className="h-6 w-6 mx-auto opacity-50" />
                <p>یک گره یا اتصال را روی بوم انتخاب کنید تا تنظیمات آن اینجا نمایش داده شود.</p>
              </div>
            )}
            {selNode && (() => {
              const def = KIND_DEFS[selNode.kind];
              const st = states[selNode.id];
              const msg = msgs[selNode.id];
              return (
                <div className="space-y-3" dir="rtl">
                  <div className="flex items-center gap-2">
                    <span className={`h-8 w-8 rounded-lg grid place-items-center ${def.tone}`}>{(() => { const I = KIND_ICON[selNode.kind]; return <I className="h-4 w-4" />; })()}</span>
                    <div>
                      <div className="text-xs font-bold">{def.fa}</div>
                      <div className="text-[10px] text-muted-foreground">{def.desc}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">عنوان گره</Label>
                    <Input className="h-8 text-xs" value={selNode.label} onChange={e => { setNodes(ns => ns.map(x => x.id === selNode.id ? { ...x, label: e.target.value } : x)); touch(); }} />
                  </div>
                  {def.fields.map(fld => {
                    if (fld.showIf && selNode.config[fld.showIf.key] !== fld.showIf.equals) return null;
                    return (
                      <div key={fld.key} className="space-y-1.5">
                        <Label className="text-[11px]">{fld.label}{fld.required && ' *'}</Label>
                        {fld.type === 'select' ? (
                          <Select value={selNode.config[fld.key] || undefined} onValueChange={v => { setNodes(ns => ns.map(x => x.id === selNode.id ? { ...x, config: { ...x.config, [fld.key]: v } } : x)); touch(); }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="انتخاب کنید…" /></SelectTrigger>
                            <SelectContent>
                              {fld.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-8 text-xs"
                            type={fld.type === 'number' ? 'number' : 'text'}
                            value={selNode.config[fld.key] || ''}
                            placeholder={fld.placeholder}
                            onChange={e => { setNodes(ns => ns.map(x => x.id === selNode.id ? { ...x, config: { ...x.config, [fld.key]: e.target.value } } : x)); touch(); }}
                          />
                        )}
                      </div>
                    );
                  })}
                  {msg && (st === 'success' || st === 'error') && (
                    <div className={`rounded-lg text-[10.5px] leading-5 px-2.5 py-2 border ${st === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'}`}>
                      <b>خروجی تست:</b> {msg}
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="w-full text-red-600 h-7 text-xs gap-1" onClick={() => deleteNode(selNode.id)} disabled={running}>
                    <Trash2 className="h-3.5 w-3.5" /> حذف این گره
                  </Button>
                </div>
              );
            })()}
            {selEdge && (() => {
              const from = nodeById(selEdge.from), to = nodeById(selEdge.to);
              const fromNode = from ? KIND_DEFS[from.kind] : null;
              return (
                <div className="space-y-3" dir="rtl">
                  <div className="text-xs font-bold flex items-center gap-1.5"><Link2 /> اتصال</div>
                  <div className="text-[11px] leading-5 rounded-lg bg-muted p-2">
                    <b>{from?.label}</b> <span className="text-muted-foreground">({fromNode?.fa})</span>
                    <div className="my-1 text-center text-muted-foreground">↓</div>
                    <b>{to?.label}</b>
                  </div>
                  {from?.kind === 'condition' && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">برچسب مسیر (برای شرط)</Label>
                      <Select value={selEdge.label || 'none'} onValueChange={v => { setEdges(es => es.map(x => x.id === selEdge.id ? { ...x, label: v === 'none' ? undefined : v } : x)); touch(); }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون برچسب</SelectItem>
                          <SelectItem value="بله">بله (شرط برقرار)</SelectItem>
                          <SelectItem value="خیر">خیر (شرط برقرار نیست)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button size="sm" variant="ghost" className="w-full text-red-600 h-7 text-xs gap-1" onClick={() => deleteEdge(selEdge.id)} disabled={running}>
                    <Trash2 className="h-3.5 w-3.5" /> حذف این اتصال
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ─── گزارش زنده اجرای تست ─── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold">گزارش اجرای تست</span>
          {running && <span className="text-[10px] text-amber-600 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> در حال اجرا…</span>}
          {log.length > 0 && !running && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] ms-auto" onClick={() => { setLog([]); setStates({}); setMsgs({}); setSummary(null); }}>پاک کردن</Button>
          )}
        </div>
        <div ref={logRef} className="h-44 overflow-y-auto p-2 space-y-1">
          {log.length === 0 && (
            <div className="h-full grid place-items-center text-[11px] text-muted-foreground">
              دکمهٔ «تست فرایند» را بزنید تا اجرای گام‌به‌گام هر گره (موفق/خطا و علت آن) به‌صورت زنده اینجا ثبت شود.
            </div>
          )}
          {log.map((l, i) => {
            const iconMap = {
              success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />,
              error: <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />,
              skipped: <SkipForward className="h-3.5 w-3.5 text-zinc-400 shrink-0" />,
              warning: <TriangleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
            };
            return (
              <div key={i} className={`wf-log-enter flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] border ${l.status === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30' : l.status === 'success' ? 'bg-emerald-50/60 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20' : 'bg-muted/40 border-transparent'}`}>
                <span className="font-mono text-[9px] text-muted-foreground w-5 text-center">{faNumber(i + 1)}</span>
                {iconMap[l.status]}
                <b className="shrink-0 max-w-36 truncate" title={l.label}>{l.label}</b>
                <span className={`truncate flex-1 ${l.status === 'error' ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}`} title={l.message}>{l.message}</span>
                {l.durationMs > 0 && <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{faNumber(l.durationMs)}ms</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════ فرآیندهای جاری (اجرای واقعی) ═══════════════════
const stageTone: Record<string, string> = {
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  pending: 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30',
  rejected: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
};
const typeLabels: Record<string, string> = {
  purchase: 'خرید', repair: 'تعمیر', sale: 'فروش', rental: 'اجاره', custom: 'سفارشی',
};

function RunningProcesses() {
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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

// ═══════════════════ نمای اصلی ═══════════════════
export default function WorkflowView() {
  return (
    <div className="view-enter">
      <PageHeader
        title="اتوماسیون فرآیندها"
        description="طراح گرافیکی زنده فرآیند — بکشید، وصل کنید، تست بگیرید؛ هر گره واقعاً اجرا و نتیجه سبز/قرمز با علت خطا نمایش داده می‌شود"
      />
      <Tabs defaultValue="designer" className="mt-4">
        <TabsList className="mb-3">
          <TabsTrigger value="designer" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> طراح گرافیکی فرآیند</TabsTrigger>
          <TabsTrigger value="running" className="gap-1.5"><History className="h-3.5 w-3.5" /> فرآیندهای جاری</TabsTrigger>
        </TabsList>
        <TabsContent value="designer"><FlowDesigner /></TabsContent>
        <TabsContent value="running"><RunningProcesses /></TabsContent>
      </Tabs>
    </div>
  );
}
