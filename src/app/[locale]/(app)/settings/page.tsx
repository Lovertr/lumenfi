import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Brain, Globe, Shield, Download, Trash2, ChevronRight } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { createClient } from '@/lib/supabase/server';

async function getProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name, default_currency, monthly_income_target, monthly_expense_target')
    .eq('id', user.id)
    .single();
  return data;
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Settings');

  const profile = await getProfile();

  const items = [
    { href: '/settings/profile', icon: User, label: t('profile'), desc: t('profileDesc'), color: 'text-blue-600 bg-blue-50' },
    { href: '/ai', icon: Brain, label: t('ai'), desc: t('aiDesc'), color: 'text-purple-600 bg-purple-50' },
    { href: '/settings/privacy', icon: Shield, label: t('privacy'), desc: '', color: 'text-emerald-600 bg-emerald-50' },
    { href: '/settings/export', icon: Download, label: t('exportData'), desc: '', color: 'text-cyan-600 bg-cyan-50' },
  ];

  return (
    <div className="space-y-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{t('title')}</h1>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Profile summary */}
      {profile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary text-lg font-bold">
                {(profile.full_name || profile.email)?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{profile.full_name || '-'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="divide-y p-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  {item.desc && <p className="text-xs text-muted-foreground">{item.desc}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-destructive">{t('deleteAccount')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <LogoutButton variant="outline" showLabel />
      </div>
    </div>
  );
}
