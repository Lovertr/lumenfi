# Lumenfi for Agents — Business Plan

> Insurance Agent Slot Marketplace บน Lumenfi
> **เวอร์ชัน:** Draft v1 · 11 พ.ค. 2569

---

## 1. Executive Summary

**สิ่งที่จะทำ:** เปิดให้ตัวแทนประกันชีวิต/วินาศภัยซื้อ "slot" ใน Lumenfi → เมื่อผู้ใช้ทั่วไป (prospects) ขอใบเสนอประกันในแอพ → ส่ง lead ไปหาตัวแทนที่ผู้ใช้ผูกอยู่ และในการ์ด "ที่ปรึกษาประกันของคุณ" แสดงข้อมูลของตัวแทนคนนั้น

**ทำไม:**
- ปัจจุบัน Lumenfi เก็บข้อมูลการเงินผู้ใช้ครบทุกมิติ (รายได้, ค่าใช้จ่าย, หนี้, เงินสำรอง, dependents) → **lead คุณภาพดีกว่า lead Facebook 10 เท่า** เพราะรู้ครบก่อนคุยแล้ว
- ตัวแทนหา lead เองยากมาก, จ่ายแพง (CPL Facebook ฿200-500/lead, conversion ~2%)
- Lumenfi เปลี่ยน user เป็น qualified prospect ฟรี → ตัวแทนยอมจ่ายเข้าระบบ

**Outcome (Year 1):** 100 ตัวแทน × ฿699/เดือน = **฿840K MRR** (≈ ฿10M ARR)

---

## 2. Current State (สิ่งที่มีอยู่)

```
ผู้ใช้ Lumenfi (Trin/lovertr คนเดียวคือตัวแทน)
   ↓ ขอใบเสนอประกัน
   ↓
quote-request-form → submitInsuranceLead()
   ↓
Email ส่งไปที่ NOTIFY_EMAIL (env var = ของ Trin)
AgentInfoCard แสดง: BLA · license 6801055107 · tintanee.t@gmail.com
```

**ปัญหา:** ผูกกับ env vars (1 ตัวแทน 1 deployment) — scale ไม่ได้

---

## 3. Target State (สิ่งที่อยากเป็น)

```
ผู้ใช้ Lumenfi → ผูกกับตัวแทน A (จาก signup code / invite link / region)
   ↓ ขอใบเสนอประกัน
   ↓
quote-request-form → submitInsuranceLead(agent_id)
   ↓
Email ส่งไปที่ตัวแทน A (เก็บใน DB ไม่ใช่ env)
AgentInfoCard แสดง: บริษัทประกันของ A · license ของ A · contact ของ A
```

**เพิ่มที่ DB:**
- `agents` table — id, company, license, license_valid_until, name, email, phone, products
- `profiles.assigned_agent_id` — ผู้ใช้แต่ละคนผูกกับตัวแทนคนไหน
- `agent_subscriptions` — agent_id, plan, status, expires_at

---

## 4. โมเดล Slot Marketplace

### 4.1 วิธีผูกผู้ใช้กับตัวแทน

| วิธี | ข้อดี | ข้อเสีย |
|---|---|---|
| **Invite link** `/i/AGENT_CODE` | ตัวแทนแชร์ลิงก์ → prospect โดน auto-tag | prospect ต้องสมัครผ่านลิงก์ |
| **Manual code** ตอน signup | ง่าย ใช้ระบบ referral ที่มีอยู่ | ต้องบอกให้กรอก |
| **Auto-assign by region** | prospect ใน กทม. → agent กทม. | ต้องมีตัวแทนทุก area + กฎจัดสรร |
| **Marketplace (เลือกเอง)** | prospect เลือก agent จาก list | ตัวแทนหน้าใหม่ไม่ได้ lead |

**แนะนำ:** ใช้ **Invite link + Manual code** (combined) — ผูกจังหวะ signup ครั้งเดียวจบ ตัวแทนจ่ายเงินแล้วได้ link ของตัวเองไปแชร์

### 4.2 Subscription Tiers

| Plan | ราคา | ฟีเจอร์ที่ได้ |
|---|---|---|
| **Trial** | ฟรี 14 วัน | รับ lead ได้ 3 คน · ลองระบบเต็ม |
| **Starter** ⭐ | **฿299/เดือน** หรือ **฿2,990/ปี** | สูงสุด 25 prospects active · branding สั้นๆ · email notify |
| **Pro** | **฿699/เดือน** หรือ **฿6,990/ปี** | ไม่จำกัด prospects · INA Report (PDF) · custom logo · LINE/SMS notify · lead dashboard |
| **Team** | **฿1,990/เดือน** หรือ **฿19,900/ปี** | สำนักงาน 5 คน · shared leads · leaderboard · performance analytics |

**Rationale:**
- Pro ฿699 = ตัวแทนปิดเดือนละ 1 deal คุ้มแน่นอน (commission เฉลี่ย ฿8,000-15,000/policy)
- Annual lock-in ลด churn (Annual discount 17% = 2 เดือนฟรี)
- Trial 14 วัน + cap 3 leads = ลองระบบจริง โดยไม่ให้ใช้ฟรียาว

