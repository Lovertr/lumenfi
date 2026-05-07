import { Link } from '@/i18n/routing';
import { Receipt, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatTHB } from '@/lib/utils';

interface Props {
  totalValue: number;
  totalContributed: number;
  count: number;
}

export function TaxSavingCard({ totalValue, totalContributed, count }: Props) {
  return (
    <Link href="/investments/tax-saving">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white transition-all hover:shadow-md dark:from-emerald-950/30 dark:to-background">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">กองทุนลดหย่อนภาษี</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {count > 0
                ? `${count} กอง · มูลค่า ${formatTHB(totalValue)}`
                : 'RMF · SSF · PVD — เช็คเพดาน'}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
