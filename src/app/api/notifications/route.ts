import { NextResponse } from 'next/server';
import { getStore } from '@/lib/erp-store';
import { computeAlerts } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getStore();
  const alerts = computeAlerts(s);
  return NextResponse.json({
    alerts,
    unreadHint: alerts.filter(a => a.severity === 'high').length,
    at: new Date().toISOString(),
  });
}