### 4.3 Unit Economics (Year 1 targeted)

**สมมุติฐาน:**
- 100 paying agents (mix: 60 Starter, 35 Pro, 5 Team)
- MRR = 60×299 + 35×699 + 5×1,990 = ฿52,375
- ARR ≈ **฿629K**

**ต้นทุน (ของคุณ) ต่อเดือน:**
- Vercel: ฿1,500 (อาจขึ้น scale)
- Supabase: ฿1,000 (ฟรี-ขั้นเริ่ม)
- Resend (email): ฿1,000
- AI API: ฿3,000 (ใช้กับ Lumenfi AI advisor)
- Domain/misc: ฿500
- **รวม: ฿7,000/เดือน**

**Margin:** 86% — สุขภาพดีสำหรับ SaaS เริ่มต้น

---

## 5. Features ที่ตัวแทน "อยากจ่าย" (เพิ่มจากของเดิม)

### Tier 1 — Quick wins (ใช้ data ที่มีอยู่):

| Feature | สิ่งที่ทำ | Impact |
|---|---|---|
| 🎯 **INA Report (PDF)** | สรุปช่องว่างประกันของ prospect — Life gap, Health gap, CI gap → export PDF พร้อม branding ตัวแทน | conversation opener ที่ดีที่สุด |
| 💰 **Premium Estimator** | คำนวณเบี้ยตามอายุ-ทุน-แผน (TLT/FWD/AIA/BLA standard rates) | tool ปิด deal |
| 📊 **Tax Saving Projector** | "ซื้อ life ฿100K → ลดหย่อนเพิ่ม ฿X" — ผูกกับ tax tracker | argument ที่จับได้ทุกคน |
| 📥 **Lead Dashboard** | ดู prospects, last activity, insurance gap, signal score | priority leads |

### Tier 2 — Stickiness:

| Feature | สิ่งที่ทำ |
|---|---|
| 💬 **In-app Message Card** | Agent broadcast tip/follow-up → prospect เห็นใน Dashboard |
| 📅 **Appointment Booking** | Calendly-style ของตัวแทน, prospect กดจองได้ |
| 📁 **Document Vault** | Upload proposal/contract → prospect ดู+เซ็นในแอพ |
| 🔔 **Smart Alerts** | ส่ง notify ตัวแทนเมื่อ prospect: trial หมด, รายได้เพิ่ม, ลูกเกิด ฯลฯ |

### Tier 3 — Premium/Enterprise:

| Feature | สิ่งที่ทำ |
|---|---|
| 🤖 **AI Sales Assistant** | "ลูกค้าคนนี้เหมาะกับ product อะไร?" + script generator |
| 📈 **Performance Analytics** | Conversion rate, time-to-close, comparison vs avg |
| 🏢 **Multi-agent Team Mode** | สำนักงานมีหลายตัวแทน → shared leads, leaderboard |
| 🌐 **Custom Domain** | `agent.com` เปลี่ยนเป็น Lumenfi white-label |

---

## 6. Roadmap (Phased)

### Phase A — MVP "Slot Marketplace" (1-2 สัปดาห์)
**เป้าหมาย:** ขายได้แล้ว ฿299/เดือน

- ✅ DB: `agents`, `agent_subscriptions`, `profiles.assigned_agent_id`
- ✅ Agent signup page (`/agents/signup`) + dashboard ดู leads
- ✅ Invite link `/i/CODE` → prospect onboard → set assigned_agent_id
- ✅ AgentInfoCard อ่านจาก `assigned_agent_id` แทน env vars
- ✅ Quote action ส่ง email ไปตัวแทนคนนั้น
- ✅ Omise checkout สำหรับ agent (reuse ระบบเดิม)
- ✅ Free trial 14 วัน · cap 3 leads

**สิ่งที่ขายได้:** "ฝาก Lumenfi เป็นช่องทาง lead ให้คุณ — เดือนละ ฿299"

### Phase B — Differentiation (2-3 สัปดาห์)
**เป้าหมาย:** เปิด Pro ฿699 ได้

- 🎯 INA Report (PDF export)
- 💰 Premium Calculator (in-app form)
- 📊 Tax Saving Projector (extend tax tracker)
- 📥 Agent Lead Dashboard (sort by priority/activity)

### Phase C — Stickiness (2 สัปดาห์)
**เป้าหมาย:** ลด churn

- 💬 Agent → Prospect message card
- 📅 Appointment booking (use Cal.com embed)
- 🔔 Smart alerts (push to LINE/email)

### Phase D — Team & Enterprise (1 เดือน)
- 🏢 Team plan ฿1,990 (multi-agent org)
- 🤖 AI Sales Assistant
- 📈 Performance analytics
- 🌐 Custom domain

---

## 7. Insurance Section ควรมีอะไรมากกว่านี้?

**สิ่งที่มีอยู่:**
- กรมธรรม์ที่ใช้อยู่ (Policies list)
- Gap Analyzer (life/health/CI)
- Quote request

**สิ่งที่ขาด / ควรเพิ่ม:**

