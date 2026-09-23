import { NextRequest, NextResponse } from 'next/server';
import { isEntity, listEntity, createEntity, updateEntity, deleteEntity, resetStore, type EntityName } from '@/lib/erp-store';

export const dynamic = 'force-dynamic';

function entityFromPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

export async function GET(req: NextRequest) {
  const name = entityFromPath(req.nextUrl.pathname);
  if (name === 'reset') {
    resetStore();
    return NextResponse.json({ ok: true, message: 'داده‌ها بازنشانی شد' });
  }
  if (!isEntity(name)) return NextResponse.json({ error: 'موجودیت نامعتبر است' }, { status: 404 });
  return NextResponse.json({ data: listEntity(name as EntityName) });
}

export async function POST(req: NextRequest) {
  const name = entityFromPath(req.nextUrl.pathname);
  if (!isEntity(name)) return NextResponse.json({ error: 'موجودیت نامعتبر است' }, { status: 404 });
  try {
    const body = await req.json();
    const item = createEntity(name as EntityName, body);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const name = entityFromPath(req.nextUrl.pathname);
  if (!isEntity(name)) return NextResponse.json({ error: 'موجودیت نامعتبر است' }, { status: 404 });
  try {
    const body = (await req.json()) as { id?: string };
    if (!body.id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
    const { id, ...rest } = body;
    const item = updateEntity(name as EntityName, id, rest as Record<string, unknown>);
    if (!item) return NextResponse.json({ error: 'رکورد یافت نشد' }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const name = entityFromPath(req.nextUrl.pathname);
  if (!isEntity(name)) return NextResponse.json({ error: 'موجودیت نامعتبر است' }, { status: 404 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
  const ok = deleteEntity(name as EntityName, id);
  if (!ok) return NextResponse.json({ error: 'رکورد یافت نشد' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
