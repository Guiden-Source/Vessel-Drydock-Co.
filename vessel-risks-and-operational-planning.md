# Drydock & Co. — Vessel MVP Real: riscos, previsões de problemas e pontos de atenção

## Visão geral

Este documento consolida os principais riscos técnicos, operacionais e de produto para o Vessel, um dashboard autenticado em Next.js com acesso cliente por cliente, pensado como painel consultivo da operação digital. A arquitetura sugerida para esse tipo de app favorece Next.js com Supabase, autenticação e isolamento por tenant, com Row Level Security (RLS) como camada central de proteção dos dados[cite:90][cite:93][cite:96].

O maior risco do projeto não está apenas na interface ou no framework, mas no encontro entre três frentes: multi-tenant real, atualização recorrente baseada em análise externa e promessa de clareza executiva para o cliente. Quando essas três frentes não são modeladas com cuidado, o produto tende a sofrer com vazamento entre tenants, dados inconsistentes, painéis desatualizados e percepção errada do valor entregue[cite:92][cite:93].

## Escopo assumido

O cenário considerado neste documento é:

- Site institucional atual em React.
- Vessel como app separado em Next.js.
- Login real por cliente.
- Cada cliente visualiza apenas os dados da própria empresa.
- Atualizações diárias ou recorrentes alimentadas por exportações de ferramentas externas e análises geradas fora do app.
- Dashboard com leitura consultiva, backlog, riscos, próximas ações e indicadores.

## Riscos estruturais de arquitetura

### Separação entre institucional e app

Manter o site institucional em React e o Vessel em Next.js é uma decisão pragmática para evitar migração prematura, mas cria alguns pontos de atenção: duplicação de componentes, inconsistência visual e divergência de regras de autenticação, deploy e observabilidade entre produtos que pertencem ao mesmo ecossistema[cite:72][cite:73].

Sem um design system mínimo compartilhado, o cliente pode sentir que está entrando em “outro produto” quando acessa o Vessel. Isso não é um bug funcional, mas é um bug de percepção de marca e de confiança.

### Acoplamento excessivo logo no início

Existe risco de tentar resolver cedo demais problemas de billing, permissões granulares, múltiplas organizações por usuário, automações em tempo real e ingestão complexa. Em MVP multi-tenant, o caminho mais seguro costuma ser restringir o escopo inicial e garantir primeiro três fundamentos: autenticação, isolamento por tenant e publicação consistente dos dados[cite:90][cite:96].

## Riscos críticos de multi-tenancy

### Vazamento de dados entre clientes

Este é o risco mais sério do projeto. Em um portal cliente por cliente, qualquer falha de modelagem ou de autorização pode expor leituras, métricas, backlog ou relatórios de uma empresa para outra. Em arquiteturas Supabase multi-tenant, o uso de RLS é amplamente recomendado justamente para impedir que o controle de acesso dependa apenas do front-end ou de filtros na aplicação[cite:93][cite:96].

Riscos específicos:

- Queries sem filtro por `organization_id`.
- Políticas RLS incompletas ou permissivas.
- Funções administrativas acessíveis por usuário comum.
- Reuso de componentes de fetch sem validação do contexto do tenant.
- Uploads ou anexos armazenados sem política de acesso equivalente.

### Modelagem confusa de usuários e empresas

Se o app nascer sem uma tabela clara de organizações e membros, o sistema rapidamente vira uma coleção de exceções. O mínimo saudável é separar `profiles`, `organizations` e `organization_members`, com cada dado operacional associado a uma organização específica[cite:92][cite:96].

Se esse modelo não existir desde o início, a correção posterior tende a ser cara e arriscada.

## Riscos ligados ao Supabase

### Políticas RLS mal testadas

RLS resolve muito, mas também cria uma falsa sensação de segurança quando implementado de forma parcial. Políticas escritas com pressa podem bloquear acessos legítimos, permitir acessos indevidos ou quebrar fluxos administrativos. Em apps reais, isso costuma aparecer quando um usuário cliente não consegue ver seus dados, ou pior, consegue ver dados demais[cite:90][cite:93].

### Auth inconsistente entre ambiente local e produção

Diferenças de domínio, cookies, redirects e configuração de autenticação podem fazer login funcionar no ambiente local e falhar em staging ou produção. Isso tende a piorar se o app usar subdomínio próprio, como `vessel.drydock.company`, porque o comportamento de sessão, callback URLs e links mágicos precisa estar muito bem configurado[cite:92][cite:94].

### Crescimento desorganizado do schema

Como o Vessel terá leitura consultiva, riscos, backlog, indicadores e snapshots operacionais, existe risco de criar tabelas demais sem convenção clara, ou guardar tudo em JSON sem critério. Isso acelera o início, mas complica auditoria, filtros, histórico e manutenção depois.

### Dependência excessiva de edge cases do Supabase

Supabase acelera muito o MVP, mas é comum times pequenos concentrarem toda a lógica em triggers, policies, functions e queries complexas antes de terem clareza do produto. O risco não é “usar Supabase”; o risco é transformar o banco em um emaranhado difícil de entender e versionar.

