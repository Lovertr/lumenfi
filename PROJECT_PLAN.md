# 💰 Lumenfi — Master Project Plan

> **Brand:** Lumenfi (Lumen = แสง / insight + fi = finance)
> **Tagline:** Light up your finances

> **เอกสารหลักสำหรับติดตามความคืบหน้า** — เปิดเอกสารนี้ทุกครั้งที่กลับมาทำต่อ จะรู้ว่าทำถึงไหนแล้ว
>
> **Last updated:** 2026-04-27
> **Owner:** Lovertr (tintanee.t@gmail.com)
> **Stack:** Next.js 14 + Supabase + Vercel + N8N

---

## 📍 Current Status

**Phase:** Phase 3-8 ✅ Complete + Desktop Layout!
**Live URL:** https://lumenfi.vercel.app/th 🎉
**Next action:** Push → test desktop layout + AI chat + Investments → next: Phase 11 PWA
**Auto-push:** Claude สามารถ push อัตโนมัติได้ (ทดสอบสำเร็จ)

---

## 🎯 Project Vision

แอปบริหารการเงินส่วนตัวครบวงจร — รายรับ-รายจ่าย หนี้สิน การลงทุน เป้าหมาย พร้อม AI Advisor (BYO API key) ออกแบบ Mobile-First แต่เป็น Web App (PWA) เพื่อใช้ได้ทั้งมือถือและเดสก์ท็อป

**Differentiator:**
- AI ใช้ API key ของผู้ใช้เอง → privacy + ลดค่า inference
- รองรับหลาย provider (Anthropic, OpenAI, Gemini)
- Local-first option (ตัวเลือกเก็บข้อมูลในเครื่อง)
- ใช้ N8N ทำงาน background (recurring, OCR, reminders)

**💰 Business Model:** Freemium — มี Subscription เก็บเงินเมื่อระบบเสร็จสมบูรณ์
- รายละเอียด tier + ราคา → ดู Phase 14 (Subscription & Billing) ด้านล่าง

---

## 🏗️ Tech Stack (สรุป)

| Layer | Tech | เหตุผล |
|-------|------|---------|
| Frontend | **Next.js 14** (App Router) + TypeScript | Vercel optimized, SSR, mobile-first ด้วย Tailwind |
| Styling | **Tailwind CSS** + **shadcn/ui** | Mobile-first, สวย, customizable |
| Database | **Supabase** (PostgreSQL) | Free tier ดี, auth + storage + realtime ครบ |
| Auth | **Supabase Auth** | Email + Google OAuth |
| Storage | **Supabase Storage** | สำหรับรูปบิล/ใบเสร็จ |
| Hosting | **Vercel** | Free tier, auto-deploy from GitHub |
| Repo | **GitHub** | Source control + Vercel integration |
| Automation | **N8N** | Recurring tx, OCR, reminders, daily digest |
| Charts | Recharts | React-native, ทำกราฟสวย |
| Forms | React Hook Form + Zod | Type-safe validation |
| State | Zustand | Lightweight, ดีกว่า Redux ในงานนี้ |
| OCR | Tesseract.js (client) หรือ N8N + Google Vision | เลือกตาม budget |
| AI | User's own API key (Anthropic/OpenAI/Gemini) | Encrypted in localStorage |

---

## 🗺️ Roadmap & Progress Tracker

### ✅ Phase 0 — Setup & Foundation
**เป้าหมาย:** มี repo ที่ deploy ขึ้น Vercel ได้ + database schema พร้อม

