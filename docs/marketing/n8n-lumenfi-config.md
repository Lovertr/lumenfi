# 🔧 n8n Auto-post Config — Lumenfi

คู่มือแปลง n8n workflows ของ Horakom → Lumenfi (ตาม pattern ที่โคลนไปให้ Catha Coffee สำเร็จมาแล้ว)

**อ่านคู่กับ:** `HANDOFF-AUTOPOST-SYSTEM.md` — เอกสารต้นทางที่อธิบายว่าระบบทำอะไรบ้าง

---

## 🌅 Morning Checklist — พร้อม Activate MVP (~15 นาที)

**✅ สิ่งที่ผมสร้างไว้แล้ว (ตอน 03/07 กลางดึก):**

| # | ทำอะไร | สถานะ |
|---|---|---|
| 1 | Supabase migration 34 (adjustments) | ✅ user รันแล้ว |
| 2 | Supabase migration 35 (marketing_posts) | ✅ user รันแล้ว |
| 3 | Vercel env: FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID + N8N_WEBHOOK_SECRET | ✅ user set แล้ว |
| 4 | Lumenfi webhook receiver + admin UI + stats cron | ✅ deployed |
| 5 | n8n MVP workflow **"Lumenfi — MVP Auto-post Daily"** | ✅ **ID: `1tGkVRxO4eR5ASs8`** — draft (ยังไม่ active) |

**🔨 ที่ต้องทำ 3 ขั้นตอนตอนเช้า:**

### ขั้น 1: สร้าง n8n Credential "FB Lumenfi Page Token" (2 นาที)
1. เปิด n8n → Credentials → **+ Create new credential**
2. เลือก type: **Query Auth** (ไม่ใช่ Header Auth)
3. Credential Name: `FB Lumenfi Page Token` (ต้องตรงตัว — MVP workflow reference ชื่อนี้)
4. Fields:
   - **Name**: `access_token`
   - **Value**: `<FB_PAGE_ACCESS_TOKEN ที่ set ใน Vercel — ก๊อปมาใส่>`
5. Save

### ขั้น 2: เพิ่ม n8n Variable "LUMENFI_WEBHOOK_SECRET" (1 นาที)
1. n8n → Settings → **Variables**
2. + Add Variable
   - Key: `LUMENFI_WEBHOOK_SECRET`
   - Value: `<N8N_WEBHOOK_SECRET ที่ set ใน Vercel — ก๊อปมาใส่>`
3. Save

### ขั้น 3: Test + Activate (5 นาที)
1. เปิด workflow: https://horakomapp.app.n8n.cloud/workflow/1tGkVRxO4eR5ASs8
2. ตรวจ node **"Post to Facebook"** → panel Credentials → เลือก `FB Lumenfi Page Token` (ที่เพิ่งสร้าง)
3. กด **Execute Workflow** (มุมขวาล่าง)
4. ดูผลใน canvas:
   - ✅ ทุก node เขียว → check FB Page ควรมีโพสใหม่
   - ✅ check https://lumenfi.projectostech.com/settings/admin/marketing → row ใหม่โผล่มา
   - ❌ ถ้าล้มที่ Gemini node → เช็ค Google Gemini credential
   - ❌ ถ้าล้มที่ FB node → เช็ค FB token + Page ID
5. ถ้าโอเค → toggle **Active** มุมขวาบน (จะรันทุกวัน 12:30 UTC = 19:30 BKK)

**เสร็จ! MVP ก็จะรันเองทุกวัน + Lumenfi log ทุกครั้ง + FB stats poll ทุก 04:00 UTC**

---

## 🚧 Phase B/C (ทำครั้งหน้าเมื่อมีคุณ input)

- **Phase B (Image posts)** — ต้องรู้ Google Drive folder ID สำหรับเก็บภาพ + confirm Gemini Image API quota
- **Phase C (Video Reel)** — clone จาก `LqjpUCAq5uMwNj2w` (Daily AUTO Video Reel) — ต้อง swap avatar + voice + Lumenfi tone
- **Weekly Report** — adapt จาก `blOGJDUgCv5priA0` (Weekly Marketing Report) — ส่ง KPI ผ่าน email/LINE

---

## 0. Prereq — ทำก่อนเริ่ม

1. รัน migration ใน Supabase SQL Editor:
   - `supabase/migrations/34_account_balance_adjustments.sql` (ถ้ายังไม่รัน)
   - `supabase/migrations/35_marketing_posts.sql`
2. ตั้ง env ใน Vercel (Production + Preview):
   - `FB_PAGE_ACCESS_TOKEN` = Long-lived page access token
   - `FB_PAGE_ID` = `153033261562809`
   - `N8N_WEBHOOK_SECRET` = สุ่มมา 32 chars (แชร์กับ n8n node ทุกตัวที่เรียก webhook)
