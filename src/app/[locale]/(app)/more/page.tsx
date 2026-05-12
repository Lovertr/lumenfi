import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  TrendingUp, FolderOpen, Settings as SettingsIcon, Brain, FileBarChart,
  ChevronRight, Activity, Repeat, Wallet, Calculator, CreditCard, PiggyBank,
  Camera, Target, Home as HomeIcon, Shield, HelpCircle, Gift, Briefcase,
} from 'lucide-react';

interface MoreItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  color: string;
}

interface MoreSection {
  title?: string;
  items: MoreItem[];
}

export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('More');
  const tDash = await getTranslations('Dashboard');
  const isTh = locale === 'th';

  // Check if this user is an active agent — only then we surface the
  // Agent Dashboard shortcut in the 'อื่นๆ' section.
  let isAgent = false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle();
      if ((agent as any)?.status === 'active') isAgent = true;
    }
  } catch {
    /* swallow — non-critical */
  }

  const sections: MoreSection[] = [
    {
      // (top, no title)
      items: [
        { href: '/cashflow', icon: Activity, label: 'Cash Flow', desc: 'Track income, expense and runway', color: 'text-cyan-600 bg-cyan-50' },
        { href: '/networth', icon: TrendingUp, label: 'ฐานะการเงินรวม', desc: 'Net Worth + แนวโน้ม 1 ปี', color: 'text-violet-600 bg-violet-50' },
        { href: '/transactions/scan', icon: Camera, label: t('scan'), desc: isTh ? 'สแกนใบเสร็จด้วย AI' : 'Scan receipt with AI', color: 'text-pink-600 bg-pink-50' },
      ],
    },
    {
      title: isTh ? 'การเงิน' : 'Money',
      items: [
        { href: '/accounts', icon: Wallet, label: tDash('quickActions.accounts'), desc: isTh ? 'จัดการบัญชีธนาคาร' : 'Manage bank accounts', color: 'text-blue-600 bg-blue-50' },
        { href: '/debts', icon: CreditCard, label: tDash('quickActions.debts'), desc: isTh ? 'หนี้สินและการผ่อน' : 'Debts and payments', color: 'text-rose-600 bg-rose-50' },
        { href: '/goals', icon: Target, label: tDash('quickActions.goals'), desc: isTh ? 'เป้าหมายการเงิน' : 'Financial goals', color: 'text-violet-600 bg-violet-50' },
        { href: '/investments', icon: TrendingUp, label: t('investments'), desc: t('investmentsDesc'), color: 'text-green-600 bg-green-50' },
        { href: '/insurance', icon: Shield, label: 'ประกัน (วิเคราะห์ + ขอใบเสนอ)', desc: 'วิเคราะห์ช่องว่างความคุ้มครอง', color: 'text-rose-600 bg-rose-50' },
      ],
    },
    {
      title: isTh ? 'วางแผน' : 'Plan',
      items: [
        { href: '/budgets', icon: PiggyBank, label: t('budgets'), desc: t('budgetsDesc'), color: 'text-emerald-600 bg-emerald-50' },
        { href: '/recurring', icon: Repeat, label: t('recurring'), desc: isTh ? 'รายการประจำ + แจ้งเตือน' : 'Recurring + alerts', color: 'text-blue-600 bg-blue-50' },
        { href: '/tools/tax', icon: Calculator, label: t('tax'), desc: t('taxDesc'), color: 'text-amber-600 bg-amber-50' },
        { href: '/tools/debt', icon: CreditCard, label: t('debtCalc'), desc: t('debtCalcDesc'), color: 'text-rose-600 bg-rose-50' },
        { href: '/tools/loan', icon: Calculator, label: t('loan'), desc: t('loanDesc'), color: 'text-indigo-600 bg-indigo-50' },
      ],
    },
    {
      title: isTh ? 'อื่นๆ' : 'Other',
      items: [
        ...(isAgent
          ? [{
              href: '/agents/dashboard',
              icon: Briefcase,
              label: 'Agent Dashboard',
              desc: 'ดู leads + จัดการโปรไฟล์ตัวแทน',
              color: 'text-amber-700 bg-amber-50',
            }]
          : []),
        {
          href: '/settings/referral',
          icon: Gift,
          label: '🎁 ชวนเพื่อน — รับ Pro ฟรี',
          desc: 'ทั้งคุณและเพื่อนได้ Pro 30 วัน',
          color: 'text-rose-600 bg-rose-50',
        },
        { href: '/help', icon: HelpCircle, label: 'คู่มือ + AI ช่วยเหลือ', desc: 'วิธีใช้งาน + ถาม AI', color: 'text-cyan-600 bg-cyan-50' },
        { href: '/ai/settings', icon: Brain, label: t('ai'), desc: t('aiDesc'), color: 'text-purple-600 bg-purple-50' },
        { href: '/reports', icon: FileBarChart, label: t('reports'), desc: t('reportsDesc'), color: 'text-cyan-600 bg-cyan-50' },
        { href: '/categories', icon: FolderOpen, label: t('categories'), desc: t('categoriesDesc'), color: 'text-orange-600 bg-orange-50' },
        { href: '/settings', icon: SettingsIcon, label: t('settings'), desc: t('settingsDesc'), color: 'text-slate-600 bg-slate-100' },
        { href: '/settings/privacy', icon: Shield, label: 'ความเป็นส่วนตัว', desc: 'ส่งออก / ลบบัญชี (PDPA)', color: 'text-slate-600 bg-slate-100' },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-2">
          {section.title && (
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
          )}
          <Card>
            <CardContent className="divide-y p-0">
              {section.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${idx}`}
                    href={item.href}
                    className="flex items-center gap-3 p-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{item.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
