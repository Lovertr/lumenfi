import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Auth gate — redirect to login if not authenticated
  // (Skipped if Supabase env vars not configured — for first preview)
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project');

  if (supabaseConfigured) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/${locale}/login`);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-20">
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
