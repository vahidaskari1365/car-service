'use client';

// ─── هوک‌های اتصال به API سامانه ───
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

export function useEntity<T extends { id: string }>(entity: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/${entity}`, { cache: 'no-store' });
      const json = await res.json();
      if (mounted.current) setItems(json.data || []);
    } catch {
      if (mounted.current) toast({ title: 'خطا در دریافت داده‌ها', variant: 'destructive' });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  const create = useCallback(async (data: Partial<T>) => {
    const res = await fetch(`/api/${entity}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { toast({ title: json.error || 'خطا در ثبت', variant: 'destructive' }); return null; }
    await refresh();
    return json.data as T;
  }, [entity, refresh]);

  const update = useCallback(async (data: Partial<T> & { id: string }) => {
    const res = await fetch(`/api/${entity}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { toast({ title: json.error || 'خطا در ویرایش', variant: 'destructive' }); return null; }
    await refresh();
    return json.data as T;
  }, [entity, refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/${entity}?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { toast({ title: 'خطا در حذف', variant: 'destructive' }); return false; }
    await refresh();
    return true;
  }, [entity, refresh]);

  return { items, loading, refresh, create, update, remove };
}

export interface DashboardData {
  vehicleCounts: Record<string, number>;
  finance: { income: number; expense: number; profit: number; receivables: number; payables: number };
  divisionRevenue: Record<string, number>;
  vehiclePnL: { id: string; label: string; profit: number }[];
  workshop: { openWorkOrders: number; byStatus: Record<string, number>; revenue: number };
  lowStock: { id: string; name: string; code: string; quantity: number; minQuantity: number }[];
  alerts: { id: string; type: string; title: string; description: string; severity: 'high' | 'medium' | 'low' }[];
  monthly: { month: string; income: number; expense: number }[];
  activity: { id: string; at: string; by: string; module: string; action: string; details?: string }[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}
