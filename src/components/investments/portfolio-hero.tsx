'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatTHB } from '@/lib/utils';

interface Props {
  totalValue: number;
  totalCost: number;
  totalPL: number;
  totalPLPercent: number;
  holdingsCount: number;
  todayChange?: number | null;
  todayChangePercent?: number | null;
}

export function PortfolioHero({ totalValue, totalCost, totalPL, totalPLPercent, holdingsCount, todayChange, todayChangePercent }: Props) {
  const isProfit = totalPL >= 0;
  const profitColor = isProfit ? 'text-[#10B981]' : 'text-[#FCA5A5]';

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0F1F] to-[#1E293B] p-6 text-white lg:p-8">
      <p className="text-sm opacity-90">มูลค่าพอร์ตรวม</p>
      <p className="mt-1 text-3xl font-bold lg:text-5xl">{formatTHB(totalValue)}</p>

      {/* P/L summary */}
      <div className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${profitColor}`}>
        {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        <span>
          {isProfit ? '+' : ''}{formatTHB(totalPL)} ({totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(2)}%)
        </span>
      </div>

      {todayChange !== null && todayChange !== undefined && (
        <p className={`mt-1 text-xs ${todayChange >= 0 ? 'text-[#10B981]' : 'text-[#FCA5A5]'}`}>
          วันนี้: {todayChange >= 0 ? '+' : ''}{formatTHB(todayChange)} ({(todayChangePercent ?? 0) >= 0 ? '+' : ''}{(todayChangePercent ?? 0).toFixed(2)}%)
        </p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 text-xs lg:gap-6 lg:text-sm">
        <div>
          <p className="opacity-70">ทุนรวม</p>
          <p className="mt-0.5 font-semibold lg:text-lg">{formatTHB(totalCost)}</p>
        </div>
        <div>
          <p className="opacity-70">P/L รวม</p>
          <p className={`mt-0.5 font-semibold lg:text-lg ${profitColor}`}>
            {isProfit ? '+' : ''}{formatTHB(totalPL)}
          </p>
        </div>
        <div>
          <p className="opacity-70">จำนวนรายการ</p>
          <p className="mt-0.5 font-semibold lg:text-lg">{holdingsCount}</p>
        </div>
      </div>
    </div>
  );
}
