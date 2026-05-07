import { Link } from '@/i18n/routing';
import { Sparkles, Zap, Key, Crown } from 'lucide-react';

interface Props {
  via: 'subscription' | 'free' | 'credits' | 'byo' | null;
  quota?: {
    used: number;
    limit: number | null;
    remaining: number | null;
    period: 'day' | 'month';
  };
  feature: 'advisor' | 'chat';
}

export function QuotaBanner({ via, quota, feature }: Props) {
  if (via === 'subscription') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
        <Crown className="h-3.5 w-3.5 text-primary" />
        <span><b>Pro</b> — ใช้ได้ไม่จำกัด</span>
      </div>
    );
  }

  if (via === 'byo') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-300/50 bg-emerald-50/50 px-3 py-2 text-xs dark:bg-emerald-950/20">
        <Key className="h-3.5 w-3.5 text-emerald-600" />
        <span>ใช้ AI Key ของคุณเอง — ไม่จำกัด</span>
      </div>
    );
  }

  if (via === 'credits' && quota) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-amber-300/50 bg-amber-50/50 px-3 py-2 text-xs dark:bg-amber-950/20">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-600" />
          <span>Credit pack — เหลือ <b>{quota.remaining}</b> reports</span>
        </div>
        <Link href="/pricing" className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-300">
          เติมเพิ่ม
        </Link>
      </div>
    );
  }

  if (via === 'free' && quota) {
    const isLow = quota.remaining !== null && quota.remaining <= 1;
    return (
      <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
        isLow
          ? 'border-rose-300/50 bg-rose-50/50 dark:bg-rose-950/20'
          : 'border-border bg-muted/30'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            Free quota — ใช้ไป <b>{quota.used}</b>/{quota.limit} {feature === 'chat' ? 'ข้อความ' : 'reports'}
            {quota.period === 'day' ? ' วันนี้' : ' เดือนนี้'}
          </span>
        </div>
        {isLow && (
          <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            อัพเกรด Pro
          </Link>
        )}
      </div>
    );
  }

  return null;
}
