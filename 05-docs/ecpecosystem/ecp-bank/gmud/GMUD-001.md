# GMUD-001 — Release Inicial do ECP Banco Digital v3.0

---

## 1. Identificação

| Campo | Valor |
|-------|-------|
| **Número** | GMUD-001 |
| **Título** | Release Inicial — ECP Banco Digital v3.0 (MVP) |
| **Tipo** | Normal |
| **Status** | Aprovada |
| **Prioridade** | Alta |
| **Solicitante** | Product Manager Agent |
| **Responsável técnico** | Operations Agent |
| **Change Manager** | Change Manager Subagent |
| **Data de criação** | 2026-03-04 09:00 |
| **Data planejada de execução** | 2026-03-05 10:00 |
| **Duração estimada** | 45 minutos |
| **Janela de manutenção** | 10:00 até 11:00 (BRT) |

---

## 2. Descrição da Mudança

### 2.1 O que vai mudar?
Primeiro deploy em produção do ECP Banco Digital v3.0 — aplicação completa com:
- **API Fastify** (9 módulos, 27 endpoints) rodando em Node.js
- **React SPA** (10 páginas, 9 componentes) servida como build estática
- **SQLite3** como banco de dados (arquivo único `database.sqlite`)
- Autenticação JWT + bcryptjs
- Seed com dados de demonstração

