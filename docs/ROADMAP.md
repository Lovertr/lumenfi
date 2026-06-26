# Lumenfi — Roadmap

Living document tracking what's done, what's queued, and what's parked.

Last updated: 26 June 2026

---

## ✅ Shipped (May 2026)

### Core money management
- Transactions, accounts, categories, budgets
- Recurring transactions + push notifications
- Receipt OCR (Thai bank slips)

### Investments
- Holdings tracker (Thai stocks, US stocks, mutual funds, ETFs, crypto, gold, bonds, REITs)
- Tax-saving funds tracker (RMF/SSF/PVD) with year-end deadlines
- DCA recurring scheduler
- Yahoo Finance auto-prices + FX rates
- Capital gains report (yearly tax export)
- Asset allocation + rebalance suggestions
- Watchlist + alerts

### Debts (full lifecycle)
- Add/edit debts with rate types (fixed, fixed-then-floating, promo)
- Avalanche / Snowball payoff plans
- **ชำระหนี้ flow**: link transaction → debt, auto-split principal/interest, decrement balance
- **ปรับยอด**: manual balance adjustment with audit log
- **Payment history timeline**: 3 summary tiles + event timeline
- **Credit card installments**: convert credit card purchase to debt with N-month plan
- DTI ratio tracking

### Goals
- Goal-linked transactions auto-update progress
- Goal ↔ account linking (Emergency Fund auto-tracks)
- Forecast: when each goal will be hit at current pace

### Insurance
- Gap analysis (life, health, CI, accident)
- Policy tracker
- Quote-request lead form (BLA agent affiliate)
- Tax↔insurance linkage in tax tool

### AI Advisor
- 8 domains: comprehensive, debt, investment, tax, retirement, goals, insurance, emergency
- AI Chat with full financial snapshot context
- AI Secretary — proactive notifications via cron (budget alerts, bill reminders, goal milestones)
- Tier-based model selection (Gemini Flash for free, Claude Haiku for Pro)

### Reports
- 8-dimension comprehensive analysis with score 0-100 per dimension
- Top recommendations sorted by priority × severity

### Notifications
- In-app bell + drawer + log page
- Web push (VAPID)
- Daily/weekly cron triggers

### Pricing & Billing
- 3 tiers: Free / PAYG / Pro
- 14-day Pro trial (no credit card required)
- Annual ฿1,490 (saves ฿298/yr) — emphasized in pricing UI
- Omise checkout (card + PromptPay)
- Webhook handling
- AI gateway with quota enforcement

### Onboarding
- 5-step wizard (welcome → profile → income/expense → account → goal)
- Profile breakdown fields (income/expense splits, occupation, employment, risk tolerance)
- Onboarding chat history snapshots

### Marketing & Brand
- 7 demo personas with before/after stories + 90-day net worth charts
- Marketing playbook (TikTok/FB/Twitter scripts ready to copy-paste)
- Aurum Quietus brand identity (gold gradient L on dark)
- Facebook Cover + Profile Picture (museum-quality PNG)
- Updated PWA icons (favicon-16, 32, apple-touch, 192, 512, maskable)

### Privacy & Compliance
- Data export (PDPA)
- Email delete on account removal
- Encrypted AI API keys (AES-GCM)
- RLS on every user-scoped table

### Referral (NEW — May 10)
- 6-char unique code per user
- Share link (`?ref=CODE`)
- Both referrer + referred get +30 days Pro
- `/settings/referral` page with stats + claim form

---

## ✅ Shipped (Jun 2026 — late month sprint)

### Notifications — daily reminder pipeline fixed end-to-end
- Test push button + diagnostic checklist on `/settings/reminder`
- Admin-only "⚡ ยิงตอนนี้" manually invokes `/api/cron/notify` and shows HTTP status + JSON
- Centralized notification toggle on `/settings/reminder` (was duplicated on `/recurring`)
- Auto-resubscribe `pushsubscriptionchange` handler in sw.js
- **Critical bug fix**: `/api/cron/notify` had an early-return guard that skipped the daily reminder / budget / watchlist / secretary sections when no recurring tx was due
- Supabase pg_cron `setup-hourly-notify.sql` + admin diagnostic generates the SQL with `CRON_SECRET` pre-filled
- HTTPS auto-prepend for `NEXT_PUBLIC_APP_URL` when admin sets it without scheme

### Debt strategy & advisor flow
- Debt plan AI accepts pay-cycle data first, falls back to monthly avg
- Returns 1-3 plan options as structured JSON (strategy/extra/months/interest/steps/pros/cons/recommended)
- Plan picker UI with "เลือกแผนนี้" per card
- Dedicated `/tools/debt/plans/[id]` detail page + history list with delete
- Objection feedback loop — user submits constraints, AI refines plan
- Hardened against suggesting "หยุดจ่าย" (legal risk → NCB/lawsuits); standardised to "โปะเพิ่ม"
- AI gateway `chat()` accepts `maxTokens` to prevent Thai-text truncation (was 8192 hardcoded; debt advisor uses 16000)
- 2-decimal min payment + default value bug fixes

