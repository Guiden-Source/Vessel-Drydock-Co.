# Vessel Dashboard — Tabelas Base (Supabase)

Este documento descreve o esquema lógico de tabelas para o Vessel (MVP multi-tenant em Next.js + Supabase), focado em snapshots de operação e nos blocos do dashboard.

O objetivo é servir de referência na hora de criar as migrations no Supabase e desenhar as políticas de RLS, já considerando alguns cuidados para evitar bugs silenciosos em produção.[web:89][web:105][web:141][web:188][web:191]

---

## 1. Tabela `organizations`

Identifica cada cliente (tenant).

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
```

**Pontos de atenção**

- `id` é o `organization_id` usado em todas as demais tabelas relacionadas ao Vessel.
- Se for usar domínios ou slugs públicos, considere adicionar colunas como `slug text unique`.

---

## 2. Tabela `operation_snapshots`

Representa a "foto" da operação digital de uma organização em um período.

```sql
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
```

**Pontos de atenção**

- O enum `snapshot_status_label` evita variações de texto e facilita filtros confiáveis.[web:190][web:193]
- O índice parcial `operation_snapshots_org_active_unique` evita múltiplos snapshots marcados como ativos para a mesma organização, um bug silencioso comum em sistemas de snapshots.[web:189][web:166]
- `created_by` permite saber quem gerou o snapshot (útil para auditoria e suporte).

---

## 3. Tabela `reading_items`

Itens da "Leitura da Drydock" vinculados a um snapshot.

```sql
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
```

**Pontos de atenção**

- Guardar sempre `organization_id` facilita RLS e evita depender de joins para filtrar por tenant.[web:188][web:191]
- O enum `reading_status` e a precisão de `progress` evitam variações de texto e valores fora da faixa esperada.[web:190]
- `sort_order` permite controlar a ordem visual dos itens sem depender de `created_at`.

---

## 4. Tabela `risk_items`

Riscos ativos para o período do snapshot.

```sql
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
```

**Pontos de atenção**

- O enum `risk_severity` garante integridade dos níveis de severidade.[web:190]
- `sort_order` permite priorizar a exibição dos riscos mais críticos.

---

## 5. Tabela `next_actions`

Próximas ações recomendadas no contexto do snapshot.

```sql
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
```

**Pontos de atenção**

- Enums para `owner` e `priority` evitam inconsistências e facilitam filtros no dashboard.[web:190]
- `sort_order` ajuda a exibir ações mais importantes primeiro.

---

## 6. Tabela `backlog_items`

Backlog de operação para o período do snapshot.

```sql
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
```

**Pontos de atenção**

- Cada snapshot tem seu próprio conjunto de backlog; não reutilize o mesmo registro entre snapshots.
- `backlog_status` como enum evita estados "meio-termo" ou grafia diferente.

---

## 7. Tabela `key_indicators`

Indicadores numéricos ou qualitativos mostrados no painel.

```sql
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
```

**Pontos de atenção**

- Separar `value_number` e `value_text` evita forçar tudo em string.
- `indicator_type` e `indicator_unit` como enums dão mais segurança de dados e ajudam na lógica do front-end.[web:190][web:193]
- `sort_order` permite controlar a ordem dos cards de indicador no dashboard.

---

## 8. Notas para RLS, multi-tenancy e auditoria

Estas tabelas assumem que você terá uma camada de usuário/perfil ligada a `organization_id` (por exemplo, uma tabela `organization_members` com `user_id` e `organization_id`).[web:89][web:141][web:188]

Boas práticas recomendadas para evitar problemas em produção:

- Habilitar **RLS em todas as tabelas** acima.
- Criar políticas que sempre filtrem por `organization_id`, usando uma tabela de membership, em vez de confiar apenas em parâmetros enviados pelo cliente.[web:105][web:191]
- Para admins internos, usar políticas específicas ou funções `security definer` que permitam visão cross-tenant sem quebrar o isolamento padrão.[web:141][web:188]
- Evitar queries no backend que ignorem `organization_id`, mesmo em endpoints "internos".

### Tabela opcional de log de publicação

Para melhorar rastreabilidade e debug de produção, você pode adicionar um log simples:

```sql
create table publication_log (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references operation_snapshots(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  action text not null,      -- 'created' | 'published' | 'unpublished'
  performed_by uuid,         -- user id
  created_at timestamptz not null default now()
);
```

Isso ajuda a entender quem criou, publicou ou alterou um snapshot caso algo estranho apareça no dashboard em produção.

---

Este documento é a base do schema de dados do Vessel, já incorporando:

- enums para estados críticos (status, severidades, tipos de indicador);
- índices pensados para multi-tenant e snapshot atual;
- proteção contra múltiplos snapshots ativos por organização;
- campos de ordenação para listas;
- ganchos para auditoria e RLS.

A partir dele, você pode criar as migrations no Supabase com segurança para rodar em produção.
