// ─────────────────────────────────────────────────────────
// Demo personas — realistic Thai user data for marketing content
// Each persona has a story arc: where they started → where they are now
// ─────────────────────────────────────────────────────────

export type PersonaKey =
  | 'swe'
  | 'family'
  | 'preretire'
  | 'freelancer'
  | 'merchant'
  | 'investor'
  | 'debt_recovery';

export interface Persona {
  key: PersonaKey;
  email: string;
  name: string;
  description: string;
  narrative: {
    before: string;
    after: string;
    improvements: string[];
    nextStep: string;
  };
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
    income_other_monthly?: number;
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
  goals: {
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
    icon: string;
    color: string;
    is_emergency_fund?: boolean;
  }[];
  debts: {
    name: string;
    type: string;
    balance: number;
    original_balance?: number;
    rate: number;
    monthly_payment: number;
    remaining_term?: number;
  }[];
  investments: {
    name: string;
    symbol?: string;
    type: string;
    quantity: number;
    avg_cost: number;
    current_price?: number;
    currency?: string;
    is_tax_saving?: boolean;
    tax_fund_type?: string;
    lock_in_until?: string;
  }[];
  insurance: { type: string; carrier: string; policy_name: string; sum_insured: number; annual_premium: number }[];
  budgets: { category_name: string; amount: number }[];
  recurring: {
    type: 'income' | 'expense';
    category_name?: string;
    amount: number;
    day_of_month: number;
    note: string;
  }[];
  transactionTemplate: {
    count: number;
    daysSpread: number;
    extraSamples?: { catName: string; amounts: number[]; notes: string[] }[];
  };
  snapshotProgression: {
    days: number;
    totalDays: number;
    startNetWorth: number;
    noisePercent: number;
  };
  advisorReports: {
    domain: 'comprehensive' | 'debt' | 'investment' | 'tax' | 'retirement' | 'goals' | 'insurance' | 'emergency';
    title: string;
    summary: string;
    content: string;
    daysAgo: number;
  }[];
  notificationHistory: {
    type: string;
    severity: 'info' | 'warn' | 'critical' | 'success';
    title: string;
    body: string;
    daysAgo: number;
  }[];
}

// ─────────────────────────────────────────────────────────
// Reusable advisor report templates
// ─────────────────────────────────────────────────────────

const REPORT_TEMPLATES = {
  comprehensive: (n: string) => ({
    title: 'รีวิวการเงินภาพรวม — สถานะวันนี้',
    summary: `วิเคราะห์ครบ 8 มิติ พร้อมแผนปฏิบัติ 30/60/90 วัน สำหรับ ${n}`,
    content: `## สรุปสุขภาพการเงิน

**คะแนนรวม:** 72/100 (ดี)

### จุดแข็ง
- เงินสำรองฉุกเฉิน ครอบคลุม > 3 เดือน
- DTI < 40% (อยู่ในเกณฑ์ปลอดภัย)
- มีพอร์ตลงทุนกระจายความเสี่ยง

### จุดที่ควรปรับปรุง
1. ลดหย่อนภาษียังไม่เต็มสิทธิ์ — RMF เพียง ฿20K
2. บัตรเครดิตมียอดค้าง — ดอก 16% ควรปิดเดือนนี้
3. ประกันสุขภาพคุ้มครองเดี่ยว — ควรพิจารณา CI

### Action 30 วัน
- โอน ปิดบัตรเครดิต → ประหยัดดอก
- เพิ่ม RMF อีก ฿15K → ลดภาษีได้ ฿3.0K
- ทบทวนงบอาหาร (เกิน budget 18%)
`,
  }),
  debt: () => ({
    title: 'แผนปลดหนี้ Snowball + Avalanche',
    summary: 'เปรียบเทียบ 2 กลยุทธ์ — เลือก Avalanche ประหยัดดอกที่สุด',
    content: `## สถานะหนี้

### Avalanche (ดอกสูงก่อน)
- ปิดได้ภายใน 6 เดือน
- ดอกที่ประหยัด: ฿1,250

### Snowball (ยอดเล็กก่อน)
- ปิดได้ภายใน 6 เดือน

### คำแนะนำ
1. โอน ฿8,500 จาก SCB → ปิดบัตรทันที
2. ตั้ง notification เตือนชำระทุกวันที่ 25
`,
  }),
  investment: () => ({
    title: 'รีวิวพอร์ตลงทุน + Rebalance',
    summary: 'พอร์ต 38% หุ้น 42% กองทุน 8% ทอง 12% crypto',
    content: `## สรุปพอร์ต

มูลค่ารวม: ฿728,500 (กำไร: +12.4%)

### Asset Allocation
- หุ้นไทย: 38% (เป้า 35%)
- กองทุน: 42% (เป้า 45%)
- ทอง: 8%
- Crypto: 12% (เป้า 5%) — เกิน

### ข้อเสนอแนะ
1. ขาย BTC บางส่วน ฿45K → โอนไป K-FIXED-A
2. DCA Set50 ETF ฿5,000/เดือน
`,
  }),
  emergency: () => ({
    title: 'ตรวจเงินสำรองฉุกเฉิน',
    summary: 'มี ฿180K (3.0 เดือน) — ใกล้เป้า ฿200K',
    content: `## Emergency Fund

ปัจจุบัน: ฿180,000 / เป้า ฿200,000

### คำแนะนำ
1. โอน ฿20K ปิดเป้านี้
2. เก็บใน high-yield savings
3. อย่าผูกกับ lock-in
`,
  }),
  retirement: () => ({
    title: 'แผนเกษียณ — Retirement Readiness',
    summary: 'อายุ 32 เก็บ ฿480K — เก็บเพิ่ม ฿9,000/เดือนเกษียณ ฿80K',
    content: `## สถานะเกษียณ

Score: 65/100

### เป้าหมาย ฿15M ที่ 60
- ตอนนี้ ฿480K (3.2%)
- ผลตอบแทน 8% → เก็บ ฿6,800/เดือน

### คำแนะนำ
1. PVD/RMF เป็น 15% ของเงินเดือน
2. DCA ETF SET50 ฿5,000/เดือน
`,
  }),
  insurance: () => ({
    title: 'ตรวจประกัน — Gap Analysis',
    summary: 'สุขภาพดี · ชีวิต underinsured ฿2M · ขาด CI',
    content: `## Insurance Gap

### ชีวิต
- มี ฿1M | ควรมี ฿8.88M
- Gap: ฿7.88M

### CI
- มี ฿2M | แนะนำ ฿3M+

### คำแนะนำ
1. Term Life ฿5M (premium ~฿8K/ปี)
2. CI rider ฿1M
`,
  }),
};

// ─────────────────────────────────────────────────────────
// PERSONAS
// ─────────────────────────────────────────────────────────

