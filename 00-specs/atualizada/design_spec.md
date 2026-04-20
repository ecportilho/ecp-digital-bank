# ecp - digital bank — Especificação de Design & Identidade Visual

> **Versão:** 4.0 (as-built)
> **Data:** 20/04/2026
> **Status:** Implementado — reflete os tokens e componentes presentes em `03-product-delivery/app/web/`

---

## 1. Identidade Visual

A identidade dark-mode com acento lime foi preservada da v3.0 e está implementada em:

- **Paleta e tokens Tailwind**: `web/tailwind.config.ts:7`
- **Variáveis CSS runtime**: `web/src/styles/globals.css:5`

### 1.1. Paleta de Cores — Backgrounds

| Token | Valor | Classe Tailwind | Uso |
|-------|-------|-----------------|-----|
| Background | `#0b0f14` | `bg-background` | Fundo principal da aplicação (body) |
| Surface | `#131c28` | `bg-surface` | Cards, modais, header, sidebar (superfícies elevadas) |
| Secondary Background | `#0f1620` | `bg-secondary-bg` | Inputs, áreas alternadas, hover states |
| Border | `#27364a` | `border-border` | Bordas de cards, divisores |

### 1.2. Cor de Acento (Lime)

| Token | Valor | Classe Tailwind | Uso |
|-------|-------|-----------------|-----|
| Lime (acento) | `#b7ff2a` | `bg-lime`, `text-lime` | CTAs primários, links ativos, badge de notificação, logo |
| Lime Pressed | `#7ed100` | `bg-lime-pressed` | Estado hover/pressed de botões primários |
| Lime Dim | `rgb(183 255 42 / 0.1)` | `bg-lime-dim`, `text-lime-dim` | Background sutil de item ativo (ex.: perfil PF selecionado no `ProfileSwitcher`), badge `PJ` em lista |

### 1.3. Cores Semânticas

| Token | Valor | Classe Tailwind | Uso |
|-------|-------|-----------------|-----|
| Success | `#3dff8b` | `text-success`, `bg-success` | Créditos no extrato, badge "Ativo" do cartão |
| Warning | `#ffcc00` | `text-warning` | Alertas moderados (ex.: uso de cartão 70–89%) |
| Danger | `#ff4d4d` | `text-danger`, `bg-danger` | Erros, débitos destacados, badge "Bloqueado", botão sair |
| Info | `#4da3ff` | `text-info`, `bg-info` | Avatar do usuário no sidebar, informações |

### 1.4. Tipografia

| Token | Valor | Classe Tailwind | Uso |
|-------|-------|-----------------|-----|
| Text Primary | `#eaf2ff` | `text-text-primary` | Títulos, valores monetários, nomes |
| Text Secondary | `#a9b7cc` | `text-text-secondary` | Labels, descrições secundárias, navegação inativa |
| Text Tertiary | `#7b8aa3` | `text-text-tertiary` | Placeholders, timestamps, legendas |
| Família | Inter | `font-sans` | Fonte única em todo o app |

A fonte Inter é servida **localmente** via `web/public/fonts/inter/inter-{400,500,600,700}.woff2` declarados em 4 blocos `@font-face` no topo de `globals.css`. Não há mais dependência de CDN / Google Fonts; o `index.html` não contém mais `<link rel="preconnect">` para `fonts.googleapis.com`.

### 1.5. Border Radius

| Token | Valor | Classe Tailwind | Uso |
|-------|-------|-----------------|-----|
| Card | 18px | `rounded-card` | Cards, modais, containers principais |
| Control | 13px | `rounded-control` | Botões, inputs, badges, tabs |

### 1.6. Spacing tokens

| Token | Valor | Classe Tailwind | Uso |
|-------|-------|-----------------|-----|
| Inline | 8px | `gap-inline`, `p-inline`, `m-inline` | Distância entre elementos inline (icon + label) |
| Card gap | 16px | `gap-card-gap`, `p-card-gap` | Espaçamento padrão interno/entre cards |
| Section | 32px | `gap-section`, `py-section` | Separação entre seções da página |

Variáveis CSS equivalentes: `--spacing-inline`, `--spacing-card-gap`, `--spacing-section` em `globals.css`.

### 1.7. Shadow tokens

| Token | Classe Tailwind | Uso |
|-------|-----------------|-----|
| `card` | `shadow-card` | Sombra leve — `Card` default para leve elevação sobre o fundo |
| `elevated` | `shadow-elevated` | Sombra média — dropdowns (`ProfileSwitcher`, notificações no `Header`) |
| `modal` | `shadow-modal` | Sombra forte — overlays centrais (`Modal`, `ChatWidget` expandido) |

