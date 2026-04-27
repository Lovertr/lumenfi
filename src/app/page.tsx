import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * Root page — explicit redirect to default locale.
 * This works regardless of middleware/matcher behavior on the edge.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
