import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Brain, Sparkles, Lock, Settings as SettingsIcon } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { createClient } from '@/lib/supabase/server';

async function getAIConfig() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('ai_provider, ai_api_key_encrypted, ai_privacy_mode')
    .eq('id', user.id)
    .single();
  return {
    provider: data?.ai_provider ?? null,
    hasKey: !!data?.ai_api_key_encrypted,
    privacyMode: data?.ai_privacy_mode ?? true,
  };
}

export default async function AIPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AI');

  const config = await getAIConfig();

  return (
    <div className="space-y-4 p-4 pt-6">
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
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {!config?.hasKey ? (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Brain className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold">{t('noKey')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('noKeyHint')}</p>
            <Button asChild className="mt-4">
              <Link href="/ai/settings">
                <SettingsIcon className="h-4 w-4" />
                {t('setupKey')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{t('settings.providers.' + config.provider)}</p>
                  <p className="text-xs text-muted-foreground">
                    {config.privacyMode && <Lock className="inline h-3 w-3 mr-1" />}
                    {config.privacyMode ? t('settings.privacyMode') : 'Direct'}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/ai/settings">
                    <SettingsIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suggested prompts */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                ลองเริ่มจากคำถามเหล่านี้
              </p>
              <div className="space-y-2">
                {[
                  t('chat.suggestions.0'),
                  t('chat.suggestions.1'),
                  t('chat.suggestions.2'),
                  t('chat.suggestions.3'),
                ].map((sug) => (
                  <button
                    key={sug}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Chat UI กำลังพัฒนา — Phase 7 (จะ build ในเซสชันถัดไป)
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
