'use client';

// ─── جستجوی سراسری بین همه ماژول‌ها (Ctrl+K) ───
import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Car, Users, Handshake, Wrench, KeyRound, CreditCard, Package, ShoppingCart, GitBranch, Wallet, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  type: string;
  view: string;
  title: string;
  sub: string;
  badge?: string;
}

const VIEW_ICONS: Record<string, typeof Car> = {
  vehicles: Car, crm: Users, showroom: Handshake, workshop: Wrench,
  rental: KeyRound, installments: CreditCard, parts: Package,
  purchasing: ShoppingCart, workflow: GitBranch, finance: Wallet,
};

const VIEW_LABELS: Record<string, string> = {
  vehicles: 'خودروها', crm: 'مشتریان', showroom: 'نمایشگاه', workshop: 'تعمیرگاه',
  rental: 'اجاره', installments: 'اقساط', parts: 'انبار', purchasing: 'خرید',
  workflow: 'فرآیندها', finance: 'مالی',
};

export default function GlobalSearch({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // بستن با کلیک بیرون
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // میانبر Ctrl+K / ⌘K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doSearch = useCallback((term: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (term.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`, { cache: 'no-store' });
        const json = await res.json();
        setResults(json.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  function pick(r: SearchResult) {
    setOpen(false);
    setQ('');
    setResults([]);
    onNavigate?.(r.view);
  }

  // گروه‌بندی نتایج بر اساس نوع
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.view] = acc[r.view] || []).push(r);
    return acc;
  }, {});

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); doSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="جستجوی سراسری: مشتری، خودرو، فاکتور، قرارداد…"
          className="ps-8 pe-16 h-9 text-xs bg-card/70"
          aria-label="جستجوی سراسری"
        />
        {q && (
          <button
            onClick={() => { setQ(''); setResults([]); inputRef.current?.focus(); }}
            className="absolute end-[52px] top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="پاک کردن جستجو"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <kbd className="absolute end-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground" dir="ltr">
          Ctrl+K
        </kbd>
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute top-full mt-1.5 w-full min-w-[320px] rounded-xl border bg-popover shadow-xl z-50 overflow-hidden result-in">
          <div className="max-h-[380px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال جستجو…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                نتیجه‌ای برای «{q}» پیدا نشد
              </div>
            )}
            {!loading && Object.entries(grouped).map(([view, items]) => {
              const Icon = VIEW_ICONS[view] || Search;
              return (
                <div key={view}>
                  <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-[10px] font-bold text-muted-foreground border-t first:border-t-0 bg-muted/40">
                    <Icon className="h-3 w-3" />
                    {VIEW_LABELS[view] || view}
                    <span className="text-[9px] font-normal">({items.length} نتیجه)</span>
                  </div>
                  {items.map(r => (
                    <button
                      key={r.id}
                      onClick={() => pick(r)}
                      className="w-full text-right flex items-center gap-2.5 px-3 py-2 hover:bg-amber-50 transition-colors group"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted group-hover:bg-amber-100 transition-colors">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          {r.title}
                          {r.badge && <span className="text-[9px] bg-zinc-100 text-zinc-500 rounded px-1">{r.badge}</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">{r.type}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          {results.length > 0 && (
            <div className="border-t px-3 py-1.5 text-[9px] text-muted-foreground text-center">
              برای رفتن به ماژول مربوطه روی نتیجه کلیک کنید
            </div>
          )}
        </div>
      )}
    </div>
  );
}
