-- ════════════════════════════════════════════════════════════════════
-- ONE-TIME: Copy user data from one account to another
-- ────────────────────────────────────────────────────────────────────
-- Mode: COPY (both accounts retain data — source NOT deleted)
-- Use case: ย้าย/ทำซ้ำข้อมูลจาก tintanee.t@gmail.com → trin_tintanee@hotmail.com
--
-- What's copied (per user request):
--   ✓ Core: accounts, transactions, categories, budgets
--   ✓ Investments: investments, investment_transactions, investment_dividends,
--                  investment_watchlist, portfolio_snapshots, recurring_investments
--   ✓ Goals
--   ✓ Insurance: insurance_policies
--   ✓ Recurring transactions
--   ✓ Net worth snapshots
--
-- What's EXCLUDED (per user request):
--   ✗ debts, debt_plans, debt_balance_adjustments, debt_payments
--   ✗ transactions.debt_id (set to NULL on copy)
--
-- Also implicitly excluded (device/profile-specific or auth-specific):
--   ✗ profile (target already has its own)
--   ✗ push_subscriptions
--   ✗ ai_conversations, ai_messages, advisor_reports
--   ✗ notifications log
--   ✗ agents, agent_subscriptions, agent_messages
--   ✗ referrals
--   ✗ payment_transactions, user_subscriptions, ai_credits, ai_usage_log
--
-- ────────────────────────────────────────────────────────────────────
-- HOW TO RUN:
--   1. Run "PART 1: PREVIEW" first to see row counts
--   2. Run "PART 2: FUNCTION DEFINITION" to install the helper function
--   3. Run "PART 3: EXECUTE COPY" inside a transaction (can rollback)
--   4. Run "PART 4: VERIFY" to confirm row counts match
-- ════════════════════════════════════════════════════════════════════


-- ═══ PART 1: PREVIEW (read-only — safe to run) ═══════════════════════
do $$
declare
  src_id uuid;
  tgt_id uuid;
  tbl text;
  cnt int;
  total int := 0;
  rec record;
begin
  select id into src_id from auth.users where email = 'tintanee.t@gmail.com';
  select id into tgt_id from auth.users where email = 'trin_tintanee@hotmail.com';
  raise notice '─── Source user (tintanee.t@gmail.com): % ───', src_id;
  raise notice '─── Target user (trin_tintanee@hotmail.com): % ───', tgt_id;
  if src_id is null then raise exception 'Source user not found'; end if;
  if tgt_id is null then raise exception 'Target user not found'; end if;

  raise notice '';
  raise notice '─── Source row counts (to be copied) ───';
  for rec in
    select unnest(array[
      'accounts','categories','transactions','budgets',
      'goals','goal_contributions',
      'investments','investment_transactions','investment_dividends',
      'investment_watchlist','portfolio_snapshots','recurring_investments',
      'recurring_transactions','insurance_policies','net_worth_snapshots'
    ]) as t
  loop
    -- Check if table exists before counting
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name = rec.t) then
      execute format('select count(*) from %I where user_id = $1', rec.t) into cnt using src_id;
      if cnt > 0 then
        raise notice '  % : % rows', rpad(rec.t, 30), cnt;
        total := total + cnt;
      end if;
    end if;
  end loop;
  raise notice '─── Total rows to copy: % ───', total;
end $$;


-- ═══ PART 2: FUNCTION DEFINITION (run once) ══════════════════════════
-- Helper function that copies one table from src_user → tgt_user.
-- Pre-allocates new UUIDs and stores old→new mapping in a temp table
-- so child tables can re-map their FKs.
--
-- Strategy: build dynamic SQL using information_schema so we don't need
-- to hardcode every column name. Excludes id (regenerated), user_id
-- (replaced), created_at/updated_at (default to now()).

create or replace function _copy_table(
  p_table text,
  p_src uuid,
  p_tgt uuid,
  p_fk_remap jsonb default '{}'::jsonb,  -- {"account_id": "account_map", ...}
  p_null_columns text[] default array[]::text[]  -- columns to set NULL (e.g. debt_id)
) returns int language plpgsql as $$
declare
  cols_select text;
  cols_insert text;
  sql text;
  cnt int;
  rec record;
  fk_col text;
  map_tbl text;
  select_expr text;
  has_id boolean;