Variáveis CSS equivalentes: `--shadow-card`, `--shadow-elevated`, `--shadow-modal`. Substituíram os `shadow-lg`/`shadow-xl`/`shadow-2xl` inline antes usados diretamente.

### 1.8. Scrollbar customizada

Definida em `globals.css:45` (apenas webkit):

- Width/height: 6px
- Track: `var(--color-surface)`
- Thumb: `var(--color-border)` com hover para `var(--color-text-tertiary)`
- Border radius: 3px

---

## 2. Tecnologias de Estilização

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| **Tailwind CSS** | 3.4.4 | Utility-first + design tokens custom em `tailwind.config.ts` |
| **PostCSS** | 8.4.38 | Pipeline de build do Tailwind |
| **Autoprefixer** | 10.4.19 | Prefixos de vendor automáticos |
| **Lucide React** | 0.400.0 | Ícones SVG vetoriais (single source para navegação, ações, status) |

O Tailwind define `Inter` como família primária na config (`fontFamily.sans: ['Inter', 'sans-serif']`) e os arquivos woff2 são servidos de `web/public/fonts/inter/` via `@font-face` em `globals.css` — pipeline inteiramente local, sem CDN.

---

## 3. Componentes de UI — Biblioteca Própria

Localizada em `web/src/components/ui/`. **Sem shadcn/ui, sem Radix, sem nenhuma lib de componentes externa** — tudo construído à mão em cima de Tailwind.

| Componente | Arquivo | Variants / API |
|------------|---------|----------------|
| **Button** | `ui/Button.tsx` | `variant: 'primary' \| 'secondary' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md' \| 'lg'`, `isLoading`, `leftIcon`, `rightIcon`; usa `forwardRef` |
| **Card** | `ui/Card.tsx` | `variant: 'default' \| 'highlighted'` (highlighted aplica `border-lime/30`), `padding: 'none' \| 'sm' \| 'md' \| 'lg'`. Exporta também `CardHeader`, `CardTitle`, `CardContent` |
| **Input** | `ui/Input.tsx` | `label`, `error`, `hint`, `leftIcon`, `rightIcon`; estado de erro aplica `border-danger`; foco aplica `border-lime`. `forwardRef` |
| **Modal** | `ui/Modal.tsx` | Diálogo com overlay e superfície elevada |
| **Table** | `ui/Table.tsx` | Tabela de dados com estilo consistente (extrato, cartões) |
| **Badge** | `ui/Badge.tsx` | `variant` com cores semânticas (success/warning/danger/info) |

### 3.1. Variants do Button (extraídas de `Button.tsx:15`)

```typescript
const variantClasses = {
  primary:   'bg-lime text-background font-semibold hover:bg-lime-pressed active:bg-lime-pressed disabled:opacity-50',
  secondary: 'bg-surface border border-border text-text-primary hover:bg-secondary-bg disabled:opacity-50',
  ghost:     'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface disabled:opacity-50',
  danger:    'bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 disabled:opacity-50',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-control',
  md: 'px-5 py-2.5 text-sm rounded-control',
  lg: 'px-6 py-3 text-base rounded-control',
}
```

Focus ring: `focus:ring-2 focus:ring-lime/30`.

### 3.2. Classes globais de componentes

Definidas em `globals.css:64` via `@layer components`:

- **`.card`** — `bg-surface` + `rounded-card` + border + padding 1.5rem
- **`.btn-primary`** — fundo lime, texto `#0b0f14`, peso 600, rounded-control, hover lime-pressed
- **`.input-field`** — fundo secondary-bg, border, rounded-control, focus border-lime

---

## 4. Componentes de Layout

Localizados em `web/src/components/layout/`:

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| **Sidebar** | `layout/Sidebar.tsx` | Menu lateral (largura `w-64`, visível apenas em `lg:`), fundo `bg-surface`, borda direita `border-border`. Usa `NavLink` + `PixSubMenu` (colapsável). Estado ativo: `bg-lime/10 text-lime`. Logo lime no topo + rodapé com avatar do usuário (`bg-info/20`) e botão Sair (`hover:text-danger hover:bg-danger/10`) |
| **Header** | `layout/Header.tsx` | Barra superior (`px-6 py-4`), `bg-surface border-b border-border`. Contém `ProfileSwitcher`, saudação dinâmica ("Bom dia/tarde/noite, Nome"), e sino de notificações com badge de contagem (lime, canto sup. dir.). Dropdown 320px com até 5 notificações recentes + "Marcar todas como lidas" |
| **MobileNav** | `layout/MobileNav.tsx` | Bottom tab bar em mobile (oculto em `lg:`) |
| **ProfileSwitcher** | `layout/ProfileSwitcher.tsx` | Dropdown no header para alternar PF/PJ (UI-only; PJ não implementado no back) |

