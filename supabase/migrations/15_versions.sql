-- ─────────────────────────────────────────────────────────
-- Migration 15: App version system + spotlight tracking
-- ─────────────────────────────────────────────────────────

-- Public table — readable by all authenticated users
create table if not exists app_versions (
  version text primary key,        -- e.g., '2026.05.07'
  released_on date not null,
  title text not null,
  summary text,
  highlights jsonb not null,       -- array of {icon, text, url?}
  is_major boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_app_versions_date on app_versions(released_on desc);

alter table app_versions enable row level security;
drop policy if exists "app_versions_read_all" on app_versions;
create policy "app_versions_read_all" on app_versions
  for select using (auth.role() = 'authenticated');

-- Track which version each user has acknowledged
alter table profiles add column if not exists last_seen_version text;
alter table profiles add column if not exists dismissed_spotlights jsonb default '[]'::jsonb;

-- Seed initial versions (the past few weeks of work)
insert into app_versions (version, released_on, title, summary, highlights, is_major) values
  ('2026.05.08', '2026-05-08', 'AI Advisor & Secretary',
   'ที่ปรึกษาการเงิน AI ครบทุกมิติ + เลขาคอยเฝ้าระวังสุขภาพการเงินให้',
   '[
     {"icon":"🌟","text":"AI Advisor 8 มิติ — วางแผน หนี้ ลงทุน ภาษี เกษียณ เป้าหมาย ประกัน Emergency","url":"/advisor"},
     {"icon":"🤖","text":"AI Secretary ส่ง push เมื่อมีเรื่องเร่งด่วน (DTI สูง EF ต่ำ Budget เกิน)","url":"/advisor"},
     {"icon":"🧠","text":"AI Chat ฉลาดขึ้น — เห็นข้อมูลครบ 12 มิติ รวมประกัน budget DCA","url":"/ai"},
     {"icon":"📊","text":"Net Worth chart รายเดือน","url":"/dashboard"}
   ]'::jsonb, true),
  ('2026.05.07', '2026-05-07', 'Investment Platform Complete',
   'ระบบลงทุนครบสมบูรณ์ — DCA Auto, Watchlist, รายงานภาษี, ลดหย่อนภาษี',
   '[
     {"icon":"🔁","text":"DCA Auto — ลงทุนรายเดือนอัตโนมัติ","url":"/investments/recurring"},
     {"icon":"👁️","text":"Watchlist + แจ้งเตือนราคาเป้า","url":"/investments/watchlist"},
     {"icon":"🧾","text":"รายงานภาษี — ใช้ยื่น ภ.ง.ด. (CSV)","url":"/investments/tax-report"},
     {"icon":"📈","text":"กองทุนลดหย่อนภาษี RMF/SSF/PVD","url":"/investments/tax-saving"},
     {"icon":"🎯","text":"Goal ↔ Investment linking","url":"/goals"},
     {"icon":"📊","text":"Risk metrics + SET benchmark","url":"/investments"}
   ]'::jsonb, true),
  ('2026.05.06', '2026-05-06', 'Investment Dashboard',
   'หน้า Portfolio เต็มรูปแบบ + AI Investment Advisor',
   '[
     {"icon":"📊","text":"Portfolio dashboard + Asset Allocation","url":"/investments"},
     {"icon":"🔍","text":"Detail page + Price chart","url":"/investments"},
     {"icon":"💸","text":"Transactions log + Dividends tracker","url":"/investments"}
   ]'::jsonb, false)
on conflict (version) do nothing;
