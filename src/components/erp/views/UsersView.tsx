'use client';

// ─── کاربران و دسترسی‌ها — ایجاد کاربر، نقش و ماتریس دسترسی ───
import { useMemo, useState } from 'react';
import {
  Plus, UserCog, ShieldCheck, ShieldOff, Pencil, Trash2, CheckCircle2,
  CircleDashed, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PageHeader, StatusPill, FormDialog, LoadingTable, EmptyRow } from '../shared';
import { useEntity } from '../use-erp';
import { useAppUser } from '@/lib/user-context';
import type { AppUser, UserRole, UserPerm } from '@/lib/erp-types';
import {
  PERMISSION_MODULES, ROLE_LABELS, ROLE_SHORT,
  defaultPermissionsFor, permissionSummary, initials,
} from '@/lib/permissions';
import { faNumber, jdate } from '@/lib/erp-utils';

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  manager: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  accountant: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  workshop: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  sales: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
  rental: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30',
};

const ACTIONS: { key: keyof UserPerm; label: string }[] = [
  { key: 'view', label: 'مشاهده' },
  { key: 'create', label: 'ایجاد' },
  { key: 'edit', label: 'ویرایش' },
  { key: 'delete', label: 'حذف' },
];

interface UserForm {
  fullName: string; username: string; phone: string; role: UserRole; active: boolean;
  permissions: Record<string, UserPerm>;
}

const emptyForm = (): UserForm => ({
  fullName: '', username: '', phone: '', role: 'sales', active: true,
  permissions: defaultPermissionsFor('sales'),
});

