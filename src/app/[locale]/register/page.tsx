import { redirect } from 'next/navigation';

/**
 * /register?ref=CODE — legacy URL used by referral-share links.
 * We've unified everything on /signup?invite=CODE, so just forward.
 */
export const dynamic = 'force-dynamic';

export default async function RegisterRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const ref = typeof sp.ref === 'string' ? sp.ref.trim() : '';
  const invite = typeof sp.invite === 'string' ? sp.invite.trim() : '';
  const code = ref || invite;

  if (code) {
    redirect(`/${locale}/signup?invite=${encodeURIComponent(code)}`);
  }
  redirect(`/${locale}/signup`);
}