export const PERSONAS: Persona[] = [
  {
    key: 'swe',
    email: 'demo@lumenfi.app',
    name: 'TRIN — SWE 32',
    description: 'พนักงาน Software Engineer · ออมเก่ง · กำลังเก็บคอนโด',
    narrative: {
      before: 'ใช้ Excel จดรายรับ-รายจ่าย เก็บเงินได้เดือนละ ฿8K ไม่เคยซื้อ RMF/SSF เต็มเพดาน บัตรเครดิตจ่ายขั้นต่ำ',
      after: 'เก็บเงินเดือนละ ฿28K (+250%) ปลดบัตรเครดิตหมด ใช้สิทธิ์ลดหย่อนเต็ม RMF/SSF ฿200K/ปี',
      improvements: [
        '💰 เก็บเงินเพิ่ม ฿20,000/เดือน',
        '💳 ปลดบัตรเครดิต ฿8,500 ใน 1 เดือน',
        '📈 พอร์ตลงทุนโต +12.4% (฿728K)',
        '💸 ประหยัดภาษี ฿15,000/ปี (RMF/SSF)',
        '🛟 Emergency Fund ครบ 3 เดือน (฿180K)',
      ],
      nextStep: 'เก็บดาวน์คอนโด ฿800K ภายใน 2570 (ปัจจุบัน 18%)',
    },
    profile: {
      full_name: 'TRIN',
      date_of_birth: '1993-08-15',
      num_dependents: 0,
      occupation: 'Senior Software Engineer',
      employment_type: 'employee',
      province: 'กรุงเทพฯ',
      risk_tolerance: 'moderate',
      investment_experience: 'intermediate',
      financial_goal_summary: 'เกษียณตอน 55 + ดาวน์คอนโดในกรุงเทพ 2570',
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
      { name: 'KKP Dime+ (ดอกสูง)', type: 'savings', initial_balance: 80000, color: '#f59e0b' },
      { name: 'เงินสด', type: 'cash', initial_balance: 4500, color: '#71717a' },
      { name: 'บัตรเครดิต KBank', type: 'credit_card', initial_balance: -8500, color: '#dc2626', account_number: '4123' },
      { name: 'TrueMoney Wallet', type: 'e_wallet', initial_balance: 2200, color: '#f97316' },
    ],
    goals: [
      { name: 'Emergency Fund', target_amount: 200000, current_amount: 180000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'ดาวน์คอนโด ลาดพร้าว', target_amount: 800000, current_amount: 145000, deadline: '2570-12-31', icon: '🏠', color: '#3b82f6' },
      { name: 'เกษียณตอน 55', target_amount: 15000000, current_amount: 480000, deadline: '2592-08-15', icon: '🌴', color: '#a855f7' },
      { name: 'ทริปญี่ปุ่น Spring 2569', target_amount: 80000, current_amount: 35000, deadline: '2569-12-31', icon: '✈️', color: '#06b6d4' },
      { name: 'MacBook Pro M5', target_amount: 95000, current_amount: 28000, deadline: '2570-06-30', icon: '💻', color: '#64748b' },
    ],
    debts: [
      { name: 'บัตรเครดิต KBank', type: 'credit_card', balance: 8500, original_balance: 35000, rate: 16, monthly_payment: 1500 },
    ],
    investments: [
      { name: 'PTT', symbol: 'PTT', type: 'thai_stock', quantity: 200, avg_cost: 35.5, current_price: 38.25 },
      { name: 'SCB', symbol: 'SCB', type: 'thai_stock', quantity: 100, avg_cost: 105, current_price: 112.5 },
      { name: 'ADVANC (AIS)', symbol: 'ADVANC', type: 'thai_stock', quantity: 80, avg_cost: 215, current_price: 232 },
      { name: 'TDEX SET50', symbol: 'TDEX', type: 'etf', quantity: 500, avg_cost: 18.5, current_price: 19.2 },
      { name: 'K-USXNDQ-A', type: 'mutual_fund', quantity: 5000, avg_cost: 14.5, current_price: 16.8 },
      { name: 'KCASH-RMF', type: 'mutual_fund', quantity: 2000, avg_cost: 50, current_price: 52, is_tax_saving: true, tax_fund_type: 'rmf', lock_in_until: '2603-12-31' },
      { name: 'KGTECH-RMF', type: 'mutual_fund', quantity: 1500, avg_cost: 28, current_price: 31.5, is_tax_saving: true, tax_fund_type: 'rmf', lock_in_until: '2603-12-31' },
      { name: 'ASP-SSF', type: 'mutual_fund', quantity: 800, avg_cost: 100, current_price: 108, is_tax_saving: true, tax_fund_type: 'ssf', lock_in_until: '2578-09-15' },
      { name: 'Bitcoin', symbol: 'BTC', type: 'crypto', quantity: 0.05, avg_cost: 2400000, current_price: 2650000 },
      { name: 'Ethereum', symbol: 'ETH', type: 'crypto', quantity: 0.3, avg_cost: 95000, current_price: 102000 },
    ],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health 1.5M', sum_insured: 1500000, annual_premium: 18000 },
      { type: 'life', carrier: 'BLA', policy_name: 'ตลอดชีพ 99', sum_insured: 1000000, annual_premium: 8500 },
      { type: 'critical_illness', carrier: 'AIA', policy_name: 'AIA CI Plus 2M', sum_insured: 2000000, annual_premium: 12000 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 9000 },
      { category_name: 'เดินทาง', amount: 3500 },
      { category_name: 'บันเทิง', amount: 2500 },
      { category_name: 'ของใช้ส่วนตัว', amount: 2000 },
      { category_name: 'สุขภาพ', amount: 1500 },
    ],
    recurring: [
      { type: 'income', amount: 65000, day_of_month: 28, note: 'เงินเดือน' },
      { type: 'income', amount: 8000, day_of_month: 5, note: 'รายได้เสริม Freelance' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 12000, day_of_month: 1, note: 'ค่าเช่าคอนโด ลาดพร้าว' },
      { type: 'expense', category_name: 'บันเทิง', amount: 149, day_of_month: 5, note: 'Netflix' },
      { type: 'expense', category_name: 'บันเทิง', amount: 159, day_of_month: 15, note: 'Spotify' },
      { type: 'expense', category_name: 'สุขภาพ', amount: 1500, day_of_month: 10, note: 'Fitness First' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 590, day_of_month: 20, note: 'AIS Fibre' },
    ],
    transactionTemplate: {
      count: 130,
      daysSpread: 90,
      extraSamples: [
        { catName: 'อาหาร', amounts: [120, 380, 580], notes: ['Five Guys', 'Sushi Hiro', 'Cafe Amazon'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 90, startNetWorth: 380000, noisePercent: 2 },
    advisorReports: [
      { ...REPORT_TEMPLATES.comprehensive('TRIN'), domain: 'comprehensive', daysAgo: 2 },
      { ...REPORT_TEMPLATES.investment(), domain: 'investment', daysAgo: 14 },
      { ...REPORT_TEMPLATES.debt(), domain: 'debt', daysAgo: 28 },
      { ...REPORT_TEMPLATES.retirement(), domain: 'retirement', daysAgo: 45 },
    ],
    notificationHistory: [
      { type: 'goal_milestone', severity: 'success', title: '🎉 Emergency Fund ใกล้เป้า!', body: 'เก็บได้ 90% · ขาด ฿20K', daysAgo: 1 },
      { type: 'budget_alert', severity: 'warn', title: 'งบอาหารเกิน 80%', body: 'ใช้ ฿7,200 / ฿9,000', daysAgo: 3 },
      { type: 'tax_reminder', severity: 'info', title: 'ปลายปีเหลือ 2 เดือน', body: 'ซื้อ RMF/SSF เพิ่ม ฿130K', daysAgo: 7 },
      { type: 'investment_alert', severity: 'info', title: 'BTC +8% ใน 7 วัน', body: 'แตะ ฿2.65M', daysAgo: 12 },
      { type: 'debt_milestone', severity: 'success', title: '💳 ปลดหนี้บัตรไป 76%', body: 'จาก ฿35K เหลือ ฿8.5K', daysAgo: 21 },
    ],
  },

  {
    key: 'family',
    email: 'family@lumenfi.app',
    name: 'PAT — Marketing Manager 38',
    description: 'แม่ลูก 1 · ผ่อนบ้าน + เก็บเงินส่งลูกเรียน',
    narrative: {
      before: 'ใช้จ่ายเดือนชนเดือน ผ่อนบัตรเครดิต ฿80K ไม่มีเงินสำรอง',
      after: 'มี Emergency Fund ฿220K · ทุนการศึกษาลูก ฿380K · ลดบัตรเครดิต ฿80K → ฿25K',
      improvements: [
        '💳 ลดหนี้บัตร ฿55,000 ใน 8 เดือน',
        '🎓 เริ่มกองทุนการศึกษาลูก ฿380K',
        '🏡 จ่ายโปะบ้านเพิ่ม ฿80K ลดดอก ฿180K',
        '📊 ทำงบประมาณ → ลดอาหาร 25%',
      ],
      nextStep: 'ผ่อนบ้านเร็วขึ้น 5 ปี · Emergency Fund ฿540K',
    },
    profile: {
      full_name: 'PAT',
      date_of_birth: '1987-03-22',
      num_dependents: 2,
      occupation: 'Marketing Manager',
      employment_type: 'employee',
      province: 'นนทบุรี',
      risk_tolerance: 'conservative',
      investment_experience: 'beginner',
      financial_goal_summary: 'ส่งลูกเรียนอินเตอร์ + ผ่อนบ้านหมดก่อน 55',
      income_salary_monthly: 95000,
      income_side_monthly: 0,
      income_investment_monthly: 800,
      expense_food_monthly: 18000,
      expense_utilities_monthly: 2500,
      expense_phone_internet_monthly: 1800,
      expense_transport_monthly: 6000,
      expense_housing_monthly: 22000,
      expense_debt_payment_monthly: 28000,
      expense_insurance_monthly: 5800,
      expense_subscription_monthly: 1200,
      expense_other_monthly: 8000,
      monthly_income: 95800,
      monthly_expense_estimate: 93300,
      monthly_income_target: 120000,
      monthly_expense_target: 80000,
    },
    accounts: [
      { name: 'KTB เงินเดือน', type: 'bank', initial_balance: 95000, color: '#0891b2' },
      { name: 'TMB ออมทรัพย์', type: 'savings', initial_balance: 250000, color: '#0d9488' },
      { name: 'TTB Up & Up (ลูก)', type: 'savings', initial_balance: 380000, color: '#7c3aed' },
      { name: 'เงินสด', type: 'cash', initial_balance: 5000, color: '#71717a' },
      { name: 'บัตรเครดิต Citibank', type: 'credit_card', initial_balance: -25000, color: '#dc2626' },
    ],
    goals: [
      { name: 'Emergency Fund (6 เดือน)', target_amount: 540000, current_amount: 220000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'ทุนการศึกษาลูก ม.6', target_amount: 1500000, current_amount: 380000, deadline: '2575-06-30', icon: '🎓', color: '#7c3aed' },
      { name: 'โปะหนี้บ้านเพิ่ม', target_amount: 500000, current_amount: 80000, deadline: '2572-12-31', icon: '🏡', color: '#f59e0b' },
      { name: 'ทริปเกาหลีครอบครัว', target_amount: 120000, current_amount: 35000, deadline: '2569-10-31', icon: '🇰🇷', color: '#06b6d4' },
    ],
    debts: [
      { name: 'สินเชื่อบ้าน TMB', type: 'mortgage', balance: 2800000, original_balance: 3500000, rate: 5.5, monthly_payment: 22000, remaining_term: 180 },
      { name: 'บัตรเครดิต Citibank', type: 'credit_card', balance: 25000, original_balance: 80000, rate: 18, monthly_payment: 6000 },
    ],
    investments: [
      { name: 'KFLTFA50', type: 'mutual_fund', quantity: 1500, avg_cost: 80, current_price: 92 },
      { name: 'TMBABF (Bond)', type: 'mutual_fund', quantity: 3000, avg_cost: 12.5, current_price: 12.8 },
      { name: 'K-CHANGE-SSF', type: 'mutual_fund', quantity: 600, avg_cost: 100, current_price: 105, is_tax_saving: true, tax_fund_type: 'ssf', lock_in_until: '2578-12-31' },
      { name: 'KGTHEQ-RMF', type: 'mutual_fund', quantity: 800, avg_cost: 50, current_price: 53, is_tax_saving: true, tax_fund_type: 'rmf', lock_in_until: '2602-12-31' },
      { name: 'ทองคำแท่ง 5 บาท', type: 'gold', quantity: 5, avg_cost: 32000, current_price: 34500, currency: 'THB' },
    ],
    insurance: [
      { type: 'health', carrier: 'AIA', policy_name: 'AIA H&S Plus 2M', sum_insured: 2000000, annual_premium: 25000 },
      { type: 'life', carrier: 'BLA', policy_name: 'ประกันชีวิตคุ้มครองลูก 5M', sum_insured: 5000000, annual_premium: 28000 },
      { type: 'health', carrier: 'AIA', policy_name: 'AIA H&S ลูก', sum_insured: 1000000, annual_premium: 15000 },
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
      { type: 'expense', category_name: 'การศึกษา', amount: 3500, day_of_month: 12, note: 'พี่เลี้ยง' },
      { type: 'expense', category_name: 'บันเทิง', amount: 599, day_of_month: 8, note: 'Netflix Premium' },
      { type: 'expense', category_name: 'บันเทิง', amount: 199, day_of_month: 15, note: 'Disney+' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 690, day_of_month: 20, note: '3BB Internet' },
    ],
    transactionTemplate: {
      count: 150,
      daysSpread: 90,
      extraSamples: [
        { catName: 'อาหาร', amounts: [580, 850, 1200, 1800], notes: ['Tops Daily', 'Big C', 'Foodland', 'Dean & Deluca'] },
        { catName: 'การศึกษา', amounts: [800, 1500, 3500], notes: ['ติวเตอร์ลูก', 'หนังสือเรียน', 'การบ้าน online'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 90, startNetWorth: -160000, noisePercent: 1.5 },
    advisorReports: [
      { ...REPORT_TEMPLATES.comprehensive('PAT'), domain: 'comprehensive', daysAgo: 5 },
      { ...REPORT_TEMPLATES.debt(), domain: 'debt', daysAgo: 19 },
      { ...REPORT_TEMPLATES.emergency(), domain: 'emergency', daysAgo: 35 },
      { ...REPORT_TEMPLATES.insurance(), domain: 'insurance', daysAgo: 60 },
    ],
    notificationHistory: [
      { type: 'debt_milestone', severity: 'success', title: '🎉 ลดหนี้บัตรไป 69%!', body: 'จาก ฿80K เหลือ ฿25K', daysAgo: 4 },
      { type: 'budget_alert', severity: 'warn', title: 'งบอาหารเกิน 90%', body: '฿16,200 / ฿18,000', daysAgo: 6 },
      { type: 'goal_milestone', severity: 'success', title: 'ทุนลูกถึง ฿380K', body: '25% ของ ฿1.5M', daysAgo: 10 },
      { type: 'expense_reminder', severity: 'info', title: 'ผ่อนบ้านพรุ่งนี้', body: '฿22,000 · TMB', daysAgo: 14 },
      { type: 'tax_reminder', severity: 'info', title: 'SSF ลดหย่อนถึง ฿200K', body: 'ใช้ ฿60K', daysAgo: 22 },
    ],
  },

  {
    key: 'preretire',
    email: 'retire@lumenfi.app',
    name: 'SOM — Senior Consultant 52',
    description: 'ใกล้เกษียณ · พอร์ต ฿15M · ห่วงสุขภาพ',
    narrative: {
      before: 'มีพอร์ตลงทุน แต่ไม่รู้พอเกษียณไหม ไม่เคยคำนวณ Retirement Readiness',
      after: 'รู้แล้วว่ามีพอใช้ถึง 90 ที่ ฿80K/เดือน · อัพประกัน ฿5M · จัดสรรพอร์ต 40% bond',
      improvements: [
        '📊 Retirement Readiness Score 88/100',
        '🏥 อัพประกันสุขภาพ ฿2M → ฿5M',
        '💰 จัดสรรพอร์ต 40% bond + 30% หุ้น + 20% REIT',
        '🎁 เริ่มแผนมรดก (Trust + ประกัน)',
        '🌴 รายได้ passive ฿35K/เดือน',
      ],
      nextStep: 'เกษียณตอน 60 · เก็บเพิ่ม ฿4M เพื่อ buffer 30 ปี',
    },
    profile: {
      full_name: 'SOM',
      date_of_birth: '1973-11-08',
      num_dependents: 1,
      occupation: 'Senior Consultant',
      employment_type: 'business_owner',
      province: 'กรุงเทพฯ',
      risk_tolerance: 'conservative',
      investment_experience: 'expert',
      financial_goal_summary: 'เกษียณ 60 มีเงินใช้ ฿80K/เดือน · มรดกลูก ฿5M',
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
      { name: 'SCB Premier Savings', type: 'savings', initial_balance: 1200000, color: '#7c3aed' },
      { name: 'Krungsri Mee Tae Dai', type: 'savings', initial_balance: 800000, color: '#fbbf24' },
      { name: 'เงินสด', type: 'cash', initial_balance: 15000, color: '#71717a' },
    ],
    goals: [
      { name: 'Emergency Fund (12 เดือน)', target_amount: 1000000, current_amount: 1200000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'เกษียณ 60', target_amount: 25000000, current_amount: 12500000, deadline: '2576-11-08', icon: '🌴', color: '#a855f7' },
      { name: 'มรดกให้ลูก', target_amount: 5000000, current_amount: 800000, icon: '💝', color: '#ec4899' },
      { name: 'บ้านพักเกษียณ เชียงใหม่', target_amount: 3500000, current_amount: 850000, deadline: '2576-12-31', icon: '🏡', color: '#22c55e' },
    ],
    debts: [],
    investments: [
      { name: 'BBL', symbol: 'BBL', type: 'thai_stock', quantity: 2000, avg_cost: 145, current_price: 158 },
      { name: 'KBANK', symbol: 'KBANK', type: 'thai_stock', quantity: 1500, avg_cost: 135, current_price: 148 },
      { name: 'AOT', symbol: 'AOT', type: 'thai_stock', quantity: 3000, avg_cost: 65, current_price: 72.5 },
      { name: 'CPF', symbol: 'CPF', type: 'thai_stock', quantity: 5000, avg_cost: 28, current_price: 31.5 },
      { name: 'PTT', symbol: 'PTT', type: 'thai_stock', quantity: 2500, avg_cost: 35, current_price: 38.25 },
      { name: 'K-FIXED-A (Bond)', type: 'mutual_fund', quantity: 50000, avg_cost: 12.5, current_price: 12.8 },
      { name: 'KGOLD-A', type: 'gold', quantity: 1000, avg_cost: 105, current_price: 118 },
      { name: 'CPNREIT', symbol: 'CPN', type: 'reit', quantity: 5000, avg_cost: 55, current_price: 62 },
      { name: 'WHART', symbol: 'WHART', type: 'reit', quantity: 8000, avg_cost: 12, current_price: 13.2 },
      { name: 'พันธบัตร 5 ปี', type: 'bond', quantity: 1000, avg_cost: 1000, current_price: 1000 },
      { name: 'Vanguard VT', symbol: 'VT', type: 'etf', quantity: 100, avg_cost: 100, current_price: 110, currency: 'USD' },
    ],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health Premier 5M', sum_insured: 5000000, annual_premium: 65000 },
      { type: 'critical_illness', carrier: 'AIA', policy_name: 'AIA CI Premier 3M', sum_insured: 3000000, annual_premium: 35000 },
      { type: 'life', carrier: 'BLA', policy_name: 'บำนาญสมบูรณ์ 60/85', sum_insured: 2000000, annual_premium: 45000 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 25000 },
      { category_name: 'สุขภาพ', amount: 8000 },
      { category_name: 'บันเทิง', amount: 10000 },
      { category_name: 'เดินทาง', amount: 8000 },
    ],
    recurring: [
      { type: 'income', amount: 180000, day_of_month: 15, note: 'รายได้ Consulting' },
      { type: 'income', amount: 8000, day_of_month: 25, note: 'ค่าเช่าคอนโด' },
      { type: 'income', amount: 12000, day_of_month: 28, note: 'ปันผลรายไตรมาส' },
      { type: 'expense', category_name: 'บันเทิง', amount: 599, day_of_month: 1, note: 'Netflix Premium' },
      { type: 'expense', category_name: 'สุขภาพ', amount: 5500, day_of_month: 10, note: 'Premium Gym + PT' },
    ],
    transactionTemplate: {
      count: 100,
      daysSpread: 90,
      extraSamples: [
        { catName: 'อาหาร', amounts: [1500, 2800, 4500, 6800], notes: ['Sushi omakase', 'Le Du', 'Italian fine dining', 'Wine bar'] },
        { catName: 'สุขภาพ', amounts: [3500, 6500, 12000], notes: ['ตรวจสุขภาพ Bumrungrad', 'CT scan', 'Specialist'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 90, startNetWorth: 14200000, noisePercent: 1 },
    advisorReports: [
      { ...REPORT_TEMPLATES.comprehensive('SOM'), domain: 'comprehensive', daysAgo: 3 },
      { ...REPORT_TEMPLATES.retirement(), domain: 'retirement', daysAgo: 18 },
      { ...REPORT_TEMPLATES.investment(), domain: 'investment', daysAgo: 32 },
      { ...REPORT_TEMPLATES.insurance(), domain: 'insurance', daysAgo: 50 },
    ],
    notificationHistory: [
      { type: 'investment_alert', severity: 'info', title: 'ปันผล KBANK ฿9,000', body: 'พอร์ต ฿15.2M', daysAgo: 2 },
      { type: 'goal_milestone', severity: 'success', title: 'เกษียณถึง 50%!', body: '฿12.5M / ฿25M', daysAgo: 9 },
      { type: 'tax_reminder', severity: 'warn', title: 'ลดหย่อนยังไม่เต็ม', body: 'RMF ฿200K / ฿500K', daysAgo: 15 },
      { type: 'investment_alert', severity: 'info', title: 'AOT แตะ ฿72.5', body: 'take profit?', daysAgo: 23 },
    ],
  },

  {
    key: 'freelancer',
    email: 'freelancer@lumenfi.app',
    name: 'NICE — Graphic Designer 29',
    description: 'อาชีพอิสระ · รายได้ไม่แน่นอน · กำลังสร้างเงินสำรอง',
    narrative: {
      before: 'รายได้ ฿35K-฿90K/เดือนไม่แน่นอน เดือนงานน้อยกู้บัตรเครดิต ไม่ได้ส่ง ม.39',
      after: 'มี Emergency Fund 6 เดือน · ส่ง ม.40 + ประกันสุขภาพเอง · ลดบัตรเครดิตหมด',
      improvements: [
        '🛟 Emergency Fund ครบ 6 เดือน (จาก 0)',
        '📋 ลงทะเบียน ม.40 + ประกันสุขภาพ ฿1.5M',
        '💰 แยกบัญชี "ภาษี 20%" จาก invoice',
        '📈 เริ่มลงทุน RMF ฿20K/ปี · ลดภาษี ฿4K',
        '🧮 รู้รายได้เฉลี่ย ฿62K/เดือน',
      ],
      nextStep: 'ซื้อกล้อง Sony A1 ฿180K + ขยายเป็นทีม 2 คน',
    },
    profile: {
      full_name: 'NICE',
      date_of_birth: '1996-05-12',
      num_dependents: 0,
      occupation: 'Freelance Graphic Designer',
      employment_type: 'self_employed',
      province: 'เชียงใหม่',
      risk_tolerance: 'moderate',
      investment_experience: 'beginner',
      financial_goal_summary: 'รายได้คงที่ ฿80K/เดือน + ขยายเป็นสตูดิโอ 3 ปี',
      income_salary_monthly: 0,
      income_side_monthly: 62000,
      income_investment_monthly: 4000,
      income_other_monthly: 3000,
      expense_food_monthly: 8500,
      expense_utilities_monthly: 1500,
      expense_phone_internet_monthly: 1200,
      expense_transport_monthly: 2500,
      expense_housing_monthly: 8000,
      expense_debt_payment_monthly: 0,
      expense_insurance_monthly: 3500,
      expense_subscription_monthly: 2200,
      expense_other_monthly: 6000,
      monthly_income: 69000,
      monthly_expense_estimate: 33400,
      monthly_income_target: 80000,
      monthly_expense_target: 30000,
    },
    accounts: [
      { name: 'KBank รายได้งาน', type: 'bank', initial_balance: 65000, color: '#16a34a' },
      { name: 'KBank แยก "ภาษี 20%"', type: 'savings', initial_balance: 84000, color: '#dc2626' },
      { name: 'SCB Easy Saver (Emergency)', type: 'savings', initial_balance: 180000, color: '#10b981' },
      { name: 'TTB All Free', type: 'savings', initial_balance: 32000, color: '#0ea5e9' },
      { name: 'PayPal (USD)', type: 'e_wallet', initial_balance: 18000, color: '#0070ba' },
      { name: 'TrueMoney', type: 'e_wallet', initial_balance: 1800, color: '#f97316' },
    ],
    goals: [
      { name: 'Emergency Fund (6 เดือน)', target_amount: 180000, current_amount: 180000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'เก็บภาษี 2569', target_amount: 95000, current_amount: 84000, deadline: '2569-03-31', icon: '🧾', color: '#dc2626' },
      { name: 'กล้อง Sony A1', target_amount: 180000, current_amount: 45000, deadline: '2570-06-30', icon: '📷', color: '#3b82f6' },
      { name: 'ขยายเป็นสตูดิโอ', target_amount: 800000, current_amount: 60000, deadline: '2572-12-31', icon: '🏢', color: '#7c3aed' },
    ],
    debts: [],
    investments: [
      { name: 'KCASH-RMF', type: 'mutual_fund', quantity: 400, avg_cost: 50, current_price: 52, is_tax_saving: true, tax_fund_type: 'rmf', lock_in_until: '2603-12-31' },
      { name: 'TDEX SET50', symbol: 'TDEX', type: 'etf', quantity: 200, avg_cost: 18.5, current_price: 19.2 },
      { name: 'K-USA-A', type: 'mutual_fund', quantity: 1000, avg_cost: 25, current_price: 28 },
      { name: 'พันธบัตร 3 ปี', type: 'bond', quantity: 500, avg_cost: 1000, current_price: 1000 },
    ],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health Lite 1.5M', sum_insured: 1500000, annual_premium: 14500 },
      { type: 'accident', carrier: 'Tipp', policy_name: 'PA Plus 500K', sum_insured: 500000, annual_premium: 3800 },
      { type: 'life', carrier: 'BLA', policy_name: 'Term 10 (1M)', sum_insured: 1000000, annual_premium: 4200 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 8500 },
      { category_name: 'เดินทาง', amount: 2500 },
      { category_name: 'อื่นๆ', amount: 4000 },
      { category_name: 'บันเทิง', amount: 2500 },
    ],
    recurring: [
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 8000, day_of_month: 1, note: 'ค่าเช่าห้อง นิมมาน' },
      { type: 'expense', category_name: 'อื่นๆ', amount: 1190, day_of_month: 5, note: 'Adobe Creative Cloud' },
      { type: 'expense', category_name: 'อื่นๆ', amount: 590, day_of_month: 10, note: 'Figma Pro' },
      { type: 'expense', category_name: 'อื่นๆ', amount: 295, day_of_month: 15, note: 'Notion Pro' },
      { type: 'expense', category_name: 'บันเทิง', amount: 149, day_of_month: 8, note: 'Netflix' },
      { type: 'expense', category_name: 'บันเทิง', amount: 159, day_of_month: 12, note: 'Spotify' },
      { type: 'expense', category_name: 'สุขภาพ', amount: 1200, day_of_month: 18, note: 'Yoga' },
    ],
    transactionTemplate: {
      count: 110,
      daysSpread: 90,
      extraSamples: [
        { catName: 'รายได้', amounts: [12000, 25000, 35000, 48000, 65000, 8500, 18000], notes: ['Logo design', 'Branding package', 'Photoshoot', 'Campaign creative', 'Web banner', 'Fiverr gig', 'Upwork milestone'] },
        { catName: 'อาหาร', amounts: [85, 220, 380, 590], notes: ['ร้านกาแฟ', 'Coworking lunch', 'มื้อเย็น', 'คาเฟ่ตัดต่อ'] },
        { catName: 'เดินทาง', amounts: [220, 350, 850, 1500], notes: ['ขับรถเชียงราย', 'Grab', 'เครื่องบิน', 'รถบัส'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 90, startNetWorth: 220000, noisePercent: 4 },
    advisorReports: [
      { ...REPORT_TEMPLATES.comprehensive('NICE'), domain: 'comprehensive', daysAgo: 4 },
      {
        domain: 'tax',
        title: 'แผนภาษีฟรีแลนซ์ 2569',
        summary: 'รายได้คาด ฿744K — ภาษี ~฿78K · ลดได้ ฿42K',
        content: '## รายได้คาดการณ์\n- ฿744K (เฉลี่ย ฿62K × 12)\n\n## หักค่าใช้จ่าย 60%\n- เหมา: ฿446K\n- สุทธิ: ฿297K\n\n## ลดหย่อน\n- ส่วนตัว ฿60K\n- ม.40 ฿3.6K\n- ประกัน ฿14.5K\n- RMF 30% ฿89.4K\n\n## คำแนะนำ\n1. แยกบัญชีภาษี 20%\n2. เก็บใบเสร็จ\n3. ภ.ง.ด. 90 มี.ค. 2569',
        daysAgo: 12,
      },
      { ...REPORT_TEMPLATES.emergency(), domain: 'emergency', daysAgo: 28 },
    ],
    notificationHistory: [
      { type: 'goal_milestone', severity: 'success', title: '🎉 Emergency Fund ครบ 6 เดือน!', body: '฿180,000 ปลอดภัย', daysAgo: 2 },
      { type: 'income_alert', severity: 'info', title: 'รายได้สูงกว่าเฉลี่ย', body: '฿82K (เฉลี่ย ฿62K)', daysAgo: 8 },
      { type: 'tax_reminder', severity: 'warn', title: 'ภาษี ฿78K', body: 'แยกแล้ว ฿84K — สบายใจ', daysAgo: 15 },
      { type: 'budget_alert', severity: 'info', title: 'งบ subscription เกิน', body: '฿2,200 / ฿2,000', daysAgo: 22 },
    ],
  },

  {
    key: 'merchant',
    email: 'merchant@lumenfi.app',
    name: 'JIB — Online Seller 35',
    description: 'เจ้าของร้าน Shopee/Lazada · ปนเงินส่วนตัว+ธุรกิจ',
    narrative: {
      before: 'รายได้ ฿250K/เดือน แต่ไม่รู้กำไรจริง ปนเงินส่วนตัว+ธุรกิจ ใช้บัตรเครดิตเป็น working capital',
      after: 'แยกบัญชีธุรกิจ-ส่วนตัวชัด รู้ margin จริง 22% เก็บเงินเดือนตัวเอง ฿65K',
      improvements: [
        '📊 รู้ margin จริง 22% (ก่อนเดา 35%)',
        '🏦 แยกบัญชี: ธุรกิจ + ส่วนตัว + กำไรสะสม',
        '💳 ลด credit card ฿120K → ฿0',
        '📜 จด ห.ส.น. — ประหยัดภาษี ฿35K/ปี',
        '📦 Buffer ค่าสต็อก ฿200K',
      ],
      nextStep: 'ขยายขายส่ง B2B + Lazmall · กำไรสุทธิ ฿80K/เดือน',
    },
    profile: {
      full_name: 'JIB',
      date_of_birth: '1990-09-25',
      num_dependents: 1,
      occupation: 'Online Merchant (Shopee/Lazada)',
      employment_type: 'business_owner',
      province: 'สมุทรปราการ',
      risk_tolerance: 'moderate',
      investment_experience: 'intermediate',
      financial_goal_summary: 'ขยายเป็นบริษัท · กำไร ฿80K/เดือน',
      income_salary_monthly: 65000,
      income_side_monthly: 0,
      income_investment_monthly: 1500,
      income_other_monthly: 22000,
      expense_food_monthly: 12000,
      expense_utilities_monthly: 2200,
      expense_phone_internet_monthly: 1500,
      expense_transport_monthly: 4500,
      expense_housing_monthly: 14000,
      expense_debt_payment_monthly: 8500,
      expense_insurance_monthly: 4200,
      expense_subscription_monthly: 1800,
      expense_other_monthly: 8000,
      monthly_income: 88500,
      monthly_expense_estimate: 56700,
      monthly_income_target: 120000,
      monthly_expense_target: 50000,
    },
    accounts: [
      { name: 'KBank ธุรกิจ', type: 'bank', initial_balance: 380000, color: '#16a34a', account_number: '0234567890' },
      { name: 'SCB เงินเดือนส่วนตัว', type: 'bank', initial_balance: 95000, color: '#7c3aed', account_number: '9988776655' },
      { name: 'KKP Profit', type: 'savings', initial_balance: 280000, color: '#fbbf24' },
      { name: 'TTB Business Reserve', type: 'savings', initial_balance: 200000, color: '#0d9488' },
      { name: 'เงินสด', type: 'cash', initial_balance: 25000, color: '#71717a' },
      { name: 'บัตรเครดิต KTC (ธุรกิจ)', type: 'credit_card', initial_balance: -45000, color: '#dc2626' },
      { name: 'Shopee Pay', type: 'e_wallet', initial_balance: 18000, color: '#ee4d2d' },
    ],
    goals: [
      { name: 'Buffer สต็อก (2 เดือน)', target_amount: 200000, current_amount: 200000, icon: '📦', color: '#10b981' },
      { name: 'Emergency Fund ส่วนตัว', target_amount: 360000, current_amount: 180000, icon: '🛟', color: '#06b6d4', is_emergency_fund: true },
      { name: 'จด ห.ส.น.', target_amount: 50000, current_amount: 35000, deadline: '2568-12-31', icon: '🏢', color: '#7c3aed' },
      { name: 'Lazmall + warehouse', target_amount: 800000, current_amount: 120000, deadline: '2570-06-30', icon: '🏬', color: '#f59e0b' },
      { name: 'การศึกษาลูก', target_amount: 800000, current_amount: 80000, deadline: '2580-06-30', icon: '🎓', color: '#ec4899' },
    ],
    debts: [
      { name: 'บัตรเครดิต KTC', type: 'credit_card', balance: 45000, original_balance: 120000, rate: 18, monthly_payment: 8500 },
    ],
    investments: [
      { name: 'KFLTFA50', type: 'mutual_fund', quantity: 500, avg_cost: 80, current_price: 92 },
      { name: 'TDEX SET50', symbol: 'TDEX', type: 'etf', quantity: 600, avg_cost: 18.5, current_price: 19.2 },
      { name: 'K-CHANGE-SSF', type: 'mutual_fund', quantity: 400, avg_cost: 100, current_price: 105, is_tax_saving: true, tax_fund_type: 'ssf', lock_in_until: '2578-12-31' },
      { name: 'ทองคำ 2 บาท', type: 'gold', quantity: 2, avg_cost: 32000, current_price: 34500, currency: 'THB' },
      { name: 'พันธบัตรออมทรัพย์', type: 'bond', quantity: 200, avg_cost: 1000, current_price: 1000 },
    ],
    insurance: [
      { type: 'health', carrier: 'AIA', policy_name: 'AIA H&S Plus 2M', sum_insured: 2000000, annual_premium: 22000 },
      { type: 'life', carrier: 'BLA', policy_name: 'ตลอดชีพ 2M', sum_insured: 2000000, annual_premium: 18500 },
      { type: 'accident', carrier: 'Viriyah', policy_name: 'PA เจ้าของกิจการ', sum_insured: 1000000, annual_premium: 5500 },
      { type: 'business', carrier: 'Viriyah', policy_name: 'ประกันร้าน + สต็อก', sum_insured: 800000, annual_premium: 4800 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 12000 },
      { category_name: 'เดินทาง', amount: 4500 },
      { category_name: 'บันเทิง', amount: 5000 },
    ],
    recurring: [
      { type: 'income', amount: 65000, day_of_month: 28, note: 'เงินเดือนตัวเอง' },
      { type: 'income', amount: 22000, day_of_month: 5, note: 'Profit dividend' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 14000, day_of_month: 1, note: 'ผ่อนทาวน์เฮ้าส์' },
      { type: 'expense', category_name: 'อื่นๆ', amount: 1500, day_of_month: 10, note: 'Shopify + LINE OA' },
      { type: 'expense', category_name: 'อื่นๆ', amount: 800, day_of_month: 15, note: 'ค่าเช่าโกดัง' },
    ],
    transactionTemplate: {
      count: 180,
      daysSpread: 90,
      extraSamples: [
        { catName: 'รายได้', amounts: [3500, 8500, 15000, 25000, 45000, 68000], notes: ['Shopee Live', 'Lazada Flash', 'ออเดอร์ปกติ', 'Shopee 7 วัน', 'Lazada สิ้นเดือน', 'Big order'] },
        { catName: 'อื่นๆ', amounts: [4500, 8500, 12000, 25000, 45000], notes: ['สต็อกใหม่ China', 'ขนส่ง Flash', 'Shopee Ads', 'FB Ads', 'จ่าย supplier'] },
        { catName: 'อาหาร', amounts: [120, 250, 480, 850], notes: ['ของกินทีม', 'ข้าวกล่องลูกน้อง', 'เลี้ยง VIP', 'ครอบครัว'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 90, startNetWorth: 800000, noisePercent: 3 },
    advisorReports: [
      { ...REPORT_TEMPLATES.comprehensive('JIB'), domain: 'comprehensive', daysAgo: 6 },
      {
        domain: 'debt',
        title: 'ลดหนี้ working capital → SME loan',
        summary: 'บัตรเครดิต ฿45K @ 18% → SME 7-9% ประหยัด ฿4.5K/ปี',
        content: '## ปัญหา\nบัตรเครดิตดอก 18%\n\n## คำแนะนำ\n1. สมัคร SME loan KBank/SCB\n2. คงวงเงิน 200-300K\n3. ปิดบัตรเครดิตธุรกิจ\n4. Inventory Days < 45',
        daysAgo: 18,
      },
      {
        domain: 'tax',
        title: 'จด ห.ส.น. — ประหยัด ฿35K/ปี',
        summary: 'รายได้ ฿2.5M → บุคคล ฿180K · ห.ส.น. ฿145K',
        content: '## เปรียบเทียบ\n| | บุคคล | ห.ส.น. |\n|---|---|---|\n| ภาษี | ฿180K | ฿145K |\n| ประหยัด | — | ฿35K |\n\n## ขั้นตอน\n1. จดที่กรมพัฒนาธุรกิจ\n2. เปิดบัญชีในนาม\n3. จ้างทำบัญชี\n4. ภ.ง.ด. 51+50',
        daysAgo: 35,
      },
      { ...REPORT_TEMPLATES.investment(), domain: 'investment', daysAgo: 55 },
    ],
    notificationHistory: [
      { type: 'income_alert', severity: 'success', title: '💰 Shopee 11.11 ฿185K', body: 'ใน 1 วัน', daysAgo: 1 },
      { type: 'debt_milestone', severity: 'success', title: 'ลดบัตร 63% ใน 6 เดือน', body: '฿120K → ฿45K', daysAgo: 5 },
      { type: 'budget_alert', severity: 'warn', title: 'ค่าโฆษณา +28%', body: '฿28K (target ฿22K)', daysAgo: 10 },
      { type: 'tax_reminder', severity: 'info', title: 'ใกล้ ฿1.8M → VAT', body: 'เตรียมจดทะเบียน', daysAgo: 20 },
      { type: 'goal_milestone', severity: 'success', title: 'Buffer สต็อก ครบ ฿200K', body: 'พร้อม pre-order', daysAgo: 28 },
    ],
  },

  {
    key: 'investor',
    email: 'investor@lumenfi.app',
    name: 'KAN — Active Investor 42',
    description: 'นักลงทุน · เงินเดือน + หุ้น + คริปโต + REIT',
    narrative: {
      before: 'มีพอร์ตหุ้น+กองทุน+คริปโต+อสังหา แต่ไม่เคยรวม view ไม่รู้ asset allocation จริง',
      after: 'รวม view ทุก asset class ฿4.2M · ติดตามปันผลครบ ฿18K/เดือน · ROI 11.8%',
      improvements: [
        '📊 รวม view 4 asset classes',
        '💰 ปันผลรายเดือน ฿18K',
        '⚖️ Rebalance Crypto 22% → 8%',
        '📈 ROI YTD 11.8% (vs SET +5%)',
        '🧾 Capital gain ครบ — ยื่นภาษีง่าย',
      ],
      nextStep: 'ขยายอสังหา · เป้า ฿8M ใน 5 ปี',
    },
    profile: {
      full_name: 'KAN',
      date_of_birth: '1983-04-18',
      num_dependents: 0,
      occupation: 'Investment Analyst + Trader',
      employment_type: 'employee',
      province: 'กรุงเทพฯ',
      risk_tolerance: 'aggressive',
      investment_experience: 'expert',
      financial_goal_summary: 'พอร์ต ฿10M ภายใน 50 · passive ฿50K/เดือน',
      income_salary_monthly: 120000,
      income_side_monthly: 15000,
      income_investment_monthly: 18000,
      income_other_monthly: 12000,
      expense_food_monthly: 11000,
      expense_utilities_monthly: 1800,
      expense_phone_internet_monthly: 1500,
      expense_transport_monthly: 5000,
      expense_housing_monthly: 0,
      expense_debt_payment_monthly: 18000,
      expense_insurance_monthly: 4500,
      expense_subscription_monthly: 1800,
      expense_other_monthly: 12000,
      monthly_income: 165000,
      monthly_expense_estimate: 55600,
      monthly_income_target: 200000,
      monthly_expense_target: 60000,
    },
    accounts: [
      { name: 'BBL เงินเดือน', type: 'bank', initial_balance: 220000, color: '#1e40af' },
      { name: 'SCB ออมทรัพย์', type: 'savings', initial_balance: 380000, color: '#7c3aed' },
      { name: 'KKP Dime+', type: 'savings', initial_balance: 250000, color: '#fbbf24' },
      { name: 'KGI หุ้น', type: 'investment', initial_balance: 580000, color: '#dc2626' },
      { name: 'Bitkub (Crypto)', type: 'investment', initial_balance: 320000, color: '#f97316' },
    ],
    goals: [
      { name: 'Emergency Fund', target_amount: 400000, current_amount: 380000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'พอร์ต ฿10M', target_amount: 10000000, current_amount: 4200000, deadline: '2576-04-18', icon: '📈', color: '#3b82f6' },
      { name: 'คอนโดปล่อยเช่า 2', target_amount: 800000, current_amount: 250000, deadline: '2571-12-31', icon: '🏢', color: '#f59e0b' },
      { name: 'เกษียณตอน 55', target_amount: 20000000, current_amount: 4500000, deadline: '2581-04-18', icon: '🌴', color: '#a855f7' },
    ],
    debts: [
      { name: 'สินเชื่อคอนโดปล่อยเช่า', type: 'mortgage', balance: 1850000, original_balance: 2400000, rate: 4.8, monthly_payment: 18000, remaining_term: 156 },
    ],
    investments: [
      { name: 'PTT', symbol: 'PTT', type: 'thai_stock', quantity: 1500, avg_cost: 35, current_price: 38.25 },
      { name: 'KBANK', symbol: 'KBANK', type: 'thai_stock', quantity: 800, avg_cost: 132, current_price: 148 },
      { name: 'SCC', symbol: 'SCC', type: 'thai_stock', quantity: 200, avg_cost: 380, current_price: 410 },
      { name: 'CPALL', symbol: 'CPALL', type: 'thai_stock', quantity: 500, avg_cost: 60, current_price: 65.5 },
      { name: 'AOT', symbol: 'AOT', type: 'thai_stock', quantity: 1000, avg_cost: 65, current_price: 72.5 },
      { name: 'K-USXNDQ-A', type: 'mutual_fund', quantity: 8000, avg_cost: 14.5, current_price: 16.8 },
      { name: 'K-CHINA-A', type: 'mutual_fund', quantity: 3000, avg_cost: 12, current_price: 11.2 },
      { name: 'K-VIETNAM-A', type: 'mutual_fund', quantity: 2000, avg_cost: 18, current_price: 22 },
      { name: 'KGTECH-RMF', type: 'mutual_fund', quantity: 3000, avg_cost: 28, current_price: 31.5, is_tax_saving: true, tax_fund_type: 'rmf', lock_in_until: '2596-04-18' },
      { name: 'K-USA-SSF', type: 'mutual_fund', quantity: 1500, avg_cost: 25, current_price: 28, is_tax_saving: true, tax_fund_type: 'ssf', lock_in_until: '2578-04-18' },
      { name: 'TDEX SET50', symbol: 'TDEX', type: 'etf', quantity: 1500, avg_cost: 18.5, current_price: 19.2 },
      { name: 'CPNREIT', symbol: 'CPNREIT', type: 'reit', quantity: 8000, avg_cost: 12, current_price: 13.2 },
      { name: 'WHART', symbol: 'WHART', type: 'reit', quantity: 12000, avg_cost: 11, current_price: 12.5 },
      { name: 'AIMIRT', symbol: 'AIMIRT', type: 'reit', quantity: 5000, avg_cost: 14, current_price: 15.8 },
      { name: 'Bitcoin', symbol: 'BTC', type: 'crypto', quantity: 0.12, avg_cost: 2200000, current_price: 2650000 },
      { name: 'Ethereum', symbol: 'ETH', type: 'crypto', quantity: 1.5, avg_cost: 88000, current_price: 102000 },
      { name: 'Solana', symbol: 'SOL', type: 'crypto', quantity: 25, avg_cost: 6500, current_price: 7800 },
      { name: 'Apple', symbol: 'AAPL', type: 'us_stock', quantity: 50, avg_cost: 165, current_price: 195, currency: 'USD' },
      { name: 'Microsoft', symbol: 'MSFT', type: 'us_stock', quantity: 30, avg_cost: 320, current_price: 410, currency: 'USD' },
      { name: 'NVIDIA', symbol: 'NVDA', type: 'us_stock', quantity: 20, avg_cost: 450, current_price: 850, currency: 'USD' },
    ],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health Premier 5M', sum_insured: 5000000, annual_premium: 38000 },
      { type: 'critical_illness', carrier: 'AIA', policy_name: 'AIA CI 3M', sum_insured: 3000000, annual_premium: 22000 },
      { type: 'life', carrier: 'BLA', policy_name: 'Term 20 (5M)', sum_insured: 5000000, annual_premium: 18000 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 11000 },
      { category_name: 'เดินทาง', amount: 5000 },
      { category_name: 'บันเทิง', amount: 6000 },
    ],
    recurring: [
      { type: 'income', amount: 120000, day_of_month: 25, note: 'เงินเดือน บล.' },
      { type: 'income', amount: 12000, day_of_month: 5, note: 'ค่าเช่าคอนโด' },
      { type: 'income', amount: 8000, day_of_month: 30, note: 'ปันผล' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 18000, day_of_month: 5, note: 'ผ่อนคอนโด' },
    ],
    transactionTemplate: {
      count: 130,
      daysSpread: 90,
      extraSamples: [
        { catName: 'รายได้', amounts: [3200, 4500, 6800, 8500, 12000, 18000], notes: ['ปันผล KBANK', 'ปันผล PTT', 'ปันผล CPN', 'ปันผล AOT', 'ปันผล CPNREIT', 'รวมปันผล'] },
        { catName: 'อื่นๆ', amounts: [500, 1200, 3500, 8500], notes: ['fee ซื้อหุ้น', 'fee Bitkub', 'Premium analyst', 'Custodian'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 90, startNetWorth: 3650000, noisePercent: 2.5 },
    advisorReports: [
      { ...REPORT_TEMPLATES.comprehensive('KAN'), domain: 'comprehensive', daysAgo: 1 },
      { ...REPORT_TEMPLATES.investment(), domain: 'investment', daysAgo: 8 },
      {
        domain: 'tax',
        title: 'Capital Gains 2569',
        summary: 'กำไรหุ้นต่างประเทศ ฿380K — ภาษี ~฿57K',
        content: '## Capital Gains 2569\n\n### หุ้นไทย ✓ ยกเว้น\n### ต่างประเทศ\n- AAPL +฿45K\n- NVDA +฿320K\n- MSFT +฿15K\n- รวม ฿380K → ภาษี 15% = ฿57K\n\n### Loss Harvesting\n- K-CHINA-A: -฿24K → ลดได้ ฿3.6K',
        daysAgo: 14,
      },
      {
        domain: 'investment',
        title: 'Rebalance — Crypto 22% → 8%',
        summary: 'Crypto โต 18% เกินเป้า',
        content: '## เป้า Allocation\n- หุ้นไทย 25%\n- ต่างประเทศ 30%\n- กองทุน 20%\n- REIT 12%\n- Crypto 8%\n- Bond/Cash 5%',
        daysAgo: 24,
      },
      { ...REPORT_TEMPLATES.retirement(), domain: 'retirement', daysAgo: 50 },
    ],
    notificationHistory: [
      { type: 'investment_alert', severity: 'success', title: 'NVDA ฿850', body: 'กำไร +฿160K — take profit?', daysAgo: 1 },
      { type: 'investment_alert', severity: 'info', title: 'ปันผล KBANK ฿4,800', body: 'รวม ฿18,500', daysAgo: 4 },
      { type: 'goal_milestone', severity: 'success', title: '🎉 พอร์ต ฿4.2M', body: '42% ของ ฿10M', daysAgo: 7 },
      { type: 'investment_alert', severity: 'warn', title: 'BTC +12% ใน 7 วัน', body: 'crypto > 20% — rebalance?', daysAgo: 12 },
      { type: 'tax_reminder', severity: 'info', title: 'Capital gains ฿380K', body: 'ภาษี ~฿57K', daysAgo: 18 },
    ],
  },

  {
    key: 'debt_recovery',
    email: 'recovery@lumenfi.app',
    name: 'AOM — IT Support 31',
    description: 'กำลังปลดหนี้ ฿380K → ฿120K · ลด 68% ใน 6 เดือน',
    narrative: {
      before: 'หนี้บัตร 4 ใบ ฿380K ดอก 18-22% เงินเดือน ฿42K จ่ายขั้นต่ำ ปลายเดือนไม่มีกิน',
      after: 'ลดหนี้เหลือ ฿120K (-68%) ใน 6 เดือน · ปิดบัตร 2 ใบ · มี Emergency Fund ฿35K',
      improvements: [
        '💳 ลดหนี้ ฿380K → ฿120K ใน 6 เดือน',
        '✂️ ปิดบัตรเครดิต 2 ใบ (จาก 4)',
        '🛟 เริ่มมี Emergency Fund ฿35K',
        '💰 ประหยัดดอก ฿4,500/เดือน',
        '📊 ลดบันเทิง 60%, อาหาร 30%',
      ],
      nextStep: 'ปลดหนี้หมดใน 6 เดือนข้างหน้า · เริ่มลงทุน RMF/SSF',
    },
    profile: {
      full_name: 'AOM',
      date_of_birth: '1994-12-03',
      num_dependents: 0,
      occupation: 'IT Support',
      employment_type: 'employee',
      province: 'นนทบุรี',
      risk_tolerance: 'conservative',
      investment_experience: 'beginner',
      financial_goal_summary: 'ปลดหนี้หมดใน 6 เดือน · ฿100K สำรองใน 1 ปี',
      income_salary_monthly: 42000,
      income_side_monthly: 5000,
      income_investment_monthly: 0,
      expense_food_monthly: 6500,
      expense_utilities_monthly: 1200,
      expense_phone_internet_monthly: 800,
      expense_transport_monthly: 2500,
      expense_housing_monthly: 7000,
      expense_debt_payment_monthly: 18000,
      expense_insurance_monthly: 1500,
      expense_subscription_monthly: 300,
      expense_other_monthly: 2500,
      monthly_income: 47000,
      monthly_expense_estimate: 40300,
      monthly_income_target: 60000,
      monthly_expense_target: 25000,
    },
    accounts: [
      { name: 'KBank เงินเดือน', type: 'bank', initial_balance: 8500, color: '#16a34a' },
      { name: 'SCB Easy Saver', type: 'savings', initial_balance: 35000, color: '#10b981' },
      { name: 'SCB Snowball', type: 'savings', initial_balance: 12000, color: '#f59e0b' },
      { name: 'เงินสด', type: 'cash', initial_balance: 1500, color: '#71717a' },
      { name: 'บัตรเครดิต KTC', type: 'credit_card', initial_balance: -45000, color: '#dc2626' },
      { name: 'บัตรเครดิต Citibank', type: 'credit_card', initial_balance: -75000, color: '#dc2626' },
    ],
    goals: [
      { name: 'ปลดหนี้ทั้งหมด', target_amount: 120000, current_amount: 0, deadline: '2569-11-30', icon: '🎯', color: '#dc2626' },
      { name: 'Emergency Fund (3 เดือน)', target_amount: 100000, current_amount: 35000, icon: '🛟', color: '#10b981', is_emergency_fund: true },
      { name: 'เริ่มลงทุน ฿50K', target_amount: 50000, current_amount: 0, deadline: '2570-06-30', icon: '🌱', color: '#3b82f6' },
    ],
    debts: [
      { name: 'บัตรเครดิต KTC', type: 'credit_card', balance: 45000, original_balance: 180000, rate: 18, monthly_payment: 8000 },
      { name: 'บัตรเครดิต Citibank', type: 'credit_card', balance: 75000, original_balance: 200000, rate: 22, monthly_payment: 10000 },
    ],
    investments: [],
    insurance: [
      { type: 'health', carrier: 'BLA', policy_name: 'BLA Smart Health Lite 1M', sum_insured: 1000000, annual_premium: 8500 },
      { type: 'accident', carrier: 'Viriyah', policy_name: 'PA Basic 300K', sum_insured: 300000, annual_premium: 1800 },
    ],
    budgets: [
      { category_name: 'อาหาร', amount: 6500 },
      { category_name: 'เดินทาง', amount: 2500 },
      { category_name: 'บันเทิง', amount: 1500 },
    ],
    recurring: [
      { type: 'income', amount: 42000, day_of_month: 28, note: 'เงินเดือน' },
      { type: 'income', amount: 5000, day_of_month: 15, note: 'รับสอน home tutor' },
      { type: 'expense', category_name: 'ที่อยู่อาศัย', amount: 7000, day_of_month: 1, note: 'ค่าเช่าห้อง' },
      { type: 'expense', category_name: 'บันเทิง', amount: 149, day_of_month: 5, note: 'Netflix Mobile' },
    ],
    transactionTemplate: {
      count: 100,
      daysSpread: 90,
      extraSamples: [
        { catName: 'อื่นๆ', amounts: [8000, 10000], notes: ['ผ่อนบัตร KTC', 'ผ่อนบัตร Citi'] },
        { catName: 'อาหาร', amounts: [55, 75, 95, 120], notes: ['ข้าวกล่อง', 'ร้านโปรด', '7-Eleven', 'ก๋วยเตี๋ยว'] },
      ],
    },
    snapshotProgression: { days: 7, totalDays: 180, startNetWorth: -360000, noisePercent: 1 },
    advisorReports: [
      {
        domain: 'debt',
        title: 'แผนปลดหนี้ Avalanche — สำเร็จ 68%!',
        summary: 'จาก ฿380K เหลือ ฿120K · ปลดหมดใน 6 เดือน',
        content: '## ความคืบหน้า 🎉\n\n| | เริ่ม | ตอนนี้ | ปลด |\n|---|---|---|---|\n| KTC (18%) | ฿180K | ฿45K | -75% |\n| Citi (22%) | ฿200K | ฿75K | -63% |\n| KBank | ปิด ✓ | — | -100% |\n| SCB | ปิด ✓ | — | -100% |\n\n## แผน\n1. Citi ก่อน (22%) — ผ่อน ฿10K\n2. ขั้นต่ำ KTC\n3. หลัง Citi → ทุ่ม KTC\n\n## ดอกที่ประหยัด\n- ปิด 2 ใบ → ฿4,500/เดือน\n- 6 เดือน: ฿27,000\n\n## คำแนะนำ\n- อย่าเปิดบัตรใหม่!\n- โบนัส → โปะ Citi',
        daysAgo: 1,
      },
      { ...REPORT_TEMPLATES.comprehensive('AOM'), domain: 'comprehensive', daysAgo: 8 },
      { ...REPORT_TEMPLATES.emergency(), domain: 'emergency', daysAgo: 30 },
    ],
    notificationHistory: [
      { type: 'debt_milestone', severity: 'success', title: '🎉 ปิดบัตร KBank!', body: 'หนี้เหลือ ฿120K · ลด 68%', daysAgo: 3 },
      { type: 'goal_milestone', severity: 'success', title: 'Emergency Fund แรก ฿35K!', body: 'จาก 0 — เก่งมาก', daysAgo: 7 },
      { type: 'debt_milestone', severity: 'info', title: 'Citi เหลือ ฿75K', body: 'อีก 8 เดือนปลดหมด', daysAgo: 12 },
      { type: 'budget_alert', severity: 'success', title: 'งบบันเทิง < 50%!', body: '฿720 / ฿1,500', daysAgo: 18 },
      { type: 'income_alert', severity: 'success', title: 'รับสอน +฿5K', body: 'รวม ฿47K — โปะหนี้ได้', daysAgo: 25 },
    ],
  },
];

export function getPersona(key: PersonaKey): Persona | undefined {
  return PERSONAS.find((p) => p.key === key);
}

export function getAllPersonaKeys(): PersonaKey[] {
  return PERSONAS.map((p) => p.key);
}
