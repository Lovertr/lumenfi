# 🎯 Feature Specification

เอกสารรายละเอียดฟีเจอร์ทั้งหมด — อ้างอิงเวลาออกแบบหน้า/database

---

## 1. Dashboard / Net Worth Center

**KPIs ที่แสดง:**
- Net Worth (assets − liabilities) — ใหญ่สุด
- กราฟ Net Worth ย้อนหลัง 6/12 เดือน
- Cash flow เดือนนี้ (รายรับ vs รายจ่าย)
- Top 5 หมวดที่ใช้เยอะสุด (donut chart)
- Financial Health Score (0-100)
- Quick stats:
  - Savings Rate (%)
  - DTI Ratio (%)
  - Emergency Fund Coverage (months)
  - Active goals progress

**Financial Health Score** คำนวณจาก:
- Savings rate (น้ำหนัก 25%): >20% = 25, 10-20% = 15, <10% = 5
- DTI (25%): <30% = 25, 30-40% = 15, >40% = 5
- Emergency fund (25%): >6mo = 25, 3-6mo = 15, <3mo = 5
- Investment diversification (15%): >3 asset classes = 15
- Goals on track (10%): all on track = 10

---

## 2. Income & Expense (Transactions)

**Fields:**
- Amount (decimal)
- Type: income / expense / transfer
- Category (FK)
- Account (FK) — บัญชีไหน
- Date + time
- Note (text)
- Tags (multi-select, custom)
- Photo URL (Supabase Storage)
- Recurring (FK to recurring_template, optional)
- Location (optional)

**Quick add flow:**
1. กดปุ่ม + ลอย (FAB)
2. เลือก income/expense/transfer
3. ใส่จำนวน + เลือก category (recent ขึ้นก่อน)
4. Save → เสร็จใน 3 tap

**Recurring transactions:**
- Frequency: daily / weekly / monthly / yearly
- Start date + end date (optional)
- N8N cron จะสร้าง transaction ทุกครั้งที่ถึงรอบ

**OCR scan bill:**
- ถ่ายรูป → ส่งไป N8N webhook → Tesseract/Google Vision → return {amount, date, merchant, items}
- User confirm + แก้ไขก่อน save

---

## 3. Accounts (บัญชี)

**Types:**
- Cash (เงินสด)
- Bank (ธนาคาร — แยกแต่ละบัญชี)
- Credit card (บัตรเครดิต — มี credit limit)
- E-wallet (TrueMoney, ShopeePay, ฯลฯ)
- Savings (บัญชีออมทรัพย์เพื่อเป้าหมาย)

**Fields:**
- Name (ชื่อเล่น เช่น "KBank เงินเดือน")
- Type
- Currency (THB default)
- Initial balance
- Current balance (computed)
- Color, icon
- Include in net worth (boolean)
- Credit limit (สำหรับบัตรเครดิต)
- Statement date + due date (สำหรับบัตรเครดิต)

**Transfer between accounts:** สร้าง 2 transactions (out จากบัญชี A, in เข้าบัญชี B) ผูกด้วย transfer_id

---

## 4. Categories

**Default seed (ไทย):**
- 🍔 อาหาร
- 🚗 เดินทาง
- 🏠 ค่าที่อยู่อาศัย
- 💡 ค่าน้ำค่าไฟ/อินเทอร์เน็ต
- 🛒 ของใช้
- 👕 เสื้อผ้า
- 🏥 สุขภาพ
- 📚 การศึกษา
- 🎬 บันเทิง
- 💼 งาน/ธุรกิจ
- 🎁 ของขวัญ/บริจาค
- 💰 เงินเดือน (income)
- 💵 รายได้เสริม (income)
- 📈 เงินปันผล (income)
- 🔄 อื่นๆ

**Custom category:**
- Name, icon (emoji), color, parent (sub-category support), type (income/expense/both)
- Budget per month (optional)

---

## 5. Debt Management ⭐ (ฟีเจอร์เด่น)

**Debt types:**
- บัตรเครดิต (revolving)
- สินเชื่อบุคคล
- สินเชื่อรถ
- สินเชื่อบ้าน
- กยศ.
- หนี้นอกระบบ
- ผ่อน 0%
- อื่นๆ

