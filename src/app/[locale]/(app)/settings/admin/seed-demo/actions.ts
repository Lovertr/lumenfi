'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/admin';
import { getPersona, type PersonaKey } from '@/lib/demo/personas';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'tintanee.t@gmail.com';

export async function seedDemoAccount(personaKey: PersonaKey): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthorized' };
  if (user.email !== ADMIN_EMAIL) return { ok: false, error: 'forbidden' };

  const persona = getPersona(personaKey);
  if (!persona) return { ok: false, error: 'invalid_persona' };

  const admin = createServiceClient();

  // Find or create user by email
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
      return { ok: false, error: `user_create_failed: ${createErr?.message ?? 'unknown'}` };
    }
    targetUser = created.user;
  }

  const userId = targetUser.id;

  try {
    // ─── 1) Wipe existing data
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

    // ─── 2) Update profile
    await admin.from('profiles').upsert({
      id: userId,
      email: persona.email,
      ...persona.profile,
      onboarded: true,
      default_currency: 'THB',
      updated_at: new Date().toISOString(),
    });

    // ─── 3) Accounts
    const accountIds: Record<string, string> = {};
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
      if (data) accountIds[acc.name] = data.id;
    }

    // ─── 4) Find category IDs (use existing seeded categories)
    const { data: cats } = await admin.from('categories').select('id, name, type').eq('user_id', userId);
    const allCats = cats ?? [];

    // If user has no categories yet, copy from default seeds
    if (allCats.length === 0) {
      const { data: defaultCats } = await admin.from('categories').select('name, type, icon, color').is('user_id', null).limit(100);
      for (const c of (defaultCats ?? [])) {
        const { data: inserted } = await admin
          .from('categories')
          .insert({
            user_id: userId,
            name: c.name,
            type: c.type,
            icon: c.icon,
            color: c.color,
          })
          .select('id, name, type')
          .single();
        if (inserted) allCats.push(inserted);
      }
    }

    const findCat = (name: string, type: 'income' | 'expense' = 'expense') => {
      return allCats.find((c) => c.name.includes(name) && c.type === type)?.id ?? null;
    };

    // ─── 5) Goals
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

    // ─── 6) Debts
    for (const d of persona.debts) {
      await admin.from('debts').insert({
        user_id: userId,
        name: d.name,
        type: d.type,
        current_balance: d.balance,
        interest_rate: d.rate,
        monthly_payment: d.monthly_payment,
        remaining_term: d.remaining_term ?? null,
        status: 'active',
      });
    }

    // ─── 7) Investments
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

    // ─── 8) Insurance policies
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

    // ─── 9) Budgets
    for (const b of persona.budgets) {
      const catId = findCat(b.category_name);
      if (catId) {
        await admin.from('budgets').insert({
          user_id: userId,
          category_id: catId,
          amount: b.amount,
        });
      }
    }

    // ─── 10) Recurring transactions
    for (const r of persona.recurring) {
      const catId = r.category_name ? findCat(r.category_name, r.type === 'income' ? 'income' : 'expense') : null;
      const firstAccountId = Object.values(accountIds)[0];
      await admin.from('recurring_transactions').insert({
        user_id: userId,
        type: r.type,
        amount: r.amount,
        category_id: catId,
        account_id: firstAccountId,
        day_of_month: r.day_of_month,
        is_active: true,
        note: r.note,
      });
    }

    // ─── 11) Generate realistic transaction history (90 days)
    const tplt = persona.transactionTemplate;
    const now = new Date();
    const expenseCategories = ['อาหาร', 'เดินทาง', 'บันเทิง', 'ของใช้ส่วนตัว', 'สุขภาพ', 'อื่นๆ'];
    const samples = [
      { catName: 'อาหาร', amounts: [85, 120, 150, 65, 45, 220, 380, 145, 90, 60], notes: ['อาหารเช้า 7-11', 'ข้าวกลางวัน', 'อาหารเย็น', 'กาแฟ', 'ขนม', 'ส่งอาหาร Grab', 'ทานข้าวกับเพื่อน', 'อาหารเช้า', 'ก๋วยเตี๋ยว', 'น้ำผลไม้'] },
      { catName: 'เดินทาง', amounts: [50, 80, 35, 250, 180, 120], notes: ['BTS', 'Grab', 'แท็กซี่', 'น้ำมัน', 'ค่าทางด่วน', 'มอเตอร์ไซค์รับจ้าง'] },
      { catName: 'บันเทิง', amounts: [350, 800, 1200, 280, 450], notes: ['ดูหนัง', 'คอนเสิร์ต', 'ทัวร์ปลายปี', 'หนังสือ', 'เกม'] },
      { catName: 'ของใช้ส่วนตัว', amounts: [180, 450, 320, 850, 1200], notes: ['ยาสีฟัน', 'ครีมกันแดด', 'เสื้อผ้า', 'รองเท้า', 'น้ำหอม'] },
      { catName: 'สุขภาพ', amounts: [800, 350, 1500, 250], notes: ['ยา', 'วิตามิน', 'หาหมอ', 'ตรวจสุขภาพ'] },
    ];

    const txs: any[] = [];
    for (let i = 0; i < tplt.count; i++) {
      const sample = samples[Math.floor(Math.random() * samples.length)];
      const amount = sample.amounts[Math.floor(Math.random() * sample.amounts.length)];
      const note = sample.notes[Math.floor(Math.random() * sample.notes.length)];
      const daysAgo = Math.floor(Math.random() * tplt.daysSpread);
      const date = new Date(now.getTime() - daysAgo * 86400000);
      const catId = findCat(sample.catName, 'expense');
      const accountId = Object.values(accountIds)[Math.floor(Math.random() * Math.min(2, Object.values(accountIds).length))];
      if (catId && accountId) {
        txs.push({
          user_id: userId,
          type: 'expense',
          amount,
          category_id: catId,
          account_id: accountId,
          date: date.toISOString().slice(0, 10),
          note,
        });
      }
    }

    // Add monthly salary transactions for the last 3 months
    for (let m = 0; m < 3; m++) {
      const salaryDate = new Date(now);
      salaryDate.setMonth(salaryDate.getMonth() - m);
      salaryDate.setDate(persona.recurring.find((r) => r.type === 'income')?.day_of_month ?? 25);
      const salaryAmount = persona.profile.income_salary_monthly || persona.profile.monthly_income;
      const incomeCatId = findCat('เงินเดือน', 'income') ?? findCat('รายได้', 'income');
      const accountId = Object.values(accountIds)[0];
      if (salaryAmount > 0 && accountId) {
        txs.push({
          user_id: userId,
          type: 'income',
          amount: salaryAmount,
          category_id: incomeCatId,
          account_id: accountId,
          date: salaryDate.toISOString().slice(0, 10),
          note: 'เงินเดือน',
        });
      }
    }

    // Bulk insert in chunks
    for (let i = 0; i < txs.length; i += 100) {
      await admin.from('transactions').insert(txs.slice(i, i + 100));
    }

    revalidatePath('/settings/admin/seed-demo');
    return { ok: true, userId };
  } catch (e: any) {
    console.error('seed error:', e);
    return { ok: false, error: e?.message ?? 'seed_failed' };
  }
}