- [x] สร้าง project plan documents (PROJECT_PLAN.md, FEATURES.md, DATABASE_SCHEMA.sql)
- [x] Scaffold Next.js project (package.json, configs, tsconfig)
- [x] Tailwind + shadcn/ui base setup
- [x] โครง folder structure
- [x] Landing page + base layout
- [x] **Brand identity** — Logo final (Variant C: Prism + Coin + Both Shines), Wordmark, Color palette
- [x] **i18n (Thai + English)** — next-intl setup, [locale] routing, messages files, language switcher
- [ ] **[NEXT]** สร้าง Supabase project ที่ supabase.com
- [ ] รัน `DATABASE_SCHEMA.sql` ใน Supabase SQL Editor
- [x] เพิ่ม `.env.local` ด้วย Supabase URL + anon key
- [x] `npm install` แล้วทดสอบ `npm run dev` local
- [x] Push ขึ้น GitHub repo (private) — `github.com/Lovertr/lumenfi`
- [x] เชื่อม Vercel กับ repo + ตั้ง env variables (Supabase URL/keys, APP_NAME, etc.)
- [x] Deploy ครั้งแรกผ่าน build (แก้ 3 รอบ — JSON syntax, Database type, implicit any)
- [x] แก้ middleware matcher (2 รอบ) — ยังไม่ผ่าน
- [x] เปลี่ยน `localePrefix: 'as-needed'` → `'always'` — ยังไม่ผ่าน
- [x] ลอง `src/app/page.tsx` redirect — fail (ขัดกับ root layout ใน `[locale]`)
- [x] เพิ่ม `next.config.js` redirects ครบทุก path รวม `/` → `/th` — fail (ทุก URL 404 รวม `/th` ที่ build แล้ว)
- [x] Simplify middleware — strip custom auth, ใช้ minimal next-intl — ยังไม่ผ่าน
- [x] Force dynamic rendering ใน `[locale]/layout.tsx` (bypass static SSG)
- [x] **Plan B: delete Vercel project + re-import จาก GitHub** ✅ **WORKED!**
- [x] Site live ที่ https://lumenfi.vercel.app/th 🎉
- [ ] **[NEXT]** อัพเดท `NEXT_PUBLIC_APP_URL` เป็น `https://lumenfi.vercel.app` + Redeploy
- [ ] ทดสอบ flow: signup → dashboard → add account → logout → login

### 🔐 Phase 1 — Auth & User Profile
**เป้าหมาย:** ผู้ใช้สมัคร/login ได้ + มีหน้า profile

- [x] Supabase Auth client setup (browser + server + middleware)
- [x] Middleware ป้องกัน route ที่ต้อง login (รวมกับ i18n routing)
- [x] หน้า `/login` (Email + Google OAuth) — i18n รองรับ ไทย/อังกฤษ
- [x] หน้า `/signup` (Email + Google OAuth + ยืนยันรหัสผ่าน)
- [x] OAuth callback route `/auth/callback`
- [x] Server actions: signInWithEmail, signUpWithEmail, signInWithGoogle, signOut
- [x] UI components: Input, Label, GoogleButton, LoginForm, SignupForm
- [x] Form validation + error mapping (Zod schemas)
- [x] Logout button ใน UI (อยู่บน dashboard + accounts header)
- [ ] หน้า `/forgot-password` + `/reset-password`
- [ ] หน้า `/settings/profile` (แก้ชื่อ, สกุลเงินหลัก, timezone)
- [ ] Auth hook (`useUser`)

### 💵 Phase 2 — Accounts & Categories
**เป้าหมาย:** ผู้ใช้สร้างบัญชี (cash/bank/credit) และหมวดหมู่ได้

- [x] หน้า `/accounts` แสดง balance ทุกบัญชี + Total assets/liabilities
- [x] หน้า `/accounts/new` — เพิ่มบัญชีใหม่ (type picker + color picker)
- [x] Server action `createAccount` (Zod validation + Supabase insert)
- [x] Account type config (cash, bank, credit_card, e_wallet, savings, other)
- [x] Empty state + FAB
- [x] Logout button on dashboard
- [x] Categories — auto-seed defaults บน first visit (ผ่าน SQL function)
- [x] หน้า `/categories` — แสดง income + expense แยก
- [ ] Edit / archive account (เซสชันถัดไป)
- [ ] Account detail page `/accounts/[id]` (เซสชันถัดไป)

