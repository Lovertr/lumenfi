import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { snapshotTodayForUser } from '@/lib/queries/net-worth-snapshot';
import { snapshotPortfolioForUser } from '@/lib/queries/portfolio-snapshot';
import { materializeDueRecurringInvestments } from '@/lib/recurring-investments';

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

    let netWorthCount = 0;
    let portfolioCount = 0;
    if (users) {
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
    }

    // Materialize due recurring investments (DCA)
    let dcaResult = { executed: 0, skipped: 0 };
    try {
      dcaResult = await materializeDueRecurringInvestments();
    } catch (e) {
      console.error('recurring investments materialize failed:', e);
    }

    return NextResponse.json({
      ok: true,
      netWorthSnapshots: netWorthCount,
      portfolioSnapshots: portfolioCount,
      dcaExecuted: dcaResult.executed,
      dcaSkipped: dcaResult.skipped,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