### 4.1. Layout raiz protegido (`App.tsx:20`)

```tsx
<div className="flex h-screen bg-background text-text-primary overflow-hidden">
  <Sidebar />                               {/* lg+ */}
  <div className="flex flex-col flex-1 overflow-hidden">
    <Header />
    <main className="flex-1 overflow-y-auto p-6">
      {children}
    </main>
  </div>
  <MobileNav />                             {/* <lg */}
  <ChatWidget />                            {/* floating, global */}
</div>
```

---

## 5. Chat Widget — UI Específica

O assistente IA tem dois entry points com o mesmo visual:

### 5.1. Widget flutuante global (`components/chat/ChatWidget.tsx`)

- **Botão flutuante** (fechado): `fixed bottom-6 right-6`, `w-14 h-14 rounded-full bg-lime text-background shadow-lg`, hover `bg-lime-pressed` + `scale-105`.
- **Painel aberto**:
  - Mobile (`w-full h-full`, sem radius)
  - Desktop `sm:w-[400px] sm:h-[600px] sm:rounded-card`
  - Header com avatar lime quadrado (`w-8 h-8 rounded-lg bg-lime`) + botão de "nova conversa" (ícone `RotateCcw`) + botão fechar (`X`)

### 5.2. Página dedicada (`routes/chat.tsx`)

- Layout split: sidebar de conversas (`w-72`, `md:+`) + área principal.
- Quick actions de primeira mensagem: "Consultar saldo", "Ver extrato", "Fazer PIX", "Meus cartões", "Limites PIX", "Status KYC".

### 5.3. Componentes do chat

| Componente | Arquivo |
|------------|---------|
| `ChatBubble.tsx` | Mensagem individual (user à direita, assistant à esquerda) |
| `ChatMessages.tsx` | Lista rolável com loading state |
| `ChatInput.tsx` | Input + botões de quick action |
| `ChatWidget.tsx` | Wrapper flutuante global |

---

## 6. Componentes Específicos do Dashboard

Todos construídos direto em `web/src/routes/dashboard.tsx` (sem extrair em subpasta — conforme o código atual):

- **Balance Card** com variant `highlighted`, gradient `from-surface to-secondary-bg`, toggle de visibilidade do saldo via ícone `Eye`/`EyeOff`.
- **Quick Actions** em grid de 4 colunas: Enviar Pix (lime), Receber Pix (success), Pagar boleto (info), Extrato (warning).
- **Spending by Category** — Donut chart SVG inline (viewBox 36×36) usando `stroke-dasharray`/`strokeDashoffset` para renderizar até 5 categorias coloridas. Paleta do donut: lime → info → warning → danger → success (`dashboard.tsx:70`).
- **Card Summary** — Mini cartão com gradient escuro (`from-[#1a2740] to-[#0d1622]`), número mascarado (**** **** **** 1234), badge "Ativo"/"Bloqueado" e barra de uso com cor progressiva:
  - `< 70%` → `bg-lime`
  - `≥ 70%` → `bg-warning`
  - `≥ 90%` → `bg-danger`
- **Recent Transactions** — Lista `divide-y divide-border/50`, ícone redondo de crédito (success) ou débito (danger), valor com `text-success` quando crédito.

---

## 7. Notificações (Dropdown do Header)

Visuais do dropdown em `Header.tsx:121`:

- Largura 320px, `bg-surface border border-border rounded-card shadow-2xl z-50`.
- Cada item: ícone Lucide por tipo (`ArrowLeftRight` para transaction, `Shield` para security, `Bell` para system, `Sparkles` para marketing).
- Não lidas: borda lateral esquerda `border-l-2 border-l-lime` + título em `font-semibold text-text-primary`.
- Lidas: `border-l-transparent` + título em `font-medium text-text-secondary`.
- Footer com botão "Marcar todas como lidas" (`text-lime hover:text-lime/80`).

---

## 8. Ícones (Lucide React)

Conjunto efetivamente usado no app (não exaustivo):

- **Navegação**: `LayoutDashboard`, `ArrowLeftRight`, `Zap`, `CreditCard`, `FileText`, `User`, `MessageCircle`, `ChevronDown`
- **Ações Pix**: `Send`, `ArrowDownLeft`, `Key`, `Search`, `ArrowRight`, `CheckCircle`
- **Status & segurança**: `Lock`, `Unlock`, `Shield`, `Bell`, `LogOut`
- **Saldo**: `Eye`, `EyeOff`, `TrendingUp`, `ArrowUpRight`
- **Notificações**: `Sparkles`, `CheckCheck`
- **Chat**: `MessageCircle`, `Plus`, `Archive`, `RotateCcw`, `X`

