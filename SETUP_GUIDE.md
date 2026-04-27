# 🚀 Setup Guide

วิธี setup โปรเจคทีละขั้น — ทำตามนี้แล้ว deploy ได้ภายใน 30 นาที

---

## Step 1: ติดตั้ง dependencies

```bash
cd C:\Users\trin_\Projects\finance-app
npm install
```

ถ้ายังไม่มี Node.js → ดาวน์โหลด Node 20 LTS จาก https://nodejs.org

---

## Step 2: สร้าง Supabase Project

1. ไป https://supabase.com → Sign in (ใช้ GitHub ก็ได้)
2. New Project
   - **Name:** `finance-app`
   - **Database password:** สร้าง strong password (เก็บไว้)
   - **Region:** Singapore (ใกล้ไทยสุด)
   - **Plan:** Free
3. รอ ~2 นาทีให้ project พร้อม
4. ไปที่ **SQL Editor** > New query → paste ทั้งไฟล์ `DATABASE_SCHEMA.sql` → Run
5. ไปที่ **Storage** > New bucket
   - Name: `receipts`
   - Public: ❌ (private)
   - Add RLS policy: paste นี้
     ```sql
     CREATE POLICY "Users can upload own receipts"
     ON storage.objects FOR INSERT
     WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

     CREATE POLICY "Users can read own receipts"
     ON storage.objects FOR SELECT
     USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

     CREATE POLICY "Users can delete own receipts"
     ON storage.objects FOR DELETE
     USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
     ```
6. ไปที่ **Authentication** > Providers
   - Enable Email (default)
   - Enable Google (optional): ทำตาม guide https://supabase.com/docs/guides/auth/social-login/auth-google
7. ไปที่ **Settings** > **API** → copy
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key (⚠️ secret!) → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3: ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
```

แก้ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# AES key สำหรับเข้ารหัส API key ของผู้ใช้ (สร้างด้วย: openssl rand -base64 32)
APP_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# N8N webhook URLs (เติมหลัง setup N8N)
N8N_WEBHOOK_RECURRING=https://your-n8n.com/webhook/recurring
N8N_WEBHOOK_OCR=https://your-n8n.com/webhook/ocr
```

---

## Step 4: ทดสอบ local

```bash
npm run dev
```

เปิด http://localhost:3000 → ควรเห็น landing page

---

## Step 5: Push ขึ้น GitHub

```bash
git init
git add .
git commit -m "Initial commit: project scaffold + plan docs"
gh repo create finance-app --private --source=. --remote=origin --push
```

(ถ้าไม่มี GitHub CLI: สร้าง repo ที่ github.com แล้ว `git remote add origin ...` + `git push -u origin main`)

---

## Step 6: Deploy บน Vercel

1. ไป https://vercel.com → Sign in with GitHub
2. **Add New Project** → import `finance-app` repo
3. Framework: Next.js (auto-detect)
4. **Environment Variables** → เพิ่มทุกตัวจาก `.env.local`
5. Deploy
6. รอ ~2 นาที → ได้ URL `finance-app-xxx.vercel.app`

หลังจากนี้ทุกครั้งที่ `git push` → Vercel deploy ให้อัตโนมัติ

---

## Step 7: ตั้งค่า N8N (สำหรับ automation)

> ทำหลังก็ได้ — ไม่ block การพัฒนาฟีเจอร์ core

### 7.1 Recurring Transactions Workflow
**Trigger:** Cron — รันทุก 6:00 น. ทุกวัน
**Steps:**
1. HTTP Request → `${SUPABASE_URL}/rest/v1/recurring_templates?next_occurrence=lte.${today}&active=eq.true`
   - Header: `apikey: ${SERVICE_ROLE_KEY}`
2. Loop over results
3. POST to `${SUPABASE_URL}/rest/v1/transactions` พร้อมข้อมูลจาก template
4. PATCH update `next_occurrence` ของ template

### 7.2 Bill Due Reminder Workflow
**Trigger:** Cron — รันทุกวัน 8:00 น.
**Steps:**
1. Query `debts` ที่ due_day = today + 3 days, today + 1 day, today
2. สร้าง notification + ส่ง email/LINE Notify

### 7.3 OCR Webhook
**Trigger:** Webhook
**Steps:**
1. รับ image URL
2. ใช้ Tesseract node หรือ Google Vision API
3. Parse: amount, date, merchant, items
4. Return JSON

### 7.4 Daily AI Digest
**Trigger:** Cron — 21:00 ทุกวัน
**Steps:**
1. Query summary ของทุก user (transactions วันนี้)
2. Call AI API (ใช้ user's key) สรุป
3. ส่ง email

---

## Step 8: เริ่มพัฒนาฟีเจอร์

อ่าน `PROJECT_PLAN.md` เพื่อดูว่าทำถึง phase ไหน → ทำ checkbox ถัดไป

แต่ละ feature ควร:
1. สร้าง branch: `git checkout -b feature/xxx`
2. เขียนโค้ด + ทดสอบ local
3. Commit → push → Vercel auto-deploy preview
4. Merge เข้า main เมื่อพร้อม

---

## 🆘 Troubleshooting

**Build fail บน Vercel:** ดู logs → มักเป็น TypeScript error หรือ missing env var
**Supabase 401:** ตรวจ RLS policies — ทุกตารางต้องมี policy สำหรับ user ตัวเอง
**Auth ไม่ทำงาน:** เช็ค redirect URL ใน Supabase > Auth > URL Configuration
**N8N ไม่เรียก:** ตรวจว่า webhook URL ใส่ถูก + Service Role key ถูก
