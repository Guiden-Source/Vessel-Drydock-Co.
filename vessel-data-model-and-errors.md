# Vessel Dashboard — Modelo de Dados e Possíveis Erros

Este documento descreve o modelo de dados lógico do Vessel Dashboard (MVP multi-tenant em Next.js + Supabase) e destaca pontos onde erros são mais prováveis na implementação, para servir como referência ao lado do arquivo de riscos operacionais.

## 1. Conceito central: Snapshot de Operação

Tudo que o cliente vê no Vessel em um dado momento deve estar ligado a um **snapshot de operação**: uma "foto" da situação da empresa em um período específico.

Um `operation_snapshot` representa:

- o **status geral** da operação (ex.: Em rota);
- a **pontuação geral** (ex.: 85/100);
- o **período** analisado (ex.: semana ou mês);
- o **diagnóstico executivo**;
- as coleções associadas: leitura detalhada, riscos, próximas ações, backlog e indicadores.

Isso evita que a UI leia dados soltos e sem contexto.

### 1.1. Entidade lógica `operation_snapshot`

Campos lógicos sugeridos:

- `id`: identificador único do snapshot.
- `organization_id`: qual empresa este snapshot representa.
- `period_start`: início do período analisado.
- `period_end`: fim do período analisado.
- `status_label`: texto como "Em rota", "Em reparo" ou "Em risco".
- `status_substatus`: texto como "Manutenção avançada em curso".
- `score_value`: número inteiro, por exemplo 85.
- `score_max`: número inteiro, normalmente 100.
- `summary_text`: resumo executivo da operação.
- `created_at`: quando o snapshot foi criado.
- `published_at`: quando foi liberado para o cliente.

### Possíveis erros nessa camada

- Criar campos espalhados em várias tabelas sem um snapshot central.
- Não vincular todos os dados ao `organization_id` **e** ao `snapshot_id`.
- Misturar dados de períodos diferentes no mesmo snapshot.
- Não registrar `published_at`, dificultando auditoria e histórico.


## 2. Bloco: Estado da Operação

UI atual:

- 85/100 – Em rota
- Manutenção avançada em curso

### Modelo lógico

- `operationStatus.score` → `85`.
- `operationStatus.maxScore` → `100`.
- `operationStatus.label` → `"Em rota"`.
- `operationStatus.substatus` → `"Manutenção avançada em curso"`.
- `operationStatus.lastUpdate` → data/hora (pode vir de `snapshot.published_at`).

Na prática, esses campos podem ser lidos diretamente de `operation_snapshot`.

### Erros comuns

- Calcular `score` no front-end em vez de registrar no snapshot.
- Exibir status sem deixar claro o período (cliente acha que é "agora").
- Usar textos soltos hard-coded, dificultando evolução do modelo.


## 3. Bloco: Leitura da Drydock

UI atual (exemplo):

- Executive Summary
- Diagnóstico: A operação digital está estável...
- Revisão de Tracking & UTMs – Concluído
- CRO: Landing Page Beta – Em andamento, 75%
- Auditoria de Conteúdo SEO – Agendado

### 3.1. Modelo lógico — resumo

- `reading.title` → "Leitura da Drydock".
- `reading.summaryTitle` → "Resumo executivo" (ou similar).
- `reading.summaryText` → texto de diagnóstico.

Esses campos podem viver na própria tabela de snapshot:

- `snapshot.summary_title`.
- `snapshot.summary_text`.

### 3.2. Modelo lógico — itens da leitura

Array de itens de checklist:

Cada item com:

- `reading.items[i].title` → por exemplo "Revisão de Tracking & UTMs".
- `reading.items[i].status` → "Concluído", "Em andamento", "Agendado".
- `reading.items[i].progress` → opcional, número entre 0 e 1 (ex.: 0.75).
- `reading.items[i].area` → opcional, como "Tracking", "CRO", "Conteúdo".

Na modelagem de banco, isso tende a virar uma tabela do tipo `reading_items` ligada a `operation_snapshot`.

