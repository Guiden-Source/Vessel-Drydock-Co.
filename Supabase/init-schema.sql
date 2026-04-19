create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
-- Tipos auxiliares (opcional, mas recomendado)
create type snapshot_status_label as enum ('em_rota', 'em_reparo', 'em_risco');

create table operation_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status_label snapshot_status_label not null,
  status_substatus text not null,
  score_value integer not null,
  score_max integer not null default 100,
  summary_title text not null,
  summary_text text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  is_active boolean not null default false,
  created_by uuid
);

create index operation_snapshots_org_active_idx
  on operation_snapshots (organization_id, is_active);

-- Garante apenas um snapshot ativo por organização
create unique index operation_snapshots_org_active_unique
  on operation_snapshots (organization_id)
  where is_active = true;
create type reading_status as enum ('concluido', 'em_andamento', 'agendado');

create table reading_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  status reading_status not null,
  progress numeric(5,2),          -- 0.00 a 1.00
  area text,                       -- 'tracking', 'cro', 'conteudo', etc.
  sort_order integer,
  created_at timestamptz not null default now()
);

create index reading_items_org_snap_idx
  on reading_items (organization_id, snapshot_id);
create type risk_severity as enum ('alto', 'medio', 'baixo');

create table risk_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  severity risk_severity not null,
  area text,                 -- 'organico', 'criativo', 'tracking', etc.
  note text,
  sort_order integer,
  created_at timestamptz not null default now()
);

create index risk_items_org_snap_idx
  on risk_items (organization_id, snapshot_id);
create type action_owner as enum ('cliente', 'drydock');
create type action_priority as enum ('alta', 'media', 'baixa');

create table next_actions (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  text text not null,
  owner action_owner,
  priority action_priority,
  due_date date,
  sort_order integer,
  created_at timestamptz not null default now()
);

create index next_actions_org_snap_idx
  on next_actions (organization_id, snapshot_id);
create type backlog_status as enum ('pendente', 'em_progresso', 'concluido');

create table backlog_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  context text,              -- 'Fluxo B2B', 'Mapeamento', 'Mesa Tática', etc.
  status backlog_status not null,
  area text,                 -- 'funil', 'conteudo', 'planejamento', etc.
  sort_order integer,
  created_at timestamptz not null default now()
);

create index backlog_items_org_snap_idx
  on backlog_items (organization_id, snapshot_id);
create type indicator_type as enum ('percentage', 'status', 'multiplier', 'score');
create type indicator_unit as enum ('percent', 'x', 'score', 'status');

create table key_indicators (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,       -- 'Tráfego do Site', 'Social', etc.
  type indicator_type not null,
  value_number numeric(10,2),      -- 12, 4.50, 92.00
  value_text text,                 -- 'Estável'
  unit indicator_unit not null,
  trend_number numeric(10,4),      -- 0.1100
  trend_text text,                 -- '+11%'
  sort_order integer,
  created_at timestamptz not null default now()
);

create index key_indicators_org_snap_idx
  on key_indicators (organization_id, snapshot_id);
create table publication_log (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  action text not null,      -- 'created' | 'published' | 'unpublished'
  performed_by uuid,         -- user id
  created_at timestamptz not null default now()
);
