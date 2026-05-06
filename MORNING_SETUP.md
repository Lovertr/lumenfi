# 🌅 Morning Setup — สิ่งที่ต้องทำเมื่อตื่นมา

ทำตามขั้นตอนพวกนี้ ใช้เวลาประมาณ 10–15 นาที

## ✅ ขั้นตอน 1: Apply Migrations (5 นาที)

มี migration ใหม่ 3 ไฟล์ที่ยังไม่ได้ apply:

1. `09_onboarding_chat_history_snapshots.sql` (ทำแล้วถ้าตามขั้นก่อน)
2. `10_insurance_and_help.sql` (ทำแล้วถ้าตามขั้นก่อน)
3. `11_help_articles_seed.sql` ⚠️ **อันใหม่ ยังไม่ได้ทำ**

**วิธี apply** — เปิด Supabase SQL Editor → New query → paste เนื้อในของไฟล์ `11_help_articles_seed.sql` → Run

หรือใช้ migration runner:
```bash
git pull
npm run db:migrate
```

## ✅ ขั้นตอน 2: ใส่ ENV Variables ใน Vercel (5 นาที)

ไป **Vercel Dashboard → Lumenfi project → Settings → Environment Variables**

เพิ่มตัวแปรต่อไปนี้ (Production):

### สำหรับ Insurance Lead (ส่ง email แจ้ง)
```
RESEND_API_KEY=re_...        # สมัครฟรี resend.com (3,000 emails/เดือน)
RESEND_FROM_EMAIL=Lumenfi <onboarding@resend.dev>   # ใช้ default ก่อนได้
AGENT_NOTIFY_EMAIL=tintanee.t@gmail.com
```

### ข้อมูลตัวแทน (แสดงในแอพ)
```
NEXT_PUBLIC_AGENT_NAME=ทินทนี (BLA) + คุณภรรยา (Allianz)
NEXT_PUBLIC_BLA_LICENSE=000000      # เลขที่ใบอนุญาตของคุณ
NEXT_PUBLIC_ALLIANZ_LICENSE=000000  # เลขที่ใบอนุญาตภรรยา
NEXT_PUBLIC_AGENT_CONTACT=tintanee.t@gmail.com
```

### Net Worth Snapshot Cron (optional)
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # จาก Supabase Settings → API
CRON_SECRET=<random-string>          # generate: openssl rand -hex 32
```

หลังเพิ่ม env แล้ว **Redeploy** (Vercel Dashboard → Deployments → ล่าสุด → Redeploy)

## ✅ ขั้นตอน 3: ทดสอบฟีเจอร์ใหม่ (5 นาที)

เปิด `https://lumenfi.vercel.app` แล้วเช็คว่าทุกอย่างใช้ได้:

- [ ] **Onboarding** — login ครั้งแรกด้วย account ใหม่ → เจอ wizard 4 ขั้น
- [ ] **Net Worth Chart** — Dashboard → ควรเห็นกราฟ (ต้องใช้แอพ 2 วันขึ้นไปจึงจะมีจุดข้อมูล)
- [ ] **AI Chat History** — /ai → คุยกับ AI → กลับมา /ai ใหม่ → ต้องเห็น thread ที่ผ่านมา
- [ ] **Insurance Gap Analyzer** — /insurance → ควรเห็นการวิเคราะห์ + คะแนนวิกฤต/ควรพิจารณา
- [ ] **Quote Request** — กดปุ่มขอใบเสนอ → กรอกฟอร์ม → ส่ง → ลีดควรขึ้นในตาราง insurance_leads (เช็คใน Supabase Table Editor)
- [ ] **Help Center + AI Bot** — /help → เห็น 12 บทความ + ลองถาม AI
- [ ] **Insurance Tax CTA** — /tools/tax → ใส่รายได้ → ต้องเห็น card "ประหยัดภาษีได้ ฿X"
- [ ] **Investments Edit** — /investments → คลิกที่ holding → ไปหน้า edit
- [ ] **Forgot Password** — /login → "ลืมรหัสผ่าน?" → ส่งอีเมล → ลิงก์ใน email พา reset
- [ ] **Privacy** — /settings/privacy → ดาวน์โหลด JSON ได้

## 📋 สรุปฟีเจอร์ใหม่ที่ Deploy คืนนี้

| Commit | ฟีเจอร์ |
|---|---|
| `af17c1f` | Forgot password + Onboarding wizard + PDPA privacy |
| `1495d33` | Migration 09 ใช้ schema เดิม |
| `fbbb66f` | DB migration runner script |
| `3a1b586` | Insurance Gap Analyzer + Quote + Policies |
| `a36c700` | Help Center + AI Bot + 12 articles |
| `a1be25a` | Net worth chart + AI conversation history |
| `b5bf745` | Investments edit + Yahoo prices + FX rates |
| `a6a7818` | Tax↔Insurance + Budget alerts + Nav |
| `380e34e` | Build fixes |

## ⚠️ สิ่งที่ต้องทำต่อ (ยังไม่เสร็จ)

- [ ] ซื้อ domain (lumenfi.app หรือ .co)
- [ ] สมัคร Resend account (ฟรี) → ใส่ API key
- [ ] ตั้ง `from email` ของ Resend ให้เป็น domain ของเรา (verify domain)
- [ ] กรอกเลขใบอนุญาตตัวแทนจริงใน env vars
- [ ] Subscription + Omise (สำหรับเก็บเงิน — ค่อยทำหลังลีดแรกเข้า)
- [ ] 2FA TOTP (security)
- [ ] Sentry (error monitoring)

## 🐛 ถ้าเจอ bug

Vercel Logs: Dashboard → Deployments → คลิก deploy → Functions tab → ดู error
Supabase Logs: Dashboard → Logs → Postgres / Edge

---

**Build แรกที่ deploy พร้อมหารายได้:** `380e34e` (6 May 2026)
