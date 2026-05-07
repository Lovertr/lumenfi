-- ─────────────────────────────────────────────────────────
-- Migration 16: Help articles for new features (May 2026)
-- ─────────────────────────────────────────────────────────

insert into help_articles (slug, title, category, body, locale, sort_order) values

-- AI Advisor (8 มิติ)
('ai-advisor-overview', 'ที่ปรึกษา AI 8 มิติ คืออะไร', 'ai',
E'# AI Advisor — เลขาทางการเงินส่วนตัว\n\nเป็นที่ปรึกษาการเงินอัจฉริยะ วิเคราะห์ครบทุกมิติพร้อมแผนปฏิบัติได้จริง\n\n## ทำอะไรได้บ้าง\n\n### 🌟 สุขภาพการเงินรวม\nวิเคราะห์ครบทุกด้าน + แผน 30/60/90 วัน\n\n### 💸 กลยุทธ์ปลดหนี้\nAvalanche / Snowball / Refinance / Consolidate — แนะนำตามสถานการณ์ของคุณ\n\n### 📊 วิเคราะห์การลงทุน\nAsset allocation, FX exposure, ความเสี่ยง, rebalance hints\n\n### 🧾 ลดภาษี\nRMF/SSF/PVD เพดาน + สิทธิลดหย่อนทั้งหมดที่ใช้ได้\n\n### 🏖️ วางแผนเกษียณ\n25-30× รายจ่าย + 4% rule + แผนเดินหน้า\n\n### 🎯 เร่งบรรลุเป้าหมาย\nSMART goals + auto-pilot strategy\n\n### 🛡️ Gap ประกัน\nวิเคราะห์ทุนคุ้มครองเทียบกับสิ่งที่ควรมี\n\n### 🚨 Emergency Fund\nความพร้อมรับมือเหตุไม่คาดฝัน\n\n## วิธีใช้\n1. ไปที่ /advisor\n2. เลือก domain ที่อยากให้วิเคราะห์ (หรือกด "สุขภาพการเงินรวม" เลย)\n3. รอ AI ประมวลผล 10-30 วินาที\n4. รับรายงาน + ลิงก์ไปจัดการต่อได้ทันที\n\n## ต้องตั้งอะไรก่อน?\nต้องมี AI key ที่ /ai/settings (BYO — Anthropic, OpenAI, Gemini, OpenRouter)', 'th', 100),

('ai-advisor-when-to-use', 'ควรใช้ AI Advisor ตอนไหน', 'ai',
E'# ใช้ AI Advisor เมื่อไหร่ดี\n\n## ใช้แบบ comprehensive (เดือนละครั้ง)\n- ทบทวนภาพรวมการเงินรายเดือน\n- ก่อนตัดสินใจใหญ่ (ซื้อบ้าน เปลี่ยนงาน แต่งงาน)\n- ปลายปี (วางแผนภาษี + เป้าหมายปีหน้า)\n\n## ใช้แบบ specialist (ตามสถานการณ์)\n- **เพิ่มหนี้ใหม่** → debt advisor\n- **เพิ่มเงินเดือน/โบนัส** → tax + investment advisor\n- **ใกล้สิ้นปี (Q4)** → tax advisor\n- **อายุครบ 30/40/50** → retirement advisor\n- **ตั้งเป้าหมายใหม่** → goals advisor\n- **มีคนพึ่งพา** → insurance advisor\n\n## ไม่ควรใช้\n- ทุกวันถี่เกินไป (ข้อมูลยังไม่เปลี่ยน)\n- แทน financial advisor มืออาชีพในเรื่องซับซ้อนมาก (mortgage refinance, estate planning)', 'th', 101),

('ai-secretary', 'AI Secretary — เลขาคอยเตือน', 'ai',
E'# AI Secretary\n\nเป็น cron job ที่รันทุกวัน คอยตรวจสุขภาพการเงิน — ถ้าเจอเรื่องเร่งด่วน จะส่ง push notification\n\n## เตือนเรื่องอะไร\n- 🚨 DTI > 50% (วิกฤต) / > 40% (เริ่มเสี่ยง)\n- 🚨 Emergency Fund < 1 เดือน\n- 🎯 เป้าหมายใกล้ deadline แต่ progress ช้า\n- 💸 Budget เกิน\n- 🧾 ใกล้สิ้นปีแต่ยังไม่ใช้สิทธิลดหย่อนภาษี\n- 📊 พอร์ตกระจุกตัว > 40% ในตัวเดียว\n- 📝 ไม่ได้บันทึกธุรกรรม 7+ วัน\n\n## ป้องกัน spam\n- 1 alert / วัน / user (เลือก issue ที่สำคัญสุด)\n- ส่งแค่ severity warn/critical (ไม่รบกวนเรื่องเล็ก)\n\n## ต้องเปิดอะไร\n1. Push notification permission (browser)\n2. Migration 14 apply เรียบร้อย', 'th', 102),

