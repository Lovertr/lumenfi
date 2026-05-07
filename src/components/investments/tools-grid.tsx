import { Link } from '@/i18n/routing';
import { Eye, Calculator, Receipt, FileText, Repeat } from 'lucide-react';

const TOOLS = [
  {
    href: '/investments/recurring',
    icon: Repeat,
    label: 'DCA Auto',
    description: 'ลงทุนอัตโนมัติ',
    color: 'bg-pink-500',
  },
  {
    href: '/investments/watchlist',
    icon: Eye,
    label: 'Watchlist',
    description: 'แจ้งเตือนราคา',
    color: 'bg-sky-500',
  },
  {
    href: '/investments/tools/dca',
    icon: Calculator,
    label: 'DCA Calc',
    description: 'วางแผน DCA',
    color: 'bg-purple-500',
  },
  {
    href: '/investments/tax-saving',
    icon: Receipt,
    label: 'ลดหย่อน',
    description: 'RMF/SSF/PVD',
    color: 'bg-emerald-500',
  },
  {
    href: '/investments/tax-report',
    icon: FileText,
    label: 'รายงานภาษี',
    description: 'ใช้ยื่น ภ.ง.ด.',
    color: 'bg-orange-500',
  },
];

export function ToolsGrid() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col items-center gap-1.5 rounded-lg border bg-background p-2.5 text-center transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${t.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold leading-tight">{t.label}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{t.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
