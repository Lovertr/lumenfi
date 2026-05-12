# Email Setup · Lumenfi

แก้ปัญหา signup confirmation email เข้า spam + ดูไม่เป็นมืออาชีพ
ด้วยการตั้ง **Resend SMTP** + **custom HTML templates**

---

## 📊 สถานะปัจจุบัน

ตอนนี้ Supabase ส่งอีเมลจาก `noreply@mail.app.supabase.io` ด้วย template default
ปัญหา:
- โดน Gmail/Outlook กรองเข้า **Spam folder**
- ไม่มีโลโก้ Lumenfi · ดูเป็นอีเมล system ทั่วไป
- Rate-limited มาก (3 emails/hour สำหรับ Free plan)

---

## 🎯 เป้าหมาย

หลังตั้งค่าเสร็จ:
- ✅ ส่งจาก `noreply@lumenfi.projectostech.com` (Lumenfi domain จริง)
- ✅ Deliverability สูง — DKIM/SPF/DMARC ผ่าน → เข้า inbox ไม่ใช่ spam
- ✅ HTML template ใหม่ — สีดำทอง Aurum Quietus + โลโก้ Lumenfi + ปุ่ม CTA สีทอง
- ✅ Rate limit สูง — Resend free plan ได้ 3,000 emails/month, 100/day

---

## 🔧 ขั้นตอน (10-15 นาที)

### Step 1 · สร้าง Resend account (3 นาที)

1. ไป https://resend.com → **Sign up** (ใช้อีเมล Gmail/Outlook ก็ได้)
2. Verify อีเมล
3. ใน Resend Dashboard → **API Keys** → **Create API Key**
   - Name: `lumenfi-supabase-smtp`
   - Permission: **Sending access**
   - Save the key — ขึ้นต้นด้วย `re_...` (โผล่ครั้งเดียว!)

### Step 2 · Verify domain (5-10 นาที)

1. Resend Dashboard → **Domains** → **Add Domain**
2. ใส่ `lumenfi.projectostech.com` หรือ subdomain เช่น `mail.lumenfi.projectostech.com`
3. Resend จะให้ **DNS records 3 ชุด** (TXT + MX + DKIM)
4. ไปที่ DNS provider ของ `projectostech.com` (Cloudflare / Namecheap / etc.)
5. เพิ่ม records ทั้ง 3 ชุด — copy-paste ตรงๆ
6. กลับไป Resend → กด **Verify DNS records**
   - DKIM ใช้ ~5 นาทีถึงผ่าน
   - SPF/DMARC ใช้ ~2-5 นาที
7. รอจน status เป็น ✅ **Verified**

> 💡 ถ้าใช้ Vercel host domain ของคุณ:
> Vercel Dashboard → Domains → DNS Records → Add

### Step 3 · Configure Supabase SMTP (2 นาที)

1. Supabase Dashboard → **Project Settings** → **Authentication** → **Email**
2. Scroll ลงไปที่ **SMTP Settings** → toggle **Enable Custom SMTP** เป็น ON
3. กรอก:
   ```
   Host:              smtp.resend.com
   Port:              465  (หรือ 587)
   User:              resend
   Password:          re_xxxxxxxxxxxx  (Resend API key จาก Step 1)
   Sender name:       Lumenfi
   Sender email:      noreply@lumenfi.projectostech.com
                      (หรือใช้ subdomain เช่น noreply@mail.lumenfi.projectostech.com)
   ```
4. กด **Save**

### Step 4 · ทดสอบ SMTP (1 นาที)

1. Supabase Dashboard → Authentication → Users → กดอีเมลทดสอบ → **Send magic link**
2. เช็คอีเมล — ควรจะมาใน **Inbox** ใน 30 วินาที (ไม่ใช่ spam)
3. ถ้ายังเข้า spam → รอ 30 นาที (ให้ DKIM cache propagate) แล้วลองใหม่

### Step 5 · ใส่ HTML templates สวยๆ (3 นาที)

Supabase Dashboard → Authentication → **Email Templates**

มี 4 templates ใน folder `docs/email-templates/` ของ repo:

