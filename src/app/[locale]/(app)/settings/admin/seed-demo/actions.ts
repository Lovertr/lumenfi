'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getPersona, type PersonaKey } from '@/lib/demo/personas';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function seedDemoAccount(
  personaKey: PersonaKey
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  if (user.email !== ADMIN_EMAIL) return { ok: false, error: 'forbidden' };

  const persona = getPersona(personaKey);
  if (!persona) return { ok: false, error: 'invalid_persona' };

  const admin = createServiceClient();

  const { data: usersData } = await admin.auth.admin.listUsers();
  let targetUser = usersData?.users.find((u: any) => u.email === persona.email);

  if (!targetUser) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: persona.email,
      password: 'Lumenfi-Demo-2026',
      email_confirm: true,
      user_metadata: { full_name: persona.profile.full_name, demo: true },
    });
    if (createErr || !created.user) {
      return { ok: false, error: 'user_create_failed: ' + (createErr?.message ?? 'unknown') };
    }
    targetUser = created.user;
  }

  const userId = targetUser.id;

  try {
    // Wipe existing data
    await admin.from('transactions').delete().eq('user_id', userId);
    await admin.from('investments').delete().eq('user_id', userId);
    await admin.from('investment_transactions').delete().eq('user_id', userId);
    await admin.from('investment_dividends').delete().eq('user_id', userId);
    await admin.from('investment_watchlist').delete().eq('user_id', userId);
    await admin.from('recurring_investments').delete().eq('user_id', userId);
    await admin.from('debts').delete().eq('user_id', userId);
    await admin.from('goals').delete().eq('user_id', userId);
    await admin.from('budgets').delete().eq('user_id', userId);
    await admin.from('recurring_transactions').delete().eq('user_id', userId);
    await admin.from('insurance_policies').delete().eq('user_id', userId);
    await admin.from('accounts').delete().eq('user_id', userId);
    await admin.from('advisor_reports').delete().eq('user_id', userId);
    await admin.from('notifications').delete().eq('user_id', userId);
    await admin.from('net_worth_snapshots').delete().eq('user_id', userId);

    // Profile
    await admin.from('profiles').upsert({
      id: userId,
      email: persona.email,
      ...persona.profile,
      onboarded: true,
      default_currency: 'THB',
      updated_at: new Date().toISOString(),
    });

    // Accounts
    const accountIds: Record<string, string> = {};
    const accountTypes: Record<string, string> = {};
    for (const acc of persona.accounts) {
      const { data } = await admin
        .from('accounts')
        .insert({
          user_id: userId,
          name: acc.name,
          type: acc.type,
          initial_balance: acc.initial_balance,
          currency: 'THB',
          color: acc.color,
          account_number: acc.account_number ?? null,
          include_in_net_worth: true,
        })
        .select('id')
        .single();
      if (data) {
        accountIds[acc.name] = data.id;
        accountTypes[acc.name] = acc.type;
      }
    }

    const primaryAccountId =
      Object.entries(accountIds).find(([n]) => accountTypes[n] !== 'credit_card')?.[1] ??
      Object.values(accountIds)[0];

    // Categories (copy defaults if user has none)
    const { data: cats } = await admin.from('categories').select('id, name, type').eq('user_id', userId);
    const allCats = cats ?? [];
    if (allCats.length === 0) {
      const { data: defaultCats } = await admin
        .from('categories')
        .select('name, type, icon, color')
        .is('user_id', null)
        .limit(100);
      for (const c of (defaultCats ?? [])) {
        const { data: inserted } = await admin
          .from('categories')
          .insert({ user_id: userId, name: c.name, type: c.type, icon: c.icon, color: c.color })
          .select('id, name, type')
          .single();
        if (inserted) allCats.push(inserted);
      }
    }

    const findCat = (name: string, type: 'income' | 'expense' = 'expense') =>
      allCats.find((c) => c.name.includes(name) && c.type === type)?.id ?? null;

    // Goals
    for (const g of persona.goals) {
      await admin.from('goals').insert({
        user_id: userId,
        name: g.name,
        target_amount: g.target_amount,
        current_amount: g.current_amount,
        deadline: g.deadline ?? null,
        icon: g.icon,
        color: g.color,
        status: 'active',
        is_emergency_fund: g.is_emergency_fund ?? false,
      });
    }

    // Debts
    for (const d of persona.debts) {
      await admin.from('debts').insert({
        user_id: userId,
        name: d.name,
        type: d.type,
        current_balance: d.balance,
        original_principal: d.original_balance ?? d.balance,
        interest_rate: d.rate,
        monthly_payment: d.monthly_payment,
        remaining_term: d.remaining_term ?? null,
        total_term: d.remaining_term ?? null,
        start_date: new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
      });
    }

    // Investments
    for (const inv of persona.investments) {
      await admin.from('investments').insert({
        user_id: userId,
        name: inv.name,
        symbol: inv.symbol ?? null,
        type: inv.type,
        quantity: inv.quantity,
        avg_cost: inv.avg_cost,
        current_price: inv.current_price ?? null,
        currency: inv.currency ?? 'THB',
        is_tax_saving: inv.is_tax_saving ?? false,
        tax_fund_type: inv.tax_fund_type ?? null,
        lock_in_until: inv.lock_in_until ?? null,
      });
    }

    // Insurance
    for (const ins of persona.insurance) {
      await admin.from('insurance_policies').insert({
        user_id: userId,
        type: ins.type,
        carrier: ins.carrier,
        policy_name: ins.policy_name,
        sum_insured: ins.sum_insured,
        annual_premium: ins.annual_premium,
        start_date: new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10),
      });
    }

    // Budgets
    for (const b of persona.budgets) {
      const catId = findCat(b.category_name);
      if (catId) {
        await admin.from('budgets').insert({ user_id: userId, category_id: catId, amount: b.amount });
      }
    }

    // Recurring
    for (const r of persona.recurring) {
      const catId = r.category_name
        ? findCat(r.category_name, r.type === 'income' ? 'income' : 'expense')
        : null;
      await admin.from('recurring_transactions').insert({
        user_id: userId,
        type: r.type,
        amount: r.amount,
        category_id: catId,
        account_id: primaryAccountId,
        day_of_month: r.day_of_month,
        is_active: true,
        note: r.note,
      });
    }

    // Transactions
    const tplt = persona.transactionTemplate;
    const now = new Date();

    const defaultSamples = [
      { catName: 'อาหาร', amounts: [85, 120, 150, 65, 45, 220, 380, 145, 90, 60], notes: ['อาหารเช้า 7-11', 'ข้าวกลางวัน', 'อาหารเย็น', 'กาแฟ', 'ขนม', 'ส่งอาหาร Grab', 'ทานข้าวกับเพื่อน', 'อาหารเช้า', 'ก๋วยเตี๋ยว', 'น้ำผลไม้'] },
      { catName: 'เดินทาง', amounts: [50, 80, 35, 250, 180, 120], notes: ['BTS', 'Grab', 'แท็กซี่', 'น้ำมัน', 'ค่าทางด่วน', 'มอเตอร์ไซค์รับจ้าง'] },
      { catName: 'บันเทิง', amounts: [350, 800, 1200, 280, 450], notes: ['ดูหนัง', 'คอนเสิร์ต', 'ทัวร์ปลายปี', 'หนังสือ', 'เกม'] },
      { catName: 'ของใช้ส่วนตัว', amounts: [180, 450, 320, 850, 1200], notes: ['ยาสีฟัน', 'ครีมกันแดด', 'เสื้อผ้า', 'รองเท้า', 'น้ำหอม'] },
      { catName: 'สุขภาพ', amounts: [800, 350, 1500, 250], notes: ['ยา', 'วิตามิน', 'หาหมอ', 'ตรวจสุขภาพ'] },
    ];

    const allSamples = [...defaultSamples, ...(tplt.extraSamples ?? [])];
    const txs: any[] = [];
    for (let i = 0; i < tplt.count; i++) {
      const sample = allSamples[Math.floor(Math.random() * allSamples.length)];
      const amount = sample.amounts[Math.floor(Math.random() * sample.amounts.length)];
      const note = sample.notes[Math.floor(Math.random() * sample.notes.length)];
      const daysAgo = Math.floor(Math.random() * tplt.daysSpread);
      const date = new Date(now.getTime() - daysAgo * 86400000);
      const isIncome = sample.catName === 'รายได้';
      const catId = isIncome
        ? (findCat('เงินเดือน', 'income') ?? findCat('รายได้', 'income') ?? findCat('อื่นๆ', 'income'))
        : findCat(sample.catName, 'expense');
      if (catId && primaryAccountId) {
        txs.push({
          user_id: userId,
          type: isIncome ? 'income' : 'expense',
          amount,
          category_id: catId,
          account_id: primaryAccountId,
          date: date.toISOString().slice(0, 10),
          note,
        });
      }
    }

    // Monthly salary for last 3 months
    const incomeRec = persona.recurring.find((r) => r.type === 'income');
    if (incomeRec) {
      for (let m = 0; m < 3; m++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - m);
        d.setDate(incomeRec.day_of_month);
        if (d > now) continue;
        const incomeCatId = findCat('เงินเดือน', 'income') ?? findCat('รายได้', 'income');
        if (incomeCatId && primaryAccountId) {
          txs.push({
            user_id: userId,
            type: 'income',
            amount: incomeRec.amount,
            category_id: incomeCatId,
            account_id: primaryAccountId,
            date: d.toISOString().slice(0, 10),
            note: incomeRec.note,
          });
        }
      }
    }

    // Monthly housing/rent for last 3 months
    const housingRec = persona.recurring.find(
      (r) => r.type === 'expense' && (r.note.includes('ผ่อน') || r.note.includes('ค่าเช่า'))
    );
    if (housingRec) {
      for (let m = 0; m < 3; m++) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - m);
        d.setDate(housingRec.day_of_month);
        if (d > now) continue;
        const catId = findCat(housingRec.category_name ?? 'ที่อยู่อาศัย', 'expense');
        if (catId && primaryAccountId) {
          txs.push({
            user_id: userId,
            type: 'expense',
            amount: housingRec.amount,
            category_id: catId,
            account_id: primaryAccountId,
            date: d.toISOString().slice(0, 10),
            note: housingRec.note,
          });
        }
      }
    }

    for (let i = 0; i < txs.length; i += 100) {
      await admin.from('transactions').insert(txs.slice(i, i + 100));
    }

    // Net worth snapshots
    if (persona.snapshotProgression) {
      const sp = persona.snapshotProgression;
      let currentAssets = 0;
      let currentLiabilities = 0;
      for (const acc of persona.accounts) {
        if (acc.initial_balance >= 0) currentAssets += acc.initial_balance;
        else currentLiabilities += Math.abs(acc.initial_balance);
      }
      for (const inv of persona.investments) {
        currentAssets += inv.quantity * (inv.current_price ?? inv.avg_cost);
      }
      for (const d of persona.debts) {
        currentLiabilities += d.balance;
      }
      const currentNetWorth = currentAssets - currentLiabilities;

      const snapshots: any[] = [];
      const numSnapshots = Math.floor(sp.totalDays / sp.days);
      for (let i = 0; i <= numSnapshots; i++) {
        const daysAgo = sp.totalDays - i * sp.days;
        const t = i / numSnapshots;
        const interpolated = sp.startNetWorth + (currentNetWorth - sp.startNetWorth) * t;
        const noise = (Math.random() - 0.5) * 2 * (sp.noisePercent / 100) * Math.abs(interpolated);
        const nw = Math.round(interpolated + noise);
        const ratio = nw >= 0 ? 1.3 : 0.6;
        const assets = Math.max(0, Math.round(nw * ratio));
        const liabilities = Math.max(0, assets - nw);
        const date = new Date(now);
        date.setDate(date.getDate() - daysAgo);
        snapshots.push({
          user_id: userId,
          date: date.toISOString().slice(0, 10),
          total_assets: assets,
          total_liabilities: liabilities,
          net_worth: nw,
        });
      }
      for (let i = 0; i < snapshots.length; i += 50) {
        await admin
          .from('net_worth_snapshots')
          .upsert(snapshots.slice(i, i + 50), { onConflict: 'user_id,date', ignoreDuplicates: false });
      }
    }

    // Advisor reports
    for (const r of persona.advisorReports) {
      const createdAt = new Date(now.getTime() - r.daysAgo * 86400000).toISOString();
      await admin.from('advisor_reports').insert({
        user_id: userId,
        domain: r.domain,
        title: r.title,
        summary: r.summary,
        content: r.content,
        provider: 'demo',
        model: 'demo-seed',
        created_at: createdAt,
      });
    }

    // Notifications
    for (const n of persona.notificationHistory) {
      const createdAt = new Date(now.getTime() - n.daysAgo * 86400000).toISOString();
      const isRead = n.daysAgo > 7 || Math.random() > 0.4;
      await admin.from('notifications').insert({
        user_id: userId,
        type: n.type,
        severity: n.severity,
        title: n.title,
        body: n.body,
        read_at: isRead ? createdAt : null,
        created_at: createdAt,
      });
    }

    revalidatePath('/settings/admin/seed-demo');
    return { ok: true, userId };
  } catch (e: any) {
    console.error('seed error:', e);
    return { ok: false, error: e?.message ?? 'seed_failed' };
  }
}

export async function seedAllDemoAccounts(): Promise<{
  ok: boolean;
  results: { key: string; ok: boolean; error?: string }[];
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return { ok: false, results: [] };

  const { PERSONAS } = await import('@/lib/demo/personas');
  const results = [];
  for (const persona of PERSONAS) {
    const r = await seedDemoAccount(persona.key);
    results.push({ key: persona.key, ok: r.ok, error: r.error });
  }
  return { ok: results.every((r) => r.ok), results };
}
