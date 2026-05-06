import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { snapshotTodayForUser } from '@/lib/queries/net-worth-snapshot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supa = createServiceClient();
    const { data: users } = await supa.from('profiles').select('id');
    if (!users) return NextResponse.json({ ok: true, snapshots: 0 });

    let count = 0;
    for (const u of users) {
      try {
        await snapshotTodayForUser(u.id);
        count++;
      } catch (e) {
        console.error('snapshot for', u.id, e);
      }
    }

    return NextResponse.json({ ok: true, snapshots: count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