## Riscos de dados e atualização diária

### Defasagem entre fato e dashboard

Como o Vessel será atualizado por exportações e análises recorrentes, não em tempo real, existe risco de o cliente interpretar os dados como atuais demais. Isso gera expectativa errada e pode comprometer a confiança no painel.

Mitigações necessárias:

- Exibir sempre `última atualização` visível.
- Diferenciar “status consultivo atual” de “métricas do último ciclo publicado”.
- Evitar linguagem como “monitoramento em tempo real” se o processo for batch.

### Falha na cadeia de atualização diária

O processo descrito envolve várias etapas: exportar dados, analisar externamente, transformar em leitura publicável, salvar no sistema e disponibilizar ao cliente. Cada etapa pode falhar silenciosamente.

Pontos de falha típicos:

- exportação incompleta;
- arquivo corrompido;
- mudança no formato da origem;
- análise externa retornando estrutura inesperada;
- publicação parcial no banco;
- dashboard exibindo dado antigo sem aviso.

### Inconsistência entre fontes

GA4, Ads, CRM, planilhas e ferramentas sociais frequentemente contam coisas diferentes. Se o Vessel consolidar esses dados sem explicar origem, janela temporal e limite de confiança, o cliente pode achar que o dashboard “errou”, quando na verdade as fontes são naturalmente divergentes.

### Ausência de versionamento das leituras

Se cada atualização simplesmente sobrescrever a anterior, o time perde trilha histórica. Isso impacta auditoria, comparação entre ciclos, troubleshooting e até defesa comercial do trabalho feito.

O recomendável é pensar em `snapshots` ou `operation_reports` com data de publicação, versão e status de publicação.

## Riscos de produto e posicionamento

### Promessa maior do que a operação real

Se o Vessel for apresentado como “inteligência contínua em tempo real” mas operado por batch diário e análise manual, existe risco de desalinhamento entre marketing e realidade. Em produto B2B, essa fricção reduz confiança mais rápido do que um layout imperfeito.

### Dashboard bonito, mas pouco útil

Existe risco clássico de o painel ficar visualmente premium, mas responder mal às perguntas que importam ao cliente. No caso do Vessel, as perguntas centrais parecem ser:

- O que a Drydock encontrou?
- O que foi feito?
- O que está em risco?
- O que vem agora?
- Minha operação está melhorando ou não?

Se o app começar a privilegiar widgets genéricos demais, ele perde valor consultivo.

### Ambiguidade entre ferramenta interna e portal do cliente

Quando um produto nasce a partir de um processo interno, é comum ele ficar “meio admin, meio portal”. Isso costuma gerar:

- linguagem técnica demais para cliente final;
- excesso de campos operacionais;
- blocos úteis para a Drydock, mas confusos para o cliente.

## Riscos de UX e confiança

### Cliente não entende o que está vendo

O Vessel precisa comunicar claramente:

- status atual da operação;
- data da última revisão;
- diferença entre diagnóstico, backlog e indicadores;
- o que exige ação do cliente e o que está sob responsabilidade da Drydock.

Se isso não ficar evidente, o painel vira uma vitrine bonita, mas cansativa.

### Excesso de metáfora naval

A metáfora é um diferencial forte, mas pode virar ruído se aparecer acima da clareza. O cliente precisa entender rapidamente que se trata de marketing, web, social, dados e operação digital — nunca de logística real.

### Scores sem critério claro

“Pontuação de saúde digital” e status como “Em rota” funcionam bem, mas podem gerar desconfiança se parecerem arbitrários. Sempre que possível, esses status devem ter critério interno mínimo documentado, mesmo que a composição inclua leitura humana.

## Riscos operacionais internos

### Dependência de processo manual demais

Se a atualização do dashboard depender integralmente de uma pessoa lembrar de exportar, tratar, revisar e publicar, o processo vira frágil. Em especial, férias, correria comercial e aumento de clientes podem quebrar a disciplina de atualização.

### Gargalo na produção das análises

Se toda leitura consultiva depender de uma análise artesanal profunda, existe risco de o Vessel escalar mal. Isso não invalida o modelo; apenas exige separar bem o que é:

- cálculo repetível;
- preenchimento assistido;
- leitura realmente estratégica.

### Falta de trilha de publicação

Sem registro de quem publicou o quê, quando e para qual organização, o time perde capacidade de auditoria. Isso é importante tanto para controle interno quanto para retrabalho e defesa da operação diante do cliente.

## Riscos de segurança

### Controle de acesso insuficiente

Além do isolamento por tenant, será importante definir papéis mínimos como:

- administrador Drydock;
- operador Drydock;
- cliente admin;
- cliente viewer.

Sem isso, qualquer usuário da empresa cliente pode acabar tendo acesso a áreas ou ações indevidas.

### Vazamento por arquivos e anexos

