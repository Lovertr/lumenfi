// ─────────────────────────────────────────────────────────
// Feature spotlight — detects what user hasn't tried yet
// Returns the highest-priority "next-best feature" to surface
// ─────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';

export interface Spotlight {
  id: string;
  icon: string;
  title: string;
  description: string;
  url: string;
  cta: string;
  priority: number; // higher = more important
}

export async function getSpotlight(): Promise<Spotlight | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Read user's dismissed list
  const { data: profile } = await supabase
    .from('profiles')
    .select('dismissed_spotlights')
    .eq('id', user.id)
    .maybeSingle();
  const dismissed: string[] = (profile?.dismissed_spotlights as string[] | null) ?? [];

  // Run a few count queries in parallel to figure out what's used
  const [
    accountsRes,
    investmentsRes,
    goalsRes,
    emergencyGoalsRes,
    dcaRes,
    watchlistRes,
    advisorRes,
    insuranceRes,
    budgetsRes,
    aiKeyRes,
  ] = await Promise.all([
    supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('archived', false),
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_emergency_fund', true),
    supabase.from('recurring_investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
    supabase.from('investment_watchlist').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('advisor_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('insurance_policies').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gt('amount', 0),
    supabase.from('profiles').select('ai_provider, ai_api_key_encrypted').eq('id', user.id).maybeSingle(),
  ]);

  const has = {
    accounts: (accountsRes.count ?? 0) > 0,
    investments: (investmentsRes.count ?? 0) > 0,
    goals: (goalsRes.count ?? 0) > 0,
    emergencyGoal: (emergencyGoalsRes.count ?? 0) > 0,
    dca: (dcaRes.count ?? 0) > 0,
    watchlist: (watchlistRes.count ?? 0) > 0,
    advisor: (advisorRes.count ?? 0) > 0,
    insurance: (insuranceRes.count ?? 0) > 0,
    budgets: (budgetsRes.count ?? 0) > 0,
    aiKey: !!(aiKeyRes.data?.ai_provider && aiKeyRes.data?.ai_api_key_encrypted),
  };

  // Build candidates list — order matters as fallback when priorities tie
  const candidates: Spotlight[] = [];

  if (!has.aiKey) {
    candidates.push({
      id: 'ai-key',
      icon: '🔑',
      title: 'ตั้งค่า AI Key เพื่อปลดล็อก AI Advisor',
      description: 'ใช้ key ของคุณเอง — ฟรี ไม่มีค่าใช้จ่ายจาก Lumenfi',
      url: '/ai/settings',
      cta: 'ตั้งค่าตอนนี้',
      priority: 90,
    });
  }

  if (!has.emergencyGoal) {
    candidates.push({
      id: 'emergency-fund',
      icon: '🚨',
      title: 'สร้าง Emergency Fund — สำคัญที่สุด',
      description: 'เก็บเงินสำรอง 3-6 เดือน ก่อนทำอย่างอื่น',
      url: '/goals/new',
      cta: 'สร้างเป้าหมาย',
      priority: 85,
    });
  }

  if (has.accounts && !has.advisor && has.aiKey) {
    candidates.push({
      id: 'try-advisor',
      icon: '🌟',
      title: 'ลอง AI Advisor — เลขาทางการเงิน',
      description: 'วิเคราะห์ครบ 8 มิติ + แผนปฏิบัติได้จริง',
      url: '/advisor',
      cta: 'ลองเลย',
      priority: 80,
    });
  }

  if (has.investments && !has.dca) {
    candidates.push({
      id: 'try-dca',
      icon: '🔁',
      title: 'ตั้ง DCA Auto — ลงทุนอัตโนมัติ',
      description: 'ระบบบันทึกการซื้อรายเดือนให้ ไม่ต้องบันทึกเอง',
      url: '/investments/recurring/new',
      cta: 'ตั้งค่า',
      priority: 70,
    });
  }

  if (has.investments && !has.watchlist) {
    candidates.push({
      id: 'try-watchlist',
      icon: '👁️',
      title: 'เพิ่ม Watchlist — ดักราคาเป้าหมาย',
      description: 'แจ้งเตือน push เมื่อราคาถึงเป้า',
      url: '/investments/watchlist/new',
      cta: 'เพิ่ม',
      priority: 60,
    });
  }

  if (has.accounts && !has.budgets) {
    candidates.push({
      id: 'try-budgets',
      icon: '💰',
      title: 'ตั้ง Budget — คุมรายจ่ายให้ไม่เกิน',
      description: 'แจ้งเตือนเมื่อใกล้ถึงเพดาน',
      url: '/budgets',
      cta: 'ตั้งค่า',
      priority: 55,
    });
  }

  if (has.accounts && !has.insurance) {
    candidates.push({
      id: 'try-insurance',
      icon: '🛡️',
      title: 'บันทึกประกัน — ตรวจ Gap',
      description: 'ระบบจะคำนวณว่าทุนคุ้มครองพอมั้ย',
      url: '/insurance',
      cta: 'เริ่ม',
      priority: 50,
    });
  }

  if (has.goals && has.investments) {
    candidates.push({
      id: 'goal-investment-link',
      icon: '🎯',
      title: 'ผูกการลงทุนกับ Goal',
      description: 'มูลค่าการลงทุนจะถูกนับรวม progress เป้าหมาย',
      url: '/investments',
      cta: 'ลองดู',
      priority: 40,
    });
  }

  // Filter out dismissed + pick highest priority
  const candidate = candidates
    .filter((c) => !dismissed.includes(c.id))
    .sort((a, b) => b.priority - a.priority)[0];

  return candidate ?? null;
}

export async function dismissSpotlight(spotlightId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('dismissed_spotlights')
    .eq('id', user.id)
    .maybeSingle();
  const current: string[] = (profile?.dismissed_spotlights as string[] | null) ?? [];
  if (current.includes(spotlightId)) return;

  await supabase
    .from('profiles')
    .update({ dismissed_spotlights: [...current, spotlightId] })
    .eq('id', user.id);
}
