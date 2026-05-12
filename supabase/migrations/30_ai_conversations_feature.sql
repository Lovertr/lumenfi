-- ════════════════════════════════════════════════════════════════════
-- Migration 30 — add 'feature' column to ai_conversations + ai_messages
-- so we can separate Sales Coach AI history from general /ai chats.
-- ════════════════════════════════════════════════════════════════════
-- Why: Agents have a different AI persona (Sales Coach) with its own
-- system prompt, and conversations shouldn't mix with personal /ai
-- financial chats. Single-column tag is simpler than two new tables.

alter table ai_conversations
  add column if not exists feature text not null default 'general'
    check (feature in ('general', 'coach'));

alter table ai_messages
  add column if not exists feature text not null default 'general'
    check (feature in ('general', 'coach'));

-- Indexes — partial indexes per feature for fast list queries
create index if not exists idx_ai_conversations_user_feature
  on ai_conversations(user_id, feature, updated_at desc);

create index if not exists idx_ai_messages_conv_feature
  on ai_messages(conversation_id, feature, created_at);
