# 🚀 ECP AI Squad — Multi-Agent Product Squad (v3.3)

Squad de agentes de IA para desenvolvimento de produto completo — do contexto estratégico ao deploy em produção — operado com Human in the Loop (HITL).

## Como Funciona

O squad recebe **3 arquivos markdown + 1 repositório destino** e executa 4 fases sequenciais com 12 checkpoints humanos, gerando todos os artefatos de produto, design, código e operação.

## Pré-Requisitos

### 4 Inputs Obrigatórios

| # | Input | O que define |
|---|-------|-------------|
| 1 | `product_briefing_spec.md` | O QUE construir — escopo funcional, regras de negócio |
| 2 | `tech_spec.md` | COMO construir — stack, arquitetura, regras de código |
| 3 | `design_spec.md` | COM QUE CARA — paleta, tipografia, tokens, componentes |
| 4 | Repositório destino | ONDE gravar — pasta destino de todos os outputs |

Os 3 arquivos devem estar na raiz do repositório destino:
```
{REPO_DESTINO}/
├── product_briefing_spec.md
├── tech_spec.md
└── design_spec.md
```

> **Template de referência para o `design_spec.md`:** `shared/identity/design_spec_template.md`
> **Estrutura esperada de cada arquivo:** `shared/schemas/input-contracts.md`

## Como Iniciar

### 1. Validar inputs
```bash
node validate-inputs.mjs /caminho/do/repo-destino
```

### 2. Abrir no Claude Code
```bash
cd ecp-ai-multi-agent-squad
claude
```

### 3. Iniciar a Fase 01
```
Inicie a Fase 01 — Contexto Estratégico.
Repositório destino: /caminho/do/repo-destino
```

O orquestrador vai:
1. Rodar o pre-flight check (script + validação comportamental)
2. Apresentar o relatório de validação
3. Se aprovado, acionar o Product Manager Agent

## Fases

| Fase | Agentes | HITLs | Input Primário |
|------|---------|-------|---------------|
| 01 — Contexto Estratégico | PM | #1 | `product_briefing_spec.md` |
| 02 — Product Discovery | PO, Designer | #2 #3 #4 #5 #6 | `product_briefing_spec.md` + `design_spec.md` |
| 03 — Product Delivery | Architect, Back, AI Engineer, Front, QA | #7 #8 #9 #10 | `tech_spec.md` + `design_spec.md` |
| 04 — Operação | Ops, PM | #11 #12 | `tech_spec.md` |

## Protótipos

| Tipo | Formato | Foco | Output |
|------|---------|------|--------|
| Low-Fi | HTML único, wireframe neutro | Risco de Valor | `{REPO}/02-product-discovery/prototype/low-fi.html` |
| High-Fi | HTML único, identidade do `design_spec.md` | Risco de Usabilidade + Valor | `{REPO}/02-product-discovery/prototype/high-fi.html` |

## Estrutura do Squad

```
ecp-ai-multi-agent-squad/
├── CLAUDE.md                    # Contrato de entrada + regras globais
├── validate-inputs.mjs          # Pre-flight check cross-platform (Node.js)
├── README.md                    # Este arquivo
├── agents/
│   ├── orchestrator/            # Coordenação e HITL
│   ├── product-manager/         # Estratégia e métricas
│   ├── product-designer/        # Research, ideação e protótipos
│   ├── product-owner/           # Priorização e estruturação
│   ├── software-architect/      # Domínio e arquitetura
│   ├── backend-developer/       # API e persistência
│   ├── ai-engineer/             # Chatbots, agentes IA, RAG e guardrails
│   ├── frontend-developer/      # Interface e integração
│   ├── qa/                      # Qualidade e testes
│   └── operations/              # CI/CD, infra e A/B
├── phases/
│   ├── 01-strategic-context/
│   ├── 02-product-discovery/
│   ├── 03-product-delivery/
│   └── 04-product-operation/
└── shared/
    ├── identity/                # Template de design_spec.md (referência)
    ├── memory/                  # Estado da sessão (context.json)
    └── schemas/                 # Contratos de comunicação e input
```

## Outputs Gerados no Repositório Destino

```
{REPO_DESTINO}/
├── product_briefing_spec.md     # [INPUT] Spec funcional
├── tech_spec.md                 # [INPUT] Spec técnico
├── design_spec.md               # [INPUT] Spec de design
├── 01-strategic-context/        # OKRs, OST, visão
├── 02-product-discovery/
│   ├── prototype/
│   │   ├── low-fi.html          # Wireframe navegável
│   │   └── high-fi.html         # Protótipo completo com identidade
│   ├── epics/
│   ├── features/
│   └── stories/
├── 03-product-delivery/         # Arquitetura, ADRs, código
├── 04-product-operation/        # SLOs, A/B, DORA
└── docs/                        # Site de documentação navegável
    ├── index.html
    ├── dashboard/
    └── INSTALACAO.md
```
