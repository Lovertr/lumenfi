import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen, Plus, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { getCategories } from '@/lib/categories';
import { deleteCategory } from './actions';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Cat {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  icon: string;
  color: string;
  is_default: boolean;
}

async function getCategoriesWithMeta(): Promise<Cat[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    await getCategories();
    const { data } = await supabase
      .from('categories')
      .select('id, name, type, icon, color, is_default')
      .eq('archived', false)
      .order('is_default', { ascending: false })
      .order('name');
    return (data as Cat[]) ?? [];
  } catch {
    return [];
  }
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const categories = await getCategoriesWithMeta();
  const income = categories.filter((c) => c.type === 'income' || c.type === 'both');
  const expense = categories.filter((c) => c.type === 'expense' || c.type === 'both');
  const isTh = locale === 'th';

  function CategoryGrid({ list }: { list: Cat[] }) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {list.map((c) => (
          <div key={c.id} className="group relative">
            <div className="flex flex-col items-center gap-1 rounded-lg border bg-background p-3">
              <span className="text-2xl">{c.icon}</span>
              <span className="text-xs font-medium leading-tight text-center line-clamp-1">
                {c.name}
              </span>
            </div>
            {!c.is_default && (
              <form
                action={deleteCategory}
                className="absolute -top-1.5 -right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                  aria-label="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/more">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isTh ? 'หมวดหมู่' : 'Categories'}</h1>
            <p className="text-xs text-muted-foreground">
              {isTh ? 'จัดการหมวดรายรับ-รายจ่าย' : 'Manage income and expense categories'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild size="sm" className="hidden lg:inline-flex">
            <Link href="/categories/new">
              <Plus className="h-4 w-4" />
              {isTh ? 'เพิ่ม' : 'Add'}
            </Link>
          </Button>
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">
              {isTh ? 'กำลังโหลด default categories...' : 'Loading default categories...'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-success">
                {isTh ? 'รายรับ' : 'Income'} ({income.length})
              </h2>
              <CategoryGrid list={income} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-destructive">
                {isTh ? 'รายจ่าย' : 'Expense'} ({expense.length})
              </h2>
              <CategoryGrid list={expense} />
            </CardContent>
          </Card>

          <p className="px-1 text-xs text-muted-foreground">
            {isTh
              ? 'หมวดเริ่มต้นลบไม่ได้ ลบได้เฉพาะหมวดที่คุณสร้างเอง (hover เพื่อเห็นปุ่ม X)'
              : 'Default categories cannot be deleted. Only your custom ones (hover to show X button).'}
          </p>

          <Button
            asChild
            size="lg"
            className="fixed bottom-24 right-4 h-14 rounded-full shadow-lg sm:right-[calc(50%-208px)] lg:hidden"
          >
            <Link href="/categories/new">
              <Plus className="h-5 w-5" />
              {isTh ? 'เพิ่มหมวด' : 'Add'}
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
