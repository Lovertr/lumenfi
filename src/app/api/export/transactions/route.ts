import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data } = await supabase
    .from('transactions')
    .select(`
      date, type, amount, note,
      account:accounts!transactions_account_id_fkey(name),
      to_account:accounts!transactions_to_account_id_fkey(name),
      category:categories(name),
      goal:goals(name)
    `)
    .order('date', { ascending: false });

  const rows = (data ?? []) as any[];
  const header = ['Date', 'Type', 'Amount', 'Account', 'ToAccount', 'Category', 'Goal', 'Note'];
  const lines = [
    '﻿' + header.join(','), // BOM for Excel UTF-8
    ...rows.map((r) => [
      r.date,
      r.type,
      Number(r.amount).toFixed(2),
      r.account?.name ?? '',
      r.to_account?.name ?? '',
      r.category?.name ?? '',
      r.goal?.name ?? '',
      r.note ?? '',
    ].map(csvEscape).join(',')),
  ];

  const csv = lines.join('\r\n');
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="lumenfi-transactions-${today}.csv"`,
    },
  });
}
