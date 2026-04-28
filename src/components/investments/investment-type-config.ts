export type InvestmentType =
  | 'thai_stock'
  | 'foreign_stock'
  | 'mutual_fund'
  | 'etf'
  | 'crypto'
  | 'gold'
  | 'reit'
  | 'property'
  | 'bond'
  | 'fixed_deposit'
  | 'lottery_savings'
  | 'other';

export const investmentTypeConfig: Record<
  InvestmentType,
  { icon: string; color: string; bg: string }
> = {
  thai_stock: { icon: '📊', color: 'text-blue-700', bg: 'bg-blue-50' },
  foreign_stock: { icon: '🌐', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  mutual_fund: { icon: '📈', color: 'text-violet-700', bg: 'bg-violet-50' },
  etf: { icon: '📑', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  crypto: { icon: '₿', color: 'text-orange-700', bg: 'bg-orange-50' },
  gold: { icon: '🪙', color: 'text-amber-700', bg: 'bg-amber-50' },
  reit: { icon: '🏢', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  property: { icon: '🏠', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  bond: { icon: '📜', color: 'text-slate-700', bg: 'bg-slate-100' },
  fixed_deposit: { icon: '🏦', color: 'text-blue-700', bg: 'bg-blue-50' },
  lottery_savings: { icon: '🎫', color: 'text-pink-700', bg: 'bg-pink-50' },
  other: { icon: '📦', color: 'text-slate-700', bg: 'bg-slate-100' },
};

export const investmentTypes: InvestmentType[] = [
  'thai_stock',
  'foreign_stock',
  'mutual_fund',
  'etf',
  'crypto',
  'gold',
  'reit',
  'bond',
  'fixed_deposit',
  'other',
];
