import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { getCategories } from '@/lib/categories';

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categories = await getCategories();
  const income = categories.filter((c) => c.type === 'income' || c.type === 'both');
  const expense = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  return (
    <div className="space-y-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{locale === 'th' ? 'หมวดหมู่' : 'Categories'}</h1>
            <p className="text-xs text-muted-foreground">
              {locale === 'th' ? 'จัดการหมวดรายรับ-รายจ่าย' : 'Manage income & expense categories'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">
              {locale === 'th' ? 'กำลังโหลด default categories...' : 'Loading default categories...'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === 'th' ? 'รีเฟรชหน้าอีกครั้ง' : 'Try refreshing the page'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-success">
                {locale === 'th' ? 'รายรับ' : 'Income'} ({income.length})
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {income.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col items-center gap-1 rounded-lg border bg-background p-3"
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-xs font-medium leading-tight text-center">{c.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-destructive">
                {locale === 'th' ? 'รายจ่าย' : 'Expense'} ({expense.length})
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {expense.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col items-center gap-1 rounded-lg border bg-background p-3"
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <span className="text-xs font-medium leading-tight text-center">{c.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
