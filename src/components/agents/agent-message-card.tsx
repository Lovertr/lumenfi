import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

// Server component — shows on user's dashboard if their assigned agent
// has any active, non-expired messages.

export async function AgentMessageCard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's assigned agent
  const { data: prof } = await supabase
    .from('profiles')
    .select('assigned_agent_id')
    .eq('id', user.id)
    .maybeSingle();
  const agentId = (prof as any)?.assigned_agent_id;
  if (!agentId) return null;

  // Get active messages (RLS allows prospect to read their assigned agent's messages)
  const { data: messages } = await supabase
    .from('agent_messages')
    .select('id, title, body, cta_label, cta_url, created_at, expires_at')
    .eq('agent_id', agentId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  const msg = (messages as any[])?.[0];
  if (!msg) return null;
  if (msg.expires_at && new Date(msg.expires_at) < new Date()) return null;

  // Get agent display
  const { data: agent } = await supabase
    .from('agents')
    .select('agent_name, display_name, photo_url')
    .eq('id', agentId)
    .maybeSingle();
  if (!agent) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {(agent as any).photo_url ? (
            <img
              src={(agent as any).photo_url}
              alt={(agent as any).agent_name}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Shield className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              ข้อความจาก {(agent as any).agent_name}
            </p>
            <p className="mt-0.5 text-sm font-semibold">{msg.title}</p>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{msg.body}</p>
            {msg.cta_label && msg.cta_url && (
              <a
                href={msg.cta_url}
                target={msg.cta_url.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {msg.cta_label} <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
