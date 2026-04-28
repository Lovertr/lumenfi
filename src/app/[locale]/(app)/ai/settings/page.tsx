import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, MessageSquare } from 'lucide-react';
import { AISettingsForm } from '@/components/ai/ai-settings-form';
import { ProviderSetupGuide } from '@/components/ai/provider-setup-guide';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AISettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AI.settings');
  const isTh = locale === 'th';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('profiles')
    .select('ai_provider, ai_api_key_encrypted, ai_privacy_mode')
    .eq('id', user.id)
    .single();

  const hasKey = !!data?.ai_api_key_encrypted;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href={hasKey ? '/ai' : '/more'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('title')}</h1>
            <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>
        {hasKey && (
          <Button asChild size="sm" variant="outline">
            <Link href="/ai">
              <MessageSquare className="h-4 w-4" />
              {isTh ? 'ไปคุย' : 'Chat'}
            </Link>
          </Button>
        )}
      </header>

      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-success mt-0.5" />
            <p className="text-xs">
              {isTh
                ? 'API key เข้ารหัสแบบ AES-256 ก่อนเก็บลง database — เราเห็นค่าจริงไม่ได้'
                : 'API key is AES-256 encrypted before storage — we cannot read the raw value'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <AISettingsForm
            currentProvider={data?.ai_provider ?? null}
            hasKey={hasKey}
            privacyMode={data?.ai_privacy_mode ?? true}
          />
        </CardContent>
      </Card>

      <ProviderSetupGuide />
    </div>
  );
}
