-- 24. Help article for the referral program

insert into help_articles (slug, title, category, body, language, sort_order)
values (
  'lumenfi-referral',
  'ชวนเพื่อน — รับ Pro ฟรี 30 วัน',
  'billing',
  E'# ชวนเพื่อน — ทั้งคู่ได้ Pro ฟรี 30 วัน\n\n## วิธีใช้\n\n1. ไปที่ **Settings → ชวนเพื่อน — รับ Pro ฟรี**\n2. คุณจะเห็นโค้ด 6 ตัวของคุณเอง (เช่น `ABC123`)\n3. กด **คัดลอก** หรือ **แชร์** เพื่อส่งให้เพื่อน\n4. เพื่อนสมัคร Lumenfi → ไปที่ **Settings → ชวนเพื่อน** → ใส่โค้ดของคุณ → กด **ยืนยัน**\n5. ✨ ทั้งคุณและเพื่อนได้ Pro **30 วัน** ทันที\n\n## รางวัลทำงานยังไง\n\n- ถ้ายังไม่มี subscription → สร้าง trial 30 วัน\n- ถ้ามี trial อยู่แล้ว → ยืดเวลาออกไปอีก 30 วัน\n- ถ้าสมัคร Pro แบบเสียเงินอยู่แล้ว → ยืด trial หลังหมดสัญญาออกไปอีก 30 วัน\n\n## ข้อจำกัด\n\n- ใส่โค้ดได้แค่ครั้งเดียว (ของเพื่อนคนใดคนหนึ่งเท่านั้น)\n- ใช้รหัสตัวเองไม่ได้\n- ชวนได้ไม่จำกัดจำนวนเพื่อน — ยิ่งชวนเยอะ ยิ่งได้ Pro นาน\n\n## เคล็ดลับ\n\nลองโพสต์ในกลุ่ม Facebook การเงิน เช่น "Money Coach Thailand" / "วัยรุ่นออมเงิน" — บอกว่าใช้ Lumenfi แล้วชอบ + แนบโค้ด → ได้ทั้งคู่',
  'th',
  10
)
on conflict (slug) do update set
  title = excluded.title,
  body = excluded.body,
  language = excluded.language,
  sort_order = excluded.sort_order;
