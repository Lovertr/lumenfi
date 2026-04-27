import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Thai Baht currency
 */
export function formatTHB(amount: number, options: { showSign?: boolean; compact?: boolean } = {}): string {
  const { showSign = false, compact = false } = options;

  if (compact) {
    const abs = Math.abs(amount);
    let value: string;
    if (abs >= 1_000_000) {
      value = `${(amount / 1_000_000).toFixed(2)}M`;
    } else if (abs >= 1_000) {
      value = `${(amount / 1_000).toFixed(1)}K`;
    } else {
      value = amount.toFixed(0);
    }
    return `฿${value}`;
  }

  const formatted = new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (showSign && amount > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Format date in Thai locale
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'relative') {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'วันนี้';
    if (diffDays === 1) return 'เมื่อวาน';
    if (diffDays < 7) return `${diffDays} วันก่อน`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ก่อน`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนก่อน`;
    return `${Math.floor(diffDays / 365)} ปีก่อน`;
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: format === 'long' ? 'long' : 'medium',
  }).format(d);
}

/**
 * Calculate financial health score (0-100)
 */
export function calculateHealthScore(input: {
  savingsRate: number; // 0-1
  dti: number; // 0-1
  emergencyFundMonths: number;
  assetClassCount: number;
  goalsOnTrack: boolean;
}): number {
  let score = 0;

  // Savings rate (25 points)
  if (input.savingsRate >= 0.2) score += 25;
  else if (input.savingsRate >= 0.1) score += 15;
  else score += 5;

  // DTI (25 points) - lower is better
  if (input.dti < 0.3) score += 25;
  else if (input.dti < 0.4) score += 15;
  else score += 5;

  // Emergency fund (25 points)
  if (input.emergencyFundMonths >= 6) score += 25;
  else if (input.emergencyFundMonths >= 3) score += 15;
  else score += 5;

  // Diversification (15 points)
  if (input.assetClassCount >= 3) score += 15;
  else if (input.assetClassCount >= 2) score += 10;
  else score += 5;

  // Goals on track (10 points)
  if (input.goalsOnTrack) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate amortization schedule for a debt
 */
export function generateAmortization(input: {
  principal: number;
  annualRate: number; // %
  termMonths: number;
  monthlyPayment?: number;
}): Array<{
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const monthlyRate = input.annualRate / 100 / 12;
  const payment =
    input.monthlyPayment ??
    (input.principal * monthlyRate * Math.pow(1 + monthlyRate, input.termMonths)) /
      (Math.pow(1 + monthlyRate, input.termMonths) - 1);

  const schedule = [];
  let balance = input.principal;

  for (let month = 1; month <= input.termMonths && balance > 0; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(payment - interest, balance);
    balance -= principalPaid;

    schedule.push({
      month,
      payment: principalPaid + interest,
      principal: principalPaid,
      interest,
      balance: Math.max(0, balance),
    });
  }

  return schedule;
}