### 📝 Phase 3 — Income & Expense (MVP Core)
**เป้าหมาย:** บันทึก-แก้-ลบรายการได้ + อัพโหลดรูปบิล

- [x] DB schema `transactions` พร้อม (ใน DATABASE_SCHEMA.sql)
- [x] Form เพิ่ม transaction (type tabs, amount, category picker, account picker, date, note)
- [x] List view group by date + delete button
- [x] Quick add via FAB at bottom-center (เปิดแอป → กด → 3 tap save)
- [x] Server actions: createTransaction, deleteTransaction
- [x] Monthly summary card (income/expense/balance)
- [ ] Upload รูปบิลไป Supabase Storage (เซสชันถัดไป)
- [ ] OCR scan bill (เซสชันถัดไป — ผ่าน N8N)
- [ ] Edit transaction (เซสชันถัดไป)
- [ ] Filter by category/account (เซสชันถัดไป)
- [ ] Recurring transactions (เซสชันถัดไป)

### 📊 Phase 4 — Dashboard & Net Worth
**เป้าหมาย:** หน้าแรกที่บอกสุขภาพการเงินรวมทั้งหมด

- [x] Net Worth real-time จาก accounts + debts (assets − liabilities)
- [x] Cash flow card (รายรับ-รายจ่ายเดือนนี้)
- [x] Top 5 expense categories chart (จาก transactions ของเดือน)
- [x] Financial Health Score (0-100) คำนวณจาก savingsRate + DTI + emergencyFund
- [x] Quick stats: Savings rate, DTI, Emergency fund coverage
- [x] Quick action cards (debts/investments/goals/accounts) พร้อม count
- [x] Greeting แสดงชื่อจริงของ user (`profiles.full_name`)
- [ ] กราฟ Net Worth ย้อนหลัง (เซสชันถัดไป — ใช้ net_worth_snapshots)

### 💳 Phase 5 — Debt Management
**เป้าหมาย:** จัดการหนี้สินทุกก้อน + คำนวณกลยุทธ์ใช้หนี้

- [x] DB schema `debts` + `debt_payments` พร้อม
- [x] CRUD หนี้ (8 types: บัตรเครดิต/สินเชื่อ/รถ/บ้าน/กยศ./นอกระบบ/ผ่อน 0%/อื่นๆ)
- [x] หน้า `/debts` แสดง total debt + monthly payment summary
- [x] หน้า `/debts/new` — type picker + form ครบทุก field
- [x] Server actions: createDebt, deleteDebt
- [x] DTI auto-calc on dashboard (จาก monthly_payment / monthly_income)
- [x] `generateAmortization()` function ใน lib/utils.ts (พร้อมใช้)
- [ ] Amortization table view (เซสชันถัดไป — ใช้ฟังก์ชันที่มีแล้ว)
- [ ] Strategy comparison: Avalanche vs Snowball (เซสชันถัดไป)
- [ ] Extra payment simulator (เซสชันถัดไป)
- [ ] Refinance calculator (เซสชันถัดไป)

### 🎯 Phase 6 — Goals & Planning
**เป้าหมาย:** ตั้งเป้าหมายและติดตามความคืบหน้า

- [x] DB schema `goals` พร้อม
- [x] CRUD goals พร้อม preset 9 แบบ (Emergency / บ้าน / รถ / การศึกษา / เกษียณ / ทริป / งานแต่ง / ธุรกิจ / Custom)
- [x] Progress bar + % + monthly required calculation
- [x] Emergency Fund flag (auto-link กับ dashboard emergency fund coverage)
- [x] Server actions: createGoal, deleteGoal
- [x] หน้า `/goals` + `/goals/new` ใช้งานได้
- [ ] Goal detail page + contribution flow (เซสชันถัดไป)
- [ ] Retirement / FIRE calculator (เซสชันถัดไป)