### Settings page cleanup
- Removed redundant referral tile (sidebar entry already exists)
- Hidden Agent Dashboard tile once user is already an agent
- Thai date picker (วัน/เดือน/ปี พ.ศ.) replacing native `<input type=date>`
- "Set up AI Key" spotlight hidden for Pro/PAYG subscribers
- Marketing playbook rewritten **Facebook-first organic-only** edition + NotebookLM workflow with 7 copy-paste prompts

### Account balance accuracy
- Migration 34 — `account_balance_adjustments` (mirror of debt adjustments) + `debts.is_cash_advance` flag
- Cutoff removed from `computeAccountBalances` so backdated tx count
- **Phase 1**: "⚖️ ปรับยอด" modal on `/accounts/[id]` + history card (previous → new → delta + effective_date + reason)
- Snapshot semantics — latest adjustment is the starting balance; cutoff compares `adj.created_at` vs `tx.created_at`
- `Math.abs()` on liability balances both client + server — fixes user entering "-24990" because UI displayed it in red
- **Phase 2**: Cash advance auto-create debt on transfer FROM credit card → bank — choose installment (months + rate) or revolving
- Dashboard + cashflow now propagate adjustments to balance compute (was missing — caused "เงินใช้ได้ ฿83K" vs ฿43K mismatch)
- i18n: added `Accounts.balance` (ยอดเงิน / Balance) — was rendering raw key "ACCOUNTS.BALANCE"

### Cross-account data tooling
- One-time SQL script `supabase/one-time/copy-user-data.sql` — clones all user data from one auth user to another with FK remapping via `information_schema` introspection (skips debts per use case)
- Handled composite-PK tables (`portfolio_snapshots`), split CTE into two EXECUTE statements so INSERT can see the mapping rows
- Cleaned up tracked `Key.txt` (3 secrets stored plain-text) — gitignored + flagged for rotation (Resend / CRON_SECRET / GitHub PAT)

---

## 🚀 Next 30 days

### Revenue-critical
- [ ] **Sentry monitoring** — catch errors users hit silently (~30 min)
- [ ] **Trial conversion email** — Day 5 + Day 12 + Day 14 reminders
- [ ] **Pricing A/B test** — try ฿199 vs ฿149 to find optimum
- [ ] **First-week retention nudge** — push at day 3 if no transaction recorded
- [ ] **Bank slip OCR improvements** — KBank/SCB/BBL line slip auto-extract account

### Quality of life
- [ ] **CSV import** — for users migrating from Money Lover / Excel
- [ ] **Bulk transaction edit** — multi-select + delete/categorize
- [ ] **Joint Budget mode** — couples managing finances together
- [ ] **Tax form export** — ภ.ง.ด. 90 / 91 ready to file
- [ ] **2FA TOTP** — security upgrade

---

## 🔮 Tier 2 (after 500+ active users)

### Affiliate revenue (passive income channels)
- [ ] **Bank account opening** — KKP/TTB/UOB high-yield savings (฿150-300/account)
- [ ] **Brokerage opening** — KGI/Phillip/Bualuang (฿500-1,000/account)
- [ ] **Insurance leads beyond BLA** — AIA, Allianz, Krungthai-AXA
- [ ] **Mortgage refi** — Lumenfi connects users to refi brokers (commission share)

### Power user features
- [ ] **Bank API sync** — Krungthai/KBank/SCB Open Banking
- [ ] **Crypto exchange sync** — Bitkub auto-import
- [ ] **Brokerage sync** — SET/KGI auto-positions
- [ ] **Multi-currency** — for Thai expats/travelers
- [ ] **Custom AI prompts** — for power users
- [ ] **Webhooks API** — for IFTTT/Zapier-style integrations

---

## 🛠️ Technical debt

- [ ] Migration runner: `npm run db:migrate` against production
- [ ] Background-job reliability monitoring
- [ ] Performance: server component caching audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Mobile responsive review (320px viewport edge cases)

---

## 📊 KPI targets

| Window | Target |
|---|---|
| Week 1 | 50 signups, 10 first-week retention |
| Week 4 | 500 signups, 50 paying (Pro), MRR ฿4,500 |
| Month 3 | 2,000 signups, 200 Pro, MRR ฿25,000 |
| Month 6 | 5,000 signups, 500 Pro, MRR ฿65,000 |

---

## 📝 Operating principles

1. **Revenue-critical first** — always.
2. **Thai-first** — design for Thai users; English is secondary.
3. **AI is the moat** — keep advisor quality + freshness ahead of competitors.
4. **Privacy by default** — no third-party trackers, encrypted at rest.
5. **Ship daily** — no feature stays in WIP > 3 days.
