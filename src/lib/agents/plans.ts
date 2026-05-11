export type AgentPlan = 'trial' | 'starter' | 'pro' | 'team' | 'founder';
export type BillingCycle = 'monthly' | 'annual';

export interface AgentPlanInfo {
  id: Exclude<AgentPlan, 'trial' | 'founder'>;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;     // total for the year
  leadsCap: number | null; // null = unlimited
  features: string[];
  highlight?: boolean;
}

export const AGENT_PLANS: AgentPlanInfo[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'เหมาะกับตัวแทน solo',
    monthlyPrice: 299,
    annualPrice: 2990,
    leadsCap: 25,
    features: [
      'รับ leads ได้สูงสุด 25 คน/เดือน',
      'Invite link ส่วนตัว',
      'Lead dashboard + status workflow',
      'INA Report PDF พร้อม branding',
      'Email notify เมื่อมี lead ใหม่',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'ตัวแทนที่ active เต็มที่',
    monthlyPrice: 699,
    annualPrice: 6990,
    leadsCap: null,
    highlight: true,
    features: [
      'รับ leads ไม่จำกัด',
      'ทุกอย่างใน Starter',
      'LINE / SMS notify (พร้อมใช้ Phase C-2)',
      'Custom photo + bio',
      'Priority support',
      'Lead export CSV',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'สำนักงานหลายคน',
    monthlyPrice: 1990,
    annualPrice: 19900,
    leadsCap: null,
    features: [
      'สำหรับ 5 ตัวแทน',
      'ทุกอย่างใน Pro',
      'Shared leads pool',
      'Team leaderboard',
      'Performance analytics',
    ],
  },
];

export function getPlanInfo(id: string): AgentPlanInfo | null {
  return AGENT_PLANS.find((p) => p.id === id) ?? null;
}

export function annualSavings(p: AgentPlanInfo): number {
  return p.monthlyPrice * 12 - p.annualPrice;
}
