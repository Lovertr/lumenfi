-- ════════════════════════════════════════════════════════════════════
-- Migration 32 — Help articles for May-2026 feature batch
-- ────────────────────────────────────────────────────────────────────
-- Covers everything added since migration 16:
--   • Pay cycle (salary-day windows)
--   • Daily reminder auto-save
--   • Agent Marketplace (B2B) — signup, INA report, billing, LINE notify
--   • Sales Coach AI (chat + history + paywall)
--   • Lead routing 3-tier
--   • Referral Pro 30d + smart code detection
--   • Product Catalog AI Sync (admin)
--   • Subscriptions (Free / Pay-as-you-go / Pro / Founder)
--   • Net Worth time-series chart
--   • In-app notifications bell + drawer
-- ════════════════════════════════════════════════════════════════════

delete from help_articles where slug like 'feat2026-%';

insert into help_articles (slug, title, category, body, locale, sort_order) values

-- ─────────── PAY CYCLE ───────────
('feat2026-pay-cycle', 'รอบเงินเดือนคืออะไร · ใช้ยังไง', 'getting-started',
E'# รอบเงินเดือน (Pay Cycle)\n\n## ทำไมต้องมี\n\nคนส่วนใหญ่ไม่ได้รับเงินเดือนวันที่ 1 — บางคนวันที่ 25, บางคน 28 ฯลฯ\nถ้าคิดเดือนแบบปฏิทิน (1-31) — ตัวเลขในแอพจะไม่ตรงกับ "เดือนการเงิน" ของคุณจริงๆ\n\n## ตั้งยังไง\n\n1. /settings → โปรไฟล์ → **รอบเงินเดือน**\n2. เลือก: **ปฏิทินเดือน** (1-31) หรือ **เงินเดือน** (เช่น 25 → 24 ของเดือนถัดไป)\n3. ระบบจะอัพเดทกราฟ + งบประมาณ + AI Advisor ทั้งหมดทันที\n\n## จุดที่ได้รับผลกระทบ\n\n- 📊 Dashboard: "เดือนนี้" = รอบปัจจุบัน\n- 💰 Cash Flow: chart ตามรอบ\n- 📋 งบประมาณ: เริ่มนับใหม่ทุกวันเงินเดือน\n- 🤖 AI Advisor: ใช้รอบเดียวกัน\n\n## เปลี่ยนภายหลังได้ไหม\nได้ — แต่ข้อมูลย้อนหลังจะถูกจัดกลุ่มใหม่ตามรอบใหม่ทันที', 'th', 50),

-- ─────────── REMINDER AUTO-SAVE ───────────
('feat2026-reminder', 'แจ้งเตือนรายวัน — เปิด/ปิด/ตั้งเวลา', 'getting-started',
E'# แจ้งเตือนรายวัน\n\nให้แอพเตือนทุกวันให้บันทึกค่าใช้จ่าย — เพื่อให้ข้อมูลครบทุกวัน\n\n## ตั้งยังไง\n\n1. /settings/reminder\n2. ติ๊ก **"เปิดการแจ้งเตือนรายวัน"** — บันทึกอัตโนมัติทันที (ไม่ต้องกดปุ่ม)\n3. เลือกเวลา (ค่าเริ่ม 19:00)\n4. (ไม่บังคับ) เปิด **"ข้ามถ้าวันนี้บันทึกแล้ว"** — ถ้ามีรายการของวันนี้แล้ว ไม่เตือนซ้ำ\n\n## ต้องเปิดอะไรอีกบ้าง\n- Push notification permission ของ browser (ครั้งแรกเปิดแอพแอพถามให้)\n- ใช้งานบน HTTPS (production ใช้ได้เลย)\n\n## เวลาแนะนำ\n- **8:00-9:00** — ก่อนเริ่มวัน บันทึกของเมื่อวานที่ลืม\n- **19:00-20:00** — หลังกินข้าวเย็น เห็นค่าใช้จ่ายทั้งวันชัด\n- **21:30-22:00** — ก่อนนอน', 'th', 51),

