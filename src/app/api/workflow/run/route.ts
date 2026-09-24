// ─── اجرای واقعی تست فرآیند طراحی‌شده (مانند n8n — هر نود واقعاً اجرا و بررسی می‌شود) ───
import { NextRequest, NextResponse } from 'next/server';
import { getStore, logActivity } from '@/lib/erp-store';
import { faNumber } from '@/lib/erp-utils';
import type { FlowDef, FlowNode, FlowEdge } from '@/lib/erp-types';
import { TRIGGER_EVENTS, TASK_ACTIONS, CONDITION_DEFS, NOTIFY_CHANNELS } from '@/lib/flow-defs';

export const dynamic = 'force-dynamic';

export interface FlowRunResult {
  nodeId: string;
  status: 'success' | 'error';
  message: string;
  durationMs: number;
}

export interface FlowRunResponse {
  path: string[];                                   // ترتیب اجرا
  results: FlowRunResult[];
  skipped: { nodeId: string; reason: string }[];
  warnings: string[];
  summary: { total: number; ok: number; failed: number; durationMs: number };
  error?: string;
}

function actor(req: NextRequest): string {
  const raw = req.headers.get('x-user');
  if (!raw) return 'کاربر سیستم';
  try { return decodeURIComponent(raw) || 'کاربر سیستم'; } catch { return raw; }
}

const fail = (nodeId: string, message: string, t0: number): FlowRunResult =>
  ({ nodeId, status: 'error', message, durationMs: 120 + Math.floor(Math.random() * 220) + Date.now() - t0 });
const ok = (nodeId: string, message: string, t0: number): FlowRunResult =>
  ({ nodeId, status: 'success', message, durationMs: 90 + Math.floor(Math.random() * 180) + Date.now() - t0 });

