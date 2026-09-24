'use client';

// ─── سامانه جامع مدیریت مجموعه خودرویی — پوسته اصلی ───
import { useMemo, useState } from 'react';
import {
  LayoutDashboard, Car, Handshake, Wrench, KeyRound, CreditCard,
  Package, Users, ShoppingCart, GitBranch, Wallet, BarChart3,
  Bot, Menu, X, CarFront, Sparkles,
} from 'lucide-react';
import GlobalSearch from '@/components/erp/global-search';
import NotificationCenter from '@/components/erp/notification-center';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/components/erp/use-erp';
import DashboardView from '@/components/erp/views/DashboardView';
import VehiclesView from '@/components/erp/views/VehiclesView';
import ShowroomView from '@/components/erp/views/ShowroomView';
import WorkshopView from '@/components/erp/views/WorkshopView';
import RentalView from '@/components/erp/views/RentalView';
import InstallmentsView from '@/components/erp/views/InstallmentsView';
import PartsView from '@/components/erp/views/PartsView';
import CRMView from '@/components/erp/views/CRMView';
import PurchasingView from '@/components/erp/views/PurchasingView';
import WorkflowView from '@/components/erp/views/WorkflowView';
import FinanceView from '@/components/erp/views/FinanceView';
import ReportsView from '@/components/erp/views/ReportsView';
import AIAssistantView from '@/components/erp/views/AIAssistantView';

const NAV = [
  { id: 'dashboard', label: 'داشبورد مدیریتی', icon: LayoutDashboard, group: 'مدیریت' },
  { id: 'vehicles', label: 'مدیریت خودرو', icon: Car, group: 'عملیات' },
  { id: 'showroom', label: 'نمایشگاه (خرید/فروش)', icon: Handshake, group: 'عملیات' },
  { id: 'workshop', label: 'تعمیرگاه و خدمات فنی', icon: Wrench, group: 'عملیات' },
  { id: 'rental', label: 'اجاره خودرو', icon: KeyRound, group: 'عملیات' },
  { id: 'installments', label: 'اقساط، لیزینگ و فاینانس', icon: CreditCard, group: 'عملیات' },
  { id: 'parts', label: 'قطعات و انبار', icon: Package, group: 'پشتیبانی' },
  { id: 'crm', label: 'مدیریت مشتریان (CRM)', icon: Users, group: 'پشتیبانی' },
  { id: 'purchasing', label: 'خرید و تأمین', icon: ShoppingCart, group: 'پشتیبانی' },
  { id: 'workflow', label: 'اتوماسیون فرآیندها', icon: GitBranch, group: 'پشتیبانی' },
  { id: 'finance', label: 'امور مالی', icon: Wallet, group: 'پشتیبانی' },
  { id: 'reports', label: 'گزارش‌ها و عملکرد', icon: BarChart3, group: 'مدیریت' },
  { id: 'ai', label: 'دستیار هوشمند AI', icon: Bot, group: 'هوش مصنوعی' },
];

const GROUPS = ['مدیریت', 'عملیات', 'پشتیبانی', 'هوش مصنوعی'];

export default function Home() {
  const [view, setView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: dash } = useDashboard();

  // تعداد هشدارهای بحرانی برای بج سایدبار
  const alertCount = dash?.alerts.filter(a => a.severity === 'high').length ?? 0;

  const current = useMemo(() => NAV.find(n => n.id === view), [view]);

  function navigate(id: string) {
    setView(id);
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* لوگو */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="brand-glow flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <CarFront className="h-6 w-6" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-white">سامانه جامع مدیریت خودرو</div>
          <div className="text-[10px] text-sidebar-foreground/60 mt-0.5">ERP + CRM + اتوماسیون + AI</div>
        </div>
      </div>

      {/* ناوبری */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {GROUPS.map(group => (
          <div key={group}>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-sidebar-foreground/40 tracking-wide">{group}</div>
            <div className="space-y-0.5">
              {NAV.filter(n => n.group === group).map(item => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`nav-item group w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 ${
                      active
                        ? 'nav-active text-amber-300 font-bold'
                        : 'text-sidebar-foreground/75 hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} />
                    <span className="flex-1 text-right">{item.label}</span>
                    {item.id === 'dashboard' && alertCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/90 px-1 text-[10px] font-bold text-white shadow-sm shadow-red-500/40">
                        {alertCount.toLocaleString('fa-IR')}
                      </span>
                    )}
                    {active && <span className="h-4 w-1 rounded-full bg-amber-400 shadow-[0_0_8px_oklch(0.8_0.14_75)]" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* پایین سایدبار */}
      <div className="border-t border-sidebar-border px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">و.ع</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">وحید عسکری</div>
            <div className="text-[10px] text-sidebar-foreground/50">مدیرعامل — دسترسی کامل</div>
          </div>
          <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10">بدون ورود</Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background page-glow" dir="rtl">
      {/* سایدبار دسکتاپ */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* سایدبار موبایل */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 shadow-2xl animate-in slide-in-from-right duration-300">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 left-4 z-10 text-sidebar-foreground/60 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* محتوای اصلی */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* هدر */}
        <header className="glass-header sticky top-0 z-40 border-b">
          <div className="flex items-center gap-3 px-4 lg:px-6 h-14">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 -ms-2 text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              {current && <current.icon className="h-4 w-4 text-amber-600" />}
              <h1 className="text-sm font-bold whitespace-nowrap">{current?.label}</h1>
            </div>
            <div className="flex-1" />
            <GlobalSearch onNavigate={navigate} />
            <button
              onClick={() => navigate('ai')}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-l from-amber-500/15 to-amber-500/5 text-amber-700 border border-amber-500/25 px-3 py-1.5 text-xs font-bold hover:from-amber-500/25 hover:to-amber-500/10 hover:shadow-sm hover:shadow-amber-500/20 transition-all shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" /> دستیار هوشمند
            </button>
            <NotificationCenter onNavigate={navigate} />
          </div>
        </header>

        {/* ماژول جاری */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1500px] w-full mx-auto">
          {view === 'dashboard' && <DashboardView onNavigate={navigate} />}
          {view === 'vehicles' && <VehiclesView />}
          {view === 'showroom' && <ShowroomView />}
          {view === 'workshop' && <WorkshopView />}
          {view === 'rental' && <RentalView />}
          {view === 'installments' && <InstallmentsView />}
          {view === 'parts' && <PartsView />}
          {view === 'crm' && <CRMView />}
          {view === 'purchasing' && <PurchasingView />}
          {view === 'workflow' && <WorkflowView />}
          {view === 'finance' && <FinanceView />}
          {view === 'reports' && <ReportsView onOpenAI={() => navigate('ai')} />}
          {view === 'ai' && <AIAssistantView />}
        </main>

        {/* فوتر چسبیده */}
        <footer className="mt-auto border-t bg-card/60">
          <div className="px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>سامانه جامع مدیریت مجموعه خودرویی — نسخه ۱.۰ (نمونه عملیاتی بدون دیتابیس و بدون ورود)</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              داده‌ها در حافظه سرور · موتور AI فعال
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