### Must-have สำหรับ user (ฟรี):
1. **เปรียบเทียบแผน 3 แบบ side-by-side** — life term vs whole life vs unit-linked
2. **คำนวณค่าเบี้ยตามอายุ** — slider อายุ → ดูเบี้ยเปลี่ยนแปลง (เน้น argument "ยิ่งซื้อช้ายิ่งแพง")
3. **Premium Affordability Check** — "เบี้ย ฿X/เดือน = Y% ของรายได้คุณ" (rule of thumb: ≤10%)
4. **ตัวอย่าง Policy ที่ฮิต** — TLT iSave / FWD myHealth ฯลฯ พร้อมเบี้ยตัวอย่าง
5. **Beneficiary checklist** — เตือน user ว่ามีระบุ beneficiary หรือยัง

### Nice-to-have (premium feature ของตัวแทน):
6. **AI Insurance Recommender** — วิเคราะห์ profile แล้วแนะนำ product
7. **Coverage Timeline** — graph ว่าตอนอายุ 30/40/50/60 คุณต้องการ coverage เท่าไหร่
8. **Claim Probability Calc** — โอกาสเคลม CI/health ตามอายุ-อาชีพ
9. **Policy Health Check** — อัพโหลด policy เก่า → AI สแกนว่าคุ้มครองพอไหม
10. **Insurance Quiz** — 5 คำถาม → ได้ recommendation (lead magnet)

### Hard-to-build แต่ "moat" สูง:
11. **Integration กับ insurer APIs** — TLT, FWD, AIA → ดู policy ที่ user มีจริง (ต้องคุยกับ insurer)
12. **e-Signature** — เซ็น policy ใน Lumenfi
13. **Premium auto-pay tracker** — เตือนเบี้ย, reconcile กับ bank account

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| ตัวแทนไม่จ่าย (lead count = 0) | Trial 14 วัน + cap → ถ้าระบบดี ปิด deal ได้ภายในนั้น |
| คปภ./คุณวุฒิตัวแทน — แสดง license หมดอายุ | ตรวจ license_valid_until ทุก signup + auto-suspend ถ้าหมดอายุ |
| Prospect รู้สึกถูก spam | ผู้ใช้กดเลือกเอง: "ส่ง quote" → consent ชัดเจน, ไม่ leak email อัตโนมัติ |
| ตัวแทนปลอม (fake license) | Manual review ตอน signup ครั้งแรก + ขอ scan บัตรตัวแทน |
| คปภ. กฎหมาย — ค่า fee เก็บจากใคร | คุณเก็บ "subscription" ไม่ใช่ commission split — ไม่ผิด คปภ. |

---

## 9. คำถามที่ต้องตัดสินใจ

### 9.1 Multi-tenancy รุนแรงแค่ไหน?
- [ ] **Soft** (agent_id column + RLS update) — เร็ว, 1 สัปดาห์ — **แนะนำสำหรับ Phase A**
- [ ] Hard (separate schema per agent) — ปลอดภัยกว่า แต่ scope ใหญ่

### 9.2 ตัวแทนเห็นข้อมูล prospect แค่ไหน?
- [ ] **ดูได้แค่: ชื่อ, email, gap analysis, last activity, lead source** — แนะนำ (privacy-first)
- [ ] ดูได้ครบ: รายได้, transactions, debt — ต้อง explicit consent

### 9.3 Pricing model ตอน launch
- [ ] **฿299/฿699/฿1,990 ตามที่แนะนำ** — match ตลาด SaaS Thailand
- [ ] เริ่มถูก ฿199/฿499 — แล้วค่อยขึ้น
- [ ] ฟรีตลอดชีพสำหรับ 10 ตัวแทนแรก (founding agents) → ใช้เป็น testimonial

### 9.4 Channel หาตัวแทน
- [ ] Facebook group "ตัวแทนประกัน" + "Insurance Sales Thailand"
- [ ] LinkedIn outreach (DM ตัวแทนที่ active)
- [ ] Partner กับโรงเรียนสอนตัวแทน
- [ ] ขายผ่าน broker firm

### 9.5 เริ่ม Phase A เลย หรือทำ pre-validation ก่อน?
- [ ] **Pre-sell** — ทำ landing page + waitlist → ถ้าได้ 20 ตัวแทน commit ค่อยสร้าง
- [ ] Build เลย Phase A → soft launch กับ 5-10 ตัวแทนรู้จัก

---

## 10. Next Decision

ตอบ 9.1-9.5 มา → ผมจะลงมือ Phase A ภายในสัปดาห์ + เปิดให้ทดสอบจริงได้

**Default ที่แนะนำถ้าไม่อยากคิดเยอะ:**
- 9.1 Soft tenancy
- 9.2 จำกัด data (privacy-first)
- 9.3 ฿299/฿699/฿1,990
- 9.4 เริ่มจาก Facebook group ตัวแทน
- 9.5 Build Phase A ก่อน + soft launch กับ 5 คนที่รู้จัก

---

*Doc owner: Trin · Next review: หลัง Phase A ลงสนาม*