### Possíveis erros

- Representar status como texto livre em vez de enum/padrão (difícil agrupar depois).
- Misturar itens de múltiplos snapshots.
- Não tratar `progress` como opcional (forçar 0% ou 100% para tudo).
- Exibir textos de análise que não foram sincronizados com o snapshot publicado.


## 4. Bloco: Riscos Ativos

UI atual (exemplo):

- Declínio temporário em tráfego orgânico – Médio
- Fadiga criativa na Campanha Q3 – Baixo
- Desatualização da tag principal de conversão – Baixo

### Modelo lógico

Array de riscos, cada risco com:

- `risks[i].title`.
- `risks[i].severity` → ex.: "Alto", "Médio", "Baixo".
- `risks[i].area` → opcional ("Orgânico", "Criativo", "Tracking").
- `risks[i].note` → opcional, comentário curto.

No banco, isso tende a ser `risk_items` com chave `snapshot_id`.

### Possíveis erros

- Não padronizar os níveis de severidade, gerando variações como "medio", "Medium", "Média".
- Deixar riscos sem vínculo com snapshot ou organização.
- Esquecer de expirar riscos antigos quando um novo snapshot for publicado.


## 5. Bloco: Próximas Ações

UI atual:

1. Aprovar Relatório Tático de SEO
2. Iniciar Campanha "Novo Horizonte"
3. Calibrar Ferramentas de Análise

### Modelo lógico

- `nextActions.title` → "Recomendações Prioritárias".
- `nextActions.items[i].text` → descrição da ação.

Extensões úteis:

- `nextActions.items[i].owner` → "cliente" ou "Drydock".
- `nextActions.items[i].dueDate` → data sugerida.
- `nextActions.items[i].impactLevel` → enum simples ("alto", "médio", "baixo").

No banco, isso pode ser uma tabela `next_actions` ligada ao snapshot.

### Possíveis erros

- Não diferenciar o que é ação da Drydock e o que é ação do cliente.
- Misturar ações de snapshots diferentes.
- Deixar ações antigas aparecendo como se fossem atuais por falta de ordenação por data.


## 6. Bloco: Backlog da Operação

UI atual (exemplo):

- Inspeção de Funil – Fluxo B2B – Em Progresso
- Atualização de Conteúdo – Mapeamento – Pendente
- Análise de Feedback – Sprint Passada – Concluído
- Planejamento Q3 – Mesa Tática – Em Progresso

### Modelo lógico

Cada item do backlog com:

- `backlog[i].title` → "Inspeção de Funil".
- `backlog[i].context` → "Fluxo B2B", "Mapeamento", etc.
- `backlog[i].status` → ex.: "Pendente", "Em Progresso", "Concluído".
- `backlog[i].area` → opcional, como "Funil", "Conteúdo", "Pesquisa", "Planejamento".

Tabela sugerida: `backlog_items` ligada a snapshot.

### Possíveis erros

- Usar valores de status inconsistentes ("em progresso", "em andamento", "progress").
- Tentar usar o mesmo backlog para múltiplas empresas sem isolamento.
- Não deixar claro na UI quais itens já migraram de um snapshot para o outro.


## 7. Bloco: Indicadores-Chave

UI atual:

- Tráfego Site – +12%
- Social – Estável
- ROI Marketing – 4.5x (+11%)
- Saúde Digital – 92/100

### Modelo lógico

Uma forma simples é tratar como 4 indicadores fixos;

Outra forma, mais flexível, é modelar como lista de indicadores tipados.

#### Modelo fixo (mais simples para o MVP)

- `indicators.traffic.value` → `+12%`.
- `indicators.traffic.trend` → `"up"` ou `+0.12`.
- `indicators.social.status` → `"Estável"`.
- `indicators.roi.value` → `4.5` (mostrar como `4.5x`).
- `indicators.roi.trend` → `+0.11` (ou `"+11%"`).
- `indicators.health.score` → `92`.
- `indicators.health.maxScore` → `100`.

#### Modelo genérico (para evoluir depois)

