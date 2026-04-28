import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Sparkles, Brain, Calendar, Wallet,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { LogoutButton } from '@/components/auth/logout-button';
import { formatTHB } from '@/lib/utils';
import { getCashFlowAnalysis } from '@/lib/queries/cashflow';
import { CashFlowChart } from '@/components/cashflow/cashflow-chart';
import { CashFlowAIButton } from '@/components/cashflow/cashflow-ai-button';

export default async function CashFlowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTh = locale === 'th';

  const cf = await getCashFlowAnalysis();

  const statusCfg = {
    healthy: { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: CheckCircle2, label: isTh ? 'แข็งแรง' : 'Healthy' },
    tight: { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertCircle, label: isTh ? 'ตึงตัว' : 'Tight' },
    critical: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: AlertCircle, label: isTh ? 'อันตราย' : 'Critical' },
  }[cf.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pt-6 lg:pt-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isTh ? 'Cash Flow' : 'Cash Flow'}</h1>
            <p className="text-xs text-muted-foreground">
              {isTh ? 'ติดตามและวางแผนกระแสเงินสด' : 'Track and plan cash flow'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </header>

      <Card className={statusCfg.bg + ' border-2'}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <StatusIcon className={`h-5 w-5 shrink-0 mt-0.5 ${statusCfg.color}`} />
            <div className="flex-1">
              <p className={`font-semibold ${statusCfg.color}`}>
                {isTh ? 'สถานะ Cash Flow:' : 'Cash Flow Status:'} {statusCfg.label}
              </p>
              <p className="mt-1 text-sm">{cf.statusReason}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] text-white">
        <CardContent className="p-5 lg:p-6">
          <p className="text-sm opacity-80">{isTh ? 'เงินสดในมือ' : 'Cash on hand'}</p>
          <p className="mt-1 text-3xl font-bold lg:text-4xl">{formatTHB(cf.totalCashOnHand)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs lg:gap-6 lg:text-sm">
            <div>
              <p className="opacity-70">{isTh ? 'จะใช้ได้อีก' : 'Runway'}</p>
              <p className="mt-0.5 text-lg font-semibold lg:text-2xl">
                {cf.monthsOfRunway >= 99 ? '∞' : cf.monthsOfRunway.toFixed(1)} {isTh ? 'เดือน' : 'months'}
              </p>
            </div>
            <div>
              <p className="opacity-70">{isTh ? 'Net เฉลี่ย/เดือน' : 'Avg net/month'}</p>
              <p className={`mt-0.5 text-lg font-semibold lg:text-2xl ${cf.avgMonthlyNet >= 0 ? 'text-[#10B981]' : 'text-[#FCA5A5]'}`}>
                {cf.avgMonthlyNet >= 0 ? '+' : ''}
                {formatTHB(cf.avgMonthlyNet, { compact: true })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold lg:text-base">
              {isTh ? 'รายรับ-รายจ่าย 30 วันที่ผ่านมา' : 'Income vs Expense (last 30 days)'}
            </h2>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <CashFlowChart data={cf.daily} />
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{isTh ? '30 วันที่ผ่านมา' : 'Last 30 days'}</p>
            <p className={`mt-1 text-xl font-bold ${cf.last30.net >= 0 ? 'text-success' : 'text-destructive'}`}>
              {cf.last30.net >= 0 ? '+' : ''}
              {formatTHB(cf.last30.net, { compact: true })}
            </p>
            <div className="mt-2 space-y-0.5 text-xs">
              <p className="text-success">{isTh ? 'รายรับ' : 'In'}: +{formatTHB(cf.last30.income, { compact: true })}</p>
              <p className="text-destructive">{isTh ? 'รายจ่าย' : 'Out'}: -{formatTHB(cf.last30.expense, { compact: true })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{isTh ? '60 วัน' : '60 days'}</p>
            <p className={`mt-1 text-xl font-bold ${cf.last60.net >= 0 ? 'text-success' : 'text-destructive'}`}>
              {cf.last60.net >= 0 ? '+' : ''}
              {formatTHB(cf.last60.net, { compact: true })}
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>{isTh ? 'เฉลี่ย/เดือน' : 'avg/mo'}: {formatTHB(cf.last60.net / 2, { compact: true })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{isTh ? '90 วัน' : '90 days'}</p>
            <p className={`mt-1 text-xl font-bold ${cf.last90.net >= 0 ? 'text-success' : 'text-destructive'}`}>
              {cf.last90.net >= 0 ? '+' : ''}
              {formatTHB(cf.last90.net, { compact: true })}
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>{isTh ? 'เฉลี่ย/เดือน' : 'avg/mo'}: {formatTHB(cf.avgMonthlyNet, { compact: true })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 lg:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold lg:text-base">
            <Calendar className="h-4 w-4" />
            {isTh ? 'คาดการณ์ 30 วันข้างหน้า' : 'Next 30 days projection'}
          </h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isTh ? 'รายรับประจำที่คาดว่าจะได้' : 'Expected fixed income'}</span>
              <span className="font-semibold text-success">+{formatTHB(cf.upcomingFixedIncome + cf.avgMonthlyIncome - (cf.last30.income > 0 ? 0 : 0), { compact: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isTh ? 'รายจ่ายประจำ + ค่างวดหนี้' : 'Fixed expense + debt payments'}</span>
              <span className="font-semibold text-destructive">-{formatTHB(cf.upcomingFixedExpense + cf.avgMonthlyExpense, { compact: true })}</span>
            </div>
            <div className="border-t pt-2.5 flex justify-between">
              <span className="font-semibold">{isTh ? 'คาดว่าจะเหลือสุทธิ' : 'Projected net'}</span>
              <span className={`font-bold text-lg ${cf.projectedNet30 >= 0 ? 'text-success' : 'text-destructive'}`}>
                {cf.projectedNet30 >= 0 ? '+' : ''}
                {formatTHB(cf.projectedNet30, { compact: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CashFlowAIButton />

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 shrink-0 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">{isTh ? 'ทำไม Cash Flow สำคัญ?' : 'Why Cash Flow matters'}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {isTh
                  ? 'แม้รายได้ดี แต่ถ้า cash flow ติดลบเรื่อย ๆ จะต้องกู้เงินมาเสริม → เกิดดอกเบี้ย → หนี้พอกพูน เป้าหมายคือให้ "เงินเข้า ≥ เงินออก" ในแต่ละช่วงเวลา และมี runway 3-6 เดือนสำรองไว้'
                  : 'Even with good income, persistent negative cash flow forces borrowing → interest piles → debt grows. The goal is "cash in ≥ cash out" each period, with 3-6 months of runway as a buffer.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
