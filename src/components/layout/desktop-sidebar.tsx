'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import {
  Home,
  ListChecks,
  Plus,
  Brain,
  CreditCard,
  Target,
  TrendingUp,
  Wallet,
  Settings,
  FolderOpen,
  FileBarChart,
  Activity,
  Repeat,
  Calculator,
  Camera,
  PiggyBank,
  Shield,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from './language-switcher';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function DesktopSidebar() {
  const tNav = useTranslations('Nav');
  const tMore = useTranslations('More');
  const tDash = useTranslations('Dashboard');
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      items: [
        { href: '/dashboard', icon: Home, label: tNav('home') },
        { href: '/transactions', icon: ListChecks, label: tNav('transactions') },
        { href: '/transactions/scan', icon: Camera, label: tMore('scan') },
        { href: '/cashflow', icon: Activity, label: 'Cash Flow' },
        { href: '/networth', icon: TrendingUp, label: 'ฐานะรวม' },
      ],
    },
    {
      title: tNav('home') === 'หน้าหลัก' ? 'การเงิน' : 'Money',
      items: [
        { href: '/accounts', icon: Wallet, label: tDash('quickActions.accounts') },
        { href: '/debts', icon: CreditCard, label: tDash('quickActions.debts') },
        { href: '/goals', icon: Target, label: tDash('quickActions.goals') },
        { href: '/investments', icon: TrendingUp, label: tDash('quickActions.investments') },
        { href: '/insurance', icon: Shield, label: 'ประกัน' },
      ],
    },
    {
      title: tNav('home') === 'หน้าหลัก' ? 'วางแผน' : 'Plan',
      items: [
        { href: '/budgets', icon: PiggyBank, label: tMore('budgets') },
        { href: '/recurring', icon: Repeat, label: tMore('recurring') },
        { href: '/tools/tax', icon: Calculator, label: tMore('tax') },
        { href: '/tools/debt', icon: CreditCard, label: tMore('debtCalc') },
        { href: '/tools/loan', icon: Calculator, label: tMore('loan') },
      ],
    },
    {
      title: tNav('home') === 'หน้าหลัก' ? 'อื่นๆ' : 'Other',
      items: [
        { href: '/advisor', icon: Sparkles, label: 'ที่ปรึกษา AI' },
        { href: '/ai', icon: Brain, label: tNav('ai') },
        { href: '/help', icon: HelpCircle, label: 'คู่มือ' },
        { href: '/reports', icon: FileBarChart, label: tMore('reports') },
        { href: '/categories', icon: FolderOpen, label: tMore('categories') },
        { href: '/settings', icon: Settings, label: tMore('settings') },
      ],
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-6 py-5 border-b">
        <LogoMark size={36} />
        <Wordmark className="text-xl" />
      </Link>

      <Link
        href="/transactions/new"
        className="mx-4 mt-4 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        {tNav('add')}
      </Link>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.title && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname === item.href || pathname.startsWith(item.href + '/')}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}
