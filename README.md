# 💰 Finance App

แอปบริหารการเงินส่วนตัวครบวงจร — รายรับ-รายจ่าย หนี้สิน การลงทุน เป้าหมาย พร้อม AI Advisor (BYO API key)

**Mobile-first PWA** — ใช้บนมือถือเป็นหลัก แต่รองรับเดสก์ท็อปด้วย

---

## 📚 เอกสารหลัก (อ่านลำดับนี้)

1. **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** ← เริ่มที่นี่ทุกครั้งที่กลับมาทำต่อ (master tracker)
2. **[FEATURES.md](./FEATURES.md)** — รายละเอียดฟีเจอร์ทั้งหมด
3. **[DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql)** — Supabase schema
4. **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** — วิธี setup ตั้งแต่ 0

---

## 🚀 Quick Start

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. คัดลอก env file แล้วเติมค่า Supabase
cp .env.example .env.local
# แก้ค่าใน .env.local

# 3. รันแบบ local
npm run dev
```

เปิด http://localhost:3000

---

## 🛠️ Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui (mobile-first)
- **Supabase** — PostgreSQL + Auth + Storage
- **Vercel** — Hosting
- **N8N** — Background automation (recurring tx, OCR, reminders)
- **Recharts** — Charts
- **Zustand** — State management

---

## 📂 Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── (auth)/          # Login, Signup
│   ├── (app)/           # Protected (dashboard, transactions, etc.)
│   ├── layout.tsx
│   └── page.tsx         # Landing
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Bottom nav, headers
│   ├── charts/          # Chart components
│   └── forms/           # Forms
├── lib/
│   ├── supabase/        # Supabase clients
│   ├── ai/              # AI provider abstraction
│   ├── calculations/    # Finance formulas
│   └── utils.ts
├── hooks/
├── types/
└── stores/              # Zustand stores
```

---

## 🔑 Key Features

| Feature | Status | Phase |
|---------|--------|-------|
| Landing page | ✅ Done | 0 |
| Dashboard skeleton | ✅ Done | 0 |
| Bottom navigation | ✅ Done | 0 |
| Auth (login/signup) | ⏳ Next | 1 |
| Accounts CRUD | ⏳ | 2 |
| Transactions CRUD | ⏳ | 3 |
| Receipt photos | ⏳ | 3 |
| Net Worth dashboard | ⏳ | 4 |
| Debt management | ⏳ | 5 |
| Goals | ⏳ | 6 |
| AI Advisor | ⏳ | 7 |
| Investments | ⏳ | 8 |
| N8N automation | ⏳ | 9 |
| Reports + Calculators | ⏳ | 10 |
| PWA install | ⏳ | 11 |

ดู `PROJECT_PLAN.md` สำหรับรายละเอียดเต็ม

---

## 🤝 Continuing Work in a New Session

เมื่อกลับมาทำต่อในเซสชันใหม่ บอก Claude ว่า:

> "เปิด `C:\Users\trin_\Projects\finance-app\PROJECT_PLAN.md` แล้วทำ Phase ถัดไป"

Claude จะเปิดเอกสาร เห็นว่าทำถึงไหน แล้วทำต่อได้เลย

---

## 📝 License

MIT — for personal use
