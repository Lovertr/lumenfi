import { Activity, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { RiskMetrics } from '@/lib/queries/portfolio-snapshot';

export function RiskMetricsCard({ metrics }: { metrics: RiskMetrics }) {
  if (metrics.daysOfData < 7) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Risk Metrics</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                ต้องมีข้อมูลอย่างน้อย 7 วันถึงจะคำนวณได้ — ตอนนี้มี {metrics.daysOfData} วัน
                <br />
                Snapshot จะถูกสร้างทุกวันโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Risk classification
  const volatilityLabel =
    metrics.volatility < 10 ? 'ต่ำ' :
    metrics.volatility < 20 ? 'ปานกลาง' :
    metrics.volatility < 30 ? 'สูง' : 'สูงมาก';
  const volatilityColor =
    metrics.volatility < 10 ? 'text-emerald-600' :
    metrics.volatility < 20 ? 'text-amber-600' :
    'text-rose-600';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Risk Metrics</h2>
          <span className="text-[10px] text-muted-foreground">
            ({metrics.daysOfData} วัน)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Volatility */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">ความผันผวน (Annualized)</p>
            <p className={`mt-0.5 text-lg font-bold ${volatilityColor}`}>
              {metrics.volatility.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">{volatilityLabel}</p>
          </div>

          {/* Max Drawdown */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">Max Drawdown</p>
            <p className="mt-0.5 flex items-center gap-1 text-lg font-bold text-rose-600">
              <TrendingDown className="h-3.5 w-3.5" />
              -{metrics.maxDrawdown.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">ขาดทุนสูงสุด</p>
          </div>

          {/* Sharpe Ratio */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">Sharpe Ratio</p>
            <p className={`mt-0.5 text-lg font-bold ${
              metrics.sharpe === null ? 'text-muted-foreground' :
              metrics.sharpe > 1 ? 'text-emerald-600' :
              metrics.sharpe > 0 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {metrics.sharpe !== null ? metrics.sharpe.toFixed(2) : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {metrics.sharpe === null ? 'ไม่มีข้อมูล' :
               metrics.sharpe > 1 ? 'ดีมาก' :
               metrics.sharpe > 0 ? 'พอใช้' : 'ต่ำกว่า risk-free'}
            </p>
          </div>

          {/* Total Return since first snapshot */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] text-muted-foreground">Total Return</p>
            <p className={`mt-0.5 flex items-center gap-1 text-lg font-bold ${
              metrics.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {metrics.totalReturn >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">ตั้งแต่เริ่ม snapshot</p>
          </div>
        </div>

        {(metrics.bestDay !== null || metrics.worstDay !== null) && (
          <div className="mt-3 flex items-center justify-around text-[11px]">
            {metrics.bestDay !== null && (
              <span className="text-emerald-600">
                วันที่ดีสุด +{metrics.bestDay.toFixed(2)}%
              </span>
            )}
            {metrics.worstDay !== null && (
              <span className="text-rose-600">
                วันที่แย่สุด {metrics.worstDay.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {metrics.maxDrawdown > 20 && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Drawdown เกิน 20% — ความเสี่ยงสูง พิจารณากระจายความเสี่ยงเพิ่ม
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