### 🤖 Phase 7 — AI Advisor (BYO API Key)
**เป้าหมาย:** ผู้ใช้ใส่ API key เอง แล้วคุยกับ AI ได้

- [x] หน้า `/ai/settings` ใส่ API key (4 providers: Anthropic/OpenAI/Gemini/OpenRouter)
- [x] AES-GCM encryption (`src/lib/encryption.ts`) — encrypt/decrypt/maskKey
- [x] Server actions: saveAIKey, removeAIKey
- [x] หน้า `/ai` แสดง config + suggested prompts skeleton
- [x] Privacy mode toggle
- [x] Show/hide API key toggle
- [ ] Chat UI พร้อม streaming response (เซสชันถัดไป)
- [ ] Provider abstraction layer (anthropic.ts / openai.ts / gemini.ts) (เซสชันถัดไป)
- [ ] Context injection (ส่งข้อมูลการเงิน summarize ไป AI) (เซสชันถัดไป)
- [ ] Test connection button (เซสชันถัดไป)
- [ ] Conversation history (เซสชันถัดไป)

### 📈 Phase 8 — Investment Tracking
**เป้าหมาย:** ติดตามพอร์ตการลงทุน

- [ ] DB schema `investments` + `investment_transactions`
- [ ] CRUD investment holdings (หุ้น, กองทุน, crypto, ทอง, อสังหา)
- [ ] Cost basis + current value
- [ ] Realized/Unrealized P/L
- [ ] Asset allocation chart
- [ ] Dividend tracking
- [ ] DCA tracker

### 🔔 Phase 9 — Reminders, Recurring & N8N
**เป้าหมาย:** ระบบแจ้งเตือน + automation ผ่าน N8N

- [ ] N8N webhook: monthly recurring transaction creator
- [ ] N8N cron: เตือนวัน due date หนี้/บัตร (3 วัน, 1 วัน ก่อน)
- [ ] N8N: alert เมื่อใช้งบหมวดเกิน 80%
- [ ] N8N: daily AI digest ส่ง email
- [ ] N8N: OCR pipeline สำหรับรูปบิล (ถ้าเลือกใช้)
- [ ] In-app notification center

### 📑 Phase 10 — Reports & Calculators
- [ ] Monthly/Quarterly/Yearly report (PDF export)
- [ ] Compound interest calculator
- [ ] Loan/Mortgage calculator
- [ ] Refinance calculator
- [ ] Inflation calculator
- [ ] Tax estimator (ภาษีเงินได้ไทย + ลดหย่อน RMF/SSF)

### 🚀 Phase 11 — PWA & Polish
- [ ] PWA manifest + service worker (ติดตั้งบนมือถือได้)
- [ ] Offline support
- [ ] Performance audit (Lighthouse > 90)
- [ ] Dark mode
- [ ] i18n (ไทย/อังกฤษ)
- [ ] User onboarding flow
- [ ] Empty states, loading states, error handling

### 🔒 Phase 12 — Security & Backup
- [ ] Supabase RLS (Row Level Security) policies
- [ ] Rate limiting (Vercel Edge)
- [ ] Export ข้อมูล (CSV/JSON)
- [ ] Import จาก CSV
- [ ] Account deletion (GDPR)
- [ ] Audit log

### 🎨 Phase 13 — Advanced (Optional)
- [ ] Family/Shared wallet
- [ ] Multi-currency
- [ ] Bank API integration (Open Banking ไทย)
- [ ] Receipt warranty tracker
- [ ] Subscription detector (ให้ผู้ใช้ track subscription ของตัวเอง)
- [ ] Gamification (streak, badges)
- [ ] Education hub

### 💳 Phase 14 — Subscription & Billing (Monetization) 💰
**เป้าหมาย:** เก็บเงินจากผู้ใช้แบบ subscription เมื่อระบบเสร็จสมบูรณ์ — เริ่มหลัง MVP launch ผ่าน beta phase

