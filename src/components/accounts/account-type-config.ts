import { Wallet, Landmark, CreditCard, Smartphone, PiggyBank, Package } from 'lucide-react';

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet' | 'savings' | 'other';

export const accountTypeConfig: Record<
  AccountType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    isLiability: boolean;
  }
> = {
  cash: { icon: Wallet, color: 'text-emerald-700', bg: 'bg-emerald-50', isLiability: false },
  bank: { icon: Landmark, color: 'text-blue-700', bg: 'bg-blue-50', isLiability: false },
  credit_card: { icon: CreditCard, color: 'text-rose-700', bg: 'bg-rose-50', isLiability: true },
  e_wallet: { icon: Smartphone, color: 'text-violet-700', bg: 'bg-violet-50', isLiability: false },
  savings: { icon: PiggyBank, color: 'text-amber-700', bg: 'bg-amber-50', isLiability: false },
  other: { icon: Package, color: 'text-slate-700', bg: 'bg-slate-100', isLiability: false },
};

export const accountTypes: AccountType[] = ['cash', 'bank', 'credit_card', 'e_wallet', 'savings', 'other'];