export default function UsersView() {
  const { items: users, loading, create, update, remove } = useEntity<AppUser>('users');
  const { current, setCurrentId, reload } = useAppUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.active).length,
    admins: users.filter(u => u.role === 'admin').length,
    roles: new Set(users.map(u => u.role)).size,
  }), [users]);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(u: AppUser) {
    setEditId(u.id);
    setForm({
      fullName: u.fullName, username: u.username, phone: u.phone || '',
      role: u.role, active: u.active,
      permissions: JSON.parse(JSON.stringify(u.permissions || defaultPermissionsFor(u.role))),
    });
    setOpen(true);
  }

  function changeRole(role: UserRole) {
    setForm(f => ({ ...f, role, permissions: defaultPermissionsFor(role) }));
    toast({ title: 'دسترسی‌ها بر اساس نقش بازنشانی شد', description: 'می‌توانید ماتریس دسترسی را دستی تنظیم کنید' });
  }

  function togglePerm(moduleId: string, action: keyof UserPerm) {
    setForm(f => ({
      ...f,
      permissions: {
        ...f.permissions,
        [moduleId]: {
          view: action === 'view' ? !f.permissions[moduleId]?.view : (f.permissions[moduleId]?.view ?? false),
          create: action === 'create' ? !f.permissions[moduleId]?.create : (f.permissions[moduleId]?.create ?? false),
          edit: action === 'edit' ? !f.permissions[moduleId]?.edit : (f.permissions[moduleId]?.edit ?? false),
          delete: action === 'delete' ? !f.permissions[moduleId]?.delete : (f.permissions[moduleId]?.delete ?? false),
        },
      },
    }));
  }

  function toggleModuleAll(moduleId: string) {
    setForm(f => {
      const allOn = ACTIONS.every(a => f.permissions[moduleId]?.[a.key]);
      return {
        ...f,
        permissions: {
          ...f.permissions,
          [moduleId]: {
            view: !allOn, create: !allOn, edit: !allOn, delete: !allOn,
          },
        },
      };
    });
  }

  async function handleSave() {
    if (!form.fullName || !form.username) {
      toast({ title: 'نام کامل و نام کاربری الزامی است', variant: 'destructive' });
      return;
    }
    if (editId) {
      await update({ id: editId, fullName: form.fullName, username: form.username, phone: form.phone || undefined, role: form.role, active: form.active, permissions: form.permissions });
      toast({ title: 'کاربر ویرایش شد', description: `${form.fullName} — ${ROLE_SHORT[form.role]}` });
    } else {
      if (users.some(u => u.username === form.username)) {
        toast({ title: 'این نام کاربری قبلاً ثبت شده است', variant: 'destructive' });
        return;
      }
      await create({
        username: form.username, fullName: form.fullName, phone: form.phone || undefined,
        role: form.role, active: form.active, permissions: form.permissions,
        createdAt: new Date().toISOString(),
      } as Partial<AppUser>);
      toast({ title: 'کاربر جدید ایجاد شد', description: `${form.fullName} — ${ROLE_SHORT[form.role]}` });
    }
    await reload();
    setOpen(false);
  }

  async function toggleActive(u: AppUser) {
    if (u.role === 'admin' && u.active && users.filter(x => x.role === 'admin' && x.active).length <= 1) {
      toast({ title: 'حداقل یک مدیر فعال باید باقی بماند', variant: 'destructive' });
      return;
    }
    await update({ id: u.id, active: !u.active });
  }

  async function handleDelete(u: AppUser) {
    if (u.id === current?.id) {
      toast({ title: 'نمی‌توانید کاربر جاری را حذف کنید', variant: 'destructive' });
      return;
    }
    if (u.role === 'admin' && users.filter(x => x.role === 'admin').length <= 1) {
      toast({ title: 'حداقل یک مدیر باید باقی بماند', variant: 'destructive' });
      return;
    }
    if (!window.confirm(`حذف کاربر «${u.fullName}» از سامانه؟`)) return;
    await remove(u.id);
    await reload();
    toast({ title: 'کاربر حذف شد' });
  }

  return (
    <div className="view-enter">
      <PageHeader
        title="کاربران و دسترسی‌ها"
        description="ایجاد کاربر، تعیین نقش و کنترل دقیق دسترسی هر نفر به هر ماژول (مشاهده، ایجاد، ویرایش، حذف)"
        action={<Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> ایجاد کاربر جدید</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs text-muted-foreground">کل کاربران</div><div className="text-xl font-extrabold mt-1 ltr-num">{faNumber(stats.total)}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs text-muted-foreground">فعال</div><div className="text-xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400 ltr-num">{faNumber(stats.active)}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs text-muted-foreground">مدیر ارشد</div><div className="text-xl font-extrabold mt-1 text-amber-600 dark:text-amber-400 ltr-num">{faNumber(stats.admins)}</div></div>
        <div className="rounded-xl border bg-card p-4 shadow-sm"><div className="text-xs text-muted-foreground">نقش‌های تعریف‌شده</div><div className="text-xl font-extrabold mt-1 ltr-num">{faNumber(stats.roles)}</div></div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>کاربر</TableHead>
              <TableHead className="hidden md:table-cell">نام کاربری</TableHead>
              <TableHead>نقش</TableHead>
              <TableHead className="hidden lg:table-cell">دسترسی</TableHead>
              <TableHead className="hidden sm:table-cell">تلفن</TableHead>
              <TableHead className="hidden lg:table-cell">عضویت</TableHead>
              <TableHead>فعال</TableHead>
              <TableHead className="text-center">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8}><LoadingTable /></TableCell></TableRow>}
            {!loading && users.length === 0 && <EmptyRow colSpan={8} text="کاربری ثبت نشده" />}
            {!loading && users.map(u => (
              <TableRow key={u.id} className={u.id === current?.id ? 'bg-amber-500/5' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
                      {initials(u.fullName)}
                    </span>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        {u.fullName}
                        {u.id === current?.id && <StatusPill label="کاربر جاری" tone="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" />}
                      </div>
                      {!u.active && <div className="text-[11px] text-red-500 flex items-center gap-1"><ShieldOff className="h-3 w-3" /> غیرفعال</div>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs" dir="ltr">{u.username}</TableCell>
                <TableCell><StatusPill label={ROLE_SHORT[u.role]} tone={ROLE_COLORS[u.role]} /></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{permissionSummary(u)}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{u.phone || '—'}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs">{jdate(u.createdAt)}</TableCell>
                <TableCell>
                  <Switch checked={u.active} onCheckedChange={() => toggleActive(u)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {u.id !== current?.id && (
                      <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1 text-emerald-700 dark:text-emerald-400" title="تبدیل به کاربر جاری" onClick={() => { setCurrentId(u.id); toast({ title: `کاربر جاری: ${u.fullName}`, description: 'عملیات‌های جدید با نام این کاربر در تراکینگ ثبت می‌شود' }); }}>
                        <KeyRound className="h-3.5 w-3.5" /> ورود
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="ویرایش" onClick={() => openEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="حذف" onClick={() => handleDelete(u)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* نکته */}
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-6">
          <b className="text-foreground">کاربر جاری</b> با منوی پایین سایدبار یا دکمه «ورود» تغییر می‌کند؛ همه عملیات‌ها (ثبت، ویرایش، حذف) با نام کاربر جاری در
          <b className="text-foreground"> تراکینگ رویدادها </b>ثبت می‌شود. نقش‌ها پیش‌تنظیم دسترسی دارند و می‌توانید هر خانه ماتریس را جداگانه تغییر دهید.
          طبق سیاست سامانه، فعلاً <b className="text-foreground">بدون پسورد</b> است — پس از اتصال دیتابیس، ورود با پسورد اضافه خواهد شد.
        </div>
      </div>

      {/* فرم ایجاد/ویرایش کاربر */}
      <FormDialog
        open={open} onOpenChange={setOpen} wide
        title={editId ? 'ویرایش کاربر و دسترسی‌ها' : 'ایجاد کاربر جدید'}
        description="نقش را انتخاب کنید (دسترسی خودکار تنظیم می‌شود) سپس ماتریس را دقیق‌تر تنظیم کنید"
      >
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>نام و نام خانوادگی *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="مثلاً سعید محمدی" /></div>
            <div className="space-y-1.5"><Label>نام کاربری *</Label><Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} dir="ltr" placeholder="saeed" /></div>
            <div className="space-y-1.5"><Label>تلفن</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" placeholder="0912..." /></div>
            <div className="space-y-1.5">
              <Label>نقش سازمانی</Label>
              <Select value={form.role} onValueChange={v => changeRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {form.active ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
              کاربر فعال باشد (اجازه ورود و ثبت عملیات)
            </div>
            <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
          </div>

          {/* ماتریس دسترسی */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-bold flex items-center gap-1.5"><UserCog className="h-4 w-4 text-amber-600" /> ماتریس دسترسی به ماژول‌ها</Label>
              {form.role === 'admin' && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">مدیر ارشد: دسترسی کامل به همه ماژول‌ها</span>
              )}
            </div>
            {form.role === 'admin' ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-muted-foreground">
                نقش مدیر ارشد همیشه به همه ماژول‌ها دسترسی کامل دارد و ماتریس برای این نقش غیرفعال است.
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>ماژول</TableHead>
                        {ACTIONS.map(a => <TableHead key={a.key} className="text-center w-16">{a.label}</TableHead>)}
                        <TableHead className="text-center w-20">همه</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PERMISSION_MODULES.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs font-medium">{m.label}</TableCell>
                          {ACTIONS.map(a => (
                            <TableCell key={a.key} className="text-center">
                              <Checkbox
                                checked={form.permissions[m.id]?.[a.key] ?? false}
                                onCheckedChange={() => togglePerm(m.id, a.key)}
                                disabled={a.key !== 'view' && !(form.permissions[m.id]?.view)}
                                aria-label={`${a.label} — ${m.label}`}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={ACTIONS.every(a => form.permissions[m.id]?.[a.key])}
                              onCheckedChange={() => toggleModuleAll(m.id)}
                              aria-label={`همه دسترسی‌ها — ${m.label}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            <div className="mt-2 text-[11px] text-muted-foreground">
              خلاصه دسترسی این کاربر: {form.role === 'admin' ? PERMISSION_MODULES.length : PERMISSION_MODULES.filter(m => form.permissions[m.id]?.view).length} از {PERMISSION_MODULES.length} ماژول قابل مشاهده
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={handleSave}>{editId ? 'ذخیره تغییرات' : 'ایجاد کاربر'}</Button>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