3. Verify webhook endpoint พร้อม:
   ```bash
   curl -X POST https://lumenfi.projectostech.com/api/webhooks/n8n-marketing \
     -H 'Content-Type: application/json' \
     -d '{"secret":"<N8N_WEBHOOK_SECRET>","status":"published","message":"test","external_post_id":"999"}'
   ```
   ควรได้ `{"ok":true,"action":"inserted","id":"..."}`

---

## 1. Config swap สำหรับ Lumenfi

### FB credentials
| Field | ค่า |
|---|---|
| Page ID | `153033261562809` |
| Page Access Token | ตั้งใน n8n Credential ชื่อ `FB Lumenfi Page` |
| Webhook URL | `https://lumenfi.projectostech.com/api/webhooks/n8n-marketing` |
| Webhook Secret | (จาก N8N_WEBHOOK_SECRET) ส่งใน body `secret` |

### Google Sheet ใหม่
สร้าง Google Sheet ชื่อ **"PostQueue-Lumenfi"** — ก๊อปโครงจาก Horakom PostQueue ทั้ง 4 tab:

**Tab 1: Queue**
| คอลัมน์ | ตัวอย่าง |
|---|---|
| `post_id` | `LUM-2026-06-26-001` (auto gen) |
| `pillar` | `education` / `use_case` / `demo` / `engagement` / `promo` |
| `marketing_pillar` | `signup` / `pro_trial` / `referral` / `agent` |
| `topic` | "DTI คืออะไร" |
| `caption` | (WF2 fill) |
| `hashtags` | `["การเงินส่วนบุคคล","ปลดหนี้"]` |
| `image_prompt` | (WF2 fill) |
| `media_url` | (WF3 fill) |
| `publish_status` | idea → caption → image_ready → published → failed |
| `facebook_post_id` | (WF5 fill) |
| `content_status` | สถานะไหลใน pipeline |
| `scheduled_at` | ISO datetime |
| `created_at` | ISO datetime |

**Tab 2: Pillars** (config content pillar)
```
pillar_key       | weight | prompt_theme
education        | 40     | สอนการเงินคนไทย — DTI, RMF/SSF, Emergency Fund, ดอกเบี้ยทบต้น, ภาษี
use_case         | 25     | Persona ที่ใช้ Lumenfi (TRIN/AOM/PAT) with before/after
demo             | 20     | Product feature demo (AI Advisor, Debt planner, Investment tracker)
engagement       | 10     | Q&A / poll ที่กระตุ้นให้ comment
promo            | 5      | Year-end tax hook, Pro trial, referral
```

**Tab 3: Marketing** (config CTA)
```
marketing_key    | link                                                | comment_template
signup           | https://lumenfi.projectostech.com/signup            | สมัครฟรีที่ลิงก์นี้ครับ ⬇️ %URL%
pro_trial        | https://lumenfi.projectostech.com/pricing           | ลอง Pro 14 วัน — ไม่ต้องใช้บัตรเครดิต ⬇️ %URL%
referral         | https://lumenfi.projectostech.com/settings/referral | ทั้งคุณ + เพื่อน ได้ Pro 30 วัน ⬇️ %URL%
agent            | https://lumenfi.projectostech.com/agents            | สนใจใช้งานแบบตัวแทน — สมัครที่นี่ ⬇️ %URL%
```

**Tab 4: BestTime** (WF7 update)
```
day_of_week | time_slot | avg_reach
monday      | 19:30     | 245
...
```

---

## 2. AI Prompts (แทน prompt ของ Horakom)

### WF1 — Daily Idea Picker
**System prompt:**
```
คุณเป็นนักการตลาดของ Lumenfi (แอพการเงินส่วนตัวสำหรับคนไทย)
เว็บ: lumenfi.projectostech.com
Tone: warm, practical, ไทยเป็นหลัก, ไม่ hype

หน้าที่: สร้าง 1 idea สำหรับ Facebook post ที่ Lumenfi จะโพสในวันนี้

Content pillar ที่ให้มา: {pillar}
Marketing pillar: {marketing_pillar}
วัน/เวลา: {now}

Output JSON:
{
  "topic": "หัวข้อสั้น ๆ ประโยคเดียว",
  "angle": "มุมที่จะเล่า",
  "target_audience": "who cares",
  "hook_ideas": ["hook 1", "hook 2", "hook 3"]
}

Guardrails:
❌ ห้าม guarantee return / คำแนะนำหุ้นตัวใด / ทำนายอนาคตแบบ absolute
❌ ห้าม medical/legal advice
❌ ห้ามพูดว่า "ฟรี ไม่มีค่าใช้จ่าย" — Pro มีค่า ฿149/เดือน
✅ ผลตอบแทนต้องระบุว่า "ไม่มี guarantee" ถ้าพูดเรื่องลงทุน
```

