import { CreditCard, User, Car, Home, GraduationCap, AlertTriangle, Percent, Package } from 'lucide-react';

export type DebtType =
  | 'credit_card'
  | 'personal_loan'
  | 'auto_loan'
  | 'mortgage'
  | 'student_loan'
  | 'informal'
  | 'installment_zero'
  | 'other';

export const debtTypeConfig: Record<
  DebtType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  credit_card: { icon: CreditCard, color: 'text-rose-700', bg: 'bg-rose-50' },
  personal_loan: { icon: User, color: 'text-violet-700', bg: 'bg-violet-50' },
  auto_loan: { icon: Car, color: 'text-blue-700', bg: 'bg-blue-50' },
  mortgage: { icon: Home, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  student_loan: { icon: GraduationCap, color: 'text-amber-700', bg: 'bg-amber-50' },
  informal: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
  installment_zero: { icon: Percent, color: 'text-cyan-700', bg: 'bg-cyan-50' },
  other: { icon: Package, color: 'text-slate-700', bg: 'bg-slate-100' },
};

export const debtTypes: DebtType[] = [
  'credit_card',
  'personal_loan',
  'auto_loan',
  'mortgage',
  'student_loan',
  'informal',
  'installment_zero',
  'other',
];
