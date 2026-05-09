import { Link } from '@/i18n/routing';
import { Sparkles, ChevronRight } from 'lucide-react';

export function AdvisorEntry({
  summary,
  lastReport,
}: {
  summary?: string | null;
  lastReport?: { domain: string; created_at: string; title: string } | null;
}) {
  const lastTime = lastReport
    ? new Date(lastReport.created_at).toLocaleString('th-TH', { dateStyle: 'medium' })
    : null;

  return (
    <Link href="/advisor" className="block">
      <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-5 text-white shadow-md transition-all hover:shadow-xl">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-medium opacity-90">ที่ปรึกษา AI</p>
            </div>
            <p className="mt-1 text-base font-bold lg:text-lg">เลขาทางการเงินส่วนตัว</p>
            <p className="mt-0.5 text-xs opacity-85">
              {summary ?? 'วิเคราะห์ครบทุกมิติ พร้อมแผนปฏิบัติได้จริง'}
            </p>
            {lastReport && lastTime && (
              <p className="mt-2 text-[10px] opacity-70">
                ล่าสุด: {lastReport.title} · {lastTime}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 opacity-80 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
