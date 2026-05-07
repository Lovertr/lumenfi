// ─────────────────────────────────────────────────────────
// Tax-saving fund config (client-safe — no server-only imports)
// ─────────────────────────────────────────────────────────

export type TaxFundType = 'rmf' | 'ssf' | 'ssfx' | 'pvd' | 'gpf';

export interface TaxFundLimits {
  maxPercentOfIncome: number;
  maxAbsolute: number;
  description: string;
}

export const TAX_FUND_LIMITS: Record<TaxFundType, TaxFundLimits> = {
  rmf: {
    maxPercentOfIncome: 30,
    maxAbsolute: 500_000,
    description: 'RMF: 30% ของรายได้, ไม่เกิน 500,000 บาท (รวมกับ SSF/PVD/GPF)',
  },
  ssf: {
    maxPercentOfIncome: 30,
    maxAbsolute: 200_000,
    description: 'SSF: 30% ของรายได้, ไม่เกิน 200,000 บาท',
  },
  ssfx: {
    maxPercentOfIncome: 30,
    maxAbsolute: 200_000,
    description: 'SSF Extra: เพิ่มจาก SSF อีก',
  },
  pvd: {
    maxPercentOfIncome: 15,
    maxAbsolute: 500_000,
    description: 'PVD (กองทุนสำรองเลี้ยงชีพ): 15% ของเงินเดือน',
  },
  gpf: {
    maxPercentOfIncome: 30,
    maxAbsolute: 500_000,
    description: 'กบข.: 30% ของเงินเดือน, ไม่เกิน 500,000 บาท',
  },
};

export const TAX_FUND_LABELS: Record<TaxFundType, string> = {
  rmf: 'RMF',
  ssf: 'SSF',
  ssfx: 'SSF Extra',
  pvd: 'PVD',
  gpf: 'กบข.',
};