-- ─────────── AGENT MARKETPLACE — SIGNUP ───────────
('feat2026-agent-signup', 'สมัครเป็นตัวแทนประกันบน Lumenfi', 'agents',
E'# สมัครเป็นตัวแทนประกัน\n\n## ใครสมัครได้\nตัวแทนที่มีใบอนุญาตประกันชีวิต/สุขภาพ/CI ที่ active กับ คปภ.\n\n## ขั้นตอน\n1. /agents/signup\n2. กรอกข้อมูล:\n   - ชื่อบริษัทประกัน (BLA, AIA, ...)\n   - ชื่อ + เลขใบอนุญาต + ระยะเวลาใบอนุญาต\n   - พื้นที่ + ผลิตภัณฑ์ที่ขาย (life / health / CI / retirement / savings / accident)\n   - LINE ID + เบอร์โทร + booking URL\n   - รูปโปรไฟล์ + คำแนะนำตัว (bio)\n3. กดส่ง\n\n## หลังสมัคร\n- รออนุมัติจาก admin (โดยปกติ ≤ 24 ชม.)\n- เริ่ม trial 14 วัน ฟรี · 3 leads อัตโนมัติ\n- รับ invite link ส่วนตัว (`/i/AGTXXXX`) แชร์ให้ลูกค้าได้ทันที\n\n## หลังอนุมัติ\nไปที่ /agents/dashboard เพื่อดู:\n- Leads ที่เข้ามา\n- โปรไฟล์ที่ลูกค้าเห็น\n- Sales Coach AI (ต้อง Starter+)\n- LINE Notify · Analytics · Billing', 'th', 100),

-- ─────────── LEAD ROUTING 3-TIER ───────────
('feat2026-lead-routing', 'Lead Routing 3 ชั้น — ตัวแทนได้ลูกค้ายังไง', 'agents',
E'# Lead Routing 3 ชั้น\n\nผู้ใช้ที่ขอที่ปรึกษาประกัน → ระบบจัดสรรไปยังตัวแทนผ่าน 3 ระดับ:\n\n## ชั้นที่ 1: Invite link (Direct match)\nถ้าลูกค้าสมัครผ่านลิงก์เชิญของคุณ (`/i/AGTXXXX`) → เป็นของคุณตรงๆ ไม่มี contest\n\n## ชั้นที่ 2: Area + Product (Smart match)\nถ้าลูกค้าไม่ได้มาผ่านลิงก์เชิญ → ระบบ match จาก:\n- พื้นที่ที่ตัวแทนระบุไว้ (จังหวัด)\n- ผลิตภัณฑ์ที่ขาย (ตัว match กับ insurance gap ของลูกค้า)\n- Round-robin ในตัวแทนที่ match\n\n## ชั้นที่ 3: Admin Fallback\nถ้ายังไม่ match → admin จัดสรรเอง (ลูกค้าจะได้คำติดต่อกลับใน 1 วัน)\n\n## เห็นที่ไหน\n- /agents/dashboard → "Leads ที่เข้ามา" + label บอกที่มา\n- /agents/analytics → กราฟ source mix', 'th', 101),

