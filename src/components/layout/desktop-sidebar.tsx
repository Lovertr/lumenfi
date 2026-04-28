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
  MoreHorizontal,
  Camera,
} from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/brand/logo-mark';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from './language-switcher';

export function DesktopSidebar() {
  const tNav = useTranslations('Nav');
  const tMore = useTranslations('More');
  const tDash = useTranslations('Dashboard');
  const pathname = usePathname();

  const primary = [
    { href: '/dashboard', icon: Home, label: tNav('home') },
    { href: '/transactions', icon: ListChecks, label: tNav('transactions') },
    { href: '/transactions/scan', icon: Camera, label: tMore('scan') ?? 'Scan' },
    { href: '/recurring', icon: Repeat, label: tMore('recurring') },
    { href: '/cashflow', icon: Activity, label: 'Cash Flow' },
    { href: '/accounts', icon: Wallet, label: tDash('quickActions.accounts') },
    { href: '/debts', icon: CreditCard, label: tDash('quickActions.debts') },
    { href: '/goals', icon: Target, label: tDash('quickActions.goals') },
    { href: '/investments', icon: TrendingUp, label: tDash('quickActions.investments') },
    { href: '/budgets', icon: Wallet, label: tMore('budgets') },
    { href: '/ai', icon: Brain, label: tNav('ai') },
  ];

  const secondary = [
    { href: '/tools/tax', icon: Calculator, label: tMore('tax') },
    { href: '/tools/debt', icon: CreditCard, label: tMore('debtCalc') },
    { href: '/reports', icon: FileBarChart, label: tMore('reports') },
    { href: '/categories', icon: FolderOpen, label: tMore('categories') },
    { href: '/more', icon: MoreHorizontal, label: tNav('more') },
    { href: '/settings', icon: Settings, label: tMore('settings') },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-background lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-6 py-5 border-b">
        <LogoMark size={36} />
        <Wordmark className="text-xl" />
      </Link>

      <div className="px-3 pt-4">
        <Link
          href="/transactions/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {tNav('add')}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {primary.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}

        <div className="my-3 border-t" />

        {secondary.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t px-3 py-3">
        <LanguageSwitcher className="w-full justify-center" />
        <LogoutButton variant="ghost" showLabel />
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
