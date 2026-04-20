# ecp - digital bank — Especificação de Design & Identidade Visual

> **Versão:** 3.0  
> **Data:** 03/03/2026  
> **Status:** Em desenvolvimento  

---

## 1. Identidade Visual

### 1.1. Paleta de Cores

| Token | Valor | Uso |
|-------|-------|-----|
| Background | `#0b0f14` | Fundo principal da aplicação |
| Surface | `#131c28` | Cards, modais e superfícies elevadas |
| Secondary Background | `#0f1620` | Sidebar, áreas alternadas |
| Border | `#27364a` | Bordas de cards e separadores |

### 1.2. Cor de Acento

| Token | Valor | Uso |
|-------|-------|-----|
| Lime (Acento) | `#b7ff2a` | CTAs, links ativos, badges, destaques |
| Lime Pressed | `#7ed100` | Estado hover/pressed do acento |

### 1.3. Cores Semânticas

| Token | Valor | Uso |
|-------|-------|-----|
| Success | `#3dff8b` | Valores positivos, confirmações |
| Warning | `#ffcc00` | Alertas |
| Danger | `#ff4d4d` | Erros, valores negativos |
| Info | `#4da3ff` | Informações, links |

### 1.4. Tipografia

| Token | Valor | Uso |
|-------|-------|-----|
| Text Primary | `#eaf2ff` | Textos principais |
| Text Secondary | `#a9b7cc` | Textos auxiliares |
| Text Tertiary | `#7b8aa3` | Labels e placeholders |
| Fonte | Inter | Família tipográfica principal |

### 1.5. Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| Border Radius (Card) | 18px | Cards e superfícies |
| Border Radius (Control) | 13px | Botões e inputs |

---

## 2. Tecnologias de Estilização

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **Tailwind CSS** | 3.4 | Estilização utility-first para UIs modernas e consistentes |
| **Lucide React** | — | Ícones SVG para sidebar, botões de ação e status |

---

## 3. Componentes de UI

O projeto utiliza componentes próprios (sem shadcn/ui), localizados em `web/src/components/ui/`:

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Button | `Button.tsx` | Botão principal com variantes (primary, secondary, ghost, danger) |
| Card | `Card.tsx` | Container com superfície elevada (Surface) e border radius 18px |
| Input | `Input.tsx` | Campo de entrada com border radius 13px e estados de validação |
| Modal | `Modal.tsx` | Diálogo com overlay e superfície elevada |
| Table | `Table.tsx` | Tabela de dados com estilização consistente |
| Badge | `Badge.tsx` | Tag visual para status e categorias |

---

## 4. Componentes de Layout

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Sidebar | `Sidebar.tsx` | Menu lateral com fundo Secondary Background (`#0f1620`) |
| Header | `Header.tsx` | Barra superior com nome do usuário e notificações |
| MobileNav | `MobileNav.tsx` | Navegação mobile como bottom tab bar |

---

## 5. Referência CSS — Variáveis do Tema

```css
/* web/src/styles/globals.css */

:root {
  /* Backgrounds */
  --color-background: #0b0f14;
  --color-surface: #131c28;
  --color-secondary-bg: #0f1620;

  /* Borders */
  --color-border: #27364a;

  /* Accent */
  --color-lime: #b7ff2a;
  --color-lime-pressed: #7ed100;

  /* Text */
  --color-text-primary: #eaf2ff;
  --color-text-secondary: #a9b7cc;
  --color-text-tertiary: #7b8aa3;

  /* Semantic */
  --color-success: #3dff8b;
  --color-warning: #ffcc00;
  --color-danger: #ff4d4d;
  --color-info: #4da3ff;

  /* Radius */
  --radius-card: 18px;
  --radius-control: 13px;

  /* Typography */
  --font-family: 'Inter', sans-serif;
}
```

---

*Documento gerado para o projeto ecp - digital bank — v3.0*