-- ─────────── INA REPORT ───────────
('feat2026-ina-report', 'INA Report — เอกสารวิเคราะห์ลูกค้า', 'agents',
E'# Insurance Needs Analysis (INA) Report\n\nเอกสาร PDF ที่ระบบสร้างให้คุณส่งลูกค้าได้\n\n## มีอะไรบ้าง\n- ✅ Profile สรุปลูกค้า (อายุ, dependents, income, debts)\n- ✅ Insurance Gap แบ่งตามประเภท (life / health / CI / accident / emergency)\n- ✅ ทุนที่แนะนำ + เหตุผล\n- ✅ มูลค่าและประโยชน์ของแผนที่เสนอ\n- ✅ Logo + ชื่อ + เลขใบอนุญาตของคุณ\n- ✅ Booking URL ของคุณ (ลูกค้ากดนัดทันที)\n\n## วิธีใช้\n1. /agents/leads/[id] (เลือก lead ที่ต้องการ)\n2. กด **ดาวน์โหลด INA Report**\n3. รอ 5-10 วินาที สร้าง PDF\n4. ส่งให้ลูกค้าทาง LINE / email — บอก "ดูเอกสารวิเคราะห์ของคุณก่อนนัดคุย"\n\n## ✨ Tip\nINA ถูกออกแบบให้ดูเป็นที่ปรึกษามืออาชีพ — ไม่ใช่โฆษณาขายตรง ทำให้ closing rate ขึ้น 2-3 เท่า', 'th', 102),

-- ─────────── SALES COACH AI ───────────
('feat2026-sales-coach', 'Sales Coach AI — โค้ชนักขายส่วนตัว', 'agents',
E'# Sales Coach AI\n\nAI ที่เทรนมาเป็นโค้ชนักขายประกันไทย 15+ ปี — ตอบทุกคำถามเรื่องการขาย\n\n## ทำอะไรได้\n- 💬 เทคนิคเปิดการสนทนาแบบไม่กดดัน\n- 🛡️ จัดการ objection ("แพง", "ขอคิดดูก่อน", "มีอยู่แล้ว")\n- 🎯 Pitch ตาม persona (มนุษย์เงินเดือน · เจ้าของกิจการ · พ่อแม่ใหม่ · Gen Z)\n- ⏰ Follow-up cadence ที่ไม่กวน\n- 📱 Content marketing (Facebook · LINE · Instagram)\n- 🎪 Close techniques (assumptive · alternative · summary)\n\n## ใช้ผลิตภัณฑ์ของบริษัทคุณ\nAI ดึง catalog ของบริษัทคุณ (BLA / AIA / ฯ) มาเป็น context — แนะนำชื่อจริง เช่น "บำนาญแฮปปี้เพนชั่น" ไม่ใช่ "บำนาญทั่วไป"\n\n## ประวัติแชท\nทุกการสนทนาถูกบันทึก — ดูย้อนหลังได้ที่ปุ่ม **ประวัติ** กลับมาคุยต่อจากที่หยุดได้\n\n## ⚠️ ต้องเป็นแพ็คเกจ Starter+\nระหว่าง trial 14 วัน Sales Coach ยังไม่เปิด — อัพเกรดที่ /agents/pricing', 'th', 103),

-- ─────────── AGENT BILLING ───────────
('feat2026-agent-plans', 'แพ็คเกจตัวแทน — Starter / Pro / Team', 'agents',
E'# แพ็คเกจตัวแทน\n\n## Free Trial (14 วัน · 3 leads)\nเริ่มหลังอนุมัติทันที — ไม่ต้องผูกบัตร\n\n## Starter — ฿299/เดือน\n- 25 leads/เดือน\n- Invite link · INA Report · Lead dashboard\n- Email notify เมื่อมี lead ใหม่\n- เหมาะกับตัวแทน solo\n\n## Pro — ฿699/เดือน ⭐ (แนะนำ)\n- Leads ไม่จำกัด\n- ทุกอย่างใน Starter\n- 🎓 **Sales Coach AI** unlimited\n- 📱 LINE Notify + SMS\n- Custom photo + bio\n- Priority support\n- Lead export CSV\n\n## Team — ฿1,990/เดือน\n- สำหรับ 5 ตัวแทน\n- ทุกอย่างใน Pro\n- Shared leads pool\n- Team leaderboard\n- Performance analytics\n\n## รายปี ประหยัด 17%\nStarter ฿2,990/ปี · Pro ฿6,990/ปี · Team ฿19,900/ปี\n\n## วิธีอัพเกรด\n/agents/pricing → เลือกแพ็คเกจ → Omise checkout', 'th', 104),