**Tier ที่วางไว้ (ร่าง — ปรับได้):**

| Tier | ราคา/เดือน | ฟีเจอร์ |
|------|-----------|---------|
| **Free** | 0 ฿ | ข้อมูลพื้นฐาน 1 บัญชี, transactions, goals 1 อัน, AI ใช้ API key เอง |
| **Pro** | 99-199 ฿ | บัญชีไม่จำกัด, OCR ใส่บิล, advanced reports, รวม subscription detector, Family wallet 1 คน |
| **Premium** | 299-499 ฿ | ทุกฟีเจอร์ Pro + Bank API integration + AI ใช้ key ระบบ (ฟรี) + priority support + Family wallet 5 คน |

**งานที่ต้องทำ:**
- [ ] เลือก payment provider (ตัวเลือก: Stripe Thailand, Omise, PromptPay+QR, App Store/Play Store IAP)
- [ ] DB schema: `subscriptions`, `payment_methods`, `invoices`, `feature_entitlements`
- [ ] หน้า `/pricing` — เปรียบเทียบ tier
- [ ] หน้า `/settings/billing` — จัดการ subscription, view invoice, change plan
- [ ] Webhook รับ payment events (subscription created/updated/canceled/payment failed)
- [ ] Feature gating logic — ตรวจ entitlement ทุกครั้งที่ใช้ฟีเจอร์ paid
- [ ] Upgrade prompt UI — เมื่อ free user ถึง limit
- [ ] Trial period (free 14 วัน Pro)
- [ ] Promo code / referral system
- [ ] Email receipt + invoice PDF
- [ ] Tax handling (VAT 7% ไทย)
- [ ] GDPR-style refund flow
- [ ] Analytics: MRR, churn, LTV tracking

**เปิดให้ตัดสินใจ (Open Decisions):**
- ราคา Pro tier ที่เหมาะกับ Thai market? (99-199 ฿ ?)
- Payment provider — ตลาดไทยอย่างเดียว vs global พร้อมเลย?
- เปิด trial 14 วันฟรีไหม?
- จะใช้ App Store / Play Store IAP เพิ่มไหม (เก็บค่า 30%)?
- Lifetime deal เมื่อ launch แรกๆ?

---

## 📂 File Structure

```
finance-app/
├── PROJECT_PLAN.md          ← เอกสารนี้ (master tracker)
├── FEATURES.md              ← Feature spec ฉบับเต็ม
├── DATABASE_SCHEMA.sql      ← Supabase DB schema
├── SETUP_GUIDE.md           ← วิธี setup ทีละขั้น
├── README.md                ← Project overview
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── .env.local               ← (gitignored) Supabase keys
├── .gitignore
├── public/
│   └── icons/
├── src/
│   ├── app/                 ← Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx         ← Landing
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   └── (app)/           ← Protected routes
│   │       ├── layout.tsx   ← Bottom nav
│   │       ├── dashboard/
│   │       ├── transactions/
│   │       ├── debts/
│   │       ├── investments/
│   │       ├── goals/
│   │       ├── ai/
│   │       └── settings/
│   ├── components/
│   │   ├── ui/              ← shadcn/ui components
│   │   ├── charts/
│   │   ├── forms/
│   │   └── layout/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── ai/              ← AI provider abstraction
│   │   ├── utils.ts
│   │   └── calculations/    ← Finance formulas
│   ├── hooks/
│   ├── types/
│   └── stores/              ← Zustand stores
└── supabase/
    └── migrations/
```

---

## 🔑 Decision Log (บันทึกการตัดสินใจสำคัญ)

