import { Card, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'ตฤณ ถิ่นธานี';
const AGENT_BLA_LICENSE = process.env.NEXT_PUBLIC_BLA_LICENSE ?? '6801055107';
const AGENT_LICENSE_VALID = process.env.NEXT_PUBLIC_BLA_LICENSE_VALID ?? '25-09-2568 ถึง 24-09-2569';
const AGENT_CONTACT = process.env.NEXT_PUBLIC_AGENT_CONTACT ?? 'tintanee.t@gmail.com';

export function AgentInfoCard() {
  return (
    <Card className="border-primary/30">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">ที่ปรึกษาประกันของคุณ</p>
        <p className="mt-1 font-semibold">{AGENT_NAME}</p>
        <div className="mt-3 rounded-md border bg-background/60 p-3 text-xs">
          <p className="font-medium">กรุงเทพประกันชีวิต (BLA)</p>
          <p className="text-muted-foreground">เลขที่ใบอนุญาตตัวแทนประกันชีวิต: {AGENT_BLA_LICENSE}</p>
          <p className="text-muted-foreground">อายุใบอนุญาต: {AGENT_LICENSE_VALID}</p>
          <p className="mt-1 text-muted-foreground">ผลิตภัณฑ์: ประกันสุขภาพ · ชีวิต · โรคร้าย · บำนาญ · สะสมทรัพย์</p>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <a href={`mailto:${AGENT_CONTACT}`} className="text-primary hover:underline">
            {AGENT_CONTACT}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
