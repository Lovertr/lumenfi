import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MessageSquare, Shield } from 'lucide-react';
import { getAgentForUser, type AgentDisplay } from '@/lib/agents/queries';
import { createClient } from '@/lib/supabase/server';

// Server component — fetches the user's assigned agent (with default-agent +
// env-var fallback). Backward-compatible: if no agents in DB, shows legacy info.

export async function AgentInfoCard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const agent: AgentDisplay = await getAgentForUser(user?.id ?? null);

  const productLabels: Record<string, string> = {
    life: 'ชีวิต',
    health: 'สุขภาพ',
    ci: 'โรคร้าย',
    retirement: 'บำนาญ',
    savings: 'สะสมทรัพย์',
    accident: 'อุบัติเหตุ',
  };
  const products = agent.products
    .map((p) => productLabels[p] ?? p)
    .join(' · ');

  const licenseText = agent.license_valid_until
    ? `อายุใบอนุญาตถึง: ${agent.license_valid_until}`
    : null;

  return (
    <Card className="border-primary/30">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {agent.photo_url ? (
            <img
              src={agent.photo_url}
              alt={agent.agent_name}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              ที่ปรึกษาประกันของคุณ
            </p>
            <p className="mt-1 font-semibold">{agent.agent_name}</p>
            <p className="text-xs text-muted-foreground">{agent.display_name}</p>
          </div>
        </div>

        <div className="mt-3 rounded-md border bg-background/60 p-3 text-xs space-y-1">
          <p className="text-muted-foreground">
            เลขที่ใบอนุญาตตัวแทนประกันชีวิต: <span className="font-medium text-foreground">{agent.license_number}</span>
          </p>
          {licenseText && (
            <p className="text-muted-foreground">{licenseText}</p>
          )}
          {products && (
            <p className="text-muted-foreground">ผลิตภัณฑ์: {products}</p>
          )}
          {agent.bio && (
            <p className="text-muted-foreground italic">"{agent.bio}"</p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {agent.email}
            </a>
          )}
          {agent.phone && (
            <a
              href={`tel:${agent.phone}`}
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {agent.phone}
            </a>
          )}
          {agent.line_id && (
            <a
              href={`https://line.me/R/ti/p/${encodeURIComponent('@' + agent.line_id.replace(/^@/, ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {agent.line_id}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