-- ─────────── LINE NOTIFY ───────────
('feat2026-line-notify', 'LINE Notify — แจ้งเตือน lead ใหม่ทันที', 'agents',
E'# LINE Notify สำหรับตัวแทน\n\nเมื่อมี lead ใหม่ → แจ้งเตือนใน LINE ทันที (ก่อน email)\n\n## ทำไมสำคัญ\n- ตอบลูกค้าใน 5 นาทีแรก = closing rate สูงสุด\n- LINE สะดวกกว่า email\n- ไม่พลาด lead ขณะออก field\n\n## ตั้งยังไง\n1. /agents/line\n2. กด **เชื่อมต่อ LINE Notify**\n3. Login LINE + อนุญาต Lumenfi (chat กับตัวเองโดย default)\n4. ทดสอบ — กดปุ่ม "ส่งทดสอบ"\n\n## ได้รับแจ้งเตือนเรื่องอะไร\n- 🎯 มี lead ใหม่ → ส่งทันที พร้อม profile สรุป\n- 💳 Sub ใกล้หมดอายุ (warn 3 วัน · 1 วัน)\n- 💰 Charge fail (auto-renew)\n- 📊 Weekly performance summary\n\n## ปิดได้\nกด **ยกเลิกการเชื่อมต่อ** ได้ตลอด — กลับไปรับ email อย่างเดียว', 'th', 105),

-- ─────────── REFERRAL — USER PROGRAM ───────────
('feat2026-referral-pro-30d', 'ชวนเพื่อน — รับ Pro ฟรี 30 วัน', 'referral',
E'# ชวนเพื่อน รับ Pro 30 วัน\n\n## วิธีง่ายๆ\n1. /settings/referral → ดูโค้ดของคุณ (เช่น `RM5AYT`)\n2. กด **คัดลอกลิงก์** → ได้ `lumenfi.projectostech.com/r/RM5AYT`\n3. แชร์ลิงก์ให้เพื่อน\n4. เพื่อนสมัครผ่านลิงก์ → **ทั้งคุณและเพื่อน** ได้ Pro 30 วันฟรี\n\n## คนชวนคุณมา — ใส่โค้ดที่ไหน\n- ถ้าสมัครผ่านลิงก์ → ระบบใส่โค้ดให้อัตโนมัติ\n- ถ้ายังไม่ได้ใส่ → /settings/referral → ช่อง "มีคนชวนคุณมา?" → ใส่โค้ด 6 ตัวอักษร\n\n## ใส่ได้ครั้งเดียวเท่านั้น\n- 1 user ใส่ referral code ของคนอื่นได้ครั้งเดียวตลอดกาล\n- คนชวน (referrer) ชวนได้ไม่จำกัด — ยิ่งชวนเยอะ ยิ่งได้ Pro นาน\n\n## /r/[code] landing page\nลิงก์ที่แชร์จะเปิดเป็นหน้า welcome สวยๆ ที่บอก "คนชวนคุณมา + Pro 30 วันรอ" — convert ดีกว่าส่งตรง /signup', 'th', 200),

-- ─────────── SMART CODE DETECTION ───────────
('feat2026-code-smart-detect', 'โค้ดเพื่อน vs โค้ดตัวแทน — ต่างกันยังไง', 'referral',
E'# Smart Code Detection\n\nLumenfi มี 2 แบบโค้ด — ระบบรู้เองว่าใส่อันไหน\n\n## โค้ดเพื่อน (User referral)\n- รูปแบบ: 6 ตัวอักษร เช่น `RM5AYT`\n- ที่มา: เพื่อนของคุณ (user ทั่วไป)\n- ผล: ทั้งคุณและเพื่อนได้ **Pro 30 วันฟรี**\n- ใส่ได้ครั้งเดียวต่อ user ตลอดกาล\n\n## โค้ดตัวแทน (Agent invite)\n- รูปแบบ: 7 ตัวอักษร เช่น `AGT3K2P`\n- ที่มา: ตัวแทนประกัน\n- ผล: คุณถูก **ผูกกับตัวแทนคนนั้น** (ไม่ได้ Pro)\n- ใช้ยังไง: เวลาขอที่ปรึกษาประกัน — ส่งตรงไปหาเขาแน่นอน\n\n## ระบบรู้ยังไง\nตอนใส่โค้ดที่ /settings/referral หรือสมัครผ่านลิงก์ ระบบเช็ค:\n1. มีโค้ดนี้ใน `agents.invite_code` ที่ active ไหม → ผูกตัวแทน\n2. ไม่เจอ → เช็ค `profiles.referral_code` → ให้ Pro 30 วัน\n3. ไม่มีทั้งสอง → error code_not_found', 'th', 201),

