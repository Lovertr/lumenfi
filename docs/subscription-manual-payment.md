# 💳 Manual Payment Flow — PromptPay QR + Admin Approval

**Status:** Planning
**Owner:** tintanee.t@gmail.com
**Reason:** Omise merchant application rejected → use manual approval flow while alternative gateway (Stripe/2C2P) is being applied for

---

## 🎯 User Journey

```
1. ผู้ใช้เลือกแพ็คเกจ
   ↓
2. หน้าชำระเงิน — แสดง:
   - รายละเอียดแพ็คเกจ + ราคา
   - PromptPay QR code (มี ref เฉพาะ order)
   - Upload slip UI
   ↓
3. ผู้ใช้โอนเงินตาม QR → อัพโหลด slip
   ↓
4. ระบบส่งแจ้งเตือนแอดมิน (email + push):
   - รายละเอียด order
   - ยอดเงิน
   - รูป slip
   ↓
5. แอดมินตรวจสอบ:
   ✅ ยืนยัน → activate package + แจ้ง user (email + push)
   ❌ ปฏิเสธ → แจ้ง user + เหตุผล (email + push)
```

---

## 📦 Package options

TBD (ต้อง user confirm):

| Package | Price | Duration | Feature |
|---|---|---|---|
| Pro 1 เดือน | ฿149 | 30 วัน | Full AI + unlimited posts |
| Pro 1 ปี | ฿1,490 (10 เดือน) | 365 วัน | Save 2 เดือน |
| Pro ตลอดชีพ | ฿4,990 (?) | ∞ | Founder tier |

---

## 🗄️ Database schema

### New migration `36_manual_payment.sql`

**Table: `subscription_orders`**
```sql
CREATE TABLE subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_ref TEXT UNIQUE NOT NULL,  -- e.g. LMN-20260704-A1B2
  package_key TEXT NOT NULL,        -- 'pro_1m', 'pro_1y', 'lifetime'
  amount_baht INTEGER NOT NULL,     -- 149, 1490, 4990
  duration_days INTEGER NOT NULL,   -- 30, 365, 36500
  slip_url TEXT,                    -- Supabase Storage URL
  slip_uploaded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_upload',
    -- pending_upload | pending_review | approved | rejected | expired
  admin_notes TEXT,                 -- reason for rejection
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,           -- pro_expires_at ตอน activated
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON subscription_orders(user_id);
CREATE INDEX ON subscription_orders(status);
CREATE INDEX ON subscription_orders(order_ref);
```

### RLS Policies
- User เห็นเฉพาะ orders ของตัวเอง
- User สร้าง order ของตัวเอง + upload slip ของตัวเอง
- Admin เห็น + approve/reject ทุก order

### Supabase Storage bucket: `subscription-slips`
- Public read = false
- Upload requires auth
- Signed URLs for admin view

---

## 🔌 API endpoints

| Method | Path | Purpose | Auth |
|---|---|---|---|
| POST | `/api/subscription/order/create` | User สร้าง order → return QR + order_ref | User |
| POST | `/api/subscription/order/upload-slip` | User upload slip image | User |
| GET | `/api/subscription/order/[id]` | User ดู status order ตัวเอง | User |
| GET | `/api/admin/subscription/orders` | Admin list pending orders | Admin |
| POST | `/api/admin/subscription/orders/[id]/approve` | Admin ยืนยัน + activate | Admin |
| POST | `/api/admin/subscription/orders/[id]/reject` | Admin ปฏิเสธ + reason | Admin |
| POST | `/api/cron/expire-old-orders` | Cron: mark orders > 24h as expired | Cron |

---

## 🖼️ Frontend pages

### User side
- `/pricing` — เลือกแพ็คเกจ (existing? update)
- `/subscription/checkout/[packageKey]` — สร้าง order → redirect ไป payment
- `/subscription/payment/[orderId]` — แสดง QR + upload slip
- `/subscription/status/[orderId]` — ดู status (pending/approved/rejected)
- `/settings/subscription` — history ของ orders

