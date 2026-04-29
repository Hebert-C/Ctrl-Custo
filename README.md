# Ctrl-Custo

Aplicativo de finanças pessoais com versão web (React) e mobile (Expo), compartilhando lógica de negócio e componentes via monorepo.

## Estrutura

```
ctrl-custo/
├── apps/
│   ├── web/          # React 19 + Vite + TailwindCSS
│   └── mobile/       # Expo SDK 52 + Expo Router
├── packages/
│   ├── core/         # Lógica de negócio, banco SQLite, tipos
│   ├── ui/           # Design system compartilhado
│   └── config/       # tsconfig e eslint base
```

## Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Linguagem:** TypeScript strict
- **Banco:** Drizzle ORM + SQLite (valores em centavos)
- **Estado:** Zustand
- **Gráficos:** Victory Native
- **Testes:** Vitest (unitários) · Playwright (e2e — Fase 5)

## Comandos

```bash
# Instalar dependências
pnpm install

# Desenvolvimento web
pnpm dev:web

# Desenvolvimento mobile
pnpm dev:mobile

# Testes unitários (packages/core)
pnpm test

# Typecheck em todos os pacotes
pnpm typecheck

# Lint em todos os pacotes
pnpm lint

# Formatar código
pnpm format
```

## Fases do projeto

- [x] Fase 0 — Monorepo & estrutura
- [x] Fase 1 — packages/core (lógica + banco + testes)
- [x] Fase 2 — packages/ui (design system)
- [x] Fase 3 — apps/web (versão desktop)
- [ ] Fase 4 — apps/mobile (versão celular)
- [ ] Fase 5 — CI/CD e deploy