-- ─────────── SUBSCRIPTION PRO ───────────
('feat2026-pro-plan', 'แพลน Pro — ฿149/เดือน · อันลิมิต AI', 'subscription',
E'# Pro Plan — ฿149/เดือน\n\n## Free (default) ได้อะไร\n- ✅ ฟีเจอร์ Lumenfi ครบทุกอย่าง\n- ✅ AI Chat **5 ข้อความ/วัน**\n- ✅ AI Advisor **1 รายงาน/เดือน**\n- ✅ BYO Key — ใช้ key ตัวเองได้ไม่จำกัด\n- ❌ AI Secretary (Pro only)\n\n## Pro — ฿149/เดือน หรือ ฿1,490/ปี (ประหยัด ฿298)\n- 🚀 AI Chat **ไม่จำกัด**\n- 🚀 AI Advisor **ไม่จำกัด**\n- 🚀 **AI Secretary** push เตือนทุกวัน\n- 🚀 ทดลองฟรี 14 วัน — ไม่ต้องใส่บัตร\n- 🚀 Priority support\n\n## จ่ายตามใช้ (Credit pack)\n- 10 reports ฿79\n- 50 reports ฿349 (~22% off)\n- 100 reports ฿599 (~33% off)\n- ไม่หมดอายุ\n\n## เลือกอันไหนดี\n- 🆓 ใช้ Free + BYO key → ผู้ใช้ทั่วไป\n- 📊 ใช้นาน ๆ ครั้ง → Credit pack\n- 🌟 ใช้ทุกวัน → Pro\n\n## วิธี subscribe\n/pricing → กด **เริ่มทดลองฟรี** Pro 14 วัน → ใส่ card → trial เริ่มทันที', 'th', 250),

-- ─────────── NET WORTH CHART ───────────
('feat2026-net-worth-chart', 'Net Worth Chart บน Dashboard', 'transactions',
E'# Net Worth Chart\n\nกราฟเส้นแสดงความมั่งคั่งของคุณตามเวลา\n\n## ดูที่ไหน\n/dashboard → scroll ลงไปครึ่งหน้า\n\n## อ่านกราฟยังไง\n- 📈 **เส้นขึ้น** = Net Worth เพิ่ม (ดี!)\n- 📉 **เส้นลง** = ลด (หนี้เพิ่มเร็วกว่าทรัพย์ หรือเอาเงินไปใช้)\n- 📊 **เส้นนิ่ง** = balance — ไม่ได้ออม ไม่ได้ก่อหนี้\n- 🎯 **% change** = เปรียบเทียบกับจุดเริ่มต้นของช่วงที่เลือก\n\n## ช่วงเวลาที่เลือกได้\n1 เดือน / 3 เดือน / 6 เดือน / 1 ปี / ทั้งหมด\n\n## เก็บ snapshot อัตโนมัติ\nCron รันทุกวัน 15:00 — บันทึก Net Worth ของวันนั้น (assets - liabilities)\n\n## ⚠️ ข้อมูลใหม่จะมีหลัง 7-30 วัน\nถ้าเพิ่งใช้แอพ — กราฟยังว่าง รอจนมี data 2+ จุดถึงจะวาดเส้น', 'th', 30),

