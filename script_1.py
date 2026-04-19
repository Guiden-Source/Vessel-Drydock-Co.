import os, textwrap
os.makedirs('output', exist_ok=True)
md = """# Vessel Dashboard — Modelo de Snapshot e Pontos de Erro

Este documento descreve o modelo de dados lógico do Vessel Dashboard (MVP multi-tenant em Next.js + Supabase) e destaca onde é mais fácil errar na implementação. Ele complementa o arquivo de riscos operacionais.

---

## 1. Conceito central: Snapshot de Operação

Tudo que o cliente vê no Vessel em um dado momento deve estar ligado a um **snapshot de operação**: uma foto da situação da empresa em um período específico.

Um `operation_snapshot` representa:

- o **status geral** da operação (ex.: Em rota);
- a **pontuação geral** (ex.: 85/100);
- o **período** analisado (semana, mês ou ciclo definido);
- o **diagnóstico executivo**;
- as coleções associadas: leitura detalhada, riscos, próximas ações, backlog e indicadores.

Isso evita que a UI leia dados soltos e sem contexto.

### 1.1. Entidade lógica `operation_snapshot`

Campos lógicos sugeridos:

- `id`: identificador único do snapshot.
- `organization_id`: qual empresa este snapshot representa.
- `period_start`: início do período analisado.
- `period_end`: fim do período analisado.
- `status_label`: `"em_rota" | "em_reparo" | "em_risco"`.
- `status_substatus`: texto como "Manutenção avançada em curso".
- `score_value`: número inteiro, por exemplo 85.
- `score_max`: número inteiro, normalmente 100.
- `summary_title`: ex.: "Resumo executivo".
- `summary_text`: resumo executivo da operação.
- `created_at`: quando o snapshot foi criado.
- `published_at`: quando foi liberado para o cliente.
- `is_active`: booleano indicando se é o snapshot atual da organização.

#### Possíveis erros nessa camada

- Criar dados espalhados em várias tabelas sem um snapshot central.
- Não vincular todos os dados ao `organization_id` **e** ao `snapshot_id`.
- Misturar dados de períodos diferentes no mesmo snapshot.
- Não registrar `published_at`, dificultando auditoria e histórico.
- Não ter um campo `is_active` e depender de convenções implícitas.

---

## 2. Bloco: Estado da Operação

UI atual:

- 85/100 – Em rota
- Manutenção avançada em curso

### 2.1. Modelo lógico

Esses campos vêm diretamente do snapshot:

- `operationStatus.score` → `snapshot.score_value`.
- `operationStatus.maxScore` → `snapshot.score_max`.
- `operationStatus.label` → `snapshot.status_label` (mapeado para texto amigável, ex.: "Em rota").
- `operationStatus.substatus` → `snapshot.status_substatus`.
- `operationStatus.lastUpdate` → `snapshot.published_at`.

### 2.2. Erros comuns

- Calcular `score` no front-end em vez de registrá-lo no snapshot.
- Exibir status sem deixar claro o período (cliente acha que é "agora").
- Hard-code de textos de status em vários componentes em vez de mapear a partir de enums.

---

## 3. Bloco: Leitura da Drydock

UI exemplo:

- Resumo executivo
- Diagnóstico: A operação digital está estável...
- Revisão de Tracking & UTMs – Concluído
- CRO: Landing Page Beta – Em andamento, 75%
- Auditoria de Conteúdo SEO – Agendado

### 3.1. Resumo da leitura

- `reading.title` → "Leitura da Drydock".
- `reading.summaryTitle` → "Resumo executivo".
- `reading.summaryText` → texto de diagnóstico.

No banco, isso mora no próprio snapshot:

- `snapshot.summary_title`.
- `snapshot.summary_text`.

### 3.2. Itens da leitura

Array de itens de checklist, tabela `reading_items`:

- `id`.
- `snapshot_id`.
- `organization_id`.
- `title` → ex.: "Revisão de Tracking & UTMs".
- `status` → enum: `"concluido" | "em_andamento" | "agendado"`.
- `progress` → opcional, número entre 0 e 1 (ex.: 0.75).
- `area` → opcional, como "tracking", "cro", "conteudo".
- `created_at`.

#### Possíveis erros

- Representar status como texto livre em vez de enum/padrão.
- Misturar itens de múltiplos snapshots.
- Não tratar `progress` como opcional.
- Exibir textos de análise que não correspondem ao snapshot publicado.

---

## 4. Bloco: Riscos Ativos

UI exemplo:

- Declínio temporário em tráfego orgânico – Médio
- Fadiga criativa na Campanha Q3 – Baixo
- Desatualização da tag principal de conversão – Baixo

### 4.1. Modelo lógico

Tabela `risk_items`:

- `id`.
- `snapshot_id`.
- `organization_id`.
- `title` → ex.: "Declínio temporário em tráfego orgânico".
- `severity` → enum: `"alto" | "medio" | "baixo"`.
- `area` → opcional ("organico", "criativo", "tracking").
- `note` → opcional.
- `created_at`.

### 4.2. Possíveis erros

- Não padronizar os níveis de severidade ("Médio", "medio", "Medium"...).
- Deixar riscos sem vínculo com snapshot ou organização.
- Exibir riscos antigos porque não se filtra pelo snapshot ativo.

---

## 5. Bloco: Próximas Ações

UI exemplo:

1. Aprovar Relatório Tático de SEO
2. Iniciar Campanha "Novo Horizonte"
3. Calibrar Ferramentas de Análise

### 5.1. Modelo lógico

Tabela `next_actions`:

- `id`.
- `snapshot_id`.
- `organization_id`.
- `text` → descrição da ação.
- `owner` → opcional: `"cliente" | "drydock"`.
- `priority` → opcional: `"alta" | "media" | "baixa"`.
- `due_date` → opcional.
- `created_at`.

### 5.2. Possíveis erros

- Não diferenciar o que é ação da Drydock vs. ação do cliente.
- Misturar ações de snapshots diferentes.
- Deixar ações antigas aparecendo como se fossem atuais.

---

## 6. Bloco: Backlog da Operação

UI exemplo:

- Inspeção de Funil – Fluxo B2B – Em Progresso
- Atualização de Conteúdo – Mapeamento – Pendente
- Análise de Feedback – Sprint Passada – Concluído
- Planejamento Q3 – Mesa Tática – Em Progresso

### 6.1. Modelo lógico

Tabela `backlog_items`:

- `id`.
- `snapshot_id`.
- `organization_id`.
- `title` → "Inspeção de Funil".
- `context` → "Fluxo B2B", "Mapeamento", etc.
- `status` → enum: `"pendente" | "em_progresso" | "concluido"`.
- `area` → opcional ("funil", "conteudo", "planejamento"...).
- `created_at`.

### 6.2. Possíveis erros

- Usar valores de status inconsistentes ("em progresso", "em_andamento"...).
- Compartilhar backlog entre empresas sem isolamento por organização.
- Não deixar claro quais itens foram reavaliados em snapshots seguintes.

---

## 7. Bloco: Indicadores-Chave

UI atual:

- Tráfego Site – +12%
- Social – Estável
- ROI Marketing – 4.5x (+11%)
- Saúde Digital – 92/100

### 7.1. Modelo lógico

Tabela `key_indicators`:

- `id`.
- `snapshot_id`.
- `organization_id`.
- `title` → "Tráfego do Site", "Social", "ROI Marketing", "Saúde Digital".
- `type` → `"percentage" | "status" | "multiplier" | "score"`.
- `value_number` → opcional (12, 4.5, 92...).
- `value_text` → opcional ("Estável").
- `unit` → `"percent" | "x" | "score" | "status"`.
- `trend_number` → opcional (0.11 para 11%).
- `trend_text` → opcional ("+11%"...).
- `created_at`.

### 7.2. Possíveis erros

- Tratar tudo como string e perder semântica para gráficos e alertas.
- Misturar períodos (tráfego semanal com ROI mensal) sem refletir isso em `period_start`/`period_end`.
- Não guardar a unidade (%, x, score).

---

## 8. Multi-tenancy e vínculo aos clientes

Todo dado deve ser sempre associado a:

- `organization_id` (cliente);
- `snapshot_id` (foto do período).

Modelo mental:

- `organizations` → empresas clientes.
- `operation_snapshots` → fotos periódicas da operação.
- `reading_items`, `risk_items`, `next_actions`, `backlog_items`, `key_indicators` → detalhes de cada foto.

### 8.1. Possíveis erros

- Tabelas sem `organization_id`, confiando apenas em `snapshot_id`.
- Queries filtrando só por `snapshot_id`, sem conferir se pertence à organização do usuário logado.
- Dados órfãos (sem snapshot ou sem organização) que nunca aparecem corretamente.

---

## 9. Contrato sugerido para o front-end (Next.js)

Payload mínimo para o dashboard:

```ts
type OperationSnapshotPayload = {
  snapshot: {
    id: string
    organizationId: string
    periodStart: string
    periodEnd: string
    statusLabel: "em_rota" | "em_reparo" | "em_risco"
    statusSubstatus: string
    scoreValue: number
    scoreMax: number
    summaryTitle: string
    summaryText: string
    publishedAt: string
  }
  readingItems: ReadingItem[]
  risks: RiskItem[]
  nextActions: NextAction[]
  backlog: BacklogItem[]
  indicators: KeyIndicator[]
}

type ReadingItem = {
  id: string
  title: string
  status: "concluido" | "em_andamento" | "agendado"
  progress?: number
  area?: string
}

type RiskItem = {
  id: string
  title: string
  severity: "alto" | "medio" | "baixo"
  area?: string
  note?: string
}

type NextAction = {
  id: string
  text: string
  owner?: "cliente" | "drydock"
  priority?: "alta" | "media" | "baixa"
  dueDate?: string
}

type BacklogItem = {
  id: string
  title: string
  context?: string
  status: "pendente" | "em_progresso" | "concluido"
  area?: string
}

type KeyIndicator = {
  id: string
  title: string
  type: "percentage" | "status" | "multiplier" | "score"
  valueNumber?: number
  valueText?: string
  unit?: "percent" | "x" | "score" | "status"
  trendNumber?: number
  trendText?: string
}
```

### 9.1. Possíveis erros no contrato

- Front e back divergirem nos enums (`"em_progresso"` vs `"em_andamento"`).
- Campos opcionais usados como obrigatórios ou vice-versa.
- Falta de tipagem end-to-end, gerando bugs silenciosos.

---

## 10. Recomendações finais

1. **Sempre começar por um snapshot ativo**: o front busca o snapshot e, a partir dele, as coleções associadas.
2. **Enumizar tudo o que representa estado**: status, severidade, tipos de indicador.
3. **Tratar estados vazios na UI**: sem snapshot, snapshot em preparação, erro de carregamento.
4. **Versionar snapshots**: não sobrescrever, criar um novo e marcar `is_active`.
5. **Escrever tipos TypeScript** com base neste documento antes de implementar a camada de dados.
6. **Usar este modelo como base** para o schema SQL do Supabase e para o formato de entrada (planilha/JSON) do processo diário de publicação.
"""

with open('output/vessel-data-model-and-errors.md','w',encoding='utf-8') as f:
    f.write(md)

'output/vessel-data-model-and-errors.md'