('ai-byo-key', 'ทำไมต้องใช้ AI key ของตัวเอง', 'ai',
E'# Bring Your Own Key (BYO)\n\nLumenfi ใช้ AI key ของผู้ใช้เอง — ไม่มีค่าใช้จ่ายจาก Lumenfi\n\n## ข้อดี\n- ✅ **ฟรี** — Lumenfi ไม่คิดค่า AI\n- ✅ **ราคาตรง** — จ่ายให้ provider ตรงตาม usage\n- ✅ **ความเป็นส่วนตัว** — ข้อมูลไม่ผ่าน Lumenfi server เกินจำเป็น\n- ✅ **เลือกได้** — Anthropic / OpenAI / Gemini / OpenRouter\n\n## ขอ key ที่ไหน\n- **Anthropic Claude:** https://console.anthropic.com\n- **OpenAI GPT-4:** https://platform.openai.com\n- **Google Gemini:** https://aistudio.google.com\n- **OpenRouter** (รวมหลาย model): https://openrouter.ai\n\n## ค่าใช้จ่ายโดยประมาณ\n- Claude Sonnet: ~฿1-3 ต่อ AI Advisor 1 รายงาน\n- GPT-4o: ~฿1-2 ต่อรายงาน\n- Gemini 1.5: ~฿0.5-1 ต่อรายงาน\n\nใช้ทุกวันเดือนละ ~฿50-100 บาทเท่านั้น\n\n## ความปลอดภัย\nKey ถูกเข้ารหัสด้วย AES-256-GCM ก่อนเก็บใน database', 'th', 103),

-- Investments — DCA Auto
('dca-auto-setup', 'ตั้งค่า DCA อัตโนมัติ', 'investments',
E'# DCA Auto — ลงทุนรายเดือนอัตโนมัติ\n\n## DCA คืออะไร\nDollar Cost Averaging = ทยอยลงทุนสม่ำเสมอ ลดความเสี่ยง market timing\n\n## ตั้งยังไง\n1. ไปที่ /investments/recurring\n2. กด **เพิ่ม**\n3. เลือกการลงทุนที่จะ DCA\n4. เลือกโหมด:\n   - 💵 **จำนวนเงินคงที่** (เช่น 5,000 บ./เดือน)\n   - 📦 **จำนวนหุ้นคงที่** (เช่น 100 หน่วย/เดือน)\n5. เลือกวันที่ของเดือน (1-31)\n6. กดบันทึก\n\n## ระบบทำอะไรให้\nทุกวันที่กำหนด ระบบจะ:\n- ดึงราคาตลาดล่าสุดจาก Yahoo Finance\n- คำนวณจำนวนหุ้น (ถ้าเลือกแบบ amount)\n- สร้าง buy transaction อัตโนมัติ\n- อัพเดต avg_cost ใหม่ (weighted average)\n- เลื่อนวันถัดไปไปเดือนหน้า\n\n## ⚠️ สำคัญ\n**DCA Auto บันทึกเฉยๆ ไม่ได้ซื้อจริงผ่าน broker** — คุณยังต้องไปซื้อใน Streaming เอง ระบบช่วยแค่ track และคำนวณ avg cost', 'th', 200),