-- ─────────── IN-APP NOTIFICATIONS ───────────
('feat2026-bell-notifications', 'กระดิ่งแจ้งเตือนในแอพ', 'getting-started',
E'# In-App Notifications (Bell 🔔)\n\nกระดิ่งมุมขวาบนของทุกหน้า — รวมข่าวสำคัญทั้งหมด\n\n## เห็นอะไรบ้าง\n- 🎯 หนี้ที่ใกล้ครบกำหนด\n- 💰 งบประมาณเกิน\n- 🛡️ Insurance gap critical\n- 📊 AI Secretary insights\n- 💳 Subscription expiring\n- 🤝 (ตัวแทน) Lead ใหม่\n- ✅ Admin approvals (ถ้าเป็น admin)\n\n## แดง vs เขียว\n- **dot แดง** = ยังไม่อ่าน + จำนวนข้อความ\n- **dot เขียว** = อ่านหมดแล้ว\n\n## วิธีใช้\n- คลิกกระดิ่ง → drawer แสดงทั้งหมด\n- คลิกข้อความใดข้อความหนึ่ง → ไปที่หน้านั้น + mark as read\n- กด **อ่านทั้งหมด** → clear ทีเดียว\n\n## ระยะเวลาเก็บ\n30 วัน — หลังจากนั้นถูกลบอัตโนมัติ', 'th', 25),

-- ─────────── AI CHAT HISTORY ───────────
('feat2026-ai-chat-history', 'ประวัติแชท AI — เก็บ + ลบได้', 'ai',
E'# ประวัติแชท AI\n\nทั้ง /ai (Lumenfi AI ทั่วไป) และ /agents/coach (Sales Coach) เก็บประวัติแชทอัตโนมัติ\n\n## เห็นที่ไหน\n- หน้าแชท → ปุ่ม **ประวัติ (N)** มุมซ้ายบน\n- กดดู list → คลิกเข้าไปคุยต่อจากที่หยุด\n\n## ลบแชท\n- ใน list → hover แล้วกดไอคอน 🗑️\n- กด **ลบจริง** ใน popup ยืนยัน (กัน accidental click)\n- ลบแล้วลบเลย — ไม่มี trash\n\n## หรือลบจากหน้าแชท\nไอคอน 🗑️ มุมขวาบนของแชทที่กำลังดู — ลบแล้วกลับไป /ai หรือ /agents/coach อัตโนมัติ\n\n## privacy mode\nถ้าเปิด **Privacy mode** ที่ /ai/settings — บทสนทนายังเก็บใน Lumenfi DB แต่ **ไม่ส่งไปที่ AI provider** เลย', 'th', 110),

-- ─────────── PRODUCT CATALOG AI SYNC (admin) ───────────
('feat2026-product-catalog', 'Product Catalog · AI Sync (admin)', 'general',
E'# Product Catalog AI Sync\n\n**สำหรับ admin เท่านั้น** — จัดการฐานข้อมูลผลิตภัณฑ์ของบริษัทประกัน\n\n## ทำไมต้องมี\nSales Coach AI ใช้ catalog นี้เป็น context — ทำให้แนะนำชื่อจริง (เช่น "บีแอลเอ พรีเมียร์ลิงค์") แทนที่จะเป็น "ประกันทั่วไป"\n\n## วิธีใช้\n1. /settings/admin → กด tile **🌐 Product Catalog · AI Sync**\n2. ดู list บริษัทประกัน + วันที่ sync ล่าสุด\n3. เลือกบริษัทที่ต้องการ → กด **Sync now**\n4. รอ ~30 วินาที — AI ดึงข้อมูลผลิตภัณฑ์เข้า DB\n5. ปุ่ม 👁️ เปิด/ปิด ผลิตภัณฑ์ทีละตัวได้\n\n## Auto sync\n- Vercel cron daily 03:00 UTC + staleness check 6 วัน\n- = แต่ละบริษัทถูก sync ~สัปดาห์ละครั้งอัตโนมัติ\n\n## โหมด sync\n- **EXTRACT** — fetch HTML แล้ว AI สกัด (ใช้ได้ถ้าเว็บไม่ block bot)\n- **RESEARCH** — AI ใช้ความรู้สาธารณะตอบ (fallback ถ้า fetch fail / SPA)\n- **SEED FALLBACK** — ใช้ anchor list ที่เตรียมไว้ (ถ้า AI ตอบ 0)\n\n## ดู audit log\nแต่ละ row "ประวัติการ sync" กดขยาย → เห็น Input + AI Response ที่ส่ง/รับจริง', 'th', 300),

