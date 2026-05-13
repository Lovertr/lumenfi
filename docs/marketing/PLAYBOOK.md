# 📣 Lumenfi Marketing Playbook — Facebook-First Edition

**Updated:** 13 พฤษภาคม 2026 · เน้น **Facebook Page เป็นหลัก** (70%), **TikTok เป็นรอง** (30%), งบ **฿0 organic-only**

**เพจ:** https://www.facebook.com/lumenfi/

> 💡 **NotebookLM workflow:** ดู section "การใช้ NotebookLM" ด้านล่าง — ใช้ knowledge base ของ Lumenfi (`docs/lumenfi-knowledge-base.txt`, 1,382 บรรทัด) ช่วย generate post ideas, FAQ, talking points แบบ on-brand 100%

---

## 🎯 Brand Positioning

**Tagline หลัก:** "Light up your finances"
**Tagline ไทย:** "ส่องสว่างทุกการเงินของคุณ"

**Value Prop:**
> Lumenfi คือแอพการเงินที่มี AI วิเคราะห์ครบทุกมิติ — รายรับรายจ่าย หนี้ ลงทุน ภาษี ประกัน เกษียณ — ไม่ต้องเปิดหลายแอพ ไม่ต้องคำนวณเอง ไม่ต้องจ้างที่ปรึกษา

**Target Personas (เรียงตามความสำคัญสำหรับ FB):**
1. 👨‍👩‍👧 **Working Parent 30-45** — ใช้ FB บ่อย ผ่อนบ้าน ส่งลูกเรียน ผ่อนรถ
2. 👨‍💻 **SWE/Office Worker 28-38** — เริ่มจริงจังการเงิน วางแผนเก็บบ้าน/ลงทุน
3. 👴 **Pre-retirement 45-60** — เวลา FB สูง วางแผนเกษียณ ดูแลพ่อแม่

**Why Facebook works for Lumenfi:**
- กลุ่มเป้าหมายอายุ 30+ ยังใช้ FB เป็นหลัก
- FB Groups การเงิน/หนี้/ลงทุน มีคน active หลายแสน
- Post แบบยาวเล่าเรื่อง = ตรง personal finance
- Sharing + tagging เพื่อน drives organic reach
- ไม่ต้องอัดวิดีโอเหมือน TikTok/Reels — content cost ต่ำ

---

## 🤖 การใช้ NotebookLM ช่วยสร้าง Content

**Setup ครั้งเดียว:**
1. เข้า https://notebooklm.google.com
2. กด "Create new notebook" ตั้งชื่อ "Lumenfi Marketing"
3. Upload source: `docs/lumenfi-knowledge-base.txt` (1,382 บรรทัด — ครอบคลุม identity, features, pricing, FAQs, edge cases ทั้งหมด)
4. Upload เพิ่ม (optional): `docs/marketing/PLAYBOOK.md` (ไฟล์นี้) + `docs/marketing/FACEBOOK_PAGE_POSTS.md`

**Workflows ที่ใช้บ่อย (copy-paste prompt ได้):**

### A) Generate post ideas ตาม pillar
```
ช่วยสร้าง 10 หัวข้อ Facebook post pillar "Education" สำหรับ Lumenfi
- กลุ่มเป้าหมาย: Working parent อายุ 30-45 ในไทย
- ความยาว 200-400 คำ
- มี hook บรรทัดแรกที่น่าสนใจ
- จบด้วย CTA ไปยัง lumenfi.app
- อิงจากความสามารถจริงของ Lumenfi (ห้ามคิดฟีเจอร์ขึ้นเอง)
```

### B) Draft post จากหัวข้อ
```
ช่วยเขียน Facebook post 1 ครั้ง หัวข้อ "DTI คืออะไร ทำไม 36% ขึ้นไปอันตราย"
- ใช้ tone ของ Lumenfi (warm, practical, ไทยเป็นหลัก)
- มี hook + body + CTA
- อ้างฟีเจอร์จริงของ Lumenfi ที่ช่วยคำนวณ DTI ได้
- ใส่ hashtag 3-5 อัน
- จบด้วยลิงก์ lumenfi.app
```

