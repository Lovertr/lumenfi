-- ================================================================
-- Migration 27: Agent lead access
-- ----------------------------------------------------------------
-- Allow agents to read + update insurance_leads where they are the
-- assigned agent (insurance_leads.agent_id = their agents.id).
--
-- Existing policy `il_owner_all` (user owns their leads) is preserved
-- — both policies stack with OR.
-- ================================================================

drop policy if exists il_agent_access on insurance_leads;
create policy il_agent_access on insurance_leads
  for all to authenticated
  using (
    agent_id is not null
    and agent_id in (select id from agents where user_id = auth.uid())
  )
  with check (
    agent_id is not null
    and agent_id in (select id from agents where user_id = auth.uid())
  );