begin
  -- Skip if table doesn't exist
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name = p_table) then
    raise notice '  (skip) % — table does not exist', p_table;
    return 0;
  end if;

  -- Detect whether the table has a top-level `id` UUID column (vs composite PK)
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name = p_table and column_name = 'id'
  ) into has_id;

  -- Drop + create mapping temp table only if we have an id column
  if has_id then
    execute format('drop table if exists %I_map', p_table);
    execute format('create temp table %I_map (old_id uuid, new_id uuid)', p_table);
  end if;

  -- Build column list (exclude id, user_id, created_at, updated_at, generated cols)
  cols_select := '';
  cols_insert := '';
  for rec in
    select column_name, is_generated
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table
      and column_name not in ('id', 'user_id', 'created_at', 'updated_at')
      and is_generated = 'NEVER'  -- skip generated columns
    order by ordinal_position
  loop
    cols_insert := cols_insert || ', ' || quote_ident(rec.column_name);
    -- If this column is in p_null_columns, select NULL
    if rec.column_name = any(p_null_columns) then
      select_expr := 'NULL';
    -- If this column is a remapped FK, join with map table
    elsif p_fk_remap ? rec.column_name then
      select_expr := format('(select new_id from %I where old_id = s.%I)',
                            p_fk_remap ->> rec.column_name, rec.column_name);
    else
      select_expr := 's.' || quote_ident(rec.column_name);
    end if;
    cols_select := cols_select || ', ' || select_expr;
  end loop;

  if has_id then
    -- Step 1: populate mapping temp table FIRST (separate statement so
    -- the INSERT below can see the mapping rows; data-modifying CTEs
    -- see only the snapshot from before the statement started)
    execute format(
      'insert into %I_map (old_id, new_id) '
      'select id, gen_random_uuid() from %I where user_id = $1',
      p_table, p_table
    ) using p_src;

    -- Step 2: insert actual rows using the mapping
    sql := format(
      'insert into %I (id, user_id %s) '
      'select m.new_id, $2 %s '
      'from %I s join %I_map m on m.old_id = s.id '
      'where s.user_id = $1',
      p_table, cols_insert, cols_select, p_table, p_table
    );
  else
    -- Composite PK / no id column — just INSERT...SELECT, no mapping needed
    sql := format(
      'insert into %I (user_id %s) select $2 %s from %I s where s.user_id = $1',
      p_table, cols_insert, cols_select, p_table
    );
  end if;

  execute sql using p_src, p_tgt;
  get diagnostics cnt = row_count;

  raise notice '  ✓ % : % rows copied', rpad(p_table, 30), cnt;
  return cnt;
end $$;


-- ═══ PART 3: EXECUTE COPY ════════════════════════════════════════════
-- Wrapped in transaction — can rollback if anything fails.
-- Order matters: parents before children (FK dependencies).

begin;

do $$
declare
  src uuid := (select id from auth.users where email = 'tintanee.t@gmail.com');
  tgt uuid := (select id from auth.users where email = 'trin_tintanee@hotmail.com');
  n int;
