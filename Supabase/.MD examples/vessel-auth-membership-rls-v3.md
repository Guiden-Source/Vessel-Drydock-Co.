# Vessel — Auth, Membership e RLS (Supabase) — V3

Esta versão V3 refina o desenho de auth + membership + RLS do Vessel, incorporando considerações de:

- estrutura de policies multi-tenant no Supabase;
- riscos de performance com RLS em tabelas grandes e índices necessários;
- estratégias de debug quando RLS "esconde" dados de um usuário;
- diferenças entre usar RLS em tabelas e views filtradas;
- interação de RLS com triggers e stored procedures no Postgres.[web:188][web:209][web:141][web:214][web:191]

A estrutura geral (tabelas `profiles`, `organization_members`, funções `user_has_org_access` e `is_org_admin`, policies nas tabelas de negócio e logs de auditoria) permanece. Aqui destacamos apenas os pontos novos ou ajustados.

---

## 1. Exemplo de policy multi-tenant típica

O padrão central para multi-tenant no Vessel é: "usuário só acessa linhas cuja `organization_id` pertence a uma organização da qual ele é membro".[web:214][web:208][web:191]

Uma policy típica em Supabase/Postgres fica assim:

```sql
-- Tabela de membership
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role organization_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table organization_members enable row level security;

create index organization_members_user_idx
  on organization_members (user_id);

create index organization_members_org_idx
  on organization_members (organization_id);

-- Policy de acesso em uma tabela multi-tenant qualquer (ex.: operation_snapshots)
alter table operation_snapshots enable row level security;

create policy "Org members can access snapshots"
  on operation_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = operation_snapshots.organization_id
        and m.user_id = auth.uid()
    )
  );
```

Esse padrão, com `EXISTS` + índices em `organization_members`, é considerado uma forma robusta e performática de implementar RLS multi-tenant no Supabase.[web:191][web:227]

No Vessel, usamos a mesma ideia encapsulada na função `user_has_org_access(org_id uuid)` para deixar as policies mais legíveis.

---

## 2. Riscos de performance ao usar RLS em tabelas grandes

RLS é avaliado para cada linha retornada ou modificada, o que pode gerar overhead em tabelas muito grandes se as policies forem complexas ou mal indexadas.[web:227][web:229][web:206]

Riscos principais:

- Policies com subqueries sem índices (por exemplo, `EXISTS` em `organization_members` sem índices em `user_id`/`organization_id`) podem adicionar centenas de milissegundos às queries sob carga.[web:227][web:215]
- Policies muito complexas ou com funções lentas podem limitar a capacidade do otimizador em gerar planos eficientes, especialmente em joins grandes.[web:229][web:230]
- Em cenários extremos, o custo da avaliação de RLS pode ser superior ao da própria query, se não houver filtros adicionais.

Mitigações aplicadas no Vessel V3:

- Índices explícitos em `organization_members(user_id)`, `(organization_id)` e `(user_id, organization_id, role)`, que alinham com as colunas usadas nas subqueries de RLS.[web:215][web:206]
- Funções usadas em policies (`user_has_org_access`, `is_org_admin`) declaradas como `stable`, o que permite caching de resultado por transação e reduz reexecução desnecessária.[web:230]
- Policies simples e diretas, evitando lógicas condicionais excessivas ou dependência de dados da própria linha como parâmetros das funções.

Quando o volume de dados crescer, recomenda-se rodar `EXPLAIN ANALYZE` em queries críticas com RLS habilitado para identificar gargalos e, se necessário, ajustar índices ou simplificar policies.[web:227][web:206]

---

## 3. Como debugar RLS quando um usuário não vê seus dados

Um efeito colateral de RLS bem configurado é que queries simplesmente retornam **zero linhas** quando o usuário não tem acesso, sem erro explícito.[web:228][web:224]

Estratégia prática de debug:

1. **Reproduzir o contexto da sessão**:
   - usar o mesmo role de banco que o Supabase usa (`authenticated`/`anon`);
   - garantir que `auth.uid()` (ou claims relevantes) reflitam o usuário real.