Se relatórios, PDFs, planilhas ou imagens forem anexados ao Vessel, o risco deixa de ser só tabela e passa para storage. Storage sem política equivalente ao banco é um ponto comum de exposição em apps multi-tenant.

### Logs sensíveis

É comum expor emails, IDs, erros de banco e mensagens internas em logs, erros front-end ou consoles. Em portal cliente, isso deve ser tratado como superfície de risco reputacional e técnico.

## Riscos de performance e manutenção

### Crescimento desorganizado do front-end

Dashboards tendem a acumular filtros, cards, estados vazios, estados de erro e regras por perfil. Sem organização desde cedo, o front-end vira uma coleção de componentes acoplados e fetches repetidos.

### Regressões silenciosas

Ao mexer em um card, é fácil quebrar outro. Ao mudar o schema, é fácil afetar relatórios já publicados. Sem testes mínimos e sem ambientes separados, o app tende a sofrer com regressões pequenas, mas frequentes.

### Falta de staging real

Publicar direto em produção em um portal de clientes multiplica o risco. Mesmo em MVP, vale ter ao menos:

- ambiente local;
- staging;
- produção.

## Riscos de conteúdo e governança

### Linguagem inconsistente

Se a interface misturar linguagem de marketing, engenharia, produto e nautismo sem controle editorial, o cliente sente ruído. É importante definir um glossário mínimo dos termos oficiais do Vessel.

### Falta de padronização de status

Se backlog, riscos, operação e indicadores usarem escalas diferentes ou vagas (“alto”, “médio”, “atenção”, “instável”, “pendente crítico”), a leitura degrada rápido.

### Ausência de critério para publicação

É importante documentar quando uma leitura está “pronta para cliente”. Sem esse critério, existe risco de publicar conteúdo cru, incompleto ou ainda não validado.

## Riscos comerciais e contratuais

### Expectativa de suporte maior do que o combinado

Ao oferecer um dashboard elegante e com aparência de produto maduro, o cliente pode passar a esperar resposta em tempo real, automações mais avançadas e rastreabilidade que ainda não existem.

### Escopo implícito não contratado

Se o Vessel mostrar riscos, backlog e indicadores, alguns clientes podem interpretar isso como garantia de execução irrestrita. É importante distinguir visualmente o que é:

- diagnóstico;
- recomendação;
- item contratado;
- item fora de escopo.

## Recomendações práticas para o V1

### Prioridade alta

- Adotar `organization_id` em todos os dados relevantes.
- Implementar RLS desde o primeiro dia[cite:93].
- Definir papéis básicos de usuário.
- Exibir “última atualização” em local visível.
- Modelar snapshots/versionamento das leituras.
- Ter staging separado de produção.
- Criar checklist interno de publicação.

### Prioridade média

- Criar glossário de termos do Vessel.
- Definir critérios da pontuação de saúde digital.
- Padronizar escalas de risco, progresso e backlog.
- Estruturar trilha de auditoria de publicação.
- Começar com poucos blocos e pouca automação.

### Prioridade baixa, mas importante depois

- Automação de ingestão de dados.
- Notificações por email dentro do produto.
- Billing integrado.
- Permissões mais granulares por papel.
- Multi-organização por usuário.

## Estrutura mínima de documentação recomendada

Dentro da pasta do projeto, faz sentido manter ao menos os seguintes arquivos:

| Arquivo | Objetivo |
|---|---|
| `README.md` | visão geral do Vessel, stack, objetivos e estado do projeto |
| `RISKS.md` | riscos, mitigação e decisões de segurança/arquitetura |
| `ARCHITECTURE.md` | visão técnica do app, rotas, auth, multi-tenancy |
| `DATA_MODEL.md` | tabelas, relacionamentos e convenções de dados |
| `OPERATIONS.md` | fluxo diário de atualização, publicação e revisão |
| `GLOSSARY.md` | termos oficiais do produto, status, pilares e labels |
| `CHANGELOG.md` | mudanças importantes do sistema e de schema |

## Checklist inicial para abertura do projeto

- Definir domínio do app (`vessel.drydock.company`).
- Definir entidades principais do banco.
- Definir estratégia de auth e convite de usuários.
- Definir papéis e permissões mínimas.
- Definir modelo de snapshot/publicação.
- Definir processo diário de ingestão e revisão.
- Definir texto oficial do produto para evitar promessas erradas.
- Definir quais dados entram no V1 e quais ficam fora.

## Conclusão

O Vessel tem potencial claro como diferencial da Drydock & Co., mas seu risco principal não está em “conseguir construir um dashboard”. O risco principal está em construir um portal multi-tenant com promessa premium sem mecanismos proporcionais de isolamento, publicação, governança e clareza operacional[cite:93][cite:96].

O caminho mais seguro para o MVP é simples, mas disciplinado: Next.js separado, Supabase com RLS desde o início, modelo de organizações bem definido, snapshots versionados, atualização recorrente explícita e linguagem de produto honesta sobre o que é consultivo, o que é operacional e o que ainda não é tempo real[cite:90][cite:92][cite:93].
