// ─────────────────────────────────────────────────────────
// Demo personas — realistic Thai user data for marketing content
// ─────────────────────────────────────────────────────────

export type PersonaKey = 'swe' | 'family' | 'preretire';

export interface Persona {
  key: PersonaKey;
  email: string;
  name: string;
  description: string;
  profile: {
    full_name: string;
    date_of_birth: string;
    num_dependents: number;
    occupation: string;
    employment_type: string;
    province: string;
    risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
    investment_experience: 'beginner' | 'intermediate' | 'expert';
    financial_goal_summary: string;
    income_salary_monthly: number;
    income_side_monthly: number;
    income_investment_monthly: number;
    expense_food_monthly: number;
    expense_utilities_monthly: number;
    expense_phone_internet_monthly: number;
    expense_transport_monthly: number;
    expense_housing_monthly: number;
    expense_debt_payment_monthly: number;
    expense_insurance_monthly: number;
    expense_subscription_monthly: number;
    expense_other_monthly: number;
    monthly_income: number;
    monthly_expense_estimate: number;
    monthly_income_target: number;
    monthly_expense_target: number;
  };
  accounts: { name: string; type: string; initial_balance: number; color: string; account_number?: string }[];
  goals: { name: string; target_amount: number; current_amount: number; deadline?: string; icon: string; color: string; is_emergency_fund?: boolean }[];
  debts: { name: string; type: string; balance: number; rate: number; monthly_payment: number; remaining_term?: number }[];
  investments: { name: string; symbol?: string; type: string; quantity: number; avg_cost: number; current_price?: number; currency?: string; is_tax_saving?: boolean; tax_fund_type?: string; lock_in_until?: string }[];
  insurance: { type: string; carrier: string; policy_name: string; sum_insured: number; annual_premium: number }[];
  budgets: { category_name: string; amount: number }[];
  recurring: { type: 'income' | 'expense'; category_name?: string; amount: number; day_of_month: number; note: string }[];
  transactionTemplate: { count: number; daysSpread: number };
}

