'use client';

// ─── مرکز اعلان‌ها — زنگ هشدار با خوانده/نخوانده و پرش به ماژول ───
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ErpAlert } from '@/lib/notifications';

const READ_KEY = 'erp-read-alerts-v1';

const severityStyle: Record<string, { dot: string; icon: typeof Info; ring: string }> = {
  high: { dot: 'bg-red-500', icon: AlertOctagon, ring: 'bg-red-50/70 border-red-100 dark:bg-red-500/10 dark:border-red-500/30' },
  medium: { dot: 'bg-amber-500', icon: AlertTriangle, ring: 'bg-amber-50/60 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30' },
  low: { dot: 'bg-teal-500', icon: Info, ring: 'bg-teal-50/50 border-teal-100 dark:bg-teal-500/10 dark:border-teal-500/30' },
};

export default function NotificationCenter({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [alerts, setAlerts] = useState<ErpAlert[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const json = await res.json();
      setAlerts(json.alerts || []);
    } catch {
      // بی‌صدا — اعلان حیاتی نیست
    } finally {
      setLoading(false);
    }
  }, []);

  // بازیابی وضعیت خوانده‌شده از localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_KEY);
      if (raw) setReadIds(JSON.parse(raw));
    } catch { /* ignore */ }
    load();
    timer.current = setInterval(load, 60_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  const unread = alerts.filter(a => !readIds.includes(a.id));

  function persistRead(ids: string[]) {
    setReadIds(ids);
    try { localStorage.setItem(READ_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }

  function markAllRead() {
    persistRead(alerts.map(a => a.id));
  }

  function openAlert(a: ErpAlert) {
    persistRead([...new Set([...readIds, a.id])]);
    setOpen(false);
    onNavigate?.(a.view);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
          title="مرکز اعلان‌ها"
          aria-label="مرکز اعلان‌ها"
        >
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
              {unread.length > 9 ? '+۹' : toFa(unread.length)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] max-w-[92vw] p-0 overflow-hidden" dir="rtl">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-l from-muted/60 to-transparent">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-bold">مرکز اعلان‌ها</span>
            {unread.length > 0 && (
              <span className="text-[10px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                {toFa(unread.length)} اعلان جدید
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={markAllRead} disabled={unread.length === 0}>
            <CheckCheck className="h-3.5 w-3.5" /> خواندن همه
          </Button>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y">
          {loading && <div className="px-4 py-8 text-center text-xs text-muted-foreground">در حال دریافت اعلان‌ها…</div>}
          {!loading && alerts.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCheck className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium">همه‌چیز مرتب است</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">هیچ هشدار یا یادآوری فعالی وجود ندارد</div>
            </div>
          )}
          {alerts.map(a => {
            const isRead = readIds.includes(a.id);
            const sev = severityStyle[a.severity];
            const Icon = sev.icon;
            return (
              <button
                key={a.id}
                onClick={() => openAlert(a)}
                className={cn(
                  'w-full text-right flex items-start gap-2.5 px-4 py-3 hover:bg-muted/60 transition-colors relative',
                  isRead && 'opacity-60',
                )}
              >
                {!isRead && <span className={cn('absolute start-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full', sev.dot)} />}
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ms-2', sev.ring)}>
                  <Icon className={cn('h-4 w-4', a.severity === 'high' ? 'text-red-600' : a.severity === 'medium' ? 'text-amber-600' : 'text-teal-600')} />
                </div>
                <div className="min-w-0 flex-1 pe-2">
                  <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                    {a.title}
                    {a.dueHint && (
                      <span className={cn(
                        'text-[9px] rounded-full px-1.5 py-0.5 border',
                        a.dueHint.includes('گذشته') ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
                      )}>{a.dueHint}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-4">{a.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground text-center">
          با کلیک روی هر اعلان، به ماژول مربوطه منتقل می‌شوید · به‌روزرسانی خودکار هر ۱ دقیقه
        </div>
      </PopoverContent>
    </Popover>
  );
}

function toFa(n: number): string {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
