/**
 * Agent queries with backward-compatible fallback chain:
 *   1. profiles.assigned_agent_id → that agent
 *   2. is_default=true agent → fallback
 *   3. env vars (NEXT_PUBLIC_BLA_LICENSE etc.) → legacy bootstrap
 *
 * Always returns SOMETHING displayable so the insurance section never breaks.
 */

import { createClient } from '@/lib/supabase/server';

export interface AgentDisplay {
  id: string | null;                    // null if from env vars (legacy)
  display_name: string;
  company: string | null;
  agent_name: string;
  email: string;
  phone: string | null;
  line_id: string | null;
  license_number: string;
  license_valid_until: string | null;   // ISO date
  products: string[];
  bio: string | null;
  photo_url: string | null;
  booking_url: string | null;
  is_legacy: boolean;                   // true if from env vars
}

/** Email recipient for routing leads (assigned > default > env NOTIFY_EMAIL). */
export interface AgentRoute {
  agent_id: string | null;
  email: string;
  display_name: string;
}

const LEGACY_AGENT: AgentDisplay = {
  id: null,
  display_name: 'กรุงเทพประกันชีวิต (BLA)',
  company: 'BLA',
  agent_name: process.env.NEXT_PUBLIC_AGENT_NAME ?? 'ที่ปรึกษา Lumenfi',
  email: process.env.NEXT_PUBLIC_AGENT_CONTACT ?? 'tintanee.t@gmail.com',
  phone: process.env.NEXT_PUBLIC_AGENT_PHONE ?? null,
  line_id: null,
  license_number: process.env.NEXT_PUBLIC_BLA_LICENSE ?? '6801055107',
  license_valid_until: null,
  products: ['life', 'health', 'ci', 'retirement', 'savings'],
  bio: null,
  photo_url: null,
  booking_url: null,
  is_legacy: true,
};

/** Public: get the agent that should be displayed for this user. */
export async function getAgentForUser(userId: string | null | undefined): Promise<AgentDisplay> {
  const supabase = createClient();

  // 1. User's assigned agent
  if (userId) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('assigned_agent_id')
        .eq('id', userId)
        .maybeSingle();
      const assignedId = (prof as any)?.assigned_agent_id;
      if (assignedId) {
        const agent = await fetchAgent(assignedId);
        if (agent) return agent;
      }
    } catch {}
  }

  // 2. Default agent
  const def = await getDefaultAgent();
  if (def) return def;

  // 3. Legacy env-var fallback
  return LEGACY_AGENT;
}

/** Lookup the is_default=true active agent. */
export async function getDefaultAgent(): Promise<AgentDisplay | null> {
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('agents')
      .select(
        'id, display_name, company, agent_name, email, phone, line_id, license_number, license_valid_until, products, bio, photo_url, booking_url'
      )
      .eq('is_default', true)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return { ...(data as any), is_legacy: false };
  } catch {
    return null;
  }
}

/** Fetch by id (active agents only). */
export async function fetchAgent(id: string): Promise<AgentDisplay | null> {
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('agents')
      .select(
        'id, display_name, company, agent_name, email, phone, line_id, license_number, license_valid_until, products, bio, photo_url, booking_url, status'
      )
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    if ((data as any).status !== 'active') return null;
    return { ...(data as any), is_legacy: false };
  } catch {
    return null;
  }
}

/** Resolve where to send a quote-request email for this user.
 * Enforces:
 *   - Agent must be status='active'
 *   - If trial sub: trial_leads_used must be < trial_leads_cap
 *   - If paid sub: current_period_end must be in the future
 * On any failure, falls back to default agent (which always has unlimited).
 */
export async function getRouteForUser(userId: string | null | undefined): Promise<AgentRoute> {
  const supabase = createClient();
  let agent = await getAgentForUser(userId);

  // If user is assigned to a specific (non-legacy) agent, check their subscription
  if (agent.id && !agent.is_legacy) {
    try {
      const { data: sub } = await supabase
        .from('agent_subscriptions')
        .select('plan, status, current_period_end, trial_leads_used, trial_leads_cap')
        .eq('agent_id', agent.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = Date.now();
      let overLimit = false;

      if (!sub) {
        // No active subscription → can't route to this agent
        overLimit = true;
      } else {
        const s = sub as any;
        const periodEnd = s.current_period_end ? new Date(s.current_period_end).getTime() : 0;
        if (periodEnd < now) overLimit = true;
        if (
          s.plan === 'trial' &&
          (s.trial_leads_used ?? 0) >= (s.trial_leads_cap ?? 3)
        ) {
          overLimit = true;
        }
      }

      if (overLimit) {
        // Fall through to default agent
        const def = await getDefaultAgent();
        if (def && def.id !== agent.id) {
          agent = def;
        } else {
          // Default unavailable → legacy env vars (always works)
          agent = LEGACY_AGENT;
        }
      }
    } catch {}
  }

  return {
    agent_id: agent.id,
    email: agent.email,
    display_name: agent.display_name,
  };
}

/** Look up an agent by invite code (used by /i/[code] route). */
export async function getAgentByInviteCode(code: string): Promise<AgentDisplay | null> {
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('agents')
      .select(
        'id, display_name, company, agent_name, email, phone, line_id, license_number, license_valid_until, products, bio, photo_url, booking_url, status'
      )
      .eq('invite_code', code.toUpperCase())
      .maybeSingle();
    if (!data) return null;
    if ((data as any).status !== 'active') return null;
    return { ...(data as any), is_legacy: false };
  } catch {
    return null;
  }
}

/** Get the agent record owned by the current user (for agent dashboard). */
export async function getMyAgent(userId: string): Promise<any | null> {
  const supabase = createClient();
  try {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

/** Generate a unique-ish invite code for a new agent. */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'AGT';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