### Admin side
- `/settings/admin/subscription-orders` — queue orders ที่รอ approve
- แต่ละ order card:
  - User info (email, name)
  - Package + amount
  - Slip image (คลิกซูมได้)
  - Approve button (green)
  - Reject button + reason input (red)

---

## 🔔 Notifications

### To Admin (when user uploads slip)
- **Email** via Resend → tintanee.t@gmail.com
  - Subject: `💰 New Lumenfi payment — ฿149 from user@email`
  - Body: order details + slip URL + admin approval link
- **Push** (existing web push infra?)

### To User (state changes)
- **On approved**:
  - Email: `✅ Lumenfi Pro activated — expires 2026-08-04`
  - Push: same
- **On rejected**:
  - Email: `❌ Payment verification failed — reason: <admin_notes>`
  - Push: same + link to re-upload

---

## 🎨 PromptPay QR generation

**Standard:** EMVCo QR (Bank of Thailand spec)

**Libraries:**
- `promptpay-qr` (npm) — most popular, generates spec-compliant PromptPay QR
- Or use `qrcode` + build EMV payload manually

**Payload includes:**
- Merchant PromptPay ID (phone number or citizen ID) — from env `LUMENFI_PROMPTPAY_ID`
- Amount (locked amount so user can't change)
- Optional reference (order_ref) for reconciliation

---

## 🤖 (Optional) Slip auto-verify with Slip2Go

**Pre-approval check** ก่อนแอดมินเห็น:
- ยิง slip image ไป Slip2Go API → decode QR ของ slip
- เช็ค:
  - ✅ amount ตรง? (฿149 == amount_baht?)
  - ✅ recipient ตรง? (Lumenfi PromptPay ID?)
  - ✅ วันที่ล่าสุด (< 24 ชม.)?
- ถ้าผ่านหมด → mark `slip_auto_verified: true` → highlight ในหน้า admin ว่า "auto-passed"
- ถ้าไม่ผ่าน → highlight ว่า "amount mismatch" หรือ "wrong recipient"

**Benefit:** ประหยัดเวลาแอดมิน + ป้องกัน slip ปลอม/ยอดไม่ตรง

**Setup cost:** ต่ำมาก — Lumenfi มี Slip2Go credential ใน n8n อยู่แล้ว → ก๊อป API key มาใส่ Vercel env

---

## 📅 Implementation phases

### Phase 1 (MVP — 2-3 ชม.)
- [ ] Migration 36_manual_payment.sql
- [ ] Supabase Storage bucket + RLS
- [ ] API: create-order, upload-slip, get-order
- [ ] User pages: checkout + payment + status
- [ ] Admin page: approval queue
- [ ] API: admin approve/reject
- [ ] Email notifications (Resend)

### Phase 2 (Auto-verify + polish — 1-2 ชม.)
- [ ] Slip2Go integration (auto pre-check)
- [ ] Push notifications
- [ ] Order history page
- [ ] Cron: expire old orders (>24h)

### Phase 3 (later)
- [ ] Multi-package support (yearly, lifetime)
- [ ] Refund flow (admin can refund + rollback)
- [ ] Auto-renewal reminder email 3 days before expiry
- [ ] Referral commission (ผู้แนะนำได้เดือนฟรี)

---

## ❓ ต้อง confirm ก่อนเริ่ม Phase 1

1. **PromptPay ID สำหรับรับเงิน** — เบอร์โทร หรือเลขบัตรประชาชน?
2. **Packages ที่จะเปิดขาย** — Pro 149/เดือน เท่านั้น หรือมี yearly ด้วย?
3. **Admin** — แค่ tintanee.t@gmail.com หรือมีคนอื่น?
4. **Notification เสริม** — LINE OA พร้อมส่งไหม? หรือแค่ email + web push?
5. **Auto-verify Slip2Go** — ทำใน Phase 1 เลย หรือ Phase 2?
