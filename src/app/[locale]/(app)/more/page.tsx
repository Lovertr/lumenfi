import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  TrendingUp, FolderOpen, Settings as SettingsIcon, Brain, FileBarChart, ChevronRight, Activity, Repeat,
  Wallet, Calculator, CreditCard,
} from 'lucide-react';

export default async function MorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('More');

  const items = [
    { href: '/cashflow', icon: Activity, key: 'investments', label: 'Cash Flow', desc: 'Track income, expense and runway', color: 'text-cyan-600 bg-cyan-50' },
    { href: '/recurring', icon: Repeat, key: 'recurring', label: t('recurring'), desc: t('recurring'), color: 'text-blue-600 bg-blue-50' },
    { href: '/budgets', icon: Wallet, key: 'budgets', label: t('budgets'), desc: t('budgetsDesc'), color: 'text-emerald-600 bg-emerald-50' },
    { href: '/tools/tax', icon: Calculator, key: 'tax', label: t('tax'), desc: t('taxDesc'), color: 'text-amber-600 bg-amber-50' },
    { href: '/tools/debt', icon: CreditCard, key: 'debtCalc', label: t('debtCalc'), desc: t('debtCalcDesc'), color: 'text-rose-600 bg-rose-50' },
    { href: '/tools/loan', icon: Calculator, key: 'loan', label: t('loan'), desc: t('loanDesc'), color: 'text-indigo-600 bg-indigo-50' },
    { href: '/investments', icon: TrendingUp, key: 'investments', label: t('investments'), desc: t('investmentsDesc'), color: 'text-green-600 bg-green-50' },
    { href: '/categories', icon: FolderOpen, key: 'categories', label: t('categories'), desc: t('categoriesDesc'), color: 'text-orange-600 bg-orange-50' },
    { href: '/ai/settings', icon: Brain, key: 'ai', label: t('ai'), desc: t('aiDesc'), color: 'text-purple-600 bg-purple-50' },
    { href: '/reports', icon: FileBarChart, key: 'reports', label: t('reports'), desc: t('reportsDesc'), color: 'text-cyan-600 bg-cyan-50' },
    { href: '/settings', icon: SettingsIcon, key: 'settings', label: t('settings'), desc: t('settingsDesc'), color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      <Card>
        <CardContent className="divide-y p-0">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={`${item.href}-${idx}`}
                href={item.href}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