### C) สร้าง FAQ จาก objection ที่เคยได้ยิน
```
ช่วยตอบคำถามที่ user มักถามเกี่ยวกับ Lumenfi เป็น FAQ format
ใช้เนื้อหาจาก knowledge base + tone friendly:
1. ฟรีจริงไหม? Pro ฿149/เดือนได้อะไรเพิ่ม?
2. ข้อมูลปลอดภัยไหม? เก็บไว้ที่ไหน?
3. ต่างจาก Money Lover / 1Money / Excel ยังไง?
4. iOS Safari ใช้ได้ไหม?
5. AI ใช้ key ของใคร?
```

### D) สร้าง comparison content
```
ช่วยสร้าง comparison table:
"Lumenfi vs Money Lover vs Excel"
- เปรียบเทียบ 8 มิติ: tracking / debt / investment / tax / insurance / AI / privacy / cost
- ใช้เนื้อหาจริงจาก Lumenfi knowledge base
- จัด format ให้เหมาะลง FB post (markdown table หรือ text bullets)
```

### E) Repurpose blog → social
```
ช่วย convert บทความ Lumenfi ในหัวข้อ "RMF vs SSF" ให้เป็น:
1. Facebook post 250 คำ
2. TikTok script 30 วินาที (hook + body + CTA)
3. FB Story 3 frames (poll/quiz format)
4. Carousel 5 slides (caption แต่ละ slide)
```

### F) Find content gaps จาก knowledge base
```
อ่าน knowledge base ของ Lumenfi แล้วบอกว่ามีฟีเจอร์/feature อะไรที่ยัง
ไม่เคยพูดถึงในไฟล์ FACEBOOK_PAGE_POSTS.md เลย — ฟีเจอร์ที่ underrated และ
ควรเอามาเป็น post ใหม่ — เรียงลำดับความน่าสนใจสำหรับ FB audience
```

### G) Generate Reels script จาก post ที่ดี
```
จาก Facebook post นี้ [paste post] ช่วยแปลงเป็น TikTok/Reels script
- ความยาว 30 วินาที
- มี hook 3 วินาทีแรกแบบ pattern interrupt
- มี text overlay timing
- เสนอ shot list (talking head / screenshot / animation)
```

**Pro tip:** ทุกครั้งที่ NotebookLM ตอบ ให้กด "Show in source" ดูว่าอิงจาก knowledge base ข้อไหน — เผื่อ AI hallucinate ฟีเจอร์ที่ไม่มีจริง

---

## 📊 30-Day Facebook-First Launch Plan

### Week 1: Foundation + 5 Hero Posts
**Goal:** ตั้งเพจสมบูรณ์ + 5 โพสต์แรก + เริ่มเข้า FB Groups เพื่อ observe

- [ ] **Day 1:** Page setup ครบ — Cover, About, CTA button (link lumenfi.app), pinned post
- [ ] **Day 1:** Post #1 (Launch Story) + share จาก profile ส่วนตัว
- [ ] **Day 2:** ใช้ NotebookLM generate 14-day content calendar (workflow A)
- [ ] **Day 3:** Post #2 (Before/After persona AOM)
- [ ] **Day 4:** Join 15 FB Groups (ดูรายชื่อด้านล่าง) — observe + comment เป็นประโยชน์ 7 วัน ห้ามโพสต์โปรโมท
- [ ] **Day 5:** Post #3 (Education: DTI คืออะไร — ใช้ NotebookLM workflow B)
- [ ] **Day 6:** Post #4 (Use case: หนี้บัตรเครดิตปลดยังไง)
- [ ] **Day 7:** Post #5 (Quick tip + screenshot Lumenfi)

### Week 2: Cadence + Engagement
**Goal:** โพสต์ 5 ครั้ง/สัปดาห์ + เริ่มแชร์ใน Groups อย่างมีกลยุทธ์

- [ ] **โพสต์ทุกวันจันทร์-ศุกร์** เวลา 19:30-20:30 (peak engagement)
- [ ] **Reels 1 คลิป/สัปดาห์** — reuse จาก post ผ่าน NotebookLM workflow E/G
- [ ] **FB Story 3-4 ครั้ง/สัปดาห์** — behind-the-scenes, polls, tips
- [ ] **เข้า Groups** — comment เป็นประโยชน์ 5 ครั้ง/วัน
- [ ] **แชร์ใน 3 Groups/สัปดาห์** — ที่อนุญาต value-add post

