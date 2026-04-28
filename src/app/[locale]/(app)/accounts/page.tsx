import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { createClient } from '@/lib/supabase/server';
import { getAccountBalanceMap } from '@/lib/queries/balances';
import { formatTHB } from '@/lib/utils';
import { accountTypeConfig, type AccountType } from '@/components/accounts/account-type-config';
import { Plus, Wallet, ArrowLeft } from 'lucide-react';

export const dynamic = "force-dynamic";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance: number;
  color: string;
  include_in_net_worth: boolean;
  credit_limit: number | null;
}

async function getAccounts(): Promise<Account[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, type, currency, initial_balance, color, include_in_net_worth, credit_limit')
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getAccounts:', error.message);
      return [];
    }
    return (data as Account[]) ?? [];
  } catch {
    return [];
  }
}

export default async function AccountsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Accounts');
  const tType = await getTranslations('Accounts.types');

  const [accounts, balances] = await Promise.all([getAccounts(), getAccountBalanceMap()]);
  const balOf = (id: string) => balances[id] ?? 0;

  const totalAssets = accounts
    .filter((a) => !accountTypeConfig[a.type].isLiability && a.include_in_net_worth)
    .reduce((sum, a) => sum + balOf(a.id), 0);

  const totalLiabilities = accounts
    .filter((a) => accountTypeConfig[a.type].isLiability && a.include_in_net_worth)
    .reduce((sum, a) => sum + balOf(a.id), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" className="hidden lg:inline-flex">
            <Link href="/accounts/new">
              <Plus className="h-4 w-4" />
              {t('addAccount')}
            </Link>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('totalAssets')}</p>
            <p className="mt-1 text-lg font-bold text-success">
              {formatTHB(totalAssets)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('totalLiabilities')}</p>
            <p className="mt-1 text-lg font-bold text-destructive">
              {formatTHB(totalLiabilities)}
            </p>
          </CardContent>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="font-semibold">{t('noAccounts')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noAccountsHint')}</p>
            <Button asChild className="mt-4">
              <Link href="/accounts/new">
                <Plus className="h-4 w-4" />
                {t('addAccount')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2 lg:gap-3">
          {accounts.map((account) => {
            const cfg = accountTypeConfig[account.type];
            const Icon = cfg.icon;
            const isLiability = cfg.isLiability;
            return (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card className="transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${cfg.bg} ${cfg.color}`}
                      style={account.color ? { backgroundColor: `${account.color}1A`, color: account.color } : undefined}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-semibold">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{tType(account.type)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isLiability ? 'text-destructive' : ''}`}>
                        {isLiability ? '-' : ''}
                        {formatTHB(balOf(account.id))}
                      </p>
                      {account.credit_limit && (
                        <p className="text-xs text-muted-foreground">
                          / {formatTHB(account.credit_limit)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {accounts.length > 0 && (
        <Button
          asChild
          size="lg"
          className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg sm:right-[calc(50%-208px)] lg:hidden"
        >
          <Link href="/accounts/new">
            <Plus className="h-5 w-5" />
            {t('addAccount')}
          </Link>
        </Button>
      )}
    </div>
  );
}
