-- ==========================================
-- 1. Criação do Enum e Tabela de Membership
-- ==========================================
create type organization_role as enum ('owner', 'admin', 'member');

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role organization_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- Índices de performance exigidos na versão V3 de RLS
create index if not exists organization_members_user_idx on organization_members (user_id);
create index if not exists organization_members_org_idx on organization_members (organization_id);
create index if not exists organization_members_user_org_idx on organization_members (user_id, organization_id, role);

-- ==========================================
-- 2. Habilitando RLS em Todas as Tabelas
-- ==========================================
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table operation_snapshots enable row level security;
alter table reading_items enable row level security;
alter table risk_items enable row level security;
alter table next_actions enable row level security;
alter table backlog_items enable row level security;
alter table key_indicators enable row level security;
alter table publication_log enable row level security;

-- ==========================================
-- 3. Função Auxiliar de Acesso (Stable)
-- ==========================================
create or replace function user_has_org_access(org_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

-- ==========================================
-- 4. Criação das Policies (Acesso baseado em Membership)
-- ==========================================

-- Organizations: Só vê a org se for membro dela
create policy "Membros podem ver suas organizações"
on organizations for select to authenticated
using ( user_has_org_access(id) );

-- Organization Members: Só vê os membros da sua própria org
create policy "Membros podem ver time da organização"
on organization_members for select to authenticated
using ( user_has_org_access(organization_id) );

-- Snapshots: Leitura, Escrita e Edição para quem tem acesso à respectiva org
create policy "Acesso a snapshots para membros da org"
on operation_snapshots for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

-- Demais Tabelas de Dados:
create policy "Acesso a reading_items para membros da org"
on reading_items for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

create policy "Acesso a risk_items para membros da org"
on risk_items for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

create policy "Acesso a next_actions para membros da org"
on next_actions for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

create policy "Acesso a backlog_items para membros da org"
on backlog_items for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

create policy "Acesso a key_indicators para membros da org"
on key_indicators for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

create policy "Acesso a publication_log para membros da org"
on publication_log for all to authenticated
using ( user_has_org_access(organization_id) )
with check ( user_has_org_access(organization_id) );

-- Obs.: Administradores geram orgs e primeiros users via Service Role Key do Supabase Backend ou Painel.