### 2.2 Por que vai mudar? (Motivação)
- MVP do ECP Banco Digital aprovado em todas as fases de produto (HITLs #1–#10)
- Objetivo: validar product-market fit com primeiros usuários
- OKR principal: Conquistar 15.000 WAU-EFI até Q2 2026
- Todas as 10 regras de negócio implementadas e testadas (29 test cases, 10/10 quality gates)

### 2.3 Escopo da mudança

| Componente | Alterado? | Descrição |
|-----------|-----------|-----------|
| Front End Web (React + Vite) | Sim | SPA completa com 10 páginas, dark theme + lime accent |
| API (Fastify 5.0) | Sim | 9 módulos REST com autenticação JWT |
| Banco de dados (SQLite3) | Sim | Schema com 9 tabelas, 12 índices, seed de desenvolvimento |
| Variáveis de ambiente | Sim | JWT_SECRET, DATABASE_PATH, PORT, VITE_API_URL |
| Dependências (npm) | Sim | Todas as deps listadas em server/package.json e web/package.json |
| GitHub Actions (CI/CD) | Sim | Pipeline ci.yml com lint, tests, build, GMUD gate, deploy |

### 2.4 Artefatos relacionados
- Pull Request: PR #1 (initial release)
- Épicos: EPIC-01 (Entrada Segura), EPIC-02 (Operações Diárias), EPIC-03 (Gestão Inteligente)
- Histórias: 25 user stories cobrindo 14 features
- HITL Approvals: #1 a #10 (todos aprovados)

---

## 3. Análise de Impacto

### 3.1 Usuários afetados
| Segmento | Impacto | Tipo |
|---------|---------|------|
| Nenhum (primeiro deploy) | Sem impacto — não há usuários em produção | Novo sistema |
| Early adopters convidados | Acesso inicial ao sistema | Novo comportamento |

### 3.2 Sistemas e integrações afetados
| Sistema | Tipo de impacto | Mitigação |
|---------|----------------|-----------|
| Servidor de produção (Node.js) | Novo deploy, configuração inicial | Validar pré-requisitos antes do deploy |
| Hosting estático (web) | Primeiro upload de build | Testar acesso após deploy |
| DNS/domínio | Configuração de registros A/CNAME | Verificar propagação de DNS |

### 3.3 Impacto nos SLOs
| SLO | Impacto esperado | Dentro do error budget? |
|-----|-----------------|------------------------|
| Disponibilidade API (≥ 99,5%) | Primeiro deploy — sem baseline | N/A (primeiro ciclo) |
| Latência p95 (< 500ms) | SQLite local — latência esperada < 100ms | Sim |
| Taxa de erro (< 0,5%) | Zero erros esperados em deploy limpo | Sim |

---

## 4. Análise de Risco

| # | Risco | Probabilidade | Impacto | Severidade | Mitigação |
|---|-------|--------------|---------|-----------|-----------|
| R01 | node-gyp falha ao compilar better-sqlite3 no servidor de produção | Média | Alto | 🟡 | Garantir Python 3 + Build Tools instalados no servidor |
| R02 | Variáveis de ambiente não configuradas corretamente | Baixa | Médio | 🟢 | Checklist de variáveis + .env.example como referência |
| R03 | Porta 3333 ocupada por outro processo no servidor | Baixa | Baixo | 🟢 | Verificar portas antes do deploy, configurar PORT via env |
| R04 | SQLite database.sqlite com permissões incorretas | Baixa | Médio | 🟢 | Verificar permissões de escrita no diretório do servidor |
| R05 | CORS bloqueando requests do frontend para a API | Média | Médio | 🟡 | Configurar CORS com origem correta do frontend |

**Nível de risco geral:** 🟢 Baixo (primeiro deploy, sem usuários existentes, sem migração de dados)

---

## 5. Plano de Execução

### 5.1 Pré-requisitos
- [x] Todos os HITLs aprovados (#1 a #10)
- [x] Pipeline CI passando (lint + typecheck + tests + build)
- [x] GMUD-001 criada e avaliada
- [ ] Servidor de produção provisionado (Node.js 20+, Python 3, Build Tools)
- [ ] Domínio configurado (DNS apontando para o servidor)
- [ ] Variáveis de ambiente configuradas no servidor
- [ ] Hosting estático configurado para o frontend

### 5.2 Passos de execução

| # | Passo | Responsável | Duração | Verificação |
|---|-------|------------|---------|-------------|
| 1 | Verificar pré-requisitos do servidor (Node.js, Python, Build Tools) | Operations | 3 min | `node -v && python3 --version` |
| 2 | Clonar repositório no servidor de produção | Operations | 2 min | `git clone` com sucesso |
| 3 | Instalar dependências: `npm ci` (raiz, server, web) | Operations | 5 min | Sem erros, better-sqlite3 compilado |
| 4 | Configurar variáveis de ambiente (`.env`) | Operations | 3 min | JWT_SECRET forte, DATABASE_PATH correto |
| 5 | Executar migrations: `npm run db:migrate` | Operations | 1 min | Tabelas criadas sem erro |
| 6 | Executar seed (opcional para demo): `npm run db:seed` | Operations | 1 min | Dados de teste inseridos |
| 7 | Build do frontend: `cd web && npx vite build` | Operations | 2 min | `dist/` gerado sem erros |
| 8 | Iniciar servidor API: `cd server && node --import tsx src/server.ts` | Operations | 1 min | "Server running on port 3333" |
| 9 | Configurar process manager (PM2): `pm2 start ecosystem.config.js` | Operations | 3 min | API respondendo com PM2 |
| 10 | Upload da build estática para hosting | Operations | 3 min | Frontend acessível via URL |
| 11 | Verificar CORS e conectividade frontend → API | Operations | 2 min | Login funcional no browser |
| 12 | Smoke test: login, dashboard, enviar Pix, extrato | QA | 10 min | Todos os fluxos críticos OK |
| 13 | Monitorar logs por 15 minutos | Operations | 15 min | Zero erros críticos |

### 5.3 Critérios de sucesso
- [ ] API respondendo em `/api/auth/login` com status 200
- [ ] Frontend carregando sem erros no console
- [ ] Login com usuário seed (marina@email.com) funcional
- [ ] Dashboard exibindo saldo e transações
- [ ] Pix enviar/receber funcional
- [ ] Zero erros críticos nos logs nos primeiros 15 min

---

## 6. Plano de Rollback

### 6.1 Gatilhos para rollback
- API não inicia após deploy
- Taxa de erro > 5% nos primeiros 15 minutos
- SQLite database corrompido
- Qualquer perda de dados detectada

### 6.2 Passos de rollback

**API (Node.js) — tempo estimado: 2 minutos**
1. Parar processo via PM2: `pm2 stop ecp-api`
2. Como é primeiro deploy, não há versão anterior para restaurar
3. Se necessário: corrigir o problema e re-deploy

**Frontend (build estática) — tempo estimado: 1 minuto**
1. Remover/substituir os arquivos em `dist/`
2. Substituir por página de manutenção

**Banco de dados — tempo estimado: 1 minuto**
1. SQLite é arquivo único — fazer backup antes do deploy
2. `cp database.sqlite database.sqlite.bak` (pré-deploy)
3. Restaurar: `cp database.sqlite.bak database.sqlite`

---

## 7. Comunicação

### 7.1 Notificações pré-mudança
| Público | Canal | Antecedência | Conteúdo |
|---------|-------|-------------|---------|
| Equipe técnica | Slack #deployments | 30 min | "Deploy GMUD-001 iniciando em 30 min — primeiro release ECP v3.0" |
| Stakeholders | E-mail | 24 horas | "ECP Banco Digital v3.0 será disponibilizado amanhã às 10h" |

---

## 8. Histórico e Aprovação

| Evento | Data/Hora | Responsável | Observação |
|--------|-----------|------------|-----------|
| GMUD criada | 2026-03-04 09:00 | Operations Agent | — |
| Análise de risco concluída | 2026-03-04 09:10 | Change Manager Subagent | Risco geral: Baixo |
| Submetida para aprovação | 2026-03-04 09:15 | Operations Agent | — |
| **APROVADA** | 2026-03-04 09:20 | **Change Manager Subagent** | Primeiro deploy, baixo risco, sem usuários afetados |

### Parecer do Change Manager
```
PARECER: APROVADA

Justificativa:
- Primeiro deploy em produção — risco inerentemente baixo (sem usuários existentes, sem migração)
- Nível de risco geral: BAIXO (score 6/30)
- Todas as 10 regras de negócio testadas e aprovadas
- Pipeline CI com quality gate obrigatório
- Plano de rollback simples (backup de arquivo SQLite)
- Janela de manutenção adequada (terça, horário comercial)

Condições:
1. Backup do database.sqlite ANTES de qualquer operação
2. Smoke test obrigatório após deploy (todos os fluxos críticos)
3. Monitoramento de logs por mínimo 15 minutos pós-deploy
```

---

## 9. Lições Aprendidas (pós-execução)
> *Preencher após a execução da mudança.*