-- ─────────── COMPREHENSIVE REPORTS ───────────
('feat2026-comprehensive-reports', 'รายงานครบทุกมิติ', 'tools',
E'# Comprehensive Reports\n\n/reports → กราฟ + ตารางวิเคราะห์ครบทุกด้าน\n\n## หมวดที่มี\n- 📊 **รายรับ-รายจ่าย** — รายวัน / รายสัปดาห์ / รายเดือน · trend 12 เดือน\n- 💰 **Net Worth** — กราฟเส้นย้อนหลัง + breakdown ทรัพย์/หนี้\n- 💸 **Cash Flow** — Runway + ค่าเฉลี่ย 30/60/90 วัน\n- 📋 **งบประมาณ** — รายหมวด + เปรียบเทียบเดือนต่อเดือน\n- 💳 **หนี้** — DTI + ดอกเบี้ยรวม + ตารางผ่อน\n- 🎯 **เป้าหมาย** — % progress + ETA\n- 💼 **ลงทุน** — Asset allocation + P/L + benchmark vs SET\n- 🛡️ **ประกัน** — Gap analysis\n- 🧾 **ภาษี** — RMF/SSF/PVD utilization\n- 🏖️ **เกษียณ** — ความพร้อม 25-30× expense\n\n## Export\nทุกรายงานมีปุ่ม **Export CSV** สำหรับเอาไปทำต่อใน Excel\n\n## ใช้กับ AI Advisor\nกดปุ่ม "🌟 ขอคำแนะนำจาก AI" — AI วิเคราะห์ทั้งรายงานเป็นข้อความสรุปเข้าใจง่าย', 'th', 60),

-- ─────────── SIDEBAR SHORTCUTS ───────────
('feat2026-sidebar-shortcuts', 'Sidebar / More — ลิงก์ลัดทั้งหมด', 'getting-started',
E'# Sidebar (Desktop) / More page (Mobile)\n\nเมนูซ้ายบน Desktop + หน้า "เพิ่มเติม" บน Mobile รวมลิงก์ลัดไว้ทั้งหมด\n\n## หมวด "อื่นๆ"\n- 🌟 **ที่ปรึกษา AI** (/advisor)\n- 💼 **Agent Dashboard** — โชว์เฉพาะถ้าคุณเป็นตัวแทน (active)\n- 🎁 **ชวนเพื่อน · รับ Pro** (/settings/referral)\n- 🤖 **AI Chat** (/ai)\n- 📖 **คู่มือ** (/help)\n- 📊 **รายงาน** (/reports)\n- 💳 **แพลน + ราคา** (/pricing)\n- 📁 **หมวดหมู่** (/categories)\n- ⚙️ **ตั้งค่า** (/settings)\n\n## บนมือถือ\nกดปุ่ม **+** ตรงกลางล่าง = บันทึกรายการใหม่ (shortcut)\n\n## Theme + Language\nต่ำสุดของ Sidebar — สลับ Theme (light/dark) + ภาษา (ไทย/EN) + ปุ่ม logout', 'th', 20);

-- ─────────── UPDATE TIMESTAMPS ───────────
update help_articles set updated_at = now() where slug like 'feat2026-%';
