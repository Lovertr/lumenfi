import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-static';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isEn = locale === 'en';

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
        <Button asChild size="sm" variant="ghost" className="mb-4 -ml-2">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {isEn ? 'Back' : 'กลับ'}
          </Link>
        </Button>

        {isEn ? <TermsEnglish /> : <TermsThai />}
      </div>
    </main>
  );
}

function TermsThai() {
  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <h1>ข้อกำหนดในการให้บริการ (Terms of Service)</h1>
      <p className="text-sm text-muted-foreground">มีผลบังคับใช้: 1 กรกฎาคม 2569 (2026)</p>

      <h2>1. การใช้บริการ</h2>
      <p>
        Lumenfi (&quot;บริการ&quot;) เป็นแอปพลิเคชันจัดการการเงินส่วนบุคคลของ Aurum Quietus / Projectos Tech
        ให้บริการโดยไม่มีค่าใช้จ่ายเบื้องต้น (Free tier) และมีแพลนพรีเมียม (Pro, Credits, Agent)
        การใช้บริการหมายถึงท่านยอมรับเงื่อนไขทั้งหมดในข้อกำหนดนี้
      </p>

      <h2>2. บัญชีผู้ใช้</h2>
      <ul>
        <li>ท่านต้องมีอายุ 18 ปีบริบูรณ์ (หรือได้รับความยินยอมจากผู้ปกครอง)</li>
        <li>ท่านมีหน้าที่รักษารหัสผ่านและข้อมูลบัญชีให้ปลอดภัย</li>
        <li>ท่านต้องไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย ฉ้อโกง หรือละเมิดสิทธิของผู้อื่น</li>
      </ul>

      <h2>3. แพลน Pro และการชำระเงิน</h2>
      <p>
        Lumenfi ให้บริการชำระเงินผ่าน <strong>PromptPay QR Code</strong>
        โดยผู้ใช้จะได้ QR Code สำหรับสแกน โอนผ่านแอปธนาคาร แล้วอัพโหลดสลิปการโอนเพื่อยืนยัน
      </p>

      <h3>3.1 ราคาและระยะเวลา</h3>
      <ul>
        <li><strong>Pro รายเดือน:</strong> 149 บาท / 30 วัน</li>
        <li><strong>Pro รายปี:</strong> 1,490 บาท / 365 วัน (ประหยัด ~16%)</li>
        <li><strong>Credits (แพ็ค 10/50/100 รายงาน):</strong> 79 / 349 / 599 บาท (ไม่หมดอายุ)</li>
        <li><strong>Agent plans (Starter/Pro/Team):</strong> 299 / 699 / 1,990 บาท/เดือน หรือ 2,990 / 6,990 / 19,900 บาท/ปี</li>
      </ul>
      <p>ราคาที่แสดงรวมภาษีมูลค่าเพิ่ม (VAT) แล้ว</p>

      <h3>3.2 การยืนยันการชำระเงิน</h3>
      <p>
        หลังจากผู้ใช้อัพโหลดสลิป ระบบจะใช้ Slip2Go API ยืนยันโดยอัตโนมัติ
        หากตรวจสอบผ่าน (ยอด + ผู้รับ + เวลาไม่เกิน 24 ชม.) ท่านจะได้รับ Pro ทันที
        หากไม่ผ่านการตรวจอัตโนมัติ จะเข้าสู่กระบวนการตรวจสอบด้วยเจ้าหน้าที่ ปกติไม่เกิน 2 ชั่วโมง (max 24 ชม.)
      </p>

      <h3>3.3 การต่ออายุ</h3>
      <p>
        Lumenfi <strong>ไม่มีระบบ auto-charge</strong> — ท่านต้องต่ออายุด้วยตนเองก่อนสิ้นสุดรอบ
        ระบบจะส่งอีเมลแจ้งเตือน 3 วันก่อนหมดอายุ หากไม่ต่ออายุ บัญชีจะถูก downgrade เป็น Free อัตโนมัติ
      </p>

      <h2>4. นโยบายการคืนเงิน (Refund Policy)</h2>
      <p>ตามพระราชบัญญัติคุ้มครองผู้บริโภค พ.ศ. 2522 และประกาศคณะกรรมการคุ้มครองผู้บริโภคว่าด้วยธุรกิจตลาดแบบตรง:</p>
      <ul>
        <li>ท่านสามารถขอคืนเงินภายใน <strong>7 วัน</strong> นับจากวันที่ชำระเงิน หากยังไม่ได้ใช้ AI Advisor Reports (Credits)</li>
        <li>สำหรับ Pro subscription ที่เริ่มใช้งานแล้ว จะคืนเงินตามสัดส่วนวันที่เหลือของรอบ (pro-rated)</li>
        <li>Credits ที่ใช้ไปแล้วไม่สามารถคืนเงินได้ (ยกเว้นกรณีระบบผิดพลาด)</li>
        <li>ระยะเวลาคืนเงิน: 7-14 วันทำการหลังอนุมัติ (คืนผ่าน PromptPay หรือธนาคารเดียวกับที่โอนเข้ามา)</li>
        <li>ขอ refund ที่ <a href="mailto:tintanee.t@gmail.com">tintanee.t@gmail.com</a> พร้อม Order Reference</li>
      </ul>

      <h2>5. โปรแกรมแนะนำเพื่อน (Referral Program)</h2>
      <p>
        เมื่อท่านแนะนำเพื่อนสมัครและซื้อ Pro ครั้งแรก ทั้งท่านและเพื่อนจะได้รับ Pro เพิ่ม <strong>30 วัน</strong>
        รางวัลจะถูกให้อัตโนมัติเมื่อเพื่อนชำระเงินสำเร็จ ไม่จำกัดจำนวนครั้ง
        (ห้ามสร้างบัญชีปลอมเพื่อเรียกร้องรางวัล — Lumenfi ขอสงวนสิทธิ์ปฏิเสธ / ยกเลิกรางวัลที่ผิดปกติ)
      </p>

      <h2>6. AI Advisor และคำแนะนำทางการเงิน</h2>
      <p>
        AI Advisor ของ Lumenfi ให้ข้อมูลเพื่อการศึกษาเท่านั้น <strong>ไม่ใช่คำแนะนำการลงทุนโดยผู้ประกอบวิชาชีพ</strong>
        การตัดสินใจทางการเงินใด ๆ เป็นความรับผิดชอบของท่านเอง Lumenfi ไม่รับผิดชอบต่อการสูญเสียใด ๆ
        ที่เกิดจากการใช้ข้อมูลจาก AI Advisor
      </p>

      <h2>7. ข้อมูลของท่านและความเป็นส่วนตัว</h2>
      <p>
        ข้อมูลการเงินของท่านถูกเก็บที่ Supabase (PostgreSQL) เข้ารหัสระหว่างส่งและขณะจัดเก็บ
        Lumenfi ไม่ขายหรือให้ข้อมูลส่วนตัวของท่านแก่บุคคลที่สาม
        รายละเอียดในนโยบาย <Link href="/privacy">Privacy Policy</Link>
      </p>

      <h2>8. การยกเลิกและระงับบัญชี</h2>
      <p>
        ท่านสามารถลบบัญชีได้ตลอดเวลาที่ ตั้งค่า → ลบบัญชี Lumenfi ขอสงวนสิทธิ์ระงับบัญชีที่ละเมิดข้อกำหนดนี้
        โดยไม่ต้องแจ้งล่วงหน้า และไม่คืนเงินสำหรับบัญชีที่ถูกระงับด้วยเหตุผิดกฎหมาย/ฉ้อโกง
      </p>

      <h2>9. การเปลี่ยนแปลงข้อกำหนด</h2>
      <p>
        Lumenfi อาจแก้ไขข้อกำหนดนี้ได้ตามความจำเป็น การใช้บริการต่อหลังการแก้ไขถือว่าท่านยอมรับ
        เราจะแจ้งการเปลี่ยนแปลงที่สำคัญผ่านอีเมลและใน-แอปอย่างน้อย 7 วันล่วงหน้า
      </p>

      <h2>10. ติดต่อเรา</h2>
      <p>
        Aurum Quietus / Projectos Tech<br />
        Email: <a href="mailto:tintanee.t@gmail.com">tintanee.t@gmail.com</a><br />
        เว็บไซต์: <a href="https://lumenfi.projectostech.com">lumenfi.projectostech.com</a>
      </p>

      <hr />
      <p className="text-xs text-muted-foreground">
        เอกสารนี้จัดทำภายใต้กฎหมายไทย พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
        และพระราชบัญญัติคุ้มครองผู้บริโภค พ.ศ. 2522
      </p>
    </article>
  );
}