**Fields per debt:**
- Name (เช่น "บัตร KTC", "บ้าน SCB")
- Type
- Lender (ชื่อเจ้าหนี้)
- Original principal (เงินต้นเริ่มต้น)
- Current balance (เงินต้นคงเหลือ)
- Interest rate (% ต่อปี)
- Interest type: reducing balance / flat
- Monthly payment (ค่างวด)
- Term (จำนวนงวดทั้งหมด)
- Remaining term (งวดที่เหลือ)
- Start date
- Due day of month (วันที่ต้องจ่ายของเดือน)
- Late fee (ค่าปรับ)
- Status: active / paid off / defaulted
- Note

**Calculations:**
- Total interest to pay (ดอกเบี้ยรวมที่จะต้องจ่าย)
- Payoff date (วันที่หนี้หมด)
- Amortization schedule (ตารางผ่อน — งวดไหนจ่ายดอกเท่าไหร่ ต้นเท่าไหร่)

**Strategy comparison:**
- **Avalanche**: จ่ายดอกสูงสุดก่อน → ประหยัดดอกที่สุด
- **Snowball**: จ่ายยอดน้อยสุดก่อน → ปลดหนี้ก้อนเร็ว มีกำลังใจ
- แสดงตารางเปรียบเทียบ: เงินรวมที่จ่าย, ดอกรวม, เวลาจนหนี้หมด

**Extra payment simulator:**
- Slider "โปะเพิ่มเดือนละ ___ บาท"
- คำนวณ: หนี้หมดเร็วขึ้น X เดือน, ประหยัดดอก Y บาท

**Refinance calculator:**
- ใส่ดอกใหม่, term ใหม่, ค่าธรรมเนียม
- เปรียบเทียบกับเงื่อนไขปัจจุบัน

**DTI Ratio:** total monthly debt payments / monthly income — แสดงเด่นบน dashboard
- < 30%: เขียว (ดี)
- 30-40%: เหลือง (ระวัง)
- > 40%: แดง (เป็นหนี้เกินตัว)

---

## 6. Investment Tracking

**Investment types:**
- หุ้นไทย (SET)
- หุ้นต่างประเทศ
- กองทุนรวม (ระบุ AMC + กองทุน)
- ETF
- Crypto
- ทองคำ (แท่ง/รูปพรรณ)
- REIT
- อสังหาริมทรัพย์
- พันธบัตร
- เงินฝากประจำ
- สลากออมสิน/ธ.ก.ส.

**Fields per holding:**
- Symbol/Name
- Type
- Account (ที่ซื้อ — เช่น Bualuang, Settrade, Binance)
- Quantity
- Average cost basis
- Current price (manual update หรือ auto via API)
- Currency
- Purchase date
- Notes

**Investment transactions:**
- Buy / Sell / Dividend / Stock split
- Quantity, price, fee, tax

**Calculations:**
- Total value
- Unrealized P/L (current value − cost basis)
- Realized P/L (จาก sell transactions)
- Total return % (รวม dividend)
- Asset allocation pie chart (% หุ้น/พันธบัตร/cash/ทอง/crypto)

**DCA tracker:** ถ้า holding มี recurring buy → คำนวณ DCA price

---

## 7. Goals (เป้าหมาย)

**Goal types/templates:**
- Emergency Fund (พิเศษ — มี dashboard เด่น)
- Down payment บ้าน
- ซื้อรถ
- ทุนการศึกษาลูก
- เกษียณ
- ทริปท่องเที่ยว
- งานแต่ง
- ทุนเริ่มต้นธุรกิจ
- Custom

**Fields:**
- Name
- Target amount
- Current amount
- Deadline (date)
- Priority (high/medium/low)
- Linked account (optional — บัญชีที่เก็บเงินเพื่อเป้านี้)
- Color, icon
- Auto-contribute (จำนวน + frequency)

**Calculations:**
- Progress % = current / target
- Months remaining = (deadline - today) in months
- Required monthly = (target - current) / months remaining
- On track? = required monthly < user's savings capacity

**Emergency Fund:** คำนวณ months coverage = current_amount / avg_monthly_expense