-- Watchlist
('watchlist-setup', 'Watchlist + แจ้งเตือนราคา', 'investments',
E'# Watchlist\n\nเก็บ symbol ที่สนใจไว้ดูราคา + แจ้งเตือนเมื่อราคาถึงเป้าหมาย\n\n## วิธีใช้\n1. ไปที่ /investments/watchlist\n2. กด **เพิ่ม**\n3. กรอก:\n   - Symbol (เช่น PTT, AAPL)\n   - ประเภท (หุ้นไทย, ต่างประเทศ, crypto, etc.)\n   - ราคาเป้าหมาย\n   - เงื่อนไข: ⬆ ขึ้นถึง / ⬇ ลงถึง\n\n## แจ้งเตือนทำงานยังไง\n- Cron รันทุกวัน เช็คราคาเทียบ target\n- ถ้าถึงเป้า → push notification (ต้องเปิด browser permission)\n- 1 batch / วัน / user (รวม symbols ที่ trigger)\n\n## Tips\n- ตั้ง target ใกล้เคียงราคาตลาด อย่าเพี้ยนเกินไป\n- ใช้ทั้งโหมด above (รอขาย) + below (รอซื้อ)', 'th', 201),

-- Tax-saving tracker
('tax-saving-tracker', 'ตัวติดตามกองทุนลดหย่อนภาษี', 'investments',
E'# RMF/SSF/PVD Tracker\n\n## เพดานปี 2569\n- **RMF**: 30% ของรายได้ ไม่เกิน 500,000 (รวมกับ SSF/PVD)\n- **SSF**: 30% ของรายได้ ไม่เกิน 200,000\n- **PVD**: 15% ของเงินเดือน\n\n## วิธีใช้\n1. ไปที่ /investments/tax-saving\n2. ใส่รายได้ต่อปี → ระบบคำนวณเพดานสูงสุด\n3. ดูว่าใช้ไปเท่าไหร่ + เหลือเท่าไหร่\n4. Progress bar สีเขียว/เหลือง/แดงตามการใช้งาน\n\n## เพิ่มกองทุนเข้า tracker\n1. /investments/new\n2. เลือกประเภท (mutual_fund)\n3. เปิด toggle "นี่คือกองทุนลดหย่อนภาษี"\n4. เลือกประเภท (RMF/SSF/PVD/กบข./SSF Extra)\n5. ใส่วันที่ปลดล็อก (lock-in date)\n\n## Lock-in periods\n- **SSF**: 10 ปี นับจากวันที่ซื้อ\n- **RMF**: 5 ปี + อายุ 55 ปี\n- **PVD/กบข.**: ตามเงื่อนไขของกองทุน\n\nขายก่อนกำหนด → คืนภาษีที่ลดหย่อน + ดอกเบี้ย', 'th', 202),

-- Capital gains report
('capital-gains-report', 'รายงานภาษีรายปี', 'investments',
E'# Capital Gains Report\n\nสรุปกำไร/ขาดทุนจากการขาย + เงินปันผลรายปี — ใช้ยื่น ภ.ง.ด.\n\n## วิธีใช้\n1. ไปที่ /investments/tax-report\n2. เลือกปีภาษี (เช่น 2569)\n3. ดูสรุป: realized P/L + dividends\n4. กด **Download CSV** เปิดด้วย Excel\n\n## ข้อสังเกตการยื่นภาษี\n- **หุ้น SET**: กำไรขายได้รับยกเว้นภาษี (cap gains exempt)\n- **เงินปันผลหุ้นไทย**: หัก ณ ที่จ่าย 10% — ขอ "ไม่นำมารวม" ก็จบ\n- **ลงทุนต่างประเทศ**: ต้องเสีย ตามมาตรา 41\n- **Crypto**: หัก 15% ตามมาตรา 40(4)\n\n## ⚠️ ไม่ใช่คำแนะนำภาษี\nรายงานนี้ใช้เป็นข้อมูลอ้างอิง — ปรึกษาผู้สอบบัญชีสำหรับกรณีของคุณ', 'th', 203),

-- Goal-investment linking
('goal-investment-linking', 'ผูก Goal กับการลงทุน', 'goals',
E'# Goal ↔ Investment Linking\n\nเชื่อมการลงทุนกับเป้าหมาย — มูลค่าจะถูกนับรวม progress อัตโนมัติ\n\n## วิธีผูก\n1. ไปที่ /investments/new (หรือ edit holding ที่มี)\n2. เลื่อนลงไปส่วน "เชื่อมกับเป้าหมาย"\n3. เลือก goal chip ที่ต้องการ\n4. บันทึก\n\n## ผลที่ได้\n- หน้า /goals จะแสดง badge "📈 การลงทุน N รายการ มูลค่า ฿X" บนการ์ดเป้าหมาย\n- มูลค่าการลงทุนนับรวม progress เป้าหมาย\n- AI Advisor เห็นว่าเป้าไหนผูกการลงทุนไว้\n\n## ตัวอย่างการใช้\n- เป้า "เกษียณ" → ผูก RMF, SSF, หุ้นปันผล\n- เป้า "ซื้อบ้าน" → ผูกกองทุนรวม conservative\n- เป้า "Emergency Fund" → ใช้บัญชีออมทรัพย์ (ไม่ใช่หุ้น)', 'th', 250),

