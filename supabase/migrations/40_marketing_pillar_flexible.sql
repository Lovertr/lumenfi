-- ─────────────────────────────────────────────────────────
-- 40. Marketing pillar — drop CHECK constraint to allow new pillars
--     from viral content strategy (pain_debt, listicle_money,
--     pain_salary, aspiration, reflection, hope_referral,
--     pain_pov, story_arc, listicle_reel, listicle_countdown, etc.)
-- ─────────────────────────────────────────────────────────

alter table marketing_posts
  drop constraint if exists marketing_posts_content_pillar_check;

-- Keep column as free-form text; new n8n pillars will be validated by
-- the app layer + can iterate without schema changes.