Tamanho padrão na sidebar: 18px. No header: 20px. Em badges: 10–14px.

---

## 9. Referência CSS — Variáveis do Tema

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
  --color-lime-dim: rgb(183 255 42 / 0.1);

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

  /* Spacing */
  --spacing-inline: 8px;
  --spacing-card-gap: 16px;
  --spacing-section: 32px;

  /* Shadow */
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.35);
  --shadow-elevated: 0 8px 24px rgb(0 0 0 / 0.4);
  --shadow-modal: 0 20px 48px rgb(0 0 0 / 0.55);

  /* Typography */
  --font-family: 'Inter', sans-serif;
}
```

Valores idênticos expostos no Tailwind via `tailwind.config.ts:7` — as duas fontes ficam sincronizadas manualmente.

---

## 10. Diretrizes Visuais Aparentes

Extraídas da leitura sistemática das páginas e componentes:

1. **Dark mode como default único** — não existe light mode no código.
2. **Acento lime reservado para ações primárias** — CTAs, estados ativos, brand mark. Nunca para texto normal.
3. **Monetário sempre via `formatCurrency(cents)`** — formato pt-BR, símbolo R$ com duas casas. Toggle `Eye/EyeOff` no dashboard oculta valores substituindo por `------`.
4. **Status sempre semântico** — credit = success, debit = default/danger, pendente = warning.
5. **Elevação por borda + sombra tokenizada** — superfícies se diferenciam principalmente via `bg-surface` + `border border-border`. Sombras vêm dos tokens `shadow-card` (leve, default do `Card`), `shadow-elevated` (dropdowns) e `shadow-modal` (overlays centrais).
6. **Transições padrão** — `transition-colors duration-150 ease` nos hovers; `transition-all duration-200` nos elementos interativos maiores (chat widget button).
7. **Spacing** — grid de 4 (Tailwind default). Tokens extras explícitos disponíveis: `inline` (8px), `card-gap` (16px), `section` (32px). Cards com `p-6`, inputs com `px-4 py-2.5`, botões md com `px-5 py-2.5`.
8. **Responsividade** — breakpoints Tailwind. Sidebar aparece em `lg:`, MobileNav em `<lg`. Headers com `md:` para saudação.
9. **Feedback de loading** — spinner SVG animado em Button (`animate-spin`) + ring lime (`border-2 border-lime border-t-transparent rounded-full animate-spin`) em carregamentos de página.
10. **Acessibilidade mínima** — `aria-label` em botões icon-only, `focus:ring-2 focus:ring-lime/30` em botões. Alt text em imagens não é relevante (sem imagens raster no app).

---

## 11. Componentes Previstos mas Não Mais Presentes na Estrutura Atual

A spec v3.0 mencionava subpastas específicas (`components/dashboard/`, `components/extrato/`, `components/pix/`, `components/cartoes/`) — na v4.0 implementada, **essas subpastas não existem**. O código foi consolidado:

- **Dashboard widgets** (`BalanceCard`, `QuickActions`) → inlinados em `routes/dashboard.tsx`
- **Extrato widgets** (`TransactionList`, `TransactionFilters`) → inlinados em `routes/extrato.tsx`
- **Pix widgets** (`TransferForm`, `KeyManager`, `QRCodeDisplay`) → inlinados em `routes/pix/*.tsx`
- **Cartões widgets** (`CardDisplay`, `InvoiceList`) → inlinados em `routes/cartoes.tsx`

**Nova estrutura presente** (não existia na v3.0):

- **`components/chat/`** com `ChatBubble`, `ChatMessages`, `ChatInput`, `ChatWidget` — foi a maior adição de design da versão.
- **`components/layout/ProfileSwitcher`** — novo componente.

---

## 12. Recomendações (Backlog de Design)

- Extrair componentes reutilizáveis das rotas grandes (dashboard/extrato/cartoes) para uma subpasta temática quando houver repetição.
- **Storybook implementado (Onda 2)**: `@storybook/react-vite` 8.x em `web/.storybook/` com `main.ts`, `preview.ts` importando `globals.css` e seis stories (`Button`, `Card`, `Input`, `Modal`, `Table`, `Badge`) em `src/components/ui/*.stories.tsx`. Scripts: `npm run storybook` (dev, porta 6006) e `npm run build-storybook`. Próximo passo: cobrir `components/chat/` e `components/layout/`.
- Avaliar consolidar `.card`, `.btn-primary`, `.input-field` legadas em `globals.css:64` — hoje coexistem com os componentes React (que são a fonte preferida).

---

*Documento gerado para o projeto ecp - digital bank — v4.0 (as-built)*
*Atualizado em 20/04/2026 a partir de `web/tailwind.config.ts`, `web/src/styles/globals.css` e `web/src/components/`*