### Week 3: Optimize + Scale
**Goal:** วิเคราะห์โพสต์ไหน work เพิ่ม content type นั้น

- [ ] เช็ค Page Insights — โพสต์ reach/engagement/link clicks สูงสุด
- [ ] ใช้ NotebookLM workflow F หา content gap ที่ยังไม่ครอบคลุม
- [ ] เพิ่ม content type ที่ work × 2
- [ ] FB Live ครั้งแรก — Q&A 30 นาที
- [ ] เริ่ม cross-post Reels ไป TikTok

### Week 4: Community Building
**Goal:** สร้าง community Lumenfi loyal

- [ ] เปิด FB Group ของ Lumenfi เอง — "ชุมชน Lumenfi · คุยเรื่องการเงิน"
- [ ] ทำ pinned post + เปิดให้ user share progress
- [ ] เริ่ม weekly series (#จันทร์ออม #พฤหัสภาษี)
- [ ] ProductHunt launch + cross-promote ใน FB

---

## 📅 Posting Cadence (FB Page + TikTok)

| Day | FB Page | FB Story | FB Groups | TikTok |
|-----|---------|----------|-----------|--------|
| จันทร์ | 1 post (Education) | 1 (poll) | 1 share | 1 Reel (reuse) |
| อังคาร | 1 post (Use case) | — | 1 share | — |
| พุธ | 1 post (Demo) | 1 (tip) | — | 1 Reel (reuse) |
| พฤหัส | 1 post (Education) | — | 1 share | — |
| ศุกร์ | 1 post (Story) | 1 (behind-the-scenes) | — | 1 Reel (reuse) |
| เสาร์ | 1 post (Q&A/poll) | 1 | — | — |
| อาทิตย์ | rest หรือ FB Live | — | — | — |

**Total:** 6 FB posts + 4 Stories + 3 Group shares + 3 TikTok = ~16 touchpoints/สัปดาห์
**Time:** ~5-6 ชม./สัปดาห์ (Sunday batch + NotebookLM ช่วย draft)

---

## 🧱 Content Pillars (Facebook-Specific)

### Pillar 1: 💡 Education (40%) — สอน, สร้าง authority
**Format:** Text post 200-400 คำ + 1 รูป (Canva)
**Goal:** Save + Share (organic reach)

**ตัวอย่างหัวข้อ:**
- "DTI คืออะไร — ทำไม 36% ขึ้นไปเริ่มอันตราย"
- "เงินเดือน ฿30K vs ฿60K ออมเท่าไหร่ถึงพอ"
- "Emergency Fund ที่ทุกคนพูดถึง — ต้องเก็บกี่เดือน"
- "RMF กับ SSF ต่างกันยังไง"
- "ดอกเบี้ยทบต้นแรงแค่ไหน"

### Pillar 2: 🎯 Use Case Story (25%) — relatable, emotional
**Format:** Long-form 5-10 บรรทัด + รูป persona/before-after

**ตัวอย่าง:**
- "TRIN 32 ปี ออม 50% ของรายได้"
- "คุณ AOM ปลดหนี้ ฿380K ใน 18 เดือน"
- "คุณ PAT ผ่อนบ้านแล้วยังลงทุน DCA ได้ยังไง"
- "ลูกค้าจ่ายดอกบัตร ฿35K/ปีโดยไม่รู้ตัว"

### Pillar 3: 🎬 Product Demo (20%) — แสดงของจริง
**Format:** Screenshot/short video + caption explain feature

**ตัวอย่าง:**
- "30 วินาที AI Advisor วิเคราะห์ครบ 8 มิติ"
- "หน้าจอเดียวเห็นหนี้ทั้งหมดและแผนปลด"
- "อัปโหลด slip เดียว AI ลงให้ทุกอย่าง"
- "Net Worth chart รายเดือนย้อนหลัง"

### Pillar 4: 💬 Q&A / Poll / Engagement (10%)
**Format:** สั้น ตั้งคำถาม → กระตุ้น comment

**ตัวอย่าง:**
- "เงินเดือนแรกของคุณจำได้ไหม?"
- "ของที่อยากเลิกซื้อแต่เลิกไม่ได้?"
- "บัตรเครดิตของคุณกี่ใบ?"
- "ได้โบนัส ฿100K วันนี้ จะทำอะไรก่อน?"

### Pillar 5: 🎁 Promo / CTA (5%)
**Format:** ตรงประเด็น + แสดง offer

**ใช้น้อย — เก็บไว้ตอน:**
- Year-end (ตุลาคม-ธันวาคม) — RMF/SSF
- ขึ้นเดือนใหม่
- ProductHunt launch
- Black Friday

**กฎ:** ห้าม promo ติดต่อกัน — เว้นอย่างน้อย 4 organic posts ระหว่าง promo

---

## 🏘️ FB Groups Distribution Strategy

### Target Groups (เริ่ม join 15 กลุ่ม):

**การเงินทั่วไป:**
1. การเงิน 101
2. ออมเงิน · ลงทุน · มือใหม่
3. Money Tips ไทย
4. การเงินส่วนบุคคล

**หนี้:**
5. เลิกหนี้ ปลดหนี้ คุยกันตรงนี้
6. หนี้บัตรเครดิต ปรึกษากันได้
7. Debt-free ชีวิตไร้หนี้

**ลงทุน:**
8. DCA ลงทุนแบบสบายๆ
9. RMF SSF ลดภาษี
10. Index Fund Thailand
11. มือใหม่หัดลงทุน

**อาชีพ:**
12. Freelance Thailand
13. Programmer Thailand / Tech Worker
14. พ่อแม่ยุคใหม่
15. Pre-retirement / 40+

### กลยุทธ์เข้า Groups (ห้ามรีบโพสต์โปรโมท!)

**Phase 1 (Day 1-7) — Observe + Build trust:**
- Join + read กฎกลุ่มทุกข้อ
- Like + comment สั้น ๆ เป็นประโยชน์ 3-5 ครั้ง/วัน
- ❌ ห้ามแชร์ link Lumenfi
- จดประเด็นที่คนถามบ่อย → จะเป็น content

**Phase 2 (Day 8-14) — Add Value:**
- ตอบคำถามคนอื่นด้วย expertise (เช่น "DTI คำนวณจาก...")
- ลงคำตอบละเอียด ไม่ใส่ link Lumenfi
- ถ้าจำเป็น mention "ผมใช้แอพการเงินตัวนึง" ไม่ใส่ชื่อ

**Phase 3 (Day 15+) — Soft Promote:**
- ถ้าคนถาม "ใช้แอพไหน" → ตอบได้
- ลงโพสต์ value-add (guide step-by-step) + จบด้วย "ผมทำ tool ฟรี ลองได้ที่ lumenfi.app"
- ไม่เกิน 1 self-promote post/กลุ่ม/สัปดาห์

**กฎเหล็ก:**
- ❌ ห้าม copy-paste post เดียวกันลงหลายกลุ่ม (algorithm shadow ban)
- ❌ ห้ามโปรโมทวันแรก ๆ ที่ join
- ✅ Customize ให้เข้ากับ tone ของแต่ละกลุ่ม (NotebookLM ช่วยได้)
- ✅ Comment ก่อน post — สร้าง credibility

---

## 📱 Facebook Page Tactics

### Page Setup Checklist
- [ ] **Profile pic:** Logo gradient L (1080×1080)
- [ ] **Cover:** Aurum Quietus L cover (1640×924)
- [ ] **Username:** `@lumenfi` ✓
- [ ] **Category:** Finance + App Page
- [ ] **About:** Tagline + value prop + ลิงก์ lumenfi.app
- [ ] **CTA button:** "Use App" → lumenfi.app
- [ ] **Pinned post:** Launch story
- [ ] **Tabs:** Posts/Reels/About/Reviews ON; ปิด Shop/Services

### Posting Best Practices

**Hook Engineering (บรรทัดแรก สำคัญ 80%):**
- ❌ "Lumenfi คือแอพการเงิน..."
- ✅ "ผมเคยจ่ายดอกบัตรเครดิตปีละ ฿35,000 โดยไม่รู้ตัว"
- ✅ "อายุ 35 แล้วยังไม่มีเงินเก็บ — เริ่มยังไง"
- ✅ "RMF vs SSF ใครซื้อตัวไหนผิดที่สุด"

**Sweet spot ความยาว:**
- Education: 200-400 คำ (3-7 ย่อหน้า)
- Use case: 5-10 บรรทัด
- Demo: 2-4 บรรทัด + รูป
- Q&A: 1-2 บรรทัด

**รูปประกอบ:**
- Canva preset 1080×1080 (square — optimal FB display)
- หรือ 1080×1350 (portrait — กินพื้นที่ feed)
- ใส่ Lumenfi watermark มุม
- สี brand: ทอง #C8A951 + ดำ #0A0A0A หรือขาว #FAFAF7

**Hashtags:**
- 3-5 ภาษาไทย (ห้ามเกิน 7)
- ตัวอย่าง: #การเงินส่วนบุคคล #ออมเงิน #ปลดหนี้ #ภาษี #ลงทุน

**CTA สุดท้าย:**
- บอกชัดเจน ใช้ 👉 หรือ ⬇️ ก่อน link
- ใส่ "ลองฟรี" / "ไม่ต้องใส่บัตรเครดิต" ลดแรงต้าน

### เวลาโพสต์
- **Peak:** 19:30-20:30 (หลังกินข้าวเย็น)
- **Backup:** 12:00-13:00 (พักเที่ยง)
- **อาทิตย์:** 21:00-22:00 (เตรียมตัวสัปดาห์)
- ❌ ตี 2-7

### Reels (FB) — สำคัญ!
FB ดัน Reels หนัก ๆ — organic reach 3-5 เท่าของ static post

**Format:**
- 9:16 (1080×1920), 15-30 วินาที
- มี captions ฝังในวิดีโอ (85% ปิดเสียง)
- Hook 3 วินาทีแรก

**Content reuse via NotebookLM workflow G:**
- Education post → Reels (อ่านโพสต์ + รูป animate)
- Demo → screen recording + voice over
- Use case → talking head + screenshot

### FB Stories — Daily presence
- 1-2 stories/วัน
- Format: poll, quiz, behind-the-scenes, tip, link sticker
- ใช้ "@everyone" mention — push notification ถึง follower ทั้งหมด (limit 1/วัน)

### FB Live (Week 3+)
- 30-45 นาที
- Q&A 1 ครั้ง/2 สัปดาห์
- หัวข้อชัด: "Q&A หนี้บัตรเครดิต" / "ปลายปีลดภาษียังไง"
- โปรโมท 3 วันก่อน + บันทึก reuse เป็น Reels

---

## 🎬 TikTok — Secondary Channel (30%)

### Strategy: Reuse FB Content
ใช้ NotebookLM workflow G แปลง FB post เป็น TikTok script

**Format:**
- 9:16 (1080×1920), 15-30 วินาที
- มี caption ในวิดีโอ
- Trending sound ถ้าเข้ากับ tone

**Content type:**
1. Talking head + screenshot (60%)
2. Screen recording walkthrough (30%)
3. Text-only animated tip (10%)

### Hooks ที่ work บน TikTok
- "หยุดออมเงินตอนนี้ ถ้ายังไม่ทำ 3 อย่างนี้"
- "AI วิเคราะห์การเงิน 30 วินาที — น่าตกใจ"
- "พลาดเงินคืน ฿15K/ปี โดยไม่รู้ตัว"
- "DTI 50% = หนี้กินรายได้ครึ่ง"

**Cadence:** 3 คลิป/สัปดาห์ (จันทร์-พุธ-ศุกร์) cross-post ไป FB Reels

**Hashtag:** #การเงินส่วนบุคคล #ออมเงิน #ปลดหนี้ #fintech #Lumenfi

---

## 📊 KPIs / Metrics (Monthly Review)

### Tier 1: Vanity (ดูประกอบ)
- FB Page followers
- Reach total
- Avg post engagement

### Tier 2: Real signal
- **Link clicks → lumenfi.app**
- **Signups attribution** (`utm_source=facebook`)
- **% engagement rate** — engagement/reach > 5% = good
- **Group share reach**

### Tier 3: Business
- **Signups/เดือน** จาก FB → target 100/เดือนภายในเดือนที่ 2
- **Pro upgrade** → target 5/เดือนภายในเดือนที่ 3
- **Revenue** → ฿745/เดือน ภายในเดือนที่ 3
- **Long-term:** 500 signups/เดือน, 25 Pro/เดือน = ฿3,725/เดือน ภายในเดือนที่ 6

### Setup tracking (UTM)
1. FB Page CTA: `lumenfi.app?utm_source=facebook&utm_medium=page`
2. FB Group: `lumenfi.app?utm_source=facebook&utm_medium=group&utm_campaign=<group>`
3. TikTok bio: `lumenfi.app?utm_source=tiktok&utm_medium=bio`
4. เช็ค Vercel Analytics → Source → Facebook %

---

## 📝 14-Day Content Calendar

| Day | Pillar | Topic | Format |
|-----|--------|-------|--------|
| 1 Mon | Launch | "ทำไมผมสร้าง Lumenfi" — founder story | Text + cover |
| 2 Tue | Use case | "AOM ปลดหนี้ ฿380K ใน 18 เดือน" | Long + before/after |
| 3 Wed | Education | "DTI คืออะไร ทำไม 36%+ อันตราย" | Text + infographic |
| 4 Thu | Demo | "AI วิเคราะห์ครบ 8 มิติใน 30 วินาที" | Screen recording 30s |
| 5 Fri | Engagement | "เงินเดือนแรกของคุณกี่บาท?" | Short Q&A |
| 6 Sat | Use case | "TRIN 32 ปี ออม 50%" | Long + screenshot |
| 7 Sun | — | rest หรือ FB Live | — |
| 8 Mon | Education | "Emergency Fund — เก็บกี่เดือน" | Text + infographic |
| 9 Tue | Demo | "ลงรายจ่ายด้วย slip ใน 5 วิ" | Receipt scanner clip |
| 10 Wed | Education | "RMF vs SSF ต่างกันยังไง" | Comparison table |
| 11 Thu | Use case | "คุณ PAT ผ่อนบ้าน + DCA" | Long + screenshot |
| 12 Fri | Demo | "Net Worth chart" | Snapshot screenshot |
| 13 Sat | Engagement | "บัตรเครดิตของคุณกี่ใบ?" | Poll |
| 14 Sun | — | rest | — |

**Day 15+:** ดู Insights → เลือก format ที่ work → ใช้ NotebookLM workflow A generate ต่อ

---

## 🚀 ProductHunt Launch (Week 4)

**Goal:** ใช้ FB community push PH ranking → 200+ signups วันเดียว

**Pre-launch (Week 3):**
- DM 50 FB followers แรก ขอ support วัน launch
- Post teaser 3 วันก่อน
- เตรียม PH listing สมบูรณ์ (gif demo, screenshots, taglines)

**Launch day:**
- FB Post #1 (07:00 BKK) — "Lumenfi launch on Product Hunt"
- FB Story ทุก 2 ชม. — countdown, ranking
- FB Group share (3 safe groups)
- TikTok 1 คลิป

**Target:** Top 5 of the day → 500+ signups burst

---

## 💡 Tactical Hacks (Free, Organic)

1. **"@everyone" ใน FB Story** — push notification ถึง follower ทั้งหมด (1/วัน)
2. **Edit post หลังโพสต์ 30 นาที** — algorithm boost ครั้งที่ 2
3. **ตอบ comment ภายใน 1 ชม.** — เพิ่ม reach 2-3 เท่า
4. **Ask ตอนท้าย post** ("คุณคิดยังไง?") — drives comment
5. **แชร์ใน profile ส่วนตัว** ทุก post — ขยาย 1st-degree reach
6. **Tag 1-2 คนใน comment** — ที่จะ engage แน่
7. **Comment ในเพจการเงินใหญ่** — drive profile views
8. **"Save" button ใน CTA** — Save = positive signal
9. **Repost top post ทุก 30 วัน** — recycle
10. **คุยกับ admin Group ก่อน promote** — ขออนุญาตเลย

---

## 🎨 Asset Inventory (พร้อมใช้)

### Logo + Branding
- `public/icons/logo-final.svg` — Aurum Quietus L
- `public/icons/icon-512.png` — profile pic
- Facebook cover (`public/marketing/`)

### Screenshots
- `public/marketing/dashboard.png`
- `public/marketing/cashflow.png`
- `public/marketing/debt-plan.png`
- `public/marketing/budget.png`
- `public/marketing/investment.png`
- `public/marketing/networth-chart.png`
- `public/marketing/advisor-home.png`
- `public/marketing/health-report.png`
- `public/marketing/insurance-gap.png`
- `public/marketing/add-transaction.png`
- `public/marketing/dashboard-notify.png`

### Demo Accounts
- TRIN (ออม 50%) — `/settings/admin/seed-demo`
- AOM (ปลดหนี้) — `/settings/admin/seed-demo`
- PAT (ผ่อนบ้าน + DCA) — `/settings/admin/seed-demo`

### Canva Templates ที่ต้องทำ
- [ ] Square post (1080×1080)
- [ ] Portrait post (1080×1350)
- [ ] Story (1080×1920)
- [ ] Before/After comparison
- [ ] Infographic (DTI, RMF/SSF, etc.)
- [ ] Quote card

### Knowledge Base for NotebookLM
- `docs/lumenfi-knowledge-base.txt` — **1,382 บรรทัด** ครอบคลุม identity, features, pricing, FAQs, edge cases — upload ไป NotebookLM ใช้ generate content

---

## 📋 Sample Posts

**Ready-to-copy-paste:** `docs/marketing/FACEBOOK_PAGE_POSTS.md` (7 โพสต์เก่า + จะเพิ่มอีก 14 ตาม calendar ข้างบน — ใช้ NotebookLM workflow B generate ทีละโพสต์)

---

## ❓ FAQ ก่อนเริ่ม

**Q: โพสต์แล้ว reach 0 ทำไง?**
A: ปกติช่วงแรก FB ทดสอบ audience — 1-2 อาทิตย์แรก reach อาจต่ำ แก้โดยแชร์ผ่าน profile + tag คนรู้จัก 2-3 คน

**Q: ห้ามใส่ link ในโพสต์ FB?**
A: ไม่ห้าม แต่ FB deprioritize external link — วิธีแก้: ใส่ link ใน comment แรกแทน หรือใส่ในโพสต์ก็ได้ — reach อาจตก 20-30%

**Q: เริ่ม FB Reels ดีไหม?**
A: ดีมาก! FB ดัน Reels — reach 3-5 เท่า static — ทำ 1-2 คลิป/สัปดาห์ reuse จาก post

**Q: ไม่อยากแสดงหน้ากล้อง?**
A: ได้ — text-only post + screen recording ก็ work

**Q: เริ่ม FB Group เอง?**
A: รอสัก 4-6 สัปดาห์ ให้ Page มี follower 500+ ก่อน

**Q: โพสต์ติดเงียบไม่มี engagement?**
A: ลอง 3 อย่าง: (1) เปลี่ยน hook, (2) เปลี่ยนเวลาโพสต์, (3) ใส่คำถามตอนจบ

---

## 🎯 Success Metrics — 90 Days

| Month | FB Followers | Signups | Pro | Revenue |
|-------|-------------|---------|-----|---------|
| Month 1 | 500 | 50 | 1 | ฿149 |
| Month 2 | 1,500 | 150 | 5 | ฿745 |
| Month 3 | 3,500 | 300 | 15 | ฿2,235 |
| Month 6 | 10,000 | 600/mo | 30/mo | ฿4,470/mo |

**Break-even (cover Claude Cowork ฿6,000):**
- ต้องการ 40 Pro subscribers
- ~Month 4-5

---

## 🔗 Resources

- **PLAYBOOK (this):** `docs/marketing/PLAYBOOK.md`
- **Ready posts:** `docs/marketing/FACEBOOK_PAGE_POSTS.md`
- **Design philosophy:** `docs/marketing/design-philosophy.md`
- **Screenshots:** `public/marketing/`
- **Knowledge base (NotebookLM):** `docs/lumenfi-knowledge-base.txt`
- **Facebook Page:** https://www.facebook.com/lumenfi/
- **NotebookLM:** https://notebooklm.google.com

---

*Last updated: 13 พฤษภาคม 2026 — Facebook-first edition. Review monthly.*
