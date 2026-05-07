import { Card, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const AGENT_NAME = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'ทีม Lumenfi';
const AGENT_ALLIANZ_LICENSE = process.env.NEXT_PUBLIC_ALLIANZ_LICENSE ?? '[เลขที่ใบอนุญาต]';
const AGENT_CONTACT = process.env.NEXT_PUBLIC_AGENT_CONTACT ?? 'tintanee.t@gmail.com';

export function AgentInfoCard() {
  return (
    <Card className="border-primary/30">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">ที่ปรึกษาประกันของคุณ</p>
        <p className="mt-1 font-semibold">{AGENT_NAME}</p>
        <div className="mt-3 rounded-md border bg-background/60 p-3 text-xs">
          <p className="font-medium">Allianz Ayudhya</p>
          <p className="text-muted-foreground">เลขที่: {AGENT_ALLIANZ_LICENSE}</p>
          <p className="text-muted-foreground">ผลิตภัณฑ์: ครบทุกประเภท (ชีวิต · สุขภาพ · โรคร้าย · อุบัติเหตุ · บำนาญ)</p>
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