- `indicators[i].title` → "Tráfego do Site".
- `indicators[i].type` → "percentage" | "status" | "multiplier" | "score".
- `indicators[i].value` → número ou texto.
- `indicators[i].trend` → opcional (texto ou número).

Tabela sugerida: `key_indicators` ligada a snapshot.

### Possíveis erros

- Tratar todos os indicadores como texto e perder semântica (difícil para gráficos futuros).
- Misturar períodos (ex.: tráfego da semana com ROI do mês) sem explicitar isso.
- Não ter lugar para armazenar a unidade (%, x, score de 0–100).


## 8. Multi-tenancy e vinculação aos clientes

Todos os blocos acima precisam estar associados a **duas coisas**:

- organização (cliente);
- snapshot específico.

Modelo mental:

- `organization` → a empresa cliente.
- `operation_snapshot` → a foto de um período.
- `reading_items`, `risk_items`, `next_actions`, `backlog_items`, `key_indicators` → detalhes ligados ao snapshot.

### Possíveis erros

- Salvar itens só com `snapshot_id` e esquecer `organization_id` (quebra de isolamento ao fazer JOIN errado).
- Permitir que a aplicação consulte dados por `snapshot_id` sem validar se aquele snapshot pertence à organização logada.
- Criar dados órfãos (sem snapshot) que nunca aparecem corretamente.


## 9. Compatibilidade Next.js + Supabase (Vercel)

Hospedar o Vessel em Next.js na Vercel e usar Supabase como backend é uma combinação amplamente usada e suportada em 2026; o Supabase tem guias oficiais para apps Next.js com autenticação e RLS, e a Vercel é uma das principais plataformas recomendadas para deployments de Next.js com esse tipo de stack[cite:90][cite:96].

Pontos de atenção:

- configurar corretamente URLs de callback de login (domínio e subdomínio);
- garantir que variáveis de ambiente de produção e staging estejam alinhadas;
- tratar cookies/sessão em subdomínio (`vessel.drydock.company`).


## 10. Erros prováveis ao implementar no dashboard

### 10.1. Erros de front-end

- Fazer múltiplas chamadas soltas para cada bloco em vez de buscar um snapshot consolidado.
- Não tratar estados vazios (cliente recém-onboardado sem snapshot ainda).
- Não tratar estados de erro (snapshot não encontrado, problemas de auth).
- Duplicar lógica de transformação em vários componentes em vez de centralizar.

### 10.2. Erros de back-end / queries

- Consultar dados por `organization_id` sem filtrar por snapshot mais recente ou específico.
- Esquecer filtros de tenant em alguma consulta e vazar dados de outra empresa.
- Tentar calcular score e status na query sem registrar isso no snapshot (dificulta histórico).

### 10.3. Erros de sincronização com processo diário

- Publicar snapshot parcialmente preenchido.
- Atualizar apenas parte dos blocos (ex.: indicadores, mas não riscos).
- Não registrar qual snapshot está "ativo" para o cliente.
- Não ter rollback simples se um snapshot entrar com erro.


## 11. Recomendações práticas para implementação

1. **Sempre começar de um snapshot**: o front-end deve primeiro buscar o `operation_snapshot` ativo e, a partir dele, buscar detalhes.
2. **Padronizar enums** de status, severidade, tipos de indicador e níveis de prioridade.
3. **Tratar estados vazios** na UI: nenhum snapshot, snapshot em criação, snapshot despublicado.
4. **Registrar versões**: não sobrescrever snapshots antigos – criar um novo e marcar qual está ativo.
5. **Manter um contrato explícito** entre UI e backend: tipar em TypeScript os modelos `OperationSnapshot`, `RiskItem`, `NextAction`, etc., com os campos descritos aqui.
6. **Documentar o processo de publicação**: quem cria, quem revisa, quem aperta o botão de publicar.

Este documento não define o schema SQL final, mas serve como mapa para desenhar as tabelas do Supabase e os tipos do Next.js sem se perder em improvisos. 