| Date | Decision | เหตุผล |
|------|----------|---------|
| 2026-04-27 | เลือก Next.js + Supabase | Stack ที่เข้ากับ Vercel ดีที่สุด, free tier เพียงพอ |
| 2026-04-27 | BYO API key สำหรับ AI | Privacy + ลด cost, ผู้ใช้ควบคุมเอง |
| 2026-04-27 | Mobile-first PWA แทน native app | Cross-platform, deploy ง่าย, ไม่ต้อง app store |
| 2026-04-27 | ใช้ N8N สำหรับ automation | ผู้ใช้มีอยู่แล้ว, no-code, debug ง่าย |

---

## 📝 Open Questions / TODO ตัดสินใจภายหลัง

- [ ] OCR: ใช้ Tesseract.js (free, on-device) หรือ Google Vision via N8N (แม่นกว่า แต่มีค่าใช้จ่าย)?
- [ ] Realtime price feed สำหรับการลงทุน: free API ตัวไหน? (CoinGecko ฟรี, SET API?)
- [ ] Dark mode default ตาม system หรือ user setting?
- [ ] รองรับภาษาอังกฤษตั้งแต่ MVP หรือ Phase หลัง?
- [ ] Subscription tier (ฟรี vs Pro) หรือฟรีทั้งหมด?

---

## 🔗 Quick Links (เติมหลัง setup)

- **GitHub Repo:** _TBD_
- **Vercel Project:** _TBD_
- **Supabase Project:** _TBD_
- **N8N Instance:** _TBD_
- **Production URL:** _TBD_

---

## 📅 Session Log (บันทึกแต่ละครั้งที่มาทำต่อ)

### Session 1 — 2026-04-27
- ✅ Brainstorm features ครบทุกโมดูล
- ✅ สร้าง PROJECT_PLAN.md, FEATURES.md, DATABASE_SCHEMA.sql, SETUP_GUIDE.md
- ✅ Scaffold Next.js project (package.json, configs, layout, landing page)
- ✅ ตั้งชื่อแบรนด์ **Lumenfi** + tagline "Light up your finances"
- ✅ ออกแบบ logo final: Prism + Coin + Both Shines (Variant C) ใน gold spectrum
- ✅ Setup i18n (next-intl): ไทย default + อังกฤษ, restructure routes ใต้ [locale]
- ✅ สร้าง LogoMark + Wordmark React components, LanguageSwitcher
- ✅ Translate landing page + dashboard ทั้ง 2 ภาษา
- ✅ **Phase 1 (Auth):** Login + Signup pages, server actions, Google OAuth, callback route
- ✅ **Phase 2 (Accounts):** List page + Add page + type picker + color picker + server actions
- ✅ **Logout button** บน dashboard และ accounts header
- ✅ **Supabase project** สร้างเสร็จ + รัน DATABASE_SCHEMA.sql + Storage bucket "receipts"
- ✅ **GitHub repo** `github.com/Lovertr/lumenfi` (private)
- ✅ **Vercel deploy** สำเร็จ — `lumenfi.vercel.app` (build ผ่าน, แก้ 3 รอบ)
- 🐛 พบ 404 ที่ root URL — แก้ middleware matcher (จะ deploy ใหม่)
- ❌ ลองแก้ 6+ รอบ (matcher, localePrefix='always', config redirects, app/page.tsx, force-dynamic) — ยัง 404
- ✅ **Plan B: ลบ Vercel project แล้วสร้างใหม่** → ทำงานทันที! (project state เก่า corrupt)
- 🎉 **Live: https://lumenfi.vercel.app/th** — Phase 0-2 จบสมบูรณ์
- ✅ **Long autonomous build session** — Phase 3 (Transactions) + Phase 4 (Dashboard real data) + Phase 5 (Debts) + Phase 6 (Goals) + Phase 7 (AI BYO key) + /more navigation + Settings + Categories
- ✅ Auth gate ใน `(app)/layout.tsx` (server component)
- ✅ AES-GCM encryption สำหรับ AI API keys
- 📌 **Next session:** Photo upload, AI chat UI + streaming, Edit forms, Phase 8 Investments, Phase 11 PWA