begin
  if src is null then raise exception 'Source user not found'; end if;
  if tgt is null then raise exception 'Target user not found'; end if;
  if src = tgt then raise exception 'Source = target — refusing to copy onto self'; end if;

  raise notice '═══ Copy starting: % → % ═══', src, tgt;

  -- ── Tier 1: independent tables (no FK to other user tables) ──
  perform _copy_table('categories',          src, tgt);
  perform _copy_table('accounts',            src, tgt);
  perform _copy_table('goals',               src, tgt);
  perform _copy_table('investments',         src, tgt);
  perform _copy_table('investment_watchlist', src, tgt);
  perform _copy_table('insurance_policies',  src, tgt);
  perform _copy_table('portfolio_snapshots', src, tgt);
  perform _copy_table('net_worth_snapshots', src, tgt);

  -- ── Tier 2: tables with FK to parent tables above ──
  -- transactions: account_id, category_id (FK remap); debt_id → NULL
  perform _copy_table(
    'transactions', src, tgt,
    p_fk_remap := '{"account_id": "accounts_map", "category_id": "categories_map"}'::jsonb,
    p_null_columns := array['debt_id']
  );

  -- budgets: depends on categories
  perform _copy_table(
    'budgets', src, tgt,
    p_fk_remap := '{"category_id": "categories_map"}'::jsonb
  );

  -- investment_transactions: depends on investments
  perform _copy_table(
    'investment_transactions', src, tgt,
    p_fk_remap := '{"investment_id": "investments_map"}'::jsonb
  );

  -- investment_dividends: depends on investments
  perform _copy_table(
    'investment_dividends', src, tgt,
    p_fk_remap := '{"investment_id": "investments_map"}'::jsonb
  );

  -- recurring_investments: depends on investments
  perform _copy_table(
    'recurring_investments', src, tgt,
    p_fk_remap := '{"investment_id": "investments_map"}'::jsonb
  );

  -- recurring_transactions: depends on accounts + categories
  perform _copy_table(
    'recurring_transactions', src, tgt,
    p_fk_remap := '{"account_id": "accounts_map", "category_id": "categories_map"}'::jsonb
  );

  -- goal_contributions (if exists): depends on goals + accounts
  perform _copy_table(
    'goal_contributions', src, tgt,
    p_fk_remap := '{"goal_id": "goals_map", "account_id": "accounts_map"}'::jsonb
  );

  raise notice '═══ Copy complete ═══';
end $$;

-- ⚠️  CHECK the NOTICE output above carefully!
-- If row counts look correct, COMMIT.
-- If anything looks wrong, ROLLBACK to undo everything.
--
-- To commit:
--   commit;
--
-- To rollback (undo all copies):
--   rollback;

-- IMPORTANT: Decide manually whether to commit or rollback.
-- The transaction is left OPEN by this script — you must explicitly
-- finalize by running either `commit;` or `rollback;` afterwards.


-- ═══ PART 4: VERIFY (run after COMMIT) ═══════════════════════════════
-- Compares row counts: source vs target. Numbers should be equal except
-- for tables that were excluded (debts) or rows pruned (transactions.debt_id NOT NULL).
--
-- Usage: after `commit;`, run this:
do $$
declare
  src uuid := (select id from auth.users where email = 'tintanee.t@gmail.com');
  tgt uuid := (select id from auth.users where email = 'trin_tintanee@hotmail.com');
  tbl text;
  cnt_src int;
  cnt_tgt int;
  rec record;
begin
  raise notice '─── Verification: src vs tgt row counts ───';
  for rec in
    select unnest(array[
      'accounts','categories','transactions','budgets',
      'goals','goal_contributions',
      'investments','investment_transactions','investment_dividends',
      'investment_watchlist','portfolio_snapshots','recurring_investments',
      'recurring_transactions','insurance_policies','net_worth_snapshots'
    ]) as t
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name = rec.t) then
      execute format('select count(*) from %I where user_id = $1', rec.t) into cnt_src using src;
      execute format('select count(*) from %I where user_id = $1', rec.t) into cnt_tgt using tgt;
      if cnt_src > 0 or cnt_tgt > 0 then
        raise notice '  % : src=% / tgt=% %', rpad(rec.t, 28), cnt_src, cnt_tgt,
          case when cnt_src = cnt_tgt then '✓' else '⚠ mismatch' end;
      end if;
    end if;
  end loop;
end $$;


-- ═══ ROLLBACK PLAN (if user wants to undo later) ═════════════════════
-- If you've already committed and want to undo all copied data from
-- target user, run this (UNCOMMENT before running):
--
-- delete from goal_contributions where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from recurring_transactions where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from recurring_investments where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from investment_dividends where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from investment_transactions where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from budgets where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from transactions where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from net_worth_snapshots where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from portfolio_snapshots where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from insurance_policies where user_id = (select id from auth.users where email='trin_tintanee@hotmail.com');
-- delete from i