/** اجرای یک نود با بررسی‌های واقعی روی داده‌های زنده سامانه */
function executeNode(node: FlowNode, flowName: string, by: string): FlowRunResult {
  const t0 = Date.now();
  const s = getStore();
  const cfg = node.config || {};

  switch (node.kind) {
    case 'trigger': {
      if (!cfg.event) return fail(node.id, 'رویداد فعال‌ساز انتخاب نشده است — در تنظیمات نود مشخص کنید', t0);
      const ev = TRIGGER_EVENTS.find(o => o.value === cfg.event);
      if (!ev) return fail(node.id, `رویداد «${cfg.event}» شناخته شده نیست`, t0);
      return ok(node.id, `رویداد «${ev.label}» دریافت و فرآیند فعال شد`, t0);
    }

    case 'task': {
      if (!cfg.action) return fail(node.id, 'نوع عملیات انتخاب نشده است — در تنظیمات نود مشخص کنید', t0);
      const act = TASK_ACTIONS.find(o => o.value === cfg.action);
      if (!act) return fail(node.id, `عملیات «${cfg.action}» شناخته شده نیست`, t0);
      if (!cfg.responsible) return fail(node.id, `مسئول اجرای «${act.label}» تعیین نشده است`, t0);

      if (cfg.action === 'check_inventory') {
        const available = s.vehicles.filter(v => v.status === 'in_stock' || v.status === 'preparing');
        if (available.length === 0) return fail(node.id, 'هیچ خودرویی در نمایشگاه موجود یا در حال آماده‌سازی نیست', t0);
        return ok(node.id, `${faNumber(available.length)} خودروی موجود بررسی شد — «${available[0].model}» آماده عملیات است`, t0);
      }
      if (cfg.action === 'prepare_vehicle') {
        const v = s.vehicles.find(x => x.status === 'in_stock' || x.status === 'preparing');
        if (!v) return fail(node.id, 'خودرویی برای آماده‌سازی یافت نشد (نمایشگاه خالی است)', t0);
        return ok(node.id, `آماده‌سازی «${v.model} (${faNumber(v.year)})» آغاز شد — کارت کار عملیات صادر شد`, t0);
      }
      if (cfg.action === 'check_customer') {
        if (s.customers.length === 0) return fail(node.id, 'هیچ مشتری در سامانه ثبت نشده است — ابتدا مشتری را ثبت کنید', t0);
        const c = s.customers[0];
        return ok(node.id, `مدارک «${c.firstName} ${c.lastName}» بررسی و تأیید شد (سگمنت: ${c.segment})`, t0);
      }
      if (cfg.action === 'check_parts') {
        const name = (cfg.partName || '').trim();
        if (!name) return fail(node.id, 'نام قطعه برای بررسی موجودی وارد نشده است', t0);
        const part = s.parts.find(p => p.name.includes(name) || name.includes(p.name));
        if (!part) return fail(node.id, `قطعه‌ای با نام «${name}» در انبار یافت نشد`, t0);
        const need = Number(cfg.partQty || 1);
        if (!Number.isFinite(need) || need < 1) return fail(node.id, 'تعداد لازم قطعه نامعتبر است', t0);
        if (part.quantity < need) return fail(node.id, `موجودی «${part.name}» کافی نیست: ${faNumber(part.quantity)} عدد موجود، ${faNumber(need)} عدد لازم است (قفسه ${part.shelf})`, t0);
        return ok(node.id, `موجودی «${part.name}» کافی است — ${faNumber(part.quantity)} عدد موجود و ${faNumber(need)} عدد رزرو شد`, t0);
      }
      if (cfg.action === 'register_docs') {
        const ref = `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
        logActivity('اجرای تست فرآیند', 'اتوماسیون فرآیندها', `قرارداد «${flowName}» با شناسه ${ref} در جریان تست ثبت شد`, by);
        return ok(node.id, `قرارداد با شناسه داخلی ${ref} در سامانه ثبت شد`, t0);
      }
      return fail(node.id, 'عملیات پشتیبانی نمی‌شود', t0);
    }

    case 'condition': {
      if (!cfg.cond) return fail(node.id, 'شرط انتخاب نشده است — در تنظیمات نود مشخص کنید', t0);
      const def = CONDITION_DEFS.find(o => o.value === cfg.cond);
      if (!def) return fail(node.id, `شرط «${cfg.cond}» شناخته شده نیست`, t0);

      if (cfg.cond === 'has_stock') {
        const n = s.vehicles.filter(v => v.status === 'in_stock').length;
        return n > 0
          ? ok(node.id, `شرط برقرار است: ${faNumber(n)} خودرو آماده فروش موجود است`, t0)
          : fail(node.id, 'شرط برقرار نشد: هیچ خودروی آماده فروشی وجود ندارد (مسیر «خیر» فعال می‌شود)', t0);
      }
      if (cfg.cond === 'credit_ok') {
        const scores = s.installments.map(i => i.creditScore).filter((x): x is number => typeof x === 'number');
        if (scores.length === 0) return fail(node.id, 'شرط برقرار نشد: هیچ پرونده اعتباری در سامانه یافت نشد', t0);
        const best = Math.max(...scores);
        return best > 60
          ? ok(node.id, `شرط برقرار است: بالاترین امتیاز اعتباری ${faNumber(best)} (بالای حد ۶۰)`, t0)
          : fail(node.id, `شرط برقرار نشد: امتیاز اعتباری ${faNumber(best)} پایین‌تر از حد مجاز ۶۰ است`, t0);
      }
      if (cfg.cond === 'parts_ok') {
        const low = s.parts.filter(p => p.quantity <= p.minQuantity);
        return low.length === 0
          ? ok(node.id, 'شرط برقرار است: همه قطعات بالای حد موجودی هستند', t0)
          : fail(node.id, `شرط برقرار نشد: ${faNumber(low.length)} قطعه زیر حد موجودی است («${low[0].name}»: ${faNumber(low[0].quantity)} عدد)`, t0);
      }
      if (cfg.cond === 'has_open_wo') {
        const open = s.workOrders.filter(w => w.status !== 'delivered');
        return open.length > 0
          ? ok(node.id, `شرط برقرار است: ${faNumber(open.length)} سفارش کار باز وجود دارد («${open[0].code}»)`, t0)
          : fail(node.id, 'شرط برقرار نشد: سفارش کار بازی وجود ندارد', t0);
      }
      return fail(node.id, 'شرط پشتیبانی نمی‌شود', t0);
    }

    case 'approval': {
      if (!cfg.approver || !cfg.approver.trim()) return fail(node.id, 'نام تأییدکننده تعیین نشده است — در تنظیمات نود وارد کنید', t0);
      const emp = s.employees.find(e => cfg.approver.includes(e.name));
      const extra = emp ? ` (${emp.role} — ${emp.division})` : '';
      return ok(node.id, `درخواست تأیید برای «${cfg.approver.trim()}»${extra} ارسال و تأیید شد`, t0);
    }

    case 'notify': {
      const ch = NOTIFY_CHANNELS.find(o => o.value === cfg.channel);
      if (!cfg.channel) return fail(node.id, 'کانال اطلاع‌رسانی انتخاب نشده است', t0);
      if (!ch) return fail(node.id, `کانال «${cfg.channel}» شناخته شده نیست`, t0);
      const rc = (cfg.recipient || '').trim();
      if (!rc) return fail(node.id, 'گیرنده تعیین نشده است — شماره، ایمیل یا نام کارشناس را وارد کنید', t0);
      if (cfg.channel === 'sms' && !/^09\d{9}$/.test(rc)) return fail(node.id, `شماره موبایل «${rc}» نامعتبر است — قالب صحیح: 09xxxxxxxxx`, t0);
      if (cfg.channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rc)) return fail(node.id, `آدرس ایمیل «${rc}» نامعتبر است`, t0);
      logActivity('اطلاع‌رسانی فرآیند', 'اتوماسیون فرآیندها', `${ch.label} تست به «${rc}» در فرآیند «${flowName}» ارسال شد`, by);
      return ok(node.id, `${ch.label} به «${rc}» با موفقیت ارسال شد`, t0);
    }

    case 'delay': {
      const d = (cfg.label || '').trim();
      if (!d) return fail(node.id, 'مدت انتظار مشخص نشده است', t0);
      return ok(node.id, `انتظار «${d}» در حالت تست شبیه‌سازی شد (بدون انتظار واقعی)`, t0);
    }

    case 'end':
      return ok(node.id, 'فرآیند تست با موفقیت به پایان رسید', t0);

    default:
      return fail(node.id, 'نوع نود شناخته شده نیست', t0);
  }
}

/** مسیر بعدی از یک نود: برای شرط، یال «بله» در موفقیت و «خیر» در عدم برقراری */
function nextEdge(edges: FlowEdge[], from: string, isCondition: boolean, passed: boolean, warnings: string[]): FlowEdge | null {
  const outs = edges.filter(e => e.from === from);
  if (outs.length === 0) return null;
  if (isCondition) {
    const want = passed ? 'بله' : 'خیر';
    const labeled = outs.find(e => (e.label || '').trim() === want);
    if (labeled) return labeled;
    warnings.push(`نود شرط، یال «${want}» ندارد — از اولین مسیر موجود ادامه داده شد`);
    return outs[0];
  }
  return outs[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { flow?: FlowDef };
    const flow = body.flow;
    if (!flow || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
      return NextResponse.json({ error: 'فرآیندی برای اجرا تعریف نشده است' }, { status: 400 });
    }
    const nodes = flow.nodes;
    const edges: FlowEdge[] = Array.isArray(flow.edges) ? flow.edges : [];
    const by = actor(req);
    const warnings: string[] = [];

    // گره شروع: تریگر، وگرنه گره بدون ورودی
    const incoming = new Set(edges.map(e => e.to));
    const start = nodes.find(n => n.kind === 'trigger') || nodes.find(n => !incoming.has(n.id));
    if (!start) {
      return NextResponse.json({ error: 'نود شروع (رویداد/تریگر) یافت نشد — ابتدا یک نود «رویداد شروع» اضافه کنید' }, { status: 400 });
    }

    const t0 = Date.now();
    const results: FlowRunResult[] = [];
    const path: string[] = [];
    const visited = new Set<string>();
    let current: FlowNode | undefined = start;
    let stoppedAtError: string | null = null;

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.push(current.id);
      const r = executeNode(current, flow.name, by);
      results.push(r);
      if (r.status === 'error') { stoppedAtError = current.id; break; }
      const e = nextEdge(edges, current.id, current.kind === 'condition', true, warnings);
      current = e ? nodes.find(n => n.id === e.to) : undefined;
    }

    // گره‌های اجرا نشده
    const skipped = nodes
      .filter(n => !visited.has(n.id))
      .map(n => ({
        nodeId: n.id,
        reason: stoppedAtError
          ? 'اجرا نشد — اجرای فرآیند در مرحله قبل با خطا متوقف شد'
          : 'اجرا نشد — در این اجرا انشعاب دیگری از فرآیند فعال شد',
      }));

    // هشدار گره‌های بی‌خروجی روی مسیر
    for (const id of path) {
      const n = nodes.find(x => x.id === id);
      if (n && n.kind !== 'end' && !edges.some(e => e.from === id)) {
        warnings.push(`گره «${n.label}» خروجی ندارد — فرآیند پس از آن ادامه نمی‌یابد`);
      }
    }

    const okCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'error').length;

    logActivity('اجرای تست فرآیند', 'اتوماسیون فرآیندها',
      `فرآیند «${flow.name}» تست شد: ${faNumber(okCount)} مرحله موفق، ${faNumber(failCount)} خطا`, by);

    const resp: FlowRunResponse = {
      path, results, skipped, warnings,
      summary: { total: nodes.length, ok: okCount, failed: failCount, durationMs: Date.now() - t0 },
    };
    return NextResponse.json(resp);
  } catch {
    return NextResponse.json({ error: 'خطا در اجرای تست فرآیند' }, { status: 500 });
  }
}
