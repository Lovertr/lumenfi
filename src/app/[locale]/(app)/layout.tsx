import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/layout/bottom-nav';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
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

  // Auth gate
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
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar (hidden on mobile) */}
      <DesktopSidebar />

      {/* Main content area — leaves space for sidebar on lg+ */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-md px-0 pb-24 lg:max-w-7xl lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile only) */}
      <BottomNav />
    </div>
  );
}
