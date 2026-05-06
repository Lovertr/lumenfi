'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { refreshInvestmentPrices } from '@/app/[locale]/(app)/investments/actions';

export function RefreshPricesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);

  async function handleClick() {
    setLoading(true);
    setUpdated(null);
    try {
      const r = await refreshInvestmentPrices();
      setUpdated(r.updated);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {updated !== null && !loading && (
        <span className="text-xs text-emerald-600">✓ อัปเดต {updated} รายการ</span>
      )}
      <Button onClick={handleClick} disabled={loading} size="sm" variant="outline">
        {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
        อัปเดตราคา
      </Button>
    </div>
  );
}
