'use client';

// ─── کامپوننت‌های مشترک سامانه ───
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { type LucideIcon } from 'lucide-react';

export function KpiCard({
  title, value, sub, icon: Icon, tone = 'amber',
}: {
  title: string; value: string; sub?: string; icon: LucideIcon;
  tone?: 'amber' | 'emerald' | 'red' | 'teal' | 'zinc' | 'orange';
}) {
  const tones: Record<string, { bubble: string; ring: string }> = {
    amber: { bubble: 'bg-gradient-to-br from-amber-100 to-amber-200/70 text-amber-700', ring: 'hover:shadow-amber-500/15' },
    emerald: { bubble: 'bg-gradient-to-br from-emerald-100 to-emerald-200/70 text-emerald-700', ring: 'hover:shadow-emerald-500/15' },
    red: { bubble: 'bg-gradient-to-br from-red-100 to-red-200/70 text-red-700', ring: 'hover:shadow-red-500/15' },
    teal: { bubble: 'bg-gradient-to-br from-teal-100 to-teal-200/70 text-teal-700', ring: 'hover:shadow-teal-500/15' },
    zinc: { bubble: 'bg-gradient-to-br from-zinc-200 to-zinc-300/60 text-zinc-700', ring: 'hover:shadow-zinc-500/15' },
    orange: { bubble: 'bg-gradient-to-br from-orange-100 to-orange-200/70 text-orange-700', ring: 'hover:shadow-orange-500/15' },
  };
  const t = tones[tone];
  return (
    <Card className={`kpi-card border-border/70 shadow-sm hover:shadow-lg ${t.ring}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner ${t.bubble}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-base font-bold truncate ltr-num">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusPill({ label, tone }: { label: string; tone?: string }) {
  return (
    <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${tone || 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}>
      {label}
    </Badge>
  );
}

export function SectionCard({
  title, description, action, children, className = '',
}: {
  title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <Card className={`border-border/70 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3.5 bg-gradient-to-l from-muted/40 to-transparent rounded-t-xl">
        <div>
          <h3 className="text-sm font-bold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyRow({ colSpan, text = 'موردی ثبت نشده است' }: { colSpan: number; text?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">{text}</td>
    </tr>
  );
}

/** مودال فرم عمومی */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function FormDialog({
  open, onOpenChange, title, description, children, wide = false,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string;
  children: ReactNode; wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? 'sm:max-w-2xl max-h-[88vh] overflow-y-auto' : 'sm:max-w-md max-h-[88vh] overflow-y-auto'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** دیالوگ جزئیات (Drawer راست‌چین) */
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

export function DetailDrawer({
  open, onOpenChange, title, description, children,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-2xl overflow-y-auto px-5 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