**Retirement / FIRE Calculator:**
- Inputs: current age, retirement age, current savings, monthly contribution, expected return %, inflation %, desired retirement income
- Output: needed retirement corpus, projected savings at retirement, gap analysis

---

## 8. AI Advisor

**API key management:**
- Settings page: เลือก provider (Anthropic / OpenAI / Gemini)
- Input API key + endpoint (เผื่อ self-hosted Ollama)
- Test connection button
- Encrypt with AES-GCM ก่อนเก็บ (key derived จาก password ผู้ใช้ + salt)
- Stored: Supabase encrypted column หรือ localStorage (ผู้ใช้เลือก)

**Provider abstraction:**
```ts
interface AIProvider {
  chat(messages: Message[], options): AsyncIterable<string>
  embed(text: string): Promise<number[]>
}
```

**Context injection (ส่งข้อมูลไหนให้ AI):**
- User profile: อายุ, เป้าหมาย, risk tolerance
- Last 30 days transactions (สรุปแยก category)
- Active debts summary
- Active goals
- Net worth + financial health score
- Privacy mode → anonymize (แทน "ร้านสตาร์บัคส์" ด้วย "ร้านกาแฟ")

**Prompt templates:**
1. **วิเคราะห์เดือนนี้** — "ดูค่าใช้จ่ายเดือนนี้ของฉันหน่อย หมวดไหนน่าห่วง?"
2. **แนะนำใช้หนี้** — "ฉันควรจ่ายหนี้ก้อนไหนก่อน เพราะอะไร?"
3. **เช็คสุขภาพการเงิน** — "ประเมินสุขภาพการเงินของฉันหน่อย"
4. **คาดการณ์อนาคต** — "ถ้าใช้จ่ายแบบนี้ต่อไป 6 เดือนข้างหน้าจะเป็นไง?"
5. **แผนสู่เป้าหมาย** — "ทำยังไงถึงจะถึงเป้า [เป้า] ภายใน [วันที่]?"
6. **ตัวลดหย่อนภาษี** — "ปีนี้ฉันควรซื้อ RMF/SSF เท่าไหร่?"

**Chat features:**
- Streaming response
- History (เก็บใน Supabase, ไม่ส่ง API key ไป)
- Cite sources (transaction IDs ที่ AI อ้างถึง)
- Suggested follow-up prompts

---

## 9. Reminders & Notifications

**Types:**
- Bill due (3 วัน, 1 วัน ก่อน due date)
- Credit card statement available
- Budget exceeded (80%, 100%)
- Recurring transaction created
- Goal milestone achieved
- AI weekly digest

**Channels:**
- In-app (notification bell)
- Push (PWA)
- Email (via N8N)
- LINE Notify (optional, via N8N — สำหรับคนไทย)

---

## 10. Reports & Calculators

**Reports:**
- Monthly summary (PDF export): income vs expense, top categories, savings rate, net worth change
- Yearly summary
- Tax report (สำหรับยื่นภาษี)
- Custom date range report

**Calculators:**
- 🧮 Compound interest
- 🏦 Loan/Mortgage payment
- 📊 Refinance comparison
- 📉 Inflation impact
- 🎯 FIRE / Retirement
- 💰 Tax estimator (PIT ไทย + ลดหย่อน)
- 💱 Currency converter

---

## 11. PWA Features

- Install on mobile home screen (manifest.json)
- Offline mode (cached pages + queue transactions to sync)
- Push notifications (web push)
- Splash screen
- Native-like navigation (bottom tab bar)

---

## 12. Privacy & Security

- Supabase RLS: ทุก table มี policy `user_id = auth.uid()`
- API keys encrypted before storage
- Optional PIN/biometric lock (web auth API)
- 2FA via Supabase
- Export all data (CSV/JSON) — GDPR compliance
- Delete account flow

---

## 13. Mobile-First Design Principles

- Bottom navigation: Home / Transactions / + (FAB) / AI / More
- Large touch targets (min 44px)
- Single-column layout < 768px
- Sticky FAB สำหรับ quick add
- Swipe gestures: swipe left to delete, swipe right to edit
- Pull-to-refresh
- Skeleton loaders
- Bottom sheets แทน modals