| Template | ใส่ที่ตำแหน่ง |
|---|---|
| `confirm-signup.html` | **Confirm signup** |
| `magic-link.html` | **Magic Link** |
| `reset-password.html` | **Reset Password** |
| `email-change.html` | **Change Email Address** |

วิธีใส่:
1. เลือก template ที่ต้องการแก้ใน Dashboard
2. Copy ข้อมูล HTML ทั้งหมดจากไฟล์ใน repo
3. Paste แทนที่ HTML body เดิม
4. **Subject** แนะนำตั้งเป็น:
   - Confirm signup → `ยืนยันอีเมลของคุณ · Lumenfi`
   - Magic Link → `🔑 ลิงก์เข้าใช้งาน Lumenfi`
   - Reset Password → `🔐 ตั้งรหัสผ่านใหม่ · Lumenfi`
   - Change Email → `📧 ยืนยันการเปลี่ยนอีเมล · Lumenfi`
5. กด **Save**

> 💡 Template ใช้ตัวแปร `{{ .ConfirmationURL }}` ของ Supabase
> ห้ามแก้ส่วนนี้ — Supabase replace อัตโนมัติเมื่อส่ง

### Step 6 · Smoke test end-to-end (1 นาที)

1. เปิด incognito → /signup → สมัครด้วยอีเมลทดสอบของคุณ
2. เช็คกล่องจดหมาย — ควรมีอีเมล "ยืนยันอีเมลของคุณ · Lumenfi" สีดำทอง
3. กดปุ่ม **"ยืนยันอีเมลและเริ่มใช้งาน"** → redirect เข้า /dashboard

---

## 🐛 Troubleshooting

**อีเมลยังเข้า spam:**
- รอ DKIM cache propagate (~30 นาที-2 ชั่วโมง)
- เช็คว่า DNS verified ✅ ใน Resend
- ลองส่งอีเมลธรรมดาผ่าน Resend API ก่อน — ถ้าผ่าน → Supabase config ผิด

**อีเมลไม่มา:**
- เช็ค Resend Dashboard → **Emails** → ดู log ว่าส่งไปแล้วไหม
- ดู Supabase Dashboard → **Logs** → **Auth logs** → หา SMTP error
- เช็ค port: 465 (SSL) หรือ 587 (STARTTLS) ลองสลับ

**ปุ่ม CTA ไม่กดได้:**
- เช็คว่า `Site URL` ใน Supabase Dashboard → Auth → URL Configuration
  ตั้งเป็น `https://lumenfi.projectostech.com` (ไม่ใช่ http:// หรือ localhost)
- **Redirect URLs** ต้องมี `https://lumenfi.projectostech.com/auth/callback`

**HTML แสดงผิดใน Gmail:**
- Gmail clip อีเมล > 102KB — ตรวจสอบ template ไม่ใหญ่เกิน
- Gmail strip `<style>` tag — ของเราใช้ inline CSS ทุกที่อยู่แล้ว ✅

---

## 💰 ค่าใช้จ่าย

**Resend Free tier:**
- 3,000 emails/month
- 100 emails/day
- พอสำหรับ traffic ทั่วไป ของ early-stage app

**ถ้าเกิน:** 
- Pro $20/month → 50,000 emails/month + 99.99% deliverability SLA
- Scale $80/month → 500,000 emails/month

---

## 📦 Templates ที่มีในโฟลเดอร์นี้

```
docs/email-templates/
├── SETUP.md            ← ไฟล์นี้
├── confirm-signup.html ← Subject: ยืนยันอีเมลของคุณ · Lumenfi
├── magic-link.html     ← Subject: 🔑 ลิงก์เข้าใช้งาน Lumenfi
├── reset-password.html ← Subject: 🔐 ตั้งรหัสผ่านใหม่ · Lumenfi
└── email-change.html   ← Subject: 📧 ยืนยันการเปลี่ยนอีเมล · Lumenfi
```

ทุก template ใช้:
- Aurum Quietus brand (navy #0F172A + gold #C9A45A)
- Inline CSS (compatibility กับ Gmail/Outlook/Apple Mail)
- Table-based layout (ทุก mail client รองรับ)
- Hosted logo: `https://lumenfi.projectostech.com/icon-192.png`
- ปุ่ม CTA สีทอง + fallback link ใต้ปุ่ม
- Security disclaimer ด้านล่าง