function TermsEnglish() {
  return (
    <article className="prose prose-slate max-w-none dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Effective: July 1, 2026</p>

      <h2>1. Use of Service</h2>
      <p>
        Lumenfi (&quot;Service&quot;) is a personal finance management app by Aurum Quietus / Projectos Tech,
        offered on a Free tier with paid Pro, Credits, and Agent plans. By using the Service,
        you agree to be bound by these Terms.
      </p>

      <h2>2. Account</h2>
      <ul>
        <li>You must be 18+ or have parental consent</li>
        <li>You are responsible for keeping your credentials secure</li>
        <li>You must not use the Service for illegal, fraudulent, or infringing purposes</li>
      </ul>

      <h2>3. Pro Plans and Payment</h2>
      <p>
        Lumenfi accepts payment via <strong>PromptPay QR Code</strong>. After scanning the QR
        and transferring via your bank app, upload the transfer slip for verification.
      </p>

      <h3>3.1 Pricing</h3>
      <ul>
        <li><strong>Pro monthly:</strong> THB 149 / 30 days</li>
        <li><strong>Pro yearly:</strong> THB 1,490 / 365 days (~16% off)</li>
        <li><strong>Credits (10/50/100 reports):</strong> THB 79 / 349 / 599 (no expiry)</li>
        <li><strong>Agent plans (Starter/Pro/Team):</strong> THB 299/699/1,990 monthly or 2,990/6,990/19,900 yearly</li>
      </ul>
      <p>All prices include VAT.</p>

      <h3>3.2 Verification</h3>
      <p>
        Slips are verified via Slip2Go API (amount + recipient + &lt;24h timestamp). Passing verification
        activates Pro instantly. Failed verifications go to manual review, typically within 2 hours (max 24h).
      </p>

      <h3>3.3 Renewal</h3>
      <p>
        Lumenfi <strong>does not auto-charge</strong>. You must renew manually before period end.
        We send email reminders 3 days before expiry. Non-renewal auto-downgrades to Free.
      </p>

      <h2>4. Refund Policy</h2>
      <p>Per Thai Consumer Protection Act B.E. 2522 (1979):</p>
      <ul>
        <li>Refund available within <strong>7 days</strong> of payment if AI Advisor reports (Credits) unused</li>
        <li>Active Pro subscriptions: pro-rated refund for unused days</li>
        <li>Used Credits: non-refundable (except for system errors)</li>
        <li>Refund timeframe: 7-14 business days after approval (via PromptPay/original bank)</li>
        <li>Request refunds at <a href="mailto:tintanee.t@gmail.com">tintanee.t@gmail.com</a> with Order Reference</li>
      </ul>

      <h2>5. Referral Program</h2>
      <p>
        Refer a friend who buys their first Pro subscription — both parties get <strong>+30 days Pro</strong> free.
        Auto-granted on successful payment. Unlimited referrals. Fraudulent referrals will be revoked.
      </p>

      <h2>6. AI Advisor and Financial Advice</h2>
      <p>
        AI Advisor is <strong>for educational purposes only</strong> and is not professional investment advice.
        All financial decisions are your responsibility. Lumenfi is not liable for losses arising from AI Advisor use.
      </p>

      <h2>7. Data and Privacy</h2>
      <p>
        Your financial data is stored on Supabase (PostgreSQL), encrypted in transit and at rest.
        We do not sell your data. See our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Account Termination</h2>
      <p>
        You may delete your account anytime in Settings. Lumenfi may suspend accounts violating these
        Terms without notice, without refund for accounts terminated for illegal/fraudulent activity.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may amend these Terms. Continued use after changes means acceptance.
        Material changes are announced via email and in-app at least 7 days in advance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Aurum Quietus / Projectos Tech<br />
        Email: <a href="mailto:tintanee.t@gmail.com">tintanee.t@gmail.com</a><br />
        Web: <a href="https://lumenfi.projectostech.com">lumenfi.projectostech.com</a>
      </p>

      <hr />
      <p className="text-xs text-muted-foreground">
        Governed by Thai law. Compliant with PDPA B.E. 2562 (2019) and Consumer Protection Act B.E. 2522 (1979).
      </p>
    </article>
  );
}