-- Net worth chart
('net-worth-chart', 'Net Worth Chart บน Dashboard', 'getting-started',
E'# Net Worth Chart\n\nกราฟแสดง net worth ตามเวลา — เห็นแนวโน้มการเงินระยะยาว\n\n## ใช้งาน\n- บน Dashboard มี card "Net Worth ตามเวลา"\n- เลือกช่วง: 1 เดือน / 3 / 6 / 1 ปี / ทั้งหมด\n- กราฟสีเขียวถ้ากำลังขึ้น แดงถ้าลง\n- แสดง % เปลี่ยนแปลงในช่วง\n\n## ข้อมูลมาจากไหน\nระบบสร้าง snapshot รายวันโดย cron — ต้องใช้แอพอย่างน้อย 2 วัน ถึงจะแสดงกราฟได้\n\n## ดูรายละเอียดเต็ม\nกดที่กราฟ → /networth — เห็น breakdown ทรัพย์สิน + หนี้สิน', 'th', 11),

-- General — version system
('whats-new', 'ดูรายการอัพเดต Lumenfi', 'getting-started',
E'# What''s New\n\nLumenfi อัพเดตฟีเจอร์ใหม่บ่อย — ดูรายการได้ที่ /whats-new\n\n## Banner บน Dashboard\nเมื่อมีรุ่นใหม่ที่ยังไม่เคยดู — จะมี banner สีม่วง "ใหม่" บน Dashboard\n\n## รายการแต่ละรุ่น\n- **Major release** (มีดาว ⭐) — ฟีเจอร์ใหญ่ ปรับการใช้งาน\n- **Minor release** — ปรับปรุงเล็กน้อย / bug fixes\n- แต่ละ highlight กดเข้าไปเปิดฟีเจอร์ที่เกี่ยวข้องได้เลย\n\n## ความถี่\n- Major: เดือนละ 1-2 ครั้ง\n- Minor: เกือบทุกวัน', 'th', 12),

-- Investment platform overview
('investment-platform-overview', 'แพลตฟอร์มการลงทุนของ Lumenfi', 'investments',
E'# แพลตฟอร์มการลงทุน\n\nLumenfi รองรับการ track การลงทุนทุกประเภท + เครื่องมือวางแผน\n\n## รายการที่ track ได้\n- 🇹🇭 หุ้นไทย (SET)\n- 🌍 หุ้นต่างประเทศ\n- 💰 กองทุนรวม\n- ETF\n- 🪙 Crypto\n- 🏆 ทองคำ\n- 🏢 REIT\n- 🏠 อสังหาริมทรัพย์\n- 📃 ตราสารหนี้ / เงินฝากประจำ\n- 🎫 สลากออมสิน\n\n## เครื่องมือทั้งหมด\n- /investments — Portfolio dashboard\n- /investments/recurring — DCA Auto\n- /investments/watchlist — Watchlist + alerts\n- /investments/tools/dca — DCA Calculator\n- /investments/tax-saving — เครื่องคำนวณเพดาน RMF/SSF\n- /investments/tax-report — รายงานภาษีรายปี\n\n## ข้อมูลราคาแบบ real-time\n- หุ้นไทย/ต่างประเทศ/ETF/Crypto: Yahoo Finance\n- FX rates: exchangerate.host\n- กองทุนรวมไทย: ใส่ราคาเอง (NAV)\n- ทองคำ: ใส่ราคาเอง\n\n## SET Benchmark\nหน้า /investments แสดงกราฟเทียบ portfolio % vs SET Index — เห็นว่าชนะตลาดหรือไม่', 'th', 199)

on conflict (slug) do update set
  title = excluded.title,
  body = excluded.body,
  category = excluded.category,
  sort_order = excluded.sort_order,
  updated_at = now();
