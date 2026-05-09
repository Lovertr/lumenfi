import { Link } from '@/i18n/routing';
import { ChevronRight, Sparkles } from 'lucide-react';

export function ProfileCompletenessCard({ percent }: { percent: number }) {
  const remaining = Math.max(0, 100 - percent);
  return (
    <Link href="/settings/profile">
      <div className="group flex items-center gap-3 rounded-xl border-2 border-dashed border-purple-300/60 bg-gradient-to-r from-purple-50 to-indigo-50 p-3 transition-all hover:border-purple-400 dark:from-purple-950/20 dark:to-indigo-950/20">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">เติมโปรไฟล์เพื่อให้ AI ฉลาดขึ้น</p>
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
              {percent}%
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-purple-200/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ใช้เวลา 1 นาที กรอกอาชีพ + รายจ่ายแยกหมวด → AI วิเคราะห์เฉพาะคุณ
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
