'use client';

// ─── زمینه کاربر جاری سامانه (بدون پسورد — انتخاب کاربر برای مسئولیت‌پذیری تراکینگ) ───
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '@/lib/erp-types';
import { canAccess, type PermAction } from '@/lib/permissions';
import { setActorName } from '@/lib/actor';

const STORAGE_KEY = 'erp.currentUserId';

interface UserCtx {
  users: AppUser[];
  current: AppUser | null;
  setCurrentId: (id: string) => void;
  reload: () => Promise<void>;
  can: (module: string, action?: PermAction) => boolean;
  loading: boolean;
}

const Ctx = createContext<UserCtx>({
  users: [],
  current: null,
  setCurrentId: () => {},
  reload: async () => {},
  can: () => true,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const json = await res.json();
      setUsers(json.data || []);
    } catch {
      // بی‌صدا — کاربر جاری حفظ می‌شود
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCurrentIdState(saved);
    } catch { /* SSR */ }
  }, [reload]);

  const current = useMemo(() => {
    if (users.length === 0) return null;
    return users.find(u => u.id === currentId && u.active)
      || users.find(u => u.role === 'admin' && u.active)
      || users.find(u => u.active)
      || users[0];
  }, [users, currentId]);

  useEffect(() => {
    setActorName(current?.fullName || 'کاربر سیستم');
  }, [current]);

  const setCurrentId = useCallback((id: string) => {
    setCurrentIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* SSR */ }
  }, []);

  const can = useCallback((module: string, action: PermAction = 'view') => canAccess(current, module, action), [current]);

  return (
    <Ctx.Provider value={{ users, current, setCurrentId, reload, can, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppUser() {
  return useContext(Ctx);
}