export const PERSONAS: Persona[] = [
  // ─── 👨‍💻 SWE ───
  {
    key: 'swe',
    email: 'demo@lumenfi.app',
    name: 'TRIN — SWE 32',
    description: 'พนักงาน Software Engineer · ออมเก่ง ลงทุนพอประมาณ',
    profile: {
      full_name: 'TRIN',
      date_of_birth: '1993-08-15',
      num_dependents: 0,
      occupation: 'Software Engineer',
      employment_type: 'employee',
      province: 'กรุงเทพฯ',
      risk_tolerance: 'moderate',
      investment_experience: 'intermediate',
      financial_goal_summary: 'เกษียณตอน 55 ใช้ชีวิตสบายๆ + ซื้อคอนโดในกรุงเทพภายใน 2570',
      income_salary_monthly: 65000,
      income_side_monthly: 8000,
      income_investment_monthly: 1200,
      expense_food_monthly: 9000,
      expense_utilities_monthly: 800,
      expense_phone_internet_monthly: 1200,
      expense_transport_monthly: 3500,
      expense_housing_monthly: 12000,
      expense_debt_payment_monthly: 1500,
      expense_insurance_monthly: 2500,
      expense_subscription_monthly: 800,
      expense_other_monthly: 4000,
      monthly_income: 74200,
      monthly_expense_estimate: 35300,
      monthly_income_target: 100000,
      monthly_expense_target: 35000,
    },
    accounts: [
      { name: 'KBank เงินเดือน', type: 'bank', initial_balance: 185000, color: '#16a34a', account_number: '0123456789' },
      { name: 'SCB ออมทรัพย์', type: 'savings', initial_balance: 320000, color: '#7c3aed', account_number: '9876543210' },
      { name: 'เงินสด', type: 'cash', initial_balance: 4500, color: '#f59e0b' },
      { name: 'บัตรเครดิต KBank', type: 'credit_card', initial_balance: -8500, color: '#dc2626', account_number: '4123' },
      { name: 'TrueMoney Wallet', type: 'e_wallet', initial_balance: 2200, color: '#f97316' },
    ],
    goals: [
      { name: 'Emergency Fund', target_amount: 200000, current_amount: 180000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'ดาวน์คอนโด', target_amount: 800000, current_amount: 145000, deadline: '2570-12-31', icon: '🏠', color: '#3b82f6' },
      { name: 'เกษียณ', target_amount: 15000000, current_amount: 480000, deadline: '2592-08-15', icon: '🌴', color: '#a855f7' },
      { name: 'ท่องเที่ยวญี่ปุ่น', target_amount: 80000, current_amount: 35000, deadline: '2569-12-31', icon: '✈️', color: '#06b6d4' },
    ],
    debts: [
      { name: 'บัตรเครดิต KBank', type: 'credit_card', balance: 8500, rate: 16, monthly_payment: 1500 },
    ],
    investments: [
      { name: 'PTT (ปตท.)', symbol: 'PTT', type: 'thai_stock', quantity: 200, avg_cost: 35.5, current_price: 38.25 },
      { name: 'SCB (ไทยพาณิชย์)', symbol: 'SCB', type: 'thai_stock', quantity: 100, avg_cost: 105, current_price: 112.5 },
      { name: 'SET50 ETF', symbol: 'TDEX', type: 'etf', quantity: 500, avg_cost: 18.5, current_price: 19.2 },
      { name: 'K-USXNDQ-A (ลงทุน Nasdaq)', type: 'mutual_fund', quantity: 5000, avg_cost: 14.5, current_price: 16.8 },
      { name: 'KCASH-A (RMF)', type: 'mutual_fund', quantity: 2000, avg_cost: 50, current_price: 52, is_tax_saving: true, tax_fund_type: 'rmf', lock_in_until: '2603-12-31' },
      { name: 'ASP-SSF', type: 'mutual_fund', quantity: 800, avg_cost: 100, current_price: 108, is_tax_saving: true, tax_fund_type: 'ssf', lock_in_until: '2578-09-15' },
      { name: 'Bitcoin', symbol: 'BTC', type: 'crypto', quantity: 0.05, avg_cost: 2400000, current_price: 2650000 },
    ],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health', sum_insured: 1500000, annual_premium: 18000 },
      { type: 'life', carrier: 'BLA', policy_name: 'ตลอดชีพคุ้มครอง 99', sum_insured: 1000000, annual_premium: 8500 },
      { type: 'critical_illness', carrier: 'AIA', policy_name: 'AIA CI Plus', sum_insured: 2000000, annual_premium: 12000 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 9000 },
      { category_name: 'เดินทาง', amount: 3500 },
      { category_name: 'บันเทิง', amount: 2500 },
      { category_name: 'ของใช้ส่วนตัว', amount: 2000 },
    ],
    recurring: [
      { type: 'income', amount: 65000, day_of_month: 28, note: 'เงินเดือน' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 12000, day_of_month: 1, note: 'ค่าเช่าคอนโด' },
      { type: 'expense', category_name: 'บันเทิง', amount: 149, day_of_month: 5, note: 'Netflix' },
      { type: 'expense', category_name: 'บันเทิง', amount: 159, day_of_month: 15, note: 'Spotify' },
      { type: 'expense', category_name: 'สุขภาพ', amount: 1500, day_of_month: 10, note: 'Gym membership' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 590, day_of_month: 20, note: 'Internet AIS Fibre' },
    ],
    transactionTemplate: { count: 90, daysSpread: 90 },
  },

  // ─── 👨‍👩‍👧 FAMILY ───
  {
    key: 'family',
    email: 'family@lumenfi.app',
    name: 'PAT — Marketing Manager 38',
    description: 'แม่ลูก 1 ผ่อนบ้าน + เก็บเงินส่งลูกเรียน',
    profile: {
      full_name: 'PAT',
      date_of_birth: '1987-03-22',
      num_dependents: 2,
      occupation: 'Marketing Manager',
      employment_type: 'employee',
      province: 'นนทบุรี',
      risk_tolerance: 'conservative',
      investment_experience: 'beginner',
      financial_goal_summary: 'ส่งลูกเรียน อินเตอร์ + ผ่อนบ้านให้หมดก่อนอายุ 55',
      income_salary_monthly: 95000,
      income_side_monthly: 0,
      income_investment_monthly: 800,
      expense_food_monthly: 18000,
      expense_utilities_monthly: 2500,
      expense_phone_internet_monthly: 1800,
      expense_transport_monthly: 6000,
      expense_housing_monthly: 22000,
      expense_debt_payment_monthly: 25000,
      expense_insurance_monthly: 5000,
      expense_subscription_monthly: 1200,
      expense_other_monthly: 8000,
      monthly_income: 95800,
      monthly_expense_estimate: 89500,
      monthly_income_target: 120000,
      monthly_expense_target: 80000,
    },
    accounts: [
      { name: 'KTB เงินเดือน', type: 'bank', initial_balance: 95000, color: '#0891b2' },
      { name: 'TMB ออมทรัพย์', type: 'savings', initial_balance: 250000, color: '#0d9488' },
      { name: 'เงินสด', type: 'cash', initial_balance: 5000, color: '#f59e0b' },
      { name: 'บัตรเครดิต Citibank', type: 'credit_card', initial_balance: -25000, color: '#dc2626' },
    ],
    goals: [
      { name: 'Emergency Fund', target_amount: 540000, current_amount: 220000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'ทุนการศึกษาลูก', target_amount: 1500000, current_amount: 380000, deadline: '2575-06-30', icon: '🎓', color: '#7c3aed' },
      { name: 'โปะหนี้บ้าน', target_amount: 500000, current_amount: 80000, deadline: '2572-12-31', icon: '🏡', color: '#f59e0b' },
    ],
    debts: [
      { name: 'สินเชื่อบ้าน TMB', type: 'mortgage', balance: 2800000, rate: 5.5, monthly_payment: 22000, remaining_term: 180 },
      { name: 'บัตรเครดิต Citibank', type: 'credit_card', balance: 25000, rate: 18, monthly_payment: 3000 },
    ],
    investments: [
      { name: 'KFLTFA50 (LTF เก่า)', type: 'mutual_fund', quantity: 1500, avg_cost: 80, current_price: 92 },
      { name: 'TMBABF (Bond Fund)', type: 'mutual_fund', quantity: 3000, avg_cost: 12.5, current_price: 12.8 },
      { name: 'ทองคำ', type: 'gold', quantity: 5, avg_cost: 32000, current_price: 34500, currency: 'THB' },
    ],
    insurance: [
      { type: 'health', carrier: 'AIA', policy_name: 'AIA H&S Plus', sum_insured: 2000000, annual_premium: 25000 },
      { type: 'life', carrier: 'BLA', policy_name: 'ประกันชีวิตคุ้มครองลูก', sum_insured: 5000000, annual_premium: 28000 },
      { type: 'car', carrier: 'Viriyah', policy_name: 'ชั้น 1 Honda CR-V', sum_insured: 950000, annual_premium: 18500 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 18000 },
      { category_name: 'เดินทาง', amount: 6000 },
      { category_name: 'การศึกษา', amount: 12000 },
      { category_name: 'บันเทิง', amount: 5000 },
    ],
    recurring: [
      { type: 'income', amount: 95000, day_of_month: 25, note: 'เงินเดือน' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 22000, day_of_month: 5, note: 'ผ่อนบ้าน TMB' },
      { type: 'expense', category_name: 'การศึกษา', amount: 12000, day_of_month: 10, note: 'ค่าเทอมลูก' },
      { type: 'expense', category_name: 'บันเทิง', amount: 599, day_of_month: 8, note: 'Netflix Family' },
    ],
    transactionTemplate: { count: 120, daysSpread: 90 },
  },

  // ─── 👴 PRE-RETIRE ───
  {
    key: 'preretire',
    email: 'retire@lumenfi.app',
    name: 'SOM — Senior Consultant 52',
    description: 'ใกล้เกษียณ · มีพอร์ตลงทุน + ห่วงเรื่องสุขภาพ',
    profile: {
      full_name: 'SOM',
      date_of_birth: '1973-11-08',
      num_dependents: 1,
      occupation: 'Senior Consultant',
      employment_type: 'business_owner',
      province: 'กรุงเทพฯ',
      risk_tolerance: 'conservative',
      investment_experience: 'expert',
      financial_goal_summary: 'เกษียณตอน 60 มีเงินใช้ ฿80K/เดือน · เก็บมรดกให้ลูก',
      income_salary_monthly: 0,
      income_side_monthly: 180000,
      income_investment_monthly: 35000,
      expense_food_monthly: 25000,
      expense_utilities_monthly: 4500,
      expense_phone_internet_monthly: 2200,
      expense_transport_monthly: 8000,
      expense_housing_monthly: 0,
      expense_debt_payment_monthly: 0,
      expense_insurance_monthly: 12000,
      expense_subscription_monthly: 1500,
      expense_other_monthly: 25000,
      monthly_income: 215000,
      monthly_expense_estimate: 78200,
      monthly_income_target: 250000,
      monthly_expense_target: 80000,
    },
    accounts: [
      { name: 'BBL Premier', type: 'bank', initial_balance: 850000, color: '#1e40af' },
      { name: 'SCB Savings', type: 'savings', initial_balance: 1200000, color: '#7c3aed' },
      { name: 'เงินสด', type: 'cash', initial_balance: 15000, color: '#f59e0b' },
    ],
    goals: [
      { name: 'Emergency Fund (1 ปี)', target_amount: 1000000, current_amount: 1200000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'เกษียณ', target_amount: 25000000, current_amount: 12500000, deadline: '2576-11-08', icon: '🌴', color: '#a855f7' },
      { name: 'มรดกลูก', target_amount: 5000000, current_amount: 800000, icon: '💝', color: '#ec4899' },
    ],
    debts: [],
    investments: [
      { name: 'BBL', symbol: 'BBL', type: 'thai_stock', quantity: 2000, avg_cost: 145, current_price: 158 },
      { name: 'KBANK', symbol: 'KBANK', type: 'thai_stock', quantity: 1500, avg_cost: 135, current_price: 148 },
      { name: 'AOT', symbol: 'AOT', type: 'thai_stock', quantity: 3000, avg_cost: 65, current_price: 72.5 },
      { name: 'CPF', symbol: 'CPF', type: 'thai_stock', quantity: 5000, avg_cost: 28, current_price: 31.5 },
      { name: 'K-FIXED-A (Bond)', type: 'mutual_fund', quantity: 50000, avg_cost: 12.5, current_price: 12.8 },
      { name: 'KGOLD-A', type: 'gold', quantity: 1000, avg_cost: 105, current_price: 118 },
      { name: 'CPN-W (REIT)', symbol: 'CPN', type: 'reit', quantity: 5000, avg_cost: 55, current_price: 62 },
      { name: 'พันธบัตรออมทรัพย์ 5 ปี', type: 'bond', quantity: 1000, avg_cost: 1000, current_price: 1000 },
    ],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health Premier', sum_insured: 5000000, annual_premium: 65000 },
      { type: 'critical_illness', carrier: 'AIA', policy_name: 'AIA CI Premier', sum_insured: 3000000, annual_premium: 35000 },
      { type: 'life', carrier: 'BLA', policy_name: 'บำนาญสมบูรณ์', sum_insured: 2000000, annual_premium: 45000 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 25000 },
      { category_name: 'สุขภาพ', amount: 8000 },
      { category_name: 'บันเทิง', amount: 10000 },
    ],
    recurring: [
      { type: 'income', amount: 180000, day_of_month: 15, note: 'รายได้บริษัท Consult' },
      { type: 'income', amount: 8000, day_of_month: 25, note: 'ค่าเช่าคอนโด' },
      { type: 'expense', category_name: 'บันเทิง', amount: 599, day_of_month: 1, note: 'Netflix Premium' },
    ],
    transactionTemplate: { count: 70, daysSpread: 90 },
  },
];

export function getPersona(key: PersonaKey): Persona | undefined {
  return PERSONAS.find((p) => p.key === key);
}