### WF2 — Caption Writer
**System prompt:**
```
สร้าง Facebook caption ให้ Lumenfi (แอพการเงินคนไทย)
Input: topic + angle + hook_ideas จาก WF1

กฎการเขียน:
- Hook บรรทัดแรก 1-2 บรรทัด — สร้าง curiosity หรือ pattern interrupt
- Body 3-7 บรรทัด — สาระที่ทำได้จริง มีตัวเลข/ตัวอย่าง
- Soft CTA ไม่ยัดขาย
- ไม่ใส่ลิงก์ในแคปชั่น (comment ใส่แทน — engagement boost)
- Hashtag 3-5 อัน ภาษาไทย

Output JSON:
{
  "caption": "full text",
  "image_prompt": "prompt สำหรับ Gemini image gen — Thai infographic style, warm colors, minimal, Lumenfi brand (gold + dark)",
  "hashtags": ["tag1", "tag2", ...]
}

Guardrails: (same as WF1)
```

### WF3 — Image Generation
**Model:** Gemini 2.5 Flash Image
**Prompt template:**
```
{image_prompt}

Style constraints:
- 1080x1080 (Facebook square)
- Warm gold accent (#C8A951) + deep navy (#0A1628)
- Minimal, editorial, magazine-quality
- Thai text acceptable but limit to 1 headline + 1 stat
- No stock photo faces
```

### Reel — Script Writer (Claude Sonnet)
**System prompt:**
```
คุณเป็น script writer ให้ Lumenfi (แอพการเงินคนไทย)
สร้าง script สำหรับ HeyGen avatar (ผู้หญิงวัย 25-30, voice ไทย)
ความยาว 30-45 วินาที (~90-120 คำ)

Structure:
- Hook 3 วิ (pattern interrupt / curiosity)
- Body 15-25 วิ (สาระ + ตัวเลข + insight)
- CTA 5-7 วิ (ไปที่ Lumenfi — soft, ไม่กดขาย)

Guardrails (สำคัญมาก):
❌ ห้าม guarantee return / คำแนะนำหุ้นตัวใด
❌ ห้ามพูดว่า "รวย 100%" หรือ "หายจน"
❌ ห้ามคำแนะนำแพทย์/กฎหมาย
✅ ผลตอบแทนต้องระบุว่า "ไม่มี guarantee"

Output JSON:
{
  "script": "spoken text — สั้น ๆ ประโยคๆ พูดเป็นธรรมชาติ",
  "hook_text_overlay": "text ขนาด 6 คำ ให้ HeyGen แสดงหน้าคลิป",
  "caption": "FB Reels caption 100-200 คำ",
  "comment_link_template": "CTA พร้อมลิงก์ Lumenfi",
  "tone": "friendly | urgent | curious | inspiring"
}
```

---

## 3. Webhook payload — n8n → Lumenfi

**Endpoint:** `POST https://lumenfi.projectostech.com/api/webhooks/n8n-marketing`

**Header:** `Content-Type: application/json`

**Body (WF5 หลังโพสสำเร็จ):**
```json
{
  "secret": "<N8N_WEBHOOK_SECRET>",
  "status": "published",
  "platform": "facebook_page",
  "message": "<caption จาก sheet>",
  "media_type": "image",
  "media_urls": ["<Google Drive image URL>"],
  "external_post_id": "153033261562809_1064016609286287",
  "scheduled_at": "2026-06-26T12:00:00Z",
  "published_at": "2026-06-26T12:00:15Z",
  "content_pillar": "education",
  "hashtags": ["การเงินส่วนบุคคล", "ปลดหนี้"],
  "ai_generated": true,
  "ai_prompt": "<image_prompt จาก WF2>",
  "n8n_execution_id": "<n8n exec id>"
}
```

**Body (Reel หลังโพสสำเร็จ):**
```json
{
  "secret": "<N8N_WEBHOOK_SECRET>",
  "status": "published",
  "platform": "facebook_reels",
  "message": "<caption>",
  "media_type": "reel",
  "media_urls": ["<HeyGen video URL>"],
  "video_title": "AI Advisor 30 วิ",
  "external_post_id": "<Reels id>",
  "content_pillar": "demo",
  "ai_generated": true
}
```

**Body (failed):**
```json
{
  "secret": "<N8N_WEBHOOK_SECRET>",
  "status": "failed",
  "message": "<caption>",
  "error": "HeyGen API 429 rate limit exceeded",
  "content_pillar": "demo"
}
```

**Response:** `{"ok":true,"action":"inserted"|"updated","id":"<uuid>"}`

**Idempotent:** ถ้าส่ง external_post_id เดิมซ้ำ → update row เดิม (retry-safe)

---

## 4. HeyGen configuration

- Avatar recommendations: **female 25-30, Thai** — ทดสอบดู 3-5 avatars ก่อนจ่ายเงิน สายฟรี
- Voice: **TH female neutral**
- Sample script: ใน `docs/marketing/FACEBOOK_PAGE_POSTS.md` เอา demo posts มาปรับเป็น script 30 วิ
- Cost warning: HeyGen ใช้ credit ต่อ minute — ตั้ง MAX 30 วิ/คลิป กันงบ

---

## 5. Best Time schedule (สำหรับ Lumenfi audience)

จาก playbook (Facebook-first edition):

| Day | Time (BKK) | Post type |
|---|---|---|
| จั