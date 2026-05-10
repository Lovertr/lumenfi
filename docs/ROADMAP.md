# Lumenfi — Roadmap

Living document tracking what's done, what's queued, and what's parked.

Last updated: May 2026

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
