'use client';

// ─── تراکینگ رویدادها — ثبت و پیگیری هر اتفاق سامانه ───
import { useMemo, useState } from 'react';
import {
  History, Search, Plus, Pencil, Trash2, Activity, ChevronDown,
  UserCheck, ShieldAlert, GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, LoadingTable, EmptyRow, StatusPill } from '../shared';
import { useEntity } from '../use-erp';
import type { ActivityLog } from '@/lib/erp-types';
import { faNumber, jdate, jdatetime } from '@/lib/erp-utils';

/** نوع رویداد بر اساس عنوان عمل */
function eventKind(action: string): 'create' | 'edit' | 'delete' | 'stage' | 'system' {
  if (action.includes('ثبت') || action.includes('ایجاد')) return 'create';
  if (action.includes('ویرایش')) return 'edit';
  if (action.includes('حذف')) return 'delete';
  if (action.includes('مرحله') || action.includes('پیشرفت')) return 'stage';
  return 'system';
}

const KIND_META = {
  create: { label: 'ایجاد', icon: Plus, cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500' },
  edit: { label: 'ویرایش', icon: Pencil, cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
  delete: { label: 'حذف', icon: Trash2, cls: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30', dot: 'bg-red-500' },
  stage: { label: 'پیشرفت فرآیند', icon: GitBranch, cls: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30', dot: 'bg-violet-500' },
  system: { label: 'سیستم', icon: Activity, cls: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30', dot: 'bg-zinc-500' },
} as const;

export default function TrackingView() {
  const { items: logs, loading } = useEntity<ActivityLog>('activityLogs');
  const [q, setQ] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [limit, setLimit] = useState(60);

  const modules = useMemo(() => Array.from(new Set(logs.map(l => l.module))).sort(), [logs]);
  const actors = useMemo(() => Array.from(new Set(logs.map(l => l.by))).sort(), [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    const text = `${l.action} ${l.module} ${l.by} ${l.details || ''}`.includes(q);
    const byModule = moduleFilter === 'all' || l.module === moduleFilter;
    const byUser = userFilter === 'all' || l.by === userFilter;
    const byKind = kindFilter === 'all' || eventKind(l.action) === kindFilter;
    return text && byModule && byUser && byKind;
  }), [logs, q, moduleFilter, userFilter, kindFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    return {
      total: logs.length,
      today: logs.filter(l => new Date(l.at).getTime() >= todayStart).length,
      week: logs.filter(l => now - new Date(l.at).getTime() < 7 * 86400000).length,
      users: actors.length,
    };
  }, [logs, actors]);

  // گروه‌بندی بر اساس روز شمسی
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const l of filtered.slice(0, limit)) {
      const day = jdate(l.at);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    }
    return Array.from(map.entries());
  }, [filtered, limit]);

  return (
    <div className="view-enter">
      <PageHeader
        title="تراکینگ رویدادها"
        description="هر اتفاقی که در سامانه می‌افتد — ثبت، ویرایش، حذف، پیشرفت فرآیند — با نام مسئول و زمان دقیق"
      />

      {/* آمار */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><History className="h-5 w-5" /></span>
          <div><div className="text-xs text-muted-foreground">کل رویدادها</div><div className="text-lg font-extrabold ltr-num">{faNumber(stats.total)}</div></div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"><Activity className="h-5 w-5" /></span>
          <div><div className="text-xs text-muted-foreground">امروز</div><div className="text-lg font-extrabold ltr-num">{faNumber(stats.today)}</div></div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400"><GitBranch className="h-5 w-5" /></span>
          <div><div className="text-xs text-muted-foreground">۷ روز اخیر</div><div className="text-lg font-extrabold ltr-num">{faNumber(stats.week)}</div></div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400"><UserCheck className="h-5 w-5" /></span>
          <div><div className="text-xs text-muted-foreground">کاربران درگیر</div><div className="text-lg font-extrabold ltr-num">{faNumber(stats.users)}</div></div>
        </div>
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-52 max-w-xs">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو در رویدادها..." className="ps-8" />
        </div>
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="نوع رویداد" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه انواع</SelectItem>
            {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map(k => (
              <SelectItem key={k} value={k}>{KIND_META[k].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="ماژول" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه ماژول‌ها</SelectItem>
            {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="کاربر" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه کاربران</SelectItem>
            {actors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        {(q || moduleFilter !== 'all' || userFilter !== 'all' || kindFilter !== 'all') && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setQ(''); setModuleFilter('all'); setUserFilter('all'); setKindFilter('all'); }}>
            پاک کردن فیلترها
          </Button>
        )}
      </div>

      {/* تایم‌لاین */}
      <div className="rounded-xl border bg-card shadow-sm">
        {loading && <div className="p-5"><LoadingTable rows={6} /></div>}
        {!loading && filtered.length === 0 && (
          <table><tbody><EmptyRow colSpan={1} text="رویدادی مطابق فیلترها یافت نشد" /></tbody></table>
        )}
        {!loading && (
          <div className="divide-y">
            {grouped.map(([day, items]) => (
              <div key={day} className="p-4 lg:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold">{day}</span>
                  <span className="text-[11px] text-muted-foreground">{faNumber(items.length)} رویداد</span>
                </div>
                <div className="relative space-y-3 pr-4">
                  {/* خط تایم‌لاین */}
                  <span className="absolute right-1 top-1 bottom-1 w-px bg-border" />
                  {items.map(l => {
                    const kind = eventKind(l.action);
                    const meta = KIND_META[kind];
                    const Icon = meta.icon;
                    return (
                      <div key={l.id} className="relative flex items-start gap-3 rounded-lg p-2 -m-1 hover:bg-accent/50 transition-colors">
                        <span className={`absolute -right-4 top-3.5 h-2.5 w-2.5 rounded-full ${meta.dot} shadow-[0_0_8px] shadow-current/50`} />
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.cls}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold">{l.action}</span>
                            <StatusPill label={l.module} tone={meta.cls} />
                            <StatusPill label={meta.label} />
                          </div>
                          {l.details && <div className="text-xs text-muted-foreground mt-1 leading-5">{l.details}</div>}
                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {l.by}</span>
                            <span>·</span>
                            <span>{jdatetime(l.at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length > limit && (
              <div className="p-4 text-center">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setLimit(x => x + 60)}>
                  <ChevronDown className="h-4 w-4" /> نمایش رویدادهای بیشتر ({faNumber(filtered.length - limit)} مورد دیگر)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* نکته سیستمی */}
      <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-6">
          رویدادها به‌صورت خودکار و بدون دخالت کاربر ثبت می‌شوند: هر <b className="text-foreground">ثبت، ویرایش و حذف</b> در ۱۳ ماژول،
          تغییر وضعیت‌ها، پیشرفت فرآیندها و پرداخت اقساط با <b className="text-foreground">نام کاربر جاری</b> و زمان دقیق اینجا ذخیره می‌شود.
          رویدادهای قدیمی تا سقف ۵۰۰ مورد نگهداری می‌شوند.
        </div>
      </div>
    </div>
  );
}