2. **Rodar a mesma query que o app está executando** e observar o resultado.
3. **Verificar as funções auxiliares**:
   - testar diretamente `select user_has_org_access('<org_id>');` e `select is_org_admin('<org_id>');` para ver se estão retornando o esperado.
4. **Checar membership**:
   - confirmar se existe linha em `organization_members` com `user_id = auth.uid()` e o `organization_id` correto.
5. **Rever policies ativas**:
   - lembrar que múltiplas policies no mesmo comando se combinam com lógica OR (modo permissivo padrão), e uma policy mal escrita pode estar bloqueando ou permitindo acesso de forma inesperada.[web:191][web:209]

No `.md`, a recomendação é documentar um pequeno "runbook" de debug com esses passos, para que qualquer dev do time saiba diagnosticar problemas de RLS sem tentativa e erro aleatória.

---

## 4. RLS vs views com filtros

Tanto RLS quanto views podem ser usadas para limitar acesso a dados, mas funcionam de formas diferentes:[web:229][web:224][web:209]

- **RLS**:
  - é aplicado na tabela base;
  - vale para qualquer query, inclusive feita por ferramentas externas (BI, sql editor etc.);
  - garante defesa em profundidade, pois o banco é quem decide linha a linha o que devolver.
- **Views com filtros**:
  - são consultas predefinidas (por exemplo, `create view org_snapshots as select * from operation_snapshots where organization_id = current_setting('app.org_id')`);
  - podem ser otimizadas de forma mais agressiva pelo planner, porque o filtro faz parte da query base;
  - não protegem se alguém ignorar a view e consultar a tabela original diretamente.[web:229]

No Supabase/Postgres moderno, views podem ser configuradas com `security_invoker = true` para obedecer RLS das tabelas base, mas por padrão views criadas pelo superuser podem bypassar RLS.[web:209]

Para o Vessel, a decisão é:

- usar **RLS nas tabelas base** como camada de segurança principal;
- usar views apenas como conveniência de leitura (por exemplo, view que junta snapshot + indicadores), nunca como substituto de RLS.

---

## 5. RLS, triggers e stored procedures

RLS interage com triggers e funções de formas que você precisa conhecer para evitar brechas ou bloqueios inesperados:[web:224][web:230][web:209]

- **Triggers BEFORE/AFTER**: quando uma operação (insert/update/delete) dispara triggers, o RLS já foi ou será avaliado para a linha em questão; se RLS bloquear a operação, o trigger nem roda (no caso de insert/update/delete negado).[web:224]
- **Funções normais (security invoker)**: por padrão, funções rodam com o mesmo papel do chamador e **respeitam RLS**; qualquer `select` dentro da função será filtrado pelas policies.[web:209][web:224]
- **Funções `security definer`**: rodam com o papel do criador da função e podem **bypassar RLS**, o que é poderoso mas perigoso; devem ser usadas apenas em casos específicos e com muito cuidado.[web:230][web:209]

No Vessel V3:

- As funções auxiliares usadas nas policies (`user_has_org_access`, `is_org_admin`) são funções SQL simples, marcadas como `stable` e **não usam `security definer`**, para que continuem obedecendo a RLS e não abram brechas acidentais.[web:230]
- Se no futuro você precisar de funções administrativas que ignorem RLS (por exemplo, para relatórios internos cross-tenant), o ideal é:
  - criar funções `security definer` específicas;
  - restringir seu uso a um role interno (não ao `authenticated` geral);
  - documentar claramente que essas funções não estão protegidas por RLS.[web:230][web:209]

---

## 6. Conclusão da V3

A V3 do `vessel-auth-membership-rls` mantém a estrutura de auth/membership desenhada nas versões anteriores, mas agora deixa explícito:

- o padrão SQL de policies multi-tenant com `EXISTS` + índices adequados;
- os riscos e mitigadores de performance ao usar RLS em produção;
- um caminho claro de debug quando um usuário aparentemente "perde" acesso aos dados;
- a relação entre RLS, views, triggers e funções, evitando tanto brechas quanto bloqueios invisíveis.

Este arquivo deve substituir a V2 como referência principal para implementar e manter RLS do Vessel no Supabase.
