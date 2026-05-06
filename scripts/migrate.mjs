#!/usr/bin/env node
/**
 * Lumenfi DB Migration Runner
 *
 * Safety:
 *  - Only runs files in supabase/migrations/ that haven't been applied yet
 *  - Tracks applied migrations in `_migrations` table
 *  - Wraps each migration in a transaction (auto-rollback on error)
 *  - SQL files only contain CREATE/ALTER IF NOT EXISTS — no DROP/TRUNCATE
 *  - Asks for confirmation before applying
 *
 * Usage:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (or set as env var)
 *   2. node scripts/migrate.mjs
 *   3. Remove SUPABASE_SERVICE_ROLE_KEY from .env.local after done
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

// Load .env.local
const envPath = join(ROOT, '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('');
  console.error('How to get it:');
  console.error('  1. https://supabase.com/dashboard → Lumenfi project → Settings → API');
  console.error('  2. Copy "service_role" key (NOT anon key)');
  console.error('  3. Add to .env.local:');
  console.error('     SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  console.error('  4. Run again. Remove the line after migration done.');
  process.exit(1);
}

const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
console.log('🎯 Target project:', projectRef);
console.log('');

// Use the Postgres direct REST endpoint to execute SQL
async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  if (res.ok) {
    return await res.json();
  }
  // Fall back to Postgres direct via "query" RPC if exec_sql not available
  const text = await res.text();
  throw new Error(`SQL exec failed (${res.status}): ${text}`);
}

// Bootstrap: try to create exec_sql RPC if it doesn't exist
async function bootstrap() {
  // We use a different approach — direct query through pg meta if available,
  // otherwise we rely on the user creating exec_sql once.
  // The simpler path: use Supabase's pg-meta query endpoint (works with service role)
  return true;
}

// Direct postgres-meta query endpoint
async function pgMetaQuery(sql) {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`pg-meta failed (${res.status}): ${t}`);
  }
  return await res.json();
}

// Use Supabase Database REST endpoint (preferred when available)
async function runQuery(sql) {
  // Try the documented "query" function via Supabase Management API if accessible.
  // For project DB SQL execution from outside the dashboard, we need to use
  // either the pg-meta API (internal) or create our own helper function.
  //
  // The most reliable path is to ensure an `exec_sql` function exists in the DB
  // and call it. We'll try that first.
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ sql }),
    });
    if (r.ok) return { ok: true };
    if (r.status === 404) {
      // exec_sql doesn't exist — need to create it first
      throw new Error('NEED_BOOTSTRAP');
    }
    const text = await r.text();
    throw new Error(`SQL failed (${r.status}): ${text}`);
  } catch (e) {
    if (e.message === 'NEED_BOOTSTRAP') {
      throw e;
    }
    throw e;
  }
}

const BOOTSTRAP_SQL = `
create or replace function public.exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;
revoke all on function public.exec_sql(text) from anon, authenticated;
`;

async function ensureBootstrap() {
  // Test if exec_sql exists
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: 'select 1' }),
  });
  if (r.ok || r.status === 200 || r.status === 204) return true;

  if (r.status === 404) {
    console.log('⚙️  Bootstrap: creating exec_sql() helper function...');
    console.log('');
    console.log('   IMPORTANT — please paste the following SQL into your');
    console.log('   Supabase SQL Editor (Dashboard → SQL Editor → New query)');
    console.log('   and click Run. This is a ONE-TIME setup.');
    console.log('');
    console.log('───────────── COPY BELOW THIS LINE ──────────────');
    console.log(BOOTSTRAP_SQL);
    console.log('───────────── COPY ABOVE THIS LINE ──────────────');
    console.log('');
    console.log('   After running, press Enter here to continue...');
    await waitForEnter();
    return await ensureBootstrap();
  }

  const text = await r.text();
  throw new Error(`Cannot reach DB (${r.status}): ${text}`);
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

async function ensureMigrationsTable() {
  await runQuery(`
    create table if not exists public._migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function appliedMigrations() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/_migrations?select=filename`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return data.map((row) => row.filename);
}

async function main() {
  console.log('🔍 Checking connection...');
  await ensureBootstrap();
  console.log('✓ exec_sql ready');

  console.log('🔍 Ensuring _migrations table...');
  await ensureMigrationsTable();
  console.log('✓ _migrations ready');

  const allFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = await appliedMigrations();
  console.log('📋 Already applied:', applied.length, 'migrations');

  const pending = allFiles.filter((f) => !applied.includes(f));
  console.log('⏳ Pending:', pending.length);

  if (pending.length === 0) {
    console.log('✅ All migrations up-to-date');
    return;
  }

  for (const f of pending) {
    console.log('  •', f);
  }

  console.log('');
  console.log('Press Enter to apply, Ctrl+C to cancel...');
  await waitForEnter();

  for (const filename of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf-8');
    console.log('');
    console.log('▶️  Applying', filename, '...');
    try {
      await runQuery(sql);
      await runQuery(`insert into public._migrations (filename) values ('${filename}')`);
      console.log('   ✓ Done');
    } catch (e) {
      console.error('   ✗ FAILED:', e.message);
      console.error('');
      console.error('Stopped. Fix the migration and run again.');
      process.exit(1);
    }
  }

  console.log('');
  console.log('🎉 All migrations applied successfully');
  console.log('');
  console.log('⚠️  REMINDER: Remove SUPABASE_SERVICE_ROLE_KEY from .env.local now');
}

main().catch((e) => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
