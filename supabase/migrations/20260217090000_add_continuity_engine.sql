-- Continuity engine: per-client state + cached snapshots

create table if not exists continuity_state (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  last_seen_at timestamptz,
  preferred_depth text not null default '2m'
    check (preferred_depth in ('2m', '10m', 'deep')),
  last_snapshot_hash text,
  last_snapshot_generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_continuity_state_last_seen
  on continuity_state(last_seen_at desc);

create table if not exists continuity_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references continuity_state(client_id) on delete cascade,
  snapshot_hash text not null,
  depth text not null
    check (depth in ('2m', '10m', 'deep')),
  since_at timestamptz not null,
  until_at timestamptz not null,
  payload jsonb not null,
  model_used text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  generated_at timestamptz default now(),
  unique (client_id, snapshot_hash, depth)
);

create index if not exists idx_continuity_snapshots_client_generated
  on continuity_snapshots(client_id, generated_at desc);

create index if not exists idx_continuity_snapshots_since_until
  on continuity_snapshots(since_at desc, until_at desc);
