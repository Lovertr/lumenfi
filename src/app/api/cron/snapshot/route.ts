import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { snapshotTodayForUser } from '@/lib/queries/net-worth-snapshot';
import { snapshotPortfolioForUser } from '@/lib/queries/portfolio-snapshot';

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

    let netWorthCount = 0;
    let portfolioCount = 0;
    for (const u of users) {
      try {
        await snapshotTodayForUser(u.id);
        netWorthCount++;
      } catch (e) {
        console.error('net-worth snapshot for', u.id, e);
      }
      try {
        await snapshotPortfolioForUser(u.id);
        portfolioCount++;
      } catch (e) {
        console.error('portfolio snapshot for', u.id, e);
      }
    }

    return NextResponse.json({
      ok: true,
      netWorthSnapshots: netWorthCount,
      portfolioSnapshots: portfolioCount,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
